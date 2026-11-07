# Brief — engine.332 plan + diff review (the PROD candidate)

From: engine-sheet (Claude). Lane: codex-es. Read-only — no code, sheet or doc edits.

## What to review

The plan `docs/plans/2026-11-07-coverage-reaction-seeds.md` (§Current state, §Design 1–7, Acceptance 1–7, Pre-mortem) and its build `git show 2048ad406`. One review covers both.

Deploy candidate = PROD stage 39 + three Apps Script files at `2048ad406`: `phase02-world-state/applyEditionCoverageEffects.js`, `phase07-evening-media/buildContractSeeds.js`, `phase07-evening-media/applyStorySeeds.js` (comment only). `scripts/buildWorldSummary.js` is the Node desk-signal writer (runs from the repo, not clasped). The rest is tests and the regenerated stub maps.

The problem: a coverage rating of ±3 or more built a "Citywide reaction" seed into `S.storySeeds`, which has not reached Story_Seed_Deck since saveV3Seeds v4.0. Live: 55 strong ratings, 0 reaction rows. The fix records a `coverage-reaction` ripple at the Phase-2 compute site; the deck builder and the desk signal both read ripples. Builder rulings (2026-11-07, quoted in the plan): the beat's own desk; every ±3 a lead; the reporter named as fact.

## Ask

1. **Does the code do what the plan says**, with file:line: one ripple per |rating| ≥ 3 row read in the window (current or previous Cycle, unprocessed); none at ±2; causeId `<BEAT>:C<cycle>`; magnitude = the rating; one deck row per causeId; Domain / Desk from `contractSeedCoverageDomain_` → `CONTRACT_SEED_DESK`; `rippleLane()` gives the same desk in the desk signal.
2. **The plan's claims** — check each against the code: the old seed list is deck-dead; nothing sums ripple magnitudes into a dial or a score (every reader of `S.rippleEvents` and Ripple_Ledger, both engine entry points, the scripts); a magnitude of ±5 on a citywide row does not distort `buildContractSeeds_`'s in-cycle hint cap, the world summary, `routePatternSeeds`, the engine auditor, or anything else that reads the ledger.
3. **What it breaks** — the merged `edition-coverage` row; `S.rippleEvents` order effects (engine.206 carryover-lead logic); the Ripple_Ledger write path from Phase 2 (intents, lazy tab ensure); Apps Script global names; `buildWorldSummary.js` now requiring `buildContractSeeds.js` at load.
4. **The beat → desk table** (`CONTRACT_SEED_COVERAGE_DOMAIN`): does it match the newsroom's lanes (`scripts/engine-auditor/bayTribuneRoster.js` LANE_BY_DOMAIN) and every Domain the rater can write (`scripts/rateEditionCoverage.js` DOMAIN_TRACKER_COLUMNS, `sectionToDomains`, the persona-map beats)?
5. **The Why prose** — is "pulled the city's mood up/down" true from the code for every domain rule, including after the ±0.20 / ±0.25 clamps and the civic compound?
6. **Tests** — do `phase02-world-state/applyEditionCoverageEffects.test.js`, `buildContractSeeds.test.js` §11–12 and the `buildWorldSummary.test.js` lane cases prove what they claim, or would they pass on the old code. Name a missing case only if a defect could hide there.

## Output

`docs/for-claude-review/2026-11-07-codex-engine332-review.md`, shape from `docs/plans/PLAN_TEMPLATE.md` §Review: **Result:** SHIP | SHIP-WITH-FIXES | HOLD, then numbered findings with file:line evidence and a severity. Mark anything unverified as unverified.
