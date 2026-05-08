---
title: Engine Routing Foundation Plan
created: 2026-05-07
updated: 2026-05-07
type: plan
tags: [engine, media, architecture, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §"WIRE: /sift consume engine pre-routes from Story_Seed_Deck" (S201, line 100)
  - docs/EDITION_PIPELINE.md (master chain + sequence-by-design)
  - utilities/rosterLookup.js v2.2 (current matcher — suggestStoryAngle_)
  - phase07-evening-media/applyStorySeeds.js v3.10 (current seed builder)
  - docs/engine/ROLLOUT_ARCHIVE.md S201 entry (header drift fix `a05e5f6` — top-3 distribution: Simon Leary 838 / Maria Keen 160 / Luis Navarro 38)
  - SESSION_CONTEXT.md priority #5 (S202 hold reason)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout, replaces line 100 inline entry with pointer to this plan"
  - "[[EDITION_PIPELINE]] — master chain; this plan extends Phase 7 inside /run-cycle"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
  - "[[plans/2026-05-05-writer-header-alignment-detector]] — sibling; relevant if new Story_Seed_Deck cols ship"
---

# Engine Routing Foundation Plan

**Goal:** Replace the single conflated matcher (`suggestStoryAngle_`) with two separate engines — a deterministic Priority Engine that ranks story consequence and a confidence-gated Byline Engine that suggests reporters — so that all four editorial skills (`/sift`, `/write-supplemental`, `/dispatch`, `/interview`) consume engine-side routing as deterministic foundation while Mags' editorial judgment concentrates on the storyline-weave call.

**Architecture:** Two engines, both engine-side, both fire Phase 7 inside `/run-cycle`. Engine A computes priority from domain-severity + arc-persistence + prior-coverage and emits a "consequence floor" flag for stories the engine says MUST run. Engine B emits scored byline candidates with confidence + rationale, doesn't pick — consumer skills filter by confidence. Both write new columns to Story_Seed_Deck. Existing `applyStorySeeds.js` v3.10 + `rosterLookup.js` v2.2 are extended, not replaced.

**Terminal:** research-build (design, skill wiring, transparency layer, validation tooling) + engine/sheet (Phase 7 engine code, Story_Seed_Deck schema additions) — multi-terminal by necessity; tasks tagged per terminal.

**Pointers:**
- Prior matcher distribution: Simon Leary 838 / Maria Keen 160 / Luis Navarro 38 of 1108 active C89–C93 seeds (ROLLOUT_ARCHIVE S201). Concentration cause: `getThemeKeywordsForDomain_('GENERAL') = ['stability','quiet','texture']` overlaps three of Simon's four themes; partial-match scoring in `suggestStoryAngle_` (`utilities/rosterLookup.js:846-853`) ranks him highest on any GENERAL seed.
- One-cycle lag is by design (Mike confirmed S204): cycle N seeds reflect cycle N-1 voice output via Initiative_Tracker updates from `applyTrackerUpdates --apply`. No post-city-hall re-route phase needed.
- Existing arc state: `Storyline_Tracker` (read by `applyStorySeeds.js` v3.8 for follow-up + wrap-up seeds + active-domain priority bump) is the substrate for Engine B's arc-byline binding.
- Existing coverage state: `Edition_Coverage_Ratings` + `S.editionCoverageTriggers` (wired S202 v3.10) is the substrate for Engine A's prior-coverage suppression / amplification.

**Acceptance criteria:**

1. **Engine A ships at high confidence cycle 1.** After Phase 2 lands, every seed in Story_Seed_Deck for the next live cycle carries a `priorityScore` (0–10) and `consequenceFloor` boolean. Manual sanity check: every `engine_audit_c{XX}.json` pattern with `severity=HIGH` produces at least one floored seed.

2. **Engine A 3-cycle validation against Mags' picks.** Across 3 sift cycles, priority-engine top-10 ranking achieves Spearman correlation ≥ 0.7 against Mags' actual story-pick order (recorded in `output/sift_proposals_c{XX}.json` `proposals[].id` order). If correlation < 0.7, file a tuning task before declaring the engine authoritative; do not block plan progress.

3. **Engine B ships in shadow-run mode cycle 1.** After Phase 3 lands, every seed carries `bylineCandidate` + `bylineRationale` + `bylineConfidence`, but `/sift` Step 3 does NOT auto-assign — sift records accept/reject per seed in a new `output/byline_shadow_log_c{XX}.json` for tuning.

4. **Engine B distribution constraint.** Cadence cap enforced: no single byline owns > 25% of any cycle's emitted candidates. Validates the matcher isn't repeating Simon-magnet under a new name.

5. **Consumer-surface wiring complete for all four skills.** `/sift`, `/write-supplemental`, `/dispatch`, `/interview` each have explicit consumption rules in their SKILL.md for the new fields. Each skill file references this plan in its frontmatter `sources:`.

6. **Editorial transparency invariant.** Every routing decision (priority + byline) carries a `rationale` payload listing which axes contributed what score. Mags can read the "why" without opening engine code.

7. **No regression on existing sift behavior.** A cycle run with consumers in shadow mode produces an edition with the same byline distribution as the prior cycle's manual sift, ± 1 article reassignment. Confirms shadow mode doesn't accidentally pre-fill.

---

## Tasks

Tasks numbered T1.x by phase. Each is 2–5 min focused work. Terminal tag in [brackets].

### Phase 1 — Diagnose current matcher

#### T1.1: Distribution dump script [research-build]

- **Files:**
  - `scripts/diagnoseRoutingMatcher.js` — create
- **Steps:**
  1. Pull live Story_Seed_Deck rows via `lib/sheets.js getRawSheetData('Story_Seed_Deck')`.
  2. Filter to active rows (cycle ≥ 89, status ≠ archived).
  3. Group by `SuggestedJournalist`; tally per-cycle counts; compute `% of cycle total` per byline.
  4. Group by `(domain, suggestedJournalist)`; surface every (domain, byline) pair with > 50% of that domain's seeds.
  5. Group by `(seedType, suggestedJournalist)`; same.
  6. Emit `output/routing_diagnosis_c93.md` with three tables + a one-line per-cycle summary.
- **Verify:** `node scripts/diagnoseRoutingMatcher.js` → exits 0, file `output/routing_diagnosis_c93.md` exists and shows Simon Leary domination cluster.
- **Status:** [x] done — S206 (2026-05-07). 1109 active rows C89-93. Simon Leary 838/1109 (75.6%); per-cycle stable 74-77%. 10 (domain,journo) pairs >50%; 11 (seedType,journo) pairs >50%. Output at `output/routing_diagnosis_c93.md`.

#### T1.2: Confirm Simon-magnet root cause [research-build]

- **Files:**
  - `output/routing_diagnosis_c93.md` — read
  - `utilities/rosterLookup.js:739-772` (getThemeKeywordsForDomain_) — read
- **Steps:**
  1. Cross-check: GENERAL-domain seeds → Simon Leary should be ≥ 70% per T1.1 output.
  2. Confirm `getThemeKeywordsForDomain_('GENERAL') = ['stability','quiet','texture']` overlaps Simon's themes (`Stability as foundation`, `Quiet months`, `Texture`).
  3. Append a "Root cause confirmed" section to `output/routing_diagnosis_c93.md`.
- **Verify:** read confirms three theme-overlap matches; file updated.
- **Status:** [x] done — S206 (2026-05-07). GENERAL→Simon = 838/839 (99.9%). Simon's matcher score on GENERAL keywords = 5 (texture exact +3, stability partial +1, quiet partial +1) — clears HIGH confidence threshold. Closest competitor scores 1, below admit threshold. Diagnosis: GENERAL is structurally "the Simon Leary bucket" by keyword design, not a generic fallback. Combined with 76% upstream classifier bias, produces the observed lock. Two-engine split + cadence cap (T3.3) load-bearing for breaking it. Phase 1 closed. Diagnosis shipped to `output/routing_root_cause_c93.md` (write-once human analysis); companion mechanical dump at `output/routing_diagnosis_c93.md` (script-regenerable). Split mid-S206 sanity-check after smoke-test re-run overwrote the appendix; script idempotency now preserved.

---

### Phase 2 — Priority Engine (Engine A)

#### T2.1: Define domain-severity weight table [research-build]

- **Files:**
  - `utilities/priorityEngine.js` — create (new file)
- **Steps:**
  1. Define `DOMAIN_WEIGHTS` constant. Initial values (subject to Open Question Q1 below):
     ```javascript
     var DOMAIN_WEIGHTS = {
       'HEALTH': 10, 'SAFETY': 9, 'CIVIC': 9,
       'INFRASTRUCTURE': 7, 'EDUCATION': 6,
       'COMMUNITY': 6, 'BUSINESS': 5,
       'CULTURE': 4, 'NIGHTLIFE': 3, 'WEATHER': 3,
       'SPORTS': 5, 'GENERAL': 2
     };
     ```
  2. Define `SEVERITY_MULTIPLIERS = { HIGH: 1.5, MED: 1.0, LOW: 0.6 }`.
  3. Export both via `utils.export = ...` ES5 pattern (Apps Script compat).
- **Verify:** `node -e "require('./utilities/priorityEngine.js')"` → no error.
- **Status:** [ ] not started

#### T2.2: Arc-persistence multiplier [research-build]

- **Files:**
  - `utilities/priorityEngine.js` — modify
- **Steps:**
  1. Add `computeArcMultiplier_(seed, storylineState)`:
     - storylineState carries `cyclesActive`, `priorPeakSeverity` (HIGH/MED/LOW), `lastCoveredCycle`.
     - Returns 1.0 (no arc), 1.2 (active 1–2 cycles), 1.4 (3+ cycles unresolved), 1.6 (3+ cycles AND priorPeakSeverity = HIGH — "comeback amplifier").
  2. Add `loadStorylineState_(seedDomain, seedNeighborhood, cycle)` that reads Storyline_Tracker via `lib/sheets.js` and returns the matching record or null.
- **Verify:** unit-test inline (file footer) — feed mock storyline rows, assert multiplier values.
- **Status:** [x] done — S206. `computeArcMultiplier_` + `parseStorylineRow_` + `loadStorylineStateForSeed_` shipped in `utilities/priorityEngine.js`. Three design adjustments from plan: (1) signature changed to `loadStorylineStateForSeed_(seed, storylineData, currentCycle)` — pure-function lookup against pre-loaded 2D array, runtime-neutral (caller fetches via SpreadsheetApp or `lib/sheets.js`); (2) reads `seed.linkedStorylineId` as rowNumber — per `applyStorySeeds.js:1585` docstring this is documented behavior (`number|null — row number in Storyline_Tracker`), not a contract violation. Initial flag of "field-naming lie" was over-stated; the name is imprecise but the docstring is authoritative. Optional cosmetic rename folded into T2.6 spec; (3) `priorPeakSeverity` mapping locked: urgent/high → HIGH, normal → MED, low/background → LOW. 23/23 self-tests pass via `node utilities/priorityEngine.js`. Real engine-sheet item folded into T2.6: `loadActiveStorylines_` (`applyStorySeeds.js:371`) reads only 7 of 25 Storyline_Tracker columns; missing `LastCoverageCycle` (col S) which `parseStorylineRow_` reads when present.

#### T2.3: Prior-coverage suppression / amplification [research-build]

- **Files:**
  - `utilities/priorityEngine.js` — modify
- **Steps:**
  1. Add `computeCoverageMultiplier_(seedDomain, coverageState)`:
     - coverageState reads `Edition_Coverage_Ratings` for the prior 3 cycles.
     - Returns 0.7 (covered 3 of last 3 with rating ≥ +3 — saturation), 1.0 (default), 1.3 (rating ≤ -3 — uncovered crisis amplification).
  2. Cite `Edition_Coverage_Ratings` columns used in inline comment.
- **Verify:** unit-test inline against three mock rating profiles.
- **Status:** [x] done — S206. `computeCoverageMultiplier_` + `parseCoverageRow_` + `loadCoverageStateForDomain_` + `normalizeCoverageDomain_` shipped in `utilities/priorityEngine.js`. Three S206 expansions on top of plan: (1) **DOMAIN_WEIGHTS expanded to superset** — adds ECONOMIC, FAITH, ENVIRONMENT, ARTS, FESTIVAL, HOLIDAY, TECHNOLOGY (4 from seed-side observed values, 4 from engine canonical). Cascade analysis (commit-time grep across phase04/06/07/10 + utilities + agents) confirmed engine-wide vocabulary unification has ~10-site blast radius; out of scope for Phase 2, filed as plan-followup. DOMAIN_WEIGHT_DEFAULT=1 fallback for unknowns. (2) **COVERAGE_DOMAIN_NORMALIZE table** — Edition_Coverage_Ratings uses CRIME/HOUSING/TRANSIT, DOMAIN_WEIGHTS uses canonical SAFETY/INFRASTRUCTURE. Localized normalization at coverage-read time, no engine-wide reach. (3) **Crisis threshold calibrated** — plan's ≤-3 was dead code (live data range -1 to +3 across 5 cycles). Dropped to ≤-1 (bottom-quartile of observed ratings); saturation kept at ≥+3 for 3-of-3 (works under live regime). T2.8 validation tunes. 36 new self-test cases added (covers normalizer, parse, load, multiplier branches, DOMAIN_WEIGHTS coverage of all 10 seed-observed values). 59/59 total tests pass.

#### T2.4: Priority score composer [research-build]

- **Files:**
  - `utilities/priorityEngine.js` — modify
- **Steps:**
  1. Add `computePriorityScore_(seed, auditPattern, storylineState, coverageState)`:
     - `score = DOMAIN_WEIGHTS[seed.domain] × SEVERITY_MULTIPLIERS[auditPattern.severity] × arcMul × coverageMul`
     - Clamp 0–10 (divide by 1.5 if score > 10, log clamp).
  2. Return `{ priorityScore, components: { domain, severity, arc, coverage } }` — components feed transparency layer.
- **Verify:** unit-test with synthetic inputs; HIGH-severity HEALTH crisis with 3-cycle arc lands ≥ 8.0.
- **Status:** [x] done — S206. `computePriorityScore_` shipped in `utilities/priorityEngine.js`. Plan acceptance case (HIGH-severity HEALTH crisis + 3-cycle HIGH arc) raw score 31.2 → /1.5 = 20.8 → capped 10. Saturation case (HEALTH MED + 3-of-3 +3 ratings) = 7.0 (10×1.0×1.0×0.7). Defensive defaults: null seed → score 0; missing severity → MED (1.0); missing storylineState → arc 1.0; missing coverageState → coverage 1.0; unknown domain → DOMAIN_WEIGHT_DEFAULT (1). Clamp policy: divide-by-1.5 if raw > 10 per plan, then hard-cap at 10 (some HIGH-arc-comeback × crisis cases can exceed 10 even after one divide); console.warn fired when clamp triggers so T2.8 validation can audit ceiling-saturation rate. Components surfaced in return for T5.1 transparency consumption. 13 new self-test cases (plan acceptance, defensive nulls, unknown domain, lowercase normalization, saturation flow, clamp ceiling); 72/72 total pass.

#### T2.5: Consequence-floor flag [research-build]

- **Files:**
  - `utilities/priorityEngine.js` — modify
- **Steps:**
  1. Add `isConsequenceFloor_(auditPattern, coverageState)`:
     - Returns `true` if `auditPattern.severity === 'HIGH'` AND coverageState.lastRating ≤ -3 (uncovered crisis).
     - Returns `true` if domain ∈ {HEALTH, SAFETY, CIVIC} AND severity = HIGH AND cyclesActive ≥ 2.
     - Otherwise `false`.
  2. Floor flag overrides editorial veto in consumer skills.
- **Verify:** unit-test with mock pattern + coverage; HIGH unresolved health crisis → true.
- **Status:** [x] done — S206. `isConsequenceFloor_` + `CONSEQUENCE_FLOOR_DOMAINS` shipped in `utilities/priorityEngine.js`. Two design adjustments from plan: (1) **Signature expanded** from `(auditPattern, coverageState)` to `(seed, auditPattern, storylineState, coverageState)` — condition 2 needs seed.domain and storylineState.cyclesActive. Symmetric with `computePriorityScore_` for caller convenience. (2) **Crisis threshold aligned with T2.3** — plan said `lastRating ≤ -3`, ships at `≤ COVERAGE_THRESHOLDS.CRISIS_RATING` (-1, calibrated to live data). Floor and multiplier share the coverage signal; HIGH severity stamp is the differentiator (multiplier fires on any crisis, floor requires HIGH severity). 13 new self-test cases (plan acceptance, 2 trigger conditions, severity gate, top-domain restriction on cond 2, defensive nulls, lowercase normalization). 85/85 total pass. **Phase 2 research-build work complete (T2.1-T2.5).** Engine-sheet picks up T2.6 (wiring + linkedStorylineId loader expansion) and T2.7 (schema columns). T2.8 returns to research-build after live-cycle data accumulates.

#### T2.6: Wire Engine A into applyStorySeeds [engine/sheet]

- **Files:**
  - `phase07-evening-media/applyStorySeeds.js` — modify (extend `makeSeed`, expand `loadActiveStorylines_`)
- **Steps:**
  1. Inside `makeSeed`, after existing v3.9 byline suggestion block, call `computePriorityScore_` and `isConsequenceFloor_`. Pre-load Storyline_Tracker once per cycle (already happens at line 371 `loadActiveStorylines_`); pass that pre-loaded data into `loadStorylineStateForSeed_(seed, storylineData, currentCycle)` from `utilities/priorityEngine.js`.
  2. Add to seed return object:
     ```javascript
     priorityScore: priorityResult.priorityScore,
     priorityComponents: priorityResult.components,
     consequenceFloor: floorFlag
     ```
  3. Bump version stamp v3.10 → v3.11; document in file header.
  4. **Cleanup absorbed S206:** expand `loadActiveStorylines_` (line 371) to also read `LastCoverageCycle` (col S), `StorylineId` (col O), `MentionCount` (col T) into the storyline record. `parseStorylineRow_` reads `LastCoverageCycle` when present — currently `loadActiveStorylines_` doesn't surface it.
- **Verify:** existing `phase07-evening-media/__tests__/applyStorySeeds.test.js` (if exists) passes; new mock seed includes priorityScore field; `loadActiveStorylines_` returns records with `lastCoverageCycle` populated.
- **Status:** [x] done — S206 (engine-sheet). `applyStorySeeds.js` v3.10 → v3.11. (1) Pre-load block at line ~106 reads raw `Storyline_Tracker` + `Edition_Coverage_Ratings` into `storylineRawData` + `coverageRawData` 2D arrays at applyStorySeeds_ entry — closure-scoped so `makeSeed` invocations later in the function see populated arrays; empty-array defaults if sheets missing. (2) `makeSeed` priority block added after v3.9 suggestion: builds `seedForPriority = {domain, linkedStorylineId}`, calls `loadStorylineStateForSeed_` + `loadCoverageStateForDomain_` + `computePriorityScore_` + `isConsequenceFloor_` from `utilities/priorityEngine.js`; all behind `typeof === 'function'` guards so cycles still produce seeds even if priorityEngine.js fails to load. (3) Seed return object gains `priorityScore` + `priorityComponents` + `consequenceFloor` fields. (4) `loadActiveStorylines_` expanded with 3 col indexes (StorylineId / LastCoverageCycle / MentionCount) and 3 record fields. **Design note:** auditPattern arg passed null at engine-side (Apps Script doesn't have `output/engine_audit_c{XX}.json` — that's a post-cycle Node artifact); severity defaults to MED per priorityEngine T2.4 self-test. Audit-derived bumps would come from a separate post-cycle re-scoring path (out of scope T2.6). Two `getDataRange` reads on Storyline_Tracker per cycle (one for priority raw, one for active/dormant filtering inside loadActiveStorylines_) — kept independent for safety; trivial cost (~5K cells). clasp deploy LIVE S206. Smoke-test pending C94.

#### T2.7: Story_Seed_Deck schema columns [engine/sheet]

- **Files:**
  - `phase10-persistence/saveV3Seeds.js` — modify (add column writes)
  - `schemas/SCHEMA_HEADERS.md` — regen via `utilities/exportSchemaHeaders.js`
- **Steps:**
  1. Add columns: `PriorityScore`, `ConsequenceFloor`, `PriorityComponents` (JSON-serialized).
  2. Update writer to map seed object fields to new column indices.
  3. Run header detector: `node scripts/engineCycleAudit.js --writer-header-only` → 0 drift.
- **Verify:** `clasp push` then `node scripts/exportSchemaHeaders.js` → SCHEMA_HEADERS.md shows 3 new cols on Story_Seed_Deck.
- **Status:** [x] done — S206 (engine-sheet). `saveV3Seeds.js` v3.5 → v3.6. (1) `SEED_DECK_HEADERS` extended 12 → 15 cols with M=`PriorityScore` / N=`ConsequenceFloor` / O=`PriorityComponents`. (2) Row push maps `s.priorityScore != null ? s.priorityScore : ''` (M), `s.consequenceFloor === true` (N — strict-equality boolean), `JSON.stringify(s.priorityComponents \|\| {})` (O). (3) Live sheet widened from 12 → 15 cols via `lib/sheets.js` direct service-account write — `resizeSheet('Story_Seed_Deck', 15, null)` + `appendColumns('Story_Seed_Deck', 1, 12, ['PriorityScore', 'ConsequenceFloor', 'PriorityComponents'])`. (4) `node scripts/regenSchemaHeaders.js` ran post-widen — `schemas/SCHEMA_HEADERS.md` confirms 15 cols on Story_Seed_Deck. **Why service-account direct widen:** `ensureSheet_` only writes headers on new-sheet creation, not extension; `setValues` to col 15 on a 12-col sheet would have thrown next saveV3Seeds_ run. Sequenced widen → clasp push → regen so live sheet ready before deploy lands. clasp deploy LIVE S206 ("Script is already up to date" idempotency confirmed on retry). Smoke-test pending C94 (first cycle that exercises the wiring with priority engine code path live).

#### T2.8: Engine A 3-cycle validation harness [research-build]

- **Files:**
  - `scripts/validatePriorityEngine.js` — create
- **Steps:**
  1. Read `output/sift_proposals_c{XX}.json` for the last 3 cycles where priority engine was live.
  2. For each cycle, extract `proposals[].id` order (Mags' editorial pick order).
  3. Pull priority score from Story_Seed_Deck for the same seeds; compute Spearman correlation against Mags' order.
  4. Emit `output/priority_engine_validation_c{XX}.md` with per-cycle correlation + a roll-up.
- **Verify:** `node scripts/validatePriorityEngine.js` → exits 0; report shows ≥ 0.7 correlation per acceptance criterion 2 (or flags tuning need).
- **Status:** [ ] not started

---

### Phase 3 — Byline Engine (Engine B)

#### T3.1: Multi-axis byline scorer [research-build]

- **Files:**
  - `utilities/bylineEngine.js` — create
- **Steps:**
  1. Implement `scoreByline_(seed, journalist, state)` returning per-axis sub-scores:
     - `themeAxis` — existing partial-match scoring from `suggestStoryAngle_` logic, ported.
     - `formatAxis` — see T3.2.
     - `cadenceAxis` — see T3.3.
     - `arcBindingAxis` — see T3.4.
  2. `scoreAllBylines_(seed, state)` returns ranked array `[{ name, score, components, confidence }]`.
  3. Confidence = `(top.score - second.score) / top.score` clamped 0–1; categorical mapping `> 0.4 = high`, `0.2–0.4 = medium`, `< 0.2 = low`.
- **Verify:** unit-test with mock seeds; civic-severity-high seed scores Carmen Delaine top, not Simon Leary.
- **Status:** [ ] not started

#### T3.2: Format-fit classifier [research-build]

- **Files:**
  - `utilities/bylineEngine.js` — modify
- **Steps:**
  1. Add `inferSeedFormat_(seed)` returning `'edition' | 'supplemental' | 'dispatch' | 'interview'`.
     - Engine ailment + civic = `edition`. Single-citizen profile = `interview`. Scene + neighborhood + time-anchored = `dispatch`. Topic deep-dive without urgent severity = `supplemental`.
  2. Add `formatFitScore_(journalist, format)` table — e.g., DJ Hartley scores high on dispatch (scene/photo), Hal Richmond high on supplemental (long-view), Carmen high on edition (civic lead).
- **Verify:** unit-test five seed shapes → returns expected format; format-fit returns expected ranking.
- **Status:** [ ] not started

#### T3.3: Byline cadence cap [research-build]

- **Files:**
  - `utilities/bylineEngine.js` — modify
- **Steps:**
  1. Add `loadCycleCadence_(cycle)` reading current cycle's already-emitted seeds from Story_Seed_Deck and returning `{ bylineName: emittedCount }`.
  2. Add `cadenceMultiplier_(journalist, cadence, totalSeeds)` — returns 1.0 if `cadence[name] / totalSeeds < 0.20`, scales down to 0.3 when ratio ≥ 0.25.
  3. Cap is configurable constant `CADENCE_CAP_RATIO = 0.25`.
- **Verify:** unit-test — feeding Simon Leary at 0.25 ratio reduces his next-seed score by 70%.
- **Status:** [ ] not started

#### T3.4: Arc-byline binding [research-build]

- **Files:**
  - `utilities/bylineEngine.js` — modify
- **Steps:**
  1. Add `loadArcBinding_(arcId)` reading `Storyline_Tracker.AssignedReporter` (column TBD in T3.5 — Open Question Q3).
  2. `arcBindingScore_(journalist, arcBinding)` returns +3 if name matches binding, 0 otherwise.
  3. Binding decays — if arc closed (Storyline_Tracker.Status = `resolved`), binding nullified.
- **Verify:** unit-test — Hal bound to dynasty arc → next dynasty seed scores Hal +3.
- **Status:** [ ] not started

#### T3.5: Storyline_Tracker AssignedReporter column [engine/sheet]

- **Files:**
  - `phase06-analysis/storylineWeavingEngine.js` — modify
  - `schemas/SCHEMA_HEADERS.md` — regen
- **Steps:**
  1. Add `AssignedReporter` column to Storyline_Tracker.
  2. Populate when an arc surfaces in 2+ consecutive editions covered by the same byline (auto-bind on observed pattern, not preassignment).
  3. Header-drift detector pass.
- **Verify:** `clasp push` + regen → column appears.
- **Status:** [ ] not started

#### T3.6: Wire Engine B into applyStorySeeds [engine/sheet]

- **Files:**
  - `phase07-evening-media/applyStorySeeds.js` — modify (replace v3.9 suggestion block)
- **Steps:**
  1. Replace `suggestStoryAngle_` call site with `bylineEngine.scoreAllBylines_(seed, state)`.
  2. Take top result for default `bylineCandidate`; serialize top-3 ranked candidates for transparency.
  3. Field map:
     ```javascript
     bylineCandidate: ranked[0].name,
     bylineConfidence: ranked[0].confidence,
     bylineRationale: { components: ranked[0].components, alternates: ranked.slice(1, 3) }
     ```
- **Verify:** existing seed-deck regression test passes; new fields populated.
- **Status:** [ ] not started

#### T3.7: Story_Seed_Deck columns for byline output [engine/sheet]

- **Files:**
  - `phase10-persistence/saveV3Seeds.js` — modify
  - `schemas/SCHEMA_HEADERS.md` — regen
- **Steps:**
  1. Add columns: `BylineCandidate`, `BylineConfidence`, `BylineRationale` (JSON-serialized).
  2. Existing `SuggestedJournalist` column kept for one cycle (transition); deprecation note in file header.
- **Verify:** regen + clasp push.
- **Status:** [ ] not started

#### T3.8: Shadow-run logger in /sift [research-build]

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify Step 3
- **Steps:**
  1. In Step 3, after Mike confirms reporter assignments, write `output/byline_shadow_log_c{XX}.json` recording per-seed `engineCandidate vs finalAssignment` + accept/reject + confidence at decision time.
  2. Engine candidates do NOT auto-pre-fill in shadow mode — sift still prompts Mags + Mike normally.
- **Verify:** next sift run produces the log file.
- **Status:** [ ] not started

#### T3.9: Cadence-cap distribution check [research-build]

- **Files:**
  - `scripts/checkBylineCadence.js` — create
- **Steps:**
  1. Read live cycle's seed-deck output.
  2. For each byline, compute `emitted / total`.
  3. Fail (exit 1) if any byline > 25%; else exit 0 with table.
- **Verify:** runs against C94 first live cycle → 0 exit code; report shows even distribution.
- **Status:** [ ] not started

---

### Phase 4 — Consumer-surface wiring

#### T4.1: /sift Step 2 priority consumption [research-build]

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify Step 2
- **Steps:**
  1. Document: read `priorityScore` and `consequenceFloor` from Story_Seed_Deck for each cycle's seeds.
  2. Floor seeds appear in Mode A/B output with a `[FLOOR]` tag — Mike can re-order WITHIN floor, can't suppress floored items.
  3. Non-floor seeds ranked by `priorityScore` in proposal order.
- **Verify:** SKILL.md diff matches description; next sift run respects floor.
- **Status:** [ ] not started

#### T4.2: /sift Step 3 byline pre-fill at high-conf threshold [research-build]

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify Step 3
- **Steps:**
  1. Document confidence-threshold rule:
     - `bylineConfidence = high` → pre-fill in proposal table; Mags reviews.
     - `bylineConfidence = medium` → present as suggestion, Mags confirms.
     - `bylineConfidence = low` → ignore; Mags assigns from scratch.
  2. **Initial threshold for shadow run: ALL fall through to Mags decision regardless of confidence.** Promote to threshold-driven only after Phase 6 cutover.
- **Verify:** SKILL.md updated; shadow run still produces full Mags-driven assignments.
- **Status:** [ ] not started

#### T4.3: /write-supplemental byline pool unlock [research-build]

- **Files:**
  - `.claude/skills/write-supplemental/SKILL.md` — modify
- **Steps:**
  1. Document: supplemental skill consumes `bylineCandidate` from full 25-byline rosterLookup pool (Simon Leary, Luis Navarro, Trevor Shimizu, etc. all valid).
  2. Add note: edition's 9-reporter table does NOT constrain supplemental.
- **Verify:** skill diff + sources frontmatter pointer to this plan.
- **Status:** [ ] not started

#### T4.4: /dispatch scene-fit override [research-build]

- **Files:**
  - `.claude/skills/dispatch/SKILL.md` — modify
- **Steps:**
  1. Document: dispatch reads `bylineRationale.components.formatAxis` to identify scene-fit bylines.
  2. DJ Hartley / Maria Keen / Mason Ortega / Kai Marston are the canonical dispatch pool unless override.
- **Verify:** skill diff.
- **Status:** [ ] not started

#### T4.5: /interview wire matchCitizenToJournalist_ [research-build]

- **Files:**
  - `.claude/skills/interview/SKILL.md` — modify
- **Steps:**
  1. Document: interview skill calls `matchCitizenToJournalist_(archetype, neighborhood, domain)` (already exists in `rosterLookup.js:907`).
  2. Output flows into the briefing as `interviewerCandidate` field.
- **Verify:** skill diff.
- **Status:** [ ] not started

---

### Phase 5 — Editorial transparency

#### T5.1: Rationale payload format [research-build]

- **Files:**
  - `docs/concepts/routing-rationale.md` — create
- **Steps:**
  1. Define the canonical rationale shape:
     ```json
     {
       "priorityScore": 8.4,
       "priorityComponents": { "domain": 9, "severity": 1.5, "arc": 1.2, "coverage": 1.0 },
       "consequenceFloor": true,
       "bylineCandidate": "Carmen Delaine",
       "bylineConfidence": "high",
       "bylineRationale": {
         "components": { "theme": 4, "format": 2, "cadence": 1.0, "arcBinding": 0 },
         "alternates": [{ "name": "Luis Navarro", "score": 5.2 }, { "name": "Trevor Shimizu", "score": 4.0 }]
       }
     }
     ```
  2. Document where it surfaces — Story_Seed_Deck columns, `output/sift_proposals_c{XX}.json`, future `/sift` proposal table renderings.
- **Verify:** doc registered in `docs/index.md`.
- **Status:** [ ] not started

#### T5.2: Sift proposal table renders rationale [research-build]

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify Step 2 proposal output format
- **Steps:**
  1. Add a one-line "why" suffix to each proposal: `[priority 8.4 / floor / Carmen high-conf — civic-severity + arc 3 cycles]`.
  2. Format spec referenced from `docs/concepts/routing-rationale.md`.
- **Verify:** SKILL.md diff; example in step output.
- **Status:** [ ] not started

---

### Phase 6 — Cadence: shadow → authoritative

#### T6.1: Shadow-run accept/reject report [research-build]

- **Files:**
  - `scripts/bylineShadowReport.js` — create
- **Steps:**
  1. After 3 cycles of shadow-run, read `output/byline_shadow_log_c{XX}.json` for each.
  2. Compute per-axis: agree-rate at high-conf, agree-rate at medium-conf.
  3. Surface concentration patterns (any byline accept-rate > 80% or < 30%).
- **Verify:** `node scripts/bylineShadowReport.js` → `output/byline_shadow_report.md`.
- **Status:** [ ] not started

#### T6.2: Cutover decision gate [research-build]

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify Step 3 confidence threshold
- **Steps:**
  1. After T6.1, IF high-conf agree-rate ≥ 85% across 3 cycles, switch sift Step 3 from "fall through" to "pre-fill at high-conf, suggest at medium-conf, ignore at low-conf" per T4.2 design.
  2. ELSE file a tuning task; do not promote.
- **Verify:** SKILL.md diff documents the cutover; gate decision recorded in this plan's Changelog.
- **Status:** [ ] not started

---

## Open questions

Questions that block a task. Resolve and delete. An open question at publish time is a plan defect.

- [ ] **Q1 — Domain weight numerics.** T2.1 ships with a starter table. Mike's grill said "Health probably higher than traffic" — that's directional, not numeric. Resolve before Phase 2 declares Engine A authoritative. Path: 3-cycle shadow validation will surface miscalibrations; tune from there.
- [ ] **Q2 — Cadence cap percentage.** T3.3 sets `CADENCE_CAP_RATIO = 0.25` as starter. May need lowering if cycle has many seeds (cap binds harder). Empirical from T3.9 first run.
- [ ] **Q3 — Storyline_Tracker AssignedReporter column placement.** T3.5 adds the column; column letter / position TBD until SCHEMA_HEADERS regen reveals the live shape after engine-sheet's pending B3-B7 work.
- [ ] **Q4 — Anti-creativity rule made explicit.** Should this plan declare a rule like "Engine B never picks angle text — only candidate byline + voice guidance"? Mike's grill grounded the angle-creative-act position; codify it as a hard constraint here, not just plan prose. Path: add a §"Hard Constraints" section before merging plan from draft → active.

---

## Hard Constraints

(Promoted from Q4 once resolved.)

- Engine A picks priority order. Engine B picks byline candidate. **Neither writes angle text.** Angle remains Mags' editorial act until storyline-memory in routing matures (post-plan, follow-up).
- Consequence floor is non-negotiable from sift's view. User editorial preference cannot bury a floored seed; it can only re-order within the floored band.
- Engine B is suggestion, not assignment. Confidence threshold gates auto-pre-fill; below threshold, Mags assigns.

---

## Mags' Input Contract

The line between engine and Mags, made explicit. Locks the design principle that drove the two-engine split: structured flow constrains the persona; creative space is defined and bounded.

### What Mags consumes (engine produces)

After this plan ships:

| Bundle | Source | What it carries |
|---|---|---|
| **Seeds** | Story_Seed_Deck (Phase 7 emit) | Priority score + consequence-floor flag (Engine A); byline candidate + confidence + rationale (Engine B); existing v3.7 archetype-driven suggested citizens |
| **City-hall production log** | `output/production_log_city_hall_c{XX}.md` | Voice decisions, faction positions, tracker updates, key quotes |
| **World summary** | `output/world_summary_c{XX}.md` | Factual cycle picture + engine-review framing |
| **Newsroom memory** | `docs/mags-corliss/NEWSROOM_MEMORY.md` | Errata, coverage gaps, character continuity, prior-coverage context |

Future bundles (out of this plan's scope, flagged as follow-ups):
- **Citizen-arc bindings** — narrative-arc-driven citizen ties (e.g., Vivienne Torres = Temescal health voice across 3 editions). Engine B-adjacent function; would balloon this plan past task-budget.
- **Pre-fetched arc context** — see "Mags' creative-zone access" below; possibly defer indefinitely.

### What Mags does (bounded creative acts)

Within the structured input bundle, Mags' EIC role is:

1. **Angle pick** — for each seed, the editorial framing. Engine never writes angle text.
2. **Weave call** — which arcs interconnect this cycle, which gaps are intentional silence, which storylines bear amplification.
3. **Brief writing** — producing reporter angle briefs from the structured pick.
4. **Arc judgment** — the EIC override on warm-vs-cold (3-cycle arc beats higher-scored cold seed).

These are the spaces where LLM creative latitude is allowed and necessary. Outside them, Mags executes against structure — no derivation, no scavenger hunt, no hand-routing.

### Mags' creative-zone access

Bay-tribune Supermemory canon search remains Mags' working memory for storyline continuity. **Accepted by design (path a).** The engine produces structure; bay-tribune lets Mags polish narrative with the expansive LLM effect the engine can't replicate. Search is the discovery, not just retrieval — pre-fetched arc summaries lose the texture. The cost of every-sift-cycle search is the cost of EIC judgment; that's the product, not overhead.

If a future cycle pattern proves the search is mechanical (Mags always pulls the same context types, never finds surprises), revisit and consider path (b) pre-fetch enrichment. Until then, Mags searches.

### Scavenger work this plan eliminates

No longer Mags' problem after this plan ships:
- Hand-routing reporters by reading raw narrative — Engine B
- Re-deriving story priority every sift cycle from world summary text — Engine A
- MCP citizen-verification scavenger hunts for archetype matches — Engine B's citizen tie (existing v3.7 `suggestedCitizens` + future arc binding)

Still Mags' problem, follow-up plans needed:
- Cross-edition citizen-arc binding — separate plan after Engine B matures
- Cycle-specific arc-gap detection ("this storyline hasn't appeared in 4 editions, refrigerator test") — partially covered by newsroom memory; may need pre-fetch enrichment if mechanical

---

## Changelog

- 2026-05-07 — Initial draft (S205, research-build). Three grill rounds: (Q1) angle is the irreducible creative act; (Q2) cross-cycle storyline memory is the missing capability for full angle automation; (Q3) story priority and byline are separate concerns — pressure-tested two paths, two-engine split chosen for structural enforcement of the "user can't override engine consequence" rule, independent trust thresholds, and failure isolation. Sequence-by-design (one-cycle lag) confirmed by Mike. Existing framework leveraged: `applyStorySeeds.js` v3.10, `Storyline_Tracker`, `Edition_Coverage_Ratings`, `engine_audit_c{XX}.json`, `rosterLookup.js`. 22 tasks across 6 phases.
- 2026-05-07 — Phase 1 closed (S206, research-build). T1.1 + T1.2 done. `scripts/diagnoseRoutingMatcher.js` shipped + run; `output/routing_diagnosis_c93.md` + appended root-cause diagnosis emitted. Findings refine the hypothesis: pathology is two-layered. (Layer 1) domain classifier dumps 76% of seeds into GENERAL; typed-domain routing is clean (HEALTH/COMMUNITY/SPORTS/CULTURE/SAFETY/FAITH/ENV/ECON each 100% specialist; CIVIC 88%). (Layer 2) GENERAL keywords `['stability','quiet','texture']` overlap Simon Leary's themes by structural design — Simon scores 5 on every GENERAL seed (texture exact +3, stability partial +1, quiet partial +1), clears HIGH-confidence threshold; closest competitor scores 1 (below admit threshold). Result: GENERAL→Simon at 99.9% (838/839) HIGH-confidence by design, not by accident. Implication: cadence cap (T3.3) becomes load-bearing — Engine B alone won't break the lock since structural overlap survives; cadence cap is what forces spillover. Phase 2 (Engine A) unblocked.
- 2026-05-07 — Phase 2 research-build closed (S206). T2.1–T2.5 all done in `utilities/priorityEngine.js` (~430 lines, 85 self-tests passing). Shipped: `DOMAIN_WEIGHTS` (19 keys, expanded to seed-side superset + engine canonical), `SEVERITY_MULTIPLIERS`, `STORYLINE_PRIORITY_TO_SEVERITY`, `COVERAGE_DOMAIN_NORMALIZE` (CRIME→SAFETY etc.), `COVERAGE_THRESHOLDS` (calibrated to live data: saturation ≥+3, crisis ≤-1), `CONSEQUENCE_FLOOR_DOMAINS`. Functions: `computeArcMultiplier_`, `parseStorylineRow_`, `loadStorylineStateForSeed_`, `parseCoverageRow_`, `loadCoverageStateForDomain_`, `computeCoverageMultiplier_`, `computePriorityScore_` (composer), `isConsequenceFloor_` (boolean flag). Three plan-amendments documented in per-task status entries: (1) `loadStorylineState_` signature changed to pure-function lookup over pre-loaded sheet data (runtime-neutral — caller fetches via SpreadsheetApp or `lib/sheets.js`); (2) DOMAIN_WEIGHTS expanded to absorb seed-side reality (FAITH, ECONOMIC, ENVIRONMENT, EDUCATION) without unifying engine-wide vocabulary (~10-site blast radius — separate plan); (3) crisis threshold ≤-3 dropped to ≤-1 to match live rating range. Two engine-sheet items folded into T2.6 spec: `loadActiveStorylines_` column expansion (LastCoverageCycle minimum) + optional `linkedStorylineId` cosmetic rename. Engine-sheet picks up T2.6 + T2.7 next; T2.8 (3-cycle validation harness) returns to research-build after engine-sheet ships and ≥3 cycles run with priority engine wired.
