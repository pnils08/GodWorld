# Adversarial Diff Read — engine.356: Log Columns (A5), Bond from Shared Moment (Cut B), Wake Part of the Day (Cut C)

**Commit range on PROD stage 86 (`4866ee600`):**
- **Cut 1 (A5):** `3a8e02cc3` — [phase05-citizens/generateCitizensEvents.js](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js), [phase05-citizens/bondEngine.js](file:///root/GodWorld/phase05-citizens/bondEngine.js), [output/engine-sheet/2026-11-25-e356s/](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356s)
- **Cut 2 (Cut B):** `51864901d` + fix-up `f45764d8a` — [phase05-citizens/bondEngine.js](file:///root/GodWorld/phase05-citizens/bondEngine.js), [phase01-config/engine94SheetContract.js](file:///root/GodWorld/phase01-config/engine94SheetContract.js), [output/engine-sheet/2026-11-25-e356t/](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356t)
- **Cut 3 (Cut C):** `5d8681761` — [lib/wakePerception.js](file:///root/GodWorld/lib/wakePerception.js), [scripts/citizen-wake.js](file:///root/GodWorld/scripts/citizen-wake.js)

**Plan & Brief:** [2026-11-21-a-moment-has-a-place.md](file:///root/GodWorld/docs/plans/2026-11-21-a-moment-has-a-place.md) · [2026-11-25-es-brief-agy-e356-a5-bond-wake.md](file:///root/GodWorld/docs/for-claude-review/2026-11-25-es-brief-agy-e356-a5-bond-wake.md)

---

## Verdicts by Cut

| Cut | Commit(s) | Verdict | Why |
|---|---|---|---|
| **1. A5 (Log PlaceId / WithPopId)** | `3a8e02cc3` | **SHIP** | All `LifeHistory_Log` batch/intent writers and archive/compression scripts handle 9 columns without ragged writes; `e356s` C118 bench passed (`PASS`, `3453` rows, `problems: 0`, `notProven: []`) and `compare.js base full` is `IDENTICAL`. Two LOW hardening notes below. |
| **2. Cut B (Bond from Shared Moment)** | `51864901d` + `f45764d8a` | **HOLD** | Ended (`resolved` / `severed`) bond rows are dropped on load by `loadRelationshipBonds_`, so `bondsFromSharedMoments_` recreates bonds for divorced/severed pairs (and fails `e356t/read.js:60`); raw unnormalized `_bondKeySet` / `detectNewBonds_` name-vs-POPID mismatch can duplicate a same-name pair or miss legacy rows; `e356t/read.js:76-80` misclassifies mixed `housemate`+`coworker` pairs; `e356t` bench has not run yet. |
| **3. Cut C (Wake Part of Day)** | `5d8681761` | **SHIP-WITH-FIXES** | Prompt wiring, cron keys, cycle timing, and owed-pin isolation hold cleanly, but `c.dayMoments` injects companion names into prompts without adding them to `OFFERED_FILE` (so `extractBondsFromWakes.js` scores offered names `'unprompted'`) or `biasReadback`, and `loadDayMoments` adds an uncached 4th full-tab read of `LifeHistory_Log` per wake. |

---

## Cut 1 — A5 (`LifeHistory_Log` `PlaceId` / `WithPopId`, `3a8e02cc3`) — **SHIP**

### Findings (Minor / Hardening)

#### 1.1 [LOW] `detectTriangleRivalries_` passes raw unnormalized `popId` into `appendBondLifeLine_` (`WithPopId`), unlike `noteBondConnectionShift_`
- **Pointers:** [bondEngine.js:3060-3064](file:///root/GodWorld/phase05-citizens/bondEngine.js#L3060-L3064), [:3077-3078](file:///root/GodWorld/phase05-citizens/bondEngine.js#L3077-L3078), [:2125](file:///root/GodWorld/phase05-citizens/bondEngine.js#L2125), [:2171-2172](file:///root/GodWorld/phase05-citizens/bondEngine.js#L2171-L2172)
- **Failure (`input -> wrong output`):**
  - `noteBondConnectionShift_` (`:2125, :2136`) normalizes `otherId` with `normalizeBondCitizenId_` before calling `appendBondLifeLine_`.
  - `detectTriangleRivalries_` (`:3061-3064, :3077-3078`) collects `popId` directly from `bond.citizenA` / `bond.citizenB` and passes it unnormalized into `appendBondLifeLine_(ctx, si.idx, 'TrustGuarded', ..., cycle, popId)`. If a legacy active romantic bond holds a citizen name or un-trimmed lowercase `pop-XXXXX`, `WithPopId` (col 9) receives the raw name/casing instead of canonical `POP-XXXXX`. (Note `e356s/read.js:56` passed all 38 `bondEngineRows` on the C118 bench because live romantic bonds already store clean `POP-XXXXX`.)

#### 1.2 [LOW] First-`place:` priority when a single row receives multiple `place:` tags, plus minor verifier hygiene in `e356s/read.js`
- **Pointers:** [generateCitizensEvents.js:259-271](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L259-L271), [:4442-4445](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4442-L4445), [:4490-4505](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4490-L4505); [e356s/read.js:30-35](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356s/read.js#L30-L35), [:49, :60](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356s/read.js#L49-L60)
- **Failure (`input -> wrong output`):**
  - `lifeLogEdgeCells_` (`:263-265`) returns the first `place:<id>` that is not `'employer'`, `'their-home'`, or `'congregation'`. If an ECL row starts with `place:employer` in `entry.tags` *and* also resolves `$VENUE` (`:4442`), `:4495` replaces `tags[empAt]` in place with `"place:" + empBiz` *ahead* of `$VENUE`'s pushed `place:<venueId>`, so `PlaceId` records the employer instead of the venue (and similarly `$VENUE` wins over `$PROGRAM` / `$CONGREGATION` at `:4442-4445`).
  - `e356s/read.js:49,60` has dead `wantPlace` / `void wantPlace`; `:30` checks `LifeHistory_Log` header only, not `LifeHistory_Archive`. On base mode (`:33`), if `PlaceId` / `WithPopId` were missing from the header (`ix === -1`), `col(r, ...)` evaluates `r[-1]`, though `:30` already catches a bad header.

### Attacks Checked Clean (A5)
- **No ragged widths across `LifeHistory_Log` writers / archive / compression:**
  - Both citizen-event batch pushes ([generateCitizensEvents.js:3150](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3150), [:4654](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4654)) append `.concat(lifeLogEdgeCells_(...))` (always length 2 -> uniform 9 cols in `logRows`, written at `:4723`). `hhLogBatch` (`:3318-3338`) writes uniformly 7 cols (`A:G`) in its own batch (`hhLogBatch[0].length`), leaving H:I blank.
  - `appendBondLifeLine_` ([bondEngine.js:2171-2172](file:///root/GodWorld/phase05-citizens/bondEngine.js#L2171-L2172)) queues 9-element rows via `queueAppendIntent_`; [persistenceExecutor.js:455-468](file:///root/GodWorld/phase10-persistence/persistenceExecutor.js#L455-L468) computes `maxCols` and pads every 7-wide intent row to `maxCols`.
  - [archiveLifeHistory.js](file:///root/GodWorld/utilities/archiveLifeHistory.js) reads `getDataRange().getValues()` (full sheet width) and writes whole-width slices (`archiveLifeHistory.test.js`: **13 passed, 0 failed**). `compressLifeHistory.js` has no `LifeHistory_Log` references. `scripts/engineCycleAudit.js` and `lib/wakePerception.js` do not use `getLastColumn()` to reject 9 columns.
- **Unresolved `place:their-home` / `employer` / `congregation`:** `lifeLogEdgeCells_` (`:265`) explicitly skips all three literal words; `withTags_` (`:3185`) converts `place:their-home` to `who.householdId` when present and drops it when absent (and `:4483` strips it when no contact was named).
- **`contactPopId:` trailing text & bond-line isolation:** `contactPopId:` is populated from `contact.popId` (normalized `POP-XXXXX`) and `bondEngine.js:2158-2172` attaches `contactPopId:` / `WithPopId` only on connection-shift tags (`TrustGuarded`, `ConnectionMaintained`, `ConnectionWithdrawn`), keeping `Bond` and `Wedding` tags bare for exact matchers.
- **Bench artifacts (`e356s`):** [read-base.out](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356s/read-base.out) (`rows: 3453, filled: 0, problems: 0`), [read-full.out](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356s/read-full.out) (`rows: 3453, withPlace: 505, withPerson: 836, both: 427, placeKinds: {HH: 74, BIZ: 324, PRG: 107}, bondEngineRows: 38, wider: 0, problems: 0, notProven: [], verdict: "PASS"`), and `node output/engine-sheet/2026-11-25-e356s/compare.js base full` run locally (`bonds: 772, logRows: 3453, rowsWithACellInFull: 914, differences: 0, verdict: "IDENTICAL"`).

---

## Cut 2 — Cut B (`bondsFromSharedMoments_`, `51864901d` + `f45764d8a`) — **HOLD**

### Findings

#### 2.1 [HIGH] Ended (`resolved` / `severed`) bonds are skipped on load, so `bondsFromSharedMoments_` recreates bonds for divorced/severed pairs
- **Pointers:** [bondPersistence.js:190-191](file:///root/GodWorld/phase05-citizens/bondPersistence.js#L190-L191), [:333](file:///root/GodWorld/phase05-citizens/bondPersistence.js#L333); [bondEngine.js:636-637](file:///root/GodWorld/phase05-citizens/bondEngine.js#L636-L637), [:661](file:///root/GodWorld/phase05-citizens/bondEngine.js#L661); [e356t/read.js:60](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356t/read.js#L60)
- **Failure (`input -> wrong output`):**
  - `bondsFromSharedMoments_` claims: `"Not made: a pair with any bond row already (active, dormant or ended — one row a pair)"` (`bondEngine.js:636-637`), and `e356t/read.js:60` checks `if (beforeBy[k]) problems.push(...)` over *all* rows in `bonds-before.json`.
  - Live `Relationship_Bonds` holds `ended` and `dormant` rows (observed in [e356s/after-base.json:1](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356s/after-base.json#L1)), which `loadRelationshipBonds_` does load. However, [bondPersistence.js:190-191](file:///root/GodWorld/phase05-citizens/bondPersistence.js#L190-L191) skips `status === 'resolved' || status === 'severed'` (divorces from `engine302Marital` and severed bonds). Those pairs are absent from `ctx.summary.relationshipBonds` and `ctx._bondKeySet`.
  - If two citizens whose bond is `resolved` or `severed` on the sheet share a `coworker` or `housemate` moment (e.g. a divorced couple who still share a workplace, or share a house on the Cycle of their divorce), `bondExists_(ctx, a, b)` (`:661`) returns `false` and `bondsFromSharedMoments_` creates a brand-new `active` `shared-moment` bond — contradicting `:636-637` and failing `e356t/read.js:60`. (Separately, `saveRelationshipBonds_` `:333` overwrites the sheet from `ctx.summary.relationshipBonds`.)

#### 2.2 [MEDIUM] Unnormalized `_bondKeySet` / `getBondKey_` and `detectNewBonds_` name-vs-POPID mismatch can duplicate a bond row
- **Pointers:** [bondEngine.js:241-260](file:///root/GodWorld/phase05-citizens/bondEngine.js#L241-L260), [:333-342](file:///root/GodWorld/phase05-citizens/bondEngine.js#L333-L342), [:675](file:///root/GodWorld/phase05-citizens/bondEngine.js#L675), [:1319-1322](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1319-L1322), [:1850-1851](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1850-L1851), [:1911-1927](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1911-L1927)
- **Failure (`input -> wrong output`):**
  - `buildBondKeySet_` (`:241-253`) and `getBondKey_` (`:258-260`) key on raw `b.citizenA` / `b.citizenB` without `String(...).trim().toUpperCase()` or `normalizeBondCitizenId_`. Any bond row carrying lowercase/padded POPIDs or a citizen name misses `bondExists_` (`:661`, `:1912`, `:1920-1922`) in `bondsFromSharedMoments_` and produces a duplicate bond row.
  - Conversely, `bondsFromSharedMoments_` inserts `POP-XXXXX|POP-YYYYY` into `ctx._bondKeySet` (`:675`), whereas `detectNewBonds_` (`:1319-1322`) passes display names (`activeCitizens` from `_bondActivePool`) to `getBondKey_`, missing the `POPID|POPID` key. It then rolls compatibility/dice (`rng()`) and calls `makeBond_` (`generateBondId_` consumes another `ctx.rng` draw). Step 3 (`:336-339`) catches it after `makeBond_` *unless* either citizen shares `First + Last` with another citizen in `ctx.ledger`, in which case `normalizeBondCitizenId_` leaves the raw name unresolved and `:337` pushes a second bond row for the same pair.

#### 2.3 [MEDIUM] Housemate family gate misses step-/grand-/in-law relations and lowercase IDs, and lacks a same-Cycle romance guard if tuned `>= 5.5`
- **Pointers:** [bondEngine.js:651](file:///root/GodWorld/phase05-citizens/bondEngine.js#L651), [:662-669](file:///root/GodWorld/phase05-citizens/bondEngine.js#L662-L669), [:2317-2319](file:///root/GodWorld/phase05-citizens/bondEngine.js#L2317-L2319), [:2332](file:///root/GodWorld/phase05-citizens/bondEngine.js#L2332), [:2449-2454](file:///root/GodWorld/phase05-citizens/bondEngine.js#L2449-L2454), [:96-118](file:///root/GodWorld/phase05-citizens/bondEngine.js#L96-L118); [engine94SheetContract.js:567](file:///root/GodWorld/phase01-config/engine94SheetContract.js#L567)
- **Failure (`input -> wrong output`):**
  - The housemate gate (`:662-669`) checks `SpouseId`, `ParentIds`, `ChildrenIds`, and shared `ParentIds` (siblings). It passes **step-parents / step-children** (spouse's `ChildrenIds` or parent's spouse), **grandparents / grandchildren** (`ParentIds` of `ParentIds`), and **in-laws** living in the same household, creating `Origin: shared-moment` `friendship` bonds between them.
  - `:651` and `:2332` parse `/POP-\d+/` case-sensitively without `/i`, and `buildBondLedgerIndex_` (`:2319`) indexes `map[row[iPop]]` without `.trim().toUpperCase()`, so padded or lowercase POPIDs miss lookup (`:658`) or slip past the family check.
  - `processRomanceAndMarriage_` (`:2450`) only blocks same-Cycle romance flip on `[Deepened into friendship C<cycle>]`. Seeded `bondFromMomentHousemate = 3 < bondRomanceAt (5.5)` avoids it today, but `ENGINE356_CONFIG_SEEDS` allows `[0, 10]` (`engine94SheetContract.js:567`); raising `bondFromMomentHousemate >= 5.5` lets a brand-new `shared-moment` friendship flip to `ROMANTIC` on its birth Cycle. Also `'shared-moment'` is not registered in `BOND_ORIGINS` (`:96-118`).

#### 2.4 [MEDIUM] `e356t/read.js` misclassifies pairs with both `housemate` and `coworker` moments (plus no RNG/base-vs-full comparison yet)
- **Pointers:** [e356t/read.js:38](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356t/read.js#L38), [:76-80](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356t/read.js#L76-L80); [bondEngine.js:653-677](file:///root/GodWorld/phase05-citizens/bondEngine.js#L653-L677)
- **Failure (`input -> wrong output`):**
  - If a non-family pair shares a `housemate` moment *first* and a `coworker` moment *second* in `S.sharedMoments`, `bondsFromSharedMoments_` creates a `friendship` bond on the first moment (`:670, :675`). Yet `e356t/read.js:76` hardcodes `const kind = kinds.has('coworker') ? 'coworker' : 'housemate'`. If `bondFromMomentCoworker` is set to `0` and `bondFromMomentHousemate > 0`, `read.js:78` skips the pair and undercounts `t.expected`; and when both are `> 0`, `:80` only checks `Origin === 'shared-moment'`, not that `BondType` matches the first moment in log order.
  - Additionally, `e356t` has no `fire-full.out` / `read-full.out` run on disk yet; because `makeBond_` draws from `ctx.rng`, later random encounters (`detectNewBonds_`) shift without a base-vs-full comparison, and `read.js` does not verify `Relationship_Bond_Ledger` rows or `/POP-\d+/i` case-insensitively (`:38`).

### Attacks Checked Clean (Cut B)
- **Duplicate moments in `S.sharedMoments`:** When IDs are canonical `POP-XXXXX`, `bondsFromSharedMoments_` (`:675`) sets `ctx._bondKeySet` immediately upon creation and `:661` skips any later moment for that pair.
- **Blank `BirthYear`:** `isMinor` (`:652`: `P.birthYear > 1900 && simYear - P.birthYear < 18`) treats missing/0 `BirthYear` as `false` (adult), matching [e356t/read.js:37](file:///root/GodWorld/output/engine-sheet/2026-11-25-e356t/read.js#L37).
- **Same-week step / decay / deepen:** `bondsFromSharedMoments_` runs at `:328` *after* `updateExistingBonds_` (`:325`), so new `shared-moment` bonds receive no weekly step, no fade, and no `deepenBondToFriendship_` (`:999`) in their birth Cycle.
- **`World_Config` & `BOND_DIAL_KEYS_` wiring:** `BOND_DIAL_KEYS_` (`:271-274`) adds both keys; `loadBondDials_` (`:276-286`) throws naming any missing/blank/non-numeric key; `ENGINE356_CONFIG_SEEDS` (`engine94SheetContract.js:566-567`) seeds both `[0, 10, false]` before `Phase1-LoadConfig` (`godWorldEngine2.js:601`); `godWorldEngine2.js:963` checkpoints *after* `Phase5-Bonds`, so checkpoint resume never runs `Phase5-Bonds` with an empty `S.sharedMoments` or unset `S.cycleId`.
- **`S.bondsFromMoments` & persistence:** `S.bondsFromMoments` (`:642`) has no conflicting reader; `origin: 'shared-moment'` and `notes` persist through [bondPersistence.js:317, 322](file:///root/GodWorld/phase05-citizens/bondPersistence.js#L317-L322) and `saveV3BondsToLedger_` (`bondEngine.js:3142-3143`, since `makeBond_` sets `lastUpdate: cycle`).

---

## Cut 3 — Cut C (`dayMomentsFrom` / `loadDayMoments` + `citizen-wake.js`, `5d8681761`) — **SHIP-WITH-FIXES**

### Findings

#### 3.1 [MEDIUM] `c.dayMoments` puts named companions into the wake prompt without recording them in `OFFERED_FILE` (or `biasReadback`)
- **Pointers:** [scripts/citizen-wake.js:182-183](file:///root/GodWorld/scripts/citizen-wake.js#L182-L183), [:213](file:///root/GodWorld/scripts/citizen-wake.js#L213), [:451-454](file:///root/GodWorld/scripts/citizen-wake.js#L451-L454), [:490](file:///root/GodWorld/scripts/citizen-wake.js#L490), [:505-524](file:///root/GodWorld/scripts/citizen-wake.js#L505-L524); [scripts/extractBondsFromWakes.js:161-176](file:///root/GodWorld/scripts/extractBondsFromWakes.js#L161-L176)
- **Failure (`input -> wrong output`):**
  - `buildVoicePrompts` (`citizen-wake.js:213`) injects `${c.dayMoments}` directly into `Real things from your life recently:`. Those lines are full `LifeHistory_Log.EventText` strings naming coworkers, housemates, and other `contactPopId` companions.
  - `OFFERED_FILE` logging (`:506-523`) writes `offeredPops` (`neighbors` + `bondPairs`) and `own: [pageMemory, familyLine, bondsLine, rippleLine]`, omitting `c.dayMoments`. When `c.dayMoments` names a coworker/housemate/other companion who was not already in `bondsLine` or `neighbors` (or whose line fell outside `c.life`'s 5-line `lifeTailOf`), and the citizen echoes that name, `extractBondsFromWakes.js:161-176` (`provenanceOf`) misses it in `rec.own` and reports the echo as `'unprompted'` instead of `'continuity'`. (Historical `c.life` has the same omission, but Cut C opens a new cycle-fresh companion list on top.)
  - Likewise, `resonance.biasReadback` (`:182-183`) and `loadOwnPageReadback` `contextText` (`:490`) do not pass `c.dayMoments`, so carried biases or page memories about a person named only in `c.dayMoments` fail to trigger.

#### 3.2 [MEDIUM] `loadDayMoments` adds an uncached 4th full-tab read of `LifeHistory_Log` per wake
- **Pointers:** [lib/wakePerception.js:109-112](file:///root/GodWorld/lib/wakePerception.js#L109-L112), [:60](file:///root/GodWorld/lib/wakePerception.js#L60), [:1368](file:///root/GodWorld/lib/wakePerception.js#L1368), [:1510](file:///root/GodWorld/lib/wakePerception.js#L1510); [lib/sheets.js:429-431](file:///root/GodWorld/lib/sheets.js#L429-L431); [scripts/citizen-wake.js:449-454](file:///root/GodWorld/scripts/citizen-wake.js#L449-L454)
- **Failure (`input -> wrong output`):**
  - `sheets.getRawSheetData('LifeHistory_Log')` (`lib/sheets.js:429-431`) delegates directly to `getSheetData('LifeHistory_Log')` with no in-memory cache.
  - Every `citizen-wake.js` run already reads the full `LifeHistory_Log` tab in `loadLivedEvents` (`:1510`), `loadOwedRecords` when `owedRes > 0` (`:1368`), and `loadLifeArc` (`:60`). Adding `loadDayMoments` (`:110`) performs a 4th full read of the simulation's largest growing sheet on every wake cron (`07:30`, `12:30`, `21:30`). (Failure path is safe: `loadDayMoments` catches and returns `{ error }` at `:111`, which `citizen-wake.js:452` logs non-fatally and renders no block.)

#### 3.3 [LOW] Substring collision in `shown.indexOf(text)`, un-trimmed `POPID` check, and raw engine bracket tags in `EventText`
- **Pointers:** [lib/wakePerception.js:97-105](file:///root/GodWorld/lib/wakePerception.js#L97-L105); [phase05-citizens/generateCitizensEvents.js:4507-4518](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4507-L4518)
- **Failure (`input -> wrong output`):**
  - `dayMomentsFrom` (`:103`) suppresses duplicates via `shown.indexOf(text) >= 0` (substring match across all 5 `c.life` lines) instead of matching exact line bodies after stripping `Y<y>C<c> — [Tag] `. A short `EventText` that happens to be a substring of a longer line in `c.life` is falsely skipped; `:100` also checks `String(r[iPop] || '').toUpperCase() !== pop` without `.trim()`.
  - `generateCitizensEvents.js:4508, 4517` appends `" [rivalry active]"` and `" [" + activeArc.type + " arc]"` to `EventText`; because `dayMomentsFrom` emits `r[iText]` verbatim (`:102, :106`), those engine suffixes reach the prompt whenever `c.life`'s 5-line cap excludes that line.

### Attacks Checked Clean (Cut C)
- **Cron `--wake` values vs `WAKE_DAY_PART`:** [docs/OPERATIONS.md:55, 58, 73](file:///root/GodWorld/docs/OPERATIONS.md#L55-L73) invokes `--wake=morning`, `--wake=midday`, and `--wake=night`; all three exist in `WAKE_DAY_PART` (`morning`, `midday -> afternoon`, `afternoon`, `evening`, `night -> evening`, [lib/wakePerception.js:87](file:///root/GodWorld/lib/wakePerception.js#L87)).
- **`getCurrentCycle()` alignment:** [scripts/citizen-wake.js:345](file:///root/GodWorld/scripts/citizen-wake.js#L345) reads [lib/getCurrentCycle.js](file:///root/GodWorld/lib/getCurrentCycle.js) (freshest `output/world_summary_c{N}.md`), matching the last completed Cycle `N` across the week (and A4 writes all three `when:` parts together during the Cycle fire).
- **Already-shown `c.life` lines & owed pins / `owedShownSet`:** `c.life` lines are formatted `Y<y>C<c> — [Tag] <text>`, so `shown.indexOf(text)` catches lines currently inside `c.life`; `loadDayMoments` (`citizen-wake.js:451`) runs *after* `c.life = lifeTailOf(c.lifeLines || [], pins)` (`:426`) and `owedShownSet(mineOwed, c.life, lived)` (`:429`), never altering `c.life` or `owedShownSet`.
- **Other callers (`citizenVoice.js`, `citizen-exchange.js`):** Neither calls `buildVoicePrompts` ([citizenVoice.js:212](file:///root/GodWorld/scripts/citizenVoice.js#L212), [citizen-exchange.js:138](file:///root/GodWorld/scripts/citizen-exchange.js#L138)); both construct their own prompt strings, so nothing sees an unexpected `undefined`.

---

## Verification, Tests & Wiring Cards

- **Syntax (`node --check`):** `phase05-citizens/generateCitizensEvents.js`, `phase05-citizens/bondEngine.js`, `phase01-config/engine94SheetContract.js`, `lib/wakePerception.js`, `scripts/citizen-wake.js`, `output/engine-sheet/2026-11-25-e356s/read.js`, `output/engine-sheet/2026-11-25-e356s/compare.js`, `output/engine-sheet/2026-11-25-e356t/read.js`, `output/engine-sheet/2026-11-25-e356t/before.js` -> `SYNTAX_OK`.
- **Offline tests run (`node`, `exit 0`):**
  - `scripts/engine94SheetContract.test.js`: **30/30 passed**
  - `scripts/dialWave2Seams.test.js`: **27 passed, 0 failed**
  - `scripts/engine302Marital.test.js`: **109 passed, 0 failed**
  - `scripts/wakeOwedMilestone.test.js`: **10 checks passed**
  - `scripts/wakeHealthPerception.test.js`: **37 passed, 0 failed**
  - `scripts/archiveLifeHistory.test.js`: **13 passed, 0 failed**
  - `scripts/extractBondsFromWakes.test.js`: **all assertions passed**
  - `scripts/bondTargetMatch.test.js`: **all pass**
  - *Timed out under short caps (not counted as full passes):* `lib/wakePerception.test.js` (`244` output lines printed including `officeCases`, `spoolCases`, `owedStepCases`, timed out at 45s / 12s while waiting on `Promise.all` / multi-process `lockCases`); `scripts/contentLedgerCompose.test.js` (timed out at 12s mid-Monte-Carlo run).
- **Engine-Wiring Cards (Haiku, generated 2026-11-25 prior to review):**
  - `generateCitizensEvents_` ([agent_engine-wiring_2026-11-25T05-55-36.md](file:///root/GodWorld/output/agent_engine-wiring_2026-11-25T05-55-36.md)): `Phase5-CitizenEvents` @ `godWorldEngine2.js:755, :2476` (before `Phase5-Bonds` `:765, :2486` and `Phase10-ExecuteIntents` `:967, :2666`); writes `S.citizenEvents`, `S.sharedMoments`, `S.cycleActiveCitizens`, `LifeHistory_Log` (`DIRECT setValues`), `Content_Telemetry` (`INTENT`).
  - `runBondEngine_` ([agent_engine-wiring_2026-11-25T05-55-09.md](file:///root/GodWorld/output/agent_engine-wiring_2026-11-25T05-55-09.md)): `Phase5-Bonds` @ `godWorldEngine2.js:765, :2486`, `v3Integration.js:50`; reads/writes `ctx.summary.relationshipBonds`; direct/intent writes on `Relationship_Bonds` (replace intent), `Relationship_Bond_Ledger` (`setValues`), `LifeHistory_Log` (`queueAppendIntent_`), `Household_Ledger`, `Family_Relationships`, `Simulation_Ledger`.
