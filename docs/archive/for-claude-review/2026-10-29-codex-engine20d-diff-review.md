---
title: engine.20d movement-only civic seed diff review
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [engine, civic, review, active]
sources:
  - output/codex/TASK-2026-10-29-engine20d-diff-review.md
  - scripts/buildWorldSummary.js
  - scripts/buildWorldSummary.test.js
  - output/engine_audit_c111.json
  - output/engine_audit_c112.json
  - output/engine_audit_c113.json
pointers:
  - "[[../plans/2026-05-22-engine-regulatory-friction]] — owning engine.20d plan, Task 5 item 2"
  - "[[../engine/ROLLOUT_PLAN]] — engine.20d rollout row"
---

# engine.20d diff review — HOLD

**Target:** commit `ad53bf15`, limited to `scripts/buildWorldSummary.js` and `scripts/buildWorldSummary.test.js`. The builder's movement rule includes a new filing, status flip, renewal vote, renewal payout, and opening day; the existing `vote` seed stays. HOLD the movement predicate for the two missed-event paths and one false-event path below. These are source-level findings, not claims that a C113 live newsroom run occurred.

## Findings

### 1. A delayed renewal vote disappears when it is actually held — HOLD

`scripts/buildWorldSummary.js:1194-1214,1309-1323` checks `RenewalVoteCycle` but never `RenewalOutcome`; the separate `vote` seed checks only `NextActionCycle`, `VoteCycle`, and `OverrideVoteCycle`. The engine deliberately keeps `RenewalVoteCycle` unchanged on a delayed vote and later writes the result to `RenewalOutcome` while leaving the original `Status` and `Outcome` alone (`phase05-citizens/civicInitiativeEngine.js:626-642,678-690`). **Input → wrong output:** a row with `RenewalVoteCycle=N`, blank `RenewalOutcome` at the C<N> audit because quorum delayed the vote, then `RenewalOutcome="RENEWED … C<N+1>"` at C<N+1> with the watched fields unchanged → `initiativeMoves()` returns `[]`, and no renewal `vote` seed is emitted. The renewal vote is a builder-named movement, yet neither civic seed identifies it. A concurrent payout could incidentally create an `initiative` seed, but its label still carries only name/status/phase (`scripts/buildWorldSummary.js:1303-1305`), not the renewal result.

**Fix gate:** recognize the first nonblank `RenewalOutcome` or its value change against the prior row as a renewal-vote movement, with a focused delayed-then-resolved fixture. Keep the separate `vote` seed's existing contract unless the builder directs a change.

### 2. A missing prior snapshot silently drops new filings and state flips — HOLD

`scripts/buildWorldSummary.js:695-708` converts an absent or unreadable prior audit to `rows:null`; `:1292-1300` records only a `meta.notes` string and proceeds to emit a normal signal. With `prior === undefined`, `initiativeMoves()` tests only clocks equal to the current Cycle (`:1200-1214`). **Input → wrong output:** a newly filed row first visible in C<N> with `ProposedCycle=N-1` and no other current-cycle clock, while `engine_audit_c<N-1>.json` is unavailable → no `initiative` seed, even though a new filing expressly counts. The same happens for a status-only `proposed → passed` flip. `scripts/buildWorldSummary.test.js:685-694` codifies this omission as an expected degraded output. `scripts/buildCivicDomainSlice.js:517-534` reads `lanes.civic`, and `scripts/newsroom-fanout.js:206-217` filters lane entries; neither promotes the note into a candidate. The CLI writes the signal when it is not in dry-run mode (`scripts/buildWorldSummary.js:1635-1640`).

**Fix gate:** make movement-dependent output unavailable when the prior snapshot is missing or invalid, or provide an independently reliable way to identify these two movements. A note attached to an otherwise usable signal does not restore the missing entries. Include a missing-prior new-filing/status-flip fixture.

### 3. A stalled build's scheduled opening clock emits an initiative without an opening — FIX

`scripts/buildWorldSummary.js:1204-1207` treats any `OpensCycle` equal to the current Cycle as movement even when its value and all states match the prior snapshot. The engine only opens a `Standing` row in a construction phase; `stalled` is excluded (`phase05-citizens/civicInitiativeEngine.js:3964-3966,4019-4029,4045-4050`). **Input → wrong output:** an already-stalled `Standing` row has unchanged `OpensCycle=N` in both C<N-1> and C<N> snapshots, with no other watched change → the build does not open, but `initiativeMoves()` returns `['OpensCycle N']` and an `initiative` seed enters the civic lane. This is a scheduled date posing as a completed opening. `scripts/buildWorldSummary.test.js:679-680` proves the equality branch with a synthetic clock but does not test a stalled row.

**Fix gate:** require an observed opening transition (for example, construction phase to operational, or an explicit engine opening receipt) for this branch. Add a stalled-at-due-cycle fixture.

## Data and downstream check

- The snapshot diff is necessary for genuine moves stamped outside a simple current-cycle equality test. C111→C112 has `INIT-003` `Status proposed→passed` while `VoteCycle` changes from blank to `86`; C112→C113 has disbursements on `INIT-001/002/005`, an `INIT-010` stage/phase transition, and new `INIT-012` (`output/engine_audit_c111.json`, `c112.json`, `c113.json`, `snapshots.Initiative_Tracker`). Thus the departure from the plan's equality-only wording is justified by these data.
- On the C112→C113 rows, the new source predicate would select five initiative IDs: `INIT-001`, `INIT-002`, `INIT-005`, `INIT-010`, `INIT-012`. This is a source-and-snapshot derivation, not a successful Sheet-backed dry run. The saved `output/desk_signal_c113.json` predates the patch and still has 11 `initiative` entries and 55 civic entries; it cannot prove the new artifact was built. Its eight `vote` entries are distinct from the initiative count.
- `scripts/newsroom-fanout.js:152-163,205-217` deduplicates exact `ref` values, and `scripts/buildCivicDomainSlice.js:517-534,596-620` consumes the civic entries separately; `scripts/stink-scanner.js:81-143` scans only supplied entries. `scripts/cron-saturday-run.js:803-815,830-855` reads the sibling storyline registry for attachment, not the movement predicate. A missing or false initiative entry therefore changes the desk's candidate set. The registry's direct tracker read does not repair it.
- The plan's Task 5 item 1 says one dedicated piece per initiative per Cycle is enforced by exact-ref dedup (`docs/plans/2026-05-22-engine-regulatory-friction.md:101-109`). The unchanged `initiative` and `vote` refs differ by the snapshot suffix (`scripts/buildWorldSummary.js:1303-1304,1320-1322`), so that specific guarantee is not established by `assignedStoryRefs()` alone. This is a pre-existing contract limit, not a requested change to the builder's “vote seed stays” ruling.

## Verification and wiring

- `node scripts/buildWorldSummary.test.js`: **296 passed, 0 failed**. Its new cases cover tick-only exclusion, current disbursement, changed historical vote clock, status/phase, opening-clock equality, renewal credit, new row, and degraded prior. They do not cover the three findings above. The live Sheets integration section was skipped by the test's default mode.
- `node scripts/buildWorldSummary.js 113 --dry-run`: **not completed**. It failed before signal construction because the Sheet client's OAuth token request could not resolve `oauth2.googleapis.com` (`EAI_AGAIN`). The `main()` dry-run branch at `scripts/buildWorldSummary.js:1622-1640` was read before running; no output artifact was written by this invocation. No live Sheet, cron, deployment, or newsroom proof is claimed.
- Required engine-wiring command for `Target: Initiative_Tracker` was invoked with `anthropic/claude-haiku-4.5` and returned `[FATAL] Connection error.` No fresh generated card exists from this run. The existing [Initiative_Tracker wiring card](../../output/wiring-card-Initiative_Tracker.md) is attached as an older map (dated 2026-09-20); its column-presence audit is stale against the C111–C113 snapshots. Current source confirms the relevant path: `phase05-citizens/civicInitiativeEngine.js:625-729,4014-4050` writes renewal and opening state; `scripts/engineAuditor.js:321` persists `Initiative_Tracker` in the audit snapshot; `scripts/buildWorldSummary.js:693-708,1292-1325` reads prior/current snapshots and emits civic seeds; the downstream readers above consume those seeds. This source map is bounded to the reviewed path, not a substitute for a fresh full wiring card.

**Release gate:** fix findings 1–3, rerun the focused test, and obtain a successful C113 read-only dry run or equivalent typed local artifact before claiming the 55→49 civic count. No code was changed in this review.
