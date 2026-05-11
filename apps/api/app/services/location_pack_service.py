import json
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from sqlmodel import Session, delete

from ..database import data_root
from ..models import (
    Dispatch,
    Escalation,
    EvalRun,
    FollowTask,
    Incident,
    IncidentEvidence,
    IncidentNote,
    IncidentSignal,
    ModelRun,
    Signal,
    StateEvent,
    Verification,
)


DEFAULT_LOCATION_PACK_ID = "wildfire_santa_rosa"


def _pack_dir() -> Path:
    return data_root() / "location-packs"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def list_location_packs() -> list[dict[str, Any]]:
    return sorted((read_json(path) for path in _pack_dir().glob("*.json")), key=lambda pack: pack["id"])


def get_location_pack(pack_id: str | None = None) -> dict[str, Any]:
    target = pack_id or DEFAULT_LOCATION_PACK_ID
    path = _pack_dir() / f"{target}.json"
    if not path.exists():
        raise HTTPException(404, f"Location pack not found: {target}")
    return read_json(path)


def active_location_pack_for_scenario(scenario: str | None) -> dict[str, Any]:
    try:
        return get_location_pack(scenario or DEFAULT_LOCATION_PACK_ID)
    except HTTPException:
        return get_location_pack(DEFAULT_LOCATION_PACK_ID)


def clear_workspace(session: Session) -> None:
    for table in [
        Dispatch,
        Escalation,
        Verification,
        StateEvent,
        IncidentEvidence,
        IncidentSignal,
        FollowTask,
        IncidentNote,
        Incident,
        Signal,
        ModelRun,
        EvalRun,
    ]:
        session.exec(delete(table))


def activate_location_pack(session: Session, pack_id: str) -> tuple[dict[str, Any], int]:
    pack = get_location_pack(pack_id)
    clear_workspace(session)
    scenario = read_json(data_root() / "scenarios" / f"{pack['scenario_id']}.json")
    for row in scenario:
        session.add(
            Signal(
                source=row["source"],
                text=row["text"],
                location_hint=row.get("location_hint"),
                attachments_json=json.dumps(row.get("attachments", [])),
                scenario=pack["id"],
            )
        )
    session.commit()
    return pack, len(scenario)
