---
title: Role Citizens Wake As Themselves Plan
created: 2026-11-10
updated: 2026-11-10
type: plan
tags: [pipeline, citizens, wakes, active]
sources:
  - scripts/cron-work-wake.js, scripts/workWakePackages.js, scripts/work-wake-packages.json
  - scripts/citizen-wake.js, scripts/citizenVoice.js, lib/wakePerception.js
  - scripts/civic-office-map.json, scripts/officeWall.js
  - output/beats/Oakland_Sports_Feed.jsonl, output/simulation_ledger_snapshot.jsonl (read 2026-11-10, C115)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.110"
  - "[[2026-09-16-work-wake-packs]] — civic.34, the work wake this extends"
  - "[[2026-11-03-mags-memory-one-home]] — pipeline.100, the review that led here"
---

# Role Citizens Wake As Themselves Plan

**Builder's words (2026-11-10):** "I want to take a look at the mayor next, review its page and what writes to it? Workday weeks, city-hall? Same with Elias Varek, wakes, journal? Business snapshot? The rest of the civic offices? My players? When they appear on 'names used' on Oakland sports feed doesn't land the event notes to their page?"

**Builder's words (2026-11-10):** "Yes go on these, not sure if this is a dial issue or an event engine issue making them not sound like who they are and a generic cron. You get the idea, these are the lives that make this world work and make it interesting. If they are written to fake through it then it won't be interesting. Make them be the citizen they wake as and make sure they are recording the memory to make them real. A player can't give a proper interview without knowing what the game event was, Elias is the most powerful citizen in the world."

**Goal:** the Mayor, the council, the agented offices, Varek and every player the feed names wake on their own week, as themselves, and that wake lands on their page.

**Rows:** pipeline.110 · **Owner:** engine-sheet

## What was read (C115, 2026-11-10)

| Citizen | Page | Finding |
|---|---|---|
| Mayor (POP-00034) | 217 docs: 207 office statements, 9 personal | no work wake; last life wake C104; the life wake calls her "an ordinary person" |
| Council D1–D9 | 33–68 docs each | D1, D6, D8, D9 hold office statements only; no seat has a work wake |
| Varek (POP-00789) | 34 docs | journals C110–C112, C115 (C113/C114 lost at the gate — repaired by pipeline.109); wakes write a neighbour watching a chalk grid; no company entry |
| Players | Horn 7, Kelley 3, Ramos 4 — press quotes only | a feed name writes a LifeHistory line (engine.208) and nothing on the page; only Coles and Aitken have a work wake |
| Interviews | `citizenVoice.js` | a player asked by a reporter is handed the city-wide A's note, never his own feed rows |
| Work wake's player node | `cron-work-wake.js` | one feed row cut to 220 characters; when the Cycle did not name him, the newest old row was handed over as this week's |

**The cause, corrected 2026-11-10 after the builder's objection ("The engine does know who they are by their flag, there is no way Horn gets a 'watching the As' with a Uni flag and sports clock mode").** He is right and the first write-up here was wrong on Horn. Read of the code and the ledger:

- `generateCitizensEvents.js` engine.208 C5 strips every `source:sports` spectator line from a GAME-clock citizen's pool. Built 2026-10-03. Horn's "porch radio" and "Oaks bullpen" lines are stamped Y3C5–Y3C6, before it; across all 58 GAME-clock citizens, the 115 `[Sports]` lines since Y3C8 are player lines (own name on the radio, the drive home after the win), none a fan's.
- The wake frame was the generic part: every citizen told "You are an ordinary person" and fed neighbourhood texture. Fixed here.
- Varek carries no flag (UNI no, MED no, CIV no) and the ENGINE clock, so the engine gives him a resident's week ("navigated the stroller traffic on College Avenue", a Heritage storefront named Varek Systems). What his row should carry is the builder's call.
- The ambient daily-texture layer goes to every tier and clock by an earlier decision (engine.38 A1, S277): Horn's "compared rent notes with a neighbor" and the Mayor's "counted cranes from the bus stop" come from it.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `lib/wakePerception.js` `loadOwnFeedLines` / `feedNamedKeys`: a citizen's own public feed rows of the Cycle, note whole, his stat segment, who he was named with; local beats only; private `question` rows never render | es | done |
| 2 | `cron-work-wake.js`: player node uses Task 1 (no stale-row fallback); new nodes `office-week` (the holder's office-position docs of the Cycle, off the page) and `own-company` (Business_Ledger rows naming him); any pack whose holder the feed names carries his feed lines | es | done |
| 3 | `cron-work-wake.js` `autoPackages`: packs with no registry entry — every agented office and project in the office map (Thursday, once a Cycle), every club citizen the feed names (Tue/Thu, once a Cycle); identity from the ledger role, the office agent's own IDENTITY file, the citizen's authored voice, his dials. Nobody carved out (the Paulson exclusion was an assumption, removed on the builder's word) | es | done — OFF pending cost approval |
| 4 | Registry entry `founder-elias-varek` (`own-company`, Tue/Thu) | es | done — `active:false` pending cost approval |
| 5 | Daily wake and interviews: `stationLine` replaces "ordinary person" for citizens of station; own feed rows reach both; an interviewed officeholder gets the office's last six positions; office statements no longer returned as "private reflections" | es | done |
| 6 | Tests (`cron-work-wake.test.js` 50, `wakePerception.test.js` 201); dry runs through the real scripts for Varek, the Mayor, Vinnie Keane, and the daily wake on the Mayor | es | done |
| 7 | Read the first live runs after the builder approves the cost — log `logs/cron-work-wake.log`, pages, Reflection_Intake rows | es | blocked on approval |

## Acceptance

1. After Tue 2026-11-10 20:18, every club citizen the C115 feed names and the ledger resolves (12 at build, Paulson excluded) has a `work` doc for C115 on his page that stays on his own feed rows — proven by page read.
2. After Thu 2026-11-12 20:18, the Mayor and the nine council seats each have a `work` doc for C115 built from their own record — proven by page read.
3. Varek's page carries a `work` doc on his companies — proven by page read.

## Open

- **Varek's flags and the ambient layer** — see the corrected cause above. No engine row is proposed; the builder decides.
- **Ledger value.** Civis Systems' `Growth_Rate` reads `516%` beside a revenue move of $60.2M → $60.3M; a third company `Varek Systems` (Tech, West Oakland, 45 people) names him as well — the Heritage generator's storefront. Both are engine output and are shown to him as they stand.
- **Unagented offices (21).** No agent, no office record, no pack. The EMS director and medical examiner have registry packs; the rest wake by lottery only.
- **Cost — NOT approved (builder 2026-11-10: "Adding 25-30 calls is not approved without pricing").** Auto packs and Varek's pack are off (`--auto` / `WORK_WAKE_AUTO=1`, `active:false`). Measured: a wake is ~700–1,500 prompt tokens and ~130–200 reply tokens on `deepseek/deepseek-v4-flash-0731` ($0.043 / $0.30 per million, OpenRouter list 2026-11-10) plus one classifier call on `anthropic/claude-haiku-5.5` (~1,000 in, ~150 out; $0.10 / $0.50 per million) — about $0.0003 a wake, under one cent a Cycle for ~30.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| — | — | — | none yet |

## Changelog

- 2026-11-10 (engine-sheet) — Builder corrected three things: Paulson is not excluded (carve-out removed); the engine does gate by flag and clock (cause section rewritten from the code — the Horn example was pre-gate history); the added calls are not approved without pricing (new wakes off, price measured and recorded under Open).
- 2026-11-10 (engine-sheet) — Opened on the builder's word. Tasks 1–6 built and dry-run through the real entry points; Task 7 waits on the Tue/Thu crons.
