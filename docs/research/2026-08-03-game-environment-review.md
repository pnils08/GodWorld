---
title: Game Environment Review — research
created: 2026-08-03
updated: 2026-08-03
type: reference
tags: [research, architecture, engine, media, active]
sources:
  - "Builder directive 2026-08-03: find ways to tap a game environment — fun/intrigue, visualization, and the path off Sheets to an autonomous life-sim platform"
  - docs/research/2026-08-01-simulation-realism-audit.md — realism baseline this review builds on
  - docs/research/2026-07-31-sheets-ceiling-export-eval.md — migration verdict + triggers
  - docs/research/2026-07-13-family-household-loop.md — Sims-layer design (adopt, no plan)
  - docs/research/2026-07-27-spacemolt-citizen-agency-cultural-phenomenon.md — wagering lane design
  - docs/research/2026-07-05-mike-seed-contract.md — seeds as first-class engine events
  - scripts/sportsFeedContract.js / scripts/sportsFeedWriter.js — the played-event contract
  - schemas/SCHEMA_HEADERS.md — tab shapes and counts
  - Code-level sweeps: phase01-config/ … phase11-media-intake/, lib/, dashboard/, openclaw-skills/godworld-sync/
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home; rows ignite only from what the builder adopts here"
  - "[[index]] — registered same commit"
  - "[[2026-07-31-sheets-ceiling-export-eval]] — the migration take-nothing this extends, not contradicts"
---

# Game Environment Review — research

**Source:** Internal four-sweep code+docs review (realism/creative threads, engine mechanics inventory, visualization surfaces, off-Sheets evidence), builder-directed 2026-08-03. All claims below carry file:line evidence gathered this session.

**What this addresses:** The builder frames GodWorld as SimCity-meets-The-Sims-meets-MLB-The-Show and asked: where is the untapped play/fun/intrigue, how could this become visual, and what is the honest progression off Sheets toward an autonomous life-sim platform.

**What it does:** Maps the sim's existing systems onto game vocabulary, extracts the one proven game→sim bridge (the sports feed) down to its exact contract, prices the visual layer against seams that already exist in the dashboard, and reconciles the platform question with the repo's own prior verdicts. Mechanism-level throughout so a plan phase does not need to re-investigate.

---

## 1. The engine already contains a game — inventory in game vocabulary

Everything in this table is **live/prod code**, not design docs.

| Game system | Engine reality | Where |
|---|---|---|
| Character sheets | Trait profiles + dial schema + essence per citizen; moral-test engine | `lib/citizenDials.js`, `phase05-citizens/runConductEngine.js` |
| Career progression | Career stages, education flags, promotions | `phase05-citizens/educationCareerEngine.js`, `checkForPromotions.js` |
| Quest lines | Multi-cycle arcs with tension/phases; crisis arcs from 2+ bad channels | `phase04-events/eventArcEngine.js`, `phase03-population/generateCrisisBuckets.js` |
| Event deck | 3–15 stochastic municipal-vehicle events/cycle, asymmetric decay, trauma escalation (`wary`/`traumatized`) | `phase04-events/chaosCarsEngine.js` |
| Social graph | Bond engine v2.7 — typed, weighted, statused relationship edges, 6,524 ledger rows | `phase05-citizens/bondEngine.js`, `Relationship_Bond_Ledger` |
| Tycoon layer | Commute OD matrix, crime + patrol strategy, gentrification/displacement, hood trajectories, Markov weather fronts | `phase02-world-state/commuteFlowEngine.js`, `phase03-population/updateCrimeMetrics.js`, `phase05-citizens/neighborhoodTrajectoryEngine.js`, `phase02-world-state/applyWeatherModel.js` |
| Fame system | Fame registration + decay | `phase07-evening-media/culturalLedger.js`, `Cultural_Ledger` (47 rows/20 cols) |
| Sports seasons | Season intensity, playoff/championship weight boost, fan home moments | `phase02-world-state/applySportsSeason.js`, `phase05-citizens/applyGameNightMoments.js` |
| Player intervention | Advancement intake, sports feed, story seeds — the "god game" input devices | `phase05-citizens/processAdvancementIntake.js`, sports feed (§2), `Story_Seed_Deck` |

The gap is not systems — it is that none of this has a **player surface**. The only window in is reading editions/wakes; the only levers are intake rows. That is the review's core finding: **GodWorld is a game engine with a newspaper for a UI.**

## 2. The played-events pattern — the proven bridge, exact contract

Sports is the one place a game the builder *plays* (MLB The Show, NBA 2K) already enters the world. The mechanism, precisely:

**Feed contract** (`scripts/sportsFeedContract.js:8-14`): one row in `Oakland_Sports_Feed`, 20 columns — `Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, VideoGameDate, VideoGame, StoryAngle, PlayerMood, EventTrigger, HomeNeighborhood, Streak, FanSentiment, FranchiseStability, EconomicFootprint, CommunityInvestment, MediaProfile`. Enums via `SAFE_ENUMS` (`:35-46`); `EventType` ∈ `{game-result, stat-capture, roster-move, player-feature, front-office, fan-civic, season-state, editorial-note}` (`:21-24`). `VideoGameDate`/`VideoGame` must be **blank** (`:277`) — a deliberate fourth-wall guard: the video game itself is never named in canon.

**Intake:** today Mike types the row directly into the tab; the dashboard write path (`POST /api/sports/preview` + `/api/sports/entries`, `dashboard/sportsRoutes.js:1284-1285`) is built but feature-gated behind `SPORTS_WRITE_ENABLED`, TLS/same-origin, a capability header, a signed preview token, CSRF, and the literal confirmation phrase `APPEND_TO_OAKLAND_SPORTS_FEED` (`sportsRoutes.js:1183-1212`).

**Downstream effects** (`scripts/sportsFeedWriter.js`): feed append always; `stat-capture` mutates `As_Roster`/`Oaks_Roster` stat fields only; a `roster-event` mutation (`injury|return|call-up|trade-away`) writes roster fields **and** `Simulation_Ledger` (`Status`, `RoleType`, `StatusStartCycle`, `HealthCause`), brands a `[SportsRoster]` LifeHistory line, appends `LifeHistory_Log`, and appends a `Ripple_Ledger` row (`effectType: roster-*`). Idempotent by key, exact read-back verify, formula-cell preflight, process write-lock, audit JSONL at `output/sports-intake/append-audit.jsonl`.

**Cycle-side consumer:** `applyGameNightMoments_` (`phase05-citizens/applyGameNightMoments.js:71`) reads the cycle's feed rows, matches `NamesUsed` to **active** citizens, assigns a going-home moment bucketed by `Streak`/`PlayerMood`, writes LifeHistory + `LifeHistory_Log` + a `game-night` ripple per named player (max 1/cycle each).

**Generalization verdict: the contract is sports-hardcoded, not a plugin framework.** Eleven concrete hardcoded seams: `FEED_HEADERS`, `FEED_SHEET` (`sportsFeedWriter.js:16`), `TEAM_CONFIG` (`as`/`oaks` only), season/event enums, `ROSTER_SOURCES`, `STAT_FIELD_MAPS`, `ACTION_MATRIX`, `ROSTER_EVENT_FIELDS`, `roster-*` effect types, `[SportsRoster]` branding (`sportsFeedContract.js:578`), and the `/api/sports/*` route namespace. **Reusable as-is:** the audited/idempotent/formula-preflighted batch-writer pattern, preview-token flow, and read-back verification — these are domain-agnostic shapes. A "played events v1" for a second game (poker night, racing, chess — anything serializable) means a new feed tab + entity config + action registry + a Phase 2/Phase 5 consumer pair, reusing the writer pattern. That is a bounded build, not research.

## 3. Ranked opportunities (fun / intrigue)

Ordered by leverage against what already exists. Each names its mechanism seam.

1. **Played events beyond sports** — generalize §2. Highest conceptual payoff (any game Mike plays can *happen in the world*), bounded cost (writer pattern reusable; new feed + consumer pair). Pairs with the Mike-seed contract (`2026-07-05-mike-seed-contract.md`, adopt) — seeds are already first-class engine events.
2. **The Sims layer (family/household loop)** — `2026-07-13-family-household-loop.md` is adopt-verdicted with decisions D1–D5 locked and **no plan file**. Romance→weddings→births as real rows, divorce, death records. The single biggest "watch a life unfold" gain; prerequisite data work partly done (`householdFormationEngine` live).
3. **Wagering/intrigue lane** — citizens bet on A's games, elections, initiative votes; creates winners, losers, debts, grudges. Design exists in the SpaceMolt research as a separately gated fictional casino ledger (explicitly *not* an authorized Sheet yet). Feeds engine.94 grudge/ambition typing downstream.
4. **The realism-audit build order IS the drama roadmap** — engine.94 (grief consumer + scandal ceiling), engine.96 (business lifecycle: growth drift, decline→layoffs, closure), engine.97 (age-gated life content). The audit proved the engine emits near-zero negative economic vocabulary, so editions mirror a world without stakes. These rows are already filed; this review adds the frame: they are the *fun* work, not chores.
5. **Citizen agency dial** — citizens currently react (wakes, exchanges). The gap to citizens *scheming* is engine.94 Track B (typed grudge/ambition) + research.13 (citizen-autonomous PoC). Intrigue lives there.
6. **Chaos cars as a visible deck** — the events are drawn face-down today; surfacing each cycle's "draw" (see §4) costs nothing in the engine and makes the stochastic layer legible as play.

## 4. The visual layer — priced against existing seams

**Current state:** the dashboard (React 19 + Tailwind v4, Express, PM2 `godworld-dashboard`, port 3001) renders 11 tabs of text/tables. No map library installed, no photos served, no world graph, no animation. But every asset a visual layer needs already exists:

**(a) Neighborhood map — the SimCity floor.** `Neighborhood_Map` (22 rows, 23 cols) carries choropleth-ready metrics with exact headers: `Sentiment` (I), `CrimeIndex` (F), `RetailVitality` (G), `NightlifeProfile`/`NoiseIndex` (D/E), `HousingPressure` (R), `MigrationFlow` (P), `NeighborhoodTrajectory`/`TrajectoryMomentum` (Q/V), `MedianIncome` (T), `MedianRent` (U), `District` (W) (`schemas/SCHEMA_HEADERS.md:828-858`). Seams: add a tab via the arrays at `dashboard/src/App.jsx:420-431` (menu) + `:474` (tab bar) + a conditional render block; add `app.get('/api/...')` in `dashboard/server.js` reusing `getLiveSheetData('Neighborhood_Map')` (`server.js:185-198`, 10-min TTL cache). Geometry is the one missing asset: needs a GeoJSON of Oakland neighborhood boundaries (public data, one-time fetch, stored in-repo). Leaflet is the proportionate choice (no key, small); Mapbox/DeckGL is overkill at 22 polygons. **Est: the smallest large win in this review.**

**(b) Surface the paid-for photos.** `output/photos/e83…e101` hold FLUX-generated photojournalism with machine-readable manifests (`manifest.json`: per-photo `slug/file/credit/section/editorialFlag` + QA counts; sidecars carry `storyline/thesis/mood/motifs/image_prompt/dimensions`). **No dashboard route serves them** (grep: zero matches in `server.js`); only static mount is `distPath` (`server.js:2630`). Fix is one `express.static` mount + a photos field in article/citizen payloads. Citizen portraits, neighborhood galleries, article thumbnails — assets already generated, zero new model spend.

**(c) Citizen relationship graph.** `Relationship_Bond_Ledger` (6,524 rows) defines edges directly: `CitizenA` (D), `CitizenB` (E), `BondType` (F), `Intensity` (G), `Status` (H), `Neighborhood` (K) (`schemas/SCHEMA_HEADERS.md:933-959`). `graphify-out/graph.json` proves the render path (vis-network, node/link JSON); the generator is an external code-graph tool, so a new small script would emit the same shape from bond rows — nodes = citizens, edges = active bonds weighted by `Intensity`, colored by neighborhood. This is the intrigue surface (who owes whom, who is feuding) made visible.

**(d) Cycle replay.** Every cycle persists packets (`phase10-persistence/buildCyclePacket.js`), weather (`Cycle_Weather`), and events. Once (a) exists, a timeline scrubber animating a cycle's events on the map is presentation-only work over persisted data.

**(e) Sports presentation.** Box scores, standings, MLB-The-Show-style player cards from truesource stats + `intake/player-cards-2040/` — pure presentation in the existing SPORTS tab.

## 5. Off-Sheets progression — replica-first, reconciled with the repo's own verdicts

The Sheets-ceiling eval (`2026-07-31-sheets-ceiling-export-eval.md`) returned **take-nothing on migration** with numbers: 56 tabs, ~34k rows, ~457k cells = 4.6% of the 10M-cell limit; 6-min wall at 34–38%; ~10 years headroom; named work = engine.95 checkpoint/resume. This review does not relitigate that — **canon authority stays on Sheets**. What the game ambition adds is a need the eval didn't price: **a game/visual layer wants query speed and joins Sheets can't give**. The honest progression:

1. **Read-replica (now).** A local SQLite/Postgres mirror, rebuilt per cycle, that the visual layer queries. Sheets stays canon; the replica is disposable. Two existing seams feed it:
   - `phase10-persistence/cycleExportAutomation.js` — exports 40 tabs per cycle as TSV snapshots (`{SheetName}_Cycle_{N}.txt`) to a Drive `GodWorld_Exports` folder, menu- or 6-hour-trigger-driven, overwrite-by-name (`:41-91, :107-168, :217-252, :336-350`).
   - `openclaw-skills/godworld-sync/` — an archived SQLite sync (`godworld.sql`: `citizens/citizen_events/relationships/initiatives/cycles/arcs/media_outputs` + 4 views). **Do not revive it as-is:** `citizens` is never INSERTed, 4 of 8 tables have no write paths, its input (`exports/manifest.json` context packs from `utilities/exportCycleArtifacts.js`) is produced but mostly ignored, and `exports/` is empty today. Reuse the *schema* and the manifest idea; the loader itself is dead.
   - A replica also unblocks (a)–(d) in §4: the dashboard's 10-min Sheets cache is fine for text tabs but a map/graph/replay wants SQL joins and sub-second reads.
2. **Autonomy roadmap (next).** research.12 layers — engine-continuous (in flight), newsroom-autonomous, citizen-autonomous — none require leaving Sheets.
3. **Real migration (triggered).** The eval's four tripwires (>50% cells, <2 min wall headroom, 4-cycle trim creep, quota-error class in `Engine_Errors`) plus **one new trigger this review adds**: a game runtime that needs write-latency or concurrency Sheets cannot do (e.g., an interactive viewport that mutates world state in real time). That is the only builder ambition found here that genuinely outgrows Sheets — and it is post-replica work by construction.

## 6. Not applicable / hazards

- **Do not revive `openclaw-skills/godworld-sync`.** Archived Cycle-78 legacy (AGENTS.md); its write paths are mostly stubs. Schema ideas only.
- **Do not build a generic played-event framework.** §2 shows 11 hardcoded sports seams; generalize to **one** second feed type first (the cost is real but bounded), and let the third instance force the abstraction. Premature framework = the exact over-engineering the repo's minimal-change rule forbids.
- **`VideoGameDate`/`VideoGame` must stay blank** (`sportsFeedContract.js:277`) — fourth-wall guard: the game is played, never named. Any new feed type needs the equivalent guard in its contract.
- **`Event_Arc_Ledger` is FROZEN (S313)** (`docs/SPREADSHEET.md:55`) — the quest-line surface must read it, never extend it, until a successor decision lands.
- **Wagering lane stays gated** — the casino ledger is a design question, explicitly not an authorized Sheet (SpaceMolt research). No tab gets created without builder sign-off.
- **FLUX photo cost** — per-image pro pricing is why photos are edition-scoped; the visual layer should surface existing photos before generating new classes (portraits, neighborhood scenes).
- **Canon risk in any viewport** — a map/graph/replay renders canon state only; it must never mint entities or let a UI interaction write world state without the same intake/gate discipline the sports writer carries (capability token, preview, confirmation, audit).

**Verdict:** `adopt` (partial, thread-split)
- **Adopt now:** the visual layer (§4 a–c as first tranche) and the read-replica stance (§5.1) — both are zero-canon-risk, build on existing seams, and serve every later ambition.
- **Adopt as frame, already-rowed:** the realism-audit build order (engine.94/96/97) reframed as the drama/fun roadmap — no new rows needed.
- **Watch:** full platform migration — the eval's four triggers plus the new fifth (interactive game-runtime write-latency). Played-events generalization (§2/§3.1), Sims-layer plan ignition (§3.2), and wagering lane (§3.3) each ignite only on explicit builder pick.

**Ignited plans:** none yet — this file is the measure-twice substrate; plan filings follow the builder's thread picks (one plan per adopted thread, each citing this as Research basis).

---

## Addendum — the loop doctrine (builder-direct, 2026-08-04)

**"The loop from sheet to cron is the goal — both surface the same life. Sheets are the persistence; the cron is life. How an LLM chooses to react to what the engine gives them is the citizen living."**

Consequences for every thread in this file:

1. **Sheet → cron must be lossless.** The wake must see everything persistence knows — spouse, children, household, health, employment — not just bonds. Verified gap: `lib/wakePerception.js` reads `Relationship_Bonds` but zero direct family columns (C102).
2. **Cron → sheet must write back more than dials.** The handles already exist: the wake classifier emits `{event, affect, tension, resolves}` per reflection into `Reflection_Intake`; `tension`/`resolves` are relationship signals. A bond write-back consumer riding the existing `compressLifeHistory` drain (same gate, same `applied='yes'` audit) can nudge `Relationship_Bonds.Intensity` by interaction outcome — no new write path, engine-sheet territory.
3. **Tier doctrine stands underneath:** tier 5 is SimCity's aggregate (Generic_Citizens waiting room); tiers 1–4 are the Sims. The loop above governs tracked citizens; tier-5 family materializes on need (family-match drip, GC courtship — live since S324).

This doctrine supersedes the framing of these as separate "gaps" — they are one roadmap: close the sheet↔cron loop so persistence and life mirror each other.

---

## Applications (living)

- 2026-08-03 — Filed from the builder's game-environment review session (Kimi CLI). Awaiting thread picks.

---

## Changelog

- 2026-08-03 — Initial extraction (Kimi CLI, builder-directed). Four code/docs sweeps + three contract extractions (sports feed, dashboard/photo/graph seams, export/replica seams); all mechanism claims carry file:line evidence.
