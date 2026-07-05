---
title: No-Gregorian-Clock Triage Plan
created: S291
updated: S291
type: plan
tags: [governance, schema, no-clock, draft]
sources:
  - Mike-direct S291 (verbatim): "NO GEORGIAN CLOCK MAY EVER BE USED FOR ANY PURPOSE AT ANY TIME EVER, NO EXCEPTIONS EVER" / "Sim facing or not, NO GEORGIAN CLOCK IS EVER ALLOWED"
  - Live grep S291: narrow pattern (YYYY-MM-DD only) found 554 files; broader pattern (bare years + month-names) found 668 files, likely with false positives — true count needs per-file review, not a single regex
  - docs/SCHEMA.md §3 (current `created`/`updated: YYYY-MM-DD` frontmatter convention — the thing this plan supersedes)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — new row needed once filed"
  - "[[../SCHEMA]] — convention this plan rewrites"
  - "[[index]] — add entry in same commit"
---

# No-Gregorian-Clock Triage Plan

**Goal:** Every file in the project — sim-facing or not, doc metadata or not — stops using any Gregorian-calendar date representation, with no exceptions, and a replacement convention exists for anything that currently needs a date (doc frontmatter, changelog entries, session citations).

**Architecture:** Three real numbers, not estimates: **554 files** match a strict `YYYY-MM-DD` pattern; a broader pattern (bare 4-digit years 2024-2029, month-names) matches **668** but over-counts (a bare number in that range isn't always a date — could be a dollar figure, POPID, unrelated count). The true number sits between and needs per-file confirmation, not a single grep — that confirmation is this plan's Task 2. Three additional surfaces are out of mechanical reach and are separate, harder problems, scoped but NOT executed by this plan: **git commit history** (2,295 commits, each with a Gregorian commit date baked into git's object model — removing it means rewriting all history, changing every commit hash, and force-pushing a repo shared across 4 terminals); **Supermemory record timestamps** (`createdAt`/`updatedAt` are server-assigned by the platform, may not be API-editable at all, and bay-tribune search explicitly ranks by real recency — removing them risks breaking retrieval); **published/canon editions** (already-shipped historical artifacts — rewriting them is an editorial-canon question, not a mechanical one).

**Terminal:** research-build (this plan) → engine-sheet / media (execution, per-file-type)

**Pointers:**
- Convention rewritten: [[../SCHEMA]] §3 (`created`/`updated` frontmatter)
- Replacement format candidate: session-number marker (e.g. `S291`) in place of `YYYY-MM-DD` — proposed here, not yet locked (see Open Questions)

**Acceptance criteria:**
1. `SCHEMA.md`'s frontmatter convention is rewritten to a non-Gregorian format, and every doc going forward follows it.
2. All 554 (strict-pattern) files are individually reviewed and either fixed (date replaced with the new convention) or confirmed as a false-context match (e.g., a dollar amount, not a date) with the reason logged.
3. The broader ~668-pattern set is reconciled against the 554 set — the delta (114 files) reviewed to confirm whether each is a real date miss or a false positive from the broader regex.
4. Git-history, Supermemory, and published-canon items are explicitly named as separate decisions requiring their own sign-off — not silently folded into this plan's completion.

---

## Tasks

### Task 1: Rewrite the frontmatter convention

- **Files:**
  - `docs/SCHEMA.md` — modify (§3, the `created`/`updated: YYYY-MM-DD` rule)
  - `docs/plans/TEMPLATE.md`, `docs/research/TEMPLATE.md` — modify (frontmatter examples)
- **Steps:**
  1. Replace `YYYY-MM-DD` with a session-number convention (e.g. `created: S<n>`) in the rule text and both templates' example blocks.
- **Verify:** `grep -n "YYYY-MM-DD" docs/SCHEMA.md docs/plans/TEMPLATE.md docs/research/TEMPLATE.md` → no hits.
- **Status:** [ ] not started

### Task 2: Reconcile the 554 vs 668 count into a real number

- **Files:** none yet named — output is a list, not edits
- **Steps:**
  1. Diff the 554-file (strict) and 668-file (broad) result sets — 114 files appear only in the broad set.
  2. For each of those 114, confirm by inspection: real missed date, or false positive (non-date number in range).
  3. Produce a single confirmed list of files that actually contain a Gregorian date.
- **Verify:** the confirmed list's count is stated as an exact, inspected number, not a regex estimate.
- **Status:** [ ] not started

### Task 3: Fix the confirmed doc-frontmatter subset

- **Files:** the subset of Task 2's confirmed list living in `docs/plans/`, `docs/research/`, `docs/adr/` frontmatter
- **Steps:**
  1. Replace each file's `created`/`updated` Gregorian date with the Task 1 convention.
- **Verify:** re-run Task 2's confirmed-list grep against this subset → zero remaining matches.
- **Status:** [ ] not started

### Task 4: Triage the remainder (inline prose, changelogs, non-doc files)

- **Files:** the confirmed list's remainder — engine code comments, session-log prose, memory files, anything not doc frontmatter
- **Steps:**
  1. Batch by file type/location (engine code / memory files / editions / other) so each batch gets consistent handling rather than one-off judgment calls.
  2. Per batch, replace the Gregorian reference with a session-number or cycle-stamp equivalent, or remove it if it carries no information the replacement can't.
- **Verify:** re-run the confirmed-list grep against each batch after it's done → zero remaining matches for that batch.
- **Status:** [ ] not started

---

## Open questions

- [ ] **Replacement format not locked.** This plan proposes session-number (`S<n>`) for doc metadata — confirm, or specify a different format (pure cycle-stamp, something else) before Task 1 executes.
- [ ] **Git history (Tier 3) and Supermemory (Tier 4) are explicitly out of this plan's Tasks.** Both need their own separate decision and sign-off given the risk profile (history rewrite breaks shared repo state across 4 terminals; Supermemory dates may not be editable and recency-search depends on them). Confirm whether either gets a follow-on plan, or is accepted as a permanent exception.
- [ ] **Published/canon editions** — rewriting historical, already-shipped editions is an editorial-canon call, not named as in-scope here. Confirm intent before any edition file gets touched.

---

## Changelog

- S291 — Initial draft (research-build), triaging Mike-direct "no Gregorian clock, ever, no exceptions." Scoped against real grep counts (554/668), not estimates. Git history, Supermemory, and published canon named as separate, harder decisions rather than folded silently into execution.
