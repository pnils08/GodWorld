# Adversarial Review 2 — The Money Game, Task 5 Final Spec (Flag × Three Doors)

**Target:** `docs/plans/2026-10-16-the-money-game.md` (`:71-233`, commit `80e2501c`)  
**Reviewer:** `antigravity`  
**Date:** 2026-10-21  
**Verdict:** **HOLD**

---

## Executive Verdict

**HOLD.** The Round 5–8 architecture (`flag × three doors`, `$1B` Fortune, flag-tiered Fame floors, `$10M` + `[7 of 9]` Roots for unflagged citizens, and clean deletion of the 5 non-qualifying lines) is structurally sound on the live C112 sheets (`4` lines kept: `Keane`, `Dillon`, `Kelley`, `Varek`; `5` lines deleted: `Corliss`, `Paulson`, `Horn`, `Reaves`, `Villanueva`; `0` new entrants on C113). However, **four blocking issues** must be resolved before `es` ships code:

1. **Internal contradictions across Rounds 3–8 inside `docs/plans/2026-10-16-the-money-game.md` (`:71-233`, `:272`):** `"The record"` (`:122-132`) was written in Round 4 before Rounds 5–8 (`:83-120`) were inserted above it and still states **Fortune = `$250M`** (`:126, :132`), **CIV/ENGINE Fame floor = `[$5M]`** (`:127`), **CIV gets all three doors including Roots** (`:125`), and **"The row never leaves the sheet" / `Status = disbanded`** (`:97, :124, :272` vs Round 6 deletion at `:107`). An implementing terminal reading `:122-132` will code the wrong thresholds.
2. **Hunt 2 (`engine.118` + `Cultural_Ledger` `FameScore` decay bugs at `processAdvancementIntake.js:1265-1278, :1372-1378` and `culturalLedger.js:78-88, :545`):**
   - A citizen who hits `UsageCount >= 25` while not yet on `Cultural_Ledger` (`fame === null`, which applies to every `MED` citizen and `POP-00127` Mason Miller) is registered via `registerCulturalEntity_` at `initialFameScore = 10 + fameBonus` (`9–12`, **not** `>= 25`) and returns `'registered'` without brightening (`processAdvancementIntake.js:1268-1273`, `culturalLedger.js:545`).
   - Worse, `ensureFamousOnCulturalLedger_` runs **every Cycle** (`:1372-1378`) and queues a Phase-5 cell write (`FameScore = 25` at `:1275`) **without updating `LastSeenCycle`**. Once `(cycle - LastSeenCycle) > 10` (`CULTURAL_FAME_QUIET_CYCLES = 10` at `culturalLedger.js:63, 87` — hitting `Mark Aitken` at C115, `Benji Dillon` at C116, `Isley Kelley` and `Mike Paulson` at C117), Phase 7 `decayCulturalFame_` (`:88`) reads the pre-Cycle sheet and queues a cell intent on the **same `(Cultural_Ledger, row, iFame)` cell** for `fame - 1`. Under Phase 10 `persistenceExecutor` last-write-wins (`culturalLedger.js:30`), Phase 7 overwrites Phase 5 and decays `FameScore` `25 → 24 → ... → 0`.
3. **Hunt 3 (Three of the 9 Roots rungs in Loose end 4 `:118` have broken or missing sheet columns, and Gregory Mims clears `4 of 9`, not `7 of 9`):**
   - `moved hoods — current SL.Neighborhood !== Household_Ledger.FormedCycle hood` (`:118`): **`Household_Ledger` has no `FormedCycle hood` column**, and `updateHouseholdLedgerMove_` (`phase05-citizens/migrationTrackingEngine.js:946`) overwrites `Household_Ledger.Neighborhood = destHood` on every move (`SL.Neighborhood !== HHL.Neighborhood` is **`0` across all 1,032 living citizens**).
   - `home sale` (`:118`) and historical `Tier 1 reached` (`:118`) have **no sheet columns** — only prose substrings in `Simulation_Ledger.LifeHistory` / `LifeHistory_Log`.
   - `LastPromotionCycle` (`:118` rung 1) holds literal string `'0'` on **592** live rows (must check `Number(v) > 0`), and `NumChildren` (`:118` rung 7) is `0` on `engine.109`/`302` minted spouse rows (`processAdvancementIntake.js:986`) even when their spouse row has `1–5` kids.
   - Live count on the 9 rungs: **`POP-00023` Gregory Mims (`$12.8M`) clears `4 of 9`** (`marriage`, `home`, `kids`, `press`), `POP-00509` Johhny Necklar (`$6.4M`) clears `3 of 9`, and **0 unflagged citizens in the entire 1,032-citizen population clear `7 of 9`** (max is `5 of 9`).
4. **Hunt 6 (`engine.309` off-heritage founder ascent is blocked by `applyOwnerDraw_` Tier 1/2 cutoff at `generationalWealthEngine.js:1183-1184` and `Founding` standing lock):**
   - `applyOwnerDraw_` (`phase05-citizens/generationalWealthEngine.js:1183-1184`) executes `if (tier === 1 || tier === 2) continue;` for off-heritage business owners. Any off-heritage founder climbing toward Roots Rung 9 (`Tier 1 reached`) or toward the Fame door (`UsageCount >= 25`, which crosses `Tier 2` at 6 mentions and `Tier 1` at 9 mentions) **loses their 50% owner draw the moment they reach Tier 2**, starving them of the income needed to reach `$10M` / `$25M` / `$35M`.
   - Any entrant admitted below `$1B` (`$10M` Roots, `$25M–$250M` Fame) starts at `Standing < 30` (`Founding`), which is skipped by the `engine.308` heritage business roll (`generationalWealthEngine.js:2555, :3172`) until Task 5b (`:112`) rescales the standing ladder.

---

## Section 1 — Cross-Round Contradictions in `docs/plans/2026-10-16-the-money-game.md` (`:71-233`, `:272`)

Because Rounds 5, 6, 7, and 8 (`:83-120`) were prepended above Round 4's `"The record"` (`:122-132`) and Round 3 (`:207-233`), the spec currently contradicts itself in five places:

| Topic | Authoritative Ruling (Rounds 5–8, `:83-120`) | Stale / Conflicting Text Still in Doc |
|---|---|---|
| **Fortune threshold** | **Round 5 (`:83, :90`):** `$1B` (`any flag`); keeps `Varek` (`$10.0B`) only; `Conrad` (`$240M`) and `Skenes` (`$245M`) do not clear. | **Record #4 (`:126`):** `"Settled — Fortune = $250M"`. **Record #10 (`:132`):** `"engine.309's door number = $250M"`. |
| **Fame bar & flag floors** | **Round 5 (`:85, :91-94`):** `FameScore >= 25` (`UsageCount >= 25` via `engine.118`) + flag floors: `UNI = $250M`, `MED = $35M`, `CIV = $35M + Approval`, `no flag = $25M`. | **Record #3 (`:125`):** still lists `FameScore >= [25]` / `[50]` as two open options. **Record #5 (`:127`):** still lists `ENGINE (no flag): [$5M]` and `CIVIC (CIV): [$5M] + Approval floor`. |
| **Whether `CIV` gets Roots** | **Round 5 (`:95, :98`) & Record #6 (`:128`):** `Roots` is **`no flag` only**; `"Media and civic citizens do not get the Roots door"` (`:98`). | **Record #3 (`:125`):** `"CIV (civic): all three — a lifetime public servant can found by fortune, fame, or roots."` **Round 3 (`:218`):** `"Civic is all three."` |
| **Fate of the 5 removed lines** | **Round 6 (`:103, :107`):** **Deleted, no record kept.** Clear `Simulation_Ledger.LineageId` on all 11 members and delete the 5 `Heritage_Ledger` rows. | **Round 5 (`:97`):** `"Five lines go to Status = disbanded"`. **Record #2 (`:124`):** `"The row never leaves the sheet."` **Record #10 (`:132`):** `"dormancy text per door"`. **Open Questions (`:272`):** `"Dormancy as 'fails all 3 doors'"`. |
| **Roots 9 rungs list** | **Record #6 (`:128`) & Round 3 (`:212`):** `(1) good pay/promotion, (2) marriage, (3) spouse with good pay/promotion, (4) home, (5) home sale, (6) move to better hood, (7) business, (8) kids, (9) press + cron wakes that reach Tier 1`. | **Loose end 4 (`:118`):** drops `(3) spouse with good pay/promotion` and splits `(9)` into two separate rungs (`(8) press — UsageCount >= 3` and `(9) Tier 1 reached`). |

---

## Section 2 — Hunts 1–7 (Live Sheet Verification & Code Audit)

### Hunt 1 — Flag vs Clock (`Simulation_Ledger`, 1,044 rows)

Live audit of `Simulation_Ledger` (`UNI (y/n)` col 5, `MED (y/n)` col 6, `CIV (y/n)` col 7, `ClockMode` col 8, `Status` col 20):

1. **Blank flag cells (`86` all-blank rows + `2` partial-blank rows):**
   - **86 rows** have all three flag columns (`UNI (y/n)`, `MED (y/n)`, `CIV (y/n)`) blank (`''`). All 86 are `ClockMode = 'ENGINE'`, `Status = 'Active'` (minted by engine paths that leave `UNI/MED/CIV` empty).
   - **2 additional rows** (`POP-01210` Tamsin Pruitt and `POP-01211` Ines Sorensen, both `ClockMode = 'MEDIA'`, `Status = 'Active'`) have `MED (y/n) = 'yes'` while `UNI (y/n) = ''` and `CIV (y/n) = ''`. Cause: `phase05-citizens/processAdvancementIntake.js:916-924` only populates flag columns that are explicitly present on the intake row (`if (intake.med) newRow[slMap['MED (y/n)']] = intake.med;`), leaving the other two flag columns `''`.
   - **Total blank counts:** `UNI (y/n)` blank on **88** rows, `MED (y/n)` blank on **86** rows, `CIV (y/n)` blank on **88** rows.
2. **Mixed-case and whitespace values (`6` rows live + `'n'` writer in code):**
   - `UNI (y/n)`: `'yes'` (`65`), `'no'` (`890`), `'No'` (`1`: `POP-00529` Tomas Aguilar), `''` (`88`).
   - `MED (y/n)`: `'yes'` (`46`), `'Yes'` (`1`: `POP-00133` Ariana Reyes, written by `scripts/registerEchoRoster.js:40`), `'no'` (`910`), `'No'` (`1`: `POP-00529` Tomas Aguilar), `''` (`86`).
   - `CIV (y/n)`: `'yes'` (`53`), `'no'` (`899`), `' no'` (`1`: `POP-00007` Hal Richmond, leading space), `'No'` (`3`: `POP-00509` Johhny Necklar, `POP-00510` Billy Storip, `POP-01076` Nia Rook), `''` (`88`). Additionally, `phase05-citizens/updateCivicApprovalRatings.js:1615` writes literal `'n'` (`set('CIV (y/n)', 'n')`).
   - **Multi-flag rows:** **`0`** rows carry more than one positive flag (`UNI + MED`, `UNI + CIV`, or `MED + CIV` = `0`). If a future row ever carries two flags, precedence should be explicit: `UNI > MED > CIV > none` (matching `utilities/compressLifeHistory.js:1295-1297` `conductCohortRow_` and `phase05-citizens/runNeighborhoodEngine.js:450-452`).
3. **Flag vs `ClockMode` disagreements: `7` rows, NOT `6` (doc corrections at `:79` and `:85`):**
   - The doc at `:79` says *"Flag ≠ ClockMode on 6 rows (`UNI=yes` retired players whose `ClockMode` was flipped to `ENGINE` on retirement — Conrad $240M, Skenes $245M, etc.)."*
   - In fact there are **7** rows where `UNI (y/n) = 'yes'` and `ClockMode = 'ENGINE'`:
     - **6 Retired rows:** `POP-00114` Mike Kinder (`$18.0M`, `u5`), `POP-00124` Steve Conrad (`$240.0M`, `u14`), `POP-00125` Paul Skenes (`$245.0M`, `u10`), `POP-00126` Orion Kerkering (`$100.0M`, `u1`), `POP-00128` Kris Bubic (`$180.0M`, `u3`), `POP-00129` Dalton Rushing (`$90.0M`, `u5`).
     - **1 Active row missed by the doc:** **`POP-00127` Mason Miller** (`NetWorth = $160,000,143`, `UsageCount = 23`, `Status = 'Active'`, `RoleType = "Sports Analyst A's / Retired HOF A's Closer"`, `UNI (y/n) = 'yes'`, `ClockMode = 'ENGINE'`).
   - **Doc contradiction at `:85`:** Round 5 (`:85`) lists *"Mason Miller (ENGINE u23)"* because it keyed off `ClockMode = 'ENGINE'` instead of `UNI (y/n) = 'yes'`. Under the builder's flag rule (`:79`), Mason Miller is **`UNI = yes`**, so his Fame money floor is **`$250M`** (NOT the `$25M` unflagged floor). That matters immediately: at `UsageCount = 23` and `NetWorth = $160M`, 2 more article mentions would put Miller over `UsageCount >= 25` — and only his `UNI = 'yes'` flag (`$160M < $250M`) keeps him from founding a Heritage line on his 25th mention.
4. **Normalizer to reuse:**
   - `phase05-citizens/generationalWealthEngine.js:3044` currently checks `String(mr[iCiv] || '').toLowerCase() === 'yes'` (untrimmed, misses `'y'`).
   - `phase04-events/generateGenericCitizenMicroEvent.js:506-508`, `utilities/compressLifeHistory.js:1295-1297`, and `phase05-citizens/runNeighborhoodEngine.js:450-452` already use `String(val || '').trim().toLowerCase().indexOf('y') === 0` (or `.startsWith('y')`). Extract `isYesFlag_(val)` using `String(val || '').trim().toLowerCase().indexOf('y') === 0` and use it for `UNI (y/n)`, `MED (y/n)`, and `CIV (y/n)` at both door evaluation and `:3044`.

---

### Hunt 2 — `engine.118` (`processAdvancementIntake.js:1265-1278`) & `Cultural_Ledger` `FameScore` Decay

1. **Live state of the 5 `Famous` citizens on `Simulation_Ledger` and `Cultural_Ledger` (C112):**
   All 5 citizens with `Simulation_Ledger.Famous` set (`UsageCount >= 25`) are linked via `Cultural_Ledger.UniverseLinks` and currently sit at `FameScore >= 25`:

   | POPID | Name | Flag | `UsageCount` | `SL.Famous` | `CUL FameScore` | `CUL LastSeenCycle` | `NetWorth` |
   |---|---|---|---:|---|---:|---:|---:|
   | `POP-00001` | Vinnie Keane | `UNI=yes` | 73 | `C106` | `31` | `112` | `$758,283,167` |
   | `POP-00018` | Benji Dillon | `UNI=yes` | 64 | `C106` | `25` | `105` | `$765,013,477` |
   | `POP-00019` | Isley Kelley | `UNI=yes` | 53 | `C106` | `25` | `106` | `$518,324,522` |
   | `POP-00003` | Mark Aitken | `UNI=yes` | 26 | `C106` | `25` | `104` | `$85,358,763` |
   | `POP-00527` | Mike Paulson | `UNI=yes` | 30 | `C106` | `25` | `106` | `$18,042,300` |

   *(Note: One additional citizen on `Cultural_Ledger`, `POP-00597` Eric Taveras [`CUL-4738E778`, `UNI=yes`], has `FameScore = 26` with `UsageCount = 16`, `Famous = ''`, and `NetWorth = $12,796,959`.)*

2. **Defect 2a — First-time `engine.118` registration lands at `FameScore = 9–12`, NOT `>= 25` (`processAdvancementIntake.js:1265-1278`, `culturalLedger.js:529-573`):**
   Look at `ensureFamousOnCulturalLedger_` (`phase05-citizens/processAdvancementIntake.js:1265-1278`):
   ```js
   function ensureFamousOnCulturalLedger_(ctx, popId, name, roleType, traitProfile, tier, cycle) {
     var fame = culturalFameOf_(ctx, popId, name);
     if (fame === null) {
       if (typeof registerCulturalEntity_ !== 'function') return null;
       var domain = inferCulturalDomainFromRole_(roleType);
       registerCulturalEntity_(ctx, { name: name, roleType: roleType, domain: domain, traitProfile: traitProfile, tier: tier }, cycle, popId);
       return 'registered';
     }
     if (fame < FAME_USAGE_BAR) {
       dimCulturalFame_(ctx, popId, FAME_USAGE_BAR - fame);
       return 'brightened';
     }
     return null;
   }
   ```
   - When a citizen who is **not yet on `Cultural_Ledger`** (`fame === null` — which includes **all 47 `MED=yes` citizens** such as `POP-00017` Anthony Raines `u23` and `POP-00008` P Slayer `u13`, plus `POP-00127` Mason Miller `u23` and `50 of 53` `CIV=yes` citizens) crosses `UsageCount >= 25`, `ensureFamousOnCulturalLedger_` calls `registerCulturalEntity_` and returns `'registered'` **without** setting `FameScore = 25`.
   - Inside `registerCulturalEntity_` (`phase07-evening-media/culturalLedger.js:529, 545, 569`), the new row is queued via `queueAppendIntent_` with `initialFameScore = 10 + fameBonus` (`9` to `12`).
   - Because `queueAppendIntent_` does not mutate the in-memory `Cultural_Ledger` sheet during Phase 5, `culturalStatusByPop_(ctx)` in `generationalWealthEngine.js:3013-3037` (which also runs in Phase 5) will **not see the newly registered row on the crossing Cycle**, and on the next Cycle the row only gets brightened to `25` because `:1372-1378` re-runs `ensureFamousOnCulturalLedger_` every Cycle for `active` citizens!
   - Even worse, if the citizen is `Status = 'Retired'` when crossing or after crossing (`processAdvancementIntake.js:1351`: `if (fst !== 'active') continue;`), `:1372` never runs for them at all.

3. **Defect 2b — Phase 5 `dimCulturalFame_` vs Phase 7 `decayCulturalFame_` LWW collision lets `FameScore` decay below `25` (`processAdvancementIntake.js:1220-1237, :1275` vs `culturalLedger.js:78-88`):**
   - `applyTierLadderState_` (`processAdvancementIntake.js:1372-1378`) runs `ensureFamousOnCulturalLedger_` on **every** Cycle for every `active` `Famous` citizen. When `fame < 25` (`:1275`), `dimCulturalFame_` (`:1220-1237`) queues a Phase-5 cell intent writing `FameScore = 25` to `(Cultural_Ledger, r + 2, iFame + 1)` — **without updating `LastSeenCycle` (`col 11`)**.
   - In Phase 7, `decayCulturalFame_` (`phase07-evening-media/culturalLedger.js:68-97`) reads the pre-Cycle `Cultural_Ledger` sheet via `getSheetData_('Cultural_Ledger')` (`:78`). Whenever `(currentCycle - lastSeen) > 10` (`CULTURAL_FAME_QUIET_CYCLES = 10` at `:63, :87`), Phase 7 queues a cell intent on the **exact same `(Cultural_Ledger, i + 1, 9)` cell** setting `FameScore = fame - 1` (`:88`).
   - As documented in `culturalLedger.js:29-31` (*"Phase 10 persistenceExecutor processes intents in order; last write wins"*), **Phase 7's decay intent overwrites Phase 5's brighten intent every Cycle once `currentCycle - LastSeenCycle > 10`!**
   - Look at the `LastSeenCycle` values in the table above: `Mark Aitken` (`LastSeenCycle = 104`) hits `cycle - LastSeenCycle = 11 > 10` at **C115**; `Benji Dillon` (`105`) hits it at **C116**; `Isley Kelley` (`106`) and `Mike Paulson` (`106`) hit it at **C117**. Without a mention, their `FameScore` on `Cultural_Ledger` will decay `25 → 24 → 23 → ... → 0`, and during Phase 5 of each subsequent Cycle, `updateHeritage_` reads the pre-Cycle `Cultural_Ledger` where `FameScore` is `< 25`!
   - Conversely, when `currentCycle - LastSeenCycle <= 10`, running `if (fame < FAME_USAGE_BAR) dimCulturalFame_(ctx, popId, FAME_USAGE_BAR - fame)` every Cycle (`:1275`) immediately erases the `-1` negative-press dim applied earlier in the same function at `:562` (`dimCulturalFame_(ctx, update.popId, -1)`).

4. **Defect 2c — Name match vs `UniverseLinks` mismatch (`processAdvancementIntake.js:1229` vs `:1257`):**
   - `culturalFameOf_` (`:1257`) matches by `UniverseLinks === popId` **or** `Name === name`.
   - `dimCulturalFame_` (`:1229`) matches **only** by `UniverseLinks === popId`.
   - If a citizen has a pre-existing `Cultural_Ledger` row matched by `Name` whose `UniverseLinks` is blank (`4` live rows on `Cultural_Ledger` have blank `UniverseLinks`), `culturalFameOf_` returns their `FameScore` (`< 25`), skipping `registerCulturalEntity_`, and `dimCulturalFame_` returns `null` without brightening or linking `UniverseLinks`.

5. **Answer to Hunt 2 (which reading the Fame door should use + required fix):**
   - **Fix `engine.118` (`processAdvancementIntake.js:1265-1278` + `culturalLedger.js:545`):**
     1. In `registerCulturalEntity_` (`culturalLedger.js:545`), allow an optional `opts.minFameScore` (or pass `minFameScore: FAME_USAGE_BAR` from `ensureFamousOnCulturalLedger_`) so a citizen registered via `engine.118` is created at `Math.max(FAME_USAGE_BAR, initialFameScore)` (`>= 25`), not `10 + fameBonus`.
     2. In `ensureFamousOnCulturalLedger_` (`processAdvancementIntake.js:1265-1278`), only trigger the `FAME_USAGE_BAR` floor boost on the **crossing Cycle** (`famous crossed this cycle`, or one-time backfill if `UniverseLinks` was missing), and when brightening in `dimCulturalFame_` for crossing, also update `LastSeenCycle = cycle` (and populate `UniverseLinks = popId` if matched by name). Do **not** blindly overwrite `FameScore = 25` every Cycle in `:1372-1378`.
   - **Door predicate (`generationalWealthEngine.js`):**
     - Round 5 (`:83, :85`) defines the Fame door's fame half as *"the `engine.118` bar (`UsageCount >= 25` → `Famous` → `Cultural_Ledger` at `FameScore 25`). Fame is permanent once earned."*
     - Because `Cultural_Ledger.FameScore` can later dim via negative press (`:562`) or quiet-cycle decay (`culturalLedger.js:88`), checking **only** live `Cultural_Ledger.FameScore >= 25` (`culturalStatusByPop_`) means a `Famous` citizen who goes quiet for 11 Cycles drops below `25` and cannot found (or revive) via the Fame door even if they later cross the money floor.
     - Therefore: for the **Fame door entry/revival gate**, check **both** `String(row[iFamous] || '').trim() !== '' || (cul && cul.fame >= HERITAGE_FAME_DOOR_MIN_SCORE)` (and require `UsageCount >= 25` or `Famous !== ''` so a low-usage `Cultural_Ledger` row like `POP-00597` Eric Taveras `u16, f26` doesn't bypass `engine.118` unless intended), while keeping **live `Cultural_Ledger.FameScore`** (`>= 25` / `>= 50` / `>= 75`) on the `heritageStanding_` perk ladder (`:3062-3064`).

---

### Hunt 3 — Roots Pool & Audit of the Nine Rungs (`:118` vs `:128, :212`)

1. **Roots candidate pool re-run on live C112 sheets:**
   Filtering `Simulation_Ledger` (1,032 living rows) for:
   - **No flag** (`UNI (y/n)`, `MED (y/n)`, `CIV (y/n)` all not starting with `'y'`/`'Y'`),
   - **Not on `Cultural_Ledger`** (`UniverseLinks` not matching `POPID` and `Famous` blank),
   - **Active owned home** on `Household_Ledger` (`HousingType === 'owned'`, `Status === 'active'`),
   - **Married** (`SpouseId` non-empty),
   - **Unlined** (`LineageId` blank):

   Exactly **8 living citizens** match all five baseline filters:

   | POPID | Name | `NetWorth` | `UsageCount` | `Tier` | `LastPromo` | `Migrated` | `NumChildren` (self / couple) | Rungs cleared (`:118` 9-rung list) |
   |---|---|---:|---:|---:|---|---|---|---:|
   | `POP-00023` | **Gregory Mims** | **`$12,827,859`** | `9` | `2` | `'0'` | `'0'` | `3` / `3` | **`4 / 9`** (`marriage, home, kids, press`) |
   | `POP-00509` | **Johhny Necklar** | `$6,373,009` | `1` | `4` | `'0'` | `'0'` | `2` / `2` | **`3 / 9`** (`marriage, home, kids`) |
   | `POP-00943` | Pilar Ramirez | `$1,204,743` | `0` | `3` | `'112'` | `'109'` | `2` / `2` | `5 / 9` (`promo, marriage, home, mig*, kids`) |
   | `POP-00004` | Lucia Polito | `$561,013` | `11` | `2` | `'0'` | `'0'` | `0` / `0` | `3 / 9` (`marriage, home, press`) |
   | `POP-01036` | Mei Wong | `$513` | `0` | `4` | `''` | `''` | `''` / `1` | `2` or `3 / 9` (`marriage, home, [kids]`) |
   | `POP-01038` | Camila Cook | `$124` | `0` | `4` | `''` | `''` | `0` / `5` | `2` or `3 / 9` (`marriage, home, [kids]`) |
   | `POP-01029` | Miguel Allen | `$107` | `0` | `4` | `''` | `''` | `''` / `2` | `2` or `3 / 9` (`marriage, home, [kids]`) |
   | `POP-01030` | Elena Patel | `$84` | `0` | `4` | `''` | `''` | `0` / `2` | `2` or `3 / 9` (`marriage, home, [kids]`) |

   At the `$10M` money floor (`:95, :98`), **Gregory Mims (`POP-00023`, `$12,827,859`) alone clears `$10M`**.

2. **Audit of the 9 rungs in Loose end 4 (`:118`) — which have sheet columns and which do NOT:**

   | # | Rung in Loose end 4 (`:118`) | Sheet Column Exists? | Live Verification & Mechanical Defect |
   |---:|---|---|---|
   | 1 | `promotion — LastPromotionCycle set` | **YES** (`Simulation_Ledger.LastPromotionCycle`, col 44) | **Defect:** **592 of 1,044 rows hold literal `'0'`** (including `POP-00023` Mims and `POP-00509` Necklar). Must check `Number(row[iLastPromo]) > 0` (`110` living rows), NOT `String(row[iLastPromo]).trim() !== ''`. Also note: builder `:128` wrote *"good pay and/or promotion"*, whereas `:118` only checks `LastPromotionCycle`. |
   | 2 | `marriage — SpouseId set` | **YES** (`Simulation_Ledger.SpouseId`, col 35) | Clean (`138` living rows). Check `popIdOf(row[iSpouse]) !== null`. |
   | 3 | `home — Household_Ledger.HousingType === 'owned'` | **YES** (`Household_Ledger.HousingType`, col 6) | Clean (`152` living members in `active` `owned` households via `ownedHomePops` at `generationalWealthEngine.js:2900-2909`). |
   | 4 | `home sale — prior sale recorded` | **NO COLUMN** | `Household_Ledger` and `Simulation_Ledger` have **no `HomeSaleCount` or `LastHomeSaleCycle` column**. Sales exist only as text in `Simulation_Ledger.LifeHistory` / `LifeHistory_Log`: `[Home] sold the place in` (`generationalWealthEngine.js:2363, 2474-2475`, `8` rows live) or `[Home] couldn't hold the` (`:2127`, `0` rows live). Worse, `utilities/compressLifeHistory.js` compresses old `LifeHistory` entries unless `[Home]` is protected or read from `LifeHistory_Log`. |
   | 5 | `moved hoods — current SL.Neighborhood !== Household_Ledger.FormedCycle hood` | **NO COLUMN (`0` matches live!)** | **`Household_Ledger` has NO `FormedCycle hood` column** (headers are `HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, HouseholdIncome, FormedCycle, DissolvedCycle, Status, HouseholdSavings, ...`). And `updateHouseholdLedgerMove_` (`phase05-citizens/migrationTrackingEngine.js:946`) overwrites `Household_Ledger.Neighborhood = destHood` on every move, so `SL.Neighborhood !== HHL.Neighborhood` is **`0` across all 1,032 living citizens**. Even `Simulation_Ledger.MigratedCycle` (`Number(v) > 0`, `110` rows live; `591` hold `'0'`) records **all** moves including downward `DISPLACED`/`COST` moves (`migrationTrackingEngine.js:807-815`), whereas the builder specified *"move to a better hood"* (`:128, :212`), which is only recorded in `LifeHistory` / `LifeHistory_Log` as `moving up from <hood>` (`migrationTrackingEngine.js:818`, `45` rows live). |
   | 6 | `business — in Business_Ledger.Key_Personnel` | **YES** (`Business_Ledger.Key_Personnel`, col 7) | Clean (`27` living citizens via `parseKeyPersonnelOwners_` at `generationalWealthEngine.js:2995-3002`, or `32` if non-owner `Key_Personnel` tags count). Specify whether `owner: true` is required (`bizOwnedByPop`). |
   | 7 | `kids — NumChildren >= 1 or child row pointing here` | **YES** (`Simulation_Ledger.NumChildren` col 36, `ChildrenIds` col 38, `ParentIds` col 37) | **Defect on spouse rows:** `processAdvancementIntake.js:986` mints `engine.109`/`302` spouses with `NumChildren = 0` and blank `ChildrenIds`, and only updates the anchor's `NumChildren`. Live result: `POP-01030` Elena Patel, `POP-01038` Camila Cook, `POP-00514` Vincent Ramirez, `POP-01029` Miguel Allen, and `POP-01036` Mei Wong have `NumChildren = 0`/blank while their spouse row has `1–5` kids. Must evaluate `NumChildren >= 1` across **either spouse** (`Math.max(selfKids, spouseKids) >= 1` or `ParentIds` back-reference). |
   | 8 | `press — UsageCount >= 3` | **YES** (`Simulation_Ledger.UsageCount`, col 28) | Clean (`116` living rows have `Number(row[iUsage]) >= 3`). |
   | 9 | `Tier 1 reached` | **PARTIAL** (`Simulation_Ledger.Tier`, col 10 holds *current* Tier only) | `Simulation_Ledger.Tier` holds current tier (`24` living rows at `Tier === 1`, only `2` of whom are unflagged: `POP-00039` Jax Caldera and `POP-00050` Mason Ortega). Because `decayMediaAttention_` (`processAdvancementIntake.js:1526`) demotes quiet citizens (`Tier 1 → 2 → 3 → 4`), **historical** `"Tier 1 reached"` has no column and only appears in `LifeHistory` / `LifeHistory_Log` (`Updated to Tier 1` / `Advanced from Tier \d to Tier 1`, `3` rows live). |

3. **Note on the 9-rung definition drift (`:118` vs `:128, :212`) and live distribution:**
   - In `:128` and `:212`, the builder's 9 items were: `(1) good pay/promotion`, `(2) marriage`, `(3) spouse with good pay/promotion`, `(4) home`, `(5) home sale`, `(6) move to a better hood`, `(7) business`, `(8) kids`, `(9) press attention and cron wakes that reach Tier 1`.
   - Even if you evaluate generously across couples and parse `LifeHistory` for `[Home] sold` and `moving up from`, **no unflagged citizen in the simulation clears `7 of 9` today** (max across all 837 living unflagged citizens is **`5 of 9`**: `POP-00345` Bonnie Brown `$1.95M`, `POP-00699` Iggy Davis `$565K`, `POP-00170` Melton Neilon `$481K`; **Gregory Mims clears `4 of 9`**).
   - Furthermore, requiring a citizen to **both** hold an owned home (rung 3) **and** have sold a home (rung 4) **and** own a business (rung 6) **and** reach `Tier 1` (rung 9) to hit `7 of 9` makes Roots nearly unreachable without fixing the missing columns and checking whether `7 of 9` (or `6 of 9` with spouse promotion restored as a rung) was intended.

---

### Hunt 4 — Deletion of the Five Lines (`LIN-00001` Corliss, `LIN-00006` Paulson, `LIN-00007` Horn, `LIN-00008` Reaves, `LIN-00009` Villanueva)

1. **Exact citizens whose `Simulation_Ledger.LineageId` must be cleared (`11` living rows, `0` on `Citizen_Archive`):**
   - `LIN-00001` (**Corliss**): `POP-00005` Mags Corliss, `POP-00594` Robert Corliss, `POP-00595` Sarah Corliss, `POP-00596` Michael Corliss (`4` rows).
   - `LIN-00006` (**Paulson**): `POP-00527` Mike Paulson (`1` row).
   - `LIN-00007` (**Horn**): `POP-00022` Elliot Horn (`1` row).
   - `LIN-00008` (**Reaves**): `POP-01027` Noah Reaves (`1` row).
   - `LIN-00009` (**Villanueva**): `POP-01130`David Villanueva, `POP-01131`Laura Villanueva, `POP-01132` Ana Villanueva, `POP-01133` Maria Villanueva (`4` rows).
   - *(Verified: `Citizen_Archive` has `0` rows carrying any `LineageId`.)*

2. **Hidden residue not mentioned in Round 6 (`:107`): `[Heritage]` founding stamps in `Simulation_Ledger.LifeHistory` (and `LifeHistory_Log`):**
   - **10 of the 11 citizens** on the 5 deleted lines (all except `POP-00005` Mags Corliss) have `[Heritage] the <Name> line is founded — ...` written inside `Simulation_Ledger.LifeHistory`:
     - `POP-00594`, `POP-00595`, `POP-00596`: `Y2C51 — [Heritage] the Corliss line is founded — 4 across 2 generations.`
     - `POP-00527`: `Y3C2 — [Heritage] the Paulson line is founded — $121.6M on the ledger.`
     - `POP-00022`: `Y3C4 — [Heritage] the Horn line is founded — home and $53.3M in Rockridge.`
     - `POP-01027`: `Y3C4 — [Heritage] the Reaves line is founded — home and $50.8M in Piedmont Ave.`
     - `POP-01130`, `POP-01131`, `POP-01132`, `POP-01133`: `Y3C5 — [Heritage] the Villanueva line is founded — 4 across 2 generations.`
   - Under Round 6 (`:103, :107`: *"No record to be kept of the disbanded , they were never there"*), if those `[Heritage]` lines are left in `Simulation_Ledger.LifeHistory` (and `LifeHistory_Log`), `scripts/buildCitizenCards.js:725` (`extractMilestones_` matches `/\[(Career|Home|Household|Child|Bond|Loss|Origin|Heritage)\]/`) and `lib/wakePerception.js:353` will still surface their Heritage founding on citizen cards and wake prompts! The cleanup migration must strip `[Heritage]` lines for those 5 lineages from `Simulation_Ledger.LifeHistory` and `LifeHistory_Log`.

3. **Audit of every reader of `LineageId` and `Heritage_Ledger` (`file:line`):**
   - **`phase05-citizens/maneuverEngine.js:97-103, :199-218, :238, :257-260`:**
     - `maneuverGoal_` (`:97-103`) checks `var linId = String(citizen.lineageId || '').trim(); if (linId) { var line = heritageById[linId] || null; var status = line ? ... : 'dormant'; if (status === 'dormant') return 'revive'; return 'advance'; }`.
     - **Critical ordering requirement:** `Simulation_Ledger.LineageId` **must** be cleared in the same atomic step that deletes the 5 `Heritage_Ledger` rows. If a `Heritage_Ledger` row is deleted while `Simulation_Ledger.LineageId` is still set, `maneuverGoal_` (`:99-101`) sees `linId && !line`, treats the citizen as `status = 'dormant'`, and assigns maneuver goal `'revive'`!
     - Once both `LineageId` and the `Heritage_Ledger` row are removed, all 11 citizens cleanly fall through `:104-110` to household goals: `'establish'` for `POP-00596` Michael Corliss (no `HouseholdId`), `'home'` for renting households (`Corliss` `HH-0084-001` / `HH-0105-F013` and `Villanueva` `HH-0109-I001`), and `'wealth'` for homeowners (`Paulson` `HH-0084-371`, `Horn` `HH-0102-F005`, `Reaves` `HH-0102-F092`).
   - **`phase05-citizens/generationalWealthEngine.js:2612-2632` (`heritageTierByPop_`) and all callers:**
     - `:1141-1142, :1162-1163` (`applyOwnerDraw_`): none of the 11 citizens is a business owner (`POP-00527` Mike Paulson is in `BIZ-00074` `Key_Personnel` with role `Basketball Ops`, which `parseKeyPersonnelOwners_` at `:1082-1083` marks `owner: false`).
     - `:1362` (estate tax on death), `:2036, :2045` (`trackHomeOwnership_` `homesPurchasedByLine`), `:2331, :2368, :2400-2416` (`sellHouseholdHome_` / `decrementHeritageHomesLate_`), `:3172` (`engine.308` heritage business roll — all 5 lines had `HeritageTier = 'Founding'` and `BusinessesOwned = []`, so none rolled).
   - **`phase04-events/generationalEventsEngine.js:274-275, :1108-1109`:** `heritageTierByPop_` `Founding` birth multiplier (`×1.15`) stops applying to those 11 citizens.
   - **`phase05-citizens/processAdvancementIntake.js:2048`** and **`phase05-citizens/educationCareerEngine.js:1183`:** `heritageTierByPop_` lookups fall back to `null` (no boost).
   - **`phase04-events/buildCityEvents.js:511-536`:** iterates `Heritage_Ledger` rows; deleting the 5 rows removes them cleanly.
   - **`lib/wakePerception.js:443, :474, :508-524, :610-650`:** `buildLineageMap_` keys on `citizen.LineageId`; clearing `LineageId` makes `line = null` and falls back to `Household_Ledger`.
   - **`scripts/buildCitizenCards.js:720-734`:** does not read `LineageId` or `Heritage_Ledger`, **except** via `[Heritage]` tags in `Simulation_Ledger.LifeHistory` (`:725`, flagged above).
   - **`scripts/buildCulturalCards.js:556-620`:** reads `Cultural_Ledger` only. None of the 5 deleted lines has a Dynasty row on `Cultural_Ledger`.
   - **`scripts/queryLedger.js:151`** and **`scripts/inventoryCitizenArchiveCandidates.js:38, :57-81`:** read `LineageId` / `Heritage_Ledger` dynamically; no hardcoded `LIN-` IDs.

---

### Hunt 5 — Revival & Dormancy Under "Enter, Never Leave" (`generationalWealthEngine.js:3113-3136`)

1. **Does an entrant below `$1B` start a 52-Cycle low-standing dormancy clock on Cycle 2?**
   - **No — under current `:3128`, they never start the `lowC` clock while at `Founding`, which accidentally matches "enter, never leave" (`:124, :219`) but traps them in `Founding` until Task 5b (`:112`):**
   - Look at `generationalWealthEngine.js:3126-3136`:
     ```js
     var rank = heritageRank_(tier);
     if (rank > heritageRank_(peakTier)) peakTier = tier;
     lowC = (standing < HERITAGE_LOW_STANDING && heritageRank_(peakTier) >= 1) ? lowC + 1 : 0;
     ```
   - `HERITAGE_LOW_STANDING = 10` (`:2550`) corresponds to `$1M` (`10 * (log10(1e6) - 5) = 10`) with zero perk points.
   - A new entrant via **Roots** at `$10M` + owned home starts at `Standing = 10.0 + 2 = 12.0` (`>= 10`, `Founding`). A new entrant via **Fame** at `$25M` + `FameScore 25` starts at `14.0 + 3 = 17.0` (`Founding`); at `$35M` starts at `15.4 + 3 = 18.4` (`Founding`); at `$250M` starts at `24.0 + 3 = 27.0` (`Founding`).
   - Thus **none** of the new door floors start below `HERITAGE_LOW_STANDING = 10`, AND because `heritageRank_('Founding') === 0`, `heritageRank_(peakTier) >= 1` is `false` for all of them anyway!
   - Under Round 3 / Record #2 (`:124, :219`: *"Once a line is on `Heritage_Ledger`, it stays. No Cycle-by-Cycle door re-test"*), **do NOT change `:3128` to drop the `PeakTier` guard or re-test doors for active lines**. Active lines only go dormant if `emptyC >= HERITAGE_EMPTY_CYCLES` (`4` Cycles with `0` living members, `:3130`) or `lowC >= HERITAGE_LOW_CYCLES` (`52` Cycles below `Standing < 10`, i.e., net worth collapsed below `~$1M` after having reached `Established`).
   - **Clean up stale doc text:** Delete the leftover sentences in `:97`, `:132`, and `:272` that still talk about `Status = disbanded` or `"every line clears a door every Cycle or goes dormant"`.

2. **Revival (`generationalWealthEngine.js:3117-3124`) confirmed broken until updated to `lineClearsAnyDoor_`:**
   - `:3117-3120` still hardcodes the old Doors A/B/C:
     ```js
     var revived = (status === 'dormant') && livingN > 0 && (
       maxLivingNW >= HERITAGE_DOOR_B_NETWORTH ||
       (livingN >= HERITAGE_DOOR_A_MEMBERS && totalNW >= HERITAGE_DOOR_A_NETWORTH) ||
       (anyOwnedHome && totalNW >= HERITAGE_DOOR_C_SOLO_NETWORTH)
     );
     ```
   - Replace `:3117-3120` with a shared `lineClearsAnyDoor_(lineState, ...)` helper that tests whether any living member (or line aggregate) clears Fortune (`>= $1B`), Fame (for their flag), or Roots (`no flag`, `$10M`, `[7 of 9]`).
   - **Preserve the `:3123` vs `:3317` revival-hook ordering fix from Review 1:** `:3123` clears `hl[hDorm] = ''` *before* `:3317` reads `hl[hDorm]` to emit `HERITAGE_REVIVED` (`dormant since C?`). Capture `var prevDormantCycle = hl[hDorm]` before clearing `hl[hDorm] = ''`.

---

### Hunt 6 — `engine.308` / `engine.309` Cross-Check (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:250-252`)

1. **`engine.308` (`engine-214:250` — heritage business roll caps/cooldown) vs Task 5:**
   - `engine.308` caps businesses per citizen (`[2]`) and per line (`livingMembers + tierStep`, cooldown `[12 Cycles]`, stake `20%` of founder `NetWorth`). It does **not** hardcode old Door A/B/C money numbers.
   - **However**, `generationalWealthEngine.js:2555, :3172` gates the heritage business roll on `HeritageTier >= Established` (`Founding: 0`, `Established: 0.04`, `Prominent: 0.08`, `Dynasty: 0.12`).
   - Under the current standing formula (`:3045-3076`), `Established` (`Standing >= 30`) requires `~$500M–$1B` if perks are `3–6`. That works for the 4 surviving lines (`Varek` promotes to `Prominent` `56.0` on C113; `Keane` `36.8`, `Dillon` `35.8`, `Kelley` `30.1` are `Established`), **but any future entrant through Roots (`$10M`, Standing `~12–18`) or Fame (`$25M–$250M`, Standing `~17–27`) lands in `Founding` (`< 30`) and gets `0%` heritage business roll** until Task 5b (`:112`) rescales the standing ladder! This directly impacts Round 3 `:219` (*"once on them new opportunities emerge (the heritage business roll, engine.308, is one)"*).

2. **`engine.309` (`engine-214:251` — off-heritage founder door + ascent + crash) vs Task 5:**
   - **Stale door text in both plan docs:**
     - `docs/plans/2026-10-10-engine-214-mood-per-hood.md:251(b)` still says: *"Door C (`HERITAGE_DOOR_C_SOLO_NETWORTH` $50M + an owned home) founds a NEW heritage line — a storefront that becomes a name."*
     - `docs/plans/2026-10-16-the-money-game.md:132` (Record #10) still says: *"engine.309's door number = $250M."*
     - Both must be updated to Loose end 2 (`:116`): ascent is *"clears any door for your flag"* (which for an `ENGINE`-clock / unflagged storefront founder means **Roots** at `$10M + [7 of 9]` or **Fame** at `$25M + UsageCount >= 25`).
   - **BLOCKING ENGINE DEFECT discovered in `applyOwnerDraw_` (`generationalWealthEngine.js:1183-1184`):**
     Look at how `applyOwnerDraw_` (`phase05-citizens/generationalWealthEngine.js:1179-1190`) handles an **off-heritage** business owner:
     ```js
     // Off-heritage owner: sports-layer skip, Tier 1/2 skip, then 50% of profit -> Income
     var oPop = owner.popId;
     var orw = popRow[oPop];
     if (!orw) continue;
     if (isSportsLayerRow_(orw, iUni, iClock, iRole)) continue;
     var tier = iTier >= 0 ? Number(orw[iTier]) : 4;
     if (tier === 1 || tier === 2) continue;
     ```
     **Read `:1183-1184` against the new Fame and Roots doors:**
     - `engine.309(a)` (`engine-214:251`) spawns off-heritage founders from `ENGINE`-clock, `Tier 3–4` citizens.
     - To ascend into Heritage via **Roots** (`:118`), Rung 9 requires reaching **`Tier 1`**. To ascend via **Fame** (`:94`), the citizen must reach `UsageCount >= 25` (which promotes them to **`Tier 2` at 6 mentions** and **`Tier 1` at 9 mentions**, 19 mentions before `UsageCount = 25`!).
     - The moment an off-heritage business owner reaches `Tier 2` (or `Tier 1`), **`applyOwnerDraw_:1184` (`if (tier === 1 || tier === 2) continue;`) cuts off 100% of their business owner draw!** They are not yet on a Heritage line (so they don't get the `75% → NetWorth` heritage branch at `:1163-1177`), and `:1184` skips the `50% → Income` off-heritage branch!
     - Furthermore, even while at `Tier 3–4`, off-heritage owner draw goes into `Income` (`:1187`), and `processMoneyLoop_` (`:436-438`) only converts `Income × SavingsRate` (`12%–20%`) per year into `NetWorth`. At `$500K` profit (`$250K` draw → `~$40K/yr` saved), reaching the `$10M` Roots floor takes **250 years** unless off-heritage owner draw also credits a share to `NetWorth` (or equity on `Business_Ledger` counts toward `NetWorth`).

---

### Hunt 7 — Marriage / Birth as the Ungated Entry (`generationalWealthEngine.js:2751-2780`, Loose End 1 `:115`)

1. **Live C112 check — does any unlined citizen currently on `Simulation_Ledger` (1,044 rows) or `Citizen_Archive` (56 rows) join a surviving line via marriage/birth on C113?**
   - **No (`0` citizens).**
   - All members of the 4 surviving lines (`LIN-00002` Dillon: `POP-00018`, `POP-00742`, `POP-00743`; `LIN-00003` Keane: `POP-00001`, `POP-00002`; `LIN-00004` Kelley: `POP-00019`; `LIN-00005` Varek: `POP-00789`) already have `LineageId` set on `Simulation_Ledger`.
   - Zero unlined citizens on `Simulation_Ledger` or `Citizen_Archive` have `SpouseId` or `ParentIds` pointing to any member of `LIN-00002`, `LIN-00003`, `LIN-00004`, or `LIN-00005` (nor to any of the 5 deleted lines).

2. **Latent bug in `:2774` for future in-sim marriages:**
   - Look at `generationalWealthEngine.js:2772-2777`:
     ```js
     var sp = spouseId ? popById[spouseId] : null;
     if (sp && sp[iLin] && String(sp[iLast] || '').trim() === String(row[iLast] || '').trim()) {
       chosen = String(sp[iLin]).trim();
     }
     ```
   - Why did `:2774` require `sp[iLast] === row[iLast]`? Under the old code, it was trying to avoid pulling a spouse with a different surname before Door A ran.
   - But in the simulation:
     1. Hyphenated spouses (like `POP-00742` `Maya Torres-Dillon`, `Last = 'Torres-Dillon'`, married to `POP-00018` `Benji Dillon`, `Last = 'Dillon'`) fail `sp[iLast] === row[iLast]`! (`Maya Torres-Dillon` only got `LIN-00002` because old Door A swept `Family_Relationships` at founding.)
     2. In-sim marriages created by `phase05-citizens/bondEngine.js:2395-2485` between two existing `Simulation_Ledger` citizens do **not** overwrite either citizen's `Last` column, so `sp[iLast] === row[iLast]` is **always false** for in-sim marriages unless they happened to share a surname before marrying!
   - If Loose end 1 (`:115`: *"Marriage/birth into an existing line stays ungated (code at `:2751-2780`). Confirmed — that's how a line becomes a family after a solo founder opens a door"*) is meant to let `Isley Kelley` (`POP-00019`) or `Dragan Varek` (`POP-00789`) bring a spouse onto their line when they marry in-sim, **drop the `String(sp[iLast] || '').trim() === String(row[iLast] || '').trim()` requirement at `:2774`** (requiring only `sp && sp[iLin]`).

---

## Section 3 — Corrections to `docs/plans/2026-10-16-the-money-game.md`

| Line(s) | Current Text in Plan | Required Correction |
|---|---|---|
| `:79` | `"Flag ≠ ClockMode on 6 rows (UNI=yes retired players whose ClockMode was flipped to ENGINE on retirement — Conrad $240M, Skenes $245M, etc.)."` | **`7` rows**, not `6`: `6` Retired `UNI=yes, ClockMode=ENGINE` rows (`POP-00114`, `POP-00124`, `POP-00125`, `POP-00126`, `POP-00128`, `POP-00129`) **plus `1` Active row**: `POP-00127` **Mason Miller** (`UNI=yes, ClockMode=ENGINE, Status=Active, $160.0M, u23`). |
| `:85` | `"At 23 mentions: Anthony Raines (MED u23) and Mason Miller (ENGINE u23) are two articles from crossing."` | Mason Miller is **`UNI=yes` (`u23`, `$160M`)**, not `ENGINE`. Under the flag rule, his Fame money floor is **`$250M`** (`UNI`), not `$25M` (`no flag`). |
| `:97` | `"Five lines go to Status = disbanded..."` | Superseded by Round 6 (`:107`): delete the 5 `Heritage_Ledger` rows, clear `Simulation_Ledger.LineageId` on all 11 members, and strip their `[Heritage]` founding lines from `Simulation_Ledger.LifeHistory` and `LifeHistory_Log`. |
| `:118` | `"1. promotion — LastPromotionCycle set ... 4. home sale — prior sale recorded ... 5. moved hoods — current SL.Neighborhood !== Household_Ledger.FormedCycle hood ... 7. kids — NumChildren >= 1 ... 9. Tier 1 reached"` | Reconcile the 9 rungs with `:128` (`spouse with good pay/promotion` was dropped in `:118`), and fix the column mappings: `Number(LastPromotionCycle) > 0` (592 rows hold `'0'`), `Household_Ledger` has no `FormedCycle hood` column (`0` rows differ between `SL.Neighborhood` and `HHL.Neighborhood`), `home sale` and historical `Tier 1` have no sheet columns (must parse `LifeHistory`/`LifeHistory_Log` or add columns), and `kids` must check couple/household max (`5` minted spouses have `NumChildren = 0`). Note that `POP-00023` Gregory Mims clears **`4 of 9`** today (`marriage, home, kids, press`), not `7 of 9`. |
| `:124` | `"2. Enter, never leave. ... The row never leaves the sheet."` | Update to reflect Round 6 (`:107`) one-time deletion of the 5 old-door lines, while keeping `"enter, never leave"` for lines founded under the new doors. |
| `:125` | `"3. Three doors, gated by flag (`UNI` / `MED` / `CIV` on `Simulation_Ledger`)."` (still lists `[25]`/`[50]` and `"CIV (civic): all three"`) | Update to Round 5 (`:90-98`): `FameScore >= 25` settled, and `CIV` gets **Fortune + Fame only** (Roots is `no flag` only). |
| `:126` | `"4. Settled — Fortune = $250M."` | Update to Round 5 (`:83, :90`): **Settled — Fortune = `$1B`**. |
| `:127` | `"5. Open — Fame money floors by flag. ... ENGINE (no flag): [$5M] ... CIVIC (CIV): [$5M]"` | Update to Round 5 (`:91-94`): **Settled — `UNI = $250M`, `MED = $35M`, `CIV = $35M + Approval`, `no flag = $25M`**. |
| `:132` | `"10. Derived ... engine.309's door number = $250M."` | Update to Loose end 2 (`:116`): `engine.309` ascent is `"clears any door for your flag"`, and remove `"dormancy text per door"` for active lines. |
| `:272` | `"Dormancy as 'fails all 3 doors' — under the new shape, every line clears a door every Cycle or goes dormant..."` | Delete or mark superseded by Round 3 / Record #2 (`"enter, never leave"`). |

---

## Section 4 — Ordered Fix List for `es` (and Doc Sync for `rb`)

1. **`rb` — Reconcile `docs/plans/2026-10-16-the-money-game.md` (`:79, :85, :97, :118, :122-132, :272`) and `docs/plans/2026-10-10-engine-214-mood-per-hood.md` (`:251`):**
   - Update `"The record"` (`:122-132`) and `:272` so they match Rounds 5–8 (`$1B` Fortune, `$250M/$35M/$35M+$25M` Fame floors, `no flag` only for Roots, one-time deletion of the 5 lines, and `engine.309` ascent = clears any door for your flag).
   - Fix `:79` (`7` `Flag ≠ ClockMode` rows) and `:85` (`POP-00127` Mason Miller is `UNI=yes`, floor `$250M`).
   - Decide on the Roots rung contract (`:118` vs `:128`): either (a) specify exact sheet/LifeHistory predicates for the 3 column-less rungs (`home sale`, `moved hoods`, historical `Tier 1`) and confirm that `0` citizens clearing `[7 of 9]` today (Mims at `4 of 9`) is intended, or (b) adjust the rung list / threshold (`[5 of 9]` or `[6 of 9]` with couple-level checks) if Mims or near-term engine climbers are expected to clear Roots within a human timeframe.
2. **`es` — Fix `engine.118` registration & Phase 5/Phase 7 `FameScore` LWW decay bug (`phase05-citizens/processAdvancementIntake.js:1220-1278, :1372-1378` and `phase07-evening-media/culturalLedger.js:545`):**
   - When `ensureFamousOnCulturalLedger_` registers a missing citizen (`fame === null` at `:1268`), pass `minFameScore: FAME_USAGE_BAR` (`25`) into `registerCulturalEntity_` so new `engine.118` rows start at `FameScore >= 25` (not `9–12`).
   - In `dimCulturalFame_` (`:1220-1237`), also match by `Name` if `UniverseLinks` is empty (and backfill `UniverseLinks = popId`), and when brightening on the `engine.118` crossing Cycle, update `LastSeenCycle = cycle`.
   - Stop calling `dimCulturalFame_(ctx, popId, FAME_USAGE_BAR - fame)` unconditionally on every Cycle at `:1275, :1372-1378` (which both erases `:562` negative-press dims and loses to Phase 7 `decayCulturalFame_:88` under Phase 10 LWW once `cycle - LastSeenCycle > 10`). Instead, for the Fame door predicate in `generationalWealthEngine.js`, treat the fame requirement as satisfied when `(UsageCount >= 25 && Famous !== '') || culturalFameScore >= 25`, while keeping live `FameScore` on the `heritageStanding_` perk ladder.
3. **`es` — Implement `isYesFlag_` and `citizenClearsHeritageDoor_` / `lineClearsAnyDoor_` (`phase05-citizens/generationalWealthEngine.js:2533-2540, :2751-2984, :3044, :3117-3124`):**
   - Normalize `UNI (y/n)`, `MED (y/n)`, `CIV (y/n)` with `String(v || '').trim().toLowerCase().indexOf('y') === 0` (fixes `:3044` and handles `'Yes'`, `'No'`, `' no'`, `'n'`, and the `88` blank cells). Use explicit precedence `UNI > MED > CIV > none`.
   - Replace Doors A/B/C in founding (`:2784-2984`) and revival (`:3117-3120`) with the three flag-gated doors (Fortune `$1B`, Fame `$250M/$35M/$35M+Approval/$25M`, Roots `$10M + [N of 9]` for `no flag`).
   - In `:2774` (marriage into an existing line), drop `String(sp[iLast] || '').trim() === String(row[iLast] || '').trim()` so in-sim marriages (`bondEngine.js`) and hyphenated spouses join an existing line when `sp[iLin]` is set.
   - Fix `:3123` vs `:3317` (`prevDormantCycle = hl[hDorm]` before clearing `hl[hDorm] = ''`) so `HERITAGE_REVIVED` logs the real dormant cycle.
   - Update `FoundedDoor` / `HERITAGE_FOUNDED` hook strings (`:2876, :2975, :3301-3310`) from `'A'`/`'B'`/`'C'` to `'Fortune'` / `'Fame'` / `'Roots'`.
4. **`es` — Fix `applyOwnerDraw_` Tier 1/2 cutoff (`phase05-citizens/generationalWealthEngine.js:1183-1184`) so `engine.309` founders can actually climb to Fame / Roots:**
   - Remove or narrow `if (tier === 1 || tier === 2) continue;` at `:1184` for non-sports business owners (`isSportsLayerRow_` at `:1182` already excludes athletes/executives). Otherwise any off-heritage storefront owner who climbs to `Tier 2` (`UsageCount >= 6`) loses their business owner draw before they can ever reach `Tier 1` (Roots Rung 9) or `UsageCount >= 25` (Fame door).
5. **`es` — Atomic one-time deletion of the 5 lines (`Corliss`, `Paulson`, `Horn`, `Reaves`, `Villanueva`):**
   - In a single atomic operation: delete `LIN-00001`, `LIN-00006`, `LIN-00007`, `LIN-00008`, `LIN-00009` from `Heritage_Ledger`, clear `Simulation_Ledger.LineageId` on all 11 members (`POP-00005`, `POP-00594`, `POP-00595`, `POP-00596`, `POP-00527`, `POP-00022`, `POP-01027`, `POP-01130`, `POP-01131`, `POP-01132`, `POP-01133`), and strip the `[Heritage] the <Name> line is founded` entries from `Simulation_Ledger.LifeHistory` and `LifeHistory_Log` for those 10 rows.
   - Update `scripts/householdReconcile.test.js:434-645` (and `lib/wakePerception.test.js:24` if desired for cleanliness) to test the Fortune / Fame / Roots doors.
