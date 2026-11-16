---
title: Pipeline 103 notebook search scope plan review
created: 2026-11-08
updated: 2026-11-08
type: reference
tags: [media, review, active]
sources:
  - docs/plans/2026-11-07-notebook-search-scope.md at 7f44729c9
  - output/engine-sheet/2026-11-08-codex-p103-plan-review-brief.md
pointers:
  - "[[../plans/2026-11-07-notebook-search-scope]] — reviewed plan"
---

# Pipeline.103 plan review

**Verdict: HOLD.** The live-list design fixes stale IDs, but the plan must settle the prior-published scope conflict and the treatment of non-ready sources before Task 3. This reviews §Reader map, §Design and §Acceptance at `7f44729c9`; no build or live call was run.

## Findings

1. **High — default `published` search can return non-publication sources.** The plan says to put every live ready ID in both classes (`docs/plans/2026-11-07-notebook-search-scope.md:74-78`), preserving the existing merge (`scripts/notebooklmCanonSearch.js:103-120`). A default `source-search` prior-published-arc request (`.claude/agents/source-search/SKILL.md:33-37`) can therefore cite a lore piece, stat card, or audio direction guide as published history; `validateQueryResponse` checks selected/approved membership, not publication class (`scripts/notebooklmCanonSearch.js:187-215,236-245`). This conflict predates the plan for inventory IDs, but the live list adds the 22 previously excluded sources. Decide whether this wrapper is whole-notebook canon search or the agent's published-history gate, then align the scope and agent contract; do not label all live sources `published` by implication.

2. **High — dropping a non-ready ID makes an incomplete search look verified.** On a new source with status 1 or 5, the planned filter omits it and still queries the other IDs (`docs/plans/2026-11-07-notebook-search-scope.md:75`). A valid answer then gets `resultStatus: verified` and only the selected IDs in the metadata record (`scripts/notebooklmCanonSearch.js:326-359,444-452`), although the goal and Acceptance 1 promise the add is in scope immediately (`docs/plans/2026-11-07-notebook-search-scope.md:21,93`). For default whole-notebook search, fail the call while any listed source is non-ready, or introduce an explicit partial-scope result and narrow the goal; stderr alone cannot qualify a verified retrieval. For explicit `--source-ids`, reject a requested non-ready ID. Status 3 is not always terminal for audio (`.venv/nlm/lib/python3.12/site-packages/notebooklm_tools/core/sources.py:88-97`). Test mixed ready/processing/error lists, including the retrieval record and proof that no query runs on a rejected scope.

3. **Medium — fail-closed listing needs a shape contract.** The plan names failed, empty and non-JSON listings, but does not require rejection of valid JSON with missing/duplicate IDs, missing titles or missing/invalid statuses (`docs/plans/2026-11-07-notebook-search-scope.md:73-77`). The existing query builder joins whatever IDs selection supplies (`scripts/notebooklmCanonSearch.js:124-157`); the inventory normalizer already rejects missing IDs/titles (`scripts/notebooklmSourceInventory.js:81-99`). Require `normalizeLiveSources` to validate the complete array *before* filtering or querying, set `stage = 'source_list'` before spawning and parsing, and test that every listing/normalization failure emits `auth_failure` or `no_result` with zero query calls. The planned classification works if that stage covers the entire listing path (`scripts/notebooklmCanonSearch.js:309-324,392-442`).

4. **Medium — the reader map overstates the other reader's scope.** The map says the 08:00 continuity query uses the latest two policy editions (`docs/plans/2026-11-07-notebook-search-scope.md:42-43,59`), but an unreadable policy or empty selection makes it query the whole permanent notebook (`scripts/notebooklmDailyNews.js:1105-1120`). The repository guide also lists interactive NotebookLM MCP queries, absent from the reader table (`docs/reference/NotebookLM.md:45-48`). Add both conditions to the map. The searched script add/delete paths otherwise match the named paths; neither correction requires changing the chosen wrapper design.

## Acceptance boundary

`notebooklmCanonSearch.test.js:265-284` still calls the soon-to-be-removed `openPolicyFromInventory`; replace that fixture and exercise injected `main` failure/success paths. `notebooklmHeadlessEval.js:289-297,953-963` passes explicit IDs, and its compact gate compares the verified log's selected IDs to the request (`:653-696`), so a deleted or non-ready requested ID should fail rather than substitute a new source. Its existing test does not prove the new listing path.

No local `--source-ids` count limit is visible: the CLI splits the comma string (`.venv/nlm/lib/python3.12/site-packages/notebooklm_tools/cli/commands/notebook.py:159-188`) and serializes every ID into the query (`.venv/nlm/lib/python3.12/site-packages/notebooklm_tools/core/conversation.py:455-456`). The backend limit and memory cost remain unverified; the daily continuity code records an unscoped 73-source query exceeding 5 GB (`scripts/notebooklmDailyNews.js:756-760`). Keep Acceptance 3's one exact 149-ID live query as a required gate before claiming delivery; a 3.4 s source list and unit tests cannot prove it.

**Evidence:** source and plan read only. No NotebookLM, model, Sheet, or other network call; no tests or live query. The plan's 149 ready sources and 22/69 deltas are its own live-read claims, not reverified here.
