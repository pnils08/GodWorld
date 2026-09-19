---
title: Cron authority and the daily cadence — design record
created: 2026-09-18
updated: 2026-09-18
type: reference
tags: [research, engine, crons, civic, events, active]
sources:
  - Mike-direct 2026-09-18 (S467 engine-sheet) — the ask, the doctrine correction, the three loops
  - Live query of Event_Content_Ledger, Undocked_Feed, Initiative_Tracker, Simulation_Ledger
  - phase05-citizens/generateCitizensEvents.js:2685 — media event injection site
  - phase02-world-state/loadEventContentLedger.js:64 — conditions DSL vocabulary
  - utilities/citizenDialMap.js, utilities/citizenMemory.js, utilities/compressLifeHistory.js — the two folds
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home; no rows filed from this doc"
  - "[[index]] — registered"
---

# Cron authority and the daily cadence

**Open design record. §7 is Mike's to fill. Nothing filed as work.**

**Scope warning, written by the author.** An earlier draft of this file carried
three claims reasoned from module header comments rather than from running the
code. All three were wrong and have been cut. **Everything remaining was verified
by executing a function or querying a live tab, and each claim names how.** If a
future session extends this file, hold the same bar — and prefer the
`engine-wiring` subagent over hand-grepping, which is what should have happened
here.

---

## 1. Doctrine correction (Mike-direct 2026-09-18)

> "The citizens/nodes/agents are the world. The sports, civic, media are for the
> citizens and themselves are citizens."

Sports, civic and media are subsystems serving the population, not competing
tiers. Mike calls "sports IS the world, civic is background" an overreaction.

## 2. The three loops, as Mike describes them

1. **Civic** — crons propose, vote and roll out initiatives. Each tracker row
   affects hoods, citizens and approval; a positive one ripples outward. The
   media coverage of that is part of the civic system, also cron-run.
2. **Sports** — Mike runs the games; that draws coverage, and coverage drives
   citizen events.
3. **Media** — the desks cover the world; citizen media usage drives their events.

All three push citizen dials on a cadence that does not require firing a cycle.
UNDOCKED is the reference only as proof that something outside the engine can run
daily and land.

## 3. What is actually wired

Four tabs a cron can write that the engine reads. Sizes are live reads, 2026-09-18.

| Channel | Live size | Engine reader | What it does |
|---|---|---|---|
| `Event_Content_Ledger` | 336 content rows | `loadEventContentLedger.js` (phase 2) → `generateCitizensEvents.js` (phase 5) | Condition-gated content pool; rows become citizen event lines |
| `Undocked_Feed` | 27 event rows | same two phases | Sets the `undocked` (citywide) and `undockedpilot` (per-citizen) condition flags |
| `Reflection_Intake` | appended 3x daily by wakes | phase-9 drain in `compressLifeHistory_` | Accretes a bounded fraction into permanent `DialState.base` |
| `Initiative_Tracker` | 6 live initiatives | 6+ engine files incl. `applyInitiativeImplementationEffects.js`, `civicInitiativeEngine.js`, `updateCivicApprovalRatings.js` | Implementation phase drives ongoing hood effects, ripple rows, sentiment fold |

**Crons feed exactly one of these with events: UNDOCKED.** Everything else
observes and narrates.

### 3.1 The seam all three loops share

No general way for a cron to say *this happened to this citizen*. The only
per-citizen targeting that exists is the `undockedpilot` flag, built for one show.

- **Media.** `getMediaInfluencedEvent_(ctx)` at `generateCitizensEvents.js:2685`
  takes the cycle context only, no citizen, and fires at a flat 0.2 chance
  citywide. `Citizen_Media_Usage` is read into the narrative profile at
  `citizenContextBuilder.js:212` **by name, not POPID**. A citizen quoted in an
  article gets no event from having been quoted.
- **Civic.** `applyTrackerUpdates.js` writes five columns: `ImplementationPhase`,
  `MilestoneNotes`, `NextScheduledAction`, `NextActionCycle`, `LastUpdated`. The
  live tab header also carries `Proposer`, `ProposingOffice`, `ProposedCycle`,
  `VoteRequirement`, `VoteCycle`, `Outcome`, `LeadFaction`, `OppositionFaction`,
  `SwingVoter`, `SwingVoter2`, `SwingVoter2Lean`. **Nothing writes them.** The
  propose-and-vote schema was built and never wired.
- **Sports.** Coverage reaches citizens only through the `source:sports` content
  pool — the same citywide draw.

### 3.2 The conditions vocabulary

ECL rows gate on a locked DSL (`loadEventContentLedger.js:64`), fail-closed on any
unknown term. Available today: `wealth`, `children`, `displacement`, `married`,
`retired`, `ageband`, `hood`, `season`, `lifestate`, `band`, `occupation`, `tier`,
`heritage`, `fame`, `culdomain`, `age`, `hoodtrend`, `momentum`, `undocked`,
`undockedpilot`, `warmth`, `drive`.

A cron can author rows against any of these with **zero engine change**. A new
field costs one resolver entry plus one scope assignment.

## 4. Ranked gaps

1. **Per-citizen event targeting.** The general version of `undockedpilot`: a
   POPID-keyed feed a cron writes, becoming a personal condition flag, with
   content gated on it. Closes the media seam, the sports seam, and the
   citizens-with-nothing-happening defect in one mechanism.
2. **Civic propose and vote.** Wire the columns that already exist. Keeping it
   honest: a proposal is born from a broken number, and the civic cron already
   classifies those ailments (`cron-civic-run.js:307` — `math-imbalance`,
   `stuck-initiative`, `repeating-event`, `coverage-gap`, `cascade-failure`,
   `ledger-completeness`).
3. **Wakes as a decision source, not an inference source.** Bond discovery from
   wakes measured zero real yield — citizens only name people the prompt handed
   them (`extractBondsFromWakes.js` header, and Mike confirms the bond build was
   not working).

## 5. Borrowed mechanics filter

A concept taken from another game either lands in one of the four channels in §3
or it is a new system. Sims-style wants fit: declare an intention in a wake, a
later cron checks whether it happened, the outcome emits an event.

## 6. Logging a citizen's life without double-counting it

### 6.1 Two folds, one scorer, independent guards

Both call `nudgesForEvent_` (`citizenDialMap.js:279`).

| Fold | Input | Strength | Guard |
|---|---|---|---|
| LifeHistory fold — `foldNewEntries_` (`compressLifeHistory.js:1472`) | entries with `cycle > c.folded` | full, netted per cycle | the `folded` watermark |
| Reflection drain — `accreteReflectionsIntoBase_` (`citizenMemory.js:181`) | `Reflection_Intake` rows where `applied != 'yes'` | `REFLECTION_MULT` 0.45 x `REFLECTION_ACCRETION_FRAC` 0.5 | the `applied` flag |

Neither guard sees the other. One stops a line folding twice; the other stops an
intake row draining twice.

### 6.2 What a logged line actually scores — measured

`DEFAULT_AMBIENT` is `{}` (engine.201 ruling 1), so **an unmatched line scores
nothing**. The risk is narrower: `CONTENT_RULES` route on tag **and text**, so
verbatim reflection prose scores at full strength only when it happens to contain
a trigger word. Measured by calling the function:

| Text passed with an unrecognised tag | Returned |
|---|---|
| "got the promotion and bought a round for the block" | `{drive:7, composure:2}` |
| "the diagnosis came back and it was bad" | `{composure:-6}` |
| "lost the job this week and told nobody" | `{}` |
| "the funeral was small and she cried in the car" | `{}` |
| "fell in love, plainly and late" | `{}` |

So logging quotes verbatim would double-count **unpredictably** — some citizens,
some days, depending on wording. That is the real problem, and it is smaller than
"everything double-scores."

### 6.3 The citizen's words already reach the engine

At wake time the cron writes the reflection to two places: the citizen's page, and
a `Reflection_Intake` row carrying POPID, event tag, affect tag and the snippet.
The cycle reads that row, snippet included, and routes on the text. **Citizens'
actual words reach the engine and move their dials, which shape their events.**

Page read-back also works: `wakePerception.js:282` calls `citizenPage.recentPage_`
and it reaches the wake prompt at `citizen-wake.js:318`. The desk writer, both
walls and the nightly reflection read it too. Pages are POPID-keyed
(`cp-POP-XXXXX`, denormalized to ledger col AW); **334 of 943 citizens carry one.**

### 6.4 The gap, stated plainly

Reflections reach the **dials**. They never become **events**. A citizen's week
moves their numbers and leaves no record of what happened.

## 7. OPEN — Mike's sections

- **OPEN: civic voting** — who votes, how often, what a proposal costs, what
  happens when one fails.
- **OPEN: the daily activity** — what the non-UNDOCKED daily thing is, and what it
  produces that the engine can honor.
- **OPEN: borrowed concepts** — which games, which mechanics.
- **OPEN: cadence** — whether the world should visibly move daily.
- **OPEN: what a logged life entry is for** — if it does not score, what reads it?
  Story seeds, desk slices, wake memory, the citizen's own continuity. Naming the
  reader decides the format.

## Changelog

- 2026-09-18 — created, then cut back to verified-only after three
  comment-derived claims proved wrong. Deleted on instruction, restored on
  correction, rewritten to this shape.
