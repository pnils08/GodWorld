---
title: Plan File Template
created: 2026-04-16
updated: 2026-04-16
type: reference
tags: [architecture, active]
sources:
  - https://github.com/obra/superpowers — writing-plans skill (S152 evaluation)
  - docs/SCHEMA.md §3 (frontmatter), §11 (changelog)
  - MEMORY.md — feedback_rollout-pointers-not-notes.md (S147)
pointers:
  - "[[SCHEMA]] — frontmatter, naming, tag taxonomy"
  - "[[index]] — every new plan file must register here in the same commit"
  - "[[engine/ROLLOUT_PLAN]] — parent rollout; plans split out from it"
---

# Plan File Template

**Every in-flight plan uses this shape.** Copy this file, rename to `YYYY-MM-DD-<feature-name>.md`, fill in the blanks, delete the instructional italics, add an index entry in the same commit.

The contract: a plan file is self-contained. A fresh session (or a subagent with no prior context) should be able to read it and execute the work without reconstructing history.

---

## Template

Copy everything below the fence. The italicized guidance in each section is for the writer — delete it once you've filled the section in.

```markdown
---
title: [Feature / Phase Name] Plan
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: plan
tags: [domain, status]
sources:
  - docs/engine/ROLLOUT_PLAN.md §N
  - [source paper / prior plan / claude-mem ID / supermemory doc ID]
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# [Feature / Phase Name] Plan

**Goal:** [One sentence. What "done" means. If you can't write it in one sentence, the plan is too big — split it.]

**Architecture:** [2–3 sentences. What gets built, where it fits, what it replaces. Reader should understand the shape without reading further.]

**Terminal:** [research-build | engine/sheet | media | civic]

**Pointers:**
- Prior work: [file path or supermemory doc ID]
- Related plan: [[other-plan]]
- Research basis: [paper path, repo URL, supermemory doc ID, claude-mem observation ID]

**Acceptance criteria:**
1. [Testable outcome. "The thing runs and produces X" beats "the thing is better."]
2. [Testable outcome.]
3. [Testable outcome.]

---

## Tasks

Each task is 2–5 minutes of focused work. Exact file paths. Expected verification. No "TBD," no "similar to Task N," no "add validation."

### Task 1: [Name]

- **Files:**
  - `path/to/file.js` — create | modify | read
- **Steps:**
  1. [Exact action. Include code blocks if code is involved.]
  2. [Exact action.]
- **Verify:** `command to run` → [expected output or exit code]
- **Status:** [ ] not started

### Task 2: [Name]

- **Files:**
  - `path/to/other.js` — modify
- **Steps:**
  1. [Exact action.]
- **Verify:** `command` → [expected output]
- **Status:** [ ] not started

---

## Open questions

Questions that block a task. Resolve and delete. An open question at publish time is a plan defect.

- [ ] [Question — which task blocks on it]

---

## Changelog

- YYYY-MM-DD — Initial draft ([S??? session tag]).
```

---

## How to use this template

### Writing a new plan

1. Copy the fenced block above into `docs/plans/YYYY-MM-DD-<name>.md` (dated the day you start drafting it).
2. Fill in every field. If you can't fill one, write "UNKNOWN — [reason]" rather than leaving it blank. That flags the gap.
3. Add an entry to [[index]] under `docs/plans/` in the same commit.
4. Back-link from the parent — if it's split out of [[engine/ROLLOUT_PLAN]], replace the inline content in ROLLOUT_PLAN with a one-line pointer to the new file.

### Task granularity rule

A task is 2–5 minutes. That sounds small. It's intentional: small tasks surface design flaws early, make review cheap, and let a subagent execute one without needing the whole plan context.

If a task is "build the foo system," it's not a task — it's a plan. Split it until each step is a single function, a single file edit, or a single verification.

### Subagent-safety rule

The plan gets read by fresh sessions. Do not reference:
- Conversation context ("as we discussed")
- Unwritten prior knowledge ("the usual pattern")
- Files the reader hasn't opened ("similar to PhaseXX")

Every claim the plan depends on: cite the file path, the supermemory doc ID, the claude-mem observation, the paper path. Pointers not recall. (See MEMORY.md → feedback_rollout-pointers-not-notes.md.)

### Status lifecycle

- **Draft** — being written. Not yet handed off. `type: plan`, `tags: [..., draft]`.
- **Active** — approved, tasks in progress. `type: plan`, `tags: [..., active]`.
- **Complete** — all tasks done. Move to `docs/archive/` (or leave in place with `tags: [..., archived]`), add a closing changelog entry, update index.

### When a plan is too big

Signals:
- Goal needs two sentences.
- More than ~15 tasks.
- Crosses more than two terminals.

Split into sub-plans. The parent stays as an index with pointers to each sub-plan.

---

## Why this shape

Adapted from `obra/superpowers` writing-plans skill (S152 evaluation), reshaped to GodWorld conventions:

- **Frontmatter + pointers** per [[SCHEMA]] §3 and §9 — their bare header replaced with our block.
- **Terminal field** — we route work by terminal; superpowers has no equivalent.
- **No Tech Stack line** — irrelevant; we're one stack.
- **No git worktree assumption** — not our flow.
- **Open Questions section** — matches how Mike actually works (plan surfaces unknowns, not just steps).

The discipline the superpowers skill enforces is the piece worth stealing: a plan that a fresh session can pick up and execute without reconstructing history. The shape above is the contract that makes that work in this repo.

---

## Changelog

- 2026-04-16 — Initial draft (S152). Template evaluated against `obra/superpowers` writing-plans skill. Approved structure-first by Mike before write. Added to [[index]] same commit.
