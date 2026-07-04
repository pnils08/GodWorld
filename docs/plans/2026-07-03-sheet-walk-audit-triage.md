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

## Changelog

- 2026-07-03 — Filed (S289 close, engine-sheet). Verbatim intake from Mike's sheet-walk; classification unverified; triage protocol = verify-then-fix per class. ROLLOUT row engine.44 opened same commit.
- 2026-07-03 — Class 2 reader-audit sweep complete (S290, engine-sheet). All 10 "any readers?" questions answered from code; table added above.
- 2026-07-03 — Class 1 COMPLETE (S290, engine-sheet). Writers: 16 flipped to cycle stamps (commit 48cf7c71, deployed + byte-verified live). Data: 17,928 Gregorian cells rewritten to 'C'+cycle across 21 columns/20 tabs, read-back verified zero remaining per column (one-shot script, session scratchpad; anchors: row's own Cycle col; Household_Ledger→FormedCycle, Cultural_Ledger→LastSeenCycle). Bonus fix: mediaRoomIntake quoted-citizen birthYear was real-world-year anchored (2026) vs simYear convention (2041) — now cal.simYear or blank. Handoff_Output tab doesn't exist on live — nothing to clean.
