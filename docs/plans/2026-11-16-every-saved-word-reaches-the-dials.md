---
title: Every Saved Word Reaches the Dials Plan
created: 2026-11-16
updated: 2026-11-19
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
| 5, answered 2026-11-18 | "make the middle count, i think you can code this better than the model that built it did 12 months ago" — as put to him: the engines read only the band (40–60 is one person: same odds, same wake line "even-keeled, unremarkable"); either a citizen changes only on crossing 40 or 60, or the engines read the number itself so a 55 gets slightly more of what a 60 gets | Task 14. The readers are rebuilt, not patched: how they are coded is research-build's |
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

**Education, built (not benched) — 2026-11-18.** Two writers put `Education` on a life line; both now read the line.

- **Adults** (`phase05-citizens/runEducationEngine.js`, at most 10 draws a Cycle): `EDUCATION_SIGN_BY_TEXT_` + `educationTextureTag_`, the career shape. All 101 texts listed: 80 up, 4 down, 17 plain (drive 17 / 0, openness 22 / 0, outabout 29 / 1, sociability 9 / 0, composure 1 / 3, warmth 1 / 0, fandom 1 / 0). Written `Education-<Dial>-<Up|Down>-S`; a plain or unlisted draw is counted against the cap and in `S.engine299.noDialBySource` (`runEducationEngine:Education:plain` / `:unlisted`), and not written. Was a bare `Education` (drive +5, openness +3) or `Education-Cultural` (openness +5, drive +2) whatever the line said. The bare keys stay for the authored essence rows. No line in these pools says a bad day of learning; the four downs are an uneasy week and a day kept indoors.
- **Minors and students** (`phase05-citizens/runYouthEngine.js`, where most `Education` lines come from: 98 of the youth-pool lines in all cells): `Education` joins the youth engine's bare kinds, so each of the 16 school lines is written under its own sign (13 up, 3 down) or not at all. A line that names a Community_Program has no fixed text: each program template now carries its own sign — "was recognized at …" (composure up) and the sports and civic ones, which had not been written since engine.299 (gap log C116 G-EC58).
- **The reader that would have broken:** a young adult's field is weighed by counting `[Education]`, `[Team]`, `[Cultural]`, `[Civic]`, `[Community]` on their life lines, bare brackets only (`educationCareerEngine.js` `settleYouthCounts_`). It takes the graded form now; Team and Civic years had gone uncounted since engine.299 (G-EC58). No other reader matches the bare tag (`buildLivesSlice.js` matches the prefix; the education engine never fed the hood pulse).
- Tests: `scripts/educationTextureSign.test.js` (614: every pool text listed, every listed text in a pool, each tag folds one step, the writer end to end, the program templates, the field count in both forms); `scripts/educationLoop.test.js` 121 (no bare `[Education]` on a minor in 300 runs). Stub maps regenerated.

Reads put to the builder with the bench count (his to overrule):

| Lines | Read as |
|---|---|
| a library, bookstore, lecture, talk or workshop gone to (29 lines) | outabout up one step (as the career engine's lunch and errand lines) |
| "studied …", "took a night class after a shift", "learned a new skill on the job" | drive up |
| "read …", "explored …", "learned about <a subject>" | openness up |
| a class, workshop or program with other people in it | sociability up |
| "sought more information due to recent city events"; "reflected inward due to tense atmosphere"; "researched skills to stay competitive in uncertain times" | composure down |
| "stayed inside and browsed educational media" | outabout down |
| "engaged lightly with educational or informational content"; "paid closer attention to news and information this cycle"; "reviewed news to understand developing situations"; "read during the commute"; "learned about the neighborhood's build-out" and the other bare mentions (17) | plain, not written |
| school: "started the college list and crossed off half of it by dinner" | openness down |
| school: "pulled an all-nighter for the midterm and swore it was the last one" | composure down |
| school: "read the syllabus twice and the assigned reading once" | drive down |
| school: "got the long-division thing, finally, and explained it to the cat"; "got the letter about the honors section and read it twice in the hallway"; "was recognized at <program>" | composure up |

**The youth engine's other kinds, built (not benched) — 2026-11-18.** The 11-17 read did not rank these (it counted adult volume): arts lines rode `Cultural` (openness +4, outabout +3; 84 lines in all cells), clubs and neighbor-help lines rode `Community` (sociability +4, warmth +2; 82 — "rewrote a text three times before sending it" was one), coming-of-age lines rode `Graduation` (drive +8, openness +2; 15), hard-week lines rode `Stabilized` (composure +5): a child's ordinary line at four to eight times an adult's, whatever it said.

- Every youth kind is now bare in `runYouthEngine.js`: all 95 pool lines carry a sign (85 up, 10 down), written `<Kind>-<Dial>-<Up|Down>-S`; all 10 program templates carry their own.
- Coming-of-age and hard-week lines are kind `Personal` now, not `Graduation` / `Stabilized`: a texture line stamped `[Graduation]` stopped its holder from ever graduating (`checkGraduation_` graduates once, by that bracket) — gap log C116 G-EC59, 12 citizens hold one, two of them 22 and in the window. New lines no longer block; the 12 written lines are untouched and are the builder's call.
- Readers checked: the field count takes the graded `Cultural` / `Community` (above); the youth engine never fed the hood pulse; the log tag stays composite (`<tag>|youth-<type>`), so the milestone readers that match the log's tag exactly never saw these lines; `buildLivesSlice.js` reads `Personal` as colour, which a texture line is.
- Tests: `educationTextureSign.test.js` 837 (every drawn type on a bare kind, every pool line signed, nothing signed that no pool holds, 10 templates); `educationLoop.test.js` 121 (no bare-kind line and no `[Graduation]` / `[Stabilized]` texture on a minor in 300 runs).

Reads put to the builder with the bench count (his to overrule): "rewrote a text three times before sending it", "kept the good-luck rock in a pocket through the whole hard stretch", "sat for the senior portrait and did not recognize the adult in it", "played an open mic to eleven people and one of them clapped early" → composure down; "came home for the weekend and noticed the house felt smaller" → family down; "learned to drive in the empty lot on Sunday with a parent gripping the door" → family up; every neighbor-help line → warmth up; "stayed out until the exact minute of curfew, not one minute past", "drove alone for the first time and took the long way home on purpose" → outabout up.

**Live content tab written — 2026-11-18** (builder: "Go on tag cells and down rows"). `Event_Content_Ledger` on live, read back through the engine's own loader before and after (`output/research-build/2026-11-18-e350-live-tab-write.log`): rows 1,001 → 1,149, lines the loader takes 965 → 1,113, skipped 1 → 1 (the same row), pools 151 → 158.

- **The 148 down rows** (`undockedEclPoolApply.js --pool downLines --apply`, Weight 0.5 as benched): live now, drawn from the C117 fire on PROD stage 53 — no deploy needed, this is the tab-only bench of 11-17. Their Weight is the tuning number, on the sheet; first live count at C117 (`node scripts/dialPulse.js`, the engine.349 read).
- **The 94 occupation tags** (`occupationDialTags.js --apply`): 94 Tags cells, 7 rows left plain, 0 conflicts; a second run finds nothing to do. Inert until the Work change deploys; with them in place the deploy can go whenever its bench passes.

**Work, built (not benched) — 2026-11-18.** Standing word (above): job lines move dials. They still do — one step, on the dial the line names. 301 `[Work]` lines on the ledger after C116: 26 from the coded flavours, 275 from the tab and the reporters' pools, 121 of those the two `work.tech` rows (gap log C116 G-EC60).

- **The rule, both writers:** a Work line is written only graded, `Work-<Dial>-<Up|Down>-S`, from the entry's own `dial:` tag; with no sign it is not written and is counted (`S.engine299.noDialBySource`). `generateCitizensEvents.js` `GRADED_ONLY_KIND_` at the admission; `generateGameModeMicroEvents.js` at its admission. The bare `Work` key (drive +4) stays in the dial map for lines already written; no writer writes it.
- **The tab's 101 occupation rows:** `scripts/occupationDialTags.js` — each row's sign, read off its text: 81 up, 13 down, 7 plain (drive 23 / 2, integrity 20 / 0, warmth 14 / 0, composure 12 / 9, sociability 8 / 2, openness 3 / 0, outabout 1 / 0). The tool appends `dial:<dial>:<up|down>` to a row's Tags cell (one batch write, read back; a foreign `dial:` tag is a conflict and stops it; `--sheet <id>` for the bench). Dry-run on the live tab 2026-11-18: 94 to tag, 7 plain, 0 unlisted, 0 missing; nothing written. On PROD code a `dial:` tag on a Work row changes nothing (no draw weight reads it), so the tab can be tagged ahead of the deploy; the deploy without the tags would write no tab Work line — the live Tags write was done 2026-11-18 (above). `scripts/transitEclPool.js` takes its commute rows' signs from the same list.
- **Coded flavours** (12 occupations × 3): `OCC_FLAVOR_SIGN_`, 17 up, 10 down, 9 plain; the sign rides the entry, the draw is as it was.
- **Reporters' work lines** (game mode, 22): 16 up, 2 down, 4 plain.
- Tests: `scripts/occupationDialTags.test.js` (432: the list, the Tags write as a pure plan, the loader takes every tagged row, each row / flavour folds one step, no bare Work in either writer); `contentLedgerCompose.test.js` 69. 26 test files that load the two writers green. Stub maps regenerated.

Reads put to the builder with the bench count (his to overrule): craft done well → drive up; a thing checked twice or told straight → integrity up; staying with someone → warmth up; a steady hand → composure up; "refolded the sweater table for the fourth time before noon", "rewrote the grant narrative for the third funder this month" → drive down; "pulled copper wire through a Baylight sub-basement until their shoulders burned", "washed the blood out of the rig…", "scraped the flat-top clean at 2 AM…", "badged into the Baylight office early and tried not to think about the protestors…", five of the ten stalled-train lines → composure down; "felt entirely isolated from the city", "felt completely disconnected from the neighborhood outside" → sociability down; "a customer who didn't tell the whole story" → warmth down.

**Media, built (not benched) — 2026-11-18.** The call was research-build's (asked on 11-18, the builder's answer was that how the code works is not his to answer), made against his 10-02 word on these lines, "reads the tribune no": reading the paper is no longer worth a hiring. A Media line is written only under the dial it names, one step, or not written; the Tribune stays in citizens' weeks.

- **What they are.** 639 `[Media]` lines on the ledger after C116. 515 are four rows on the content tab, drawn by anyone (no Conditions): `tribune.newsroom` "read the Tribune's front page twice — once for the news, once to see who was in it" (148), "saved the Tribune clipping with their neighborhood in it — the good one" (146), "disagreed with a Tribune column out loud to an empty kitchen" (129), and `sports.citywide` "caught the recap of last night's game at the counter and stayed for the second retelling" (92, `auth:auto`). Each was sociability +4: counted in points through the dial map, C113–C116, Media is 1,516 of the city's 3,104 points of sociability up (the four reader rows alone 1,264) against 45 points down.
- **Readers' rows:** signed in `scripts/occupationDialTags.js` `MEDIA_SIGNS` — front page sociability up, clipping warmth up, the empty kitchen composure down, the recap sociability up. Dry-run on the live tab: 4 cells to tag, nothing written. They go on the sheet before the deploy (4 cells; inert on PROD code).
- **The generator:** `Media` joins `GRADED_ONLY_KIND_`. The coded news-climate lines (`mediaFeedbackEngine.js` `getMediaInfluencedEvent_`) take the sign of the pool they were drawn from (`MEDIA_POOL_SIGN_`: anxious and crisis composure down, hopeful composure up, holiday and Oakland pride warmth up, arts openness up, festival outabout up, sports fandom up, celebrity sociability up). These barely fire: 1 such line in all cells.
- **The newsroom's own days** (`generateMediaModeEvents.js`, 46 lines): each carries its sign as its first tag — 36 up, 5 down, 5 plain; never a bare Media ("felt the weight of covering too many stories with too few reporters" was sociability +4). This and the reporters' Work lines above are what walked a reporter's sociability and drive up week after week.
- **Left as they are:** the `[Media] Updated to Tier N …` lines (a real step in standing, 36 in all cells) and the reporter's filed / printed rows (`Media-Drive-Up-S` / `-M`, Task 3). The bare `Media` key stays in the dial map for them and for lines already written.
- Tests: `occupationDialTags.test.js` 545 (the four rows, the pool signs against the picker's own tags, 46 newsroom lines, no bare Media in either writer). 29 test files that load these writers green.

Reads put to the builder with the bench count (his to overrule): the four reader rows as above; newsroom — "spent twenty minutes on the phone with a source who wouldn't go on record", "felt the weight of covering too many stories with too few reporters", "stared at a blank page for twenty minutes before the column came", "spent the afternoon at City Hall waiting for a comment" → composure down; "argued with an editor about word count" → warmth down; a vote, a beat or a holiday covered in person → outabout up.

**Money, built (not benched) — 2026-11-18.** `phase05-citizens/generationalWealthEngine.js` writes each of the shapes that moved nothing under the dial it moves, sized by the fact (S 1, M 2, L 4):

| Line | Written as | On the ledger after C116 |
|---|---|---|
| "the last debt cleared — the ledger finally reads clean" | `Money-Composure-Up-M` | 69 |
| "an unplanned $… week — savings took the hit" | `Money-Composure-Down-S` | 37 |
| "defaulted on the debts — the savings are gone and the record carries it" | `Money-Composure-Down-L` | 13 |
| "borrowed against tomorrow to keep the household afloat" | `Money-Composure-Down-S` | 12 |
| "the debts crossed a line this week — sleep comes harder now" | `Money-Composure-Down-M` | 7 |
| "the bad week cost more than the savings could hold — borrowed to cover it" | `Money-Composure-Down-M` | 4 |
| "savings crossed six figures — years of steady weeks did that" | `Money-Drive-Up-M` | 1 |

Left as they were: the windfall (composure +3, family +2), the two mobility lines (a rise drive +4 / composure +4; a fall composure −6 / drive +2, the S361 reading), the judicial hold and the ticket (pinned unmoved). The engine's own two readers of its line — the one-money-line-a-Cycle guard and the story hook's text — take the graded bracket; nothing else reads `[Money]`. Tests: `scripts/moneyLineSign.test.js` (43), `scripts/debtLean.test.js` 85; 24 test files that load the wealth engine green.

**Lifestyle, read 2026-11-18 — no cut.** Its lines are already written one step by what they say (the generator's own `dial:` tags since engine.299): eight curiosity lines on openness, the new-shop and weekend-market lines on outabout; each reads as tagged. All up because nothing in the pool says the other side; the tab's `down.openness` rows ride this kind and their Weight is the balance, set from the bench.

Order from here: one bench for the lot (Career, Education, the youth kinds, Work, Media, `[Money]`, bets), 10 Cycles from a live sync, acceptance 5.

### Bets as designed (2026-11-17, research-build's under his "Agree")

| Piece | Design |
|---|---|
| Size | the amount won (payout less stake) or lost (stake) over one week of pay: small under 10%, medium 10–20%, large over 20%. Settled bets to date fall wins 21 / 30 / 6, losses 14 / 35 / 12 |
| Hit | small = what any bet gives today (win composure +2, drive +1; loss composure −3). Medium: win composure +3, drive +1; loss composure −4. Large: win composure +4, drive +2; loss composure −5, drive −1 (the size of the `Setback` line that cannot fire). Written as its own key at the writer; the word-match on the line's text goes |
| What makes them choose | stays as built: the week's posture (a climber stakes 12–30% of a week, anyone else 8–20%, a retreat half), wealth level's cap, a roll, and the low-composure tilt. It already spreads bets over the three sizes. Not rebuilt |
| Kind readers | every reader of the `Casino` kind and of the three loss sentences is listed on the wiring card before the cut |

### Bets as built (2026-11-18, not benched)

- **Size** — `casinoLedgerEngine.js` `casinoBetSize_`: the net winnings, or the stake lost, over one week of the bettor's pay at the settle; small under `dialBetMediumPct`, large over `dialBetLargePct`, medium between. Two new World_Config keys, seeded 10 and 20 by the pre-Cycle contract (`ENGINE176_CONFIG_SEEDS`) at the first fire that carries this code; a fire without them stops loudly (`pressureBar_`), it does not fall back. No pay to measure against reads large.
- **Hit** — the settled line carries its size as its tag, the sentence unchanged: `Casino-Win-S / -M / -L`, `Casino-Loss-S / -M / -L`, six exact `DIAL_MAP` keys at the designed values. Small is what every bet gave before. The voided slip and the two `[Setback]` lines are as they were; the word-match rules stay for bare `[Casino]` lines already written.
- **Readers taught the sized tag:** the owed-wake pin for a settled bet (`lib/wakePerception.js` `CASINO_PIN`) and the newsroom's street-source test (`scripts/newsroomSourcing.js` `streetKind_`). No other reader matches the bet line or its tag.
- The settle reports its count by size (`results.bySize`). Stake choice untouched.
- Tests: `casinoLedgerEngine.test.js` (the size rule at its edges, each tag's fold, the live settle writes `[Casino-Win-S]`), `sportsWeekRecord.test.js` 61, `wakePerception.test.js` 238; 25 test files that load the changed files green. Coupling map row added.

### The bench (2026-11-18, SANDBOX 1004 @209 = stage 54)

Stage 54 = stage 53 + the eleven engine.350 files at `0c85bcd03` (push `output/research-build/2026-11-18-push-e350-bench.sh`, manifest `stage54-e350.sha256`, pull-back byte-identical). One leg from a fresh live sync — live carries the 148 down rows and the 94 occupation tags — plus the four paper-reader tags on the bench tab only. Runner `output/research-build/2026-11-18-e350-bench.sh`, tool `…-e350-bench.js`, log `…-e350-bench-10fires.log`, counts `…-e350-bench10-{before,after,all}.json`.

**Ten fires, C117–C126: all PASS** (133–222 s), Engine_Errors rows 9 → 9; the two bet keys absent before the first fire and seeded 10 / 20 by it. 22,409 log lines on 1,085 citizens. No line of a cut kind was written bare: the only bare `Media` are the tier and fame lines left on purpose (30), and the bare `Cultural` (39), `Community` (77) and `Graduation` (14) come from writers this task did not touch (the adults' own cultural and community lines; real graduations).

| Dial | Live C113–C116 | Tab rows only, 11-17 | Stage 54, ten Cycles (lines up / down) | By points | From the tab | From coded pools |
|---|---|---|---|---|---|---|
| drive | 88% up | 76% | 1,178 / 635 — **65%** | 80% | 71 / 449 | 1,107 / 186 |
| sociability | 97% | 88% | 2,873 / 525 — **85%** | 87% | 1,368 / 521 | 1,505 / 4 |
| warmth | 94% | 78% | 1,628 / 414 — **80%** | 82% | 531 / 412 | 1,097 / 2 |
| openness | 81% | 70% | 2,121 / 1,028 — **67%** | 70% | 828 / 1,014 | 1,293 / 14 |
| composure | 56% | 54% | 2,564 / 2,614 — **50%** | 47% | 1,111 / 658 | 1,453 / 1,956 |
| integrity | 99% | 53% | 450 / 439 — **51%** | 54% | 229 / 435 | 221 / 4 |
| family | 73% | 53% | 732 / 695 — **51%** | 60% | 149 / 492 | 583 / 203 |
| outabout | 82% | 71% | 2,414 / 1,481 — **62%** | 63% | 1,169 / 465 | 1,245 / 1,016 |

Against acceptance 5 (60 / 40 on every dial but fandom): composure, integrity and family pass; outabout is at 62; drive 65 and openness 67 are short; **sociability (85) and warmth (80) fail**. Where the lean is left: the coded pools. From code alone sociability runs 1,505 up to 4 down, warmth 1,097 to 2, openness 1,293 to 14, drive 1,107 to 186 — the pools in `generateCitizensEvents.js`, the hood and household engines have almost no down line for those four dials. The tab now leans down on every dial but sociability and outabout. This is the plan's own note from the down-lines cut ("the code pools take down lines too and that part is an engine deploy") — the next step of Task 7, not a tuning of what was built.

Movement at today's speed (Task 9 not applied): 89% of citizens moved for good over the ten Cycles; 5% crossed a band on the permanent base, 16% on the felt value (acceptance asks about 1 in 3, after the speed change). Low bands: integrity 14 under 40 (0 before; wear), composure 3, family 1; no other dial has anyone under 40. Nobody at 0; four at sociability 100 (POP-00170, 00198, 00210, 00231), all four there before the first fire.

**Second leg, two fires (C117, C118 PASS; log `output/research-build/2026-11-18-e350-bench-2fires.log`, counts `…-e350-bench-{cells,cross}.json`)** — read off the citizens' own cells, 4,708 stamped lines, and the log by kind:

- **Bets:** two settled in the leg, written `[Casino-Win-L]` and `[Casino-Loss-L]`. Two is thin, so the size rule was also run over every settled bet on the live `Casino_Ledger` with the live incomes: wins 21 small / 30 medium / 6 large, losses 14 / 35 / 12 — the split the design was read from. A bet line reaches no log row; the count of record is the cell.
- **Money:** 24 of 31 money lines graded (debt cleared 13, an absorbed week 7, a bad week borrowed 2, defaults 2); the 7 bare ones are windfalls and mobility lines, left on purpose.
- **Work** 27 up / 33 down; **Media** 90 up / 36 down (5 bare tier lines); **Education** 32 / 6; **Career** texture 13 / 2; youth lines graded under `Community`, `Cultural`, `Personal`. No bare Work, Education or career-texture line on any cell.
- **Where sociability's up still comes from** (two Cycles, lines): tab Neighborhood 94, FirstFriday 92, coded Neighborhood 87, tab Civic Perception 83, tab Media 55, tab Daily 39, PrevEvening 22; down: the down pool 88, tab Work 13. **Warmth up:** coded Personal 79, Daily 43, tab Daily 41, tab Media 30, tab Civic Perception 23; down: the down pool 81 and nothing else. **Openness** has a real down side only on tab Civic Perception (120) and the down pool (90); **drive down** is the down pool (96) and Personal (19).

**LIVE 2026-11-18 03:48 CST: PROD stage 54 @189** (`output/research-build/2026-11-18-push-e350-prod.sh`, pull-back byte for byte; the four paper-reader tags written on the live tab first, 98 signed). Deployed on the standing go for a bench-proven push; the sociability and warmth shares are not at 60 / 40 and the work that gets them there is the next step, not a reason to hold what is proven. First live fire C117, Sun 2026-11-22. DEPLOY_HISTORY §PROD stage 54.

**The builder's two calls, built and LIVE 2026-11-18 15:37 CST, PROD stage 55 @190.** Put to him as findings G-EC59 and G-EC60; his answer to both: "Which ever it logical to how life works".

- **A first paycheck is not a commencement.** `generationalEventsEngine.js` `hasGraduated_`: the graduation check does not count the seven coming-of-age sentences the youth engine stamped `[Graduation]` until stage 54. The 12 citizens' lines are as written; the two aged 22 are eligible from the next fire, the others when they reach the window.
- **A line about an office goes to the people who work there.** The tab could aim by title, money or hood, not by workplace: a new Conditions field `employer` (EmployerBizId), any-of with `|`. The two `work.tech` rows on the live tab read `lifestate=working; employer=BIZ-00001|BIZ-00002|BIZ-00003|BIZ-00004` (the four Baylight District tech offices: 12 tracked citizens after C116, was 435 eligible; of the 143 times the lines had been drawn, 5 were by someone who works there).
- Bench @210, three fires PASS, Engine_Errors 9 → 9: the two lines drawn twice, both by employees of those offices, by nobody else; Work 34 up / 10 down. Tests `scripts/employerCondition.test.js` (26). DEPLOY_HISTORY §PROD stage 55.

### The coded pools' down side (2026-11-18, second session)

**The measure first** (gap log C116 G-EC61). Two reads before any line was written:

- The stage-54 bench counted pushes off `LifeHistory_Log`. The fold reads the citizen's own cell, and the two differ: the log carries the advancement intake lines ("Intake at Tier …": 190 in live C115–C116, drive +6 by word-match, on no cell; 412 in the ten-Cycle bench) and misses what only the cells hold (bonds, money, bets, the reflection events). Live C115–C116, log against cell: drive 499 / 43 against 326 / 41. The "drive 65%" above is a log number. From here the bench counts the cells after each fire.
- A dial moves for good only after three same-way Cycles with the swing still felt (`citizenMemory.js` `applyEvent_`; an opposite Cycle resets the streak). The stage-54 bench's own `Dial_Pulse` rows, C118–C126, citizens moved for good a Cycle: sociability 40–98 up against 0–1 down (85% of pushes up), warmth 17–34 against 0–1 (80%), openness 14–50 against 0–4 (67%), drive 9–39 against 0–2; composure and family, at 50–51% of pushes, about even. agy ran the fold itself: 85% up gives 445 permanent moves up for one down, 67% gives 11, 60% gives 4, 55% gives 2, 53% gives 1.5, 50% gives 1. **Acceptance 5 (pushes within 60 / 40) does not give his ruling ("down as often as up") in who changes.** The pools are built toward 50 / 50; the bench reports the pulse beside the pushes.

**Where the up side was** (live log C115–C116, lines a Cycle): the generator's eight domain-moment sources — 8 lines sociability up and none down, 10 warmth, 13 openness (about 10 draws a line a Cycle); First Friday's six lines, all `dial:sociability:up`; and on the tab a handful of citywide rows that each take a whole PoolKey's share: "painted over graffiti … alongside five neighbors" and "a flyer for a seniors lunch program flutters on a community bulletin board" 40 a Cycle each (the per-row cap), the Tribune rows 20–24, the two faith pools 13–20 a row. The drive lean is mostly elsewhere: advancement intake (log only), the promotion die (has its own down side), real moves and business gains.

**Built** (`8f4d6dd4d`, agy's review folded `176bd116f`):

- **Domain moments** (`generateCitizensEvents.js` `DOMAIN_MOMENTS`): 30 lines of the other side, written here in the pools' own voice and under the same canon guard (a relative, a neighbor, a stranger). By draw weight sociability 8 up / 7 down, warmth 10 / 10, openness 13 / 11, drive 2 / 4. A source keeps the draw mass it had (`DOMAIN_MOMENT_MASS_LINES_`: eight lines at 0.9), so the new lines split a share, they do not grow it. Side effect by the same arithmetic (agy §2): family's five up lines draw 27% less (stage-54 family 51% → about 46%), integrity 11% less.
- **First Friday**: each line carries its own sign — a gallery looked at is out-and-about, an artist found is openness, the crowd is sociability. Three lines added (one up, two down, both nights someone went); nine lines at the mass of six. A stay-in line was written and cut on review: the pool reaches every adult in every hood, its draw rides the out-and-about multiplier, and a First Friday line lifts the hood's pulse.
- **QoL** joins the graded-only kinds: it has no dial-map key, so a line whose words tripped a content rule was read by the word ("heard another neighbor was between jobs", "felt the neighborhood tension in small interactions": sociability +3, warmth +2 on "neighbor"; 13 lines in two bench Cycles). It is written by its cause and its bank.
- **The tab, nine placed rows** (`scripts/downLinesEclPool.js` `PLACED`, on no sheet until his go): one down row in the pool of each heavy up row — `community.program`, `tribune.newsroom` ×2, `sports.citywide`, `faith.attending`, `faith.volunteering` ×2, `civic.stabilization-fund`, `civic.health-center` — same source, same Conditions, Weight 1. And one row off: `culture.citywide` row 357, the flyer (it says nothing the citizen did).
- Tests: `scripts/codedPoolDownSide.test.js` 51; `downLinesEclPool.test.js` 387; `occupationDialTags.test.js` 551; 24 test files that load the generator green.

Reads put to the builder with the bench count (his to overrule): a birthday card left unsent, a relative's story not asked after, a kindness not returned → warmth down; a knock not answered, a gathering left by the side door, the long way round to miss the corner → sociability down; the usual ordered without looking, the new lamp put back in its box, a new idea argued with before it was heard → openness down; a half-built shelf moved to the closet → drive down; the art walk alone and silent → sociability down; the flyer on the bulletin board → not about the citizen, row off.

Not built here, recorded: the other engines that write First Friday or a social line as up whatever it says (G-EC63: neighborhood, relationship, household, post-career; the relationship engine reads "felt distant from people around them" as sociability +5); tab rows that name a congregation or a place and reach anyone (G-EC62).

#### Review reconciled (agy, 2026-11-18 — `output/antigravity/2026-11-18-review-e350-coded-pool-down-side.md`, verdict HOLD)

| Finding | Checked against | Disposition |
|---|---|---|
| The stay-in First Friday line asserts a home near the galleries; reaches all 22 hoods | `generateCitizensEvents.js` First Friday push, no hood gate | taken — line removed |
| First Friday draw is multiplied by out-and-about, so a homebody drew the stay-in line least | the `dwTag === 'source:firstFriday'` branch | taken — by the same removal |
| A down First Friday line still lifts the hood pulse | `neighborhoodPulseMap.js` `pulseKindForLine_` | kept — both remaining down lines are nights someone went; G-EC63 |
| Faith rows reach every adult; the health-center row has no hood; the recap row rides `source:media` past the player filter | loader DSL, `condScopes`, live rows 238, 211, 329 | recorded G-EC62 — the placed rows reach who the rows they answer reach |
| Family's up lines draw 27% less, integrity 11%; both stay inside 40–60 | re-run of the weights | recorded above; read at the bench |
| QoL: every pool path carries a sign; no reader loses the graded form | `qolPoolFor_`, `patrolPoolFor_`, the four readers | confirmed, nothing to do |
| Neighborhood, relationship, household and post-career engines still write First Friday up-only | each file read | recorded G-EC63 |
| "Splits the pool's share with the up row" is true only in a one-signed-row pool; unsigned rows eat draws; the cap is per row | `balanceContentLedgerPoolWeights_`, the 40-draw cap, live rows | taken — wording corrected; estimates re-done from the bench |
| Row 357 off leaves `culture.citywide` to one Lake Merritt row | live tab | recorded; put to the builder with the row |
| The log is not the cell; 60 / 40 by pushes is 4 : 1 in permanent moves | `citizenMemory.js`; the stage-54 pulse rows | taken — G-EC61, the bench counts cells and reports the pulse |
| Test blind spots: no `qolParts`, bands stubbed off, 4 of 10 First Friday lines checked, the written line's fold unchecked, placed-row validation loose | the three test files | taken — runs and assertions added |
| Narrow family regex; routing checked by source text | test file | label corrected; routing is proven by the writer run |

### The other engines (2026-11-18, second session) — builder on G-EC62 / G-EC63: "Yeah we fixing all this", "Fix it all"

Five more writers put a line on a citizen at a fixed size whatever it said — the class Task 7 cut for Work, Career, Education and Media. Built `b78af111d`, on top of the coded-pool candidate; each line is listed under the dial it moves and which way, read off the sentence, and written one step. A plain line (a look out of the window) is drawn, counted (`S.engine299.noDialBySource`) and not written, so every other line keeps the odds it had.

| Engine | Was | Lines listed | Now |
|---|---|---|---|
| `runRelationshipEngine.js` (at most 8 a Cycle) | bare `Relationship`: sociability +5, warmth +2 — on "felt distant from people around them"; same under the holiday / First Friday / Creation Day / weather suffixes; its culture and community lines a bare `Cultural` / `Community` | 51: 39 up, 7 down, 5 plain | `Relationship-<Dial>-<Up\|Down>-S` (and `Cultural-…`, `Community-…`); bond lines keep their kinds |
| `runHouseholdEngine.js` | bare `Household`: family +5 — on "heard an ambulance pass in the night", "felt slight tension among household members" | 163: 84 up, 14 down, 65 plain, over eight dials | `Household-<Dial>-…-S`; ailment, recovery and game-night lines untouched |
| `runAsUniversePipeline.js` (retired players) | bare `PostCareer`: family +4, openness +2, and its calendar and season suffixes | 124: 95 up, 1 down, 28 plain | `PostCareer-<Dial>-…-S`; the appearance / clinic / fundraiser / getaway / training kinds untouched |
| `generateGenericCitizenMicroEvent.js` | its culture and community lines kept a bare `Cultural` (+4 / +3) and `Community` (+4 / +2): 39 and 77 lines in the stage-54 bench | 6 | written by the signs already in its list |
| `runNeighborhoodEngine.js` First Friday (Uptown, KONO, Temescal) | 11 lines signed as a pool, all sociability up | 16 (5 written: the other side of living on the art walk) | each line its own sign; none is sociability up |
| `generateCitizensEvents.js` | `Continuity` had no dial-map key (read by word-match); its three coded follow-up lines had no sign and were drawn and dropped | 3 | graded-only; the three signed |

**What it does to movement at today's speed** (`scripts/engine32MultiCycle.test.js` B3b): a one-step swing fades in about four Cycles and a home line comes round every few weeks, so three same-way Cycles in a row do not happen — nobody's family moves for good from home lines alone. Before, three +5 lines inside the swing's ten-Cycle fade hardened it, upward only. One step a line needs the speed keys of Task 9 (a share of each week straight to the permanent dial), which is next.

Tests: `scripts/homeSocialLineSign.test.js` (38), `householdEngine.t4.test.js` 28, `engine32MultiCycle.test.js` 19; 59 test files that load these engines or the dial map green.

#### The other engines — review reconciled (agy, 2026-11-18 — `output/antigravity/2026-11-18-review-e350-other-engines-line-signs.md`, verdict HOLD)

| Finding | Checked against | Disposition |
|---|---|---|
| `buildWorldSummary.js` "Who Lived It" matches the bare `Relationship` / `Household` tags; every graded row would vanish from the summary | `WHO_LIVED_IT_TAGS`, `emitWhoLivedIt` | taken — keyed by the kind (`gradedParts_`); test added |
| The relationship engine takes weather and media lines into its pool; none is in the list, so each is drawn, dropped, burns the cap of 8 and marks the citizen active (20–40% of draws in a heat wave) | the three push blocks; `applyWeatherModel.js`, `mediaFeedbackEngine.js` pools | taken — the engine no longer takes them (they were written as a bare Relationship +5 or a bare Media); the weather and the news reach a citizen through the engines that own them |
| A plain draw counted against the relationship cap but not the household cap | `globalEvents++` | taken — the cap is on lines written in both |
| 26 signs disputed, most of them one table disagreeing with itself (a smell from a neighbor's kitchen warm, from a restaurant plain; a bench in one hood out-and-about, in another plain) | each line read again | 22 taken: the rule written into the tables — a line that only sees, hears or smells the block is plain, one that says what was felt or done is signed by that. Kept: the "felt the <mood> of the block" lines signed by the mood named; the neighborhood engine's First Friday lines on out-and-about (that engine's own dial for the hood being alive) |
| "continuing to adjust to post-career life" listed but unreachable | the fallback push the first cut dropped | taken — fallback restored |
| Down lines of `FirstFriday` / `Cultural` / `Community` kinds still lift the hood pulse | `pulseKindForLine_` | recorded (G-EC63); the generator's two First Friday down lines are nights someone went |
| At today's speed nothing but multi-step tags, reflections and the generator's weekly lines moves family, sociability or warmth for good; at the middle row the count of permanent moves follows the share of pushes (60% up → 1.5 : 1, was 4.3 : 1) | agy's run of `foldNewEntries_`; re-run here on a home line every fifth Cycle: 50 → 50.0 at today's speed, 53.9 up / 46.1 down at the middle row, and 55.3 for the old bare +5 | taken as the case for Task 9 next; `homeSocialLineSign.test.js` pins the three numbers |
| Still at a fixed size: the bond kinds, `Public`, `Reputation`, `Faith`, `PostCareer-Influence` / `-Wellness`, the Creation Day pool; the relationship cap runs in ledger order | each file | recorded G-EC65 — about 20 lines a Cycle together, most of them a real event (a recognition, a service) |
| Tests: the weather / media functions absent from the harness; section 3 reads source text; the multi-cycle family check runs on the legacy fold path and proves nothing | the three files | taken — outside lines present in the run, the cap and the fold on stamped Cycles asserted; the multi-cycle label says what that harness can prove. Section 3's source-text checks stay (the generator, generic and neighborhood writers are run end to end by their own test files) |

### The content tab read row by row (2026-11-18) — gap log C116 G-EC64

Two helper agents (Sonnet) read the live tab against the generator's rules: one every signed row for a wrong read, one every row that is drawn and thrown away. research-build cut both lists; nothing in a sentence is rewritten. Tool `scripts/contentTabReads.js` (dry-run against live 2026-11-18: 72 Active cells, 38 Tags cells, 0 conflicts; test 52).

| List | Rows | What |
|---|---|---|
| Switched off (`Active = no`) | 72 | scenes with nobody the citizen is in them: 32 that carried a sign and were written as a step on a dial (the flyer; "a DJ spins records at a crowded bar near Broadway"), 40 that carried none and cost the citizen the draw |
| Re-signed | 11 | hood rows whose dial is not in the sentence (a grocery errand under family → out-and-about; a neighbor helped with boxes under openness → warmth) |
| Signed | 27 | 15 money rows (`source:economy` routes to `Daily` and none had a sign: **no money-texture row of the tab has ever been written**), 2 night-market rows, the 10 retirement rows (were a bare PostCareer) |
| Placed (above) | 9 | the other side, in the pools where the up rows are |

Not taken from the agents' lists: the 7 work rows research-build read as plain on 11-18; hood-trend and hood-mood rows (they say how the place is going); the teen rows; rows that give the citizen a relative the Conditions cell does not guarantee (recorded in G-EC64). With it the generator: a retiree's line is graded-only (`PostCareer` in `GRADED_ONLY_KIND_`), its five coded lines signed and two of the other side written.

### The two benches of 2026-11-18 evening (SANDBOX 1004, each ten fires C117–C126 from a fresh live sync, all PASS, Engine_Errors 9 → 9)

Pushes are counted off the citizens' own cells after each fire (`output/research-build/2026-11-18-e350{c,d}-cells.json`, tool `…-e350c-bench.js` / `…-e350d-bench.js`); the log count is printed beside it in the logs.

| Dial, share of pushes up | Stage 54 (log) | Leg c: stage 56 @211, the nine placed rows, the flyer off; today's speed | Leg d: stage 57 @212, + the tab read row by row, + the middle speed row |
|---|---|---|---|
| sociability | 85% | 56% (1,918 / 1,478) | 53% (1,935 / 1,736) |
| warmth | 80% | 52% (1,448 / 1,346) | 51% (1,517 / 1,480) |
| openness | 67% | 47% (1,585 / 1,776) | 46% (1,705 / 1,985) |
| drive | 65% | 55% (890 / 732) | 52% (951 / 877) |
| composure | 50% | 52% | 51% |
| integrity | 51% | 44% | 44% |
| family | 51% | 51% | 48% |
| out-and-about | 62% | 63% | 62% |
| life lines on the cells | — | 23,164 | 26,061 (the money rows are written; fewer draws thrown away) |

Acceptance 5 by pushes: seven of eight inside 60 / 40 on both legs; out-and-about 62–63 (its up side is the hood lines of a growing city; not cut here).

**Who moved for good** (`Dial_Pulse`, citizens a Cycle, up / down):

| Dial | Stage 54, C118–C126 | Leg c, last five Cycles (today's speed) | Leg d, C117–C126 (middle row: `dialLineScale` 2, `dialDirectShare` 0.25) |
|---|---|---|---|
| sociability | 40–98 / 0–1 | 13–22 / 2–8 | 124–186 / 99–157 |
| warmth | 17–34 / 0–1 | 9–17 / 2–5 | 96–171 / 88–149 |
| openness | 14–50 / 0–4 | 9–15 / 4–13 | 97–167 / 116–179 |
| drive | 9–39 / 0–2 | 12–25 / 0–2 | 68–119 / 65–106 |
| composure | 16–34 / 14–25 | 18–25 / 14–30 | 175–242 / 166–236 |
| integrity (wear is in the down count) | 20–43 / 27–56 | 21–43 / 32–54 | 48–75 / 82–113 |
| family | 3–12 / 4–9 | 3–9 / 2–10 | 43–92 / 63–84 |
| citizens moved, of about 1,080 | 233–354 | 223–249 | 814–1,020 |

At today's speed the balanced lines brought the down side into being but few move at all, and drive still hardens only upward (its up lines are bigger: promotions, moves). At the middle row nearly everyone moves a little each Cycle and the down count sits beside the up count on every dial — the share of pushes carries straight through, as agy's run of the fold said it would. Over the ten Cycles of leg d: every citizen's permanent dials moved; 13% crossed a band on a permanent dial (leg c: 5%), 26% on the felt value (16%; acceptance asks about one in three); nobody at 0 or 100 (the four who sat at sociability 100 came off it); under 40: composure 8, integrity 17, family 1; means within 0.3 of where they started.

**LIVE 2026-11-18:** PROD stage 56 @191 (20:40 CST, the coded pools' down side), then stage 57 @192 (21:58 CST, the other engines) — DEPLOY_HISTORY §PROD. Live sheet writes are refused by this session's permission check, so the builder ran them himself. **The content tab is written (builder, 2026-11-18 night):** the nine placed rows appended and verified; `scripts/contentTabReads.js --apply` wrote 72 Active cells and 38 Tags cells, all 110 rows read back as listed. Read back here through the engine's own loader: 1,158 rows, 1,050 lines taken (1,113 + 9 − 72), 1 skipped (the same row as before), 145 pools; money rows signed 15 of 16, retirement rows 10 of 10. **The speed keys are set (builder, 2026-11-18 night):** `dialLineScale` 2, `dialDirectShare` 0.25 on live `World_Config`, written and verified by `output/research-build/2026-11-18-e349-live-speed.js --apply` (`--apply --back` returns today's speed). Read back here against the engine's own code: the pre-Cycle contract (`inspectEngine94Config_` with `ENGINE349_CONFIG_SEEDS`) finds the two rows and would seed only the other three (`dialMoodFade` 0.8, `dialHardenShare` 0.4, `dialReflectionShare` 0.225); `readDialTuning_` reads lineScale 2, directShare 0.25. First live fire at this speed: C117, Sun 2026-11-22.

The three writes, in order, each dry-run by default and read back: `node scripts/undockedEclPoolApply.js --pool downLines --apply` (the nine placed rows); `node scripts/contentTabReads.js --apply` (72 rows off incl. the flyer, 38 Tags cells); the speed keys — two rows `dialLineScale` = 2 and `dialDirectShare` = 0.25 on live `World_Config` (absent until the first fire seeds them at 1 and 0; the seeding adds only what is missing).

## Task 14 as built — the middle counts (2026-11-18 / 19)

Ruling 5 (builder 2026-11-18): "make the middle count". Read first (wiring card for `getCitizenDialBands_` / `bandIndex_`, every pointer opened): 23 call sites of the seam in phase 4 and 5, each reading a band — `mult` (0.5 / 0.75 / 1 / 1.25 / 1.5 by band), `bands` (−2..+2), `crimeReachable`; plus the bond face fallback, the casino's `drive >= 60`, the content tab's dial terms and the wake prompt's `disposition()`. At 45 / 50 / 55 every one of them returned the same thing.

**One rule** (`utilities/citizenMemory.js`). An old per-band table is the value at each band's middle (10 / 30 / 50 / 70 / 90); the reader draws a straight line between them, flat past 10 and 90 (`dialLadder_`). `dialPos_` is the number on the old signed scale, unrounded. An old yes / no door is a share 0..1 (`dialHigh_(v, k)`, `dialLow_(v, k)`): 0 at the middle of the band below, 0.5 at the old edge, 1 at the middle of the band. Nothing changes for a citizen sitting on a band's middle; a citizen just past an old edge gets less than the band gave (61: ×1.25 → ×1.14; 80: ×1.5 → ×1.375). `getCitizenDialBands_` returns `current`, `pos`, `mult`, `crimeReach`; `bands` and `crimeReachable` are gone. `bandIndex_` stays as a measure (Dial_Moves, Dial_Pulse) and a label (the archetype name, the face words).

| Reader | 45 | 50 | 55 | before, all of 40–60 |
|---|---|---|---|---|
| Event odds — participation, pool weights, the micro, education, relationship, neighborhood, youth, household, career, birth (`mult`) | ×0.94 | ×1.00 | ×1.06 | ×1.00 (59: 1.00, 61: 1.25 → 1.11, 1.14) |
| An ordinary temptation given in to (`CONDUCT_SLIP_P_`) | 0.275 | 0.25 | 0.225 | 0.25 |
| A contest term — job slot, heritage stake, rival suitor (`pos`) | −0.25 | 0 | +0.25 | 0 (odds against a 50: 48 / 50 / 52%) |
| A bond's pair factor, two alike (`bondDialPos_`) | ×0.97 | ×1.00 | ×1.03 | ×1.00 |
| A scandal on an officeholder (`holderIntegrityPos_`; live keys ×1.5 low, ×0.5 high) | ×1.06 | ×1 | ×0.94 | ×1 |
| The owner's closure room (`dialOwnerStreakRoom` 1 on live; a seeded draw for a part of a cycle) | −1 cycle a quarter of the time | 0 | +1 a quarter of the time | 0 |
| Stress invites temptation (composure) | ×1.06 | ×1 | ×1 | ×1 |
| The archetype's pool weights (`archetypeWeightsFromDials_`; drive shown, work lines) | ×1 | ×1 | ×1.075 | ×1 (60: ×1.3 → ×1.15) |
| A content row `warmth>=60` (share of its Weight) | 0 | 0 | 0.25 | 0 |
| A content row `warmth<=39` | 0.2 | 0 | 0 | 0 |
| The wake prompt's temperament line (4 or more off 50) | "slightly guarded" | — | "somewhat warm" | "even-keeled, unremarkable" |

The far-end doors read nothing different at 45 / 50 / 55 and now open by a share instead of at 20 or 80: the crime door (`crimeReach`: 0 at integrity 30, 0.5 at 20, 1 at 10; or integrity under 50 with composure at the bottom), the casino (the odds of sitting down thin from integrity 70 to 90; a placed bet is on tilt from composure 30 to 10; the drive factor ×1.0 at 50 to ×1.4 at 70 where no posture stands in for it), the burnout health multiplier (composure 30 to 10), the overwork Strain (odds = drive 70..90 × composure 50..70), the misfit move (the income ratio eases from openness 70 to 90; the odds thin from 30 to 10), a driven owner's expansion (drive 70 to 90).

**The conduct roll** (`runConductEngine.js`): one roll cut in four, draw count unchanged — commit below `reach × L` (`L` 0.55 at integrity 30, 0.75 at 10; ×0.6 under a crime spike), `Resisted` (+5) below `reach`, `BoundaryCompromised` (−1) below `reach + (1 − reach) × slipP`, `BoundaryKept` (+1) above. Expected integrity move per test, calm: +0.30 at 30, −0.15 at 25, −0.96 at 20, −2.13 at 15, −3.70 at 10 (old: +0.30 down to 20, −3.70 under it).

**The content tab** (`loadEventContentLedger.js` `soft`, `generateCitizensEvents.js` `contentDialShare_`, `drawMass_`, `balanceContentLedgerPoolWeights_`): a dial term with `<` `<=` `>` `>=` is a share of the row's Weight, 0 ten points short of the number, whole ten points past. The share rides on the pool entry and is read at the draw; a PoolKey's bucket is scaled by its most-open row's share and split by what each row is offered at. On the live tab that is 13 rows, all show lines (`warmth>=60` ×5, `warmth<=39` ×5, `drive>=60` ×3). From the snapshot (agy §5a): the `warmth>=60` rows are offered to 755 citizens instead of 102 at 1.73× the summed weight (the city sits a little over 50 on warmth); `drive>=60` 871 instead of 300 at 1.24×; `warmth<=39` to 5 instead of 0.

**The temperament line** (`lib/citizenDials.js` `LEANS`, `leanings`, `phraseFor`): inside 40–60 a dial 4 or more off 50 reads as a lean, an adjective phrase with a degree word ("somewhat ambitious", "slightly on edge", "fairly principled"), at most three, the furthest from 50 first, after the pole phrases. `lib/wakePerception.js` `dialTrajectory` and the card's `Essence:` line (`scripts/buildCitizenCards.js`) use the same words. Snapshot of 2026-11-18: 562 of 1,075 read "even-keeled, unremarkable"; 349 of them carry a lean now. The voice-disposition cache and the citizen cards pick the words up on their own next runs.

**Fixed bars kept, on the builder's word (2026-11-18):** a fan at fandom 60 — "agree and as the fandom raises it should have effect as well" (it does: the sports-line weight reads the number, ×0.5 to ×1.5); a citizen climbs at ambition 60 (`maneuverClimbBar`, a World_Config key) — "climbing at 60 sounds good"; standing for office needs drive 60, integrity 40, composure 40 — "office this look fine as well" (the score's drive term reads the number). Labels read as labels by the newsroom: `applyStorySeeds.js`, `storyHook.js`, `rosterLookup.js`.

### Review reconciled (agy; one review, one re-review — closed)

`output/antigravity/2026-11-18-review-e349-the-middle-counts.md` (HOLD) on `e39a38052`, folded in `a701ded16`; `output/antigravity/2026-11-19-rereview-e349-the-middle-counts.md` (SHIP-WITH-FIXES), folded in `a8f4ebe23`.

| Finding | Checked against the code | Done |
|---|---|---|
| §2a the conduct resolve gave every non-commit a `Resisted` (+5) from `reach` 0.5 up — a bounce at integrity 20, and +5 for a burnt-out citizen at integrity 40 | true | the four-way cut above |
| §1a.3 the archetype label still switched pool weights on at 60 | true (`getArchetypeWeights_`, live) | `archetypeWeightsFromDials_`; re-review §2: the first fold flipped the table when a second dial passed the leader — the six tables are blended by the square of their shares |
| §5b the PoolKey balancing handed a part-offered PoolKey its whole bucket back | true with two or more PoolKeys | the share is read at the draw; re-review §3: balancing on full weights let a part-offered row crowd its plain neighbours — the bucket is scaled by how far the PoolKey is open and split by what is offered |
| §3 the casino tilt draw was spent on rows that cannot bet | true | decided for a citizen placing a bet, where the stake is drawn (re-review §4: after the market pick) |
| §2b `dialLadder_(null)` read as the bottom | true | null, '', false, undefined throw |
| §6 leans that broke "Lately you've been …" and "carrying a … mood"; three as strong as a pole | true | adjective phrases; re-review §5: "a only loosely …" — "loosely interested in the teams" |
| §1a.1 the office score adds a band step for drive; the bars to stand | true | the score term reads the number; the bars are the builder's (kept) |
| §1a.2 the maneuver posture climbs at ambition 60 and stands in for the casino's drive ladder on live | true | the builder's bar (kept) |
| §1a.4 newsroom readers of `Archetype:` | true, label readers | left |
| §7 tests proving less than their label | true | restated: conduct cuts computed from the rule, `crimeReach` printed as a number, tempted-cohort and magnitude asserts, the owner room and the casino doors through the real functions, the balancing pinned on bare entries |
| re-review §1: under a crime spike the expected move at integrity 20–25 (+0.49) is above 30's (+0.30); composure under 30 with integrity 40–49 can draw a `Resisted` | true | left: the first is the spike's ×0.6 as built; the second has 0 of 1,075 citizens (lowest composure 33.9) |

### The benches (SANDBOX 1004, ten fires C117–C126 each from a fresh live sync, the middle speed row)

Leg m is the first cut (`e39a38052`, @213); leg n is the candidate that shipped (`a8f4ebe23`, @214). Leg d is stage 57 from §The two benches, the same sync recipe and speed.

| Dial, share of pushes up off the cells | Leg d (stage 57) | Leg m (first cut) | Leg n (the candidate) |
|---|---|---|---|
| sociability | 53% (1,935 / 1,736) | 54% (1,969 / 1,694) | 54% (1,968 / 1,702) |
| warmth | 51% | 50% (1,506 / 1,513) | 51% (1,517 / 1,455) |
| openness | 46% | 47% (1,648 / 1,884) | 46% (1,619 / 1,909) |
| drive | 52% (951 / 877) | 55% (1,004 / 832) | 54% (982 / 833) |
| composure | 51% | 51% | 50% |
| integrity | 44% | 45% | 45% |
| family | 48% | 47% | 45% |
| out-and-about | 62% | 62% | 61% |
| life lines on the cells | 26,061 | 25,845 | 25,655 |
| crossed a band, permanent / felt | 13% / 26% | 11% / 24% | 13% / 25% |
| under 40 on base: composure / integrity / family | 8 / 17 / 1 | 7 / 13 / 1 | 4 / 13 / 1 |
| citizens moved a Cycle (`Dial_Pulse`) | 814–1,020 | 865–1,031 | 826–1,013 |
| Engine_Errors | 9 → 9 | 9 → 9 | 9 → 9 |

All thirty fires PASS (leg m 162–238 s, leg n 185–259 s). Down sits beside up on every dial on all three legs, seven of eight inside 60 / 40 by pushes and out-and-about at 61–62 as before; nobody at 0, one citizen at sociability 100 at the end of legs m and n (leg d: none), nobody under 20 on a base dial, so the crime door, the casino refusal and the tilt did nothing in ten Cycles. Drive reads 54–55% up against leg d's 52: the participation and work-line weights now rise inside the middle, where most of the city sits a little over 50. Live state: legs d and m synced the same live sheet for bonds (Relationship_Bond_Ledger 7,233 rows); before leg n's sync engine-sheet moved 3,211 rows of bond history to `Relationship_Bond_Archive` (4,022 left), so leg n is the candidate's proof and leg m is the like-for-like comparison with leg d. Logs `output/research-build/2026-11-18-e349m-bench.log`, `2026-11-19-e349n-bench.log`; cells `2026-11-18-e350m-cells.json`, `2026-11-18-e350n-cells.json`.

**LIVE 2026-11-19 02:01 CST:** PROD stage 58 @193 = stage 57 + thirteen files at `a8f4ebe23`, pull-back byte for byte — DEPLOY_HISTORY §PROD. No sheet write goes with it. First live fire: C117, Sun 2026-11-22; the read is `node scripts/dialPulse.js` against leg n.

## Task 15 read — the cut list (2026-11-21, research-build)

Read against the code on live stage 62; counts from the ledger snapshot of 2026-11-18 (C115–C116 lines, before stage 57/58) and the leg n cells. Four piles, each shipped its own way.

### Pile 1 — the engine candidate (one bench)

**1a. Bond and arc lines, two writers.** `runRelationshipEngine.js` (`rivalryRels`, `allianceRels`, `mentorshipRels`, `arcRels`) and `generateCitizensEvents.js` (`allianceTexts` / `rivalryTexts` / `mentorshipTexts` / `arcTexts`, the named-counterpart lines at 3303–3337, the two `arc:named` lines at 3390–3391) write a bare `Rivalry` (sociability +2, composure −3), `Alliance` (sociability +4), `Mentorship` (warmth +6, drive +2 — larger than a wedding's warmth) or `Arc` (drive +4, openness +2) whatever the line says ("avoided someone they've had friction with" → sociability +2). Live C115–C116: Rivalry 2, Alliance 1 on the snapshot; the bond kinds are rare, the size is the defect. Cut: the kind stays (the bond engine, `compressLifeHistory`, the archetype weights at 3668–3669 and the memory window key on it — read through `gradedParts_`), each line written `<Kind>-<Dial>-<Up|Down>-S` by what it says, a plain line drawn, counted and not written (the engine.350 rule):

| Line (both writers' wordings) | Sign |
|---|---|
| a flicker of tension / subtle friction / unspoken rivalry / stirred old tensions / the weight of ongoing competition / kept it civil — barely / felt the old edge return | composure down |
| avoided someone they've had friction with | sociability down |
| caught themselves measuring the week against X's | drive up |
| received support / a supportive message from a trusted connection; exchanged knowing looks with an ally; appreciated the loyalty of a close contact; got a heads-up text from X; caught X's eye across the room | warmth up |
| coordinated briefly with an ally (on shared interests); collaborated quietly with a close associate; compared notes with X over coffee | sociability up |
| felt reassured by a solid friendship / a recent alliance | composure up |
| exchanged insights with a professional ally | openness up |
| reflected on guidance (received) from a mentor / someone experienced; felt (the) responsibility of being looked up to / toward someone looking up to them | drive up |
| offered advice / considered advice to share with someone newer; caught up with X — the kind of conversation that lingers | warmth up |
| appreciated a learning moment from a mentor figure / an experienced contact; jotted down something X said | openness up |
| talked something through with X and left clearer | composure up |
| the social weight / the mounting pressure of unfolding events | composure down |
| felt drawn into conversations about the ongoing situation | sociability up |
| sensed their role in a larger story taking shape | drive up |
| sensed relationships shifting; noticed how current events affected their circle / seemed interconnected; felt pulled deeper into an evolving situation; the two `arc:named` lines ("kept circling back to it", "weighed where they stand") | plain |

**1b. Fame.** The generator's four `source:fame` lines (3204–3213) and tab row 276 route to `Reputation` (integrity +3, sociability +2): being recognised raised integrity. 21 lines on the snapshot; 38 integrity pushes up in leg n. Cut by the source tag, not the kind: `source:fame` lines are graded-only; recognised by a stranger / fielded questions at the corner store / greeted by name → sociability up; overheard their own name → plain. **The pilot's own UNDOCKED run (`source:undocked` + `ecl:kind:pilot` → bare `Reputation`) is untouched — pipeline.113 / Task 8.** Row 276 ("got recognized at the corner store … and pretended to mind") needs a Tags cell `dial:sociability:up` or it stops being written — pile 3's write.

**1c. Faith.** `faithPool_` (2064–2088), five lines about the citizen's own hood congregation, each a bare `Faith` (warmth +3, composure +2). Joined the observance / stopped by a community program / pitched in with the response effort / was welcomed by an outreach table → warmth up; caught a notable service → composure up. All five carry a sign, so the faith-exposure push (3968, after admission) keeps its count. The three `source:faith` tab rows are already `Active = no`.

**1d. Public.** `generateGameModeMicroEvents.js` (`mlbPublic` 8, `mediaPublic` 4, `civicPublic` 5) and `generateCivicModeEvents.js` (210, 235, 319) write a bare `Public` (sociability +4) on work duties ("fulfilled a sponsor obligation", "prepared public safety statements for the press"). 3 lines on the snapshot. Both writers already carry `dial:` tags on their other pools; Public lines get the same: autographs / photos with young fans / community appearance / charity function / spoke with community members / attended a neighborhood event / fielded questions from local media / networked with industry contacts → sociability up; maintained public-facing composure during a press briefing → composure up; a media availability / a radio interview / a press conference / represented the paper / the city at a function / a team marketing event / a sponsor obligation / a brief public appearance / public safety statements / a civic observance → plain (a duty of the job; the job moves nothing — builder 2026-11-17 on statements).

**1e. Retired players.** `runAsUniversePipeline.js` `influencePool` + `businessPool` → bare `PostCareer-Influence` (sociability +3), `wellnessPool` → `PostCareer-Wellness` (composure +3). Cut: handled a small wave of public recognition with ease → composure up; took a call about a future partnership / met quietly with contacts about post-career opportunities → drive up; a low-key sponsor appearance → sociability up; recorded a short message / considered an opportunity without committing / personal business tasks with an advisor → plain. Wellness: all three composure up, written one step. The kinds stay (`PostCareer-Influence-Composure-Up-S`).

**1f. Creation Day.** `runNeighborhoodEngine.js` `creationDayEvents` signed as one pool (`warmth:up`). Sensed deep community roots / felt connected to the neighborhood's origins → warmth up; felt something foundational in the air / noticed neighbors reflecting → plain (the relationship engine's own "sensed something foundational in the air" is plain).

**1g. The relationship cap.** `runRelationshipEngine.js:379–381` walks the ledger from row 0 and stops at `LIMIT` (8) lines written, so the top of the ledger draws them. Cut: start at a row drawn once from `ctx.rng` and wrap — deterministic per seed, one extra draw before the loop.

**1h. A down line lifts the hood.** `neighborhoodPulseMap.js` `pulseKindForLine_` flips only `Neighborhood`. Cut: any line whose written tag grades `-Down-` and whose kind lifts the hood (`Community`, `FirstFriday`, `Cultural`, `Relationship`, `Faith`) pulses `Neighborhood-Down`. The generator's two First Friday down lines are nights someone went; they then lower the pulse one step instead of lifting it (agy 11-18 left the lift; this reverses it — the line says the night went badly for them).

**1i. The face's TopTags.** `compressLifeHistory.js:1950–1955` tallies each graded tag as its own tag, so `Neighborhood-Outabout-Up-S` and `Neighborhood-Composure-Down-S` split the Neighborhood count. Cut: tally `gradedParts_(tag).kind`. Its draw reader (`generateCitizensEvents.js:3716–3727`) compares TopTags against entry machine tags (`source:…`, lowercase) and matches almost nothing either way; the bench reads it.

Not in the cut: `tier1EssenceEvents.js` (authored one-time seed lines for the Tier-1 players, `seedTier1EssenceLive.js`); the reflection classifier's tags; `jobStatementRows.js`.

### Pile 2 — the dashboard

`dashboard/server.js:2151` parses `[(\w+)]` and reads every graded tag as `General`. Cut: `[^\]]+` and the kind by `gradedParts_`. Not engine substrate: its own commit, no bench.

### Pile 3 — the tab (dry-run here, the live write by the builder's hand)

Row 276's Tags cell (1b); the G-EC62 rows (faith rows with `band!=child` reaching every adult under `source:familyLife`; `civic.health-center` row 211 with no hood; `culture.citywide` row 290 with no season; unsigned rows 875, 985, 987, 988 in signed pools); the relative rows of G-EC64 (266–269, 87, 95, 144). The ledger carries no congregation field and the loader has no faith scope, so the moves are existing Conditions terms (hood) or `Active = no` — no new field. One dry-run list, then put to him.

### Pile 4 — out-and-about 61–62% up, integrity 44–45%

Leg n cells over ten Cycles: out-and-about up 2,630 (`Neighborhood` 1,681, `PrevEvening` 409, `Civic Perception` 171), down 1,673 (`Background` 552, `Neighborhood` 545, `Friction` 284). The lean is the hood lines. Integrity up 437 (`Daily` 192, `Personal` 140, `Reputation` 38), down 525 (`Personal` 520). 1b takes 38 ups off integrity. Measured again on pile 1's bench before any cut; the source of the 520 `Personal` downs is read first.

### Weakest points, attacked

- **Graded-only drops unsigned lines silently.** A bond line missed from the list stops being written. Guard: a test walks every line of every pool named above through the writer and asserts each is listed (signed or plain); unlisted throws in the test, counted `unlisted` in the engine.
- **Readers of the bare kinds.** `Rivalry` / `Alliance` / `Mentorship` / `Arc` / `Faith` / `Public` / `PostCareer-Influence` / `-Wellness` / `CreationDay` are grepped across all five dirs before the build; any reader matching the bare tag moves to `gradedParts_` in the same candidate (the 11-18 `WHO_LIVED_IT_TAGS` case).
- **1h changes hood pulses the newsroom reads.** Bench reads the hood pulse beside leg n.

## Task 11 read (2026-11-21, research-build — engine.351)

Code read: `processIntake_` (`godWorldEngine2.js:1523`), `processAdvancementRowsBody_` (`processAdvancementIntake.js:709`), `checkForPromotions.js:380-495`, the first-fold seed (`compressLifeHistory.js:640-700`), `challengerDialStateJson_` (`updateCivicApprovalRatings.js:1506`). Live tabs read 2026-11-21.

### What a blank becomes today

| Door | Blank cell | Becomes |
|---|---|---|
| Intake (story rows) | Age | a draw, 22–65 (household door: child 1–17, adult 22–65) |
| Intake | Neighborhood | a draw from the core-sim hoods |
| Intake | Category | one of blue-collar / white-collar / service, a draw |
| Intake | RoleType | a draw from the category's catalog pool |
| Intake | unknown name, not a household | not minted: a Generic_Citizens row (EmergenceCount 1), earns the ledger at 3 |
| Advancement_Intake1 (mint) | BirthYear | 2003, fixed (age 39 in 2042) |
| Advancement_Intake1 | Neighborhood | a frequency-weighted draw (`deriveCitizenProfile_`) |
| Advancement_Intake1 | RoleType | derived from hood and age; demographic-voice fallback |
| Advancement_Intake1 | Gender | derived from the name and hood |
| Advancement_Intake1 | Tier | 3 |
| Advancement_Intake1 | ClockMode | ENGINE |
| Advancement_Intake1 | EmployerBizId | the field-matched pick |
| both | Education, YearsInCareer, Debt, NetWorth, CareerStage, Income | always derived (no intake cell) |
| first fold | DialState | 50 on eight dials; fandom from the household, 65 for a franchise player or staffer. The mint sentence then folds by word-match ("Promoted to Tier N…" drive +7 / composure +2; "Arrived in … migration wave" sociability +4) |

### Where arrivals come from (every `nextPopIdLocked_` site)

Promotion door (`processAdvancementIntake.js:1071`); the migration wave and the GC "record catches up" (`checkForPromotions.js`); two GC spouse mints (`bondEngine.js:2591`, `:2800`); births (`generationalEventsEngine.js:1188`); the council challenger (`updateCivicApprovalRatings.js:1605`, the one mint that writes dials). Only the first reads either named tab. The wave, GC and spouse mints take what the GC row carries (BirthYear, hood, occupation, sex — drawn when that row was made).

Writers onto Advancement_Intake1: GC emergence, family match, owner door (age and sex drawn), household door (from Intake), media usage (existing names), the citizen wake (existing names), `scripts/seedBusinessOwners.js` (authored). A hold only works where someone can complete the row: a story or authored row has an author; an engine-written row has none, so its blanks are fixed at its writer, not held.

### Live 2026-11-21

Intake: 11 rows, all carry a status. Advancement_Intake1: 164 data rows — 86 media-usage bumps of existing citizens, 77 blank, 1 shifted (G-EC70). No status column on Advancement_Intake1 (col 16 unnamed); the door clears every row it skips, and throws for the whole queue on a bad clock or an off-map hood. A held row must not be cleared, and its reason needs a write path (an intent or a §9 carve-out). The GC flip and the family slot on a held row are not yet read.

### One mapping, replayed

148 arrivals C105+ on the ledger copy (the Promoted / migration-wave / record-catches-up sentences). All started at 50 × 8; now, after up to 11 Cycles: means 49.9–51.5. Candidate start, from what the door has: life stage (under 25: openness +6, out-and-about +6, family −4; 25–44: drive +4; 45–64: composure +4, family +4; 65+: family +6, out-and-about −6, drive −6); work (MEDIA sociability +6, openness +4; CIVIC integrity +4, drive +4; GAME drive +6; an owner drive +8, composure +4; a first responder or clinician composure +6); household (arrived in one or wired into one: family +8, warmth +4; alone family −2); each dial ±5 seeded on the POPID; clamp 20–80. Replay (`scratchpad arrivalDialReplay.py`): 148 distinct starts of 148; drive 39–67, composure 45–64, family 41–59, the rest 45–61; 22–68 of 148 off 50 by five or more per dial. No existing citizen is re-seeded.

### Sequencing

engine.350 Task 15 pile 1 is on the tree unbenched (10 test files red) and touches `compressLifeHistory.js`. A 351 bench cut from this tree carries two unproven changes; 351 benches after pile 1 is proven, or on its own branch of the PROD tree. **Superseded 2026-11-21:** PROD @198 is all of main at `4479a1483` (builder: "push all work live"), pile 1 included — the 351 bench is an A/B from one live sync, @198's tree then the candidate, so only 351 differs.

### Task 11 as built (2026-11-21, research-build — builder: "Continue on engine.351")

Asked for the field list and the start mapping, the builder answered "Idk" to both, then "Continue on engine.351". Built on his two standing words: the hold (§Direction 6 quote) and "arrivals' dials start from their data" (row, 11-16). The start-dial sizes below are this build's, not his — shown to him with named arrivals before PROD.

| Piece | As built |
|---|---|
| Field list | the cells a blank was drawn or defaulted for: BirthYear (Age on Intake), Neighborhood, RoleType for an adult. A child's blank RoleType stays `student`. Gender, Education, Income etc. stay derived (never an intake cell) |
| Household door (`queueHouseholdIntake_`) | a member with no Age, a head with no Neighborhood, or an adult with no RoleType: every row of the household gets `waiting — household "X" needs …`, nothing queued; the age and hood draws are gone (and the door's rng requirement with them) |
| Intake loop (`processIntake_`) and the household grouping | a status starting `waiting —` is read again each Cycle; every other status still ends the row |
| Story rows with a new name (→ Generic_Citizens) | unchanged: they make a waiting-room row, not a ledger citizen; the GC row's data rides to the ledger at promotion (all 299 live GC rows carry BirthYear, hood, occupation) |
| Promotion door (`processAdvancementRowsBody_`, the mint branch) | a new citizen's row with no BirthYear, no Neighborhood, or (adult) no RoleType is not minted, not cleared; `IntakeStatus` (self-armed, col W) reads `waiting — needs … (C<n>)`; the BirthYear-2003 default is gone. Live C100+: 82 promotions, 6 at 2003 — Renata Villanueva is a real 39 (Intake Age 39); the three C110 first-responder rows are the default's likely mark. Engine writers carry all three cells (GC from its row, owner door, household door), so the hold falls on authored rows |
| Start dials (`arrivalStartDials_`, `compressLifeHistory.js`, the blank-DialState first fold) | adults only (BirthYear set, age ≥ 18); kids stay 50 (engine.339 is his). Age: <25 openness +6, out-and-about +6, family −4; 25–44 drive +4; 45–64 composure +4, family +4; 65+ family +6, out-and-about −6, drive −6. Work: MEDIA sociability +6, openness +4; CIVIC integrity +4, drive +4; GAME drive +6; RoleType `Owner…` drive +8, composure +4; clinician / first responder composure +6. Household (spouse, parents, children or HouseholdId set): family +8, warmth +4; none: family −2. Each of the eight ±5 from the POPID's own hash (not the cycle rng). Clamp 20–80. Fandom keeps its seed. One `arrival start` step on Dial_Moves; the fold's log line counts `arrivals started` |
| Replay (snapshot 2026-11-21, 135 arrivals POP-01100+) | 131 started, 4 under 18 left at 50, 131 distinct; drive 39–61, family 39–67, composure 45–65, the rest 45–61. Snapshot blank-DialState rows: 0 — nobody existing is re-seeded |
| Line 772 above | stale: the mint sentence is read as `Intake` (no dial) since Task 2, so the start does not stack with a +7 |

Not run (test guard): files likely red — `householdIntake` (blank-age members drew an age), `ownerDoor`, `engine304FamilyLottery`, `intakeExistingRowDoor`, `mintEmployerPick` (any new-name queue row without BirthYear / Neighborhood / RoleType now waits; the status header adds one set cell), and fold tests that mint an adult with a blank DialState and expect 50s (`compressLifeHistory.dial`, `fandomDial`, `dialMoves`).

Acceptance 6 reads on the bench through an Advancement row or a household, not a lone story row (that one goes to Generic_Citizens).

**Bench 2026-11-21 (SANDBOX 1004 @223, PROD @200 + the three files, live sync C116; DEPLOY_HISTORY §Current sandbox):** C117 PASS 208 s, C118 PASS 164 s, 0 new Engine_Errors. Acceptance 6 met: the household with a spouse missing Age and the promotion row missing BirthYear wait both Cycles, unminted, each naming what is missing; the complete row (Ansel Brightwater, 52, Registered Nurse) minted with drive 55, sociability 53, warmth 53, openness 50, composure 61, integrity 48, family 49, out-and-about 47. Five natural arrivals started off 50 (Margot Holloway, 58, owner: drive 60, composure 55; Arjun Owusu, 43, owner: drive 59), two children left at 50; Dial_Moves `arrival start` = the function on every one, none on an existing citizen.

## Tasks

| # | Task | Row | Status |
|---|------|-----|--------|
| 1 | Deep-dive read; agy review folded | engine.347 | done 2026-11-16 |
| 2 | Wrong reads. (a) A job title or employer name moves nothing. As built: the parser (`parseHistoryLine_`) reads the mint sentences as their own kinds — "Promoted to Tier N in Cycle C. …" and "The record catches up: …" → `Intake` (no dial), any "Arrived in <place> …" → `Arrival` — so the three writers and the stored text are untouched; the owner door's bare `[Business]` line has its own map key. The health word-match still carries the bare word "hospital" for other unmapped lines; that class goes with Task 7 (writers sign their lines). (b) The PrevEvening "avoided the crowds" and "still buzzing" lines, Media "in a hard light" and "the spotlight moved on", and the `[Business]` draw line (raised / cut) take the sign of what they say, at the writer. (c) The streak lock: the settle floor scales with the room the swing has (`citizenMemory.js:209`), and the pending-mood test in the fold matches it (`compressLifeHistory.js:569`). (d) A catch-up fold settles between Cycles (`foldNewEntries_`). (e) After (d) is live: the 13 watermarks set to 107, backup first, read back | engine.349 | LIVE 2026-11-17, PROD stage 51 @186 (`5da47216d`); (e) done on live, 13 of 13 read back |
| 3 | The reporter's own events (`lib/reporterDialEvents.js`). Graded: the desk grade writes no Reflection_Intake row; its page line and the tension read stay (`citizenVoice.js`, the next wake reads the line back). Filed (builder 2026-11-17: "keep it on drive small"): the `filed: <headline>` row stays and lands by a fixed tag, `Media-Drive-Up-S` with `Flat` (drive +1 before the reflection share) — the classifier is not called on a headline. Printed: the Saturday sheets step writes one row per reporter per Cycle Pulse, daypart `PRINT`, `Media-Drive-Up-M` with `Flat` (drive +2), "My article was selected to run in the Cycle Pulse: <headline>", from the same print set and resolved POPID as the byline-published credit; a rerun writes nothing. The week view leaves `PRINT` rows out of "said". Printed on drive at the middle step (builder 2026-11-17: "drive is fine, keep it") | engine.347 | LIVE 2026-11-17. Read at the Tue 11-17 18:15 write wake: 5 filings, 5 rows `Media-Drive-Up-S \| Flat`, 0 graded rows, the grade line on 4 of the 5 reporters' pages (the Lives page carried no grade). Still to read: Sat 11-21 print (one `PRINT` row per printed reporter) |
| 4 | Classifier (before the new writers). As built (`b426c40c8`): four ordinary-bad event tags the dial map already carries — `Stumble` (a small setback, a hope that fell through: drive −1), `Spat` (a quarrel: warmth −1), `TrustGuarded` (snubbed or wronged: warmth −1), `ConnectionWithdrawn` (drifting apart: sociability −1); `Flat`, a tenth affect that moves nothing, with its own `DIAL_MAP` key (`'Flat': {}`) and `AFFECT_VALENCE` row (`flat: 0`) — two engine files, stage 52; the prompt names what comes through the door (a reflection, an answer to a reporter, a side of a conversation, a statement made in a job) and tags the speaker's own life, not the subject; one rule block for the dual and triple prompts. Readers taught `Flat`: the signal detector (counted, never a wave), the week digest (no vignette bonus), the wake ripple (no "they seemed" clause), the week view (no mood shown). `Disappointment` is not offered: an event tag gives its non-composure dials only on this path, so it moved nothing | engine.347 | LIVE 2026-11-17: the classifier and its readers from the commit; the two engine files PROD stage 52 @187 |
| 5 | Office, seat, worker, Mara and Varek words write a Reflection_Intake row (insertion points: `…-dials-cron-writers.md` Part 4). Where a statement lands (builder 2026-11-17: "Proceed on option 1"): only what shows — the mood as read, an event only when something bad happened to the speaker; the job itself moves nothing. One row a speaker a sitting. §Task 5 as built | engine.347 | LIVE. Read at the Wed 11-18 05:45 weekday wake: 7 statements queued, 7 `CIVIC` rows on the live tab, one a speaker (`output/cron-civic/job-statements/spool_c116.jsonl` / `landed_c116.jsonl`); 6 `Civic \| Flat`, 1 `Civic \| Anxious` (the Baylight Authority director on a firm gone to zero staff — read by hand, a right read); no bad-event tag. Still to read: Sun 11-22 chain, Mara, Varek |
| 6 | Speed keys in World_Config, seeded at today's values, validated before the Cycle and never thrown inside Phase 9 (the `integrityWearRate` pattern): `dialLineScale` 1, `dialDirectShare` 0, `dialMoodFade` 0.8, `dialHardenShare` 0.4, `dialReflectionShare` 0.225. Band edges stay code (five copies; not a speed). `Dial_Moves`: this Cycle's movers, one row per citizen and dial (from, to, band, what moved it), the tab replaced each Cycle from a copy of DialState taken when the ledger opens, so chaos breaks, wear, reflections, lines and mints are all in the difference. `Dial_Pulse`: one row a Cycle, city totals per dial (up, down, bands crossed), kept. Both queued in Phase 9; both tabs ensured | engine.349 | LIVE 2026-11-17, PROD stage 51 @186; the keys seed and the tabs are created at the first live fire (C117) |
| 7 | Direction: unsigned lines get the sign of their fact and are written; fixed-positive kinds (Work, Career, Education, Lifestyle, Media) read their line; `[Money]` lines are signed at their writers (the judicial hold and ticket lines stay unmoved, pinned in `judicialLifecycle.test.js:671-673`); the pools are counted up against down per dial before and after. Carried from Task 4: the same on the reflection path — after the classifier cut, sociability, drive and openness by reflection still lean up (replay: 56 / 3, 76 / 13, 38 / 0) because the event tags that carry them (`Media`, `Career`, `Education`, `Community`) are fixed-positive | engine.350 | LIVE 2026-11-18: PROD stage 54 @189 (the fixed kinds), stage 56 @191 (the coded pools' down side), stage 57 @192 (the relationship, household, retired-player, generic and neighborhood engines; QoL, Continuity and a retiree's line graded-only). Bench legs c and d: seven of eight dials inside 60 / 40 by pushes off the cells, sociability 53–56, warmth 51–52, openness 46–47, drive 52–55; out-and-about 62–63. The live tab written by the builder 2026-11-18 (nine placed rows, 72 scene rows off, 38 Tags cells), read back through the loader |
| 8 | Harder hits both ways: a bet by its size against what the citizen holds; an UNDOCKED run by its result and rank | engine.350 | bets LIVE 2026-11-18, PROD stage 54 @189 (§Bets as built). The UNDOCKED half waits on what the show scores (pipeline.113; gap log C116 G-EC55: the board ranks points, the night is told in credits) |
| 9 | Speed set to the middle row (lines doubled, a quarter of each week sticks) by World_Config, after Task 7 is live and measured | engine.349 | LIVE 2026-11-18: `dialLineScale` 2, `dialDirectShare` 0.25 on live World_Config (the builder's hand; this session cannot write a live sheet), read back through the pre-Cycle contract and `readDialTuning_`. Bench leg d (stage 57 @212, ten fires PASS): the down count of permanent moves beside the up count on every dial; 814–1,020 of about 1,080 citizens move a Cycle; 13% cross a band on a permanent dial in ten Cycles, 26% on the felt value. First live fire C117 |
| 10 | Re-measure the middle after 7–9; put "does 55 read differently from 50" back to him with the numbers | engine.349 | done: measured on leg d; his answer 2026-11-18 "make the middle count" (Task 14) |
| 11 | Intake, both doors (`Intake` → `processIntake_`; `Advancement_Intake1` → `processAdvancementIntake_`): the fields the ledger and the first dial seed need are named; a row missing one is held on its tab with what is missing while the other rows go through (today a blank birth year, hood or role is filled by a draw or a default); an arrival's dials start from that data | engine.351 | LIVE 2026-11-21, PROD stage 65 (§Task 11 as built); read C117 |
| 12 | A lived state said again (builder 2026-11-17, should retiring hit the dials once or at every mention: "Once"). As built: on the reflection path a `Retirement` event gives nothing (`REFLECTION_ECHO`, `citizenDialMap.js` `nudgesForReflection_`); the retirement is the engine's own `[Retirement]` life line, folded once (family +4, drive −4, unchanged); the mood of a later mention still counts. Live C113–C116: 15 `Retirement` reflection rows on 8 citizens, POP-00001 five. Only `Retirement`: in the same window the other one-time events repeat on 3 citizens (`Promotion`, `Hospitalized`, `Career-Transition`, 2–3 rows each) and are as they were. Rows already applied are not undone | engine.347 | LIVE 2026-11-17, PROD stage 53 @188 |
| 13 | A sad mood (builder 2026-11-17: "Yes" — as put to him: composure down like the other bad moods, plus a small pull down on going out). As built: `'Sad': { composure: -3, outabout: -1 }` in `DIAL_MAP`; `AFFECT_VALENCE` `sad: 0` (sorrow that names someone does not cool the bond); the classifier offers `Sad` ("sorrow, grief, missing someone, heavy-hearted over a loss or a goodbye"), no fallback words added; the office slice's complaint set, the page scan's negative set and the signal detector's poles carry it. Gate GREEN on six sets: three grief texts read `Sad`, a worried, an angry and a frustrated text keep their mood | engine.347 | LIVE 2026-11-17: engine PROD stage 53 @188, then the classifier |
| 14 | The middle counts (builder 2026-11-18). Every reader of a dial band reads the number: the event-odds multiplier (`citizenMemory.js` `BAND_MULT`, `bandMultiplier_`; `getCitizenDialBands_` and its seven Phase-5 callers), the content tab's dial conditions, the wake prompt's temperament line (`lib/citizenDials.js`), and whatever else the wiring card for `getCitizenDialBands_` and `bandIndex_` lists. Read first: each reader, what it returns at 45 / 50 / 55 today, and the loop the deep-dive named (a higher dial draws more lines, most of them were up — cause 6; lines are balanced now). Bench against leg d (same sync, same speed): shares, the pulse, who crosses a band | engine.349 | LIVE 2026-11-19: PROD stage 58 @193 (`a8f4ebe23`). §Task 14 as built. agy's review and re-review folded. Bench legs m and n beside leg d: shares, moves and crossings hold |
| 15 | The recorded items (builder 2026-11-18: "this and the logged items would be good for the next session"): gap log C116 G-EC62 (tab rows that name a place or give the citizen a relative the Conditions cell does not guarantee), G-EC63 / G-EC65 (bond kinds, `Public`, `Reputation`, `Faith`, two post-career kinds and the Creation Day pool still at a fixed size; down lines that lift the hood pulse; the relationship engine's cap of eight in ledger order; two readers that split or miss graded tags), out-and-about at 62–63% of pushes up, integrity at 44% | engine.350 | not started — next session |

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
- 2026-11-18 (research-build) — Education built: the adult engine's 101 lines (80 up, 4 down, 17 plain) and the youth engine's 16 school lines (13 up, 3 down) written under the dial each moves, one step, or not written; program lines carry their template's sign. The field count that reads a child's school years takes the graded form (it had dropped Team and Civic years since engine.299 — G-EC58). Not benched. Found: the youth engine's other four kinds are fixed-positive at +4 to +8 a line; next in the order. Lifestyle put back in the order. Media reader lines: not ruled, research-build's call at that step.
- 2026-11-18 (research-build) — Builder: "Proceed". The youth engine's other kinds built: all 95 youth lines signed (85 up, 10 down), one step each; coming-of-age and hard-week lines are `Personal`, no longer stamped `[Graduation]` / `[Stabilized]` — a stamped one blocked its holder's real graduation (G-EC59, 12 citizens, their lines untouched). Not benched.
- 2026-11-18 (research-build) — Work built: a Work line is written only under the dial it names, one step, in both writers; the tab's 101 occupation rows signed in `scripts/occupationDialTags.js` (81 up, 13 down, 7 plain; dry-run on the live tab 94 to tag, nothing written), 36 coded flavours (17 / 10 / 9), 22 reporters' work lines (16 / 2 / 4). The two `work.tech` rows go to anyone wealthy and are 121 of 301 Work lines (G-EC60). Not benched. The live Tags write waits on the builder's go with the down rows.
- 2026-11-18 (research-build) — Lifestyle read: already one step by what each line says; no cut, the down pool's Weight is its balance.
- 2026-11-18 (research-build) — Builder: "Go on tag cells and down rows". Live `Event_Content_Ledger`: 148 down rows appended (1,001 → 1,149 rows; drawn from C117 on PROD code), 94 occupation Tags cells written; both read back, the loader's skipped count unchanged at 1.
- 2026-11-18 (research-build) — Builder: "Go on next". Media built: a Media line is written only under the dial it names, one step — the four reader rows on the tab (515 of 639 Media lines, each sociability +4 until now) signed for the sheet, the coded news-climate lines by their pool, the newsroom's 46 own lines (36 up, 5 down, 5 plain). Not benched; 4 Tags cells to write before the deploy.
- 2026-11-18 (research-build) — `[Money]` built: seven line shapes that moved nothing are written under their dial at the writer (a debt cleared composure up M; a default composure down L; the rest S or M). Not benched.
- 2026-11-18 (research-build) — Bets built as designed: three sizes against a week of pay, the bars as two World_Config keys (10 / 20), the settled line tagged with its size, six map keys; the owed-wake pin and the street-source test read the sized tag. Not benched. Everything in Task 7 and the bets half of Task 8 is now built; next is the one bench.
- 2026-11-18 (research-build) — Bench, stage 54 @209, ten fires C117–C126 PASS, Engine_Errors 9 → 9, no cut kind written bare. Up share by dial: composure 50, integrity 51, family 51, outabout 62, drive 65, openness 67, warmth 80, sociability 85 — three pass 60 / 40, two fail. What is left is the coded pools (sociability 1,505 up / 4 down from code alone). Bet lines not read by this leg; a two-fire leg follows.
- 2026-11-18 (research-build) — Second bench leg (two fires): the cells show the money, Work, Media, Education and youth lines graded and two settled bets sized; the size rule over the 118 settled live bets gives the designed split. Four paper-reader tags written on the live tab. **PROD stage 54 @189**, pull-back byte for byte, on the standing go for a bench-proven push. Open on Task 7: sociability 85 and warmth 80 — the coded pools and the tab's up rows need their down side.
- 2026-11-18 (research-build) — Builder on G-EC59 and G-EC60: "Which ever it logical to how life works". Built, benched (@210, three fires PASS) and LIVE as PROD stage 55 @190: a coming-of-age line no longer counts as a graduation; a content row can be aimed at an employer, and the two Baylight-office rows on the live tab are aimed at the four Baylight tech offices.
- 2026-11-18 (research-build) — Task 5 read at the first live weekday wake (05:45): 7 queued, 7 rows landed, one a speaker; one carries a mood (`Anxious`, read by hand, right). They fold at C117.
- 2026-11-18 (research-build, second session) — The measure corrected (G-EC61: the log is not the cell; 60 / 40 by pushes is four permanent moves up for one down). The coded pools' down side built, agy's review folded, benched (leg c) and LIVE as PROD stage 56 @191.
- 2026-11-18 (research-build) — Builder on the recorded items: "Yeah we fixing all this", "Fix it all, use a couple agents". The other engines signed line by line (relationship, household, retired players, generic, neighborhood First Friday, Continuity, a retiree's line), agy's second review folded; two helper agents read the content tab row by row (72 scene rows to switch off, 11 to re-sign, 27 to sign — no money row had ever been written); benched with the middle speed row (leg d) and LIVE as PROD stage 57 @192. The live tab write and the two speed keys wait on his go (the permission check refuses live sheet writes from this session).
- 2026-11-18 (research-build) — The builder ran the two tab writes himself (this session cannot write a live sheet): nine placed rows, then 72 Active and 38 Tags cells; read back through the loader, 1,050 lines taken, 1 skipped as before. The speed keys remain.
- 2026-11-18 (research-build) — The builder set the two speed keys on live (middle row). Task 9 live; first fire at this speed C117.
- 2026-11-18 (research-build) — Builder on the middle: "make the middle count, i think you can code this better than the model that built it did 12 months ago, i think this and the logged items would be good for the next session?" Tasks 14 and 15 written; not started.
- 2026-11-19 (research-build) — Task 14 built, reviewed twice by agy, benched (legs m and n) and LIVE: PROD stage 58 @193. The builder's word on the three fixed bars recorded (a fan at 60, climbing at 60, the office bars). §Task 14 as built.
- 2026-11-21 (research-build) — Task 15 pile 1 built (uncommitted-then-committed, not benched, not reviewed): bond/arc, fame (by source; the pilot untouched), faith, Public, retired players' influence/wellness, Creation Day signed per line; the relationship cap starts at a drawn row; a down line of a gathering kind lowers the hood; TopTags tally kinds. Changes vs the cut list: "kept circling back to it" (arc:named) composure down, not plain; Sports/Team keep their pulse. Full suite: 10 files fail (citizenDialMultiCycle, citizensEventsFame.t3, compressLifeHistory.dial, contentLedgerCompose, dialMoves, engine304FamilyLottery, engine32MultiCycle, homeSocialLineSign, occupationDialTags, unlivedFold) — not yet read; tests need the builder's unlock (test-guard 2026-11-20). Tab row 276 needs `dial:sociability:up` before deploy or the Tribune fame line stops.
- 2026-11-21 (research-build) — engine.351 picked up on the builder's word ("Proceed on engine.351"); Task 11 read written (§Task 11 read): what each blank becomes, every arrival path, one start-dial mapping replayed over 148 arrivals. Next: his two calls.
- 2026-11-21 (research-build) — engine.351 Task 11 built (builder "Continue on engine.351" after "Idk" on both calls): incomplete household and promotion rows wait on their tab; adults the dials have never met start from age, work and household. Not benched; tests not run (guard). §Task 11 as built.
- 2026-11-21 (research-build) — engine.351 benched: SANDBOX 1004 @223 (PROD @200 + three files), C117/C118 PASS, 0 new Engine_Errors; both holds wait, the complete row mints off 50, every adult arrival's start matches. §Task 11 as built.
- 2026-11-21 (research-build) — engine.351 LIVE: PROD stage 65 (builder on the bench arrivals: "This looks fine"); HEAD = the benched manifest, no version cut (200-version limit). Read at C117: any held row and its status, each adult arrival's `arrival start` on Dial_Moves.
