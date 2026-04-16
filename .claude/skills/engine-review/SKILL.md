---
name: engine-review
description: Post-cycle engine state diagnostic. Runs the deterministic engine auditor, then frames its findings as 7-field ailment briefs with remedy paths. Phase 38 (revised S146 to consume auditor JSON instead of re-scanning sheets).
effort: medium
---

# /engine-review — Engine State Diagnostic

## Purpose

After a cycle runs, identify what's broken, stuck, improving, declining, or incoherent — and produce a structured brief per ailment that `/sift` and `/write-edition` consume.

This skill no longer scans sheets by hand. The deterministic detector lives in `scripts/engineAuditor.js` (Phase 38.1 + 38.7 + 38.8, S146). The skill is the **framer** — it reads the auditor's JSON output and turns each pattern into a seven-field ailment brief, anomaly triage, and a baseline-brief pass-through. Determinism stays in code; narrative framing stays here.

This is NOT a code check. `/pre-mortem` checks the code. This checks what the code produced — is the world making sense?

## Step 1 — Run the auditor

```bash
node scripts/engineAuditor.js
```

Fail loudly if exit code is non-zero. The script must produce three files in `output/` for the current cycle:

- `output/engine_audit_c{XX}.json` — ailment patterns (Phase 38.1)
- `output/engine_anomalies_c{XX}.json` — anomalies with triage paths (Phase 38.7)
- `output/baseline_briefs_c{XX}.json` — auto-generated event briefs (Phase 38.8)

If any file is missing or invalid JSON, stop. Report the failure to the user before drafting anything — a missing detector output means the framing would be guessing.

## Step 2 — Read the three JSON files

Read all three. Don't re-scan sheets. The auditor has already done the deterministic work — including, after Phase 38.2/3/4 (S146 spine step 5), the mitigator check, remedy recommendation, and Tribune framing per pattern.

**Audit JSON `patterns[]`** — each pattern carries:
- **Detection fields** (Phase 38.1): `type` (stuck-initiative / repeating-event / math-imbalance / cascade-failure / writeback-drift / production-imbalance / improvement / incoherence / anomaly), `severity`, `cyclesInState`, `affectedEntities` (citizens / neighborhoods / initiatives / councilSeats), `evidence` (sheet, rows, fields), `description`, `detectorVersion`.
- **Mitigator state** (Phase 38.2): `mitigatorState.exists`, `mitigators[]` (per-initiative effectsFiring + effectEvidence), `gap` (`no-mitigator | mitigator-stuck | mitigator-firing-but-insufficient | remedy-working`), `recommendedAction`, `ailmentCategory`.
- **Remedy path** (Phase 38.3): `remedyPath.worldSide[]` (advance-initiative / propose-new-initiative / character-intervention / council-vote / mayoral-pressure, each with type/target/action/rationale/expectedEngineEffect), and `remedyPath.techSide.bugReport` (only populated when writeback chain is structurally broken).
- **Tribune framing** (Phase 38.4): `tribuneFraming.storyHandles` (per desk: civic / business / culture / sports / letters), `tribuneFraming.threeLayerCoverage` (engine / simulation / user-actions one-liners pre-written), `suggestedFrontPage` boolean, `capabilityHooks` (literal phrases Phase 39.1 grades against).
- **Measurement** (Phase 38.5): `measurement.available`. When true: `priorCycle`, `expectedField`, `expected`, `observed`, `delta`, `verdict` (`remedy-firing-as-expected | remedy-firing-insufficient | remedy-not-firing | remedy-overshot`), `priorRemedyType`. When false: `reason` (`no-prior-audit | no-prior-match | prior-had-no-expectation`). Top-level `measurementHistory[]` aggregates these across patterns for cross-cycle learning.

**Anomalies JSON** `anomalies[]` — `triagePath` (`cover-as-story | route-to-engine-debug | suppress-until-verified`), `confidence`, `historicalContext`. On first run with no prior audit, `anomalies[]` may be empty — expected, not a failure.

**Baseline-briefs JSON** `briefs[]` — `id`, `eventClass`, `subjectIds`, `neighborhood`, `cycle`, `facts`, `threeLayerHandle`, `tier` (default `C`), `promotionHints`.

## Step 3 — Frame each ailment as a 7-field brief

For every pattern (excluding `type: 'improvement'` and `type: 'anomaly'` — those go to their own sections), produce a seven-field markdown block. **Most fields now have structured source data** from the auditor's enrichers — your job is to translate the structured fields into Tribune voice, not to discover or invent.

| Brief field | Structured source — read this first |
|---|---|
| **In-world symptom** | Open from `tribuneFraming.threeLayerCoverage.simulation`; expand into a one-line headline that names the people / neighborhood feeling it. |
| **Tech diagnosis** | `evidence.fields` (the cells that triggered the match) + `mitigatorState.mitigators[*].effectEvidence` (which engine field is or isn't moving). Translate sheet-column names into prose. |
| **Existing mitigators** | `mitigatorState.exists` + `mitigators[]`. Each mitigator has `name`, `implementationPhase`, `cyclesInPhase`, `effectsFiring`. |
| **Why working/not** | Read `mitigatorState.gap`. The four gap values map directly: `no-mitigator` = "nothing in motion to address this"; `mitigator-stuck` = "the right initiative exists but hasn't moved"; `mitigator-firing-but-insufficient` = "the program is running but the math hasn't caught up"; `remedy-working` = "the gap is closing — this is becoming an improvement story." Use the `effectEvidence.verdict` for specifics. |
| **Recommended remedy path** | `remedyPath.worldSide[]` is ordered most-likely-to-work first. List the top action; mention secondary options if `worldSide.length > 1`. Only mention `techSide.bugReport` if `techSide.triggered: true` (structural break, not institutional drag). |
| **Tribune framing brief** | `tribuneFraming.storyHandles` per applicable desk. Use the `angle` + `hookLine` from each non-null desk; cite `citizens` POP-IDs as the reporter's starting cast. The three layers are pre-written in `tribuneFraming.threeLayerCoverage` — quote them or paraphrase. |
| **Measurement plan** | `mitigatorState.mitigators[*].effectEvidence.expectedField` + `magnitudeThreshold` + `expectedSign` give the watch list. Add one cycle-over-cycle delta target per mitigator. |

If `tribuneFraming.suggestedFrontPage: true`, mark the brief with **FRONT PAGE CANDIDATE** at the top — sift uses this to seed front-page scoring.

If `tribuneFraming.capabilityHooks` is non-empty, list the hooks at the bottom of the brief — they are the literal phrases Phase 39.1's `assertHighestSeverityAilmentCoveredOnFrontPage` grades against. Sift can pass them through to the relevant reporter as required coverage tokens.

### Watch for first-run startup artifacts

The first audit run after S146 derived `cyclesInState` from each initiative's `LastUpdated` date string. That can produce surprisingly large numbers (Temescal at `cyclesInState=88` from "3/25/2026"). The number self-corrects once a second audit JSON exists to diff against. **Don't frame these inflated counts as "stuck for 88 cycles" in narrative copy.** Read `cyclesInState` qualitatively on first run ("stuck, with the design phase predating the current build of the auditor"); use the precise number from the second cycle onward.

### When the structured fields are empty

Phase 38.2 `gap: 'remedy-working'` doesn't surface until a second audit cycle exists with measurable deltas (per engine terminal's §17 acceptance note — "inherent to the cross-cycle design"). On the first run after any pattern, `effectEvidence.verdict` will commonly read `no-history`. That's expected — write the brief as "early signal, will measure next cycle" rather than treating it as a failure of the mitigator check.

## Step 4 — Anomaly triage section

For each entry in `anomalies[]`, write one paragraph:

- The anomaly (what changed, by how much)
- The triage call: cover as story / route to engine debug / suppress until verified
- One-line reasoning, citing `confidence` and `historicalContext`

If `anomalies[]` is empty, write a one-line "No anomalies flagged this cycle." Don't fabricate.

Note: routing an anomaly to engine-debug means writing a separate brief at `output/engine_anomalies_c{XX}_followup.md` flagged for the engine terminal to investigate. The anomaly is suppressed from the edition until cleared.

## Step 5 — Baseline brief pass-through

Don't re-write the baseline briefs. The auditor already structured them for sift. In the engine-review markdown, include:

- Total brief count, broken down by `byEventClass` from the JSON's `summary`
- Count with `promotionHints` (these are sift's promotion candidates)
- One-line note on which neighborhoods or active ailments the briefs cluster around
- Reference: `output/baseline_briefs_c{XX}.json`

`/sift` reads the JSON directly when deciding promote / publish-as-baseline / suppress per Phase 39.9 tiered review.

### Known limitation — EventType taxonomy

As of S146, most events in `WorldEvents_V3_Ledger` resolve to `eventType: misc-event`, so `subjectIds` on most baseline briefs is `[]`. This blocks citizen-attributed promotion (e.g., a death brief that should hint at Beverly Hayes by POP-ID can't, because the event isn't typed as `citizen-death`). Sift can still promote on neighborhood + ailment overlap from `promotionHints`, but the citizen-specific path is degraded until the engine adds a richer EventType breakdown. Tracked in ROLLOUT_PLAN as a follow-up item.

## Step 6 — Improvements section

For every `type: 'improvement'` in `patterns[]`, write one short paragraph: what's working and why. Don't bury good news. Phase 38.4 (S146 spine step 5) now also threads improvement-side handles into `tribuneFraming.storyHandles` when a positive trend has a named cause — surface those as story candidates for sift, same format as ailment briefs but tagged **IMPROVEMENT** at the top.

## Step 7 — Measurement check (cycles after the first)

The audit JSON carries measurement state directly: every pattern has a `measurement` field; the JSON has a top-level `measurementHistory[]` rollup. Don't read prior `engine_review_*.md` files — the structured fields already record what fired and what didn't.

Render in three parts:

1. **Per-pattern table.** One row per pattern with `measurement.available === true`: pattern type, affected entity, prior remedy type, expected, observed, verdict. If every pattern is `available: false` because no prior audit exists yet (`reason: 'no-prior-audit'`), write the single line `First review — no prior to compare. Measurement loop will activate on next cycle.` and skip the table.

2. **Remedy-type track record.** Group `measurementHistory[]` by `priorRemedyType`, count verdicts (`remedy-firing-as-expected`, `remedy-firing-insufficient`, `remedy-not-firing`, `remedy-overshot`). One row per type. This is the city's multi-cycle learning signal — what kind of intervention has actually moved the world.

3. **Win callout.** If any pattern this cycle reads `verdict: 'remedy-firing-as-expected'` AND its prior-cycle entry in `measurementHistory[]` was `remedy-not-firing`, name it in voice: the gap closed — that's a story candidate, not just a data point. One line under the table.

For `available: false` rows other than the first-run case, gate display on `measurement.reason`: `no-prior-match` → render as `—`; `prior-had-no-expectation` → render as `no prior expectation`. Don't omit them silently.

## Output File

Write to `output/engine_review_c{XX}.md`:

```
# Engine Review — Cycle {XX}

**Cycle:** {XX} | **Date:** {timestamp}
**Auditor version:** {from JSON detectorVersions.engineAuditor}
**Source files:**
- `output/engine_audit_c{XX}.json` — {N} patterns
- `output/engine_anomalies_c{XX}.json` — {N} anomalies
- `output/baseline_briefs_c{XX}.json` — {N} briefs

## Ailments

### 1. [In-world symptom headline]
- **Tech diagnosis:** [grounded in evidence.fields]
- **Existing mitigators:** [from affectedEntities.initiatives]
- **Why working/not:** [gap analysis]
- **Remedy path:** [world-side preferred, tech-side fallback]
- **Tribune framing:** [three-layer story handles]
- **Measure next cycle:** [specific fields/milestones]

### 2. [next ailment]
...

## Anomalies

### [triage-by-triage, or "No anomalies flagged this cycle"]

## Improvements

### [what's working and why]

## Baseline Briefs (sift input)

- Total: {N} briefs ({byEventClass breakdown})
- With promotion hints: {N}
- Cluster note: {neighborhood / ailment overlaps}
- Source: `output/baseline_briefs_c{XX}.json`

## Measurement Check (from previous review)

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| [type] | [neighborhood / initiative] | [priorRemedyType] | [expected] | [observed] | [verdict] |

(First-run case: `First review — no prior to compare. Measurement loop will activate on next cycle.`)

[Win callout, if any pattern flipped from `remedy-not-firing` last cycle to `remedy-firing-as-expected` this cycle.]

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| [priorRemedyType] | [N] | [N] | [N] | [N] |

## Summary

- Ailments: {count} ({severity breakdown})
- Anomalies: {count} ({triage breakdown})
- Improvements: {count}
- Baseline briefs: {count} ({with-promotion-hints count})
- Measurements: {firing-as-expected count} / {total measured} firing as expected; {not-firing count} not firing
```

## Where This Sits

Step 4 in the run-cycle chain. After pre-flight, pre-mortem, and cycle execution. Before build-world-summary. World summary reads this file and incorporates the framing; sift reads the same file plus the baseline-briefs JSON for editorial planning.

## Why this rewrite (S146 — two passes)

**First pass (after Phase 38.1 + 38.7 + 38.8):** scanned 11 sheets by hand → consume audit + anomalies + baseline-briefs JSON. Detection moved out of the skill into `scripts/engineAuditor.js`. Skill became the framer.

**Second pass (after Phase 38.2 + 38.3 + 38.4, this rewrite):** even the framing logic mostly moves into structured fields. The auditor now writes `mitigatorState`, `remedyPath`, and `tribuneFraming` per pattern — which is what the skill was previously synthesizing by hand. The skill's remaining job: translate structured engine fields into Tribune voice, surface front-page candidates, and gate anomalies. Most assertions about "what to write" come from `tribuneFraming.threeLayerCoverage` directly.

Determinism in code, judgment in the skill — and the judgment surface keeps shrinking as the auditor learns. Sources: `docs/engine/PHASE_38_PLAN.md` §6 (first rewrite) and §16.5 (this rewrite).
