import { fallbackMutationResult, fallbackSnapshot, shouldUseFrontendReplay } from "@/lib/mockSnapshot";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

export type Signal = {
  id: string;
  source: string;
  text: string;
  location_hint?: string;
  processed: boolean;
};

export type AuditEvent = {
  id: string;
  event_id?: string;
  actor: string;
  type?: string;
  event_type: string;
  from_state?: string;
  to_state?: string;
  message?: string;
  note: string;
  created_at: string;
};

export type FollowFinding = {
  finding_id: string;
  claim: string;
  support_level: "supported" | "partially_supported" | "contradicted" | "unknown";
  confidence: number;
  evidence_refs: string[];
  source_notes: Array<{ label: string; note: string; source_type: string; url?: string; retrieved_at?: string }>;
};

export type FollowTask = {
  task_id: string;
  incident_id: string;
  objective: string;
  provider: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "accepted";
  confidence?: number;
  instructions?: string;
  result?: {
    summary: string;
    confidence: number;
    findings: FollowFinding[];
    questions_for_human_verification: string[];
    safety_notes: string[];
    suggested_next_coordinator_action: { action_type: string; description: string };
    limitations: string[];
  };
  error?: string;
  created_at: string;
  completed_at?: string;
  accepted_at?: string;
  cancelled_at?: string;
};

export type Incident = {
  id: string;
  incident_id: string;
  incident_type: string;
  summary: string;
  urgency: "low" | "medium" | "high" | "critical";
  confidence: number;
  location: { raw?: string; normalized?: string };
  affected_groups: string[];
  missing_information: string[];
  recommended_next_action: { action_type: string; description: string };
  safety_notes: string[];
  care_domain?: string | null;
  required_fields?: string[];
  unsafe_claims?: string[];
  source_assertions?: string[];
  conflicts?: string[];
  handoff_status?: string | null;
  state: string;
  lane: string;
  evidence: Array<{ id: string; evidence_id?: string; type: string; quote?: string; description?: string; signal_id?: string }>;
  audit: AuditEvent[];
  notes: Array<{ note_id: string; note_type: "context_note" | "verification_note"; note: string; source_type: string; source_id?: string; created_at: string }>;
  follow_tasks: FollowTask[];
};

export type BoardCard = {
  incident_id: string;
  id: string;
  summary: string;
  incident_type: string;
  urgency: "low" | "medium" | "high" | "critical";
  confidence: number;
  state: string;
  lane: string;
  missing_information_count: number;
  care_domain?: string | null;
  required_fields?: string[];
  unsafe_claims?: string[];
  source_assertions?: string[];
  conflicts?: string[];
  handoff_status?: string | null;
  follow_status?: FollowTask["status"];
};

export type Board = {
  lanes: Array<{ lane_id: string; title: string; name: string; cards: BoardCard[] }>;
  counts: Record<string, number>;
};

export type Snapshot = {
  app: {
    model_mode: string;
    agent_provider: string;
    scenario_id: string;
    location_pack_id?: string;
    location_label?: string;
    hazard_type?: string;
    site_type?: string;
    context_mode?: string;
    scenario_loaded: boolean;
    last_updated_at: string;
  };
  public_context?: Array<{ source: string; label: string; body: string; context_only: boolean }>;
  counts: {
    signals_total: number;
    signals_unprocessed: number;
    incidents_total: number;
    needs_verification: number;
    high_priority: number;
    ready_to_dispatch: number;
    dispatched: number;
    resolved: number;
    follow_running: number;
    follow_completed: number;
  };
  signals: Array<Signal & { signal_id: string; status: "processed" | "raw"; created_at: string }>;
  board: Board;
  selected_incident: Incident | null;
};

export type MutationResult = {
  ok: boolean;
  mutation_id: string;
  entity_type: string;
  entity_id: string;
  incident_id?: string;
  task_id?: string;
  state?: string;
  status?: string;
  objective?: string;
  provider?: string;
  loaded?: number;
  processed?: number;
  message: string;
  audit_event_id?: string;
  next_recommended_query?: { type: "snapshot"; url: string };
  snapshot?: Snapshot;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

function withSnapshot(path: string) {
  return `${path}${path.includes("?") ? "&" : "?"}include_snapshot=true`;
}

function shouldUseFrontendReplayImmediately() {
  if (typeof window === "undefined") return false;
  const publicHost = !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return publicHost && /127\.0\.0\.1|localhost/.test(API_BASE);
}

export const api = {
  snapshot: async (incidentId?: string | null) => {
    if (shouldUseFrontendReplayImmediately()) return fallbackSnapshot(incidentId);
    try {
      return await request<Snapshot>(`/api/snapshot${incidentId ? `?incident_id=${incidentId}` : ""}`);
    } catch (error) {
      if (shouldUseFrontendReplay(error)) return fallbackSnapshot(incidentId);
      if (incidentId && error instanceof Error && error.message.includes("Incident not found")) {
        return request<Snapshot>("/api/snapshot");
      }
      throw error;
    }
  },
  loadScenario: async () => {
    if (shouldUseFrontendReplayImmediately()) return fallbackMutationResult("scenario");
    try {
      return await request<MutationResult>(withSnapshot("/api/scenarios/load"), { method: "POST" });
    } catch (error) {
      if (shouldUseFrontendReplay(error)) return fallbackMutationResult("scenario");
      throw error;
    }
  },
  activateLocation: async (packId: string) => {
    if (shouldUseFrontendReplayImmediately()) return fallbackMutationResult("location_pack", null, packId);
    try {
      return await request<MutationResult>(withSnapshot(`/api/location-packs/${packId}/activate`), { method: "POST" });
    } catch (error) {
      if (shouldUseFrontendReplay(error)) return fallbackMutationResult("location_pack", null, packId);
      throw error;
    }
  },
  runTriage: async () => {
    if (shouldUseFrontendReplayImmediately()) return fallbackMutationResult("triage_batch");
    try {
      return await request<MutationResult>(withSnapshot("/api/triage/run-batch"), { method: "POST" });
    } catch (error) {
      if (shouldUseFrontendReplay(error)) return fallbackMutationResult("triage_batch");
      throw error;
    }
  },
  signals: () => request<Signal[]>("/api/signals"),
  board: () => request<Board>("/api/board"),
  incident: (id: string) => request<Incident>(`/api/incidents/${id}`),
  verify: async (id: string) => {
    if (shouldUseFrontendReplayImmediately()) return fallbackMutationResult("incident", id);
    try {
      return await request<MutationResult>(withSnapshot(`/api/incidents/${id}/verify`), {
        method: "POST",
        body: JSON.stringify({ note: "Reviewer recorded required fields.", human_confirmed: true })
      });
    } catch (error) {
      if (shouldUseFrontendReplay(error)) return fallbackMutationResult("incident", id);
      throw error;
    }
  },
  dispatch: async (id: string) => {
    if (shouldUseFrontendReplayImmediately()) return fallbackMutationResult("incident", id);
    try {
      return await request<MutationResult>(withSnapshot(`/api/incidents/${id}/dispatch`), {
        method: "POST",
        body: JSON.stringify({ assignee: "Reviewer handoff queue", note: "Reviewer marked task ready for handoff.", human_confirmed: true })
      });
    } catch (error) {
      if (shouldUseFrontendReplay(error)) return fallbackMutationResult("incident", id);
      throw error;
    }
  },
  escalate: async (id: string) => {
    if (shouldUseFrontendReplayImmediately()) return fallbackMutationResult("incident", id);
    try {
      return await request<MutationResult>(withSnapshot(`/api/incidents/${id}/escalate`), {
        method: "POST",
        body: JSON.stringify({ authority: "Supervisor review", note: "Flagged for supervisor review.", human_confirmed: true })
      });
    } catch (error) {
      if (shouldUseFrontendReplay(error)) return fallbackMutationResult("incident", id);
      throw error;
    }
  },
  resolve: (id: string) =>
    request<MutationResult>(withSnapshot(`/api/incidents/${id}/resolve`), {
      method: "POST",
      body: JSON.stringify({ state: "RESOLVED", note: "Resolved by reviewer.", human_confirmed: true })
    }),
  reject: (id: string) =>
    request<MutationResult>(withSnapshot(`/api/incidents/${id}/state`), {
      method: "PATCH",
      body: JSON.stringify({ state: "REJECTED", note: "Rejected as unsupported or unsafe.", human_confirmed: true })
    }),
  follow: async (id: string) => {
    if (shouldUseFrontendReplayImmediately()) return fallbackMutationResult("follow_task", id);
    try {
      return await request<MutationResult>(withSnapshot(`/api/incidents/${id}/follow`), {
        method: "POST",
        body: JSON.stringify({ objective: "auto", provider: "default", instructions: null, human_triggered: true })
      });
    } catch (error) {
      if (shouldUseFrontendReplay(error)) return fallbackMutationResult("follow_task", id);
      throw error;
    }
  },
  cancelFollow: (taskId: string) => request<MutationResult>(withSnapshot(`/api/follow/${taskId}/cancel`), { method: "POST" }),
  acceptFollow: (taskId: string) =>
    request<MutationResult>(withSnapshot(`/api/follow/${taskId}/accept`), {
      method: "POST",
      body: JSON.stringify({
        human_confirmed: true,
        accepted_finding_ids: [],
        note_type: "verification_note",
        note: "Use this follow packet as context for callback. Still requires direct review before handoff."
      })
    }),
  evalRun: () =>
    request<{ incident_type_accuracy: number; urgency_accuracy: number; missing_info_detection: number; unsafe_action_rate: number }>(
      "/api/eval/run",
      { method: "POST" }
    )
};
