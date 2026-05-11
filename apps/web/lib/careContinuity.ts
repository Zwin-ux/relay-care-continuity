import publicContext from "../data/public_context.json";
import { BoardCard, Incident, Signal, Snapshot } from "@/lib/api";
import { formatTime, missingItemsForDisplay, sanitizeOperationMessage, taskStateLabel } from "@/lib/relayViewModel";

export type CareDomain =
  | "medication"
  | "oxygen_power"
  | "infant_supply"
  | "mobility_transport"
  | "hazard_access"
  | "public_information"
  | "volunteer_capacity"
  | "shelter_comfort";

export type SourceReport = Signal & {
  signal_id?: string;
  status?: "processed" | "raw";
  created_at: string;
  severity: "critical" | "high" | "medium" | "low";
  sourceLabel: string;
  timeLabel: string;
  headline: string;
  locationLabel: string;
  stateLabel: "New" | "Grouped" | "Duplicate" | "Missing info" | "Unsafe claim";
  careDomain: CareDomain;
  careLabel: string;
  tags: string[];
};

export type UnsafeClaim = {
  id: string;
  claim: string;
  source: string;
  handling: string;
};

export type ContinuityTask = BoardCard & {
  title: string;
  careDomain: CareDomain;
  careLabel: string;
  stateLabel: string;
  handoffStatus: "Unavailable" | "Ready for review" | "Sent" | "Closed";
  candidateQueue: string;
  reportedDeadline: string;
  sourceReportCount: number;
  sourceLinkLabel: string;
  missingLabel: string;
  conflictLabel: string;
  requiredFields: string[];
  sourceAssertions: string[];
  conflicts: string[];
  unsafeClaims: UnsafeClaim[];
};

export type MissingField = {
  id: string;
  label: string;
  status: "Open" | "Complete";
  sourceCoverage: string;
  nextAction: string;
};

export type ContinuityReceipt = {
  title: string;
  message: string;
  timestamp: string;
  auditEventId?: string;
  ok: boolean;
};

export type PublicContextItem = {
  id: string;
  source: string;
  retrieved_at: string;
  headline: string;
  body: string;
  source_url: string;
};

const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
const careDomains: CareDomain[] = [
  "medication",
  "oxygen_power",
  "infant_supply",
  "mobility_transport",
  "hazard_access",
  "public_information",
  "volunteer_capacity",
  "shelter_comfort",
];

export const publicContextItems = publicContext as PublicContextItem[];

export function careDomainFromPayload(value?: string | null): CareDomain | null {
  return careDomains.includes(value as CareDomain) ? (value as CareDomain) : null;
}

function careDomainForCard(card: Pick<BoardCard, "summary" | "incident_type" | "care_domain">): CareDomain {
  return careDomainFromPayload(card.care_domain) ?? careDomainFromText(card.summary, card.incident_type);
}

function uniqueItems(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];
}

export function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    sms: "SMS",
    volunteer_note: "Volunteer note",
    image_report: "Image report",
    shelter_update: "Shelter desk",
    radio: "Radio",
    social_report: "Social report",
  };
  return labels[source] ?? source.replaceAll("_", " ");
}

export function careLabel(domain: CareDomain) {
  const labels: Record<CareDomain, string> = {
    medication: "Medication",
    oxygen_power: "Oxygen / power",
    infant_supply: "Infant supply",
    mobility_transport: "Mobility",
    hazard_access: "Hazard access",
    public_information: "Public info",
    volunteer_capacity: "Volunteer capacity",
    shelter_comfort: "Shelter comfort",
  };
  return labels[domain];
}

export function careDomainFromText(text: string, incidentType?: string): CareDomain {
  const lower = text.toLowerCase();
  if (lower.includes("oxygen") || lower.includes("battery") || lower.includes("generator") || lower.includes("power-dependent")) return "oxygen_power";
  if (lower.includes("formula") || lower.includes("diaper") || lower.includes("newborn") || lower.includes("infant")) return "infant_supply";
  if (lower.includes("medication") || lower.includes("pharmacy") || lower.includes("insulin") || lower.includes("heart meds") || lower.includes("doses")) return "medication";
  if (lower.includes("wheelchair") || lower.includes("bus") || lower.includes("transport") || lower.includes("cannot walk")) return "mobility_transport";
  if (lower.includes("smoke") || lower.includes("road") || lower.includes("wires") || lower.includes("sparking") || lower.includes("blocked") || lower.includes("traffic")) return "hazard_access";
  if (lower.includes("rumor") || lower.includes("spanish") || lower.includes("announcement") || lower.includes("policy") || lower.includes("shelter is full")) return "public_information";
  if (lower.includes("volunteer") || lower.includes("nurse") || lower.includes("van") || lower.includes("deliveries")) return "volunteer_capacity";
  if (incidentType === "shelter_supply") return "shelter_comfort";
  if (incidentType === "information_coordination") return "public_information";
  if (incidentType === "volunteer_task") return "volunteer_capacity";
  return "shelter_comfort";
}

export function careTitle(domain: CareDomain, text: string) {
  const lower = text.toLowerCase();
  if (domain === "medication") return "Medication continuity";
  if (domain === "oxygen_power") return "Power-dependent care";
  if (domain === "infant_supply") return "Infant supply continuity";
  if (domain === "mobility_transport") return "Mobility transport";
  if (domain === "hazard_access") return lower.includes("smoke") ? "Smoke / access review" : "Hazard access review";
  if (domain === "public_information") return "Public information review";
  if (domain === "volunteer_capacity") return "Volunteer capacity";
  return "Shelter comfort supplies";
}

export function sourceSeverity(signal: Signal): SourceReport["severity"] {
  const text = signal.text.toLowerCase();
  if (text.includes("oxygen") || text.includes("sparking") || text.includes("closed fire road") || text.includes("double doses")) return "critical";
  if (text.includes("medication") || text.includes("insulin") || text.includes("smoke") || text.includes("blocked") || text.includes("formula")) return "high";
  if (text.includes("rumor") || text.includes("not confirmed") || text.includes("cannot verify") || text.includes("power")) return "medium";
  if (text.includes("not urgent") || text.includes("lost backpack")) return "low";
  return signal.processed ? "medium" : "low";
}

export function reportState(signal: Signal): SourceReport["stateLabel"] {
  const text = signal.text.toLowerCase();
  if (text.includes("double doses") || text.includes("send insulin to everyone")) return "Unsafe claim";
  if (!signal.processed) return "New";
  if (text.includes("duplicate") || text.includes("same request") || text.includes("again")) return "Duplicate";
  if (text.includes("not confirmed") || text.includes("cannot verify") || text.includes("not sure")) return "Missing info";
  return "Grouped";
}

export function reportHeadline(text: string) {
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith("photo")) return trimmed.replace(/^Photo note:/i, "Photo report:").replace(/^Photo from volunteer:/i, "Photo report:");
  if (trimmed.toLowerCase().includes("double doses")) return "Unsafe medication claim suppressed for review.";
  if (/^(report|intake report|volunteer report|call intake|social report|source report)/i.test(trimmed)) return trimmed;
  if (trimmed.length > 112) return `Source report: ${trimmed.slice(0, 108).trim()}...`;
  return `Source report: ${trimmed}`;
}

export function sourceTags(signal: Signal, domain: CareDomain) {
  const text = signal.text.toLowerCase();
  const tags = [careLabel(domain).toLowerCase()];
  if (text.includes("duplicate") || text.includes("same request") || text.includes("again")) tags.push("duplicate");
  if (text.includes("not confirmed") || text.includes("cannot verify") || text.includes("not sure")) tags.push("unresolved");
  if (text.includes("double doses") || text.includes("unsafe")) tags.push("unsafe claim");
  if (text.includes("spanish")) tags.push("language access");
  if (text.includes("oxygen") || text.includes("power") || text.includes("battery")) tags.push("power need");
  return [...new Set(tags)].slice(0, 3);
}

export function toSourceReports(snapshot?: Snapshot | null): SourceReport[] {
  return (snapshot?.signals ?? []).map((signal) => {
    const domain = careDomainFromText(signal.text);
    return {
      ...signal,
      severity: sourceSeverity(signal),
      sourceLabel: sourceLabel(signal.source),
      timeLabel: formatTime(signal.created_at),
      headline: reportHeadline(signal.text),
      locationLabel: signal.location_hint || "Community Center",
      stateLabel: reportState(signal),
      careDomain: domain,
      careLabel: careLabel(domain),
      tags: sourceTags(signal, domain),
    };
  });
}

export function unsafeClaimsForCards(cards: BoardCard[]): UnsafeClaim[] {
  return cards
    .flatMap((card) => {
      const explicitClaims = card.unsafe_claims?.length ? card.unsafe_claims : [];
      const inferredClaims =
        explicitClaims.length === 0 && /double doses|unsafe dosing|unsupported insulin|send insulin to everyone|closed fire road/i.test(card.summary) ? [card.summary] : [];
      return [...explicitClaims, ...inferredClaims].map((claim, index) => ({
        id: `unsafe-${card.incident_id}-${index}`,
        claim: safeUnsafeClaimLabel(claim),
        source: careTitle(careDomainForCard(card), card.summary),
        handling: /insulin|doses|dose|medication/i.test(claim + card.summary)
          ? "Suppressed as medical advice. Keep only the logistics request and ask for authorized pickup details."
          : "Held for reviewer action because the report may create unsafe routing.",
      }));
    });
}

function safeUnsafeClaimLabel(claim: string) {
  if (/insulin|doses|dose|medication/i.test(claim)) return "Unsafe medication instruction held for review.";
  if (/closed fire road|unsafe route|routing|road/i.test(claim)) return "Unsafe routing instruction held for review.";
  return "Unsafe claim held for review.";
}

export function continuityStateLabel(state: string, missingCount: number, unsafeCount = 0) {
  if (state === "DISPATCHED") return "Handoff sent";
  if (state === "RESOLVED") return "Closed";
  if (state === "REJECTED") return "Rejected";
  if (state === "MERGED") return "Merged";
  if (unsafeCount > 0) return "Unsafe claim held";
  if (missingCount > 0) return "Missing information";
  if (state === "ACTION_READY") return "Review complete";
  return "Needs review";
}

export function handoffStatus(state: string, missingCount: number): ContinuityTask["handoffStatus"] {
  if (state === "DISPATCHED") return "Sent";
  if (["RESOLVED", "REJECTED", "MERGED"].includes(state)) return "Closed";
  if (missingCount > 0) return "Unavailable";
  return "Ready for review";
}

function handoffStatusFromPayload(value: string | null | undefined, state: string, missingCount: number, unsafeCount: number): ContinuityTask["handoffStatus"] {
  if (state === "DISPATCHED" || value === "sent") return "Sent";
  if (["RESOLVED", "REJECTED", "MERGED"].includes(state) || value === "closed") return "Closed";
  if (unsafeCount > 0 || missingCount > 0 || value?.startsWith("blocked")) return "Unavailable";
  return "Ready for review";
}

export function candidateQueue(domain: CareDomain) {
  const labels: Record<CareDomain, string> = {
    medication: "Care desk review",
    oxygen_power: "Power support review",
    infant_supply: "Shelter supply review",
    mobility_transport: "Transport desk review",
    hazard_access: "Safety liaison review",
    public_information: "Information desk review",
    volunteer_capacity: "Volunteer intake review",
    shelter_comfort: "Shelter ops review",
  };
  return labels[domain];
}

export function reportedDeadline(summary: string, urgency: BoardCard["urgency"], domain: CareDomain) {
  const lower = summary.toLowerCase();
  if (lower.includes("before evening") || lower.includes("tonight")) return "reported today";
  if (lower.includes("transport") || lower.includes("bus")) return "transport window";
  if (lower.includes("one bottle left")) return "supply nearly out";
  if (domain === "oxygen_power") return "battery risk";
  if (urgency === "critical") return "immediate review";
  if (urgency === "high") return "same operating period";
  return "monitor";
}

export function summarizeContinuityGroup(title: string, group: BoardCard[], fallback: string) {
  if (group.length === 1) return reportGroundedSummary(fallback);
  if (title.includes("Medication")) return `${group.length} related source reports describe medication logistics, duplicate intake, or unsafe dosing language that needs review.`;
  if (title.includes("Power")) return `${group.length} related source reports describe oxygen, charging, or power-dependent support needs.`;
  if (title.includes("Infant")) return `${group.length} related source reports describe infant formula, diapers, or family supply needs.`;
  if (title.includes("Mobility")) return `${group.length} related source reports describe transport, bus access, or limited-mobility constraints.`;
  if (title.includes("Hazard")) return `${group.length} related source reports describe access, smoke, roadway, or electrical hazards.`;
  if (title.includes("Verified")) return `${group.length} related source reports describe rumors, public updates, language access, or policy questions.`;
  return `${group.length} related source reports are grouped for review.`;
}

function reportGroundedSummary(summary: string) {
  if (/^(report|source report|related reports)/i.test(summary)) return summary;
  return `Source report describes: ${summary}`;
}

export function toContinuityTasks(snapshot?: Snapshot | null): ContinuityTask[] {
  const cards = (snapshot?.board.lanes ?? []).flatMap((lane) => lane.cards);
  const groups = cards.reduce((map, card) => {
    const domain = careDomainForCard(card);
    const title = careTitle(domain, card.summary);
    map.set(title, [...(map.get(title) ?? []), card]);
    return map;
  }, new Map<string, BoardCard[]>());

  return [...groups.entries()]
    .map(([title, group]) => {
      const representative = chooseRepresentative(title, group);
      const domain = careDomainForCard(representative);
      const urgency = group.reduce((highest, card) => (severityRank[card.urgency] > severityRank[highest] ? card.urgency : highest), representative.urgency);
      const unsafeClaims = unsafeClaimsForCards(group);
      const requiredFields = uniqueItems(group.flatMap((card) => card.required_fields ?? []));
      const missingCount = requiredFields.length || representative.missing_information_count;
      const sourceAssertions = uniqueItems(group.flatMap((card) => card.source_assertions ?? []));
      const conflicts = uniqueItems(group.flatMap((card) => card.conflicts ?? []));
      const unresolved = conflicts.length > 0 || group.some((card) => /rumor|not confirmed|cannot verify|not sure|unsupported|unsafe/i.test(card.summary));
      return {
        ...representative,
        title,
        urgency,
        missing_information_count: missingCount,
        careDomain: domain,
        careLabel: careLabel(domain),
        summary: summarizeContinuityGroup(title, group, representative.summary),
        stateLabel: continuityStateLabel(representative.state, missingCount, unsafeClaims.length),
        handoffStatus: handoffStatusFromPayload(representative.handoff_status, representative.state, missingCount, unsafeClaims.length),
        candidateQueue: candidateQueue(domain),
        reportedDeadline: reportedDeadline(representative.summary, urgency, domain),
        sourceReportCount: group.length,
        sourceLinkLabel: `${group.length} source report${group.length === 1 ? "" : "s"}`,
        missingLabel: missingCount === 0 ? "No missing fields" : `${missingCount} missing field${missingCount === 1 ? "" : "s"}`,
        conflictLabel: unresolved ? "Unresolved conflict" : "No conflict",
        requiredFields,
        sourceAssertions,
        conflicts,
        unsafeClaims,
      };
    })
    .sort((a, b) => {
      if (a.careDomain === "medication" && b.careDomain !== "medication") return -1;
      if (b.careDomain === "medication" && a.careDomain !== "medication") return 1;
      const unsafeDelta = b.unsafeClaims.length - a.unsafeClaims.length;
      if (unsafeDelta) return unsafeDelta;
      const missingDelta = Number(b.missing_information_count > 0) - Number(a.missing_information_count > 0);
      if (missingDelta) return missingDelta;
      return severityRank[b.urgency] - severityRank[a.urgency];
    });
}

function chooseRepresentative(title: string, group: BoardCard[]) {
  if (title.includes("Medication")) {
    const safe = group.find((card) => !/unsupported|double doses|send insulin to everyone/i.test(card.summary));
    if (safe) return safe;
  }
  return [...group].sort((a, b) => {
    const severityDelta = severityRank[b.urgency] - severityRank[a.urgency];
    if (severityDelta) return severityDelta;
    return b.missing_information_count - a.missing_information_count;
  })[0];
}

export function preferredContinuityTaskId(tasks: ContinuityTask[]) {
  return tasks.find((task) => task.careDomain === "medication" && !/unsafe|unsupported/i.test(task.summary))?.incident_id ?? tasks[0]?.incident_id ?? null;
}

export function toMissingFields(incident?: Incident | null): MissingField[] {
  if (!incident) return [];
  const requiredLabels = incident.required_fields?.length ? incident.required_fields : missingItemsForDisplay(incident);
  const open = requiredLabels.map(displayRequiredField).map((label, index) => ({
    id: `missing-${index}`,
    label,
    status: "Open" as const,
    sourceCoverage: "No reviewed value",
    nextAction: missingNextAction(label),
  }));
  const complete: MissingField[] = [
    {
      id: "source-reports-linked",
      label: "Source reports linked",
      status: "Complete",
      sourceCoverage: `${incident.evidence.length} source link${incident.evidence.length === 1 ? "" : "s"}`,
      nextAction: "No action needed",
    },
    {
      id: "draft-task-created",
      label: "Continuity item created",
      status: "Complete",
      sourceCoverage: taskStateLabel(incident.state, incident.missing_information.length),
      nextAction: "Review open fields",
    },
  ];
  return [...open, ...complete];
}

function displayRequiredField(field: string) {
  const lower = field.toLowerCase();
  if (lower.includes("recipient identity")) return "Confirm recipient identity";
  if (lower.includes("specific recipient")) return "Confirm specific recipient";
  if (lower.includes("authorized pickup")) return "Confirm authorized pickup contact";
  if (lower.includes("pharmacy") || lower.includes("pickup location")) return "Verify pharmacy or pickup location";
  if (lower.includes("backup power")) return "Verify backup power source";
  if (lower.includes("safe route")) return "Verify safe route";
  if (lower.includes("clinical guidance")) return "Route clinical guidance to qualified review";
  return field.charAt(0).toUpperCase() + field.slice(1);
}

function missingNextAction(field: string) {
  const lower = field.toLowerCase();
  if (lower.includes("identity") || lower.includes("contact")) return "Ask the source owner to confirm who the request is for.";
  if (lower.includes("pharmacy") || lower.includes("pickup") || lower.includes("location") || lower.includes("address")) return "Request the exact logistics location from a named source.";
  if (lower.includes("whether")) return "Resolve the unresolved condition with a direct source.";
  return "Request this detail before handoff is available.";
}

export function continuityReceiptFromMessage(message: string): ContinuityReceipt {
  return {
    title: "Operation recorded",
    message: sanitizeOperationMessage(message),
    timestamp: new Date().toISOString(),
    ok: true,
  };
}

export function continuityCounts(tasks: ContinuityTask[], reports: SourceReport[]) {
  return {
    reports: reports.length,
    tasks: tasks.length,
    missingFields: tasks.reduce((sum, task) => sum + task.missing_information_count, 0),
    unsafeClaims: tasks.reduce((sum, task) => sum + task.unsafeClaims.length, 0),
    ready: tasks.filter((task) => task.handoffStatus === "Ready for review").length,
  };
}
