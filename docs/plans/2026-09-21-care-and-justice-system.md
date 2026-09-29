---
title: Care and justice as one system — OARI, chaos cars, hospital stays, mental health, courts
created: 2026-09-21
updated: 2026-09-29
type: plan
tags: [civic, engine, draft]
sources:
  - Builder direction 2026-09-21 — after the OARI grading review, new gaps - a judicial data set or ledger, mental health data in the health systems; OARI, chaos cars, health data and hospital stays must align as one system
  - output/antigravity/2026-09-21-review-open-calls.md — OARI graded on violence only; the mission has no measure
  - docs/plans/2026-09-21-safety-lever.md — OARI grading decision, diversion count deferred
  - phase04-events/chaosCarsEngine.js, utilities/chaosCarsConfig.js — the event front end
  - phase04-events/generationalEventsEngine.js — hospital lifecycle, Phase 10 Hospital_Ledger persist
pointers:
  - "[[plans/2026-09-21-safety-lever]] — OARI grading decision this plan unblocks"
  - "[[plans/2026-09-19-civic-wake-game-loop]] — civic.38 parent"
  - "[[plans/2026-05-07-chaos-cars-engine]] — engine.11"
  - "[[SIM_DOCTRINE]] — a gate needs a movable input"
  - "[[index]] — registered same commit"
---

# Care and justice as one system

**Goal:** A crisis has a path a citizen can walk through and the sim can measure: a call happens, a response arrives (OARI van, ambulance, patrol), and the person ends up cared for, in hospital, or in the justice system, each step written to a record that the next step and the initiatives can read.

**Status:** Draft, builder direction captured 2026-09-21. Data-first map only. No design ruling, no build. Sim calls belong to the builder; mechanism to research-build; engine work to engine-sheet.

## What exists today (read 2026-09-21)

- **Chaos cars** (engine.11, Phase 4) fire 3-15 typed municipal-vehicle events a cycle. The vehicle list already includes an `oari_van` (`chaosCarsConfig.js:208`) whose outcomes include `deescalated` and `substance_intervention`; those raise an `OARI_INTERVENTION` story hook (`chaosCarsEngine.js:367`). Other outcomes include `medical_emergency` (hook `CITIZEN_HOSPITALIZED`) and `arrested` (hook `CITIZEN_ARRESTED`). The `chaos_cars` ledger row is the source of truth for each event.
- **Hospital_Ledger** is 4 rows, 11 columns (AdmissionId, POPID, Cause, AdmitCycle, StatusNow, DischargeCycle, Outcome, CyclesInCare). Causes are physical prose ("a workplace accident", "severe seasonal flu"). CORRECTION 2026-09-21: the chaos ambulance IS wired in — see the review below. An earlier line here said hospital stays do not come from chaos-car outcomes; that was wrong.
- **Nothing exists** for: a judicial record (an arrest has a story hook and nothing else — no charge, court date, disposition or sentence), a mental-health cause or care state, or a link from an OARI van event to a hospital stay or an arrest.

## Chaos cars review (research-build, 2026-09-21, read from code and the T6 reports)

**The fleet.** Ten typed vehicles, 3-15 dice-rolled events a cycle, each = vehicle x scope (citizen / neighborhood / business) x outcome x magnitude, written first to the `Chaos_Cars` ledger row and then to derived surfaces (`chaosCarsConfig.js` VEHICLE_CONFIGS, `chaosCarsEngine.js`). No-death rule enforced at config load and at the roll. Design intent (engine.11): break cookie-cutter equilibrium; chaos vehicles are crisis **igniters** (engine.67 step 8, builder doctrine "each has a generator to attach to").

| Vehicle | Weight | What it writes | Attaches to a system? |
|---|---|---|---|
| cop_car | 1.2 | ticket / pulled over / helped / **arrested** (15%); hood CrimeIndex down | Arrest = story hook + life-history tag only. No Status, no record. **No judicial system.** |
| fire_engine | 0.8 | false alarm / minor fire / major blaze; business revenue, hood Sentiment down | No injuries, no link to the ambulance or hospital |
| ambulance | 0.9 | minor injury / **medical emergency** (25%) / **workplace accident** (20%) | **Wired in.** Medical emergency flips the citizen to `critical`, workplace accident to `hospitalized`, with human-prose HealthCause; the generational health lifecycle, the career income hit and the household hospital-strain pool take over (`chaosCarsEngine.js:324-350`). Retirees excluded by guard. |
| oari_van | 1.0 | welfare check (50%) / **deescalated** (25%) / **substance intervention** (25%); hood Sentiment up, hood CrimeIndex down | Story hook + Stabilized/Recovery tag only. **Not linked to the OARI initiative (INIT-002), its deployment phase, or any hospital, treatment or mental-health record.** The van fires whether or not OARI exists. |
| building_inspector | 0.7 | passed / citation / forced closure; business revenue and headcount | Business_Ledger |
| garbage_truck | 1.1 | dumping cleared / missed pickup / sanitation delay; hood Sentiment and RetailVitality down | Hood metrics only |
| mail_truck | 1.0 | vital document / lost package / mail theft | Citizen tag, business revenue |
| ice_cream_truck | 0.5 | morale boost / block party / noise complaint | Hood Sentiment, EventAttractiveness |
| street_sweeper | 0.8 | beautification / parking ticket / traffic jam | Hood RetailVitality, Sentiment |
| pge_truck | 0.7 | planned shutoff / outage restored / transformer blowout | Hood Sentiment, business revenue; no link to the utilities system |

**Findings.**
1. **Ambulance to hospital already works.** The one care-chain link that exists is the ambulance igniter (and the heat-wave igniter in `generationalEventsEngine.js:261-312`). The design pattern for the missing links is already in the code: flip the citizen's real Status and let the existing lifecycle take over.
2. **Arrests and OARI outcomes are dead ends.** Both stop at a story hook. The OARI substance-intervention seed promises "a ride to treatment instead of a cell", and no treatment or mental-health record exists to receive it.
3. **OARI's van moves a different crime number than OARI is graded on.** The van writes hood `CrimeIndex` on Neighborhood_Map (a 0-1-scale pulse column); the safety lever and the delivery gate read `ViolentLevel` on Crime_Metrics. Two crime measures, no link.
4. **Too sparse to grade with.** Weights sum to 8.7, so the OARI van is about 11.5% of 3-15 events: roughly one van event a cycle for the whole city, about half of them welfare checks, aimed at random citizens and hoods, not at the hoods where violence is high (the T6 dry run drew 5 in 5 cycles). A per-hood diversion count from this engine alone would be 0 or 1 for most cycles.
5. **Events are dice, not conditions.** Nothing here raises call volume where violence or illness is high or where OARI has capacity. That is the chaos design (anti-cookie-cutter), and it is also why it cannot carry the grading job by itself.
6. **Persistence gap.** `Chaos_Cars` is a live tab (12 columns; 66 rows as of 2026-09-05) but is not in the local beats dump, so packs, counters and desks cannot read it from disk.

**Direction to bring to the builder (mechanism recommendation, not a ruling).** Keep chaos as the crisis igniter for individual lives. Add a condition-driven service layer beside it: per hood, per cycle, call volume from the live Crime_Metrics and health levels; OARI capacity from INIT-002's deployment state; each call resolving to an outcome (de-escalated, treated, admitted, arrested) that writes the real Status and a record, exactly as the ambulance does today. OARI is then graded on diversion (calls OARI resolved that would otherwise have been arrests or admissions) in its own hoods, from data with enough volume to mean something.

## The gaps

1. **Judicial data set or ledger.** An `arrested` outcome ends at a story hook. The care-and-justice path needs a record of what happened next (charged, diverted to OARI or treatment, released, held), readable by the initiatives and by desks.
2. **Mental health in the health systems.** Hospital causes are physical only. Mental-health and substance crises need to be a cause and a care state, so an OARI `substance_intervention` can end in a stay or a referral.
3. **One chain, not four tables.** Chaos-car event → response (OARI van, ambulance, patrol) → outcome (deescalated, treated, admitted, arrested) → record (Hospital_Ledger, judicial ledger) → what OARI is graded on. Today the events are dice rolls that write a story hook and a life-history line; they do not feed the records, and nothing reads the OARI events to grade OARI.
4. **OARI's real measure.** The diversion count deferred in the safety-lever plan cannot come from the chaos van alone (about one event a cycle citywide, random hoods; see review finding 4). It needs the condition-driven service layer above.

## First moves (research-build, read-only)

1. DONE 2026-09-21: chaos cars reviewed (above) and the live `Chaos_Cars` tab pulled read-only (91 rows, C100-C108; saved `output/engine-sheet/2026-09-21-chaos-cars-live-pull.json`, not committed to canon — a working pull). Measured: `oari_van` is 15 of 91 events (16.5%) — 10 `welfare_check`, 5 `substance_intervention`, zero `deescalated`. Citizen-scope targets resolved against the live ledger for neighborhood. **Zero of 15 OARI-van events, across all 9 cycles, landed in OARI's own target hoods** (West Oakland, Fruitvale, East Oakland — the INIT-002 deployment hoods). The 8 neighborhood-scope events hit Rockridge(2), Laurel(2), Lake Merritt, Ivy Hill, Uptown, Glenview; the 7 citizen-scope events resolved to Piedmont Ave, Lake Merritt(2), Temescal, Chinatown, Jack London, Downtown. This sharpens finding 4 from an estimate ("thin, 0 or 1 a cycle") to a measured fact: the chaos van has never once fired where OARI operates, over the full C100-C108 window. It cannot be OARI's grading data source in its current form — a random citywide roll only reaches a 3-hood target by chance, and 0/15 is that chance realized.
2. Trace how a `medical_emergency` and an `arrested` outcome could reach the Hospital_Ledger writer and a judicial record, with the wiring card before any cut.
3. **RULED 2026-09-21 (builder): build the condition-driven service layer** — the existing safety-lever plan (`docs/plans/2026-09-21-safety-lever.md`) already depends on it for OARI's real grading, and the chaos-van path is now measured as unreachable (0/15 in OARI's own hoods, above). Judicial ledger and mental-health state rulings are still open; the service layer is scoped starting now, in parallel.

## Service layer scoping (research-build, 2026-09-21 — design only, no build)

**Relationship to the safety lever (does not duplicate it):** the safety-lever plan already designs a passive, always-on bounded relief on `ViolentLevel` for a deployed initiative — no discrete calls, no citizen, no judicial or hospital link. That mechanism ships or doesn't on its own Tasks 1-7 and is unaffected by this. The service layer below is a different, event-based mechanism: individual crisis calls that resolve to a citizen-level outcome, feeding the judicial ledger, mental-health states and OARI's real diversion count. Both can exist; they read different inputs and write different things. Do not let one implementation absorb the other's job.

**Shape, following the ambulance/heat-wave igniter pattern already proven in `generationalEventsEngine.js` and `chaosCarsEngine.js:324-350` (flip real Status, let existing lifecycle take over):**

- **Call volume, per hood per cycle:** driven by the hood's own condition — live `Crime_Metrics.ViolentLevel` and health levels (`Sick` count, Hospital_Ledger admissions), not a flat dice roll. A hood with worse conditions generates more calls. This is the missing link chaos cars don't have (finding 5 in the review above): conditions, not chance, should set volume.
- **OARI capacity, per hood per cycle:** derived from INIT-002's deployment state (Stage, ImplementationPhase) and target hoods — a call in a hood OARI doesn't serve cannot be answered by OARI. This reuses Task 3's eligibility whitelist from the safety-lever plan (`implementation-active`, `dispatch-live`, `pilot-active`, `operational`).
- **Call resolution:** each call draws from a fixed outcome set — de-escalated (OARI), treated/admitted (hospital), arrested (judicial) — gated by capacity: if OARI has no capacity in that hood/cycle, the call defaults to the non-OARI path (arrest or admission), the same way an ambulance call resolves today regardless of what else exists.
- **Writes:** de-escalated → a life-history tag, no ledger row (the citizen was fine). Treated/admitted → the existing Hospital_Ledger writer, Cause = a mental-health or crisis string (ruling 2 needed first). Arrested → the new judicial ledger (ruling 1 needed first).
- **OARI's diversion count:** de-escalated + OARI-attributed substance interventions in OARI's own hoods, against the arrest/admission count that would otherwise have occurred in the same hoods. This is the real measure the safety-lever plan deferred; it supersedes grading OARI on `ViolentLevel` alone once it exists, but does not require removing that lever — the two can run side by side and be reconciled later.

**Open before any build (this is scoping, not a ruling to proceed to code):** rulings 1 and 2 above (judicial ledger shape, mental-health states) gate the write side. The call-volume formula (how conditions map to a count) needs its own bounded design and bench pair, same discipline as the safety lever. No engine, config or schema change is proposed here.

## Rulings (drafted 2026-09-26, research-build — mechanism is mine, three questions below are the builder's)

**Wiring card pulled first (`Hospital_Ledger`, `phase10-persistence/buildCyclePacket.js:844`, `persistHospitalLedger_`):** its writer is hardcoded end to end — sheet name, column indices, row-ID prefix (`H-C`), event source (`S.hospitalEvents`), census output (`S.hospitalCensus`, itself orphaned — no engine-phase reader, only `buildWorldSummary.js` reads it post-engine for the snapshot), health-state enums. Writes direct (`persistWithRetry_`/`appendRowWithRetry_`) inside `Phase10-CyclePacket`, before `Phase10-ExecuteIntents` — no intent queue. A second ledger cannot fold into this function; it needs its own advancer built the same way. This settles the fold-vs-add question the first-moves section left open: **it's an add.**

**Status vocabulary checked:** no `detained`/`held`/anything justice-adjacent exists in the Status column today. `hospitalized`/`critical` are read at 10+ call sites to pull a citizen out of work/household participation (`runCareerEngine.js:935`, `runHouseholdEngine.js:563`, `civicInitiativeEngine.js:787,803,936,956`, `updateCivicLedgerFactions.js:268`, `generateCivicModeEvents.js:401`, `generateMediaModeEvents.js:351`, `generationalWealthEngine.js:582`, `prePublicationValidation.js:251`). Adding a real justice Status touches all of them — that's the actual cost of making an arrest count as a fate the way illness does.

### Ruling 1 — Judicial ledger shape

**Mechanism (rb):** new tab `Judicial_Ledger`, same column shape as `Hospital_Ledger` — `CaseId, POPID, ChargeCause, ArrestCycle, StatusNow, ResolveCycle, Outcome, CyclesHeld, SourceEvent`. New dedicated advancer `persistJudicialLedger_`, built 1:1 on the `persistHospitalLedger_` pattern, same phase position (Phase10-CyclePacket, before ExecuteIntents), direct writes, row-ID prefix `J-C`, event source `S.judicialEvents`, census `S.judicialCensus` (snapshot-only, same non-wired shape as `hospitalCensus`, unless the builder wants it live-gating something).

**Builder's call (a):** does an arrest flip citizen Status (e.g. to `detained`), pulling them from work/household the same way `hospitalized` does — touching the 10+ read sites above? **My default: yes** — an arrest should cost a citizen something, the same way illness does; a story-hook-only arrest is a fate that doesn't drive anything (universal-protagonism doctrine). This is the one line that turns a ledger row into a real gate, so it's not mine to default silently.

**Builder's call (b):** the outcome split (released / charged-diverted / charged-held) as a World_Config rate table (rate-and-severity-are-the-dials, never a hard gate). **My default:** released 40%, diverted-to-OARI/treatment 25%, held 35% — starting numbers, tunable like every other World_Config rate.

### Ruling 2 — Mental-health care states

**Mechanism (rb):** no new tab, no new advancer. Mental-health/substance crisis is a `Cause` string on the *existing* `Hospital_Ledger` — its `Cause` column is already free text ("a workplace accident", "severe seasonal flu"); "an acute mental health crisis" / "a substance-related medical emergency" cost zero schema change and reuse the whole hospitalized/critical lifecycle as-is. Fix, not add.

**Builder's call:** is OARI's "ride to treatment" a bed (a real `Hospital_Ledger` row, `CyclesInCare` ticking like any admission) or a referral with no bed (a life-history tag only)? **My default:** a bed for `substance_intervention`-class outcomes — matches the "ride to treatment instead of a cell" framing, it should look like care, not paperwork — and a life-history tag only for `deescalated`/`welfare_check`-class outcomes, where nobody was admitted. This is the one fork that changes what the service layer writes; everything in §Service layer scoping above follows once it's answered.

### Rulings CLOSED (builder-direct 2026-09-26)

All three open calls ruled — the recommended defaults above, as stated:

1. **Arrest flips Status.** A new `detained` Status value pulls the citizen from work/household participation for the ledger's `CyclesHeld` duration, read at the same 10+ call sites `hospitalized`/`critical` already gate (`runCareerEngine.js`, `runHouseholdEngine.js`, `civicInitiativeEngine.js`, `updateCivicLedgerFactions.js`, `generateCivicModeEvents.js`/`generateMediaModeEvents.js`, `generationalWealthEngine.js`, `prePublicationValidation.js`).
2. **Outcome rate table (World_Config):** released 40% / diverted-to-OARI-or-treatment 25% / held 35%.
3. **OARI's "ride to treatment":** a real `Hospital_Ledger` bed (`CyclesInCare` ticking) for `substance_intervention`-class outcomes; a life-history tag only for `deescalated`/`welfare_check`-class outcomes.

**Ready for engine-sheet:** build `Judicial_Ledger` (`CaseId, POPID, ChargeCause, ArrestCycle, StatusNow, ResolveCycle, Outcome, CyclesHeld, SourceEvent`) + `persistJudicialLedger_` (Phase10-CyclePacket, before ExecuteIntents, modeled 1:1 on `persistHospitalLedger_` at `phase10-persistence/buildCyclePacket.js:844`, direct writes, row-ID prefix `J-C`, event source `S.judicialEvents`, census `S.judicialCensus` snapshot-only); wire `detained` into the 10+ Status read sites listed above; add the three World_Config rate keys; land the mental-health `Cause` strings on the existing Hospital_Ledger path (no schema change there). Wiring card for the read-site touch list: `engine-wiring` on `Status` / the specific functions above, before the cut.

### Later (folded in from the 2026-09-26 builder proposal, not part of this build)

- **The judicial system is a civil system too, not only crime (builder direction 2026-09-29).** Build-on vehicles once the case flow proves: divorce goes through the court; lawsuits; court fees and fines as a new way to tax. Schema room already exists: a civil case is a new `EntryType` on `Judicial_Ledger` (e.g. `divorce`, `lawsuit`) with no arrest and no custody — the census counts custody only for `pending`/`held`, so civil cases never inflate it. **Why (builder 2026-09-29):** the sim mostly raises citizens' pay and has few ways to take money back out — the court is the money sink, the system used to tax. **Where it lands (builder, tentative — "maybe"):** court revenue goes into the city budget (live `City_Treasury` tab). Rates, who pays and the treasury path are still sim calls — confirm with the builder before designing. Not part of this build.
- **City revenue, wider than the court (builder direction 2026-09-29):** three feeds into the city treasury — judicial (fees, fines), business tax, housing tax — and the treasury "could even" break out by council district. This is its own build (ROLLOUT engine.271), not part of care and justice; the court is one of its three feeds.
- Judges as authored personas (civic-office pattern — canon philosophy files, not dials), once a case flow exists to judge.
- Jury duty as a Tier-4→named promotion vehicle (universal-protagonism doctrine).
- Precedent ledger as the folk-memory/institutional-memory answer — a consequence of the case ledger existing, not a separate build.
- Phase 37 (Arc State Machines, `docs/plans/BACKLOG.md:447`, still NOT STARTED) is the natural home for a case that runs multi-cycle; referenced for later, not a prerequisite here.

## Schema — receipt and census (engine-sheet, 2026-09-29 — reviewed; arithmetic built, no engine wiring, no tabs)

Task 2 of [[../research/2026-09-28-codex-care-justice-intake-plan]] (accepted 2026-09-29, filed to research). Outside review: `output/antigravity/2026-09-29-review-care-justice-schema.md`, findings verified against code and folded in below. This section is the one specification; the amendment's tasks 3–11 build against it. The new tab `Care_Justice_Census` and the test file were approved by the builder 2026-09-29; `Judicial_Ledger` is already ruled (§Rulings CLOSED). **Built (Task 3):** `utilities/careJusticeAccounting.js` + `scripts/careJusticeAccounting.test.js` — pure functions, called by nothing yet.

### Read before drafting (2026-09-29)

| Fact | Source |
|---|---|
| Live `Hospital_Ledger` = 11 columns, 3 admissions, 1 open (POP-00801, hospitalized since C106); the open row is 8 cells long, trailing cells absent | live sheet read |
| `Judicial_Ledger`, `Care_Justice_Census` do not exist live | live sheet read |
| Writer counts five states as open | `phase10-persistence/buildCyclePacket.js:811` |
| Open rows indexed by POPID alone — one open admission per citizen | `buildCyclePacket.js:868-873` |
| Missed-admission reconcile appends a row and counts `missedAdmitsReconciled`, not `admitsThisCycle` | `buildCyclePacket.js:974-988`, `:993-1001` |
| `CyclesInCare` written only on close | `buildCyclePacket.js:906-908`, `:950-952` |
| Illness talk-back counts every blank-`DischargeCycle` row in the tab | `phase03-population/applyDemographicDrift.js:225-235` |
| `S.hospitalCensus` has no reader; the world summary builds its own from the tab export with other field names | `buildCyclePacket.js:1002`, `scripts/buildWorldSummary.js:1476` |
| Tracked hood table ÷ city population ratio already computed each Cycle | `phase03-population/updateNeighborhoodDemographics.js:124-134` |
| Chaos events already carry an `eventId` | `phase04-events/chaosCarsEngine.js:44`, `:573` |
| `schemas/SCHEMA_HEADERS.md` is generated from the live sheet | its own header; `utilities/exportSchemaHeaders.js`, `scripts/regenSchemaHeaders.js` |
| Status read sites: two line numbers in §Rulings drifted — `runHouseholdEngine.js:587`, `runCareerEngine.js:936`; the rest hold | grep 2026-09-29 |

### Reconciling the two specs

1. **Ruling 2's "no schema change on Hospital_Ledger" is superseded by gate R1** (contract adopted). Mental-health and substance causes still ride the existing `Cause` text; the four typed columns below are added beside it. `Cause` is never the counting key.
2. **`S.judicialCensus` / `S.hospitalCensus` as snapshot objects are retired as the census carrier.** Nothing reads them. The persisted census tab is the readable path. `S.hospitalCensus` stays as-is until Task 8 so no current log line changes.
3. **Two occupancy measures, both named.** `in-care` = the five open states (today's behaviour). `beds` = `hospitalized` + `critical` only (gate R2). The Phase-3 talk-back keeps its current numerator until Task 10 moves it to a scope-matched measure; this schema does not change the feedback loop.
4. **`SCHEMA_HEADERS.md` is not hand-edited.** It regenerates after the tabs exist (Task 8 deploy setup). Until then this section is the schema of record; `SIMULATION_LEDGER.md` gains the `detained` Status value at Task 6.

### Shared receipt identity

`SourceEventId` = `<SourceSystem>:<source event key>:<POPID>`. Chaos sources use the existing chaos `eventId`; engine sources with no event id use `C<cycle>:<type>`. It is independent of the row id. Rules:

- Same `SourceEventId` seen twice → one row, one intake. Replay-safe.
- Same POPID, later distinct `SourceEventId` → a new row. Row ids stay `H-C<cycle>-<POPID>` / `J-C<cycle>-<POPID>`; a second row for the same citizen in the same Cycle takes suffix `-2` — the writers build ids without a collision check today (`buildCyclePacket.js:893`, `:980`), so the suffix is a Task 8 writer change.
- A transfer reuses the originating `SourceEventId` on the receiving row and links the sending row's id; it is a movement, not a second intake.

### `Hospital_Ledger` — 4 columns appended (L–O); A–K untouched

| Col | Header | Values |
|---|---|---|
| L | IntakeType | `injury` · `illness` · `heat` · `mental-health-crisis` · `substance-treatment` · `unclassified` |
| M | SourceSystem | `ambulance` · `oari` · `health-engine` · `heat-wave` · `judicial-transfer` · `reconcile` |
| N | SourceEventId | receipt key above |
| O | TransferFromId | `CaseId` of the judicial row, else blank |

- The 3 existing rows stay blank in L–O and count as `unclassified`. No type is inferred from `Cause` prose.
- `SourceSystem = reconcile` marks a missed-admission repair: a **correction**, never a same-Cycle intake.
- Bed vs care visit is derived from `StatusNow`, not stored.
- Open-row duration = current Cycle − `AdmitCycle`, derived by readers; `CyclesInCare` remains the closed-row value.

### `Judicial_Ledger` — new tab, 20 columns (A–T)

Extends the 9 ruled columns (all kept) for gates R3–R5.

| Col | Header | Values / note |
|---|---|---|
| A | CaseId | `J-C<OpenCycle>-<POPID>` |
| B | POPID | |
| C | Name | hospital parity |
| D | Neighborhood | needed for hood-scope census |
| E | ChargeCause | descriptive text, never a counting key |
| F | ChargeGravity | `minor` · `serious` · `grave` — scales held length 1–4 (R3) |
| G | EntryType | `arrest` (patrol) · `investigation` (grave conduct, R5) |
| H | OpenCycle | Cycle the row opened |
| I | ArrestCycle | blank while an investigation has not become an arrest |
| J | DecisionCycle | `ArrestCycle + 1` (R3) |
| K | StatusNow | `investigating` · `pending` · `held` · `diverted` · `released` · `closed` |
| L | LastTransitionCycle | |
| M | HeldUntilCycle | set at decision when outcome is held |
| N | ResolveCycle | blank = open case |
| O | Outcome | `released` · `diverted` · `held-served` · `no-arrest` · `deceased` · `<x>-reconciled` |
| P | CyclesHeld | written on close; derived while open |
| Q | PriorStatus | the citizen's Status at arrest — what release restores (R4) |
| R | SourceSystem | `patrol` · `conduct` · `reconcile` |
| S | SourceEventId | receipt key above |
| T | TransferToId | `AdmissionId` when diverted to a treatment bed |

`investigating` does not change the citizen's Status; only an arrest sets `detained`. One open case per POPID. A second arrest inside a sim year is found by counting this citizen's prior rows, no column needed.

**Custody and care overlap (R4).** Custody and care are separate records; Status holds one value by precedence: `deceased` > the five health states (`critical`, `hospitalized`, `serious-condition`, `injured`, `recovering`) > `detained` > prior life-state. **Care wins the Status column; the open case row carries custody.** Reason: the ghost-bed reconcile (`buildCyclePacket.js:930-959`) closes the hospital row of any citizen whose Status is not a health state, and the health lifecycle (`generationalEventsEngine.js:382`) only advances citizens in one — `detained` above any of them would release a bed and stall recovery. A citizen in care with an open case is still in custody for the census and for participation (both are already gated out by the health state). When care ends, Status becomes `detained` if the case is still open, else `PriorStatus`. Release restores `PriorStatus` unless a health state is live. The case clock runs throughout.

### `Care_Justice_Census` — new tab (approved 2026-09-29, not yet created), 22 columns

Row key: `Cycle + System + GeographicScope + Neighborhood + IntakeType`.

| Group | Headers |
|---|---|
| Identity | Cycle · System (`hospital` / `judicial`) · GeographicScope · Neighborhood · IntakeType |
| Coverage | PopulationBasis · CoveredPopulation · MethodVersion · Completeness |
| Intake | TotalIntakes · TrackedIntakes · OtherResidentIntakes |
| Load | OccupancyMeasure · OpeningOccupancy · ClosingOccupancy · TrackedOccupancy · OtherResidentOccupancy · BedsOccupied |
| Movement | TransfersIn · TransfersOut · Exits · Corrections |

- **GeographicScope:** `neighborhood` (one of the table's hoods) · `unallocated` (city population minus the hood table's sum; Neighborhood blank; never a named place) · `city` (derived sum of the other two). The disjoint scopes are the hoods plus `unallocated`; a consumer picks one scope and never adds `city` to the others.
- **PopulationBasis:** `hood-table` · `city-remainder` · `city-total`. `CoveredPopulation` is read each Cycle, never stored as a constant.
- **Hospital occupancy is `in-care`; beds are their own column (changed at build, 2026-09-29).** Invariant B cannot hold on a `beds` measure: an `injured` admission is an intake with no bed, and a step-up from care visit to bed is a movement with no intake. So the hospital books balance on `in-care` (the five open states) and `BedsOccupied` carries the R2 number — `hospitalized` + `critical`, tracked plus other-resident. "The hospital is full" reads `BedsOccupied` against capacity. Blank on judicial rows.
- **OccupancyMeasure:** hospital `in-care`; judicial `in-custody` = open cases with `StatusNow` `pending` or `held` (an arrest enters custody the Cycle it happens, so intake and occupancy move together). Open-case counts that include investigations are read from the ledger, not the census.
- **Judicial IntakeType** uses the ledger's `EntryType`: `arrest` · `all`. An intake is an arrest. An investigation is not an intake and not custody; it appears in the census only when it becomes an arrest, in that Cycle. Investigations that close `no-arrest` stay in the ledger alone.
- **Exit vs transfer:** a `diverted` outcome with `TransferToId` set is a `TransfersOut` (and a `TransfersIn` on the hospital side); `diverted` without a bed, `released`, `held-served` and `deceased` are `Exits`. Never both.
- **IntakeType:** the ledger enums plus `all`. **Every typed row is written every Cycle for every scope, zero included** (review finding: sparse rows let a reader that filters by type read a failed or missing scope as zero). Every row carries its own `Completeness`. 9 rows per scope (hospital 7, judicial 2); 22 hoods + `unallocated` + `city` = 216 rows a Cycle, one batched write.
- **Completeness:** `complete` · `incomplete` (a write in the set failed; reconciled next Cycle) · `unavailable` (source missing — counts blank, never 0).
- **Completeness is checked, not declared:** the tracked movement sum must equal the ledger's open rows for that cell; a mismatch marks the whole scope `incomplete` and carries to the city row.
- A tracked citizen whose neighbourhood is not in the hood table is counted in `unallocated`.
- Tracked citizens are counted inside the hood they live in, once. Other residents are numbers only: no POPID, no name.

### Requirements the review put on later tasks

| Task | Requirement | Evidence |
|---|---|---|
| 6 | **Custody re-assert.** When care ends the health lifecycle writes `active` with no knowledge of the case. The judicial lifecycle runs after it in the same Cycle, before the career and household engines, and sets `detained` on any citizen with an open `pending`/`held` case whose Status is not a health state or `deceased`. Self-healing every Cycle, same pattern as the ghost-bed reconcile. | `generationalEventsEngine.js:390`, `:417` |
| 8 | Hospital writers build 15-wide rows and stamp L–O; missed-admission rows stamp `SourceSystem = reconcile`, `IntakeType = unclassified`. | `buildCyclePacket.js:893-895`, `:980-981` |
| 8 | New writes address columns by header name. The existing range writes at columns 7–11 stay valid only because L–O are appended, never inserted. | `buildCyclePacket.js:886`, `:906`, `:950` |
| 8 | Ghost-release outcome is `recovered-reconciled` for any non-deceased Status. With care ranked above `detained` this path is not reached by a custody case; the judicial writer's own reconcile uses `<outcome>-reconciled`. | `buildCyclePacket.js:948-952` |
| 8 | **First-census bootstrap.** Opening occupancy comes from last Cycle's closing; on the first census Cycle there is none. Each ledger row already open (POP-00801 today) enters as one `correction` receipt — a correction, not an arrival. | test F |
| 8 | **Order inside Phase 10.** The census reads the ledgers' open rows after `persistHospitalLedger_` (and the judicial writer) finish their reconciles in the same pass. | `buildCyclePacket.js:917-988` |
| 8 | **Replay keys have one carrier:** rebuilt each run from the ledgers' `SourceEventId` columns (hospital N, judicial S). No separate key store. | `foldCareJusticeReceipts_` |
| 8 | Judicial open rows are passed with `StatusNow`; only `pending`/`held` count in custody (enforced in the arithmetic). | `careJusticeAccounting.js` |
| deploy | `utilities/careJusticeAccounting.js` is clasp-pushed and rides the next PROD push as uncalled code — no runtime effect; named in that push's smoke-test note. | `.claspignore` |
| 10 | Talk-back numerator moves from every open row to a scope-matched measure — already scheduled; unchanged until then. | `applyDemographicDrift.js:225-235` |

### Invariants the tests assert

| # | Invariant |
|---|---|
| A | `TotalIntakes = TrackedIntakes + OtherResidentIntakes`, every row |
| B | `ClosingOccupancy = OpeningOccupancy + TotalIntakes + TransfersIn − Exits − TransfersOut + Corrections` |
| C | `city` row = sum of hood rows + `unallocated`, per System and IntakeType |
| D | Same `SourceEventId` folded twice = folded once |
| E | Same POPID, second distinct receipt **after the first row closed** = second row, second intake. A second receipt while a row is open is a transition on that row, not an intake (the writer holds one open row per POPID, `buildCyclePacket.js:868-873`) |
| F | `reconcile` receipt raises `Corrections` and occupancy, never `TotalIntakes` |
| G | Missing source → `unavailable`, counts blank; known none → `0`, written explicitly on the typed row |
| H | Hospital→judicial or judicial→hospital transfer: one person, `TransfersOut` on one side, `TransfersIn` on the other, no intake on the receiving side |
| I | Zero named events with nonzero other-resident demand still produces rows |
| J | `BedsOccupied` counts only `hospitalized` + `critical`; an `injured` admission is an intake with no bed |

**Test file:** `scripts/careJusticeAccounting.test.js`, synthetic rows only, no sheet access — 55 assertions, landed green with the arithmetic in one commit. Six deliberate breaks of the arithmetic (no dedup, transition as intake, five states as beds, unavailable as zero, lost write undetected, transfer as intake) each fail it.

### Review outcome (2026-09-29)

| Question | Result |
|---|---|
| Care above `detained`: bed dropped or recovery stalled? | No. Found instead: recovery erases custody → custody re-assert added (Task 6) |
| Invariant B under `in-custody` | Holds across arrest, decision, held, release, transfer |
| `unallocated` scope invents a neighbourhood population? | No |
| Sparse typed rows safe? | No → dense rows adopted |
| `-2` suffix vs the POPID-keyed open index | Index unaffected; suffix generation is a writer change (Task 8) |

## Changelog

- 2026-09-29 (engine-sheet) — Builder direction: city revenue has three feeds (judicial, business tax, housing tax) into the treasury, possibly split by district; filed as engine.271.

- 2026-09-29 (engine-sheet) — Builder direction: the court is the sim's money sink (pay mostly rises); court revenue tentatively feeds the city budget.

- 2026-09-29 (engine-sheet) — Builder direction recorded in §Later: the court carries civil matters (divorce, lawsuits, fees as tax) once the case flow proves.

- 2026-09-29 (engine-sheet) — Builder approved the census tab and test file. Task 3 built: pure census arithmetic + tests. Spec change forced by the build: hospital books balance on `in-care`, beds move to their own `BedsOccupied` column (22 columns).

- 2026-09-29 (engine-sheet) — Outside review folded in: dense typed census rows, custody re-assert after care ends, writer requirements for Tasks 6/8/10. Amendment accepted and filed to research.

- 2026-09-29 (engine-sheet) — §Schema first-review fixes: care outranks `detained` in Status (ghost-bed reconcile would release the bed otherwise); judicial occupancy is `in-custody` not `held`; diverted is a transfer or an exit, never both; investigations are not intake.

- 2026-09-29 (engine-sheet) — §Schema drafted from live sheet + code reads; reconciles Ruling 2 with gate R1, retires the `S.*Census` snapshot carrier, names two occupancy measures. DRAFT: advisor then one outside review before any build; new tab and test file await the builder.

- 2026-09-26 (research-build) — Builder ruled all three open calls (§Rulings CLOSED). Build spec written, ready for engine-sheet.

- 2026-09-26 (research-build) — Rulings 1-2 drafted: judicial ledger is an ADD not a fold (Hospital_Ledger advancer confirmed hardcoded); mental health folds into existing Cause column. §Later ideas folded from the 2026-09-26 builder proposal.

- 2026-09-21 (research-build) — Service layer scoped (design only): shape, relationship to the safety lever, write targets, OARI diversion measure; rulings 1-2 still gate the build.

- 2026-09-21 (research-build) — Builder ruled: build the condition-driven service layer now (existing safety-lever system depends on it); scoping starts.

- 2026-09-21 (research-build) — Live Chaos_Cars pull (91 rows, C100-108): confirmed zero OARI-van events in OARI's own target hoods across the full window; sharpens the chaos-review finding from estimate to measured fact.

- 2026-09-21 (research-build) — Chaos cars reviewed: ten-vehicle table, ambulance already igniting the hospital lifecycle, arrests and OARI outcomes dead-end at story hooks, van moves a different crime number than OARI is graded on, volume too thin to grade with; earlier hospital claim corrected.
- 2026-09-21 (research-build) — Filed from builder direction after the OARI grading review; data-first map of chaos cars, Hospital_Ledger and the missing judicial and mental-health records.
