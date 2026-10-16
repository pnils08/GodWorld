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

**State:** GO (builder 2026-10-16 ~00:30 CDT). Moves 1–3 + 5 shipped, backfill applied 2026-10-16; Move 4 = engine.291 (es, bench → C113), pool rows retag after its smoke.

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
- **Engine (es, bench → rides the engine.214 re-pair → C113 push 10-25):** draw-time entity slots for UNDOCKED rows only — **as built by es (engine.291): `$PILOT`, `$PILOTROLE`, `$LEADER`** (never `{pilot}` — a `{…}` token is not recognised and would print literally). `$PILOT` → this cycle's airing pilot, name from the ledger by POPID; `$LEADER` → the board leader derived from the same Undocked_Feed read; `$PILOTROLE` → RoleType before the first comma. Applied at `generateCitizensEvents.js:3213` for rows under the `undocked` flag; rows without tokens unchanged; rng order untouched (string op after the draw).
- **Rows (rb, after the engine lands):** retag the Walker / DA / Jumper / dishwasher rows to tokens; add crossover rows that only make sense because of who's in the chair ("argued whether an MVP belongs in a cockpit at all", "$PILOTROLE on UNDOCKED and the whole block had a stake") under the `undocked` flag, via `undockedEclPoolApply`.
- **Until C113:** the crossover lives in Nia's piece (Move 1) and the sports desk (Move 5). No static Eric rows — they would rot exactly like Walker's.
- **es, as built (2026-10-16, engine.291):** three code-side entity slots on the engine.38 line composer — `$PILOT`, `$PILOTROLE`, `$LEADER` (`CONTENT_ENTITY_SLOTS`, `phase05-citizens/generateCitizensEvents.js`), the same path `$VENUE` / `$CONTACT` already take; not a new substitution pass. Rules, as code: (1) the name comes from the ledger by POPID; the feed's Holder is the fallback only (Holder is blank on the whole C108–C110 pushes). (2) **One pilot per line, equal weight over the cycle's distinct airing pilots** — C112 airs three, each gets an audience; `$PILOT` and `$PILOTROLE` in one line are the same person. (3) `$PILOTROLE` = RoleType before the first comma, lowercased except a 2–4 letter acronym: "Second Baseman, Oakland A's" → second baseman; "DISTRICT ATTORNEY" → district attorney; "CBA Compliance Monitor, Fruitvale Transit Hub" → CBA compliance monitor. (4) `$LEADER` = the board as `loadUndockedFeed_` now derives it from the same tab read (`S.undockedBoard`): cumulative known CreditsDelta over rows with TargetCycle ≤ cycle, blank ≠ 0, ties by POPID — the standings recompute's own rule, so the engine and `standings.json` name the same leader. (5) A slot with no value this cycle makes its rows unfillable — they never enter a pool, so an unflagged `$PILOT` row cannot compose-null across the city. (6) Lazy: a line without a token costs no roll; a loaded feed alone moves no draw (proven byte-identical). Composer defect fixed on the way: split/join on `$PILOT` ate the head of `$PILOTROLE` ("Test POP-P3ROLE" in the first test run); whole-token replace now. Tests: `scripts/contentLedgerCompose.test.js` 53/0 (16 new). Bench: inert inside the 214 re-pair B stack (no token rows on the bench ECL), then one smoke fire with bench-only token rows; PROD with the 214 push C113 10-25. **For the row author (rb):** tokens are `$PILOT` / `$PILOTROLE` / `$LEADER`, not `{pilot}`; a `$LEADER` row may omit the `undocked` flag when the board should be talked about on a week with no episode (it still goes silent while the board is empty). Second commit (d88efe6f): a pilot never draws an audience line naming themselves — the engine drops the citizen's own POPID from the `$PILOT` options (the DSL has no negation).
- **es, bench smoke read back (2026-10-16):** SANDBOX 1004 @30 = HEAD (4d + 214 stack + 291), resynced from live C111, C112 fired with 3 bench-only token rows (`ecl:bench-smoke`, wiped by the next sync): ok 214.8 s, 0 persist errors, Engine_Errors 4 → 4; **24 token lines** in LifeHistory_Log — `$PILOT` = Rosario Medina 7 / Briar Soto 5 / Eric Taveras 3 (the three C112 pilots, nobody else), `$PILOTROLE` = CBA compliance monitor / electrician / second baseman, `$LEADER` = Eric Taveras ×9, 0 raw tokens, 0 pilot self-naming. Readback `output/engine-sheet/2026-10-16-engine291-smoke-c112-@30.md`. Note for the fame chain: LifeHistory_Log's EventTag column carries the line's tags, so a pilot-POPID tag on token lines would be countable downstream (not built — a reader comes first).

### Move 5 — who covers the crossover (newsroom structure, rb; ruling b)
Proposed default: **Nia owns the UNDOCKED story and names the career** (Move 1). **The sports desk sees the board** — when a pilot on the feed is on a team roster, one line enters the sports slices (Tanya / P Slayer / Selena / Ariana): "UNDOCKED: Eric Taveras (A's 2B) leads the board, 1,170 credits" — so the A's beat can react to their MVP flying, in their own voice. Civic desks the same when the pilot holds an office (Clarissa Dane, DA → Carmen / Luis). Deterministic: a `crossoverLine()` in `buildNiaSlice` exported to the other slice builders, keyed on RoleType. Builder's call on the default (§4).

## 3. Lanes and review
- rb: Moves 1, 2, 3, 5 — all `scripts/` pipeline, this seat's domain. Move 1 first (Saturday).
- es: Move 4 engine substitution on its bench, with the 214 re-pair, C113 push. Nothing before Sunday's C112 readback.
- Review: **agy** reviews this plan after the go (as engine.214 / engine.290). **codex** rechecks the implementation — it found the defects.
- Canon writes in this plan: standings re-score (Move 2, builder's call), ECL rows (Move 4, apply path), Citizen_Media_Usage — untouched (fires through Saturday as today).

## 4. Builder's calls — answered (verbatim, 2026-10-16 ~00:30 CDT)

> **1 -** yes the script wasnt written so the past runs knew what to do , which makes Clarissa run even more impressive. yes lets back fill her missing  points and and the other missing data on that ledger , scores and names. I really want this to work properly as its a lottery of chance and covered daily and dont want it to be a waste of my money being half wired.
>
> **2 -** I agree and whoever is the trending journalist or and likely what maybe mags would pick up on saturday to combine the all angles to give citizens that are correctly crossing over their attention.

Rulings: **(1) Backfill** — re-score the whole archive (credits, measured zeros, unknowns) AND repair the blank Holder names on the feed/ledger rows (feed c107/c108 rows carry `Holder: ''`). The show is a lottery of chance covered daily; half-wired is waste. **(2) Crossover owner** — Nia names the career (Move 1); the desk line goes to the trending journalist; and Mags's Saturday pass combines all angles for citizens who are genuinely crossing systems. Move 5 becomes a Saturday-curation concern, not a per-desk slice line only.

Original questions kept for the record:
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
- 2026-10-16 (es, S562): Move 4 built and unit-proven as engine.291 — see Move 4 "es, as built"; the multi-pilot rule (equal weight over the night's pilots) and the `$LEADER` source (the feed tab, standings rule) are es's calls, published here. Bench pending; nothing to PROD before the C112 readback.
- 2026-10-16 (es, S562, later): self-exclusion commit d88efe6f; **bench smoke PASS** on SANDBOX 1004 @30 at C112 (Move 4 "es, bench smoke read back"). The engine.214 re-pair moves to the C112 base after Sunday's readback; PROD with it before C113 10-25. rb authors the `$PILOT` rows after the readback.
- 2026-10-16 ~00:30 (rb): builder answered both calls — backfill the archive incl. blank names; crossover goes to the trending journalist + Mags's Saturday pass. GO.
- 2026-10-16 ~01:40 (rb): Moves 1–3 shipped (b93ee2a4, f6aa9c65). Backfill APPLIED per ruling 1: 38 nights — 33 measured zeros, Clarissa Dane +14 (`trading.fuel_sold`) → 317 rank 2, 8 pilots named on 16 blank Holder rows (Martin Richards, Otis Redd, Jackson Sift, Belle Lopez, Rosalind Young, Soo Loo, Leanne Wu, Wanjiru Liu); Undocked_Feed tab first, then archive/intake/feed packs (`was:` = revert map); board recomputed — no rank, CyclesLed or streak moved. Readback: tab blank Holder 0, null CreditsDelta 0. Already-printed recaps that said "can't settle yet" stand as canon. Move 4 built by es as engine.291 (`$PILOT` / `$PILOTROLE` / `$LEADER` entity slots, not `{pilot}`; see es's Move 4 "as built"); pool rows retag after its C112 bench smoke. agy plan review dispatched (output/antigravity/2026-10-16-review-research29-undocked-crossover.md).
- 2026-10-16 ~02:10 (rb): Move 5 shipped (d258f56e) as Saturday curation + narration: `crossoverCitizens` (INTAKE name or full name in the body, ≥2 desk systems; undocked-digest = undocked), +2 tie-break inside a grade, `crossoverBlock` + a charge line for Mags. Live C111 read: Eric Taveras (sports/Anthony Raines + undocked/Nia Rook), Briar Soto (business/Jordan Velez + undocked/Nia Rook). First unattended test Sat 10-17. Note from the read: 10 of 21 C111 solos filed an empty INTAKE names list — the body match is what catches them; the empty INTAKE is a separate newsroom gap (not this plan).
- 2026-10-16 ~03:20 (rb): agy plan review read (6/6 FIX; `output/antigravity/2026-10-16-review-research29-undocked-crossover.md`). Dispositions: **H1 real** — Packet caps the angle at 500 chars; identity + career now ride as `story.facts` → W1 known → W3 approvedFacts (fanout `storyFromSeed` + `buildAnglePacket` carry `facts`), angle keeps one "In the chair" clause. **H2 real** — session-only windows (runner never flew) are unknown, not zero; 11 nights reverted on tab + disk; 22 measured zeros stand; `loadEpisode` carries `stall`. **H3 engine** — casino `credits_sign` settles a 0 net as neg-WIN / pos-LOSS and `night_winner` can crown a 0 → es (3 measured zeros air at C112: Eric night 1, Briar Soto, Rosario e2). **H4 real** — auto-dock false stalls: log written + idle = complete. **H5** — self-draw already fixed by es (d88efe6f); `$PILOTROLE` availability → es; plan token text corrected to `$PILOT/$PILOTROLE/$LEADER`. **H6 partly** — cNNN / rating / TrueSource shorthand stripped from career lines; plain cycle talk kept (newsroom rule). es's engine.291 bench smoke PASS @30 (24 token lines, leader Eric Taveras ×9, 0 raw tokens); rows retag after the 214+291 PROD push, before C113.
