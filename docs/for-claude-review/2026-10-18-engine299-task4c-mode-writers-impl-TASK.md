# TASK — codex: engine.299 Task 4 wave C, the GAME / MEDIA / CIVIC mode writers sign every line by what it says

Deliver a patch, not a commit: `output/codex/engine299-task4c.patch` plus `output/codex/engine299-task4c.md` (each pool with its lines and the dial and sign you gave, the tests, how you proved it). Do not commit, do not push. No Sheet write, cron, model, bench fire or canon run. Report in one line when done.

**Plan:** `docs/plans/2026-10-18-event-engines-move-dials.md` Tasks 1 and 4. **The pattern to copy:** es's Task 1 cut in `phase05-citizens/generateCitizensEvents.js` (6db7b48f, bbe19647, 11334296) and Task 4 wave A in `phase04-events/generateGenericCitizenMicroEvent.js` (b578a6b7). Graded form and helpers are in `utilities/citizenDialMap.js` (`gradedTag_`, `gradedParts_`, `baseTag_`, `nudgesForEvent_`). Your Task 1 reviews (`docs/for-claude-review/2026-10-18-codex-engine299-task1-diff-review*.md`) hold the defects already found once. Do not reintroduce them: source-default sign, fail-open guard, guard after a side-effect hook.
**The builder's scope (2026-10-18):** "we aren't rebuilding any systems just cleaning up hardcoded events in the engines that don't fit how the sim works now." FIX, don't ADD: no new file except tests.

## Writers

- `phase04-events/generateGameModeMicroEvents.js`: `entry(text, tags, primary)` at :114. The pools are Personal/Team (:142-149), Life (:249) and Season (:263-275), with the append at :520-525.
- `phase05-citizens/generateMediaModeEvents.js`: `ev(text, tags, primary)` at :298. The Personal pool is at :273-276, and the primary reaches the cell at :428-433.
- `phase05-citizens/generateCivicModeEvents.js`: `ev(text, tags, primary)` at :336. The Civic and Personal pools are at :293-313, with the cell at :468-473.
- `utilities/tier1EssenceEvents.js`: the seed kinds Daily/Background/Personal (:46-48), Lifestyle (:141) and PrevEvening/FirstFriday (:855-856). These are **authored Tier-1 data**, written to LifeHistory_Archive by `scripts/seedTier1EssenceLive.js:127,169`. Do not change any essence text, and do not retag history already seeded. Make only future seed appends carry a graded tag, and only when the line's meaning gives a sign. If a seed kind has no honest sign, report it in the md instead of forcing one.

## Rule

1. Every entry whose primary maps to `{}` (Team, Season, Life, Personal, Civic, Lifestyle, Background, Daily, PrevEvening, and any other bare `{}` kind the writer uses) gets `dial:<dial>:<up|down>` **by what the line says**. Never take the sign from source, role, rank, ClockMode or tier. The nine dials are composure, outabout, sociability, family, warmth, openness, fandom, drive and integrity.
2. The written primary is `<Kind>-<Dial>-<Up|Down>-S` (the band is S unless the line is plainly heavier). The log row carries the written tag, not the bare kind.
3. Admission comes before any write or side effect: no dial, no line, counted in `S.engine299` the way the Task 1 writer counts.
4. Kinds with their own deltas in `DIAL_MAP` (Community, Cultural, Media, Reputation, Promotion …) keep their bare tag unchanged.
5. A line that throws a divorce, promotion, layoff, marriage, birth, death, hospital stay or move is not this layer. Report it rather than signing it.

## Prove it

- Writer-level tests: each writer's output has no new bare `{}` kind, a down-sounding fixture line is never Up, an unsigned entry is not written and is counted, and a kind with its own deltas stays bare. Reuse `scripts/engine299Graded.test.js` if it fits, otherwise name the new test file.
- `node --check`, the tests, `npm test` (subprocess EPERM reported as environment), and `git apply --check` against HEAD.
- Re-run `node scripts/deadBranchScan.js --offenders` against the bench (`--sheet-id=<the SANDBOX 1004 ID from docs/reference/DEPLOY.md §Current bench pointer>`), and report the code-site list for these files before and after.

Done = the patch applies and the md exists.
