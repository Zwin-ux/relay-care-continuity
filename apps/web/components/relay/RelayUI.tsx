"use client";

import { m } from "framer-motion";
import { AlertTriangle, Check, ChevronsRight, FileText, Radio, ShieldCheck, Truck, X } from "lucide-react";
import { BoardCard, Incident, Signal } from "@/lib/api";
import { relayTokens } from "@/lib/relayTokens";

export function RelayLogo() {
  return (
    <div className="flex items-center gap-3">
      <img src={relayTokens.assets.logo} alt="" className="size-11 rounded-[14px] shadow-soft" />
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">RELAY</h1>
          <span className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-muted">Care Continuity</span>
        </div>
        <p className="mt-0.5 text-sm text-muted">Local reports grouped for evacuation shelter review. No live dispatch connection.</p>
      </div>
    </div>
  );
}

export function MissionStatusBar({
  total,
  blockers,
  mode = "replay",
  onLoad,
  onTriage,
  onEval,
  loadingScenario,
  runningTriage,
  runningEval,
}: {
  total: number;
  blockers: number;
  mode?: string;
  onLoad: () => void;
  onTriage: () => void;
  onEval: () => void;
  loadingScenario: boolean;
  runningTriage: boolean;
  runningEval: boolean;
}) {
  return (
    <header className="rounded-[28px] border border-line bg-surface p-4 shadow-premium">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <RelayLogo />
        <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
          <StatusMetric label="Scenario" value="Wildfire Community Center" />
          <StatusMetric label="Mode" value={mode} tone="blue" />
          <StatusMetric label="Missing info" value={`${blockers}/${total} items`} tone={blockers ? "amber" : "green"} />
        </div>
        <div className="flex flex-wrap gap-2">
          <RelayButton tone="primary" icon={<Radio className="size-4" />} onClick={onLoad} disabled={loadingScenario}>
            {loadingScenario ? "Loading..." : "Load reports"}
          </RelayButton>
          <RelayButton icon={<ChevronsRight className="size-4" />} onClick={onTriage} disabled={runningTriage}>
            {runningTriage ? "Grouping..." : "Regroup reports"}
          </RelayButton>
          <RelayButton icon={<FileText className="size-4" />} onClick={onEval} disabled={runningEval}>
            Check missing fields
          </RelayButton>
        </div>
      </div>
    </header>
  );
}

function StatusMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "blue" | "amber" | "green" }) {
  const toneClass = tone === "blue" ? "text-blue" : tone === "amber" ? "text-amber" : tone === "green" ? "text-positive" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-canvas px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function ScenarioLaunch({ onLoad, loading }: { onLoad: () => void; loading: boolean }) {
  return (
    <section className="grid overflow-hidden rounded-[28px] border border-line bg-surface shadow-premium lg:grid-cols-[1fr_360px]">
      <div className="p-7">
        <span className="rounded-full bg-blueWash px-3 py-1 text-xs font-semibold text-blue">replay scenario</span>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-ink">
          Group wildfire shelter reports into care continuity items.
        </h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted">
          RELAY links source reports, shows missing information, suppresses unsafe claims, and keeps handoff unavailable until required fields are complete.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <RelayButton tone="primary" icon={<Radio className="size-4" />} onClick={onLoad} disabled={loading}>
            {loading ? "Loading wildfire reports..." : "Load wildfire reports"}
          </RelayButton>
          <span className="rounded-full border border-line bg-canvas px-4 py-2 text-sm font-semibold text-muted">30 reports / 2 missing fields</span>
        </div>
      </div>
      <div className="relative min-h-[230px] bg-gradient-to-br from-blueWash to-white p-5">
        <img src={relayTokens.assets.wildfirePerimeter} alt="" className="h-full w-full rounded-3xl object-cover shadow-soft" />
      </div>
    </section>
  );
}

export function SignalSourceIcon({ source }: { source: string }) {
  const src = relayTokens.sourceIcons[source] ?? relayTokens.sourceIcons.sms;
  return <img src={src} alt="" className="size-10 shrink-0 rounded-[14px]" data-testid={`source-icon-${source}`} />;
}

export function IncidentTypeIcon({ type }: { type: string }) {
  const src = relayTokens.incidentIcons[type] ?? relayTokens.incidentIcons.information_coordination;
  return <img src={src} alt="" className="size-11 shrink-0 rounded-2xl" data-testid={`incident-icon-${type}`} />;
}

export function SignalCell({ signal, index }: { signal: Signal; index: number }) {
  return (
    <article className="flex gap-3 border-b border-line px-4 py-3 transition hover:bg-blueWash/50">
      <SignalSourceIcon source={signal.source} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] font-semibold uppercase text-muted">{String(index + 1).padStart(2, "0")} / {signal.source.replace("_", " ")}</p>
          <span className={signal.processed ? "text-blue" : "text-amber"}>{signal.processed ? "Grouped" : "New"}</span>
        </div>
        <p className="mt-1 text-sm leading-5 text-ink">{signal.text}</p>
      </div>
    </article>
  );
}

export function MissionCard({ incident, selected, onSelect }: { incident: BoardCard; selected: boolean; onSelect: () => void }) {
  const blocked = incident.state === "NEEDS_VERIFICATION" || incident.missing_information_count > 0;
  return (
    <m.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onSelect}
      data-testid={`continuity-card-${incident.incident_id}`}
      className={`group m-2 block w-[calc(100%-1rem)] rounded-2xl border bg-surface p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:border-blue ${
        selected ? "border-blue ring-4 ring-blue/10" : "border-line"
      }`}
    >
      <div className="flex items-start gap-3">
        <IncidentTypeIcon type={incident.incident_type} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <UrgencyPill urgency={incident.urgency} />
            {blocked && <span className="rounded-full bg-amberWash px-2 py-1 text-[11px] font-semibold text-amber">missing info</span>}
          </div>
          <p className="line-clamp-3 text-sm font-semibold leading-5 text-ink">{incident.summary}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-line bg-canvas px-3 py-2 text-[11px] text-muted">
        <span className="truncate">{incident.incident_type.replaceAll("_", " ")}</span>
        <span>{incident.missing_information_count} missing info</span>
      </div>
    </m.button>
  );
}

export function SafetyGate({ incident, blockedMessage, blockedNextStep }: { incident: Incident; blockedMessage?: string; blockedNextStep?: string }) {
  const blocked = incident.state === "NEEDS_VERIFICATION" || incident.missing_information.length > 0;
  if (!blocked && !blockedMessage) {
    return (
      <section className="rounded-2xl border border-positive/25 bg-positiveWash p-4">
        <div className="flex gap-3">
          <ShieldCheck className="size-5 text-positive" />
          <div>
            <h4 className="font-semibold text-positive">Ready for handoff</h4>
            <p className="mt-1 text-sm leading-6 text-ink">Required fields are complete. The reviewer can decide whether to send the task forward.</p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-amber/35 bg-amberWash">
      <div className="flex items-start gap-3 p-4">
        <div className="rounded-2xl bg-white p-2 shadow-soft">
          <ShieldCheck className="size-5 text-amber" />
        </div>
        <div>
          <h4 className="font-semibold text-ink">{blockedMessage ? "Handoff blocked" : "Missing information"}</h4>
          <p className="mt-1 text-sm leading-6 text-ink/80">
            {blockedMessage || "Handoff stays unavailable until required fields are complete."}
          </p>
          {blockedNextStep && <p className="mt-2 text-sm font-semibold text-ink">Required next step: {blockedNextStep}</p>}
        </div>
      </div>
      <RequiredChecklist items={incident.missing_information} />
    </section>
  );
}

function RequiredChecklist({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="border-t border-amber/25 bg-white/55 px-4 py-3">
      <p className="text-xs font-semibold uppercase text-amber">Required information</p>
      <div className="mt-2 grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-ink">
            <span className="size-2 rounded-full bg-amber" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvidenceStack({ incident }: { incident: Incident }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <SectionTitle title="Source reports" meta={`${incident.evidence.length} link${incident.evidence.length === 1 ? "" : "s"}`} />
      <div className="mt-3 grid gap-3">
        {incident.evidence.map((evidence) => (
          <article key={evidence.id} className="rounded-2xl border border-line bg-canvas p-3">
            <div className="flex items-start gap-3">
              <SignalSourceIcon source={evidence.type === "image_observation" ? "image_report" : "sms"} />
              <div>
                <p className="text-sm font-semibold text-ink">{evidence.quote ?? evidence.description}</p>
                {evidence.description && evidence.quote && <p className="mt-1 text-sm leading-6 text-muted">{evidence.description}</p>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AuditReceipt({ incident }: { incident: Incident }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle title="Audit receipt" meta={`${incident.audit.length} events`} />
        <img src={relayTokens.assets.auditReceipt} alt="" className="hidden h-8 w-28 object-contain sm:block" />
      </div>
      <div className="mt-3 grid gap-2">
        {incident.audit.map((event) => (
          <article key={event.id} className="rounded-2xl bg-canvas px-3 py-2">
            <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted">
              <span>{event.actor} / {event.event_type}</span>
              <span>{event.to_state?.replaceAll("_", " ")}</span>
            </div>
            {event.note && <p className="mt-1 text-sm text-ink">{event.note}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export function EvalStrip({ result }: { result: Record<string, number> | null }) {
  if (!result) return null;
  return (
    <footer className="grid gap-3 rounded-[24px] border border-line bg-surface p-3 shadow-soft md:grid-cols-4">
      {Object.entries(result).map(([key, value]) => (
        <div key={key} className="rounded-2xl bg-canvas px-4 py-3">
          <p className="text-xs font-medium text-muted">{key.replaceAll("_", " ")}</p>
          <p className="mt-1 text-2xl font-semibold text-blue">{Math.round(value * 100)}%</p>
        </div>
      ))}
    </footer>
  );
}

export function UrgencyPill({ urgency }: { urgency: string }) {
  const tone =
    urgency === "critical"
      ? "border-danger/20 bg-dangerWash text-danger"
      : urgency === "high"
        ? "border-amber/25 bg-amberWash text-amber"
        : urgency === "medium"
          ? "border-blue/20 bg-blueWash text-blue"
          : "border-line bg-canvas text-muted";
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${tone}`}>{urgency}</span>;
}

export function RelayButton({
  children,
  icon,
  onClick,
  disabled,
  tone = "neutral",
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "warning" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-blue text-white border-blue hover:bg-blueDark"
      : tone === "warning"
        ? "bg-amberWash text-amber border-amber/35 hover:bg-amber/15"
        : tone === "danger"
          ? "bg-dangerWash text-danger border-danger/25 hover:bg-danger/15"
          : "bg-surface text-ink border-line hover:border-blue hover:bg-blueWash";
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`} onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  );
}

export function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {meta && <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">{meta}</span>}
    </div>
  );
}

export const relayIcons = {
  AlertTriangle,
  Check,
  ShieldCheck,
  Truck,
  X,
};
