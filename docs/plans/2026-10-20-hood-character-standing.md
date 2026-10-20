---
title: Hood Character Standing Plan (pipeline.71 — each hood read against its own canon)
created: 2026-10-20
updated: 2026-10-20
type: plan
tags: [pipeline, media, draft]
sources:
  - docs/plans/2026-09-13-run-cycle-packages-the-world.md §engine.214 — builder's words 2026-10-10 (both), pushback 1 and 2, ruling read
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md §Reviews reconciled A4 (this job split out), D12 (C113 step)
  - docs/canon/INSTITUTIONS.md §Neighborhoods (the authored character, all 22)
  - lib/neighborhoodSlice.js (the shared hood reader; value + prev-Cycle delta only)
  - phase05-citizens/neighborhoodTrajectoryEngine.js:254-269 (MedianIncome drifts only with trajectory)
  - output/engine_audit_c105.json … c112.json snapshots.Neighborhood_Map (the record the probe ran on)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.71"
  - "[[2026-10-10-engine-214-mood-per-hood]] — A4, the parent split"
---

# Hood Character Standing Plan (pipeline.71 — each hood read against its own canon)

**Builder's words (2026-10-10), on the map:** "Agree the institutions.md is 'hand written character', and more importantly what all future cycles compare themselves to in media. Since a lot of the data tells the media what happened this cycle there isn't a lot of what is the expected data supposed to be, what historically is 'average' for the data points. The institutions.md sets the base of the sim like the A's set the sports. All sports stories frame it off the A's success. The institutions.md does this for the hoods. West Oakland was the boom town, it gives the media, crons, engine the coded essence of what it is vs what this cycle data says. Otherwise there is no way to know if things are up or down."

**Builder's words (2026-10-10), the ruling:** "West Oakland will always be the boom town, that doesn't mean at any point in the future it remains that. The data and crons will decide, but even if it does get debunked it doesn't change that it was the boom town, and all future coverage will say that it used to be a boom town, if it goes that way. So canon is permanent, that's the point."

**Goal:** every hood-scoped reader (desk slices, the wake, voice workspaces, baseline briefs, the texture builder, the world summary) carries one deterministic line per hood: its canon character (permanent) and where its live numbers stand against that character, with how many Cycles it has stood there. Coverage can then say "holds", "below its character" or "used to be" from the packet, and Rhea can check it.

**Rows:** pipeline.71 · **Owner:** research-build (design) / engine-sheet (build)

## What readers get today

Prev-Cycle delta only: `lib/neighborhoodSlice.js` hands `{value, delta}` against the prior Cycle to its four callers (baseline briefs, voice workspaces, wakePerception, the texture builder); `buildWorldSummary.js` prints the current values with no comparison; 2 of the 19 beat slices read hood numbers (Safety, Civic office); every other desk sees a hood only through the `sheet_read` tool. Nothing compares a live number to the hood's authored row (parent pushback 1). Up or down today means up or down since last week.

## Design

**D1. The referent is the authored row, never re-derived.** The axis is the tech boom: how far it reached each hood. Anything a writer reads says "tech boom" ("born in the tech boom", "left behind by the tech boom"), never a bare "boom"; `BoomIndex` / `BoomExposure` are the sheet's column names only (builder 2026-10-20: "It’s a tech boom city, not sure why you keep saying boom"). `Neighborhood_Map.BoomIndex` (rank among the 22) is the number; `BoomExposure` is the canon word for it (born, anchor, new-build, refused, skipped, behind, …; every word comes from INSTITUTIONS §Neighborhoods). The slice carries the word, not the paragraph; the paragraph stays the writer's deep canon via search. No rolling average: the ruling read closed it ("No rolling-average mechanism is asked for"). The prev-Cycle delta already on the slice plus this standing is the whole read.

**D2. One axis built: the boom. A second axis is one table row.** An `AXES` const `{axis, seedCol, wordCol, liveCol}`, one row today. Wealth is not built: `MedianIncome` drifts only with trajectory (`neighborhoodTrajectoryEngine.js:254-269`) and at C112 it stays bounded by `IncomeTier` across all 22 hoods (tier 2's highest, $81,590, sits under tier 3's lowest, $82,328), so comparing the two would compare the seed to itself.

**D3. Comparator: rank gap on the seed's own scale.** The live rank among the 22 on the axis's live column vs the seed rank on `BoomIndex` (average rank on ties). A gap of 6 or more ranks below = below; 6 or more above = above; otherwise the hood holds. Terciles were tried first and dropped: with `IncomeTier`'s ties they put Jack London off its character 8 Cycles running at live rank 8 (a cut-line artifact, not a story).

**D4. The run is stateless.** Recomputed each read from `output/engine_audit_c<N>.json` `snapshots.Neighborhood_Map`, the same path `buildCivicOfficeSlice.js:309` already reads. The record begins at the first snapshot on disk (C105). Nothing new is written or kept; a missing snapshot ends the run there, and the line says "since C<first>".

**D5. Standing words (deterministic):**
- *holds* — and, after a run below, "back after k Cycles below"
- *above its character, k Cycles*
- *below its character, k Cycles*
- *used to be* — below for N or more Cycles running, having held at least once on record (N is builder call B)
- *never held on record* — off in every snapshot on disk; the words are builder call C

The origin word never changes. West Oakland's line always opens "where the boom was born".

**D6. C113 is an event, not a reset.** engine.214 changes how hood dynamics are made from C113 (parent D12). The record counts across it; a standing that moves at C113 is something the city lived.

**D7. Home and delivery: fold, no new file.**
- (a) `lib/neighborhoodSlice.js` exports a pure `characterStanding(rowsByCycle, cycle, hood)`; `slice().state.character` carries it; `describe()` gains one clause. The four slicer callers get it with no extra wiring beyond passing the snapshots.
- (b) `scripts/beatSliceKit.js` `makeSlice`: when `body.hood` is set, one fact line `{text, src}` with src `Neighborhood_Map BoomIndex/BoomExposure + engine_audit snapshots C<a>–C<b>`. That puts it on the slice and in the packet, so Rhea judges a standing claim against it (pipeline.76 finding: the gate sees the packet alone). No new word gate; the existing "not on the slice" rule covers it.
- (c) `scripts/buildWorldSummary.js` neighborhood table: two columns, Character (the word) and Standing.

## Probe (rb, 2026-10-20, C105–C112 snapshots, gap 6)

Measure = `RetailVitality` (the strip). Seed rank on `BoomIndex` → C112 live rank; `v` = 6+ below, `^` = 6+ above, `.` = holds, C105→C112:

| Hood | Seed | C112 | C105→C112 | Standing at C112 |
|---|---:|---:|---|---|
| Baylight District (anchor) | 1 | 17 | vvvvvvvv | below 8 — never held on record |
| West Oakland (born) | 2 | 7 | vvvvvvv. | holds — back after 7 below |
| Brooklyn (new-build) | 3 | 11 | vvvvvvvv | below 8 — never held on record |
| Fruitvale (transit) | 4.5 | 3 | ........ | holds |
| Rockridge (earned) | 4.5 | 6 | ........ | holds |
| Downtown (spine) | 7 | 2 | ^....^.. | holds |
| Jack London (evening) | 7 | 1 | ..^^^.^^ | above 2 |
| Uptown (nightlife) | 7 | 5 | ........ | holds |
| Adams Point (spillover) | 10 | 18 | vv.vvvvv | below 5 |
| Grand Lake (public-face) | 10 | 4 | ^......^ | above 1 |
| Piedmont Ave (corridor) | 10 | 8 | ...^^^^. | holds |
| KONO (emerging) | 12.5 | 13 | ^....... | holds |
| Lake Merritt (untouched) | 12.5 | 10 | ........ | holds |
| East Oakland (crossing) | 14 | 15 | ........ | holds |
| Chinatown (refused) | 15.5 | 9 | ^^^.^^^^ | above 4 |
| Eastlake (mixed) | 15.5 | 16 | ........ | holds |
| Laurel (reachable) | 17 | 14 | .^...... | holds |
| San Antonio (absorbed) | 18 | 20 | ........ | holds |
| Dimond (skipped) | 20 | 12 | .^^...^^ | above 2 |
| Glenview (skipped) | 20 | 21 | ........ | holds |
| Ivy Hill (skipped) | 20 | 22 | ........ | holds |
| Temescal (behind) | 22 | 19 | ^^...... | holds |

Off at C112: retail 7 of 22, trajectory (growth/decay × momentum) 10, migration 7. Under all three measures Baylight and Brooklyn, the two new builds, never held. Under trajectory and migration, Temescal ("the area the boom left behind") sits above its character all 8 Cycles. Retail flips least, which is why it is the default.

## Builder calls (sim judgement; defaults named; say if different)

- **A. Which live number tests the boom claim.** Default: retail (the strip). Alternatives: trajectory, where Temescal reads above its character every Cycle on record; migration, where West Oakland holds at C112 and Chinatown is above 4. A composite would need hand weights. Not proposed.
- **B. How many Cycles below before coverage may say "used to be".** Default 4. Under it, Adams Point (5 below) already qualifies at C112.
- **C. Baylight and Brooklyn, which never held on record.** RULED 2026-10-20 (Baylight): INIT-006 is in construction (Phase II remediation, milestone review C115, $2.1B undisbursed); the tech HQs listed under Baylight stay there (relocated; "they aren't there realistically until it's built"). Baylight reads "under construction", keyed to the tracker phase, until it opens; no standing line before then. Brooklyn still open (new-build, never held).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `characterStanding` + `AXES` in `lib/neighborhoodSlice.js` (D1–D5); unit test on a fixture cut from the C105–C112 snapshots that reproduces the probe table above (Baylight never held 8, West Oakland back after 7, Chinatown above 4) | es | not started — waits A/B/C |
| 2 | Slicer wiring (D7a): `slice().state.character`, `describe()` clause; one snapshot loader shared by the four callers | es | not started — waits A/B/C |
| 3 | Beat-slice fact line (D7b) in `beatSliceKit.makeSlice` when the slice names a hood; `scripts/beatSlices.test.js` asserts the line and its src | es | not started — waits A/B/C |
| 4 | World summary table columns (D7c) | es | not started — waits A/B/C |
| 5 | Read the first hood-scoped packet after the C113 drain (Sun 2026-10-25) | rb | not started |

## Acceptance

1. The Task 1 test reproduces the probe table: proven by the unit run.
2. The first unattended hood-scoped desk write after C113 (Maria, Celeste or Jax) carries the character fact line on its packet. If the piece makes a standing claim, Rhea passes it against that line: proven by the packet and the Rhea verdict on disk.
3. The C113 world summary shows 22 standings that match `characterStanding` on the C105–C113 snapshots: proven by readback.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Probe 1 (terciles) and probe 2 (rank gap, three measures) | rb | §Probe above | read-only |
| Advisor pass on the design | rb (advisor) | this session, 2026-10-20 | adopted: rank gap, one axis, stateless run, packet delivery, C113 as event |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | The authored row is the permanent referent; no rolling average | builder · rb | parent §engine.214 ruling read |
| A2 | The read must reach the packet, or Rhea blocks a standing claim as not on the slice | rb | media-extension plan changelog 2026-10-19 (pipeline.76, the gate sees the packet alone) |
| A3 | Wealth is not an axis yet: `MedianIncome` is still bounded by `IncomeTier` | rb | `neighborhoodTrajectoryEngine.js:254-269`; probe 1 wealth table |

### Needs proof

| # | Claim | Proof that settles it |
|---|---|---|
| N1 | Retail stays the steadiest measure after engine.214's C113 change | rerun the probe on C113–C115 snapshots |

### New concepts

| # | Idea | Status |
|---|---|---|
| X1 | Council packets carry their district hoods' standings (`buildCivicOfficeSlice.js` already ranks hoods vs the city) | held: the ruling names media coverage; revisit after acceptance 2 |
| X2 | A wealth axis once `MedianIncome` leaves its tier band | held until the probe shows a hood off its tier |

## Changelog

- 2026-10-20 — Axis named the tech boom in every writer-facing line (builder).
- 2026-10-20 — Builder ruled Baylight (call C): under construction, tech stays filed there; West Oakland's tech footprint goes to engine.306 (sim-created firms). Brooklyn, A and B still open.
- 2026-10-20 — Plan written (rb). Probe on C105–C112: retail measure, gap 6, 7 of 22 off; Baylight and Brooklyn never held. Builds wait on builder calls A/B/C.
