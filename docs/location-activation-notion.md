# Notion Spec: RELAY Location Activation

Use this as the Notion execution spec.

## One-Line Product Decision

RELAY activates a local care-continuity workspace for a selected place; it does not claim live emergency signal access.

## Why This Matters

The current submission proves one wildfire shelter scenario. Location Activation shows the product can generalize without pretending to be a live emergency system. It makes Gemma's role clearer: adapt a structured care-continuity schema to the local hazard, site type, source reports, missing fields, and safety boundaries.

## User Story

As a shelter reviewer, I can activate a local context so RELAY groups incoming source reports into the right continuity areas for that place and keeps handoff unavailable when required information is missing.

## Scope

### In Scope

- Location pack fixtures.
- Compact command-bar location control.
- Pack-aware public context strip.
- Snapshot metadata for active location.
- Gemma prompt context injection.
- Supabase proof metadata.
- Tests and docs.

### Out of Scope

- Live scraping.
- Maps.
- 911/emergency-service integrations.
- Real SMS ingestion.
- Dispatch workflows.
- Medical advice.
- Official source verification.

## Requirements

### Product Requirements

- The main UI remains a three-zone reviewer workspace.
- The Care Continuity Ledger remains the visual anchor.
- The location control is compact.
- The user can understand that context is not evidence.
- Public replay remains reliable.

### Technical Requirements

- Location packs are JSON fixtures.
- `/api/snapshot` is still the canonical frontend read model.
- Mutations can return snapshots as before.
- Existing replay and Ollama modes continue working.
- Proof ledger remains additive and non-blocking.

### Safety Requirements

- Public context is never displayed as verified source evidence.
- Unsafe health claims remain suppressed labels.
- Handoff is unavailable while required fields are open.
- The UI never claims live dispatch or official emergency connection.

## Milestones

### Milestone 1: Frontend Pack UI

- Add pack fixtures.
- Add view-model helpers.
- Add command-bar selector.
- Update context strip.
- Add unit tests.

### Milestone 2: Backend Activation

- Add pack service.
- Add list endpoint.
- Add activate endpoint.
- Extend snapshot metadata.
- Add API tests.

### Milestone 3: Gemma + Proof

- Inject location context into Ollama prompt.
- Extend proof serializer.
- Update `/proof`.
- Add proof tests.

### Milestone 4: Submission Update

- Update README.
- Update Kaggle writeup.
- Update video script.
- Update media gallery.
- Re-run full QA.

## Acceptance Criteria

- Wildfire pack loads by default.
- Location selector is visible but not dominant.
- Selecting a pack updates location/context copy.
- Existing demo path still works.
- `/proof` includes active location metadata.
- Tests pass.
- Live preview does not show banned copy.

## Risks

### Risk: Overclaiming

Mitigation: Use `source reports`, `context only`, and `replay` language. Do not say `all signals`, `verified`, or `live feed`.

### Risk: Scope Creep

Mitigation: Fixture-backed packs only. No external API dependency before submission.

### Risk: UI Clutter

Mitigation: One compact selector and one context strip. No new large dashboard panel.

### Risk: Breaking Stable Demo

Mitigation: Keep wildfire as default. Keep old scenario endpoint. Add snapshot fallbacks.

## Final QA

- Build passes.
- Unit tests pass.
- Playwright passes.
- `/proof` renders with and without Supabase.
- Vercel preview works signed out.
- Mobile remains readable.
