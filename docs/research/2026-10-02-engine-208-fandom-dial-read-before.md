---
title: engine.208 — dial 9, fandom: read-before and proposed cut
status: draft for builder review
owner: research-build (draft); engine-sheet (substrate, bench, deploy)
parent: [[../plans/2026-09-11-sports-as-a-lived-system]] §4, Task 8
related: [[2026-09-18-sports-intensity-and-game-day-economy]] §6, [[2026-09-08-dials-as-a-game]], [[../plans/2026-09-10-inactivity-is-regression]]
---

# engine.208 — dial 9, fandom: read-before and proposed cut

Everything in §1 was read from code or the C109 ledger dump on 2026-10-02. §2 is the proposed mechanism (builder's lane, no ruling needed). §3 is the feed question with data under it. §4 is the short list that is a sim call. Nothing here re-opens a ruling in the parent plan §0 or §4.

## 0. What is already ruled (pointers, not re-argued)

- Fandom is **dial 9**, in `DialState`, not a ledger column — plan §4, third block.
- Poles low→high: *doesn't follow the teams → keeps half an eye on the scores → a real fan, plans around games → lives and dies with them* — plan §4.
- It ships **with its negative pole or not at all** (engine.197's lesson) — Task 8.
- It is **the selector**: dial 9 decides who a sports event happens to — fourth block.
- **Cron tone feeds it down**: a desk negative about the team moves the dial down — third block.
- Inherited through the household (`SpouseId`/`ParentIds`) — plan §4.
- Franchise weight (A's ≫ Oaks, drifting) is engine.209, not this dial — Task 9.
- 203d slow fade, **upset first**; how hard any one citizen feels it is this dial's job — changelog 2026-09-27.
- Q1–Q4 (no-game week is cron buzz; volume unsigned / result signed; each team against its own expectation; each playoff round casts a bigger net) — research §6.

## 1. Measured state, 2026-10-02

### 1.1 The dial substrate — what a ninth dial costs

| Surface | File:line | Finding |
|---|---|---|
| Dial list, single source | `utilities/citizenMemory.js:33` | `DIALS` = 8 names. The S447 prerequisite (`0c1fa07b`) is real: no other file carries a hardcoded list (`grep "'outabout'"` across `phase*/ utilities/ lib/` hits only this line and `DIAL_MAP` entries). |
| New citizen / parse | `citizenMemory.js:64`, `:257`; `lib/citizenDials.js:34` | A missing dial on an old `DialState` row **reads as 50** in all three paths. Appending `fandom` to `DIALS` makes all 963 citizens a 50 on the first fold — one blob by construction. |
| Per-cycle fold | `citizenMemory.js:141` `applyCycleEffects_` → `applyEvent_` | Loops `DIALS`; the ninth dial folds with no change. Streak/harden (`HARDEN_STREAK` 3, `HARDEN_FRACTION` 0.4) and `roomScaled_` apply unchanged. |
| Decay | `citizenMemory.js:36`, `:201` | `MOOD_DECAY` 0.8 is **uniform across dials**. The 09-27 "slow fade" ruling for 203d either accepts 0.8 for fandom or wants a per-dial decay — substrate call, flagged in §2.7. |
| Readable face | `utilities/compressLifeHistory.js:1601` `formatDialFace_` | Loops `DIALS` → `fandom:NN` lands in `TraitProfile` automatically; `Hash` changes for every citizen on the first fold (expected, not a defect). `describe_` reads `PHRASE[dial]` (`citizenMemory.js:220`) — **a missing `PHRASE.fandom` is a crash**, so PHRASE is a required edit, not polish. |
| Voice poles | `lib/citizenDials.js:21` `POLES` | 4 phrases per dial (bands 0,1,3,4; neutral omitted). Needs `fandom`. The plan's four phrases are already the ruling. |
| Event → dial map | `utilities/citizenDialMap.js:163` | `'Sports': {}` — a plain sports day moves nothing (engine.201 ruling 1b). Sports' whole dial footprint today is **zero**. |
| Tag-suffix trap | `citizenDialMap.js:250` `CALENDAR_SUFFIXES` includes `'Sports'` | `baseTag_` strips a trailing `-Sports`: a tag named `Win-Sports` resolves to `Win`. **New tags must be prefix-form (`Sports-Win`)**, like `Career-Transition`. |
| Pressure causes | `citizenDialMap.js:185` | Pattern for a signed, cause-carrying negative line (`Friction`/`Strain` + cause text → second dial). Reusable shape for "my team is gutting the roster". |
| Newsroom → dial seam | `citizenDialMap.js:207` `EDITION_RE` / `EDITION_FX`; writer `scripts/enrichCitizenProfiles.js` | The only existing newsroom→dial path is a **citation** (`E80-S1` on the named citizen → `sociability +2`). It is recognition of a person, not tone about a team. The cron-tone channel is **not covered** today; §2.5 extends this post-publish seam rather than inventing a parallel one. |
| Who gets a sports event | `phase05-citizens/generateCitizensEvents.js:2904`, `:842` | Weighting uses `traitProfile.traits` (social/reflective/driven) and routes the primary tag to Sports; no notion of who cares. `loadEventContentLedger.js:64–111` DSL fields: wealth, children, displacement, married, retired, ageband, warmth, drive — **no fandom, no team, no phase**. |
| Wake reasons | engine.201, `lib/wakePerception.js` reads `DIALS` | Every reason is attention-or-neglect (plan §4: 707/930 never wakeable by difference). A fandom band is a reason that differs between citizens. |

### 1.2 The citizens — what signal exists to seed from (C109 dump, 963 rows)

| Signal | Count | Honest reading |
|---|---|---|
| `[Sports]` LifeHistory lines | 1,210 lines on **668 citizens** (331 ×1, 193 ×2, 99 ×3, 45 ×4+) | **Generator texture**, uniformly spread — the very lines engine.201 1b zeroed. Counting them to seed fandom would retag texture to move a dial. **Not a seed input.** |
| Real sports wagers | `Casino_Ledger`: 45 sports-market rows, **44 distinct bettors**; 47 citizens carry `[Casino]`/wager text | A real money event on a team. Valid seed input. |
| Residence in a stadium zone | `LEGACY_SPORTS_ZONES_` = Jack London (77) + Downtown (92) = **169 citizens** (`applySportsSeason.js:499`; Baylight District 5 after the move) | Plan §4 names "living in a game-day hood" as an up-mover. Valid seed input, small. |
| Household | `SpouseId`/`ParentIds` present on the row | Inheritance is ruled; at seed it only propagates whatever the other inputs gave. |
| Authored top-tier citizens | `ClockMode` counts: GAME 58, MEDIA 44, CIVIC 53, ENGINE 808 (Tier is a separate column, not counted here) | Top-tier is authored, never pool-drawn — an authored citizen's fandom is a value someone writes, not a roll. |
| `outabout` as a proxy | base mean 51.0, sd 2.9, **946/963 in the middle band** | Useless as a spread source — it is itself one blob. |

**Consequence:** the seed inputs are thin. A seed pass will separate perhaps 200 citizens from the middle; the **spread has to come from signed events over Cycles**, which is what the dial system is for. engine.197 criterion 4 (a spread, not two blobs) therefore needs a **date** — first fold + 10 Cycles — not a bench read at the seed.

**`backdateCitizenDials.js` cannot seed this dial.** It replays history through the map; nobody's history carries a signed sports tag, so replay yields 50 for all 963. The seed is a separate explicit pass that writes `base.fandom`.

### 1.3 The feed — what the engine can tell apart (235 rows, C107–C109 read in full)

- `SPORTS_PHASE_DEPTH_` (`applySportsSeason.js:378`): off-season 0 · spring-training/preseason 1 · early/regular 2 · mid 3 · late 4 · **post-season/playoffs 5** · championship 6. Aliases (`:367`): `world-series`/`finals` → championship.
- **Every ALDS, ALCS and World Series game authored C107–C109 is typed `playoffs`.** The round lives only in Notes prose ("Game 1 of the ALDS", "Game 1 of the WS"). The engine saw depth 5 for the whole run; the `world-series` alias was never typed. Q4 ("each round casts a bigger net") **cannot fire on today's vocabulary.**
- The plan's sixth block (09-19, to engine-sheet) rules that the **last entry of the Cycle sets each team's lens** — this supersedes research §6 Q6's "summary row owns the phase". The summary-row item is closed; **only the vocabulary question is open** (§3).

## 2. Proposed cut (mechanism — builder's lane)

Build order follows Task 8's remaining list: poles → `DIAL_MAP` both directions → seed → selector → inheritance → cron tone → wake.

### 2.1 The dial itself (three files, one test)
- `citizenMemory.js:33` — append `'fandom'` to `DIALS`. Header comment line: `fandom  doesn't follow <-> lives and dies with them  (the SELECTOR for sports/UNDOCKED events; Dial 9, engine.208)`.
- `citizenMemory.js:220` `PHRASE.fandom`: `['doesn't follow the teams', 'half an eye on the scores', '', 'a real fan', 'lives and dies with them']`.
- `lib/citizenDials.js:21` `POLES.fandom`: the plan §4 four phrases verbatim.
- `scripts/citizenDials.test.js` + `compressLifeHistory.dial.test.js`: a 9-dial round-trip, an old 8-dial `DialState` string deserializing to fandom 50 with no throw, `formatDialFace_` rendering `fandom:`.

### 2.2 Signed tags (`DIAL_MAP`, prefix-form only — §1.1 suffix trap)

Proposed magnitudes, on the existing scale (Promotion +8, Divorce −8, ambient ±1). **Confirm or move — §4(iv).**

| Tag | Emitted when (the real seam) | fandom | second dial |
|---|---|---|---|
| `Sports-Win` | a received game-result event, team's week record above its own expectation (Q3) | +2 | — |
| `Sports-Loss` | received, week below expectation | −2 | — |
| `Sports-Run` | received, playoff round reached (per round, Q4) | +4 | outabout +1 |
| `Sports-Title` | received, championship won | +6 | outabout +1, sociability +1 |
| `Sports-Gutted` | received `roster-move`/`injury` row flagged negative (the ruled negative drift) | −4 | composure −1 |
| `Sports-Attended` | the `outabout` correlate — went to the game (ECL content row) | +3 | outabout +1 |
| `Sports-Soured` | post-publish, a sports-desk piece negative about the team, to band ≥3 fans (§2.5) | −2 | — |
| `Sports-Lifted` | same seam, positive piece | +1 | — |
| `Undocked-Engaged` | received UNDOCKED audience/pilot line (engine.274 already routes pilots → `Reputation`, audience → `Personal`; this adds the fandom fold the ruling names: one dial covers the city's spectacle) | +1 | — |
| `Sports` (plain) | unchanged | {} | — |

Only **received** events move the dial (Task 8 item 4) — candidate rows and texture never do.

**The Oaks and the negative pole (agy review hunt 4, verified):** if Q3's expectation neutralises every Oaks loss as "as expected", `Sports-Loss` is never emitted at ship — the Oaks are the only team losing, so the negative pole would be dead on day one (engine.197's exact failure). Q7 ruled what the Oaks' losses cost the *city* (little); what they cost a *fan* is open and is §4(v). The rule proposed there fires regardless of the expectation baseline, so the pole is live from the first fold.

### 2.3 Seed (one explicit pass, bench first, then live under the usual one-confirm)
`base.fandom` = 50 + (sports wager on record +10) + (resident of a stadium zone +5) + (household member already above 60: inherit toward their value, half the gap) ; Tier-1 authored values from the populator's profile field where one exists, else the same formula. Everyone else **stays at 50 and earns their fandom**. A `scripts/seedFandomDial.js` with `--dry-run` printing the distribution; the band histogram goes into the bench proof. The script writes `DialState` only — `TraitProfile` re-renders on the next fold.

### 2.4 The selector
`generateCitizensEvents.js:2904` region: for a candidate whose primary route is Sports, multiply `weightMod` by `bandMultiplier_(c,'fandom')` (0.5 … 1.5 — `citizenMemory.js:217`, already the back-arc consumer) × reach(round) × franchise weight (1 until engine.209). ECL DSL (`loadEventContentLedger.js:64`): add `fandom` as a `num` field alongside warmth/drive so content rows can require `fandom>=60` (a playoff-bar scene) or `fandom<40` (someone dragged along). Proof: two otherwise-equal fixtures at fandom 25 and 85 draw different sports-event distributions (Task 8 item 3).

### 2.5 Cron tone → dial (the ruled feedback loop)
Extend the post-publish step that already writes `E<edition>-S<n>` citations (`scripts/enrichCitizenProfiles.js`): for each sports-desk piece, read a per-piece tone and append `Sports-Soured` / `Sports-Lifted` LifeHistory lines to citizens in fandom band ≥3 (all tracked, or capped at a draw of N — substrate). That makes the desks the sensor of the fans' mood, which is the ruling. No new channel; one more emitter on an existing seam.

**Gap, verified 2026-10-02:** no per-piece tone exists today. The `sentiment:` hits in `scripts/build*Packets.js` are the city sentiment going *into* the desks, and no Rhea/sift output carries an article-level tone or stance field (`grep -rln "articleSentiment|pieceTone|\"tone\""` over `scripts/` finds none). The emitter needs one: a cheap classifier pass over the sports-desk pieces at post-publish (helper-model lane, three labels: negative / neutral / positive about the franchise). The feed's authored `FanSentiment` column (`applySportsSeason.js:178`, today a nightlife/retail multiplier) is the *author's* reading, not the desks' — it does not satisfy the ruling and is not the interim.

### 2.6 Inheritance at mint
The `Phase5-Advancement` intake (the seam where engine.278 reads the carried employer): a minted child or spouse joining a household takes `base.fandom` from the household head's current value minus 10, floor 50.

### 2.7 Substrate calls and prerequisites for es (not sim)
- **Prerequisite — the Q3 expectation baseline does not exist.** `Sports-Win`/`Sports-Loss` are defined against "the team's own expectation" and nothing in the engine computes one (research §6, "what the rulings need from the feed": A's from their own running record, Oaks an expansion prior until a record accumulates). engine.209's franchise weight is a different number. Until es carries a per-franchise expectation (a `Carry_Forward_Store` value, same home §7 gives franchise weight), the two tags cannot be emitted — and the negative pole is dead for that reason, not a magnitude one. Interim that fires on day one: `Sports-Loss` on a week record under .500 for the A's and under the Oaks' running week average once ≥4 weeks exist; before that, an Oaks loss week emits nothing (Q7).
- `MOOD_DECAY` per-dial or uniform — the 203d "slow fade" is about the **city's** sports state; a fan's upset fading at 0.8/Cycle (gone in ~4) may be right or may be fast. es rules; if per-dial, fandom gets its own constant.
- Reach(round) needs the §3 vocabulary; until it lands, reach = depth/6 off the existing table.
- `Hash` churn on first fold: every TraitProfile rewrites once. Note it in the smoke so nobody reads it as a defect.

### 2.8 Acceptance (dated)
1. Bench: 9-dial round-trip, no throw on 963 old rows, `fandom:` on every TraitProfile after one fold.
2. Bench: fixtures at fandom 25/85 draw different sports-event distributions.
3. Bench: an Oaks L-streak week emits `Sports-Loss` to band ≥3 Oaks fans and **moves them down** (the negative pole fires on day one).
4. Live, first fold + 10 Cycles: band histogram is not one blob — at least three bands populated, middle band under 80% (engine.197 criterion 4).
5. Live: a playoff week wakes at least one citizen whose only wake reason is fandom (engine.201).
6. **Bench, before any live fold (agy review hunt 7):** a synthetic 10-Cycle run over the 963 seeded rows at realistic received-event rates (the C101–C109 win/loss/run cadence, Oaks L-streak, a tone line a week) through `applyCycleEffects_` + `settleCycle_` at `MOOD_DECAY` 0.8 — print the band histogram each Cycle. If the decay pulls everyone back to the middle before the histogram separates, the magnitudes or the decay move *on bench*, not after ten live Cycles.

### 2.9 es build cut (engine-sheet, 2026-10-03) — what gets built; supersedes §2.3 half-gap, §2.6, §2.7 interim
Folds §4 Rulings + the 2026-10-03 Amendment. Status: **for review (codex), not built.**

**Measured 2026-10-03 (live sheet + code):**

| # | Finding | Source |
|---|---|---|
| M1 | **The athlete seam has never fired.** `LifeHistory_Log`: 0 rows ever carry a `GAME_NIGHT_POOLS` line; the one athlete-writer row (C101, POP-01022) has a blank pick. Cause A: `NamesUsed` carries positions (`Arturo Ramos (SP)`), the match is exact lowercased `first last` → 17/165 C100+ mentions resolve; stripping `(…)` → 142/165. Remaining 23: typos (`Mark Aiken`, `Vinne Keane`, `Isely Kelley`, `Ernesto Quitero`), sports-layer names with no POPID (`Peter Busch`, `Cy Newell`…), and splits inside parentheses (`(3B/1B)`, `(SP`). Cause B: `pool[Math.floor(safeRand_(ctx) * pool.length)]` — `safeRand_` returns the rng *function* (`utilities/safeRand.js:28`) → NaN → `undefined`. The 302 `gameNight|streak:` log rows are the spectator writer's, not the athletes'. | `phase05-citizens/applyGameNightMoments.js:61,88,113`; live `LifeHistory_Log` |
| M2 | GAME-clock citizens draw everyday lines, incl. `source:sports` spectator rows ("bought a new A's jersey"). | `generateCitizensEvents.js:2126` (A1-cont) |
| M3 | Selector today: `source:sports` pool weight × **outabout** band. | `generateCitizensEvents.js` dial-band block (~:2925) |
| M4 | ECL sports rows carry the team in `PoolKey`: `sports.as` 11, `sports.oaks` 9, `sports.citywide` 4, hood 3. | live `Event_Content_Ledger` (350 rows) |
| M5 | `S.sportsSeason` has 150+ literal compares (`'playoffs'`, `'championship'`), `normalizeSportsPhase_` buckets, season pools keyed by string; one numeric reader (`deepestSportsPhase_`). | engine-wiring card; `applyCityDynamics.js:173`, `generateGenericCitizenMicroEvent.js:260`, `generateCitizensEvents.js:1934`, `applySportsSeason.js:444` |
| M6 | D3: `processFeedSheet_` skips a team with no current-Cycle row → its sentiment share snaps to 0 the first quiet week. The row scan already holds every earlier row per team. | `applySportsSeason.js:757,854` |
| M7 | Casino sports markets carry the team: `sports:as` / `sports:oaks`. | `casinoLedgerEngine.js:881` |
| M8 | Canon fans' households: 2 members via `SpouseId`/`ParentIds`, 3 via `HouseholdId`. | live ledger |
| M9 | The 8-dial `deserialize_` keeps only `DIALS` keys of `base` → a `fandom` written before the 9-dial code is live is dropped at the next fold. | `citizenMemory.js:64,257` |

**C1 Dial.** `DIALS += 'fandom'`; `PHRASE.fandom`, `POLES.fandom` per §2.1. Per-dial decay: `MOOD_DECAY_BY_DIAL = { fandom: 0.9 }` in `settleCycle_` (a fan's upset lasts ~6–7 Cycles, not ~3–4; the other eight stay 0.8). Team on `DialState` as `fan: 'as'|'oaks'|'both'` (serialize/deserialize like `wear`). The fandom value is never pinned; athletes move like anyone (Amendment).

**C2 Tags** (`DIAL_MAP`, prefix-form). Fans: `Sports-Win` +2 · `Sports-Loss` −2 · `Sports-LosingWeek` −1 · `Sports-Run` +4 / outabout +1 · `Sports-Title` +6 / outabout +1, sociability +1 · `Undocked-Engaged` +1. Athletes, by `EventType` (ruling i, magnitudes mechanism): `game-result` → `Sports-Played` composure +1 · `injury` → `Sports-Injured` composure −2, outabout −1 · `roster-move`/`trade-recap`/`re-signing` → `Sports-Moved` openness +2, family −1 · `player-feature`/awards → `Reputation` (exists).

**C3 Week object — ONE baseline, shared with engine.204/205** (their read-before `docs/research/2026-10-03-engine-204-205-game-day-economy-read-before.md` §2.1/§2.7). `S.sportsWeek[f]`, built in `applySportsSeason_` by a pure builder added to the existing `utilities/sportsWeekRecord.js` (no new file). 208 builds the fields it reads — `g, w, l, h, a`, `lens` (the raw round, C6), `expectation`, `n`, `surprise`, `cls`; 204/205 adds `vol/stakes/reach/weight/signed/venue/median` to the same object later. **Expectation is stateless from the feed row scan** (the tab is the record; no `Carry_Forward_Store` copy to drift or be lost on a bench resync): win share over the franchise's last 8 Cycles **with at least one accepted `WeekRecord` cell** (g > 0) — it survives the off-season; `n` = those Cycles (cap 8). Data caveat (rb, 2026-10-03): C101–C108 carry only 3 `WeekRecord` cells, so at C110 the A's sit at `n` < 4 and a losing week reads `LOSING_WEEK` (−1) until four game weeks accrue — the dynasty's `LOSS` (−2) arrives with the record, not before; any replay is C109–C110 plus synthetic weeks; with `n` < 4 `expectation` is null (208 needs no prior; 204/205 §4(i) priors fill it when ruled). `surprise` = clamp((w/g − expectation)/0.5, −1, 1), 0 with no games or no expectation. `cls`: no games → none · W>L and (`n` < 4 or surprise > +0.2) → `WIN` · W<L and `n` ≥ 4 and surprise < −0.2 → `LOSS` · any other W<L → `LOSING_WEEK` · else `EVEN` (plain `Sports`). Every Oaks losing week is at least −1 (ruling v); a dynasty 2-1 week is `EVEN`, 3-0 is `WIN`. A playoff-round, `world-series`/`finals` week with W ≥ L → `RUN`; a won `championship` game-result → `TITLE`. Thresholds ±0.2 are 204/205 §2.7's, so one number serves both builds.

**C4 Who receives a week line** (Phase 5, `applyGameNightMoments_` becomes the feed→citizen seam; write path unchanged — row `LifeHistory` + `LifeHistory_Log` batch, SHEETS_MANIFEST §9 row 155):
- **Staff of a team** — GAME clock, `EmployerBizId` BIZ-00005 → A's, BIZ-00074 → Oaks (both for a two-team GM): the team's week line whenever it played (Amendment: "all should be getting life events from the week's success").
- **Fans** — `base.fandom` ≥ 60 with `fan` matching: the same line, every week the team plays (ruling v: "every losing week"). **Membership reads base, not current**: mood is how a fan feels this week, not whether they are one — a 60-seeded fan's first −1 must not drop them off the list for seven Cycles.
- **Named on a row** — by name after normalization, Active only: the C2 `EventType` line. One line per (citizen, EventType), cap 3 lines per citizen per Cycle.
- M1 fixed: `safeRand_(ctx)()`; names: strip `(…)` (incl. an unclosed one) before splitting, split on `, | ; /` and `. ` + capital, trim a trailing `.`; exact match after that, never fuzzy (POPID-by-name rule). Unresolved names → one `Logger` line per Cycle naming them, so a typo in the feed is visible.

**C5 Selector** (`generateCitizensEvents.js`). `source:sports` weight × **fandom** band multiplier (replaces outabout). GAME-clock citizens skip `source:sports` spectator entries (their sports life is C4; no player buys his own jersey). A drawn `sports.as`/`sports.oaks` line in a week that team has a C3 class takes that class's tag instead of plain `Sports` — a casual fan feels the week when they catch it; citywide/hood pools stay plain. ECL DSL gains `fandom` (num) beside warmth/drive.

**C6 Rounds** (ruling iii). Dropdown + contract test + `SPORTS_PHASE_ALIASES_`: `wild-card`, `division-series`, `league-championship`, `play-in`, `first-round`, `conference-semis`, `conference-finals`, each **aliasing to `playoffs`** — `S.sportsSeason`, the 150+ compares, `normalizeSportsPhase_` and the season pools see exactly today's value (M5: zero consumer change). **`world-series` and `finals` re-alias from `championship` to `playoffs`**: live practice types WS games `playoffs` and only the clinch `championship` (C107–C110 rows); once the dropdown note says *pick the round*, today's alias would turn every WS game week into `championship` across those 150 sites (crisis +0.08, `CHAMPIONSHIP_BOOM`, traffic ×1.5). The clinch stays `championship`. The raw round rides on the feed entry (`rawSeasonType`) into C3 as `lens`. Q4's "bigger net" (a run week reaching past the fans) reads `S.sportsWeek[f].reach` once 204/205 §4(iii) rules the per-round numbers — not invented here; until then a `RUN` reaches staff and fans only.

**C7 Seed** (one-shot via `lib/sheets`, scratchpad, `--dry-run` histogram first; no repo script — engine.md). Precedence: canon override (`data/fandom_seed_overrides.json`, authored base + team) > GAME-clock team staff 65 + employer team > sports wager 60 + market team (both markets → `both`) > stadium-zone resident +5 (55, no team). Then **families start as fans** (Amendment): every `SpouseId`/`ParentIds`/`ChildrenIds`/`HouseholdId` member of a seeded fan (≥60) → max(own, min(fan's base, 65)), fan's team; one pass, no chains. Writes `DialState` only where fandom ≠ 50 or a team is set. Order is code → seed → fire (M9). Bench: free, after the last resync, no resync until live is seeded. **Live write = one plain confirm from the builder with the dry-run numbers** (TERMINAL.md §Authority, many-row write).

**C8 Inheritance in the engine** (new citizens; supersedes §2.6). Phase-9 fold: a row whose `DialState` cell is blank (mint or birth) seeds `base.fandom` from its household — any fan (`base.fandom` ≥60) among `SpouseId`/`ParentIds`/`HouseholdId` → min(value, 65) + team; else 50. A pre-pass indexes fans from the same rows. A row with `DialState` and no `fandom` key reads 50 until seeded.

**C9 UNDOCKED.** Audience line routes `Undocked-Engaged` (fandom +1 only — engine.272's integrity/sociability cut stays) instead of `Personal`; the pilot's own run stays `Reputation` (`generateCitizensEvents.js:821`).

**C10 engine.203d city fade** (`processFeedSheet_`). A team with earlier rows and none this Cycle contributes its last-row share × `sportsFadeRate` (0.85, World_Config) ^ quiet Cycles, to zero below 0.01 — never a snap, never a hold. **"Upset first" sign after a won title: open to the builder** (2026-09-27 verbatim: "being upset should happen first").

**Out of this build (filed as follow-ups):** `Sports-Soured`/`Sports-Lifted` (no per-piece tone exists — §2.5 gap); `Sports-Gutted` (no negative flag on roster rows; rides the tone follow-up); `Sports-Attended` (needs an authored ECL attendance tag — rb's content lane). The negative pole ships via `Sports-Loss`/`Sports-LosingWeek`.

**Revision 1 (2026-10-03, after codex HOLD — `docs/research/2026-10-03-codex-engine208-cut-review.md`, every finding checked against code; two re-verified by direct read: the `engaged` content rule at `citizenDialMap.js:232` and the current-Cycle-only feed read at `applySportsSeason.js:158`).** Where this block and C1–C10 disagree, this block wins.
- **M1 parser** = codex hunt 1 expression (positions stripped incl. unclosed, split on `, | ; /` and `. `+capital, trailing `.` trimmed on feed name **and** ledger key, exact match after). Interim repair only: plain `[Sports]` lines stay inert until the signed lines land.
- **C2:** `Undocked-Engaged` renamed **`Undocked-Audience`** — the word "engaged" falls through `CONTENT_RULES` today and reads as a marriage (sociability +4, warmth +3, family +2). Every new tag gets an exact `DIAL_MAP` entry and an exact-effect test in the same commit as, or before, its emitter. `game-result` → `Sports-Played` composure +1, or `Sports-PlayedWin` composure +2 in a `WIN`/`RUN`/`TITLE` week (§4 ruling i record).
- **C3:** history comes from a projection of the same `getDataRange()` grid `readOaklandFeedEntries_` already reads (one read, not two): accepted `WeekRecord` cells per franchise per Cycle, folded per Cycle, **current Cycle excluded from its own expectation**; preseason game weeks count toward `n` (Oaks: 2 at C110). `lens` = the raw season word of the franchise's **last** row in the Cycle (the plan's sixth block). Class precedence: no games → none · raw `championship` with W ≥ 1 → `TITLE` · raw round / `playoffs` / `world-series` / `finals` with W ≥ L → `RUN` · W>L and surprise ≥ 0 → `WIN` (meets or beats its own norm; a perfect-record sweep is a `WIN`) · W<L and surprise < −0.2 and (`n` ≥ 4 **or** the franchise is the A's) → `LOSS` · other W<L → `LOSING_WEEK` · else `EVEN`. Below 4 game Cycles `expectation` = the ruled prior (204/205 §4(i), Mike 2026-10-03: A's .750, Oaks .400), so a dynasty `LOSS` is live from the first week; an Oaks `LOSS` (−2) still waits on four weeks of its own record (ruling v), every earlier Oaks losing week is −1. Unit tests on each edge.
- **C4:** one line **per resolving feed row** (row-level receipt, no per-EventType cap); every Status except deceased (a retired legend named in a feature gets his `Reputation` line). Fan recipients and C8 donors read `base.fandom` ≥ 60; C5 selection weight and the ECL `fandom` condition read **current** (as warmth/drive do). `LifeHistory_Log` missing → throw, never a silent omit; a re-fire is already refused by engine.275's fire record, which is the retry guard for the log-before-ledger order.
- **C5:** routing receives the drawn entry's `eclPoolKey`; only exact `sports.as`/`sports.oaks` take the week's class tag; hardcoded `source:sports` entries (no key) stay plain, no team guessed from prose. GAME-clock citizens have `source:sports` candidates removed **before** weighting/draw.
- **C6 (reversed):** `world-series`/`finals` keep their `championship` alias — no change to `sportsSeasonPhase.test.js`, `sportsFeedParser.test.js`, `runAsUniversePipeline.js:218`, the Maker override or the inferred trigger. Only the seven new round words alias to `playoffs` (today's value for those series as typed). `RUN` vs `TITLE` comes from the raw `lens`, not the canonical label. Dropdown note: pick the round for each series; `championship` for the clinch game.
- **C8:** `dialRmwNeeded` gains "DialState cell blank" so a mint/arrival/birth gets its first DialState on its first fold; the pre-pass parses `ParentIds` JSON, `SpouseId` `POPID Name`, groups `HouseholdId`, indexes base fans only, both-team donors merge to `both`. The civic challenger mint (`updateCivicApprovalRatings.js:1367`) writes a ninth dial by the same household rule. Acceptance "fandom on every TraitProfile after one fold" → "on every TraitProfile the fold rewrites" (face updates only under `compressEligible`).
- **M9 writers:** `backdateCitizenDials.js` and `seedTier1EssenceLive.js` overwrite the whole DialState from a fresh neutral citizen — after the seed they must carry existing `base.fandom` and `fan` forward (same build commit) or refuse to run.
- **C7:** the overrides file's athlete exclusion (`_excluded_on_purpose`: "dial inert — ruling i") is removed in the build commit; athletes seed by the GAME-clock rule (49 BIZ-00005, 9 BIZ-00074).

**Sequencing:** M1 (rng call + name normalization, `applyGameNightMoments.js` only, plain `[Sports]` lines, no dial) is separable and ships first — benched alone on the live-synced bench and deployed before the C110 live fire (2026-10-04), so the A's clinch reaches the players' rows; it is one smoke line. The rest builds behind it. `data/fandom_seed_overrides.json` `_excluded_on_purpose` ("dial inert — ruling i") is trued up in the build commit.

**Acceptance (bench, before PROD):** §2.8 items 1–3 and 6, plus: C110 bench fire — named-name resolution count + unresolved list in the log, no `undefined` pick; every A's staff row carries a `TITLE` or `RUN` line at C110; Oaks staff + band ≥3 Oaks fans carry `Sports-LosingWeek` on an Oaks 0-2 week; a round-typed fixture row leaves `S.sportsSeason` = `playoffs` (contract test); `fandom:` on every TraitProfile after one fold; no `Phase5-GameNightMoments` row in Engine_Errors. **Deploy:** PROD after the C110 live fire (2026-10-04), then the live seed, before C111.

## 3. The feed question (data in §1.3)

Two parts, two owners:

- **His (the sensor):** which round words he will actually type in `SeasonType`. Candidates that match how he already writes Notes — A's: `wild-card`, `division-series`, `league-championship`, `world-series` (alias exists); Oaks: `play-in`, `first-round`, `conference-semis`, `conference-finals`, `finals` (alias exists). If typing rounds is friction, the alternative is the cron reading the round out of Notes — his long-term "talk to a cron" direction, not this build.
- **es's:** splitting depth 5 into rounds in `SPORTS_PHASE_DEPTH_` and whatever `ps(d)=d/6` consumers assume about a 0–6 scale — research §1 has the consumer census (Class A–D); the count is there, the scale is not proposed here.

## 4. Sim calls for Mike

i. **Athletes.** 58 GAME-clock citizens are the subject of the coverage. Do they carry a fandom dial at all (pinned high? excluded from the selector so a player never "attends his own game")? Proposed: excluded from sports-event selection, dial present but inert for them.
ii. **Who starts as a fan.** Accept the thin seed in §2.3 (≈200 separate from 50, the rest earn it over Cycles), or author Tier-1 fandom by hand first? Proposed: accept; author Tier-1 where the populator profile already says so.
iii. **Round words** (§3, first bullet) — which ones he'll type.
iv. **Magnitudes** (§2.2 table) — confirm, or move a number. (agy's review called this mechanism; plan Task 8 item 4 says "poles and magnitudes remain sim decisions", so it stays here — a confirm, not an open question.)
v. **What an Oaks loss costs a fan.** Q7 settled the city's side (an expansion team's losses cost the city little). The fan's side: proposed — a band ≥3 Oaks fan feels every losing week at −1, and −2 once the week falls under the Oaks' own running expectation (≥4 weeks of record; before that, the expansion prior = "losing is expected", so −1 only). A real fan of a bad team gets a little sadder every week; that is the pole firing at ship.

Nothing else in this document needs a ruling.

### Rulings (Mike, 2026-10-02 23:29) — the §4 calls are closed

i. **Athletes — YES, inert dial, excluded from the selector — AND a citizen named on an `Oakland_Sports_Feed` row generates a life event from that row.** Today only `game-result` rows reach the named players, as a plain `[Sports]` going-home line (`phase05-citizens/applyGameNightMoments.js:105–120`), and plain `Sports` moves nothing since engine.201. The cut: every feed row whose `NamesUsed` resolves to a ledger citizen (**by name, never an agent-supplied POPID**) writes one received, signed line on that citizen, routed by the row's `EventType`: `game-result` → `Sports-Played` (composure +1, +1 more on a win week); `injury` → `Sports-Injured` (composure −2, outabout −1); `roster-move`/`trade-recap`/`re-signing` → `Sports-Moved` (openness +2, family −1); `player-feature`/awards → `Reputation` (exists: integrity +3, sociability +2). Fandom itself stays untouched on an athlete. Magnitudes here are mechanism (the athlete's own dials, not the fan's).
ii. **Seed — accept the thin seed; families and any canon fan are seeded as fans.** Household inheritance is already in §2.3. Added: an authored overrides file for the seed pass — every citizen whose canon (NotebookLM / supermemory cards / agent files / LifeHistory) says they follow a team gets an authored `base.fandom` (band 3 = 65, band 4 = 85 for "lives and dies"); the family of an authored fan inherits toward it. research-build builds the overrides list from canon before es runs the pass. **BUILT 2026-10-02 23:55: `data/fandom_seed_overrides.json`** — 22 authored citizens (2 at 85, 1 at 70, 9 at 65, 10 at 60; 19 A's, 3 Oaks, 1 both), every POPID/name pair verified against the C109 ledger. Source (tool: `scripts/scanCitizenPages.js --pattern ...`): the citizen-pages container listed in full (2,077 docs; 604 sports-matching; 66 citizens with team-level hits, classified by hand) plus the audited edition ingest. Exclusions are recorded in the file (`_excluded_on_purpose`): athletes/coaches/GM, beat reporters, Vinnie-relationship-only mentions, 'Coliseum District' as a place, and one same-name-different-person edition fan. The seed pass reads `overrides[].base` into `base.fandom`; families then inherit per §2.3.
iii. **Round words — whatever the dropdown offers.** The dropdown is single-sourced (`utilities/setupSportsFeedValidation.js:57` `SEASON_TYPE_VALUES`, pinned to the engine's readers via `scripts/sportsFeedContract.js`); today it already carries `world-series` and `finals`, and the WS games were typed `playoffs` anyway. So the rounds go **into the dropdown** and he picks them: add `wild-card`, `division-series`, `league-championship` (A's) and `play-in`, `first-round`, `conference-semis`, `conference-finals` (Oaks) to `SEASON_TYPE_VALUES`, the contract test, `SPORTS_PHASE_ALIASES_`/`SPORTS_PHASE_DEPTH_` (es decides the depth split — §3 second bullet). Setup notes on the column should say *pick the round, not `playoffs`, once a series is set*.
iv. **Magnitudes — APPROVED** as in §2.2.
v. **What an Oaks loss costs a fan — APPROVED:** band ≥3 Oaks fan −1 every losing week, −2 under the Oaks' own running expectation after ≥4 weeks of record. The negative pole is live from the first fold.

**Status after the rulings:** nothing in this document is waiting on a ruling. es builds in the §2 order with these five folded; research-build owes the canon-fan overrides list (ii) before the seed pass.

**Verbatim behind the five rulings (Mike, 2026-10-02 23:29):** "1.yes but should be generating life events when they are named in the oakland_sports_feed , 2 - accept thin seed, but families and any canon should be added as fans, 3 - what ever is an option in the drop down menus I use, 4 - approved, 5 - approved"

### Amendment (Mike, 2026-10-03 01:25) — supersedes ruling i's "inert" and §2.3's half-gap
Verbatim: "families start as fans, go, 1 on how you read them is a little off, Athletes have fandom dial and start as fans, the sports-event picker im not sure what that is but when athletes are named on "names used" on "oakland sports ledger" the athlete should be geneating a life event from that and probably all should be getting life events from the weeks success or lack their of. an outside piece is if undocked plays into this fandom?"

Read (es):
- **Families start as fans.** A household member of a seeded fan (base ≥60: canon override, athlete/staff, wager — a zone-only resident sits at 55 and is not a donor) seeds at fan level, not half the gap. Same at mint (§2.6): a child or spouse minted into a fan's household starts as a fan.
- **Athletes carry a live fandom dial and start as fans.** Not inert. They seed at fan level like any canon fan; their dial moves like anyone's.
- **Feed-named athletes get a life event from the row** — ruling i's routing by `EventType` stands.
- **Every athlete gets a life event from his team's week** — a win week or a losing week — named on a row or not. "All" read as all athletes (the sentence's subject); the fans' week lines are §2.2 already.
- **UNDOCKED** — the parent plan already rules it in (plan §4: "What moves it UP: … Undocked engagement"; "One dial covers a citizen's relationship to the city's spectacle"). §2.2 carries `Undocked-Engaged` +1.

### Builder's words (2026-10-07) — live seed GO; overnight §6 02:39 (1) and (2) closed

Asked in plain words: (2) the live seed as built (players/staff 65, canon fans as authored, bettors 60/65 by stadium, fan families lifted, stadium-zone residents 55, everyone else 50; every player the same 65, Paulson included); (2b) who feels the week's success — team + fans + moment-catchers as built, vs every citizen weighted by fandom; (2c) fan-making speed — playoff fever fades, lasting fandom builds over seasons.

**Verbatim:** "2 - go as built, 2b - keep as built, 2c - keep it"

**Reading:** run the live seed as built, once, before C111 (Sun 2026-10-11). 02:39 (1) stands: team + fans + moment-catchers. 02:39 (2) stands: no faster lasting-fan conversion.

## Status log

### engine.280 — status (drained from ROLLOUT, 2026-10-04 / S274)

engine.208 follow-ups (§2.9 "Out of this build"): Sports-Soured/Lifted need a per-piece tone at post-publish (no article tone exists — pipeline seam); Sports-Gutted needs a negative flag on roster rows; Sports-Attended needs an authored ECL attendance tag (rb content lane); refresh the live dropdown (`setupSportsFeedValidation`) after the 208 deploy.

## Changelog
- 2026-10-08 (engine-sheet, S536) — LIVE SEED APPLIED on the builder's go (scratchpad one-shot, dry-run first): 1,025 rows, DialState column read back 1,025/1,025. Fans (>=60) 141 — athlete/staff 58, canon 22, wager 38 + wager-in-zone 10, family of a fan 13; zone residents 132 at 55; 752 at 50. By team as 127 / oaks 12 / both 2. No row carried fandom before. First live fire on the seeded dial: C111.
- 2026-10-07 (engine-sheet, S536) — Builder: live seed GO as built; overnight §6 02:39 (1) reach and (2) fan-making speed kept as built (verbatim under §4 Builder's words 2026-10-07). ROLLOUT engine.208 → section 3, seed before C111.
- 2026-10-02 23:29 (research-build, S522) — Mike ruled all five §4 calls (recorded under §4 Rulings): athletes inert + feed-named citizens get signed life events per EventType; thin seed accepted + families and canon fans authored; round words go into the dropdown; magnitudes and the Oaks fan-side loss rule approved. Document is build-ready for es.
- 2026-10-02 (research-build, S522) — agy read-only review folded ([[2026-10-02-agy-engine-208-draft-review]]: SHIP-WITH-FIXES): `Undocked-Engaged` tag restored to the table (ruled up-mover); Oaks loss made an explicit fan-side sim call §4(v) so the negative pole is live at ship; synthetic 10-Cycle bench added to §2.8; magnitudes kept as a sim confirm per plan Task 8 item 4. Also: §2.5 per-piece tone verified absent (gap named), Q3 expectation baseline added as an es prerequisite §2.7, ClockMode counts relabelled.
- 2026-10-02 (research-build, S522) — initial read-before and proposed cut; feed vocabulary gap measured on the live C107–C109 rows; §6 Q6 summary-row item closed as superseded by the sixth block.
