# REVIEW — UNDOCKED pilot brief v3: leave Sol when its belts are empty (research-build 2026-10-29)

Adversarial review, SHIP / SHIP-WITH-FIXES / HOLD, per AGENTS.md. Write to `docs/for-claude-review/2026-10-29-codex-undocked-brief-v3.md`. Diff: `git diff HEAD~1 -- scripts/undockedMissionBrief.js scripts/undockedMissionBrief.test.js` (or `git show` of the commit that names this file).

Claim under review: pilots score ~0 because the brief hardwires "Stay in home space" while Sol's belts read `remaining: 0`; the one pilot who scored (Eric Taveras, 1,170 cr, feed c111 `undocked-pop00597-Y3C7-e2`, Systems `["sirius"]`) flew outside Sol. Evidence: plan `docs/plans/2026-08-07-spacemolt-game-show.md` last changelog line (10-29); logs `output/spacemolt-show/episodes/undocked-pop00775-2026-10-26T01-30-05.log` (lines ~89-97, all three Sol belts `remaining: 0`) and `undocked-pop00597-2026-10-16T01-30-04.log`.

Hunt, with file:line and the failure it causes:
1. Does any other code or brief (the draw-1 static briefs, `cron-undocked-run.js` preflight/stall rules, the episode adapter) still enforce home space, so v3 never takes effect?
2. Can leaving Sol break anything downstream: feed adapter `Systems`, standings, the Nia slice, ship-loss rules, the hard-stop rule, the stall detector (a longer flight)?
3. Is any claim in the plan line not backed by the logs? Is the 20-of-29 count right (`"tool_error"` with `spacemolt/mine`)?
4. Are the three new tests real (they pin brief text only; say what they cannot prove).
Do not touch the sheet, the game server, or any cron. Findings the code does not back are not findings.
