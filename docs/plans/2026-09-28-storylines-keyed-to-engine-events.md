---
title: Storylines Keyed To Engine Events Plan
created: 2026-09-28
updated: 2026-10-08
type: plan
tags: [engine, media, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md engine.270
  - docs/plans/2026-09-28-storyline-tracker-retirement-ruling.md
  - live Storyline_Ledger audit 2026-09-28 (97 rows, C103–C108)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout, row engine.270"
  - "[[SIM_DOCTRINE]] — §15 a gate that can't fire is a trick; §16 a column that never moves is scenery"
  - "[[index]] — entry added in same commit"
---

# Storylines Keyed To Engine Events Plan

**STATUS (2026-10-08): BUILT, RUNNING, REVIEW 1 RULED — build queued for engine-sheet, not dispatched (es on a separate project, builder 2026-10-08).** Tasks 1–6 are live. Review 1 (2026-10-07) found six misalignments (§Review 1); the four calls on them were made 2026-10-08 (§Review 1 Disposition): fix D1 (Task 2 step 3 never built) and D2 (no age on first-seen entries), build Task 7 step 1, accept D3, release engine.20d. Task 7 step 2 and the reporter-chased storylines wait for the C113 read. The scorer rewire stays OPEN on the builder's word. Original ruling (2026-09-29): "the smart move is to see how this helps, and it does keep a history of engine events." See §Observation and review.

**Goal:** A storyline is an engine event that has its own ID and its own life span; the newsroom sees it with its stage, articles attach to its ID, and it closes when the engine ends it.

**Architecture:** A deterministic Node builder reads the engine's live state and emits a storyline registry into `desk_signal_c<N>.json`. The desk packet renders the registry as "running stories" with stage and age. An article is tagged with a registry ID by evidence (its assignment's engine ref), never by a model marker and never by who was quoted. `Storyline_Ledger` keeps its 12 columns; `StorylineId` holds the engine ID and `Status` follows the engine.

**Terminal:** engine-sheet

**Pointers:**
- Builder direction 2026-09-28: "the idea is sound, what we are trying to track likely is not defined or tracked with an ID"; "most reporting is reaction to a cycle"; "for this to be useful a cron would need to know what it is and how to use it."
- Measured defect: slug = `hood + first quoted citizen + signal kind` (`scripts/cron-desk-run.js` `citizenArcSlug`). 79/97 threads live one cycle; 58 are one article; `Closed` = 0 across 178 articles; POP-00170 sits on 24 threads.
- Worked example: `CRISIS-105-WESTOAKL` ("The West Oakland Crime Spike") ran C105 → resolved C109 in `Event_Arc_Ledger`; the newsroom filed 11 West Oakland threads in that window, none carrying the arc ID.

**Three buckets (the definition):**

| Bucket | What it is | Key | Tracked where |
|---|---|---|---|
| Storyline | engine event with a start and an end | crisis arc `CRISIS-105-WESTOAKL`; initiative STAGE `INIT-005:construction-active` | `Storyline_Ledger` |
| Citizen persistence | one citizen's own record | POPID | `LifeHistory_Log`, `Citizen_Media_Usage` (already exist — no build) |
| Cycle reaction | coverage of this cycle's signal | none | the article itself; no thread |

**Acceptance criteria:**
1. `desk_signal_c<N>.json` carries `storylines[]`; every entry has `id`, `name`, `type`, `stage`, `startCycle`, `age`, `hoods`, `status`, and the ID resolves to a live `Event_Arc_Ledger` arc or an `Initiative_Tracker` row.
2. Replayed against C105–C109 data, the registry shows `CRISIS-105-WESTOAKL` open at C105–C108 with its stage, and `closed` at C109.
3. An article whose assignment ref names a registry ID is written to the sidecar with that ID; an article with no engine ID writes no storyline line.
4. After a Saturday run, `Storyline_Ledger` rows with engine IDs have `Status` equal to the registry's status; a resolved arc reads `closed` with no writer action.
5. No new `hood-name-kind` slugs are minted. The 97 legacy rows stay on the tab as record and are no longer shown to writers.
6. The `THREAD-CLOSED:` model marker and its packet rule are removed.
7. Every registry entry has a ledger row whether or not anyone covered it; an uncovered storyline reads `Articles 0`.
8. An initiative stage storyline closes at the first Saturday run after the next fire that sees the stage change, and the new stage opens as its own row. *(Reworded 2026-10-08, builder-accepted at D3: the registry is built at the fire and the Saturday run reads that file, so the close lags a stage change by at most one cycle. Original wording: "first Saturday run after the stage changes".)*
9. First unattended proof: the weekday 06:15 desk run reads a `desk_signal_c109.json` rebuilt with the registry, and the Saturday run writes engine-keyed rows.

---

## Scope decisions

- **Phase 1 sources: crisis arcs and initiative stages.** An initiative is a standing part of the civic system, not a story — no `Initiative_Tracker` row holds a terminal status today, so an initiative-keyed storyline could never close (SIM_DOCTRINE §15). The STAGE is the story: `design-phase`, `construction-active`, `dispatch-live` each begin and end. Sports runs, weather fronts and chaos aftermath are later additions, each only when the engine gives it an ID and an ending.
- **Sports is out — builder ruling 2026-09-29.** Storylines are for crisis and civic. Team season phases were built and measured the same night (A's playoffs from C106, Oaks preseason from C102 resolve cleanly) and then pulled uncommitted: the sports feed already prints the season phase on every row and the sports desks already carry their own continuity, so a sports storyline tells a writer nothing new. Streaks are unusable as a unit regardless — the feed carries several different `Streak` values for one team in one cycle. Lifestyle, faith and fame signals are cycle reaction or a citizen's own record, not storylines.
- **Reporter-chased storylines are out of scope — a scope decision, flagged to the builder.** They need a reporter to name the story, and six cycles of slugs show the desks name the person quoted instead. Revisit after the registry has run four cycles.
- **No sheet schema change.** `Storyline_Ledger` stays 12 columns. No new tab.
- **No engine (Apps Script) change.** All state needed is already persisted: `Event_Arc_Ledger` (onset/peak/resolved rows), `Carry_Forward_Store` `PREV_CYCLE_STATE_JSON.crisisArcs` (live stage between those rows), `Initiative_Tracker`.
- **Existing rows stay.** They are the record of what was filed. No delete, no rekey.

## Tasks

### Task 1: Registry builder (pure function + loader)

- **Files:** `scripts/buildWorldSummary.js` — modify
- **Steps:**
  1. Add pure `buildStorylineRegistry({ arcRows, liveArcs, initiatives, cycle })` returning `[{ id, type, name, stage, status, startCycle, endCycle, age, hoods, ref }]`.
  2. Crisis: group `Event_Arc_Ledger` rows where `ArcId` starts `CRISIS-` and `CycleCreated` ≥ 103 by `ArcId`; `startCycle` = `CycleCreated`; `endCycle` = `CycleResolved`; `status` = `closed` when `CycleResolved` is set; `stage` from the matching `liveArcs` entry, else the latest row's `Phase`; `name` from `liveArcs[].name`, else the `Summary` prefix before ` — ` on a row that has one, else `<Neighborhood> crisis` (the onset row carries no name — measured on CRISIS-105-WESTOAKL).
  3. Initiative stage: one entry per `Initiative_Tracker` row; `id` = `<InitiativeID>:<ImplementationPhase>`; `name` = `<Name> — <stage>`; `status` = `open`. `startCycle` comes from the ledger row (the cycle the stage was first seen), not from the tracker. A ledger row whose `<InitiativeID>:<stage>` no longer matches the tracker's current stage is closed by Task 5.
  4. A closed entry stays in the registry for the cycle it closed and one more (so the ending gets covered), then drops.
  5. In `loadCycleData`, read `Event_Arc_Ledger`, `Carry_Forward_Store`, and reuse the existing `Initiative_Tracker` snapshot.
  6. In `emitDeskSignal`, attach `storylines` as a sibling of `lanes` (lanes are assignable cycle signals). Route each entry to desks by type: crisis → civic + the desk of its `DomainTag`; initiative stage → civic. `openThreads` and `openThreadEntries` are REMOVED — after Task 4 nothing consumes them, and showing writers two lists is worse than either. Bump `DESK_SIGNAL_VERSION` (no consumer checks it — grepped 2026-09-28).
- **Verify:** new test `scripts/storylineRegistry.test.js` with fixtures cut from live C105–C109 rows; AC 1 and 2 asserted.
- **Status:** [x] built 2026-09-28 (`f7249710`)

### Task 2: Lane entries carry the engine ID

- **Files:** `scripts/buildWorldSummary.js` — modify
- **Steps:**
  1. `initiative` and `vote` lane entries get `storylineId: <InitiativeID>:<ImplementationPhase>`.
  2. `rippleEntry` gets `storylineId` when `CauseId` equals a crisis arc ID (live: `crisis-event :: CRISIS-105-WESTOAKL`), or when `CauseType` is `initiative-implementation` and `CauseId` equals an initiative's full `Name` (live ripples carry the name, not the ID — verified untruncated 2026-09-28).
  3. Anomaly entries get `storylineId` when the pattern's `affectedEntities` or evidence names a registry arc ID.
- **Verify:** test asserts a C105 crisis ripple and an `initiative-implementation` ripple each resolve to the right ID; an unrelated `faith-event` ripple carries none.
- **Status:** [x] steps 1–2 built 2026-09-28 (`f7249710`). **Step 3 was never built (found 2026-10-08):** the anomaly loop in `buildWorldSummary.js` (~:1143) never calls `storylineRefTag`, and the ripple/initiative paths do. The stuck-initiative pattern for Fruitvale Transit Hub at C110 carries `affectedEntities.initiatives: ["INIT-003"]` and the live registry holds `INIT-003:design-phase`, yet the lane entry's ref reads `output/engine_audit_c110.json patterns[0]; evidence: Initiative_Tracker row(s) 4` with no tag. Open — queued, see §Review 1 Disposition (D1).

### Task 3: Packet shows running stories

- **Files:** `scripts/cron-desk-run.js`, `scripts/livedExperiencePacketV2.js` — modify
- **Steps:**
  1. `loadOpenThreads` → `loadStorylines`, reading `signal.storylines[desk]`.
  2. Packet section renders per entry: name, stage, "week N", hoods, and status. Closing entries read "ended this week".
  3. Remove the `threadRule` text and the "put ITS SLUG on your INTAKE STORYLINE line" instructions. The writer is told what is running; it is asked for nothing.
  4. `packet.signal.storylineId` is set from the assignment's lane entry (`story.storylineId`).
- **Verify:** `scripts/livedExperiencePacketV2.test.js` updated; packet for a fixture story with `storylineId` carries the ID and no marker rule.
- **Status:** [x] built 2026-09-28 (`f7249710`)

### Task 4: Tag by evidence, stop minting slugs

- **Files:** `scripts/cron-desk-writer.js`, `scripts/cron-desk-run.js` — modify
- **Steps:**
  1. `matchOpenThread` replaced by `storylineFor(packet)`: returns `{ slug: packet.signal.storylineId, verb }` or null. `verb` = `opened` when the ledger has no row for the ID, `closed` when the registry entry is closed, else `advanced`.
  2. `renderPacketIntake` writes the STORYLINE line only when `storylineFor` returns a value.
  3. `writeCitizenArc` stops writing `storyline` into `arc.json`; `citizenArcSlug` removed. `loadArcSeeds` already tolerates a missing `storyline`.
  4. `stripModelMetadataTail` keeps stripping a stray `THREAD-CLOSED:` line so an old-habit model output cannot leak into an article.
- **Verify:** `scripts/cron-desk-writer.test.js` updated — evidence-tagged article carries the ID; untagged article carries no STORYLINE line; a body quoting POP-00170 attaches to nothing on that basis.
- **Status:** [x] built 2026-09-28 (`f7249710`)

### Task 5: Ledger status follows the engine

- **Files:** `scripts/cron-saturday-run.js` — modify
- **Steps:**
  1. `stepSignals` loads the registry from `desk_signal_c<N>.json` and upserts EVERY registry entry, covered or not.
  2. `mergeStorylineLedger` takes the registry: for an engine-keyed row, `Status` = registry status and `FirstCycle` = registry `startCycle` when known; verbs still accumulate as coverage counts.
  3. A registry entry that closed with zero coverage still gets its row closed (status is the engine's, not the newsroom's).
  4. `Citizens` accumulates `role: quoted-source` and `role: subject` names only, not `mentioned` (the three role values the sidecars carry).
  5. An open ledger row keyed `<InitiativeID>:<stage>` whose stage differs from the tracker's current stage is set `closed`; the current stage is upserted as a new row.
  6. Storyline IDs are uppercase with a colon. `lib/articleIntake.js` STORYLINE parsing checks field count and verb only — no case or charset rule (read 2026-09-28).
- **Verify:** `scripts/cronSaturdayRun.test.js` — a closed registry entry closes its row with no `closed` verb present; a non-engine legacy row is left unchanged.
- **Status:** [x] built 2026-09-28 (`f7249710`)

### Task 6: Readers and docs

- **Files:** `scripts/buildDeskPackets.js` (`normalizeStorylineLedger`), `scripts/post-cycle-review.js`, `docs/engine/SHEETS_MANIFEST.md`, `docs/SPREADSHEET.md` — modify
- **Steps:**
  1. Readers surface engine-keyed rows; legacy rows are reported as a count only.
  2. Manifest and spreadsheet entries restate the contract: engine-keyed, status engine-owned, dormancy derived.
- **Verify:** `node scripts/run-tests.js`; `node scripts/buildWorldSummary.js` dry build for C109 produces a registry with seven initiatives and the C109-closed crisis.
- **Status:** [x] built 2026-09-28 (`f7249710`)

### Task 7: Attach pass on Saturday (builder suggestion 2026-09-28: "a cron that runs like Rhea that filters")

- **Why:** Task 4 tags only the article ASSIGNED from a storyline's signal. A culture piece set in West Oakland during the crisis, assigned from a hood signal, covers the same story and goes untagged.
- **Where:** `scripts/cron-saturday-run.js` — not the write gate. **Its own step `stepAttach`, run BEFORE `stepPublish`, writing into the staged sidecar's `intake.storylines` (§Review resolutions C3 overrides the earlier `stepSignals` placement).** Saturday already loads every staged sidecar, every arc seed and the registry; one function, full-week context, no per-wake cost, no new cron.
- **Steps:**
  1. Deterministic, zero model cost: an untagged article attaches to an open registry entry when its hood is in the entry's `hoods` AND its body prints the entry's `name`.
  2. Residue only — shares hood and cycle window, prints no name: one cheap-model yes/no with the entry's name, stage and the article body. Verdict and model recorded in `output/storyline_signal_c<N>.json`.
  3. The pass ATTACHES an article to an existing registry ID. It never creates an ID and never edits an article.
- **Verify:** run steps 1–2 over the staged C105–C108 West Oakland articles; report attach counts and step-2 verdicts before enabling on `--apply`.
- **Status:** step 1 (deterministic hood + printed-name attach) RULED 2026-10-08, queued for engine-sheet, not started. Step 2 (cheap-model yes/no on the residue) waits for the C113 read. Verify for step 1: run it over the staged C105–C110 civic articles and report attach counts before enabling on `--apply`; Firebrand C110 and Navarro C109/C110 are the known targets.

## Observation and review

**Hold (lifted 2026-10-08 for Task 7 step 1 only):** no new storyline source, no Task 7 step 2, no reporter-chased storylines until the C113 read is done. Step 1 does not change what writers see, so it does not disturb the "did writers use the running-story lines" read.

| When | Check | Reads |
|---|---|---|
| 2026-09-29 06:15 desk run (and each weekday after) | staged sidecars carry an engine ID in `intake.storylines`; none carries a `hood-citizen-kind` slug | `output/cron-compare/staged/*.json` |
| 2026-10-03 Saturday run | 8 engine-keyed rows land in `Storyline_Ledger`; `CRISIS-105-WESTOAKL` reads `closed`; 97 legacy rows unchanged | the tab; `output/storyline_signal_c109.json` |
| after the C110 fire 2026-10-04 | `Initiative_Tracker.ImplementationPhase` vs carry-forward `initiativePhases` — they disagreed at C109 on INIT-005 and INIT-006. Find which writer owns the column before a stage close is trusted | tracker tab; `Carry_Forward_Store` |
| week of 2026-10-05 — **REVIEW** | first read with the builder: did IDs attach, did rows land, did any stage close falsely, did the running-story lines show up in what writers wrote | all of the above. **READ 2026-10-07 — results in §Review 1.** The Saturday 2026-10-10 run adds a second ledger data point |
| after four cycles (C113) | how many storylines went uncovered (`Articles 0`), how many articles attached, whether writers used the running-story lines. Decides Task 7 step 2 and reporter-chased storylines. Read the attach counts knowing that movement-only seeding (engine.20d) thins initiative lanes from its landing cycle on | `Storyline_Ledger` |

**Update 2026-10-07 (Review 1, D5): the dead-path removal below already shipped as engine.268 (2026-10-04, `d9f13e8e`), and the rewire stays OPEN on the builder's word. The paragraphs below are the 2026-10-02 state.**

**Builder ruling, 2026-10-02 11:41 — the seed scorer.** "If the reporter needs a scorer we can rewire it to the new system and kill any old processes." So the question for the review is whether the reporter needs it — the reads above answer that (storylines left uncovered, whether writers used the running-story lines). What the scorer is today: `applyStorySeeds.js` scores every engine seed through `utilities/priorityEngine.js` (`computeArcMultiplier_`, `isConsequenceFloor_` — a seed on a storyline running 1+ Cycles ranks up to 1.6× and can be floored) and picks a byline through `utilities/bylineEngine.js` (`loadArcBinding_` — a storyline's reporter keeps it). All three were fed by `Storyline_Tracker` rows; since engine.266 they get an empty list and the tab is now deleted, so the boost is 1.0 and no byline is ever bound.

**The rewire is a design, not a swap — two prerequisites, neither built:**
1. *The engine has no registry.* The running-stories registry is built in Node after the fire (`buildWorldSummary.js` `buildStorylineRegistry` → `desk_signal_c<N>.json`). Its sources are the engine's own (`Event_Arc_Ledger` `CRISIS-*` arcs, `Initiative_Tracker` stages), so Phase 7 can rebuild the same entries from state it already holds — or the registry moves engine-side and Node reads it.
2. *A seed carries no engine reference.* `makeSeed` has `linkedStorylineId`, a `Storyline_Tracker` row number, always null now. A seed raised from a crisis arc or an initiative has to carry the registry ID (`CRISIS-<n>-<hood>`, `<InitiativeID>:<stage>`) at creation for anything to be looked up.

With both, `loadStorylineStateForSeed_` and `loadArcBinding_` are replaced by a lookup on the registry entry (age → `cyclesActive`; the arc's severity → `priorPeakSeverity`; the reporter who covered it last, from `Storyline_Ledger`, → the binding); the scoring functions keep their shape. **If the review says the reporter does not need it:** remove `parseStorylineRow_`, `loadStorylineStateForSeed_`, `loadArcBinding_`, `storylineRawData` and `linkedStorylineId`, keeping the four-argument signatures — `scripts/engine-auditor/routePatternSeeds.js` calls `computePriorityScore_` and `isConsequenceFloor_` from Node with nulls in those places. Left as it is until then: the dead path changes no score.

**What the ledger now is:** a history of engine events — one row per crisis arc and per initiative stage, with the cycle it started, the status the engine gave it, and the coverage it got.

## Review 1 — first read (2026-10-07, research-build with the builder)

**Builder's words (2026-10-07):** "the scorer rewire likely has some value so id keep that open but i cant quite recall why it was taken out, i think its mags chooses articles and that pushes their tier not grades? but good review, looks like alot of items are misaligned and arent likely to align by c113 and likely get worse, push back on that if im wrong, based on what is true in what I said should have this review provided as part of the plan, correct?"

**Scope of the read:** two cycles of feed (C109, C110) and ONE Saturday run (2026-10-03). Sources: `output/cron-compare/staged/*.json` + `.md` (37 civic/sports/culture/business articles, C109–C110), `output/cron-compare/*.state.json` (what each writer was shown), live `Storyline_Ledger` (105 rows) and `Initiative_Tracker`, `output/desk_signal_c110.json`, `output/storyline_signal_c109.json`, `scripts/cron-saturday-run.js` `mergeStorylineLedger` / `loadStorylineRegistry`, `scripts/buildWorldSummary.js` registry builder.

**The checks the Observation table set:**

| Check | Result |
|---|---|
| Staged sidecars carry an engine ID; no old-style slug | HOLDS for slugs: none minted since the build. 2 of 37 articles carry an ID (Carmen Delaine, `INIT-001:disbursement-active`, opened C109, advanced C110) |
| 2026-10-03 Saturday: 8 rows, crisis closed, 97 legacy unchanged | HOLDS. 105 rows = 97 + 8; `CRISIS-105-WESTOAKL` closed with Articles 0; legacy max LastCycle 108 |
| Any stage closed falsely | NONE. One real move: INIT-008 `announced` → `legislation-filed` (tracker, 2026-10-04, after the C110 build) |
| Running-story lines reached writers | YES for civic: all 8 civic packets at C110 carried the 8 lines. Sports, culture, business get none (the registry is civic-only by design). One piece used one: Freelance Firebrand C110 is built on the crisis ending and prints its registry name |
| Which writer owns `ImplementationPhase` | NOT TRACED this read. The 2026-09-28 mismatch did not recur: the C109 and C110 registries match the tracker for all seven initiatives |

**Findings. Drift column = what happens by C113 if nothing is done.**

| # | Finding | Evidence | Drift |
|---|---|---|---|
| D1 | **Coverage is undercounted, and the count that decides Task 7 is the biased one.** The ledger shows one covered storyline (INIT-001). Three pieces that plainly cover a storyline are untagged: Firebrand C110 (the crisis ending), Navarro C109 and C110 (Fruitvale Transit Hub, INIT-003). Tags ride on the assignment's ref; those assignments named no engine ID (not traced why). Only 19 of 171 C110 lane entries name an engine ID, all civic | staged sidecars `intake.storylines`; `Storyline_Ledger` rows; `desk_signal_c110.json` lanes | **Does not heal.** The C113 read counts `Articles 0` as uncovered. Of the 7 zero-article rows, at least 2 (the crisis, INIT-003) have untagged coverage, and INIT-008 is named in an untagged Firebrand C109 piece (depth not read). The count alone cannot decide Task 7 |
| D2 | **Every initiative reads "week 2".** `FirstCycle` is the cycle the stage was first SEEN (C109), not when it began; INIT-001 passed at C78. Writers were handed "Temescal Community Health Center — operational — week 2". The tracker has no phase-start column (`LastStageChangeCycle` is civic.38's Proposed/Standing field, a different thing). No article has repeated the wrong age yet | `buildStorylineRegistry` takes `startCycle` from the ledger row's `FirstCycle` (`buildWorldSummary.js` ~:850); `mergeStorylineLedger` never rewrites `FirstCycle` on update; `*.state.json` `runningStories` | **Gets worse, weekly, and is baked in.** The registry reads the age back from the ledger, so the error feeds itself; C113 prints "week 5" |
| D3 | **A stage change reaches the ledger one cycle late.** The registry is built at the fire; the Saturday run reads that file. INIT-008 moved after the C110 build, so Saturday 2026-10-10 still shows `announced` open and it closes 2026-10-17. INIT-009 and INIT-010 (proposed C110) are not running stories until the C111 build. AC 8 ("first Saturday run after the stage changes") is not met as built | `loadStorylineRegistry` reads `desk_signal_c<cycle>.json`; tracker vs `output/storyline_signal_c109.json` | **Bounded, constant, not worsening:** at most one cycle behind. Needs a decision (accept and reword AC 8, or read the live tracker in the Saturday step) |
| D4 | **The crisis half has never run live, and the initiative half is mostly static.** The only crisis arc was already resolved before the registry existed, so weakest assumption 2 (the between-milestone stage in `PREV_CYCLE_STATE_JSON.crisisArcs`) is untested. Seven of eight entries were unchanged C109 → C110; a standing initiative holds a phase for long stretches. A move rate cannot be measured (the tracker beat export has 3 commits of history; no phase-start column) | `desk_signal_c110.json` `storylines`; `git log` on `output/beats/Initiative_Tracker.jsonl` | **Static by nature.** Grows by one open row per new initiative stage; does not compound |
| D5 | **The scorer plan text is stale, and the rewire has no reader yet.** engine.268 cut the dead storyline plumbing on 2026-10-04 (`d9f13e8e`): `computeArcMultiplier_`, `loadStorylineStateForSeed_`, `loadArcBinding_` and the byline arc axis are gone; only the always-null seed field `linkedStorylineId` remains. No live score changed (the boost had read 1.0 since the tabs retired). A grep of the cron newsroom path (`newsroom-fanout.js`, `buildWorldSummary.js`) finds no reader of `PriorityScore` or `AssignedReporter`; they appear only in `applyStorySeeds.js`, `routePatternSeeds.js`, `validatePriorityEngine.js` | `[[2026-09-28-storyline-tracker-retirement-ruling]]` §The scorer cut; grep 2026-10-07 | Stale text only. The rewire's real blocker is a consumer, not the cut |
| D6 | **engine.20d and engine.270 run on different clocks.** engine.20d waits on "the engine.270 review (week of 2026-10-05)" so as not to muddy a four-cycle read; the four-cycle read is C113. At C109 seven initiative seeds fired and only INIT-001 moved | `[[2026-05-22-engine-regulatory-friction]]` Task 5 | A decision, not a drift |

**Builder's push-back question answered.** The builder is right on D1 and D2: they do not align by C113 and they worsen (D2 grows weekly; D1 makes the C113 count itself unreliable). D3 and D4 are bounded and do not compound. D5 and D6 are stale text and a clock to set, not drift. The crisis path (D4) is the one with no evidence either way.

**Scorer rewire — kept OPEN (builder 2026-10-07).** Why it was cut: not a verdict on its value. Its only input, `Storyline_Tracker`, was retired in engine.266, so the arc multiplier (up to 1.6x for a seed on a storyline running 1+ Cycles) and the byline arc binding (the reporter who covered it last keeps it) read an empty list on every live seed. engine.268 removed the dead reads; `git show d9f13e8e^` has the old code. On the builder's recollection ("Mags chooses articles"): the original binding rule WAS Mags's choice — `[[2026-05-07-engine-routing-foundation]]` Q6 binds on "Mags' actual published bylines, not Engine B candidates". "Tier, not grades" has no hit in that plan or the brain; left as the builder's recollection to confirm at design time. Two things have moved since: `/sift`, where Mags's pick order was recorded, left the chain at S456 (so T2.8's check against her picks and the binding source both need a new home), and the nearest live record of her picks is `output/edition_curation_c<N>.json` `selected`, a list of article IDs that carry the reporter slug (not verified to be usable as a binding source). Rewire still needs the two prerequisites above, plus a consumer for the score.

**Disposition (2026-10-08, research-build; advisor reviewed; the four calls were made to the builder in plain terms, the builder said to proceed). The code is engine-sheet's. QUEUED, NOT DISPATCHED: es is on a separate project (builder 2026-10-08), so this waits in the ROLLOUT queue rather than being sent.**

| # | Ruling | What es builds |
|---|---|---|
| D1 | **Traced.** The three untagged pieces all came from `anomaly` lane entries (`engine_audit` patterns), not from initiative or ripple entries. Navarro C110 is a Task 2 defect: its pattern is the stuck-initiative one for Fruitvale Transit Hub, carries `affectedEntities.initiatives: ["INIT-003"]`, and the registry holds `INIT-003:design-phase`, but Task 2 step 3 was never built (anomaly entries are never tagged). Firebrand C110 (a generic `strain` repeating-event pattern, assignment carries no crisis ID) and Navarro C109 (a city-level "no initiative addresses this" gap) name no engine event in the assignment, so Task 7 is their path as planned. | Build Task 2 step 3: an anomaly whose `affectedEntities.initiatives` names an initiative gets `storylineRefTag(<InitiativeID>:<stage from the tracker>)`; a pattern whose evidence names a `CRISIS-` arc ID gets that. Test: the C110 stuck-initiative pattern resolves to `INIT-003:design-phase`; a `strain` pattern carries none |
| D2 | Fix now. No stage-start source is filed (engine.20 Task 6 resets stuck clocks; it is not a start-cycle source) | Quick fix: the packet and the registry print no "week N" for an entry marked `firstSeen: true` (C2 already carries the flag). Then find a real stage-start source for the initiatives; do not mint a second clock if one exists. Also stop `mergeStorylineLedger` feeding the wrong `FirstCycle` back into the registry's `startCycle` |
| D3 | Accepted; AC 8 reworded (see Acceptance criteria 8) | Nothing |
| Task 7 step 1 | Build now: deterministic, zero model cost. Does not disturb the writers-use-the-lines read | Per Task 7, as its own `stepAttach` before `stepPublish` (C3). Verify over staged C105–C110 civic articles and report attach counts before `--apply` |
| Task 7 step 2, reporter-chased | Wait for the C113 read | — |
| D6 / engine.20d | Released from the engine.270 wait: the review week has passed. Not chained to Task 7 (Task 7 fixes undercounting, engine.20d lowers how many initiative articles exist; they do not depend on each other). The cut is spec only, no code exists. engine.20d is a ready row | See [[2026-05-22-engine-regulatory-friction]] §Task 5 |
| D4, D5 | No action. D5: plan text corrected by the 2026-10-07 update; the scorer rewire stays open on the builder's word | — |

## What was found (audit 2026-09-28, the reason for this plan)

Live `Storyline_Ledger`, 97 rows, C103–C108:

- `Closed` = 0 and `Referenced` = 0 across 178 articles. Writers were shown open threads (18 of 21 C108 packets) and the close rule; no draft ever carried a `THREAD-CLOSED:` line.
- The slug was `hood + first quoted citizen + signal kind` — who was quoted, not what happened.
- 79 of 97 threads lived one cycle; 58 were a single article; 18 spanned more than one cycle.
- 43 distinct kinds, nearly all signal classes: `anomaly` 12, `story-signal` 9, the `beat-*` family 20.
- 19 citizens anchored more than one thread (Melton Neilon 6, Martin Richards 6, Vinnie Keane 5). 6 groups were the same person + same kind under different hood prefixes; 5 groups were the same hood + kind opened the same cycle by different quoted citizens.
- `Citizens` collected every name in every article: POP-00170 sat on 24 threads, POP-00198 on 17, POP-00201 on 13, POP-00210 on 11.
- No thread carried the ID of the engine event it was about. The five `initiative` threads were named after the citizen quoted.
- Desks `undocked`, `wire`, `undocked-digest` fell to the civic lane.
- Of the 104 C109 lane signals, 13 belong to a storyline; 91 are cycle reaction.

## Builder direction, in order given

1. 2026-09-28 — "I would be curious how many of these stories are the same story just a different headline."
2. 2026-09-28 — "A lot of the reporting is reaction to a cycle, so when is [it] a genuine storyline and what's just a citizen's own tracked persistence? The idea is sound; what we are trying to track likely is not defined or tracked with an ID."
3. 2026-09-28 — engine arcs serve as the placeholder journalists write about; "for this to be useful a cron would need to know what it is and how to use it." Tool calls for crons: a place to visit, discussed separately.
4. 2026-09-28 — "Maybe a cron that runs like Rhea that filters stuff like this, unless there is a better way." → Task 7.
5. 2026-09-28 — "Use the advisor and codex for reviews and let's build a system that works."
6. 2026-09-29 — sports considered, then: "Maybe this is more for crisis and civic stuff." → sports out (§Scope decisions).
7. 2026-09-29 — "The smart move is to see how this helps, and it does keep a history of engine events." → hold and observe.
8. 2026-10-07 — see §Review 1 for the full quote: keep the scorer rewire open; the misalignments are not expected to align by C113 and will get worse; the review belongs in this plan.

## Deferred, not dropped

| Item | Waits on |
|---|---|
| Task 7 step 1 — Saturday attach pass before publish (deterministic) | RULED 2026-10-08, queued for engine-sheet |
| Task 7 step 2 — cheap-model yes/no on the residue | the four-cycle read (C113) |
| Reporter-chased storylines | the four-cycle read |
| Tool calls for crons (background lookups through the GodWorld MCP tools) | its own plan; not part of this one |
| Deleting the frozen `Storyline_Tracker` / `Storyline_Intake` tabs | DONE 2026-10-02 (engine.268, builder go) |
| Seed-scorer rewire to the registry (builder: keep open, 2026-10-07) | a consumer for the score, the two prerequisites in §Observation and review, and a new binding source (D5) |

## Review resolutions (2026-09-28)

Advisor review and codex review (`docs/research/2026-09-28-codex-storylines-plan-review.md`, 7 findings, each verified against code). These OVERRIDE the task text above where they differ.

| # | Finding | Resolution |
|---|---|---|
| C1 | `storylineId` field dies in `newsroom-fanout.js storyFromSeed` and in every beat-slice story replacement | No field is propagated. The ID rides inside the `ref` STRING, which every path already carries (`story.ref`). Task 2 writes it into the ref text (`CauseId CRISIS-105-WESTOAKL`, `InitiativeID INIT-005`). One resolver, `resolveStoryline(story, registry)` in `scripts/storylineRegistry` logic inside `buildWorldSummary.js` exports, is called at ONE place — the wake-3 packet build in `cron-desk-run.js` — and matches `story.ref` against registry IDs and initiative IDs. A beat-slice story whose ref names no engine ID stays untagged; Task 7 is its path |
| C2 | initiative stage `startCycle` has no source on first build | One fire and one Saturday run per cycle, so the ledger is observed once per cycle. `FirstCycle` = the cycle the stage was first OBSERVED; rows created at rollout are first-seen, not true starts, and the registry marks them `firstSeen: true`. Close cycle = the first cycle the tracker's stage differs from the open row. AC 8 reads "closes at the first Saturday run after the stage changes" |
| C3 | Saturday attach in `stepSignals` runs after publish and sweep | Task 7 becomes its own step `stepAttach`, run BEFORE `stepPublish`; it writes the storyline into the staged sidecar's `intake.storylines`, so publish, sweep and signals all see it. It never touches article text |
| C4 | writer cannot know `opened` / `advanced` / `closed` | The registry entry carries `status` and `hasLedgerRow`; the resolver returns the whole entry and the packet carries it as `packet.signal.storyline`. Verb: `closed` if `status` is closed, else `opened` if `!hasLedgerRow`, else `advanced` |
| C5 | registry-only upsert would refresh `LastCycle` forever | `LastCycle` means last COVERAGE cycle. A registry upsert with no articles leaves it untouched; a new uncovered row writes it blank |
| C6 | `buildDeskPackets.js normalizeStorylineLedger` no longer exists | Task 6 file list is `scripts/post-cycle-review.js`, `scripts/queryLedger.js`, `docs/engine/SHEETS_MANIFEST.md` (stale adapter pointer at :74), `docs/SPREADSHEET.md` |
| C7 | `citizenArcSeed.test.js` asserts the old `storyline` field | Test updated in Task 4: a quote pass alone no longer counts as storyline coverage, and the test asserts that |
| A2 | uncovered storylines never reach the ledger | every registry entry is upserted (AC 7) |
| A3 | two lists shown to writers | `openThreads` removed (Task 1.6) |

## Weakest assumptions (attack these first)

1. **The assignment's lane entry survives to the writer with `storylineId` intact.** The angle stage rewrites stories; if it drops unknown fields, Task 3.4 tags nothing. Trace one story object from `loadLane` to `packet` before writing Task 3.
2. **`PREV_CYCLE_STATE_JSON.crisisArcs` holds the between-milestone stage.** It read `[]` at C109 because the only arc had resolved. Confirm against a bench cycle with a live arc.
3. **Initiative stages actually move.** One move is on record in carry-forward state at C109 (`INIT-005 → construction-active`). If stages move less than once per several cycles, stage storylines sit open for a long time — measure the move rate from `Event_Arc_Ledger` / civic logs before trusting it.

## Open for the builder

- Reporter-chased storylines are deferred (scope decision above).
- Whether an initiative itself should ever end is a civic-design question; this plan does not depend on it.

## Changelog

- 2026-09-28 — created (engine-sheet, S503).
- 2026-09-28 — advisor + codex review folded in (§Review resolutions).
- 2026-09-28 — Tasks 1–6 built (`f7249710`). Real generator path run against live C109: registry 8 entries, 104/104 lane entries unchanged apart from the storyline tag, 20 refs tagged. C109 signal activated with the registry only (lanes and refs left as assigned this week). Registry stage source is the fire-time `engine_audit` snapshot; a stage civic moves mid-week is seen at the next cycle's build.
- 2026-09-28 — **post-fire check for C110 (2026-10-04):** fire-time snapshot held `INIT-006 construction-planning` while the live tracker read `construction-active`, and carry-forward `initiativeEnginePhaseMoves` named `INIT-005 → construction-active` while the tracker reads `operational`. Confirm which writer owns `ImplementationPhase` before trusting a stage close; a backward stage move would reach writers as a story ending.
- 2026-09-29 — sports storylines built, measured and pulled uncommitted on builder ruling; storylines are crisis and civic.
- 2026-09-29 — status set to under observation, review due the week of 2026-10-05; audit findings and builder direction moved here from the ROLLOUT row.
- 2026-10-07 (research-build) — Review 1 read C109–C110 with the builder: six findings D1–D6, scorer rewire kept open; nothing fixed, no row edited.
- 2026-10-08 (research-build) — Review 1 ruled; build queued for es, not dispatched. Detail in §Review 1 Disposition.
