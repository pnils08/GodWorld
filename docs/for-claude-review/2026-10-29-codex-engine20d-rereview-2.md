---
title: engine.20d second fold re-review
created: 2026-10-29
updated: 2026-10-29
type: reference
tags: [engine, civic, review, active]
sources:
  - output/codex/TASK-2026-10-29-engine20d-rereview-2.md
  - docs/for-claude-review/2026-10-29-codex-engine20d-rereview.md
  - scripts/buildWorldSummary.js
  - scripts/buildWorldSummary.test.js
  - output/engine-sheet/2026-10-29-engine20d-desk-signal-c113.candidate.json
pointers:
  - "[[../plans/2026-05-22-engine-regulatory-friction]] — owning engine.20d Task 5"
  - "[[2026-10-29-codex-engine20d-rereview]] — previous HOLD and its F2 gate"
---

# engine.20d re-review 2 — HOLD

**Target:** commit `83e05f7c`. The normal C113 candidate agrees with the C112→C113 initiative diff, and the builder's 2026-10-29 ruling that a newly set vote, renewal-vote, or opening date counts is represented by the clock comparison. The remaining HOLD is prior-snapshot availability: one unavailable shape drops a real filing; another unavailable shape labels every row a new filing. Neither downstream reader treats the note as a gate.

## Findings

### 1. Missing prior file still drops a new filing — HOLD on F2

`scripts/buildWorldSummary.js:696-707` returns `rows:null` for a missing or unreadable C<N-1> audit. `initiativeMoves()` returns `[]` for the resulting `prior === undefined` (`:1202-1213`), and `emitDeskSignal()` omits each `kind:'initiative'` entry while only adding `meta.notes` (`:1291-1306`). The ordinary CLI still writes that signal (`:1623-1639`). **Input → wrong output:** take the real C113 snapshot and make `output/engine_audit_c112.json` unavailable. All five movements that the saved C112→C113 pair proves are omitted; in particular, new `INIT-012` receives no `initiative` seed. It has no `vote` seed in the typed C113 candidate. Its `INIT-012:announced` storyline registry entry is a sibling of `lanes`, and `scripts/newsroom-fanout.js:520-526,575-577` assigns from lanes only. `scripts/buildCivicDomainSlice.js:517-526` likewise consumes lane entries without promoting `meta.notes`. The result is a normal-looking civic lane with zero initiative movement seeds, not an unavailable movement lane.

The test at `scripts/buildWorldSummary.test.js:701-707` now asserts this loss. It resolves the over-seeding cited in the prior review, but recreates the first review's missing-filing/status-flip failure. **Fix gate:** stop or explicitly invalidate the movement-dependent signal when its comparison source is unavailable, with a consumer-visible gate; alternatively use a verified independent movement source. A note beside a usable lane does not preserve the builder-named new filing.

### 2. An audit Sheet-read failure turns every existing row into a “new filing” — HOLD

The auditor catches a failed `Initiative_Tracker` Sheet read and substitutes `[]` (`scripts/engineAuditor.js:105-125`), then persists that array in `engine_audit_c<N-1>.json` (`:320-350,493-497`). `loadPriorInitiatives()` accepts any array as a valid prior (`scripts/buildWorldSummary.js:696-707`); `emitDeskSignal()` constructs a truthy empty map with no warning (`:1291-1298`); every current row gets `prior === null` and `initiativeMoves()` calls it a new filing (`:1207-1208`). **Input → wrong output:** if the C112 auditor's tracker read fails but its audit file is written, then the real 11-row C113 tracker snapshot yields **11** ordinary `initiative` seeds and no missing-prior note. The actual C112→C113 audit pair has **five** moved rows and **six** unchanged rows. This path therefore creates six false movement candidates even though the new null-prior guard is present. The new tests cover `rows:null`, not `rows:[]` after a failed producer read (`scripts/buildWorldSummary.test.js:701-722`).

**Fix gate:** carry producer read validity into the audit artifact or reject an empty prior tracker snapshot when the current world has rows, then apply the same consumer-visible unavailability gate. A genuinely empty world needs typed proof; an empty array alone is also the auditor's read-error value.

## What passed and what remains unproved

- **SHIP for F1 and F3:** `RenewalOutcome` remains in the watched states, and the due-date equality branch remains removed (`scripts/buildWorldSummary.js:1198-1213`). A delayed renewal's outcome change and an actual construction→operational phase change seed; an unchanged stalled `OpensCycle` does not. These paths were traced in the prior review and remain covered at `scripts/buildWorldSummary.test.js:679-693`.
- **SHIP for the new builder date ruling:** a newly set `RenewalVoteCycle` differs from the prior row and seeds (`scripts/buildWorldSummary.js:1198-1213`; test `scripts/buildWorldSummary.test.js:697-699`). The same comparison covers first-set `VoteCycle` and `OpensCycle`. No fresh product interpretation is needed.
- The committed typed candidate has `meta.cycle=113`, civic **49** (`19` anomaly, `5` initiative, `8` vote, `1` civic-log, `16` ripple), and initiative IDs `INIT-001/002/005/010/012`. Direct comparison of `output/engine_audit_c112.json` and `c113.json` gives exactly those five changed rows and six unchanged rows. This corroborates the candidate's initiative selection. The candidate also differs from the older published `output/desk_signal_c113.json` in anomaly storyline refs and live sports-feed content, so the two files are not a controlled byte-for-byte movement-only comparison. The candidate marks itself unpublished; no production or newsroom delivery is inferred.
- `node scripts/buildWorldSummary.test.js`: **303 passed, 0 failed** locally. Its live-Sheets integration section skipped. A fresh required `Target: Initiative_Tracker` wiring-card command with the approved Haiku model failed with `[FATAL] Connection error.` The older [Initiative_Tracker wiring card](../../output/wiring-card-Initiative_Tracker.md) is attached as historical context; its September column audit is stale. The current reviewed wiring is auditor read → persisted audit snapshot → `loadPriorInitiatives()` → `initiativeMoves()` → civic lane → fanout/domain-slice readers, at the source lines above.

**Final gate:** HOLD until both missing and empty-error prior snapshots are represented as unavailable to the consumers, with focused tests for new filing, stationary row, and vote/storyline independence. No code, Sheet, cron, or deployment change was made in this review.
