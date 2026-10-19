---
title: engine.286 Task 6 implementation review — 6ac15e9f
created: 2026-10-09
updated: 2026-10-09
type: reference
tags: [engine, civic, citizens]
sources:
  - docs/for-claude-review/2026-10-09-codex-engine286-task6-impl-TASK.md
  - docs/for-claude-review/2026-10-09-codex-engine286-task6-civic-role.md
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md
  - commit 6ac15e9f2f28446227f40cca4d8d23eaba8cbebf
pointers:
  - "[[plans/2026-10-08-engine-286-game-of-life-events]]"
---

# Task 6 implementation review

**HOLD. Three P1 findings and two P2 findings; no P0 found.** The six graded tags, actual LifeHistory parser/fold, primary-only pulse, neutral/opposed draw handling, and ECL namespace exclusion work in the reviewed source. Config initialization does not cover the alternate runner, required ledger inputs can fail silently, and the business premise can produce an unsupported closure observation.

Target: **commit `6ac15e9f2f28446227f40cca4d8d23eaba8cbebf`**, reviewed against the earlier design review and the plan's T6-1 through T6-7 dispositions (`docs/plans/2026-10-08-engine-286-game-of-life-events.md:69–79`). Reviewed code matched this commit at working HEAD `9611b559`; inspected code paths were clean. The pre-existing shared tree was eight commits ahead with extensive output dirt. Only this requested report was written; no code, tests, plan, index, handoff, or external state was changed.

The dispositions are the implementation contract here: accepted shared-RNG movement and post-turnover cohort; pre-queue office Approval; no business-opening premise in v1; unconditioned, slot-free `civicRole.*` pools. Those accepted choices are not reopened below.

## Findings

### F1 — P1: runCyclePhases_ bypasses the new config initialization and can omit civic-role events

**Evidence:** The only call to `ensureEngine286Config_` is in `runWorldCycleLocked_`, before cache creation (`phase01-config/godWorldEngine2.js:503`, `:517`). `runDryRunCycle` and `replayCycle` build their own contexts and call `runCyclePhases_` (`:2093–2119`, `:2203–2229`). That function initializes the ledger and reads World_Config without calling the new ensure (`:2256–2265`), then invokes civic role (`:2359`). `civicRoleConfig_` throws for missing keys (`phase05-citizens/runCivicRoleEngine.js:110–119`). The normal phase wrapper catches the error and continues (`phase01-config/godWorldEngine2.js:159–168`).

**Reproduction:** Executed the real `runCyclePhases_`, real `loadConfig_`, and real civic-role engine in a VM with unrelated phases stubbed and a synthetic World_Config without the four new keys. Observed zero ensure calls, the error naming all four missing keys, and control reaching the next Maneuver phase with no civic-role event. This is a first-use failure on an unseeded bench/dry-run/replay path, not a claim that every live Cycle fails.

The bypass also skips the strict range/type validation in `inspectEngine94Config_` (`phase01-config/engine94SheetContract.js:651–655`). The local civic config reader accepts any Number-convertible, non-NaN value, including booleans, infinity and out-of-range odds (`phase05-citizens/runCivicRoleEngine.js:116–117`).

**Required correction:** Every entry that executes Phase 5 must establish the four-key validated config contract before its read, while preserving dry-run/replay external-write restrictions. A passing replay/dry-run must not silently exclude the new engine.

**Checkpoint qualification:** Resume is not another Phase-5 path. It restores `payload.config`, executes the saved persistence intents, and runs Phase 11 (`phase10-persistence/cycleCheckpoint.js:485–519`). The original payload includes config and pending writes (`:186–204`). It neither reruns civic role nor needs to seed these keys to finish an older checkpoint. Do not add fresh event generation or require new event keys merely to resume that saved tail.

### F2 — P1: missing ledger columns can silently suppress the event or claim one that never reaches the cell

**Evidence:** Column indices are obtained without a required-header check (`phase05-citizens/runCivicRoleEngine.js:226–235`). Missing Neighborhood becomes empty and skips the citizen; missing Tier becomes 4; missing Famous becomes false (`:251–255`). Blank/malformed Tier also falls through the aura lookup to zero Tier contribution (`:147–151`). The emitter writes unchecked LifeHistory/LastUpdated indices, logs the event and increments its counter (`:281–300`). The common ledger initializer only loads headers/rows; it does not validate these fields (`phase01-config/initSimulationLedger.js:37–53`).

**Reproduction:** Starting from one explicitly synthetic Active CIV row and otherwise valid config, removed one header and its cell at a time:

| Missing column | Actual result, without an error |
|---|---|
| Neighborhood | Zero events and zero RNG draws; the citizen disappears from the every-Cycle event pass. |
| Tier | One event, four draws, Tier-4 aura fallback. |
| Famous | One event, four draws, non-famous aura fallback. |
| LifeHistory | One log/counter event and four draws, but history is assigned to array property `-1`, not a Sheet column. The actual cell-to-dial path is lost. |
| LastUpdated | One event and four draws; array property `-1` receives the timestamp. |
| POPID | One event with an undefined log POPID. |

A nonempty off-map neighborhood is also accepted unchanged: the engine performs raw string lookups, and when none match, emits an everyday event (`:156–177`, `:251–259`). Missing hood state and a verified quiet hood are not distinguished. Synthetic off-map rows in the probes were accepted; this is not evidence that a live citizen currently has such a value.

**Required correction:** Validate the required header and row inputs before emitting/counting an event. Missing identity, history, hood, Tier or Famous must not silently become a different citizen state or a successful partial event. This is separate from deliberately excluding non-Active citizens.

### F3 — P1: negative business growth can narrate a closed storefront without a closure premise

**Evidence:** An actual closure and merely negative growth both collapse to `{key: 'business', lean: -1}` (`phase05-citizens/runCivicRoleEngine.js:158–163`). Both then draw from the same down pool, whose first line asserts a shuttered storefront (`:51–54`). The against-premise check cannot catch this: down agrees with either negative premise (`:276–278`).

**Reproduction:** Synthetic hood with `businessClosures: []`, `hoodBusinessMomentum[hood].growth = -3`, and forced draws `[0, 0.9, 0.2, 0]` emitted the shuttered-storefront line and a negative public pulse. No closure receipt was supplied. The branch establishes economic decline, not the closure fact asserted by that wording.

**Impact:** LifeHistory and its log can turn a weaker economic signal into a stronger world claim. This remains possible with the hardcoded fallback even if every ECL row is correctly authored.

**Required correction:** Every drawable rendering must be supported by the selected premise; decline alone must not admit closure-specific narration. No alternative event design or probability change is requested.

### F4 — P2: unavailable office schema is indistinguishable from a citizen having no office; whitespace Approval becomes zero

**Evidence:** `civicRoleApprovalByPop_` silently returns an empty map for no office Sheet, empty data, or missing PopId/Approval headers (`phase05-citizens/runCivicRoleEngine.js:124–136`). It rejects only the literal empty string/null/NaN case for Approval; whitespace passes `Number(...)` and becomes 0 (`:138–142`). The emitter then treats any absent lookup as an ordinary citizen without office Approval (`:256`).

**Reproduction:** Missing office Sheet and malformed office headers each produced a normal event without an error. A matching synthetic office row with Approval equal to a space produced lookup value 0. Nonfinite numeric input likewise is not rejected by this reader; the aura clamp converts infinity to maximum approval contribution (`:149`).

**Scope qualification:** A missing Civic_Office_Ledger is already fatal on the normal live startup because `ensureEngine94SheetContract_` checks it (`phase01-config/engine94SheetContract.js:730–740`). That reduces live exposure for the missing-Sheet case; it does not make this reader fail loudly on alternate paths or validate row values. The common civic header contract requires OfficeId, Status and Approval, not PopId (`:665–668`).

**Required correction:** Preserve T6-2's valid no-office-row behavior, but distinguish it from a missing/malformed source schema. Validate Approval before numeric conversion; blank/whitespace/malformed values must not masquerade as a measured zero or maximum.

### F5 — P2: the strict “no RNG fallback” hunt does not pass

**Evidence:** Civic role obtains RNG through `safeRand_(ctx)` (`phase05-citizens/runCivicRoleEngine.js:214`). That helper returns `ctx.rng` when present, but otherwise creates a fresh generator from `config.rngSeed` and the Cycle (`utilities/safeRand.js:28–35`). This is a pre-existing shared-helper behavior now used by the rewritten path, not a new Math.random branch.

**Reproduction:** Removed `ctx.rng`, supplied a numeric `config.rngSeed`, and instrumented the fallback generator factory. Civic role emitted an event using four fallback draws. Removing both RNG and seed threw, as expected.

**Impact:** The ordinary seeded engine path uses four shared draws correctly. The missing-RNG path can instead restart a local stream and continue, hiding the loss of the shared draw position. Thus “no Math.random” passes, but the task's literal “no fallback” requirement does not.

**Required correction:** Enforce the stated RNG contract at this entry, or explicitly reconcile the review requirement with the existing seeded-fallback contract. Do not report strict failure on missing `ctx.rng` while this branch remains reachable.

## Seven assigned hunts

| Hunt | Result | Evidence and limit |
|---|---|---|
| 1. Writes outside the event boundary | **PASS for the emitter on valid input; separate config write identified.** | Only row LifeHistory/LastUpdated, LifeHistory_Log append intent, pulse, eventsGenerated, ledger dirty and summary assignment occur at `phase05-citizens/runCivicRoleEngine.js:280–308`. Six grade probes compared every other synthetic row field and found it unchanged. No office, Approval, Status, money, job, household or bond write was added to this emitter. The commit separately adds a direct World_Config append of four missing keys (`phase01-config/engine94SheetContract.js:235–250`), executed at live startup; this is an actual external write outside the event-output list, not a log/pulse intent. The reviewed config contract describes it explicitly. No such real write was executed in this review. |
| 2. Exact graded cell tag reaches dial fold | **PASS.** | One tag variable forms the cell line and log category (`phase05-citizens/runCivicRoleEngine.js:273`, `:282–289`). All six emitted lines parsed with the exact tag via `parseLifeHistoryEntries_`/`parseHistoryLine_` (`utilities/compressLifeHistory.js:767–785`, `:818–830`) and folded through real `foldNewEntries_` (`:1617–1635`). The resulting per-dial movements matched the six exact DIAL_MAP entries (`utilities/citizenDialMap.js:46–51`), and the watermark advanced to the synthetic Cycle. F2 covers malformed headers. |
| 3. Config initialization on every entry | **FIX — F1.** | Live path is correctly ordered before cache/config reads. Alternate Phase-5 runner lacks initialization. Checkpoint resume only executes the saved tail and is not broken by the absent ensure. |
| 4. Four draws; no Math.random/fallback | **Four draws PASS; strict no-fallback FIX — F5.** | Premise, sign and band draws at `phase05-citizens/runCivicRoleEngine.js:260`, `:263`, `:270`; one wording draw at `:204`. Verified all six grades, neutral/opposed outcomes, hardcoded and ECL wording. No retries or Math.random call in the engine. Missing-data skips are F2, and helper fallback is F5. |
| 5. Against-premise branch, including lean 0 | **PASS.** | Exhausted lean -1/0/+1 × up/down. Opposed sign picks everyday wording and suppresses pulse. Lean 0 comes only from the everyday fallback (`:177`); `against` is false, text remains everyday, and everyday is absent from the public map (`:108`, `:276–296`). Thus either neutral sign is valid and pulse-free. |
| 6. Daily skip and source pairing | **PASS for the adopted v1 namespace contract.** | Loader whitelists `source:civicRole` (`phase02-world-state/loadEventContentLedger.js:50`); daily primary routing has its branch (`phase05-citizens/generateCitizensEvents.js:971`), and skips exact `civicRole.` pool prefixes before admission (`:2922–2925`). Civic role only reads the exact premise/direction key and rejects slot-bearing or conditioned lines (`phase05-citizens/runCivicRoleEngine.js:181–193`). ECL changes wording only, after sign/band selection. A source:civicRole row outside that namespace is not excluded by the prefix check; namespace correctness remains the authored contract, not a global source-based dedupe guarantee. |
| 7. Silent missing hood/Tier/Famous/office data | **FIX — F2/F4.** | Missing ledger fields silently skip or default; office-reader failure modes are conflated with valid no-office membership. Missing keys in config do throw, but F1's wrapper can continue the alternate run without civic-role output. |

## Disposition follow-through

- **T6-1/T6-2:** Both engine call sites moved after BusinessDynamics (`phase01-config/godWorldEngine2.js:641–642`, `:2358–2359`). Post-turnover CIV membership and pre-queue Sheet Approval are implemented as accepted. Heritage openings are not claimed as v1 input. F1/F3/F4 are implementation defects, not objections to that accepted ordering.
- **T6-3:** Public events call `recordPulse_(S, neighborhood, tag, null, '')` (`phase05-citizens/runCivicRoleEngine.js:294–296`), so text and secondary marker rules cannot alter the grade. Exact pulse entries exist (`utilities/neighborhoodPulseMap.js:32–37`); the existing dampened writer remains unchanged.
- **T6-4:** Legacy dial aliases remain; new tags work through the real fold. L grades join wake salience (`lib/wakePerception.js:374`) and baseline brief selection/hints (`scripts/engine-auditor/generateBaselineBriefs.js:49–50`, `:290`). Only L grades are added to the brief allowlist, and the old CivicRole entry is removed there. The salience algorithm still takes at most three recent salient lines (`lib/wakePerception.js:415`); membership protects against routine filler, not unlimited newer milestones.
- **T6-5/T6-6:** Office-status narration is removed; only Active CIV rows proceed (`phase05-citizens/runCivicRoleEngine.js:244–247`). There is one event per qualifying row per invocation, with no old LIMIT/chance gate. Namespace exclusion is implemented. This is not a new persistent per-Cycle replay receipt or a semantic cross-generator deduper; checkpoint resume does not re-enter this function. The v1 exclusions of conditions/slots are honored rather than silently evaluated incorrectly.
- **T6-7:** `S.civicRoleEvents` is removed. Event writes stay within the accepted boundary on valid inputs, with the separate startup config migration and malformed-input failures documented above.

## Validation

All validation was local; synthetic probes used explicitly non-canon placeholders in process memory and array-backed Sheet mocks. No fixture, scratch file, live read, live write, deployment, sandbox Cycle, or API-backed validation was created/run.

| Command | Result |
|---|---|
| `node scripts/contentLedgerLoader.test.js` | 33/33 passed |
| `node scripts/contentLedgerCompose.test.js` | 27 passed, 0 failed |
| `node utilities/neighborhoodPulseMap.test.js` | All checks passed |
| `node scripts/compressLifeHistory.dial.test.js` | 50 passed, 0 failed |
| `node scripts/engine94SheetContract.test.js` | 32/32 passed |
| `node scripts/cycleCheckpointWiring.test.js` | 94 passed, 0 failed |
| `node scripts/hoodBlindTexture.test.js` | 21 passed, 0 failed |

Additional in-memory probes exercised the real emitter, parser, mapper, fold, pulse, config ensure, and the selected alternate-runner seam described above. The real config ensure appended four rows once, verified them, and made no second append in its Sheet mock. No full Cycle was executed by these probes. The initial probe harness incorrectly indexed the parser's return object as an array; that harness error was corrected to `.entries` before the six-grade assertions passed.

The commit contains no new civic-role behavioral suite: its only changed test removes the old civic texture-pool case (`scripts/hoodBlindTexture.test.js:38–41` in the diff). Existing green suites therefore do not cover the reproduced failures. In particular, the checkpoint suite stubs the Cycle body (`scripts/cycleCheckpointWiring.test.js:6–12`), so its 94 passing assertions cannot certify the new initialization call.

**Final gate: HOLD `6ac15e9f` for F1–F3 and resolve F4–F5 before claiming the seven hunts clear.** Local baseline success and in-memory emitter proofs are not bench acceptance or production evidence.
