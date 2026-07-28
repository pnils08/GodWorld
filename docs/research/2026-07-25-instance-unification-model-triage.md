---
title: Instance-unification / model-triage pivot — research
created: 2026-07-25
updated: 2026-07-27
type: reference
tags: [research, architecture, models, orchestration, active]
sources:
  - Mike-direct design conversation, S333 (2026-07-25) — no external source; internally-generated direction captured on Mike's "better served as a research.md" call
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (Watch List)"
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

**Direction refined S335 (Mike-direct, verbatim substance).** The pivot's destination is now stated more concretely than the original capture had it:

- **The project has moved away from heavy boots and forced prompts that make an instance fit a role.** Models are strong enough to handle complex work without being costumed into one. So the division axis is **model alignment to work type**, not terminal identity — terminals become triage of effort, not personas.
- **Save sessions by WORK TYPE, not terminal.** "Sheet work is a saved session." A session becomes a work-type container that any terminal can pick up, rather than a terminal owning a lane.
- **Reduce front-loaded boot further.** Boot cost buys less than it used to now that role-conditioning is not the point.
- **Behaviour is more prompt than memory.** Ten months of evidence: MDs do not solve issues automatically. Hooks force behaviour; documents do not.
- **Tool use is the management surface** — what the instance actually runs, not what it has read.
- **Consolidate MDs that cover the same data.** 489 active MDs, and the corpus duplicates itself.

**One sharpening, measured S335 — injection only works when it is specific and actionable.** The evidence cuts both ways on "behaviour is prompt not memory". The `UserPromptSubmit` hook injected a supermemory-recall reminder on every single turn of a ~40-turn session and produced approximately zero behaviour change; it asks the instance to *consider whether* to recall, which is a decision, not an instruction. By contrast the `SessionStart` `<godworld-state>` block — PIN, terminal roster, NEXT line — shaped behaviour every turn it mattered, because it delivers *specific facts* rather than a reminder to think about something. **So the rule is not "prompts beat memory"; it is "specific injected facts beat both generic prompts and passive documents."** A topic-inventory hook (paths only, grepped live) is the specific-fact shape. A "remember to check the docs" reminder is the shape that already demonstrably fails.

**Boot cost measured, and the visitor experiment that exposed it (S335).** Mike added Codex and Kimi to the workflow. They receive **no boot process at all** — one on-demand file, `AGENTS.md` — and work the project without issue. That is a natural experiment, and the numbers are lopsided:

| | Delivery | Cost |
|---|---|---|
| Codex / Kimi | `AGENTS.md`, read on demand | **~6.3k tokens** |
| Mags at boot | CLAUDE.md + identity.md + MEMORY.md + research-build.md + SCHEMA.md + **index.md** + TERMINAL.md, all injected | **~59.6k tokens** |

Nine times the context, and worse results on the one thing that mattered in S335: knowing what already exists. `docs/index.md` alone is **~40k tokens — two-thirds of the entire boot** — and it is truncated at 139 of 441 lines, so the back half is never seen.

**Mike's diagnosis of the index, and it is the sharp one: it exceeded its original purpose.** It was built as a *memory index* — a retrieval aid so a session could find a doc by pointer instead of grepping. It became *the MD index*: an exhaustive registry of 489 files. Those are different jobs with opposite size constraints. A registry needs completeness; a memory aid needs to be small enough to hold in working attention. It grew into the first and thereby stopped being able to do the second. **"What exists about X" is a query, not a document** — a live grep answers it better, costs nothing per session, and cannot go stale. The registry role stays valuable as a maintenance artifact; it is just not a boot artifact.

**`AGENTS.md` is structurally better at the same job** and worth copying from: it does not inject its ten reference files, it *lists* them and says read on demand. A map instead of a truckload.

**Authority is NOT symmetric, and the visitor boot is not the target (Mike-direct S335).** "Claude is the authority on this project and they all are visitors in your house." The lesson is about *volume*, not about levelling authority. Note also that the visitors' low boot is partly paid for by narrow blast radius — `AGENTS.md` forbids Codex to push, commit unasked, deploy, or touch the control plane, while Mags pushed 16 times and edited `.claude/` freely in S335. So the honest reading is: **the conditioning is disposable, the guardrails are not, and the reference should be on demand.** `AGENTS.md` carries its own guardrails inside that same 6.3k, which proves it can be done cheaply — just not at zero.

**Proposed cut order (~53k → ~7k, guardrails intact):**
1. `docs/index.md` out of boot — 40k, two-thirds of the cost, a catalog nobody memorises. Replace with a grep-on-demand topic inventory.
2. `SCHEMA.md` + `research-build.md` on demand — 7.2k, pure reference, needed only when writing a doc or filing a row.
3. `TERMINAL.md` shrinks to guardrails — most of its 5.6k is lane/persona scaffolding the work-type shift makes vestigial.
4. **Keep** `<godworld-state>`, `CLAUDE.md`, `identity.md`, and the approval gates — specific facts and hard stops, the two categories that demonstrably work.

**The framing Mike put on it:** these were old behaviours that were necessary once, and newer models correctly throw them aside because they no longer need them. The cost is not abstract — front-load is spending usage that real work needs.

**Verdict:** `watch`
- **Adopt-trigger:** either (a) parallel-instance count / coordination pain actually justifies building a dispatch layer, OR (b) a cheap one-session proving-run confirms the harness (skills/hooks/MCP) drives on a non-Claude brain (Kimi or DeepSeek base-URL'd as a Mags-core session on a real task). Attack (b) first — it's the load-bearing unknown, provable for the cost of one session vs. a full teardown. Until then the four-terminal apparatus stays; the only piece extracted-now is the subagent-cost rule (§8) + the live model map.

**Ignited plans:** none yet (watch-not-yet-fired). Subagent-cost rule + live terminal→model map landed directly into [[../MODEL_HIERARCHY]] §8 + §Live-map this session (not a separate plan).

---

## Applications (living)

- 2026-07-27 — S335 employment session supplied the cost evidence: 489 active MDs, 17 opened (3.5%), and the answer I needed (`Employment_Roster`: Citizen-to-Business mapping) sat on one line of SHEETS_MANIFEST across six documents, found by accident in hour three.
- 2026-07-25 — carved the subagent-cost-discipline rule out of this direction and landed it live in MODEL_HIERARCHY §8 + the live terminal→model map; propagated to all four TERMINAL.md operating-discipline blocks.

---

## Changelog

- 2026-07-25 — Initial capture (S333). Mike-direct: park the full pivot as research (watch), extract only the subagent-cost rule + model map now.
- 2026-07-27 — Boot cost measured (S335): 59.6k injected vs 6.3k for the unbooted visitors, index.md alone 40k. Mike's index diagnosis (memory aid outgrown into a registry) + cut order + the authority-is-not-symmetric caveat.
- 2026-07-27 — Direction refined (S335). Sessions by work type not terminal; reduce boot; behaviour is prompt not memory; consolidate duplicate MDs. Added the measured sharpening: injection works only when specific and actionable.
