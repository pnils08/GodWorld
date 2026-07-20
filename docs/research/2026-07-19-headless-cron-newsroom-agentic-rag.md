---
title: Headless Cron Newsroom + Agentic RAG — research
created: 2026-07-19
updated: 2026-07-19
type: reference
tags: [research, architecture, media, infrastructure, active]
sources:
  - "Drive-ID 182GQGxrdbOUIc6dO-CJBZzcZ3zthG-Pa — 'The Bay Awakening.txt', Mike-shared S325 (created 2026-07-14). A chat (external assistant) sketching a cron-orchestrated headless newsroom."
  - "Agentic RAG — retrieval technique family (router/query-planning, reformulation, multi-hop, corrective-RAG, self-RAG). No single paper; the well-established pattern set as of 2026-01."
  - "scripts/discord-reflection.js — the live in-repo proof of both threads (cron→orchestrator→API-writer→persist, with a Phase-1 retrieve-decide loop)."
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (Watch List)"
  - "[[index]] — registered here, same commit"
  - "[[../MIGRATION_OFF_CLAUDE]] — cheap-model-per-task precedent (DeepSeek business desk beat Claude at ~1/25 cost)"
---

# Headless Cron Newsroom + Agentic RAG — research

**Source:** Two coupled inputs, Mike-shared/directed S325.
1. **"The Bay Awakening"** — Drive-ID `182GQGxrdbOUIc6dO-CJBZzcZ3zthG-Pa` (txt, 2026-07-14). A conversation with an external assistant sketching a headless newsroom: a midnight cron fires an orchestrator → **Mags decides the slate** (which stories, page-one, word budgets, "no crime lead") → each assignment becomes an API call to a reporter (mixed providers) → Mags edits → publishes `Edition.md`. Its one thesis: *the cron orchestrates, it doesn't write — the newsroom writes.*
2. **Agentic RAG** — the retrieval-technique family the doc's "Load world state" node implies: a model that drives the retrieval loop rather than a fixed embed→top-k→stuff pipeline.

**What this addresses:** Mike is exploring (exploratory, "nothing definitive") whether a cron could run the GodWorld newsroom the way the existing citizen-life crons already run, and separately whether agentic RAG could sharpen the project's queries — **gated on his crux: agentic RAG only earns its keep if a *cheaper* model does the focused retrieval well because the task is narrow.**

**What it does:**
- *Bay Awakening* proposes moving the newsroom from interactive (Discord/terminal-driven) to a standalone node/python orchestrator fired by cron, with each reporter and the editor as discrete provider-agnostic API calls, running unattended.
- *Agentic RAG* replaces static retrieval with a model-controlled loop: decide **if** to retrieve, **which** store, **reformulate** the query, **multi-hop** (retrieve→read→retrieve), and **self-check sufficiency** before composing.

**Extraction — what's usable:**

*Thread A — headless cron newsroom:*
- cron-as-orchestrator-not-writer → the automated edition path: the cron fires the newsroom, the newsroom writes. Correct framing.
- proof-pattern-already-live → `discord-reflection.js` / `citizen-wake.js` / `citizen-exchange.js` ARE cron→orchestrator→API-writer→persist, in production today. The skeleton is proven; scaling to a full edition is the work, not the scheduling.
- provider-split-per-reporter → each desk assignment is an independent API call → point each desk at the cheapest capable model. Precedent exists: [[../MIGRATION_OFF_CLAUDE]] (DeepSeek beat 3-pass Claude on the c87 business desk at ~1/25 cost).
- Mags-as-decider-node → the EIC becomes an API call returning the slate (stories, page-one, word budgets), decoupled from the interactive terminal EIC.
- guardrail-port-is-the-real-cost → canon-rule injection, the reviewer lanes (Rhea/Mara/Final Arbiter), and fourth-wall enforcement currently ride Claude Code's skill+subagent scaffolding. A raw-API cron orchestrator must re-host all of it outside Claude Code. `discord-reflection.js` sidesteps this only because a terrace reflection is near-zero canon-risk; an edition is not.

*Thread B — agentic RAG:*
- router/query-planning → "search before you guess" (GodWorld MCP → claude-mem → Supermemory) + the citizen-retrieval-tool-by-question rule become a model-decided route at query time, not a hardcoded sequence.
- query-reformulation → raw ask → good retrieval query ("the sick numbers" → "West Oakland health eligibility gap").
- multi-hop → name → household → neighborhood-state, retrieving at each step. The citizen-protagonism thread (one row's fate pulls related rows) needs exactly this.
- corrective-RAG → grade retrieved chunks; re-query if weak. Guards the curation-miss class already hit ("9%-sick reached zero C101 articles").
- self-RAG / sufficiency-check → "enough to answer, or keep retrieving?" before compose; stops thin-retrieval confidence.
- adaptive-world-state-load → the Bay Awakening "Load world state" node retrieves per-story (health story pulls health ledger + affected citizens; sports story pulls roster + game log) instead of dumping a fixed `world_summary`.
- **cheap-model-gate (Mike's crux, the viability condition)** → the narrow retrieval subtasks (route / reformulate / grade / sufficiency) are focused enough that a cheap model (Haiku / DeepSeek / Gemini) can do them reliably. That is the entire economic case: adaptive retrieval WITHOUT premium tokens. If any hop needs a premium model, the pattern loses to just loading more context.
- already-doing-a-primitive → `discord-reflection.js` Phase 1 is a retrieve-decide loop (`search_world` called up to 6×, model-chosen, then compose). It is the *shape* — but it runs on Sonnet, so it has the mechanism without the cheap-model economics yet.

**Not applicable / hazard:**
- **Thread A collides with standing decisions:** edition path FROZEN (S313), and Mike's "no edition runs, direct instruction only" (7/5). Headless-auto-newsroom is a *direction reversal*, not a gap-fill. Do NOT build off this file without Mike re-opening that posture.
- Thread A's real cost is guardrail-porting, not the cron. A naive cron edition would ship without canon/reviewer coverage — a regression, not progress.
- Thread B adds tokens + latency per query (multiple retrieval rounds). Unjustified on premium models or for exact-row fetches (`queryLedger.js` / `lookup_citizen` stay direct). Selective use only. **The cheap-model gate is the whole condition — if the retrieval model isn't cheap, this is `take-nothing`.**

**Verdict:** `watch` — exploratory, nothing definitive, and Thread A is blocked behind a standing-posture reversal only Mike can make.
- **Thread A adopt-trigger:** Mike re-opens the edition path for unattended/automated running (reverses the S313 freeze + no-run posture). Then it ignites a plan whose bulk is *porting the guardrails* into a standalone orchestrator, with the cron as the trivial part.
- **Thread B adopt-trigger:** a cheap-model retrieval eval — pick ONE narrow retrieval subtask (query-router or chunk-grader), test whether Haiku/DeepSeek/Gemini does it reliably on real GodWorld queries. If yes, it graduates to a plan; if the cheap model can't, take-nothing.

**Ignited plans:** none.

---

## Applications (living)

- 2026-07-19 (S325) — **Thread A first empirical run.** Built `scripts/cron-desk-writer.js` — a headless desk writer (raw Anthropic API + two-phase explore→compose tool loop, writes sandboxed to `output/cron-compare/`). Ran it on the c101 sports desk (Sonnet, same SKILL, same 4 tools). **Result: high-quality prose, catastrophic canon fidelity** — three distinct voices + three-layer threading, but it *confabulated the entire lead story* (invented closer "Robby Fenn" bullpen crisis), invented the GM ("Priya Devan" vs canon **Paulson**) and manager ("Dave Torres" vs canon **Deacon Seymour**), and ignored the real c101 events (Davis's return + HR tear, Buford Park→Yankees trade, Richards platoon, Reds sweep). Two causes: (1) harness read-cap truncated `world_summary_c101.md` before the sports events → writer never saw the real story; (2) no post-write canon reviewer (the terminal runs Rhea; the cron runs nothing). **Empirically confirms this file's core thesis — the cron is easy, porting the guardrails is the real work.** Fix (1) applied (inject full world state + forbid invention); fix (2) — a Rhea-equivalent canon gate — is the architectural lift a real headless newsroom needs. Cost signal: the raw tool loop is token-hungry (one section = 240k–620k input tokens depending on rabbit-holing); bounded explore + compose-from-digest is required to keep it sane.
- 2026-07-20 (S325) — **Thread A corrected rerun (fix #1 applied) — necessary but NOT sufficient.** Injecting the full world state fixed the NAMES but not the FACTS. The writer now uses real people (Martin Richards, Ernesto Quintero, Isley Kelley, Kevin Clark) and correctly casts **Paulson as GM** — but still confabulates EVENTS on top of them: it reported "Richards traded to the Mets for prospects" when the real c101 feed says **Buford Park** was traded to the **Yankees** and **Richards was moved to a platoon, not traded**; it invented a **90-29 record** (real: **71-25**); and — the insidious part — its own EVIDENCE block cited a nonexistent "Oakland_Sports_Feed C101 trade-recap" as the source. **Conclusion: the writer's self-reported sourcing is unreliable, so full-state injection alone can't be trusted — an independent canon/fact reviewer (Rhea-equivalent) is non-negotiable for a headless newsroom.** Fix #2 (the reviewer lane) IS the guardrail-port lift this file's thesis names — now confirmed across two runs. Right names, wrong facts: a headless writer will always need a fact-check gate it does not grade itself.

---

## Changelog

- 2026-07-19 — Initial extraction (S325). Two coupled Mike-shared inputs captured together: the Bay Awakening Drive doc (headless cron newsroom) + agentic RAG (the retrieval layer its world-state node implies). Verdict `watch` with two distinct triggers; cheap-model gate recorded as Thread B's viability condition per Mike-direct.
- 2026-07-19 — Thread A first test (Mike-direct S325): built + ran `scripts/cron-desk-writer.js`; empirical finding recorded in Applications (quality prose, canon confabulation without full state + a reviewer lane). Also proved the anti-staleness rule — crons read the sim-clock artifact (`world_summary_c{NN}`, written every cycle) not the edition-clock artifacts (desk workspace/`base_context`, frozen while editions paused).
