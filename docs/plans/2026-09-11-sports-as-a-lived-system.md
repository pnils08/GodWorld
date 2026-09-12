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

**F1 — `S.sportsZones` is a constant, not a signal.** `deriveSportsZones_` (applySportsSeason.js) reads **only** `S.baylightOpenings`. It returns the legacy zone list until a franchise moves to Baylight, then the Baylight zone. It never reads the feed. Every downstream consumer — economic ripple, crisis spikes, evening food/famous, `v3NeighborhoodWriter` — is therefore keyed to a static list that does not change when the team plays somewhere, wins, or loses. This is the best-wired sports channel in the engine and the feed cannot reach it.

**F2 — Economically, sports only exists at championship level.** `economicRippleEngine.js:441-452` fires three ripples, all off `cal.sportsSeason` (the *city-wide resolved* phase, so it cannot tell the A's from the Oaks): `CHAMPIONSHIP_BOOM`, `PLAYOFF_SPENDING`, and `SPORTS_CHAMPIONSHIP` on OpeningDay. A 127-win regular season produces **zero** economic ripple. There is no game-day economy.

**F3 — There is no fandom.** All 55 `Simulation_Ledger` columns read; none encodes a relationship to a team. Greps for `fandom|fanAffinity|isFan|fanTier|superfan|casualFan` across `phase*/ lib/ utilities/ scripts/` return no engine concept. Every citizen reacts to a pennant race identically, through one city-wide scalar.

**F4 — Sports is siloed to the sports desk.** Of 20 slice builders in `scripts/`, exactly **five** read the sports feed — `buildHalSlice`, `buildAnthonySlice`, `buildTanyaSlice`, `buildSimonSlice`, `buildPSlayerSlice`. All five are sports voices. Every other lane reads **zero**: transit, economic, economic-food (restaurants), civic-domain, civic-office, safety, health, faith, schools, environment, evening, Nia, Jax. The crossover Mike describes — a transit desk carrying an A's seed, a restaurant slice carrying a game-day seed — has no mechanism. Sports is a vertical that only sports writers can see, which is the media-layer mirror of F1/F2 in the engine layer.

---

## 2. The cadence answer — what a game day is

A cycle is a week and carries ~4-6 authored rows across two franchises. A week is not a game day, and the current engine treats it as neither — it treats it as a *mood*.

**Ruling to build to:** a cycle's sports is a **week of games**, and the engine should derive three things from it, per team:

1. **Intensity** — how much sport happened. Games played this week × phase weight. This is what drives traffic, transit and retail, and it is a *volume*, not a mood. A 7-game homestand and a 1-game week are different cities.
2. **Direction** — how it went. Week record (not season record), which moves sentiment and fan mood up or down.
3. **Stakes** — what it meant. Phase depth (`SPORTS_PHASE_DEPTH_` already exists, 0–6) × record quality. Stakes is what escalates a normal week into an event the city references afterward (§15's chain: start → peak → end → aftermath → referenced).

Home vs away is the game-day switch: `HomeNeighborhood` filled = the crowd is physically here. That column is already 54-100% filled and already reaches transit. It is the existing hook for "what is a game day."

**Consequence for the feed contract:** the tab needs one column it does not have — **games played this week and how many were home**. Everything else needed for intensity can be derived from columns that already exist. This is the one genuine addition; it replaces two dead ones.

---

## 3. What each dead column becomes (Mike's "use it or it goes")

| Column | Today | Proposed | If rejected |
|---|---|---|---|
| `EconomicFootprint` | `ne.retail` (dead) + `ne.traffic` (crowd count only) | the **retail/food multiplier** on game-day hoods — the existing economic-ripple sector list (`entertainment`, `food`, `retail`) already exists at championship level; this is the same mechanism at week scale | delete |
| `CommunityInvestment` | `ne.communityEngagement` (dead) | **youth/community program pressure** in `HomeNeighborhood` — the academy and community-program surfaces already exist; this is the authored signal for whether the franchise is showing up | delete |
| `FranchiseStability` | `ne.retail` (dead) | **business-confidence signal** near the stadium; also the natural driver of relocation/ownership arcs. The one authored column that genuinely varies (Oaks `uncertain` 21 / `stable` 10) | delete |
| `VideoGame` / `VideoGameDate` | marked DEAD by the tab's own validation, still filled 32-45% | **delete outright** — they solicit input and consume nothing | — |
| `PlayerMood` | story hooks only | keep as MEDIA; also the input to **player-citizen** dial movement once the roster is ledger-linked | keep as media |

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

### Task 3 — engine.204 (NEW): feed drives geography
Make `S.sportsZones` reflect where the sport actually was this cycle — union the feed's `HomeNeighborhood` into the derived zone set rather than leaving it a Baylight-only constant. This single change reaches economic ripple, crisis spikes, evening media and the neighborhood writer, all of which are already wired and currently blind to the feed. **Highest reach per line of code in this plan.**

### Task 4 — engine.205 (NEW): the game-day economy
Intensity × stakes drives traffic / retail / transit at week scale, both directions, off the §2 derivation. Retires the championship-only ripple gates as the *only* sports economy (they stay as the top of the scale). Crime enters here or is explicitly ruled out — today it has no sports linkage at all.

### Task 5 — engine.206 (NEW): sports as a crossover seed
Sports stops being a lane and becomes a horizontal. A cycle's sports emits seeds tagged with the lane they land in, not just `SPORTS` — a homestand is a **transit** seed and a **restaurant** seed; a stadium-adjacent hood on a playoff week is an **economic** seed; a franchise-stability wobble is a **civic** seed. Mechanism already exists in two places to copy: engine.190 stamps `domain` on business closures so a closure becomes an ECONOMIC seed the same cycle, and `recordRipple_` already carries `targetScope` / `neighborhood`. The slice builders then read the seed by domain, which is how every other lane already works — no per-slice sports wiring. Depends on Task 3 (geography) so a seed knows where it landed.

### Task 6 — engine.194: reprice sentiment
Only after 1-4. Magnitude is downstream of the contract. Carries the `generateCitizensEvents.js:1707` saturation fix (`min(1,abs(boost)/0.15)`).

### Task 7 — fandom (NOT FILED — needs Mike)
§4 is a design sketch, not a ruling. Sim-class decision: whether fandom is derived-and-drifting per §4, and how hard a fan's week should differ from a non-fan's. Do not build until ruled.

---

## Open questions

1. **Fandom shape and magnitude** — §4, Mike's call (Task 6).
2. **Does sport touch crime?** Game-day crowds, rivalry nights, championship celebrations. Today: zero linkage. Sim call, not a code call.
3. **Two franchises, one city phase.** `cal.sportsSeason` resolves a single city-wide phase, so the economic ripple cannot tell the A's from the Oaks. With the Oaks in preseason and the A's in the playoffs (C106, live), one of them is invisible. Per-team phase already exists (`canonicalSportsPhase_`, `SPORTS_PHASE_DEPTH_`); the question is whether the *city* should carry two phases or a resolved maximum.
4. **Conversational ingest** — Mike's long-term answer to vocabulary compliance is talking to a cron that fills the tab correctly. Parked; §3's in-tab validation is the interim.

---

## Changelog

- 2026-09-11 — Initial draft (S446). Direction captured verbatim from Mike in §0, including the mid-session crossover ruling (sports is a horizontal, every desk can carry an A's seed) which added F4 and Task 5. Measured state in §1 from the research file plus four new traces: `deriveSportsZones_` is Baylight-only (F1), economic ripple is championship-gated and team-blind (F2), no fandom concept exists in 55 ledger columns or anywhere in `phase*/` (F3).
