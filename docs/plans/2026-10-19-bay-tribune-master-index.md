---
title: Bay Tribune Master Index Plan
created: 2026-10-19
updated: 2026-10-19
type: plan
tags: [media, newsroom, retrieval, draft]
sources:
  - scripts/buildArticleIndex.js (master index builder — outputs not on disk)
  - scripts/buildPopidArticleIndex.js (ARTICLE_INDEX_BY_POPID.md, built 2026-03-24)
  - scripts/sweepCanonIngest.js (Drive -> Supermemory sweep; DRIVE_CANON_FOLDERS)
  - scripts/reorganizeArchive.js + archive/reorganize-log.json (the 2026-02-23 archive move)
  - scripts/godworld-mcp.py (search_articles passes q only), dashboard/server.js:1881 (/api/search/articles has author and citizen filters)
  - docs/plans/2026-10-19-discord-voices-connected.md (where the gaps surfaced)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.84"
  - "[[2026-10-19-discord-voices-connected]] — research.30"
  - "[[BACKLOG]] — pointer line only"
---

# Bay Tribune Master Index Plan

**Builder's words (2026-10-19):**
- "no cron would look up heat shield it would look up Elias Varek , Jax caldera , you bring up a good point tho , each journalist article like should be indexed at some point ... we still have issues with the mass amount of articles I have and the ability for them to come up in keyword type searches , I appreciate wanting to be able to pull an article as well but maybe that's where the index comes in"
- "having a master bay tribune index would maybe help solve a lot of this"
- "the idea is if Jax is going to cover Elias a pre check on the work would uncover that he has covered him before . This way the storyline persists into the next one"
- "The older index are likely the pre cycle work , so adding the newer stuff would ultimately be the work , everything is on mydrive just scattered . So the idea was to house it all on disk in a clean formatted way that made searching easy . We even spent time naming everything with strict conventions."
- "It's a mess on my end" (Drive roots `1NEIimxouKHwrVF0Wuhz7rjwX94_-FvNZ`, `1WPzd_ggOxsV2mm1FTtdE0UozgKBvtR9E`)

**Goal:** every published Tribune piece has one row — title, filed headline, byline POPID, cycle, section, citizens named, where each copy lives — and a journalist's assignment is checked against their own earlier pieces on the same subjects before they write.

**Rows:** pipeline.84 · **Owner:** research-build

## Measured 2026-10-19

| Shelf | Holds the Heat Shield (Jax Caldera on Varek) | Why |
|---|---|---|
| Supermemory `bay-tribune` | yes — Edition 100 record (filed under a Cy Newell opinion headline) + 2 Drive-canon copies | found by meaning; the byline is inside the text, no author field |
| NotebookLM | yes | needs a citation-bearing phrasing |
| Repo disk | no — local Edition 100 lacks it; only NotebookLM daily query leftovers quote it | Drive saved, repo save did not happen |
| Dashboard article index | no | reads `editions/` + `archive/articles/`; the piece is in neither |

Asked five ways (author + subject, "Heat Shield", conversational, long, "Jax Varek"; hit = the column's own text): MCP `search_canon` 3/5 · bots' mixed shelf 2/5 · `search_articles` 0/5 · MCP file search 0/5 · writers' `canon_search` and the old bot search (files only) 0/5. Causes: byline only inside the text; filed headline differs from the title; the column is stored 3 times and the copies take result slots; world cards crowd a mixed shelf. The dashboard filters `author=` and `citizen=` work live (Jax Caldera 8 pieces C92–C111, Elias Varek 23); the MCP tool never passes them.

| Index version | Built | Covers | Gap |
|---|---|---|---|
| `CANON_ARCHIVE_LEDGER.md` | 2026-03-05 | 378 Drive-mirror files by desk | no Jax; the mirror is gone (1 file left in `output/drive-files/`) |
| `ARTICLE_INDEX_BY_POPID.md` | 2026-03-24 | 235 files, 250 citizens | no Varek (0 refs) |
| `buildArticleIndex.js` master | never kept | editions + drive mirror + archive | outputs absent |
| Portfolios | — | Hal, Anthony, P Slayer | none for Jax |
| `archive/articles/` | 2026-02-23 | 216 files, all follow `c<cycle>_<desk>_<byline>_<slug>`; 181 are `cXX`, 149 byline `unknown`; numbered cycles end at 81 | nothing after C81 |

Drive (read-only, service account): `1_The_Bay_Trbune` 108 folders / 686 files / 460 text-or-doc / 27 in Supermemory; `God_World_Citizens` 142 / 320 / 286 / 98. The canon sweep covers two subfolders (`Gemini`, `Bay_Tribune_Oakland`) = 125 of 746 text-or-doc files. Not synced: Mara_Vance 116, zz.Archive 110, 1_The_Cycle_Pulse 65, 2_The_Supplementals 44, Sports_Desk 34, Oakland_Sports_Desk 144 (Anthony columns 28, Hal features 20 + Origins 8, P Slayer ~42), Civic_System 29, The_Lore 10 … (some may reach Supermemory by the edition ingest or the Saturday sweep). `jax_varek_column.md` also sits in `2_The_Supplementals/` and its `archive/`. Also 85 PDFs and ~107 audio files, not text.

Pre-check state: none in production. `priorArcRequirement.js` and the NotebookLM `prior-published-arc` lane run in evaluation only (`--brief-requirement-file`; no cron). Jax's C108 assignment listed Elias Varek among the affected citizens; the staged piece never named him.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Scope: published pieces only — Cycle Pulses, Supplementals, Sports Desk and Oakland_Sports_Desk columns and features, Dispatch, Interviews and Pressers, Profiles, Mags editorials, podcast scripts. Out: Mara's audits, exports, tool folders (Gemini, Kimi, NotebookLM, Crons_Media) | builder | decided 2026-10-19 |
| 2 | Sync in-scope Drive text to disk under the archive convention (Drive stays the front door); derive cycle and byline from each file's own header; repair the `cXX` / `unknown` names | rb | not started |
| 3 | Master index builder — one row per article, copies folded (repo path, Drive id, Supermemory customId); staged pieces that missed the Saturday gate listed and flagged unpublished; rebuilt each Saturday after the sweep | rb | not started |
| 4 | MCP `search_articles` passes `author` and `citizen`; writers' `canon_search` and the bots read the index | rb / es | not started |
| 5 | Assignment-time pre-check, Jax first: byline POPID x the slice's citizens -> that journalist's earlier pieces on them and the replies printed to them, shown in the assignment as context (not forced); widen to every seat once it reads well | rb (+ es for the slice builders) | not started |
| 6 | Jax–Varek rivalry canon bond (`mintCanonBonds.js`) — one-sided, as Varek–Paulson | rb | waiting on the builder's article |

## Acceptance

1. Author lookup "Jax Caldera" and citizen lookup "Elias Varek" both return the Heat Shield — proven by a search readback after Task 3.
2. Jax's next assignment that names Varek carries the Heat Shield and Varek's printed reply — proven by the next unattended Jax staged assignment.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| none — rb measurements only | rb | this plan §Measured | read-only |

## Open questions

None open. Answered 2026-10-19: scope = published pieces only; front door = Drive; pre-check = Jax first, shown not forced. rb call: unpublished staged pieces are indexed and flagged.

## Changelog

- 2026-10-19 (research-build) — Created from the BACKLOG entry and the retrieval, index and Drive measurements taken while building research.30. Nothing built.
- 2026-10-19 (research-build) — Builder answered scope (published only), front door (Drive), pre-check (Jax first, shown not forced); unpublished staged pieces indexed and flagged (rb call). Row pipeline.84 stays needs-info until Task 2 is picked up.
