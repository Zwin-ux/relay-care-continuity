# RELAY HyperFrames Storyboard

**Format:** 1920x1080
**Audio:** calm voiceover, low restrained electronic underscore, subtle UI SFX
**VO direction:** clear, serious, measured. Public-safety review workspace, not startup hype.
**Style basis:** `DESIGN.md`

## Asset Audit

| Asset | Type | Assign to Beat | Role |
| --- | --- | --- | --- |
| `apps/web/public/brand/relay-mark.svg` | Logo | 1, 7 | Product identity |
| Live preview URL | Website capture | 2-6 | Main product evidence |
| Incoming Reports panel | UI capture | 2 | Report chaos becoming structure |
| Care Continuity Ledger panel | UI capture | 3 | Core product hero |
| Continuity Review panel | UI capture | 4-5 | Required fields and unsafe claims |
| Handoff unavailable module | UI capture | 5 | Safety/trust centerpiece |
| `docs/media/gallery/06-architecture-replay-ollama.png` | Architecture graphic | 6 | Technical proof |
| `docs/media/gallery/07-ollama-local-proof-frame.png` | Capture frame | 6 | Local Gemma/Ollama proof frame for terminal capture |

## Beat 1 - Cold Open: Care Breaks Quietly (0:00-0:07)

**VO:** "During a wildfire evacuation, care can break quietly."

**Concept:** Start inside the workspace before the viewer fully understands the product. Reports sweep in: medication pickup, oxygen battery, infant formula, transport, smoke, unsafe dosing.

**Visual:** RELAY logo top-left. Six report excerpts appear as layered rows and begin aligning into Incoming Reports.

**Motion:** Rows cascade in, then snap to the report queue. Amber and red markers pulse once on missing-info and unsafe-claim rows.

## Beat 2 - Reports Grouped (0:07-0:16)

**VO:** "Medication pickup, oxygen batteries, infant formula, transport questions, and unsafe health claims arrive as scattered texts and shelter notes."

**Concept:** The left panel becomes the focus: this is not a chatbot; it is source-report review.

**Visual:** Zoom into Incoming Reports. Highlight source, time, location, care area, and state.

**Motion:** Counters count up. Duplicate report receives a small merge line.

## Beat 3 - Care Continuity Ledger (0:16-0:28)

**VO:** "RELAY groups those reports into a Care Continuity Ledger."

**Concept:** The center ledger becomes the product thesis. Related reports are no longer loose inputs; they are continuity items with missing fields and unsafe claims attached.

**Visual:** Ledger rows fill the frame. Medication continuity is selected. Rows show care area, missing fields, source reports, review queue, and reported timing.

**Motion:** Lines draw from report rows into ledger rows. Selected ledger row receives a blue ring.

## Beat 4 - Continuity Review (0:28-0:39)

**VO:** "Each ledger item keeps its source reports, missing fields, and unsafe claims visible."

**Concept:** Show the right pane as an inspector, not a generic detail drawer.

**Visual:** Continuity Review header, required information, unsafe claim review, linked source reports.

**Motion:** Required fields draw one by one. Completed rows turn green. Open rows stay amber.

## Beat 5 - Handoff Unavailable (0:39-0:50)

**VO:** "This medication item looks urgent, but it is not ready. Recipient identity, pickup contact, and pharmacy location are still missing. One report also includes unsafe insulin dosing language."

**Concept:** The trust moment: RELAY refuses to clear incomplete or unsafe work.

**Visual:** Handoff unavailable panel fills the frame. `Request missing info` is active. `Mark ready for handoff` is disabled. Unsafe claim review shows the suppressed dosing claim.

**Motion:** The disabled button receives a subtle lock animation. The open fields pulse once, then hold.

## Beat 6 - Technical Proof (0:50-0:56)

**VO:** "For the public preview, replay mode keeps the story reliable. For technical verification, Ollama mode runs Gemma 4 locally and validates the same triage schema."

**Concept:** Show that the preview is backed by real architecture.

**Visual:** Split diagram: replay mode on one side, Ollama mode on the other, both flowing into schema validation, care-continuity mapping, and audit receipt.

**Motion:** Data path animates left to right. Validator block stamps `valid`.

## Beat 7 - Close (0:56-1:00)

**VO:** "RELAY keeps care continuity visible: what is linked, what is missing, what is unsafe, and why handoff is unavailable."

**Visual:** Full RELAY desktop screen with live preview URL and `https://github.com/Zwin-ux/relay-care-continuity`.

**SFX:** One restrained confirmation chime.

## Production Architecture

```text
docs/hyperframes/
  DESIGN.md
  SCRIPT.md
  STORYBOARD.md

Future HyperFrames project:
  capture/
  compositions/
  index.html
  narration.wav
  transcript.json
```
