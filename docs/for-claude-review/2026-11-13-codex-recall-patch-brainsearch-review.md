# Codex review — recall patch + brainSearch (2026-11-13)

Reviewed commits `f8feaf9d2` and `8bd4b1f01` against their named targets. No review code was executed against Sheets, memory services, or other network services.

## `f8feaf9d2` — `scripts/supermemory-patch/recall-directive.patch`

**Verdict: HOLD**

### Finding

- **`scripts/supermemory-patch/recall-directive.patch:110-113` — missing/non-finite similarity bypasses the new floor.** For a non-rule result with text but missing, `NaN`, or infinite `similarity`, `!Number.isFinite(r.similarity)` is true, so the result is retained regardless of `RECENT_FLOOR`. For example, a hand-written hit with text and `similarity: undefined` is admitted despite not demonstrating a 0.66 score. This preserves the prior permissive fallback while the commit claims the stricter floor applies to hand-written saves. Require a finite similarity for non-rule hits before applying the age-adjusted floor (or explicitly document and justify the exception).

The patch applies cleanly to the pristine plugin hook. Applying it to that file produces a byte-for-byte match with `/root/.claude/plugins/cache/supermemory-plugins/supermemory/0.2.0/hooks/recall-directive.js`. The cache contains the patch's two `RECENT_FLOOR` references and the complete cumulative result.

The hook's `searchMemories` adapter returns the raw `response.results` array on the v5 path and raw `searchResults.results` on the legacy path. Existing local callers handle `system.createdAt`/`system.updatedAt` and top-level date fields; the new lookup covers those locations, plus `metadata.createdAt`. I did not make a live search request, so the exact live result payload was not independently observed.

Rule tagging is sound in the patch's current path: `searchRules()` wraps the returned memory/chunk in `memory: "[rule] …"` before merging, so `resultText()` will not hide the marker when it selects a text field. Results are filtered before the existing `batchHashes` dedupe, and `.slice(0, MAX_RESULTS)` retains fewer than six qualifying results (zero qualifying results remains an empty list).

## `8bd4b1f01` — `scripts/brainSearch.js`

**Verdict: SHIP-WITH-FIXES**

### Finding

- **`scripts/brainSearch.js:189-205` — missing sheet headers silently turn world search into incomplete or malformed output.** `ci()` and `li()` return `-1` when a required header is absent. For example, if `NamesUsed` is renamed, `x.r[-1]` is `undefined` and feed rows stop matching; missing `Cycle`/`EventType` yields empty metadata, while absent ledger identity headers can produce `undefined` values. This fails silently instead of reporting that the tab schema does not satisfy the lookup. Validate required headers for each tab before scanning and return a visible source error when one is missing. The checked-in `schemas/SCHEMA_HEADERS.md` currently lists the requested feed and ledger headers; live tab headers were not checked because that would contact Sheets.

Source review confirms this path does not write: `searchWorld()` calls `getSheetData()` for three tabs, `searchOpen()` reads the rollout file, and the existing memory paths query SQLite or invoke the Supermemory search CLI. This review did not execute those reads. Existing `brainSearch.js --json` callers were not found beyond documentation references; added `world` and `open` entries retain the same hit keys (`source`, `date`, `kind`, `text`, `pointer`, with optional IDs as before). FTS apostrophes are doubled for SQL literals and fallback terms are double-quoted; no query-breaking case was found in source review. The async IIFE returns after JSON output, allowing normal process exit, and the current table header records agree with the requested column names.

## Validation boundary

This is a source/diff review plus a local patch-application comparison. No Sheet read, Supermemory search, deploy, live cycle, or runtime behavior check was performed.
