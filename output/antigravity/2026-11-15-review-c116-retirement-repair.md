# Adversarial Review — C116 False-Retirement & Salary Repair Plan

- **Reviewer:** `agy` (Antigravity)
- **Date:** 2026-11-15
- **Target Brief:** `docs/for-claude-review/2026-11-15-rb-brief-agy-c116-retirement-repair.md`
- **Verdict:** **SHIP-WITH-FIXES**

---

## Executive Summary & Blocking Fixes Before Running the Repair

The repair plan's root-cause trace is sound, but **six concrete defects in the plan or live downstream state will corrupt C116/C117 state if the plan is executed verbatim**:

1. **[CRITICAL — Attack #5] Tonight's `Question` wake on `POP-00018` and `POP-00527` can file an `Advancement_Intake1` row that re-clobbers `RoleType`, `ClockMode`, and `Income` at C117 (`VERIFIED`):**
   - `scripts/citizen-wake.js:225-227` injects `nextChapter.questionFrame(questionText, tier)` (`lib/nextChapter.js:78-85`) into **every** `lived:question` wake, regardless of whether the citizen is retired or active on `GAME` clock.
   - `questionFrame` (`lib/nextChapter.js:27-34, 78-85`) forces the model to end with `MOVE: role=<Sports Broadcaster / Color Analyst | Sports Analyst (Front Office) | Club Coach / Instructor | Scout | College Coach | Youth Academy Director | none>`.
   - Furthermore, the C116 `question` feed row (live `Oakland_Sports_Feed` row 285, stripped from `output/beats/Oakland_Sports_Feed.jsonl` by `lib/feedPrivacy.js:24`) listed **both** `POP-00018` and `POP-00527` in `NamesUsed`, so `sportsAsk_` (`phase05-citizens/applyGameNightMoments.js:559-570`) wrote the exact same Benji Dillon free-agency/bullpen question into **both** `POP-00018`'s and `POP-00527`'s `LifeHistory` and `LifeHistory_Log` (window rows `2602` and `2603`).
   - If either `POP-00018` or `POP-00527` emits any `MOVE: role=<POOL role>` other than `role=none` during their owed wake, `fileNextChapter` (`scripts/citizen-wake.js:280-332`) appends a row to `Advancement_Intake1` (`citizen-wake.js:328`). At C117, `processAdvancementIntake_` (`phase05-citizens/processAdvancementIntake.js:903-956`) will overwrite their `RoleType` (`L913`), flip their `ClockMode` (`L955`, e.g., `MEDIA` or `ENGINE`), and run `jobReferencePay_` / `rederiveIncomeForRole_` (`L933-943`) — which **ignores `EconomicProfileKey=SPORTS_OVERRIDE`** and slashes their `$13,000,000` / `$30,000,000` salaries back down to catalog pay (`~$75k–$180k`).
2. **[HIGH — Attack #2 & #7] Do NOT revert `DisplacementRisk` on `POP-00527` (`2 → 1`) or `POP-00598` (`6 → 5`) (`VERIFIED`):**
   - `assessDisplacementRisk_` (`phase05-citizens/migrationTrackingEngine.js:243-296`) did **not** raise `DisplacementRisk` because of the income bug. `POP-00527` owns (`HH-0084-371`, `HousingType: "owned"`, skipped at `L255`) and `POP-00598` has `savedBuffer = true` (`HouseholdSavings: 10,033,647 >= 2450 * 12` at `L256`, rent burden `1.07% < 30%` at `L261`).
   - Instead, `DisplacementRisk` rose by `+1` for **all 135 residents of West Oakland** (`HousingPressure` `4.5` → `Math.floor(4.5/2) = 2` vs `1`) and **all 108 residents of Fruitvale** (`HousingPressure` `8.5` → `Math.floor(8.5/2) = 4` vs `3`). Reverting those two cells creates a false hand-write discrepancy that C117 will immediately overwrite back to `2` and `6`.
3. **[HIGH — Attack #7] `LifeHistory_Log` row numbers (`2545, 2547, 2549` and `4627, 4634, 4635`) are 1-based line numbers inside the 4,920-row C115–C116 dump window, NOT live sheet row numbers, and deleting top-down shifts subsequent rows (`VERIFIED`):**
   - `scripts/dumpBeatTabs.js:58-92` dumps only `Cycle >= 115` (`4,920` rows in `output/beats/LifeHistory_Log.jsonl`). On the live `LifeHistory_Log` tab, rows must be matched by `(Cycle=="116", POPID, EventTag)` and deleted **bottom-up** (highest sheet row index first) so deleting the 3 `Retirement` rows does not shift the row indices of the 3 `Maneuver-Climb` rows by `-3`.
4. **[HIGH — Attack #4] Re-POSTing `wd-summary` and `wd-snapshot` via `runCycle.js` does NOT overwrite by `customId` (`VERIFIED`):**
   - `ingestSummary` (`scripts/runCycle.js:168-188`) sends `POST /v3/documents` with **no `customId` field at all** (`L178-182`). Worse, Supermemory's `/v3/documents` `POST` duplicate rule (`lib/citizenPage.js:77-80`) **appends** (`"old\n\n---\n\nnew"`) on matching `customId` rather than replacing.
   - Re-running Step 5 creates duplicate C116 documents while leaving the original C116 `wd-summary` (`id: M5KEix7JeAJeWdoRiAGVaJ`, recorded in `output/run-cycle/c116.json:27`) — which contains the 3 false retirement lines — live in `world-data`. Use `PATCH /v3/documents/M5KEix7JeAJeWdoRiAGVaJ` and `PATCH /v3/documents/AqQa6BfzozUcrRd712hP7c` (or `DELETE` those two IDs before re-POSTing).
5. **[MEDIUM — Attack #4] Re-running `engineAuditor.js` now will clobber the C116 post-fire `Initiative_Tracker` snapshot because `civic-cron` already wrote to `Initiative_Tracker` at `21:25:50Z` (`VERIFIED`):**
   - `logs/civic-cron.log` confirms `civic-cron` applied post-close writes to `Initiative_Tracker` (9 rows) and `World_Config` at `2026-11-15T21:25:50.525Z`.
   - Running `node scripts/engineAuditor.js` (`scripts/engineAuditor.js:327-338`) re-snapshots live `Initiative_Tracker` into `output/engine_audit_c116.json.snapshots.Initiative_Tracker`. Preserve the original `21:11Z` `snapshots` block from `output/engine_audit_c116.json` after re-running `engineAuditor.js` (or restore `snapshots` from backup) so C117 Step 2.5 (`--hand-write-check`, `L430-488`) retains its true post-engine baseline.
6. **[MEDIUM — Attack #1 & #6] Missed C116 artifacts and tags (`VERIFIED`):**
   - `LifeHistory_Log` has 4 additional C116 rows from `generateCitizensEvents_` (`phase05-citizens/generateCitizensEvents.js:468-469, 2596, 3772`) carrying `occupation:Former ...` in `EventTag` (window rows `2649`, `2650` for `POP-00018`; `3362` for `POP-00527`; `3363` for `POP-00528`).
   - `output/baseline_briefs_c116.json` (written by `engineAuditor.js:521`), `output/desk_signal_c116.json` (written by `buildWorldSummary.js`), `output/voice-disposition-cache/POP-00018.md` and `POP-00528.md` (written by `scripts/refreshVoiceDispositionCache.js` at Step 5.55), and `output/production_log_run_cycle_c116_gaps.md` (written by `scripts/engineCycleAudit.js --write` at Step 6) all contain the false retirement strings/roles.

---

## Attack #1: Missed Writers (`sportsRetire_` and Post-Phase-5 Readers)

### 1.1 Exact Mutations by `sportsRetire_` (`VERIFIED`)
- **Code pointer:** `phase05-citizens/applyGameNightMoments.js:244-292`, called from `applyGameNightMoments_` at `L533-539` (`if (trig === 'retirement')`).
- **Execution order:** `godWorldEngine2.js:624` (`Phase5-GameNightMoments`) runs before `Phase5-GenerateCitizensEvents` (`L658`), `Phase5-ProcessAdvancement` (`L675`), `Phase5-CareerEngine` (`L683`), `Phase5-Maneuver` (`L688`), `Phase5-GenerationalWealth` (`L699`), `Phase5-EducationCareer` (`L708`), `Phase5-HouseholdFormation` (`L714`), and `Phase5-MigrationTracking` (`L720`) (`VERIFIED`).
- **Mutations verified against `applyGameNightMoments.js:244-292` and C115→C116 `Simulation_Ledger` diff (`VERIFIED`):**
  - `row[iClock] = 'ENGINE'` (`L255`)
  - `row[iRole] = 'Former ' + priorRole` (`L256`)
  - `row[iEconKey] = ''` (`L258`)
  - `row[iIncome] = postIncome` (`$250,000` for Tier 1, `$120,000` for Tier 2; `L259, L242`)
  - `row[iBio] = bioLead + ...` (`"Now: Former ...; retired C116."` prepended; `L262-265`)
  - `row[iHistory]` appended `Y3C12 — [Retirement] retired from the A's, announced C116 — the playing salary ends; appearances and the name pay $<postIncome> a year` (`L275-279`)
  - Queued `LifeHistory_Log` append intent (`EventTag = 'Retirement'`) (`L280-285`)
  - Pushed `"<Name>"` to `retiredNames` (`L537`) → `whyBits.push('retirement: ' + retiredNames[ri])` (`L622`) → `Ripple_Ledger` (`causeId: 'Oakland_Sports_Feed.gameNight'`, `L633-645`).

### 1.2 Intra-Function Side Effect Inside `applyGameNightMoments_` (`VERIFIED`)
- **Code pointer:** `phase05-citizens/applyGameNightMoments.js:583-610` (`2. STAFF and 3. FANS`).
- **Mechanism:** Section 2/3 loops over all `rows` *after* Section 1 (`1. NAMED`, `L504-571`) has already mutated `row[iClock] = 'ENGINE'` and `row[iRole] = 'Former ...'` in memory. At `L587-592`, `mode = String(row2[iClock] || '').toUpperCase()` now reads `'ENGINE'`, so `isStaff` (`mode === 'GAME' && staffTeams`) evaluates to `false` for `POP-00527` (`L591-592`), routing `POP-00527` into the `3. FANS` branch (`L603`) instead of `2. STAFF` (`L595`).
- **C116 impact (`VERIFIED`):** Benign in C116 **only** because the A's had no game-result rows in C116 and the Oaks went 1-1 (`EVEN`, so `signed['Oaks']` was undefined at `L493-498` and neither staff nor fan week lines fired). Zero extra lines written in C116.

### 1.3 Missed Trace in `generateCitizensEvents_` (`phase05-citizens/generateCitizensEvents.js`) (`VERIFIED`)
- **Code pointers:**
  - `generateCitizensEvents.js:468-469, 2588, 2596`: reads `mode = row[iClock] || "ENGINE"` and `occupation = String(row[iOccupation] || "")` (where `iOccupation` resolves to `RoleType` at `L468-469`).
  - `generateCitizensEvents.js:2944`: `if (occupation && mode === "ENGINE" && status !== "retired") { var op = occupationPoolFor_(occupation); ... }`. Because `mode` was `'ENGINE'`, all three citizens entered the `ENGINE`-only occupation pool check (no lines drawn because `"Former ..."` is not a key in `defaultEntities.occupation` at `L1469-1482`).
  - `generateCitizensEvents.js:3417-3422`: `if (String(mode).toUpperCase() === "GAME")` strips `source:sports` spectator entries so athletes/club staff do not draw fan spectator lines. Because `mode` was `'ENGINE'`, that guard was bypassed for all three citizens (none of the three happened to roll a `source:sports` line in `generateCitizensEvents_` this cycle).
  - **`generateCitizensEvents.js:3772` (MISSED BY PLAN):** `if (occupation) tags = mergeTags(tags, ["occupation:" + occupation]);` stamped `occupation:Former ...` into `LifeHistory_Log.EventTag` on **4 ordinary C116 life-event rows**:
    1. `LifeHistory_Log` window row `2649` (`POP-00018`): `Neighborhood-Composure-Down-S|...|occupation:Former Pitcher, Oakland A's Legend|...`
    2. `LifeHistory_Log` window row `2650` (`POP-00018`): `Personal-Composure-Up-S|...|occupation:Former Pitcher, Oakland A's Legend|...`
    3. `LifeHistory_Log` window row `3362` (`POP-00527`): `Daily-Family-Up-S|...|occupation:Former General Manager, Oakland A's & The Oaks|...`
    4. `LifeHistory_Log` window row `3363` (`POP-00528`): `Personal-Warmth-Up-S|...|occupation:Former Manager, Oakland A's|...`
  - **Downstream effect:** `scripts/engine-auditor/generateBaselineBriefs.js` parses `occupation:` out of `LifeHistory_Log.EventTag`, which is why `output/baseline_briefs_c116.json` still lists `"occupation": "Former General Manager, Oakland A's & The Oaks"` and `"occupation": "Former Pitcher, Oakland A's Legend"` on their neighborhood event briefs (`VERIFIED`). Strip `"Former "` from `EventTag` on those 4 `LifeHistory_Log` rows as well.

### 1.4 Other Post-Phase-5 Readers Checked (`VERIFIED`)
- **`processAdvancementIntake_` (`phase05-citizens/processAdvancementIntake.js:1168`):** Appended C116 `Advancement` media-usage lines for `POP-00018`, `POP-00527`, `POP-00598` (`LifeHistory_Log` window rows `4575, 4597, 4599`); did not touch `RoleType`, `ClockMode`, or `Income` because those intake rows were media-usage rows (`VERIFIED`).
- **`runCareerEngine_` (`phase05-citizens/runCareerEngine.js:445`):** Skips `tier === 1 || tier === 2` (`if (tier === 1 || tier === 2) continue;`). None of the three (Tiers 1, 1, 2) were touched (`VERIFIED`).
- **`runManeuverEngine_` (`phase05-citizens/maneuverEngine.js:252, 301-324`):** Skips `clock === 'GAME'` (`L252`). Because `ClockMode` was `'ENGINE'`, it wrote `DialState.maneuver`, `LifeHistory` (`[Maneuver-Climb]`), and `LifeHistory_Log` (`Maneuver-Climb`) for `POP-00018`, `POP-00527`, `POP-00528` (`VERIFIED`).
- **`processGenerationalWealth_` (`phase05-citizens/generationalWealthEngine.js:372-571, 657, 791, 1024, 1283`):**
  - `processMoneyLoop_` (`L372-571`): accrued 1 week of savings on the wrong `Income` (`NetWorth` deltas: `POP-00018 +$7,702` including `$7,587` `Business-Gain` from Dillon Clinic; `POP-00527 +$790`; `POP-00528 +$122`; `POP-00598 +$22,885`) (`VERIFIED`).
  - `calculateCitizenIncomes_` (`L657`): skips any citizen with `existingIncome > 0` (`VERIFIED`).
  - `deriveWealthLevel_` (`L1283`): derives `WealthLevel` strictly from `NetWorth` thresholds (`WealthLevel` stayed `11`, `10`, `8`, `9` for `POP-00018`, `POP-00527`, `POP-00528`, `POP-00598` — unchanged from C115) (`VERIFIED`).
- **`updateCareerProgression_` (`phase05-citizens/educationCareerEngine.js:538-550`):** Skips `isSportsLayerRow_(row, iClockCP, iEconCP) || !isEngineClockRow_(row, iClockCP)` (`L538`). Because `ClockMode` was `'ENGINE'` and `EconomicProfileKey` was `''`, it recomputed `CareerStage` from age (`POP-00018: senior → mid-career`, `POP-00527: mid-career → senior`, `POP-00528: early-career → senior`) (`VERIFIED`).
- **`updateHouseholdIncomes_` (`phase05-citizens/householdFormationEngine.js:1228-1312`):** Recomputed `Household_Ledger.HouseholdIncome` from member `Income` (+ `$48,000` `GENERIC_SPOUSE_SALARY` for 1-member `couple` households at `L1272-1274`) (`VERIFIED`).
- **`applyStorySeeds_` / `buildContractSeeds_` / `storyHookEngine_` (`phase07-evening-media/`):**
  - `Story_Seed_Deck` row `603`: `Why` column embeds `A's [retirement]` and `retirement: Benji Dillon; retirement: <POP-00527>; retirement: Deacon Seymour` (`phase07-evening-media/buildContractSeeds.js:462-520`) (`VERIFIED`).
  - `Story_Hook_Deck` row `2178`: `HookText = "A's player retires. Career look-back, the farewell, what the city remembers."` (`phase07-evening-media/storyHook.js:559-567`, triggered by `EventTrigger === 'retirement'` on `Oakland_Sports_Feed` row 278) (`VERIFIED`).

---

## Attack #2: Derived Values That Self-Heal vs. Do Not

1. **`DisplacementRisk` (`POP-00527: 1 → 2`, `POP-00598: 5 → 6`) — DO NOT REVERT (`VERIFIED`):**
   - **Code pointer:** `assessDisplacementRisk_` (`phase05-citizens/migrationTrackingEngine.js:243-296`).
   - **Formula (`L247-293`):**
     - Base risk = `Math.floor(pressure / 2)` (`L247`), where `pressure` is `Neighborhood_Map.HousingPressure` read at the start of Phase 5.
     - Rent burden (`L254-262`): skipped if `HousingType === 'owned'` (`L255`) or `savedBuffer === true` (`HouseholdSavings >= MonthlyRent * 12`, `L256`).
     - Employment (`L265-272`), Education (`L275-281`), Age (`L284-288`).
   - **Proof against C115/C116 data (`VERIFIED`):**
     - `POP-00527` (`HH-0084-371` in West Oakland) has `HousingType = "owned"`, so the rent-burden branch (`L255`) is never entered regardless of `Income`. West Oakland's `HousingPressure` rose to `4.5` entering C116 (`Math.floor(4.5 / 2) = 2`, up from `1` in C115). All **135** West Oakland citizens in `Simulation_Ledger` rose by `+1` in C116.
     - `POP-00598` (`HH-0092-598` in Fruitvale) has `HouseholdSavings = 10,033,647 >= 2450 * 12` (`savedBuffer = true` at `L256`) and rent burden `< 30%` under both `$2.7M` (`1.09%`) and `$23.8M` (`0.12%`). Fruitvale's `HousingPressure` rose to `8.5` entering C116 (`Math.floor(8.5 / 2) = 4 + 2 [hs-diploma] = 6`, up from `5` in C115). All **108** Fruitvale citizens in `Simulation_Ledger` rose by `+1` in C116.
   - **Failure if reverted:** Hand-editing `DisplacementRisk` back to `1` and `5` makes `POP-00527` and `POP-00598` inconsistent with every other resident of West Oakland and Fruitvale in C116, and `assessDisplacementRisk_` will immediately overwrite them back to `2` and `6` at C117.
2. **`HouseholdIncome` (`Household_Ledger` rows `21, 560, 372, 405`) — Self-heals at C117, but manual C116 repair is required (`VERIFIED`):**
   - **Code pointer:** `updateHouseholdIncomes_` (`phase05-citizens/householdFormationEngine.js:1228-1312`).
   - At C117 Phase 5, `updateHouseholdIncomes_` will recompute `HouseholdIncome` from restored `Simulation_Ledger.Income`. However, between-cycle consumers (`loadHouseholdHomes` in `lib/wakePerception.js:698-717` and `scripts/buildDeskPackets.js:376-386`) read `Household_Ledger.HouseholdIncome` directly.
   - All 4 target values in the brief are exact matches against C115 `output/beats/prev/Household_Ledger.jsonl` (`VERIFIED`):
     - `HH-DILLON` (row 21): `343,027` → **`13,093,027`** (`$13,000,000` + Maya Torres-Dillon `$93,027`)
     - `HH-0084-371` (row 560): `298,000` → **`30,048,000`** (`$30,000,000` + `$48,000` `GENERIC_SPOUSE_SALARY` at `householdFormationEngine.js:1272-1274`)
     - `HH-00528` (row 372): `184,565` → **`7,664,565`** (`$7,600,000` + Talia Seymour `$64,565`)
     - `HH-0092-598` (row 405): `23,848,000` → **`2,748,000`** (`$2,700,000` + `$48,000` `GENERIC_SPOUSE_SALARY`)
3. **`CareerStage` (`POP-00018`, `POP-00527`, `POP-00528`) — Does NOT self-heal (`VERIFIED`):**
   - **Code pointer:** `updateCareerProgression_` (`phase05-citizens/educationCareerEngine.js:538`).
   - Once `ClockMode='GAME'` and `EconomicProfileKey='SPORTS_OVERRIDE'` are restored, `isSportsLayerRow_` returns `true` and `updateCareerProgression_` skips all three rows permanently. Manual restoration (`POP-00018 → senior`, `POP-00527 → mid-career`, `POP-00528 → early-career`) is mandatory.
4. **`DialState` & `TraitProfile` (`utilities/compressLifeHistory.js:547-728`, `utilities/citizenMemory.js:108-153`) — Partial non-self-healing permanent `base.openness` shift on `POP-00527` and `POP-00528` (`VERIFIED`):**
   - Because `DialState.folded` is now `116` (`compressLifeHistory.js:650`), C117's watermark fold (`neC > foldedMark` at `L564`) will not re-fold C116 lines.
   - The brief assumes `Retirement` (`{family: 4, drive: -4}`) and `Maneuver-Climb` (`{drive: 2, openness: 1}`) only nudged `mood`/`streak`. In reality (`VERIFIED` against C115→C116 `DialState` diffs):
     - **`POP-00528`:** Had `streak.openness = 2` in C115 (`base.openness = 68.20102229177515`). `Maneuver-Climb` (`openness: +1`) was the **only** C116 event touching `openness` for `POP-00528`; it hit `HARDEN_STREAK = 3` (`citizenMemory.js:126-134`), **permanently baking `+0.3428` into `base.openness` (`68.201022 → 68.543839`)** and resetting `streak.openness` from `2` to `0`.
     - **`POP-00527`:** Also had `streak.openness = 2` in C115 (`base.openness = 50`). Two real `Sports-Moved` lines (`openness: +4`) would have triggered `HARDEN_STREAK = 3` regardless, but `Maneuver-Climb` (`openness: +1`) inflated the hardened `base.openness` from `52.5515` to `53.1895` (`+0.638` permanent extra `base.openness`).
     - **`POP-00018`:** `Retirement` (`family: +4`) pushed `mood.family` from `0` to `+1.6388`, crossing the `80` band cut (`current = 79.5146 + 1.6388 = 81.1534 >= 80`, band 4 `"devoted, family is everything"` instead of band 3 `"family-minded"`), which was written into `output/voice-disposition-cache/POP-00018.md`. That `mood.family` will self-heal on C117's `settleCycle_` (`1.6388 * 0.8 = 1.311 → 79.51 + 1.31 = 80.82`, and `< 80` by C119), or `mood.family` on `POP-00018` can be zeroed now.

---

## Attack #3: Carry-Forward (`savePreviousCycleState_`, `seedCarriedSeedList_`, `Carry_Forward_Store`)

1. **`Carry_Forward_Store` / `output/carry_forward_c116.json` (`VERIFIED`):**
   - **Code pointers:** `phase09-digest/finalizeCycleState.js:516-596, 715-769`, `phase01-config/loadPreviousEvening.js:343-460`, `phase02-world-state/applyCityDynamics.js:208-221, 1036-1241`.
   - `compactStorySeeds_` (`finalizeCycleState.js:715-720`) and `compactContractSeeds_` (`L732-746`) strip every seed down to `{ n, d, p, t, m }` — **seed prose (`what`, `why`, `text`) is never stored in `PREV_STORY_SEEDS_JSON` or `PREV_CONTRACT_SEEDS_JSON`** (`VERIFIED` against `output/carry_forward_c116.json`).
   - On `Story_Seed_Deck` row `603` (`SeedID: 24921efc`), the `Oakland_Sports_Feed` / `Oakland_Sports_Feed.gameNight` composite seed had 5 related effects (`sentiment +0.04`, `game-night +16`, `game-night-household +1`, `game-night-texture +24`) from 11 feed rows (`traded`, `clubhouse-tension`, `milestone`, `big-win`, `tough-loss`). Changing row 278's trigger from `retirement` to `rumor` leaves row `603`'s `Class` (`major`), `Domain` (`SPORTS`), `Neighborhood` (`Citywide`), and `Magnitude` (`0.04`) **100% identical** (`buildContractSeeds.js:462-520`).
   - Therefore, in `applyCityDynamics.js:1036-1241`, `seedSignals.citywideWeighted`, `seedSignals.citywideX`, and `PREV_ACTIVITY_OBS_JSON` are **numerically unaffected** at C117 (`VERIFIED`).
2. **`PREV_EVENING_JSON` (`finalizeCycleState.js:370-457`, `phase07-evening-media/sportsStreaming.js:55-64`) (`VERIFIED`):**
   - `PREV_EVENING_JSON.eveningSports` in `Carry_Forward_Store` contains `Oakland_Sports_Feed.StoryAngle` joined by `" | "`. Row 278's `StoryAngle` is already `"Benji Dillon hasn't retired yet. The 5-time Cy Young winner leaves the door open after Keane walks through his"` — it does **not** say anyone retired (`VERIFIED` in `output/carry_forward_c116.json`).
   - *(Side finding for future code fix, not a C116 repair blocker):* `phase07-evening-media/sportsStreaming.js:55-64` does not filter `EventTrigger === 'question'` rows, so the 3 private C116 `question` `StoryAngle` strings leaked into `PREV_EVENING_JSON.eveningSports` (`VERIFIED`).

---

## Attack #4: Order of Edits and Rebuild

1. **`dumpBeatTabs.js` `prev/` Rotation Behavior (`scripts/dumpBeatTabs.js:122-175`) (`VERIFIED`):**
   - `readPriorCycle(outDir)` (`L113-120`) reads `output/beats/meta.json` (`cycle: 116`).
   - When re-run for the same cycle (`node scripts/dumpBeatTabs.js 116`), `advancing = (stamp !== priorCycle)` evaluates to `false` (`116 !== 116` is `false` at `L125`).
   - When `advancing` is `false`, `publishGeneration` (`L163-167`) **automatically copies `output/beats/prev` into `next/prev`** instead of rotating C116 over C115 (`VERIFIED`). Backing up `output/beats/prev/` beforehand is still safe practice.
2. **`engineAuditor.js` Overwrites Post-Engine `snapshots` After `civic-cron` (`scripts/engineAuditor.js:95-103, 327-373, 430-488`) (`VERIFIED`):**
   - First, `engineAuditor.js` ignores a positional `116` CLI argument (`getCurrentCycle()` at `L95-103` reads `World_Config.cycleCount` from Sheets unless `ENGINE_AUDITOR_CYCLE_OVERRIDE=116` is set).
   - Second, re-running `engineAuditor.js` is necessary so `output/engine_audit_c116.json` updates `citizenIncomes` (`L345`, currently `250000 / 250000 / 120000 / 23800000` for the 4 POPs) and `output/baseline_briefs_c116.json` (`L521`).
   - **TRAP:** `logs/civic-cron.log` proves `civic-cron` already ran at `2026-11-15T21:25:50.525Z` and wrote 9 updated rows to `Initiative_Tracker` (`tracker write applied (close, via verdicts, excluded INIT-003)`). If `engineAuditor.js` is re-run now without preserving the original `snapshots` property in `output/engine_audit_c116.json`, `snapshots.Initiative_Tracker` (`L327-338`) will be overwritten with the post-`civic-cron` sheet state, corrupting C117 Step 2.5 (`--hand-write-check`, `L430-488`).
   - **Fix:** Save `jq '.snapshots' output/engine_audit_c116.json` before re-running `engineAuditor.js`, and splice the original `snapshots` block back into `output/engine_audit_c116.json` afterward.
3. **World-Data Re-POST (`wd-summary` and `wd-snapshot`) Does NOT Overwrite by `customId` (`scripts/runCycle.js:168-188`) (`VERIFIED`):**
   - The brief states: *"Re-POST `wd-summary` and `wd-snapshot` for C116 (keyed by `customId`, overwrites in place)."*
   - **FALSE (`VERIFIED`):** `ingestSummary` in `scripts/runCycle.js:168-188` sends `POST https://api.supermemory.ai/v3/documents` with body `{ content, containerTags: ['world-data', tag], metadata: { type, cycle: String(cycle) } }` — **there is no `customId` field**. And even when `customId` is supplied on `POST /v3/documents`, Supermemory appends (`"old\n\n---\n\nnew"`) instead of replacing (`lib/citizenPage.js:77-80`).
   - **Fix:** `output/run-cycle/c116.json` (Step `5`, `L27`) recorded the exact Supermemory document IDs created at `21:15:59Z`:
     - `wd-summary`: **`M5KEix7JeAJeWdoRiAGVaJ`**
     - `wd-snapshot`: **`AqQa6BfzozUcrRd712hP7c`**
     Either `PATCH https://api.supermemory.ai/v3/documents/M5KEix7JeAJeWdoRiAGVaJ` (and `AqQa6BfzozUcrRd712hP7c`) with the rebuilt `world_summary_c116.md` content, or `DELETE` both IDs before re-POSTing.
4. **Additional C116 Rebuild Step Needed (`VERIFIED`):**
   - Re-run `node scripts/refreshVoiceDispositionCache.js --live 116` (`scripts/runCycle.js:122-128`, Step 5.55) if `POP-00018`'s `DialState` is touched, and update `output/engine_review_c116.md` / `output/production_log_run_cycle_c116_gaps.md` so disk grep (`scripts/godworld-mcp.py:351-430`) does not surface false C116 retirement prose.

---

## Attack #5: The Question Wake (`OWED_MILESTONES.question`)

1. **What `sportsAsk_` Wrote in C116 (`phase05-citizens/applyGameNightMoments.js:299-313, 559-570`) (`VERIFIED`):**
   - Live `Oakland_Sports_Feed` row 285 (`StoryAngle: "Will Benji Dillon pitch in 2042, and in what role?"`, `EventTrigger: "question"`) named **both** `POP-00018` and `POP-00527` in `NamesUsed`.
   - `applyGameNightMoments_` (`L559-570`) called `sportsAsk_` on every resolved citizen in `NamesUsed`, writing the identical `Question` entry to **both** `POP-00018` (`LifeHistory_Log` window row `2602`) and `POP-00527` (`LifeHistory_Log` window row `2603`):
     > `"After a farewell season that brought back Benji Dillon in on 1 year deal and now Benji Dillon is leaving the door open. Does he come back for one more year, and as a starter or out of the bullpen?, and is Oakland even an option? With the youth movement in motion does a Dillon deal make sense? Does the club want him back at his $13.0M salary? What would make him decide, and does he wait to see what Mark Aitken does first?"`
2. **How `citizen-wake.js` and `lib/nextChapter.js` Handle `lived:question` (`VERIFIED`):**
   - `lib/wakePerception.js:1027-1029, 1081`: `OWED_MILESTONES.question` reserves an `owed` wake slot (`reason: 'lived:question'`) for both `POP-00018` and `POP-00527` (neither has woken yet in C116; `logs/citizen-wake-state.json` has no C116 `question:` key).
   - `scripts/citizen-wake.js:225-227`: When `isQuestionWake(selection)` is true, `buildVoicePrompts` unconditionally appends `nextChapter.questionFrame(questionText, tier)` (`lib/nextChapter.js:78-85`).
   - `lib/nextChapter.js:27-34, 78-85`: `questionFrame` was built for **retired** players (`"engine.338 Task 3: a former player's next chapter"`) and instructs the citizen to output:
     `MOVE: role=<one of: Sports Broadcaster / Color Analyst | Sports Analyst (Front Office) | Club Coach / Instructor | Scout | College Coach | Youth Academy Director | none> | where=<where, or blank>`
   - `scripts/citizen-wake.js:280-332, 535-539`: If `parseMove(raw, tier)` (`lib/nextChapter.js:90-118`) sees any role from `POOL` (anything other than `none`), `fileNextChapter` appends a row to `Advancement_Intake1` (`citizen-wake.js:328`) with:
     - `POPID = citizen.popId`, `Tier = citizen.tier`, `NewRoleType = move.role`, `ClockMode = move.clock` (`MEDIA`, `GAME`, or `ENGINE`), `EmployerBizId = move.bizId`, `Source = 'citizen-wake:question'`.
   - **There is NO guard in `lib/nextChapter.js` or `scripts/citizen-wake.js` checking whether the citizen is actually retired (`/^Former\s+/i.test(roleType)`) or still an active player/GM!**
3. **What C117 `processAdvancementIntake_` Would Do With That Row (`phase05-citizens/processAdvancementIntake.js:903-956`) (`VERIFIED`):**
   - For an existing `Simulation_Ledger` row (`existingRow >= 0` at `L903`), `processAdvancementIntake_`:
     1. Overwrites `RoleType` with `NewRoleType` (`L913`, e.g., turning `POP-00018` or `POP-00527` into `Club Coach / Instructor` or `Sports Analyst (Front Office)`).
     2. Re-derives `Income` via `rederiveIncomeForRole_` and `jobReferencePay_` (`L933-943`) **without checking `EconomicProfileKey === 'SPORTS_OVERRIDE'`** — clobbering `$13,000,000` or `$30,000,000` down to catalog pay (`~$75k–$180k`).
     3. Overwrites `ClockMode` with `rawClockMode` (`L955-958`, flipping `GAME` to `MEDIA` or `ENGINE` if they picked broadcaster, college coach, or youth academy director).
4. **Required Fix Before Tonight's Wakes (`VERIFIED`):**
   - Delete `POP-00527`'s duplicate `Question` line from `Simulation_Ledger.LifeHistory` and `LifeHistory_Log` (window row `2603`) if that question was meant only for `POP-00018`, OR before the next `citizen-wake.js` cron fires, either:
     - Mark `"question:POP-00018:116:POP-00018": 116` and `"question:POP-00527:116:POP-00527": 116` in `logs/citizen-wake-state.json` (`livedSpent`) if you do not want the `nextChapter` post-career `POOL` frame injected into active `GAME` citizens, **OR**
     - Check `Advancement_Intake1` before C117 Step 1 and delete any `Source = citizen-wake:question` row filed for `POP-00018` or `POP-00527` (and add a guard in `citizen-wake.js:225, 282` so `questionFrame` / `fileNextChapter` only attach `POOL` role moves when `/^Former\s+/i.test(citizen.role)`).

---

## Attack #6: Traces Off the Sheet

1. **`wd-citizens` Cards in Supermemory (`scripts/wdCardsDaemon.js` + `scripts/buildCitizenCards.js`) — ALREADY CONTAMINATED (`VERIFIED`):**
   - `logs/wd-cards-daemon-out.log` (`2026-11-15 15:45:28` to `15:56:59 -06:00`, tick `#660`) proves `wdCardsDaemon.js` already detected the C116 `Simulation_Ledger` changes and rebuilt `1,379` cards (`failures: 0`), PATCHing `POP-00018`, `POP-00527`, `POP-00528`, and `POP-00598` in `wd-citizens` with `Former ...`, `$250,000`/`$120,000`/`$23,800,000`, and `retired C116`.
   - **Self-heal mechanism (`scripts/wdCardsDaemon.js:65, 73-78, 168-175`):** `wdCardsDaemon` polls `Simulation_Ledger` every 300 seconds and hashes all columns except `POPID` and `LastUpdated`. Once the live sheet edits land, the next 5-minute daemon tick will automatically run `node scripts/buildCitizenCards.js --apply --popid POP-00018,POP-00527,POP-00528,POP-00598`, which `PATCH`es `/v3/documents/{id}` in place (`scripts/buildCitizenCards.js:246-252`). Verify `logs/wd-cards-daemon-out.log` after editing the sheet to confirm all 4 POPIDs rebuild with `failures: 0`.
2. **`wd-summary` and `wd-snapshot` in Supermemory (`output/run-cycle/c116.json:27`) — ALREADY CONTAMINATED (`VERIFIED`):**
   - Document `M5KEix7JeAJeWdoRiAGVaJ` (`wd-summary`) in `world-data` contains `output/world_summary_c116.md`'s `## Who Lived It` section with the 3 false retirement lines. Must be `PATCH`ed or `DELETE`d + re-POSTed (see Attack #4.3).
3. **`citizen-pages` in Supermemory (`lib/citizenPage.js`) — CLEAN SO FAR (`VERIFIED`):**
   - `logs/citizen-wake.log`, `logs/citizen-wake-owed.jsonl`, `logs/cron-work-wake.log`, and `logs/citizen-exchange.log` confirm no C116 wake has fired yet (last wake in `logs/citizen-wake.log` was `2026-11-15T18:30:22Z` at C115). No false retirement reflection has been written to `cp-POP-00018`, `cp-POP-00527`, or `cp-POP-00528`.
4. **Local Disk Files Read by `lib/mags.js`, `scripts/godworld-mcp.py`, and Desk/Civic Pipelines (`VERIFIED`):**
   - `output/simulation_ledger_snapshot.jsonl` — read first (`rank -1`) by `disk_search` in `scripts/godworld-mcp.py:334, 423`. Rebuilt by `node scripts/dumpLedger.js 116`.
   - `output/beats/*.jsonl` — read by slice builders (`scripts/build*Slice.js`) and `lib/wakePerception.js`. Rebuilt by `node scripts/dumpBeatTabs.js 116`.
   - `output/engine_audit_c116.json` & `output/baseline_briefs_c116.json` — `baseline_briefs_c116.json` is read by `scripts/cron-civic-run.js:503, 3749` and `disk_search` and currently contains `"Former Pitcher, Oakland A's Legend"`, `"Former General Manager, Oakland A's & The Oaks"`, `"Former Manager, Oakland A's"`, and the 3 retirement texts. Rebuilt by `node scripts/engineAuditor.js` (preserving `snapshots` per Attack #4.2).
   - `output/world_summary_c116.md` & `output/desk_signal_c116.json` — `world_summary_c116.md` has the 3 false retirement lines under `## Who Lived It`, and `desk_signal_c116.json` (`sports` lane) embeds the `Ripple_Ledger` `retirement:` labels. Rebuilt by `node scripts/buildWorldSummary.js 116`.
   - `output/desk-packets/*.json` & `output/world_state.json` — `base_context.json`, `truesource_reference.json`, and `world_state.json` do not currently contain `"Former "` for these 3 citizens, but `sports_c116.json` / desk packets read `Story_Seed_Deck` and `Story_Hook_Deck`. Rebuilt by `node scripts/buildDeskPackets.js 116` and `node scripts/buildWorldState.js 116`.
   - `output/voice-disposition-cache/POP-00018.md` — written by `scripts/refreshVoiceDispositionCache.js --live 116` at Step 5.55; reflects the `+1.64` `mood.family` bump from `Retirement` (`"devoted, family is everything"`).
   - `output/engine_review_c116.md` & `output/production_log_run_cycle_c116_gaps.md` — both mention the false income drops / retirements and are grepped by `scripts/godworld-mcp.py:368-370` (`disk_search`).

---

## Attack #7: Verification of Every Row Number, Cell Value, and Tag in the Brief

| Item in Brief | Status | Verification & Required Adjustment (`file:line`) |
|---|---|---|
| `Oakland_Sports_Feed` row `278`: `EventTrigger` `retirement` → `rumor` | `VERIFIED` | Confirmed at `output/beats/Oakland_Sports_Feed.jsonl` line `277` (`sheetRow: 278`, `Cycle: 116`, `EventType: rumor`, `EventTrigger: retirement`, `StoryAngle: "Benji Dillon hasn't retired yet..."`). All 3 private `question` rows in C116 sit below row 284 on the live sheet, so row `278` is unshifted. |
| `Simulation_Ledger` `POP-00018` (live sheet row `19`, snapshot line `17`): `ClockMode=GAME`, `RoleType=Pitcher, Oakland A's Legend`, `Income=13000000`, `CareerStage=senior`, `EconomicProfileKey=SPORTS_OVERRIDE`, strip `"Now: Former Pitcher, Oakland A's Legend; retired C116. "` from `CitizenBio`, remove C116 `[Retirement]` & `[Maneuver-Climb]` lines from `LifeHistory`, delete `"maneuver"` from `DialState`, remove C116 `Retirement` from `MemoryRegisters.unlived` (`→ ""`) | `VERIFIED` | Exact match against C115 `Simulation_Ledger` (`git show HEAD:output/simulation_ledger_snapshot.jsonl`). Note: in C115 `POP-00018`'s `MemoryRegisters` was empty string `""` (not `{"biases":[],"unlived":[]}`). |
| `Simulation_Ledger` `POP-00527` (live sheet row `417`, snapshot line `415`): `ClockMode=GAME`, `RoleType=General Manager, Oakland A's & The Oaks`, `Income=30000000`, `CareerStage=mid-career`, `EconomicProfileKey=SPORTS_OVERRIDE`, clear `CitizenBio` (`""`), remove C116 `[Retirement]` & `[Maneuver-Climb]` lines from `LifeHistory`, delete `"maneuver"` from `DialState`, remove C116 `Retirement` from `MemoryRegisters.unlived` (keep C112 `Relocation`) | `VERIFIED` (with 1 fix) | Exact match against C115 `Simulation_Ledger`, **EXCEPT do NOT revert `DisplacementRisk` (`2 → 1`)** (`migrationTrackingEngine.js:247`; see Attack #2.1). Also remove C116 `[Question]` line if row 285's question was meant only for `POP-00018` (see Attack #5). |
| `Simulation_Ledger` `POP-00528` (live sheet row `418`, snapshot line `416`): `ClockMode=GAME`, `RoleType=Manager, Oakland A's`, `Income=7600000`, `CareerStage=early-career`, `EconomicProfileKey=SPORTS_OVERRIDE`, clear `CitizenBio` (`""`), remove C116 `[Retirement]` & `[Maneuver-Climb]` lines from `LifeHistory`, delete `"maneuver"` from `DialState`, remove C116 `Retirement` from `MemoryRegisters.unlived` (`→ ""`) | `VERIFIED` | Exact match against C115 `Simulation_Ledger`. Note: in C115 `POP-00528`'s `MemoryRegisters` was `""`. |
| `Simulation_Ledger` `POP-00598` (live sheet row `453`, snapshot line `451`): `Income` `23800000` → `2700000` | `VERIFIED` (with 1 fix) | `Income = 2700000` is verified against C115 `Simulation_Ledger`, **EXCEPT do NOT revert `DisplacementRisk` (`6 → 5`)** (`migrationTrackingEngine.js:247`; see Attack #2.1). |
| `Household_Ledger`: `HH-DILLON` (row `21`) → `13093027`; `HH-0084-371` (row `560`) → `30048000`; `HH-00528` (row `372`) → `7664565`; `HH-0092-598` (row `405`) → `2748000` | `VERIFIED` | All 4 sheet row numbers (`idx + 2` in `output/beats/Household_Ledger.jsonl`) and all 4 C115 `HouseholdIncome` values are exact (`householdFormationEngine.js:1228-1312`). |
| `LifeHistory_Log`: delete 3 `Retirement` rows (`2545, 2547, 2549`) and 3 `Maneuver-Climb` rows (`4627, 4634, 4635`) | `VERIFIED` (FIX ROW ADDRESSING) | `2545, 2547, 2549` and `4627, 4634, 4635` are **1-based line numbers inside the 4,920-line C115–C116 dump (`output/beats/LifeHistory_Log.jsonl`)**, NOT live sheet row numbers (`scripts/dumpBeatTabs.js:58-92`). Match by `(Cycle=="116", POPID, EventTag)` on the live sheet, delete **bottom-up**, and also strip `Former ` from `occupation:Former ...` on window rows `2649, 2650, 3362, 3363` (`generateCitizensEvents.js:3772`). |
| `Story_Seed_Deck` row `603`: replace `A's [retirement]` with `A's [rumor]` and strip `; retirement: ...` from `Why` | `VERIFIED` | Confirmed at `output/beats/Story_Seed_Deck.jsonl` line `602` (`sheetRow: 603`, `SeedID: 24921efc`). |
| `Story_Hook_Deck` row `2178`: delete false `"A's player retires..."` row | `VERIFIED` | Confirmed at `output/beats/Story_Hook_Deck.jsonl` line `2177` (`sheetRow: 2178`, `HookId: 6d96d272`). |
| `Ripple_Ledger`: strip `A's [retirement]` and `; retirement: ...` from C116 `sports` rows | `VERIFIED` | Confirmed via `phase02-world-state/applySportsSeason.js:896` (`Oakland_Sports_Feed` sentiment ripple) and `phase05-citizens/applyGameNightMoments.js:622, 634` (`Oakland_Sports_Feed.gameNight` ripple, surfaced in `output/desk_signal_c116.json`). Replace `A's [retirement]` with `A's [rumor]` on the sentiment ripple row and strip the three `; retirement: ...` suffixes on the `gameNight` ripple row. |

---

## Attached Engine-Wiring Card (`applyGameNightMoments_`)

Generated via `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: applyGameNightMoments_"`:

- **Definition:** `phase05-citizens/applyGameNightMoments.js:322` (`function applyGameNightMoments_(ctx)`), called from `phase01-config/godWorldEngine2.js:624` (`safePhaseCall_(ctx, 'Phase5-GameNightMoments', function() { applyGameNightMoments_(ctx); })`).
- **Reads:**
  - `S.sportsFeedEntries` (`phase02-world-state/applySportsSeason.js:166`)
  - `ctx.ledger` (`Simulation_Ledger` in-memory rows/headers: `POPID`, `First`, `Last`, `ClockMode`, `Tier`, `RoleType`, `Status`, `LifeHistory`, `Neighborhood`, `OriginGame`, `DialState`, `EmployerBizId`, `Income`, `EconomicProfileKey`, `CitizenBio`, `BirthYear`)
  - `As_Roster` (`ctx.ss.getSheetByName('As_Roster')`, `applyGameNightMoments.js:228` via `syncRosterSalary_`)
- **Writes / Side Effects:**
  - Mutates `ctx.ledger.rows` in-memory (`LifeHistory`, `DialState` via `applyEvent_`, and on `sportsRetire_`: `ClockMode`, `RoleType`, `EconomicProfileKey`, `Income`, `CitizenBio`; on `sportsCut_`: `ClockMode`, `RoleType`, `EconomicProfileKey`, `Income`; on `sportsSyncContract_`: `Income`, `EconomicProfileKey`, `RoleType`) and sets `ctx.ledger.dirty = true` (`L612`).
  - Queues `append` intents to `LifeHistory_Log` via `queueAppendIntent_` (`L174, 283, 309, 349`).
  - Pushes `SPORTS` `player-mood` hooks to `S.storyHooks` (`L617-618`, consumed by `phase07-evening-media/storyHook.js:1427`).
  - Pushes `Oakland_Sports_Feed.gameNight` ripple to `S.DomainRipples` (`L633-645`, consumed by `phase07-evening-media/buildContractSeeds.js` and `Ripple_Ledger`).
  - Populates `S.gameNightMoments` (`L647-653`).
