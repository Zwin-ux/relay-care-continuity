import argparse
import json
from pathlib import Path


def dollar_quote(value: str) -> str:
    delimiter = "$relay_payload$"
    if delimiter in value:
        delimiter = "$relay_payload_v2$"
    return f"{delimiter}{value}{delimiter}"


def build_sql(payload: dict) -> str:
    payload_json = json.dumps(payload, separators=(",", ":"))
    quoted_payload = dollar_quote(payload_json)
    return f"""do $$
declare
  payload jsonb := {quoted_payload}::jsonb;
  proof_run_id uuid;
begin
  insert into public.relay_proof_runs (
    run_slug,
    scenario_id,
    model_mode,
    gemma_model,
    source_report_count,
    continuity_item_count,
    unsafe_claim_count,
    missing_field_count,
    audit_event_count,
    eval_metrics,
    public_read,
    updated_at
  )
  select
    payload->'run'->>'run_slug',
    payload->'run'->>'scenario_id',
    payload->'run'->>'model_mode',
    payload->'run'->>'gemma_model',
    (payload->'run'->>'source_report_count')::integer,
    (payload->'run'->>'continuity_item_count')::integer,
    (payload->'run'->>'unsafe_claim_count')::integer,
    (payload->'run'->>'missing_field_count')::integer,
    (payload->'run'->>'audit_event_count')::integer,
    payload->'run'->'eval_metrics',
    coalesce((payload->'run'->>'public_read')::boolean, true),
    now()
  on conflict (run_slug) do update set
    scenario_id = excluded.scenario_id,
    model_mode = excluded.model_mode,
    gemma_model = excluded.gemma_model,
    source_report_count = excluded.source_report_count,
    continuity_item_count = excluded.continuity_item_count,
    unsafe_claim_count = excluded.unsafe_claim_count,
    missing_field_count = excluded.missing_field_count,
    audit_event_count = excluded.audit_event_count,
    eval_metrics = excluded.eval_metrics,
    public_read = excluded.public_read,
    updated_at = now()
  returning id into proof_run_id;

  delete from public.relay_proof_source_reports where run_id = proof_run_id;
  delete from public.relay_proof_continuity_items where run_id = proof_run_id;
  delete from public.relay_proof_events where run_id = proof_run_id;
  delete from public.relay_proof_eval_metrics where run_id = proof_run_id;

  insert into public.relay_proof_source_reports (
    run_id,
    source_report_id,
    source_type,
    severity,
    care_domain,
    state_label,
    headline,
    location_label,
    public_read
  )
  select
    proof_run_id,
    source_report_id,
    source_type,
    severity,
    care_domain,
    state_label,
    headline,
    location_label,
    coalesce(public_read, true)
  from jsonb_to_recordset(payload->'source_reports') as source_report(
    source_report_id text,
    source_type text,
    severity text,
    care_domain text,
    state_label text,
    headline text,
    location_label text,
    public_read boolean
  );

  insert into public.relay_proof_continuity_items (
    run_id,
    continuity_item_id,
    incident_id,
    title,
    care_domain,
    urgency,
    state_label,
    handoff_status,
    source_report_count,
    source_link_count,
    missing_fields,
    unsafe_claims,
    conflicts,
    public_read
  )
  select
    proof_run_id,
    continuity_item_id,
    incident_id,
    title,
    care_domain,
    urgency,
    state_label,
    handoff_status,
    source_report_count,
    source_link_count,
    missing_fields,
    unsafe_claims,
    conflicts,
    coalesce(public_read, true)
  from jsonb_to_recordset(payload->'continuity_items') as item(
    continuity_item_id text,
    incident_id text,
    title text,
    care_domain text,
    urgency text,
    state_label text,
    handoff_status text,
    source_report_count integer,
    source_link_count integer,
    missing_fields jsonb,
    unsafe_claims jsonb,
    conflicts jsonb,
    public_read boolean
  );

  insert into public.relay_proof_events (
    run_id,
    event_id,
    incident_id,
    event_type,
    actor,
    note_redacted,
    event_created_at,
    public_read
  )
  select
    proof_run_id,
    event_id,
    incident_id,
    event_type,
    actor,
    coalesce(note_redacted, ''),
    event_created_at::timestamptz,
    coalesce(public_read, true)
  from jsonb_to_recordset(payload->'events') as event(
    event_id text,
    incident_id text,
    event_type text,
    actor text,
    note_redacted text,
    event_created_at text,
    public_read boolean
  );

  insert into public.relay_proof_eval_metrics (
    run_id,
    metric_name,
    metric_value,
    public_read
  )
  select
    proof_run_id,
    metric_name,
    metric_value,
    coalesce(public_read, true)
  from jsonb_to_recordset(payload->'eval_metrics') as metric(
    metric_name text,
    metric_value numeric,
    public_read boolean
  );

  insert into public.relay_public_snapshots (
    run_slug,
    snapshot_json,
    public_read,
    published_at
  )
  values (
    payload->'public_snapshot'->>'run_slug',
    payload->'public_snapshot'->'snapshot_json',
    coalesce((payload->'public_snapshot'->>'public_read')::boolean, true),
    now()
  )
  on conflict (run_slug) do update set
    snapshot_json = excluded.snapshot_json,
    public_read = excluded.public_read,
    published_at = now();
end $$;
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Export a RELAY proof payload as Supabase SQL.")
    parser.add_argument("payload", help="Path to relay-proof-ledger.payload.json")
    parser.add_argument("--out", default="docs/media/gallery/relay-proof-ledger.publish.sql")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[3]
    payload_path = (root / args.payload).resolve()
    out_path = (root / args.out).resolve()
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(build_sql(payload), encoding="utf-8")
    print(out_path)


if __name__ == "__main__":
    main()
