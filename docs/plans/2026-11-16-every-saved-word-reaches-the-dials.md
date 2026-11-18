---
title: Every Saved Word Reaches the Dials Plan
created: 2026-11-16
updated: 2026-11-17
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

## Task 4 review reconciled

agy, `output/antigravity/2026-11-17-review-classifier-cut.md` (HOLD on the cut as briefed, `output/research-build/2026-11-17-rb-brief-agy-classifier-cut.md`). Checked before taken.

| Finding | Check | Disposition |
|---|---|---|
| A blank affect cell for Flat: outranks Calm / Content in wake memory recall, leaves the signal detector's window total while the baseline keeps those rows as Calm / Content, prints "they seemed preoccupied" in the wake ripple, and cannot be told from a miss | `lib/resonanceRecall.js:71-77` (no affect 0.5, Calm 2 / 5 = 0.4); `citizen-signal-detector.js:63-75,121-130`; `citizen-wake.js:461`; `buildCitizenWeekDigest.js:227` | taken — `Flat` is a recorded tag with a `DIAL_MAP` key; the four readers changed; my reason for blank (the fold word-matches the snippet for an unmapped affect) is answered by the key, at the cost of an engine deploy |
| `Disappointment` moves nothing on the reflection path and takes real setbacks from `Stumble` | `citizenDialMap.js:190,425`; the tightened gate: a missed promotion read `Disappointment` (LOST) | taken — dropped; `Stumble`'s gloss carries a hope or plan that fell through |
| The gate passed a bad event read as a nothing-tag, and a mood read as Flat | `classifierGate.js` `runOrdinaryBad_`, `runSet_` | taken — `lostDown` and Flat-on-a-mood both fail the gate |
| The speaker rule: a reporter whose own event is the story; grief over someone else's death; a worker whose job is the subject | gate cases added: front page → `Media`; "I retired on Friday" → `Retirement`; grief → composure −3; a crisis shift → `Career` | first two hold. The third stands: a worker's statement reads `Career` (drive +4) or `Civic` (nothing) whatever the shift was — the fixed-positive `Career` of Task 7; carried into Task 5 below |
| No engine path but the fold reads a reflection row's tag; `Stumble` as a pressure-state tag is safe (the cause lookup needs the emitter's exact sentence) | agy's trace, `citizenDialMap.js:258-268,391-399` | recorded — none found |
| Only `civicPetitions.js:121` and `buildCivicOfficeSlice.js:1047` switch on the Tag column (`Civic` only): a civic grievance tagged `Spat` or `TrustGuarded` leaves the petition pool | read both | recorded — the replay moved 7 of 30 `Civic` rows out (Media 3, Neighborhood 2, Personal 1, Hospitalized 1), none to a bad-event tag; 5 came in (Setback 2, Resisted 1, Career 1, Neighborhood 1) |
| `drainReflectionBacklog.js:72` never marks a zero-move row applied | read | recorded — gap log G-EC51; a manual lever |
| The dual prompt still ends on a bare literal line | `reflectionClassifier.js` `buildDualPrompt_` | recorded — no writer and no gate calls it now; the gate runs the triple prompt the writers call |

Replay (`output/research-build/2026-11-17-classifier-replay.js`, the 284 live C115–C116 rows re-classified, nothing written):

| Measure | Stored tags | New prompt |
|---|---|---|
| Flat | — | 118: reporters' `filed:` / `graded:` strings 83 of 90, press answers 31 of 102, wakes / work / exchanges / nightly 4 of 92 |
| Composure, rows up / down (net points) | 195 / 89 (+29.0) | 96 / 70 (−2.0) |
| Composure on wakes, work and exchanges alone | 49 / 43 | 45 / 43 |
| Sociability, rows up / down | 49 / 0 | 56 / 3 |
| Drive, rows up / down | 96 / 10 | 76 / 13 |
| Rows with an ordinary-bad event | 0 | 10 (Stumble 6, ConnectionWithdrawn 3, TrustGuarded 1); 2 of the 10 are doubtful reads (a man reaching out to his wife read as drifting apart) |
| Bystanders tagged with someone else's Retirement | 3 | 0 |
| Mood changed sign | — | 9 of 284, both ways |

What the replay shows for the next tasks: (Task 3) a `filed:` string now reads `Media | Flat` on 29 of 45 — sociability +4 × 0.225 a filing, the only thing it moves; a `graded:` string still reads `Education` (drive +5, openness +3) on 35 of 45. (Task 5) an office or worker statement reads `Career | Flat` or `Civic | Flat`: `Career` is drive +4 a statement, four a week, whatever it says; `Civic` moves nothing. (Task 7) sociability, drive and openness by reflection still lean up — the event tags that carry them (`Media`, `Career`, `Education`, `Community`) are fixed-positive.

## Task 5 read (2026-11-17)

What the five writers saved to pages from Mon 2026-11-09 through Tue 11-17 (two Sunday chains, C115's run on 11-09 and C116's on 11-15), read off the pages (`output/research-build/2026-11-17-job-statements-read.js`, 40 speakers), then put through the live classifier, nothing written (`…-job-statements-replay.js`, `…-replay-out.json`).

| Measure | Value |
|---|---|
| Saved lines | 144: Sunday `stated:` lines 119 (57 and 58 a chain, 4 on 11-16), weekday `datawake:` 21, Varek's journal 2, Mara's directive entry 2 (`directive-run`, daypart blank; 0 `directive-note` entries in the window) |
| Lines a speaker a Sunday | mayor about 21; a council seat 3–7; a project director 3–6. Median line 225 characters |
| Sittings (one speaker's lines from one day) | 57 |
| Read per line | `Civic` 129, `Career` 12, `Media` 3; `Flat` 124 of 144. 111 `Civic \| Flat` move nothing. Drive 16 up / 0 down; composure 6 up / 14 down; mayor's week +5.0 drive before room scaling |
| Read per sitting | `Civic` 52, `Career` 5; `Flat` 47 of 57. 44 `Civic \| Flat`. 13 of 57 move a dial: drive 7 up / 0 down, composure 4 up / 6 down, warmth 0 / 1 |
| Varek's journal | both weeks move composure down (a mood); Mara's two directive entries read `Civic \| Flat` |
| Already on the ledger for the same speakers | one `work` reflection a week each (two for Varek and two workers), press answers, a debate side |

- The fold has no cap on rows a citizen a Cycle (`citizenMemory.js:197-214`): each row adds its tags × `dialReflectionShare`, scaled by room. One row a line is 21 rows on the mayor every Sunday.
- A row tagged `Civic` is counted as a citizen's civic voice by `civicPetitions.js:121` and `buildCivicOfficeSlice.js:1047`, and as a complaint when its mood is a bad one: an office holder's own statement would enter the petition count for their neighborhood unless those two readers leave the new dayparts out.
- Four workers' statements of 11-16 are not on their pages: engine-sheet removed them on the builder's word (`5fdc52e1d`, gap log G-EC52, closed). The page / ledger count of acceptance 1 reads the page, not the run record.

## Task 5 as built (2026-11-17)

Builder, on the three ways a job statement could land (only what shows / doing the job counts as work / the result decides): "Proceed on option 1". As put to him: the statement moves a dial when the speaker shows a feeling or something bad happened to them; plain city business moves nothing; the result deciding goes with the harder hits (Task 8). The count he was given for last week (13 of 57 sittings move someone) included 3 `Career | Flat` sittings that this rule lands at nothing, and was a joined read; as built the same nine days give 16 of 52 rows (below).

1. **One file holds the rule and the write**, `lib/jobStatementRows.js` (beside `lib/reporterDialEvents.js`); tests `lib/jobStatementRows.test.js` (84).
   - **Landing.** Each saved line is read on its own by the live triple classifier. The sitting's mood is the one shown in the most lines (a tie: the larger move, then the earlier line); no feeling in any line is `Flat`. The event is kept only when a line reads a bad thing that happened to the speaker — `Stumble`, `Spat`, `TrustGuarded`, `ConnectionWithdrawn` — and is otherwise stored `Civic` (an exact `DIAL_MAP` key that moves nothing): `Career`, `Media`, `Community` and every other tag for what the speaker was doing or talking about never reach the fold from a job statement. A test places every `EVENT_VOCAB` tag in one list or the other, so a new tag fails until it is placed. No read on any line writes no row (as the six writers today).
   - **Sitting.** One row per speaker per sitting, not per saved line (the fold has no cap on rows a Cycle). `CIVIC`: the speaker's lines of one Central day not yet on the sheet — a later run the same day is its own sitting, nothing is dropped. `directive` and `journal`: one a Cycle, the first to land (a rerun rewrites the same page entry). Column D carries the page's own daypart: `CIVIC`, `directive`, `journal`.
   - **Spool, then flush.** Each writer queues the speaker's words to an append-only file for the Cycle (`output/cron-civic/job-statements/spool_c<N>.jsonl`) only after its page write is recorded; the same words from the same speaker queue once a Cycle. A flush, under one file lock, opens the three newest spools, groups the unsettled lines into sittings, reads `Reflection_Intake` once (only when a sitting is owed), skips a sitting already on the sheet, classifies, appends, and marks the sitting in `landed_c<N>.jsonl`. Column A is the time the sitting's first line was queued and is the row's identity on the sheet. A classifier error on any line keeps the whole sitting for the next flush (dropped and logged after 6); an off-vocabulary read on every line is dropped and logged. Nothing in the queue or the flush can fail a page write or a civic stage.
   - **Row.** `[first-line time, POPID, Cycle, daypart, event, the lines that carry the row's mood or event (all lines when none does) to 1,200 characters, 'no', mood, '', '', '']`. The classifier reads up to 8,000 characters a line. No tension is opened and no bond target is matched.
2. **Writers** (each queues beside its page write):
   - weekday seats — `cron-civic-run.js` `positionWallRecordDatawake`: the statement itself (`officeWall.statementOf`), not the `datawake: … | action: … | signal: …` line;
   - workers — `runWorkerDatawake` after `recordPosition`: the whole statement;
   - Sunday statements — `positionWallRecordCascade` (six callers, the batch collect among them): each recorded statement's own words (`officeWall.recordCascadeForDir` returns `said`, the 500-character cut the page holds);
   - Mara — `commitDirectiveWrites`, once her entry is on her page: the directive as she wrote it (blocks and the Not-directing section, staged as `staged.said` beside `runEntry`) plus her notes; not the code-composed run entry. Her sitting answers to the run entry's page write, one a Cycle. Covers the resume and the tick's resume;
   - Varek — `civisJournal.js` after the page append, from the command line's live wiring.
   - `officeWall.backfillFromDisk` queues nothing.
3. **Flush points.** `runDatawake` before its exit code; `runChain` after the voice stages and before the close (which can exit); and any stage that ends normally, at the dispatcher — a stage run by hand lands its own words. The tick (no model) and status never flush: what the tick queues (a batch-collected seat, a resumed directive) lands at the next flush, at latest the next weekday 05:45. `civisJournal.js` flushes in its own run.
4. **Readers.** These rows are dial rows: the fold reads them; `civicPetitions.js` `visibility`, the `buildCivicOfficeSlice.js` petition pool, `buildCitizenWeekDigest.js` (the daily news show's citizen digest) and `world-view/build.js` "said" leave the three dayparts out (`isJobDaypart`), so nothing else in the city changes by this build. Unchanged: `loadWorkingCity` (daypart `work` only); `extractBondsFromWakes` (wake dayparts only); `drainReflectionBacklog.js` (a manual drain, G-EC51); `citizen-signal-detector.js` (no cron, skill or script runs it; a job row with a mood would add its speaker to that mood's count there).
5. **Proof.** The real path with the append captured (`output/research-build/2026-11-17-job-statements-dryflush.js`): the nine days' 142 saved lines queued, flushed against the live sheet and the live classifier in 134 s, nothing written — 52 rows, 16 move a dial (composure 5 up / 11 down, drive 3 up / 0 down, warmth 0 / 1), 36 `Civic | Flat`, 0 dropped. No backfill of past statements. First live rows: the Wed 11-18 05:45 weekday wake; Sunday 11-22 for the chain, Mara and Varek; they fold at the fire after they land.
6. **Known and left.** The classifier is not steady on a formal statement: the same text read twice differed on mood in 2 of 28 (replay), the same line read `Angry` one Sunday and `Frustrated` the next, and agy counts 4 of 10 moods as wrong reads (measured resolve read `Anxious`). The first live week's job rows that carry a mood are read by hand with acceptance 7. `lib/sheets.js` has no 429 retry: a refused read keeps the queue for the next flush.

## Task 5 review reconciled

agy, `output/antigravity/2026-11-17-review-job-statements.md` (HOLD on the design as briefed, `output/research-build/2026-11-17-rb-brief-agy-job-statements.md`). Checked before taken.

| Finding | Check | Disposition |
|---|---|---|
| Joining a sitting's lines before the read drowns, flips or invents a mood | replay file: of 10 multi-line sittings with a feeling in one line, the joined read left 7 `Flat`, flipped 1 (`Angry` → `Energized`), and made `Energized` from two `Flat` lines | taken — each line read on its own; the row carries the mood shown in the most lines |
| A line arriving the same Central day after a flush is dropped (the 21:00 retry, a batch-collected seat, Monday's collect against Monday's wake) | design read | taken — a later run is its own sitting; the row's identity is its first line's instant in column A |
| A sixth caller of the Sunday page write (`batchCollectHearing` `:2217`), reached from the tick | read | covered by queueing inside `positionWallRecordCascade`; the tick queues, the next flush lands it |
| A Cycle-named spool is orphaned when the Cycle advances | design read | taken — every flush opens the three newest spools; tested with a line left in an earlier Cycle |
| Stages run by hand and the directive's partial-resume return never flush | `:1306-1311`, the dispatcher | taken — one flush at the dispatcher for any stage that ends normally |
| `Setback` moves nothing on this path (composure only), the reason Task 4 dropped `Disappointment` | `nudgesForReflection_('Setback','Flat')` = `{}` | taken — four kept events |
| Mara's run entry is a memory upsert, not `appendReflection_`; 0 notes in the window; no page write matches `staged.said` | `:1249`, page read | kept — her words are queued when the run entry lands; acceptance 1 counts her sitting against that entry |
| A rerun of a weekday office or of the journal re-saves and re-queues | `lib/citizenPage.js:76-79` (same key appends into the doc) | taken in part — identical words queue once; a journal or directive redone lands no second row; a weekday statement regenerated by hand lands as a later sitting |
| The week view would show a formal statement over a citizen's own reflection | `world-view/build.js:63-70` | taken — left out of "said" |
| Missed readers: `worldViewCheck.js`, `drainReflectionBacklog.js` | read | the check validates what the view shows (nothing new); the drain is G-EC51 |
| The signal detector's numerator rises with job moods; the "already in the window" count rests on work wakes the workers no longer get | agy's counts on the dump | recorded — nothing runs the detector (no cron, skill or script) |
| No 429 retry in `lib/sheets.js`; one refused read aborts a flush | read | recorded — the queue waits for the next flush |
| Run-away: one `Angry` row is composure −0.90; five a Cycle for ten Cycles ends near 20 from 50 | agy's arithmetic | recorded — a speaker angry in office five days a week for ten weeks; the rate is `dialReflectionShare` |
| 4 of 10 moods read wrong; the same text read twice differs | replay file | recorded — §Task 5 as built item 6; hand-read in the first live week |

agy re-review of the build, `output/antigravity/2026-11-17-review-job-statements-diff.md` (SHIP-WITH-FIXES; every taken finding confirmed in the code, column A confirmed stored verbatim — `lib/sheets.js` writes `RAW`). Folded, review closed:

| Finding | Check | Disposition |
|---|---|---|
| The dispatcher flush fires on `--dry-run`, `--no-write`, `--dry-commit` | read | taken — the flush itself returns on those flags |
| A failed flush in the weekday stage is retried milliseconds later by the dispatcher (a second sheet read, a retry spent) | read | taken — the dispatcher skips the weekday stage; the chain's second flush stands (Mara's words are queued after the first) |
| An empty classifier reply drops a one-line sitting at once | `reflectionClassifier.js:384-388` | taken — an empty reply is an error, the sitting waits |
| A torn spool line with no line end fuses the next line | read | taken — a queue starts on a fresh line |
| Two processes queueing the same words at once both append | read | recorded — the chain runs under its own lock; the line would count twice in one sitting's tally |
| Test 7's source checks pass with the wiring broken | read | taken — anchored; behavioral tests added on the directive commit (`maraM1.test.js`) and the journal run (`civisJournal.test.js`); tests 84 |

## Tasks 7 and 8 read (2026-11-17)

Read-only. Basis: the ledger copy after C116 (each citizen's stamped lines C113–C116, the cells the fold reads), the live `Event_Content_Ledger` tab signed by the generator's own rule (`gradedTagFor_`, cut out of `generateCitizensEvents.js` by text), the local `Casino_Ledger` copy, `output/spacemolt-show/`. Scripts: `output/research-build/2026-11-17-e350-read.js`, `…-e350-pools.js`, `…-e350-cells.js`. Nothing written to a sheet.

### Direction (Task 7) — before

9,960 lines in the cells C113–C116; 9,856 move a dial.

| Dial | Line pushes up / down | Share up | Up comes from (lines) | Down comes from |
|---|---|---|---|---|
| drive | 631 / 84 | 88% | Work 168, Education 81, promotion die up-S 50, Career 37 | Personal 66, CivicRole down 11 |
| sociability | 1,602 / 45 | 97% | Neighborhood 446, Media 379, Civic Perception 179, Daily 118 | ConnectionWithdrawn 40, CivicRole down-L 5 |
| warmth | 836 / 53 | 94% | Daily 221, Personal 168, Bond 143 | TrustGuarded 53 |
| openness | 1,130 / 273 | 81% | Civic Perception 358, Lifestyle 285, Personal 117 | Civic Perception 273 |
| composure | 1,378 / 1,083 | 56% | Civic Perception 389, Personal 293, Daily 201 | Neighborhood 267, Personal 157, Strain 94 |
| integrity | 231 / 3 | 99% | Daily 113, Personal 60, Reputation 44 | BoundaryCompromised 3 |
| family | 362 / 133 | 73% | Daily 285 | Strain (overwork) 81, Daily 31 |
| outabout | 1,350 / 288 | 82% | Neighborhood 917, PrevEvening 212 | Neighborhood 134, Friction 67 |
| fandom | 1,018 / 0 | 100% | Sports 564, Undocked-Audience 251, Sports-Win 190 | none in a winning month |

Acceptance 5 asks 60 / 40 on every dial but fandom. Composure passes; the other seven do not.

Where the lean sits:

| Place | Count | What it means for the build |
|---|---|---|
| Kinds that push up whatever the line says | Media 379 lines (+4 sociability; the three commonest texts are a reader's line about the Tribune — 148, 146, 129 — one of them "disagreed with a Tribune column out loud to an empty kitchen"), Lifestyle 326 (10 texts, all up), Work 168 (+4 drive on 88 texts of ordinary shifts), Education 81, Career 37 (+4 drive on "had a routine period", "felt subtle workplace tension due to city happenings") | Reading the line turns most of these into plain days that move nothing, a few up, a few down. It lowers the up count; it adds few downs |
| The authored pool on the live content tab, signed lines up / down | sociability 29 / 0, warmth 14 / 0, openness 33 / 2, drive 18 / 1, family 38 / 5, outabout 38 / 8, integrity 4 / 2, composure 18 / 27, fandom 32 / 0; every signed line is band S (269 of 269) | No line on the tab says the down side of sociability or warmth. Signing cannot balance what is not written |
| Tab lines with no sign of their own | 696 of 965: 466 are the two dice (signed by the roll), 157 ride a fixed kind (occupation 101, undocked 56), 16 ride a fixed key (retirement, media, fame, faith), about 57 are never written (economy 20, civicNews 11, prevEvening 9, communityLife 7, nbhdState 4, sports 4, neighborhood 1, homeLife 1) | The 57 take the sign of their fact or stay unwritten |
| `[Money]` lines that move nothing, all cells | debt cleared 69, an unplanned week on savings 37, defaulted 13, borrowed 12, debts crossed a line 7, bad week borrowed 4, ticket 4 (pinned unmoved), savings crossed six figures 1 | Six shapes to sign at their writers |
| Count of lines dropped each Cycle for having no sign | not kept: `S.engine299.noDial` has no reader outside tests | read it at the bench |

### Bets (Task 8)

| Measure | Value |
|---|---|
| Wagers on the tab copy | 228: 61 lost, 57 won, 65 voided at the gate, 45 open; sports 127, UNDOCKED 101; 215 bettors, 3 the most by one |
| Settled a Cycle, C107–C116 | 9 to 26 |
| What a bet moves today | a win composure +2, drive +1; a loss composure −3 — the same at any size (`CONTENT_RULES` on the line's words) |
| The big-loss line (`[Setback]`, composure −5) | 0 of 94 settled bet lines in all cells. It needs a stake of 5% of net worth (`dialSetbackLossPct` 5, live); a stake is capped at 4% of net worth at placement (`casinoStake_`), so it fires only if net worth falls a fifth between the bet and the result. The second one (lost the last of it, borrowed) 0 |
| Stake | $23 to $2,000, median $302 |
| Amount won or lost against net worth today | median 0.07%, 90th 0.27%, largest 2.8% |
| Amount won or lost against one week of pay | 10th 8%, median 14%, 90th 24%, largest 33% |
| Settled bets by share of a week of pay (under 10 / 10–20 / over 20) | wins 21 / 30 / 6; losses 14 / 35 / 12 |

### UNDOCKED runs (Task 8)

| Measure | Value |
|---|---|
| What a pilot's run moves today | one drawn line from 8 fixed texts, kind `Reputation`: integrity +3, sociability +2, the same after any night. 32 such lines in all cells, on 19 of the board's 32 pilots |
| What the engine holds at the fire | each aired night's points, credits, combat, mishaps, magnitude (`S.undockedFeedEntries`); the board's totals and leader (`S.undockedBoard`) |
| Nights a Cycle | 3 to 8, on 2 or 3 pilots; a pilot flies 2 or 3 nights in one Cycle (median 2 episodes a pilot) |
| Points a night since the points board (C114) | 6 to 32, median 25; none at zero. Credits a night, all 88: 61 at zero, 25 up, 2 down |
| Mishaps on the board | 0 pilots; combat 4 pilots |
| So | no night is bad on its own number; "went badly" has to be read against the other pilots of the week or against the board |

### Rulings on the read (builder, 2026-11-17)

Three calls put to him; his answer verbatim: "1. You ,and if possible , have grok on openrouter help In some way. That LLM has a darker side 2 . Agree and what makes them choose is up to you 3. So for context this is the most popular reality show in their world , a lot of events fire to citizens regarding their run. So a bad run would get talked about , so if each pilot gets 2 runs in a week and score 0 , that's breaking even. So 0 and below probably not good ."

| Call as put | His word | Reading |
|---|---|---|
| 1 Who writes the missing down lines | "You", with Grok on OpenRouter helping | research-build writes them; Grok drafts, research-build cuts and signs. Bench tab first; the live tab write is many rows and waits on his go with the list |
| 2 A bet is sized against a week of pay, three steps | "Agree"; "what makes them choose is up to you" | size = amount won or lost over one week of pay (under 10%, 10–20%, over 20%); how a citizen picks a stake is research-build's to set |
| 3 What a bad run is | a pilot's week that scores 0 or below is not good; the city talks about a bad run | the week is the unit (a pilot's nights in one Cycle, summed). Which number is the score is not settled by his words: see the table below |

A pilot's week scored both ways, all 42 pilot-weeks on disk (C103–C116; 26 of two nights, 10 of three, 6 of one):

| Score read as | 0 or below | Above 0 | Since the points board (C114, 9 pilot-weeks) |
|---|---|---|---|
| Credits (the wager market's `credits_sign`; 0 is the push) | 20 (2 below, 18 at 0) | 22 | 7 at 0, 2 above — the board's top three all at 0 |
| Points (what the board ranks on since C114) | 7 | 35 | 0 scored nights at 0; one week reads 0 because its points were not yet read that night |

### Down lines, first cut (2026-11-17)

Grok (`x-ai/grok-4.3`, OpenRouter) drafted two rounds, one call a dial: 254 lines, then 168 on a sharper brief after the first came back as people looking at their phones (`output/research-build/2026-11-17-e350-grok-downlines.js`, drafts `…-grok-downlines.json`, `…-r2.json`; reported cost $0.08). The brief is a line-library writing job: the city, the form, the dial's down side, what is out (crime, violence, death, illness, anything a paper would report). research-build cut and wrote: **148 lines** in `…-e350-downlines-cut1.json` — sociability 21, warmth 21, drive 21, openness 21, integrity 22, family 22, outabout 20; 111 from the drafts (as drafted or trimmed), 37 written here; 0 already on the tab. Each carries who it can happen to (anyone 99, parent 10, working 11, teen 12, child 7, married 5, retired 4). On no sheet.

Where they go is the build's: the tab draws by pool key, each eligible key the same share (`generateCitizensEvents.js:51-55`), and the tab is 2,257 of the 4,997 lines logged C115–C116; the code pools are the rest (sociability 330 up / 2 down, warmth 238 / 0, openness 367 / 0 from code alone), so the code pools take down lines too and that part is an engine deploy.

### Down lines on the bench tab (2026-11-17, SANDBOX 1004 @208 = stage 53, no code change)

Two legs, each from a fresh live sync, each firing C117 and C118: the tab as on live, then the tab + the 148 rows at Weight 0.5 (`output/research-build/2026-11-17-e350-tab-bench.sh`, tool `…-tab-bench.js`, log `…-tab-bench.log`, counts `…-tab-bench-ctl.json` / `-rows.json`). Four fires PASS (206 / 243 / 222 / 191 s); Engine_Errors rows 9 before and after; the apply read back 148 rows on the bench and the live tab at 1,001 before and after. Counted on the bench's LifeHistory_Log, line pushes up / down:

| Dial | Tab as on live | With the 148 rows | Down-pool lines |
|---|---|---|---|
| drive | 365 / 42 (90% up) | 359 / 115 (76%) | 80 |
| sociability | 708 / 0 (100%) | 618 / 86 (88%) | 86 |
| warmth | 323 / 0 (100%) | 280 / 79 (78%) | 79 |
| openness | 543 / 129 (81%) | 458 / 198 (70%) | 79 |
| composure | 589 / 488 (55%) | 530 / 452 (54%) | — |
| integrity | 111 / 2 (98%) | 88 / 77 (53%) | 76 |
| family | 183 / 58 (76%) | 152 / 134 (53%) | 80 |
| outabout | 549 / 178 (76%) | 541 / 225 (71%) | 79 |

Lines 4,464 → 4,535; from the tab 1,820 → 2,235 (41% → 49%). Every down key drew about 80 lines whatever its dial's up volume (one share a key), so integrity and family reach 60 / 40 and the heavy-up dials do not: sociability still has 353 coded and 265 tab lines up, drive 300 coded. What is left on those is the fixed kinds (Media, Work, Career, Education) and the coded pools; the tab weight is re-read after they are cut. Both legs were synced before engine-sheet set POP-00007's dials on live (23:20); the final sync carries the new row.

### The fixed kinds: what is being cut and in what order (2026-11-17)

Standing word on these lines, read before the cut (`docs/plans/2026-09-21-care-and-justice-system.md:619`): builder 2026-10-02 "reads the tribune no, job and faith yes", corrected 2026-10-03 — job and faith lines MOVE dials; the Tribune wiring is left as it is. So Work and Career keep moving dials; what changes is the size (the everyday step, not a hiring's +4) and the direction (what the line says). Builder 2026-11-17 on the career loop: "It's just a color adding events engine". **Media reader lines (front page, clipping, column — 423 of the 639 Media lines in all cells, sociability +4 each) are not touched until he says which way his 10-02 "no" cuts.**

**Career texture, built (not benched):** `phase05-citizens/runCareerEngine.js` `CAREER_SIGN_BY_TEXT_` + `careerTextureTag_` — all 146 texture texts listed: 91 up, 18 down, 37 plain (composure 14 / 14, drive 19 / 4, outabout 36 / 0, openness 12 / 0, sociability 9 / 0, warmth 1 / 0). A signed line is written `Career-<Dial>-<Up|Down>-S`; a plain or unlisted one is drawn, counted against the cap and in `S.engine299.noDialBySource` (`runCareerEngine:Career:plain` / `:unlisted`), and not written. The bare `Career` key (drive +4) stays for the authored essence rows; `Career-Training` / `-FirstFriday` / `-CreationDay` / `-Holiday` are no longer written (their only other reader is the retired v1 trait map). Tests: `scripts/careerTextureSign.test.js` (every pool text listed, every listed text in a pool, each tag folds one step), `scripts/careerEngineReach.test.js` section 0 added and its fixed draw signed in the sandbox only.

Reads put to the builder with the bench count (his to overrule):

| Lines | Read as |
|---|---|
| 36 lunch, coffee and errand lines near work ("grabbed dim sum during lunch break") | outabout up one step (the alternative is plain, and the hood's work colour stops being written) |
| a slow stretch (winter, the holiday slowdown, lighter summer workflow, a weather slowdown) | drive down |
| "covered for vacationing colleagues" | drive up |
| "noticed how competence attracts new expectations"; "encountered early autumn workload restructuring"; "navigated the busy Downtown commute"; "felt the holiday rush in service industries"; "caught the bus home after a long day" | composure down |
| "felt slightly more confident in their role" | composure up |
| "prepared for the holiday break"; "navigated year-end administrative tasks"; "grabbed a quick meal before an early shift"; every "noticed the … rhythm" line | plain, not written |

Order from here: Education texture, then Work (the coded flavours and the tab's 101 occupation rows — the rows need a `dial:` tag each on the sheet, bench first), `[Money]`, bets; one bench for the lot.

### Bets as designed (2026-11-17, research-build's under his "Agree")

| Piece | Design |
|---|---|
| Size | the amount won (payout less stake) or lost (stake) over one week of pay: small under 10%, medium 10–20%, large over 20%. Settled bets to date fall wins 21 / 30 / 6, losses 14 / 35 / 12 |
| Hit | small = what any bet gives today (win composure +2, drive +1; loss composure −3). Medium: win composure +3, drive +1; loss composure −4. Large: win composure +4, drive +2; loss composure −5, drive −1 (the size of the `Setback` line that cannot fire). Written as its own key at the writer; the word-match on the line's text goes |
| What makes them choose | stays as built: the week's posture (a climber stakes 12–30% of a week, anyone else 8–20%, a retreat half), wealth level's cap, a roll, and the low-composure tilt. It already spreads bets over the three sizes. Not rebuilt |
| Kind readers | every reader of the `Casino` kind and of the three loss sentences is listed on the wiring card before the cut |

## Tasks

| # | Task | Row | Status |
|---|------|-----|--------|
| 1 | Deep-dive read; agy review folded | engine.347 | done 2026-11-16 |
| 2 | Wrong reads. (a) A job title or employer name moves nothing. As built: the parser (`parseHistoryLine_`) reads the mint sentences as their own kinds — "Promoted to Tier N in Cycle C. …" and "The record catches up: …" → `Intake` (no dial), any "Arrived in <place> …" → `Arrival` — so the three writers and the stored text are untouched; the owner door's bare `[Business]` line has its own map key. The health word-match still carries the bare word "hospital" for other unmapped lines; that class goes with Task 7 (writers sign their lines). (b) The PrevEvening "avoided the crowds" and "still buzzing" lines, Media "in a hard light" and "the spotlight moved on", and the `[Business]` draw line (raised / cut) take the sign of what they say, at the writer. (c) The streak lock: the settle floor scales with the room the swing has (`citizenMemory.js:209`), and the pending-mood test in the fold matches it (`compressLifeHistory.js:569`). (d) A catch-up fold settles between Cycles (`foldNewEntries_`). (e) After (d) is live: the 13 watermarks set to 107, backup first, read back | engine.349 | LIVE 2026-11-17, PROD stage 51 @186 (`5da47216d`); (e) done on live, 13 of 13 read back |
| 3 | The reporter's own events (`lib/reporterDialEvents.js`). Graded: the desk grade writes no Reflection_Intake row; its page line and the tension read stay (`citizenVoice.js`, the next wake reads the line back). Filed (builder 2026-11-17: "keep it on drive small"): the `filed: <headline>` row stays and lands by a fixed tag, `Media-Drive-Up-S` with `Flat` (drive +1 before the reflection share) — the classifier is not called on a headline. Printed: the Saturday sheets step writes one row per reporter per Cycle Pulse, daypart `PRINT`, `Media-Drive-Up-M` with `Flat` (drive +2), "My article was selected to run in the Cycle Pulse: <headline>", from the same print set and resolved POPID as the byline-published credit; a rerun writes nothing. The week view leaves `PRINT` rows out of "said". Printed on drive at the middle step (builder 2026-11-17: "drive is fine, keep it") | engine.347 | LIVE 2026-11-17. Read at the Tue 11-17 18:15 write wake: 5 filings, 5 rows `Media-Drive-Up-S \| Flat`, 0 graded rows, the grade line on 4 of the 5 reporters' pages (the Lives page carried no grade). Still to read: Sat 11-21 print (one `PRINT` row per printed reporter) |
| 4 | Classifier (before the new writers). As built (`b426c40c8`): four ordinary-bad event tags the dial map already carries — `Stumble` (a small setback, a hope that fell through: drive −1), `Spat` (a quarrel: warmth −1), `TrustGuarded` (snubbed or wronged: warmth −1), `ConnectionWithdrawn` (drifting apart: sociability −1); `Flat`, a tenth affect that moves nothing, with its own `DIAL_MAP` key (`'Flat': {}`) and `AFFECT_VALENCE` row (`flat: 0`) — two engine files, stage 52; the prompt names what comes through the door (a reflection, an answer to a reporter, a side of a conversation, a statement made in a job) and tags the speaker's own life, not the subject; one rule block for the dual and triple prompts. Readers taught `Flat`: the signal detector (counted, never a wave), the week digest (no vignette bonus), the wake ripple (no "they seemed" clause), the week view (no mood shown). `Disappointment` is not offered: an event tag gives its non-composure dials only on this path, so it moved nothing | engine.347 | LIVE 2026-11-17: the classifier and its readers from the commit; the two engine files PROD stage 52 @187 |
| 5 | Office, seat, worker, Mara and Varek words write a Reflection_Intake row (insertion points: `…-dials-cron-writers.md` Part 4). Where a statement lands (builder 2026-11-17: "Proceed on option 1"): only what shows — the mood as read, an event only when something bad happened to the speaker; the job itself moves nothing. One row a speaker a sitting. §Task 5 as built | engine.347 | built 2026-11-17, cron side, live at the next runs. Read: Wed 11-18 05:45 weekday wake (one `CIVIC` row a speaker); Sun 11-22 chain, Mara, Varek |
| 6 | Speed keys in World_Config, seeded at today's values, validated before the Cycle and never thrown inside Phase 9 (the `integrityWearRate` pattern): `dialLineScale` 1, `dialDirectShare` 0, `dialMoodFade` 0.8, `dialHardenShare` 0.4, `dialReflectionShare` 0.225. Band edges stay code (five copies; not a speed). `Dial_Moves`: this Cycle's movers, one row per citizen and dial (from, to, band, what moved it), the tab replaced each Cycle from a copy of DialState taken when the ledger opens, so chaos breaks, wear, reflections, lines and mints are all in the difference. `Dial_Pulse`: one row a Cycle, city totals per dial (up, down, bands crossed), kept. Both queued in Phase 9; both tabs ensured | engine.349 | LIVE 2026-11-17, PROD stage 51 @186; the keys seed and the tabs are created at the first live fire (C117) |
| 7 | Direction: unsigned lines get the sign of their fact and are written; fixed-positive kinds (Work, Career, Education, Lifestyle, Media) read their line; `[Money]` lines are signed at their writers (the judicial hold and ticket lines stay unmoved, pinned in `judicialLifecycle.test.js:671-673`); the pools are counted up against down per dial before and after. Carried from Task 4: the same on the reflection path — after the classifier cut, sociability, drive and openness by reflection still lean up (replay: 56 / 3, 76 / 13, 38 / 0) because the event tags that carry them (`Media`, `Career`, `Education`, `Community`) are fixed-positive | engine.350 | in progress 2026-11-17: the read; 148 down lines as a tab pool (`scripts/downLinesEclPool.js`, `--pool downLines`), tested, on no sheet. Next: bench tab count, then the coded pools, the five fixed kinds, `[Money]` |
| 8 | Harder hits both ways: a bet by its size against what the citizen holds; an UNDOCKED run by its result and rank | engine.350 | bets designed 2026-11-17 (§Bets as designed), not built. The UNDOCKED half waits on what the show scores (gap log C116 G-EC55: the board ranks points, the night is told in credits) |
| 9 | Speed set to the middle row (lines doubled, a quarter of each week sticks) by World_Config, after Task 7 is live and measured | engine.349 | not started |
| 10 | Re-measure the middle after 7–9; put "does 55 read differently from 50" back to him with the numbers | engine.349 | not started |
| 11 | Intake, both doors (`Intake` → `processIntake_`; `Advancement_Intake1` → `processAdvancementIntake_`): the fields the ledger and the first dial seed need are named; a row missing one is held on its tab with what is missing while the other rows go through (today a blank birth year, hood or role is filled by a draw or a default); an arrival's dials start from that data | engine.351 | not started |
| 12 | A lived state said again (builder 2026-11-17, should retiring hit the dials once or at every mention: "Once"). As built: on the reflection path a `Retirement` event gives nothing (`REFLECTION_ECHO`, `citizenDialMap.js` `nudgesForReflection_`); the retirement is the engine's own `[Retirement]` life line, folded once (family +4, drive −4, unchanged); the mood of a later mention still counts. Live C113–C116: 15 `Retirement` reflection rows on 8 citizens, POP-00001 five. Only `Retirement`: in the same window the other one-time events repeat on 3 citizens (`Promotion`, `Hospitalized`, `Career-Transition`, 2–3 rows each) and are as they were. Rows already applied are not undone | engine.347 | LIVE 2026-11-17, PROD stage 53 @188 |
| 13 | A sad mood (builder 2026-11-17: "Yes" — as put to him: composure down like the other bad moods, plus a small pull down on going out). As built: `'Sad': { composure: -3, outabout: -1 }` in `DIAL_MAP`; `AFFECT_VALENCE` `sad: 0` (sorrow that names someone does not cool the bond); the classifier offers `Sad` ("sorrow, grief, missing someone, heavy-hearted over a loss or a goodbye"), no fallback words added; the office slice's complaint set, the page scan's negative set and the signal detector's poles carry it. Gate GREEN on six sets: three grief texts read `Sad`, a worried, an angry and a frustrated text keep their mood | engine.347 | LIVE 2026-11-17: engine PROD stage 53 @188, then the classifier |

Order: 6 (bench pair on one Cycle: without and with the keys) → 2 (bench) → one deploy → 2(e) → 3–5 (cron scripts, no engine deploy) → 7–8 → 9 → 10; 11 on its own.

## Acceptance

1. Every citizen, office, seat and worker page write that carries the speaker's own words has a matching Reflection_Intake row the same day — a page / ledger count per writer over one live week. A reporter's grade page and a journalist's side of an exchange are not counted.
2. An official's, a worker's and a printed reporter's dials move at the next fire after their rows land.
3. Task 2: unit tests pin each fix (a hospital job title moves nothing; a cut draw moves a dial down; a 1-point push at 75 survives a settle and a third same-way Cycle hardens; a two-Cycle catch-up settles between). On the bench: 0 Engine_Errors, and the 13 fold their held lines with their marks set to 107.
4. Task 6: two bench fires of the same Cycle from the same live sync, PROD code then the candidate, give the same DialState cell for cell; each citizen's Dial_Moves rows equal that citizen's DialState difference across the fire.
5. Tasks 7–9, on the bench over 10 Cycles from a live sync: pushes per dial within 60 / 40 either way on every dial but fandom; about 1 citizen in 3 crosses a band; every dial has citizens in a low band (count reported per dial); nobody pinned at 0 or 100.
6. Task 11: an intake row with a missing field stays on the intake tab after a fire; a complete one mints with dials that are not all 50.
7. Task 4, first live week: every Reflection_Intake row carrying `Stumble`, `Spat`, `TrustGuarded` or `ConnectionWithdrawn` is read by hand against its text; doubtful reads counted (replay: 2 of 10 — a man reaching out to his wife read as drifting apart). Flat share by writer against the replay (reporters' strings 83 of 90, press answers 31 of 102, wakes / work / exchanges 4 of 92).

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
- 2026-11-17 (research-build) — Tasks 2 and 6 LIVE: PROD stage 51 @186; the 13 marks set to 107 on the live ledger. Read at C117: keys, tabs, the 13, the tail.
- 2026-11-17 (research-build) — Task 4 built (`b426c40c8`): four ordinary-bad events, the Flat affect, the speaker rule; agy's review folded (Flat recorded not blank, Disappointment dropped, gate tightened); gate GREEN on six sets, replay on 284 live rows. Bench @207: four planted rows, C117 PASS, each moved what its tags say and nothing by the snippet's words. LIVE: PROD stage 52 @187.
- 2026-11-17 (research-build) — Builder: "ok we will add what didnt get fixed and whats logged for me into the plan , on the \"filed headline\" it would maybe not be socialability though so that would need a better place to land if kept". Carried into Tasks 3, 5 and 7; Tasks 12 and 13 added as his calls; acceptance 7 (the first live week's bad-event rows read by hand).
- 2026-11-17 (research-build) — Builder: "keep it on drive small, build the reporter piece". Task 3 built: grade rows off the ledger, the filed row on drive small by a fixed tag, the printed-reporter row from the Saturday print set. On the C115 print set with the append captured: 9 printed filings, 8 reporters, 8 rows; a rerun 0.
- 2026-11-17 (research-build) — Builder on the printed row landing on drive, middle step: "drive is fine, keep it".
- 2026-11-17 (research-build) — Task 5 read: nine days of saved job statements counted off the pages and replayed through the live classifier, per line and per sitting. Where a job statement lands is put to the builder with these numbers before any row is written. Gap log G-EC52 (four workers' Monday statements missing from their pages).
- 2026-11-17 (research-build) — G-EC52 closed: the four missing worker statements were a deliberate page clean (`5fdc52e1d`), the save path is working.
- 2026-11-17 (research-build) — Builder on where a job statement lands: "Proceed on option 1" (only what shows). Task 5 designed; agy's adversarial review asked before any code.
- 2026-11-17 (research-build) — Task 5 built: agy's review folded (14 findings: 8 taken, 6 recorded or kept), each line read on its own, a later run its own sitting, the other readers leave the rows out. Real path with the append captured: 142 lines → 52 rows, 16 move a dial, nothing written. Live at the next runs.
- 2026-11-17 (research-build) — agy's re-review of the build folded (SHIP-WITH-FIXES, 6 findings: 5 taken, 1 recorded). Review closed.
- 2026-11-17 (research-build) — Builder on the two calls carried from Task 4: "1. Once 2. Yes". Tasks 12 and 13 built (`623bc326a`), benched @208 (C117 PASS, 4 of 4 planted rows moved what their tags say), LIVE PROD stage 53 @188; the classifier offers `Sad` after the deploy, gate GREEN.
- 2026-11-17 (research-build) — Task 3 read live at the 18:15 write wake: filed rows land by the fixed tag, no graded row, grade lines stay on the pages. Acceptance 7 so far: 1 bad-event row on the live tab (`Stumble | Frustrated`, a citizen who lost a 372 stake on the UNDOCKED book) — a right read.
- 2026-11-17 (research-build) — Builder: "Go" on engine.350. Tasks 7 and 8 read: pushes up against down per dial in the cells C113–C116, the live content tab's signed lines, every settled bet against net worth and a week of pay, UNDOCKED nights since C109. Calls put to the builder before any code: who writes the missing down lines, what a bet is sized against, what a bad run is.
- 2026-11-17 (research-build) — Builder's rulings on the three calls recorded verbatim. Open with him: whether a pilot's week is scored on credits or on points.
- 2026-11-17 (research-build) — Down lines, first cut: Grok drafted 422 over two rounds, 148 kept or written (`output/research-build/2026-11-17-e350-downlines-cut1.json`), none on a sheet. Bets designed: three sizes against a week of pay, the small hit unchanged, medium and large harder; the stake choice stays as built.
- 2026-11-17 (research-build) — Builder asked what the board ranks on: points, then credits. The night is told in credits and credits have sat at 0 since pilots were pointed at achievements (gap log G-EC55); Task 8's UNDOCKED half waits on his call. Down lines placed as a tab pool with a test against the loader and the sign rule; dry-run on the live tab 148 missing, nothing written.
- 2026-11-17 (research-build) — Bench, tab only: the 148 rows take integrity to 53% up and family to 53%, drive to 76, warmth 78, openness 70, outabout 71, sociability 88; four fires PASS, no new Engine_Errors. pipeline.113 and engine.352 filed on the builder's word (gap log G-EC55, G-EC56); the career engine's texture half logged (G-EC57), no row (builder: "It's just a color adding events engine").
- 2026-11-17 (research-build) — Career texture built: 146 lines read by what they say (91 up, 18 down, 37 plain), written at the everyday step or not written; tests green (15 files that load the career engine). Not benched. Media reader lines held for the builder's word against his 10-02 ruling.
