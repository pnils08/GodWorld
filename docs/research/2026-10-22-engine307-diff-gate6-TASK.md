# TASK — codex: engine.307 diff gate 6 (your gate-5 item 1 folded)

Read-only: code + docs + `output/` dumps; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-22-codex-engine307-diff-gate6.md`, one SHIP / HOLD per item and one final SHIP / HOLD for PROD, file:line evidence, under ~12 lines. Report in one line when done. The push (gate 4 item 2) and bench method SHIPped — do not reopen them.

1. **Role map (gate 5 item 1)** — `git show 028a21e9`: `roleSectorCategory_` returns null on `/sports|stadium|franchise|athletic/i` before its `sectorCategory_` fallback (`phase05-citizens/generationalWealthEngine.js`), so role text reads exactly as on stage 19. es differential vs `d86cdaeb^` over 678 role texts (every live RoleType, Generic_Citizens Occupation, economic_parameters role + seven sports cases): 0 differ. The mint's civilian-field rule therefore stands on the pre-307 role map. Hunt: any ENGINE mint title that reaches a sports org (named, carried, field) whose role reads a field on stage 19 and is not a civilian job — i.e. a hole that existed before engine.307 for every non-sports employer too would be out of scope; a hole engine.307 opens is in scope.
2. **Bench** — `output/engine-sheet/2026-10-22-e307-bench-B12.log` (B12 = `028a21e9`, manifest `stage19-e307-B12.sha256`); expect every Cycle's snapshot = B11's.

Done = the md exists.
