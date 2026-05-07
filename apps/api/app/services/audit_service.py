from .ids import mutation_id
from ..models import StateEvent
from sqlmodel import Session


def emit_event(
    session: Session,
    incident_id: str,
    actor: str,
    event_type: str,
    from_state: str | None = None,
    to_state: str | None = None,
    note: str = "",
) -> StateEvent:
    event = StateEvent(
        incident_id=incident_id,
        actor=actor,
        event_type=event_type,
        from_state=from_state,
        to_state=to_state,
        note=note,
    )
    session.add(event)
    return event


def new_mutation_id() -> str:
    return mutation_id()
