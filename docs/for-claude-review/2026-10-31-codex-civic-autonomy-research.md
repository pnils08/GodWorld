---
title: Civic autonomy, official wakes, and city awareness — research
created: 2026-10-31
updated: 2026-10-31
type: reference
tags: [research, civic, citizens, media, active]
sources:
  - Builder conversation 2026-10-31 — district and mayor wake investigation and research authorization
  - scripts/cron-civic-run.js
  - scripts/buildCivicOfficeSlice.js
  - scripts/civic-office-map.json
  - phase05-citizens/civicInitiativeEngine.js
  - phase05-citizens/updateCivicApprovalRatings.js
  - output/cron-civic/packs/MAYOR-01_c113.json
  - output/world_summary_c113.md
pointers:
  - "[[for-claude-review/2026-10-31-codex-civic-autonomy-plan]] — proposed implementation and proof"
  - "[[plans/2026-09-19-civic-wake-game-loop]] — existing move and stage design"
  - "[[plans/2026-09-24-initiatives-in-the-world]] — existing delivery and upkeep work"
  - "[[PRODUCT_VISION]] — one city and programs that deploy"
  - "[[research/index]] — research registration"
---

# Civic autonomy, official wakes, and city awareness — research

**What this addresses:** Whether scheduled politicians can observe their actual city, choose useful or enjoyable district work, cause persisted simulation changes, hear citizens and media react, and earn consequences without the builder conducting each turn.

**Extraction:** Preserve the existing move-to-tracker-to-engine path; repair the constrained decision opportunity, stale persona facts, missing major-event routing, disconnected voting, and incomplete attribution. Positive city life is a valid reason to act.

**Not applicable / hazard:** Real-world Oakland hardship, automatic crisis interpretations of nonzero counts, a prescribed initiative menu, approval awarded for eloquent claims, and a new publication pipeline. Names and records below belong to this simulation only.

**Verdict:** adopt — use this source trace as the basis for the companion plan; it establishes gaps in the current mechanism, not proof of a replacement's behavior.

**Ignited plans:** [[for-claude-review/2026-10-31-codex-civic-autonomy-plan]].

## Builder direction

2026-10-31, initial request: "these dont have to be things that tie to real world housing issues, it can be events, programs and things that help data strain in their district".

2026-10-31, research request: "how the districts and the mayors wakes are formatted, what their slice carries and what they can realistically do in their seat that effects rhe sim without my involvement".

2026-10-31, documentation and plan request: "crons get ample time or choices to do their work"; "provides citizens and the media to react to their choices and the civic officials being accountable"; "the As havibg a parade downtown is a major event in that district, and the As winning is a moment for the cities mayor"; "the models they run also is importtant".

Earlier ruling recorded in `docs/plans/2026-09-24-initiatives-in-the-world.md:30-40`: "There is no housing problem in the sim and there is zero program in my sim for it." / "Stop making the engine tell the crons what to do." / "Nothing is gated from the crons to choose a initiative, I can see having categories for these … housing affects would be the result of that initiative."

## Evidence boundary and document conflicts

Source inspection continued through HEAD `0c6aef1f`; inspected core civic files were clean at that check. The shared tree contains extensive unrelated output changes. C113 packs, wakes, close receipts and beat dumps are saved local evidence, some untracked/dirty, not a fresh authoritative Sheet read. No live Cycle, deployment, cron, Sheet read/write, model replay or publication was run for this documentation task. A prior required Haiku wiring-card request failed with a connection error; it was not retried. Existing cards are attached below as historical maps and their relevant claims were checked against current source.

The current source conflicts with `docs/reference/CIVIC_GAME_LOOP.md` descriptions of a closed proposal menu, blank stages and unbuilt director upkeep. That reference is historical evidence, not current runtime truth. Persona geography also conflicts with the Node map (F2). The plan names reconciliation work; this research does not silently rewrite either source.

Filing follows the explicit guest inbox rule in AGENTS.md and `docs/for-claude-review/README.md`, rather than the generic template's permanent save paths. Frontmatter uses SCHEMA.md's `reference` type with the research template's verdict/sections; the generic template's `type: research` is outside SCHEMA.md's enumerated types. Research registers in the research index, plan in the main index. Claude owns later relocation and rollout registration.

## Current districts and prompt assembly

`lib/districtMap.js:7-20` declares the Sheet's Neighborhood_Map.District authoritative; the Node map is a mirror. Its current mapping at `:23-46` is:

| Seat | Tracked neighborhoods |
|---|---|
| D1 | West Oakland, Brooklyn |
| D2 | Downtown, Chinatown, Jack London, Baylight District |
| D3 | Fruitvale, San Antonio |
| D4 | Glenview, Dimond, Ivy Hill |
| D5 | East Oakland |
| D6 | Piedmont Ave |
| D7 | Temescal, Rockridge, KONO |
| D8 | Lake Merritt, Adams Point, Grand Lake, Eastlake |
| D9 | Laurel, Uptown |

`scripts/cron-civic-run.js:1238-1252` concatenates shared council LENS/RULES and seat IDENTITY/LENS/RULES into the system prompt; the mayor has her own files. Weekday user input is prior continuity wall, a selected lever, the OFFICE/1 pack, and a JSON output contract (`:2366-2395`). The response is `office`, `holder`, `statement`, `moves[]`, `numberMoved`. The first valid consequential move consumes the turn (`:2563-2662`).

| Pack component | Source and actual exposure |
|---|---|
| Actor and approval | Current-cycle audit's Civic_Office_Ledger, office map; `buildCivicOfficeSlice.js:289-301,1425-1434` |
| District conditions | Audit Crime_Metrics and Neighborhood_Map, including sentiment, crime, retail, housing pressure, trajectory; `:304-355` |
| Selected assignment | Negative district outlier, existing initiative, or approval pressure; no candidate means "no move this cycle"; `:557-620,1436-1439` |
| People and places | Active local ledger people, up to four selected subjects; world-summary business/faith/event texture; `:155-245,248-278,530-554` |
| Board | Sponsored initiatives plus those touching district; mayor all; stage, next requirement and budget; `:873-917` |
| Public response | Civic-tagged Reflection_Intake over current and prior two Cycles, negative affect split from constructive participation; `:992-1066`. This is a sample, not polling or petition signatures. |
| Staff and continuity | Latest director/chief work reflections, accepted/rejected moves, unanswered directives; `:923-977,1072-1164` |
| Condition history | Health/safety counts, positive counts called problems, earlier unaddressed exposure; `scripts/civicProblemContinuity.js:6-12,37-84` |
| Model view | Full disk evidence replaced by clipped text/IDs/counts for game blocks; BLOCK_CAP=600; `buildCivicOfficeSlice.js:20,1232-1253`. Complete board IDs survive, complete board explanations do not. |

The mayor has citywide board/complaint scope but no fixed turf. Only after choosing an initiative does the pack load the selected neighborhood's people/texture (`buildCivicOfficeSlice.js:1389-1404`). This is not a complete city situation brief.

## Findings and consequences

| ID | Finding: input → behavior → consequence | Evidence |
|---|---|---|
| F1 | Healthy district, no initiative and approval >=55 → no selected turn → officials receive no positive opportunity invitation. Negative outlier gets score 200+heat. | `buildCivicOfficeSlice.js:557-620`; C113 D9 pack and wake below |
| F2 | Persona asserts housing hardship, fixed approval and stale turf → contrary facts enter system context before the current pack → narrative and geography can drift despite correct move validation. Mayor still says approval 65 while C113 actor says 69. | `.claude/agents/civic-office-mayor/IDENTITY.md:7-9,39-45`; `civic-office-council-d1/IDENTITY.md:18-20`; shared council `LENS.md:25-37`; mayor `LENS.md:67`; `lib/districtMap.js:23-46` |
| F3 | An unanswered directive expects answer; answer accepted first → valid work/proposal rejected as a second move → administrative reply displaces actual district action. | `cron-civic-run.js:2383-2393,2639-2641`; C113 D2 wake `:11-26` |
| F4 | Accepted answer/canvass → continuity changes but no direct tracker/metric effect. Continuity treats pending answer/canvass as landed when matching geography → a spoken response can remove passed-over marking without a delivered improvement. | `cron-civic-run.js:2765-2767`; `civicProblemContinuity.js:12,24-32,80` |
| F5 | Several board rows → 600-character board text sorted by initiative ID → later rows' instructions/budgets vanish although their IDs remain valid targets. | `buildCivicOfficeSlice.js:908-917,1234-1253`; C113 mayor pack |
| F6 | New health proposal → empty support band produces support-band-unset; call-vote only accepts domain-rules-deferred → both typed vote routes cannot progress it. The separate Sunday gavel can submit tracker phase/schedule updates, so this is not proof that every possible route is blocked. | `cron-civic-run.js:2462-2503,2859-2865,2894-2917,2001`; `civicPetitions.js:211-225` |
| F7 | Transit is advertised canDeliver=true → station-serving-hood metric meets a stage checker supporting only hood scope → no-delivering-reader. Actual transit effects can still operate. | `lib/initiativePhaseContract.js:234-238,416-429,503-515`; engine mirror `civicInitiativeEngine.js:3692-3704` |
| F8 | Economic/workforce/safety/sports/environment proposal can stand and run → Delivering gate absent/nonplayable → stage recognition cannot establish those results. Safety has no initiative path into Crime_Metrics in the catalog. | `lib/initiativePhaseContract.js:170-188,246-269`; implementation domain effects `applyInitiativeImplementationEffects.js:372-404` |
| F9 | Seat says YES in Sunday hearing → disposition stays a local voice/room record → actual engine ballot is faction/sentiment/RNG. Mayor's engine veto is likewise probability-based, not her gavel choice. | `scripts/cityHallLedger.js:3-6,78-101`; `civicInitiativeEngine.js:1120-1356,2638-2717`; C113 D2 hearing |
| F10 | Weekday statement/answer claims action occurred → numberMoved-only numeric gate passes → speech can circulate without an execution receipt. Sunday number check inspects tracker note/schedule text, not all public speech. | `cron-civic-run.js:3270-3277,1381-1389`; C113 mayor/D2 responses |
| F11 | A named parade exists in Sports summary prose → office event parser reads Chaos, World Events and selected city-event/trajectory ripple blocks → no direct sports-feed-to-official major-event route. Even eligible events are secondary facts after a single task is chosen. | `buildCivicOfficeSlice.js:94-127,155-244,664-668,1389-1404`; C113 summary `:281-287` |
| F12 | One weekday call has 1,500 output tokens for every model; broad mayor board shares the same block limits as district seats → complex work has no planned evidence retrieval/continuation budget. Actual vendor context capacity, current price and model quality are not established by configuration alone. | `cron-civic-run.js:844-859,3227-3252`; `buildCivicOfficeSlice.js:20,1234-1253` |

## Actions and causal effects that already exist

| Action/path | Persistence and effect | Limit |
|---|---|---|
| Propose | Move ledger → later candidate → Initiative_Tracker, Proposed, Type vote, no VoteCycle; `applyTrackerUpdates.js:699-783` | Filing is not execution; every proposal follows a large initiative lifecycle |
| Work | Fold writes LastWorkCycle/Seat; funded → standing, upkeep, stall revival; `cron-civic-run.js:2777-2799`; `initiativePhaseContract.js:458-488`; `applyInitiativeImplementationEffects.js:565-589` | No proof that the model's described audit or meeting actually happened |
| Call-vote / renew | Sunday schedules future vote/renewal; results written by engine; `cron-civic-run.js:2938-3005,3046-3085`; `civicInitiativeEngine.js:626-730` | Multi-Cycle latency, eligibility and funding still apply |
| Mayor gavel | May submit contract tracker fields, folded/gated by close; `cron-civic-run.js:1974-2023,2171-2208` | Not unrestricted executive authority; writing a note is not creating an event, report or service |
| Active initiative | Domain/phase effects reach target neighborhood bus; `applyInitiativeImplementationEffects.js:673-711`; city fold `applyCityDynamics.js:1469` | Category effects do not implement every meaning of a freeform title; even some pre-operation phases have texture intensity |
| Health and education | Health relief changes expected Sick; schoolQuality feeds education drift; `updateNeighborhoodDemographics.js:240-244,711-745` | Health entry gate remains F6; outcome depends on the whole engine |
| Transit | Open initiative raises station activity/on-time values with upkeep; `updateTransitMetrics.js:1114-1157` | F7 affects recognition, not existence of the station effect |
| Business/jobs | Initiative advanced/failing feeds business drift; existing BizID/OpenTrackedSlots links support civic hiring; `applyBusinessDynamics.js:624`; `civicInitiativeEngine.js:3376-3385,3493-3577` | Source capability is not proof of a specific new business/hire; engine.260 still has an organic-hire watch |
| Approval | Sponsor/mayor/faction ownership, motion events, district/city mood and press with inertia; `updateCivicApprovalRatings.js:714-748,779-829,1245-1281` | No direct accepted-action → individual reaction → credited official receipt chain; sentiment/press may move for unrelated causes |

Weekday rota selects three least-recently-attempted seats per run from nine council, mayor and chief, Monday–Thursday (`cron-civic-run.js:2318-2360,3170-3201`). Sunday has agenda → parallel hearing → gavel → projects → close → directive (`:3334-3400`). Close N folds moves N−1 (`:2704-2712`); the tick waits for a completed engine fire (`:3823-3833`). Automation already exists, but accepted move, applied row, delivered service, observed response and approval are different milestones.

## C113 saved examples

1. Mayor pack `output/cron-civic/packs/MAYOR-01_c113.json`: approval 69, selected INIT-010 committee hearing, all initiative IDs but text clipped partway through INIT-005, citywide complaint window, and an unanswered C107 directive. `output/cron-civic/datawake/civic-office-mayor_2026-10-26.json:10-23` speaks about tenant defense and accepts only answer. Its answer says an enrollment event is scheduled; that answer is not an event write.
2. D2 pack `output/cron-civic/packs/COUNCIL-D2_c113.json`: approval 68, INIT-006 construction review, INIT-006/008/009 board, no complaints and one constructive participation record, C111 directive. `.../datawake/civic-office-council-d2_2026-10-28.json:11-28`: answer accepted, propose rejected, numberMoved still "2". This field is not a derived count of executed actions.
3. D9 pack `output/cron-civic/packs/COUNCIL-D9_c113.json`: approval 65, empty board, no complaints, no selected turn; `.../datawake/civic-office-council-d9_2026-10-29.json:10-13` makes no move. It receives health/safety condition problems alongside "no move this cycle".
4. C113 close `output/cron-civic/close_c113.json:22-34` says applied=true. `output/cron-civic/moves/fold_c113.json:2-23` folds five project-director work records and one D4 proposal from C112. `output/cron-civic/moves/moves_c112.jsonl:20-25` records applied outcomes. Saved `output/beats/Initiative_Tracker.jsonl:12` has INIT-013, Ivy Hill Community Revitalization, Proposed, safety, blank vote. This shows a filed proposal reached a saved tracker snapshot, not a delivered service.
5. `output/civic-voice/council_d2_c113.json:5-21` says YES on INIT-008 with empty trackerUpdates. Its eventual engine vote is a separate mechanism (F9).

## Major events and existing citizen/media receivers

The saved C113 summary retains the A's parade as a **C111** sports editorial-note at `output/world_summary_c113.md:281-287`: it describes a seventh championship parade/rally, with typed Neighborhood Downtown. The prose also contains a route-place spelling that must not be silently converted into another canonical neighborhood. This is evidence of a sourced major city event and of historical carry, not evidence of a new parade in C113. A replay must preserve C111 and must not stage another parade.

`phase02-world-state/applySportsSeason.js:168` reads typed sports-feed fields; `updateTransitMetrics.js:639-664` emits geographically scoped game-day transit ripples. `phase04-events/buildCityEvents.js:445,576-584` can generate championship-season city texture. None of these inspected paths establishes that the named parade feed record becomes a distinct city event with a route, participants and official awareness.

Existing receivers are valuable: `generateCitizensEvents.js:1753-1780` offers prior-evening named city-event attendance/hearsay to citizens; `runYouthEngine.js:387-412` reads active neighborhood Community_Programs; `buildContractSeeds.js:351-374,408-440` joins programs, cause ripples and citizen life events for media. Its domain map at `:34-54` assigns sports to SPORTS, city-event to COMMUNITY and transit-event to CIVIC. The plan must preserve causal IDs across those routes and permit a major event to matter to several desks and officials without duplicating the underlying event or promising publication.

## Models, context and time

| Seats | Configured model in scripts/civic-office-map.json |
|---|---|
| Mayor | moonshotai/kimi-k2 |
| D1, D3, D5, D9 | deepseek/deepseek-v4-flash-0731 |
| D2, D4 | meta-llama/llama-4-maverick |
| D6, D7, D8 | google/gemini-3.7-flash |

The map's metadata at `:6-17` records deliberate different model families across the mayor and party groups. Preserve that intent in evaluation; neither this research nor the plan selects a replacement vendor model. The live model fields, not stale examples inside the metadata, define the current configuration.

Weekday output ceiling is 1,500; council hearing 4,000; mayor open/gavel 5,000 (`cron-civic-run.js:3252,1663,1587,2010`). Synchronous requests have a 180-second timeout and DeepSeek v4 reasoning disabled (`:844-886`). Call failures get bounded retry/provider fallback; validity failures get same-model repair (`:1414-1476`). Sunday also has a distinct Gemini batch profile (`:1721-1729`). These are runtime settings, not verified current vendor capabilities or evidence that the limits are sufficient. Weekday result serialization does not retain a complete token/finish/latency bill (`:2400-2409,3307-3315`).

Reuse [[plans/2026-09-22-agent-model-fit-test]] and `scripts/modelFitRun.js` / `scripts/modelFitScore.js` after reconciling their older inputs and schema. Freeze the actual serialized prompt, not just the larger disk pack. Old prices, comparative model claims and context-window assumptions require a new provider check before any approved paid comparison.

## Wiring cards and proof still needed

Historical cards: [initiative tracker](../../output/wiring-card-Initiative_Tracker.md), [initiative engine](../../output/wiring-card-runCivicInitiativeEngine.md), [implementation effects](../../output/wiring-card_applyInitiativeImplementationEffects_.md), [approval](../../output/wiring-card-updateCivicApprovalRatings_.md). Line maps may be stale; source pointers above are from this investigation.

No causal replay, engine bench, deployment parity check, live Sheet readback, current provider capability check or new model evaluation was performed. Claims of actual improvement must eventually prove decision → committed effect → affected citizen/business/event → observed response → attribution → next official pack; a successful API response or applied tracker row alone cannot prove that chain.

## Changelog

- 2026-10-31 (codex) — Documented current civic wakes, actions, C113 receipts, model limits and major-event gaps; distinguished typed health vote deadlock from the separate gavel route; linked implementation plan.
