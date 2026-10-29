---
title: Code Review of the C113 Dirty Tree — nine findings, verify then fix
created: 2026-10-28
updated: 2026-10-28
type: plan
tags: [infrastructure, pipeline, active]
sources:
  - /code-review background run, research-build 2026-10-28 (agent ac619d85b4c5e33d3; 64 tool uses, read-only). Findings carried in full below; the run's output file is in /tmp and does not persist.
  - scripts/buildArticleIndex.js (staged reader :372-376, title fallback :176)
  - scripts/sessionEndMechanical.js (subRolloutLint :110-135)
  - scripts/cron-civic-run.js (engineFireInfo :3579)
  - lib/contextScan.js:44, lib/contextScan.test.js:104-106
  - output/initiative_tracker.json INIT-010
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — infrastructure.14"
  - "[[../engine/rollout-rules]] — row contract, filing loop"
---

# Code Review of the C113 Dirty Tree — nine findings, verify then fix

**Builder's words (2026-10-28):** "this did real work and this is essentially the plan doc here these 9 items. so lets record this as a plan and add a pointer on rollout ... Id like to prioritize this list and work through the items to check the claim is true and start to make the fixes"

**Goal:** every one of the nine findings is either confirmed in code/data and fixed, or refuted with evidence; no finding is carried on the review's word alone.

**Rows:** infrastructure.14 · **Owner:** research-build

Grouping note: the findings scan different surfaces (index builder, tracker, cron-civic, session close, a test). They share one origin (one review pass) and one method (verify the claim, then fix), so they ride one row; each task below is its own commit. A fix that lands in engine substrate (`phase*/`, `utilities/`) is split out as its own ROLLOUT row for engine-sheet, not built here.

## Priority

Ordered by blast radius if left, then by cost to fix. Verification column = what the 2026-10-28 read already showed (read-only, no fix applied yet).

| Rank | Task | Why this rank |
|------|------|---------------|
| 1 | T2 — engine.318 double-archive | Silent tracker corruption on the next close; one-row fix. Verified. |
| 2 | T8 — INIT-010 stale next-action | Desk packets tell reporters a vote is still ahead for a measure that passed. Canon-facing. Verified in artifact; writer not yet found. |
| 3 | T1 — suffixed staged reruns unindexed | Canon-gate-passed drafts unreachable by `search_articles`. Verified. |
| 4 | T6 — `engineFiredAt` from mtimes | Verdict-cutoff clock for a closed week moved. Verified in artifact; cause of the second c111 audit write is **open** — diagnose, do not mask. |
| 5 | T7 — sweep step swallows errors | A close can report clean with the tracker untouched. Verified in code. |
| 6 | T3 + T9 — title fallback, desk casing | Same file as T1; bundle into one `buildArticleIndex.js` pass. Both verified. |
| 7 | T4 — contextScan test pollutes the audit log | Real-citizen name in a tracked prod log; needs a path override in `lib/`. Verified. |

Finding 5 of the review (stale NEXT line) is closed: the files it named were restored at `f9fc4b94` and the line was trued at `cf441805`.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| T2 | `rolloutSweep.js parseRows` (:60-78) never checks the archive for an id; engine.318 sits in both ROLLOUT_PLAN.md:138 and the uncommitted ROLLOUT_ARCHIVE pass. Fix: remove the row from the plan, and make the sweep skip an id already archived. | rb | not started |
| T8 | Find which writer sets `implementation.phase=operational` on a passed vote without clearing `nextScheduledAction`/`summary` (`applyTrackerUpdates.js` G-PREP2 :328-333 is the suspect). Fix at the writer; correct INIT-010 through the sanctioned path, not by hand-editing the tracker. | rb | not started |
| T1 | Staged reader matches `/\.staged\.json$/` only; six C112 suffixed reruns (Ines -1615/-1814/-2320, Tamsin -2320, Nia -2319/-2321) absent from `ARTICLE_INDEX.jsonl`. Fix: match `/\.staged(-\d+)?\.json$/`, derive stem the same way, rebuild the index, count rows. | rb | not started |
| T6 | `engineFireInfo` (:3579) takes `firedAt` from artifact mtimes. `engine_audit_c111.json` mtime is 2026-10-18 22:15 CDT, a week after C111; `week_state_c111.json` `engineFiredAt` moved 2026-10-13 → 2026-10-19T03:15Z to match. Find what rewrote the audit. Fix the clock source only after the cause is named. | rb | not started |
| T7 | `subRolloutLint` catch returns `{ ok: true }` on any error incl. a missing ROLLOUT_PLAN. Fix: fail the close (or at minimum return `ok:false` and print under the fatal header) when the plan file is unreadable. | rb | not started |
| T3 | Title fallback `pick = cluster.length ? … : above[0]` skips the `plain()` ≤280 guard. Rows 758 (454 ch), 786 (527), 875 (513). Fix: apply the guard; those rows take `title:null` + a `lede`. | rb | not started |
| T9 | Edition path stores `desk` raw ("Undocked-digest", 1 row); staged path uses `titleCase` ("Undocked-Digest", 3 rows; "Undocked", 9). Fix: normalise the edition path with the same `titleCase`. | rb | not started |
| T4 | `lib/contextScan.js:44` `BLOCK_LOG_PATH` is a hard-coded constant; test 10 appends to the tracked `output/injection_blocks.log` on every run with a real ledger name. Fix: env/arg override, test writes to a temp file with a visibly synthetic name; the 368 `contextScan-bad` lines already in the tracked log come out. `lib/` is gated — propose, land through engine-sheet. | rb → es | not started |

## Acceptance

1. T2 — next `sessionEndMechanical` run writes no second engine.318 entry; `docLoopStatus.js --lint` clean — proven by a dry-run sweep.
2. T8 — INIT-010 desk-packet reference no longer carries "Committee hearing and vote"; the writer clears or replaces the field on every passed-vote path — proven by a test on the writer and the next `truesource_reference.json` build.
3. T1 — index holds the six suffixed C112 reruns; `search_articles` returns them — proven by row count and a query.
4. T6 — cause of the c111 audit rewrite named in this plan; `engineFiredAt` for a closed week no longer moves when an old artifact is touched.
5. T7 — a close with `ROLLOUT_PLAN.md` missing exits non-zero.
6. T3/T9 — zero titles >280 chars; one `desk` spelling per desk — proven by a scan of the rebuilt index.
7. T4 — running the test adds zero lines to the tracked log.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| /code-review background run over the dirty tree, 2026-10-28 | rb | this file §Needs proof (full findings; the run's own output is not durable) | read-only; 9 findings, 1 closed on arrival |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Finding 5 (stale NEXT line) is moot: control-plane files restored, line trued. | rb · es | `git show f9fc4b94`, `git show cf441805` |
| A2 | T2: engine.318 present in both ROLLOUT_PLAN.md:138 and the new ROLLOUT_ARCHIVE pass. | rb (read 2026-10-28) | `grep -n engine.318 docs/engine/ROLLOUT_PLAN.md`; `git diff HEAD -- docs/engine/ROLLOUT_ARCHIVE.md` |
| A3 | T1: `.staged.json`-only glob at `buildArticleIndex.js:373`; suffixed reruns exist in `output/cron-compare/staged/`. | rb (read 2026-10-28) | file:373, `ls output/cron-compare/staged` |
| A4 | T3: three titles >280 chars (rows 758/786/875). T9: desk spelled three ways. | rb (read 2026-10-28) | scan of `archive/ARTICLE_INDEX.jsonl` |
| A5 | T7: catch returns `{ ok: true }` at `sessionEndMechanical.js:131-134`. | rb (read 2026-10-28) | file:131 |
| A6 | T4: test writes the tracked log at `contextScan.test.js:105-106`; path is a module constant at `contextScan.js:44`. | rb (read 2026-10-28) | both files |
| A7 | T8: INIT-010 shows `passed`/`operational` with `nextScheduledAction` "Committee hearing and vote", cycle 113. | rb (read 2026-10-28) | `output/initiative_tracker.json` |
| A8 | T6: `engine_audit_c111.json` mtime 2026-10-18 22:15 CDT matches the new `engineFiredAt`. | rb (read 2026-10-28) | `ls -l output/engine_audit_c111.json` |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | T6: the second c111-labelled audit write came from engine.312 (review's guess, "not confirmed"). | review only | Find the process that wrote `engine_audit_c111.json` at 2026-10-18 22:15 (cron log / PM2 log / git log of the writer), before touching `engineFireInfo`. | `scripts/cron-civic-run.js:3579`; engine.312 row |
| P2 | T8: `applyTrackerUpdates.js` is the writer that leaves the field stale. | review's pointer | Read the vote-pass path that sets `phase=operational`; reproduce with a fixture in a unit test. | `scripts/applyTrackerUpdates.js:328-333` |
| P3 | T1: the six reruns would be indexed with the fixed glob without duplicate rows against the printed copies. | rb | Rebuild into a temp file; diff row counts and fingerprints against the current index. | `scripts/buildArticleIndex.js:394-408` |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | Sweep skips an id already in ROLLOUT_ARCHIVE (T2 second half). | rb | Makes the double-archive impossible, not just repaired once. | adopted into T2 |

## Open questions

- T4 touches `lib/` (gated) — land through engine-sheet or the builder names the path. Blocks T4 only.

## Changelog

- 2026-10-28 (research-build) — Created from the /code-review run; priority set; eight findings verified in code or data, P1-P3 open.
