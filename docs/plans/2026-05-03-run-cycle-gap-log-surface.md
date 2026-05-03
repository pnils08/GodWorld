---
title: /run-cycle Gap-Log Observation Surface Plan
created: 2026-05-03
updated: 2026-05-03
type: plan
tags: [engine, infrastructure, architecture, draft]
sources:
  - SESSION_CONTEXT.md (S197 surfacing — meta-gap noted while triaging C93 gap logs)
  - .claude/terminals/engine-sheet/TERMINAL.md (no-new-MDs rule, S156)
  - output/production_log_*c93_*gaps.md (the 6 existing gap logs from other skills)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-05-03-c93-gap-triage-execution]] — Wave 4 parent"
  - "[[SCHEMA]] — doc conventions"
---

# /run-cycle Gap-Log Observation Surface Plan

**Goal:** Engine cycle work produces a quality observation surface (gap log) parallel to the 6 other skills, so engine-sheet's stripped-persona work doesn't lose feedback that could surface bugs before they compound across cycles.

**Architecture:** The C93 cycle produced 115 gaps across 6 skill runs (city-hall-prep, city-hall-run, sift, write-edition, post-publish, edition-print) — every skill except `/run-cycle` has a sidecar gap-log. Engine-sheet runs `/run-cycle` in stripped persona (no journal, no Supermemory saves, no MD creation per S156). Engine bugs go undocumented except in commit messages and short SESSION_CONTEXT pointers. This loses a feedback loop that would catch engine-cycle quality issues the same way the other skills' gap logs catch their issues. Resolve by carving out gap-log files as an explicit exception to "no new MDs" — they're operational artifacts, not bookkeeping ceremony.

**Terminal:** research-build (design + rule update) → engine-sheet (writes the gap log post-cycle); civic for /city-hall ↔ /run-cycle interaction validation

**Pointers:**
- Pattern reference: 6 existing gap logs in `output/production_log_*c93_*gaps.md` follow a consistent shape (G-{prefix}{N} numbering, severity tags, class taxonomy, fix-candidates, status line)
- Engine-sheet rule: `MEMORY.md` "Engine-sheet terminal: execute and commit, nothing else. Never create new .md files." — this plan proposes a single explicit exception
- Pattern source: research-build, media, civic terminals all produce gap logs as part of their normal close

**Acceptance criteria:**
1. After `/run-cycle <XX>` completes, engine-sheet writes `output/production_log_run_cycle_c<XX>_gaps.md` capturing any quality issues observed during the run (ailment generation oddities, ledger writeback drift, phase-skip surprises, math anomalies, etc.).
2. Gap log follows same shape as other 6 logs: severity tags (HIGH/MED/LOW), class taxonomy, G-EC{N} numbering (E for Engine, C for Cycle), per-entry Status line.
3. Engine-sheet TERMINAL.md updated to allow this single MD-creation exception (or equivalent rule relaxation) without weakening the broader "no new MDs" hygiene.
4. C94 cycle produces the first run-cycle gap log; if zero gaps, the file states "0 gaps observed" explicitly (vs being absent, which is ambiguous).

---

## Phase 1 — Design (research-build)

### Task 1.1: Resolve the rule-relaxation approach

- **Question:** Engine-sheet TERMINAL.md says "Never create new .md files." How is this exception phrased?
- **Recommended:** explicit carve-out — "Exception: gap-log sidecar files at `output/production_log_*_gaps.md` are operational artifacts, not bookkeeping ceremony. Engine-sheet may create them post-cycle as part of /run-cycle close. They are gitignored (output/* per .gitignore) so they don't touch git scope; they exist for the next research-build session to triage."
- **Output:** rule text addition to `.claude/terminals/engine-sheet/TERMINAL.md`.
- **Status:** [ ] not started

### Task 1.2: Resolve the class taxonomy for engine-cycle gaps

- **Question:** What classes of gap exist in engine-cycle work? (Other skills use: pipeline-fragility, user-soft, process-gap, quiet-pipe, canon-risk, schema-risk OR DOC, CMD, DATA, PARSE, API, GATE, CONV)
- **Recommended:** new taxonomy fitted to engine concerns — `phase-skip` (a phase silently no-op'd), `writeback-drift` (sheet write didn't persist as expected), `cohort-collision` (one engine clobbered another's mid-cycle state — Phase 42 §5.6 class), `math-anomaly` (numeric output outside expected range), `determinism-break` (Math.random or non-rng leak), `phase-ordering` (a phase ran before its dependencies), `silent-fail` (engine returned without error but didn't do its work), `cross-cycle-debt` (a fix in cycle N broke something in cycle N+1).
- **Output:** taxonomy section at top of run-cycle gap log template.
- **Status:** [ ] not started

### Task 1.3: Resolve who writes the gap log

- **Question:** Engine-sheet is stripped persona. Does the gap log get written by:
  - (a) Engine-sheet manually as part of /run-cycle close (matches the pattern of other terminals)
  - (b) Automated diagnostics — a `engineCycleAudit.js` script runs after /run-cycle and produces the gap log structurally from logs + ledger inspection
  - (c) Hybrid — script produces a baseline gap log with mechanical findings; engine-sheet adds judgment-layer entries (the "this felt off" gaps)
- **Recommended:** (c) hybrid. Script catches the structural gaps (cohort collisions, phase skips, writeback drifts that show up in logs); engine-sheet adds the judgment layer at close.
- **Output:** decision + initial scope for `engineCycleAudit.js` if (b) or (c) chosen.
- **Status:** [ ] not started

### Task 1.4: Resolve when triage promotes engine-cycle gaps to ROLLOUT

- **Question:** Other skill gap logs get triage entries in ROLLOUT during research-build sessions. Engine-cycle gaps follow the same pattern? Or do they get triaged into PHASE_*_PLAN docs (which engine-sheet owns)?
- **Recommended:** ROLLOUT pointer same as other gap logs — keeps the cross-skill pattern consistent. Phase-specific findings get cross-referenced into PHASE_*_PLAN as needed.
- **Status:** [ ] not started

---

## Phase 2 — Build (research-build + engine-sheet)

### Task 2.1: Update engine-sheet TERMINAL.md with rule exception

- **Files:**
  - `.claude/terminals/engine-sheet/TERMINAL.md` — modify
- **Steps:**
  1. Add §Operational Artifacts section: gap-log files at `output/production_log_*_gaps.md` are an explicit exception to "no new MDs" rule
  2. Cross-reference this plan
- **Verify:** grep for `gap-log` in TERMINAL.md returns ≥1 hit
- **Status:** [ ] not started

### Task 2.2: Update MEMORY.md inline note

- **Files:**
  - `/root/.claude/projects/-root-GodWorld/memory/MEMORY.md` — modify the engine-sheet rule entry
- **Steps:**
  1. Append exception clause to the inline engine-sheet rule
- **Verify:** MEMORY.md engine-sheet rule mentions gap-log exception
- **Status:** [ ] not started

### Task 2.3: Write run-cycle gap-log template

- **Files:**
  - `.claude/skills/run-cycle/SKILL.md` — modify (add §Step N "Gap Log Close" section)
- **Steps:**
  1. After /run-cycle completes, engine-sheet creates `output/production_log_run_cycle_c<XX>_gaps.md` with template header (taxonomy + severity + numbering scheme)
  2. Even if 0 gaps: file states "0 gaps observed" with the cycle's headline metrics for context
- **Verify:** /run-cycle SKILL.md has Step N "Gap Log Close"
- **Status:** [ ] not started

### Task 2.4: (Optional, per Phase 1 Task 1.3 outcome) Build `engineCycleAudit.js`

- **Files:**
  - `scripts/engineCycleAudit.js` — create (engine-sheet)
- **Steps:**
  1. Read latest cycle's engine logs
  2. Run mechanical checks: phase skip detection, ledger writeback drift, cohort collision flags, math anomalies vs prior cycle baselines
  3. Output structured baseline `output/production_log_run_cycle_c<XX>_gaps.md` (with `[mechanical]` flag on entries; engine-sheet adds `[judgment]` entries on top)
- **Status:** [ ] not started — gated on Phase 1 Task 1.3 decision

---

## Phase 3 — Validation (engine-sheet)

### Task 3.1: Run /run-cycle C94 with gap-log close active

- **Acceptance criteria 1-4 above all hold**
- First run-cycle gap log produced; ROLLOUT entry filed pointing at it
- **Status:** [ ] not started

---

## Open questions

- [ ] Phase 1 Task 1.1 — exact rule-exception wording for engine-sheet TERMINAL.md
- [ ] Phase 1 Task 1.2 — engine-cycle gap class taxonomy (recommended set provided)
- [ ] Phase 1 Task 1.3 — manual-only / script-only / hybrid (recommended: hybrid)
- [ ] Phase 1 Task 1.4 — triage destination (recommended: same ROLLOUT pattern as other gap logs)

---

## Changelog

- 2026-05-03 — Initial draft (S197). Wave 4 of [[plans/2026-05-03-c93-gap-triage-execution]]. Status: DRAFT — Phase 1 open questions must resolve before Phase 2 starts. Surfaced as a meta-gap during S197 triage: 6 of 7 active skills produce gap logs, /run-cycle does not, engine bugs go undocumented.
