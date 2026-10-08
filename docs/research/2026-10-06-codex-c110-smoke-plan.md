---
title: C110 smoke and bench resync plan review
created: 2026-10-06
updated: 2026-10-06
type: reference
tags: [engine, civic, draft]
sources:
  - /tmp/claude-0/-root-GodWorld/da2154cd-7677-471b-b14c-8653add5d6d0/scratchpad/plan-c110-smoke-and-bench-resync.md
  - docs/mags-corliss/SESSION_HISTORY.md — S525 C110 smoke clause
  - scripts/syncSandboxFromLive.js
  - scripts/chaosCarsFrequencyCheck.js
  - lib/sheets.js
pointers:
  - "[[../mags-corliss/SESSION_HISTORY]] — archived S525 acceptance"
---

# C110 smoke and bench resync plan review

**Verdict: HOLD before execution.** Task 1 omits several S525 checks, its proposed recording location violates the PIN-only control-plane shape, and Task 2 needs explicit target, preservation, and typed read-back gates. Source review only: no Sheets, services, scripts, or plan steps were run.

## Numbered findings

1. **The proposed smoke output location is wrong (Task 1; blocking).** The plan says to append the per-layer table to `SESSION_CONTEXT` PIN (`plan-c110-smoke-and-bench-resync.md:51`). `SESSION_CONTEXT.md:1-5` defines that file as one PIN plus one NEXT line per lane, with completed evidence elsewhere. S525 is archived in `docs/mags-corliss/SESSION_HISTORY.md:11-15`, not a license to expand the PIN. File the smoke evidence in an authorized engineering artifact or owning plan/log, with tab:row pointers, and keep the control plane untouched.

2. **S525's care/justice and civic layers are only partly checked (Task 1).** The S525 clause calls for the `moves_c109` civic fold, sim-clock life lines, mood/media carry, relocation-flow row, a hospital/heat admission with no same-week health roll, a cop-car hook plus LifeHistory and no extra receipt, positive hood weights for every care/justice vehicle, OARI hits only in three named hoods, and named-pass-only ambulance/OARI citizen rows (`SESSION_HISTORY.md:15`, clauses @122, @124-@127, @132). The plan checks the fold's `.applied` flag once (`plan...md:8`), lists tabs and one named citizen (`:41,44,47`), and runs the frequency script (`:48`); none of those proves those row-level shapes. Add the actual C110 producer rows and one receipt/negative check per applicable layer. The plan's “three `careJusticeNamed` lines” (`:20`) differs from S525's “one line” wording (`SESSION_HISTORY.md:15`, @127); identify whether this is one line per vehicle before marking the layer passed.

3. **Other S525 checks are missed or weakened (Task 1).** The plan does not verify the career walk's rotated start/end, the three resolved conduct tests, the absence of a same-Cycle first-arrest settlement, the care-ledger writer names if a writer failed, the absence of English months in story seeds and LifeHistory lines, Easter/Christmas-only faith flags, or the engine.279 `Promotion`/`Advancement`/`Family`/`Household` lines in `LifeHistory_Log` (`SESSION_HISTORY.md:15`, @133-@134, @129-@131, engine.279). Its current rows cover only parts of these (`plan...md:25,39,42-43`). For the 54 staff mints, S525 also specifies Tier 3 ×16/Tier 4 ×38, ENGINE clock, 21 employer-field fallbacks, and adult employer classes (`SESSION_HISTORY.md:15`, “C110 smoke, mints”); the plan checks employer counts, SkillTags and no `Seeking work` but not those distinctions (`plan...md:46`). The Civis Journal gate has two possible arms and requires the `.md` companion; the plan assumes the JSON arm from file existence without proving the companion and full outcome (`SESSION_HISTORY.md:15`, “C110 run-cycle”; `plan...md:49`). C111/C115/C120/C131 future checks can remain out of scope (`plan...md:11`).

4. **The proposed live pull cannot support physical row or type claims as written (Task 1; weakest assumption).** `lib/sheets.getSheetAsObjects` calls `values.get` without an unformatted-value option, drops the header row and Sheet row numbers, overwrites duplicate header names, and maps numeric zero/boolean false to `''` (`lib/sheets.js:49-79`). The plan promises `tab:row` evidence and checks World_Config zeros, treasury chaining, raw DialState, and physical column 47 from JSON objects (`plan...md:29-46,51,57`). Use a snapshot that retains header positions and row numbers; request underlying values for numeric/type checks. `getRawSheetSnapshot` preserves columns and row numbers but still calls the same default `values.get` (`lib/sheets.js:94-105`), so it does not by itself settle underlying types. The sync transport shows the necessary `UNFORMATTED_VALUE`/serial-date read and `RAW` write (`scripts/syncSandboxFromLive.js:63-75,123-133`).

5. **The frequency checker is not a C110 named-pass proof (Task 1).** It reads `Chaos_Cars` via the default `GODWORLD_SHEET_ID`, excludes `port` and mapped citizen hits from loop counts, then checks the **entire** sheet history against [3,15] (`scripts/chaosCarsFrequencyCheck.js:28-45,54-80`; `lib/sheets.js:36-58`). With no C110 rows, it can still pass; with an older violation, it can fail despite a clean C110. It does not inspect hood demand weights, OARI geography, or whether a citizen row was actually emitted by the named pass. Keep the command as an aggregate guard, and add C110-filtered row checks against demand and named-pass evidence. Confirm the configured source ID before interpreting its result.

6. **No shown sync/frequency command is an accidental PROD writer, but two later writes are untargeted (Task 2).** `syncSandboxFromLive.js` uses `GODWORLD_SHEET_ID` as source and the explicit argument as destination, refuses identical IDs, and sends all clears/updates to `DEST` (`scripts/syncSandboxFromLive.js:25-32,100-133`). `chaosCarsFrequencyCheck.js` only reads through `getSheetAsObjects` (`scripts/chaosCarsFrequencyCheck.js:54-80`). By contrast, the plan's “set `fireGuardMinutes` 0” and POST `clearfire` steps name no Sheet ID, range, deployment, or expected response (`plan...md:58`). `lib/sheets.updateRange` and `updateCell` write to the environment's default ID (`lib/sheets.js:36-41,248-257,644-670`), which the deployment runbook says points at PROD unless explicitly overridden (`docs/reference/DEPLOY.md:128-129`). Bind and print the BENCH target for the guard write; bind the sandbox deployment URL/token for clearfire and fire, and verify both responses before C111. Do not infer BENCH targeting from a shell's cwd or the preceding sync command.

7. **Resync needs a dry-run source/destination and C110 freshness gate (Task 2).** The plan jumps straight to `--apply` and assumes 83 tabs and live C110 (`plan...md:53-58`). The script has a real dry-run mode that prints source/destination titles, grid-tab count, missing bench tabs, bench-only tabs, and oversized-cell truncation before any clear (`scripts/syncSandboxFromLive.js:40-61,82-103`). Its equality guard proves only `DEST !== LIVE`, not that the environment's `LIVE` is the intended PROD Sheet or that the destination is still SANDBOX 1004 (`:25-32`). Require the dry-run output and a fresh read of source and destination IDs/titles and source `cycleCount=110` immediately before `--apply`; stop on a changed Cycle, unexpected tab set, or unreviewed truncation. `SESSION_CONTEXT.md:5` calls for a resync *from live C110*, so a later live fire changes the task's premise.

8. **Preservation check covers one column while the sync clears whole tabs (Task 2; weakest assumption).** SANDBOX 1004 already has synthetic BOARD-OUSD and INIT-901 fixtures in `Civic_Office_Ledger` and `Initiative_Tracker` (`docs/reference/DEPLOY.md:59`); the plan proposes grepping only `SESSION_CONTEXT` and inspecting DialState column 47 (`plan...md:56-57`). The script clears every live-grid tab on the bench, then rewrites values; bench-only tabs remain untouched (`scripts/syncSandboxFromLive.js:53-61,105-135`). Inventory/preserve all bench-only *rows, cells, and tabs* that matter to current proofs, including those two fixtures; a one-column scan cannot establish that nothing else depends on bench state. The sync is values-only and leaves PropertiesService alone (`scripts/syncSandboxFromLive.js:10-13,153`), so compare the copied carry ring with the script's property stamps before the first fire (`docs/reference/DEPLOY.md:135-139`).

9. **“83/83 tabs read back” is not what the sync verifies (Task 2; pre-gate).** The sync's built-in check reads only the five largest tabs and compares row counts, not cell values, types, headers, or all tabs (`scripts/syncSandboxFromLive.js:138-153`). It may report “Read-back verified” after a wrong value in World_Config, Carry_Forward_Store, or a affected ledger. The plan asks for all 83 tabs, `cycleCount`, and carry store at 110 (`plan...md:58`) but gives no separate full comparison or fail condition. Use an explicit typed read-back on critical tabs and a tab-set/count audit; compare the carry ring and the specific C110 smoke inputs. The runbook explicitly says displayed text or matching row counts are insufficient (`docs/reference/DEPLOY.md:307-309`).

10. **The weakest-assumption rules need shape-specific failure boundaries.** The plan correctly treats rehearsal counts as estimates (`plan...md:66-69`), but S525's census contract is not just “216 rows”: it distinguishes Rockridge/unclassified `Corrections=1` from a C110 discharge case that also has `Exits=1`, and requires hospital/custody city rows complete (`SESSION_HISTORY.md:15`, “added layer”). The plan names Corrections unconditionally and does not test that conditional exit (`plan...md:45,68`). Similarly, 1025 extant ledger rows (`:27`) do not prove the 54 specific staff, and a frequency PASS does not prove named-hit geography (finding 5). Declare numerical tolerance only for live-dependent counts and timings; keep identities, source phases, config keys, status transitions, and exact receipt shapes as hard checks. A successful bench C111 after resync is a new bench result, not proof that the live C110 smoke was complete.

## Disposition

Fold these findings into the scratchpad plan before any live readback or bench wipe. The named scripts were inspected, not executed. Only this review file was created; no code, Sheet, plan, `SESSION_CONTEXT.md`, or Git history was changed.

## Changelog

- 2026-10-06 (codex) — Filed read-only C110 smoke and bench resync plan review.

## Disposition — research-build 2026-10-08

Spent. The smoke this reviewed ran at the C110 fire and was read 2026-10-06/07 (`output/smoke_c110.md`); engine.266 and engine.276 closed on it. The plan reviewed was a scratchpad draft, not a repo file, so a per-finding fold was not traced.
