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
- **Status:** [x] DONE S199. §Step 6 "Gap Log Close (engine-sheet)" added between Step 5 and "What Happens After". Wires `node scripts/engineCycleAudit.js {XX} --write` invocation, documents `[mechanical]` vs `[judgment]` tag convention, footer-marker preservation across re-runs, 0-gap explicit-statement requirement, ROLLOUT pointer template for HIGH-severity findings, plan back-link.

### Task 2.2: Build `scripts/engineCycleAudit.js` (engine-sheet)

- **Files:**
  - `scripts/engineCycleAudit.js` — create (engine-sheet)
- **Status:** [x] DONE S199. ~285-line script. **V1 classes (4) ingest existing repo artifacts:** `writeback-drift` + `math-anomaly` + `cross-cycle-debt` from typed patterns in `output/engine_audit_c<XX>.json` (engineAuditor 1.0.0 already produces these — script maps `type=writeback-drift` → writeback-drift, `type=math-imbalance` → math-anomaly, `type=stuck-initiative cyclesInState>=2` → cross-cycle-debt with severity scaling by debt depth); `determinism-break` from `Math.random` sweep across `phase*/**/*.js` (filters comment + throw-guard lines per S156 Phase 40.3 fix). **V2-pending classes (4):** `phase-skip` / `cohort-collision` / `phase-ordering` / `silent-fail` — all need Apps Script execution-log capture into the local repo (currently /run-cycle Step 3 runs engine in Google's cloud and does not persist execution logs locally). Stubs flagged INFO with reason. **Output features:** severity-sorted (HIGH > MED > LOW > INFO), G-EC{N} numbering, per-entry source-artifact link, headline-metrics block from engineAuditor summary, footer marker preserves judgment-layer entries across re-runs, dry-run by default (--write to persist). C93 dry-run: 23 mechanical entries surfaced (7 HIGH / 16 MED), correctly flagging Transit Hub stuck-initiative + coverage writeback drift + Math.random hits.

### Task 2.3: Register the gap-log shape in docs/index.md

- **Files:**
  - `docs/index.md` — modify
- **Status:** [x] DONE S199. Existing `[[plans/2026-05-03-run-cycle-gap-log-surface]]` entry rewritten with Phase 2 SHIPPED state, names `scripts/engineCycleAudit.js` inline (the script's inbound link from the parent spec, satisfying no-isolated-MDs even though the script isn't an MD), tags shifted `(plan, engine, infrastructure, architecture, draft)` → `(... active)`. SKILL.md change is exempt per global rule (skill files exempt from no-isolated-MDs).

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
- 2026-05-03 — Phase 2 SHIPPED S199 (engine-sheet). Tasks 2.1 + 2.2 + 2.3 all DONE. `scripts/engineCycleAudit.js` ~285 LOC implementing 4 V1 classes (writeback-drift, math-anomaly, cross-cycle-debt, determinism-break) + 4 V2-pending stubs awaiting engine-run-log ingest path. `/run-cycle` SKILL.md gained §Step 6 "Gap Log Close" wiring the script invocation. `docs/index.md` plan entry rewritten with Phase 2 SHIPPED state + tag flipped `draft → active`. C93 dry-run produced 23 mechanical entries (7 HIGH / 16 MED) — Transit Hub stuck-initiative correctly flagged (89 cycles in vote-ready), coverage writeback drift correctly flagged (14/17 neighborhoods flat), Math.random sweep flagged 13 hits across phase01/04/05 worth follow-up audit. Phase 3 (validation) pending next /run-cycle invocation against the live engine.
