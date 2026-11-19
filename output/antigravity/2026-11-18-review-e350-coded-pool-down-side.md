# Adversarial Review — `engine.350` Task 7, the Down Side of the Coded Pools (`8f4d6dd4d`)

**Reviewed:** commit `8f4d6dd4dcfe71546a94d21a1f4df84844843e6d` (`phase05-citizens/generateCitizensEvents.js`, `scripts/codedPoolDownSide.test.js`, `scripts/downLinesEclPool.js`, `scripts/downLinesEclPool.test.js`, `scripts/occupationDialTags.js`, `scripts/occupationDialTags.test.js`), `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md`, `phase02-world-state/loadEventContentLedger.js`, `phase05-citizens/citizenContextBuilder.js`, `utilities/citizenMemory.js`, `utilities/citizenDialMap.js`, `utilities/neighborhoodPulseMap.js`, `utilities/compressLifeHistory.js`, `lib/wakePerception.js`, `scripts/buildLivesSlice.js`, `scripts/newsroomSourcing.js`, `phase05-citizens/runRelationshipEngine.js`, `phase05-citizens/runNeighborhoodEngine.js`, `phase05-citizens/runHouseholdEngine.js`, `phase05-citizens/runAsUniversePipeline.js`, live `Event_Content_Ledger` / `World_Config` / `LifeHistory_Log` / `Simulation_Ledger` (read-only), and stage-54 bench logs (`output/research-build/2026-11-18-e350-bench*`).
**Reviewer:** Antigravity (agy lane, read-only, no code/sheet edits, no bench/engine fires, no commits).
**Verdict:** **HOLD**

All three test files in `8f4d6dd4d` pass when run in this session (`node scripts/codedPoolDownSide.test.js`: 46 passed, 0 failed; `node scripts/downLinesEclPool.test.js`: 361 assertions passed; `node scripts/occupationDialTags.test.js`: 551 assertions passed), and `node --check` passes on all six changed files. However, the review finds unguaranteed eligibility on the `faith.*`, `civic.health-center`, and `firstFridayLines` rows; an inverted `outabout` multiplier and positive hood pulse on the new `FirstFriday` down lines; untouched `FirstFriday` sibling writers emitting sociability/up-only lines; factual errors in the share claim for `PLACED` rows (existing multi-row pools and unsigned rows eating share and emit slots); a winter-specific, single-hood remainder if Row 357 is turned off; major divergence between `LifeHistory_Log` and `Simulation_Ledger` cells plus a 4:1 permanent upward bias at `60/40` under `citizenMemory.js`'s 3-cycle streak; and test stubs/blind spots that leave key production paths unexercised.

---

## 1. Each line, by what it says (`generateCitizensEvents.js`, `downLinesEclPool.js`)

### 1a. `DOMAIN_MOMENTS` (30 new down lines, `phase05-citizens/generateCitizensEvents.js:2036-2128`)
- **Dials and directions:** All 30 lines match their `dial:<dial>:<up|down>` tag in polarity and domain. Note one nuance: `source:familyLife` (`:2036-2038`) adds three `warmth:down` lines and **0 `family:down` lines** — in particular `"found last year's birthday card still unsent in a drawer and left it there"` (`:2038`) is signed `warmth:down` rather than `family:down`.
- **Canon / life-state assertions:** All adults (`!isMinor`, `:2778`) draw `baseDaily` (`:2532-2537, 2929-2932`). None asserts a spouse, child, sibling, parent, job, or stairs; `"a relative"` (`:2036, 2037`) and `"a neighbor"` / `"wall"` (`:2046, 2097, 2125`) stay within the S280 canon guard (`:2023`).

### 1b. `firstFridayLines` (6 re-signed + 4 added, `phase05-citizens/generateCitizensEvents.js:2502-2513`)
- **Dials and directions:** The 6 re-signed lines (`outabout:up` ×2 for attending galleries/art walk, `openness:up` ×3 for creative energy/open studios/new artists, `sociability:up` ×1 for community arts scene) and 4 new lines (`sociability:up` `"ran into half the block..."`, `sociability:down` `"went to the art walk alone..."`, `openness:down` `"stood at the back of a crowded gallery..."`, `outabout:down` `"heard the art walk from three blocks off and shut the window"`) match what each sentence says.
- **Unguaranteed spatial assertion:** `firstFridayPool` is injected into `pool` for **every adult citizen in all 22 neighborhoods** whenever `isFirstFriday` is true (`generateCitizensEvents.js:3030-3035`, with no `hood` gate). A citizen living in East Oakland, Fruitvale, or Piedmont Ave can draw `"heard the art walk from three blocks off and shut the window"` (`:2512`), which asserts living within three blocks of the Uptown/KONO/Temescal art walk.
- **Inverted `dialBands` weighting on `source:firstFriday` down lines:** At `generateCitizensEvents.js:3597`, `dialBands` applies `else if (dwTag === 'source:firstFriday' || dwTag === 'source:holiday' || dwTag === 'source:creationDay') dwMod *= dm.outabout;`. Because all 10 `firstFridayLines` carry `source:firstFriday`, a high-`outabout` citizen (`dm.outabout` up to `1.5`) is boosted to draw `"heard the art walk from three blocks off and shut the window"` (`dial:outabout:down`) and `"went to the art walk alone..."` (`dial:sociability:down`), while a homebody (`dm.outabout` = `0.5`) has those down lines suppressed.

### 1c. `PLACED` (9 rows, `scripts/downLinesEclPool.js:237-265`)
- **Who can draw `faith.attending` and `faith.volunteering` (`scripts/downLinesEclPool.js:250-258`):**
  - Neither `loadEventContentLedger.js` (`CONTENT_LEDGER_DSL_FIELDS`, `:70-137`) nor `generateCitizensEvents.js` (`condScopes`, `:3354-3425`; `evalContentConditions_`, `:1367-1390`; `isEventEligible_`, `phase05-citizens/citizenContextBuilder.js:120-134`) has any faith, church, or `Faith_Organizations` membership scope or condition.
  - `generateCitizensEvents.js:3426-3459` iterates every `contentLedger.lines` key except `civicRole.*` and `lifeEvent.*` (`:3428-3429`). The three `PLACED` faith rows carry `Conditions: 'band!=child'` and `Tags: 'source:familyLife,auth:rb-1118,dial:<dial>:down'` (`eventClassFromTags_` returns `'universal'`, `citizenContextBuilder.js:113`).
  - Therefore, **every adult citizen in Oakland** — regardless of whether they belong to any congregation in `Faith_Organizations` or have ever attended a service — draws `"left by the side aisle during the last hymn to miss the talk in the parking lot"` (`faith.attending`), `"sorted the donation bags and judged, privately, what people had seen fit to give"` (`faith.volunteering`), and `"took the job at the back of the fellowship hall, the one nobody talks during"` (`faith.volunteering`). The existing live rows (`166, 195, 238–243`) share this gap (rows `166` and `242` even have blank `Conditions`, though `generateCitizensEvents.js:2778` skips minors). Also, using `source:familyLife` rather than `source:faith` means none of these `faith.*` rows triggers `S.faithExposures` (`generateCitizensEvents.js:3863`).
- **Unguaranteed neighborhood assertion on `civic.health-center` (`scripts/downLinesEclPool.js:262-264`):**
  - `PLACED[8]` (`"walked past the renderings for the Temescal Community Health Center and decided it would never look like that"`, `dial:openness:down`) has `Conditions: 'band!=child'` and **no `hood=Temescal` condition** (copied from live row `211`). Any non-child citizen in any of the 22 neighborhoods draws a line asserting they walked past the Temescal health center fence. Additionally, doubting whether an architectural rendering will look like the finished building reads as civic skepticism/cynicism as much as `openness:down`.
- **`sports.citywide` (`scripts/downLinesEclPool.js:247-249`):** Uses `source:media` (matching live row `329`), so it bypasses the `GAME` ClockMode filter at `generateCitizensEvents.js:3545-3550` (`indexOf("source:sports") >= 0`).
- **Dials and directions on `PLACED`:** The remaining 8 lines match their `dial:` sign (`community.program` sociability down; `tribune.newsroom` sociability down, warmth down; `sports.citywide` sociability down; `faith.*` sociability/warmth down; `civic.stabilization-fund` warmth down, `wealth<=5` matching live row `210`).

---

## 2. The mass rule (`0.9 * Math.min(n, 8) / n`, `generateCitizensEvents.js:2025, 2149`)

Exact `DOMAIN_MOMENTS` (`baseDaily`) before vs. after draw weights per dial (verified by executing `DOMAIN_MOMENTS` from `8f4d6dd4d~` vs `8f4d6dd4d`):

| Dial | Before (up/down lines) | Before weight (up / down, % up) | After (up/down lines) | After weight (up / down, % up) | Weight delta (up / down) |
|---|---:|---|---:|---|---|
| `family` | `5 / 0` | `4.500 / 0.000` (`100.0%`) | `5 / 0` | `3.273 / 0.000` (`100.0%`) | `-1.227 / 0.000` (`-27.3%` up) |
| `integrity` | `2 / 0` | `1.800 / 0.000` (`100.0%`) | `2 / 0` | `1.600 / 0.000` (`100.0%`) | `-0.200 / 0.000` (`-11.1%` up) |
| `composure` | `9 / 10` | `8.100 / 9.000` (`47.4%`) | `9 / 10` | `6.800 / 6.968` (`49.4%`) | `-1.300 / -2.032` (`-16.0%` / `-22.6%`) |
| `drive` | `2 / 2` | `1.800 / 1.800` (`50.0%`) | `2 / 4` | `1.400 / 2.554` (`35.4%`) | `-0.400 / +0.754` (`-22.2%` / `+41.9%`) |
| `sociability` | `8 / 0` | `7.200 / 0.000` (`100.0%`) | `8 / 7` | `4.240 / 3.725` (`53.2%`) | `-2.960 / +3.725` |
| `warmth` | `10 / 0` | `9.000 / 0.000` (`100.0%`) | `10 / 10` | `5.939 / 5.939` (`50.0%`) | `-3.061 / +5.939` |
| `openness` | `13 / 0` | `11.700 / 0.000` (`100.0%`) | `13 / 11` | `6.748 / 5.714` (`54.1%`) | `-4.952 / +5.714` |

Source-level weights (`0.9 * min(n, 8) / n`): `familyLife` (`8 -> 11`): `0.9 -> 0.6545`; `homeLife` (`8 -> 12`): `0.9 -> 0.6000`; `reflection` (`8 -> 12`): `0.9 -> 0.6000`; `curiosity` (`8 -> 15`): `0.9 -> 0.4800`; `communityLife` (`8 -> 14`): `0.9 -> 0.5143`; `identity` (`8 -> 9`): `0.9 -> 0.8000`; `listening` (`8 -> 13`): `0.9 -> 0.5538`; `groove` (`5 -> 5`): `0.9 -> 0.9000`. Total `DOMAIN_MOMENTS` mass stays `54.900` (`7 * 7.2 + 4.5`).

**Does any dial that passed at the stage-54 bench leave 40–60 on this arithmetic?**
- **`family` (stage-54 bench `732 / 695`, `51.3%`, `xUp = 583` in `output/research-build/2026-11-18-e350-bench10-all.json:80-87`):** Scaling `source:familyLife`'s 5 `family:up` lines by `8/11` (`-27.3%`) cuts `family` coded ups by at most `~110–159` pushes over 10 Cycles (even if all `xUp = 583` were `source:familyLife`, `583 * 8/11 = 424`; in reality `Household`, `PostCareer`, `Retirement`, `Holiday` supply part of `xUp`, as shown in `bench-cross.json:221-232` where `Daily` is `123` of `221` coded ups in C117–C119). That moves stage-54 `family` from `51.3%` to **`~45%–47%`** — **stays inside 40–60**.
- **`integrity` (stage-54 bench `450 / 439`, `50.6%`, `xUp = 221` in `bench10-all.json:70-77`):** `source:identity` (`Personal`) drops by `1/9` (`-11.1%`). In `bench-cross.json:206-214`, `Personal` is `35` of `134` ups (`~26%`), so an `11.1%` cut removes ~`13` pushes out of `450` (at most `~25` if all `xUp`), moving `integrity` from `50.6%` to **`~49.2%–49.9%`** — **stays inside 40–60**.
- **`composure` (stage-54 bench `2,564 / 2,614`, `49.5%` in `bench10-all.json:60-61`):** In `DOMAIN_MOMENTS`, `composure` down drops more (`-2.032`, `-22.6%`) than `composure` up (`-1.300`, `-16.0%`), shifting `DOMAIN_MOMENTS` `composure` from `47.4%` to `49.4%` and nudging stage-54 `composure` slightly upward toward `~50%–50.5%` — **stays inside 40–60**.
- **Side effects elsewhere:** Inside `DOMAIN_MOMENTS` alone, `drive` falls to **`35.4%` up** (`1.400 / 2.554`), which helps overall `drive` (at `65%` on stage-54). In `firstFridayPool` (`generateCitizensEvents.js:2516`, mass held at `7.2`), moving 5 of 6 lines off `sociability:up` drops `FirstFriday` `sociability` from `100%` (`7.2`) to `66.7%` (`1.44 up / 0.72 down`), while shifting `5.04` mass onto `openness` (`2.16 up / 0.72 down`) and `outabout` (`1.44 up / 0.72 down`), both already above `60%` at stage-54 (`67%` and `62%`).

---

## 3. `QoL` graded-only (`generateCitizensEvents.js:1232`)

- **All `source:qol` pool paths carry a `dial:` tag and none is dropped:**
  - `qolPoolFor_` (`generateCitizensEvents.js:1602-1649`) assigns `"dial:" + (QOL_CAUSE_DIAL[keys[i]] || "composure") + ":" + dir` (`safety/health/housing/mood -> composure`, `work -> drive`, `street -> outabout`) to every entry at `:1640-1641`.
  - `patrolPoolFor_` (`generateCitizensEvents.js:1652-1662`) assigns `"dial:composure:down"` (`:1655-1656`) or `"dial:composure:up"` (`:1658-1659`) to every entry.
  - Live `Event_Content_Ledger` (read 2026-11-18) holds **0 `Kind=line` rows** with `source:qol` (only 2 `Kind=fragment` rows: row 291 inactive `$MOOD`, row 292 active `$VENUE`). No other coded generator emits `source:qol`. Every live `source:qol` draw produces `QoL-<Dial>-<Up|Down>-S` and none is dropped at `:3828-3838`.
- **Readers of bare `QoL` / `[QoL]`:**
  - **Trait profile (`utilities/compressLifeHistory.js:195, 1161`):** `TAG_TRAIT_MAP['QoL']` is part of `computeProfile_` (`:1107-1167`), which looks up `TAG_TRAIT_MAP[tag]` **without** `baseTag_` — so any graded `QoL-Composure-Down-S` would miss `TAG_TRAIT_MAP`. However, `computeProfile_` / `TAG_TRAIT_MAP` is documented dead code (`utilities/compressLifeHistory.js:20-22`); the live `TraitProfile` builder `formatDialFace_` (`:1939-1962`) only copies `entries[t].tag` into `TopTags` (`:1950-1956`), matching all other graded tags.
  - **Hood pulse (`utilities/neighborhoodPulseMap.js:22-69, 99`):** `PULSE_MAP` has no `'QoL'` key (nor `qol:` in `TAG_RULES`). Neither bare `QoL` nor `QoL-Composure-Down-S` pulses a neighborhood.
  - **Wake pins (`lib/wakePerception.js:1081-1088, 1222`):** `OWED_MILESTONES` and `CASINO_PIN` match only `Retirement`, `Question`, `Casino`, `Setback`, `Transgression-`, and exact chaos strings — no `QoL` pin exists.
  - **Lives slice (`scripts/buildLivesSlice.js:55, 71, 178-180`):** `LIFE_TAGS` (`:55`) matches `/^(...|QoL|Household)(?=$|-)/i`; the `(?=$|-)` lookahead matches `QoL-Composure-Down-S` at rank 2.
  - **Newsroom sourcing (`scripts/newsroomSourcing.js:14-16`):** `streetKind_` (`:14`) calls `gradedParts_(t)` -> `'QoL'`; `'QoL'` is not in `STREET_TAGS` (`:15-16`), unchanged from bare `QoL`.

---

## 4. `FirstFriday` readers and untouched siblings

- **Hood pulse (`utilities/neighborhoodPulseMap.js:61, 99, 147-149`) — contradiction:** `PULSE_MAP['FirstFriday']` (`:61`) is `{ attractiveness: 2, vitality: 1 }`. In `generateCitizensEvents.js:3955`, `recordPulse_` receives `pulseKindForLine_(lineKind, primaryTag)`. `pulseKindForLine_` (`utilities/neighborhoodPulseMap.js:147-149`) only flips `lineKind === 'Neighborhood'` (`Neighborhood-Down`); for `lineKind === 'FirstFriday'` it returns `'FirstFriday'` unchanged even when `primaryTag` is `FirstFriday-Sociability-Down-S`, `FirstFriday-Openness-Down-S`, or `FirstFriday-Outabout-Down-S`. Citizens shutting their window or leaving the art walk alone still push hood `EventAttractiveness +2, RetailVitality +1`.
- **Pool dial bias (`generateCitizensEvents.js:3597`):** As noted in §1b, `dwTag === 'source:firstFriday'` scales every entry in `firstFridayPool` (including the 3 down lines) by `dm.outabout`. Also `DIAL_BY_SOURCE['source:firstFriday']` (`generateCitizensEvents.js:1200`) still defaults to `'sociability'` if any future row carries `source:firstFriday` without a `dial:` tag.
- **Trait profile (`utilities/compressLifeHistory.js:190`):** `'FirstFriday'` in `TAG_TRAIT_MAP` is dead v1 code (same as `QoL`).
- **Sibling writers — contradiction left untouched:**
  - `phase05-citizens/runRelationshipEngine.js:235-241, 508` emits bare `Relationship-FirstFriday`, which `baseTag_` (`utilities/citizenDialMap.js:334, 377-379`) strips to `Relationship` (`sociability: +5, warmth: +2`, `utilities/citizenDialMap.js:80`). All 5 `firstFridayRels` lines are upward, and `"felt the creative community energy"` (`:239`) has no social interaction yet pushes `sociability +5, warmth +2` — five times the magnitude of `FirstFriday-Openness-Up-S` (`+1`).
  - `phase05-citizens/runNeighborhoodEngine.js:452-470, 622-624, 698, 714` still tags all 11 `firstFridayEvents` (`Uptown`, `KONO`, `Temescal`) with `'dial:sociability:up'` (`FirstFriday-Sociability-Up-S`), even gallery/sidewalk-observation lines like `"noticed gallery openings along the corridor"` (`:461`).
  - `phase05-citizens/runHouseholdEngine.js:278-282, 575` emits bare `Household-FirstFriday` -> `Household` (`family: +5`, all 3 lines up).
  - `phase05-citizens/runAsUniversePipeline.js:389-394, 535` emits bare `PostCareer-FirstFriday` -> `PostCareer` (`family: +4, openness: +2`, all 4 lines up).

---

## 5. The placed rows and the share claim (`scripts/downLinesEclPool.js:228-265`)

The claim in `scripts/downLinesEclPool.js:228-234` and the brief ("a row placed in a one-signed-row pool takes half that pool's written lines") fails against the code and live `Event_Content_Ledger` in five ways:

1. **Five of the seven target `PoolKey`s are NOT one-signed-row pools on live `Event_Content_Ledger`:**
   - `tribune.newsroom`: already holds **3 unconditional signed rows** (`273`: `sociability:up`, `274`: `composure:down`, `275`: `warmth:up`) plus row `276` (`Conditions: fame>=25`, `source:fame` -> `Reputation`, `integrity +3 / sociability +2`). Adding `PLACED[1]` and `PLACED[2]` yields **5 rows** (or **6** when `fame>=25`), so each `PLACED` row takes **1/5** (or **1/6**) of `tribune.newsroom`, not 1/2.
   - `sports.citywide`: already holds **5 active signed rows** (`244, 284, 323, 324` `source:sports, dial:fandom:up` + `329` `source:media, dial:sociability:up`). `PLACED[3]` takes **1/6** of `sports.citywide` (1-to-1 only against row `329` on `source:media`).
   - `faith.attending`: already holds **4 active signed rows** (`166, 238, 239, 242`). `PLACED[4]` takes **1/5** of `faith.attending`.
   - `faith.volunteering`: already holds **4 active signed rows** (`195, 240, 241, 243`). `PLACED[5]` and `PLACED[6]` each take **1/6** of `faith.volunteering`.
   - `civic.stabilization-fund`: already holds **2 active signed rows** (`165`: `wealth<=3; band!=child`, `dial:composure:down`; `210`: `wealth<=5`, `dial:warmth:up`). For `wealth<=3` citizens outside West Oakland, `PLACED[7]` takes **1/3** of written lines (1/2 only for `wealth=4..5`).
2. **Unsigned rows in the same `PoolKey` DO eat draw share AND emit slots (`generateCitizensEvents.js:3680-3838`):**
   - `community.program` has active unsigned row `875` (`hood=Fruitvale`, `source:communityLife`) and `985` (`hood=East Oakland`, `source:communityLife`); `civic.health-center` has active unsigned row `987` (`hood=Temescal`, `source:civicNews`); `civic.stabilization-fund` has active unsigned row `988` (`hood=West Oakland`, `source:civicNews`).
   - In those four neighborhoods, the unsigned row enters `usePool` (`:3444-3457`), receives an equal share of its `PoolKey`'s `bucketMass` in `balanceContentLedgerPoolWeights_` (`:77-84`), increments `eclTelemetry.draws` at `:3757` if picked, and is then dropped without refunding the citizen's emit slot (`continue` at `:3837` after `gradedTagFor_` returns `''`). So in Fruitvale and East Oakland, unsigned rows eat **1/3** of `community.program`'s draws (written share stays 50/50 between the two signed rows, at 2/3 total volume); in Temescal, **1/3** of `civic.health-center`; in West Oakland, **1/4** (for `wealth<=3`) or **1/3** (for `wealth=4..5`) of `civic.stabilization-fund`.
3. **40-draw per-row cap doubles a 1-row pool's cap, rather than halving 40:**
   - `generateCitizensEvents.js:3439` caps each **row** (`eclRowKey_(clk, clEntry.text)`) at 40 draws. A 1-row pool stops entering pools once that 1 row reaches 40 draws (`<= 40` total). With a second row (`PLACED`), after one row hits 40 draws, the other row continues entering pools until it also reaches 40 (`<= 80` total if demand saturates).
4. **`row.Weight` DOES shift mass across the whole tab vs. hardcoded pools, and raises `bucketMass` (`generateCitizensEvents.js:72-84`):**
   - `balanceContentLedgerPoolWeights_` sets `ledgerTotal` to the sum of all eligible ECL row weights (`:72`) and `bucketMass = ledgerTotal / keys.length` (`:77`). Within any single `PoolKey`, `bucketMass * (rowWeight / group.total)` cancels `group.total` against other `PoolKey`s' shares; however, higher row `Weight`s on `PLACED` rows (`1` vs `down.*`'s `0.5`) increase `ledgerTotal`, lifting every `PoolKey`'s `bucketMass` equally against hardcoded pools (`baseDaily` etc.). Also note `balanceContentLedgerPoolWeights_` mutates `row.weight` in place on entries shared with `pool` (`:3660, 3680`), so when a citizen rolls `eventCount > 1` (`:3646`), `ev = 1` re-balances already-mutated weights.
5. **`eclExclusivePools` on `tribune.newsroom` and `source:media` graded-only:**
   - Live `World_Config` currently has `eclExclusivePools` blank (`[ 'eclExclusivePools' ]`, `eclExclusiveMinLines = 3`), so exclusivity is currently **OFF**. Even if turned on for `tribune.newsroom`, live rows `273–275` already give `3` unconditional eligible rows (`>= 3`), though adding `PLACED[1..2]` keeps `eclEligibleByPool['tribune.newsroom'] >= 3` after individual rows hit the 40-draw cap (dropping `famePool[0]` at `:3110, 3478-3485` for `fame>=25` / `usageCount>=8` citizens).
   - Because `Media` is in `GRADED_ONLY_KIND_` (`generateCitizensEvents.js:1232`), all `source:media` rows must carry a `dial:` tag or be dropped at `:3837`; live rows `273–275, 329` and `PLACED[1..3]` all carry `dial:` tags.
6. **Loader check (`phase02-world-state/loadEventContentLedger.js`):** All 9 `PLACED` rows have valid `Kind='line'`, non-empty `PoolKey`, non-empty `Text` with no `$SLOT`, `Weight='1'`, valid `Conditions` (`''`, `'band!=child'`, `'wealth<=5'`), and whitelisted first tags (`source:civicNews`, `source:media`, `source:familyLife`, `:46,52,61`). `loadEventContentLedger_` loads all 9 (`skipped: 0`).

---

## 6. Row 357 off (`Event_Content_Ledger` `culture.citywide`)

- **Other readers:** A repo-wide grep across `phase*`, `utilities/`, `lib/`, and `scripts/` shows **nothing else reads Row 357 or `culture.citywide`**.
- **Remaining active rows in `culture.citywide` on live `Event_Content_Ledger`:** Rows `249` and `342` are already `Active=no`. Setting Row `357` to `Active=no` leaves **only Row `290`**:
  - `Conditions: "hood=Lake Merritt"`, `Tags: "source:communityLife,auth:auto,dial:sociability:up"`, `Text: "the festival of lights at Lake Merritt draws families bundled in coats, their breath visible in the cold air"`.
- **Effect of a hood-gated-only `PoolKey` (`generateCitizensEvents.js:3444, 57-87`):**
  - For citizens in the **21 other neighborhoods**, `culture.citywide` has 0 eligible rows and disappears from `keys` (`bucketMass` redistributes slightly to the remaining `~157` PoolKeys).
  - For citizens in **Lake Merritt** (`1/22` of the city), `culture.citywide` remains in `keys` and takes a **full equal PoolKey share (`bucketMass = ledgerTotal / keys.length`)**, funneling 100% of that share onto Row `290` (`dial:sociability:up`, with no `season` condition — citizens draw `"bundled in coats, their breath visible in the cold air"` in Summer too) until Row `290` hits its 40-draw cap.

---

## 7. The measure (`LifeHistory_Log` vs. `Simulation_Ledger` cells, and `citizenMemory.js`)

### 7a. `LifeHistory_Log` vs. `Simulation_Ledger` cells (live C115–C116 read, 2026-11-18)
On live C115–C116 (`4,997` `LifeHistory_Log` rows vs. `4,918` stamped `Y3C11`/`Y3C12` lines in `Simulation_Ledger.LifeHistory`):

- **Kinds on `LifeHistory_Log` that never (or rarely) reach `Simulation_Ledger` cells:**
  - `Advancement` (`190` log / `0` cell — `"Intake at Tier ..."` word-matches `CONTENT_RULES` `"tier 2/3/4/5/advanced/elevated"` -> `drive +6`, inflating log `drive` up count), `Business-Gain` (`10` log / `0` cell), `Business-Owner` (`2` log / `0` cell), `Promotion` (`15` log / `1` cell — `"Emerged into Tier-4..."`), `Graduation` (`8` log / `3` cell), `Media` (`209` log / `205` cell), `Retirement` (`3` log / `1` cell), `Civic Perception` (`740`/`739`), `Personal` (`466`/`465`).
- **Kinds on `Simulation_Ledger` cells that never appear on `LifeHistory_Log`:**
  - `Bond` (`0` log / `35` cell, `warmth +1`), `Money` (`0` log / `31` cell, moves `composure`/`drive`/`family`), `ConnectionWithdrawn` (`0` log / `21` cell, `sociability -1`), `Home` (`0` log / `14` cell), `ConnectionMaintained` (`0` log / `12` cell, `sociability +1`), `Casino` (`0` log / `12` cell, moves `composure`/`drive`), `LifeEvent-Home-*` (`0` log / `9` cell), `TrustGuarded` (`0` log / `8` cell, `warmth -1`), `Business` (`0` log / `4` cell, `drive +6, openness +3`), `Fame` (`0` log / `3` cell), `Faith` (`11` log / `12` cell).
- **Per-dial distance on live C115–C116 (pushes up / down, `% up`):**

| Dial | `LifeHistory_Log` | `Simulation_Ledger` cell | Diff (`log - cell`) |
|---|---|---|---|
| `drive` | `499 / 43` (`92.1%`) | `326 / 41` (`88.8%`) | **`+173 / +2`** (`+53%` inflated up) |
| `sociability` | `750 / 2` (`99.7%`) | `751 / 23` (`97.0%`) | **`-1 / -21`** (log misses `91%` of downs) |
| `warmth` | `354 / 0` (`100.0%`) | `390 / 8` (`98.0%`) | **`-36 / -8`** (log misses `100%` of downs) |
| `openness` | `559 / 139` (`80.1%`) | `527 / 139` (`79.1%`) | `+32 / 0` |
| `composure` | `674 / 577` (`53.9%`) | `669 / 589` (`53.2%`) | `+5 / -12` (log misses Casino/Money downs) |
| `integrity` | `113 / 1` (`99.1%`) | `113 / 1` (`99.1%`) | `0 / 0` |
| `family` | `194 / 77` (`71.6%`) | `198 / 79` (`71.5%`) | `-4 / -2` |
| `outabout` | `637 / 160` (`79.9%`) | `637 / 160` (`79.9%`) | `0 / 0` |

### 7b. Permanent movement vs. push share (`utilities/citizenMemory.js:120-165, 217-233`)
- **Why permanent downs collapse faster than push share:**
  1. `applyEvent_` (`:138`) requires `HARDEN_STREAK = 3` (`:41`) consecutive same-direction active Cycles while mood has not decayed below the settle floor (`0.5 * room`, `:230`), scaling baseline ratio roughly by $(p_{\text{up}} / p_{\text{down}})^3$.
  2. When a streak hardens, `applyEvent_` (`:143`) leaves `1 - hardenShare = 60%` of `c.mood[d]` intact (`c.mood[d] *= 0.6`). A single subsequent opposite-direction `-1` push only shrinks or barely cancels that residual `+mood`, which `settleCycle_` (`:230`) then zeroes, causing `applyCycleEffects_` (`:162`, `c.mood[d] === 0`) to reset `streak` to `0` on the next Cycle — swallowing the first down step so the minority direction needs **4** consecutive Cycles after an up-hardening.
- **Simulated steady-state permanent move ratio in `utilities/citizenMemory.js` (`applyCycleEffects_` + `settleCycle_`, `pActive = 0.5`, `±1` per active Cycle, `200,000` Cycles at `base = 50`):**
  - At `85%` up (stage-54 `sociability`): **`445 : 1`** up-to-down (`0.2%` down) — matches stage-54 `Dial_Pulse` (`40–98 up / 0–1 down` per Cycle).
  - At `67%` up (stage-54 `openness`): **`11.3 : 1`** up-to-down (`8.1%` down) — matches stage-54 `Dial_Pulse` (`14–50 up / 0–4 down` in C118–C126).
  - At `60%` up (Acceptance 5 boundary): **`4.02 : 1`** up-to-down (`19.9%` permanent moves down, `80.1%` up).
  - At `55%` up: **`1.99 : 1`** (`33.5%` down).
  - At `53%` up: **`1.52 : 1`** (`39.7%` down, i.e., within `60/40` on permanent moves).
  - At `50%` up: **`1.01 : 1`** (`49.6%` down) — matches stage-54 `Dial_Pulse` for `composure` (`50%` pushes -> `~21.7 up / 20.7 down` mean per Cycle in C118–C126) and `family` (`51%` pushes -> `6.4 / 6.4` per Cycle).
- **Conclusion:** With `dialDirectShare = 0`, **Acceptance 5 (`60 / 40` by pushes) is not enough to make citizens move down for good at anywhere near the rate they move up** — `60 / 40` by pushes still produces roughly **4 permanent upward shifts for every 1 permanent downward shift** (and reflections add straight to `base`, further tilting upward on fixed-positive tags). Permanent down moves only approach permanent up moves when pushes sit around **`47%–53%` up**.

---

## 8. Trick code and test blind spots

1. **`scripts/codedPoolDownSide.test.js`:**
   - **Stubbed `dialBands` (`:26`, `global.getCitizenDialBands_ = () => null`):** Bypasses `generateCitizensEvents.js:3583-3605` (hiding the bug that `dwTag === 'source:firstFriday'` multiplies `FirstFriday` down lines by `dm.outabout` at `:3597`), skips participation scaling (`:2854-2858`), and leaves `condScopes` `warmth/drive/fandom` null (`:3418-3422`).
   - **Stubbed `hoodTexturePool_` (`:27`, `global.hoodTexturePool_ = () => []`):** Because `templatePool` only runs inside `if (nTexts.length)` (`generateCitizensEvents.js:3009-3017`), returning `[]` removes all `source:neighborhood` and `buildTemplateEvent_` entries from `pool`, inflating `baseDaily` and `firstFridayPool` draw rates and leaving neighborhood competition untested.
   - **Missing `qolParts`, `patrolStrategy`, and `Event_Content_Ledger` (`:115-117, 170-178`):** `summary.crimeMetrics` sets only `qualityOfLifeIndex` with no `qolParts` and no `patrolStrategy`, so `qolPoolFor_` (`generateCitizensEvents.js:1626-1631`) always falls back to `['mood']` (`composure`). Neither `work` (`"heard another neighbor was between jobs"`, cited at `:1229`), `street`, `safety`, `health`, `housing`, nor `patrolPoolFor_` (`:1652`) is ever executed. `ss: { getSheetByName: () => null }` also ensures `balanceContentLedgerPoolWeights_` never runs.
   - **Writer assertion stronger than check (`:138-147`):** The label claims `"domain-moment lines are written under their own dial and direction, one step"`, but the loop checks `l.tag !== want` without calling `M.nudgesForEvent_(l.tag, 1, l.text)` on the written output (relying on section 1 `:96`).
   - **Partial `FirstFriday` verification (`:160-164`):** Only 4 of the 10 `firstFridayLines` are individually checked (`findLine` for galleries, local artists, art walk alone, three blocks off); the other 6 lines are never individually verified as drawn with their expected tags.
   - **Asymmetric `loaded` content check (`:91`):** Filters `/:down$/`, skipping all `up` lines, and only runs against `Untagged` while ignoring `{ sociability: 3, warmth: 2 }` (`NEIGHBORLY`).
   - **Narrow `FAMILY` regex (`:84`):** `/\b(their|his|her|my)\s+(late\s+)?(spouse|...)/i` misses articles (`"a wife"`, `"the kids"`).
   - **Source-text routing check (`:101`):** `genFile.indexOf(...)` is a source-string check rather than executing `primaryFromTags`, and skips `source:familyLife`.
2. **`scripts/downLinesEclPool.test.js`:**
   - **Metadata-driven grading test (`:51-58`):** Reads `r.dial` and `{ kind: r.kind, source: r.source }` from the JS helper object instead of deriving them from `r.Tags` / `primaryFromTags`, and section 4 (`:61-65`) loops only `Object.keys(P.ROUTE)` — so neither `'source:civicNews' -> 'Civic Perception'` nor `'source:media' -> 'Media'` for the `PLACED` rows is verified against `generateCitizensEvents.js`, and `generateCitizensEvents_` is never invoked on `P.ROWS`.
   - **Sentinel-dependent validation (`scripts/downLinesEclPool.js:285, 289`):** `validateRows` identifies a `PLACED` row solely via `r.answers != null` (a property stripped by `toSheetValues` at `:308-310`), and its `PLACED.some(...)` check omits `p[1]` (`dial`) and `r.Weight`.
3. **`scripts/occupationDialTags.test.js`:**
   - **Stale console count (`:164`):** Hardcodes `'paper-reader rows 4'` instead of `P.MEDIA_SIGNS.length` (`7`).
   - **Unrealistic synthetic `mediaTab` (`:40, 50-51`):** Constructs all 7 `MEDIA_SIGNS` rows without `dial:` tags to assert `mpl.todo.length === 7`; once `PLACED` rows (which already carry `dial:<dial>:down`) are on the tab, `plan()` sees `todo: 0` for them, and the test never cross-checks `MEDIA_SIGNS` against `downLinesEclPool.js`'s `PLACED` signs.
   - **Silent-empty regex fallback (`:89`):** `.match(/tag: '([^']+)'/g) || []` silently passes with 0 assertions if the slice or regex stops matching.
