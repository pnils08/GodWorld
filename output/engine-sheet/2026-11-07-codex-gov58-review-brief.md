# Review brief — governance.58 (what waits on a fire lives once, in ROLLOUT §2)

Target: commit `0f2bf5538` (plus `783ad8aa6`, one line in `.claude/TERMINAL.md` §Jobs). Diff: `git show 0f2bf5538 783ad8aa6`.

Builder's words (2026-11-07): "your built in behavior writes this to session-context as well so is there a way to make the rollout the source for this so it's not written multiple places ?"

What it does:
- `scripts/docLoopStatus.js` — `nextFire(sessionText)` reads the PIN's `next live fire C<N> … YYYY-MM-DD`; `dueRows(rolloutText, fire)` lists live-observing/blocked rows (not `Organic:`) whose item names that Cycle or date; `nextCopiesWaiting(sessionText, rows)` flags a NEXT line naming a waiting row id; `--due [--terminal t]` prints the due rows + an overdue count; `printStale` (pre-commit `--stale-next --staged`) prints `NEXT COPIES` as a warning.
- `.claude/hooks/session-startup-hook.sh` — runs `--due` after the NEXT lines (timeout 10, stderr dropped).
- `.claude/skills/run-cycle/SKILL.md` Step 6, `.claude/skills/session-end/SKILL.md` Step 2 — the rule and the print.
- Tests: `node scripts/docLoopStatus.test.js` (39/39).

Questions, against the code:
1. Can `--due` or the hook block or slow a boot, or print wrong rows (false match / miss) on the live `docs/engine/ROLLOUT_PLAN.md`?
2. In `printStale --staged`, does the new `NEXT COPIES` read the index correctly, and can it throw where the stale check did not?
3. Is the warning (not a block) shape sound with the pre-commit hook (`.githooks/pre-commit`)?
4. Anything that now contradicts another doc or check (rollout-rules, the handoff gate)?

Scope: these files only; keep it short. Write findings to `docs/for-claude-review/2026-11-07-codex-governance58-review.md` with a verdict line.
