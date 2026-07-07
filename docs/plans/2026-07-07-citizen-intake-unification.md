---
title: Citizen Intake Unification Plan
created: 2026-07-07
updated: 2026-07-07
type: plan
tags: [engine, ledger, intake, active]
sources:
  - docs/research/2026-07-07-simulation-narrative-open-items.md §12.7 (Mike's spec, Drive doc S302)
  - phase05-citizens/processAdvancementIntake.js (deriveCitizenProfile_ + S302 normalized matcher)
  - phase07-evening-media/mediaRoomIntake.js routeCitizenUsageToIntake_ (existing router)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.51)"
  - "[[../research/2026-07-07-simulation-narrative-open-items]] — research basis"
  - "[[index]] — registered same commit"
---

# Citizen Intake Unification Plan

**Goal:** Every citizen add or story-driven edit enters through one intake ledger and is completed by deterministic code — no direct Simulation_Ledger writes, no LLM-edited rows.

**Architecture:** The pieces exist and are disconnected. `routeCitizenUsageToIntake_` already routes names to `Intake` (new) / `Advancement_Intake1` (existing); `processIntake_` mints POPIDs but only passes fields through (no income/education/age completion); `deriveCitizenProfile_` does full profile completion but only on the advancement path; the S302 normalized matcher exists only in `processMediaUsage_`. This plan wires them into one path: extended `Intake` schema (category + story-established fields) → `processIntake_` calls profile completion with Economic_Parameters category salaries → all matching goes through the shared normalized matcher → Node adder scripts emit intake rows instead of SL appends.

**Terminal:** engine/sheet

**Pointers:**
- Prior work: S302 commit `565bba06` (normalized matcher), research doc §12.7
- Related plan: none — INTAKE_REDESIGN.md/INTAKE_REDESIGN_PLAN.md are lost docs (TERMINAL.md pointers stale); this plan supersedes them
- Research basis: [[../research/2026-07-07-simulation-narrative-open-items]]

**Acceptance criteria:**
1. An `Intake` row with only First+Last+Category ("blue-collar") produces, next cycle, a complete SL row: POPID, RoleType + Income drawn from Economic_Parameters for that category, BirthYear/age, Neighborhood, EducationLevel — zero blank causal columns.
2. An intake row naming an existing citizen (including "Dr. Vinnie Keane", "ViNNei Keane", accent/apostrophe variants) bumps UsageCount and applies any non-blank fields as edits — no duplicate row minted.
3. An unidentifiable name (honorific+surname only, or a normalization collision) lands in a review state visible on the intake tab — never silently minted, never silently dropped.
4. Story lanes (media room routing, post-publish extraction T8) are the exclusive Intake feeders; bulk-integration scripts carry documented carve-out headers (amended S302 — T6 reversed on evidence).
5. A full sandbox cycle runs clean with intake rows of all three shapes (new-minimal, existing-edit, ambiguous) staged.

---

## Tasks

### Task 1: Extend `Intake` tab schema
- **Files:** live sheet (sandbox first) — `Intake` tab; `schemas/SCHEMA_HEADERS.md` regen
- **Steps:**
  1. Append columns after existing H (`ClockMode`): `Age`, `Neighborhood`, `RoleType`, `Category` (blue-collar | white-collar | service | faith | sports | media | civic), `Family`, `Notes`, `IntakeStatus`.
  2. `node scripts/regenSchemaHeaders.js`; update `docs/SIMULATION_LEDGER.md` §intake if it documents the tab.
- **Verify:** SCHEMA_HEADERS shows new Intake columns.
- **Status:** [ ] not started

### Task 2: Category → base-salary map from Economic_Parameters
- **Files:** `phase01-config/godWorldEngine2.js` (processIntake_ scope) — modify
- **Steps:**
  1. Loader reads Economic_Parameters (Role, Category, IncomeMin/Max, MedianIncome) once per cycle; groups rows by the 7 intake categories (map sheet Category values → intake categories; log unmapped).
  2. Completion draw: category given → pick Role row via ctx.rng, income between IncomeMin/Max; no category → dice-roll blue/white/service per Mike's spec.
- **Verify:** scratch harness draws 20 profiles per category, all incomes within row bounds, deterministic under fixed seed.
- **Status:** [ ] not started

### Task 3: Full completion in `processIntake_`
- **Files:** `phase01-config/godWorldEngine2.js` — modify (both entry bodies if duplicated)
- **Steps:**
  1. After passthrough fields, fill blanks: BirthYear from Age (2041 − Age anchor, [[../../memory/project_age-2041-anchor-convention]]) or age-band roll; Neighborhood weighted by Neighborhood_Demographics; RoleType+Income via Task 2; EducationLevel consistent with role (reuse `deriveCitizenProfile_` internals — extract shared helper into processAdvancementIntake.js if signatures allow, do NOT duplicate).
  2. Write `IntakeStatus=minted <POPID>` back to the intake row instead of clearing it (operator audit trail; keep clearContent as a size backstop ≥200 rows).
- **Verify:** sandbox cycle with a First+Last+Category-only row → complete SL row; AC-1.
- **Status:** [ ] not started

### Task 4: Shared normalized matcher at both route points
- **Files:** `phase07-evening-media/mediaRoomIntake.js` (`citizenExistsInLedger_`), `phase05-citizens/processAdvancementIntake.js` (`processAdvancementRows_` name match) — modify
- **Steps:**
  1. Both switch to `normalizeCitizenName_` + `splitUsageName_` + `buildNameIndex_` (S302, already in processAdvancementIntake.js — reference, don't copy; both files are clasp-pushed top-level scope).
  2. Ambiguous (null split / collision) → route row to `IntakeStatus=review` (Task 1 column), skip processing.
- **Verify:** scratch tests: honorific variant routes to existing-citizen path; "Dr. Keane" lands review; collision lands review. AC-2, AC-3.
- **Status:** [ ] not started

### Task 5: Edits-on-existing path
- **Files:** `phase05-citizens/processAdvancementIntake.js` — modify
- **Steps:**
  1. `processAdvancementRows_` non-blank fields overwrite SL (already the contract); add Income re-derive when RoleType changes (retirement case: new RoleType → Task 2 salary lookup).
  2. Every applied edit appends a LifeHistory_Log row (`[IntakeEdit] <field>: <old> → <new>`), cycle-stamped via `inWorldStamp_`.
- **Verify:** staged edit row on sandbox changes RoleType + Income + logs LifeHistory. AC-2.
- **Status:** [ ] not started

### Task 6: Node adders — carve-out documented (REVERSED from convert, S302)
- **Files:** `scripts/integrateCelebrities.js`, `scripts/integrateFaithLeaders.js` — header notes
- **Finding:** measure-twice reversed the convert plan. `integrateAthletes.js` never appends (cell-updater on matched rows). The other two are one-shot BULK INTEGRATIONS: Tier-2/LIFE-clock mints with TraitProfile + same-run POPID backfill into Cultural_Ledger / Faith_Organizations — intake's next-cycle mint cannot provide the synchronous POPID, and the lean shape would drop their curated fields. Same carve-out class as seedYouthBalance/ingestFemaleCitizensBalance.
- **Steps:** carve-out headers added to both scripts pointing at this plan; AC-4 amended: story lanes (media room ✓ T4, post-publish → T8) are the exclusive Intake feeders; bulk integrations stay direct by documented exception.
- **Status:** [x] done S302 (as reversed)

### Task 8: Post-publish intake extraction (research-build)
- **Terminal:** research-build (Mike-direct S302 — apparatus/skill work, not substrate)
- **Files:** `.claude/skills/post-publish/SKILL.md` — modify; extraction script (reuse/extend `scripts/ingestPublishedEntities.js` — do NOT create a parallel new script)
- **Steps:**
  1. Post-publish step: run extraction against the edition `.txt`/`.md` (the pre-PDF build — all articles share the same format, so the parse is deterministic: NAMES INDEX, letter footers, byline blocks).
  2. Extracted citizens/edits emit **Intake tab rows** (lean 9-col shape) instead of any direct ledger writes — new names with story-established fields + Notes provenance ("Edition C{XX}"), existing names as bump/edit rows.
  3. Ambiguous extractions ride the same `IntakeStatus=review` lane; the skill surfaces review rows in its close-out summary.
- **Verify:** run against the latest published edition on sandbox; Intake rows appear; next engine cycle mints/updates; zero direct SL writes from the media lane.
- **Depends on:** T1–T6 shipped + T7 clean.
- **Status:** [ ] not started

### Task 7: Sandbox verification cycle
- **Steps:**
  1. Stage the three AC shapes on sandbox `Intake`; Mike fires the cycle.
  2. Verify SL rows, UsageCount bumps, review states, LifeHistory edit rows; then prod deploy in a clean attribution window.
- **Verify:** AC-5. Engine_Errors empty.
- **Status:** [ ] not started

---

## Changelog

- 2026-07-07 — Plan created (S302), ignited from research §12.7 after Mike flagged the shipped matcher/pool fixes as short-sighted without a working intake front door.
- 2026-07-07 — T1 amended (Mike-direct): lean 9-col operator schema replaces 21-col first cut; tab created on sandbox (had not existed). T1–T3 shipped 6d385ac4.
- 2026-07-07 — Task 8 added (Mike-direct): research-build wires intake extraction into /post-publish against the pre-PDF .txt/.md; gated on T7 clean.
- 2026-07-07 — T4+T5 shipped 595c4665 (lean router, shared matcher, routed data-loss guard, income re-derive). T6 REVERSED: integrate scripts are bulk-integration carve-outs, headers documented; AC-4 amended. T7 test rows staged on sandbox.
