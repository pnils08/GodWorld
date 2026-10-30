---
title: engine.20d movement-only civic seed fold re-review
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [engine, civic, review, active]
sources:
  - output/codex/TASK-2026-10-29-engine20d-rereview.md
  - docs/for-claude-review/2026-10-29-codex-engine20d-diff-review.md
  - scripts/buildWorldSummary.js
  - scripts/buildWorldSummary.test.js
  - output/engine-sheet/2026-10-29-engine20d-dryrun-c113.log
pointers:
  - "[[../plans/2026-05-22-engine-regulatory-friction]] — owning engine.20d plan, Task 5 item 2"
  - "[[2026-10-29-codex-engine20d-diff-review]] — first review and original three findings"
---

# engine.20d fold re-review — HOLD

**Target:** commit `dde78ab3`, checked against the three findings in the first review and for new faults. The source fixes the delayed-renewal result and stalled-opening date cases. The missing-prior fallback now preserves real filings but emits unchanged initiatives as though they moved. That still fails the builder's “Just when it moves” rule, so the gate remains HOLD. This is a code and saved-snapshot verdict, not a production or newsroom-run verdict.

## Original findings

| Finding | Result | Evidence |
|---|---|---|
| F1 — delayed renewal vote omitted | **SHIP for this fix** | `scripts/buildWorldSummary.js:1197-1212` now compares `RenewalOutcome`; `scripts/buildWorldSummary.test.js:688-692` covers blank→`RENEWED` with the clock unchanged. The engine's delayed path keeps the clock and later writes the outcome (`phase05-citizens/civicInitiativeEngine.js:678-690`). Input: delayed then resolved, other watched fields unchanged → one `initiative` seed. The separate `vote` seed remains unchanged at `scripts/buildWorldSummary.js:1307-1322`. |
| F2 — missing prior drops filings/status flips | **HOLD; false negative replaced by false positives** | `scripts/buildWorldSummary.js:1204-1207,1290-1305` emits every initiative when the prior snapshot is missing; `scripts/buildWorldSummary.test.js:697-707` asserts it. This retains a new filing, but also emits rows known to be unchanged when the prior is available. Detailed input→wrong output below. |
| F3 — stalled opening date counted as opening | **SHIP for this fix** | The `clock == cycle` branch is gone (`scripts/buildWorldSummary.js:1204-1212`). An unchanged `OpensCycle` no longer seeds; `scripts/buildWorldSummary.test.js:679-687` covers a stalled row and an unchanged due vote. The engine excludes `stalled` from construction opening (`phase05-citizens/civicInitiativeEngine.js:3964-3966,4019-4050`); an actual construction→operational phase change still seeds. |

## Remaining finding — unavailable prior means 11 seeds for five moves

`scripts/buildWorldSummary.js:695-708` returns `rows:null` for a missing or unreadable prior audit. `initiativeMoves()` then returns a nonempty “movement unread” marker for **every** row (`:1204-1207`), and `emitDeskSignal()` publishes each one with the ordinary `kind:'initiative'` and status/phase label (`:1290-1305`). The uncertainty is only in `meta.notes`; `scripts/newsroom-fanout.js:205-217` and `scripts/buildCivicDomainSlice.js:517-534` consume the entries without that note.

**Input → wrong output:** use the real C113 `Initiative_Tracker` snapshot but make `output/engine_audit_c112.json` unavailable to `loadPriorInitiatives()`. The code emits **11** initiative seeds. The available C112→C113 snapshots show only **five** watched-field moves (`INIT-001`, `INIT-002`, `INIT-005`, `INIT-010`, `INIT-012`); **six** rows (`INIT-003`, `INIT-006`, `INIT-007`, `INIT-008`, `INIT-009`, `INIT-011`) are unchanged. Thus six ordinary civic candidates claim movement that cannot be read and did not occur in this saved comparison. The test's “every initiative seeds” assertion proves the fallback, not its correctness. The current C112 file exists, so this is a degraded-input failure path, not a claim that C113 actually emitted 11 after the fold.

**Fix gate:** withhold or mark movement-dependent entries as unavailable until a valid prior snapshot is present, or derive movement from another verified source. Do not turn unknown movement into an ordinary movement seed. A focused test should distinguish a known stationary row from a new filing when the prior becomes unavailable and assert that the output does not present both as moved.

## Fold-specific check and proof limits

- The new comparison watches `Outcome`, `OverrideOutcome`, and `RenewalOutcome` in addition to the original clocks and states (`scripts/buildWorldSummary.js:1197-1212`). The C112 and C113 source snapshots independently produce the same selected rows in the engine-sheet log: C112 **8 moved / 2 unchanged**, C113 **5 moved / 6 unchanged**. The diff against the previous audit remains justified: C112 `INIT-003` changes `Status proposed→passed` even though its recorded `VoteCycle` is `86` (`output/engine_audit_c111.json`, `c112.json`, `c113.json`, `snapshots.Initiative_Tracker`).
- `output/engine-sheet/2026-10-29-engine20d-dryrun-c113.log` claims an exit-0 read-only CLI run and civic **49** versus the pre-cut saved signal's **55**. The five-row derivation and unchanged non-initiative counts support its arithmetic; the log is still a saved claim, not an independently rerun Sheet read here. `output/desk_signal_c113.json` remains the pre-cut 55-entry artifact, so this review does not call the 49-entry signal published or deployed.
- `node scripts/buildWorldSummary.test.js`: **301 passed, 0 failed** locally. Its integration section skipped live Sheets. The fold's delayed-renewal test uses an already-staged clock in both snapshots (`scripts/buildWorldSummary.test.js:688-692`). A newly staged `RenewalVoteCycle` can itself count as a clock change: the Sunday fold schedules it for the next fire (`scripts/cron-civic-run.js:3008-3015,3046-3070`). This is a test boundary, not a separate finding; whether staging is editorial movement is the builder's call. No additional proven fold regression was found in the reviewed paths.
- A fresh mandatory `Target: Initiative_Tracker` wiring-card command was attempted with the approved Haiku model and failed with `[FATAL] Connection error.` The older [Initiative_Tracker wiring card](../../output/wiring-card-Initiative_Tracker.md) remains an attached historical map; its September column audit is stale. Current reviewed path: the civic engine writes vote/opening state (`phase05-citizens/civicInitiativeEngine.js:625-729,4014-4050`), the auditor persists the tracker snapshot (`scripts/engineAuditor.js:321`), `buildWorldSummary.js:693-708,1290-1322` compares and emits seeds, and the desk readers above consume them. No fresh full card or live deployment proof is claimed.

**Release gate:** settle the missing-prior behavior under the builder's movement-only ruling, then rerun the focused test and a typed read-only C113 signal build. No code, Sheet, cron, or deployment change was made in this review.
