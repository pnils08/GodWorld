# Adversarial Review — Lives Slice Wide Intake (`167fcc32`)

**Reviewer:** Antigravity (`agy`)  
**Date:** 2026-10-25  
**Task:** `docs/for-claude-review/2026-10-25-lives-wide-intake-review-TASK.md`  
**Candidate:** `167fcc32` (`scripts/buildLivesSlice.js`, `scripts/buildLivesSlice.test.js`, `scripts/beatSliceKit.js`, `scripts/newsroom-wake-packages.json`)  
**Verification:** `node scripts/buildLivesSlice.test.js` (PASS), `node scripts/beatSlices.test.js` (PASS), `node scripts/buildEconomicSlice.test.js` (PASS); 5-day dry simulation against live C112 `output/beats/` (Day 1 = 16 people / 92 facts; Days 2–5 = 12, 11, 11, 9 people).

---

## Summary Table

| Hunt | Verdict | Primary `file:line` | Core Finding |
|---|---|---|---|
| **1. Casino as a life event** | **FALSE-POSITIVE** (status/POPID/`seenPop` guards) · **REAL** (negative/zero swing & package blocker) | `scripts/buildLivesSlice.js:236-246, 339-343` · `scripts/newsroom-wake-packages.json:1544, 1568` | `void-gate`, `open`, blank-`POPID`, `HOUSE`, and same-citizen multi-settlements are properly filtered. **REAL:** (1a) no `stake > 0` or `won ? payout > stake : true` guard; (1b) `tamsin-pruitt.reviewProfile` (`purpose` and `canonBlockers`) in `newsroom-wake-packages.json:1544, 1568` still restricts her page to the 5 `Lived_Events` kinds and blocks numbers. |
| **2. Households** | **REAL** (4 findings) | `scripts/buildLivesSlice.js:33, 214, 219-232, 331-338, 371` | **(2a)** `HeadOfHousehold` is ignored; an unprofiled head in `["POP-UNPROFILED","POP-00015"]` makes `h.pop` the second member and prints `"DeShawn Hartley and 1 other not on the ledger snapshot set up a household together"` (leaking `"ledger snapshot"` into `anchorFacts`). **(2b)** A couple skipped on Day 1 because one member is in `todays` is **permanently lost for the entire Cycle** (`:214` reloads all Cycle `covered` POPIDs into `seenPop` on Days 2–5). **(2c)** When a couple *is* selected on Day 1, `:336` & `:371` only record `popid: h.pop` (Member 1) in `covered` and only build `threadFor(h.pop)` — Member 2 gets **zero thread lines** on Day 1 and is **not** in `seenPop` on Day 2 (can get a second passage in the same Cycle). **(2d)** `SEAT.popid` is `null` (`:33`) and media staff are unfiltered: in live C112, `HH-0112-F001` (`POP-00015` DeShawn Hartley) rides Day 1, and `HH-0112-F017` (`POP-01210` **Tamsin Pruitt herself**) and `HH-0112-F018` (`POP-01211` Ines Sorensen) are in the C112 pool. |
| **3. Seeds** | **REAL** (4 findings) · **FALSE-POSITIVE** (same citizen across days) | `scripts/buildLivesSlice.js:251-264, 344-348` · `scripts/beatSliceKit.js:145-156` | Same citizen cannot repeat across days (`FALSE-POSITIVE`). **REAL:** **(3a)** `covered` keys `'seed:' + sd.seedId + ':' + pop` per-citizen instead of per-seed, so the outer loop re-runs the **same top 3 seeds across Mon–Fri** (in C112, `d5f2d0f8` runs all 5 days, cycling through its 6 citizens). **(3b)** `own` (`:257`) is never checked against `BOOKKEEPING` (`:55`): in live C112, 4 seeds (`2705661d`, `3b9dbdf3`, `6db06e5d`, `33c01c91`) carry `Emerged into Tier-4` / `Added to Simulation_Ledger` in `CitizenEvents` and emit canon-blocker lines. **(3c)** `why` (`:261`) unconditionally takes `.split('|')[0]`, emitting raw engine strings (`carryover: cycle 2 of 3` on `0dd6f4eb`, `3b54d421`, `1704509d`, `49320d32`; `A's W3 [hot-streak]; Oaks W1 [player-energy]` on `d5f2d0f8`; mid-word sheet truncations `...Fruitvale Transit Hub Phas` on `92c68daa`) and misattributing Citizen 1's personal relocation `Why` (`Mart Johns moved from Adams Point to KONO...` on `2c2f341f`) to neighborhood fill citizens (`Noor Ng`). **(3d)** Name match (`:257-258`) fails when a citizen's name contains ` — ` or when two citizens on a seed share a name. |
| **4. `LIFE_TAGS`** | **REAL** (3 findings) | `scripts/buildLivesSlice.js:48-55, 124, 267-284` | **(4a)** Structural/ambient tags ranked as life events: `CareerState` (`:52`) is an engine state marker (`utilities/citizenDialMap.js:254`) whose `EventText` in C112 is `"industry=service|employer=small|level=1|careerMod=0.92"` (2 rows in C112, also promoted by `SIGNAL_TAG` `:124`); `Household` at Rank 0 (`:49`) outranks all 81 `Strain`/`Friction` rows on C112 Days 3–4 with `"handled routine household matters"` / `"felt positive atmosphere inside the home"`; `Career` (9) and `Education` (23) are 100% ambient filler in C112; `Faith` has subjectless scene text (`"the scent of incense drifts..."`). **(4b)** Real life-event tags missing from `LIFE_TAGS`: `Relocation-*` (17 rows in C112), `LifeEvent-Promotion-*` (20 rows in C112, 44 in dump — listed in `SIGNAL_TAG` `:124` but omitted from `LIFE_TAGS`), `Career-Hired` (2 in dump), `Stumble` (`PRESSURE_FIRST.unemployed` in `citizenDialMap.js:438`), `CivicRole-*` (11 in C112, 30 in dump), `Civic` (4), `BoundaryCompromised` (2), `Alliance` (3). **(4c)** All 4 regexes in `LIFE_TAGS` (`:49-52`) are `$`-anchored while `cleanTag` (`:126`) only strips `|...`, dropping dial-suffixed rows (`QoL-Composure-Down-S`, `QoL-Outabout-Up-S`, and any graded `Strain-*` / `Relocation-*`). |
| **5. Prompt load** | **REAL** (3 findings) | `scripts/livedExperiencePacket.js:210, 386, 415, 787-791` · `scripts/cron-desk-run.js:431-436, 888, 891, 2251` | **(5a)** On C112 Day 1 (16 people, 92 facts), `factCap: 90` truncates `fact[90..91]` (the bottom two thread lines of Person #16 `POP-00661 Bianca Crook`) in `creativeBrief.facts` (`livedExperiencePacket.js:210`) and the W3 writer brief (`cron-desk-run.js:888`), while `w1.known` / `w3.known` (`livedExperiencePacket.js:386, 885`) remain uncapped at 95 `FACT` claims. **(5b)** `livedExperiencePacket.js:415` caps `w1.exposure.candidates` at `.slice(0, 12)` (and `cron-desk-run.js:2251` caps `beatSlice.citizens` at 12), so **People #13–#16 on Day 1 (`Ace Hill`, `Robert Corliss`, `Dillon Trevor`, `Bianca Crook` — all 4 `moments` citizens) are excluded from W1/W2 candidate pools**. **(5c)** `cron-desk-run.js:891` caps `PEOPLE ON THE RECORD (your sources — never invent another)` at `bs.citizens.slice(0, 10)`, omitting **People #11–#16** (and their `RoleType` profiles, which passages after `todays` never print). In W2 (`buildReportPacket`, `:787-790`), any interviewee from #1–#12 gets their own lines first (`mine`), padded up to 8 with Person #1's hospital stay facts. |
| **6. Cache & covered list** | **REAL** (2 findings) · **FALSE-POSITIVE** (`LIVES-SLICE-2` cache invalidation & v4 `SeedID` cycle hash) | `scripts/buildLivesSlice.js:58-66, 184-185, 256, 346, 371` · `scripts/buildVoicesSlice.js:106-109` | `LIVES-SLICE-2` invalidates old cached JSON (`FALSE-POSITIVE`), and v4 `SeedID` hashes include `cycle + '|'` (`buildContractSeeds.js:558`). **REAL:** **(6a)** If `sd.seedId` is null/empty (`'seed::POP-X'`), or if a legacy/fixture `SeedID` lacks cycle, `seed:<SeedID>:<POP>` has no `:cycle` suffix and collides across the 3-cycle retention window (`Number(v.cycle) >= Number(cycle) - 2`). **(6b)** `buildVoicesSlice.js:106-109` and `buildLivesSlice.js:185, 346` interpolate `covered[*].kind` raw, producing `"Lives carried their seed this Cycle"`, `"Lives carried their casino this Cycle"`, `"Lives already wrote this person: seed (C112)"`, and `(C112, seed)` in packet claims. |
| **7. Tests** | **REAL** | `scripts/buildLivesSlice.test.js:50-63, 103-112, 144-147` | Fixture rows in `Household_Ledger`, `Casino_Ledger`, and `Story_Seed_Deck` are pre-sorted in expected output order and have counts $\le$ `PER_DAY` caps (`2, 2, 1, 1, 1`). Deleting the household couple-first sort (`:220`), the casino swing sort (`:239`), the seed `major`-first sort (`:251`), the `LIFE_TAGS` rank sort (`:276`), or the `PER_DAY` caps still passes `buildLivesSlice.test.js` 100%. The seed regex test (`:111`) only tests `Neighborhood: 'Citywide'` and `Desk === Domain === 'sports'`. |

---

## Detailed Findings by Hunt

### Hunt 1 — Casino as a life event

* **Verdict (`void-gate`, `open`, blank `POPID`, `HouseholdId`-only, multi-settlement per citizen):** **FALSE-POSITIVE** — `scripts/buildLivesSlice.js:214-215, 236-243`.
  * `:236` filters `Number(w.CycleSettled) === Number(cycle) && /^settled-(win|loss)$/i.test(String(w.Status || '').trim())`, excluding all 46 `open` rows, 4 `void-gate` rows, and the `HOUSE` row (`Status: ""`) in live C112 `Casino_Ledger.jsonl`.
  * `:241-243`: `const pop = String(w.POPID || '').toUpperCase(); ... if (!nameOf(pop) || !take(pop, id)) continue;` — blank `POPID` or `HouseholdId`-only rows resolve `nameOf('') === ''` and are skipped.
  * Same-citizen two settlements in one Cycle: the first settlement calls `take(pop, id)` (`:215`), adding `pop` to `seenPop` (blocking a second settlement on the same day) and writing `covered[id] = { popid: pop, cycle: Number(cycle), ... }` (`:371`), which `:214` reloads into `seenPop` on every later day of the same Cycle.

* **Verdict (1a — Zero/negative `stake` or `settled-win` with `payout <= stake`):** **REAL** — `scripts/buildLivesSlice.js:237-238, 341`.
  * `const stake = K.num(w.Stake) || 0, payout = K.num(w.Payout) || 0; return { w, won, stake, payout, swing: won ? payout - stake : stake };` has no `stake > 0` or `won ? payout > stake : true` guard.
  * **Concrete breaking input:**
    ```json
    {"WagerId":"w-push","CycleSettled":"112","POPID":"POP-00646","MarketFamily":"undocked","Stake":"200","Payout":"150","Status":"settled-win"}
    ```
    Produces `swing = -50` and prints: `"Tiro Worso won on the UNDOCKED book — staked 200, paid 150, Piedmont Ave (C112)"` (or for `Stake: "0", Status: "settled-loss"`, `"staked 0, the book kept it"`).

* **Verdict (1b — Package `reviewProfile` contract drift on Tamsin's seat):** **REAL** — `scripts/newsroom-wake-packages.json:1544, 1568`.
  * Only `targetWords` (`"450-1200"`) was updated in `scripts/newsroom-wake-packages.json:1548`.
  * `reviewProfile.purpose` (`:1544`) still tells the V2 claim manifest and Rhea gate that Tamsin's page is exclusively `"a birth, a death, a hospital stay, a retirement, a promotion"`, and `canonBlockers` (`:1568`) still blocks `"a statistic, rate or trend claim — the page is people, not numbers"` while casino passages (`staked 419, paid 1152`) and `Business-Gain` moments (`returned $487187 to the line this week`) require printing ledger numbers.

---

### Hunt 2 — Households

* **Verdict (2a — `HeadOfHousehold` ignored; unprofiled member leaks `"not on the ledger snapshot"` into `anchorFacts`):** **REAL** — `scripts/buildLivesSlice.js:221-230, 331-337`.
  * `h.HeadOfHousehold` is never read. `h.pop` is `members.find(m => nameOf(m)) || members[0]` (`:229`).
  * When `Members` is `["POP-99999", "POP-00015"]` where `POP-99999` is `HeadOfHousehold` (missing from `simulation_ledger_snapshot.jsonl`) and `POP-00015` (`DeShawn Hartley`) is on the snapshot:
    1. `h.pop` silently shifts from the head (`POP-99999`) to `POP-00015`.
    2. `h.named` has 1 name (`["DeShawn Hartley"]`), `h.unnamed` is `1`, and `:332-336` emits into `anchorFacts` / `packet.known`:
       `"DeShawn Hartley and 1 other not on the ledger snapshot set up a household together in Jack London, renting (C112)"`.
    3. Supplying `"not on the ledger snapshot"` inside an approved `FACT` claim invites the W3 writer to print `"ledger snapshot"` in article prose, violating the fourth wall and `newsroom-wake-packages.json:1570` (`"raw engine labels or decimals printed as public-facing evidence"`).

* **Verdict (2b — Couple skipped on Day 1 is permanently lost for the entire Cycle, never re-offered on Days 2–5):** **REAL** — `scripts/buildLivesSlice.js:214, 225`.
  * `:225`: `if (!members.length || covered[id] || members.some(m => seenPop.has(m))) continue;`
  * **Concrete breaking input:** A household `{ HouseholdId: 'HH-0112-COUPLE', FormedCycle: '112', Members: '["POP-00801","POP-00802"]', HouseholdType: 'couple', Neighborhood: 'Rockridge', HousingType: 'rented' }` where `POP-00801` (`Maurice Franklin`) has a `Lived_Events` hospital discharge on Day 1.
  * On Day 1, `POP-00801` is in `seenPop`, so `HH-0112-COUPLE` is skipped. At the end of Day 1 (`:371`), `covered['hospital:H-C106-POP-00801:111:out'] = { popid: 'POP-00801', cycle: 112, ... }` is saved to `lives_covered.json`.
  * On Days 2, 3, 4, and 5 of C112, `:214` reloads **every** `v.popid` with `Number(v.cycle) === 112` from `covered` into `seenPop`. Because `POP-00801` stays in `seenPop` for all of C112, `members.some(m => seenPop.has(m))` is `true` on every day of the week — **the couple's household is never re-offered on Days 2–5, and `POP-00802` is locked out of the household passage for the entire Cycle.**

* **Verdict (2c — Couple selected on Day 1 only records `h.pop` in `covered` and only builds `threadFor(h.pop)`):** **REAL** — `scripts/buildLivesSlice.js:317, 336-337, 371`.
  * When couple `["POP-90010", "POP-90011"]` (`Test PairA` and `Test PairB`) is selected on Day 1:
    1. `:228` adds both `POP-90010` and `POP-90011` to `seenPop` **in memory for Day 1 only**.
    2. `:336` creates the passage fact with `popid: h.pop` (`"POP-90010"` only).
    3. `:317` calls `threadFor(fact.popid, ...)` only for `"POP-90010"` — **`POP-90011` (`Test PairB`) receives zero thread lines** under the couple's passage (`Hospital_Ledger`, `LifeHistory_Log`, `ARTICLE_INDEX.jsonl` for `POP-90011` are completely omitted).
    4. `:371` persists `covered['household:HH-0111-F001:111'] = { popid: 'POP-90010', kind: 'household', cycle: 111, day }` — **`POP-90011` is never written to `covered`**.
  * **Concrete breaking input:** Add `{ Timestamp: 't', POPID: 'POP-90011', EventTag: 'Strain', EventText: 'the third late night this week', Neighborhood: 'Temescal', Cycle: '111' }` to `beats.LifeHistory_Log` in `scripts/buildLivesSlice.test.js`. On Day 2 (`L.buildLivesSlice(cycle, { root, beats, profiles })`), `POP-90011` is **not** in `seenPop` (`:214`), so `POP-90011` gets a **second passage in the same Cycle** (`moment:POP-90011:111:Strain`), breaking `assert.equal(day2.empty, true)` at `buildLivesSlice.test.js:145`!

* **Verdict (2d — `SEAT.popid` is `null` and Tribune/MEDIA citizens are not excluded):** **REAL** — `scripts/buildLivesSlice.js:33, 219-232`.
  * Unlike `scripts/buildVoicesSlice.js:81` (`!isMedia(p)`), `buildLivesSlice.js` leaves `SEAT.popid: null` (`:33`, whereas `newsroom-wake-packages.json:1523` has `"popid": "POP-01210"`) and never filters out `POP-01210` or `ClockMode === 'MEDIA'`.
  * **Concrete breaking input (live C112 `output/beats/Household_Ledger.jsonl`):**
    * `HH-0112-F001` (`FormedCycle: 112`, `POP-00015` DeShawn Hartley, Tribune senior photographer) is selected as **P6 on C112 Day 1**.
    * `HH-0112-F017` (`FormedCycle: 112`, `POP-01210` **Tamsin Pruitt herself**) and `HH-0112-F018` (`POP-01211` Ines Sorensen) sit in the C112 `Household_Ledger` queue (`HouseholdType: "couple"`, `Members: "[\"POP-01210\"]"`).

---

### Hunt 3 — Seeds

* **Verdict (Same citizen picked across days):** **FALSE-POSITIVE** — `scripts/buildLivesSlice.js:214-215, 259, 371`.
  * Once a citizen is picked from a seed on Day 1, `covered['seed:<SeedID>:<POP>']` stores `popid: pop, cycle: Number(cycle)`. On Days 2–5, `:214` loads `pop` into `seenPop`, preventing the same citizen from being picked on another seed later in the Cycle.

* **Verdict (3a — Same `SeedID` repeats across all 5 days of the week):** **REAL** — `scripts/buildLivesSlice.js:252-264`.
  * Because `id` is `'seed:' + String(sd.seedId || '') + ':' + pop` (`:256`) and the outer loop (`for (const sd of seeds)`) does not skip seeds already used this Cycle, each day re-enters the **exact same top 3 `major` seeds** and simply advances to the next citizen in `sd.citizens`.
  * **Concrete live C112 trace:** Across Days 1–5 on live C112 `Story_Seed_Deck.jsonl` (19 major seeds available):
    * Day 1 picks `seed:d5f2d0f8:POP-00597`, `seed:2fc87871:POP-00536`, `seed:e608d52a:POP-01073`.
    * Day 2 picks `seed:d5f2d0f8:POP-00031`, `seed:2fc87871:POP-00509`, `seed:e608d52a:POP-00459`.
    * Day 3 picks `seed:d5f2d0f8:POP-00003`, `seed:2fc87871:POP-00178`, `seed:a1ee436b:POP-00806`.
    * Day 4 picks `seed:d5f2d0f8:POP-00053`, `seed:2fc87871:POP-00266`, `seed:a1ee436b:POP-00881`.
    * Day 5 picks `seed:d5f2d0f8:POP-00001`, `seed:a1ee436b:POP-00269`, `seed:6f606eff:POP-00790`.
    * Tamsin repeats `(A's W3 [hot-streak]; Oaks W1 [player-energy]; Oaks W1 [hot-streak])` on **all 5 days** and `(Oakland Alternative Response Initiative is dispatch-live...)` on **4 consecutive days**, while 14 of the 19 major seeds never appear.

* **Verdict (3b — `CitizenEvents` bypasses `BOOKKEEPING`, emitting `Emerged into Tier-4` / `Added to Simulation_Ledger` as life events):** **REAL** — `scripts/buildLivesSlice.js:257-260`.
  * `phase07-evening-media/buildContractSeeds.js:117-125` pulls all current-cycle `LifeHistory_Log` rows into `CitizenEvents` without filtering `BOOKKEEPING`.
  * `scripts/buildLivesSlice.js:257-259` checks `if (!own || !nameOf(pop) || !take(pop, id)) continue;` — it **never checks `BOOKKEEPING.test(own.text)`** (unlike `:99`, `:170`, and `:273`).
  * **Concrete breaking input (live C112 `output/beats/Story_Seed_Deck.jsonl`):**
    Four live C112 seeds carry bookkeeping lines in `CitizenEvents`:
    * `2705661d` (`major`): `"Maya Inoue — Emerged into Tier-4 in Grand Lake"`
    * `33c01c91` (`major`): `"Jose Johnson — Emerged into Tier-4 in Eastlake"`
    * `3b9dbdf3` (`texture`): `"Darnell Oyelaran — Added to Simulation_Ledger as Tier 4. Joined BART as a train operator."`
    * `6db06e5d` (`texture`): `"Maya Inoue — Emerged into Tier-4 in Grand Lake"`
    When `2705661d` reaches `POP-01207` (`Maya Inoue`), `:346` emits:
    `"Maya Inoue — Emerged into Tier-4 in Grand Lake, Grand Lake — one of 4 people the Cycle's city turn reached (...) (C112, seed)"`, which directly trips `newsroom-wake-packages.json:1569` (`canonBlockers`: `"intake bookkeeping rows (Emerged into Tier, Added to Simulation_Ledger, Updated to Tier) written as life events"`).

* **Verdict (3c — `Why` first segment (`:261`) emits engine-only noise, mid-word truncations, and another citizen's relocation reason):** **REAL** — `scripts/buildLivesSlice.js:261, 346` & `scripts/beatSliceKit.js:145, 151`.
  * `scripts/beatSliceKit.js:145` states: `/** Story_Seed_Deck rows for this cycle on a desk — citizens/businesses/colour lines, never the What/Why metric strings. */`, yet `:151` exports `what`/`why` and `buildLivesSlice.js:261` injects `String(sd.why || '').split('|')[0].trim().slice(0, 140)` into `anchorFacts`:
    1. **Engine carryover/formula strings in live C112:**
       * `0dd6f4eb` (`major`): `Why` is `"carryover: cycle 2 of 3 | Bay Tribune added 2 employees"`. `.split('|')[0]` picks `"carryover: cycle 2 of 3"` and discards `"Bay Tribune added 2 employees"`.
       * `3b54d421`, `1704509d`, `49320d32` (`major`): `Why` is `"carryover: cycle 2 of 3"`, `"carryover: cycle 3 of 4"`, `"carryover: cycle 4 of 6"`.
       * `d5f2d0f8` (`major`, picked Days 1–5): `Why` is `"A's W3 [hot-streak]; Oaks W1 [player-energy]; Oaks W1 [hot-streak]"`.
       * `92c68daa` & `6712c3eb` (`major`): `Why` is mid-word clipped at 120 chars in the sheet: `"...Fruitvale Transit Hub Phas"` and `"...Oakland Youth Apprenticesh"`.
    2. **Cross-citizen misattribution on relocation seeds in live C112:**
       * `2c2f341f` (`major`): `Why` is `"Mart Johns moved from Adams Point to KONO — leaving Adams Point for a better fit"`, and `Citizens` is `POP-00648 Mart Johns; POP-00889 Noor Ng; POP-01024 AJ Dybantsa; POP-00859 Tatiana Flores` (where `Noor Ng`, `AJ Dybantsa`, `Tatiana Flores` are neighborhood backdrop fills from `buildContractSeeds.js:485`). When `Mart Johns` is already in `seenPop`, `:261` attaches `(Mart Johns moved from Adams Point to KONO — leaving Adams Point for a better fit)` to `Noor Ng`.
       * `fb51206e` (`major`): `Why` is `"Lo Thoop moved from Temescal to Jack London — moving up from Temescal | Christine Nakamura moved from Temescal to Jack London — moving up from Temescal"`. `Lo Thoop` (`POP-00667`) is in `HH-0112-F008`, so the seed picks `POP-01108` (`Christine Nakamura`) — and because `:261` takes `.split('|')[0]` instead of matching the `Why` segment to `c.name`, `Christine Nakamura` gets `(Lo Thoop moved from Temescal to Jack London — moving up from Temescal)`!

* **Verdict (3d — `CitizenEvents` regex match edge cases):** **REAL** — `scripts/buildLivesSlice.js:257-258`.
  * `const m = /^(.+?)\s+—\s+(.+)$/.exec(t)`:
    * **Name with ` — `:** non-greedy `(.+?)` splits at the first ` — ` inside the name (`m[1]` is the partial name before ` — `), which never matches `c.name.toLowerCase()`, dropping the citizen (`own === undefined`).
    * **Two citizens with the same name on one seed:** `.find(x => x && x.name.toLowerCase() === ...)` returns the first citizen's `CitizenEvents` entry for both POPIDs; on the next day, the second homonym citizen is assigned the first citizen's event line.

---

### Hunt 4 — `LIFE_TAGS`

* **Verdict (4a — Structural machine markers and ambient colour tags ranked as life events):** **REAL** — `scripts/buildLivesSlice.js:48-53, 124`.
  * Verified against all 2,344 C112 rows in `output/beats/LifeHistory_Log.jsonl`:
    1. **`CareerState` in `LIFE_TAGS[3]` (`:52`) and `SIGNAL_TAG` (`:124` via `/^Career/`):**
       * `utilities/citizenDialMap.js:254` (`STRUCTURAL = { 'Compressed': true, 'CareerState': true }`) and `utilities/compressLifeHistory.js:1151` define `[CareerState]` as an internal key-value persistence marker, never prose.
       * **Concrete live C112 rows (`LifeHistory_Log.jsonl`):** 2 rows in C112 have `EventTag: "CareerState"` with `EventText`:
         `"industry=service|employer=small|level=1|careerMod=0.92"` and `"industry=service|employer=large|level=1|careerMod=0.92"`.
       * Because `BOOKKEEPING` (`:55`) does not match `industry=` / `CareerState`, `CareerState` is eligible both as a Rank 3 `moment` passage (`"<Name> — industry=service|employer=small|level=1|careerMod=0.92, <hood> (C112, CareerState)"`) and as a top-priority `signal` thread line in `threadFor` (`:172, 181`).
    2. **`Household` in `LIFE_TAGS[0]` (`:49`, Rank 0):**
       * All 3 C112 `Household` rows are generic ambient mood: `"felt positive atmosphere inside the home"`, `"enjoyed the lakeside neighborhood tranquility"`, `"handled routine household matters"`.
       * Because `Household` sits at **Rank 0** (above Rank 1 `Strain`/`Friction`), on live C112 Days 3 & 4 (`POP-00182 Jorry Cula`, `POP-00235 Aaliyah Brennan`, `POP-00246 Dearie Beacon`) those 3 rows outrank all **81** `Strain` (55) and `Friction` (26) rows in the city.
    3. **`Career` (9 rows in C112) and `Education` (23 rows in C112) in `LIFE_TAGS[3]` (`:52`):**
       * Every C112 `Career` row is ambient texture (`"had a routine period at work with no major changes"`, `"felt improved workplace morale"`, `"picked up a coffee from a vendor by the stop"`).
       * Every C112 `Education` row is ambient texture (`"felt encouraged to focus on self-improvement"`, `"visited the neighborhood school library"`, `"paid closer attention to news and information this cycle"`).
    4. **`Faith` (3 rows in C112) in `LIFE_TAGS[2]` (`:51`):**
       * 2 of the 3 C112 `Faith` rows have subjectless scene text `"the scent of incense drifts from the temple doors left ajar"`, rendering `"<Name> — the scent of incense drifts from the temple doors left ajar, <hood> (C112, Faith)"`.

* **Verdict (4b — Real life-event tags missing from `LIFE_TAGS`):** **REAL** — `scripts/buildLivesSlice.js:48-53`.
  * Missing tags present in the live C112 `output/beats/LifeHistory_Log.jsonl` dump:
    1. **`LifeEvent-Promotion-*` (20 rows in C112; 44 rows across the dump):** `LifeEvent-Promotion-Up-S` (10 in C112, e.g. `"Was handed the keys at Oakland Hospital to open on their own for the first time."`), `LifeEvent-Promotion-Down-S` (8 in C112, e.g. `"Someone at Oakland Hospital is being groomed for the next step up, and it is not them."`), `LifeEvent-Promotion-Up-M` (2 in C112, e.g. `"The lead at BART Oakland Division is leaving and told them privately to go for it."`), `LifeEvent-Promotion-Down-M` (1 in dump). Note that `SIGNAL_TAG` (`:124`) explicitly includes `LifeEvent-Promotion`, but `LIFE_TAGS` (`:48-53`) omits it.
    2. **`Relocation-*` (17 rows in C112):** `Relocation-Drive-Up-M` (9 rows, e.g. `"moved from Uptown to West Oakland — moving up from Uptown — sold up and bought in West Oakland"`), `Relocation-Composure-Up-M` (7 rows, e.g. `"moved from Adams Point to KONO — leaving Adams Point for a better fit"`), `Relocation-Composure-Down-M` (1 row, `"moved from Downtown to East Oakland — household income fit favored East Oakland over Downtown"`). Unlike `CITIZEN_RELOCATED` hooks, these `LifeHistory_Log` rows carry exact citizen `POPID`s.
    3. **`Career-Hired` (2 rows in dump):** `"Hired at West Oakland Stabilization Fund"`. `LIFE_TAGS` includes `Career-FieldChange` and `Career-Training`, but omits `Career-Hired`.
    4. **`Stumble` (`utilities/citizenDialMap.js:239, 438`):** `PRESSURE_STATE_TAGS` has three pressure tags (`Friction`, `Strain`, `Stumble`, where `Stumble` is first-cycle unemployment pressure in `runCareerEngine.js:1910`); `LIFE_TAGS[1]` (`:50`) only lists `Strain|Friction`.
    5. **`CivicRole-*` (11 rows in C112; 30 in dump) & `Civic` (4 in dump):** e.g. `CivicRole-Down-L` (`"A West Oakland elder stood in front of a full room and read every unanswered letter aloud, with dates."`), `Civic` (`"spoke for two minutes at the council meeting and did not stop shaking until the bus"`).
    6. **`BoundaryCompromised` (2 in dump) & `Alliance` (3 in dump):** `LIFE_TAGS[2]` (`:51`) includes `BoundaryKept` and `Rivalry`, but omits their paired tags `BoundaryCompromised` (`"kept the extra change the cashier handed back and said nothing"`) and `Alliance` (`"compared notes with Sergio Aybar over coffee that went long near a corner shop"`).

* **Verdict (4c — Dial-suffixed tags defeated by `$` anchor in `LIFE_TAGS`):** **REAL** — `scripts/buildLivesSlice.js:49-53, 126`.
  * `cleanTag` (`:126`: `String(t || '').split('|')[0].trim()`) strips `|source:...` metadata but preserves `-<Dial>-<Up|Down>-<S|M|L>` suffixes (`utilities/citizenDialMap.js:12` `gradedParts_`).
  * Because all 4 regexes in `LIFE_TAGS` (`:49-52`) end with `$` (unlike `SIGNAL_TAG` on `:124`, which has no `$`), any dial-suffixed variant of a `LIFE_TAGS` base tag fails `lifeRank(tag)`:
    * **Concrete live C112 rows dropped:** `QoL-Composure-Down-S` (2 rows in C112: `"saw the clinic line stretch out the door"`) and `QoL-Outabout-Up-S` (2 rows in C112: `"found the corner shops busy on a weeknight"`) are dropped even though `QoL` is in `LIFE_TAGS[2]`. Any graded `Strain-Composure-Down-S` row is likewise dropped by `/^(Strain|Friction)$/i`.

---

### Hunt 5 — Prompt load (`factCap: 90`, `targetWords: "450-1200"`, W1/W2/W3 caps on a 16-person slice)

* **Verdict (5a — `factCap: 90` truncates Person #16's thread in `creativeBrief.facts` and the W3 writer brief, while `packet.known` stays uncapped at 95):** **REAL** — `scripts/buildLivesSlice.js:386`, `scripts/livedExperiencePacket.js:210, 386, 885`, `scripts/cron-desk-run.js:888, 2006`.
  * On live C112 Day 1 (`16` people, `92` slice facts):
    * `w1.task.creativeBrief.facts` (`livedExperiencePacket.js:210`: `uniq(prewrite.anchorFacts).slice(0, prewrite.factCap || 12)`) and the W3 markdown brief (`cron-desk-run.js:888`: `bs.prewrite.anchorFacts.slice(0, bs.prewrite.factCap || 12)`) truncate at index 90, dropping `fact[90]` and `fact[91]` (the last two thread lines of Person #16 `POP-00661 Bianca Crook`).
    * Meanwhile, `buildAnglePacket` (`livedExperiencePacket.js:386`: `for (const fact of prewrite.anchorFacts || [])`) and `buildWritePacket` (`:885`) do **not** apply `factCap`, putting all **95** `FACT` claims (cycle + label + hookLine + 92 `anchorFacts`) into `packet.known` and `w3.manifest.approvedFacts`.
    * If a Day 1 slice also has 2 open hospital stays (`PER_DAY.stays = 2`, which was `0` in C112 only because `H-C106-POP-00801` discharged), total facts reach ~104–108 and `factCap: 90` slices off the **entire passage and thread of the last 2–3 citizens** in the W3 writer brief while leaving them in `slice.citizens` and `packet.known`.

* **Verdict (5b — W1 & W2 hardcode `.slice(0, 12)` on candidates, dropping People #13–#16 on Day 1):** **REAL** — `scripts/livedExperiencePacket.js:415` & `scripts/cron-desk-run.js:420-436, 2251`.
  * `livedExperiencePacket.js:415` (`buildAnglePacket`) slices `candidates` to `.slice(0, 12)` (and `cron-desk-run.js:2251` saves `citizens: beatSlice.citizens.slice(0, 12)` in `angle.json`).
  * In W2 (`cron-desk-run.js:430-436`), `collectQuoteAsks` filters `sourcingPool.candidates` against `w1ByPop` (`angleArt.inputPacket.exposure.candidates`, which has only the first 12 citizens).
  * **Concrete live C112 Day 1 impact:** People #13–#16 (`POP-00443 Ace Hill`, `POP-00594 Robert Corliss`, `POP-00224 Dillon Trevor`, `POP-00661 Bianca Crook` — all 4 `moments` citizens) are excluded from `w1.exposure.candidates`; if W1 targets any of them, `validateAngleOutput` (`livedExperiencePacket.js:575-578`) throws `'target must use a supplied pop with question+basis'`, and none of #13–#16 can ever be interviewed in W2.
  * For the up to 4 interviewees (`QUOTE_CITIZEN_CAP = 4`, `cron-desk-run.js:327`) chosen from #1–#12, `buildReportPacket` (`livedExperiencePacket.js:787-790`) reads `angleInput.known` (all 95 `FACT` claims, uncapped), places the interviewee's own matching lines (`mine`) first, and pads the remainder of the 8-claim floor with `facts[0..]` (Person #1 `Maurice Franklin`'s hospital discharge lines).

* **Verdict (5c — W3 writer prompt hardcodes `bs.citizens.slice(0, 10)`, dropping People #11–#16 and their `RoleType`s):** **REAL** — `scripts/cron-desk-run.js:890-891`.
  * `cron-desk-run.js:890-891`:
    ```js
    L.push('PEOPLE ON THE RECORD (your sources — never invent another):');
    for (const c of bs.citizens.slice(0, 10)) L.push('  - ' + c.profile);
    ```
  * On C112 Day 1 (16 citizens), Day 2 (12 citizens), Day 3 (11 citizens), and Day 4 (11 citizens), citizens #11–#16 (`Evan Morello`, `Li Wei`, `Ace Hill`, `Robert Corliss`, `Dillon Trevor`, `Bianca Crook` on Day 1) are omitted from `PEOPLE ON THE RECORD (your sources — never invent another)`. Because `household`, `casino`, `seed`, `moment`, and `stay` fact lines (`buildLivesSlice.js:336-356`) do not print `RoleType` or `business` (only `c.profile` does), the writer has no role/employer in the brief for citizens #11–#16 and is warned not to use anyone outside the 10-person list.

---

### Hunt 6 — Cache and covered list

* **Verdict (`LIVES-SLICE-2` day-cache invalidation & v4 `SeedID` cycle hash):** **FALSE-POSITIVE** — `scripts/buildLivesSlice.js:35, 398` & `phase07-evening-media/buildContractSeeds.js:558`.
  * `cached.version === SEAT.version` (`:398`) invalidates any `LIVES-SLICE-1` cache on disk.
  * Live v4 `Story_Seed_Deck` rows compute `seedId: contractSeedHash_(cycle + '|' + order[k] + '|' + lead.causeId)` (`buildContractSeeds.js:558`), which hashes the Cycle number into `SeedID`.

* **Verdict (6a — `seed:<SeedID>:<POP>` lacks `:cycle` when `SeedID` is blank or non-v4, and `writeCovered` keeps 3 Cycles inclusive):** **REAL** — `scripts/buildLivesSlice.js:63, 256`.
  * `:63`: `Number(v.cycle) >= Number(cycle) - 2` retains `cycle - 2`, `cycle - 1`, and `cycle` (**3 Cycles**, not 2).
  * `:256`: `const id = 'seed:' + String(sd.seedId || '') + ':' + pop;` — unlike `household:<id>:<cycle>`, `casino:<id>:<cycle>`, `moment:<pop>:<cycle>:<tag>`, and `stay:<id>:<cycle>`, `seed:` omits `:<cycle>`.
  * **Concrete breaking input:** A seed row with missing/blank `SeedID` (`{ Cycle: '111', SeedID: '', Citizens: 'POP-00001 Vinnie Keane', CitizenEvents: 'Vinnie Keane — ...' }`) writes `covered['seed::POP-00001'] = { cycle: 111, ... }`. In C112 or C113, another seed with blank `SeedID` (or a synthetic/legacy seed that reuses a human-readable `SeedID` across Cycles) for `POP-00001` collides on `covered['seed::POP-00001']` and is skipped.

* **Verdict (6b — Raw `covered[*].kind` values `'seed'` and `'casino'` leak into `buildVoicesSlice.js` and `threadFor`):** **REAL** — `scripts/buildVoicesSlice.js:106-109` & `scripts/buildLivesSlice.js:184-185, 346`.
  * `scripts/buildVoicesSlice.js:106-109` reads `lives_covered.json` and formats:
    `'; Lives carried their ' + eventCovered.kind + ' this Cycle — you carry the words, not the event'`.
    When `eventCovered.kind` is `'seed'` or `'casino'`, Ines's candidate `why` reads `"; Lives carried their seed this Cycle"` or `"; Lives carried their casino this Cycle"` (and `:106` matches `Number(v.cycle) >= Number(cycle) - 1`, calling a prior-Cycle `cycle - 1` entry `"this Cycle"`).
  * `scripts/buildLivesSlice.js:185` (`threadFor`) formats:
    `who + 'Lives already wrote this person: ' + before.map(([, v]) => v.kind + ' (C' + ... + ')').join(', ')`.
    When a citizen covered via `kind: 'seed'` or `'moment'` in C111 appears in C112, `threadFor` emits `"<Name> — Lives already wrote this person: seed (C111)"` into `anchorFacts`, and `:346` suffixes every seed passage with `(C112, seed)` — injecting the engine term `seed` into `packet.known`.

---

### Hunt 7 — Tests (`scripts/buildLivesSlice.test.js`)

* **Verdict:** **REAL** — `scripts/buildLivesSlice.test.js:50-63, 103-112, 144-147`.
  * **1. Day-1 ordering assertion (`:103`) and per-section assertions (`:105-119`) pass on broken sort/cap implementations because the fixture is pre-sorted and under-cap:**
    * **Household sort (`buildLivesSlice.js:220`):** In `beats.Household_Ledger` (`:51-52`), the couple (`HH-0111-F001`) is already at index 0 before the solo household (`HH-0111-F002`) at index 1, and there are only 2 C111 rows (`PER_DAY.households === 2`). Removing `.sort((a, b) => String(b.Members || '').length - String(a.Members || '').length)` or removing `if (households.length >= PER_DAY.households) break;` passes `buildLivesSlice.test.js`.
    * **Casino swing sort (`buildLivesSlice.js:238-239`):** In `beats.Casino_Ledger` (`:56-57`), `w-win` (`swing = 700`) is already at index 0 before `w-loss` (`swing = 500`) at index 1, and there are only 2 settled rows (`PER_DAY.casino === 2`). Removing `.sort((a, b) => b.swing - a.swing)` or sorting by `payout` instead of `swing` passes `buildLivesSlice.test.js`.
    * **Seed `major`-first sort (`buildLivesSlice.js:251`) and `PER_DAY.seeds` cap:** `beats.Story_Seed_Deck` (`:60-63`) has only 1 row (`Class: 'major'`, 0 `texture` rows). Inverting `(a.cls === 'major' ? 0 : 1) - (b.cls === 'major' ? 0 : 1)` passes `buildLivesSlice.test.js`.
    * **`LIFE_TAGS` rank sort (`buildLivesSlice.js:276`) and `PER_DAY.moments` cap:** `beats.LifeHistory_Log` (`:38-45`) has only 1 eligible current-cycle moment (`POP-90006`, `Relationship`). Inverting `momentPool.sort((a, b) => a.rank - b.rank)` passes `buildLivesSlice.test.js`.
  * **2. Seed-line regex assertion (`:111`) passes on wrong neighborhood/domain/`Why` implementations:**
    * `beats.Story_Seed_Deck[0]` (`:61-62`) uses `Neighborhood: 'Citywide'` (so `sd.hood && !/^citywide$/i.test(sd.hood)` is false and only `hoodOf(pop)` is exercised; an implementation that always uses `hoodOf(pop)` and ignores `sd.hood` passes), `Desk: 'sports'` + `Domain: 'SPORTS'` (identical when lowercased), and `Why: "A's W3 [hot-streak] | The sports week reached 2 citizen(s)"` (where segment 0 is the expected string, masking the `.split('|')[0]` bug on multi-citizen relocation seeds).

---

## Proposed Minimal Diffs (Do Not Apply Without Review)

```diff
--- a/scripts/buildLivesSlice.js
+++ b/scripts/buildLivesSlice.js
@@ -30,7 +30,7 @@ const K = require('./beatSliceKit');
 
 const SEAT = {
-  slug: 'tamsin-pruitt', name: 'Tamsin Pruitt', popid: null, desk: 'culture',
+  slug: 'tamsin-pruitt', name: 'Tamsin Pruitt', popid: 'POP-01210', desk: 'culture',
   kind: 'beat-lives', domain: 'lives', artifact: 'lives', builder: 'buildLivesSlice.js',
   version: 'LIVES-SLICE-2', nameRe: /tamsin\s*pruitt/i,
   tabs: ['Lived_Events', 'LifeHistory_Log', 'Hospital_Ledger', 'Household_Ledger', 'Casino_Ledger', 'Story_Seed_Deck', 'Story_Hook_Deck'],
@@ -46,12 +46,12 @@ const KIND_ORDER = { death: 0, hospital: 1, birth: 2, retirement: 3, promotion:
 // The log's event tags that are something that happened to the person, ranked: 0 shapes a life, 1 is
 // pressure, 2 a tie or a standing, 3 work and school as lived. The day's colour (Daily, Neighborhood,
 // Civic Perception, Personal, PrevEvening, Lifestyle, Sports…) never leads a passage; it rides the thread.
 // Plain Health and Recovering are ailment / wellness texture (the plan's news-grade read), not here.
 const LIFE_TAGS = [
-  [/^(Wedding|Marriage|Graduation|Household|Stabilized|Setback|Maneuver-(Climb|Hold|Retreat)|Career-FieldChange|PostCareer|Business-Gain)$/i, 0],
-  [/^(Strain|Friction)$/i, 1],
-  [/^(Relationship|Reputation|Community|Cultural|Faith|Rivalry|Public|BoundaryKept|QoL|Household-GameNight)$/i, 2],
-  [/^(Work|Education|Career|CareerState|Career-Training)$/i, 3]
+  [/^(Wedding|Marriage|Graduation|Stabilized|Setback|Maneuver-(Climb|Hold|Retreat)|Career-FieldChange|Career-Hired|LifeEvent-Promotion|Relocation|PostCareer|Business-Gain)(\b|-)/i, 0],
+  [/^(Strain|Friction|Stumble)(\b|-)/i, 1],
+  [/^(Relationship|Reputation|Community|Cultural|Faith|Rivalry|Alliance|Public|BoundaryKept|BoundaryCompromised|CivicRole|Civic|QoL|Household-GameNight)(\b|-)/i, 2],
+  [/^(Work|Career-Training)(\b|-)/i, 3]
 ];
 const lifeRank = tag => { for (const [re, r] of LIFE_TAGS) if (re.test(tag)) return r; return null; };
-const BOOKKEEPING = /Emerged into Tier|Added to Simulation_Ledger|Updated to Tier|Promoted to Tier|Intake at Tier|Media usage C\d/i;
+const BOOKKEEPING = /Emerged into Tier|Added to Simulation_Ledger|Updated to Tier|Promoted to Tier|Intake at Tier|Media usage C\d|^industry=/i;
```
