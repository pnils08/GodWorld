---
title: Event Engines Move Dials — review and repair Plan
created: 2026-10-18
updated: 2026-10-18
type: plan
tags: [engine, citizens, dials, events, draft]
sources:
  - builder 2026-10-18 (verbatim below)
  - docs/SIM_DOCTRINE.md §1–§3, §7, §15–§17
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md (the ruled die pattern; Tasks 3/4/5/7/11 not started)
  - docs/plans/2026-09-10-inactivity-is-regression.md §Dial read 2026-10-17, §Builder rulings 2026-10-17
  - utilities/citizenDialMap.js (ruling 1b — plain-day tags map to {})
  - output/engine201/measure-c121-all.json (bench C107–C121 tag counts)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.299"
---

# Event Engines Move Dials — review and repair Plan

**Builder's words (2026-10-18, verbatim):** "In some of the work lately it's been turning up some of the hardcoded event code engines are send real world Oakland hardship and throwing events that don't move a life , like a divorce or promotion, we have moved away from events for color and events like those actually change a citizen now. There are a lot of these engines in the code base through the phases and feel like starting to fix the offenders is some good overnight work you can do . You can use wire cards , codex and agy, once rb finishes up it current work it can help too. Come up with a plan to address this review and repairs , use a plan template.md, things to consider when applying a fix, the reality of the sim, other ledgers the events could pull from to add depth , aligning Events that will move the 9 dials state, the rare big event , the often everyday events , events that fire if they have debt at a certain level , a certain tier , net worth , creating differences in citizens based on Their differences. If this makes sense you can get started and set your hourly wakes to keep on the plan , follow my doctrines and avoid basing this off real world Oakland , only use the land mass and landmarks"

**Builder's correction (2026-10-18, verbatim, minutes later):** "I did not say events should move a life , I never said that I said move a dial, this whole review is garbage already"

**Reading (es):** the test for every line an engine throws is *does it move one of the nine dials, by what it says, for this citizen* — not whether it changes a row state. A divorce or a promotion are named as events that already change a citizen; they are the contrast, not the target. The target is the hardcoded pools that throw color (no dial, no cause from the row or the hood) and any pool that imports real-world Oakland hardship. The map is the land mass and the landmarks only.

**Goal:** every event engine on the cycle path throws lines that move a dial by their content, differentiated by the citizen's own row (DebtLevel, Tier, NetWorth, hood state, bonds), with everyday lines often and small and big lines rare and large — and no line that reads real-world Oakland.

**Rows:** engine.299 · **Owner:** engine-sheet

## The rule (builder 2026-10-18)

**Every event that fires moves a dial.** By what the line says, for this citizen. Not complicated. An event tag mapped to `{}` is a defect; a pool that cannot throw both directions is a defect (§3, §15); a line that reads real-world Oakland is a canon defect (§17).

## Where it stands — live C111 (LifeHistory_Log, read 2026-10-18)

2,771 lines on 1,001 citizens. Tags mapping to `{}` in `utilities/citizenDialMap.js` (ruling 1b, 2026-09-13): Civic, Civic Perception, Neighborhood, Team, Season, Lifestyle, Death, Background, Daily, Micro-Event, Life Event, Life, Personal, PrevEvening, FirstFriday, Holiday, CreationDay, Sports, Weather, Faith-Drift — 20 tags. Lines by emitter (`source:` token in the full tag):

| Emitter (source) | Primary tag | C111 lines | Moves a dial today |
|---|---|---|---|
| runNeighborhoodEngine / generateCitizensEvents `neighborhood` + `communityLife` + `nbhdState` | Neighborhood | 479 + 114 + 109 = 702 | no (`{}`) |
| generateCitizensEvents `civicNews` | Civic Perception | 321 | no |
| generateCitizensEvents `familyLife` | Daily | 222 | no |
| generateCitizensEvents `prevEvening` | PrevEvening | 182 | no |
| sports feed lines `sports` | Sports | 146 | no |
| generateCitizensEvents `reflection` + `identity` + `listening` | Personal | 107 + 74 + 73 = 254 | no |
| generateCitizensEvents `homeLife` | Background | 74 | no |
| generateCitizensEvents `curiosity` | Lifestyle | 62 (+14 nbhdState) | no |
| generateGenericCitizenMicroEvent `groove` / untagged | Micro-Event | 49 + 25 | no |
| generateCitizensEvents `economy` / `chaos` / `sentiment` / `template` / `age` / `season` | Daily | 63 + 44 + 28 + 26 + 15 + 14 | no |
| `undocked` | Undocked-Audience | 63 | no |
| `holiday` | Holiday | 28 | no |
| Team / Weather / Life | — | 12 + 2 + 6 | no |
| **Subtotal — fires, moves nothing** | | **≈ 2,400 (≈ 87%)** | |
| Strain / Friction (pressure, engine.201) | | 53 + 7 | yes, with the cause's second dial |
| Advancement, Work, Education, Career, Promotion, LifeEvent-*, CivicRole-*, Maneuver-*, Household, Relationship, Media, Community, Reputation, Health, Birth, Retirement… | | ≈ 300 | yes |

Same shape on the bench, C107–C121 (`output/engine201/measure-c121-all.json`): Neighborhood 4,007, Daily 3,546, Civic Perception 2,735, Personal 2,213, PrevEvening 1,550 against Work 250, Career 66, Household 28. 59.7% of rows all-neutral.

The pool engines read no money column: `runNeighborhoodEngine`, `runHouseholdEngine`, `runRelationshipEngine`, `runEducationEngine`, `generateGenericCitizenMicroEvent`, `runYouthEngine`, `generateCitizensEvents` reference DebtLevel 0×, NetWorth 0×, Income 0× (grep 2026-10-18); they key on Tier and the dial bands only. Two citizens with different debt, net worth and hood draw from the same deck.

## How a fix is applied (every task below)

1. **The line carries its direction and weight in the tag the row keeps.** Phase 9 folds the cell's `[PrimaryTag]`, not the log's full tag (codex 2026-10-17 hunt 1a, `compressLifeHistory.js:537,554–556`). So the tag is `<Kind>-<Up|Down>-<S|M|L>` — the engine.286 pattern already live for Promotion, Home and CivicRole — and `DIAL_MAP` maps every graded tag to real deltas. No tag maps to `{}`.
2. **Direction comes from a cause the engine read.** Hood trend (`S.neighborhoodState[hood]` trend/momentum), the citizen's DebtLevel / NetWorth against the hood median / WealthLevel / Tier, bonds, the sports result, the weather — the thing the line is about decides the sign. Sign skews up, heavier is rarer at every aura (builder 2026-10-10, standing rule for every kind added).
3. **Differences from the row.** The pool a citizen draws from is gated by their own row through the one predicate (`CONTENT_LEDGER_DSL_FIELDS` — wealth, tier, hood, hoodtrend, defaulted, charged, bereaved, married, children… already there; `debt` and `networth` added). A citizen at DebtLevel ≥ 4 draws money-tight lines (outabout −, composure −); one over the hood median draws the comfortable ones; a Tier-1 draws the bigger stage.
4. **Everyday small, rare big.** S every week at ±1, M rarer at ±2–3 (a two-Cycle hold where the kind supports it), L rare at ±4–5. The band odds and the deltas live in World_Config (rate and severity ARE the dials, 2026-09-22); never a cap, never a quota (§1).
5. **Depth from the other ledgers, read not invented.** Business_Ledger (the employer's week), Household_Ledger, Relationship_Bonds, Hospital/Health_Cause_Queue, Judicial_Ledger, Chaos_Cars, Faith_Organizations, Cultural_Ledger, Neighborhood_Map (IncomeTier, BoomIndex, EmployerCharacter, Adjacent), Sports_Feed. A line names what the ledger says happened near this citizen.
6. **The map is the land mass and the landmarks.** Hood character from Neighborhood_Map / INSTITUTIONS §Neighborhoods only. Any pool text or premise carrying real-world Oakland hardship (displacement/gentrification framing, crime rankings, blight) is cut, not re-skinned.
7. **Measure twice.** Wiring card per engine before the cut; live range of every threshold (`scripts/deadBranchScan.js`); bench 1004 fire from live-synced state; codex diff review before PROD; one unbenched change in flight.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | **Scorecard.** Per emitter on the Phase 4/5 path: C111 lines, citizens reached, share mapping to `{}`, up/down split, row columns read, real-Oakland premise flags, gates with no live range. Wiring cards (`engine-wiring`) for the seven pool engines; `scripts/deadBranchScan.js` on live; table lands in this plan §Scorecard. | es + wiring agent | in progress |
| 2 | **No inert tag.** `utilities/citizenDialMap.js`: every `{}` entry becomes a graded family (`<Kind>-Up/Down-S/M/L`) with deltas; legacy plain tags keep a ±0 only for lines already in the record. `TAG_REGISTRY.md` + `EVENT_SYSTEM_MAP.md` §2 in the same commit. Unit test: every DIAL_MAP key resolves to ≥1 dial or is listed STRUCTURAL. | es | not started |
| 3 | **Wave 1 — Neighborhood (702).** `runNeighborhoodEngine.js` + the `neighborhood`/`communityLife`/`nbhdState` pools in `generateCitizensEvents.js`: direction from the hood's trend/momentum and the citizen's standing in it (DebtLevel, NetWorth vs MedianIncome); graded tag; both directions reachable in a bench fire. Real-Oakland phrases cut. codex diff review → bench 1004 → PROD. | es → codex | not started |
| 4 | **Wave 1 — Civic Perception (321) + Daily/familyLife (222) + PrevEvening (182).** Same contract: civicNews sign from the initiative/office outcome it names (Initiative_Tracker, Civic_Office_Ledger); familyLife sign from Household_Ledger / bonds / NumChildren; prevEvening from the evening's own result (Cultural_Ledger, game result). | es → codex | not started |
| 5 | **Wave 2 — Personal (254), Background (74), Lifestyle (76), Micro-Event (74), Sports (146 → fandom, engine.208/280), Undocked-Audience (63), Holiday (28), Team/Season/Weather/Life.** Each emitter gets its cause → sign → graded tag; Sports moves fandom by the result and the team the citizen follows (`DialState.fan`). | es → codex | not started |
| 6 | **Differences by row.** `CONTENT_LEDGER_DSL_FIELDS` gains `debt` (DebtLevel) and `networth` (NetWorth / hood MedianIncome); the hardcoded pools route through the same predicate; money-tight / comfortable / stretched line families authored in the ECL per kind (R5 text follows weight). | es | not started |
| 7 | **Real-Oakland premise sweep.** `migrationTrackingEngine.js` (gentrification/displacement premise, 53 hits), `ensureCrimeMetrics.js` profiles (known, engine.237 memory), any pool text naming imported hardship: list with file:line, cut or re-source to Neighborhood_Map / INSTITUTIONS canon. agy adversarial read. | es + agy | not started |
| 8 | **Rates and severities table** for the builder: per kind, S/M/L odds and deltas as World_Config keys with the live range each reads; proposed numbers from the C111 scorecard. | es → builder | not started |
| 9 | **Prove it.** Bench 1004 fire from live-synced C112: 100% of event lines map to a non-empty delta; up/down split per kind; per-citizen line distribution vs C111; all-neutral share. Then the live fire C113 (Sun 2026-10-25) readback. | es | not started |
| 10 | engine.286 Tasks 3/4/5/7/11 (not started there) are the same work — this plan carries them; that plan's rows point here. | es | not started |

## Acceptance

1. A bench fire on live-synced state produces zero event lines whose tag maps to `{}` — proven by the C112 bench fire + `node scripts/…` tag→delta check over LifeHistory_Log.
2. Every repaired kind shows both directions in one bench fire, with S > M > L counts — proven by the per-kind up/down/band histogram.
3. Two citizens in the same hood with different DebtLevel / NetWorth draw different line families — proven by a fixture pair through the real entry point.
4. No pool text or premise reads real-world Oakland — proven by the Task 7 list closed to zero and agy's read.
5. All-neutral share on the ledger falls from 63.6% (C111) at the C113 live readback; the number is reported, not targeted (§1).

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

## Changelog

- 2026-10-18 (engine-sheet) — Created with the builder's verbatim and his correction; audit and tasks follow.
