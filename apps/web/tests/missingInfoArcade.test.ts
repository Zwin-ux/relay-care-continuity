import { describe, expect, it } from "vitest";
import { Incident } from "@/lib/api";
import { buildDispatchArcadeRun, scoreDispatchArcadeRun } from "@/lib/missingInfoArcade";

const incident = (overrides: Partial<Incident> = {}): Incident => ({
  id: "inc_1",
  incident_id: "inc_1",
  incident_type: "vulnerable_person_support",
  summary: "Medication pickup needed for older adults on Maple Ave before evening.",
  urgency: "high",
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
  evidence: [{ id: "ev_1", type: "text", quote: "Need medication picked up before tonight.", signal_id: "sig_1" }],
  audit: [],
  notes: [],
  follow_tasks: [],
  ...overrides,
});

describe("dispatch arcade run", () => {
  it("builds a deterministic source match and safe ask", () => {
    const run = buildDispatchArcadeRun(incident());

    expect(run?.packet.field).toBe("Confirm recipient identity");
    expect(run?.caller.label).toBe("Medication desk signal");
    expect(run?.sourceChoices).toHaveLength(3);
    expect(run?.sourceChoices.find((choice) => choice.correct)?.label).toBe("Text report 01");
    expect(run?.askChoices.find((choice) => choice.correct)?.label).toBe("Confirm identity");
  });

  it("scores a clean ticket when source and ask are correct", () => {
    const run = buildDispatchArcadeRun(incident())!;
    const source = run.sourceChoices.find((choice) => choice.correct)!;
    const ask = run.askChoices.find((choice) => choice.correct)!;

    expect(scoreDispatchArcadeRun(run, source.id, ask.id, 4_000)).toMatchObject({
      sourceDiscipline: 30,
      safety: 35,
      clarity: 25,
      speed: 10,
      total: 100,
      label: "Clean ticket",
    });
  });

  it("blocks unsafe ask choices", () => {
    const run = buildDispatchArcadeRun(incident())!;
    const source = run.sourceChoices.find((choice) => choice.correct)!;
    const unsafe = run.askChoices.find((choice) => choice.tone === "unsafe")!;

    expect(scoreDispatchArcadeRun(run, source.id, unsafe.id, 4_000).label).toBe("Unsafe ask blocked");
  });
});
