---
title: engine.312 candidate 4826c757 diff gate 1
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/for-claude-review/2026-10-25-engine312-diff-gate-TASK.md
  - docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md
---

# engine.312 diff gate 1 — `4826c757`

**Final gate: HOLD.** Source and test inspection only; no tests, bench, Sheet, model, canon, or live run. The bench receipt is reserved for gate 2. The seven candidate files are clean in this checkout.

## 1. Code vs R2.1 — FIX

- **SHIP (a):** Phase 11 writes `Source = media-room` in the same batch as each usage row (`phase07-evening-media/mediaRoomIntake.js:336-354`); Phase 5 self-arms and reads the exact `Source` header (`phase05-citizens/processAdvancementIntake.js:398-413`). `paperFameDelta_` scores any named non-print source 0 using its own six-type allowlist (`phase07-evening-media/culturalLedger.js:103-123`), separate from `isEmergenceUsage_` (`phase05-citizens/processAdvancementIntake.js:268-277`). Blank Source retains the plan's stated historical trusted-sheet treatment, including its stated exception limit.
- **FIX (b):** The floor is applied to every active Famous citizen in the ladder (`phase05-citizens/processAdvancementIntake.js:1385-1418`), and pending creates read `floorPops` (`phase07-evening-media/culturalLedger.js:255-260`). But `ensureFamousOnCulturalLedger_` first calls `culturalFameOf_`, which accepts *any* POP-linked or name-matched row, including a dynasty/institution (`phase05-citizens/processAdvancementIntake.js:1289-1303,1305-1317`). With only such a row, `culturalFameMarkFloor_` finds no eligible personal target (`phase07-evening-media/culturalLedger.js:133-149,206-214`), while non-null `fame` prevents roster creation. That Famous citizen gets neither a personal row nor a 25 floor. Require the existence check to use the same non-institution target rule and test dynasty-only and foreign same-name rows.
- **SHIP (c–f), subject to the floor defect:** Existing and pending roster calls add no sighting, LastSeenCycle, or MediaCount; a later pending sighting updates those cells, and pending creates register both name and `pop:<POPID>` (`phase07-evening-media/culturalLedger.js:577-610,688-750`). FameFlush follows Famous at both runner entry points (`phase01-config/godWorldEngine2.js:741-744,2459-2462`). Derived score fields are labelled provisional (`phase07-evening-media/culturalLedger.js:560-570,664-675,752-766`). The candidate does not change the separate dynasty append; the runner places GenerationalWealth after Advancement (`phase01-config/godWorldEngine2.js:668-670`).

## 2. One writer and normal path — FIX

- **SHIP on a successful single pass:** Phase 5 adds each accepted row's signed delta before its Processed intent (`phase05-citizens/processAdvancementIntake.js:532-564`); decay and sightings add to the same row accumulator (`phase07-evening-media/culturalLedger.js:271-291,577-580,636-642`); `flushCulturalFame_` queues at most one FameScore cell intent per touched existing row, or edits the pending append (`phase07-evening-media/culturalLedger.js:221-260`). The deleted dim path and registrar no longer queue FameScore. The snapshot is taken at first touch and the registrar rereads committed sheet data (`phase07-evening-media/culturalLedger.js:151-168,392-395`); the candidate shows no intervening committed row reorder or FameScore writer. Later dynasty work is a separate append per the plan, not a personal FameScore update. This is a candidate-scope finding, not a full repository writer inventory.
- **FIX — lost credit on a read fault:** `culturalFameAccum_` installs an empty cached accumulator before its tab read and catches read failure (`phase07-evening-media/culturalLedger.js:153-168`). `culturalFameAddPaper_` then returns `false` as though no row existed (`:193-200`), while Phase 5 still queues Processed (`phase05-citizens/processAdvancementIntake.js:536-564`). A missing FameScore header similarly makes flush skip the cell (`phase07-evening-media/culturalLedger.js:229-240`). Fail the phase on unreadable or malformed Cultural_Ledger rather than converting unavailable state to zero/no-row.
- **FIX — flush fault remains a commit hazard:** FameFlush is wrapped by `safePhaseCall_`, which logs and continues on an exception (`phase01-config/godWorldEngine2.js:159-169,741-744,869`). Processed intents can therefore persist without a FameScore intent if flush throws. Repeated `flushCulturalFame_` calls also queue duplicate same-value cell intents; there is no flushed guard (`phase07-evening-media/culturalLedger.js:221-250`). The normal runner calls it once, so this is a failure/reentry gap, not evidence of double credit in the successful Cycle. Partial Phase-10 persistence remains the plan's separate receipt/reconciliation limit.

## 3. Tests — FIX

- **SHIP as focused source coverage:** The combined fixture uses the real citation pass, ladder, decay, registrar, and flush; its expected row totals would fail if an ordinary paper credit were skipped, an existing or pending floor missed, a roster counted as a sighting, or a media-room row scored (`scripts/sportsWeekCity.test.js:651-746,779-785`). Its source-order assertion would fail if the sole flush were folded into Famous (`:748-757`). The engine.313/315 checks now flush before asserting +1 (`:443-612`); the tier ladder checks the real accumulator floor and −2 (`scripts/tierLadderState.test.js:161-192`); the intake fixture checks a `media-room` Source in one block write (`scripts/mediaRoomIntake.test.js:99-113`).
- **FIX gaps:** No fixture calls flush twice or injects an accumulator read/header failure, and the Famous-throw fixture calls flush manually after catching a synthetic throw (`scripts/sportsWeekCity.test.js:748-757`). No fixture covers the dynasty-only/foreign same-name floor miss above. The combined fixture starts with a Source header, so it does not assert Phase 5's missing-Source self-arm (`:658,695-697`); the intake test covers only Source appended at column 13 (`scripts/mediaRoomIntake.test.js:108-113`). These tests are not evidence of Phase-10 atomicity or live behavior.

## 4. Manual path and operator row — FIX

- Direct flush writes existing FameScore cells under `ctx.manualRun` (`phase07-evening-media/culturalLedger.js:221-242`), matching the operator row (`docs/engine/SHEETS_MANIFEST.md:182`). But `runAdvancementIntakeManual` has no Phase 10 and only invokes the flush before writing the ledger (`phase05-citizens/processAdvancementIntake.js:203-235`), while a new roster row remains a queued append intent whose FameScore is merely edited in memory (`phase07-evening-media/culturalLedger.js:245-249,688-750`). Thus a manual pass can mark usage Processed directly (`phase05-citizens/processAdvancementIntake.js:117-123`) without persisting that new Cultural_Ledger row. The §9 operator row does not cover this case. Gate the manual entry point or commit/read back its pending append; do not call it equivalent to the Cycle path.

## 5. Scope and silent fallback — FIX

- The candidate diff is confined to the four engine files and three named tests; no unrelated production change was found in those hunks. The `typeof` fallbacks silently turn absent `paperFameDelta_` into zero (`phase05-citizens/processAdvancementIntake.js:411-414`), omit credit or floor when the accumulator helpers are absent (`:536-540,1309`), and let the manual path skip flush (`:231`). Those functions are required for this contract; fail loudly before marking Processed. `registerCulturalEntity_` is also optional at `:1311-1312`, so a Famous citizen can be left without a roster row.

**Gate 2 needs:** fixes and regression checks for the personal-row floor, fail-closed fame read/flush, and manual pending-create path; then the SANDBOX receipt and typed readback. None was run here.
