import json
import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException
from pydantic import ValidationError
from sqlmodel import Session, select

from ..database import data_root
from ..models import Incident, IncidentEvidence, IncidentSignal, ModelRun, Signal
from ..schemas import TriageOutput
from .audit_service import emit_event
from .board_service import lane_for_output


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def replay_outputs_by_text() -> dict[str, dict[str, Any]]:
    rows = read_json(data_root() / "scenarios" / "wildfire_community_center.gemma.json")
    return {row["input_text"]: row["output"] for row in rows}


async def run_model_for_signal(signal: Signal) -> tuple[str, dict[str, Any], str]:
    mode = os.getenv("MODEL_MODE", "replay")
    model_name = os.getenv("GEMMA_MODEL", "gemma4:e2b")
    if mode == "replay":
        outputs = replay_outputs_by_text()
        if signal.text not in outputs:
            raise HTTPException(404, "No replay output for signal")
        return mode, outputs[signal.text], model_name

    if mode != "ollama":
        raise HTTPException(400, f"Unsupported MODEL_MODE={mode}")

    prompt = (
        "You are Gemma triage inside RELAY. Return only JSON matching the triage schema. "
        "Do not give medical treatment advice. Evidence must quote the input when possible.\n\n"
        f"Signal source: {signal.source}\nSignal text: {signal.text}\nLocation hint: {signal.location_hint}"
    )
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{base_url}/api/generate",
            json={"model": model_name, "prompt": prompt, "stream": False, "format": "json"},
        )
        response.raise_for_status()
    return mode, json.loads(response.json()["response"]), model_name


def create_incident_from_triage(session: Session, signal: Signal, output: TriageOutput) -> Incident:
    state, lane = lane_for_output(output)
    incident = Incident(
        incident_type=output.incident_type.value,
        summary=output.summary,
        urgency=output.urgency.value,
        confidence=output.confidence,
        location_raw=output.location.raw,
        location_normalized=output.location.normalized,
        affected_groups_json=json.dumps(output.affected_groups),
        missing_information_json=json.dumps(output.missing_information),
        recommended_action_type=output.recommended_next_action.action_type.value,
        recommended_action_description=output.recommended_next_action.description,
        safety_notes_json=json.dumps(output.safety_notes),
        care_domain=output.care_domain,
        required_fields_json=json.dumps(output.required_fields),
        unsafe_claims_json=json.dumps(output.unsafe_claims),
        source_assertions_json=json.dumps(output.source_assertions),
        conflicts_json=json.dumps(output.conflicts),
        handoff_status=output.handoff_status,
        state=state,
        lane=lane,
    )
    session.add(incident)
    session.commit()
    session.refresh(incident)
    session.add(IncidentSignal(incident_id=incident.id, signal_id=signal.id))
    for evidence in output.evidence:
        session.add(
            IncidentEvidence(
                incident_id=incident.id,
                type=evidence.type,
                quote=evidence.quote,
                description=evidence.description,
                signal_id=evidence.signal_id or signal.id,
            )
        )
    emit_event(session, incident.id, "gemma", "model_triage", None, state, "Structured signal into incident")
    signal.processed = True
    session.add(signal)
    session.commit()
    session.refresh(incident)
    return incident


async def run_triage_for_signal(session: Session, signal_id: str) -> tuple[str, Incident | None, list[dict[str, Any]]]:
    signal = session.get(Signal, signal_id)
    if not signal:
        raise HTTPException(404, "Signal not found")
    mode, raw_output, model_name = await run_model_for_signal(signal)
    try:
        output = TriageOutput.model_validate(raw_output)
    except ValidationError as exc:
        session.add(
            ModelRun(
                signal_id=signal.id,
                mode=mode,
                model_name=model_name,
                status="validation_failed",
                validation_errors=exc.json(),
                output_json=json.dumps(raw_output),
            )
        )
        signal.processed = True
        session.add(signal)
        session.commit()
        return "validation_failed", None, exc.errors()
    incident = create_incident_from_triage(session, signal, output)
    session.add(
        ModelRun(
            signal_id=signal.id,
            mode=mode,
            model_name=model_name,
            status="ok",
            output_json=json.dumps(raw_output),
        )
    )
    session.commit()
    return "ok", incident, []


async def run_triage_batch(session: Session) -> tuple[int, list[Incident]]:
    signals = session.exec(select(Signal).where(Signal.processed == False).order_by(Signal.created_at)).all()
    incidents = []
    for signal in signals:
        status, incident, _errors = await run_triage_for_signal(session, signal.id)
        if status == "ok" and incident:
            incidents.append(incident)
    return len(signals), incidents
