---
title: Federated search_everything Plan
created: 2026-06-02
updated: 2026-06-02
type: plan
tags: [engine, mcp, complete]
sources:
  - scripts/godworld-mcp.py — existing MCP server (all 3 connectors already built)
  - claude-mem obs 27222 (S252) — MCP helper functions: supermemory / dashboard / disk
pointers:
  - "[[engine/archive/ROLLOUT_PLAN]] — parent rollout"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Federated search_everything Plan

**Goal:** One MCP tool — `search_everything("vinnie keane")` — that takes a bare string (no entity type required), fans out to all three storage shelves at once, and returns merged, source-tagged hits.

**Architecture:** Add one tool to the existing `scripts/godworld-mcp.py`. The three connectors already exist (`supermemory_search`, `dashboard_get`, `read_json_file` + a new `disk_search` grep helper). The new tool calls four sources — `world-data` Supermemory (umbrella tag; every domain card carries it), `bay-tribune` Supermemory (canon history), the dashboard articles API, and a live `grep -r` of `output/` + `docs/` — then concatenates each block under a `=== SOURCE ===` header. No new server, no index, no rebuild step.

**Terminal:** engine/sheet

**Pointers:**
- Prior work: `scripts/godworld-mcp.py` lines 55–164 (the three connector helpers), lines 166–186 (`lookup_citizen` — the type-locked pattern this generalizes)
- Design decision (disk layer): **live grep, not a prebuilt index.** Corpus is 4,854 files; `grep -r` across the whole set runs in 0.71s. An index would save <1s/query and introduce a staleness failure mode (entity exists in ledger but index says "no results" — the contamination shape). Fresh-always beats fast-but-stale for a lookup tool. Revisit only if measured latency degrades at much larger corpus size.
- Why `world-data` not all 8 `wd-*` tags: per `godworld-mcp.py` lines 449–451, every domain card (citizen/business/faith/cultural/neighborhood) also carries the broad `world-data` tag. Searching it once unions all domains in one call instead of 8 sequential `npx` calls.

**Acceptance criteria:**
1. `search_everything("Avery Santana")` returns a non-empty block from at least 3 of the 4 sources, each under a labeled header.
2. The disk layer uses `grep` (universally present), not `rg` (only a Claude Code shell-function wrapper on this droplet — unreachable from a Python subprocess).
3. Disk hits are ranked structured-data-first (output/ before docs/, journals last) and capped to avoid token blowup on common terms.
4. Total latency for a typical name is under ~5s (4 sequential source calls).

---

## Tasks

### Task 1: Add `disk_search` helper

- **Files:**
  - `scripts/godworld-mcp.py` — modify (add helper after `read_json_file`)
- **Steps:**
  1. Add `disk_search(query, max_files=12)`: run `grep -rIli` (recursive, binary-skip, case-insensitive, files-with-matches) over `output/` + `docs/` with `--include=*.json --include=*.md --include=*.txt`.
  2. Rank returned paths: `output/desk-packets/` and `output/*.json` highest, other `output/` next, `docs/` (non-journal) next, `docs/mags-corliss/` (journals/session history) last.
  3. For the top `max_files`, fetch the first matching line per file via `grep -m1 -ni` for a one-line snippet.
  4. Return a rendered block; note total match count when truncated.
- **Verify:** import-free smoke — covered by Task 3.
- **Status:** [x] done

### Task 2: Add `search_everything` tool

- **Files:**
  - `scripts/godworld-mcp.py` — modify (add `@mcp.tool()` before the RUN block)
- **Steps:**
  1. Fan out sequentially: `supermemory_search(query, 'world-data', 5, mode='hybrid', threshold=0.3)`, `supermemory_search(query, 'bay-tribune', 3, mode='hybrid', threshold=0.3, sort='recency')`, `dashboard_get('/api/search/articles?q=' + quote(query))`, `disk_search(query)`.
  2. Concatenate under four `=== SOURCE: … ===` headers. Each block degrades gracefully to a "no results / unavailable" line, never crashes the whole call.
- **Verify:** Task 3.
- **Status:** [x] done

### Task 3: Smoke-test against a live name

- **Steps:**
  1. Run the tool's underlying logic against `"Avery Santana"` and a rarer name.
  2. Confirm ≥3 sources return content and disk ranking holds.
- **Verify:** `python3 -c` harness importing the module and calling the function → non-empty, source-tagged output.
- **Status:** [x] done

---

## Open questions

None — resolved at design time (live grep vs index; world-data vs wd-* fan-out).

---

---

## Phase 2: Live ledger as the disk shelf (S252, same session)

**Why:** The four shelves reach `Simulation_Ledger` data only indirectly — via Supermemory cards built by `buildCitizenCards.js` (a snapshot that lags the sheet until cards rebuild). The live ledger is a Google Sheet behind the service account; the Python MCP can't read it. Asked "what if a copy lived on disk?" — that sidesteps the Python/Node seam entirely, because the disk-grep shelf already walks `output/`.

**Build:** `scripts/dumpLedger.js` — mimics `queryLedger.js` (same `lib/env` + `lib/sheets` + `getSheetAsObjects('Simulation_Ledger')`). Writes `output/simulation_ledger_snapshot.jsonl` (gitignored generated data).

**Two format decisions that make the grep shelf work:**
1. **JSONL, one citizen per line** — so `grep "Vinnie Keane"` returns the *entire* row on one line, every column in the hit. Pretty-printed JSON would isolate the name on its own line.
2. **Synthesized `Name` field** (`${First} ${Last}`) injected first — `getSheetAsObjects` splits the name across `First`/`Last` columns, so a full-name grep would otherwise miss. Verified: without it, 0 hits; with it, the row lands.
3. **Stable filename, overwritten each cycle** — only ONE snapshot ever on disk = the current one, so grep can't surface a prior-cycle row. This is how the snapshot dodges the staleness hazard (vs. the index, which was rejected for exactly that failure mode).

**MCP changes (`disk_search`):**
- Added `--include=*.jsonl` to the grep — *critical*: `--include=*.json` does NOT match `.jsonl` (verified empirically), so without this the snapshot was invisible to its own shelf.
- `_disk_rank`: ledger snapshot ranked `-1` (above desk-packets) — it's the most authoritative disk source.

**Refresh trigger:** `/city-hall-prep` Step 1.5 runs `node scripts/dumpLedger.js {XX} --quiet` each cycle, post-engine (ledger freshest). Non-blocking — failure degrades to the Supermemory card, doesn't break the tool.

**Verified:** 904 citizens dumped (matches live ~903–904, fresher than the stale "858" in SIMULATION_LEDGER.md); Vinnie Keane's full current row (POP-00001, Tier 1, DH) leads the disk shelf as the top-ranked hit.

**Next (not built — Mike's "all skills should use this"):** broader skill adoption of `search_everything` as the default lookup. Deferred — sweeping all skill files is its own scoped pass, not a same-session change.

---

## Changelog

- 2026-06-02 — Built and shipped in one session (S252). Plan + build + test + index registration same commit. Disk layer = live grep (no index), 4-source fan-out.
- 2026-06-02 — Phase 2 same session: live `Simulation_Ledger` added as the disk shelf via `scripts/dumpLedger.js` (JSONL snapshot, `Name` synthesized, stable filename) + `disk_search` jsonl-include fix + `/city-hall-prep` Step 1.5 refresh trigger. The 5th source without a 5th connector.
