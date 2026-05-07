# RELAY Final Strategy Risk Audit

Date: May 7, 2026

## Confidence Position

Do not claim certainty. The defensible claim is:

> RELAY Care Continuity is a strong submission strategy if the final package proves three things quickly: real impact, real Gemma/Ollama execution, and a visible safety mechanism that blocks handoff when information is missing or unsafe.

## What The Strategy Gets Right

- The product maps cleanly to Global Resilience: evacuation shelters, blackout conditions, scattered local reports, continuity-of-care breakdown.
- The safety mechanic is easy to understand in seconds: unsafe health claims are held, missing fields remain visible, and handoff stays unavailable.
- The technical proof is credible: replay mode for public reliability, Ollama mode for local Gemma verification, schema validation, audit receipts, eval metrics, and Supabase proof ledger.
- The product wedge is narrower and stronger than a generic emergency dashboard. It focuses on medication, oxygen/power, infant supplies, mobility, hazard access, public information, and volunteer capacity.

## Loopholes And Fixes

| Risk | Why It Can Hurt | Fix / Gate |
| --- | --- | --- |
| Public repo missing | Kaggle requires public code. Without it, the submission is invalid. | Publish GitHub/Kaggle repo and replace README/writeup placeholders. |
| YouTube video missing | Kaggle says the video is the most important part. Without it, the project cannot compete well. | Produce final video under 3 minutes; add direct YouTube link to Kaggle writeup and README. |
| Overclaiming medical capability | Judges may reject or distrust anything that looks like advice or clinical decision support. | Keep copy to "source reports", "missing information", "unsafe claim held", "no medical advice". Never show dosage advice. |
| Looking like a static mock | Replay mode can be misread as fake if Ollama proof is not obvious. | Show local `MODEL_MODE=ollama` run in video and writeup. Include model-run logs and schema validation receipt. |
| Live demo outage | Public demos fail often if they depend on live model calls. | Keep Vercel demo replay-first. `/proof` falls back to a fixture if Supabase is unavailable. |
| Supabase read/write leakage | Public proof table could leak unsafe raw text or allow writes. | RLS enabled on all proof tables; public read only for `public_read=true`; anon write test returns `401`; unsafe claims stored as held-review labels. |
| "Demo" language weakens seriousness | Too much mock/demo copy can make it feel toy-like. | Use "Care Continuity", "source reports", "review ledger", "handoff unavailable"; keep "mock/no live dispatch" as boundary copy, not the headline. |
| Fake precision | Percentages can imply false operational confidence. | Use counts and concrete missing fields. No visible confidence percentages in the product. |
| Missing media gallery proof | Kaggle requires media gallery and cover image. | Use existing gallery: workspace, unsafe claim, handoff unavailable, ledger close-up, mobile, architecture, Ollama proof, tests, Vercel smoke, Supabase ledger. |
| Unclear track strategy | Trying to win every track dilutes the story. | Primary: Global Resilience. Strong secondary: Safety & Trust. Technology: Ollama. Health is context, not a claim. |

## Final Submission Gates

- Public code repository URL is live and accessible without login.
- YouTube video is public, under 3 minutes, and linked in the Kaggle writeup.
- Live demo URL opens signed out.
- `/proof` shows Supabase live or clearly labeled fixture fallback.
- Kaggle writeup stays under 1,500 words.
- Media gallery includes cover, product screenshots, and technical proof screenshots.
- README states replay mode vs Ollama mode, architecture, safety boundaries, and no emergency-service connection.
- Final smoke checks pass:
  - `npm --workspace apps/web run build`
  - `npm test`
  - `npm --workspace apps/web run test:e2e`

## Current Verdict

The strategy is strong enough to freeze. The remaining work is not another product pivot. It is final proof packaging: public repo, video, final links, and one last signed-out submission QA pass.
