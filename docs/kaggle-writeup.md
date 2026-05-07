# RELAY Care Continuity: Local Gemma Review for Wildfire Shelter Reports

**Subtitle:** A Gemma 4 proof-of-concept that groups messy evacuation-shelter reports into a care-continuity ledger, suppresses unsafe health claims, and keeps handoff unavailable until required information is complete.

## Summary

RELAY Care Continuity is a reviewer workspace for evacuation shelters operating during wildfire displacement, blackout, or poor-connectivity conditions. The product uses a controlled wildfire community-center scenario with mock texts, shelter desk notes, volunteer reports, and photo-style observations. Gemma 4 structures those reports into a ledger of care-continuity items: medication pickup, oxygen and power-dependent device support, infant supplies, mobility transport, hazard access, public information review, volunteer capacity, and shelter comfort.

The product is deliberately not an autonomous emergency response system. RELAY does not dispatch responders, give medical advice, verify real-world facts, or replace incident-command software. It shows what the system actually has: source reports, grouped draft items, missing required fields, unsafe claims held for review, and an audit receipt for reviewer actions.

Live preview: https://web-zwin-uxs-projects.vercel.app
Latest preview for final review: https://web-8ha9fvnv1-zwin-uxs-projects.vercel.app
Proof ledger: https://web-zwin-uxs-projects.vercel.app/proof
Public code: https://github.com/Zwin-ux/relay-care-continuity

The `/proof` route shows a durable Supabase proof ledger when public Supabase env vars are configured, and a clearly labeled public-safe fixture when the ledger is offline.

## Problem

During evacuations, care can fail quietly. A medication pickup request can sit next to a rumor, a low oxygen battery report, a blocked-road note, an infant formula shortage, and a volunteer availability message. Shelters need a way to see which reports belong together and what is still missing before a task can be sent forward.

Public disaster guidance makes this continuity problem concrete. Wildfire preparedness guidance calls out people with chronic conditions, pregnancy, children, and respiratory conditions as groups requiring extra planning. Disaster guidance for people with medical needs calls out medications, oxygen, power-dependent equipment, batteries, and supplies. RELAY turns those concerns into an interface pattern: report grouping plus required-field review, not automatic action.

## Product

The main screen has three operational zones.

**Incoming Reports** shows local source reports with source, time, location hint, severity, tags, and review state. It includes normal reports and unsafe or unresolved claims.

**Care Continuity Ledger** is the center of the product. It groups related reports into rows such as Medication continuity and Power-dependent care. Each row shows source-report count, missing-field count, review queue, reported timing, unsafe-claim count, and handoff state.

**Continuity Review** inspects the selected ledger item. For medication continuity, RELAY shows linked source reports, required information, unsafe-claim review, and a disabled `Mark ready for handoff` button. The selected item remains unavailable because recipient identity, authorized pickup contact, and pharmacy or pickup location are incomplete.

The key trust moment is the unsafe insulin report. One source report includes unsafe dosing language. RELAY does not repeat it as advice. It displays the safer normalized state: `Unsafe medication instruction held for review.` The handoff action remains unavailable.

## How Gemma 4 Is Used

Gemma 4 is the local triage layer. It converts raw report text into schema-validated JSON:

- incident type and urgency
- source-linked evidence
- missing information
- recommended next action
- safety notes
- care domain
- required fields
- unsafe claims
- source assertions
- conflicts
- handoff status

RELAY supports two model modes.

`MODEL_MODE=replay` powers the public preview with saved Gemma-style outputs. This keeps the live demo reliable for judges and does not depend on a hosted model call.

`MODEL_MODE=ollama` calls a local Gemma model through Ollama using configurable `GEMMA_MODEL` and `OLLAMA_BASE_URL` environment variables. The default local tag is `gemma4:e2b`, but the model name stays configurable for stronger local hardware. The same Pydantic schema validates the output before anything appears in the ledger. If validation fails, the model run stores validation errors instead of silently accepting the output.

This split is intentional: replay mode protects the video and live preview, while Ollama mode proves that the architecture is not just a static mockup.

## Safety And Trust

RELAY is built around limited claims. The system only knows reports. It does not know ground truth. UI copy is written to reflect that: source reports are linked, missing information remains open, unsafe claims are held, and handoff is unavailable.

The safety gates are implemented in both the frontend and backend. The frontend action matrix disables handoff when required fields or unsafe claims remain. The FastAPI backend also blocks handoff if an unsafe health or routing claim is still present, even if the UI were bypassed.

Every triage result includes source references. Every state transition writes an audit event. Public context is labeled as context only, not source evidence.

## Technical Execution

The repo is a monorepo:

- Next.js, TypeScript, Tailwind, Coinbase CDS, TanStack Query, and Zustand-style view-model logic for the web app.
- FastAPI, Pydantic, SQLModel, and SQLite for persistence.
- Replay triage and Ollama mode for Gemma verification.
- Supabase proof ledger for durable public-safe run receipts.
- `/api/snapshot` as the canonical frontend read model.
- Playwright coverage for the visible flow.

The current implementation persists care-continuity fields in SQLite, exposes them through the snapshot read model, maps them into the ledger, and keeps selected review state stable across mutations. The public preview can run as a frontend-first replay experience, while local development can run the full API and Ollama path. Supabase stores durable proof receipts for run counts, source reports, continuity items, unsafe-claim holds, audit events, and eval metrics.

## Evaluation

RELAY includes lightweight evaluation for technical verification:

- incident type accuracy
- urgency accuracy
- missing-information detection
- unsafe-action avoidance

These are not production benchmarks. They are proof that the demo is testable and that the schema-driven workflow can be evaluated.

## Limitations

RELAY is a hackathon prototype using mock wildfire-replay data. It does not contact emergency services, dispatch responders, give medical advice, verify live conditions, or make operational decisions. All handoff actions shown in the preview are simulated. In a real emergency, people should call the appropriate local emergency number and follow official instructions.

## Closing

RELAY focuses Gemma 4 on a narrow, high-impact job: structure messy local reports into a reviewable care-continuity ledger. The product's value is not model magic. It is making the review state visible: what is linked, what is missing, what is unsafe, and why handoff is unavailable.
