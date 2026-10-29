# Adversarial Review — `engine.304` (Pre-PROD)

**Scope:** `25ee233c^..fc89b332` (`phase01-config`, `phase05-citizens`, `phase07-evening-media`, `lib/citizenPage.js`, `lib/wakePerception.js`).
**Checks run:** `node scripts/engine304FamilyLottery.test.js` (45/45 pass), `node lib/citizenPage.test.js` (29/29 pass), static trace + bench logs (`e304c1-bench.jsonl`, `e304c2-bench.jsonl`). Live-sheet scripts (`output/engine-sheet/2026-10-19-e304-*.js`) were not executed (read-only / no live Sheet calls).

---

## 1. Rate Drift & Trick Code (`docs/SIM_DOCTRINE.md` §15)

1. **`heritageRank_()` is 0-indexed in prod, zeroing the `Founding` boost and shifting all heritage weights down by `0.5×` (`phase05-citizens/processAdvancementIntake.js:2018-2020`, `phase05-citizens/generationalWealthEngine.js:2525-2530,2602-2607`).**
   - `HERITAGE_TIERS` places `'Founding'` at index `0`, so `heritageRank_('Founding')` returns `0` — identical to no lineage (`'' → 0`). `w = tierMult * (1 + 0.5 * hRank)` gives `Founding` `1.0×` (no boost) and `Established/Prominent/Dynasty` `1.5×/2.0×/2.5×`.
   - Both the D4 approval table (`output/engine-sheet/2026-10-19-e304-odds-tierdraw.js:35`) and the unit test mock (`scripts/engine304FamilyLottery.test.js:12`) hardcoded `{ Founding: 1, Established: 2, Prominent: 3, Dynasty: 4 }` (`1.5×/2.0×/2.5×/3.0×`), masking the drift.

2. **Linked `Family` children under 13 are blocked from acquaintance surfacing, and two wake paths drop `family-own-words` (`phase05-citizens/generateCitizensEvents.js:2344,3890`, `scripts/cron-work-wake.js:175-189,265`, `scripts/citizen-exchange.js:403`, `lib/citizenPage.js:66`).**
   - `generateCitizensEvents_` skips GC rows with `gsAge < 13` (`:2344`) and only runs for Tier 3–4 `ENGINE` citizens (`:3890`). A T1/T2 parent (e.g. Darrin Davis `POP-00021`, age 33, 6 kids) never triggers acquaintance ticks from their own daily events, and any child linked under age 13 gets zero acquaintance ticks citywide.
   - Their non-media path is `family-own-words`, but `cron-work-wake.js` (`daypart = 'work'`, which wakes `sports-player` and `civic-*` roles) never calls `loadFamily()`, and `citizen-exchange.js:403` records debates with `daypart = 'DEBATE'`, which is absent from `OWN_WORDS_SLOT_RE` (`lib/citizenPage.js:66`) and `SCAN_SLOT_RE` (`scripts/scanCitizenPages.js:55`).

3. **Role-type draw ignores spot counts (`50/50` spouse vs child) and youth pool density starves young parents (`phase05-citizens/processAdvancementIntake.js:2024,2081,2103`, `phase05-citizens/generateGenericCitizens.js:382,648`).**
   - `c.types` deduplicates roles (`['spouse', 'child']`), so a citizen with 1 spouse spot and 6 child spots (Darrin Davis) rolls `spouse` 50% of the time until married instead of `1/7` vs `6/7`.
   - Child fit requires `BirthYear` in `[c.by + 18, c.by + 45]` (`:2103`). For Darrin (`c.by = 2009`, age 33), children must have `BirthYear >= 2027` (`age <= 15`). On Cycle 1 before youth minting accumulates, 0 active GC rows are under 19 (0% fit for any parent under 37). Even at the 40-row youth floor across 22 hoods (~1.8 youth/hood across ages 0–17), a parent aged 20–24 (`child age <= 6`) averages <1 matching youth per neighborhood cluster.

---

## 2. Silent Fallbacks

4. **`checkForPromotions_` promotes an explicit `Age = 0` infant with blank `BirthYear` as a 30-year-old adult (`phase05-citizens/checkForPromotions.js:334-335` vs `:668-670`).**
   - `selectFloorWaveRows_` (`:670`) and `generateGenericCitizens_` (`:376`) check `gAge !== ''`, treating `BirthYear = ''`, `Age = 0` as a minor (tested in `scripts/engine304FamilyLottery.test.js:160`).
   - `checkForPromotions_:335` uses `Number(row[gAge] || 30)`. Because `0` is falsy, `0 || 30` evaluates to `30`, bypassing `if (age < 18) continue;` (`:336`) and promoting the infant as a 30-year-old adult worker.

5. **`getGenericYouth_` in `runYouthEngine.js` ignores `BirthYear` and `Family` status (`phase05-citizens/runYouthEngine.js:602,633-637`, `phase05-citizens/generateGenericCitizens.js:658-671`).**
   - New youth rows minted by Cut 1 leave `Age` blank (`""`) and write only `BirthYear` (`:659-660`). `getGenericYouth_` reads only `Number(row[iAge]) || 0` (`:633`), evaluating every new GC youth to `0` (`< MIN_AGE = 5`) and silently excluding the entire Cut-1 youth pool from youth events. Meanwhile, `:635` only filters `deceased|inactive|traded|pending`, failing to exclude `Family`, `Emerged`, `Promoted`, or `Courting` rows that carry a legacy numeric `Age`.

6. **`loadFamily()` drops on-ledger `ParentIds` and fails silently on lowercase `popId` (`lib/wakePerception.js:214,221,231,245,280-293`).**
   - `loadFamily` never reads `Simulation_Ledger.ParentIds`; a minor with one on-ledger parent and one GC `Family` parent is told only `"your parent is <GC parent>"`, while their on-ledger parent falls into `"you share your home with <parent>"` like a roommate. Also, `popId` is not normalized with `.toUpperCase()` on entry (`:214`), so lowercase input silently returns `''`.

---

## 3. Canon Damage

7. **`wireFamilyMatch_` leaves asymmetric ledger pointers on `'spouse'`/`'parent'` and forces adult `'child'` rows into their parent's household (`phase05-citizens/processAdvancementIntake.js:2708-2757`).**
   - **`'spouse'` (`:2715-2716`):** copies `target[iChildren]` into `newRow[iChildren]` without adding `newPopId` to each child's `ParentIds` on `Simulation_Ledger`. A minor child's `ParentIds` remains length 1, so `familySpotsOpen_` (`:1927`) still sees an open `parent` spot and can link a *third* parent.
   - **`'parent'` (`:2722,2731-2737`):** when wiring `newRow` as `coParent`'s spouse, `newRow[iChildren]` is not populated with `coParent`'s other children, `newRow[iNumKids]` keeps `deriveCitizenProfile_`'s random count (or `1`), and `coParent` gets no `[Family]` `LifeHistory` entry.
   - **`'child'` (`:970-971,2741-2757`):** over half of bench child links (`e304c2-bench.jsonl`) are adults aged 18–46. When an adult child emerges, they retain `deriveCitizenProfile_`'s random `MaritalStatus`/`NumChildren` while `:2756` unconditionally overwrites `newRow[iHH] = target[iHH]`, collapsing the adult child into their parent's household.

8. **`markAsEmergedInGeneric_` stranger branch ignores `Status` on duplicate names, and `releaseFamilyLink_` laundered `family-own-words` ticks into stranger promotions (`phase05-citizens/processAdvancementIntake.js:1817,1947-1960,2879-2888`).**
   - When `!matchPop` (`:2879-2888`), the loop marks the first GC row matching `First + Last` as `'Emerged'` without checking `Status` (19 duplicate name pairs exist, `:2558`). If an earlier duplicate is already `'Emerged'`/`'Promoted'`, the active row stays `'Active'` at `EmergenceCount >= 3` and permanently consumes 1 of the 2 `DRIP_CAP_PER_CYCLE` slots every Cycle (`:1844`).
   - If a `Family` row reaches `EmergenceCount = 3` via `family-own-words` (`lib/citizenPage.js:121-147`, e.g. anchor says `"my wife Amara"`) and the spot closes before minting (`:858` or `:1815`), `releaseFamilyLink_` (`:1955`) restores her maiden name and `Status = 'Active'` while keeping `EmergenceCount = 3` — minting her next Cycle as an unrelated stranger with zero media or street appearances.
