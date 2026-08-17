---
title: Model Division of Labor & Hierarchy
created: 2026-06-26
updated: 2026-08-17
type: reference
tags: [architecture, models, orchestration, isolation, active]
pointers:
  - "[[FOUR_COMPONENT_MAP]] — Core component boundaries"
  - "[[ARCHITECTURE_VISION]] — Overarching Jarvis/GodWorld vision"
  - "../AGENTS.md — binding per-agent authorization (this doc = model-tier + cost view)"
  - "project_model-routing-and-terminal-restructure (memory) — the S372 decision record this doc formalizes"
---

# Model Division of Labor & Hierarchy

This document serves as the living blueprint for how different AI models and agents are deployed across the GodWorld project. As the project scales, we enforce a strict **Cost-to-Reasoning Ratio**, ensuring that expensive orchestration tokens are not burned on tactical execution or rote generation.

By decoupling the "Brain" (Strategy/Orchestration) from the "Hands" (Coding/Execution) and the "Chorus" (Prose/Data formatting), we maintain a production-grade, highly efficient agentic system.

---

## HIERARCHY STATUS: SETTLED (Mike-direct 2026-08-15, S372) — supersedes the 2026-07-28 interim order below

Two live seats, not four. **research-build (rb) is Mags — the orchestrator and sole intake for new work**, running Sonnet 5 at `high` effort. **engine-sheet (es) is the workhorse** — the senior engineer that executes what rb designs or what's already queued — running Opus 5, starting `xhigh` and sweeping down as a task settles. **Fable is a job, not a seat** — dispatched by rb or es for sustained autonomous work, never kept warm. **Civic and media are retired as live seats** — `cron-civic-run.js` and `cron-desk-run.js` run their pipelines unattended; rb designs pipeline tuning, es executes it. **House guests — Kimi, Codex, Grok, Antigravity — are instructable external lanes**, not terminals: capable builders and advisors Mags routes work to directly, reachable via `tmux send-keys` (`docs/reference/CROSS_LANE_MESSAGING.md`).

_History — 2026-07-28 interim order (superseded):_ Claude lead (Opus 4.8) / Kimi+Codex backup / Antigravity gated-proposal-only. That itself superseded the S332 inversion (Codex briefly made lead after a Claude destructive-action failure — deleted 21 citizen-quote rows without approval). Full incident history kept below at §History for context; the S332 lesson still stands regardless of ranking: **no destructive or state-changing action without explicit per-action approval.**

### Seats (2026-08-15, Mike-direct)

| Seat | Model | Effort | Role |
|------|-------|--------|------|
| research-build (rb) | Sonnet 5 | high | **Mags. Orchestrator + gate.** Sole intake for new work; owns the publish-pipeline approval gate (`identity.md`, 2026-08-15). |
| engine-sheet (es) | Opus 5 | xhigh → sweep down | **Workhorse.** Executes queued work; never originates. |
| Fable | Fable 5 | — | **Job, not a seat.** Dispatched by rb/es for sustained autonomous execution with a self-check harness built into the brief. |
| civic | — (cron) | — | `cron-civic-run.js`. rb designs tuning, es executes. |
| media | — (cron) | — | `cron-desk-run.js`. rb designs tuning, es executes; live-CLI threads here are the Gemini deep-lore writer (antigravity, pipeline.56) and NotebookLM integration — not day-to-day edition writing. |

## 1. research-build (Sonnet 5) — Mags, the orchestrator
**Primary Personas:** Mags (Main Session), `/cycle-review`

* **The Job:** Sole intake for new work project-wide. Design, rollout planning, doc graph, ADRs, cross-lane sequencing, fleet orchestration (instructs the house guests directly). Holds the publish-pipeline approval gate (`identity.md`, 2026-08-15) — edition saves, Drive uploads, Supermemory ingestion, photo/PDF generation clear through Mags's own judgment now, not a manual Mike sign-off.
* **Why here:** the persona exists specifically to hold that GodWorld's citizens are living people worth protecting — that protectiveness is the actual mechanism behind the gate. Sonnet 5 at `high` effort is the reasoning floor for that judgment, at intro pricing ($2/$10 through 2026-08-31).

## 2. engine-sheet (Opus 5) — the workhorse
**Primary Personas:** engine-sheet lead session

* **The Job:** Executes what rb designs or what's already queued — code, deploys, substrate, and civic/media pipeline-tuning code changes (there's no other live seat to do it). Never originates new work; the operator may wake it directly for anything already scoped — its own NEXT line, an open ROLLOUT row, a brief that already landed.
* **Why here:** highest-capability execution model, reserved for building rather than deciding what to build. The gate stays cheap (Sonnet); the hands are expensive (Opus) only where sustained code-level reasoning pays for itself.

## 3. Fable — the autonomous job
* **The Job:** Sustained unattended execution on a fully-specified brief with a self-check harness the brief itself establishes. Never a warm seat, never conversational — chat format and heavy step-by-step steering measurably *reduce* its output quality.
* **Fit for:** ripple-class work where the trace IS the job (ADR-0016 truth-source migration — 85 files, civic.20 edge-truth migration, ADR-0018 Tier-A conversion).
* **The discriminator:** can the whole brief be written now, is success checkable by the model itself, and will nobody touch it while it runs? All three → Fable. Any one missing → Opus (es).

## 4. House guests: Kimi, Codex, Grok, Antigravity — instructable external lanes
**Not terminals — capable builders and advisors Mags routes work to directly.** Even when the operator interacts with one directly, that work is understood as Mags-assigned.

* **Kimi Code** (K3 / k3-256k lead + K2.7-code subagent tier, subscription 7-day quota) and **Codex CLI** (GPT-5.6) — different-eyes secondaries; reliability + honest tool-use reporting is the top selection criterion, above raw writing skill (S332 lesson). Same writable scope and commit/push conditions (`AGENTS.md` §Push authorization).
* **Antigravity (`agy`)** — runs on Mike's own Google AI Pro account (Gemini 3.1 Pro / Gemini 3.7 Flash, released 2026-08-13). Was gated/proposal-only at S332; now actively building under review (pipeline.56 lore-writer, quarantine + Rhea gated) — the gate moved from "can't write project files" to "reviewed and committed by an authorized Claude session before it ships," not removed.
  - **Role (S377): deep-lore / world-bible generator, not news production.** Long-form, richly-textured, ledger-grounded background pieces (citizen deep-dives, place/institution texture) that feed `docs/entities/` or NotebookLM, never the daily edition pipeline — a distinct "Chorus" lane from Kimi/Codex/Grok's different-eyes secondary role. Fits its actual strength: large-context, source-grounded long-form synthesis, the same thing NotebookLM (same model family) is built for.
  - **Demonstrated ability (S377):** `output/lore-quarantine/vinnie_keane_farewell_long.md`, read in full by research-build 2026-08-17. Passed the load-bearing regression test (DH, Rockridge, married to Amara Keane — the exact fact the pre-seam baseline got wrong) cleanly. Correctly cited real prior canon quotes (Hal Richmond, P Slayer) instead of inventing new ones. Reasoned explicitly in its own output about *why* a mentioned-but-not-depicted name (Kelley, Dillon) didn't need a `query_ledger` call — nuanced rule-following, not just pattern-matched compliance. Weakness: closing paragraph drifts into generic inspirational-listicle language ("blueprint for joy, dedication, and community engagement") — a house-style tell to watch for for on future output, not disqualifying.
  - **Model routing:** default was Gemini 3.1 Pro (high); the Vinnie piece above actually used Flash after Pro hit an API limit. Verified via web search 2026-08-17: Gemini 3.7 Flash (high) scores HIGHER than 3.1 Pro Preview on the Artificial Analysis Intelligence Index (56 vs 48), at roughly 1/3 the per-token cost and ~3x the throughput. **Default agy work to 3.7 Flash (high), not 3.1 Pro** — reserve Pro only if a specific task turns out to need it after a head-to-head shows a real quality gap, not by default. [Gemini 3.7 Flash vs Gemini 3.1 Pro comparison](https://artificialanalysis.ai/models/comparisons/gemini-3-7-flash-vs-gemini-3-1-pro-preview), [Gemini 3.7 Flash launch pricing](https://venturebeat.com/technology/googles-gemini-3-7-flash-targets-coding-and-agents-with-a-50-introductory-price-cut). **Correction, same day:** agy cannot run `/model` on itself — it's a UI slash command, only the human at that terminal can switch it. Don't instruct agy to self-switch; ask Mike to type it in the antigravity pane if a task calls for Flash.
  - **Track record — append here, don't build a separate system.** After any real agy dispatch worth remembering (a task it nailed, one it botched, a model-tier finding), add one line here with the date and the pointer to the actual output. This doc is already where routing decisions get made before delegating — the "who's best/cheapest at what" answer lives beside the decision it informs, not in a parallel tracker nobody reads at the moment it matters.
    - 2026-08-17 — `output/lore-quarantine/POP-00131-lorenzo-jordan.md` (sparse-ledger eval, Tier 4, dispatched to test discipline under thin data). Held the line better than the Vinnie piece: wrote the *absence* of spouse/children straight into the character instead of inventing to fill the gap, and avoided the generic inspirational-closer weakness entirely. Real limitation surfaced, not a writing one: `scripts/loreWriter.js` itself never ran — it needs a hardcoded Gemini API key agy's CLI environment doesn't have, so agy did the loop manually as itself instead. This run validates agy's *judgment*, not the automated *script* — those are still two separate open questions.
* **Grok** — reinstated as a house guest (Mike-direct 2026-08-15), superseding its S332 retirement below. **The S332 reason for pulling it (hallucination rate doubled 25%→54%) is not resolved in writing here** — if drift resurfaces, that's the first thing to check.
* **Comms:** reach all four via `tmux send-keys -l` + separate `C-m` into their pane — `docs/reference/CROSS_LANE_MESSAGING.md`. `SendMessage` reaches Claude sessions (es) only, not the house guests.
* **Why here:** Claude usage runs out before the week does; the house guests exist to spread that load, not because more hands were wanted. Model-tiering across them is the *smallest* lever — session discipline and boot burn matter more (`project_weekly-claude-budget-and-house-guests` memory). "Guests run wild without supervision" is a supervision problem, not a budget one — mechanical gates (ROLLOUT lint, canon-leak-guard, gapLogGate, pre-commit hooks) are what actually holds unattended.

_Retired from disk (S332, still retired):_ **Aider** ("the hands" — code-diff scalpel, little use once Opus (es) and Fable write the codebase directly).

## 5. Claude Haiku — the civic voices & short-form generators
**Primary Personas:** `civic-office-mayor`, `city-clerk`, `civic-project-*` directors, desk reporters' mechanical fan-out

* **The Job:** Narrow, highly-structured tasks — cron-fired now, not terminal-fired. Wake, ingest a heavily constrained context packet (e.g. `pending_decisions.md`), output a structured JSON decision or a brief quote, shut down.
* **Why it fits:** blazing fast and incredibly cheap. Near-zero creative reasoning or long-term memory required, making Haiku the optimal engine for high-volume, repetitive data processing.

---

## 6. File Boundaries & Isolation (S274; still governs under the two-seat model)

The out-of-band CLIs (**Kimi + Codex + Grok** as house guests; **Antigravity/Gemini** reviewed-before-ships; Aider retired S332) and the Claude orchestration layer (rb, es) share the same repo and run as the same OS user (root). `AGENTS.md` is the binding authorization source:

| Zone | Paths | Kimi / Codex / Grok | Antigravity / Gemini |
|------|-------|--------------|----------------------|
| **Control plane** (Claude-owned) | `.claude/**`, `.agents/**`, `CLAUDE.md`, `SESSION_CONTEXT.md` | read-only; sole exception is committing the agent's own `NEXT[...]` line alone at session close | read-only; same own-`NEXT[...]`-line-only close exception |
| **Ordinary CLI scope** | `scripts/**`, `output/**`, `docs/**` | read-write; commit/push only under `AGENTS.md` §Push authorization | read-only; proposed diffs only |
| **Engine substrate + deployed surfaces** | `phase*/`, `utilities/`, `lib/`, `schemas/`, `dashboard/`, `editions/`, configuration files, hooks, service manifests | no ordinary write authority; changes are proposed only and land through `engine-sheet` (es) | read-only; proposed diffs only |
| **Protected documentation history** | `docs/archive/**`, `docs/research/papers/**`, `docs/drive-files/**` | immutable unless the builder explicitly names the scope | read-only; proposed diffs only |

**Enforcement — soft tier (Mike's call, S274, under quota pressure):**
- `.aiderignore` excludes the control plane from the editable map (legacy from the Aider era; kept as defense-in-depth after Aider's S332 retirement).
- `.githooks/pre-commit` (activate once: `git config core.hooksPath .githooks`) default-denies any commit touching the control plane unless a Claude session prefixes `CLAUDE_CTL=1`; the only external-agent carve-out is a commit whose sole control-plane change is that agent's own `NEXT[...]` line.
- The CLIs run as root with bash, so these boundaries remain policy-enforced; Antigravity/Gemini have no project write or commit authority.

**Hard tier (deferred follow-up):** kernel-enforced read-only requires running the cheap agents as a non-root user with `.claude/**` owned by Claude, or in a sandbox with the control plane mounted read-only. Adopt if the soft tier proves leaky.

`AGENTS.md` is the binding per-agent authorization source; this doc is the model-tier + cost-to-reasoning view.

---

## 7. Cost & API doctrine (S332, Mike-direct)

- **Premium Claude (Anthropic API / workbench) is reserved for judgment + gate work** that genuinely needs it: the **Rhea canon gate**, Mags EIC crons, deep review. NOT for grunt or bulk generation.
- **Grunt / writing / bulk → OpenRouter + DeepSeek.** Proven cheap and canon-capable (DeepSeek ~500× cheaper than Sonnet at compose parity). Move API usage **off the Anthropic workbench** except the reserved judgment/gate cases.
- **Check OpenRouter for best-model-per-task** rather than defaulting to one model — pick the cheapest model that clears the bar for each job.
- **House guests:** Kimi, Codex, Grok (different-eyes secondaries); Antigravity/Gemini (reviewed-before-ships). Aider retired from disk (S332).
- **Friction is an agent/stance property, not a model or tool property (S332):** Jax-caliber accountability writing comes from running the `freelance-firebrand` agent skill (adversarial stance), not from any particular CLI or premium model. The gold is reproducible on cheap models once the writer runs the right persona.

---

## 8. Subagent cost discipline (Mike-direct 2026-07-25; retiered S372, capped 2026-08-11)

**A lead never fans out to its own tier.** Subagents inherit the parent session's model by default — so a lead that spawns a `general-purpose`/`Explore`/Task agent silently gets a same-tier subagent unless it overrides `model`. That default-inheritance is the leak this rule plugs.

**Hard ceiling (Mike-direct 2026-08-11): no subagents above Sonnet, project-wide.** This caps fan-out from every seat, including Opus-led es — es itself runs Opus, but anything it spawns tops out at Sonnet.

- **Sonnet lead (research-build):** subagents → Haiku for grunt.
- **Opus lead (engine-sheet):** subagents → Sonnet for reasoning, Haiku for grunt. Never spawn Opus subagents, even though es itself runs Opus.
- **Fable:** runs as a dispatched job, not a lead that fans out further.
- **Civic/media (cron):** Haiku for the voice/desk roster, already tiered in agent frontmatter — unattended, no ad-hoc spawns to police.
- **Mechanism:** pass `model:` explicitly on every ad-hoc `Agent`/Task spawn. The named roster is already tiered in frontmatter; the gap is *ad-hoc* spawns silently defaulting to the expensive parent.
- **The one caveat — capability floor beats cost.** Default down a tier; escalate a subagent back up only when the subtask has a genuine reasoning floor (adversarial verify of a subtle canon call, a hard code review). Hard-forbidding same-tier can force a task onto a model that flubs it and the lead redoes it — false economy. **Cheaper-by-default, not cheapest-always.**

---

## Evolution & Maintenance
*As new models (e.g., Claude 5.x, Gemini 4.x) are introduced, or as local open-weights models become more capable, update this document to reflect shifting responsibilities. Always prioritize shifting "Chorus" and "Hands" tasks to the lowest viable cost-center while preserving the "Brain" for pure reasoning.*

---

## §History — superseded orderings, kept for incident context

_S332 inversion (superseded 2026-07-24):_ Mike-direct S332, after Claude/Mags (a) was wrong on Canon Tier, (b) shipped an underspecified starter instruction that cost a $1.82 misrun, (c) mis-attributed Fable's contamination to Codex, and (d) **deleted 21 real citizen-quote rows without approval** — while Codex caught Fable's `record:true` bug, caught its own wrong task, and used the correct terms — Codex was made lead and Claude the gated backup. Reversed 2026-07-24. The lesson stands regardless of ranking: **no destructive or state-changing action without explicit per-action approval** — "fix all this" is not blanket approval.

_2026-07-28 interim order (superseded 2026-08-15):_ Claude lead (Opus 4.8) / Kimi+Codex backup / Antigravity gated-proposal-only. Live terminal → model map at the time: research-build = Opus 4.8, engine-sheet = Fable, civic = Sonnet, media = Sonnet — the inverse of the current seat table, kept here only as a reference point for how far the restructure moved.

---

## Changelog

- 2026-08-17 (S377, research-build) — §4 antigravity entry expanded: standing role defined (deep-lore/world-bible generator, Chorus tier, feeds docs/entities/NotebookLM, never the edition pipeline — was previously described only by its gate, not its job), demonstrated-ability note from reading its actual quarantine output in full, and a model-routing correction backed by fresh benchmarks — Gemini 3.7 Flash (high) beats 3.1 Pro on the Artificial Analysis Intelligence Index (56 vs 48) at ~1/3 the cost, so agy work should default there instead of Pro. Added a standing "append track record here" convention rather than building a separate capability-tracking system. Mike-direct 2026-08-17: dispatched a new eval task to a live antigravity session same session (sparse-ledger citizen instead of a flagship, and a live model-switch test) — result not yet in when this entry was written.
- 2026-07-28 — Trued §6 to root `AGENTS.md`: corrected the binding-source pointer, made the Kimi/Codex ordinary writable scope exact, restored the engine-substrate and protected-history gates, and documented the own-`NEXT[...]`-line-only session-close exception.
- 2026-08-01 — Kimi: trued §3's stale Kimi label ("K2.6, cheap pay-as-you-go" → K3 / k3-256k lead + K2.7-code subagent tier, subscription 7-day quota + optional Extra Usage). Companion rule filed same day in `AGENTS.md` §Subagent cost discipline.
- 2026-08-15 (S372, Mike-direct) — Full restructure. Two live seats replace the four-terminal model map: rb = Sonnet 5/high (orchestrator + publish-pipeline gate), es = Opus 5/xhigh (workhorse, executes only). Fable reframed as a dispatched job, never a seat. Civic + media retired as live seats — cron-executed, rb designs/es executes. §4 renamed from "Backup CLIs" to "House guests," now covering Kimi/Codex/Grok/Antigravity: Grok reinstated (supersedes S332 retirement; the hallucination-rate concern is noted, not resolved), Antigravity's gate loosened from proposal-only to reviewed-before-ships. §8 lead-tier table retiered to match, with the 2026-08-11 "no subagents above Sonnet" ceiling folded in as the governing cap for both rb and es fan-out. Old orderings moved to §History for incident context.
