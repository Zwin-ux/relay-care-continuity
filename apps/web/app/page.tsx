"use client";

import { useEffect, useMemo, useState } from "react";
import { Banner } from "@coinbase/cds-web/banner";
import { Button } from "@coinbase/cds-web/buttons";
import { ListCell } from "@coinbase/cds-web/cells";
import { Spinner } from "@coinbase/cds-web/loaders";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@coinbase/cds-web/tables";
import { Tag } from "@coinbase/cds-web/tag";
import { api, BoardCard, Incident, Snapshot } from "@/lib/api";
import {
  CareDomain,
  ContinuityTask,
  SourceReport,
  careLabel,
  continuityCounts,
  PublicContextItem,
  preferredContinuityTaskId,
  toContinuityTasks,
  toMissingFields,
  toSourceReports,
} from "@/lib/careContinuity";
import { getLocationPack, locationContextLine, locationPackFromSnapshot, locationPacks } from "@/lib/locationPacks";
import { fallbackLiveContext, fetchLiveContext, LiveContextSignal } from "@/lib/liveContext";
import { getActionAvailability } from "@/lib/relayActions";
import { OperationReceipt, useRelayMutation, useRelaySnapshot } from "@/lib/relayHooks";
import { relayTokens } from "@/lib/relayTokens";
import { formatTime, missingItemsForDisplay, sanitizeOperationMessage } from "@/lib/relayViewModel";
import { ArcadeChoice, buildDispatchArcadeRun, DispatchArcadeRun, DispatchArcadeScore, scoreDispatchArcadeRun } from "@/lib/missingInfoArcade";

type ReportFilter = "All" | "Critical" | "Missing info" | "Unsafe claim";
type CommandAction = "load" | "triage" | "follow" | "verify" | "dispatch" | "escalate" | "activate_location";
type MissingInfoPullPhase = "pull" | "match" | "ask" | "lock" | "submitting" | "printed" | "failed";
type MissingInfoPullState = {
  requestId: string;
  incidentId: string;
  phase: MissingInfoPullPhase;
  run: DispatchArcadeRun;
  startedAt: number;
  selectedSourceId?: string;
  selectedAskId?: string;
  sourceFeedback?: string;
  askFeedback?: string;
  score?: DispatchArcadeScore;
};

const reportFilters: ReportFilter[] = ["All", "Critical", "Missing info", "Unsafe claim"];

export default function Page() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReportFilter>("All");
  const [receipt, setReceipt] = useState<OperationReceipt | null>(null);
  const [blockedAction, setBlockedAction] = useState<{ title: string; reason: string; nextStep?: string } | null>(null);
  const [guidedStarting, setGuidedStarting] = useState(false);
  const [liveContext, setLiveContext] = useState<LiveContextSignal>(() => fallbackLiveContext(getLocationPack()));
  const [liveContextLoading, setLiveContextLoading] = useState(false);
  const [manualReports, setManualReports] = useState<SourceReport[]>([]);
  const [missingInfoPull, setMissingInfoPull] = useState<MissingInfoPullState | null>(null);
  const snapshotQuery = useRelaySnapshot(selectedId);
  const mutation = useRelayMutation({ selectedId, setSelectedId, setReceipt, setBlockedAction });

  const snapshot = snapshotQuery.data;
  const activeLocationPack = locationPackFromSnapshot(snapshot);
  const visibleContextItems = snapshot?.public_context?.length ? snapshot.public_context : activeLocationPack.public_context;
  const reports = useMemo(() => [...manualReports, ...toSourceReports(snapshot)], [manualReports, snapshot]);
  const visibleReports = useMemo(() => filterSourceReports(reports, filter), [reports, filter]);
  const tasks = useMemo(() => toContinuityTasks(snapshot), [snapshot]);
  const counts = useMemo(() => continuityCounts(tasks, reports), [tasks, reports]);
  const selectedTask = tasks.find((task) => task.incident_id === selectedId) ?? tasks[0] ?? null;
  const reviewIncident = snapshot?.selected_incident ?? (selectedTask ? continuityTaskToIncident(selectedTask) : null);

  useEffect(() => {
    if (!selectedId && tasks.length > 0) setSelectedId(preferredContinuityTaskId(tasks));
  }, [selectedId, tasks]);

  useEffect(() => {
    setMissingInfoPull((current) => (current && selectedId && current.incidentId !== selectedId ? null : current));
  }, [selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLiveContextLoading(true);
    fetchLiveContext(activeLocationPack, controller.signal)
      .then((context) => {
        if (active) setLiveContext(context);
      })
      .catch((error) => {
        if (active) setLiveContext(fallbackLiveContext(activeLocationPack, error instanceof Error ? error.message : "Live public alerts unavailable."));
      })
      .finally(() => {
        if (active) setLiveContextLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeLocationPack.id]);

  const startGuidedReview = async () => {
    setGuidedStarting(true);
    setReceipt(null);
    setBlockedAction(null);
    try {
      await mutation.mutateAsync({ type: "load" });
      const result = await mutation.mutateAsync({ type: "triage" });
      const preferredId = preferredContinuityTaskId(toContinuityTasks(result.snapshot));
      if (preferredId) setSelectedId(preferredId);
    } catch {
      // The mutation hook records a reviewer-facing receipt for blocked or failed actions.
    } finally {
      setGuidedStarting(false);
    }
  };

  const run = (type: CommandAction, id?: string) => {
    mutation.mutate({ type, id });
  };

  const requestMissingInfo = (incident: Incident) => {
    const arcadeRun = buildDispatchArcadeRun(incident);
    if (!arcadeRun) {
      run("follow", incident.id);
      return;
    }

    const requestId = `${incident.id}-${Date.now()}`;
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pullDelay = reduceMotion ? 0 : 1100;

    setReceipt(null);
    setBlockedAction(null);
    setMissingInfoPull({
      requestId,
      incidentId: incident.id,
      phase: reduceMotion ? "match" : "pull",
      run: arcadeRun,
      startedAt: Date.now(),
    });

    window.setTimeout(() => {
      setMissingInfoPull((current) => (current?.requestId === requestId && current.phase === "pull" ? { ...current, phase: "match" } : current));
    }, pullDelay);
  };

  const selectArcadeSource = (choice: ArcadeChoice) => {
    setMissingInfoPull((current) => {
      if (!current || current.phase === "submitting" || current.phase === "printed") return current;
      return {
        ...current,
        phase: choice.correct ? "ask" : "match",
        selectedSourceId: choice.id,
        sourceFeedback: choice.feedback,
      };
    });
  };

  const selectArcadeAsk = (choice: ArcadeChoice) => {
    setMissingInfoPull((current) => {
      if (!current || current.phase === "submitting" || current.phase === "printed") return current;
      const score = scoreDispatchArcadeRun(current.run, current.selectedSourceId, choice.id, Date.now() - current.startedAt);
      return {
        ...current,
        phase: choice.correct ? "lock" : "ask",
        selectedAskId: choice.id,
        askFeedback: choice.feedback,
        score,
      };
    });
  };

  const lockArcadeTicket = () => {
    const current = missingInfoPull;
    if (!current || current.phase !== "lock" || !current.selectedSourceId || !current.selectedAskId) return;

    const requestId = current.requestId;
    const score = current.score ?? scoreDispatchArcadeRun(current.run, current.selectedSourceId, current.selectedAskId, Date.now() - current.startedAt);
    setMissingInfoPull((existing) => (existing?.requestId === requestId ? { ...existing, phase: "submitting", score } : existing));
    mutation
      .mutateAsync({ type: "follow", id: current.incidentId })
      .then(() => {
        setMissingInfoPull((existing) => (existing?.requestId === requestId ? { ...existing, phase: "printed", score } : existing));
      })
      .catch(() => {
        setMissingInfoPull((existing) => (existing?.requestId === requestId ? { ...existing, phase: "failed", score } : existing));
      });
  };

  const addManualReport = (text: string) => {
    const now = new Date().toISOString();
    const domain = careDomainFromLocalReport(text);
    const id = `manual-${Date.now()}`;
    setManualReports((current) => [
      {
        id,
        signal_id: id,
        source: "local_intake",
        text,
        location_hint: activeLocationPack.location.display,
        processed: false,
        status: "raw",
        created_at: now,
        severity: "medium",
        sourceLabel: "Local intake",
        timeLabel: formatTime(now),
        headline: reportHeadlineForLocalIntake(text),
        locationLabel: activeLocationPack.location.display,
        stateLabel: "New",
        careDomain: domain,
        careLabel: careLabel(domain),
        tags: ["local intake", careLabel(domain).toLowerCase(), "needs review"],
      },
      ...current,
    ]);
  };

  const showReviewerLaunch = false;

  return (
    <div className="relay-cds-shell flex h-screen min-h-screen flex-col overflow-hidden bg-[#eef3f8] p-2 text-[#0a1b3d] sm:p-3">
      <CommandBar
        snapshot={snapshot}
        counts={counts}
        selectedId={selectedTask?.incident_id ?? null}
        loading={mutation.isPending || guidedStarting}
        showActions={!showReviewerLaunch}
        onRun={run}
      />
      <PublicContextStrip packLabel={activeLocationPack.location.display} contextLine={locationContextLine(activeLocationPack)} items={visibleContextItems} />
      <ActivationSignalStrip context={liveContext} loading={liveContextLoading} />
      <WorkspaceJumpBar reports={counts.reports} items={tasks.length} open={counts.missingFields} />

      {snapshotQuery.error ? (
        <div className="mt-3">
          <Banner variant="error" startIcon="warning" showDismiss={false} title="Workspace unavailable">
            {snapshotQuery.error instanceof Error ? snapshotQuery.error.message : "The API snapshot could not be loaded."}
          </Banner>
        </div>
      ) : null}

      {showReviewerLaunch ? (
        <ReviewerLaunch loading={guidedStarting || mutation.isPending} onStart={startGuidedReview} />
      ) : (
        <main
          data-testid="care-continuity-workspace"
          className="relay-workspace mt-2 grid min-h-0 flex-1 grid-cols-1 overflow-auto min-[1120px]:grid-cols-[300px_minmax(560px,1fr)_380px]"
        >
          <div id="relay-reports" className="relay-workspace-col order-2 min-w-0 scroll-mt-24 min-[1120px]:order-1">
            <IncomingReports reports={visibleReports} allReports={reports} filter={filter} onFilterChange={setFilter} onAddReport={addManualReport} loading={snapshotQuery.isLoading} />
          </div>
          <div id="relay-ledger" className="relay-workspace-col relay-workspace-col--primary order-1 min-w-0 scroll-mt-24 min-[1120px]:order-2">
            <CareContinuityLedger tasks={tasks} selectedId={selectedTask?.incident_id ?? null} onSelect={setSelectedId} loading={snapshotQuery.isLoading} />
          </div>
          <div id="relay-review" className="relay-workspace-col order-3 min-w-0 scroll-mt-24">
            <ContinuityReview
              incident={reviewIncident}
              selectedTask={selectedTask}
              receipt={receipt}
              blockedAction={blockedAction}
              mutationPending={mutation.isPending}
              mutationType={mutation.variables?.type}
              missingInfoPull={missingInfoPull}
              onRun={run}
              onRequestMissingInfo={requestMissingInfo}
              onSelectArcadeSource={selectArcadeSource}
              onSelectArcadeAsk={selectArcadeAsk}
              onLockArcadeTicket={lockArcadeTicket}
            />
          </div>
        </main>
      )}
    </div>
  );
}

function ActivationSignalStrip({ context, loading }: { context: LiveContextSignal; loading: boolean }) {
  const primaryAlert = context.alerts[0];
  return (
    <section className="relay-context-strip relay-live-strip mt-1 grid shrink-0 gap-1 px-3 py-2 min-[960px]:mt-2 min-[960px]:grid-cols-[220px_minmax(0,1fr)_260px] min-[960px]:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <CdsTag tone={context.status === "live" ? "green" : "yellow"}>{context.status === "live" ? "Live context" : "Context fallback"}</CdsTag>
        <p className="truncate text-sm font-semibold text-[#0a1b3d]">{context.location}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[#0a1b3d]">
          {loading ? "Checking public alerts..." : primaryAlert ? primaryAlert.headline : context.contextNotes[0]?.body}
        </p>
        <p className="mt-0.5 hidden truncate text-xs font-medium text-[#536579] min-[520px]:block">
          {context.sourceLabel}. Public context only; source reports still drive the ledger.
        </p>
      </div>
      <div className="hidden min-w-0 grid-cols-2 gap-2 min-[520px]:flex min-[520px]:items-center min-[520px]:justify-start min-[960px]:justify-end">
        <CdsTag tone={context.alerts.length ? "yellow" : "gray"}>{context.alerts.length} NWS alerts</CdsTag>
        <a href="/proof" className="grid min-h-11 place-items-center rounded-lg border border-[#d7dee9] bg-white px-3 py-2 text-center text-xs font-semibold text-[#0a1b3d] hover:border-[#1652f0] min-[960px]:min-h-9">
          Share proof brief
        </a>
      </div>
    </section>
  );
}

function careDomainFromLocalReport(text: string): CareDomain {
  const lower = text.toLowerCase();
  if (lower.includes("oxygen") || lower.includes("battery") || lower.includes("generator") || lower.includes("power")) return "oxygen_power";
  if (lower.includes("formula") || lower.includes("diaper") || lower.includes("infant") || lower.includes("newborn")) return "infant_supply";
  if (lower.includes("wheelchair") || lower.includes("transport") || lower.includes("bus") || lower.includes("ride")) return "mobility_transport";
  if (lower.includes("smoke") || lower.includes("road") || lower.includes("blocked") || lower.includes("sparking") || lower.includes("wire")) return "hazard_access";
  if (lower.includes("rumor") || lower.includes("announcement") || lower.includes("spanish") || lower.includes("update")) return "public_information";
  if (lower.includes("volunteer") || lower.includes("driver") || lower.includes("available")) return "volunteer_capacity";
  if (lower.includes("medication") || lower.includes("medicine") || lower.includes("pharmacy") || lower.includes("insulin")) return "medication";
  return "shelter_comfort";
}

function reportHeadlineForLocalIntake(text: string) {
  const trimmed = text.trim();
  if (/^(source report|intake report|volunteer report|shelter report|radio report)/i.test(trimmed)) return trimmed;
  return `Local source report: ${trimmed}`;
}

function continuityTaskToIncident(task: ContinuityTask): Incident {
  const missingByDomain: Record<CareDomain, string[]> = {
    medication: ["recipient identity", "pickup location", "authorized pickup contact"],
    oxygen_power: ["battery status", "backup power source", "safe contact route"],
    infant_supply: ["formula type", "drop-off contact"],
    mobility_transport: ["pickup constraints", "accessible vehicle availability"],
    hazard_access: ["exact location", "safe approach route", "second source report"],
    public_information: ["verified source", "message owner"],
    volunteer_capacity: ["contact method", "availability window", "credential check"],
    shelter_comfort: ["quantity needed", "drop-off point"],
  };
  const fallbackMissing = task.requiredFields.length > 0 ? task.requiredFields : task.missing_information_count > 0 ? missingByDomain[task.careDomain] : [];

  return {
    id: task.incident_id,
    incident_id: task.incident_id,
    incident_type: task.incident_type,
    summary: task.summary,
    urgency: task.urgency,
    confidence: 0,
    location: { raw: "Community Center", normalized: "Community Center" },
    affected_groups: [],
    missing_information: fallbackMissing,
    recommended_next_action: { action_type: "request_verification", description: "Request missing information before handoff." },
    safety_notes: task.unsafeClaims.length > 0 ? ["Unsafe health or routing claim is held for reviewer action."] : ["Keep handoff unavailable until required fields are complete."],
    care_domain: task.careDomain,
    required_fields: fallbackMissing,
    unsafe_claims: task.unsafeClaims.map((claim) => claim.claim),
    source_assertions: task.sourceAssertions,
    conflicts: task.conflicts,
    handoff_status: task.handoffStatus === "Unavailable" ? "blocked_missing_info" : task.handoffStatus === "Sent" ? "sent" : null,
    state: task.state,
    lane: task.lane,
    evidence: [],
    audit: [],
    notes: [],
    follow_tasks: [],
  };
}

function CommandBar({
  snapshot,
  counts,
  selectedId,
  loading,
  showActions = true,
  onRun,
}: {
  snapshot?: Snapshot;
  counts: ReturnType<typeof continuityCounts>;
  selectedId: string | null;
  loading: boolean;
  showActions?: boolean;
  onRun: (type: CommandAction, id?: string) => void;
}) {
  const activePack = locationPackFromSnapshot(snapshot);
  return (
    <header className="relay-commandbar shrink-0 px-3 py-2">
      <div className="grid min-h-[58px] gap-3 min-[1120px]:grid-cols-[330px_minmax(380px,1fr)_auto] min-[1120px]:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <img src={relayTokens.assets.logo} alt="" className="size-9 rounded-[3px]" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <h1 className="text-xl font-semibold tracking-tight">RELAY</h1>
              <span className="truncate text-xs font-semibold uppercase text-[#536579]">Care continuity desk</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-[#536579]">Evacuation shelter reports, source links, and blocked handoff review.</p>
          </div>
        </div>

        <div className="thin-scroll grid min-w-0 grid-cols-2 gap-x-3 gap-y-1 min-[760px]:flex min-[760px]:items-center min-[760px]:overflow-x-auto">
          <Meta label="Location" value={snapshot?.app.location_label ?? activePack.location.display} />
          <Meta className="hidden min-[760px]:flex" label="Pack" value={activePack.short_label} />
          <Meta className="hidden min-[520px]:flex" label="Mode" value={snapshot?.app.model_mode === "ollama" ? "Local Gemma" : "Replay"} />
          <Meta label="Reports" value={String(counts.reports)} />
          <Meta label="Open" value={String(counts.missingFields)} warn={counts.missingFields > 0} />
        </div>

        {showActions ? (
          <div className="grid w-full shrink-0 gap-2 min-[1120px]:w-auto min-[1120px]:justify-end">
            <label className="grid min-w-0 gap-1 border border-[#d7dee9] bg-[#f8fafc] px-2 py-1.5 text-xs font-semibold text-[#536579] min-[760px]:grid-cols-[auto_minmax(190px,1fr)] min-[760px]:items-center">
              <span>Location pack</span>
              <select
                value={activePack.id}
                disabled={loading}
                onChange={(event) => onRun("activate_location", event.target.value)}
                className="min-h-10 w-full min-w-0 rounded-[3px] border border-[#d7dee9] bg-white px-2 py-1.5 text-xs font-semibold text-[#0a1b3d] outline-none focus:border-[#1652f0] focus:ring-2 focus:ring-[#1652f0]/20 min-[760px]:min-h-0"
                aria-label="Activate location"
              >
                {locationPacks.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.location.display} - {pack.short_label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 min-[760px]:grid-cols-4 min-[1120px]:flex min-[1120px]:items-center min-[1120px]:justify-end">
              <a
                href="/proof"
                className="grid min-h-11 place-items-center rounded-lg border border-[#d7dee9] bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-[#0a1b3d] transition hover:border-[#1652f0] focus:outline-none focus:ring-2 focus:ring-[#1652f0]/30 min-[1120px]:min-h-10 min-[1120px]:whitespace-nowrap"
              >
                Proof ledger
              </a>
              <CommandActionButton disabled={loading} onClick={() => onRun("load")}>
                Load reports
              </CommandActionButton>
              <CommandActionButton primary loading={loading} disabled={loading} onClick={() => onRun("triage")}>
                Group reports
              </CommandActionButton>
              <CommandActionButton disabled={loading || !selectedId} onClick={() => selectedId && onRun("follow", selectedId)}>
                Check missing info
              </CommandActionButton>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-start min-[1120px]:justify-end">
            <span className="rounded-lg border border-[#d7dee9] bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#536579]">
              No live handoff connection
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function PublicContextStrip({
  packLabel,
  contextLine,
  items,
}: {
  packLabel: string;
  contextLine: string;
  items: Array<PublicContextItem | { source: string; label: string; body: string; context_only: boolean }>;
}) {
  const primary = items[0];
  const headline = "headline" in primary ? primary.headline : primary.label;
  return (
    <section className="relay-context-strip mt-2 hidden shrink-0 flex-col gap-2 px-3 py-2 min-[760px]:flex min-[960px]:flex-row min-[960px]:items-center">
      <div className="grid min-w-0 flex-1 gap-1 min-[620px]:flex min-[620px]:items-center min-[620px]:gap-2">
        <CdsTag tone="gray">Local context</CdsTag>
        <p className="min-w-0 truncate text-sm font-medium text-[#0a1b3d]">{packLabel}: {headline}</p>
        <p className="hidden truncate text-sm text-[#536579] min-[1280px]:block">{primary.body}</p>
      </div>
      <p className="min-w-0 text-xs font-semibold leading-5 text-[#536579] min-[960px]:shrink-0">{contextLine}. Context only. Source reports still require review.</p>
    </section>
  );
}

function ReviewerLaunch({ loading, onStart }: { loading: boolean; onStart: () => void }) {
  const domains: CareDomain[] = ["medication", "oxygen_power", "infant_supply", "mobility_transport", "hazard_access", "public_information"];
  const ledgerPreview = [
    { item: "Medication continuity", fields: "recipient identity, pickup location", state: "handoff unavailable" },
    { item: "Power-dependent care", fields: "battery status, safe contact route", state: "missing fields" },
    { item: "Unsafe insulin request", fields: "held for reviewer decision", state: "unsafe claim suppressed" },
  ];
  const checklist = [
    "Load local wildfire shelter reports.",
    "Group related source reports into the review ledger.",
    "Open medication pickup with missing fields visible.",
    "Keep handoff unavailable until the ledger is complete.",
  ];

  return (
    <main data-testid="care-continuity-onboarding" className="thin-scroll mt-3 min-h-0 flex-1 overflow-auto">
      <section className="grid gap-3 min-[1180px]:grid-cols-[minmax(0,1fr)_390px]">
        <div className="relay-panel overflow-hidden">
          <div className="grid gap-0 min-[960px]:grid-cols-[minmax(0,1fr)_330px]">
            <div className="p-5 min-[1180px]:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <CdsTag tone="blue">Review workspace</CdsTag>
                <CdsTag tone="gray">Replay scenario</CdsTag>
              </div>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-[#0a1b3d] min-[1180px]:text-4xl">
                Start with the review ledger, not a blank board.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#536579]">
                RELAY groups messy shelter reports into care-continuity items, shows missing fields, and keeps handoff unavailable while unsafe claims or required details still need review.
              </p>

              <div className="mt-5 grid gap-2 rounded-xl border border-[#d7dee9] bg-[#f8fafc] p-3">
                <div className="grid grid-cols-[1.1fr_1.2fr_0.9fr] gap-3 border-b border-[#d7dee9] pb-2 text-[11px] font-semibold uppercase text-[#536579]">
                  <span>Review ledger</span>
                  <span>Open work</span>
                  <span>Status</span>
                </div>
                {ledgerPreview.map((row) => (
                  <div key={row.item} className="grid grid-cols-[1.1fr_1.2fr_0.9fr] gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-[inset_0_0_0_1px_#d7dee9]">
                    <span className="font-semibold text-[#0a1b3d]">{row.item}</span>
                    <span className="text-[#536579]">{row.fields}</span>
                    <span className="font-semibold text-[#9a6700]">{row.state}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 min-[720px]:flex-row min-[720px]:items-center">
                <Button variant="primary" loading={loading} onClick={onStart}>
                  Load reports
                </Button>
                <p className="text-sm leading-6 text-[#536579]">
                  Loads replay reports, groups them, and opens the medication pickup review sheet.
                </p>
              </div>
            </div>

            <div className="border-t border-[#d7dee9] bg-[#f8fafc] p-4 min-[960px]:border-l min-[960px]:border-t-0">
              <h3 className="text-sm font-semibold uppercase text-[#536579]">Guided review checklist</h3>
              <div className="mt-3 grid gap-2">
                {checklist.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-[#d7dee9] bg-white px-3 py-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#e8f0ff] text-xs font-semibold text-[#1652f0]">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-5 text-[#0a1b3d]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="relay-panel p-4">
          <h3 className="text-sm font-semibold uppercase text-[#536579]">Safety boundary</h3>
          <p className="mt-2 text-sm leading-6 text-[#0a1b3d]">
            RELAY organizes reports for review. It does not give medical advice, verify public context as source evidence, or connect to live responder routing.
          </p>
          <div className="mt-4 grid gap-2">
            <BoundaryRow label="Unsafe claim suppressed" value="Dosing and unsupported health claims stay out of instructions." tone="red" />
            <BoundaryRow label="Handoff unavailable" value="Required fields keep the item held for review." tone="yellow" />
            <BoundaryRow label="Review ledger" value="Every item keeps source reports, fields, and receipts together." tone="blue" />
          </div>
        </aside>
      </section>

      <section className="mt-3 grid gap-3 min-[1180px]:grid-cols-[minmax(0,1fr)_390px]">
        <div className="relay-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase text-[#536579]">Care domains</h3>
            <CdsTag tone="gray">Wildfire shelter replay</CdsTag>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 min-[760px]:grid-cols-3 min-[1180px]:grid-cols-6">
            {domains.map((domain) => (
              <div key={domain} className="rounded-xl border border-[#d7dee9] bg-[#f8fafc] p-3">
                <img src={relayTokens.careDomainIcons[domain]} alt="" className="size-9 rounded-lg" />
                <p className="mt-2 text-sm font-semibold text-[#0a1b3d]">{careLabel(domain)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relay-panel p-4">
          <h3 className="text-sm font-semibold uppercase text-[#536579]">Technical proof</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="Read model" value="snapshot" />
            <Metric label="Demo mode" value="replay" tone="green" />
            <Metric label="Schema checks" value="on" tone="green" />
            <Metric label="Receipts" value="audit" />
          </div>
        </div>
      </section>
    </main>
  );
}

function BoundaryRow({ label, value, tone }: { label: string; value: string; tone: "blue" | "yellow" | "red" }) {
  return (
    <div className="rounded-lg border border-[#d7dee9] bg-[#f8fafc] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0a1b3d]">{label}</p>
        <CdsTag tone={tone}>{tone === "red" ? "held" : tone === "yellow" ? "blocked" : "logged"}</CdsTag>
      </div>
      <p className="mt-1 text-xs leading-5 text-[#536579]">{value}</p>
    </div>
  );
}

function WorkspacePanelHeader({ title, description, end }: { title: string; description: string; end?: React.ReactNode }) {
  return (
    <div className="relay-section-band grid gap-2 px-4 py-3 min-[520px]:grid-cols-[minmax(0,1fr)_auto] min-[520px]:items-start">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-[#0a1b3d]">{title}</h2>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#536579]">{description}</p>
      </div>
      {end ? <div className="flex min-[520px]:justify-end">{end}</div> : null}
    </div>
  );
}

function IncomingReports({
  reports,
  allReports,
  filter,
  onFilterChange,
  onAddReport,
  loading,
}: {
  reports: SourceReport[];
  allReports: SourceReport[];
  filter: ReportFilter;
  onFilterChange: (filter: ReportFilter) => void;
  onAddReport: (text: string) => void;
  loading: boolean;
}) {
  const unsafe = allReports.filter((report) => report.stateLabel === "Unsafe claim").length;
  const missing = allReports.filter((report) => report.stateLabel === "Missing info").length;

  return (
    <aside className="flex min-h-[420px] min-w-0 flex-col overflow-hidden bg-white min-[1120px]:min-h-[520px]">
      <WorkspacePanelHeader
        title="Incoming Reports"
        description="Source reports grouped by care need and source. Conflicts stay visible."
        end={<CdsTag tone="gray">{allReports.length} reports</CdsTag>}
      />
      <div className="grid grid-cols-2 gap-2 border-b border-[#d7dee9] px-3 py-2">
        <Metric label="Missing info" value={String(missing)} tone={missing ? "yellow" : "green"} />
        <Metric label="Unsafe claims" value={String(unsafe)} tone={unsafe ? "red" : "green"} />
      </div>
      <div className="border-b border-[#d7dee9] px-3 py-2">
        <div className="thin-scroll flex gap-1.5 overflow-x-auto pb-0.5">
          {reportFilters.map((item) => (
            <button
              key={item}
              data-testid={`source-filter-${item.toLowerCase().replaceAll(" ", "-")}`}
              aria-pressed={filter === item}
              onClick={() => onFilterChange(item)}
              className={`min-h-11 min-w-11 shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1652f0]/30 min-[520px]:min-h-0 min-[520px]:px-2 min-[520px]:py-1 ${
                filter === item ? "border-[#1652f0] bg-[#1652f0] text-white" : "border-[#d7dee9] bg-white text-[#536579] hover:border-[#1652f0]/50 hover:text-[#0a1b3d]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <LocalReportIntake onAddReport={onAddReport} />

      <div className="thin-scroll min-h-0 flex-1 overflow-auto">
        {loading ? <LoadingState label="Loading source reports" /> : null}
        {!loading && reports.length === 0 ? <EmptyState title="No reports match this filter" body="Try All or Missing info to return to the active review set." /> : null}
        {!loading && reports.length > 0 ? (
          <>
            <div className="hidden min-[1120px]:block">
              <Table compact tableLayout="fixed" aria-label="Incoming reports table" className="w-full">
                <TableHeader sticky>
                  <TableRow>
                    <TableCell as="th" title="Report" width="70%" />
                    <TableCell as="th" title="State" width="30%" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <ReportTitle report={report} />
                      </TableCell>
                      <TableCell>
                        <CdsTag tone={report.stateLabel === "Unsafe claim" ? "red" : report.stateLabel === "Missing info" ? "yellow" : "gray"}>{report.stateLabel}</CdsTag>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="min-[1120px]:hidden">
              {reports.map((report) => (
                <ReportCell key={report.id} report={report} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}

function LocalReportIntake({ onAddReport }: { onAddReport: (text: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="border-b border-[#d7dee9] bg-[#f8fafc] px-3 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        const text = value.trim();
        if (!text) return;
        onAddReport(text);
        setValue("");
      }}
    >
      <label htmlFor="local-source-report" className="text-xs font-semibold uppercase tracking-[0.02em] text-[#536579]">
        Add local source report
      </label>
      <div className="mt-2 flex min-w-0 gap-2">
        <input
          id="local-source-report"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Add report note"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#d7dee9] bg-white px-3 py-2 text-sm text-[#0a1b3d] outline-none transition placeholder:text-[#7b8797] focus:border-[#1652f0] focus:ring-2 focus:ring-[#1652f0]/20"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-lg border border-[#1652f0] bg-[#1652f0] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0f45d8] focus:outline-none focus:ring-2 focus:ring-[#1652f0]/30 disabled:border-[#b8c2d2] disabled:bg-[#d7dee9] disabled:text-[#536579]"
          disabled={!value.trim()}
        >
          Add
        </button>
      </div>
      <p className="mt-1 hidden text-xs leading-5 text-[#536579] min-[520px]:block">Added reports stay unverified until grouping and required-field review run.</p>
    </form>
  );
}

function ReportTitle({ report }: { report: SourceReport }) {
  return (
    <div className="min-w-0 py-1">
      <div className="mb-1 flex items-center gap-2">
        <SeverityTag urgency={report.severity} />
        <span className="truncate text-xs font-medium text-[#536579]">{`${report.sourceLabel} - ${report.timeLabel}`}</span>
      </div>
      <p className="line-clamp-3 text-sm font-semibold leading-5 text-[#0a1b3d]">{report.headline}</p>
      <p className="mt-1 truncate text-xs text-[#536579]">{report.locationLabel} / {report.tags.join(", ")}</p>
    </div>
  );
}

function ReportCell({ report }: { report: SourceReport }) {
  return (
    <div className="border-b border-[#d7dee9] px-1">
      <ListCell
        spacingVariant="condensed"
        titleNode={<ReportTitle report={report} />}
        end={<CdsTag tone={report.stateLabel === "Unsafe claim" ? "red" : report.stateLabel === "Missing info" ? "yellow" : "gray"}>{report.stateLabel}</CdsTag>}
      />
    </div>
  );
}

function CareContinuityLedger({
  tasks,
  selectedId,
  onSelect,
  loading,
}: {
  tasks: ContinuityTask[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const missing = tasks.filter((task) => task.handoffStatus === "Unavailable").length;
  const unsafe = tasks.reduce((sum, task) => sum + task.unsafeClaims.length, 0);

  return (
    <section className="flex min-h-[390px] min-w-0 flex-col overflow-hidden bg-white min-[1120px]:min-h-[520px]">
      <div className="relay-section-band grid gap-2 px-3 py-2 min-[620px]:grid-cols-[minmax(0,1fr)_auto] min-[620px]:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-[#0a1b3d]">Continuity Ledger</h3>
            <CdsTag tone="blue">{tasks.length} items</CdsTag>
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-[#536579]">Grouped work stays unavailable until fields and unsafe claims are cleared.</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#d7dee9] rounded-md border border-[#d7dee9] bg-white">
          <LedgerStat label="fields" value={String(missing)} tone={missing ? "yellow" : "green"} />
          <LedgerStat label="claims" value={String(unsafe)} tone={unsafe ? "red" : "green"} />
          <LedgerStat label="ready" value={String(tasks.filter((task) => task.handoffStatus === "Ready for review").length)} tone="green" />
        </div>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-auto bg-white">
        {loading ? <LoadingState label="Loading continuity ledger" /> : null}
        {!loading && tasks.length === 0 ? <LedgerLaunch /> : null}
        {!loading && tasks.length > 0 ? (
          <div className="grid">
            <div className="sticky top-0 z-10 hidden grid-cols-[40px_minmax(0,1.25fr)_minmax(190px,0.85fr)_130px] gap-2 border-b border-[#d7dee9] bg-[#f8fafc] px-3 py-1.5 text-[10px] font-semibold uppercase text-[#657386] min-[760px]:grid">
              <span />
              <span>Continuity item</span>
              <span>Evidence</span>
              <span>State</span>
            </div>
            {tasks.map((task) => (
              <ContinuityLedgerRow key={task.incident_id} task={task} selected={selectedId === task.incident_id} onSelect={() => onSelect(task.incident_id)} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ContinuityLedgerRow({ task, selected, onSelect }: { task: ContinuityTask; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      data-testid={`continuity-task-${task.incident_id}`}
      aria-pressed={selected}
      onClick={onSelect}
      className={`relay-ledger-row grid w-full min-w-0 grid-cols-[34px_1fr] gap-2 overflow-hidden px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#1652f0]/30 min-[760px]:grid-cols-[40px_minmax(0,1.25fr)_minmax(190px,0.85fr)_130px] ${
        selected ? "relay-ledger-row-selected" : ""
      }`}
    >
      <img src={relayTokens.careDomainIcons[task.careDomain]} alt="" className="size-8 rounded-md" />
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <h2 className="min-w-0 truncate text-base font-semibold text-[#0a1b3d]">{task.title}</h2>
          <SeverityTag urgency={task.urgency} />
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#536579] min-[1120px]:line-clamp-1">{task.summary}</p>
        <div className="mt-1.5 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-[#536579] min-[760px]:hidden">
          <TaskFact label="Source reports" value={task.sourceLinkLabel} />
          <TaskFact label="Missing fields" value={task.missingLabel} warn={task.missing_information_count > 0} />
          <TaskFact label="Review queue" value={task.candidateQueue} />
          <TaskFact label="Reported timing" value={task.reportedDeadline} />
        </div>
        {task.unsafeClaims.length > 0 ? <p className="mt-1.5 text-xs font-semibold text-[#c0352b] min-[760px]:hidden">{task.unsafeClaims.length} unsafe claim held</p> : null}
      </div>
      <div className="hidden min-w-0 flex-col gap-1 text-xs text-[#536579] min-[760px]:flex">
        <TaskFact label="Sources" value={task.sourceLinkLabel} />
        <TaskFact label="Fields" value={task.missingLabel} warn={task.missing_information_count > 0} />
        <TaskFact label="Queue" value={task.candidateQueue} />
        <TaskFact label="Timing" value={task.reportedDeadline} />
      </div>
      <div className="hidden min-w-0 flex-col items-start gap-1.5 min-[760px]:flex">
        <CdsTag tone={task.stateLabel.includes("Unsafe") ? "red" : task.handoffStatus === "Unavailable" ? "yellow" : "green"}>{task.stateLabel}</CdsTag>
        <span className={`truncate text-xs font-semibold ${task.handoffStatus === "Unavailable" ? "text-[#9a6700]" : "text-[#247a4d]"}`}>{task.handoffStatus}</span>
        {task.unsafeClaims.length > 0 ? <span className="truncate text-xs font-semibold text-[#c0352b]">{task.unsafeClaims.length} unsafe claim</span> : null}
      </div>
    </button>
  );
}

function ContinuityReview({
  incident,
  selectedTask,
  receipt,
  blockedAction,
  mutationPending,
  mutationType,
  missingInfoPull,
  onRun,
  onRequestMissingInfo,
  onSelectArcadeSource,
  onSelectArcadeAsk,
  onLockArcadeTicket,
}: {
  incident: Incident | null;
  selectedTask: ContinuityTask | null;
  receipt: OperationReceipt | null;
  blockedAction: { title: string; reason: string; nextStep?: string } | null;
  mutationPending: boolean;
  mutationType?: string;
  missingInfoPull: MissingInfoPullState | null;
  onRun: (type: CommandAction, id?: string) => void;
  onRequestMissingInfo: (incident: Incident) => void;
  onSelectArcadeSource: (choice: ArcadeChoice) => void;
  onSelectArcadeAsk: (choice: ArcadeChoice) => void;
  onLockArcadeTicket: () => void;
}) {
  return (
    <aside className="flex min-h-[420px] min-w-0 flex-col overflow-hidden bg-[#fbfcfe] min-[1120px]:min-h-[520px]">
      <WorkspacePanelHeader
        title="Continuity Review"
        description="Decision dock for the selected ledger item."
        end={<CdsTag tone={incident && incident.missing_information.length === 0 ? "green" : "yellow"}>{incident && incident.missing_information.length === 0 ? "Fields complete" : "Not ready"}</CdsTag>}
      />

      <div className="thin-scroll min-h-0 flex-1 overflow-auto p-2.5">
        {!selectedTask && !incident ? <EmptyState title="No continuity item selected" body="Load reports, group them, then select a ledger item for review." /> : null}
        {selectedTask && !incident ? <LoadingState label="Loading selected continuity item" /> : null}
        {incident && selectedTask ? (
          <div className="grid gap-3">
            <ReviewHeader incident={incident} task={selectedTask} />
            <HandoffPanel
              incident={incident}
              selectedTask={selectedTask}
              pending={mutationPending}
              pendingType={mutationType}
              missingInfoPull={missingInfoPull?.incidentId === incident.id ? missingInfoPull : null}
              onRun={onRun}
              onRequestMissingInfo={onRequestMissingInfo}
              onSelectArcadeSource={onSelectArcadeSource}
              onSelectArcadeAsk={onSelectArcadeAsk}
              onLockArcadeTicket={onLockArcadeTicket}
            />
            <UnsafeClaimPanel task={selectedTask} />
            <MissingFieldLedger incident={incident} />
            {blockedAction ? (
              <Banner variant="warning" startIcon="warning" showDismiss={false} title={blockedAction.title}>
                {blockedAction.reason}
                {blockedAction.nextStep ? ` Required next step: ${blockedAction.nextStep}` : ""}
              </Banner>
            ) : null}
            <SourceReportStack incident={incident} />
            {receipt ? <OperationReceiptPanel receipt={receipt} /> : null}
            <AuditReceipt incident={incident} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function ReviewHeader({ incident, task }: { incident: Incident; task: ContinuityTask }) {
  const missingCount = incident.missing_information.length;
  return (
    <section className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityTag urgency={incident.urgency} />
            <CdsTag tone={task.handoffStatus === "Unavailable" ? "yellow" : "green"}>{task.handoffStatus}</CdsTag>
          </div>
          <h2 className="mt-2 break-words text-xl font-semibold tracking-tight text-[#0a1b3d] min-[420px]:text-2xl">{task.title}</h2>
          <p className="mt-1 break-words text-sm leading-6 text-[#536579]">{reportGroundedIncident(incident.summary)}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 divide-x divide-[#d7dee9] rounded-md border border-[#d7dee9] bg-white">
        <LedgerStat label="area" value={careLabel(task.careDomain)} />
        <LedgerStat label="links" value={String(incident.evidence.length)} />
        <LedgerStat label="open" value={String(missingCount)} tone={missingCount > 0 ? "yellow" : "green"} />
      </div>
    </section>
  );
}

function WorkspaceJumpBar({ reports, items, open }: { reports: number; items: number; open: number }) {
  const links = [
    { href: "#relay-ledger", label: "Ledger", value: String(items) },
    { href: "#relay-reports", label: "Reports", value: String(reports) },
    { href: "#relay-review", label: "Review", value: open > 0 ? `${open} open` : "clear" },
  ];
  return (
    <nav aria-label="Workspace sections" className="relay-mobile-jump mt-1 grid shrink-0 grid-cols-3 divide-x divide-[#d7dee9] text-xs font-semibold min-[1120px]:hidden">
      {links.map((link) => (
        <a key={link.href} href={link.href} className="flex min-h-10 items-center justify-between gap-2 px-3 text-[#0a1b3d] hover:bg-[#f8fafc]">
          <span>{link.label}</span>
          <span className={link.href === "#relay-review" && open > 0 ? "text-[#9a6700]" : "text-[#536579]"}>{link.value}</span>
        </a>
      ))}
    </nav>
  );
}

function HandoffPanel({
  incident,
  selectedTask,
  pending,
  pendingType,
  missingInfoPull,
  onRun,
  onRequestMissingInfo,
  onSelectArcadeSource,
  onSelectArcadeAsk,
  onLockArcadeTicket,
}: {
  incident: Incident;
  selectedTask: ContinuityTask;
  pending: boolean;
  pendingType?: string;
  missingInfoPull: MissingInfoPullState | null;
  onRun: (type: CommandAction, id?: string) => void;
  onRequestMissingInfo: (incident: Incident) => void;
  onSelectArcadeSource: (choice: ArcadeChoice) => void;
  onSelectArcadeAsk: (choice: ArcadeChoice) => void;
  onLockArcadeTicket: () => void;
}) {
  const missing = missingItemsForDisplay(incident);
  const handoff = getActionAvailability(incident, "dispatch");
  const verify = getActionAvailability(incident, "verify");
  const follow = getActionAvailability(incident, "follow");
  const supervisor = getActionAvailability(incident, "escalate");
  const arcadeRunning = Boolean(missingInfoPull && missingInfoPull.phase !== "printed" && missingInfoPull.phase !== "failed");
  const reason = missing.length > 0
    ? `${missing.length} required field${missing.length === 1 ? "" : "s"} still open: ${missing.join(", ")}.`
    : handoff.reason?.replace(/dispatch/gi, "handoff");

  return (
    <section className="rounded-lg border border-[#cfd8e5] bg-white p-2.5">
      <div className={`rounded-md border px-3 py-3 ${handoff.enabled ? "border-[#c9d8ff] bg-[#f2f6ff]" : "border-[#f0d48a] bg-[#fff9e8]"}`}>
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 shrink-0 text-sm font-bold ${handoff.enabled ? "text-[#1652f0]" : "text-[#9a6700]"}`}>{handoff.enabled ? "i" : "!"}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#0a1b3d]">{handoff.enabled ? "Handoff review available" : "Handoff unavailable"}</h3>
            <p className="mt-1 text-sm leading-5 text-[#0a1b3d]">
              {handoff.enabled ? "Required fields are complete. A reviewer can decide whether the item is ready to send forward." : "Required review is still open."}
            </p>
          </div>
        </div>
      </div>
      {missingInfoPull ? (
        <MissingInfoPullPanel pull={missingInfoPull} onSelectSource={onSelectArcadeSource} onSelectAsk={onSelectArcadeAsk} onLockTicket={onLockArcadeTicket} />
      ) : null}
      <div className="mt-2 grid gap-2">
        <ReviewActionButton
          primary
          loading={(missingInfoPull?.phase === "pull" || missingInfoPull?.phase === "submitting") || (pending && pendingType === "follow")}
          loadingLabel={missingInfoPull?.phase === "pull" ? "Drawing run..." : "Writing receipt..."}
          disabled={!follow.enabled || arcadeRunning}
          onClick={() => onRequestMissingInfo(incident)}
        >
          Request missing info
        </ReviewActionButton>
        <div className="grid gap-2">
          <ReviewActionButton loading={pending && pendingType === "verify"} disabled={!verify.enabled} onClick={() => onRun("verify", incident.id)}>
            Record fields complete
          </ReviewActionButton>
          <ReviewActionButton loading={pending && pendingType === "escalate"} disabled={!supervisor.enabled} onClick={() => onRun("escalate", incident.id)}>
            Flag for review
          </ReviewActionButton>
        </div>
        <ReviewActionButton loading={pending && pendingType === "dispatch"} disabled={!handoff.enabled} onClick={() => onRun("dispatch", incident.id)}>
          Mark ready for handoff
        </ReviewActionButton>
        {!handoff.enabled && reason ? <p className="rounded-md bg-[#fff7db] px-3 py-2 text-xs font-semibold text-[#9a6700]">Complete required fields to enable handoff.</p> : null}
        {selectedTask.unsafeClaims.length > 0 ? <p className="rounded-md bg-[#fff1ef] px-3 py-2 text-xs font-semibold text-[#c0352b]">Unsafe claim review required before handoff.</p> : null}
      </div>
    </section>
  );
}

function MissingInfoPullPanel({
  pull,
  onSelectSource,
  onSelectAsk,
  onLockTicket,
}: {
  pull: MissingInfoPullState;
  onSelectSource: (choice: ArcadeChoice) => void;
  onSelectAsk: (choice: ArcadeChoice) => void;
  onLockTicket: () => void;
}) {
  const phaseLabel =
    pull.phase === "pull"
      ? "Drawing dispatch run"
      : pull.phase === "match"
        ? "Match source"
        : pull.phase === "ask"
          ? "Choose safe ask"
          : pull.phase === "lock"
            ? "Lock request ticket"
            : pull.phase === "submitting"
              ? "Writing audit receipt"
              : pull.phase === "failed"
                ? "Receipt not recorded"
                : "Ticket printed";
  const sourceChoice = pull.run.sourceChoices.find((choice) => choice.id === pull.selectedSourceId);
  const askChoice = pull.run.askChoices.find((choice) => choice.id === pull.selectedAskId);
  const canLock = pull.phase === "lock" && sourceChoice?.correct && askChoice?.correct;
  const finished = pull.phase === "printed" || pull.phase === "failed";

  return (
    <section data-testid="missing-info-pull" className={`relay-missing-pull mt-2 ${pull.phase === "printed" ? "relay-missing-pull--printed" : ""}`}>
      <div data-testid="dispatch-arcade" className="border-b border-[#d7dee9] px-3 py-2">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0a1b3d]">Dispatch Arcade</h3>
          <p className="mt-0.5 text-xs font-semibold text-[#536579]">{phaseLabel}</p>
        </div>
      </div>
      <div className="grid gap-2 p-2.5">
        <StageRail phase={pull.phase} />
        <div className="relay-arcade-caller">
          <SourceSignalBadge />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#536579]">{pull.run.caller.label}</p>
              <span className="rounded-[3px] bg-[#fff7df] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#8a5b00]">simulated</span>
            </div>
            <p className="mt-1 text-sm font-semibold leading-5 text-[#0a1b3d]">{pull.run.caller.line}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <SignalMeter label="pressure" value={pull.run.caller.stress} tone="amber" />
              <SignalMeter label="clarity" value={pull.run.caller.clarity} tone="blue" />
            </div>
          </div>
        </div>
        <div className="relay-reel-grid">
          <ReelColumn label="Field" value={pull.run.packet.field} options={pull.run.packet.fieldOptions} spinning={pull.phase === "pull"} />
          <ReelColumn label="Source" value={pull.run.packet.source} options={pull.run.packet.sourceOptions} spinning={pull.phase === "pull"} />
          <ReelColumn label="Ask" value={pull.run.packet.ask} options={pull.run.packet.askOptions} spinning={pull.phase === "pull"} />
        </div>
        <ArcadeChoiceSet
          title="1. Match the source"
          body="Pick the evidence this ticket can quote. Context and summaries are not enough."
          choices={pull.run.sourceChoices}
          selectedId={pull.selectedSourceId}
          feedback={pull.sourceFeedback}
          disabled={pull.phase === "pull" || pull.phase === "submitting" || finished}
          onSelect={onSelectSource}
        />
        <ArcadeChoiceSet
          title="2. Choose the ask"
          body="Use the narrowest callback phrasing. Unsafe or assumptive asks stay blocked."
          choices={pull.run.askChoices}
          selectedId={pull.selectedAskId}
          feedback={pull.askFeedback}
          disabled={!sourceChoice?.correct || pull.phase === "pull" || pull.phase === "submitting" || finished}
          onSelect={onSelectAsk}
        />
        {pull.score ? <ArcadeScorePanel score={pull.score} /> : null}
        <div data-testid="missing-info-ticket" className="rounded-[3px] border border-[#d7dee9] bg-white px-3 py-2">
          <div className="grid gap-1 min-[480px]:flex min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-3">
            <p className="text-xs font-semibold uppercase text-[#536579]">{pull.phase === "printed" ? "Request ticket" : "Ticket preview"}</p>
            <span className="text-xs font-semibold text-[#9a6700]">{pull.run.packet.source}</span>
          </div>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#0a1b3d]">{pull.run.packet.field}</p>
          <p className="mt-1 text-xs leading-5 text-[#536579]">{pull.run.packet.ticketAsk}</p>
          <p className="mt-2 border-t border-[#d7dee9] pt-2 text-xs leading-5 text-[#536579]">{pull.run.packet.sourceExcerpt}</p>
        </div>
        <button
          data-testid="arcade-lock-ticket"
          type="button"
          disabled={!canLock || pull.phase === "submitting"}
          onClick={onLockTicket}
          className={`min-h-10 rounded-[3px] border px-3 py-2 text-sm font-semibold ${
            canLock ? "border-[#2454d6] bg-[#2454d6] text-white hover:bg-[#1d45ad]" : "border-[#d2d9e3] bg-[#eef2f6] text-[#5d6878]"
          }`}
        >
          {pull.phase === "submitting" ? "Writing receipt..." : pull.phase === "printed" ? "Ticket printed" : "Lock request ticket"}
        </button>
      </div>
    </section>
  );
}

function StageRail({ phase }: { phase: MissingInfoPullPhase }) {
  const order = ["pull", "match", "ask", "lock"] as const;
  const activeIndex = phase === "submitting" || phase === "printed" || phase === "failed" ? order.length : Math.max(order.indexOf(phase as (typeof order)[number]), 0);
  return (
    <div className="relay-arcade-stages" aria-label="Dispatch arcade stages">
      {order.map((stage, index) => (
        <div key={stage} className={`relay-arcade-stage ${index < activeIndex ? "relay-arcade-stage--done" : index === activeIndex ? "relay-arcade-stage--active" : ""}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <p>{stage === "pull" ? "Pull" : stage === "match" ? "Source" : stage === "ask" ? "Ask" : "Lock"}</p>
        </div>
      ))}
    </div>
  );
}

function SourceSignalBadge() {
  return (
    <div className="relay-source-signal" aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img">
        <rect x="10" y="12" width="44" height="40" rx="3" fill="#f8fafc" stroke="#2454d6" strokeWidth="3" />
        <path d="M17 35h6l4-13 7 27 5-18h8" fill="none" stroke="#152033" strokeLinecap="square" strokeWidth="3" />
        <path d="M18 22h28M18 46h16" stroke="#8a5b00" strokeLinecap="square" strokeWidth="3" />
      </svg>
    </div>
  );
}

function SignalMeter({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#536579]">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-[2px] bg-[#d2d9e3]">
        <div className={tone === "amber" ? "h-full bg-[#8a5b00]" : "h-full bg-[#2454d6]"} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function ArcadeChoiceSet({
  title,
  body,
  choices,
  selectedId,
  feedback,
  disabled,
  onSelect,
}: {
  title: string;
  body: string;
  choices: ArcadeChoice[];
  selectedId?: string;
  feedback?: string;
  disabled: boolean;
  onSelect: (choice: ArcadeChoice) => void;
}) {
  const selected = choices.find((choice) => choice.id === selectedId);
  return (
    <section className="rounded-[3px] border border-[#d7dee9] bg-white p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0a1b3d]">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-[#536579]">{body}</p>
        </div>
        {selected ? <span className={`relay-choice-chip relay-choice-chip--${selected.tone}`}>{selected.correct ? "locked" : "retry"}</span> : null}
      </div>
      <div className="mt-2 grid gap-2">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(choice)}
            className={`relay-arcade-choice relay-arcade-choice--${choice.tone} ${selectedId === choice.id ? "relay-arcade-choice--selected" : ""}`}
          >
            <span>{choice.label}</span>
            <p>{choice.body}</p>
          </button>
        ))}
      </div>
      {feedback ? <p className={`mt-2 rounded-[3px] px-2 py-1.5 text-xs font-semibold ${selected?.correct ? "bg-[#eefaf2] text-[#16794c]" : "bg-[#fff7df] text-[#8a5b00]"}`}>{feedback}</p> : null}
    </section>
  );
}

function ArcadeScorePanel({ score }: { score: DispatchArcadeScore }) {
  return (
    <section data-testid="arcade-score" className="rounded-[3px] border border-[#d7dee9] bg-[#f8fafc] p-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0a1b3d]">Run score</h4>
        <span className="text-sm font-semibold text-[#2454d6]">{score.total}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs min-[480px]:grid-cols-4">
        <ScoreCell label="source" value={score.sourceDiscipline} />
        <ScoreCell label="safety" value={score.safety} />
        <ScoreCell label="clarity" value={score.clarity} />
        <ScoreCell label="speed" value={score.speed} />
      </div>
      <p className="mt-2 text-xs font-semibold text-[#0a1b3d]">{score.label}</p>
    </section>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[3px] border border-[#d7dee9] bg-white px-2 py-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#536579]">{label}</p>
      <p className="text-sm font-semibold text-[#0a1b3d]">{value}</p>
    </div>
  );
}

function ReelColumn({ label, value, options, spinning }: { label: string; value: string; options: string[]; spinning: boolean }) {
  const reelOptions = spinning ? [...options, ...options, value] : [value];
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#657386]">{label}</p>
      <div className={`relay-reel-window ${spinning ? "relay-reel-window--spinning" : ""}`}>
        <div className={`relay-reel-track ${spinning ? "relay-reel-track--spinning" : ""}`}>
          {reelOptions.map((option, index) => (
            <div key={`${option}-${index}`} className="relay-reel-item">
              {option}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UnsafeClaimPanel({ task }: { task: ContinuityTask }) {
  return (
    <section className="rounded-xl border border-[#d7dee9] bg-white p-3">
      <SectionTitle title="Unsafe claim review" meta={task.unsafeClaims.length ? `${task.unsafeClaims.length} held` : "none"} />
      {task.unsafeClaims.length === 0 ? <p className="mt-2 text-sm leading-6 text-[#536579]">No unsafe health or routing claims were detected in this grouped item.</p> : null}
      <div className="mt-3 grid gap-2">
        {task.unsafeClaims.map((claim) => (
          <div key={claim.id} className="rounded-lg border border-[#f4c8c3] bg-[#fff1ef] px-3 py-2">
            <p className="text-sm font-semibold text-[#0a1b3d]">{claim.claim}</p>
            <p className="mt-1 text-xs leading-5 text-[#536579]">{claim.handling}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MissingFieldLedger({ incident }: { incident: Incident }) {
  const rows = toMissingFields(incident);
  const openRows = rows.filter((row) => row.status === "Open");
  const completeRows = rows.filter((row) => row.status === "Complete");
  return (
    <section className="rounded-xl border border-[#d7dee9] bg-white p-3">
      <SectionTitle title="Required information" meta={`${openRows.length} open`} />
      <div className="mt-3 grid gap-2">
        {openRows.map((row) => (
          <MissingFieldRow key={row.id} row={row} />
        ))}
        {completeRows.length > 0 ? (
          <div className="rounded-lg border border-[#b8e7c9] bg-[#f3fbf6] px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#0a1b3d]">Completed review inputs</span>
              <CdsTag tone="green">{completeRows.length} complete</CdsTag>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#536579]">{completeRows.map((row) => row.label).join(" / ")}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SourceReportStack({ incident }: { incident: Incident }) {
  return (
    <section className="rounded-xl border border-[#d7dee9] bg-white p-3">
      <SectionTitle title="Linked source reports" meta={`${incident.evidence.length} links`} />
      <div className="mt-3 grid gap-2">
        {incident.evidence.map((item, index) => (
          <ListCell
            key={item.id}
            spacingVariant="condensed"
            title={item.quote || item.description || "Source report linked"}
            subtitle={`${String(index + 1).padStart(2, "0")} - ${item.type === "image_observation" ? "Image observation" : "Text report"}`}
            end={<CdsTag tone="gray">linked</CdsTag>}
            className="rounded-lg border border-[#d7dee9] bg-[#f8fafc]"
          />
        ))}
      </div>
    </section>
  );
}

function OperationReceiptPanel({ receipt }: { receipt: OperationReceipt }) {
  return (
    <section className={`rounded-xl border p-3 ${receipt.ok ? "border-[#b8e7c9] bg-[#eefaf2]" : "border-[#f4c8c3] bg-[#fff1ef]"}`}>
      <SectionTitle title={receipt.title} meta={formatTime(receipt.timestamp)} />
      <p className="mt-2 text-sm leading-5 text-[#0a1b3d]">{sanitizeOperationMessage(receipt.message)}</p>
      {receipt.auditEventId ? <p className="mt-2 font-mono text-xs text-[#536579]">Audit event {receipt.auditEventId}</p> : null}
      {receipt.nextStep ? <p className="mt-2 text-xs font-semibold text-[#9a6700]">Required next step: {receipt.nextStep}</p> : null}
    </section>
  );
}

function AuditReceipt({ incident }: { incident: Incident }) {
  return (
    <section className="rounded-xl border border-[#d7dee9] bg-white p-3">
      <SectionTitle title="Audit receipt" meta={`${incident.audit.length} events`} />
      <div className="mt-3 grid gap-2">
        {incident.audit.length === 0 ? <p className="text-sm text-[#536579]">No audit events recorded yet.</p> : null}
        {incident.audit.map((event) => (
          <ListCell
            key={event.id}
            spacingVariant="condensed"
            title={auditLabel(event.event_type)}
            subtitle={event.note ? sanitizeOperationMessage(event.note) : `${event.actor} - ${formatTime(event.created_at)}`}
            end={<CdsTag tone="gray">{formatTime(event.created_at)}</CdsTag>}
            className="rounded-lg border border-[#d7dee9] bg-[#f8fafc]"
          />
        ))}
      </div>
    </section>
  );
}

function LedgerLaunch() {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div>
        <img src={relayTokens.assets.supplyTiles} alt="" className="mx-auto h-24 w-32 rounded-xl object-cover" />
        <h2 className="mt-4 text-lg font-semibold">No continuity items yet</h2>
        <p className="mt-1 text-sm leading-6 text-[#536579]">Load reports, then group them into care continuity items for review.</p>
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[160px] place-items-center p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#536579]">
        <Spinner size={2} />
        <span>{label}</span>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center p-5 text-center">
      <div>
        <h3 className="text-base font-semibold text-[#0a1b3d]">{title}</h3>
        <p className="mt-1 max-w-sm text-sm leading-6 text-[#536579]">{body}</p>
      </div>
    </div>
  );
}

function MissingFieldRow({ row }: { row: ReturnType<typeof toMissingFields>[number] }) {
  const open = row.status === "Open";
  return (
    <div className={`grid gap-1 rounded-lg border px-3 py-2 ${open ? "border-[#f0d48a] bg-[#fff7db]" : "border-[#b8e7c9] bg-[#f3fbf6]"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#0a1b3d]">{row.label}</span>
        <CdsTag tone={open ? "yellow" : "green"}>{row.status}</CdsTag>
      </div>
      <p className="text-xs leading-5 text-[#536579]">
        <span className="font-semibold text-[#0a1b3d]">{row.sourceCoverage}.</span> {row.nextAction}
      </p>
    </div>
  );
}

function Metric({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "yellow" | "red" | "green" }) {
  const color = tone === "red" ? "text-[#c0352b]" : tone === "yellow" ? "text-[#9a6700]" : tone === "green" ? "text-[#247a4d]" : "text-[#1652f0]";
  return (
    <div className="min-w-0 rounded-lg border border-[#d7dee9] bg-[#f8fafc] px-3 py-2">
      <p className={`truncate text-base font-semibold leading-none ${color}`}>{value}</p>
      <p className="mt-1 truncate text-xs font-medium text-[#536579]">{label}</p>
    </div>
  );
}

function LedgerStat({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "yellow" | "red" | "green" }) {
  const color = tone === "red" ? "text-[#c0352b]" : tone === "yellow" ? "text-[#9a6700]" : tone === "green" ? "text-[#247a4d]" : "text-[#1652f0]";
  return (
    <div className="min-w-0 px-2.5 py-1.5">
      <p className={`truncate text-sm font-semibold leading-4 ${color}`}>{value}</p>
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.02em] text-[#657386]">{label}</p>
    </div>
  );
}

function TaskFact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <span className="shrink-0 truncate text-[10px] font-semibold uppercase tracking-[0.02em] text-[#7b8797]">{label}</span>
      <span className={`truncate text-xs font-semibold ${warn ? "text-[#9a6700]" : "text-[#0a1b3d]"}`}>{value}</span>
    </div>
  );
}

function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-[#0a1b3d]">{title}</h3>
      {meta ? <CdsTag tone="gray">{meta}</CdsTag> : null}
    </div>
  );
}

function SeverityTag({ urgency }: { urgency: BoardCard["urgency"] | SourceReport["severity"] }) {
  const tone = urgency === "critical" ? "red" : urgency === "high" ? "yellow" : urgency === "medium" ? "blue" : "gray";
  return <CdsTag tone={tone}>{urgency}</CdsTag>;
}

function CdsTag({ children, tone = "gray" }: { children: React.ReactNode; tone?: "blue" | "yellow" | "red" | "green" | "gray" }) {
  return (
    <Tag colorScheme={tone} emphasis="low" maxWidth="100%">
      {children}
    </Tag>
  );
}

function CommandActionButton({
  children,
  disabled,
  loading,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold leading-tight transition focus:outline-none focus:ring-2 focus:ring-[#1652f0]/30 disabled:cursor-not-allowed disabled:opacity-55 min-[1120px]:min-h-10 min-[1120px]:whitespace-nowrap ${
        primary
          ? "border-[#1652f0] bg-[#1652f0] text-white hover:bg-[#0f45d8]"
          : "border-[#d7dee9] bg-white text-[#0a1b3d] hover:border-[#1652f0]"
      }`}
    >
      {loading ? "Working..." : children}
    </button>
  );
}

function ReviewActionButton({
  children,
  disabled,
  loading,
  loadingLabel,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  primary?: boolean;
  onClick: () => void;
}) {
  const tone = disabled
    ? "border-[#c8d0dc] bg-[#eef2f6] text-[#7b8797]"
    : primary
      ? "border-[#1652f0] bg-[#1652f0] text-white hover:bg-[#0f45d8]"
      : "border-[#cfd8e5] bg-white text-[#0a1b3d] hover:border-[#1652f0]";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-10 w-full rounded-[3px] border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1652f0]/30 disabled:cursor-not-allowed ${tone}`}
    >
      {loading ? loadingLabel ?? "Working..." : children}
    </button>
  );
}

function Meta({ label, value, warn, className = "" }: { label: string; value: string; warn?: boolean; className?: string }) {
  return (
    <span className={`flex min-w-0 items-baseline gap-1 text-xs min-[760px]:shrink-0 ${className}`}>
      <span className="shrink-0 font-semibold text-[#536579]">{label}:</span>
      <span className={`min-w-0 truncate font-semibold ${warn ? "text-[#9a6700]" : "text-[#0a1b3d]"}`}>{value}</span>
    </span>
  );
}

function filterSourceReports(reports: SourceReport[], filter: ReportFilter) {
  if (filter === "Critical") return reports.filter((report) => report.severity === "critical");
  if (filter === "Missing info") return reports.filter((report) => report.stateLabel === "Missing info");
  if (filter === "Unsafe claim") return reports.filter((report) => report.stateLabel === "Unsafe claim");
  return reports;
}

function reportGroundedIncident(summary: string) {
  if (/^(report|source report|related reports)/i.test(summary)) return summary;
  return `Source reports describe: ${summary}`;
}

function auditLabel(type: string) {
  const labels: Record<string, string> = {
    model_triage: "Source report grouped",
    human_verification: "Required fields recorded",
    dispatch_created: "Handoff recorded",
    escalation_created: "Supervisor review recorded",
    state_change: "Continuity item changed",
    follow_task_created: "Missing-info request started",
    follow_task_completed: "Missing-info packet completed",
  };
  return labels[type] ?? type.replaceAll("_", " ");
}
