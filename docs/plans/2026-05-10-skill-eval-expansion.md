---
title: Skill-Eval Expansion — /city-hall + /dispatch + /interview
created: 2026-05-10
updated: 2026-05-10
type: plan
tags: [media, civic, architecture, complete]
sources:
  - "[[skill-eval-framework]] — parent framework plan (S141 design + S156 first-skill shipped)"
  - "[[../engine/ROLLOUT_PLAN]] §governance.2 — HIGH C93"
  - "[[../adr/0005-rollout-plan-structure]] — filing protocol for new plan files"
  - "[[../adr/0004-skill-bag-naming-principle]] — gen-eval architecture (skills are generators; /skill-check is the eval pass)"
  - "Anthropic skill-creator grader.md pattern (`/root/.claude/plugins/marketplaces/claude-plugins-official/plugins/skill-creator/agents/grader.md`)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (governance.2)"
  - "[[skill-eval-framework]] — framework parent"
  - "[[../media/story_evaluation]] — existing assertion-file shape reference"
  - "[[../media/brief_template]] — sibling assertion-file"
  - "[[../media/citizen_selection]] — sibling assertion-file"
  - "[[../index]] — register 3 new evaluation MDs + this plan in same commit"
---

# Skill-Eval Expansion — /city-hall + /dispatch + /interview

**Goal:** Expand `/skill-check` from grading 2 skills (write-edition + sift) to grading 5 skills (add city-hall + dispatch + interview) via 3 new per-skill assertion files.

**Architecture:** Each new skill gets an assertion file under `docs/media/<skill>_evaluation.md` parallel to `story_evaluation.md`. `/skill-check <skill> <cycle>` reads the assertion file, runs the grader pattern per Anthropic skill-creator's `grader.md`, produces `output/skill_check_<skill>_c<XX>.json` consumed by `/post-publish` Step 10. Format of assertion files matches the existing pattern: `## What good looks like` with testable criteria + `## Changelog` with per-cycle observations. Post-publish-side wiring already exists; only missing piece is the assertion files.

**Terminal:** `research-build` (assertion files + verification) → `media` + `civic` (review + adjust criteria after first run)

**Pointers:**
- Prior work: [[skill-eval-framework]] (S141 design), `.claude/skills/skill-check/SKILL.md` (S156 first skill shipped), `output/skill_check_write-edition_c91.json` (proof-of-concept, c91)
- ROLLOUT row: `governance.2` (HIGH C93)
- Source pattern: Anthropic skill-creator `grader.md` agent (judges assertion satisfaction, fails surface-level compliance, extracts implicit claims for independent verification)
- Sample C93 outputs to validate against: `output/production_log_city_hall_c93.md` (city-hall) — dispatch + interview don't have C93 outputs yet (no C93 dispatch ran; no C93 interview ran)

**Acceptance criteria:**

1. Three new assertion files exist at `docs/media/{city_hall,dispatch,interview}_evaluation.md`, registered in `[[../index]]` per S147.
2. `node scripts/skillCheck.js city-hall 93` (or equivalent skill invocation) produces non-empty `output/skill_check_city-hall_c93.json` with pass/fail per criterion.
3. Same passes for dispatch + interview against historical runs (or zero-output baselines if no historical run exists).
4. `/post-publish` Step 10 invokes `/skill-check` for each skill that ran in the cycle (existing wiring works for new skills — verify, don't rewrite).
5. Each assertion file's `## Changelog` has its initial entry with the criteria-as-shipped baseline.

---

## Tasks

### Task 1: Read existing assertion-file shape

- **Files:**
  - `docs/media/story_evaluation.md` — read
  - `docs/media/brief_template.md` — read
  - `docs/media/citizen_selection.md` — read
- **Steps:**
  1. Identify the canonical section structure (Frontmatter → Goals → Criteria → Changelog).
  2. Note the changelog convention (per-cycle entries with severity flags + assertions).
  3. Note how criteria are written: testable, observable from outputs, no subjective phrasing like "good" without measurable definition.
- **Verify:** can articulate the assertion-file contract in ≤3 sentences.
- **Status:** [ ] not started

### Task 2: Read `/skill-check` internals

- **Files:**
  - `.claude/skills/skill-check/SKILL.md` — read
- **Steps:**
  1. Confirm the skill accepts arbitrary `<skill-name> <cycle>` args.
  2. Confirm it reads `docs/media/<skill>_evaluation.md` (or path-pattern match) for assertions.
  3. If hard-coded to write-edition + sift only, file as Open Question — task graph branches.
- **Verify:** know whether the skill is generic or hard-coded; if hard-coded, the wiring task expands.
- **Status:** [ ] not started

### Task 3: Draft `docs/media/city_hall_evaluation.md`

- **Files:**
  - `docs/media/city_hall_evaluation.md` — create
- **Steps:**
  1. Frontmatter per `[[SCHEMA]]`: title, created, updated, type=reference, tags=[civic, media, evaluation, active], sources, pointers.
  2. `## Goals` — what /city-hall is supposed to do at the level a grader can verify.
  3. `## Criteria` — testable assertions. Examples to start (refine in review):
     - "every pending decision in the cycle has a corresponding outcome written"
     - "every outcome references an engine-reachable effect (initiative state, approval delta, etc.)"
     - "the 9-member council is correctly identified — no fabricated names; no faction-bloc misalignment"
     - "vote math reconciles: all 9 members listed YES/NO/ABSENT; totals add up"
     - "no real-world Oakland institutions referenced (per [[../canon/CANON_RULES]])"
     - "Mayor speaks first; faction reactions cascade after; project agents report after; Clerk verifies last"
     - "production log emitted at canonical path `output/production_log_city_hall_c<XX>.md`"
  4. `## Changelog` — initial entry recording baseline.
- **Verify:** file exists; renders cleanly; criteria are observable from `output/production_log_city_hall_c<XX>.md`.
- **Status:** [ ] not started

### Task 4: Draft `docs/media/dispatch_evaluation.md`

- **Files:**
  - `docs/media/dispatch_evaluation.md` — create
- **Steps:**
  1. Frontmatter (same shape as Task 3).
  2. `## Goals` — what /dispatch is supposed to produce: immersive scene piece, one location, one moment.
  3. `## Criteria`:
     - "scene is one location (specific address or named place); no multi-location compositing"
     - "no character introduced with biographical data dump (no '34-year-old fourth-generation Oakland resident' bricks)"
     - "ends on an image, not a summary"
     - "scene length: 600-1200 words (refine after first cycle)"
     - "reporter pulled from canonical pool (DJ / Maria / Mason / Kai) or Tier-2 (Talia / Sharon / Tanya); off-pool requires explicit rationale per /sift transparency"
     - "format-contract compliance per [[../EDITION_PIPELINE]] §Published .txt Format Contract"
     - "no real-world Oakland institutions referenced"
  4. `## Changelog` — initial entry.
- **Verify:** file exists; criteria are observable from `editions/cycle_pulse_dispatch_c<XX>_<slug>.txt`.
- **Status:** [ ] not started

### Task 5: Draft `docs/media/interview_evaluation.md`

- **Files:**
  - `docs/media/interview_evaluation.md` — create
- **Steps:**
  1. Frontmatter (same shape as Tasks 3-4).
  2. `## Goals` — what /interview is supposed to produce: theme-driven Q&A grounded in canon, transcript + published article, world-altering canon possible.
  3. `## Criteria`:
     - "interview has a stated theme (the why-now of this conversation); not 'general check-in'"
     - "questions ground in canon — citizen's identity / recent decisions / faction position. No invented backstory."
     - "questions build on subject's answers (not pre-scripted unconditionally)"
     - "subject answers from their identity + recent decisions (matched against [[../canon/CANON_RULES]] Tier 1-2 protected entities)"
     - "transcript published as canon AND article frames the conversation for readers — both files exist at canonical paths"
     - "interviewer assignment uses `matchCitizenToJournalist_` archetype-match; off-archetype requires rationale"
     - "no real-world Oakland institutions referenced"
  4. `## Changelog` — initial entry.
- **Verify:** file exists; criteria are observable from `editions/cycle_pulse_interview_c<XX>_<subject>.txt` + transcript file.
- **Status:** [ ] not started

### Task 6: Verify or extend `/skill-check` wiring

- **Files:**
  - `.claude/skills/skill-check/SKILL.md` — read; modify only if hard-coded
- **Steps:**
  1. From Task 2: if `/skill-check` is generic (reads `docs/media/<skill>_evaluation.md` per skill-name arg), this task is verify-only — confirm it works for new files.
  2. If hard-coded to write-edition + sift only, extend the skill to dispatch on the skill-name arg, reading the corresponding evaluation file. Match existing pattern.
  3. Document: skill version bump + changelog entry naming city-hall / dispatch / interview as supported targets.
- **Verify:** `node scripts/skillCheck.js dispatch 93` (or equivalent) reads `docs/media/dispatch_evaluation.md` without error (even if no historical dispatch run exists — empty baseline).
- **Status:** [ ] not started

### Task 7: Smoke-test C93 historical runs

- **Files:**
  - none (read-only validation)
- **Steps:**
  1. `/skill-check city-hall 93` against `output/production_log_city_hall_c93.md`.
  2. Read output JSON; verify each criterion has a pass/fail with rationale.
  3. If any criterion is false-fail (the run actually met it but graded fail), refine the criterion in the assertion file.
  4. dispatch + interview have no C93 historical run; confirm graceful handling (graceful "no run found, skipping" or zero-output baseline).
- **Verify:** at least one of city-hall / dispatch / interview produces a non-empty graded output that aligns with what Mike or Mara would have said about the run.
- **Status:** [ ] not started

### Task 8: Verify post-publish Step 10 wires for new skills

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — read Step 10 section
- **Steps:**
  1. Confirm Step 10 invokes `/skill-check` for each skill that ran in the cycle.
  2. If hard-coded to write-edition + sift only, extend to include city-hall / dispatch / interview when their respective production logs exist.
  3. If already generic, confirm new skills will be picked up automatically.
- **Verify:** Step 10 invocation is generic OR has been extended to cover the new 3.
- **Status:** [ ] not started

### Task 9: Register MDs + update parent + close ROLLOUT row

- **Files:**
  - `docs/index.md` — add 3 entries
  - `docs/plans/skill-eval-framework.md` — append changelog entry
  - `docs/engine/ROLLOUT_PLAN.md` — flip `governance.2` state to in-progress (or done-pending-archive after Tasks 7-8 succeed)
  - `docs/engine/ROLLOUT_PLAN.md` — Changelog entry
- **Steps:**
  1. Add `docs/media/city_hall_evaluation.md`, `docs/media/dispatch_evaluation.md`, `docs/media/interview_evaluation.md` to `[[index]]` per S147.
  2. Append S<N> entry to `[[skill-eval-framework]]` Changelog: 3 new assertion files shipped + post-publish wiring verified.
  3. Update `governance.2` state in ROLLOUT.
- **Verify:** [[index]] catalog includes all 3 new files; [[skill-eval-framework]] changelog has new entry; ROLLOUT row state updated.
- **Status:** [ ] not started

---

## Open questions

- [ ] **Is `/skill-check` generic or hard-coded?** Task 2 resolves this. If hard-coded, Task 6 expands; if generic, Task 6 is verify-only. [Blocks Task 6 + 8.]
- [ ] **Where do civic evaluation files live?** Current proposal: `docs/media/city_hall_evaluation.md` (consistent with existing /sift /write-edition evaluation files in docs/media/). Alternative: new `docs/civic/` directory. Lean toward keeping in `docs/media/` for consistency with skill-check existing convention; revisit if other civic-specific evaluation docs accumulate. [Blocks Task 3.]
- [ ] **What's the criteria-refinement cadence?** Initial criteria are guesses. Per [[skill-eval-framework]] §6 the post-publish Step 10 grades against criteria + writes back to changelog. Question: who's the editorial authority for refining criteria after first run — research-build, media (Mags), Mike? Lean: Mags refines per cycle's evidence; Mike approves substantive shifts. [Blocks Task 7 follow-up if criteria need refinement.]

---

## Changelog

- 2026-05-10 — Initial draft (S212, research-build). Filed via [[../adr/0005-rollout-plan-structure]] §How to add work — `governance.2` ROLLOUT row points here. Validates the S212 filing protocol end-to-end (template copied, registered in index, back-linked from skill-eval-framework parent + ROLLOUT row). 9 tasks, 3 open questions, ~1-2 research-build sessions estimated total. T3-T5 (3 assertion files) is the load-bearing build; T7 smoke test surfaces criteria refinements.
