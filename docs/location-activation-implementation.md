# Location Activation Implementation Plan

## Goal

Add a compact, defensible **Location Activation** capability to RELAY Care Continuity.

The point is not "RELAY can scrape every signal anywhere." The point is:

> RELAY can activate a local care-continuity workspace for a selected place, then use Gemma to structure local source reports against that place's hazards, care domains, missing fields, and safety boundaries.

This gives the submission a bigger vision without breaking the stable replay demo.

## Product Promise

Use this language:

- `Activate location`
- `Local context loaded`
- `Source reports required`
- `Context only. Not source evidence.`
- `Handoff unavailable until required fields are complete.`

Avoid this language:

- `Get all signals`
- `Live emergency feed`
- `Verified facts`
- `Autonomous dispatch`
- `AI-powered response`
- `Real-time official intelligence`

## V1 Scope

V1 is fixture-backed and safe:

- 3 location packs
- no live API dependency
- no maps
- no emergency-service connection
- same `/api/snapshot` read model
- same Care Continuity Ledger UI
- same replay/Ollama model mode split
- proof ledger records active location metadata

## Location Packs

Create these packs:

1. `wildfire_santa_rosa`
   - Display: `Santa Rosa, CA`
   - Hazard: wildfire
   - Site: evacuation shelter
   - Scenario: existing wildfire community center

2. `flood_asheville`
   - Display: `Asheville, NC`
   - Hazard: flood
   - Site: temporary shelter
   - Scenario: new fixture if time allows

3. `blackout_phoenix`
   - Display: `Phoenix, AZ`
   - Hazard: heat + blackout
   - Site: cooling center
   - Scenario: new fixture if time allows

## Files To Add

```text
data/location-packs/
  wildfire_santa_rosa.json
  flood_asheville.json
  blackout_phoenix.json

apps/web/data/location_packs.json
apps/web/lib/locationPacks.ts
```

Optional backend service:

```text
apps/api/app/services/location_pack_service.py
```

Optional tests:

```text
apps/api/tests/test_location_packs.py
apps/web/tests/locationPacks.test.ts
```

## Backend Work

### Step 1: Static Pack Loader

Add service functions:

```python
list_location_packs()
get_location_pack(pack_id)
default_location_pack()
```

### Step 2: API Endpoints

Add:

```text
GET /api/location-packs
POST /api/location-packs/{pack_id}/activate?include_snapshot=true
```

For V1, activation can reuse the existing wildfire scenario for all packs until new report fixtures exist. The UI should still clearly show that source reports are replay fixtures.

### Step 3: Snapshot Metadata

Extend `snapshot.app`:

```json
{
  "location_pack_id": "wildfire_santa_rosa",
  "location_label": "Santa Rosa, CA",
  "hazard_type": "wildfire",
  "site_type": "evacuation shelter",
  "context_mode": "fixture"
}
```

Add:

```json
{
  "public_context": [
    {
      "source": "CDC wildfire safety",
      "label": "Smoke-sensitive groups",
      "body": "Context copy here.",
      "context_only": true
    }
  ]
}
```

## Frontend Work

### Step 1: Location Pack View Model

Add a small mapper:

```ts
getLocationPacks()
getDefaultLocationPack()
locationPackFromSnapshot(snapshot)
```

### Step 2: Command Bar

Add one compact control:

```text
Activate location
```

The control should show:

```text
Location: Santa Rosa, CA
Context: wildfire shelter
Source mode: replay
```

Do not add another row of large cards.

### Step 3: Public Context Strip

Make the context strip location-aware:

```text
Local context: wildfire evacuation shelter
Context only. Source reports still require review.
```

### Step 4: Ledger

The ledger remains the anchor. No new dashboard panel.

## Gemma/Ollama Work

Inject active location context into the model prompt:

- location display
- hazard type
- site type
- allowed care domains
- required fields by care domain
- safety boundaries

The existing schema already has the needed fields:

- `care_domain`
- `required_fields`
- `unsafe_claims`
- `source_assertions`
- `conflicts`
- `handoff_status`

## Supabase Proof Work

Add location metadata to proof payload:

- `location_pack_id`
- `location_label`
- `hazard_type`
- `site_type`
- `context_mode`

Do this additively. Existing proof rows should still work.

## Acceptance Criteria

- App opens with wildfire location active by default.
- User can see `Activate location` in the command bar.
- Selecting a pack updates location/context copy.
- Default wildfire flow still works.
- Care Continuity Ledger remains visible above the fold.
- Handoff stays unavailable when required fields or unsafe claims are open.
- `/proof` shows location metadata when available.
- No visible copy claims live signal collection or verified ground truth.

## Implementation Order

1. Add pack JSON and frontend view model.
2. Add command-bar location selector.
3. Make context strip pack-aware.
4. Add backend pack endpoint.
5. Add activate endpoint.
6. Extend snapshot metadata.
7. Inject pack context into Gemma/Ollama prompt.
8. Extend Supabase proof payload.
9. Add tests.
10. Update README, writeup, video script, and media checklist.
