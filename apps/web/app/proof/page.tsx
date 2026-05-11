import Link from "next/link";
import { getProofSnapshot, ProofContinuityItem } from "@/lib/proofLedger";

export const dynamic = "force-dynamic";

export default async function ProofPage() {
  const result = await getProofSnapshot();
  const proof = result.snapshot;
  const metrics = Object.entries(proof.eval_metrics);

  return (
    <main className="min-h-screen bg-[#eef3f8] p-3 text-[#0a1b3d]">
      <section className="relay-panel px-4 py-3">
        <div className="flex flex-col gap-3 min-[980px]:flex-row min-[980px]:items-center min-[980px]:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">RELAY Proof Ledger</h1>
              <span className="rounded-lg border border-[#d7dee9] bg-[#f8fafc] px-2 py-1 text-xs font-semibold text-[#536579]">
                {result.source === "supabase" ? "Supabase live" : "Proof ledger offline"}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#536579]">
              Durable submission receipt for replay/Ollama runs, source reports, continuity items, unsafe-claim holds, and audit events.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="rounded-lg border border-[#d7dee9] bg-white px-3 py-2 text-sm font-semibold text-[#0a1b3d] hover:border-[#1652f0]">
              Return to workspace
            </Link>
            <span className="rounded-lg bg-[#e8f0ff] px-3 py-2 text-sm font-semibold text-[#1652f0]">Run {proof.run_slug}</span>
          </div>
        </div>
        {result.error ? <p className="mt-3 rounded-lg border border-[#f0d48a] bg-[#fff9e8] px-3 py-2 text-sm font-semibold text-[#9a6700]">{result.error}</p> : null}
      </section>

      <section className="mt-3 grid gap-3 min-[1180px]:grid-cols-[minmax(0,1fr)_390px]">
        <div className="relay-panel p-4">
          <div className="grid gap-2 min-[760px]:grid-cols-5">
            <ProofMetric label="Source reports" value={proof.counts.source_reports} />
            <ProofMetric label="Ledger items" value={proof.counts.continuity_items} />
            <ProofMetric label="Unsafe held" value={proof.counts.unsafe_claims_held} tone="red" />
            <ProofMetric label="Missing fields" value={proof.counts.missing_fields} tone="yellow" />
            <ProofMetric label="Audit events" value={proof.counts.audit_events} />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-[#d7dee9]">
            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-[#d7dee9] bg-[#f8fafc] px-3 py-2 text-xs font-semibold uppercase text-[#536579]">
              <span>Continuity item</span>
              <span>Handoff</span>
              <span>Open work</span>
              <span>Source links</span>
            </div>
            {proof.continuity_items.map((item) => (
              <ProofItemRow key={item.continuity_item_id} item={item} />
            ))}
          </div>
        </div>

        <aside className="relay-panel p-4">
          <h2 className="text-base font-semibold">Technical receipt</h2>
          <div className="mt-3 grid gap-2">
            <ReceiptRow label="Scenario" value={proof.scenario_id} />
            <ReceiptRow label="Location" value={proof.location?.label ?? "Santa Rosa, CA"} />
            <ReceiptRow
              label="Local context"
              value={
                proof.location
                  ? `${proof.location.hazard_type} / ${proof.location.site_type} / ${proof.location.context_mode}`
                  : "wildfire / evacuation shelter / fixture"
              }
            />
            <ReceiptRow label="Mode" value={proof.model_mode} />
            <ReceiptRow label="Gemma model" value={proof.gemma_model} />
            <ReceiptRow label="Generated" value={new Date(proof.generated_at).toLocaleString()} />
          </div>
          <h3 className="mt-5 text-sm font-semibold uppercase text-[#536579]">Evaluation</h3>
          <div className="mt-2 grid gap-2">
            {metrics.length ? metrics.map(([name, value]) => <ReceiptRow key={name} label={name.replaceAll("_", " ")} value={String(value)} />) : <p className="text-sm text-[#536579]">No evaluation metrics published yet.</p>}
          </div>
          <h3 className="mt-5 text-sm font-semibold uppercase text-[#536579]">Boundaries</h3>
          <div className="mt-2 grid gap-2">
            {proof.proof_notes.map((note) => (
              <p key={note} className="rounded-lg border border-[#d7dee9] bg-[#f8fafc] px-3 py-2 text-sm leading-5 text-[#0a1b3d]">
                {note}
              </p>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function ProofItemRow({ item }: { item: ProofContinuityItem }) {
  return (
    <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-[#d7dee9] px-3 py-3 text-sm last:border-b-0">
      <div className="min-w-0">
        <p className="font-semibold text-[#0a1b3d]">{item.title}</p>
        <p className="mt-1 text-xs text-[#536579]">{item.care_label} / {item.state_label}</p>
        {item.unsafe_claims.length > 0 ? <p className="mt-1 text-xs font-semibold text-[#c0352b]">{item.unsafe_claims.join(" ")}</p> : null}
      </div>
      <span className={`font-semibold ${item.handoff_status === "Unavailable" ? "text-[#9a6700]" : "text-[#247a4d]"}`}>{item.handoff_status}</span>
      <span className="text-[#536579]">{item.missing_fields.length} fields / {item.unsafe_claims.length} held</span>
      <span className="text-[#536579]">{item.source_link_count} links</span>
    </div>
  );
}

function ProofMetric({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "yellow" | "red" }) {
  const color = tone === "red" ? "text-[#c0352b]" : tone === "yellow" ? "text-[#9a6700]" : "text-[#1652f0]";
  return (
    <div className="rounded-xl border border-[#d7dee9] bg-[#f8fafc] px-3 py-2">
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#536579]">{label}</p>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#d7dee9] bg-[#f8fafc] px-3 py-2">
      <span className="text-xs font-semibold uppercase text-[#536579]">{label}</span>
      <span className="text-right text-sm font-semibold text-[#0a1b3d]">{value}</span>
    </div>
  );
}
