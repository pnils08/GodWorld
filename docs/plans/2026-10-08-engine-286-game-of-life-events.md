---
title: engine.286 — events that are the game the crons play
created: 2026-10-08
updated: 2026-10-08
type: plan
tags: [engine, citizens, crons, draft]
sources:
  - docs/research/2026-10-08-engine-286-event-engines-read-before.md
  - docs/for-claude-review/2026-10-08-codex-engine286-read-and-plan.md
  - docs/plans/2026-07-31-citizen-memory-perception.md §engine.284 (flag audit, builder rulings)
  - docs/plans/2026-07-18-event-pools-design.md (engine.67, closed 2026-09-29)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.286; engine.284 is folded into this plan"
  - "[[2026-07-31-citizen-memory-perception]] — §engine.284: the flag audit, the rulings, the applied ledger edits"
  - "[[2026-07-18-event-pools-design]] — engine.67's life-state gate, which this extends"
  - "[[2026-09-02-bloodline-ascent]] — the ascent chain these events feed"
---

# engine.286 — events that are the game the crons play

**Builder's words (2026-10-08):** "I wanted codex to approach the project with the concept of the 'game of life' elements. Since the crons came after this was all built and it's the crons that are using these events, they should include events that drive the game and give the crons the ability to play the 'game'."

**Builder's words (2026-10-08, relayed in the codex report §Builder clarification; not yet re-confirmed to research-build in his own message):** "the goal is to curtail the 'generic' events and events more aligned with the sims reality, more aligned with the dials and how they effect them, events that trigger the crons to act in their wakes, events that give them and edge, set them back, if the crons are trying to tier up, gets media coverage, make a family, own a home, have kids, get a promotion and try to make it to the heritage ledger, get on undocked, wake as a cron, follow the sports teams. creating the 'dice roll' elements that complicate or help the crons play that game when they wake. All the other elements youre using would apply, your tier, hood, net worth, dials, flag, clock mode make them events unique, we lean on the Event Content Ledger to assist on the variety to take some weight off the event engine code depth"

**Earlier rulings the plan keeps (2026-10-08, [[2026-07-31-citizen-memory-perception]] §engine.284):** the UNI/MED/CIV flags are canon guardrails and stay; retired players keep UNI; game and media clocks cannot die, the civic clock rolls — by design.

**Goal:** The citizen events are the game the wake-cron citizens play: consequential, dice-rolled opportunities and setbacks tied to their pursuits (tier, coverage, family, home, children, promotion, heritage ledger, UNDOCKED, the teams), made unique by tier, hood, net worth, dials, flag and clock, varied by the Event Content Ledger, with generic filler curtailed. engine.284's gate fix, the mint flag registration and the ledger-doc true-up are tasks inside it.

**Rows:** engine.286 (engine.284 folded) · **Owner:** research-build designs and reconciles; engine-sheet builds; codex reviews the diff before any production release

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Resolve the builder calls (Open questions) and pick the first event families; reconcile any further review into the tables below. | rb | not started |
| 2 | Prove ONE consequential path on the bench before expanding content: premise → roll → owning writer persists the change → primary tag folds → wake perceives the event and its stake (pool admission and five-line tail) → reflection reaches Reflection_Intake → a later Cycle applies the response. A citizen outside the wake pool and a setback followed by five routine lines are in the fixture. | es | not started |
| 3 | Premise-eligibility contract: extend `deriveLifeState_` / `isEventEligible_` in `citizenContextBuilder.js` (engine.67's helper) into a pure per-row contract applied at every entry path — the household pass, ECL injection, and the eight generators. Clock and the three flags are independent inputs; missing facts are reported, not invented. | es | not started |
| 4 | `generateCitizensEvents_`: candidates carry a factual premise; event families (opportunity and setback) originate inside the existing weighted draw; outcome roll is separate from wording weight. Extend the ECL contract (`loadEventContentLedger.js` validation, `generateCitizensEvents.js` scope producer, class selection, tests) with NetWorth, dials, flags, ClockMode and the realized outcome. Same premise validation for ECL and hardcoded lines. | es | not started |
| 5 | Remove the output quotas (generic micro-event 25, neighborhood 6, game-mode 15) and the ledger-order allocation; individual eligibility instead; stop the neighborhood engine substituting pressure text for a drawn line; make its neighborhood assignment an explicit behavior, not a pre-roll side effect. | es | not started |
| 6 | Civic role (absorbs the engine.284 gate fix — it is never woken as written): re-align to real official actions and transitions with a receipt and duplicate protection, or retire its emitting path and let civic-mode consume the receipts, per the builder call; move its call after its producers on both scheduler paths. | es | not started |
| 7 | Premise fixes in the clock engines: game-mode (UNI means every job is baseball), Universe pipeline, civic-mode (decisions with no effect, inactive offices), media-mode (press-box lines with no assignment, no publication receipt). Preserve each clock's guardrails and the retired-UNI combination. | es | not started |
| 8 | Flag registration at `createChildRow_` (births) and `processAdvancementRowsBody_` (intake): explicit values, header validation before mutation, existing rows' flags preserved. Ledger doc true-up (`SIMULATION_LEDGER.md` lines 87, 193–195). Tre Mingo and the 81 blank rows are separate, reviewed ledger actions. | es | not started |
| 9 | Check the two direct in-cycle log writers against `SHEETS_MANIFEST.md` §9; clear the written-but-never-read fields as a rider (FIX, don't ADD). | es | not started |
| 10 | Tests and bench proving sequence: codex's seven test groups and acceptance additions below; builder reads actual success and failure texture before any production release. | es | not started |
| 11 | Codex reviews the engine-sheet diff before production (house review lane); findings reconciled back into this plan's tables. | codex / rb | not started |

## Acceptance

1. Citizens with different Tier, hood, NetWorth and dials, under identical forced rolls, draw different opportunities, consequences or severities, and the reason is readable; repeated for each protected flag/clock combination. Wording differences alone do not pass — proven by paired bench fixtures.
2. For each event family: advantage, setback, no-event and a follow-on recovery or loss are all reachable and read back from the owning writer's persisted state. An event that claims a benefit but changes no chance, state or perception is filler and fails — proven by bench readback.
3. The chain event → ECL composition → LifeHistory → dial fold → wake pool, tail and standing → Reflection-shaped return → next-Cycle consumer works for the first family, including a setback followed by five routine lines and a citizen outside the shaped wake pool — proven on the bench; production frequency and organic exposure are proven by live observation after deployment, never by manufactured incidents.
4. Growing a family from a few ECL lines to many raises expression variety without raising its mechanical reward or penalty — proven by a rate comparison on the bench.
5. Pursuit events help or hinder the earned transition without completing it: visibility reaches a coverage or usage path before tier or fame credit; a housing event reaches the ownership writer; a family event respects bonds, households and the birth process; heritage follows the standing calculation; an UNDOCKED interest line does not grant pilot status; following a team uses its actual feed and fandom mechanics.
6. No generic retagging, no output quota replaces the old caps, no historical line is deleted or corrected, and the flag, clock and death rulings are unchanged — proven by the routing matrix test.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Event-engine read-before (eight wiring cards, conditioning table, C110 tag counts, comparison §7) | rb | [[../research/2026-10-08-engine-286-event-engines-read-before]] | read-only |
| Independent read and plan, with the builder amendment and wake/return trace | codex | [[../for-claude-review/2026-10-08-codex-engine286-read-and-plan]] | HOLD implementation for builder calls; read-before complete |
| Wiring cards ×8 (runCivicRoleEngine_, generateCitizensEvents_, generateGenericCitizenMicroEvents_, runNeighborhoodEngine_, runAsUniversePipeline_, generateGameModeMicroEvents_, generateCivicModeEvents_, generateMediaModeEvents_) | rb (engine-wiring agent) | summarized in the rb read-before §1; reproducible per target with the engine-wiring agent | read-only |
| engine.284 flag audit and applied ledger edits | rb | [[2026-07-31-citizen-memory-perception]] §engine.284 | 13 edits applied and read back 2026-10-08 |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | The UNI/MED/CIV flags are canon guardrails and stay; clock routes; game and media clocks cannot die, the civic clock rolls; retired players keep UNI. | builder | [[2026-07-31-citizen-memory-perception]] §engine.284 rulings; codex §Builder rulings |
| A2 | Fix the existing engines; no new engine file. | builder · rb · codex | codex task text, header; rb read-before §0 |
| A3 | Dials follow events; rate and severity of success and failure are the dials, not gates. | builder · codex | standing rulings; codex header |
| A4 | The goal is events the crons play: consequential, dice-rolled, tied to pursuits, ECL for variety, generic filler curtailed. | builder | builder's words above; codex §Builder clarification |
| A5 | The main generator is the one engine that draws from the citizen's life; the rest are thinner. | rb · codex | rb §2–§3.1; codex §1–§2 |
| A6 | Generic micro-event, neighborhood and game-mode stop at a per-cycle event limit and walk the ledger in sheet order (code-verified `EVENT_LIMIT` breaks 2026-10-08); the exact counts 25 and 6 per cycle for C106–C110 are codex's measurement. | rb · codex | rb §7 item 1; codex §Recent output, §2–§3 |
| A7 | Plain tags (Daily, Personal, Neighborhood, Micro-Event, Background, Lifestyle, Civic, Civic Perception, Sports atmosphere) score `{}` on the dial map; Work, Media, Community, Cultural, Faith, Civic Role, PostCareer and the setback tags score (plain tags re-verified by rb 2026-10-08). | codex · rb | codex §Wiring card and dial composition; rb §7 item 2 |
| A8 | The civic role engine must not be woken as written; it re-aligns to real official actions, or retires. | rb · codex | rb §3.3, §5.1; codex §4, call 1 |
| A9 | The civic role engine runs before initiatives resolve (code-verified: Phase5-CivicRoles at `godWorldEngine2.js:635`, Initiatives at :636, CivicModeEvents at :638, and :2352/:2353/:2355). | codex · rb | codex wiring table; rb code check 2026-10-08 |
| A10 | The main generator admits every clock with no flag gate, and the ECL condition scope has no clock, flag or employer; concrete miss: POP-00017 Anthony Raines (MEDIA, Lead Beat Reporter, Oakland A's) carries `[Work] badged into the Baylight office…` at Y3C2 and Y3C5 (rb re-read the ledger 2026-10-08). | codex · rb | codex §1; rb §7 item 3 |
| A11 | The daily generator and the Universe pipeline write the log tab directly in-cycle; the other six queue. | rb · codex | rb §3.4; codex Persist row |
| A12 | Births and ordinary promotions leave the flags blank; they should write explicit values and preserve existing rows' flags. | rb · codex | rb (engine.284 fold); codex §Flags at mint, Task 7 |
| A13 | The life-state helper already exists (`deriveLifeState_` :60, `isEventEligible_` :120 in `citizenContextBuilder.js`, engine.67); extend it, do not build another. | codex · rb | codex Task 2; rb code check 2026-10-08; [[2026-07-18-event-pools-design]] §3 |
| A14 | SIM_DOCTRINE governs: causes before dice, no output quotas, persistent consequences. | codex · rb | codex §Evidence boundary |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | The civic role, Universe, civic-mode and media-mode engines condition on nothing from the citizen's own row. rb's count said so; codex shows civic-mode and media-mode scale by health and condition on role, office and votes. | rb (overstated) vs codex | a per-engine trace listing every row field read in its per-citizen loop | rb §2 caveat, §7; codex §7–§8 |
| P2 | The neighborhood engine discards a drawn line for pressure text and assigns a neighborhood before its roll. | codex | bench with forced pressure; read the ledger line and `DialState.pressure` | codex §3 |
| P3 | Retained logs attribute to engines (neighborhood six per cycle is reconstructed from text; no producer receipt exists). | codex | add a producer receipt on the bench and compare | codex §Weakest 1 |
| P4 | The full chain event → dial → wake → reflection → next-cycle response works end to end. Each link is source-verified; nobody has run it. | codex | Task 2 bench path | codex §Additional source trace |
| P5 | A setback tagged Friction/Strain/Stumble can fall out of the wake's five-line tail after routine lines (not in the milestone regex). | codex | setback + five routine lines through the wake perception builder | codex wake table row 4 |
| P6 | Not every affected citizen can wake: pool admission needs parseable dials and sufficient deviation. | codex | fixture with a citizen outside the pool | codex wake table row 2 |
| P7 | Early generators (generic micro, game-mode, neighborhood) cannot see later same-cycle career and health writes. | codex | measured dependency check on both scheduler paths | codex §Timing |
| P8 | Removing the quotas changes runtime and RNG consumption within Apps Script limits. | codex | bench runtime and quota headroom | codex §Rates and quotas |
| P9 | The two direct in-cycle writers are on `SHEETS_MANIFEST.md` §9 (a tabled direct write is a class, an untabled one a bug). | rb | read §9 | rb §3.4 |
| P10 | The small Work (28), Money (25) and Career (9) counts against Neighborhood (622) in the C110-end ledger are a defect, not the rarity design engine.67 ruled. | rb | the same counts over several cycles against engine.67's weights | rb §2, §4 |
| P11 | The main generator's output differs by life state as engine.67 designed. | rb | sample twenty citizens across life states | rb §4 |
| P12 | A shared household event should require every member's route to admit it. | codex | builder call and a mixed-household bench | codex call 4 |
| P13 | The local checkout equals the deployed C110 engine. | codex | confirm the deployed version before attributing behavior | codex §Evidence boundary |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | Event families: each names its premise, the attributes that move odds and severity, the roll, the owning writer's persisted consequence, the dial treatment, the wake-readable stake and the next-step consumer. | codex · §Revised implementation priority 1 | the unit of design for "the game" | adopted into Tasks 2, 4 |
| N2 | The engine originates a consequential event from a supported situation plus a roll; it does not wait for another system to have produced every incident. | codex · amendment | removes the dependency on upstream incident generators | adopted into Task 4 |
| N3 | ECL is the variety layer: outcome probability is rolled separately from within-outcome wording weight; the scope grows only by the fields the first families need. | codex · amendment ¶2–3 | variety without multiplying mechanical rewards | adopted into Task 4, Acceptance 4 |
| N4 | Prove one consequential path end to end before expanding content. | codex · amendment ¶4 | keeps the build from becoming prose | adopted into Task 2 |
| N5 | Pursuit-specific acceptance: events help or hinder the earned transition without completing it. | codex · amendment (last ¶) | stops events granting tier, fame, home or pilot status by text | adopted into Acceptance 5 |
| N6 | Event identity and receipt: separate multiple genuine events in a cycle, repeated rendering, and re-entry after a persistence failure; test direct-log-then-queued-ledger partial failure. | codex · §Timing and persistence, §Tests 7 | duplicate protection for source-driven events | adopted into Tasks 6, 10 |
| N7 | Paired causal tests: hold RNG constant, vary one attribute (employer, household, means, health, hood, exposure); the candidate set must change for the relevant reason. | codex · §Tests 2 | the proof of "aligned with the sim" | adopted into Task 10, Acceptance 1 |
| N8 | Premise validation applies to ECL lines and hardcoded lines alike, before selection. | codex · §1, §Implementation shape | closes the ECL route around the occupation safeguard | adopted into Task 4 |
| N9 | A shared household event is emitted as "the whole household" only when every participant's route admits it; narrower member events stay possible. | codex · call 4 | mixed protected and ordinary households | held for builder |
| N10 | Protected entrants register from authoritative intake facts; ambiguous routing never silently yields an unflagged row; no flag inheritance from a parent. | codex · §Flags at mint, call 5 | closes the blank-flag gap safely | adopted into Task 8; exception rule held for builder |
| N11 | Keep the subjective-reflection route; do not add objective affect tags to simulate a reaction. | codex · §dial composition | protects how citizens interpret events | adopted as a constraint |
| N12 | A wake-package or script change is proposed explicitly, with its live-automation approval gate; engine-only patches do not broaden silently. | codex · acceptance additions | scope control | adopted as a constraint |
| N13 | Audit the daily 1–4 emit choice and the ECL forty-draw limit as further curation constraints. | codex · §Rates and quotas | finds quotas beyond the three named | held (Task 5 audit) |
| N14 | Backfilling the 81 blank-flag rows is a separately reviewed identity classification plus an authorized sheet write. | codex · §Flags at mint | keeps the mint patch from touching live rows | held for builder |
| N15 | Fold the civic role engine into civic-mode so civic lines have one source, the receipts feeding civic-mode narration. | rb · §3.3, §5.1; codex call 1 (retire the emitting path) | one civic line source | held for builder (call 1) |
| N16 | Retired players' lives conditioned on state through the Universe pipeline (they stay flagged, so the regular-life engines never reach them). | rb · §5.3 | a post-career life, not a ≤10% filler note | held for builder |
| N17 | Clear the written-but-never-read fields (at least ten), the phantom `crimeByNeighborhood` read and the unused `grantsThisCycle` read. | rb · §3.5 | hygiene rider | adopted into Task 9 |
| N18 | Stop the neighborhood engine's pressure-text substitution for a drawn line. | codex · §3, Task 4 | removes a retag | adopted into Task 5 |
| N19 | Premise defects in the clock engines: UNI means baseball, chief approves patrol changes with no effect, office lookup ignores active status, press-box lines for every media role. | codex · §6–§8 | factual-premise repairs | adopted into Task 7 |
| N20 | True up `SIMULATION_LEDGER.md` lines 87, 193–195; Tre Mingo (POP-00123, Active port worker) remains on UNI. | rb | docs and one leftover flag | adopted into Task 8; Tre Mingo held for builder |

## Open questions

- Which event families come first, and at what rates and severities? — blocks Tasks 2, 4, 10; builder. (codex: "Exact event families, rates, severity and effect assignments remain builder calls.")
- Civic role: re-align in place, fold into civic-mode, or retire? — blocks Task 6; builder (N15).
- Mixed protected and ordinary households (N9) — blocks the household-path part of Task 3; builder.
- Does any new ENGINE entrant start protected, and which intake field certifies it? (N10) — blocks Task 8's exception; builder.
- Confirm the relayed amendment quote above is the builder's wording; Tre Mingo's flag (N20).

## Changelog

- 2026-10-08 (research-build) — Created: merges the rb read-before and codex's independent run into Agreed / Needs proof / New concepts with pointers; engine.284 folded in; builds on engine.67.
