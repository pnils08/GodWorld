---
title: Phase 40.1 Session-Log Interface Plan
created: 2026-04-16
updated: 2026-04-17
type: plan
tags: [engine, architecture, complete]
sources:
  - docs/engine/PHASE_40_PLAN.md §40.1
  - docs/RESEARCH.md — paper 3 ("the session is not Claude's context window")
  - MEMORY.md — feedback_rollout-pointers-not-notes.md
pointers:
  - "[[engine/PHASE_40_PLAN]] — parent phase doc"
  - "[[engine/ROLLOUT_PLAN]] — step 9 of the spine"
  - "[[plans/TEMPLATE]] — shape this plan follows"
---

# Phase 40.1 Session-Log Interface Plan

**Goal:** Build `lib/sessionLog.js` — a read-only helper that returns positional slices of the durable event log (production logs, journal entries, ctx.summary snapshots) so skills, scripts, and crashed reporters can resume from a known event instead of re-parsing ad hoc.

**Architecture:** Production logs in `output/production_log_*.md`, journal entries in `docs/mags-corliss/JOURNAL.md`, and per-cycle `ctx.summary` JSON already function as GodWorld's durable event log. Each skill today reads them by grep, head, or bespoke section parsing. This phase consolidates read patterns into a single library with three slicing primitives: last N events, events since timestamp, events matching tag. Writers are out of scope — skills continue appending to logs the same way they do today. Only the reader becomes uniform.

**Terminal:** research-build drafts; engine/sheet builds.

**Pointers:**
- Prior work: the durable-log pattern itself is already in production — `output/production_log_edition_c91.md` and peers have ~6 months of structured step headings (`## Step 0: Session State`, `## Step 1: World Summary`, etc.).
- Related plan: [[engine/PHASE_40_PLAN]] §40.2 (reporter-as-cattle refactor) depends on this. A crashed reporter resumes by calling `readSince(log, lastKnownTimestamp)`.
- Research basis: `docs/RESEARCH.md` — paper 3 (Anthropic session-not-context framing). Specific quote: "the session is not Claude's context window."

**Acceptance criteria:**
1. `lib/sessionLog.js` exports three functions: `readLast(path, n)`, `readSince(path, isoTimestamp)`, `readByTag(path, tag)`. All three return arrays of event objects with a uniform shape: `{ step, tag, timestamp, body }`.
2. Parser handles the two production-log dialects already in use: step-numbered editions (`## Step 0: Session State`) and free-form city-hall logs.
3. Unit test suite covers 6 cases minimum: empty log, single event, N events with N <= total, N > total, timestamp with no matches, tag filter hit + miss. All pass.
4. One existing caller migrated off ad-hoc parsing to the new library as proof of the pattern. Candidate: whichever skill reads `output/production_log_edition_c{XX-1}.md` at session start (identified in Task 1).
5. No writes. The library does not create, modify, or append to logs. Read-only by contract.

---

## Tasks

### Task 1: Inventory ad-hoc log reads across the codebase

- **Files:**
  - `scripts/**/*.js` — read only
  - `.claude/skills/**/SKILL.md` — read only
- **Steps:**
  1. Grep for `production_log_`, `JOURNAL.md`, and `ctx.summary` across `scripts/` and `.claude/skills/`.
  2. For each hit, record: file, line, what it reads, what shape it expects (last N? between timestamps? whole file?).
  3. Write the inventory to `docs/plans/2026-04-16-phase-40-1-session-log-interface.md` under a new `## Inventory` section below.
- **Verify:** Inventory has ≥5 entries OR a one-line "no ad-hoc readers found, this phase is premature — escalate."
- **Status:** [x] done — S156

### Task 2: Define the event schema

- **Files:**
  - `lib/sessionLog.js` — create (schema block only, no functions yet)
- **Steps:**
  1. At the top of the new file, write a JSDoc block defining the `Event` shape: `{ step: string|null, tag: string|null, timestamp: string|null, body: string }`.
  2. Document the two accepted log formats with a one-paragraph example of each, citing `output/production_log_edition_c91.md` and `output/production_log_city_hall_c91.md` as real references.
- **Verify:** File exists. JSDoc has all four fields. Two example formats referenced.
- **Status:** [x] done — S156

### Task 3: Implement `readLast(path, n)`

- **Files:**
  - `lib/sessionLog.js` — modify
- **Steps:**
  1. Read the file synchronously (these are small — largest today is ~500 lines). If it doesn't exist, return `[]`.
  2. Split on `^## ` headings to get event blocks. First block before any heading is discarded (file-level frontmatter or title).
  3. Parse each block into `{ step, tag, timestamp, body }` — step pulled from the heading prefix (e.g., `Step 3`), tag and timestamp pulled from known metadata lines if present (`**Started:**`, `**Step tag:**`), body is the rest.
  4. Return the last N blocks in original order.
- **Verify:** `node -e "console.log(require('./lib/sessionLog').readLast('output/production_log_edition_c91.md', 3).length)"` prints `3`.
- **Status:** [x] done — S156

### Task 4: Implement `readSince(path, isoTimestamp)`

- **Files:**
  - `lib/sessionLog.js` — modify
- **Steps:**
  1. Reuse the block parser from Task 3.
  2. Filter blocks where `timestamp` exists AND `new Date(timestamp) >= new Date(isoTimestamp)`.
  3. Blocks without a parseable timestamp are included iff their position is after the first matching block (so a section with no timestamp but sitting mid-log isn't dropped).
- **Verify:** Empty-result case returns `[]`. Timestamp before earliest entry returns all dated entries.
- **Status:** [x] done — S156

### Task 5: Implement `readByTag(path, tag)`

- **Files:**
  - `lib/sessionLog.js` — modify
- **Steps:**
  1. Reuse the block parser.
  2. Return blocks whose `tag` field matches the supplied tag (case-insensitive exact match; not a substring search).
- **Verify:** Miss returns `[]`. Hit returns at least one block with matching `tag`.
- **Status:** [x] done — S156

### Task 6: Unit tests

- **Files:**
  - `lib/sessionLog.test.js` — create
- **Steps:**
  1. Fixture 1: empty file. All three readers return `[]`.
  2. Fixture 2: single event. `readLast(_, 3)` returns 1, `readSince(_, oldTimestamp)` returns 1, `readByTag(_, unknownTag)` returns 0.
  3. Fixture 3: five events, two tagged `cycle-start`. `readLast(_, 3)` returns 3, `readByTag(_, 'cycle-start')` returns 2.
  4. Fixture 4: events spanning three hours. `readSince(_, middleTimestamp)` returns only events at or after.
  5. Run with the project's existing test conventions (node --test or whatever `scripts/engine-auditor/*.test.js` uses).
- **Verify:** All assertions pass. `node --test lib/sessionLog.test.js` exits 0.
- **Status:** [x] done — S156

### Task 7: Migrate one existing caller

- **Files:**
  - Target file identified in Task 1 — modify
- **Steps:**
  1. Replace the ad-hoc read with a call into `lib/sessionLog.js`.
  2. Verify behavior unchanged by running whatever the caller's existing test path is (skill dry-run, script invocation).
- **Verify:** Output of the caller before and after matches on a known input.
- **Status:** [x] done — S156

### Task 8: Back-link from parent phase doc and register in index

- **Files:**
  - `docs/engine/PHASE_40_PLAN.md` — modify
  - `docs/index.md` — modify
- **Steps:**
  1. In PHASE_40_PLAN.md §40.1, append a line pointing to `[[plans/2026-04-16-phase-40-1-session-log-interface]]` as the execution plan. Add a changelog entry dated today.
  2. In `docs/index.md`, add an entry for this plan file under the `docs/plans/` section.
- **Verify:** Both files grep positive for `phase-40-1-session-log-interface`.
- **Status:** [x] done — S156

---

## Inventory

Grep across `scripts/` and `.claude/skills/` for `production_log_` and `JOURNAL.md` references. Writers excluded — 40.1 is read-only.

**Readers — production logs:**

| File | Line | Reads | Shape expected |
|---|---|---|---|
| `.claude/skills/city-hall-prep/SKILL.md` | 22 | `production_log_city_hall_c{XX-1}.md` | prior cycle — what was promised, what cascaded |
| `.claude/skills/write-supplemental/SKILL.md` | 56 | `production_log_edition_c{XX}.md` | whole current-cycle log, appends |
| `.claude/skills/write-supplemental/SKILL.md` | 214 | `production_log_city_hall_c{XX}.md` | LOCKED CIVIC CANON — voice decisions |
| `.claude/skills/build-world-summary/SKILL.md` | 24 | `production_log_city_hall_c{XX}.md` | post-civic, pre-sift input |
| `.claude/skills/sift/SKILL.md` | 22, 32 | `production_log_city_hall_c{XX}.md` | voice decisions, tracker updates, handoff |
| `.claude/skills/write-edition/SKILL.md` | 23 | `production_log_edition_c{XX}.md` | story picks, citizen table from /sift |
| `.claude/skills/interview/SKILL.md` | 63–64 | both logs | context for interview prep |
| `.claude/skills/podcast/SKILL.md` | 25–30 | both logs | content base for episode |
| `.claude/skills/edition-print/SKILL.md` | 25, 35 | `production_log_edition_c{XX}.md` | completed edition context |
| `.claude/skills/post-publish/SKILL.md` | 26–27, 108–109 | both logs | canonization source |
| `scripts/rewardHackingScanner.js` | 164 | filters by regex across all edition logs | cross-cycle pattern scan |

**Readers — JOURNAL.md:**

| File | Line | Reads | Shape expected |
|---|---|---|---|
| `.claude/skills/boot/SKILL.md` | 47 | end of JOURNAL.md, nightly reflections since last session | **"events after timestamp X"** — `readSince` primitive |
| `.claude/skills/session-startup/SKILL.md` | 30 | same pattern as boot | **"events after timestamp X"** — `readSince` primitive |
| `.claude/skills/session-end/SKILL.md` | 107 | "last 3 `## Session` blocks from JOURNAL.md" | **"last N events"** — `readLast` primitive |

**Findings:**

1. **14 readers.** Phase is not premature.
2. **Two primitives used in the wild:** `readLast(journal, 3)` (session-end) and "since last session entry" (boot, session-startup). `readByTag` has no current consumer — resolves the first open question: **drop `readByTag` from the MVP.** Add it later when a second caller demands it.
3. **Clean migration target:** `session-end/SKILL.md:107` is a one-liner spec (`last 3 ## Session blocks`) that maps perfectly to `readLast(journal, 3)`. Use for Task 7.
4. **Most production-log readers want the whole file, not slices.** They're reading for context, not positional resume. Don't force-migrate them. The library serves the slicing cases first; whole-file readers can migrate later or stay ad hoc.
5. **Reporter-resume pattern (the paper-3 use case) has zero current consumers.** 40.1 builds the primitive that 40.2 (reporter-as-cattle) will consume. Document this explicitly so engine/sheet doesn't look for a non-existent caller.

---

## Open questions — RESOLVED 2026-04-16 (S156)

- [x] **Does a crashed reporter actually need `readByTag`?** RESOLVED — NO. Inventory found 14 readers and zero `readByTag` consumers (all want `readLast` or whole-file). Dropped from MVP. Add later when a second caller demands it.
- [x] **Do we need a JSON log path or just markdown?** RESOLVED — markdown only. Inventory showed no caller asking for JSON slicing of `ctx.summary`. Separate plan if/when needed.

---

## Out of scope

- Write helpers (append, rotate, archive). Writers stay ad hoc for now.
- JSON slicing of `ctx.summary`. Different shape, different plan.
- Cross-file queries (e.g., "all events across all cycle logs"). Single file at a time.
- Performance tuning. Logs are small; reads are cheap.

---

## Changelog

- 2026-04-16 — Initial draft (S156, research-build terminal). Scoped from [[engine/PHASE_40_PLAN]] §40.1. Deliberately narrow: one library, three readers, one migration proof. Task 1 inventory gates the rest — if no ad-hoc readers exist, the phase is premature and should be rescoped.
- 2026-04-16 — Implemented (S156, engine-sheet terminal). All 7 active tasks done (Task 1 inventory was already complete in this plan; `readByTag` dropped per resolution above, so Task 5 skipped). `lib/sessionLog.js` ships `readLast` + `readSince`. 17/17 tests passing on synthetic + real production logs and JOURNAL.md. Session-end SKILL.md:107 migrated as proof. PHASE_40_PLAN.md and docs/index.md updated.
