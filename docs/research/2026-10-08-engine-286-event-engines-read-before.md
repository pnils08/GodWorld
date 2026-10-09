---
title: engine.286 — the generic event engines against the game of life: read-before
status: draft — research-build's independent read; codex runs its own, the two are compared before any plan is cut
owner: research-build (read); engine-sheet (substrate, bench, deploy)
parent: [[../plans/2026-07-31-citizen-memory-perception]] §engine.284 (the flag audit that found this); engine.284 is folded into this job
related: [[../plans/2026-07-18-event-pools-design]] (engine.67, closed 2026-09-29), [[2026-09-08-dials-as-a-game]], [[../plans/2026-09-10-inactivity-is-regression]], [[../plans/2026-06-30-central-generator-atmospheric-expansion]]
---

# engine.286 — the generic event engines against the game of life: read-before

Builder direction 2026-10-08: the generic citizen events (daily, neighborhood, personal, civic role) are random draws; revisit them so they align with the sim and the game-of-life elements. Every structural line below comes from the eight wiring cards run 2026-10-08 (engine-wiring, one per engine) plus the C110-end ledger dump; the conditioning table is a coarse text count (see §2). Nothing here was run, benched or written to the sheet. What I did NOT read end to end: the 3,200-line `generateCitizensEvents_` body, and the dial readers behind the engines' dial bands — those are the first things the compared plans must open.

## 0. What is already ruled or built (pointers, not re-argued)

- **Flags are canon guardrails and stay; clock mode routes; Universe and media clocks cannot die, the civic clock rolls** — builder 2026-10-08, [[../plans/2026-07-31-citizen-memory-perception]] §engine.284.
- **engine.67 (closed 2026-09-29) already built the life-state gate**: impossible content is a HARD gate (a child doing rent math), merely-unlikely is down-weighted; adopted by the citizen-facing generators; family simultaneity (rare), heritage↔city events, bonds world-wide shipped with it. North star: *"how a citizen, its household with heritage alter what fires at them"* ([[../plans/2026-07-18-event-pools-design]] §North star). So engine.286 is not greenfield — it is the engines engine.67 did not reach, and the step from "what cannot fire" to "what does fire because of this life".
- **Dials follow events; fix the event engines, never retag texture** (standing). Dials→event probability was wired into ten generators in engine.32 T5 (S255).

## 1. The eight engines (cards, 2026-10-08)

| Engine | Selects | Reads | Writes | Notes |
|---|---|---|---|---|
| `generateCitizensEvents_` (the main generator, ~3,200 lines) | ENGINE clock, no flag, life-state gated | world state plus crime, faith, sports week and feed, initiative events, neighborhood state, previous evening, content ledger, UNDOCKED feed, folk memory (engine.94) | LifeHistory_Log and Generic_Citizens **direct, in-cycle**; ledger rows; Content_Telemetry by intent | richest reader of the eight; reads `crimeByNeighborhood` which nothing writes; ten orphan or private fields |
| `generateGenericCitizenMicroEvents_` | ENGINE clock, no flag | world state only (season, weather, mood, world events, city dynamics, economic mood, holiday, sports atmosphere) | LifeHistory_Log by intent | `microEvents` write is orphaned; no open rollout row names it |
| `runNeighborhoodEngine_` | ENGINE clock, no flag | world state plus `neighborhoodState` pressure | LifeHistory_Log by intent; moves the citizen's neighborhood field | `neighborhoodDriftEvents` and `neighborhoodAssignments` orphaned; manifest does not list the log tab for this file |
| `runCivicRoleEngine_` | **dead** — exact `y` vs ledger `yes` | world state only | LifeHistory + log by intent | 1.5–8% per citizen per cycle, generic pool plus role and hood lines; `civicRoleEvents` orphaned |
| `runAsUniversePipeline_` | UNI flag; GAME active rows idle, retired GAME → ENGINE hand-off, retired ENGINE + UNI → post-career note | world state | LifeHistory_Log **direct, in-cycle** | ≤10%/cycle `[PostCareer]` note; `postCareerEvents`, `canonSportsPhase` orphaned |
| `generateGameModeMicroEvents_` | GAME clock; citizen type by UNI/MED/CIV flag and role | world state plus dial bands | LifeHistory_Log by intent | gates traded and pending; two orphaned detail fields |
| `generateCivicModeEvents_` | CIVIC clock | civic state: initiative events, votes, grants, event arcs, crime, civic load; Civic_Office_Ledger lookup | LifeHistory_Log by intent | manifest lists it as writing Civic_Office_Ledger; it only reads it |
| `generateMediaModeEvents_` | MEDIA clock | civic state (votes, grants-unused, event arcs, crime, civic load), sports season, weather | LifeHistory_Log by intent | reads `grantsThisCycle` and never uses it |

All eight run in Phase 5, before the Phase-10 executor, at the same two entries. Seven of the eight appear nowhere in the rollout by name.

## 2. Does the draw follow the citizen? (coarse text count over each file)

| Engine | dial bands | life-state / eligibility | wealth | household | heritage |
|---|---|---|---|---|---|
| `generateCitizensEvents_` | yes | yes | yes | yes | yes |
| generic micro-event | yes | **no** | **no** | **no** | **no** |
| neighborhood engine | yes | **no** | 2 mentions | **no** | **no** |
| game-mode micro-event | yes | **no** | **no** | **no** | **no** |
| civic role | **no** | **no** | **no** | **no** | **no** |
| Universe pipeline | **no** | **no** | **no** | **no** | **no** |
| civic-mode | **no** | **no** | **no** | **no** | **no** |
| media-mode | **no** | **no** | **no** | **no** | **no** |

Caveat: a string count, not a trace. The micro-event and neighborhood engines may reach life state through a helper this count misses; the civic and media engines read real civic state (votes, arcs, crime) but not the individual's own row. The plans must trace, not trust this table.

Live data point (C110-end ledger, 1,025 rows): 924 citizens carry at least one line stamped Y3C6, 2,489 lines in all. By tag: Neighborhood 622, Daily 361, Civic Perception 305, Personal 267, Sports 226, PrevEvening 146, Background 66, Lifestyle 64, Strain 60, Media 56, FirstFriday 51, Micro-Event 32, Work 28, Money 25, Casino 22, Education 18, Civic 16. The ledger retains 18 `[PostCareer]` and zero `[Civic Role]` lines in total. The two lines a work-and-money life should lean on most (Work 28, Money 25, Career 9) are the smallest of the daily tags; Neighborhood and Daily are the largest.

## 3. What the reads say (each is a claim for the plans to attack)

1. **The main generator is the one engine already shaped like the north star.** The seven others are flatter. The gap is not "all random": it is a two-speed system — one engine conditions on the life, the rest broadcast world state.
2. **Four engines draw on nothing from the citizen's own row** (civic role, Universe pipeline, civic-mode, media-mode). For the guardrailed canon figures — the people the flags protect — those four are most of what happens to them. The protection works (nothing random changes their job or household) but what they live is world-state texture.
3. **The civic role engine is the cleanest case for the builder's point.** It would wake as a flat 1.5–8% pool pick on the mayor's office and council. Aligning it means its lines come from what that official actually did or faced this cycle (the vote they cast, the initiative on their desk, the district condition) — which `generateCivicModeEvents_` already reads and writes for the CIVIC clock. Two engines now write generic civic lines to the same people; whether civic role folds into civic-mode, or is retired, is the first design question.
4. **Direct in-cycle writers.** `generateCitizensEvents_` (two tabs) and the Universe pipeline write sheets directly in Phase 5, ahead of the executor; the other six queue intents. Whether both are on the SHEETS_MANIFEST §9 carve-out table is unchecked — a tabled direct write is a class, an untabled one is a bug.
5. **Dead fields everywhere.** At least ten orphan writes across the eight, one phantom read (`crimeByNeighborhood`), one dead read (`grantsThisCycle` in media-mode). Cheap to clean, but removal is not alignment.
6. **Dial scoring is the unknown that decides the cost.** A line moves a dial only if a reader scores its tag. Which of these engines' tags are scored, and by whom, determines whether re-aligning an engine changes citizens' dials or only their page. No named dial reader of the `[Civic Role]` tag was found; the `[Neighborhood]` and `[Daily]` tags were not traced.

## 4. Weakest assumptions in this read

- **"Four engines condition on nothing."** Based on a string count. If they pull the row through a shared helper, the table is wrong for them. Attack: open each engine's per-citizen loop and list every row field it reads.
- **"The main generator already aligns."** Based on the card's field list and engine.67's design, not on its output. Attack: sample twenty citizens of different life states (a retiree, a renter, a household with children, a high earner) and check whether their Y3C6 lines differ the way the design says.
- **Tag counts as evidence of imbalance.** The Work and Money lines are small in a one-cycle window; they may be small by design (rarity ruling). Attack: the same count over several cycles and against the engine.67 weights.

## 5. Builder calls this read already surfaces (for the plan, not decided here)

1. Civic role engine: fold into civic-mode (one civic line source), re-align in place, or retire. (Builder: "an engine that could be better aligned with the sim and actual events that drive actions.")
2. For the guardrailed canon figures, how much should world-state texture be replaced by lines caused by their own row and role — and which canon figures are "authored, never pool-drawn" (standing rule for top-tier seats).
3. Whether the Universe pipeline's post-career note stays as a trickle or becomes the retired players' state-conditioned life (they stay flagged, so the regular-life engines will not reach them).

## 6. Next

Codex is running the same job independently (task: `docs/for-claude-review/2026-10-08-engine286-codex-independent-run-TASK.md`, output `docs/for-claude-review/2026-10-08-codex-engine286-read-and-plan.md`). When it lands: compare read to read first (where the two disagree is where one of us is wrong), then cut one plan with the engine.284 build folded in. Plan cut waits for a fresh session.

Ignited plans: none yet. Verdict: adopt (the job is ruled; this is its substrate read).
