# RELAY Video Script

Goal: a 3-minute Kaggle video that proves impact first, then technical depth. Present RELAY as evacuation-shelter care continuity review using mock wildfire replay data. Do not present RELAY as an autonomous emergency or medical system.

## Story Arc

0:00-0:18
"During a wildfire evacuation, care can break quietly. Medication requests, oxygen battery needs, infant supplies, and transport questions get buried in scattered reports."

Visual: fast cuts of incoming reports: medication pickup, oxygen machine battery, infant formula, smoke, mobility transport, unsafe insulin dosing claim.

0:18-0:42
"RELAY groups local source reports into a Care Continuity Ledger. Public context is shown as context only, not source evidence."

Visual: open the deployed workspace. Show `Incoming Reports`, public context strip, and the ledger.

0:42-1:10
"Gemma structures the reports, but RELAY does not treat model output as operational truth."

Visual: Care Continuity Ledger: Medication continuity, Power-dependent care, Infant supply continuity, Mobility transport, Smoke/access review, and public information review. Highlight missing fields and unsafe claims.

1:10-1:45
"Here is medication continuity. Related reports describe a medication pickup need, but recipient identity, pickup contact, and pharmacy location are still missing."

Visual: Continuity Review panel. Show required information rows and linked source reports.

1:45-2:08
"The important part is the unsafe claim. A report asks for extra insulin doses. RELAY suppresses that as medical advice and keeps the item unavailable for handoff."

Visual: Unsafe claim review panel, disabled `Mark ready for handoff`, warning copy.

2:08-2:34
"For technical verification, RELAY supports deterministic replay for the public preview and local Gemma 4 execution through Ollama."

Visual: architecture diagram or code split: replay outputs, `GEMMA_MODEL=gemma4:e2b`, schema validation, SQLite state machine, Supabase proof ledger, audit receipt.

2:34-2:52
"The evaluation checks whether triage stayed grounded: incident type, urgency, missing-information detection, and unsafe-action avoidance."

Visual: quick cut to tests/eval or an evaluation strip. Keep it short.

2:52-3:00
"RELAY keeps care continuity visible during crisis: what is linked, what is missing, what is unsafe, and why handoff is unavailable."

Visual: final product screen with the live preview URL and repo link.

## Must Show

- Live preview URL: `https://web-zwin-uxs-projects.vercel.app`
- Latest preview for recording: `https://web-8ha9fvnv1-zwin-uxs-projects.vercel.app`
- Public code repository: `https://github.com/Zwin-ux/relay-care-continuity`
- Proof ledger route for technical segment: `/proof`
- Figma layout QA: `https://www.figma.com/design/z0AcAdbaYLGKC9Kd4gczbJ`
- `Care Continuity Ledger`
- `Continuity Review`
- `Public context`
- `Required information`
- `Unsafe claim review`
- Disabled `Mark ready for handoff`
- Supabase proof ledger
- `MODEL_MODE=replay` and `MODEL_MODE=ollama`

## Avoid Saying

- vague reviewer-safety claims
- automated response claims
- autonomous response
- medical advice
- claims that an emergency is controlled
- claims that a task was sent to responders
- official 911 integration
