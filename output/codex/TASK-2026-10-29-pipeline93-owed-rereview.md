# TASK — codex re-review: pipeline.93 owed-responses fold (research-build, 2026-10-29)

Your review `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-diff-review.md` (HOLD, six findings) was folded in the commit that names this task (`git log -1 -- output/codex/TASK-2026-10-29-pipeline93-owed-rereview.md`; `git show` it). The plan's §Build "Codex HOLD fold" paragraph maps each finding to its change. Re-review that commit against F1–F6 and hunt anything the fold introduced. Same rules as the first task (`output/codex/TASK-2026-10-29-pipeline93-owed-diff-review.md`).

Fold in one line each:
- F1 `livedFor(..., prefer)` + `owedLivedPrefer`: an owed admission outranks a newer lived event; a hospital mark counts as shown only when the lived pick is that admission.
- F2 `CASINO_PIN` by settled status (win line vs loss line incl. the two Setback variants).
- F3 Judicial `SourceSystem=reconcile` skipped with a reason.
- F4 (and all kinds) `owedShown`: only events whose evidence is in the final perception are receipted; `owedCandidates(..., lived)` reports `unshowable` and never reserves them.
- F5 `loadOwedRecords` via `Promise.allSettled`, per-tab errors; `owedFrom` checks required columns per tab.
- F6 `ageOwedState` on every owed-on wake; read-back after `saveState`. Zero-reserve path guarded (`OWED_RES > 0`).

Evidence: `output/research-build/2026-10-29-pipeline93-c113-replay.txt` (the section "RE-RUN after the codex HOLD fold"): same 6 owed, all shown; full dry run; tail equivalence 1,053/1,053; suite 152/153 (the 1 = infrastructure.13). Read them as claims.

Deliverable: `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-rereview.md` with SHIP / SHIP-WITH-FIXES / HOLD, every finding with file:line and input → wrong output, registered per that folder's README, committed with a `codex:` message — your own commit only. Do not push; a Claude terminal lands it.
