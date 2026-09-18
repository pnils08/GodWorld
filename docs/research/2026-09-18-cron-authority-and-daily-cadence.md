---
title: Cron authority and the daily cadence — design record
created: 2026-09-18
updated: 2026-09-18
type: reference
tags: [research, engine, crons, civic, events, active]
sources:
  - Mike-direct 2026-09-18 (S467 engine-sheet) — the ask, the doctrine correction, the three loops
  - phase02-world-state/loadEventContentLedger.js — ECL loader + conditions DSL vocabulary
  - phase05-citizens/generateCitizensEvents.js:2685 — media event injection site
  - phase05-citizens/citizenContextBuilder.js:212,623 — Citizen_Media_Usage read (by NAME)
  - phase02-world-state/applyInitiativeImplementationEffects.js — initiative -> hood/ripple/sentiment
  - scripts/applyTrackerUpdates.js — the five columns the civic cron actually writes
  - scripts/drainReflectionBacklog.js — Reflection_Intake -> DialState.base drain contract
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home; no rows filed from this doc yet"
  - "[[index]] — registered same commit"
  - "[[../SIM_DOCTRINE]] §15 (a gate that can't fire), §16 (drift)"
---

# Cron authority and the daily cadence

**Status: open design record. Mike is filling sections marked OPEN. Nothing here is
filed as work yet.**

The question: with the engine firing roughly once a week, what can the crons do
between fires that the world actually honors — not narrate, but change.

---

## 1. Doctrine correction (Mike-direct 2026-09-18)

**The citizens, nodes and agents are the world.** Sports, civic and media are
*for* the citizens, and are themselves citizens. They are subsystems serving the
population, not competing tiers of importance.

This supersedes the standing "sports IS the world; civic is background color and
should get barely any build attention" line, which Mike calls an overreaction.
Civic is not background — it is one of three cron-run subsystems that feed
citizen events. The reason civic *felt* like background is the mechanical one in
§3: the civic cron writes the bookkeeping columns and never the ones with teeth.

## 2. The three loops, as Mike describes them

1. **Civic** — crons propose, vote and roll out initiatives. Each tracker row
   affects hoods, citizens and approval. A positive one ripples outward.
   Media coverage of that is part of the civic system, also cron-run.
2. **Sports** — Mike runs the games. That draws coverage, and coverage drives
   citizen events.
3. **Media** — the desks cover the world; citizen media usage drives their events.

In all three, the crons push citizen dials on a cadence that does not require
firing a cycle. UNDOCKED is the reference not as a literal template but as the
existing proof that something outside the engine can run daily and land.

## 3. What is actually wired (verified 2026-09-18)

The engine already reads four tabs that a cron can write. This is the whole
authority surface today.

| Channel | Live size | Engine reader | What it does |
|---|---|---|---|
| `Event_Content_Ledger` | 336 content rows | `loadEventContentLedger.js` (phase 2) -> `generateCitizensEvents.js` (phase 5) | Condition-gated content pool; rows become citizen event lines |
| `Undocked_Feed` | 27 event rows | same two phases | Sets the `undocked` (citywide) and `undockedpilot` (per-citizen) condition flags |
| `Reflection_Intake` | appended 3x daily by wakes | phase-9 drain inside `compressLifeHistory_` | Accretes a bounded fraction into permanent `DialState.base` |
| `Initiative_Tracker` | 6 live initiatives | 6+ engine files incl. `applyInitiativeImplementationEffects.js`, `civicInitiativeEngine.js`, `updateCivicApprovalRatings.js`, `applySportsSeason.js` | Implementation phase drives ongoing hood safety/economic/sports effects, Ripple_Ledger rows, sentiment fold |

**Crons feed exactly one of these with events: UNDOCKED.** Everything else
observes and narrates.

### 3.1 The seam all three loops fail at

There is no general way for a cron to say *this thing happened to this citizen.*
The only per-citizen targeting that exists is the `undockedpilot` flag, built for
one show.

Concretely, verified:

- **Media.** `getMediaInfluencedEvent_(ctx)` at `generateCitizensEvents.js:2685`
  takes the cycle context only — no citizen argument — and fires at a flat 20%
  chance citywide. `Citizen_Media_Usage` *is* read, but into the narrative
  profile in `citizenContextBuilder.js`, and matched **by name, not POPID**.
  So a citizen who was actually quoted in an article gets no event *because* she
  was quoted. The coverage does not reach her.
- **Civic.** `applyTrackerUpdates.js` writes five columns:
  `ImplementationPhase`, `MilestoneNotes`, `NextScheduledAction`,
  `NextActionCycle`, `LastUpdated`. The tracker already carries `Proposer`,
  `ProposingOffice`, `ProposedCycle`, `VoteRequirement`, `VoteCycle`, `Outcome`,
  `LeadFaction`, `OppositionFaction`, `SwingVoter`, `SwingVoter2`,
  `SwingVoter2Lean`. **The propose-and-vote schema was built and never wired.**
  The cron grinds mechanics because mechanics is the only surface it was given.
- **Sports.** Coverage reaches citizens only through the `source:sports` content
  pool, the same citywide draw. Same seam.

### 3.2 The conditions vocabulary

ECL rows gate on a locked DSL (`loadEventContentLedger.js:64`), fail-closed on
any unknown term. Available today: `wealth`, `children`, `displacement`,
`married`, `retired`, `ageband`, `hood`, `season`, `lifestate`, `band`,
`occupation`, `tier`, `heritage`, `fame`, `culdomain`, `age`, `hoodtrend`,
`momentum`, `undocked`, `undockedpilot`, `warmth`, `drive`.

A cron can author rows against any of these **with zero engine change today.**
A new field costs one resolver entry plus one scope assignment — the cut that
shipped twice already (engine.67 lifestate/band, research.27 undocked).

## 4. Ranked gaps

1. **Per-citizen event targeting.** The general version of `undockedpilot`: a
   POPID-keyed feed tab a cron writes, becoming a personal condition flag, with
   ECL rows gated on it. Closes the media seam, the sports seam and the
   "183 citizens with nothing happening" defect in one mechanism. Highest
   leverage; smallest engine cut.
2. **Civic propose and vote.** Wire the columns that exist. Doctrine constraint
   that keeps it honest: a proposal is born from a broken number, and the civic
   cron already classifies exactly those ailments (`math-imbalance`,
   `stuck-initiative`, `repeating-event`, `coverage-gap`, `cascade-failure`,
   `ledger-completeness` — `cron-civic-run.js:307`). Factions and swing voters
   resolve the vote on the cycle the column names.
3. **Wakes as a decision source.** The only wake->engine path today is a
   reflection nudging dials, which is texture moving dials and is ruled out.
   More impact means a wake ends in a decision that emits an event. Bond
   discovery from wakes measured **zero real yield** — citizens only name people
   the prompt handed them (`extractBondsFromWakes.js` header). Confirmed by
   Mike: the bond build was not working.

## 5. Constraints

- **Every cron-emitted event needs a gate.** UNDOCKED's shape: contract
  validation, auto-approve on pass, park invalid for review, fail loud. A cron
  writing engine-consumed rows ungated is this seat abdicating.
- **Cadence honesty.** Crons accumulate causal input across the week and react to
  each other daily; ledger state still resolves at the fire. Daily *visible*
  world movement is a separate cadence decision, not something this design
  delivers on its own.
- **Borrowed mechanics filter.** A concept taken from another game must land in
  one of the four channels in §3 or it is a new system. Sims-style wants fit
  (declare in a wake, a later cron checks delivery, outcome emits an event).
  Anything needing state the sheets do not hold does not.

## 6. OPEN — Mike's sections

*Mike fills these; engine-sheet reviews for what is missing and what the
mechanism can actually carry.*

- **OPEN: civic voting** — who votes, how often, what a proposal costs, what
  happens when one fails.
- **OPEN: the daily activity** — what the non-UNDOCKED daily thing is, and what
  it produces that the engine can honor.
- **OPEN: borrowed concepts** — which games, which mechanics.
- **OPEN: cadence** — whether the world should visibly move daily, and what that
  means for the weekly fire.

## Changelog

- 2026-09-18 — created from the Mike-direct design conversation; §1-5 verified
  against live code and sheets, §6 left open for Mike.
