# Codex simulation repair handoff

Updated 2026-09-14 after sandbox C108 and C109. Codex directs; engine-sheet applies substrate changes and executes directed builds. This supersedes the earlier unbenched/hospital-unimplemented checkpoint.

## Current ruling

**engine.217 passes its two-Cycle sandbox proof. engine.218 passes local regression and sandbox smoke checks; natural hospital-loss activation was not exercised. Diagnostics remain BENCH ONLY. Further fires, live deployment and push remain held.** Do not deploy mixed repository HEAD: it contains rejected engine.214.

## Landed repairs

- **engine.217 `9189addf`:** removes the economy registry entry and scheduled duplicate from v3Integration. Phase 6 calculates once; intervening migration survives Phase 8. Compatibility wrapper remains. Six two-Cycle regression scenarios pass across both real scheduler entry points; all six fail against pre-cut source. Owning plan: `docs/plans/2026-09-13-run-cycle-packages-the-world.md`, Task 7.
- **engine.218 `3e6a8ea1`:** four substrate files preserve recorded hospital income loss through Career, both Wealth floors, health transitions and LifeHistory compression. Unstamped `[HospitalIncomeState] statusStart=<current status key>|hit=<original admission key>` survives trimming. Transitions re-key statusStart; recovery clears the exception. The hit value is an admission/status key, not the Cycle when pay was cut. Actual scheduler order is Career → Generational health → Wealth, within Phase 5. Owner draws remain unchanged and separately unproven. Owning plan and verified wiring: `docs/plans/2026-08-29-employment-system-cascade.md`, D7.
- **Sync correction `91ca74bc`:** syncSandboxFromLive.js now reads UNFORMATTED_VALUE with SERIAL_NUMBER before RAW writes; the original copy changed numeric/boolean types. Regression: original 3 pass / 1 fail, corrected 4/4. Corrected authorized reset copied 82 tabs / 53,053 rows; six critical tabs matched live exactly in values AND types at numeric C107. Five largest tab counts matched. Eleven oversized historical Media_Briefing cells retain existing truncation; no oversized engine/citizen source cells were found.

Hospital regression **39/39**; unpatched source **24 failures / 15 controls pass**. Related passing suites: hoodIncome 74, careerStage 83, hospitalTalkback 24, citizenDialMultiCycle 17, griefPeriod 38. Syntax/ES5 checks and partner collision audit passed. Synthetic fixtures never entered Sheets.

## Bench result and recipe

SANDBOX 0908 sheet `1FFpUs98L0wrEcfAaQy6-Ir2xYiCq9baCc0SzqzAMrtM` is **C109**, deployment **@33**. Apps Script `1XcrDvYB89zaEQcXCK3oe4ir8e9fyTTj_uFAxZbEfzj2QzjsDdHC4CNvL`; web deployment `AKfycby-f9gv5sEOj6wURRFk-7H7oDNqUPShLt7KNWbhcYnQJ4e5F85EWWsaDP4Vu3ouFhWs`. Verify current DEPLOY.md pointers before new actions.

Recipe: PROD `c37d85ea` + `9189addf:v3Integration.js` + four hospital files from `3e6a8ea1` + three-file diagnostic overlay `output/codex/engine217-diag-overlay.patch`. Both repairs ran from C108. Partner pinned the actual created version and pulled it back; intended files matched and applyCityDynamics.js stayed byte-identical to PROD. @31 and @32 were superseded without firing. Diagnostics are bench-only.

| Evidence | C108 | C109 |
|---|---|---|
| Fire | ok:true, 206.354 s | ok:true, 130.292 s |
| Economy runs / modules | 1 / 5/5 | 1 / 5/5 |
| Money-loop prior mood | 59.01 | **48 = C108 final carry** |
| Phase-6 completion mood | 48.81 | 48.59 |
| Final persisted mood | 48 | 49 |
| Engine_Errors | 0 | 0 |
| Timing evidence | 133 reported; full list truncated | **133/133 ok**, full JSON parsed |
| Hospital state markers | 0 | 0 |

**Evidence gap:** C108's helper truncated the response at 3,000 characters. Full timing and carry-recovery diagnostics are lost; do not claim ghost-skip/recovery was directly observed. The copied C107 ring existed and C108 consumed mood 59.01. C109's corrected helper saved its full response; no carryForward events were emitted. fetchExecutionLog.js searches manually exported Drive files, not direct GAS logs. Never repeat a fire to recover output.

Yu Zen (POP-00194) and Maurice Franklin (POP-00801) became recovering at C108, active at C109. Incomes remained 111,666 / 230,000. Yu was too early for a new admission-key hit at C108; Franklin's blank EconomicProfileKey excludes Career's hospital loss. No matching persistent state formed: **hospital activation is unproven on this bench**. All 15 baseline CareerState POPIDs survived; 17 were present after each Cycle. These are sandbox results, not live canon changes.

Evidence in `output/codex/`: `bench-c108-fire-response.txt`, `bench-c108-prefire-carry.json`, `bench-c108-readback.json`, `bench-c109-fire-response.txt`, `bench-c109-readback.json`, `bench-readback-c108-c109.md`. Codex independently read typed config/carry/hospital/errors after each Cycle and asserted the full C109 JSON. Supporting temporary snapshots: `/tmp/codex-bench-c107-readback.json`, `/tmp/codex-bench-c108-readback.json`, `/tmp/codex-bench-c109-readback.json`.

## Next causal work

1. **Economic event classification:** C108 persisted FACTORY_CLOSURE, impact −20, source **"road closure decision"**. economicRippleEngine.js:533-534 classifies any closure/shut down as a factory closure; a local VM call of the actual detector reproduced that exact input. Trace the typed event source and propose a bounded classification repair with controls. Do not clamp mood or erase the signal.
2. **Prior mood versus Phase-6 initialization:** loadPreviousEvening.js:259-261 restores previousCycleState and ripples, not S.economicMood. economicRippleEngine.js:157 initializes the latter to 50; calculation starts at :660. Wealth explicitly reads previousCycleState.econMood at generationalWealthEngine.js:255-257. Thus 59.01→48.81 does not prove a −10 recurring calculation from carried mood. C108 persisted ripple strengths total −16.93; the real calculation with base 50, neutral retail and source calendar defaults gives 48.81. This numerical reproduction does not establish all transient runtime inputs. Decide intended city-mood carry before reconnecting it.
3. **Calendar mismatch:** calendar writes S.simMonth (advanceSimulationCalendar.js:209), economy reads S.month || 0 (economicRippleEngine.js:187); no engine assignment to S.month was found. Lowercase seasonal checks also meet persisted Winter. Verify normalization and thresholds in a bounded repair.
4. **engine.219, hood economic carry:** Phase 2 reads S.neighborhoodEconomies before Phase-6 production; finalize does not serialize it. Establish post-migration ranges, then bounded carry and next-Cycle behavior. diag217 did not instrument per-hood economies; no bench proof for them.
5. **engine.214, neighborhood truth source:** rejected embedded clusters/constants remain excluded. Use ADR 0015 World_Config tunables and ADR 0016 ledger entity truth; inspect existing roster/character/weather/adjacency/scene/profile accessors first.
6. **engine.220, media feedback duplicate:** audit intervening inputs before removing a call. engine.194 sports repricing belongs to the sports plan Task 7. These remain open.

Income evidence remains corrected: eight C107 jumps recompute to newly deployed job references, not arbitrary doubling. Real layoffs clear EmployerBizId, so the earlier immediate re-floor claim was rejected. Hospital persistence is a separate reproduced defect; owner draw interaction remains open.

## Resume and ownership

Check Git and current AGENTS. Mixed local commits remain unpushed; Codex must not push another lane's stack. Preserve unrelated runtime outputs and scripts/notebooklmCanonSources.json. Only engine-sheet applies substrate changes. Resolve its tmux pane live (last %71), confirm an idle empty prompt, send literal text, wait one second, then C-m. Dim suggested text is not user input; preserve ANSI when uncertain. Never submit unfinished user text.

Codex owns this handoff and NEXT[codex] only; Claude owns PIN and its own NEXT. No additional fires, live changes, push, memory writes or publication were authorized by bench acceptance.
