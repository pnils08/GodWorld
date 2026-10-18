---
title: Event Engines Move Dials — review and repair Plan
created: 2026-10-18
updated: 2026-10-18
type: plan
tags: [engine, citizens, dials, events, active]
sources:
  - builder 2026-10-18 (verbatim below)
  - docs/SIM_DOCTRINE.md §1–§3, §7, §13–§17
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md (Tasks 3/4/5/7/11 are this work)
  - docs/plans/2026-09-10-inactivity-is-regression.md §Dial read 2026-10-17, §Builder rulings 2026-10-17
  - utilities/citizenDialMap.js (the 20 kinds that map to {})
  - output/engine201/measure-c121-all.json (bench C107–C121 tag counts)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.299"
---

# Event Engines Move Dials — review and repair Plan

**Builder's words (2026-10-18, verbatim):** "In some of the work lately it's been turning up some of the hardcoded event code engines are send real world Oakland hardship and throwing events that don't move a life , like a divorce or promotion, we have moved away from events for color and events like those actually change a citizen now. There are a lot of these engines in the code base through the phases and feel like starting to fix the offenders is some good overnight work you can do . You can use wire cards , codex and agy, once rb finishes up it current work it can help too. Come up with a plan to address this review and repairs , use a plan template.md, things to consider when applying a fix, the reality of the sim, other ledgers the events could pull from to add depth , aligning Events that will move the 9 dials state, the rare big event , the often everyday events , events that fire if they have debt at a certain level , a certain tier , net worth , creating differences in citizens based on Their differences. If this makes sense you can get started and set your hourly wakes to keep on the plan , follow my doctrines and avoid basing this off real world Oakland , only use the land mass and landmarks"

**Builder, same hour (verbatim):** "I did not say events should move a life , I never said that I said move a dial" · "Every event that always exists dms move a dial so it's not something complicated" · "not event would have a divorce or a promotion , that happens somewhere else not as a color event" · "Delete your plan , read my message from the start again and do what I asked" · "revert the delete , I want all the work you did and what I paid for" · "Rb is booting an will support this , use codex and agy often"

**Builder, 2026-10-17 (verbatim, An Lopez POP-00810's row):** "those 4 events tell me exactly how her dials should read, why do things need to happen to her? the city moves and she should be reacting to that, occassionally maybe something happens to her thats and event she gets attached to."

**Goal:** every hardcoded event that fires moves a dial and reads this world, not the real one; the offenders through the phases are found and fixed overnight, on hourly wakes, each fix benched and on PROD the same wake.

**Rows:** engine.299 · **Owner:** engine-sheet (rb supports; codex and agy on every task)

## The offenders — what the review finds

Three kinds. A line is an offender if any one is true of it.

1. **It moves no dial.** Its tag maps to `{}` in `utilities/citizenDialMap.js`. Twenty kinds do (file read 2026-10-18): Civic, Civic Perception, Neighborhood, Team, Season, Lifestyle, Death, Background, Daily, Micro-Event, Life Event, Life, Personal, PrevEvening, FirstFriday, Holiday, CreationDay, Sports, Weather, Faith-Drift. Live C111: 2,771 lines fired on 1,001 citizens; ≈2,400 (87%) carry one of these — Neighborhood 702, Daily 435, Civic Perception 321, Personal 254, PrevEvening 182, Sports 146, Lifestyle 76, Background 74, Micro-Event 74, Undocked-Audience 63, Holiday 28. 63.6% of the ledger sits all-neutral. Ruling 1b (2026-09-13, "plain days move nothing") is superseded by the 2026-10-18 ruling above: a line that moves nothing is not an event and is not written.
2. **It reads real-world Oakland.** A displacement, gentrification, priced-out, encampment, crime-ranking or decline premise on the path (grep 2026-10-18, hits per file): `phase05-citizens/migrationTrackingEngine.js` 53 ("Week 4 Gentrification & Migration Tracking", DisplacementRisk 0–10, FORCED_MIGRATION "displaced by rent/eviction"); `phase05-citizens/generateCitizensEvents.js` 10 (`econ:displacement` lines 2816–2817 keyed on DisplacementRisk ≥ 7, `displacementmove` 1056/1064); `phase07-evening-media/buildContractSeeds.js` 5; `phase05-citizens/neighborhoodTrajectoryEngine.js` 4; `phase06-analysis/applyMigrationDrift.js` 3; `storyHook.js` 2; `applyStorySeeds.js`, `tier1EssenceEvents.js`, `rippleLedger.js`, `compressLifeHistory.js` 1 each; `utilities/ensureCrimeMetrics.js` NEIGHBORHOOD_CRIME_PROFILES carry the inherited crime ranking (engine.237 memory); ECL rows 130 ("priced out"), 219 ("Mandela Parkway encampment site"), 532. `phase03-population/updateCrimeMetrics.js`'s "displacement" is enforcement spillover between areas, not a premise — left alone.
3. **It says a life changed when nothing changed.** A color line that throws a divorce, promotion, layoff, marriage, birth, death, hospital stay or move. Those fire in their owning engines (`householdFormationEngine`, `runCareerEngine` / `checkForPromotions`, `bondEngine`, `judicialLifecycle`, migration) and nowhere else. Verified 2026-10-18: no color pool throws one today — `generateCitizensEvents.js` 1057/1065/2797–2798 read MaritalStatus for register ("handled a logistics call with an ex"); `tier1EssenceEvents.js` 'Promotion' lines are authored Tier-1 essence. Task 2's scan keeps it that way.

## Things to consider when applying a fix

- **The reality of the sim.** The line says something true of this citizen this Cycle, read from their row or a ledger. The city moves and the citizen reacts; a personal event is occasional, on top (builder 2026-10-17). "Noticed the creative energy shifting in Temescal" is written only when Temescal's trend moved, and its sign is the trend's.
- **Other ledgers the events could pull from to add depth.** Before a family writes, it reads: money — Simulation_Ledger DebtLevel / NetWorth / SavingsRate / WealthLevel against Neighborhood_Map MedianIncome; work — EmployerBizId → Business_Ledger (revenue drift, closure risk, hiring); household — Household_Ledger, ChildrenIds, Youth_Events; bonds — Relationship_Bonds (strength, last contact, rivalry); hood — S.neighborhoodState trend/momentum/pressure, Neighborhood_Map BoomIndex / IncomeTier, Initiative_Tracker, Transit_Metrics; health — Status, Hospital / Health_Cause_Queue, `hoodhospital`; law — Judicial_Ledger (`charged`, `hoodcharged`), Chaos_Cars; faith and culture — Faith_Organizations, Cultural_Ledger; sports — Sports_Feed, `DialState.fan`; weather and season — S.weather, Simulation_Calendar. A line names what the ledger says — the employer, the bond, the hood's trend — never an invented crowd. Facts gate; color is the wording (§13).
- **Aligning events that will move the 9 dials state.** Every line → one dial and a sign. The sign is the fact's direction (the business lost money → down; the bond warmed → up; the hood is growing → up). The tag the row keeps is `<Kind>-<Up|Down>-<S|M|L>`, because Phase 9 folds the cell's tag, not the log's (codex 2026-10-17 hunt 1a). `DIAL_MAP` has no `{}`. Sign skews up and the heavier event is rarer at every aura (builder 2026-10-10, standing).
- **The rare big event, the often everyday events.** S: most citizens most weeks, ±1. M: rarer, ±2–3, a two-Cycle hold where the kind supports it. L: rare, ±4–5, the lottery grabs two (§10), a citywide handful a Cycle. Odds and deltas are World_Config keys — rate and severity ARE the dials (builder 2026-09-22). No cap, no quota (§1).
- **Events that fire if they have debt at a certain level, a certain tier, net worth.** Eligibility is the row. DebtLevel ≥ 4 opens the money-tight family and its odds rise per level (the default at 6 already exists, engine.276); NetWorth over the hood median opens the comfortable family; a mortgage over half of income (engine.286) opens the stretched one. Tier sets the register and the reach — Tier 1–2 the media-scale wording, Tier 4 the everyday. One predicate: `CONTENT_LEDGER_DSL_FIELDS` in `citizenContextBuilder.js` (wealth, tier, hood, hoodtrend, defaulted, charged, bereaved, married, children, age are there) gains `debt` and `networth`; the hardcoded pools route through it like the ECL rows do.
- **Creating differences in citizens based on their differences.** Two citizens in one hood with different rows draw different events. The fixture: same hood, one at DebtLevel 5 / NetWorth under the median / Tier 4, one at DebtLevel 0 / NetWorth over / Tier 2 — the same Cycle gives them different families, signs and reach.
- **Not real-world Oakland; the land mass and the landmarks.** Hood character comes from Neighborhood_Map and INSTITUTIONS §Neighborhoods; places are the lake, the estuary, the hills, the port, the square, the parkway. No displacement, gentrification, blight, encampment, crime-ranking, priced-out or decline premise anywhere on the path. The intra-city move is income fit against the hood (§14), not displacement.
- **Not this layer.** Divorce, promotion, layoff, marriage, birth, death, hospital, move: owner engines only. A color pool that wants to say one is cut.
- **FIX, don't ADD — and no rebuild.** The change goes inside the engine that owns the lines. Builder to rb, 2026-10-18: "we aren't rebuilding any systems just cleaning up hardcoded events in the engines that don't fit how the sim works now." No new file, no shared reader, no new DSL field unless a fix needs one.
- **Engine rules.** `ctx.rng` only; `ctx.writeIntents` only; wiring card before the cut; caller graph for every renamed tag; truth docs (`TAG_REGISTRY.md`, `EVENT_SYSTEM_MAP.md` §2, STUB_MAP) in the same commit.
- **The gate.** codex diff review on every task before the bench (codex SHIP is approval of the code); agy adversarial read of every pool text and the premise sweep; bench 1004 from live-synced state; one unbenched change in flight; then PROD the same wake — no code waits. The Sunday fire confirms: C112 Sun 2026-10-18, C113 Sun 2026-10-25.

## Tasks

Overnight order, biggest offender first. Each wake takes the next open row.

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | **Every event that fires moves a dial — the rule and the biggest writer.** `utilities/citizenDialMap.js`: the graded form `<Kind>-<Dial>-<Up|Down>-<S|M|L>` (one dial, the fact's sign, S ±1 / M ±2 / L ±4; `baseTag_` strips the tail; the 20 bare `{}` kinds stay `{}` as history, never re-valued). `phase05-citizens/generateCitizensEvents.js` (the biggest writer: Daily 435, Civic Perception 321, Personal 254, PrevEvening 182, Sports 146 …) writes a `{}` kind only graded: dial and sign from an explicit `dial:` tag, else a directional fact tag, else a generic signed fact (`:negative` / `:positive`) on the source's dial — a source never decides the sign; a line with no signed fact is not written and `S.engine299.noDialBySource` counts it. The other emitters write graded in Tasks 3–4. Wiring card done. Tests: citizenDials §X, engine299Graded (writer-level), griefPeriod. | es → codex | cut `6db7b48f`; codex FIX folded — re-review, then bench 1004 |
| 2 | **Offender scan.** `scripts/deadBranchScan.js --offenders`: reads the emitters' pools + `citizenDialMap.js` and lists (1) kinds and lines mapping to `{}`, (2) premise words with file:line, (3) life-event verbs inside color pools → `output/engine299/offenders.json`. Re-run after every task; the acceptance is an empty report. | es | not started |
| 3 | **Neighborhood (702).** `runNeighborhoodEngine.js` + `hoodTexturePool_` / `neighborhood` / `communityLife` / `nbhdState` pools: the line is about the hood's trend this Cycle and the citizen's standing in it; both directions; graded tag; row-gated register and reach. codex diff → bench 1004 → PROD. | es → codex | not started |
| 4 | **generateCitizensEvents.js families.** Civic Perception (321): the initiative or office in *their* hood with the outcome's sign. Daily (435): from a row fact (money, household, health) or not written. PrevEvening (182): the evening's own result. Personal (254): a fact or not thrown. Sports (146): fandom by result and team followed. Lifestyle, Background, Micro-Event, Undocked-Audience, Holiday: a fact or not written. `econ:displacement` 2816–2817 and `displacementmove` 1056/1064 re-sourced to the row's money (DebtLevel, NetWorth vs hood median); `displacementmove` renames with `compressLifeHistory.js:1603` UNLIVED_BRANCH_TAGS in the same change. **The other emitters write graded here too:** `phase04-events/generateGenericCitizenMicroEvent.js` (Background / PrevEvening / Sports / Micro-Event / Holiday / FirstFriday / CreationDay), `generateMediaModeEvents.js`, `generateCivicModeEvents.js` (Personal / Civic), `phase04-events/generateGameModeMicroEvents.js` (Team / Season / Life / Personal / Civic), `runRelationshipEngine.js` (Holiday / Weather / FirstFriday / CreationDay), `runYouthEngine.js` YOUTH_DIAL_TAG, and the `tier1EssenceEvents.js` seed kinds. | es → codex | not started The hardcoded pools are signed (Task 1, 05:25); **the ECL rows are not**: a ledger row whose source kind maps to `{}` is written only if its Tags cell carries a `dial:<dial>:<up|down>` or a fact tag — the rows without one are skipped and counted in `S.engine299.noDialBySource`; tagging them is this task's authoring (rb, the retag tool). |
| 5 | **Money: debt level, tier, net worth.** The money lines (`econ:*` pools, `source:economy`) gate on the row the generator already reads — DebtLevel, NetWorth against the hood's MedianIncome, Tier for register and reach — in place of WealthLevel/DisplacementRisk; the money-tight / comfortable / stretched lines carry their sign. No new DSL field unless a fix needs one (builder to rb 2026-10-18: "we aren't rebuilding any systems just cleaning up hardcoded events"). | es → codex | not started |
| 6 | **The other ledgers.** Each family's lines read the ledger already in the generator's scope before writing — the employer's week, the household, the bond by name, the hood's trend, the health and judicial flags, the team's week — and take their sign from it. Inside `generateCitizensEvents.js` and `citizenContextBuilder.js` as they stand; no shared reader, no new file. | es → codex | not started |
| 7 | **Real-Oakland premise sweep.** Engine side (es): `migrationTrackingEngine.js` — the intra-city move re-sourced to income fit (§14), DisplacementRisk and the displacement framing cut, FORCED_MIGRATION's reason set trued; `ensureCrimeMetrics.js` profiles trued to INSTITUTIONS; `neighborhoodTrajectoryEngine.js`, `applyMigrationDrift.js`. Writer side (rb): `buildContractSeeds.js`, `storyHook.js`, `applyStorySeeds.js`, `tier1EssenceEvents.js`, `rippleLedger.js`, `compressLifeHistory.js`, ECL rows 130 / 219 / 532 and any pool text. agy adversarial read of the whole list; places trued to the land mass and landmarks. | es + rb → agy | rb half done 03:40 (writer files + ECL 130/219 live; 1 line held for the builder); es half not started; agy read pending |
| 8 | **Rates as World_Config keys.** Per family, S/M/L odds and deltas (engine.286's key pattern); starting values in §Rates; the sheet is where the builder changes them. | es | not started |
| 9 | **Prove it.** The fixture pair through the real entry points; bench 1004 from live-synced state: zero lines mapping to `{}`, both directions per family, S > M > L, the scan empty; live readback at the Sunday fire after each PROD push. | es | not started |
| 10 | **Lanes on every task.** Wiring card before each cut (`engine-wiring`); codex diff review before each bench, findings folded here; agy read on pool text; rb on Task 7's writer side and the ledger reads it already owns; returns land in `docs/for-claude-review/` and `output/antigravity/`, reconciled below. | es | in progress |
| 11 | **Hourly wakes.** `ScheduleWakeup` every 60 min until the Tasks table is done: each wake takes the next open row, folds any lane return, re-runs the scan, commits path-specifically, logs one Changelog line. | es | in progress |
| 12 | engine.286 Tasks 3/4/5/7/11 are this work; that plan's rows point here. | es | not started |

## Rates

Starting values, written as World_Config keys in Task 8; the builder changes them in the sheet.

| Family (dials) | S odds / Cycle / eligible citizen | M | L | S / M / L deltas |
|---|---|---|---|---|
| hood (outabout, sociability) | .35 | .06 | .01 | ±1 / ±2 / ±4 |
| household (family, warmth) | .30 | .05 | .01 | ±1 / ±2 / ±4 |
| money (composure, outabout, drive) — opens at DebtLevel ≥ 4 or NetWorth over median | .25, +.05 per debt level | .05 | .01 | ±1 / ±3 / ±5 |
| work week (drive, composure) | .30 | .05 | — (L is engine.286's) | ±1 / ±2 |
| bonds (sociability, warmth) | .25 | .04 | .005 | ±1 / ±2 / ±4 |
| health / law / chaos (composure, integrity) — opens on a fact | .15 | .04 | .01 | ±1 / ±3 / ±5 |
| faith / culture (integrity, warmth, openness) — opens on membership / a show | .20 | .03 | — | ±1 / ±2 |
| sports (fandom) — opens on a game week | .40 | .05 | .01 | ±1 / ±2 / ±4 |

Sign skews up (≈ .6 / .4) except where the fact's direction is known, which decides it.

## Acceptance

1. A bench fire on live-synced state writes zero event lines whose tag maps to `{}` — bench 1004 + a tag→delta check over LifeHistory_Log.
2. The offender scan (Task 2) returns empty: no `{}` kind, no premise word, no life-event verb in a color pool.
3. Every family shows both directions in one bench fire, S > M > L.
4. The fixture pair draws different families, signs and reach through the real entry points.
5. agy's read of the premise sweep agrees; codex SHIP on every diff that reached PROD.
6. All-neutral share falls from 63.6% at the next Sunday live readback — reported, not targeted (§1).

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Task 7 writer-side premise read (2026-10-18 03:51) | agy | `output/antigravity/2026-10-18-engine299-task7-rb-premise-read.md` | AGREE on all 4 commits + ECL R130/R219; 6 FLAGs, all settled or routed (below), no rb fix needed |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | "decline" on a measured census shift (storyHook 1044/1067/1090/1469, applyStorySeeds 1013, ensureNeighborhoodDemographics 548) is a fact, not a premise; Task 2's scan matches premise words only, `decline` excluded | es, rb | agy read §2; es 2026-10-18 03:5x |
| A2 | Elena POP-00791 'anti-displacement' essence line stays — published canon E79/80/85/93; builder call on §6 | rb, es | agy read §2 |
| A3 | `displacementmove` (compressLifeHistory 1603 + generateCitizensEvents 1056/1064) renames in one cut | es Task 4 | agy read §2 |
| A4 | `ensureCrimeMetrics.js` East Oakland `character: 'the Baylight frontier'` (:106) contradicts canon — Baylight is the harbor waterfront by Jack London / West Oakland, D2; West Oakland mods (1.2 / 0.85) read inherited priors | es Task 7 engine side | agy read §2; rb verified :94-107 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

## Changelog

- 2026-10-18 05:25 (engine-sheet) — Every hardcoded pool in generateCitizensEvents now carries its sign by what the line says (61 human-domain lines, 12 season/age lines, the unlived echo); the writer test proves nothing skips from the hardcoded pools and an unsigned entry is never written. Four tests re-trued to the rule (plain day → not written / graded). Suite 290/290.
- 2026-10-18 04:50 (engine-sheet) — codex Task 1 review FIX (docs/for-claude-review/2026-10-18-codex-engine299-task1-diff-review.md) folded: a source names the dial, never the sign (generic `:negative`/`:positive` rule; no signed fact → not written); kindMovesNothing_ fails closed; Task 1 re-scoped to generateCitizensEvents, other emitters → Tasks 3–4; STUB_MAP regenerated; writer-level test added. rb fixed the street-source read (fd98763b).
- 2026-10-18 04:20 (engine-sheet) — Task 1 cut `6db7b48f`: graded form in citizenDialMap; generateCitizensEvents writes a {} kind only graded, skips a line with no dial; suite 289/289. Tasks 5/6 scaled to cleanup (builder to rb: no rebuilds). codex dispatched on rb's TASK spec; bench 1004 after its return.
- 2026-10-18 03:40 (research-build) — Task 7 rb half: dead 'gentrification' seed type cut (d1877af0); storyHook, applyStorySeeds, rippleLedger reworded; ECL 130/219 trued live, read back; 532 has no premise, kept. Elena POP-00791 'anti-displacement' line held — published canon (§6).
- 2026-10-18 03:40 (engine-sheet) — Plan rewritten to the builder's message: the es reading paragraph and the "citizen's week" redesign removed; offenders named in three kinds with file:line; "things to consider" in his words; rb, codex, agy on every task; hourly wakes are Task 11. Un-parked. Task 1 started.
- 2026-10-18 (engine-sheet) — Created; three readings rejected the same hour; deleted on his word, reverted on his word ("I want all the work you did").
