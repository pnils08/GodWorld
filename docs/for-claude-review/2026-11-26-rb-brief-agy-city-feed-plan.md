# Brief for agy — adversarial review: the city feed plan (before the build)

**From:** research-build · **Date:** 2026-11-26 · **Your output:** `output/antigravity/2026-11-26-review-city-feed-plan.md` · read-only on code and docs. Nothing is built; this is the plan read.

## What to read

- `docs/plans/2026-11-26-city-feed.md` — the whole plan (the builder's three messages are quoted at the top; they are the spec).
- The proven mold it copies: `scripts/sportsRecord.js`, `scripts/sportsFeedLive.js`, the newest rows of `output/beats/Oakland_Sports_Feed.jsonl` (the Notes column).
- What the non-sports seats get now: `output/slices/c117/elliot-graye.md`, `lila-mezran.md`, `business-desk.md`; their builders `scripts/buildFaithSlice.js`, `buildHealthSlice.js`, `buildEconomySlice.js`.
- Where a seat's record enters its wake: `scripts/cron-desk-run.js` BEAT_BUILDERS (:61), the own-pick branch (:2398-2426).
- The trigger it leans on: `scripts/cron-civic-run.js` week state (`engineFiredAt`, :4282-4420).

## Attack these

1. **The ref check (§Design step 4).** Can a model-written history sentence pass a "the canon doc contains the cycle and the person" check and still be false (right doc, wrong claim; a figure from one row attached to another person)? Name the cheapest check that would catch it. This feed becomes a fact source for ~14 seats whose gate-passed pieces are canon daily.
2. **Raw inputs only.** Does anything in the listed inputs (beats dump, LifeHistory window, citizens' pages, desk_signal storyline registry, staged headlines) already carry a code-written angle, hook or conclusion that would ride into an entry? Is anything the writer needs missing from what exists after a fire?
3. **The trigger.** Is the civic chain's week state a sound signal that the beats dump and desk signal are at the new Cycle? Name the race or the stale-file case.
4. **The record swap.** A seat's flat record leaves the wake and its entries lead. What does each seat lose that its gate, its interview pool (W2 matches the pool to W1's list), its people list, or `sitsOutWhenEmpty` depends on? Read one builder end to end and say what breaks.
5. **Puppeting.** The builder's line: a task is fine, words and conclusions are not. Does `StoryAngle` as "the first open question" or the `Seats` column with a named approach per seat cross it? Does the old "ASSIGNED ANGLE / the angle is fixed" path (`cron-desk-run.js` :2269) get reawakened by any of this?
6. **The two-seat rule.** "Different write models" checked against `scripts/newsroom-wake-packages.json` — is the write model what actually runs (fallbacks, per-day variants)?
7. **A new tab.** Anything that enumerates tabs or validates headers and would trip on `City_Feed` (pre-mortem, dashboard, backup, the dump).
8. **Scope.** What in the plan is more than the builder asked for, and what did he ask for that the plan drops?

File:line on every finding. Say plainly what you did not open.
