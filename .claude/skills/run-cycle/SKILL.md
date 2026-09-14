---
name: run-cycle
description: Orchestrate a full engine cycle — pre-flight, pre-mortem, engine run, engine review, world summary.
version: "1.1"
updated: 2026-05-24
tags: [engine-sheet, active]
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
---

# /run-cycle — Engine Cycle Orchestrator

## Purpose

Runs the full engine cycle pipeline by calling individual skills in order. Each step produces output on disk that the next step reads.

## The Chain

### Step 1: /pre-flight
Verify manual inputs are ready — sports feed entries, initiative tracker structure, coverage ratings from last edition. Citizen/business/storyline intake not wired yet (placeholder).

**Gate:** READY → proceed. NOT READY → stop and fix.

### Step 2: /pre-mortem
Scan engine code for determinism violations, dependency chain breaks, sheet header misalignment, cascade risks.

**Gate:** CLEAN → proceed. CRITICAL → stop and fix.

### Step 3: Run Cycle
The builder fires `runWorldCycle()` on the live sheet. The engine runs in Google's cloud — nothing here triggers it, and the builder runs nothing else for this chain. Confirm the fire from the sheet, never from a message: `Neighborhood_Map` max Cycle = {XX}, `Engine_Errors` row count.

**Gate:** live sheet reads cycle {XX}.

### Step 3.5: Execution log to disk (S456)

The builder exports the Apps Script execution log to Drive as `Execution log LIVE {XX}.txt` (or shares a link). Save it next to the cycle's artifacts — the review reads phase timings, warnings and the `Cycle completed` line from disk, not from a pasted transcript, and a later session can diff C{XX} against C{XX−1}.

```bash
node scripts/fetchExecutionLog.js {XX} --summary                 # Drive search by name (service account reads anything shared with it)
node scripts/fetchExecutionLog.js {XX} --file <drive id or url>  # explicit file
```

Output: `output/execution_log_c{XX}.txt`. `--summary` prints phases / totalMs / failed phases / slowest five / warning and error counts. Non-blocking: if the log is not on Drive yet, note "execution log not on disk" in the review header and continue — everything below reads the sheet, not the log.

**Gate:** file on disk with `Execution started` … `Cycle completed`; `failedPhases: []`.

### Step 4: /engine-review
Read world state from sheets. Identify ailments, improvements, incoherence. Produce 7-field briefs per finding. Output: `output/engine_review_c{XX}.md`

**Who reads what (S456 — the chain ships to crons, there is no sift / edition step downstream):**
- `output/engine_audit_c{XX}.json` — `buildWorldSummary` (desk_signal civic lane = every pattern), `cron-civic-run`, `buildCivicOfficeSlice`, `buildJaxSlice`, `civicMustDecide`, `tierClassifier`.
- `output/baseline_briefs_c{XX}.json` — **required input** of `cron-civic-run.js` (`mustJson`). A brief that is not a world event reaches the Sunday chain.
- `output/engine_anomalies_c{XX}.json` — `tierClassifier` (optional).
- `output/engine_review_c{XX}.md` — pointer only (`buildWorldState` links it; `rheaTwoPass` / `lintCivicPackets` read it). Write it for the next engine session and the civic chain's reader, not for a front page: what is real, what is mechanism, what is routed to engine-debug.

**Hand writes between fires (G-EC86):** any sheet cell the builder or this seat set by hand after C{XX−1} fired is part of C{XX−1}'s closing state. Correct the prior audit snapshot (`engine_audit_c{XX-1}.json` `snapshots.*`, add a `snapshotNotes` entry) **before** running the auditor, or the diff files the write as a world event (C107: nine approval-shift briefs and an "Ashford 45→67" anomaly that were the approval rebase). Re-run the auditor after the correction; the run is idempotent.

**Gate:** File exists on disk; briefs and anomalies carry no hand-write artifacts.

### Step 5: /build-world-summary
Read Riley_Digest (3 cycles), Sports Feed (3 cycles), civic production log (if exists), and engine review output. Produce factual world summary. Output: `output/world_summary_c{XX}.md`. Ingest to world-data Supermemory. The writer also emits `output/desk_signal_c{XX}.json` (engine.76 W5 half 1) — per-desk signal partition, pointers only, consumed by `/desk-slice` and the headless writer-wakes.

**Ingest (S432 — this is the cycle-time write, not post-publish's):** the summary and its `Snapshot:` line go into the `world-data` container here, tagged `wd-summary` / `wd-snapshot`. Before S432 the only ingest lived in `/post-publish` Step 2c (`--type edition` only), so cycles without an edition (C103–C106) never reached world-data and `search_world` answered from C102. Post-publish 2c stays as the re-ingest on publish; run both.

```bash
source ~/.bashrc && XX={XX} && for tag in wd-summary wd-snapshot; do
  if [ "$tag" = wd-summary ]; then C=$(jq -n --rawfile c output/world_summary_c$XX.md '$c'); T=cycle_summary; else C=$(jq -n --arg c "$(grep -m1 '^Snapshot: Cycle ' output/world_summary_c$XX.md)" '$c'); T=cycle_snapshot; fi
  curl -s -X POST https://api.supermemory.ai/v3/documents -H "Authorization: Bearer $SUPERMEMORY_CC_API_KEY" -H "Content-Type: application/json" \
    -d "$(jq -n --argjson content "$C" --arg cycle "$XX" --arg tag "$tag" --arg type "$T" '{content: $content, containerTags: ["world-data", $tag], metadata: {type: $type, cycle: $cycle}}')" | jq -r '.id // .error'
done
```

**Gate:** File exists on disk + both POSTs return a doc id.

### Step 5.5: Neighborhood texture (citizen perception — research.19 T2)

Translate the cycle's per-hood engine signal into the lived particulars a resident would *notice* — the shared, frozen perception artifact the citizen-wake loop reads. **Wake-input only — never published, never canon.**

```bash
node scripts/buildNeighborhoodTexture.js {XX}
```

Reads the same Riley_Digest + Neighborhood_Map sources as Step 5 (structured, not the world_summary markdown), runs ONE batched DeepSeek generation (~21 short blocks), deterministic real-name blocklist sweep (fail-loud). Output: `output/neighborhood_texture_c{XX}.md`, frozen for the cycle. Hoods with no engine signal get a quiet-week line (no invented drama). The cron `citizen-wake.js` reads each citizen's hood block via `loadNeighborhoodTexture` and injects it as `Around your neighborhood:`. Adds one cheap LLM gen/cycle; degrades gracefully (wake omits the line) if absent.

**Gate:** File exists on disk.

### Step 5.55: Voice disposition cache refresh (engine.43 T2)

Refresh the live disposition cache the citizen-voice agents boot from — one file per voiced citizen, derived from post-cycle `DialState` via the same `citizenDials.disposition()` call the wake loop uses. **Wake/interview/Discord-input only — never supersedes IDENTITY.md ESTABLISHED CANON.**

```bash
node scripts/refreshVoiceDispositionCache.js --live {XX}
```

Output: `output/voice-disposition-cache/<POPID>.md` (phrase + `Refreshed: c{XX}` stamp). Agent-count-agnostic — picks up any `.claude/agents/citizen-voice-*/IDENTITY.md`. Voice agents fail open to their authored IDENTITY.md disposition if a cache file is missing.

**Gate:** All cache files' `Refreshed:` stamp shows c{XX}.

### Step 5.56: Ledger snapshot refresh (S329)

Refresh the disk snapshot that backs every search channel's "most authoritative" shelf (`lib/mags.searchDisk` rank-0 + MCP `search_everything`). Moved here from city-hall-prep Step 1.5 (S329): the refresh must ride the cycle path, not a downstream pipeline — the C101 run logged "refreshed" while the file sat 10 days stale, which is how Discord personas stopped seeing the Richards trade.

```bash
node scripts/dumpLedger.js {XX} --quiet
```

**Gate:** `output/simulation_ledger_snapshot.meta.json` read back shows `"cycle": {XX}` and current `generatedAt`. Never report this step done from the command exit alone.

**Beat-tab dump (pipeline.68 Task 1, S433):** the same seam carries the reporters' world. One free read of the 14 beat tabs (Business_Ledger, Employment_Roster, Casino_Ledger, Transit_Metrics, Crime_Metrics, Neighborhood_Demographics, Hospital_Ledger, Health_Cause_Queue, Community_Programs, Faith_Organizations, Cycle_Weather, Household_Ledger, Story_Seed_Deck, Story_Hook_Deck) to `output/beats/*.jsonl`; the prior cycle rotates to `output/beats/prev/` so builders can compute what moved. Every `scripts/build*Slice.js` reads this instead of the crisis lane (Tasks 2–4 of the plan). Same monotonic-stamp rule as dumpLedger.

```bash
node scripts/dumpBeatTabs.js {XX} --quiet
```

**Gate:** `output/beats/meta.json` shows `"cycle": {XX}` and 14 entries under `rows`; a missing tab aborts the script (schema event, not a soft skip).

### Step 5.6: Content-ledger drafter (engine.49 T4)

Draft condition-gated Event_Content_Ledger rows from what this cycle actually produced (Story_Seed_Deck seeds, Neighborhood_Map pressures, Cycle_Seeds weather/holiday). Cheap-helper LLM (OpenRouter deepseek default), never premium tokens.

```bash
node scripts/draftContentRows.js --cycle {XX} --apply
```

Validation is parity-by-execution — every candidate runs through the real `loadEventContentLedger_`, so a row the loader would skip is never written. Caps 10/3/2 + dedup + `auth:auto` provenance; rows land `Active=yes` (T4 auto-active — the fail-closed loader is the standing guard, `Active=no` in-sheet is Mike's kill switch). Script prints a draft report (written / invalid / dup / capped) and readback-verifies the append. If OpenRouter is unreachable it exits 1 with `ERR` — treat as non-blocking for the rest of the chain (the cycle already ran; pools just don't grow this cycle). Don't retry-loop; note the miss in the Step 6 gap log.

Plan: `docs/archive/plans/2026-07-06-content-ledger-auto-authoring.md` (engine.49).

**Gate:** Draft report printed; on `--apply`, script exits 0 with rows verified (0 written is a valid outcome on a quiet cycle).

### Step 5.7: Initiative packets refresh (G-PREP1)

Refresh the derived initiative JSON from the live sheet so downstream skills never read stale phases (C100: `initiative_tracker.json` carried past-cycle nextActionCycle values while the live sheet had moved on).

```bash
node scripts/buildInitiativePackets.js {XX}
```

**Gate:** `output/initiative_tracker.json` regenerated this run (mtime is this session).

### Step 5.8: Desk packets + base_context refresh (S311)

Rebuild `output/desk-packets/base_context.json` + the 9 desk packets at cycle time. Before S311 this only fired at post-publish Step 5b, so every cycle-run left base_context stale (Discord bot's `lib/mags.js loadWorldState()` reported the prior cycle, and /write-edition desks read prior-cycle packets) until the next edition published. Same gap-shape G-PREP1 closed for initiative packets at Step 5.7.

```bash
node scripts/buildDeskPackets.js {XX}
```

**Gate:** `jq '.baseContext.cycle' output/desk-packets/base_context.json` matches `{XX}` — the field is **nested**; top-level `.cycle` returns `null` and false-alarms (G-P-C99-1). Post-publish Step 5b stays — it re-refreshes after publication so edition-coverage data lands; the script is idempotent.

### Step 5.85: World-state fold (engine.76 W3)

Fold the cycle's cron-consumer inputs into the single artifact the 24/7 loops read — `output/world_state.json`. Deterministic assembler, no LLM: live Riley_Digest orientation + base_context canon (staleness-flagged) + Step 5.5 hood blocks + Step 5.55 dispositions + pointers to the deep artifacts. Consumers: mags-discord-bot / discord-reflection (`lib/mags.loadWorldState`), citizen-wake + citizen-exchange (`lib/wakePerception.loadNeighborhoodTexture`), cron-desk-writer fallback path. All consumers fail back to the pre-W3 per-file reads if the fold is absent or cycle-mismatched.

```bash
node scripts/buildWorldState.js {XX}
```

**Gate:** Script prints `wrote .../world_state.json` with cycle {XX} + hood/disposition counts, and `canon current` — not `canon STALE`, not `canon absent`. Size is the tell: the correct fold is ~55KB; ~5KB means canon-less.

**Ordering, G-PF25 (S407) — this step was 5.57 and ran BEFORE Step 5.8.** It folds the `base_context.json` that 5.8 produces, so following the documented order exactly wrote a 5,465-byte `world_state.json` (correct: 55,684) carrying the note `canon absent: base_context.json unreadable — ENOENT`, and exited 0 while doing it. `world_state.json` is the one artifact every 24/7 loop reads, so all of them ran on a canon-less world for the rest of the cycle. Moved here, after 5.8. The script now also refuses to write on absent canon rather than exiting 0 — a missing fold makes consumers fall back correctly, a gutted one does not. Verified no reverse dependency: `buildDeskPackets` does not read `world_state.json`, and nothing between the old and new positions does either (only `lib/mags.js` and `lib/wakePerception.js` read it, both cron-side).

### Step 6: Gap Log Close (engine-sheet)

Run the mechanical baseline audit and append judgment-layer entries.

```bash
node scripts/engineCycleAudit.js {XX} --write
```

**Run-order dependency (G-EC1):** this step reads `engine_audit_c{XX}.json` from Step 4 — the script now aborts with a clear message (no gap log written) if the file is missing, instead of filing a false-HIGH `audit-input` finding. If it aborts, run Step 4 first.

Writes `output/production_log_run_cycle_c{XX}_gaps.md` (that is the script's actual filename — the older `production_log_c{XX}_run_cycle_gaps.md` spelling in this file was never what it wrote) with `[mechanical]`-tagged entries across 5 detector classes (`writeback-drift`, `math-anomaly`, `cross-cycle-debt`, `determinism-break`, `header-drift`). 4 V2-runtime classes (`phase-skip`, `cohort-collision`, `phase-ordering`, `silent-fail`) appended as stubs — they need an engine-run-log ingest path that doesn't exist yet.

`header-drift` (S202 build) is a structural class — runs against repo state vs `schemas/SCHEMA_HEADERS.md`, flags writers whose field-name lookups or `setValues()` ranges don't match live headers. Self-test: `node scripts/engineCycleAuditTest.js` (synthetic fixture validating the detector would have caught the S201 Story_Seed_Deck/Story_Hook_Deck drift). Plan: `docs/plans/2026-05-05-writer-header-alignment-detector.md`.

After the script runs, engine-sheet appends `[judgment]` entries below the `<!-- end mechanical pass -->` footer marker. The script preserves anything below that marker on re-run, so judgment entries survive a re-audit pass.

Coder-persona voice for judgment entries: terse, mechanical, commit-message style (no narrative prose). G-EC{N+} numbering continues from the mechanical pass.

If 0 mechanical entries observed: file states "0 mechanical gaps observed" with cycle headline metrics for context (vs being absent, which would be ambiguous). Engine-sheet judgment review still recommended.

**Gate:** File exists on disk. ROLLOUT pointer added under `Edition Post-Publish` for any HIGH-severity findings: `RUN-CYCLE C{XX} GAP LOG — S{N} (engine-sheet), N entries, severity`.

Plan: `docs/archive/plans/2026-05-03-run-cycle-gap-log-surface.md` (Phase 2 done S199; Phase 3 validation runs at next /run-cycle invocation).

## What Happens After — the crons (S456; no sift, no manual edition chain)

Nothing downstream is hand-run. The artifacts this chain leaves on disk are read by the scheduled jobs in `crontab -l`:

| Artifact | Cron consumers |
|---|---|
| `output/world_summary_c{XX}.md` | `cron-desk-run` (06:15 angle / 13:15 report / 18:15 write, Mon–Fri), `cron-desk-writer`, `cron-civic-run` (Mon–Thu datawake, Sunday chain), `cron-saturday-run`, `notebooklmDailyNews` (08:00), `newsroom-digest` (06:00), every `scripts/build*Slice.js`, `lib/mags.js` (Discord), `lib/getCurrentCycle.js` |
| `output/desk_signal_c{XX}.json` | `cron-desk-run`, `newsroom-fanout`, `cron-civic-run`, the desk slices (economic / safety / civic-domain / evening / Hal / Anthony / P Slayer / Jax), `stink-scanner` |
| `output/engine_audit_c{XX}.json`, `output/baseline_briefs_c{XX}.json` | `cron-civic-run` (briefs are a **required** input), `buildCivicOfficeSlice`, `buildJaxSlice`, `civicMustDecide`, `tierClassifier` |
| `output/beats/*.jsonl` (+ `prev/`) | economic / faith / health / safety / schools / transit / environment slices |
| `output/neighborhood_texture_c{XX}.md`, `output/world_state.json` | `citizen-wake` (07:30 / 12:30 / 21:30), `citizen-exchange` (17:00), `discord-reflection`, `lib/wakePerception`, `lib/mags` |
| `output/simulation_ledger_snapshot.jsonl` | `lib/mags.searchDisk`, MCP `search_everything`, `canon-name-check` |
| `output/initiative_tracker.json`, `output/desk-packets/*` | civic office datawakes, desk agents |
| `output/voice-disposition-cache/*.md` | citizen-voice agents, `citizen-wake` |

**The acceptance test is the next unattended cron run, not a hand-driven demo.** If a step above fails, the cron that reads its artifact runs on the prior cycle — say which one in SESSION_CONTEXT.

Known texture gap (S456): `buildNeighborhoodTexture` reads Riley_Digest + Neighborhood_Map only, so a hood with an active initiative and no digest signal reads "a quiet week" (C107: Temescal with the health center under construction, West Oakland with the fund disbursing). The initiative slice is not an input yet.

## Legacy Reference

The following scripts were part of the old inline pipeline. Not called by this skill but preserved for future use:

- `scripts/buildDeskFolders.js` — per-desk workspace folders
- `scripts/buildInitiativeWorkspaces.js` — per-initiative workspace folders
- `scripts/buildVoiceWorkspaces.js` — per-voice-agent workspace folders
- `scripts/buildDecisionQueue.js` — pending decisions for voice agents
- `scripts/checkSupplementalTriggers.js` — supplemental edition candidates

## Sheet Access

Service account via `lib/sheets.js`. Spreadsheet ID from `.env`.
