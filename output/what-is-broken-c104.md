# What Is Broken — verified C104, 2026-08-25

Every claim below was read from a file or a live sheet during this session. Each carries a
pointer so it can be re-checked without trusting this document. Nothing here is inferred
from how simulations "usually" work.

**No code was changed. This is a diagnosis, not a repair record.**

---

## 1. The world numbers are one-way accumulators

`phase03-population/applyDemographicDrift.js:126-212`

Illness rate has **ten** forces pushing it up and **two** pulling it down:

| Direction | Trigger | Step |
|---|---|---|
| up | Winter | +0.0003 |
| up | Fog | +0.0002 |
| up | Low comfort index | +0.0002 |
| up | Heat / conflict potential | +0.0001 |
| up | Any chaos event | +0.0002 |
| up | Weak economy | +0.0002 |
| up | Gathering holiday | +0.0006 |
| up | Winter holiday | +0.0004 |
| up | First Friday | +0.0002 |
| up | Hospital over capacity | unbounded |
| down | "Base downward drift" `(rng() - 0.6) * 0.0004` | **−0.00004 avg** |
| down | High community engagement | −0.0002 |

The line commented *"Base downward drift"* averages −0.00004/cycle — one fifth of the
smallest upward nudge. It is jitter, not recovery.

**There is no recovery term.** Nothing converts sick people back to healthy at a rate
proportional to how many are sick. That proportionality is what makes a real outbreak peak
and fall. Here recovery is a flat −0.0002 whether one person is sick or fifty-eight thousand.

**The only stop is a clamp** — `illnessCap = 0.15`. Live value at C104 is **0.102**, climbing.

Employment is the same defect pointed the other way (`:226-282`): six upward calendar and
mood bonuses, two small penalties, and the one layoff event gated behind
`econ !== "strong" && econ !== "booming"` — so in a healthy economy it never fires.
Capped at 0.98. Live value **0.901**.

Neither number is a simulation of anything. Both are counters integrating a lopsided bias
until they hit a ceiling.

---

## 2. The illness rate has never touched a person

- `Hospital_Ledger` — header row, **0 data rows**. No admission in 104 cycles.
- `Simulation_Ledger` (964 tracked): 865 Active, 48 Traded, 45 Retired, 5 deceased, 1 active.
  **0 rows carry a HealthCause.**
- Across all 964 life histories, **12 citizens** have any health or death event at all:
  seven "recovered from a winter illness / the flu", five deaths with no cause recorded.

There is no code path from "the city is 10.2% sick" to "this citizen is sick." Hospitalization
has exactly three triggers in the engine (`phase04-events/generationalEventsEngine.js:312,
400, 626`) — heat exhaustion during a heat wave, and two injury routes. **None of them read
the illness rate.**

The hospital feedback loop at `applyDemographicDrift.js:184-202` opens `Hospital_Ledger` every
cycle, counts open admissions, gets 0, and applies 0 strain. It has done this 104 times.
Both ends of that loop were wired to things that never fire.

Note on denominators: 964 tracked is a *window* onto 387,975, not a census. The failure is not
that citizens don't aggregate up — it is that the city rate never **samples down**. At 10.2%,
roughly 98 of 964 tracked citizens should be ill at any moment. Zero are.

---

## 3. City, neighborhood, and citizen data do not talk

Flow is one-directional and top-down:

- `applyDemographicDrift.js` computes city illness from **weather, season, holiday, chaos,
  economic mood**. No citizen, no neighborhood, no hospital, no health initiative is an input.
- `phase03-population/updateNeighborhoodDemographics.js:83` takes that city number and pushes
  it **down** into each neighborhood as their value.

So a figure invented from fog and holidays becomes the health of all nineteen districts.
Nothing aggregates upward. There is no path in that direction at all.

---

## 4. Five sims with no authority between them

Five independent state producers, each with its own tab, clock, and math:
**world · neighborhood · civic · sports · citizens**

Every wire traced this session is a one-way broadcast:

- world → neighborhood (illness pushed down)
- sports → world (`applySportsFeedTriggers_` adds city sentiment)
- sports → citizens (`applyGameNightMoments`, `generateCitizensEvents` read `S.sportsFeedEntries`)
- civic → neighborhood (initiative work lands on hoods)

**No loop closes.** A silo with an outbound pipe is still a silo. This is the mechanical reason
nothing behaves like a simulation — a sim is feedback, and there is none.

Consequence: all five independently answer "how is Oakland doing," and they contradict.
At C104 — world says once-a-century plague; citizens say 964 people are fine; neighborhood
says retail slipping in ten districts; civic says six initiatives in progress; sports says
126-35, the best season in the city's history. Nothing reconciles them, so there is no single
world state for the newsroom to report.

**Sports is the best-connected of the five** — the only one wired into two others.

---

## 5. Sports runs on a calendar that does not exist here

`phase02-world-state/applySportsSeason.js:77` hardcodes `S.sportsSeason = "off-season"`
regardless of feed content. **372 consumer sites** branch on that field, every one of them
calendar-shaped (`playoffs` / `championship` / `late-season` / `off-season`). All inert.

The real feed label is parked on `S.sportsFeedSeasonType`, which has **zero readers** in the
engine. The suppression (S302) was correct — it killed a fake league calendar that leaked
playoff atmosphere into the city. But the wrong concept still occupies all 372 sites.

Games *do* flow: engine-side to citizen events and evening media, cron-side to desk packets,
world summary, and the P Slayer / Anthony slices. `scripts/buildWorldSummary.js:159` reads
`SeasonType` off the feed rows directly and builds a real per-team label.

---

## 6. The newsroom reports the engine's error log

`scripts/engine-auditor/routePatternSeeds.js` — by design, per its own header: the deck
"projects the engine_audit patterns into the deck as PRIMARY seeds." The **anomaly detector is
the assignment editor.**

Only filter is a world anchor (`:463-468`): any pattern naming a citizen, neighborhood, or
initiative becomes a story. Severity does not gate. Type does not gate.

C104 shipped 15 assignments. **5 came from the engine's bug report**, including one titled
*"The civic initiative carrying Temescal has not advanced in 1 cycles"* — a story about nothing
happening. 1 was an initiative status field. 1 was the TV listings. 2 were citizen life (one
duplicated). **5 were sports — the only assignments covering an actual event.**

`biz=0` on all fifteen. Not one story was handed a business.

### 6a. Deltas are read as states

The C104 business lead was *"Grand Lake retail decay"*, seeded from
`RetailVitality -5.03 — translate only`. Grand Lake sits at **8.21 — 4th of 19 neighborhoods**,
sentiment **+0.48**. Every neighborhood in the city has positive sentiment. The change was
published as though it were the level.

`scripts/engine-auditor/detectMathImbalances.js:96-100` builds `decaySignals` from deltas only.
The standing value never travels with the change.

### 6b. One citywide movement is fragmented into ten local mysteries

Ten neighborhoods show the identical decay shape in the same cycle — Grand Lake, Adams Point,
Dimond, Eastlake, Glenview, Ivy Hill, Lake Merritt, East Oakland, Temescal, West Oakland.
`routePatternSeeds.collapseSeeds` *does* collapse decay clusters (`MIN_CLUSTER = 3`), but the
stink scanner scores the raw uncollapsed patterns. Two subsystems disagree; the fragments win.

### 6c. A plague ranked eighth

`output/cron-compare/stink_c104.json`, all candidates by score:

```
 61  Grand Lake retail dip
 51  Adams Point / Dimond / Eastlake / Glenview / Ivy Hill / Lake Merritt decay
 40  City illness rate 10.2% with no desk forced on it
 38  Issue "strain" recurred 4 cycles
 33  East Oakland / Temescal / West Oakland decay
 18  Downtown sentiment rose 0.18
```

Seven retail wobbles outranked ~39,600 sick people. The scanner set `shouldForce: true`, wrote
in its own output that no desk was covering it, and handed the lead to Grand Lake anyway.

### 6d. Empty packets invite outside-world priors

The business packet carried `namedBusinesses: []` and `citizens: []`. Given a decline framing,
no cause, and no entities, the writer produced *"empty storefronts,"* *"'for lease' signs on
Lakeshore,"* *"can't find parking near the Grand Lake theater"* — real-world Oakland decline
imagery, which then propagated into arcs, staged copy, and the NotebookLM source packs.

---

## 7. Civic approval charges you for building things

`phase05-citizens/updateCivicApprovalRatings.js:745-776`

`classifyInitiativeMotion_` returns `sitting` for an initiative that is **on the clock, in
progress, on schedule**. `approvalDeltaForInitiative_` charges its owner **−2 every cycle** for
that state. The only positive path is `complete`.

So a multi-cycle project bleeds −2 per cycle for its entire life and repays +3 once, at the end.
The more ambitious the build, the more approval it destroys while under way. At C104 this was
five initiatives × −2 = **magnitude −13 against citywide sentiment** — from projects that are
going well.

Same cycle, the stink scanner scored three of those same initiatives as **improvements**. Two
subsystems, one object, one cycle: one calls it progress, the other bills for it.

---

## What I got wrong during this session

Recorded so the errors don't get inherited as findings:

1. **"Sports is turned off at the wall."** Wrong. Games flow to citizens, evening media, and
   the cron newsroom. Only the season *concept* is dead.
2. **"No active initiatives."** Wrong. Six are live. The auditor's phrase "no matching active
   initiative" means none targeting *that neighborhood*.
3. **"The engine never counts citizens into the city rate."** Wrong frame — 964 of 388k is a
   window, not a census. The real failure is the opposite direction (§2).
4. **"Civic is stalled."** Wrong. `sitting` means in progress. The defect is that progress is
   penalised (§7).

## Not investigated

Bonds, households, careers, education, migration, crime, culture, the print pipeline, and the
Discord layer were not opened this session. Nothing here says they are sound — only that they
were not checked.
