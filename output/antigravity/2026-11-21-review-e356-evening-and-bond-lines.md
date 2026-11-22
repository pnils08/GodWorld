# Adversarial Review — engine.356: Evening Places & Bond Log Lines

- **Date:** 2026-11-21 · **Lane:** antigravity (`agy`) · **Mode:** Read-only code review
- **Brief:** `docs/for-claude-review/2026-11-21-es-brief-agy-e356-evening-and-bond-lines.md`
- **Plan:** `docs/plans/2026-11-21-a-moment-has-a-place.md`
- **Commits reviewed:** `a15dbb895` (stage 67), `16a67a8e9` (stage 67), `fbf6a0707` (stage 68), `11bfb6100` (repo `HEAD`, not on PROD)
- **Verdict:** **HOLD** for live PROD (stage 68 lacks `11bfb6100`); **SHIP-WITH-FIXES** on repo `HEAD` (`11bfb6100`)

---

## Live PROD Gate (Stage 67–68 without `11bfb6100`)

Stage 68 is running `a15dbb895`, `16a67a8e9`, and `fbf6a0707` without repo fix `11bfb6100`:

1. **`|source:bond` breaks milestone readers (`phase05-citizens/bondEngine.js` at `fbf6a0707`):**
   - `appendBondLifeLine_` wrote `<tag>|source:bond` to `LifeHistory_Log`.
   - `lib/wakePerception.js:56,71` (`MILESTONE_TAGS = /^(Wedding|Birth|Retirement|Graduation|Stabilized|Health)$/i`) rejects `'Wedding|source:bond'`, so `loadLifeArc` drops the wedding.
   - `scripts/buildCitizenCards.js:935,940` (`ARCH_MILESTONE_RE = /^(Wedding|Marriage|Divorce|Birth|Death|Retirement|Promotion)$/i`) rejects `'Wedding|source:bond'` and `'Divorce|source:bond'` once archived to `LifeHistory_Archive`.
   - `scripts/buildWorldSummary.js:301,314-315` (`WHO_LIVED_IT_TAGS.includes(tag)`) rejects `'Wedding|source:bond'` because `whoLivedKind_` only strips graded suffixes, not `|source:bond`.
2. **`evening:watched` / `evening:watchedSports` inverted under grief & outabout (`phase05-citizens/generateCitizensEvents.js` at `16a67a8e9`):**
   - `applyGriefPoolWeights_` lacked the `nightIn` guard, multiplying `evening:watched` and `evening:watchedSports` by `griefConfig.publicActivityMultiplier`.
   - The `dialBands` loop multiplied `source:prevEvening` by `dm.outabout` with no inverse branch, pushing homebodies away from staying home to watch TV and failing to select `evening:watchedSports` by `dm.fandom`.

Deploying `11bfb6100` resolves both stage 68 regressions. The findings below apply at `HEAD` (`11bfb6100`).

---

## Findings at `HEAD` (`11bfb6100`)

### 1. [Medium] `snapshotEveningForCarryForward_` drops `bizId` on `famousSeen` (`evening:sawFamous` never carries `biz:`)

- **Locations:** `phase07-evening-media/buildEveningFamous.js:500`, `phase09-digest/finalizeCycleState.js:459-463`, `phase05-citizens/generateCitizensEvents.js:1867,1879,1902`
- **Mechanism:** `buildEveningFamous_` attaches a real `Business_Ledger` venue to sightings as `sighting.venue = { bizId: venue.bizId, name: venue.name }` (`buildEveningFamous.js:500`). When `snapshotEveningForCarryForward_` writes `snapshot.famousSeen` (`finalizeCycleState.js:459-463`), it stores `{ name, neighborhood, venue: fs.venue.name }` and omits `bizId`. In `previousEveningPool_`, the design states `"Each line carries the place's hood and BIZ_ID as tags, so the record says where"` (`generateCitizensEvents.js:1867`), and `eTags("evening:sawFamous", fsn)` checks `if (p && p.bizId) t.push("biz:" + p.bizId)` (`generateCitizensEvents.js:1879,1902`).
- **Failure (`input -> wrong output`):**
  `sighting = { name: "Vinnie Keane", neighborhood: "Jack London", venue: { bizId: "BIZ-00015", name: "Yoshi's" } }`
  -> `snapshot.famousSeen[0]` is `{ name: "Vinnie Keane", neighborhood: "Jack London", venue: "Yoshi's" }` (no `bizId`)
  -> citizen draws `"saw Vinnie Keane at Yoshi's last night"` with `EventTag = PrevEvening-Outabout-Up-S|source:prevEvening|evening:sawFamous|nh:Jack London` instead of including `|biz:BIZ-00015`.

### 2. [Medium] Downstream `LifeHistory_Log` readers omit `Divorce` and leave `Wedding` / `Divorce` at lowest street priority

- **Locations:** `world-view/build.js:15-25`, `scripts/buildWorldSummary.js:301,314-315`, `scripts/buildLivesSlice.js:53,178` (triggered by `phase05-citizens/householdFormationEngine.js:1177,1178,1188` calling `appendBondLifeLine_`)
- **Mechanism:**
  - `processDivorces_` now queues `'Divorce'` rows to `LifeHistory_Log` via `appendBondLifeLine_`. While `scripts/buildCitizenCards.js:935` (`ARCH_MILESTONE_RE`) and `lib/wakePerception.js:559` (`SALIENT_TAG`) match `Divorce`, `scripts/buildWorldSummary.js:301` (`WHO_LIVED_IT_TAGS`) omits `'Divorce'`, and `scripts/buildLivesSlice.js:53,178` (`LIFE_TAGS`, `SIGNAL_TAG`) omits `'Divorce'`.
  - `world-view/build.js:15-25` (`kindOf`) assigns priorities `0..5` to career/relocation/household/strain/work/sports tags, leaving `Wedding`, `Divorce`, `Bond`, `Faith-Drift`, `TrustGuarded`, `ConnectionWithdrawn`, and `ConnectionMaintained` at the default fallback `['p', 6]`.
- **Failure (`input -> wrong output`):**
  1. Citizen divorces in Cycle `N` -> `LifeHistory_Log` gets `EventTag = Divorce`, `EventText = "the marriage to ... ended"` -> `buildWorldSummary.js` omits them from `## Who Lived It`, and `buildLivesSlice.js` drops the row from `momentPool` and ranks it below signals in `threadFor`.
  2. Citizen marries (`Wedding`, priority `6`) or divorces (`Divorce`, priority `6`) in the same Cycle they draw a `Work` (`4`), `Strain` (`3`), or `Household` (`2`) row -> `world-view/build.js:43,111` picks the lower-significance texture/strain line as the citizen's lead `p.x` on the street page.

### 3. [Low] `hospitalized` citizens are eligible for `evening:nightOut` / `evening:dinedOut`, and `evening:watched` maps to `eveningOut`

- **Locations:** `phase05-citizens/generateCitizensEvents.js:2926,3144,3696-3703` and `phase05-citizens/citizenContextBuilder.js:110,120-134`
- **Mechanism:**
  - `generateCitizensEvents_` (`:2926`) excludes only `deceased`, `traded`, and `pending` rows; `hospitalized`, `critical`, and `serious-condition` citizens still enter the pool loop, and `isEventEligible_` (`citizenContextBuilder.js:129`) only gates `eveningOut` on `ls.band !== "child"`.
  - `eventClassFromTags_` (`citizenContextBuilder.js:110`) maps any entry with `"source:prevEvening"` to `"eveningOut"`, which includes `"evening:watched"` and `"evening:watchedSports"` (staying home). Today `generateCitizensEvents.js:2961` (`if (isMinor) continue;`) prevents minors from reaching `isEventEligible_`, so the misclassification is latent in direct callers of `isEventEligible_`.
- **Failure (`input -> wrong output`):**
  Active citizen row with `Status = "hospitalized"` (set by `generationalEventsEngine.js` / `chaosCarsEngine.js`) enters `previousEveningPool_` (`:3144`) -> `isEventEligible_` returns `true` for `eveningOut` -> citizen can log `"spent last night at <NightSpot>"` (`weight 2.0`) or `"went over to <Restaurant> in <Hood> for dinner last night"` (`weight 1.2 * oa`) while hospitalized.

### 4. [Low] `processFaithJoins_` drift check indexes `ctx.ledger.rows` without filtering `Status`

- **Location:** `phase05-citizens/bondEngine.js:1021-1028,1079-1091`
- **Mechanism:** `buildBondLedgerIndex_` (`bondEngine.js:2199`) skips any ledger row with `status !== 'active'`. In contrast, `processFaithJoins_` (`:1021-1028`) maps every `ctx.ledger.rows[flr]` into `idxByPop` with no `Status` check.
- **Failure (`input -> wrong output`):**
  `deceased` or `inactive` citizen still present in `Faith_Organizations.MembersList` rolls `< FAITH_DRIFT_CHANCE` at `:1082` -> `idxByPop[pop]` resolves -> `:1090` calls `appendBondLifeLine_(ctx, goneIdx, 'Faith-Drift', ..., cycle)`, writing a fresh Cycle-`N` `Faith-Drift` entry to their `LifeHistory` cell and `LifeHistory_Log`.

### 5. [Low] `detectTriangle_` omits `withPop` on `TrustGuarded`

- **Location:** `phase05-citizens/bondEngine.js:2954-2955` (compare `:2017,2051`)
- **Mechanism:** `noteBondConnectionShift_` (`:2017`) passes `otherId` as the 6th argument (`withPop`) to `appendBondLifeLine_`, producing `TrustGuarded|contactPopId:POP-XXXXX`. `detectTriangle_` (`:2954-2955`) calls `appendBondLifeLine_(ctx, si.idx, 'TrustGuarded', ..., cycle)` with 5 arguments even though the rival (`suitors[j]` / `suitors[i]`) and shared interest (`popId`) are in scope. (No current `LifeHistory_Log` reader parses `contactPopId`, so impact today is schema inconsistency between the two `TrustGuarded` paths.)

---

## Checks Passed & Verified Clean

1. **Double writes (`Attack #2`):** `appendBondLifeLine_` is the single live writer for `Wedding` (`generationalEventsEngine.checkWedding_` is retired/uncalled at `generationalEventsEngine.js:559-562`; `householdFormationEngine.js:1088` only regex-reads `[Wedding]`), `Divorce` (`householdFormationEngine.js:1177,1178,1188`), `Faith` / `Faith-Drift` (`faithEventsEngine.js` writes no citizen lines), `Bond`, `ConnectionWithdrawn`, `ConnectionMaintained`, and `TrustGuarded`. Dials fold from `Simulation_Ledger.LifeHistory`, not `LifeHistory_Log`.
2. **`LifeHistory_Log` readers (`Attack #1`):**
   - `phase05-citizens/generateCitizensEvents.js:561-575,3103-3104` (`lastEventCycleByPop` / `ANTI_INERT_N`): Phase5-CitizenEvents runs before Phase5-Bonds (`godWorldEngine2.js:684,694`) and intents run in Phase10; from Cycle `C+1`, bond/faith log rows update `lastEventCycleByPop`, matching the all-generators coverage design (`:557`).
   - `utilities/archiveLifeHistory.js:76-118`, `phase05-citizens/processAdvancementIntake.js:1679-1680`, `phase07-evening-media/buildContractSeeds.js:320-359`, `scripts/worldViewCheck.js:118,195-210`, `scripts/buildCitizenWeekDigest.js:33,194-200`, `scripts/engine-auditor/generateBaselineBriefs.js:45-53,254-256`, `scripts/engineAuditor.js:187-197`, `phase05-citizens/citizenContextBuilder.js:483-537`: none misread, double-count, or trip on the new rows at `HEAD` (`11bfb6100`).
3. **Evening carry-forward & pool guards (`Attack #3`):**
   - Old snapshot (absent `restaurants`/`fastFood`/`nightSpots`/`tv`/`movies`/`sportsBroadcast`/`famousSeen`) or empty strings safely add 0 entries (`generateCitizensEvents.js:1883-1912`).
   - `PropertiesService` 9 KB cap is already guarded by `saveCarryForwardBlob_` (`phase01-config/loadPreviousEvening.js:125-142`), which deletes an oversized prop and falls back to `Carry_Forward_Store`.
   - Note: `prev.famousNames` (`generateCitizensEvents.js:1978-1982`, pre-356) has no `selfName` guard (low/pre-existing), whereas `famousSeen` (`:1899`) checks `fsn.name === selfName` against `(First + " " + Last).trim()`, matching `buildEveningFamous.js:191,210,239` for ledger citizens.
4. **Dial direction & tag order (`Attack #4`):**
   - `dialBands` loop (`generateCitizensEvents.js:3791-3806`): `source:prevEvening` multiplies `dm.outabout`, and `evening:watched` (`(2 - dm.outabout) / dm.outabout`) / `evening:watchedSports` (`dm.fandom / dm.outabout`) cleanly cancel `dm.outabout` and yield `2 - dm.outabout` / `dm.fandom`. No other tag on those entries matches `:3793-3805`. (`eTravels` at `:1889` sets `1.2 * eOa` before `:3796`, yielding `1.2 * oa^2 <= 2.7 < 3.0`, staying below home-hood `2.0 * oa`.)
   - `gradedTagFor_` (`:1334-1358`): `prevEvePool` tags precede `mergeTags(..., calendarTags)` (`:3146`); `calendarTags` (`:1151-1159`) contain no `dial:*` or `DIAL_BY_FACT_TAG` keys, and context tags (`:4102-4113`) merge *after* `gradedTagFor_`. Results are `PrevEvening-Outabout-Up-S` (`dinedOut`/`nightOut`/`sawFamous`), `PrevEvening-Outabout-Down-S` (`watched`), and `PrevEvening-Fandom-Up-S` (`watchedSports`); `eveningNamedTag_` (`:261-268,3990`) suppresses `" near <venue>"`; `PULSE_MAP` (`utilities/neighborhoodPulseMap.js`) ignores `PrevEvening`.

---

## Verification Run (Read-Only)

- `node --check phase05-citizens/bondEngine.js phase05-citizens/generateCitizensEvents.js phase09-digest/finalizeCycleState.js` — clean (`exit 0`)
- `node scripts/citizenDials.test.js` — `90 passed, 0 failed`
- `node scripts/dialWave2Seams.test.js` — `27 passed, 0 failed`
- `node scripts/engine299Graded.test.js` — `18 passed, 0 failed`
- `node scripts/dialMoves.test.js` — `36 passed, 0 failed`
- `node scripts/eveningSeedHoods.test.js` — `11 passed, 0 failed`
- `node scripts/buildWorldSummary.test.js` — `325 passed, 0 failed` (`Test 12` live Sheets skipped, `CANON_PRESENT=false`)

---

## Wiring Cards Attached

- **`LifeHistory_Log` (tab):** `output/agent_engine-wiring_2026-11-21T23-58-32.md` — 28 writers (all before `Phase10-ExecuteIntents` at `godWorldEngine2.js:896` prod / `:2595` cycle-phases), 38 readers, `maintainLifeHistoryLog_` in Phase 11 (`:913` / `:2608`).
- **`appendBondLifeLine_` (`phase05-citizens/bondEngine.js:2021`):** `output/agent_engine-wiring_2026-11-21T23-59-16.md` — `Phase5-Bonds` (`godWorldEngine2.js:694` prod / `:2415` cycle-phases, before `Phase10-ExecuteIntents`), 16 callers across `bondEngine.js` (`1049, 1090, 2017, 2250, 2251, 2339, 2340, 2502, 2503, 2735, 2954, 2955`) and `householdFormationEngine.js` (`1177, 1178, 1188`), direct mutation on `ctx.ledger.rows[ledgerIdx][iLife]` + queued intent to `LifeHistory_Log` (`:2052-2053`, priority `60`).
