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

### 3.4 One faction leads every initiative

All six live initiatives carry `LeadFaction=OPP`. Approval treats
`supportedByFaction = (init.leadFaction === faction)` and `owns = isMayor ||
supportedByFaction`, so **CRC and IND members can never own an initiative** — they
are structurally always the opposition, in every case the sim has ever produced.

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

**They are fixed by exposure, and exposure can never be zero.** Every district
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

## Changelog

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
