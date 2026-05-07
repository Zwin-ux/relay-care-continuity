# RELAY Media Gallery

Use these images for the Kaggle Media Gallery, writeup, and YouTube thumbnail planning. The goal is to show one thing clearly: RELAY is a care-continuity review workspace, not an autonomous response system.

Figma layout QA file: https://www.figma.com/design/z0AcAdbaYLGKC9Kd4gczbJ

## Captured Assets

Generated from the local app at 1440x900 and 390x844:

1. `docs/media/gallery/01-cover-care-continuity-workspace.png`
   - Best Kaggle cover candidate.
   - Shows the full workspace: Incoming Reports, Care Continuity Ledger, Continuity Review, missing fields, unsafe claim, and unavailable handoff.

2. `docs/media/gallery/02-incoming-unsafe-claim-filter.png`
   - Shows the report queue filtered to unsafe claims.
   - Use this when explaining why RELAY suppresses unsafe medical language instead of repeating it as advice.

3. `docs/media/gallery/03-continuity-review-handoff-unavailable.png`
   - Right-side review pane only.
   - Shows required information, unsafe claim review, linked source reports, and disabled `Mark ready for handoff`.

4. `docs/media/gallery/04-care-continuity-ledger.png`
   - Center ledger only.
   - Shows grouped care-continuity rows with source report counts, missing-field counts, review queue, reported timing, and unsafe-claim state.

5. `docs/media/gallery/05-mobile-care-continuity-workspace.png`
   - Mobile layout proof.
   - Use only as a supporting gallery image, not the cover.

6. `docs/media/gallery/06-architecture-replay-ollama.png`
   - Technical proof graphic for the writeup and video.
   - Shows replay mode and Ollama mode feeding the same schema validator, SQLite state, ledger, review pane, and audit receipts.

7. `docs/media/gallery/07-ollama-local-proof-frame.png`
   - Recording frame for the local Gemma/Ollama verification capture.
   - Replace or pair this with a terminal screenshot after `ollama pull gemma4:e2b` and a local `MODEL_MODE=ollama` triage run.

8. `docs/media/gallery/08-test-proof-green.png`
   - Automated verification proof card.
   - Records the local build, unit/API tests, and Playwright checks passing after the Care Continuity freeze.

9. `docs/media/gallery/10-supabase-proof-ledger.png`
   - `/proof` route showing Supabase-backed run receipt or clearly labeled fixture fallback.

## Final Capture Needed

- Local Gemma/Ollama terminal capture after `gemma4:e2b` is installed.
- Supabase proof ledger screenshot after sync, or the offline fallback if public env vars are not configured.
- Optional code screenshot: `TriageOutput` schema with care-continuity fields.

## Recording Beats

1. Start with the full workspace, not a loading screen.
2. Pan through incoming reports: medication, oxygen battery, infant supply, transport, smoke, unsafe dosing.
3. Show `Group reports`.
4. Move to Care Continuity Ledger and select Medication continuity.
5. Call out missing fields.
6. Show unsafe claim review.
7. Show disabled `Mark ready for handoff`.
8. End on replay/Ollama architecture and audit receipt.

## Visual Standards

- Use desktop 1440x900 for the main screenshots.
- Also capture one mobile screenshot to prove responsive behavior.
- No empty panels.
- No generic hero section.
- No command-center language.
- No fake percentages.
- No deprecated safety-theater copy or unsupported operational claims.

## Regenerate Screenshots

Run the API and web app, then capture with Playwright:

```bash
npm run dev
```

Use `docs/media/gallery/01-cover-care-continuity-workspace.png` as the Kaggle cover unless a final Vercel screenshot is cleaner.
