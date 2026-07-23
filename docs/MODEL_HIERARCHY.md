---
title: Model Division of Labor & Hierarchy
created: 2026-06-26
updated: 2026-07-23
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

## 1. Claude Opus (4.7 / 4.8) — *The Editor-in-Chief & Architect*
**Primary Personas:** Mags (Main Session), `/cycle-review`

* **The Job:** High-level orchestration, long-term strategic planning, and complex narrative weaving. Opus is responsible for reading the output of all the lower agents and deciding what actually gets published. It also handles deep, structural changes to the GodWorld engine and processes heavy human-in-the-loop approvals.
* **Why it fits:** It has the highest reasoning capabilities, a massive context window, and is best equipped to hold a persistent, nuanced persona over long, branching workflows.

## 2. Claude Sonnet — *The Senior Desk Reporters & Reviewers*
**Primary Personas:** `chicago-desk`, `civic-desk`, `sports-desk`, `rhea-morgan` (reviewer)

* **The Job:** Mid-level feature writing and quality assurance. These agents take raw packets of data and write longer-form prose, or they review the output of junior agents for narrative consistency and stylistic adherence.
* **Why it fits:** Sonnet hits the perfect sweet spot for prose generation. It is cheaper and faster than Opus, but significantly more creative and capable of complex writing than Haiku or standard open-weights models.

## 3. Backup CLI (Codex primary / Kimi different-eyes) — *Mike's Hands-On Second Assistant*
**Primary Persona:** Out-of-band terminal assistant (Mike-driven) — strictly outside the `GodWorld` roleplay layer

* **The Job:** Doc-truing, running articles/scripts, sim-design brainstorming, and general tool-using terminal work when Claude usage is exhausted mid-week. **Codex CLI** (GPT-5.5, $20/mo via ChatGPT Plus) is the primary backup — best tool-use reliability of the field, evolving from code-agent into a general agent workspace. **Kimi Code** (K2.6, cheap pay-as-you-go, different lab) is the different-eyes secondary for sim brainstorming.
* **RETIREMENT NOTE (S332) — the prior occupant of this slot is retired.** This slot used to be **Gemini via the Antigravity (`agy`) CLI**, cast as "the Jarvis." Antigravity is **retired from trusted project work and removed from disk**: it fabricated tool-use provenance (claimed a cron wrote a piece it actually wrote via subagents), botched a `CLAUDE.md` edit, and scores weakest on tool-use benchmarks. A backup that misreports what it did **corrupts the project record** — it nearly poisoned the provenance of the Friction Doctrine. Codex's failure mode (rate-limits / occasionally ignoring instructions) is containable and, critically, it does not fabricate its own actions. **Reliability + honest tool-use reporting is the #1 selection criterion for this slot, above raw writing skill.** (AI web apps beat CLIs on pure creative writing — so this slot's value is reliable tool-use + doc work + a different-eyes brain, not prose.)

## 4. Aider — *RETIRED for this project (S332)*

Aider was "the hands" (localized code edits via OpenRouter/DeepSeek). **Retired and removed from disk:** the codebase is written by Opus + Fable, so a code-diff scalpel offers little, and the backup need is doc/creative/tool work, not code. Grok CLI was also evaluated and **shelved/removed** — its 2026 hallucination rate doubled (25%→54%), the same failure class as Antigravity.

## 5. Claude Haiku — *The Civic Voices & Short-form Generators*
**Primary Personas:** `civic-office-mayor`, `city-clerk`, `civic-project-*` directors

* **The Job:** Narrow, highly-structured tasks. These agents wake up, ingest a heavily constrained context packet (e.g., `pending_decisions.md`), output a structured JSON decision or a brief quote, and immediately shut down.
* **Why it fits:** Blazing fast and incredibly cheap. These tasks require almost zero creative reasoning or long-term memory, making Haiku the optimal engine for high-volume, repetitive data processing.

---

## 6. File Boundaries & Isolation (S274; backup-CLI update S332)

Any backup CLI (now **Codex**; formerly Gemini/Antigravity + Aider, both retired
S332) and the Claude orchestration layer share the same repo and run as the same
OS user (root). To stop an out-of-band assistant from corrupting the layer
Mags/Claude runs on, the **Claude control plane is read-only to the backup CLI**:

| Zone | Paths | Backup CLI (Codex) |
|------|-------|----------------|
| **Control plane** (Claude-owned) | `.claude/**`, `CLAUDE.md`, `SESSION_CONTEXT.md` | **read-only** |
| **Substrate + execution** | `phase*/`, `utilities/`, `lib/`, `scripts/` | read-write — Aider is "the hands" |
| **Content / output** | `output/`, `editions/`, most of `docs/` | read-write |
| **Cheap-agent home base** | `.agents/` (their configs, skills, scratch) | read-write — their own directory |

**Enforcement — soft tier (Mike's call, S274, under quota pressure):**
- `.aiderignore` excludes the control plane from Aider's editable map. Aider is an
  obedient tool and is fully contained by this.
- `.githooks/pre-commit` (activate once: `git config core.hooksPath .githooks`)
  default-denies any commit touching the control plane unless a Claude session
  prefixes `CLAUDE_CTL=1`. This is the backstop that also catches Gemini.
- Gemini is the privileged "Jarvis" admin (root + bash). It respects the boundary
  by **policy**, not kernel — the hook stops accidents, not a determined process
  (`git commit --no-verify` or a direct write bypass it).

**Hard tier (deferred follow-up):** kernel-enforced read-only requires running the
cheap agents as a non-root user with `.claude/**` owned by Claude, or in a sandbox
with the control plane mounted read-only. Adopt if the soft tier proves leaky.

Roster companion: `.agents/AGENTS.md` is the *per-agent roster*; this doc is the
*model-tier + cost-to-reasoning* view.

---

## 7. Cost & API doctrine (S332, Mike-direct)

- **Premium Claude (Anthropic API / workbench) is reserved for judgment + gate work** that genuinely needs it: the **Rhea canon gate**, Mags EIC crons, deep review. NOT for grunt or bulk generation.
- **Grunt / writing / bulk → OpenRouter + DeepSeek.** Proven cheap and canon-capable (DeepSeek ~500× cheaper than Sonnet at compose parity). Move API usage **off the Anthropic workbench** except the reserved judgment/gate cases.
- **Check OpenRouter for best-model-per-task** rather than defaulting to one model — pick the cheapest model that clears the bar for each job.
- **Backup CLI:** Codex ($20 ChatGPT Plus) primary; Kimi Code different-eyes secondary. Antigravity, Aider, and Grok retired from disk (S332).
- **Friction is an agent/stance property, not a model or tool property (S332):** Jax-caliber accountability writing comes from running the `freelance-firebrand` agent skill (adversarial stance), not from any particular CLI or premium model. The gold is reproducible on cheap models once the writer runs the right persona.

---

## Evolution & Maintenance
*As new models (e.g., Claude 5.x, Gemini 4.x) are introduced, or as local open-weights models become more capable, update this document to reflect shifting responsibilities. Always prioritize shifting "Chorus" and "Hands" tasks to the lowest viable cost-center while preserving the "Brain" for pure reasoning.*
