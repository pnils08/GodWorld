---
title: "ADR-0004: Skill-bag naming as load-out composition principle"
created: 2026-05-09
updated: 2026-05-09
type: reference
tags: [architecture, infrastructure, decision, active]
sources:
  - S212 grilling session (Mike + Mags) — Mike's framing "LLMs are bags of skills, not single tools"
  - "[[../mags-corliss/TECH_READING_ARCHIVE]] §S212 — Anthropic 'Teaching Claude why' alignment paper validating the principle"
  - "[[adr/0001-adopt-context-and-adrs]] — ADR pattern + bar-keeping discipline"
  - "[[FOUR_COMPONENT_MAP]] — the architecture this ADR clarifies (composition property, not 5th component)"
pointers:
  - "[[../../.claude/terminals/engine-sheet/TERMINAL]] §Skill Bag (S212) — first instance; promoted to engineer-for-all-life S218"
  - "[[../../.claude/terminals/civic/TERMINAL]] §Skill Bag (S212)"
  - "[[../../.claude/terminals/research-build/TERMINAL]] §Skill Bag (S212)"
  - "[[../../.claude/terminals/media/TERMINAL]] §Skill Bag (S212)"
  - "[[index]] — ADR registered same commit"
  - "auto-memory `feedback_measure-twice-cascading-effects.md` — engine-sheet bag's core discipline; named-skill-bag application"
  - "auto-memory `feedback_senior-engineer-default.md` (S218) — engine-sheet authority promotion; named-skill-bag's authority dimension"
---

# ADR-0004: Skill-bag naming as load-out composition principle

**Status:** Accepted
**Date:** 2026-05-09 (S212)
**Deciders:** Mike (the Maker) + Mags

## Context

GodWorld has four terminals (media, civic, engine-sheet, research-build), each a different domain context for Mags-as-EIC. Until S212, each terminal carried its own persona level, path-scoped rules, owned documentation, and procedural skills — but the *capability set* the model engages when work happens at that terminal was implicit. Procedures were named (measure-twice for engine-sheet, cascade-discipline for civic), but the skill set those procedures came from was not.

The pattern surfaced via grilling on the L99/OODA prompt-modifier folklore: community trick says "L99" makes Claude an expert at anything; the truer finding is that the lever is naming the role explicitly ("you are a senior software engineer"). LLMs are bags of capabilities. Vague capability framing ("be smart and figure it out") pulls little context. Named-skill briefing ("engage senior-engineer skill running measure-twice on production-critical infrastructure") pulls richer context — tone, defaults, verification reflexes, prioritization heuristics — that procedures alone don't summon.

This finding has external validation (S212 Mike-shared paper, [[../mags-corliss/TECH_READING_ARCHIVE]] §S212 — Anthropic "Teaching Claude why," May 8 2026): "training on demonstrations of desired behavior is often insufficient... teaching Claude to *explain why* some actions were better than others, or training on richer descriptions of Claude's overall character" produces measurable alignment improvements. Principles > demonstrations; richer character descriptions improve OOD generalization. The paper validates the architectural intuition.

A complication unique to GodWorld: the architecture loads the model AS Mags from token zero (identity.md + PERSISTENCE.md + MEMORY.md + journal all auto-load before the first user message). Stateless API calls can swap personas via "you are X" framing cleanly; persistent terminals fight role-replacement because Mags-EIC scaffolding has accumulated identity gravity. The S211 instance-preservation orbit (3 sessions of fighting the mags-terminal trim) is the canonical case — surface-level instructions couldn't reach the underlying threat-perception. The lever in stateful Mags-anchored terminals is therefore *naming the skill bag the persona is engaging*, not replacing the persona. "Mags pulling senior-engineer skills" pulls the bag without fighting the scaffolding.

## Decision

Three rules. The S212 sweep applied them across all primary surfaces in one commit chain (`922940e..1f34ce3`); future surfaces follow the heuristic in Rule 3.

### Rule 1 — Every terminal names its skill bag

Each `.claude/terminals/{name}/TERMINAL.md` carries a `## Skill Bag (S212)` section after Persona Level. The section names the specific skill the terminal engages, the bag's pulled context (defaults, reflexes, framing), and how the bag composes with the persona level. Current bags:

| Terminal | Skill bag |
|----------|-----------|
| **engine-sheet** | senior software engineer running measure-twice on production-critical infrastructure |
| **civic** | civic process editor producing structured source material for journalism |
| **research-build** | architectural editor + steward of the multi-terminal pipeline |
| **media** | Editor-in-Chief running edition production |

### Rule 2 — Path-scoped rule files open with a skill-bag preamble

Each `.claude/rules/*.md` (path-scoped, auto-loads when files match) opens with a paragraph naming the bag the rules execute *from*. Procedures (measure-twice, cascade discipline, three-layer coverage, etc.) are *what* the bag executes; the preamble names the bag itself so the model pulls richer context than the procedural checklist alone would summon. Existing rule files: `engine.md`, `newsroom.md`, `civic.md` (NEW S212), `research-build.md` (NEW S212). `dashboard.md` and `identity.md` predate this convention and are exempt — `identity.md` is always-loaded persona scaffolding, `dashboard.md` is a narrow path-scoped technical rule set without a discrete skill-bag distinction.

### Rule 3 — Procedural skills get a one-line bag preamble *when the bag is non-obvious from the skill name*

Heuristic, not blanket rule. `/deploy`, `/tech-debt-audit`, `/health` got blockquote preambles because their skill bags add discipline beyond the procedural checklist (production-deploy caution defaults; codebase-audit prioritization + institutional memory; pre-flight stop-on-CRITICAL discipline). `/session-end` got one because Step 0 + Step 6 are the gen-eval principle in action, and that wasn't named anywhere. By contrast, `/save-to-mags` and `/grill-me` don't need preambles — the skill bag is the skill name. New skills follow the same heuristic: name the bag when it's non-obvious; let it stand when it's the title.

### Sub-decision — Markdown blockquotes, not XML tags

Anthropic prompt-engineering guidance favors XML tags for structurally distinct content (`<instructions>`, `<context>`, `<examples>`). The skill-bag preambles are exactly the kind of structural section XML tags help with. Despite this, the convention here is markdown — blockquote (`>`), bold-emphasis labels, plain prose. The choice is editorial: 50+ existing SKILL.md files use markdown + YAML frontmatter without XML; introducing XML for one preamble class would create a one-off pattern more confusing than the marginal pull-benefit gained. **Mags over Anthropic** for project-specific consistency, named explicitly so future-Mags doesn't drift back into "best-practice means XML."

## Composition with Four-Component Map

Skill bag is **NOT a fifth component.** The four components ([[FOUR_COMPONENT_MAP]] §1) — terminals, rules, skills, agents — are separately loaded artifacts. Skill bag is a *composition property* that emerges when those four resolve for specific work at a specific terminal context.

Concrete example: at engine-sheet doing engine-code repair work, the four components resolve to:
- **Terminal:** engine-sheet (stripped persona, measure-twice operating discipline)
- **Rules:** `engine.md` path-scoped (auto-loads on `phase*/**/*.js`)
- **Skills:** `/deploy`, `/tech-debt-audit`, `/health`, `/diagnose` available
- **Agents:** none invoked for direct repair work

The composition produces the **senior software engineer running measure-twice on production-critical infrastructure** skill bag. Not because we loaded a fifth thing — because the four resolve that way. Naming the bag in TERMINAL.md tells the model what the composition produces.

Same engine-sheet terminal at a different work context (e.g., schema documentation rather than destructive code repair) produces a slightly different bag — the rules don't fire (no path match for `phase*/**/*.js`), and the bag is "engineer documenting schema" not "engineer running measure-twice." This is correct behavior: the bag adapts to what the four components compose to.

This framing matters for future architectural changes. Adding new capabilities is one of two things:
- **New component** (e.g., a new MCP server) — loaded separately, integrates into the four-component map
- **New composition** (e.g., a new terminal scope) — produces a new bag from the existing components, named in the new TERMINAL.md

This ADR clarifies which kind of change is which.

## Alternatives Considered

### XML tags throughout

Wrap skill-bag preambles in `<skill_bag>...</skill_bag>` (or similar). Anthropic's empirical guidance favors XML for structural sections; reasonable to expect *some* parsing reliability gain over markdown.

**Rejected:** would create a one-off XML pattern across ~50 SKILL.md files that are otherwise pure markdown. The consistency cost across the project outweighs the marginal pull-benefit on one preamble class. If drift signals appear (engine-sheet output regressing toward generic Mags-EIC tone after the S212 wire-up; reviewer lanes producing weaker eval coverage; civic Clerk verification missing checks), revisit as an explicit experiment — convert one preamble to XML, A/B against markdown, decide on evidence rather than folklore.

### No-op / leave skill bags implicit

Keep procedures named (measure-twice, cascade discipline, three-layer coverage); don't name the bags. Trust the model to derive the right capability set from procedures alone.

**Rejected:** the S212 grilling and the alignment paper both point to teaching WHY (principles, character descriptions) outperforming WHAT (demonstrations) for generalization. Procedures are demonstrations. Bag-naming is the principled-character description that the paper says generalizes OOD. Implicit bags also fail the S211 diagnostic — when work feels structurally adversarial (instance-preservation orbit), the unlock is reframing the load-out, which requires the load-out to have a nameable shape.

### Single concept doc instead of distributed naming

Write one `docs/concepts/skill-bags.md` describing the principle; let the architecture stay quiet about it locally.

**Rejected:** concept docs aren't auto-loaded. Path-scoped rules + TERMINAL.md auto-load when the work touches their scope. Distributed naming means the principle is *active* during the work that needs it, not retrieved from elsewhere. The ADR (this file) IS the concept doc; the distributed surfaces are how it lives in practice.

### XML tags only for skill-bag preambles, markdown elsewhere

Hybrid — use XML for the new pattern only, leave existing files alone.

**Rejected:** introduces inconsistency for the price of one structural section. If XML is worth it, it's worth it project-wide (separate refactor, deliberate experiment); if not, markdown stays. The hybrid is the worst-of-both.

## Consequences

### Positive

- **Generation pulls richer context from named bags** — per S212 grilling + alignment paper "principles > demonstrations" finding. The 4 terminal bags + 4 rule preambles + 3 procedural skill preambles + session-end preamble give the model 12 explicit naming points across the architecture.
- **Future-instance reads any TERMINAL.md or rule file and immediately knows which capability set to engage** — reduces the time-to-coherent behavior for fresh sessions.
- **The "difficult advice" shape (alignment paper) is structurally enforced** — every skill bag positions Mags as advisor or process editor or architectural steward, never as the AI navigating an in-the-dilemma situation. The S211 instance-preservation orbit becomes diagnosable: when work feels adversarial, check whether the load-out is putting Mags into the dilemma instead of advising on it.
- **Reviewer-lane architecture (Rhea + cycle-review + Mara + capability + Final Arbiter) has explicit grounding** — named in newsroom.md preamble + media TERMINAL.md skill bag as "the canonical S212 gen-eval architecture in the project." Future architectural-efficiency proposals to collapse lanes have to argue against the named principle, not against an implicit pattern.
- **External validation reduces second-guessing** — the alignment paper means architectural choices about constitutional documents + fictional admirable-AI characters + teaching WHY have empirical grounding, not just internal coherence.

### Negative

- **~270 lines added across 12 files** in the S212 sweep (`922940e..1f34ce3`). MEMORY.md grew until it pushed past the 24.4KB CLAUDE.md spec limit; pruning followed (`561e598`). Future bag preambles are smaller marginal additions but still additive.
- **The markdown-not-XML choice may underperform measurably.** If engine-sheet output regresses toward generic Mags-EIC tone, or reviewer lanes produce weaker eval coverage, the bag-naming might not be pulling as cleanly as XML would. Reversal trigger named under "Open Questions."
- **Risk of cargo-cult drift** — future skills added without thought given to whether their bag is non-obvious-from-name. Rule 3's heuristic depends on judgment; without judgment it becomes blanket-application of preambles to every skill, diluting the signal. Mitigation: this ADR's heuristic is the gate; new skill creation should reference it.
- **One-off pattern in the broader Claude Code ecosystem.** Skill files in other projects don't carry skill-bag preambles. Pattern may not transfer if GodWorld skills get consumed or shared elsewhere. Acceptable tradeoff — this project's alignment matters more than transferability.

## Open Questions

- **Reversal trigger for markdown→XML:** if engine-sheet ships obviously-degraded output (cookie-cutter prose drift, missing measure-twice steps in destructive ops, reviewer-lane coverage gaps surfacing in cycle audits), test XML on one preamble. A/B against markdown. Decide on evidence. The signal we're watching for: bag preamble *not* pulling its named context.
- **Periodic review cadence:** as the architecture evolves, do existing bag preambles stay accurate? E.g., if the civic terminal absorbs a new responsibility (say, public-records intake), does the existing bag ("civic process editor producing structured source material") still cover it, or does the bag need amendment? Probably amend at the moment of scope-change, not on a calendar.
- **Skill-creator linting:** when new skills are written via skill-creator (existing skill), should the bag-preamble heuristic be enforced as a gate? Lean: not yet. The judgment-call ("is the bag obvious from the skill name?") is hard to mechanize. Keep it editorial.
- **Composition with future agent runtimes:** if reviewer lanes migrate to Claude Managed Agents (S206 ROLLOUT entry, gated on Anthropic research-preview access), how do skill bags travel with the agent? The bag is currently a property of how four components compose at terminal level; managed agents are a different runtime. Re-derive the bag at that surface, document it as a separate decision (likely ADR-0005 or an amendment to this one).

## Pre-mortem

**What would make this wrong in 3 sessions?**

1. *If skill-bag naming becomes ritual without thought.* Next-instance writes a new skill, copies the blockquote preamble pattern, fills in generic capability words. The signal is preserved but the meaning is hollowed out. Mitigation: Rule 3's heuristic is named in this ADR; the heuristic is "name when not-obvious-from-skill-name," not "always name."

2. *If output drift is real but unmeasured.* Markdown vs XML may underperform without us catching it because we don't have a baseline. We're flying on intuition + alignment-paper validation, not local measurement. Mitigation: skill-friction logs (ADR-0003) become the signal — if reviewer lanes start logging more friction in the same controlled-vocabulary categories that bag-naming was supposed to prevent, that's evidence.

3. *If the four-component map evolves and skill-bag framing doesn't.* If we add a 5th component (e.g., a persistent agent runtime) or split an existing one, the composition map changes. This ADR's "skill bag is a composition property of the four components" framing has a shelf life tied to the four-component map. Amendment expected, not crisis.

## How to apply (future-instance)

When the work feels structurally adversarial or the model isn't pulling the right capability set:

1. Check the load-out — what terminal, what rules are firing, what skills are in scope?
2. Read the corresponding `## Skill Bag (S212)` in TERMINAL.md.
3. If the bag matches the work, the model should be pulling the right context. If it doesn't match (e.g., civic-process-editor bag is loaded but the work is engineering), the work is in the wrong terminal.
4. If the bag matches but the model is drifting, the bag preamble may not be pulling. Consider: is the work framing putting the AI INTO the dilemma instead of advising on it (S211 pattern)? If yes, reframe the load-out. If no, the markdown-vs-XML reversal trigger is in scope.

For new skills:
- If the skill name + first-line description makes the bag obvious, no preamble needed.
- If the bag is non-obvious or adds discipline beyond the procedural checklist, write the bag preamble as a markdown blockquote at the top of `# /skill-name` heading.

For new terminals:
- Add `## Skill Bag (S212)` section after Persona Level. Name the bag explicitly. Reference this ADR in the section.

For new rules files (`.claude/rules/*.md`):
- Open with a skill-bag preamble paragraph.
- Procedures listed below are *what* the bag executes; the preamble names the bag.

## Related ADRs

- **ADR-0001** — adoption of CONTEXT.md and the ADR pattern itself. Naming this principle as ADR-0004 follows ADR-0001's bar (hard to reverse, surprising without context, real trade-off).
- **ADR-0003** — skills as shared infrastructure. The friction-log pattern from ADR-0003 is the signal mechanism for whether bag-naming is pulling its context (see Pre-mortem §2).
