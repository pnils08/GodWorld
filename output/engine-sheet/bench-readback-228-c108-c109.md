# Bench readback — engine.228 the relative gates get a real baseline (engine-sheet S462, 2026-09-15) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app **@41** = repo `fec6a3e7` (= @40 `328bf87c` 225+226 + engine.228; no overlay). Third fresh typed resync from live C107 this session (82 tabs, read-back OK). Sole suspect: engine.228. Baseline: @40's C108/C109 ring state (`scratchpad/bench40-c10{8,9}-readback.json`).

## C108 predictions (first fire: no `PREV_ACTIVITY_OBS_JSON` on a live-C107 resync → Phase 2 builds a one-entry history exactly as before)
1. Fire ok, 108, 0 Engine_Errors; economy **56**, sentiment **−0.16**; `neighborhoodDynamics` **identical to @40** (ratios still 1 on this fire); ripples and hood blob identical to @40.
2. Ring gains `PREV_ACTIVITY_OBS_JSON@108`: **one** entry `{cycle:108, events, storySeedCount, media, crime, shockCount}`, well under 200 chars; no `prop-too-large`.

## C109 predictions (Phase 2 opens on C108's entry → the first non-unit ratio the city has computed)
1. Fire ok, 109, 0 errors; economy **54** (Phase 6 untouched); ring `PREV_ACTIVITY_OBS_JSON@109` carries **two** entries (108, 109).
2. `neighborhoodDynamics` vs @40's C109: identical if C109's counts equal C108's (ratio 1); different only where a ratio crosses 1.25 / 1.5 (engine.188 tiers) or 0.8 / 0.5 — not asserted in direction, since the counts are the world's. City sentiment within ±0.05 of −0.15.
