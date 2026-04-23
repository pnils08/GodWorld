---
title: Memento CBR Case-Bank Plan
created: 2026-04-21
updated: 2026-04-21
type: plan
tags: [architecture, research, active]
sources:
  - docs/research/papers/Memento_fine_tuning.pdf (Zhou et al., arXiv:2508.16153v2, Aug 2025)
  - https://github.com/Agent-on-the-Fly/Memento
  - docs/RESEARCH.md §"S170 — Adaptive Thinking Doc + Scan Correction" (adjacent research, same session)
  - docs/research4_1.md (bounded-memory shelf this extends)
  - docs/engine/PHASE_39_PLAN.md (reviewer chain producing the reward signal this plan captures)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (entry under Other Ready Work)"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
  - "[[research4_1]] — bounded-memory research this plan operationalises"
  - "[[concepts/case-based-reasoning]] — concept doc created by Phase 1 (does not exist until Task 1.1)"
---

# Memento CBR Case-Bank Plan

**Goal:** Stand up reviewer-chain reward-tuple capture now, so a future case-based retrieval policy (Memento-style) has data to train on when we're ready to build it.

**Architecture:** Four phases. Phase 1 lands the CBR-vs-RAG concept framing (cheap, immediate editorial-thinking value). Phase 2 wires the existing reviewer-chain outputs (Rhea / cycle-review / Mara / Final Arbiter) into a durable `(state, action, reward)` tuple store — this has standalone value even if Memento never ships, because structured reward-signal capture is how any learned-retrieval or feedback-loop work becomes possible later. Phase 3 is passive data accumulation across cycles. Phase 4 is the evaluation + Shape B build (CBR retrieval as a packet-builder enhancement in `buildDeskPackets.js`), contingent on (a) ≥500 tuples accumulated and (b) droplet headroom resolved.

**Terminal:** research-build (Phases 1 + 4 design/eval) · engine-sheet (Phase 2 + 4 build) · media (Phase 2 post-publish hook wiring)

**Pointers:**
- Prior work: `docs/research/papers/Memento_fine_tuning.pdf` (the paper), `docs/engine/PHASE_39_PLAN.md` (reviewer chain — source of reward signal)
- Related plan: [[plans/BACKLOG]] §Phase 21 (local-model agents — potential Shape A full custom harness, out of scope here)
- Research basis: arXiv:2508.16153v2 (Memento), `docs/research4_1.md` (bounded-memory shelf)

**Acceptance criteria:**
1. Concept doc at `docs/concepts/case-based-reasoning.md` lands with CBR-vs-RAG distinction, reviewer-chain-as-reward-signal framing, and inbound/outbound links per the no-isolated-MD rule. [Phase 1]
2. Starting the first cycle after Phase 2 ships, every reviewer-chain run writes at least one durable `(state, action, reward, cycle, agent_id, source)` tuple per agent-task to the chosen store, verified by a count query. [Phase 2]
3. Steal-or-skip memo at `docs/research/memento-evaluation.md` written once ≥500 tuples have accumulated, with an explicit go / no-go recommendation on Phase 4 build. [Phase 4]

---

## Tasks

### Phase 1 — Framing (research-build, immediate)

#### Task 1.1: Write concept doc

- **Files:**
  - `docs/concepts/case-based-reasoning.md` — create
- **Steps:**
  1. Frontmatter per SCHEMA.md §3 (title, created, updated, type: concept, tags, sources, pointers).
  2. Section: RAG vs CBR distinction. RAG = static corpus + per-query vector match, no reward signal, no update. CBR = dynamic `(state, action, reward)` tuples + learned retrieval + updates on success/fail.
  3. Section: where each shape lives in GodWorld today. RAG surfaces: Supermemory containers (bay-tribune, world-data, mags), claude-mem local DB. Reward-signal surface: reviewer chain outputs (Rhea hallucinations, cycle-review, Mara audit, Final Arbiter). The gap: no learned retrieval connecting the two.
  4. Section: tuple schema (when defined in Phase 2, back-fill here).
  5. Cite Memento (paper path) as concrete instantiation; cite research4_1.md as the bounded-memory shelf.
  6. Pointers block per SCHEMA: in from [[research4_1]] and [[plans/2026-04-21-memento-cbr-case-bank]]; out to the paper and the Memento GitHub.
- **Verify:** File exists; `grep case-based docs/research4_1.md` returns the back-link added in Task 1.3; `grep case-based docs/index.md` returns the registration from Task 1.2.
- **Status:** [ ] not started

#### Task 1.2: Register concept doc in index

- **Files:**
  - `docs/index.md` — modify (section: `docs/concepts/`)
- **Steps:**
  1. Add a line under the `docs/concepts/` section for the new doc: `- **[[concepts/case-based-reasoning]]** — CBR vs RAG distinction. Shelf for reward-signal-driven retrieval across reviewer-chain output. *(concept, architecture, active)*`
  2. Add a Changelog entry at the bottom of index.md.
- **Verify:** `grep case-based-reasoning docs/index.md` returns the entry.
- **Status:** [ ] not started

#### Task 1.3: Back-link from research4_1

- **Files:**
  - `docs/research4_1.md` — modify
- **Steps:**
  1. Locate the bounded-memory or episodic-memory section.
  2. Append a one-line pointer: `→ Concrete instantiation: [[concepts/case-based-reasoning]] (CBR framing, reviewer-chain reward signal, Memento paper).`
- **Verify:** `grep case-based-reasoning docs/research4_1.md` returns the pointer.
- **Status:** [ ] not started

### Phase 2 — Reward-tuple capture (engine-sheet + media, after Phase 1)

#### Task 2.1: Storage decision

- **Files:**
  - This plan file — update Open Questions with the decision.
- **Steps:**
  1. Evaluate three candidates: (a) new SQLite table in `/root/.claude-mem/claude-mem.db` — zero new infra, adjacent to existing observation store, not shared across droplet rebuild; (b) new Supermemory container (`reward-tuples` or similar) — survives droplet rebuild, costs a container slot, query patterns mismatch the structured shape; (c) new Google Sheet tab — default GodWorld shape, bad for embeddings at Phase 4.
  2. Decision criteria: Phase 4 retrieval pattern is vector-similarity over state reps; storage needs to support that natively or accept a separate vector index in Phase 4.
  3. Record decision + one-paragraph rationale in Open Questions below.
- **Verify:** Open question closed in this file.
- **Status:** [ ] not started

#### Task 2.2: Tuple schema definition

- **Files:**
  - `docs/concepts/case-based-reasoning.md` — append Section 4
- **Steps:**
  1. Define the tuple: `{state_repr, action_repr, reward, cycle, agent_id, article_id, reviewer_source, timestamp}`.
  2. Specify `state_repr` v0: hash of the packet/brief text shipped to the agent. Embedding upgrade deferred to Phase 4.
  3. Specify `action_repr` v0: the agent's output artifact path or content hash.
  4. Specify `reward` semantics — binary `{0, 1}`. Resolve open question on granularity: per-article (from Rhea + cycle-review per-article output) OR per-edition (from Mara + Final Arbiter grade mapped to binary) OR both as separate tuple streams.
  5. Specify `reviewer_source` enum: `rhea` | `cycle-review` | `mara-audit` | `final-arbiter` | `capability-review`.
- **Verify:** Schema section exists in concept doc.
- **Status:** [ ] not started

#### Task 2.3: Writer script

- **Files:**
  - `scripts/captureRewardTuples.js` — create
- **Steps:**
  1. Read per-cycle reviewer output JSON files from `output/` (Rhea, cycle-review, Mara audit, Final Arbiter, capability review).
  2. For each reviewer output, emit tuples per the schema from Task 2.2.
  3. Write tuples to the store chosen in Task 2.1.
  4. Idempotent: running twice for the same cycle does not duplicate tuples (cycle + agent_id + article_id + reviewer_source as uniqueness key).
- **Verify:** Run against E91 or E92 reviewer output (whichever is on disk first). Count rows. Run again; count unchanged.
- **Status:** [ ] not started

#### Task 2.4: Wire into post-publish

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — modify
- **Steps:**
  1. Add `captureRewardTuples.js` invocation as a post-publish step, after reviewer-chain outputs exist on disk.
  2. Place before Supermemory canon ingest so a capture failure does not block the publish chain.
- **Verify:** Next cycle's `/post-publish` run produces new tuples without manual invocation.
- **Status:** [ ] not started

#### Task 2.5: Forward-capture only — no backfill

- **Note:** Phase 39 reviewer chain shipped S147 but has never run on a production edition (E92 pending as of S170 priority). No historical reviewer output exists on disk for E91 or earlier in the structure captureRewardTuples expects. First real tuples arrive with E92's post-publish run.
- **Status:** [ ] not a task — constraint. Documented so no future session attempts a backfill against non-existent data.

### Phase 3 — Data accumulation (passive)

#### Task 3.1: Monitor

- **Steps:**
  1. Target: ≥500 tuples across reviewer sources before Phase 4 begins.
  2. At ~30-50 articles per edition with per-article reward + per-edition reward, that's ~10-15 editions of runway.
  3. No active work — data accrues per cycle.
- **Verify:** Count query against the store returns ≥500.
- **Status:** [ ] not started

### Phase 4 — Evaluation + Shape B build (research-build → engine-sheet, after Phase 3 target met)

#### Task 4.1: Steal-or-skip memo

- **Files:**
  - `docs/research/memento-evaluation.md` — create
- **Steps:**
  1. Clone `github.com/Agent-on-the-Fly/Memento` to a scratch location (not `/root/GodWorld/`).
  2. Read Q-function implementation, case-bank format, K=4 selection logic, MCP integration, reward capture.
  3. Compare to our accumulated tuple store — what adapts cleanly, what doesn't fit.
  4. Write memo: droplet cost, integration points, explicit go / no-go recommendation on Task 4.3+.
- **Verify:** Memo exists with a go/no-go line.
- **Status:** [ ] not started

#### Task 4.2: Droplet headroom

- **Steps:**
  1. Check `df -h /` — S170 baseline was 4.6GB free, 81% used.
  2. If <5GB free when Phase 4 begins, either clean ≥2GB or expand droplet. Decide which.
- **Verify:** `df -h /` shows ≥5GB free before Task 4.3.
- **Status:** [ ] not started

#### Task 4.3+: Shape B build

- **Note:** Expand into specific tasks after Task 4.1 memo lands with a go. Likely shape: state encoder (SimCSE or hosted embedding API), Q-function (2-layer MLP via PyTorch or equivalent), retrieval step in `buildDeskPackets.js`, A/B test on one edition.
- **Status:** [ ] not expanded

---

## Open questions

- [ ] Storage location for tuples — claude-mem SQLite, new Supermemory container, or Google Sheet tab? [Blocks Task 2.1]
- [ ] Reward granularity — per-article (Rhea / cycle-review), per-edition (Mara / Final Arbiter), or both as separate tuple streams? [Blocks Task 2.2]
- [ ] State representation at Phase 2 — text hash is cheap and works; defer embedding to Phase 4. Confirm this is acceptable. [Blocks Task 2.2]

---

## Changelog

- 2026-04-21 — Initial draft (S170, research-build terminal). Triggered by Mike sharing arXiv:2508.16153v2 (Memento) and asking for rollout shape. Approved structure-first before write.
