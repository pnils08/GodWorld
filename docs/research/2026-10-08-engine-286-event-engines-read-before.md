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
| `generateCitizensEvents_` (the main generator, ~3,200 lines) | **every clock** (tiers 1–4, no clock or flag gate; flags only fill a lookup), life-state gated — corrected from my first card read by codex, §7 | world state plus crime, faith, sports week and feed, initiative events, neighborhood state, previous evening, content ledger, UNDOCKED feed, folk memory (engine.94) | LifeHistory_Log and Generic_Citizens **direct, in-cycle**; ledger rows; Content_Telemetry by intent | richest reader of the eight; reads `crimeByNeighborhood` which nothing writes; ten orphan or private fields |
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

1. Civic role engine: fold into civic-mode (one civic line source), re-align in place, or retire. **Builder 2026-10-09: retiring it is off the table** — re-align in place; the plan keeps it and the civic-mode events from narrating the same action twice. (Builder: "an engine that could be better aligned with the sim and actual events that drive actions.")
2. For the guardrailed canon figures, how much should world-state texture be replaced by lines caused by their own row and role — and which canon figures are "authored, never pool-drawn" (standing rule for top-tier seats).
3. Whether the Universe pipeline's post-career note stays as a trickle or becomes the retired players' state-conditioned life (they stay flagged, so the regular-life engines will not reach them).

## 7. Compared with codex's independent run (2026-10-08)

Codex's report: [[../../docs/for-claude-review/2026-10-08-codex-engine286-read-and-plan]] (273 lines, eight tasks, six builder calls, plus a builder amendment appended). Disclosure: codex read plan line 200 and lines 187–190 before stopping, so the run is not perfectly blind.

**Agree.** The main generator is the engine already shaped by the citizen; the rest are thinner. Do not wake the civic role engine as written — re-align it to real official actions or retire it, no new engine file. The flag, clock and death rulings stay untouched. The main generator and the Universe pipeline write the log tab directly in-cycle. Births and intake promotions should write explicit flags (codex: `no/no/no` for ordinary births and promotions, protected entrants only from authoritative intake facts).

**Codex found what I missed — adopt (codex-measured, I have not re-run these):**
1. **Hard output quotas.** The generic micro-event writes exactly 25 lines in each of C106–C110, the neighborhood engine exactly 6, game-mode is capped at 15. They walk the ledger in sheet order and stop: none of C110's 25 micro-event recipients sits past ledger row 500. That breaks the "no output quotas" doctrine and decides who lives an event by row position.
2. **Dial scoring answered (my open item).** Plain tags score nothing: Daily, Personal, Neighborhood, Micro-Event, Background, Lifestyle, Civic, Civic Perception, Sports atmosphere all map to `{}`. Scored: Work (drive +4), Civic Role (sociability +5, drive +2), Media, Community, Cultural, Faith, PostCareer, Friction/Strain/Stumble. So the biggest line types in §2 move no dial, and bad news written under `[Daily]` does nothing.
3. **Premise defects that fire as canon.** The event content ledger's condition scope has no clock, flag or employer, so a work line can assert a workplace the row does not support (an A's beat reporter, POP-00017, badging into the Baylight office). Civic-mode's chief pool "approved patrol deployment adjustments" records a decision nothing enacted; the media pool gives every role press-box lines whenever sports is in season.
4. **Timing.** The civic role engine runs before initiative resolution in the phase order, so an action-driven rewrite cannot see same-cycle outcomes where it sits. The neighborhood engine can discard its drawn line and substitute a pressure line (a retag in effect), and can assign a neighborhood before its roll.
5. **Wake loop trace** (builder amendment): which parts of the event → dial → wake → reflection → next-cycle chain exist (wake perception, maneuver posture, home-buy chance) and which are missing.

**Where I overstated or erred.**
- "Four engines draw on nothing from the citizen's row" is too strong: civic-mode and media-mode scale by health and condition on role, office and current votes. They do not condition on the person's own state (wealth, household, heritage).
- My card row for the main generator said ENGINE-clock, unflagged. Wrong: it admits every clock and flags are a lookup only (table cell corrected above). The six engines that do skip flagged rows are the generic micro-event, relationship, household, career, education and neighborhood.
- **Tre Mingo (POP-00123, Active, port worker, T4) is still on UNI.** I called the flagged survivors "eight retired A's players"; codex shows six are Retired, Mason Miller is an Active analyst, and Mingo is a working civilian in the same block I should have cleared. Needs a builder look.

**Builder amendment (relayed in codex's file, 2026-10-08; in the builder's words, not yet confirmed to me directly).** The goal is not tidier generic events: it is fewer generic events and events that help or obstruct the citizens' pursuits — tier up, media coverage, family, a home, kids, a promotion, the heritage ledger, UNDOCKED, following the teams — as dice-roll complications and edges for citizens who wake as crons, with the event content ledger supplying variety so the code carries less prose depth. Tier, hood, net worth, dials, flag and clock make events unique. This moves the deliverable from "align the generic engines" to "consequential event families with a roll, a persisted consequence and a wake-readable stake", and it settles codex's calls 2 and 6; calls 1, 3, 4, 5 remain.

## 6. Next

Codex is running the same job independently (task: `docs/for-claude-review/2026-10-08-engine286-codex-independent-run-TASK.md`, output `docs/for-claude-review/2026-10-08-codex-engine286-read-and-plan.md`). When it lands: compare read to read first (where the two disagree is where one of us is wrong), then cut one plan with the engine.284 build folded in. The merged plan is cut: [[../plans/2026-10-08-engine-286-game-of-life-events]] (Agreed / Needs proof / New concepts, each pointing back here and at codex's report); it was: the merged skeleton starts from codex's tasks 2–8 re-ordered around the amendment (one consequential path proven end to end first, quotas and premise defects second).

Ignited plans: none yet. Verdict: adopt (the job is ruled; this is its substrate read).
