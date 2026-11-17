# Adversarial Review — Dials Build Plan (engine.347 / 349 / 350 / 351)

**Reviewed:** `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md` (§Rulings after the read, §Tasks 2–11, Order line, §Acceptance) against `output/research-build/2026-11-16-rb-brief-agy-dials-plan.md`.
**Reviewer:** Antigravity (agy lane, read-only).
**Verdict:** **HOLD**

Six findings block the **Task 2 + Task 6** first build cut and the **Task 3–5 / Task 11** follow-on before implementation starts:
1. Task 2's watermark claim (`C101`) is factually wrong (`C107`, verified across git snapshots) and would **double-fold 94 C102–C107 lines** across the 13 citizens if executed from §State; even `107` replays C108–C116 without inter-cycle `0.8` decay.
2. Adding `[Money]` or changing `Advancement` in `utilities/citizenDialMap.js` breaks live judicial holds (`[IncomeHit J100]`), existing pinned unit tests, and misses two sibling mint sentences (`checkForPromotions.js:479-481`, `generateGenericCitizens.js:729`).
3. Removing the `> 68.75` streak lock at `citizenMemory.js:209` alone leaves `compressLifeHistory.js:569` skipping quiet decay in `(0, 0.5)` unless both move together; removing the floor to `0` breaks S449's one-off expiry invariant.
4. `BAND_CUTS` (`[20, 40, 60, 80]`) is duplicated in **5 places** and `REFLECTION_MULT`/`REFLECTION_ACCRETION_FRAC` in **2 places** (`drainReflectionBacklog.js:35-36`); `loadConfig_` (`godWorldEngine2.js:959-960`) silently truncates comma-separated strings via `parseFloat()`, and strict throws inside Phase 9 get swallowed by `safePhaseCall_`.
5. `Dial_Moves` lands inside a post-checkpoint tail already at **61.9 s (`C115`) and 74.2 s (`C116`) vs `tailReserveMs = 60,000 ms`**, has no trimmer (`maintainLifeHistoryLog_`), and a Phase-9-only recorder misses Phase-4 chaos breaks, Phase-5 challenger mints, and out-of-cycle writers.
6. Order & acceptance break on Task 3 (`cron-desk-run.js:1529-1541` W1 `lastGradedLine` readback and Acceptance #1), Task 4 before Task 5 (feeding 5 new writers through the broken prompt/vocab), Task 5 failing `reflectionClassifier.test.js:86-90` (`AFFECT_TAGS.length === 9`), and Task 11 leaving the tab and blocking scope (`Intake` vs `Advancement_Intake1`) undefined.

---

## 1. Task 2 callers, `CONTENT_RULES` bleed, sign fixes, and the `> 68.75` streak lock

### 1.1 Every caller of `nudgesForEvent_` / `hasTag_` / `CONTENT_RULES` touched by Task 2
Any change to `DIAL_MAP`, `CONTENT_RULES`, or `nudgesForEvent_` in `utilities/citizenDialMap.js` alters outputs across all 13 production and script callers:
- **Apps Script cycle path:**
  - `phase05-citizens/generateCitizensEvents.js:1211-1212` (`kindMovesNothing_` uses `nudgesForEvent_` to filter inert lines)
  - `phase04-events/generateGameModeMicroEvents.js:524-525`
  - `phase05-citizens/generateMediaModeEvents.js:432-433`
  - `phase05-citizens/generateCivicModeEvents.js:472-473`
  - `utilities/citizenMemory.js:157` (`applyTaggedEvent_`)
  - `utilities/compressLifeHistory.js:1639,1656` (`foldNewEntries_`, `foldOneEntry_`)
  - `utilities/citizenDialMap.js:396-397` (`CONTENT_RULES` scan inside `nudgesForEvent_`), `:414,418` (`nudgesForReflection_`), `:426` (`hasTag_`)
- **Node scripts & perception modules:**
  - `lib/wakePerception.js:41` (`recentEventMagnitude` calls `nudgesForEvent_(m[1].trim(), 1, lines[i])`, age-damped `0.8^age`, directly altering citizen wake weights `1 + eventMag * 2`)
  - `lib/resonanceRecall.js:74` (`affectWeight` calls `nudgesForEvent_(String(affect), 1, '')`)
  - `scripts/backdateCitizenDials.js:67`, `scripts/seedTier1Essence.js:35`, `scripts/coverageReport.js:36`, `scripts/deadBranchScan.js:307` (the offender scan passes `citizenDialMap.js` as its resolver), and `scripts/_probe_classifier.js:116`.
- Note: `utilities/neighborhoodPulseMap.js:80-115` (`PULSE_CONTENT_RULES`) is a separate table; it does not call `nudgesForEvent_` or share `CONTENT_RULES`.

### 1.2 Hazards in `[Business]`, `[Money]`, and the mint sentence
1. **`[Money]` has deliberate zero-move callers and a pinned unit test (`HOLD`).**
   - `phase05-citizens/judicialLifecycle.js:444,490` writes `"[Money] 1 week held with no pay — savings covered it [IncomeHit J100]"` and `"more than the savings could hold, borrowed to cover it"`. `phase04-events/chaosCarsEngine.js:475` writes `"[Money] the ticket cost $"`.
   - `scripts/judicialLifecycle.test.js:671-673` **explicitly asserts**:
     `Object.keys(dialMap.nudgesForEvent_('Money', 1, lineText)).length === 0 && Object.keys(dialMap.nudgesForEvent_('Money', 1, shortText)).length === 0`.
   - Putting an unconditional `[Money]` delta in `DIAL_MAP` breaks `scripts/judicialLifecycle.test.js:671-673` (failure: `[Money] savings covered it` moves dials instead of returning `{}`). Even matching `CONTENT_RULES` by phrase must exempt `savings covered it` and `ticket cost` or distinguish `default` / `debt` / `cut` lines.
2. **`[Business]` carries both positive and negative outcomes plus free-text `bizName` (`HOLD`).**
   - `phase05-citizens/generationalWealthEngine.js:1198` emits `[Business] <bizName> paid its owner $... — the books raised the draw` AND `... — the books cut the draw`. `phase05-citizens/processAdvancementIntake.js:2693` emits `[Business] Took over <bizName> in <hood>`.
   - Giving `[Business]` a single static `DIAL_MAP` sign makes `cut the draw` (and `$0`) move the wrong way (`raised` vs `cut`); falling through `CONTENT_RULES` (`utilities/citizenDialMap.js:396-397`) re-exposes business names and neighborhood names (`<bizName> in <hood>`) to whole-line regex matches.
3. **The mint sentence (`processAdvancementIntake.js:1122`) breaks a pinned test AND misses two sibling mint sentences (`HOLD`).**
   - `scripts/citizenDials.test.js:238` **explicitly asserts**: `M.nudgesForEvent_('Advancement', 1, 'Intake at Tier 3. Synthetic note').drive === 6 && !M.STRUCTURAL.Advancement && !M.STRUCTURAL.Death`. A new tag or `Advancement` change fails `:238` unless that test is explicitly updated alongside it.
   - Two other arrival sentences live outside `processAdvancementIntake.js:1122`:
     - `phase05-citizens/checkForPromotions.js:479-481` (`"Arrived in " + neigh + " with the Cycle " + cycle + " migration wave..."` / `"The record catches up..."`)
     - `phase05-citizens/generateGenericCitizens.js:729` (`"Arrived in Oakland during Cycle " + cycle + ". Settled in " + neighborhood + ". " + worldContext`, where `worldContext` contains holiday/activity prose).
   - If Task 2 only strips or isolates the text path at `processAdvancementIntake.js:1122`, any `[Work]` / `[Career]` / `[Advancement]` line elsewhere carrying an employer name (`Hospital`, `Police`, `Court`, `Union`) still hits `CONTENT_RULES` at `utilities/citizenDialMap.js:396-397` unless unmapped `CONTENT_RULES` scanning is gated or removed for job/employer/arrival tags.
   - Other tests pinning current event outputs that must be checked/updated alongside Task 2: `scripts/pressureTags.test.js:98-99` (`Casino`), `scripts/engine299Graded.test.js:68,201`, `scripts/genericMicroVariety.test.js:30`, and `scripts/citizenReflectionWriteback.test.js` (`1-108`, pinning `Promotion`, `Community`, `Career-Transition`, `Critical`, `Divorce`, `Principled`, `Warm`, `Friction`, `Strain`, `Stumble`, `Spat`, `Setback`).

### 1.3 Sign fixes (`family:divorced`, `evening:crowd`, `evening:safety`, `Media` "hard light")
- `family:divorced` (`phase05-citizens/generateCitizensEvents.js:1185,3047`), `evening:crowd` (`:1174,1675,1678,1684`), and `evening:safety` (`:1176,1713,1715,1718`) appear nowhere else except a comment in `scripts/draftContentRows.js:266`. Nothing reads those kind tokens directly (`neighborhoodPulseMap.js` does not read `family:divorced` or `PrevEvening-*`); `gradedTagFor_` turns them into `Daily-<Dial>-<Up|Down>-S` and `PrevEvening-<Dial>-<Up|Down>-S`, so fixing their sign only reverses the `-Up-`/`-Down-` direction of those generated lines.
- `Media` `"Named in a hard light"` (`phase05-citizens/processAdvancementIntake.js:638-639` writes `[Media] Named in a hard light...`; log `:642` writes `'Media|hard-light'`) shares the `Media` key with `'Media': { sociability: 4 }` (`utilities/citizenDialMap.js:86`), which is also read by `phase05-citizens/generateMediaModeEvents.js:432`, positive/demotion `processAdvancementIntake.js:1573,1691` (`"The spotlight moved on"`), and `lib/reflectionClassifier.js:35` (`VOCAB` `'Media'`). Fixing `'Media'` globally in `DIAL_MAP` would flip all `[Media]` lines negative; emitting a negative graded tag or matching `"hard light"` specifically keeps regular coverage positive.

### 1.4 The `> 68.75` streak lock (`citizenMemory.js:87-153,205-211`)
- **Mechanism:** At `utilities/citizenMemory.js:209`, `settleCycle_` sets `if (Math.abs(c.mood[d]) < 0.5) c.mood[d] = 0;`. When `cur > 68.75`, `roomScaled_` (`:87-100`, `room / 50`) scales a `+1` push below `0.625`, so one `MOOD_DECAY = 0.8` (`:37`) makes `mood < 0.5` -> `0`, causing `applyCycleEffects_` (`:145-153`) to reset `c.streak[d] = 0` every Cycle before `HARDEN_STREAK = 3` (`:41`).
- **Smallest change vs failure modes (reproduced against `citizenMemory.js:87-153,205-211`):**
  - **Changing `0.5` to `0` (delete zero-floor):** Breaks S449's invariant (`citizenMemory.js:142-144`: two pushes separated by 20–30 quiet cycles would never hit `c.mood[d] === 0`, so one-offs would carry stale streak across decades).
  - **Lowering `0.5` to `0.05`:** Leaves a new snap wall at `~96.875` (at `base = 98`, `+1` scales to `0.04 * 0.8 = 0.032 < 0.05 -> 0`), stretches quiet expiry of a `1`-push from 4 cycles (`1 * 0.8^4 = 0.4096`) to 14 cycles (`1 * 0.8^14 = 0.044`), and breaks quiet drain in `utilities/compressLifeHistory.js:569` which gates `moodPending` on `>= 0.5` (`Math.abs(parsedDial.mood[md] || 0) >= 0.5`).
  - **Smallest change that preserves 4-cycle expiry everywhere:** Scale the settle zero-floor by pole room (`0.5 * (1 - Math.abs(c.base[d] - MIDPOINT) / 50)` at `citizenMemory.js:209`) **AND** match the `moodPending` check at `utilities/compressLifeHistory.js:569` so quiet citizens above `68.75` don't hold un-decayed mood across quiet Cycles.
- **What happens at `90+` when the lock is removed (`base` asymptotic, never pins at 100):**
  Reproduced in Node on `citizenMemory.js:87-153,205-211` with zero-floor disabled: because double room-scaling shrinks both `roomScaled_` (`(100 - cur) / 50`) on mood entry and `1 - |base - 50| / 50` at hardening (`applyEvent_:129-130`), sustained pushes asymptote below `100`:
  - `start = 90`, `+1`/cycle: 100 cycles -> `base = 91.505, cur = 91.946`; 1,000 cycles -> `base = 96.433, cur = 96.618`
  - `start = 95`, `+1`/cycle: 100 cycles -> `base = 95.406`; 1,000 cycles -> `base = 97.369`
  - `start = 99`, `+1`/cycle: 100 cycles -> `base = 99.017`; 1,000 cycles -> `base = 99.152`
  - `start = 99.9`, `+8`/cycle: 100 cycles -> `base = 99.901, cur = 99.933` (`< 100`).

---

## 2. The 13 stuck watermarks (`POP-01029`–`POP-01041`) — `HOLD` on plan wording

- **When they actually jumped (git history):**
  - `Y3C29` (= C133) was stamped into `LifeHistory` by `engine57_spouse_backfill.js` in **C101** (`113e78aab`), *before* `engine.177` (the watermark fold) existed.
  - At **C106** (`3766dbacf`, 2026-09-08), all 13 rows had `folded: undefined`.
  - **The watermark jumped to `133` at C107** (the first live fire of `engine.177`, `cab47c036`), verified against `s108` (`3d1a20fa8`) where `mood / 0.8` matches the exact sum of all stamped `<= C107` lines plus `Y3C29` decayed by one `settleCycle_`, while C108 lines (`POP-01031`, `01033`, `01034`, `01036`, `01038`, `01039`, `01041`) remained unfolded.
- **Why `plan:49` + `plan:142` cause a double-fold:**
  - `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md:49` claims *"no line of theirs has folded since C101"*. Setting `folded = 101` per `:49` / `:142` ("set back to the Cycle they jumped at") **double-folds 94 surviving C102–C107 lines** across the 13 rows (`3–12` lines per citizen, including `104[Money]` `-6/+2`, `104[Work] +4`, `104[Media] +4`, `106[Maneuver-Retreat]`, `107[Friction]`, `107[Media]`).
- **What `compressLifeHistory.js:654,713` trim already did:**
  - `11 of 13` rows were already trimmed past `Y3C29` (`POP-01030` and `POP-01035` were `Updated:c112` with `18`/`20` raw entries and were skipped in C116 because `116 - 112 < MIN_CYCLES_BETWEEN_COMPRESS (5)`, so those 2 still carry `Y3C29` at the top until C117).
  - **Zero** C108–C116 lines (`trimmed_after_107 === 0` across all 13 rows) were trimmed into `[Compressed: ...]`; only `<= 106` lines and `Y3C29` were trimmed on the 11 compressed rows.
- **Caveat even with `folded = 107`:** Setting `folded = 107` skips no C108–C116 lines and double-folds nothing, **but** `foldNewEntries_` (`utilities/compressLifeHistory.js:1644-1648`) replays all unfolded cycles (`C108..C117`) back-to-back in a single Phase-9 fold **without calling `settleCycle_` (`× 0.8`) between cycles**, artificially concentrating mood and triggering `HARDEN_STREAK = 3` cleanly across years of separated events (additionally, `POP-01030`, `01036`, `01039`, `01041` already received C108–C116 reflection drains and `POP-01031` already wore/regained integrity). Either repair the 13 rows cleanly with per-cycle `settleCycle_` or accept and document the C108–C116 streak compression.

---

## 3. Task 6 — Speed keys & `World_Config` validation

### 3.1 Constants, read sites, and Node/engine duplications
To let the builder change dial speed from `World_Config` without a deploy, all of the following must become config-driven (and every duplicated site reads the same source or drifts silently):

| Constant | Today's value | Engine home | Duplicated / pinned outside engine |
|---|---|---|---|
| `BAND_DELTA` (`S / M / L`) | `1 / 2 / 4` | `utilities/citizenDialMap.js:318` | Pinned `scripts/citizenDials.test.js:230` |
| `MOOD_DECAY` | `0.8` | `utilities/citizenMemory.js:37` | Hardcoded in `lib/wakePerception.js`? (`0.8^age` for recency decay); `citizenMemory.js:209` `0.5` floor paired with `compressLifeHistory.js:569` `>= 0.5` |
| `MOOD_DECAY_BY_DIAL.fandom` | `0.9` | `utilities/citizenMemory.js:40` | — |
| `HARDEN_STREAK` | `3` | `utilities/citizenMemory.js:41` | Tested in `scripts/citizenDialMultiCycle.test.js` / `scripts/citizenDials.test.js` |
| `HARDEN_FRACTION` | `0.4` | `utilities/citizenMemory.js:42` | Tested in `scripts/citizenDialMultiCycle.test.js` / `scripts/citizenDials.test.js` |
| `BAND_CUTS` | `[20, 40, 60, 80]` | `utilities/citizenMemory.js:56` | **Duplicated in 4 more code files:** `lib/citizenDials.js:16-18` (`bandIdx`), `phase05-citizens/bondEngine.js:2098`, `phase05-citizens/updateCivicApprovalRatings.js:1459-1467` (`dialBandIndexFromValue_`), `scripts/citizenDialMultiCycle.test.js:82` (plus `_probe_voice_grounded.js:21`, `_probe_voice_openrouter.js:19`) — `lib/citizenDials.js` feeds 9+ wake/voice scripts (`citizen-wake.js`, `citizenVoice.js`, `citizen-exchange.js`, `cron-work-wake.js`, `workerWake.js`, `reporterIdentity.js`, `refreshVoiceDispositionCache.js`, `lib/wakePerception.js:88`, `scripts/seedTier1Essence.js`, `scripts/seedTier1EssenceLive.js:172`)! |
| `BAND_MULT` | `[0.5, 0.75, 1.0, 1.25, 1.5]` | `utilities/citizenMemory.js:57` | — |
| `REFLECTION_MULT` | `0.45` | `utilities/compressLifeHistory.js:126` | **Duplicated directly in** `scripts/drainReflectionBacklog.js:35` (`const MULT = clh.REFLECTION_MULT`) + pinned in `scripts/compressLifeHistory.dial.test.js:227`, `scripts/citizenDials.test.js:181` |
| `REFLECTION_ACCRETION_FRAC` | `0.5` | `utilities/compressLifeHistory.js:127` | Read in `scripts/drainReflectionBacklog.js:36` + pinned in `scripts/compressLifeHistory.dial.test.js:227`, `scripts/citizenDials.test.js:181` |

Note also: `scripts/backdateCitizenDials.js:67` reads `citizenDialMap.js` / `citizenMemory.js`; changing `World_Config` without loading `World_Config` inside `scripts/drainReflectionBacklog.js` and `lib/citizenDials.js` splits Apps Script speeds from Node-side cron wakes and manual reflection drains.

### 3.2 `loadConfig_` and `ensureEngine*Config_` validation traps (`HOLD`)
1. **`parseFloat` truncates list keys silently (`godWorldEngine2.js:959-960`):** `loadConfig_` converts any non-numeric cell with `parseFloat(val)`. If `BAND_CUTS` or `BAND_MULT` were stored as a comma-separated string (`"20,40,60,80"`), `loadConfig_` would silently turn it into **`20`** (`!isNaN(20)`). Array constants must be stored as individual scalar numeric keys (`dialBandCut1`..`4`, etc.) or parsed directly from the sheet (`godWorldEngine2.js:244`).
2. **`ensureEngine*Config_` does not run in dry-run/replay (`godWorldEngine2.js:512-527` vs `:2112-2265`):** `ensureEngine*Config_(ss)` runs inside `runWorldCycleLocked_` (`godWorldEngine2.js:512-527`) using `inspectEngine94Config_` (`phase01-config/engine94SheetContract.js:665-718`, hard-throw on missing/duplicate/non-finite/out-of-range). It does **not** run in `runDryRunCycle` (`:2112-2177`) or `replayCycle` (`:2217-2265`), where `ctx.config` starts `{}` and loads only existing sheet rows via `loadConfig_`.
3. **Precedent choice inside Phase 9 (`safePhaseCall_` trap):** `Phase9-CompressLifeHistory` runs inside `safePhaseCall_` (`godWorldEngine2.js:836`). If dial/memory consumers use the **strict throw** precedent (`griefConfigNumber_` at `compressLifeHistory.js:88-98` or `pressureBar_` at `citizenDialMap.js:481-485`), any missing key in dry-run/unit fixtures or a bad edit causes `safePhaseCall_` to swallow the error and **commit the Cycle with every citizen's dial fold skipped**. Consumers must follow the **`integrityWearRate` precedent** (`utilities/compressLifeHistory.js:465-484` — validate strictly pre-cycle via `ensureEngine*Config_` at `:512-527`, and on the Phase-9 path log to `Engine_Errors` and fall back instead of throwing inside `safePhaseCall_`).

---

## 4. Task 6 — `Dial_Moves` tab & Phase 10 tail timing (`HOLD`)

1. **The Apps Script commit tail already exceeds `tailReserveMs` (`60,000 ms`):**
   Live timings observed in `output/execution_log_c114.txt`, `c115.txt`, `c116.txt`:
   - `C114`: `Phase9-CompressLifeHistory` `727 ms`; post-checkpoint tail (`Phase10-ExecuteIntents` `16,489` + `Phase11-MediaIntake` `1,448` + `BusinessArchive` `1` + `CitizenArchive` `2,599` + `MaintainLifeHistoryLog` `17,611`) = **38,148 ms**.
   - `C115`: `Phase9-CompressLifeHistory` `1,018 ms`; post-checkpoint tail (`23,099 + 1,994 + 0 + 2,616 + 34,176`) = **61,885 ms (61.9 s)**.
   - `C116`: `Phase9-CompressLifeHistory` `1,061 ms`; post-checkpoint tail (`25,502 + 2,429 + 1 + 2,226 + 44,091`) = **74,249 ms (74.2 s)**.
   `tailReserveMs` is seeded at **`60,000 ms`** (`phase01-config/engine94SheetContract.js:380`, `phase10-persistence/cycleCheckpoint.js:289`) inside `wallBudgetMs = 330,000 ms` (`:379`). C115 and C116 already crossed that reserve.
2. **Write cost & unbounded growth:**
   - **Batched vs row-wise:** In `phase10-persistence/persistenceExecutor.js:414-465`, a single `queueBatchAppendIntent_` (`utilities/writeIntents.js:174-189`) puts all rows into one `'append'` intent executed as a single `sheet.getRange(...).setValues(paddedRows)` (`:455-458`). Up to ~1,000 rows in one batched append adds one Sheets API call; queueing 1 intent per citizen/dial would add hundreds of round-trips and breach the 360 s Apps Script wall.
   - **Missing tab failure:** `executeSheetIntents_` (`:356-360`) throws if `Dial_Moves` does not exist on live or sandbox unless pre-created or queued via `queueEnsureIntent_` (priority 25, `persistenceExecutor.js:99-112`).
   - **No trimmer:** `LifeHistory_Log` already forced `maintainLifeHistoryLog_` (`utilities/archiveLifeHistory.js:76-84`, now the slowest phase at `34–44 s`) to stay bounded. Without a retention cap (`KEEP_CYCLES`) or summary shape, appending up to ~1,000 rows/Cycle adds ~52,000 rows/year (`~260,000` cells/year) unchecked.
   - **Cheapest shape:** One row per **citizen per Cycle that moved** (NOT one row per dial per citizen, which multiplies rows by up to 9×) — compact `[Cycle, POPID, MovesJSON/Text, Sources]`, written via a single `queueBatchAppendIntent_`. (Note `plan:146` says `"one row per citizen per Cycle that moved (dial, from, to, what moved it)"` — singular `"dial"` leaves ambiguous whether multi-dial movers get 1 row or N rows).
3. **Queue cutoff (`Phase10-ExecuteIntents` at `godWorldEngine2.js:895`):**
   `checkpointGate_` (`:891`) and `Phase10-ExecuteIntents` (`:895`) run *before* Phase 11 (`:905-906`). Any intent queued in Phase 11 is never executed. `Dial_Moves` must be queued by Phase 9 (before `:891`).
4. **Direct-to-base paths a Phase-9 recorder misses:**
   A recorder living solely inside `compressLifeHistory_` (`Phase9-CompressLifeHistory`) misses or cannot attribute "what moved it" for:
   - **Phase 4 chaos break:** `applyChaosReaction_` (`phase04-events/chaosCarsEngine.js:503`, `utilities/citizenMemory.js:333-345`) mutates `c.base.composure` and `c.base.openness` directly during Phase 4. By Phase 9, `DialState` already holds the post-chaos `base`.
   - **Phase 5 challenger mints:** `mintChallengerOnLedger_` (`phase05-citizens/updateCivicApprovalRatings.js:1504-1515,1619`) creates citizens directly with non-50 `DialState` (`compressLifeHistory_` only folds existing cells; it sees no move from `50`).
   - **Integrity wear:** `applyIntegrityWear_` (`utilities/compressLifeHistory.js:616`) runs inside `compressLifeHistory_`, so Phase 9 only sees it if explicitly instrumented alongside fold and reflection drain.
   - **Out-of-cycle writers:** `scripts/drainReflectionBacklog.js --commit`, `scripts/backdateCitizenDials.js`, and `scripts/seedTier1EssenceLive.js` write `DialState` straight to `Simulation_Ledger` outside any Cycle run.

---

## 5. Order and acceptance checks

### 5.1 Weakest sequencing choices (`docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md:153`)
1. **Task 4 before Task 5:** Task 4 wires 5 new cron writers (office, seat, worker, Mara, Varek) to `Reflection_Intake` before Task 5 adds the ordinary-bad tags and removes `"reflection on their day"` from `buildPrompt_` / `buildDualPrompt_` / `buildTriplePrompt_` (`lib/reflectionClassifier.js:110,232,290`). Every row generated between Task 4 and Task 5 hits the broken classifier and feeds skewed classifications into Phase 9. **Task 5 must land with or before Task 4.**
2. **Task 2 + Task 6 bundled into one deploy (`plan:153`) vs Acceptance #4 (`plan:160`):** Task 2 changes movement (watermark unlock, `68.75` lock lift, `[Money]`, `[Business]`, `Advancement`), while Acceptance #4 defines Task 6 as *"no change in behaviour at deploy"* / *"same DialState, cell for cell, as the same fire without them"*. Bundling them in one bench run means the post-deploy bench run CANNOT be byte-identical to pre-Task-2; Task 6's cell-for-cell check only tests Task 6 against a post-Task-2 baseline (or requires running Task 6's before/after pair on identical commits).
3. **Tasks 7–8 before/without re-checking Task 2's `[Money]`/`[Business]` rules:** Task 2 touches `[Business]` and `[Money]` specifically, then Task 7 immediately reworks all fixed-positive kinds (`Work`, `Career`, `Education`, `Lifestyle`, `Media`) and unsigned lines. Writing throwaway phrase rules for `[Business]`/`[Money]` in Task 2 risks re-doing them in Task 7.

### 5.2 Acceptance lines that fail or cannot be measured as written (`plan:157-162`)
- **Acceptance #1 (`plan:157`) contradicts Task 3:** States *"Every page write by a cron has a matching Reflection_Intake row the same day"*. After Task 3, `scripts/cron-desk-run.js:3467` (via `scripts/citizenVoice.js:241-253`) still writes a reporter grade **page doc** (`--page-key=graded-<personaSlug>`) without writing a `Reflection_Intake` row, and `scripts/citizen-exchange.js:16-17` writes no reflection row for journalists. Acceptance #1 must explicitly scope to citizen wakes/exchanges/printed-reporter milestones, not W4 grade page writes.
- **Acceptance #4 (`plan:160`):**
  - *"bench fire with the keys seeded = the same DialState, cell for cell, as the same fire without them"*: Determinism relies on `initializeSeededRng_` (`utilities/cycleModes.js:186-204`, `seed = cycleId`), which holds **only** if both bench fires execute the exact same `cycleId` (`World_Config.cycleCount` reset between runs) and run through `runWorldCycleLocked_` (`godWorldEngine2.js:512-527`), because `runDryRunCycle` (`:2112-2177`) skips `ensureEngine*Config_` and runs on unseeded config fallback if keys weren't already on the sheet. Even a 1-Cycle shift (`N` vs `N+1`) changes `ctx.rng` and breaks cell-for-cell equality.
  - *"Dial_Moves rows sum to the measured movement"*: Fails on first run for Phase-4 `applyChaosReaction_` and Phase-5 `mintChallengerOnLedger_` unless Phase-9 compares against pre-Cycle `DialState` or those writers also log to `Dial_Moves` before `Phase10-ExecuteIntents`.
- **Acceptance #5 (`plan:161`):** *"about 1 citizen in 3 crosses a band; some citizens sit in a low band on every dial; nobody pinned at 0 or 100"* — `"some citizens"` has no count/threshold, and starting from the live population (`median ~50+`, at slowed `HARDEN_FRACTION = 0.25`) over only **10 Cycles** may not push existing mid-band citizens below `20` (`< 20`) on **all 9 dials simultaneously** without fresh low-seed Task 11 arrivals (which Task 11 schedules *"on its own"*).

---

## 6. Tasks 3–5 (cron side) and Task 11 (intake)

### 6.1 Tasks 3–5 (`plan:143-145`)
- **Removing `graded:` rows breaks W1 readback if done by cutting the `--record-text=graded:` call (`HOLD`):**
  - `scripts/cron-desk-run.js:1529-1546,2170-2179,3462-3526` and `scripts/cronFeedback.js:98-107,188-193`: Neither `reward-loop-c<cycle>.jsonl` nor `.wake.json` reads `Reflection_Intake` (they take `contractScore` directly from `cron-desk-run.js`). **However**, W1's `lastGradedLine` (`cron-desk-run.js:1529-1541,2179`) reads the reporter's Supermemory page doc written by `citizenVoice.js:241-253` (`--page-key=graded-<personaSlug>` at `cron-desk-run.js:3467-3469`). Task 3 cannot simply remove the call from `cron-desk-run.js:3467` — `citizenVoice.js:241-291` must retain the Supermemory page write (Step 1) and skip only Step 4 (`Reflection_Intake` append at `:283-288`).
  - Meanwhile, `scripts/cron-saturday-run.js:495-550` must ensure `"my article was selected to run in the Cycle Pulse"` writes one row per unique printed reporter per Cycle.
- **Other readers of `Reflection_Intake` affected by stopping `graded:` rows:**
  - `scripts/citizen-signal-detector.js:54-75`: `normAffect` tallies every row carrying one of the 9 `AFFECT_TAGS`. Dropping ~38 reporter `Calm`/`Content` rows/Cycle lowers `winTotal` and shifts the citywide positive-affect baseline immediately.
  - `scripts/buildCitizenWeekDigest.js`: `:309` already filters `!/^(filed|graded):/i.test(rf.full)` for the daily JSON list, **but** `:219-235` (`byCitizen` vignette scorer) and `:277` (`> ${rf.text}`) still read `graded:`/`filed:` rows until Task 3 removes them from the sheet.
  - `scripts/civicPetitions.js:121-137` and `scripts/buildCivicOfficeSlice.js:1047-1068`: both filter `key(row.Tag) !== 'civic'` (`buildCivicOfficeSlice.js:26` further restricts `NEGATIVE_AFFECTS` to 5 tags), so only occasional misclassified `Civic`-tagged grades drop.
- **Classifier tests & consumers broken by Task 5 (`HOLD` until tests updated):**
  - `lib/reflectionClassifier.test.js:49-56` (Test 3) asserts every tag in `rc.VOCAB` is an exact non-structural key in `DIAL_MAP`. Every new ordinary-bad event tag added to `VOCAB` must already match a `DIAL_MAP` key verbatim.
  - `lib/reflectionClassifier.test.js:86-90` (Test 6) **hardcodes `rc.AFFECT_TAGS.length === 9`** (`AFFECT_TAGS has the 9 negative-pole moods`), and Test 5 (`:67-82`) asserts `NEG` lowers / `POS` raises `composure` (`maxNegMag >= maxPos`). Adding a flat affect tag to `AFFECT_TAGS` fails Test 6 immediately.
  - Downstream affect consumers: `utilities/compressLifeHistory.js:146-149` (`AFFECT_VALENCE` closed 9-tag map defaults unknown tags to `0` at `:689-690`), and `scripts/citizen-signal-detector.js:54-58` (`AFFECT_POLE` lists 9 tags; a flat tag is ignored cleanly unless also tracked).

### 6.2 Task 11 (`plan:151`) — target tab and refusal scope undefined (`HOLD`)
- Two separate intake sheets and processors exist today with opposite behaviors:
  1. `Intake` (`processIntake_`, `phase01-config/godWorldEngine2.js:1522-1784`): rows are never cleared (`:1593`); incomplete rows (`!first || !last`, honorific, unknown category, ambiguous hit) receive `IntakeStatus = 'review — ...'` (`:1618,1625,1638,1646`) and are skipped individually while other rows continue, whereas missing `Age`/`Neighborhood`/`RoleType` silently pass and fall back to random draws (`:1629-1635,1674`).
  2. `Advancement_Intake1` (`processAdvancementIntake_`, `phase05-citizens/processAdvancementIntake.js:711-1335`): processed rows ARE cleared (`:1325-1335`). Pre-validation (`:817-840`) throws atomically to refuse the **entire queue** (`no row in the queue was processed`) on invalid `ClockMode`/`EmployerBizId`/`Neighborhood`, **but** silently accepts blank `ClockMode` (`:860` defaults `'ENGINE'`), blank `BirthYear` (`:1080` defaults `2003`), blank `Neighborhood` (`:1074` — comment notes `Advancement_Intake1` default 10-col schema omits `BirthYear` and `Neighborhood` — falls back to frequency draw), and blank `RoleType` (`:1095` draws randomly). And unlike `Intake`, `Advancement_Intake1` has no `IntakeStatus` skip guard (`:842-848`) to hold one bad row without blocking valid promotions/households.
- Task 11 leaves unspecified: (a) which tab (`Intake`, `Advancement_Intake1`, or both), (b) the exact required column list (`BirthYear` and `Neighborhood` are absent on 10-col `Advancement_Intake1` exports!), and (c) whether `"stays on the intake tab"` rejects one row (`IntakeStatus` skip) or halts the whole queue (`throw` in `:817-840`). Also note Acceptance #6 (`"mints with dials that are not all 50"`) spans `processAdvancementIntake.js:1122`, `updateCivicApprovalRatings.js:1504-1515` (`mintChallengerOnLedger_`), and `generateGenericCitizens.js` — only `Advancement_Intake1` is named in Task 11.
