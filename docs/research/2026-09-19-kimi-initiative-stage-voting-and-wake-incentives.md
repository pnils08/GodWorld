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

### Mike's direction — second pass, 2026-09-19 (research-build session, as said)

"Districts and the mayor using the initiative tracker to get initiatives on there to be voted on, start making real decisions in the sim, trying to better their hoods and citizens' lives to increase their approval ratings and push their usage, fame, etc. Moving to a 3 stage gate to implement the initiative rather than the time based concept and the admin tracking system. Maybe they need citizens to sign a petition or vote to get the initiative on the tracker, then the votes could happen." He asked for Claude's take beside kimi's on each item, so both reads stay visible. The takes below are headed **Mags take**; they add to kimi's text and do not replace it.

## 3. Initiative_Tracker as the civic game board

**Current mechanics (verified 2026-09-16/19):** `ImplementationPhase` has a shared contract (`lib/initiativePhaseContract.js`); advancement is **time-gated** via `NextActionCycle` scheduling in `phase05-citizens/civicInitiativeEngine.js`, written offline by `scripts/applyTrackerUpdates.js` from the Sunday chain; ongoing benefits are already applied per-phase by `phase02-world-state/applyInitiativeImplementationEffects.js`. Stuck initiatives raise must-decide demands (`scripts/civicMustDecide.js`).

**Target mechanics (builder vision):** the vote is the entry fee, not the finish line. After a vote passes, the initiative must **clear N stages** (nominal 3 — e.g. funding secured → implementation stood up → benefit delivered) and **time is not the gate** — each stage clears when the required civic work happens: a datawake action, a hearing commitment, a seat persuaded, a budget line defended. On final clearance the initiative is **implemented** and pushes the relief/benefit it promises into the world state (phase02 already knows how to apply phase effects). **Decay model is open** — candidate shapes: benefit decays per cycle without milestone maintenance; decay tied to sponsor approval; decay only on adverse chaos/engine events. Decide when the first conversion is specced.

### Mags take — what the board is today (measured 2026-09-19)

- **Six rows, all six authored by the mayor** (`Proposer` Avery Santana, MAYOR-01). No district seat has ever put an initiative on the board. `createInitiative_` exists (phase05-citizens/civicInitiativeEngine.js:2740) but is unwired: civic.22 is blocked by S406 ruling 1, "initiatives stay hand-fed until city-hall seats work a full week autonomously."
- **Every row is long past its start and none has finished.** Five passed council votes between C78 and C94; the sixth, the apprenticeship program, was announced at C73 with no vote. At C107 all six are still in an implementation phase, 13 to 34 cycles on. None has ever reached `complete`; the approval code says the same (updateCivicApprovalRatings.js, engine.139 note). That breaks the 2026-08-27 rule that an initiative must resolve in about 4–5 cycles or the crons never see it.
- **The admin layer is self-renewing.** Each week a civic project agent writes a milestone ("MEP rough-ins completed", "design RFP published") and sets NextActionCycle one cycle out, and applyTrackerUpdates.js writes it to the sheet. At C107 all six rows read NextActionCycle = 108, so the clock never runs out. It sits on 20 canonical phases (lib/initiativePhaseContract.js) and a 5–7 step lifecycle per Type.
- **What the effects actually move:** PHASE_INTENSITY × DOMAIN_EFFECTS (applyInitiativeImplementationEffects.js:179, :207).
  - health → hood illness (engine.132), but only in delivering phases.
  - transit → stations and corridors (engine.183).
  - Every other domain moves only mood scalars: sentiment, engagement, retail, nightlife, traffic.
  - OARI (safety) has been at full intensity since C82 and never touches Crime_Metrics.
  - The Stabilization Fund (economic) has been disbursing since C78 and never touches income, jobs or businesses.
  - The Temescal health center, the answer to the C34 crisis, is `construction-active`, so it publishes no illness relief at all.
- **Approval is already built for this game.** engine.139: a phase transition pays once, completion pays once, and sitting or silence drains every cycle. A seat under 40 draws a challenger from the ledger; under 20 it loses the chair. engine.213: approval reads the district against the city's middle.

### Mags take — the three-stage gate

- **Agree.** Twenty phases of paperwork, written by the same agent that is scored on them, is why every row always "advanced" and nothing ever finished.
- **Name each stage by what is true in the world, not by what was filed:**
  1. **Funded** — the vote passed and the mayor signed, or the council overrode a veto. Clears on the vote.
  2. **Standing** — the thing exists: staff hired, doors open, the program enrolling. Clears on a civic action the engine can see (see §4 take).
  3. **Delivering** — the promise reaches its target number in the affected hoods. Clears when that number moves the right way from where it stood at the vote.
- **Stage 3 is where the repair lands, so each PolicyDomain needs a target metric:**
  - safety → Crime_Metrics
  - economic → hood income, jobs and businesses
  - housing → rent burden
  - health → illness (engine.132 has it)
  - transit → ridership (engine.183 has it)
  - education → the school columns engine.192 now drifts

  Without that wire, three stages are admin tracking with fewer boxes — the same nothing, finished faster.
- **"Not time-based" still needs a losing clock.** Stages clear on work, never on the calendar. But a stage that hasn't cleared within N cycles drops to `stalled`, which costs its owner — engine.139 charges a failed phase less than silence, but it still costs. The calendar stops being how you win and becomes how you lose. That keeps the 4–5-cycle rule, and it runs both ways (SIM_DOCTRINE §15).
- **Approval needs no redesign.** Three stage clears plus completion are four payable events, and the drain for sitting stays. That is Mike's game: you raise your number by moving your hood.

### Mags take — petition to get on the board (Mike's addition, not in kimi's draft)

- **The raw material already exists.** Citizen wakes tag reflections `Civic` and record the question the citizen is asking. There were 70 Civic-tagged reflections between C100 and C107 (28 at C103), for example:
  - "Why isn't the council taking real action on the civic gap?"
  - "How is the West Oakland Stabilization Fund being tracked and distributed?"
  - "How can I ensure Downtown and East Oakland adopt the West Oakland model?"

  They are petitions in all but name, and nothing reads them that way today.
- **The engine counts the signatures; no LLM declares them.** A seat files a proposal naming a hood problem. Signatures come from:
  - citizens in the affected hoods whose own condition matches the problem — rent-burdened households for housing, the sick for health, recent victims for safety;
  - Civic-tagged wake reflections that name the same problem.

  The proposal goes on the board as `vote-scheduled` when signatures clear a band set against the hood's population (§15). The tracked ledger is a sample, never the denominator.
- **My lean: the seat proposes and citizens sign.** That gives the seat a turn and a risk — a proposal that can't gather signatures is public and costs it. Adopting a problem citizens already raised could count as "listening" and pay a little approval.
- **This reopens civic.22 and civic.19.** S406 said hand-fed until the seats work a full week on their own. That condition now reads as met: Mon–Thu datawakes run at 05:45 on crontab, the Sunday chain runs with `--apply`, and all six rows carry C107 milestones. Mike's direction tonight becomes the new ruling if he confirms it (question 1 below).

## 4. Wake-as-turn for civic seats

The seat's weekly game, as the pack should present it:

- **My district this week** — beats deltas for my turf (crime, hospital, household, weather).
- **My board** — my initiatives and their stage status; what each needs to clear next.
- **The table** — which seats I need for the next stage; where they stand (faction, approval, last votes).
- **The working city** — what the chiefs/directors woke to (work-wake reflections are the operational read a councilmember would actually get).
- **Stakes** — my Approval (`Civic_Office_Ledger`), already coupled to initiative outcomes by `phase05-citizens/updateCivicApprovalRatings.js`; the recall/challenger machinery (rollout civic.33) is the stick for seats that coast.

Sunday city hall is where turns cash out: the hearing is the table, the vote is the dice everyone loaded all week.

### Mags take — civic turns

- **Agree with the pack; one prerequisite is missing here.** The Mon–Thu datawakes reach no sheet (engine.213, open). A turn only counts if the engine can see what the seat did. Stage 2 and filing a petition both need the seat's weekday action persisted through the gated Sunday apply. Otherwise "cleared by civic work" is an LLM saying it did something.
- **The Sunday vote stays the dice.** Factions, swing voters and approval thresholds already decide votes deterministically (civicInitiativeEngine). The seat's week loads the dice; it never writes the outcome.
- **Fame and usage already have a channel.** A stage clear can emit a CIVIC hook naming the sponsor; engine.232 routes it to a civic writer, and coverage feeds fame and media usage. The channel is built; what's missing is stage events to feed it.
- **Nine new players.** Today the mayor holds all six rows. With districts authoring, each council seat gets its own game; the mayor's levers become the signature or veto, plus city-wide proposals.

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

### Mags take — dark seats

- **Agree; it's cheap.** Matching chaos-car vehicle types to seats is good data work. It belongs in the work-wake registry (civic.37), not the initiative game. These are staff, not elected officials: their turn is operational, and the stakes that ride on it are the elected seats' approval.

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

## 9. Mags — sim questions for Mike (2026-09-19)

1. **Does tonight's direction replace the S406 "initiatives stay hand-fed" ruling?** Six of six rows are the mayor's; `createInitiative_` is built but unwired.
2. **Who can file?** All nine districts plus the mayor anywhere, or districts only for their own hoods and the mayor city-wide?
3. **Petition order and bar.** Do citizens raise a problem and a seat adopts it, or does the seat propose and citizens sign? What share of the affected hood's people makes the bar?
4. **The losing clock.** How many cycles may a stage sit before it stalls? Doctrine puts the whole initiative at about 4–5 cycles, which works out to 1–2 cycles per stage.
5. **When does the benefit arrive?** Only at stage 3, or partly at stage 2 — a clinic that's open but hasn't moved illness yet?
6. **The six live rows.** Convert them into stages (OARI would sit at stage 2 and need Crime_Metrics to move to clear stage 3), or let them finish under the old rules?
7. **Does clearing a stage make the news, or only finishing?**

## Rollout row (proposed — for the accepting Claude seat to file)

```text
| civic.38 | Wake-as-turn game loop — initiative stage-clearing (no time gates), civic pack incentive layer, chaos-car nodes for the 19 dark seats, player named-trigger | needs-info | engine-sheet / research-build | [[../research/2026-09-19-initiative-stage-voting-and-wake-incentives]] |
```

(Research files never archive; if the row should point at a plan instead, the first spawned plan inherits the pointer.)

## Changelog

- 2026-09-19 (kimi) — Initial draft. Builder approved filing in-session; game-loop extension to all wakes (bonds/marriage/kids/house/Heritage_Ledger/media/career) added same day, same approval.
- 2026-09-19 (research-build, S467) — Mike's second-pass direction captured above §3; Mags takes added under §3 (board state, three-stage gate, petition), §4 and §5; sim questions in §9. Kimi's text unchanged.

## Review — research-build, 2026-09-19 (S467)

Accepted as the design baseline (builder-direct). The proposed row ID `civic.35` is already taken (archived S433), so this is filed as **civic.38**, needs-info. Each piece ignites its own plan when sequenced.
