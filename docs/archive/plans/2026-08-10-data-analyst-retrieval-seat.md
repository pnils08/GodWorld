---
title: Data-Analyst Retrieval Seat — research.26 Close-Out Plan
created: 2026-08-10
updated: 2026-08-10
type: plan
tags: [research, infrastructure, media, retrieval, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md — row research.26
  - docs/research/2026-07-26-supermemory-retrieval-economics.md — the S334 measurement + adopt verdict
  - commit 794861f5 (2026-07-26, S334) — "Promote Elliot Marbury to the Tribune Data Desk and wire him"
  - commit 4138acd1 (2026-07-27, S338) — prior-arc evidence lane, MCP search projection, headless eval
  - .claude/agents/source-search/SKILL.md — the shipped seat
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registration PENDING (see Task 5 — file exceeds this lane's push path)"
---

# Data-Analyst Retrieval Seat — research.26 Close-Out Plan

**Goal:** Disposition research.26: verify the question-scoped retrieval seat as shipped satisfies the research's `adopt` verdict element-by-element, record the Rhea→Marbury attribution resolution in the living docs, and close the row.

**Architecture:** The seat research.26 asks to plan already shipped — same-day S334, commit `794861f5` — as `source-search`, attributed to **Elliot Marbury (POP-00166), Data Desk**, then hardened S338 (`4138acd1`: prior-arc wrapper-only lane, MCP projection, headless eval). The Rhea Morgan attribution the row carries was superseded by the research's own hazard ("collapsing them puts the verifier in the position of sourcing what it later verifies"), now encoded in the seat's SKILL ("She verifies what has been written; you source what is about to be"). This plan is therefore a close-out, not a build: a verdict map, a docs true-up, and a row flip.

**Terminal:** research-build (docs half executed by kimi 2026-08-10; `.claude/**` untouched — control-plane).

**Pointers:**
- Research basis: [[../research/2026-07-26-supermemory-retrieval-economics]] (measurement, economics, hazards, verdict)
- The seat: `.claude/agents/source-search/SKILL.md` (Marbury, Haiku, question-scoped, lane router)
- Sibling: [[2026-07-25-notebooklm-source-search-wiring]] Task 8 (deterministic projection / provenance filter / domain routing — the seat's plumbing)

**Acceptance criteria:**
1. Every element of the research's `adopt` verdict resolves to a shipped artifact or a recorded take-nothing (§Reconciliation), each with a passing verify command.
2. The research doc carries an Applications entry recording the supersession and the close-out.
3. Rollout row research.26 flips to `done-pending-archive`; research index verdict cell notes the close-out.
4. This plan registers in `docs/index.md` (droplet-side — Task 5).

---

## Reconciliation — verdict element → shipped artifact

| Verdict element (2026-07-26) | Resolution | Verify |
|---|---|---|
| Question-scoped seat (economic unit = the QUESTION; break-even ~5–6 searches/spawn) | `.claude/agents/source-search/SKILL.md`: "One dispatch = one question, not one query" + three-lane router (`794861f5`) | `grep -n "One dispatch = one question" .claude/agents/source-search/SKILL.md` |
| jq projection (68–75% scaffolding; free win, no model) | SKILL container-hygiene block carries the jq one-liner; `search_canon` MCP output projected (Task 8, `4138acd1`) | `grep -n "jq -r" .claude/agents/source-search/SKILL.md` |
| Container routing (`bay-tribune` clean; `wd-*` hold world state; `world-data` empty) | SKILL hygiene block line 23 ("`--tag world-data` returns nothing … the `wd-*` domain tags hold the data") + S334 corrections live in `rhea-morgan/IDENTITY.md` §Your Canon Sources | `grep -n "world-data" .claude/agents/source-search/SKILL.md` → line 23; `grep -c "wd-citizens" .claude/agents/rhea-morgan/IDENTITY.md` → 3 |
| Contaminant adjudication is judgment (the seat's real product) | SKILL: "Judge every hit by `metadata.source` / `metadata.title`. `--rerank` does not fix it; a higher `--threshold` just starves the set." | `grep -n "rerank" .claude/agents/source-search/SKILL.md` |
| Attribute, don't invent (role exists in canon) | Attributed to Elliot Marbury POP-00166, Data Desk — simultaneously solving his zero-routings-ever flag from the same research | `grep -n "POP-00166" .claude/agents/source-search/SKILL.md` |
| Don't dual-hat Rhea (verifier must not source what it verifies) | Rhea attribution SUPERSEDED; separation encoded in SKILL: "never source a claim you would then be verifying." Rhea keeps gate-side retrieval only | `grep -n "never source a claim" .claude/agents/source-search/SKILL.md` |
| Per-search cheap-model filter | Take-nothing, as measured (15–16k subagent floor vs 2.7k payload) — recorded, not built | research doc §Not applicable |
| `--filter` syntax sizing gate | Resolved 2026-07-27 (AND/OR wrapper; 20/20 `source=edition-ingest` proof) | research doc Changelog 2026-07-27 |
| Don't churn `source-search` | Honored — close-out is docs-only; the agent is untouched | this plan touches no `.claude/**` path |

**Residual gaps against the verdict: none found.** The row's lingering wording ("draft the implementation plan … attributed to Rhea Morgan") predates the same-day build; the attribution question is the only substantive delta and it resolves *toward* the research's hazards, not away from them.

---

## Tasks

### Task 1: Verdict map + residual-gap check (kimi)

- **Files:** this plan §Reconciliation — create
- **Steps:** map every verdict element to an artifact; run each verify command against a fresh main checkout; record any element that fails as a residual gap.
- **Verify:** all eight `grep` verifies above return matches on main @ `427130ad`.
- **Status:** [x] done (2026-08-10, kimi) — all eight pass; zero residual gaps.

### Task 2: Research doc living-record true-up (kimi)

- **Files:** `docs/research/2026-07-26-supermemory-retrieval-economics.md` — modify (Applications + Changelog only)
- **Steps:** append an Applications entry recording: seat shipped S334 as source-search/Marbury (`794861f5`, hardened `4138acd1`); Rhea attribution superseded by the separation-of-duties hazard; close-out plan pointer. Matching Changelog line.
- **Verify:** `grep -c "2026-08-10" docs/research/2026-07-26-supermemory-retrieval-economics.md` → 2.
- **Status:** [x] done (2026-08-10, kimi).

### Task 3: Research index verdict-cell amendment (kimi)

- **Files:** `docs/research/index.md` — modify (the 2026-07-26 row's verdict cell only)
- **Steps:** append the close-out disposition (shipped S334 attributed to Marbury; Rhea gate-side only) to the verdict cell. No other cell changes.
- **Verify:** `grep -c "CLOSED 2026-08-10" docs/research/index.md` → 1.
- **Status:** [x] done (2026-08-10, kimi).

### Task 4: Rollout row flip (kimi)

- **Files:** `docs/engine/ROLLOUT_PLAN.md` — modify (research.26 row only)
- **Steps:** research.26 → `done-pending-archive`, pointer to this plan; summary ≤280 chars per the row contract.
- **Verify:** `node scripts/docLoopStatus.js --lint` → clean.
- **Status:** [x] done (2026-08-10, kimi) — lint clean on the pushed tree.

### Task 5: docs/index.md registration (droplet-side kimi CLI or Mike)

- **Files:** `docs/index.md` — modify (plans section bullet + changelog line)
- **Steps:** register this plan per the plan-file contract ("every new plan file must register here in the same commit"). The file is ~188KB — beyond what this lane's GitHub-MCP push path can safely transcribe; historical index registrations for kimi plans ran droplet-side (e.g. S361 engine.102, pipeline.53). Suggested bullet: `- **[[plans/2026-08-10-data-analyst-retrieval-seat]]** — research.26 close-out (kimi). The question-scoped Supermemory seat shipped S334 as source-search attributed to Elliot Marbury (794861f5, hardened 4138acd1 S338); the Rhea attribution was superseded by the research's own separation-of-duties hazard. Verdict map, docs true-up, row flip — zero residual gaps. *(plan, research, infrastructure, media, active)*`
- **Verify:** `grep -c "2026-08-10-data-analyst-retrieval-seat" docs/index.md` → ≥2 (bullet + changelog).
- **Status:** [ ] blocked on push path — droplet-side owner, one edit.

---

## Open questions

- [x] Rhea's IDENTITY still titles her "Copy Chief and Data Analyst" with the per-container sourcing toolkit — retitle? — **Non-blocking, control-plane owner's call.** Her toolkit now serves gate-side verification (the S334-corrected container hygiene is current and accurate); the sourcing seat is Marbury's. No doc truth is wrong today; a retitle is cosmetics, not correctness.

## Changelog

- 2026-08-10 (kimi) — Initial draft + close-out executed same session (Tasks 1–4). Found the row's premise superseded by the same-day S334 build (`794861f5`); plan shaped as close-out rather than build. Task 5 (index registration) parked for the droplet-side push path.
