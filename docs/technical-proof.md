# RELAY Technical Proof Checklist

Use this for the Kaggle writeup, media gallery, and the technical proof segment of the video.

## Local Gemma 4 Path

```bash
ollama pull gemma4:e2b
MODEL_MODE=ollama GEMMA_MODEL=gemma4:e2b OLLAMA_BASE_URL=http://localhost:11434 OLLAMA_TIMEOUT_SECONDS=180 npm run dev
```

The model tag is configurable. Use `gemma4:e2b` for the lightweight local proof path, and a larger Gemma 4 tag only when the recording machine has enough memory.

## Proof To Capture

1. `ollama list` showing a Gemma 4 model installed.
2. API terminal running with `MODEL_MODE=ollama`.
3. One triage run creating a model run with status `ok`.
4. The web app showing the same item in the Care Continuity Ledger.
5. `npm test` and `npm --workspace apps/web run test:e2e` passing.
6. `/proof` showing a Supabase proof ledger run or an explicitly labeled fixture fallback.

## Supabase Proof Path

Apply `supabase/migrations/202605050001_relay_proof_ledger.sql`, then run:

```bash
npm run proof:sync
```

This writes a public-safe run receipt to Supabase. It stores unsafe health claims only as held-review labels and never publishes advice-like medical instructions.

## Current Local Status

This machine has Ollama `0.23.0` available and `gemma4:e2b` is installed. Use `ollama list` in the recording to show the local Gemma model before running the Ollama-mode triage path.

Latest local smoke: on May 7, 2026, `MODEL_MODE=ollama GEMMA_MODEL=gemma4:e2b OLLAMA_TIMEOUT_SECONDS=180` created a triage incident through `/api/triage/run` with `status: ok`.

## Claim Boundary

The public preview can stay in replay mode. The technical proof should show that the same schema and state path can run from local Gemma through Ollama. Do not present replay mode as live model execution.
