---
title: Test Coverage Rollout — detector regression + parser contracts + Engine_Errors expansion
created: 2026-05-12
updated: 2026-05-12
type: plan
tags: [engine, infrastructure, testing, closed]
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

**Status: 4.1-4.4 done S216. 4.5 done S217 (engine.16 picker-grab).**

- **4.1** ✅ `lib/editionParser.test.js` — `guessBeat` covers 15+ named beats (meta precedence-first, editorial beats, case-insensitive). `parseEdition` smoke-tests 5 most recent edition fixtures from `editions/`; asserts parse doesn't throw + result.sections is non-empty array with name/beat fields.
- **4.2** ✅ `lib/citizenDerivation.test.js` — 18 scenarios. Hash determinism, ageBracket 5-band coverage, ANCHOR_YEAR canon (2041), pickFromCDF, deriveGender (neighborhood variance + base 0.51 + determinism), computeCareerStage, deriveYearsInCareer (clamped + retiree path), deriveDebtLevel (income-inverse), deriveNetWorth (age × income × retiree), deriveMaritalStatus (bracket-conditional CDF + widowed-only-45+), deriveNumChildren (partnered effect), deriveCitizenProfile orchestrator (all-fields + determinism), lookupNeighborhood (Engine/Generational sentinels rejected).
- **4.3** ✅ `lib/economicLookup.test.js` — buildParamIndex, lookupProfile (happy path + null + SPORTS_OVERRIDE), calculateIncome (null profile + range-clamped + tier modifier scaling + retirement reduction), deriveWealthLevel (8 thresholds + net-worth boost), deriveSavingsRate (bracket mapping), isRetiredRole regex (positive + word-boundary "Retiree" rejected + null/empty).
- **4.4** ✅ `lib/districtMap.test.js` — 6 scenarios. DISTRICT_NEIGHBORHOODS (9 districts), DISTRICT_FACTIONS canon (OPP=4, CRC=3, IND=2 totaling 9), DISTRICT_HOLDERS (D7 Ashford, D2 Tran, D5 Rivers + all 9 present), getDistrictForNeighborhood (case-insensitive + null/unknown), getNeighborhoodsForDistricts (multi-district split + case-insensitive + unknown), getAllNeighborhoods.
- **4.5** ✅ `scripts/validateEdition.contract.test.js` — 49 assertions across two sections. **Section A (structural, source-level, sub-second):** severity constants present, ENGINE_TERMS array with 6 load-bearing patterns (`tension score`, `severity level`, `simulation`, `phase \d+`, `Edition \d+`, `ledger` with Civic Ledger exclude), DEFENSIVE_TERMS array, `--no-sheets` flag parsed, exit codes 0/1/2 documented + `process.exit` calls wired, all 11 check functions present, async main entry. **Section B (subprocess, 8 parallel invocations, ~12s wall-clock on 4 CPUs):** E93 pinned as known-pass under current canon (exit 0, PASSABLE or CLEAN). E78/E85/E90 pinned as historical snapshots with ≥ N CRITICAL floors (≥ 20 / ≥ 5 / ≥ 2) — these editions were canon-clean when shipped but the validator now sees them against current `truesource_reference.json` (council districts + officials drifted across cycles). Floor assertions catch validator-going-silent regressions without locking specific issue counts that drift with each canon edit. Four hand-crafted known-fail tmpfiles (engine-language leak, real-name blocklist hit, vote-math mismatch with total > 9, wrong-mayor name) each must exit 1 with the targeted check label in output. **Canon-aware skip pattern:** `output/desk-packets/` is gitignored, so CI runs without canon. Historical-snapshot floors + wrong-mayor fixture skip gracefully when canon absent (8 skipped, exit 0). Local: 49 passed. CI mode: 41 passed, 8 skipped. **Plan-pivot from original spec:** plan §4.5 originally said "pin editions 78-93 as known-pass fixtures" assuming editions are timeless. S217 measure-twice surfaced that only E93 passes under current canon — editions are snapshots of canon at their cycle. Test redesigned as Option β (snapshot regression with canon-drift floors) rather than the heavier all-16-known-pass pin. See changelog entry below.

### Phase 5 — Mutating-script safety contracts

**Status: 5.1 done S216. 5.2 deferred (multi-script per-fixture work).**

- **5.1** ✅ `scripts/applyTrackerUpdates.contract.test.js` — structural safety contract (15 assertions). Verifies: APPLY flag parsed from `--apply` argv; no `APPLY = true` overrides anywhere; every `sheets.updateRowFields(...)` call is gated within ~600 chars of an `if (APPLY)` block; dry-run path logs "WOULD WRITE"; --apply path logs "WRITTEN to row"; WRITEBACK_FIELDS allowlist contains the 4 documented columns; S215 `trackerOwner` schema constants (VALID_OWNERS + SECONDARY_FOLD_CAP) still present. Catches regressions like "someone removed the if (APPLY) guard" without needing service-account credentials in CI.
- **5.2** Deferred: `scripts/audit*.js` (10 scripts) + `scripts/validate*.js` (4 scripts) — fixture-driven coverage. Known-good input → 0 findings; known-bad input → expected findings. Per-script work; multi-session ship. Filed under engine.16.

### Phase 6 — lib/sheets.js boundary

**Status: Phase 6 done S216.**

- **6.1** ✅ `lib/sheets.test.js` — 21 assertions covering `columnIndexToLetter` (the load-bearing pure-logic helper that every column-name resolution depends on). Covers: A-Z single-letter range; AA-AZ boundary (Income at index 26 → AA — the documented landmine); BA-BZ; the 4 Simulation_Ledger past-Z documented landmines (Income/EducationLevel/CareerStage/Gender → AA/AE/AG/AU); ZZ → AAA rollover; module exports surface (catches accidental removal of public API during refactor). Required adding `columnIndexToLetter` to the public exports — was internal, useful enough to expose.

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

**Status S216:** acceptance largely met. Phases 1, 2, 3, 4.1-4.4, 5.1, 6 shipped. Deferred items (4.5, 5.2, 7) filed under engine.16 for future engine-sheet sessions.

- ✅ Phases 1-3 + 6 fully shipped
- ✅ Phase 4 partial (4.1-4.4 shipped S216; 4.5 shipped S217)
- ✅ Phase 5 partial (5.1 shipped, 5.2 deferred)
- ⏸ Phase 7 explicitly deferred (Apps Script ctx + SpreadsheetApp mocking is a heavier ship; revisit when test infrastructure justifies the investment)
- ✅ `npm test` green on main (21/21 files / 460 assertions / ~16s under npm test, ~12s for validateEdition.contract alone)
- ✅ CI test job green on main (Phase 1)
- ✅ Engine_Errors expanded; `lib/diagnosticLedger.js` writing surface live; godWorldEngine2 + run-tests + engineAuditor wired
- ✅ validateEdition contract test live with canon-aware CI gating (E93 known-pass + 3 historical snapshot floors + 4 hand-crafted known-fails)
- ✅ Every detector under `scripts/engine-auditor/` has a peer test (9/9 detectors covered)
- ✅ This plan flipped active → closed in [[../index]]; ROLLOUT engine.15 → done-pending-archive; engine.16 filed for deferred items

## Changelog

- 2026-05-12 — Plan filed (S216 engine-sheet). Phase 1 ships in same session: scripts/run-tests.js + package.json test script + lint.yml test job. Phases 2-7 picker-grab for subsequent engine-sheet sessions.
- 2026-05-12 — Phase 2 ships in same session (S216 engine-sheet continuation). 2.1-2.6 complete, 2.7 deferred (engineAuditor.integration.test.js needs lib/sheets mocking refactor first). 6 new test files, 67 new assertions. Total: 13 files / 196 assertions / all green. Detector regression class fully covered — every `scripts/engine-auditor/detect*.js` has a `*.test.js` peer. Bonus: `detectIncoherence.js` was missing from the original plan; covered in same batch.
- 2026-05-12 — Phase 3 ships complete in same session. 3.1: live Engine_Errors expansion 5 → 10 cols + 24-row backfill. 3.2: `lib/diagnosticLedger.js` (DI factory, 29-assertion test). 3.3: `scripts/run-tests.js` opt-in wiring (gated on env vars). 3.4: `scripts/engineAuditor.js --ledger` flag for audit findings. 3.5: schema regen. Engine writer `logEngineError_()` updated to 10-cell rows + clasp push deployed. Net: runtime errors, test fails, and audit findings share one surface with consistent classification + dedup + resolution tracking. Total project test surface: 14 files / 225 assertions / all green.
- 2026-05-12 — Phase 4.1-4.4 ships in same session. Pure-logic contracts: lib/districtMap.test.js (6 scenarios), lib/economicLookup.test.js (12 scenarios), lib/citizenDerivation.test.js (18 scenarios), lib/editionParser.test.js (5 scenarios incl. real edition-fixture parse smoke). 4.5 (validateEdition 1100-line contract) deferred to next session. Total project test surface: 18 files / 373 assertions / all green.
- 2026-05-12 — Phase 5.1 + 6 ship in same session. scripts/applyTrackerUpdates.contract.test.js (15 structural assertions — APPLY flag + write-gate + dry-run logging + WRITEBACK_FIELDS allowlist + trackerOwner schema constants). lib/sheets.test.js (21 assertions covering columnIndexToLetter — the Income@col26 landmine class — required adding the helper to public exports). 5.2 (audit/validate scripts fixture coverage) + 7 (engine-phase determinism harnesses) deferred to engine.16. Plan flipped active → closed; engine.15 → done-pending-archive. Total project test surface: 20 files / 411 assertions / all green (~4.4s under npm test).
- 2026-05-12 — Phase 4.5 ships (S217 engine-sheet, engine.16 picker-grab). `scripts/validateEdition.contract.test.js` — 49 assertions, Section A structural (33 source-level checks, sub-second) + Section B subprocess (16 assertions across 8 parallel invocations, ~12s wall-clock on 4 CPUs). **Measure-twice canon-drift discovery:** plan's original spec ("pin editions 78-93 as known-pass fixtures") assumed editions are timeless under the validator. Reality surfaced during build: only E93 passes under current canon; E78/E85/E90 produce 26/9/3 CRITICALs respectively because council districts + civic officials drifted across cycles and the validator checks against current `truesource_reference.json`. Editions are snapshots of canon at their cycle, not timeless artifacts. Test pivoted to Option β — E93 pinned as known-pass + three historical editions pinned as "must produce ≥ N CRITICALs" snapshot floors (≥ 20/5/2) + four hand-crafted known-fail tmpfiles (engine-leak / blocklist hit / vote-math total > 9 / wrong-mayor). Floor assertions catch validator-going-silent regressions without locking specific issue counts that drift with each canon edit. **Canon-aware CI gating:** `output/desk-packets/` is gitignored, so canon files are absent in CI. Test detects this and skips the 8 canon-dependent assertions (3 historical floors × 2 + wrong-mayor × 2) when canon missing; structural Section A + engine-leak + blocklist + vote-math fixtures run in both environments. Locally: 49 passed. CI mode: 41 passed, 8 skipped, exit 0. **Fixture-regex discipline:** initial vote-math fixture text put "the housing proposal" between the verb and numbers; checkVoteMath's regex requires `(?:passed|approved|rejected|failed|defeated)\s+(\d+)-(\d+)` adjacency, so the fixture missed. Caught by self-test; fixture rewritten to "passed 8-7" adjacency. **Plan-pivot meta-lesson:** the original "pin 78-93 as known-pass" estimate ("30-60s to run all") was already aware of cost but unaware of canon-drift; the real constraint was canon-evolution, not subprocess overhead. Total project test surface: 21 files / 460 assertions / all green (~16s under npm test; validateEdition.contract alone ~12s). 4.5 closes; engine.16 remaining: 2.7 (engineAuditor integration) / 5.2 (audit+validate per-script coverage) / 7 (engine-phase determinism harnesses).
