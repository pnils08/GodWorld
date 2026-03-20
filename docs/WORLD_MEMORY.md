# World Memory — The City's History in Articles

**The problem:** The newsroom writes about a world it thinks started 10 cycles ago. 216 curated articles covering Cycles 1-77 sit in `archive/articles/` and no system reads them. Agents, the dashboard, Supermemory, and the Discord bot all see C78+ only. The dynasty era, early civic battles, neighborhood origins, and the birth of Oakland's identity are invisible to everyone who writes about it.

**Why it matters:** Every edition builds on what came before. When Carmen writes about the Stabilization Fund, she should know its legislative history. When P Slayer writes about the A's, he should feel the weight of six championships. When Maria Keen writes about St. Columba, she should know the congregation's story across cycles. Without history, agents default to generic journalism and repeat the same 10 stories.

Last updated: Session 106 (2026-03-20)

---

## What Exists Today

### The Archive (C1-C77) — Curated, On Disk, Disconnected

**Location:** `archive/articles/` — 216 individual articles
**Naming:** `c{cycle}_{desk}_{slug}_{reporter}.txt` (strict convention, curated S33/S69)
**Coverage:** Cycles 1-77, all desks, all reporters
**Size:** 3.9MB

Also in `archive/`:
- `editions/` — 25 full edition files (mixed formats, some duplicates)
- `non-articles/data/` — TrueSource player cards, POP-ID datapages
- `non-articles/profiles/` — Reporter voice profiles
- `non-articles/indexes/` — Article manifests, canon archive ledger
- `reorganize-log.json` — 405 moves tracked, 0 errors

**Who reads it:** Nobody. No script, no agent, no dashboard endpoint reads `archive/articles/`.

### Current Editions (C78-C87) — Active, Connected

**Location:** `editions/` — 18 files (10 Cycle Pulse + 7 supplementals + 1 rejected)
**Naming:** `cycle_pulse_edition_{XX}.txt`, `supplemental_{slug}_c{XX}.txt`

**Who reads it:**
| Consumer | How | What they get |
|----------|-----|--------------|
| Dashboard API | `getAllEditions()` reads `editions/` dir | Parsed articles for search, display, initiative cross-ref |
| Desk agents | Indirectly — `buildArchiveContext.js` searches Supermemory, `buildDeskFolders.js` puts archive_context.md in workspace | Last 3 desk outputs + SM search results |
| Discord bot | `output/latest_edition_brief.md` only | Compact summary of most recent edition |
| Supermemory `godworld` | `ingestEdition.js` | E83-E87 + 5 supplementals ingested S106 (21 docs) |
| Article indexes | `output/article-index.json`, `output/article-ledger.md` | Structured metadata. Rebuilt S106 (244 entries). **Auto-refreshes via postRunFiling.js (step 22).** |
| POP-ID index | `docs/media/ARTICLE_INDEX_BY_POPID.md` | 176 citizens × article appearances. Generated Feb 5 — stale. |

### Google Drive — Complete but Not Locally Cached

**Location:** Drive folders (1_The_Cycle_Pulse, 2_Oakland_Supplementals, etc.)
**What's there:** All editions, PDFs, photos, civic docs, Mara directives
**Dashboard Source 2:** Reads from `output/drive-files/` — currently **empty**. No Drive content is cached locally for the dashboard to search.

---

## The Gaps

### Gap 1: Archive articles invisible to all systems

216 curated articles in `archive/articles/` exist on disk but:
- Dashboard doesn't read them (only reads `editions/` and empty `output/drive-files/`)
- `buildArchiveContext.js` doesn't search them (only searches Supermemory)
- Desk agents never see them
- Supermemory doesn't have them
- Article indexes don't include them (indexes were built from Drive downloads, not the curated archive)

### Gap 2: Article indexes stale

| Index | Last Built | Missing |
|-------|-----------|---------|
| `output/article-index.json` | S106 | **Rebuilt + auto-refreshes.** 244 entries. `postRunFiling.js` runs `buildArticleIndex.js --write` at step 22. |
| `output/article-ledger.md` | Feb 23, 2026 | Same |
| `ARTICLE_INDEX_BY_POPID.md` | Feb 5, 2026 | Everything after Feb 5 |
| `CITIZENS_BY_ARTICLE.md` | Feb 5, 2026 | Everything after Feb 5 |

### Gap 3: Dashboard search limited to C78+

`getAllEditions()` reads `editions/` (C78-87) and `output/drive-files/` (empty). The API endpoint `/api/search/articles` can only find articles from the last 10 editions. No access to 77 cycles of history.

### Gap 4: Supermemory `godworld` has recent editions only

E83-E87 ingested S106. E78-E82 and all C1-C77 content not in Supermemory. Agents searching `godworld` for "A's dynasty" or "early Baylight discussions" find nothing.

---

## Target State

Every system that writes about Oakland should be able to find relevant history:

```
archive/articles/ (216 curated, C1-C77)
editions/ (18 files, C78-C87)
         │
         ├── Dashboard API ──── /api/search/articles finds ALL cycles
         │                      /api/citizen-coverage includes archive appearances
         │
         ├── Article Indexes ── article-index.json covers C1-C87
         │                      ARTICLE_INDEX_BY_POPID.md covers all citizens
         │
         ├── Supermemory ────── godworld container has key articles from all eras
         │   (godworld)         buildArchiveContext.js searches and finds history
         │
         ├── Desk Agents ────── archive_context.md includes relevant historical coverage
         │                      "What happened before" is answerable
         │
         └── Discord Bot ────── Can answer questions about the city's history
```

---

## Execution Plan

### Phase 1: Connect the Archive to the Dashboard

**What:** Add `archive/articles/` as Source 3 in `dashboard/server.js getAllEditions()`.
**Why:** Makes all 216 archive articles searchable via `/api/search/articles`.
**Effort:** Small — add a directory scan block similar to Source 1 and Source 2.
**Risk:** Archive articles have different format than C78+ editions. Parser may need adjustment.

### Phase 2: Rebuild Article Indexes — DONE (S106)

**article-index.json:** Rebuilt S106 from `editions/` + `archive/articles/` + `archive/editions/`. 244 unique entries, 0 mirrors. Source dirs fixed in `buildArticleIndex.js`. **Auto-refreshes** via `postRunFiling.js` (step 22) after every edition.

**ARTICLE_INDEX_BY_POPID.md:** Still needs rebuilding. Generated Feb 5 from old Drive downloads. No automated builder exists — needs a script that cross-references article text against Simulation_Ledger citizen names.

### Phase 3: Ingest Key Archive Articles to Supermemory

**What:** Select the most important archive articles (dynasty coverage, civic milestones, neighborhood pieces) and ingest to `godworld`.
**Why:** `buildArchiveContext.js` searches `godworld`. Agents building desk briefings can then find historical context.
**Not:** Don't ingest all 216 — curate the 30-50 most important pieces. The rest stay on disk for dashboard search.
**Effort:** Medium — curation + ingestion.

### Phase 4: Enrich buildArchiveContext.js

**What:** Add local file search alongside Supermemory search. The script should grep `archive/articles/` for relevant terms, not just query the cloud.
**Why:** Supermemory search is semantic but limited. Local grep is exact and covers everything.
**Effort:** Medium — add a local search function, merge results with SM results.

### Phase 5: Update Desk Agent Workspaces

**What:** `buildDeskFolders.js` should include a `historical_context.md` in each desk workspace with relevant archive articles for the current cycle's topics.
**Why:** Agents see `archive_context.md` (last 3 desk outputs) but never see the actual historical articles. Giving them 2-3 relevant historical pieces per desk would ground their writing in the city's past.
**Effort:** Medium-high — need topic matching between current cycle and archive.

---

## Related Docs

| Doc | What it covers |
|-----|---------------|
| `docs/SPREADSHEET.md` | Which sheet tabs are active/dead |
| `docs/SUPERMEMORY.md` | Container architecture, what's in godworld |
| `docs/DASHBOARD.md` | API endpoints including article search |
| `docs/EDITION_PIPELINE.md` | Steps 20 (SM ingest) and 22-27 (post-edition) |
| `archive/reorganize-log.json` | Full record of the S33/S69 curation work |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Archive intelligence section (S33 Drive raid) |

---

## Key Principle

The world didn't start at Cycle 78. The dynasty, the civic foundations, the neighborhood identities, the reporter voices — all of that was established in C1-C77. If the systems can't find it, the journalism will keep writing about Oakland like it's a city with no past. Connecting the archive to the pipeline is how 675 citizens get their history back.
