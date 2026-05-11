# Supabase Reference: Location Activation Proof

## Role

Supabase remains the durable proof ledger. It should not become the runtime dependency for the main workspace.

Location Activation adds metadata to the proof record so judges can see that a run was tied to a local context.

## Proof Fields

Add to run-level proof payload:

```json
{
  "location_pack_id": "wildfire_santa_rosa",
  "location_label": "Santa Rosa, CA",
  "hazard_type": "wildfire",
  "site_type": "evacuation shelter",
  "context_mode": "fixture"
}
```

Also include inside `relay_public_snapshots.snapshot_json`:

```json
{
  "location": {
    "pack_id": "wildfire_santa_rosa",
    "label": "Santa Rosa, CA",
    "hazard_type": "wildfire",
    "site_type": "evacuation shelter",
    "context_mode": "fixture"
  }
}
```

## Migration Approach

Use additive nullable columns only:

```sql
alter table public.relay_proof_runs
  add column if not exists location_pack_id text,
  add column if not exists location_label text,
  add column if not exists hazard_type text,
  add column if not exists site_type text,
  add column if not exists context_mode text default 'fixture';
```

No existing proof rows should break.

Remote schema check on project `expwtpqyoaxfkygudune` initially confirmed `relay_proof_runs` had run/model/count/eval/public timestamps but no location columns. The additive migration was then applied through Supabase MCP on May 11, 2026, and the remote table now includes `location_pack_id`, `location_label`, `hazard_type`, `site_type`, and `context_mode`.

## RLS Rules

Keep current policy model:

- RLS on all proof tables.
- Public read only where `public_read = true`.
- No public insert/update/delete.
- Service key only for local sync.
- Publishable key only for browser reads.

## Serializer Changes

Update:

```text
apps/api/app/services/proof_service.py
```

`build_proof_payload` should read location metadata from:

1. `snapshot.app`
2. environment fallback
3. default wildfire pack fallback

## Frontend Proof Page

Update:

```text
apps/web/app/proof/page.tsx
apps/web/lib/proofLedger.ts
```

Show:

- location pack
- location label
- hazard type
- site type
- context mode

Keep copy plain:

```text
Location context
Santa Rosa, CA
wildfire / evacuation shelter / fixture
```

## Verification

After migration and sync:

1. Query latest `relay_proof_runs`.
2. Confirm location columns are populated.
3. Query `relay_public_snapshots`.
4. Confirm `snapshot_json.location` is present.
5. Confirm anon/public key can read public snapshot rows only.
6. Confirm service role key is not exposed in Next.js bundle.

## Failure State

If Supabase is unavailable, `/proof` should still show fixture fallback:

```text
Proof ledger offline
Showing local proof fixture.
```

This should not block the public demo.
