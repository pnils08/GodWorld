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
| Authored Tier-1 | ~GAME-clock 58, MEDIA 44, CIVIC 53 | Top-tier is authored, never pool-drawn — Tier-1 fandom is a value someone writes, not a roll. |
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
| `Sports` (plain) | unchanged | {} | — |

Only **received** events move the dial (Task 8 item 4) — candidate rows and texture never do. A losing Oaks preseason costs a fan −2 a week against an expansion expectation that mostly reads "as expected" → near zero (Q3/Q7 fall out without a rule).

### 2.3 Seed (one explicit pass, bench first, then live under the usual one-confirm)
`base.fandom` = 50 + (sports wager on record +10) + (resident of a stadium zone +5) + (household member already above 60: inherit toward their value, half the gap) ; Tier-1 authored values from the populator's profile field where one exists, else the same formula. Everyone else **stays at 50 and earns their fandom**. A `scripts/seedFandomDial.js` with `--dry-run` printing the distribution; the band histogram goes into the bench proof. The script writes `DialState` only — `TraitProfile` re-renders on the next fold.

### 2.4 The selector
`generateCitizensEvents.js:2904` region: for a candidate whose primary route is Sports, multiply `weightMod` by `bandMultiplier_(c,'fandom')` (0.5 … 1.5 — `citizenMemory.js:217`, already the back-arc consumer) × reach(round) × franchise weight (1 until engine.209). ECL DSL (`loadEventContentLedger.js:64`): add `fandom` as a `num` field alongside warmth/drive so content rows can require `fandom>=60` (a playoff-bar scene) or `fandom<40` (someone dragged along). Proof: two otherwise-equal fixtures at fandom 25 and 85 draw different sports-event distributions (Task 8 item 3).

### 2.5 Cron tone → dial (the ruled feedback loop)
Extend the post-publish step that already writes `E<edition>-S<n>` citations (`scripts/enrichCitizenProfiles.js`): for each sports-desk piece, read the tone the gate already computes (the sift/Rhea sentiment field — the exact field to be named by es from the publish packet, not here), and append `Sports-Soured` / `Sports-Lifted` LifeHistory lines to citizens in fandom band ≥3 who live in the city (all tracked, or capped at a draw of N — substrate). That makes the desks the sensor of the fans' mood, which is the ruling. No new channel; one more emitter on an existing seam.

### 2.6 Inheritance at mint
The `Phase5-Advancement` intake (the seam where engine.278 reads the carried employer): a minted child or spouse joining a household takes `base.fandom` from the household head's current value minus 10, floor 50.

### 2.7 Substrate calls for es (not sim)
- `MOOD_DECAY` per-dial or uniform — the 203d "slow fade" is about the **city's** sports state; a fan's upset fading at 0.8/Cycle (gone in ~4) may be right or may be fast. es rules; if per-dial, fandom gets its own constant.
- Reach(round) needs the §3 vocabulary; until it lands, reach = depth/6 off the existing table.
- `Hash` churn on first fold: every TraitProfile rewrites once. Note it in the smoke so nobody reads it as a defect.

### 2.8 Acceptance (dated)
1. Bench: 9-dial round-trip, no throw on 963 old rows, `fandom:` on every TraitProfile after one fold.
2. Bench: fixtures at fandom 25/85 draw different sports-event distributions.
3. Bench: an Oaks L-streak week emits `Sports-Loss` to band ≥3 Oaks fans and **moves them down** (the negative pole fires on day one).
4. Live, first fold + 10 Cycles: band histogram is not one blob — at least three bands populated, middle band under 80% (engine.197 criterion 4).
5. Live: a playoff week wakes at least one citizen whose only wake reason is fandom (engine.201).

## 3. The feed question (data in §1.3)

Two parts, two owners:

- **His (the sensor):** which round words he will actually type in `SeasonType`. Candidates that match how he already writes Notes — A's: `wild-card`, `division-series`, `league-championship`, `world-series` (alias exists); Oaks: `play-in`, `first-round`, `conference-semis`, `conference-finals`, `finals` (alias exists). If typing rounds is friction, the alternative is the cron reading the round out of Notes — his long-term "talk to a cron" direction, not this build.
- **es's:** splitting depth 5 into rounds in `SPORTS_PHASE_DEPTH_` and whatever `ps(d)=d/6` consumers assume about a 0–6 scale — research §1 has the consumer census (Class A–D); the count is there, the scale is not proposed here.

## 4. Sim calls for Mike

i. **Athletes.** 58 GAME-clock citizens are the subject of the coverage. Do they carry a fandom dial at all (pinned high? excluded from the selector so a player never "attends his own game")? Proposed: excluded from sports-event selection, dial present but inert for them.
ii. **Who starts as a fan.** Accept the thin seed in §2.3 (≈200 separate from 50, the rest earn it over Cycles), or author Tier-1 fandom by hand first? Proposed: accept; author Tier-1 where the populator profile already says so.
iii. **Round words** (§3, first bullet) — which ones he'll type.
iv. **Magnitudes** (§2.2 table) — confirm, or move a number.

Nothing else in this document needs a ruling.

## Changelog
- 2026-10-02 (research-build, S522) — initial read-before and proposed cut; feed vocabulary gap measured on the live C107–C109 rows; §6 Q6 summary-row item closed as superseded by the sixth block.
