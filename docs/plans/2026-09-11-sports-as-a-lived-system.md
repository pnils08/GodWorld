---
title: Sports as a lived system — plan
created: 2026-09-11
updated: 2026-09-16
type: plan
status: draft
tags: [plan, engine, sports, ingest, fandom, active]
sources:
  - Mike-direct S446 — the direction block captured verbatim in §0
  - Mike-direct 2026-09-15/16 — reconcile, start engine.210, include Event_Content_Ledger and dial-based event selection
  - "[[../research/2026-09-11-sports-feed-ingest-contract]] — the measure-twice substrate"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.194 / .202 / .203 / .204 / .205 / .206 carry pending state"
  - "[[../SIM_DOCTRINE]] §15 gates that can't fire, §16 columns that never move"
  - "[[../research/index]] — research registration"
  - "[[../index]] — plan registration"
  - "[[plans/2026-07-01-persistence-seams-content-ledger]] — existing Event_Content_Ledger contract"
---

# Sports as a lived system — Plan

**Goal:** The A's and the Oaks become a thing the engine knows about — driving traffic, retail, crime and citizen behaviour off *season stage × record*, with citizens who are fans to differing degrees — instead of a narrative tab that moves one clamped sentiment scalar.

**Architecture:** Three seams, in order. (1) **Cadence** — define what a cycle's worth of sports *is*, since one cycle carries a week and two franchises. (2) **Channels** — route the feed into the engine paths that already exist and already work (`S.sportsZones`, transit, economic ripple, crisis spikes) instead of the one clamped scalar. (3) **Fandom** — give citizens a relationship to the teams, so a game day is something that happens to people and not just to a neighborhood average.

**Implementation:** codex (builder-directed 2026-09-15); engine-sheet reviews and lands substrate changes and owns live deployment.

**Acceptance criteria:**
1. **Mike's test, verbatim:** NotebookLM's daily news stops telling him the data and the lived experience don't align. A cycle where the A's had a big week reads like one in the slices AND in the numbers.
2. The record moves traffic/retail/nightlife in **both** directions, and the downside fires from record + trade news + injuries (§15: a gate that can't fire is a trick).
3. `Casino_Ledger` sports wagers settle — Status leaves `open`, `CycleSettled` populates.
4. A cycle's sports emits seeds in at least three non-sports lanes (transit, economic-food, civic).
5. Author workload goes **down**: two dead columns repurposed to one load-bearing one, `HomeNeighborhood` deleted, every remaining vocabulary visible in the tab.
6. Event_Content_Ledger supplies sports content; recorded context and fandom select who receives it. Signed causal events feed the existing LifeHistory/compressor path and influence later selection.

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
### Rulings, fourth block

- **There is no sports calendar and the engine must not read one.** "That was retired 9 months ago. There are 2 teams — how could a calendar track that? There are no months, just cycles, and my sports don't follow a calendar." RULED. *Verified:* the `Sports_Calendar` tab is genuinely dead — 13 Month-keyed rows, and the only reference in the codebase is a comment recording its removal at S139. **But see F7: the engine still has a `sportsSeason`, and the real problem is worse than a calendar.**
- **Dial 9 is the mechanism for who gets sports events.** Fandom is not just flavour on a citizen — it is the selector. It decides who a sports event happens to.

### Rulings, third block

- **Fandom is DIAL 9.** Not a ledger column — a ninth dial in the existing dial system. "It's a major element of the city with sports and Undocked, and a cron should know how much they like the sports." RULED — supersedes the §4 derived-field sketch.
- **Fandom carries negative drift.** "It becomes another negative drift — if a cron is negative about the team, the dial moves down." The desks' own tone about the franchise feeds back into how much citizens care. RULED.
- **The A's weigh harder than the Oaks, and that weight is a NUMBER ITSELF that drifts.** The A's are a dynasty; the Oaks are an expansion team that has never played a game. Franchise weight is not a constant — it is earned and lost. RULED (§16: a column that never moves is scenery).
- **Open question from Mike:** should the Oaks and the A's live on the same ledger, and is the engine able to use the team-name column effectively in this sheet? — answered in §7.

- **Acceptance criterion, in his words:** when NotebookLM gives him the daily news, it must **stop telling him the data and the lived experience don't align.** That is the test this whole build passes or fails.

---

## 1. Measured starting state

Unless explicitly corrected below, counts and live observations in this section are the historical S446/C106 snapshot. Current Task 0 evidence is local code/test verification, not a fresh live-sheet audit.

Feed volume: **mean 4.4 rows per cycle**, 5–8 in recent cycles (C105 = 8), across two franchises whose seasons rarely overlap in phase. C106: A's `playoffs`, Oaks `preseason`.

What the engine currently does with a cycle of sports:

| Channel | Driven by | Sees the record? | Sees the feed? |
|---|---|---|---|
| City sentiment | record + streak + 2 typed labels, clamped ±0.10 | yes, capped ±0.03 | yes |
| City mood modifiers (`applySportsModifiers_`) | **resolved feed phase only** | **no** | phase only |
| Economic ripple | **`cal.sportsSeason` ∈ {championship, playoffs} + OpeningDay** | **no** | **no** |
| Transit / game-day hoods | current `HomeNeighborhood` plus sports zones; replacement weekly contract unbuilt | no | **yes** |
| Crisis spikes, evening media, neighborhood writer | `S.sportsZones` | no | **no** |
| Crime | playoffs/post-season/championship crisis weighting | **no** | **yes, at those phases** |
| Citizens | `abs(sportsSentimentBoost)/0.15` game-night intensity, city-wide uniform | indirectly | indirectly |

Two structural facts that decide the design:

**F1 — `S.sportsZones` is static, and that part is CORRECT; what is missing is intensity.** `deriveSportsZones_` (applySportsSeason.js) reads **only** `S.baylightOpenings` — the legacy zone list until a franchise moves to Baylight, then the Baylight zone. Every downstream consumer (economic ripple, crisis spikes, evening food/famous, `v3NeighborhoodWriter`, transit, initiatives) keys off it.

*Corrected by Mike, S446:* a stadium does not move, so a static zone set is the right shape and it already tracks the one move that matters (Baylight). The defect is not that geography is static — it is that **nothing varies the intensity driven into it**, and that the effect is confined to the zone when a pennant race is felt city-wide. The fix is magnitude and reach, not per-row geography. `HomeNeighborhood` therefore comes off the tab rather than being wired deeper.

**F2 — Economic ripples are phase-gated, not record-driven.** `economicRippleEngine.js:441-452` fires three ripples, all off `cal.sportsSeason` (the *city-wide resolved* phase, so it cannot tell the A's from the Oaks): `CHAMPIONSHIP_BOOM`, `PLAYOFF_SPENDING`, and `SPORTS_CHAMPIONSHIP` on OpeningDay. A 127-win regular season produces **zero** economic ripple. There is no game-day economy.

**F3 — There is no fandom.** All 55 `Simulation_Ledger` columns read; none encodes a relationship to a team. Greps for `fandom|fanAffinity|isFan|fanTier|superfan|casualFan` across `phase*/ lib/ utilities/ scripts/` return no engine concept. Every citizen reacts to a pennant race identically, through one city-wide scalar.

**F4 — Sports is siloed to the sports desk.** Of 20 slice builders in `scripts/`, exactly **five** read the sports feed — `buildHalSlice`, `buildAnthonySlice`, `buildTanyaSlice`, `buildSimonSlice`, `buildPSlayerSlice`. All five are sports voices. Every other lane reads **zero**: transit, economic, economic-food (restaurants), civic-domain, civic-office, safety, health, faith, schools, environment, evening, Nia, Jax. The crossover Mike describes — a transit desk carrying an A's seed, a restaurant slice carrying a game-day seed — has no mechanism. Sports is a vertical that only sports writers can see, which is the media-layer mirror of F1/F2 in the engine layer.

**F5 — Sports settlement is starved of usable feed input.** `Casino_Ledger` carries 12 live sports wagers (`MarketFamily=sports`, `MarketId=sports:as`, `EventId=next-as`), placed by real citizens (POP-00214, POP-00335, …) at C106. **All 12 are `open` and were placed at C106; being open at C106 is expected and does not prove stalled settlement.**

`casinoResolveSports_` → `casinoParseSports_` (casinoLedgerEngine.js:147) requires a feed row with `EventType='game-result'` **and** a parseable W/L `Streak`, matched to the franchise. The feed carries 33 `game-result` rows across 48 cycles — only 20 with a parseable streak — and **C106 has no A's `game-result` row at all** (the A's last one was C105; before that C95). With no settleable event the resolver returns `carry`, but `processCasinoLedger_` checks expiry first: `CASINO_VOID_AFTER = 3` (:52), gate at :699-701. An unmatched C106 slip carries at C107/C108 and void-gates at C109.

The sparse usable results support the one-row-per-team-per-week ruling: the settlement mechanism is already built, but needs dependable input to resolve wagers before expiry. The C106 snapshot establishes newly placed wagers, not a history of failed settlement. **Measured live S447 (engine-sheet): the feed ALREADY carries the settling input — C107 has three A's `game-result` rows (`W1` rec 1-0, `W1` rec 2-1, `W2` rec 3-1), and `casinoResolveSports_` does not compare the wager's stored `EventId`, so the recorded prediction was that all 12 open C106 slips could settle at the next fire without a feed-contract change. This session has not verified actual settlement/payout rows.** The input is sporadic, not absent — which is still the argument for one row per team per week, but the mechanism is not blocked today. Independently, pricing used the last feed row's record regardless of team; engine.207a now selects the A's own usable current-Cycle record while preserving issued odds and the existing juice fallback (code and tests accepted S447; deployment not reverified here).

**F6 — The dial system can take a ninth dial at no schema cost, and sports barely touches the eight it has.** `DialState` is **ledger column 48** (919 of 930 rows populated) and stores JSON — `{base:{...}, mood:{...}, streak:{...}}` keyed by dial name. **Adding a ninth dial requires no new *column*** — but see §4: it is not free, because `TraitProfile` (col 18) is the same data's readable face and must render the ninth dial too.

The eight today: `drive, sociability, warmth, openness, composure, integrity, family, outabout`.

**Current correction (2026-09-16):** `utilities/citizenDialMap.js:163` now maps plain `Sports` to `{}` under engine.201's plain-day ruling. The older outabout +1 observation is superseded. Task 8 must supply signed, causal sports events; merely receiving sports texture must not restore a blanket dial lift.

The prerequisite census found **seven** identical `DIALS` arrays: `utilities/citizenMemory.js`, `lib/citizenDials.js`, `scripts/classifierGate.js`, `scripts/seedTier1Essence.js`, `scripts/_probe_voice_openrouter.js`, `scripts/_probe_voice_grounded.js`, and `scripts/_probe_classifier.js`. **Consolidation accepted S447 (`0c1fa07b`):** `utilities/citizenMemory.js` remains the single definition, an Apps Script global with its existing guarded CommonJS export. Node consumers import that export; `lib/citizenDials.js` re-exports it and `seedTier1Essence.js` uses that existing import. No dial values, order, or behavior changed.

**F7 — The atmosphere guard also blocks some numeric effects.** The feed already reaches ungated consumers; the guarded readers need separate treatment, not blanket activation. Task 0 records the current audit.

`S.sportsSeason` — not sentiment — is the engine's real sports channel. It is read in **64 files across every phase** (counted, not estimated): crisis spikes, promotions, bonds, nightlife, evening food, migration drift, cycle weight, event prioritisation, civic load, the neighborhood writer, demographics. It dwarfs the ±0.10 sentiment scalar (64 files vs 1 fold).

It is **not** calendar-derived. `applySportsSeason.js:98` sets it from Mike's own feed: `S.sportsSeasonByTeam = deriveSeasonByTeamFromFeed_(entries)` then `S.sportsSeason = deepestSportsPhase_(...)`. Mike's ruling is satisfied on that point — no calendar is read.

**But `applySportsSeason.js:110` then sets `S.sportsAtmosphereEnabled = false` on the feed path**, with the comment: *"feed rows are Mike's game logs, not a license to synthesize city-wide sports mood (S302 C122 'playoffs' contamination)."* The flag is set `true` **only** by a `World_Config` override key `sportsState_Oakland`.

**S446 snapshot:** World_Config had 104 rows and zero sportsState keys. The feed path still sets the flag false in current code; this session has not refreshed live configuration.

At audit, nine consumers gated on it: eight used an empty string, while the generic citizen generator used `off-season`. Task 0 separates numeric effects from dedicated sports prose:

`applySeasonWeights.js:34` · `calendarChaosWeights.js:33` · `buildCityEvents.js:75` · `generateGameModeMicroEvents.js:91` · `runEducationEngine.js:159` · `updateNeighborhoodDemographics.js:97` · `deriveDemographicDrift.js:69` · `applyDemographicDrift.js:123` · `generateGenericCitizenMicroEvent.js:79`

These guarded paths mix weights, population changes and dedicated prose. Seasonal weights also ran before the sports read; chaos weights have no consumer. The full engine is not blind to sports. See Task 0 for the bounded restoration and remaining decisions.

**F8 — The 55 ungated consumers listen for a handful of extreme words.** Counted branch census across `phase*/` — every `sportsSeason === '<word>'` test in the engine:

| value tested | occurrences |
|---|---|
| `championship` | 78 |
| `playoffs` | 60 |
| `post-season` | 27 |
| `late-season` | 16 |
| `off-season` | 2 |
| `world-series` / `regular` | 1 each |

165 of 185 tests (89%) are for championship / playoffs / post-season. A 127-win regular season satisfies none of them. This is §15 at scale: the machinery Mike wants for traffic, retail, nightlife and crime **already exists and is already wired everywhere** — it is gated on two words the feed almost never says.

*(Crime linkage exists: `generateCrisisSpikes.js:191-194` raises SAFETY pressure during championship, playoffs and post-season. Record-driven magnitude remains open.)*

**F9 — `deepestSportsPhase_` takes the MAX of the two franchises.** With per-team phases from the feed, the city-wide value is whichever team is deepest in its season. Live C106: A's `playoffs` (depth 5), Oaks `preseason` (depth 1) → the city reads **`playoffs`**. This is precisely Mike's "one of them is always late in a season" observation, confirmed in code: the resolver guarantees the city sits at the deeper team's phase permanently. It is an always-on shape *and* it erases the other franchise.

---

## 2. The cadence answer — what a game day is

A cycle is a week and carries ~4-6 authored rows across two franchises. A week is not a game day, and the current engine treats it as neither — it treats it as a *mood*.

**Ruling to build to:** a cycle's sports is a **week of games**, and the engine should derive three things from it, per team:

1. **Intensity** — how much sport happened. Games played this week × phase weight. This is what drives traffic, transit and retail, and it is a *volume*, not a mood. A 7-game homestand and a 1-game week are different cities.
2. **Direction** — how it went. Week record (not season record), which moves sentiment and fan mood up or down.
3. **Stakes** — what it meant. Phase depth (`SPORTS_PHASE_DEPTH_` already exists, 0–6) × record quality. Stakes is what escalates a normal week into an event the city references afterward (§15's chain: start → peak → end → aftermath → referenced).

The stadium zone set establishes venue geography. The weekly feed still needs an explicit home/away or home-count contract for game-day intensity; that implementation remains open. `HomeNeighborhood` is not the carrier for it and is removed from authored input.

**Consequence for the feed contract (RULED, Mike S446):** **one row per team per cycle** carrying the week's record and game details, stamped `EventType='game-result'` with a parseable `Streak`. It costs **no new column** — `VideoGame` / `VideoGameDate` are repurposed to hold the week's record, which is also what the Casino reads (F5). `HomeNeighborhood` comes **off** the tab; the stadium's hood is canon, already tracked by `S.sportsZones` through the Baylight move, and does not need re-typing every row.

Net effect on the author's workload: **two dead columns become the one load-bearing column, and one live column is deleted.** Rows per cycle goes from ~4.4 freeform to 2 structured + whatever narrative he wants on top.

---

## 3. What each dead column becomes (Mike's "use it or it goes")

| Column | Today | Proposed | If rejected |
|---|---|---|---|
| `EconomicFootprint` | `ne.retail` (dead) + `ne.traffic` (crowd count only) | the **retail/food multiplier** on game-day hoods — the existing economic-ripple sector list (`entertainment`, `food`, `retail`) already exists at championship level; this is the same mechanism at week scale | delete |
| `CommunityInvestment` | `ne.communityEngagement` (dead) | **youth/community program pressure** in canonical stadium zones and the wider city — the academy and community-program surfaces already exist; this is the authored signal for whether the franchise is showing up | delete |
| `FranchiseStability` | `ne.retail` (dead) | **business-confidence signal** near the stadium; also the natural driver of relocation/ownership arcs. The one authored column that genuinely varies (Oaks `uncertain` 21 / `stable` 10) | delete |
| `VideoGame` / `VideoGameDate` | marked DEAD by the tab's own validation, still filled 32-45% | **RULED: one of them becomes the week's record** — the Casino's dependable weekly input (F5), and the intensity/direction source for §2. The other is deleted | — |
| `PlayerMood` | story hooks only | keep as MEDIA; also the input to **player-citizen** dial movement once the roster is ledger-linked | keep as media |
| `HomeNeighborhood` | transit game-day hoods | **RULED: delete.** Stadium hood is canon, already carried by `S.sportsZones`. Transit reads the zone set instead of a typed column | — |
| trade news / injuries | `roster-move`(22) / `injury`(12) EventTypes, media-only | **the negative drift channel** (RULED). Today the feed has no downside vocabulary that reaches a number — these are it | — |

The rule this encodes: **a column that solicits input either moves a number or it is removed from the tab.** No column exists to be flavour the author can't see is flavour.

---

## 4. Fandom — dial 9 (RULED, Mike S446)

Superseded the derived-field sketch. Fandom is **the ninth dial**, living in the same `DialState` JSON as the other eight (F6 — no schema change, no new column).

**Why a dial and not a field.** A dial already has everything fandom needs and a field has none of it: a 0-100 value with `base`/`mood`/`streak`, a decay model, band-phrase poles the voice layer reads, and — critically — an event→delta map that is *already* the engine's mechanism for "something happened to this person, move them." Fandom as a ledger field would be another static column nobody rewrites (§16). Fandom as a dial drifts by construction.

**Poles (low → high), to be written into `POLES` in `lib/citizenDials.js`:** doesn't follow the teams → keeps half an eye on the scores → a real fan, plans around games → lives and dies with them.

**What moves it UP:** winning stretches, a playoff run, a championship, going to a game (`outabout` correlate), living in a game-day hood, a household member who is already a fan (fandom is inherited — `SpouseId`/`ParentIds`), Undocked engagement.

**What moves it DOWN — the ruling that matters (Mike S446):** losing stretches, trade news that guts the roster, injuries to stars, franchise-stability wobbles, **and the desks' own tone — "if a cron is negative about the team, the dial moves down."** This is the feedback loop the sim has never had: coverage shapes fandom, fandom shapes who the coverage is *about*. It is also the fix for engine.197's exact failure — three of eight dials have no downward vocabulary at all; dial 9 must ship with its negative pole or it repeats that defect on day one.

**Dial 9 and `TraitProfile` — CORRECTED 2026-09-12.** An earlier revision of this plan claimed they were separate layers ("trait seeds, dial drifts"). **That was wrong, asserted from the column name without reading the column.** Mike corrected it; verified against the live ledger:

```
POP-00002 TraitProfile: Archetype:Drifter|drive:50|sociability:55|warmth:49|openness:50|
                        composure:57|integrity:50|family:50|outabout:51|Conduct:b0|...
POP-00002 DialState:    {"base":{"drive":50,"sociability":54.95,"warmth":49.1,"openness":50,
                        "composure":56.85,"integrity":50,"family":50,"outabout":50.675}...
```

Same eight dials, same names, same values — `TraitProfile` is the **rounded readable face of `DialState`**, written by the same engine. `utilities/compressLifeHistory.js` header, verbatim: *"citizen dial engine (engine.31 Phase 2) — scans LifeHistory and ACCRETES it into a per-citizen dial trait profile… the readable face (Archetype + dials + Conduct seam) from `base`."* One writer, one source of truth. They are the same thing in two representations.

**What this changes for dial 9:** the build is larger than the earlier "no schema change" framing implied. A ninth dial must land in **three** places, not one — the `DialState` JSON, the `TraitProfile` renderer in `compressLifeHistory.js` (Archetype/Mods/dial-list/Hash), and the shared `DIALS` source used across seven files (consolidation in F6). Mike's read that this is "a decent size build" is the correct one; the earlier framing understated it.

*(Also observed: the two representations drift. POP-00001 carries `TraitProfile drive:89 Updated:c104` against a live `DialState drive:100` — TraitProfile is a lagging snapshot, refreshed on wake, not a live mirror. Worth a row of its own; not filed yet.)*

**Dial 9 is the SELECTOR (Mike, fourth block).** Its first job is not flavour — it is **deciding who a sports event happens to.** Today sports events are drawn from generic pools with no notion of who cares. With dial 9 the pool is "people who would actually be at this game / arguing about this trade," which is how a city of 930 stops reacting to a pennant race as one undifferentiated blob.

**Why this is load-bearing beyond sports:**
- It is the per-citizen multiplier on every sports effect. Today game-night intensity is one city-wide number (`abs(sportsSentimentBoost)/0.15`); with dial 9 the same pennant race is an event for a big fan and background noise for a non-fan. That difference is what makes a game day happen to *people*.
- It reaches **Undocked** as well as sports — Mike named both. One dial covers a citizen's relationship to the city's spectacle.
- **It is a wake reason for engine.201.** 707 of 930 citizens (76%) can never be woken by a cron because every wake reason is attention-or-neglect, which they all share. A big fan during a playoff week is a wake reason grounded in something that *differs* between citizens and reaches people the current pools never touch.

## 5. Sports as seeds

Currently sports reaches the story layer through `S.sportsEventTriggers` → `storyHook.js` TRIGGER_HOOKS (12 recognized values, 44% of authored triggers land nowhere) and through desk packets. It does **not** produce `Cycle_Seeds` / economic seeds except at championship level.

Target: a week of sports emits seeds the same way a business closure does after engine.190 — intensity and stakes produce `recordRipple_` entries located through canonical `S.sportsZones` and the city-wide component, which become economic and story seeds in the same cycle.

---

## 7. Should the A's and the Oaks share a ledger? (Mike's question, answered)

**Keep one tab. The team column already works; what fails is downstream collapse.**

`normalizeOaklandFeedTeam_` resolves `TeamsUsed` → `A's` | `Oaks` | `NFL` cleanly, and two consumers already honour it: `processFeedSheet_` builds genuine per-team state, and the Casino keys markets per franchise (`sports:as`, `franchiseId` `as`/`oaks`). Separation at the point of entry is **not** the problem.

The problem is that per-team state gets **collapsed** two steps later:
- sentiment is computed per team and then **summed** into one scalar, so a good A's week and a bad Oaks week cancel;
- `cal.sportsSeason` resolves to a **single city-wide phase**, so the economic ripple cannot tell the franchises apart at all (live C106: A's `playoffs`, Oaks `preseason` — one is invisible).

Splitting the tab would double the reader code and fix neither collapse. **Verdict: one tab, and stop collapsing.** Carry per-franchise state through to the consumers that need it.

That also gives Mike's franchise-weight ruling its home: weight is **derived, not authored**, so it does not belong in the feed. `World_Config` holds no sports keys today (104 rows, zero franchise-related) and is the wrong shape anyway — it is config, and this value must drift. The carrier is `Carry_Forward_Store`, which already exists for exactly this: a per-cycle-rewritten derived value.

**What franchise weight is:** how much this city's mood is the team's to move. The A's earned theirs over 100+ cycles of dynasty; the Oaks start near zero because they have never played a game, and climb by playing them. It is the coefficient on every sports effect, per franchise, drifting on results, tenure, and attendance — never a constant, never authored.

---

## Tasks

*Ordered. Each is independently benchable. Task 1 is the prerequisite for 2-5.*

### Task 0 — engine.210: separate recorded effects from atmosphere (DO FIRST)
**Status: DONE (bench-proven) — landed by engine-sheet as `44cf056f`, proven on SANDBOX 0908 @52 at C114.**

**Bench proof (engine-sheet, 2026-09-16, SANDBOX 0908 @52 = `44cf056f`):** the pull-back of the served version is byte-identical to the repo for both changed files. C114 fired `ok:true` in 143.6s, 132 phases, **0 failed phases, `Engine_Errors` empty**. Three expectations were declared before the fire and read back: (1) cycleCount 113 -> 114; (2) the fire response's ordered `timing.timings` puts `Phase2-SportsSeason` at index 8 and `Phase2-SeasonalWeights` at index 9 — the order proven on the deployed run, not only in the repo; (3) `Neighborhood_Map.SportsSeason` reads `playoffs` on 22/22 hoods, so the recorded phase was real at weights time and the `oakland-feed` gate was open. A fourth — no new Baylight opening — **holds by construction and was NOT read back**: `deriveBaylightOpenings_` re-derives from the feed every cycle and opens the A's only on `early-season`, and no sheet column carries `sportsZones`. The full repo suite passes 251/251 test files with the cut in the tree.

The bench needed a phase to gate on: its feed's last row was C107, so an unseeded C114 takes the empty branch (`sportsSource = 'oakland-feed-empty'`), the gate stays shut, and the fire exercises none of the new code. **BENCH-ONLY, NEVER REPLAY:** one `Oakland_Sports_Feed` row at C114 (A's / playoffs / game-result, Notes stamped `S465 BENCH-ONLY engine.210 proof - NEVER REPLAY`) and everything C114 wrote. `playoffs` was chosen because it is not either franchise's Baylight opening phase.

What the bench does **not** prove: that the restored weights changed which events fired. `S.seasonal` is never persisted and one fire has no control arm — that is the 55-of-128-matched-seeds result below, which runs the real engine files in an isolated VM.

Move `Phase2-SportsSeason` before `Phase2-SeasonalWeights` in both Cycle entry paths. `applySeasonalWeights_` accepts the recorded phase when `sportsSource === 'oakland-feed'`, or the existing explicit atmosphere override. Existing coefficients remain unchanged. The feed's `sportsAtmosphereEnabled` remains false. No new state field or Sheet schema. `worldEventsEngine_` consumes the changed `S.seasonal.eventWeight`.

**Local proof (codex, 2026-09-16):** six failures against unchanged engine code; 13/13 cases pass after the two-file cut. In 128 matched synthetic seeds, 55 produce different actual world events from the restored weights. Dedicated playoff/championship atmosphere is absent on feed input; the override positive control produces 33 such events. Existing sports phase, parser (47/47), and team compatibility suites pass. Empty, historical-only, unknown and off-season input preserve baseline weights. This proves local event selection, not live impact or record-driven economics.

**RULED 2026-09-16 (builder accepts recommendation):** restore activity/event weights in engine.210. Defer phase-only employment boosts, the `booming` economic label and residential inflow/outflow changes to the record-driven city-impact work in Tasks 3–4. Keep those existing guards in place; season phase alone does not authorize these effects. This closes the population/economy decision for .210 without claiming all nine consumers are restored.

#### Verified wiring card — engine.210
Haiku cards were requested through `runEngineAgent.js` for the atmosphere and seasonal targets. Codex checked the depended-on pointers below and corrected card errors: filename `applySeasonWeights.js`, generic guard fallback `off-season`, historical rather than current live config counts.

| Surface | Verified pointer |
|---|---|
| Feed phase/source/atmosphere producer | `phase02-world-state/applySportsSeason.js:97-110` |
| Both Cycle calls, now sports before weights | `phase01-config/godWorldEngine2.js:288-289`, `:2037-2038` |
| Weight reader and output | `phase02-world-state/applySeasonWeights.js:30-34`, `:420` |
| Actual event consumer and category arithmetic | `phase04-events/worldEventsEngine.js:60`, `:103-118` |
| Dedicated sports atmosphere remains config-only | `phase04-events/worldEventsEngine.js:95-96`, `:244-249` |
| Existing feed/config safety tests | `scripts/sportsSeasonPhase.test.js:203-232` |
| Behavioral regression | `scripts/sportsRecordedWeights.test.js:1` |

#### Engine.210 findings and decisions

- **Fixed locally — ordering:** seasonal weights could not see current sports. Tests execute the actual phase-call closures from both Cycle paths.
- **Open — dead chaos output:** `phase02-world-state/calendarChaosWeights.js:471` writes `S.chaosCategoryWeights`; no repository consumer reads it. Changing that gate alone restores nothing.
- **Open — unused weight members:** `S.seasonal` has one engine reader at `worldEventsEngine.js:60`. Its sports-dependent `eventWeight` is used, but `sportsWeight`, `nightlifeWeight` and `mediaWeight` are not used in category arithmetic. Do not report those fields as actual nightlife/retail effects; Tasks 3–4 own those channels.
- **Ruled deferral — population/economy:** `applyDemographicDrift.js:306-309,372-373` and `updateNeighborhoodDemographics.js:556-566` contain phase-only boosts and fixed geography. Their guards stay in place during .210; Tasks 3–4 must establish record-driven causes before replacing them.
- **Existing prose paths:** generic athlete activity at `worldEventsEngine.js:141-144`, in-season sports content at `:241-242`, and OpeningDay content already operate independently. This cut preserves dedicated atmosphere guards; it does not claim all sports prose is guarded.
- **Fixed tracker ID:** `scripts/docLoopStatus.js:49` and `scripts/rolloutSweep.js:30` accept an optional single-letter suffix, so `engine.203-D3` was skipped by parsing AND lint. Use `engine.203d`; D3 remains the defect label.
- **Open process defect — inactive hook target:** `.githooks/pre-commit:73` watches `docs/engine/archive/ROLLOUT_PLAN.md`, not the current tracker. No hook edit here. Manual lint still surfaces unrelated pre-existing rows.
- **Fixed S465 — stale semantics block:** `applySportsSeason.js`'s closing docstring still described the engine.131 sentinel ("Feed mode / empty feed: ALWAYS off-season"), directly contradicting what the C114 bench fire showed (22/22 hoods `playoffs` from a feed row). Rewritten to the current three cases plus the invent-prose / move-dial seam.
- **Filed engine.234 — the stub generator reads trailing comments as code:** `scripts/stubEngine.js` scans a file's closing block comment as part of the last function above it, so every `S.x` named in a docstring becomes a read/write edge in `ENGINE_STUB_REVERSE`. `applySportsSeason.js::findColumnIndex_` — which takes `(headers, possibleNames)` and touches no ctx — carried 5 false edges from that block. Cleared by writing the field names unprefixed; the generator's body extractor is the real fix.
- **Observed, not acted on:** with those false edges gone, `S.sportsFeedSeasonType` has ZERO readers in the engine. It is written every feed cycle and consumed by nobody. Candidate for Task 1's wire-or-delete pass.
- **Card reliability:** the first network call failed; the permitted retry succeeded. Generated cards misstated some paths and current-state claims; direct code verification above takes precedence.

### Task 1 — engine.202: wire or delete, and publish the vocabulary
**Status: LANDED, not deployed (engine-sheet, 2026-09-16). Codex's reader/settlement cut reviewed, corrected and committed to the repo. Inert on PROD until the `WeekRecord` header exists. No Sheet migration, no clasp push, no bench fire yet.**

Resolve every dead column per §3. Surface every closed vocabulary into the tab (data validation + legend) so authored effort lands by construction. Repurpose one of `VideoGame` / `VideoGameDate` as the week's record; delete the other. The weekly home/away or home-count contract remains implementation work and does not authorize a new authored column.

#### Weekly contract — first code cut

Repurpose **`VideoGame` to `WeekRecord`** at the later migration; remove `VideoGameDate` and `HomeNeighborhood` once the dependent writers/readers are ready. Final header count is 18. The initial cut recognizes only the explicit new header; it never reinterprets historical `VideoGame` text as results. Existing Sheet headers stay authoritative until migration.

One weekly summary per franchise per Cycle, plus optional narrative rows. `WeekRecord` contains games in played order, separated by spaces: **`H:W H:L A:W`** means a home win, home loss, away win (synthetic syntax example, not a recorded week). From this one authored cell the shared parser derives `2-1`, three games, two home games, one away game, and first result `W`. `Team Record` remains the separate cumulative/current-series record; `Streak` remains the actual ending streak, which can cross a Cycle boundary. Neither is fabricated from the weekly sequence.

- Played games require `EventType=game-result`. An explicit **`none`** reports zero games using `EventType=season-state`, avoiding a fake game-result event. Blank means unreported/supplemental; it does not mean zero.
- The reader rejects malformed input, unknown weekly franchises and duplicate summaries after team normalization — **per cell, never per cycle**: the row stays, its weekly facts are dropped, the rejection lands in `Engine_Errors` (`Phase2-SportsSeason:WeekRecord`, row number included). Case and whitespace normalize; unsupported venues/results and free-text fragments are rejected visibly. Only current-Cycle rows are validated; no historical replay or carry-forward of weekly results.
- The casino uses the **first result inside the weekly summary**, preserving the accepted first-result rule. It does not use majority wins or the ending `Streak`. A weekly summary takes precedence over supplemental rows; explicit no-games carries. With no weekly summary, the existing legacy first-parseable-result path remains.
- Both Apps Script and the Node casino helper use the same pure helper. The parser produces fresh derived objects; the selector retains a read-only reference to its input entry. Neither caller mutates that entry; the regression checks input preservation and outcome parity.
- This cut carries raw normalized `weekRecord` on existing feed entries and consumes it for settlement. It does **not** reprice sentiment, odds, employment, migration, activity intensity or geographic reach. Derived game/home counts become inputs to Tasks 3–4 when those readers are built.

**Review payload:** `output/codex/engine202-week-record.patch` (three gated engine/utility files plus `scripts/casinoLedger.js`), with `scripts/sportsWeekRecord.test.js`. Engine-sheet applies/lands the gated files. Local proposal tree: `/tmp/codex-engine202`; targeted proof: `SPORTS_ENGINE_ROOT=/tmp/codex-engine202 node scripts/sportsWeekRecord.test.js`.

**Local proof (engine-sheet re-run against the REAL repo tree, not `/tmp/codex-engine202`):** 36 cases, 36 pass. Codex reported "35/35"; the real tree carries 36 and one FAILED on arrival — see §Review correction below. All 12 casino/sports suites green after the correction. Cases include actual `processCasinoLedger_` settlement into queued `CycleSettled`/Status/Payout cells, including actual `processCasinoLedger_` settlement into queued `CycleSettled`/Status/Payout cells, issued-odds payout and citizen NetWorth/LifeHistory in isolated synthetic fixtures. Existing parser (47/47), sports phase including T7 reconciliation, team compatibility and both casino suites pass. No live settlement is claimed. The first 32-case regression had 26 failures against unchanged source; the six controls passed.

#### Verified wiring card — engine.202 first cut

The required Haiku run encountered two sandbox connection failures; the network-enabled run reached its turn limit without a finished card. Codex verified the depended-on pointers directly; an agent's claimed scan count is not coverage proof.

| Surface | Verified source pointer before the cut |
|---|---|
| Current-Cycle reader / publication on existing summary | `phase02-world-state/applySportsSeason.js:151`, `:68-70` |
| Both Cycle entry paths / persistence after producers | `phase01-config/godWorldEngine2.js:288`, `:2037`, `:595`, `:2330` |
| Casino feed / first-result reader / outcome | `phase05-citizens/casinoLedgerEngine.js:605`, `:147-164`, `:283-290` |
| Casino posted-odds payout and citizen consequence / queued settlement | `phase05-citizens/casinoLedgerEngine.js:753-785`, `:824-830` |
| Node settlement helper, preserved output shape | `scripts/casinoLedger.js:186-204` |
| Current Sheet setup depends on physical positions | `utilities/setupSportsFeedValidation.js:263-336` |
| Current Node contract and exact-header writer | `scripts/sportsFeedContract.js:8-13`, `:246-277`; `scripts/sportsFeedWriter.js:156-159` |
| Dashboard exact-header check and preview projection | `dashboard/sportsRoutes.js:293-304`, `:876-878` |
| Existing media consumers and independent Phase 10 feed reader | `phase05-citizens/applyGameNightMoments.js:73`; `phase07-evening-media/sportsStreaming.js:35`; `phase10-persistence/compileHandoff.js:1668-1728` |

#### Review correction (engine-sheet, 2026-09-16) — `TeamsUsed='NBA'` is not the Oaks

Codex's suite arrived with one failing case against the real tree: *"weekly legacy team alias
reaches its normalized franchise settlement"* asserted that an `NBA`-tagged weekly row settles an
**Oaks** wager as a win. It does not, and it must not.

**Measured, live feed (`output/beats/Oakland_Sports_Feed.jsonl`, 221 rows):** `A's` 182 | `Oaks` 26 |
`NBA` 8 | blank 5. All eight `NBA` rows are real-NBA canon, not Oakland's franchise — C84 is a
`game-result` reading *"Bulls pull away in the 4th to win 121-105"* (Giddey, Huerter, Curry,
Giannis); C88–C92 are the expansion bid and Paulson's Warriors-GM arc. They **predate the Oaks
existing**: the Oaks' own first `game-result` is C101 (`0-0`), then C105 `L3 0-3`, C106 `L4 0-4`.

Settling an Oaks moneyline off a Chicago Bulls box score is a money-moving error, so the failing
assertion was the defect, not the code. `casinoTeamsMatch_`'s narrowness
(`casinoLedgerEngine.js:137`, `oaks` only) is **correct and was left alone.** Widening it with
nba/warriors aliases was the first fix considered and was reversed on this evidence.

**What was actually wrong:** `normalizeOaklandFeedTeam_` folds `nba|warriors` → `'Oaks'`, so codex's
new duplicate guard let a real-NBA row occupy the Oaks weekly slot — and a genuine Oaks row in the
same Cycle would then throw (see defect 7 below). Fix landed: an optional `strict` second argument
that drops the compatibility fold. **Season derivation is untouched** — all four pre-existing callers
(`:349` `deriveSeasonByTeamFromFeed_`, `:458` `deriveBaylightOpenings_`, `:514`
`deriveActiveSportsFromFeed_`, `:713` `processFeedSheet_`) pass one argument and keep legacy
behavior; only the weekly gate passes `true`. `scripts/applySportsSeasonTeamCompatibility.test.js`
confirms the legacy contract still holds. Two test cases were rewritten to the corrected intent.

**Also verified during review, and *not* defects:** the `var sportsWeeklyResult_ = require(...)`
inside the module guard does **not** clobber the Apps Script global (proven in a `vm` context, both
file load orders); `utilities/` is clasp-pushed while `scripts/` and `**/*.test.js` are ignored, so
the helper reaches Apps Script and the test never does; the Node/Apps-Script return-shape asymmetry
(`entry` vs `teamRecord`) is pre-existing and was preserved correctly on each side; the new
`eventId` shape is write-only — neither resolver compares a wager's stored `EventId`; and the test
harness does fail the build (`process.exitCode = 1`).

#### Remaining Task 1 cuts and discovered defects

1. **Header migration must follow compatible code.** `sportsFeedWriter` and dashboard routes reject any layout except the current 20 columns; `setupFeedSheet_` writes validations/notes by physical position. Removing columns first could put validations on the wrong fields. Prepare header-aware Node projections/preview/write checks, schema documentation and an Oakland-only migration; preserve the Chicago setup contract.
2. **Draft data loss guarded (codex).** `validateDraft` copies only `FEED_HEADERS`, which silently discarded a submitted `WeekRecord`. The interim fix rejects a nonblank weekly field until authoring is enabled; blank optional fields remain compatible. Wire the field through validation and preview as part of migration, then replace the rejection with weekly validation. Do not describe this reader cut as a ready authoring interface.
3. **Vocabulary parity is incomplete.** Sheet setup configures only columns A–O; it provides no dropdowns/notes for FanSentiment through MediaProfile (P–T). Sheet triggers still advertise `trade-deadline`, `all-star`, `draft`, which have no `TRIGGER_HOOKS` entry, and omit the implemented `injury`, `injury-return`, `debut`. Resolve validator/reader parity when publishing the vocabulary, without inventing consequences for unsupported signals.
4. **Game geography is not yet weekly-aware.** `gameDayHoodsFor_` (`updateTransitMetrics.js:666-681`) unions every row's neighborhood with all stadium zones. It does not check home-game counts or franchise-specific activity. Wire the per-franchise venue fact in Tasks 3–4 before treating column deletion as the traffic fix.
5. **Dead-column wording overstates the absence of readers.** Phase 10 still copies `VideoGameDate`/`VideoGame` into handoff entries (`compileHandoff.js:1680-1681,1716-1717`). They have no numeric engine role; schema migration must still update the export. Other media/wake projections must carry the new weekly facts before author entry switches.
6. **The §3 impact destinations still require causal implementation.** EconomicFootprint, CommunityInvestment and FranchiseStability cannot be called wired on the strength of parsed values alone. Their actual sector/community/business readers belong with Tasks 3–4; keep this dependency explicit when sequencing contract preparation and activation.

7. ~~The reader's throw blanks the whole sports channel for the Cycle~~ **RESOLVED (engine-sheet,
   2026-09-16).** `readOaklandFeedEntries_` runs at `applySportsSeason.js:68` before any `S.sports*`
   field is assigned, so a throw there — caught by `safePhaseCall_`, logged to `Engine_Errors` — left
   `S.sportsSeason` (64 readers), `S.sportsZones`, `S.sportsSeasonByTeam` unset for the cycle: one
   authored typo, one error row, a silent city-wide sports blank. Ruling applied: **a bad cell rejects
   the cell, never the cycle.** The weekly block is wrapped; on rejection the row is kept (its
   SeasonType / Streak / Team Record are still recorded facts), only `weekRecord` is dropped, and the
   rejection goes to `Engine_Errors` via `logEngineError_` tagged `Phase2-SportsSeason:WeekRecord`,
   with the row number. Duplicates: the first summary per franchise stands, later ones are rejected.
   The casino then falls back to the legacy first-parseable-`Streak` path for that team. Proven:
   `sportsWeekRecord.test.js` 37/37, including a case where a garbage A's cell sits beside a valid
   Oaks week and season derivation, Oaks settlement and the A's legacy settlement all still fire.
8. ~~nba→Oaks fold in season derivation~~ **RESOLVED by ruling (Mike, 2026-09-16): "it's just A's and
   Oaks now. Bulls/Chicago is strictly canon, not active. NBA was used for the build-up before the
   Oaks story arc began."** `NBA`/`Warriors` are retired labels: `normalizeOaklandFeedTeam_` returns
   `''` for them, silently (`RETIRED_FEED_TEAM_LABELS_`), and the `strict` flag is gone — one
   behavior everywhere. Verified no live effect: `deriveBaylightOpenings_` skips rows ≤ C104 before
   normalizing, and `processFeedSheet_`'s later-rows-win state was already superseded by Oaks rows
   from C101. engine.75 had already recorded this fold injecting phantom sentiment for 10+ cycles.
9. ~~`TEAM_CONFIG.oaks.aliases` on the Node side~~ **RESOLVED, same ruling.** `franchiseAliases`
   (`scripts/casinoLedger.js`) now matches identity only (`id`/`label`/`sheetValue`); the aliases stay
   on `TEAM_CONFIG` solely so `normalizeTeam` can read pre-Oaks history without throwing
   (`legacy: true` + warning — dashboard/projection contract, not money, not engine state).

**Team matching now agrees across all three implementations:** `normalizeOaklandFeedTeam_`,
`casinoTeamsMatch_`, `teamsMatchFranchise` — none treats NBA/Warriors as the Oaks. Consolidation onto
one pushed, Node-requirable source remains Watch List; no longer a correctness gap.

### Task 2 — engine.203: one parser per column
**Status: in-progress — D1 + widened D4 are in repository commit `6b4a8701`; D3 remains unbuilt. Deployment was not reverified this session.** See [[research/2026-09-11-sports-feed-ingest-contract]] §4.

- **D1:** `processFeedSheet_` uses `canonicalSportsPhase_` before sentiment and inferred season triggers. Existing aliases and fail-closed `off-season` behavior are preserved; no vocabulary expansion.
- **D4:** the reducer uses the existing `parseWinPercentage_` to prevent a no-information record from replacing an informative record. Engine-sheet's measured C106 sequence (`127-35`, blank, `0-0`, `0-0`) now retains `127-35`; a lone Oaks `0-0` remains valid with zero base sentiment. Literal `-` acts as blank across all eleven state fields. Published `S.` field shapes are unchanged.
- **engine.203d (D3): ruled decay, not current-Cycle reset.** Inactivity drifts toward the city's baseline across cycles; it neither snaps to zero nor holds stale values. Sequence after engine.210, which benches first and alone.

**Local proof:** `scripts/sportsFeedParser.test.js` has 47 cases: 23 fail against the pre-fix engine and all 47 pass with D1/D4. Coverage includes the measured four-row sequence, genuine 0-0, played 0-3, each dash field, aliases/unknown labels, retained historical carry-forward, and unchanged published output shapes.

**Verified wiring card (S447, engine-wiring/Haiku; no direct writes in the reducer):**

| Surface | File:line |
|---|---|
| Reducer definition; caller | `phase02-world-state/applySportsSeason.js:662`; `phase02-world-state/applySportsSeason.js:598` |
| Shared phase parser; record parser | `phase02-world-state/applySportsSeason.js:296`; `phase02-world-state/applySportsSeason.js:896` |
| Phase 2 position, before Phase 10 | `phase01-config/godWorldEngine2.js:287`, `:2032`; Phase 10 `:588`, `:2319` |
| Caller publishes sentiment / triggers / neighborhood effects | `phase02-world-state/applySportsSeason.js:607`, `:608`, `:609` |
| Sentiment readers | `phase02-world-state/applyCityDynamics.js:1658`; `phase05-citizens/generateCitizensEvents.js:1707` |
| Trigger / neighborhood readers | `phase07-evening-media/storyHook.js:575`; `phase07-evening-media/cityEveningSystems.js:420` |

### Task 3 — engine.204 (REVISED per Mike S446): intensity and reach, not geography
Original scope (union `HomeNeighborhood` into `S.sportsZones`) is **superseded** — the zone set is correctly static and already tracks the Baylight move. New scope: (a) drive a **varying intensity** into the existing zone set from record × season state instead of the current constant; (b) give sports a **city-wide component** so a pennant race is felt outside the stadium hood, with the zone set as the concentration; (c) transit reads the zone set directly so `HomeNeighborhood` can come off the tab. Same seven already-wired consumers benefit — economic ripple, crisis spikes, evening food/famous, `v3NeighborhoodWriter`, transit, initiatives.

### Task 4 — engine.205 (NEW): the game-day economy
Intensity × stakes drives traffic / retail / transit at week scale, both directions, off the §2 derivation. Retires the championship-only ripple gates as the *only* sports economy (they stay as the top of the scale). Postseason safety/crisis linkage already exists. Design the broader record-driven crowd/crime channel here; do not describe it as starting from zero linkage.

**Builder ruling 2026-09-16:** population/employment/economic-label consequences deferred from .210 belong to this record-driven impact work with Task 3. Do not activate the old phase-only boosts as a shortcut. Establish the causal inputs and resulting behavior before changing those guards.

### Task 5 — engine.207 (NEW): unstick the casino
Repurposed `VideoGame`/`VideoGameDate` week-record column feeds `casinoParseSports_` once the weekly feed and settlement contract is defined. The current resolver requires `EventType='game-result'` and a parseable `Streak`; dependable input must reach it before the three-Cycle expiry (`CASINO_VOID_AFTER = 3`), or an unmatched C106 slip void-gates at C109. The 12 C106 slips were newly placed, so their open status does not prove a stall. Engine.207a's team-specific pricing correction is built and accepted S447; deployment not reverified here; the S447 audit established available C107 settling input, not a verified payout result. This session has not re-read those live slips. What the feed contract buys is *dependable* settlement, not settlement at all. **RULED S447 (engine.207b):** the casino reading the first game-result is acceptable for now; all games still reach media/crons. The stored wager `EventId` mismatch remains parked for intake work. Verify actual win/loss settlement, `CycleSettled`, posted-odds payouts, and financial consequences; a void alone is not proof of successful settlement.

### Task 6 — engine.206 (NEW): sports as a crossover seed
Sports stops being a lane and becomes a horizontal. A cycle's sports emits seeds tagged with the lane they land in, not just `SPORTS` — a homestand is a **transit** seed and a **restaurant** seed; a stadium-adjacent hood on a playoff week is an **economic** seed; a franchise-stability wobble is a **civic** seed. Mechanism already exists in two places to copy: engine.190 stamps `domain` on business closures so a closure becomes an ECONOMIC seed the same cycle, and `recordRipple_` already carries `targetScope` / `neighborhood`. The slice builders then read the seed by domain, which is how every other lane already works — no per-slice sports wiring. Depends on Task 3 (geography) so a seed knows where it landed.

### Task 7 — engine.194: reprice sentiment
Only after 1-4. Magnitude is downstream of the contract. Carries the `generateCitizensEvents.js:1707` saturation fix (`min(1,abs(boost)/0.15)`).
**Builder 2026-09-14: folded to codex.** The open sim question on the ROLLOUT row (title magnitude vs the ±0.20 edition / ±0.15 initiative siblings) is decided here as part of the contract work, not posed separately. Owner codex; engine-sheet lands and benches the cut.

Cuts carried from the drained engine.194 row (measured C101–C106, detail in the research doc §1 and §4): mean +0.015 vs a ±0.10 clamp that never fired in 48 cycles; the record term `(winPct-0.5)*0.06` caps at ±0.03 and is the weakest of five factors; `MediaProfile` multiplies everything ×0.8–1.5; postseason zeroes the record so the ×2 playoff multiplier multiplies nothing; resolved phase pays +0.06 flat for late-season vs +0.017 for going 127-35. The cut: record dominant and clamp-reachable; postseason reads the series record with the regular season as earned baseline; off-season decays the final record; MediaProfile stops multiplying the record; reprice `generateCitizensEvents.js:1707` game-night intensity in the same change.

### Task 8 — engine.208 (NEW): dial 9, fandom
RULED by Mike S446. Ships with its negative pole or not at all (engine.197's lesson). **Prerequisite accepted S447 (`0c1fa07b`):** the seven `DIALS` copies now use the existing exported source in `utilities/citizenMemory.js` (F6). Apps Script keeps its global `var`; Node keeps CommonJS imports. Remaining: poles, `DIAL_MAP` entries both directions, inheritance from household, and the cron-tone feedback channel. Verify against engine.197 criterion 4 (a spread, not two blobs) and engine.201 (does it wake citizens the pools never reach).


#### Event_Content_Ledger — sports event content and fandom (builder-directed 2026-09-16)

**Status: ready design work under engine.208; implementation follows recorded franchise context and dial 9.** Extend the existing ledger and composer, with no parallel sports-event library.

**Verified wiring card:** `phase02-world-state/loadEventContentLedger.js:45` accepts `source:sports`; Conditions at `:64-111` include warmth/drive but no fandom or sports context. `generateCitizensEvents.js:955-977` evaluates conditions fail-closed, `:2755-2756` supplies current dial values, `:2904` weights sports through `dm.outabout`, and `:842` routes the primary tag to Sports. `utilities/citizenDialMap.js:163` currently maps plain Sports to `{}` (engine.201: a plain day moves nothing). The Haiku ECL card run exhausted its turn limit without a finished card; codex verified these pointers directly.

Build and acceptance:

1. Supply recorded per-franchise context to the existing condition scopes. Distinguish actual phase/results and home/away where relevant; stadium location cannot establish a home game.
2. Extend loader validation and per-citizen scope evaluation together for fandom. Missing required team/dial context rejects the affected row; unrelated content stays eligible. Choose condition keys in implementation with validator/composer parity.
3. Use fandom for eligibility and draw weighting as appropriate. Prove otherwise-equivalent citizens with different fandom draw different sports-event distributions. Preserve life-state/age/occupation checks and PoolKey balancing.
4. Author positive and negative sports-event content with causal tags that reach LifeHistory → compressor → DialState. Only received causal events move dials; candidate rows and plain sports texture do not. Cover enthusiasm, losses and injury/trade disappointment; poles and magnitudes remain sim decisions.
5. Connect the resulting event to ripples/domain-tagged seeds (Task 6). Prove later-Cycle persistence and changed selection after the dial moves.
6. Synthetic fixtures remain local. Actual content-row authoring/activation is a separately gated Sheet write.

Required implementation card: loader → condition scopes → eligible balanced pool → fandom weighting → received LifeHistory event → signed dial fold → next-Cycle selection. Existing tests: `scripts/contentLedgerLoader.test.js`, `scripts/contentLedgerCompose.test.js`, `scripts/contentLedgerBalance.test.js`.

### Task 9 — engine.209 (NEW): franchise weight that drifts
RULED by Mike S446 — the A's weigh harder than the Oaks and the weight is a number that drifts, not a constant. Derived, never authored; carried in `Carry_Forward_Store` (World_Config is config and holds zero sports keys). Coefficient on every sports effect, per franchise, moving on results, tenure and attendance. Fixes the symmetry artefact where an 0-3 Oaks preseason outweighed a 127-win A's season.

### Task 10 — stop collapsing per-franchise state (§7)
Sentiment sums two franchises into one scalar; `cal.sportsSeason` resolves one city-wide phase so the economic ripple cannot tell them apart. Carry per-franchise state to the consumers that need it. Folds into engine.205; listed separately so it is not lost.

---

## Open questions

1. **Fandom poles and magnitude** — §4 and Task 8. Dial 9 and Event_Content_Ledger integration are directed; exact personal responses remain sim decisions.
2. **Broader crime effects:** postseason safety pressure exists; record-driven crowd consequences remain under Task 4.
3. **Two franchises, one city phase — PARTLY ANSWERED (Mike S446).** `cal.sportsSeason` resolves a single city-wide phase, so the economic ripple cannot tell the A's from the Oaks; live C106 has A's=playoffs, Oaks=preseason and one of them is invisible. Mike's ruling constrains the fix: *with two teams one of them is always late in a season*, so **season state alone can never be the magnitude** — it is permanently "on," the same always-on shape §15 condemns. The record supplies the magnitude; the phase only scales it. Task 10 carries per-franchise state through relevant consumers; the current maximum remains compatibility state.
4. **Conversational ingest** — Mike's long-term answer to vocabulary compliance is talking to a cron that fills the tab correctly. Parked; §3's in-tab validation is the interim. Note the design constraint this sets: the tab is the **instrument he reports a game through**, not a form he completes — which is why repurposing dead columns beats adding new ones.
5. **Population/economy effects — resolved 2026-09-16:** .210 restores activity weights only; population/employment/economic-label changes wait for record-driven impact in Tasks 3–4. Different drifting franchise weights are already ruled in Task 9.

---

## Changelog

- 2026-09-16 (codex) — Guarded legacy draft projection against silently dropping WeekRecord; the new contract regression fails before the guard and passes afterward.

- 2026-09-16 (codex) — Task 1 started: ordered WeekRecord reader/settlement cut prepared with 35 passing cases; header migration and vocabulary defects recorded; engine-sheet review pending.

- 2026-09-16 (codex) — Builder accepted the recommendation: engine.210 restores activity weights; phase-only employment, economic-label and residential migration boosts remain guarded and move to Tasks 3–4's record-driven impact work. Sim ruling closed; engine-sheet landed the first cut as `44cf056f`; sandbox proof remains.

- 2026-09-16 (codex) — Reconciled rulings, geography, casino evidence and task links; registered this plan; corrected tracker ID engine.203d. Engine.210 first two-file cut locally proven (6 failures before, 13/13 after; 55/128 matched event seeds differ), not deployed. Recorded dead readers, stale hook path and card errors. Added Event_Content_Ledger content/selection/dial feedback to Task 8 on builder direction. Population/economy ruling and engine-sheet landing/bench proof remain.

- 2026-09-14 (engine-sheet S459) — engine.194 folded into Task 7 under codex (builder ruling); the magnitude question closes with the contract.
- 2026-09-12 (codex) — engine.203 D1 + widened D4 built locally with 47 passing parser tests (23 fail pre-fix); D3 denied as proposed and deferred after engine.210 pending builder ruling; review pending, no push/deployment.
- 2026-09-12 (codex) — engine.208 prerequisite built locally: consolidated seven DIALS copies onto citizenMemory's existing export, preserving the Apps Script/Node seam; corrected the census and paths; review pending, no deployment.
- 2026-09-12 (engine-sheet S447) — measured live: C107 already carries A's `game-result` W1, so the 12 open slips settle on the next fire; "blocked settlement" retired. Filed engine.207b (pricing reads latest / settlement reads first; three C107 games, one settles; `EventId` never compared) as a SIM call for the builder.
- 2026-09-12 (codex) — engine.207a pricing built and reviewed S447; corrected F5 and Task 5 to distinguish newly placed C106 slips from stalled settlement and document the C109 expiry; weekly settlement remains pending.
- 2026-09-12 — Third ruling block (S446): fandom is DIAL 9 with a negative pole fed by cron tone; franchise weight is a drifting number (A's dynasty vs Oaks expansion); same-ledger question answered in §7 (one tab, stop collapsing). F6 added — DialState is ledger col 48, JSON, so dial 9 costs no schema change; sports' entire dial footprint today is `Sports: {outabout:+1}`. engine.208/.209 filed; §4 rewritten from sketch to ruled design.
- 2026-09-12 — Second ruling block folded in (S446): one row per team per week; `VideoGame`/`VideoGameDate` repurposed to the week record (Casino input); `HomeNeighborhood` deleted; record supplies magnitude, season state only scales it; record/trade-news/injuries carry the negative drift; acceptance criterion set to the NotebookLM data-vs-lived-experience test. F1 corrected (static zones are right, intensity is what is missing), F5 added (casino stuck since it shipped). engine.204 rescoped, engine.207 filed.
- 2026-09-11 — Initial draft (S446). Direction captured verbatim from Mike in §0, including the mid-session crossover ruling (sports is a horizontal, every desk can carry an A's seed) which added F4 and Task 5. Measured state in §1 from the research file plus four new traces: `deriveSportsZones_` is Baylight-only (F1), economic ripple is championship-gated and team-blind (F2), no fandom concept exists in 55 ledger columns or anywhere in `phase*/` (F3).
