# Brief — engine.335 plan + diff review (the PROD candidate)

From: engine-sheet (Claude). Lane: codex-es. Read-only — no code, sheet or doc edits.

## What to review

The plan `docs/plans/2026-11-07-household-game-night-fandom.md` (§Current state, §Design 1–5, Acceptance 1–7, Pre-mortem) and its build `git show 3184f9f50`. One review covers both.

Deploy candidate = PROD stage 40 (DEPLOY_HISTORY §PROD, @176) + two Apps Script files at `3184f9f50`: `phase05-citizens/runHouseholdEngine.js`, `utilities/citizenDialMap.js`. The rest is tests, the plan, the index, the rollout row and a gap-log note.

The change: a household's game-night line was tagged `Household-GameNight`, which the dial map strips to `Household` (family +5). Builder rulings (2026-11-07, quoted in the plan): families watching at home also move the fan dial, on top of family; one step, like a city fan's game night. Now a win / win-streak night tags `Household-GameNight-Win` (family +5, fandom +1), a loss / cold-streak night `Household-GameNight-Loss` (family +5, fandom −1); a neutral night keeps the plain tag.

## Ask

1. **Does the code do what the plan says**, with file:line: the tag follows `gameNightBucket_` exactly as the city's fan lines sign (`generateCitizensEvents.js:2198-2199`), for the club whose night it is; `nudgesForEvent_` resolves both new tags to exactly those two dials at both entry points' fold paths; the plain tag and every line already in LifeHistory still fold as `Household` only.
2. **Every reader of the tag string** — anything in `phase*`, `utilities`, `lib`, `scripts`, `dashboard` that keys on `Household-GameNight`, on the `Household` kind via `baseTag_` or a prefix, or on a `-Win` / `-Loss` tail (pulse map, Lives slice, world summary, compressor trait map, wake perception, resonance, classifier gate, dead-branch scan, dedupe or recent-tag logic, the game-night Ripple). Which ones change behaviour, and is any change wrong?
3. **The fold arithmetic** — per-Cycle netting in `foldNewEntries_` (`compressLifeHistory.js`), fandom's mood decay (`citizenMemory.js` MOOD_DECAY_BY_DIAL) and anything that caps or bands fandom: is +1 / −1 per line what the citizen's TraitProfile actually moves by?
4. **What it breaks** — Apps Script global names, `deadBranchScan` / `seedTier1Essence` / `backdateCitizenDials` treatment of an unknown-before tag, any test or audit that pins DIAL_MAP's keys.
5. **Tests** — do `householdEngine.t4.test.js` 5.9–5.13 and `citizenDials.test.js` X12 / X12b prove what they claim, or would they pass on the old code? Name a missing case only if a defect could hide there.

## Output

`docs/for-claude-review/2026-11-07-codex-engine335-review.md`, shape from `docs/plans/PLAN_TEMPLATE.md` §Review: **Result:** SHIP | SHIP-WITH-FIXES | HOLD, then numbered findings with file:line evidence and a severity. Mark anything unverified as unverified.
