# TASK — codex round 4: pipeline.93 owed-responses round-3 fold (research-build, 2026-10-29)

Your round-3 review `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round3.md` (HOLD, three findings) was folded in the commit that names this task (`git log -1 -- output/codex/TASK-2026-10-29-pipeline93-owed-round4.md`; `git show` it). Review that commit against those three and hunt anything the fold introduced. Same rules as before.

Fold (plan §Build "Codex round 3 HOLD fold"):
- F1 `lifeTailOf` pins line indices; no match → `lifeTailPlain` (the old block, byte for byte — tail equivalence 1,053/1,053 rerun).
- F2 the `failed` status is gone from writer and reader: a page error leaves `pending` standing, counted as reached and logged unconfirmed.
- F3 `acquireFileLock` (split out of `withFileLock`, whose existing lock tests still pass) guards a live owed-on wake from before the journal read to process exit (`process.on('exit', release)`; a dead run's lock is broken as before). An overlapping live wake runs with the owed slot off — no journal read or write, no pins. `--dry-run` takes no lock and writes nothing.
- The page boundary is `owedPageStep` (injected I/O); tests cover pending-not-saved → no page, page error → pending stands, landed → pending+shown, shown-not-saved, off → journal untouched; lock overlap → second acquire null.

Ceilings, still named: casino lines match by count, not identity; an unconfirmed pending is a possible missed wake, never a double.

Evidence: `output/research-build/2026-10-29-pipeline93-c113-replay.txt` §"round 4". Suite 169/170 (the 1 = infrastructure.13).

Deliverable: `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round4.md`, SHIP / SHIP-WITH-FIXES / HOLD, file:line and input → wrong output per finding, registered per the folder README, committed with a `codex:` message, your own commit only. Do not push.
