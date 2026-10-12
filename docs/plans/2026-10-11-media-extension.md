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

> "Let's start make it part of a media extension plan … making sure each are writing for a purpose, what lane they cover and why, and injecting citizens lives into slices that make sense and deciding who is the journalist that should just report on random citizens … We can walk through tech reporter and understand what they do and why." — "tech reporter" is dictation for **each reporter** (misread as a tech seat 2026-10-11, corrected the same session).

> "I'd be careful making direct changes without proper reviews and blast radius code checks with wiring cards."

> "We will do a deep canon search on what each journalist has written to see who they are if it's not obvious."

**Goal:** the builder's three asks, in his words: "making sure each are writing for a purpose, what lane they cover and why", "injecting citizens lives into slices that make sense", and "deciding who is the journalist that should just report on random citizens". Nothing below decides any of them; they are decided with the builder, reporter by reporter.

**Rows:** pipeline.73 · **Owner:** research-build with engine-sheet

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Walk each reporter with the builder: what they do and why — their purpose and their lane. Where it is not obvious, a deep canon search of what they have written decides who they are. Each row of the table below is filled from that walk, not before. | Mags + builder | not started |
| 2 | With the builder: which slices citizens' lives make sense in. | Mags + builder | not started |
| 3 | With the builder: who is the journalist that just reports on random citizens. | builder | not started |
| 4 | Any code that follows from 1–3 gets wiring cards, blast-radius checks and a review before it changes. | es | not started |

## Reporter table (to be filled by Task 1)

Seat and day are from the weekly grid (`scripts/newsroom-fanout.js:47`). The roster title is from the Bay_Tribune_Oakland tab. "Fed today" is what the code hands the seat now. Purpose, lane and why are blank until the walk.

| Seat | Day | Roster title | Fed today | Purpose / lane / why |
|---|---|---|---|---|
| Carmen Delaine | Mon | Civic Affairs Reporter | desk-signal civic lane | |
| Business desk (Jordan Velez) | Mon | Economics & Labor | desk-signal business lane | |
| Dr. Lila Mezran | Mon | Health Desk | health slice | |
| Trevor Shimizu | Mon | Transit & Infrastructure | transit slice | |
| Anthony Raines | Mon | Lead Beat Reporter - Oakland A's | Anthony slice / sports lane | |
| Luis Navarro | Tue | Investigations | desk-signal civic lane | |
| Rachel Torres | Tue | Public Safety | safety slice | |
| Angela Reyes | Tue | Education | schools slice | |
| Selena Grant | Tue | Oaks Beat Reporter | Oaks beat slice | |
| Jax Caldera | Wed | freelance accountability writer | stink slice | |
| Noah Tan | Wed | Weather & Environment | environment slice | |
| Elliot Marbury | Wed | Journalist, Data Desk | data-desk slice | |
| P Slayer | Wed | Fan Columnist - Sports | P Slayer slice | |
| Tanya Cruz | Wed | Sideline Reporter | desk-signal sports lane | |
| Elliot Graye | Thu | Ethics & Faith Journalist | faith slice | |
| Simon Leary | Thu | The Long View Columnist - Sports | desk-signal sports lane | |
| Hal Richmond | Thu | Senior Historian | Hal slice / sports lane | |
| Talia Finch | Thu | Oaks Ground Reporter | Oaks ground slice | |
| Mason Ortega | Fri | Food & Hospitality | desk-signal culture lane | |
| Kai Marston | Fri | Arts & Entertainment | arts slice | |
| Sharon Okafor | Fri | Lifestyle | lifestyle slice | |
| Maria Keen | Fri | Cultural Liaison | neighborhood slice | |
| Celeste Tran | Fri | Social Trends | trends slice | |
| Nia Rook | daily | UNDOCKED Recap Journalist | UNDOCKED feed slice | |

On the roster but not on the grid: Lena Carrow (Field Reporter), Dana Reeve (Lead Journalist), Farrah Del Rio (Civic & Cultural Opinion), Reed Thompson (TWS Wire Reporter), Ariana Reyes (Data Analyst, Gridiron Analytics), Mint Condition (Speculative Internet).

## Record (measured 2026-10-11, data only)

- 13 of the 22 grid seats write from a slice (`scripts/cron-desk-run.js:46`). The slices are built from the beat-tab dump (`scripts/dumpBeatTabs.js`), which does not include `LifeHistory_Log`.
- The other seats draw from the desk signal. C111: civic 54, business 46, culture 20, sports 8 items. Citizens' lives: one pointer item, filtered by `WHO_LIVED_IT_TAGS` (`scripts/buildWorldSummary.js:280`), which passed 21 of 2,771 C111 log rows.
- C110 edition: 6 of 9 pieces quote a citizen, 5 of them on someone else's story; 1 piece (Colin Phillips, Nino's) on a citizen's own work; no LifeHistory event in any piece.
- Deacon Seymour: ambulance (workplace accident) C105, then "recovering", then "full recovery, returned to duties". No health slice existed C105/C106. `buildHealthSlice.js` drops sports figures from the hospital record. He appears in C108 only as the manager quoted on Danny Horn.
- A draft code change (LifeHistory into the dump, a lived-events pass in `beatSliceKit.js`) was written and reverted 2026-10-11 on the builder's instruction about reviews and wiring cards.

## Acceptance

1. Every reporter on the table has a purpose, lane and why that the builder confirmed.
2. The builder has named the slices citizens' lives go into, and the journalist who reports on random citizens.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| — | — | — | none yet |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

- Should a Tier-2 A's manager be able to get hurt by the ambulance event in the middle of a championship run? The builder raised it ("should he be able to get hurt like that?").
- Why did the A's championship run go uncovered? The builder raised it ("The As are in a championship run and no one covers that?").

## Changelog

- 2026-10-11 (engine-sheet) — Rewritten to the builder's words: the author's own designs (lead-with-lives, per-seat life classes, a reporter recommendation, code tasks) removed; the builder said the plan misrepresented him.
- 2026-10-11 (engine-sheet) — Corrected: "tech reporter" was dictation for "each reporter".
- 2026-10-11 (engine-sheet) — Created.
