---
title: Routing Rationale Payload
created: 2026-05-08
updated: 2026-05-08
type: concept
tags: [engine, media, architecture, active]
sources:
  - docs/plans/2026-05-07-engine-routing-foundation.md §T5.1
  - utilities/priorityEngine.js (Engine A — composer + components)
  - utilities/bylineEngine.js (Engine B — multi-axis scorer + components)
pointers:
  - "[[plans/2026-05-07-engine-routing-foundation]] — parent plan; this is T5.1's deliverable"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — catalog entry"
---

# Routing Rationale Payload

**The canonical shape every engine-side routing decision exposes to consumer skills.** When `/sift`, `/write-supplemental`, `/dispatch`, or `/interview` reads a seed from `Story_Seed_Deck`, the rationale payload is what makes the engine's choice *auditable* — Mags can read the "why" without opening engine code.

This file is the contract between engine-side scoring and editorial-side consumption. It says nothing about *what to do* with the rationale — that's per-skill (T4.1-T4.5 wire each consumer surface). It says only what shape the rationale has and where it appears.

---

## Why this exists

The Phase 1 diagnosis surfaced the *kind* of bug routing was hiding: matcher conflation produced 99.9% Simon-Leary on GENERAL seeds, by structural keyword design, silently. Without rationale, that pathology lived for cycles before anyone noticed; the seed deck just said "Simon Leary" with no breadcrumb.

Engine A + Engine B are deterministic, but their composition is multi-axis. Without the rationale, a reader sees a winner but not the margin or the components — and silent winners are the failure mode this plan replaces.

Rationale = the audit trail the previous matcher didn't have.

---

## The canonical shape

Every routing decision (one per seed) carries this payload, JSON-serialized into `Story_Seed_Deck` and the per-cycle `output/sift_proposals_c{XX}.json` augmentation:

```json
{
  "priorityScore": 8.4,
  "priorityComponents": {
    "domain":   9,
    "severity": 1.5,
    "arc":      1.2,
    "coverage": 1.0
  },
  "consequenceFloor": true,

  "bylineCandidate": "Carmen Delaine",
  "bylineConfidence": "high",
  "bylineRationale": {
    "components": {
      "theme":   4,
      "format":  2,
      "cadence": 1.0,
      "arc":     0
    },
    "alternates": [
      { "name": "Luis Navarro",   "score": 5.2 },
      { "name": "Trevor Shimizu", "score": 4.0 }
    ]
  }
}
```

### Top-level fields

| Field | Source | Meaning |
|-------|--------|---------|
| `priorityScore` | `priorityEngine.computePriorityScore_` | 0–10 composite. `domain × severity × arc × coverage`, clamped (raw>10 → divide by 1.5 → hard-cap 10). |
| `priorityComponents` | same | Per-axis raw values that produced the score. Surfaced for transparency. |
| `consequenceFloor` | `priorityEngine.isConsequenceFloor_` | Boolean. `true` when seed cannot be editorially suppressed. Two trigger conditions, both gated on HIGH severity (see Engine A). |
| `bylineCandidate` | `bylineEngine.scoreAllBylines_` | Top-ranked reporter name. Engine's recommendation, not assignment. |
| `bylineConfidence` | same | `high` / `medium` / `low`. HIGH requires both `(top - second) / top > 0.4` AND `top.score ≥ 3` absolute floor (guards degenerate "barely a signal" cases). |
| `bylineRationale.components` | same | Per-axis raw values: `theme + format + arc, * cadence`. |
| `bylineRationale.alternates` | same | Top-2 next candidates with scores — gives editorial latitude visibility into "who else fit." |

### Component values

**Priority components** (multiplicative; total = product, clamped):

- `domain` ∈ `DOMAIN_WEIGHTS` table (1–10). Top tier HEALTH/SAFETY/CIVIC at 9–10; floor GENERAL at 2; unknown at 1.
- `severity` ∈ {1.5, 1.0, 0.6} for HIGH/MED/LOW. Sourced from upstream audit pattern.
- `arc` ∈ {1.0, 1.2, 1.4, 1.6} from `computeArcMultiplier_`. 1.6 is the "comeback amp" (3+ cycles AND HIGH prior peak).
- `coverage` ∈ {0.7, 1.0, 1.3} from `computeCoverageMultiplier_`. 0.7 = saturation suppress (3-of-3 cycles ≥+3 rating); 1.3 = uncovered crisis amp (last cycle ≤-1).

**Byline components** (additive within parens, then × cadence):

- `theme` — partial-match scorer ported from `suggestStoryAngle_`. **Returns 0 for GENERAL-domain seeds** (Fork 1 = B; structural keyword overlap with one byline is the Phase 1 root cause this bypasses).
- `format` ∈ 0–4 from `formatFitScore_(name, format)` table. Per-format archetype (edition/supplemental/dispatch/interview); default 1 for journalists not in the explicit table.
- `arc` ∈ {0, 3} from `arcBindingScore_`. +3 when `journalist === Storyline_Tracker.AssignedReporter`. Returns 0 during shadow phase warm-up (no auto-binds populated yet).
- `cadence` ∈ [0.3, 1.0] from `cadenceMultiplier_`. 1.0 below 20% prior-cycle ratio; linear ramp; 0.3 floor at ≥25%. Suppresses over-routed bylines.

---

## Surfaces

The same shape appears in three places, each populated by a different actor:

| Surface | Populated by | Lifecycle | Purpose |
|---------|--------------|-----------|---------|
| `Story_Seed_Deck` cols M-R | engine-sheet at `applyStorySeeds.js` (T2.6 + T3.6) | Per-seed, written every cycle Phase 7 emit | Authoritative — engine's recommendation as it left the engine |
| `output/sift_proposals_c{XX}.json` | research-build via `/sift` skill (T4.1 + T4.2) | Per-cycle, written when sift compiles proposals | Editorial — proposals augmented with rationale for Mags-eyeball |
| Future per-skill render targets | per-skill consumers (T4.3-T4.5) | Lazy — read on demand | UX — what reporters/Mike see when scanning |

`Story_Seed_Deck` is canonical; the other two derive from it. If they disagree, the deck wins.

### `Story_Seed_Deck` column map (post-T2.7 + T3.7)

| Col | Header | Field |
|-----|--------|-------|
| M | `PriorityScore` | `priorityScore` |
| N | `ConsequenceFloor` | `consequenceFloor` (TRUE/FALSE) |
| O | `PriorityComponents` | `priorityComponents` (JSON) |
| P | `BylineCandidate` | `bylineCandidate` |
| Q | `BylineConfidence` | `bylineConfidence` |
| R | `BylineRationale` | `bylineRationale` (JSON) |

Cols I-L (`SuggestedJournalist`/`SuggestedAngle`/`VoiceGuidance`/`MatchConfidence`) are deprecated v3.7 fields kept for one transition cycle; consumers should NOT read them after C95.

### Defensive defaults

Engine emit guards against null state — every field has a sensible default:

| Field | Default when missing | Cause |
|-------|---------------------|-------|
| `priorityScore` | 0 | Null seed |
| `priorityComponents.domain` | 1 (DOMAIN_WEIGHT_DEFAULT) | Unknown domain — also signals tuning need |
| `priorityComponents.severity` | 1.0 (MED) | Missing audit pattern |
| `priorityComponents.arc` | 1.0 | No storyline state for seed |
| `priorityComponents.coverage` | 1.0 | No coverage state for domain |
| `consequenceFloor` | false | No HIGH severity, no triggering condition |
| `bylineCandidate` | empty string | Engine B failed to load (degraded mode) |
| `bylineConfidence` | "low" | top.score = 0 (no journalist scored) |
| `bylineRationale.components.arc` | 0 | Warm-up null binding (pre-T3.5b Phase 2) |

Consumers must handle empty/null gracefully — the engine never blocks emission on rationale problems.

---

## Reading the "why"

The rationale renders as a one-line suffix on each proposal in `/sift` Step 2 output (T5.2 wires this):

```
[priority 8.4 / floor / Carmen high-conf — civic-severity + arc 3 cycles]
```

Reading guide:

- `priority 8.4` — composite score, 0–10
- `/ floor` — present only when `consequenceFloor === true`; absent when not floored. Floor markers can't be editorially suppressed, only re-ordered within the floored band.
- `/ Carmen high-conf` — engine byline + confidence band. Render absent when `bylineConfidence === 'low'` or `bylineCandidate` is empty.
- `— civic-severity + arc 3 cycles` — narrative gloss on the dominant components. Generated from the highest-magnitude axis values:
  - `civic-severity`: domain weight ≥ 7 paired with HIGH severity multiplier
  - `arc N cycles`: arc multiplier > 1.0 with cyclesActive surfaced
  - `crisis amp`: coverage multiplier 1.3
  - `saturation suppress`: coverage multiplier 0.7
  - Fall through to bare components when no dominant signal

The narrative gloss is best-effort — it surfaces *what's interesting*, not the full payload. Full payload lives in cols M-R for inspection when the gloss isn't enough.

---

## Anti-creativity boundary

**The rationale describes the ranking; it does not write the angle.** Per the plan's Hard Constraints:

- Engine A picks priority order
- Engine B picks byline candidate
- Neither writes angle text — angle remains Mags' editorial act until storyline-memory in routing matures

Rationale gives Mags transparency on the engine's choice; the angle creative act stays out of engine code. If a future capability adds storyline-memory-aware angle suggestion, it will live in a separate field alongside `bylineRationale`, not inside it.

---

## Changelog

- 2026-05-08 — Initial draft (S206, research-build). Plan T5.1. Codifies the contract Engine A + Engine B export. T5.2 wires it into `/sift` Step 2 rendering; T4.1-T4.5 wire per-skill consumption.
