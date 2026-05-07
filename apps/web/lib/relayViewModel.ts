import { BoardCard, Incident, Signal, Snapshot } from "@/lib/api";

export type ReportFilter = "All" | "Critical" | "New" | "Duplicates" | "Missing info";

export const reportFilters: ReportFilter[] = ["All", "Critical", "New", "Duplicates", "Missing info"];

export type ReportRow = Signal & {
  severity: "critical" | "high" | "medium" | "low";
  sourceLabel: string;
  excerpt: string;
  meta: string;
  stateLabel: string;
};

export type DraftTask = BoardCard & {
  title: string;
  stateLabel: string;
  severityLabel: string;
  candidateUnit: string;
  reportedDeadline: string;
  missingLabel: string;
  relatedCount: number;
  sourceLinkLabel: string;
};

export type MissingInfoLedgerRow = {
  id: string;
  field: string;
  status: "Complete" | "Open";
  sourceCoverage: string;
  nextAction: string;
};

const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };

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

export function formatTime(value?: string | null) {
  if (!value) return "08:12";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "08:12";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function reportSeverity(signal: Signal): ReportRow["severity"] {
  const text = signal.text.toLowerCase();
  if (text.includes("sparking") || text.includes("oxygen") || text.includes("closed fire road")) return "critical";
  if (text.includes("medication") || text.includes("insulin") || text.includes("smoke") || text.includes("blocked") || text.includes("formula")) return "high";
  if (text.includes("rumor") || text.includes("not confirmed") || text.includes("cannot verify")) return "medium";
  if (text.includes("not urgent") || text.includes("lost backpack")) return "low";
  return signal.processed ? "medium" : "low";
}

export function reportState(signal: Signal) {
  const text = signal.text.toLowerCase();
  if (!signal.processed) return "New";
  if (text.includes("duplicate") || text.includes("same request") || text.includes("again")) return "Duplicate";
  if (text.includes("not confirmed") || text.includes("cannot verify") || text.includes("not sure")) return "Missing info";
  return "Grouped";
}

export function reportExcerpt(text: string) {
  if (/^(report|intake report|volunteer report|photo|call intake|social report)/i.test(text)) return text;
  if (text.length > 118) return `Source report: ${text.slice(0, 114).trim()}...`;
  return `Source report: ${text}`;
}

export function toReportRows(snapshot?: Snapshot | null): ReportRow[] {
  return (snapshot?.signals ?? []).map((signal) => {
    const severity = reportSeverity(signal);
    const stateLabel = reportState(signal);
    return {
      ...signal,
      severity,
      sourceLabel: sourceLabel(signal.source),
      excerpt: reportExcerpt(signal.text),
      meta: `${sourceLabel(signal.source)} - ${formatTime(signal.created_at)}`,
      stateLabel,
    };
  });
}

export function filterReports(reports: ReportRow[], filter: ReportFilter) {
  if (filter === "Critical") return reports.filter((report) => report.severity === "critical");
  if (filter === "New") return reports.filter((report) => report.stateLabel === "New");
  if (filter === "Duplicates") return reports.filter((report) => report.stateLabel === "Duplicate");
  if (filter === "Missing info") return reports.filter((report) => report.stateLabel === "Missing info");
  return reports;
}

export function incidentTitle(type: string, summary: string) {
  const text = summary.toLowerCase();
  if (text.includes("medication") || text.includes("pharmacy") || text.includes("insulin") || text.includes("heart medication")) return "Medication pickup";
  if (text.includes("oxygen") || text.includes("welfare")) return "Welfare check";
  if (text.includes("formula") || text.includes("diapers") || text.includes("chargers") || text.includes("blankets") || text.includes("supply")) return "Shelter supplies";
  if (text.includes("road") || text.includes("tree") || text.includes("wires") || text.includes("smoke") || text.includes("traffic")) return "Hazard report";
  if (text.includes("bus") || text.includes("spanish") || text.includes("policy") || text.includes("rumor")) return "Information update";
  if (type === "shelter_supply") return "Shelter supplies";
  if (type === "information_coordination") return "Information update";
  if (type === "vulnerable_person_support") return "Welfare check";
  if (type === "volunteer_task") return "Volunteer offer";
  return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function candidateUnit(type: string) {
  const units: Record<string, string> = {
    vulnerable_person_support: "Medical support desk",
    shelter_supply: "Shelter ops",
    infrastructure_hazard: "Safety liaison",
    information_coordination: "Information desk",
    volunteer_task: "Volunteer intake",
  };
  return units[type] ?? "Reviewer queue";
}

export function reportedDeadline(summary: string, urgency: BoardCard["urgency"]) {
  const text = summary.toLowerCase();
  if (text.includes("transport") || text.includes("bus") || text.includes("evacuation")) return "transport leaves soon";
  if (text.includes("medication") || text.includes("pharmacy") || text.includes("insulin")) return "reported need today";
  if (urgency === "critical") return "immediate source review";
  if (urgency === "high") return "same operating period";
  if (urgency === "medium") return "same operating period";
  return "non-urgent";
}

export function taskStateLabel(state: string, missingCount: number) {
  if (state === "DISPATCHED") return "Handoff sent";
  if (state === "RESOLVED") return "Resolved";
  if (state === "REJECTED") return "Rejected";
  if (state === "MERGED") return "Merged";
  if (missingCount > 0) return "Missing info";
  if (state === "ACTION_READY") return "Ready for handoff";
  return "Needs review";
}

export function toDraftTasks(snapshot?: Snapshot | null): DraftTask[] {
  const cards = (snapshot?.board.lanes ?? []).flatMap((lane) => lane.cards);
  const groups = cards.reduce((map, card) => {
    const title = incidentTitle(card.incident_type, card.summary);
    map.set(title, [...(map.get(title) ?? []), card]);
    return map;
  }, new Map<string, BoardCard[]>());

  return [...groups.entries()]
    .map(([title, group]) => {
      const representative = chooseRepresentativeCard(title, group);
      const urgency = group.reduce((highest, card) => (severityRank[card.urgency] > severityRank[highest] ? card.urgency : highest), representative.urgency);
      const missingCount = representative.missing_information_count;
      return {
        ...representative,
        title,
        urgency,
        summary: summarizeTaskGroup(title, group, representative.summary),
        stateLabel: taskStateLabel(representative.state, missingCount),
        severityLabel: urgency,
        candidateUnit: candidateUnit(representative.incident_type),
        reportedDeadline: reportedDeadline(representative.summary, urgency),
        missingLabel: missingCount === 0 ? "No missing fields" : `${missingCount} missing field${missingCount === 1 ? "" : "s"}`,
        relatedCount: group.length,
        sourceLinkLabel: `${group.length} related report${group.length === 1 ? "" : "s"}`,
      };
    })
    .sort((a, b) => {
      if (a.title === "Medication pickup" && b.title !== "Medication pickup") return -1;
      if (b.title === "Medication pickup" && a.title !== "Medication pickup") return 1;
      const missingDelta = Number(b.missing_information_count > 0) - Number(a.missing_information_count > 0);
      if (missingDelta) return missingDelta;
      return severityRank[b.urgency] - severityRank[a.urgency];
    });
}

function chooseRepresentativeCard(title: string, group: BoardCard[]) {
  if (title === "Medication pickup") {
    const safe = group.find((card) => {
      const summary = card.summary.toLowerCase();
      return (summary.includes("medication pickup needed") || summary.includes("pharmacy pickup")) && !summary.includes("unsupported") && !summary.includes("double doses");
    });
    if (safe) return safe;
  }
  return [...group].sort((a, b) => {
    const severityDelta = severityRank[b.urgency] - severityRank[a.urgency];
    if (severityDelta) return severityDelta;
    return b.missing_information_count - a.missing_information_count;
  })[0];
}

function summarizeTaskGroup(title: string, group: BoardCard[], fallback: string) {
  if (group.length === 1) return fallback;
  const lower = title.toLowerCase();
  if (lower.includes("medication")) return `${group.length} related reports describe medication pickup needs, duplicates, or unsafe medication claims that need review.`;
  if (lower.includes("hazard")) return `${group.length} related reports describe road, smoke, power, or access hazards that need source review.`;
  if (lower.includes("shelter")) return `${group.length} related reports describe shelter supply needs, charging limits, or family-support requests.`;
  if (lower.includes("information")) return `${group.length} related reports describe public information requests, rumors, or announcement needs.`;
  return `${group.length} related reports are grouped for review.`;
}

export function preferredTaskId(tasks: DraftTask[]) {
  const safeMedication = tasks.find((task) => {
    const summary = task.summary.toLowerCase();
    return task.title === "Medication pickup" && (summary.includes("medication pickup needed") || summary.includes("pharmacy pickup")) && !summary.includes("unsupported") && !summary.includes("double doses");
  });
  return safeMedication?.incident_id ?? tasks.find((task) => task.title === "Medication pickup" && !task.summary.toLowerCase().includes("unsupported"))?.incident_id ?? tasks[0]?.incident_id ?? null;
}

export function missingItemsForDisplay(incident?: Incident | null) {
  const items = incident?.required_fields?.length ? incident.required_fields : incident?.missing_information ?? [];
  return items.map((item) => {
    const lower = item.toLowerCase();
    if (lower.includes("recipient identity")) return "Confirm recipient identity";
    if (lower.includes("specific recipient")) return "Confirm specific recipient";
    if (lower.includes("authorized pickup")) return "Confirm authorized pickup contact";
    if (lower.includes("exact address")) return "Confirm exact address";
    if (lower.includes("pharmacy") || lower.includes("pickup location")) return "Verify pharmacy or pickup location";
    if (lower.includes("backup power")) return "Verify backup power source";
    if (lower.includes("safe route")) return "Verify safe route";
    if (lower.includes("clinical guidance")) return "Route clinical guidance to qualified review";
    if (lower.includes("contact")) return "Confirm pickup contact";
    if (lower.includes("whether")) return item.replace(/^whether/i, "Confirm whether");
    return item.charAt(0).toUpperCase() + item.slice(1);
  });
}

export function sourceLinkCount(incident?: Incident | null) {
  return incident?.evidence.length ?? 0;
}

function missingNextAction(field: string) {
  const text = field.toLowerCase();
  if (text.includes("identity") || text.includes("contact")) return "Ask intake desk to confirm the recipient before handoff.";
  if (text.includes("location") || text.includes("address") || text.includes("pharmacy")) return "Request the exact pickup location from a named source.";
  if (text.includes("whether")) return "Resolve the unresolved condition with a direct source.";
  return "Request the missing detail from the source report owner.";
}

export function toMissingInfoLedger(incident?: Incident | null): MissingInfoLedgerRow[] {
  if (!incident) return [];
  const missing = missingItemsForDisplay(incident);
  const completeRows: MissingInfoLedgerRow[] = [
    {
      id: "source-reports-linked",
      field: "Source reports linked",
      status: "Complete",
      sourceCoverage: `${sourceLinkCount(incident)} source link${sourceLinkCount(incident) === 1 ? "" : "s"}`,
      nextAction: "No action needed",
    },
    {
      id: "draft-task-created",
      field: "Draft task created",
      status: "Complete",
      sourceCoverage: taskStateLabel(incident.state, incident.missing_information.length),
      nextAction: "Review required fields",
    },
  ];

  return [
    ...completeRows,
    ...missing.map((field, index) => ({
      id: `missing-${index}`,
      field,
      status: "Open" as const,
      sourceCoverage: "No reviewed value",
      nextAction: missingNextAction(field),
    })),
  ];
}

export function statusCounts(snapshot?: Snapshot | null) {
  const reports = snapshot?.counts.signals_total ?? 0;
  const tasks = snapshot?.counts.incidents_total ?? 0;
  const missing = (snapshot?.counts.needs_verification ?? 0);
  const ready = snapshot?.counts.ready_to_dispatch ?? 0;
  return { reports, tasks, missing, ready };
}

export function sanitizeOperationMessage(message: string) {
  return message
    .replace(/Gemma triage processed/i, "Reports grouped from")
    .replace(/Gemma triage created an incident\./i, "Draft task created from source report.")
    .replace(/Incident verified by coordinator\./i, "Required fields recorded by reviewer.")
    .replace(/Dispatch recorded by coordinator\./i, "Handoff recorded by reviewer.")
    .replace(/Escalation recorded by coordinator\./i, "Supervisor review recorded.")
    .replace(/Incident state changed/i, "Task state changed")
    .replace(/Incident resolved/i, "Task resolved")
    .replace(/dispatch/gi, "handoff")
    .replace(/incident/gi, "task")
    .replace(/coordinator/gi, "reviewer");
}
