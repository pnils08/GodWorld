# Adversarial Diff Read — engine.356 Cut C: Citizen's Own Spot Pick (`SpotBizId`)

**Commit:** `bfcd210e7` (vs PROD stage 89 `d09eedf38`)
**Scope:** [phase05-citizens/generateCitizensEvents.js](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js), [lib/spotPick.js](file:///root/GodWorld/lib/spotPick.js), [output/engine-sheet/2026-11-26-e356v/](file:///root/GodWorld/output/engine-sheet/2026-11-26-e356v) (`run.sh`, `seed.js`, `read.js`, `compare.js`, `bench-push.sh`, `push.sh`, `bench.js`)
**Plan & Brief:** [2026-11-21-a-moment-has-a-place.md](file:///root/GodWorld/docs/plans/2026-11-21-a-moment-has-a-place.md) · [2026-11-26-es-brief-agy-e356-spot-pick.md](file:///root/GodWorld/docs/for-claude-review/2026-11-26-es-brief-agy-e356-spot-pick.md)

---

## Verdicts by Part

| Part | Verdict | Summary |
|---|---|---|
| **1. Engine (`generateCitizensEvents.js`)** | **HOLD** | Crashes unconditionally on every call (`S.spotPicks = spotPicks;` runs at `:514` before `var S = ctx.summary` at `:546` — confirmed across all 7 offline `generateCitizensEvents_` test suites). In addition, `commitSimulationLedger_` clobbers mid-fire `SpotBizId` writes, `pickedId` / `spotPickByPop_` lack POPID/BIZ-ID normalization, and differing `citizenSpotLines_` weights shift `ctx.rng` across downstream citizens. |
| **2. Cron half (`lib/spotPick.js`)** | **SHIP-WITH-FIXES** | VM load of `applyBusinessDynamics.js` + `canonNeighborhoodLoader.js` and missing-column handling are clean, but `writePick` updates the cell *before* re-checking `POPID` (corrupting a shifted neighbor row on race), `parsePick` drops trailing `.` on `"… & Co."` names and takes the *first* `SPOT:` line on multi-line replies, and `hoodSpots` still offers winding-down/closing businesses dropped from `S.hoodSpots`. |
| **3. Bench (`output/engine-sheet/2026-11-26-e356v/`)** | **HOLD** | Positional `picks` vs `full` comparison (`read.js:26-30`) breaks whenever `spotPool` shifts a `good` citizen's RNG draws or `mirrorShared_` twin count, misses act-filter fallthrough / `hashBiz` / `PlaceId` / post-fire `SpotBizId` persistence checks, and `seed.js` ignores whether seeded picks even have `spot:` events (`notProven` exit `3`). |

---

## Part 1 — Engine (`phase05-citizens/generateCitizensEvents.js`) — **HOLD**

### 1.1 [CRITICAL / BLOCKER] `S.spotPicks = spotPicks;` executes before `var S` is initialized, crashing every `generateCitizensEvents_` call
- **Pointers:** [generateCitizensEvents.js:507-514](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L507-L514), [:543-546](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L543-L546)
- **Failure (`input -> wrong output`):**
  - Line `:514` assigns `S.spotPicks = spotPicks;`, while `var S = ctx.summary || (ctx.summary = {});` is declared 32 lines later at `:546` (and after the required-column guard at `:543`).
  - Because JS hoists `var S` as `undefined`, **every invocation** of `generateCitizensEvents_(ctx)` immediately throws:
    `TypeError: Cannot set properties of undefined (setting 'spotPicks')`.
  - Verified directly by running the repo's offline `generateCitizensEvents_` suites: all 7 suites (`testNeighborhoodLoop.js`, `citizensEventsFame.t3.test.js`, `codedPoolDownSide.test.js`, `griefPeriod.test.js`, `gameNightFans.test.js`, `unlivedEcho.test.js`, `engine299Graded.test.js`) crashed at `:514`.

### 1.2 [HIGH] Consolidated `Simulation_Ledger` commit overwrites mid-fire `SpotBizId` writes; `spotPickByPop_` and `citizenSpotFor_` lack case/trim normalization
- **Pointers:** [initSimulationLedger.js:37-53](file:///root/GodWorld/phase01-config/initSimulationLedger.js#L37-L53), [commitSimulationLedger.js:25-38](file:///root/GodWorld/phase10-persistence/commitSimulationLedger.js#L25-L38), [generateCitizensEvents.js:284](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L284), [:507-513](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L507-L513), [:1737](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L1737), [:3365](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3365), [:3524](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3524), [:3628](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3628), [:4734](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4734)
- **Failure (`input -> wrong output`):**
  - `initSimulationLedger_` snapshots the entire `Simulation_Ledger` grid (`cols 1..width`, including `SpotBizId`) before Phase 1. `generateCitizensEvents_:4734` sets `ctx.ledger.dirty = true`, and `commitSimulationLedger_` (`:28-37`) queues `queueRangeIntent_(ctx, 'Simulation_Ledger', 2, 1, ctx.ledger.rows, ..., 100)` over every row and column at Phase 10. Any `SpotBizId` written by `lib/spotPick.js:writePick` between `initSimulationLedger_` and Phase 10 flush (or while paused at checkpoint) is silently overwritten by the stale pre-fire cell.
  - `spotPickByPop_` (`:512`) is keyed on raw `rows[spr][iPopID]` (using `{}` instead of `Object.create(null)`) and queried at `:1737` and `:3628` with raw `popId` (`rows[r][iPopID]`, `:3365`) rather than normalized `popIdNorm` (`:3524`). `citizenSpotFor_` (`:284`) also compares `String(hoodSpots[p].id) === pickedId` case-sensitively, so lowercase `biz-00041` silently falls through to the hash pick.

### 1.3 [HIGH] Changing `ownSpot` (`:3628`) changes `spotPool` weights and shifts `ctx.rng` for downstream citizens (and `pickVenue_` consumes 1 or 2 rolls, not fixed 2)
- **Pointers:** [generateCitizensEvents.js:298-315](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L298-L315), [:1737-1738](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L1737-L1738), [:3628-3633](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3628-L3633), [:4359](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4359), [:4713](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4713)
- **Failure (`input -> wrong output`):**
  - When a citizen's stored `SpotBizId` replaces their hash spot at `:3628`, `citizenSpotLines_(ownSpot)` (`:3630`) injects `SPOT_LINE_WEIGHT_ = 11` entries into `pool` whenever the new spot has `streak >= 2`, `shed > 0`, `recovery`, `lift`, or `chaos` (or removes them if the hash spot had facts and the picked spot is steady).
  - Altering `pool` weights before `pickWeighted_(usePool)` (`:4359`) can switch the drawn entry between a `spot:` line (0 slot rolls, 0 twin rows) and a `$VENUE` / `$PROGRAM` / `$CONTACT` / `shared:both` line (1–2+ slot rolls, optional `mirrorShared_` twin row). Because `roll()` shares one `ctx.rng` stream across all citizens, any changed `roll()` count shifts every downstream citizen in `rows`.
  - Also `pickVenue_:1738` (`(own && roll() < 0.5) ? own : spots[Math.floor(roll() * spots.length)]`) consumes 1 `roll()` when `< 0.5` and 2 `roll()`s when `>= 0.5`.

### 1.4 [MEDIUM] `S.spotPicks.stored` counts only participating event-emitters, not stored picks in `Simulation_Ledger`
- **Pointers:** [generateCitizensEvents.js:509-514](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L509-L514), [:3581](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3581), [:3629](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3629)
- **Failure (`input -> wrong output`):**
  - `spotPicks.stored` (`:3629`) only increments for active adult citizens who survive `if (!chanceHit(chance)) continue;` (`:3581`), so `S.spotPicks.stored` under-reports the number of `SpotBizId` cells present in the ledger (~15–20% of actual stored picks).

### Attacks Checked Clean (Part 1)
- **Act-filter fallthrough (`pickVenue_`):** When a citizen picks a retail store and draws an ECL `meal` `$VENUE` line, `pickVenue_` (`:1731-1737`) filters `spots` to `fit` (food places) before calling `citizenSpotFor_(fit, popId, spotPickByPop_[popId])`, so `pickedId` is not in `fit` and falls back to the hash pick among `fit` cleanly while keeping `own !== null` parity in `:1738`.
- **Ragged ledger rows & 2-arg callers:** `rows[spr][iSpotPick] || ''` (`:511`) evaluates `''` safely on short rows; 2-arg callers (`citizenSpotFor_(list, popId)` in `scripts/testNeighborhoodLoop.js:754-808`) still match when `pickedId === undefined`.
- **Downstream & summary collisions:** No other reader uses `S.spotPicks`, `SpotBizId`, or `spot:`; [world-view/build.js:40-45](file:///root/GodWorld/world-view/build.js#L40-L45) reads per-Cycle `PlaceId` / `EventText` without assuming citizen spots stay invariant across cycles, and [lib/wakePerception.js](file:///root/GodWorld/lib/wakePerception.js) does not assume fixed spots.

---

## Part 2 — Cron half (`lib/spotPick.js`) — **SHIP-WITH-FIXES**

### 2.1 [HIGH] `writePick` (`:105-123`) writes BEFORE re-checking `POPID` at `rowIdx` and omits header/POPID trimming
- **Pointers:** [lib/spotPick.js:105-123](file:///root/GodWorld/lib/spotPick.js#L105-L123)
- **Failure (`input -> wrong output`):**
  - `:114` finds `rowIdx`, `:119` executes `await sheets.updateRange(a1, [[bizId]])`, and `:120-121` re-reads `Simulation_Ledger` *only after* the write (`String((back[rowIdx] || [])[iPop]).toUpperCase() !== want`). If a row above `rowIdx` was deleted or inserted between `:107` and `:119`, `writePick` has already overwritten another citizen's `SpotBizId` cell with no rollback before returning `{ error }`. Re-reading `{A|POPID}<row>` + target cell right before updating, or refusing on mismatch without overwriting, prevents silent neighbor corruption (and per `Finding 1.2`, any write landing mid-Cycle fire is still clobbered at Phase 10).
  - `:110` (`String(x) === PICK_HEADER`) and `:113-114` (`String(popId).toUpperCase()`) omit `.trim()`, and `:116-117` compares raw `was === bizId` without `String(bizId || '').trim().toUpperCase()`. Missing `SpotBizId` column returns `{ error: 'SpotBizId column not found' }` cleanly at `:112` without hitting a nonexistent 56th column.

### 2.2 [MEDIUM] `parsePick` (`:25, :81-88`) breaks on multiple `SPOT:` lines, canonical names ending in `.`, or trailing words, and strips unmatched `SPOT:` lines
- **Pointers:** [lib/spotPick.js:25](file:///root/GodWorld/lib/spotPick.js#L25), [:81-88](file:///root/GodWorld/lib/spotPick.js#L81-L88)
- **Failure (`input -> wrong output`):**
  - `PICK_LINE` (`:25`) uses `/im` (non-global), so `:82` captures only the **first** `SPOT:` line in the reply rather than the final line (`askBlock` `:76`). If a reply contains two `SPOT:` lines (e.g., discussing or correcting the choice), the first wins and `:87` leaves the second `SPOT:` directive in the saved page text.
  - `:85` strips trailing `.` from `want` (`raw.replace(/^["'“”<]+|["'“”>.]+$/g, '')`), whereas `:86` compares against unstripped `norm(sp.name)`. Any spot name ending with `.` (e.g., `"… & Co."`, `"… Inc."`) fails `norm(sp.name) === want` and yields `pick: null`.
  - Trailing punctuation/notes (`SPOT: Grand Lake Kitchen!`, `SPOT: OakHouse (Fridays)`) fail the exact match (`pick: null`), yet `:87` (`String(reply).replace(m[0], '')`) still deletes the line from `text`.

### 2.3 [MEDIUM] `hoodSpots` (`:46-55`) offers winding-down and closing-this-cycle businesses omitted by `applyBusinessDynamics_`
- **Pointers:** [lib/spotPick.js:12-13](file:///root/GodWorld/lib/spotPick.js#L12-L13), [:46-55](file:///root/GodWorld/lib/spotPick.js#L46-L55); [applyBusinessDynamics.js:614](file:///root/GodWorld/phase05-citizens/applyBusinessDynamics.js#L614), [:707-719](file:///root/GodWorld/phase05-citizens/applyBusinessDynamics.js#L707-L719), [:788-827](file:///root/GodWorld/phase05-citizens/applyBusinessDynamics.js#L788-L827), [:834-842](file:///root/GodWorld/phase05-citizens/applyBusinessDynamics.js#L834-L842); [lib/sheets.js:75-76](file:///root/GodWorld/lib/sheets.js#L75-L76)
- **Failure (`input -> wrong output`):**
  - `applyBusinessDynamics_` skips winding-down (`ps.closed`, `:710-719`) and closing (`closesNow`, `:788-827`) businesses before populating `S.hoodSpots` (`:837`). Because `lib/spotPick.hoodSpots` reads only `Business_Ledger`, those winding-down businesses are still offered in `askBlock` (`:72-78`) and accepted by `parsePick` / `writePick`, then silently ignored by `citizenSpotFor_` until archived (`lib/spotPick.js:12-13` notes this limitation). Also `applyBusinessDynamics.js:614` trims headers whereas `sheets.getSheetAsObjects` (`lib/sheets.js:75-76`) keys by untrimmed `header`.

### 2.4 [LOW] `namedIn` (`:66-69`) and `noteNamed` / `loadAsks` (`:91-100`) edge cases
- **Pointers:** [lib/spotPick.js:63-69](file:///root/GodWorld/lib/spotPick.js#L63-L69), [:91-100](file:///root/GodWorld/lib/spotPick.js#L91-L100)
- **Failure (`input -> wrong output`):**
  - Against live `output/beats/Business_Ledger.jsonl` (`282` rows -> `139` food/retail spots across `22` hoods, `0` dropped by `resolveHoodOrChild_`), generic short names (`"The Hold"`, `"Little Avenue"`) risk incidental prose matches if those exact phrases appear in wake reflections, while accented (`"Panadería La Doce"`, `"Taquería El Andén"`) and `&` names (`"Green & Gold Tavern"`) miss unaccented or `"and"` spellings. Possessive `"Romano's"` matches cleanly (`[^a-z0-9]` allows `'`), as does `"Dimond Cafe's"` after `Cafe`, though a spot object with an empty `name` would match all text.
  - `loadAsks` (`:91`) catches all errors (including corrupt JSON, not only `ENOENT`) and silently returns `{}`; `noteNamed` (`:98`) overwrites `st[popId]` even if `e.asked > 0` from a prior ask, resetting `asked: 0` and clearing `picked`.

### Attacks Checked Clean (Part 2)
- **VM execution (`engineRules` `:28-43`):** Loading `phase05-citizens/applyBusinessDynamics.js` and `phase01-config/canonNeighborhoodLoader.js` in `vm.createContext({ Logger: { log() {} } })` executes only pure `var` / table initializers (`BIZ_DYNAMICS_REQUIRED_KEYS`, `BIZ_CLASS_MINT`, `BIZ_SECTOR_CLASSES`, `BIZ_SPOT_CHAOS_`, `VENTURE_GONE_STATUS`) with zero unfulfilled global references at load, and reproduced all `139` spots across `22` hoods on local `output/beats/Neighborhood_Map.jsonl` + `output/beats/Business_Ledger.jsonl` (`0` unmapped).

---

## Part 3 — Bench Scripts (`output/engine-sheet/2026-11-26-e356v/`) — **HOLD**

### 3.1 [HIGH] `e356v/read.js` positional comparison against `after-full.json` fails on `spotPool` RNG shifts and misses fallback, `PlaceId`, and `SpotBizId` persistence checks
- **Pointers:** [e356v/seed.js:18-26](file:///root/GodWorld/output/engine-sheet/2026-11-26-e356v/seed.js#L18-L26), [e356v/read.js:13](file:///root/GodWorld/output/engine-sheet/2026-11-26-e356v/read.js#L13), [:21-35](file:///root/GodWorld/output/engine-sheet/2026-11-26-e356v/read.js#L21-L35), [e356v/compare.js:10](file:///root/GodWorld/output/engine-sheet/2026-11-26-e356v/compare.js#L10)
- **Failure (`input -> wrong output`):**
  - **Positional comparison brittleness (`:25-30`):** Because switching a `good` citizen's spot changes `citizenSpotLines_` weights (`Finding 1.3`), any pick that adds/removes a `spot:` pool line or changes whether a `shared:both` line fires shifts `log.length` (`:26`) and `ctx.rng` for all later citizens — causing false `FAIL` on `:25` (`ignoredChecked`) and `:28-30` (`rowsDifferOthers`).
  - **Checks that cannot fail / blind spots in `read.js`:**
    1. `read.js:23` counts `venueLinesOnPick` via `r[1].indexOf('place:' + p.biz) >= 0`, never verifying `p.hashBiz` / `p.hashName` (saved by `seed.js:21`, unused by `read.js`), never checking `PlaceId` (`r[3]` dumped at `:13` and ignored), and never checking that act-filter drops (`meal` at a retail pick) actually fall back to `citizenSpotFor_(fit, ...)`.
    2. `read.js:22` validates `spot:` lines only by substring `r[2].indexOf(p.name) >= 0`, which passes falsely if `p.name` is a substring of another business name.
    3. `read.js:25` (`ignoredChecked` for `wronghood` / `bogus`) cannot fail if `SpotBizId` was never read at all (and depends on `rowsOf(log) === rowsOf(full)` holding despite `spotPool` RNG shifts).
    4. `seed.js:21` picks `list.find(x => x.id !== hash.id)` without ensuring `pk` has any `spot:` line facts (`streak >= 2`, `shed`, `lift`, `chaos`), risking `notProven` exit `3` (`:31`: `'no good-pick citizen drew a spot line'`) even on healthy code; meanwhile `seed.js` seeds no child-area pick (`resolveHoodOrChild_`) and no closed/winding-down `SpotBizId`, and `read.js` never verifies `Simulation_Ledger.SpotBizId` survived `commitSimulationLedger_`.
    5. `compare.js:10` slices `a.log[i].slice(0, 3)`, omitting `PlaceId` (`r[3]`).

---

## Verification & Checks

- **Syntax (`node --check`):** `phase05-citizens/generateCitizensEvents.js`, `lib/spotPick.js`, `output/engine-sheet/2026-11-26-e356v/seed.js`, `read.js`, `compare.js` -> exit `0`.
- **Offline tests & local data checks run against `bfcd210e7` (`node`):**
  - `lib/citizenPage.test.js`: **73 passed, 0 failed**.
  - Local `lib/spotPick.js` (`engineRules` + `hoodSpots`) over `output/beats/Neighborhood_Map.jsonl` + `output/beats/Business_Ledger.jsonl`: loaded `22` hoods, `139` food/retail spots (`0` dropped by hood).
  - **Crashed on `TypeError: Cannot set properties of undefined (setting 'spotPicks')` at `generateCitizensEvents.js:514` (`EC=1`):**
    - `scripts/testNeighborhoodLoop.js`
    - `scripts/citizensEventsFame.t3.test.js`
    - `scripts/codedPoolDownSide.test.js`
    - `scripts/griefPeriod.test.js`
    - `scripts/gameNightFans.test.js`
    - `scripts/unlivedEcho.test.js`
    - `scripts/engine299Graded.test.js`
