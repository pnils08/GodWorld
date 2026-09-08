---
title: The dials as a game — what feeds them, what reads them, and why they decide nothing yet — research
created: 2026-09-08
updated: 2026-09-08
type: reference
tags: [research, engine, citizens, dials, contests, citizen-loop, active]
sources:
  - builder direction 2026-09-08 (S437, engine-sheet chat) — "go deep into traitprofile dials, what feeds them, what changes them … how these dials make this a game … how the dials can determine outcomes and decide between 2 wanting the same thing"
  - docs/research4_1.md:196-239 — the four source games (Dwarf Fortress, RimWorld, Crusader Kings 3, Victoria 3)
  - docs/plans/2026-05-31-compression-tag-triage.md — engine.31, the 7-dial design + §Research lineage
  - docs/engine/ENGINE_COUPLING_MAP.md §The spine, §Two layers, §Residuals — the S277 behavioural read
  - five engine-wiring cards run S437 (DialState column, getCitizenDialBands_, compressLifeHistory_, runManeuverEngine_ + contest survey, lib/citizenDials.js cron readers) — every file:line below comes off a card or a direct read the same night
  - output/simulation_ledger_snapshot.jsonl (C106, 2026-09-07 20:04) — the live measure
  - Reflection_Intake live read 2026-09-08 (lib/sheets.js) — the drain measure
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — research.28"
  - "[[../SIM_DOCTRINE]] — §2 causes then dice, §10 the lottery, §11 marriage, §The test"
  - "[[../plans/2026-09-02-bloodline-ascent]] — engine.157 (ambition is a read, posture is a multiplier)"
  - "[[2026-07-04-dial-essence-filter-layer]] — research.22: raw floats never enter a prompt"
  - "[[../plans/2026-06-19-living-city-full-population-coverage]] — engine.38 Phase B, the held negative pole"
  - "[[index]] — registered same commit"
---

# The dials as a game — what feeds them, what reads them, and why they decide nothing yet — research

**Source:** the engine itself, read through five wiring cards and a live C106 measure, against the four games the dial model was taken from (`docs/research4_1.md:196-239`).

**What this addresses:** the builder's question (S437): now that the economy is logical, what do the dials actually do, how do the source games make traits a *game*, and how can the dials drive what a cron does and decide between two citizens who want the same thing.

## The verdict, first

In the three games the dials came from, traits do three things that make them play rather than texture: they **create conflict** (two characters with opposed traits get different outcomes from the same situation), they **cost** (a trait closes doors as well as opening them: a CK3 craven can't lead the charge, a DF dwarf whose values hate the job breaks under it), and they **resolve contests** (a CK3 scheme succeeds by the schemer's skill against the target's; a RimWorld pawn's traits decide who cracks first). GodWorld's dials today do none of the three. They are a 0.5–1.5 frequency knob on positive domain events (`utilities/citizenMemory.js:53`), read by 11 engines at the selection layer only. No dial gates an outcome. No dial costs anything. No dial ever beats another citizen's dial. And the feed under them is broken in a way that makes the whole population converge on the same saint. Everything below is the repair, in the order it has to land.

## What the four games do, mapped to what is live

| Game | The mechanic taken | Live? | Where |
|---|---|---|---|
| Dwarf Fortress | events nudge a personality; a sustained pattern hardens permanently; bounded | Partly. Nudge + harden + clamp live in `applyEvent_` (`utilities/citizenMemory.js:78-92`). The *reliving* (a memory revisited with fresh stress, promoted 1-in-3 to core) is not built; the fold applies each event exactly once. | `utilities/compressLifeHistory.js:1373` |
| Crusader Kings 3 | traits multiply event impact; modifiers decay with time | Half. The band multiplier is the selection-layer knob (11 engines). The decay is **not live**: `settleCycle_` (`MOOD_DECAY 0.8`, `citizenMemory.js:146-152`) is exported with zero production callers; the fold zeroes mood outright (`compressLifeHistory.js:1191`). There is no temporary swing between folds. | card: compressLifeHistory_ |
| Victoria 3 | pressure accumulates, a threshold flips structure | Half. The harden streak is the threshold (`HARDEN_STREAK 3`, `HARDEN_FRACTION 0.4`). But crossing a band changes only a probability multiplier; nothing structural flips on a band crossing. | `citizenMemory.js:37-38` |
| RimWorld | the world expects damage and engineers recovery at the population level | Not built. The conduct engine has a hood-grain crime counterweight; there is no citywide floor because there is no citywide damage yet. | coupling map §Residuals 4 |

## The measure (live C106, 922 rows, 911 with a DialState)

**The dials sit on one pole.**

| dial | <20 | 20–40 | 40–60 | 60–80 | 80+ |
|---|---|---|---|---|---|
| drive | 0 | 0 | 677 | 157 | 77 |
| sociability | 0 | 0 | 682 | 121 | 108 |
| warmth | 0 | 0 | 834 | 77 | 0 |
| openness | 0 | 0 | 797 | 106 | 8 |
| composure | 0 | 2 | 751 | 153 | 5 |
| integrity | 0 | 0 | 895 | 16 | 0 |
| family | 0 | 0 | 655 | 180 | 76 |
| outabout | 0 | 0 | 894 | 17 | 0 |

- 546 of 911 citizens are neutral on all eight dials. Median deviation from 50 across the eight is 6.6; the 90th percentile is 122.
- Nobody is below 40 on any dial except two on composure. The negative pole of the model does not exist in the population. `crimeReachable` (integrity band −2, `compressLifeHistory.js:1125-1132`) has never been true for anyone, so the conduct engine's transgression path (`runConductEngine.js:176-184`) has fired three times in the world's history.

**The feed is one-signed.** 15,992 LifeHistory lines on the live ledger resolve through `nudgesForEvent_` to 14,450 net-positive nudges, 366 net-negative, 1,176 zero. Tag counts: Neighborhood 3,086 (sociability +3 each), Daily 2,726, Personal 1,961, PrevEvening 1,165, Civic 1,129. Negative tags on live: Transgression 3, Setback 7, Rivalry 5, Hospitalized 2, Critical 1, Divorce 0, and the whole engine.38 B3 ordinary-bad vocabulary (Friction/Strain/Stumble/Spat/Disappointment/Ailment, mapped at `utilities/citizenDialMap.js`) at zero: the map has them, no generator emits them.

**The fold reaches a quarter of the city, and only on trim.** `compressLifeHistory_` is the sole production writer of dial base and streak (card; the only other DialState writers stamp chaos exposure at `chaosCarsEngine.js:320` and the maneuver posture at `maneuverEngine.js:275`). It folds only the entries that age out past `KEEP_RAW_ENTRIES = 20` (`compressLifeHistory.js:78`; `foldAgedOutEntries_` returns 0 when `filtered.length <= keepCount`, `:1386`). The median citizen holds 17 raw lines. 221 citizens have more than 20 lines; 218 clear the wake gate's `deviation ≥ 60` (`lib/wakePerception.js:26`). Those are the same people: the ones with archive-era history the S256 backdate replayed. The face (`TraitProfile`) was rewritten for 607 citizens at C106 (`Updated:c106` stamps), which looks like activity, but the face is derived from a base that did not move.

**The cron layer is the only negative pole.** Reflection_Intake on live: 1,161 rows, drained by Phase 9 through C105 (C105: 174 `applied=yes`; C106's 25 rows wait on C107). Affects: Content 409, Resentful 263, Frustrated 151, Excited 102, Anxious 90, Calm 76. The citizens' own reflections carry the balance the engine lacks, and they land at `REFLECTION_MULT 0.45 × REFLECTION_ACCRETION_FRAC 0.5` (`compressLifeHistory.js:126-127`): a Resentful reflection moves composure by −0.675. Not a bug (builder, 2026-09-08): the 12 rows stamped `Cycle 119` date from 2026-07-07, are already drained into canon, and the builder cleans the sheet by hand.

**What reads a dial, and what it does with it.**

- 11 engines call `getCitizenDialBands_` (card): career, education, household, neighborhood, relationship, conduct, generational milestones, youth, generic-micro, game-mode-micro, citizens-events. Every one applies a pre-cap frequency multiplier; conduct alone uses a band as a gate (`!dialBands` skips; composure ≤ −1 → ×1.25).
- The maneuver phase reads drive + openness into an ambition read, sets climb/hold/retreat, and multiplies five existing rolls (casino, solo door, home purchase, relocation, cross-field willingness) (`maneuverEngine.js:214`, consumers at `casinoLedgerEngine.js:693`, `householdFormationEngine.js:387`, `generationalWealthEngine.js:1689`, `migrationTrackingEngine.js:681`, `runCareerEngine.js:1221`). Live C106: 195 climb / 39 retreat.
- 22 engines and generators read no dial at all (card list). Among them are the ones that decide outcomes: household formation, the bond engine, business dynamics, migration, civic initiatives, elections, education-career intake, generational wealth (one drive term at `:741` aside).

**Where two citizens want the same thing, character never decides.** Eight resolution sites (card):

| Contest | Resolved by | File |
|---|---|---|
| Job slot, same field | poorest income band first, then credential, then POPID | `runCareerEngine.js:159-166, :1189` |
| Job slot, new adults | random among businesses with room; first in row order reserves it | `educationCareerEngine.js:1263-1280` |
| Spouse-merge target | authored ID, then larger household | `householdFormationEngine.js:648-653` |
| Romantic triangle | no winner; a RIVALRY bond at intensity 5 between the suitors | `bondEngine.js:2529-2560` |
| GC marriage | scarcity roll, then same-hood + closest age | `bondEngine.js:2451-2463` |
| Family-match lottery | two reels, alignment or nothing | `processAdvancementIntake.js:1638-1704` |
| Heritage storefront stake | wealthiest living member | `generationalWealthEngine.js:2416-2427` |
| Civic seat challenger | tier-weighted random draw | `runCivicElectionsv1.js:282-296` |

**The cron side reads a phrase and discards the rest.** Wake, exchange and voice build one identity line from `disposition()` (`scripts/citizen-wake.js:199`, `citizen-exchange.js:107`, `citizenVoice.js:132`); the wake weights selection by deviation (`citizen-wake.js:188`). Raw floats never reach a prompt (research.22 holds everywhere the lib is required). The desk pipeline computes the phrase per quote and never renders it (`cron-desk-run.js:1085` renders name + quote only); `world_state.json.dispositions` has no reader. The posture and goal the maneuver phase writes to `DialState.maneuver` reach no cron.

## Extraction — the design, as ordered cuts

Each cut is a FIX inside a file that exists. No ninth dial (engine.157 ruling: ambition is a read). No raw number in a prompt (research.22). One unbenched change in flight. The doctrine test on every line: does a row drive a fate the builder didn't choose.

**Cut B, first — the negative pole from causes (engine.38 Phase B, unblocked by S436).** The S436 economy made the collisions real numbers: `DebtLevel`, income against `RentShare`, unemployment, `DisplacementRisk`, casino losses, business decline. The engines that already compute those numbers emit the ordinary-bad tag at the moment the collision is recorded (Strain when DebtLevel sits at or above the retreat bar; Friction when rent takes more than the hood's share of income; Stumble when a citizen goes a cycle unemployed; Setback on a money loss, both directions of `[Money]` already mapped `c0820e79`). No new generator. Same cut, retune the ambient: Neighborhood/Daily/Personal/PrevEvening are 8,900 of 16,000 lines and all positive; the engine.31 plan said texture tags *tint* (`near-zero nudges`), and sociability +3 per Neighborhood line is the saint-maker. Ambient goes to ±1, and a Neighborhood line in a hood under pressure tints composure −1 instead of sociability +3 (the hood pulse already knows the sign). Doctrine §3: the world is allowed to hurt people. Files: `utilities/citizenDialMap.js`, the emitting sites in `generationalWealthEngine.js` / `migrationTrackingEngine.js` / `runCareerEngine.js` / `casinoLedgerEngine.js`.

**Cut A, with B, never alone — fold every cycle behind a watermark, and let mood decay.** `DialState` gains `folded` (the last folded cycle); each cycle the fold applies every entry newer than the watermark and leaves the 20-line raw window and the 5-cycle face cadence untouched, so the wake journal reads what it reads today. That reverses the S253 "fold once on trim, no watermark" choice with the reason above: the choice left 75% of the city with dials nothing has ever moved. Mood is then persisted and `settleCycle_` is finally called (the CK3 decay, 0.8/cycle), so an event is a swing that fades unless the pattern holds. Hazard that fixes the order: if A ships without B, 900 citizens harden toward saint within a few cycles on the current diet. Files: `utilities/compressLifeHistory.js:462-601` (the per-row fold), `serializeDialState_` (`:1184`), `utilities/citizenMemory.js:146`.

**Cut C — dials close doors (one band read in each outcome engine that has none).** Not more frequency knobs; gates and costs at rolls that already exist:
- Relocation: openness −2 refuses the misfit lane (the rich homebody stays); openness +2 moves at a lower income threshold. `migrationTrackingEngine.js:681`.
- Casino: integrity +2 does not sit down; composure −2 draws the tilt stake band. `casinoLedgerEngine.js:685-697`.
- Bonds: warmth decides whether a bond is *maintained* (doctrine §11: marriage is years of a maintained bond, so warmth is the maintenance term on intensity drift, not on formation). `bondEngine.js` intensity update.
- Business: an owner's composure decides whether the business survives a bad quarter; drive whether it expands. `applyBusinessDynamics.js`.
- Civic: integrity scales scandal odds on the engine.94 27.10 ceiling. `runCivicElectionsv1.js:334`.
Each: does the row drive a fate? A principled citizen who never gambles, a homebody who turns down the move, a warm spouse whose marriage holds through the debt year.

**Cut D — contests resolved by character (the CK3 scheme-against-resistance shape).** One helper in `utilities/citizenMemory.js` (the dial lib): `contestRoll_(ctx, aBands, bBands, weights)` scores each side from signed bands × domain weights, turns the gap into a bounded probability (working cut: `p(a) = 0.5 + 0.08 × gap`, clamped 0.2–0.8), and rolls `ctx.rng`. Doctrine §2: causes, then dice. The underdog always can win; the favourite usually does. Applied at:
- Job slot: the need sort stays (poorest first is the cause); among the candidates the sort ties, drive + composure against credential decide. `runCareerEngine.js:1189`, `educationCareerEngine.js:1270`.
- Heritage storefront: among members over the stake floor, drive + integrity, not wealth alone. `generationalWealthEngine.js:2423`.
- Civic challenger: sociability + integrity weight the draw. `runCivicElectionsv1.js:282`.
- The romantic triangle, the flagship: the rivalry bond still forms at collision (`bondEngine.js:2550`); over the following cycles warmth + sociability contest which suitor's bond matures, and the loser keeps the rivalry. Two citizens wanted the same person; character and dice said who.
Fenced off by doctrine §10, explicitly: the family-match lottery (`processAdvancementIntake.js:1638`) and the GC marriage lottery (`bondEngine.js:2396`) stay two reels and a miss. No character scan at a GC door, ever. The spouse-merge target is structural, not a want; untouched.

**Cut E — the cron reads the game, not the numbers.** Beside the disposition phrase, three fact lines in every wake/exchange/voice prompt: the goal (establish / home / wealth / tenure / revive), the posture (climb / hold / retreat), and what the cycle threw (the tags folded since the last wake, as words). All three come off `DialState.maneuver` and LifeHistory through a `stance()` sibling of `disposition()` in `lib/citizenDials.js` (the engine.156 wake seam already filed). The wake rotation gets a second special slot beside the voiced one: a citizen whose posture changed this cycle (a `[Maneuver-*]` line fired) wakes that day, so the cron speaks at the moment the game state moved. Write-back stays bounded: the classifier's `Resolves` column (K, engine.101) already exists; the drain reads a resolve that names an action as a one-notch, one-cycle posture push (a hold that says "I'm looking for a bigger place" reads climb next cycle, then decays). The goal never moves off the rung (engine.157). Also: render the phrase the desk pipeline already computes (`cron-desk-run.js:1085`), and drop or read `world_state.dispositions`.

**Cut F, last — the RimWorld floor.** Once B is live and the city can hurt, a citywide counterweight: when the negative-tag share or `Crime_Metrics` crosses a bar, the ambient tint leans positive. Filed, not designed, until B shows what damage looks like.

**Bench proof for A+B (one re-synced C106, 12 cycles):** the all-neutral share falls from 60%; composure and integrity show non-zero counts below 40; no citizen pins at 0 or 100; the wake-eligible share rises without touching the gate; `crimeReachable` becomes true for someone. For D: log every contest with both scores and the outcome; the underdog wins 20–40%.

## Not applicable / hazard

- **Ordering.** A without B is the one way to make this worse. B lands first or in the same bench cycle.
- **Doctrine §10** fences two of the eight contests. Kimi should hold that line on review.
- **No ninth dial, no raw floats in a prompt, no new file.** All three are rulings.
- **Harden semantics change under per-cycle folding.** Today a streak counts consecutive same-direction events inside one batched fold; with 1–3 events per cycle the streak of 3 means three cycles. That is closer to the DF intent and needs the multi-cycle harness (`scripts/citizenDialMultiCycle.test.js`) re-run, not a guess.
- **The hood-pulse sign in Cut B** must not double-count `Neighborhood_Map` pressure that the hood engines already apply to the same citizens; the tint is on the citizen's line, the pressure is on the hood.
- **Card corrections so review does not chase them:** the casino IS wired, through `generationalWealthEngine.js:162` (`processCasinoLedger_`), not a top-level phase; the `Phase5-Conduct` call-site comment "inert until DialState deploys" (`godWorldEngine2.js:360`) is stale; `scripts/ctxMap.js` reports DialState PHANTOM because it models `S.*` fields, not header-indexed ledger columns.

**Verdict:** `adopt`. Ignites one plan after kimi's review: the six cuts as engine.NN rows in the order B → A → C → D → E → F, one bench cycle each, in `docs/plans/`. Nothing builds before the review comes back.

---

## Applications (living)

- 2026-09-08 (S437, engine-sheet) — Filed from the builder's dial-design session. Handed to kimi for review (NEXT[kimi]); review notes come back here under this heading, not into the design above.
