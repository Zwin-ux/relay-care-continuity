import { describe, expect, it } from "vitest";
import { Incident } from "@/lib/api";
import { buildMissingInfoPullPacket } from "@/lib/missingInfoPull";

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

describe("missing info pull packet", () => {
  it("chooses the first open field, first source, and matching ask", () => {
    const packet = buildMissingInfoPullPacket(incident());

    expect(packet?.field).toBe("Confirm recipient identity");
    expect(packet?.source).toBe("Text report 01");
    expect(packet?.ask).toBe("Confirm identity");
    expect(packet?.ticketAsk).toBe("Ask the source owner to confirm who the request is for.");
    expect(packet?.fieldOptions).toContain("Verify pharmacy or pickup location");
  });

  it("falls back when no linked evidence exists", () => {
    const packet = buildMissingInfoPullPacket(incident({ evidence: [] }));

    expect(packet?.source).toBe("Review desk callback queue");
    expect(packet?.sourceExcerpt).toContain("Medication pickup needed");
  });

  it("returns no packet when no fields are open", () => {
    expect(buildMissingInfoPullPacket(incident({ missing_information: [], required_fields: [] }))).toBeNull();
  });
});
