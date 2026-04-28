---
title: Skill Supermemory Alignment
created: 2026-04-28
updated: 2026-04-28
type: plan
tags: [media, civic, infrastructure, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §Data & Pipeline ("ALIGN: Skills need supermemory rules aligned for search and save" — added S182, unblocked S183)
  - docs/plans/2026-04-27-world-data-unified-ingest-rebuild.md (parent project — DONE S183)
  - docs/SUPERMEMORY.md (reference doc to be enriched)
  - scripts/godworld-mcp.py (post-M1-M4 — 14 MCP tools live)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout, §Data & Pipeline ALIGN item"
  - "[[plans/2026-04-27-world-data-unified-ingest-rebuild]] — predecessor that landed the writers + tags"
  - "[[SUPERMEMORY]] — canonical reference; matrix lands in new §Search/save matrix section"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
---

# Skill Supermemory Alignment

**Goal:** Every skill that searches or saves to Supermemory points at the right tool, container, and tag pair after the S182–S183 world-data rebuild. The canonical search/save matrix lives in [[SUPERMEMORY]]; skills cite that matrix instead of carrying their own (drift-prone) Supermemory guidance.

**Architecture:** Two-artifact deliverable. **(1)** Enrich `docs/SUPERMEMORY.md` with a search/save matrix table — Container × domain tag × MCP tool × use case × retrieval mode. The matrix is the authoritative reference; skills point to it. **(2)** Audit every skill `.md` file under `.claude/skills/`; for each Supermemory reference, confirm it aligns with the matrix or update it. Out-of-date guidance gets corrected; ad-hoc patterns get replaced with matrix pointers.

**Terminal:** research-build (this plan + audit + matrix + skill edits).

**Pointers:**
- World-data writers landed S183 (commits `f32a5d8` W1 / `2d7b103` W2 / `9818335` W3 / `fb1ddf0` W4 / `2b91585` W5 / `b41e1a6` R2 / `5bdfcf9` R1 apply).
- M1–M4 MCP tools shipped S183 (commit `c77cb37`): `lookup_business`, `lookup_faith_org`, `lookup_cultural`, `get_neighborhood_state`. Each queries `wd-<domain>` with hybrid mode + lowered threshold — empirical finding from M1-M4: defaults (`mode='memories'`, `threshold=0.6`) too strict for short structured cards (Masjid Al-Islam returned 0 vs similarity 0.72 with `--mode hybrid --threshold 0.3`).
- Existing tools that still query bare `world-data`: `lookup_citizen`, `lookup_initiative`, `search_world`, `get_neighborhood`, `get_council_member`. These keep working because every card retains the `world-data` tag; they're broader than the new domain-filtered tools.

**Acceptance criteria:**
1. `SUPERMEMORY.md` carries a complete search/save matrix: every container × every tag × every MCP tool × every use case.
2. Phase 1 inventory document produced — every skill's Supermemory references catalogued, classified, and dispositioned (align as-is / update / remove).
3. Every skill flagged for update has its `.md` file edited; verifications run on each.
4. One skill (`/sift`) validated end-to-end with the new matrix references.

---

## Tasks

### Phase 1 — Inventory (research-build)

#### Task 1.1: Grep skills for Supermemory references
- **Files:** `.claude/skills/**/*.md` (read-only); `output/skill_supermemory_inventory.md` (NEW).
- **Steps:**
  1. Grep across all skill `.md` files for: `world-data`, `bay-tribune`, `mags`, `super-memory`, `supermemory`, `lookup_`, `search_canon`, `search_world`, `search_articles`, `get_neighborhood`, `get_council_member`, `get_roster`, `get_domain_ratings`, `containerTag`, `wd-`, `npx supermemory`, `save-to-mags`, `save-to-bay-tribune`, `super-save`, `super-search`.
  2. For each hit: record `{skill, file_path, line, context, classification}` where classification ∈ {search-call, save-call, prose-mention, mcp-tool-reference, outdated-content, matrix-pointer}.
  3. Output `output/skill_supermemory_inventory.md` with a table per skill + per classification.
- **Verify:** every non-empty hit categorized; no hits left as "uncategorized."
- **Status:** **DONE S184** (research-build). Output: `output/skill_supermemory_inventory.md`. 17 files with hits / 79 keyword matches / 113 line-context entries. Raw grep also persisted at `output/skill_supermemory_inventory_raw.txt`.

#### Task 1.2: Disposition pass
- **Files:** this plan file (append "Phase 1 findings" subsection).
- **Steps:** Read inventory, for each reference decide align/update/remove, surface change set in chat for Mike's review before any edits.
- **Verify:** plan changelog entry added with skill counts and disposition summary.
- **Status:** [ ] not started

### Phase 2 — Matrix in SUPERMEMORY.md (research-build)

#### Task 2.1: Draft search/save matrix
- **Files:** `docs/SUPERMEMORY.md` (add new §Search/save matrix section after §The Six Containers).
- **Steps:**
  1. Build the matrix as a table: Container × tag (where applicable) × MCP tool (if available) × Use case × Retrieval mode notes.
  2. Cover all 5 active containers (`mags`, `bay-tribune`, `world-data`, `super-memory`, `mara`) plus the 7 `wd-` domain tags.
  3. Cite the M1-M4 retrieval finding (hybrid mode + 0.3 threshold for short structured cards) as a defaults override note.
  4. Cross-reference: every entry has either an MCP tool to call OR a CLI/API command to use; no entry is left as "search supermemory" without specifying how.
- **Verify:** every container + tag + MCP tool listed; cross-reference checked against `scripts/godworld-mcp.py` post-M1-M4.
- **Status:** [ ] not started

### Phase 3 — Per-skill alignment (research-build)

Task count + scope determined after Phase 1 inventory. Each skill needing updates gets its own task. Disposition will be one of:
- **Update reference** — change `world-data` to specific `wd-<domain>` where the skill is asking for a specific domain
- **Add MCP tool pointer** — replace ad-hoc `npx supermemory search ...` with the right `lookup_*` tool
- **Replace prose with matrix pointer** — instead of "search world-data for citizen context," say "use `lookup_citizen` (see [[SUPERMEMORY]] §Search/save matrix)"
- **Remove outdated content** — references to deprecated containers (`sm_project_godworld`) or pre-rebuild patterns

### Phase 4 — Validation (research-build)

#### Task 4.1: /sift dry-run with updated references
- **Files:** run `/sift` against C92 inputs (or simulate its retrieval calls).
- **Steps:** for the C92 cycle's actual sift inputs, replay the retrieval chain — confirm `lookup_business` / `lookup_faith_org` / etc. return populated results post-write, confirm the sift can construct a brief from the retrieved content.
- **Verify:** sift outputs a coherent brief; no empty-retrieval failures; matrix references resolve correctly.
- **Status:** [ ] not started

---

## Open questions

- [ ] **Scope: just the 8 skills the rollout item named, or all skills under `.claude/skills/`?** Default: audit all (Phase 1 inventory is cheap research; the cost is in Phase 3 per-skill edits where only flagged skills get touched). Mike confirms scope at Phase 1 disposition pass.
- [ ] **Matrix location in SUPERMEMORY.md:** new §Search/save matrix section, or enrichment of existing §How to use? Default: new section, easier to point to. Confirm at Phase 2.

---

## Phase 1 findings

**Source:** `output/skill_supermemory_inventory.md` (Task 1.1, 2026-04-28).

**Disposition aggregate:**

| Disposition | Count | Skills |
|---|---|---|
| ALIGN AS-IS | 8 | boot, capability-review, save-to-bay-tribune, session-startup, session-end, run-cycle, skill-audit |
| MINOR ENRICH | 6 | write-edition, dispatch, interview, city-hall-prep, sift, write-supplemental |
| UPDATE | 2 | podcast (CLI → MCP `lookup_citizen`), post-publish (consider `wd-summary` tag, enrich matrix table) |
| BUG FIX | 1 | save-to-mags (line 17: incorrect `/super-save` reference for canon — should be `/save-to-bay-tribune`) |
| SKIP | 1 | write-supplemental/SKILL_archive.md (archive file) |

**Drift findings:**

1. **`/save-to-mags` line 17 bug.** Tells users to send canon to `/super-save` — but `/super-save` writes to `super-memory`, NOT bay-tribune. Correct skill is `/save-to-bay-tribune`. Real drift; one-line fix.
2. **`/post-publish` line 116 `wd-summary` candidate.** World summary ingests with bare `--tag world-data`. Open question: add `wd-summary` second tag for filtered queries (parallel to entity card pattern)?
3. **No skills cite the M1–M4 tools yet.** `lookup_business`, `lookup_faith_org`, `lookup_cultural`, `get_neighborhood_state` shipped S183 (commit `c77cb37`). MINOR ENRICH category captures this — desk-relevant skills should know to call these tools when domain-specific context is needed.

**Scope confirmed (Mike S184):** extended to `.claude/agents/`. **Result:** only `rhea-morgan` references Supermemory (3 files: IDENTITY, RULES, SKILL — all use CLI `npx supermemory search` pattern). The other 16 agents (desks, voices, civic projects) correctly consume pre-fenced packets from skills and don't retrieve directly — that's the Memory Fence architecture working as designed (Phase 40.6 Layer 2). No agent expansion needed beyond rhea.

**Rhea-morgan disposition:** UPDATE — switch citizen-verification path to MCP `lookup_citizen` (combines world-data + bay-tribune in one call, handles M1-M4 threshold tuning); keep CLI as fallback for ad-hoc/debugging queries. 3 file edits (IDENTITY / RULES / SKILL) added to Batch B.

**Recommended Phase 3 task batches (post-agent extension, Mike S184 calls):**

| Batch | Files | Tasks | Edit type |
|---|---|---|---|
| A — bug fix | save-to-mags | 1 | one-line correction (line 17 `/super-save` → `/save-to-bay-tribune`) |
| B — UPDATE | podcast, post-publish, rhea IDENTITY/RULES/SKILL | 5 | replace CLI patterns with MCP, add `wd-summary` to post-publish line 116 (Mike S184 ADD), Rhea citizen-verify path to MCP |
| C — MINOR ENRICH | write-edition, dispatch, interview, city-hall-prep, sift, write-supplemental | 6 | cite new MCP tools (`lookup_business` / `lookup_faith_org` / `lookup_cultural` / `get_neighborhood_state`) where relevant |

**Locked decisions (Mike S184):**
1. Scope = all (skills + agents). Audit confirmed only rhea-morgan among 17 agents needs updates.
2. `wd-summary` = ADD to post-publish line 116 — parallel design pattern with entity cards, M1-M4 established that structured world-data content benefits from domain-tag filtering, summaries answer different questions than entity cards and should be filterable separately.
3. Batch order: Phase 2 matrix first (prereq for ENRICH) → Batch A (bug fix, cheap) → Batch B (UPDATE) → Batch C (ENRICH) → Phase 4 validation.

**Total Phase 2 + Phase 3:** 1 matrix + 12 file edits = 13 edits. Plus Phase 4 validation.

---

## Validation fixture

Phase 4 uses C92 cycle inputs since:
- C92 had real desk briefs that pulled citizen / business / faith context
- The world-data rebuild S183 produced fresh cards under the new tag scheme
- /sift on C92 with the updated references should retrieve the same entities the C92 edition actually covered

If matrix references resolve and /sift produces a coherent output, the alignment holds.

---

## Phase order + handoff

Research-build executes in this order:
1. Task 1.1 (grep inventory) → produces `output/skill_supermemory_inventory.md`
2. Task 1.2 (disposition pass) → surfaces change set for Mike's review
3. Task 2.1 (matrix in SUPERMEMORY.md) → write after disposition is approved (can run in parallel with Phase 3)
4. Phase 3 per-skill edits → one task per skill, batched for review
5. Task 4.1 (validation) → /sift dry-run as final gate

---

## Changelog

- 2026-04-28 — Initial draft (S184, research-build). Sibling project to [[plans/2026-04-27-world-data-unified-ingest-rebuild]] which landed the writers + tags S183. ROLLOUT entry added S182, unblocked S183 by engine-sheet.
- 2026-04-28 — Phase 1 inventory complete (S184, research-build, Task 1.1). Output: `output/skill_supermemory_inventory.md`. 17 skill files with Supermemory references. Disposition: 8 ALIGN, 6 MINOR ENRICH, 2 UPDATE, 1 BUG FIX, 1 SKIP. Notable drift: `/save-to-mags` line 17 incorrectly directs canon saves to `/super-save` (writes super-memory, not bay-tribune); correct is `/save-to-bay-tribune`. Open scope question surfaced: extend to `.claude/agents/` (17 agents)?
