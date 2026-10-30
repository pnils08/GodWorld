---
title: engine.20d third fold re-review
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [engine, civic, review, active]
sources:
  - output/codex/TASK-2026-10-29-engine20d-rereview-3.md
  - docs/for-claude-review/2026-10-29-codex-engine20d-rereview-2.md
  - scripts/buildWorldSummary.js
  - scripts/buildWorldSummary.test.js
  - scripts/engineAuditor.js
  - output/engine-sheet/2026-10-29-engine20d-dryrun-c113.log
pointers:
  - "[[../plans/2026-05-22-engine-regulatory-friction]] — owning engine.20d Task 5"
  - "[[2026-10-29-codex-engine20d-rereview-2]] — two prior-snapshot HOLD findings"
---

# engine.20d re-review 3 — SHIP

**Target:** `ddf5c5b2`, scoped to the two HOLD findings in the second re-review and defects introduced by this fold. Both findings are closed. I found no new in-scope failure. This is a source and focused-test verdict, not a claim of Sheet, newsroom, cron, or deployment proof.

## Finding dispositions

1. **Missing or unreadable prior file — SHIP.** `loadPriorInitiatives()` preserves `rows:null` and a reason for a missing file, unreadable JSON, or absent tracker array (`scripts/buildWorldSummary.js:697-710`). `loadCycleData()` calls `requirePriorInitiatives()` after reading the current audit and **before** the Sheet pull (`:1480-1495`). With current initiative rows and no usable prior, the gate throws a message naming `engine_audit_c<N-1>.json`, the reason, and `--allow-missing-prior` (`:716-720`). `main()` has no artifact-write path before that load succeeds (`:1635-1653`). The local `node scripts/buildWorldSummary.js 103 --dry-run` exited 1 on the missing `engine_audit_c102.json` with that message, before any Sheet access. The old input → missing new-filing seed in an apparently normal written lane is no longer reachable through this CLI without the explicit override.

2. **Empty prior after an auditor read failure — SHIP.** The auditor still substitutes `[]` when `Initiative_Tracker` cannot be read (`scripts/engineAuditor.js:105-125`) and persists it in its audit (`:320-350,493-497`). The new loader classifies that empty array as unavailable (`scripts/buildWorldSummary.js:708-710`), so the same gate stops a build with current initiative rows (`:716-720`). An empty map no longer causes every current row to be labeled a new filing in the ordinary CLI. Temp-file tests exercise empty, nonempty, missing-key, and unreadable prior snapshots (`scripts/buildWorldSummary.test.js:740-754`); gate tests exercise both unavailable reasons (`:724-737`).

## Override and remaining boundary

`main()` passes the presence of `--allow-missing-prior` into the load gate (`scripts/buildWorldSummary.js:1621-1636`). When passed, the unavailable prior keeps `rows:null`; `emitDeskSignal()` has no prior map, records the reason in `meta.notes`, and `initiativeMoves()` returns no movement for `prior === undefined` (`:1215-1227,1304-1319`). Vote seeds still use the current row's action clocks (`:1321-1337`), and `buildStorylineRegistry()` still uses the current initiative rows (`:1416-1425`). This matches the task's stated override behavior. The focused test checks no initiative seeds and two retained vote seeds for synthetic current rows (`scripts/buildWorldSummary.test.js:701-713`). The saved engine-sheet log claims an override C103 dry-run exited 0; I did not rerun that Sheet-reading command.

The gate is conditional on **current** tracker rows (`scripts/buildWorldSummary.js:716-718`). The auditor can also persist an empty current snapshot after a Sheet-read failure (`scripts/engineAuditor.js:105-125,320-350`), in which case `emitDeskSignal()` omits both initiative and vote entries and notes the missing snapshot (`scripts/buildWorldSummary.js:1238-1242`). That current-snapshot failure predates this fold and is outside the two prior-snapshot findings; this SHIP verdict does not certify current-audit read validity. The summary footer still calls the prior audit optional for approval deltas (`:1466-1471`), which is now incomplete provenance for an ordinary initiative-bearing CLI build.

## Proof and final gate

- `node scripts/buildWorldSummary.test.js`: **315 passed, 0 failed** locally; live-Sheets integration skipped.
- `node scripts/buildWorldSummary.js 103 --dry-run`: **exit 1**, expected named missing-prior gate before Sheets.
- Saved `output/engine-sheet/2026-10-29-engine20d-dryrun-c113.log` reports C113 normal dry-run civic **49** and C103 override dry-run civic **26**. Those are engine-sheet receipts, not locally repeated Sheet reads or publication proof.
- Required fresh `Target: Initiative_Tracker` Haiku wiring-card command failed locally with `[FATAL] Connection error.` The historical `output/wiring-card-Initiative_Tracker.md` is stale; the source wiring reviewed here is auditor read → persisted audit snapshot → loader/gate → movement comparison → civic signal → CLI write.

**Final gate: SHIP for `ddf5c5b2`.** No code, Sheet, cron, or deployment change was made in this review.
