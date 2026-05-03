---
title: ROLLOUT Triage Cadence Plan
created: 2026-05-03
updated: 2026-05-03
type: plan
tags: [architecture, infrastructure, ready]
sources:
  - output/production_log_edition_c93_write_gaps.md G-W16 (meta-pattern — HIGHs sit on shelf and compound)
  - docs/engine/ROLLOUT_PLAN.md §Edition Post-Publish (current capture pattern)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-05-03-c93-gap-triage-execution]] — Wave 4 parent"
  - "[[SCHEMA]] — doc conventions"
---

# ROLLOUT Triage Cadence Plan

**Goal:** Close G-W16 meta-pattern — promoted-to-ROLLOUT HIGH-severity items get triaged on a known cadence so they don't sit on shelf and compound across cycles. Current state: gap-log → ROLLOUT capture works; ROLLOUT → action triage doesn't.

**Architecture:** S193 logged G-R6/R7/R10 (project-agent canon-fabrication) as HIGH and promoted to ROLLOUT. Between S193 and S195, no action taken. Same failure class re-landed in civic-desk this cycle as G-W12. Cycle compounds. Add (a) cycles-on-shelf counter as inline metadata on each HIGH ROLLOUT entry, (b) per-cycle triage scan that surfaces stale HIGHs to the next session's priorities, (c) auto-promotion threshold — HIGHs unaddressed >2 cycles auto-promote to top-of-section with a `STALE-2C` flag. Manual override permitted (`PARKED: <reason>` flag) for HIGHs deliberately deferred.

**Terminal:** research-build (design + tooling) — closes the same loop research-build already uses to maintain ROLLOUT

**Pointers:**
- Triggering case: G-W16 in `output/production_log_edition_c93_write_gaps.md` documents the recurrence (S193 G-R6/R7/R10 → S195 G-W12)
- Pattern adopted from: standard issue-tracker SLA conventions (urgency-grows-with-shelf-time)
- Companion to: existing per-skill gap-log capture pattern (Wave 1-3 of [[plans/2026-05-03-c93-gap-triage-execution]])

**Acceptance criteria:**
1. Every HIGH-severity ROLLOUT entry under §Edition Post-Publish (and other open-work sections) carries a `cycle-promoted: C<XX>` inline metadata tag.
2. A scan tool (`scripts/rolloutTriage.js`) reads ROLLOUT_PLAN, identifies HIGHs with `cycle-promoted` >2 cycles old (relative to current cycle), outputs a stale-list to `output/rollout_triage_c<XX>.md`.
3. `/session-end` (or per-cycle close skill) reads the stale-list and surfaces top stale HIGHs to next-session priorities in SESSION_CONTEXT.
4. PARKED items (deliberately deferred) require explicit `PARKED: <reason>` flag and are excluded from staleness calculation.
5. Backfill: existing ROLLOUT entries get retroactive `cycle-promoted` tags (S197 cycle, since this is the first session running the cadence).

---

## Phase 1 — Design (research-build)

### Task 1.1: Resolve the metadata format

- **Question:** Where does `cycle-promoted: C<XX>` live on each ROLLOUT entry? Inline parenthetical? Frontmatter-style block? Trailing tag?
- **Recommended:** trailing inline tag at end of entry's first line — `(promoted: C92, severity: HIGH)`. Easy to grep, doesn't break entry readability.
- **Output:** convention spec.
- **Status:** [ ] not started

### Task 1.2: Resolve the staleness threshold

- **Question:** How many cycles is too many on shelf? G-W16 documented 2-cycle recurrence as the failure point.
- **Recommended:** `STALE-2C` at >2 cycles unaddressed (i.e., promoted at C92, current is C95+ — that's 3 cycles old). Auto-surfaced as priority in next session's SESSION_CONTEXT.
- **Status:** [ ] not started

### Task 1.3: Resolve the auto-promotion mechanism

- **Question:** When a HIGH hits STALE-2C, does it auto-move to top-of-section with a flag, OR stay in place with a flag, OR move to a dedicated §Stale-HIGHs subsection?
- **Recommended:** stay in place with `[STALE-2C]` prefix on the entry's first line. Moving entries shuffles a doc that's already large; visibility comes from the next-session priorities surface, not from doc reorganization.
- **Status:** [ ] not started

### Task 1.4: Resolve the PARKED override

- **Question:** When is a HIGH allowed to be parked? Who decides?
- **Recommended:** explicit `PARKED: <reason>` flag added to entry. Excluded from staleness scan. Mike-decision typically; research-build can park with note. Examples of valid park reasons: "Waiting on engine-sheet capacity," "Blocked by GPU acquisition," "Lower priority than current Wave-N work."
- **Status:** [ ] not started

### Task 1.5: Resolve the scan integration point

- **Question:** When does the staleness scan run? At /session-end? At /session-startup? On demand?
- **Recommended:** at /session-end (research-build terminal) — the natural close point where ROLLOUT changes already happen. Output goes into next session's SESSION_CONTEXT priorities.
- **Status:** [ ] not started

---

## Phase 2 — Backfill (research-build)

### Task 2.1: Tag existing HIGH ROLLOUT entries with cycle-promoted metadata

- **Files:**
  - `docs/engine/ROLLOUT_PLAN.md` — modify
- **Steps:**
  1. Walk every HIGH-severity entry under §Open Work Items sub-sections
  2. Identify the cycle the entry was first promoted (commit log, entry text usually says "S193" or similar — derive C<N> from session number)
  3. Add `(promoted: C<XX>, severity: HIGH)` inline tag to entry first line
  4. Best-effort: if cycle-of-promotion can't be determined, tag `(promoted: C93, severity: HIGH)` — the C93 triage start cycle is the conservative default
- **Verify:** `grep -c "promoted: C" docs/engine/ROLLOUT_PLAN.md` returns >20
- **Status:** [ ] not started

---

## Phase 3 — Tooling (research-build)

### Task 3.1: Build `scripts/rolloutTriage.js`

- **Files:**
  - `scripts/rolloutTriage.js` — create
- **Steps:**
  1. Parse ROLLOUT_PLAN for HIGH entries with `(promoted: C<XX>, ...)` tags
  2. Compute cycle-on-shelf = current cycle − promoted cycle
  3. Filter to STALE-2C threshold (>2 cycles), exclude PARKED entries
  4. Output `output/rollout_triage_c<XX>.md` with stale-list ordered by oldest-first
  5. Each stale entry shows: title, age in cycles, current severity tag, link to source gap log if known
- **Verify:** running on current ROLLOUT produces a non-empty stale list
- **Status:** [ ] not started

### Task 3.2: Wire into /session-end

- **Files:**
  - `.claude/skills/session-end/SKILL.md` — modify (research-build terminal-specific section)
- **Steps:**
  1. New step: run `node scripts/rolloutTriage.js <current-cycle>`
  2. Read output, append top 3-5 stale HIGHs to SESSION_CONTEXT next-session priorities
- **Verify:** /session-end run produces SESSION_CONTEXT priorities that include stale-HIGH carryforward
- **Status:** [ ] not started

---

## Phase 4 — Validation

### Task 4.1: Run on existing ROLLOUT

- After Phase 2 backfill, scan reports stale HIGHs (likely several, since G-W16 already documents the recurrence)
- Validate the surfaced list matches Mike's priority intuition; tune threshold if needed
- **Status:** [ ] not started

---

## Open questions

All five closed S198 via blanket approval:
- [x] Phase 1 Task 1.1 — metadata format: **trailing inline tag** `(promoted: C<XX>, severity: HIGH)` at end of entry's first line
- [x] Phase 1 Task 1.2 — staleness threshold: **STALE-2C at >2 cycles** unaddressed
- [x] Phase 1 Task 1.3 — auto-promotion mechanism: **in-place flag** (`[STALE-2C]` prefix on first line); no section move
- [x] Phase 1 Task 1.4 — PARKED override: **explicit `PARKED: <reason>` flag** excluded from staleness scan; Mike-decision typically, research-build can park with note
- [x] Phase 1 Task 1.5 — scan integration point: **at /session-end** (research-build terminal); output goes into next session's SESSION_CONTEXT priorities

Plan is action-ready — Phase 2 (backfill) + Phase 3 (tooling) can start without further design.

---

## Changelog

- 2026-05-03 — Initial draft (S197). Wave 4 of [[plans/2026-05-03-c93-gap-triage-execution]]. Status: DRAFT — Phase 1 open questions must resolve before Phase 2 starts. Triggered by G-W16 meta-pattern documented S195 (project-agent canon-fabrication HIGHs from S193 sat on shelf and re-landed in desk-reporter agents 2 cycles later).
- 2026-05-03 — All five Phase 1 open questions closed S198 via Mike blanket approval. Recommendations adopted verbatim (trailing inline tag / STALE-2C threshold / in-place flag / explicit PARKED flag / /session-end integration). Status: DRAFT → ready-for-build. Tags shifted `[architecture, infrastructure, draft]` → `[architecture, infrastructure, ready]`.
