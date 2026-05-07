import scenario from "../data/wildfire_community_center.json";
import replayOutputs from "../data/wildfire_community_center.gemma.json";
import { AuditEvent, Board, BoardCard, Incident, MutationResult, Signal, Snapshot } from "@/lib/api";

type ScenarioRow = { source: string; text: string; location_hint?: string };
type ReplayRow = {
  input_text: string;
  output: {
    incident_type: string;
    summary: string;
    urgency: Incident["urgency"];
    confidence: number;
    location: Incident["location"];
    affected_groups: string[];
    evidence: Array<{ type: string; quote?: string | null; description?: string | null; signal_id?: string | null }>;
    missing_information: string[];
    recommended_next_action: Incident["recommended_next_action"];
    safety_notes: string[];
    care_domain?: string | null;
    required_fields?: string[];
    unsafe_claims?: string[];
    source_assertions?: string[];
    conflicts?: string[];
    handoff_status?: string | null;
  };
};

const rows = scenario as ScenarioRow[];
const outputs = replayOutputs as ReplayRow[];

function signalId(index: number) {
  return `mock_sig_${String(index + 1).padStart(2, "0")}`;
}

function incidentId(index: number) {
  return `mock_inc_${String(index + 1).padStart(2, "0")}`;
}

function createdAt(index: number) {
  return new Date(Date.UTC(2026, 3, 30, 15, 2 + index)).toISOString();
}

function laneFor(output: ReplayRow["output"]) {
  if (output.urgency === "critical") return "High Priority";
  if (output.missing_information.length > 0) return "Needs Verification";
  return "Ready to Dispatch";
}

function stateFor(output: ReplayRow["output"]) {
  return output.missing_information.length > 0 ? "NEEDS_VERIFICATION" : "ACTION_READY";
}

function signals(): Snapshot["signals"] {
  return rows.map((row, index) => ({
    id: signalId(index),
    signal_id: signalId(index),
    source: row.source,
    text: row.text,
    location_hint: row.location_hint,
    processed: true,
    status: "processed",
    created_at: createdAt(index),
  }));
}

function auditFor(id: string, index: number): AuditEvent[] {
  return [
    {
      id: `mock_audit_${id}`,
      actor: "model",
      event_type: "model_triage",
      note: "Care continuity item created from replay source report.",
      created_at: createdAt(index),
    },
  ];
}

function incidents(): Incident[] {
  return outputs.map((row, index) => {
    const id = incidentId(index);
    const output = row.output;
    return {
      id,
      incident_id: id,
      incident_type: output.incident_type,
      summary: output.summary,
      urgency: output.urgency,
      confidence: output.confidence,
      location: output.location,
      affected_groups: output.affected_groups,
      missing_information: output.missing_information,
      recommended_next_action: output.recommended_next_action,
      safety_notes: output.safety_notes,
      care_domain: output.care_domain ?? null,
      required_fields: output.required_fields ?? [],
      unsafe_claims: output.unsafe_claims ?? [],
      source_assertions: output.source_assertions ?? [],
      conflicts: output.conflicts ?? [],
      handoff_status: output.handoff_status ?? null,
      state: stateFor(output),
      lane: laneFor(output),
      evidence: output.evidence.map((item, evidenceIndex) => ({
        id: `mock_ev_${index + 1}_${evidenceIndex + 1}`,
        evidence_id: `mock_ev_${index + 1}_${evidenceIndex + 1}`,
        type: item.type,
        quote: item.quote ?? undefined,
        description: item.description ?? undefined,
        signal_id: signalId(index),
      })),
      audit: auditFor(id, index),
      notes: [],
      follow_tasks: [],
    };
  });
}

function compactCard(incident: Incident): BoardCard {
  return {
    id: incident.id,
    incident_id: incident.incident_id,
    summary: incident.summary,
    incident_type: incident.incident_type,
    urgency: incident.urgency,
    confidence: incident.confidence,
    state: incident.state,
    lane: incident.lane,
    missing_information_count: incident.missing_information.length,
    care_domain: incident.care_domain,
    required_fields: incident.required_fields,
    unsafe_claims: incident.unsafe_claims,
    source_assertions: incident.source_assertions,
    conflicts: incident.conflicts,
    handoff_status: incident.handoff_status,
  };
}

function board(allIncidents: Incident[]): Board {
  const lanes = ["Needs Verification", "High Priority", "Ready to Dispatch", "Dispatched", "Follow-Up", "Resolved"];
  return {
    lanes: lanes.map((lane) => ({
      lane_id: lane.toLowerCase().replaceAll(" ", "_").replace("-", "_"),
      title: lane,
      name: lane,
      cards: allIncidents.filter((incident) => incident.lane === lane).map(compactCard),
    })),
    counts: Object.fromEntries(lanes.map((lane) => [lane, allIncidents.filter((incident) => incident.lane === lane).length])),
  };
}

function preferredIncident(allIncidents: Incident[]) {
  return allIncidents.find((incident) => incident.summary === "Medication pickup needed for older adults on Maple Ave before evening.") ?? allIncidents[0] ?? null;
}

export function fallbackSnapshot(selectedIncidentId?: string | null): Snapshot {
  const allIncidents = incidents();
  const selected = allIncidents.find((incident) => incident.id === selectedIncidentId) ?? preferredIncident(allIncidents);
  return {
    app: {
      model_mode: "replay",
      agent_provider: "fallback",
      scenario_id: "wildfire_community_center",
      scenario_loaded: true,
      last_updated_at: new Date(Date.UTC(2026, 3, 30, 15, 12)).toISOString(),
    },
    counts: {
      signals_total: rows.length,
      signals_unprocessed: 0,
      incidents_total: allIncidents.length,
      needs_verification: allIncidents.filter((incident) => incident.state === "NEEDS_VERIFICATION").length,
      high_priority: allIncidents.filter((incident) => incident.lane === "High Priority").length,
      ready_to_dispatch: allIncidents.filter((incident) => incident.state === "ACTION_READY").length,
      dispatched: 0,
      resolved: 0,
      follow_running: 0,
      follow_completed: 0,
    },
    signals: signals(),
    board: board(allIncidents),
    selected_incident: selected,
  };
}

export function fallbackMutationResult(type: string, id?: string | null): MutationResult {
  const snapshot = fallbackSnapshot(id);
  return {
    ok: true,
    mutation_id: `mock_mutation_${Date.now()}`,
    entity_type: type,
    entity_id: id ?? type,
    incident_id: id ?? snapshot.selected_incident?.id,
    message: type === "triage_batch" ? "Replay reports grouped into care continuity items." : "Replay workspace updated.",
    snapshot,
  };
}

export function shouldUseFrontendReplay(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /failed to fetch|fetch failed|networkerror|load failed|connection refused/i.test(error.message);
}
