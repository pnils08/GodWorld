# Adversarial Diff Review — `engine.341`: Seed Deck Dead Paths

**Reviewer:** agy (Antigravity) · **Date:** 2026-11-21 · **Commit:** `b54210cb9`  
**Brief:** [2026-11-21-es-brief-agy-e341-seed-deck-dead-paths.md](file:///root/GodWorld/docs/for-claude-review/2026-11-21-es-brief-agy-e341-seed-deck-dead-paths.md)  
**Plan:** [2026-11-08-seed-deck-dead-readers-writers.md](file:///root/GodWorld/docs/plans/2026-11-08-seed-deck-dead-readers-writers.md)  
**Wiring card:** [agent_engine-wiring_2026-11-21T19-45-11.md](file:///root/GodWorld/output/agent_engine-wiring_2026-11-21T19-45-11.md) (`Story_Seed_Deck`, Haiku 4.5, in-session 2026-11-21)

## Verdict: HOLD

Two defects in `b54210cb9` need fixing before landing:
1. Widening `scripts/stubEngine.js:185` to match `queueBatchAppendIntent_` globally across a function body falsely adds `recordMediaLedger_` as a **writer** of `Cultural_Ledger` in `ENGINE_STUB_REVERSE.md` and `ENGINE_STUB_REVERSE.json`.
2. Updating `scripts/auditSheetHeaders.js` to v4.2 without updating `scripts/auditSheetHeaders.contract.test.js:87-95` breaks `auditSheetHeaders.contract.test.js` (`29 passed, 2 failed`, exit 1), and that test file was omitted from the test-unlock list.

---

## Findings

### 1. HIGH — `stubEngine.js` falsely marks `recordMediaLedger_` as a writer of `Cultural_Ledger`

- **Where:** [stubEngine.js:175-193](file:///root/GodWorld/scripts/stubEngine.js#L175-L193), [recordMediaLedger.js:47-97,177-184](file:///root/GodWorld/phase10-persistence/recordMediaLedger.js#L47-L97), [ENGINE_STUB_REVERSE.md:439](file:///root/GodWorld/docs/engine/ENGINE_STUB_REVERSE.md#L439), [ENGINE_STUB_REVERSE.json:282](file:///root/GodWorld/docs/engine/ENGINE_STUB_REVERSE.json#L282)
- **Mechanism & failure:**
  `stubEngine.js:180-192` iterates every string literal in `knownSheetHints` inside a function body and executes `sheetsWrite.add(name)` whenever `/queue(?:Cell|Append|Range|BatchAppend)Intent_/.test(body)` is true anywhere in `body` (`:185`), without checking which tab the intent call targets.
  - **Input:** `recordMediaLedger_(ctx)` reads `Cultural_Ledger` via `ctx.ss.getSheetByName('Cultural_Ledger')` (`recordMediaLedger.js:47`) and writes **only** `Media_Ledger` via `queueBatchAppendIntent_(ctx, 'Media_Ledger', ...)` (`:177`). `Cultural_Ledger` is in `knownSheetHints` (`stubEngine.js:171`).
  - **Wrong output:** Because `b54210cb9` added `BatchAppend` to `stubEngine.js:177` and `:185`, `stubEngine.js` now adds `phase10-persistence/recordMediaLedger.js::recordMediaLedger_` to `Cultural_Ledger.writers` in [ENGINE_STUB_REVERSE.json:282](file:///root/GodWorld/docs/engine/ENGINE_STUB_REVERSE.json#L282) and [ENGINE_STUB_REVERSE.md:439](file:///root/GodWorld/docs/engine/ENGINE_STUB_REVERSE.md#L439).
- **Note:** All other newly added writer edges in `b54210cb9` were checked and are genuine `queueBatchAppendIntent_` writers: `saveV3Seeds_` (`Story_Seed_Deck`), `saveV3Hooks_` (`Story_Hook_Deck`), `saveV3Textures_` (`Texture_Trigger_Log`), `recordMediaLedger_` (`Media_Ledger`), `recordWorldEvents25_` (`WorldEvents_Ledger`), `recordWorldEventsv3_` (`WorldEvents_V3_Ledger`), `batchRecordFaithEvents_` (`Faith_Ledger`), `batchRecordTransitMetrics_` (`Transit_Metrics`), plus `generateGenericCitizenMicroEvents_`, `generateCivicModeEvents_`, and `generateMediaModeEvents_` (`LifeHistory_Log`).
- **Fix:** Remove the whole-body `/queue...Intent_/.test(body)` branch at `stubEngine.js:185` (since `intentRe` at `:151-156` already extracts the exact target tab from every `queue*Intent_(ctx, '<Tab>', ...)` call, with `SHEET_CONSTS` already substituted at `:95-97`), or restrict `:185` to the same-tab `directWriteRe` check, then regenerate the maps.

---

### 2. HIGH — `scripts/auditSheetHeaders.contract.test.js` fails on `b54210cb9` and was omitted from the test-unlock list

- **Where:** [auditSheetHeaders.contract.test.js:87-95](file:///root/GodWorld/scripts/auditSheetHeaders.contract.test.js#L87-L95), [auditSheetHeaders.js:45-54](file:///root/GodWorld/scripts/auditSheetHeaders.js#L45-L54), [2026-11-08-seed-deck-dead-readers-writers.md:42,50](file:///root/GodWorld/docs/plans/2026-11-08-seed-deck-dead-readers-writers.md#L42)
- **Mechanism & failure:**
  `b54210cb9` updated `SCHEMAS['Story_Seed_Deck'].writerCols` in `scripts/auditSheetHeaders.js:49-52` from the 8 v3.4 columns (`Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText`) to the 18 v4.2 columns (`Cycle, SeedID, Desk, Class, ...`). `scripts/auditSheetHeaders.contract.test.js:87-95` (Test 6) still asserts `source.includes("'SeedType'")` and `source.includes("'SeedText'")` (and `'Timestamp'` / `'Priority'` only match unrelated tabs elsewhere in `auditSheetHeaders.js`).
  - **Input:** `node scripts/auditSheetHeaders.contract.test.js` (also run by `npm test` via `scripts/run-tests.js:54`).
  - **Wrong output:** Exits `1` (`29 passed, 2 failed, 4 skipped`: `FAIL Story_Seed_Deck writerCols includes 'SeedType'`, `FAIL Story_Seed_Deck writerCols includes 'SeedText'`). Both §Read-before item 6 and Task 3's test-unlock note missed this file, listing only `routePatternSeeds.decay.test.js` (crashes `MODULE_NOT_FOUND` on `require('./routePatternSeeds')`) and `validatePriorityEngine.contract.test.js` (crashes `ENOENT` on `scripts/validatePriorityEngine.js`).

---

### 3. LOW — `scripts/auditSheetHeaders.js:129-135` keeps `Handoff_Output` pinned to deleted `compileHandoff.js`

- **Where:** [auditSheetHeaders.js:129-135](file:///root/GodWorld/scripts/auditSheetHeaders.js#L129-L135), [auditSheetHeaders.contract.test.js:65](file:///root/GodWorld/scripts/auditSheetHeaders.contract.test.js#L65)
- **Mechanism & failure:**
  `SCHEMAS['Handoff_Output']` (`file: 'compileHandoff.js'`) was kept solely so `auditSheetHeaders.contract.test.js:65` would pass. Once `auditSheetHeaders.contract.test.js` is unlocked to fix Finding 2, `'Handoff_Output'` can be removed from both Test 3 and `auditSheetHeaders.js` rather than leaving a live audit entry pointing at a deleted file and absent tab (`NOT_FOUND` on live run).

---

## Attack Verification (1–5)

1. **Global-scope break (`compileHandoff.js` 38 top-level names):**
   Extracted all 38 top-level `function` declarations from `b54210cb9^:phase10-persistence/compileHandoff.js` and grepped `phase*/`, `utilities/`, `openclaw-skills/`, and `dashboard/src/` (including `.html` and `ScriptApp.newTrigger` / `google.script.run`). After removing `.addItem('Compile Handoff', 'compileHandoffFromMenu')` at [godWorldMenu.js:51](file:///root/GodWorld/utilities/godWorldMenu.js#L50), zero code callers remain; only historical comments at [applyStorySeeds.js:25](file:///root/GodWorld/phase07-evening-media/applyStorySeeds.js#L25) and [mediaRoomIntake.js:17](file:///root/GodWorld/phase07-evening-media/mediaRoomIntake.js#L17).
2. **Live Node callers (`citizen-signal-detector.js`, `routePatternSeeds.js`, `validatePriorityEngine.js`):**
   Verified across `crontab -l`, [ecosystem.config.js](file:///root/GodWorld/ecosystem.config.js), [package.json](file:///root/GodWorld/package.json), `.claude/skills/*`, `.claude/hooks/*`, `scripts/*.sh`, `dashboard/server.js`, and `dashboard/src/`. Zero scheduled jobs, PM2 apps, hooks, shell scripts, or `require()` callers invoke any of the three deleted scripts, except the two retired test files ([routePatternSeeds.decay.test.js:12](file:///root/GodWorld/scripts/engine-auditor/routePatternSeeds.decay.test.js#L12), [validatePriorityEngine.contract.test.js:22](file:///root/GodWorld/scripts/validatePriorityEngine.contract.test.js#L22)). Prose/comment mentions only in `.claude/skills/sift/SKILL.md:30,448`, `scripts/auditSheetHeaders.contract.test.js:90`, and `utilities/priorityEngine.js:284`.
3. **Map honesty (`stubEngine.js` & `ENGINE_STUB_REVERSE.md`):**
   False writer found on `Cultural_Ledger` (`recordMediaLedger_`) — see Finding 1. All seven newly named batch-append tabs (`Story_Seed_Deck`, `Story_Hook_Deck`, `Texture_Trigger_Log`, `Media_Ledger`, `WorldEvents_Ledger`, `WorldEvents_V3_Ledger`, `Faith_Ledger`, `Transit_Metrics`) and the 3 `LifeHistory_Log` additions are backed by literal/constant `queueBatchAppendIntent_` calls.
4. **Acceptance 2 (v3 deck column reads `SeedType`, `SeedText`, `Priority`, `Timestamp` on `Story_Seed_Deck`):**
   - **Missed by §Read-before item 6:** [auditSheetHeaders.contract.test.js:91-92](file:///root/GodWorld/scripts/auditSheetHeaders.contract.test.js#L91-L92) (Finding 2).
   - **Verified clean / dual-schema tolerant:** [auditSheetHeaders.js:49-52](file:///root/GodWorld/scripts/auditSheetHeaders.js#L49-L52) matches `saveV3Seeds.js` `SEED_DECK_HEADERS` (18 v4.2 cols); [diagnoseRoutingMatcher.js:74](file:///root/GodWorld/scripts/diagnoseRoutingMatcher.js#L74) uses `idxEither('SeedType', 'Class')`; `.claude/skills/sift/SKILL.md:159,451` specifies `What || SeedText` and `SuggestedJournalist || BylineCandidate`; [bylineEngine.js:631](file:///root/GodWorld/utilities/bylineEngine.js#L631) is an inline self-test fixture (`loadCycleCadence_` at `:260-285` reads `Cycle` + `BylineCandidate` / `SuggestedJournalist`); slice builders (`buildLivesSlice.js`, `buildArtsSlice.js`, `buildEconomicSlice.js`, `buildOaksBeatSlice.js`, `buildOaksGroundSlice.js`, `buildTransitSlice.js`, `beatSliceKit.js`, `draftContentRows.js`, `buildNeighborhoodTexture.js`, `checkBylineCadence.js`, `sportsSubstrate.js`) read no v3 columns off `Story_Seed_Deck` (`r.Priority` in `beatSliceKit.js` / `buildFaithSlice.js` / `buildSchoolsSlice.js` reads `Story_Hook_Deck`).
5. **§9 rows ([SHEETS_MANIFEST.md:198-199](file:///root/GodWorld/docs/engine/SHEETS_MANIFEST.md#L198-L199)):**
   - `migrateSeedDeckV4_` ([saveV3Seeds.js:63-89,138-145](file:///root/GodWorld/phase10-persistence/saveV3Seeds.js#L63-L89)): accurately classified `schema-setup`; `setValues` on P–R (`:74`) for v4.1, `setName` park (`:84`) for v3/v4.0, no-op on v4.2, row writes via `queueBatchAppendIntent_` in `saveV3Seeds_` (`:138`).
   - `utilities/cycleRollback.js` ([cycleRollback.js:18-243](file:///root/GodWorld/utilities/cycleRollback.js#L18-L243)): accurately classified `operator + rmd`; hardcoded `TARGET_CYCLE = 78` (`:19`), zero callers, Apps Script editor only, `deleteRow` (`:143`) on cycle-keyed tabs (`Cycle` hits col A on v4 `Story_Seed_Deck`, `GeneratedCycle` skips at `:127-129`), `Initiative_Tracker` `setValues` (`:193`), `World_Config` `cycleCount` `setValue` (`:235`), `revertCivicOfficeUpdates_` only logs (`:216`).
