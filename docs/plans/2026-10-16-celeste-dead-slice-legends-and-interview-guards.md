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

**Builder 2026-10-25, the paper's rate (verbatim):** "5 for positive coverage -2 for negative", then "1 pt for neutral". Each published mention reads its `Citizen_Media_Usage.Sentiment` (engine.152 light: positive / neutral / negative; blank reads neutral). Live 2026-10-25: 857 non-byline mentions — 43 positive, 6 negative, 241 neutral, 567 never graded (C70–C90 + 4 at C104, 3 at C107; their Context is a label, not the passage). **Builder 2026-10-25: "Grade"** the 567 before the re-base (Haiku 5.5 classifier, ~$0.06 at 0.10 / 0.50 per M), the passage lookup on a Haiku subagent. Passages land in a scratch receipt first; the Sentiment write-back rides the re-base dry run, not before it.

## engine.313 — one citizen, one fame row (engine-sheet, 2026-10-24)

**Defect:** `registerCulturalEntity_` resolves the caller's POPID (`culturalLedger.js:354`) but picks the existing row by exact Name only (`:426-431`); a miss appends a new row carrying that POPID (`:535-571`). The fame bridge (`buildEveningFamous.js:229-243`) sights a citizen under their Simulation_Ledger name, so "Muralist Dante Reyes" gains a twin "Dante Reyes" (bench F1 + control 2026-10-22, DEPLOY_HISTORY stage 22 §Found).

**Measured 2026-10-24 (Cultural_Ledger × Simulation_Ledger by UniverseLinks):** live — 50 rows, 0 personal rows named differently from the linked citizen, 0 citizens with two personal rows, 0 dynasty rows. Bench baseline `BASELINE-1004-C112b` — 10 named differently, 4 at the fame bar (Evan Morello 71 / citizen Everson Morello, Sculptor Alma Vasquez 53, Muralist Dante Reyes 45, Gallery Owner Mei Chen 33). Nothing on live to merge; the fix closes the mechanism.

**Build (`registerCulturalEntity_` only; codex plan review `docs/research/2026-10-23-codex-engine313-plan-review.md` F1–F4 folded):**
1. Resolve the target row before the registry: exact Name first (old precedence, unchanged) → else, with a resolved POPID, the highest-FameScore linked row that is not an institution (FameCategory `dynasty` or RoleType `Institution`), ties to the earliest row → else CREATE.
2. UPDATE writes the resolved row; no rescan by name (F1).
3. The registry key for an existing row is the row (`row:<n>`), so both spellings land on one entry and one intent set; pending-create stays keyed by name.
4. On the POPID path FameCategory / CulturalDomain are not refreshed — the row's own metadata stands, so a dynasty-derived role cannot overwrite a personal row (F2). The exact-name path keeps its refresh.
5. No Status filter (UPDATE never reactivates a row). One log line per POPID resolution, for the bench read.
6. The bridge and `culturalStatusByPop_` are untouched (that map also weights recognition events, `generateCitizensEvents.js:2956`).

**Tests (engine.313 block in `scripts/sportsWeekCity.test.js`: the real registrar, real write intents and the three real helpers on a mutable fake sheet; synthetic non-canon rows):** a citizen-name call updates the differently named linked row (CUL-ID / Name / UniverseLinks unchanged, 0 appends); both spellings in one Cycle, in both orders → one registry entry, one intent set, MediaCount +2, the second fame bump equal to the first, each helper once on that row; F1 collisions — an earlier row with the same label and another POPID, one POPID on two personal rows at different scores, a dynasty row first → the caller's highest personal row; an equal-score tie → the earlier row; dynasty-only link → CREATE; dynasty 80 + personal artist 40 with role `dynasty` → the artist row, still `artist`; exact-name precedence and unresolved-name CREATE unchanged.

**Receipt (extend `output/engine-sheet/2026-10-22-e297-check.js`):** F3 — a new personal row (dynasty predicate on both sides, case- and space-insensitive) whose non-empty POPID matches a baseline personal row → HOLD naming both CUL-IDs; blank links never match; a new dynasty passes. F4 — for each baseline row named differently from its citizen, when the citizen's ledger name is in that Cycle's Riley_Digest famous list (`godWorldEngine2.js:2002`), the row's LastSeenCycle is that Cycle; `--final` with no such hit → coverage HOLD.

**Bench:** stage 23 + this file from the B start (baseline reset, the mismatched names kept), C113 then C114–C116; e297 F1 (same start) minted Dante Reyes and is the before. **Held for the builder:** bench use was stopped 2026-10-23 ("You're not allowed to touch the sandbox anymore", DEPLOY_HISTORY stage 23); the job model of the same day keeps bench in the lifecycle. **Builder 2026-10-25:** chose "Bench it" for engine.313; on codex: "That’s was for a bad night codex can take the review from you".

**Gate:** codex diff review of the exact candidate and its receipts → PROD.

**Bench G1 (2026-10-25, candidate `962b7547`, `output/engine-sheet/2026-10-25-e313-bench-G1.log`):** C113–C116 all PASS; minted only Martin Richards (A's player, as in F1). C116 sighted "Dante Reyes" and reached CUL-CEF9BF70 "Muralist Dante Reyes" (LastSeen 116, still artist) where F1 at C116 minted the twin CUL-B5A3A5B0.

**Codex diff gate 1 (2026-10-25, `docs/research/2026-10-24-codex-engine313-diff-gate.md`): HOLD** — F1 SHIP; F2 FIX (the caller's role word still set the fame bonus and the summary on the POPID path); F3 FIX (receipt accepted any `POP-` string; no committed fixtures); F4 FIX (final-snapshot `>=` is not path proof). **Folded:** target row resolves before role classification and a POPID-resolved row is classified by its own FameCategory / CulturalDomain (else its RoleType words); receipt joins canonical `POP-ddddd` only and binds each Cycle's citizen-name sighting to the row by MediaCount delta over the previous receipt (only the registrar writes MediaCount), label-also-sighted = not attributable, missing previous receipt = HOLD; fixtures `output/engine-sheet/2026-10-25-e313-receipt.test.js` 13/13; registrar tests 86/86 — every cell intent's row, both helper sets, registry-preloaded score / dynasty cases, the F2 bonus case and a real-bridge case (both F2 cases fail on `962b7547`). Re-bench G2, then codex gate 2.

**Bench G2 (`3b2de7c5`):** C113–C116 PASS; C116 binds "Dante Reyes" → CUL-CEF9BF70, MediaCount 8→9, no twin. **Codex gate 2: SHIP** (`docs/research/2026-10-25-codex-engine313-diff-gate2.md`); its reuse note folded into the receipt after the push (a previous receipt counts only as the same leg's PASS for the Cycle before, typed MediaCount, living citizens only; fixtures 16/16; G2 C116 re-read PASS, byte-identical). **LIVE: PROD @161 = stage 24, 2026-10-25 ~01:12 CDT** (DEPLOY_HISTORY stage 24). **Status: done** — live has 0 rows named differently, so C113 cannot exercise the path; nothing waits on it.

**Found, not built here:** the pending-create repeat branch writes positions 18 / 19, which on the live header are HolidayPriority / SportsSeason (engine.266 class) → its own ROLLOUT row. The name-only readers `recordMediaLedger_` and `logCulturalMention_` still miss an alias (codex review) — existing. The bridge's category round-trip (business-figure / media-personality / cultural-leader → unknown, sports-figure → athlete on the exact-name path) → engine.315, rides engine.312.

## engine.314 / 315 — registration keeps the row's calendar columns and its authored category (engine-sheet, 2026-10-25)

**Builder 2026-10-25:** "Move on the 2 bugs" — both ship as one stage (stage 25), one bench leg, one codex gate.

**engine.314 — defect:** the pending-create repeat branch (`culturalLedger.js` registerCulturalEntity_, same-Cycle second call for an entity new this Cycle) writes positions 18 / 19 as the v2.2 LastSeenHoliday / CalendarContext; on the live header those are HolidayPriority / SportsSeason (the engine.266 bug CREATE already fixed by header name). **Measured live 2026-10-25:** HolidayPriority holds only priority words (major 9, minor 7, cultural 5, oakland 5, blank 24), SportsSeason only seasons — no damage to repair. **Build:** the repeat writes LastSeenHoliday / CalendarContext by header name, as UPDATE does; absent on the live header, so nothing is written there and the CREATE row's Holiday / HolidayPriority / SportsSeason stand (same Cycle, same values).

**engine.315 — defect:** on an existing row the registration rewrites FameCategory / CulturalDomain from the caller's role word, against engine.297's rule that an authored category decides (codex 2026-10-23 1a). The role words are a bucket row's own RoleType, the legend / player pool's "A's legend" / "A's player", or the bridge's copied category, and `classifyRole` misreads several: "Celebrity" → unknown (the row then drops out of every sighting bucket for good), "A's legend" → unknown, "Community Advocate" → activist, `sports-figure` → athlete. **Measured live 2026-10-25:** 6 of 50 rows change under a role-word refresh (Dax Monroe, Marin Tao, Rico Valez, Lena Cross — "Celebrity"; Marisol Rivera; Isley Kelley — "A's legend"), 1 under a category-word refresh (Mike Paulson). Stage 22 put the ledger-row sightings live and no live Cycle has run since, so C113 is the first live reach. **Bench G2 already shows it:** Benji Dillon athlete/Sports → unknown/Other, Mike Paulson sports-figure → athlete. **Build:** on an existing row an authored FameCategory (not blank, not `unknown`) decides — the registration classifies the row by it (fame bonus, summary) and never rewrites it; a blank / `unknown` category is filled from the classification when it finds one (POPID path: the row's own RoleType words; exact-name path: the caller's role word). Subsumes the engine.313 POPID-path rule. The fame bonus now follows the authored category (a legend sighting in a championship week takes the Sports bonus) — the existing table, no new rate.

**Tests (`scripts/sportsWeekCity.test.js`):** 314 — a new entity twice in one Cycle on the live header keeps the CREATE row's Holiday / HolidayPriority / SportsSeason, MediaCount 2; on a v2.2 header the repeat writes LastSeenHoliday / CalendarContext by name. 315 — "Celebrity" on a musician row, "A's legend" on an athlete row (championship: +6), `sports-figure` on a sports-figure row → no category write, bonus by the authored category; `unknown` row + "chef" → filled chef / Culinary; blank row + "Celebrity" → nothing written; POPID path, blank category → filled from the row's own RoleType. The engine.313 exact-name case (artist row, role `author`) now keeps `artist`.

**Receipt (`output/engine-sheet/2026-10-22-e297-check.js`):** a pre-existing row whose authored category or domain changed from the baseline → HOLD (engine.315); a new row whose HolidayPriority equals its Holiday or whose SportsSeason carries a joined calendar string → HOLD (engine.314 signature). A natural leg rarely repeats a new entity in one Cycle, so 314's proof is the unit test; the receipt guards the signature.

**Bench:** stage 24 + this file from the B start, C113–C116 (leg G3); G2 is the before (Benji Dillon, Mike Paulson relabelled). **Gate:** codex diff review of the exact candidate + receipts → PROD, guarded against the C113 fire.

**Done (2026-10-25):** candidate `3109503e`; bench G3 C113–C116 PASS — no authored category rewritten (Benji Dillon athlete, Mike Paulson sports-figure), their fame identical to G2, the engine.313 binding holds. Codex diff gate SHIP (`docs/research/2026-10-25-codex-engine315-diff-gate.md`; note: the bonus also reaches TrendTrajectory / CityTier through the helpers — not asserted by the tests). **LIVE: PROD @162 = stage 25, ~02:07 CDT** (DEPLOY_HISTORY stage 25). C113 is a smoke note; nothing waits on it.

## Status log

### engine.296 — status (drained from ROLLOUT, 2026-10-22 / S592)

SPORTS_LEGENDS → retired MLB-origin ledger rows, no literal fallback (builder 2026-10-16). LIVE PROD @143 (stage 4l); Davis predicate (retired OR RoleType legend, 01ea836f, codex SHIP) LIVE PROD @144 (stage 4m) 2026-10-17; three template Cultural_Ledger rows Inactive on live; C112 read: 0 literal legend names in LifeHistory / WorldEvents, evening famous all ledger citizens; Celeste Fri 10-23

### engine.297 — status (drained from ROLLOUT, 2026-10-22 / S592)

Fame sightings draw from the Cultural_Ledger (builder 2026-10-17: "the fame sightings and event Injection should come from there") — the twelve literal pools in `buildEveningFamous.js:92–172` become buckets filled from Active Cultural_Ledger rows by FameCategory/RoleType; context weighting and the sightings shape unchanged; an empty bucket is an empty bucket; bench carries the codex HOLD (synthetic playoff rung so legends are seen in a fire). A's players keep seeding from Simulation_Ledger and the fame seam stays as written (rb call 2026-10-17; plan §Open). Codex builds the patch (builder 2026-10-17: "Ask codex"); es benches + PROD when the builder routes

## Changelog

- 2026-10-25 (engine-sheet) — engine.312 rate ruled: positive +5, negative −2, neutral +1; grade the 567 ungraded mentions first (passage lookup dispatched, Haiku).
- 2026-10-25 (engine-sheet) — engine.314 / 315 LIVE PROD @162 stage 25 (`3109503e`): bench G3 PASS, codex SHIP, guarded push.
- 2026-10-25 (engine-sheet) — engine.314 / 315 opened (builder "Move on the 2 bugs"): live measured, plan section written, one stage.
- 2026-10-25 (engine-sheet) — engine.313 LIVE PROD @161 stage 24 (`3b2de7c5`): codex gate 1 HOLD folded, bench G2 PASS, codex gate 2 SHIP, guarded push.
- 2026-10-24 (engine-sheet) — engine.313 opened: plan section written, codex plan review F1–F4 folded, live measured 0 mismatched.
- 2026-10-23 (engine-sheet) — engine.312 ruled "The paper": fame from published naming, sighting +1, re-base from the record, fading stays, ceiling 100.
- 2026-10-23 (engine-sheet) — engine.312 filed: builder "1 point a sighting", then "Never heard of any of them so the fame score is broken"; live measure recorded under §engine.312.
- 2026-10-22 (engine-sheet) — Task 9 / engine.297 LIVE PROD @159 (stage 22) after the rollout stale check found the codex patch unapplied since 10-17; build notes above.

- 2026-10-17 (research-build) — builder's fame-ledger ruling recorded verbatim → Task 9 / engine.297 (ready; codex builds the patch on "Ask codex"); the two side readings decided at rb as keep-as-is (the builder declined them); codex 2026-10-16 review reconciled and archived.

- 2026-10-16 (engine-sheet) — Tasks 6–7: engine.296 LIVE PROD @143; template rows Inactive on live.

- 2026-10-16 (engine-sheet) — Tasks 1–5 built on main; build notes above (Task 5 ledger fill-ins stay out).

- 2026-10-16 — plan written from the C111 read; three builder rulings recorded verbatim; Tasks 1–7 to es, 8 to rb at C112.
