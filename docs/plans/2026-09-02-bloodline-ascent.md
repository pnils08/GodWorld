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

**Status: MEASURED (S412) + BUILDER DIRECTION ON THE CHAIN CAPTURED; build order revised to the chain; NOTHING BUILT.** §The chain as directed vs as built is the agreement; §Build order, revised is what ships next, one row per cut.

## Direction (builder, 2026-09-02, recorded as said)

> The idea here is the citizen's path to success in this world. Take a generic citizen (a Tier-5 in waiting) with very little impact on its world, and how they can go from that to Tier 1, with a full household, and ascend to a heritage figure in the sim. Where the Keane family is carried in off professional sports fame and riches, the same path (albeit weighed against them) can ascend to that same level with chance events, cron wakes, media coverage and lottery-type events like UNDOCKED and casino gains. Like real life, a citizen is impacted by where they live, the choices the civic engine makes, the choices its cron makes in a wake, and how those hitting their dial system start to alter their life path — the same way someone on heritage can lose it all with the inverse. The idea is to have the cycles throwing all this data at a cron and it knowing it needs to maneuver up in Tier and dial state to advance their bloodline.

Earlier the same day: *"we will be checking heritage and households in the next project to ensure all the systems landed and the infrastructure is set on the path to success or failure of bloodlines."*

**Read of the direction (engine-sheet):** two halves. (1) **Audit** — do the systems that exist actually connect into one path from Tier-5 to heritage, and the inverse? (2) **The maneuvering cron** — a citizen-loop wake that reads what the cycle threw at a citizen (hood state, civic choices, media coverage, casino/UNDOCKED outcomes, dial deltas) and acts to move Tier and dial state toward advancing the bloodline. The test for every piece: does a row drive a fate (universal protagonism).


**Builder, 2026-09-02 15:41 (S412, after reading the measure) — recorded as said:**

> Ok lots of disconnected processes. I think generics have a slight chance to be married into Tier 4 from there as well, but yes Tier is the citizen hierarchy and raising your Tier should increase a citizen's life but exposure can become negative as well which would have the inverse effect. Once a citizen hits 25 media usage they assume fame and only their fame fluctuates once at that stage. An individual on their own can build a heritage line without a family but most will achieve it combined. So a citizen may start single as Tier 4, generate their pay, and the newer engines that could increase their pay and/or Tier; as that citizen builds their wealth they may purchase a house; once you have a house your odds of marriage increase; where you live, what your net worth is, determines the quality of spouse; now with a house and a spouse the odds of children increase; same neighborhood affects that kid's opportunities. Most citizens in the ledger were pre-populated before this system existed so they are the gifted era of not earning necessarily what they have, but going forward these elements are the ladder to your name and family being the pillars of the sim. So as a professional athlete has a better chance, a generic citizen could arguably become that as well — albeit a lot of engine determinism going their way.

**Read (engine-sheet):** the chain is the spec. Tier is the hierarchy and must *pay* in lived odds; coverage runs both ways; fame is a UsageCount bar (25) that mints permanence; a line can be founded solo; the seeded counts are the gifted era and stay as they are; the maneuvering is engine determinism ("going their way"), so the maneuver step is an engine phase and the wake stays the voice.

**Builder, 2026-09-02 17:32 (S412, after cut 1 shipped) — recorded as said:**

> The point of the intake is to hit their usage and/or add media-covered changes. Great news on Tier-5 citizens, and the reward should be: no one can fall back to Tier 5. Once you become Tier 4 that's the furthest you can descend. Once you reach fame you can only become "less" famous. So Vinnie Keane is still famous when he is 80 but not as famous as he is at 37 — I mean he could still be, but you get it. The media I agree, as the Tier makes them more seen, but more importantly it's telling us their cron writes the best articles, and this would be the routing system to get more "work". My theory is as this moves, these cron LLMs will become more advanced. As they reach the point of understanding the "game" they are trying to solve within the sim, this will get interesting. If citizens know they need to Tier up and make a family, and media knows they need to produce more, civic knows their approval rating keeps them in office — I believe it'll change their behavior. So this all is the system that makes the math a real issue for them to master. You can't even do it without reading the code. So it's a layered "game" these crons are playing: the better you are, the more you get to wake up; the more you wake up, the more the sim knows you.

**Read (engine-sheet):** four rules and one doctrine. (1) **Tier 4 is the floor** — nothing demotes below 4 and no row leaves the ledger for the pool (true by construction today: decay stops at 4, no writer sets 5). (2) **Fame is permanent, only its grade moves** — the engine.118 cut. (3) **Media Tier is a routing signal** — the desk pipeline should hand more assignments to the higher-Tier byline; that is a cron-desk change (research-build lane), filed below, not an engine phase. (4) **Intake's job** is to land usage and coverage-driven changes — never to set a Tier (the guard). Doctrine: **the wake economy** — Tier and fame decide who wakes and how often; the more a citizen wakes, the more the sim knows them; the crons are playing a layered game whose math is the engine, and it should change their behavior as they learn it.

## The chain as directed vs as built (S412)

| Link (builder's words) | As built | Pointer | State |
|---|---|---|---|
| Generic marries into Tier 4 | engine.66c family-slot lottery: 20 %/slot event, one GC reel × one open-slot reel, match = same hood / sex / age | `processAdvancementIntake.js:1266-1282` | WIRED, never matched on live |
| Raising Tier increases a citizen's life | Tier gates almost nothing: solo household (≤3), election eligibility (2–4), one micro-event chance (T1), newsroom context (≤2) | `householdFormationEngine.js:270`; `runCivicElectionsv1.js:211`; `generateGenericCitizenMicroEvent.js:456`; `citizenContextBuilder.js:804` | GAP — Tier has no lived payoff in pay, hiring, housing, courtship |
| Exposure can be negative → inverse | Every citation climbs; `Citizen_Media_Usage` carries no sentiment; no path lowers Tier on coverage | `mediaRoomIntake.js`; `processAdvancementIntake.js:428` | GAP |
| 25 media usage → fame; only fame fluctuates after | engine.118 designed on FameScore ≥ 25; builder now sets the bar on **UsageCount 25**; permanence + decay exemption; FameScore keeps grading A/D-list | `TIER_MOBILITY.md` §3 | GAP — re-specified |
| One person can found a line alone | Solo founding only at $350M (Door B); Door A needs three | `generationalWealthEngine.js:1449-1453` | GAP — an earned solo door |
| Pay, and engines that raise pay / Tier | E2 promotion, E3 hiring, hood reference pay, employer success (engine.135), field-first settlement (engine.144) | `runCareerEngine.js`; `educationCareerEngine.js` | WIRED |
| Wealth → buys a house | Home purchase is household physics — the citizen needs a `Household_Ledger` row; a single needs the solo door, which needs **Tier ≤ 3** | `householdFormationEngine.js:268-280`; `generationalWealthEngine.js:1309` (`trackHomeOwnership_`) | GAP — a single Tier-4 earner cannot own a home |
| A house raises marriage odds | Household presence ×1.5 on the wedding roll; owned vs rented makes no difference | `generationalEventsEngine.js` `checkWedding_` (engine.57 P4) | PARTIAL |
| Where you live + net worth → spouse quality | Compatibility: same hood +3, same job family +2, age gap, warmth. Net worth absent; "quality" is not a concept | `bondEngine.js:885-911` `bondCompatibility_` | PARTIAL — no wealth term, no quality |
| House + spouse → children | Birth needs a household; family type ×1.25; heritage multiplier; dial familyFreq | `checkBirth_` | WIRED |
| Same neighborhood → the kid's opportunities | `SchoolQualityIndex` by hood → settlement band; the hood's businesses pull the field | engine.60/66/143/144 | WIRED |
| The gifted era | 58 ENGINE rows carry seeded UsageCount above their citations; pre-populated wealth | measure hop 8 | HELD — by the builder's framing these stay; earned-only from here |
| A generic could become an athlete-level figure | Needs every link above plus the fame door | — | the whole build |

## Build order, revised to the chain (S412 — proposed; numbers to be set in each cut)

1. **engine.150 — the ladder as a state, earned counts only.** Tier follows the citation-backed bar every cycle; the 58 seeded cells are the gifted era and hold.
2. **engine.152 — coverage runs both ways.** The media-room intake stamps each usage row with a sentiment; a negative citation counts −1 on UsageCount (the decay path already demotes below the bar). Fame-permanent citizens lose FameScore instead of Tier.
3. **engine.118 (re-spec) — fame at UsageCount 25.** Permanent famous marker + Tier-1 floor + decay off; FameScore grades from there.
4. **engine.153 — a single can own a home.** Solo household on income alone (drop the Tier gate), then the wedding roll reads owned > rented > none.
5. **engine.151 — Tier pays.** Tier enters the same places dials do: hire-slot order, promotion order, spouse pool, home-purchase odds — a multiplier per rung. This is the "raising Tier increases a citizen's life" link.
6. **engine.154 — spouse quality.** Compatibility adds a net-worth-band term and the hood's prosperity; the drawn spouse's band tracks the citizen's own hood + net worth.
7. **engine.155 — Door C, earned, solo or family.** An owned home + a net-worth floor + Tier ≤ 2 (solo), or the same across a household (family), founds a line. Doors A and B stay.
8. **engine.156 — heritage loss.** Score can fall; tier steps down; an empty line goes dormant.
9. **engine.157 — the maneuver phase.** Engine determinism, Phase 5 after the money loop: reads Tier + dials + hood, sets the cycle's risk posture (casino stake, field change, relocation, the solo door), writes the LifeHistory line that moves the dials. Needs the ambition dial (engine.94 Track B) in the same cut.

Each is its own row and plan cut; 1–4 need no further design words from the builder; 5–9 get their numbers proposed in the cut and approved on trust.

**Filed for the desk pipeline (not engine, research-build lane):** *media Tier as routing* — `cron-desk-run` hands the higher-Tier byline more assignments; and *the wake economy* — the citizen-loop rota weights wake frequency by Tier / fame (builder direction 17:32). Neither gates a cut above.

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

- 2026-09-02 (engine-sheet, S412, 17:32) — Builder's post-cut-1 direction captured verbatim (Tier 4 floor; fame permanent, grade moves; media Tier = routing to more work; intake lands usage, never sets Tier; the wake economy doctrine). **engine.150 follow-up coded:** an EARNED rung is one climbed on usage — the old citation climb's `Promotion` line or the state pass's `Media|tier-climb` line; advancement-intake stamps (`Updated to Tier N` on an `Advancement` row, written on every intake whether or not the Tier moved) are authored and no longer count. They had been the ONLY marker decay read since S325 — bench C115's two demotions (Ariana Lee, Sandra Velazquez) were intake stamps from C106, not usage. Test 27/27; live dry-run unchanged (0 / 0 / 42).
- 2026-09-02 (engine-sheet, S412, later) — **engine.150 LIVE PROD @24.** Final shape: ladder covers ENGINE + GAME + CIVIC on citations and MEDIA on `byline-published` (×2); decay covers ENGINE + GAME and reads the old `Advanced from Tier` line as earned; **MEDIA held from decay** while the Saturday selection is unproven (bench C114 would have dropped Leary / Ortega / Navarro 3→4 — desk voices with no published work behind their Tier); CIVIC held. **Intake guard added the same cut:** an intake row never lowers an existing citizen's Tier (`intakeTierForExisting_`; a blank intake Tier defaulted to 3 and was stamped over the row — bench C106 took Vinnie Keane 1→3 that way, and live's 11 pending intake rows would have done the same at C106). Bench C113–C115 clean; live dry-run at C106: 0 promotions, 0 demotions, 42 usage decays (today's number). Row engine.150 → done-pending-archive. Cut 2 next: coverage runs both ways.
- 2026-09-02 (engine-sheet, S412, 16:15) — **engine.150 revised on builder review (still NOT deployed):** *"GAME should be eligible for tier exposure; media isn't gained by coverage but by article usage in the Saturday runs; civic maybe approval rating — maybe too complex; the old earned usage should apply, the canon is on record."* Cut: the ladder covers ENGINE + GAME + CIVIC on emergence citations and MEDIA on `byline-published` rows only (worth 2 each, the engine.88 rule); decay widened to ENGINE + GAME + MEDIA (CIVIC held); decay now reads the old climb's `Advanced from Tier X to Tier Y` log line as an earned rung, so rungs earned before today can fall. A CIVIC ladder on approval rating is left for its own cut. Test 18/18. Live dry-run: still **0 promotions**, 74 seeded cells held across the four clocks.
- 2026-09-02 (engine-sheet, S412) — **engine.150 cut 1 coded + unit-proven (`scripts/tierLadderState.test.js` 15/15), NOT deployed (builder review first).** `applyTierLadderState_` runs each cycle between the citation pass and decay: earned = min(UsageCount cell, emergence citations on record for the normalized name); Tier follows the bar it clears, upward only; ambiguous names skipped; ENGINE-clock active rows only. The citation event no longer decides Tier (count only). Promotions write `Updated to Tier N` — the marker engine.69 decay reads — where the old climb wrote `Advanced from Tier`, so a media-earned rung was never eligible to give way (latent since S325); fixed going forward. **Live dry-run against the C105 ledger + 595 usage rows: 0 promotions, 27 seeded cells held, 0 ambiguous** — nobody on the ledger today has an earned count above their Tier's bar; the change is to the future (a seeded cell can no longer carry a citizen up on one new citation, and earned rungs can now fall).
- 2026-09-02 (engine-sheet, S412, 15:41) — Builder's chain direction captured verbatim; every link mapped against the code (13 links: 5 wired, 2 partial, 5 gaps, the gifted era held); build order rewritten in chain order, nine cuts. Decisions resolved by the builder's words: seeded counts hold (gifted era); fame bar = UsageCount 25; solo founding allowed; the maneuver is an engine phase.
- 2026-09-02 (engine-sheet, S412) — **The measure.** Fifteen hops up, four down, every pointer opened. Findings: the Tier-5 door has never fired (max EmergenceCount 2 of 3; 0 lottery mints ever); Door A has 0 candidate units; the UsageCount climb is event-only (13 ENGINE Tier-4 rows stranded at 3–15); dials, heritage and the wake never touch Tier; the inverse has money loss only. engine.108 found landed (`e371d815`, 2026-08-16) with its ROLLOUT row still `ready` — row trued. Build order of six proposed; nothing cut. Advisor-driven checks the same session: dials DO reach money through odds (casino participation, career frequency) — hop 6 corrected; the 12 stranded Tier-4 rows carry seeded counts with 0 citations behind them (58 ENGINE rows seeded in all) — hop 8 and build item 1 corrected; the GC tab's 17 `Promoted` / 13 `Emerged` rows are pre-S320 statuses whose citizens are not on the ledger — hop 3 corrected.
- 2026-09-02 (engine-sheet, S411) — Direction captured as said, the existing-mechanism map pointed, the measure defined as the first task. No design, no code.
