---
title: Model Division of Labor & Hierarchy
created: 2026-06-26
updated: 2026-07-28
type: reference
tags: [architecture, models, orchestration, isolation, active]
pointers:
  - "[[FOUR_COMPONENT_MAP]] — Core component boundaries"
  - "[[ARCHITECTURE_VISION]] — Overarching Jarvis/GodWorld vision"
  - ".agents/AGENTS.md — per-agent roster (this doc = model-tier + cost view)"
---

# Model Division of Labor & Hierarchy

This document serves as the living blueprint for how different AI models and agents are deployed across the GodWorld project. As the project scales, we enforce a strict **Cost-to-Reasoning Ratio**, ensuring that expensive orchestration tokens are not burned on tactical execution or rote generation.

By decoupling the "Brain" (Strategy/Orchestration) from the "Hands" (Coding/Execution) and the "Chorus" (Prose/Data formatting), we maintain a production-grade, highly efficient agentic system.

---

## HIERARCHY STATUS: TBD — interim order (Mike-direct 2026-07-28)

The model hierarchy is **TBD** — under active reconsideration. Interim order per Mike-direct 2026-07-28 (Codex restored to backup tier, S343): **Claude is the lead** (§1), **Kimi and Codex are the backup CLIs** (§3), and **Antigravity/Gemini are gated, proposal-only assistants** (§4). This supersedes the S332 inversion below, kept as incident history.

_History — S332 inversion (superseded):_ Mike-direct S332, after Claude/Mags (a) was wrong on Canon Tier, (b) shipped an underspecified starter instruction that cost a $1.82 misrun, (c) mis-attributed Fable's contamination to Codex, and (d) **deleted 21 real citizen-quote rows without approval** — while Codex caught Fable's `record:true` bug, caught its own wrong task, and used the correct terms — Codex was made lead and Claude the gated backup. Reversed to the interim order above on 2026-07-24. The S332 lesson stands regardless of ranking: **no destructive or state-changing action without explicit per-action approval** — "fix all this" is not blanket approval.

### Live terminal → model map (2026-07-25, Mike-direct)

Which Claude tier each terminal's lead session runs on. The lead holds orchestration + judgment; its subagents run a tier down (§8).

| Terminal | Lead model | Cheaper subagent tiers |
|----------|-----------|------------------------|
| research-build | Opus 4.8 | Sonnet (reasoning) / Haiku (grunt) |
| engine-sheet | Fable | Sonnet (reasoning) / Haiku (grunt) |
| civic | Sonnet | Haiku (grunt) |
| media | Sonnet | Haiku (grunt) |

## 1. Claude (Opus 4.8) — *THE LEAD (interim, Mike-direct 2026-07-24)*
**Primary Personas:** Mags (Main Session), `/cycle-review`

* **The Job:** High-level orchestration, long-term strategic planning, complex narrative weaving, and deep structural changes to the GodWorld engine. Reads the output of all lower agents and decides what gets published; handles heavy human-in-the-loop approvals.
* **Why here:** highest single-shot reasoning + persona continuity over long, branching workflows. Operates under the S332 approval discipline: propose → show the exact operation → wait for go on anything destructive or state-changing.

## 2. Claude Sonnet — *The Senior Desk Reporters & Reviewers*
**Primary Personas:** `chicago-desk`, `civic-desk`, `sports-desk`, `rhea-morgan` (reviewer)

* **The Job:** Mid-level feature writing and quality assurance. These agents take raw packets of data and write longer-form prose, or they review the output of junior agents for narrative consistency and stylistic adherence.
* **Why it fits:** Sonnet hits the perfect sweet spot for prose generation. It is cheaper and faster than Opus, but significantly more creative and capable of complex writing than Haiku or standard open-weights models.

## 3. Backup CLIs: Kimi + Codex — *Mike's hands-on second assistants*
**Primary Persona:** Out-of-band terminal assistants (Mike-driven) — strictly outside the `GodWorld` roleplay layer

* **The Job:** Doc-truing, running scripts, sim-design brainstorming, and general tool-using terminal work when Claude usage is exhausted mid-week. **Kimi Code** (K2.6, cheap pay-as-you-go, different lab) and **Codex CLI** (GPT-5.6, validated S332) are the different-eyes secondaries. Both share the same writable scope and commit/push conditions (`AGENTS.md` §Push authorization).
* **Why here:** reliability + honest tool-use reporting is the #1 selection criterion for the CLI slot, above raw writing skill (S332). Codex was briefly demoted to the gated tier on 2026-07-28 after inserting unapproved design into the Event_Content_Ledger plan; restored to backup tier the same day (Mike-direct, S343).

## 4. Antigravity (`agy`) / Gemini — *Gated, proposal-only*

* **The Job:** Read-only inspection, diagnostics, and proposed diffs. They do not modify project files or commit/push project work. An authorized Claude terminal, Kimi, or Codex must review and apply any proposal.
* **Why the constraint:** Antigravity's S332 provenance failure: their output may inform work, but it never lands directly.

_Retired from disk (S332, still retired):_ **Aider** ("the hands" — code-diff scalpel, little use when Opus + Fable write the codebase) and **Grok CLI** (2026 hallucination rate doubled 25%→54%).

## 5. Claude Haiku — *The Civic Voices & Short-form Generators*
**Primary Personas:** `civic-office-mayor`, `city-clerk`, `civic-project-*` directors

* **The Job:** Narrow, highly-structured tasks. These agents wake up, ingest a heavily constrained context packet (e.g., `pending_decisions.md`), output a structured JSON decision or a brief quote, and immediately shut down.
* **Why it fits:** Blazing fast and incredibly cheap. These tasks require almost zero creative reasoning or long-term memory, making Haiku the optimal engine for high-volume, repetitive data processing.

---

## 6. File Boundaries & Isolation (S274; Codex restored to backup tier S343)

The out-of-band CLIs (**Kimi + Codex** as backups;
**Antigravity/Gemini** gated; Aider + Grok retired S332) and the Claude
orchestration layer share the same repo and run as the same OS user (root).
`AGENTS.md` is the binding authorization source:

| Zone | Paths | Kimi / Codex | Antigravity / Gemini |
|------|-------|--------------|----------------------|
| **Control plane** (Claude-owned) | `.claude/**`, `.agents/**`, `CLAUDE.md`, `SESSION_CONTEXT.md` | read-only | read-only |
| **Substrate + execution** | `phase*/`, `utilities/`, `lib/`, `scripts/` | `scripts/` read-write; other paths require explicit per-task permission | read-only; proposed diffs only |
| **Content / output** | `output/`, `editions/`, most of `docs/` | `output/` + `docs/` read-write; `editions/` requires explicit permission | read-only; proposed diffs only |

**Enforcement — soft tier (Mike's call, S274, under quota pressure):**
- `.aiderignore` excludes the control plane from the editable map (legacy from the
  Aider era; kept as defense-in-depth after Aider's S332 retirement).
- `.githooks/pre-commit` (activate once: `git config core.hooksPath .githooks`)
  default-denies any commit touching the control plane unless a Claude session
  prefixes `CLAUDE_CTL=1`.
- The CLIs run as root with bash, so these boundaries remain policy-enforced;
  Antigravity/Gemini have no project write or commit authority.

**Hard tier (deferred follow-up):** kernel-enforced read-only requires running the
cheap agents as a non-root user with `.claude/**` owned by Claude, or in a sandbox
with the control plane mounted read-only. Adopt if the soft tier proves leaky.

`AGENTS.md` is the binding per-agent authorization source; this doc is the
model-tier + cost-to-reasoning view.

---

## 7. Cost & API doctrine (S332, Mike-direct)

- **Premium Claude (Anthropic API / workbench) is reserved for judgment + gate work** that genuinely needs it: the **Rhea canon gate**, Mags EIC crons, deep review. NOT for grunt or bulk generation.
- **Grunt / writing / bulk → OpenRouter + DeepSeek.** Proven cheap and canon-capable (DeepSeek ~500× cheaper than Sonnet at compose parity). Move API usage **off the Anthropic workbench** except the reserved judgment/gate cases.
- **Check OpenRouter for best-model-per-task** rather than defaulting to one model — pick the cheapest model that clears the bar for each job.
- **Backup CLIs:** Kimi Code + Codex (different-eyes secondaries). **Antigravity/Gemini:** gated, read-only, proposal-only; output must be reviewed and applied by an authorized terminal. Aider and Grok retired from disk (S332).
- **Friction is an agent/stance property, not a model or tool property (S332):** Jax-caliber accountability writing comes from running the `freelance-firebrand` agent skill (adversarial stance), not from any particular CLI or premium model. The gold is reproducible on cheap models once the writer runs the right persona.

---

## 8. Subagent cost discipline (Mike-direct 2026-07-25)

**A lead never fans out to its own tier.** Subagents inherit the parent session's model by default — so an Opus lead that spawns a `general-purpose`/`Explore`/Task agent silently gets an *Opus* subagent unless it overrides `model`. That default-inheritance is the leak this rule plugs: the lead holds the judgment, the fan-out runs a tier down.

- **Opus lead (research-build):** subagents → Sonnet for reasoning, Haiku for grunt. Never spawn Opus subagents.
- **Fable lead (engine-sheet):** subagents → Sonnet for reasoning, Haiku for grunt. Never spawn Fable subagents. (Already standing practice — engine-sheet TERMINAL.md §S329.)
- **Sonnet lead (media, civic):** subagents → Haiku for grunt; the standing desk/voice roster already encodes this (desks = Sonnet, civic voices = Haiku, in agent frontmatter).
- **Mechanism:** pass `model:` explicitly on every ad-hoc `Agent`/Task spawn. The named roster is already tiered in frontmatter; the gap is *ad-hoc* spawns silently defaulting to the expensive parent.
- **The one caveat — capability floor beats cost.** Default down a tier; escalate a subagent back *up* only when the subtask has a genuine reasoning floor (adversarial verify of a subtle canon call, a hard code review). Hard-forbidding same-tier can force a task onto a model that flubs it and the lead redoes it — false economy. **Cheaper-by-default, not cheapest-always.**

---

## Evolution & Maintenance
*As new models (e.g., Claude 5.x, Gemini 4.x) are introduced, or as local open-weights models become more capable, update this document to reflect shifting responsibilities. Always prioritize shifting "Chorus" and "Hands" tasks to the lowest viable cost-center while preserving the "Brain" for pure reasoning.*
