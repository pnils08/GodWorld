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

- **The judicial system is a civil system too, not only crime (builder direction 2026-09-29).** Build-on vehicles once the case flow proves: divorce goes through the court; lawsuits; court fees and fines as a new way to tax. Schema room already exists: a civil case is a new `EntryType` on `Judicial_Ledger` (e.g. `divorce`, `lawsuit`) with no arrest and no custody — the census counts custody only for `pending`/`held`, so civil cases never inflate it. **Why (builder 2026-09-29):** the sim mostly raises citizens' pay and has few ways to take money back out — the court is the money sink, the system used to tax. **Where it lands (builder, tentative — "maybe"):** court revenue goes into the city budget (live `City_Treasury` tab). Rates, who pays and the treasury path are still sim calls — confirm with the builder before designing. Not part of this build. **Weight (builder 2026-09-29, Task 5 kickoff):** "more for taxing, settling citizen disputes, and the occasional arrests and crime" — civil cases (fees, disputes between citizens) are the court's main load; crime is the occasional case. Task 5's lifecycle is built generic over `EntryType` so civil types drop in without a rewrite.
- **The court is the city's revenue engine; crime data becomes money (builder direction 2026-09-29, Task 5 kickoff).** "This is what pulls in the city's money for its budget, property taxes as well; where a crooked civic member could end up, and trial on a Tier-1 citizen scandal. Crime is an element because we track crime data, so this is where that crime data can become money for the sim." Read for mechanism: court revenue from crime is driven by the tracked crime aggregates (`Crime_Metrics`, hood-scope) at city scale — the same other-resident pattern as Task 7, never by the ~1-per-7-Cycles named arrests; aggregates still never name a defendant (R5). Named cases are the stories: a crooked civic official, a Tier-1 scandal trial — authored entry types, not dice (top-tier-is-authored doctrine). Property tax sits with engine.271. **Tracked citizens pay from `NetWorth` (builder 2026-09-29):** a named defendant's fine or fee is taken from their own net worth — the money sink on the citizen side; the aggregate crime revenue is the city side. Rates and the treasury path stay sim calls — design with the builder.
- **Rarity is by design; the tracked subset can't carry the court (builder direction 2026-09-29, after Task 5 went live).** "Fines and fees would be tough; want to avoid having the 940 citizens we track in and out of jail to make this work, so the rarity is by design, and if someone starts to get multiple arrests that's the math working — but how we make this operate is tricky since we operate a small subset of the city." Engine-sheet recommendation (not yet ruled): two layers, the stabilization-fund pattern (engine.259: a fixed per-Cycle spend where the untracked city is the rest). **City layer** — the court's volume and money come from `Crime_Metrics`, which already runs citywide per hood every Cycle: live C109 = 138 `IncidentCount` across 22 hoods (4–8 each), `ClearanceRate` avg 0.21 → ~29 cleared cases a Cycle. Cleared cases × a fee → one `City_Treasury` entry a Cycle (court fines and fees), no names. Open sim call: what scale `IncidentCount` is on (29 cases, or 29 × the 1:443 sample). **Named layer** — tracked citizens only reach court through events already in the engine (patrol arrest now; divorce, business failure, authored scandal and official-corruption cases later), stay rare, and pay from `NetWorth`. Civil filing volume at city scale is a later sim call.
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

### `Judicial_Ledger` — new tab, 21 columns (A–U)

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
| U | Counterparty | blank for crime; the other party of a civil case (POPID, `BIZ-` or civic office id) — reserved so civil entry types need no schema change |

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
| 6 | **Health recovery restores the prior life-state, not `active`.** The ordinary-health path admits `retired` citizens and the lifecycle discharges them to `active`, resurrecting a career — the thing the chaos and heat guards exist to prevent. The R4 `PriorStatus` restore applies to care exits too; the ordinary-health receipt's `from` carries the pre-admit state, **lowercased** (`:366`) while the ledger stores `Retired` capitalized (bench C131) — restore the ledger's own casing or confirm no reader is case-sensitive. Found by the Task 4 review. | `generationalEventsEngine.js:371-447`, `:598-646`; codex Task 4 review finding 5 |
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

### Task 4 cut — typed admission receipts (engine-sheet, 2026-09-29 — BENCH-PROVEN, PROD push pending)

Outside review: `docs/research/2026-09-29-codex-care-justice-task4-cut.md` — 7 findings, all verified against code and folded below. Task 4 produces typed receipts **in memory** (`S.hospitalEvents`); the ledger writer ignores the new fields until Task 8 stamps L–O.

**Read before drafting.**

| Fact | Source |
|---|---|
| `S.hospitalEvents` has 3 push sites, all in `runGenerationalEngine_`; readers are `finalizeCycleState_` (Phase 9, carry) and `persistHospitalLedger_` (Phase 10) | wiring card; `generationalEventsEngine.js:317`, `:405`, `:642`; `finalizeCycleState.js:186`; `buildCyclePacket.js:821` |
| Chaos ambulance sets `critical` (`medical_emergency`) / `hospitalized` (`workplace_accident`) and pushes **no** hospital event | `chaosCarsEngine.js:343-352` |
| Chaos runs Phase 4, before `Phase5-Generational`; the victim's `StatusStartCycle = cycle`, so the lifecycle advances it the **same Cycle** at duration 0 (`short` bracket) | `godWorldEngine2.js:329`, `:369`; `generationalEventsEngine.js:367-386`, `:680` |
| Lifecycle returns null on an early `stay` (no event) in every branch — hospitalized/injured/serious-condition under duration 5, critical/recovering under 3 | `generationalEventsEngine.js:727`, `:752`, `:776`, `:800`, `:824` |
| A citizen in a health state never reaches the new-health check the same Cycle — the lifecycle block ends in `continue` — so no second admission receipt for one POPID in one Cycle | `generationalEventsEngine.js:442` |
| Heat wave flips Status then the per-row loop advances the same victim the same Cycle, despite the comment "takes over from next cycle" | `generationalEventsEngine.js:266-302` vs `:382` |
| The chaos `eventId` is drawn from rng **after** `writeCitizenEvent_` returns | `chaosCarsEngine.js:562-573` |
| Missed-admission reconcile is the fallback for any path that sets a health Status without an event; the sports roster injury it cites (bench 0814 C104, engine.77) is a historical case — no current Status writer outside chaos/generational was found | `buildCyclePacket.js:955-988`; codex review finding 7 |
| The census fold's receipt kinds are `intake` · `transition` · `transfer-in` · `transfer-out` · `exit` · `correction`; any other kind throws | `utilities/careJusticeAccounting.js:46-53`, `:83` |
| Ordinary-health check runs after a same-row death with no Status re-check: a citizen who dies this Cycle can be admitted and have `deceased` overwritten | `generationalEventsEngine.js:582-596`, `:636-637` |
| The chaos guard admits a `recovering` citizen, who already holds an open Hospital_Ledger row | `chaosCarsEngine.js:348`; `buildCyclePacket.js:811`, `:867-873` |
| Chaos writes HealthCause prose only when HealthCause is blank; a `recovering` citizen keeps the prior cause until `active` | `chaosCarsEngine.js:352-357`; `generationalEventsEngine.js:421-423` |

**Defect this cut repairs.** A chaos ambulance admission reaches the ledger three ways depending on the same-Cycle lifecycle draw: `stay` → missed-admission reconcile (booked as a correction, not an intake); step to another health state → a "transition with no open row" admits it (an intake, by accident); step to `deceased` → no open row, Status no longer a health state, **no hospital record at all**. Critical's death weight at short duration is 0.40 before age/season multipliers and normalization (`:112`, `:686-706`).

**Receipt shape.** Each `S.hospitalEvents` entry gains four fields; existing fields unchanged. Kind names are the census fold's own, so Task 8 passes them through with no translation:

| Field | Intake | Transition |
|---|---|---|
| `kind` | `intake` | `transition` |
| `intakeType` | enum per §Hospital_Ledger L | blank |
| `sourceSystem` | enum per §Hospital_Ledger M | blank |
| `sourceEventId` | §Shared receipt identity | blank — the persist resolves a transition to the open row |

**Sites.**

| Site | kind | intakeType | sourceSystem | sourceEventId |
|---|---|---|---|---|
| heat wave `:318`, prior Status blank/`active` | intake | `heat` | `heat-wave` | `heat-wave:C<cycle>:heat:<POPID>` |
| heat wave `:318`, prior Status `recovering` (the heat guard admits it, `:286`) | transition | — | — | — |
| lifecycle `:406` | transition | — | — | — |
| ordinary health `:643` | intake | `injury` if `injured`, else `illness` | `health-engine` | `health-engine:C<cycle>:<intakeType>:<POPID>` |
| chaos ambulance, prior Status blank/`active` (new push) | intake | `illness` (`medical_emergency`) · `injury` (`workplace_accident`) | `ambulance` | `ambulance:<chaos eventId>:<POPID>` |
| chaos ambulance, prior Status `recovering` (new push) | transition | — | — | — (same care episode, open row exists; invariant E) |

- **Receipt `cause` = the row's HealthCause after the site's write.** The row is the authority: a fresh intake carries the new prose (`a sudden medical emergency` / `a workplace accident`, S325 rule), a `recovering` re-escalation keeps its prior cause. Never the outcome tag — the persist copies `cause` into column E.
- **Chaos receipt pushed by the caller, last.** `writeCitizenEvent_` builds the receipt and returns it unpushed. The caller draws the payload `eventId` (unchanged rng order — drawing it earlier would shift every later draw), records the Chaos_Cars payload, then stamps `sourceEventId` and pushes. A throw anywhere before that leaves no receipt; the Status flip already happened, so the missed-admission reconcile books it as a correction — visible, never a silent unkeyed intake, never a receipt without its source row.
- **Order fixes the lost admission.** The ambulance receipt lands at Phase 4, ahead of any Phase-5 transition for that citizen, so the persist opens the row first; a same-Cycle step lands as a transition and a same-Cycle death closes it `deceased`. No persist code changes in this task — `buildCyclePacket.js:873-915` already handles that order.
- **Eligibility unchanged.** The ambulance guard (blank/active/recovering; retirees keep `retired`) and the heat guard stay as they are; the receipt is built only inside the branch that flips Status.
- **Separate defect, separate commit: dead citizens admitted.** The ordinary-health check skips a row whose Status became `deceased` earlier in the same pass. One-line guard; no receipt for a death. Correctness, not sim behaviour — the death cascade has already fired.
- **Not in this cut.** OARI admissions (R5 makes de-escalation a diversion, not a care admission); the same-Cycle lifecycle advance on heat/chaos victims (ruled 2026-09-29: first roll the week after — built `7b7c17af`, live PROD @124); sports-injury receipts (reconcile path, `unclassified`); retirees reaching `active` on recovery through the ordinary-health path (Task 6 requirement below); any persist, census or cluster change (Tasks 8/9).
- **Interim cluster behaviour (Task 9 owns the measure).** The Phase-9 carry keeps the first 12 events with a hood and drops `kind`/`from`/`to` (`finalizeCycleState.js:295-303`); Phase 3 counts each object with no POPID dedup (`generateCrisisBuckets.js:263-271`). The new chaos push therefore (a) counts every ambulance admission toward next Cycle's hood cluster, (b) double-counts a victim who also steps same-Cycle — as the heat path already does — and (c) can take one of the 12 slots from a later event. Expected until Task 9; not repaired here.

**Test — `scripts/careJusticeIntake.test.js`** (synthetic ledger, no sheet; loader and stubs reuse `scripts/chaosCarsCitizenDial.test.js`):
1. ambulance `medical_emergency` on an active citizen → one `intake`, `ambulance`, key carries the chaos `eventId`, cause = new prose.
2. same, forced same-Cycle death through Phase 5, fed through `persistHospitalLedger_` on a mock sheet → one row, closed `deceased`.
3. ambulance on a `recovering` citizen with an open row and a prior HealthCause → one `transition`, no key, cause = prior cause; persist updates the open row, appends none.
4. ordinary-health `injured` → one `intake`, `injury`.
5. lifecycle step → `transition`, no key.
6. retiree hit by ambulance → no receipt, Status unchanged.
7. heat victim → one `intake`, `heat`.
8. de-escalation / substance intervention → no receipt.
9. throw injected at the Chaos_Cars payload record → no receipt; persist reconcile appends one row.
10. death then health draw on one row (forced) → Status stays `deceased`, no receipt.
11. receipts fold through `careJusticeAccounting` with no throw (kind contract).
12. fixed seed: chaos rng draw sequence identical before and after.

**Built 2026-09-29.** Code by codex against this spec, heat `recovering` transition + two cause fixes by engine-sheet; kimi diff review SHIP (`docs/research/2026-09-29-kimi-care-justice-task4-diff.md`). Tests: hospitalIncomePersistence 48, chaosCarsCitizenDial 27, careJusticeAccounting 55, griefPeriod 38, educationLoop 120, hospitalTalkback 24; collisions 0. **Interim until Task 8:** the writer ignores `kind` — an intake against a ghost open row books as a transition, a transition with no open row appends and counts an admit. **Bench (SANDBOX 0908 @144 = `f7360a4e`, C128–C133, 0 new Engine_Errors):** C131 ambulance hit a `Retired` citizen (POP-00735) → no flip, no row (guard held); C133 ambulance `medical_emergency` on POP-01187 died the same Cycle → row `H-C133-POP-01187` opened and closed `deceased` — the lost-admission path, repaired. No ordinary-health or heat admission rolled in six Cycles; those sites are covered by tests only.

**Verify after build.** Test green; existing `chaosCarsCitizenDial`, `hospitalIncomePersistence`, `hospitalTalkback`, `careJusticeAccounting` tests green; `auditFunctionCollisions` 0; kimi adversarial diff review; bench fire, `Hospital_Ledger` read back, every new row matched to a receipt.

### Task 5 read-before — do cases have inputs (engine-sheet, 2026-09-29)

| Entry path | Measured | Source |
|---|---|---|
| Patrol `arrested` outcomes (R5 direct; before the Task 5 health-state filter) | live 3 in C101–C109, none since C104; bench 2 in C110–C135 (~1 per 7 Cycles) | LifeHistory_Log `Transgression-Serious\|chaos_cars\|cop_car` |
| Grave conduct → investigation (R5) | 0 `Transgression-*` ever, live or bench. Since engine.201 Wave 2 every moral test lands `BoundaryKept`/`BoundaryCompromised` (live 9, bench 36 in C124–C135) — the engine reads `crimeReachable` (`runConductEngine.js:233`), but no citizen is (`compressLifeHistory.js:1185`), so the commit branch never runs. DialState parse: **0 of 963 live / 0 of 1114 bench crime-reachable**; integrity band live 934 at 0, 29 at +1, none below neutral | LifeHistory_Log conduct tags; `getCitizenDialBands_` over every ledger row |

Crime entry is rare by design and the investigation path has no input (§15). Per the builder's weight above, the court's volume comes from civil cases; the conduct gate is its own defect, not fixed inside Task 5.

### Task 5 cut — judicial entry and outcome decision (engine-sheet, 2026-09-29 — REVIEWED, ready to build)

Outside review: `docs/research/2026-09-29-codex-care-justice-task5-cut.md` — 8 findings, all verified against code and folded below (F1–F8).

Same shape as Task 4: typed receipts **in memory** plus pure lifecycle functions. Nothing persists a case, flips Status or reads World_Config inside a Cycle until Tasks 6/8 wire it — so this cut cannot change a live Cycle except by one new in-memory push.

**Read before drafting.**

| Fact | Source |
|---|---|
| `arrested` is a config outcome (cop_car, weight 0.15, tag `Transgression-Serious`); gate `!ls.isMinor` | `utilities/chaosCarsConfig.js:183`; `chaosCarsEngine.js:93` |
| The arrest branch writes a `CITIZEN_ARRESTED` hook and a LifeHistory line; no receipt, no ctx field | `chaosCarsEngine.js:377-383`, `:397-400` |
| Chaos targets skip only `deceased`/`inactive`/`traded`/`pending` — a hospitalized citizen can draw `arrested` | `chaosCarsEngine.js:156-168` |
| The payload `eventId` is drawn after `writeCitizenEvent_` returns; the hospital receipt is stamped and pushed by the caller | `chaosCarsEngine.js:598-606` |
| `S.judicialEvents` does not exist anywhere | wiring card, `ENGINE_STUB_REVERSE.json` |
| Conduct Grave (the R5 investigation input) never fires today | §Task 5 read-before above |
| `seededRngFor_(seed, salt)` gives salted sub-streams | `utilities/cycleModes.js:82` |
| Chaos targets are not de-duplicated within a Cycle — one citizen can take two hits | `chaosCarsEngine.js:541-548` |
| Unknown BirthYear derives as adult by design (`unknown age -> adult defaults`); 0 of 963 live non-deceased rows lack a valid BirthYear | `citizenContextBuilder.js:65`; live read |

**1. Arrest receipt (the only engine edit).** `writeCitizenEvent_` builds, the caller stamps and pushes, exactly the hospital pattern. **One return channel:** `writeCitizenEvent_` still returns one receipt or null (`chaosCarsEngine.js:401`); the caller branches on `receipt.system` — `judicial` → key `patrol:<eventId>:<POPID>`, push `S.judicialEvents`; absent or `hospital` → today's ambulance path at `:601-606`, unchanged. A hit is ambulance or cop_car, never both, so one channel is enough.

| Field | Value |
|---|---|
| `system` | `judicial` |
| `kind` | `intake` |
| `intakeType` / `entryType` | `arrest` |
| `sourceSystem` | `patrol` |
| `sourceEventId` | `patrol:<chaos eventId>:<POPID>` |
| `popId`, `name`, `neighborhood`, `cycle` | as the hospital receipt |
| `chargeCause` | the outcome's LifeHistory text (descriptive, never a key) |
| `chargeGravity` | `serious` (the outcome's own tag, `Transgression-Serious`) |
| `priorStatus` | the row's Status at arrest, original casing (Task 6 restores it) |

Pushed to `S.judicialEvents`. **Eligibility:** adult (existing gate) **and** prior Status not a health state. This is a correctness guard, not a fate call: `PriorStatus` is what release restores (R4), and a health state is not a restorable life-state — an arrest stored with `hospitalized` would re-admit the citizen on release with no hospital row behind it. The hit stays a hook and a LifeHistory line. No change to target selection or outcome weights, so the chaos rng sequence is untouched.

**One open case per POPID (F1).** Before pushing, the caller checks `S.judicialEvents` for an `arrest` `intake` on the same POPID this Cycle; a second arrest becomes a `transition` receipt on that case (same `sourceEventId` as the first, its own chaos `eventId` kept as `reArrestEventId` for history) — one case, one custody entry, the hit's LifeHistory line and hook unchanged. Across Cycles the same rule is Task 8's persist: an arrest on a POPID with an open row is a `transition` on it, never a second row, so `J-C<cycle>-<POPID>` cannot collide. Whether a `detained` citizen stays a chaos target is a Task 6 call.

**2. `phase05-citizens/judicialLifecycle.js` — pure functions, generic over `EntryType`.** Each entry type is a row in one transition table (`JUDICIAL_ENTRY_TYPES_`): its states, its decision step and its outcome set. `arrest` and `investigation` ship now. **What a row declares (F4)** — so a civil type (dispute, divorce, lawsuit) is a new row, not a rewrite: `custodial` (only custodial types ever enter `pending`/`held`; a civil type opens in its own non-custodial state, e.g. `filed`), its open states, its decision offset (arrest: +1), its outcome vocabulary, and its census treatment. The census accepts `arrest` only (`careJusticeAccounting.js:22-33`); a civil row declares `census: none` until the builder rules how court cases are counted. `SourceSystem`/`Outcome` enums grow with each row.

- `openCaseFromReceipt_(receipt)` → a case object with the 21 `Judicial_Ledger` fields. `arrest`: `pending`, `ArrestCycle = OpenCycle`, `DecisionCycle = ArrestCycle + 1`. `investigation`: `investigating`, `ArrestCycle` blank. Rejects any receipt without `sourceEventId`/`popId`/known `entryType` with a throw.
- `advanceCase_(case, cycle, rates, priorCaseCount)` → one step per Cycle, returns `{case, event}`. Event kinds, fixed: arrest opened (receipt) = `intake` · `pending→held` = `transition` · decided `released` / `diverted` = `exit` · `held→held-served` = `exit` · `investigating→pending` = `intake` (same `SourceEventId` as the investigation) · `investigating→no-arrest` = no event · no step this Cycle = no event. `pending` at `DecisionCycle` draws released / diverted / held from the rates. `held` sets `HeldUntilCycle = decision + length`, closes `held-served` at that Cycle. `released`/`diverted` close the Cycle they're decided. **Monotone, one step per Cycle (F3):** due means `cycle >= DecisionCycle` / `cycle >= HeldUntilCycle`, so a skipped Cycle catches up; `LastTransitionCycle === cycle` returns the case unchanged with no event, so a second call in one Cycle is a no-op. The decision rng is salted with `SourceEventId` and seeded on `DecisionCycle`, not the Cycle it runs in — a late decision is the same decision. `investigating` converts to `pending` (arrest, same Cycle) at `investigationArrestRate`, else closes `no-arrest`.
- **Held length (R3, 1–4 by gravity):** `minor` 1 · `serious` 1–3 · `grave` 3–4, uniform in range.
- **Repeat arrest (R3):** a prior case for this POPID with `ArrestCycle` within the last 52 Cycles multiplies the held weight by `judicialRepeatHeldMultiplier`, then renormalises.
- **Diverted = exit** (to OARI / program, no bed) for every charge today. Transfer to a treatment bed is left for a substance-class charge, which no entry path produces yet.
- **Randomness:** the rng is injected; the Task 6 caller passes `seededRngFor_(DecisionCycle, 'judicial:' + SourceEventId)` (`utilities/cycleModes.js:82`), never `ctx.rng` — decisions are replay-stable per case and cannot shift any other engine's draws. (`mulberry32_` is not used: it is defined twice as a global, `applyWeatherModel.js:50` and `textureTriggers.js:25`.)
- `loadJudicialRates_(worldConfig)` → validated object; throws (visible) on a missing key, a non-finite number, an outcome split not summing to 1 ± 0.001, any rate outside [0, 1], or `judicialRepeatHeldMultiplier` < 1 (F6).

**3. World_Config keys (defaults; added live only when Task 6 wires the reader).**

| Key | Default | Source |
|---|---|---|
| `judicialReleasedRate` | 0.40 | ruling 2 |
| `judicialDivertedRate` | 0.25 | ruling 2 |
| `judicialHeldRate` | 0.35 | ruling 2 |
| `investigationArrestRate` | 0.30 | R5 "set chance" — number is a tunable default |
| `judicialRepeatHeldMultiplier` | 1.5 | R3 "raises the held odds" — number is a tunable default |

**4. Grave conduct → investigation receipt — spec only, NOT wired in this cut.** `investigation` stays in the entry-type table with its tests; the `runConductEngine.js` push lands in the commit that fixes the crime-reachable defect, where it can be seen on bench. When wired, the `Transgression-Grave` branch pushes an `investigation` receipt (`kind` `transition` — an investigation is not an intake and moves no census count; `sourceSystem` `conduct`, key `conduct:C<cycle>:grave:<POPID>`, gravity `grave`). Its conversion to an arrest emits the `intake`, keyed on the same `SourceEventId`. Petty and Serious conduct open nothing (R5: never narrative matching). Inert until the conduct gate defect is fixed — filed separately.

**Task 8 requirements this cut sets.** Replay keys are rebuilt kind-aware, not from `SourceEventId` alone (F2): a row with `ArrestCycle` set seeds `judicial|intake|<id>`; a closed row with an exit outcome seeds `judicial|exit|<id>`; an `investigating` row seeds nothing, so its later conversion still books its one intake. Lost receipt (F7): `writeChaosCarsRow_` throwing after `writeCitizenEvent_` leaves the arrest's LifeHistory line with no receipt and no case — the throw reaches Engine_Errors, so the loss is visible, never counted as a known zero; no judicial reconcile is built (no Status flip exists to reconcile from until Task 6, which revisits it).

**Deferred from kimi's review (Task 6/8, when the conduct wire lands).** `admitJudicialReceipt_` dedups against same-Cycle `intake` receipts only; an investigation receipt and an arrest for one POPID in one Cycle would open two cases with one `CaseId`. Rule to build then: an arrest on a POPID with an open investigation converts that investigation (no second case). Cross-Cycle re-arrest dedup stays the Task 8 persist's job.

**Build notes.** `S.judicialEvents` has no reader until Task 8 — pushed and dropped each Cycle. New ctx field + new file → `/stub-engine` regen in the build commit; `auditFunctionCollisions` 0.

**Not in this cut.** Status flip to `detained`, custody re-assert, participation gates (Task 6); persistence, the `-2` suffix, one-open-case-per-POPID enforcement and the replay key fold (Task 8); other-resident demand (Task 7); civil entry types (builder design first); the conduct crime-reachable defect.

**Built 2026-09-29 (engine-sheet).** `phase05-citizens/judicialLifecycle.js` (new, builder-approved) + arrest receipt in `chaosCarsEngine.js` + `scripts/judicialLifecycle.test.js` 52/52. Regression: chaosCarsCitizenDial 27, hospitalIncomePersistence 48, careJusticeAccounting 55, hospitalTalkback 24, griefPeriod 38, educationLoop 120; collisions 0; STUB_MAP regenerated. kimi diff review SHIP (`docs/research/2026-09-29-kimi-care-justice-task5-diff.md`); three of its findings fixed in the follow-up commit (blank clocks throw, a re-arrest receipt cannot open a case, conversion uses the type's `decisionOffset`), 56/56. **Bench** SANDBOX 0908 @146 C136–C140 ok, no arrest drawn; @147 bench-only forced-arrest probe C141 → 3 receipts in GAS (`intake`, `patrol:<eventId>:<POPID>`, `Active`, `serious`), Phase4-ChaosCars ok, Engine_Errors 4→4; reverted @148. **Live PROD @125** 2026-09-29, pull-back 166/166.

**Test — `scripts/judicialLifecycle.test.js`** (synthetic, no sheet):
1. forced draws → each of released / diverted / held; held closes `held-served` at `HeldUntilCycle`, not before.
2. held length stays inside its gravity range across 1000 seeds; repeat-arrest raises the held share.
3. same case, same Cycle, run twice → identical outcome (replay).
4. `ctx.rng` draw count identical with and without a decision.
5. invalid rates (missing, NaN, negative, sum ≠ 1) → throw naming the key.
6. investigation → arrest at the rate, else `no-arrest`; Petty/Serious conduct → no receipt.
7. chaos arrest on active / retired adult → one receipt, `priorStatus` casing preserved; on a minor → no arrest drawn; on a hospitalized citizen → no receipt, hook still written.
8. every lifecycle event folds through `careJusticeAccounting` with no throw.
9. unknown `entryType` → throw.
10. fixed seed: chaos rng draw sequence identical before and after.
11. same POPID arrested twice in one Cycle → one `intake`, one `transition`, both hooks/lines written (F1).
12. decision overdue by 2 Cycles → decides once, same outcome as on time; second call same Cycle → unchanged, no event (F3).
13. synthetic civil row (test-only, `custodial: false`) opens, advances, closes; never enters `pending`/`held`, never emits a census event (F4).
14. unknown BirthYear → adult default, arrest receipt written; known minor → no arrest drawn (F5).
15. rates at 0 and 1 pass; 1.01, Infinity, multiplier 0.9 → throw naming the key (F6).
16. injected throw in `writeChaosCarsRow_` → no receipt, error propagates (F7).
17. kind-aware seen set: investigation open → conversion → replay books one intake; arrest → exit → replay books none (F2 — spec'd here, run against the Task 8 fold).

## Changelog

- 2026-09-29 (engine-sheet) — Builder direction: named cases rare by design; engine-sheet two-layer court-revenue recommendation recorded in §Later (not ruled).

- 2026-09-29 (engine-sheet) — Task 5 bench-proven (C136–C141, forced-arrest probe) and live PROD @125.

- 2026-09-29 (engine-sheet) — kimi Task 5 diff review SHIP; 3 findings fixed, 1 deferred to Task 6/8; tests 56/56.

- 2026-09-29 (engine-sheet) — Task 5 built: judicialLifecycle.js + arrest receipt, 52/52 tests; kimi review and bench pending.

- 2026-09-29 (engine-sheet) — codex review of §Task 5 cut: 8 findings verified and folded; review filed to docs/research; cut ready to build.

- 2026-09-29 (engine-sheet) — Crime-reachable counted (0 live/bench) and filed engine.272; builder: tracked defendants pay fines from NetWorth.

- 2026-09-29 (engine-sheet) — Advisor fixes folded into §Task 5 cut (return channel, PriorStatus guard, event kinds, conduct wire deferred, Counterparty column U); builder direction: court is the revenue engine.

- 2026-09-29 (engine-sheet) — §Task 5 cut drafted (pre-review): arrest receipt, generic-over-EntryType lifecycle, rate keys, tests.

- 2026-09-29 (engine-sheet) — Task 5 read-before table added; builder weight: court is mainly civil (taxing, disputes), crime occasional.

- 2026-09-29 (engine-sheet) — Builder ruling: an admitted citizen's first health roll is the week after admission; built 7b7c17af, bench @145, live PROD @124.

- 2026-09-29 (engine-sheet) — Builder approved the new file `phase05-citizens/judicialLifecycle.js` for Task 5; Task 4 live PROD @123.

- 2026-09-29 (engine-sheet) — Task 4 bench-proven on SANDBOX 0908 @144 C128–C133; PROD push waits for the builder (overnight rail).

- 2026-09-29 (engine-sheet) — Task 4 built: typed receipts at 4 sites, kimi review SHIP; bench pending.

- 2026-09-29 (engine-sheet) — Task 4 cut reviewed by codex (7 findings verified, folded; review in docs/research/); ready to build.
- 2026-09-29 (engine-sheet) — Task 4 cut drafted (§Task 4 cut): typed receipts on the 3 hospital-event sites + a new chaos-ambulance receipt that closes the lost-admission path; advisor-checked, out for codex review, nothing built.

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
