---
title: research.29 — UNDOCKED Crossover: The City Knows Its Pilots
created: 2026-10-16
updated: 2026-10-16
type: plan
tags: [research, undocked, newsroom, citizens, active]
sources:
  - docs/for-claude-review/2026-10-15-codex-undocked-spacemolt-crossover.md — codex read (builder-run 2026-10-15 21:16; every claim rb-verified below)
  - docs/plans/2026-08-07-spacemolt-game-show.md — the show (research.27), §3.2 objective, §Post-ship (e) weekly digest
  - scripts/undockedEpisodeAdapter.js, scripts/undockedStandings.js, scripts/buildNiaSlice.js, scripts/undockedEclPool.js, scripts/undockedEpisode.js, scripts/cron-undocked-run.js, scripts/cron-saturday-run.js:89-93,417-464
  - phase05-citizens/generateCitizensEvents.js:959-966 (what an UNDOCKED line moves), :3213 (row text at draw), phase02-world-state/loadEventContentLedger.js:199-216 (Text column, no substitution)
  - output/spacemolt-show/standings.json, output/spacemolt-show/feed/c111.json, output/spacemolt-show/staged/archive/*.json (55), output/beats/Oakland_Sports_Feed.jsonl:229-238
pointers:
  - ROLLOUT research.29
  - NEXT[research-build]
---

# research.29 — UNDOCKED crossover: the city knows its pilots

**State:** PLAN — holding for the builder's go. No code, no dispatch, no sheet write yet.

**Deadline that matters:** Nia's weekly digest fires **Sat 2026-10-17 08:15 CDT** (angle) → 09:15 (report) → 10:15 (write), on the C111 feed. Eric Taveras is in that feed with his 1,170 and the lead. Move 1 lands before 08:15 or her Saturday piece introduces him as "UNDOCKED cast pilot" again.

## 0. Builder's direction (verbatim, 2026-10-16 ~00:00 CDT)

Asked three sim calls at boot. Answers:

> **(a)** ideally yes. Eric Taveras is on an amazing run in the spotlight and the fact Undocked pick him up right after the season is amazing story material. Im not suggesting Nia should be reporting on his A's career but at minimum should know he is on the As. When she writes her undocked piece on Saturday she should know their career. The gap ultimatley is thats a major storyline in the sim right now given his run of success. His usage shold be pushing fame scores soon.
>
> **(b)** i covered alot of this is the last response but this is what makes this a city when the systems crossover, and it creates that gap of who covers the crossover of A's star on Undocked, Clarissa Dane the civic citizen on Undocked? These are major citizen storylines and gives the citizen a major sim events in canon.
>
> **(c)** no its a conspiracy if we dont give the citizens their awarded points. These show gives a random citizen the chance to major usage in media and their points need to be recoreded properly.

Read as rulings:
- **(a)** The city reacts to the pilot *as who they are* (the A's MVP in the chair). Nia knows every pilot's career; she does not cover the A's. Saturday is the first test.
- **(b)** Systems crossing is the point. The newsroom needs an owner for the crossover story (A's star on UNDOCKED; the DA on UNDOCKED). A pilot's run is a major canon event in that citizen's life.
- **(c)** Every credit a citizen earned in the game is recorded on the board. No silent blanks. Media usage from the show must reach their fame.

## 1. What rb verified (2026-10-16, files, not the codex text)

| Claim | Verdict | Evidence |
|---|---|---|
| Eric's 1,170 is real game money | **TRUE** | archive `undocked-pop00597-2026-10-16`: Sold 1 Nickel Ore 128 + 3 Titanium 36 + 6 Iron 6 + mission "Market Participation: Selling" 1,000 = 1,170; `facts.credits_delta` FACT. Night 1 (10-13): mined 41 units, sold nothing → no credit entry. |
| Half the runs show blank | **TRUE, and not zero** | 55 archived episodes: 34 `credits_delta.value = null`, 0 measured zeros, 21 valued. Standings sum known values; blank is "not counted", by contract (`undockedStandings.js:24`). |
| The adapter misses payments | **TRUE — exactly one event type** | Full sweep of all 55 archives for credit-shaped data keys the adapter returns null on: **one hit**, `trading.fuel_sold` with `data.credits` (Clarissa Dane 2026-09-07, 14 cr). `creditDeltaForEntry` reads `total`/`escrow`/`refunded_credits`/mission keys/generic `credits_delta` only (`undockedEpisodeAdapter.js:143-170`). The other 33 blanks carry no credit-bearing entry at all: mining-only nights, or runner stalls. |
| Runner failures | **TRUE** | Simone Adesanya 2026-10-10: 18 game calls, **153 turns**, 0 tool errors, 2.71M tokens in — the model stopped calling the game and talked until the 10-minute cap. No idle stop exists; `undockedEpisode.js:16-19,111-115` stops only on docked captains_log or wall clock. Eric 10-16: 29 calls, 9 tool errors, hit the cap mid-mission. |
| Nia gets name + hood only | **TRUE** | `buildNiaSlice.js:citizenInfoFor` returns `{hood, name}` from the ledger snapshot; nothing else about the pilot. Shared by the daily slice and `buildNiaWeeklySlice`. |
| The sports feed knows him | **TRUE** | `Oakland_Sports_Feed.jsonl`: "playoff MVP Eric Taveras … 7th Homerun" (C109), "Eric Taveras win World Series MVP to go along with his post-season MVP" (C110), parade with Ramos (C111). |
| Audience rows name old pilots | **TRUE** | `undockedEclPool.js` SHOW_ROWS: Walker ×4, "the DA" ×1, Jumper ×1, "the dishwasher" ×4 — static text. |
| Saturday reads C111 | **TRUE** | `cron-desk-run.js:1262-1266` → `buildNiaWeeklySlice(detectCycle())`; `feed/c111.json` events: Rosario Medina 110, Eric Taveras null, Briar Soto null, Rosario null, Eric 1,170. `recaps.json` has `weekly-c110`, not c111 → it will file. |

**Can ECL rows name the current pilot?** No. Row text is read from the Text column (`loadEventContentLedger.js:199-216`) and used as-is at draw (`generateCitizensEvents.js:3213 pick = entry.text`). No substitution anywhere. Naming the leader is an **engine change**, not a wording edit.

**The fame chain, as data (ruling a "usage should push fame"):**
1. Eric on the board (`standings.json` rank 1) → Nia's digest and daily piece carry him.
2. Her piece stages like any other (`output/cron-compare/undocked-digest_c<N>_…`).
3. Saturday curation reads every staged file for the cycle; a printed piece writes `Citizen_Media_Usage` rows for its INTAKE roles — subject→`featured`, mentioned→`mentioned`, quoted→`quoted` (`cron-saturday-run.js:93,417,464`) and the author's `byline-published` (pipeline.79).
4. `processMediaUsage_` counts them into UsageCount next cycle → MEDIA tier bars → fame.
5. Separately, the pilot's own `source:undocked` kind:pilot ECL line moves **Reputation** (`generateCitizensEvents.js:966`); audience lines move fandom +1 and nothing else.

So the payout exists and fires **only if Nia's piece prints** (grading, pipeline.79). Nothing in this plan changes that chain; it feeds it better input.

## 2. Moves

### Move 1 — Nia knows who is in the chair (rb, before Sat 08:15)
`buildNiaSlice.js:citizenInfoFor` grows from `{hood, name}` to `{hood, name, occupation, employer, roleType, tier}` off the same ledger-snapshot pass, plus a **career line set**: every `Oakland_Sports_Feed.jsonl` row from the last 6 cycles whose `NamesUsed` contains the pilot's name (Notes, cycle, SeasonType) — deterministic, no LLM. Both the daily lane entry and the weekly pilot roster carry it as `who` facts the writer sees ("Eric Taveras — A's second baseman, World Series MVP C110, playoff MVP C109"). Rule in the slice: *the career is who they are, not the story; the story is the flight.* Tests in `buildNiaSlice` test file; run the C111 weekly build dry to read the facts before the cron fires.

### Move 2 — every earned credit lands (rb)
- Adapter: score `trading.fuel_sold` → `data.credits` (and any `trading.*` entry carrying `credits` with no `credits_delta`) — the one missed type across all 55 archives.
- **Measured zero vs unknown:** when the action log for the window was fetched complete and carries no credit entry, `credits_delta` becomes **FACT 0** (the night earned nothing). `null` is reserved for a windowed/missing log (Clarissa 09-07's own note: "no credit fields on windowed entries"). The board already adds 0 harmlessly; Nia's `creditsPhrase` already says "dead even on the night" for 0 and "a night the books can't settle yet" for null — those words become true.
- Re-score: re-run the adapter over the 55 archives → Clarissa 303 → **317**, rank 2 unchanged; 33 blanks become 0 or stay unknown per the rule. **Whether history is re-scored or the rule runs forward only is the builder's call (§4).**

### Move 3 — the runner stops when the pilot stops flying (rb)
`undockedEpisode.js` telemetry watcher: after **N consecutive `turn_end` with no game call** (N = 8, dial in the script header) → stop the flight, write `runner.stall = {turnsIdle, lastGameCall}` into the sidecar so the adapter can label the night *unscored: runner stall* rather than blank. Saves the 150-turn burn (Simone: 2.7M tokens in for 18 real calls). Test with the Simone log replayed.

### Move 4 — the city reacts to who is flying (es, engine; rb, rows)
- **Engine (es, bench → rides the engine.214 re-pair → C113 push 10-25):** draw-time substitution for UNDOCKED rows only: `{pilot}` → this cycle's pilot Holder (`S.undockedFeedEntries`), `{leader}` → standings leader, `{pilotrole}` → the pilot's Occupation from `ctx.ledger`. Applied at `generateCitizensEvents.js:3213` for rows under the `undocked` flag; rows without tokens unchanged; rng order untouched (string op after the draw).
- **Rows (rb, after the engine lands):** retag the Walker / DA / Jumper / dishwasher rows to tokens; add crossover rows that only make sense because of who's in the chair ("argued whether an MVP belongs in a cockpit at all", "{pilotrole} on UNDOCKED and the whole block had a stake") under the `undocked` flag, via `undockedEclPoolApply`.
- **Until C113:** the crossover lives in Nia's piece (Move 1) and the sports desk (Move 5). No static Eric rows — they would rot exactly like Walker's.

### Move 5 — who covers the crossover (newsroom structure, rb; ruling b)
Proposed default: **Nia owns the UNDOCKED story and names the career** (Move 1). **The sports desk sees the board** — when a pilot on the feed is on a team roster, one line enters the sports slices (Tanya / P Slayer / Selena / Ariana): "UNDOCKED: Eric Taveras (A's 2B) leads the board, 1,170 credits" — so the A's beat can react to their MVP flying, in their own voice. Civic desks the same when the pilot holds an office (Clarissa Dane, DA → Carmen / Luis). Deterministic: a `crossoverLine()` in `buildNiaSlice` exported to the other slice builders, keyed on RoleType. Builder's call on the default (§4).

## 3. Lanes and review
- rb: Moves 1, 2, 3, 5 — all `scripts/` pipeline, this seat's domain. Move 1 first (Saturday).
- es: Move 4 engine substitution on its bench, with the 214 re-pair, C113 push. Nothing before Sunday's C112 readback.
- Review: **agy** reviews this plan after the go (as engine.214 / engine.290). **codex** rechecks the implementation — it found the defects.
- Canon writes in this plan: standings re-score (Move 2, builder's call), ECL rows (Move 4, apply path), Citizen_Media_Usage — untouched (fires through Saturday as today).

## 4. Builder's calls
1. **Re-score history?** Move 2's rule changes one past number (Clarissa +14, rank unchanged) and turns 33 blank nights into measured zeros or labelled unknowns. Backfill the archive, or run the rule forward from the next flight only?
2. **Crossover owner.** Move 5's default (Nia names the career; sports/civic desks get one board line when their citizen is flying). Yes, or a different split?

## 5. Sequencing
1. Go → Move 1 built + tested + committed, C111 weekly slice dry-built and read (Fri 10-16). Cron fires Sat 08:15 untouched (no manual demo).
2. Moves 2 + 3 (Fri/Sat), adapter re-run per call 1, standings re-pushed if backfill.
3. agy plan read (after go) → codex impl recheck (after 1–2).
4. Move 5 (next week, with the sports/civic slice builders).
5. Move 4 engine token on es's bench with 214 → C113 10-25 → rows retagged after readback.

## Changelog
- 2026-10-16 (rb, S561): plan written from the codex read, every claim verified against the files; builder's three rulings recorded verbatim; held for go.
