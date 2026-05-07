import { describe, expect, it } from "vitest";
import { Incident } from "@/lib/api";
import { getActionAvailability } from "@/lib/relayActions";

const baseIncident: Incident = {
  id: "inc_1",
  incident_id: "inc_1",
  incident_type: "infrastructure_hazard",
  summary: "Road appears blocked near Lincoln school.",
  urgency: "high",
  confidence: 0.91,
  location: { raw: "Lincoln school", normalized: "Lincoln School" },
  affected_groups: [],
  missing_information: ["Verify exact location and whether anyone is trapped or injured."],
  required_fields: [],
  unsafe_claims: [],
  recommended_next_action: { action_type: "request_verification", description: "Verify before dispatch." },
  safety_notes: ["Do not send volunteers into an unverified hazard."],
  state: "NEEDS_VERIFICATION",
  lane: "High Priority",
  evidence: [],
  audit: [],
  notes: [],
  follow_tasks: [],
};

function incident(overrides: Partial<Incident>): Incident {
  return { ...baseIncident, ...overrides };
}

describe("RELAY action availability", () => {
  it("blocks dispatch for an unverified hazard", () => {
    const availability = getActionAvailability(baseIncident, "dispatch");
    expect(availability.enabled).toBe(false);
    expect(availability.reason).toContain("unresolved");
    expect(availability.nextStep).toContain("Verify exact location");
  });

  it("enables dispatch for a verified hazard", () => {
    const availability = getActionAvailability(incident({ state: "ACTION_READY", missing_information: [] }), "dispatch");
    expect(availability.enabled).toBe(true);
  });

  it("blocks dispatch while critical information is missing", () => {
    const availability = getActionAvailability(
      incident({
        incident_type: "vulnerable_person_support",
        missing_information: ["Confirm medication pickup address."],
        state: "NEEDS_VERIFICATION",
      }),
      "dispatch",
    );
    expect(availability.enabled).toBe(false);
    expect(availability.reason).toContain("missing");
  });

  it("uses required care fields when backend provides them", () => {
    const availability = getActionAvailability(
      incident({
        incident_type: "vulnerable_person_support",
        missing_information: [],
        required_fields: ["recipient identity", "pharmacy or pickup location"],
        state: "ACTION_READY",
      }),
      "dispatch",
    );
    expect(availability.enabled).toBe(false);
    expect(availability.reason).toContain("missing");
  });

  it("blocks handoff when unsafe claims are still held", () => {
    const availability = getActionAvailability(
      incident({
        incident_type: "vulnerable_person_support",
        missing_information: [],
        required_fields: [],
        unsafe_claims: ["extra insulin dose suggestion"],
        state: "ACTION_READY",
      }),
      "dispatch",
    );
    expect(availability.enabled).toBe(false);
    expect(availability.reason).toContain("Unsafe health or routing claim");
  });

  it("suppresses unsafe actions for closed incidents", () => {
    const closed = incident({ state: "RESOLVED", missing_information: [] });
    expect(getActionAvailability(closed, "dispatch").enabled).toBe(false);
    expect(getActionAvailability(closed, "verify").enabled).toBe(false);
    expect(getActionAvailability(closed, "resolve").enabled).toBe(false);
  });
});
