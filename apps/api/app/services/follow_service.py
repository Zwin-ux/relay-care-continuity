import json
import os
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from pydantic import ValidationError
from sqlmodel import Session, select

from ..models import FollowTask, Incident, IncidentNote, Signal
from ..providers.follow.base import FollowContext, FollowProvider
from ..providers.follow.hermes import HermesFollowProvider
from ..providers.follow.mock import MockFollowProvider
from ..providers.follow.openclaw import OpenClawFollowProvider
from ..schemas import FollowAccept, FollowCreate, FollowOutput
from .audit_service import emit_event, new_mutation_id
from .board_service import incident_payload
from .snapshot_service import build_snapshot


def choose_follow_objective(incident: Incident) -> str:
    if incident.recommended_action_type == "merge_duplicate":
        return "duplicate_check"
    if incident.incident_type == "infrastructure_hazard":
        return "safety_context"
    if incident.incident_type == "information_coordination" and incident.confidence < 0.75:
        return "verify_rumor"
    if incident.incident_type == "shelter_supply":
        return "resource_context"
    if incident.incident_type == "volunteer_task":
        return "volunteer_context"
    if json.loads(incident.missing_information_json):
        return "fill_missing_info"
    return "fill_missing_info"


def provider_name(requested: str) -> str:
    if requested == "default":
        return os.getenv("AGENT_PROVIDER", "mock")
    return requested


def provider_for(name: str) -> FollowProvider:
    if name == "mock":
        return MockFollowProvider()
    if name == "openclaw":
        return OpenClawFollowProvider()
    if name == "hermes":
        return HermesFollowProvider()
    raise HTTPException(400, f"Unsupported follow provider: {name}")


def follow_task_detail(task: FollowTask) -> dict[str, Any]:
    result = json.loads(task.result_json or "{}")
    return {
        "task_id": task.id,
        "incident_id": task.incident_id,
        "provider": task.provider,
        "objective": task.objective,
        "status": task.status,
        "external_id": task.external_id,
        "instructions": task.instructions,
        "result": result if result else None,
        "error": task.error or None,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "completed_at": task.completed_at,
        "accepted_at": task.accepted_at,
        "cancelled_at": task.cancelled_at,
    }


def mutation_result(
    entity_type: str,
    entity_id: str,
    message: str,
    incident_id: str | None = None,
    audit_event_id: str | None = None,
    include_snapshot: bool = False,
    session: Session | None = None,
    ok: bool = True,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "ok": ok,
        "mutation_id": new_mutation_id(),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "message": message,
    }
    if audit_event_id:
        payload["audit_event_id"] = audit_event_id
    if incident_id:
        payload["incident_id"] = incident_id
        payload["next_recommended_query"] = {
            "type": "snapshot",
            "url": f"/api/snapshot?incident_id={incident_id}",
        }
    elif entity_type:
        payload["next_recommended_query"] = {"type": "snapshot", "url": "/api/snapshot"}
    if include_snapshot and session is not None:
        payload["snapshot"] = build_snapshot(session, incident_id)
    if extra:
        payload.update(extra)
    return payload


def create_follow_task(
    session: Session,
    incident_id: str,
    payload: FollowCreate,
    include_snapshot: bool = False,
) -> dict[str, Any]:
    incident = session.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    if not payload.human_triggered:
        raise HTTPException(400, "Follow must be human-triggered.")

    objective = choose_follow_objective(incident) if payload.objective.value == "auto" else payload.objective.value
    name = provider_name(payload.provider.value)
    provider = provider_for(name)
    signals = [
        {
            "signal_id": signal.id,
            "source": signal.source,
            "text": signal.text,
            "location_hint": signal.location_hint,
            "created_at": signal.created_at.isoformat(),
        }
        for signal in session.exec(select(Signal).order_by(Signal.created_at)).all()
    ]
    incident_context = incident_payload(session, incident, include_follow_results=False)
    instructions = payload.instructions or default_instructions(objective, incident)
    context = FollowContext(
        incident=incident_context,
        signals=signals,
        objective=objective,
        instructions=instructions,
    )
    task = FollowTask(
        incident_id=incident.id,
        provider=name,
        objective=objective,
        status="running",
        instructions=instructions,
        input_context_json=json.dumps(
            {"incident": incident_context, "signals": signals, "objective": objective, "instructions": instructions},
            default=str,
        ),
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    created_event = emit_event(session, incident.id, "human", "follow_task_created", incident.state, incident.state, f"Follow objective: {objective}")

    start = provider.start(context)
    task.external_id = start.external_id
    task.updated_at = datetime.utcnow()
    if start.status in {"completed", "queued", "running"}:
        task.status = start.status
    else:
        task.status = "failed"
    if start.result:
        try:
            output = FollowOutput.model_validate(start.result)
            task.result_json = json.dumps(output.model_dump(mode="json"))
            task.status = "completed"
            task.completed_at = datetime.utcnow()
            emit_event(session, incident.id, "system", "follow_task_completed", incident.state, incident.state, f"Follow packet completed: {objective}")
        except ValidationError as exc:
            task.status = "failed"
            task.error = f"Follow provider result failed validation: {exc.errors()}"
            emit_event(session, incident.id, "system", "follow_task_failed", incident.state, incident.state, task.error)
    elif start.error:
        task.status = "failed"
        task.error = start.error
        emit_event(session, incident.id, "system", "follow_task_failed", incident.state, incident.state, start.error)
    session.add(task)
    session.commit()
    session.refresh(task)
    session.refresh(created_event)
    return mutation_result(
        "follow_task",
        task.id,
        f"Follow task {task.status} using {name} provider.",
        incident.id,
        audit_event_id=created_event.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={
            "task_id": task.id,
            "objective": task.objective,
            "provider": task.provider,
            "status": task.status,
        },
    )


def list_follow_tasks(session: Session, incident_id: str) -> dict[str, Any]:
    if not session.get(Incident, incident_id):
        raise HTTPException(404, "Incident not found")
    tasks = session.exec(
        select(FollowTask).where(FollowTask.incident_id == incident_id).order_by(FollowTask.created_at.desc())
    ).all()
    return {
        "incident_id": incident_id,
        "tasks": [
            {
                "task_id": task.id,
                "objective": task.objective,
                "provider": task.provider,
                "status": task.status,
                "confidence": (json.loads(task.result_json or "{}") or {}).get("confidence"),
                "created_at": task.created_at,
                "completed_at": task.completed_at,
            }
            for task in tasks
        ],
    }


def get_follow_task(session: Session, task_id: str) -> dict[str, Any]:
    task = session.get(FollowTask, task_id)
    if not task:
        raise HTTPException(404, "Follow task not found")
    return follow_task_detail(task)


def cancel_follow_task(session: Session, task_id: str, include_snapshot: bool = False) -> dict[str, Any]:
    task = session.get(FollowTask, task_id)
    if not task:
        raise HTTPException(404, "Follow task not found")
    if task.status not in {"queued", "running"}:
        raise HTTPException(400, "Only queued or running follow tasks can be cancelled.")
    provider = provider_for(task.provider)
    result = provider.cancel(task)
    if not result.ok:
        raise HTTPException(400, result.error or "Follow task could not be cancelled.")
    incident = session.get(Incident, task.incident_id)
    task.status = "cancelled"
    task.cancelled_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()
    session.add(task)
    event = emit_event(session, task.incident_id, "human", "follow_task_cancelled", incident.state if incident else None, incident.state if incident else None, "Follow task cancelled.")
    session.commit()
    session.refresh(event)
    return mutation_result(
        "follow_task",
        task.id,
        "Follow task cancelled.",
        task.incident_id,
        audit_event_id=event.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={"task_id": task.id, "status": task.status},
    )


def accept_follow_task(
    session: Session,
    task_id: str,
    payload: FollowAccept,
    include_snapshot: bool = False,
) -> dict[str, Any]:
    task = session.get(FollowTask, task_id)
    if not task:
        raise HTTPException(404, "Follow task not found")
    if not payload.human_confirmed:
        raise HTTPException(400, "Human confirmation required")
    if task.status not in {"completed", "accepted"}:
        raise HTTPException(400, "Only completed follow packets can be accepted.")
    incident = session.get(Incident, task.incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")

    note = IncidentNote(
        incident_id=incident.id,
        note_type=payload.note_type,
        note=payload.note,
        source_type="follow_task",
        source_id=task.id,
    )
    session.add(note)
    task.status = "accepted"
    task.accepted_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()
    session.add(task)
    event = emit_event(
        session,
        incident.id,
        "human",
        "follow_result_accepted",
        incident.state,
        incident.state,
        f"{payload.note_type}: {payload.note}",
    )
    session.commit()
    session.refresh(note)
    session.refresh(event)
    return mutation_result(
        "follow_task",
        task.id,
        "Follow findings accepted as coordinator context. Incident state was not changed.",
        incident.id,
        audit_event_id=event.id,
        include_snapshot=include_snapshot,
        session=session,
        extra={
            "task_id": task.id,
            "status": task.status,
            "note_id": note.id,
            "note_type": note.note_type,
            "accepted_finding_ids": payload.accepted_finding_ids,
        },
    )


def default_instructions(objective: str, incident: Incident) -> str:
    return (
        f"Create a one-shot RELAY evidence packet for {objective}. "
        f"Incident: {incident.summary}. Return context only; do not verify, dispatch, escalate, or resolve."
    )
