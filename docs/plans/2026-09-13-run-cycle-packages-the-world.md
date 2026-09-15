---
title: Run-Cycle Packages the World to Its Readers Plan
created: 2026-09-13
updated: 2026-09-14
type: plan
tags: [engine, pipeline, citizen-loop, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md pipeline.69
  - output/engine_review_c107.md §Read this first
  - S456 measurements (this file §Baseline)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (pipeline.69; engine.214 is the engine-side sibling)"
  - "[[../.claude/skills/run-cycle/SKILL]] — the chain this plan wires"
  - "[[SIM_DOCTRINE]] §15 / §16 — a gate that can't fire is a trick; drift over static backfill"
  - "[[index]] — registered same commit"
---

# Run-Cycle Packages the World to Its Readers Plan

**Goal:** every artifact `/run-cycle` leaves on disk carries the whole engine's week for all 22 neighborhoods and 943 citizens to the crons that read it — the desk slices Monday 06:15, the citizen wakes three times a day, the Sunday civic chain — so that a resident of Laurel and a resident of Temescal each wake into their own street, not into "nothing much out of the ordinary."

**Architecture:** the engine fires once (Apps Script, the builder's hand); the chain reads sheets once and writes the package (`world_summary`, `desk_signal`, `beats/*.jsonl`, `neighborhood_texture`, `world_state.json`, `baseline_briefs`, snapshots); the crons read only the package, never the sheets. This plan wires the package to the engine's full output. It replaces nothing; it closes the gaps between what the engine writes and what the readers get. The engine-side sibling (ten hoods missing from 25 hood literals) is engine.214 + a literal sweep, filed here as Task 4 so the two halves are tracked in one place.

**Execution correction, 2026-09-14 (codex, Mike-direct):** Codex leads the simulation repairs; engine-sheet executes directed changes and readbacks. The broader instruction is to fix the sim, not to limit work to the missing-hood count. Fires are held. Task 7 corrects duplicated economic calculation before its output is wired across Cycles. Task 4's existing cluster cut is not authorization to fire: its embedded names and coefficients still require the truth-source repair.

**Terminal:** engine/sheet (Tasks 1–3, 5, 6); engine/sheet on the bench for Task 4.

**Pointers:**
- Prior work: `scripts/buildNeighborhoodTexture.js` v1.1.0 (S456, `Story_Seed_Deck` in — hoods with signal 8→15, quiet citizens 360→85); `output/engine_review_c107.md`; `output/engine_anomalies_c107_followup.md`
- Related plan: [[2026-09-07-beat-slices-from-sheets-plan]] (pipeline.68 — the slice builders this package feeds)
- Research basis: research.19 T2 (texture as frozen per-cycle perception artifact), Mike-direct S456: "this is what sets the table for the lived experience"

**Acceptance criteria:**
1. At the next live fire (C108), `neighborhood_texture_c108.md` reads a non-quiet block for every hood with ≥20 citizen life events that cycle (C107: that is 16 of 22), and the quiet line only where the engine produced nothing for the hood.
2. A citizen named in a `Story_Seed_Deck` row (moved, climbing, hired) wakes with that event in their own prompt, not only in the shared hood block.
3. No engine file outside `canonNeighborhoodLoader.js` carries a hood-name literal list; `S.canonHoods.list` (22) is the only hood roster. Verified by the sweep in Task 4 returning zero files.
4. Monday 06:15 `cron-desk-run --stage=angle` builds all 14 C108 slices from the package with no `NO_PRIOR_CYCLE` where a prior beats dump exists.

---

## Baseline (C107, measured S456 — the reason each task exists)

| Hood | Citizens | Businesses | World events | Ripples | Citizen life events | Seeds | Texture |
|---|---|---|---|---|---|---|---|
| Laurel | 63 | 6 | 0 | 0 | **122** | 0 | quiet |
| Piedmont Ave | 54 | 7 | 1 | 0 | **106** | 0 | one venue line |
| Adams Point | 7 | 6 | 1 | 0 | 20 | 0 | quiet |
| Grand Lake | 3 | 6 | 0 | 0 | 12 | 0 | quiet |
| Dimond | 4 | 6 | 0 | 0 | 4 | 0 | quiet |
| Ivy Hill | 3 | 6 | 0 | 0 | 6 | 0 | quiet |
| San Antonio | 3 | 6 | 0 | 0 | 6 | 0 | quiet |
| Eastlake | 2 | 6 | 0 | 0 | 1 | 0 | quiet |
| Temescal (for scale) | 81 | 7 | 0 | 4 | 162 | 4 | seeds |

Three causes, not one:

1. **The texture reads the rare layers and skips the big one.** Its sources are world events (11 citywide at C107), evening venues (5 draws), city events (4), and since v1.1.0 the seed deck (46, built from 67 ripples). The engine also wrote **2,015 citizen life events** at C107 with a `Neighborhood` column — Laurel alone had 122 ("recognized the OARI van idling outside the corner store", "watched the ninth from a packed bar and walked home in a crowd that didn't want to disperse"). None of it reaches the hood block. Laurel and Piedmont Ave are quiet for this reason only.
2. **Ten hoods are outside the engine's hood literals.** 25 engine files list the canon twelve by name and none of the other ten (`applyCityDynamics`, `buildCityEvents`, `generateCitizensEvents`, `runCareerEngine`, `runNeighborhoodEngine`, `runHouseholdEngine`, `buildNightLife`, `recordWorldEventsv3`, `applyStorySeeds`, `textureTriggers`, … full list in Task 4). Generators do not place events, venues, or dynamics there. The canonical loader (`S.canonHoods.list`, ADR-0016) already exists and is the only roster that should be read.
3. **Six hoods have 2–7 citizens.** engine.174's short-hood feeder mints ~8 generic citizens per cycle across the five shortest hoods; at that rate Eastlake reaches 20 in ten cycles. Time helps; it does not fix causes 1 and 2. Whether to mint faster into the thin hoods is a sim ruling (builder), not a build.

---

## Tasks

### Task 1: Texture reads citizen life events per hood (v1.2.0)

- **Files:**
  - `scripts/buildNeighborhoodTexture.js` — modify (`assembleHoodSources`, the reads in `buildNeighborhoodTexture`)
- **Steps:**
  1. Read `LifeHistory_Log` rows for the cycle (sheet read, same pattern as `Story_Seed_Deck`; ~2,000 rows) and group `EventText` by `Neighborhood`.
  2. Keep only place-shaped lines. `EventTag` is `[primaryTag].concat(tags).join('|')` (`generateCitizensEvents.js:3150-3153`), so split on `|`, test the FIRST token exactly, and test secondary tokens by exact membership — never prefix-match. Admit: primary `Neighborhood`, `PrevEvening`, `Community`, `Holiday`, `Civic Perception` (the OARI-team-on-the-corner / health-center-renderings class — street-level civic is texture); `Sports` only with secondary `gameNight`; `Daily` only with secondary `source:chaos` (a child's dinner-table question is `Daily` too). Out: `Personal`, `Lifestyle` (source token is `source:curiosity`), `Education`, and every other primary. A citizen's `Neighborhood` column is where they LIVE, not where the event was — a PrevEvening line about avoiding Jack London's crowds must not become a Jack London event under the resident's hood; drop lines whose text names a canon hood other than the row's.
  3. **Shared source boundary (codex review S458, verified):** the seed translator only anonymises names listed in that row's `Citizens`; C107 texture already carries Rico Valez (Rockridge, `neighborhood_texture_c107.md:31`) and GameGirl Gia (KONO, `:75`) from seed `Why` text, and `Gridiron Analytics added 2 employees` passes the metric filter (unsigned integer). Build ONE boundary function at the bundle assembly (`assembleHoodSources`, `:181-208`) that every source — seeds, events, venues, city events, SEEN — passes through: replace any Simulation_Ledger full name (the ledger is already loaded at `:468`) with `a neighbor`, drop lines carrying any bare integer count or signed/decimal metric. Not a per-source copy of the seed loop.
  4. Per hood, feed at most 6 lines, chosen deterministically: dedupe normalised text, sort by (primary tag, text), take every ⌈n/6⌉-th. Prefix `SEEN:`; add one prompt rule beside `NOTED` (`:240`): "SEEN lines are what individual residents already noticed this week — write the shared street they describe, never a person."
  5. Bump `SCRIPT_VERSION` (`:52`) to `1.2.0`; footer (`:539`) lists `LifeHistory_Log`.
- **Verify:** isolated first — a unit test over the pure selection + boundary (Rico/GameGirl lines anonymised, the Gridiron count dropped, the Jack London cross-hood line dropped, six-line cap, dedupe). Then `TEXTURE_DEBUG=1 node scripts/buildNeighborhoodTexture.js 107 --dry-run` (NOTE: dry-run still calls the model and appends logs, `:465-471`, `:557-562`): `(quiet)` counts empty INPUT bundles (`:499-506`), `QUIET_LINE` counts empty OUTPUT blocks (`:515-518`) — read both; input-quiet ≤ 3; Laurel's block mentions the corner store / the bar crowd / the holiday, no names, no numbers. LifeHistory_Log is not in the beats dump (`dumpBeatTabs.js:44-68`) — the reader is a sheet read or the tab joins the dump; decide in the cut.
- **Status:** [ ] not started — spec corrected S458 from `output/codex/pipeline69-plan-review.md` §Task 1

### Task 2: The wake tells a citizen their own seed event

- **Files:**
  - `scripts/citizen-wake.js` — modify (`buildVoicePrompts` inputs, the perception assembly at ~L281–L322)
  - `lib/wakePerception.js` — modify (new `loadOwnSeedLine(popId, cycle)`)
- **Steps:**
  1. `loadOwnSeedLine(popId, cycle)`: package only — read `output/beats/Story_Seed_Deck.jsonl`, filter rows by `Cycle === cycle` (the dump holds history), return '' when `output/beats/meta.json` `cycle` ≠ current or the file is missing. No sheet fallback: the crons read the package, never the sheets (§Architecture).
  2. **Ownership, not attachment (codex review S458, verified):** a seed's `Citizens` is the exact target PLUS neighborhood/global filler (`buildContractSeeds.js:198-225`) — Carmen's C107 move (`Story_Seed_Deck.jsonl:218`) lists three filler citizens who did not move; a merged Lake Merritt seed (`:219`) holds four movers with four origins. So: match the POPID token exactly, then resolve the citizen as the SUBJECT of a specific `Why` clause (relocation "X moved … from H" / promotion "X promoted …" with X = this citizen's ledger name) before rendering; merged clauses match per clause; filler-only matches return ''. Render second person from the raw clause ("you moved here from Chinatown"), NOT through the anonymous texture translator (it strips the subject — lossy by design). An employee-count seed never becomes "you were hired".
  3. Inject as `Something that happened to you this week: …` at `${c.life}${family}` (`citizen-wake.js:245`), resolved before recall (`:315`) so it lands in `contextText` and in the `own` bucket (`:347`). Fail open ('') when absent.
- **Verify:** isolated unit test over the loader + renderer in `lib/wakePerception.js` (Carmen → Chinatown; each of her fillers → ''; each merged mover → its own origin; wrong cycle / missing file → ''; the Rico/GameGirl/Gridiron rows never become personal facts). Then one authorised runtime check — the CLI parser is `--pop=POP-00011` (`:43-45`), it only forces a citizen already in the shaped pool, and dry-run still calls the model and writes logs (`:335-359`).
- **Status:** [ ] not started — spec corrected S458 from `output/codex/pipeline69-plan-review.md` §Task 2

### Task 3: Seed builder covers life events (engine side, optional if Task 1 lands)

- **Files:**
  - `phase07-evening-media/buildContractSeeds.js` — read first
- **Steps:**
  1. Read how `buildContractSeeds_` selects "texture" seeds from citizen events (log: `46 seeds (35 major / 11 texture) from 67 ripples + 1796 citizen events`). Measure per-hood coverage of the 11 texture seeds at C107 (4 hoods).
  2. If the per-hood floor is easy (one texture seed per hood with ≥N events), file it as its own engine.* row; otherwise close this task as "covered by Task 1" and record why.
- **Verify:** a written decision in this file's Changelog.
- **Status:** [ ] not started

### Task 4: One hood roster — sweep the 25 literals (engine.214 + siblings)

- **Files (each: modify, replace the literal with `S.canonHoods` / `getDistrictHoods_` / the sheet's `Adjacent` column):**
  - `phase02-world-state/applyCityDynamics.js` (engine.214 — the cluster table; first, alone on the bench)
  - `phase04-events/buildCityEvents.js`, `phase05-citizens/generateCitizensEvents.js`, `phase05-citizens/runAsUniversePipeline.js`, `phase05-citizens/runCareerEngine.js`, `phase05-citizens/runCivicRoleEngine.js`, `phase05-citizens/runEducationEngine.js`, `phase05-citizens/runHouseholdEngine.js`, `phase05-citizens/runNeighborhoodEngine.js`, `phase07-evening-media/buildNightLife.js`, `phase10-persistence/recordWorldEventsv3.js` (12/12 literals)
  - `phase07-evening-media/applyStorySeeds.js`, `cityEveningSystems.js`, `parseMediaRoomMarkdown.js`, `textureTriggers.js`, `mediaFeedbackEngine.js`, `storyHook.js`, `buildEveningFamous.js`; `phase02-world-state/calendarStorySeeds.js`, `applyWeatherModel.js`, `getSimHoliday.js`; `phase03-population/generateCrisisSpikes.js`; `phase05-citizens/generateGenericCitizens.js`, `runYouthEngine.js`; `phase06-analysis/economicRippleEngine.js` (partial literals)
- **Steps:**
  1. For each file, `engine-wiring` card first; classify the literal: roster (replace with `S.canonHoods.list`), profile table (keep the table, add the ten hoods with the sheet's `District`/`Adjacent` as the seed, or derive), or dead comment.
  2. One file per bench fire; read the 22-hood outputs back (Neighborhood_Map, WorldEvents by hood, venues by hood).
  3. Re-run the sweep: `node -e '<the S456 sweep>'` → zero files.
- **Verify:** C108 bench: world events, venues, and city events land in at least one of the ten hoods each cycle; Sentiment moves per hood, not in lockstep with the city scalar.
- **Status:** [~] engine.214 cut S458 (below); the 24-file sweep not started

#### engine.214 — the cluster table (cut S458, `phase02-world-state/applyCityDynamics.js`)

- **Defect (ROLLOUT engine.214, gap log G-EC80):** `CLUSTERS` was a five-cluster / twelve-hood literal; `neighborhoodDynamics` was built only for those twelve; `v3NeighborhoodWriter.js:411-413` fell back to the citywide scalar for any hood without an entry. C106→C107: the twelve moved a mean −0.037 Sentiment, the ten outside the table (Adams Point, Baylight District, Brooklyn, Dimond, East Oakland, Eastlake, Glenview, Grand Lake, Ivy Hill, San Antonio) moved +0.306 in lockstep with CitySentiment 0.25→0.51; reverse split at C106. Every mood-fed consumer (engine.213 approval, crime `:231/:924`, texture) inherited the sawtooth.
- **Cut:** the five clusters stay authored CHARACTER (weights, capacitySensitivity, place bias) and the twelve named hoods are their anchors. `assignClusterMembership_` floods every canon hood (`getCanonNeighborhoods_`, ADR-0016) in from the anchors: each pass a hood joins the cluster the most of its `S.neighborhoodAdjacency` neighbours already sit in; a tie goes to the one cluster holding a hood of the same District; an unbreakable tie, an unreachable hood, or an anchor off the map throws. `CLUSTER_ADJACENCY` is derived from the same column (cluster A touches B when any members are Adjacent) — on the live map that is the retired literal plus one true edge, WATERFRONT_WEST↔LAKE_CORRIDOR (Brooklyn–Eastlake). `S.clusterDefinitions[ck]` gains `anchors`.
- **Live map result (one pass, Eastlake the one District tie → D8 → LAKE_CORRIDOR):** DOWNTOWN_CORE Downtown, Uptown, KONO, Chinatown · WATERFRONT_WEST Jack London, West Oakland, Brooklyn, Baylight District · LAKE_CORRIDOR Lake Merritt, Piedmont Ave, Adams Point, Grand Lake, Eastlake, Glenview · NORTH_HILLS Rockridge, Temescal · EAST_OAKLAND Fruitvale, Laurel, Dimond, Ivy Hill, San Antonio, East Oakland.
- **Cascade checked before the cut:** `aggregateDemographics_` returns ratios (six hoods average, not sum); the seed ladder is median-relative (engine.188) and CULTURE/NIGHTLIFE/CIVIC seeds were 0 at C107; `applyCrimeRipple_` gates on prev-cycle increase-shifts summed per cluster and C106→C107 had exactly one citywide (Piedmont Ave violent +1) — no gate moves at the live range. No `ctx.rng` in the file, so the extra hoods shift no draw order.
- **Codex review (`output/codex/engine214-cut-review.md`, FIX-FIRST → fixed S458):** (1) a tie that a later pass would break threw on pass 1 — fixed: ties defer while the flood makes progress, and only a pass that seats nobody throws (T4 Eastlake-D3 now resolves on pass 2; T5 holds a synthetic persistent tie). (2) Failure policy ruled: the throw stays. Inside `safePhaseCall_` it returns false, logs to Engine_Errors, and leaves `S.cityDynamics` / `S.neighborhoodDynamics` unset for that cycle (readers fall to neutral defaults, the next snapshot carries no momentum) — the same wall the Phase-1 loader already throws for a bad Adjacent name, and only reachable by editing the map; T9 proves it through the real wrapper. (3) Cascade the plan understated, now on the readback list: the ten joiners newly receive the initiative/approval buses (engine.93 T5), commute lifts, local seed/economy/crime thresholds and microclimate; cluster economy mood averages hoods equally, so six inputs can move an anchor's threshold; the added edge dilutes existing bleed coefficients (WATERFRONT 0.06→0.04 per neighbour, LAKE 0.04→0.03); capacity congestion feeds every cluster; Cycle_Packet and the carry-forward compactor go 12→22 entries; Phase-4 micro-events read joiner-local dynamics, so the cycle's rng order past Phase 2 is NOT proven unchanged (the earlier "no rng" line only covers Phase 2 itself).
- **Pre-declared for the bench readback:** CitySentiment averages cluster metrics with fixed `clusterWeights`, so it rebases only as far as the six-hood clusters' inputs differ from their two anchors (input-dependent, not inevitable — the default harness gives 0.20 both before and after); the ten hoods have no prior track on the first fire, so momentum proves on the second. Readback C108 + C109: all 22 ΔSentiment against the scalar move — the ten formerly in lockstep dispersed; the twelve anchors within ±0.05 of the same cycle's pre-cut projection (band = one momentum step at nhMom 0.3 on the live range); 22 entries in Cycle_Packet and in `Carry_Forward_Store` previousCycleState; Crime_Metrics joiners' strain overlays (`updateCrimeMetrics.js:924-938`) read back against C107.
- **Test:** `scripts/clusterMembership.test.js` — 37 checks (22 keys, the membership table, anchors as copies, derived adjacency, the Eastlake tie deferred/resolved, persistent tie + unreachable + missing seed throws, momentum on a joiner, bus reaches a joiner and clears, real-compactor round trip 22×6, real `safePhaseCall_` degradation). Fails on `c37d85ea` (12 keys). `sentimentRestingLevel` 23, `hoodBlindTables` 9, `crimeCarryForward` 23 unchanged; Acorn ES5 parse clean.
- **Superseded bench proposal:** the rejected engine.214 cut was not fired. Codex completed the typed live-C107 resync; Task 7 records the isolated engine.217/218 proof with engine.214 excluded. No builder command or automatic PROD step remains in this proposal.

### Task 5: Monday readback — the C108 slices

- **Files:** `output/slices/c108/*.md`, `output/cron-compare/*_slice_c108.json` — read
- **Steps:**
  1. After the 06:15 angle wake, count slices (14 expected), grep `NO_PRIOR_CYCLE` (should be 0 where `beats/prev/` has the C107 dump), read one beat slice per builder for a hood outside the canon twelve.
  2. File any builder that reads only the canon twelve as a row here.
- **Verify:** a table in the Changelog: builder → hoods covered.
- **Status:** [ ] not started

### Task 6: Thin-hood population — builder ruling

- **Question for the builder (sim, not code):** six hoods carry 2–7 citizens. Options: (a) leave engine.174's feeder at ~8/cycle and let time fill them; (b) raise the short-hood mint for N cycles; (c) mint authored anchors (a corner store owner, a school secretary) into each so the hood has a face. (c) is the "top-tier seats are authored" rule applied to places.
- **RULED (builder, 2026-09-14): (a) — "the gate is open from GC to fill these."** The engine.148 emergence gate (World_Config `hoodCitizenFloor` = 12, `hoodFloorPromotePerCycle`, `hoodFloorSurfaceQuota`; `canonNeighborhoodLoader.js:357`) already draws the generic feeder heavier toward under-floor hoods. No accelerated mint, no authored anchors. Time fills them.
- **Status:** [x] ruled — nothing to build; readback = thin-hood counts rising across C108–C112 on the Monday slices.

### Task 7: One economic calculation per Cycle (engine.217)

- **Problem:** C107 ran the economy at Phase 6 and again inside Phase 8: the execution log records mood 54.01, then 59.01 (`output/execution_log_c107.txt:150`, `:168`). Phase 8 recalculates mood from the already-modified current value, so effects and neutral drift are applied twice (`phase06-analysis/economicRippleEngine.js:660-673`). A guard on ripple attribution only prevents duplicate ledger rows; it does not guard the calculation (`:234-243`, `:261-270`).
- **Precise cut:** remove `economicRippleEngine_` from the `v3Integration_` registry and execution list. Phase6-EconomicRipple remains the owner in both schedulers. Keep the compatibility wrapper callable, and preserve the other integration modules. No coefficient, neighborhood assignment, phase order, or ledger schema changes in this cut. This follows the existing Phase-8 duplicate-bond removal (`phase08-v3-chicago/v3Integration.js:104-106`, `:150-151`).
- **Files:** `phase08-v3-chicago/v3Integration.js`; `scripts/economicPhaseOwnership.test.js`; this plan, its `docs/index.md` entry, and ROLLOUT engine.217. Codex authors the regression and directs the substrate patch; engine-sheet applies and lands it.
- **Wiring card, manually verified against source:** production owns economy at `phase01-config/godWorldEngine2.js:412` and later invokes integration at `:520`; the second entry point repeats these at `:2156` and `:2265`. Integration's wrapper calls the same engine at `phase08-v3-chicago/v3Integration.js:36-38`; the removed registry entry and scheduled duplicate are at `:97` and `:140` in pre-cut commit `75b45b5b`. The engine calculates neighborhood economies and employment at `phase06-analysis/economicRippleEngine.js:263-267`; emits attribution through `recordRipple_` at `:246`; and publishes `S.neighborhoodEconomies` at `:871`. Intervening migration mutates city mood at `phase06-analysis/applyMigrationDrift.js:498` and neighborhood mood at `:531-538`; the second economy calculation also overwrote these neighborhood consequences. Required Haiku runs: `output/agent_engine-wiring_2026-09-14T05-37-42.md` (neighborhood path) and `output/agent_engine-wiring_2026-09-14T05-39-20.md` (economy/integration investigation, turn limit reached before its final card). The latter is incomplete; the verified pointers here supply the missing card rather than treating the harness completion signal as proof.
- **Regression:** `node scripts/economicPhaseOwnership.test.js` executes the actual scheduler call expressions, real economy, real intervening migration feedback, and real integration. Six scenarios cover both entry points and positive, negative, and recovery conditions across two Cycles. They compare mood, employment, neighborhood economies, ripple state, summary, random draws, attribution counts, and unrelated integration modules against one economic pass plus migration. All six fail before the patch (two calculations instead of one); all six pass after the cut. The final neighborhood mood must equal migration feedback's `afterMood`. Synthetic scenarios never reach external systems.
- **Readback declaration:** one economy completion per Cycle; the economic state after Phase6-Migration survives Phase 8 unchanged; independent contraction and expansion effects remain visible. C107's already-recorded values are not rewritten. Removing a second calculation can change final mood, employment estimates, narrative descriptors, and downstream random draws; equality with the duplicated result is not an acceptance criterion. No fire until engine-sheet supplies a baseline isolated from the unfinished engine.214 cut and Codex directs the comparison.
- **Next causal break, separate cut:** Phase 2 reads `S.neighborhoodEconomies` (`phase02-world-state/applyCityDynamics.js:98`), whose producer runs later in Phase 6; `finalizeCycleState_` carries city `econMood` and neighborhood dynamics but no neighborhood economies (`phase09-digest/finalizeCycleState.js:58`, `:94-103`). Reconnect only after the single-pass output and live range are verified. Media feedback also has two scheduled paths (`phase08-v3-chicago/v3Integration.js:42-44`, `:148`); inspect intervening inputs before changing its ownership.
- **Status:** [~] committed `9189addf`; Codex accepted two-Cycle sandbox proof at @33, C108–C109. Live deployment and further fires remain held. The bench-only diagnostic overlay is excluded from any future PROD candidate.
- **Bench acceptance, 2026-09-14 (codex):** Both repairs ran from C108 on PROD `c37d85ea` plus engine.217 and four engine.218 files; rejected engine.214 stayed excluded. Each Cycle reported economyRuns 1 and modules 5/5, with zero Engine_Errors. C108 money-loop mood was 59.01; final carry was 48. C109 read that exact 48, completed 133/133 phases successfully, and persisted 49 (Phase-6 completion 48.59). C108's Phase-6 completion was 48.81. Its response was truncated, so full timing and carry-recovery diagnostics are unavailable; no repeat fire was used to recover them. Source artifact manifest and current next work: [[../../output/codex/HANDOFF]]; partner results: `output/codex/bench-readback-c108-c109.md`. Codex independently verified typed Sheets and the full C109 JSON. This establishes scheduled ownership and the next-Cycle money-loop input, not per-hood carry or validation of every economic input.
- **Input findings to resolve before broader economic acceptance:** C108 persisted FACTORY_CLOSURE (impact -20) from `road closure decision`; the actual detector reproduces that classification because `economicRippleEngine.js:533-534` accepts any closure/shut down. Also, the Phase-1 loader restores previousCycleState/ripples (`loadPreviousEvening.js:259-261`) but Phase 6 initializes economicMood to 50 (`economicRippleEngine.js:157`, `:660`); Wealth separately reads the carried mood (`generationalWealthEngine.js:255-257`). The observed 59.01-to-48.81 difference is not proof of recurring -10 drift. Finally, calendar writes S.simMonth (`advanceSimulationCalendar.js:209`), while economy reads S.month (`economicRippleEngine.js:187`) and lowercase seasons despite persisted Winter. These are source-grounded follow-ups, not changes applied by engine.217. Trace typed event classification and intended carry/calendar contracts before proposing bounded fixes; preserve the existing signals.

---

## Watch List (found while measuring, not in scope)

- Holiday library mismatch: Laurel C107 carries "Hanukkah lights twinkling in windows" on MLK Day (`Holiday|source:holiday|auth:auto`). The holiday texture library is keyed loosely; one line, wrong month.
- `buildEveningFamous` / venues: every hood shows exactly 6 businesses on the ledger except Downtown 19, West Oakland 14, Baylight 12 — the 6 is a seed floor, so venue draws favour the three.

## Changelog

- 2026-09-14 (engine-sheet S461) — Next causal break 4 CUT as engine.219 `e31399b9` (hood economies carried under their own key `PREV_HOOD_ECON_JSON`, Phase-1 seed, producer untouched) with engine.223/223b `e8ac8b73`/`87744bd0` (carry-forward prop layer best-effort — the 9 KB cap could silently drop a Cycle); bench @36 C108–C109 on a fresh live-C107 resync: hood range 54–57 recorded, C109 Phase 2 opened on C108's set 22/22. PROD @88 pending the builder's go. engine.220 (media feedback duplicate) is next.
- 2026-09-14 (engine-sheet S461) — Input findings 1 and 3 CUT as engine.222 `8efb8ec4` (calendar writes `S.month`; economy + media compare a lowercase `seasonKey`; a closure files FACTORY_CLOSURE only when a business closed — typed domain first); bench @35 C108–C109 on a fresh live-C107 resync matched the pre-declared numbers; PROD @87. Task 7's economic-input list is closed; engine.219 (hood economic carry) is the next causal break.
- 2026-09-14 (engine-sheet S461) — Input finding 2 (prior mood vs Phase-6 initialization) CUT as engine.221 `a05aa6b1`: Phase 1 seeds `S.economicMood` from the carry, Phase 6 computes the level from base 50 and closes `econMoodInertia` (0.3) of the gap; bench @34 C108–C109 on a fresh live-C107 resync matched the pre-declared numbers (`output/engine-sheet/bench-readback-221-c108-c109.md`). Findings 1 and 3 are engine.222, next.
- 2026-09-14 (codex) — Accepted engine.217 C108–C109 bench proof; recorded capture limits and economic input findings; diagnostics bench-only, live/further fires/push held.
- 2026-09-14 (engine-sheet S459) — Task 6 ruled by the builder: the GC emergence gate fills the thin hoods; no build.
- 2026-09-14 (engine-sheet S459) — Task 7 / engine.217 bench-proven @33 C108–C109 (economyRuns 1, modules 5/5, money loop reads the carry); readback `output/codex/bench-readback-c108-c109.md`; PROD waits on codex.
- 2026-09-14 (codex) — Added Task 7 / engine.217 for the verified duplicate economy execution; recorded the failing regression, precise cut, wiring evidence, fire hold, and subsequent carry-path investigation.

- 2026-09-13 S456 — created after the C107 chain and the texture v1.1.0 cut; baseline measured; causes split three ways.
- 2026-09-14 S458 — Task 4 engine.214 cut: sheet-derived cluster membership + adjacency, all 22 hoods on their own dynamics track; test 20/20; bench fire waits on the live-C107 resync.
- 2026-09-14 S458 — Tasks 1 + 2 specs corrected from codex's review (`output/codex/pipeline69-plan-review.md`): exact-token tags, one shared name/metric boundary, Task 2 ownership by clause subject, package-only.
