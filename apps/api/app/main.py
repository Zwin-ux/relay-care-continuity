import json
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, delete, select

from .database import create_db_and_tables, data_root, get_session
from .models import (
    Dispatch,
    Escalation,
    EvalRun,
    FollowTask,
    Incident,
    IncidentEvidence,
    IncidentSignal,
    IncidentNote,
    ModelRun,
    Signal,
    StateEvent,
    Verification,
)
from .schemas import (
    DispatchCreate,
    EscalationCreate,
    FollowAccept,
    FollowCreate,
    MergeCreate,
    SignalCreate,
    StateChange,
    VerificationCreate,
)
from .services import board_service, follow_service, location_pack_service, snapshot_service, triage_service

app = FastAPI(title="RELAY API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


@app.post("/api/scenarios/load")
def load_scenario(include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    pack, loaded = location_pack_service.activate_location_pack(session, location_pack_service.DEFAULT_LOCATION_PACK_ID)
    return follow_service.mutation_result(
        "scenario",
        pack["scenario_id"],
        f"Loaded {loaded} incoming signals.",
        include_snapshot=include_snapshot,
        session=session,
        extra={"loaded": loaded, "scenario": pack["scenario_id"], "location_pack_id": pack["id"]},
    )


@app.get("/api/location-packs")
def list_location_packs() -> list[dict[str, Any]]:
    return location_pack_service.list_location_packs()


@app.post("/api/location-packs/{pack_id}/activate")
def activate_location_pack(pack_id: str, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    pack, loaded = location_pack_service.activate_location_pack(session, pack_id)
    return follow_service.mutation_result(
        "location_pack",
        pack["id"],
        f"Activated {pack['location']['display']} local context with {loaded} source reports.",
        include_snapshot=include_snapshot,
        session=session,
        extra={"loaded": loaded, "scenario": pack["scenario_id"], "location_pack_id": pack["id"]},
    )


@app.post("/api/signals")
def create_signal(payload: SignalCreate, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    signal = Signal(
        source=payload.source,
        text=payload.text,
        location_hint=payload.location_hint,
        attachments_json=json.dumps(payload.attachments),
    )
    session.add(signal)
    session.commit()
    session.refresh(signal)
    return follow_service.mutation_result(
        "signal",
        signal.id,
        "Signal created.",
        include_snapshot=include_snapshot,
        session=session,
        extra={"signal_id": signal.id},
    )


@app.post("/api/signals/batch")
def create_signals(payload: list[SignalCreate], include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    for item in payload:
        session.add(
            Signal(
                source=item.source,
                text=item.text,
                location_hint=item.location_hint,
                attachments_json=json.dumps(item.attachments),
            )
        )
    session.commit()
    return follow_service.mutation_result(
        "signal_batch",
        "signals",
        f"Created {len(payload)} signals.",
        include_snapshot=include_snapshot,
        session=session,
        extra={"created": len(payload)},
    )


@app.get("/api/signals")
def list_signals(session: Session = Depends(get_session)) -> list[dict[str, Any]]:
    signals = session.exec(select(Signal).order_by(Signal.created_at)).all()
    return [
        {
            **signal.model_dump(),
            "attachments": json.loads(signal.attachments_json),
        }
        for signal in signals
    ]


@app.post("/api/triage/run")
async def run_triage(signal_id: str, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    status, incident, errors = await triage_service.run_triage_for_signal(session, signal_id)
    if status != "ok" or not incident:
        return follow_service.mutation_result(
            "model_run",
            signal_id,
            "Triage output failed validation.",
            include_snapshot=include_snapshot,
            session=session,
            ok=False,
            extra={"status": status, "errors": errors},
        )
    return follow_service.mutation_result(
        "incident",
        incident.id,
        "Gemma triage created an incident.",
        incident.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={"incident_id": incident.id, "status": status},
    )


@app.post("/api/triage/run-batch")
async def run_triage_batch(include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    processed, incidents = await triage_service.run_triage_batch(session)
    first_incident_id = incidents[0].id if incidents else None
    return follow_service.mutation_result(
        "triage_batch",
        "batch",
        f"Gemma triage processed {processed} signals.",
        first_incident_id,
        include_snapshot=include_snapshot,
        session=session,
        extra={"processed": processed, "incident_ids": [incident.id for incident in incidents]},
    )


@app.get("/api/incidents")
def list_incidents(session: Session = Depends(get_session)) -> list[dict[str, Any]]:
    incidents = session.exec(select(Incident).order_by(Incident.created_at)).all()
    return [board_service.incident_payload(session, item) for item in incidents]


@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str, session: Session = Depends(get_session)) -> dict[str, Any]:
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    return board_service.incident_payload(session, incident)


@app.patch("/api/incidents/{incident_id}/state")
def change_state(incident_id: str, payload: StateChange, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    if payload.state in {"DISPATCHED", "ESCALATED"} and not payload.human_confirmed:
        raise HTTPException(400, "Human confirmation required")
    if payload.state == "ACTION_READY" and board_service.critical_missing(incident):
        raise HTTPException(400, "Missing critical information blocks ACTION_READY")
    event = board_service.set_state(session, incident, payload.state, "human", "state_change", payload.note)
    return follow_service.mutation_result(
        "incident",
        incident.id,
        f"Incident state changed to {payload.state}.",
        incident.id,
        audit_event_id=event.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={"incident_id": incident.id, "state": payload.state},
    )


@app.post("/api/incidents/{incident_id}/verify")
def verify_incident(incident_id: str, payload: VerificationCreate, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    session.add(Verification(incident_id=incident.id, note=payload.note))
    incident.missing_information_json = "[]"
    incident.required_fields_json = "[]"
    if board_service.unsafe_claims(incident):
        incident.handoff_status = "blocked_unsafe_claim"
    else:
        incident.handoff_status = "ready_for_review"
    next_state = "ACTION_READY"
    event = board_service.set_state(session, incident, next_state, "human", "human_verification", payload.note)
    return follow_service.mutation_result(
        "incident",
        incident.id,
        "Incident verified by coordinator.",
        incident.id,
        audit_event_id=event.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={"incident_id": incident.id, "state": next_state},
    )


@app.post("/api/incidents/{incident_id}/dispatch")
def dispatch_incident(incident_id: str, payload: DispatchCreate, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    if not payload.human_confirmed:
        raise HTTPException(400, "Human confirmation required")
    if board_service.unsafe_claims(incident):
        raise HTTPException(
            400,
            "Dispatch blocked. Reason: unsafe health or routing claim is held for review. Required next step: reject the unsafe claim or route it for supervisor review.",
        )
    if incident.incident_type == "infrastructure_hazard" and incident.state != "ACTION_READY":
        raise HTTPException(
            400,
            "Dispatch blocked. Reason: hazard report is unverified and may involve physical danger. Required next step: verify exact location and whether anyone is trapped or injured.",
        )
    open_fields = board_service.open_required_fields(incident)
    if open_fields:
        raise HTTPException(
            400,
            f"Dispatch blocked. Required next step: complete required fields: {', '.join(open_fields)}.",
        )
    incident.handoff_status = "sent"
    session.add(Dispatch(incident_id=incident.id, assignee=payload.assignee, note=payload.note))
    event = board_service.set_state(session, incident, "DISPATCHED", "human", "dispatch_created", payload.note)
    return follow_service.mutation_result(
        "incident",
        incident.id,
        "Dispatch recorded by coordinator.",
        incident.id,
        audit_event_id=event.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={"incident_id": incident.id, "state": "DISPATCHED"},
    )


@app.post("/api/incidents/{incident_id}/escalate")
def escalate_incident(incident_id: str, payload: EscalationCreate, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    if not payload.human_confirmed:
        raise HTTPException(400, "Human confirmation required")
    session.add(Escalation(incident_id=incident.id, authority=payload.authority, note=payload.note))
    event = board_service.set_state(session, incident, "ESCALATED", "human", "escalation_created", payload.note)
    return follow_service.mutation_result(
        "incident",
        incident.id,
        "Escalation recorded by coordinator.",
        incident.id,
        audit_event_id=event.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={"incident_id": incident.id, "state": "ESCALATED"},
    )


@app.post("/api/incidents/{incident_id}/merge")
def merge_incident(incident_id: str, payload: MergeCreate, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    incident = session.get(Incident, incident_id)
    if not incident or not session.get(Incident, payload.target_incident_id):
        raise HTTPException(404, "Incident not found")
    event = board_service.set_state(session, incident, "MERGED", "human", "merged", payload.note or f"Merged into {payload.target_incident_id}")
    return follow_service.mutation_result(
        "incident",
        incident.id,
        "Incident marked as merged.",
        incident.id,
        audit_event_id=event.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={"incident_id": incident.id, "state": "MERGED"},
    )


@app.post("/api/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: str, payload: StateChange, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    event = board_service.set_state(session, incident, "RESOLVED", "human", "resolved", payload.note)
    return follow_service.mutation_result(
        "incident",
        incident.id,
        "Incident resolved by coordinator.",
        incident.id,
        audit_event_id=event.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={"incident_id": incident.id, "state": "RESOLVED"},
    )


@app.get("/api/incidents/{incident_id}/audit")
def audit(incident_id: str, session: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [event.model_dump() for event in session.exec(select(StateEvent).where(StateEvent.incident_id == incident_id)).all()]


@app.get("/api/snapshot")
def snapshot(incident_id: str | None = None, session: Session = Depends(get_session)) -> dict[str, Any]:
    return snapshot_service.build_snapshot(session, incident_id)


@app.get("/api/board")
def board(session: Session = Depends(get_session)) -> dict[str, Any]:
    return snapshot_service.build_snapshot(session)["board"]


@app.post("/api/incidents/{incident_id}/follow")
def create_follow(
    incident_id: str,
    payload: FollowCreate,
    include_snapshot: bool = False,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    return follow_service.create_follow_task(session, incident_id, payload, include_snapshot=include_snapshot)


@app.get("/api/incidents/{incident_id}/follow")
def list_follow(incident_id: str, session: Session = Depends(get_session)) -> dict[str, Any]:
    return follow_service.list_follow_tasks(session, incident_id)


@app.get("/api/follow/{task_id}")
def get_follow(task_id: str, session: Session = Depends(get_session)) -> dict[str, Any]:
    return follow_service.get_follow_task(session, task_id)


@app.post("/api/follow/{task_id}/cancel")
def cancel_follow(task_id: str, include_snapshot: bool = False, session: Session = Depends(get_session)) -> dict[str, Any]:
    return follow_service.cancel_follow_task(session, task_id, include_snapshot=include_snapshot)


@app.post("/api/follow/{task_id}/accept")
def accept_follow(
    task_id: str,
    payload: FollowAccept,
    include_snapshot: bool = False,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    return follow_service.accept_follow_task(session, task_id, payload, include_snapshot=include_snapshot)


@app.post("/api/eval/run")
def run_eval(session: Session = Depends(get_session)) -> dict[str, Any]:
    labels = read_json(data_root() / "eval" / "relay_eval_v1.json")
    outputs = triage_service.replay_outputs_by_text()
    type_hits = urgency_hits = missing_hits = unsafe = total = 0
    for row in labels:
        output = outputs.get(row["text"])
        if not output:
            continue
        total += 1
        type_hits += int(output["incident_type"] == row["incident_type"])
        urgency_hits += int(output["urgency"] == row["urgency"])
        expected_missing = bool(row.get("missing_information"))
        actual_missing = bool(output.get("missing_information"))
        missing_hits += int(expected_missing == actual_missing)
        unsafe += int(output["recommended_next_action"]["action_type"] in row.get("unsafe_actions", []))
    if total == 0:
        raise HTTPException(400, "No eval labels matched replay outputs")
    result = {
        "incident_type_accuracy": round(type_hits / total, 2),
        "urgency_accuracy": round(urgency_hits / total, 2),
        "missing_info_detection": round(missing_hits / total, 2),
        "unsafe_action_rate": round(unsafe / total, 2),
    }
    session.add(EvalRun(**result))
    session.commit()
    return result
