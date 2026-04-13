---
name: engine-review
description: Post-cycle engine state diagnostic. Reads world state, identifies ailments, produces 7-field briefs with remedy paths. Phase 38.
effort: high
---

# /engine-review — Engine State Diagnostic

## Purpose

After a cycle runs, read the world state and identify what's broken, stuck, improving, declining, or incoherent. Produce a structured brief per ailment that downstream skills (world-summary, sift, write-edition) consume.

This is NOT a code check. Pre-mortem checks the code. This checks what the code produced — is the world making sense?

## Inputs

Read from sheets via service account:

- **Riley_Digest** — current + previous 2 cycles (trend detection)
- **Initiative_Tracker** — initiative states, implementation phases
- **Neighborhood_Map** — 17 neighborhoods, 27 columns of state
- **WorldEvents_V3_Ledger** — events generated this cycle
- **Civic_Office_Ledger** — council positions, approval ratings
- **Population_Stats / World_Population** — economic indicators
- **Crime_Metrics** — per-neighborhood crime state
- **Transit_Metrics** — transit performance
- **Edition_Coverage_Ratings** — what the Tribune covered last cycle
- **Event_Arc_Ledger** — active arcs and tension levels
- **Storyline_Tracker** — active storylines and status

Read from disk:

- **Previous engine review** — `output/engine_review_c{XX-1}.md` (if exists, for measurement comparison)

## What to Scan For

### 38.1 Ailment Detection Patterns

1. **Repeating events without mitigator advance.** Same crisis appearing 3+ cycles (compare Riley_Digest across cycles). An initiative exists to address it but hasn't advanced phases.

2. **Stuck initiatives.** Initiative_Tracker rows where ImplementationPhase hasn't changed in 3+ cycles. The world proposed a fix and then nothing happened.

3. **Math imbalances.** Decay without offset (health declining, no health program advancing). Production without consumption (events generating with no coverage). Growth without pressure (everything positive, no corrective forces).

4. **Cascade failures.** An initiative is active but AffectedNeighborhoods show no change. Coverage ratings were applied but sentiment didn't shift. A civic decision was made but no downstream effect visible.

5. **Feedback writeback drift.** Coverage ratings exist but engine effects are flat. Initiative effects should propagate but neighborhood metrics don't move. The loop is wired but not firing.

6. **Over/under-production.** One domain generating 13 events while another generates 0. Crime numbers changing with no event driving the change. Migration patterns with no economic cause.

### Also Check

7. **What's improving.** Initiatives advancing, neighborhoods stabilizing, metrics trending positive. Not just problems — what's working and why.

8. **Incoherence.** Results that don't make logical sense given the inputs. Health center built but health declining. High approval but no civic activity. Crime dropping with no intervention.

## Output Per Ailment — 7 Fields

For each finding, produce:

1. **In-world symptom** — what this looks like as a story
2. **Tech diagnosis** — what's actually happening in the engine (ctx fields, sheet columns, cascade chains)
3. **Existing mitigators check** — does a world-side remedy already exist? What's its status?
4. **Why mitigators are or aren't working** — if a remedy exists but isn't offsetting the math, where's the gap?
5. **Recommended remedy path** — world-side preferred (advance initiative, propose new one, character intervention, council vote). Tech-side fallback only if world-side is structurally impossible.
6. **Tribune framing brief** — story handles threading engine + simulation + user actions (three-layer coverage)
7. **Measurement plan** — specific fields to watch next cycle to verify whether the remedy worked

## Output File

Write to `output/engine_review_c{XX}.md`

```
# Engine Review — Cycle {XX}

**Cycle:** {XX} | **Date:** {timestamp}
**Previous review:** C{XX-1} (or "first review")

## Ailments

### 1. [In-world symptom headline]
- **Tech diagnosis:** [what the engine is doing]
- **Existing mitigators:** [what exists to fix it]
- **Why working/not:** [gap analysis]
- **Remedy path:** [world-side preferred, tech-side fallback]
- **Tribune framing:** [three-layer story handles]
- **Measure next cycle:** [specific fields/milestones]

### 2. [next ailment]
...

## Improving

### [what's working and why]

## Incoherence

### [results that don't make logical sense]

## Measurement Check (from previous review)

### [compare C{XX} against C{XX-1} measurement plans — did remedies work?]

## Summary

- Ailments: [count]
- Improving: [count]
- Incoherent: [count]
- Measurements checked: [count passed / count total]
```

## Where This Sits

Step 4 in the run-cycle chain. After pre-flight, pre-mortem, and cycle execution. Before build-world-summary. World summary reads this file and incorporates findings.

## Sheet Access

Service account via `lib/sheets.js`. Spreadsheet ID from `.env`.
