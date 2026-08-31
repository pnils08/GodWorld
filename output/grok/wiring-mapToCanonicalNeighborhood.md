Now I have all the information. Let me produce the complete wiring card:

```
WIRING CARD — mapToCanonicalNeighborhood_ (function)   map: 2026-08-30 / 183 files   [MAP NOT IN STUB — function unrecorded]

DEFINITION
  phase06-analysis/economicRippleEngine.js:368  function mapToCanonicalNeighborhood_(blNeighborhood)  [header: ECONOMIC RIPPLE ENGINE v2.5]

PHASE POSITION
  production entry : Phase6-EconomicRipple @ godWorldEngine2.js:401  — BEFORE Phase10-ExecuteIntents (563)
  cycle-phases     : Phase6-EconomicRipple @ godWorldEngine2.js:2064  — BEFORE Phase10-ExecuteIntents (2204)

CALLERS (1)
  phase06-analysis/economicRippleEngine.js:345  mapToCanonicalNeighborhood_(biz.neighborhood)

S FIELDS
  (none)

OTHER CTX
  (none — function is pure)

WRITE PATH
  (none — no sheet access)

TABS
  (none)

OPEN WORK
  NOT FOUND

HISTORY
  e9ce67a5 engine.131 T7: the sports zone follows the stadium (ships dark)
  e181e0d5 mags: engine.102 — WP stat ownership fix (single writer: applyDemographicDrift)
  fa87075a S328 engine.75: stale sports teams silenced + East Oakland canonized (both Mike-direct)
  76b310cb S313 research.24 T1-T5: entity protagonism — businesses/faith/programs reach the deck as protagonists
  cf1c2997 S293 [engine-sheet] engine.45 T2 — ripple serialization across cycle boundaries
  87a093dc S292 [engine-sheet] engine.45 T1 fix — dedup guard on economic ripple recording

FILES OPENED
  phase06-analysis/economicRippleEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/ROLLOUT_PLAN.md
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **136**
- opened by this run: **136** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=20 toolCalls=29 in=264203 out=3398_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._