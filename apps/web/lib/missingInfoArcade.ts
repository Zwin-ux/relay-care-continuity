import { Incident } from "@/lib/api";
import { buildMissingInfoPullPacket, MissingInfoPullPacket } from "@/lib/missingInfoPull";

export type ArcadeChoiceTone = "safe" | "risky" | "unsafe";

export type ArcadeChoice = {
  id: string;
  label: string;
  body: string;
  correct: boolean;
  tone: ArcadeChoiceTone;
  feedback: string;
};

export type DispatchArcadeRun = {
  packet: MissingInfoPullPacket;
  caller: {
    label: string;
    line: string;
    stress: number;
    clarity: number;
  };
  sourceChoices: ArcadeChoice[];
  askChoices: ArcadeChoice[];
};

export type DispatchArcadeScore = {
  sourceDiscipline: number;
  safety: number;
  clarity: number;
  speed: number;
  total: number;
  label: "Clean ticket" | "Needs review" | "Unsafe ask blocked";
};

export function buildDispatchArcadeRun(incident: Incident): DispatchArcadeRun | null {
  const packet = buildMissingInfoPullPacket(incident);
  if (!packet) return null;

  const correctSource: ArcadeChoice = {
    id: "source-linked-report",
    label: packet.source,
    body: packet.sourceExcerpt,
    correct: true,
    tone: "safe",
    feedback: "Good source discipline. This is the linked report blocking the ticket.",
  };
  const sourceChoices = [
    {
      id: "source-public-context",
      label: "Public context strip",
      body: incident.safety_notes[0] || "Public context frames risk but does not confirm this request.",
      correct: false,
      tone: "risky" as const,
      feedback: "Context is useful, but it is not the source report for this missing field.",
    },
    correctSource,
    {
      id: "source-summary-only",
      label: "Ledger summary",
      body: compactArcadeText(incident.summary, 92),
      correct: false,
      tone: "risky" as const,
      feedback: "The summary is derived. The ticket needs the linked source.",
    },
  ];

  const askChoices: ArcadeChoice[] = [
    {
      id: "ask-safe",
      label: packet.ask,
      body: packet.ticketAsk,
      correct: true,
      tone: "safe",
      feedback: "Clean ask. It requests the missing logistics without adding advice.",
    },
    {
      id: "ask-assume",
      label: "Assume and route",
      body: "Use the current report as enough detail and move the ticket forward.",
      correct: false,
      tone: "risky",
      feedback: "Blocked. Required fields still need direct confirmation before handoff.",
    },
    {
      id: "ask-medical-advice",
      label: "Give care advice",
      body: "Tell the caller what to do about medication or treatment while they wait.",
      correct: false,
      tone: "unsafe",
      feedback: "Unsafe ask blocked. RELAY cannot give treatment instructions.",
    },
  ];

  return {
    packet,
    caller: {
      label: callerLabel(incident),
      line: callerLine(packet, incident),
      stress: incident.urgency === "critical" ? 92 : incident.urgency === "high" ? 78 : 58,
      clarity: incident.missing_information.length > 2 || (incident.required_fields?.length ?? 0) > 2 ? 46 : 62,
    },
    sourceChoices,
    askChoices,
  };
}

export function scoreDispatchArcadeRun(run: DispatchArcadeRun, selectedSourceId?: string, selectedAskId?: string, elapsedMs = 0): DispatchArcadeScore {
  const sourceChoice = run.sourceChoices.find((choice) => choice.id === selectedSourceId);
  const askChoice = run.askChoices.find((choice) => choice.id === selectedAskId);
  const sourceDiscipline = sourceChoice?.correct ? 30 : 8;
  const safety = askChoice?.correct ? 35 : askChoice?.tone === "unsafe" ? 0 : 15;
  const clarity = sourceChoice?.correct && askChoice?.correct ? 25 : askChoice?.correct ? 18 : 10;
  const speed = elapsedMs <= 12_000 ? 10 : elapsedMs <= 24_000 ? 7 : 4;
  const total = sourceDiscipline + safety + clarity + speed;

  return {
    sourceDiscipline,
    safety,
    clarity,
    speed,
    total,
    label: askChoice?.tone === "unsafe" ? "Unsafe ask blocked" : total >= 80 ? "Clean ticket" : "Needs review",
  };
}

function callerLabel(incident: Incident) {
  if (incident.care_domain === "medication") return "Medication desk signal";
  if (incident.care_domain === "oxygen_power") return "Power support signal";
  if (incident.care_domain === "infant_supply") return "Supply desk signal";
  return "Shelter source signal";
}

function callerLine(packet: MissingInfoPullPacket, incident: Incident) {
  const location = incident.location.raw || incident.location.normalized || "the shelter";
  return `Source is waiting on ${location}. Missing field: ${packet.field}. Keep the ask narrow.`;
}

function compactArcadeText(text: string, max: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3).trim()}...`;
}
