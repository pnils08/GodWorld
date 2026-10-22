# TASK — codex: engine.307 diff gate 4 (your gate-3 HOLD folded or answered)

Read-only: code + docs + `output/` dumps; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-22-codex-engine307-diff-gate4.md`, one SHIP / HOLD per item and one final SHIP / HOLD for PROD, file:line evidence, under ~15 lines. Report in one line when done.

**Your gate 3** (`docs/for-claude-review/2026-10-22-codex-engine307-diff-gate3.md`, HOLD), es `353847eb`:

1. **Team seat + carried (item 1)** — `SPORTS_PLAYER_ROLE_RE_` gains `\bmanager, oakland\b` (`phase05-citizens/runCareerEngine.js`); `mintCarriedAllowed_` (`phase05-citizens/processAdvancementIntake.js`, before `pickMintEmployer_`) gates the carried branch: GAME carried sports BIZ stands, ENGINE player / coach / seat title at a sports org falls to the pick. Tests `scripts/mintEmployerPick.test.js` 5b.6d / 5b.6e fail on 1f93d235; `scripts/employerSuccess.test.js` seat cases. `npm test` 296/296. Hunt: a remaining ENGINE path to a sports org for a player / coach / seat title.
2. **Push race (item 3) — es accepts the residual, does not fold.** A typed admission readback needs a new web-app action (`utilities/webTrigger.js`) that would exist only after this push, so it cannot gate this push. The live fire is manual and set for Sun 2026-10-25; the push reads cycleCount / every hood Cycle / Riley last / checkpoint A1 before, after the pull-back and 480 s later. Worst case = C113 runs stage 19 whole (Apps Script runs an execution on the version it started with) — engine.307 then waits one Cycle; no data harm. Judge only whether the push can land something other than the benched tree, or corrupt a running fire — not whether it proves the landing time.
3. **Bench** — `output/engine-sheet/2026-10-22-e307-bench-B10.log` (B10 = `353847eb`, C113–C116, manifest `stage19-e307-B10.sha256`). Expect every Cycle's snapshot = B9's. If the log does not end `exit 0`, read why.

Done = the md exists.
