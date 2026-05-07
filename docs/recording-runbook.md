# RELAY Recording Runbook

Use this as the operator checklist for the final YouTube video. Target length: 2:45-2:58.

## Browser Setup

- Use Chrome or Edge at 1440x900.
- Open `https://web-zwin-uxs-projects.vercel.app/?ready=2`.
- Open a second tab at `https://web-zwin-uxs-projects.vercel.app/proof`.
- Keep the public GitHub repo ready: `https://github.com/Zwin-ux/relay-care-continuity`.
- Zoom: 100%.
- Hide bookmarks and unrelated desktop notifications.

## Terminal Setup

Use PowerShell with these commands visible for the technical proof beat:

```powershell
ollama --version
ollama list
$env:MODEL_MODE='ollama'
$env:GEMMA_MODEL='gemma4:e2b'
$env:OLLAMA_BASE_URL='http://localhost:11434'
$env:OLLAMA_TIMEOUT_SECONDS='180'
npm run dev:api
```

For the short proof cut, show `ollama list` with `gemma4:e2b`, then cut to the API response or `docs/technical-proof.md` line showing the successful local smoke.

## Shot List

1. Cold open: full workspace, Incoming Reports visible.
2. Problem: pan through medication, oxygen/power, infant supply, mobility, smoke/access, and unsafe-claim rows.
3. Grouping: show Care Continuity Ledger rows and source-link counts.
4. Trust moment: select Medication continuity and show Required information plus Unsafe claim review.
5. Blocked action: show `Mark ready for handoff` disabled and the handoff unavailable explanation.
6. Technical proof: show `/proof` with `Supabase live`, then terminal `ollama list`, then architecture graphic.
7. Close: full workspace plus live demo and GitHub links.

## Voiceover

Use `docs/video-script.md` as the master script. Avoid improvising medical or emergency-service claims.

## Final QA Before Upload

- Video is public or unlisted, not private.
- Duration is under 3 minutes.
- Audio is readable.
- The unsafe claim is shown as suppressed or held, not repeated as advice.
- The video shows replay mode and Ollama mode as separate paths.
- The final frame includes live demo and GitHub links.

