# Re-Review — engine.356: Hood Drives Business Growth (Fold `3eb7d3180`)

- **Date:** 2026-11-21 · **Lane:** antigravity (`agy`) · **Mode:** Read-only code review (no tests run, no sandbox calls)
- **Brief:** `docs/for-claude-review/2026-11-21-es-brief-agy-e356-hood-drives-growth-rereview.md`
- **Commit re-reviewed:** `3eb7d3180` (folding `output/antigravity/2026-11-21-review-e356-hood-drives-growth.md`)
- **Verdict:** **SHIP**

---

## Re-Check Results

### 1. Stability with `BIZ_CLASS_MIDDLE` fixed (150-cycle iteration)

Re-running our 150-cycle iteration directly against the folded `phase05-citizens/applyBusinessDynamics.js` (`3eb7d3180`, using local `output/beats/Business_Ledger.jsonl` with the 4 sub-area rows mapped to parent hoods per `e917708a4` and `BIZ-00052` at `6.16`, plus `output/beats/Neighborhood_Map.jsonl`):

- **Quiet baseline (`ev = shock = noise = 0`, `mayorApproval = 50`, `hoodScores` fixed):** Every class converges before Cycle 50 and holds identically through Cycle 150 (`C50 == C150`):
  - `tech: 15.005`, `construction: 11.54`, `professional: 9.73`, `arts: 7.72`, `food: 5.945`, `faith: 4.80`, `retail: 4.47`, `default: 3.47`, `health: 1.91`, `education: -0.44` (`4` businesses rest below zero; `minG = -2.11`, `maxG = 15.09`; institution max settles `3.55 -> 3.10`).
- **With `hoodBusinessFactor_` feedback + `successPressure` (`mayorApproval = 90`) + `noise = 0.25` + `disrupt = 2%`:** All classes remain bounded across Cycles 50–150 (`C150` medians `tech: 13.25`, `construction: 9.98`, `professional: 7.32`, `arts: 6.27`, `food: 4.76`, `faith: 3.285`, `retail: 2.86`, `default: 2.82`, `health: 0.875`, `education: -1.28`; `maxG = 14.07`, `instMax = 2.75`, `12` rows `< 0`).
- **Result:** No unbounded walk remains across the hood term, `BIZ_CLASS_MIDDLE` anchor, `bizSettleRate` institution settle, `shipPrev`/`track` port offset, `successWindow`, or `hoodBusinessFactor_` loop.

### 2. Fold integrity (`BIZ_CLASS_MIDDLE` / `classMiddle` / `followsHood`)

- `BIZ_CLASS_MIDDLE` (`phase05-citizens/applyBusinessDynamics.js:91-94`) defines all 10 keys returned by `bizSectorClass_` (`:191-209`: `arts`, `construction`, `'default'`, `education`, `faith`, `food`, `health`, `professional`, `retail`, `tech`).
- `var classMiddle = BIZ_CLASS_MIDDLE;` (`:674`) is consumed solely at `:716` (`classMiddle.hasOwnProperty(...)`); Finding 6 (`shipPrev` in `classMiddle`) is moot.
- `followsHood` (`:663-669`) remains wired at `:715` (`hoodScore: followsHood(row, id) ? hoodScores[hood] : null`). Grep confirms no other references to `BIZ_CLASS_MIDDLE`, `classMiddle`, or `followsHood`.
- Note on C116 `food` value in `BIZ_CLASS_MIDDLE`: `5.52` vs earlier pre-`e917708a4` `5.60` reflects moving `BIZ-00062` (`Dario's Bar`, `3.01`) into `Temescal` (`followsHood` true, adding `86`th food row). Consistent with `e917708a4`.

### 3. Disposition of the two rejected findings (2, 3)

- **Finding 2 (`MINT_GAME_TEAMS_` without `typeof` guard, `phase05-citizens/applyBusinessDynamics.js:546`):** Rejection **holds for production**. In Apps Script's flat namespace, `phase05-citizens/processAdvancementIntake.js:1981` defines `MINT_GAME_TEAMS_` alongside `applyBusinessDynamics.js`, and failing loudly rather than silently misclassifying `BIZ-00005` / `BIZ-00074` matches ADR-0016. Standalone Node test harnesses (`phase05-citizens/applyBusinessDynamics.test.js`, `scripts/businessOwnerDials.test.js`, `scripts/dialWave2Seams.test.js`) will require an explicit `MINT_GAME_TEAMS_` stub when test runs resume.
- **Finding 3 (child-area lookup mismatch at `:667, 715`):** Rejection **holds against live `Business_Ledger`**. `e917708a4` moved all four sub-area rows (`BIZ-00010`, `BIZ-00011`, `BIZ-00029`, `BIZ-00062`) to their canonical parent hoods and added intake/ingest refusal guards (`scripts/ingestPublishedEntities.js`, `scripts/processBusinessIntake.js`), leaving zero off-map non-`City-wide` rows on the live sheet. (Latent only: `:667, 715` still look up raw `hoodScores[hood]` while `:624-627, 696, 801` normalize through `bizHoodKey`, so a future manual sub-area edit on the sheet would still read `hoodScore: null`.)

---

## Checks Run

- `node --check phase05-citizens/applyBusinessDynamics.js` — `exit 0`
- 150-cycle local `bizDriftOne_` / `bizHoodScores_` iteration over C116 `Business_Ledger.jsonl` + `Neighborhood_Map.jsonl` — settled by Cycle 50 (`C50 == C150` quiet; bounded with feedback/noise/shock).
