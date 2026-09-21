---
title: Civic game loop — how the seats, initiatives and petitions work now
created: 2026-09-21
updated: 2026-09-21
type: reference
tags: [civic, architecture, active, draft]
sources:
  - docs/plans/2026-09-19-civic-wake-game-loop.md — the build plan; every claim below cites it or a file
  - Builder rulings 2026-09-20 / 2026-09-21 (recorded in that plan)
pointers:
  - "[[../plans/2026-09-19-civic-wake-game-loop]] — why, task list, rulings, Status log (the history; this doc is the current shape)"
  - "[[../plans/2026-09-20-housing-lever]] — housing lever design (engine.251)"
  - "[[../plans/2026-09-21-safety-lever]] — safety lever design"
  - "[[../research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives]] — design record"
  - "[[../index]] — registered same commit"
---

# Civic game loop

Working draft. It is being mapped while the system is rebuilt: each section says what is **live**, what is **built but inert**, and what is **not built**. When something ships, update its label here; the plan keeps the history. Section 7 is the open list.

## 1. What it is

Elected seats (the mayor, nine council districts, the police chief) each take one turn a week: they look at their board, their district's petitions and the working city, then make one **move** from a closed set. Moves are written to a ledger, folded every Sunday through the existing gate into the Initiative_Tracker, and the engine reads the result. Initiatives climb three stages on a losing clock. Complaints from citizens count as petitions. The point is that a seat's choice changes a persisted row and the next pack shows it the difference. Without that it is a vocabulary, not a game.

## 2. The weekly loop

| Step | What happens | Where | State |
|---|---|---|---|
| Wake (Mon–Thu 05:45) | Each seat on the rota gets a pack and answers with statements plus moves | `scripts/cron-civic-run.js --stage=datawake` | Wired in the working tree; first live run pending (not verified) |
| Move validated | Checked against the closed set, the seat's board, its district | `validateDatawakeMoves` | Wired |
| Move ledger | Append-only, one line per move | `output/cron-civic/moves/moves_c{XX}.jsonl` | Wired |
| Sunday directive | Aims a demand at the elected seats that need to answer | `runDirective` | Re-aimed, wired |
| Sunday fold | The week's moves become per-initiative tracker fields plus candidate rows, through the mechanical gate and clerk verdict | `runClose` → `applyTrackerUpdates.js` | Wired. The old Sunday chain is not expected to run clean during the rebuild (see §7) |
| Petition sweep | A proposal whose signatures clear its band gets its vote stamped | `petitionGateSweep` | Wired, **gates nothing**: no support band is set |
| Engine reads the row | The engine is the only voter and the only stage judge | `civicInitiativeEngine.js` | Partly built (§4) |
| Next pack | The seat sees what happened to its last move | `buildCivicOfficeSlice.js` `buildPack` | Wired |

The gate is the only path into Initiative_Tracker. The move ledger is separate from the old decisions envelope, which cannot accumulate a week.

## 3. The seats and their pack

- **Rota:** eleven seats, the mayor, nine council, the police chief. Project directors (four) moved to work-wake packs off the datawake. The DA, Okoro and the Baylight director are off the rota for now.
- **Moves:** `propose`, `work`, `answer`, `canvass`. One consequential move per wake, plus free speech. The police chief may `work`, `answer`, `canvass`, never `propose`.
- **`propose`** names an intervention from a closed catalog (`INTERVENTION_CATALOG` in `lib/initiativePhaseContract.js`). The catalog fixes the domain, the effect channel and the metric the initiative is judged on. A seat never picks its own success metric. A seat-proposed row is minted at `Stage = Proposed`, type `vote`.
- **The pack** carries: the seat's last move folded from the ledger; its board (rows it sponsors plus rows touching its districts; the mayor sees all) with what each needs next; the district's petition pool; the working city (latest reflection per chief or director, one each, character-capped); and the confrontation demand if the Sunday directive named the seat. Missing inputs degrade to a stated absence, never an invented board.
- **Recency:** complaint display covers the current cycle plus two before it; the petition counter reads the current cycle only.
- **Passed over:** a problem (district plus condition) still on the counter that the seat's moves did not touch that week. Derived each week, no stored state.
- **Answer:** binds to the directive's cycle and the named seat, once per directive. No consequence in this build; an unanswered demand reappears.

## 4. Initiatives: stages and the losing clock

Vocabulary: `Proposed → Funded → Standing → Delivering`. A blank `Stage` means a legacy row the stage model never reads.

| Stage | Clears when | State |
|---|---|---|
| Proposed | Signatures clear the band and the engine votes it through | Petition sweep wired; no band set, so nothing clears |
| Funded | The vote passes | Existing machinery |
| Standing | A `work` move has landed on the row at or after the funding cycle (`LastWorkCycle >= LastStageChangeCycle`) | Stage columns, catalog mirror and shared helper **live on PROD, inert**: every Stage is blank |
| Delivering | The domain's metric beats the city median by 0.20 for 3 straight cycles (`civicDeliverMargin`, `civicDeliverHoldCycles`, live World_Config keys) | **Not built** |

- **One clock per stage, not per lifetime.** A stage unchanged for 5 cycles (`civicStageStallCycles`) sets the row to `stalled`; the existing `failed` motion then costs its owners −2 a cycle. Work never resets a running clock, only a stage change does. A `work` move revives a stalled row once per stall, with no `advanced` credit. Clock step: **not built**.
- **No clock on Proposed** for now (builder, 2026-09-21).
- **No clock on a stage whose exit is unbuilt.** Safety and housing initiatives cannot reach Delivering yet, so they run no clock there.
- **A stalled initiative** also drains its neighborhoods' businesses at half weight (`bizInitiativeStallDrag 0.5`), live on PROD.
- **The sponsor owns its bill.** Approval effects follow the row's sponsor, not its faction. A revival from a failing phase counts as sitting, not advancing. Live on PROD.
- **Delivering is judged against the city's own middle, held.** Retail across the whole city fell from 10.0 to 6.4 in five cycles, so a raw rise from baseline would be a coin flip. Baselines are stamped at conversion or vote, never rebased.
- **Measured on the bench (2026-09-21):** a clinic lowers a hood's sick count (Laurel 111 to 95 against a control that rose to 116) but plateaus at about 0.18-0.19 against the city median, so the delivered margin is per metric (health 0.15, default 0.20). Economic, workforce and sports programs cannot move retail distinguishably from noise, so those domains are not playable until they have a real lever. A delivered service erodes without upkeep (grace 6 cycles, 0.15 per cycle, floor 0.3) and directors' work counts as tending. See the plan's rulings after the matched-control measurement.
- **Upkeep (built 2026-09-21, bench pending):** a row at Standing or Delivering pays its phase strength times a tend factor — full for `civicTendGraceCycles` (6) after its last work move or stage change, then down `civicTendDecayPerCycle` (0.15) a cycle to `civicTendFloor` (0.3); one work move restores it. Clinics, hood effects and the station lift all read it (an open hub fades from +20% riders toward +6%, never below an ordinary station). A blank Stage, a stalled row and a construction site are untouched. Directors' shifts do not stamp `LastWorkCycle` yet (scripts side) — do not convert the six live rows before they do.
- **Effect buses:** both hood effect buses now work (engine.250, PROD). Education and business effects can reach the world.

## 5. Petitions

`scripts/civicPetitions.js` is a deterministic counter with no model in it. It reads Household_Ledger, Hospital_Ledger and Neighborhood_Demographics from the local beats files. Housing hardship is annualized rent burden (`MonthlyRent * 12 / HouseholdIncome`, band 0.30). Zero or missing income is a separate counter. Civic-tagged reflections with a negative mood are the "people are talking" signal and never count as signatures. The tracked ledger is a sample (§15), never the denominator for a claim about the whole city.

**Housing and safety print counts but gate nothing** until their engine levers exist.

## 6. Where the world actually moves

A deploy reaches the world only in some domains today: health (neighborhood `Sick`), transit (Transit_Metrics), and every domain's neighborhood texture through the fold. Education and business drift are live since engine.250. **Housing and safety have no lever.** Housing (106 of 392 rented households over the 0.30 band) is first: a tenant rent discount, designed, filed as engine.251, blocked behind the stage work. Safety is second, and its design found that the proposed lever alone can improve a neighborhood's crime ratio by only about 0.12 against the ruled 0.20 margin.

## 7. What is still to be determined

**Builder calls open**
- **Sunday city-hall realignment** (direction 2026-09-21: works over feels; mechanical close first with no models; terse decisions; heading to batch with a ~24h window, so an idempotent stage machine that advances when inputs exist, not one clock-timed chain). Plan: [[../plans/2026-09-21-civic-sunday-stage-machine]]. The old Sunday chain must be redesigned to the new loop's purpose (fold moves, sweep petitions, stamp votes) with a cadence that fits it, not forced into the current shape or slot. Crontab untouched until the builder installs the new schedule.
- **Petition support bands.** No band is set, so no petition gates a vote.
- **Safety endpoint versus the 0.20 margin.** A larger lever, a lower margin for safety, or another mechanism.
- **Fruitvale transit hub (INIT-003)** has never had a vote: enter as petition-pending, or grandfather a stage?
- **DA / Okoro / Baylight seats** after the rota split: work-wake packs or a datawake slot. Default deferred.
- **Coalitions** (support, opposition, kept or broken deals) — wanted, the hearing must be able to matter. Not in this build; next design, structured and terse. Today hearing dialogue changes no vote.
- **Losing clock length** stays 5, tunable live.

**Engineering not yet built**
- Stage handler in three benched cuts, then conversion of the six live rows. Until conversion, nothing on live changes.
- Delivering judgement and the stall clock (Task 4 steps 3–5).
- Housing lever (engine.251), safety lever.
- The matched-control bench pair that shows a real initiative can reach the 0.20 margin.
- First live fire on PROD @109 unblocks `LastWorkCycle` / `LastWorkSeat` writes.

**Known to be broken or stale**
- The old Sunday chain halted on C108 (two council voices returned incomplete JSON). Expected during the rebuild.
- Chaos-car data for the 21 dark seats, player named-trigger wakes and ladder legibility blocks are outside this build (plan §Out of scope).

## 8. Who owns what

Scripts side (kimi's files, codex holding them while kimi is out until tomorrow night): `cron-civic-run.js`, `buildCivicOfficeSlice.js`, `applyTrackerUpdates.js`, `validateTrackerUpdates.js`, `cron-civic-gate.js`, `cron-work-wake.js`, `work-wake-packages.json`. Petition counter: `civicPetitions.js`. Tests: `cron-civic-game.test.js` (antigravity). Engine side (engine-sheet): `civicInitiativeEngine.js`, `initiativePhaseContract.js`, `updateCivicApprovalRatings.js`, `applyCityDynamics.js`. Sequencing and rulings: research-build. Everything is dry-run until the builder installs schedules; the crontab is his.
