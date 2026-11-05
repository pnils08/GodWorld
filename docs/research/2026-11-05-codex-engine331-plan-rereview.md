---
title: Codex re-review — engine.331 sports feed trigger plan fold
created: 2026-11-05
updated: 2026-11-05
type: review
tags: [review, engine, sports, feed]
sources:
  - docs/plans/2026-11-05-sports-feed-triggers.md at 9218f8c8c
  - docs/for-claude-review/2026-11-05-codex-engine331-plan-review.md findings 1-9
  - docs/plans/2026-11-05-feed-triggers-to-life-history.md
---

# Codex re-review — engine.331 plan fold

**Target:** The single fold at `9218f8c8c`, against the nine findings in `2026-11-05-codex-engine331-plan-review.md:23-39`. “Closed” below means the **plan** now gives an implementable rule and named proof; it does not mean code or sandbox proof has shipped.

**Result:** HOLD

Seven findings are closed at plan level. Findings 3 and 4 are partly closed: the shared row field can still carry a canonical trigger from an NFL/retired row into the future named-player reader, and the engine.333 plan still requires a typed hot-streak line that this fold forbids. The revised fire-1 recipe also needs an explicit third Oaks row to execute its three trigger values. Q1–Q3 remain with the builder.

## Findings

1. **Closed (original High).** The inferred title now requires an `entry.weekGames > 0` row with raw `SeasonType='championship'`, independent of the week's last-row lens (`docs/plans/2026-11-05-sports-feed-triggers.md:77`). Task 2 names both mixed-row orders and Acceptance 6 requires them (`docs/plans/2026-11-05-sports-feed-triggers.md:144,160`). This addresses the last-row lens behavior in `phase02-world-state/applySportsSeason.js:320-337`; implementation remains unverified.

2. **Closed (original High).** The fold makes `S.sportsFeedEntries` the moment-row input to `processFeedSheet_` and declares override = no feed moments (`docs/plans/2026-11-05-sports-feed-triggers.md:70,73`). Task 2 tests empty entries under override, and Task 9 passes that contract to engine.333 (`docs/plans/2026-11-05-sports-feed-triggers.md:144,151`). This closes the prior split between `phase02-world-state/applySportsSeason.js:36-65` and `:841-854` at plan level.

3. **Partly closed (original High).** The positive-Cycle guard and A's/Oaks-only **hook emission** gate are explicit, with Cycle 0/NFL/retired tests (`docs/plans/2026-11-05-sports-feed-triggers.md:70-73,144,161`). Yet the same reader still returns rows for every team today (`phase02-world-state/applySportsSeason.js:216-250`), and the fold canonicalizes each returned row's `eventTrigger` without a team gate (`docs/plans/2026-11-05-sports-feed-triggers.md:78`). The future named loop resolves a row's NamesUsed without rejecting `team='NFL'` or the retired empty label (`phase05-citizens/applyGameNightMoments.js:217-233`). The new cross-reader problem is detailed below.

4. **Partly closed (original High).** Engine.331 now specifies typed hot/cold → empty canonical word, `S.sportsWeek[team].hotCold` as the sole automatic source, and a W2 named-row test (`docs/plans/2026-11-05-sports-feed-triggers.md:76,144,151`). The still-current engine.333 design routes a named `hot-streak`/`cold-streak` row and its Acceptance 2 requires a Sports-Streak-Hot line (`docs/plans/2026-11-05-feed-triggers-to-life-history.md:89-93,118,124`). Task 9 promises to re-point that table later, but these two plan contracts conflict now. Reconcile the sibling plan's design, sandbox task and acceptance before either team builds the named route; no builder vocabulary ruling is needed to settle this mechanical conflict.

5. **Closed (original Medium).** Mechanism 4 uses the one existing validated bar read beside `markSportsStreakHeadline_`; `null` means no hot/cold and no second error. It explicitly separates the business headline's sign gate from the hook rule, with invalid-dial proof in Task 2 and Acceptance 7 (`docs/plans/2026-11-05-sports-feed-triggers.md:76,144,161`; `utilities/sportsWeekRecord.js:433-458`). Q2 still decides the bar and the stated run rule.

6. **Closed (original Medium).** The canonicalizer is pure; blank/`-`/`none` resolve before unknown reporting; `readOaklandFeedEntries_` is the sole warning caller with a per-Cycle seen set (`docs/plans/2026-11-05-sports-feed-triggers.md:75,78`). Task 2 covers repeated unknown values, engine-only typed values, and one warning (`docs/plans/2026-11-05-sports-feed-triggers.md:144`). This resolves the two-reader warning risk from the existing separate reads (`phase02-world-state/applySportsSeason.js:71-74,841-854`).

7. **Closed (original Medium).** Task 5 now changes the seeder's values to blank and names its test, while Task 2 names the `sportsFeedParser.test.js` carry assertions to rewrite (`docs/plans/2026-11-05-sports-feed-triggers.md:144,147`). Those are the exact stale expectations and raw sentinel source at `scripts/sportsFeedParser.test.js:77-92,117-120` and `scripts/seedSandboxFeeds.js:210-218`. No code or tests were changed in this plan-only commit.

8. **Closed (original High).** The first-live check now scopes itself to moment pitches and expressly excludes the three fixed-text SPORTS phase hooks (`docs/plans/2026-11-05-sports-feed-triggers.md:148,164`), which are separate producers in `phase07-evening-media/storyHook.js:518-605`. A stable source field was consciously deferred (`docs/plans/2026-11-05-sports-feed-triggers.md:211`); the specified text exclusion is a checkable receipt for this bounded fire.

9. **Closed (original Medium), with a new recipe ambiguity below.** The fold adds the duplicate word pair, a unit assertion on the undeduped trigger array, team-qualified hook/Ripple reads, separate aftermath reading, and Cycle/phase-scoped Engine_Errors (`docs/plans/2026-11-05-sports-feed-triggers.md:144,148,155-164`). That addresses the former proof gaps and respects the game's-share gate and separate aftermath Ripple in `phase02-world-state/applySportsSeason.js:868-904`. The row assignment in fire 1 needs clarification before the bench can execute it.

## New problems introduced by the fold

1. **High — the shared canonical field can bypass the active-team moment gate in engine.333.** The fold filters **emitted moments** to A's/Oaks but sets `entry.eventTrigger` to a canonical word for each row returned by `readOaklandFeedEntries_` (`docs/plans/2026-11-05-sports-feed-triggers.md:70-72,78`). That reader presently appends NFL and retired-label rows too (`phase02-world-state/applySportsSeason.js:216-250,308-311`; `:458-477`). The future plan reads `entry.eventTrigger` in the NAMED loop for milestones (`docs/plans/2026-11-05-feed-triggers-to-life-history.md:89-93`), and the loop has no active-team guard (`phase05-citizens/applyGameNightMoments.js:217-233`). Input: a current NFL or retired-label row with `EventTrigger=retirement` and a resolving `NamesUsed`; engine.331 emits no team moment, while engine.333 can retire that citizen. Blank the canonical trigger for unsupported teams or require the same active-team gate in the named trigger route, then add an engine.333 cross-plan test. Preserve any unrelated row/type processing deliberately.

2. **Medium — fire 1 assigns three Oaks trigger values to an unclear number of cells.** The folded recipe says Oaks game rows include a W2 typed `hot-streak` “with word Y, word Z on a second row,” while Acceptance 4 needs Y and Z on two distinct rows (`docs/plans/2026-11-05-sports-feed-triggers.md:148,156-158`). One EventTrigger cell cannot contain both `hot-streak` and Y as separate moments (`utilities/setupSportsFeedValidation.js:134-154`; `phase02-world-state/applySportsSeason.js:194-195,249-250`). Specify three Oaks rows/cells—typed `hot-streak`, Y, and Z—with the accepted WeekRecord/Streak attached to the intended game row. Then the same fire can prove both the engine-only rejection and two surviving Oaks pitches.

## Verification boundary

This is a source and plan diff review. Commit `9218f8c8c` changed the plan, first review and brief, not engine code; no candidate diff, sandbox fire, Sheet readback or live fire exists in this review. The prior review's source-traced wiring card remains applicable to the current code (`docs/for-claude-review/2026-11-05-codex-engine331-plan-review.md:53`); both engine entry points still order SportsSeason before SportsFeed (`phase01-config/godWorldEngine2.js:567-569,2287-2289`). The Haiku card failed once in the first review with a connection error; it was not retried.

## Disposition

Claude lane to resolve the current cross-plan hot/cold contract, add the active-team gate to the shared named-trigger contract, and make fire 1's row recipe executable. This is the one allowed fold re-review; no further Codex re-review is requested here.

engine-sheet, 2026-11-05 — round cap reached; the seat decides what is left:
- Finding 3 + new 1 — fixed in place: Mechanism 6 sets `entry.eventTrigger` to `''` on any row not the A's or the Oaks, so every reader of the field inherits the gate; Task 9 adds the `NFL` `retirement` test (plan A15).
- New 2 — fixed in place: Task 6 fire 1 is three Oaks rows, one value per cell, the game row carrying the WeekRecord and W2 (plan A16).
- Finding 4 — recorded, not fixed here: the conflicting text is engine.333's plan (research-build's row, `2026-11-05-feed-triggers-to-life-history.md:91,118,124`), and research-build was active in its plan at the time. Task 9 states the conflict and both ways out; plan P2 holds it until engine.333's read-before revises Design 1, Task 3 and Acceptance 2. engine.333 is sequenced after engine.331, so the route cannot fire on a typed word in the meantime.

**Reconciled in:** `[[../plans/2026-11-05-sports-feed-triggers]]` §Reviews reconciled — rows A15, A16, P2.
