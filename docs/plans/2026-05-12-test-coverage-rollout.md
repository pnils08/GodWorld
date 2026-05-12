---
title: Test Coverage Rollout — detector regression + parser contracts + Engine_Errors expansion
created: 2026-05-12
updated: 2026-05-12
type: plan
tags: [engine, infrastructure, testing, active]
sources:
  - "Claude Code app proposal — fetched via service account 2026-05-12 to output/drive-files/Proposed_Areas_for_Improvement_.txt (Drive ID 172YzAP886fA2_26sT0Qu3lU8wRy8fbyb)"
  - "Engine_Errors sheet — current schema (5 cols, godWorldEngine2 writes runtime errors)"
  - ".github/workflows/lint.yml — existing CI surface"
  - "scripts/engine-auditor/*.test.js — 4 existing test files using exit-code pattern"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] engine.15 — rollout row"
  - "[[../engine/ENGINE_REPAIR]] — defects this rollout helps prevent"
  - "Source doc local copy: output/drive-files/Proposed_Areas_for_Improvement_.txt"
---

# Test Coverage Rollout

**Closes:** the gap that lets detector / parser / auditor / validator drift go unnoticed across sessions. Ships a CI-enforced test runner + per-class regression coverage + Engine_Errors → Diagnostic_Ledger expansion that captures test failures and audit findings in the same surface engine errors already use.

## Origin

External engineering review (Claude Code app, fetched 2026-05-12) ranked seven test-coverage targets by ROI. Engine-sheet senior-programmer review of the proposal in the same session reordered two items, swapped one ranking error (the C92 contamination class invoked at #5 was canon drift, not numeric drift), and added one missing class (detector regression tests — already shipped 3/4 this session). This plan combines the merged list + an Engine_Errors expansion that turns the sheet into a unified diagnostic surface across runtime, test, and audit lanes.

## Why now

S216 alone shipped three detector fixes (`detectStuckInitiatives` v1.0.0 → v1.2.0, `detectWritebackDrift` v1.0.0 → v1.1.0, `detectMathImbalances` v1.0.0 → v1.1.0) — all latent regressions that survived multiple cycles silently because the detectors had zero test coverage. The C93 audit fired 22 patterns; 17 were false / mistyped due to the detector bugs. Without tests these would have rotted indefinitely. A test runner + CI hook + per-detector regression suite is the load-bearing primitive that prevents the next 17.

## Phases

### Phase 1 — Test runner foundation

Cheapest item, unblocks everything. Acceptance: `npm test` runs all `*.test.js` files; CI fails on any test failure.

- **1.1** `scripts/run-tests.js` walker — finds `*.test.js` under `scripts/` + `lib/`, runs each via spawned `node`, aggregates exit codes, prints summary.
- **1.2** `package.json` adds `"test": "node scripts/run-tests.js"`.
- **1.3** `.github/workflows/lint.yml` adds a `test` job mirroring the lint job (checkout → setup-node → install → `npm test`).
- **1.4** Smoke-test all 4 existing test files run cleanly under `npm test`. Existing files: `detectStuckInitiatives.test.js`, `detectWritebackDrift.test.js`, `detectMathImbalances.test.js`, `measureRemedies.test.js`.

### Phase 2 — Detector regression coverage (the missing class)

Three of seven detectors covered S216. Cover the remaining four. Acceptance: every detector under `scripts/engine-auditor/` has a `*.test.js` peer.

- **2.1** `detectAnomalies.test.js` — covers the 4 cyclesInState=1 anomaly variants
- **2.2** `detectCascadeFailures.test.js` — single failure case
- **2.3** `detectImprovements.test.js` — covers both improvement detection paths
- **2.4** `detectProductionImbalance.test.js` — covers both production-imbalance variants
- **2.5** `detectRepeatingEvents.test.js` — RECUR_WINDOW recurrence detection
- **2.6** `engineAuditor.integration.test.js` — fixture audit JSON in, expected pattern set out (covers detector orchestration)

### Phase 3 — Engine_Errors expansion → Diagnostic_Ledger

Make Engine_Errors a unified diagnostic surface that captures runtime errors, test failures, audit findings, and validator failures. Existing godWorldEngine2 writers stay unchanged (5-col writes); new writers populate the additional columns.

- **3.1** Schema additions to Engine_Errors sheet (ADD columns; no rename; existing writes unaffected):
  - `Class` — `engine-error` (existing, default for godWorldEngine2 writes) | `test-fail` | `audit-finding` | `detector-flag` | `parser-drift` | `validation-fail`
  - `Source` — script/test/auditor name that produced the entry
  - `Severity` — `low` | `medium` | `high` (matches detector taxonomy)
  - `Resolved` — cycle of fix or blank
  - `Hash` — dedup key (e.g., sha1 of Class+Source+Phase+Error first 100 chars)
- **3.2** New helper `lib/diagnosticLedger.js` — single write surface for non-engine writers. Service-account write to Engine_Errors. Idempotent via Hash dedup (skip insert if Hash present in last 50 rows).
- **3.3** Wire `npm test` to append a single row per test-file fail (Class=`test-fail`, Source=test path, Error=first failed assertion).
- **3.4** Wire `engineCycleAudit` to optionally append unresolved findings (Class=`audit-finding`, Source=detector name). Off by default, opt-in via `--ledger` flag (don't pollute the sheet on every audit run).
- **3.5** Schema regen via `node scripts/regenSchemaHeaders.js`; SCHEMA_HEADERS.md updated.

### Phase 4 — High-value pure-logic contracts

Highest blast-radius pure-logic items. Acceptance: each file has fixture-driven tests covering the canonical cases + 2-3 edge cases.

- **4.1** `lib/editionParser.js` — golden-file tests against `editions/cycle_pulse_edition_*.txt` (editions 78-93 already in tree as fixtures). Pin parser output for each.
- **4.2** `lib/citizenDerivation.js` — tier classification tests. Canon-protected; wrong tier downgrade can delete a Tier-1.
- **4.3** `lib/economicLookup.js` — retiree-role regex + small lookup paths.
- **4.4** `lib/districtMap.js` — pure 92-line lookup; trivial coverage.
- **4.5** `scripts/validateEdition.js` contract — pin editions 78-93 as known-pass fixtures. Hand-craft 3-4 known-fail editions (missing byline, time-rule violation, vote-math mismatch). Assert validateEdition keeps passing the good and rejects the bad.

### Phase 5 — Mutating-script safety contracts

Scripts that change state. Acceptance: dry-run never writes; non-dry-run only writes the diffs printed.

- **5.1** `scripts/applyTrackerUpdates.js` — dry-run never writes (no service-account calls in --dry mode); non-dry-run only writes the trackerUpdates fields printed in the dry-run output. Mock service-account boundary.
- **5.2** `scripts/audit*.js` + `scripts/validate*.js` — fixture-driven coverage. Known-good input → 0 findings; known-bad input → expected findings.

### Phase 6 — lib/sheets.js boundary

Smaller scope, locks the documented landmines.

- **6.1** Column-mapping helpers (Income at col26, EducationLevel at col31, CareerStage at col33, Gender at col47/AU). Mock the Google client; assert column resolution.

### Phase 7 — Deferred

- Engine-phase determinism harnesses (Apps Script ctx + SpreadsheetApp mocking is a real lift). Defer until Phases 1-6 land. Reconsider when the test surface is mature enough to justify the mock infrastructure investment.

## De-prioritized (won't do)

Per source doc + senior-programmer review concurrence:
- `lib/photoGenerator.js`, `generate-edition-pdf.js` — paid API + binary output, low ROI for unit tests. Smoke-test the input-builder functions instead, skip the side-effect layer.
- `dashboard/src/` — only 3 source files; not where bugs live.
- `lib/mags.js` — persona loader; behavior is qualitative.

## Sequencing

Phase 1 ships first (foundation). Phase 2 + 3 can ship in parallel sessions (no shared files). Phase 4 + 5 ship after Phase 3 (so test-fail records flow into the ledger). Phase 6 fills the boundary. Phase 7 stays parked.

## Acceptance for closing the rollout

- All 7 phases shipped (or Phase 7 explicitly re-deferred with rationale)
- `npm test` green on main
- CI test job green on main
- Engine_Errors expanded; diagnosticLedger.js writing test-fail and audit-finding records
- Editions 78-93 pinned as validateEdition golden fixtures
- Every detector under `scripts/engine-auditor/` has a peer test
- This plan flipped active → closed in [[../index]]; ROLLOUT engine.15 → done-pending-archive

## Changelog

- 2026-05-12 — Plan filed (S216 engine-sheet). Phase 1 ships in same session: scripts/run-tests.js + package.json test script + lint.yml test job. Phases 2-7 picker-grab for subsequent engine-sheet sessions.
