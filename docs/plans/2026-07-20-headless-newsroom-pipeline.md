---
title: Headless Newsroom + City-Hall Pipeline Plan
created: 2026-07-20
updated: 2026-07-20
type: plan
tags: [architecture, media, civic, infrastructure, active]
sources:
  - "[[../research/2026-07-19-headless-cron-newsroom-agentic-rag]] — research basis (both threads, empirical runs, Feedback1.txt validation)"
  - "Drive 182GQGxrdbOUIc6dO-CJBZzcZ3zthG-Pa (The Bay Awakening) + 1jAuBUfXspDCbfRaspjXSp3Mon7-MgUfu (Feedback1.txt) — Mike-shared S325"
  - "scripts/cron-desk-writer.js — writer-worker prototype, proven c101 sports S325"
  - ".claude/agents/source-search/SKILL.md — retrieval layer (S326); .claude/agents/rhea-morgan — canon gate"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Headless Newsroom + City-Hall Pipeline Plan

**Goal:** A cron-orchestrated run that turns a completed engine cycle into a canon-gated, scored, published edition (and city-hall record) with **no human or Claude Code in the loop** — where model choice per desk is a config line, not an architecture change.

**Architecture:** A standalone node orchestrator, fired by cron after a cycle completes, chains pieces that mostly already exist: load current world state (`world_summary_c{N}.md`, sim-clock) → Mags slate/`/sift` → per-desk **writer crons** (`cron-desk-writer.js`, model per desk) → optional `source-search` verified retrieval → **headless Rhea** canon/fact gate → assemble → `/post-publish` → ingest. The NEW build is three things: (1) the **orchestrator** that chains them headless, (2) **Rhea running headless** as a hard gate (the "fix #2" the run-1 experiment flagged), (3) a **per-run scorecard** so quality is measured, not vibed. It replaces interactive terminal-driven edition production with scheduled workers; the interactive path stays runnable.

**Execution surfaces (S325 decision):** work splits across two headless surfaces, and the cron picks the right one per stage. **Writing → raw-API node cron** (`cron-desk-writer.js`) — cheap, provider-swappable, composition from injected state, no heavy tools. **Verification/gating + retrieval (Rhea, source-search) → Claude Code headless** (`claude -p` / Agent SDK) — needs robust tool use + GodWorld MCP + the reviewer-lane scaffolding, which raw-API loops do poorly. The cron is only the orchestrator; it fires each stage on its correct surface.

**Terminal:** research-build (design + orchestrator/harness scripts — apparatus). Handoffs: **engine-sheet** owns cron wiring + world-state artifacts; **media** owns desk voices + Rhea content (unchanged — the workers *load* them); **civic** owns city-hall agents (unchanged). Per the media/civic-never-build rule, all script/orchestrator building is research-build/engine-sheet; media/civic content files are loaded, not rebuilt.

**Pointers:**
- Prior work: `scripts/cron-desk-writer.js` (writer-worker, two-phase explore→compose, `--provider anthropic|openrouter`, model-slug output, sandboxed to `output/cron-compare/`)
- Retrieval: `.claude/agents/source-search/SKILL.md` (Haiku, verified retrieval, S326)
- Canon gate: `.claude/agents/rhea-morgan/` (existing reviewer agent)
- Research basis: [[../research/2026-07-19-headless-cron-newsroom-agentic-rag]]

**Acceptance criteria** (the 4 Feedback1.txt milestones + the scorecard):
1. A cron reliably wakes the writer for a completed cycle with no human prompt.
2. The writer retrieves the correct current world state and stays in reporter voice.
3. Each draft passes a **headless Rhea** canon/fact gate; fabrications and immersion leaks (e.g. the DeepSeek "78 OVR") are flagged and withheld, not published.
4. Every run emits a **scorecard**: reporter-voice ✓/✗, facts-from-world-state ✓/✗, human-edits Low/Med/High, word-count ✓/✗, hallucination count, runtime s, API $.
5. Over N runs the output is **edit-not-rewrite** quality (scorecard human-edits trends Low/Med).

---

## Tasks

### Phase 1 — single-desk gated + scored loop (research-build)

The provable increment: one desk produces a **scored, canon-gated** headless draft. Proves milestones 3–4 on the piece already working (milestones 1–2 proven S325).

#### Task 1: Scorecard on the writer-worker  *(build now, S325)*
- **Files:** `scripts/cron-desk-writer.js` — modify
- **Steps:**
  1. After the section is produced, run one no-tools scoring call (same provider) that reads the draft + the injected world state and returns strict JSON: `{ reporterVoice: bool, factsCorrect: bool, hallucinations: [{claim, why}], wordCount: int, notes }`.
  2. Merge with the run-meta already emitted (turns, `usageInputTokens/OutputTokens`, `durationMs`) + a computed `apiCostUsd` (per-model rate table) into `output/cron-compare/<desk>_c<cycle>_<slug>.scorecard.json`.
  3. Print the scorecard to stdout at end of run.
- **Verify:** `node scripts/cron-desk-writer.js --desk sports` → a `*.scorecard.json` exists with all 7 fields populated.
- **Status:** [x] DONE (S325). Built + verified (DeepSeek run emitted all 7 fields, `apiCostUsd` computed). **Finding:** the self-score is lenient — DeepSeek graded itself "0 hallucinations / factsCorrect:true" despite its "78 OVR" leak. Self-score is a cheap signal only; the authoritative fact/canon check is Task 2 (independent headless Rhea).

#### Task 2: Headless Rhea canon/fact gate  *(CLI surface, not raw-API — S325 decision)*
**Surface decision (Mike Q, S325):** Rhea runs at the **Claude Code headless** level (`claude -p` / Agent SDK), NOT as a raw-API node cron like the writer. Rationale: canon verification is tool-heavy (Read/Grep + GodWorld MCP `lookup_citizen`/`search_canon`); raw-API tool loops rabbit-hole (the writer burned 617k tokens) and can't reach MCP. Claude Code's harness does tools+MCP reliably. Precedent: `source-search` (S326) is exactly this — a Claude Code subagent doing verified work headlessly. Aligns with the standing "reviewers-first for external execution infra" rule. (Fully Claude-Code-independent raw-API Rhea = a later, bigger canon-lookup port; deferred.)
- **Files:** `scripts/cron-rhea-gate.sh` (or a small node wrapper) — create (needs Mike approval — new file). Wraps a `claude -p` headless invocation of the existing `.claude/agents/rhea-morgan` agent.
- **Steps:**
  1. Orchestrator invokes Claude Code headless (`claude -p`) pointing the `rhea-morgan` agent at the draft + `world_summary_c{N}.md` + `docs/canon/CANON_RULES.md`, with its normal tools + MCP.
  2. Rhea returns strict JSON `{ pass: bool, flags: [{claim, issue, severity}] }` — flags every claim not grounded in world state/canon + immersion leaks (engine/game language, e.g. "78 OVR").
  3. Save `output/cron-compare/<desk>_c<cycle>_<slug>.rhea.json`.
- **Verify:** run it on `output/cron-compare/sports_c101_deepseek-deepseek-chat.md` → flags the "78 OVR" game-stat leak and the invented fan name (which the writer's self-score missed).
- **Status:** [ ] not started

#### Task 3: Per-desk model routing config
- **Files:** `scripts/desk-model-map.json` — create
- **Steps:**
  1. Map `desk → {provider, model}` per Feedback1.txt routing: voice-critical desks (sports lead, Mags, editorial, investigative) → `anthropic/claude-sonnet-5`; routine desks (business, culture, letters, standings/notebook) → `openrouter/deepseek-chat`.
  2. `cron-desk-writer.js` reads this map keyed by `--desk` (CLI `--provider/--model` still override).
- **Verify:** `node scripts/cron-desk-writer.js --desk business` → runs on DeepSeek per the map without an explicit `--provider`.
- **Status:** [ ] not started

#### Task 4: Chain one desk end-to-end
- **Files:** `scripts/cron-desk-run.js` — create
- **Steps:** write (Task 1 harness) → Rhea gate (Task 2) → if `pass`, save to a `published/` staging dir; else save to `flagged/` with the Rhea flags. Emit the combined scorecard.
- **Verify:** one invocation yields a draft + scorecard + rhea verdict, routed to `published/` or `flagged/`.
- **Status:** [ ] not started

### Phase 2 — orchestrator / full edition  *(research-build + engine-sheet; split to sub-plan when picked up)*
Mags slate (`/sift` headless) → fan-out ALL desks (per `desk-model-map`) → per-draft Rhea gate → assemble edition → `/post-publish` → ingest. A single cron entry. Acceptance: one cron run produces a full gated edition from a completed cycle.

### Phase 3 — city-hall headless  *(civic content, research-build infra; sub-plan)*
Multi-cycle city-hall cron: agenda prep → council voices → votes → feed the sift. Mirrors the writer-worker shape on civic agents.

### Phase 4 — 100-run scorecard eval  *(sub-plan)*
Aggregate scorecards across editions to answer Feedback1.txt's question per desk: is DeepSeek "90% as good for 20% of the cost," or does Sonnet earn its premium here?

---

## Open questions

- [ ] **Rhea-flag disposition** (blocks Task 4 final behavior): a flagged draft → auto-reject + regenerate, or route to a human-edit queue? Default proposed: `flagged/` staging for human review first, no auto-regenerate until trust is established.
- [ ] **Publish target under the re-opening freeze** (blocks Phase 2): does the headless edition publish live, or to a review holding area? The S313 freeze is only now re-opening via Mike's direction — proposed default is holding-area until the scorecard shows edit-not-rewrite quality.
- [ ] **Which desks are "voice-critical" vs "routine"** (blocks Task 3): Feedback1.txt names Hal Richmond/Mags/investigative/editorial as Sonnet; confirm the full split with Mike.

---

## Changelog

- 2026-07-20 — Initial draft (S325). Research basis [[../research/2026-07-19-headless-cron-newsroom-agentic-rag]]; ignited by Mike's full-pipeline direction + Feedback1.txt validation. Phase 1 concrete (scorecard building this session); Phases 2–4 outlined to split into sub-plans when picked up.
