---
title: Anthropic "how we use skills" blog — research
created: 2026-06-05
updated: 2026-06-05
type: reference
tags: [research, infrastructure, skills, context-engineering, active]
sources:
  - "https://claude.com/blog/lessons-from-building-claude-code-how-we-use-skills — Anthropic, *Lessons from building Claude Code: how we use skills*. Mike-shared S252."
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
  - "[[2026-06-04-boot-orientation-cleanup]] — the boot research this corroborates"
---

# Anthropic "how we use skills" blog — research

**Source:** Anthropic, *Lessons from building Claude Code: how we use skills*, claude.com/blog. Mike-shared S252. Anthropic's internal account of how they structure and use Skills.

**What this addresses:** Tonight's boot/context-architecture work ([[2026-06-04-boot-orientation-cleanup]]) — does Anthropic's own skills guidance confirm or correct our conclusions, and where are we falling short of it?

**What it does (source mechanism):** Skills are folders (instructions + scripts + resources + data), discovered via a **description-trigger** and read **progressively**. Not "just markdown." The model invokes a skill when its description matches the task, then reads the skill's referenced files on demand.

**Extraction — what's usable (principle → sim-area):**
- **Gotchas are the highest-signal content** — *"The highest-signal content in any skill is the Gotchas section."* Institute a Gotchas section in our skills, built iteratively from real failure points (field mismatches, edge cases, state inconsistencies the model actually hits). **The biggest thing the post supports that we don't do.**
- **Gotchas + memory live INSIDE the skill, not in a global file** — each skill carries its own gotchas section + its own append-only logs/JSON (`${CLAUDE_PLUGIN_DATA}`). Skill-local context loads only when the skill triggers. Contrast: our global MEMORY.md is always-around. Push skill-specific gotchas/memory into the relevant skill; keep only truly cross-cutting content (identity, feedback) in the governing core.
- **Progressive disclosure works when triggered** — *"tell Claude what files are in your skill, and it will read them at appropriate times."* Corrects tonight's too-absolute "pointers fail": passive boot-pointers fail, but pointers inside a **triggered** skill get read. The trigger is the **description**. Validates the boot design (boot clean → `/session-startup` trigger → terminal files on demand).
- **Don't state the obvious** — *"focus on information pushing Claude out of its normal way of thinking."* Every instruction line must move the model off its training default or it's pure token cost. Test case: "engine-sheet is a senior engineer" fails (Claude codes by default) → strip it. Gotchas pass.
- **Don't over-specify** — *"give Claude the information it needs, but give it the flexibility to adapt."* Matches "shape emerges in rollout"; rigid over-planning kills reuse.
- **Descriptions are triggers, not summaries** — write the skill description for model discovery (activation keywords), not human reading. This is the reliability lever for "make the model actually load X."
- **Scripts over reinvention** — deterministic helpers so the model composes instead of reconstructing boilerplate (matches "deterministic gates survive; compliance-prose is dead").
- **Reduce baseline context bloat** — large teams curate which skills install; for us the default plugin + built-in skill load is baseline cost worth auditing (`/context-budget`).

**Not applicable / hazard:**
- Don't dump cross-cutting identity/feedback into skills — skill-local is for skill-specific gotchas/memory; the governing core (CLAUDE.md) holds the always-true.
- `${CLAUDE_PLUGIN_DATA}`-style skill-local persistence is a plugin mechanism; adopting it for GodWorld skills is an infra task, not free.

**Verdict:** `adopt`. Adopt-actions (Mike-directed S252): (1) institute a **Gotchas section** in skills — the biggest gap; (2) **CLAUDE.md without pointers**, gotchas-shaped, carrying the governing core — top priority (see boot md); (3) **strip don't-state-the-obvious framing** (e.g. engine-sheet "senior engineer"); (4) push skill-specific gotchas/memory into the skill, not global MEMORY.md. Implementation = Mike's rollout; shape emerges in the doing (no pre-written plan).

**Ignited plans:** none yet (rolls out via the boot work — [[2026-06-04-boot-orientation-cleanup]]).

---

## Applications (living)

- 2026-06-05 — Initial extraction (S252).

---

## Changelog

- 2026-06-05 — Initial extraction (S252, media). Mike-shared source; corroborates + sharpens the boot-orientation research; surfaces Gotchas as the biggest unimplemented pattern.
