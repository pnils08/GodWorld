---
title: /desk-dispatch mechanism — research
created: 2026-07-05
updated: 2026-07-05
type: reference
tags: [research, media, write-edition, dispatch, active]
sources:
  - Mike-direct S291 (verbatim): "desk-dispatch is just deep-dispatch that worked in the test, the deep-dispatch infer relationship to dispatch however there is none so we are creating a new skill to mimic deep-dispatch to enhance for the new process"
  - .claude/skills/deep-dispatch/SKILL.md (v0.1, S274/S289) — the mechanism this would mimic
  - .claude/skills/dispatch/SKILL.md (v1.2) — verified unrelated (immersive scene-piece skill; deep-dispatch's own `related_skills: [write-edition, sift]` confirms no real lineage to `dispatch`)
  - docs/adr/0012-autonomous-deep-dispatch-write-edition.md — S272 floor proofs (sports Tier-1 A-grade; civic best-civic-ever/#2) — the evidence deep-dispatch's mechanism works
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — research.20"
  - "[[index]] — register here, same commit"
---

# /desk-dispatch mechanism — research

**Source:** Mike-direct correction, this session — the prior session's `/sift-dispatch` direction (forking off `/sift`'s input layer) was replaced with: a new skill mimics `/deep-dispatch`'s already-proven mechanism instead. No prior plan or research doc ever captured this correction durably (checked disk, git history, claude-mem, and the `sl-research-build` Supermemory container — none had it).

**What this addresses:** Whether `/deep-dispatch`'s proven write mechanism can be reused as the base for the still-undesigned all-storylines/format-tagged/write-gated/staggered-desks process, and what is and isn't settled about that reuse.

**What it does:** `/deep-dispatch` (v0.1) already proved its core mechanism works — two S272 floor tests graded A (sports Tier-1; civic, which independently surfaced the C100 Coliseum crime-spike/sentiment anomaly the live pipeline had suppressed). That mechanism: orchestrator builds a charge-brief (project+beat+cycle+canon-map-as-pointers), spawns ≤3 bounded source-search subagents, reconciles returns, hands assembled sourcing to a desk writer that only writes (no `Agent` grant), writes to a per-desk store.

**Extraction — what's usable:**
- **Reuse the proven mechanism, don't rebuild it.** `/deep-dispatch`'s orchestrator/desk-writer split is validated; a successor skill should copy it rather than design sourcing/writing from scratch.
- **Naming: `/deep-dispatch` has no real relationship to `/dispatch`.** `/dispatch` (v1.2) is an unrelated immersive scene-piece skill; `/deep-dispatch`'s own frontmatter lists `related_skills: [write-edition, sift]`, not `dispatch`. A successor skill should be named to avoid repeating that misleading inference — not a rename of anything, a fresh name.
- **What's new, not yet built:** assigning a format tag (feature/interview/dispatch) to every candidate storyline for a cycle, a write-gate deciding which get written, and staggered (not all-parallel) desk execution.

**Not applicable / hazard — genuinely unresolved, not decided:**
- **Input source for candidate generation is not confirmed.** `/sift` Steps 1-4 already produce a canon-verified, three-layer-threaded candidate list, proven at C94-C100 — a plausible reuse target — but Mike has not confirmed this is the intended input for the new mechanism.
- **Write-gate test is not confirmed.** The superseded `/sift-dispatch` plan proposed a "why this story now" test; whether that carries forward to the deep-dispatch-mimic model is unconfirmed.
- **Staggering mechanics are not confirmed.** What "staggered" means operationally (sequential order, priority-ranked, time-boxed) has not been specified.

**Verdict:** `adopt` — the mechanism-reuse direction (mimic `/deep-dispatch`) is settled per Mike-direct correction. But the three items above are open, not decided, and a build plan should not present them as settled. No plan doc exists yet.

**Ignited plans:** none yet. A plan doc follows once input source, write-gate test, and staggering mechanics are confirmed with Mike — not before.

---

## Applications (living)

- 2026-07-05 — Filed to replace a plan doc (`docs/plans/2026-07-05-desk-dispatch-skill.md`, deleted) that had presented these same open items as settled — this file corrects that by keeping them as open questions, research-stage, not a plan.

---

## Changelog

- 2026-07-05 — Initial filing (S291, research-build), re-typed from a mis-filed plan doc per Mike-direct correction: this is research (what's true, what's open), not a plan (what's decided, tasked out).
