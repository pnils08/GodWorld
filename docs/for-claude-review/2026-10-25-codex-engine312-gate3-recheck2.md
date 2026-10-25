---
title: engine.312 gate 3 recheck 2 — item 2
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/for-claude-review/2026-10-25-engine312-gate3-recheck2-TASK.md
  - output/engine-sheet/2026-10-25-e312-receipt.js
---

# engine.312 gate 3 recheck 2 — `3e04d8a5`

**Gate: FIX / HOLD for PROD.** Fold `a27ea7ff` changes the receipt only; item 2 is not closed.

1. **SHIP — whitespace numeric guard.** `typed()` rejects whitespace-only text before conversion; touched FameScore, sighted MediaCount, and new-row FameScore/MediaCount use it (`output/engine-sheet/2026-10-25-e312-receipt.js:72,149-150,160-161,197-198`). Existing-row sighted LastSeenCycle still strips all non-digits instead: `x113` passes at C113, though the registrar writes the numeric cycle (`output/engine-sheet/2026-10-25-e312-receipt.js:152`; `phase07-evening-media/culturalLedger.js:594-602`). **FIX** if the task's sighted-number requirement covers that cell.
2. **FIX — personal CREATE presence.** Checks for FirstSeenCycle, MediaSpread, Status, TrendTrajectory, and CityTier skip `undefined`; a row cut off after MediaSpread can omit CityTier and pass (`output/engine-sheet/2026-10-25-e312-receipt.js:200-208`). The registrar's CREATE includes CityTier = `Local` (`phase07-evening-media/culturalLedger.js:748-765`). Require the nonblank CREATE cells to be present before comparing values.
3. **FIX — institution fixed-cell presence.** The `want` values match the engine.65 append, but `if (v === undefined) continue` skips required cells (`output/engine-sheet/2026-10-25-e312-receipt.js:177-191`). A row ending after a valid FameScore omits `TrendTrajectory`, `FirstRefSource`, and `MediaSpread` yet can pass; engine.65 writes `rising`, `engine.65`, and `0` (`phase05-citizens/generationalWealthEngine.js:3418-3422`). Require nonblank fixed cells; allow omitted trailing blank cells only where the Sheet read returns ragged rows.

Saved C113/C114/C115 replays report PASS with empty holds; C113 creates one personal row, C114/C115 create none (`output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c113.json:4,14,422-433,447`; `output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c114.json:4,14,380`; `output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c115.json:4,14,358`). The plan reports the three tamper HOLDs and one well-formed dynasty PASS (`docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:120`); these do not cover omitted required cells. No fresh bench or live read was run.

**PROD disposition:** The receipt-presence fixes still stand between `3e04d8a5` and a PROD push on the builder's go, in addition to the named FIRE_ADMISSION_JSON window and invisible PROD `SIM_SSID` property exceptions. No Sheet, bench, clasp, model, commit, or push action was run.
