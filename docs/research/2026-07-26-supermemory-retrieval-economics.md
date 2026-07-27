---
title: Supermemory retrieval economics + the data-analyst seat — research
created: 2026-07-26
updated: 2026-07-27
type: reference
tags: [research, infrastructure, media, retrieval, token-budget, active]
sources:
  - Live measurement, S334 — `npx supermemory search` across bay-tribune / mags / world-data / wd-citizens; payload sizes measured with wc -c and jq projection
  - Subagent floor measured from three S334 arc-search probes (15,067 / 15,896 / 16,340 tokens on trivial tasks)
  - docs/media/AGENT_NEWSROOM.md §Full Reporter Roster — Rhea Morgan "Data Analyst / Copy Chief"; Elliot Marbury "Data Desk"
  - .claude/agents/rhea-morgan/IDENTITY.md §Your Canon Sources — the existing Supermemory search toolkit
  - Mike-direct S334 — "the idea is an agent spawns a haiku agent that properly searches and returns structured data … this is like the data team"
  - https://supermemory.ai/docs/concepts/filtering — current official `AND`/`OR` metadata-filter grammar
  - Live read-only filter proof, 2026-07-27 — `bay-tribune` query with `source=edition-ingest`
pointers:
  - "[[../engine/archive/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
  - "[[2026-07-19-headless-cron-newsroom-agentic-rag]] — sibling: the cheap-model retrieval eval that produced source-search"
---

# Supermemory retrieval economics + the data-analyst seat — research

**Source:** Live measurement of the Supermemory CLI retrieval path (S334), not an external paper. Commands and numbers reproduced below. Triggered by Mike-direct S334: route RAG searches to a cheap Haiku seat that returns structured data instead of a dump — "this is like the data team."

**What this addresses:** Whether a per-search cheap-model filter in front of Supermemory saves tokens and removes contaminants, and where that function belongs in the newsroom. The premise had three testable parts: is the return a dump, does it carry contaminants, and does an agent filter pay for itself.

**What it does:** `npx supermemory search <query> --tag <container>` defaults to `--mode memories --limit 10 --threshold 0.6` and returns JSON: one object per hit carrying a distilled `memory` sentence plus `id`, `rootMemoryId`, `metadata` (title / source / type / cycle / temporalContext), `updatedAt`, `version`, `similarity`, `filepath`. Extraction happens server-side — there is no raw document chunk to summarize. Flags available: `--limit`, `--threshold`, `--rerank`, `--rewrite`, `--mode {memories,hybrid,documents}`, `--include`, `--filter`.

**Extraction — what's usable:**

- **Retrieval returns distilled facts, not dumps → the "summarize the chunk" job does not exist.** The `memory` field is already one clean sentence per hit. A cheap-model seat cannot earn its keep by compressing prose that was never there.
- **68–75% of every payload is scaffolding → strip it with jq, not with an agent.** Measured: 10 results = 6,534 raw bytes → 2,507 projected (62% cut); 50 results = 33,671 bytes / ~8.4k tokens → 10,905 / ~2.7k tokens (68% cut). The waste is `rootMemoryId`, `temporalEventStartMs`/`EndMs`, `version`, `filepath`, and similarity floats carried to eight decimals. Free win, no model in the loop.
- **A subagent's floor is ~15–16k tokens → the economic unit is the QUESTION, never the search.** Three S334 probes on trivial tasks cost 15,067 / 15,896 / 16,340 tokens before doing any work (system prompt + skill file). Filtering one 2.7k-token payload through a 15k-token seat is 5× worse than reading it directly. Break-even is roughly 5–6 projected searches per spawn. One agent per research question running N searches internally amortizes; one agent per search never does.
- **Contamination is severe and container-specific → container choice outranks every filter flag.** Identical query: `bay-tribune` returned 10/10 canon (edition-ingest / drive-archive / civic-decision); `mags` returned **0/10 canon** — 6 "Nightly Discord Reflection" autonomous-script docs, 1 `session_save`, 3 with null metadata. This is the `infrastructure.4` pollution, live and measurable.
- **Contaminants do not respond to the cheap flags → the filter is a judgment call, which is what the seat is actually for.** `--rerank` still put 4 Discord reflections in the top 6 of `mags`. `--threshold 0.72` cut the set from 10 hits to 1 — starving rather than cleaning. No flag encodes "this reflection is Mags musing, not canon; that edition-ingest row is canon." That distinction is the cheap seat's real product, and it is a quality win, not a token win.
- **`--tag world-data` is empty for real queries; the `wd-*` domain tags hold the data.** `world-data` returned 0 hits where `wd-citizens` returned 10 on the same subject. Any retrieval routed at the broad container silently returns nothing.
- **The role already exists in canon and is half-built → attribute, don't invent.** `AGENT_NEWSROOM.md` lists **Rhea Morgan — Data Analyst / Copy Chief**, and her `IDENTITY.md` already carries the per-container Supermemory command set. The `source-search` agent (S326, Haiku) is an anonymous parallel implementation of a job a named Tier-1 staffer holds. `Elliot Marbury — Data Desk` is on the roster with **zero routings** (absent from every `byline_shadow_log`, last seen in edition 84) — one of the ~14 never-routed staff engine.76 W5 exists to reach.

**Not applicable / hazard:**

- **Per-search cheap-model filtering: take-nothing.** The floor cost kills it, and the compression job it was meant to do is already done server-side.
- **Metadata filtering is a deterministic first pass, not a complete
  adjudicator.** The CLI expects filters wrapped in `AND` or `OR`, for example
  `--filter '{"AND":[{"key":"source","value":"edition-ingest"}]}'`. A bounded
  live query returned 20/20 `edition-ingest` hits. This removes known
  non-published source classes cheaply, but it cannot classify mixed
  `drive-archive` records or recover historical records whose provenance
  metadata is missing.
- **Stale caveat in a live agent file.** `rhea-morgan/IDENTITY.md` says `wd-*` cards need `--mode hybrid --threshold 0.3` because "defaults return zero hits (S183 M1-M4)". Re-measured S334: `wd-citizens` returns 10 hits on defaults AND on hybrid+0.3. The caveat no longer holds; the same section points retrieval at `world-data`, which returns 0.
- **Don't dual-hat Rhea's reviewer lane into the retrieval seat carelessly.** Rhea is the publish gate (Sonnet, `cron-rhea-gate.js`), and reviewer lanes are their own class per `.claude/rules/research-build.md` §Standing rules. Her Data Analyst function and her gate function are different jobs on the same citizen; collapsing them puts the verifier in the position of sourcing what it later verifies.
- **Do not churn `source-search`.** It is proven (C100 eval, Sonnet-parity, 0 fabrications) and referenced across three orchestrators. Attribution and question-scoping are additive; renaming it is not.

**Verdict:** `adopt` — but a different shape than the premise. Adopt the two free wins (jq projection, container routing) and the **question-scoped** data-analyst seat attributed to Rhea Morgan's Data Analyst function. Reject the per-search filter on measured economics. The Marbury Data Desk seat is a separate, genuinely-unbuilt opportunity.

**Ignited plans:** [[../plans/2026-07-25-notebooklm-source-search-wiring]] Task
8 owns the deterministic projection, provenance-filter, and domain-routing
hardening applied 2026-07-27. Rollout `research.26` separately tracks the
question-scoped Data Analyst seat; that agent design remains plan work rather
than being implied by the deterministic MCP change.

---

## Applications (living)

- 2026-07-26 — Initial extraction (S334). Corrections applied to `.claude/agents/rhea-morgan/IDENTITY.md` §Your Canon Sources the same session (stale S183 caveat, `world-data` mis-pointer).
- 2026-07-27 — Task 8 resolved the metadata-filter grammar and applied the
  result to `search_canon`, projected retrieval output, and `wd-*` domain
  fan-out. No Supermemory records were changed.

---

## Changelog

- 2026-07-26 — Initial extraction (S334). Measured the retrieval path, found the data-analyst role already exists as Rhea Morgan, verdict adopt at question scope.
- 2026-07-27 — Resolved `--filter`: `AND`/`OR` wrapper required. A read-only
  `source=edition-ingest` proof returned 20/20 matching results, removing the
  research.26 sizing gate while leaving mixed-provenance adjudication open.
