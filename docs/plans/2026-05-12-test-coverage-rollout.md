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

**Status: 2.1-2.6 done S216 (2.7 deferred).** Acceptance met: every detector under `scripts/engine-auditor/` has a `*.test.js` peer.

- **2.1** ✅ `detectAnomalies.test.js` — 17 assertions across 4 subchecks (citizen-income spike/drop, approval-flip, crime-outlier 3σ, migration-shift) + edge cases (< 3 priors, empty priors, peerShare confidence routing)
- **2.2** ✅ `detectCascadeFailures.test.js` — 9 assertions (all silent → high, half silent → medium, healthy → no pattern, events count as signal, passive initiative skipped, empty AffectedNeighborhoods skipped)
- **2.3** ✅ `detectImprovements.test.js` — 9 assertions (phase-advance, sentiment-rise, threshold gates, no-prior, new-initiative)
- **2.4** ✅ `detectProductionImbalance.test.js` — 12 assertions across both subchecks (domain-skew high/medium/no-skew + single-domain edge; migration-without-economic + suppression by economic event + count-threshold)
- **2.5** ✅ `detectRepeatingEvents.test.js` — 10 assertions (3+ cycle recurrence + stuck initiative high; active matching → suppressed; no matching domain → medium; below RECUR_WINDOW → none; empty digest; short-token filtering)
- **2.6** ✅ `detectIncoherence.test.js` — 10 assertions (implemented health vs low sentiment, implemented crime vs high crime, healthy → no incoherence, council-vs-district approval-flip, non-implemented skipped, unmapped domain skipped). Detector was missing from original plan — added in same batch.
- **2.7** Deferred to subsequent session: `engineAuditor.integration.test.js` — fixture audit JSON in, expected pattern set out. Requires environment refactor — `engineAuditor.js main()` does live sheet read via `lib/sheets.js`. Per-detector unit tests now cover load-bearing logic; integration test remains valuable for orchestration regression but is a higher-cost ship.

**Net result S216 Phase 2:** 6 new test files, 67 new assertions. Total project test surface: 13 test files, 196 assertions, all green under `npm test` (~1s).

### Phase 3 — Engine_Errors expansion → Diagnostic_Ledger

**Status: Phase 3 complete S216.** All 5 sub-items shipped. Engine_Errors is now a unified diagnostic surface backed by the same sheet engine errors already use.

- **3.1** ✅ Schema additions live. Engine_Errors went 5 → 10 cols (added F=Class, G=Source, H=Severity, I=Resolved, J=Hash). 24 existing rows backfilled (class='engine-error', source from Phase column, severity high for FATAL otherwise medium, hashes computed from class+source+errorFirst100).
- **3.2** ✅ `lib/diagnosticLedger.js` shipped — `record / recordIfNew / recordBatch / listRecent / listOpen / markResolved` API + dependency-injected sheetsClient for testability. 29-assertion peer test, all green.
- **3.3** ✅ `scripts/run-tests.js` wires test-fail entries into the ledger when `GODWORLD_SHEET_ID` + `GODWORLD_LEDGER_FAILS=1` env vars present. Default-off so local development doesn't pollute the sheet during active iteration. CI without credentials skips the write entirely.
- **3.4** ✅ `scripts/engineAuditor.js --ledger` flag opt-in records HIGH-severity unresolved findings (class='audit-finding', source=`engineAuditor:<type>`). Off by default — every audit run would otherwise pollute the sheet with same-pattern entries (recordIfNew dedups via hash, but the noise still adds up). Useful for periodic ledger refresh, not every run.
- **3.5** ✅ Schema regen via `node scripts/regenSchemaHeaders.js` — SCHEMA_HEADERS.md reflects 25 rows × 10 cols.

**Engine writer update:** `phase01-config/godWorldEngine2.js` `logEngineError_()` now writes 10-cell rows (legacy 5 + Class='engine-error' + Source=phase + Severity=high|medium + Resolved='' + Hash). New helper `computeShortHash_()` uses Apps Script `Utilities.computeDigest(SHA_1)` + first 12 hex chars — mirrors `lib/diagnosticLedger.computeHash()` so Apps Script-side writes and Node-side dedup agree on the same hash. Sheet creation (first-run, sheet missing) writes 10-col header. Clasp push deployed.

**Net result:** runtime engine errors, test failures, and audit findings now share one queryable surface with consistent classification, source attribution, severity ranking, and resolution tracking. `listOpen({class: 'audit-finding', severity: 'high'})` returns the cross-cycle backlog.

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
- 2026-05-12 — Phase 2 ships in same session (S216 engine-sheet continuation). 2.1-2.6 complete, 2.7 deferred (engineAuditor.integration.test.js needs lib/sheets mocking refactor first). 6 new test files, 67 new assertions. Total: 13 files / 196 assertions / all green. Detector regression class fully covered — every `scripts/engine-auditor/detect*.js` has a `*.test.js` peer. Bonus: `detectIncoherence.js` was missing from the original plan; covered in same batch.
- 2026-05-12 — Phase 3 ships complete in same session. 3.1: live Engine_Errors expansion 5 → 10 cols + 24-row backfill. 3.2: `lib/diagnosticLedger.js` (DI factory, 29-assertion test). 3.3: `scripts/run-tests.js` opt-in wiring (gated on env vars). 3.4: `scripts/engineAuditor.js --ledger` flag for audit findings. 3.5: schema regen. Engine writer `logEngineError_()` updated to 10-cell rows + clasp push deployed. Net: runtime errors, test fails, and audit findings share one surface with consistent classification + dedup + resolution tracking. Total project test surface: 14 files / 225 assertions / all green.
