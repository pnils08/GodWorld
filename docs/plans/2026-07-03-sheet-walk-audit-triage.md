---
title: Sheet-Walk Audit Triage — Mike's 36-item pass
created: 2026-07-03
updated: 2026-07-03
type: plan
tags: [engine, sheets, active]
sources:
  - Mike sheet-walk 2026-07-03 (Drive file 1nGW7S7DbZgm6A9hzbwaMajcagUpYiu8G) — verbatim list below
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.44 row"
  - "[[../engine/SHEETS_MANIFEST]] — reader/writer truth for the 'any readers?' items"
  - "[[../SPREADSHEET.md]] — tab status truth"
  - "[[index]] — registered same commit"
---

# Sheet-Walk Audit Triage (engine.44)

**What this is:** Mike walked the tabs by hand (2026-07-03, right after the S289 seams/content-ledger deploy) and produced 36 findings. **Walked against the SANDBOX copy** (SANDBOX_0702, which carries 3 rehearsal cycles + the S289 test fixture) — structural findings (wiring, dead columns, wall clocks) transfer to live, but verify each on LIVE before fixing; row-level observations could be rehearsal artifacts. This doc holds the verbatim list + the working classification. Triage protocol: verify each item against SHEETS_MANIFEST/graphify/code BEFORE fixing (several "any readers?" questions have deterministic answers; several "dead?" tabs are already documented dead in SPREADSHEET.md). Fix-classes batch together; don't retire anything without the measure-twice caller graph.

## Verbatim list (Mike, 2026-07-03)

> AdvancementIntake1 - needs to be wired into injest to drive usage for tier movement
> NarrativeBridge - unused so far or not wired
> Riley_Digest - what supposed to go in column F "issues"
> WorldEvents_V3_Ledger - are these truely all the world events? seems half wired
> WorldPopulation - has a wall clock
> Cycle_Weather - has a wall clock, nothing has ever landed in columns E - Advisory, H - Alerts unrealistic or half wired
> Health_Cause_Queue - unused, should repurpose as "Oakland_Hospital" and should support a new ilness, injury, type engine
> WorldEvents_Ledger - do we need 2 ledgers doing this or can these be combined or one enhance one archived?
> Event_Arc_Ledger - is this truely wired in an out bound? most of the columns are not used, is this a dead sheet?
> Cultural_Ledger - has wall clock, citizens from simulation_Ledger arent carrying their POP ID over, column H - UniverseLinks isnt wired properly
> Business_Ledger - mostly incomplete, likely half built
> Faith_Ledger - has a wall clock
> Bay_Tribune_Oakland - true Source sheets baytribue roster for wiring
> As_Roster - true source of As roster - not used and there is no plan players traded off the team
> Life_History_Log - wall clock, most arent populating a name, due for a archive sweep
> Youth_Events - is this have readers?
> Economic_Parameters - does this have readers?
> Neighborhood_Map - has a wall clock
> Neighborhood_Demographics - have wired missing half the details, any readers?
> Texture_Trigger_Log - wall clock, looks half wired and very basic for providing depth, this likely needs to be enhanced to meet new standards
> Household_Ledger - 2 wall clocks
> Family_Relationships - broken sheet or unused
> Relationship_Bond_Ledger - wall clock, nothing is writing to column J Domain Tag, column K Neighborhood write cross neighborhood
> Relationship-Bonds - Nothing writes to column H domain tags, Column i Neighborhoods writes cross-neighborhood
> Domain_Tracker - wall clock
> Edition_Coverage_Ratings - needs a review to make sure the stories effect is appropriate
> Cycle_Packet - wall clock, any reader? one of the older "world summary" media handoffs
> Media_Briefing - wall clock, any reader? another media handoff
> Media_Ledger - wall clock, idk what this is, any readers? Column C Journlist - Oakland Daily Media?
> Story_Seed_Deck - wall clock, any reader?, half wired, missing data, has potential but a half effort at seeds, no citizen feed into any seeds, all tokens spent on sim ledger when a script could do it for free
> Story_Hook_Deck - wall clock, any reader, has potential just a messy system half wired
> Cycle_Seeds - wall clock, most useless of the seed group
> Engine_Errors - need to be built properly
> Ledger Index - old manual tracker - dead
> Media_Intake - possibly dead
> Storyline_Intake - possibly dead

## Working classification (verify before fixing — none of this is confirmed yet)

**Class 1 — Wall clocks (~15 tabs).** One fix-class: audit every writer stamping Gregorian timestamps into sim-facing columns; migrate to in-world stamps (`Y<n>C<m>`) per the S283 stamp convention, or classify the column as operational metadata (allowed). Tabs: WorldPopulation, Cycle_Weather, Cultural_Ledger, Faith_Ledger, LifeHistory_Log, Neighborhood_Map, Household_Ledger (×2), Relationship_Bond_Ledger, Domain_Tracker, Cycle_Packet, Media_Briefing, Media_Ledger, Story_Seed_Deck, Story_Hook_Deck, Cycle_Seeds, Texture_Trigger_Log.

**Class 2 — "Any readers?" (deterministic answers via SHEETS_MANIFEST/graphify/grep).** Youth_Events, Economic_Parameters, Neighborhood_Demographics, Cycle_Packet, Media_Briefing, Media_Ledger, Story_Seed_Deck, Story_Hook_Deck, Event_Arc_Ledger, WorldEvents_V3_Ledger. Answer first; fixes follow from answers.

**Class 3 — Half-wired columns (per-tab verify + wire-or-retire).** Cycle_Weather E/H, Cultural_Ledger POPID+H, Relationship_Bond_Ledger J/K, Relationship_Bonds H/I (cross-neighborhood write = possible bug), Riley_Digest F, Neighborhood_Demographics detail gaps.

**Class 4 — Dead-or-retire candidates (measure-twice before any deletion).** NarrativeBridge (S288 workbench audit already flagged orphan), Family_Relationships (SPREADSHEET.md notes mostly-in-SL), Ledger Index, Media_Intake, Storyline_Intake, Event_Arc_Ledger, WorldEvents_Ledger-vs-V3 merge question, Cycle_Seeds.

**Class 5 — Feature asks (design work, not repairs; some route to existing rows).**
- AdvancementIntake1 → ingest wiring for tier movement (existing: processAdvancementIntake retire-monitor per engine rules — reconcile)
- Health_Cause_Queue → "Oakland_Hospital" illness/injury engine (new design; folds the dormant health-cause pipeline)
- Story_Seed_Deck citizen feed = research.21 detector (already designed, gated on T5) + "script could do it for free" = engine.35 Phase 5 + G-RC5 — routes to existing rows, not new work
- Texture_Trigger_Log depth-standard uplift (post-S280 standards)
- As_Roster wiring + traded-player plan (sports layer — Paulson's domain, coordinate)
- Edition_Coverage_Ratings effect-strength review
- Engine_Errors rebuild "properly" (spec what proper means first)
- Bay_Tribune_Oakland as canonical roster: already wired that way in engine.35 Phase 2 (bayTribuneRoster.js) — confirm nothing else reads a stale roster.

## Class 2 answers — reader-audit sweep (S290, verified against code)

Method: grep every tab across `phase*/ lib/ scripts/ utilities/ .claude/skills/ .claude/agents/`, classify each hit read vs write, discard maintenance-only hits (auditSheetHeaders, cycleRollback, contract tests, sheetNames, ensure* schema helpers). Reader answers are code-level and transfer to live regardless of sandbox provenance; row-level observations still need live verify.

| Tab | Writers (cycle-path) | Readers (real consumers) | Verdict |
|---|---|---|---|
| Economic_Parameters | **none** | **none** — zero code references anywhere; docs only | **Fully orphaned.** 198 rows of income/tax reference data no code ever reads. Retire or wire (Class 4/5 decision) |
| Youth_Events | `runYouthEngine_` Phase 5 (wired both entry points, writes via `batchRecordYouthEvents_`) | **none** — read helpers `getRecentYouthEvents_`/`getYouthEventsForCitizen_` exist in `utilities/youthActivities.js` but have zero callers | **Write-only archive.** Engine logs youth events; nothing consumes them. Wire the existing read helpers or accept as archive |
| Media_Briefing | `mediaRoomBriefingGenerator` Phase 7 | `compileHandoff` (operator menu tool, zero cycle-path callers) + `cycleExportAutomation` (operator export) | **Legacy-reader only.** Both consumers are operator-fired handoff tools; `buildWorldSummary.js` does NOT read it. Candidate for retire-or-fold decision |
| Cycle_Packet | `buildCyclePacket` Phase 10 | `buildDeskPackets` evening-context (live dispatch path), `post-cycle-review`, `compileHandoff` (operator) | **Live.** Mike's "older media handoff" instinct half-right — compileHandoff is legacy, but desk packets read it today |
| Media_Ledger | `recordMediaLedger` Phase 10, `mediaRoomIntake` Phase 11 | `buildDeskPackets` evening-context (live), `buildMediaPacket` | **Live.** Column C "Journalist" semantics = Class 3 detail item |
| Story_Seed_Deck | `saveV3Seeds`/`applyStorySeeds` | `buildDeskPackets`, `/sift`, `/dispatch`, `citizen-signal-detector`, `priorityEngine`, `bylineEngine`, `routePatternSeeds` | **Live, heavily read.** Complaint is seed *quality* → routes to engine.35 Phase 5 + research.21 (already classified Class 5) |
| Story_Hook_Deck | `v3StoryHookWriter` Phase 8 | `buildDeskPackets`, `post-cycle-review`, `/run-cycle` | **Live**, thinner than seeds |
| Event_Arc_Ledger | `v3LedgerWriter` Phase 8, `processArcLifeCyclev1` | `v3preLoader` (cross-cycle arc persistence — load-bearing), `citizenContextBuilder` (crises citizens lived through), `updateStorylineStatusv1.2`, `buildDeskPackets` | **Not dead — it's the arc-persistence mechanism.** "Most columns unused" = Class 3 detail |
| WorldEvents_V3_Ledger | `recordWorldEventsv3_` Phase 10 (writes `ctx.summary.worldEvents` only) | engine-auditor detectors (cascade/math/completeness), `queryLedger`, `buildDeskPackets`, `buildCivicVoicePackets`, `/engine-review` | **Live.** "Truly all events?" = no — only what lands in `ctx.summary.worldEvents` is recorded; that's the half-wired feel. Merge-vs-archive with old WorldEvents_Ledger stays Class 4 |
| Neighborhood_Demographics | `updateNeighborhoodDemographics` Phase 3 | `educationCareerEngine` (school quality), `civicInitiativeEngine`, `buildNeighborhoodCards`, `buildDeskPackets`, `buildCivicVoicePackets`, `buildInitiativePackets` | **Live and load-bearing.** Detail gaps = Class 3 |

Net: 2 tabs with zero real readers (Economic_Parameters, Youth_Events), 1 legacy-reader-only (Media_Briefing), 7 live. No retirements executed — Class 4 measure-twice still applies before any deletion.

## Class 3 findings — half-wired columns (S301, verified against code + live data)

| Item | Finding | Disposition |
|---|---|---|
| Cycle_Weather E (Advisory) / H (Alerts) | Writer works; alerts are streak-gated (fog ≥3, prolonged rain ≥4, cold snap ≥5, heat wave ≥6 same-weather cycles) but `S.weatherTracking` was reborn every cycle → streak pinned at 1 → those alerts mathematically unreachable. Only storm_advisory (intensity+wind gate, no streak) could ever fire. Same failure class as the engine.45 T2 ripple carry. | **FIXED S301** — `finalizeCycleState.js` v1.7 carries compact streak state (~150 bytes) in the cycle snapshot; `applyWeatherModel.js` seeds its init from it (season-gated seasonFirsts). Round-trip tested. Sandbox verify pending. |
| Cultural_Ledger POPID + UniverseLinks (H) | One defect, not two: UniverseLinks IS the POP-ID cross-ref column (`buildCulturalCards.js` reads it as such) — sole creator `registerCulturalEntity_` hardcoded `""` since landing; only a one-off script (`integrateCelebrities.js`) ever filled any. | **FIXED S301** — `culturalLedger.js` v2.6 resolves POPID from shared ctx.ledger (exact full-name, unique-or-blank), writes on CREATE + backfills empty H on UPDATE. Live backfill done: 24/45 rows carry POPID (21 blanks are generic-pool/title-prefixed figures with no ledger row — correct). Sandbox verify pending. |
| Relationship_Bond_Ledger J/K + Relationship_Bonds H/I | Live: DomainTag 0-filled across all 6,202 rows; 'cross-neighborhood' is a literal from `seedRelationBondsv1.js:414`. Root: every live bond came from the seeder (origins: neighbor/random/household only). `bondEngine.js` — the writer that passes real domain tags + calendar origins — runs its UPDATE path every cycle (all 318 bonds show C100 stamps, engine-modified intensities) but `detectNewBonds_` has never landed a single bond live. | **DIAGNOSED S301 → ENGINE_REPAIR Row 33.** Pool `S.cycleActiveCitizens` is structurally empty: no producer for `S.citizenEvents` exists; storySeeds fill Phase 6/7 (after Bonds); eventArcs carry `involvedCitizens: []`; worldEvents have no citizens field. detectNewBonds_ exits at the <2 guard every cycle since landing. Fix is a small design call (producer + phase reorder) — filed, not built. |
| Riley_Digest F (Issues) | Not a defect. F = `S.auditIssues`: phase errors captured by `safePhaseCall_` + crisis-bucket lines from `generateCrisisBuckets`. Empty = clean cycles. | **CLOSED** — semantics documented here. |
| Neighborhood_Demographics H–L | 5 education columns 0/17 empty. Seeded once pre-S247, blanked every cycle by the Phase-3 writer clobber (fixed S247), never re-seeded. Reader defaults (quality=5, grad=75) masked it; SCHOOL_QUALITY_CRISIS / DROPOUT_WAVE hooks unreachable; cards showed blanks. | **FIXED S301** — re-ran `addEducationCareerColumns.js` (13 neighborhoods with per-hood data) + neutral defaults for 4 unmatched (Glenview, Dimond, Ivy Hill, San Antonio). Read-back: 85/85 cells filled. Fruitvale/West Oakland now sit below the crisis threshold (quality 3) → hooks can fire. |

## Class 4 verdicts — dead-or-retire audit (S311, measure-twice per tab: code caller-graph + live tab state)

| Tab | Evidence | Verdict |
|---|---|---|
| Narrative_Bridge | Live tab header-only (1 non-empty row); ZERO code writers to the tab; `scripts/buildNarrativeBridge.js` writes `output/` locally and has ZERO callers (matches S288 workbench orphan flag) | **RETIRED S311** — tab deleted (Mike-confirmed), orphan script `git rm`'d, snapshot at `docs/archive/tab-snapshots/S311-retired-tabs.json` |
| Ledger_Index | 46 rows of hand-maintained tab-purpose tracking ("Active/Ledger/Purpose/..."); zero code references anywhere; superseded by `docs/SPREADSHEET.md` + `SHEETS_MANIFEST.md` | **RETIRED S311** — tab deleted (Mike-confirmed), 46 rows snapshotted same file |
| Economic_Parameters | ~~Zero code references (C2 sweep)~~ **REVERSED at the delete gate S311:** the S290 C2 sweep was stale by execution time — engine.51 intake helpers (`godWorldEngine2.js` L1242+, built S305) read the sheet for intake-category salary pools. Final pre-delete re-grep caught it. | **KEEP — LIVE** (engine.51 reader). Audit lesson: a reader-sweep verdict must be re-run at execution time, not trusted across sessions — same class as PHASE_42_PATTERNS A7 |
| Family_Relationships | LIVE writers: `generationalWealthEngine.js` L497-505 + `householdFormationEngine.js` (own-tracking sheets, engine.md exempt class) | **KEEP** — "mostly-in-SL" note is about data overlap, not dead code |
| Media_Intake | Read by `mediaRoomIntake.js` L222/646 (`processMediaIntake_`, cycle-path Phase 11) + written by operator-fired `parseMediaRoomMarkdown.js` | **KEEP** — live intake substrate |
| Storyline_Intake | Read/ensured by `mediaRoomIntake.js` (Phase 11) + `editionIntake.js`/`processEditionIntake.js`/`editionIntakeV3.js` (current ingest path) | **KEEP** |
| Event_Arc_Ledger | C2 sweep: `v3preLoader` cross-cycle arc persistence is load-bearing | **KEEP** (already answered) |
| WorldEvents_Ledger vs V3 merge | Old ledger has LIVE readers V3 can't serve: `updateTransitMetrics.js` (Phase 2 reads prev-cycle events — V3 records only `ctx.summary.worldEvents` at Phase 10) + `worldEventsEngine.js` v2.7 cross-cycle dedup | **NO MERGE** — both stay; they serve different reads |
| Cycle_Seeds | LIVE: `utilities/cycleModes.js` (cycle-path ensure+write) + `scripts/draftContentRows.js` (run-cycle Step 5.6, engine.49 T4) | **KEEP** |
| Youth_Events (from C2) | Write-only archive; read helpers exist with zero callers; engine.4 already blocked on engine.5 youth population | **KEEP** — rides engine.4/engine.5, no new decision |
| Media_Briefing (from C2) | Legacy-reader-only (operator handoff tools) | **HOLD** — retire-or-fold is a media-terminal call, not engine-sheet's |

**Retire execution gate:** tab deletion is irreversible bulk deletion — awaiting Mike's plain-language confirm on the 3-tab retire list (Narrative_Bridge, Ledger_Index, Economic_Parameters + orphan `buildNarrativeBridge.js`). Docs marked pending-retire meanwhile.

## Class 5 dispositions (S311 — design asks routed, none built; new engines stay Mike-gated per S296 FIX-don't-ADD)

- AdvancementIntake1 ingest wiring → rides the existing `processAdvancementIntake` retire-monitor (engine.md rules); reconcile there, no new row.
- Health_Cause_Queue "Oakland_Hospital" engine → routes to **engine.52** (plan [[2026-07-11-oakland-hospital]], filed S311 research-build) — this C5 ask is its origin, closed here.
- Story_Seed_Deck citizen feed → already routed: engine.35 Phase 5 + research.21 detector (gated on T5) + G-RC5.
- Texture_Trigger_Log depth uplift → design ask, queue behind engine.38 atmospheric work (same content class).
- As_Roster wiring + traded-player plan → Paulson's sports domain; coordinate, don't build unilaterally. Related: engine.40 (sports-stat intake) carries the structured-store design.
- Edition_Coverage_Ratings effect-strength review → analysis task, fits a future /engine-review deep-dive, no substrate change.
- Engine_Errors "proper" rebuild → needs a spec of "proper" first (what queries should it answer?); no build until specced.
- Bay_Tribune_Oakland canonical roster → **ANSWERED S311, one exception found:** engine.35 Phase 2 (`bayTribuneRoster.js`) reads the tab, but `buildDeskPackets.js` L127 still reads hand-maintained `schemas/bay_tribune_roster.json` (version 2.0, not generated from the tab, last touched pre-S259). Reconciliation candidate: either regen the JSON from the tab or point desk packets at `bayTribuneRoster.js`. Filed here; small bounded follow-up.

## Changelog

- 2026-07-03 — Filed (S289 close, engine-sheet). Verbatim intake from Mike's sheet-walk; classification unverified; triage protocol = verify-then-fix per class. ROLLOUT row engine.44 opened same commit.
- 2026-07-03 — Class 2 reader-audit sweep complete (S290, engine-sheet). All 10 "any readers?" questions answered from code; table added above.
- 2026-07-03 — Class 1 COMPLETE (S290, engine-sheet). Writers: 16 flipped to cycle stamps (commit 48cf7c71, deployed + byte-verified live). Data: 17,928 Gregorian cells rewritten to 'C'+cycle across 21 columns/20 tabs, read-back verified zero remaining per column (one-shot script, session scratchpad; anchors: row's own Cycle col; Household_Ledger→FormedCycle, Cultural_Ledger→LastSeenCycle). Bonus fix: mediaRoomIntake quoted-citizen birthYear was real-world-year anchored (2026) vs simYear convention (2041) — now cal.simYear or blank. Handoff_Output tab doesn't exist on live — nothing to clean.
- 2026-07-06 — Class 3 verified, 3 of 5 fixed (S301): weather-streak carry + Cultural_Ledger POPID (code, sandbox pending) + education re-seed (live); findings table above.
- 2026-07-11 — Class 4 + 5 closed analysis-side (S311): 3 retire verdicts (Mike-confirm gated), 8 keep/hold, C5 asks routed; verdict tables above.
- 2026-07-03 — Class 1 correction (S290 late): first pass used a curated tab list — WRONG approach; Mike caught misses live (World_Population lowercase header, Riley_Digest, WorldEvents_Ledger, Transit_Metrics). Second pass: 12 more writers flipped + deployed (acc40a81, byte-verified), full-enumeration backfill rewrote 6,715 more cells across 12 tabs, read-back zero remaining. Total: 24,643 cells, 28 writers. Deferred (no cycle column, need per-tab design, NOT silently skipped): Simulation_Ledger LifeHistory(783)/CreatedAt(8)/LastUpdated(886) — dates embedded in narrative text, cell-replace would destroy content; Initiative_Tracker.LastUpdated(6); Civic_Sweep_Report.Timestamp(9). Sports GameDate cols excluded — Paulson's layer, real dates by design.
