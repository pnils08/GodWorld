---
title: Notebook Search Scope Plan
created: 2026-11-07
updated: 2026-11-07
type: plan
tags: [notebooklm, canon, draft]
sources:
  - scripts/notebooklmCanonSearch.js:12,100-122,403-412 (the search scope is the inventory file)
  - scripts/notebooklmSourceInventory.js (the inventory writer)
  - output/codex/notebooklm-source-inventory.json (written 2026-10-18 01:52, 196 sources)
  - docs/reference/NotebookLM.md §Change log 2026-11-07
  - output/production_log_run_cycle_c114_gaps.md G-ES10
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.103"
---

# Notebook Search Scope Plan

**Builder's words (2026-11-07):** "The notebook issue is real , especially if the lore pieces aren't available for search when a citizen is getting that attention that given cycle , it should be scripted that anytime something is added the index recreates , this would take priority in the next session"

**Goal:** every source in the permanent notebook is in the canon search's scope the moment it is added, and no deleted source stays in it.

**Rows:** pipeline.103 · **Owner:** engine-sheet

## Current state

- `notebooklmCanonSearch.js` scopes every query to the ids in `output/codex/notebooklm-source-inventory.json` (`openPolicyFromInventory`, :103-122; read at :407). It does not list the live notebook and does not run `notebooklmCanonSourcesValidate.js`.
- Only `scripts/notebooklmSourceInventory.js` writes that file, by hand (`lore-ingest` SKILL step). No add path calls it: `cron-saturday-run.js:1583` (editions), `notebooklmPush.js:151,247` (pushes, lore through `loreIngest.js`), the 2026-11-07 C114 swap script. Last written 2026-10-18 01:52.
- Live read 2026-11-07 22:1x: notebook 149 sources, inventory 196. **22 live sources are outside the search scope:** editions C112, C113, C114 (Y3C8–Y3C10), lore `deep_dive_henry_rivas.md (Y3C8)`, 17 `FULL STAT TRUE SOURCE — 2041` cards (Morton, Quintero, Rivas, Ka, Devine, Ellis, Colon, Valencia, Clark, Cross, Aitken, Richards, Almanzar, Tumolo, Coles, Keane, Gonzalez), `civis_journal_c111 2.pdf`. **69 inventory ids are no longer in the notebook** and are still passed as `--source-ids`.
- `validateQueryResponse` (:178-212) throws when NotebookLM uses or cites a source outside the scope, so a query that reaches one of the 22 fails closed instead of answering.
- Policy `scripts/notebooklmCanonSources.json`: every listed published / reference / excluded id is live; lore `3824b8b0-…` is not (strict validator fails on it); 69 live ids carry no policy entry. The policy is the audit, not the search gate (:100-102, builder ruling "the notebook cannot invent canon").
- Callers: `.claude/agents/source-search`, skills `sift`, `deep-dispatch`, `city-hall-prep`, `scripts/notebooklmHeadlessEval.js`. Retrieval log `output/retrieval/notebooklm-canon-search.jsonl`: 8 calls, last 2026-10-19. The cron newsroom searches canon through Supermemory (`search_canon`); a lore pass also goes to bay-tribune (`loreIngest.js:175-202`). Which cron readers, if any, reach the notebook is Task 1.

## Design

Decided at pickup, after Task 1. The two shapes on the table:

1. Every add and delete path refreshes the inventory after a confirmed add (one shared helper; Saturday run, `notebooklmPush`, `loreIngest`, any hand script).
2. The search lists the live notebook at query time (one `nlm source list` per call) or refreshes a cached inventory older than its newest source; the add paths stay as they are.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Reader map: every path that queries the permanent notebook (cron and manual) and what scope it uses; every path that adds or deletes a source | es | not started |
| 2 | Design pick from Task 1 (shape 1, 2 or both), advisor, one codex review | es | not started |
| 3 | Build + tests; one refresh run on live; the strict validator's lore `3824b8b0-…` and the 69 unclassified ids reported, not hand-classified | es | not started |
| 4 | Change log line in `docs/reference/NotebookLM.md`; `lore-ingest` SKILL step trued | es | not started |

## Acceptance

1. After a source add on live, the canon search's scope holds the new id with no hand step — proven by one add + one scoped query naming it.
2. The 22 sources above are in scope and the 69 dead ids are not — proven by readback of the scope against `nlm source list`.
3. A query that cites C114 answers instead of failing closed — proven by one live query.

## Changelog

- 2026-11-07 — filed from the builder's words after the C114 notebook swap surfaced the stale inventory; current state read live (22 out of scope, 69 dead). Stub; design at pickup.
