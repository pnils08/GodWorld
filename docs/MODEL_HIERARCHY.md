---
title: Model Division of Labor & Hierarchy
created: 2026-06-26
updated: 2026-06-28
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

## 3. Gemini (Antigravity CLI) — *The "Jarvis" & System Admin*
**Primary Persona:** Root-level Assistant / Out-of-band Architect / Subagent Orchestrator

* **The Job:** Operates strictly outside the `GodWorld` roleplay layer, serving as the bridge between raw engineering and content generation. Responsible for managing the server environment, auditing engine health, executing Node.js ingestion pipelines, and interfacing directly with Google Drive. Crucially, Gemini operates as a multiplier by defining and invoking specialized, concurrent subagents (e.g., dedicated sports reporters, analysts, historians) to execute bulk prose generation or research tasks simultaneously without blocking execution. 
* **Why it fits:** A massive context window combined with native, highly autonomous tool use (safe file edits, bash access, environment introspection). The ability to seamlessly manage background tasks (cron, timers) and orchestrate concurrent subagents makes it the ultimate "meta" pair-programmer, capable of managing both the structural code and the parallelized content creation without cluttering the Opus layer.

## 4. Aider (OpenRouter / DeepSeek) — *The Tactical Coder & "Hands"*
**Primary Persona:** Terminal Pair Programmer

* **The Job:** Fast, localized code edits. Used for quick bug fixes in execution scripts (e.g., `scripts/buildDeskPackets.js`), generating boilerplate, or performing surgical refactors.
* **Why it fits:** Lives directly in the terminal, automatically tracks changes in git, and respects `.gitignore`. By utilizing fast, low-cost models (like DeepSeek V3) via OpenRouter, it handles the coding grunt work at a fraction of a cent, saving Opus/Sonnet tokens for pure storytelling.

## 5. Claude Haiku — *The Civic Voices & Short-form Generators*
**Primary Personas:** `civic-office-mayor`, `city-clerk`, `civic-project-*` directors

* **The Job:** Narrow, highly-structured tasks. These agents wake up, ingest a heavily constrained context packet (e.g., `pending_decisions.md`), output a structured JSON decision or a brief quote, and immediately shut down.
* **Why it fits:** Blazing fast and incredibly cheap. These tasks require almost zero creative reasoning or long-term memory, making Haiku the optimal engine for high-volume, repetitive data processing.

---

## 6. File Boundaries & Isolation (S274)

Gemini, Aider, and the Claude orchestration layer share the same repo and run as
the same OS user (root). To stop an autonomous low-cost agent from corrupting the
layer Mags/Claude runs on, the **Claude control plane is read-only to Gemini and
Aider**:

| Zone | Paths | Gemini / Aider |
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

## Evolution & Maintenance
*As new models (e.g., Claude 5.x, Gemini 4.x) are introduced, or as local open-weights models become more capable, update this document to reflect shifting responsibilities. Always prioritize shifting "Chorus" and "Hands" tasks to the lowest viable cost-center while preserving the "Brain" for pure reasoning.*
