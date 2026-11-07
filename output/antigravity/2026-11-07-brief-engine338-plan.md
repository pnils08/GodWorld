# Brief — engine.338 plan review (adversarial), research-build → agy, 2026-11-07

Read-only review. Do not edit code or the plan. Write your review to `output/antigravity/2026-11-07-review-engine338-plan.md`.

## What to review

`docs/plans/2026-11-07-former-player-next-chapter.md` — the whole file, with weight on §Read-before, §Calls, §The post-sports pool, §Design (v1, items 0, 0b, 1–5), §Acceptance.

The row: a former A's player (Vinnie Keane, POP-00001, retires on the C115 feed row Sun 2026-11-08) has no engine path to a post-career role. v1 design: (0) at the retirement flip Income becomes a per-tier post-career figure from World_Config; (0b) a new sports-feed trigger word `question` makes the next citizen wake owed and carries the builder's question; (1) the Advancement_Intake1 existing-row branch learns to write EmployerBizId / ClockMode / EconomicProfileKey; (2) the wake's reply carries a closed `next-chapter` move to an append-only ledger; (3) a Sunday fold routes the move to an intake row by category. Not in the row: any spend/draw-down path, engine-posed questions.

## Verify against the code, not the plan's claims

- `phase05-citizens/applyGameNightMoments.js:263-290` (`sportsRetire_`), `:477-505` (trigger routing), `utilities/setupSportsFeedValidation.js:171` (feed word list).
- `phase05-citizens/processAdvancementIntake.js:880-935` (existing-row writes), `:800-830` (clock refusal), `:995-1015` (mint).
- `phase05-citizens/generationalWealthEngine.js:413-538` (money loop), `:786-791`, `:1019-1024`, `:1186-1188` (the Tier 1–2 skips), `:1113-1205` (owner draw / heritage gain).
- `lib/wakePerception.js:925-938` (owed wake, fifth source), `scripts/citizen-wake.js` (the wake), `scripts/cron-civic-run.js` (the move-ledger precedent the design copies).
- `lib/economicLookup.js:58-87` (`isRetired` pension modifier — the plan says zero engine callers; check).

## Questions

1. Design 0 writes Income inside `sportsRetire_` from World_Config. Is World_Config readable there (ctx.config) at that phase, and does ADR-0015 self-arm apply? Name the pattern it should copy (engine.276 `debtConfig_`).
2. Design 0b: a `[Question]` LifeHistory_Log line as the fifth owed-wake source — does `wakePerception.js:925-938` key on the `[Retirement]` tag literally, or on a source list that can take a second tag? What breaks if a citizen has both owed in one window?
3. Design 1: the three new cells on the existing-row branch — what else reads EmployerBizId / ClockMode on the Cycle after a change (pay floor, Universe branch, staff week line) and would any of them re-price or re-route in a way the plan does not name?
4. Design 2/3: the move ledger + Sunday fold — the civic precedent lives in `cron-civic-run.js`; is there a shared validator or must this copy it? Where does the Sunday pre-fire path run a Node step today?
5. The pool table: anything in the catalog loader (`lib/economicLookup.js`, `educationCareerEngine.js:1244`) that a new `Sports` category would trip (category enum, output category map)?
6. Acceptance 1–3: is each provable on the bench as written, and what is missing (e.g. the Income write at the flip has no acceptance line)?

## Format

Findings numbered F1…, each with file:line, severity (blocks / should-fix / note), and a one-line fix. End with SHIP / HOLD on the plan as a build basis. Keep it under 150 lines.
