No sheet write operations in the function. The function is pure — it takes in parameters and returns an object. Let me get the complete card now:

```
WIRING CARD — calculateNeighborhoodCrime_ (function)   map: 2026-11-24 / 179 files   

DEFINITION
  phase03-population/updateCrimeMetrics.js:489  function calculateNeighborhoodCrime_(neighborhood, profile, demo, prev, context, events, advanced, rng)   v1.4 (engine.237, S470)

PHASE POSITION
  production entry : Phase3-Crime @ godWorldEngine2.js:693  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase3-Crime @ godWorldEngine2.js:2414 — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (1)
  phase03-population/updateCrimeMetrics.js:262  newMetrics[hood] = calculateNeighborhoodCrime_(

S FIELDS
  NOT FOUND (function takes all data as parameters; does not access ctx.summary or S directly)

OTHER CTX
  NOT FOUND (function does not access ctx.* fields; all data passed as parameters)

WRITE PATH
  NOT FOUND (function is pure: returns object, makes no sheet writes, no queued intents)
  Math.random @ NOT FOUND

TABS
  NOT FOUND (function makes no tab references)

OPEN WORK
  docs/plans/2026-09-21-care-and-justice-system.md:459  Phase3-Crime publishes S.crimeMetrics.byNeighborhood[h], each hood the return of calculateNeighborhoodCrime_
  docs/plans/2026-09-21-safety-lever.md:107  Crime read and call; calculateNeighborhoodCrime_ at :454; causes/enforcement at :485–538, reversion/clamp at :540–546
  docs/plans/2026-11-24-arrests-read-right.md:31  Incidents: updateCrimeMetrics.js calculateNeighborhoodCrime_: (propertyLevel + violentLevel) / 2 / 5.5, then weather, per-event additions, noise, one rounding. No population term.

HISTORY
  fa507b96b engine.365 Task 1: a hood's incidents follow its residents — the level term and the noise × residents / the city's mean hood
  8382a4e80 engine.243: a crisis gets a name, an end the newsroom can see, and a city that remembers it
  1c7af1235 engine.242c fix: quality of life uses a true median and keeps one measure's spread
  ff949ab01 engine.242c: a hood's quality of life is read from its own measurables, and speaks in its cause
  2210b3063 engine.237 fix-up: the authored crime profile table leaves the per-cycle path entirely
  a4d0de30e engine.235: persist the engine's crime read — Crime_Metrics Trend / Hotspot / PressureRatio + packet trend/headroom

FILES OPENED
  phase03-population/updateCrimeMetrics.js
  phase01-config/godWorldEngine2.js
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-09-21-care-and-justice-system.md
  docs/plans/2026-09-21-safety-lever.md
  docs/plans/2026-11-23-hospital-record-reads-right.md
  docs/plans/2026-11-24-arrests-read-right.md
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=22 toolCalls=30 in=520513 out=4132_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._