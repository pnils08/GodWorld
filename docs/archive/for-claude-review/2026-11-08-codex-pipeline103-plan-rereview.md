---
title: Pipeline 103 notebook search scope plan fold re-review
created: 2026-11-08
updated: 2026-11-08
type: reference
tags: [media, review, active]
sources:
  - docs/plans/2026-11-07-notebook-search-scope.md at f2f407b94
  - docs/for-claude-review/2026-11-08-codex-pipeline103-plan-review.md
  - output/engine-sheet/2026-11-08-codex-p103-plan-rereview-brief.md
pointers:
  - "[[../plans/2026-11-07-notebook-search-scope]] — folded plan"
---

# Pipeline.103 plan fold re-review

**Verdict: HOLD.** F2–F4 are closed at the plan level. F1's scope decision is settled by `ff437d6fb`, but the proposed Task 4 leaves active callers promising a published-only result from a whole-notebook search. This is a review of `7f44729c9..f2f407b94`, not a build review.

| Prior finding | Fold disposition |
|---|---|
| F1 — scope contract | **Partial.** The builder's whole-notebook ruling is explicit, and the wrapper already copies every inventory ID into both classes (`docs/plans/2026-11-07-notebook-search-scope.md:74,77`; `scripts/notebooklmCanonSearch.js:103-120`). Task 4 names only `.claude/agents/source-search/SKILL.md:35` (`docs/plans/2026-11-07-notebook-search-scope.md:92`). |
| F2 — non-ready source | **Closed in plan.** Default scope fails on any non-ready source; explicit IDs fail if requested ID is absent or non-ready, before a query (`docs/plans/2026-11-07-notebook-search-scope.md:78,99`). |
| F3 — listing failure | **Closed in plan.** The whole list gets an ID/title/status/uniqueness check and `source_list` begins before spawn and parse; Acceptance 4 demands zero query calls and a classified log event (`docs/plans/2026-11-07-notebook-search-scope.md:75-79,99`). |
| F4 — reader map | **Closed.** It now names the daily whole-notebook fallback and interactive MCP reader (`docs/plans/2026-11-07-notebook-search-scope.md:43-44`). |

**Remaining F1 failure:** a ready lore or stat-card source is eligible for default search, yet the agent still says the reviewed policy admits a *prior-arc* claim and emits `[prior-published]` (`.claude/agents/source-search/SKILL.md:33-37,67-72`). `/deep-dispatch` and `/city-hall-prep` still promise a default published scope (`.claude/skills/deep-dispatch/SKILL.md:74`; `.claude/skills/city-hall-prep/SKILL.md:131`); `/sift` calls all NotebookLM output prior-published evidence (`.claude/skills/sift/SKILL.md:88`). Input: the wrapper cites a non-publication source; output: a caller can carry its excerpt into a prior-publication arc with the wrong provenance. Expand Task 4 to reconcile those caller and return contracts, including the `--source-class canon-reference` instructions, or state a separate publication-specific gate. One agent line does not settle F1.

**No new wrapper flaw found in the fold.** The local metadata log has two verified 196-ID calls (33.4 s and 41.3 s) and two 196-ID citation failures; this supports command size, not the candidate query. Acceptance 3 correctly retains one live query on the exact candidate (`docs/plans/2026-11-07-notebook-search-scope.md:98`). No code, tests, NotebookLM call, Sheet read, or deployment was run for this re-review.
