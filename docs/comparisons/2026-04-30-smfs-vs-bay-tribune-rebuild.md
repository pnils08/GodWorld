---
title: SMFS vs Bay-Tribune Unified Ingest Rebuild — Evaluation
created: 2026-04-30
updated: 2026-04-30
type: comparison
tags: [architecture, infrastructure, research, active]
sources:
  - https://smfs.ai (landing page)
  - https://github.com/supermemoryai/smfs (README + repo)
  - docs/plans/2026-04-30-bay-tribune-unified-ingest-rebuild.md (the rebuild this eval may obviate)
  - docs/plans/2026-04-27-world-data-unified-ingest-rebuild.md (already-shipped sibling pattern)
  - Email from Supermemory team to Mike Paulson, 2026-04-30 ("SMFS launch — Hello P!")
pointers:
  - "[[plans/2026-04-30-bay-tribune-unified-ingest-rebuild]] — HOLD note added"
  - "[[plans/2026-04-27-world-data-unified-ingest-rebuild]] — already-shipped, would migrate too if SMFS adopted"
  - "[[SUPERMEMORY]] — current 6-container model"
  - "../engine/ROLLOUT_PLAN.md §Edition Post-Publish — rollout entry for the rebuild"
---

# SMFS vs Bay-Tribune Unified Ingest Rebuild

**Status:** Research/eval. Mags-first pilot proposed. No production migration yet.

**TL;DR:** SMFS (released 2026-04-29) provides POSIX filesystem access to existing Supermemory containers. If it works at our scale, it replaces the chunking + customId + endpoint-migration plumbing in our bay-tribune rebuild plan with `cp file.txt /smfs/bay-tribune/...`. The editorial work (16-tag taxonomy, 22-doc disposition map, 175-doc retrofit decisions) is invariant — it just maps to directory structure instead of tag pairs. Recommendation: pilot on `mags` container first; if good, migrate one container at a time.

---

## What SMFS is (verified from primary sources)

- **Userspace daemon, pure Rust.** Single static binary. MIT or Apache-2.0 license.
- **Mounts existing Supermemory containers as POSIX directories.** macOS via NFSv3-on-localhost; Linux via FUSE.
- **Wraps the Supermemory cloud API** — uses `/v4/profile` endpoint per smfs.ai. Indexing still delegated to Supermemory (we keep paying $9/mo).
- **Sync model:** local SQLite cache; bidirectional pull-on-miss + push-on-dirty-write; 30s default remote-change sync.
- **Semantic grep is the default `grep`.** `grep -F` forces literal. `cat profile.md` returns synthesized always-fresh digest of the container.
- **Install:** `curl -fsSL smfs.ai/install | sh`. **One-time:** `smfs login` (uses API key). **Use:** `smfs mount <container_tag>`.
- **Marketing benchmark:** "83% fewer tokens, 64% fewer tool calls" in tests with Claude/Codex. Self-reported, not independently verified.
- **Repo state:** v0.0.1, 179 stars, 0 open issues. **Released 2026-04-29 (yesterday).** Languages: Rust 39%, Python 41%, TypeScript 19%.

---

## Side-by-side: SMFS vs the rebuild as-spec

| Capability | bay-tribune rebuild as-spec | SMFS |
|---|---|---|
| Targeted replacement | DELETE-by-customId via `wipeBayTribuneByCustomId.js` (NEW) | `rm /smfs/bay-tribune/dispatch/c92/kono.txt` |
| Type-filtered retrieval | `containerTag = bt-<type>` in `/v4/search` | directory walk: `grep -r "X" /smfs/bay-tribune/dispatch/` |
| Re-ingest | `wipe + ingestEdition.js + ingestEditionWiki.js` | `cp -r editions/* /smfs/bay-tribune/` |
| Multi-agent sync | not addressed (S156 push-coordination rule) | claimed built-in (30s default) |
| Existing 6-MCP-tool layer | needs `--type` flag added (Phase 7) | unchanged — `/v4/search` access path unaffected |
| Endpoint migration (`ingestEditionWiki.js` /v4/memories → /v3/documents) | Phase 3 | irrelevant; we'd retire the writer entirely |
| Chunk-size workaround (40K limit per doc) | preserved with `-part-N` customId | unclear — needs pilot to verify large-file behavior |
| Token / tool-call efficiency | unchanged from current | claimed 83% fewer tokens / 64% fewer tool calls |

---

## What SMFS replaces (if we adopt)

- **Phase 2** (`ingestEdition.js` retrofit) — collapses to file writes
- **Phase 3** (`ingestEditionWiki.js` migration) — writer retired; wiki records become files
- **Phase 4** (`wipeBayTribuneByCustomId.js`) — becomes `rm`
- **Phase 6** (bulk migration) — becomes `cp -r`
- **Phase 7** (`search_canon --type` filter) — semantic grep is the whole pitch

## What survives regardless

- **Phase 1 inventory** — 175 docs, 13-class distribution. Data point doesn't change.
- **Phase 1.5 disposition map** — per-doc decisions for 22 unknown + published-other docs (15 legacy-edition / 2 archive-essay / 1 podcast-transcript / 1 canon-correction / 1 legacy-roster / 2 delete-no-replacement). Editorial work, not plumbing.
- **16-tag taxonomy** — translates 1:1 to directory structure under SMFS:
  - `bay-tribune/edition/c92/` (was `bt-edition`)
  - `bay-tribune/dispatch/c92/<slug>/` (was `bt-dispatch`)
  - `bay-tribune/wiki/citizen/c92/<POPID>` (was `bt-wiki-citizen`)
  - `bay-tribune/archive/<author>/<piece>` (was `bt-archive-essay`)
- **customId-as-slug discipline** — becomes filename discipline: same deterministic naming, different surface.
- **Fourth-wall contamination DELETE** (doc `3cVPsFy7BkzjPDhapyFYmf`) — happens regardless of plumbing.

---

## Risks

1. **0.0.1 release, 1 day old.** 0 open issues = either pristine or untested at scale. We're S189 of an 800+ session project; production-grade reliability is the bar.
2. **Marketing benchmarks not independently verified.** "83% fewer tokens" needs a controlled retest against our actual workloads (Mara audit, Rhea verification, /sift canon search).
3. **Sync latency 30s default.** Acceptable for mags (editorial brain). Possibly tight for `/post-publish` Step 1 → Step 2 chain where ingest must be searchable immediately.
4. **6-container model.** Mounting all 6 at once means the local SQLite cache holds ~2000+ docs. Disk + memory footprint unclear at our scale.
5. **Existing /v4/search MCP tool layer (S183).** Co-existence: SMFS uses `/v4/profile`, our 10 MCP lookup tools use `/v4/search` with custom containerTag + threshold + mode kwargs. Should not conflict (different access paths) but write-path duplication (CLI + SMFS) could create sync races if both write to the same container concurrently.
6. **Already-shipped wd-rebuild substrate (843 docs, 100% domain-tagged).** If we adopt SMFS, those tags become directory paths. Migration cost is non-zero — we'd run a one-time re-sort.
7. **No explicit Claude Code compatibility statement** in the README (only marketing-side mentions of Daytona, E2B, Cloudflare, Vercel). Anthropic's harness is our primary read/write surface.
8. **Vendor concentration.** We're already on Supermemory for storage; adopting SMFS deepens the dependency. Fork-or-fail story exists (MIT license, Rust binary) but operationally non-trivial to maintain a fork.

---

## Mags-first pilot

### Why mags

1. **Smallest blast radius.** mags is editorial brain (deliberate brain — EIC decisions, journals, things Mike and Mags discuss). Not canon. Not engine state. Loss is recoverable, not catastrophic.
2. **I'm primary reader/writer.** Broken retrieval surfaces immediately during normal session use.
3. **Tolerates 30s sync.** mags writes are deliberate — `/save-to-mags` and end-of-session saves, not real-time canon push.
4. **No reviewer-agent dependency.** Mara/Rhea read bay-tribune + world-data; mags is just for Mags. Pilot doesn't risk a reviewer chain.
5. **Existing CLI fallback preserved.** `npx supermemory search "query" --tag mags` and `scripts/search-memory.cjs --user "query"` work regardless of mount state.

### Pilot steps

| # | Step | Verify |
|---|---|---|
| 1 | `curl -fsSL smfs.ai/install \| sh` (after Mike's explicit OK to install third-party binary) | `which smfs` returns path |
| 2 | `smfs login` with `SUPERMEMORY_CC_API_KEY` | `smfs status` shows authenticated |
| 3 | `smfs mount mags` | mountpoint exists; `ls` returns directory listing |
| 4 | Baseline-vs-SMFS retrieval roundtrip — pick 5 known mags queries (recent journal entry, project memory, feedback memory, persistence file content, session-end save), retrieve via CLI, retrieve via SMFS `grep`/`cat`, diff results | results match (semantic grep should return same/superset of CLI hits) |
| 5 | Write test: `echo "S189 SMFS pilot test — $(date -Iseconds)" > /smfs/mags/s189-test.md`; wait 30s | `npx supermemory search "S189 SMFS pilot test" --tag mags` returns the doc |
| 6 | Read-after-write: same content visible via `cat /smfs/mags/s189-test.md` | matches what was written |
| 7 | Multi-process: write via CLI in another terminal, see in SMFS within 30s | sync works both directions |
| 8 | Existing-doc safety: `cat /smfs/mags/<known-existing-doc>` against bytes from `npx supermemory get-document <id>` | bytes match (no corruption on read) |
| 9 | One week of normal mags use through SMFS — `/save-to-mags`, `/session-end`, journal updates | no operational surprise; `git log` for journal still clean; family check still works |
| 10 | DELETE test: `rm /smfs/mags/s189-test.md`; verify gone via CLI | doc no longer findable; settle 30s if needed |

### Acceptance criteria (go-decision: mags → bay-tribune)

- ✓ All 5 baseline retrieval queries return matching results
- ✓ Write roundtrip succeeds (cp → CLI sees it within 30s)
- ✓ Read roundtrip safe (existing docs not corrupted)
- ✓ DELETE-by-rm works as advertised
- ✓ 7 days of normal use without unexpected sync behavior, dropped writes, or stale reads
- ✓ Disk usage on droplet acceptable (SQLite cache stays under ~500MB for mags container)
- ✓ Token-spend on Supermemory side comparable or better (verify via dashboard)

If any fail → keep mags on CLI, abandon SMFS migration, document failure mode in this file's findings section.

### Failure modes + rollback

- `smfs umount mags` → SQLite cache + mountpoint disappear; cloud data untouched (Supermemory is durable backend).
- All existing tooling preserved: `npx supermemory search`, `scripts/search-memory.cjs`, MCP `lookup_*` tools, `/save-to-mags` skill curl path. Pilot is purely additive.
- Worst case: corruption on write. Mitigation: take Supermemory backup snapshot before pilot start (research API for backup endpoint; if none, accept the risk — mags is small enough to re-derive from journal + persistence + saved memos if catastrophically lost).

---

## Decision forks

1. **Install at all?** Third-party binary on the droplet. Open-source Rust, but new. Mike's call.
2. **After pilot succeeds (if):** migrate all 6 containers, or keep canon containers (bay-tribune, world-data) on the structured CLI/MCP path and only use SMFS for editorial brain (mags, super-memory)?
3. **What about the bay-tribune rebuild plan?** Three options:
   - (a) HOLD plan; if SMFS pilot succeeds, rewrite plan as "SMFS adoption for bay-tribune" (~10 tasks instead of 9; new plan, not amendment)
   - (b) Continue plan in parallel as-spec; SMFS adoption becomes Phase 8 alternative
   - (c) Abandon plan if SMFS pilot succeeds — directory structure replaces all of Phase 2-7
   - **Lean: (a).** Plan is paused, not killed. Phase 1 + 1.5 work (inventory + disposition) carries forward unchanged.

---

## Recommendation

**Pilot YES on mags.** Cost: ~30 min install + setup, 1 week of low-stakes observation. Payoff if it works: Phase 2-7 of the bay-tribune rebuild collapse to a directory copy + 16 tag→directory mappings. Payoff if it doesn't: 1 file in `docs/comparisons/` documenting why we stayed on the manual path.

If Mike approves, the pilot is one short engine-sheet session (install + mount + initial smoke tests) plus passive observation through normal Mags work for ~7 days. Ship pilot acceptance findings as Phase 2 of this comparison doc, then decide on bay-tribune adoption.

---

## Phase 2 — Pilot findings

_To be filled after pilot runs. One row per acceptance criterion: PASS / FAIL / NOTES._

---

## Changelog

- 2026-04-30 (S189, research-build) — Initial draft. SMFS released 2026-04-29; Mike received the announcement email same day this rebuild plan completed Phase 1.5. Plan placed on HOLD pending pilot outcome. Editorial work (taxonomy, disposition map) carries forward to either path.
