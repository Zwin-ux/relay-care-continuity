create extension if not exists pgcrypto;

create table if not exists public.relay_proof_runs (
  id uuid primary key default gen_random_uuid(),
  run_slug text not null unique,
  scenario_id text not null,
  model_mode text not null,
  gemma_model text,
  source_report_count integer not null default 0,
  continuity_item_count integer not null default 0,
  unsafe_claim_count integer not null default 0,
  missing_field_count integer not null default 0,
  audit_event_count integer not null default 0,
  eval_metrics jsonb not null default '{}'::jsonb,
  public_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relay_proof_source_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.relay_proof_runs(id) on delete cascade,
  source_report_id text not null,
  source_type text not null,
  severity text not null,
  care_domain text not null,
  state_label text not null,
  headline text not null,
  location_label text not null,
  public_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, source_report_id)
);

create table if not exists public.relay_proof_continuity_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.relay_proof_runs(id) on delete cascade,
  continuity_item_id text not null,
  incident_id text,
  title text not null,
  care_domain text not null,
  urgency text not null,
  state_label text not null,
  handoff_status text not null,
  source_report_count integer not null default 0,
  source_link_count integer not null default 0,
  missing_fields jsonb not null default '[]'::jsonb,
  unsafe_claims jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  public_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, continuity_item_id)
);

create table if not exists public.relay_proof_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.relay_proof_runs(id) on delete cascade,
  event_id text not null,
  incident_id text,
  event_type text not null,
  actor text not null,
  note_redacted text not null default '',
  event_created_at timestamptz,
  public_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, event_id)
);

create table if not exists public.relay_proof_eval_metrics (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.relay_proof_runs(id) on delete cascade,
  metric_name text not null,
  metric_value numeric not null,
  public_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, metric_name)
);

create table if not exists public.relay_public_snapshots (
  run_slug text primary key,
  snapshot_json jsonb not null,
  public_read boolean not null default false,
  published_at timestamptz not null default now()
);

create index if not exists relay_proof_runs_public_read_idx on public.relay_proof_runs(public_read, created_at desc);
create index if not exists relay_proof_source_reports_run_idx on public.relay_proof_source_reports(run_id);
create index if not exists relay_proof_items_run_idx on public.relay_proof_continuity_items(run_id);
create index if not exists relay_proof_events_run_idx on public.relay_proof_events(run_id);
create index if not exists relay_public_snapshots_public_idx on public.relay_public_snapshots(public_read, published_at desc);

alter table public.relay_proof_runs enable row level security;
alter table public.relay_proof_source_reports enable row level security;
alter table public.relay_proof_continuity_items enable row level security;
alter table public.relay_proof_events enable row level security;
alter table public.relay_proof_eval_metrics enable row level security;
alter table public.relay_public_snapshots enable row level security;

drop policy if exists "Public can read published proof runs" on public.relay_proof_runs;
create policy "Public can read published proof runs"
on public.relay_proof_runs
for select
to anon, authenticated
using (public_read = true);

drop policy if exists "Public can read published proof reports" on public.relay_proof_source_reports;
create policy "Public can read published proof reports"
on public.relay_proof_source_reports
for select
to anon, authenticated
using (public_read = true);

drop policy if exists "Public can read published proof items" on public.relay_proof_continuity_items;
create policy "Public can read published proof items"
on public.relay_proof_continuity_items
for select
to anon, authenticated
using (public_read = true);

drop policy if exists "Public can read published proof events" on public.relay_proof_events;
create policy "Public can read published proof events"
on public.relay_proof_events
for select
to anon, authenticated
using (public_read = true);

drop policy if exists "Public can read published proof metrics" on public.relay_proof_eval_metrics;
create policy "Public can read published proof metrics"
on public.relay_proof_eval_metrics
for select
to anon, authenticated
using (public_read = true);

drop policy if exists "Public can read published proof snapshots" on public.relay_public_snapshots;
create policy "Public can read published proof snapshots"
on public.relay_public_snapshots
for select
to anon, authenticated
using (public_read = true);

grant select on public.relay_proof_runs to anon, authenticated;
grant select on public.relay_proof_source_reports to anon, authenticated;
grant select on public.relay_proof_continuity_items to anon, authenticated;
grant select on public.relay_proof_events to anon, authenticated;
grant select on public.relay_proof_eval_metrics to anon, authenticated;
grant select on public.relay_public_snapshots to anon, authenticated;
