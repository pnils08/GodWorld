---
title: engine.27 — wd-* Card Auto-Invalidation Hook Plan
created: 2026-05-26
updated: 2026-05-26
type: plan
tags: [engine, substrate, automation, ready]
sources:
  - docs/engine/ROLLOUT_PLAN.md §engine.27 (filed S236 from canon.3 T12+T13 close)
  - docs/SUPERMEMORY.md §wd-* (consumer canon — 7 projections, ~966 cards)
  - docs/adr/0007-cross-layer-canon-authority-precedence.md §Rule 3 (wd-cards as derived projection)
  - docs/archive/plans/2026-05-24-canon-3-cross-layer-citizen-drift.md §T12+§T13 (empirical wd-projection-lag findings)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] §engine.27 — parent rollout row"
  - "[[../adr/0007-cross-layer-canon-authority-precedence]] — Rule 3 substrate framing"
  - "[[../SUPERMEMORY]] §wd-* — consumer model + build scripts + tag taxonomy"
  - "[[../SCHEMA]] — frontmatter, naming, tag taxonomy"
  - "[[../index]] — register this plan"
---

# engine.27 — wd-* Card Auto-Invalidation Hook Plan

**Goal:** Eliminate the manual wd-* card rebuild ritual that lags every upstream sheet write — engine cycle, operator backfill, or direct Google Sheets UI edit — so MCP `lookup_*` consumers see fresh derived projections within bounded latency without operator intervention.

**Architecture:** Hybrid trigger model. (1) Phase 10 cycle-end hook in `godWorldEngine2.js` writes a `Wd_Card_Rebuild_Queue` marker tab row enumerating projections touched by `ctx.writeIntents`. (2) pm2-managed Node daemon `scripts/wdCardsDaemon.js` polls every N seconds: first drains the marker tab (immediate cycle-end rebuilds), then computes row-hash diffs against a state file to catch operator backfills + UI edits the marker missed. Both paths dispatch to existing `scripts/build*Cards.js --apply` writers with per-ID targeting. Replaces the ad-hoc post-canon-fix rebuild ritual that surfaced as load-bearing during canon.3 T12 (Adams Point UMC, Dario's Bar) and T13 (POP-00952..POP-00973 backfill cohort).

**Terminal:** engine/sheet

**Pointers:**
- Prior work: canon.3 T12 close commit `32fe5ce` (S236) + T13 close commit `19c875a` (S236) — both surfaced the wd-projection-lag pattern (sheet write lands → MCP returns sector peers / stale entity until manual rebuild)
- Related plan: [[../archive/plans/2026-05-24-canon-3-cross-layer-citizen-drift]] — the cross-layer citizen drift work whose closures exposed engine.27 as substrate debt
- ADR substrate framing: [[../adr/0007-cross-layer-canon-authority-precedence]] §Rule 3 — wd-cards are derived projections of Sim_Ledger × bay-tribune; right now every derivation is manual

**Acceptance criteria:**
1. Daemon runs as pm2 service `wd-cards-daemon`; survives droplet restart via `pm2 startup` + `pm2 save`.
2. Manual edit to Simulation_Ledger via Google Sheets UI (e.g., changing a citizen's Status or Neighborhood) triggers wd-citizens card rebuild for that POPID within `poll_interval_seconds` (default 300s) — no operator action required.
3. Engine cycle end appends to `Wd_Card_Rebuild_Queue`; daemon drains + dispatches affected projection rebuilds within 30s of marker write (independent of poll interval).
4. Rebuild failures log to `Engine_Errors` tab with source (`daemon-marker` vs `daemon-rowhash`), projection, ID list, stderr excerpt; daemon does not crash, auto-retries on next tick.
5. MCP `lookup_citizen <name>` / `lookup_business <name>` / `lookup_faith_org <name>` / `lookup_cultural <name>` returns post-write data within latency window above without operator running `node scripts/build*Cards.js`.
6. Daemon supports `--dry-run` mode that logs intended rebuilds without firing them — required for staging-cycle smoke before live enable.

---

## Tasks

### Phase A — Daemon-only (catches operator backfills + UI edits)

The originating pain point is operator-backfill projection lag (canon.3 T12/T13). Phase A solves that without touching the engine critical path. Ships standalone, no clasp push, no smoke-test bundling risk.

#### Task A1: Extend build script CLI for per-ID targeting

- **Files:**
  - `scripts/buildCulturalCards.js` — modify (add `--popid <id1,id2,...>` flag mirroring `buildCitizenCards.js --popid-range` pattern)
  - `scripts/buildFaithCards.js` — modify (add `--faith <id1,id2,...>` flag mirroring `buildBusinessCards.js --biz` pattern)
- **Steps:**
  1. In `buildCulturalCards.js`, add `--popid` flag parser after existing arg setup. Filter input rows by POPID before card construction. Mirror the `--popid-range` shape from `buildCitizenCards.js:73`.
  2. In `buildFaithCards.js`, add `--faith` flag parser after existing arg setup. Filter input rows by faith-org-id (check Faith_Organizations schema for canonical ID column — `FAITH-ID` or similar).
  3. Both: when neither flag is passed, behavior is unchanged (full rebuild). Daemon always passes targeted IDs.
- **Verify:**
  - `node scripts/buildCulturalCards.js --dry-run --popid CUL-001` → reports filtering to 1 row
  - `node scripts/buildFaithCards.js --dry-run --faith FAITH-001` → reports filtering to 1 row
  - `node scripts/buildCulturalCards.js --dry-run` (no flag) → reports full ~39 rows
- **Status:** [x] DONE S242 — but **corrected vs plan**: cultural already had `--cul CUL-ID` (CUL-ID is the key, col B, NOT POPID); faith has NO ID column (key = Organization name, existing `--name`). Real work = comma-list support so daemon dispatches the changed-set in one rebuild (not N spawns). Added `--popid` list to buildCitizenCards.js; extended `--biz`/`--cul` to comma-lists (backward-compatible). Verified: citizen/business/cultural each matched 2 on list dry-run. Faith unchanged (per-org `--name` dispatch).

#### Task A2: State file format + persistence

- **Files:**
  - `scripts/wdCardsDaemon.js` — create
  - `output/.wdcards-state.json` — runtime-created (gitignored via `output/**` claspignore + .gitignore)
- **Steps:**
  1. Define state file shape:
     ```json
     {
       "version": 1,
       "lastTick": "2026-05-26T18:00:00Z",
       "sheets": {
         "Simulation_Ledger": {
           "rowHashes": { "POP-00001": "sha256...", "POP-00002": "sha256..." },
           "lastBuildAt": "2026-05-26T17:55:00Z"
         },
         "Business_Ledger": { ... },
         "Cultural_Ledger": { ... },
         "Faith_Organizations": { ... },
         "Chicago_Citizens": { ... }
       },
       "markerCursor": "2026-05-26T17:55:00Z"
     }
     ```
  2. Load on startup; if missing, initialize empty (first tick = full-rebuild-baseline mode: hash everything, set baseline, do NOT dispatch rebuilds — avoids spurious mass-rebuild on cold start).
  3. Atomic write: write to `output/.wdcards-state.json.tmp`, fsync, rename. Prevents partial-write corruption on daemon crash mid-write.
- **Verify:**
  - `node scripts/wdCardsDaemon.js --once --dry-run` on fresh state → "first-tick baseline mode, no rebuilds dispatched, state file initialized"
  - Second `--once --dry-run` against unchanged sheets → "no changes detected, 0 rebuilds"
  - Manual edit a Sim_Ledger row, run third `--once --dry-run` → "POP-00XYZ changed, would dispatch buildCitizenCards --popid POP-00XYZ"
- **Status:** [x] DONE S242 — `scripts/wdCardsDaemon.js` created. Atomic tmp+fsync+rename write. Cold-start baseline mode verified (baselined:4, 0 dispatch). State shape confirmed: 858/62/42/16 rows across the 4 sheets. Gitignored via `output/**`.

#### Task A3: Row-hash diff implementation

- **Files:**
  - `scripts/wdCardsDaemon.js` — extend
- **Steps:**
  1. For each tracked upstream sheet, read all rows via `lib/sheets.js getRawSheetData(sheetName)`.
  2. Per row: extract the canonical ID column (Simulation_Ledger: POPID col A; Business_Ledger: BIZ_ID; Cultural_Ledger: POPID or CUL_ID — verify schema; Faith_Organizations: FAITH-ID or NAME — verify schema; Chicago_Citizens: CHI_ID or POPID — verify schema).
  3. Compute `sha256(JSON.stringify(row))` for the row excluding the ID column itself.
  4. Compare against `state.sheets[sheetName].rowHashes[id]`. Changed IDs → dispatch list.
  5. Map sheet → projection:
     - `Simulation_Ledger` → wd-citizens (`buildCitizenCards.js --popid-range <ids>`)
     - `Business_Ledger` → wd-business (`buildBusinessCards.js --biz <ids>`)
     - `Cultural_Ledger` → wd-cultural (`buildCulturalCards.js --popid <ids>` — Task A1)
     - `Faith_Organizations` → wd-faith (`buildFaithCards.js --faith <ids>` — Task A1)
     - `Chicago_Citizens` → wd-citizens with `--chicago` slice (or separate `buildChicagoCards.js` if exists — check repo)
  6. After dispatch, update state file with new hashes + `lastBuildAt`.
- **Verify:**
  - Synthetic test: hash sheet, manually flip 1 row in state file, run `--once --dry-run`, confirm correct ID + projection identified
  - Empirical: edit a real Sim_Ledger row (e.g., normalize POP-00036 Marcus Osei Status from `Active` back to `active` then back to `Active`), confirm daemon detects 2 sequential changes across 2 ticks
- **Status:** [x] DONE S242 — hash = sha256 of row material EXCLUDING id col + volatile cols (Sim_Ledger: LastUpdated; Cultural: Timestamp+LastSeenCycle; resolved by header name at runtime). Synthetic-flip test across all 4 sheets detected the exact changed ID + correct dispatch format: `--popid POP-00001` / `--biz BIZ-00001` / `--cul CUL-3913E3E5` (col-B key) / `--name "Telegraph Presbyterian Fellowship"` (quoted, per-org). Dry-run leaves changes PENDING (re-reports, doesn't consume) so a dry-run period can't swallow a real change before live enable.

#### Task A4: Dispatcher with failure handling

- **Files:**
  - `scripts/wdCardsDaemon.js` — extend
  - `lib/sheets.js` — read-only consumer (no changes)
- **Steps:**
  1. Dispatch via `child_process.execFileSync('node', [scriptPath, '--apply', flag, idList], { encoding: 'utf8', timeout: 120000 })`. Serialize per projection (no parallel — Supermemory API rate-limit safety + clearer logs).
  2. Capture stdout + stderr. If exit code != 0 OR stderr matches `/Errors: [1-9]/` (existing build-script Errors-gate signal), classify as failure.
  3. On failure: append row to `Engine_Errors` via `lib/sheets.js appendRows`:
     ```
     [timestamp, 'wd-cards-daemon', source, projection, idList, stderrExcerpt(first 500 chars)]
     ```
     where `source` ∈ {`marker`, `rowhash`}. Schema: cycle-style row matching existing Engine_Errors shape (verify cols against live sheet).
  4. Failed dispatch does NOT update state file for that projection's hashes — guarantees next tick retries the same IDs.
  5. Successful dispatch updates state file atomically.
- **Verify:**
  - Simulate failure: chmod -x a build script momentarily, run `--once`, confirm Engine_Errors row appended + daemon continues + state file unchanged for that projection
  - Restore + re-run `--once` → confirm retry happens + success path updates state
- **Status:** [x] DONE S242 — execFile dispatch, serialized; failure = non-zero exit OR `/Errors: [1-9]/` in stdout. LIVE failure test (broke builder, 1 synthetic change): execFile errored → appended Engine_Errors row [ts, '', 'wd-cards-daemon', 'wd-citizens rebuild failed for: POP-00001', stderr-excerpt, 'CardRebuildFailure', 'daemon-rowhash', 'WARN'] → daemon continued (didn't crash) → state NOT advanced for citizens (still flipped → retry-safe). 0 Supermemory writes (builder failed before write). One diagnostic test row left in Engine_Errors.

#### Task A5: Polling loop + signal handling

- **Files:**
  - `scripts/wdCardsDaemon.js` — extend
- **Steps:**
  1. Main loop: `while (running) { await tick(); await sleep(pollIntervalMs); }`
  2. Read interval from env: `WD_CARDS_POLL_SECONDS` (default 300).
  3. SIGTERM / SIGINT handler: set `running = false`, finish current tick gracefully, exit 0. pm2 restart-friendly.
  4. CLI modes:
     - `--once` → run 1 tick + exit
     - `--dry-run` → log dispatches without firing
     - `--rebuild-all <projection>` → full rebuild bypass, useful for cold-cache reseed
     - (default — no flags) → loop forever
  5. Console output per tick (1 line summary): `[ts] tick #N | sheets:5 | marker:K rebuilds | rowhash:M rebuilds | failures:F | next:300s`
- **Verify:**
  - `timeout 60 node scripts/wdCardsDaemon.js --dry-run` exits cleanly after 60s with at least 1 tick logged
  - Send SIGTERM to running daemon mid-tick → confirms graceful shutdown + exit 0
- **Status:** [x] DONE S242 — loop sleeps in 1s slices for signal responsiveness. CLI: `--once`, `--dry-run`, `--rebuild-all <projection>`. SIGTERM/SIGINT → finish current tick → "stopped cleanly" → exit 0 (verified: multi-tick loop at poll=2s, SIGTERM caught, clean exit).

#### Task A6: pm2 ecosystem entry

- **Files:**
  - `ecosystem.config.js` — modify (add `wd-cards-daemon` entry alongside existing `godworld-dashboard` + `mags-bot` + `moltbook` + `spacemolt-miner`)
- **Steps:**
  1. Add app block:
     ```js
     {
       name: 'wd-cards-daemon',
       script: 'scripts/wdCardsDaemon.js',
       cwd: '/root/GodWorld',
       env: { WD_CARDS_POLL_SECONDS: '300' },
       autorestart: true,
       max_memory_restart: '256M',
       log_date_format: 'YYYY-MM-DD HH:mm:ss',
       error_file: '/root/.pm2/logs/wd-cards-daemon-error.log',
       out_file: '/root/.pm2/logs/wd-cards-daemon-out.log',
     }
     ```
  2. Do NOT auto-start in this task. Start happens in Task A8 after dry-run smoke.
- **Verify:**
  - `pm2 ecosystem` parses without error
  - `pm2 list` shows `wd-cards-daemon` as stopped (entry present, not running)
- **Status:** [x] DONE S242 — entry added to `ecosystem.config.js` (5th app), matching existing `logs/` + `env_file` conventions (NOT plan's `/root/.pm2/logs/`). autorestart, max_memory_restart 256M, WD_CARDS_POLL_SECONDS=300. Parse-verified via require(). NOT started — live enable is gated (A8).

#### Task A7: Dry-run smoke

- **Files:** none modified
- **Steps:**
  1. `pm2 start ecosystem.config.js --only wd-cards-daemon -- --dry-run`
  2. Watch `pm2 logs wd-cards-daemon` for 1 full poll cycle (5 min).
  3. Confirm first tick is baseline mode (no dispatches).
  4. Make a 1-cell sheet edit (low-risk: bump a non-canon comment cell, or normalize a benign Status). Wait for next tick.
  5. Confirm daemon detects the edit + logs "would dispatch" line with correct projection + ID.
  6. `pm2 stop wd-cards-daemon`. Inspect `output/.wdcards-state.json` for shape sanity.
- **Verify:**
  - 2 ticks logged with correct timestamps
  - State file present + has all 5 sheets with non-empty rowHashes
  - Detected edit's ID matches the row I edited
- **Status:** [x] DONE S242 — collapsed into live start: state was already baselined (foreground dry-runs), so the daemon's first live pm2 tick was inherently write-free (rebuilds:0) — that IS the no-writes smoke. Confirmed online under pm2 (id 4).

#### Task A8: Enable live + 1-hour monitor

- **Files:**
  - `ecosystem.config.js` — modify (remove `-- --dry-run` from any test invocation)
- **Steps:**
  1. `pm2 start ecosystem.config.js --only wd-cards-daemon` (no --dry-run, runs live).
  2. `pm2 save` to persist process list across reboot.
  3. Make a controlled test edit to a sandboxed citizen row (low-canon: pick a Tier-4 generic, change a non-canon col, observe rebuild fires within 5 min).
  4. MCP cross-check: `lookup_citizen <test-citizen-name>` returns updated data.
  5. Monitor `pm2 logs wd-cards-daemon --lines 100` for 1 hour. Watch for: false positives (rebuilds on unchanged rows), missed detections, rate-limit failures, state-file size growth.
  6. If all clean: Phase A is shipped.
- **Verify:**
  - 12 ticks logged across the hour with consistent shape
  - 0 false positives (no rebuilds without a real edit)
  - Test-edit detected + rebuilt within 1 tick
  - MCP lookup returns fresh data post-rebuild
- **Status:** [x] DONE S242 (Mike go-call) — daemon LIVE under pm2 (id 4, poll 300s). Live success path proven via synthetic state-flip on POP-00036 (zero ledger mutation — card rewritten with identical current data): detected → live dispatch → rebuilds:1, failures:0 (~12s) → MCP `lookup_citizen "Marcus Osei"` returns card with `updatedAt 2026-05-29T01:16:21Z` matching the rebuild timestamp. End-to-end loop confirmed.
- **TRAILING (2 items, not blocking):**
  1. **pm2 save for reboot-persistence** (acceptance #1) — DEFERRED: mags-bot/moltbook/spacemolt currently stopped; `pm2 save` now would persist them stopped + break their resurrect. Do once the full intended process set is up (or at a session-end `pm2 restart` + save).
  2. **Backlog rebuild** — cold-start baselined current state; the already-stale T12/T13 cards were NOT retroactively rebuilt. Run `node scripts/wdCardsDaemon.js --rebuild-all citizens|business|cultural|faith` (or per-projection) once to clear the existing backlog — separate ~966-card burst, do deliberately.

---

### Phase B — Phase 10 cycle-end hook (eliminates 5-min lag at cycle handoff)

Phase A catches operator backfills + UI edits but introduces up-to-5-min lag for engine-cycle writes. Phase B drains the lag for cycle handoff. Lives in Apps Script + adds to the cycle critical path — fresh session, dedicated smoke-test window, separate clasp push.

#### Task B1: Create `Wd_Card_Rebuild_Queue` marker tab

- **Files:**
  - One-time sheet creation (NOT in code) OR `scripts/createWdCardRebuildQueue.js` — create
- **Steps:**
  1. Schema:
     ```
     Cycle | Timestamp | Source | Projection | IdList | Status
     ```
     Where Status ∈ {`pending`, `claimed`, `done`, `failed`}. `claimed` is set when daemon picks up the row (atomic-read-then-update pattern); prevents double-dispatch if daemon restart mid-tick.
  2. Either: (a) ship a one-shot Node script that creates the tab via `lib/sheets.js createSheet('Wd_Card_Rebuild_Queue', headers)`, OR (b) document the tab creation as an operator step in the engine.md exceptions list — Mike runs once.
- **Verify:** `lib/sheets.js getRawSheetData('Wd_Card_Rebuild_Queue')` returns just the header row
- **Status:** [ ] not started

#### Task B2: Phase 10 hook — emit marker row

- **Files:**
  - `phase01-config/godWorldEngine2.js` — modify (Phase 10 post-batchUpdate point)
  - OR a new dedicated `phase10-persistence/emitWdCardMarker.js` — create (preferred — keeps Phase 10 helpers atomic)
- **Steps:**
  1. After Phase 10's `batchUpdate` commits successfully, scan `ctx.writeIntents` (and/or `ctx.writeIntentsApplied`) for upstream-sheet targets.
  2. Build per-projection ID lists by extracting POPIDs / BIZIDs / etc. from intent target row references.
  3. For each affected projection, `queueAppendIntent_('Wd_Card_Rebuild_Queue', [cycle, isoTimestamp, 'cycle-end', projection, idList.join(','), 'pending'])`. Use the intent pattern (NOT direct write) — keeps the marker write inside the Phase 10 batch contract.
  4. If `ctx.writeIntents` does not yet carry sufficient metadata to derive POPIDs from row references (e.g., intents store `(sheet, row, col, value)` not `(sheet, rowId)`), Task B2a is needed first.
- **Verify:**
  - Dry-run a synthetic cycle with 1 known writer (e.g., applyDemographicDrift bumping a single POPID's Income), confirm marker row appears post-cycle with that POPID in IdList
  - Multi-writer cycle: confirm IdList contains all affected POPIDs deduped
- **Status:** [ ] not started

#### Task B2a (CONDITIONAL): Enrich writeIntents with row-ID metadata

- **When:** only if Task B2 reveals `ctx.writeIntents` shape lacks row-ID metadata needed to derive POPIDs/BIZIDs without an extra sheet read.
- **Files:**
  - `utilities/writeIntents.js` — modify (extend intent shape with `{rowId}` field on write-intent helpers — `queueCellIntent_`, `queueRangeIntent_`, `queueAppendIntent_`)
  - Callers across phase01-10 — modify to pass rowId at intent-creation sites
- **Steps:**
  1. Inventory intent callers (`grep -rn "queueCellIntent_\|queueRangeIntent_\|queueAppendIntent_" phase*/`).
  2. For each caller targeting an upstream sheet (5 sheets in scope), inject rowId from the caller's row context.
  3. Backfill rowId via sheet row-num → ID lookup as fallback for callers that can't easily provide it (sheet read at hook time, cached per cycle).
- **Verify:**
  - All upstream-sheet writes carry rowId after the refactor
  - Pre-refactor test cycle: confirm Phase 10 hook can derive POPIDs without an extra full-sheet read
- **Status:** [ ] not started — conditional on B2 findings

#### Task B3: Daemon enhancement — drain marker tab on each tick

- **Files:**
  - `scripts/wdCardsDaemon.js` — extend
- **Steps:**
  1. At tick start, BEFORE row-hash polling:
     a. Read `Wd_Card_Rebuild_Queue` rows where Status = `pending`.
     b. Atomically update those rows to Status = `claimed` (use `lib/sheets.js batchUpdate` with row-num targeting + previous-value-check if available; otherwise update-then-re-read to verify no overlap from another daemon instance).
     c. Group claimed rows by Projection. Dispatch via existing Task A4 mechanism with `source='marker'`.
     d. On success: update Status = `done` with `lastBuildAt` timestamp.
     e. On failure: update Status = `failed` with stderrExcerpt. Next tick re-classifies failed rows back to pending after backoff window (configurable, default 1 tick).
  2. Then continue with row-hash polling for non-marker cases (catches manual UI edits between cycle ticks).
- **Verify:**
  - Synthetic: manually insert a pending marker row, confirm daemon drains it on next tick + correct rebuild fires
  - Failure-then-retry: simulate failure, confirm row marked `failed`, then succeeds on retry tick
- **Status:** [ ] not started

#### Task B4: Cycle smoke test

- **Files:** none modified
- **Steps:**
  1. Pre-deploy: daemon running live (Phase A complete) + Phase B hook deployed to staging-equivalent OR direct to prod with rollback plan.
  2. Run 1 full cycle.
  3. Watch `Wd_Card_Rebuild_Queue` populate during Phase 10.
  4. Watch daemon logs for marker drain on next tick (within `poll_interval_seconds` or sooner if tick happens to align).
  5. MCP cross-check: pick a citizen the cycle touched, verify `lookup_citizen <name>` returns updated data within 1 tick of cycle end.
  6. Inspect Engine_Errors for any failures.
- **Verify:**
  - Marker tab shows N pending → N claimed → N done within the smoke window
  - 0 entries in Engine_Errors sourced from `daemon-marker`
  - MCP returns fresh data
- **Status:** [ ] not started

---

### Phase C — Monitoring + tuning

Trailing maintenance; not required for completion but recommended within 2-3 cycles of Phase B going live.

#### Task C1: Daemon health metrics surfaced in dashboard

- **Files:**
  - `dashboard/server.js` — modify (add `/api/wd-cards-daemon-health` endpoint reading state file + pm2 status)
  - Dashboard frontend — modify (add small health panel)
- **Steps:**
  1. Endpoint returns: { ticksLast24h, rebuildsLast24h, failuresLast24h, lastTickAt, poolStatus: pm2 status }.
  2. Panel renders green/yellow/red based on lastTickAt staleness (yellow if > 2x pollInterval, red if > 5x).
- **Verify:** dashboard panel renders + shows live data
- **Status:** [ ] not started

#### Task C2: Poll-interval tuning

- **Files:**
  - `ecosystem.config.js` — modify (adjust WD_CARDS_POLL_SECONDS if observation warrants)
- **Steps:** observe 1 week of live daemon data; if write frequency is low (most ticks have 0 rebuilds), tune up to 600s (10 min) to save CPU. If write frequency is high (most ticks have rebuilds + lag complaints), tune down to 120s (2 min).
- **Verify:** post-tune, daemon survives 24h without behavior regression
- **Status:** [ ] not started

#### Task C3: Cold-start full rebuild command

- **Files:**
  - `scripts/wdCardsDaemon.js` — extend (verify `--rebuild-all <projection>` from Task A5 is wired)
- **Steps:** document the command in `docs/OPERATIONS.md` for the case where state file is corrupted or Supermemory containers need wholesale refresh.
- **Verify:** `node scripts/wdCardsDaemon.js --rebuild-all citizens` rebuilds all wd-citizens cards + updates state file baseline
- **Status:** [ ] not started

---

## Risks

1. **Marker tab as cycle-critical path.** Phase B writes a marker row inside Phase 10's batch. If the marker append fails inside the engine batch, the cycle still commits (marker is queued via `queueAppendIntent_` not direct write — Phase 10's batchUpdate atomicity covers it). If Phase 10 itself fails, marker doesn't write, but daemon's row-hash polling catches the writes within `poll_interval_seconds`. Two-layer safety.

2. **Supermemory API rate limits during burst rebuild.** Existing `build*Cards.js --apply` scripts already throttle internally (verify per-script). Daemon serializes per projection (no parallel dispatch) to add a second throttle layer. If a single cycle touches all 836 citizens (mass-migration scenario), the rebuild burst could trip rate limits. Mitigation: daemon batches IDs into chunks ≤ 50 per dispatch, with a 2s sleep between chunks. Add when needed; not premature.

3. **Race conditions on marker tab.** Two daemon instances accidentally running (operator forgets to stop one before starting another) would double-dispatch. Mitigation: atomic claim pattern in Task B3 (read pending → update to claimed → only claimed rows dispatch). If pm2 enforces single-instance per name (it does), this is belt-and-suspenders.

4. **State file corruption on disk-full or crash mid-write.** Atomic write pattern (tmp + rename in Task A2) prevents partial writes. Cold-start full-rebuild command (Task C3) is the recovery escape hatch.

5. **Drift between row-hash detection and actual content rebuild.** If a row is hashed at time T1, daemon detects change at T2, but another writer modifies the same row at T2.5 before the build script reads it — the build script captures T2.5 state. Hash at T2 was already "stale" but the rebuild captures latest. This is desirable behavior (eventual consistency on latest state) — call out so future-me doesn't try to "fix" it.

6. **Hook adds latency to cycle Phase 10.** Marker append is 1 `queueAppendIntent_` call, ~negligible compared to other Phase 10 writes. Empirical observation during B4 smoke will confirm.

7. **Daemon as new pm2 process to monitor.** Adds 1 more thing to the failure surface. Mitigation: max_memory_restart guard, structured logs, dashboard health panel (Task C1). Acceptable cost given the substrate value (no more "did we rebuild?" rituals).

---

## Open questions

1. **wd-neighborhood + wd-initiative scope.** Both projections derive from engine state (Neighborhood_Map + Initiative_Tracker — both written by engine, rarely by operator). Phase B cycle-hook covers them via the marker. Phase A row-hash polling: include them? Argument for: catches the rare operator-edited case. Argument against: doubles state file size + tick work for low payoff. **Default: include in Phase A row-hash polling for completeness; tune out in Task C2 if cost outweighs benefit.**

2. **wd-player-truesource scope.** Driven by `ingestPlayerTrueSource.js` — operator-fired, rare cadence (post-season + roster updates). Could include in Phase A but the cadence is so coarse that manual-trigger-after-ingest is fine. **Default: exclude from Phase A; revisit if it becomes a friction point.**

3. **Chicago_Citizens projection mapping.** Per engine.md S229 entry, `generateChicagoCitizens.js` is DISABLED. Chicago_Citizens pool is frozen at ~124 rows. wd-citizens currently doesn't slice Chicago separately. **Default: include Chicago_Citizens in row-hash polling so manual canon edits to Chicago entities trigger wd-citizens rebuild for that POPID. Verify Chicago POPID format matches main Sim_Ledger POPID format.**

4. **Should the daemon log to its own tab rather than Engine_Errors?** Engine_Errors mixes cycle-failures with daemon-failures, which complicates triage. **Default: same tab with `source` discriminator (Task A4 schema). Reconsider if mixed signal becomes confusing in practice.**

5. **What about wd-summary?** Per-cycle world summary tag, written by post-publish skill via API, no `build*Cards.js` writer. Not in engine.27 scope. **Default: out of scope; post-publish already handles its own write.**

---

## Why this shape (decision record)

Four trigger options were filed in the original engine.27 row:

| Option | Catches operator backfills | Catches UI edits | Catches cycle writes | Latency at cycle handoff |
|---|---|---|---|---|
| (a) per-cycle batch only | ❌ | ❌ | ✅ | seconds |
| (b) per-script only | ✅ if every writer opts in | ❌ | ✅ if engine opts in | seconds |
| (c) daemon only | ✅ | ✅ | ✅ | up to poll_interval |
| (d) hybrid (a + c) | ✅ | ✅ | ✅ | seconds at cycle, poll_interval otherwise |

(d) is the only option that covers all three case classes with minimal latency at the most-critical case (cycle handoff to media pipeline). (a) misses the originating pain point (canon.3 T12/T13 operator backfills). (b) is fragile (every future writer must remember to opt in — distributed coupling) and misses UI edits. (c) alone introduces lag at cycle handoff. (d) gets full coverage by composing the two simplest mechanisms — Apps Script writes a marker, Node polls for it AND row-hashes the source sheets.

**Phase staging is the substrate-risk pattern.** Phase A ships standalone (pure Node, no engine touch, no clasp push). Phase B touches the engine critical path + requires its own smoke-test window. Per S199 measure-twice + S237 plan-vs-per-file-analysis discipline, separate sessions for separate substrate risks.

---

## Status log

### engine.27 — status (drained from ROLLOUT, 2026-06-26 / S274)

wd-card auto-invalidation hook — upstream sheet writes (Sim_Ledger/Business/Cultural/Faith/Chicago) trigger downstream wd-card rebuilds. **Phase A DONE + LIVE S242** (daemon `scripts/wdCardsDaemon.js` under pm2 id 4, 300s poll; A1–A8; live loop proven end-to-end). **OPEN: Phase B** (Phase 10 cycle-end marker hook, Apps Script) + **Phase C** (monitoring/tuning) + 2 trailing non-blockers (pm2-save persistence, one-time --rebuild-all backlog). **S270 readiness assessment (engine-sheet):** Phase A daemon healthy (online 19d, 2 restarts, pm2 `wd-cards-daemon`); it already row-hash-diffs all 4 projections per poll → coverage complete, only ≤5min lag at cycle handoff remains. **B2a (writeIntents row-ID enrichment) is AVOIDABLE** — read the intent shapes (`utilities/writeIntents.js`): cell intents carry row-index+col but NOT POPID, mid-sheet range intents lack col A, so an Apps Script hook can't enumerate exact POPIDs without a sheet read or the B2a refactor; BUT the daemon already computes exact changed IDs via its diff, so the marker only needs to name the **projection touched** (trigger, not payload). Collapses Phase B to B1+B2+B3+B4, no B2a. **DISPOSITION: build HELD post-C100 (deploy-attribution).** B2 is Apps Script → would ride the next clasp push as a 4th change (alongside tier1EssenceEvents rider + Row 8 processAdvancementIntake migration + 2 manual deletes), breaking attribution on the C100 chaos window. Phase A covers the gap at ≤5min meanwhile. Sequence Phase B as its own deliberate build+deploy AFTER C100 chaos + Row 8 clear. Pattern: feedback_measure-twice-cascading-effects

## Changelog

- 2026-05-26 — Plan written (S238 engine-sheet). Hybrid option (d) recommended; 3-phase rollout. Filed for engine.27 row state transition `needs-info` → `ready`.
- 2026-05-28 — **Phase A COMPLETE + LIVE (S242 engine-sheet).** Tasks A1–A8 DONE. Daemon running under pm2 (id 4, poll 300s); live success path proven end-to-end (synthetic flip → rebuild → MCP fresh read). Two trailing non-blockers: pm2-save reboot-persistence (deferred — stopped services) + one-time backlog rebuild for stale T12/T13 cards. Measure-twice corrections to the plan's projection map (advisor-reviewed before build): (1) cultural keys on **CUL-ID col B**, not POPID — `--cul` already existed; (2) **Faith_Organizations has no ID column** — key is Organization name, `--name` already existed; A1 became comma-list support (one targeted rebuild vs N per-ID spawns) not new flags; (3) **Chicago_Citizens EXCLUDED** — no `build*Cards.js` consumes it (DISABLED/frozen); (4) **neighborhood + initiative EXCLUDED from Phase A** — engine-cycle-written, belong on Phase B's marker (neighborhood also aggregates 3 sheets, no 1:1 map); (5) hash excludes volatile bookkeeping cols (Sim LastUpdated; Cultural Timestamp+LastSeenCycle) to protect the A8 "0 false positives" criterion. Pattern: feedback_measure-twice-cascading-effects. Files: `scripts/wdCardsDaemon.js` (new), `scripts/buildCitizenCards.js` + `buildBusinessCards.js` + `buildCulturalCards.js` (comma-list flags), `ecosystem.config.js` (stopped pm2 entry). No clasp push (pure Node). One diagnostic test row left in Engine_Errors from the A4 live failure test.

---

## Relocated ROLLOUT_PLAN row detail — 2026-07-02 (S286 pointer-collapse)

Verbatim rows moved out of ROLLOUT_PLAN.md when it collapsed to pointer-only. This is the working detail for the open job(s); the rollout row is one line pointing here.

### engine.27

| engine.27 | wd-card auto-invalidation hook — upstream sheet writes (Sim_Ledger/Business/Cultural/Faith/Chicago) trigger downstream wd-card rebuilds. **Phase A DONE + LIVE S242** (daemon `scripts/wdCardsDaemon.js` under pm2 id 4, 300s poll; A1–A8; live loop proven end-to-end). **OPEN: Phase B** (Phase 10 cycle-end marker hook, Apps Script) + **Phase C** (monitoring/tuning) + 2 trailing non-blockers (pm2-save persistence, one-time --rebuild-all backlog). **S270 readiness assessment (engine-sheet):** Phase A daemon healthy (online 19d, 2 restarts, pm2 `wd-cards-daemon`); it already row-hash-diffs all 4 projections per poll → coverage complete, only ≤5min lag at cycle handoff remains. **B2a (writeIntents row-ID enrichment) is AVOIDABLE** — read the intent shapes (`utilities/writeIntents.js`): cell intents carry row-index+col but NOT POPID, mid-sheet range intents lack col A, so an Apps Script hook can't enumerate exact POPIDs without a sheet read or the B2a refactor; BUT the daemon already computes exact changed IDs via its diff, so the marker only needs to name the **projection touched** (trigger, not payload). Collapses Phase B to B1+B2+B3+B4, no B2a. **DISPOSITION: build HELD post-C100 (deploy-attribution).** B2 is Apps Script → would ride the next clasp push as a 4th change (alongside tier1EssenceEvents rider + Row 8 processAdvancementIntake migration + 2 manual deletes), breaking attribution on the C100 chaos window. Phase A covers the gap at ≤5min meanwhile. Sequence Phase B as its own deliberate build+deploy AFTER C100 chaos + Row 8 clear. Pattern: feedback_measure-twice-cascading-effects | in-progress | engine-sheet | [[../plans/2026-05-26-engine-27-wd-card-auto-invalidation]] (15-task design) |

