# Adversarial Review — `engine-sheet` ROLLOUT Stale Check (`2026-10-28`)

- **Reviewed file:** `output/engine-sheet/2026-10-28-rollout-stale-check.json:1-33`
- **Target surface:** `docs/engine/ROLLOUT_PLAN.md:70-172` (`live-observing` and `ready` tables)
- **Reviewer:** `antigravity`
- **Date:** `2026-10-28`
- **Mode:** Read-only verification against code, plans, execution logs, deploy history, and cron outputs (`HEAD` at `db5224ca`)

---

## Executive Summary (Verdict Scorecard)

Out of **23 rows** audited in `output/engine-sheet/2026-10-28-rollout-stale-check.json`:

- **4 verdicts or sub-claims are WRONG:**
  1. **`pipeline.77` (`observing_rows` `:29`, verdict `"DUE TONIGHT"`):** **WRONG.** The Wednesday 2026-10-28 18:15 fan-out already ran and appended lines 14–20 to `output/cron-compare/reward-loop-c113.jsonl:14-20` (20 lines total, not 13). Noah Tan (`:15`, `score: 4`, `rheaPass: true`, `words: 602`), Elliot Marbury (`:16`, `score: 4`, `rheaPass: true`, `words: 699`), and Tanya Cruz (`:17`, `score: 4`, `rheaPass: true`, `words: 204`, clearing the 150-word floor after 111w in C111 and 84w in C112) all completed C113 at 4/4. All 5 watched seats scored **4.00/4.00** at C113; the two-week watch is **COMPLETE (`READ OWED`)**, not `"DUE TONIGHT"`.
  2. **`engine.201` (`observing_rows` `:19`, verdict `"CLOSE?"`):** **WRONG (`CLOSE?` still has open work).** `output/engine201/cohort-c113.json` was resnapped on 2026-10-26, but the 4-cycle fixed-cohort causal trace (`C110→C113`, `condition → personal response → persistent change → different later choice`) required by `docs/plans/2026-09-10-inactivity-is-regression.md:355,359,365,469` does **not** exist anywhere in `docs/` or `output/`. Closing `engine.201` now drops its sole acceptance deliverable.
  3. **`engine.41` (`ready_rows` `:6`, verdict `"OPEN on Wire 1b, STALE on Wire 3"`):** **WRONG on Wire 1b.** Wire 1b (`SuggestedCitizenVoices` column on `Story_Seed_Deck`, `docs/plans/2026-06-24-engine-output-canon-coverage.md:59-70`) targets the retired v3 `S.storySeeds` loop in `phase07-evening-media/applyStorySeeds.js:1360-1375`, which is explicitly marked `DECK-DEAD` at `applyStorySeeds.js:1406-1410` and ignored by `phase10-persistence/saveV3Seeds.js:24-29`. Furthermore, the live v4 `Story_Seed_Deck` writer (`phase07-evening-media/buildContractSeeds.js:196-228,438,470-471` → `saveV3Seeds.js:94,122-123`) **already** populates `Citizens` (col I) and `CitizenEvents` (col J) on `chaos-event` seeds. Adding a col S `SuggestedCitizenVoices` would duplicate col I `Citizens`.
  4. **`engine.280` (`ready_rows` `:10`, `proposed` claims `"C10 upset-sign ruling"` is open):** **WRONG on C10 and row state.** C10 (`engine.203d` upset-sign after a won title, `docs/research/2026-10-02-engine-208-fandom-dial-read-before.md:163`) was ruled by the builder on 2026-10-07 (`docs/plans/2026-09-11-sports-as-a-lived-system.md:418`), built and benched by `engine-sheet` on 2026-10-11 in commits `38f19986` and `e34c8b19` (`2026-09-11-sports-as-a-lived-system.md:420`), and verified live at C113 (`output/engine_review_c113.md:44`). The 5th item in `Status log :233` (`setupSportsFeedValidation` dropdown refresh) is also already shipped (`a4cb20df` / PROD `f57439e2`, `docs/reference/DEPLOY_HISTORY.md:464-465`). Because the 4 remaining follow-ups are all gated on unbuilt upstream signals, `engine.280`'s state is `blocked`, not `ready`.

- **1 `observing_rows` sub-claim is STALE/WRONG:**
  5. **`engine.95` (`observing_rows` `:23`, `open` claims `"live checkpointSaveMs not read (code default 0 = gate disarmed; row says 6000)"`):** **WRONG.** The tail-budget finding holds (`C112` tail = `80,639 ms`, `C113` tail = `59,805 ms` vs `tailReserveMs = 60000`), but `checkpointSaveMs = 6000` was already hand-written to live `World_Config` rows 199–204 and verified by `engine-sheet` on 2026-10-09 (`docs/reference/DEPLOY_HISTORY.md:448-450`: `"World_Config rows 199–204 wallBudgetMs 330000, tailReserveMs 60000, checkpointSaveMs 6000 ... The gate is ARMED from C111"`). `ensureEngine95Config_` (`phase01-config/engine94SheetContract.js:368-395`) only appends missing keys and never overwrites existing sheet rows.

- **7 verdicts HOLD but omit material scope-collapse, mechanism, or pointer findings:**
  - `engine.204` / `engine.205` / `engine.281` (+ `engine.202`): 4 `ready` rows represent **one** remaining build (`engine.204`); `engine.202` is 100% done/subsumed, and `engine.205` + `engine.281` have zero independent work left outside `engine.204`.
  - `civic.24`: Plan `docs/plans/2026-08-16-city-hall-nine-seat-table.md:308` already marks Task 9 `[x]`; the stale `"--apply stays off"` lines are `:30`, `:43`, and `:114`.
  - `engine.248`: Live `processFaithJoins_` (`phase05-citizens/bondEngine.js:1011,1096`) mutates `Faith_Organizations` via direct `.getRange(...).setValue(...)` in Phase 5 (bypassing Phase 10 intents), and the 16 faith leaders (`POP-00753..00768`, `docs/research/2026-09-10-kimi-faith-lane-routing.md:143`) remain unseeded in `MembersList`.
  - `engine.296`: `SPORTS_LEGENDS` in `phase07-evening-media/buildEveningFamous.js` is only drawn during a **playoff or championship** week (`docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:75,82`). C113 was regular-season Oaks Week 2 / A's off-season, so `engine.296` is an **Organic** wait for playoffs, not a missed C113 fire check.
  - `engine.197`: `output/execution_log_c113.txt:231` already proves `compressLifeHistory_ v3.0` drained `reflections 194/118 citizens` at C113; only the review writeup and Mags `POP-00005` `DialState` spot-check are missing from `output/engine_review_c113.md`.
  - `engine.290`: The `"Trevor's slice first live read"` half of the row already has `output/cron-compare/transit_slice_c112.json`, `transit_slice_c113.json`, and Trevor's 4/4 C113 run (`output/cron-compare/reward-loop-c113.jsonl:3`) on disk.
  - **Filter blind spot:** 5 `ready` rows in `docs/engine/ROLLOUT_PLAN.md` (`engine.193` `:117`, `engine.116` `:130`, `engine.202` `:132`, `infrastructure.13` `:146`, `engine.317` `:149`) have a blank `Terminal` cell (`| ready |  |`) and were omitted from `2026-10-28-rollout-stale-check.json` despite touching `engine-sheet` scope.

- **11 verdicts HOLD cleanly as written:**
  - `ready_rows`: `engine.27`, `infrastructure.6`, `engine.20d`, `engine.261`, `engine.303`
  - `observing_rows`: `engine.318`, `engine.214`, `engine.301`, `pipeline.74`, `pipeline.75` (plus `engine.197` as `READ OWED`)

---

## Part 1 — `ready_rows` Audit (12 rows)

### 1. `engine.204` (`2026-10-28-rollout-stale-check.json:2`)
- **`engine-sheet` verdict:** `OPEN, not stale`
- **Review verdict:** **HOLDS — with missing scope-collapse finding on `engine.202`**
- **Verified evidence:**
  - Builder ruling on `2026-10-22` (`docs/research/2026-10-03-engine-204-205-game-day-economy-read-before.md:200-202`, commit `40e34826`) set the 4-item build scope (`Sports_Feed` `WeekRecord` + `EventTrigger` hook table + `HomeNeighborhood` removal + `SportsIntakeWorkspace.jsx` `WeekRecord` input).
  - `phase02-world-state/applySportsSeason.js:196,251` still reads `e.HomeNeighborhood`.
  - `dashboard/src/components/SportsIntakeWorkspace.jsx:17-27,29-50` has no `WeekRecord` field and still carries dead `VideoGameDate` / `VideoGame` fields at `:38-39`.
- **What is missing (`engine.202` at `docs/engine/ROLLOUT_PLAN.md:132`):**
  - `engine-sheet` notes that unowned `engine.202` (`"Sports WeekRecord: trigger-word hooks, dashboard input (3b), 3c"`) "overlaps." In fact, `engine.202` has **zero** remaining independent scope: per `docs/plans/2026-09-11-sports-as-a-lived-system.md:386-388`, `3c(a)` shipped in `0f4d5014`, `3c(b)` was superseded by the sixth-block lens ruling, `3c(c)` shipped in `0f4d5014`, `3d` (17 `EventType` values) shipped, and `3b` + remaining `EventTrigger` hooks were folded into `engine.204` (`40e34826`). `engine.202` is 100% done/subsumed by `engine.204`.

### 2. `engine.205` (`2026-10-28-rollout-stale-check.json:3`)
- **`engine-sheet` verdict:** `OPEN, text stale`
- **Review verdict:** **HOLDS — with duplicate-row finding**
- **Verified evidence:**
  - The weekly game-day economy (`applySportsSeason.js:116-309` → `S.hoodGameEconomy` → `cityDynamics.js:158` / `economicRippleEngine.js:230-260`) is in `HEAD` and is an ancestor of PROD `a4c19b6c` (`f2a61e5e`, `docs/reference/DEPLOY_HISTORY.md:469-474`, which omitted naming `205` and `281`).
  - Only the `HomeNeighborhood` removal in `applySportsSeason.js:196,251` remains, which is Item 3 of `engine.204` (`docs/research/2026-10-03-engine-204-205-game-day-economy-read-before.md:201,299`).
- **What is missing:** Keeping `engine.205` (`docs/engine/ROLLOUT_PLAN.md:114`) as a separate `ready` row when its sole remaining edit is already inside `engine.204` duplicates the same work item.

### 3. `engine.281` (`2026-10-28-rollout-stale-check.json:4`)
- **`engine-sheet` verdict:** `OPEN, item (e) only`
- **Review verdict:** **HOLDS — with duplicate-row finding**
- **Verified evidence:**
  - Items `(a)`–`(d)` shipped in `aa2eac7f`, `e8b3d9a2`, `a0ccd111`, `debf1afd`, and `78a9e36e` (all ancestors of PROD `a4c19b6c`, `docs/reference/DEPLOY_HISTORY.md:469-474`) and are marked `DONE` in `docs/plans/2026-09-11-sports-as-a-lived-system.md:465-470`.
  - Item `(e)` (`applySportsSeason.js:196,251` `HomeNeighborhood` fallback removal) is explicitly documented at `docs/research/2026-10-03-engine-204-205-game-day-economy-read-before.md:299` as `"the same work as the held engine.204/205 removal; folded into that review"`.
- **What is missing:** Together, `engine.204` (`:113`), `engine.205` (`:114`), `engine.281` (`:115`), and `engine.202` (`:132`) are 4 `ready` rows tracking a single build (`engine.204`).

### 4. `civic.24` (`2026-10-28-rollout-stale-check.json:5`)
- **`engine-sheet` verdict:** `OPEN, plan stale`
- **Review verdict:** **HOLDS — with precision correction on `proposed`**
- **Verified evidence:**
  - Task 10 (`City_Hall_Ledger` tab, `docs/plans/2026-08-16-city-hall-nine-seat-table.md:315-318`) is unbuilt (`0` hits for `City_Hall_Ledger` in `schemas/SCHEMA_HEADERS.md`, `phase*/`, or `scripts/`).
  - Crontab lines 37–38 run `scripts/cron-civic-run.js --stage=chain --apply`, and `output/cron-civic/close_c111.json:33`, `close_c112.json:34`, and `close_c113.json:33` all record `"applied": true`.
- **Precision correction on `proposed`:**
  - `engine-sheet` proposes: `"update plan Task 9 + --apply note"`. In fact, `docs/plans/2026-08-16-city-hall-nine-seat-table.md:308` **already** marks Task 9 `[x] 2026-08-29 (grok)` and already notes `"Crontab still carries --apply (civic.15 flip)"`. The stale lines in the plan that contradict `:308` and live crontab are `:30` (`"civic.15 --apply stays off"`), `:43` (Acceptance 4: `"civic.15 --apply is still absent from crontab"`), and `:114` (`"Crontab: still --stage=chain with no --apply"`).

### 5. `engine.41` (`2026-10-28-rollout-stale-check.json:6`)
- **`engine-sheet` verdict:** `OPEN on Wire 1b, STALE on Wire 3`
- **Review verdict:** **WRONG on Wire 1b (Wire 1b is also deck-dead / superseded by v4 contract seeds)**
- **Verified evidence:**
  - `engine-sheet` rightly catches that Wire 3a is `DONE` (`a5b03e96`), Wire 3b is `SUPERSEDED` (`docs/plans/2026-06-24-engine-output-canon-coverage.md:208,214`), and `Story_Seed_Deck` is 18 columns A–R (`schemas/SCHEMA_HEADERS.md:451`, `phase10-persistence/saveV3Seeds.js:94`), not 14.
  - **What `engine-sheet` missed on Wire 1b:**
    1. Wire 1b (`docs/plans/2026-06-24-engine-output-canon-coverage.md:59-70`) specifies modifying the Wire 1 loop in `phase07-evening-media/applyStorySeeds.js` (`:1360-1375`) to attach `suggestedVoices` to `S.storySeeds` and write a new `SuggestedCitizenVoices` column on `Story_Seed_Deck`.
    2. That entire `S.storySeeds` loop in `applyStorySeeds.js` is **deck-dead**: `applyStorySeeds.js:1406-1410` carries an explicit `DECK-DEAD (2026-09-20)` header, and `phase10-persistence/saveV3Seeds.js:24-29` no longer writes `S.storySeeds` to `Story_Seed_Deck`.
    3. The live v4 `Story_Seed_Deck` pipeline (`phase07-evening-media/buildContractSeeds.js` → `saveV3Seeds.js:34-53,94,114-133`) **already has** `Citizens` (col I, `POPID Name` list) and `CitizenEvents` (col J).
    4. When a citizen consequence chaos hit (`phase04-events/chaosCarsEngine.js:822-836`) and a business/neighborhood chaos hit (`chaosCarsEngine.js:844-858`) fire in the same cycle and neighborhood, `buildContractSeeds.js:438,470-471` clusters them under `chaos-event|<hood>` and `contractSeedPickCitizens_` (`buildContractSeeds.js:196-228`) populates col I `Citizens` + col J `CitizenEvents` from the seed's POPIDs first and then from neighborhood `LifeHistory_Log` rows (which include non-consequence citizen chaos hits written at `chaosCarsEngine.js:594-597`).
    5. Adding col S `SuggestedCitizenVoices` to `Story_Seed_Deck` would duplicate col I `Citizens`. The only unbuilt gap in the live v4 pipeline is that `CONTRACT_SEED_EVENT_HINTS` (`buildContractSeeds.js:139-147`) lacks a `'chaos-event'` regex entry to prefer `chaos_cars` `LifeHistory_Log` lines over generic neighborhood lines when filling `Citizens` on a business/neighborhood-only chaos seed. (Also note: `docs/plans/2026-06-24-engine-output-canon-coverage.md:127` marks Wire 2 `DONE` in `applyStorySeeds.js:1378-1403`, which is likewise deck-dead; live `Class=texture` rows come from `buildContractSeeds.js:576`.)

### 6. `engine.27` (`2026-10-28-rollout-stale-check.json:7`)
- **`engine-sheet` verdict:** `OPEN, accurate`
- **Review verdict:** **HOLDS**
- **Verified evidence:**
  - `docs/plans/2026-05-26-engine-27-wd-card-auto-invalidation.md:220-333` Tasks B1–B4 and C1–C3 are `[ ] not started`.
  - `logs/wd-cards-daemon-out.log` tick `#9117` (`2026-10-28T19:39:11`) shows the daemon running cleanly (`failures:0`), while `ecosystem.config.js:68` still carries the stale comment `// NOT auto-started — enable after initial queue drain + validation`.

### 7. `infrastructure.6` (`2026-10-28-rollout-stale-check.json:8`)
- **`engine-sheet` verdict:** `OPEN, row accurate, plan stale`
- **Review verdict:** **HOLDS**
- **Verified evidence:**
  - `dashboard/` has `0` references to `sim-health`.
  - `docs/plans/2026-07-31-engine-observability-integrity.md:32,61,67,73,93,108` still marks `Health_Cause_Intake` as `PENDING CREATE`, whereas commit `1240a80a` (`2026-09-21`) retired it in favor of `HealthCause` on `Advancement_Intake`.
  - `docs/engine/ROLLOUT_ARCHIVE.md:2014` (`infrastructure.6` — `Moltbook heartbeat switch`) confirms the historical ID collision.

### 8. `engine.20d` (`2026-10-28-rollout-stale-check.json:9`)
- **`engine-sheet` verdict:** `OPEN, accurate`
- **Review verdict:** **HOLDS**
- **Verified evidence:**
  - `scripts/buildWorldSummary.js:1243-1250` unconditionally pushes `kind: 'initiative'` for every `initiatives` row without checking `isDepartmentRow_` (drifted from `~line 1195` cited in `docs/plans/2026-05-22-engine-regulatory-friction.md:106-110`).

### 9. `engine.280` (`2026-10-28-rollout-stale-check.json:10`)
- **`engine-sheet` verdict:** `OPEN, text stale` (`proposed`: `"reword row to the four follow-ups + C10 upset-sign ruling, pointer to research doc Status log :229-233"`)
- **Review verdict:** **HOLDS on §2.9 being done, but WRONG on C10 and WRONG on row state**
- **Verified evidence:**
  - §2.9 (`Sports_Feed` `AttendanceMood` / `Result` / `Streak` → `S.sportsCrowdMoment` / `S.sportsStreakLift`) shipped in `e8b3d9a2` (`phase02-world-state/applySportsFeedTriggers.js:132-160`, `phase05-citizens/generateGameModeMicroEvents.js:482-498`).
  - **Why `proposed` is wrong on C10:** `C10` (`engine.203d` upset-sign after a won title, `docs/research/2026-10-02-engine-208-fandom-dial-read-before.md:163`) is **NOT open**. The builder ruled it on `2026-10-07` (`docs/plans/2026-09-11-sports-as-a-lived-system.md:418`), `engine-sheet` built and benched it on `2026-10-11` in commits `38f19986` and `e34c8b19` (`2026-09-11-sports-as-a-lived-system.md:420`), and `output/engine_review_c113.md:44` confirmed it live at C113 (`DONE`).
  - **What else is already done in `Status log :229-233`:** The 5th bullet at `docs/research/2026-10-02-engine-208-fandom-dial-read-before.md:233` (`setupSportsFeedValidation` dropdown refresh after 208 deploy) also shipped in `a4cb20df` / PROD `f57439e2` (`docs/reference/DEPLOY_HISTORY.md:464-465`).
  - **Why the row state (`ready`) is wrong:** All 4 remaining follow-ups at `2026-10-02-engine-208-fandom-dial-read-before.md:229-232` (`Sports-Soured`, `Sports-Lifted`, `Sports-Gutted`, `Sports-Attended`) are explicitly blocked on unbuilt upstream signals (`PerPieceCoverageTone`, roster negative flag, ECL attendance tag). The row state in `ROLLOUT_PLAN.md:164` should be `blocked`, not `ready`.

### 10. `engine.248` (`2026-10-28-rollout-stale-check.json:11`)
- **`engine-sheet` verdict:** `PARTLY STALE`
- **Review verdict:** **HOLDS — with two additional code/data findings**
- **Verified evidence:**
  - `processFaithJoins_` (`phase05-citizens/bondEngine.js:326,997-1100`, commit `a167d3d4`) and `S.faithExposures` (`phase05-citizens/generateCitizensEvents.js:3717-3722`) are live in `HEAD` and PROD `a4c19b6c`.
  - `output/beats/Faith_Organizations.jsonl` already has 13 citizen POPIDs across 6 congregations in `MembersList`, and `scripts/buildFaithSlice.js:113-115` reads `MembersList` onto the faith slice.
- **What is missing:**
  1. **Phase-5 direct-write violation:** `phase05-citizens/bondEngine.js:1011,1096` mutates `Faith_Organizations` directly during Phase 5 via `faithSheet.getRange(1, membersCol).setValue('MembersList')` and `faithSheet.getRange(r + 1, membersCol).setValue(...)` instead of queuing a Phase 10 write intent.
  2. **16 faith leaders still unlinked:** The 16 canon faith leaders (`POP-00753..00768`, documented at `docs/research/2026-09-10-kimi-faith-lane-routing.md:143`) are still absent from `MembersList` in `output/beats/Faith_Organizations.jsonl`.
  3. **Pointer doc also carries drained `engine.189`:** `docs/research/2026-09-10-kimi-faith-lane-routing.md:137-140,153-154` tracks `engine.189` (`buildContractSeeds.js:41` still maps `'faith-event': 'COMMUNITY'`, and `godWorldEngine2.js:434,2177` still populates unread `S.faithStorySignals`).

### 11. `engine.261` (`2026-10-28-rollout-stale-check.json:12`)
- **`engine-sheet` verdict:** `OPEN, accurate`
- **Review verdict:** **HOLDS**
- **Verified evidence:**
  - `scripts/work-wake-packages.json:1-920` has 16 packages (0 business owners); `scripts/cron-work-wake.js:9-17` never writes dials; `phase05-citizens/processAdvancementIntake.js:2393,2500` mints and tracks business owners. (Note: `scripts/work-wake-packages.json` and `scripts/cron-work-wake.js` live in `scripts/**`, which is ordinary writable scope rather than `phase*/` substrate.)

### 12. `engine.303` (`2026-10-28-rollout-stale-check.json:13`)
- **`engine-sheet` verdict:** `OPEN, premise stale`
- **Review verdict:** **HOLDS**
- **Verified evidence:**
  - Across `output/execution_log_c107.txt` through `output/execution_log_c113.txt`:
    - `Phase9-CompressLifeHistory`: C107 `823 ms` (`:210`), C108 `798 ms` (`:215`), C109 `1395 ms` (`:246`), C110 `492 ms` (`:229`), C111 `731 ms` (`:235`), C112 `1067 ms` (`:250`), C113 `1172 ms` (`:277`) — exact range `492–1395 ms`.
    - `Phase11-MaintainLifeHistoryLog`: C107 `14,973 ms`, C108 `10,636 ms`, C109 `20,470 ms`, C110 `21,769 ms`, C111 `25,420 ms`, C112 `45,670 ms`, C113 `34,016 ms`.
  - `docs/reference/DEPLOY_HISTORY.md:28` is a bold bullet (`**SANDBOX 1004 @57 ...**`), not a `###` heading, so markdown anchor links fail to resolve.
  - Commit `8c79f951` (`ROLLOUT_PLAN.md:171`) records the builder's direction to move compression/archive out of the Cycle (`Phase11-MaintainLifeHistoryLog` is the actual 34–46 s Phase 11 cost).

---

## Part 2 — `observing_rows` Audit (11 rows)

### 13. `engine.201` (`2026-10-28-rollout-stale-check.json:19`)
- **`engine-sheet` verdict:** `CLOSE?` (`open`: `"review says 'the C113 trace is codex's read' — whether that read exists not checked"`)
- **Review verdict:** **WRONG (`CLOSE?` still has open work — C113 fixed-cohort causal trace does not exist)**
- **Verified evidence:**
  - `output/engine201/cohort-c113.json` was resnapped on `2026-10-26` (per `output/engine_review_c113.md:56`).
  - A repository-wide search across `docs/` and `output/` confirms **no C113 cohort trace exists** (only earlier cycle snapshots/notes: `docs/research/2026-10-12-engine201-c110-cohort-trace.md`, `output/codex/engine201-c111-cohort-trace.md`, and `docs/for-claude-review/2026-10-18-codex-engine-201-c112-checkpoint.md`).
  - Per `docs/plans/2026-09-10-inactivity-is-regression.md:355,359,365,469`, the sole open deliverable of `engine.201` is the 4-cycle (`C110→C113`) fixed-cohort causal proof (`condition → personal response → persistent change → different later choice, including citizens who receive no wake`). Resnapping `cohort-c113.json` only collected the endpoint snapshot; closing `engine.201` before the C113 trace is written and reviewed would drop the acceptance proof of the row.
  - **Correct verdict:** `READ OWED` (awaiting `codex` C113 cohort trace against `output/engine201/cohort-c110.json`..`cohort-c113.json`).

### 14. `engine.318` (`2026-10-28-rollout-stale-check.json:20`)
- **`engine-sheet` verdict:** `CLOSE?`
- **Review verdict:** **HOLDS (ready to flip to `done-pending-archive`)**
- **Verified evidence:**
  - `output/engine_review_c113.md:17` and `output/execution_log_c113.txt:225,277` confirm stage 28 (`5ed4ceba`) fired cleanly at C113: `Phase11-MediaIntake` ran in `2797 ms` with `0` `Engine_Errors`, `Citizen_Usage_Intake` had `912` rows (`0` pending by `Status`), `Citizen_Media_Usage` had `0` `media-room` rows, and `populateMediaIntake_ v2.3: Populated 3 media mentions`.

### 15. `engine.214` (`2026-10-28-rollout-stale-check.json:21`)
- **`engine-sheet` verdict:** `STALE text` (`open`: `"remaining '8b $VENUE' is a build, not a fire read"`)
- **Review verdict:** **HOLDS (row state is also `ready`, not `live-observing`)**
- **Verified evidence:**
  - `output/engine_review_c113.md:35-36` completed the C113 live reads for `engine.214` Cut B (stage 15) and Cut C rate (stage 16/17), marking both `Close (done-pending-archive)`.
  - Step `8b` (`$VENUE` draws the citizen's own spot 2 of 3 times, `docs/plans/2026-10-10-engine-214-mood-per-hood.md` ContentOffset `92160` `:32,39,58`) is unbuilt in `phase05-citizens/generateCitizensEvents.js`. The row belongs in `ready` for Step `8b`, not `live-observing`.

### 16. `engine.301` (`2026-10-28-rollout-stale-check.json:22`)
- **`engine-sheet` verdict:** `STALE text`
- **Review verdict:** **HOLDS**
- **Verified evidence:**
  - `output/engine_review_c113.md:19,57` and `output/execution_log_c113.txt:234,253` confirm the C113 readback is done (`crimeWaveHoods []`, `compactCrimeSpikes_: carrying 2 crime spike(s) to next cycle` in Adams Point and Piedmont Ave). The wave rung (`n = 3` on consecutive hood crime spikes, `docs/plans/2026-10-10-engine-214-mood-per-hood.md` ContentOffset `138240` `:17`) is an **Organic** wait for a back-to-back hood crime spike.

### 17. `engine.95` (`2026-10-28-rollout-stale-check.json:23`)
- **`engine-sheet` verdict:** `READ OWED + finding` (`open`: `"live checkpointSaveMs not read (code default 0 = gate disarmed; row says 6000); tailReserveMs 60000 is now tight against 60-81s actual tail"`)
- **Review verdict:** **HOLDS on the `tailReserveMs` finding, but WRONG/STALE on `checkpointSaveMs` in `open`**
- **Verified evidence:**
  - **Tail math holds:**
    - `output/execution_log_c112.txt:250`: `Phase10-ExecuteIntents` (`30,197 ms`) + `Phase11-MediaIntake` (`2,609 ms`) + `Phase11-BusinessArchive` (`0 ms`) + `Phase11-CitizenArchive` (`2,163 ms`) + `Phase11-MaintainLifeHistoryLog` (`45,670 ms`) = **`80,639 ms` (`80.6 s`)** vs `tailReserveMs = 60000`.
    - `output/execution_log_c113.txt:277`: `Phase10-ExecuteIntents` (`21,228 ms`) + `Phase11-MediaIntake` (`2,797 ms`) + `Phase11-BusinessArchive` (`1 ms`) + `Phase11-CitizenArchive` (`1,763 ms`) + `Phase11-MaintainLifeHistoryLog` (`34,016 ms`) = **`59,805 ms` (`59.8 s`)** vs `tailReserveMs = 60000`.
  - **Why `open` is wrong on `checkpointSaveMs`:**
    - `docs/reference/DEPLOY_HISTORY.md:448-450` (written `2026-10-09`) explicitly records: `"World_Config rows 199–204 wallBudgetMs 330000, tailReserveMs 60000, checkpointSaveMs 6000, phase5Subkeys ... were already hand-written, so ensureEngine95Config_ finds nothing to add. The gate is ARMED from C111"`.
    - `ensureEngine95Config_` (`phase01-config/engine94SheetContract.js:368-395`) only appends keys absent from `World_Config` and never overwrites existing rows with its `0` fallback (`:373`). Thus `checkpointSaveMs = 6000` is already live and read on `World_Config` rows 199–204; only the code fallback in `engine94SheetContract.js:373` and `godWorldEngine2.js:121` is `0`.

### 18. `engine.296` (`2026-10-28-rollout-stale-check.json:24`)
- **`engine-sheet` verdict:** `READ OWED`
- **Review verdict:** **HOLDS — with missing mechanism finding (row is an Organic playoff wait, not a missed C113 fire read)**
- **Verified evidence:**
  - `output/engine_review_c113.md` has no `engine.296` entry.
  - **What is missing:** Per `docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:75,82`, `SPORTS_LEGENDS` in `phase07-evening-media/buildEveningFamous.js` is only drawn during a **playoff or championship** week (`"The engine.296 legend HOLD stays carried: it clears on the first live playoff / championship week"`). Because C113 was regular-season Oaks Week 2 and A's off-season (`output/execution_log_c113.txt:227,257`), C113 could not trigger the `SPORTS_LEGENDS` branch. The `ROLLOUT_PLAN.md:110` text (`"re-read on C113 (Sun 2026-10-25)"`) was mis-scheduled; `engine.296`'s Window is **Organic** (first playoff/championship week).

### 19. `engine.197` (`2026-10-28-rollout-stale-check.json:25`)
- **`engine-sheet` verdict:** `READ OWED`
- **Review verdict:** **HOLDS — and C113 execution log already confirms the Phase 9 reflection drain fired**
- **Verified evidence:**
  - `output/engine_review_c113.md` omitted the `engine.197` C113 readback.
  - `output/execution_log_c113.txt:231` already proves the Phase 9 reflection drain ran at C113: `compressLifeHistory_ v3.0: Updated 1049, skipped 4, reflections 194/118 citizens, biases 0/0 citizens, folded 2465 entries, settled 1049 ...`.
  - All that remains to close `engine.197` is verifying Mags (`POP-00005`)'s `DialState` row from `Reflection_Intake` (per `docs/plans/2026-09-10-inactivity-is-regression.md` ContentOffset `46080` `:328,341`) and recording the read.

### 20. `engine.290` (`2026-10-28-rollout-stale-check.json:26`)
- **`engine-sheet` verdict:** `WRONG STATE` (`proposed`: `ready, not live-observing`)
- **Review verdict:** **HOLDS — and the Trevor slice read is already on disk**
- **Verified evidence:**
  - `output/engine_review_c113.md:55` and `docs/plans/2026-10-15-engine-290-transit-rides-the-sim.md:68,144` confirm the C113 fire read is complete and Sequencing 4 (`8` `occupation.bartCrew` ECL rows + flipping `transitStaffingGovernor` to `1` on live `World_Config`) is `ready` build/sheet work.
  - Additionally, the second clause of `ROLLOUT_PLAN.md:112` (`"Trevor's slice first live read"`) already has `output/cron-compare/transit_slice_c112.json`, `output/cron-compare/transit_slice_c113.json`, and Trevor Shimizu's C113 staged run (`output/cron-compare/reward-loop-c113.jsonl:3`, `score: 4`, `rheaPass: true`) on disk.

### 21. `pipeline.74` (`2026-10-28-rollout-stale-check.json:27`)
- **`engine-sheet` verdict:** `READ OWED`
- **Review verdict:** **HOLDS**
- **Verified evidence:**
  - `docs/engine/ROLLOUT_PLAN.md:154` (`"none has written unattended since"`) is stale: `output/cron-compare/` contains unattended C112 (`2026-10-21`) and C113 (`2026-10-28 18:17–18:19`) runs for all three reporters:
    - Noah Tan: `output/cron-compare/civic_c112_noah-tan_packet-v2_story.md` (23 lines) & `civic_c113_noah-tan_packet-v2_story.md` (24 lines; `reward-loop-c113.jsonl:15` `score: 4`, `rheaPass: true`).
    - P Slayer: `output/cron-compare/sports_c112_p-slayer_packet-v2_story.md` (25 lines) & `sports_c113_p-slayer_packet-v2_story.md` (18 lines).
    - Tanya Cruz: `output/cron-compare/sports_c112_tanya-cruz_packet-v2_story.md` (22 lines) & `sports_c113_tanya-cruz_packet-v2_story.md` (24 lines; `reward-loop-c113.jsonl:17` `score: 4`, `rheaPass: true`).

### 22. `pipeline.75` (`2026-10-28-rollout-stale-check.json:28`)
- **`engine-sheet` verdict:** `READ OWED`
- **Review verdict:** **HOLDS**
- **Verified evidence:**
  - `output/cron-compare/tanya_slice_c112.json`, `output/cron-compare/tanya_slice_c113.json`, `output/cron-compare/sports_c112_tanya-cruz_packet-v2_context.json`, and `output/cron-compare/sports_c113_tanya-cruz_packet-v2_context.json` are on disk from the C112 and C113 fan-outs, awaiting the calendar-gate readback in `docs/plans/2026-10-11-media-extension.md:591-614`.

### 23. `pipeline.77` (`2026-10-28-rollout-stale-check.json:29`)
- **`engine-sheet` verdict:** `DUE TONIGHT` (`evidence`: `"output/cron-compare/reward-loop-c113.jsonl: 13 lines, none yet from Marbury/Noah/Tanya"`)
- **Review verdict:** **WRONG (`reward-loop-c113.jsonl` has 20 lines, including completed 4/4 runs for Noah, Marbury, and Tanya; the two-week watch is COMPLETE / `READ OWED`)**
- **Verified evidence:**
  - `output/cron-compare/reward-loop-c113.jsonl:1-20` has **20 lines**, not 13. Lines 14–20 were written by the Wednesday `2026-10-28` 18:15 cron fan-out:
    - Line 1 (`:1`): `Carmen Delaine` (`2026-10-26`, `score: 4`, `rheaPass: true`, `words: 625`, `disposition: "staged"`)
    - Line 7 (`:7`): `Luis Navarro` (`2026-10-27`, `score: 4`, `rheaPass: true`, `words: 721`, `disposition: "staged"`)
    - Line 15 (`:15`): `Noah Tan` (`2026-10-28`, `score: 4`, `rheaPass: true`, `words: 602`, `toolCalls: 0`, `disposition: "staged"`)
    - Line 16 (`:16`): `Elliot Marbury` (`2026-10-28`, `score: 4`, `rheaPass: true`, `words: 699`, `toolCalls: 2`, `disposition: "staged"`)
    - Line 17 (`:17`): `Tanya Cruz` (`2026-10-28`, `score: 4`, `rheaPass: true`, `words: 204`, `toolCalls: 0`, `disposition: "staged"`)
  - Notice the internal contradiction in `output/engine-sheet/2026-10-28-rollout-stale-check.json`: on line 27 (`pipeline.74`), `engine-sheet` cited `civic_c113_noah-tan_*` and `sports_c113_tanya-cruz_*` from the Wednesday 18:19 run, yet on line 29 (`pipeline.77`) repeated the earlier daytime count (`13 lines`) from `docs/plans/2026-10-11-media-extension.md:623` (`"Read through C113 Tue"`).
  - With C113 complete across all 5 watched seats at **4.00/4.00** (and Tanya clearing the 150-word floor at `204` words), the two-week watch (`C111–C113`, `docs/plans/2026-10-11-media-extension.md:621-656`) is finished and ready for readback and the mechanism-2 cost decision.

---

## Part 3 — Unowned `ready` Rows in `ROLLOUT_PLAN.md` Omitted by `engine-sheet`'s Filter

Because `engine-sheet` filtered `docs/engine/ROLLOUT_PLAN.md` by `Terminal == engine-sheet`, it skipped 5 `ready` rows whose `Terminal` cell is blank (`| ready |  |`) even though they sit in or depend on `engine-sheet` scope:

1. **`engine.193` (`docs/engine/ROLLOUT_PLAN.md:117`):** `"C112's execution log carries 14 settle lines, the read is not written up (G-EC50). Then (a) public-employer budget squeeze; then CAT-layer design for the builder"` (`docs/plans/2026-09-10-inactivity-is-regression.md`). Also now has C113 settle lines (`output/execution_log_c113.txt:231`, `settled 1049`).
2. **`engine.116` (`docs/engine/ROLLOUT_PLAN.md:130`):** `"Spreadsheet weight: T2 code repoint, T3 archives out, T5 dead-tab prune"` (`docs/plans/2026-07-31-platform-ceiling-resilience.md:175-184`).
3. **`engine.202` (`docs/engine/ROLLOUT_PLAN.md:132`):** `"Sports WeekRecord: trigger-word hooks, dashboard input (3b), 3c"` — 100% done/subsumed by `engine.204` (see §1 above).
4. **`infrastructure.13` (`docs/engine/ROLLOUT_PLAN.md:146`):** `"lib/wakePerception.test.js fails on main: 'snippet capped at 180' ..."` — test drift introduced when `engine.197` (`wakes-no-rules`) removed the 180-char cap in `lib/wakePerception.js`.
5. **`engine.317` (`docs/engine/ROLLOUT_PLAN.md:149`):** `"A read-only door for FIRE_ADMISSION_JSON so the pre-fire gate reads the same source the fire checks"` (`utilities/webTrigger.js` + `scripts/verifyFireGate.js`).
