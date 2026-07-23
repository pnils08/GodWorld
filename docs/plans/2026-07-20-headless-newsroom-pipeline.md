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

### Voice doctrine — street-level, world-logic-only (S332, Mike-direct)

The product is: **hand a reporter the world summary + "find the compelling stories," and let it work.** Proven live — the Gemini/Grok crons (e.g. Jax Caldera, a Grok-authored agent designed to *cause chaos and rip the sim apart*) write **street-level using only the world logic available**, and what lands is **direct world canon**. This is a distinct register from the CLI agents (Claude Code / Antigravity), which produced long, poetic, high-level views; the crons are short, street-level, grounded in raw ledger signal. Both are valid; the street-level daily voice is what this pipeline is for.

**A reporter's "chaos" is a feature, and doubles as sim QA.** The job is connecting the **gaps** in the sim — e.g. the C102 Baylight "Dirt Carnival": the engine let a public carnival happen on a construction site whose remediation bond never cleared the soil test. That is a real consistency hole the engine produced; a firebrand exploiting it as a toxic-soil allegation is surfacing a genuine sim gap, not fabricating. A clearly-framed **allegation from real signal is canon-valid** (subjective-hallucination-is-canon); the gate keeps it honest at the canon boundary (engine verbiage, data misrepresentation) without neutering the voice — see Phase 2.1.

### The north star — populate the world with friction, make things answer (S332, Mike-direct)

**The value is not prose — it is friction that makes the world answer.** A story that matters has stakes: it answers questions *and demands them.* A reporter's "I want her logs / who signed the permit / I want to trail her" is not description — it is **pressure the world now has to respond to.** That is the point of the whole pipeline; prose is the byproduct, friction is the product.

**Mechanism (general, every reporter — not one):** when a reporter names and accuses/questions an entity (a civic office, an official, a citizen), that demand becomes a prompt to the entity's agent (civic-office / citizen-voice, via the layer-4 handshake run adversarially) on its next wake — the entity must **answer**: defend, explain, deflect, react. The reporter can follow up. Stories become multi-wake **arcs** (accusation → response → follow-up), not one-shots. This rides the M–F wakes (Phase 2) and city-hall (Phase 3).

**Why it's load-bearing:** this is the fix for the civic-depth gap (the sim logs civic entities as boilerplate — "X turning upward: retail busy…" cloned per neighborhood — while the A's get protagonist texture). Friction forces a civic entity to become a **protagonist** because it has to speak for itself. "Make things answer" is universal protagonism enforced by the newsroom, rather than hoped for from the engine.

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

### Phase 2 — daily writer-wake wiring (M–F)  *(research-build designs → engine-sheet builds)*

The continuous half: chain the now-live pieces (byline WHO, signal partition, writer, gate, citizen quotes) into one per-wake run that stages gated articles for the Saturday compile. **All pieces exist and are proven — this is assembly plus one architecture wall (Step 5). No new machinery; extend `cron-desk-run.js`.** Reuse the citizen-wake 5-daypart schedule (`scripts/citizen-wake.js`, fires 7:30/12:30/15:30/19:30/21:30), M–F.

**Which desks wake daily (bind-point — do not guess):** `desk_signal_c{N}.json` carries **four lanes only** — `civic / sports / culture / business`. Those four desks wake daily. **`chicago`** is canonically dormant (generator disabled S229) → does not wake. **`letters`** rides the Saturday compile, not daily wakes → does not wake. A desk with no lane in `desk_signal` is skipped, not crashed — the runner must guard for a missing/empty lane.

**Per-wake chain (per active desk, extend `cron-desk-run.js`):**
1. **Assign (layers 1+2).** Read the desk's lane from `output/desk_signal_c{N}.json` (its pointers for the cycle). Byline per the live WHO-assist (`SuggestedJournalist` on the deck / roster) picks WHO writes each pointer. No angle assigned.
2. **Quote pre-pass (layer 4).** Port `/write-edition` Step 0.7: for the lane pointer's affected citizens, `node scripts/citizenVoice.js --batch=<asks>.json --record` (built + live-verified S312) → real POPID-linked citizens speak from their own dials/bonds/tensions/page memory (~pennies), each recording a `daypart='PRESS'` page doc + gated intake row per [[2026-07-11-citizen-voice-quote-supply]]. Inject the returned verbatim lines; in-scene invention demotes to fallback (no-DialState / scene extras).
3. **Write on-lane (layer 3).** `cron-desk-writer.js`, injecting the **desk lane** (`desk_signal`) + supplied citizen lines — NOT the whole 40k `world_summary` blob (that firehose is why C101 desks self-filtered). Reporter finds its own angle; C101 proved it does.
4. **Gate (existing).** `cron-rhea-gate.js` (Haiku, ~$0.145). Pass → staged; flag → `flagged/` (disposition per the Rhea-flag open question below).
5. **Stage to canon — THE WALL (decided S332; NO freeze — this is week-1 probation, Mike-direct S332).** A gated M–F article is **STAGED / unpublished**: retrievable by the Saturday compile only, tagged `status=staged`/`draft`. It does **NOT** get full canon ingest, and reporters/`sift` must **not** retrieve staged drafts as fact — else Wednesday's reporter builds on Monday's draft that Saturday cuts, a story that never published becomes a premise (the documented DeepSeek-contamination death mode). This holds **independent of any freeze** (the S313 freeze is retired) — it's contamination safety during the trust-building week. **Graduation (Mike-direct S332):** run the week, spot-check accuracy; **once accurate, drop staging → publish-to-canon-on-write** (articles hit canon right after the gate; the Saturday compile then curates already-published canon into the edition rather than acting as the publish gate). Same wall the quote layer draws: staging records the *writing*, publication records the *fact*.
   - **Build caveat (name for the executor, don't let a weak model paper over it):** `scripts/ingestEdition.js` / `ingestEditionWiki.js` are **edition-shaped** — read their actual input contract before assuming a `--per-article` flag exists; per-article ingest may be a real adaptation, not a flag. And **verify bay-tribune can carry a published/draft distinction** before staging there; if it can't, stage to a separate tag/store the Saturday compile reads.
6. **Reporter records their own writing (layer 5 — universal protagonism, Mike-direct S332).** The reporter is a POPID-linked ledger citizen (e.g. Anthony = POP-00017), so filing a story is an event in *their* life — the author-side mirror of the layer-4 citizen-quote record. On write: (a) save the article to the reporter's own file; (b) **acknowledge it to their own wiki as a page doc** (`daypart='PRESS'`-class, "filed: <headline>") + one gated intake row — the same `citizenVoice.js --record` write-block, author-side. Fallback for a reporter with no DialState/page (same exit-2 path as the quote layer). **NO LifeHistory line** — per the S312 code-confirmed rejection ([[2026-07-11-citizen-voice-quote-supply]] §Parked): page + intake is the complete set; a LifeHistory line double-hits dials (intake already accretes at the cycle drain, LifeHistory would fold a second time when it ages out). The byline still carries into the reporter's memory + dials via the page doc + intake — everything a LifeHistory write would give, without the double-count.

**Acceptance:** over a week, the four daily desks yield N staged, gated, quote-grounded articles across multiple bylines, no human prompt; zero staged drafts retrieved as fact by any M–F reporter or `sift` call; flagged drafts isolated.

### Phase 2b — Saturday edition compile = the publish gate  *(research-build; sub-plan)*
**Probation week:** the only place a headless story becomes citable fact. A Saturday cron where **Mags compiles**: `/sift`-style curation over the week's **staged** articles → pick the top stories → assemble edition → `/post-publish` (existing **full** canon ingest: `ingestEditionWiki.js` + `ingestEdition.js` + world-data entity records + citizen cards). During probation this is the publish gate: M–F stages, Saturday publishes. **Post-graduation** (articles publish-on-write): the Saturday compile shifts to curating already-published canon into the edition — the same `/sift` → assemble → `/post-publish` shape, but over canon rather than staged drafts. Acceptance: one Saturday run produces a published, fully-ingested edition; during probation, staged-but-uncompiled drafts never entered canon.

**Cadence (S332, Mike):** the street-level crons write **short** pieces (shorter than the CLI long-view), so the shape is **~5 days of daily articles → 1 compiled for the edition** — the compile curates *down* from many short street-level drafts, not up from a few long ones. Tune the compile ratio against how these actually land during the probation week.

### Phase 2.1 — Rhea gate scope (Mike-direct S332)
Rhea's job is two flag classes, everything else the context supports **passes** — she polices the canon boundary, not the editorial voice:
- **Engine verbiage** — system language, raw metric names, status enums, dial decimals leaking into prose (e.g. `construction-planning`, `active internal state`, `Ripple Ledger`, `impactScore 51`). Flag → rewrite to citizen-facing language.
- **Misrepresentation of data output** — a claim that distorts or contradicts the actual ledger/audit value (a metric stated as falling when the audit shows it rising; a count off from canon; a prior-cycle stat presented as current). Flag → correct to the real value.

What **passes**: anything the world-summary/context genuinely supports — allegations, cross-signal connections, a reporter's inference from real data, editorial voice. The gate does not fact-check opinion or flatten voice; it strips verbiage and fixes data misrepresentation.

Reference run (one calibration sample, not the design's organizing case): `cron-rhea-gate.js` on the C102 Dirt Carnival, `output/cron-compare/baylight_dirt_carnival.rhea.json` (`pass:false`, Sonnet $0.96/147s). **Open verify:** it *passed* "Jack London retail down / crime spiking," but the raw audit read Jack London **up (+0.16)**, real decline at **KONO** — a data-misrepresentation check to reconcile. Build: `rhea-morgan` RULES + the `cron-rhea-gate.js` prompt encode these two flag classes + the context-passes default.

### Phase 3 — city-hall headless (daily)  *(civic content, research-build infra; sub-plan)*
Same continuous model on the civic side: city-hall voices/agents wake M–F, work the active civic storylines (agenda → positions → votes as they occur), articles ingest to canon and feed Mags' Saturday compile. Mirrors the writer-worker shape on civic agents.

### Phase 4 — scorecard eval + cost tuning  *(sub-plan)*
Aggregate scorecards across the accrued articles to answer Feedback1.txt's per-desk question (is DeepSeek "90% for 20%?"). Includes the Haiku-vs-Sonnet Rhea-gate cost test (gate is $0.76/run on Sonnet; source-search proved Haiku parity for verified work).

---

## Open questions

- [ ] **Rhea-flag disposition** (blocks Task 4 final behavior): a flagged draft → auto-reject + regenerate, or route to a human-edit queue? Default proposed: `flagged/` staging for human review first, no auto-regenerate until trust is established.
- [x] **Publish target** — RESOLVED (Mike-direct S332): **no freeze** (S313 retired). Week 1 = **probation-staging** (M–F stage, spot-check accuracy) purely for contamination safety, not a freeze. **On accuracy → graduate to publish-to-canon-on-write** (staging drops; Saturday compile becomes curation of already-published canon, not the publish gate). See Phase 2 Step 5.
- [ ] **Which desks are "voice-critical" vs "routine"** (blocks Task 3): Feedback1.txt names Hal Richmond/Mags/investigative/editorial as Sonnet; confirm the full split with Mike.
- [x] **Canon-ingest mechanism** — RESOLVED (S332): machinery already exists (`ingestEditionWiki.js` + `ingestEdition.js`, run today by `/post-publish`). Decision: M–F gated articles **stage** (retrievable by the Saturday compile only, `status=staged`, NOT ingested as fact); only the Saturday-**published** set gets full canon ingest — the subjective/citable wall (Phase 2 Step 5). Build caveat: ingest scripts are edition-shaped (read input contract before assuming per-article) + verify bay-tribune carries a draft/published tag. See Phase 2.
- [x] **Angle assignment** — RE-RESOLVED (Mike-direct S330, supersedes the S325 answer): there is **no angle-assignment stage**. The C101 cron test proved the reporter finds its own angle from injected state, and the locked charge rule (ADR-0012, engine.76/W5) fixes "engine assists WHO + WHAT-happened, never WHAT-to-say." The engine's structure is layers 1 (byline WHO — Phase 2.0) + 2 (per-desk signal partition WHAT — W5 half 1); the angle stays desk-side (layer 3). The S325 "PoolKey policy" dependency is **dropped** (content-ledger concept, not in W5). See the Design note above Phase 2.0.
- [x] **Citizen-quote hallucination fix** — RESOLVED (Mike-direct S330): reporters interview real citizen crons (`citizenVoice.js --batch`, pipeline.43 — built) instead of inventing sources. Gap is headless wiring only — see Phase 2 layer-4 wiring.

---

## Changelog

- 2026-07-20 — Initial draft (S325). Research basis [[../research/2026-07-19-headless-cron-newsroom-agentic-rag]]; ignited by Mike's full-pipeline direction + Feedback1.txt validation. Phase 1 concrete (scorecard building this session); Phases 2–4 outlined to split into sub-plans when picked up.
- 2026-07-22 — Phase 2.0 designed + triaged (S330). Angle-assigner reframed → four-layer model; Phase 2.0 = byline WHO-assist spec; PoolKey dropped as stale; Phase 2 gained layer-4 citizen-quote pre-pass. No new files.
- 2026-07-22 — Phase 2.0 BUILT, bench-proven C110–C113, live-deployed (S331 engine.79a–d, engine-sheet). Seam corrections + results recorded in the Phase 2.0 section.
- 2026-07-22 — Phase 2 daily writer-wake wiring specced (S332). Assembly chain over live pieces; Step 5 staging wall (M–F stage, Sat publishes) resolves canon-ingest + contamination risk.
- 2026-07-22 — Freeze retired + reporter-record added (S332). Staging reframed freeze→probation; graduate to publish-on-write on accuracy. Step 6 (layer 5): reporter acknowledges own article to wiki (page doc + intake); NO LifeHistory per S312 double-hit.
- 2026-07-23 — Voice doctrine + Phase 2.1 Rhea gate scope (S332). Rhea flags 2 classes only: engine verbiage + data-output misrepresentation; context-supported content passes. Journalist-agnostic. Cadence ~5 short daily → 1 compiled.
