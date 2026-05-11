# RELAY Location Activation Implementation Plan

## Summary

Location Activation is the next practical wedge for RELAY Care Continuity.

The product should not claim that it can "get all signals" for any place. That would overpromise live scraping, official emergency access, and real-world verification. The stronger and safer claim is:

> Set a location. RELAY activates a local care-continuity workspace for that place, then Gemma structures source reports inside that local context.

This gives the hackathon story a scalable hook without destabilizing the public demo. The default public path remains the wildfire community center replay. Location Activation adds two things judges can understand quickly:

- RELAY is not hardcoded to one scenario.
- Gemma's schema can adapt to local hazards, care domains, missing fields, and unsafe-claim rules.

## Product Scope

### User-Facing Function

`Activate location`

The operator can select or enter a location. RELAY loads a location pack that defines:

- scenario label
- hazard type
- site type
- public context notes
- care domains
- required fields by care domain
- source report fixture
- replay Gemma output fixture
- proof metadata

The UI must label this as local context, not verified incident truth.

### Non-Goals

Do not add:

- live social scraping
- real SMS ingestion
- 911 or emergency-service integrations
- automatic dispatch/routing
- medical advice
- public-context claims treated as evidence
- broad map integration

## Location Pack Contract

Create `data/location-packs/*.json` and mirror the public subset into `apps/web/data/location_packs.json`.

```json
{
  "id": "wildfire_santa_rosa",
  "label": "Santa Rosa wildfire shelter",
  "short_label": "Wildfire shelter",
  "hazard_type": "wildfire",
  "site_type": "evacuation shelter",
  "location": {
    "city": "Santa Rosa",
    "region": "California",
    "display": "Santa Rosa, CA"
  },
  "scenario_id": "wildfire_community_center",
  "public_context": [
    {
      "source": "CDC wildfire safety",
      "label": "Smoke-sensitive groups",
      "body": "Wildfire smoke can affect children, pregnancy, and people with asthma, COPD, heart disease, or diabetes.",
      "context_only": true
    }
  ],
  "care_domains": [
    "medication",
    "oxygen_power",
    "infant_supply",
    "mobility_transport",
    "hazard_access",
    "public_information"
  ],
  "required_fields": {
    "medication": [
      "recipient_identity",
      "pickup_location",
      "authorized_pickup_contact"
    ],
    "oxygen_power": [
      "device_type",
      "battery_runtime",
      "charging_location",
      "backup_power_source"
    ]
  },
  "boundaries": [
    "No live dispatch connection.",
    "Public context is not source evidence.",
    "Unsafe health claims stay held for review."
  ]
}
```

## Backend Plan

### Phase 1: Pack Loader

Add a location-pack service:

- `list_location_packs()`
- `get_location_pack(location_pack_id)`
- `activate_location_pack(session, location_pack_id)`

Activation should:

- clear the local SQLite state, same as scenario load
- load the pack's scenario reports
- tag `Signal.scenario` with the pack `scenario_id`
- store active pack metadata in the snapshot app block

Minimal endpoint set:

- `GET /api/location-packs`
- `POST /api/location-packs/{pack_id}/activate?include_snapshot=true`

Keep `POST /api/scenarios/load` for backwards compatibility; make it activate the default wildfire pack internally later.

### Phase 2: Snapshot Extension

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

Add `snapshot.public_context` from the active location pack.

### Phase 3: Gemma Context Injection

Update Ollama/replay triage input to include:

- active location pack
- hazard type
- site type
- allowed care domains
- required fields by care domain
- safety boundaries

Gemma should return the existing `TriageOutput` plus current care fields:

- `care_domain`
- `required_fields`
- `unsafe_claims`
- `source_assertions`
- `conflicts`
- `handoff_status`

Do not change the core schema unless necessary. The current schema already supports the care-continuity fields.

### Phase 4: Proof Ledger

Extend proof payload:

- `location_pack_id`
- `location_label`
- `hazard_type`
- `site_type`
- `context_mode`

Supabase migration can be additive:

- nullable columns on `relay_proof_runs`
- nullable fields inside `relay_public_snapshots.snapshot_json`

Do not require Supabase for the main app.

## Frontend Plan

### Phase 1: View Model

Add:

- `apps/web/lib/locationPacks.ts`
- `apps/web/data/location_packs.json`

Types:

```ts
export type LocationPack = {
  id: string;
  label: string;
  short_label: string;
  hazard_type: string;
  site_type: string;
  location: {
    city: string;
    region: string;
    display: string;
  };
  public_context: Array<{
    source: string;
    label: string;
    body: string;
    context_only: true;
  }>;
  care_domains: CareDomain[];
  required_fields: Record<string, string[]>;
  boundaries: string[];
};
```

### Phase 2: Command Bar

Add one compact control:

`Activate location`

Use a dropdown or segmented selector with three packs:

- Wildfire shelter: Santa Rosa, CA
- Flood shelter: Asheville, NC
- Blackout cooling center: Phoenix, AZ

Copy:

- `Location: Santa Rosa, CA`
- `Context: wildfire shelter`
- `Source mode: replay`

Avoid:

- `Get all signals`
- `Live signals`
- `Verified location intelligence`

### Phase 3: Context Strip

Replace the static `PublicContextStrip` with pack-driven context:

- first line: active hazard/site context
- second line: "Context only. Source reports still require review."

### Phase 4: Ledger Fit

The existing care-continuity ledger can stay. It already supports medication, oxygen/power, infant supply, mobility, hazard access, and public information.

For non-default packs, use fixture reports and replay outputs to show the ledger adapts without changing layout.

## Demo Packs

### 1. Wildfire Shelter

Default. Current scenario.

Care domains:

- medication
- oxygen/power
- infant supply
- mobility transport
- hazard access
- public information

### 2. Flood Shelter

Use only if time allows.

Reports:

- dialysis transportation request
- water contamination rumor
- oxygen concentrator battery issue
- accessible transport request
- infant supply shortage
- road closure uncertainty

Care domains:

- medication
- oxygen/power
- mobility transport
- infant supply
- public information
- hazard access

### 3. Blackout Cooling Center

Use only if time allows.

Reports:

- power-dependent medical device charging
- heat-sensitive resident check-in
- medication refrigeration question
- cooling center supply request
- duplicate transit request
- unsafe health claim

Care domains:

- oxygen/power
- medication
- shelter comfort
- mobility transport
- public information

## Implementation Order

1. Add location-pack JSON contract and three pack fixtures.
2. Add frontend location-pack types and selector.
3. Make command bar and public context strip pack-aware.
4. Add backend `GET /api/location-packs`.
5. Add backend `POST /api/location-packs/{pack_id}/activate`.
6. Extend snapshot app metadata and public context.
7. Inject location context into Gemma/Ollama prompt.
8. Extend proof payload with location metadata.
9. Add tests.
10. Update README, Kaggle writeup, video script, and recording runbook.

## Tests

### Backend

- default location pack loads
- activating a pack seeds source reports
- snapshot contains active location metadata
- Ollama prompt contains location context and boundaries
- proof payload contains location metadata

### Frontend

- command bar shows active location
- selecting a location changes the displayed context
- no UI copy claims live signal collection
- care ledger remains visible above the fold
- mobile still shows command bar, report queue, ledger, review sheet in order

### Playwright

- open app
- activate wildfire location
- group reports
- select medication continuity item
- confirm missing fields and unsafe claim hold
- confirm handoff unavailable
- confirm no banned copy:
  - `get all signals`
  - `live dispatch`
  - `AI-powered`
  - `human controlled`
  - `verified facts`

## Video Beat

Use this as a 5-8 second moment, not a new product tour:

> RELAY can activate around a local shelter context. Here we select a wildfire shelter. The same Gemma schema then groups local source reports into continuity items, missing fields, unsafe-claim holds, and a proof receipt.

## Risk Controls

- Keep the public demo deterministic.
- Keep location packs fixture-backed.
- Treat public context as context only.
- Do not claim live emergency signal access.
- Do not let public APIs block the app.
- Do not add a map unless there is a real data reason.

## Definition of Done

- Location Activation is visible but compact.
- Default wildfire flow still works.
- `/proof` includes location metadata.
- Replay mode still passes build/unit/e2e.
- Ollama prompt includes active location context.
- Docs explain that location activation uses packs and source reports, not live emergency feeds.
