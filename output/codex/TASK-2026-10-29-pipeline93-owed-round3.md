# TASK — codex round 3: pipeline.93 owed-responses re-review fold (research-build, 2026-10-29)

Your re-review `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-rereview.md` (HOLD, four findings) was folded in the commit that names this task (`git log -1 -- output/codex/TASK-2026-10-29-pipeline93-owed-round3.md`; `git show` it). Review that commit against your four findings and hunt anything the fold introduced. Same rules as before (`output/codex/TASK-2026-10-29-pipeline93-owed-diff-review.md`).

Fold, one line each (plan §Build "Codex re-review HOLD fold"):
- R1 `owedShownSet`: each event claims its own line occurrence in the final block (exact chaos text first, then patterns); `lifeTailOf` makes a second same-pattern pin take the next matching line.
- R2 `owedFrom` returns `unknownTabs` (unread, or required columns missing); the wake holds absorption while Casino/Hospital/Judicial is unknown (`owedCandidates(..., { absorb })`).
- R3 `SourceSystem` required on Judicial_Ledger (the live header has it — read 2026-10-29).
- R4 owed receipts leave the shared wake state for `logs/citizen-wake-owed.jsonl`: `pending` appended + read back before `page.appendReflection_` (failure → exit 1, no page); `shown` after it lands; `failed` on a page error. `owedStateFrom` groups by key and reads only the window; an unreadable line holds owed for the wake. The zero-reserve path never touches the journal.

**Two ceilings, named — review whether they are stated honestly, not whether they can be engineered away:**
1. The casino writer's LifeHistory line carries no WagerId or stake, so two same-status slips in one Cycle are matched by count of visible lines, not by identity. Putting the stake in the line is an engine change (a separate row), not this build.
2. A `pending` line with neither `shown` nor `failed` (the process died during the page step, or the `failed` write also failed) is counted as spent and logged unconfirmed — a possible missed wake, never a doubled one.

Not unit-tested: the script's two-phase ordering itself (it sits between live writes); read it in `scripts/citizen-wake.js`.

Evidence: `output/research-build/2026-10-29-pipeline93-c113-replay.txt` §"RE-RUN … round 3": same 6 owed, all shown, no unknown tabs; full dry run (no journal written); tail equivalence 1,053/1,053; suite 162/163 (the 1 = infrastructure.13).

Deliverable: `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round3.md` with SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output, registered per that folder's README, committed with a `codex:` message — your own commit only. Do not push.
