---
title: Sports as a lived system — plan
created: 2026-09-11
updated: 2026-09-11
type: plan
status: draft
tags: [plan, engine, sports, ingest, fandom, active]
sources:
  - Mike-direct S446 — the direction block captured verbatim in §0
  - "[[../research/2026-09-11-sports-feed-ingest-contract]] — the measure-twice substrate"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.194 / .202 / .203 / .204 / .205 / .206 carry pending state"
  - "[[../SIM_DOCTRINE]] §15 gates that can't fire, §16 columns that never move"
  - "[[../research/index]] — research registration"
---

# Sports as a lived system — Plan

**Goal:** The A's and the Oaks become a thing the engine knows about — driving traffic, retail, crime and citizen behaviour off *season stage × record*, with citizens who are fans to differing degrees — instead of a narrative tab that moves one clamped sentiment scalar.

**Architecture:** Three seams, in order. (1) **Cadence** — define what a cycle's worth of sports *is*, since one cycle carries a week and two franchises. (2) **Channels** — route the feed into the engine paths that already exist and already work (`S.sportsZones`, transit, economic ripple, crisis spikes) instead of the one clamped scalar. (3) **Fandom** — give citizens a relationship to the teams, so a game day is something that happens to people and not just to a neighborhood average.

**Terminal:** engine/sheet

**Acceptance criteria:**
1. **Mike's test, verbatim:** NotebookLM's daily news stops telling him the data and the lived experience don't align. A cycle where the A's had a big week reads like one in the slices AND in the numbers.
2. The record moves traffic/retail/nightlife in **both** directions, and the downside fires from record + trade news + injuries (§15: a gate that can't fire is a trick).
3. `Casino_Ledger` sports wagers settle — Status leaves `open`, `CycleSettled` populates.
4. A cycle's sports emits seeds in at least three non-sports lanes (transit, economic-food, civic).
5. Author workload goes **down**: two dead columns repurposed to one load-bearing one, `HomeNeighborhood` deleted, every remaining vocabulary visible in the tab.

---

## 0. The direction (Mike-direct, S446 — verbatim intent, do not re-litigate)

- **The trick is: what is a game day, and what drives traffic?** The cycle fires once a week and a week of lore plus data for two franchises gets packed into it. That has to be answered before anything is repriced.
- **Season stage mixed with the record should increase and decrease traffic.** Both directions. Not sentiment alone.
- **The dead / unread columns need to be utilized.** He is adding elements that tell the story — either they land somewhere real, or they go. No third option.
- **The Dashboard already has a system, but it is not as user-friendly as typing into a sheet.** Sheet entry stays for now.
- **Long term: he talks to a cron that completes the entry, so the data is entered properly.** Conversational ingest replaces hand-typed vocabulary compliance. Long-term, not this build.
- **How do sports entries land as actual seeds?**
- **How can citizens be big fans or casual fans?**
- **The A's are a CROSSOVER, not a lane.** Every desk slice covers its own beat, but sports cuts across all of them — the transit desk can carry an A's seed in its slice, so can civic, so can restaurants. Sports is a horizontal, not a vertical.
- **"This is one of the biggest elements of the sim and nothing in the engine knows it exists. The media does and the crons do, but it just never was properly aligned."**

### Rulings, second block (same session, after the measured state was shown)

- **One row per team per week, carrying the week's record and game details.** This is the cadence answer, accepted from the author's side. RULED.
- **No new column — repurpose a dead one.** `VideoGame` or `VideoGameDate` becomes the week's record. **This is what the Casino reads.** RULED.
- **`HomeNeighborhood` is unnecessary and comes off the tab.** The stadiums are already in a hood — that is a fact of the world, not a per-row authored variable. And sports is substantial enough that **the entire city feels the impact**, not just the stadium's hood. RULED — supersedes the §2 draft, which had the author typing geography every row.
- **Nightlife and retail rise with season state, but the magnitude must come from the RECORD.** With two franchises, one of them is always late in a season, so season state alone is permanently "on" — the same §15 always-on shape. RULED.
- **The negative drift is carried by record, trade news and injuries.** Those are the downside vocabulary; there is no adversity channel without them. RULED.
- **The author is the engine's sensor.** "As I'm playing this out on my end you should use me for this to tell the engine what's happening, what's the excitement." The feed is the interface between a game being played outside the sim and the city inside it — design it as an instrument he reports through, not a form he fills.
- **Acceptance criterion, in his words:** when NotebookLM gives him the daily news, it must **stop telling him the data and the lived experience don't align.** That is the test this whole build passes or fails.

---

## 1. Measured starting state

Feed volume: **mean 4.4 rows per cycle**, 5–8 in recent cycles (C105 = 8), across two franchises whose seasons rarely overlap in phase. C106: A's `playoffs`, Oaks `preseason`.

What the engine currently does with a cycle of sports:

| Channel | Driven by | Sees the record? | Sees the feed? |
|---|---|---|---|
| City sentiment | record + streak + 2 typed labels, clamped ±0.10 | yes, capped ±0.03 | yes |
| City mood modifiers (`applySportsModifiers_`) | **calendar phase only** | **no** | phase only |
| Economic ripple | **`cal.sportsSeason` ∈ {championship, playoffs} + OpeningDay** | **no** | **no** |
| Transit / game-day hoods | `HomeNeighborhood` ∪ `S.sportsZones` | no | **yes** |
| Crisis spikes, evening media, neighborhood writer | `S.sportsZones` | no | **no** |
| Crime | — | **no** | **no** |
| Citizens | `abs(sportsSentimentBoost)/0.15` game-night intensity, city-wide uniform | indirectly | indirectly |

Two structural facts that decide the design:

**F1 — `S.sportsZones` is static, and that part is CORRECT; what is missing is intensity.** `deriveSportsZones_` (applySportsSeason.js) reads **only** `S.baylightOpenings` — the legacy zone list until a franchise moves to Baylight, then the Baylight zone. Every downstream consumer (economic ripple, crisis spikes, evening food/famous, `v3NeighborhoodWriter`, transit, initiatives) keys off it.

*Corrected by Mike, S446:* a stadium does not move, so a static zone set is the right shape and it already tracks the one move that matters (Baylight). The defect is not that geography is static — it is that **nothing varies the intensity driven into it**, and that the effect is confined to the zone when a pennant race is felt city-wide. The fix is magnitude and reach, not per-row geography. `HomeNeighborhood` therefore comes off the tab rather than being wired deeper.

**F2 — Economically, sports only exists at championship level.** `economicRippleEngine.js:441-452` fires three ripples, all off `cal.sportsSeason` (the *city-wide resolved* phase, so it cannot tell the A's from the Oaks): `CHAMPIONSHIP_BOOM`, `PLAYOFF_SPENDING`, and `SPORTS_CHAMPIONSHIP` on OpeningDay. A 127-win regular season produces **zero** economic ripple. There is no game-day economy.

**F3 — There is no fandom.** All 55 `Simulation_Ledger` columns read; none encodes a relationship to a team. Greps for `fandom|fanAffinity|isFan|fanTier|superfan|casualFan` across `phase*/ lib/ utilities/ scripts/` return no engine concept. Every citizen reacts to a pennant race identically, through one city-wide scalar.

**F4 — Sports is siloed to the sports desk.** Of 20 slice builders in `scripts/`, exactly **five** read the sports feed — `buildHalSlice`, `buildAnthonySlice`, `buildTanyaSlice`, `buildSimonSlice`, `buildPSlayerSlice`. All five are sports voices. Every other lane reads **zero**: transit, economic, economic-food (restaurants), civic-domain, civic-office, safety, health, faith, schools, environment, evening, Nia, Jax. The crossover Mike describes — a transit desk carrying an A's seed, a restaurant slice carrying a game-day seed — has no mechanism. Sports is a vertical that only sports writers can see, which is the media-layer mirror of F1/F2 in the engine layer.

**F5 — The casino already bets on the A's and can never settle.** `Casino_Ledger` carries 12 live sports wagers (`MarketFamily=sports`, `MarketId=sports:as`, `EventId=next-as`), placed by real citizens (POP-00214, POP-00335, …) at C106. **All 12 are `open`. None has ever settled.**

`casinoResolveSports_` → `casinoParseSports_` (casinoLedgerEngine.js:147) requires a feed row with `EventType='game-result'` **and** a parseable W/L `Streak`, matched to the franchise. The feed carries 33 `game-result` rows across 48 cycles — only 20 with a parseable streak — and **C106 has no A's `game-result` row at all** (the A's last one was C105; before that C95). With no settleable event the resolver returns `carry`, forever.

This is the strongest single argument for the one-row-per-team-per-week ruling: it is not a new mechanism, it is the **missing input to a mechanism that is already built, already placed real citizens' money, and has been silently stuck since it shipped.**

---

## 2. The cadence answer — what a game day is

A cycle is a week and carries ~4-6 authored rows across two franchises. A week is not a game day, and the current engine treats it as neither — it treats it as a *mood*.

**Ruling to build to:** a cycle's sports is a **week of games**, and the engine should derive three things from it, per team:

1. **Intensity** — how much sport happened. Games played this week × phase weight. This is what drives traffic, transit and retail, and it is a *volume*, not a mood. A 7-game homestand and a 1-game week are different cities.
2. **Direction** — how it went. Week record (not season record), which moves sentiment and fan mood up or down.
3. **Stakes** — what it meant. Phase depth (`SPORTS_PHASE_DEPTH_` already exists, 0–6) × record quality. Stakes is what escalates a normal week into an event the city references afterward (§15's chain: start → peak → end → aftermath → referenced).

Home vs away is the game-day switch: `HomeNeighborhood` filled = the crowd is physically here. That column is already 54-100% filled and already reaches transit. It is the existing hook for "what is a game day."

**Consequence for the feed contract (RULED, Mike S446):** **one row per team per cycle** carrying the week's record and game details, stamped `EventType='game-result'` with a parseable `Streak`. It costs **no new column** — `VideoGame` / `VideoGameDate` are repurposed to hold the week's record, which is also what the Casino reads (F5). `HomeNeighborhood` comes **off** the tab; the stadium's hood is canon, already tracked by `S.sportsZones` through the Baylight move, and does not need re-typing every row.

Net effect on the author's workload: **two dead columns become the one load-bearing column, and one live column is deleted.** Rows per cycle goes from ~4.4 freeform to 2 structured + whatever narrative he wants on top.

---

## 3. What each dead column becomes (Mike's "use it or it goes")

| Column | Today | Proposed | If rejected |
|---|---|---|---|
| `EconomicFootprint` | `ne.retail` (dead) + `ne.traffic` (crowd count only) | the **retail/food multiplier** on game-day hoods — the existing economic-ripple sector list (`entertainment`, `food`, `retail`) already exists at championship level; this is the same mechanism at week scale | delete |
| `CommunityInvestment` | `ne.communityEngagement` (dead) | **youth/community program pressure** in `HomeNeighborhood` — the academy and community-program surfaces already exist; this is the authored signal for whether the franchise is showing up | delete |
| `FranchiseStability` | `ne.retail` (dead) | **business-confidence signal** near the stadium; also the natural driver of relocation/ownership arcs. The one authored column that genuinely varies (Oaks `uncertain` 21 / `stable` 10) | delete |
| `VideoGame` / `VideoGameDate` | marked DEAD by the tab's own validation, still filled 32-45% | **RULED: one of them becomes the week's record** — the Casino's missing input (F5), and the intensity/direction source for §2. The other is deleted | — |
| `PlayerMood` | story hooks only | keep as MEDIA; also the input to **player-citizen** dial movement once the roster is ledger-linked | keep as media |
| `HomeNeighborhood` | transit game-day hoods | **RULED: delete.** Stadium hood is canon, already carried by `S.sportsZones`. Transit reads the zone set instead of a typed column | — |
| trade news / injuries | `roster-move`(22) / `injury`(12) EventTypes, media-only | **the negative drift channel** (RULED). Today the feed has no downside vocabulary that reaches a number — these are it | — |

The rule this encodes: **a column that solicits input either moves a number or it is removed from the tab.** No column exists to be flavour the author can't see is flavour.

---

## 4. Fandom — the missing layer

The design question Mike asked: *how can citizens be big fans or casual fans?*

**Constraint from the ledger:** 930 rows, no free column, and §16 says a static backfill nothing rewrites is scenery. Fandom must be a *drifting* value with causal inputs, not a one-time dice roll.

**Shape to build to:**

- Fandom is **derived, not stored flat** — from inputs the ledger already carries: `Neighborhood` (proximity to the stadium / game-day hoods), `TraitProfile`, `EmployerBizId` (stadium-adjacent employers), household (`SpouseId`, `ParentIds` — fandom is inherited), and accumulated exposure.
- It **drifts**: winning seasons recruit casual fans; a losing stretch or a relocation scare sheds them. That is the §16 requirement and it is also the sim answer — a bandwagon is a real thing a city does.
- It is **the multiplier on every citizen-facing sports effect.** Today game-night intensity is one city-wide number (`abs(boost)/0.15`). With fandom it becomes per-citizen: the same pennant race is an event for a big fan, background noise for a non-fan, and that difference is what makes a game day *happen to people*.
- It is **a reason to wake a citizen** — which is directly the engine.201 problem. 707 of 930 citizens (76%) can never be woken by a cron. A big fan on a playoff week is a wake reason that has nothing to do with attention or neglect, and it reaches citizens the current pools never touch.

**This is the seam that makes sports load-bearing rather than decorative, and it is the one Mike named as missing.**

---

## 5. Sports as seeds

Currently sports reaches the story layer through `S.sportsEventTriggers` → `storyHook.js` TRIGGER_HOOKS (12 recognized values, 44% of authored triggers land nowhere) and through desk packets. It does **not** produce `Cycle_Seeds` / economic seeds except at championship level.

Target: a week of sports emits seeds the same way a business closure does after engine.190 — intensity and stakes produce `recordRipple_` entries with real geography (`HomeNeighborhood`, not the static zone list), which become economic and story seeds in the same cycle.

---

## Tasks

*Ordered. Each is independently benchable. Task 1 is the prerequisite for 2-5.*

### Task 1 — engine.202: wire or delete, and publish the vocabulary
Resolve every dead column per §3. Surface every closed vocabulary into the tab (data validation + legend) so authored effort lands by construction. Add the games-played/home-count column from §2. Delete `VideoGame` / `VideoGameDate`.

### Task 2 — engine.203: one parser per column
D1 (two SeasonType vocabularies), D3 (field carry-forward never expires), D4 (`-` is truthy). See the research file §4.

### Task 3 — engine.204 (REVISED per Mike S446): intensity and reach, not geography
Original scope (union `HomeNeighborhood` into `S.sportsZones`) is **superseded** — the zone set is correctly static and already tracks the Baylight move. New scope: (a) drive a **varying intensity** into the existing zone set from record × season state instead of the current constant; (b) give sports a **city-wide component** so a pennant race is felt outside the stadium hood, with the zone set as the concentration; (c) transit reads the zone set directly so `HomeNeighborhood` can come off the tab. Same seven already-wired consumers benefit — economic ripple, crisis spikes, evening food/famous, `v3NeighborhoodWriter`, transit, initiatives.

### Task 4 — engine.205 (NEW): the game-day economy
Intensity × stakes drives traffic / retail / transit at week scale, both directions, off the §2 derivation. Retires the championship-only ripple gates as the *only* sports economy (they stay as the top of the scale). Crime enters here or is explicitly ruled out — today it has no sports linkage at all.

### Task 5 — engine.207 (NEW): unstick the casino
Repurposed `VideoGame`/`VideoGameDate` week-record column feeds `casinoParseSports_`. Ensure the one-row-per-team-per-week row is stamped `EventType='game-result'` with a parseable `Streak`, so the 12 open wagers settle and the market stops carrying forever. Cheapest task in the plan and the only one with citizens' money already on the table. Verify: `Casino_Ledger` Status flips off `open`, `CycleSettled` populates, `HouseFloatAfter` moves.

### Task 6 — engine.206 (NEW): sports as a crossover seed
Sports stops being a lane and becomes a horizontal. A cycle's sports emits seeds tagged with the lane they land in, not just `SPORTS` — a homestand is a **transit** seed and a **restaurant** seed; a stadium-adjacent hood on a playoff week is an **economic** seed; a franchise-stability wobble is a **civic** seed. Mechanism already exists in two places to copy: engine.190 stamps `domain` on business closures so a closure becomes an ECONOMIC seed the same cycle, and `recordRipple_` already carries `targetScope` / `neighborhood`. The slice builders then read the seed by domain, which is how every other lane already works — no per-slice sports wiring. Depends on Task 3 (geography) so a seed knows where it landed.

### Task 7 — engine.194: reprice sentiment
Only after 1-4. Magnitude is downstream of the contract. Carries the `generateCitizensEvents.js:1707` saturation fix (`min(1,abs(boost)/0.15)`).

### Task 8 — fandom (NOT FILED — needs Mike)
§4 is a design sketch, not a ruling. Sim-class decision: whether fandom is derived-and-drifting per §4, and how hard a fan's week should differ from a non-fan's. Do not build until ruled.

---

## Open questions

1. **Fandom shape and magnitude** — §4, Mike's call (Task 6).
2. **Does sport touch crime?** Game-day crowds, rivalry nights, championship celebrations. Today: zero linkage. Sim call, not a code call.
3. **Two franchises, one city phase — PARTLY ANSWERED (Mike S446).** `cal.sportsSeason` resolves a single city-wide phase, so the economic ripple cannot tell the A's from the Oaks; live C106 has A's=playoffs, Oaks=preseason and one of them is invisible. Mike's ruling constrains the fix: *with two teams one of them is always late in a season*, so **season state alone can never be the magnitude** — it is permanently "on," the same always-on shape §15 condemns. The record supplies the magnitude; the phase only scales it. Remaining question is mechanical: whether the city carries two phases or a resolved maximum.
4. **Conversational ingest** — Mike's long-term answer to vocabulary compliance is talking to a cron that fills the tab correctly. Parked; §3's in-tab validation is the interim. Note the design constraint this sets: the tab is the **instrument he reports a game through**, not a form he completes — which is why repurposing dead columns beats adding new ones.
5. **Does the Oaks' week matter as much as the A's?** The A's are the heart of the city (Mike-direct); the Oaks are an expansion team in preseason. Today the formula treats them symmetrically, which is how a 0-3 Oaks preseason outweighed a 127-win A's season. Whether the two franchises should carry different weight is a sim call.

---

## Changelog

- 2026-09-12 — Second ruling block folded in (S446): one row per team per week; `VideoGame`/`VideoGameDate` repurposed to the week record (Casino input); `HomeNeighborhood` deleted; record supplies magnitude, season state only scales it; record/trade-news/injuries carry the negative drift; acceptance criterion set to the NotebookLM data-vs-lived-experience test. F1 corrected (static zones are right, intensity is what is missing), F5 added (casino stuck since it shipped). engine.204 rescoped, engine.207 filed.
- 2026-09-11 — Initial draft (S446). Direction captured verbatim from Mike in §0, including the mid-session crossover ruling (sports is a horizontal, every desk can carry an A's seed) which added F4 and Task 5. Measured state in §1 from the research file plus four new traces: `deriveSportsZones_` is Baylight-only (F1), economic ripple is championship-gated and team-blind (F2), no fandom concept exists in 55 ledger columns or anywhere in `phase*/` (F3).
