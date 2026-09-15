---
title: Environment + safety audit — engine items (crime shifts/hotspots, conduct events)
created: 2026-09-15
updated: 2026-09-15
type: reference
tags: [research, safety, environment, newsroom, pipeline68, active]
sources:
  - S443+ kimi session — audit tail of the lane-by-lane media data program (builder-directed)
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md — pipeline.68
pointers:
  - "[[../plans/2026-09-07-beat-slices-from-sheets-plan]] — the plan this extends"
---

# Environment + safety audit — engine items

**Verdict:** Noah Tan ADEQUATE (small scripts-side fix landed); Rachel Torres
GAPS, all engine-side — her missing data is computed and never persisted.

## Landed scripts-side (kimi, this session)

`scripts/buildEnvironmentSlice.js` v ENVIRONMENT-SLICE-2: reads the `Impact`
column (was on his own tab, never read) and takes ENVIRONMENT-domain hooks via
`domainHooks` — the deskMap sends them to "Civic Desk" and the 3 live rows name
Mags Corliss, never Noah. Tests + live C107 build pass.

## Engine items for engine-sheet (gated)

**Safety 1 — the engine's own crime verdicts are memory-only.**
`phase03-population/updateCrimeMetrics.js:272-279` computes
`S.crimeMetrics.shifts` (per-hood movement classification) and
`S.crimeMetrics.hotspots` per cycle — the "what changed and where it clusters"
layer — and nothing persists them. Rachel's slice diffs the tab herself;
the engine already computed the answer. Proposed: Shift/Hotspot columns on
Crime_Metrics, or emit into desk_signal's civic lane (she reads its pointers).

**Safety 2 — the by-category citywide breakdown and the "why" behind response
times.** `categoryCityWide` (:278) and the enforcement inputs
(`policingCapacity`, `patrolStrategy`, `cityLoad`, :262-264) are computed and
reach no reader. Same proposed path.

**Safety 3 — conduct Transgression events.** `runConductEngine.js:308-322`
raises local crime off Transgression-* events, but the events themselves
(`S.conductEvents`) reach no newsroom consumer. One emit into desk_signal or
the hook deck joins the human story to her number. (Same cut as the civic
lane's Cut 2 — `docs/for-claude-review/2026-09-15-kimi-civic-lane.md` —
filed once, heals two desks.)

**Environment (minor) — deskMap ENVIRONMENT → Civic Desk**
(`storyHook.js:111`). Noah now catches these by domain scripts-side; the
engine-side fix belongs to the deskMap/phantom-desk pass filed in the culture
lane doc (`docs/for-claude-review/2026-09-15-kimi-culture-lane.md`, Cut 2).
