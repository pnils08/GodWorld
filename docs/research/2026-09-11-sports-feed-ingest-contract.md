---
title: Oakland_Sports_Feed — ingest contract audit
created: 2026-09-11
updated: 2026-09-11
type: reference
tags: [research, engine, sports, ingest, active]
sources:
  - Oakland_Sports_Feed (live tab, 213 data rows, C64–C106) — read 2026-09-11 via lib/sheets.getRawSheetData
  - Ripple_Ledger rows causeType=sports / effectType=sentiment, C101–C106 — the engine's own recorded output
  - phase02-world-state/applySportsSeason.js — both feed readers
  - phase02-world-state/applyCityDynamics.js:427-440, :1648-1700 — the sentiment folds
  - phase07-evening-media/cityEveningSystems.js:419-429 — the only sportsNeighborhoodEffects consumer
  - phase07-evening-media/storyHook.js:575-600 — TRIGGER_HOOKS table
  - utilities/setupSportsFeedValidation.js — the tab's own dead-column notes
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.194 / .202 / .203 / .204 / .205 / .206 / .207 carry the pending state"
  - "[[../plans/2026-09-11-sports-as-a-lived-system]] — the plan this ignited; rulings live there, findings live here"
  - "Sibling research (Mike-direct S446): every sports research file cross-points to the others and all of them feed the plan. Add the back-pointer in the same commit as the new file."
  - "[[index]] — registered here"
  - "[[../SIM_DOCTRINE]] §15 a gate that can't fire, §16 a column that never moves is scenery"
---

# Oakland_Sports_Feed — ingest contract audit

**What this addresses.** The sports feed is a hand-authored ingest: a human fills 20 columns per row, every cycle, and the engine is supposed to turn that into city behaviour. The builder's read — *"I feel like I'm giving a lot and the system is poorly wired, it's like the Initiative_Tracker in that way"* — is correct. This file measures exactly how much of the input reaches an engine number, how much reaches only narrative, and how much reaches nothing. It is the measure-twice substrate behind engine.194.

**Scope.** Live tab as of 2026-09-11: 213 data rows, 48 cycles, 179 A's / 33 Oaks / 1 blank-team.

---

## 1. What the feed actually moves

Two functions read the tab, independently, with **different parsers for the same column**:

| Reader | Line | Produces |
|---|---|---|
| `readOaklandFeedEntries_` | applySportsSeason.js:151 | narrative entries → media/desk packets |
| `processFeedSheet_` | applySportsSeason.js:662 | `S.sportsSentimentBoost`, `S.sportsEventTriggers`, `S.sportsNeighborhoodEffects` |

`S.sportsSentimentBoost` folds into `finalCity.sentiment` at applyCityDynamics.js:1658. That is the **only** path from this tab to persisted city mood.

### Measured output — Ripple_Ledger, the engine's own record

| Cycle | A's record | Sports → city sentiment |
|---|---|---|
| C101 | 90-29 | +0.001 |
| C102 | 107-31 | +0.003 |
| C103 | 124-34 | +0.021 |
| C104 | 126-35 | +0.008 |
| C105 | 127-35 → playoffs | +0.029 |
| C106 | playoffs | +0.028 |

Mean **+0.015** against a **±0.10** clamp. The clamp has never fired in 48 cycles — §15, a gate that can't fire.

Siblings in the same fold: edition coverage ratings clamp **±0.20** (applyEditionCoverageEffects.js:297), initiative implementation **±0.15** (applyInitiativeImplementationEffects.js:437), sports **±0.10**. The newspaper is permitted to move the city twice as hard as its teams.

### The record is the weakest term in its own formula

```
teamSentiment = (base + streakBonus + fanMod) × seasonMultiplier × mediaScale
base = (winPct − 0.5) × 0.06        → hard range ±0.03
streakBonus                          → ±0.02
fanMod (one typed word)              → ±0.02
seasonMultiplier                     → ×0.3 … ×3.0
mediaScale (one typed word)          → ×0.8 … ×1.5
```

A **127-35 (.784) season earns +0.017**. A 162-0 season earns +0.03. The word `high` in FanSentiment earns +0.01 — 60% of what a historic dynasty season is worth. `MediaProfile` then multiplies the whole thing by up to 1.5.

Empirical proof of label-over-team: **C97** (.793, `national`) scored **+0.071**; **C95** (.842, `local`) scored **+0.028**. Better record, 2.5× less city impact.

Meanwhile the *calendar* still pays more than the record: after engine.188, `applySportsModifiers_` (applyCityDynamics.js:434) adds a flat **+0.06** for `late-season` and **+0.35** for `finals`, on the phase alone. The month outweighs the team ~3.5×.

---

## 2. Column-by-column: where each input lands

`ENGINE` = moves a persisted number. `MEDIA` = reaches desk packets / story hooks only. `DEAD` = computed and read by nothing, or read by nothing at all.

| Column | Verdict | Where it lands |
|---|---|---|
| Cycle | ENGINE | row selection + engine.75 aging |
| SeasonType | ENGINE | **parsed twice, two vocabularies** — see §4 |
| TeamsUsed | ENGINE | `normalizeOaklandFeedTeam_`; `nba`→Oaks |
| Team Record | ENGINE | `(winPct−0.5)×0.06`, ±0.03 ceiling |
| Streak | ENGINE | ±0.02 + hot/cold-streak hooks |
| FanSentiment | ENGINE (weak) | ±0.02 sentiment; its nightlife/retail effects are DEAD |
| MediaProfile | ENGINE (dominant) | ×0.8–1.5 on everything |
| HomeNeighborhood | ENGINE | game-day hoods in updateTransitMetrics.js:134, `S.sportsZones`, economicRippleEngine |
| EventTrigger | MEDIA | storyHook TRIGGER_HOOKS — 12 recognized values only |
| PlayerMood | MEDIA | story hooks, desk packets |
| NamesUsed | MEDIA | applyGameNightMoments, desk packets, Anthony slice |
| Notes / Stats / StoryAngle | MEDIA | desk packets, sportsStreaming, sportsSubstrate |
| EventType | MEDIA | desk packets |
| **EconomicFootprint** | **½ DEAD** | `ne.retail += ×0.15` **(dead)**; `ne.traffic += ×0.10` → crowd-count only |
| **CommunityInvestment** | **DEAD** | `ne.communityEngagement += ×0.15` — nothing reads that field |
| **FranchiseStability** | **DEAD** | `ne.retail += ×0.10` — nothing reads that field |
| **VideoGame / VideoGameDate** | **DEAD** | the tab's own validation marks them "DEAD COLUMN — leave blank"; still filled on 32–45% of A's rows |

**The `sportsNeighborhoodEffects` truncation.** `processFeedSheet_` computes four per-hood numbers — `traffic`, `retail`, `nightlife`, `communityEngagement`. Repo-wide there is exactly one consumer, `cityEveningSystems.js:420`, and it reads **only `.traffic`**, only to bump a crowd count. `retail`, `nightlife` and `communityEngagement` are computed every cycle and read by nothing. Three hand-filled columns feed exclusively into that dead branch.

---

## 3. Is the input varying? Mostly not.

Fill rate (non-blank and not `-`), and the values actually used:

| Column | A's | Oaks | Values in use |
|---|---|---|---|
| FanSentiment | 46% | 94% | A's: `high`×80, `medium`×2, `low`×1 · Oaks: `medium`×16, `high`×14, `low`×1 |
| FranchiseStability | 45% | 94% | A's: `stable`×80 (**100% constant**) · Oaks: `uncertain`×21, `stable`×10 |
| EconomicFootprint | 45% | 94% | `growing`, `steady` |
| CommunityInvestment | 45% | 94% | `active`, `passive` |
| MediaProfile | 46% | 91% | `national`, `regional`, `local` |
| Team Record | 55% | 45% | A's 72/73 parse to a win% · Oaks **13/31** |
| PlayerMood | 56% | 100% | 16 distinct |
| EventTrigger | 53% | 94% | 27 distinct |
| HomeNeighborhood | 54% | 100% | 16 distinct |

Three findings:

1. **The A's "franchise block" is a constant, not a signal.** `FranchiseStability=stable` on 80 of 80 filled rows; `FanSentiment=high` on 80 of 83. Per §16 that is scenery. In the sentiment formula it is worse than scenery — a permanent +0.01 always-on lift wearing a signal's clothes (§15, the same shape engine.188 removed from the calendar).
2. **`medium` parses to zero.** `parseFanSentiment_` recognizes 13 words; `medium` is not one. 18 rows — 16 of them Oaks — type a value that evaluates to 0. The Oaks' 94% fill rate is roughly half no-op.
3. **The one column that genuinely varies is wired to a dead field.** Oaks `FranchiseStability` swings `uncertain`(21)/`stable`(10) — real authored signal — and it lands in `ne.retail`, which nothing reads.

---

## 4. Defects found

**D1 — SeasonType has two parsers with different vocabularies.**
`canonicalSportsPhase_` (applySportsSeason.js:296) has an alias table (`world-series`→championship, `summer league`→preseason, …) and fails closed to `off-season` on anything unknown. It feeds the city phase. `processFeedSheet_` (:761-772) re-parses the same cell with a bare `indexOf` ladder and **no alias table**, feeding sentiment. Consequence: `summer league` scores ×1.0 in the sentiment path — full regular-season weight for exhibition ball — while the phase path correctly reads it as preseason.

**D2 — The postseason zeroes the season.** C105/C106 carry `Team Record = 0-0` because the postseason starts a fresh record. `parseWinPercentage_` returns 0-0 → `null` → base 0. So the ×2 playoff multiplier multiplies nothing, and a 127-win season evaporates the moment October arrives. The +0.029 in C105 is almost entirely the word `high`, doubled.

**D3 — Field carry-forward never expires.** `processFeedSheet_` scans every row ever written and applies "last non-empty wins" per team. engine.75 ages out the *team* (`state.cycle !== currentCycle` → skip) but never the *fields*. An A's `MediaProfile` set at C85 is still in force at C106 if no later row re-states it. At 46% fill this is the normal case, not the edge case — roughly half of every cycle's sentiment is computed from values authored in an earlier cycle.

**D4 — `-` is a value, not a blank.** The guard is `if (record) ts.record = record`. A literal `"-"` is truthy, so it overwrites a real prior value with an unparseable one. Used in 42 distinct Team Record strings and heavily in Streak.

**D5 — 44% of EventTrigger entries reach nothing.** `TRIGGER_HOOKS` recognizes 12 values. The feed uses 27. 71 rows produce a story hook; **55 produce nothing**: `breaking-news`×16, `awards`×6, `draft`×4, `community outreach`×4, `pre-season`×4, `playoffs`×3, plus 18 one-offs (`blockbuster-trade`, `all-star`, `call-up`, `closer-battle`, `quiet-excellence`…). These are good, specific authored signals landing on the floor. Note `pre-season` and `playoffs` are *SeasonType* words typed into the trigger column — a vocabulary the author had no way to know.

**D6 — Dead columns still solicit input.** `VideoGame` / `VideoGameDate` are marked "DEAD COLUMN — leave blank" by the tab's own validation (utilities/setupSportsFeedValidation.js:171) and rejected by `sportsFeedContract.js:277`, yet carry data on 32–45% of A's rows.

**D7 — No closed vocabulary at the point of entry.** Every ENGINE-class column is matched against a hard-coded word list in code, and none of those lists is surfaced in the tab. The author cannot see that `medium` scores 0, that only 12 triggers fire, or that `-` is destructive. Every defect above is a symptom of this one.

---

## 5. A's vs Oaks — they are two different contracts

They are not filled the same way and the engine does not treat them the same way.

- **A's** = a record-driven contract. 72/73 rows parse to a win%, and the franchise block is a constant. The engine has real data and a formula that caps it at ±0.03.
- **Oaks** = a narrative contract. Only 13/31 rows parse to a win%; PlayerMood/HomeNeighborhood/EventTrigger are 94–100% filled. The engine has almost no numeric data and a rich narrative one it mostly can't use.

Net effect on the city: in C105 the Oaks going **0-3 in preseason** pulled city sentiment **−0.016**, larger in absolute terms than the A's 127-win season was permitted to push it up. A preseason loss for the expansion team outweighs a dynasty. That is an artefact of the formula's shape, not a sim decision anyone made.

---

## 5b. The casino is the proof (added S446)

`Casino_Ledger` carries **12 live sports wagers** — `MarketFamily=sports`, `MarketId=sports:as`, `EventId=next-as` — placed by named citizens (POP-00214, POP-00335, …) at C106. **All 12 are `open`. Not one has ever settled.**

`casinoResolveSports_` → `casinoParseSports_` (phase05-citizens/casinoLedgerEngine.js:147) needs a feed row with `EventType='game-result'` **and** a parseable W/L `Streak`, matched to the franchise. Measured: 33 `game-result` rows across 48 cycles, only **20** with a parseable streak, and **C106 carries no A's `game-result` row at all** — the A's last one was C105, before that C95. With no settleable event the resolver returns `carry`, every cycle, forever.

This is the ingest defect in its purest form: a fully-built mechanism that took real citizens' money and has been silently stuck since it shipped, waiting on a row the tab never told the author to write.

---

## 5c. The channel was switched off (added S446, fourth block)

The sentiment scalar this audit opened with is **not** the engine's main sports channel. `S.sportsSeason` is — read in **64 files across every phase** (counted). And it is feed-derived, not calendar-derived (`applySportsSeason.js:98`; the `Sports_Calendar` tab is genuinely dead, its only codebase reference a comment recording its S139 removal).

`applySportsSeason.js:110` sets `S.sportsAtmosphereEnabled = false` whenever the source is the feed — S302's ruling that *"feed rows are Mike's game logs, not a license to synthesize city-wide sports mood."* The flag goes true only via a `World_Config` key `sportsState_Oakland`. **World_Config has 104 rows and zero `sportsState*` keys**, so the flag has been permanently false on live.

Nine consumers gate on it and read an empty string every cycle — `applySeasonWeights:34`, `calendarChaosWeights:33`, `buildCityEvents:75`, `generateGameModeMicroEvents:91`, `runEducationEngine:159`, `updateNeighborhoodDemographics:97`, `deriveDemographicDrift:69`, `applyDemographicDrift:123`, `generateGenericCitizenMicroEvent:79`. City events, demographic drift, micro-events, season weights, chaos weights and education are structurally blind to sports. Not mis-tuned — switched off.

Of 64 files, 9 are gated and 55 ungated; the counted branch census is championship 78 / playoffs 60 / post-season 27 / late-season 16 / off-season 2 / world-series 1 / regular 1 — 165 of 185 tests (89%) at the three extremes. Crime linkage does exist (`generateCrisisSpikes.js:191`, SAFETY × championship) but only at that extreme — correcting §2's "crime: no linkage" line, which was scoped to the crime-metrics file alone.

And `deepestSportsPhase_` resolves the city phase as the **max depth across franchises**: live C106, A's `playoffs`(5) + Oaks `preseason`(1) → the city reads `playoffs`. The deeper team's phase is permanently the city's, and the other franchise is erased.

---

## 6. Extraction — what this means for the build

- **The ingest is a contract with no schema → every hand-authored tab needs a closed vocabulary surfaced at the point of entry.** Same failure class as Initiative_Tracker. The fix is not more parsing leniency; it is publishing the vocabulary into the tab (data validation + a legend) so authored effort lands by construction.
- **Constant columns are worse than empty ones → audit every authored column against §16 before wiring it.** A column that is 100% one value is an always-on tax the formula reads as signal.
- **A computed field with no reader is invisible waste → grep the consumer before adding a term.** `retail`/`nightlife`/`communityEngagement` have been computed every cycle since v3.0 and read by nothing.
- **Authored effort should be measurable → fill-rate × reach is the metric.** Any ingest tab can be scored this way; this audit's method is reusable for Initiative_Tracker, Reflection_Intake and NBA/MLB_Game_Intake.
- **Two parsers for one column is a latent divergence → one vocabulary per column, one parser.** D1 was invisible until measured.
- **A stuck mechanism is silent → any market/queue that can return `carry` needs a staleness alarm.** The casino carried 12 wagers indefinitely and nothing anywhere reported it. Applies to every deferred-resolution surface in the sim.
- **Repurpose before adding → a dead column is cheaper to revive than a new column is to introduce.** Mike's ruling: `VideoGame`/`VideoGameDate` becomes the week record rather than adding a games-played column. Cuts the author's per-row cost instead of raising it.
- **A guard against bad input can become a guard against ALL input → any `enabled` flag needs a live check that something sets it true.** S302 gated feed-driven sports atmosphere to stop invented playoff mood; the enabling key was never added to World_Config, so the gate has been total. Nine generators went dark and nothing reported it.
- **Read the column, never the column NAME → a field's meaning is not its label.** `TraitProfile` was asserted in the plan to be authored character distinct from the dials; it is the dials, rounded, written by the same engine. Caught by Mike, not by the audit.
- **Count before writing a number → "~40 files" was an eyeball; the real figure is 64.** An estimate stated in the same register as a measurement makes the whole document unauditable.
- **Find the channel before tuning the scalar → grep the `S.` field's consumer count first.** This audit opened on a ±0.10 sentiment scalar and the real channel was a string read in ~40 files.
- **Static is not the same as stale → check whether the constant is WRONG or merely constant.** `S.sportsZones` being fixed is correct (stadiums do not move); the defect was that nothing varied the intensity driven into it. Corrected by Mike S446 after this audit initially flagged the constancy itself.

## Not applicable / hazard

- **Don't widen the clamp to fix magnitude.** Same ruling as engine.193 — fix the generator, not the threshold. Raising ±0.10 with the record still capped at ±0.03 would just amplify the typed labels.
- **Raising the boost changes citizen behaviour too.** `generateCitizensEvents.js:1707` computes game-night intensity as `min(1, |sportsSentimentBoost| / 0.15)`. That saturates at 0.15 — any magnitude increase pins citizen game-night intensity at max. Must be repriced in the same change.
- **Historical replay before ~C103 is not reconstructible.** A replay of the current tab matches the engine's recorded output exactly on C103/C104/C106 but diverges on C101/C102/C105, because the deployed code version at each past cycle is unknown and rows may be appended after the cycle they describe has fired. Ripple_Ledger is the record of what happened; replay is only valid for what the current code does with the current tab.

**Verdict:** `adopt` — engine.194 was scoped as a magnitude question ("should the record swing harder"). This audit shows magnitude is downstream of a broken contract: the record is the weakest term in its own formula, three columns feed dead fields, 44% of triggers land nowhere, and half the sentiment is computed from stale carry-forward. The contract gets fixed first.

**Ignited plans:** [[../plans/2026-09-11-sports-as-a-lived-system]] — engine.194 (reprice), engine.202 (dead-field wiring + vocabulary in-tab), engine.203 (parser merge), engine.204 (feed drives geography), engine.205 (game-day economy), fandom unfiled pending Mike.

---

## Applications (living)

- 2026-09-11 — Initial audit; scoped engine.194, filed engine.202 / engine.203.
- 2026-09-11 — Ignited [[../plans/2026-09-11-sports-as-a-lived-system]]; engine.204 / .205 / .206 filed off traces F1-F4.
- 2026-09-12 — §5b casino trace added (F5); engine.207 filed. F1 corrected per Mike — static zones are the right shape, missing intensity is the defect.
- 2026-09-12 — CORRECTIONS after Mike challenged the premise: `TraitProfile` is the readable face of `DialState`, not a separate layer (was asserted from the column name, never read — wrong); `~40 files` replaced with the counted 64; branch census counted (165/185 at the three extremes). Two extraction principles added on the failure itself.
- 2026-09-12 — §5c added: `S.sportsAtmosphereEnabled` permanently false on live (World_Config has zero `sportsState*` keys), nine consumers dark; `S.sportsSeason` is the real channel at ~40 files; ungated consumers listen only for championship/playoffs; `deepestSportsPhase_` takes the max across franchises. `Sports_Calendar` confirmed dead per Mike. engine.210/.211 filed. Corrected the §2 "crime has no sports linkage" line.
- 2026-09-12 — Dial-system trace (F6 in the plan): `DialState` is ledger **column 48**, JSON `{base,mood,streak}`, 919/930 rows — a ninth dial costs no schema change. Sports' whole dial footprint is `'Sports': {outabout:1}` (citizenDialMap.js:156). `DIALS` array duplicated across six files. Fandom RULED as dial 9 → engine.208; franchise weight as a drifting number → engine.209.

## Changelog

- 2026-09-11 — Initial audit (S446). Method: full-tab fill/variance analysis + consumer grep per column + Ripple_Ledger cross-check of replayed sentiment.
- 2026-09-12 — Added §5b (casino sports market stuck since it shipped: 12 open wagers, 0 settled, no A's `game-result` row at C106). Corrected the F1 framing after Mike's ruling: a static stadium zone set is correct; the defect is uniform intensity and stadium-only reach. Four extraction principles added.
