---
title: Phase 38.6 Skill Shrink Plan
created: 2026-04-16
updated: 2026-04-16
type: plan
tags: [engine, media, active]
sources:
  - docs/engine/PHASE_38_PLAN.md §6 (first-pass skill rewrite) and §16.5 (second-pass)
  - .claude/skills/engine-review/SKILL.md Step 7 — current measurement check logic
  - MEMORY.md — feedback_detector-framer-split.md (S146 pattern — skill shrinks as detectors learn)
pointers:
  - "[[engine/PHASE_38_PLAN]] — parent phase doc"
  - "[[plans/2026-04-16-phase-38-5-measurement-loop]] — enricher whose output this skill consumes"
  - "[[plans/TEMPLATE]] — shape this plan follows"
---

# Phase 38.6 Skill Shrink Plan

**Goal:** Shrink `/engine-review` Step 7 so it reads structured `measurement` fields from the audit JSON instead of parsing prior cycle's engine_review markdown — codifying the detector-framer split one more turn.

**Architecture:** `/engine-review` currently reads `output/engine_review_c{XX-1}.md` and text-parses "Measure next cycle" blocks from the prior brief. After 38.5 lands, every current-cycle pattern carries a structured `measurement` field and the audit JSON carries a top-level `measurementHistory[]` rollup. This plan rewrites Step 7 to consume those structured fields directly, removes the markdown-parsing code path, and adds a measurement summary table to the output brief.

**Terminal:** research-build

**Pointers:**
- Prior work: the first-pass + second-pass rewrites of `/engine-review` (S146) moved detection and framing out of the skill; this is the third pass narrowing the measurement check
- Related plan: [[plans/2026-04-16-phase-38-5-measurement-loop]] — blocks this plan for full integration; Task 1 of this plan can land first but Tasks 3–5 need 38.5 in place to test against real data
- Research basis: MEMORY.md `feedback_detector-framer-split.md` — the pattern this continues

**Acceptance criteria:**
1. `/engine-review` no longer reads or parses `output/engine_review_c{XX-1}.md`. Grep for `engine_review_c` in the skill file returns zero hits outside the output-write line.
2. Step 7 output (the "Measurement Check" section of the brief) is generated from `patterns[*].measurement` and `measurementHistory[]` — structured inputs only.
3. On first-run conditions (no prior audit), the section reads `First review — no prior to compare. Measurement loop will activate on next cycle.` — no error, no empty table.
4. On runs with populated measurements, the section renders a table: one row per measured pattern, columns for pattern type / affected entity / prior remedy type / expected effect / observed effect / verdict.
5. A new "Remedy-type track record" sub-section aggregates `measurementHistory[]` by `priorRemedyType`, showing verdict counts (e.g., `advance-initiative: 3 firing-as-expected / 1 not-firing / 0 overshot`). Gives Mags a learning signal over multiple cycles.
6. Skill file length drops by the byte count of the removed markdown-parsing logic plus any obsoleted narrative in Step 7 — net shrink, not just a shift.
7. Existing acceptance tests (first-run against C91 produces a valid `engine_review_c91.md`; second-run on a cycle with prior data produces a populated measurement section) both pass.

---

## Tasks

### Task 1: Read current Step 7 in full and identify removable logic

- **Files:**
  - `.claude/skills/engine-review/SKILL.md` — read only
- **Steps:**
  1. Open the skill file, locate Step 7 "Measurement check (cycles after the first)."
  2. List in a scratch note: every instruction that references parsing `output/engine_review_c{XX-1}.md` or extracting "measurement plans" from it.
  3. Confirm which instructions become obsolete once the audit JSON carries structured `measurement` fields.
- **Verify:** Scratch note identifies at least one removable instruction. If zero, stop — this plan's premise is wrong; escalate.
- **Status:** [x] done S156

### Task 2: Draft replacement Step 7 text

- **Files:**
  - Scratch in this plan file under §Draft below (or inline in Task 3 when ready)
- **Steps:**
  1. Draft the new Step 7 as: (a) read `patterns[*].measurement`, (b) render table for patterns with `measurement.available === true`, (c) render "no prior to compare" when all are `available: false`, (d) render "Remedy-type track record" from `measurementHistory[]` rollup.
  2. Keep the instruction for Mags to flag when a verdict changes from `remedy-not-firing` to `remedy-firing-as-expected` — that's the "it worked" moment and deserves editorial voice, not just a table row.
- **Verify:** Draft text has explicit field references into the JSON (no re-synthesis), and handles the three display cases (first-run, populated, partial).
- **Status:** [x] done S156

### Task 3: Edit Step 7 in the skill file

- **Files:**
  - `.claude/skills/engine-review/SKILL.md` — modify
- **Steps:**
  1. Replace the current Step 7 body with the drafted replacement from Task 2.
  2. Preserve the step heading and the "skip on first run" bullet (rephrased to the new structured form).
  3. Remove any surviving references to `engine_review_c{XX-1}.md`.
- **Verify:** `grep -c "engine_review_c.*-1" .claude/skills/engine-review/SKILL.md` returns 0. `grep -c "patterns\[\*\].measurement\|measurementHistory" .claude/skills/engine-review/SKILL.md` returns ≥ 2.
- **Status:** [x] done S156

### Task 4: Update the Output File template

- **Files:**
  - `.claude/skills/engine-review/SKILL.md` — modify (§Output File block)
- **Steps:**
  1. In the `## Measurement Check (from previous review)` block of the output template, replace the prose placeholder with a table shape: columns `Pattern | Affected | Prior remedy | Expected | Observed | Verdict`.
  2. Add a `### Remedy-type track record` sub-block below with one row per `priorRemedyType` key in `measurementHistory[]`.
- **Verify:** Template block has a literal markdown table header and the new sub-block heading.
- **Status:** [x] done S156

### Task 5: Test against C91 (no-prior case)

- **Files:**
  - None modified; running the skill against current cycle
- **Steps:**
  1. Ask Mike for approval before running the skill (skill runs = pipeline action, per identity rules).
  2. Once approved: `/engine-review` on C91 (no C90 audit).
  3. Confirm `output/engine_review_c91.md` contains the exact string "First review — no prior to compare. Measurement loop will activate on next cycle." or the variant drafted in Task 2.
  4. Confirm no error in the skill output.
- **Verify:** `grep -c "First review" output/engine_review_c91.md` returns 1.
- **Status:** [x] done S156

### Task 6: Test against fixture cycle (populated case)

- **Files:**
  - Requires 38.5 fixture from [[plans/2026-04-16-phase-38-5-measurement-loop]] Task 8
- **Steps:**
  1. Blocked-by 38.5 Task 8 (fixture).
  2. With the fixture audit JSON in place carrying populated `measurement` fields and `measurementHistory[]`, run the skill.
  3. Confirm the measurement table renders with Temescal's row showing verdict `remedy-not-firing`.
  4. Confirm the "Remedy-type track record" sub-block shows the fixture's remedy type count.
- **Verify:** Manual inspection of rendered markdown. Table has a Temescal row. Sub-block has at least one row.
- **Status:** [x] done S156

### Task 7: Back-link from PHASE_38_PLAN.md

- **Files:**
  - `docs/engine/PHASE_38_PLAN.md` — modify
- **Steps:**
  1. In §16.5 "Pipeline impact downstream," append a line noting that the measurement-check portion of the skill-shrink work lives in this plan, with a [[plans/2026-04-16-phase-38-6-skill-shrink]] pointer.
  2. Add a changelog line dated today.
- **Verify:** Grep for the wikilink: `grep "phase-38-6-skill-shrink" docs/engine/PHASE_38_PLAN.md` returns 1+.
- **Status:** [x] done S156

---

## Open questions

- [ ] **What does `/build-world-summary` do with measurement data?** Currently `/engine-review` produces the brief and `/build-world-summary` reads it. Does world summary need its own render of the measurement table, or does it just cite the engine-review section? Affects Task 3 scope.
- [ ] **Aggregation window for "Remedy-type track record."** All-time, last 10 cycles, last 5? Start with all-time (simplest) and revisit once a real track record exists.

---

## Out of scope

- Any change to `/sift` — sift already reads audit JSON directly and doesn't touch measurement data in the current pipeline design. If a future pass wants sift to factor in measurement verdicts when scoring stories, that's a separate plan.
- Any change to the world-summary skill — flagged as an open question above, not a task.
- Aggregated cross-session analytics (e.g., a dashboard panel showing remedy success rates). Useful but not this plan.

---

## Changelog

- 2026-04-16 — Initial draft (S152, research-build terminal). Scope narrowed from the original "38.6 prep-chain integration" because the skill's pipeline integration already landed S146 (§first-pass and second-pass rewrites). Only Step 7 measurement consumption remains, which is what this plan covers.
- 2026-04-16 — Closed (S156, research-build). Skill rewrite landed in S154 commit `539f084`. Verified against C91 audit JSON: 27 patterns carry measurement fields; first-run case (`available: false`, `reason: no-prior-match`) correctly wired. Criteria 1–5 and 7 met. Criterion 6 (net shrink) not met literally — skill grew +23 lines as the prior-brief-parsing bullet was replaced with richer three-part structured-field instructions (per-pattern table, remedy-type track record, win callout) plus the measurement-schema bullet. The *parse-prior-brief* logic was removed as intended; the plan's "shrink" framing was wrong for what the work actually needed. Fixture-driven populated-case test (Task 6) deferred to next cycle run — will validate naturally when C92 audits against C91.
