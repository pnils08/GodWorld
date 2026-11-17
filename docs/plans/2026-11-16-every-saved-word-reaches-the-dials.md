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

**Rows:** engine.347 (saved words), engine.349 (wrong reads, knobs, moves ledger, speed), engine.350 (direction, harder hits), engine.351 (intake) · **Owner:** research-build · **Next session:** the deep dive on dials (his words above); the plan is finished there, not here.

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
| Watermark stuck past the current Cycle | 13 citizens (POP-01029–01041, `folded` 133): the mark jumped at the first watermark fold (C107; unset in the 09-13 copy, 133 in the 09-20 copy); their C108+ lines have not folded and none will before C134 (open on engine.323) |

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
3. **Direction is authored into pool text and leans up.** `dial:` tags 91 up / 19 down in the main generator, 79 / 9 generic, 28 / 2 youth, 67 / 12 game-mode. Fixed-positive kinds whatever the text: Media +4 (incl. "named in a hard light"), Work / Career +4, Education +5 / +3, Lifestyle, Undocked-Audience. Unsigned lines (chaos reactions, civic news, bias, hood texture) are never written. Mis-signs found: PrevEvening "avoided X after the crowds" up, "still buzzing from celebrations" down (`family:divorced` → composure up was listed here by tag name; its one line, "handled a logistics call with an ex — civil, brief, done", reads right and stays); QoL text containing "neighbor" content-routes to sociability +3 / warmth +2 (`citizenDialMap.js:297`). **Kinds with no map entry are read by word-match on the prose (`CONTENT_RULES`, `citizenDialMap.js:271-300`), counted in the cells:** `[Business]` "paid its owner $0 — the books cut the draw" → drive +6 / openness +3 (17 lines); `[Money]` debt cleared, debt crossed a line, borrowed, defaulted → nothing (147 lines); "the ground gave a little" → composure −6 and drive +2 (33).
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

## Rulings after the read (builder, 2026-11-16)

Six calls put to him; his answer verbatim: "1 yes 2 yes 3 yes 4 middle 5 yes or the dial just need to move more and need to create ways they can be hit harder, winning or losing a bet is a good one that can drive up and down, not performing well on undocked vs doing well and being ranked other good ones, yes intake needs to provide the data the sin ledger needs or thier intake fails and sits on intake until complete row down. also a ledger that tracks dial moves is needed so it can be managed? does world_config have dials for this?"

| Call as put | His word | Reading |
|---|---|---|
| 1 Fix the wrong reads on the bench | yes | Task 2 |
| 2 Build the 11-16 saved-word ruling | yes | Tasks 3–5 |
| 3 Lines move a dial by what they say, down as often as up; before speed | yes | Task 7 |
| 4 Speed: lines doubled, a quarter of each week sticks | middle | Task 9, after Task 7 |
| 5 Should 55 read differently from 50 | "yes or the dial just need to move more and need to create ways they can be hit harder" | not built first: movement and harder hits land, the middle is re-measured, then his call (Task 10) |
| new: harder hits, both ways | a bet won or lost; an UNDOCKED run that went badly against one that went well and was ranked | Task 8 |
| 6 Arrivals start from their life | "intake needs to provide the data the sim ledger needs or their intake fails and sits on intake until complete" | Task 11: an incomplete intake row is not minted and stays on the intake tab |
| new: a ledger of dial moves | "so it can be managed" | Task 6 |
| Does World_Config have dials for this | — | Live read 2026-11-16 (253 keys): yes for the two dice (`civicRole*`, `lifeEvent*`), the pressure bars (`dialFrictionRentBurden`, `dialSetbackLossPct`, `dialHoodPressureBar`, `dialHoodCrimeBar`), integrity wear and grief. No for the speed itself: line size (1 / 2 / 4), fade (0.8), the three-Cycle rule, the share that sticks (0.4), the reflection weight (0.45 × 0.5) and the band edges are constants in `citizenMemory.js` / `citizenDialMap.js` / `compressLifeHistory.js`. Task 6 moves them. |

## Build review reconciled

agy re-review of the diff, `output/antigravity/2026-11-17-review-dials-diff.md` (HOLD). Checked before taken; fixes in `5da47216d`, benched again after.

| Finding | Check | Disposition |
|---|---|---|
| My reading of the third fire (re-signed lines move the hood pulse, the draws follow) is wrong | sync logs: live read 82,713 rows before the second fire, 82,720 before the third; the feed seed appended 2 sports rows, then 0 (the real C117 feed had landed on live); `pulseKindForLine_` re-signs Neighborhood lines only | taken — retracted. The second-vs-third comparison is confounded by input; the fold-only replay on the third fire's own data stands (176 citizens differ, 17 permanently: the 13 + 4 streaks that now complete) |
| Catch-up settle stops at the last held line | read `foldNewEntries_` | taken — the swing also fades for the Cycles since |
| `[Business] Took over …` still goes to the word-match | `processAdvancementIntake.js:2693` | taken — exact map key at the same value |
| Mint sentences fixed at the parser, not the writers; bare "hospital" still in the word-match | diff | kept as built; Task 2(a) reworded to say so; the residual class is Task 7's |
| A corrupt open cell writes nine moves from 50; a non-number dial writes NaN | read `buildDialMoves_` | taken — counted and logged, never written |
| Three `typeof` guards can hide a missing helper | read | taken — each logs to Engine_Errors; the summary carries `queued` |
| Tests feed strings, not the writers; `dialReflectionShare` untested; no bad-fade case | test files | taken — source assertions on the four writers, a reflection run at three key values, a refused fade |
| `scripts/drainReflectionBacklog.js` uses the code constants, not the key | `:35-36` | recorded — a manual lever; it drains at the seed value until it reads World_Config |
| Live repair: exact POPIDs, exact 133 | — | taken — `output/research-build/2026-11-17-e349-live-marks.js` |
| Run time +26 / +30 s on the bench with no per-phase split | fire responses carry `ranMs` only | recorded — the tail is read at C117 (engine.95) |

## Tasks

| # | Task | Row | Status |
|---|------|-----|--------|
| 1 | Deep-dive read; agy review folded | engine.347 | done 2026-11-16 |
| 2 | Wrong reads. (a) A job title or employer name moves nothing. As built: the parser (`parseHistoryLine_`) reads the mint sentences as their own kinds — "Promoted to Tier N in Cycle C. …" and "The record catches up: …" → `Intake` (no dial), any "Arrived in <place> …" → `Arrival` — so the three writers and the stored text are untouched; the owner door's bare `[Business]` line has its own map key. The health word-match still carries the bare word "hospital" for other unmapped lines; that class goes with Task 7 (writers sign their lines). (b) The PrevEvening "avoided the crowds" and "still buzzing" lines, Media "in a hard light" and "the spotlight moved on", and the `[Business]` draw line (raised / cut) take the sign of what they say, at the writer. (c) The streak lock: the settle floor scales with the room the swing has (`citizenMemory.js:209`), and the pending-mood test in the fold matches it (`compressLifeHistory.js:569`). (d) A catch-up fold settles between Cycles (`foldNewEntries_`). (e) After (d) is live: the 13 watermarks set to 107, backup first, read back | engine.349 | a–d built `6eb7bdb51`, tests green, on the bench; (e) after the deploy |
| 3 | Grade strings stop writing reflection rows — the page write the next wake reads back stays (`citizenVoice.js:241-253`), only the ledger append is skipped; a printed reporter gets one row, "my article was selected to run in the Cycle Pulse", from the Saturday print set | engine.347 | not started |
| 4 | Classifier (before the new writers): ordinary-bad event tags the dial map already carries (a fight, a snub, a letdown, a bond gone cold) and a flat affect; the prompt stops calling every input "a reflection on their day"; `reflectionClassifier.test.js` Tests 3 and 6, `AFFECT_VALENCE` and the signal detector's pole table move with it | engine.347 | not started |
| 5 | Office, seat, worker, Mara and Varek words write a Reflection_Intake row beside the page write (insertion points: `…-dials-cron-writers.md` Part 4) | engine.347 | not started |
| 6 | Speed keys in World_Config, seeded at today's values, validated before the Cycle and never thrown inside Phase 9 (the `integrityWearRate` pattern): `dialLineScale` 1, `dialDirectShare` 0, `dialMoodFade` 0.8, `dialHardenShare` 0.4, `dialReflectionShare` 0.225. Band edges stay code (five copies; not a speed). `Dial_Moves`: this Cycle's movers, one row per citizen and dial (from, to, band, what moved it), the tab replaced each Cycle from a copy of DialState taken when the ledger opens, so chaos breaks, wear, reflections, lines and mints are all in the difference. `Dial_Pulse`: one row a Cycle, city totals per dial (up, down, bands crossed), kept. Both queued in Phase 9; both tabs ensured | engine.349 | built `4e2e075b0`, tests green, on the bench |
| 7 | Direction: unsigned lines get the sign of their fact and are written; fixed-positive kinds (Work, Career, Education, Lifestyle, Media) read their line; `[Money]` lines are signed at their writers (the judicial hold and ticket lines stay unmoved, pinned in `judicialLifecycle.test.js:671-673`); the pools are counted up against down per dial before and after | engine.350 | not started |
| 8 | Harder hits both ways: a bet by its size against what the citizen holds; an UNDOCKED run by its result and rank | engine.350 | not started |
| 9 | Speed set to the middle row (lines doubled, a quarter of each week sticks) by World_Config, after Task 7 is live and measured | engine.349 | not started |
| 10 | Re-measure the middle after 7–9; put "does 55 read differently from 50" back to him with the numbers | engine.349 | not started |
| 11 | Intake, both doors (`Intake` → `processIntake_`; `Advancement_Intake1` → `processAdvancementIntake_`): the fields the ledger and the first dial seed need are named; a row missing one is held on its tab with what is missing while the other rows go through (today a blank birth year, hood or role is filled by a draw or a default); an arrival's dials start from that data | engine.351 | not started |

Order: 6 (bench pair on one Cycle: without and with the keys) → 2 (bench) → one deploy → 2(e) → 3–5 (cron scripts, no engine deploy) → 7–8 → 9 → 10; 11 on its own.

## Acceptance

1. Every citizen, office, seat and worker page write that carries the speaker's own words has a matching Reflection_Intake row the same day — a page / ledger count per writer over one live week. A reporter's grade page and a journalist's side of an exchange are not counted.
2. An official's, a worker's and a printed reporter's dials move at the next fire after their rows land.
3. Task 2: unit tests pin each fix (a hospital job title moves nothing; a cut draw moves a dial down; a 1-point push at 75 survives a settle and a third same-way Cycle hardens; a two-Cycle catch-up settles between). On the bench: 0 Engine_Errors, and the 13 fold their held lines with their marks set to 107.
4. Task 6: two bench fires of the same Cycle from the same live sync, PROD code then the candidate, give the same DialState cell for cell; each citizen's Dial_Moves rows equal that citizen's DialState difference across the fire.
5. Tasks 7–9, on the bench over 10 Cycles from a live sync: pushes per dial within 60 / 40 either way on every dial but fandom; about 1 citizen in 3 crosses a band; every dial has citizens in a low band (count reported per dial); nobody pinned at 0 or 100.
6. Task 11: an intake row with a missing field stays on the intake tab after a fire; a complete one mints with dials that are not all 50.

## Plan review reconciled

agy, `output/antigravity/2026-11-16-review-dials-plan.md` (HOLD on the first cut as written). Checked before taken.

| Finding | Check | Disposition |
|---|---|---|
| The 13 marks jumped at C107, not C101; 101 double-folds 94 lines | git copies: `folded` unset 09-13, 133 on 09-20 with every other row at 103–108; agy's mood arithmetic puts the jump one settle before that copy | taken — 107; State row corrected |
| A catch-up fold applies Cycles back to back with no settle | read `foldNewEntries_` `:1644-1648` | taken — Task 2(d), ahead of the repair |
| `[Money]` has pinned zero-move lines (judicial hold, ticket) | `judicialLifecycle.test.js:671-673` | taken — `[Money]` leaves Task 2 for Task 7, signed at the writers |
| `[Business]` carries raised and cut under one key | `generationalWealthEngine.js:1198` | taken — signed at the writer, Task 2(b) |
| Two more mint sentences | `checkForPromotions.js:479-481`, `generateGenericCitizens.js:729` | taken — Task 2(a) |
| `citizenDials.test.js:238` pins Advancement → drive 6 by word-match | test read | kept as is: the Advancement line is log-only; Task 2 does not touch that rule |
| Media "hard light" shares the Media key | `citizenDialMap.js:86` | taken — a graded tag at that one writer |
| Streak lock: floor to 0 breaks one-off expiry; `:569` must move with `:209` | read both | taken — floor scaled by the swing's own room; pending test = any live swing |
| No pin at 100 once the lock lifts | agy's run; unit test to pin it | taken as a test in Task 2 |
| Band edges duplicated in five places; list keys truncate in `loadConfig_` | not opened | band edges stay code; every key is one number |
| A throw in Phase 9 is swallowed and the fold skipped | `compressLifeHistory.js:465-484` pattern read | taken — validate before the Cycle, log and fall back inside it |
| The run's tail is already over its reserve (62 s, 74 s) | engine.95 row | taken — Dial_Moves is one replace, Dial_Pulse one row; no trimmer needed; tail read at the bench |
| A Phase-9-only recorder misses chaos breaks and mints | `chaosCarsEngine.js:503` | taken — difference against a copy taken at ledger open |
| Task 5 before Task 4; grade page write must stay | `cron-desk-run.js:1529-1541`, `citizenVoice.js:241-253` (agy's lines, opened at the build) | taken — reordered |
| Acceptance 1, 4, 5 unmeasurable as written | — | rewritten |
| Task 11 names no tab and no refusal scope | two doors confirmed by name only | taken into the task; the field list is set at that build |

## Changelog

- 2026-11-16 (research-build) — Row filed on the builder's word; the read above is what the deep dive starts from.
- 2026-11-16 (research-build) — Deep-dive read added (state, movement, eight causes, 52-week projection, upkeep); agy adversarial review requested.
- 2026-11-16 (research-build) — agy review folded: 13 findings checked, 12 taken, 1 recorded as its claim; row in-progress.
- 2026-11-16 (research-build) — Builder's rulings on the six calls recorded verbatim; tasks 2–11 set across engine.347 / 349 / 350 / 351.
- 2026-11-16 (research-build) — agy plan review folded (16 findings: 15 taken, 1 kept as is); Task 2 and 6 respecified, order and acceptance rewritten.
- 2026-11-16 (research-build) — Task 6 (`4e2e075b0`) and Task 2 a–d (`6eb7bdb51`) built; three-leg bench run started (`output/research-build/2026-11-16-e349-bench.sh`).
- 2026-11-17 (research-build) — Bench: Task 6 identical on 1,077 of 1,077 citizens, Dial_Moves 437 = 437; agy re-review folded (`5da47216d`); candidate re-benched.
