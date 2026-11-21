# Adversarial Diff Review — `engine.339`: Fresh-Mint Lottery Kids & Birth Cap 40

**Reviewer:** agy (Antigravity) · **Date:** 2026-11-20 · **Brief:** [2026-11-20-rb-brief-agy-e339-kid-mint.md](file:///root/GodWorld/docs/for-claude-review/2026-11-20-rb-brief-agy-e339-kid-mint.md)  
**Scope:** Commit `1d74b2e49` ([generationalEventsEngine.js](file:///root/GodWorld/phase04-events/generationalEventsEngine.js), [generateGenericCitizens.js](file:///root/GodWorld/phase05-citizens/generateGenericCitizens.js), [processAdvancementIntake.js](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js), [engine304FamilyLottery.test.js](file:///root/GodWorld/scripts/engine304FamilyLottery.test.js), [engine339Births.test.js](file:///root/GodWorld/scripts/engine339Births.test.js)) plus unshipped 2026-11-08 intake-die deletion ([utilities/citizenDerivation.js](file:///root/GodWorld/utilities/citizenDerivation.js) at `6ead67356` and `cdf7ed12a`'s intake hunk in [prod-vs-parent-intake.diff](file:///root/GodWorld/output/research-build/2026-11-20-e339/prod-vs-parent-intake.diff)) staged by [push.sh](file:///root/GodWorld/output/research-build/2026-11-20-e339/push.sh).

## Verdict: HOLD

One blocking household-integrity bug in [`formIntakeHouseholds_`](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L2963-L3055) should be settled before pushing `processAdvancementIntake.js` to PROD. Everything else in the four shipping files aligns cleanly with the builder's 2026-11-20 rules.

---

## Findings

### 1. HIGH — `formIntakeHouseholds_` keeps `child` and `parent` members refused by the 21-year age floor inside the formed household

- **Where:** [processAdvancementIntake.js:2982-2999](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L2982-L2999), [processAdvancementIntake.js:3105-3111](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L3105-L3111), [processAdvancementIntake.js:1296-1310](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L1296-L1310)
- **Mechanism & failure scenario:**
  `engine.339` added a new early `return;` refusal inside [`wireFamilyMatch_`](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L3107-L3111) when `matchType` is `'child'` or `'parent'` and the age gap is under `DRIP_PARENT_AGE_MIN` (`21`). When triggered during household intake (`householdKey` present), [`processAdvancementRowsBody_`](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L1296-L1308) records `familyWired = false` and pushes `{ pop, idx, type: matchType, linked: false }` into `householdMints[householdKey].members`.
  In [`formIntakeHouseholds_`](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L2982-L2987), the filter that drops unwired members only checks `mm.type !== 'spouse' || mm.linked`:
  - **Input:** A two-person authored household intake batch (`HouseholdKey` set) with head Amy (`BirthYear` 2015, age 30) and queued `child` Ben (`BirthYear` 2005, age 40; or `BirthYear` 2027, age 18 -> 12-year gap).
  - **Wrong output:** `wireFamilyMatch_` refuses Ben (`ParentIds` and `ChildrenIds` left unwired), `mm.linked` is `false`, yet `:2983` keeps Ben in `hh.members`. `hh.members.length` stays `2 >= 2`, so a household **still forms** (`out.formed++`): Ben gets `mr[iHH] = hhId`, enters `Household_Ledger.Members` and `HouseholdIncome`, and inflates Amy's `[Household]` `LifeHistory` (`2-person household`), while `:2998` (`if (mem.type === 'child' && mem.linked)`) omits Ben from `kids`, leaving `NumChildren = 0`, `ChildrenIds = '[]'`, and writing a `single-parent` row in `Family_Relationships` with empty child columns. Same applies to a refused `parent` member.
- **Suggested fix (for Claude):** At [processAdvancementIntake.js:2982-2986](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L2982-L2986), exclude any non-head member with `!mm.linked` (`if (mm.type === 'head' || mm.linked) return true;`) and add a household-intake test covering a refused `< 21`-gap `child` and `parent`.

---

### 2. MEDIUM — `checkEmergencePromotions_` queues pre-`engine.339` renamed `child`/`parent` rows before D5 releases them, wasting `DRIP_CAP_PER_CYCLE`

- **Where:** [processAdvancementIntake.js:170-189](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L170-L189), [processAdvancementIntake.js:2114-2128](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L2114-L2128), [processAdvancementIntake.js:2380-2388](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L2380-L2388), [processAdvancementIntake.js:1034-1069](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L1034-L1069)
- **Mechanism & failure scenario:**
  `checkEmergencePromotions_` (`:170`) runs **before** `checkFamilyMatchPromotions_` (`:178`), which runs before `processAdvancementRows_` (`:189`).
  - **Input:** Any legacy pre-`engine.339` `Generic_Citizens` row with `Status = 'Family'`, `FamilyRole = 'child'` or `'parent'`, non-blank `MaidenName`, and `EmergenceCount >= 3` (`GC_EMERGENCE_PROMOTION_THRESHOLD`).
  - **Wrong output:** `checkEmergencePromotions_` checks `familySpotsOpen_` and `!famNames[...]` (`:2119-2121`), but does **not** check `role !== 'spouse' && !!MaidenName`. It appends the row to `Advancement_Intake1`, incrementing `results.queued` toward `DRIP_CAP_PER_CYCLE` (2) and shrinking the owner door's remaining cap (`DRIP_CAP_PER_CYCLE - emergenceResults.queued` at `:185-186`). Immediately after, D5 (`:2380-2383`) releases that GC row back to `Active` under its `MaidenName`. D6b (`:1057-1068`) then sees `famHits === 0`, refuses the mint cleanly, and clears the queue row (`rowsToClear.push`). No broken citizen lands on `Simulation_Ledger`, **but** 1 of the cycle's 2 emergence/owner promotion slots was burned on a dead arrival.
- **Note:** Non-blocking once legacy renamed child/parent rows flush on first live cycle, or trivial to close by adding `!renamed` to `famOpen` at `:2119-2121`.

---

### 3. LOW — `mintFamilyGcRow_` draws `rng()` for `sex` before checking `if (why)` (no hood / `byMin > byMax`)

- **Where:** [processAdvancementIntake.js:2305-2318](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L2305-L2318)
- **Mechanism:** `var sex = wantSex || (rng() < 0.5 ? 'female' : 'male');` (`:2307`) executes before `if (why) return null;` (`:2315-2318`). When a drawn citizen has no neighborhood or `byMin > byMax` (e.g., an under-21 or age-mismatched couple drawn for a child), an unnecessary `rng()` draw still occurs before returning `null`.
- **Replay note (expected):** `mintFamilyGcRow_` consumes 2–28 `rng()` calls per mint (`sex`, 1–25 name collision attempts, `by`, and optional `Occupation`) versus 1 call in the previous pool draw, so replay sequences against prior runs will diverge on the first child/parent hit; within `1d74b2e49`, seeded replay remains deterministic (`C2` `"same seed, same links (replay)"`).

---

### 4. LOW — `spouseFits339`, `mintFamilyGcRow_` spouse lookup, and `wireFamilyMatch_` co-parent branch do not filter on `Status`

- **Where:** [generationalEventsEngine.js:566-573](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L566-L573), [processAdvancementIntake.js:2298-2300](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L2298-L2300), [processAdvancementIntake.js:2364-2367](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L2364-L2367), [processAdvancementIntake.js:3131-3143](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L3131-L3143)
- **Mechanism:** Both `popRow339` (`generationalEventsEngine.js:569`) and `rowByPop` (`processAdvancementIntake.js:2366`) index every ledger row regardless of `Status`. In normal flow, deaths switch the survivor to `MaritalStatus = 'widowed'` (which blocks `checkBirth_`'s `marital !== "married"` check at `:1120`), whereas `familySpotsOpen_` still opens `child` spots for any citizen with `NumChildren` above on-ledger kids. If an invariant-broken or mid-cycle `deceased`/`inactive`/`traded` spouse still sits in `Simulation_Ledger` while referenced by `SpouseId`, its advancing `simYear - spBY` continues bounding births (`spouseFits339`) and minted child `BirthYear` (`spBy + 21..40`), and pre-existing `wireFamilyMatch_` `:3136` can still marry an arriving parent to a `deceased` `coParent` if `MaritalStatus === 'married'` and `SpouseId === ''`.

---

## Attack-by-Attack Verification Checklist

1. **`mintFamilyGcRow_` + D3 branch (`processAdvancementIntake.js:2289-2335`, `:2482-2495`, `:2114-2160`, `:1034-1069`, `:1293`, `:3340-3367`):**
   - **`gData` / `links.byAnchor` indexing:** `gData[0]` is header; `gData.length + 1` targets the exact 1-indexed sheet row right after the current last row (`setValues` runs before `gData.push`, so a sheet throw skips memory push and counts); `links.byAnchor[c.pop][type].push(gData.length - 1)` stores the 0-indexed `gData` position matching `releaseFamilyLink_` (`r + 1`). Verified clean.
   - **Name collisions:** `taken` (`:2441-2453`) seeds `First + Last` from all `Simulation_Ledger` rows, `First + Last` and `First + MaidenName` from all `Generic_Citizens` rows (all statuses), and queued `Advancement_Intake1` rows, and calls `takeName(mint.first, c.surname)` (`:2487`) after each mint in the pass. Up to 25 tries before failing gracefully with `noFit++`. Verified clean.
   - **Emergence door + `markAsEmergedInGeneric_` with blank `MaidenName`:** Verified statically (`:2114-2149` -> `:1034-1069` -> `:1293` -> `:3350-3367`). `mintFamilyGcRow_` writes `Last = c.surname` and `MaidenName = ''`; `checkEmergencePromotions_` queues `Last = c.surname` and `MaidenName = ''`; D6b finds `famHits === 1`; `processAdvancementRowsBody_` passes `first, last, ..., matchPop` to `markAsEmergedInGeneric_`, which matches `Status === 'family'`, `FamilyOf === familyOf`, `First`, and `Last` (`hits.length === 1`) -> `'Emerged'`. Verified clean (though untested end-to-end — see #5 below).
   - **Pool globals (`generateGenericCitizens.js:69-89`):** `GC_OCCUPATIONS` hoisted to top level; `mintFamilyGcRow_` (`:2290-2293`) throws loudly if files aren't loaded and calls `gcInitNamePools_()` if `GC_FEMALE_FIRST_NAMES` is `null`.

2. **D5 release by `MaidenName` (`processAdvancementIntake.js:2380-2389`, `:2274-2282`):**
   - **False releases:** Only `role !== 'spouse' && !!MaidenName` triggers `renamed`. Freshly minted `child`/`parent` rows never receive `MaidenName` (`:2320-2334`), and spouses are exempt (`role !== 'spouse'`). Verified clean.
   - **Idempotence:** `releaseFamilyLink_` (`:2274-2282`) sets `Status = 'Active'`, restores `Last = maiden` if present, clears `MaidenName`, `FamilyOf`, `FamilyRole`. Next cycle `gcFamilyLinks_` (`:2205`) skips non-`Family` rows. Verified clean.
   - **Spot reopening in the same fire:** `list.splice(k, 1)` at `:2384` immediately removes the released link before D2 (`:2402`), allowing `anchorPop` (if still `Active` with open spots) to enter `eligible` and draw a fresh mint in the same cycle — matches existing `engine.304` `C6` design (`"released and redrawn in the same pass"`).

3. **Age floor at `wireFamilyMatch_` / `wireFamilyToDeceased_` (`processAdvancementIntake.js:3103-3161`, `:3217-3248`):**
   - **No half-written rows on `wireFamilyMatch_` / `wireFamilyToDeceased_`:** Both functions check `tooCloseW` (`< DRIP_PARENT_AGE_MIN` = 21) **before** mutating `target`, `newRow`, `logSheet`, or `storyHooks` (`:3107-3111`, `:3219-3224`). Verified clean.
   - **Spouse excluded from `ParentIds` when `< 21` years older:** In `wireFamilyMatch_` (`:3149-3155`) and `wireFamilyToDeceased_` (`:3235-3239`), a partner under 21 years older than the child is skipped and logged while the primary parent link still writes. Verified clean.
   - **`formIntakeHouseholds_` defect:** See **Finding 1 (HIGH)**.

4. **Birth spouse check (`generationalEventsEngine.js:81`, `:87`, `:564-620`, `:1114-1166`, `:1177-1270`):**
   - **`"POPID Name"` form:** `spPop339` (`:567`) extracts `/POP-\d+/` and looks up `popRow339[spPop339]` keyed by trimmed `POPID`, handling both `"POP-00001"` and `"POP-00001 First Last"`. Off-camera spouse (no `POP-\d+` match or not on ledger) leaves `spouseFits339 = true`. Verified clean.
   - **Single-mother path & cap:** Lines `:599-620` check `counts.births < limits.births`, `mar2 === "single"`, and `age >= AGE_RANGES.BIRTH.min (26) && age <= AGE_RANGES.BIRTH.max (40)`. Updated ceiling (`40`) and cycle birth cap both apply. Verified clean.

5. **Shipping the 2026-11-08 intake-die deletion (`cdf7ed12a` + `6ead67356`):**
   - Grep across `phase*/`, `utilities/`, `lib/`, and `scripts/` confirms **zero** remaining callers of `deriveMaritalStatus`, `deriveNumChildren`, `profile.MaritalStatus`, or `profile.NumChildren` outside assertion guards in [lib/citizenDerivation.test.js:141-142](file:///root/GodWorld/lib/citizenDerivation.test.js#L141-L142) and [scripts/engine302Marital.test.js:53-54](file:///root/GodWorld/scripts/engine302Marital.test.js#L53-L54).
   - Verified `git diff 6ead67356 1d74b2e49 -- utilities/citizenDerivation.js` is empty (the staged file matches `6ead67356`), and [prod-vs-parent-intake.diff](file:///root/GodWorld/output/research-build/2026-11-20-e339/prod-vs-parent-intake.diff) replaces `profile.MaritalStatus` / `profile.NumChildren` at lines `1177-1178` with `age < 18 ? 'youth' : 'single'` and `0`. Verified clean.

6. **Tests & coverage gaps (`scripts/engine304FamilyLottery.test.js`, `scripts/engine339Births.test.js`):**
   - **C2 regex ([engine304FamilyLottery.test.js:309](file:///root/GodWorld/scripts/engine304FamilyLottery.test.js#L309)):** Widening `/POP-00021 drawn/` to `/POP-00021 drawn|the (child|parent) of POP-00021 \(C/` keeps the draw-rate assertion honest: child/parent mints log `... joins the background as the child of POP-00021 (C...)` instead of `... drawn for a ...`, while the pool row `Nobody Fits` (`:307`, age 80, Chinatown) guarantees spouse draws still hit `:2512` (`drawn for a spouse`). (Note `:310` `t4one` was not widened and passes only because the 99 T4 fixtures have `NumChildren: ''` and adult age, opening spouse spots only.)
   - **C4 / C9 `MaidenName` edits ([engine304FamilyLottery.test.js:391](file:///root/GodWorld/scripts/engine304FamilyLottery.test.js#L391), [:679](file:///root/GodWorld/scripts/engine304FamilyLottery.test.js#L679)):** Removing `MaidenName` from steady-state child fixtures aligns those tests with the new invariant (`children/parents never carry MaidenName`), while [:403-419](file:///root/GodWorld/scripts/engine304FamilyLottery.test.js#L403-L419) explicitly tests releasing a `MaidenName`-carrying child/parent and keeping spouses. Note that C9 indirectly confirms pre-`engine.339` renamed links on deceased citizens will also be released by D5.
   - **Coverage gaps (LOW):**
     1. [engine304FamilyLottery.test.js:445-457](file:///root/GodWorld/scripts/engine304FamilyLottery.test.js#L445-L457) tests `wireFamilyMatch_` in isolation rather than via `processAdvancementRows_` + `formIntakeHouseholds_` (which allowed **Finding 1** to pass all tests).
     2. [engine304FamilyLottery.test.js:461-490](file:///root/GodWorld/scripts/engine304FamilyLottery.test.js#L461-L490) C5 emergence-to-ledger test only uses a `spouse` with `MaidenName`, never driving a blank-`MaidenName` minted `child`/`parent` through `checkEmergencePromotions_` -> `markAsEmergedInGeneric_`; and [:249](file:///root/GodWorld/scripts/engine304FamilyLottery.test.js#L249) stubs `GC_*` arrays instead of loading `generateGenericCitizens.js`.
     3. [engine339Births.test.js:49](file:///root/GodWorld/scripts/engine339Births.test.js#L49) stubs `checkBirth_` to always return `null`, so `"POPID Name"` `SpouseId` values, single-mother births (`:599-620`), and `createChildRow_` (`:1177`) are untested in `engine339Births.test.js`.

---

## Checks Run (after reading target commit `1d74b2e49`, read-only)

- `node --check` on [generationalEventsEngine.js](file:///root/GodWorld/phase04-events/generationalEventsEngine.js), [generateGenericCitizens.js](file:///root/GodWorld/phase05-citizens/generateGenericCitizens.js), [processAdvancementIntake.js](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js), and [utilities/citizenDerivation.js](file:///root/GodWorld/utilities/citizenDerivation.js): clean (`exit 0`).
- `node scripts/engine304FamilyLottery.test.js`: **64 passed, 0 failed**.
- `node scripts/engine339Births.test.js`: **6 passed, 0 failed**.
- `node lib/citizenDerivation.test.js`: **57 passed, 0 failed**.
- `node scripts/engine302Marital.test.js`: **108 passed, 0 failed**.
- `node scripts/intakeExistingRowDoor.test.js`: **69 passed, 0 failed**.
- `node scripts/householdIntake.test.js`: **82 passed, 0 failed**.
- `node scripts/validateIntakeDerivation.contract.test.js`: **46 passed, 0 failed, 6 skipped** (live Sheets section skipped).
- `node scripts/validateIntakeDerivation.js`: **PASS — all 5 gates green** (read-only snapshot run).
- `node scripts/auditGenericCitizens.contract.test.js`: **28 passed, 0 failed, 4 skipped** (live Sheets section skipped).
- `node scripts/genericMicroVariety.test.js`: **3 passed, 0 failed**.
