---
title: Civic edge truth migration — the ledger anchors entities, nothing anchors the edges
created: 2026-08-15
updated: 2026-08-15
type: plan
tags: [civic, engine, architecture, neighborhoods, truth-source, active]
sources:
  - Neighborhood_Map (live c103) — 22 rows, ADR-0016 truth source for the hood set
  - Simulation_Ledger (live) — 840 active citizens, 0 non-canon Neighborhood values
  - Civic_Office_Ledger (live) — 9 council seats, all districts unique, all POPID+faction populated
  - Initiative_Tracker (live) — 6 rows; all 6 carry LeadFaction=OPP
  - Crime_Metrics (live) — 20 rows == Object.keys(NEIGHBORHOOD_CRIME_PROFILES)
  - Household_Ledger (live) — 635 rows, 25 on 7 non-canon hood values
  - utilities/ensureCrimeMetrics.js:43 — the 20-key literal Crime_Metrics mirrors
  - phase05-citizens/updateCivicApprovalRatings.js:361,416 — mayor-all-initiatives, decay-toward-50
pointers:
  - "[[engine/ROLLOUT_PLAN]] — civic.20"
  - "[[2026-08-15-district-map-reconciliation]] — civic.18, the first edge; its §7 reversal generalises here"
  - "[[../adr/0016-data-ledgers-are-the-truth-source]] — the governing ADR; this plan is its civic cohort"
  - "[[2026-08-02-neighborhood-truth-source-migration]] — engine.99, the entity-layer migration this continues"
  - "[[index]] — registered same commit"
---

# Civic edge truth migration

**Thesis.** ADR-0016 anchored the neighborhood *entity set* and it worked. What it
never reached is the *edges between entities* — which district a hood is in, which
place an initiative is about, which hoods a per-hood table covers. Every edge is
still held in a code literal or an unvalidated free-text cell. The entity layer is
green; the graph is not.

## 1. What is healthy (verified, do not re-audit)

| Edge | Live result |
|---|---|
| hood set | `Neighborhood_Map` 22 rows; `auditHoodDrift` reconciles clean, CANON_12 == CoreSimRank |
| citizen → hood | 840 active citizens, **0** non-canon values |
| office → district | 9 seats, 9 distinct districts, POPID + faction populated on all |

The entity migration (engine.99) did its job. This plan does not revisit it.

## 2. The governing rule this survey produced

> **A tab is not a ledger just because it is a tab.** Three of the drifted tables
> are exact printouts of a code literal — the code writes every row every cycle, so
> the tab can never disagree with the code and can never be a truth source. **Fix
> the writer before the data, or the data regenerates on the next run.**

Proof, and why this is the plan's spine rather than a footnote:

- `Crime_Metrics` has exactly 20 rows because `updateCrimeMetrics.js:190` does
  `Object.keys(NEIGHBORHOOD_CRIME_PROFILES)`, and that literal
  (`utilities/ensureCrimeMetrics.js:43`) has exactly 20 keys.
- `Neighborhood_Map.District` reads 8 populated / 14 blank because
  `v3NeighborhoodWriter.js:389` computes it from an 8-entry literal and L423
  rewrites the whole column every cycle. (civic.18 §7.)

Seeding either one without first stopping its writer is wasted work.

## 3. Findings — the edge layer

### 3.1 Ghost neighborhoods receive live engine data

`Crime_Metrics` generates crime metrics for **Montclair, Coliseum, Elmhurst** —
none of which has a `Neighborhood_Map` row — and generates **none** for five hoods
that do exist: Brooklyn, Eastlake, Ivy Hill, San Antonio, **Baylight District**.
The flagship $2.1B district has no crime data at all.

`Neighborhood_Demographics` is missing **East Oakland** — the hood added at S352,
and one of the core 12.

### 3.2 Household geography has drifted off canon

635 rows; **25 rows on 7 non-canon values**:

| Value | Rows | Class |
|---|---|---|
| Piedmont Avenue | 14 | **spelling drift** — canon is `Piedmont Ave`; same place, two spellings |
| Montclair | 5 | ghost hood (supports the "Montclair aboard" ruling — households already live there) |
| Bridgeport | 2 | not Oakland |
| Near North Side | 1 | **Chicago geography** in an Oakland ledger |
| Oakland | 1 | the city, not a neighborhood |
| traveling | 1 | a state, not a place |
| A's | 1 | the baseball team, not a place |

`Piedmont Avenue` is the instructive one: 14 households sit in a hood the engine
cannot match, purely because nothing constrains the string.

`Business_Ledger` shows the same class — 17 rows across 7 non-canon values, of
which `City-wide` (10) is plausibly deliberate and needs a ruling rather than a fix.

### 3.3 Initiative → place is unconstrained, and validation would not have caught it

**Correction to the first read of civic.18.** All six initiatives carry
*canonical* hood names. A canon-membership check would have passed every one of
them — including INIT-006, tagged `Jack London, Downtown` (both D2) for a build
that sits in D5. The defect is **semantic, not referential**: nothing ties an
initiative to the place it is actually about. Type-checking the field does not fix
this; only an authored link to the project's real location does.

### 3.4 One faction leads every initiative — and the data is telling the truth

All six live initiatives carry `LeadFaction=OPP`. Approval treats
`supportedByFaction = (init.leadFaction === faction)` and `owns = isMayor ||
supportedByFaction`, so **CRC and IND members can never own an initiative** — they
are structurally always the opposition, in every case the sim has ever produced.

> **CORRECTED 2026-08-15.** This is **not** faction drift, and calling it
> "monoculture" mis-framed it. Baylight, OARI and the Youth Pipeline are
> hand-pushed **mayoral** programs; the tracker holds an accurate record of a city
> hall where only the mayor authors. Two structural facts under it:
>
> 1. **Nothing can create an initiative.** `civicInitiativeEngine.js` resolves
>    votes, external decisions, visioning, consequences and ripples — there is no
>    `createInitiative_`. `seedInitiativeTracker` is one-time setup and
>    `manualRunVote` is an operator trigger. Initiatives enter the world only by
>    hand.
> 2. **The schema cannot record authorship.** 28 columns, of which *five* describe
>    mayoral action (`MayoralAction`, `MayoralActionCycle`, `VetoReason`,
>    `OverrideVoteCycle`, `OverrideOutcome`) and *zero* describe who proposed the
>    thing. No `Sponsor`, no `ProposedBy`, no author district.
>
> The tracker was built as *the mayor proposes, the council votes*. It can only
> ever produce mayor-dominated data, so it does. Fixing `LeadFaction` values would
> be forging a record; the fix is an authorship path (§7).
>
> The city-hall skill already *asks* for the missing behaviour — its open option
> invites "a Tran who introduces an amendment nobody planned" — but a voice saying
> so has nowhere to land it. The narrative layer is requesting a row the data layer
> cannot hold.

### 3.5 Four of nine councilmembers cannot move their own approval

The mayor is hardcoded `affectsDistrict = true` for every initiative (L361). A
councilmember is affected only when an initiative's hood text intersects their
district list. Vega (D4), Crane (D6), Chen (D8) and Mobley (D9) intersect **zero**
of the six live initiatives.

Baseline decay (L416) removes 1/cycle from anyone above 50, and v1.3 deliberately
removed free recovery ("they rise only by completing work"). So those four decay to
51 and freeze permanently, with no available input. All four currently read exactly
**54**. Ashford (D7) is stuck the other side at **48** — below 50 the decay does not
fire and there is no recovery path.

The sim currently states that the mayor is the only official whose record can
respond to the city.

### 3.6 Adoption is 20 of 82

`auditHoodDrift` reports 0 findings because `MIGRATED_FILES` lists 20 files. **62
further files** still hold hardcoded hood literals: 29 in `scripts/`, 12 in
`phase05-citizens/`, 7 `utilities/`, 5 `phase07-evening-media/`, 3
`phase02-world-state/`, 2 each in `phase06-analysis` / `phase03-population`, 1 each
in `phase08-v3-chicago` / `phase04-events`. The detector is honest about what it
scans; it just does not scan most of the engine. **No `phase05-citizens` file uses
a loader accessor** — the entire civic phase is unmigrated.

### 3.7 The character layer encodes real-world Oakland, and it decides who moves in

**Found 2026-08-15 while authoring the East Oakland demographics entry (builder
direction, same session).** Two hardcoded tables give each hood a *character* that
drives citizen placement and crime generation:
`ensureNeighborhoodDemographics.NEIGHBORHOOD_PROFILES` (studentMod / adultMod /
seniorMod + a character string, explicitly "used to derive initial demographics and
influence citizen placement") and `ensureCrimeMetrics.NEIGHBORHOOD_CRIME_PROFILES`
(crime modifiers, baseIncidents, character).

**The tell is the asymmetry.** Where a hood has a written canon entry, its profile
matches canon. Where canon is silent, the code filled in with training-data Oakland.

`Baylight District` has canon `INSTITUTIONS.md` §336 — 65-acre former-Coliseum site,
35,000-seat stadium, 3,200 units, *"the prosperity-era centerpiece, the opposite of
a struggle zone"*, and it even specifies the demographic shape: *"new stadium
district (young professionals + incoming families, few seniors — units are brand
new)."* The code profile is exactly that. Someone did it correctly, from canon.

Now the hoods canon does not describe:

| Hood | Code says | Canon / stated world |
|---|---|---|
| **Temescal** | `'young professional'`, adultMod **1.3**, crime `'mixed commercial, family neighborhood'`, baseIncidents **5** (near-lowest) | the **health-crisis** district (`INSTITUTIONS` §42, INIT-005 Temescal Community Health Center) — **still behind the city boom** |
| **West Oakland** | `'evolving industrial'`, crime `'industrial transition, gentrifying'` | home of **Civis Systems**, Elias Varek's urban-intelligence firm (§377) — a major anchor employer |
| **East Oakland** | crime `'working class, underserved'`, baseIncidents **11** (highest) | D5, immediately adjacent to the flagship $2.1B build |
| **Rockridge** | `'established affluent'`, baseIncidents **3** (lowest) | no canon entry — unverifiable either way |

World premise for anyone re-authoring these: **2042**, after a legendary A's run, a
massive tech boom, Civis Systems (the billionaire's city-optimization system — the
engine, in-world), and the gentrification that followed. Prosperity-era and
self-contained; 2026 Oakland is not the reference.

Temescal is the clearest inversion: canon makes it the health-crisis area lagging
the boom, and the code makes it the city's young-professional magnet with
near-lowest crime. **Placement follows that profile**, so the engine has been
steering young professionals *into* the crisis district and reading it as low-risk.

**REFINED after builder context, same session — the premise is 2042.** A legendary
A's run, a massive tech boom, a billionaire who built a city-optimization system
(Civis Systems — the engine itself), *and the gentrification that followed.* So
gentrification **is** canon here. That partly rehabilitates West Oakland's
`'gentrifying'` label — but for a reason the code never knew: post-Civis tech-boom
displacement in 2042, not 2010s Bay Area.

Which sharpens the finding rather than softening it. **The problem is not that every
label is wrong — it is that none of them is traceable, so we cannot tell which are
right.** Baylight's profile is traceable to §336 and correct. The others are
untraceable, and land anywhere on the spectrum:

- `'gentrifying'` for West Oakland — plausibly **right**, for the wrong reason
  (arrived as a 2026 reflex, coincides with 2042 canon).
- `'young professional'` + near-lowest crime for **Temescal** — **inverted**, canon
  makes it the health-crisis district the boom left behind.
- `'underserved'` for East Oakland, `'established affluent'` for Rockridge —
  **unknown**, no canon to check them against either way.

A label that happens to be correct by coincidence is still unsourced, and will drift
the next time someone edits it with a different set of priors. This is the standing
rule biting — *"don't reason from real-world sector/geography… Canon beats
training-data priors every time"* — where the failure mode is not wrongness but
**untraceability**.

**GATE WITHDRAWN 2026-08-15 (builder ruling, same session).** This section
originally blocked civic.21 until the character layer was canon-correct. That was
over-cautious and contradicted standing doctrine.

The ruling: *"We are setting the table; the code and crons take it where it goes.
This is what it is right now as I state it — canon is the world today. An error in
code is just a Civis Systems code error, so swings in data while we fine-tune are
legitimate in-world stories. KONO was blacked out — that's the world living the
broken engine, is all."*

Two things follow, and they dissolve the gate rather than defer it:

1. **Canon is live, not retroactive.** It is what the builder states, when he states
   it. So a profile that disagrees with a later statement is not a contradiction
   needing reconciliation before the world may run — it is simply what was true
   until the statement. The cycles in between stand.
2. **Engine error is in-world event.** Civis Systems *is* the engine in-world
   (`INSTITUTIONS` §377), so a mis-tuned table is a Civis instrumentation fault the
   city lives through, not contamination to be quarantined. KONO's blackout is the
   precedent. This is `project_engine-output-is-canon-bug-is-event` applied to a
   build in progress: tuning volatility is story, not damage.

**civic.21 is therefore NOT gated by this.** Rank the hoods; let the crons run it.

**What survives, reframed.** The finding was never that the labels are wrong — §3.7
already establishes most are unverifiable. It is that they are **untraceable**, and
untraceability costs the builder his own lever: he cannot efficiently state canon
over a layer when he cannot see which parts were authored and which were inherited
from training-data priors. So civic.23 is not "fix the characters before running" —
it is **make the character layer legible**, so a statement like "Temescal is the
health-crisis district behind the boom" lands somewhere visible and stays landed
instead of being silently re-inherited on the next edit. Mechanism in service of the
doctrine, not a checkpoint in front of it.

**Not fixed here.** Re-authoring a neighborhood's character is canon authoring, not
mechanism, and belongs to the builder. What engine-sheet owns is having found it,
and the observation that a hood with a canon entry got a correct profile — so the
durable fix is canon entries for the hoods that lack them, with the tables derived
from or checked against them, rather than a one-off retune. Filed as civic.23.

## 4. Cohorts

ADR-0016 rejected a big-bang sweep on regression surface (all files are live cycle
path). Cohorts, each independently verifiable, writer-before-data throughout.

| # | Cohort | Contents | Deploy? |
|---|---|---|---|
| E1 | District edge | civic.18 §7 tasks 4a–4e — already specced | yes |
| E2 | Per-hood table writers | `ensureCrimeMetrics` + demographics writer read the ledger instead of a literal; then reconcile rows | yes |
| E3 | Household/business geography | fold `Piedmont Avenue`→`Piedmont Ave`; rule on `City-wide`; purge Chicago/`A's`/`traveling` | data + writer |
| E4 | Initiative → place | authored location link; INIT-006 correction — **ruling landed** (`bedbbedb`): data error, one cell → `Baylight District`, via civic.15 `--apply` | data |
| E5 | Approval mechanism | approval = district condition + recorded conduct; delete the decay timer. Brief in **§6** | design; gated on E1+E2 |
| E7 | Hood character layer (§3.7) — make it LEGIBLE (authored vs inherited), so canon statements land and stay landed. Does **not** gate civic.21 | builder authors canon; engine-sheet wires | data |
| E6 | Remaining 62 files | continue engine.99's cohort pattern; `phase05-citizens` first (12 files, civic-critical) | yes |

**Ordering.** E1 and E2 are the same defect class and share the writer-first rule —
do them together. E3 depends on nothing. E4 and E5 need rulings before code. E6 is
the long tail and can run in parallel with anything.

**Gate.** All Apps-Script work is held behind the `ab55d0d8` smoke gate (three
unsmoked changes live; S250 forbids stacking a fourth).

## 5. Rulings needed before E4/E5

**Ruling 4 is answered by §6.1** (the line); **ruling 3 dissolves under §6.4**
(cron-generated initiatives make lead faction emergent). Remaining open: ruling 2.

1. ~~**INIT-006's neighborhood tag**~~ — **RESOLVED 2026-08-15 (`bedbbedb`,
   research-build).** Read against the other five rows the convention is
   unambiguous: `AffectedNeighborhoods` = where the project lands. INIT-006 alone
   tagged the *venue of its council vote*. Correctable data error, one cell →
   `Baylight District`, owned by civic.15's `--apply` path. No builder ruling
   needed. *(Method worth keeping: the fork dissolved by reading the sibling rows
   rather than escalating it.)*
2. **`City-wide` as a business location** — legitimate value or drift? 10 rows.
3. **Faction monoculture** — should the engine be able to produce a CRC- or
   IND-led initiative, or is one-party leadership the intended state?
4. **Dead seats** — should a councilmember with no initiative in their district
   have *any* path to approval movement? Today the answer is no, by construction.

Rulings 3 and 4 are the only ones that gate code; 2 is a one-line data call.

## 6. The line — when a civic seat is a person and not a process

**Direction (builder-direct 2026-08-15).** Recorded as given, because it reframes
E5 from a repair into a design brief:

- The initiative ledger **is not a loop yet**. What is in it was placed there. A
  district with no initiative today is a *snapshot*, not a structural fact.
- **Future build:** crons surfacing a repeated issue should produce an initiative
  the council votes on. That is the generative half the loop is missing.
- Approval should be driven by **whether a neighborhood is performing or not** —
  not by regression to a mean, and not by points for nothing. **Nothing is free in
  this sim.**
- Districts wake **once a week now, rising to all 9 Mon–Thu**. What a member does
  *or does not do* on their wake day must count.
- The test: *"if one of them is involved in nothing, what makes that a real person
  and not a mechanism for a process? These are living people — does its life match
  its life?"*

### 6.1 The line, as set

A civic seat is a **person** when its record is caused by its own conduct and its
district's lived condition. It is a **mechanism** when its number is produced by
the engine's bookkeeping. Three tests, all of which must hold:

1. **It can act.** On its wake day it does something or declines to, and *both* are
   recorded. An omission is a fact about a person; an absence of data is not.
2. **It is exposed.** Its district's neighborhoods have measurable condition, and
   that condition moves its standing whether or not it acted.
3. **Its record is legible as a life.** Every number attached to it traces to a
   specific act, omission, or district condition — never to a timer.

**The bench test:** pick any member and ask *why is your approval this number?* If
the honest answer is "because time passed," it is a mechanism. If it is "because
Fruitvale's crime climbed three cycles running and you tabled the item twice," it
is a person.

### 6.2 What this rules out, and what it rules in

`decay toward 50` (L416) **fails test 3** and must be removed, not retuned — it is
time-based, so it is exactly "points for nothing" run in reverse. `v1.3`'s removal
of free recovery was the same instinct applied to only one direction; nothing free
means nothing free *either* way.

The four "dead seats" must **not** be fixed by granting them movement. That would
be the same defect wearing the opposite sign.

**They are fixed by exposure, and *condition* exposure can never be zero** (though
see §9 — *citizen* exposure very much can). Every district
always has neighborhoods; every neighborhood always carries live condition —
`CrimeIndex`, `Sentiment`, `RetailVitality`, `MigrationFlow`,
`NeighborhoodTrajectory`, `HousingPressure`, `MedianIncome`, `MedianRent`,
`TrajectoryMomentum`, all refreshed per cycle on `Neighborhood_Map`. So a member is
**never involved in nothing**. Only *action* is optional. Presiding over a district
while it degrades, and doing nothing, is not an absence of a record — it *is* the
record.

That is the answer to the question as posed: involvement is not contingent on the
initiative loop existing. It is contingent only on having a district, which all
nine do.

### 6.3 Current state against the line

| Test | Passing today |
|---|---|
| 1 — can act | **0 of 9.** Wake days are being built; nothing records act-or-decline yet. |
| 2 — exposed | **0 of 9.** Per-hood condition exists and is rich, but **nothing wires it to approval**. The only input is initiative intersection. |
| 3 — legible | **0 of 9.** Every current number traces to decay or to intersection accident. |

The four frozen seats are the visible symptom; the diagnosis is that **no seat
passes any of the three tests**. Approval is presently a bookkeeping artifact for
all nine, including the mayor — whose `affectsDistrict = true` is its own kind of
free.

### 6.4 Consequence for the cohorts

E5 is no longer "decide whether dead seats get movement." It is: **make approval an
outcome of district condition plus recorded conduct, and delete the timer.** Its
prerequisite is not the initiative loop — it is E1/E2, because district→hood and
per-hood condition must be true before condition can drive a record. Ruling 4 is
answered by the line; ruling 3 (faction monoculture) dissolves once initiatives are
cron-generated from real issues rather than authored, since lead faction then
emerges from who acts.

## 7. The inversion (builder-direct 2026-08-15)

**The tracker is not a table, it is the arena.** The entire civic sim revolves
around it: a member's district is their world, and the `Initiative_Tracker` is
where they push their agenda.

The build is currently **inverted**:

| | Today (built) | Intended |
|---|---|---|
| Initiatives enter by | hand, mayor-authored | members pushing agendas; crons surfacing repeated issues into something to vote on |
| Members relate to the tracker by | passive intersection of a hood string | attacking an existing initiative or filing a new one |
| Approval derives from | that intersection, plus a timer | district condition + what they did or declined to do |
| Direction of causation | tracker → member | member → tracker → outcomes → member |

**The weekly shape.** Mon–Thu the districts **absorb** their world (one seat/week
now, rising to all 9 Mon–Thu). By Sunday's city hall they arrive **already layered
with the past cycle before they utter a word** — city hall is the *expression*
step, not the input step. What they do there — attack, file, abstain — is conduct,
and conduct is what §6.1 test 1 requires.

Consequences for this plan: the "faction monoculture" ruling (§5.3) is not a
values question at all — it dissolves the moment authorship exists, because lead
faction becomes a record of who acted. And the missing generative half is a named
future build, not a defect to patch.

## 8. The absorption layer already exists — and is wired to the wrong place

`output/cron-civic/packs/COUNCIL-D*_c103.json` already carries, per seat:

- `signal: { kind: "district-heat", hoods: [...], src: "lib/districtMap.js + civic-office-map.json" }`
- `exposure.subjects[]` — named citizens in those hoods, each with a `why` that
  **already computes condition against the city baseline**: *"lives in Piedmont Ave
  — sentiment 0.38 vs city 0.489."*
- `actor.dials.approval` — the seat's current number, carried alongside.

So the district→hood→citizen→condition path §6.1 test 2 needs **is built and runs
every cycle.** It feeds the *writer's prompt* and stops there. The pack tells Crane
his neighborhood sits 0.11 below the city on sentiment, and then his approval moves
−1 because a timer fired. **Exposure is computed and discarded.**

This is the cheapest available win in the plan: test 2 does not need new
measurement, it needs the existing measurement to reach the record. Its only hard
dependency is E1 — `signal.src` is literally `lib/districtMap.js`, so district
truth must land first. (Today's civic.18 Node fix already removes Coliseum and
Elmhurst from D5's heat on the next civic cron; Montclair remains until Task 1
seeds it, which is why Crane's C103 pack drew 0 subjects from half his district.)

## 9. ESCALATION — districts do not map to the population

Active citizens per district, via the corrected map:

| District | Member | Citizens | Detail |
|---|---|---|---|
| D2 | Tran | **222** | Downtown 85, Chinatown 71, Jack London 66 |
| D7 | Ashford | 167 | Temescal 76, Rockridge 77, KONO 14 |
| D9 | Mobley | 140 | Laurel 58, Uptown 82 |
| D8 | Chen | 100 | Lake Merritt 93, Adams Point 7, Grand Lake 0, Eastlake 0 |
| D3 | Delgado | 88 | Fruitvale 85, San Antonio 3 |
| D1 | Carter | 69 | West Oakland 69, Brooklyn 0 |
| D6 | Crane | 49 | Piedmont Ave 49, Montclair 0 |
| **D5** | **Rivers** | **4** | East Oakland 2, Baylight District 2 |
| **D4** | **Vega** | **1** | Ivy Hill 1, Glenview 0, Dimond 0 |

**Ramon Vega represents one citizen.** Janae Rivers, who holds the flagship $2.1B
development, represents four. Tran represents 222. Seven of the 22 hoods have zero
residents.

**ROOT CAUSE FOUND 2026-08-15 — this is a feeder-pool defect, not a boundary
defect.** `generateGenericCitizens.js:412` draws placements from
`getCoreSimNeighborhoods_(ctx)` — the `CoreSimRank` subset, which is **12 of the 22
hoods**: Temescal, Downtown, Fruitvale, Lake Merritt, West Oakland, Laurel,
Rockridge, Jack London, Uptown, KONO, Chinatown, Piedmont Ave.

The other ten receive no generated citizens at all. Their populations, in total:

| Non-core hood | Citizens |
|---|---|
| Adams Point | 7 |
| San Antonio | 3 |
| East Oakland | 2 |
| Baylight District | 2 |
| Ivy Hill | 1 |
| Brooklyn, Dimond, Eastlake, Glenview, Grand Lake | **0 each** |

**15 citizens across ten neighborhoods; 825 across the core twelve.** The
correlation is exact — every underpopulated district is underpopulated precisely to
the extent its hoods sit outside `CoreSimRank`.

Vega represents one citizen because **all three of his neighborhoods** — Glenview,
Dimond, Ivy Hill — are outside the feeder pool. Rivers holds two hoods that are
both outside it, one of which (Baylight District) did not exist until recently and
the other (East Oakland) was added at S352.

So the districts are not drawn wrong. **The feeder only fills 12 of 22 hoods**, and
the district map faithfully reflects a city whose population generator has been
aimed at half of it.

**CORRECTED 2026-08-15 (engine-sheet, execution pass) — civic.21 needs NO CODE
CHANGE.** Two readings of the generator were wrong before this pass, both worth
recording because they point opposite ways:

1. *First read:* "expand `CoreSimRank`" — dismissed as too broad, because
   `getCoreSimNeighborhoods_` has **11 consumers across 6 phases**
   (`godWorldEngine2`, `generateCrisisSpikes`, `checkForPromotions`,
   `generateGenericCitizens`, `runNeighborhoodEngine`, `cityEveningSystems`,
   `buildEveningFamous`, `textureTriggers`, `culturalLedger`,
   `recordWorldEventsv3`, `auditHoodDrift`).
2. *Second read:* the picker seeds from a hardcoded `neighborhoodWeights` literal
   (:415) holding exactly the 12 core hoods — so a separate placement pool looked
   necessary.

**Both wrong.** `pickWeightedNeighborhood` seeds `weights` from that literal
(:508-510) but builds the weighted array by iterating **`neighborhoods`** — the
ledger list from `getCoreSimNeighborhoods_` — with `weights[neighborhood] || 1.0`
(:586-588). The literal is a **tuning table, not a gate**: any hood in the ledger
core list that lacks a tuned weight is placed at a default weight of 1.0
automatically. The ADR-0016 migration did its job; the substrate is already correct.

**The entire gate is 10 empty cells.** `CoreSimRank` is populated 1–12 contiguous
and blank for the other ten:

| Ranked 1–12 (draw order) | Unranked — invisible to all 11 consumers |
|---|---|
| Temescal, Downtown, Fruitvale, Lake Merritt, West Oakland, Laurel, Rockridge, Jack London, Uptown, KONO, Chinatown, Piedmont Ave | Adams Point, Grand Lake, Brooklyn, Eastlake, Glenview, Dimond, Ivy Hill, San Antonio, **East Oakland**, **Baylight District** |

Two entries in that right-hand column deserve their own line: **East Oakland** —
major Oakland geography, added S352 — and **Baylight District**, the flagship $2.1B
build. Neither currently receives citizen placement, crisis detection, evening
texture, cultural events, or promotions. The sim's headline development is a place
where, mechanically, nothing happens.

**What ranking a hood turns on** (all at once, per the consumer list above):
placement, crisis spikes, promotions, neighborhood-engine processing, evening
systems / famous / texture / cultural ledger, and world-event recording.

**Determinism note.** Appending ranks 13–22 preserves the relative order of the
existing twelve, but the weighted array's *length* changes, so `randInt` maps
differently from the next cycle on. Forward-only; no replay of past cycles is valid
across the change. Expected for a world change, but it should be a deliberate one.

**This is not engine-sheet's call to make silently.** `canonNeighborhoodLoader`'s
own docstring names it: *"promoting/reordering core hoods is a sheet edit with
sim-wide behavioral reach, by design (Mike's lever)."* The substrate is ready; the
lever is doctrine. Three shapes, in ascending reach:

- **(a) Rank all ten — RULED 2026-08-15 (builder): "we should be using all hoods."**
  The whole city becomes live. It is the only shape consistent with the §6 doctrine:
  approval driven by whether a neighborhood is performing requires every neighborhood
  to be performing at something. A hood that sits in the map while nothing happens in
  it is a mechanism, not a place — the map would be lying about the size of the city.
- **(b) Rank the representation-critical five** — Glenview, Dimond, Ivy Hill (all of
  D4, which is why Vega represents one citizen), plus East Oakland and Baylight
  District (all of D5). Fixes the two broken districts and the flagship blind spot;
  leaves Adams Point / Grand Lake / Brooklyn / Eastlake / San Antonio as quiet
  child-areas.
- **(c) Leave as-is** — accept that ten hoods are places without communities, and
  that D4 and D5 are represented by members with almost no constituents.

### 9.1 Executing the ruling — mechanism (engine-sheet)

**It is a sheet edit, so it does not travel with a deploy.** Ten `CoreSimRank`
cells. Per DEPLOY.md, `clasp push` carries code only — this must be applied to the
SANDBOX sheet, proven, then replayed against live explicitly. It is not part of any
code wave.

**Rank order is a real choice, not filler.** Rank order *is* draw order and seeded
rng consumption depends on it. Ordering by current population would bake in the very
artifact being fixed (those hoods are empty *because* they were unranked), so the
proposed order is by what the sim needs to start simulating, fixing the two broken
districts first:

| Rank | Hood | Why here |
|---|---|---|
| 13 | East Oakland | major geography, canonized S352, D5 |
| 14 | Baylight District | the flagship $2.1B build, D5 — completes the district |
| 15–17 | Glenview, Dimond, Ivy Hill | all of D4 — the district where Vega represents 1 citizen |
| 18–22 | Adams Point, Grand Lake, Eastlake, Brooklyn, San Antonio | remaining child-areas |

**Prove on bench before live.** Eleven consumers across six phases wake at once —
citizen placement, crisis spikes, promotions, neighborhood engine, evening
systems/famous/texture/cultural, world events. Expect volume changes, not just
coverage: crisis surface grows from 12 hoods to 22, evening and cultural generation
likewise, and the 8-citizens/cycle placement budget now spreads across 22 rather
than 12 (slower per-hood growth in the core twelve — that is the intended trade).

**rng shifts forward-only.** The weighted array's length changes, so no past-cycle
replay is valid across the change. Expected for a world change; noted so nobody
treats a post-change divergence as a regression.

**Constraint on the fix (from the loader's own docstring):** `CoreSimRank` rank
order *is* draw order, and seeded rng consumption depends on it — promoting or
reordering core hoods is a sheet edit with sim-wide behavioural reach, by design.
So expanding the pool is a deliberate lever-pull with determinism consequences, not
a mechanical widening. Either route — expand `CoreSimRank`, or give the generator a
secondary non-core placement path — needs that accounted for.

**Migration will not solve this on its own.** `migrationTrackingEngine.js` *is*
wealth-matched as expected (`MISFIT_INCOME_RATIO 2.5`, `MAX_BURDEN 0.40`,
`TARGET_BURDEN 0.30`, live rent-burden scoring), but its cap is
`MAX_UNITS_PER_CYCLE: 2` — two *households*, not five citizens — and its own comment
describes moves as "rare, qualitative (1:438 sample)". It also *relocates existing*
households rather than creating residents, so it redistributes scarcity rather than
filling ten empty hoods. It is the right slow-burn mechanism to keep; it is not the
repopulation mechanism.

**Why this gates E5 and civic.19.** Per-district accountability across districts of
1 and 222 is not accountability. And it bounds §6.2: *condition* exposure is always
available (every hood has metrics regardless of who lives there), but *citizen*
exposure is functionally zero for D4 — its pack drew **0 subjects**. A member can
be made to answer for his district's condition; he cannot be made to answer to
constituents who do not exist.

Vega passes no version of "does its life match its life" — not because the wiring
is missing, but because there is almost no one there for him to represent. That is
a **population** question, not an approval question and not a boundary question,
and it needs to land before per-district accountability is built on top of it.

## 10. The ledger seam — keep the tracker, add a conduct ledger

**Question put to engine-sheet 2026-08-15:** is `Initiative_Tracker` the system this
needs, or would a purpose-built city-hall ledger do the job better?

**Recommendation: both, with a seam. Do not replace the tracker.**

The two things have different **cardinality**, and that is the whole argument.

| | Initiative | Conduct |
|---|---|---|
| Volume | 6 in ~103 cycles | 9 seats × weekly, rising to all 9 Mon–Thu |
| Weight | heavy, formal, votable | light, atomic, mostly non-votable |
| Lifetime | multi-cycle (proposal → vote → mayoral action → implementation → milestones) | single wake |
| Examples | Baylight, OARI, Youth Pipeline | attacking someone else's initiative, demanding a report, abstaining, saying nothing |

Forcing conduct into `Initiative_Tracker` means minting an `INIT-` row every time a
member speaks. "Initiative" then stops naming a legislative object, and most rows
sit ~90% empty against a 28-column schema built for a vote lifecycle. Conversely, a
city-hall ledger that also held initiatives would duplicate the vote and
mayoral-action machinery that demonstrably works — INIT-002 correctly records the
5-4, Vega's no, Tran's yes, the signature, the implementation phase.

**The seam:**

- **`Initiative_Tracker` stays** as the *legislative-object* layer. It gains the
  authorship columns it lacks (proposer, proposing office, proposed cycle) — the
  §3.4 fix. Twelve code paths already depend on this tab; appending columns is a
  header-lookup write, low blast radius.
- **A city-hall / conduct ledger is added** as the *act* layer. One row per seat per
  wake: what they did, what they declined, and what they were exposed to when they
  decided.

**Why the conduct ledger earns its existence** — it does three jobs at once, each of
which this plan already needs:

1. **It is the approval driver.** Every delta can cite a row instead of a timer.
   That is §6.1 test 3 (legibility) satisfied structurally rather than by convention.
2. **It is the omission recorder.** §6.1 test 1 requires that declining to act be
   *recorded*, not merely absent. Only a per-wake row can hold a silence.
3. **It is the initiative feeder.** Repeated conduct against the same issue is
   precisely the signal that graduates into something votable — the cron mechanism
   in §7, with a place to accumulate.

It also matches the weekly shape exactly: Mon–Thu absorb (§8 — the packs already
compute this), Sunday express, and the expression lands as a conduct row that may
or may not escalate to an `INIT-`.

**Blast radius:** a new tab has no existing readers, so it cannot regress anything;
the tracker change is three appended columns. This is additive on both sides.

**Status:** recommendation only — not approved, not built. Filed as civic.22's
shape question.

## 11. Handoff to research-build

### 11.1 Gate correction — the live smoke is not a blocker

Earlier sections gate Apps-Script work behind the `ab55d0d8` live smoke. **That was
over-conservative.** `SANDBOX 0814` is standing (DEPLOY.md §CURRENT, stood up S370,
code current at main `1348e685`, 172/172 files byte-verified) and under the
Groundhog model *"bench is the same state as live, so the bench fire + sheet verify
IS the smoke."* Every cohort here can be proven on the bench without waiting for a
live cycle. Read every "held behind the smoke gate" note in §4 and §8 as **"proven
on SANDBOX 0814 first."**

### 11.2 The obligation that is easy to miss

DEPLOY.md §Sheet writes: *"anything not in CODE does not carry over."* A
`clasp push` to live carries **code only**. Every schema change, column add, data
migration and backfill performed against the sandbox **sheet** must be replayed
against live explicitly (dry-run → apply → read-back verify). Self-arming
`ensure*Schema_` code re-arms on live's first fire; **everything else does not.**

This plan is unusually exposed to that rule, because most of its cohorts are
*data* fixes. The replay column below is not optional bookkeeping — skip it and
live runs corrected code against uncorrected data.

### 11.3 Writer map — every finding, its writer, and what it costs

| Artifact | Writer | Literal / source | Defect | Self-heals on live? | Replay |
|---|---|---|---|---|---|
| `Neighborhood_Map.District` | `v3NeighborhoodWriter.js` :123 map, :389 compute, :417-423 write | `NEIGHBORHOOD_DISTRICT_MAP` (8) | 14 of 22 blank-overwritten every cycle | n/a — fix is to **stop** writing | **Yes** — seed 22 District cells, *after* 4a deploys |
| `Crime_Metrics` | `utilities/ensureCrimeMetrics.js:43` | `NEIGHBORHOOD_CRIME_PROFILES` (20) | 3 ghost hoods fed live data; 5 canon hoods absent incl. Baylight | **Partial** — update-or-append only, no delete path (:412-470) | **Yes** — delete 3 ghost rows by hand |
| `Neighborhood_Demographics` | `utilities/ensureNeighborhoodDemographics.js:28` | `DEMO_NEIGHBORHOODS` (21) | East Oakland absent | **Partial** — same update-or-append shape | Verify for ghosts; append is automatic |
| `Faith_Organizations` | `utilities/ensureFaithLedger.js` | 11 hood-literal lines | Montclair ghost; 11 canon hoods have no faith org | Partial | Delete/repoint Montclair row |
| `Transit_Metrics` | `utilities/ensureTransitMetrics.js` | 27 hood-literal lines | **Different shape** — keyed by Station/Corridor, not Neighborhood. Audit only, do not force into this pattern | n/a | n/a |
| `Household_Ledger.Neighborhood` | 7 writers across phase04/05 (`householdFormationEngine`, `migrationTrackingEngine`, `bondEngine`, `generationalWealthEngine`, `generationalEventsEngine`, `educationCareerEngine`, `generateCitizensEvents`) | free text, unconstrained | 25 rows on 7 non-canon values; `Piedmont Avenue` ×14 is a pure spelling split | No | **Yes** — fold + purge |
| Generic citizen placement | `generateGenericCitizens.js:412` | `getCoreSimNeighborhoods_` → `CoreSimRank` (12 of 22) | 10 hoods never seeded; Vega left with 1 citizen | No | **Yes** — `CoreSimRank` is a sheet edit, **and rank order is rng draw order** |
| `Initiative_Tracker` | **no creator exists** — `civicInitiativeEngine` resolves only | — | no authorship path, no authorship columns | No | **Yes** — 3 appended columns |

### 11.4 Montclair is already in the world four times over

It carries a `Crime_Metrics` row, 5 `Household_Ledger` households, a
`Faith_Organizations` entry, and (until today) a district-map slot — while having no
`Neighborhood_Map` row. The "bring Montclair aboard" ruling is not an addition; it
is **regularising a hood the derived data already treats as real.** Seeding its row
makes four existing artifacts legal rather than creating anything new.

### 11.5 Suggested order for RB

1. **civic.21 feeder pool** — no deploy dependency on E1, unblocks the population
   floor everything else is measured against. Watch the rng draw-order constraint.
2. **E1 + E2 together** — same defect class, both writer-first, both bench-provable.
   E1 must precede the District seed (4a→4b).
3. **E3 household/business geography** — independent, mostly data.
4. **§8 wiring** — cheapest real win once E1 lands: exposure is already computed in
   the packs and discarded.
5. **E5 / civic.22** — after §10's ledger shape is approved.

Nothing in 1–4 needs a ruling. Only 5 does.

## Changelog

- 2026-08-15 (builder) — GATE WITHDRAWN from §3.7. Canon is live, not retroactive
  ("this is what it is rn as I state it"); engine error is a Civis Systems fault the
  world lives through, so tuning swings are legitimate in-world stories (KONO
  blackout precedent). civic.21 is NOT gated. civic.23 reframed from "fix before
  running" to "make the layer legible so canon statements stay landed".
- 2026-08-15 (engine-sheet) — §3.7 REFINED after builder context: premise is 2042
  post-boom with canon gentrification, so West Oakland's 'gentrifying' is plausibly
  right for the wrong reason. The defect is UNTRACEABILITY, not uniform wrongness —
  Baylight traceable and correct, Temescal inverted, East Oakland and Rockridge
  unverifiable. A label correct by coincidence still drifts on the next edit.
- 2026-08-15 (engine-sheet) — §3.7 NEW: the hood character layer encodes real-world
  Oakland where canon is silent (Temescal coded 'young professional'/low-crime while
  canon makes it the health-crisis district behind the boom; West Oakland
  'gentrifying' though it hosts Civis Systems; East Oakland 'underserved'; Rockridge
  'affluent'). Baylight, which HAS a canon entry, is correct — the asymmetry is the
  evidence. These tables drive placement, so this GATES civic.21: ranking all 22
  amplifies the priors. Filed civic.23; canon authoring is the builder's.
- 2026-08-15 (builder) — RULING on §9: use all hoods. Shape (a), all ten ranked.
  Mechanism + proposed rank order + bench-first sequencing recorded as §9.1.
- 2026-08-15 (engine-sheet) — civic.21 EXECUTION PASS: needs no code. Two wrong
  reads corrected — the picker iterates the ledger core list with a `|| 1.0` default,
  so `neighborhoodWeights` is a tuning table, not a gate, and no separate placement
  pool is warranted. The whole gate is 10 blank `CoreSimRank` cells. Ranking turns on
  11 consumers across 6 phases at once and shifts rng forward-only. East Oakland and
  Baylight District (the flagship $2.1B build) are both unranked — no crisis, no
  cultural, no evening, no placement. Lever is the builder's by the loader's own
  docstring; three shapes offered.
- 2026-08-15 (engine-sheet) — §11 handoff added. GATE CORRECTED: SANDBOX 0814 is
  standing, so the live smoke was never a blocker — read all gate notes as "prove on
  bench first". Flagged the DEPLOY.md sheet-write replay obligation, which this plan
  is unusually exposed to since most cohorts are data fixes. Writer map completed for
  all 8 artifacts. Two more ensure* literals found (ensureFaithLedger,
  ensureTransitMetrics); Transit is station-keyed and explicitly NOT this pattern.
  ensure* verified update-or-append with no delete path, so ghost rows need manual
  removal while missing rows self-heal. Montclair present in 4 derived artifacts.
- 2026-08-15 (engine-sheet) — §10 added: answer to the tracker-vs-city-hall-ledger
  fork. Recommend keeping Initiative_Tracker as the legislative-object layer (+3
  authorship columns) and adding a conduct ledger as the act layer, on cardinality
  grounds — 6 initiatives in 103 cycles vs 9 seats acting weekly. The conduct ledger
  is simultaneously the approval driver (test 3), the omission recorder (test 1) and
  the initiative feeder (§7). Recommendation only, not approved.
- 2026-08-15 (engine-sheet) — §9 ROOT CAUSE: not a boundary defect, a feeder-pool
  defect. generateGenericCitizens draws from getCoreSimNeighborhoods_ (12 of 22
  hoods); the other 10 hold 15 citizens total against 825 in the core twelve, and
  every underpopulated district is underpopulated exactly to the extent its hoods
  sit outside CoreSimRank. Vega's three hoods are all outside it. Constraint:
  CoreSimRank order is rng draw order. Migration verified wealth-matched but capped
  at 2 households/cycle and relocates rather than creates — keep it, but it is not
  the repopulation mechanism.
- 2026-08-15 (engine-sheet) — §7 (the inversion: tracker is the arena; absorb
  Mon–Thu, express Sunday), §8 (absorption already computed in civic packs and
  discarded — test 2 needs wiring, not measurement), §9 (ESCALATION: districts do
  not map to population — Vega represents 1 citizen, Rivers 4, Tran 222). §3.4
  corrected: all-OPP is an accurate record of mayor-only authoring, not drift —
  nothing can create an initiative and the schema has 5 mayoral-action columns and
  0 authorship columns. §6.2 corrected: condition exposure is never zero, citizen
  exposure can be.
- 2026-08-15 (engine-sheet) — §6 added: builder direction on the initiative loop,
  wake-day conduct, and "nothing is free" recorded as given; the person-vs-mechanism
  line set as 3 tests. Current state fails all 3 on all 9 seats — the 4 frozen seats
  are a symptom, not the defect. E5 reframed to "approval = condition + conduct,
  delete the timer", gated on E1+E2. Rulings 3 and 4 resolved by the line.
- 2026-08-15 (engine-sheet) — Ruling 1 closed by research-build `bedbbedb`
  (INIT-006 is a data error, not canon); E4 and §5 updated. Two rulings now gate
  code (faction monoculture, dead seats); `City-wide` is a one-line data call.
- 2026-08-15 (engine-sheet) — Survey + plan created. Entity layer verified healthy
  (840/840 citizens, 9/9 offices); edge layer surveyed across 7 ledgers and the
  full engine file set. Writer-before-data rule generalised from civic.18 §7.
