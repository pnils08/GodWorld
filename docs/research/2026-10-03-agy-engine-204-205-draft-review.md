---
title: agy review — engine.204/205 read-before (read-only, 2026-10-03)
status: accepted — folded into the read-before 2026-10-03 02:00
owner: antigravity (review); research-build (fold)
parent: [[2026-10-03-engine-204-205-game-day-economy-read-before]]
---

# Review: engine.204/205 game-day economy

## Hunt 1: Code Claims in §1.1–§1.6
- **Evidence:** `utilities/sportsWeekRecord.js:7-32`. **NOTE**: Correct, it successfully extracts `games[]`, `wins`, `losses`, `gamesPlayed`, `homeGames`, `awayGames`, `firstResult`.
- **Evidence:** `phase02-world-state/applySportsSeason.js:227-258`. **NOTE**: Correct, blank `weekRecord` bypasses the `foldSportsWeeks_` block without throwing an error, leaving the row to affect the lens but not folding into the week object.
- **Evidence:** `grep sportsWeeklyResult_`. **NOTE**: Correct, `casinoLedgerEngine.js:152` is the only caller of `sportsWeeklyResult_`.
- **Evidence:** `grep -roE "=== 'championship'|=== 'playoffs'|=== 'late-season'" phase*/ lib/ utilities/ | wc -l`. **FIX**: The count in the draft is overstated. There are 85 exact `===` tests across the codebase, not 174. 
- **Evidence:** `phase02-world-state/updateTransitMetrics.js:666-673, 781`, `phase02-world-state/applySportsSeason.js:950-975`, `phase07-evening-media/cityEveningSystems.js:405`. **NOTE**: Correct, `HomeNeighborhood` is read by transit and populates `sportsNeighborhoodEffects` which is only read by evening crowd.
- **Evidence:** `phase06-analysis/applyShockMonitor.js:83-92`. **NOTE**: Correct, `simMonth` is read here to derive a simple sports phase.
- **Evidence:** `phase06-analysis/economicRippleEngine.js:1068-1069`. **NOTE**: Correct, both positive and negative ripple impacts are counted, meaning negative ripple impact is structurally supported.

## Hunt 2: Re-litigation
- **Evidence:** §2.1 formulas and §2.2 mechanisms vs §0 readings. 
- **NOTE**: No re-litigation. The lens (last entry) correctly dictates `stakes` and `reach`, while the folded `WeekRecord` correctly drives `vol`. Volume is preserved unsigned and applied to venue traffic/crowd, meaning a losing week does not thin the physical crowd, adhering perfectly to Q2.

## Hunt 3: C110 Worked Case
- **Evidence:** `output/beats/prev/Oakland_Sports_Feed.jsonl` lines for C110 A's. 
- **NOTE**: The C110 feed rows perfectly match the claim: two playoff game-result rows (both `A:W`, HomeNeighborhood `Eastlake`), followed by a third row typed `championship` with a blank `WeekRecord` and `HomeNeighborhood` `Eastlake`. 
- **NOTE**: `deriveSeasonByTeamFromFeed_` (`applySportsSeason.js:417`) correctly takes the later row, meaning the lens becomes `championship`. The mathematical breakdowns and consequences of "what today's code does" and "what the cut does" are exactly true.

## Hunt 4: Always-on / §15
- **Evidence:** Calculated K1 sums against proposed bands (`top` ≥ 0.75, `quiet` < 0.10 or below half median). 
- **NOTE**: The mechanisms do not create a permanent lift or unreachable gate. The historical sums map across the entire spectrum (`quiet` to `top`), allowing realistic fluctuation and decay.

## Hunt 5: Seams
- **Evidence:** §2.2, §2.4, §2.7. 
- **NOTE**: The proposal correctly avoids overstepping seams. Sentiment magnitude is untouched (engine.194), game night magnitude is untouched (engine.194), and expectation/surprise is properly exposed for engine.208's consumption.

## Hunt 6: Sim vs Mechanism
- **Evidence:** §2 vs §4. 
- **NOTE**: The division is correct. §2 contains mathematical models (saturating curves, clamping, multiplication) which are mechanisms, while §4 extracts the pure numbers (priors, weights, reach coefficients, column preservation decisions) for the builder to tune.

## Hunt 7: Missing Consumer
- **Evidence:** `grep -rn "sportsSeason"` checking numeric sites against §1.4. 
- **FIX**: `phase07-evening-media/mediaFeedbackEngine.js` reads `sportsSeason` to supply numeric modifiers that are not listed in §1.4. Specifically, it applies a `hopeBoost` (`+= 0.15` for championship, `:533-541`) and a numeric topic multiplier for the media feedback (`cal.sportsSeason === 'championship' ? 2.0 : ...`, `:1341`).

## Verdict
**SHIP-WITH-FIXES**

Correct the word-test count in §1.4 from 174 to 85, and append `mediaFeedbackEngine.js` to the consumer census in §1.4 and the migration map in §2.2 to handle `hopeBoost` and media topic multipliers.
