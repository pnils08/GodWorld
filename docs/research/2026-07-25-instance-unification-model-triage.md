---
title: Instance-unification / model-triage pivot — research
created: 2026-07-25
updated: 2026-07-25
type: reference
tags: [research, architecture, models, orchestration, active]
sources:
  - Mike-direct design conversation, S333 (2026-07-25) — no external source; internally-generated direction captured on Mike's "better served as a research.md" call
pointers:
  - "[[../engine/archive/ROLLOUT_PLAN]] — pending-state home (Watch List)"
  - "[[index]] — registered here, same commit"
  - "[[../MODEL_HIERARCHY]] — the doc this pivot would eventually rewrite; §8 subagent-cost rule was carved off this conversation and landed now"
---

# Instance-unification / model-triage pivot — research

**Source:** Mike-direct design conversation, S333 (2026-07-25). Grew out of the Kimi/Codex CLI review + the realization that any Anthropic-compatible endpoint (Kimi, DeepSeek, GLM, MiniMax) can back a Claude Code session via `ANTHROPIC_BASE_URL`.

**What this addresses:** whether the four-terminal apparatus (research-build / engine-sheet / civic / media — each with its own TERMINAL.md scaffolding, boot detection, per-terminal rules, ownership guards) should collapse into a single Mags-core identity where the axis of division is the **model**, not the **domain**.

**What it does:** the proposed shape — every instance boots the same Mags core (CLAUDE.md only, no TERMINAL.md layer); what differs per instance is the backing model (Fable / Opus / Sonnet / Kimi / DeepSeek / Gemini-guest / Codex-guest); work is triaged across instances by capability + cost + load rather than by pre-assigned domain. Base-URL wiring makes a non-Claude model (Kimi, DeepSeek) drive the full Claude Code harness — inheriting all skills/agents/MCP/hooks — instead of running as its own blind CLI.

**Extraction — what's usable:** *(principle → sim-area)*
- **Model-diversity is a more honest division axis than domain-diversity** → the current terminals conflate *what the work is* with *which instance does it*; model-strength triage separates them. (Reframes MODEL_HIERARCHY from "role slots" to "capability tiers + a routing rule.")
- **One Mags core, model as the variable** → kills TERMINAL.md scaffolding, boot-detection, per-terminal rules, cross-terminal ownership guards — the apparatus the S333 orientation audit was cataloging. Real boot-burn + maintenance reduction.
- **Kimi = decorrelated second-eyes reviewer** → outperforms Opus, different lab; its errors are decorrelated from Claude's, which is the whole value of a verify seat. Best fit: audit/verify for the top tier, not grunt (DeepSeek is cheaper for grunt) and not lead.
- **Subagent cost discipline** (already carved off + landed this session, MODEL_HIERARCHY §8) → the one immediately-actionable piece: leads fan out a tier down; subagents default-inherit the expensive parent model unless `model:` is overridden.
- **Mags-core = governing identity, NOT full character** → collapsing to "every instance is Mags" must preserve the core-vs-character seam; in-character DeepSeek writing engine code re-imports the persona-bleed the operational terminals strip on purpose.

**Not applicable / hazard:**
- **The terminals do invisible work the reframe must replace, not delete.** They provide (a) collision-prevention (parallel sessions not stacking conflicting commits) and (b) attention-scoping. "All instances follow the same work and triage" relocates that problem — it needs a real **dispatch layer** (shared work queue with claiming/locking), or you get exactly the cross-terminal git-stack collisions the current rules exist to prevent, now across 5–7 instances instead of 4. Today the coordinator is Mike's head + ROLLOUT + NEXT lines; the reframe makes coordination *harder*, not automatic.
- **Capability floor still binds.** Triage-by-cost can't route canon judgment / the Rhea gate / destructive-op reasoning to DeepSeek regardless of queue pressure. The hierarchy survives the redesign, just reframed.
- **Cross-model harness reliability is unproven.** Do the 52 skills / hooks / godworld MCP actually drive on a non-Claude brain, or are they tuned to Claude's quirks? DeepSeek/Haiku showed compose parity for *writing* (S326), but full harness-driving is a bigger, untested surface.
- **Control-plane security dissolves for base-URL instances.** A Kimi/DeepSeek-backed Claude Code session *is* a full Claude session with full control-plane access — the backup-CLI read-only isolation (MODEL_HIERARCHY §6) governs "the backup CLI," not a model wearing the harness. "Guest" (Gemini/Codex) needs pinning: own-CLI-contained-by-policy vs. base-URL-full-access.

**Verdict:** `watch`
- **Adopt-trigger:** either (a) parallel-instance count / coordination pain actually justifies building a dispatch layer, OR (b) a cheap one-session proving-run confirms the harness (skills/hooks/MCP) drives on a non-Claude brain (Kimi or DeepSeek base-URL'd as a Mags-core session on a real task). Attack (b) first — it's the load-bearing unknown, provable for the cost of one session vs. a full teardown. Until then the four-terminal apparatus stays; the only piece extracted-now is the subagent-cost rule (§8) + the live model map.

**Ignited plans:** none yet (watch-not-yet-fired). Subagent-cost rule + live terminal→model map landed directly into [[../MODEL_HIERARCHY]] §8 + §Live-map this session (not a separate plan).

---

## Applications (living)

- 2026-07-25 — carved the subagent-cost-discipline rule out of this direction and landed it live in MODEL_HIERARCHY §8 + the live terminal→model map; propagated to all four TERMINAL.md operating-discipline blocks.

---

## Changelog

- 2026-07-25 — Initial capture (S333). Mike-direct: park the full pivot as research (watch), extract only the subagent-cost rule + model map now.
