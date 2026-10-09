---
title: Plan, Research and Review Template
created: 2026-04-16
updated: 2026-10-08
type: reference
tags: [architecture, active]
sources:
  - docs/SCHEMA.md §3 (frontmatter), §11 (changelog)
  - builder 2026-10-07 — one template for plans, research and reviews
pointers:
  - "[[SCHEMA]] — frontmatter, naming, tag taxonomy"
  - "[[index]] — every new file registers here in the same commit"
  - "[[engine/ROLLOUT_PLAN]] — the tracker; its rows point at these files"
---

# Plan, Research and Review Template

One shape for every working doc. Plans live in `docs/plans/`, research and reviews in `docs/research/`. File name `YYYY-MM-DD-<topic>.md`. Copy the block for your type, fill it, register it in `docs/index.md` in the same commit.

## Rules

- **Headings exactly as written.** Scripts and searches key on them: `## Changelog` (auditPlanTagDrift, the 300-char changelog guard), `**Verdict:**` (docLoopStatus watch list). A renamed heading drops the doc out of those checks.
- **The builder's words are quoted, not summarised,** with the date. A summary of a ruling is how engine.277 shipped inverted.
- **One fact, one place.** A task's state lives in the Tasks table; what changed lives in a dated Changelog line (≤300 chars). Never restate status in prose.
- **Dates absolute, cycles as `C<N>`.** "Next fire" goes stale; "C111, Sun 2026-10-11" doesn't, and the rollout's overdue check reads it.
- **Reviews are reconciled in the plan, never folded away (builder 2026-10-08).** Every review a plan receives gets a row in `## Reviews reconciled` with a pointer to the full document, and every substantive item in it lands in exactly one of `### Agreed`, `### Needs proof` or `### New concepts`, each carrying a source pointer (`doc §section` or `doc:line`). An idea the plan author does not adopt still goes in New concepts, marked held; it is never dropped to keep the plan tidy. A rejected item says why, with evidence, in the review's own Disposition.
- **Existing docs are not rewritten to fit.** They take this shape on their next real edit.

## Plan

```markdown
---
title: <Topic> Plan
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: plan
tags: [<domain>, draft | active | done | parked]
sources:
  - <path / commit / research file this rests on>
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — <row id(s)>"
---

# <Topic> Plan

**Builder's words (YYYY-MM-DD):** "<verbatim>" — or "none; engineering call" if no ruling exists.

**Goal:** <one sentence: what done means>

**Rows:** <rollout id(s)> · **Owner:** engine-sheet | research-build

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | <one action, the files it touches, how it is verified> | es / rb / codex | not started · in progress · done `<commit>` · dropped (<why>) |

## Acceptance

1. <testable outcome> — proven by <bench run / live fire C<N> / readback>.

## Reviews reconciled

One row per review, read, or lane run that bears on this plan. The row points at the full document; the three tables below carry its items in structured form, so the plan reads short and the research behind it stays one click away.

| Review | Lane | Pointer | Result |
|---|---|---|---|
| <name> | rb / es / codex / agy / kimi / grok | [[<path>]] | SHIP · SHIP-WITH-FIXES · HOLD · read-only |

### Agreed

Both lanes hold it, or the builder ruled it, or one lane verified it in code and no lane contests it.

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | <the item, one line> | rb · codex · builder | <doc §section or doc:line, one per lane> |

### Needs proof

A claim one lane makes that has not been verified, or a lane disagreement. Each names the proof that would settle it.

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | <claim> | <lane> | <bench run / live fire C<N> / code read / data pull> | <pointer> |

### New concepts

An idea a review brought that the plan did not start with. Nothing a reviewer proposes is removed here; the Status column says what the plan did with it.

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | <concept> | <lane> · <pointer> | <one line> | adopted into Task <n> · held for builder · parked (<trigger>) |

## Open questions

- <question> — blocks Task <n>; for the builder or a lane. Resolved → delete it and log the answer.

## Changelog

- YYYY-MM-DD (<terminal>) — Created.
```

## Research (an outside source evaluated)

```markdown
---
title: <Source> — research
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: research
tags: [research, <domain>, active]
sources:
  - <exact path / URL / Drive-ID; "builder-shared YYYY-MM-DD" if he sent it>
---

# <Source> — research

**What this addresses:** <the corner of the sim that made us pull it>

**Extraction:** <each finding as principle → sim area it serves>

**Not applicable / hazard:** <what was set aside and why, so nobody re-reviews it>

**Verdict:** adopt | watch | take-nothing — <why, one sentence; for watch, the trigger that would make it adopt (it goes on BACKLOG §Watch List)>

**Ignited plans:** <[[../plans/...]] or none>

## Changelog

- YYYY-MM-DD (<terminal>) — Created.
```

## Review (a lane's check of a plan or a diff)

```markdown
---
title: <lane> review — <target>
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: review
tags: [review, <domain>]
sources:
  - <the plan section or commit range reviewed>
---

# <lane> review — <target>

**Target:** <plan §, commit range, or file list>

**Result:** SHIP | SHIP-WITH-FIXES | HOLD

## Findings

1. <claim> — <file:line evidence> — <severity>

## Disposition

<Filled by the Claude lane that acts on it: per finding, folded `<commit>` / rejected (<evidence>).>

**Reconciled in:** <[[../plans/...]] §Reviews reconciled — the plan row that points back at this review>
```

## Changelog

- 2026-10-08 (research-build) — Plan gains `## Reviews reconciled` (review pointers; Agreed / Needs proof / New concepts tables); Review gains a Reconciled-in pointer (builder: no reviewer idea minimised in a merged plan).
- 2026-10-07 (engine-sheet) — Plan, research and review merged into one short template (builder agreed); the how-to prose cut; the research Watch List moved to BACKLOG.
- 2026-04-16 — Initial plan template (S152).
