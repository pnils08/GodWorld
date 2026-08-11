---
title: Min-Max Citizen Goals (Mike-direct) — research
created: 2026-08-11
updated: 2026-08-11
type: reference
tags: [research, engine, citizens, dials, goals, active]
sources:
  - Mike-direct S366 (2026-08-11, research-build terminal) — two concepts shared as goal-mechanism seeds: minimax (game-theory adversarial lookahead) and min-maxing (RPG stat optimization). Captured while spoken per CLAUDE.md §Tokens are money.
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home; NO row filed — Mike-direct: parked for a future build, usage cost is the gate"
  - "[[index]] — registered here, same commit"
  - "[[../plans/2026-07-31-citizen-memory-perception]] — engine.94; Track B 'typed ambition' (gated on research.17) is the natural ignition point for the min-max goal engine"
  - "[[../plans/2026-05-31-compression-tag-triage]] — engine.31 7-dial model; the Drive dial (and band map) is the goal-selection input this design reads"
---

# Min-Max Citizen Goals (Mike-direct) — research

**Source:** Mike-direct, S366, 2026-08-11. Two named concepts, offered as ways "to make the citizens or city have a goal":

1. **Minimax** — game-theory/AI backtracking algorithm for two-player zero-sum games. Maximizer seeks highest score, minimizer seeks to deny it; the algorithm looks ahead assuming optimal opposition and picks the path of maximum guaranteed safety.
2. **Min-maxing** — RPG/strategy optimization style. Dump the stats you don't need, pump the critical ones to extremes; accept engineered weakness in exchange for engineered strength.

**What this addresses:** Citizens currently have state (ledger columns, dials, careers, relationships) but no standing *want* — no per-row objective that biases what the engine does to them next. This research maps the two concepts onto GodWorld's existing machinery and renders a verdict on each.

**Status: parked for a future build (Mike-direct, same session — "I can't afford the usage to build it").** No ROLLOUT row, no plan doc, no code. This file exists so the future build starts from work already done.

---

## Extraction — what's usable

### Min-maxing → the per-citizen goal engine (strong fit)

This is the citizen-goal mechanism, and it slots into infrastructure that already exists rather than demanding new architecture:

- **Goal selection comes from the row, not an author.** The engine.31 dial model gives every citizen 7 bipolar dials (Drive, Sociability, Warmth, Openness, Composure, Integrity, Family-oriented) with a band map weighted to extremes. A citizen's dominant band *selects their min-max target*: high-Drive citizens min-max career/wealth, high-Family-oriented citizens min-max household stability, high-Sociability citizens min-max standing/connection. Nobody needs a hand-authored goal — no two rows match, so no two goals look alike. This is universal protagonism verbatim: the row drives the fate.
- **The tradeoff IS the sim.** Min-maxing means the pumped stat is bought with a dumped stat. A citizen maximizing CareerStage bleeds family time, health, or the Integrity dial (the shortcut that catches up). The dumped column is where the story lives — burnout, estrangement, the scandal seed. The engine doesn't need a "drama generator"; the drama is the debit side of the citizen's own optimization, provable from the row (proof-of-why holds).
- **Ignition point already on the books:** engine.94 ([[../plans/2026-07-31-citizen-memory-perception]]) Track B carries "typed grudge/ambition on bondEngine rivalry," gated on research.17. Min-max goal selection is the missing *shape* for typed ambition — ambition as an optimization target with a debit column, not a mood string. The future build should extend that plan's Track B, not open a new lane.

**Build-test check (universal-protagonism doctrine):** does this make a row drive a fate? Yes — a goal is a standing causal input that biases every phase's treatment of that citizen. It is the opposite of an audit machine.

### Minimax → contest resolution for scarce slots only (narrow fit)

Honest verdict: minimax requires an opponent and zero-sum stakes, and prosperity-era Oakland is deliberately not zero-sum. It cannot be the city's goal engine. Where it earns a place:

- **Genuinely scarce slots** — one job opening with several applicants; a fixed initiative budget with competing projects; two businesses on the same block competing for the same customers; a roster spot.
- **Shape of the mechanic:** a single contested moment resolved as each side's row strength vs. the other's — best claim wins, loser's row takes the consequence (and the consequence feeds their next min-max move: the passed-over applicant doubles down or breaks). That loser-consequence edge is what makes it protagonism rather than a dice roll — both rows leave the contest changed.
- **Possible civic variant (unexplored):** council choosing initiatives that are robust to worst-case shocks — minimax as "maximum guaranteed safety" in initiative selection. Noted for completeness; not load-bearing.

**One-line relationship:** min-maxing gives every citizen a want; minimax decides who gets the thing when two citizens want the same one. The first is the goal system; the second is a tool it occasionally uses at points of scarcity.

---

## Where it could apply

| Surface | Application |
|---------|-------------|
| engine.94 Track B (typed ambition) | Min-max goal selection as the shape of typed ambition — extend that plan, don't fork |
| engine.31 dial bands | Drive/dominant-band → goal-axis mapping; band map is the read interface (raw numbers drive nothing, per that plan's contract) |
| Employment / career machinery | Scarce-slot minimax contests: job openings, promotions — loser consequence feeds back into dials |
| Business rows (engine.96 lifecycle) | Same-block competition as a minimax contest surface |
| Editions / desks | The dumped stat is a coverage-ready arc (burnout, estrangement) with proof-of-why in the row — no invented struggle |

## Verdict

**`adopt` — parked (usage-gated, Mike-direct 2026-08-11).** Min-maxing adopted as the citizen-goal design; minimax adopted narrowly as scarce-slot contest resolution. Future build ignites by extending engine.94 Track B once its research.17 gate clears and Mike clears usage for the build.

## Changelog

- 2026-08-11 — Created from Mike-direct S366 concept share; mapping worked out same session, parked on usage. Registered in [[index]].
