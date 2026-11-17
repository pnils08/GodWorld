# Adversarial Re-Review — Job-Statement Build (`engine.347` Task 5, `d65123a03`)

**Reviewer:** agy  
**Date:** 2026-11-17  
**Brief:** `output/research-build/2026-11-17-rb-brief-agy-job-statements-diff.md`  
**Build reviewed:** commit `d65123a03` against `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md` (§Task 5 as built `:202-222`, §Task 5 review reconciled `:223-242`)  
**Verdict:** **SHIP-WITH-FIXES**

Read-only review; no code, sheets, docs, or model calls were modified or run. Local checks run against `HEAD` (`d65123a03`): `node --check` clean on all 8 JS files; `node lib/jobStatementRows.test.js` (`80/80`); `node scripts/maraM1.test.js` (`17/17`); `node scripts/civisJournal.test.js` (`PASS`); `node scripts/worldViewCheck.test.js` (`34/34`); `node scripts/worldViewCheck.js` (`PASS world-view C116: 22 neighborhoods`); `output/cron-civic/job-statements/` confirmed absent after all test runs.

---

## Summary of Findings

1. **Dispatcher `.then(flushJobStatements)` fires on `--dry-run`, `--no-write`, and `--dry-commit` (`scripts/cron-civic-run.js:4766-4767`):** Only `STAGE === 'tick' || STAGE === 'status'` is excluded. Any dry/no-write run (`--stage=datawake --dry-run` `:3908`, `--stage=datawake --no-write` `:3919`, `--stage=directive --dry-commit` `:1540`) returns normally and hits `flushJobStatements()`, contacting live Sheets + OpenRouter and appending any spooled lines (e.g., queued earlier by `tick`).
2. **Dispatcher double-flushes on transient error in `runDatawake` / `runChain` (`scripts/cron-civic-run.js:4105, :4180, :4767`):** On the happy path the second `flush()` exits at `lib/jobStatementRows.js:246` (`!owed.length`) before `readRows()`. On a transient Sheet or classifier error at `:4105` (when `failed.length === 0`) or `:4180`, `:4767` immediately fires a second `flushJobStatements()` milliseconds later — performing a second `getRawSheetData('Reflection_Intake')` read and burning try `2` of `MAX_TRIES = 6` in the same invocation.
3. **Two minor `lib/jobStatementRows.js` edge cases (`:147, :209`):** (a) Un-locked `queue()` (`:145-147`) can double-append identical lines under concurrent writers and, if a torn line ever lacked a trailing `\n`, `appendFileSync` fuses the next line into unparseable JSON that `readLines` (`:124`) silently skips (settled nowhere, logged nowhere); (b) an empty HTTP-200 choice from OpenRouter (`lib/reflectionClassifier.js:384-388`) returns `{ event: null, affect: null, raw: '' }` without `[err]`, so `readSitting` (`:209`) drops a 1-line sitting immediately as `off-vocabulary read` (`:258`) instead of retrying `MAX_TRIES`.
4. **Test 7 regexes & missing cheap behavioral tests (`lib/jobStatementRows.test.js:206-236`):** Test 7 uses unanchored regexes / `indexOf` checks that pass even with broken wiring (e.g. `if (o.noWrite)` `return` removed, `writeOutputs` before `staged.said`, missing `isJobDaypart` import). Two writer paths (`commitDirectiveWrites` with `staged.said`, `civisJournal.run` with `opts.jobRows`) already have mock-I/O test harnesses in `scripts/maraM1.test.js` and `scripts/civisJournal.test.js` and can be tested behaviorally in ~6 lines each with zero external calls.

---

## 1. Does the Build Match the Fold?

All 8 items marked `taken`, `taken in part`, or `covered` in `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md:227-242` are answered in code:

| Reconciled item (`plan:227-242`) | Answered by | Notes |
|---|---|---|
| Per-line read, majority mood (`plan:229`) | `lib/jobStatementRows.js:86-102` (`composeSitting`), `:201-215` (`readSitting`) | Tested in `lib/jobStatementRows.test.js:71-85, 113-116` |
| Post-flush same-day `CIVIC` line = own sitting, Col A identity (`plan:230`) | `lib/jobStatementRows.js:156-180` (`pendingSittings`), `:185-193` (`onSheet`), `:264` (`mark`) | Tested at `:130-132`; `onSheet` matches exact instant for `CIVIC` |
| 6th caller `batchCollectHearing` (`plan:231`) | `scripts/cron-civic-run.js:123` (inside `positionWallRecordCascade`, called `:2253`) | Queues in `tick`/`batch-collect`, flushes on next flushable stage |
| Cycle-named spool orphan (`plan:232`) | `lib/jobStatementRows.js:52` (`KEEP_CYCLES = 3`), `:229`, `:238-245` | Opens 3 newest Cycle spools; tested for c115 + c117 at `:190-193` |
| Standalone stages & directive partial-resume flush (`plan:233`) | `scripts/cron-civic-run.js:4766-4767` (and `:1344` returns normally) | Covered, except introduces dry-run flush & error double-flush (see §4) |
| `Setback` inert (`plan:234`) | `lib/jobStatementRows.js:37` (`BAD_EVENTS`), `:45` (`LANDS_NOTHING`) | Tested against `dialMap.nudgesForReflection_` at `:33` |
| Duplicate words once; one-per-Cycle `directive`/`journal` (`plan:236`) | `lib/jobStatementRows.js:145` (queue dedup), `:104-108` (`sittingKey`), `:175` (`late`), `:190` (`onSheet`) | Tested at `:96, 138-141, 157` |
| Week view excludes job dayparts from `said` (`plan:237`) | `world-view/build.js:65` (`isJobDaypart(r.Daypart)`) | Also excluded in `civicPetitions.js:124`, `buildCivicOfficeSlice.js:1051`, `buildCitizenWeekDigest.js:146` |

*(Unchanged `kept` item `plan:235`: Mara's `staged.said` queues when `done(entryId)` at `cron-civic-run.js:1289-1292`; verified `staged.said` is set at `:1536` BEFORE `writeOutputs` serializes `staged_c<cycle>.json` at `:1466`, so `resumeDirectiveCommit` reads it back cleanly.)*

---

## 2. `lib/jobStatementRows.js` — Trick Code Check

- **Can `queue` or `flush` throw into `cron-civic-run.js` or `civisJournal.js`?**
  - `queue` (`:132-152`) and `flush` (`:223-278`) wrap their bodies in `try/catch`; `cron-civic-run.js:142-152` adds an outer `try/catch`. `civisJournal.js:94-96` has no extra `try/catch` around `opts.jobRows.flush()`. Only synthetic throw path out of `flush` is if a caller-provided `o.log` function itself throws inside `catch` at `:275` (neither `cron-civic-run.js:147` nor `civisJournal.js:115` throws).
- **Can a sitting land twice (Col A identity & `lib/sheets.js`)?**
  - `lib/sheets.js:213` (`appendRowsDetailed` called by `appendRows` `:238`) writes with `valueInputOption: 'RAW'`, so ISO strings like `'2026-11-18T11:45:00.000Z'` are stored as **verbatim strings**, not converted to Sheets date serials. `getRawSheetData` -> `getSheetData` (`lib/sheets.js:53-56, 429-431`) omits `valueRenderOption`, defaulting to `FORMATTED_VALUE`, which returns the verbatim string (confirmed in `output/beats/Reflection_Intake.jsonl`, e.g. `"2026-11-15T18:30:30.586Z"`). Thus `new Date(r[0]).getTime() === new Date(sitting.at).getTime()` holds to the millisecond. *(Caveat: if Col A were ever edited via `USER_ENTERED` or formatted to a date without ms, `getTime()` equality would break.)*
  - `withFileLock` (`lib/wakePerception.js:1413-1440`) uses atomic `linkSync` + live-PID check (`kill(pid, 0)`), so concurrent flushes cannot double-append or break a live lock.
- **Torn spool line / concurrent `queue()` / out-of-order `landed` marks (`:124, :145-147, :156-180`):**
  - **Concurrent `queue()`:** `:145` (`readLines(file).some(...)`) and `:147` (`fs.appendFileSync`) have no lock. Two concurrent processes queueing the same text both append it (doubling that line's tally weight in `composeSitting`). More subtly, if a crash leaves a torn line *without a trailing `\n`*, the next `fs.appendFileSync` at `:147` concatenates onto the torn line; `readLines` (`:124`) silently skips the whole fused line with **no row and no log line**.
  - **Out-of-order `landed` marks:** `pendingSittings` (`:161`) takes `Math.max(settled.get(m.key) || 0, Number(m.lines) || 0)`, so out-of-order `landed`/`present`/`dropped`/`late` marks converge to the highest settled line count. If a `landed` mark itself is torn, the next flush catches the sitting in `onSheet` (`:250`) and re-marks `present`.
  - **Concurrent `queue()` during an active `flush()`:** `pendingSittings` captures `upTo: g.all.length` (`:177`) at the start of the flush; `mark` (`:264`) records `lines: s.upTo`. A line appended to the same `CIVIC` key *during* classification is therefore left for the next flush (`g.all.slice(done)`) rather than lost.
- **`composeSitting` picking a mood no line showed (`:86-102`):**
  - `moods` tallies only non-`Flat` `l.affect` values returned in `landed` (`:93`); `Flat` is picked only if `landed.some(l => l && l.affect === 'Flat')` (`:95`). Cannot invent an unseen mood.
- **Retry counter never reaching `MAX_TRIES` (`:160, :177, :209, :253`):**
  - `tries` keys on `m.key + '@' + m.first` (`:160`), matching `g.key + '@' + rest[0].at` (`:177`). Once `rest[0]` is fixed, each failed flush increments `tries` until `s.tries + 1 < 6` fails on the 6th flush.
  - **One gap:** `readSitting` (`:209`) only flags `error` when `cls.raw` starts with `[err]`. In `lib/reflectionClassifier.js:383-388`, `j.error` or thrown `fetch`/`r.json()` produces `[err] ...`, whereas an HTTP 200 with empty `choices[0].message.content` returns `{ event: null, affect: null, raw: '' }`. For a 1-line sitting that makes `composeSitting` return `null`, dropping the sitting on try `1` as `off-vocabulary read` (`:258`) without ever reaching `retry` / `MAX_TRIES`. (Also a sitting stranded >`KEEP_CYCLES = 3` new Cycle spools stops being opened at `:229`.)

---

## 3. Tests That Prove Less Than They Say

`lib/jobStatementRows.test.js` Test 7 (`:206-236`) relies on regex / `indexOf` against source text:

| Assertion (`test.js`) | What passes even if wiring is broken |
|---|---|
| `:212` `positionWallRecordCascade` | Passes if `officeWall.recordCascadeForDir` drops `said` (`officeWall.js:249`), or if any of the 6 callers passes bad args / stops calling it (`linesFromCascadeStatements` is tested at `:227`, not `recordCascadeForDir`) |
| `:214` `positionWallRecordDatawake` | Regex `/if \(r\.recorded === true\) .../` has no line-start anchor — commenting the line out with `// ` still matches |
| `:216` `runWorkerDatawake` | Checks only `worker.indexOf('if (o.noWrite)') < worker.indexOf('queueJobStatement(')` — deleting `return` inside `if (o.noWrite)` (`cron-civic-run.js:3803`) still passes |
| `:219` `staged.said` | Checks assignment exists somewhere in `cron-civic-run.js`, not that `staged.said` is set before `writeOutputs` (`:1536` vs `:1537`) so `resumeDirectiveCommit` persists it |
| `:221, :223` `runDatawake` / `runChain` | Checks textual `indexOf` order only, not runtime invocation |
| `:225` `flushJobStatements` | Checks `getRawSheetData` and `classifyTripleReflection_` only; never checks `appendRows('Reflection_Intake', rows)` |
| `:231` `civisJournal.js` | Source regex only; `scripts/civisJournal.test.js` runs `journal.run()` (`:185`) without `opts.jobRows` |
| `:232-235` the 4 readers | Matches the `if (isJobDaypart(...))` line without verifying `isJobDaypart` is imported or tested on job-daypart fixture rows |

**Two cheap behavioral tests with zero external calls:**
1. **`scripts/maraM1.test.js:165-176`:** Already runs `run.commitDirectiveWrites(999, staged, { root, memory, page })` in a temp `root`. Adding `said: 'Direct the OARI audit.'` to `staged` and asserting `spool_c999.jsonl` under `root/output/cron-civic/job-statements/` records `POP-00507`, `directive`, and `[staged.said, ...notes]` (excluding `runEntry`) once across `r1` + `r2` resume costs ~6 lines.
2. **`scripts/civisJournal.test.js:185-194`:** Already runs `journal.run(999, { root, prior: [], sonnet, page })` with a mocked `page`. Passing a mock `opts.jobRows` backed by `jobStatementRows.queue`/`flush` into a temp dir tests the `civisJournal` queue+flush path behaviorally in ~10 lines.

---

## 4. Wiring in `scripts/cron-civic-run.js`

- **`opts.root` on `commitDirectiveWrites` (`:1266, :1291`):** All callers set `opts.root`: `runDirective` (`:1541`, `{ root: ROOT }`), `resumeDirectiveCommit` (`:1308, :1316`, `(opts && opts.root) || ROOT`, called from `runDirective` `:1341` and `runTick` `:4623`), and `scripts/maraM1.test.js:167, 172` (temp `root`).
- **Dispatcher `.then(flushJobStatements)` (`:4766-4767`):**
  1. **Dry-run / no-write hazard:** `--stage=datawake --dry-run` (`:3908`), `--stage=datawake --no-write` (`:3919`), and `--stage=directive --dry-commit` (`:1540`) return normally without throwing or exiting. Because `:4767` only skips `STAGE === 'tick' || STAGE === 'status'`, **any dry/no-write stage invocation still calls `flushJobStatements()`**, contacting live Sheets/OpenRouter and appending any already-queued spool rows (e.g. from `tick`).
  2. **Double work on error in `runDatawake` / `runChain`:** On a clean flush at `runDatawake` `:4105` or `runChain` `:4180`, `:4767` finds `owed.length === 0` (`lib/jobStatementRows.js:246`) and exits without reading Sheets. **On error** (classifier error `retry`, or Sheet 429 inside `flush()`), if `runDatawake` has `failed.length === 0` (`:4106`) or `runChain` finishes normally, `:4767` immediately calls `flushJobStatements()` a **second time** in the same process — executing a **second `getRawSheetData('Reflection_Intake')` read** and burning **try 2 of `MAX_TRIES = 6`** milliseconds after try 1.
- **Do any tested exports write to real `output/cron-civic/job-statements/`?**
  - No current test calls `runWorkerDatawake`, `runTick`, or `runTickAndRefresh`; `maraM1.test.js` passes temp `opts.root`, and `civisJournal.test.js` omits `opts.jobRows`. Verified `output/cron-civic/job-statements/` does not exist after running all suites. *(Note: `runWorkerDatawake` at `:3817` does not take a `root`/`dir` override, so a future test calling it with `noWrite: false` and a mock `officeWall` would write to the real spool.)*

---

## 5. The Four Readers & `world-view/build.js`

| Reader | Row shape held | Filter verified |
|---|---|---|
| `scripts/civicPetitions.js:124` | Object from `output/beats/Reflection_Intake.jsonl` | `if (isJobDaypart(row.Daypart)) continue;` — right field (`Daypart`) |
| `scripts/buildCivicOfficeSlice.js:1051` | Object from `output/beats/Reflection_Intake.jsonl` (`:1014`) | `if (isJobDaypart(reflectionField(r, ['Daypart', 'daypart']))) continue;` — right field |
| `scripts/buildCitizenWeekDigest.js:146` | 2D positional row from `sheets.getSheetData('Reflection_Intake')` (`:90`), `ri.kind` = `idx(rH, 'Daypart', ...)` (`:133`) | `if (isJobDaypart(r[ri.kind])) continue;` — right column |
| `world-view/build.js:65` | Object from `rd('Reflection_Intake')` | `isJobDaypart(r.Daypart)` — right field |

`world-view/build.js` loads `../lib/jobStatementRows` -> `../utilities/citizenDialMap` (pure ES5, zero external requires or side effects). Both `node scripts/worldViewCheck.test.js` (`34/34`) and `node scripts/worldViewCheck.js` (`PASS world-view C116: 22 neighborhoods`) pass cleanly.

---

## 6. Tomorrow Wed 2026-11-18 05:45 CT (`11:45 UTC`) Weekday Wake

Command: `node scripts/cron-civic-run.js --stage=datawake` (`docs/OPERATIONS.md:51`).  
Resolved state on disk (`2026-11-17`): `cycle = 116` (`lib/getCurrentCycle`), `date = '2026-11-18'` (`day = 3`, Wed), required inputs (`output/world_summary_c116.md`, `output/engine_audit_c116.json`, `scripts/civic-office-map.json`) present; `output/cron-civic/job-statements/` does not yet exist.

**Rota (`cron-civic-run.js:3868`: `datawakeRota(3)` then `workerRota(4)`), and order queued/appended:**
1. `civic-office-council-d7` — **Warren Ashford (`POP-00504`)**, last `2026-11-11` (`google/gemini-3.8-flash`)
2. `civic-office-council-d8` — **Nina Chen (`POP-00505`)**, last `2026-11-11` (`google/gemini-3.8-flash`)
3. `civic-office-council-d2` — **Leonard Tran (`POP-00502`)**, last `2026-11-12` (`openai/gpt-6-luna`)
4. `PROJ-STABFUND` (`civic-project-stabilization-fund`) — **Marcus Webb (`POP-00790`)**, last `2026-09-10` (`deepseek/deepseek-v4.1-flash-1017`, `worker/2`)
5. `PROJ-TRANSITHUB` (`civic-project-transit-hub`) — **Elena Soria Dominguez (`POP-00791`)**, last `2026-09-10` (`deepseek/deepseek-v4.1-flash-1017`, `worker/2`)
6. `STAFF-BAYLIGHT` (`civic-office-baylight-authority`) — **Keisha Ramos (`POP-00041`)**, last `2026-09-14` (`deepseek/deepseek-v4.1-flash-1017`, `worker/2`)
7. `DA-01` (`civic-office-district-attorney`) — **Clarissa Dane (`POP-00143`)**, last `2026-09-17` (`moonshotai/kimi-k3.1-pro`, `worker/2`)

**What lands on `Reflection_Intake`:** `runDatawake` (`:3924`) executes the 7 speakers sequentially; each speaker whose wake succeeds and whose Supermemory page append returns `recorded === true` queues 1 line (`Cycle = 116`, `Daypart = 'CIVIC'`, `at ~ 2026-11-18T11:45Z`). Before exit (`:4105`), `flushJobStatements()` reads `Reflection_Intake` once, classifies each speaker's line (`READ_AT_ONCE = 4`), and appends up to **7 rows** in spool order (`POP-00504` .. `POP-00143`) in one `sheets.appendRows` call (`Applied = 'no'`, `Tag` in `{Civic, Stumble, Spat, TrustGuarded, ConnectionWithdrawn}`, `Affect` = classified mood or `Flat`).

**First thing that could make it land nothing:**
1. **Before queue:** Supermemory outage / `officeWall.recordPosition` returning `recorded: false` for all 7 speakers (0 lines queued, and `runDatawake` still exits `0`), or `OPENROUTER_API_KEY` failure failing all 7 wakes.
2. **In `flushJobStatements()` after queuing:** `sheets.getRawSheetData('Reflection_Intake')` (`lib/jobStatementRows.js:247`) hitting a `429` or auth/network error (`lib/sheets.js` has no retry/backoff — aborts all 7 rows), followed by all 7 `classifyTripleReflection_` calls returning `[err]` (`:251-256`) or `sheets.appendRows` (`:262`) throwing.
