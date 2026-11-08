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
4. **Readers of the tag (read 2026-11-07):** `nudgesForEvent_` callers that read a LifeHistory tag gain fandom on signed lines — the Phase-9 fold (`compressLifeHistory.js:1639,1656`), wake perception (`recentEventMagnitude` 6 instead of 5), `deadBranchScan`. Not changed (codex F2): resonance recall resolves only a reflection's `meta.affect` (`lib/resonanceRecall.js:71-76`); `backdateCitizenDials.js` sums the tag but `carryFandom_` then keeps the row's existing `base.fandom` (`:56-61,148-154`), so a rebuild does not replay it; the essence seeders emit no such tag. Unchanged: `neighborhoodPulseMap` (no Household entry), `buildWorldSummary` Who Lived It (exact `Household`; game-night lines already excluded), `compressLifeHistory` TAG_TRAIT_MAP (no game-night key), `buildLivesSlice` (`^Household(?=$|-)`, same as today), the game-night Ripple row. No reader keys on a `-Win` / `-Loss` tail.
5. **Tests:** `householdEngine.t4.test.js` §5 asserts the tag by bucket (win / streak → `-Win`, loss / skid → `-Loss`, a neutral mood → plain) and keeps 5.1–5.8 on all three tags; `citizenDials.test.js` keeps X11 and adds X12 (signed tags → family 5 + fandom ±1; the neutral tag family 5 only).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Build: writer + dial map + tests (`runHouseholdEngine.js`, `citizenDialMap.js`, `householdEngine.t4.test.js`, `citizenDials.test.js`); `npm test`; STUB_MAP check | es | done `3184f9f50` |
| 2 | Codex review of the exact candidate (one review, at most one re-review) | codex | done — SHIP-WITH-FIXES, plan-only fixes folded |
| 3 | Bench on SANDBOX 1004: stage 41 = PROD stage 40 + the two engine files; sync from live; a seeded game week; fires until a signed household line lands (cap 3); read the line and the citizen's fold | es | done — two runs @190/@191, a loss night and a win night each, PASS, 0 Engine_Errors (DEPLOY_HISTORY §Current sandbox) |
| 4 | PROD push + 16-minute watch; DEPLOY_HISTORY §PROD | es | done — @177 = stage 41, watch clean, DONE 18:34 CST |
| 5 | Live read: the first live Cycle with a signed household game-night line (C115 Sun 2026-11-08 if one is drawn) | es | in progress |

## Acceptance

1. A win or win-streak night tags the household line `Household-GameNight-Win`; it folds family +5, fandom +1 — unit + bench.
2. A loss or cold-streak night → `Household-GameNight-Loss`; family +5, fandom −1 — unit (bench if drawn).
3. A neutral night → `Household-GameNight`; family +5, fandom 0 — unit.
4. Lines already logged as `Household-GameNight` fold as before (X11) — unit.
5. No game → no game-night line, and the draw count is unchanged (t4 5.5, 5.6) — unit.
6. Bench fires PASS, 0 Engine_Errors; live fire clean.
7. Live: a signed line on PROD; its tag resolves to family +5, fandom ±1 (the contract is the resolver input), and that Cycle's `DialState` transition matches the citizen's netted lines — the household line plus their other same-Cycle lines, room-scaled near the poles (`citizenMemory.js:79-99`), then settled (fandom mood ×0.9, under 0.5 → 0). `TraitProfile` is a base / band read on its own cadence, not the per-line receipt — live read.

## Pre-mortem

- ~1 line a week: a bench fire may draw none. Acceptance 1–2 then rest on the unit tests plus what the bench draws; Task 5 waits for the first signed live line.
- A reader keyed on the exact string `Household-GameNight` would miss the signed tags: the grep found the writer and two tests only.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Codex plan + diff review of `3184f9f50` | codex | [[../for-claude-review/2026-11-07-codex-engine335-review]] | SHIP-WITH-FIXES (plan fixes only) |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Writer and map match the ruling: same bucket as the city's fan lines, both entry points, no new global; signed tags resolve to family 5 + fandom ±1, the plain tag and logged lines to family 5 | codex · es | review §Source trace; `runHouseholdEngine.js:409-435`, `citizenDialMap.js:97-102` |
| A2 | One signed line cannot promise a ±1 dial move: the fold nets the Cycle, room-scales near 0/100, settles mood; TraitProfile reads base. Acceptance 7 now checks the resolver input and the DialState transition | codex · es | review F1; `compressLifeHistory.js:1632-1648`, `citizenMemory.js:79-99,204-210` |
| A3 | Resonance recall and backdate do not gain fandom from the tag; Design 4 corrected | codex · es | review F2; `lib/resonanceRecall.js:71-76`, `backdateCitizenDials.js:56-61,148-154` |
| A4 | Tests 5.12, 5.13 and X12b would also pass on old code (5.13 sums with `>=`); 5.9–5.11 and X12 fail on it. No candidate defect behind the gap | codex | review §Tests |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

(none)

## Changelog

- 2026-11-07 (engine-sheet) — PROD @177 = stage 41 (`3184f9f50`), 16-minute watch clean. Live read: the first Cycle with a signed line, in DialState.
- 2026-11-07 (engine-sheet) — Bench @191: C115 loss night `-Loss`, the citizen's only fandom input, mood 0 → −1; C116 win night `-Win`, settle + room-scaled +1 hardened a 3-streak, base fandom 50 → 51.03. Acceptance 1, 2, 6 met on the bench.
- 2026-11-07 (engine-sheet) — Codex review SHIP-WITH-FIXES: Acceptance 7 reads the resolver input and the DialState transition, not a ±1 TraitProfile move; reader inventory corrected (A1–A4). Task 1 done `3184f9f50`.
- 2026-11-07 (engine-sheet) — Created. Builder size ruling: 1 step, a fan's night. Content-drafting G-ES8 checked first: inert on live, nothing to build.
