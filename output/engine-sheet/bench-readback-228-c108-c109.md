# Bench readback — engine.228 the relative gates get a real baseline (engine-sheet S462, 2026-09-15) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app **@41** = repo `fec6a3e7` (= @40 `328bf87c` 225+226 + engine.228; no overlay). Third fresh typed resync from live C107 this session (82 tabs, read-back OK). Sole suspect: engine.228. Baseline: @40's C108/C109 ring state (`scratchpad/bench40-c10{8,9}-readback.json`).

## C108 predictions (first fire: no `PREV_ACTIVITY_OBS_JSON` on a live-C107 resync → Phase 2 builds a one-entry history exactly as before)
1. Fire ok, 108, 0 Engine_Errors; economy **56**, sentiment **−0.16**; `neighborhoodDynamics` **identical to @40** (ratios still 1 on this fire); ripples and hood blob identical to @40.
2. Ring gains `PREV_ACTIVITY_OBS_JSON@108`: **one** entry `{cycle:108, events, storySeedCount, media, crime, shockCount}`, well under 200 chars; no `prop-too-large`.

## C109 predictions (Phase 2 opens on C108's entry → the first non-unit ratio the city has computed)
1. Fire ok, 109, 0 errors; economy **54** (Phase 6 untouched); ring `PREV_ACTIVITY_OBS_JSON@109` carries **two** entries (108, 109).
2. `neighborhoodDynamics` vs @40's C109: identical if C109's counts equal C108's (ratio 1); different only where a ratio crosses 1.25 / 1.5 (engine.188 tiers) or 0.8 / 0.5 — not asserted in direction, since the counts are the world's. City sentiment within ±0.05 of −0.15.

## @41 C108 result (fired ~03:12, 202 s): PASS on every declared field — and the entry it carried was `{cycle:108, events:0, storySeedCount:0, media:0, crime:0, shockCount:0}` (92 chars). Phase 2 runs before anything has happened; the observation had been five zeros since S441. Re-cut as 228b (`8ea1624b`): observation taken at Phase 9, Phase 2 reads last night vs the nights before. `bench-228-c108-readback.json` is that @41 fire. Bench moves to @42 on a fresh resync; C109 on @41 not fired (superseded).

# @42 = `8ea1624b` (225 + 226 + 228b), fourth typed resync from live C107 — PRE-DECLARED

## C108 predictions
1. Fire ok, 108, 0 errors; economy 56, sentiment −0.16; dynamics, ripples, hood blob identical to @40 (first fire: nothing carried, Phase 2 reads empty counts, ratio 1).
2. Ring `PREV_ACTIVITY_OBS_JSON@108`: ONE entry with REAL counts — `events` in the live 8–13 band (or the Cycle's generated count), `storySeedCount` in the 28–44 band, `shockCount` = world-event count ≥ 8, `crime` ≥ 0, `media` 0 (no writer).

## C109 predictions
1. Fire ok, 109, 0 errors; economy 54; ring `PREV_ACTIVITY_OBS_JSON@109` = TWO entries (108, 109), both real.
2. Phase 2 at C109: latest = C108's entry, baseline = C108's entry (one prior night) → every ratio exactly 1 → `neighborhoodDynamics` identical to @40's C109. The first non-unit ratio lands at C110 (not fired this session).

## Results — C108 on @42, fired ~03:26 (199 s; `bench-228b-c108-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire / first-fire path | ok, 108, 0 errors; economy 56, sentiment −0.16; dynamics / ripples / hood blob = @40 | cycleCount **108**, Engine_Errors **0**, **56 / −0.16**, `neighborhoodDynamics` **12/12 identical**, ripples and hood blob identical | PASS |
| Ring `PREV_ACTIVITY_OBS_JSON@108` | one entry, real counts | **one entry, 96 chars:** `{cycle:108, events:1593, storySeedCount:32, media:0, crime:0, shockCount:9}` — seeds 32 (band 28–44 ✓), world events 9 (band 8–13 ✓), media 0 (no writer ✓), crime 0 | PASS on the shape; **the `events` prediction misread the field**: `events` is `S.eventsGenerated`, the engine-wide generated-event counter (every micro-event engine increments it — 1,593 this Cycle), not the world-event count, which is `shockCount`. It is the same field Phase 2 always recorded and the same the cycle snapshot's `events` key carries; as a self-relative ratio it is a valid "busier than usual" signal. Noted, not changed. |

## Results — C109 on unchanged @42, fired ~03:30 (144 s; `bench-228b-c109-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 109, 0 errors; economy 54 | cycleCount **109**, Engine_Errors **0**, economy **54**, sentiment **−0.15** (= @40) | PASS |
| Ring `PREV_ACTIVITY_OBS_JSON@109` | TWO real entries (108, 109) | **two entries, 179 chars:** C108 `{events 1593, seeds 32, media 0, crime 0, shockCount 9}`, C109 `{events 2007, seeds 28, media 0, crime 0, shockCount 9}` | PASS |
| Phase 2 at C109 | ratio exactly 1 (one prior night) → dynamics = @40 | `neighborhoodDynamics` **12/12 identical** to @40's C109; ripples and hood blob identical | PASS — the causal proof: the history now carries, and the first non-unit ratio waits for a third night (C110) |

**Bench state after C109:** SANDBOX 0908 @42 = `8ea1624b` (225 + 226 + 228b); sheet at C109, bench-only since the fourth typed C107 resync. All three cuts bench-proven; they stack on one live fire. PROD push of `8ea1624b` pre-flighted (five files differ from the live pull-back: loadPreviousEvening, applyCityDynamics, applyMigrationDrift, economicRippleEngine, finalizeCycleState) — classifier-blocked under auto mode, Mike's go.
