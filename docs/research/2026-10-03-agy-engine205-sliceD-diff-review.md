# engine.204/205 slice D — adversarial diff review

**Verdict:** SHIP-WITH-FIXES

### Findings

1. **Any path where a business that is not a bar/restaurant/hospitality takes the sports term**
   * **Hold/Fix:** `phase05-citizens/applyBusinessDynamics.js:197`
   * `bizIsBar_` uses `/\bfood\b/i`, which will broadly match any sector containing the standalone word "food" (e.g., "Pet Food", "Food Processing", "Seafood"). This pulls non-hospitality businesses into the sports term. The regex should strictly target the spec's classes.

2. **A game week with g=0 or no S.sportsWeek producing any term or ripple**
   * **Ship:** `phase05-citizens/applyBusinessDynamics.js:530,582,713`
   * The logic holds. If `g=0` or `S.sportsWeek` is empty, `sportsGame` is false, bypassing `bizIsBar_` and keeping `barTerm` at 0. Since no IDs are pushed to `barIds`, the `if (barIds.length)` ripple gate safely prevents any ripple from being written.

3. **The term bypassing the event cap ±2 or the weekly drift cap**
   * **Ship:** `phase05-citizens/applyBusinessDynamics.js:427`
   * The caps hold perfectly. `sportsPp` is added to `ev`, which is then immediately clamped by `bizClamp_(ev, -2.0, 2.0)` (the ±2 event cap). The resulting `drift` is then bounded by `bizDriftMaxDown` and `bizDriftMaxUp` (the ±1pp weekly drift cap).

4. **The share formula vs §2.3 (home games at the franchise venue only, away games at nightlife hoods at reach, capped 1)**
   * **Ship:** `utilities/sportsWeekRecord.js:261`
   * The formula correctly implements the spec. Home games (`vs=1`) yield `1` at the venue and `0` elsewhere. Away games (`vs=0`) yield `reach` at nightlife hoods (including the venue if it is one) and `0` at non-nightlife hoods. The `Math.min(1, share)` correctly caps the multiplier per hood per franchise.

5. **The nightlife median gate when NightlifeProfile is blank on some hoods**
   * **Hold/Fix:** `phase05-citizens/applyBusinessDynamics.js:269`
   * `bizNightlifeMedian_` skips hoods with blank or null profiles instead of treating them as `0`. This artificially raises the median by shrinking the population to only non-blank hoods, resulting in fewer than the spec's mandated half (11 of 22 hoods) passing the nightlife gate.

6. **Child-area hoods (bizHoodKey) resolving wrong**
   * **Hold/Fix:** `phase05-citizens/applyBusinessDynamics.js:550`
   * `bizHoodKey` relies on `typeof resolveHoodOrChild_ !== 'function'` to check for the resolver. In the Node.js bench environment (which surfaced the slice D fire), `resolveHoodOrChild_` is not globally required/mocked. It evaluates to `'undefined'`, so `bizHoodKey` silently returns `''`. The child area then falls back to its raw string (`barHood = '' || hood`) and fails the `ns[barHood]` lookup for its parent's venue and nightlife.

7. **The bizSectorClass_ regex change breaking any other class match on the live sector list**
   * **Hold/Fix:** `phase05-citizens/applyBusinessDynamics.js:187` and `scripts/ingestPublishedEntities.js:869`
   * The `\bpub\b` fix correctly excludes "Public Transit", but by requiring a word boundary on both sides, it breaks valid sector suffixes like "brewpub" or "gastropub", pulling them out of the food class. `pub\b` would have fixed the prefix issue while preserving the valid suffixes.

8. **The units call: spec signed x 0.02 vs bizSportsWeekPp 2.0 on a whole-percent Growth_Rate**
   * **Ship:** `phase01-config/engine94SheetContract.js:129` and `phase05-citizens/applyBusinessDynamics.js:426`
   * The units are correct. `Growth_Rate` is a whole percent (e.g., 5.69), and `drift` is added directly to `biz.growth`. A `bizSportsWeekPp` of 2.0 adds up to 2.6 points (with food volatility 1.3), which maps perfectly to the spec's intent to convert the old `0.02` fraction to whole percentage points.

### Disposition (es, 2026-10-03 04:00 — each finding checked against the code)

- 1 NOTE: the food class regex already reads any "food" sector as food; no "Pet Food"/"Food Processing" row on the live list (176 rows). No change.
- 2, 3, 4, 8 SHIP — agree.
- 5 REJECT: 22/22 Neighborhood_Map rows carry NightlifeProfile live; reading a blank as 0 would invent a value. The gate is the median of the known profiles; "11 of 22" was a description of today, not a rule.
- 6 REJECT: premise wrong — the bench runs in Apps Script, where `resolveHoodOrChild_` (phase01-config/canonNeighborhoodLoader.js:441) and `S.canonHoods` exist; the raw-hood fallback is the offline harness only.
- 7 FOLDED: `pubs?\b` in both copies (engine + Node mint table) — "Public X" stays out, gastropub / brewpub / "Pubs & Taverns" stay food; test extended.
