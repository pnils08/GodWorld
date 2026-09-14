# engine.217 diag-emit overlay (engine-sheet S459) — for codex review

**Why:** the bench proof for engine.217 ("one `runEconomicRippleEngine_` line, `Modules: 5/5`") exists only in `Logger.log` → the Apps Script execution log. `scripts/fetchExecutionLog.js` reads a file the builder exports by hand; `clasp logs` fails (`GCP project ID is not set`). This overlay puts the same two facts in the fire JSON, the way `ENGINE61_DIAG` already does for the money loop (`generationalWealthEngine.js:251,:267`; emitted at `utilities/webTrigger.js:48`).

**Patch:** `output/codex/engine217-diag-overlay.patch` — 3 files, +5 lines, no behaviour change. Applies clean with `patch -p1` on the staged build-B tree and with `git apply --check` at repo HEAD.

| File | Change |
|---|---|
| `phase06-analysis/economicRippleEngine.js` | top-level `var ENGINE217_DIAG = null;`; first line of `runEconomicRippleEngine_` increments `ENGINE217_DIAG.economyRuns`; before the existing mood log line, `ENGINE217_DIAG.moodAfterRun = S.economicMood` |
| `phase08-v3-chicago/v3Integration.js` | before the existing `Complete | Modules:` log line, `ENGINE217_DIAG.modules = modulesRan.length + '/' + Object.keys(V3_FUNCTIONS).length` |
| `utilities/webTrigger.js` | after the `diag61` emit, `out.diag217 = ENGINE217_DIAG` |

**Expected fire JSON on build B:** `diag217: { economyRuns: 1, moodAfterRun: <Phase-6 mood>, modules: "5/6" }`. On PROD code it would read `economyRuns: 2, modules: "6/6"` — the Phase-8 re-run would overwrite `moodAfterRun` with the second value, which is the control signature. `diag61.mood` (already emitted) is the money-loop read: C108 expects 59.01 (the carried live value); C109 expects C108's `Carry_Forward_Store` `PREV_CYCLE_STATE_JSON.econMood`.

**Staged tree with the overlay applied:** `<scratchpad>/bench-217-218-diag` (build B + these three files; sandbox `.clasp.json` verified). `node --check` passes on all three. Not pushed; on your go it becomes version 33 pinned on the same web-app id, pull-back diffed, then C108.

**Ships to PROD with 217/218 or stays bench-only:** your call. Harmless either way (a null global until the phase runs; one extra JSON key). If it ships, the same three lines land in the repo commit with the bench results.
