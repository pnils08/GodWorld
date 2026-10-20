---
title: Bay Tribune Master Index Plan
created: 2026-10-19
updated: 2026-10-20
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

## Measured 2026-10-20 (overnight prep; read-only, nothing landed)

Drive walked live with the read-only service account; all 746 text-or-doc files fetched to a scratch folder and compared with `editions/`, `archive/`, the dashboard and the canon search.

**Claims checked**
- Drive totals exact: 250 folders, 1,006 files (Bay Tribune 108 / 686, Citizens 142 / 320); 746 text-or-doc files. Oakland_Sports_Desk and Bay_Tribune_Oakland sit under God_World_Citizens, not under the Bay Tribune root.
- Dashboard filters live: Jax Caldera 8 pieces, earliest C87 (the labor supplemental), not C92; Elias Varek 23; `q=Heat Shield` 0. The `archive/articles` counts hold: 216 files, 181 `cXX`, 35 numbered (none past C81), 149 byline `unknown`.
- Heat Shield is Edition 100: the canon search returns it inside the Edition 100 ingest record (cycle 100, type edition), the trade it opens on (Cy Newell to New York, Herbert Jones) is printed in Edition 99, and the Edition 102 record carries Varek's printed reply. Task 6 said Edition 95; corrected. The bond row itself names no edition.
- Local `editions/cycle_pulse_edition_100.txt` holds nine pieces and not the Heat Shield, and no commit in git history ever held it (pickaxe on `Heat Shield` over `editions` and `archive`: no hit). The file has four Drive copies (Supplementals, its `archive`, Gemini, its `archive`), none with a cycle in the header; the two Supplementals copies differ by one byte and the desk word (`Opinion` matches the Edition 100 ingest, `Civic` is the other).

**What is on disk (individual file, not a bundle) versus not.** Two shelves, kept apart: "on disk" is the repo; "in Supermemory" is the canon store. The 2026-10-19 "not synced" list was the second.
- In-scope text files: 410 across 12 top folders, 351 unique by body fingerprint (59 copies).
- On disk already: 324 of the 351. 279 sit in `editions/`, `archive/articles` or the profiles shelf. About 45 sit only on the data / unknown / templates / indexes / mirrors shelves or in `archive/editions`, so they need a classification pass, not a landing.
- Not on disk at all: 27 files, about 20 distinct pieces: the Heat Shield (2 copies); the C100 Martin Richards trade (3 versions); the C99 Jerami Grant trade, Oaks offseason dispatch and Oaks expansion draft; Coles trade analytics; Mason Ortega's kitchen piece; four C89 culture supplementals; the C76 West Oakland and C86 Paulson Media supplementals; the C90 podcast transcript and the continuity briefing; the C92 Santana interview; the C102 Varek profile and three citizen records (Saint Lucia, Amara Olsen, Richmond manifest); Hal's Danny Horn player profile; edition 87 v1 (a draft of an edition already on disk); two index files (Sports_Desk manifest, Hal index README) that are not articles.

**Header reality.** From the file's own text or name: cycle for 122 of 410, byline for 194, both for 87. Sports_Desk and Oakland_Sports_Desk give a cycle for 0 of 178: pre-cycle work dated by season. The reorganize log shows 183 moves landed as `cXX`: Anthony, Hal and arts columns from the old Drive mirror folders, pre-cycle by origin, not a failed extraction. The archive names carry two orderings (desk_slug_reporter and desk_reporter_slug), so a byline cannot be read from a filename. **Decision (rb): pre-cycle pieces keep `cycle: null` plus an era note; no cycle is invented; byline repair only where the header carries one.**

**Why the dashboard cannot be the index.** Its edition parser lists section headings (`CIVIC / GOVERNMENT`) and table rows (`POP-00527 | Mike Paulson | ...`) as articles with a null author, and leaves interviews and supplementals at `C?`. Its archive parser reads the author from filename group 4 and only from an `UPPERCASE NAME - Role` first line, so a `By X` header in an archive file is not read. A landed file must therefore carry the byline slug as its last filename part to answer `author=`.

**Why disk placement fixes the writers.** The writers' `canon_search` and the MCP file shelf are a live keyword grep over `output`, `docs`, `editions`, `archive`. `editions/` and `archive/articles` rank first; the cap is 6 files and 5,000 characters. A piece landed in `archive/articles` with its byline and names in the text is found with no search change. The 0 of 5 for the Heat Shield was absence from disk.

**Sources for the rows.** `editions/` (50 files, 393 `By Name | Bay Tribune Desk` lines; `Names Index:` lines before C103, `## INTAKE` blocks from C103); `archive/articles` (216); staged sidecars (110, C107 to C112: `bylinePopid`, desk, hoods, status; Jax C111 intake names are empty); published set per cycle in `edition_published_c{N}.json` `selected`; citizens named from a name scan of `output/citizen-names.tsv` (1,044 rows), resolved by name, never by an agent-supplied POPID. Rename blast radius for `archive/articles`: 2 references outside `archive/`.

**Pre-check ground.** `priorArcRequirement.js` is the NotebookLM evaluation lane (UUID source ids, forced use), not this. The per-seat `_arc.json` files hold citizen quote seeds, not prior coverage. The hook is `buildJaxSlice.js`, the Jax assignment pack.

**Files this plan names (FIX, don't ADD).** Rewritten in place: `scripts/buildArticleIndex.js` (it already has the reporter map, edition parser and fingerprint dedupe; its inputs are stale). New, named here: `scripts/syncDriveArticles.js` (reuses the canon sweep's Drive walk), `archive/drive-manifest.json` (Drive id to disk path to fingerprint), `archive/ARTICLE_INDEX.jsonl` (one row per piece). Task 5 will name its own lib file in its design.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Scope: published pieces only — Cycle Pulses, Supplementals, Sports Desk and Oakland_Sports_Desk columns and features, Dispatch, Interviews and Pressers, Profiles, Mags editorials, podcast scripts. Out: Mara's audits, exports, tool folders (Gemini, Kimi, NotebookLM, Crons_Media) | builder | decided 2026-10-19 |
| 2 | Land the Drive-only pieces (list in §Measured 2026-10-20) with `scripts/syncDriveArticles.js`: articles into `archive/articles`, profiles into `archive/non-articles/profiles`, filename `c<cycle>_<desk>_<slug>_<byline-slug>.txt` (cycle from header, name, or the published ingest tag; pre-cycle `cXX`); manifest `archive/drive-manifest.json`; folded copies keep the one matching the published ingest, the other's Drive id and diff go on the row; classify the ~45 shelf-only pieces. Own commit; renames are a second commit, only where the header supplies a byline or a number | rb | done 2026-10-20: 21 landed, manifest 410 rows (340 on disk, 40 shelf-only, 21 landed, 5 variants, 1 copy, 1 draft, 2 not-articles); Jax `author=` returns 9 with the Heat Shield at C100 |
| 3 | Rewrite `scripts/buildArticleIndex.js` in place to emit `archive/ARTICLE_INDEX.jsonl`: one row per piece from `editions/` (split per article), `archive/articles`, the profiles shelf, `archive/editions` bundles, the 13 shelf-only pieces the manifest classes as `piece`, staged sidecars (flagged unpublished unless in `selected`) and the manifest; title (or lede when the piece printed none), byline and POPID, desk, cycle or null plus era, citizens named (name scan), copies folded (repo path, kind, Drive ids, variant Drive ids). Supermemory customIds are left off the rows: presence can only be proven by listing the org's documents, and nothing here needs it. Rebuilt each Saturday after the sweep (cron-saturday-run, es wires) | rb | built 2026-10-20: 866 rows (412 edition, 265 archive, 82 archive-edition, 66 staged, 28 profile, 13 shelf-only), 765 with a byline, 752 with a POPID; every title and non-staged byline read back against its file; two blind agy samples (80 rows) scored. Weekly rebuild wired by es (e4d4b05b) |
| 4 | `search_articles` passes `author` and `citizen`, and the dashboard endpoint reads the index rows so a section heading is never an article; writers' `canon_search` needs no change once Task 2 lands. Spec and diff by rb, reviewed by agy against a checklist, pushed by es; the MCP server picks it up when the builder reconnects it | rb / es | diff committed (ccf78191), tested on a throwaway dashboard on 3101; es holds the pm2 restart for the agy diff review; MCP needs the builder's reconnect after the restart |
| 5 | Assignment-time pre-check, Jax first: byline POPID x the slice's citizens -> that journalist's earlier pieces on them and the later pieces that name both, read from the index and shown as context in the `buildJaxSlice.js` pack (not forced); widen to every seat once it reads well | rb (+ es for the slice builders) | built (2342a743, de04a5aa after es's send-back: an unreadable index throws, the caller warns, the slice carries `priorCoverageError` and the packet says earlier coverage is unavailable); suite PASS; es accepts or sends back before the push |
| 6 | Jax–Varek rivalry canon bond (`mintCanonBonds.js`) — rivalry 7, CIVIC, one-sided as Varek–Paulson; from The Heat Shield, Edition 100 and Varek's named reply | rb | done, live, read back (BondId `b6edvstz`) |

## Acceptance

1. Author lookup "Jax Caldera" and citizen lookup "Elias Varek" both return the Heat Shield — proven on the index (16 and 31 rows) and through the new dashboard code on a throwaway port (12 published and 31); live after es restarts the dashboard and the builder reconnects the MCP.
2. Jax's next assignment that names Varek carries the Heat Shield and Varek's printed reply — the pre-check returns C95, the Heat Shield (C100) and the C102 profile for Varek; proven for real by the next unattended Jax staged assignment that names him.
3. The writers' own disk search finds the Heat Shield: `searchDisk('Heat Shield Jax Caldera Varek')` returns `archive/articles/c100_opinion_heat-shield_jax-caldera.txt` and the C102 Varek profile (it returned nothing before Task 2).

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Blind sample, round 1: 38 rows, agy read each file and reported headline, byline and cycle without seeing the index values | agy | scored against the index in this session | 28 of 38 headlines agreed. Misses were real and fixed: a dek taken for the headline, headings placed after the byline behind the cron wrapper, `NAME - Role` banners, record names, `[TAG]` and `reporter:` lines, `c75_` names, a series banner taken for a byline. After the fixes 37 of 38 (the 38th is the same title with a prefix) |
| Blind sample, round 2: 42 fresh rows after the fixes | agy | same | Headlines 41 of 42, cycles 42 of 42, bylines 39 of 42. Misses fixed: the wrapper label `THE WEEK'S REPORTING`, `Column:` and `reporter:` header lines, a `DESK - Reporter` banner (kept strict: exact names, first three lines, single-reporter files; the first looser version credited reporters on working docs and compilations and was cut back). The fourth miss is a staged draft whose byline lives in its sidecar, correct as built |
| Jax pre-check hook | es | send-back on 2026-10-20 | Two silent catches made a broken index read as "Jax never covered them". Accepted: `priorCoverage` throws, the caller warns, the slice and the packet carry the error |
| Tasks 4 and 5 diff against a fixed 14-item checklist (index only on `author`/`citizen`, published-only default, regex escaping, cache reload on file change, 404 when missing, URL encoding in the MCP, empty-argument guard, raw-text fallback, slice error carried and shown, no added writes or network or random) | agy | 14 answers with quoted lines; rb re-read the patch for D3, D4, D12, D13, D14 | 14 of 14 as the checklist expects. No change from the review. The only added import is `statSync`; `priorCoverage` has no catch of its own |

## Open questions

None open. Answered 2026-10-19: scope = published pieces only; front door = Drive; pre-check = Jax first, shown not forced. rb call: unpublished staged pieces are indexed and flagged.

Answered 2026-10-20 (builder): the Heat Shield is a standalone article written in C100, so it lands as its own piece at cycle 100 and the local Edition 100 file stays as it is. Nothing open.

## Changelog

- 2026-10-19 (research-build) — Created from the BACKLOG entry and the retrieval, index and Drive measurements taken while building research.30. Nothing built.
- 2026-10-19 (research-build) — Builder answered scope (published only), front door (Drive), pre-check (Jax first, shown not forced); unpublished staged pieces indexed and flagged (rb call). Row pipeline.84 stays needs-info until Task 2 is picked up.
- 2026-10-19 (research-build) — Task 6 done: Jax–Varek rivalry 7 minted live from the Heat Shield the builder pointed at (the Drive file); rb had wrongly held it for a further article.
- 2026-10-20 (research-build) — Overnight prep, read-only. Drive totals confirmed; 351 unique in-scope pieces, 324 already on disk, about 20 distinct pieces missing (Task 2 shrinks from a sync to a landing); pre-cycle pieces keep `cycle: null`; the dashboard parser rules it out as the index; Task 6 edition corrected 95 to 100; files named in §Measured 2026-10-20. Nothing landed.
- 2026-10-20 (research-build) — Task 2 done. `scripts/syncDriveArticles.js` walks the in-scope Drive folders read-only, matches each file to disk by body text and writes `archive/drive-manifest.json`; a piece with no home lands only if its name is in the script's OVERRIDES table. 21 landed (Heat Shield `c100_opinion_heat-shield_jax-caldera.txt`, the Richards trade, two C99 Oaks pieces, four C89 culture pieces, the C92 Civic Ledger piece, the C90 podcast, two supplemental bundles, six profile or briefing records, three era-only Anthony and Mason pieces). Variants not landed: the archive Heat Shield (Civic / WNBA), two Richards alternates ("The Coldest Calculation"), the older Santana copy; edition 87 v1 is a draft; two index READMEs are not articles. Edition 100 ingest confirms the landed Heat Shield and Richards text. Dashboard readback: Jax 9 pieces, `q=Heat Shield` 1, Varek 25. `sweepCanonIngest.js` now exports `listDriveFiles` and `fetchText`.
- 2026-10-20 (research-build) — Rename repair, own commit. 47 `archive/articles` files renamed where the header carries a known reporter's byline and the filename did not end in it (22 swaps of the slug and reporter positions, 25 sets of the last part), logged under `renames` in `archive/reorganize-log.json`. Four files that looked like swaps were whole editions with 8 to 13 bylines (Edition 79 twice, 80, 81 in the archive shelf), so they were put back: a bundle has no single author, and the index will classify them as bundles. 166 files have no header byline that names a known reporter and keep their names; no cycle was set on a `cXX` file because the three header hits name cycles inside the text, not the filing cycle. Nothing outside the logs and the manifest referenced the old names. Dashboard readback: `author=Elliot Graye` and `author=Rachel Torres` now find their cXX pieces.
- 2026-10-20 (research-build) — Task 3 built. `scripts/buildArticleIndex.js` rewritten in place (CommonJS; the old inputs under `output/drive-files/` are gone): 866 rows into `archive/ARTICLE_INDEX.jsonl`. Splitter handles `By X | Desk`, `By X, Role`, bare `By X` for known reporters, a `# Title` after the byline (C103+), a heading or bold title above it (earlier), and untitled pieces (lede kept). A byline counts only when it names a known reporter or reads as a desk; header and filename guesses outside that list are dropped (96 rows have no byline). 17 working docs filed in `archive/articles` are skipped by the dashboard's own skip list. Staged drafts: 44 attach to their printed row, 66 stand alone (65 unpublished, 1 selected but unmatched: Shimizu C109). Shelf-only classification in the manifest: 13 piece, 12 data (Statcast cards), 7 index, 4 mirror, 3 template, 1 assignment. Readback: author Jax Caldera 16 (C87 to C111, 4 staged flagged), citizen Elias Varek 31, title Heat Shield 1 at C100. Every row's title and every non-staged byline found in its file. The dashboard still has no reader for the index: Task 4.
- 2026-10-20 (research-build) — Tasks 3 to 5 reviewed and folded. Agy blind samples (38 then 42 rows) found real title and byline defects in the splitter, fixed in 3b to 3d; es sent back the Jax hook for two silent catches (accepted, 5c); agy's 14-item diff checklist on Tasks 4 and 5 came back clean and rb verified five of the answers against the code. es wired the Saturday rebuild (e4d4b05b, step 5b). The writers' own disk search now returns the Heat Shield and Varek's C102 profile. Still open: es's pm2 restart of the dashboard, the builder's reconnect of the godworld MCP, the push, and the next unattended Jax assignment that names Varek.
