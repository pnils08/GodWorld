---
title: Briefing Bloat Audit — c91 Snapshot
created: 2026-04-17
updated: 2026-04-17
type: reference
tags: [media, research, audit, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §Edition Production (orphan items) — audit task flagged PARTIAL S144
  - output/desks/{desk}/current/ — live c91 briefing bundles (6 desks)
  - output/desk-briefings/{desk}_archive_c{89,90,91}.md — archive-context trend
  - editions/cycle_pulse_edition_91.txt — c91 edition text used for utilization scoring
  - docs/drive-files/Googlepaper.pdf — Mezzalira "agent briefing context bloat" reference
pointers:
  - "[[engine/ROLLOUT_PLAN]] — the audit line this report closes"
  - "[[plans/2026-04-17-briefing-bundle-trim]] — the phase plan this audit spawned (recs 1/2/3/7)"
  - "[[EDITION_PIPELINE]] — pipeline v2 briefing structure"
  - "[[plans/BACKLOG]] §Phase 26.2 — briefing evolution phase this report feeds"
  - "[[index]] — catalog"
---

# Briefing Bloat Audit — c91 Snapshot

**Scope note:** original plan was to measure c89–c91. Not possible — `output/` is gitignored and `output/desks/{desk}/current/briefing.md` is overwritten each cycle, so only c91 briefings exist on disk. Audit revised to: (1) full c91 bundle measurement + utilization, (2) archive-context trend c89→c91 (only persistent per-cycle artifact), (3) flag the versioning gap as a blocker for any future retrospective audit. Briefing retention is its own rollout item added at the bottom of this file.

---

## Executive summary

Four findings carry the report:

1. **`interviewCandidates` is a 520-name list with a 1.2% hit rate in c91.** The identical 520 names ship to all 6 desks. Six of those names appear in the edition across all articles combined. Business, chicago, civic, culture, letters, sports — same list, same six hits.
2. **`base_context.json` is identical across all 6 desks — 75,107 bytes, 2,732 lines, byte-for-byte.** Six copies of the same file shipped. Load once, reference six times — the duplication is pure waste.
3. **`packet.json` carries the bundle and is duplicated by `summary.json`.** Same top-level keys, smaller lists. The summary is a pre-trimmed view of the packet; sending both to an agent means the agent can read the data two ways at two zoom levels with no orthogonal signal.
4. **c91 bundle sizes run 693 KB (business) to 1.19 MB (letters). ~5.3 MB of briefing material total across 6 desks.** The `briefing.md` itself — the hand-written instructions from the editor — is 3.6–6.4 KB per desk, a rounding error against the machine-generated packet/summary payload.

A newer `{desk}-desk/current/angle_briefs/` folder exists alongside the bloated `{desk}/current/` folder. The angle-brief folder is 40–100× smaller (5–17 KB) and is the right shape. Only c90 briefs are present there; c91 either bypassed it or wrote elsewhere.

---

## 1. Component sizing (c91 live bundles)

Per-desk component sizes from `output/desks/{desk}/current/`.

| Desk | briefing.md | errata.md | exemplar.md | base_context.json | packet.json | summary.json | prev_grades.md | voice_stmts | **Bundle total** |
|------|------------|-----------|-------------|-------------------|-------------|--------------|----------------|-------------|-----------------|
| business | 3.7 KB | 0.7 KB | 3.6 KB | 75.1 KB | **467.8 KB** | 130.6 KB | 1.1 KB | 10.4 KB (3) | **693.1 KB** |
| chicago | 5.0 KB | 0.7 KB | 4.3 KB | 75.1 KB | **475.6 KB** | 138.8 KB | 1.4 KB | 0 KB (0) | **700.9 KB** |
| civic | 6.4 KB | 1.7 KB | 3.5 KB | 75.1 KB | **711.1 KB** | 142.7 KB | 1.9 KB | 17.9 KB (6) | **960.3 KB** |
| culture | 4.9 KB | 0.6 KB | 3.6 KB | 75.1 KB | **726.8 KB** | 136.7 KB | 2.0 KB | 2.6 KB (1) | **958.5 KB** |
| letters | 5.7 KB | 0.8 KB | — | 75.1 KB | **915.1 KB** | 173.4 KB | 1.1 KB | 14.3 KB (4) | **1,185.6 KB** |
| sports | 5.9 KB | 1.1 KB | 5.5 KB | 75.1 KB | **567.4 KB** | 154.0 KB | 1.7 KB | 8.2 KB (2) | **819.0 KB** |

Notes:
- `interviews/` exists as a directory for every desk; empty across all 6. Structural scaffolding defined, never populated.
- `exemplar.md` missing for letters.
- `voice_statements/` file count varies wildly (0–6) with no apparent pattern tied to desk complexity.
- `base_context.json` is **byte-for-byte identical** across all 6 desks (`md5` verified).

---

## 2. Utilization — what agents actually use

For each desk's `packet.json`, names extracted from three sub-fields were checked against the full c91 edition text (substring match, case-insensitive).

| Desk | interviewCandidates | voiceCards | households (members) | arc titles |
|------|--------------------|-----------|--------------------|------------|
| business | 520 → 6 hit (**1.2%**) | 257 → 2 (0.8%) | 0 extracted | 21 arcs, 0 titles |
| chicago | 520 → 6 (**1.2%**) | 257 → 2 (0.8%) | 0 | 0 arcs in field |
| civic | 520 → 6 (**1.2%**) | 258 → 3 (1.2%) | 0 | 0 arcs in field |
| culture | 520 → 6 (**1.2%**) | 257 → 2 (0.8%) | 0 | 0 arcs in field |
| letters | 520 → 6 (**1.2%**) | 337 → 15 (4.5%) | 0 | 21 arcs, 0 titles |
| sports | 520 → 6 (**1.2%**) | 336 → 14 (4.2%) | 0 | 0 arcs in field |

**Readings:**
- The `interviewCandidates` list of 520 is the same 520 names sent to every desk. Every desk's article pool hits the same ~6 of them. Shipping 520 names so 6 can be referenced is 1.2% signal, 98.8% noise.
- `voiceCards` is desk-specific (two size tiers — 257 for business/chicago/civic/culture vs. 337/336 for letters/sports), but hit rates max out at 4.5%. 95%+ of voice cards go unread into the edition output.
- `households[].head` stores a POPID, not a name — my name-extraction came up empty. The 75 households per desk are real data but their utilization is hard to measure without a POPID-to-name resolver. Structure is fine; whether any household detail reaches the edition isn't clear from this pass.
- `arcs` have no `title` field — the schema uses `summary` + `domain` + `neighborhood`. Arc summaries like "Evening activity surging in the district" are too generic to substring-match. Utilization undetermined at this pass.

---

## 3. Empty and null top-level fields in packet.json

Structure exists, never gets populated. Per desk, count of packet fields that are `[]`, `{}`, `null`, or empty string:

| Desk | Empty/null field count | Which |
|------|-----------------------|-------|
| business | 10 / 26 | events, seeds, culturalEntities, sportsFeeds, sportsFeedDigest, maraDirective, previousCoverage, reporterHistory, citizenArchive, recentQuotes |
| chicago | 5 / 26 | arcs, maraDirective, reporterHistory, citizenArchive, recentQuotes |
| civic | 6 / 26 | sportsFeeds, sportsFeedDigest, reporterHistory, citizenArchive, recentQuotes, civicEvents |
| culture | 6 / 26 | sportsFeeds, sportsFeedDigest, maraDirective, reporterHistory, citizenArchive, recentQuotes |
| letters | 7 / 26 | reporters, maraDirective, previousCoverage, reporterHistory, citizenArchive, recentQuotes, civicEvents |
| sports | 5 / 26 | arcs, maraDirective, reporterHistory, citizenArchive, recentQuotes |

**Always-empty across all desks:** `reporterHistory`, `citizenArchive`, `recentQuotes`. These three fields have never been populated in the current pipeline. Candidates for removal unless a builder can point to the upstream source.

**Usually-empty:** `maraDirective` (null in 4 of 6 desks for c91 — either she didn't direct those desks this cycle, or the field isn't being populated).

---

## 4. Duplication — summary.json is a trimmed packet.json

`summary.json` top-level keys vs. `packet.json` top-level keys (business desk, representative):

- packet.json: 26 keys, ~468 KB
- summary.json: 21 keys, ~131 KB
- Shared keys: `meta, voiceCards, interviewCandidates, maraDirective, sportsFeeds, sportsFeedDigest, householdEvents, economicContext, eveningContext, storyConnections, civicEvents, reporters`

The overlap is structural: `summary.json` takes the same fields and trims the lists. `topArcs: 3` vs. `arcs: 21`. `activeStorylines: 10` vs. `storylines: 17`. `interviewCandidates: 10` vs. `interviewCandidates: 520`.

**Implication:** the agent gets the full data in `packet.json` and a pre-trimmed view in `summary.json`. The summary is not additional signal — it's the same signal at a different resolution. One of the two is redundant. Either the agent uses the summary (and packet is wasted), or the agent uses the packet (and summary is wasted). Both at once is bloat by structure.

---

## 5. Archive-context staleness (the only per-cycle persisted artifact)

`output/desk-briefings/{desk}_archive_c{XX}.md` is the "past coverage from Supermemory" slice. It's the only briefing component that persists per cycle on disk.

| Desk | c89 | c90 | c91 | Refreshes per cycle? |
|------|-----|-----|-----|----------------------|
| business | 3,510 B | 4,407 B | 4,407 B | c89→c90 yes; c90→c91 **no** |
| chicago | 3,500 B | 3,500 B | 3,500 B | **no** |
| civic | 8,844 B | 8,844 B | 8,844 B | **no** |
| culture | 4,313 B | 4,313 B | 4,313 B | **no** |
| letters | 2,552 B | 3,634 B | 3,634 B | c89→c90 yes; c90→c91 **no** |
| sports | 4,112 B | 4,112 B | 4,112 B | **no** |

**Four of six desks have identical archive context across c89/c90/c91.** Two desks updated once between c89 and c90 and stopped. The "past coverage from the archive" slice is effectively static content presented as cycle-fresh.

`rhea_archive_c{88,89,90}.md` — by comparison — does vary: 44 KB → 23 KB → 25 KB. So the pipeline *can* refresh per-cycle archive context; it just isn't doing it for desk briefings for 4 of 6 desks.

---

## 6. Craft-layer angle briefs (newer pipeline, right shape)

Alongside `output/desks/{desk}/current/` (bloated) there's `output/desks/{desk}-desk/current/angle_briefs/` (lean). Sample sizes:

- business-desk / c90_business_brief.md: 39 lines
- civic-desk / c90_civic_brief.md: similar shape
- All 6 `-desk` folders are 5–17 KB total vs. 693 KB–1.2 MB for the main folders.

**Only c90 angle briefs exist.** c91 either bypassed the angle-brief path or wrote somewhere else. The craft layer (S137b) produced the shape we want — 300–500 words per desk, matching Mezzalira guidance. It hasn't landed as the de-facto input; the bloated packet still runs alongside.

---

## 7. The briefing-versioning gap (blocker for any retro audit)

`output/` is gitignored (`.gitignore:29`). `output/desks/{desk}/current/briefing.md` is **overwritten every cycle** — no timestamped copy, no cycle suffix, no archive. c89 and c90 briefings no longer exist on this machine.

**Consequence:** no one can ever ask "did that c90 briefing cause the c90 Temescal miss?" again. The artifact that would answer it is gone.

**Minimum fix:** after each cycle, copy the live desk-current folder into `output/desks/{desk}/archive/c{XX}_briefing_bundle/` (or equivalent), commit-exempt but retained on disk. Lightweight — one `cp -r` in the post-cycle skill.

**Stronger fix:** pipe the briefing bundle into Supermemory (`bay-tribune` or `mags` container) alongside the finished edition, tagged by cycle. Then retro audits become MCP queries, not filesystem archaeology.

This belongs in the rollout as its own small item — tagged under Edition Production (media terminal) — and should land before the next "why did briefings X produce grade Y" question is asked.

---

## Recommendations (prioritized)

**High-signal / low-cost (do next):**

1. **Drop `interviewCandidates` from 520 → 20 per desk, desk-specific.** Current hit rate is 1.2% — the reporter isn't picking from 520, it's picking from a handful. A 20-name shortlist ranked by story relevance (arc overlap, neighborhood match, recent quotes) would be ~5% the size with same or better utilization. Estimated bundle savings per desk: ~300 KB (the `interviewCandidates` slice dominates packet.json weight).
2. **Load `base_context.json` once, reference six times.** Byte-for-byte identical — ship it once as a shared include path rather than six copies. Bundle savings: ~375 KB total (5 × 75 KB).
3. **Delete `reporterHistory`, `citizenArchive`, `recentQuotes` from packet schema unless there's a populator in-flight.** Empty across all 6 desks, c91. If nothing populates them, the schema key is cognitive overhead for reporters and reviewers both.
4. **Pick one: `packet.json` OR `summary.json`, not both.** They carry overlapping keys at different zoom. Document which one the agent is supposed to read. Delete the other from the bundle.

**Medium-signal (do after):**

5. **Fix archive-context staleness.** 4 of 6 desks serve the same past-coverage slice cycle after cycle. Either the Supermemory pull isn't firing, or the file caches incorrectly. Diagnose before trusting any "this is what past coverage looked like" claim.
6. **Consolidate on the angle-brief craft layer.** The `-desk/current/angle_briefs/` path produced the right shape for c90. Either it's wired to run for c91+ and failed, or it was shelved. Decide which, and if it's the source of truth, cut the bloated packet path.

**Blocker for future audits:**

7. **Add briefing versioning.** Without retained per-cycle briefings, no "did this input produce that output" question can ever be answered retrospectively. Post-cycle hook copies `{desk}/current/` to `{desk}/archive/c{XX}/`. One commit, one line of code, one hook.

---

## What this audit can't answer

- **Arc utilization** (0 hits found because arc titles are missing; arc summaries are too generic to substring-match; would need semantic matching or a richer arc schema).
- **Household utilization** (households reference POPIDs not names; would need a POPID resolver against the edition).
- **Voice-statement utilization** (voice-statement files exist but weren't cross-referenced against the edition here — add to a follow-up pass).
- **Correlation between bundle size and edition grade** (only c91 exists on disk; n=1. Needs the versioning fix first.)

---

## Changelog

- 2026-04-17 (S156) — Initial audit. c91 snapshot + c89/c90/c91 archive-context trend + briefing-versioning gap flagged.
