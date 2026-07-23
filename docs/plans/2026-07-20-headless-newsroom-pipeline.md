---
title: Headless Newsroom + City-Hall Pipeline Plan
created: 2026-07-20
updated: 2026-07-22
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

### Design note — what the cron hands a reporter: four layers (S330, Mike-direct)

The S325 "angle-assignment stage" premise is **superseded**. The C101 cron test settled it empirically: `cron-desk-writer.js` handed DeepSeek the *whole* `world_summary_c101.md` with **no angle**, and it found four real stories unassisted (Abraham GM hire, Richards trade, Keane gala, Clark call-up). **The reporter does not need an angle handed to it — it finds one.** It failed on two other things (invented quote-sources Marcus Wong / Carlos Nuñez / Lupe Hernandez; raw `Mood`/`FanSentiment` leaks). So the engine's job is NOT to pick the story — it's to do the free, deterministic work that makes the reporter's find *correct and distributed*. This is the locked charge-brief rule (ADR-0012): **engine assists WHO writes and WHAT-happened-in-the-beat; never WHAT-to-say.** Four layers:

| # | Layer | Who does it | Cost | Home |
|---|---|---|---|---|
| 1 | **WHO writes** — byline candidate + rotation so the same name doesn't write everything | Engine (this Phase 2.0) | Free | W5 half 2, research-build design → engine-sheet build |
| 2 | **WHAT's in your beat** — per-desk signal partition; pointers so e.g. the culture desk *knows the hot restaurant exists* instead of self-filtering the 40k blob | Engine | Free | W5 half 1, engine.76 — **SHIPPED S332**: `output/desk_signal_c{XX}.json` via buildWorldSummary.js v2.1.0 sibling emit |
| 3 | **The angle / the take** — found from the layer-2 pointers + `source-search` depth + the reporter's life experience | Reporter, desk-side | The paid LLM | locked charge rule; proven in the C101 test |
| 4 | **Real quotes** — reporter interviews the actual affected citizen crons instead of inventing sources | Engine (`citizenVoice.js --batch`) | ~pennies | **pipeline.43, already built**; needs headless wiring (Phase 2) |

Anti-hallucination is two lines of defense: **layer 4 prevents** invented sources (real quotes supplied up front), the **Rhea gate catches** whatever slips. The S325 "PoolKey policy" dependency is **dropped** — PoolKey is a content-ledger/event-pool namespace, unrelated to byline/angle, and appears nowhere in W5 as defined S329.

### Phase 2.0 — byline WHO-assist spec (layer 1)  *(research-build designs → engine-sheet builds; W5 half 2)*

The WHO-assist: un-silence byline Engine B so every story gets a beat-matched byline candidate distributed across the **full** roster and weighted so over-used names get suppressed and the dark bylines get work. Stories/angles stay desk-side (layers 2–3). **This is a design/spec deliverable — engine-sheet edits the substrate; research-build writes no new script here.**

**What's already done (don't rebuild):**
- **Reader fix — engine.78c (S329):** `/sift` byline shadow-log now reads `SuggestedJournalist` (v4.2 deck) with `BylineCandidate` legacy fallback. The C101 `8/8 engine_silent` was this reader bug (sift read only the legacy column, absent on the v4.2 deck) — fixed. So the candidate now *surfaces*; this phase makes it *good*.
- **Cadence math — `utilities/bylineEngine.js` `cadenceMultiplier_`:** the suppression curve already exists (knee `CADENCE_CAP_KNEE=0.20` → cap `CADENCE_CAP_RATIO=0.25` → floor `CADENCE_CAP_FLOOR=0.3`). It is **starved, not unbuilt** — the caller passes `cadence: null`, so it returns 1.0 and suppresses nothing.

**BUILT S331 (engine.79a–d, bench C110–C113 proven, live-deployed) — with two seam corrections found by the measure-twice pass:**
- **Stale seam:** the fix landed in `buildContractSeeds.js` / `rosterLookup.js`, NOT `applyStorySeeds.js:369` — the v4 seed contract (S296) retired v3 seeds from the deck, so Engine B's `scoreAllBylines_` output never reaches `SuggestedJournalist`; the live WHO-assist is `contractSeedJournalist_` → `suggestStoryAngle_`.
- **Fix B was already shipped** as engine.78c (S329 3-cycle tally + capped penalty + least-used tie-break); S331 added what 78c couldn't do: an in-cycle hint cap (≤25% of cycle seeds per name, exclude-not-discard so next-best/fallback surfaces) because a raw theme-score lead > 4 out-runs a capped penalty (bench C110: Maria Keen 20/40).
- Shipped: 5 dark staffers authored into the roster (Lena Carrow, Dana Reeve, Elliot Graye, Ariana Reyes; Jax Caldera entry byline-ineligible by design), `ROSTER_POPIDS` 31/31 tab join (drift-checked clean), `bylineEligible_` gate on theme loop + both signal fallbacks (killed the Mags-on-human_interest fallback leak), ECONOMIC vocab alias, `human_interest`/`feature` fallback remapped to Dana Reeve. Result C110–C113: 12 distinct bylines, all 4 dark names won seeds, max share 23.7% < 25% cap, zero ineligible hints.

**The two real fixes as originally specced (superseded by the above — kept for the record):**
- **A — Roster expansion.** `phase07-evening-media/applyStorySeeds.js:369` builds `bylineState.roster` from `rosterLookup.js`, which carries only the ~19 reporters mapped in `.claude/agents/REPORTER_DESK_INDEX.md`. The ~14 never-routed **Bay_Tribune_Oakland** staff (the canonical POPID-linked roster, ~29 rows) have no scorable `{themes, desk}` entry, so they can never win. Fix: source the roster from the **Bay_Tribune_Oakland** tab (POPID-linked), giving every staffer a beat/theme profile (beats from `REPORTER_DESK_INDEX` + voice files; new staffers need a beat assigned). Bind exact column headers against the live tab at build (engine-sheet owns it).
- **B — Cadence activation.** Populate `state.cadence` (per-byline usage counts) from `byline_shadow_log_c{N}.json` history — `finalAssignment` counts across recent cycles — and pass it + `totalSeeds` into `scoreAllBylines_`. The existing multiplier then suppresses over-routed bylines automatically. No new math; wire the input.

**Output contract (unchanged surface):** Engine B writes `SuggestedJournalist` / `MatchConfidence` per seed on the deck (already the v4.2 contract); the shadow log records `engineCandidate` + `outcome` (`agree`/`override`/`engine_silent`). Angles are never written by the engine.

**Acceptance:**
1. A cycle's `byline_shadow_log_c{N}.json` shows `engineCandidate` populated on matched seeds — `engine_silent` is the exception, not the rule (regression flag if mostly-silent).
2. Candidates span the full Bay_Tribune_Oakland roster — at least some of the previously-dark ~14 staff appear over a few cycles.
3. No single byline exceeds the cadence cap (`checkBylineCadence.js` passes) once `state.cadence` is fed.
4. Zero angle/story content emitted by the engine — WHO only.

### Phase 2 — daily writer-wakes → canon accrual (M–F)  *(research-build + engine-sheet; split to sub-plan)*
The continuous half. A per-wake cron (reuse the citizen-wake schedule) that, for each active journalist: consume the **layer-2 per-desk signal partition** (the beat's pointers for the cycle — so the reporter knows what happened in its lane without self-filtering the whole world_summary), find an angle in the beat (via `source-search`), write 1+ articles (Task 4 chain per article, byline per the Phase 2.0 WHO-assist, model per `desk-model-map`), Rhea-gate each, and **ingest passing articles to canon** (the article becomes world state; flagged → `flagged/`). Runs M–F. Acceptance: over a week, N civic storylines yield N+ canon-ingested, gated articles from multiple angles, no human prompt.

**Layer-4 wiring — real quotes in the headless path (Mike-direct S330).** The C101 test invented sources (Marcus Wong et al.) *only* because `cron-desk-writer.js` is a raw compose-from-injected-state call and never runs the **pipeline.43 citizen-quote pre-pass** that interactive `/write-edition` already runs at Step 0.7. Fix: before the desk writer composes, run `node scripts/citizenVoice.js --batch=<asks>.json` (built + live-verified S312) for the story's affected citizens — real POPID-linked citizen crons speak from their own dials/bonds/tensions/page memory, ~pennies per call, recording a `daypart='PRESS'` page doc + gated intake row per [[2026-07-11-citizen-voice-quote-supply]]. Inject the returned verbatim lines into the writer prompt as supplied citizen lines; in-scene invention demotes to fallback (citizens with no DialState / scene extras). This is the *prevention* layer; the Rhea gate stays as the *catch* backstop. Design: port `/write-edition` Step 0.7 into the cron path — no new quote machinery, the mechanism exists.

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
- [x] **Angle assignment** — RE-RESOLVED (Mike-direct S330, supersedes the S325 answer): there is **no angle-assignment stage**. The C101 cron test proved the reporter finds its own angle from injected state, and the locked charge rule (ADR-0012, engine.76/W5) fixes "engine assists WHO + WHAT-happened, never WHAT-to-say." The engine's structure is layers 1 (byline WHO — Phase 2.0) + 2 (per-desk signal partition WHAT — W5 half 1); the angle stays desk-side (layer 3). The S325 "PoolKey policy" dependency is **dropped** (content-ledger concept, not in W5). See the Design note above Phase 2.0.
- [x] **Citizen-quote hallucination fix** — RESOLVED (Mike-direct S330): reporters interview real citizen crons (`citizenVoice.js --batch`, pipeline.43 — built) instead of inventing sources. Gap is headless wiring only — see Phase 2 layer-4 wiring.

---

## Changelog

- 2026-07-20 — Initial draft (S325). Research basis [[../research/2026-07-19-headless-cron-newsroom-agentic-rag]]; ignited by Mike's full-pipeline direction + Feedback1.txt validation. Phase 1 concrete (scorecard building this session); Phases 2–4 outlined to split into sub-plans when picked up.
- 2026-07-22 — Phase 2.0 designed + triaged (S330). Angle-assigner reframed → four-layer model; Phase 2.0 = byline WHO-assist spec; PoolKey dropped as stale; Phase 2 gained layer-4 citizen-quote pre-pass. No new files.
- 2026-07-22 — Phase 2.0 BUILT, bench-proven C110–C113, live-deployed (S331 engine.79a–d, engine-sheet). Seam corrections + results recorded in the Phase 2.0 section.
