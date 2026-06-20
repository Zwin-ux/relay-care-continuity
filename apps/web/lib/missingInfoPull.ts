import { Incident } from "@/lib/api";
import { toMissingFields } from "@/lib/careContinuity";

export type MissingInfoPullPacket = {
  field: string;
  source: string;
  ask: string;
  ticketAsk: string;
  sourceExcerpt: string;
  fieldOptions: string[];
  sourceOptions: string[];
  askOptions: string[];
};

export function buildMissingInfoPullPacket(incident: Incident): MissingInfoPullPacket | null {
  const openRows = toMissingFields(incident).filter((row) => row.status === "Open");
  if (!openRows.length) return null;

  const field = openRows[0];
  const sourceOptions = incident.evidence.length
    ? incident.evidence.map((item, index) => evidenceLabel(item.type, index))
    : ["Review desk callback queue"];
  const firstEvidence = incident.evidence[0];

  return {
    field: field.label,
    source: sourceOptions[0],
    ask: compactAsk(field.label, field.nextAction),
    ticketAsk: field.nextAction,
    sourceExcerpt: compactExcerpt(firstEvidence?.quote || firstEvidence?.description || incident.summary),
    fieldOptions: openRows.map((row) => row.label),
    sourceOptions,
    askOptions: openRows.map((row) => compactAsk(row.label, row.nextAction)),
  };
}

function evidenceLabel(type: string, index: number) {
  const prefix = type === "image_observation" ? "Image report" : "Text report";
  return `${prefix} ${String(index + 1).padStart(2, "0")}`;
}

function compactExcerpt(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 88) return cleaned;
  return `${cleaned.slice(0, 84).trim()}...`;
}

function compactAsk(label: string, nextAction: string) {
  const lower = label.toLowerCase();
  if (lower.includes("recipient identity")) return "Confirm identity";
  if (lower.includes("authorized pickup")) return "Confirm pickup contact";
  if (lower.includes("pharmacy") || lower.includes("pickup location")) return "Get pickup location";

  const cleaned = nextAction
    .replace(/^Ask the source owner to\s+/i, "")
    .replace(/^Request the\s+/i, "")
    .replace(/\.$/, "")
    .trim();
  if (cleaned.length <= 34) return cleaned;
  return `${cleaned.slice(0, 31).trim()}...`;
}
