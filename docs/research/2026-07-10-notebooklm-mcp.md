---
title: NotebookLM MCP — edition-ingest bridge — research
created: 2026-07-10
updated: 2026-07-10
type: reference
tags: [research, media, infrastructure, active]
sources:
  - https://github.com/PleasePrompto/notebooklm-mcp — queued S307 (SESSION_CONTEXT NEXT line)
  - https://github.com/jacob-bd/notebooklm-mcp-cli
  - https://github.com/roomi-fields/notebooklm-mcp
  - docs/engine/ROLLOUT_ARCHIVE.md §Phase 12.6 — S67 NotebookLM findings + Podcastfy pivot
  - docs/plans/BACKLOG.md §Phase 30 — "own the voice Mike already listens to"
  - docs/mags-corliss/JOURNAL.md (S67 entry, ~line 3156) — Mike listens to every edition via NotebookLM
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — registered same commit"
---

# NotebookLM MCP — edition-ingest bridge — research

**Source:** Three MIT-licensed GitHub repos that automate Google NotebookLM (no official API exists), surveyed 2026-07-10. Plus prior GodWorld state: S67 NotebookLM research (ROLLOUT_ARCHIVE §Phase 12.6), BACKLOG Phase 30, S67 journal entry. Trigger queued S307; Mike-direct S310: "this is how I ingest editions so a deliberate relationship would be a huge unlock."

**What this addresses:** Mike's actual edition-consumption path is NotebookLM — he uploads each published edition manually and listens to the two-host audio overview. That step lives entirely outside the pipeline: the pipeline ends at Drive, and the last mile to Mike's ears is hand labor. A deliberate MCP relationship makes edition→notebook→audio a post-publish pipeline step, and opens a second surface: grounded, citation-backed Q&A over the full edition archive.

**What it does:** All three drive NotebookLM through Google login sessions, not an official API. Two mechanisms in the field: **DOM automation** (PleasePrompto via Patchright stealth-Chrome; roomi-fields via Playwright) — a real browser clicks the web UI; and **reverse-engineered internal API** (jacob-bd) — a headless browser extracts cookies once, then direct HTTP calls to NotebookLM's internal endpoints. All expose MCP tools for: create/select notebooks, add sources (text, URL, PDF, Drive), ask questions with citations, generate + download audio overviews. jacob-bd adds a CLI and batch ops; roomi-fields adds a 33-endpoint REST API and full Studio generation (video, infographic, slides, report).

**Landscape:**

| Repo | Mechanism | Stars / activity | Distinct strengths | Weak spots |
|---|---|---|---|---|
| [PleasePrompto/notebooklm-mcp](https://github.com/PleasePrompto/notebooklm-mcp) | Patchright stealth Chrome (DOM) | 3k+ / v2.0.0 May 2026 | Node ≥18, persistent auth profile, multi-account, tool-set profiles | DOM automation = slow + brittle vs UI changes; interactive `setup_auth` needs a display |
| [jacob-bd/notebooklm-mcp-cli](https://github.com/jacob-bd/notebooklm-mcp-cli) | CDP cookie-extract → internal API | 5.4k / v0.8.5 **2026-07-10**, 121 releases | Fastest + most stable mechanism (no DOM), CLI (`nlm audio create`) scriptable from Node/bash, 39 MCP tools, batch ops, named profiles | Python 3.8+; undocumented internal API can break silently; cookies refresh every 2–4 weeks; ~50 queries/day free tier |
| [roomi-fields/notebooklm-mcp](https://github.com/roomi-fields/notebooklm-mcp) | Playwright (DOM) | 112 / v2.1.0 Jun 2026 | REST API for non-MCP callers (n8n/curl), full Studio (audio/video/slides/report), audio language + custom instructions, TOTP auto-reauth | Smallest community; DOM brittleness; heaviest surface for our narrow need |

**Extraction — what's usable:**
- `add_source` / `nlm source add` → **post-publish auto-ingest**: edition `.txt`/PDF pushed to a standing "Bay Tribune" notebook as a pipeline step in `/post-publish` — removes Mike's manual upload entirely
- `generate_audio` + `download_audio` → **owned audio delivery**: the audio overview Mike already listens to, generated and dropped where he'll find it (Drive folder / Discord ping) — this is BACKLOG Phase 30's "own the voice Mike already listens to," achieved by owning the *handoff* rather than replacing the voice
- `ask_question` (grounded, citation-backed) → **reader-side canon Q&A**: a notebook holding the edition archive becomes a queryable memory surface — "what happened with the Stabilization Fund?" answered with citations from published editions, independent of Supermemory/claude-mem (those index build-side; this indexes what was *published*)
- batch ops (jacob-bd) → **archive backfill**: 100+ published editions loaded into notebooks in one pass, so the Q&A surface covers history, not just new cycles
- audio custom-instructions (roomi-fields; jacob-bd formats) → per-edition steering of the overview (e.g., "lead with the civic story") without giving up NotebookLM's two-host format Mike likes

**Not applicable / hazard:**
- **All unofficial.** No Google-sanctioned API; TOS-gray. roomi-fields explicitly advises a dedicated Google account for the automation. Any Google UI/endpoint change can break the bridge without notice — treat as convenience layer, never a canon store.
- **Auth is the fragile joint** — S67's core finding still true in 2026. Interactive first-login needs a display (this box is headless — one-time X-forward or login done on a machine with a screen, profile copied). jacob-bd cookies need refresh every 2–4 weeks — a re-auth failure mode `/post-publish` must degrade gracefully around, not block on.
- **Free-tier ceilings:** ~3 audio overviews/day, ~50 queries/day. Fine at per-cycle cadence; rules out bulk audio-backfill of the archive.
- **Not a Podcastfy conflict.** Phase 12.6 (S67) built podcast-desk/Podcastfy to *replace* NotebookLM for editorial-controlled audio. This bridge serves the opposite case: keep the NotebookLM overview Mike actually uses, remove the manual labor. Complements, not competitors — don't re-litigate 12.6.
- **Build-our-own set aside:** reverse-engineering NotebookLM internals ourselves duplicates jacob-bd's 121 releases of maintenance for zero differentiation. If we build anything, it's the thin GodWorld-side wrapper (post-publish step + delivery), not the NotebookLM client.

**Verdict:** `adopt` — the use-case is confirmed real (it's Mike's standing ingest path) and at least two viable clients exist. Repo pick pending: Mike has repos to walk through S310; on today's evidence jacob-bd/notebooklm-mcp-cli is the front-runner (internal-API mechanism, most active, CLI scriptable straight from `/post-publish` without holding an MCP session open). PleasePrompto (the S307-queued repo) is the fallback if we want MCP-native + Node-only.

**Ignited plans:** none yet — plan follows the S310 repo walk + Mike's pick.

---

## Applications (living)

*APPEND a dated line each time grep surfaces this file for a new corner of the sim.*

- (none yet)

---

## Changelog

- 2026-07-10 — Initial extraction (S310). Three-repo landscape + S67/BACKLOG/JOURNAL prior state folded in. Mike-direct trigger: deliberate edition-ingest relationship.
