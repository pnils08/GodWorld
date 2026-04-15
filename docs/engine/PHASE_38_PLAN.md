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

## Changelog

- 2026-04-14 — Initial plan (S146, research/build terminal). Designed the detector/framer split that wasn't in the original ROLLOUT_PLAN spec — code does deterministic detection, skill does narrative framing. Eight detector modules enumerated. Acceptance criteria locked. Handed off to engine/sheet terminal.
