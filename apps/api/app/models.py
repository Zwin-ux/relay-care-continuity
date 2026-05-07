from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


class Signal(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("sig"), primary_key=True)
    source: str
    text: str
    location_hint: Optional[str] = None
    attachments_json: str = "[]"
    scenario: str = "wildfire_community_center"
    processed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Asset(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("asset"), primary_key=True)
    signal_id: str
    name: str
    description: str = ""


class Incident(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("inc"), primary_key=True)
    incident_type: str
    summary: str
    urgency: str
    confidence: float
    location_raw: Optional[str] = None
    location_normalized: Optional[str] = None
    affected_groups_json: str = "[]"
    missing_information_json: str = "[]"
    recommended_action_type: str
    recommended_action_description: str
    safety_notes_json: str = "[]"
    care_domain: Optional[str] = None
    required_fields_json: str = "[]"
    unsafe_claims_json: str = "[]"
    source_assertions_json: str = "[]"
    conflicts_json: str = "[]"
    handoff_status: Optional[str] = None
    state: str = "NEEDS_VERIFICATION"
    lane: str = "Needs Verification"
    scenario: str = "wildfire_community_center"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class IncidentSignal(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("link"), primary_key=True)
    incident_id: str
    signal_id: str


class IncidentEvidence(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("ev"), primary_key=True)
    incident_id: str
    type: str
    quote: Optional[str] = None
    description: Optional[str] = None
    signal_id: Optional[str] = None


class StateEvent(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("evt"), primary_key=True)
    incident_id: str
    actor: str
    event_type: str
    from_state: Optional[str] = None
    to_state: Optional[str] = None
    note: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Verification(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("ver"), primary_key=True)
    incident_id: str
    note: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Dispatch(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("dsp"), primary_key=True)
    incident_id: str
    assignee: str
    note: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Escalation(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("esc"), primary_key=True)
    incident_id: str
    authority: str
    note: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IncidentNote(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("note"), primary_key=True)
    incident_id: str
    note_type: str
    note: str
    source_type: str = "human"
    source_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ModelRun(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("run"), primary_key=True)
    signal_id: Optional[str] = None
    mode: str
    model_name: str
    status: str
    validation_errors: str = ""
    output_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EvalRun(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("eval"), primary_key=True)
    incident_type_accuracy: float
    urgency_accuracy: float
    missing_info_detection: float
    unsafe_action_rate: float
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FollowTask(SQLModel, table=True):
    id: str = Field(default_factory=lambda: new_id("fol"), primary_key=True)
    incident_id: str
    provider: str
    objective: str
    status: str = "queued"
    external_id: Optional[str] = None
    instructions: str = ""
    input_context_json: str = "{}"
    result_json: str = "{}"
    error: str = ""
    accepted_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
