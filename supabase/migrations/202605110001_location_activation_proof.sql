alter table public.relay_proof_runs
  add column if not exists location_pack_id text,
  add column if not exists location_label text,
  add column if not exists hazard_type text,
  add column if not exists site_type text,
  add column if not exists context_mode text default 'fixture';
