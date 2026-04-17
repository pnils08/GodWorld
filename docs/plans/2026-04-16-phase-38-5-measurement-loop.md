---
title: Phase 38.5 Measurement Loop Plan
created: 2026-04-16
updated: 2026-04-16
type: plan
tags: [engine, active]
sources:
  - docs/engine/PHASE_38_PLAN.md §8 (38.5 out-of-scope note) + §16.5 (downstream follow-ups)
  - docs/engine/ROLLOUT_PLAN.md §Phase 38 item 38.5 — "Measurement loop. Each ailment flagged gets a 'check next cycle' entry with specific fields to watch."
  - MEMORY.md — feedback_detector-framer-split.md (S146 pattern)
pointers:
  - "[[engine/PHASE_38_PLAN]] — parent phase doc (contains §§4, 14, 15, 16 enricher pattern this extends)"
  - "[[engine/ROLLOUT_PLAN]] — old spine step 8; splitting out now"
  - "[[plans/2026-04-16-phase-38-6-skill-shrink]] — downstream skill edit that consumes this enricher's output"
  - "[[plans/TEMPLATE]] — shape this plan follows"
---

# Phase 38.5 Measurement Loop Plan

**Goal:** Add a deterministic enricher that measures whether prior-cycle remedy predictions actually fired, writing a structured `measurement` field per pattern that downstream skills and future cycles can consume.

**Architecture:** A new module `scripts/engine-auditor/measureRemedies.js` runs in the `engineAuditor.js` orchestrator after the existing detectors + 38.2 mitigator check + 38.3 remedy recommendation + 38.4 Tribune framing enrichers. It reads `output/engine_audit_c{XX-1}.json`, extracts each prior pattern's `remedyPath.worldSide[0].expectedEngineEffect`, compares against the current cycle's observed state, and mutates current-cycle patterns in place with a `measurement` field. Output JSON gains a new top-level `measurementHistory[]` field for long-run remedy learning.

**Terminal:** engine/sheet

**Pointers:**
- Prior work: `scripts/engine-auditor/checkMitigators.js` (38.2), `recommendRemedy.js` (38.3), `generateTribuneFraming.js` (38.4) — same enricher pattern
- Related plan: [[plans/2026-04-16-phase-38-6-skill-shrink]] (blocked-by this one for full measurement display; can partially land without it)
- Research basis: PHASE_38_PLAN §16.5 measurement follow-up
- Parent rollout entry: ROLLOUT_PLAN §Phase 38 item 38.5

**Acceptance criteria:**
1. `node scripts/engineAuditor.js` on C91 (no C90 audit exists) completes without errors; every pattern carries `measurement: { available: false, reason: 'no-prior-audit' }`.
2. Synthetic fixture test: with a hand-crafted `output/engine_audit_c90.json` containing a Temescal stuck-initiative pattern and `expectedEngineEffect: 'neighborhoodHealth.Temescal +0.05/cycle from construction-active milestone'`, running against C91 populates C91's Temescal pattern with `measurement: { available: true, expected: +0.05, observed: <actual>, delta: <computed>, verdict: 'remedy-not-firing' | 'remedy-firing-as-expected' | 'remedy-firing-insufficient' | 'remedy-overshot' }`.
3. Top-level `measurementHistory[]` array in audit JSON records one entry per pattern measured this cycle, with pattern type + remedy type + verdict. Future cycles append to this (via deep-read across prior audit JSONs, not by mutating old files).
4. Combined runtime (38.1 detectors + 38.2 + 38.3 + 38.4 + 38.5) under 60s on C91 — budget carried forward from prior plans.
5. Deterministic across two runs on same inputs (no LLM, no randomness, no date math beyond what's already in the other detectors).
6. Schema addition to `patterns[].measurement` documented at the top of `scripts/engine-auditor/measureRemedies.js` as a JSDoc block — matches the documentation pattern the other enricher modules already follow.

---

## Tasks

### Task 1: Scaffold the module

- **Files:**
  - `scripts/engine-auditor/measureRemedies.js` — create
- **Steps:**
  1. Export signature `module.exports.enrich = async (patterns, ctx) => patterns` matching `checkMitigators.js` and `recommendRemedy.js`.
  2. Add a JSDoc header block documenting the `measurement` field schema (see §Schema below in Open Questions if schema lands elsewhere).
  3. Stub returns patterns unchanged. Verify `engineAuditor.js` still runs end-to-end after import wiring.
- **Verify:** `node scripts/engineAuditor.js` exits 0, output JSON unchanged from prior run (diff should be empty aside from timestamps).
- **Status:** [x] done — S156

### Task 2: Read prior-cycle audit JSON

- **Files:**
  - `scripts/engine-auditor/measureRemedies.js` — modify
- **Steps:**
  1. Compute prior cycle number: `ctx.cycle - 1`.
  2. Construct path: `output/engine_audit_c${prior}.json`.
  3. Read file if exists; parse JSON; validate it contains a `patterns[]` array. If any step fails, set `ctx.priorAudit = null` and continue (not an error).
  4. If file exists and parses, set `ctx.priorAudit = { cycle, patterns }`.
- **Verify:** Run against C91 with no C90 file → `ctx.priorAudit === null`. Run with a stub C90 file containing an empty patterns array → `ctx.priorAudit.patterns.length === 0`.
- **Status:** [x] done — S156

### Task 3: Pattern-matching logic (current ↔ prior)

- **Files:**
  - `scripts/engine-auditor/measureRemedies.js` — modify
- **Steps:**
  1. For each current pattern, find the prior pattern with the same `type` and overlapping `affectedEntities.initiatives` (at least one ID in common) OR same `type` and overlapping `affectedEntities.neighborhoods` (at least one name in common when initiatives is empty).
  2. Match is unique-pair: if multiple prior patterns match, take the one with the highest `severity` and, on tie, the earliest `cyclesInState` (most entrenched). Log collisions for engine-terminal review.
  3. If no prior match, `measurement = { available: false, reason: 'no-prior-match' }`.
  4. If prior match exists but prior pattern had no `remedyPath.worldSide[0].expectedEngineEffect` populated, `measurement = { available: false, reason: 'prior-had-no-expectation' }`.
- **Verify:** Synthetic fixture — prior patterns `[A, B]` with A matching current pattern on `affectedEntities.initiatives: ['INIT-005']`; assert current pattern for Temescal resolves to prior A.
- **Status:** [x] done — S156

### Task 4: Compute observed delta + verdict

- **Files:**
  - `scripts/engine-auditor/measureRemedies.js` — modify
- **Steps:**
  1. For matched pair, read prior pattern's `remedyPath.worldSide[0].expectedEngineEffect` string. Parse format `<field-path> <sign><magnitude>/cycle from <trigger>`. Example: `neighborhoodHealth.Temescal +0.05/cycle from construction-active milestone`.
  2. Resolve `field-path` against the current cycle's loaded sheet state (`ctx.sheets.neighborhoodMap`, etc. — reuse whatever path resolution the mitigator check uses to avoid a new parser).
  3. Read prior cycle's value for the same field from the prior audit's snapshot (`ctx.priorAudit.snapshots` — mirrors the `thin snapshot persistence` §2 note in PHASE_38_PLAN).
  4. Compute `observed = current - prior`, `delta = observed - expected`.
  5. Classify verdict:
     - `|delta| < 0.2 * |expected|` → `remedy-firing-as-expected`
     - `sign(observed) !== sign(expected)` → `remedy-not-firing`
     - `|observed| > 0 && |observed| < |expected|` → `remedy-firing-insufficient`
     - `|observed| > 1.5 * |expected|` → `remedy-overshot`
- **Verify:** Synthetic C90 → C91 fixture where Temescal health stayed flat (observed=0) when expected=+0.05 → verdict is `remedy-not-firing`, delta=-0.05.
- **Status:** [x] done — S156

### Task 5: Populate measurement field on current patterns

- **Files:**
  - `scripts/engine-auditor/measureRemedies.js` — modify
- **Steps:**
  1. Mutate each matched current pattern: `pattern.measurement = { available: true, priorCycle, expectedField, expected, observed, delta, verdict, priorRemedyType: prior.remedyPath.worldSide[0].type }`.
  2. Return the mutated patterns array.
- **Verify:** After enricher runs, every current pattern has a `measurement` field. None throw on access.
- **Status:** [x] done — S156

### Task 6: Top-level `measurementHistory[]` rollup

- **Files:**
  - `scripts/engineAuditor.js` — modify (orchestrator)
  - `scripts/engine-auditor/measureRemedies.js` — modify (return rollup)
- **Steps:**
  1. After per-pattern enrichment, collect an array of `{ cycle, patternType, priorRemedyType, verdict, affectedEntities }` entries for every pattern with `measurement.available === true`.
  2. Orchestrator writes this array as the top-level `measurementHistory[]` field in the final audit JSON. Not nested under `summary` — it's its own field because future cycles will want to append across many cycles.
- **Verify:** C91 output JSON has top-level `measurementHistory: []` when no prior; has populated entries when a prior fixture is in place.
- **Status:** [x] done — S156

### Task 7: Wire the enricher into the orchestrator

- **Files:**
  - `scripts/engineAuditor.js` — modify
- **Steps:**
  1. After the `generateTribuneFraming.enrich(patterns, ctx)` call, add `patterns = await require('./engine-auditor/measureRemedies').enrich(patterns, ctx)`.
  2. Preserve the existing post-enricher summary rollup.
- **Verify:** `node scripts/engineAuditor.js` produces `engine_audit_c{XX}.json` with every pattern carrying a `measurement` field (even if `available: false`). Diff against prior run shows the new field and nothing else.
- **Status:** [x] done — S156

### Task 8: Fixture test

- **Files:**
  - `scripts/engine-auditor/fixtures/engine_audit_c90_temescal.json` — create (synthetic fixture)
  - `scripts/engine-auditor/measureRemedies.test.js` — create or reuse existing test harness if one exists in `scripts/engine-auditor/`
- **Steps:**
  1. Hand-craft a minimal C90 audit JSON with one Temescal stuck-initiative pattern containing `remedyPath.worldSide[0].expectedEngineEffect: 'neighborhoodHealth.Temescal +0.05/cycle from construction-active milestone'`.
  2. Include a `snapshots.neighborhoodMap.Temescal.health: 0.42` (prior value).
  3. With current C91 `neighborhoodHealth.Temescal = 0.42` (unchanged), run enricher.
  4. Assert C91's Temescal pattern receives `measurement.verdict === 'remedy-not-firing'`, `delta === -0.05`.
- **Verify:** `node scripts/engine-auditor/measureRemedies.test.js` exits 0 with passing assertion.
- **Status:** [x] done — S156

### Task 9: Update PHASE_38_PLAN.md with 38.5 section

- **Files:**
  - `docs/engine/PHASE_38_PLAN.md` — modify
- **Steps:**
  1. Append a `## 18. Phase 38.5 — Measurement loop` section using the §14/§15/§16 shape. Cover goal, files, schema, logic, acceptance criteria, out-of-scope.
  2. Update the plan's top-of-file pointers frontmatter to add the 38.5 spine reference.
  3. Add a changelog line: `2026-04-16 — Appended §18 (Phase 38.5 measurement loop). Implemented S??? per [[plans/2026-04-16-phase-38-5-measurement-loop]].`
- **Verify:** `grep -c "Phase 38.5" docs/engine/PHASE_38_PLAN.md` returns ≥ 2 (one in TOC/header, one in new section).
- **Status:** [x] done — S156

---

## Open questions — RESOLVED 2026-04-16 (S154)

- [x] **Snapshot location — RESOLVED.** Verified against `output/engine_audit_c91.json`. Audit JSON `snapshots` carries: `Initiative_Tracker`, `Neighborhood_Map`, `Civic_Office_Ledger`, `Crime_Metrics`. `Neighborhood_Map` IS persisted, so neighborhood-health comparisons work. The earlier note ("only citizenIncomes + Crime_Metrics") was outdated. Task 4 can read prior `neighborhoodHealth` directly from `priorAudit.snapshots.Neighborhood_Map`.
- [x] **`expectedEngineEffect` parse format — RESOLVED, BUT BLOCKING IN A DIFFERENT WAY.** Read `scripts/engine-auditor/remedyTemplates.json`. Strings are free-form descriptive prose with template variables, not the inferred `<field> <sign><mag>/cycle from <trigger>` grammar. Examples:
  - `"{category} metrics stabilize if council passes + agent implements"`
  - `"{expectedField} moves {expectedSign} once phase advances"`
  - `"NextScheduledAction fires within 1-2 cycles"`
  - `"severity drops to medium/low next cycle"`

  **Implication for Task 4:** the original Task 4 plan (regex-parse the prose) won't work — there is no consistent grammar to parse. Two viable paths:
  - **Path A (smaller — recommended).** Add a structured `measurementSpec: { field, sign, magnitudeThreshold }` field to each remedy template in `remedyTemplates.json`, populated by `recommendRemedy.js` alongside the existing prose `expectedEngineEffect`. Task 4 reads `measurementSpec` directly. Upstream change scope: ~9 templates in one JSON file + one resolver line in `recommendRemedy.js`. Backwards-compatible with everything that consumes the prose string today.
  - **Path B (larger).** Drop the explicit-prediction approach. Use the existing `mitigatorState.mitigators[*].effectEvidence.expectedField + expectedSign + magnitudeThreshold` (already structured per Step 2 of the engine-review skill) as the measurement spec. Task 4 doesn't need `expectedEngineEffect` at all — it reads the mitigator's expected field directly. Requires re-scoping Task 3 (matching) and Task 4 (delta computation) around mitigator entries instead of remedyPath entries.

  **Decision needed before engine starts Task 4:** which path. Path A keeps the plan's logic intact and adds one small upstream change. Path B removes the parsing problem entirely but reshapes the matching logic. Either resolves the blocker.

---

## Out of scope

- Multi-cycle remedy-type success rates (e.g., "advance-initiative has worked 3/7 times over the last 20 cycles"). That aggregation is the job of the skill (38.6) or a separate analytics pass.
- Any engine-side fix for writeback chains that 38.5 detects as broken — still 38.3 tech-side fallback territory, not this.
- Narrative framing of the measurement result — that's the skill's job (38.6).

---

## Changelog

- 2026-04-16 — Initial draft (S152, research-build terminal). First plan written against [[plans/TEMPLATE]]. Scoped to 9 tasks after discovering 38.6 skill integration (spine-step-5 follow-ups) already landed S146, so this plan focuses only on the new enricher and leaves the skill edit to a separate plan.
- 2026-04-16 — Implemented (S154/S156, engine-sheet terminal). All 9 tasks done. Path A resolved — `measurementSpec` derived in `recommendRemedy.fill()` from existing `effectEvidence` (no `remedyTemplates.json` change needed). Test suite 19/19 passing. Live auditor verified deterministic with fixture; Temescal C90→C91 produces `remedy-not-firing` verdict end-to-end. Schema added per pattern, `measurementHistory[]` rollup at top level. PHASE_38_PLAN.md §18 documents the build.
