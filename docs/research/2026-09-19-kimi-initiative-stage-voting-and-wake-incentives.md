---
title: Initiative stage-clearing + wake-as-turn — the wake game loop (design record)
created: 2026-09-19
updated: 2026-09-19
type: reference
tags: [research, civic, citizens, sports, design, active]
sources:
  - Mike-direct 2026-09-19 (kimi session) — initiative voting vision + "wake as a rare opportunity to play the game"
  - SESSION_CONTEXT.md NEXT[kimi] (Mike, 2026-09-16) — work-wake packs assignment
  - docs/plans/2026-09-16-work-wake-packs.md — civic.37, the shipped chassis this design rides
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (proposed row civic.35, text below)"
  - "[[index]] — register on acceptance"
  - "[[2026-08-07-cron-lifecycle-review]] — the cron/wake lifecycle record this extends"
  - "[[../plans/2026-09-11-sports-as-a-lived-system]] — sibling design record (sports)"
---

# Initiative stage-clearing + wake-as-turn — the wake game loop

**Source:** Mike direction in the civic.37 review conversation, 2026-09-19: wakes should not be taken for granted — "the engine rolls the dice; if you wake as a cron you are getting a rare opportunity to play the game and make use of it." Long-run the game applies to **all** wakes: bonds, marriage, kids, a house, the Heritage_Ledger, media usage, career advancement.

**What this addresses:** Today every wake path (citizen loop, civic datawake, work-wake, newsroom) hands a persona perception and collects output — reflection, statement, article. Nothing is at stake and nothing can be won. This record captures the target shape: the wake as a **turn** in a game with goals, opponents, and consequences, and the Initiative_Tracker as the civic scoreboard that turn plays on.

---

## 1. The core loop (builder-direct, canonized here)

1. The **engine rolls the dice** — cycles, chaos cars, health events, game results. World state is deterministic substrate; the LLM never writes it directly.
2. A **wake is a rare turn**. Rotation memory and duty days make waking scarce; scarcity is a feature — a turn you might not get again for weeks.
3. The woken persona gets a **pack: its legible slice of the game state** — what moved, what it can affect, who it needs.
4. What the persona does with the turn **compounds**: bonds form, initiatives advance, approval moves, careers rise. Personas that "figure out the game" pull ahead; personas that sleepwalk drift.
5. Consequences land through **existing gated channels only** (Reflection_Intake → gated cycle read; position walls; the Sunday chain) — never prose-to-canon.

## 2. Life ladders (all-wakes end-state)

The ladders the builder named, mapped to substrate that exists today:

- **bonds → marriage → kids → house** — bond graph (`extractBondsFromWakes.js`, ripple register), Household_Ledger, family columns in the ledger
- **Heritage_Ledger** — exists (engine maps, `phase05-citizens/educationCareerEngine.js`); the legacy/win-condition surface
- **media usage** — NAMES INDEX appearances, edition slice, PlayerMood/MediaProfile on the sports feed
- **career advancement** — Employment_Roster, Civic_Office_Ledger approval, roster Tier for athletes

A wake becomes legible as a turn when its pack answers: *where am I on my ladders, what moved since my last turn, and what can I push right now?*

## 3. Initiative_Tracker as the civic game board

**Current mechanics (verified 2026-09-16/19):** `ImplementationPhase` has a shared contract (`lib/initiativePhaseContract.js`); advancement is **time-gated** via `NextActionCycle` scheduling in `phase05-citizens/civicInitiativeEngine.js`, written offline by `scripts/applyTrackerUpdates.js` from the Sunday chain; ongoing benefits are already applied per-phase by `phase02-world-state/applyInitiativeImplementationEffects.js`. Stuck initiatives raise must-decide demands (`scripts/civicMustDecide.js`).

**Target mechanics (builder vision):** the vote is the entry fee, not the finish line. After a vote passes, the initiative must **clear N stages** (nominal 3 — e.g. funding secured → implementation stood up → benefit delivered) and **time is not the gate** — each stage clears when the required civic work happens: a datawake action, a hearing commitment, a seat persuaded, a budget line defended. On final clearance the initiative is **implemented** and pushes the relief/benefit it promises into the world state (phase02 already knows how to apply phase effects). **Decay model is open** — candidate shapes: benefit decays per cycle without milestone maintenance; decay tied to sponsor approval; decay only on adverse chaos/engine events. Decide when the first conversion is specced.

## 4. Wake-as-turn for civic seats

The seat's weekly game, as the pack should present it:

- **My district this week** — beats deltas for my turf (crime, hospital, household, weather).
- **My board** — my initiatives and their stage status; what each needs to clear next.
- **The table** — which seats I need for the next stage; where they stand (faction, approval, last votes).
- **The working city** — what the chiefs/directors woke to (work-wake reflections are the operational read a councilmember would actually get).
- **Stakes** — my Approval (`Civic_Office_Ledger`), already coupled to initiative outcomes by `phase05-citizens/updateCivicApprovalRatings.js`; the recall/challenger machinery (rollout civic.33) is the stick for seats that coast.

Sunday city hall is where turns cash out: the hearing is the table, the vote is the dice everyone loaded all week.

## 5. The 19 dark seats — chaos-car node map

`Chaos_Cars` (83 live rows, frequency-capped per engine.11, plan `docs/plans/2026-05-07-chaos-cars-engine.md`) carries `VehicleType, TargetScope, TargetId, DiceOutcome, PrimaryMetric, MetricMagnitude` per event. Vehicle types live in the last 60 rows: `fire_engine, ambulance, cop_car, mail_truck, garbage_truck, street_sweeper, pge_truck, building_inspector, oari_van, ice_cream_truck`. Vehicle→seat joins (each = one `dataNodes` entry in the work-wake registry + a builder-approved pack):

| Vehicle(s) | Seat |
|---|---|
| fire_engine | CHIEF-FIRE (Hollowell, POP-00140) — closes the "no fire data" gap |
| ambulance | EMS-DIR (already waking on hospital; gains street-level events) |
| cop_car | (chief stays datawake) — IAD-LEAD / DCOP seats |
| garbage_truck, street_sweeper, pge_truck | public-works-flavored staff seats |
| building_inspector | PLANNING-DIR (Vance) |
| mail_truck | texture node, no obvious seat — hold |

A `chaos-cars` node builder in `cron-work-wake.js` (filter by VehicleType + current cycle) is the only new code; the registry does the rest.

## 6. Player named-trigger pilot (next week)

Upgrade the work-wake sports node from registry-listed players to **event-triggered**: wake any rostered player whose name appears in `Oakland_Sports_Feed.NamesUsed` at the current cycle (the posture-slot pattern, `scripts/citizen-wake.js:189`), with the pack joining their **season stat line from `As_Roster`** (POPID-keyed true source; name→POPID join already exists in `dashboard/sportsRoutes.js` `resolveNames`). You get named → you get a turn. Stars and debutants both surface; the feed decides who plays.

## 7. Extraction — what's usable

- wake-as-turn framing → every wake registry (citizen, work, civic, newsroom) gains "what can I push right now" in its pack contract
- stage-clearing initiatives → civic.14 tracker contract + engine phase05/phase02 seam; removes time as the phantom difficulty
- chaos-car vehicle map → the 19 dark seats get work data without new engine tabs
- named-trigger → sports wakes scale with the roster instead of the registry
- ladder legibility → pack builders add "where am I" blocks (bonds, household, approval, tier) as the game matures

## 8. Not applicable / hazards

- **Determinism:** the engine rolls the dice, the LLM plays the hand. Wake output must keep flowing only through gated channels (Reflection_Intake `applied=no`, position walls, the Sunday chain's gated apply). A wake that writes world state directly breaks the sim. Non-negotiable.
- **Cost:** every wake is model spend; expanding packs × seats × cadence needs the OpenRouter budget in the room (the 2026-09-15 cap outage already showed the blast radius).
- **Fairness/rarity:** do not over-schedule. A turn every fire is a feed, not a game — the scarcity is the mechanic.
- **Phase-1 gate:** dial write-back stays with the gated cycle read regardless of how game-like wakes become.

**Verdict:** adopt (builder-direct). This record is the design baseline; each piece ignites its own plan (tracker conversion, civic pack upgrade, dark-seat onboarding, player trigger, ladder blocks).

## Rollout row (proposed — for the accepting Claude seat to file)

```text
| civic.38 | Wake-as-turn game loop — initiative stage-clearing (no time gates), civic pack incentive layer, chaos-car nodes for the 19 dark seats, player named-trigger | needs-info | engine-sheet / research-build | [[../research/2026-09-19-initiative-stage-voting-and-wake-incentives]] |
```

(Research files never archive; if the row should point at a plan instead, the first spawned plan inherits the pointer.)

## Changelog

- 2026-09-19 (kimi) — Initial draft. Builder approved filing in-session; game-loop extension to all wakes (bonds/marriage/kids/house/Heritage_Ledger/media/career) added same day, same approval.

## Review — research-build, 2026-09-19 (S467)

Accepted as the design baseline (builder-direct). The proposed row ID `civic.35` is already taken (archived S433), so this is filed as **civic.38**, needs-info. Each piece ignites its own plan when sequenced.
