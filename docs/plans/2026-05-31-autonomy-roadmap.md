---
title: Autonomy Roadmap — Continuous Sim + Autonomous Agents (umbrella)
created: 2026-05-31
updated: 2026-05-31
type: plan
tags: [research, active]
sources:
  - "S248 conversation — Mike: 'steal the autonomous nature of their agents… ran them continuous… likely a way to automate 10 for a full day, would need to understand how that would work' + 'the newsroom is the simulation as well' + 'automation for the newsroom is greps and file access'"
  - "Emergence World (Emergence AI continuous-governance sim) — [[../RESEARCH]] §S248; Drive 1jHIkac1TuXaBBp2d3SuwfsnCAbMc7YYe"
  - "research.9 inter-agent conversation harness ([[../RESEARCH]] §S172, Solo MCP / Aaron Francis) — path-(a) build-our-own approved S172"
  - "scripts/spacemolt-miner.js — existence-proof autonomous-agent-loop already in-repo (pm2-managed)"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout row research.12"
  - "[[index]] — register here in same commit"
  - "[[ARCHITECTURE_VISION]] — Jarvis + persistent-sessions north star (the continuous-running infrastructure half)"
  - "[[PRODUCT_VISION]] — civic layer / desk scope / game layer / porosity (the WHAT)"
  - "project_city-for-bots-pivot (memory, S114) — the product framing: AI bots inhabit a city, AI newsroom covers them; moat SpaceMolt lacks"
  - "project_gpu-is-go-live-gate (memory) — hardware is the scale threshold between manual and autonomous"
  - "[[plans/2026-05-30-citizen-lifecycle-fame-system]] (engine.29) + [[engine/LEDGER_REPAIR_HOUSEHOLDS]] (engine.5) — deterministic continuous citizen life (the cheap substrate)"
  - "[[POST_MORTEM_C92_CONTAMINATION]] — the drift event autonomy amplifies; canon-fidelity layer is the answer"
  - "[[canon/CANON_RULES]] + [[canon/INSTITUTIONS]] — the scaffold that must hold harder as horizon grows"
  - "[[plans/2026-05-28-gemini-offload-pattern]] (governance.21) — adjacent token-budget lever, not part of autonomy"
---

# Autonomy Roadmap — Continuous Sim + Autonomous Agents (umbrella)

**Goal:** A single tracked home for the autonomous-GodWorld direction — sequencing the moves from today's editor-orchestrated cycles toward a continuously-running world with autonomous inhabitants, with each move's gate named. This plan is the **steering doc**; the specific sub-projects (engine continuity, inter-agent harness, citizen-agent PoC) keep their own rows and pointers.

**Architecture:** Three layers, sequenced cheapest-and-safest first. (1) **Engine-continuous** — the ~1,366 ledger citizens move every cycle deterministically (aging, marriage, birth, fame, death) via engine.5/.29; near-zero marginal cost, no LLM-per-citizen, canon scaffold stays between model and world. (2) **Newsroom-autonomous** — the 26 newsroom + civic-voice agents run unattended on grep + file access (Mike S248: "the automation for the newsroom is greps and file access"); the agents already exist with four-file identities, so this is loop + tool-access, not new infrastructure — but it's the layer where drift is most expensive, so reviewer lanes must fire every cycle. (3) **Citizen-autonomous** — N citizens as live agent loops (the Emergence World / SpaceMolt parallel, the real prize); gated on hardware + token cost, proven first by a 1–2 citizen PoC before any ten-for-a-day run. **Key correction (S248, Mike):** the newsroom is itself part of the simulation — reporters and civic voices are characters who live in the world, not a camera on it; "autonomous agents" therefore spans both the newsroom (Layer 2) and the inhabitants (Layer 3), which are different builds.

**Terminal:** research-build (this umbrella + PoC design + roadmap stewardship). Engine-sheet owns the engine-continuous substrate (engine.5/.29) + any harness build. Sub-project execution routes to its own row's terminal.

**Pointers:**
- Existence proof: `scripts/spacemolt-miner.js` — an autonomous agent loop already runs in this repo under pm2 (wake → load state → act → sleep → repeat). SpaceMolt's own ~700 user-agents are this exact shape; it's the city-for-bots inspiration. The mechanism for "10 for a full day" is not exotic — it's this loop × 10 on a timer.
- Design already written: research.9 ([[../RESEARCH]] §S172) is the inter-agent harness design, path-(a) build-our-own approved by Mike S172, with the cheap PoC spelled out (1 citizen + 1 reporter, throwaway output, analyze-only).
- Substrate already in flight: engine.5 (household + family sim) + engine.29 (citizen lifecycle & fame) — deterministic continuous citizen life. This is Layer 1, and it's the bridge that delivers most of the Emergence-World "world that moves on its own" feel at a fraction of the cost.

**Acceptance criteria:**
1. This plan exists, registered in `docs/index.md`, filed as ROLLOUT `research.12`, and is referenced as the umbrella from research.9's entry (so the autonomy threads cross-link to one steering doc).
2. The three layers are sequenced with explicit gates; no layer is scheduled as a build here — this is the tracking + sequencing doc, and each layer promotes to execution only on Mike's go-ahead.
3. The four "things to understand first" for citizen-autonomy (character-hold, canon-sync-at-wake, token bill, output usability) are captured as the PoC's measured questions, lifted from research.9.

---

## The three layers (sequenced)

### Layer 1 — Engine-continuous (cheapest, lowest canon risk, in flight now)

The ~1,366 ledger citizens move every cycle by deterministic engine code — no LLM per citizen. Aging, marriage, birth, promotion, fame rise/decay, death-by-age. The world changes on its own; the newsroom has emergent material to cover before any citizen is a live agent.

- **Status:** IN FLIGHT — engine.5 (`[[engine/LEDGER_REPAIR_HOUSEHOLDS]]`) + engine.29 (`[[plans/2026-05-30-citizen-lifecycle-fame-system]]`). Track 1 of engine.29 (milestones mutate structural state) shipped S248, deploy held for C96.
- **Gate to next:** none — this is foundational and proceeds on its own rows. Most of the "autonomy feel" lands here cheaply.
- **Why first:** delivers continuous-world motion without tripping the drift wire Emergence World + C92 both document. Canon scaffold still sits between model and world.

### Layer 2 — Newsroom-autonomous (the 26 agents, loop + grep)

Run the reporters / civic voices / reviewers unattended — they wake, read state via grep + file access, decide coverage, produce, get reviewed, sleep. Mike S248: the newsroom IS the simulation (reporters are in-world characters), and its automation is greps + file access, not new tooling.

- **Status:** NOT STARTED. Agents exist (four-file identities, pipeline runs them today under editor orchestration). The move is: replace editor-per-cycle orchestration with a loop.
- **Gate:** reviewer lanes (Rhea / cycle-review / Mara / capability / Final Arbiter) must fire **every** autonomous cycle, not on-demand — unattended generation without per-cycle eval is exactly the 183-crimes-in-4-days / C92 failure mode. Confirm the gen-eval chain is loop-safe before removing the human-in-loop editor step.
- **Cost note:** the reviewer chain is already the expensive part of a cycle; autonomy multiplies cycle count, so this layer's token bill is real even though the agents themselves run on file access.

### Layer 3 — Citizen-autonomous (the inhabitants, the real Emergence parallel)

N citizens as live agent loops (spacemolt-miner shape): wake → load my ledger row + neighborhood + recent canon → decide one action → write it → sleep → repeat. The newsroom (Layer 2) covers what emerges. This is the city-for-bots pivot (S114) and the SpaceMolt-plus-narrative moat.

- **Status:** NOT STARTED, long-term at our population size. **First concrete step is NOT the harness — it's the research.9 PoC:** 1–2 citizens, short window (~1 hour), output to a throwaway file, nobody publishes, analyze-only.
- **Why 1–2 for an hour, not 10 for a day:** failure shows up early (Grok hit 183 crimes in 4 days — the break is visible fast). Learn character-hold + drift rate + token bill at near-zero cost before committing to the harness or the bill of ten.
- **The four questions the PoC must answer (from research.9 / S172):**
  1. **Character-hold** across a full window — does the citizen stay in voice, or drift by turn 3?
  2. **Canon-sync at wake** — each agent must reload the same ledger/neighborhood/canon state or they diverge immediately.
  3. **Token bill** — N wakes × agents × context-reload-per-turn. This is the real cost question and the reason it's 10, not 1,366.
  4. **Output usability** — does what they produce become engine signal / newsroom source, or noise needing a post-processor?
- **Gate:** GPU / hardware (`project_gpu-is-go-live-gate`) for any at-scale run; + the drift-amplification finding (the harder you push autonomy over long horizons, the more load-bearing the canon layer becomes — Emergence World is external evidence, C92 is our scar). Real harness build is research.9 path-(a), promote to its own execution plan when the PoC says go.

---

## Open questions

- [ ] **research.9 preconditions — are they met?** S172 gated the real inter-agent test on Phase 39 reviewer chain + Phase 40 injection defense closing. Spine table (S147/S148/S156) shows 39.x + 40.1/40.6 DONE; 40.2 cattle refactor (engine.1) is the one possibly-open piece. Verify whether 40.2 actually gates the PoC or only the at-scale build before scheduling Layer 3's PoC.
- [ ] **Layer 2 vs Layer 3 ordering** — is autonomous-newsroom (cover an engine-continuous world) the right next reach after Layer 1, with citizen-agents deferred to the hardware gate? Or does a 1–2 citizen PoC (Layer 3 toe-dip) come first because it's cheap and answers the bigger question? Current lean: Layer 1 proceeds; Layer 3 PoC is the cheapest *learning*; Layer 2 full autonomy is the bigger *build*. Mike's call on sequence.
- [ ] **Does the newsroom-is-sim framing change the reviewer model?** If reporters are in-world characters acting autonomously, reviewer lanes are auditing characters who can now surprise each other (research.9 council-chamber scenario) — drift inside a live multi-agent exchange is harder to catch than drift in a single rendered voice. Reviewer-chain-at-conversation-scope is its own future problem (S172 flagged it as Phase 44+).
- [ ] **PoC output isolation** — confirm zero ingest path from PoC artifacts to bay-tribune / world-data / editions (S172 locked this; re-confirm at PoC-schedule time).

---

## Changelog

- 2026-05-31 (S248) — Initial draft. Mike S248 directive: write a plan.md following the template that serves as the umbrella for the autonomous concepts we're already working toward, referencing the MDs that have been tracking them, so we track this better. Consolidates threads previously scattered across: research.9 (inter-agent harness, S172), Emergence World eval (RESEARCH §S248), engine.5 + engine.29 (deterministic citizen continuity), city-for-bots pivot (S114 memory), ARCHITECTURE_VISION (Jarvis/persistent-sessions), GPU-gate memory, spacemolt-miner (in-repo existence proof). Filed as research.12. Two Mike corrections folded in: (a) the newsroom IS the simulation — reporters/voices are in-world characters, so "autonomous agents" spans Layer 2 (newsroom) + Layer 3 (inhabitants), different builds; (b) newsroom automation is greps + file access, not new tooling. NOT a build schedule — sequencing + gate-tracking only; each layer promotes on Mike's go-ahead.
