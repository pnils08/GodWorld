---
title: Sift-Dispatch Side-Skill Build Plan
created: 2026-07-03
updated: 2026-07-03
type: plan
tags: [media, write-edition, dispatch, sift, draft]
sources:
  - docs/adr/0012-autonomous-deep-dispatch-write-edition.md §Addendum (S289, corrected)
  - docs/plans/2026-06-25-deep-dispatch-write-edition-build.md §S289 status-log entry (corrected)
  - .claude/skills/sift/SKILL.md v2.0.3 (Steps 1-2 inputs, Steps 3/5/6 read in full this session — NOT edited by this plan)
  - .claude/skills/deep-dispatch/SKILL.md v0.1 (the downstream consumer this plan feeds)
pointers:
  - "[[../adr/0012-autonomous-deep-dispatch-write-edition]] — the ADR this plan implements a consequence of"
  - "[[2026-06-25-deep-dispatch-write-edition-build]] — sibling plan; Phase 1 substrate (engine-sheet, unstarted) is a dependency of Task 3 below"
  - "[[../media/charge_brief_template]] — the charge unit deep-dispatch already builds from"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — add entry in same commit"
---

# Sift-Dispatch Side-Skill Build Plan

**Goal:** A new skill (working name `/sift-dispatch` — Mike's suggestion, changeable) forks off `/sift`'s inputs, assigns all candidate storylines with a format tag, write-gates which ones actually get written this cycle, persists every assignment (written or not), and hands the cleared set to `/deep-dispatch` per desk — proven out by producing complete desk editions on its own, while the existing `/sift` → `/write-edition` all-desks-parallel pipeline stays untouched and keeps publishing.

**Architecture:** This is a **build-alongside side fork, not an edit to `/sift`.** Mike's explicit correction (S289): don't touch the existing skill; the live pipeline can't be put at risk before the new process is proven. The fork point is `/sift`'s own input layer — Steps 1-2 of `.claude/skills/sift/SKILL.md` (sheet primary, canon archive, NEWSROOM_MEMORY, engine audit, baseline briefs) are the same sources `/sift-dispatch` reads; nothing upstream of that (engine-review, world-summary, city-hall) changes either. From there, `/sift-dispatch` is new: it generates candidates with a `format` tag, gates writing on a "why this story now" test, persists every assignment, and calls `/deep-dispatch` (already built, unmodified) per desk for the cleared set. `/sift` and `/write-edition`'s all-desks-parallel launch are not touched by this plan and continue to be what actually publishes editions until the new fork is proven.

**Terminal:** research-build (design + build). Testing runs in research-build or media, standalone — does not require or risk a real edition cycle.

**Pointers:**
- Prior work: `.claude/skills/sift/SKILL.md` Steps 1-2 (input sources, unedited by this plan), Steps 3/5/6 (read in full S289 — used as reference for what a candidate/triage/gate shape looks like, not modified).
- Downstream: `.claude/skills/deep-dispatch/SKILL.md` — already built, already reads "the pool, not the per-article packet briefs." This plan defines what that pool looks like when produced by the new fork instead of `/sift`.
- Related plan: [[2026-06-25-deep-dispatch-write-edition-build]] — Phase 1 substrate (per-desk corpus + byline/desk tags, engine-sheet, still unstarted) is what makes Task 3's assignment persistence queryable per journalist rather than a flat file.
- Decision basis: [[../adr/0012-autonomous-deep-dispatch-write-edition]] Addendum (S289, corrected).

**Acceptance criteria:**
1. `/sift-dispatch` runs standalone against a cycle's inputs and produces a ranked, format-tagged storyline set (feature/interview/dispatch) covering the same candidate pool `/sift` would have surfaced.
2. A per-storyline write-gate decision (CLEAR/HOLD) is recorded for every storyline; CLEAR storylines feed `/deep-dispatch` per desk, HOLD storylines are not written but persist as visible assignments.
3. Run end-to-end on a real or replayed cycle, `/sift-dispatch` → `/deep-dispatch` produces **complete desk editions** (not a subset proof-of-concept) — this is Mike's stated cutover condition, and the acceptance bar for this plan is producing that, not just individual graded pieces.
4. `/sift` and `/write-edition`'s existing all-desks-parallel path are unmodified and still produce a normal published edition throughout this build — verified by diffing `.claude/skills/sift/SKILL.md` and `.claude/skills/write-edition/SKILL.md` against their pre-build state.
5. Test-run output is canon-worthy on its own terms (graded per `docs/media/story_evaluation.md`, same floor as any other piece) — this build has value before cutover, not only after.

---

## Tasks

### Task 1: New skill scaffold — `/sift-dispatch` inputs + candidate generation with format tag

- **Files:**
  - `.claude/skills/sift-dispatch/SKILL.md` — create
- **Steps:**
  1. Read the same canon content sources `/sift` Steps 1-2 read (sheet primary, canon archive, NEWSROOM_MEMORY) — reuse the exact source list, do not reinvent it.
  2. Generate candidate storylines using the same bucket logic `/sift` Step 3 already uses (WORLD / TEXTURE-CITY-LIFE / SPORTS / CIVIC-WITH-WEIGHT / CIVIC-TRACKER-ONLY) as a reference shape — this task does not need to invent new candidate logic, only add one new field.
  3. Add `"format": "<feature | interview | dispatch>"` to each candidate. Interview/dispatch format means the storyline executes inside `/deep-dispatch` using an interview or shorter-scene pass; it does not route the storyline out to a standalone `/interview` or `/dispatch` skill run. `format: dispatch` here is a mode on an in-run storyline, not the legacy `/dispatch` skill.
  4. Genuinely out-of-edition material (supplementals) is excluded from `/sift-dispatch`'s output entirely — not tagged, not assigned. Confirm this exclusion is explicit in the skill's prose.
- **Verify:** `/sift-dispatch` produces a candidate list where every entry has a non-null `format`, and no entry represents supplemental material.
- **Status:** [ ] not started

### Task 2: Write-gate decision + Mike approval pass

- **Files:**
  - `.claude/skills/sift-dispatch/SKILL.md` — modify (same file, next section)
- **Steps:**
  1. Present the full ranked, format-tagged candidate list to Mike in one pass (reuse `/sift` Step 6's priority-ranking + newspaper-section-ordered presentation style as reference).
  2. Mike marks each storyline CLEAR or HOLD — this replaces `/sift`'s single-slate-lock-and-reject-the-whole-thing gate. A HOLD on one storyline doesn't reopen the whole ranked list.
  3. Cadence caps (per-reporter, per-section) bound how many storylines can be CLEAR, same numbers `/sift` already uses as defaults (2 per reporter, 3 per section) — reference, don't reinvent.
- **Verify:** A test run against a 7+ candidate set produces a CLEAR/HOLD split, not an all-or-nothing approval.
- **Status:** [ ] not started

### Task 3: Assignment-persistence emission

- **Files:**
  - `.claude/skills/sift-dispatch/SKILL.md` — modify (same file, next section)
  - `output/assignments_c{XX}.json` — new output shape (define inline in the skill; no separate schema doc needed unless it grows)
- **Steps:**
  1. Emit one entry per storyline (CLEAR and HOLD alike): `{id, headline, desk, reporter, format, writeGateOutcome: "clear"|"hold", cycle}`.
  2. If Phase 1 substrate is live (`output/desks/{desk}/articles/` writable, per [[2026-06-25-deep-dispatch-write-edition-build]] Task 1): also append each reporter's entries into their per-desk store. If not live, the flat file is sufficient — check liveness before attempting the per-desk write.
  3. No approval gate on this emission — it's a record, not a decision point.
- **Verify:** After a test run, `output/assignments_c{XX}.json` contains at least one `"hold"` entry alongside `"clear"` entries.
- **Status:** [ ] not started

### Task 4: Hand off CLEAR storylines to `/deep-dispatch` per desk

- **Files:**
  - `.claude/skills/sift-dispatch/SKILL.md` — modify (final section)
  - `.claude/skills/deep-dispatch/SKILL.md` — read only, no edit expected
- **Steps:**
  1. Group CLEAR storylines by desk; invoke `/deep-dispatch {cycle} {desk}` for each desk with CLEAR storylines, unmodified.
  2. Confirm `/deep-dispatch`'s Prerequisites ("reads the pool, not the per-article packet briefs"; Step 4 "`{slot}` comes from the sift slate assignment for this desk") resolve correctly against `/sift-dispatch`'s CLEAR subset instead of `/sift`'s locked slate.
  3. If a mismatch surfaces, fix it in `/sift-dispatch`'s output shape — do not touch `/deep-dispatch` or `/sift`, both stay as-is.
- **Verify:** `/deep-dispatch` runs against `/sift-dispatch` output without a schema mismatch and produces per-desk pieces in `output/desks/{desk}/articles/`.
- **Status:** [ ] not started

### Task 5: Combine + front-page selection

- **Files:**
  - `.claude/skills/sift-dispatch/SKILL.md` — modify (final section)
- **Steps:**
  1. After all deep-dispatched desks finish, collect their output into a single packet for the test cycle.
  2. Mike selects the strongest piece for front page at combine-time (per ADR-0012 addendum D1).
  3. This packet is the test artifact for Acceptance Criterion 3 (complete desk editions) — it does NOT get published through the live pipeline's ingest/print steps unless Mike separately approves that for a specific test cycle.
- **Verify:** A combined packet exists covering every desk that had a CLEAR storyline this test cycle.
- **Status:** [ ] not started

---

## Open questions

- [ ] **Naming.** Mike suggested `/sift-dispatch`; this plan uses it as a working name throughout. Confirm before Task 1, or rename freely — no functional dependency on the name itself. (Four related skill names will exist: `/sift`, `/dispatch`, `/deep-dispatch`, `/sift-dispatch` — worth a one-line disambiguation note in the new skill's description field so `disable-model-invocation` / discovery doesn't collide.)

---

## Changelog

- 2026-07-03 — Initial draft (S289): scoped as an in-place `/sift` edit.
- 2026-07-03 — Rewritten (S289): new side skill, `/sift` untouched, prior open questions dissolved.
