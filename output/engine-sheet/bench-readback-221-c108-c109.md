# Bench readback — engine.221 city econ mood carry (engine-sheet S461, 2026-09-14) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app `AKfycby-f9gv5s…` **@34** = repo `a05aa6b1` (PROD @85 + engine.221) + bench-only diag217 overlay. Resynced from live C107 this session (typed, 82 tabs / 53,083 rows, read-back OK on the 5 biggest). Pre-fire typed read (`bench-221-prefire.json`): cycleCount **107 (number)**, `econMoodInertia` **absent** (self-arms at the fire), Engine_Errors 0, ring C105 59.28 / C106 59.54 / C107 **59.01**, ledger 943.

Sole suspect for any economy anomaly: engine.221. First post-sync fire: the engine.119 ghost guard selects the C107 ring slot — expected, not a finding.

## C108 predictions

1. Fire `ok:true`, cycleCount 108, 0 Engine_Errors (none matching `econMoodInertia`).
2. World_Config `econMoodInertia` = **0.3 (number)** after the fire (ensureEngine221Config_ ran before Phase 1).
3. `diag61.mood` = **59.01** — the Phase-5 money loop reads `previousCycleState.econMood`; 221 does not touch that path.
4. `diag217.economyRuns` 1, `modules` 5/5 (engine.217 still holds).
5. `diag217.moodAfterRun` ≈ **55.9** = 59.01 + 0.3 × (level − 59.01), level ≈ 48.81 (the @33 C108 value: same ripple state and calendar after a fresh C107 sync). Band: 54.5–57.5. Under @33 this read 48.81 — that gap is the cut.
6. Persisted post-migration `econMood` (ring slot C108): an **integer in 54–58** (applyMigrationDrift rounds at :496).

## C109 predictions

1. Fire ok, cycleCount 109, 0 Engine_Errors.
2. `diag61.mood` = C108's persisted ring value (the carry proof, as at @33).
3. `diag217.moodAfterRun` ≈ C108-persisted + 0.3 × (level − C108-persisted), level ≈ 48.6 → a value ~2 below C108's, i.e. the mood keeps **softening** rather than stepping. Under @33 C109 read 48.59.
4. The chain: 59 → ~56 → ~54 → … toward the level — start, peak, end, aftermath — not one step and flat.

## Results — C108 on @34, fired 2026-09-14 ~21:05 Chicago (one GET, 200 s wall, `bench-221-c108-fire-response.txt`, typed readback `bench-221-c108-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 108, 0 errors | `ok:true`, ranMs 194,855, cycleCount **108 (number)**, Engine_Errors **0**, **133/133** phases ok | PASS |
| `econMoodInertia` self-armed | 0.3 (number) | **0.3 (number)**, present | PASS |
| `diag61.mood` (money loop reads the carry) | 59.01 | **59.01** (rate 5.16) | PASS |
| engine.217 holds | economyRuns 1, 5/5 | `economyRuns: 1`, `modules: "5/5"` | PASS |
| `diag217.moodAfterRun` | ≈55.9 (band 54.5–57.5) | **55.95** = 59.01 + 0.3 × (48.81 − 59.01) exactly | PASS |
| Persisted ring C108 econMood | integer 54–58 | **56**, sentiment −0.19 | PASS |
| Ledger | — | 949 rows (+6, feeder mints as on the @33 bench) | — |

## Results — C109 on unchanged @34, fired ~21:09 (152 s wall, `bench-221-c109-fire-response.txt`, `bench-221-c109-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 109, 0 errors | `ok:true`, ranMs 147,675, cycleCount **109 (number)**, Engine_Errors **0**, **133/133** ok | PASS |
| `diag61.mood` = C108 persisted | 56 | **56** (rate 4.87) | PASS — the carry proof |
| `diag217.moodAfterRun` | ≈ 56 + 0.3 × (48.6 − 56) ≈ 53.8 | **53.78** (implied level 48.6; @33 read 48.59) | PASS |
| Persisted ring C109 econMood | ~54 | **54**, sentiment −0.16 | PASS |
| engine.217 holds | 1, 5/5 | `economyRuns: 1`, `modules: "5/5"` | PASS |
| Ledger | — | 957 rows | — |

**The chain, actual values:** carried 59.01 → C108 Phase-6 **55.95** / persisted **56** → C109 Phase-6 **53.78** / persisted **54**, with the level sitting at 48.8 / 48.6 both Cycles. Under @33 the same two Cycles read 48.81 → 48.59 (persisted 48 → 49): one step, then flat. The mood now softens toward the level over a season instead of replacing itself each week — start, peak, end, aftermath.

**Bench state after C109:** SANDBOX 0908 @34 = `a05aa6b1` + bench-only diag217; sheet at C109, bench-only since this session's typed C107 resync (C108–C109 and everything they wrote: 14 feeder mints, ring slots 108/109, `econMoodInertia` row).
