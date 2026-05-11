import os
import re
from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from ..models import Incident, ModelRun, StateEvent
from .snapshot_service import build_snapshot


SENSITIVE_HEALTH_RE = re.compile(r"\b(insulin|dose|doses|dosing|medication|meds|prescription)\b", re.IGNORECASE)
UNSAFE_RE = re.compile(r"\b(double doses|extra dose|send insulin|unsafe dosing|unsupported)\b", re.IGNORECASE)


def care_label(domain: str | None) -> str:
    labels = {
        "medication": "Medication",
        "oxygen_power": "Oxygen / power",
        "infant_supply": "Infant supply",
        "mobility_transport": "Mobility",
        "hazard_access": "Hazard access",
        "public_information": "Public information",
        "volunteer_capacity": "Volunteer capacity",
        "shelter_comfort": "Shelter comfort",
    }
    return labels.get(domain or "", "Shelter comfort")


def care_title(domain: str | None, summary: str) -> str:
    lower = summary.lower()
    if domain == "medication":
        return "Medication continuity"
    if domain == "oxygen_power":
        return "Power-dependent care"
    if domain == "infant_supply":
        return "Infant supply continuity"
    if domain == "mobility_transport":
        return "Mobility transport"
    if domain == "hazard_access":
        return "Smoke / access review" if "smoke" in lower else "Hazard access review"
    if domain == "public_information":
        return "Public information review"
    if domain == "volunteer_capacity":
        return "Volunteer capacity"
    return "Shelter comfort supplies"


def parse_json_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if not value:
        return []
    if isinstance(value, str):
        import json

        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    return []


def safe_unsafe_claim_label(claim: str) -> str:
    if SENSITIVE_HEALTH_RE.search(claim):
        return "Unsafe medication instruction held for review."
    if re.search(r"\b(route|road|fire road|closed road|wires|hazard)\b", claim, re.IGNORECASE):
        return "Unsafe routing instruction held for review."
    return "Unsafe claim held for review."


def public_report_headline(text: str) -> str:
    trimmed = " ".join(text.split())
    if UNSAFE_RE.search(trimmed):
        return "Unsafe medication claim suppressed for review."
    if len(trimmed) > 132:
        trimmed = f"{trimmed[:128].rstrip()}..."
    if re.match(r"^(source report|report|intake report|volunteer report|photo report)", trimmed, re.IGNORECASE):
        return trimmed
    return f"Source report: {trimmed}"


def report_state(text: str, processed: bool) -> str:
    lower = text.lower()
    if UNSAFE_RE.search(lower):
        return "Unsafe claim"
    if not processed:
        return "New"
    if any(token in lower for token in ["duplicate", "same request", "again"]):
        return "Duplicate"
    if any(token in lower for token in ["not confirmed", "cannot verify", "not sure"]):
        return "Missing info"
    return "Grouped"


def report_severity(text: str) -> str:
    lower = text.lower()
    if any(token in lower for token in ["oxygen", "sparking", "closed fire road", "double doses"]):
        return "critical"
    if any(token in lower for token in ["medication", "insulin", "smoke", "blocked", "formula"]):
        return "high"
    if any(token in lower for token in ["rumor", "not confirmed", "cannot verify", "power"]):
        return "medium"
    return "low"


def care_domain_from_text(text: str, fallback: str | None = None) -> str:
    lower = text.lower()
    if any(token in lower for token in ["oxygen", "battery", "generator", "power-dependent"]):
        return "oxygen_power"
    if any(token in lower for token in ["formula", "diaper", "newborn", "infant"]):
        return "infant_supply"
    if any(token in lower for token in ["medication", "pharmacy", "insulin", "heart meds", "doses"]):
        return "medication"
    if any(token in lower for token in ["wheelchair", "bus", "transport", "cannot walk"]):
        return "mobility_transport"
    if any(token in lower for token in ["smoke", "road", "wires", "sparking", "blocked", "traffic"]):
        return "hazard_access"
    if any(token in lower for token in ["rumor", "spanish", "announcement", "policy", "shelter is full"]):
        return "public_information"
    if "volunteer" in lower or "nurse" in lower or "van" in lower:
        return "volunteer_capacity"
    if fallback == "shelter_supply":
        return "shelter_comfort"
    if fallback == "information_coordination":
        return "public_information"
    if fallback == "volunteer_task":
        return "volunteer_capacity"
    return "shelter_comfort"


def proof_state_label(state: str, missing_count: int, unsafe_count: int) -> str:
    if state == "DISPATCHED":
        return "Handoff sent"
    if state in {"RESOLVED", "REJECTED", "MERGED"}:
        return state.title()
    if unsafe_count:
        return "Unsafe claim held"
    if missing_count:
        return "Missing information"
    if state == "ACTION_READY":
        return "Review complete"
    return "Needs review"


def handoff_status(state: str, missing_count: int, unsafe_count: int, explicit: str | None) -> str:
    if state == "DISPATCHED" or explicit == "sent":
        return "Sent"
    if state in {"RESOLVED", "REJECTED", "MERGED"} or explicit == "closed":
        return "Closed"
    if unsafe_count or missing_count or (explicit or "").startswith("blocked"):
        return "Unavailable"
    return "Ready for review"


def build_proof_payload(
    snapshot: dict[str, Any],
    incidents: list[dict[str, Any]],
    audits_by_incident: dict[str, list[dict[str, Any]]],
    eval_metrics: dict[str, float] | None = None,
    run_slug: str | None = None,
    gemma_model: str | None = None,
) -> dict[str, Any]:
    run_slug = run_slug or os.getenv("SUPABASE_PROOF_RUN_SLUG") or f"relay-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    model_mode = snapshot.get("app", {}).get("model_mode", os.getenv("MODEL_MODE", "replay"))
    gemma_model = gemma_model or os.getenv("GEMMA_MODEL", "gemma4:e2b")
    incident_by_id = {item["id"]: item for item in incidents}

    source_reports = []
    for signal in snapshot.get("signals", []):
        domain = care_domain_from_text(signal.get("text", ""))
        source_reports.append(
            {
                "source_report_id": signal.get("signal_id") or signal.get("id"),
                "source_type": signal.get("source", "unknown"),
                "severity": report_severity(signal.get("text", "")),
                "care_domain": domain,
                "state_label": report_state(signal.get("text", ""), bool(signal.get("processed"))),
                "headline": public_report_headline(signal.get("text", "")),
                "location_label": signal.get("location_hint") or "Community Center",
                "public_read": True,
            }
        )

    groups: dict[str, list[dict[str, Any]]] = {}
    for lane in snapshot.get("board", {}).get("lanes", []):
        for card in lane.get("cards", []):
            domain = card.get("care_domain") or care_domain_from_text(card.get("summary", ""), card.get("incident_type"))
            title = care_title(domain, card.get("summary", ""))
            groups.setdefault(title, []).append(card)

    continuity_items = []
    for title, cards in groups.items():
        representative = cards[0]
        domain = representative.get("care_domain") or care_domain_from_text(representative.get("summary", ""), representative.get("incident_type"))
        incident = incident_by_id.get(representative["incident_id"], {})
        missing_fields = sorted({field for card in cards for field in (card.get("required_fields") or [])})
        unsafe_claims = sorted({safe_unsafe_claim_label(claim) for card in cards for claim in (card.get("unsafe_claims") or [])})
        conflicts = sorted({safe_unsafe_claim_label(conflict) if UNSAFE_RE.search(conflict) else conflict for card in cards for conflict in (card.get("conflicts") or [])})
        missing_count = len(missing_fields) or int(representative.get("missing_information_count") or 0)
        if not missing_fields and missing_count:
            missing_fields = ["unresolved source detail"]
        state = representative.get("state", "NEEDS_VERIFICATION")
        source_link_count = sum(len(incident_by_id.get(card["incident_id"], {}).get("evidence", [])) for card in cards)
        continuity_items.append(
            {
                "continuity_item_id": title.lower().replace(" ", "_").replace("/", "and"),
                "incident_id": representative["incident_id"],
                "title": title,
                "care_domain": domain,
                "care_label": care_label(domain),
                "urgency": representative.get("urgency", "medium"),
                "state_label": proof_state_label(state, missing_count, len(unsafe_claims)),
                "handoff_status": handoff_status(state, missing_count, len(unsafe_claims), representative.get("handoff_status")),
                "source_report_count": len(cards),
                "source_link_count": source_link_count,
                "missing_fields": missing_fields,
                "unsafe_claims": unsafe_claims,
                "conflicts": conflicts,
                "public_read": True,
            }
        )

    events = []
    for incident_id, audit_rows in audits_by_incident.items():
        for event in audit_rows:
            note = event.get("note") or event.get("message") or ""
            events.append(
                {
                    "event_id": event.get("id") or event.get("event_id"),
                    "incident_id": incident_id,
                    "event_type": event.get("event_type") or event.get("type") or "event",
                    "actor": event.get("actor", "system"),
                    "note_redacted": safe_unsafe_claim_label(note) if UNSAFE_RE.search(note) else note,
                    "event_created_at": event.get("created_at"),
                    "public_read": True,
                }
            )

    counts = {
        "source_reports": len(source_reports),
        "continuity_items": len(continuity_items),
        "unsafe_claims_held": sum(len(item["unsafe_claims"]) for item in continuity_items),
        "missing_fields": sum(len(item["missing_fields"]) for item in continuity_items),
        "audit_events": len(events),
    }
    run = {
        "run_slug": run_slug,
        "scenario_id": snapshot.get("app", {}).get("scenario_id", "wildfire_community_center"),
        "location_pack_id": snapshot.get("app", {}).get("location_pack_id", "wildfire_santa_rosa"),
        "location_label": snapshot.get("app", {}).get("location_label", "Santa Rosa, CA"),
        "hazard_type": snapshot.get("app", {}).get("hazard_type", "wildfire"),
        "site_type": snapshot.get("app", {}).get("site_type", "evacuation shelter"),
        "context_mode": snapshot.get("app", {}).get("context_mode", "fixture"),
        "model_mode": model_mode,
        "gemma_model": gemma_model,
        "source_report_count": counts["source_reports"],
        "continuity_item_count": counts["continuity_items"],
        "unsafe_claim_count": counts["unsafe_claims_held"],
        "missing_field_count": counts["missing_fields"],
        "audit_event_count": counts["audit_events"],
        "eval_metrics": eval_metrics or {},
        "public_read": True,
    }
    public_snapshot = {
        "run_slug": run_slug,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "scenario_id": run["scenario_id"],
        "location": {
            "pack_id": run["location_pack_id"],
            "label": run["location_label"],
            "hazard_type": run["hazard_type"],
            "site_type": run["site_type"],
            "context_mode": run["context_mode"],
        },
        "model_mode": model_mode,
        "gemma_model": gemma_model,
        "counts": counts,
        "eval_metrics": eval_metrics or {},
        "continuity_items": continuity_items,
        "proof_notes": [
            "Supabase stores a durable proof ledger for the submission.",
            "Unsafe health claims are suppressed and represented as held-review labels.",
            "The public preview remains replay-safe; Ollama mode is the local Gemma proof path.",
        ],
    }
    return {
        "run": run,
        "source_reports": source_reports,
        "continuity_items": continuity_items,
        "events": events,
        "eval_metrics": [{"metric_name": name, "metric_value": value, "public_read": True} for name, value in (eval_metrics or {}).items()],
        "public_snapshot": {"run_slug": run_slug, "snapshot_json": public_snapshot, "public_read": True},
    }


def build_proof_payload_from_session(session: Session, eval_metrics: dict[str, float] | None = None, run_slug: str | None = None) -> dict[str, Any]:
    snapshot = build_snapshot(session)
    incidents = [incident.model_dump() for incident in session.exec(select(Incident)).all()]
    for incident in incidents:
        incident["required_fields"] = parse_json_list(incident.pop("required_fields_json", "[]"))
        incident["unsafe_claims"] = parse_json_list(incident.pop("unsafe_claims_json", "[]"))
        incident["conflicts"] = parse_json_list(incident.pop("conflicts_json", "[]"))
        incident["evidence"] = []
    audits_by_incident: dict[str, list[dict[str, Any]]] = {}
    for event in session.exec(select(StateEvent)).all():
        audits_by_incident.setdefault(event.incident_id, []).append(event.model_dump())
    return build_proof_payload(snapshot, incidents, audits_by_incident, eval_metrics, run_slug)


def latest_model_run_summary(session: Session) -> dict[str, Any]:
    rows = session.exec(select(ModelRun).order_by(ModelRun.created_at.desc())).all()
    if not rows:
        return {"model_runs": 0, "latest_status": "none"}
    return {"model_runs": len(rows), "latest_status": rows[0].status, "latest_model": rows[0].model_name, "latest_mode": rows[0].mode}
