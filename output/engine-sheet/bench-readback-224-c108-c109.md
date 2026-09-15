# Bench readback — engine.224 cycle-weight signal after its writers (engine-sheet S461, 2026-09-15) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app **@38** = repo `706b36da` (PROD @89 + engine.224) + bench-only diag217. Fifth typed resync from live C107 this session; pre-fire typed read (`bench-224-prefire.json`) identical to live. Sole suspect: engine.224. Live context: Riley_Digest reasons C103–C107 carry event/weather/sentiment/shock/civic/hook terms; 19 of 105 rows ever carried a media/domain/hook term.

## C108 predictions

1. Fire ok, 108, 0 Engine_Errors, **phaseCount 132**; in `timing.timings` the `Phase8-V3Integration` entry precedes `Phase8-CycleWeightSignal` (was the reverse).
2. Bench Riley_Digest row C108: `cycleWeight` present with a reason list; if this Cycle's media reads saturated or crisisSaturation ≥ 0.6, or the domain tracker reports a dominant domain ≥ 4 / ≥ 6 active, those terms now CAN appear — not asserted, since the fixture is the live world. Score may be ≥ the @37 value, never lower on these three inputs.
3. Economy and carry identical to @37 (55.83 / 56, sentiment −0.16).

## C109 predictions

1. Fire ok, 109, 0 errors, 132/132, same phase order; Riley_Digest C109 row present; economy as @37 (53.63 / 54).

## Results — C108 on @38, fired 2026-09-15 ~01:35 Chicago (236 s wall, `bench-224-c108-fire-response.txt`, `bench-224-c108-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire / order | ok, 108, 0 errors, phaseCount 132, V3Integration before CycleWeightSignal | `ok:true`, ranMs 230,559, cycleCount 108, Engine_Errors 0, **phaseCount 132**, `timing.timings` index **V3Integration 100 → CycleWeightSignal 101** (was the reverse), 0 not-ok | PASS |
| Riley_Digest C108 | row present; media/domain terms allowed | `high-signal` — "High event volume (9); Notable weather impact; Shock event detected; Recovery moderate; Strain trend detected." (the reason list is capped at five terms) | PASS |
| Economy / carry | as @37 | 59.01 / 55.83 / 56, sentiment −0.16 | PASS |

## Results — C109 on unchanged @38, fired ~01:39 (159 s wall, `bench-224-c109-fire-response.txt`, `bench-224-c109-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire / order | ok, 109, 0 errors, 132/132, same order, no carry events | `ok:true`, ranMs 153,950, cycleCount 109, Engine_Errors 0, **132/132**, V3 100 → CW 101, `carryForward` absent | PASS |
| Riley_Digest C109 | row present | `high-signal` — "High event volume (9); Shock event detected; Strain trend detected; **39 high-priority story hooks; Wide domain spread (6 active)**" — a domain term the old order could never produce (domainPresence was written after scoring) | PASS — sim-visible proof |
| Economy | as @37 | 56 / 53.63 / 54 | PASS |

**Bench state after C109:** SANDBOX 0908 @38 = `706b36da` + bench-only diag217; sheet at C109, bench-only since this session's fifth typed C107 resync.
