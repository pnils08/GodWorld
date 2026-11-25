# Adversarial Review — engine.356 Bond Dials, Rival Fade, Children Gate & `e356q` Bench

**Date:** 2026-11-24  
**Brief:** [2026-11-24-es-brief-agy-e356-bond-dials-children.md](file:///root/GodWorld/docs/for-claude-review/2026-11-24-es-brief-agy-e356-bond-dials-children.md)  
**Commits reviewed:** [e788cafe7](file:///root/GodWorld/phase05-citizens/bondEngine.js) (`World_Config` migration of 17 bond dials) and [4b0776b04](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js) (HEAD: `bondMomentStepRival` `0.25 -> 0.1`, rival moments no longer hold off fade, minor/child tag gate, `e356q` bench scripts), diffed from PROD stage 84 (`82da34162`).  
**Verdict:** **SHIP-WITH-FIXES**

---

## Executive Summary

The 17-key `World_Config` migration (`ENGINE356_CONFIG_SEEDS` + `loadBondDials_` / `bondDial_`), the rival fade mechanics (`momentHolds` + `bondMomentStepRival = 0.1`), and the child naming/twinning gate (`childLine_`) are cleanly implemented on their core live paths, with exact constant parity against stage 84 (`bondDial_('bondRomanceAt') - 1` included). However, two offline test suites crash outright on HEAD (`engine302Marital.test.js` and `dialWave2Seams.test.js`), `withCandidates_` / `bondLineFor_` do not enforce `isEventEligible_` on minor contacts when a `childLine_` tag co-occurs with an adult-only tag, and `mirrorShared_` promotes mirrored minors into `S.cycleActiveCitizens` (making them eligible for `detectNewBonds_`). The `e356q` bench protocol has not yet been executed against SANDBOX 1004 (`test lock`).

---

## Findings

### F1 [Must Fix] — Two offline bond test suites crash on HEAD (`engine302Marital.test.js` & `dialWave2Seams.test.js`)

- **Pointer:** `scripts/engine302Marital.test.js:103-104, 129-500`; `scripts/dialWave2Seams.test.js:40, 60, 66, 78, 79, 83, 86, 233`; `phase05-citizens/bondEngine.js:274-290`
- **Failure (`input -> wrong output`):**
  1. `node scripts/engine302Marital.test.js` -> crashes at line `103` (`ReferenceError: BOND_ENCOUNTER_CHANCE is not defined`, exit `1`), after `e788cafe7` removed `var BOND_ENCOUNTER_CHANCE = 0.1`. Downstream calls (`detectNewBonds_`, `updateExistingBonds_`, `processRomanceAndMarriage_`, `processGCCourtship_`) also bypass `runBondEngine_` with bare `config: { cycleCount: 113 }` (`poolCtx` at `:186`, `deepCtx` at `:219`), so none of the 17 `bond*` keys are present and `BOND_DIALS_` is `null`.
  2. `node scripts/dialWave2Seams.test.js` -> crashes at line `60` (`Error: bondDial_: bondFadeBothAbsent read before loadBondDials_ — the bond engine runs from runBondEngine_`, exit `1`). Commit `e788cafe7` noted `engine302Marital` in its message, but `dialWave2Seams.test.js` constructs `config: { cycleCount: cycle }` (`:40`) without the 17 `bond*` dials and calls `w.updateExistingBonds_(ctx)` directly (`:60, 66, 78, 79, 83, 86, 233`).
- **Fix:** Seed the 17 `bond*` dials in both suites' synthetic `ctx.config` helpers and call `loadBondDials_(ctx)` (or route through `runBondEngine_` where appropriate), and remove/replace the deleted `B.BOND_ENCOUNTER_CHANCE === 0.1` export assertion in `scripts/engine302Marital.test.js:196` (plus `:104`).

### F2 [Should Fix] — `withCandidates_` and `bondLineFor_` check `childLine_` without checking `isEventEligible_` for the minor

- **Pointer:** `phase05-citizens/generateCitizensEvents.js:2896-2902, 2916-2924, 3011-3023, 3044-3055`; `phase05-citizens/citizenContextBuilder.js:123-138`
- **Failure (`input -> wrong output`):**
  `mirrorShared_` (`generateCitizensEvents.js:3011-3023`) gates a minor's mirrored twin on BOTH `childLine_(tags)` AND `isEventEligible_(oLs, eventClassFromTags_(tags))`. However, `withCandidates_` (`:2918`) and `bondLineFor_` (`:3050`) only check `childLine_(tags)`.
  - Input: An `Event_Content_Ledger` `$CONTACT` row combining a `childLine_` tag (`act:game`, `at:field`, `at:court`, `at:school`, `at:youth-program`, or `prog:youth*`) with an adult-only tag (e.g., `act:game,evening:nightOut,with:friend,shared:both`, `at:school,source:occupation,shared:both`, or `act:game,source:prevEvening` with a `<13` child friend/family member).
  - Wrong output: `withCandidates_` / `bondLineFor_` can still pick and name the minor on the adult citizen's log row (`contactPopId:<minor>`), while `mirrorShared_` rejects writing the twin onto the minor's row at `:3022` (`isEventEligible_`), producing both an out-of-place minor naming on the adult's adult-only line and silent one-sidedness on a `shared:both` row. (Note also that `output/engine-sheet/2026-11-24-e356q/read.js:116-117` would flag that missing `shared:both` twin as a `FAIL` because `LABEL === 'full' && parts.some(CHILD_TAG)` exempts nothing when `isEventEligible_` drops the twin.)
- **Fix:** Check `isEventEligible_` for minor `$CONTACT` candidates (or explicitly exclude `source:occupation`, `source:economy`, `relationship:romance`, `evening:nightOut`, and for `age <= 12` `source:prevEvening`/`evening:cityEventAttend`/`source:bias` in `withCandidates_` and `bondLineFor_`).

### F3 [Should Settle] — `mirrorShared_` adds mirrored minors to `S.cycleActiveCitizens`, entering them into `detectNewBonds_`

- **Pointer:** `phase05-citizens/generateCitizensEvents.js:3039, 3301-3302, 4682`; `phase05-citizens/bondEngine.js:643, 1216`; `phase05-citizens/runYouthEngine.js` (0 occurrences of `cycleActiveCitizens`)
- **Failure (`input -> wrong output`):**
  Minors normally exit `generateCitizensEvents_` at `:3302` (`if (isMinor) { minorsSkipped++; continue; }`), and `runYouthEngine_` does not populate `S.cycleActiveCitizens`. When an adult shares a `childLine_` + `shared:both` moment with a minor (`bench-lines.json` `kid.bench1` / `kid.bench2`), `mirrorShared_` executes `activeSetObj[oRow[iPopID]] = true` (`:3039`), which `:4682` publishes into `S.cycleActiveCitizens`.
  - Input: Adult `POP-A` draws `kid.bench1` (`shared:both`) with minor `POP-KID` (`simYear - BirthYear < 18`).
  - Wrong/unintended output: `POP-KID` enters `detectNewBonds_` (`bondEngine.js:1216`) and can form random new bonds (`neighbor`, `professional`, `tension`, etc.) with any other active citizen in `S.cycleActiveCitizens` (including unrelated adults), whereas `mirrorShared_` was only meant to record the mirrored moment and count as active for existing bonds. (Additionally, `bondEngine.js` `detectNewBonds_` already accepts minor/adult pairs whenever a minor is in `S.cycleActiveCitizens`, e.g., via household moments at `:3206`.)
- **Fix:** Confirm intent; if minors receiving mirrored lines should not initiate `detectNewBonds_` stranger encounters, omit `:3039` for minors (or filter minors at `detectNewBonds_`) if only adult participation belongs in random encounter formation.

### F4 [Low / Hygiene] — Module-global `BOND_DIALS_` retains state across direct helper invocations & omits boolean guard

- **Pointer:** `phase05-citizens/bondEngine.js:274-290`
- **Failure (`input -> wrong output`):**
  `BOND_DIALS_` is cached in module scope (`var BOND_DIALS_ = null`) rather than on `ctx`.
  - Input: Process calls `runBondEngine_(ctx1)` (populating `BOND_DIALS_` from `ctx1.config`), then calls `updateExistingBonds_(ctx2)` / `detectNewBonds_(ctx2)` directly with different `ctx2.config`.
  - Wrong output: `bondDial_` (`:286-289`) silently serves `ctx1`'s dial values instead of `ctx2`'s or throwing `"read before loadBondDials_"`. Also, `loadBondDials_` (`:279`) uses `Number(v)` without checking `typeof v === 'boolean'`, so calling `loadBondDials_` directly without `ensureEngine356Config_` (`engine94SheetContract.js:816`) would accept `true`/`false` as `1`/`0`.
- **Fix:** Store parsed dials on `ctx._bondDials` (cleared or scoped per `ctx`), and reject `typeof v === 'boolean'` in `loadBondDials_`.

---

## Attack-by-Attack Verification

1. **All 17 bond dials (`e788cafe7`, `phase01-config/engine94SheetContract.js:544-560`, `phase05-citizens/bondEngine.js`)**:
   - Verified all 17 keys match old values identically, have zero duplicate keys across all 265 entries in `*_CONFIG_SEEDS`, and replace every site of the 8 removed `var` constants plus the 9 inline literals (`bondWeeklyRival` `:729`, `bondWeeklyAlliance` `:731`, `bondWeeklyMentor` `:733`, `bondWeeklyFestival` `:735`, `bondWeeklySportsRival` `:737`, `bondWeeklyFriend` `:745, :750`, `bondWeeklyUpkeep` `:754`, `bondRomanceStepChance` & `bondRomanceStepChanceApart` `:766`, `bondRomanceStep` `:797`, `bondFadeOneAbsent` & `bondFadeBothAbsent` `:902`, `bondDeepenAt` `:937`, `bondEncounterChance` `:1256`, `bondRomanceAt` `:2395, :2834`, `bondRomanceChance` `:2398`, `bondMarriageAt` `:2424, :2645, :2945`).
   - Precedence check at `bondEngine.js:2834`: `bondDial_('bondRomanceAt') - 1` evaluates to `(5.5) - 1 = 4.5` — exact match to `ROMANCE_THRESHOLD - 1`.
   - Remaining literals in `bondEngine.js` (`rr < 0.02` `+1.0` `:796`, shock/cycleWeight/sentiment/calendar/arc modifiers `:809-887`, off-season/holiday decay `:886, :908, :913`, dormant `<= 1` / wake `>= 3` `:921, :924`, tension `>= 6` / `<= 2 && bondAge > 3` `:930, :933`, `TRIANGLE_BIRTH_INTENSITY = 5` `:1978`, `CONFRONT_ADAPT = 6` `:1979`, `HOME_OWNED_COURTSHIP_BOOST = 2.0`, `HOUSEHOLD_COURTSHIP_BOOST = 1.5`, `GC_*` `:1984-1986`) are intentional engine physics/modifiers, not missed copies of the 17 moved numbers.
2. **`loadBondDials_` timing & callers**:
   - All production entrypoints (`phase01-config/godWorldEngine2.js:765, :2486` and `phase08-v3-chicago/v3Integration.js:50`) invoke `runBondEngine_(ctx)`, which calls `loadBondDials_(ctx)` first (`bondEngine.js:294`).
   - Both test failures documented in **F1** (`engine302Marital.test.js`, `dialWave2Seams.test.js`). No other tests in `scripts/` call `updateExistingBonds_` / `detectNewBonds_` / `processRomanceAndMarriage_` / `processGCCourtship_` directly (`sportsWeekCity.test.js`, `dialGates.test.js`, `householdReconcile.test.js`, `engine304FamilyLottery.test.js`, `hoodBlindTexture.test.js` all passed).
3. **`World_Config` parsing (`loadConfig_` vs `inspectEngine94Config_` vs `loadBondDials_`)**:
   - Trailing whitespace `"5.5 "`: `inspectEngine94Config_` (`engine94SheetContract.js:815`), `loadConfig_` (`godWorldEngine2.js:1031`), and `loadBondDials_` (`bondEngine.js:279`) all parse cleanly to `5.5`.
   - Spaces-only `"   "`: `inspectEngine94Config_` (`:815-817`) misses it (`Number("   ") === 0`), `loadConfig_` leaves `"   "` as string (`parseFloat("   ")` is `NaN`), and `loadBondDials_` (`:279`) catches it (`String(v).trim() === ''`) and throws loudly.
   - Comma string `"1,5"`: rejected by `inspectEngine94Config_` (`Number("1,5")` is `NaN`) in `runWorldCycleLocked_` (`godWorldEngine2.js:601`) before `loadConfig_`; if `loadConfig_` is invoked standalone without `ensureEngine356Config_`, `parseFloat("1,5")` silently becomes `1` (`godWorldEngine2.js:1031`).
4. **`childLine_` & `prog:youth` & `BirthYear` edge cases**:
   - `prog:youth*` matches `youth-sports` (`PRG-002..007` in `output/beats/Community_Programs.jsonl:2-7`) and does not falsely match `economic`, `mutual-aid`, `arts`, `health`, `civic`, `transit`, `gala`, or `tech-education`. (Note `PRG-017` "NeuroCity Youth Lab" has `Type: "tech-education"` and `PRG-033` "Darrin Davis Youth Community Events" has `Type: ""`, so lines matching those only allow minors if also tagged `at:youth-program`/`at:school`/`at:field`/`at:court`/`act:game` — conservative/fail-closed.)
   - Blank or `<= 1900` `BirthYear` is handled identically as non-minor across `loadWithIdx_` (`:2884`), `mirrorShared_` (`:3011`), main loop (`:3301`), and `deriveLifeState_` (`citizenContextBuilder.js:65`). (Only corrupt `BirthYear >= 2100` would diverge between `deriveLifeState_` adult fallback and `wBy > 1900 && simYear - wBy < 18` minor.)
   - Every person-naming path in `generateCitizensEvents_` passes `childLine_` (`hasWith_` `:2943`, `pickWith_` `:2947` for both `$CONTACT` `:4267` and `entry.template` `:4333`, `bondLineFor_` `:3050` called at `:4233`, `mirrorShared_` `:3011`). Template lines (`templatePool` `:2695-2701`) carry no child tags, so `entry.template` falls back to `"someone familiar"` when only minors are candidates (`contact.popId = ""`). See **F2** and **F3**.
5. **No-ask lines (`asks.length === 0`)**:
   - On a line with `childLine_` and no `with:` tags (`withCandidates_` `:2920`, `bondLineFor_` `:3052`), `rival` is excluded; any active `friend`, `family`, `neighbor`, `mentor`, `colleague`, `acquaintance`, or `partner` minor could be picked. Minors in sim do not marry/romance (`AGE_RANGES.WEDDING` `20-65`).
6. **Rival fade (`4b0776b04`, `bondEngine.js:714, 900-904`, `engine94SheetContract.js:542`)**:
   - `momentStep.rival` seeds at `0.1`. `momentHolds` (`:900`) is `false` for `RIVALRY`, `TENSION`, and `SPORTS_RIVAL` (exact match to `:714`).
   - Verified math when `hadMoment === true` and `!(aActive && bActive)` (e.g. one-sided line, neutral warmth `1.0`): `+0.1 - 0.5 * (2 - 1.0) = -0.4` net; when both active: `+0.1 + 1.5 = +1.6` (`RIVALRY`/`TENSION`) or `+0.1 + 1.0 = +1.1` (`SPORTS_RIVAL`). Dormant (`<= 1` at `:921`) and tension-settles (`<= 2 && bondAge > 3` at `:933`) thresholds continue to operate as designed.
7. **`e356q` bench scripts (`output/engine-sheet/2026-11-24-e356q/`)**:
   - Checked `apply-bench.js`, `bench-lines.json`, `bench-push.sh`, `compare.js`, `push.sh`, `read.js`, `run.sh`. All syntax checks clean.
   - `compare.js` checks exact bond row count, per-row `BondId|CitizenA|CitizenB|BondType` lookup on Intensity + Status, and sorted `LifeHistory_Log` `[POPID, EventTag, EventText]` equality. (Only theoretical blind spot: duplicate `key(r)` rows in `Relationship_Bonds` would collide in `new Map`, unlikely given distinct `BondId`s.)
   - `read.js` checks all 17 `BOND_SEEDS` on `LABEL !== 'base'` (`:150`), checks `bondMomentStepRival === 0.1` and requires `minorChildLines > 0` on `LABEL === 'full'` (`:151-152`), drops rivals from `FLOOR` on `LABEL === 'full'` (`:167`), and fails if `floorChecked < 20` (`:201`). One minor caveat noted in **F2** at `read.js:116-117`. (Note stale comment `stage 83 (PROD, e356n-prod.sha256)` in `bench-push.sh:2`; code uses `e356p-prod.sha256` / `82da34162` at `:13`.)

---

## Checks & Evidence

- **Syntax (`node --check` / `bash -n`)**: `EXIT:0` (`SYNTAX_OK`) across `phase05-citizens/bondEngine.js`, `phase05-citizens/generateCitizensEvents.js`, `phase01-config/engine94SheetContract.js`, `output/engine-sheet/2026-11-24-e356q/{apply-bench.js,read.js,compare.js,run.sh,push.sh,bench-push.sh}`.
- **Offline test runs on HEAD (`4b0776b04`)**:
  - `node scripts/engine302Marital.test.js` -> **FAIL (`EXIT:1`)**: `ReferenceError: BOND_ENCOUNTER_CHANCE is not defined` at `:103` (16 assertions before line 103 passed; rest skipped due to crash).
  - `node scripts/dialWave2Seams.test.js` -> **FAIL (`EXIT:1`)**: `Error: bondDial_: bondFadeBothAbsent read before loadBondDials_` at `:60`.
  - `node scripts/engine94SheetContract.test.js` -> **PASS (`EXIT:0`, `30/30 passed`)**.
  - `node scripts/contentLedgerCompose.test.js` -> **PASS (`EXIT:0`, `98 passed, 0 failed`)**.
  - `node scripts/citizensEventsFame.t3.test.js` -> **PASS (`EXIT:0`, `19 passed, 0 failed`)**.
  - `node scripts/hoodCrimeBandsBlank.test.js` -> **PASS (`EXIT:0`, `17 passed, 0 failed`)**.
  - `node scripts/sportsWeekCity.test.js`, `node scripts/dialGates.test.js`, `node scripts/householdReconcile.test.js`, `node scripts/engine304FamilyLottery.test.js`, `node scripts/hoodBlindTexture.test.js` -> all **PASS (`EXIT:0`)**.
- **Config key uniqueness check**: verified `265` keys across all `*_CONFIG_SEEDS` arrays in `phase01-config/engine94SheetContract.js`, `dups: []`.
- **Sandbox bench (`e356q`)**: NOT run (test lock active; inspected statically only).

---

## Haiku Wiring Cards

Attached from `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5`:

- [`runBondEngine_` wiring card](file:///root/GodWorld/output/agent_engine-wiring_2026-11-25T05-55-09.md) (`127/127` engine phase files opened; callers: `godWorldEngine2.js:765`, `:2486`, `v3Integration.js:50`; reads `holiday`, `holidayPriority`, `isFirstFriday`, `isCreationDay`, `sportsSeason`, `relationshipBonds`, writes `relationshipBonds`, `pendingConfrontations`, `ctx._bondKeySet`, `ctx.bondCalendarContext`).
- [`generateCitizensEvents_` wiring card](file:///root/GodWorld/output/agent_engine-wiring_2026-11-25T05-55-36.md) (`127/127` engine phase files opened; callers: `godWorldEngine2.js:755`, `:2476`; writes `cycleActiveCitizens` `@ :759, 3224, 4682`, `sharedMoments` `@ :4574, 4576`, `citizenEvents`, `eventsGenerated`, `storyHooks`, `biasIntents`, `faithExposures`, `minorsSkippedTexture`; reads `Community_Programs`, `Faith_Organizations`, `Generic_Citizens`, `LifeHistory_Log`, `Judicial_Ledger`).
