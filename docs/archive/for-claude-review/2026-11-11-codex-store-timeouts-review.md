---
title: Citizen page and wake store timeout diff review
created: 2026-11-11
updated: 2026-11-11
type: reference
tags: [media, infrastructure, active]
sources:
  - 7488b55ff203f9c7db1dd37769c53f424968bad3
  - lib/citizenPage.js
  - lib/wakePerception.js
pointers:
  - "[[EDITION_PIPELINE_DEEP_DISPATCH]]"
---

# Verdict: HOLD

**The individual requests now have deadlines and preserve their error shapes. The wake can still spend its entire five-minute allowance reading memory, and two other wake loaders still issue unbounded store requests. A timed-out page write is also not an idempotent overwrite.**

Reviewed commit `7488b55ff`, with its three changed files matching disk at review time. Scope: store transport, read consumers, write replay, and adjacent store calls on wake paths. Runtime code and pre-existing worktree changes were left untouched.

## F1 — P1: the 15-document readback still exhausts the angle wake's kill budget

**Evidence:** `lib/citizenPage.js:45`, `lib/citizenPage.js:303`, `lib/citizenPage.js:317`, `lib/citizenPage.js:319`, `lib/citizenPage.js:326`; caller `lib/wakePerception.js:400` and `lib/wakePerception.js:405`; consumer `scripts/citizenVoice.js:145`; kill `scripts/cron-desk-run.js:2162`.

Each `storeFetch` creates a fresh 20-second signal. `recentPage_` lists the candidates, then GETs them sequentially, swallowing each failed GET and continuing. `loadOwnPageReadback` asks for 15 candidates before generation. If the list responds but the document endpoints stall, the GETs alone consume **15 × 20 seconds = 300 seconds**, plus list time and setup. The voice subprocess is killed at 300 seconds before it can use the empty-memory fallback. A list that itself hangs is improved by this patch; the mixed-success failure remains.

**Local reproduction:** actual `loadOwnPageReadback` and `recentPage_`, a virtual clock, and signal-aware fetch stubs: 16 independently created signals, 15 timed-out GETs, 300,000 ms logical read time, then an empty block. This was simulated time, not a five-minute live run.

**Correction:** give the entire recent-page operation a shared deadline, stop issuing document requests when it expires, and return the available/empty result. Preserve time for the remaining wake stages. Test a successful list followed by stalled GETs, not only an immediately rejected list. `loadCardAnchor` already uses the appropriate shared-budget pattern.

## F2 — P1: reachable wake loaders bypass the new timeout wrapper

**Newsroom evidence:** `scripts/scanCitizenPages.js:90` and `scripts/scanCitizenPages.js:111` issue direct fetches without a signal. `dumpIndex` awaits the listing at `scripts/scanCitizenPages.js:243` and document workers at `scripts/scanCitizenPages.js:281`. `scripts/cron-desk-run.js:1552` awaits that dump; the angle fanout awaits the refresh before any assignment at `scripts/cron-desk-run.js:3704` (the individual-persona path also calls it at `scripts/cron-desk-run.js:1593`).

A store request that never resolves holds the fanout before the voice subprocess and its five-minute timeout even exist. The catch promising to use the index on disk cannot run until the request rejects. A document GET can likewise strand a worker. This is an existing omission outside the changed files, directly relevant to the requested wake-path audit; it is not proof that this caused today's five child-process kills.

**Work-wake evidence:** `scripts/cron-work-wake.js:369` calls bare fetch inside its retry wrapper; list and document callers are at `scripts/cron-work-wake.js:374` and `scripts/cron-work-wake.js:386`. `wakeOne` awaits it at `scripts/cron-work-wake.js:444`, before shared readback; the sequential wake loop is at `scripts/cron-work-wake.js:514`. One stalled office-week read therefore prevents the catch/fallback and delays later citizens. The 429 sleeps/retries also need to fit an aggregate budget.

**Local reproduction:** invoked the exported `scanCitizenPages.listAll` and `loadOfficeWeek` with never-settling fetch stubs. Both reached a store request with no signal and remained pending. No dump or production write was executed.

**Correction:** bound these operations, including body consumption and retries, and ensure expiry reaches the existing disk-index/empty-office-record fallback. Keep an overall refresh budget as well as per-request protection; a large scan must not hold the fanout for hundreds of individually bounded requests.

## F3 — P2: a lost write acknowledgement can still cause appended duplicate content on retry

**Evidence:** the new overwrite guarantee is at `lib/citizenPage.js:40`; POST and error return are at `lib/citizenPage.js:181` and `lib/citizenPage.js:204`. The existing store contract at `lib/citizenPage.js:73` and reconciliation contract at `lib/citizenPage.js:334` explicitly say a repeat customId appends into the same document. The existing test models that behavior at `lib/wakePerception.test.js:615`.

If the server accepts the POST but the acknowledgement/body is delayed past 45 seconds, aborting the client does not undo the write. The helper returns an ordinary error. For a concrete retry path, `scripts/cron-work-wake.js:474` returns false on that error, and `scripts/cron-work-wake.js:519` records the wake as completed only on success. A subsequent run with the same wake key can regenerate and append another reflection into the already accepted document. Same document identity does not mean the content was overwritten or the operation was deduplicated. Calls without a Cycle have no customId at all (`lib/citizenPage.js:151`).

**Local reproduction:** with the repository's append-on-same-ID store model, the first synthetic POST persisted before its signal timed out. Retrying the same key with regenerated text returned success and left `FIRST\n\n---\n\nRETRY` in one document. This proves the client replay problem against that established model; no live store semantics were probed. The helper itself does not automatically retry.

**Correction:** remove the overwrite claim and preserve ambiguous writes for reconciliation before a caller resends. Do not turn an uncertain write into success. The pending-receipt flow at `scripts/cron-undocked-run.js:289` and `scripts/cron-undocked-run.js:303` is an existing example: true means landed, false permits resend, and unknown holds the pending item. The new timeout correctly preserves `pageHasDoc_`'s unknown result.

## Caller behavior: no-memory is preserved for most readers, not every caller

| Reader/caller | Behavior after the request settles with a timeout |
|---|---|
| `lib/citizenPage.js:230`, `:255`, `:297` | Search/read/list failures return `{error}`; individual recent-doc failures are dropped. No transport exception escapes these helpers. |
| `lib/citizenPage.js:336` | Presence check returns `null` (unknown), never a guessed absence. Its pagination still receives a fresh deadline per request. |
| `lib/wakePerception.js:402`, `:436` | Own-page readback yields an empty block when no other local candidates exist; card anchor yields `''`. Card pagination and the final GET share one 30-second signal. These feed citizen wake, voice, exchange and work-wake callers. |
| `lib/personaProvider.js:510`, `:595`; `lib/discordLookups.js:497` | Page recall adds no memory; lookup returns an unavailable result. |
| `scripts/reporterWall.js:47`; `scripts/officeWall.js:80`; `scripts/cron-desk-run.js:2119` | Empty wall/error result or no prior grade; no read-timeout throw. Aggregate latency still follows F1. |
| `scripts/magsPageRecall.js:42`; `scripts/mags-discord-bot.js:197`; `scripts/moltbook-heartbeat.js:300`; `scripts/discord-reflection.js:366` | Empty recall/omitted context, with local catches. |
| `scripts/cron-desk-writer.js:862` | Continues without recalled content. Its existing fallback at `:875` misleadingly describes an outage as a first recorded wake/no notes; this patch does not change that wording. |
| **`scripts/civisJournal.js:373`** | **Pre-existing exception:** converts `got.error` into a throw. `run` awaits it at `:430` before model fallback handling. A list timeout aborts journal generation rather than continuing without memory. An exact-source fragment probe confirmed the throw. If the requested no-memory policy includes this journal, fold its caller handling; otherwise explicitly retain it as an exception. |

Write failures are separate from optional recall: for example `scripts/citizenVoice.js:247` and `scripts/citizen-exchange.js:177` deliberately throw on a page-write error. Those should not silently claim a successful recording. F3 concerns safe reconciliation of their uncertain write outcome.

## Other store transport inventory

- All six fetch sites inside `citizenPage.js` now use `storeFetch`; only POST `/v3/documents` selects 45 seconds. Search, list and document GET select 20 seconds. No bare store fetch remains in that module.
- `loadCardAnchor`'s two fetch sites share one signal (`lib/wakePerception.js:442`, `:447`, `:458`), with JSON consumption inside the enclosing catch. No other direct store fetch is present in that module.
- The newsroom past-stories tool uses `lib/supermemory.search` with 15 seconds (`scripts/cron-desk-writer.js:908`). That implementation uses `req.setTimeout` (`lib/supermemory.js:80`): a socket inactivity timeout, not a total response deadline. A slow trickle can exceed that duration. The provider's analogous search uses 8 seconds (`lib/personaProvider.js:357`). These do not provide the same wall-clock guarantee as the new AbortSignal deadlines.
- Adjacent conversation persistence still has bare store fetches at `lib/personaProvider.js:373` and `:407`, reached by buffer flush at `:447`/`:466`. These are conversation-save paths, not evidence for the reported newsroom angle failures. `scripts/maraMemory.js:17` already uses a timer/AbortController covering fetch and body parsing.

## Verification and limits

- `node --check`: all three files changed by `7488b55ff` passed.
- `lib/citizenPage.test.js`: **71 passed, 0 failed**. `lib/wakePerception.test.js`: **201 passed, 0 failed**. Both ran with environment/credential loading and external network access blocked, and filesystem writes confined to `/tmp`.
- Additional local probe: real AbortSignal timers accelerated to 3 ms, with abort-aware fetch/body stubs, covered header stalls and body stalls for all five page APIs, own-page readback, and card anchor. Captured configured budgets were 20,000 / 30,000 / 45,000 ms. Shared card-budget and cumulative recent-page tests used a virtual clock. Lost-acknowledgement, unbounded-loader and Civis exception probes are described above. Scratch harness: `/tmp/store-timeouts-probe.cjs`.
- The added commit test at `lib/citizenPage.test.js:278` checks signal presence and immediately thrown TimeoutError results; it does not exercise actual expiry, cumulative requests, the card budget, or accepted-but-unacknowledged writes. Its passing result cannot settle F1–F3.
- No live cron, model, Sheet, store, publishing, deployment or service operation was run. Today's incident and remote upsert behavior were not independently reproduced. This is a source and isolated local review, not live recovery proof. No engine-cycle function, `S.` field or Sheet-tab wiring was changed or assessed; the scope is wake-side transport.
