---
title: Storylines Keyed To Engine Events Plan
created: 2026-09-28
updated: 2026-09-29
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

**STATUS (2026-09-29): BUILT, RUNNING, UNDER OBSERVATION — review due the week of 2026-10-05.** Tasks 1–6 are live. Nothing more is built until the review. Builder ruling: "the smart move is to see how this helps, and it does keep a history of engine events." See §Observation and review.

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
8. An initiative stage storyline closes at the first Saturday run after the initiative's stage changes, and the new stage opens as its own row.
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
- **Status:** [x] built 2026-09-28 (`f7249710`)

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
- **Where:** `scripts/cron-saturday-run.js` `stepSignals` — not the write gate. Saturday already loads every staged sidecar, every arc seed and the registry; one function, full-week context, no per-wake cost, no new cron.
- **Steps:**
  1. Deterministic, zero model cost: an untagged article attaches to an open registry entry when its hood is in the entry's `hoods` AND its body prints the entry's `name`.
  2. Residue only — shares hood and cycle window, prints no name: one cheap-model yes/no with the entry's name, stage and the article body. Verdict and model recorded in `output/storyline_signal_c<N>.json`.
  3. The pass ATTACHES an article to an existing registry ID. It never creates an ID and never edits an article.
- **Verify:** run steps 1–2 over the staged C105–C108 West Oakland articles; report attach counts and step-2 verdicts before enabling on `--apply`.
- **Status:** [ ] not started — after Tasks 1–6

## Observation and review

**Hold:** no new storyline source, no Task 7, no reporter-chased storylines until the review below is done.

| When | Check | Reads |
|---|---|---|
| 2026-09-29 06:15 desk run (and each weekday after) | staged sidecars carry an engine ID in `intake.storylines`; none carries a `hood-citizen-kind` slug | `output/cron-compare/staged/*.json` |
| 2026-10-03 Saturday run | 8 engine-keyed rows land in `Storyline_Ledger`; `CRISIS-105-WESTOAKL` reads `closed`; 97 legacy rows unchanged | the tab; `output/storyline_signal_c109.json` |
| after the C110 fire 2026-10-04 | `Initiative_Tracker.ImplementationPhase` vs carry-forward `initiativePhases` — they disagreed at C109 on INIT-005 and INIT-006. Find which writer owns the column before a stage close is trusted | tracker tab; `Carry_Forward_Store` |
| week of 2026-10-05 — **REVIEW** | first read with the builder: did IDs attach, did rows land, did any stage close falsely, did the running-story lines show up in what writers wrote | all of the above |
| after four cycles (C113) | how many storylines went uncovered (`Articles 0`), how many articles attached, whether writers used the running-story lines. Decides Task 7 and reporter-chased storylines | `Storyline_Ledger` |

**For the review (raised by the builder 2026-10-02, after the old tabs were deleted):** the engine's seed scorer still carries a storyline boost and an arc-bound byline (`applyStorySeeds.js` → `priorityEngine.js` `computeArcMultiplier_` / `isConsequenceFloor_`, `bylineEngine.js` `loadArcBinding_`) that read `Storyline_Tracker` rows and now get an empty list every Cycle. The builder leans toward keeping the idea — "how else would the journalist know" — and the journalist's knowing is what this plan's running-stories lines already deliver. The question for the review is the other half: should a seed tied to a running story in this registry rank higher and keep its reporter? If yes, the scorer reads the registry (engine ID, stage, age) in place of the deleted tab; if no, the dead scoring code is removed. Not built before the review (the hold above).

**What the ledger now is:** a history of engine events — one row per crisis arc and per initiative stage, with the cycle it started, the status the engine gave it, and the coverage it got.

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

## Deferred, not dropped

| Item | Waits on |
|---|---|
| Task 7 — Saturday attach pass before publish | the four-cycle read |
| Reporter-chased storylines | the four-cycle read |
| Tool calls for crons (background lookups through the GodWorld MCP tools) | its own plan; not part of this one |
| Deleting the frozen `Storyline_Tracker` / `Storyline_Intake` tabs | engine.268, builder go |

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
