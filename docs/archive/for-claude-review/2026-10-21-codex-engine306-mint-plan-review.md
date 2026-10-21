---
title: Engine.306 business mint plan review
created: 2026-10-21
updated: 2026-10-21
type: reference
tags: [engine, business, review]
sources:
  - docs/research/2026-10-21-engine306-mint-plan-TASK.md
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md
  - output/engine306-mint-roster.tsv
---

# Engine.306 mint plan review

**Scope:** Source, plan, and saved dumps only. The roster has 103 distinct names across 19 hoods; it is untracked, and the owning plan is concurrently dirty. No Sheet, bench, canon, card, or model run was made.

## 1. Write path — HOLD

Prefer a retained `Business_Intake` staging tab plus `processBusinessIntake.js` for the 103 rows, with the Pulse District cell edit as a separate compare-old-value/readback operation. That script is the only path here that retains row-level provenance and checks normalized duplicate names; its allocator uses `max(bizIdHighWater, active max)+1` (`scripts/processBusinessIntake.js:56-79,83-110,112-150`; `lib/sheets.js:260-299`). The tab is reported absent on live; this is a required setup, not an existing ready path (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:219`; `scripts/processBusinessIntake.js:56-64`).

Neither proposed writer satisfies the complete gate as written: intake appends A:I and advances high-water without a tail readback, then changes Status and `data/employer_mapping.json`; a partial failure needs a row-specific recovery plan (`scripts/processBusinessIntake.js:169-238`). `appendBusinesses` reads high-water and reads back only A:D IDs, does not throw on `verified.ok === false`, advances high-water anyway, and is not exported for a one-off driver (`scripts/ingestPublishedEntities.js:883-939,1482-1503`). Add an independent typed A:I tail/readback, exact roster-to-ID receipt, preimage and partial-retry rule before any write. No existing path provides that whole sequence.

For each staging row: `Description` = `engine.306 builder-approved hood character at C112: <roster Reason>`; `SourceEdition` and `SourceCycle` blank because no Edition or simulated source Cycle authored the business. Keep the staged/promoted rows and a receipt linking their assigned IDs to the roster; neither field is copied into Business_Ledger's nine columns (`scripts/processBusinessIntake.js:62,135-149,173-175,199-215`; `output/engine306-mint-roster.tsv:1`). Do not label these as published-entity ingestion.

## 2. Birth values — FIX

The current seed function yields **13**, not 15, default 6 / $45k / $500k / 2 rows on this 103-row TSV (read-only evaluation); Oakland Coliseum is one of them. `sectorCategory_(..., true)` returns null only for its `Stadium` sector, so it takes no ordinary hires (`scripts/ingestPublishedEntities.js:866-881`; `phase05-citizens/runCareerEngine.js:75-92`; `output/engine306-mint-roster.tsv:87-104`). Preserve the plan's no-hand-headcount ruling; fix the reader hazards in hunt 6 rather than sizing landmark rows to evade them (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:225`). Seeds write numeric whole-percent Growth_Rate values, 2–8; `Civis Systems`' existing `305%` string is parsed as 305 by the engine and is no precedent for new string values (`scripts/ingestPublishedEntities.js:863-880`; `phase05-citizens/applyBusinessDynamics.js:206-210`; `output/beats/Business_Ledger.jsonl:52`).

There is a source conflict before staging: the approved East Oakland plan says **Coliseum Corner Sports Bar / Sports Bar**, but the roster says **Coliseum Corner Game-Day Bar / Bar & Grill**. Besides the name, `Sports Bar` is excluded from ordinary hiring while `Bar & Grill` enters Food & Culture. Get the builder/owning lane to reconcile the two authorized inputs; do not silently choose one (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:239`; `output/engine306-mint-roster.tsv:89`; `phase05-citizens/runCareerEngine.js:75-90`).

## 3. Readers that change — HOLD

The seven-reader list omits material effects. Direct engine reads also include `buildCommuteFlows_` (hood employer depth, even without tracked citizens), `businessDistressShare_` (new seeded staff enlarge the denominator), uniform business chaos targeting, settlement employer pools, the owner mint door, business tax, economic-ripple BIZ-ID resolution, famous-sighting venues, and contract-seed backdrops (`phase02-world-state/commuteFlowEngine.js:93-137`; `phase03-population/applyDemographicDrift.js:433-459`; `phase04-events/chaosCarsEngine.js:318-366`; `phase05-citizens/educationCareerEngine.js:789-836`; `phase05-citizens/processAdvancementIntake.js:2224-2268`; `phase05-citizens/generationalWealthEngine.js:1936-1944`; `phase06-analysis/economicRippleEngine.js:197-211`; `phase07-evening-media/buildEveningFamous.js:443-470,511-530`; `phase07-evening-media/buildContractSeeds.js:297-320,492-519`).

The named readers also shift: 103 more rows feed dynamics and its full A:I-range intents and hood momentum; only food/retail classes enter `S.hoodSpots`, then the rendezvous pick; field/hood pools change emergence and settlement employer picks, hiring windows, and heritage births; evening food samples eligible food/nightlife rows (`phase05-citizens/applyBusinessDynamics.js:591-598,712-746,765-772,123-160`; `phase05-citizens/generateCitizensEvents.js:236-244,2826-2830`; `phase05-citizens/processAdvancementIntake.js:1592-1630,1732-1754`; `phase05-citizens/runCareerEngine.js:1555-1575,1669-1693`; `phase07-evening-media/buildEveningFood.js:194-222`).

The task's `hoodReferencePay_` premise is stale: current pay is job-catalog `jobReferencePay_`, and tracked employer floor looks up the citizen's **own BIZ-ID** and raises only. Newly seeded salaries do not reprice existing workers at other firms; new hires can get a different income (`phase05-citizens/generationalWealthEngine.js:959-989,758-817`; `phase05-citizens/runCareerEngine.js:1757-1763`).

Before PROD, bench the C113 delta for distress/employment target, hood depth, business dynamics/runtime/closures and full-row write, chaos target share, owner-door eligibility, job/settlement mints, spot/venue/seed distribution, and tax-day projection. BIZ-ID lookup and existing-owner pay are source-bounded and may be checked on live readback; no existing owner points to a new blank-Key_Personnel row (`phase05-citizens/generationalWealthEngine.js:1118-1125`; `phase05-citizens/processAdvancementIntake.js:2253-2267`).

## 4. Sequencing — HOLD until the gates above pass

Before C113 is the better placement *if* the row set is reconciled and the bench/readback gates pass: it lets the first spot selection see the new pool. After the first fire, only citizens in hoods whose food/retail spot set changes can switch winner; “every hood” is too broad, and no spot assignment is persisted as a separate field (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:242-244`; `phase05-citizens/applyBusinessDynamics.js:578-581,713-720`; `phase05-citizens/generateCitizensEvents.js:236-244`). The calendar deadline does not justify a 103-row live write without a passing bench. A post-C113 landing remains possible with the affected-holder count declared.

## 5. Pulse District realign — FIX

`BIZ-00039` has zero tracked citizens in the saved ledger snapshot per the plan, but **30 stated staff** in the saved Business_Ledger; moving its hood changes Uptown/Downtown employer depth, the food-class spot sets, and venue/ripple placement even with no worker commute move (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:225`; `output/beats/Business_Ledger.jsonl:39`; `phase02-world-state/commuteFlowEngine.js:109-137`; `phase05-citizens/applyBusinessDynamics.js:713-720`). C92 print already calls it Uptown; another saved business packet calls it Downtown, so record the location correction for future sourcing without rewriting print (`editions/cycle_pulse_edition_92.txt:765`; `output/cron-compare/business_c110_packet-v2_benchmark-biz-c110-haiku_nlm-canon.md:42`).

The carry map is keyed by BIZ_ID; the archive recovery identity includes BIZ_ID/Name/Sector/Neighborhood, so check no existing BIZ-00039 archive copy before the one-cell compare-and-set. The saved archive dump has no BIZ-00039, but live archive was not read (`phase05-citizens/applyBusinessDynamics.js:529,597-598,765,815-850`; `output/beats/Business_Archive.jsonl:1-2`).

## 6. Tier-1 canon rows — HOLD

INSTITUTIONS explicitly permits the five real landmark names and now names the Laurel campus and the Coliseum's open fate (`docs/canon/INSTITUTIONS.md:70-77,314-333`). `canon-name-check` checks people against the citizen snapshot, not Business_Ledger firms; Rhea's supplied policy still distinguishes real-world imports from allowed ledger/ground-truth entities, so the canon document and row-specific evidence must be in its sourcing packet (`scripts/canon-name-check.js:3-16,242-273`; `scripts/cron-rhea-gate.js:429-449`).

The owner door **does** treat Heinold's, Paramount Theatre, and Fox Theater Oakland as ownerable blank-Key_Personnel firms: their Bar/Saloon or Theater sectors miss both institution deny regexes; seeded 11 or 9 staff are below the default 250 cap and have positive book profit. It could mint a fictional owner for a real landmark. OACC (`Community`) and Coliseum (`Stadium`) are excluded. Add an explicit landmark exclusion to that reader and prove the five rows' eligibility before PROD; do not falsify headcount or Key_Personnel to hide the path (`phase05-citizens/processAdvancementIntake.js:2204-2209,2253-2268`; `phase01-config/engine94SheetContract.js:91-94`; `scripts/ingestPublishedEntities.js:869-880`; `output/engine306-mint-roster.tsv:6,18,22,27,93`).

## 7. Landing proof — HOLD

Preflight a frozen 180-row A:I snapshot, its max active ID, `bizIdHighWater`, the 103-row roster hash and resolved name/sector conflict, Neighborhood_Map membership, duplicate normalized names, and BIZ-00039's exact old cell. After each committed batch, read back **all nine typed cells** per new ID plus intake Status and the one realign cell; prove 103 new unique IDs starting at `max(pre-high-water, pre-active-max)+1`, final mark at the last allocated ID, and total 283 only if no intervening writer/archival move occurred (`lib/sheets.js:260-299`; `scripts/processBusinessIntake.js:27-40,83-110,169-215`; `scripts/ingestPublishedEntities.js:903-939`). A single A:D ID tail check is insufficient for names, hoods, economic values, or partial failure.

Validate strict field on all 103 (102 non-null, Coliseum intentionally null), class-seed counts, owner-door exclusions, and spot-set changes against the readback. `dumpLedger` reads Simulation_Ledger; `dumpBeatTabs` includes Business_Ledger for newsroom consumers (`scripts/dumpLedger.js:3-13,60-63`; `scripts/dumpBeatTabs.js:3-19,47`). `buildBusinessCards.js` reads Sheets and queries Supermemory even in dry run; run its narrow check only after separate external-read authorization, and do not ingest cards without approval (`scripts/buildBusinessCards.js:3-18,609-639,676-706`). No such run was performed here.

**Final gate — HOLD.** Reconcile the plan/roster name and sector, close the landmark owner-door path, choose and prove a provenance-preserving writer with typed replay-safe readback, then bench the expanded reader set before the builder-authorized live write. The current review grants no Sheet, deployment, card, or canon write.
