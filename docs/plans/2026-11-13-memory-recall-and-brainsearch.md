---
title: Memory Recall and brainSearch Plan
created: 2026-11-13
updated: 2026-11-13
type: plan
tags: [infrastructure, done]
sources:
  - f8feaf9d2, 354d6fe79 (scripts/supermemory-patch/recall-directive.patch)
  - 8bd4b1f01, 1fd52ea11 (scripts/brainSearch.js)
  - docs/for-claude-review/2026-11-13-codex-recall-patch-brainsearch-review.md
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — governance.61"
  - "[[../index]] — registered same commit"
---

# Memory Recall and brainSearch Plan

**Builder's words (2026-11-13):** "Fix it" (recall ranking) · "Go on your build" (brainSearch) · "Ok" (fixing both codex findings) · "1 yes" (a row for the memory work, opened after the build).

**Goal:** per-message recall puts recent relevant saves first, and one lookup answers across memory, the live sheet and open work.

**Rows:** governance.61 · **Owner:** research-build

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Recall patch: hand-written saves rank by similarity plus recency, non-rule hits need the 0.66 floor, cap 6 — `scripts/supermemory-patch/recall-directive.patch` | rb | done `f8feaf9d2` |
| 2 | brainSearch: one query across memory, the live sheet (feed, roster, ledger) and open rollout rows — `scripts/brainSearch.js` | rb | done `8bd4b1f01` |
| 3 | Codex finding: a non-rule hit with missing or non-finite similarity passed the floor — require a finite similarity | codex | done `354d6fe79` |
| 4 | Codex finding: a sheet tab that lost a column went quiet — name the missing column, keep searching the other tabs | rb | done `1fd52ea11` |

## Acceptance

1. A non-rule recall hit without a finite similarity at or above 0.66 is dropped — proven by the patch applying clean and the live hook copy matching it byte for byte (`cmp`, 2026-11-13).
2. A tab missing a required column prints a line naming it — proven offline with a stand-in sheet (all columns, feed without NamesUsed, ledger without Tier) and read-only against the live sheet (2026-11-13).

## Reviews reconciled

| Review | Verdict | Finding | Outcome |
|--------|---------|---------|---------|
| `docs/for-claude-review/2026-11-13-codex-recall-patch-brainsearch-review.md` | recall patch HOLD · brainSearch SHIP-WITH-FIXES | floor bypass on missing similarity; silent column loss | both folded (Tasks 3, 4). No re-review: reviews are advice, not a gate (builder 2026-11-13) |

## Changelog

- 2026-11-13 (research-build) — Plan written after the build on the builder's "1 yes"; all four tasks done, both codex findings folded. Not pushed: the push is engine-sheet's (builder: "leave the push for es").
