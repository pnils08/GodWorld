---
title: Every Saved Word Reaches the Dials Plan
created: 2026-11-16
updated: 2026-11-16
type: plan
tags: [engine, draft]
sources:
  - live Reflection_Intake read 2026-11-16 (rows by Daypart C114–C116; graded rows by score)
  - utilities/compressLifeHistory.js readPendingReflections_ (:289) — the drain composes Tag + Affect only
  - scripts/cron-saturday-run.js:504-531 — print selection writes `byline-published` usage (MEDIA tier), no Reflection_Intake row
  - "[[2026-11-16-page-labels-off-citizens-memory]] §Out of this plan"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.347"
---

# Every Saved Word Reaches the Dials Plan

**Builder's words (2026-11-16):** "it seems like all media is 3/3 so its not the best method to grade them on, they may get a dial boost from being selected to run in the saturday run, if its isnt set that way the better event would be \"my article was selected to run in the cycle pulse\", yes what the councils and workers are saying should move thier dials, how these are flagged to increase or reduce the dials I wouldnt know the answwer to that, but anything a cron says that is saved to a memory story should show on reflecyion ledger and have postive or negative effects on the dials, in the next session we will do deeo dive work in dials to get these moving more"

**Goal:** every cron's words saved to a citizen's memory page also land on Reflection_Intake and move that citizen's dials up or down; a reporter's dial event is being printed in the Cycle Pulse, not the desk grade.

**Rows:** engine.347 · **Owner:** research-build · **Next session:** the deep dive on dials (his words above); the plan is finished there, not here.

## Read (2026-11-16)

- **Who reaches the ledger today:** citizen-wake.js, citizen-exchange.js, cron-work-wake.js, citizenVoice.js (press interviews and the reporters' `filed:` / `graded:` self-records), discord-reflection.js, personaProvider.js, undockedShowGate.js, citizen-signal-detector.js. Live C114/C115: about 230 rows a Cycle, ~164 of them PRESS.
- **Who does not:** the officials' weekday datawake and the Sunday cascade statements (officeWall.js → pages only), the council seat wakes (seatWake.js), the 14 city workers on the worker template from 2026-11-16 (workerWake.js), Mara's directive notes (cron-civic-run.js:1254), Varek's journal (civisJournal.js:503), the reporter walls (reporterWall.js). Their words reach their pages and move no dial.
- **The drain:** `compressLifeHistory.js` reads each unapplied row's Tag + Affect (columns E, H) and accretes `mapDelta × 0.45 × 0.5` into base; the text is not read.
- **The grade as a dial event:** 179 graded rows. On the 4-point scale (to 2026-11-10) 89 of 145 were 4/4; on the 3-point scale (from 2026-11-11) 26 of 34 are 3/3. Each is classified (e.g. Tag Education, Affect Content) and applied.
- **Print selection:** the Saturday run writes `byline-published` to Citizen_Media_Usage for each printed filing (MEDIA tier credit, engine.88); no Reflection_Intake row, so being printed moves no dial. 0 PRESS rows mention being printed.

## Deep-dive read (2026-11-16, second session)

Builder's words: "they arent moving enough on the events and reflections and too many run the same … all events and wakes are driving who they are, new intake sim_ledger populating the dial systems."

Basis: ledger copy after C116 (1,075 rows, `output/simulation_ledger_snapshot.jsonl`), its git history back to C108, the C115–C116 reflection rows, and each citizen's own stamped LifeHistory lines (the cells Phase 9 folds — not LifeHistory_Log, which carries log-only Advancement rows that fold nothing). Scripts: `output/research-build/2026-11-16-dials-measure.js`, `…-dials-project.js`. Compiled code reads: `…-dials-readers.md` (25 call sites), `…-dials-engine-writers.md` (every line kind), `…-dials-cron-writers.md` (six reflection writers, classifier, insertion points). Wiring cards: `compressLifeHistory_`, `Reflection_Intake`, `getCitizenDialBands_`, `nudgesForEvent_` (in session).

### State

| Measure | Value |
|---|---|
| Middle band on all 8 non-fandom dials | felt value (base + mood) 619 of 1,075 (58%); permanent base 687 (64%); 546 of 911 on 2026-09-08 |
| Below 40 on any dial (felt value) | 5 citizens (4 composure, 1 family; 4 of the 5 are under 40 on base); 0 below 20 |
| Share a band vector with someone (felt value) | 91%; top 10 vectors hold 75% |
| Base exactly 50 | integrity 960, fandom 753, family 733, outabout 728, openness 667, warmth 602 |
| Archetype Drifter (TraitProfile face, from base) | 677 |
| Dials outside the middle (felt value), mean by Tier | T1 3.52 · T2 1.51 · T3 1.17 · T4 1.16 |
| Newest 150 (POP-01100+) within 5 of 50 on all 8 | base 145; felt value 96 |
| Watermark stuck past the current Cycle | 13 citizens (POP-01029–01041, `folded` 133): no line of theirs has folded since C101, none will before C134 (open on engine.323) |

### Movement

| Window | Any permanent move | Permanent band crossed | Mean permanent points, 9 dials |
|---|---|---|---|
| C115 → C116 | 39% | 1% (12 citizens) | 0.66 |
| C113 → C116 | 68% | 4% | 1.79 |
| C108 → C116, 8 dials (the one-time fandom seed left out) | 82.5% | 6.9% (65 of 948) | 3.38 |

- Direction C108 → C116, citizens up / down: sociability 427 / 0, drive 353 / 7, openness 192 / 2, fandom 314 / 0, warmth 201 / 16, outabout 131 / 48, family 56 / 20, integrity 29 / 41, composure 276 / 204.
- C116 lines in the cells: 2,464; 83% worth 1 point; 70 worth 6 or more; 80% of pushes up. Citizens net up / down: sociability 308 / 11, warmth 177 / 6, integrity 48 / 0, fandom 226 / 0, drive 162 / 19, composure 239 / 186.
- C115 → C116 by voice: 126 citizens with a reflection row moved 269 permanent points (mean 2.14, all moved), 199 of them from the reflections themselves; 937 without moved 434 (mean 0.46, 30% moved).
- The fandom count above (314 / 0) is 269 one-time seed + 45 organic.

### Causes (code)

1. **Size.** Every routine pool line is S = 1 (`generateCitizensEvents.js:1218`, `runNeighborhoodEngine.js:714`, `generateGenericCitizenMicroEvent.js:436`); the band-odds keys for them were held (`2026-10-18-event-engines-move-dials` line 65). M and L come only from Relocation (`migrationTrackingEngine.js:813-816`), game-night triggers, and the civic-role / promotion / home dice. C116 cells: 1,894 S, 32 M, 0 L. A band is 20 wide.
2. **Permanence.** A Cycle's net push lands in mood, fades ×0.8 (fandom ×0.9), and reaches base only on a third same-direction Cycle (`citizenMemory.js:108-153`), 40% of the swing × room to the edge. **Above a felt value of 68.75 a 1-point push can never bake in:** it adds under 0.625 to mood, the next settle takes it under 0.5 and zeroes it (`:209`), and a zero mood resets the streak (`:150`). A residual swing the other way resets a new run the same way. Straight-to-base paths: reflections at `delta × 0.225` (`compressLifeHistory.js:126-127`, `citizenMemory.js:185`), the chaos break (`citizenMemory.js:333-345`: composure −4 / −8, openness −2 / −4), integrity wear, and the legacy trim fold (`compressLifeHistory.js:654`, unstamped lines, each a streak step in one Cycle).
3. **Direction is authored into pool text and leans up.** `dial:` tags 91 up / 19 down in the main generator, 79 / 9 generic, 28 / 2 youth, 67 / 12 game-mode. Fixed-positive kinds whatever the text: Media +4 (incl. "named in a hard light"), Work / Career +4, Education +5 / +3, Lifestyle, Undocked-Audience. Unsigned lines (chaos reactions, civic news, bias, hood texture) are never written. Mis-signs found: `family:divorced` → composure up (`:1185`); PrevEvening "avoided X after the crowds" up, "still buzzing from celebrations" down; QoL text containing "neighbor" content-routes to sociability +3 / warmth +2 (`citizenDialMap.js:297`). **Kinds with no map entry are read by word-match on the prose (`CONTENT_RULES`, `citizenDialMap.js:271-300`), counted in the cells:** `[Business]` "paid its owner $0 — the books cut the draw" → drive +6 / openness +3 (17 lines); `[Money]` debt cleared, debt crossed a line, borrowed, defaulted → nothing (147 lines); "the ground gave a little" → composure −6 and drive +2 (33).
4. **Downs cannot repeat.** Pressure adapts after 6 Cycles, a confrontation rests its bond 6, the conduct engine runs 3 tests a Cycle, bond withdrawals fire once per bond. Integrity wear is on live (World_Config `integrityWearRate` 1, floor 10, read 2026-11-16): 39 citizens down a step C115 → C116, 33 regained. Transgressions need integrity under 40; nobody is (lowest base 43.0; 20 citizens under 45). Only fandom can harden down (a 3-week losing stretch).
5. **Readers are flat in the middle.** Every banded reader returns ×1.0 at band 0, so the 619 are one person to the engines; their wake prompt reads "Your temperament: even-keeled, unremarkable." (`lib/citizenDials.js:49-55`). One reader works inside the middle: the promotion die ranks a business's staff into thirds by raw drive (`runCareerEngine.js:554-560`). Live-dead readers: the crime ladder, casino refusal and tilt, burnout health, openness ±1 on migration. Dead code: `checkWedding_`, `checkPromotion_`, trait-word weights, game-mode trait pools.
6. **The loop tilts up.** Participation and pool weights rise with drive, outabout and sociability (`generateCitizensEvents.js:2735`, `:3458`): a higher dial draws more lines, most of them up.
7. **New citizens.** A blank DialState is seeded at the first fold: 50 on eight dials, fandom from the household or 65 for a franchise player or staffer (`compressLifeHistory.js:551`, `:585-600`). One mint writes dials: a council challenger (`updateCivicApprovalRatings.js:1504-1515`). The mint's own sentence (`processAdvancementIntake.js:1122`) folds on the first Cycle by word-match: "Promoted to Tier N…" → drive +7 / composure +2 (89 citizens), "Arrived in … migration wave" → sociability +4 (36), and a job title containing "Hospital" → composure −6 (11 hospital hires). Out-of-Cycle rewriters, if run: `drainReflectionBacklog.js --commit`, `backdateCitizenDials.js --apply` and `seedTier1EssenceLive.js --apply` (the last two rebuild the cell from base and fandom only, dropping mood, streak, watermark, pressure, wear, grief, pet).
8. **Reflection rows.** Six writers; a classifier miss writes no row. Per Cycle about 163 PRESS rows = 87 interview answers + 38 `filed:` + 38 `graded:`; the last two are build strings classified as "a person's short reflection on their day" (`graded: 4/4 — nothing fell short` → Education / Content → drive, openness, composure up). The event vocab has no ordinary-bad tag (conflict, withdrawal, being wronged) though the dial map does (`Spat`, `Disappointment`, `ConnectionWithdrawn`, `TrustGuarded`); the affect vocab has no flat tag. C114+ affects: 67% Calm / Content. Sociability by reflection: 782 rows up, 0 down, all time.

### Projection (each citizen's own last 8–12 weeks replayed forward; no reflections, no feedback from changed odds)

One-step check against the real C116 fold: 874 of 937 reflection-free citizens reproduced exactly.

| Rule set | Week 10 all-middle / crossed a band | Week 52 all-middle / crossed / any low band | Sociability mean at 52 |
|---|---|---|---|
| Today (base start: 64% all-middle, sociability 58) | 59% / 9% | 38% / 43% / 4% | 62 |
| Lines ×2 | 54% / 17% | 21% / 69% / 10% | 65 |
| Lines ×3 | 48% / 26% | 11% / 83% / 14% | 67 |
| A quarter of each week bakes in | 55% / 18% | 23% / 67% / 8% | 65 |
| ×2 and a quarter | 44% / 35% | 7% / 90% / 16% | 69 |
| ×3 and a quarter | 36% / 47% | 3% / 96% / 24% | 73 |
| ×2 and a quarter, 3 in 10 routine ups read down | 49% / 28% | 15% / 79% / 20% | 67 |

Speed alone moves the whole city the same way: the 2026-09-08 "same saint" state returns at any faster rate until lines read down as often as what they say.

Known lean of the table (agy review): leaving out reflections and the odds feedback understates the upward drift; drawing one-off weeks (a wedding, a mint sentence) again and again overstates single-citizen extremes; the last row flips a whole week's net, not each line, which overstates the low-band share. The direction of the conclusion holds under all three.

### Efficiency and upkeep

- The fold reads the whole Reflection_Intake tab each Cycle (2,808 rows, every one already applied, about 230 added a Cycle, nothing prunes).
- `S.lifeHistoryCompression` (the fold's own counts: reflections moved, lines folded, wear) has no reader outside tests; nothing reports dial movement per Cycle.
- `compressLifeHistory.js` carries the retired v1 trait machinery (`TAG_TRAIT_MAP` through `extractMotifs_`), header v2.0 against `COMPRESS_VERSION` 3.0.
- `Reflection_Intake` is absent from `SHEETS_MANIFEST.md`; the stub map lists the fold only, not the six cron writers.
- 12 rows stamped Cycle 119 are July 2026 wake rows, applied; not a live fault.

### Reviews reconciled

agy, `output/antigravity/2026-11-16-review-dials-read.md` (SHIP-WITH-FIXES). Each finding checked against code or a re-run before it was taken.

| Finding | Check | Disposition |
|---|---|---|
| State table mixes felt value and base | re-run: 687 all-middle on base; newest 150 are 96 on felt value | taken — rows labelled |
| C108 → C116 counts the fandom seed | re-run: 82.5% / 6.9% / 3.38 on 8 dials | taken |
| 126 voiced citizens: 199 of 269 points are the reflections | replayed `accreteReflectionsIntoBase_`: 199 | taken |
| "No writer emits M or L" wrong | `migrationTrackingEngine.js:813-816`; C116 cells 32 M | taken — cause 1 reworded |
| Integrity wear is on live | World_Config read: rate 1, floor 10 | taken (found the same before the review landed) |
| Streak lock above 68.75 | read `citizenMemory.js:87-100`, `:150`, `:209` | taken — cause 2 |
| Chaos break and legacy trim bake straight to base | `citizenMemory.js:333-345`, `compressLifeHistory.js:654` | taken — cause 2 |
| `[Business]` / `[Money]` / mint sentences read by word-match | counted in the cells: 17 / 147 / 136 lines | taken — causes 3 and 7 |
| Challenger mint writes dials; franchise fandom 65 | `updateCivicApprovalRatings.js:1504-1515` | taken — cause 7 |
| 13 watermarks stuck at 133 | snapshot: POP-01029–01041 | taken — State; already on engine.323 |
| Promotion die reads raw drive inside the middle | not opened this session | recorded as agy's claim in cause 5 |
| Projection biases (three) | script read: flip is on the week's net (`…-dials-project.js:67`) | taken as a stated lean; table not re-run |
| Ranking: permanence, direction, size, readers, downs, reflections, new citizens, loop | agy's judgment | recorded; the order of work is the builder's |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Deep dive on dials with the builder (next session): how a saved line is flagged up or down; the dial map; why dials move little | rb + builder | not started |
| 2 | Each non-writer above writes its Reflection_Intake row beside its page write | rb | not started |
| 3 | Reporter dial event: "my article was selected to run in the Cycle Pulse" from the Saturday print set; the desk grade stops feeding dials (his words) | rb | not started |

## Acceptance

1. Every page write by a cron has a matching Reflection_Intake row the same day — proven by a page/ledger count per writer over one live week.
2. An official's, a worker's and a printed reporter's dials move at the next fire after their rows land.

## Changelog

- 2026-11-16 (research-build) — Row filed on the builder's word; the read above is what the deep dive starts from.
- 2026-11-16 (research-build) — Deep-dive read added (state, movement, eight causes, 52-week projection, upkeep); agy adversarial review requested.
- 2026-11-16 (research-build) — agy review folded: 13 findings checked, 12 taken, 1 recorded as its claim; row in-progress.
