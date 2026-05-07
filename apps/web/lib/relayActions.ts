import { Incident } from "@/lib/api";

export type RelayActionType = "verify" | "dispatch" | "escalate" | "follow" | "accept_follow" | "cancel_follow" | "reject" | "resolve";

export type ActionAvailability = {
  enabled: boolean;
  reason?: string;
  nextStep?: string;
};

export function missingInfoCount(incident: Pick<Incident, "missing_information" | "required_fields"> | { missing_information_count?: number; required_fields?: string[] }) {
  if (incident.required_fields?.length) return incident.required_fields.length;
  if ("missing_information" in incident) return incident.missing_information.length;
  return incident.missing_information_count ?? 0;
}

function unsafeClaimCount(incident: Pick<Incident, "unsafe_claims"> | { unsafe_claims?: string[] }) {
  return incident.unsafe_claims?.length ?? 0;
}

export function isTerminalState(state: string) {
  return ["DISPATCHED", "RESOLVED", "REJECTED", "MERGED"].includes(state);
}

export function isActionBlocked(incident: Pick<Incident, "state" | "missing_information" | "required_fields"> | { state: string; missing_information_count?: number; required_fields?: string[] }) {
  return incident.state === "NEEDS_VERIFICATION" || missingInfoCount(incident) > 0;
}

function verificationReason(incident: Incident) {
  if (unsafeClaimCount(incident) > 0) {
    return {
      reason: "Unsafe health or routing claim is held for review.",
      nextStep: "Reject the unsafe claim or route it for supervisor review before handoff.",
    };
  }
  if (!isActionBlocked(incident)) return undefined;
  if (incident.incident_type === "infrastructure_hazard") {
    return {
      reason: "Hazard source report is unresolved and may involve physical danger.",
      nextStep: "Verify exact location and whether anyone is trapped or injured.",
    };
  }
  return {
    reason: "Required information is still missing.",
    nextStep: "Record the missing fields before handoff or supervisor review.",
  };
}

export function getActionAvailability(incident: Incident, action: RelayActionType): ActionAvailability {
  if (action === "follow") {
    const latest = incident.follow_tasks?.[0];
    if (latest?.status === "queued" || latest?.status === "running") {
      return { enabled: false, reason: "A follow packet is already running.", nextStep: "Wait for the packet or cancel it." };
    }
    if (isTerminalState(incident.state)) return { enabled: false, reason: "Closed tasks do not need a new follow packet." };
    return { enabled: true };
  }

  if (action === "verify") {
    if (isTerminalState(incident.state)) return { enabled: false, reason: "Closed tasks cannot be updated again." };
    if (!isActionBlocked(incident)) return { enabled: false, reason: "No missing fields remain.", nextStep: "Mark ready for handoff, resolve, or keep monitoring." };
    return { enabled: true };
  }

  if (action === "dispatch" || action === "escalate") {
    if (isTerminalState(incident.state)) return { enabled: false, reason: "This task is already closed." };
    const blocked = verificationReason(incident);
    if (blocked) return { enabled: false, ...blocked };
    return { enabled: true };
  }

  if (action === "reject") {
    if (isTerminalState(incident.state)) return { enabled: false, reason: "This task is already closed." };
    return { enabled: true };
  }

  if (action === "resolve") {
    if (incident.state === "RESOLVED") return { enabled: false, reason: "This continuity item is already resolved." };
    if (incident.state === "REJECTED" || incident.state === "MERGED") return { enabled: false, reason: "Rejected or merged items are already closed." };
    return { enabled: true };
  }

  return { enabled: true };
}

export function parseActionError(message: string) {
  const cleaned = message.replace(/[{}"]/g, " ").replace(/\s+/g, " ").trim();
  const reasonMatch = cleaned.match(/Reason:\s*(.*?)(Required next step:|$)/i);
  const nextStepMatch = cleaned.match(/Required next step:\s*(.*)$/i);
  return {
    title: cleaned.toLowerCase().includes("dispatch blocked") ? "Handoff unavailable" : "Action blocked",
    reason: (reasonMatch?.[1]?.trim() || cleaned).replace(/dispatch/gi, "handoff"),
    nextStep: nextStepMatch?.[1]?.trim(),
  };
}
