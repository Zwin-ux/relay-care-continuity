import os
from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from ..models import FollowTask, Incident, Signal
from .board_service import LANES, compact_incident_card, incident_payload, lane_id
from .location_pack_service import DEFAULT_LOCATION_PACK_ID, active_location_pack_for_scenario


def _count_by_state(incidents: list[Incident], state: str) -> int:
    return len([incident for incident in incidents if incident.state == state])


def _count_by_lane(incidents: list[Incident], lane: str) -> int:
    return len([incident for incident in incidents if incident.lane == lane])


def build_snapshot(session: Session, incident_id: str | None = None) -> dict[str, Any]:
    signals = session.exec(select(Signal).order_by(Signal.created_at)).all()
    incidents = session.exec(select(Incident).order_by(Incident.created_at)).all()
    follow_tasks = session.exec(select(FollowTask).order_by(FollowTask.created_at)).all()
    active_scenario = signals[0].scenario if signals else DEFAULT_LOCATION_PACK_ID
    location_pack = active_location_pack_for_scenario(active_scenario)
    selected = None
    if incident_id:
        incident = session.get(Incident, incident_id)
        if incident:
            selected = incident_payload(session, incident, include_follow_results=True)

    lanes = []
    for lane in LANES:
        cards = [compact_incident_card(session, incident) for incident in incidents if incident.lane == lane]
        lanes.append({"lane_id": lane_id(lane), "title": lane, "name": lane, "cards": cards})

    running_statuses = {"queued", "running"}
    completed_statuses = {"completed", "accepted"}
    return {
        "app": {
            "model_mode": os.getenv("MODEL_MODE", "replay"),
            "agent_provider": os.getenv("AGENT_PROVIDER", "mock"),
            "scenario_id": location_pack["scenario_id"],
            "location_pack_id": location_pack["id"],
            "location_label": location_pack["location"]["display"],
            "hazard_type": location_pack["hazard_type"],
            "site_type": location_pack["site_type"],
            "context_mode": "fixture",
            "scenario_loaded": bool(signals),
            "last_updated_at": datetime.utcnow(),
        },
        "public_context": location_pack.get("public_context", []),
        "counts": {
            "signals_total": len(signals),
            "signals_unprocessed": len([signal for signal in signals if not signal.processed]),
            "incidents_total": len(incidents),
            "needs_verification": _count_by_state(incidents, "NEEDS_VERIFICATION"),
            "high_priority": _count_by_lane(incidents, "High Priority"),
            "ready_to_dispatch": _count_by_state(incidents, "ACTION_READY"),
            "dispatched": _count_by_state(incidents, "DISPATCHED"),
            "resolved": _count_by_state(incidents, "RESOLVED"),
            "follow_running": len([task for task in follow_tasks if task.status in running_statuses]),
            "follow_completed": len([task for task in follow_tasks if task.status in completed_statuses]),
        },
        "signals": [
            {
                "signal_id": signal.id,
                "id": signal.id,
                "source": signal.source,
                "text": signal.text,
                "location_hint": signal.location_hint,
                "status": "processed" if signal.processed else "raw",
                "processed": signal.processed,
                "created_at": signal.created_at,
            }
            for signal in signals
        ],
        "board": {
            "lanes": lanes,
            "counts": {lane["title"]: len(lane["cards"]) for lane in lanes},
        },
        "selected_incident": selected,
    }
