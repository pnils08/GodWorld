---
title: engine.312 gate 3 recheck — three folded fixes
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/archive/for-claude-review/2026-10-25-engine312-gate3-recheck-TASK.md
  - docs/archive/for-claude-review/2026-10-25-codex-engine312-gate3.md
  - docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md
---

# engine.312 gate 3 recheck — `3e04d8a5`

**Final gate: FIX / HOLD for PROD.** Commit `22a17b25` changes the receipt and PROD script, not the engine candidate. The lost-decay and Sheet-binding fixes clear this source review; the numeric and dynasty-shape fix is incomplete.

1. **SHIP — lost decay.** Every existing row without a digest sighting now compares post MediaCount and LastSeenCycle with its preimage; a changed marker HOLDs (`output/engine-sheet/2026-10-25-e312-receipt.js:141-156`). Saved C113/C114/C115 replay receipts each show `hold: []` and `PASS` (`output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c113.json:2-15,446-447`; `output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c114.json:2-15,379-380`; `output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c115.json:2-15,357-358`). These are saved receipts, not a fresh bench read. Despite the "offline" label, replay still fetches Riley_Digest and Engine_Errors from the bench (`output/engine-sheet/2026-10-25-e312-receipt.js:59-62,120-124,209-211`).

2. **FIX — typed numbers and dynasty shape.** `typed(' ')` becomes `0` because the helper rejects only the empty string/null/undefined before `Number(v)` (`output/engine-sheet/2026-10-25-e312-receipt.js:72`); a whitespace-only touched FameScore can therefore pass a zero expectation, which occurs in the C113 replay (`output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c113.json:245-254`). Touched FameScore and sighted MediaCount use that helper, as do new personal FameScore/MediaCount (`output/engine-sheet/2026-10-25-e312-receipt.js:148-161,182-193`). It leaves new-row FirstSeenCycle, sighted LastSeenCycle, and MediaSpread unchecked (`phase07-evening-media/culturalLedger.js:748-765`). For a new institution, the predicate checks eight fields but not the actual append's fixed `CulturalDomain=Community`, `Status=Active`, both Cycle cells, `TrendTrajectory=rising`, `MediaSpread=0`, or trailing blanks (`output/engine-sheet/2026-10-25-e312-receipt.js:172-180`; `phase05-citizens/generationalWealthEngine.js:3418-3422`). For example, `Status=Inactive` with those eight fields intact passes. The replays exercise one personal create at C113 and no institution create (`output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c113.json:422-433`; `output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c114.json:14`; `output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c115.json:14`). Reject blankish numeric text and validate the fixed append fields before treating this fix as closed.

3. **SHIP — PROD Sheet binding, bounded.** The script extracts `DEFAULT_SIM_SSID` from its fresh PROD pull, requires the loaded env ID to equal it, and makes `lib/sheets` read that ID (`output/engine-sheet/2026-10-25-push-e312-prod.sh:23-30,40-49`; `lib/sheets.js:34-58`). The saved dry run reports a stage-25 pull, byte-identical stage-27 build, clean C112 fire state, and a stop before push (`output/engine-sheet/2026-10-25-e312-prod-dryrun.log:1-4`). A PROD `SIM_SSID` script property can override the default (`utilities/utilityFunctions.js:202-214`); its external invisibility and the `FIRE_ADMISSION_JSON` window remain the already named builder exceptions (`push-e312-prod.sh:9-10`).

**PROD disposition:** Item 2 still stands between `3e04d8a5` and a PROD push on the builder's named go. No further static blocker found in these three checks; the push still requires its fresh manifest/tree and fire-state gates (`push-e312-prod.sh:31-39,62-63,74-80`). No Sheet, bench, clasp, model, commit, or push action was run in this review.
