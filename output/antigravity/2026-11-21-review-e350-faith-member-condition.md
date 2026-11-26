# Adversarial Plan Review — `engine.350` Task 16: Faith Rows Reach the Congregation

**Reviewer:** agy (Antigravity) · **Date:** 2026-11-21 · **Brief:** [2026-11-21-rb-brief-agy-faith-member-condition.md](file:///root/GodWorld/docs/for-claude-review/2026-11-21-rb-brief-agy-faith-member-condition.md)  
**Target Plan:** [2026-11-16-every-saved-word-reaches-the-dials.md](file:///root/GodWorld/docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md#L930-L953) §Task 16 (commit `eac2cd06e` + on-disk line `953` correction; pre-cut, read-only on code).

## Verdict: SHIP-WITH-FIXES

The core cut (`member` flag + `congregation` str in `loadEventContentLedger.js` and `generateCitizensEvents.js` reading `Faith_Organizations.MembersList`) fits the existing DSL evaluator, phase ordering, and join pipeline cleanly. Before cutting code and updating the live `Event_Content_Ledger` rows, settle the `ActiveStatus` filter bug, per-pool balance check around `Foothill Baptist Tabernacle` (0 members), `LeaderPOPID` handling, and `downLinesEclPool.js` fixture sync below.

---

## Findings

### 1. MEDIUM — `processFaithJoins_` accepts `'inactive'` in `ActiveStatus`; Cut #2 must not inherit that bug (nor silently diverge)

- **Where:** [bondEngine.js:1037-1038](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1037-L1038), [migrationTrackingEngine.js:708](file:///root/GodWorld/phase05-citizens/migrationTrackingEngine.js#L708), [faithEventsEngine.js:120](file:///root/GodWorld/phase04-events/faithEventsEngine.js#L120), [buildContractSeeds.js:520](file:///root/GodWorld/phase07-evening-media/buildContractSeeds.js#L520)
- **Failure scenario:**
  - **Input:** A `Faith_Organizations` row with `ActiveStatus = 'inactive'`.
  - **Wrong output:** [`processFaithJoins_`](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1037-L1038) checks `if (actLc && actLc.indexOf('active') < 0) continue;`. Because `'inactive'.indexOf('active') === 2` (`>= 0`), inactive orgs **are treated as active** and still accept new joins, whereas [`processRelocations_`](file:///root/GodWorld/phase05-citizens/migrationTrackingEngine.js#L708) checks `!== 'active'` and [`contractSeedBackdropIndex_`](file:///root/GodWorld/phase07-evening-media/buildContractSeeds.js#L520) checks `/inactive|closed|defunct/i`.
  - If Cut #2 filters `memberOrgByPop` on strict `actLc === 'active'` while leaving `bondEngine.js:1038` as `indexOf('active') < 0`, citizens could join an `inactive` org in Phase 5 Bonds and never become eligible for `member` rows in Phase 5 CitizenEvents. Cut #2 should normalize `ActiveStatus` cleanly (`actLc === 'active'` or `!/inactive|closed|defunct/i.test(actLc)`) and align `bondEngine.js:1038` on the same rule.

---

### 2. MEDIUM — `MembersList` has no dead/traded/inactive/archived pruning, and `processFaithJoins_` keys `memberOf` without case/trim normalization

- **Where:** [bondEngine.js:1015-1020](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1015-L1020), [bondEngine.js:1033](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1033), [bondEngine.js:1044](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1044), [bondEngine.js:1079-1094](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1079-L1094), [bondEngine.js:2021-2045](file:///root/GodWorld/phase05-citizens/bondEngine.js#L2021-L2045), [generateCitizensEvents.js:2921](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L2921)
- **Mechanism & failure scenarios:**
  - **No exit pruning:** Across `phase*/`, `utilities/`, `lib/`, and `scripts/`, `processFaithJoins_` ([bondEngine.js:997-1100](file:///root/GodWorld/phase05-citizens/bondEngine.js#L997-L1100)) is the sole writer of `Faith_Organizations.MembersList`. Unlike heritage [`updateHeritage_`](file:///root/GodWorld/phase05-citizens/generationalWealthEngine.js#L3003), neither `processFaithJoins_`, death cascades, migration, nor archiving removes `deceased`, `traded`, `inactive`, or archived POPIDs from `MembersList`.
    - **Input → wrong output (drift on dead citizens):** `processFaithJoins_` ([bondEngine.js:1081-1092](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1081-L1092)) rolls `rng() < FAITH_DRIFT_CHANCE` (`0.003`) over stale entries every Cycle; if a `deceased` citizen still on `Simulation_Ledger` rolls drift, [`appendBondLifeLine_`](file:///root/GodWorld/phase05-citizens/bondEngine.js#L2021-L2045) writes a `[Faith-Drift]` line onto the dead row, marks `ctx.ledger.dirty = true`, and queues a `LifeHistory_Log` append.
    - **Generator scope note:** [`generateCitizensEvents_`](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L2921) skips `deceased`, `traded`, and `pending` before pool evaluation, so dead/traded members cannot draw `member` lines, **except** `status === 'inactive'` is not in `:2921` (`retired` intentionally stays). Meanwhile stale entries remain in `MembersList.length` (the plan's `17 members` count may include exited citizens unless filtered against live active rows).
  - **Normalization mismatch:** `processFaithJoins_` stores and checks `memberOf[String(fl[fm])]` (`:1019`) and `memberOf[ex.popId]` (`:1033, :1044`) without `.trim().toUpperCase()`, whereas `idxByPop` (`:1026, :1047`) and Cut #2's `memberOrgByPop` normalize to trimmed uppercase POPID. Any whitespace/lowercase entry in `MembersList` bypasses `!memberOf[ex.popId]`, allowing a citizen to join a second org while `memberOrgByPop` keeps whichever org row came last.

---

### 3. MEDIUM — Dropping row `166` (`congregation=Foothill Baptist Tabernacle`, 0 live members) can skew or unbalance `faith.attending` / `faith.volunteering` for non-Foothill members, and drifts `downLinesEclPool.js`

- **Where:** [generateCitizensEvents.js:66-106](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L66-L106), [generateCitizensEvents.js:3880](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3880), [downLinesEclPool.js:252-260](file:///root/GodWorld/scripts/downLinesEclPool.js#L252-L260), [downLinesEclPool.js:291](file:///root/GodWorld/scripts/downLinesEclPool.js#L291), [downLinesEclPool.test.js:27-33](file:///root/GodWorld/scripts/downLinesEclPool.test.js#L27-L33)
- **Failure scenario (pool balance — verify against live tab before Cut #3):**
  - [`balanceContentLedgerPoolWeights_`](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L90-L104) gives every eligible `PoolKey` (`faith.attending`, `faith.volunteering`) equal aggregate bucket mass regardless of how many rows inside that `PoolKey` matched `condScopes`.
  - Per the plan (`line 934`), `Foothill Baptist Tabernacle` has `0` members today, while `1155–1157` correspond to the 3 `PLACED` down rows in [downLinesEclPool.js:252-260](file:///root/GodWorld/scripts/downLinesEclPool.js#L252-L260) (1 down in `faith.attending`, 2 down in `faith.volunteering`).
  - **Input → wrong output:** Once row `166` switches to `congregation=Foothill Baptist Tabernacle`, all 17 current members lose row `166`. If row `166` is the only `up` row in its `PoolKey` (e.g., if `faith.attending` has only row `166` `up` and row `1155` `down`), that `PoolKey` becomes **100% down-sided** at a full `PoolKey` bucket share for all 17 members; even if other `up` rows exist in that pool, removing row `166` automatically increases the `down` row's fraction of the pool's bucket mass. Verify the per-`PoolKey` up/down counts for rows `166, 195, 238–243, 1155–1157` on the live tab before applying Cut #3.
- **Fixture drift ([downLinesEclPool.js:252-260](file:///root/GodWorld/scripts/downLinesEclPool.js#L252-L260)):**
  - `PLACED` in `scripts/downLinesEclPool.js` pins rows `1155–1157` (`faith.attending` and `faith.volunteering`) with `Conditions: 'band!=child'`, asserted literally by `validateRows()` (`:291`) and [downLinesEclPool.test.js:30](file:///root/GodWorld/scripts/downLinesEclPool.test.js#L30). Updating rows `1155–1157` on the live tab to `band!=child; member` leaves `downLinesEclPool.js` out of sync with the live sheet unless `PLACED` is updated in tandem (after `member` lands in `loadEventContentLedger.js`, because `downLinesEclPool.test.js:46-52` runs the real loader).

---

### 4. MEDIUM — `LeaderPOPID` is ignored by both Cut #2 (`memberOrgByPop`) and `processFaithJoins_`

- **Where:** [migrationTrackingEngine.js:702-733](file:///root/GodWorld/phase05-citizens/migrationTrackingEngine.js#L702-L733), [bondEngine.js:1031-1044](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1031-L1044), [buildFaithSlice.js:108-127](file:///root/GodWorld/scripts/buildFaithSlice.js#L108-L127)
- **Failure scenario:**
  - The plan notes (`line 949`): *"Leaders (`LeaderPOPID`) are not on `MembersList`; not counted as members here. Recorded, not decided."*
  - **Input → wrong output:** A Tier 1/2 church leader (`LeaderPOPID`) who is not listed on their church's `MembersList` (a) can never draw `member` or `congregation=<their own church>` rows, and (b) when they draw `faithPool_` (`source:faith`) in [`generateCitizensEvents_`](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L4063), [`processFaithJoins_`](file:///root/GodWorld/phase05-citizens/bondEngine.js#L1033) checks only `!memberOf[ex.popId]` — not `LeaderPOPID` — so a congregation's pastor can roll `0.08` and join a *different* congregation in the same neighborhood. Flagging for explicit builder decision before building Cut #2 (whether `LeaderPOPID` counts as belonging to their own org and/or is exempted from joining another).

---

### 5. LOW — Cut #2 `ctx.ss` / error guard, `congregation!=...` missing-data behavior, row `166` `band!=child`, and truth docs

- **Where:** [generateCitizensEvents.js:518](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L518), [:1469](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L1469), [:2748](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L2748), [:2956](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L2956), [ENGINE_STUB_MAP.md:1981](file:///root/GodWorld/docs/engine/ENGINE_STUB_MAP.md#L1981), [SHEETS_MANIFEST.md:50, 181](file:///root/GodWorld/docs/engine/SHEETS_MANIFEST.md#L50)
- **Details:**
  - **Throw/null safety (`generateCitizensEvents_`):** Test harnesses such as [contentLedgerCompose.test.js:91-101](file:///root/GodWorld/scripts/contentLedgerCompose.test.js#L91-L101) supply a mock `ctx.ss` returning `null` for `'Faith_Organizations'`, and plan Cut #2 calls for read failure or absent tab → empty map + logged. Wrap the `Faith_Organizations` read (`ctx.ss ? ctx.ss.getSheetByName('Faith_Organizations') : null`) and per-row `JSON.parse` in `try/catch` so a missing tab, missing column (`Organization` / `MembersList`), malformed JSON cell, or Sheets exception logs once and leaves `memberOrgByPop = {}`.
  - **Negation semantics on `congregation!=`:** Per [`evalContentConditions_`](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L1469), blank `""` fails *every* `str` operator (`=` and `!=`), just like [`employer!=`](file:///root/GodWorld/scripts/employerCondition.test.js#L34-L36). Thus `congregation!=Foo` matches members of *other* congregations, never non-members (desired fail-closed behavior, worth noting in authoring guidance).
  - **Row `166` `band!=child`:** Plan `line 941` replaces `hood=East Oakland` on row `166` with `congregation=Foothill Baptist Tabernacle`. Minors (`age < 18`) already skip `generateCitizensEvents_` at `:2956` and cannot join `MembersList` via `faithPool_`, so omitting `band!=child` would still block minors today, though keeping `band!=child; congregation=...` preserves explicit row intent.
  - **Truth docs:** Cut #5 correctly identifies [ENGINE_STUB_MAP.md:1981](file:///root/GodWorld/docs/engine/ENGINE_STUB_MAP.md#L1981) (`generateCitizensEvents_` `Sheets:` currently lacks `Faith_Organizations`) and [SHEETS_MANIFEST.md:50, 181](file:///root/GodWorld/docs/engine/SHEETS_MANIFEST.md#L50) (still describes `Faith_Organizations` as static / `bondEngine.js` only).

---

## Attack-by-Attack Verification Checklist

1. **Membership ([bondEngine.js:997-1100](file:///root/GodWorld/phase05-citizens/bondEngine.js#L997-L1100), [ensureFaithLedger.js:32-41, 369-379](file:///root/GodWorld/utilities/ensureFaithLedger.js#L32-L41)):**
   - Verified `processFaithJoins_` is the sole writer of `Faith_Organizations.MembersList`. `ensureFaithOrgsSchema_` only runs `requireTab_` (no overwrite), and `processFaithJoins_` auto-adds the `MembersList` header column once if missing (`:1009-1013`). See **Findings 1 & 2** for `ActiveStatus`, stale exited members, and key normalization.
2. **Phase order & `ctx.ss` ([godWorldEngine2.js:684, 694, 2405, 2415](file:///root/GodWorld/phase01-config/godWorldEngine2.js#L684-L694)):**
   - Verified both entry points call `Phase5-CitizenEvents` (`generateCitizensEvents_`) before `Phase5-Bonds` (`runBondEngine_` -> `processFaithJoins_`), establishing a clean 1-Cycle lag. No other entry point calls `generateCitizensEvents_` in engine code (`scripts/*` harnesses pass mock `ctx.ss`). See **Finding 5** for `ctx.ss` / `try/catch` requirements.
3. **DSL table & consumers ([loadEventContentLedger.js:70-186](file:///root/GodWorld/phase02-world-state/loadEventContentLedger.js#L70-L186), [generateCitizensEvents.js:1463-1534, 3548-3655](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L1463-L1534)):**
   - Verified `parseContentConditions_` (`flag` and `str` branches), `evalContentConditions_` (split `|` alternatives, case-insensitive exact match, fail-closed on empty/false), `contentSlotsFillable_` (reuses `evalContentConditions_`), `contentDialShare_` (ignores non-`soft` terms), `balanceContentLedgerPoolWeights_` (`:66-106`), and `draftContentRows.js:55` (eval-loads real loader) all support `member` and `congregation` with no extra code changes.
   - `scripts/undockedEclPool.engine.js` is a standalone reference note, unused at runtime. No test in `scripts/` pins an exhaustive `Object.keys(CONTENT_LEDGER_DSL_FIELDS)` list. See **Finding 3** for `scripts/downLinesEclPool.js` / `downLinesEclPool.test.js`.
4. **Reach, 40-draw cap, and `source:familyLife` ([generateCitizensEvents.js:752, 1222, 1273, 3633, 3843, 3853, 4012-4040](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L3633)):**
   - **40-draw row cap:** With 17 living members, `ATMOSPHERIC_MAX_EVENTS = 4` (`1..4` draws/citizen at `:3843`), and per-citizen within-cycle dedup (`cycleSeen` at `:3853, :4181`), any single row can draw at most once per member (`<= 17` draws/Cycle `< 40`), so `:3633` never throttles these rows.
   - **`source:familyLife` routing & folding:** Unchanged. `primaryFromTags` (`:1222`) falls through to `"Daily"`, [`nudgesForEvent_("Daily", 1, text)`](file:///root/GodWorld/utilities/citizenDialMap.js#L212) returns `{}` (`kindMovesNothing_` is `true`), so `:4028` resolves `gradedTagFor_("Daily", tags)` (`Daily-<Dial>-<Up|Down>-S`). Verified in `downLinesEclPool.test.js:77-85`.
   - See **Finding 3** for up/down balance per `PoolKey` when `Foothill Baptist Tabernacle` has 0 members.
5. **Join path ([generateCitizensEvents.js:2146-2172, 4063-4066](file:///root/GodWorld/phase05-citizens/generateCitizensEvents.js#L2146-L2172)):**
   - Verified clean. `faithPool_` generates hardcoded `source:faith` neighborhood entries outside `Event_Content_Ledger` and `condScopes`, and `S.faithExposures` triggers solely on `"source:faith"`, leaving non-member exposure and join probabilities untouched.
6. **Leaders (`LeaderPOPID`):**
   - Verified `LeaderPOPID` is read by `migrationTrackingEngine.js:706-733` and script/card builders, not `MembersList` or `processFaithJoins_`. See **Finding 4**.
7. **Relative rows (`ParentIds` / `ChildrenIds`):**
   - **Code writers verified:** Only [`createChildRow_`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L1223-L1248) (new sim births) and [`wireFamilyMatch_`](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L3122-L3157) / [`wireFamilyToDeceased_`](file:///root/GodWorld/phase05-citizens/processAdvancementIntake.js#L3233-L3244) (family lottery / household intake wiring) write `ParentIds` and `ChildrenIds`; `householdFormationEngine.js`, `generationalWealthEngine.js`, `educationCareerEngine.js`, `bondEngine.js`, and `lib/wakePerception.js` are readers.
   - **Plan status:** Note that on-disk [line 953](file:///root/GodWorld/docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md#L953) (`Task 16 correction`) has already withdrawn the relative-rows paragraph per builder ruling (`"an empty relational field is design"`, no `siblings` / `grandchildren` scope). The C116 snapshot counts cited in line `951` (`ChildrenIds` 62, `ParentIds` 58, named sibling 4, tracked grandchild 0, `NumChildren > 0` 510) were not independently checked against live Sheets under this read-only offline review.

---

## Baseline Checks Run (offline, read-only)

- `node scripts/contentLedgerLoader.test.js`: **33/33 passed**.
- `node scripts/employerCondition.test.js`: **26 assertions passed**.
- `node scripts/downLinesEclPool.test.js`: **387 assertions passed**.
- `node scripts/contentLedgerBalance.test.js`: **10/10 passed**.
- `node scripts/undockedEclPool.test.js`: **`undockedEclPool: ok`** (0 failed).
- `node scripts/contentLedgerCompose.test.js`: **98 passed, 0 failed**.
