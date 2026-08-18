---
title: Spreadsheet weight reduction — browser-editability of Simulation_Narrative
created: 2026-08-17
updated: 2026-08-17
type: plan
tags: [engine, sheets, active]
sources:
  - Live probes S378 (allocated-vs-used cells, text payload, tab reference audit)
  - output/sheet-grid-snapshot-2026-08-17.json — pre-resize grid dimensions (restore point)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.116 parent row"
  - "[[../engine/SHEETS_MANIFEST]] — tab registry this plan relocates entries out of"
  - "[[2026-08-17-ledger-trueup-sweep]] — the reason Mike is hand-editing the ledger at all"
---

# Spreadsheet weight reduction

## Why

Hand-editing `Simulation_Ledger` in the browser froze repeatedly and, on 2026-08-16, a tab silently
lost its Sheets sync and took ~12 hours of manual corrections with it. The workbook was measured
rather than guessed: the freeze cause is document weight, not formulas.

## Measured state (S378, before any change)

| metric | value |
|---|---|
| tabs | 76 (75 grid + 1 OBJECT chart sheet) |
| allocated cells | 2,853,341 |
| cells holding data | 565,056 (19.8%) |
| text payload | 14.53 MB |
| formula cells | 127 |
| volatile functions (`NOW`/`INDIRECT`/`IMPORTRANGE`/…) | 0 |
| conditional-format rules | 0 |
| `onEdit` handlers in codebase | 0 |

Ruled out as causes: formula recalculation, conditional formatting, per-edit Apps Script.
Confirmed cause class: sheer model size — 2.29M allocated-but-empty cells and 14.5 MB of text
that the browser client holds in memory on every keystroke.

Heaviest single payloads: `Engine_Errors` 4.33 MB (30% of the document's entire text, 569 rows of
stack traces, one cell 9,071 chars), `LifeHistory_Log` 2.18 MB, `Simulation_Ledger` 1.46 MB.

Tab-reference audit result: **no tab is unreferenced.** All 76 appear in code or docs. Deletion is
not the available lever; relocation and grid reclamation are.

**Bar replaced (builder-direct 2026-08-18, S380):** "referenced somewhere" is no longer keep-proof.
A tab referenced only by dead, disabled, or superseded code is dead weight wearing a seatbelt — the
directive is to prune the code AND the tab together. Backups cover the removal risk (nightly Drive
tarballs, sheet version history, pre-delete local export per tab). See Task 5.

**Independent confirmation (browser-Claude live-doc audit, 2026-08-18):** 78 tabs (62 visible / 16
hidden), ~2M populated cells, ~17 MB text. `Engine_Errors` measured 4.34 MB — 93% in one column,
442 identical 9,071-char wd-cards failure rows. `onOpen` verified menu-only; the ~9 s open tail is
Apps Script cold-booting the 171-file container, so doc slimming is also the open-time lever.
Superseded-pair candidates named: `WorldEvents_Ledger` vs `WorldEvents_V3_Ledger`,
`Storyline_Ledger` vs `Storyline_Tracker`.

## Task 1 — reclaim trailing empty rows — SHIPPED S378

Rows only; column counts untouched (schema-growth headroom). Target `rowCount = usedRows +
max(100, 10% of usedRows)`, applied as one `batchUpdate` of `updateSheetProperties`. Never grows a
tab; tabs already tighter than target are skipped.

Result: **2,853,341 → 1,288,488 allocated cells (−1,564,853, −54.8%)** across 70 of 75 grid tabs.
Verified: used cells unchanged at 565,056; `auditSimulationLedger.js` still reports 961 rows / 54 cols.
`LifeHistory_Log`, `LifeHistory_Archive` and `Relationship_Bond_Ledger` were skipped — they are
genuinely full, which is why the cut is 55% and not the 78% a column-trimming variant would give.

Reversal: `output/sheet-grid-snapshot-2026-08-17.json` holds every tab's pre-resize dimensions;
restore = `updateSheetProperties` `gridProperties` per `sheetId`.

## Task 2 — Engine_Errors out of the workbook

Removes 4.33 MB. Writers: `logEngineError_` (`phase01-config/godWorldEngine2.js`, Apps Script) and
`scripts/wdCardsDaemon.js` (node). Reader: `lib/diagnosticLedger.js` (`recordIfNew` reads the last
N rows to dedup).

Apps Script has no filesystem, so a local JSON target is not reachable from the engine half. Target
is a separate spreadsheet: Apps Script writes via `openById`, `diagnosticLedger` points at the new
ID, node side may additionally mirror to JSON locally.

**Sequencing constraint:** the Apps Script half must not land while the engine carries an
un-smoke-tested batch (civic.22 `createInitiative_`, research.27 2.3, infrastructure.6 — all
committed, none pushed). Per S250 deploy-attribution discipline, the code repoint rides a clean
deploy window. The data half (export accumulated rows, clear the tab) is independent and can go
first.

## Task 3 — archives to their own workbook

| tab | cells | readers | disposition |
|---|---|---|---|
| `Story_Seed_Deck_v3_legacy` | 56,580 | none | parked migration artifact — `saveV3Seeds.js:80` renames the old deck and walks away. Export + delete. |
| `LifeHistory_Archive` | 220,116 | `utilities/tier1EssenceEvents.js`, `scripts/seedTier1EssenceLive.js` | move to archive book, repoint two readers. Writer `utilities/archiveLifeHistory.js` is Apps Script on the cycle path — cross-book write via `openById`. |
| `Story_Seed_Deck_Archive` | 48,602 | 1 engine ref, 0 script refs | move to archive book. |

## Task 4 — Chicago retirement

Canon decision (Mike-direct 2026-08-17): Chicago is out of the simulation. It served as canon while
it ran; running a side city proved more work than it returned. A future second city would be a
reformatted duplicate of Oakland, not another parallel Chicago-shaped build — the Oakland engine is
the reusable artifact.

That makes archiving legitimate, but it is a code job, not a weight job: the generator is disabled
(S229) while the **consumers are live** — `phase10-persistence/compileHandoff.js` (Bulls rosters +
sports feed), `scripts/buildDeskPackets.js`, `utilities/rosterLookup.js`, `utilities/cycleRollback.js`,
`phase10-persistence/cycleExportAutomation.js`. After Task 1, `Chicago_Citizens` + `Chicago_Sports_Feed`
are ~9k cells combined, so there is no weight urgency. Retire the consumers first, archive second.

## Task 5 — dead-tab + dead-code pruning (builder-direct 2026-08-18)

The project carries no dead ledgers and no disconnected code. Method, per candidate tab:

1. Caller-graph every reference (SHEETS_MANIFEST + repo grep) and classify each referencing code
   path live / disabled / superseded.
2. Tab whose only references are dead code → export tab values to a git-tracked local file, delete
   the referencing dead code and the tab in ONE commit (revert = one revert).
3. Tab with any live reader stays (or graduates to Task 3 relocation).

Candidate pool: the 16 hidden tabs + the superseded pairs (`WorldEvents_Ledger` vs
`WorldEvents_V3_Ledger`, `Storyline_Ledger` vs `Storyline_Tracker`) + whatever the per-tab pass
surfaces. `LifeHistory_Log` is explicitly NOT a candidate (live, load-bearing); `LifeHistory_Archive`
moves under Task 3, never deletes.

## Acceptance

- Allocated cells under 700k with all data intact (used-cell count unchanged at each step).
- `Engine_Errors` no longer in the working workbook; `diagnosticLedger.recordIfNew` still dedups.
- `tier1EssenceEvents` still derives essence events after `LifeHistory_Archive` relocates.
- No Chicago consumer throws after its tabs relocate.

## State

Task 1 SHIPPED + verified S378. **Task 2 data half SHIPPED S380** — 568 rows / 4.14 MB archived to
`output/engine_errors_archive_2026-08-18.json` (git-tracked) and cleared, header kept; wdCardsDaemon
logger capped (count + first 5 ids, `c27277ed`). Task 2 code half (separate error book + repoint)
now unblocked — the S378 wave is deployed and bench-proven. Tasks 3–5 ready.

## Changelog

- 2026-08-17 (S378) — plan created; Task 1 shipped and verified; Chicago canon retirement recorded.
- 2026-08-18 (S380) — Task 2 data half shipped (4.14 MB archived + cleared, logger capped). Task 5
  added: dead-tab + dead-code pruning, builder-direct — "referenced by dead code" no longer keeps a
  tab. Browser-Claude live-doc audit folded into Measured state (onOpen ruled out, superseded pairs
  named).
