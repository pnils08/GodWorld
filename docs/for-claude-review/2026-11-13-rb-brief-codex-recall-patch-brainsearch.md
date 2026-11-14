# research-build → codex-rb: diff review, recall patch + brainSearch (2026-11-13)

Builder 2026-11-13, verbatim "Go" to: send the two recall changes to codex for review. Builder 2026-11-12/13 standing: work stays uncommitted-to-push until codex approves — these two are committed locally, unpushed.

Review the exact candidates: `git show f8feaf9d2` and `git show 8bd4b1f01`. Nothing is deployed from the repo; the first is a patch file applied by hand to the supermemory plugin, the second is a CLI script run on demand.

## 1. f8feaf9d2 — `scripts/supermemory-patch/recall-directive.patch`
Edits the recall hook so each prompt's recalled-saves block ranks recent hand-written saves first.
- `MAX_RESULTS` 15 → 6; new `RECENT_FLOOR` 0.66.
- `recallScore`: similarity plus age (≤3d +0.08, ≤14d +0.04, >45d −0.06; no usable date = plain similarity). `[rule] ` hits keep plain similarity and the old `MIN_SIMILARITY` 0.55 floor.
- Sort and filter both use `recallScore`.

Look hardest at:
1. The patch applies cleanly to the pristine plugin file (`/root/.claude/plugins/marketplaces/supermemory-plugins/plugin/hooks/recall-directive.js`, 0 hits of `RECENT_FLOOR` — unpatched) and the hunks' line numbers/context match. `…/cache/supermemory-plugins/supermemory/0.2.0/hooks/recall-directive.js` already carries the patch (2 hits) — confirm the file there equals pristine + this patch.
2. Date field: which of `createdAt` / `updatedAt` / `system.createdAt` / `metadata.createdAt` the search response actually carries; a miss silently drops the age term.
3. `[rule] ` detection by `memory` prefix — does a rule hit ever arrive with the text in another field (`resultText`)?
4. A prompt with fewer than six clearing the floor, zero clearing it, and the `batchHashes` dedupe still running after the new filter.

## 2. 8bd4b1f01 — `scripts/brainSearch.js`
One query now also reads the live sheet and open work.
- `searchWorld`: only when the query has a capitalised name word; reads `Oakland_Sports_Feed`, `As_Roster`, `Simulation_Ledger` through `lib/sheets`; prints above memory hits. `--no-world` skips.
- `searchOpen`: `docs/engine/ROLLOUT_PLAN.md` table rows carrying at least half the query's key words, printed last. `--no-open` skips.
- `searchMem`: whole-question FTS first; if nothing and ≥2 key terms, retry with key terms joined by OR.
- Top level is now an async IIFE.

Look hardest at:
1. Read-only: nothing here writes a sheet, file or memory. Confirm.
2. `searchWorld` header lookups (`NamesUsed`, `Notes`, `StoryAngle`, `Cycle`, `EventType`, `POPID`, `First`, `Last`, `RoleType`, `Status`, `Tier`) against the live tab headers — `indexOf` returns −1 on a miss and `r[-1]` is undefined, so a renamed column fails silently.
3. FTS injection: `fts` goes into `MATCH '…'` with only `'` doubled; the OR fallback quotes each term. Any query that breaks the SQL or the FTS grammar.
4. Name regex: `has` requires every name to match across the joined text — a two-name query vs one-name rows; `\b` with apostrophes/hyphens.
5. `--json` output shape changed (world and open rows added; same keys) — any caller of `brainSearch.js --json` that would now mis-read.
6. Exit paths: the old script exited 0 after JSON; the IIFE returns. `process.exit(1)` only on an uncaught error.

## Output
Write findings to `docs/for-claude-review/2026-11-13-codex-recall-patch-brainsearch-review.md`. Verdict SHIP / HOLD per commit, findings with file:line. One review, at most one re-review.
