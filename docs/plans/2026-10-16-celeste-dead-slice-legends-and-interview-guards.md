---
title: Celeste's Dead Slice, Engine Legends, and the Interview Guards Plan
created: 2026-10-16
updated: 2026-10-16
type: plan
tags: [media, pipeline, engine, culture, draft]
sources:
  - scripts/buildTrendsSlice.js (ranking by lifetime MediaCount; approach text carries the word "engine")
  - output/beats/Cultural_Ledger.jsonl @C111 (53 rows; Marin Tao LastSeenCycle 104, Dax Monroe 82; three no-POPID template rows)
  - output/cron-compare/wire_c109..c111_celeste-tran_packet-v2_x-ai-grok-4-3.md (+ .rhea.json, .wake.json)
  - scripts/newsroom-wake-packages.json celeste-tran (sourcing "street")
  - scripts/newsroomSourcing.js named()/street()/buildPool(); scripts/livedExperiencePacket.js candidateRows()/isProximityCandidate(); scripts/cron-desk-run.js collectQuoteAsks() REST_CAP
  - phase07-evening-media/buildEveningFamous.js SPORTS_LEGENDS (lines 174–177)
  - output/simulation_ledger_snapshot.jsonl (6 Retired MLB-origin rows)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.81, engine.296"
  - "[[2026-10-11-media-extension]] — the solo-seat and grading apparatus this sits on"
---

# Celeste's Dead Slice, Engine Legends, and the Interview Guards Plan

**Builder's words (2026-10-16, after the C111 read):** "Agree with this , also there shouldn't be "warriors" players hard coded in the engine , the other 2 are my players but Rodriguez was traded so those hardcoded will cause problems , and I drop any guard on a citizen being interviewed. If they are in the whatever wakes them wakes them"

**Goal:** Celeste Tran's seat gets a slice that moves and people she can talk to; the engine stops minting famous figures from a hardcoded name list; every seat may interview anyone its slice names.

**Rows:** pipeline.81 (slice + sourcing, scripts/) · engine.296 (legends pool, phase07) · **Owner:** research-build designs, engine-sheet executes.

## The read (rb, 2026-10-16, C111)

Celeste's C111 piece was blocked by Rhea (2 flags, 256 words against the 400 floor, graded 3/4). The writer is not the defect; the slice is.

| # | Finding | Evidence |
|---|---|---|
| 1 | **The leaderboard never moves.** The trends slice ranks Cultural_Ledger figures by lifetime `MediaCount`. Marin Tao leads with 25 and was last sighted C104; Dax Monroe 20, last sighted C82. The same angle "Marin Tao leads the conversation (25 mentions)" was assigned at C109, C110 and C111. | `buildTrendsSlice.js:66-67`; `Cultural_Ledger.jsonl` rows; the three story files |
| 2 | **Zero interviews, three cycles running.** Her wake package sources `street`: a citizen qualifies only if a life line / page reflection / exchange turn *this cycle* verb-matches the story's typed highlights. A trends story has no typed highlights (`typedHighlights` keys on pulse class + a named show/event), so `street()` returns `[]` before it looks at anyone. `quotesRequested 0` at C109–C111. Her six named citizens never reached the pool. | `newsroomSourcing.js:216-234, 302`; `wire_c111_…_packet.json` |
| 3 | **The slice hands her an engine template name, Rhea blocks her for it.** "Warriors Alumni Thompson" is a hardcoded `SPORTS_LEGENDS` entry minted onto Cultural_Ledger at C110 with no citizen; the slice printed it as "new on the culture record"; Rhea flagged it `unverified` (high). Same list: "Former A's Star Rodriguez" (C107), "Oakland Native MVP Davis" (C108). No Rodriguez with MLB origin is on the ledger; Darrin Davis (POP-00021) is. | `buildEveningFamous.js:174-177`; `Cultural_Ledger.jsonl` no-POPID rows; `.rhea.json` |
| 4 | **"engine" is in her instructions.** The slice approach text reads "what the engine's hooks say is shifting"; she wrote "the engine keeps flagging" and Rhea flagged it (med). | `buildTrendsSlice.js:32`; `celeste-tran.md` §APPROACH |
| 5 | **The only moving number is a demographics delta** (students+adults vs the prior dump: Uptown +62 at C109, West Oakland +18 at C111), so each piece is built on it. | `buildTrendsSlice.js:87-102` |
| 6 | The slice's hood is the lead figure's residence (Chinatown); Celeste lives in West Oakland and wrote about her block. Cosmetic; fix with the ranking. | `buildTrendsSlice.js:127` |

The existing stale-beat check (`newsroom-fanout-beat-stale.test.js`) compares `story.ref`, which carries `@C<cycle>` and so is never equal across cycles. It did not catch the repeat.

## Rulings (verbatim above, applied)

- **S1 — the slice fix is agreed.** Rank by what changed this cycle, drop no-citizen figures, strip "engine", the page voices are her people.
- **S2 — no hardcoded famous names in the engine.** "Warriors" has no place (NBA/Warriors are retired labels, engine.202 ruling). Rodriguez and Davis are the builder's players, but a hardcoded line outlives a trade. The pool reads the ledger.
- **S3 — "I drop any guard on a citizen being interviewed. If they are in the whatever wakes them wakes them."** A citizen named on the slice that woke the seat is an interview target. The 2026-09-30 ruling (touched-or-nobody, proximity excluded) is superseded for citizens the slice names.

## Tasks

| # | Task | Owner | State |
|---|---|---|---|
| 1 | **Trends slice ranks by movement.** `buildTrendsSlice.js`: read `output/beats/prev/Cultural_Ledger.jsonl` (exists) and rank by `MediaCount` delta vs prev, tie-break `LastSeenCycle == cycle`, then lifetime count. Lead line reads "<name> gained N mentions this cycle (M total)". If nothing moved: the angle says the record is quiet and leads with the arrivals/movement fact — never re-assign last cycle's lead as "leads the conversation". Hood = Celeste's own when no lead figure moved. | es | done (es, 2026-10-16) |
| 2 | **No-citizen figures leave the slices.** Trends, arts, lifestyle, pulse slice builders skip Cultural_Ledger rows with no `POP-` in `UniverseLinks` from FACTS, "who just appeared" and PEOPLE (they are template names Rhea cannot verify). | es | done (es, 2026-10-16) |
| 3 | **Strip "engine" from slice text.** `buildTrendsSlice.js` approach → "what the city's hooks say is shifting"; grep every `scripts/build*Slice.js` for `engine` in reporter-facing strings and fix the same way. | es | done (es, 2026-10-16) |
| 4 | **Every seat's pool starts from the slice's names.** `newsroomSourcing.buildPool()`: for every mode except `records`, candidates = `named(story, slice)` ∪ the mode's own (street/workplace/offices add, never gate). `named()` drops the `why` exclusion regex (same-hood/ledger-resident/city-resident/bond-hop) and the `source === 'assignment'` early return. | es | done (es, 2026-10-16) |
| 5 | **Drop the proximity and rest guards.** `livedExperiencePacket.js:412-414` exposure filter keeps only `isLedgerPop`; `cron-desk-run.js:467` same; `REST_CAP`/`interviewTally` rest branch removed (the soft-floor waiver goes with it). `QUOTE_CITIZEN_CAP = 4` stays — it is the per-wake budget, not a guard on a citizen. `records` seats (Marbury) stay interview-less — seat design, not a guard. Tests from the 2026-09-30 ruling invert: `newsroomSourcing`, `livedExperiencePacket*`, cron-desk suites green. | es | done (es, 2026-10-16) |
| 6 | **engine.296 — SPORTS_LEGENDS from the ledger.** `buildEveningFamous.js`: replace the three-entry literal with rows where `OriginGame` contains `MLB` and `Status == Retired` (6 today: Kinder, Conrad, Skenes, Kerkering, Bubic, Rushing), role "A's legend", home hood from the row. No literal fallback — an empty pool is an empty pool. A traded player is archived off the ledger and leaves the pool by itself. Bench on 1004 before PROD; `/stub-engine` in the same commit. | es | ready |
| 7 | **Retire the three template rows on live Cultural_Ledger** (CUL-424B3208 Thompson, + Rodriguez, + Davis): `Status → Inactive` so every slice's `ACTIVE_RE` skips them and the record keeps the history. Read back. | es | ready |
| 8 | **Acceptance — C112 Celeste (Fri 2026-10-23 wire run):** angle ≠ "Marin Tao leads the conversation"; `quotesRequested ≥ 1`; no no-POPID name on the slice; "engine" absent from the slice; Rhea `pass` or flags unrelated to 1–4. Read `.wake.json` + `.rhea.json`. | rb | waits C112 |

## Open (held, not in scope)

- The other hardcoded pools in `buildEveningFamous.js` — ACTORS, MUSICIANS, STREAMERS, AUTHORS ("Marcus Webb" collides with the OEWD program-director agent), CIVIC ("Councilwoman Rivera"), BUSINESS, ARTISTS, CULTURAL_LEADERS — mint the same no-citizen rows ("Cultural Ambassador Li Wei" @C110, "Pixel Pete" @C111). The builder's ruling named sports; the rest is his call. Task 2 keeps them off the slices either way.
- Oaks players in the athlete pool (`REAL_PLAYERS` reads `MLB` origin only).

## Build notes (engine-sheet, 2026-10-16)

- **Tasks 1–5 on main**, npm 290/290. C111 dry build of Celeste's slice: lead "Sienna Vale gained 1 mention this cycle (5 total)", three moved figures (Sienna Vale, Pixel Pete, Lumi Crest — all citizen-linked), six citizens on the slice, hood Laurel (Sienna's), no "engine" anywhere in the slice JSON. The three template rows are off every slice.
- **Task 1, no prev/ on disk:** sighted-this-cycle (`LastSeenCycle == cycle`) stands in for movement; the lead reads "on the record this cycle (N mentions total)". Prior dump keyed on `CUL-ID`.
- **Task 3 reach:** every reporter-facing "engine" in the slice builders went — headings ("ENGINE HOOKS" → "CITY HOOKS", "ENGINE SEED" → "CITY SEED"), the arts / neighborhood / transit approach lines, transit's cause and train-hit lines, the safety hotspot fact, the desk runner's hooks block. Nothing parses those headings (grepped scripts, lib, agents, skills).
- **Task 5, one reading narrower than the table:** the ruling says "if they are in the whatever wakes them". Every row the slice names is now a target whatever its `why` (the Jax bench fills same-hood-signal / city-resident / bond-hop included). The packet's own reach past the slice into the ledger (`neighborsFromLedger`, why `same-hood-ledger` / `ledger-resident`) is NOT on anything that woke the seat, so it stays out (`isLedgerFillCandidate`). A proximity target still carries no evidence row (ADR-0017 §1/§4: same-neighborhood is not lived exposure) — it is interviewed as a neighbor, not a witness. Rest cap, tally and soft-floor waiver removed; QUOTE_CITIZEN_CAP stays.

## Reviews reconciled

_none yet_

## Changelog

- 2026-10-16 (engine-sheet) — Tasks 1–5 built on main; build notes above (Task 5 ledger fill-ins stay out).

- 2026-10-16 — plan written from the C111 read; three builder rulings recorded verbatim; Tasks 1–7 to es, 8 to rb at C112.
