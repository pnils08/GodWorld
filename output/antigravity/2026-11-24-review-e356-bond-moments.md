# Adversarial Diff Read — engine.356 Bond-Called Moments

**Commit:** `bf324305b` (on top of `847e86971` + `f98837a7e`)
**Scope:** [phase05-citizens/generateCitizensEvents.js](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js), [phase05-citizens/bondEngine.js](file:///root/GodWorld/phase05-citizens/bondEngine.js), [phase01-config/engine94SheetContract.js](file:///root/GodWorld/phase01-config/engine94SheetContract.js), [output/engine-sheet/2026-11-24-e356p/](file:///root/GodWorld/output/engine-sheet/2026-11-24-e356p) (`bench-lines.json`, `apply-bench.js`, `read.js`, `bench.sh`, `bench-push.sh`)
**Plan:** [2026-11-21-a-moment-has-a-place.md](file:///root/GodWorld/docs/plans/2026-11-21-a-moment-has-a-place.md) §Bond-called moments

## Verdict: SHIP-WITH-FIXES

The overall architecture (`bondCallsFor_`, symmetric pair dedup `bmPairRolled_`, `S.sharedMoments`, `updateExistingBonds_` single step + no-fade, and the 7 `ENGINE356_CONFIG_SEEDS` wired via `ensureEngine356Config_`) fits the Phase 5 ordering (`CitizenEvents -> Bonds -> Phase 10`) and handles `-M` lead tags cleanly downstream. Before lifting the bench lock or deploying, fix four defects in `mirrorShared_`, `bondLineFor_`, `bondCallsFor_`, and `read.js` / missing-config handling:

1. `mirrorShared_` bypasses minor (`engine.144`), `GAME`-clock (`engine.208`), `cycleSeen`, and job/role gates.
2. `bondLineFor_` draws using raw `le.weight` and ignores `dialShare` (`engine.349`) and pool weight modifiers.
3. `bondCallsFor_` consumes `bmCount_` slots before knowing if a call actually emits, and skips bonds whose two endpoints both miss the participation roll.
4. Blank/missing `bondMoment*` config silently disables or zeroes without failing loud, and `read.js` does not fail when a moment bond drops (`d < 0`) or stays flat (`d === 0`).

---

## Findings

### 1. [HIGH] `mirrorShared_` bypasses `engine.144` youth, `engine.208` `GAME`-clock, `Conditions`, `cycleSeen`, and job/context gates
- **Pointers:** [generateCitizensEvents.js:2988-3010](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L2988-L3010), [:3171](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3171), [:4015-4070](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4015-L4070), [:4169](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4169), [:4540-4544](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4540-L4544)
- **Failure (`input -> wrong output`):**
  - `mirrorShared_` checks only `loadWithIdx_().rowOf[who.popId]` (`:2989`), which filters out `deceased | traded | pending | inactive` (`:2880`) and never checks age (`BirthYear` < 18), `ClockMode` (`GAME`), `Tier` (`1..4`), or `Conditions` (`band!=child` on every row in `bench-lines.json`). When an adult `A` draws a `shared:both` line naming minor `B` (e.g., `family`, `friend`, `housemate`) or a `source:sports` line naming a `GAME`-clock citizen `B`, `mirrorShared_` writes adult-deck / spectator lines (e.g., `[Neighborhood-Sociability-Up-M]`) directly onto `B`'s `LifeHistory` and `LifeHistory_Log`, bypassing `engine.144` (`:3171`) and `engine.208` (`:4065`).
  - Line `:2997` strips `contactPopId|occupation|ageGroup|neighborhood|tier|qol|hotspot|archetype:`, leaving `source:occupation`, `act:shift`, and `place:<A's EmployerBizId>` untouched if a `shared:both` row carries them onto an unemployed or differently employed `B`.
  - When `A` (`r < oi`) mirrors onto `B` before `B`'s loop iteration runs, `B`'s `cycleSeen` still starts at `[]` (`:4169`), allowing `B` to draw the exact same `"had dinner with A..."` sentence as one of `B`'s own `eventCount` lines in the same Cycle.
  - `:2991` uses `text.split(who.name).join(selfName)`, which replaces every substring occurrence of `who.name` (risky if a citizen has a single-word name matching a venue/street).
  - *(Checked OK: `rows[oi]` shares the same inner row reference modified at `:3200`/`4504`, so later iterations append onto `oRow[iLife]` without overwriting `mirrorShared_`; `activeSetObj[oRow[iPopID]]` matches `:3203`/`4557`.)*
- **Fix:** Guard `mirrorShared_` (and/or `shared:both` matching) against `isMinor` / `tier > 4` / `GAME`-clock sports conflicts; track mirrored text in a per-POPID `mirroredTexts` set added to `cycleSeen` at `:4169`; strip `source:occupation` / `act:shift` / `grain:` if needed.

### 2. [HIGH] `bondLineFor_` ignores `engine.349` soft dial weights (`dialShare`) and all pool weight modifiers
- **Pointers:** [generateCitizensEvents.js:3013-3028](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3013-L3028), [:3867-3868](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3867-L3868), [:4073-4149](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4073-L4149), [:4200](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4200)
- **Failure (`input -> wrong output`):** Line `:3021` builds `fits` using raw `Math.max(0.001, Number(le.weight) || 1)` (`le` = `pool[bl].ledgerLine`, the unadjusted sheet row) instead of `pool[bl].weight * (pool[bl].dialShare || 1)` (as `pickWeighted_` uses). Any `$CONTACT` line conditioned on a soft dial term (`warmth>=60` at `warmth=55` where `dialShare = 0.25`) or scaled by archetype/dial/grief multipliers draws at 100% of raw sheet `Weight` on `bondCall` draws.
- *(Checked OK: `pool` already passed `evalContentConditions_`, `contentSlotsFillable_`, `hoodHasSpotFor_`, `isEventEligible_`, `S.undockedPilots`, `GAME` splice `:4065`, and the `eclTelemetry.draws >= 40` load cap `:3848`; successful draws count at `:4292`.)*
- **Fix:** Weight `bondLineFor_` candidates by `(Number(pool[bl].weight) || 1) * (typeof pool[bl].dialShare === 'number' ? pool[bl].dialShare : 1)`.

### 3. [MEDIUM] `bondCallsFor_` burns `bmCount_` before emission checks, skips non-participating pairs, and rolls multi-type pair bonds twice
- **Pointers:** [generateCitizensEvents.js:2956-2984](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L2956-L2984), [:3320](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3320), [:4168](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4168), [:4200-4201](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4200-L4201), [:4283](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4283), [:4398](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4398)
- **Failure (`input -> wrong output`):**
  - `bondCallsFor_` increments `bmCount_[self]` and `bmCount_[calls[kc].popId]` at `:2979-2980` **before** checking whether `bondLineFor_` finds a line (`!entry -> continue` at `:4201`), `composeContentLine_` succeeds (`:4283`), `cycleSeen` allows it (`:4288`), or `gradedTagFor_` emits it (`:4398`). When a `bondCall` drops silently (e.g., an active `mentor` or `partner` bond with no matching `with:mentor`/`with:partner` `$CONTACT` row in `pool`), the partner loses one of their `BM_MAX = 3` weekly slots for a moment that never fired.
  - `bondCallsFor_` runs at `:4168` inside the per-citizen loop *after* the participation roll at `:3320`. Any active bond where neither endpoint participates that Cycle (`~70%+` of Cycles at normal participation odds) never rolls (`p = Intensity/10 * BM_SCALE` only gets a chance when at least one party enters `:4168`), significantly stretching expected time-to-marriage beyond 10 weeks for non-high-participation couples.
  - `pairKey` (`:2967`) includes `bTy`, so if one pair has two active bonds of different types (`friendship` + `alliance`, or `neighbor` + `professional`), the pair rolls twice in the same Cycle. *(Checked OK: `self`, `other`, `bTy` case/whitespace normalization and no `Math.random`.)*
- **Fix:** Increment `bmCount_` only once a `bondCall` line passes `gradedTagFor_` and actually writes (or pre-filter `bondCallsFor_` against lines fitting that `kind` in `pool` + defer `bmCount_[other]++` until write). Decide if non-participating citizens' bonds should roll independently or accept the participation-gated rate.

### 4. [MEDIUM] Silent config fallbacks (`Number("") === 0`, unvalidated `BM_SIZE`, log-and-skip in `bondEngine`) and `read.js` verification gaps
- **Pointers:** [generateCitizensEvents.js:2947-2954](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L2947-L2954), [bondEngine.js:658-671](file:///root/GodWorld/phase05-citizens/bondEngine.js#L658-L671), [engine94SheetContract.js:535-543](file:///root/GodWorld/phase01-config/engine94SheetContract.js#L535-L543), [read.js:51](file:///root/GodWorld/output/engine-sheet/2026-11-24-e356p/read.js#L51), [:94-101](file:///root/GodWorld/output/engine-sheet/2026-11-24-e356p/read.js#L94-L101), [:131-143](file:///root/GodWorld/output/engine-sheet/2026-11-24-e356p/read.js#L131-L143)
- **Failure (`input -> wrong output`):**
  - **Config fallbacks:** Because `Number("") === 0` (`isFinite(0) === true`), a blank string cell in `World_Config` silently turns bond-called moments off (`BM_MAX = 0` at `:2947`) or steps bonds by `0` (`:660`) without hitting the missing-key `Logger.log`. When keys are `undefined` (`NaN`), both writers log and silently no-op instead of failing loud (unlike `neighborhoodTrajectoryEngine.js:156`), and `BM_SIZE` (`:2949`) is never checked with `isFinite` (`undefined` silently falls back to `S`). `ENGINE356_CONFIG_SEEDS` (`engine94SheetContract.js:538`) allows `bondMomentDialSize = 3`, which silently behaves like `2` (`M`). *(Checked OK: `inspectEngine94Config_` ranges/integers/duplicates are clean and `ensureEngine356Config_` runs before `Phase1-LoadConfig` in `runWorldCycleLocked_` at `godWorldEngine2.js:601`.)*
  - **`read.js`:**
    - `:139` logs moment bonds whose intensity dropped (`d < 0 && w < 10`) into `notes` only, never `problems`; and a moment bond with `d === 0` (e.g., `updateExistingBonds_` skipped `S.sharedMoments` due to missing config) passes cleanly (`verdict: "PASS"`).
    - `:132-133` keys `was` by `BondId + '|' + bKey(b)`: duplicate/blank `BondId`s on two bonds of the same pair and `KIND` (`friendship` + `alliance`) collide, and a bond whose `KIND` changes during the Cycle (`neighbor` -> `friendship`) disappears from comparison.
    - `:94` hardcodes `/-M$/` rather than checking `cfg.bondMomentDialSize`; `:51` (`twinKey`) overwrites duplicate `(POPID, EventText)` rows; `:96` shares `split(op.name)` substring risk.

### 5. [LOW / NOTE] `ev = eventCount - 1; continue;` and `ev === 0` side effects (`FAME_WATCH` / `recordPulse_`)
- **Pointers:** [generateCitizensEvents.js:4167-4205](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4167-L4205), [:4433](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4433), [:4516](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4516)
- **Checked Behavior:** Not an infinite loop (`eventCount >= 1`, so `ev` jumps to `eventCount - 1` then increments to `eventCount`). If `ev === 0` hits `:4196` or drops via `continue` (`:4283, :4288, :4398`) and only `bondCall` slots (`ev >= eventCount >= 1`) emit, `ev === 0` at `:4433` (`FAME_WATCH`) and `:4516` (`recordPulse_`) do not fire for that citizen. Conversely, when `ev = 0` emits normally, `bondCall` iterations (`ev >= 1`) do not inflate pulse/fame counts.

---

## Attacks Checked Clean

- **Attack 5 — `bondEngine.js` `updateExistingBonds_`:**
  - `momentBonds === null` when `bondMomentStep*` is missing (`:655-681`): `hadMoment` is `false`, `momentStep` is never dereferenced.
  - `priorIntensity` (`:690`): reads `Number(bond.intensity) || 0` — `:684` mutates local `intensity` while `bond.intensity` stays untouched until `:887`, so `priorIntensity` (`:690`) captures the pre-moment intensity and `intensityDelta` (`:917`) includes the moment step.
  - Dormant bonds: `getCitizenBonds_` (`runRelationshipEngine.js:657`) filters to `active`; `coworker`/`housemate` picks carry `bondType: ""` (`:2908, :2935`) and are skipped at `bondEngine.js:665`. Thus `dormant` bonds never get `hadMoment = true` and still fade at `:869`.
  - Same-Cycle threshold transitions: `updateExistingBonds_` runs at `bondEngine.js:298` *before* `deepenBondToFriendship_` (`:911`, which blocks same-Cycle romance at `:2371`) and `processRomanceAndMarriage_` (`:318`, which prevents same-Cycle marriage at `:2391`). Allowing `momentStep` to push `tension >= 6` (`:898`) or `romantic >= 8` (`:2397`) that Cycle is consistent with all existing `updateExistingBonds_` modifiers.
- **Attack 7 — Downstream tag & `S.sharedMoments` consumers:**
  - `bond:called`, `shared:both`, and `-M` lead tags (`GRADED_RE` `-(S|M|L)$` in `utilities/citizenDialMap.js:344-358`, `gradedParts_` in `utilities/compressLifeHistory.js:1955, :2011`, `world-view/build.js:13-25`, `scripts/buildLivesSlice.js:47`) are handled uniformly; `loadEventContentLedger.js:270` checks `tags[0]` only.
  - `buildCycleChecksum_` (`utilities/cycleModes.js:332-345`) does not serialize or hash `S.sharedMoments`.

---

## Checks & Wiring Card

- **Syntax (`node --check`):** `phase05-citizens/generateCitizensEvents.js`, `phase05-citizens/bondEngine.js`, `phase01-config/engine94SheetContract.js`, `output/engine-sheet/2026-11-24-e356p/read.js`, `output/engine-sheet/2026-11-24-e356p/apply-bench.js` -> `SYNTAX_OK`.
- **Offline tests (`node`):**
  - `scripts/engine94SheetContract.test.js`: **30/30 passed**
  - `scripts/hoodCrimeBandsBlank.test.js`: **17 passed, 0 failed**
  - `scripts/contentLedgerCompose.test.js`: **98 passed, 0 failed**
  - `scripts/engine299Graded.test.js`: **18 passed, 0 failed**
  - `scripts/bondTargetMatch.test.js`: **all pass** (13 assertions)
  - `scripts/compressLifeHistory.bond.test.js`: **all 16 pass**
  - `scripts/dialWave2Seams.test.js`: **27 passed, 0 failed**
  - `scripts/engine302Marital.test.js`: **108 passed, 0 failed**

### Engine-Wiring Card (Haiku) — `updateExistingBonds_` (`output/agent_engine-wiring_2026-11-25T03-37-25.md`)
- **Def & Phase:** `phase05-citizens/bondEngine.js:600` (called by `runBondEngine_` @ `bondEngine.js:298`, `Phase5-Bonds` @ `godWorldEngine2.js:765`, `:2486` — AFTER `Phase5-CitizenEvents` `:755`/`:2476`, BEFORE `Phase10-Bonds` and `Phase10-ExecuteIntents` `:967`/`:2666`).
- **Relevant `S.` / `ctx` IO:** `READ sharedMoments @ :656` (written by `generateCitizensEvents_`), `READ cycleActiveCitizens @ :617`, `READ relationshipBonds @ :603`, `READ previousCycleState @ :778`, `READ cityDynamics @ :794`, `READ ctx.config @ :604, :659`.
- **Write path:** In-memory mutations on `ctx.summary.relationshipBonds` (`bond.intensity` @ `:887`, `bond.status` @ `:890, :893`, `bond.bondType` @ `:899, :902`, `bond.notes` @ `:900, :903`, `bond.lastUpdate` @ `:919`); persisted by `saveRelationshipBonds_` at Phase 10.
