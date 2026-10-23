---
title: Celeste's Dead Slice, Engine Legends, and the Interview Guards Plan
created: 2026-10-16
updated: 2026-10-17
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

**Rows:** pipeline.81 (slice + sourcing, scripts/) · engine.296 (legends pool, phase07) · engine.297 (fame pools from the Cultural_Ledger, phase07) · **Owner:** research-build designs, engine-sheet executes.

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
| 6 | **engine.296 — SPORTS_LEGENDS from the ledger.** `buildEveningFamous.js`: replace the three-entry literal with rows where `OriginGame` contains `MLB` and `Status == Retired` (6 today: Kinder, Conrad, Skenes, Kerkering, Bubic, Rushing), role "A's legend", home hood from the row. No literal fallback — an empty pool is an empty pool. A traded player is archived off the ledger and leaves the pool by itself. Bench on 1004 before PROD; `/stub-engine` in the same commit. | es | done (es, 2026-10-16) |
| 7 | **Retire the three template rows on live Cultural_Ledger** (CUL-424B3208 Thompson, + Rodriguez, + Davis): `Status → Inactive` so every slice's `ACTIVE_RE` skips them and the record keeps the history. Read back. | es | done (es, 2026-10-16) |
| 8 | **Acceptance — C112 Celeste (Fri 2026-10-23 wire run):** angle ≠ "Marin Tao leads the conversation"; `quotesRequested ≥ 1`; no no-POPID name on the slice; "engine" absent from the slice; Rhea `pass` or flags unrelated to 1–4. Read `.wake.json` + `.rhea.json`. | rb | waits C112 |
| 9 | **engine.297 — fame sightings draw from the Cultural_Ledger.** Builder 2026-10-17, verbatim: *"There is a cultural ledger that is the fame citizens , those hardcoded may be the same as them but the fame sightings and event Injection should come from there"*. `buildEveningFamous.js:92–172` holds **twelve** literal pools (ACTORS, MUSICIANS, ATHLETES, INFLUENCERS, JOURNALISTS, CHEFS, STREAMERS, AUTHORS, CIVIC, BUSINESS, ARTISTS, CULTURAL_LEADERS — the earlier "seven"/"eight" counts were short). They become buckets filled from Active `Cultural_Ledger` rows by `FameCategory`/`RoleType` (`classifyRole` at `culturalLedger.js:167` already maps role → category); the context weighting at `:281–409` keeps concatenating buckets; an empty bucket is an empty bucket (engine.296 rule); hood from the linked citizen's row — every Active row is `POP-`-linked since Task 7 (the 3 unlinked rows in the C111 dump were the three template rows). `S.famousSightings` / `S.famousPeople` shape unchanged (readers: `buildMediaPacket.js:304–439`, `mediaFeedbackEngine.js:597–663`); `registerCulturalEntity_` (`:574–579`) keeps bumping the row it drew. Bench on 1004 carries codex's HOLD: a synthetic playoff/championship rung so the legends pool is seen in a fire. `/stub-engine` same commit. The builder routes the work. | codex builds the patch (builder 2026-10-17: "Ask codex"; TASK `docs/research/2026-10-17-engine297-fame-ledger-impl-TASK.md`) → es benches + PROD when the builder routes | ready |

## Open (held, not in scope)

- **Two readings Task 9 builds around — decided at rb, 2026-10-17, not put to the builder** (he was asked and answered "Idk what you're asking me anymore"; the ruling was about hardcoded names, not these paths): (a) the active Tier 1–2 A's keep entering the sighting pool from `Simulation_Ledger` (`REAL_PLAYERS`, `buildEveningFamous.js:186–245`) as today — that path is already the ledger, and it is how a player first earns a `Cultural_Ledger` row (14 "A's player" rows in the C111 dump); (b) the fame seam in `generateCitizensEvents.js:2719–2735` stays as written — it already reads the Cultural_Ledger (`culturalFame ≥ 25`) alongside the paper-appearance count (`usageCount ≥ 8`); nothing hardcoded there. A sighting's own ripple (`recordRipple_` at `:518–548`) moves with the pool by construction. Reopen only if the builder says so.
- Oaks players in the athlete pool (`REAL_PLAYERS` reads `MLB` origin only).

## Build notes (engine-sheet, 2026-10-16)

- **Tasks 1–5 on main**, npm 290/290. C111 dry build of Celeste's slice: lead "Sienna Vale gained 1 mention this cycle (5 total)", three moved figures (Sienna Vale, Pixel Pete, Lumi Crest — all citizen-linked), six citizens on the slice, hood Laurel (Sienna's), no "engine" anywhere in the slice JSON. The three template rows are off every slice.
- **Task 1, no prev/ on disk:** sighted-this-cycle (`LastSeenCycle == cycle`) stands in for movement; the lead reads "on the record this cycle (N mentions total)". Prior dump keyed on `CUL-ID`.
- **Task 3 reach:** every reporter-facing "engine" in the slice builders went — headings ("ENGINE HOOKS" → "CITY HOOKS", "ENGINE SEED" → "CITY SEED"), the arts / neighborhood / transit approach lines, transit's cause and train-hit lines, the safety hotspot fact, the desk runner's hooks block. Nothing parses those headings (grepped scripts, lib, agents, skills).
- **Task 5, one reading narrower than the table:** the ruling says "if they are in the whatever wakes them". Every row the slice names is now a target whatever its `why` (the Jax bench fills same-hood-signal / city-resident / bond-hop included). The packet's own reach past the slice into the ledger (`neighborsFromLedger`, why `same-hood-ledger` / `ledger-resident`) is NOT on anything that woke the seat, so it stays out (`isLedgerFillCandidate`). A proximity target still carries no evidence row (ADR-0017 §1/§4: same-neighborhood is not lived exposure) — it is interviewed as a neighbor, not a witness. Rest cap, tally and soft-floor waiver removed; QUOTE_CITIZEN_CAP stays.

- **Task 6 (engine.296) LIVE PROD @143 (stage 4l)**, bench 1004 @39 C112 clean (DEPLOY_HISTORY stage 4l). The C112 bench week reached no playoffs/championship rung, so the legends pool is unit-proven (`sportsWeekCity.test.js`), not yet seen in a fire.
- **Task 7 done on live:** CUL-6BE26977, CUL-90C4267D, CUL-424B3208 → Inactive, read back.

## Reviews reconciled

- **codex 2026-10-16** (`docs/archive/for-claude-review/2026-10-16-codex-celeste-usage-legends-review.md`; TASK beside it) — **FIX landed:** pipeline.81 one-cycle baseline / provenance / athlete-and-official eligibility (`01cb95aa`); print-credit tests moved above the suite's exit + receipt fixtures + integration check (`dcb767cb`). **SHIP accepted:** engine.296 source change; cap revert clean; Saturday main order publish → coverage → sweep → sheets. **HOLD carried:** engine.296 never seen in a fire (→ Task 9 bench rung); the non-sports pools (ruled 2026-10-17 → Task 9); the publisher silently omits a missing staged entry while the receipt records every selected stem (not built — hardening, builder's call whether it matters); first-live print-credit claims (Sat 10-17 16:00 run).

- **Task 9 (engine.297) LIVE PROD @159 = stage 22** (2026-10-22): codex patch landed `486ea61e` with two es fixes (an `unknown` category re-reads the role words — live Rosa Martinez / Li Wei; a POP-linked row is sighted only while its citizen lives on the ledger). Bench 1004 F1 C113–C116 PASS beside the stage-21 control (DEPLOY_HISTORY §PROD stage 22). The engine.296 legend HOLD stays carried: it clears on the first live playoff / championship week (the legends path is byte-identical in this stage).

## engine.312 — the fame score is broken (builder 2026-10-23)

**Builder, verbatim (2026-10-23, on the fame rate after engine.297 went live):** asked how fame should grow per sighting (+5 base today, plus holiday / economy extras, no ceiling): **"1 point a sighting"**. Asked whether fame stops at 100 (Marin Tao 153, Rico Valez 116, Jade Orion 104): **"Over 100?"** then **"Never heard of any of them so the fame score is broken"**.

**Measured on live (2026-10-23, Cultural_Ledger × Simulation_Ledger by UniverseLinks):** 48 of 50 rows were minted by the sighting path (`FirstRefSource` SystemEngine — the retired literal pools), 2 by engine.118. FameScore tracks sightings, not the record: rows at FameScore ≥ 50 average 0.8 paper mentions (`UsageCount`), rows under 50 average 9.0. Top: Marin Tao 153 (25 sightings, 1 mention, Tier 4), Rico Valez 116 (19, 1, T4), Jade Orion 104 (18, 0, T2), Lena Cross 93 (17, 0), Sage Vienta 90 (17, 0). A sighting adds +5 + calendar/economy extras (`culturalLedger.js` registerCulturalEntity_ :266), fading only after 10 quiet Cycles (−1/Cycle, :71–93); no ceiling. Distribution: <25: 25 · 25–49: 12 · 50–74: 6 · 75–99: 4 · 100+: 3.

**Ruled:** a sighting is worth 1 point (read flat — the extras ride the paper path, not sightings). **Open with the builder:** what fame is earned from (the reading engine-sheet brings: being named in the published record — Citizen_Media_Usage / UsageCount, the engine.118 mark at 25 mentions — with a sighting the consequence of fame, 1 point), whether today's scores are re-based from that record, and a ceiling. Not built; the 1-point rule rides the same build.

**Builder 2026-10-23, chose "The paper (Recommended)" (verbatim option):** "Fame rises when a citizen is named in a published piece; a sighting is a result of fame and adds 1 point. Today's scores get re-based from each person's paper record, fading stays, and fame stops at 100." Design + build are engine-sheet's; the re-base is a live Cultural_Ledger data change — dry run with every row old → new, then apply and read back.

## Status log

### engine.296 — status (drained from ROLLOUT, 2026-10-22 / S592)

SPORTS_LEGENDS → retired MLB-origin ledger rows, no literal fallback (builder 2026-10-16). LIVE PROD @143 (stage 4l); Davis predicate (retired OR RoleType legend, 01ea836f, codex SHIP) LIVE PROD @144 (stage 4m) 2026-10-17; three template Cultural_Ledger rows Inactive on live; C112 read: 0 literal legend names in LifeHistory / WorldEvents, evening famous all ledger citizens; Celeste Fri 10-23

### engine.297 — status (drained from ROLLOUT, 2026-10-22 / S592)

Fame sightings draw from the Cultural_Ledger (builder 2026-10-17: "the fame sightings and event Injection should come from there") — the twelve literal pools in `buildEveningFamous.js:92–172` become buckets filled from Active Cultural_Ledger rows by FameCategory/RoleType; context weighting and the sightings shape unchanged; an empty bucket is an empty bucket; bench carries the codex HOLD (synthetic playoff rung so legends are seen in a fire). A's players keep seeding from Simulation_Ledger and the fame seam stays as written (rb call 2026-10-17; plan §Open). Codex builds the patch (builder 2026-10-17: "Ask codex"); es benches + PROD when the builder routes

## Changelog

- 2026-10-23 (engine-sheet) — engine.312 ruled "The paper": fame from published naming, sighting +1, re-base from the record, fading stays, ceiling 100.
- 2026-10-23 (engine-sheet) — engine.312 filed: builder "1 point a sighting", then "Never heard of any of them so the fame score is broken"; live measure recorded under §engine.312.
- 2026-10-22 (engine-sheet) — Task 9 / engine.297 LIVE PROD @159 (stage 22) after the rollout stale check found the codex patch unapplied since 10-17; build notes above.

- 2026-10-17 (research-build) — builder's fame-ledger ruling recorded verbatim → Task 9 / engine.297 (ready; codex builds the patch on "Ask codex"); the two side readings decided at rb as keep-as-is (the builder declined them); codex 2026-10-16 review reconciled and archived.

- 2026-10-16 (engine-sheet) — Tasks 6–7: engine.296 LIVE PROD @143; template rows Inactive on live.

- 2026-10-16 (engine-sheet) — Tasks 1–5 built on main; build notes above (Task 5 ledger fill-ins stay out).

- 2026-10-16 — plan written from the C111 read; three builder rulings recorded verbatim; Tasks 1–7 to es, 8 to rb at C112.
