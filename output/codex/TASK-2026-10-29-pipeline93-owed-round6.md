# TASK — codex round 6: pipeline.93 owed-responses round-5 fold (research-build, 2026-10-29)

Your round-5 review `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round5.md` (HOLD, two findings) was folded in the commit that names this task (`git log -1 -- output/codex/TASK-2026-10-29-pipeline93-owed-round6.md`; `git show` it). Review it against those two and hunt anything the fold introduced. Same rules as before.

Fold:
- F1 page occupancy = `owedPageKey(POPID, Cycle, daypart)` — the three parts of `citizenPage.appendReflection_`'s customId, no date — written on every journal line (`page`) and read back by `owedStateFrom().pageKeys`. Tests: a later morning in the same Cycle sees the key taken; other daypart / citizen / Cycle do not; a two-date same-Cycle sequence against a first-write-wins store leaves the first page standing and spends nothing on the second run (the event stays owed).
- F2 Build intro sentence now names the owed journal; the round-4 claim is narrowed in the plan (`scripts/magsPageAppend.js`, Mags's page only, operator-run, takes any daypart).
- Surfaced, filed as its own row (pipeline.94), not this build: a citizen woken twice at one daypart in one Cycle writes one page doc twice.

Evidence: suite 177/178 (the 1 = infrastructure.13); tail equivalence unchanged (life-block code untouched this round). Reserve still 0.

Deliverable: `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round6.md`, SHIP / SHIP-WITH-FIXES / HOLD, file:line and input → wrong output per finding, registered per the folder README, committed with a `codex:` message, your own commit only. Do not push.
