# RELAY Supabase Proof Ledger

Supabase is used as a durable proof layer for the Kaggle submission. It is not the primary runtime database for the public preview.

## What It Stores

- Proof runs: scenario, model mode, Gemma model, counts, and eval metrics.
- Source reports: public-safe headlines, source type, care domain, and review state.
- Continuity items: missing fields, unsafe-claim holds, handoff status, and source-link counts.
- Audit events: reviewer/model events with unsafe health claims redacted.
- Public snapshots: one public-safe JSON receipt for the `/proof` page.

## Setup

Codex MCP is scoped to:

```text
https://mcp.supabase.com/mcp?project_ref=expwtpqyoaxfkygudune
```

Apply `supabase/migrations/202605050001_relay_proof_ledger.sql` using Supabase MCP `execute_sql` or the Supabase SQL editor. After applying it, run Supabase advisors and confirm RLS is enabled.

Current project status:

```text
Project: expwtpqyoaxfkygudune
Run slug: relay-care-continuity-replay
Remote schema: applied
Public snapshot: published
Security advisors: clean
Performance advisors: only fresh unused-index info notices
```

## Sync

Start the API locally, then run:

```bash
npm run proof:sync
```

For an MCP/SQL publish without copying a service-role key into the workspace:

```bash
npm run proof:payload
npm run proof:sql
```

Then execute `docs/media/gallery/relay-proof-ledger.publish.sql` with Supabase MCP `execute_sql` or the SQL editor.

Required server-side env vars:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROOF_RUN_SLUG=relay-care-continuity-replay
```

The service role key is only for local/server sync. Never expose it to the browser.

## Public Preview

Set these Vercel env vars for the `/proof` route:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://expwtpqyoaxfkygudune.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable or legacy anon key>
```

If they are missing or Supabase is unavailable, `/proof` falls back to a local public-safe proof fixture and clearly labels the proof ledger as offline.

## Safety Boundary

The proof ledger does not store raw unsafe medical instructions as public proof. Unsafe claims are represented as labels such as:

```text
Unsafe medication instruction held for review.
```

This keeps the submission proof focused on suppression, missing information, and auditability rather than replaying unsafe advice-like text.
