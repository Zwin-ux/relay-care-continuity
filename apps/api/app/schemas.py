from enum import Enum
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class IncidentType(str, Enum):
    vulnerable_person_support = "vulnerable_person_support"
    shelter_supply = "shelter_supply"
    infrastructure_hazard = "infrastructure_hazard"
    information_coordination = "information_coordination"
    volunteer_task = "volunteer_task"


class Urgency(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ActionType(str, Enum):
    request_verification = "request_verification"
    dispatch_supply = "dispatch_supply"
    welfare_check = "welfare_check"
    notify_authority = "notify_authority"
    merge_duplicate = "merge_duplicate"
    reject = "reject"
    resolve = "resolve"


class LocationPayload(BaseModel):
    raw: Optional[str] = None
    normalized: Optional[str] = None


class EvidencePayload(BaseModel):
    type: str = Field(pattern="^(text|image_observation)$")
    quote: Optional[str] = None
    description: Optional[str] = None
    signal_id: Optional[str] = None


class RecommendedAction(BaseModel):
    action_type: ActionType
    description: str


class TriageOutput(BaseModel):
    incident_type: IncidentType
    summary: str
    urgency: Urgency
    confidence: float = Field(ge=0, le=1)
    location: LocationPayload
    affected_groups: list[str]
    evidence: list[EvidencePayload] = Field(min_length=1)
    missing_information: list[str]
    recommended_next_action: RecommendedAction
    safety_notes: list[str]
    care_domain: Optional[str] = None
    required_fields: list[str] = Field(default_factory=list)
    unsafe_claims: list[str] = Field(default_factory=list)
    source_assertions: list[str] = Field(default_factory=list)
    conflicts: list[str] = Field(default_factory=list)
    handoff_status: Optional[str] = None


class SignalCreate(BaseModel):
    source: str
    text: str
    location_hint: Optional[str] = None
    attachments: list[str] = []


class StateChange(BaseModel):
    state: str
    note: str = ""
    human_confirmed: bool = False


class VerificationCreate(BaseModel):
    note: str
    human_confirmed: bool = True


class DispatchCreate(BaseModel):
    assignee: str = "Volunteer team"
    note: str
    human_confirmed: bool


class EscalationCreate(BaseModel):
    authority: str = "City emergency operations"
    note: str
    human_confirmed: bool


class MergeCreate(BaseModel):
    target_incident_id: str
    note: str = ""


class FollowObjective(str, Enum):
    auto = "auto"
    fill_missing_info = "fill_missing_info"
    verify_rumor = "verify_rumor"
    safety_context = "safety_context"
    duplicate_check = "duplicate_check"
    resource_context = "resource_context"
    volunteer_context = "volunteer_context"


class FollowProviderName(str, Enum):
    default = "default"
    mock = "mock"
    openclaw = "openclaw"
    hermes = "hermes"


class FollowStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"
    accepted = "accepted"


class FollowCreate(BaseModel):
    objective: FollowObjective = FollowObjective.auto
    provider: FollowProviderName = FollowProviderName.default
    instructions: Optional[str] = None
    human_triggered: bool = True


class FollowAccept(BaseModel):
    human_confirmed: bool
    accepted_finding_ids: list[str] = []
    note_type: Literal["context_note", "verification_note"] = "context_note"
    note: str


class SourceNote(BaseModel):
    label: str
    note: str
    source_type: Literal[
        "scenario_signal",
        "local_fixture",
        "provider_result",
        "external_web",
        "official_source",
        "unknown",
    ] = "provider_result"
    url: Optional[str] = None
    retrieved_at: Optional[datetime] = None


class FollowFinding(BaseModel):
    finding_id: str
    claim: str
    support_level: Literal["supported", "partially_supported", "contradicted", "unknown"]
    confidence: float = Field(ge=0, le=1)
    evidence_refs: list[str] = []
    source_notes: list[SourceNote] = []


class SuggestedCoordinatorAction(BaseModel):
    action_type: Literal[
        "request_verification",
        "review_duplicate",
        "prepare_dispatch_after_verification",
        "notify_authority_after_human_confirmation",
        "reject_as_unsupported",
        "keep_monitoring",
    ]
    description: str


class FollowOutput(BaseModel):
    summary: str
    confidence: float = Field(ge=0, le=1)
    findings: list[FollowFinding]
    questions_for_human_verification: list[str]
    safety_notes: list[str]
    suggested_next_coordinator_action: SuggestedCoordinatorAction
    limitations: list[str]


class NextRecommendedQuery(BaseModel):
    type: Literal["snapshot"] = "snapshot"
    url: str


class MutationResult(BaseModel):
    ok: bool
    mutation_id: str
    entity_type: str
    entity_id: str
    message: str
    audit_event_id: Optional[str] = None
    next_recommended_query: Optional[NextRecommendedQuery] = None
    snapshot: Optional[dict[str, Any]] = None
