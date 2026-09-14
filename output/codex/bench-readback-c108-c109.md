# Bench readback — pre-declared before any fire (engine-sheet S459, 2026-09-14)

Bench: SANDBOX 0908, sheet `1FFpUs98…`, web app `AKfycby-f9gv5s…`. Live-read redirect proven before the sync: LIVE cycleCount 107, BENCH cycleCount 111 (read with `GODWORLD_SHEET_ID` set after `require('./lib/env')`). After codex's sync the same read must say 107.

## Builds

| Build | Content | Version | Pull-back |
|---|---|---|---|
| A `bench-217` | PROD `c37d85ea` + only `9189addf:phase08-v3-chicago/v3Integration.js` | pushed, **version 31, web app pinned @31**, `clasp deployments` read back | 168 files; `v3Integration.js` == recipe, `applyCityDynamics.js` == PROD (engine.214 excluded), no `hospitalIncomeHit_` on the remote; every engine dir byte-identical to the staged tree |
| B `bench-217-218` | A + the four `3e6a8ea1` engine.218 files (`generationalEventsEngine.js`, `runCareerEngine.js`, `generationalWealthEngine.js`, `compressLifeHistory.js`) | pushed, **version 32, web app pinned @32**, `clasp deployments` read back (only @32 on the web-app id) | 168 files; all five overlay files == recipe, `applyCityDynamics.js` == PROD (engine.214 excluded); every engine dir byte-identical to the staged tree |

**Codex ruling (2026-09-14 ~02:20): both repairs from C108 — build B fires C108 and C109.** Reason: a cycle under engine.217 alone could erase a new hospital loss before engine.218 is introduced. Build A (@31) is superseded before it ever fires. Consequence for the readback: there is no bench control cycle; the control for engine.218 is the unpatched-tree regression (24 fail / 15 controls pass), and the control for engine.217 is the live C107 log (two economy lines, 6/6). The "C108 on build A" section below is kept as the PROD-behaviour reference for the two rows; C108 now fires on B, so the 218 predictions apply from C108 (Yu Zen's hit still lands at C109 because `109 − 107 = 2`).

## Pre-declared suspects (S451 pattern)

- **engine.217 owns:** a second `runEconomicRippleEngine_` line in a fire's log, `Modules: 6/6`, a C109 money-loop `mood=` that does not equal C108's post-migration mood.
- **engine.218 owns:** any `Engine_Errors` row containing `Invalid HospitalIncomeState`; any Income anomaly on a hospitalized/critical row; any LifeHistory cell that lost its `[CareerState]` line at trim.
- Neither owns: PropertiesService cold-start `carryForward` recoveries in the first post-sync fire JSON (expected, engine.119 ghost guard); any hood/sentiment figure — no engine.214 on this bench.

## C108 on build A — predictions

1. Fire JSON `ok:true`, cycleCount 107 → 108, 0 `Engine_Errors`.
2. Execution log: exactly **one** `runEconomicRippleEngine_` line, `v3Integration Modules: 5/5` (was 6/6 at live C107). The Phase-6 mood is computed from the carried C107 econMood **59.01** (the doubled value live persisted — this cut cannot change C108's starting state; codex HANDOFF correction).
3. Hospital rows (no 218 code on A — this is the control cycle):
   - **POP-00801 Maurice Franklin** — hospitalized since C106, `EmployerBizId` BIZ-00052, Income 230,000, **EconomicProfileKey blank** → `hospEconOk` false → the Career hit never fires for this row on any build. Expect: no `[IncomeHit]`, no state line; Income moves only if the tracked employer floor would have moved it under PROD (same as PROD). Control.
   - **POP-00194 Yu Zen** — Insurance Agent, SELF_EMPLOYED, Income 111,666, StatusStartCycle **107**, LifeHistory carries `[IncomeHit A105]` (admitted C105, critical C105, hit at C107, stabilized critical→hospitalized at C107 which re-stamped StatusStartCycle — the exact transition defect). At C108: `cycle − admitC = 1` → no hit. Untracked reference floor behaves as PROD. Expect Income unchanged or floor-raised exactly as PROD would.

## C109 on build B — predictions

1. Fire JSON `ok:true`, cycleCount 109, 0 `Engine_Errors`, none matching `Invalid HospitalIncomeState`.
2. Execution log: one `runEconomicRippleEngine_` line, `Modules: 5/5`; the Phase-5 money loop `mood=` equals C108's **post-migration** city mood (C108's Phase-6 value adjusted by `applyMigrationDrift.js:498`), not C108's Phase-6 completion-log value.
3. **POP-00194 Yu Zen — the engine.218 causal proof on a live row**, branch by C109's Phase-4 outcome (Phase 4 runs after Career, before Wealth, at both entries):
   - Still hospitalized, StatusStartCycle 107 after Phase 4: Career fires the hit (`109 − 107 = 2`, EconKey non-blank): **Income 111,666 → 102,733–108,316** (×0.92–0.97, rounded); LifeHistory gains `[Career-Health] … [IncomeHit A107]` and `[HospitalIncomeState] statusStart=107|hit=107`. `applyUntrackedJobReference_` **skips her** (`hospitalIncomeHit_` → 107). **Proof = Income at end of C109 sits inside the cut band, not raised back toward the reference.** Under PROD code the same cycle would re-floor her (that is the 6-fail regression, 91,500→86,925→91,500).
   - Transitions to critical at C109: hit still fires in Career first; Phase 4 then re-keys the line to `statusStart=109|hit=107` and StatusStartCycle 109; floor still skips. Same Income band.
   - Recovers (→ recovering/active) at C109: hit fires in Career (Career runs first), then Phase 4 removes the state line; floors are free to raise her at C109 — recovery ends eligibility by design. Not a defect; say so in the readback.
   - Transitions at **C108** to critical (StatusStartCycle → 108): the hit moves to C110; C109 shows no hit and no state line for her, and this bench run becomes a no-regression smoke for 218 with the 39-case test as the causal proof. State it that way; do not read a clean fire as a fix the bench never exercised.
4. **POP-00801** — unchanged behaviour (control), still no marker.
5. **Migration proof (any row):** a hospitalized/critical row whose LifeHistory carries `[IncomeHit A<n>]` with `n` == its current StatusStartCycle gains `[HospitalIncomeState] statusStart=n|hit=n` with Income unchanged. Live has no such row today (Yu Zen's marker is A105 vs start 107); the bench may create one at C108.
6. **Compression:** no LifeHistory cell on the bench loses its `[CareerState]` line; any cell that gained a state line at C109 keeps it through trim.

## Codex corrections to the readback (2026-09-14 ~02:14)

- **engine.217 money-loop chain:** C108 `diag61.mood` must read **59.01** (the carried live value; this cut cannot change C108's start). C109 `diag61.mood` must equal C108's `Carry_Forward_Store` `PREV_CYCLE_STATE_JSON.econMood` — the final **post-migration** value, not the Phase-6 completion-log value. Observability: `diag217` from the overlay (`output/codex/engine217-diag-overlay.patch`) — `economyRuns: 1`, `modules: "5/6"` — replaces the execution-log lines; no manual log export by the builder.
- **All phase timings successful** in the fire JSON (no phase error entries).
- **Ghost / cold start is NOT unconditional:** the carry ring was copied from live by the sync, so the engine.119 ghost guard should **select C107's slot**, not fall back to a cold start. A cold-start message is a finding, not an expectation.
- **Hospital proof is conditional:** activation is proven only by an actual current-matching `[HospitalIncomeState]` line plus continued hospitalized/critical status through the floors. Recovery may legitimately re-floor. **No state line = no activation proof** — then the bench is a no-regression smoke and the 39-case test remains the causal proof.
- **Sync correction (codex):** the first `--apply` read live with `FORMATTED_VALUE` and wrote `RAW`, turning numeric/boolean cells into strings (and one non-equivalent formatted business value). Codex corrected the script to `UNFORMATTED_VALUE` + `SERIAL_NUMBER` (regression 4/4) and **re-ran the reset**; its typed readback is in progress. Engine-sheet re-reads cycleCount (must be numeric 107) before the fire. Codex commits that script/docs correction separately — its dirty paths stay out of engine-sheet's commits.

## Readback procedure

- Fire: `node -e` fetch of the web-app `exec?token=` + `process.env.CYCLE_TRIGGER_TOKEN`, JSON only, never the URL; Bash timeout ≥ 400 s; never a second GET.
- Logs: `node scripts/fetchExecutionLog.js 108` / `109` (`--summary`), grep `runEconomicRippleEngine_`, `Modules:`, `ENGINE61_RATE`, `mood=`.
- Sheet reads against the bench (redirect set after `require('./lib/env')`): `World_Config.cycleCount`; `Engine_Errors` row count and text; Simulation_Ledger rows POP-00194 / POP-00801 (Status, StatusStartCycle, Income, LifeHistory hospital lines); count of `[HospitalIncomeState]` cells; count of cells with `[CareerState]` before vs after.
- Compare against `output/codex/baseline-c107/` and this file. Results go into this file's §Results (below) before anything is written to DEPLOY.md / ROLLOUT / SESSION_CONTEXT.

## Post-sync bench baseline (engine-sheet independent read, ~02:30)

Codex ran `syncSandboxFromLive.js … --apply` from its pane: 82 tabs, 53,053 rows, read-back OK on the five largest (Story_Hook_Deck 1,772 = live). Independent read with the redirect set after `require('./lib/env')`: **cycleCount 107** (was 111), Simulation_Ledger 943 rows, `Engine_Errors` header only, POP-00194 hospitalized / Start 107 / Income 111,666 and POP-00801 hospitalized / Start 106 / Income 230,000 — identical to live. `[HospitalIncomeState]` cells: **0**. `[CareerState]` cells: **15** (compression baseline — must not drop after C108/C109).

## Results — C108 on @33 (build B + bench-only diag217), fired 2026-09-14 07:21:26Z on codex's go

Artifacts: `output/codex/bench-c108-fire-response.txt` (fire JSON — **truncated at 3,000 chars by the fire helper**, so `timing.timings` past `Phase2-SportsFeed` is not preserved; helper fixed for C109), `output/codex/bench-c108-prefire-carry.json` (carry ring before the fire), `output/codex/bench-c108-readback.json` (post-fire sheet reads).

| Check | Pre-declared | Result | Verdict |
|---|---|---|---|
| Fire | ok:true, cycleCount 108, 0 Engine_Errors | `ok:true`, `ranMs` 206,354 (wall 213 s), cycleCount **108**, `Engine_Errors` **0 rows** | PASS |
| engine.217 — economy once | `diag217.economyRuns` 1, `modules` 5/5 | `economyRuns: 1`, `modules: "5/5"`, `moodAfterRun: 48.81` | PASS |
| engine.217 — C108 money loop reads carried C107 | `diag61.mood` 59.01 | `diag61.mood: 59.01` (rate 5.39 → 5.4, "steady") | PASS |
| Carry ring / ghost recovery | C107 slot selected, not a cold start | pre-fire ring C105 59.28 / C106 59.54 / C107 59.01 (= live baseline); post-fire ring C106 / C107 / **C108 econMood 48**, sentiment −0.19, 41 keys; `Phase1-PrevCycleState` ok 46 ms | PASS (C107 read; no cold-start path) |
| Phase timings | all ok | `phaseCount` 133; slowest five all `ok:true` (Advancement 70.2 s, MaintainLifeHistoryLog 18.9 s, ExecuteIntents 14.8 s, HouseholdFormation 9.4 s, GenerationalWealth 7.7 s); full per-phase list lost to the truncation — `Engine_Errors` 0 is the phase-failure record | PASS with the caveat stated |
| engine.218 — activation | conditional on a current-matching state line + continued status | **No activation.** Phase 4 moved **both** rows to `recovering` at C108 (Yu Zen: `C108 — [Recovering] …`, StatusStartCycle 108; Franklin likewise). Yu Zen's hit could not fire (`108 − 107 = 1`) and recovery ends eligibility; Franklin's never fires (blank EconKey). `[HospitalIncomeState]` cells: **0**. Incomes unchanged: 111,666 / 230,000 | **No activation proof — bench is a no-regression smoke for 218; the 39-case regression stays the causal proof** (codex's rule) |
| engine.218 — compression | no `[CareerState]` lost | 15 → **17** cells (two gained, none lost) | PASS |
| engine.218 — errors | none matching `Invalid HospitalIncomeState` | 0 Engine_Errors | PASS |

**Finding for codex's review (sim behaviour, not a defect claim):** with the Phase-8 re-run gone, the single Phase-6 computation took the economic mood from the carried 59.01 to **48.81** in one cycle (persisted post-migration **48**), and city sentiment went 0.51 → **−0.19**. Live C107 under the double run went 59.54 → 54.01 (Phase 6) → 59.01 (Phase 8). The second run was pulling the mood back up each cycle; the once-per-cycle economy now shows the underlying downward step. C109 will show whether it keeps falling (`diag61.mood` should read **48** on C109 — the carried value — per codex's comparison rule) and how far the money loop moves. Whether ~−10/cycle is the engine telling the truth or a coefficient tuned against the doubled path is codex's call; nothing here is retagged or clamped.

**Codex acceptance of C108 (02:27):** structural proof accepted with the explicit capture gap — full timings and any carryForward recovery diagnostics were lost, so ghost recovery is **not** claimed as independently observed. Hospital = smoke only. Scheduler wording corrected: Generational health runs **within Phase 5 after Career**; its directory is `phase04-events`. Mood finding downgraded to investigation: Phase 6 defaults `S.economicMood` to 50 with no prior-mood assignment before it, so the money-loop input 59.01 is not proof Phase 6 started from 59.01 — codex tracing.

## Results — C109 on unchanged @33, fired on codex's go (02:28), corrected helper (full response saved)

Artifacts: `output/codex/bench-c109-fire-response.txt` (full 7,969-char fire JSON), `output/codex/bench-c109-readback.json` (typed sheet reads, `UNFORMATTED_VALUE`).

| Check | Required (codex) | Result | Verdict |
|---|---|---|---|
| Fire | ok:true, one GET | `ok:true`, `ranMs` 130,292 (wall 138 s), top-level keys `ok, ranMs, diag59, diag61, diag217, timing, citizenArchive` | PASS |
| Phases | all 133 recorded statuses ok | **133 / 133 `ok:true`**, `totalMs` 127,094 | PASS |
| engine.217 — money loop reads C108's final carried mood | `diag61.mood` = 48 | `diag61.mood: 48` (rate 5.4 → 5.16 "steady", nudge −0.01, jitter −0.2) | PASS |
| engine.217 — economy once | `economyRuns` 1, `modules` 5/5 | `economyRuns: 1`, `modules: "5/5"`, `moodAfterRun: 48.59` | PASS |
| Typed sheet readback | numeric cycle, header-only errors | `cycleCount` **109 (number)**; `Engine_Errors` 0 data rows | PASS |
| Carry ring | rotated, typed | C107 59.01 / C108 **48** / C109 **49** (cycle cells numeric; `json.cycle` matches); sentiment C108 −0.19 → C109 −0.17 | PASS |
| Ledger | — | 953 rows (+10 since C107: the short-hood feeder, engine.174/148, as expected on a two-cycle bench) | — |
| engine.218 — compression | 15 baseline CareerState POPIDs retained | **17** cells (ids in the readback JSON; count unchanged from C108, none lost) | PASS |
| engine.218 — activation | conditional | **No activation (smoke only):** Yu Zen and Maurice Franklin both `active` at C109, StatusStartCycle blank, incomes **111,666 / 230,000** unchanged (typed numbers); `[HospitalIncomeState]` cells 0; 0 Engine_Errors, none matching `Invalid HospitalIncomeState` | no regression; the 39-case test is the causal proof |
| Carry-forward recovery diagnostics | — | no `carryForward` / ghost keys in the fire JSON (the response does not carry them); not claimed | — |

**Mood, actual values only (per codex):** Phase-6 `moodAfterRun` C108 **48.81** → C109 **48.59**; persisted post-migration econMood C108 **48** → C109 **49**. The C108 step from the carried 59.01 did not repeat; C109 moved −0.2 at Phase 6 and +1 after migration. Codex's trace of the Phase-6 starting value (defaults to 50, no prior-mood assignment found) is the open question; nothing here is asserted about a recurring drift.

## Codex final ruling (2026-09-14 02:35)

- **engine.217: ACCEPTED** on the two-Cycle bench proof. Codex independently parsed the C109 full JSON (133/133 ok, mood input 48, economyRuns 1, modules 5/5) and the typed sheet (cycle 109, errors 0, carry 49) and confirmed every C107/C108 CareerState POPID retained.
- **engine.218: ACCEPTED** as local regression (39/39) plus **bench smoke only — activation unproven** on the bench.
- **diag217 stays BENCH ONLY** — does not ship to PROD.
- **Further bench fires, LIVE deployment/fire, and push remain HELD.** Acceptance does not lift those gates.
- Codex closes after this bench: it owns `output/codex/HANDOFF.md`, the run-cycle plan Task 7 body, the employment plan D7 body, `docs/index.md`, and `NEXT[codex]`.
- **New input defects for the record (codex, source-verified):** (1) the C108 `FACTORY_CLOSURE −20` ripple came from a **road-closure decision** — `detectNewRipples_` reproduces it in the real VM at `economicRippleEngine.js:533-534`; (2) the calendar writes `S.simMonth` while the economy reads `S.month || 0` — seasonal case never matches. (3) City economic mood starts from base 50 at Phase 6 every Cycle (engine-sheet trace, codex agrees); the C108 value is not a recurring drift. All three preserved by codex in Task 7 / HANDOFF for the next repair.

**Bench state after C109:** SANDBOX 0908 @33 = `c37d85ea` + engine.217 (`9189addf`) + engine.218 (`3e6a8ea1`) + bench-only diag217 (`output/codex/engine217-diag-overlay.patch`); sheet at C109, bench-only since the typed C107 resync: C108–C109 and everything they wrote (10 feeder mints, ring slots 108/109). **Further fires held.** PROD candidate = the two repairs without the diag overlay unless codex rules the diag ships.
