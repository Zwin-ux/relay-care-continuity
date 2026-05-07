# RELAY Kaggle Writeup Outline

Target length: under 1,500 words.

Recommended tracks: Main Track, Global Resilience, Safety & Trust, Ollama Special Technology Track. Mention Health & Sciences as a supporting continuity-of-care angle, not as a medical-advice claim.

This outline has been converted into a submission-ready draft at `docs/kaggle-writeup.md`.

## Title

RELAY Care Continuity: Local Gemma Review for Wildfire Shelter Reports

## Subtitle

A Gemma 4 proof-of-concept that groups messy evacuation-shelter reports into care-continuity ledger items, suppresses unsafe health claims, and keeps handoff unavailable until required information is complete.

## Summary

RELAY Care Continuity is a public-safety reviewer workspace for wildfire evacuation shelters. It uses mock replay data to show how scattered texts, volunteer notes, shelter desk reports, and photo-style observations can be grouped into continuity items such as medication pickup, oxygen or power-dependent support, infant supplies, mobility transport, hazard access, and public information review.

The core idea is not autonomous response. The core idea is reviewed continuity: every item shows source reports, missing required information, unsafe claims, public context marked as context only, and an audit receipt.

Live preview: https://web-zwin-uxs-projects.vercel.app

## Problem

During a local emergency, information arrives faster than shelters can sort it. Care breaks when medication access, oxygen equipment, infant supplies, mobility transport, and public updates are scattered across unstructured reports. The risk is not only missed information; it is acting on incomplete or unsafe claims.

## Product

RELAY presents one controlled scenario: Wildfire Community Center. The screen is a three-part continuity review workspace:

- Incoming Reports: local source reports with severity, source, time, location, care area, and review state.
- Care Continuity Ledger: grouped care-continuity items with missing fields, unsafe claim count, handoff state, and review queue.
- Continuity Review: selected item details, required information ledger, unsafe claim review, linked source reports, disabled handoff action, and audit receipt.

## Gemma 4 Use

Gemma 4 is used as the triage layer. It converts raw report text into a validated structure: incident type, urgency, linked source reports, missing information, recommended next action, safety notes, and optional care-continuity fields such as care domain, required fields, unsafe claims, source assertions, conflicts, and handoff status.

RELAY supports two modes:

- `MODEL_MODE=replay`: deterministic public preview using saved Gemma-style outputs.
- `MODEL_MODE=ollama`: local Gemma 4 verification through Ollama using `GEMMA_MODEL` such as `gemma4:e2b`.

This keeps the public preview reliable while still showing real local model integration.

## Safety And Trust

RELAY avoids unsafe product claims. The UI does not say the system verifies reality, gives medical advice, or dispatches responders. It says what is true in the prototype: reports are linked, required information is missing, unsafe claims are held, and handoff is unavailable.

The selected medication continuity item includes an unsafe insulin dosing claim. RELAY suppresses that claim as medical advice, keeps only the logistics review path, and keeps `Mark ready for handoff` disabled while recipient identity, pickup contact, and pharmacy or pickup location remain open.

## Technical Execution

The repo includes a FastAPI backend, SQLite persistence, Pydantic schema validation, replay triage, Ollama mode, snapshot-style frontend state, a Coinbase CDS-based Next.js review workspace, a care-continuity view model, and Playwright coverage for the golden path.

The app is intentionally narrow: one scenario, one continuity ledger, one review workflow. That narrowness makes the demo reliable while making Gemma's role technically verifiable.

## Evaluation

The evaluation panel reports simple verification metrics:

- incident type accuracy
- urgency accuracy
- missing-information detection
- unsafe-action avoidance

These are not production benchmarks. They prove the demo is technically grounded and testable.

## Limitations

RELAY is a hackathon prototype. It does not contact emergency services, dispatch responders, replace incident-command systems, give medical advice, or make operational decisions. All reports and handoff actions are simulated. The useful pattern is local triage plus source-linked continuity review, not automated emergency response.

## Closing

RELAY turns scattered wildfire shelter reports into a care-continuity ledger. Gemma 4 helps structure the reports; RELAY keeps the review state visible: what is linked, what is missing, what is unsafe, and why handoff remains unavailable.
