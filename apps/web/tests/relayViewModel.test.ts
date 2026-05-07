import { describe, expect, it } from "vitest";
import { BoardCard, Signal } from "@/lib/api";
import {
  filterReports,
  incidentTitle,
  preferredTaskId,
  reportExcerpt,
  reportState,
  sanitizeOperationMessage,
  toMissingInfoLedger,
  toDraftTasks,
  toReportRows,
} from "@/lib/relayViewModel";

const signal = (overrides: Partial<Signal & { signal_id: string; status: "raw" | "processed"; created_at: string }> = {}) => ({
  id: "sig_1",
  signal_id: "sig_1",
  source: "sms",
  text: "My grandparents are on Maple Ave and need medication picked up before tonight. Phones are dying.",
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
  state: "NEEDS_VERIFICATION",
  lane: "High Priority",
  evidence: [{ id: "ev_1", type: "text", quote: "Need medication picked up.", signal_id: "sig_1" }],
  audit: [],
  notes: [],
  follow_tasks: [],
});

describe("RELAY view model", () => {
  it("frames raw text as a source report", () => {
    expect(reportExcerpt("Smoke visible behind the loading dock.")).toBe("Source report: Smoke visible behind the loading dock.");
  });

  it("detects duplicate and missing-info report states", () => {
    expect(reportState(signal({ text: "Duplicate medication request from intake desk." }))).toBe("Duplicate");
    expect(reportState(signal({ text: "Heard the bridge is collapsing. I cannot verify it." }))).toBe("Missing info");
  });

  it("filters critical source reports", () => {
    const rows = toReportRows(snapshot([
      signal({ id: "sig_critical", signal_id: "sig_critical", text: "A resident says wires are down and sparking." }),
      signal({ id: "sig_low", signal_id: "sig_low", text: "I found a lost backpack at the shelter desk. Not urgent." }),
    ]));
    expect(filterReports(rows, "Critical")).toHaveLength(1);
    expect(filterReports(rows, "Critical")[0].id).toBe("sig_critical");
  });

  it("maps incident cards to task language without exposing fake precision", () => {
    const tasks = toDraftTasks(snapshot([], [card()]));
    expect(tasks[0].title).toBe("Medication pickup");
    expect(tasks[0].stateLabel).toBe("Missing info");
    expect(JSON.stringify(tasks[0])).not.toContain("Report match");
  });

  it("groups related cards into draft tasks instead of one row per signal", () => {
    const tasks = toDraftTasks(snapshot([], [
      card({ id: "med_1", incident_id: "med_1", summary: "Medication pickup needed for older adults on Maple Ave before evening." }),
      card({ id: "med_2", incident_id: "med_2", summary: "Duplicate Maple Ave medication pickup report mentions heart medication needed before evening." }),
      card({ id: "haz_1", incident_id: "haz_1", summary: "Road appears blocked near Lincoln school entrance." }),
    ]));
    expect(tasks).toHaveLength(2);
    expect(tasks.find((task) => task.title === "Medication pickup")?.relatedCount).toBe(2);
  });

  it("rewrites backend receipts for handoff-facing UI", () => {
    expect(sanitizeOperationMessage("Dispatch recorded by coordinator.")).toBe("Handoff recorded by reviewer.");
  });

  it("creates practical task titles from incident summaries", () => {
    expect(incidentTitle("infrastructure_hazard", "Sparking downed wires reported in alley behind Lincoln school.")).toBe("Hazard report");
  });

  it("does not default-select unsupported medication advice", () => {
    const tasks = toDraftTasks(snapshot([], [
      card({
        id: "unsafe",
        incident_id: "unsafe",
        summary: "Unsupported insulin request includes unsafe dosing suggestion for Maple area.",
      }),
      card({
        id: "pickup",
        incident_id: "pickup",
        summary: "Medication pickup needed for older adults on Maple Ave before evening.",
      }),
    ]));
    expect(preferredTaskId(tasks)).toBe("pickup");
  });

  it("builds a missing info ledger from source links and open fields", () => {
    const rows = toMissingInfoLedger(incident());
    expect(rows.some((row) => row.field === "Source reports linked" && row.status === "Complete")).toBe(true);
    expect(rows.some((row) => row.field === "Confirm recipient identity" && row.status === "Open")).toBe(true);
    expect(rows.some((row) => row.field === "Verify pharmacy or pickup location" && row.sourceCoverage === "No reviewed value")).toBe(true);
  });
});
