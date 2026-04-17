---
title: Briefing Bundle Trim — Phase Plan
created: 2026-04-17
updated: 2026-04-17
type: plan
tags: [media, infrastructure, active]
sources:
  - docs/research/briefing_bloat_audit_2026-04-17.md — audit findings that motivate this work
  - docs/engine/ROLLOUT_PLAN.md §Edition Production (orphan items) — bloat audit + versioning lines
  - scripts/buildDeskPackets.js — packet builder, lines 2500-2590 assemble the packet object
  - scripts/buildDeskFolders.js — folder assembler, reads summary.json at line 408
  - .claude/skills/post-publish/SKILL.md — post-cycle skill, add-point for versioning hook
pointers:
  - "[[research/briefing_bloat_audit_2026-04-17]] — the audit this plan addresses"
  - "[[engine/ROLLOUT_PLAN]] — rollout items this closes"
  - "[[plans/TEMPLATE]] — shape"
  - "[[EDITION_PIPELINE]] — pipeline v2 context"
---

# Briefing Bundle Trim — Phase Plan

**Goal:** shrink the per-desk c-cycle briefing bundle by removing duplicated and empty components, trim `interviewCandidates` from 520 → 20 with simple relevance ranking, and add briefing versioning so future retro audits are possible.

**Architecture:** S156 briefing bloat audit quantified four issues in `output/desks/{desk}/current/`: (1) `interviewCandidates` is a 520-name list shipped identically to every desk with a 1.2% hit rate in the c91 edition, (2) `base_context.json` is byte-identical across all 6 desks — 6× duplication of a 75 KB file, (3) three packet fields (`reporterHistory`, `citizenArchive`, `recentQuotes`) are always empty across all 6 desks, (4) `output/desks/{desk}/current/` is overwritten every cycle so no retro audit can compare briefing-to-outcome across cycles. This plan addresses all four as four independent tasks that can ship in any order. The pipeline-design decision (keep packet.json OR summary.json, not both) is deliberately deferred — it's a Mike call, not an engine-mechanical trim.

**Terminal:** research-build drafts (this file); **media terminal** executes the code + post-publish changes.

**Priority framing:** MEDIUM. The bundle is big but the pipeline works. Trim is cost/quality improvement — smaller briefings = shorter agent context = less noise = lower API cost. Versioning is a prerequisite for any follow-up "did briefings cause the grade" question, which is why it's bundled here even though it's the smallest task.

---

## Acceptance criteria

1. **Bundle size drops meaningfully.** Target: c92 bundle per desk ≤ 50% of c91 size for desks with `interviewCandidates` in their packet. Measured same way as the S156 audit: `du -sb output/desks/{desk}/current`.
2. **`interviewCandidates` ranked list ≤ 20 per desk, desk-specific.** Not the identical 520 list every desk gets today. Ranking uses the simple heuristics in Task 3 below; no ML, no LLM call.
3. **`base_context.json` exists once per cycle, referenced by path.** Either one physical file in a shared location or a single in-memory object reused. Six byte-identical copies = failure.
4. **`reporterHistory`, `citizenArchive`, `recentQuotes` removed from packet schema** — unless a builder surfaces a plan to populate them in the next 2 cycles. If kept, documented in packet schema comments with the populator path.
5. **Post-publish archives the briefing bundle per cycle** to `output/desks/{desk}/archive/c{XX}_bundle/` (or equivalent). Retrospective audits become file reads, not archaeology.
6. **Next cycle's c92 briefing bundle is retrievable from disk** after post-publish runs.

---

## Tasks

### Task 1: Load `base_context.json` once (rec 2)

- **Files:**
  - `scripts/buildDeskPackets.js` — packet builder, locate `baseContext` assembly (grep for `baseContext:` or `base_context`)
  - `scripts/buildDeskFolders.js` — folder assembler, locate where `base_context.json` is written per desk
- **Steps:**
  1. Build `baseContext` once per cycle in memory.
  2. In `buildDeskFolders.js`, write `base_context.json` to a shared location — options: (a) one copy at `output/desks/_shared/base_context.json` with each desk's `current/` referencing it, (b) keep the current per-desk path but skip the write when content hash matches a cache, (c) just write once to a known path and let agents look there. Option (a) or (c) preferred — fewer moving parts.
  3. Update any SKILL.md or agent README that references `current/base_context.json` path if the location changes.
- **Verify:** After c92 build, `md5sum output/desks/*/current/base_context.json` returns one hash, not six. OR: only one file exists (if symlinked/shared). Bundle shrinks by ~375 KB total.
- **Risk:** LOW. Shared file — agents read it the same way, contents identical.

### Task 2: Delete always-empty fields (rec 3)

- **Files:**
  - `scripts/buildDeskPackets.js` lines ~2500-2590 — packet assembly
  - `scripts/buildDeskFolders.js` line ~408 — summary assembly
- **Steps:**
  1. Remove `reporterHistory`, `citizenArchive`, `recentQuotes` from the packet object literal (buildDeskPackets.js:2524-2529 region).
  2. Remove the same fields from summary.json assembly if present.
  3. Remove the producer functions that built them (grep for `buildReporterHistory`, `buildCitizenArchive`, `buildRecentQuotes` or similar — if they exist only to populate these empty fields, they're dead code).
  4. Grep the codebase for readers of these three field names — `.claude/agents/`, desk SKILL.md files, downstream scripts. If any reader exists, flag the field as "someone's going to use this" and restore. If no readers, delete.
- **Verify:** After c92 build, `jq 'keys' output/desks/business/current/packet.json` returns the trimmed key list. No agent errors during the next cycle's desk run.
- **Risk:** LOW. Zero readers of empty fields = safe to delete.

### Task 3: Trim `interviewCandidates` 520 → 20 (rec 1)

- **Files:**
  - `scripts/buildDeskPackets.js` — locate where `candidates` is populated (see line 2518 assignment + the `candidates` variable upstream)
- **Steps:**
  1. Find the current `candidates` builder. Audit shows it produces the same 520-name list for every desk.
  2. Replace with a desk-aware scoring function:
     - **Input:** full citizen pool (the current 520).
     - **Scoring signals (all additive, no ML):**
       - +3 if citizen's `neighborhood` matches a neighborhood in any `arcs[].neighborhood` for this desk's domain
       - +2 if citizen appears in a `storylines[].relatedCitizens`
       - +2 if citizen has an entry in this desk's `voiceCards`
       - +1 if citizen's `occupation`/`domain` matches the desk's `coverageDomains` (from `deskBrief`)
       - +1 if citizen appears in a `householdEvents[].citizens` from this cycle
     - **Output:** top 20 by score, ties broken by POPID ascending.
  3. Emit the scoring metadata alongside each candidate (so the reporter sees "why is this person on the shortlist"):
     ```js
     { popId, name, score, reasons: ['arc-neighborhood-match', 'voice-card'] }
     ```
  4. Keep a `interviewCandidatesFullCount` metadata field so the reviewer knows the pool was larger than the shortlist.
- **Verify:** c92 packet.json per desk shows `interviewCandidates.length === 20`, each has a `score` and `reasons` array, lists differ between desks. Bundle size drops another ~300 KB per desk.
- **Risk:** LOW-MEDIUM. If the scoring heuristic produces a bad shortlist (reporter can't find anyone relevant), easy to widen to top-40 or tweak weights. Keep the full-pool hash in metadata so a follow-up run can re-expand.

### Task 4: Briefing versioning (rec 7)

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — add step after edition ingest
  - (Optional) new script `scripts/archiveBriefingBundle.js` if the copy logic is non-trivial
- **Steps:**
  1. At the end of `/post-publish` (after edition is saved + ingested), copy each desk's current bundle to an archive path keyed by cycle:
     ```bash
     cycle=$(node -e "console.log(require('./lib/cycle').currentCycle())")
     for desk in business chicago civic culture letters sports; do
       mkdir -p output/desks/$desk/archive/c${cycle}_bundle
       cp -r output/desks/$desk/current/* output/desks/$desk/archive/c${cycle}_bundle/
     done
     ```
     Or equivalent node helper. Logic runs whether or not Task 1 collapses `base_context.json` to shared.
  2. Document the archive path in `docs/EDITION_PIPELINE.md` under post-publish outputs so future sessions find it.
  3. Decide retention: keep all cycles forever (disk-cheap, ~5-6 MB per cycle pre-trim, ~2-3 MB post-trim), or rotate to last 10 cycles. Recommend "keep all for now, revisit if disk gets tight."
- **Verify:** After c92 post-publish, `ls output/desks/business/archive/c92_bundle/` shows briefing.md + packet.json + the rest. `du -sh output/desks/business/archive/` stays manageable.
- **Risk:** LOW. Pure additive copy, no mutation of live data.

### Task 5: Smoke test + audit re-run

- **Files:** none modified; verification only
- **Steps:**
  1. Run the c92 cycle end-to-end with tasks 1-4 in place.
  2. Re-run the S156 audit measurements against c92 bundles:
     - Bundle size per desk
     - `interviewCandidates` length per desk (expect 20, desk-specific)
     - `base_context.json` uniqueness across desks (expect 1 shared, not 6 copies)
     - Empty-field count in packet.json (expect 3 fewer: no more `reporterHistory`, `citizenArchive`, `recentQuotes`)
     - Archive folder populated for c92
  3. Append a "c92 results" section to [[research/briefing_bloat_audit_2026-04-17]] with the new numbers.
- **Verify:** All four measurements move in the right direction. Report updated with post-trim numbers.

---

## Out of scope

- **Pick one: packet.json or summary.json (audit rec 4).** Mike's decision, not a mechanical trim. Flagged separately in rollout; do NOT resolve in this plan.
- **Archive-context staleness (audit rec 5).** Why 4 of 6 desks get identical `output/desk-briefings/{desk}_archive_c{XX}.md` across c89/c90/c91 — needs engine-sheet to grep the Supermemory fetch code. Separate item.
- **Craft-layer angle-brief consolidation (audit rec 6).** The `-desk/current/angle_briefs/` path produced right-sized c90 briefs but c91 bypassed it. Investigation, not a trim. Belongs under Phase 26.2.3.
- **Ranking heuristic ML upgrade.** If the score-based shortlist proves wrong, upgrade path exists but not today.

---

## Open questions

- [ ] **Shared `base_context.json` — which path?** Options: `output/desks/_shared/base_context.json` (co-located with desks), `output/shared/base_context.json` (top-level), or keep per-desk write but add `.gitignore` exemption so media terminal can decide at build time. RECOMMEND: `output/desks/_shared/base_context.json` — close to the consumers, obvious name.
- [ ] **Delete the empty fields outright, or keep them as `null` with a comment?** Recommend delete — no reader, no populator. Schema gets smaller; future sessions see a cleaner shape.
- [ ] **Scoring weights for interviewCandidates — calibrate at launch or leave as the defaults above?** Recommend defaults ship, review after first c92 run. If the shortlists look wrong, nudge weights in a follow-up commit.
- [ ] **Archive retention policy.** Keep-all or rotate? RECOMMEND: keep-all until disk pressure appears. Each archived bundle is ~2-3 MB post-trim; even 100 cycles ≈ 1.8 GB.

---

## Changelog

- 2026-04-17 (S156) — Initial draft (research-build terminal). Four tasks scoped + smoke test. Media terminal picks up for execution.
