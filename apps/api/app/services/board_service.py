import json
from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from ..models import FollowTask, Incident, IncidentEvidence, IncidentNote, StateEvent
from ..schemas import TriageOutput


LANES = [
    "Needs Verification",
    "High Priority",
    "Ready to Dispatch",
    "Dispatched",
    "Follow-Up",
    "Resolved",
]

STATE_TO_LANE = {
    "NEEDS_VERIFICATION": "Needs Verification",
    "ACTION_READY": "Ready to Dispatch",
    "DISPATCHED": "Dispatched",
    "FOLLOW_UP_REQUIRED": "Follow-Up",
    "RESOLVED": "Resolved",
    "REJECTED": "Resolved",
    "MERGED": "Resolved",
    "ESCALATED": "Follow-Up",
}


def lane_id(title: str) -> str:
    return title.lower().replace("-", "").replace(" ", "_")


def lane_for_output(output: TriageOutput) -> tuple[str, str]:
    if output.confidence < 0.75:
        return "NEEDS_VERIFICATION", "Needs Verification"
    if output.urgency in {"critical", "high"}:
        state = "NEEDS_VERIFICATION" if output.missing_information else "ACTION_READY"
        return state, "High Priority"
    if output.missing_information:
        return "NEEDS_VERIFICATION", "Needs Verification"
    return "ACTION_READY", "Ready to Dispatch"


def critical_missing(incident: Incident) -> list[str]:
    return [
        item
        for item in open_required_fields(incident)
        if "exact" in item.lower() or "confirm" in item.lower() or "whether" in item.lower()
    ]


def open_required_fields(incident: Incident) -> list[str]:
    return json.loads(incident.required_fields_json or "[]") or json.loads(incident.missing_information_json or "[]")


def unsafe_claims(incident: Incident) -> list[str]:
    return json.loads(incident.unsafe_claims_json or "[]")


def latest_follow_status(session: Session, incident_id: str) -> str | None:
    task = session.exec(
        select(FollowTask)
        .where(FollowTask.incident_id == incident_id)
        .order_by(FollowTask.created_at.desc())
    ).first()
    return task.status if task else None


def follow_task_summary(task: FollowTask, include_result: bool = False) -> dict[str, Any]:
    result = json.loads(task.result_json or "{}")
    payload: dict[str, Any] = {
        "task_id": task.id,
        "incident_id": task.incident_id,
        "objective": task.objective,
        "provider": task.provider,
        "status": task.status,
        "confidence": result.get("confidence"),
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "accepted_at": task.accepted_at,
        "cancelled_at": task.cancelled_at,
        "error": task.error or None,
    }
    if include_result:
        payload["instructions"] = task.instructions
        payload["result"] = result if result else None
    return payload


def audit_payload(event: StateEvent) -> dict[str, Any]:
    return {
        "event_id": event.id,
        "id": event.id,
        "type": event.event_type,
        "event_type": event.event_type,
        "actor": event.actor,
        "from_state": event.from_state,
        "to_state": event.to_state,
        "message": event.note,
        "note": event.note,
        "created_at": event.created_at,
    }


def note_payload(note: IncidentNote) -> dict[str, Any]:
    return {
        "note_id": note.id,
        "incident_id": note.incident_id,
        "note_type": note.note_type,
        "note": note.note,
        "source_type": note.source_type,
        "source_id": note.source_id,
        "created_at": note.created_at,
    }


def incident_payload(session: Session, incident: Incident, include_follow_results: bool = True) -> dict[str, Any]:
    evidence = session.exec(
        select(IncidentEvidence).where(IncidentEvidence.incident_id == incident.id)
    ).all()
    events = session.exec(select(StateEvent).where(StateEvent.incident_id == incident.id)).all()
    notes = session.exec(select(IncidentNote).where(IncidentNote.incident_id == incident.id)).all()
    follow_tasks = session.exec(
        select(FollowTask).where(FollowTask.incident_id == incident.id).order_by(FollowTask.created_at.desc())
    ).all()
    return {
        "id": incident.id,
        "incident_id": incident.id,
        "incident_type": incident.incident_type,
        "summary": incident.summary,
        "urgency": incident.urgency,
        "confidence": incident.confidence,
        "location": {"raw": incident.location_raw, "normalized": incident.location_normalized},
        "affected_groups": json.loads(incident.affected_groups_json),
        "missing_information": json.loads(incident.missing_information_json),
        "recommended_next_action": {
            "action_type": incident.recommended_action_type,
            "description": incident.recommended_action_description,
        },
        "safety_notes": json.loads(incident.safety_notes_json),
        "care_domain": incident.care_domain,
        "required_fields": json.loads(incident.required_fields_json),
        "unsafe_claims": json.loads(incident.unsafe_claims_json),
        "source_assertions": json.loads(incident.source_assertions_json),
        "conflicts": json.loads(incident.conflicts_json),
        "handoff_status": incident.handoff_status,
        "state": incident.state,
        "lane": incident.lane,
        "evidence": [
            {
                **e.model_dump(),
                "evidence_id": e.id,
            }
            for e in evidence
        ],
        "audit": [audit_payload(e) for e in sorted(events, key=lambda item: item.created_at)],
        "notes": [note_payload(n) for n in sorted(notes, key=lambda item: item.created_at)],
        "follow_tasks": [
            follow_task_summary(task, include_result=include_follow_results) for task in follow_tasks
        ],
    }


def compact_incident_card(session: Session, incident: Incident) -> dict[str, Any]:
    return {
        "incident_id": incident.id,
        "id": incident.id,
        "summary": incident.summary,
        "incident_type": incident.incident_type,
        "urgency": incident.urgency,
        "confidence": incident.confidence,
        "state": incident.state,
        "lane": incident.lane,
        "missing_information_count": len(json.loads(incident.missing_information_json)),
        "care_domain": incident.care_domain,
        "required_fields": json.loads(incident.required_fields_json),
        "unsafe_claims": json.loads(incident.unsafe_claims_json),
        "source_assertions": json.loads(incident.source_assertions_json),
        "conflicts": json.loads(incident.conflicts_json),
        "handoff_status": incident.handoff_status,
        "follow_status": latest_follow_status(session, incident.id),
    }


def set_state(session: Session, incident: Incident, state: str, actor: str, event_type: str, note: str = "") -> StateEvent:
    from .audit_service import emit_event

    previous = incident.state
    incident.state = state
    incident.lane = STATE_TO_LANE.get(state, incident.lane)
    if incident.urgency in {"critical", "high"} and state == "ACTION_READY":
        incident.lane = "High Priority"
    incident.updated_at = datetime.utcnow()
    session.add(incident)
    event = emit_event(session, incident.id, actor, event_type, previous, state, note)
    session.commit()
    session.refresh(event)
    return event
