---
title: Ledger true-up sweep — the defect classes no open row covers
created: 2026-08-17
updated: 2026-08-22
type: plan
tags: [engine, ledger, done]
sources:
  - output/ledger_trueup_audit_2026-08-17.md — measured counts, all 10 classes
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.117 parent row"
  - "[[2026-08-21-citizen-archive]] — engine.90 Citizen Archive (sibling; not this sweep)"
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

- **Status (S431, engine-sheet, 2026-09-06): RESOLVED BY DESIGN — no sweep.** The decide-first question is answered in code: `SchoolQuality` IS a causal input, for minors — written by `updateMinorSchoolQuality_` (educationCareerEngine.js L670, engine.57 P4: household minors stamped from Neighborhood_Demographics `SchoolQualityIndex`, heritage notch engine.65) and read at graduation by `graduationCredential_` (generationalEventsEngine.js L455, S409 four-year vs associate's). Adult cells (the 909 blank/5) are legacy by design — the column has no adult reader, so backfilling them is noise, not signal. Citizen Archive's `citizenExitDefects_` already names blank/5 as an exit defect for the record. Retire-the-column is not on the table while the minor path reads it.

### Task 2 — `MigrationIntent` on retired/deceased citizens (37 rows)

All 37 read `staying`. A deceased citizen holding a migration intent is a state machine that never
cleared. Find the writer, clear intent on the Status transition, one-time column repair for the
existing 37.

- **Status: SHIPPED S380 (37 cells cleared); writer-side clear superseded S431** — the migration engine skips `deceased`/`traded` rows at all three loops (migrationTrackingEngine.js L234/L406/L640, engine.90 C8) and a deceased row leaves the ledger through Citizen Archive with its defects named (`citizenExitDefects_`), so no death-site clear is needed. Re-measured S431: intent on non-active = Retired 6 / critical 1 / recovering 1 — all living statuses the engine still processes, legitimate state, not the defect class.

### Task 3 — `World_Config` has no machine-readable sim year

An audit asking for the current year got `FALSE`. Every age-derived rule (senior status, school
enrolment, retirement) needs one authoritative anchor; today it is a convention carried in memory
(`age = simYear − BirthYear`) rather than a value the code can read. Close this **before** any
age-derived repair, or the repair encodes the wrong anchor into 961 rows.

- **Status: SHIPPED S380** — `worldYearBase=2039` on World_Config; engine reads `simYearOf_()` (advanceSimulationCalendar.js L371, S.simYear from Phase 1, cycle-derived fallback L357). Re-measured S431: present.

### Task 4 — impossible BirthYear (1 row)

POP-00173 Kaila Braun b.1889 → age 153. Single-row fix; add a range guard at the write sites so the
class cannot recur.

- **Status: SHIPPED S380** — POP-00173 1889→1989 (re-read S431: 1989). Guard: `auditSimulationLedger.js` BirthYear OOB — S431 closed a hole where a non-numeric cell (`2--6`, POP-01083 hand-mint typo) passed as falsy NaN; now flagged. POP-01083's true year is a sports-roster fact (gap log G-EC58).

## Batch shape — by issue, not by ClockMode (measured S378)

Defect rates cross-tabbed against ClockMode. The two dominant classes are uniform across every
group, so a per-group pass would fix the same bug four times:

| check | CIVIC (53) | ENGINE (765) | GAME (99) | MEDIA (44) | all |
|---|---|---|---|---|---|
| SchoolQuality unusable | 100% | 96% | 89% | 84% | **95%** |
| CareerStage non-canonical | 45% | 45% | 72% | 48% | **48%** |
| NetWorth blank | 0% | 12% | 0% | 2% | 10% |
| EmployerBizId blank w/ role | 0% | 9% | 0% | 0% | 7% |
| MigrationIntent on retired/deceased | 0% | 5% | 1% | 0% | 4% |

ClockMode grouping is the right unit for *authoring* role structure — it keeps an industry
internally consistent. It is the wrong unit for *defect repair*: only the small classes are
ENGINE-local, and the two that dominate are everywhere. One pass per issue across all 961 rows.

Status enum carries its own drift: `Active` 861, `Traded` 49, `Retired` 46, `deceased` 4,
`injured` 1 — mixed capitalisation, and `injured` is a health state sitting in a lifecycle column.

## Citizen Archive (design, Mike-direct 2026-08-17)

Bidirectional archive tab. Traded players and deceased citizens leave `Simulation_Ledger` so the
engine stops spending writes on rows whose lives no longer advance; a traded player who returns
flips back to active and re-enters the ledger **carrying the same POP-ID**. POP-ID stability is what
keeps `Heritage_Ledger` inheritance intact — that tab keys on `FounderPopId` + `MembersList`, so the
design holds as specified.

**Plan:** [[2026-08-21-citizen-archive]] (engine.90). Live dump 2026-08-22 still 49 Traded + 5 deceased
/ 964. Citywide engine.117 is not a gate on allocator/schema/sandbox; inventory still runs before
those 54 move.

**Sequencing correction (measured 2026-08-17):** archive *after* true-up, not before. `Status=Traded`
was 49 rows and `deceased` 4 — 53 of 961, **5.5%**. The archive is worth building for write-economy
and for a clean active roster, but it does not meaningfully shrink the true-up surface. Archiving
first would bury defects; because the flow is bidirectional, a returning player would carry them
back. Engine.90 inventories the eligible set rather than waiting on this plan's remaining
SchoolQuality Task 1.

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

**CLOSED S431.** Tasks 2–4 shipped S380 (changelog); Task 1 resolved by design S431 (SchoolQuality is a causal input for minors, adult cells legacy, no sweep). Residual outside this plan's classes: POP-01083 BirthYear `2--6` (hand-mint typo, sports roster fact) — gap log G-EC58.

## Changelog

- 2026-08-17 (S378) — plan created from the live audit; scope cut to the classes no open row covers.
- 2026-08-18 (S380) — Tasks 2, 3, 4 SHIPPED live with read-back: worldYearBase=2039 config row (worldYear = base + SimYear, =2041 today); 37 MigrationIntent-on-inactive cells cleared (writer-side clear-on-transition still open, rides engine.119 wave); POP-00173 BirthYear 1889→1989. Task 1 (SchoolQuality causal-or-retire) still awaiting Mike's call. STANDING CONSTRAINT (Mike-direct S380): no sweep/constant fixes anywhere in this plan's execution — every repaired value must derive from that citizen's own particulars; uniform backfills are the defect class, not the repair.
- 2026-08-17 (S378) — batch shape measured: defects are uniform across ClockMode, so repair batches by issue not by group. Citizen Archive design recorded with a sequencing correction (archive after true-up; traded+deceased is 5.5% of rows).
- 2026-08-22 (grok) — Citizen Archive plan filed as [[2026-08-21-citizen-archive]] (engine.90). Live dump still 49 Traded + 5 deceased; citywide Task 1 is not that plan's gate.
