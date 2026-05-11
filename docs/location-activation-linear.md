# Linear Issue Packet: Location Activation

Use this as the Linear planning packet. Create these as issues under the RELAY submission project.

## Epic

**Title:** Location Activation for Care Continuity

**Summary:** Add a compact location activation layer so RELAY can load a local care-continuity context, structure source reports with Gemma against that context, and record the active location in the proof ledger.

**Priority:** High

**Labels:** `submission`, `care-continuity`, `location-activation`, `gemma`, `safety-trust`

**Definition of Done:**

- Wildfire location is active by default.
- Operator can activate a location pack from the main workspace.
- Public context is labeled context-only.
- Ledger remains the main UI.
- `/proof` includes active location metadata.
- No live-signal or dispatch claims are visible.

## Issue 1: Add Location Pack Fixtures

**Objective:** Add fixture-backed location packs for wildfire, flood, and blackout contexts.

**Files:**

- `data/location-packs/*.json`
- `apps/web/data/location_packs.json`
- `apps/web/lib/locationPacks.ts`

**Acceptance Criteria:**

- Three packs exist.
- Each pack includes location, hazard type, site type, public context, care domains, required fields, and safety boundaries.
- Wildfire pack maps to existing scenario.
- Frontend tests validate pack parsing.

## Issue 2: Add Location Activation UI

**Objective:** Add a compact `Activate location` control to the command bar.

**Files:**

- `apps/web/app/page.tsx`
- `apps/web/lib/locationPacks.ts`
- `apps/web/tests/locationPacks.test.ts`
- `apps/web/tests/relay-demo.spec.ts`

**Acceptance Criteria:**

- Command bar shows current location.
- Selector does not create giant metadata cards.
- Context strip updates with active pack.
- Copy says `Context only. Source reports still require review.`
- Banned terms are absent: `get all signals`, `live dispatch`, `AI-powered`, `verified facts`.

## Issue 3: Add Backend Pack Endpoints

**Objective:** Expose location pack list and activation endpoints.

**Files:**

- `apps/api/app/main.py`
- `apps/api/app/services/location_pack_service.py`
- `apps/api/tests/test_location_packs.py`

**Acceptance Criteria:**

- `GET /api/location-packs` returns public-safe pack metadata.
- `POST /api/location-packs/{pack_id}/activate?include_snapshot=true` returns a mutation result with snapshot.
- Unknown pack returns 404.
- Default scenario load remains backwards-compatible.

## Issue 4: Extend Snapshot With Active Location

**Objective:** Add location metadata and public context to `/api/snapshot`.

**Files:**

- `apps/api/app/services/snapshot_service.py`
- `apps/web/lib/api.ts`
- `apps/web/lib/careContinuity.ts`

**Acceptance Criteria:**

- `snapshot.app.location_pack_id` is present.
- `snapshot.app.location_label` is present.
- `snapshot.app.hazard_type` is present.
- `snapshot.public_context` is present.
- Existing UI still works if fields are missing.

## Issue 5: Inject Location Context Into Gemma Prompt

**Objective:** Make Ollama/Gemma triage location-aware without changing the visible demo path.

**Files:**

- `apps/api/app/services/triage_service.py`
- `apps/api/tests/test_relay.py`

**Acceptance Criteria:**

- Prompt includes active location label, hazard type, site type, allowed care domains, required fields, and safety boundaries.
- Model output still validates against existing schema.
- Unsafe health claims remain held and do not appear as advice.

## Issue 6: Extend Supabase Proof Ledger

**Objective:** Include location metadata in proof payload and `/proof`.

**Files:**

- `apps/api/app/services/proof_service.py`
- `apps/api/tests/test_proof_service.py`
- `apps/web/lib/proofLedger.ts`
- `apps/web/app/proof/page.tsx`
- `supabase/migrations/*`

**Acceptance Criteria:**

- Proof payload includes location pack id, label, hazard type, site type, and context mode.
- Existing proof fallback still works.
- Public read policy remains limited to public-safe rows.
- No service role key reaches the browser.

## Issue 7: Update Submission Assets

**Objective:** Align writeup, video, and media gallery around Location Activation.

**Files:**

- `README.md`
- `docs/kaggle-writeup.md`
- `docs/video-script.md`
- `docs/media-gallery.md`
- `docs/recording-runbook.md`

**Acceptance Criteria:**

- Video has one short Location Activation beat.
- Writeup says location packs are context and schema adaptation, not live signal collection.
- Media checklist includes one location activation screenshot.
- README shows the feature without overclaiming.

