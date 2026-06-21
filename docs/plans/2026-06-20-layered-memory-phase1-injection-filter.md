---
title: Layered Memory Phase 1 — Injection Filter Plan
created: 2026-06-20
updated: 2026-06-20
type: plan
tags: [architecture, media, engine, memory, token-budget, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md — research.17 row
  - "[[../research/2026-06-20-layered-memory-architecture]] — verdict adopt; this is the Phase-1 ignited plan"
  - "output/production_log_run_cycle_c98_gaps.md §G-R3 + §G-W architecture-input — the E98 OARI leak this fixes"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (research.17)"
  - "[[../research/2026-06-20-layered-memory-architecture]] — research basis"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
  - "[[../media/sift_triage_vocabulary]] — the rubric Task 1 extends"
  - "[[../plans/2026-05-07-chaos-cars-engine]] — engine.11, the supply side; buildWorldSummary co-edit (T5.2)"
---

# Layered Memory Phase 1 — Injection Filter Plan

**Goal:** Stop high-administrative-value / low-narrative-value data (cost figures, call/permit/application counts, committee vote tallies, authorization chains, implementation schedules, fund metrics) from being elevated into the edition page or cycle context — by a **category-level salience rule**, non-destructively (the data stays whole and query-only). Done = the C98 OARI cost-figure class routes to supplemental/query, not the main page.

**Architecture:** A category-level **Archive-domain rule** added at the two cycle-injection enforcement points. No per-item tags in Phase 1 — the rule keys on data *domain*, not a stored tier. (1) `/sift` triage gains a salience criterion that defaults admin-mechanics domains to `defer-to-supplemental` / `suppress` unless bound to a Story-tier outcome — sift already owns the verbs (`sift_triage_vocabulary.md`); it lacks the rule. (2) `buildWorldSummary.js` keeps admin figures in the query-only `engine_audit` JSON rather than foregrounding them in the cycle summary. Both points are **designed and built in research-build** — the sift rubric is a skill/contract-doc rule change (a build), not execution; media merely *runs* the updated `/sift`.

**Terminal:** research-build (design + build both points). Media is downstream user only — no handoff, no media build.

**Pointers:**
- Research basis: [[../research/2026-06-20-layered-memory-architecture]] (verdict `adopt`, Tiers 1+3 partially exist; Phase 1 = the demand-side injection cut)
- Empirical anchor: `output/production_log_run_cycle_c98_gaps.md` — OARI emitted the cycle's richest operational work incl. cost-figure correction $420→$2,807 / 2,411 calls; those figures reached the page and were the single ding on Mara's E98 A- grade. The A-pieces (Rivas, Oaks draft, Quintero) are Story/Permanent and must be untouched.
- Related: [[../plans/2026-05-07-chaos-cars-engine]] — Task 2 co-edits `buildWorldSummary.js`, same file as chaos-cars T5.2 (`## Chaos Events` emitter); sequence to avoid a collision.

**Deferred to Phase 2 (NOT in scope here):** the **per-item salience tier** + **retrospective auto-promotion** (an Archive item promotes to Story/Permanent only when it later spawns a major character/event — a lineage back-reference, not a forward classifier). Phase 1's category rule needs no per-item tags; **Phase 2 cannot exist without them, so Phase 2 will retrofit tags onto existing memories.** Accepted cost of banking the cheap win first (Mike, S265) — flagged, not hidden.

**Two boundary cautions (carry into Phase 2):**
- This salience tier governs **context injection** (boot / cycle / edition). It is **NOT** the `TAG_REGISTRY` (engine.31) 8-slot **citizen-memory** layer. Separate layers — do not merge them. A future session conflating the two is the named failure mode.
- "Queryable but not injected" is **non-destructive** ([[../research/2026-06-20-layered-memory-architecture]] §hazard). Demoting a domain must never delete it — the Archive stays whole and addressable (the permit that later spawns a character must survive). Honors [[feedback_self-preservation-rule-1]].

**Acceptance criteria:**
1. Re-running the C98 OARI material through the updated `/sift` rule routes the cost figures / call counts to `defer-to-supplemental` or `suppress`; the vote *result* (INIT-007 9-0) and character/institutional outcomes stay promotable.
2. The A-pieces (Rivas, Oaks draft, Quintero) are unaffected by the rule — no false suppression of Story/Permanent material.
3. `buildWorldSummary.js` cycle summary no longer foregrounds raw admin figures that exist in `engine_audit_c{XX}.json`; a regression test asserts the gated fields are absent from the summary body and present in the source JSON.
4. The Archive-domain list is documented once, in `sift_triage_vocabulary.md`, and referenced (not duplicated) by the buildWorldSummary gate.

---

## Tasks

### Task 1: Define the Archive-domain list + sift salience criterion

- **Files:**
  - `docs/media/sift_triage_vocabulary.md` — modify (add salience criterion to Step 5)
- **Steps:**
  1. Add an **Archive-domain list** subsection: operational cost figures, call counts, application/permit counts, committee vote *tallies* (the vote mechanics — NOT the result), authorization chains, implementation schedules / phase dates, fund disbursement metrics, contract line-item detail.
  2. Add the salience rule to Step 5: a piece whose payload is primarily Archive-domain defaults to `defer-to-supplemental(target=wiki)` or `suppress`, **unless** it is bound to a Story/Permanent outcome (a named character's arc, an institutional creation, a championship/dynasty beat) — in which case the *outcome* promotes and the figures stay as query-only backing.
  3. Add one worked example using the real C98 OARI material: figures → supplemental; INIT-007 9-0 result + any character impact → promotable.
- **Verify:** the worked example in-file demonstrates the OARI cost figures routing away from the main page while the result stays promotable; criterion 1 + 2 satisfied on inspection.
- **Status:** [ ] not started

### Task 2: Gate admin figures in buildWorldSummary

- **Files:**
  - `scripts/buildWorldSummary.js` — modify
  - test (co-located with existing buildWorldSummary tests) — modify/add
- **Steps:**
  1. Identify the emitted sections that foreground raw admin figures (ratings/council/pattern sections that surface counts/cost/schedule fields directly). Keep the *signal* (a pattern fired, an approval shifted); drop the raw Archive-domain numerics from the summary body — they remain in `engine_audit_c{XX}.json`, which is query-only.
  2. Reference the Archive-domain list from Task 1 (do not re-enumerate it here — single source in `sift_triage_vocabulary.md`).
  3. **Sequencing:** this file also receives chaos-cars T5.2 (`## Chaos Events` emitter). Land whichever ships first, rebase the second onto it — do not edit in parallel branches.
- **Verify:** `node <buildWorldSummary test>` → gated fields absent from summary body, present in source JSON (criterion 3).
- **Status:** [ ] not started

---

## Open questions

- [ ] None blocking. Phase-2 design questions (per-item tag schema, lineage back-reference, promotion trigger) are out of scope and live in the research.17 row, not here.

---

## Changelog

- 2026-06-20 — Initial draft (S265, research-build). Banks the cheap injection-filter cut; Phase 2 (per-item tier + retrospective promotion) deferred per Mike S265. Both enforcement points built in research-build — media is downstream user, no build (S264 media-executes-never-builds).
