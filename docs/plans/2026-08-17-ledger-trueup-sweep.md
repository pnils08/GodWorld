---
title: Ledger true-up sweep — the defect classes no open row covers
created: 2026-08-17
updated: 2026-08-17
type: plan
tags: [engine, ledger, active]
sources:
  - output/ledger_trueup_audit_2026-08-17.md — measured counts, all 10 classes
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.117 parent row"
  - "[[2026-08-11-careerstage-salary-coherence]] — covers classes 1–3 (reverted, unrepaired)"
  - "[[2026-08-09-wealthlevel-networth-bands]] — covers classes 4–5"
  - "[[2026-08-17-sheet-weight-reduction]] — the workbook weight that made hand-editing unusable"
---

# Ledger true-up sweep

## Why

Hand-truing 961 rows in the browser is what put Mike in the sheet for twelve hours and cost him the
edits when the tab desynced. The defects are real — **348 of 961 rows (36.2%) carry at least one** —
but they are mechanical classes, not per-row judgment. Anything mechanical belongs in a script with
a dry-run and a read-back, not in a filter view.

Measured counts: [[../../output/ledger_trueup_audit_2026-08-17]].

## Scope — only what no open row covers

engine.82 owns CareerStage enum + stage-vs-role. The wealth/net-worth bands plan owns `WealthLevel`
and `NetWorth`. This row owns the remainder:

### Task 1 — `SchoolQuality` (909 of 961 rows unusable)

306 blank, 603 pinned at the default `5`. Only 52 rows carry a differentiated value, so the column
currently contributes no causal signal anywhere it is read. Decide first whether it is a *causal
input* (per universal-protagonism: does it drive a fate?) or dead schema. If causal: derive from
neighborhood + household wealth through one shared helper at every write site. If not: retire the
column rather than backfill 909 rows of noise.

### Task 2 — `MigrationIntent` on retired/deceased citizens (37 rows)

All 37 read `staying`. A deceased citizen holding a migration intent is a state machine that never
cleared. Find the writer, clear intent on the Status transition, one-time column repair for the
existing 37.

### Task 3 — `World_Config` has no machine-readable sim year

An audit asking for the current year got `FALSE`. Every age-derived rule (senior status, school
enrolment, retirement) needs one authoritative anchor; today it is a convention carried in memory
(`age = simYear − BirthYear`) rather than a value the code can read. Close this **before** any
age-derived repair, or the repair encodes the wrong anchor into 961 rows.

### Task 4 — impossible BirthYear (1 row)

POP-00173 Kaila Braun b.1889 → age 153. Single-row fix; add a range guard at the write sites so the
class cannot recur.

## Sequencing

Task 3 first — it is the anchor the others derive from. Then Task 2 (smallest, cleanest), Task 4,
then Task 1's decision. engine.82's re-audit is a prerequisite for touching CareerStage at all: its
headline numbers (217 false-retired, 5 athlete-students) no longer match live state (43, 2).

## Acceptance

- Every repair runs dry-run → read-back verify, never a blind write. `updateRangeByPosition`
  `startCol` is **0-indexed** (`lib/sheets.js:589`) — the S366 incident clobbered 940 YearsInCareer
  cells on exactly that off-by-one. Column index asserted against the header row before any `--apply`.
- Defect rate re-measured after each task with the same audit script.

## State

Audited S378, unstarted. Awaiting Mike's go on scope — specifically the Task 1 causal-input-or-retire
decision, which is a design call, not a mechanism call.

## Changelog

- 2026-08-17 (S378) — plan created from the live audit; scope cut to the classes no open row covers.
