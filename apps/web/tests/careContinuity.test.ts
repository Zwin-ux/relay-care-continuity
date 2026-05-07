import { describe, expect, it } from "vitest";
import { BoardCard, Signal } from "@/lib/api";
import {
  careDomainFromText,
  preferredContinuityTaskId,
  reportHeadline,
  reportState,
  toContinuityTasks,
  toMissingFields,
  toSourceReports,
} from "@/lib/careContinuity";

const signal = (overrides: Partial<Signal & { signal_id: string; status: "raw" | "processed"; created_at: string }> = {}) => ({
  id: "sig_1",
  signal_id: "sig_1",
  source: "sms",
  text: "Can someone check on Mrs. Alvarez at 18 Maple? Her oxygen machine battery is low.",
  processed: true,
  status: "processed" as const,
  created_at: "2026-04-30T08:02:00",
  ...overrides,
});

const card = (overrides: Partial<BoardCard> = {}): BoardCard => ({
  id: "inc_1",
  incident_id: "inc_1",
  summary: "Medication pickup needed for older adults on Maple Ave before evening.",
  incident_type: "vulnerable_person_support",
  urgency: "high",
  confidence: 0.86,
  state: "NEEDS_VERIFICATION",
  lane: "High Priority",
  missing_information_count: 3,
  ...overrides,
});

const snapshot = (signals: ReturnType<typeof signal>[], cards: BoardCard[] = []) => ({
  app: { model_mode: "replay", agent_provider: "mock", scenario_id: "wildfire", scenario_loaded: true, last_updated_at: "2026-04-30T08:12:00" },
  counts: {
    signals_total: signals.length,
    signals_unprocessed: 0,
    incidents_total: cards.length,
    needs_verification: cards.length,
    high_priority: cards.length,
    ready_to_dispatch: 0,
    dispatched: 0,
    resolved: 0,
    follow_running: 0,
    follow_completed: 0,
  },
  signals,
  board: { lanes: [{ lane_id: "high_priority", title: "High Priority", name: "High Priority", cards }], counts: {} },
  selected_incident: null,
});

const incident = () => ({
  id: "inc_1",
  incident_id: "inc_1",
  incident_type: "vulnerable_person_support",
  summary: "Medication pickup needed for older adults on Maple Ave before evening.",
  urgency: "high" as const,
  confidence: 0.86,
  location: { raw: "Maple Ave", normalized: undefined },
  affected_groups: ["older adults"],
  missing_information: ["recipient identity", "pharmacy pickup location"],
  recommended_next_action: { action_type: "request_verification", description: "Request missing details." },
  safety_notes: ["No treatment advice."],
  care_domain: "medication",
  required_fields: ["recipient identity", "pharmacy or pickup location"],
  unsafe_claims: [],
  source_assertions: ["Medication pickup requested before evening"],
  conflicts: [],
  handoff_status: "blocked_missing_info",
  state: "NEEDS_VERIFICATION",
  lane: "High Priority",
  evidence: [{ id: "ev_1", type: "text", quote: "Need medication picked up.", signal_id: "sig_1" }],
  audit: [],
  notes: [],
  follow_tasks: [],
});

describe("care continuity view model", () => {
  it("maps oxygen battery reports to power-dependent care", () => {
    expect(careDomainFromText("Her oxygen machine battery is low.")).toBe("oxygen_power");
    const rows = toSourceReports(snapshot([signal()]));
    expect(rows[0].careLabel).toBe("Oxygen / power");
  });

  it("frames incoming claims as reports, not facts", () => {
    expect(reportHeadline("Smoke visible behind the loading dock.")).toBe("Source report: Smoke visible behind the loading dock.");
  });

  it("flags unsafe medication dosing claims", () => {
    const unsafe = signal({ text: "Please send insulin to everyone at Maple, maybe double doses because roads may close." });
    expect(reportState(unsafe)).toBe("Unsafe claim");
    expect(reportHeadline(unsafe.text)).toBe("Unsafe medication claim suppressed for review.");
  });

  it("groups medication continuity and carries unsafe claims into the ledger item", () => {
    const tasks = toContinuityTasks(snapshot([], [
      card({ id: "safe", incident_id: "safe", summary: "Medication pickup needed for older adults on Maple Ave before evening." }),
      card({ id: "unsafe", incident_id: "unsafe", summary: "Unsupported insulin request includes unsafe dosing suggestion for Maple area." }),
    ]));
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Medication continuity");
    expect(tasks[0].unsafeClaims).toHaveLength(1);
    expect(tasks[0].unsafeClaims[0].claim).toBe("Unsafe medication instruction held for review.");
    expect(tasks[0].unsafeClaims[0].claim).not.toContain("double doses");
    expect(tasks[0].unsafeClaims[0].handling).toContain("Suppressed as medical advice");
    expect(preferredContinuityTaskId(tasks)).toBe("safe");
  });

  it("prefers explicit care-continuity fields from the backend snapshot", () => {
    const tasks = toContinuityTasks(snapshot([], [
      card({
        summary: "General shelter supply request with no oxygen keywords.",
        incident_type: "shelter_supply",
        care_domain: "oxygen_power",
        required_fields: ["backup power source", "safe route"],
        source_assertions: ["Power-dependent device support requested"],
        handoff_status: "blocked_missing_info",
      }),
    ]));
    expect(tasks[0].careDomain).toBe("oxygen_power");
    expect(tasks[0].title).toBe("Power-dependent care");
    expect(tasks[0].missing_information_count).toBe(2);
    expect(tasks[0].sourceAssertions).toContain("Power-dependent device support requested");
  });

  it("blocks handoff when medication identity and pickup location are missing", () => {
    const fields = toMissingFields(incident());
    expect(fields.some((field) => field.label === "Confirm recipient identity" && field.status === "Open")).toBe(true);
    expect(fields.some((field) => field.label === "Verify pharmacy or pickup location" && field.status === "Open")).toBe(true);
  });
});
