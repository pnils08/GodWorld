---
title: Codex pipeline.108 daily news v2.0 diff review
created: 2026-11-09
updated: 2026-11-09
type: reference
tags: [media, citizens, infrastructure, review]
sources:
  - docs/plans/2026-11-09-daily-news-articles-as-sources.md
  - scripts/notebooklmDailyNews.js
  - scripts/notebooklmDailyNews.test.js
  - scripts/buildCitizenWeekDigest.js
  - editions/cycle_pulse_c114.txt
pointers:
  - "[[plans/2026-11-09-daily-news-articles-as-sources]] — reviewed plan"
---

# pipeline.108 — daily news v2.0 diff review

**Verdict: HOLD** for the unattended 08:00 run. Commit `ae8d72065` passes its focused local test, but a partial upload can permanently spend an unheard article, a failed prune can expose a held draft to the next show, and recovery can deliver audio that is not bound to the current report set. The builder can settle each finding against the intended operating contract.

## Findings

### F1 — A delivered partial upload marks omitted reports as aired (P1)

`scripts/notebooklmDailyNews.js:903-926` catches each source-add failure and returns only landed sources. Lines `1320-1326` accept any nonzero landed count and store those IDs, while lines `1224-1227` put **every collected report** in `manifest.reports`. Once Drive supplies a link (`1407-1417`), `airedReportTimes` treats every path in that manifest as aired (`180-196`), and `collectNewsroomArtifacts` excludes it on a later day (`234-239`). Input: two eligible articles, one upload fails, the other lands and the show is delivered. Output: the missing article is absent from audio, then skipped on the next morning even though it remains inside the 72-hour carry window. The edition is worse: all split sources share the one edition path (`621-634`), so one failed article upload cannot be distinguished from the articles that landed; after edition day, the edition is not collected at all (`292-300`). The test asserts only source construction and an aired map, not delivery coverage (`scripts/notebooklmDailyNews.test.js:157-190,639-668`). Require a durable per-piece landed/delivered receipt or fail the show when required pieces did not land, then test partial upload through next-day selection.

### F2 — The post-audio gate file can enter the next news audio if prune fails (P1)

The new ops path uploads the full flagged-draft gate file into the *working news notebook* after audio (`scripts/notebooklmDailyNews.js:1431-1439`). On the next run, its title matches the daily prune pattern (`857-870`), but a deletion error is explicitly non-blocking (`1329-1336`). The code then creates the news audio in that same notebook (`1373-1381`). Its own comment says `--source-ids` is only a hint (`1329-1330`): input a failed stale-source delete, output a notebook still holding yesterday's FLAGGED draft while today's audio is generated. This breaks the plan's "ops file only after the audio" boundary on the next day. Require confirmed removal or isolate the ops source outside the news notebook before creating news audio; test a failed delete with an existing gate file.

### F3 — Resume delivers the latest notebook audio without proving it belongs to this run (P1)

`--resume-latest-audio` downloads without `--id` (`scripts/notebooklmDailyNews.js:1277-1285`), then writes that audio under the current run's manifest and delivers it (`1287-1303`). It never checks `manifest.audioArtifactId`, the downloaded artifact's source IDs, or even that it was made for this Cycle. Input: current run failed after upload, but the notebook's latest completed audio belongs to another attempt; output: that other audio is delivered as this run. The current collected report paths are already written to the manifest (`1224-1241`), so the delivered Drive link can make those unheard paths count as aired next morning (`180-196`). The branch runs before the zero-source guard (`1306-1309`). Resume must pin and verify the current run's artifact and source set before delivery; cover a newer foreign artifact in a recovery test.

### F4 — A same-run-dir re-run can deliver the show twice (P2)

A completed run deletes its local audio after Drive delivery (`scripts/notebooklmDailyNews.js:1415-1417`). The completed-manifest no-op nevertheless requires that local file still exist (`1187-1204`). During the next 12 hours, `airedReportTimes` intentionally ignores the delivered manifest (`177-192`), so an unchanged re-run collects the same reports, gets the same pack hash and run directory (`1166-1177`), misses the no-op, and creates and delivers another audio (`1373-1417`). Use the durable delivery receipt for idempotence, and distinguish a retry of a failed delivery from a request to force a new show. The test checks only `isCompletedManifest` as a pure predicate (`scripts/notebooklmDailyNews.test.js:123-144`), not the deleted-audio path.

### F5 — The edition splitter titles real headline-less articles “INTAKE” (P2)

`editionSources` takes the first `#` or `##` heading from raw article text before removing its `## INTAKE` block (`scripts/notebooklmDailyNews.js:623-632`). In `editions/cycle_pulse_c114.txt:29-39` and `279-295`, the Celeste Tran and P Slayer pieces have no prose headline, so the first heading is `## INTAKE`. A local call on that print yielded `Celeste Tran: INTAKE` and `P Slayer: INTAKE`, rather than a reporter/desk or story label. The synthetic test's headline-less column has no intake heading (`scripts/notebooklmDailyNews.test.js:619-638`), so it misses the real layout. Derive labels from cleaned reader copy or exclude intake headings; assert all actual edition article labels on a representative print.

### F6 — A long reflection is clipped in the new source body (P3)

The new `full` field applies `clip(..., 2000)` (`scripts/buildCitizenWeekDigest.js:139-153`), and `citizens` exports that clipped field (`302-315`); `reflectionSources` uploads it as the citizen's words (`scripts/notebooklmDailyNews.js:656-660`). Input: a `ReflectionExcerpt` over 2,000 characters. Output: the source silently omits its tail. The added test supplies only short hand-built `citizens` objects (`scripts/notebooklmDailyNews.test.js:365-399`), never exercising the Sheet-row conversion or a long reflection. If the intended contract is every row's complete text, preserve the full field and add a long synthetic row check. This condition was not checked against live Sheet lengths.

## Verification and limits

- Read commit `ae8d72065`, its plan, the target scripts, the real C114 printed edition, and the source reader. Ran `node scripts/notebooklmDailyNews.test.js` (PASS) and `node --check` on all three named scripts (PASS).
- Called the pure `editionSources` function on C114 locally: ten source chunks were produced; two labels were `INTAKE`. No live NotebookLM, Sheet, Drive, Discord, cron, or audio run was performed. `--dry-run` was not used because `run()` calls `buildDigest()` and reads Sheets before its dry-run return (`scripts/notebooklmDailyNews.js:1115-1125,1261-1270`).
- The formal engine-wiring card was not run: this read-only review did not authorize a model API call, although the digest's Sheet reads were traced from source (`scripts/buildCitizenWeekDigest.js:87-92`). The findings above are source and local-test conclusions, not live delivery proof.
