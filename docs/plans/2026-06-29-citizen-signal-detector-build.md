---
title: Citizen-Signal Convergence Detector — Build Plan
created: 2026-06-29
updated: 2026-06-29
type: plan
tags: [citizens, citizen-loop, story-emergence, engine, plan, active]
sources:
  - "[[2026-06-26-citizen-signal-story-emergence]] — research.21 thesis (the WHY); this is the executable HOW"
  - "[[../adr/0013-citizen-signal-emergent-story-source]] — the load-bearing decision this plan executes"
  - docs/engine/archive/ROLLOUT_PLAN.md — research.21 row
  - "Live empirical query of Reflection_Intake, S274 (43 rows / 39 distinct / C97–C100) — the base-rate data that sets every threshold"
pointers:
  - "[[engine/archive/ROLLOUT_PLAN]] — parent rollout"
  - "[[2026-06-26-citizen-signal-story-emergence]] — research.21, the thesis + guardrails"
  - "[[../adr/0013-citizen-signal-emergent-story-source]] — ADR-0013"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Citizen-Signal Convergence Detector — Build Plan

> **ENGINE-SHEET: your build work is §3 only.** To execute, read the frontmatter, **§2 (Resolved mechanism — the dials)**, and **§3 (Engine-sheet build spec)**. You do not need §1, §4, or §5 to build. Everything you need — file paths, the metric formula, the schema, the parameter defaults — is in §2 + §3. (Token-saving per Mike, S274.)

**Goal:** A deterministic post-cycle Node script tallies cross-citizen convergence in `Reflection_Intake` and emits `citizen-signal` story seeds into `Story_Seed_Deck`, starting with **citywide affect-lift** — the only convergence dimension with statistical power at current wake throughput.

**Architecture:** A new post-cycle Node script (mirrors `scripts/engine-auditor/routePatternSeeds.js`) reads accumulated `Reflection_Intake` rows over a trailing window, computes per-affect-tag distinct-citizen share-lift over a trailing baseline, and on a fire appends a `citizen-signal` row to `Story_Seed_Deck` via the service account. `/sift` consumes it natively. **Zero new LLM calls** — the event + affect tags are already classified and persisted at wake time (cols E + H). It is a new SOURCE into the existing seed→/sift→edition flow, not a parallel pipeline.

**Terminal:** research-build (design — DONE this plan) → engine-sheet (build — §3) → media (pilot consumption — §5)

**Pointers:**
- Thesis / guardrails: [[2026-06-26-citizen-signal-story-emergence]] (research.21)
- Decision record: [[../adr/0013-citizen-signal-emergent-story-source]] (ADR-0013)
- Substrate (verified S274): `scripts/citizen-wake.js` L394–402 (writer), `lib/reflectionClassifier.js` (tag vocab), `phase10-persistence/saveV3Seeds.js` (seed schema), `phase07-evening-media/applyStorySeeds.js` (in-cycle seed engine), `scripts/engine-auditor/routePatternSeeds.js` (post-cycle Node seed-writer precedent)

**Acceptance criteria:**
1. `node scripts/citizen-signal-detector.js --dry-run` reads `Reflection_Intake`, prints per-affect-tag distinct-citizen counts + share-lift over baseline for the trailing window, and the fire/no-fire decision per tag — **without writing**.
2. On a real fire, it appends a `Story_Seed_Deck` row with `SeedType='citizen-signal'`, stamped with the **detection cycle** (not the contributing reflections' cycles), schema-aligned to the 20-col deck.
3. It stays **dormant** (no seeds) when corpus depth in the window is below `MIN_CORPUS_DEPTH` — proven by a dry-run against the current 43-row corpus showing "below corpus floor, no fire."
4. Determinism preserved: the script issues no engine write, uses no `Math.random()`, runs entirely post-cycle over persisted rows.

---

## §1 — Why this shape (research-build context — engine-sheet may skip)

**The empirical finding that sets the design (S274 live query of `Reflection_Intake`):**

| Cycle | Distinct citizens | | Tag | base-rate |
|---|---|---|---|---|
| C97 | 9 | | `Community` (event) | **35%** (15/43) — monotone-provocation artifact |
| C98 | 6 | | Content + Calm (affect) | ~44% — the quiet baseline |
| C99 | 8 | | Negative affect (Frust/Irrit/Anx/Resent) | 11/43 |
| C100 | 20 | | | |

Total corpus: **43 rows, 39 distinct citizens.** The 5/day wake bump only just landed (C100 = 20). Consequences that drive §2:

- **Citywide affect (9 tags) has power; everything finer does not.** At ~20 distinct/cycle, a 3-cycle window ≈ 40–60 samples — enough for a citywide affect spike to clear baseline. Per-neighborhood (~5 samples/hood) is dead until throughput rises ~5–10×. Per-event-tag is dead *and* additionally polluted: `Community` saturates 35% of the corpus, a monotone-provocation artifact that **research.19 T5 exists to fix.**
- So **v1 = citywide affect-lift only.** Neighborhood resolution is **throughput-gated**; event-tag convergence is **T5-gated**. Both unlocks are recorded as explicit dials, not assumed away (advisor S274). Cost permits any throughput (research.21 OQ6 — ~$11/mo for all-900/day); the gate is **samples, not dollars.**

Full guardrails (emergent≠auto-publish, publication wall holds, editions stay verified until a quality bar) live in research.21 + ADR-0013 — not duplicated here.

---

## §2 — Resolved mechanism (the dials)

The six research.21 open questions, **resolved** against the S274 data. These are the contract §3 builds to.

1. **What is a "larger signal"? — distinct-citizen affect-share lift over a *prior* baseline.** For each affect tag `A` in the trailing window `W`: `observed = distinctCitizens(A, W) / distinctCitizens(*, W)`; `baseline = distinctCitizens(A, B) / distinctCitizens(*, B)` where **`B` is the cycles strictly BEFORE `W`** — `W ⊄ B`, so the spike never contributes to (and dampens) its own baseline. This self-dilution is worst in the small-corpus launch regime where `W` is most of the history — exactly when the detector first fires — so the exclusion is load-bearing, not cosmetic. **Fire** when `distinctCitizens(A, W) ≥ MIN_DISTINCT` **AND** `observed − baseline ≥ LIFT_THRESHOLD`. **Distinct citizens, never raw rows** (one citizen reflecting twice is not convergence).
2. **Scale / cadence — trailing sliding window, post-cycle, throughput-gated.** Run once per cycle (same slot as `routePatternSeeds.js`), over a trailing `W_WINDOW_CYCLES` window against a longer `BASELINE_CYCLES` reference. Detector is **dormant** until window corpus ≥ `MIN_CORPUS_DEPTH`. Granularity is parameterized by `MIN_DISTINCT` per dimension — that parameter is what backs out the throughput each finer dimension needs.
3. **Dedup vs engine seeds — tag-by-origin + affect↔engine-sentiment corroboration (NEAR-TERM, not T5-gated).** Correction to the first-draft "low-collision" claim: `applyStorySeeds.js` **already mints mood seeds from its own sentiment metrics** — `strain-trend` ("pressure building"), low-QoL ("frustration mounting"), community-withdrawal. So a citywide citizen-affect-lift ("a wave of frustration across Oakland") plausibly *does* collide with those. That collision is the **prize, not a problem**: matching citizen-affect against the engine's same-cycle sentiment/QoL seeds gives the highest-value v1 signal — **corroboration** (engine + citizens agree → confirmed salience) or **divergence** (engine reports calm while citizens report anxiety → the story the metrics hide, exactly the C100 sentiment anomaly research.20 caught). This relationship needs **no event-tags and no T5** — it's affect↔engine-sentiment, available now (§3 Task 4b). The richer `domain×neighborhood` event-corroboration (Task 6) stays T5-gated; only that piece defers. Even pre-corroboration, the v1 cut origin-tags `citizen-signal` and lets `/sift`'s `fold`/`covered-by-feature` triage dedup as the backstop.
4. **Output shape — seed, not draft.** A `Story_Seed_Deck` row, `SeedType='citizen-signal'`. No prose generation (that would cross into the edition's job + the publication wall).
5. **Consumption — `/sift` native.** Seeds land in `Story_Seed_Deck`; `/sift` already triages the deck. One small media-side rubric note: weight `origin=citizen-signal` as a bottom-up salience signal (§5). No new pass, no new surface.
6. **Cost — non-constraint, and v1 is free.** Tags are already persisted at wake time; the detector is a pure tally. Only the future embedding/topic path (Q1 richer dimension) adds cost, and even that is cheap (research.21 OQ6).

**Parameter defaults (calibrate against the live baseline at build time; these are the ADR-recorded dials):**

| Dial | Default | Meaning |
|---|---|---|
| `W_WINDOW_CYCLES` | 3 | trailing window the signal is measured over |
| `BASELINE_CYCLES` | all cycles strictly **before** `W` (≥6 when available) | reference distribution for lift — **must exclude `W`** |
| `MIN_DISTINCT` (citywide affect) | 6 | floor of distinct citizens sharing the affect before it can fire |
| `LIFT_THRESHOLD` | +0.15 absolute share | how far over baseline share counts as convergence |
| `MIN_CORPUS_DEPTH` | 40 distinct in window | detector dormant below this — prevents firing on noise |
| `DIMENSIONS` | `['citywide-affect']` | v1. `'neighborhood-affect'` throughput-gated; `'event-tag'` T5-gated |

---

## §3 — ENGINE-SHEET BUILD SPEC (read this section)

Build a new post-cycle Node script. **Pattern to copy:** `scripts/engine-auditor/routePatternSeeds.js` (existing post-cycle Node writer that appends to `Story_Seed_Deck` via the service account). Read `lib/sheets.js` for `getRawSheetData` / `appendRows`, and require `lib/env` first (the analysis ran headless without it and threw `GODWORLD_SHEET_ID not set`).

**Substrate facts (verified S274 — do not re-derive):**
- `Reflection_Intake` row shape (`scripts/citizen-wake.js` L394–402): `[Timestamp, POPID, Cycle, Daypart, EVENT(col E / idx 4), ReflectionExcerpt, Applied, AFFECT(col H / idx 7)]`. **Affect is idx 7, positional** — the live header only labels A–G (7 cols); affect is appended at H back-compat. Read positionally.
- Affect vocab = 9 tags (`lib/reflectionClassifier.js` `AFFECT_TAGS`): Frustrated, Irritable, Anxious, Angry, Resentful, Excited, Energized, Content, Calm.
- `Story_Seed_Deck` is 20 cols A–T (`phase10-persistence/saveV3Seeds.js` `SEED_DECK_HEADERS`). The columns `/sift` consumes: D `SeedType`, E `Domain`, F `Neighborhood`, G `Priority`, H `SeedText`. Engine A/B decoration cols (M–T) may be `''` for citizen-signal seeds, exactly as `routePatternSeeds.js` leaves the columns it doesn't compute.

### Task 1: Scaffold the detector script
- **Files:** `scripts/citizen-signal-detector.js` — create
- **Steps:**
  1. `require('/root/GodWorld/lib/env')` first; `const sheets = require('/root/GodWorld/lib/sheets')`.
  2. Add a `--dry-run` flag (no writes; print the per-tag decision table) and a `--cycle=<n>` arg (the detection cycle to stamp; default = max cycle in the data).
  3. Define the §2 parameter table as named consts at the top of the file (the dials).
- **Verify:** `node scripts/citizen-signal-detector.js --dry-run` runs without throwing.
- **Status:** [ ] not started

### Task 2: Read + window the corpus
- **Files:** `scripts/citizen-signal-detector.js` — modify
- **Steps:**
  1. `getRawSheetData('Reflection_Intake')`, drop header, filter empties.
  2. Compute `detectionCycle` (arg or max). Window `W` = rows with `cycle` in `[detectionCycle - W_WINDOW_CYCLES + 1, detectionCycle]`. **Baseline `B` = cycles strictly BEFORE `W`** — `[firstAvailable, detectionCycle - W_WINDOW_CYCLES]`. `W ⊄ B` so the spike never dilutes its own baseline (correctness — do not set `B` to "all rows up to detectionCycle").
  3. **Corpus-depth gate:** if `distinctCitizens(*, W) < MIN_CORPUS_DEPTH`, print "below corpus floor (<n>/<MIN_CORPUS_DEPTH>), no fire" and exit 0.
- **Verify:** against the current 43-row corpus → prints the corpus-floor message and exits without writing (acceptance #3).
- **Status:** [ ] not started

### Task 3: Compute citywide affect-lift
- **Files:** `scripts/citizen-signal-detector.js` — modify
- **Steps:**
  1. For each of the 9 affect tags, count **distinct POPIDs** carrying it in `W` and in `B`; compute `observed`, `baseline`, `lift` per §2 formula.
  2. A tag **fires** when `distinct(A,W) ≥ MIN_DISTINCT && lift ≥ LIFT_THRESHOLD`.
  3. Print a decision table: tag | distinct(W) | observed | baseline | lift | FIRE?
- **Verify:** dry-run prints the table; numbers reconcile by hand against a small slice.
- **Status:** [ ] not started

### Task 4: Shape + write the seed
- **Files:** `scripts/citizen-signal-detector.js` — modify
- **Steps:**
  1. For each firing tag, build `SeedText` summarizing the convergence — e.g. `"Citizen-signal: a wave of <affect> across Oakland — <N> residents independently reflect <affect> this window (baseline <b%>, now <o%>). Contributing: <popId list>."` Carry the contributing POPIDs + excerpts as the evidence `/sift` needs.
  2. `Domain='CIVIC'` (or `'GENERAL'`), `Neighborhood=''`, `Priority` scaled by lift magnitude, `SeedType='citizen-signal'`. **Stamp `Cycle = detectionCycle`** (acceptance #2 — NOT the contributing reflections' cycles).
  3. Append schema-aligned 20-col rows to `Story_Seed_Deck` via the service account (M–T = `''`), mirroring `routePatternSeeds.js`. Gate the actual append behind `!dryRun`.
- **Verify:** with thresholds temporarily lowered on the live corpus, a real fire appends exactly one well-formed row; read it back.
- **Status:** [ ] not started

### Task 4b: Affect↔engine-sentiment corroboration tag (NEAR-TERM — no T5 needed)
- **Files:** `scripts/citizen-signal-detector.js` — modify
- **Steps:**
  1. After computing a firing affect tag, read the **same-cycle** `Story_Seed_Deck` rows the engine already wrote (the `applyStorySeeds.js` mood seeds: `seedType` ∈ `pattern`(`strain-trend`/`calm-after-shock`), `qol`, `engagement`/community-withdrawal — or just match on sentiment-direction in `SeedText`).
  2. Tag the citizen-signal seed `corroborates` (engine mood seed agrees in direction) or `diverges` (engine reports the opposite, e.g. engine `calm-after-shock`/high-QoL while citizens converge negative). Put the tag + the matched engine `SeedID` in `SeedText` (no schema change needed — it's evidence for `/sift`).
  3. A `diverges` seed is the high-value case (the hidden story) — bump its `Priority`.
- **Verify:** with thresholds lowered on the live corpus, a fire that coincides with an engine mood seed is tagged `corroborates`; an opposed one is tagged `diverges`.
- **Status:** [ ] not started

### Task 5: Schedule the run (post-cycle)
- **Files:** wherever `routePatternSeeds.js` is invoked post-cycle (cron / cycle-export wrapper — engine-sheet locates)
- **Steps:**
  1. Add `citizen-signal-detector.js` to the post-cycle run, after the deck is written, before `/sift`.
- **Verify:** one full post-cycle run shows the detector logging its decision table.
- **Status:** [ ] not started

### Task 6 (DEFERRED — do NOT build in v1): event-dimension + corroboration
- Gated on **research.19 T5** landing (provocation diversity) so event-tags aren't `Community`-saturated. When built: add `'event-tag'` to `DIMENSIONS`, an `EVENT_VOCAB → Seed-DOMAIN` map (Faith→COMMUNITY, Civic→CIVIC, Health→HEALTH…; `Daily`/`Background`/`Personal` map to nothing → skip), and the corroboration cross-link (match citizen-signal on `domain×neighborhood` to an engine seed → annotate a corroboration weight instead of minting a duplicate; on miss → new seed). Neighborhood resolution additionally needs a `POPID→Neighborhood` ledger join (no hood column in `Reflection_Intake`) and `MIN_DISTINCT` per-hood reachable — throughput-gated.
- **Status:** [ ] deferred (gated on T5 + throughput)

### Task 7 (optional cleanup): label the affect column
- **Files:** `Reflection_Intake` sheet header (engine-sheet, service account)
- **Steps:** add `Affect` as the col-H header so the truth-doc matches the data (research.21 claims an 8-col schema; the live header is 7-col with affect positional). Non-blocking — the detector reads positionally.
- **Status:** [ ] not started

---

## §4 — Sequencing: T5 before this build (research-build recommendation)

**Build T5 (engine-sheet, research.19) before this detector.** Reasons:
1. The detector is corpus/throughput-gated — it **cannot fire meaningfully until several more cycles accumulate at 5/day** anyway. That accumulation window is free time to land T5.
2. T5 diversifies provocations → unblocks the event-tag dimension **and** improves affect-signal quality → the detector built afterward reads a clean multi-dimensional substrate instead of a `Community`-saturated one.
3. Building the detector first means tuning thresholds against a known-degenerate baseline (35% `Community`), then re-tuning after T5 shifts the distribution — wasted calibration.
4. research.21's own §sequencing logic already says it: "the detector is worthless against a flat or monotone baseline."

Net order: **T5 build → accumulate ≥ `MIN_CORPUS_DEPTH` at 5/day → detector v1 (this plan, §3 Tasks 1–5, 7) → pilot (§5) → event-dimension unlock (§3 Task 6).**

---

## §5 — Pilot (media + research-build, gated on §3)

**What v1 actually tests — state it so a thin pilot isn't misread.** research.21's thesis examples are *topic* convergence ("the construction site," "a faith observance") — subject-bearing stories. **v1 detects *affect* convergence — a mood**, which becomes a story only via the **attached snippets + the engine-sentiment corroboration/divergence tag** (Task 4 + 4b). So v1's real hypothesis is *"does mood-convergence + citizen excerpts (+ a diverge-from-engine flag) give a desk enough to find the story?"* — **not** "does topic-convergence surface stories." A weak pilot on v1 is not the thesis failing; the bridge to topic-convergence is the deferred **snippet/topic-clustering (embedding)** path (Q1 richer dimension), not the event-tag gate.

The pilot itself: one cycle's citizen-signal seeds vs that cycle's real edition coverage — did the detector surface a real, coverable salience the pipeline missed (the research.20 C100-Coliseum pattern)? Quality bar, not cost — editions stay the verified surface until it clears (research.21 guardrail). Add a one-line `/sift` rubric note: weight `origin=citizen-signal` (and especially `diverges`) as bottom-up salience. (media terminal)

---

## Open questions

None block §3. (The six research.21 mechanism questions are resolved in §2.) Threshold **values** in §2 are calibrated empirically at build time against the live baseline — that is a build step, not an open design question.

---

## Changelog

- 2026-06-29 (S277, engine-sheet) — **§3 BUILT** — `scripts/citizen-signal-detector.js` (Tasks 1–4 + 4b). Pure post-cycle Node tally, no clasp, no engine write, no `Math.random()` → off the C101 deploy gate entirely. Dials per §2 table; reads `Reflection_Intake` affect positionally (idx 7); distinct-citizen affect-share lift over a window-excluded baseline; corpus-depth gate; 20-col `citizen-signal` deck row mirroring `routePatternSeeds.seedToRow`. **Task 4b grounded in real `applyStorySeeds.js` mood-seed text** (engagement/qol/pattern strain-trend keyword poles), not guessed vocab — divergence (negative citizens vs positive engine seed) bumps priority + tags "the hidden story." **Verified:** (acc#1/#3) `--dry-run` on live corpus → window c98–c100 = 34 distinct < `MIN_CORPUS_DEPTH` 40 → "below corpus floor, no fire," no write; (acc#2/#4 fire path) scratchpad copy with lowered dials → decision table + 5 well-formed seeds + correct corroborate/diverge tags vs same-cycle engine seed `b92c61d5`; determinism holds. Task 7 N/A (positional read needs no header label). **Task 5 (schedule) OPEN** — `routePatternSeeds.js --apply` is a *manual* engine-sheet post-cycle step (no automated wrapper exists), and the insertion point sits in shared run-cycle territory; detector stays dormant for ~several cycles regardless, so wiring deferred to Mike's go. **Task 6 DEFERRED** (T5/throughput-gated, per plan). Pattern: feedback_measure-twice-cascading-effects.
- 2026-06-29 (S274) — Initial draft. Executes research.21 Phase 2 (mechanism design) + ADR-0013. Six open questions resolved against the live `Reflection_Intake` query (43 rows / 39 distinct): v1 = citywide affect-lift only; neighborhood throughput-gated; event-tag T5-gated. Engine-sheet build fenced to §3. T5-before-detector sequencing recommended (§4).
- 2026-06-29 (S274) — Advisor-pass corrections (3): (1) baseline `B` excludes window `W` (`W ⊄ B`) — fixes a self-dilution correctness bug engine-sheet would have built as written (§2.1, §3 Task 2, dial table); (2) affect↔engine-sentiment corroboration re-gated to NEAR-TERM (engine already mints mood seeds → corroborate/diverge is the v1 prize, needs no T5) — new §3 Task 4b, §2.3 rewrite, ADR move 5; (3) named what v1 actually tests (affect/mood-convergence via snippets ≠ the thesis's topic-convergence; embedding path is the bridge) in §5 so a thin pilot isn't misread.
