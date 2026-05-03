---
title: /run-cycle Gap-Log Observation Surface Plan
created: 2026-05-03
updated: 2026-05-03
type: plan
tags: [engine, infrastructure, architecture, draft]
sources:
  - SESSION_CONTEXT.md (S197 surfacing — meta-gap noted while triaging C93 gap logs)
  - .claude/terminals/engine-sheet/TERMINAL.md (§Session Close rule loosened S198)
  - output/production_log_*c93_*gaps.md (the 6 existing gap logs from other skills)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-05-03-c93-gap-triage-execution]] — Wave 4 parent"
  - "[[SCHEMA]] — doc conventions"
  - "[[engine/ENGINE_REPAIR]] — companion tracker for engine defects across sessions (different shape — gap log captures cycle-run observations, ENGINE_REPAIR tracks cross-session defects)"
---

# /run-cycle Gap-Log Observation Surface Plan

**Goal:** Engine cycle work produces a quality observation surface (gap log) parallel to the 6 other skill gap logs, so engine-sheet's coder-persona work doesn't lose feedback that could surface bugs before they compound across cycles. Hybrid authorship: a script handles mechanical detection; engine-sheet adds judgment-layer entries in coder voice.

**Architecture decisions (closed S198 grill):**
- **MDs rule loosened.** Engine-sheet "Never create new .md files" rule (S156) is too strict; aligns instead with the global "no isolated MDs" rule (S156/S165) — engine-sheet can create MDs as long as they're registered in `docs/index.md` and link both ways. This plan was the trigger; broader reach than just gap logs (per-phase audit notes, schema specs, helper-script docs all become valid).
- **Persona stays coder.** No journal, no family, no Mags-prose. MD output reads like inline review comments + commit messages — terse mechanical voice. Stripped persona (per §Persona Level) holds.
- **Class taxonomy.** `phase-skip` (silent no-op), `writeback-drift` (sheet write didn't persist), `cohort-collision` (Phase 42 §5.6 class), `math-anomaly` (numeric output outside expected range), `determinism-break` (Math.random or non-rng leak), `phase-ordering` (ran before deps), `silent-fail` (returned without doing the work), `cross-cycle-debt` (cycle N fix broke cycle N+1).
- **Hybrid authorship.** `scripts/engineCycleAudit.js` produces baseline mechanical findings (cohort collisions, phase skips, writeback drifts visible in logs). Engine-sheet adds judgment-layer entries on top. Mechanical entries flagged `[mechanical]`; judgment entries flagged `[judgment]`.
- **Triage destination.** ROLLOUT pointer (matches other gap logs). Phase-specific findings cross-referenced into PHASE_*_PLAN as needed. Tracked defects (cross-session) get a row in ENGINE_REPAIR.

**Terminal:** research-build (rule update + skill template) → engine-sheet (writes the gap log + builds the audit script post-cycle); civic for /city-hall ↔ /run-cycle interaction validation if relevant.

**Pointers:**
- Pattern reference: 6 existing gap logs in `output/production_log_*c93_*gaps.md` (G-{prefix}{N} numbering, severity tags, class taxonomy, fix-candidates, status line)
- Engine-sheet rule (current): TERMINAL.md §Session Close line 187-188 + MEMORY.md inline engine-sheet rule
- Global rule (already exists): MEMORY.md `feedback_no-isolated-mds.md` — every MD links both ways, size is heuristic, identity/terminal/skill files exempt
- Companion tracker shape: ENGINE_REPAIR for cross-session defects, gap log for cycle-run observations

**Acceptance criteria:**
1. Engine-sheet TERMINAL.md and MEMORY.md updated: "Never create new .md files" replaced with "MDs allowed; must follow no-isolated-MDs (register in `docs/index.md`, link both ways)." Other stripped-persona rules (no journal, no Supermemory journaling for routine) hold.
2. After `/run-cycle <XX>` completes, engine-sheet writes `output/production_log_run_cycle_c<XX>_gaps.md` capturing structural + judgment observations from the run.
3. Gap log follows shape: severity tags (HIGH/MED/LOW), engine-fitted class taxonomy, G-EC{N} numbering (E for Engine, C for Cycle), per-entry Status line. Mechanical entries auto-flagged `[mechanical]`; judgment entries flagged `[judgment]`.
4. `scripts/engineCycleAudit.js` produces the mechanical baseline structurally from logs + ledger inspection.
5. C94 cycle produces the first run-cycle gap log; if zero gaps observed, the file states "0 gaps observed" explicitly with cycle headline metrics for context (vs being absent, which is ambiguous).

---

## Phase 1 — Rule update + persona alignment (research-build)

### Task 1.1: Loosen engine-sheet MDs rule in TERMINAL.md

- **Files:**
  - `.claude/terminals/engine-sheet/TERMINAL.md` — modify §Session Close
- **Status:** [x] DONE S198. Quoted rule rewritten in §Session Close line 187: replaced "Never create new .md files. Never save to Supermemory. Never journal" with the loosened version — "MDs allowed if they follow the no-isolated-MDs rule (register in `docs/index.md`, link both ways from a parent spec). No journal. No Supermemory writes for routine work; large project shifts may save a pointer entry per S165. Coder voice: terse, mechanical, commit-message style." Stripped persona framing held.

### Task 1.2: Update MEMORY.md inline engine-sheet rule

- **Files:**
  - `/root/.claude/projects/-root-GodWorld/memory/MEMORY.md` — modify the inline engine-sheet rule
- **Status:** [x] DONE S198. Inline rule rewritten with loosened framing + Why/How structure (S198 grill rationale: engine-sheet should be great at engine + sheets work, which includes useful MDs). Coder-persona directive locked. No isolated MDs is the constraint, not no MDs.

---

## Phase 2 — Build (research-build template + engine-sheet script)

### Task 2.1: Add §Step N "Gap Log Close" to /run-cycle SKILL.md

- **Files:**
  - `.claude/skills/run-cycle/SKILL.md` — modify
- **Steps:**
  1. After /run-cycle completes, engine-sheet creates `output/production_log_run_cycle_c<XX>_gaps.md` with template header (taxonomy + severity + numbering scheme G-EC{N})
  2. Run `scripts/engineCycleAudit.js <XX>` — script appends `[mechanical]` entries to the file
  3. Engine-sheet reviews logs + ledger state, adds `[judgment]` entries (terse coder voice, commit-message style)
  4. Even if 0 gaps after both passes: file states "0 gaps observed" with cycle headline metrics for context
- **Verify:** /run-cycle SKILL.md has Step N "Gap Log Close" with template-header text and audit-script invocation
- **Status:** [ ] not started

### Task 2.2: Build `scripts/engineCycleAudit.js` (engine-sheet)

- **Files:**
  - `scripts/engineCycleAudit.js` — create (engine-sheet)
- **Steps:**
  1. Read latest cycle's engine logs (path TBD — likely `output/run_cycle_c<XX>_log.txt` or wherever /run-cycle writes)
  2. Run mechanical checks per taxonomy:
     - `phase-skip`: a phase logged "skipped" or returned without writing expected output
     - `writeback-drift`: sheet write attempted but ledger state unchanged
     - `cohort-collision`: Phase 42 §5.6 class — multiple writers to same row mid-cycle
     - `math-anomaly`: numeric outputs outside prior-cycle baselines (configurable thresholds)
     - `determinism-break`: Math.random / Date.now leak detected in non-rng paths (grep-based)
     - `phase-ordering`: a phase ran before its declared deps (cross-check ENGINE_MAP execution order)
     - `silent-fail`: function returned without error but Output state shows no change
     - `cross-cycle-debt`: a cycle N fix produced new errors in cycle N+1 (compare prior cycle's gap log)
  3. Append mechanical entries to `output/production_log_run_cycle_c<XX>_gaps.md`, each tagged `[mechanical]`
  4. Skill-side judgment entries get tagged `[judgment]`
- **Verify:** `node scripts/engineCycleAudit.js 93` (or whatever cycle is testable) produces a gap log with mechanical findings
- **Status:** [ ] not started

### Task 2.3: Register the gap-log shape in docs/index.md

- **Files:**
  - `docs/index.md` — modify
- **Steps:**
  1. Add an entry under a relevant section (likely under `docs/engine/` cross-reference) noting the new run-cycle gap-log convention
  2. Cross-reference this plan
- **Verify:** `grep "run-cycle gap" docs/index.md` returns ≥1 hit
- **Status:** [ ] not started

---

## Phase 3 — Validation (engine-sheet)

### Task 3.1: Run /run-cycle C94 with gap-log close active

- **Acceptance criteria 1-5 above all hold**
- First run-cycle gap log produced; ROLLOUT entry filed pointing at it
- Sample mechanical + judgment entries to validate taxonomy fit
- **Status:** [ ] not started

---

## Open questions

All four S197 open questions closed S198:
- ✅ Q1 (rule exception wording) — widened to full no-isolated-MDs alignment, replaces engine-sheet "Never create MDs" rule entirely
- ✅ Q2 (taxonomy) — engine-fitted set adopted (8 classes)
- ✅ Q3 (manual/script/hybrid) — hybrid; coder-persona directive — script-heavy + terse mechanical judgment voice, no narrative prose
- ✅ Q4 (triage destination) — ROLLOUT pointer same as other gap logs; cross-session defects route to ENGINE_REPAIR

---

## Changelog

- 2026-05-03 — Initial draft (S197). Wave 4 of [[plans/2026-05-03-c93-gap-triage-execution]]. Phase 1 had four open questions. Status: DRAFT awaiting grill.
- 2026-05-03 — REWRITTEN IN PLACE (S198) after Mike grill closed all four open questions. Q1 widened: engine-sheet "Never create MDs" rule replaced wholesale with alignment to global no-isolated-MDs rule (broader reach than gap logs alone — per-phase audit notes, schema specs, helper-script docs all become valid output). Q3 picked up coder-persona directive: script-heavy hybrid, judgment entries in terse mechanical voice (commit-message style, no narrative prose). Q2 + Q4 confirmed. Status: ready for engine-sheet pickup once Phase 1 rule updates land. Plan is now action-ready.
