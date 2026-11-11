---
title: Store timeout fold rereview
created: 2026-11-11
updated: 2026-11-11
type: reference
tags: [media, infrastructure, active]
sources:
  - 5cc0c05e5f1bcc0f134f90e58367d02ee29337f4
  - docs/for-claude-review/2026-11-11-codex-store-timeouts-review.md
pointers:
  - "[[for-claude-review/2026-11-11-codex-store-timeouts-review]]"
---

# Verdict: HOLD

**F1 is closed. F2's unbounded read requests are closed, with deadline precision limits below. F3 is partially addressed: the false overwrite claim is gone, but removing the write deadline restores a hanging-write path and leaves ambiguous writes unreconciled.**

Reviewed `5cc0c05e5`; its seven changed files matched disk. Three focused suites and additional isolated probes passed. No runtime edits or live calls were made.

## R1 — P1: F3's rollback restores a write that can hold the wake, without securing retries

**Evidence:** `lib/citizenPage.js:40`, `lib/citizenPage.js:46`; caller `scripts/cron-work-wake.js:478`, error handling `scripts/cron-work-wake.js:482`, sequential execution `scripts/cron-work-wake.js:525`, completion recording `scripts/cron-work-wake.js:527`.

`storeFetch` now returns bare `fetch(url, opts)` for the page POST. There is no application deadline on either response headers or body consumption. A store write that remains pending holds `wakeOne` at the append and prevents the sequential work-wake loop from reaching later citizens. It waits for transport failure or an external termination. The new test at `lib/citizenPage.test.js:290` explicitly locks in the absence of a signal.

Removing the 45-second abort removes that particular source of ambiguous failures; it does not establish delivery. A server can accept the write and then lose the connection before the acknowledgement reaches the caller. The existing catch at `lib/citizenPage.js:207` still returns an ordinary error. The work-wake caller returns false and records no completed wake, so a later run can resend the same key. Under the repository's documented append-on-same-ID behavior, both texts remain in one document. No pending receipt or reconciliation was added to this caller.

**Executed local probes:**

- Called the actual `appendReflection_` with a never-settling header response, then with resolved headers and a never-settling JSON body. Both requests had no signal and were still pending when the harness stopped observing after 40 ms. Source inspection establishes the missing deadline; this short observation is not a live timeout measurement.
- Modeled the established store append behavior, accepted the first synthetic write, then threw a connection error before acknowledgement. The helper returned an error; a same-key retry returned success and left `FIRST\n\n---\n\nRETRY` in one document. This used local stubs, not the live store.

**Required correction:** restore a finite write deadline and persist the pending write identity before sending. Reconcile an ambiguous outcome before retrying; an unavailable presence check must remain pending. Do not report an uncertain write as success. The existing pattern at `scripts/cron-undocked-run.js:289` and `scripts/cron-undocked-run.js:303` remains a useful reference. Alternatively, explicitly narrow the accepted change to read deadlines and leave writer availability/reconciliation as an acknowledged unresolved item; the current fold leaves a concrete unbounded store call on the wake paths requested for review.

This is a work-wake/persistence failure path. It is not a claim that the newsroom's read-only angle invocation writes a page or that this caused the reported morning child-process failures.

## Prior finding reconciliation

| Prior finding | Disposition | Evidence and checks |
|---|---|---|
| F1 — 15 serial reads consume five minutes | **Closed** | `lib/citizenPage.js:305` creates one budget; `:310` passes it to the list; `:322` stops the loop after expiry; `:324` passes it to each GET. `storeFetch` combines it with the per-request signal at `:48`. With 30 ms per request and 50 ms total, both header-stall and body-stall probes kept the first completed memory, attempted only 2–3 of 15 GETs, and returned in about 50 ms. |
| Presence-check budget | **Verified improvement** | `lib/citizenPage.js:346` shares the budget across pagination. A successful full first page followed by a stalled second-page body returned `null`, preserving unknown rather than inventing absence. A stalled initial page read still produced empty own-page readback. |
| F2 — page refresh bypasses timeouts | **Closed for unbounded reads** | `scripts/scanCitizenPages.js:90`, `:96`, `:117` cover list/GET signals; `:247` creates the refresh budget; `:266` stops workers. `scripts/cron-desk-run.js:1553` supplies 120,000 ms. A composed `dumpIndex` run with a temporary root retained the existing index row, appended one completed synthetic document, and stopped stalled remaining reads. A stalled list rejected without damaging that index. |
| F2 — office-week bypasses timeouts | **Closed for unbounded reads** | `scripts/cron-work-wake.js:370` creates the shared budget and `:374` combines it with each request limit. The focused hung-list test passes; an additional successful-list/stalled-document-body probe returned an empty record. The wake's catch/fallback remains at `:453`. See pacing limits below. |
| F3 — overwrite claim and ambiguous-write replay | **Partially addressed; R1 open** | The comment correctly says append, but the write deadline was removed and the concrete work-wake retry path still lacks a pending receipt. |

## Limits retained within the reviewed fold

- The stated aggregate budgets are not exact return deadlines during sleeps. `scripts/cron-work-wake.js:375` waits 11 seconds on a 429 without listening for abort, and `:398` continues 80 ms pacing after failed document reads. With three synthetic documents and a 30 ms budget, the local probe returned after 274 ms. At normal defaults the residual waits are bounded: a current 11-second backoff plus remaining document pacing can exceed 60 seconds. `scripts/scanCitizenPages.js:121` likewise has an uninterruptible backoff of up to 20 seconds; `:280` adds pacing. This does not recreate F2's unbounded request, but the commit's claim that waits fit inside the budget is too strong. Abortable sleeps and a stop check in the office document loop would enforce a tighter bound.
- Previously recorded exceptions remain outside this fold: Civis Journal throws on a page-read error (`scripts/civisJournal.js:373`); `lib/supermemory.js:80` provides socket inactivity rather than a whole-response deadline; conversation persistence still uses bare fetches (`lib/personaProvider.js:373`, `:407`). These were not promoted into new findings or retested here.

## Verification

- `node --check` passed on all seven changed JavaScript files.
- `lib/citizenPage.test.js`: **73 passed, 0 failed**.
- `scripts/cron-work-wake.test.js`: **53 passed, 0 failed**.
- `scripts/scanCitizenPages.test.js`: base, earlier fold, and new store-budget checks all **PASS**.
- Additional probe: `/tmp/store-timeouts-rereview-probe.cjs`; actual page helpers and office loader, plus the scanner module with only its filesystem root redirected to `/tmp`. Checked partial-read retention, header/body stalls, pagination uncertainty, composed index preservation, write hangs, and accepted-but-unacknowledged retry behavior. Network/credential loading was blocked and test writes were confined to temporary files. Node version was `v22.23.4`, supporting `AbortSignal.any`.
- No live cron, store, model, Sheet, service, publishing or deployment operation ran. The remote append behavior and today's outage were not independently reproduced. No engine-cycle function, `S.` field or Sheet-tab wiring was assessed; this review concerns wake-side I/O and its callers.
