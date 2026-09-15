# Bench readback — engine.226 CONSTRUCTION_BOOM from a typed source; detector reads world events only (engine-sheet S462, 2026-09-15) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app **@40** = repo `328bf87c` (= @39 `a2f3661f` engine.225 + engine.226; no overlay). Fresh typed resync from live C107 (82 tabs, read-back OK). Sole suspect: engine.226. Baseline: @39's C108/C109 ring state read back before the resync (`scratchpad/bench39-c10{8,9}-readback.json`).

engine.226 is latent on live (0 keyword hits in 136 world events C95–C107; 0 CONSTRUCTION_BOOM on record) and the citizen-events concat matched nothing since it was written — so the sim-visible proof is **no change**: the same world, the same ripples, the same numbers as @39.

## C108 predictions
1. Fire ok, 108, 0 Engine_Errors.
2. Ring `PREV_CYCLE_STATE_JSON@108.economicRipples` = @39's set exactly: CRIME_SPIKE(−8,108), PLAYOFF_SPENDING(9.6,107), BUSINESS_EXPANSION(6,107), WINTER_DOLDRUMS(−4,108), PLAYOFF_SPENDING(8,106), CRIME_SPIKE(−8,105); **no CONSTRUCTION_BOOM**.
3. Economy **56**, sentiment **−0.16**; hood blob 22 hoods with decimals, Jack London top / Fruitvale bottom (engine.225, unchanged).

## C109 predictions
1. Fire ok, 109, 0 errors; ripples = @39's C109 set: CRIME_SPIKE(−8,108), WINTER_DOLDRUMS(−4,108), PLAYOFF_SPENDING(9.6,107), BUSINESS_EXPANSION(6,107); economy **54**, sentiment **−0.15**; `neighborhoodDynamics` per hood = @39's C109 values (the 225 term is deterministic on the same inputs).

## Results — C108 on @40, fired 2026-09-15 ~02:53 Chicago (194 s wall; response is Google's interstitial again — cycleCount 108 written, ring @108; `bench-226-c108-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 108, 0 errors | cycleCount **108**, Engine_Errors **0** | PASS |
| Ripples = @39's C108 set, no CONSTRUCTION_BOOM | 6 ripples, exact | **identical** (CRIME_SPIKE −8 @108, PLAYOFF_SPENDING 9.6 @107, BUSINESS_EXPANSION 6 @107, WINTER_DOLDRUMS −4 @108, PLAYOFF_SPENDING 8 @106, CRIME_SPIKE −8 @105); no CONSTRUCTION_BOOM | PASS |
| Economy / sentiment / hood blob / dynamics | 56 / −0.16 / = @39 | **56 / −0.16**; hood blob **byte-identical** to @39 (Jack London 57.4 top, Fruitvale 53.7 bottom); `neighborhoodDynamics` **12/12 identical** | PASS |

## Results — C109 on unchanged @40, fired ~02:57 (144 s wall; `bench-226-c109-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 109, 0 errors | cycleCount **109**, Engine_Errors **0** | PASS |
| Ripples = @39's C109 set | 4 ripples, exact | **identical** (CRIME_SPIKE −8 @108, WINTER_DOLDRUMS −4 @108, PLAYOFF_SPENDING 9.6 @107, BUSINESS_EXPANSION 6 @107); no CONSTRUCTION_BOOM | PASS |
| Economy / sentiment / hood blob / dynamics | 54 / −0.15 / = @39 | **54 / −0.15**; hood blob byte-identical; `neighborhoodDynamics` **12/12 identical** (sentiment and retail) | PASS |
| Riley_Digest C109 | row present | `high-signal` — "…; 45 high-priority story hooks; Wide domain spread (6 active)." (= @39) | PASS |

**Bench state after C109:** SANDBOX 0908 @40 = `328bf87c` (225 + 226); sheet at C109, bench-only since this session's second typed C107 resync. Both cuts bench-proven; they stack on one live fire (PROD push pending Mike's go — classifier-blocked this session).
