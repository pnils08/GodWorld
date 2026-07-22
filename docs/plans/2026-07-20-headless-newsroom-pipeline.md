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
  - "[[engine/archive/ROLLOUT_PLAN]] — parent rollout"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Headless Newsroom + City-Hall Pipeline Plan

**Goal:** A continuous headless newsroom — journalists + city-hall voices go to work **M–F** (each wake finds an angle and writes gated articles that ingest to canon daily), and **Mags compiles the week's top stories into a Saturday edition** — with **no human or Claude Code in the loop**, where model choice per desk is a config line, not an architecture change.

**Architecture:** A standalone node orchestrator, fired by cron after a cycle completes, chains pieces that mostly already exist: load current world state (`world_summary_c{N}.md`, sim-clock) → Mags slate/`/sift` → per-desk **writer crons** (`cron-desk-writer.js`, model per desk) → optional `source-search` verified retrieval → **headless Rhea** canon/fact gate → assemble → `/post-publish` → ingest. The NEW build is three things: (1) the **orchestrator** that chains them headless, (2) **Rhea running headless** as a hard gate (the "fix #2" the run-1 experiment flagged), (3) a **per-run scorecard** so quality is measured, not vibed. It replaces interactive terminal-driven edition production with scheduled workers; the interactive path stays runnable.

**Execution surfaces (S325 decision):** work splits across two headless surfaces, and the cron picks the right one per stage. **Writing → raw-API node cron** (`cron-desk-writer.js`) — cheap, provider-swappable, composition from injected state, no heavy tools. **Verification/gating + retrieval (Rhea, source-search) → Claude Code headless** (`claude -p` / Agent SDK) — needs robust tool use + GodWorld MCP + the reviewer-lane scaffolding, which raw-API loops do poorly. The cron is only the orchestrator; it fires each stage on its correct surface.

**Cadence — continuous newsroom, weekly edition (S325 refinement, Mike-direct):** NOT one monolithic edition per cycle. Instead: **M–F, per-wake, each journalist and city-hall voice goes to work** — wakes, uses `source-search` to find an angle in its beat, and writes one or more articles. Each article passes the Rhea gate and **ingests to canon as it's written** (stories become the world daily). Multiple reporters × multiple wakes cover a storyline from several angles across the week (civic's N storylines → N+ articles over M–F). **Saturday: Mags compiles** — curates the week's canon stories into the edition (a curation of what already happened, not a fresh generation). This decouples *writing* (continuous, distributed, cheap-per-article) from *edition assembly* (weekly, curatorial), and reuses the existing citizen-wake cron infra (5 wakes/day) as the journalist/voice wakes. Real-time cadence (M–F/Sat crons); sim-time content (whatever cycles occur that week). The journalists/voices are citizens with jobs — fits the give-the-citizens-a-life doctrine.

**Terminal:** research-build (design + orchestrator/harness scripts — apparatus). Handoffs: **engine-sheet** owns cron wiring + world-state artifacts; **media** owns desk voices + Rhea content (unchanged — the workers *load* them); **civic** owns city-hall agents (unchanged). Per the media/civic-never-build rule, all script/orchestrator building is research-build/engine-sheet; media/civic content files are loaded, not rebuilt.

**Pointers:**
- Prior work: `scripts/cron-desk-writer.js` (writer-worker, two-phase explore→compose, `--provider anthropic|openrouter`, model-slug output, sandboxed to `output/cron-compare/`)
- Retrieval: `.claude/agents/source-search/SKILL.md` (Haiku, verified retrieval, S326)
- Canon gate: `.claude/agents/rhea-morgan/` (existing reviewer agent)
- Research basis: [[../research/2026-07-19-headless-cron-newsroom-agentic-rag]]

**Acceptance criteria** (the 4 Feedback1.txt milestones + the scorecard):
1. A cron reliably wakes the writer for a completed cycle with no human prompt.
2. The writer retrieves the correct current world state and stays in reporter voice.
3. Each draft passes a **headless Rhea** canon/fact gate; fabrications and **engine-metric** leaks (per `newsroom.md`: tension score, civic load, raw dials, system language — NOT sports-game stats like OVR, which are canon) are flagged and withheld, not published.
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
- **Status:** [x] DONE (S325). Built + verified (DeepSeek run emitted all 7 fields, `apiCostUsd` computed). **Finding (validated by Task 2):** a writer grading its OWN draft can't be the authoritative fact-check — DeepSeek's self-score said "0 hallucinations / factsCorrect:true", but the independent headless Rhea (Task 2) then found 2 HIGH issues on the same draft (3 invented quote-sources + raw engine Mood/FanSentiment leaks). Self-score is a cheap dashboard only; the authoritative check is the independent gate. *(NOTE S325: an earlier version cited a DeepSeek "78 OVR leak" as the proof — wrong; OVR is real sim data. The correct evidence is above.)*

#### Task 2: Headless Rhea canon/fact gate  *(CLI surface, not raw-API — S325 decision)*
**Surface decision (Mike Q, S325):** Rhea runs at the **Claude Code headless** level (`claude -p` / Agent SDK), NOT as a raw-API node cron like the writer. Rationale: canon verification is tool-heavy (Read/Grep + GodWorld MCP `lookup_citizen`/`search_canon`); raw-API tool loops rabbit-hole (the writer burned 617k tokens) and can't reach MCP. Claude Code's harness does tools+MCP reliably. Precedent: `source-search` (S326) is exactly this — a Claude Code subagent doing verified work headlessly. Aligns with the standing "reviewers-first for external execution infra" rule. (Fully Claude-Code-independent raw-API Rhea = a later, bigger canon-lookup port; deferred.)
- **Files:** `scripts/cron-rhea-gate.sh` (or a small node wrapper) — create (needs Mike approval — new file). Wraps a `claude -p` headless invocation of the existing `.claude/agents/rhea-morgan` agent.
- **Steps:**
  1. Orchestrator invokes Claude Code headless (`claude -p`) pointing the `rhea-morgan` agent at the draft + `world_summary_c{N}.md` + `docs/canon/CANON_RULES.md`, with its normal tools + MCP.
  2. Rhea returns strict JSON `{ pass: bool, flags: [{claim, issue, severity}] }` — flags every claim not grounded in world state/canon + **engine-metric** leaks (tension score, civic load, raw dials, system language per `newsroom.md`). Does NOT flag legitimate sports-game stats (OVR/overall ratings, records — canon).
  3. Save `output/cron-compare/<desk>_c<cycle>_<slug>.rhea.json`.
- **Verify:** run it on a draft with a *known* canon violation (e.g. a wrong GM or a genuine engine-metric leak) → Rhea flags it; run it on the accurate c101 sports draft → passes. (Do NOT use "OVR"/"Amara" as violations — both are canon.)
- **Status:** [x] DONE (S325). Built `scripts/cron-rhea-gate.js` (claude -p wrapper of rhea-morgan, strict-JSON verdict, exit 0/2/3). Verified on the c101 DeepSeek draft: completed in **139s, $0.76 (Sonnet)**, valid verdict. **Rhea correctly did NOT flag OVR/overall ratings** (her summary: "legitimate canon stats, not leaks") and passed all real facts — but caught 2 HIGH issues the writer's self-score missed: (1) **3 invented named quote-sources** (Marcus Wong / Carlos Nuñez / Lupe Hernandez — no ledger match); (2) **raw engine `Mood`/`FanSentiment` field leaks** lifted into prose (the actual newsroom.md leak class). **Proves the independent-gate thesis** — self-score said "0 hallucinations," the independent gate found real fabrications. Cost: $0.76/run Sonnet — **Haiku-tunable** per the source-search precedent (~3-4× cheaper) if quality holds.

#### Task 3: Per-desk model routing config
- **Files:** `scripts/desk-model-map.json` — create
- **Steps:**
  1. Map `desk → {provider, model}` per Feedback1.txt routing: voice-critical desks (sports lead, Mags, editorial, investigative) → `anthropic/claude-sonnet-5`; routine desks (business, culture, letters, standings/notebook) → `openrouter/deepseek-chat`.
  2. `cron-desk-writer.js` reads this map keyed by `--desk` (CLI `--provider/--model` still override).
- **Verify:** `node scripts/cron-desk-writer.js --desk business` → runs on DeepSeek per the map without an explicit `--provider`.
- **Status:** [x] DONE (S325). `scripts/desk-model-map.json` built; `cron-desk-writer.js` reads it keyed by `--desk` (CLI overrides win). Verified: business → DeepSeek automatically.

#### Task 4: Chain one desk end-to-end
- **Files:** `scripts/cron-desk-run.js` — create
- **Steps:** write (Task 1 harness) → Rhea gate (Task 2) → if `pass`, save to a `published/` staging dir; else save to `flagged/` with the Rhea flags. Emit the combined scorecard.
- **Verify:** one invocation yields a draft + scorecard + rhea verdict, routed to `published/` or `flagged/`.
- **Status:** [x] DONE (S325). `scripts/cron-desk-run.js` chains writer → gate → route + a combined `.run.json`. Verified: business desk → DeepSeek write ($0.003) → **Haiku gate** ($0.145) → routed to `flagged/` (3 high-severity invented numeric claims). **Bonus — Haiku-gate cost test passed:** ~5× cheaper than Sonnet ($0.145 vs $0.76) and still caught fabrications the writer self-score missed. Phase 1 COMPLETE (Tasks 1–4).

### Phase 2.0 — angle assignment (NEXT staged build, Mike-direct S325)  *(research-build; the daily rhythm's first step)*
A daily assignment pass over the **31-name journalist roster + beat map**: read the open storylines (civic/sports/culture/…), assign angles to reporters so N reporters don't all write the same one, and hand each reporter its angle. Reporters may **take the assigned angle or generate their own**. Depends on: **byline deep-fix (31-name roster + beat map)** + **PoolKey policy** — both research-build/W5 (`.claude/agents/REPORTER_DESK_INDEX.md` is the current roster). Feeds Phase 2 (the reporter wakes carry an assigned angle into `cron-desk-run.js`). Build after Phase 1 is tied up.

### Phase 2 — daily writer-wakes → canon accrual (M–F)  *(research-build + engine-sheet; split to sub-plan)*
The continuous half. A per-wake cron (reuse the citizen-wake schedule) that, for each active journalist: pick an open storyline/angle in the beat (via `source-search`), write 1+ articles (Task 4 chain per article, model per `desk-model-map`), Rhea-gate each, and **ingest passing articles to canon** (the article becomes world state; flagged → `flagged/`). Runs M–F. Acceptance: over a week, N civic storylines yield N+ canon-ingested, gated articles from multiple angles, no human prompt.

### Phase 2b — Saturday edition compile  *(research-build; sub-plan)*
The curatorial half. A Saturday cron where **Mags compiles**: `/sift`-style curation over the week's canon-ingested articles → pick the top stories → assemble edition → `/post-publish`. The edition is a curation of what already hit canon, not a fresh generation. Acceptance: one Saturday run produces an edition from the week's accrued canon articles.

### Phase 3 — city-hall headless (daily)  *(civic content, research-build infra; sub-plan)*
Same continuous model on the civic side: city-hall voices/agents wake M–F, work the active civic storylines (agenda → positions → votes as they occur), articles ingest to canon and feed Mags' Saturday compile. Mirrors the writer-worker shape on civic agents.

### Phase 4 — scorecard eval + cost tuning  *(sub-plan)*
Aggregate scorecards across the accrued articles to answer Feedback1.txt's per-desk question (is DeepSeek "90% for 20%?"). Includes the Haiku-vs-Sonnet Rhea-gate cost test (gate is $0.76/run on Sonnet; source-search proved Haiku parity for verified work).

---

## Open questions

- [ ] **Rhea-flag disposition** (blocks Task 4 final behavior): a flagged draft → auto-reject + regenerate, or route to a human-edit queue? Default proposed: `flagged/` staging for human review first, no auto-regenerate until trust is established.
- [ ] **Publish target under the re-opening freeze** (blocks Phase 2): does the headless edition publish live, or to a review holding area? The S313 freeze is only now re-opening via Mike's direction — proposed default is holding-area until the scorecard shows edit-not-rewrite quality.
- [ ] **Which desks are "voice-critical" vs "routine"** (blocks Task 3): Feedback1.txt names Hal Richmond/Mags/investigative/editorial as Sonnet; confirm the full split with Mike.
- [ ] **Canon-ingest mechanism** (blocks Phase 2): how does a gated article "hit canon" — which store (Supermemory/canon container? a canon articles ledger? the sim ledger?) and in what form (full text? claims? a storyline update?), so Mags' Saturday compile and future reporters can retrieve it. Needs a design pass.
- [x] **Angle assignment** — RESOLVED (Mike-direct S325): a dedicated **assignment stage** assigns the 31-name journalist roster (per beat map) to angles from the open storylines; each reporter then **uses its assigned angle OR generates its own**. This is the next staged build after Phase 1 is tied up → see Phase 2.0. Depends on the **byline deep-fix (31-name roster + beat map)** and **PoolKey policy** — both research-build/W5. Current roster: `.claude/agents/REPORTER_DESK_INDEX.md`.

---

## Changelog

- 2026-07-20 — Initial draft (S325). Research basis [[../research/2026-07-19-headless-cron-newsroom-agentic-rag]]; ignited by Mike's full-pipeline direction + Feedback1.txt validation. Phase 1 concrete (scorecard building this session); Phases 2–4 outlined to split into sub-plans when picked up.
