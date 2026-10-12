---
title: Media Extension Plan — every desk writes for a purpose, citizens' lives in the slices
created: 2026-10-11
updated: 2026-10-11
type: plan
tags: [media, newsroom, draft]
sources:
  - scripts/newsroom-fanout.js:47 (WEEK_GRID — the 22 weekly seats)
  - scripts/cron-desk-run.js:46 (BEAT_BUILDERS — 13 seats written from a slice)
  - scripts/beatSliceKit.js (shared slice shape; sportsSubject at :355)
  - scripts/buildHealthSlice.js (approach + ineligible = K.sportsSubject)
  - scripts/dumpBeatTabs.js (BEAT_TABS — no LifeHistory_Log)
  - scripts/buildWorldSummary.js:280 (WHO_LIVED_IT_TAGS) · :1129 emitDeskSignal
  - Bay_Tribune_Oakland tab (live staff roster, read 2026-10-11)
  - LifeHistory_Log live, C105–C111 tag census (read 2026-10-11)
  - editions/cycle_pulse_c110.txt (read in full 2026-10-11)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.73"
  - "[[2026-09-07-beat-slices-from-sheets-plan]] — pipeline.68, the slice layer this extends"
---

# Media Extension Plan — every desk writes for a purpose, citizens' lives in the slices

**Builder's words (2026-10-11):**

> "each reporter is basically assigned to element of what the engine produces or is added into the engine — Civic for that, Sports for that, Health for that. The problem is they are likely writing about the system of say the health system and ask citizens about that. Undocked similar, cover the system that it is and ask citizens about it."

> "All these journalist are core members of the sim, before crons. So the only method to give a citizen a life was in a media interview. It's was quite literally the point of the media interview the beginning. Now the crons live their own lives, whether it be engine events to life history or cron reflections. So the interviewing them still happens and it's what pushes their usage and tiers, but the Citizen experience has since grown a lot and it's the only element running daily now also."

> "the health desk should be reporting on hospital stays, the questions becomes on who is writing and why. So we have 22 or 23 journalists, the idea is to cover the sim, which isn't just a traditional news room set up. The citizens here aren't private, if someone lost at the casino that is news, if a couple got divorced that is news, if Isley Kelley opened a business that is news. That is the sim game happening."

> "The crime data and health rates are good to know but also easy to find for me, how deacon Seymour week went while in the hospital, I have no idea. But it happened."

> "it's not that I don't want to have Carmen cover the politics cause that's what keeps them honest but them as the citizens is likely more important than the civic initiatives, health desk should be covering the citizens and their health. Mentioning the numbers is fine if they are being used to state a change but [dropping] them without any context doesn't do much."

> "Let's start make it part of a media extension plan … making sure each are writing for a purpose, what lane they cover and why, and injecting citizens lives into slices that make sense and deciding who is the journalist that should just report on random citizens … We can walk through tech reporter and understand what they do and why."

> "I'd be careful making direct changes without proper reviews and blast radius code checks with wiring cards."

> "We will do a deep canon search on what each journalist has written to see who they are if it's not obvious."

**Goal:** every seat on the weekly grid has a written purpose (what lane, why, whose lives it covers); every slice that fits a lane leads with the citizens who lived that lane this cycle; one seat reports on citizens whose week was the news, whatever lane it touched.

**Rows:** pipeline.73 · **Owner:** research-build (newsroom design) with engine-sheet (dump, kit, desk signal)

## The problem, measured (2026-10-11)

- **The desks are given systems, not people.** 13 of the 22 weekly seats write from a slice (`cron-desk-run.js:46`). Every slice is built from tabs that track systems: station counts, illness by neighborhood, the crime table, the fame table. The beat dump (`dumpBeatTabs.js` BEAT_TABS) does not include `LifeHistory_Log`, so no slice can see what a citizen lived.
- **The other 9 seats draw from the desk signal.** C111 signal: civic 54, business 46, culture 20, sports 8 items. Citizens' lives get one pointer item ("milestones"), filtered by an 11-tag list (`buildWorldSummary.js:280`). Of 2,771 C111 log rows, the filter passes 21.
- **Citizens appear, but as commentators.** C110: 6 of 9 pieces quote a citizen. 5 of those 6 quote reactions to someone else's story (the Oaks losing, a station's rider count, a clubhouse mood). 1 piece (Colin Phillips at Nino's) is about a citizen's own work. 0 pieces carry a LifeHistory event.
- **Deacon Seymour, the gap at full size.** The A's manager rode an ambulance (workplace accident) C105, was "recovering, expected to be released soon", then "made a full recovery and returned to their duties". Health desk: no slice existed C105/C106. From C107 on, `buildHealthSlice.js` drops any sports figure from the hospital record by rule ("a pro athlete on the hospital record is a sports story"). Sports desks get feed rows only. He reached C108 only as a quoted manager on Danny Horn's slump.
- **The life record is rich.** C105–C111 tag heads (live): Strain 254, Promotion 121, Career-Hired 14, LifeEvent-Promotion up/down 23, Business-Owner 9, Business-Gain 13, Relief (stabilization grants) 3, Hospitalized 2, Critical 1, Stabilized 1, Recovering 9, Recovery 4, Birth 4, Death 3, Retirement 6, Setback 5, Rivalry 4, Alliance 4, CivicRole up/down 16, Team 48, Graduation 2. Texture heads (Neighborhood 3,899, Daily 2,277, Civic Perception 1,880, Personal 1,412, Sports 1,240 …) are mood, not news.

## Seat purpose table (draft — every row to be walked with the builder)

The lane is what the seat covers. "Lives" is whose week leads the piece. Fed today is what the code hands the seat now.

| Seat | Day | Lane | Why it exists | Lives it should lead with | Fed today |
|---|---|---|---|---|---|
| Carmen Delaine | Mon | Civic affairs | keeps officials honest | residents a council vote or grant touched (Relief, CivicRole rows) | desk-signal civic lane |
| Business desk (Jordan Velez) | Mon | Economics & labor | the city's money as people's jobs | hired, promoted, passed over, owner, closed, casino loss, Strain | desk-signal business lane |
| Dr. Lila Mezran | Mon | Health | hospital stays, illness, recovery | Hospitalized, Critical, Stabilized, Recovering, Recovery, Birth, Death — athletes included | health slice (illness by hood leads) |
| Trevor Shimizu | Mon | Transit & infrastructure | how the city moves | transit workers; residents whose commute changed (no life tag yet) | transit slice |
| Anthony Raines | Mon | A's beat | Mike's games | players' and staff's own weeks alongside the box score | Anthony slice / sports lane |
| Luis Navarro | Tue | Investigations | records and silences | residents a stalled promise left waiting | desk-signal civic lane |
| Rachel Torres | Tue | Public safety | crime, courts, custody | Setback (tickets), charges, custody, BoundaryCompromised | safety slice (crime table leads) |
| Angela Reyes | Tue | Schools & youth | kids and teachers | Team (made the cut), Graduation, youth Education rows | schools slice |
| Selena Grant | Tue | Oaks beat | the expansion build | Oaks players' and staff's own weeks | Oaks beat slice |
| Jax Caldera | Wed | Accountability | ledger vs official story | citizens the broken mechanism hit | stink slice |
| Noah Tan | Wed | Weather & environment | the ground under the city | residents the weather changed (no life tag yet) | environment slice |
| Elliot Marbury | Wed | Data desk | numbers with a claim | one player's multi-year line | data-desk slice |
| P Slayer | Wed | Fan heat | the fan's voice | fans' own weeks | P Slayer slice |
| Tanya Cruz | Wed | Clubhouse access | real-time signal | players' own weeks (Deacon C105 belonged here or with Lila) | desk-signal sports lane |
| Elliot Graye | Thu | Faith & quiet work | congregations | Faith rows; who a congregation carried this week | faith slice |
| Simon Leary | Thu | Sports as civic architecture | the team in the city | — | desk-signal sports lane |
| Hal Richmond | Thu | Senior historian | legacy, the long view | — | Hal slice / sports lane |
| Talia Finch | Thu | Oaks from the street | who becomes a fan | fans' own weeks | Oaks ground slice |
| Mason Ortega | Fri | Food & hospitality | restaurants as workplaces | kitchen and floor workers hired, promoted, burned out | desk-signal culture lane |
| Kai Marston | Fri | Arts & entertainment | arts as a neighborhood act | artists' own weeks | arts slice (fame table) |
| Sharon Okafor | Fri | Lifestyle — behavior and daily life | how people live | Birth, Death, Family, Relationship, Rivalry, Alliance, Retirement, Strain | lifestyle slice (fame table leads) |
| Maria Keen | Fri | Neighborhood texture | one block | Relief, Maneuver-Retreat, Business-Owner, Family on that block | neighborhood slice |
| Celeste Tran | Fri | Social trends | where the city is moving | — | trends slice |
| Nia Rook | daily | UNDOCKED recap | who's up, who's down on the show | contestants' own weeks | UNDOCKED feed slice |

**Not on the grid (live roster, Bay_Tribune_Oakland):** Lena Carrow (Field Reporter), Dana Reeve (Lead Journalist), Farrah Del Rio (Civic & Cultural Opinion), Reed Thompson (TWS Wire Reporter), Ariana Reyes (Gridiron Analytics), Mint Condition (Speculative Internet).

**No tech reporter exists.** The roster has no Science/Tech seat, and there is no agent file for one. Benji Dillon's good (Calm) maps to the Science / Tech Pulse section (`.claude/rules/newsroom.md` Five Goods), and nobody is staffed to write it. This is the walk-through the builder asked for.

## Tasks

Every code task gets an `engine-wiring` card for each function, field or tab it touches, plus a caller graph. Each one has a codex or agy review before it lands, is bench-proven, and is accepted on the next unattended desk run.

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Walk the seat table with the builder, one seat at a time, starting with the tech reporter question. Each row gets a builder-confirmed lane, a reason, and the lives it leads with. Where a journalist's identity is not obvious, it comes from a deep canon search of everything they have published (NotebookLM canon + `search_articles`), not from the agent file or the roster title. | Mags + builder | not started |
| 2 | Pick the citizens' reporter: one seat whose job is citizens whose week was the news, in any lane (the casino loss, the divorce, the opening, the ambulance). Candidates: Lena Carrow (Field Reporter, unseated), Dana Reeve (Lead Journalist, unseated). Recommendation: Lena Carrow. | builder | not started |
| 3 | Wiring cards and blast radius for `dumpBeatTabs.js` BEAT_TABS, `beatSliceKit.js` `wire().build/load`, `buildHealthSlice.js` `ineligible`, and `buildWorldSummary.js` `emitDeskSignal` and `WHO_LIVED_IT_TAGS`. Consumers of each: the 13 slice builders, `cron-desk-run.js`, `newsroom-fanout.js` laneSeeds, the six desk-signal readers, and the tests. | es | not started |
| 4 | Dump what citizens lived: add `LifeHistory_Log` to the beat dump, windowed to the last 6 cycles so an arc rides whole (ambulance, then recovering, then recovered). | es | not started — a draft was written and reverted 2026-10-11 pending Task 3 |
| 5 | Lived-event classes in the kit. These are allowlists on the tag head, mapped per seat lane: health, safety, schools, life, money, civic, neighborhood, faith. Texture heads are excluded. A shared lead-with-lives pass puts that lane's citizens first in people, facts, angle and hookLine. The system number moves to context and stays only where it states a change. Cache version bump. | es | not started — same reverted draft |
| 6 | Health slice: athletes stay on the health record as citizens (Deacon's case). Decide with Task 1 whether a sports figure's hospital stay goes to Lila, Tanya, or both. | es + builder | not started |
| 7 | Desk signal: one life item per citizen, with a handle, at the head of the civic, business, culture and sports lanes. This covers the 9 seats that have no slice. | es | not started |
| 8 | Seat purpose into each agent's approach line and wake package, from the confirmed table (Task 1). | rb | not started |
| 9 | Citizens' reporter seat: grid slot, agent, and a slice that takes the cycle's top lived events across every class. | rb + es | blocked on Task 2 |

## Acceptance

1. A Deacon-class event (a citizen hospitalized this cycle, athlete or not) reaches a seat's assignment as the lead story, proven by the next unattended desk run's fanout file and staged article.
2. In one full desk week after landing, most slice-fed seats lead with a named citizen's own event, not a system table. Proven by the staged articles across that week.
3. No seat's existing facts are lost. The system numbers are still on the slice as context. Proven by a slice diff before and after for all 13 seats, on the same cycle.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| advisor read of the diagnosis | es (advisor) | this session, 2026-10-11 | read-only — reach of the desk signal vs slices; LifeHistory missing from the dump; people[] carry a topic, never a week |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Desk-signal items never reach the 13 slice seats; a slice overrides the seed | es · advisor | cron-desk-run.js:1625 `story = beatSlice.story \|\| story` |
| A2 | No slice can see LifeHistory; the dump lacks it | es · advisor | dumpBeatTabs.js BEAT_TABS |
| A3 | Citizens are not private; a life event is news | builder | quote above, 2026-10-11 |
| A4 | Carmen keeps politics; citizens outrank initiatives | builder | quote above, 2026-10-11 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | Anthony, Hal and P Slayer seats read their own slice files, not the sports lane | es | wiring card on `cron-desk-run.js` enrich paths | cron-desk-run.js:1663 selectTypedSlice |
| P2 | The Story_Hook_Deck already carries life events for some desks (July storyHook fix) | advisor | hook-deck HookType census vs LifeHistory tags, C105–C111 | output/beats/Story_Hook_Deck.jsonl |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | Attach each person's own lived rows to every slice's people[], so even a system story quotes someone about their week | advisor | reach to all 13 seats in one place | adopted into Task 5 |

## Open questions

- Should a Tier-2 A's manager be able to get hurt by the ambulance chaos event in the middle of a championship run? This is a sim judgement for the builder, outside this plan's code.
- Why did the A's championship run go uncovered as a citizens' story? This blocks Task 1 for the sports seats.
- Who is the tech reporter: a new mint through Intake, an unseated roster member, or no seat? This blocks Task 1.

## Changelog

- 2026-10-11 (engine-sheet) — Created from builder direction S553. A draft kit and dump change was written and reverted, pending wiring cards and review.
