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
**Status:** Ready to build. Designed S146.

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

## Changelog

- 2026-04-14 — Initial plan (S146, research/build terminal). Designed the detector/framer split that wasn't in the original ROLLOUT_PLAN spec — code does deterministic detection, skill does narrative framing. Eight detector modules enumerated. Acceptance criteria locked. Handed off to engine/sheet terminal.
- 2026-04-15 — Appended §§11–13 (Phase 38.7 anomaly gate + 38.8 baseline briefs) so engine terminal has the full spine-step-3 spec in one document. Source paragraphs from Nieman Reports paper5.pdf pp.21, 30–31 verified verbatim. Three combined acceptance criteria added.
