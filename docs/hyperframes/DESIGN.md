# RELAY Care Continuity Design System

## Overview

RELAY is a light, operational review interface for evacuation-shelter care continuity. The visual identity is calm and data-dense: white panels on a pale blue-gray app surface, compact metadata chips, dense source-report tables, ledger rows, and a focused continuity review pane. The product should feel like civic technology with fintech-grade polish, not a command-center simulator.

## Colors

- **App Background**: `#EDF3F8` - light blue-gray full-screen workspace.
- **Surface**: `#FFFFFF` - panels, ledger rows, report rows.
- **Canvas**: `#F7F8F9` - secondary rows, metadata chips, quiet inset areas.
- **Primary Blue**: `#0052FF` - primary actions, selected ledger item.
- **Deep Navy Text**: `#0A0B0D` - primary text.
- **Muted Text**: `#5B616E` - metadata and helper copy.
- **Amber Warning**: `#CF470E` - missing fields and unavailable handoff.
- **Green Complete**: `#098551` - completed review inputs.
- **Red Critical**: `#CF202F` - critical hazards and unsafe claims only.

## Typography

- **Primary Sans**: Coinbase CDS/default sans. Used for all UI copy.
- **Mono**: system monospace. Use only for timestamps, report IDs, and technical labels.
- **Panel Headers**: 16-18px, semibold, compact.
- **Ledger Titles**: 17-20px, semibold.
- **Body Text**: 13-15px, readable under pressure.
- **Metadata**: 11-13px, high contrast.

## Elevation

Depth is restrained. Use subtle borders and soft shadows, not glassmorphism. Ledger rows use a blue ring when selected. Warning modules use amber wash with a visible border. Unsafe claim modules use red wash, but only for held claims.

## Components

- **Command Bar**: horizontal strip with logo, Care Continuity badge, scenario, mode, counts, and actions.
- **Public Context Strip**: one compact row labeled context only, not source evidence.
- **Incoming Reports**: dense source-report table/list with severity, source, excerpt, location, care area, and review state.
- **Care Continuity Ledger**: grouped ledger rows for medication, power-dependent care, infant supplies, mobility, hazard access, public updates, and volunteer capacity.
- **Continuity Review**: selected item workspace with handoff availability, unsafe claim review, required information, linked source reports, and audit receipt.
- **Handoff Panel**: amber unavailable state with primary missing-info action, flag-for-review action, and disabled handoff button.

## Do's and Don'ts

### Do's

- Keep the full three-column workspace visible on desktop.
- Use operational copy: source reports, missing fields, unsafe claim, handoff unavailable.
- Show the reason beside the disabled action.
- Keep public context clearly separate from source evidence.
- Keep motion restrained and functional.

### Don'ts

- Do not use autonomous dispatch language.
- Do not use vague reviewer-safety badges or model-magic claims.
- Do not make a generic SaaS landing page.
- Do not overuse gradients, glow, glass, or futuristic effects.
- Do not imply real emergency-service integration or medical advice.
