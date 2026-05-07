# RELAY Technical Proof Checklist

Use this for the Kaggle writeup, media gallery, and the technical proof segment of the video.

## Local Gemma 4 Path

```bash
ollama pull gemma4:e2b
MODEL_MODE=ollama GEMMA_MODEL=gemma4:e2b OLLAMA_BASE_URL=http://localhost:11434 npm run dev
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

This machine has Ollama available, but the last inspected model list only showed `llama3.1:latest`. Pull `gemma4:e2b` before recording the final local Gemma proof.

## Claim Boundary

The public preview can stay in replay mode. The technical proof should show that the same schema and state path can run from local Gemma through Ollama. Do not present replay mode as live model execution.
