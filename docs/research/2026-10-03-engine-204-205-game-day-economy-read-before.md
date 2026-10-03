---
title: engine.204 / engine.205 — intensity, reach and the game-day economy: read-before and proposed cut
status: build-ready — four sim calls ruled 2026-10-03
owner: research-build (draft); engine-sheet (build, bench, deploy)
parent: [[../plans/2026-09-11-sports-as-a-lived-system]] Tasks 3, 4, 10
related: [[2026-09-18-sports-intensity-and-game-day-economy]] (the census and formulas this builds on), [[2026-10-02-engine-208-fandom-dial-read-before]] (the citizen side; shares the week object), [[../plans/2026-07-05-game-night-connection-design]] Task 3 (Hop 6, folded here)
---

# engine.204 / engine.205 — intensity, reach and the game-day economy: read-before and proposed cut

Everything in §1 was read from code or the beats mirror on 2026-10-03 (mirror pulled at C109; the C110 feed rows are the ones typed so far). §0 quotes the rulings verbatim and states the reading this draft builds on. §2 is the mechanism (builder's lane). §3 draws the seams with the sibling rows. §4 is the short list that is a sim call. Nothing here re-opens a ruling in the parent plan §0 or the research §6 rulings.

## 0. What is already ruled — verbatim, and how this draft reads it

1. **"One row per team per week, carrying the week's record and game details."** (second block) — and the builder's 2026-09-26 amendment, recorded in `68298f98`: *per-game WeekRecord rows fold in row order into one week.* **Reading:** the week is the folded `WeekRecord` per franchise — games, wins, losses, home, away — one object per team per Cycle. The authored tokens already carry home/away (`H:W`, `A:L`).
2. **"`HomeNeighborhood` is unnecessary and comes off the tab. The stadiums are already in a hood — that is a fact of the world, not a per-row authored variable. And sports is substantial enough that the entire city feels the impact, not just the stadium's hood."** (second block) **Reading:** no consumer reads the typed hood; the venue is `S.sportsZones`; every game week has a city-wide share as well as a venue share.
3. **"Nightlife and retail rise with season state, but the magnitude must come from the RECORD."** and **"The negative drift is carried by record, trade news and injuries."** (second block) **Reading:** the phase is a scale, never a magnitude. Every numeric site that fires on a phase word converts to a record-driven number. A bad week is a negative number, not a smaller positive one.
4. **Q1 "a week without games does not move the city."** **Q2 "Crowd, traffic and transit follow game volume at the venue, unsigned. Retail, nightlife and sentiment follow the result, signed."** **Q3 "judge each team against its own expectation. The A's against the dynasty norm; the Oaks against an expansion team's inaugural season."** **Q4 "each playoff round casts a bigger net; by the championship the whole city buys in."** (fifth block, 2026-09-19) **Readings:** Q1 — no games means intensity 0; the lens is still published for the crons' buzz. Q2 — volume channels are unsigned and land at the venue; result channels are signed and land city-wide. *A losing week does not thin the crowd* — settled by Q2, not re-asked. Q3 — the surprise against the franchise's own expectation is what moves the signed channels. Q4 — reach is a per-round number that reaches 1.0 at the championship.
5. **"The last A's entry and the last Oaks entry of the Cycle set the sim's lens of each team's season state. … The builder controls the phase by what the last row says, as at C108 (`championship` → `playoffs`)."** (sixth block, to engine-sheet) **Reading:** stakes come from the lens (the last entry); volume comes from the folded `WeekRecord`. This wins over the research §6 recorded consequence ("the week's phase for engine magnitude is the round its games were played in"), which was a consequence, never a ruling — the 208 read-before closed it the same way. Worked case at §1.2.
6. **Builder 2026-09-16: "population/employment/economic-label consequences deferred from .210 belong to this record-driven impact work with Task 3. Do not activate the old phase-only boosts as a shortcut. Establish the causal inputs and resulting behavior before changing those guards."** **Reading:** the three ungated copies in `updateWorldPopulation_` (§1.4) convert to the record-driven number in this build; nothing in them is switched on as it stands.
7. **"There is no sports calendar and the engine must not read one."** (fourth block) **Reading:** `applyShockMonitor`'s `simMonth` branch goes (§1.4, still live).
8. **"The A's weigh harder than the Oaks, and that weight is a NUMBER ITSELF that drifts."** (third block; engine.209) **Reading:** this build reads the weight from `Carry_Forward_Store` at an authored start value; engine.209 makes it drift. Start values are §4(ii).
9. **Builder 2026-09-28: engine.47 Hop 6 (bars fill) folds into engine.205.** The spec is the game-night plan Task 3; §2.4 folds it with the signed result as the magnitude instead of `sportsSentimentBoost`.
10. **engine.208 rulings that touch this seam** (2026-10-02 23:29 and the 01:25 amendment): athletes and fans get life events from the week — those are 208's lines, not this build's. 208 §2.7 names the Q3 expectation baseline as a prerequisite *nothing computes*. **Reading:** one per-franchise week object, built here in Phase 2, carries the expectation and the surprise; 208's `Sports-Win` / `Sports-Loss` read its sign. One baseline, not two (§3).

## 1. Measured state, 2026-10-03

### 1.1 The feed — the week object already half-exists

| Surface | File:line | Finding |
|---|---|---|
| Token grammar | `utilities/sportsWeekRecord.js:7` `parseSportsWeekRecord_` | `H:W H:L A:W …` or `none`. Returns `games[]`, `wins`, `losses`, `gamesPlayed`, `homeGames`, `awayGames`, `firstResult`. **Home/away is known per game** since engine.202 — the research's "only `WeekRecord` knows *h* — today nothing does" is half-resolved: the parser knows, no cycle-path consumer reads it. |
| Fold | `applySportsSeason.js:227-258` | Several game rows for one franchise fold in row order into the first row's week (`foldSportsWeeks_`). A blank `WeekRecord` cell is **neither folded nor rejected** — the row stays an entry (its `SeasonType` still sets the lens). A bad cell rejects the cell to `Engine_Errors`, never the Cycle. |
| Who reads the week | `casinoLedgerEngine.js:152` via `sportsWeeklyResult_` (`sportsWeekRecord.js:57`) | **The casino is the only reader**, and it reads `firstResult` only. `gamesPlayed` / `homeGames` / `wins` / `losses` reach nothing in the cycle path (`grep weekRecord\|homeGames\|gamesPlayed` over `phase*/ utilities/ lib/`: parser, reader, casino, `compileHandoff.js:1530` prose, contract/preflight scripts — nothing else). |
| Typed so far | beats mirror, C101–C110 | **C101–C108: 47 rows, 3 `WeekRecord` cells** (all C108: one A's `game-result` `H:W`; an A's `season-state` `A:W`, which `sportsWeekForEntry_` rejects — games require `game-result`; an Oaks `game-result` `A:L`). There is no home/away history before C109 (research §Hazard): the research's C101–C108 K1 numbers are a `Team Record` proxy, not a replayable week. C109 A's `H:W` `H:L` `A:W` (3 games, 2 home, 2-1); Oaks `H:L` `A:L` (0-2, L7). **C110 A's `A:W` `A:W`** on two `playoffs` `game-result` rows, then a third `game-result` row typed `championship`, `Team Record` 11-3, **`WeekRecord` blank**. |

### 1.2 Phase and the lens — the C110 worked case

- `deriveSeasonByTeamFromFeed_` (`applySportsSeason.js:417`): the later row wins per team — the lens. `deepestSportsPhase_` (`:444`) takes the MAX across teams for `S.sportsSeason`. **`S.sportsSeasonByTeam` still has zero readers outside the file** (unchanged since 09-18).
- **C110 as typed today:** the A's week folds to `A:W A:W` — 2 games, 0 home, 2-0. The third row (blank `WeekRecord`) sets the lens to `championship` and folds nothing. The casino settles on `W`. No Oaks row yet. (Live practice, es 2026-10-03: World Series games are typed `playoffs`; only the clinch is `championship` — so `championship` as a lens is the title moment, and the round words from 208 ruling iii alias to `playoffs` for the `S.sportsSeason` label while the raw word rides on as `lens`.)
- **C108 on the mirror** (not the research's §1.7 expectation, which was written before the championship row was retyped for C109): every A's row reads `playoffs`; the only accepted `WeekRecord` is one `H:W`. Today's code ran C108 as `playoffs`, correctly (engine.210 row).
- **What today's code does with that at the fire:** `S.sportsSeason` = `championship`, so every championship branch fires on the word with two away ALCS wins behind it — `CHAMPIONSHIP_BOOM` impact 15 ×1.5 at the sports zones (`economicRippleEngine.js:463-466`, `:671`), migration `+rng×60`, employment `+0.001`, economy label → `booming` (`godWorldEngine2.js:1284`, `:1186`, `:1335`), crisis crowd weight, bonds, evening crowd JL +4, and transit "game day" on **Eastlake** (typed `HomeNeighborhood` on all three rows) ∪ the zones.
- **What the cut does with it (§2.1 numbers):** A's volume `vol(2)` = 0.49 × stakes 1.0 × weight 1.0 → unsigned 0.49; surprise against a dynasty prior of .750 = (1.0 − .75)/.5 = +0.5 → signed +0.24; **venue share 0** (no home game: no stadium crowd, no transit game day); city share at championship reach 1.0 — nightlife and retail up city-wide, one positive ripple on `['all']`. The top of today's scale is reached only by a full home World Series week won above expectation; two away wins are a fraction of it by construction. That is the plan's "they stay as the top of the scale".

### 1.3 `HomeNeighborhood` — still on the tab, still a reach channel

- The column survived the 2026-09-19 column audit (19 columns; it is read at `applySportsSeason.js:176`). The ruling (§0-2) is unexecuted because two consumers still read it: transit game-day hoods (`updateTransitMetrics.js:666-673`, `isGameDay_` `:781` true on any row) and the per-hood effects of the authored columns (`processFeedSheet_` → `S.sportsNeighborhoodEffects` keyed by the typed hood, read at `cityEveningSystems.js:405`).
- It is typed as **the story's setting**, as the research found: C107 Eastlake / Glenview / Fruitvale; C109 Jack London ×2, Chinatown, Baylight District, Downtown; **C110 Eastlake ×3 for two away games**. Transit will call Eastlake a game-day hood at C110.

### 1.4 Consumer census today — every numeric site keys on a phase word, none on the record

62 files read `S.sportsSeason`; **174** `=== 'championship' | 'playoffs' | 'late-season'` tests across `phase*/`. The numeric ones this build converts:

| Site | File:line | Keys on | Class (Q2) |
|---|---|---|---|
| City multipliers | `applyCityDynamics.js:449-470` `applySportsModifiers_` | phase word → traffic ×1.2–1.5, nightlife ×1.05–1.5, sentiment +0.02–0.35; cluster boosts hardcoded to `WATERFRONT_WEST` / `EAST_OAKLAND` / `DOWNTOWN_CORE` | traffic = volume; nightlife = result; sentiment is engine.194's |
| Economic ripple | `economicRippleEngine.js:463-469`, `:671`, `:685` | `championship` → `CHAMPIONSHIP_BOOM` 15 (×1.5 again at `:671`), `playoffs` → `PLAYOFF_SPENDING` 8; spread = `cal.sportsZones` for every sports template | result (signed; negative impact is supported — `:1068-1069` count both signs) |
| Population | `godWorldEngine2.js:1186-1190` emp, `:1284-1290` migration, `:1335-1338` economy label | phase word; **ungated** (the 09-16 guard lives in the drift siblings, not here) | volume (migration), result (label) |
| Crisis | `generateCrisisSpikes.js:126-128`, `:210-212`, `:286-287`, `:315` | phase word; zone from `S.sportsZones` (correct) | volume at venue |
| Evening crowd | `cityEveningSystems.js:193-194`, `:253-254`, `:332-334`; `:317` reads zones (correct); `:405` reads `sportsNeighborhoodEffects` | phase word | volume at venue |
| Hood writer | `v3NeighborhoodWriter.js:704-712`; `:159` / `:212` stadium label reads zones (correct) | phase word → per-hood event/nightlife mods | volume at venue + result |
| Bonds | `bondEngine.js:1188-1200` | phase word; **hardcoded `['Jack London','Downtown']`** | volume at venue |
| Transit | `updateTransitMetrics.js:135-136`, `:666-673`, `:781-783` | any feed row = game day; hoods = typed `HomeNeighborhood` ∪ zones | volume at venue |
| Game night gate | `generateCitizensEvents.js:1737` | first row whose `EventType` contains `game`; weight from `sportsSentimentBoost` (`:1743`, engine.194's constant) | gate only (this build); magnitude is 194's |
| Shock monitor | `applyShockMonitor.js:83-92` | **`S.simMonth` 4–10 = "in-season"** — the retired calendar, still read | delete |
| Prose / pools | `textureTriggers.js:272-283`, `applyStorySeeds.js:724`, hooks | phase word; venue literal `'Jack London'` | stay on lens words; venue from `S.sportsZones[0]` |

### 1.5 The authored columns — scenery with one reader

`processFeedSheet_` (`applySportsSeason.js:950-975`) folds `FanSentiment` into sentiment and `ne.nightlife`/`retail`; `EconomicFootprint` → `ne.retail`/`traffic`; `CommunityInvestment` → `ne.communityEngagement`; `FranchiseStability` → `ne.retail`; `MediaProfile` × sentiment. The `ne.*` map is keyed by the **typed `HomeNeighborhood`** and read by exactly one site (`cityEveningSystems.js:405`, crowd). **Deleting the hood column (ruled) kills the only path for three of them.**

Values C107–C110, every row: A's `EconomicFootprint` growing / `FranchiseStability` stable / `MediaProfile` national / `FanSentiment` high; Oaks steady→growing / uncertain / local / low-anxious. **Within a franchise none of the three economy columns has varied in four Cycles** — §16 scenery. `FanSentiment` and `MediaProfile` are engine.194's (Task 7) and are not touched here. The three economy columns are §4(iv).

### 1.6 `Carry_Forward_Store`

`saveCarryForwardBlob_` / `loadCarryForwardBlob_` (`loadPreviousEvening.js:125`, `:159`): keyed JSON, a 9 KB script-property layer with a sheet ring behind it, self-ghost detection on replay. The home for the franchise weight only (engine.209's chosen home); expectation and median are a stateless feed scan (§2.1, es). Key name `sportsFranchiseWeight` is unused today.

### 1.7 What changed since the 09-18 research

engine.202 per-game H/A tokens folding into one week (home games now known); engine.210 live (phase from the feed); engine.240a (a ripple lands where its event happened; `primarySportsZone_` placement is the sports exception); engine.188 trimmed the phase-only sentiment lift and named the double-count; Chicago retired (the Chicago hazard in the research is void); engine.203d ruled slow-fade (sports stays heavy, upset first); engine.208 build-ready with the expectation baseline named as its unbuilt prerequisite; the dropdown round words (208 ruling iii) are about to land in `SPORTS_PHASE_DEPTH_`.

## 2. Proposed cut (mechanism — builder's lane)

Build order: week object → numeric consumers → venue/city split → bars → population → feed column → acceptance. Each step is independently benchable on the C101–C110 beats rows.

### 2.1 The week object — built once, published to every consumer

The builder lives in the existing `utilities/sportsWeekRecord.js` (es, substrate owner, 2026-10-03 — not a new file); `applySportsSeason_` calls it after the feed read and before `ctx.summary = S`, so every Phase 2+ consumer sees it. **engine.208 builds the first half of this object** (`g/w/l/h/a`, `lens`, `expectation`, `n`, `surprise`, `cls` — committed `a1102e5f`, 208 doc §2.9 C3); this build adds `vol`, `stakes`, `reach`, `weight`, `unsigned`/`signed`, `venue`, `venueShare`, `median`.

Per franchise *f* (`S.sportsWeek[f]`):

| Field | Source | Formula |
|---|---|---|
| `g, w, l, h, a` | folded `WeekRecord` | as parsed; absent → all 0 |
| `lens`, `depth` | last entry (§0-5) | `lens` is the **raw** `SeasonType` word (round words included); `depth` from a round table keyed on `lens`. `S.sportsSeason` keeps today's label (rounds alias to `playoffs`, es 2026-10-03) so the 174 word sites read today's value until §2.2 converts them |
| `vol` | `g` | `1 − e^(−g/3)` (saturating; 1 game 0.28, 3 → 0.63, 7 → 0.90) |
| `stakes` | `depth` | `depth / maxDepth` |
| `reach` | `lens` | per-round table (§4(iii)): regular .25 · mid .30 · late .40 · wild-card/play-in .50 · division/first-round .60 · LCS/conf-semis .75 · conf-finals .85 · championship 1.00 · off/pre .15 |
| `expectation`, `n` | **stateless feed scan** (es 2026-10-03): win share over the franchise's last 8 Cycles that had games, `n` = those Cycles, `null` below 4 — survives the off-season, needs no store | the authored prior (§4(i)) fills the `null` once ruled; until then `null` → `surprise` 0 for the Oaks, and the A's run on 208's interim |
| `surprise` | week vs expectation | `clamp((w/g − expectation) / 0.5, −1, 1)`; 0 when `g` = 0 or `expectation` is `null` |
| `weight` | `Carry_Forward_Store.sportsFranchiseWeight[f]` | authored start (§4(ii)); engine.209 drifts it later |
| `unsigned` | | `vol × stakes × weight` |
| `signed` | | `vol × stakes × surprise × weight` |
| `venueShare` | | `h / g` (0 when `g` = 0) |
| `venue` | | `[Baylight District]` if `S.baylightOpenings[f]`, else `LEGACY_SPORTS_ZONES_` — per franchise, not the union |
| `median` | the same feed scan | trailing median of the franchise's own nonzero `unsigned` weeks over the scanned Cycles (engine.188 `medianOf_` shape); no store |

City (`S.sportsCity`): `intensity` = Σ `unsigned`; `signed` = Σ `signed`; `reach` = max `reach` over franchises with `g` > 0; `band` from `intensity` — top ≥ 0.75 · high ≥ 0.50 · elevated ≥ 0.30 · normal ≥ 0.10 · **quiet** below 0.10 *or* below half the city's own trailing median (the §15 downside without a loss). Measured on the research's C101–C108 K1 proxy sums (`Team Record` deltas, no home/away — §1.1), with C108 at its real `playoffs` lens (0.81 × 5/6 = 0.68): high · high · high · elevated · normal · quiet · high · high. **Nothing in C101–C110 reaches `top`**: that band is a full home World Series week — the synthetic case in §2.8(3). C106 (no A's games, `playoffs` lens) is quiet, as Q1 rules; the championship branches never fire on the word alone.

`deepestSportsPhase_` and `S.sportsSeason` stay as the **label** for prose and pools. The bands are the replacement for word tests at numeric sites.

### 2.2 Numeric consumers — word test → number, each site keeps its constant as the band payload

Research §5's migration path: convert *when* a branch fires without retuning *how much*. Mapping: `championship` → top, `playoffs`/`post-season` → high, `late-season` → elevated.

| Site | Becomes |
|---|---|
| `applySportsModifiers_` | traffic `× (1 + 0.5 × intensity × reach)` (unsigned); nightlife `× (1 + 0.5 × signedCity × reach)` — **goes below 1 on a losing week**, floor 0.8; sentiment line untouched (194's); cluster boosts: the cluster containing a franchise's `venue`, scaled by that franchise's `unsigned × venueShare` |
| Economic ripple | the two word gates (`:463-469`) → **one ripple per franchise-week** when `|signed| ≥ 0.15`: impact `round(15 × signed)` (−15 … +15), duration 3, sectors `['entertainment','food','retail']`, `neighborhoods` = `venue` when `venueShare ≥ 0.5` else `['all']` (`:685` becomes per-franchise-week); the `:671` championship ×1.5 goes (stakes are in the number). `SPORTS_CHAMPIONSHIP` on a `championship`/`victory` event text (`:545`) stays |
| Population | emp `+ 0.001 × intensity`; migration `+ rng × 60 × intensity × reach`; economy label → `booming` only at band top **and** `signedCity > 0`, `strong` at high with `signedCity > 0`, **one step down** at band ≥ high with `signedCity < −0.3` (the downside the label never had) |
| Crisis | crowd weight / SAFETY weight / severity pool on band (top, high) and `venue`; the `sportsZones_` fallback literal (`:286`) → `S.sportsZones` only |
| Evening | traffic/volume bumps on band; crowd at `venue` `+ round(unsigned × venueShare × 10)` per franchise (replaces the `ne.*` loop at `:405`) |
| Hood writer | stadium-zone event/nightlife mods on the franchise's `unsigned × venueShare`; city nightlife on `signedCity × reach` |
| Bonds | `sportsHoods` = `S.sportsZones`; rivalry draw `0.3 × intensity` at band ≥ high |
| Transit | `isGameDay_` = any franchise with `h > 0`; `gameDayHoodsFor_` = `venue` of those franchises (the typed hood is no longer read); per-station bump × `unsigned × venueShare` |
| Game night gate | `g > 0` for any franchise, not "EventType contains game"; the `gnI` constant at `:1743` is 194's and stays |
| Shock monitor | the `simMonth` branch deleted; sports threshold lift on band ≥ high |
| Prose / pools | lens words unchanged; venue literal → `S.sportsZones[0]` |

### 2.3 Venue vs city (Task 3b/c)

Home week: volume lands at the franchise's `venue` (crowd, transit, crisis, hood writer, bonds), result lands city-wide at `reach`. Away week: **nothing at the stadium**, result city-wide — watch parties are nightlife and retail, not stadium traffic. During the Baylight changeover the two franchises have different venues; the union `S.sportsZones` stays for label sites only.

### 2.4 Bars fill (engine.47 Hop 6, folded)

Game-night plan Task 3 as written, with the magnitude swapped: on any week with `g > 0`, hospitality/food `Business_Ledger` rows in nightlife-profiled hoods — the franchise's `venue` first on a home week, every nightlife hood at `reach` on an away week — take a `Growth_Rate` nudge of `signed × 0.02` (a losing week is a small cut, not a smaller lift), with one Ripple row `targetScope: business` naming the nudged BIZ_IDs. No game, no writes.

### 2.5 Per-franchise state to its consumers (Task 10)

Research §5's table: the per-franchise group (transit, crisis zone weight, hood writer zone mods, evening crowd, bonds, ripple placement, game night, hooks) reads `S.sportsWeek[f]`; the scalar group reads `S.sportsCity`. The MAX in `deepestSportsPhase_` no longer decides any number — a good A's week and a bad Oaks week both count, at their weights.

### 2.6 The feed

- `HomeNeighborhood` comes off the tab once §2.2's transit and evening rows land: `setupSportsFeedValidation.js`, `sportsFeedContract.js`, the reader (`:174`), `compileHandoff.js`; archive the cells as the VideoGame columns were (`89f78524`).
- `EconomicFootprint` / `CommunityInvestment` / `FranchiseStability`: §4(iv). If kept, each must move a number that is not keyed on the deleted hood — `FranchiseStability` as a per-franchise multiplier on `weight` drift (engine.209's input), `CommunityInvestment` as a community-program pressure in `venue`; `EconomicFootprint` has no reading that the record does not already supply.

### 2.7 Substrate calls for es (not sim)

- Expectation and median are a stateless scan of the feed's prior Cycles (es), judged against prior weeks only — the current Cycle is excluded from its own baseline. `Carry_Forward_Store` holds **`weight` only** (engine.209's home).
- Band thresholds and the `|signed| ≥ 0.15` ripple gate are es's to tune on the C109–C110 replay plus synthetic weeks; the bands above are the proposal.
- The round table: `depth` and `reach` key on the raw `lens`; `S.sportsSeason` stays aliased (`playoffs` for every round word, `championship` for the clinch) so no word site changes until it is converted in §2.2.
- The 208 seam is settled (es `a1102e5f`): 208 ships on its own interim and exposes `surprise` (±0.2 → `cls`); this build swaps in the §4(i) priors for the `null` case after the ruling. **Not a gate on 208.**

### 2.8 Acceptance (dated, C110 named)

1. Bench, replay **C109–C110** from the beats rows (the only Cycles with real `WeekRecord` weeks — C101–C108 have 3 cells and no home/away history, so they are not a replay) plus the synthetic weeks below: the per-franchise week table prints (`g h w l lens vol stakes reach expectation n surprise unsigned signed venueShare band`); C109 A's g 3, h 2; **C110 A's: g 2, h 0, lens championship, venueShare 0, signed > 0**; a Cycle with no rows is `quiet`.
2. Bench C110: transit game-day hoods = the A's `venue`, **not Eastlake**; evening crowd at the venue 0 (away week); one ripple on `['all']`, positive, impact < 15; no `CHAMPIONSHIP_BOOM` / `PLAYOFF_SPENDING` row.
3. Bench, a synthetic home losing week (`H:L H:L H:L`, lens playoffs, A's): crowd and transit at the venue **up**; nightlife multiplier **below 1**; ripple **negative**; economy label one step down from `strong`; bars' `Growth_Rate` nudged down.
4. Bench, Oaks `H:L A:L` at weight 0.35: signed small negative; nothing at band level moves (the A's carry the city); an Oaks fan's dial line is 208's, not here.
5. `grep -c "=== 'championship'\|=== 'playoffs'\|=== 'late-season'"` over the numeric files in §1.4 reads **0**; prose files keep theirs.
6. `applyShockMonitor.js` has no `simMonth` read.
7. Live, first fire after deploy: no `Phase2-SportsSeason` row in `Engine_Errors`; `S.sportsWeek` on the packet; `ranMs` in the usual range.

## 3. Seams — what this build owns and what it does not

- **engine.194 (codex, Task 7)** owns sentiment magnitude (`processFeedSheet_` clamp, `MediaProfile` multiplier, `FanSentiment`) and the game-night intensity constant at `generateCitizensEvents.js:1743`. This build changes the game-night **gate** only and leaves the sentiment line in `applySportsModifiers_` alone.
- **engine.206** needs what §2.3 publishes — a franchise-week's venue and city share — so a seed knows where it landed. Unblocks on this build.
- **engine.208** consumes `S.sportsWeek[f].surprise` (§2.7). The citizens' lines are 208's; the city's numbers are this build's.
- **engine.209** owns the drift of `weight`; this build reads the key at its authored start.
- **engine.203d** (slow fade) is the decay of the city's sports state; §2.1's `median` and the ripple's 3-Cycle carry (1.0 → 0.67 → 0.33) are the existing decay shapes it can ride.

## 4. Sim calls for Mike

i. **Expectation priors, as numbers.** Q3 ruled the principle. Proposed: A's dynasty norm **.750** weekly win share, Oaks expansion prior **.400**, each used while fewer than 4 game Cycles exist in the last 8, then the franchise's own record. (A 2-1 A's week reads a mild letdown; an Oaks 2-1 week reads a surprise.)
ii. **Franchise weight start values** before engine.209 drifts them. Ruled "A's harder". Proposed: A's **1.0**, Oaks **0.35**.
iii. **Reach per round, as numbers** (Q4 ruled the shape). Proposed table in §2.1 — regular .25 up to championship 1.00. Confirm or move a number.
iv. **The three authored economy columns** — `EconomicFootprint`, `CommunityInvestment`, `FranchiseStability`. Data: never varied within a franchise C107–C110; their only reader dies with the hood column you ruled off the tab. The plan's rule is "use it or it goes". Proposed: **delete `EconomicFootprint`** (the record is the footprint), **keep `FranchiseStability`** as engine.209's authored drift input, **keep `CommunityInvestment`** as venue community-program pressure — or delete all three and the tab drops to 15 columns.

Nothing else in this document needs a ruling.

### Rulings (Mike, 2026-10-03 01:52) — the §4 calls are closed

**Verbatim:** "agreed on your recommendations"

i. **Expectation priors — RULED as proposed:** A's .750, Oaks .400 weekly win share, used while fewer than 4 game Cycles exist in the last 8; the franchise's own record after. Fills the `null` in es's stateless scan (§2.1).
ii. **Franchise weight starts — RULED as proposed:** A's 1.0, Oaks 0.35, in `Carry_Forward_Store.sportsFranchiseWeight`; engine.209 drifts them.
iii. **Reach per round — RULED as proposed:** off/pre .15 · regular .25 · mid .30 · late .40 · wild-card/play-in .50 · division/first-round .60 · LCS/conf-semis .75 · conf-finals .85 · championship 1.00.
iv. **Authored economy columns — RULED as proposed:** **delete `EconomicFootprint`**; **keep `FranchiseStability`** as engine.209's authored drift input; **keep `CommunityInvestment`** as community-program pressure in the franchise's venue. Both kept columns must move their number off the hood key before `HomeNeighborhood` is deleted (§2.6).

**Status after the rulings:** nothing in this document is waiting on a ruling. es builds §2 on top of the 208 week object, with agy's review folded first if it lands with FIXes.

## Changelog

- 2026-10-03 01:52 (research-build, S523) — Mike ruled all four §4 calls as proposed (verbatim under §4 Rulings): priors .750/.400, weights 1.0/0.35, the reach table, delete EconomicFootprint and keep FranchiseStability + CommunityInvestment. Build-ready for es.

- 2026-10-03 01:45 (research-build, S523) — es's three substrate calls folded (builder in `sportsWeekRecord.js`; expectation/median a stateless feed scan, `null` below 4 game Cycles; rounds alias to `playoffs` for the label, raw word as `lens`); 208 builds the first half of the object (`a1102e5f`), not a gate. C108 corrected to its real `playoffs` lens and one accepted `WeekRecord` cell; C101–C108 named as a `Team Record` proxy, not a replay — acceptance (1) rescoped to C109–C110 + synthetic weeks; `top` band shown unreached in range. Reader line `:176`.
- 2026-10-03 (research-build, S523) — initial read-before and proposed cut, drafted on Mike's go while engine-sheet builds engine.208. Measured: home/away is parsed but unread; `HomeNeighborhood` still on the tab and typed as the story's setting (C110 Eastlake ×3 for two away games); 174 word tests, 0 per-franchise readers; the `simMonth` calendar read survives; the authored economy columns reach one site via the hood being deleted. C110 worked case stated against the sixth-block lens ruling. Four sim calls.
