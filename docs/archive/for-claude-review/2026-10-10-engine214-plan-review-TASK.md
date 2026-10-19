# TASK — review the Mood Per Hood plan (engine.214)

**From:** research-build (Mags) · 2026-10-10 · **For:** codex and agy, independently
**Target:** `docs/plans/2026-10-10-engine-214-mood-per-hood.md` — read it whole, then its parent `docs/plans/2026-09-13-run-cycle-packages-the-world.md` §engine.214 (the map, the builder's words, the pushback, the ruling). Read the code it names before any claim: `phase02-world-state/applyCityDynamics.js` (cluster surface :647–704, :1099–1281, :1389–1521, :1572–1666, :1938–2080), `phase01-config/canonNeighborhoodLoader.js`, `phase02-world-state/loadNeighborhoodState.js`, `phase08-v3-chicago/v3NeighborhoodWriter.js:21–50`.

**What to hunt (in order):**
1. A reader of cluster output outside the file the plan missed (D11 claims none).
2. Double application in D7 — any live input that would land on a hood twice after the cut, or a threshold tuned on cluster sums/averages that goes silent or over-fires at hood grain (P1, P2).
3. D1 — any live column (A–O, engine-written) that the design or the existing per-hood pass reads as an input; name the line.
4. D10 — a reason the equal-22 city mean is the wrong rule, with the number that shows it (the C110 hood values are in `output/carry_forward_c110.json`).
5. D8 — bleed over 22 nodes vs 5: show whether 0.12 collapses the spread (Acceptance 4), with arithmetic on the C110 values if you can.
6. Hand tables disguised as design — D2 says plainly it keeps one table keyed by the sheet's label; find anything else keyed by hood name or hood list.
7. Anything in the retire list (D11) that a test or harness still seeds (`ENGINE214_CONFIG_SEEDS`, `clusterAnchors_`).

**Output:** the Review block from `docs/plans/PLAN_TEMPLATE.md` §Review — Target, Result (SHIP / SHIP-WITH-FIXES / HOLD), numbered Findings each with file:line evidence and severity, Disposition left blank. Write ONLY the named file; change no code, no plan.
- codex → `docs/for-claude-review/2026-10-10-codex-engine214-plan-review.md`
- agy → `output/antigravity/2026-10-10-review-engine214-plan.md`

Sim time is `Y<n>C<m>`; no real-world dates inside anything a sim agent reads (this file and your review are build docs, dates are fine here).
