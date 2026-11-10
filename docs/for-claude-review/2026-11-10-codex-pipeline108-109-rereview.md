---
title: Codex pipeline.108–109 one-round rereview
created: 2026-11-10
updated: 2026-11-10
type: reference
tags: [media, infrastructure, review]
sources:
  - docs/plans/2026-11-09-daily-news-articles-as-sources.md
  - docs/plans/2026-11-10-cron-feedback-to-builder.md
  - docs/for-claude-review/2026-11-09-codex-pipeline108-diff-review.md
  - scripts/notebooklmDailyNews.js
  - scripts/notebooklmCanonSearch.js
  - scripts/civisJournal.js
  - scripts/cronFeedback.js
  - .claude/hooks/session-startup-hook.sh
pointers:
  - "[[plans/2026-11-09-daily-news-articles-as-sources]] — pipeline.108"
  - "[[plans/2026-11-10-cron-feedback-to-builder]] — pipeline.109"
---

# pipeline.108–109 — one-round rereview

**Verdict: HOLD.** The four focused suites pass, the default canon-search citation gate remains fail-closed, and the Civis journal gate is unchanged. However, stale held drafts can still reach an unattended show, a retry can detach an audio artifact from its source receipt, recovery can deliver the same old render twice under a newer Cycle, and boot feedback can claim delivery or absence incorrectly.

Reviewed commits `85398e29e`, `940faad6c`, and `d7954a385`, using `git diff ae8d72065..d7954a385`. HEAD was `d7954a385`. Scope is the requested five areas and their immediate callers; unrelated changes in the aggregate diff are not approved by this review. Line numbers below refer to that HEAD. No code, control-plane file, service, or external state was changed.

## Prior F1–F6 reconciliation

| Prior finding | Result | Evidence |
|---|---|---|
| F1 — failed uploads spend unheard articles | **Partially closed.** Regular articles now count only when a landed `kind: article` source has an ID. Edition pieces still lack next-day recovery. | `scripts/notebooklmDailyNews.js:194-200,322-326,771`; R4 below. |
| F2 — held gate file contaminates a later show | **Open.** `finally` attempts deletion, but failure is only logged; the next pre-audio prune remains non-blocking. | `scripts/notebooklmDailyNews.js:1437-1444,1557-1563`; R1. |
| F3 — recovery delivers unbound latest audio | **Partially closed.** Download now uses `--id`, and absent recorded renders are refused. The saved ID and sources can still diverge across retries, and cross-run recovery does not consume the original receipt. | `scripts/notebooklmDailyNews.js:1375-1401,1431-1434`; R2–R3. |
| F4 — deleted local audio defeats completed-run no-op | **Closed for the named same-run normal rerun.** Completion no longer requires local audio existence. Explicit recovery bypasses this guard and has a separate defect. | `scripts/notebooklmDailyNews.js:435-443,1276-1294`; R3. |
| F5 — headline-less edition pieces titled INTAKE | **Closed.** Heading comes from cleaned reader copy. Local C114 check produced ten pieces and zero INTAKE labels. | `scripts/notebooklmDailyNews.js:764-770`. |
| F6 — reflection tail clipped at 2,000 characters | **Closed in source.** The full field now normalizes whitespace without truncation; the reflection source uses that text. Live row lengths were not inspected. | `scripts/buildCitizenWeekDigest.js:152`; `scripts/notebooklmDailyNews.js:797-800`. |

## Findings

### R1 — Failed gate-file cleanup still permits news audio generation (P1; prior F2)

**Pointers:** `scripts/notebooklmDailyNews.js:1557-1563`, `1437-1444`, `1482-1489`.

The new `finally` is best-effort cleanup, not an exclusion gate. A failed deletion leaves the held draft source in the working notebook. A killed process can also bypass cleanup, and pre-fold leftovers already satisfy this input condition. On a later run, failed stale-source deletion is caught and logged, then the code queries and creates audio in that notebook. The code itself states that `--source-ids` is only a hint (`1437`).

**Reproduced locally:** returned an existing `The Bay Tribune Daily C998 — gate desk file` from the source-list stub and failed source deletion. `run()` logged `STALE SOURCE PRUNE SKIPPED` and still called `audio create`. This proves the control-flow exposure, not that live hosts actually read the held source.

**Required boundary:** before any news query/audio, confirm no held-draft source remains, or isolate ops material in another notebook. A cleanup error must not permit the next news show to proceed with that source present. Add a failed-cleanup/failed-next-prune integration case.

### R2 — A failed normal retry rewrites the sources of an older recorded audio (P1; prior F3)

**Pointers:** `scripts/notebooklmDailyNews.js:431-433`, `1302-1332`, `1431-1452`, `1375-1384`, `1491-1493`.

`mergeManifest` retains the prior `audioArtifactId`. A normal retry then overwrites `manifest.sources` and `sourceIds` with the newly landed set **before** querying the brief or creating a replacement audio. If that query or subsequent preparation fails, disk contains the old render ID paired with the new sources. Recovery trusts this pair because an existing `audioArtifactId` skips the provenance-copy branch. Pinning the download to the ID does not repair the mismatched receipt.

**Reproduced locally through `run()`:** two synthetic staged articles A and B; first attempt uploads A, fails B, creates an audio, and times out downloading it. Retry fails A's upload, lands B, and fails the brief query. Recovery then delivers the first audio while the manifest says B landed and A did not. A later airs-once scan can therefore spend unheard B and repeat heard A. No hand-edited manifest was needed for this reproduction.

**Required boundary:** store immutable source provenance with each render ID. Preparation of another attempt must not change the source receipt for an existing render. Test this failure sequence through recovery and next-day selection.

### R3 — Cross-run recovery leaves the origin undelivered and relabels old audio (P2; recovery extension of F3/F4)

**Pointers:** `scripts/notebooklmDailyNews.js:204-227`, `1276`, `1375-1381`, `1392-1404`.

`latestUndeliveredRender` searches all Cycles and returns no originating Cycle/notebook identity. Recovery copies the artifact and sources into today's run, delivers using today's `cycle`, and writes the Drive receipt only to today's manifest. The originating manifest remains eligible forever. The recovery branch also explicitly bypasses the completed-manifest no-op, so repeating recovery in the same directory re-sends its already delivered artifact.

**Reproduced locally:** a recorded, undelivered C998 render was recovered while the current summary was C999. Delivery received Cycle 999. After changing the synthetic current input to produce another run directory, a second recovery selected and delivered the same C998 artifact again; the origin still had no `driveLink`.

**Required boundary:** recover using the origin's Cycle, notebook and render receipt, and persist delivery against that origin (or a durable artifact-ID delivery ledger). Both same-directory and cross-directory recovery must recognize prior delivery unless explicitly forced.

### R4 — Failed edition-piece uploads still fall outside the carry window (P2; remaining prior F1)

**Pointers:** `scripts/notebooklmDailyNews.js:194-200`, `322-326`, `771`, `1037-1045`, `1428-1434`.

The new aired map recognizes only `kind: article`; edition pieces have `kind: edition-article` and share their edition path. More fundamentally, edition collection still depends exclusively on the edition file falling inside the ordinary 36-hour window for the current Cycle. Neither missing landed pieces nor the 72-hour unaired carry extends that selection. The show can succeed on the other sources after one edition article exhausts its upload retries, yet the missing piece disappears from selection next morning. A Cycle change also loses the previous edition entirely.

**Reproduced locally:** an edition with two synthetic split articles, 24 hours old at the first selection, produced two sources. At the next morning's selection it was 48 hours old and produced no reports, even with an empty aired map and a 72-hour carry setting. Thus even a wholly unaired edition fails the promised carry behavior; partial uploads are not rescued either.

**Required boundary:** retain eligibility and delivered identity per edition piece until it airs or the intended unaired expiry is reached, including across the Cycle boundary. Alternatively, make required edition uploads all-or-nothing and define a recoverable edition retry path. The current retry-once fold does not close this part of F1.

### R5 — Boot calls a downloaded ops report “delivered” after Discord failure (P2)

**Pointers:** `scripts/notebooklmDailyNews.js:1127-1130`, `1551-1554`; `scripts/notebooklmPush.js:376-395`; `scripts/cronFeedback.js:148,176-178,194-195`.

`opsReportPath` is persisted immediately after download. `sendDiscordFile` returns `false` for missing webhook or failed HTTP delivery; its return value is discarded. The new collector interprets the presence of `opsReportPath` as delivery and the boot digest prints `ops report delivered`. An audio delivered successfully plus an ops attachment rejected by Discord therefore produces a false success report at the next boot. The saved receipt contains no way to distinguish the two outcomes.

**Reproduced locally through `run()` and `collect()`:** report download succeeded, the Discord-file stub returned `false`, and `bootDigest()` printed `ops report delivered`.

**Required boundary:** persist and consume an explicit successful ops-delivery receipt. Label the local artifact “produced/downloaded” until delivery succeeds, and retain a retryable failure state. The report CLI option fix itself is correct; it does not establish Discord delivery.

### R6 — A successful journal retry leaves a false “no entry passed” receipt (P2)

**Pointers:** `scripts/civisJournal.js:476-481`, `495-507`; `scripts/cronFeedback.js:115-123,191-192`.

The failed-attempt file is rewritten only when the current invocation has a gate rejection. After an invocation exhausts its repairs and writes `passed: false`, a later invocation that passes on its first draft writes the journal but neither updates nor supersedes that failure receipt. The collector filters only `!record.passed`, without reconciling against the successful journal for that Cycle. Session boot can consequently report both `newest C999` and `no entry passed for C999`.

**Reproduced locally:** extended the existing journal suite's sequence of all-failed attempts followed by a successful first-draft retry. The successful journal existed, but `collect()` still included that same Cycle in `unwritten`. The ordinary suite passes because it checks successful journal creation without reconciling the earlier failure artifact.

**Required boundary:** resolve prior failure receipts after confirmed success, or have the collector reconcile against the successful journal record. Preserve rejected drafts as audit history while separating them from an outstanding missing journal.

## Verified closures and limits

- Read both named plans before concluding and reconciled all six prior findings. This is one review round; no repair was attempted.
- Ran `notebooklmDailyNews.test.js`, `notebooklmCanonSearch.test.js`, `civisJournal.test.js`, and `cronFeedback.test.js`: **all PASS**. A temporary preload stubbed the environment loader, rejected subprocess/network calls, and redirected canon-search test log files to `/tmp`; no credentials were read. Existing injected model/page dependencies stayed synthetic.
- Ran `node --check` on the four requested scripts and `buildCitizenWeekDigest.js`, plus `bash -n` on the SessionStart hook: **PASS**. The journal's complete `assertEntry` function is byte-identical to `ae8d72065` (SHA-256 `cc66a71eeb3de22409c4d2a0fa6250d708f2c031baa51d4af8a6c0e87ad42fa2`). Successful repairs still pass that gate before page append. The initial Sonnet failure wording used by `scripts/runCycle.js:205-207` is retained.
- Default `allowUncited` is false (`scripts/notebooklmCanonSearch.js:35`); only the daily-news production caller supplies the flag (`scripts/notebooklmDailyNews.js:710`). The default still rejects a bare answer, and partial/out-of-scope citation records still go through validation. Live source-list readiness checks still precede either response path. Background caching, bounded retries, lore exclusion, and background/article source pairing have focused local coverage; answer accuracy and the live timing budget were not exercised.
- Verified the report download argument repair against the installed CLI source, `.venv/nlm/lib/python3.12/site-packages/notebooklm_tools/cli/commands/download.py:440-449`: report accepts `--id` and `--output`, not `--no-progress`. The new failed-render and last-error branches were read; no live report was generated or downloaded.
- The added hook block captures the collector's stdout and retains its five-second timeout. Read-only `collect()` on current local artifacts took **161 ms**, covering 32 wakes and 27 distinct lacks. This establishes only present local collection cost. The whole SessionStart hook was **not executed**: other blocks touch PM2/plugins/services, and the enclosing hook has a ten-second budget. No boot-context delivery or timeout-margin claim is made.
- Adversarial reproductions used the actual exported functions or `run()` loaded with temporary-root and external-service stubs. They establish control flow and persistence defects, not live NotebookLM behavior. No 08:00 cron, audio listening check, Sheet/Drive/Discord/model call, deployment, or full boot was performed. No engine function, `S.` field, or Sheet mutation contract was under review, so no engine-wiring model call was made.
- Only this requested review artifact was written in the repository. Concurrent dirt was left alone; no index/plan changes, commit, or push were performed under the read-only request.
