---
title: Bloodline Ascent — a generic citizen's path to heritage (engine.147)
created: 2026-09-02
updated: 2026-09-02
type: plan
tags: [engine, citizens, heritage, household, tier, dials, active]
sources:
  - builder direction 2026-09-02 (S411, engine-sheet chat) — recorded verbatim in §Direction
  - docs/engine/TIER_MOBILITY.md — the three mobility mechanisms as they exist
  - docs/plans/2026-09-01-education-career-connection.md — the four loops + engine.145/146 this arc builds on
pointers:
  - "[[engine/ROLLOUT_PLAN]] — engine.147"
  - "[[engine/TIER_MOBILITY]] — CLIMB / fame door / demotion as built"
  - "[[plans/2026-05-30-citizen-lifecycle-fame-system]] — engine.29, parked; the fame half of this arc"
  - "[[plans/2026-07-13-family-household-loop-build]] — the household half, as built"
  - "[[plans/2026-07-31-citizen-memory-perception]] — engine.94, dials + memory + approval ceiling"
  - "[[index]] — registered same commit"
---

# Bloodline Ascent — a generic citizen's path to heritage (engine.147)

**Status: MEASURED (S412), BUILD ORDER PROPOSED, NOTHING BUILT.** The hop table below is the agreement on what the system does today; the build order under it waits on the builder.

## Direction (builder, 2026-09-02, recorded as said)

> The idea here is the citizen's path to success in this world. Take a generic citizen (a Tier-5 in waiting) with very little impact on its world, and how they can go from that to Tier 1, with a full household, and ascend to a heritage figure in the sim. Where the Keane family is carried in off professional sports fame and riches, the same path (albeit weighed against them) can ascend to that same level with chance events, cron wakes, media coverage and lottery-type events like UNDOCKED and casino gains. Like real life, a citizen is impacted by where they live, the choices the civic engine makes, the choices its cron makes in a wake, and how those hitting their dial system start to alter their life path — the same way someone on heritage can lose it all with the inverse. The idea is to have the cycles throwing all this data at a cron and it knowing it needs to maneuver up in Tier and dial state to advance their bloodline.

Earlier the same day: *"we will be checking heritage and households in the next project to ensure all the systems landed and the infrastructure is set on the path to success or failure of bloodlines."*

**Read of the direction (engine-sheet):** two halves. (1) **Audit** — do the systems that exist actually connect into one path from Tier-5 to heritage, and the inverse? (2) **The maneuvering cron** — a citizen-loop wake that reads what the cycle threw at a citizen (hood state, civic choices, media coverage, casino/UNDOCKED outcomes, dial deltas) and acts to move Tier and dial state toward advancing the bloodline. The test for every piece: does a row drive a fate (universal protagonism).

## What exists today (verified S411 or pointed)

- **Tiers:** four tracked tiers + Generic_Citizens as the Tier-5 pool. Mobility as built is in `docs/engine/TIER_MOBILITY.md`: CLIMB via the UsageCount ladder (media appearances), the fame door (engine.118, designed, **unwired** — zero fame→Tier writes exist), demotion. Media promotion is structurally dead (engine.108: a Tier-5 can never be covered because the packet path stopped reading Generic_Citizens). **That is the first rung and it is missing.**
- **Heritage:** `Heritage_Ledger` 5 lines, all `Founding` (Corliss, Dillon, Keane, Kelley, Varek), 1–4 living members, 1–2 generations, scores 12–17. Columns: LineageId, FamilyName, FounderPopId, FoundedCycle, FoundedDoor, Generations, LivingMembers, MembersList, HeritageScore, HeritageTier, TotalNetWorth, HomesOwned, BusinessesOwned, CivicMembers, FameMembers. No sector/trade on a line. `heritageTierByPop_` feeds the 18th-birthday settlement (+1/+2 on the draw, engine.66). Founding doors: pointed in the heritage build (grep `FoundedDoor`).
- **Household:** `Household_Ledger` 682 rows (HouseholdId, HeadOfHousehold, Type, Members, Neighborhood, HousingType, rent/cost, HouseholdIncome, Formed/Dissolved, Savings). 49 of 50 minors have a household; 47 a resolvable parent. Household income + parent education + heritage tier + school quality set a kid's start (engine.60/66/143/144).
- **Dials:** `DialState` per citizen, compressed from LifeHistory lines by `compressLifeHistory_` through `citizenDialMap.js` (every event tag → dial deltas; `youth-*` tags included since S411). Dial bands already scale participation (drive → youth-event frequency; engine.32 T5) and the E2/E3 events do not read dials.
- **Education → career (S411):** field-first settlement, credential tie-break, youth-mode texture; SkillTags = current then trained field; a parent's field pulls the kid's.
- **Chance/lottery inputs:** `Casino_Ledger` armed live (4b, grok); UNDOCKED show feed (`Undocked_Feed`, Reputation lines); chaos cars; health milestones; employer success/layoff (engine.135); civic scoring and initiatives as hood-level conditions (engine.139).
- **Crons/wakes:** the 24/7 citizen-loop wakes (citizen-voice agents), the civic Sunday chain, the media daily pipeline. None of them today reads a citizen's Tier/dial position and *acts* to move it.
- **Memory:** engine.94 Track A (grief/approval self-arm) live; Track B (typed grudge, ambition, folk memory) gated on a design session — **ambition is the dial this arc needs**.

## The measure (engine-sheet, S412, 2026-09-02) — hop by hop, with pointers

Every pointer opened this session; counts are the live ledger snapshot (968 rows, refreshed S411), the live `Generic_Citizens`, `Family_Relationships` and `Heritage_Ledger` tabs read 2026-09-02.

### Up: one generic citizen → a heritage line

| # | Hop | Mechanism as built | Pointer | State |
|---|---|---|---|---|
| 1 | The Tier-5 pool | `Generic_Citizens` — 299 rows, 269 active | `generateGenericCitizens.js` | WIRED |
| 2 | A Tier-5 gets named | Desk packets read GC as a bounded fallback (engine.108, landed `e371d815` 2026-08-16) → article → Saturday print → `mediaRoomIntake` writes `Citizen_Media_Usage`; an unmatched name routes to GC `EmergenceCount` | `scripts/buildDeskPackets.js:2144`; `processAdvancementIntake.js:361` | WIRED, never converted — 41 GCs carry `EmergenceCount` > 0, max 2; the bar is 3 (`GC_EMERGENCE_PROMOTION_THRESHOLD`, `:982`, builder-ruled S320) |
| 3 | Tier-5 → a Tier-4 row | Three doors, all keyed on that count: (a) engine.58 emergence promotion at ≥3 → `Advancement_Intake`, enters Tier 4 (`:1110`); (b) `checkForPromotions_` — world-modified 20 % base chance for a GC at the bar (`checkForPromotions.js:362-367`); (c) engine.66c family-slot lottery — 20 %/slot event, two reels must match (`:1266-1282`) | as cited | WIRED, NEVER FIRED under the current mechanisms — `Advancement_Intake1` (12 rows) carries no mint note; the GC tab holds 17 `Promoted` + 13 `Emerged` rows, all at `EmergenceCount` 0, and **none of the 17 promoted names is on the ledger** — a pre-S320 era's statuses, stale |
| 4 | First job, income | Field-first settlement at 18; E3 hires by SkillTags into the field; E2 promotes; pay off the hood's businesses | `educationCareerEngine.js:1089`; `runCareerEngine.js:1071` | WIRED (S411) |
| 5 | Household | Criteria formation: married / adult with on-ledger kids / parentless minor. Solo establishment needs **Tier ≤ 3** AND income ≥ 85k, 10 %/cycle | `householdFormationEngine.js:268-300` | WIRED — a Tier-4 earner cannot establish a household alone; the Tier gate sits on this hop |
| 6 | Dial movement | LifeHistory tags → `DIAL_MAP` deltas → `DialState`; dial bands scale odds in 11 engines (events, youth, career, conduct, relationships, household, neighborhood, education, micro-events) | `utilities/citizenDialMap.js:22`; readers by grep | WIRED as a modifier: dials reach **money through odds** — drive ≥ 60 → 1.4× casino participation (`casinoLedgerEngine.js:685-686`), `careerFreq` scales career-event chance (`runCareerEngine.js:912-913`). **No dial reads Tier and nothing reads a dial to move Tier. No ambition dial** (engine.94 Track B, gated) |
| 7 | Money | Per-cycle accrual (`processMoneyLoop_` `:294`, write `:404`); inheritance (`:877`, `:1065`); casino ± (`casinoLedgerEngine.js:588`); employer success / layoff (engine.135) | `generationalWealthEngine.js` | WIRED. T4/ENGINE median NetWorth $408k, top $3.2M |
| 8 | Tier 4 → 3 → 2 → 1 | UsageCount ladder ≥3 / ≥6 / ≥9 — fires **only inside a citation-processing pass**, on `newUsage` | `processAdvancementIntake.js:428-437` | WIRED, EVENT-ONLY. **The 12 ENGINE Tier-4 rows at UsageCount 3–15 never climbed because their counts are seeded, not earned**: 0 `Citizen_Media_Usage` rows behind any of them (POP-00529/00531 at 9, 00530 at 14, 00532 at 15, 00590 at 12 — the Feb–Mar 2026 mint era); 58 ENGINE rows in all carry a cell above their citation count. engine.69's convention (no marker = hand-authored = held) is what holds them. A state rule would lift six of them straight to Tier 1 |
| 9 | Decay | 10 quiet cycles → −1/cycle; an earned rung gives way below its bar; Tier 1 exempt | `:869-942` | WIRED (engine.69) |
| 10 | Fame tenure | FameScore ≥ 25 → permanent Tier-1 floor | engine.118 | GAP — designed, zero fame→Tier writes |
| 11 | A line is founded | Door A: a `Family_Relationships` unit with ≥3 living tracked members, none already lined, combined NetWorth ≥ $1M. Door B: one citizen ≥ $350M | `generationalWealthEngine.js:1449-1453`, `:1689-1730` | WIRED, UNREACHABLE from below — **0 candidate units** (two unlined units have 3 living members, at $78k and $0); Door B is the four existing Tier-1 apex rows. `Family_Relationships` holds 101 rows; households (682) are not the registry |
| 12 | The line grows | Kids inherit `LineageId` from a lined parent; a spouse joins by taking the surname. Score/cycle = min(4, NW/500k) + (generations − 1) + min(3, civic members) + min(3, members at UsageCount ≥ 5) + 2×businesses + homes. Tiers: Founding 0 / Established 50 / Prominent 150 / Dynasty 350 | `:1615-1640`, `:1806-1812`, `:1441-1446` | WIRED, slow — five lines at 12–17 pts; 11 ledger rows carry a `LineageId` |
| 13 | Heritage lifts a member | `heritageTierByPop_` → +1/+2 on the 18th-birthday settlement draw; birth-odds multiplier | `educationCareerEngine.js:1128`; `HERITAGE_BIRTH_MULT` | PARTIAL — heritage never moves a member's Tier or money |
| 14 | The maneuvering cron | The citizen-loop wake writes `Reflection_Intake` only → `citizen-signal-detector` → `Story_Seed_Deck` (media seeds), bond extraction, the UNDOCKED gate | `scripts/citizen-wake.js:404`; `scripts/citizen-signal-detector.js:36,238` | GAP — the wake can *cause coverage* (feeds hops 2 and 8) and nothing else; no cron or phase reads Tier + dial position and acts |
| 15 | Civic choices reach a citizen | Hood state pool → citizen event texture + condition tags; approval / initiatives stay hood-level | `generateCitizensEvents.js:1236-1246`, `:2605` | WIRED as texture; no Tier / money consequence |

### Down: a founding-line member → nothing

| # | Hop | Mechanism as built | Pointer | State |
|---|---|---|---|---|
| D1 | Lose Tier | Tier 1 is decay-exempt (engine.69 rule 3); hand-authored tiers never demote | `processAdvancementIntake.js:869-942` | GAP by design — a founder cannot fall a rung |
| D2 | Lose money | Casino stake (`:588`), heritage business stake (`:1874`), inheritance down-share (`:1368`), layoff income (engine.135), debt drag (`processMoneyLoop_`) | as cited | WIRED |
| D3 | Lose the line | Score points are all ≥ 0 → the score only rises; `heritageTierFor_` never steps down; `LivingMembers` recomputes but 0 living leaves the row in place | `:1806-1830` | GAP — no loss, no dissolve, no scandal |
| D4 | Death | Status deceased → excluded from NW / civic / fame counts; `LineageId` stays for the chain | `living()` `:1762-1772` | WIRED |

### What the table says

The ascent exists on paper and is closed at both ends. The bottom door (hop 3) has not opened under the current engine: 269 Tier-5s, nobody at the bar, and the 17 old `Promoted` rows never reached the ledger. The top door (hop 11) needs $1M across three tracked family members registered in a 101-row family tab, which no non-founding family has. In between, the one wired climb (hop 8) is an event, not a state, and the 12 citizens sitting above the Tier-3 bar are there on seeded counts, not coverage. Dials move odds (including casino and career money) but never Tier; heritage never touches Tier; the wake never touches anything but coverage. The inverse has money loss only.

### Build order (proposed for the builder's approval — nothing started)

1. **engine.150 — the ladder as a state, for EARNED counts.** Every cycle a row's Tier follows the bar its *citation-backed* count clears (decay as today). The 58 seeded cells are the builder's call, not code: **hold** them (today's convention) or **re-base** `UsageCount` to citations (a 58-cell diff-restore). A plain state rule without that choice promotes six citizens to the protected class in one cycle (Aguilar ×2, Okafor, Nair, Whitfield, Soto, Creighton).
2. **engine.151 — a reachable heritage door (Door C).** Founding by *earned* shape instead of cash: e.g. two generations on the ledger + a member at Tier ≤ 2 + a household with a home or a business. Design call on the shape is the builder's; the mechanism slots into `:1645` beside A and B.
3. **engine.152 — heritage loss.** Score can fall (no living members, NW below a floor, a scandal event tag), `heritageTierFor_` steps down, a line at 0 living for N cycles goes dormant. Gives the inverse a path.
4. **engine.118 — fame tenure** (already designed): FameScore ≥ 25 → Tier-1 floor. Second climb, independent of print.
5. **engine.153 — the maneuver step.** An **engine phase** (Phase 5, after the money loop) that reads Tier + dial bands + hood state and picks the citizen's risk posture for the cycle — stake size at the casino, taking the solo household, a field change, a relocation — and writes the LifeHistory line that moves the dials back. The wake stays the *voice* (interview, Discord) and keeps feeding coverage; the engine is the substrate that maneuvers, per doctrine. Needs the ambition dial (engine.94 Track B) first or in the same cut.
6. **Loosen hop 5's Tier gate** (solo household on income alone) — a one-line call inside 5 or on its own.

Open questions for the builder are unchanged (§below); 2 and 5 cannot be cut without answers to the first two.

## First task (as set S411): the measure — DONE above

Trace ONE generic citizen forward through the mechanisms above, on paper, hop by hop: Generic_Citizens → first coverage → Tier 4 row → household → first job → dial movement → Tier 3 → … → heritage line founded → Tier 1. At each hop name the file:line that performs it or write **GAP**. Then the inverse for a Founding-line member. Expected gaps from what S411 saw: the Tier-5 → Tier-4 door (engine.108), the fame door (engine.118 unwired), no ambition dial (engine.94 Track B), no cron that reads Tier/dial and acts, no heritage trade/field on a line, no heritage *loss* path.

Deliverable of the measure: a hop table with pointers and gaps, and a build order the builder can approve. No code before that table exists.

## Open questions (for the builder, after the measure)

- Is the maneuvering cron a **citizen-voice wake** (the citizen chooses) or an **engine phase** (the world moves them)? The direction says cron; the doctrine says the engine is the substrate and crons capture. Both may be right at different hops.
- What is "advance the bloodline" as a number — HeritageScore, HeritageTier, generations, members in Tier ≤2? The line needs one target the cron can steer toward.
- Loss: what un-founds a line (last member dies, score below a floor, a scandal)? Nothing today.

## Changelog

- 2026-09-02 (engine-sheet, S412) — **The measure.** Fifteen hops up, four down, every pointer opened. Findings: the Tier-5 door has never fired (max EmergenceCount 2 of 3; 0 lottery mints ever); Door A has 0 candidate units; the UsageCount climb is event-only (13 ENGINE Tier-4 rows stranded at 3–15); dials, heritage and the wake never touch Tier; the inverse has money loss only. engine.108 found landed (`e371d815`, 2026-08-16) with its ROLLOUT row still `ready` — row trued. Build order of six proposed; nothing cut. Advisor-driven checks the same session: dials DO reach money through odds (casino participation, career frequency) — hop 6 corrected; the 12 stranded Tier-4 rows carry seeded counts with 0 citations behind them (58 ENGINE rows seeded in all) — hop 8 and build item 1 corrected; the GC tab's 17 `Promoted` / 13 `Emerged` rows are pre-S320 statuses whose citizens are not on the ledger — hop 3 corrected.
- 2026-09-02 (engine-sheet, S411) — Direction captured as said, the existing-mechanism map pointed, the measure defined as the first task. No design, no code.
