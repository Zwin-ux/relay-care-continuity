# Kaggle Submission Checklist

Competition: The Gemma 4 Good Hackathon

Deadline: May 18, 2026 at 11:59 PM UTC.

## Links

- Live demo: https://web-zwin-uxs-projects.vercel.app
- Latest Vercel preview: https://web-8ha9fvnv1-zwin-uxs-projects.vercel.app
- Proof ledger: https://web-zwin-uxs-projects.vercel.app/proof
- Proof ledger route: `/proof`
- Figma layout QA: https://www.figma.com/design/z0AcAdbaYLGKC9Kd4gczbJ
- Vercel deployment: https://web-nx9mnp2kg-zwin-uxs-projects.vercel.app
- Code repository: https://github.com/Zwin-ux/relay-care-continuity
- YouTube video: pending final recording/upload.
- Kaggle writeup draft: `docs/kaggle-writeup.md`
- Cover image candidate: `docs/media/gallery/01-cover-care-continuity-workspace.png`
- Architecture proof image: `docs/media/gallery/06-architecture-replay-ollama.png`
- Ollama proof capture frame: `docs/media/gallery/07-ollama-local-proof-frame.png`
- Automated checks proof: `docs/media/gallery/08-test-proof-green.png`
- Recording runbook: `docs/recording-runbook.md`
- Kaggle links block: `docs/kaggle-links-block.md`
- Ollama proof transcript: `docs/ollama-proof-transcript.md`

## Submission Requirements

- Kaggle Writeup under 1,500 words.
- Public video attached to the Media Gallery, 3 minutes or less.
- Public code repository attached under Project Links.
- Live demo attached under Project Links.
- Media Gallery with a required cover image.

## Track Strategy

- Main Track: position RELAY around impact, vision, and real technical execution.
- Global Resilience: wildfire evacuation and blackout coordination.
- Safety & Trust: linked source reports, missing-information checks, unavailable handoff, audit trail.
- Ollama: local Gemma mode with configurable `GEMMA_MODEL`.

## Judge-Facing Proof

- Public demo works in replay mode without login.
- `/proof` shows Supabase proof ledger data or a clearly labeled fixture fallback.
- README explains replay mode and Ollama mode.
- Code shows Gemma-style schema validation and local Ollama integration.
- Playwright e2e covers the visible workflow.
- Writeup explains why replay mode is for reliability and Ollama mode is for technical verification.
- Media gallery shows the actual ledger, unsafe-claim suppression, disabled handoff, and mobile layout.
- Local verification command uses `GEMMA_MODEL=gemma4:e2b`.
- Figma file has the captured product layout plus a `RELAY Layout QA - Care Continuity` frame.
- Supabase proof ledger schema is documented in `docs/supabase-proof-ledger.md`.

## Final Submission Order

1. Record the video from the live demo.
2. Export a cover image from the full desktop workspace.
3. Pull or confirm the Gemma 4 Ollama model and capture the local verification proof.
4. Apply the Supabase proof schema and capture `/proof`.
5. Publish the code repository.
6. Publish the YouTube video.
7. Paste final links into the Kaggle Writeup.
8. Submit, then re-open the public links in a signed-out browser.

## Last QA Before Submit

- Open the live demo in a signed-out browser.
- Confirm `Care Continuity Ledger`, `Unsafe claim review`, and disabled `Mark ready for handoff` are visible.
- Confirm no copy implies live emergency-service connection, medical advice, autonomous response, or verified ground truth.
- Confirm the YouTube video is public and under 3 minutes.
- Confirm the writeup stays under 1,500 words after final links are added.
