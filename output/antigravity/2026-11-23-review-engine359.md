# Review — `engine.359` (`010156458`): births on the record

- **Brief:** `docs/for-claude-review/2026-11-23-es-brief-agy-engine359.md`
- **Plan:** `docs/plans/2026-11-23-births-on-the-record.md`
- **Commit reviewed:** `010156458` (`phase04-events/generationalEventsEngine.js`, `scripts/engineAuditor.js`, plus plan/index/rollout)
- **Verdict:** **SHIP**

No engine bug, double-count in dials/wake/scoreboard, or ordering defect found in `010156458`. Three non-blocking follow-up / downstream behavior notes are recorded below.

---

## 1. Downstream readers of `LifeHistory_Log` & `Simulation_Ledger.LifeHistory` (`Birth` + all `applyMilestone_` tags)

Tags written by `applyMilestone_` (`phase04-events/generationalEventsEngine.js:1810-1829`): `Birth`, `Death`, `Retirement`, `Health`, `Recovery`, `Graduation`, `Hospitalized`. Change in `010156458`:
- `Simulation_Ledger.LifeHistory` line stamp changes from `C<cycle>` to `inWorldStamp_(ctx)` (`Y<n>C<m>`, fallback `C<cycle>`).
- `LifeHistory_Log` intent fills `Name` (`name || ''`) and `Neighborhood` (`neighborhood || ''`) instead of `''`.
- `createChildRow_` (`:1232-1236`) queues a `LifeHistory_Log` `Birth` row (`[childStamp, childId, fullName, 'Birth', 'born to <parent> in <hood>', hood, cycle]`).

| Reader | Effect of `010156458` | Status |
|---|---|---|
| `utilities/compressLifeHistory.js:1029` (dial fold) | Reads `Simulation_Ledger.LifeHistory` only; regex `/^(?:Y(\d+))?C(\d+\|\?)\s*[—-]\s*\[([^\]]+)\]\s*(.*)$/` maps `Y3C13` and `C117` to identical cycle `117`. `createChildRow_` already wrote `Y<n>C<m> — [Birth] born to ...` to `Simulation_Ledger.LifeHistory`. | **No dial change** |
| `utilities/neighborhoodPulseMap.js` & grief (`triggerDeathCascade_` `:1663`, `foldGriefCascades_` `compressLifeHistory.js:1713`) | Driven by in-memory `recordPulse_` / `pendingCascades` + `MemoryRegisters`, never `LifeHistory_Log` or `applyMilestone_` text stamps. | **Unaffected** |
| `lib/wakePerception.js:58-79` (`loadLifeArc`), `:903` (`livedEventsFrom`), `:1176` (`collectOwed`) | `loadLifeArc` filters by `POPID`. `livedEventsFrom` matches `Birth` only on `/welcomed a new child/i`, ignoring newborn `"born to"` rows. `collectOwed` matches `[simTag(c), 'C' + c]` for `OWED_MILESTONES` (`Retirement`, `Question` at `:1084`). *(Pre-existing note: 3 of 4 parent descriptions at `:612`, `:1154-1156` do not contain `welcomed a new child` — unrelated to `010156458`.)* | **Safe** |
| `scripts/cron-saturday-run.js:1163` (`livedEventsGroundTruth`) | Explicit guard `if (/^Birth$/i.test(tag) && !/welcomed a new child/i.test(text)) continue;` keeps newborn's `born to` row off the parent's lived events. | **Safe** |
| `lib/discordLookups.js:136` & `lib/personaProvider.js:283` | Filter `Simulation_Ledger.LifeHistory` with `/^Y\d+C\d+ — /`. Previously dropped all `applyMilestone_` lines (`C<cycle>`); now surfaces `Birth`, `Death`, `Retirement`, `Health`, `Recovery`, `Graduation`, `Hospitalized` lines as intended. | **Fixed as intended** |
| `phase07-evening-media/buildContractSeeds.js:275-360` | Indexes `LifeHistory_Log` by `POPID` and `Neighborhood`; `applyMilestone_` events now carry `Neighborhood` so milestone events participate in neighborhood cycle seeds. | **Fixed as intended** |
| `scripts/engine-auditor/generateBaselineBriefs.js:245-315` | `STRUCTURAL_LIFE_TAGS` tracks `Retirement` from `LifeHistory_Log` by `EventTag` + `Cycle`; ignores `Birth`, `Death`, `Health`, `Recovery`, `Graduation`, `Hospitalized`. `Name`/`Neighborhood` now populated when read. | **Safe** |
| `scripts/buildCitizenWeekDigest.js:34, 193-196` | Scans `LifeHistory_Log` with `LIFE_EVENT_PATTERNS` (`/\[Birth\]\|was born\|new child\|baby/i`). Newborn's unbracketed `Birth` / `"born to ..."` text does not match; parent row matches on `"welcomed a new child"`. | **Unaffected** |
| `scripts/buildLivesSlice.js:176, 277-290, 343` | `momentPool` excludes `Birth`; `OWN_EVENT_TAG` drops `Birth` when `dropOwn: true`. Only `households` (`dropOwn: false`) on a single-mother household (`generationalEventsEngine.js:606-609`) can pull the newborn's `Birth` text into `threadFor`. | **Low / same as pre-`010156458`** |
| `scripts/buildWorldSummary.js:301-329` (`emitWhoLivedIt`) | **Note:** Groups `LifeHistory_Log` rows for `Cycle` by `EventTag` (`WHO_LIVED_IT_TAGS` includes `Birth`). One birth now writes 2 `Birth` rows (parent + newborn, both with `Name` and `Neighborhood`), so `emitWhoLivedIt` outputs `### Birth (2)` for 1 birth (mirroring `### Wedding (2)` for 1 marriage). Counts citizen rows rather than distinct births. | **Non-blocking awareness** |
| `world-view/build.js:29-45, 78` | `:30` filters `LifeHistory_Log` with `.filter(r => r.Neighborhood)`. Previously all `applyMilestone_` rows (`Neighborhood === ''`) were skipped; now all 7 milestone tags + the newborn's `Birth` row populate `byHood[hood].people` (a birth adds both parent and child entries). `:78` (`/^Y(\d+)C(\d+) — /`) now includes prior-cycle `applyMilestone_` lines in citizen `hist`. | **Expected / check `world-view` diff on first run** |

---

## 2. `createChildRow_` `queueAppendIntent_` ordering & double/orphan risk

- **Phase order (`phase01-config/godWorldEngine2.js`):**
  - `Phase5-Generational` runs `runGenerationalEngine_(ctx)` at `:746` (and in `runCyclePhases_` at `:2467`), strictly **before** `Phase10-CommitLedger` (`:957`) and `Phase10-ExecuteIntents` (`:967`, `runCyclePhases_` `:2666`).
- **Mutation vs intent order (`phase04-events/generationalEventsEngine.js`):**
  - Early-exit guard (`iPop < 0` at `:1185`) runs before creating `newRow`.
  - `rows.push(newRow)` (`:1227`) and `ctx.ledger.dirty = true` (`:1228`) run **before** `queueAppendIntent_(ctx, 'LifeHistory_Log', ...)` (`:1232-1236`). If `createChildRow_` returns early, no `LifeHistory_Log` intent is queued; if it queues the intent, `newRow` is already on `ctx.ledger.rows` and `ctx.ledger.dirty` is `true` for `commitSimulationLedger_`.
- **Single-call guarantee:** The two production callers in `runGenerationalEngine_` (`checkBirth_` married path at `:573-583`, and single-motherhood path at `:599-609`) are mutually exclusive on `row` (`marital === 'married'` vs `mar2 === 'single'`). No double-queue path.
- **Minor consistency observation (`:1224, :1234` vs `:1813`):** `createChildRow_` formats `childStamp` locally from `cycle` (`"Y" + (Math.floor((cycle - 1) / 52) + 1) + "C" + (((cycle - 1) % 52) + 1)`) while `applyMilestone_` calls `inWorldStamp_(ctx)`. Note that `phase10-persistence/persistenceExecutor.js:444-446` overwrites `LifeHistory_Log` col 0 with `inWorldStamp_(ctx)` at execution time anyway, so only `Simulation_Ledger.LifeHistory` depends on `childStamp === inWorldStamp_(ctx)` (true for any standard cycle, differs only if `S.cycleRef` is shifted).

---

## 3. `SCOREBOARD_TAGS.born` (`scripts/engineAuditor.js:189`)

```js
born: (t, text) => t === 'Birth' && /^born to\b/i.test(text)
```

- **Current lines:** `createChildRow_` (`generationalEventsEngine.js:1224-1226`) writes `Y<n>C<m> — [Birth] born to <parentName || parentId> in <hood>` on the child; `applyMilestone_` (`:1813`) writes `Y<n>C<m> — [Birth] <description>` on the parent. `buildCitizenScoreboard` (`engineAuditor.js:228-235`) splits `Simulation_Ledger.LifeHistory` on `\n`, matches `line.startsWith(stamp + ' ')`, and tests `SCOREBOARD_TAGS`. Only the child's line matches `/^born to\b/i` -> 1 count per birth.
- **Pre-`engine.359` lines:** Before `010156458`, `applyMilestone_` wrote bare `C<cycle>`, so `line.startsWith('Y<y>C<c> ')` at `engineAuditor.js:229` already skipped parent lines while matching `createChildRow_`'s `Y<y>C<c> — [Birth] born to ...` child line. Older `"Born into population"` text in `phase05-citizens/generateGenericCitizens.js:53` was already replaced with `"Arrived in Oakland"`. No active generator emits a `[Birth]` line with `Y<n>C<m>` that `/^born to\b/i` would miss.
- **Test coverage gap (non-blocking):** `scripts/engineAuditor.integration.test.js:323-356` (Test 12) asserts `married`, `promoted`, `soldHome`, `forcedSale`, and `boughtHome` in `buildCitizenScoreboard`, with **no `[Birth]` test case** exercising both parent and child `Y<n>C<m> — [Birth]` lines. Recommend adding a 2-row `[Birth]` fixture case (parent `"welcomed..."` + child `"born to..."` -> `counts.born === 1`) in a follow-up.

---

## 4. Checks run (after `010156458`)

- `node --check phase04-events/generationalEventsEngine.js scripts/engineAuditor.js` — **exit 0**
- `node scripts/engine302Marital.test.js` — **108 passed, 0 failed**
- `node scripts/engine339Births.test.js` — **6 passed, 0 failed**
- `node scripts/wakeOwedMilestone.test.js` — **10 checks passed**
- `node scripts/engineAuditor.integration.test.js` — **75 passed, 0 failed**
- `node lib/wakePerception.test.js` — **238 passed, 0 failed**
- `node scripts/cronSaturdayRun.test.js` — **166 passed, 0 failed**

---

## 5. Attached Wiring Card — `createChildRow_`

Generated via `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: createChildRow_"` (harness coverage: 127/127 engine phase files opened):

```text
WIRING CARD — createChildRow_ (function)   map: 2026-11-23 / 179 files

DEFINITION
  phase04-events/generationalEventsEngine.js:1177  function createChildRow_(ctx, parentRowIdx, cycle) — v2.7

PHASE POSITION
  production entry : Phase5-Generational @ godWorldEngine2.js:746  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase5-Generational @ godWorldEngine2.js:2467 — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (3)
  phase04-events/generationalEventsEngine.js:583   createChildRow_(ctx, r, cycle);
  phase04-events/generationalEventsEngine.js:609   createChildRow_(ctx, r, cycle);
  scripts/engine302Marital.test.js:66              G.createChildRow_(ctx, 0, 113);

S FIELDS
  (none accessed)

OTHER CTX
  ctx.ledger.headers @ :1180              READ
  ctx.ledger.rows @ :1181, 1227           READ / WRITE (push)
  ctx.ledger.dirty @ :1228                WRITE
  ctx._rng @ :1190                        READ
  ctx.ss @ :1262                          READ

WRITE PATH
  INTENT  queueAppendIntent_(ctx, 'LifeHistory_Log', […], 'generational birth (child)', 'events') @ :1233 → LifeHistory_Log
  DIRECT  hSheet.getRange(hr + 1, cMem + 1).setValue(JSON.stringify(mem)) @ :1275 → Household_Ledger
  DIRECT  hSheet.getRange(hr + 1, cType + 1).setValue("family") @ :1276 → Household_Ledger
  DIRECT  reg.getRange(rr + 1, childCols[cc] + 1).setValue(childId + " " + firstName + " " + lastName) @ :1291 → Family_Relationships
  (all BEFORE Phase10-ExecuteIntents per PHASE POSITION)
```
