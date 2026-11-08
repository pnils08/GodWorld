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

## Reader map (Task 1, 2026-11-08)

Live read 2026-11-08: `nlm source list` 149 sources, all status 2 (ready), 3.4 s wall. Diff vs inventory and policy unchanged from 11-07 (22 out, 69 dead, 69 live ids with no policy entry, policy lore `3824b8b0` not live).

**Readers of the permanent notebook** (`config/notebooklm.json` `notebookId`):

| Reader | Runs | Scope it passes | State |
|---|---|---|---|
| `notebooklmCanonSearch.js` | manual only: `source-search` agent, `/sift`, `/deep-dispatch`, `/city-hall-prep`, `notebooklmHeadlessEval.js`. No cron calls it | inventory file ids (:103-122, :407) | **stale** — the only reader on the inventory |
| `notebooklmDailyNews.js:1105-1131` archive continuity | cron 08:00 daily | latest 2 editions from the **policy** (`continuitySourceIds` :762, `cycle_pulse_cN.txt` evidence) | current: policy holds C107–C114 (Saturday run records each edition) |
| `cron-desk-run.js:2479` `nlmCanonBrief` | non-persona desk wakes only (:2205 gate, pipeline.75); every scheduled seat is a persona seat | whole notebook, no `--source-ids` | dormant on schedule; 1 output ever (C110 business benchmark) |
| `notebooklmPush.js:279` summary query | after a push with `--summary` | whole notebook | not scope-bound |
| `generateAndDeliverEditionAudio` | Saturday run, `notebooklmPush --audio` | the new edition's source id | not scope-bound |

**Add / delete paths on the permanent notebook:**

| Path | Adds | Deletes | Policy write | Inventory write |
|---|---|---|---|---|
| `cron-saturday-run.js:1583` stepPublish (Sat 16:00 cron) | edition | — | `recordCanonSource` published | none |
| `notebooklmPush.js:247` (`/post-publish`, `loreIngest.js:173`) | edition / lore | — | lore only, by `loreIngest.recordSource` | none |
| `notebooklmPush.js:151` `ensureDirectionSource` | audio direction guide (hash title) | — | none | none |
| `lore-ingest` SKILL step (SKILL.md:44) | — | — | — | **the only refresh**, by hand |
| Hand sessions: MCP `source_add` / `source_delete`, NotebookLM web page | stat cards (pipeline.72 2026-10-19: 17 FULL cards added, 22 retired; `docs/reference/TRUESOURCE_CARD_BUILD.md` steps 5, 8), C114 swap (`output/engine-sheet/2026-11-07-c114-notebook-swap.js`), `Lore : deep_dive_henry_rivas.md (Y3C8)` and `civis_journal_c111 2.pdf` (titles match no script's title format) | 46 card ids, eleven `109_*` sheet dumps, eleven `<name>_2041.txt` intake copies, `Lore: danny_horn_deep_dive (Y3C7)` = policy `3824b8b0` | none | none |
| `notebooklmDailyNews.js:721` stale-source delete | — | newsroom notebook only, never the permanent one | — | — |

**What the map settles:** 17 of the 22 out-of-scope sources and every one of the 69 deletions came through hand paths no script runs, and the web page has no hook. A refresh tied to add paths (shape 1) would still miss them. Only the canon search reads the inventory; the 08:00 cron reads the policy, which the Saturday run keeps current.

## Design

Decided at pickup, after Task 1. The two shapes on the table:

1. Every add and delete path refreshes the inventory after a confirmed add (one shared helper; Saturday run, `notebooklmPush`, `loreIngest`, any hand script).
2. The search lists the live notebook at query time (one `nlm source list` per call) or refreshes a cached inventory older than its newest source; the add paths stay as they are.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Reader map: every path that queries the permanent notebook (cron and manual) and what scope it uses; every path that adds or deletes a source | es | done 2026-11-08 (§Reader map) |
| 2 | Design pick from Task 1 (shape 1, 2 or both), advisor, one codex review | es | not started |
| 3 | Build + tests; one refresh run on live; the strict validator's lore `3824b8b0-…` and the 69 unclassified ids reported, not hand-classified | es | not started |
| 4 | Change log line in `docs/reference/NotebookLM.md`; `lore-ingest` SKILL step trued | es | not started |

## Acceptance

1. After a source add on live, the canon search's scope holds the new id with no hand step — proven by one add + one scoped query naming it.
2. The 22 sources above are in scope and the 69 dead ids are not — proven by readback of the scope against `nlm source list`.
3. A query that cites C114 answers instead of failing closed — proven by one live query.

## Changelog

- 2026-11-08 — Task 1 reader map: the canon search is the only reader on the inventory and runs manual-only; the 08:00 cron scopes by the current policy; the out-of-scope adds and all 69 deletions came through hand paths with no script to hook.
- 2026-11-07 — filed from the builder's words after the C114 notebook swap surfaced the stale inventory; current state read live (22 out of scope, 69 dead). Stub; design at pickup.
