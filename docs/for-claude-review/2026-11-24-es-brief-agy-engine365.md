# agy brief — engine.365 adversarial diff read (engine-sheet, 2026-11-24)

**Read-only. Write only `output/antigravity/2026-11-24-review-engine365.md`.**

Commits `47ce31390` (arrests), `fa507b96b` (incidents by residents); also `92ce711ce`'s `careJusticeService.js` hunk (carry type check) ships with them. Plan: `docs/plans/2026-11-24-arrests-read-right.md`. Bench: `output/engine-sheet/2026-11-24-e365/bench.log` when it lands.

What changed:
- `phase04-events/careJusticeService.js` — per hood, arrests = floor((charges − OARI diverted) × clearance + carried fraction); the remainder rides `PREV_ARREST_CARRY_JSON` (`finalizeCycleState.js` compactArrestCarry_, `loadPreviousEvening.js` seedCarriedArrestCarry_ — the engine.364 helpers generalized).
- `phase03-population/updateCrimeMetrics.js` — calculateNeighborhoodCrime_: the level term (after the weather floor/ceil) and the noise × residents / the city's mean hood (`crimeResidentFactor_`, `crimeCityMeanResidents_`); per-event additions (chaos, celebration, pressure, nightlife, traffic) stay whole; one log line.

Attack:
1. Every reader of `incidentCount` / Crime_Metrics `IncidentCount` and of city sums of it (enforcement load → every hood's clearance and response next Cycle; story-seed bars on true incidents > 10 / > 5 and enforcement capacity < 0.6 / > 1.3; reporting gap; the cop-car named pass integer check; slices; Civis journal; workers). Does the scaling cross a bar, change a sign, or feed back (city total → clearance → arrests) in a way that drifts across Cycles?
2. The rng: is the draw count and order inside calculateNeighborhoodCrime_ unchanged (seeded replay, other consumers of the same stream)?
3. The throws: `crimeCityMeanResidents_` throws if any simulated hood has no residents row. What runs on that hood list (is it the 22, or does it include a stale or child hood the demographics table lacks)? What does the throw take out with it (Phase3-Crime under safePhaseCall_ → care demand → census → court)?
4. Arrests: can `charges − diverted` go negative; is the carry invariant [0, 1) kept; does `cityCourtRevenue_` and the census identity (`TotalIntakes = Tracked + Other`) hold with the new count; first Cycle on the code (0.5 start) vs rounding in OARI hoods.
5. Anything that is a silent fallback, a weakened check, or a test that no longer tests what it says.

Each finding: file:line, the input, what breaks. Verdict: SHIP / SHIP-WITH-FIXES / HOLD.
