# Adversarial Review — `engine-sheet` ROLLOUT Stale Check Batch 2 (`2026-10-28`)

- **Reviewed surface:** `output/engine-sheet/2026-10-28-rollout-stale-check.json:49-62` (`batch_2_unowned_ready_rows`, 9 rows) and the corresponding row edits applied in `docs/engine/ROLLOUT_PLAN.md` by commit `2c78566a`
- **Reviewer:** `antigravity`
- **Date:** `2026-10-28`
- **Mode:** Read-only verification against code, plans, execution logs, snapshots, and commits (`HEAD` at `00988342` / `2c78566a`; `node scripts/docLoopStatus.js --lint` clean)

---

## Executive Summary (Batch 2 Scorecard)

Across the **9 rows** in `batch_2_unowned_ready_rows`:

- **2 rows have a WRONG or STALE sub-claim in the verdict / `ROLLOUT_PLAN.md` row text:**
  1. **`canon.5` (`2026-10-28-rollout-stale-check.json:57`, `ROLLOUT_PLAN.md:81`):** The new row text frames `POP-00317 RoleType + 12 LifeHistory lines` together as `"whether history keeps it is a canon call"`. **WRONG on `POP-00317` `RoleType` being mere history, and MISSING active code/tag surfaces:**
     - `POP-00317` (Lila Bennington) is `Active` with `RoleType: "Oakland Unified Elementary Teacher"` (`output/simulation_ledger_snapshot.jsonl:310`, `output/beats/Employment_Roster.jsonl:264`). Because Phase 5 builds `EventTag` from `RoleType`, her cell actively mints fresh `occupation:Oakland Unified Elementary Teacher` tags into `LifeHistory_Log` every cycle — verified at C113 (`Y3C9`) in `output/beats/LifeHistory_Log.jsonl:2961-2964` (4 new C113 rows).
     - Live code still hardcodes `OUSD` / `Oakland Unified`: `scripts/newsroomSourcing.js:17,25` (`CIVIC_EMPLOYERS['BIZ-00016'] = ['OUSD', 'Oakland Unified']`) and `phase05-citizens/civicInitiativeEngine.js:89-90,105,126,136-137,932,942,952` + `phase05-citizens/updateCivicApprovalRatings.js:586` (`BOARD-OUSD-1..7`).
  2. **`engine.116` (`2026-10-28-rollout-stale-check.json:53`, `ROLLOUT_PLAN.md:131`):** Verdict claims `"Task 5 not started"`. **WRONG / STALE on Task 5:**
     - Task 5 of `docs/plans/2026-08-17-sheet-weight-reduction.md:56-57,132-133` names two headline superseded-tab pairs (`WorldEvents_Ledger` vs `WorldEvents_V3_Ledger`, `Storyline_Ledger` vs `Storyline_Tracker`). The `Storyline_Tracker` + `Storyline_Intake` pair was **already exported and deleted on live and bench** on `2026-10-02` under `engine.266`/`engine.268` (`docs/engine/SHEETS_MANIFEST.md:73,75`, `docs/engine/ROLLOUT_ARCHIVE.md:1128-1129`). Likewise, Task 3's `Story_Seed_Deck_v3_legacy` (`2026-08-17-sheet-weight-reduction.md:93`) has `0` hits in `schemas/SCHEMA_HEADERS.md`. Task 5 is partially done (the `WorldEvents_Ledger` dual-write at `phase10-persistence/recordWorldEventsv25.js:32,103,128` + `phase04-events/worldEventsEngine.js:238` and the 16 hidden tabs remain).

- **6 rows HOLD on their core verdict but miss material facts or leave defects in `ROLLOUT_PLAN.md`:**
  - **`engine.193` (`ROLLOUT_PLAN.md:120`):** (a) Misses that **C113** (`output/execution_log_c113.txt:131-139`) also logged all 9 `engine.193b settle:` lines (unread in `output/engine_review_c113.md`); (b) `2026-10-28-rollout-stale-check.json:52` flagged that `§engine.193 Builder's words (2026-10-07)` is not a heading (`docs/plans/2026-09-10-inactivity-is-regression.md:412` is bold text under `## engine.193 — why the adversity tiers never open (read-before 2026-09-26, S495)` at `:372`), yet `2c78566a` left the broken anchor unchanged in `ROLLOUT_PLAN.md:120`.
  - **`pipeline.69` (`ROLLOUT_PLAN.md:125`):** (a) Omits Task 4 (`[ ~ ]` at `docs/plans/2026-09-13-run-cycle-packages-the-world.md:100-112`, `"the 24-file sweep not started"`, overlapping `engine.99`); (b) misses that T2 (`loadOwnSeedLine` for relocation/promotion seeds, `:78-88`) now partially overlaps `livedEventsFrom` / `livedFor` (`lib/wakePerception.js:711-765`), which already injects `[Promotion]` into the drawn citizen's wake.
  - **`engine.91` (`ROLLOUT_PLAN.md:129`):** (a) Pointer `[[../plans/2026-07-31-canon-ingest-backfill]] §S502` does not match the actual heading at `docs/plans/2026-07-31-canon-ingest-backfill.md:57` (`## S502 (engine-sheet, 2026-09-28) — T2 rewritten, T6 done; T4 held for the builder's go`); (b) omits open Task T7 (`:42`, single-artifact ingest path for deep-dispatch fork artifacts).
  - **`governance.51` (`ROLLOUT_PLAN.md:126`):** (a) Commit `2590d587` deleted not only `CLAUDE.md` but also `.claude/terminals/research-build/TERMINAL.md`, leaving active hooks/skills (`.claude/hooks/session-startup-hook.sh:221,272`, `.claude/hooks/boot-doc-guard.sh:10`, `.claude/skills/session-end/SKILL.md:69`, `scripts/mdStalenessDetector.js:218`) pointing at a deleted file; (b) `docs/plans/2026-08-29-boot-doc-consolidation.md:65` says T8 requires rotation design first (`"either sl-godworld or a new sl-memories container — Design the rotation ... before building"`), while `ROLLOUT_PLAN.md:126` marks it `ready`.
  - **`engine.99` (`ROLLOUT_PLAN.md:130`):** (a) The 2nd largest file in the plain grep (`scripts/testNeighborhoodLoop.js`, 94 hits) is a test harness named `test*.js` rather than `*.test.js`; (b) `docs/plans/2026-08-02-neighborhood-truth-source-migration.md:184-188,223-224` still claims Cohort 3 is blocked on `economicRippleEngine`'s 18→11 hood mapper, even though the same plan's S423 changelog (`:235`) already migrated `economicRippleEngine.mapToCanonicalNeighborhood_` to `resolveHoodOrChild_`.
  - **`infrastructure.13` (`ROLLOUT_PLAN.md:149`):** Row text in `2c78566a` says `"Fix = the assertion follows the new contract — research-build's change"`, but leaves the `Terminal` column blank (`| ready |  |`) so `research-build`'s terminal filter will not see it.
  - **Systemic issue across Batch 2:** Only 1 of the 9 "unowned" rows (`engine.317`) was given a `Terminal` owner in `2c78566a`; the other 8 rows (`canon.5`, `engine.193`, `pipeline.69`, `governance.51`, `engine.91`, `engine.99`, `engine.116`, `infrastructure.13`) still have a blank `Terminal` cell (`| ... |  |`) in `docs/engine/ROLLOUT_PLAN.md`, even where the owning plan or the row text itself explicitly names `engine-sheet` or `research-build`.

- **1 row HOLDS cleanly in both verdict and `ROLLOUT_PLAN.md` text:**
  - **`engine.317` (`ROLLOUT_PLAN.md:152`)**

---

## Row-by-Row Audit (`batch_2_unowned_ready_rows`)

### 1. `engine.193` (`2026-10-28-rollout-stale-check.json:52` → `ROLLOUT_PLAN.md:120`)
- **`engine-sheet` verdict:** `OPEN, text wrong`
- **`ROLLOUT_PLAN.md:120` text (`2c78566a`):** `Adversity tiers LIVE; (b) settle LIVE (code e3a85853, PROD stage 3); C112 log carries 9 engine.193b settle: lines, one per 1000+ employer — read not written up (G-EC50). Open: (a) public-employer budget squeeze, cut 4 (illness), then CAT-layer design for the builder`
- **Review verdict:** **VERDICT HOLDS — ROW TEXT MISSES C113 & LEAVES BROKEN POINTER**
- **Verified evidence:**
  - `output/execution_log_c112.txt:135-143` has `9` `applyBusinessDynamics_ engine.193b settle:` lines (the 9 employers with `Employee_Count >= 1000`), not `14`.
  - Commit `e3a85853` (`2026-10-11`) is the `engine.193 (b)` code commit (`phase05-citizens/applyBusinessDynamics.js`, `phase01-config/engine94SheetContract.js`); `ae9278aa` is the `engine.194` commit that anchored PROD stage 3 (`docs/reference/DEPLOY_HISTORY.md:428`), and `9687e42f` added the `G-EC50` `engine.193b settle:` log line in PROD stage 4.
  - Cut 4 (illness generator) is open at `docs/plans/2026-09-10-inactivity-is-regression.md:389,605`.
- **What is missing / wrong in `ROLLOUT_PLAN.md:120`:**
  1. **C113 also logged all 9 `engine.193b settle:` lines:** `output/execution_log_c113.txt:131-139` carries a second live cycle of the 9 institution settle lines (`Port 12.38 → 12.3`, `AC Transit 12.42 → 12.53`, `Oakland Hospital 8.21 → 7.88`, `Oakland City Schools 8.11 → 7.94`, `City of Oakland 11.76 → 11.63`, `EBMUD 12.29 → 12.36`, `Piedmont Avenue Medical Center 9.8 → 9.8`, `Estuary Power & Gas 8.97 → 8.94`, `OCCD 8.06 → 7.89`), also unwritten in `output/engine_review_c113.md`.
  2. **Broken pointer anchor left unfixed:** Even though `2026-10-28-rollout-stale-check.json:52` noted that `Builder's words (2026-10-07)` is a bold paragraph at `docs/plans/2026-09-10-inactivity-is-regression.md:412` rather than a heading, `ROLLOUT_PLAN.md:120` still points to `[[../plans/2026-09-10-inactivity-is-regression]] §engine.193 Builder's words (2026-10-07)` (the actual section heading is at `:372`: `## engine.193 — why the adversity tiers never open (read-before 2026-09-26, S495)`).
  3. **Blank `Terminal` cell (`| ready |  |`):** Every open item under `engine.193` is `engine-sheet` engine work.

---

### 2. `engine.116` (`2026-10-28-rollout-stale-check.json:53` → `ROLLOUT_PLAN.md:131`)
- **`engine-sheet` verdict:** `OPEN, accurate` (`evidence`: `"Task 2 code repoint not done: lib/diagnosticLedger.js:52 still Engine_Errors in-book"`, `"Task 3 not done: utilities/archiveLifeHistory.js:203"`, `"Task 5 not started"`)
- **`ROLLOUT_PLAN.md:131` text (unchanged):** `Spreadsheet weight: T2 code repoint, T3 archives out, T5 dead-tab prune`
- **Review verdict:** **HOLDS on T2 and T3 (`LifeHistory_Archive` / `Story_Seed_Deck_Archive`), WRONG / STALE on `"Task 5 not started"`**
- **Verified evidence:**
  - T2: `lib/diagnosticLedger.js:52` (`const SHEET_NAME = 'Engine_Errors'`) and `phase01-config/godWorldEngine2.js:119` (`logEngineError_`) still write to `Engine_Errors` in the main workbook.
  - T3: `utilities/archiveLifeHistory.js:203` still writes `LifeHistory_Archive` in-book, and `Story_Seed_Deck_Archive` remains in `schemas/SCHEMA_HEADERS.md:1529`.
- **Why `"Task 5 not started"` is wrong:**
  1. `docs/plans/2026-08-17-sheet-weight-reduction.md:56-57,132-133` defines Task 5's candidate pool around two headline superseded pairs: `WorldEvents_Ledger` vs `WorldEvents_V3_Ledger` and `Storyline_Ledger` vs `Storyline_Tracker`.
  2. The `Storyline_Tracker` + `Storyline_Intake` pair was **already exported to git and deleted from live and bench** on `2026-10-02` under `engine.266` / `engine.268` (`docs/engine/SHEETS_MANIFEST.md:73,75`; `docs/engine/ROLLOUT_ARCHIVE.md:1128-1129`), following the exact Task 5 method (`2026-08-17-sheet-weight-reduction.md:128-129`).
  3. Additionally, Task 3's first table row (`Story_Seed_Deck_v3_legacy`, `56,580` cells, `2026-08-17-sheet-weight-reduction.md:93`) is already absent from `schemas/SCHEMA_HEADERS.md` (`0` hits).
  4. What actually remains in Task 5 is the `WorldEvents_Ledger` dual-write (`phase10-persistence/recordWorldEventsv25.js:32,103,128` + `phase04-events/worldEventsEngine.js:238`), the retired Chicago tabs (`Chicago_Feed`, `Chicago_Sports_Feed`, `Chicago_Citizens`, `docs/engine/SHEETS_MANIFEST.md:111`), and the hidden-tab pass.
  5. `docs/plans/2026-08-17-sheet-weight-reduction.md:176` explicitly assigns `Task 2 code half, Task 3 archives-out, Task 5 dead-tab pruning remain (engine-sheet)`, but `ROLLOUT_PLAN.md:131` leaves `Terminal` blank (`| ready |  |`).

---

### 3. `pipeline.69` (`2026-10-28-rollout-stale-check.json:54` → `ROLLOUT_PLAN.md:125`)
- **`engine-sheet` verdict:** `OPEN`
- **`ROLLOUT_PLAN.md:125` text (`2c78566a`):** `Run-cycle packages the world: T1 texture by hood, T2 wake carries the citizen's own seed event, T3 seed floor (none landed); T5 slice readback — artifacts on disk since C108, table never written`
- **Review verdict:** **HOLDS on T1, T2, T3, T5 — MISSES T4 & T2/`livedFor` OVERLAP**
- **Verified evidence:**
  - T1: `scripts/buildNeighborhoodTexture.js:52` is still `v1.1.0` and `:539` does not read `LifeHistory_Log`.
  - T2: `0` hits for `loadOwnSeedLine` in `lib/wakePerception.js` and `scripts/citizen-wake.js`.
  - T3: `phase07-evening-media/buildContractSeeds.js:445-589` has no per-hood texture seed floor (marked `"optional if Task 1 lands"` at `docs/plans/2026-09-13-run-cycle-packages-the-world.md:90-98`).
  - T5: `output/slices/c108/` (18 `.md` files) through `output/slices/c113/` exist on disk; `docs/plans/2026-09-13-run-cycle-packages-the-world.md:168-175` is still `[ ] not started`.
- **What is missing:**
  1. **Task 4 (`docs/plans/2026-09-13-run-cycle-packages-the-world.md:100-112`) is `[~]` half-open in the plan:** While `engine.214` spun out to `docs/plans/2026-10-10-engine-214-mood-per-hood.md`, Task 4's `"the 24-file sweep not started"` (`:111`) remains open in the plan and duplicates `engine.99`.
  2. **T2 now partially overlaps `livedEventsFrom` / `livedFor` (`lib/wakePerception.js:711-765`):** Built after `pipeline.69` T2 was drafted (`2026-09-13-run-cycle-packages-the-world.md:78-88`), `livedFor` already injects a citizen's own `[Promotion]`, `[Birth]`, `[Retirement]`, `Hospital_Ledger`, or `[Death]` event into their wake prompt. T2's `Story_Seed_Deck` `Why` parser (`"relocation 'X moved … from H' / promotion 'X promoted …'"`, `:85`) would duplicate `[Promotion]` unless scoped to seed events not already covered by `livedFor`.
  3. **Blank `Terminal` cell (`| ready |  |`):** `docs/plans/2026-09-13-run-cycle-packages-the-world.md:26` assigns `engine/sheet (Tasks 1–3, 5, 6)`.

---

### 4. `engine.91` (`2026-10-28-rollout-stale-check.json:55` → `ROLLOUT_PLAN.md:129`)
- **`engine-sheet` verdict:** `OPEN, accurate`
- **`ROLLOUT_PLAN.md:129` text (unchanged):** `Canon ingest: the wiki ingesters carry no customId`
- **Review verdict:** **HOLDS — with broken pointer anchor and omitted Task T7**
- **Verified evidence:**
  - `scripts/ingestEditionWiki.js:576-586` and `scripts/ingestCivicWiki.js:278-288` both `POST` `{ memories: [item], containerTag: CONTAINER_TAG }` to `/v4/memories` with no `customId`.
  - `scripts/ingestEditionWiki.js:50,613-760` has `--wipe-priors` (citizen records only), which `.claude/skills/post-publish/SKILL.md:104` and `.agents/skills/godworld_post_publish/SKILL.md:36` do not pass.
- **What is missing:**
  1. **Broken pointer anchor in `ROLLOUT_PLAN.md:129`:** `[[../plans/2026-07-31-canon-ingest-backfill]] §S502` does not match the heading at `docs/plans/2026-07-31-canon-ingest-backfill.md:57` (`## S502 (engine-sheet, 2026-09-28) — T2 rewritten, T6 done; T4 held for the builder's go`).
  2. **Task T7 (`docs/plans/2026-07-31-canon-ingest-backfill.md:42`, single-artifact ingest path) is still open in the plan table** and unmentioned in both the row and S502 notes.
  3. **Blank `Terminal` cell (`| ready |  |`):** `docs/plans/2026-07-31-canon-ingest-backfill.md:34-42` assigns all engineering tasks to `engine-sheet`.

---

### 5. `governance.51` (`2026-10-28-rollout-stale-check.json:56` → `ROLLOUT_PLAN.md:126`)
- **`engine-sheet` verdict:** `PARTLY STALE`
- **`ROLLOUT_PLAN.md:126` text (`2c78566a`):** `Boot docs: T8 rotation to sl-memories (its memory-write-gate half was removed by the builder 2026-10-07, 3b40ab48). T3 memory dedup done (2026-10-22). Plan T1/T2/T7 cite CLAUDE.md, removed from the tree 2026-10-28 (2590d587)`
- **Review verdict:** **HOLDS on evidence — MISSES `.claude/terminals/research-build/TERMINAL.md` deletion & T8 design gate**
- **Verified evidence:**
  - Commit `3b40ab48` (`2026-10-07`) deleted `.claude/hooks/memory-write-gate.sh` builder-direct.
  - Commit `40e34826` (`2026-10-22`) closed T3 (`docs/plans/2026-08-29-boot-doc-consolidation.md:76`, though the table cell at `:60` still says `proposal ready`).
  - Commit `2590d587` (`2026-10-28`) deleted `CLAUDE.md` and `.claude/terminals/research-build/TERMINAL.md`.
- **What is missing:**
  1. **Broader impact of `2590d587`:** `2590d587` deleted both `CLAUDE.md` and `.claude/terminals/research-build/TERMINAL.md`, while active hooks and scripts (`.claude/hooks/session-startup-hook.sh:221,272`, `.claude/hooks/boot-doc-guard.sh:10`, `.claude/skills/session-end/SKILL.md:69`, `scripts/mdStalenessDetector.js:218`, `scripts/session-end-audit.sh:34`) still reference `CLAUDE.md`.
  2. **Row state (`ready`) vs T8 spec (`docs/plans/2026-08-29-boot-doc-consolidation.md:65`):** T8 explicitly states `"either sl-godworld or a new sl-memories container ... Design the rotation (what qualifies, cadence, dedup against what is already in the container) before building"`, and `infrastructure.10` (`ROLLOUT_PLAN.md:93`) holds Supermemory v5 migration until `Sun 2026-11-01`.

---

### 6. `canon.5` (`2026-10-28-rollout-stale-check.json:57` → `ROLLOUT_PLAN.md:81`)
- **`engine-sheet` verdict:** `OPEN item undefined -> needs-info`
- **`ROLLOUT_PLAN.md:81` text (`2c78566a`):** `Sheet renames LANDED live 2026-10-12 (BIZ-00016 Oakland City Schools, BIZ-00035 OCCD, INIT-007 Notes). Employer column gone; old name left in POP-00317 RoleType + 12 LifeHistory lines — whether history keeps it is a canon call. INSTITUTIONS.md:75 still says Peralta row`
- **Review verdict:** **WRONG / INCOMPLETE FRAMING in `ROLLOUT_PLAN.md:81` (`POP-00317` `RoleType` is an active per-cycle tag generator, not just history; live code still hardcodes `OUSD` / `Oakland Unified`)**
- **Verified evidence:**
  - `output/beats/Business_Ledger.jsonl:16,35` has `BIZ-00016` = `Oakland City Schools` and `BIZ-00035` = `Oakland Community College District`.
  - `docs/canon/INSTITUTIONS.md:75` still reads `ledger: Peralta row` instead of `ledger: BIZ-00035`.
  - `output/simulation_ledger_snapshot.jsonl` carries `"Oakland Unified"` in `POP-00317`'s `RoleType` (`"Oakland Unified Elementary Teacher"`, also in `output/beats/Employment_Roster.jsonl:264`) and in the Cycle 110 promotion line of `LifeHistory` for `POP-01183..01194` (12 citizens).
- **What `engine-sheet` got wrong / missed:**
  1. **`POP-00317`'s `RoleType` is NOT frozen history — it is actively minting `Oakland Unified` into new `LifeHistory_Log` rows every cycle:** Because Phase 5 stamps `occupation:<RoleType>` into `LifeHistory_Log.EventTag`, `POP-00317` (Lila Bennington) generated **4 new C113 (`Y3C9`) `LifeHistory_Log` rows** carrying `occupation:Oakland Unified Elementary Teacher` (`output/beats/LifeHistory_Log.jsonl:2961-2964`). Grouping `POP-00317 RoleType` with the 12 historical `LifeHistory` lines under `"whether history keeps it is a canon call"` misstates a live current-state role cell as historical prose.
  2. **Live code still hardcodes `OUSD` / `Oakland Unified`:**
     - `scripts/newsroomSourcing.js:17,25` (`CIVIC_EMPLOYERS`) still maps `'BIZ-00016': ['OUSD', 'Oakland Unified']` (with comment `:17`: `"the ledger says 'Oakland Unified School District'"`).
     - `phase05-citizens/civicInitiativeEngine.js:89-90,105,126,136-137,932,942,952` and `phase05-citizens/updateCivicApprovalRatings.js:586` still hardcode `BOARD-OUSD-1..7` (noted separately under `civic.43` at `ROLLOUT_PLAN.md:77` as `"then the canon-name fix"`).
  3. **Blank `Terminal` cell (`| needs-info |  |` at `ROLLOUT_PLAN.md:81`):** Every other row in Section 1 (`:77-80`) names an owning terminal.

---

### 7. `engine.99` (`2026-10-28-rollout-stale-check.json:58` → `ROLLOUT_PLAN.md:130`)
- **`engine-sheet` verdict:** `OPEN, count refreshed`
- **`ROLLOUT_PLAN.md:130` text (`2c78566a`):** `Hood truth-source long tail: 67 files still carry canon hood-name literals (plain grep 2026-10-28; the ~49 was the plan's detector count); migrate-on-touch is not happening in the five largest. Cohorts 3-4 open`
- **Review verdict:** **HOLDS — with two precision notes (one top-5 carrier is a test file; plan's Cohort 3 blocker is stale)**
- **Verified evidence:**
  - The largest carriers outside `MIGRATED_FILES` (`scripts/auditHoodDrift.js:52-74`) were all modified in late September / October 2026 while keeping their hardcoded hood lists:
    - `phase04-events/buildCityEvents.js` (`103` quoted `CANON_12` hits; last touched `2026-09-30` in `c3c38aa0`)
    - `scripts/testNeighborhoodLoop.js` (`94` hits; last touched `2026-10-20` in `4695befa`)
    - `utilities/ensureTransitMetrics.js` (`76` hits; last touched `2026-10-15` in `254163a6`)
    - `phase07-evening-media/buildNightLife.js` (`57` hits; last touched `2026-10-03` in `aa2eac7f`)
    - `utilities/ensureNeighborhoodDemographics.js` (`44` hits; last touched `2026-09-15` in `0a8013fc`)
    - `phase05-citizens/generateCitizensEvents.js` (`41` hits; last touched `2026-10-20` in `9ac1ea99`)
- **Precision notes:**
  1. **Test file in the top 5:** `scripts/testNeighborhoodLoop.js` (the #2 carrier at `94` hits) is a test script named `test*.js` rather than `*.test.js`, so excluding `*.test.js` still counts it as a "non-test file".
  2. **Plan's Cohort 3 blocker (`docs/plans/2026-08-02-neighborhood-truth-source-migration.md:184-188,223-224`) is stale:** Lines `:184-188` and `:223-224` still say Cohort 3 is blocked on `economicRippleEngine`'s 18→11 hood mapper, whereas the plan's own S423 changelog (`:235`) already migrated `economicRippleEngine.mapToCanonicalNeighborhood_` to `resolveHoodOrChild_(ctx, name)` and deleted the literal.
  3. **Blank `Terminal` cell (`| ready |  |` at `ROLLOUT_PLAN.md:130`):** `docs/plans/2026-08-02-neighborhood-truth-source-migration.md:34` assigns `**Terminal:** engine-sheet`.

---

### 8. `engine.317` (`2026-10-28-rollout-stale-check.json:59` → `ROLLOUT_PLAN.md:152`)
- **`engine-sheet` verdict:** `OPEN, owner set engine-sheet`
- **`ROLLOUT_PLAN.md:152` text (`2c78566a`):** `A read-only door for FIRE_ADMISSION_JSON (webTrigger getprop is carry-forward-only; a GET fires a Cycle), so a PROD push can prove no Cycle was admitted across it. Waived as a named builder exception on PROD stages 27-31 (10-25 to 10-28)`
- **Review verdict:** **HOLDS CLEANLY**
- **Verified evidence:**
  - `utilities/webTrigger.js:95-100` (`CARRY_FORWARD_PROP_WHITELIST`) contains only `PREV_EVENING_JSON`, `PREV_CYCLE_STATE_JSON`, `CHAOS_NBHD_FOLD_JSON`, and `PREV_FRANCHISE_WEIGHT_JSON` (and shares that whitelist with `setprop` at `:140-156`, so a `FIRE_ADMISSION_JSON` door must be read-only).
  - `docs/reference/DEPLOY_HISTORY.md` records the named builder exception on PROD stages 27 (`:206`), 28 (`:195`), 29 (`:186`), 30 (`:178`), and 31 (`:170`, commit `63131dba`).
  - `Terminal` is properly set to `engine-sheet` at `ROLLOUT_PLAN.md:152`.

---

### 9. `infrastructure.13` (`2026-10-28-rollout-stale-check.json:60` → `ROLLOUT_PLAN.md:149`)
- **`engine-sheet` verdict:** `STALE TEST`
- **`ROLLOUT_PLAN.md:149` text (`2c78566a`):** `Stale test, not a code fault: ebcf159d (rb, 2026-10-25, "reflections travel whole") dropped the 180-char cap from nightlyIntakeRow; the test still asserts it (107/108). Fix = the assertion follows the new contract — research-build's change`
- **Review verdict:** **HOLDS on root cause — MISSING `Terminal` assignment in `ROLLOUT_PLAN.md:149`**
- **Verified evidence:**
  - Commit `ebcf159d` (`2026-10-25`, `research-build`) removed `.slice(0, 180)` from `nightlyIntakeRow` at `lib/wakePerception.js:901` (`String(o.body || '').replace(/\n/g, ' ')`), leaving `lib/wakePerception.test.js:242` (`assert('snippet capped at 180', nightlyIntakeRow({ body: 'a'.repeat(400), cls: {} })[5].length === 180)`) failing (`107 passed, 1 failed`).
- **What is missing:**
  1. **Blank `Terminal` cell (`| ready |  |` at `ROLLOUT_PLAN.md:149`):** Although `2c78566a` added `— research-build's change` to the `Item` description, it left the `Terminal` column empty instead of setting `research-build` (so any terminal-scoped query for `research-build` rows will still skip `infrastructure.13`).
  2. **Plan text drift:** `docs/plans/2026-09-10-inactivity-is-regression.md:544` still reads `snippet = first 180 chars of the scrubNightly body`.
