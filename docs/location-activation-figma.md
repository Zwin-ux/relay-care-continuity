# Figma Brief: Location Activation UI

Use this as the Figma layout brief.

## Goal

Design Location Activation as a compact operational affordance inside RELAY Care Continuity. It should make the product feel more scalable without turning the workspace into a dashboard of filters and badges.

## Design Principle

The location is context, not a destination marketing hero.

Do not add:

- a large map
- hero artwork
- location cards across the top
- glowing "AI activation" states
- a wizard flow

## Screen Structure

Keep the current three-zone layout:

```text
Command bar
Public context strip

Incoming Reports | Care Continuity Ledger | Continuity Review
```

## Command Bar Change

Add one compact control near the existing scenario/mode metadata:

```text
Activate location
Santa Rosa, CA
Wildfire shelter
```

Preferred anatomy:

- label
- current location
- small chevron
- dropdown menu

Dropdown options:

- Santa Rosa, CA - wildfire shelter
- Asheville, NC - flood shelter
- Phoenix, AZ - blackout cooling center

## Context Strip Change

Current static public context becomes pack-aware:

```text
Local context
Wildfire evacuation shelter. Smoke-sensitive groups and power-dependent needs may require continuity review.
Context only. Source reports still require review.
```

## Visual Rules

- Use Coinbase-like calm density.
- White panels, blue-gray app background.
- Blue for active selection.
- Amber only for missing fields/handoff unavailable.
- Red only for unsafe claims.
- No fake precision.
- Max two tags per row.
- No oversized pills.

## Components To Represent In Figma

### Location Selector

States:

- default
- open dropdown
- selected
- focus

### Location Context Strip

States:

- wildfire
- flood
- blackout
- fallback/offline fixture

### Ledger Row With Location Influence

Show one row where location context affects required fields:

- `Power-dependent care`
- Missing: `battery runtime`, `charging location`
- Context: blackout/cooling center

### Proof Ledger Row

Show active location metadata:

- Location pack
- Hazard type
- Site type
- Context mode

## Copy To Use

- `Activate location`
- `Local context loaded`
- `Context only. Source reports still require review.`
- `Source mode: replay`
- `Handoff unavailable`
- `Required fields open`

## Copy To Avoid

- `Get all signals`
- `Live emergency feed`
- `AI-powered location intelligence`
- `Verified local facts`
- `Dispatch ready`

## Figma QA Checklist

- Three main zones remain visible above the fold.
- Location control does not dominate the command bar.
- Dropdown is readable at desktop and mobile widths.
- No clipped tags or buttons.
- Context strip reads as contextual, not as source evidence.
- Handoff unavailable state remains the clearest safety moment.
