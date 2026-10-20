# TASK — codex: engine.304 final gate (the whole stack before PROD)

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine304-final-gate.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~80 lines. Report in one line when done.

`git diff 25ee233c^ fc89b332 -- phase01-config phase05-citizens phase07-evening-media lib/citizenPage.js lib/wakePerception.js` — the PROD candidate is stage 9 + the 8 Apps Script files of that diff (manifest `output/engine-sheet/stage11-e304.sha256`) + the two cron-side lib files. Plan: `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §engine.304 (design pass, review fold, Build and Bench blocks). Your per-cut reviews are in `docs/research/2026-10-19-codex-engine304-*`.

1. **Interactions across the cuts** that no per-cut review saw: the cut-1 pool (youth, split floors, the wave's adult-only preference, surfacing age gate) under cut 2's link/release/arrival and cut 3's usage typing — anything that only breaks together (e.g. a linked minor and the wave; a released row and the floor count; the surfacing age gate and a Family child).
2. **The live order**: header M–O written on live → read back → clasp push of the 8 files → first live fire C113 (Sun 2026-10-25), stacked on stages 5 and 9 which also first fire then. The cron-side files are already on main in the working tree (crons load them now): confirm they change no state on live until M–O exists, and name every read they add.
3. **Bench evidence vs claim**: `output/engine-sheet/2026-10-19-e304c2-bench.jsonl` and `-sitting.log` (20/20, 136 links, 2 releases, the C133 probe) — does the readback check what the plan claims (links by tier/role, release causes, arrivals wired, integrity)? Anything the bench could not have exercised that PROD will (media rows naming a Family member; own-words rows; a divorce or death of a citizen with a linked spouse in the same Cycle as the arrival)?
4. **Rollback**: if C113 goes wrong, what does reverting the 8 files leave behind on live (Family rows, M–O columns, renamed GC rows, family-own-words usage rows) and does stage 9 code read any of it wrongly?

Done = the md exists.
