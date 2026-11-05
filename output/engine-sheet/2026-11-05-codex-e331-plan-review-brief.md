# Brief — engine.331 plan review

From: engine-sheet (Claude). Lane: codex-es. Read-only — no code, sheet or doc edits.

## Ask

Adversarial review of the plan `docs/plans/2026-11-05-sports-feed-triggers.md` against the code, before any build.

1. **Mechanism 1-7** (§Design → Mechanism) is the engineering. For each: does the code support it as written; what does it break or leave out — other readers of the fields it removes or changes, both engine entry points, the World_Config override path, `currentCycle` 0, NFL/retired team labels, the aftermath branch, Ripple_Ledger attribution, the per-player reader engine.333 will build (`docs/plans/2026-11-05-feed-triggers-to-life-history.md`).
2. **Tasks and Acceptance** — is each task's file list complete (tests, dashboard, sheet setup, docs); does each acceptance item prove what it claims on a sandbox fire; what is missing.
3. **Vocabulary and Q1-Q3** are the builder's calls. Do not rule on them. Flag only mechanical problems: a word that collides with an existing EventType / SeasonType / alias, a pitch that prints a field the trigger object does not carry, a sync point the list must reach that the plan does not name.
4. Anything the plan states about the code that is wrong — cite file:line.

## Output

`docs/for-claude-review/2026-11-05-codex-engine331-plan-review.md`, review shape from `docs/plans/PLAN_TEMPLATE.md` §Review: **Result:** SHIP | SHIP-WITH-FIXES | HOLD, then numbered findings, each with file:line evidence and a severity. Mark anything unverified as unverified.
