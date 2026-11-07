---
title: Household Game Night Moves the Fan Dial Plan
created: 2026-11-07
updated: 2026-11-07
type: plan
tags: [engine, active]
sources:
  - phase05-citizens/runHouseholdEngine.js:401-431 (tonight's household pool, bucket from gameNightBucket_), :568-582 (the tag)
  - utilities/citizenDialMap.js:96 (Household family +5), :301 (CALENDAR_SUFFIXES, GameNight), :336-349 (baseTag_), :365-391 (nudgesForEvent_)
  - phase05-citizens/generateCitizensEvents.js:2187-2199 (the city's game-night fan lines sign fandom by the same bucket)
  - phase05-citizens/applyGameNightMoments.js:88-112 (gameNightBucket_ — winStreak / win / coldStreak / loss / neutral)
  - docs/plans/2026-11-05-sports-feed-triggers.md Q5; output/production_log_run_cycle_c114_gaps.md Q5 note
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.335"
  - "[[2026-11-05-sports-feed-triggers]] — engine.331, where Q5 was asked"
---

# Household Game Night Moves the Fan Dial Plan

**Builder's words (2026-11-07):** engine.331 Q5, "should families watching at home also move the fan dial, on top of family?": "1. Yes"; and "those watching a game or any game event now would hit fandom dial" ([[2026-11-05-sports-feed-triggers]] Q5). Size, asked 2026-11-07 ("How big a move for one family game night?"): "1 step, like a fan's night (Recommended)" — the option read "Same as a city fan's game-night line: +1 on a win night, −1 on a loss or cold-streak night. A neutral night moves family only, as now."

**Goal:** a household's game-night line moves fandom by the night's result (+1 win or win streak, −1 loss or cold streak) on top of its family +5; a neutral night and every line already in the log fold as before.

**Rows:** engine.335 · **Owner:** engine-sheet

## Current state

- `runHouseholdEngine_` adds tonight's pool to the draw when a club played (`gameNightBucket_`, the row's own team's hot/cold); a pick from it is tagged `Household-GameNight` (`runHouseholdEngine.js:580`).
- The dial map strips `GameNight` as a calendar suffix (engine.299), so the line folds as `Household`: family +5, nothing else (`citizenDials.test.js` X11).
- The city's fan game-night lines sign by the same bucket (`generateCitizensEvents.js:2198-2199`: win / winStreak → `dial:fandom:up`, loss / coldStreak → down, neutral unsigned and not written) and land as graded `<Kind>-Fandom-Up|Down-S`, ±1.
- Live volume (LifeHistory_Log snapshot): C113 0, C114 1 `Household-GameNight` line. Tier-3/4 ENGINE citizens, draw 2–12%, the game-night lines a few among many. A small, steady nudge.

## Design

1. **Writer** (`runHouseholdEngine.js`): a game-night pick is tagged by the night's bucket. win / winStreak → `Household-GameNight-Win`; loss / coldStreak → `Household-GameNight-Loss`; neutral → `Household-GameNight` (unchanged). The same buckets the city's fan lines sign by.
2. **Dial map** (`citizenDialMap.js`): two DIAL_MAP entries, `Household-GameNight-Win: { family: 5, fandom: 1 }` and `Household-GameNight-Loss: { family: 5, fandom: -1 }`. `baseTag_` leaves them whole (the tail `Win` / `Loss` is not a calendar suffix), so `nudgesForEvent_` finds them by exact key. `GameNight` stays a suffix: the neutral tag and every line already logged fold as Household, family +5. No resolver change.
3. **Not the graded form** (`Household-GameNight-Fandom-Up-S`): engine.299's graded tag moves exactly one dial and would drop the family +5 the ruling keeps ("on top of family").
4. **Readers of the tag (read 2026-11-07):** `nudgesForEvent_` callers gain fandom on signed lines — the fold (`compressLifeHistory.js:1639,1656`), wake perception, resonance recall, the backdate/seed scripts, `deadBranchScan`. Unchanged: `neighborhoodPulseMap` (no Household entry), `buildWorldSummary` Who Lived It (exact `Household`; game-night lines already excluded), `compressLifeHistory` TAG_TRAIT_MAP (no game-night key), `buildLivesSlice` (`^Household(?=$|-)`, same as today), the game-night Ripple row. No reader keys on a `-Win` / `-Loss` tail.
5. **Tests:** `householdEngine.t4.test.js` §5 asserts the tag by bucket (win / streak → `-Win`, loss / skid → `-Loss`, a neutral mood → plain) and keeps 5.1–5.8 on all three tags; `citizenDials.test.js` keeps X11 and adds X12 (signed tags → family 5 + fandom ±1; the neutral tag family 5 only).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Build: writer + dial map + tests (`runHouseholdEngine.js`, `citizenDialMap.js`, `householdEngine.t4.test.js`, `citizenDials.test.js`); `npm test`; STUB_MAP check | es | not started |
| 2 | Codex review of the exact candidate (one review, at most one re-review) | codex | not started |
| 3 | Bench on SANDBOX 1004: stage 41 = PROD stage 40 + the two engine files; sync from live; a seeded game week; fires until a signed household line lands (cap 3); read the line and the citizen's fold | es | not started |
| 4 | PROD push + 16-minute watch; DEPLOY_HISTORY §PROD | es | not started |
| 5 | Live read: the first live Cycle with a signed household game-night line | es | not started |

## Acceptance

1. A win or win-streak night tags the household line `Household-GameNight-Win`; it folds family +5, fandom +1 — unit + bench.
2. A loss or cold-streak night → `Household-GameNight-Loss`; family +5, fandom −1 — unit (bench if drawn).
3. A neutral night → `Household-GameNight`; family +5, fandom 0 — unit.
4. Lines already logged as `Household-GameNight` fold as before (X11) — unit.
5. No game → no game-night line, and the draw count is unchanged (t4 5.5, 5.6) — unit.
6. Bench fires PASS, 0 Engine_Errors; live fire clean.
7. Live: a signed line on PROD, and that citizen's fandom moved by the line in the Cycle's fold — live read.

## Pre-mortem

- ~1 line a week: a bench fire may draw none. Acceptance 1–2 then rest on the unit tests plus what the bench draws; Task 5 waits for the first signed live line.
- A reader keyed on the exact string `Household-GameNight` would miss the signed tags: the grep found the writer and two tests only.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

(none)

## Changelog

- 2026-11-07 (engine-sheet) — Created. Builder size ruling: 1 step, a fan's night. Content-drafting G-ES8 checked first: inert on live, nothing to build.
