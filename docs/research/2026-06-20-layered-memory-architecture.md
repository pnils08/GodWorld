---
title: OpenAI E98 feedback — layered memory architecture — research
created: 2026-06-20
updated: 2026-06-20
type: reference
tags: [research, architecture, infrastructure, memory, active]
sources:
  - "Drive 1n5fUak76Bdnj7a1yoqx9QSGo66IAJl_b — 'OpenAI_feedback 98.txt' (owner Mike, Mike-shared S264 via the C98 write-edition gap log)"
  - "output/production_log_run_cycle_c98_gaps.md §LEG /write-edition — G-W architecture-input entry (the gap-log extraction this file deepens)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (research.17)"
  - "[[index]] — register here, same commit"
  - "[[../plans/2026-05-31-autonomy-roadmap]] — research.12 umbrella this assesses against"
  - "[[../SUPERMEMORY]] — the container architecture much of Tier-3 may already map to"
---

# OpenAI E98 feedback — layered memory architecture — research

**Source:** Drive `1n5fUak76Bdnj7a1yoqx9QSGo66IAJl_b` — "OpenAI_feedback 98.txt", a reader-reaction to Edition 98 (owner Mike, Mike-shared S264). Surfaced through the C98 write-edition gap log as an `architecture-input` route to research-build.

**What this addresses:** the standing token-burn concern (boot-burn / session-discipline lever, [[feedback_token-burn-hierarchy]]) reframed from a cost problem into an **editorial** one. Pulled deliberately by Mike — his shared sources are load-bearing ([[user_research-behavior]]), and this one is empirically anchored to a graded edition, not a hypothetical.

**What it does:** argues that GodWorld stores a large volume of **high-administrative-value / low-narrative-value** data — permit status, authorization chains, committee votes, application counts, implementation schedules — that is useful *in-cycle* but near-worthless ~20 cycles later, and that this is where much of the token burn hides. It proposes a three-tier memory model keyed on **narrative salience, not recency**: (1) **Permanent Canon** — never forget (Paulson dynasty, championships, Baylight, Oaks creation, major character bios, major institutional changes); (2) **Story Memory** — keep until resolved (Paulson/Oaks, Kelley FA, expansion draft, Baylight phases); (3) **Historical Archive** — queryable but NOT injected (health-center permits, stabilization-fund metrics, transit contract details, committee votes). The eviction criterion is *will anyone in Edition 130 remember this* — a tiny fact ("Rivas returned and looked dominant") can matter 50 editions later, while a whole committee structure is dead in 20.

**Extraction — what's usable:**
- **Tier by narrative-salience, not age → the boot/cycle injection filter.** The lever is what gets *injected* at boot + cycle-time, not what gets *stored* (storage is cheap; injection is the burn). A salience tier on each memory governs injection eligibility. Directly serves the boot-burn hierarchy ([[feedback_token-burn-hierarchy]]) — it's the structural version of "session discipline."
- **Tier-3 "queryable but not injected" ≈ the existing Supermemory-by-ID retrieval pattern.** Much of the Archive tier may already exist: `world-data` (843+ entity cards), `bay-tribune` (canon query layer) are *queried on demand*, not boot-injected ([[../SUPERMEMORY]]). So Tier-3 is partially built — the gap is *routing* admin-mechanics there instead of into edition/boot context.
- **Tier-1 Permanent Canon ≈ `docs/canon/` + Sim_Ledger Tier-1 protection.** CANON_RULES + INSTITUTIONS + the dynasty/championship canon are already the never-forget layer. Partially built.
- **The auto-promotion rule is the unsolved core → the new design work.** Source: an Archive item promotes to Story/Permanent *only if it later produces a major character or major event* ("unless that center later produces a major character… the simulation doesn't live there, the archive does"). That tier-1/tier-2 boundary + the promotion trigger is the genuinely-new build; the tiers themselves mostly exist.
- **Demand-side cut that pairs with chaos-cars as the supply side → [[../plans/2026-05-07-chaos-cars-engine]] (engine.11).** Chaos-cars manufactures compounding drama (who busts / breaks out / did Varek deliver) so the Story tier has signal worth keeping; memory-layering stops injecting Archive noise. Two halves of one move (Mike, S264).
- **Empirical anchor — the tiers describe what the reviewer already grades.** Mara graded E98 **A-**; the single ding was the OARI/Q1 cost figures (2,411 calls) — precisely the Archive layer leaking onto the page — while the A pieces (Rivas, Oaks draft, Quintero) are Story/Permanent. The doctrine isn't aspirational; it's a restatement of the result-validity rubric already in force.

**Not applicable / hazard:**
- **Storage ≠ injection — don't conflate them.** The win is an injection/visibility filter, NOT deletion. "Queryable but not injected" is explicitly non-destructive; the Archive stays whole and addressable. Demoting must never delete — that would violate [[feedback_self-preservation-rule-1]] (memory protection) and would drop the permit that later spawns a character.
- **High blast radius — not a quick build.** Touches Supermemory containers + the boot-injection path + the edition pipeline + engine ledgers. This is a design-session-sized effort, not a tail-end task (agreed with Mike S265).
- **Don't redo the container audit.** [[../SUPERMEMORY]] + infrastructure.5 already mapped what each container holds and whether it's load-bearing; this builds on that map, it doesn't re-litigate it.
- **Salience is a judgment call the engine can't fully make.** What counts as "narrative-worthy" is exactly the editorial judgment the sim exists to exercise; a naive heuristic (age, domain) will mis-tier. The promotion trigger ("later produced a major character/event") is retrospective — it needs a back-reference mechanism, not a forward classifier.

**Verdict:** `adopt` — the principle is sound, empirically anchored to a graded edition, and partially built already (Tiers 1 and 3 map onto existing canon + Supermemory layers). Adoption ignites a **design plan** (not yet written) whose real scope is the Tier-1/Tier-2 boundary + the retrospective auto-promotion mechanism + the injection-filter seam — assessed against research.12 (autonomy roadmap: Layer-1 engine-continuous life is what *generates* Story-tier candidates) and engine.11 (chaos-cars supply side). Filed as a `ready` research.17 ROLLOUT row; the design session is Mike-gated (he flagged it deserves dedicated time).

**Ignited plans:** none yet — design plan pending the dedicated session (research.17 `ready` row holds the pointer).

---

## Applications (living)

- 2026-06-20 — Initial extraction (S265). Split out of the C98 gap-log triage ([[../archive/plans/2026-06-20-c98-gap-log-triage]] §Strategic Input) per GAP_LOG_TRIAGE_PLAYBOOK anti-pattern #5 (surface strategic items, don't jam them into the two-track fix model).

---

## Status log

### research.17 — status (drained from ROLLOUT, 2026-06-26 / S274)

Layered memory architecture (OpenAI E98 feedback, Mike-shared S264) — **token-burn IS an editorial problem.** Tier memory by narrative-salience not recency: Permanent Canon (never forget) / Story Memory (keep-until-resolved) / Historical Archive (queryable-not-injected). Lever = the boot/cycle **injection filter**, NOT deletion (non-destructive; Archive stays whole). Tiers 1+3 partially exist (`docs/canon/` + Supermemory by-ID retrieval — world-data/bay-tribune are queried not injected); **new design work = the Tier-1/Tier-2 boundary + the retrospective auto-promotion mechanism** (Archive item promotes only when it later spawns a major character/event). Chaos-cars (engine.11) = the supply side of Story memory; layering = the demand-side cut. Empirically anchored: Mara graded E98 A-, the one ding (OARI cost figures) = Archive leaking onto the page. Assess against research.12 (autonomy Layer-1 generates Story candidates) + [[../SUPERMEMORY]] (don't redo infrastructure.5 container audit). **Phase 1 BANKED (S265, Mike):** the cheap injection cut — a category-level Archive-domain rule at `/sift` Step-5 + `buildWorldSummary.js` gating — split out as a ready-to-execute plan (both points built in research-build; media downstream user only). **Phase 2 DESIGNED (S265, Mike proceed):** design-plan-with-gates + ADR-0011 written — per-item `salienceTier` metadata + a lineage **origin-stamp** in the **maintenance layer** (bay-tribune wiki + ledger row), NOT a new engine stream (settled by engine.35 engine-EMERGES/Supermemory-MAINTAINS division of labor; advisor-flagged near-reinvention). Split on timing axis: origin-stamp schema = irreversible/get-right-now; **stamp instrumentation gated on C99** (chaos-cars adds the entity-creation paths); **promotion sweep deferred** until a major-event signal is live. Boundary: context-injection salience ≠ TAG_REGISTRY 8-slot citizen layer; non-destructive. **Open this session:** fill §Origin-Stamp Schema (creation-path audit) + §Promotion Walk in the P2 plan. Verdict `adopt`. **P2 BUILD HANDOFF FILED S270** — §Build Handoff in the P2 plan is the engine-sheet execution spec (ledger `originStamp` column + live-path stamping + chaos-event path); **GATED on C100 chaos smoke** (same gate as engine rows 22/24/25). Promotion sweep + bt-wiki mirror carved out (signal-gated / infra follow-up).

## Changelog

- 2026-06-20 — Initial extraction (S265, research-build). Source read in full from Drive; assessed against SUPERMEMORY container architecture + research.12 + engine.11. Verdict adopt → research.17 ready row.
