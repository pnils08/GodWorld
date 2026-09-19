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

## 6. Persisting a citizen's life back into the engine (Mike, 2026-09-18)

Mike's framing: LifeHistory should carry logged events, but the quotes already
feed the dials, so if the same quote also becomes an event the input is scored
twice. Crons should also get a citizen's recent page entries fired back. The
standing question is how a citizen's life persists into the engine at all.

### 6.1 There are two folds, with independent guards

Both ultimately call the same scorer, `nudgesForEvent_` (`citizenDialMap.js:279`).

| Fold | Input | Strength | Idempotency guard |
|---|---|---|---|
| LifeHistory watermark fold — `foldNewEntries_` (`compressLifeHistory.js:1472`, engine.177/201) | LifeHistory entries with `cycle > c.folded` | full (`mult 1`), netted per cycle | the `folded` watermark |
| Reflection drain — `accreteReflectionsIntoBase_` (`citizenMemory.js:181`) | `Reflection_Intake` rows where `applied != 'yes'` | `REFLECTION_MULT` 0.45 x `REFLECTION_ACCRETION_FRAC` 0.5 | the `applied` flag |

**Mike's concern is mechanically exact.** The two guards do not know about each
other. One stops a LifeHistory line folding twice; the other stops an intake row
draining twice. Neither stops *the same sentence* entering both paths and being
scored once as a reflection at 0.225 effective and again as an event at 1.0.

### 6.2 The engine already solved this once, narrowly

`nudgesForReflection_` (`citizenDialMap.js:316`) carries the rule in its own
header comment: the same Divorce both folds objectively at full composure cost
and is reflected on subjectively, and only the affect mood is allowed to reach
composure, explicitly so the objective event is not double-counted.

That is the right doctrine, applied to exactly one dial. **The event scores the
fact; the reflection scores the feeling.** Generalised, it answers the question:
a logged life entry derived from a quote must not re-score what the quote already
scored.

### 6.3 You cannot log a LifeHistory entry for free

`nudgesForEvent_` falls through to `DEFAULT_AMBIENT` — "a logged ordinary day" —
for any tag it does not recognise. Only two tags are inert:
`STRUCTURAL = { Compressed: true, CareerState: true, EngineEvent: false }`
(`citizenDialMap.js:203`), and both mean *a summary of events*. `EngineEvent` is
explicitly **not** inert; it routes through the content rules.

So there is today no way to write "this happened, and it was already scored
elsewhere." Every logged line either scores or lies about being a summary.

**The cut that follows:** a third structural marker meaning *logged, scored
elsewhere*. One entry in `STRUCTURAL`, plus the discipline that the reflection
write-back path uses it. Life becomes readable in the column without a second
scoring, and the drain stays the single scorer of a quote.

### 6.4 Page read-back already works — correcting the assumption

Wakes do get recent page entries fired back. `lib/wakePerception.js:282` calls
`citizenPage.recentPage_(popId, PAGE_CANDIDATE_N)` and the result reaches the
prompt at `citizen-wake.js:318` as *"What's been on your mind lately, from your
own private reflections."* Recency by document list, deliberately not v4 search,
which silently missed documents (S272). `cron-desk-writer`, `officeWall`,
`reporterWall` and `discord-reflection` read it too.

The gap is not that crons cannot see the page. It is §6.5.

### 6.5 The actual persistence gap

**No cron writes `LifeHistory`.** Every writer is an engine phase; the only
script-side writers are probes, tests, audits and the `backdateCitizenDials.js`
manual lever. And the page itself is Supermemory, which the engine reads in
exactly one place (`phase07-evening-media/applyStorySeeds.js`).

So a citizen's week of life lives in two places the engine's life record never
sees, and reaches the engine only as a bounded dial nudge through
`Reflection_Intake`. **The life is not persisted; a scalar summary of its mood
is.** That is the thing to fix, and §6.3 is what makes fixing it safe.

## 7. OPEN — Mike's sections

*Mike fills these; engine-sheet reviews for what is missing and what the
mechanism can actually carry.*

- **OPEN: civic voting** — who votes, how often, what a proposal costs, what
  happens when one fails.
- **OPEN: the daily activity** — what the non-UNDOCKED daily thing is, and what
  it produces that the engine can honor.
- **OPEN: borrowed concepts** — which games, which mechanics.
- **OPEN: cadence** — whether the world should visibly move daily, and what that
  means for the weekly fire.
- **OPEN: what a logged life entry is for** — if a cron-written LifeHistory line
  does not score (§6.3), what reads it? Story seeds, desk slices, wake memory,
  the citizen's own continuity. Naming the reader decides the format.

## Changelog

- 2026-09-18 — created from the Mike-direct design conversation; §1-5 verified
  against live code and sheets, §7 left open for Mike.
- 2026-09-18 — §6 added (Mike: LifeHistory double-scoring, page read-back,
  persistence). Two folds and their independent guards traced; the objective/
  subjective rule found already in `nudgesForReflection_`; `DEFAULT_AMBIENT`
  confirmed as the reason nothing logs for free; page read-back confirmed live
  at `wakePerception.js:282`, correcting the assumption it was missing.
