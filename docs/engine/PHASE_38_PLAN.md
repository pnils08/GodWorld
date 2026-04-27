---
title: Phase 38 Implementation Plan — Engine Auditor
created: 2026-04-14
updated: 2026-04-14
type: plan
tags: [engine, architecture, active]
sources:
  - "[[engine/ROLLOUT_PLAN]] §Phase 38 — design intent, seven-field schema, Temescal paradigm"
  - ".claude/skills/engine-review/SKILL.md — existing natural-language version of detection patterns"
  - "Supermemory mags doc FzoBwCif9ZA3PGBqv5bBAW — full S142 design thesis"
pointers:
  - "[[SCHEMA]] — this is the first new doc following the schema (proves the wiki layer)"
  - "[[engine/ROLLOUT_PLAN]] — spine step 2"
  - ".claude/skills/engine-review/SKILL.md — skill that consumes this script's output"
  - "lib/sheets.js — service account read pattern to follow"
---

# Phase 38 Implementation Plan — Engine Auditor

**Spine step:** 2 of 10 (after 41.1 + 41.2 wiki layer).
**Terminal handoff:** `(engine terminal)` — research/build wrote this plan; engine/sheet terminal executes.
**Status:** MOSTLY DONE S146. 38.1 detector + 38.2/38.3/38.4 enrichers + 38.7 anomaly gate + 38.8 baseline briefs all shipped S146 (spine steps 2, 3, 5). 38.5 measurement loop and 38.6 skill shrink extracted to separate plan files: [[plans/2026-04-16-phase-38-5-measurement-loop]] (DONE S156) + [[plans/2026-04-16-phase-38-6-skill-shrink]] (DONE S156). All Phase 38 sub-phases now closed. This plan file remains for design intent + spec reference.

---

## 1. The split: detector vs framer

The S142 design and the existing `/engine-review` skill conflate two things: **detecting** patterns in engine state (mechanical, deterministic, scriptable) and **framing** each pattern as a seven-field ailment brief with story handles (judgment, narrative, requires Mags or a reviewer).

**Phase 38.1 = the detector only.** Code that scans sheets and emits a structured JSON list of detected patterns. The seven-field framing stays in Mags's `/engine-review` skill, which now reads the JSON instead of re-discovering everything from raw sheets.

This split keeps code doing what code is good at (deterministic pattern matching) and keeps Mags doing what she's good at (story handles, three-layer coverage, Tribune framing brief). It also makes the output testable.

---

## 2. Files to create

| Path | Role |
|---|---|
| `scripts/engineAuditor.js` | The main script. Reads sheets via `lib/sheets.js`, runs detection passes, writes JSON output. Run as `node scripts/engineAuditor.js` (no args — uses `getCurrentCycle.js`). |
| `output/engine_audit_c{XX}.json` | Structured detection output, one file per cycle. Read by `/engine-review` skill. |
| `scripts/engine-auditor/` (dir) | One detector module per pattern type (see §4). Keeps `engineAuditor.js` thin. |

No new sheet tabs. No engine code edits. Read-only against the spreadsheet.

---

## 3. Inputs (from existing sheets)

Reuse the input list already documented in `.claude/skills/engine-review/SKILL.md`. Service account read via `lib/sheets.js`:

- `Riley_Digest` — current + previous 2 cycles (trend detection)
- `Initiative_Tracker` — initiative states, ImplementationPhase column
- `Neighborhood_Map` — 17 neighborhoods, 27 columns
- `WorldEvents_V3_Ledger` — events generated this cycle
- `Civic_Office_Ledger` — council positions, approval ratings
- `Population_Stats` / `World_Population` — economic indicators
- `Crime_Metrics` — per-neighborhood crime state
- `Transit_Metrics` — transit performance
- `Edition_Coverage_Ratings` — what the Tribune covered last cycle
- `Event_Arc_Ledger` — active arcs and tension
- `Storyline_Tracker` — active storylines and status

Plus prior audit JSON for measurement-loop comparison: `output/engine_audit_c{XX-1}.json` (if exists).

---

## 4. Detector modules (one file each in `scripts/engine-auditor/`)

Each module exports a function `detect(ctx) → Pattern[]`. `ctx` is the assembled sheet snapshot. Patterns share a common shape:

```js
{
  type: 'repeating-event' | 'stuck-initiative' | 'math-imbalance' |
        'cascade-failure' | 'writeback-drift' | 'production-imbalance' |
        'incoherence' | 'improvement' | 'anomaly',
  severity: 'high' | 'medium' | 'low',
  cyclesInState: number,        // for stuck items
  affectedEntities: {           // POP-IDs, neighborhoods, initiatives, council seats
    citizens: string[],
    neighborhoods: string[],
    initiatives: string[],
    councilSeats: string[]
  },
  evidence: {                   // raw cells/rows that triggered the match
    sheet: string,
    rows: number[],
    fields: object
  },
  description: string,          // one-line plain-English (no narrative framing)
  detectorVersion: string       // semver of the detector module that emitted this
}
```

Modules to build (mirrors the six pattern types in the skill plus #7 improvements and #8 incoherence):

1. **`detectRepeatingEvents.js`** — same crisis appearing in Riley_Digest 3+ cycles where a corresponding initiative exists but `ImplementationPhase` hasn't advanced.
2. **`detectStuckInitiatives.js`** — Initiative_Tracker rows whose `ImplementationPhase` is unchanged for 3+ cycles. Cross-check `cyclesInState` against the previous audit JSON.
3. **`detectMathImbalances.js`** — three sub-checks: decay-without-offset (e.g. neighborhoodHealth declining cycle-over-cycle with no health-related initiative advancing), production-without-consumption (events generating with `Edition_Coverage_Ratings` showing zero coverage), growth-without-pressure (all metrics positive across a domain — flag for review).
4. **`detectCascadeFailures.js`** — initiative is `Active` but `AffectedNeighborhoods` show no metric change. Coverage rating applied last cycle but neighborhood sentiment didn't shift.
5. **`detectWritebackDrift.js`** — Edition_Coverage_Ratings exist in last cycle but engine effects flat. Initiative effects expected to propagate but neighborhood metrics unchanged.
6. **`detectProductionImbalance.js`** — domain-level event generation: one domain at 13 events, another at 0. Crime stat changing with no event driving it. Migration without economic cause.
7. **`detectImprovements.js`** — initiatives advancing, neighborhoods stabilizing, positive trend with attributable cause. Mirror of detector 1 with positive sign.
8. **`detectIncoherence.js`** — logical contradictions: health center built but neighborhoodHealth declining, high approval but no civic activity, crime dropping with no intervention.

**Skip for 38.1, defer to 38.7:** anomaly detector (sudden 3σ shifts). Documented in spine as separate item; build with 38.7 + 38.8 in step 3 of the spine.

---

## 5. Output format

`output/engine_audit_c{XX}.json`:

```json
{
  "cycle": 92,
  "generatedAt": "2026-04-14T23:30:00Z",
  "detectorVersions": {
    "engineAuditor": "1.0.0",
    "detectRepeatingEvents": "1.0.0",
    ...
  },
  "previousCycle": 91,
  "patterns": [ /* Pattern[] from §4 */ ],
  "summary": {
    "highSeverity": 2,
    "mediumSeverity": 5,
    "lowSeverity": 8,
    "byType": { "stuck-initiative": 3, "math-imbalance": 4, ... },
    "improvements": 6,
    "incoherence": 1
  }
}
```

Plain JSON. Mags's `/engine-review` skill reads this, then writes `output/engine_review_c{XX}.md` with seven-field framing per pattern. Code doesn't do the framing — Mags does, with the JSON as ground truth.

---

## 6. Skill update (handed back to research/build after 38.1 lands)

After the script ships, edit `.claude/skills/engine-review/SKILL.md`:

- New first step: `node scripts/engineAuditor.js` runs the detector. Read the resulting JSON.
- Per-pattern, write the seven-field markdown brief into `output/engine_review_c{XX}.md`, anchoring tech diagnosis on `evidence.fields` and remedy paths on `affectedEntities.initiatives`.
- The "What to Scan For" section becomes "What the Auditor Detected" — Mags interprets, doesn't re-scan.

This split is itself a Phase 38 deliverable but the skill edit is a research/build chore — flag in ROLLOUT_PLAN as `(research-build terminal)` follow-up after engine terminal lands the script.

---

## 7. Acceptance criteria

The script is done when:

1. `node scripts/engineAuditor.js` runs end-to-end against current cycle without errors.
2. Output JSON validates against the schema in §5 — every pattern has all required fields populated.
3. Re-running against C91 produces a non-empty `patterns` array (E91 had real ailments — Temescal health, OARI rollout, stabilization fund).
4. Re-running twice produces identical output (deterministic — no LLM calls, no randomness).
5. The Temescal paradigm case from ROLLOUT_PLAN §Phase 38 surfaces as a `stuck-initiative` pattern with `cyclesInState >= 3` and `affectedEntities.initiatives` containing the Temescal Health Center initiative ID.
6. Total runtime under 30 seconds (no heavy joins, all sheet reads cached in memory).

---

## 8. Out of scope for 38.1

- **Mitigator check (38.2)** — script doesn't decide whether a remedy exists or is working. Just flags the pattern. 38.2 will add a `mitigatorState` field on each pattern.
- **Remedy recommendation (38.3)** — same. World-side vs tech-side recommendation is downstream.
- **Tribune framing (38.4)** — Mags's skill, not the script.
- **Measurement loop (38.5)** — comparing this cycle's audit against last cycle's measurement plan. Builds on 38.3.
- **Anomaly gate (38.7)** — separate detector module added in spine step 3.
- **Baseline brief auto-generation (38.8)** — separate, builds on 38.1's improvement detector.

---

## 9. Build sequence for the engine terminal

1. Read this plan.
2. Read `.claude/skills/engine-review/SKILL.md` for the input list and existing pattern definitions.
3. Read `lib/sheets.js` for the service account read pattern.
4. Stub `scripts/engineAuditor.js` with the orchestrator: load env, get current cycle, read all sheets in parallel, dispatch to detector modules, assemble JSON, write to `output/`.
5. Build the eight detector modules in `scripts/engine-auditor/` one at a time, simplest first (`detectStuckInitiatives.js` is the easiest — single sheet, single rule).
6. Test against C91. Confirm Temescal surfaces (acceptance criterion 5).
7. Tag in ROLLOUT_PLAN as DONE, hand back to research/build for skill edit (§6).

No `clasp push` needed — these are local Node scripts, not Apps Script.

---

## 10. Open questions for engine terminal to surface

If any of these become blockers, ping research/build:

- **Initiative ID format.** The Temescal Health Center initiative — what's its exact ID in `Initiative_Tracker`? Need to confirm `affectedEntities.initiatives` uses IDs not names.
- **`cyclesInState` source.** If `Initiative_Tracker` doesn't track this column natively, the detector must derive it by reading the previous N audit JSONs. Confirm a column exists or design the derivation.
- **Sheet read concurrency.** `lib/sheets.js` — does it support parallel batch reads, or is it sequential? Affects the runtime budget.

---

---

## 11. Phase 38.7 — Anomaly gate (spine step 3, build alongside 38.1)

**Source:** Nieman Reports September 2015, `docs/research/papers/paper5.pdf` p.21 (Drive ID `1slzF0rTo5ND6VWN1EXj-sX8MnyA4ZszH`). Netflix Q2 earnings: Wordsmith's input data didn't reflect a 7-to-1 stock split, so the bot reported "the price of an individual share fell 71 percent" — false. Lesson Patterson gave: *"Your data have to be bulletproof, and you need some form of editorial monitoring to catch outliers."*

### 11.1 Why this is separate from 38.1

Ailments are **persistent system states** — Temescal health declining for 4 cycles, OARI rollout stuck. Anomalies are **sudden unexplained changes in a single cycle** that may indicate bad data, not bad world state. Same script touches both, but the action paths diverge: ailments → editorial framing; anomalies → triage (cover, route to engine debug, or suppress).

If we don't flag anomalies separately, sift sees a 71% income drop and writes a confident story about poverty in West Oakland that turns out to be a stock-split-style data error. Three layer coverage on garbage data is still garbage.

### 11.2 Detector module: `scripts/engine-auditor/detectAnomalies.js`

Runs in the same `engineAuditor.js` pass as the 38.1 detectors. Emits `Pattern` records with `type: 'anomaly'`. Specific checks:

| Anomaly | Threshold | Source field |
|---|---|---|
| Citizen income spike/drop | Δ > 50% in one cycle | Simulation_Ledger.Income across audit JSONs |
| Crime metric outlier | > 3σ from rolling 6-cycle mean | Crime_Metrics |
| Approval rating flip | Δ > 20pts in one cycle | Civic_Office_Ledger.Approval |
| Population shift | > 10% in one cycle for a single neighborhood | Neighborhood_Map.Population |
| Generic metric outlier | > 3σ from historical std for any tracked metric | configurable list |

Each anomaly Pattern includes:
- `historicalContext`: prior 6-cycle values
- `triagePath`: `cover-as-story | route-to-engine-debug | suppress-until-verified` — initial guess only; sift makes the final call
- `confidence`: how sure the detector is the change is real (high/medium/low based on whether other correlated metrics moved in the expected direction)

### 11.3 Sift integration

Sift sees the anomaly with its triage suggestion. Three branches:
1. **Cover as story** (the change is real and newsworthy) — feed to relevant desk as story angle, with the historical context as the "why this is anomalous" hook.
2. **Route to engine-debug** (data error suspected) — write a separate brief to `output/engine_anomalies_c{XX}.md` flagged for engine terminal review. Suppress from edition.
3. **Suppress until verified** (genuinely unclear) — log it, don't cover, re-evaluate next cycle when more data exists.

### 11.4 Acceptance criteria for 38.7

- Detector runs in same `engineAuditor.js` pass without adding more than 5 seconds to total runtime.
- For each anomaly, `historicalContext` populated with at least 3 prior cycle values (or as many as exist).
- Test case: synthesize a 7-to-1 stock-split-style error in test fixtures (set a citizen income to 14% of prior cycle value with no corresponding job loss event) — detector flags as `anomaly` with `triagePath: 'route-to-engine-debug'`.
- Anomalies written to a separate JSON file `output/engine_anomalies_c{XX}.json` for sift to read, OR included in the main audit JSON under `patterns[]` with a clear `type: 'anomaly'` filter — engine terminal calls which is cleaner.

### 11.5 Out of scope for 38.7

- The triage decisions themselves (sift's call, not the detector's).
- Auto-correction of anomalous data (engine terminal handles the underlying bug if there is one).
- Cross-cycle anomaly correlation ("crime spiked in Temescal *and* approval flipped for the D3 council member" — that's an arc detection, Phase 37 territory).

---

## 12. Phase 38.8 — Baseline brief auto-generation (spine step 3, build alongside 38.1 + 38.7)

**Source:** Nieman Reports September 2015, `docs/research/papers/paper5.pdf` pp.30-31 (Drive ID `1slzF0rTo5ND6VWN1EXj-sX8MnyA4ZszH`). LA Times Homicide Report — every coroner's-office homicide gets an auto-generated victim profile; reporters decide which deserve in-depth coverage. LA Times Quakebot — every USGS earthquake above 3.0 magnitude gets a baseline report, reporters review and publish in under five minutes. Pattern: **scale coverage without faking it** by auto-generating a baseline from real engine data, letting reporters promote or publish as-is.

### 12.1 The Division III principle made operational

This is the engine-side delivery of the Division III principle saved S145 — *invisible-citizen depth is the product, coverage gaps are the frontier*. Real newsrooms can't staff Division III football; we can cover every birth, every business closing, every approval shift in Oakland because the engine generates the data and the auditor pre-fills the brief shape.

### 12.2 Scope: what gets a baseline brief

Every **engine-registered structured event** in the cycle:

| Event class | Source | Brief fields auto-filled |
|---|---|---|
| Citizen death | WorldEvents_V3_Ledger | name, age, neighborhood, cause, last edition mention |
| Council vote | Civic_Office_Ledger | initiative, vote tally, who switched, margin |
| Initiative milestone | Initiative_Tracker | initiative, phase advance, prior-phase duration, trigger event |
| Business open/close | Business_Ledger | name, neighborhood, owner POP-ID, prior coverage |
| Approval shift > 5pts | Civic_Office_Ledger | seat, official, magnitude, correlated initiatives |
| Home sale | (if tracked — confirm with engine terminal) | address, neighborhood, price delta, neighborhood market context |
| Birth / graduation | WorldEvents_V3_Ledger | citizen, family POP-IDs, neighborhood |

If a class isn't currently in the event ledger, skip it for 38.8 v1 — don't block on adding new event classes to the engine.

### 12.3 Detector module: `scripts/engine-auditor/generateBaselineBriefs.js`

Slightly different from the 38.1 detectors — this one *generates* briefs rather than detecting patterns, but lives in the same orchestrator and writes to the same audit-output directory.

Output: `output/baseline_briefs_c{XX}.json`:

```json
{
  "cycle": 92,
  "briefs": [
    {
      "id": "death-POP-00412-c92",
      "eventClass": "citizen-death",
      "subjectIds": ["POP-00412"],
      "neighborhood": "West Oakland",
      "cycle": 92,
      "facts": { "age": 58, "cause": "...", "lastCoverage": "E90" },
      "threeLayerHandle": {
        "engine": "neighborhood-mortality math contributing to West Oakland health-decline ailment if active",
        "simulation": "Beverly Hayes — appeared in E90 letters and front page; family POP-IDs available",
        "userActions": "Stabilization Fund recipient — Webb/Okoro disbursement decisions touched her case"
      },
      "tier": "C",
      "promotionHints": ["Beverly Hayes is high-profile (3 sections E90); strong feature candidate"]
    },
    ...
  ]
}
```

`tier: 'C'` is the default per Phase 39.9 (tiered review — light review for routine items). Promotion hints are surfaced when:
- Subject appeared in any prior edition (canon coverage)
- Subject is a Tier-1 or Tier-2 citizen
- Event correlates with an active 38.1 ailment
- Multiple events in the same cycle touch the same family / neighborhood / initiative

### 12.4 Sift integration (the promotion call)

Sift reads `baseline_briefs_c{XX}.json` and per brief decides:
1. **Promote to feature** (rewrites with reporter voice, additional reporting, may move to Tier A or B).
2. **Publish as baseline** (Tier C — copy through to edition with light review per 39.9, no rewrite).
3. **Suppress** (routine to the point of being noise — e.g. baseline brief for the 14th business that paid quarterly taxes this cycle).

Default action if sift doesn't decide explicitly: publish as baseline. Bias toward coverage; the Division III principle says under-coverage is the bigger risk than over-coverage.

### 12.5 Acceptance criteria for 38.8

- For C91, generator produces baseline briefs for every death, vote, milestone, business event, and approval shift > 5pts in the cycle. Spot-check 5 against the `output/world_summary_c91.md` to confirm no events are missed.
- Each brief has `threeLayerHandle` with at least the `engine` and `simulation` fields populated. `userActions` may be empty if no user action correlates.
- `promotionHints` array is non-empty for at least 20% of briefs (otherwise the hint generator isn't doing its job — sift is flying blind).
- Output JSON validates: every brief has `id`, `eventClass`, `subjectIds`, `cycle`, `tier`, `facts`.
- Total runtime including 38.1 + 38.7 + 38.8 detectors stays under 60 seconds.

### 12.6 Why same session as 38.1 + 38.7

Same orchestrator, same sheet reads, same JSON output convention. Building all three together saves three rounds of read-the-sheets + parse + emit boilerplate, and the engine terminal already has the context loaded.

If 38.1 alone takes the whole session, fine — push 38.7 + 38.8 to the next engine session. But the spec is here, so the cost of attempting all three is one read of this document.

---

## 13. Combined acceptance criteria (38.1 + 38.7 + 38.8)

After all three land:

1. `node scripts/engineAuditor.js` produces **three** output files per cycle: `engine_audit_c{XX}.json` (ailments), `engine_anomalies_c{XX}.json` (anomalies — or merged into audit JSON, engine terminal calls), `baseline_briefs_c{XX}.json` (events).
2. Combined runtime under 60 seconds.
3. Re-running is deterministic — no LLM calls, no randomness, identical output on identical inputs.
4. Mags's `/engine-review` skill, after the research/build follow-up edit (§6), reads all three files and produces `output/engine_review_c{XX}.md` plus the per-event baseline briefs that flow into sift.
5. Temescal paradigm case surfaces in 38.1 (stuck-initiative ailment).
6. Synthesized stock-split fixture surfaces in 38.7 (route-to-engine-debug anomaly).
7. Beverly Hayes E90 connection surfaces in 38.8 (death or status-change brief with promotion hints citing prior coverage).

---

---

## 14. Phase 38.2 — Existing mitigator check (spine step 5, build first of three)

**Goal:** for each ailment pattern in `engine_audit_c{XX}.json`, determine whether a world-side remedy already exists and whether it's actually offsetting the math.

### 14.1 Why this is separate from 38.1

38.1 detects "this initiative is stuck for 88 cycles." 38.2 answers "is anything trying to fix it, and is it working?" Two different questions. The detector is mechanical pattern-matching on sheet state; the mitigator check is a join across initiatives, civic-project agent state, council decisions, and neighborhood metric movement. Separation also lets us version them independently — mitigator definitions evolve when new civic-project types come online.

### 14.2 Files to create

| Path | Role |
|---|---|
| `scripts/engine-auditor/checkMitigators.js` | New module. Exports `enrich(patterns, ctx) → patterns[]` (mutates in place, adds `mitigatorState` field per pattern). Called by `engineAuditor.js` after the eight detectors run, before output is written. |
| `scripts/engine-auditor/mitigatorRegistry.json` | Declarative map of ailment categories → known mitigator types. E.g. `health-decline → health-center-construction`, `transit-strain → transit-hub-phase`, `housing-pressure → stabilization-fund + zoning-overlay`. Versioned independently from code. |

No new sheet reads needed — mitigator check uses the same Initiative_Tracker, Civic_Office_Ledger, and Neighborhood_Map snapshots `engineAuditor.js` already loads.

### 14.3 New `mitigatorState` field on each pattern

```js
mitigatorState: {
  exists: boolean,                // is there at least one initiative addressing this ailment?
  mitigators: [                   // one entry per matching initiative
    {
      initiativeId: 'INIT-005',
      name: 'Temescal Community Health Center',
      status: 'passed',
      implementationPhase: 'design-phase',
      cyclesInPhase: 88,           // from existing cyclesInState calc
      effectsFiring: boolean,      // is the engine actually reading writebacks from this initiative?
      effectEvidence: {            // what we checked to determine effectsFiring
        expectedField: 'neighborhoodHealth.Temescal',
        observedDelta: 0.0,        // change in target field across last 3 cycles
        expectedSign: 'positive',  // mitigator should improve this
        verdict: 'effects-not-firing'
      }
    }
  ],
  gap: 'no-mitigator' | 'mitigator-stuck' | 'mitigator-firing-but-insufficient' | 'remedy-working',
  recommendedAction: 'string'      // one-line summary; 38.3 produces the full remedy path
}
```

### 14.4 Detection logic

For each pattern with `affectedEntities.initiatives` non-empty:
1. Look up each initiative in `Initiative_Tracker`. Capture status + ImplementationPhase.
2. Cross-reference with the registry to confirm the initiative type is a real mitigator for this ailment category.
3. For each mitigator initiative, find the engine field it should affect (registry maps `initiative-type → expected-field`). Read the field across the prior 3 audit JSONs (`output/engine_audit_c{XX-N}.json`) and compute delta.
4. If delta is in the expected direction with sufficient magnitude → `effectsFiring: true`. Otherwise `false`.

For patterns with empty `affectedEntities.initiatives`:
1. Use the registry to look up the ailment category → mitigator-type list.
2. Search `Initiative_Tracker` for any active initiative matching one of those types AND any of `affectedEntities.neighborhoods`.
3. If found, treat as above. If not, `exists: false`, `gap: 'no-mitigator'`.

Gap classification (single field, 4 values):
- `no-mitigator` — no initiative addresses this ailment
- `mitigator-stuck` — initiative exists, but `cyclesInPhase >= 5` and `effectsFiring: false`
- `mitigator-firing-but-insufficient` — `effectsFiring: true` but ailment severity hasn't dropped
- `remedy-working` — `effectsFiring: true` and ailment severity is dropping (this is when the pattern should arguably move from `severity: high` to `severity: medium` next cycle)

### 14.5 Acceptance criteria for 38.2

1. `enrich()` runs over C91's 26 patterns in under 5 seconds added to total runtime (combined budget still 60s).
2. **Temescal paradigm:** INIT-005 surfaces `mitigatorState.exists: true`, `mitigators[0].implementationPhase: 'design-phase'`, `effectsFiring: false` (no neighborhoodHealth.Temescal improvement across prior cycles), `gap: 'mitigator-stuck'`.
3. At least one pattern shows each of the four `gap` values across C91 (proves the classifier is broad enough).
4. Deterministic across two runs.
5. Registry exists at `scripts/engine-auditor/mitigatorRegistry.json` and is versioned (`registryVersion` field). Engine terminal can extend without code changes.

### 14.6 Out of scope for 38.2

- The remedy *recommendation* (what to do about the gap). That's 38.3.
- The *narrative* framing of the gap. That's 38.4.
- Engine bug reports for tech-side fallback paths. 38.3 generates these.

---

## 15. Phase 38.3 — Remedy path recommendation (spine step 5, build second)

**Goal:** for each ailment with a `gap` value, generate the recommended next action — world-side preferred, tech-side fallback only when world-side is structurally impossible.

### 15.1 Files to create

| Path | Role |
|---|---|
| `scripts/engine-auditor/recommendRemedy.js` | Module. Exports `enrich(patterns, ctx) → patterns[]`. Called after `checkMitigators.js`. Adds `remedyPath` field per pattern. |
| `scripts/engine-auditor/remedyTemplates.json` | World-side action templates per `gap × ailment-category` combination. E.g. for `mitigator-stuck` + `health-decline`: `["advance the named initiative out of design-phase via the responsible civic-project agent", "council ordinance to expedite review", "stakeholder pressure via mayor's office"]`. |

### 15.2 New `remedyPath` field

```js
remedyPath: {
  worldSide: [                    // preferred — ordered most-likely-to-work first
    {
      type: 'advance-initiative' | 'propose-new-initiative' | 'character-intervention' | 'council-vote' | 'neighborhood-action' | 'mayoral-pressure',
      target: 'INIT-005' | 'civic-project:temescal-health' | 'council:D3' | 'office:mayor',
      action: 'advance from design-phase to construction',
      rationale: 'one-line why this is the leverage point',
      expectedEngineEffect: 'neighborhoodHealth.Temescal +0.05/cycle from construction-active milestone'
    }
  ],
  techSide: {                     // fallback only — populated when worldSide is structurally impossible
    triggered: boolean,
    bugReport: {                  // engine-build-terminal language
      file: 'phase05/applyInitiativeImplementationEffects.js',
      function: 'fireConstructionMilestone',
      ctxField: 'initiativeStateMap.INIT-005.constructionStart',
      sheetColumn: 'Initiative_Tracker.column-X',
      observedBehavior: 'string',
      expectedBehavior: 'string',
      reproSteps: 'string'
    }
  },
  confidence: 'high' | 'medium' | 'low'  // how confident the recommender is the remedy will work
}
```

### 15.3 World-side preferred logic

For each `gap`:
- `no-mitigator` → recommend `propose-new-initiative` of the appropriate type. Target = relevant civic-project agent or council.
- `mitigator-stuck` → recommend `advance-initiative`. Target = the initiative ID + responsible agent (civic-project agent if one exists, else mayor's office). May also recommend `mayoral-pressure` or `council-vote` as parallel actions.
- `mitigator-firing-but-insufficient` → recommend `propose-new-initiative` (additional layer) OR `character-intervention` (e.g. neighborhood organizer character drives further action). NOT `advance-initiative` because the existing one is already firing.
- `remedy-working` → no remedy needed; recommend `none`. Sift sees this as an improvement story candidate.

Tech-side fallback only triggered when:
- The mitigator initiative status is `passed`, `implementationPhase` shows expected progression, but `effectsFiring: false` AND the audit detects the writeback hook is broken (e.g., expected field never written by any phase).

### 15.4 Acceptance criteria for 38.3

1. Combined runtime (38.1 + 38.7 + 38.8 + 38.2 + 38.3) under 60s on C91.
2. Every pattern with non-`remedy-working` gap has `remedyPath.worldSide` non-empty.
3. **Temescal paradigm:** INIT-005 produces `worldSide[0].type: 'advance-initiative'`, `target: 'INIT-005'`, with rationale citing the design-phase stall. `techSide.triggered: false` because the initiative + writeback chain is intact — the gap is institutional, not code.
4. Tech-side fallback fires for at least one pattern across C91 if any structurally-broken writeback exists; otherwise empty (which is fine — no synthetic injection).
5. Templates extensible without code changes.

---

## 16. Phase 38.4 — Tribune framing brief (spine step 5, build third)

**Goal:** translate each ailment + remedy into per-desk story handles that thread the three coverage layers (engine + simulation + user actions).

### 16.1 Files to create

| Path | Role |
|---|---|
| `scripts/engine-auditor/generateTribuneFraming.js` | Module. Exports `enrich(patterns, ctx) → patterns[]`. Called after `recommendRemedy.js`. Adds `tribuneFraming` field per pattern. |

### 16.2 New `tribuneFraming` field

```js
tribuneFraming: {
  storyHandles: {                 // one suggestion per applicable desk
    civic: { angle: 'string', citizens: ['POP-XXX'], hookLine: 'string' } | null,
    business: { angle: 'string', citizens: ['POP-XXX'], hookLine: 'string' } | null,
    culture: { angle: 'string', citizens: ['POP-XXX'], hookLine: 'string' } | null,
    sports: null,                 // most ailments don't have a sports angle; only fill when relevant
    letters: { angle: 'string', citizens: ['POP-XXX'], hookLine: 'string' } | null
  },
  threeLayerCoverage: {           // explicit pre-fill for the capability reviewer
    engine: 'one-line statement of the underlying ailment + the tech diagnosis',
    simulation: 'one-line statement of who feels it, where, how',
    userActions: 'one-line statement of what has been decided in response and the current status'
  },
  suggestedFrontPage: boolean,    // true if this ailment is severity high + cyclesInState >= 3 + remedy is unresolved
  capabilityHooks: [              // direct hooks Phase 39.1 can use to verify coverage
    'covers Temescal',
    'mentions INIT-005',
    'cites a Temescal resident'
  ]
}
```

### 16.3 Generation logic

Per pattern:
1. **storyHandles** — for each desk, check if the pattern has a natural angle. Civic gets the user-actions angle (council, initiative, mayor). Business gets economic-impact angles. Culture gets neighborhood-texture angles. Letters gets candidate citizen voices. Sports stays null unless ailment touches A's/Bulls (rare). Each handle includes 2–3 candidate citizens pulled from `affectedEntities.citizens` or from a neighborhood lookup.
2. **threeLayerCoverage** — synthesize each layer line from the pattern + remedy data. Engine line = `description` + `evidence.fields`. Simulation line = neighborhoods + 1–2 citizen names. User-actions line = `mitigatorState` summary + `remedyPath.worldSide[0].action`.
3. **suggestedFrontPage** — boolean per the criteria stated.
4. **capabilityHooks** — a list of literal phrases sift can pass to `assertCoversFlaggedAilmentIfRunningThreePlusCycles` (Phase 39.1's deferred grader assertion) when the Haiku key lands. Until then, Phase 39.1's deterministic `assertHighestSeverityAilmentCoveredOnFrontPage` already uses this field implicitly via the audit-pattern `affectedEntities`.

### 16.4 Acceptance criteria for 38.4

1. Every pattern with `severity: 'high'` produces non-empty `storyHandles` for at least 2 desks.
2. **Temescal paradigm:** INIT-005 produces `storyHandles.civic` (Chen-Ramirez angle on design-phase stall), `storyHandles.culture` (Temescal residents), `storyHandles.letters` (citizen voice on health access). `suggestedFrontPage: true`. `capabilityHooks` includes `"covers Temescal"`, `"mentions INIT-005"`, `"cites a Temescal resident"`.
3. `threeLayerCoverage` populated on every high-severity pattern.
4. Combined runtime (all 38.x detectors) stays under 60s on C91.

### 16.5 Pipeline impact downstream

After 38.4 lands, the audit JSON shape changes — `patterns[]` carries `mitigatorState` + `remedyPath` + `tribuneFraming`. Two follow-ups for research/build:

- Update `/engine-review` skill to consume the new fields (rewrite §3 framing logic — most of the seven-field brief now reads from these structured fields instead of being synthesized by Mags).
- Update `/sift` to read `tribuneFraming.storyHandles` directly when proposing stories. The sift-time editorial planning becomes "validate + rank the auditor's suggestions" instead of "discover everything from the world summary."

Both follow-ups are downstream skill edits, not engine work — flag them in ROLLOUT_PLAN as `(research-build terminal)` after 38.4 ships.

The measurement-check portion of the skill-shrink work is scoped separately in [[plans/2026-04-16-phase-38-6-skill-shrink]] (Phase 38.6, research/build terminal).

---

## 17. Combined acceptance criteria for spine step 5 (38.2 + 38.3 + 38.4)

After all three land:

1. `engineAuditor.js` produces an enriched `engine_audit_c{XX}.json` where every pattern carries `mitigatorState`, `remedyPath`, and `tribuneFraming` fields.
2. Combined runtime under 60s on C91 (all 38.x detectors + enrichers).
3. Re-running is deterministic (no LLM calls, no randomness).
4. **Temescal end-to-end:** INIT-005 surfaces as `stuck-initiative` (38.1) → `mitigator-stuck` gap (38.2) → `advance-initiative` worldSide remedy targeting INIT-005 (38.3) → `tribuneFraming` with civic/culture/letters story handles + `suggestedFrontPage: true` + capability hooks (38.4). The full ailment-to-story pipeline runs end-to-end on a real example.
5. The capability reviewer's `assertHighestSeverityAilmentCoveredOnFrontPage` would now have richer pattern data to grade against (initiative IDs + neighborhood + capability hooks).

---

## 18. Phase 38.5 — Measurement loop (spine step 8, build first of two)

### 18.1 Goal

Add a deterministic enricher that measures whether prior-cycle remedy predictions actually fired, writing a structured `measurement` field per pattern and a top-level `measurementHistory[]` rollup. Closes the feedback loop the auditor has been missing — every recommendation gets graded next cycle.

### 18.2 Files

- `scripts/engine-auditor/measureRemedies.js` — new enricher module, mirrors `checkMitigators` / `recommendRemedy` / `generateTribuneFraming` shape.
- `scripts/engine-auditor/recommendRemedy.js` — modified `fill()` adds `measurementSpec` to each `worldSide[]` entry, derived from the mitigator's `effectEvidence` (no JSON template change needed).
- `scripts/engineAuditor.js` — appends `measureRemedies` to enrichers array; writes `ctx.measurementHistory` to top-level `measurementHistory[]` field in audit JSON.
- `scripts/engine-auditor/fixtures/engine_audit_c90_temescal.json` — synthetic prior-cycle fixture for testing.
- `scripts/engine-auditor/measureRemedies.test.js` — standalone test, 6 cases, 19 assertions.

### 18.3 Schema added

Per pattern:
```
measurement: {
  available: boolean,
  reason?: 'no-prior-audit' | 'no-prior-match' | 'prior-had-no-expectation',
  priorCycle?: number,
  expectedField?: string,        // e.g. "Neighborhood_Map.Sentiment"
  expected?: number,             // signed magnitudeThreshold (per cycle)
  observed?: number,             // currentValue - priorValue
  delta?: number,                // observed - expected
  verdict?: 'remedy-firing-as-expected' | 'remedy-firing-insufficient'
           | 'remedy-not-firing' | 'remedy-overshot',
  priorRemedyType?: string,
}
```

Top-level rollup: `measurementHistory: [{ cycle, patternType, priorRemedyType, verdict, affectedEntities }]`.

### 18.4 Logic

1. Match each current pattern to a prior pattern by `type` + overlapping `affectedEntities.initiatives` (or, if both empty, neighborhoods). Tie-break on severity then `cyclesInState`.
2. Read `prior.remedyPath.worldSide[0].measurementSpec` for the structured prediction (`field`, `sign`, `magnitudeThreshold`).
3. Look up the field's value in current `ctx.snapshot` and prior `priorAudit.snapshots`. Delta = current − prior.
4. Classify verdict by comparing observed delta to expected: within ±20% of expected → `firing-as-expected`; opposite sign or zero → `not-firing`; same sign but magnitude < expected → `firing-insufficient`; > 1.5× expected → `overshot`.

### 18.5 Path resolution (open question from plan file: RESOLVED)

Plan offered Path A (add `measurementSpec` to `remedyTemplates.json` + resolver) vs. Path B (read directly from `mitigatorState.effectEvidence`). Implementation is functionally Path A but cleaner — `measurementSpec` is derived in `recommendRemedy.fill()` from the existing `evidence.expectedField` / `expectedSign` / `magnitudeThreshold`. No JSON template change. Backwards-compatible with everything that consumes the prose `expectedEngineEffect` today.

### 18.6 Acceptance criteria

1. ✅ `node scripts/engineAuditor.js` on C91 (no prior audit on disk) completes; every pattern carries `measurement: { available: false, reason: 'no-prior-audit' }`.
2. ✅ With injected fixture (`ENGINE_AUDITOR_PRIOR_FIXTURE=scripts/engine-auditor/fixtures/engine_audit_c90_temescal.json`), C91's Temescal pattern receives `measurement.available === true` with the expected/observed/delta/verdict fields.
3. ✅ Top-level `measurementHistory[]` populated when measurements fire.
4. ✅ Combined runtime under 60s on C91 (measured: 1.3s with fixture, 3.0s without).
5. ✅ Deterministic across two runs on same inputs (verified: byte-identical JSON output).
6. ✅ Schema documented as JSDoc header in `measureRemedies.js`.
7. ✅ Test suite passes — 19/19 assertions across 6 scenarios (`no-prior-audit`, `remedy-not-firing`, `remedy-firing-as-expected`, `remedy-overshot`, `remedy-firing-insufficient`, `no-prior-match`).

### 18.7 Out of scope (per plan)

- Multi-cycle remedy-type success rates (e.g., "advance-initiative worked 3/7 over the last 20 cycles") — that's the `/engine-review` skill's job (38.6), not the auditor.
- Engine-side fix for broken writeback chains — still 38.3 tech-side fallback territory.
- Narrative framing of measurement results — `/engine-review` skill (38.6).

### 18.8 Downstream

- `/engine-review` skill Step 7 already wired to consume these fields (S154 commit `539f084`). Builds the per-pattern table, remedy-type track record, and win callout.
- Phase 38.6 skill-shrink plan ([[plans/2026-04-16-phase-38-6-skill-shrink]]) is separately scoped and unblocked by this work.

---

## Changelog

- 2026-04-14 — Initial plan (S146, research/build terminal). Designed the detector/framer split that wasn't in the original ROLLOUT_PLAN spec — code does deterministic detection, skill does narrative framing. Eight detector modules enumerated. Acceptance criteria locked. Handed off to engine/sheet terminal.
- 2026-04-15 — Appended §§11–13 (Phase 38.7 anomaly gate + 38.8 baseline briefs) so engine terminal has the full spine-step-3 spec in one document. Source paragraphs from Nieman Reports paper5.pdf pp.21, 30–31 verified verbatim. Three combined acceptance criteria added.
- 2026-04-15 — Appended §§14–17 (Phase 38.2 mitigator check + 38.3 remedy path recommendation + 38.4 Tribune framing brief). Same enricher-pipeline pattern as the original detectors. Each module mutates patterns in place with structured new fields (`mitigatorState`, `remedyPath`, `tribuneFraming`). Temescal paradigm threads end-to-end as the validating acceptance test for §17. Two downstream follow-ups noted: `/engine-review` and `/sift` skill rewrites once 38.4 ships.
- 2026-04-16 — Appended §18 (Phase 38.5 measurement loop). Implemented S154/S156 per [[plans/2026-04-16-phase-38-5-measurement-loop]]. Closes spine step 8 (engine side); 38.6 skill shrink remains.
- 2026-04-16 — §16.5 back-link added pointing to [[plans/2026-04-16-phase-38-6-skill-shrink]] (S156, research/build). Phase 38.6 closed: skill reads `patterns[*].measurement` + `measurementHistory[]` directly (S154 commit `539f084`), verified against C91 audit JSON (27 patterns, all `measurement.available: false` / `reason: no-prior-match` on first run, as expected). Criteria 1–5 and 7 met; criterion 6 (net shrink) traded for richer structured-framing instructions (+23 lines net) — documented in plan file.
