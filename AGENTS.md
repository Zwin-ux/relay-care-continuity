# AGENTS.md

## Project

This repository builds RELAY, a local-first crisis coordination demo for the Gemma 4 Good Hackathon.

RELAY ingests messy emergency reports, uses Gemma 4 to extract structured incidents, places them into mission lanes, and lets a human coordinator verify, dispatch, escalate, merge, reject, or resolve each mission.

The product is not a chatbot and not a dashboard. It is a decision board.

## Demo Goal

The main deliverable is a reliable software demo:

1. Load a wildfire/community-center scenario.
2. Show raw incoming signals.
3. Run Gemma triage.
4. Create structured incidents.
5. Display incidents in mission lanes.
6. Allow human-controlled state transitions.
7. Show evidence, confidence, missing information, and audit history.
8. Include replay mode so the public demo is reliable.
9. Include Ollama mode so the repo demonstrates real Gemma execution.

## Tech Stack

Frontend:
- Next.js
- TypeScript
- Tailwind
- Framer Motion
- TanStack Query
- Zustand

Backend:
- FastAPI
- Pydantic
- SQLite
- SQLModel
- Ollama integration through HTTP

Testing:
- Pytest for backend
- Playwright for end-to-end demo flow

## Important Modes

MODEL_MODE=replay:
Uses saved Gemma outputs from data/scenarios/*.gemma.json.

MODEL_MODE=ollama:
Calls local Ollama Gemma model using GEMMA_MODEL from environment variables.

Do not remove replay mode. The public demo must be reliable even without local model access.

## Core Workflow

Signal -> Gemma triage -> Incident -> Board lane -> Human action -> Audit event

## Core States

RAW_SIGNAL
PARSED_INCIDENT
NEEDS_VERIFICATION
ACTION_READY
DISPATCHED
FOLLOW_UP_REQUIRED
RESOLVED
REJECTED
MERGED
ESCALATED

## Safety Rules

1. The model cannot directly dispatch.
2. The model cannot directly escalate.
3. Human confirmation is required for dispatch and escalation.
4. Low-confidence incidents must go to NEEDS_VERIFICATION.
5. Missing critical information blocks ACTION_READY.
6. Medical-related incidents cannot produce treatment advice.
7. Hazard incidents cannot dispatch volunteers into unsafe areas without verification.
8. Every model output must include evidence.
9. Every state transition must create an audit event.

## Design Direction

The UI should feel like a serious crisis command layer:
- dark interface
- large readable type
- mission lanes
- animated movement between states
- evidence-first detail drawer
- no generic SaaS dashboard look
- no charts unless they support the demo story

Do not gamify disaster. The interface can be command-console inspired, but the language must stay serious.

## Definition of Done

A task is complete only when:
- implementation works locally
- relevant tests pass
- API schemas are validated
- frontend handles loading/error states
- Playwright demo flow can complete
- README instructions are updated if needed

## Do Not Build Yet

Do not build:
- auth
- live social media scraping
- real SMS sending
- full map integration
- volunteer calendar
- real emergency service integration
- multi-city support
- large analytics dashboard

Focus on the vertical slice.
