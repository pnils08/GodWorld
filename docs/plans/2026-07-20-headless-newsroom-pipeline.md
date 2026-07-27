---
title: Headless Newsroom + City-Hall Pipeline Plan
created: 2026-07-20
updated: 2026-07-27
type: plan
tags: [architecture, media, civic, infrastructure, active]
sources:
  - "[[../research/2026-07-19-headless-cron-newsroom-agentic-rag]] — research basis (both threads, empirical runs, Feedback1.txt validation)"
  - "[[2026-07-25-notebooklm-source-search-wiring]] — bounded NotebookLM retrieval and headless-consumption evaluation"
  - "Drive 182GQGxrdbOUIc6dO-CJBZzcZ3zthG-Pa (The Bay Awakening) + 1jAuBUfXspDCbfRaspjXSp3Mon7-MgUfu (Feedback1.txt) — Mike-shared S325"
  - "scripts/cron-desk-writer.js — writer-worker prototype, proven c101 sports S325"
  - ".claude/agents/source-search/SKILL.md — retrieval layer (S326); .claude/agents/rhea-morgan — canon gate"
pointers:
  - "[[engine/archive/ROLLOUT_PLAN]] — parent rollout"
  - "[[2026-07-25-notebooklm-source-search-wiring]] — Task 7 headless-consumption verdict"
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

**Scene texture is wanted — "invent nothing" is too strict (Mike-direct 2026-07-24).** The canon bar is **storyline non-contradiction**, not zero invention. A reporter's observed scene color — the laundromat on Peralta, the $4-beer bartender, the woman folding clothes — is *what this journalist saw*; it adds the color of the world and is good. The rules: (a) never contradict the sim's storylines (the real bond, the real decay, the real disbursement state); (b) named roles go to **real citizens and businesses** — they exist to be used, and their quoted voices carry the scene's color (a real resident's "the sun catches the metal differently in the afternoons" beats invented poetry); (c) anonymous texture (unnamed bartender, passing scene) is the reporter's eye, allowed. Inventing *named* people/institutions or facts that fight the record remains out — that's the gate's line, not the texture's.

### The north star — populate the world with friction, make things answer (S332, Mike-direct)

**The value is not prose — it is friction that makes the world answer.** A story that matters has stakes: it answers questions *and demands them.* A reporter's "I want her logs / who signed the permit / I want to trail her" is not description — it is **pressure the world now has to respond to.** That is the point of the whole pipeline; prose is the byproduct, friction is the product.

**Mechanism (general, every reporter — not one):** when a reporter names and accuses/questions an entity (a civic office, an official, a citizen), that demand becomes a prompt to the entity's agent (civic-office / citizen-voice, via the layer-4 handshake run adversarially) on its next wake — the entity must **answer**: defend, explain, deflect, react. The reporter can follow up. Stories become multi-wake **arcs** (accusation → response → follow-up), not one-shots. This rides the M–F wakes (Phase 2) and city-hall (Phase 3).

**The sim pushes the storylines, not the newsroom (S332, Mike-direct — the guardrail).** Friction is **sim-sourced**: the reporter does not author a storyline, it reads the sim's own tension (the real unexecuted bond, the real KONO crisis, the self-contradiction) and pushes on it; the entity's answer is drawn from *its* real state; the arc advances as the **sim** evolves, not as a reporter decides. The newsroom is the lens and the pressure — the sim is the engine of the drama. This is the same line as physics-decides vs scripted pairing: the newsroom surfaces and pressures what the sim generates, it never manufactures drama the sim didn't produce (guards the contamination death-mode).

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

**Cadence anchor — the 7-day static cycle, nothing-is-waste, self-evolving (Mike-direct S332, go-live spine).** Cycles advance ~**every 7 real days**, so the world state is **static for a week**. This is the axis the whole go-live cadence turns on:
- **The newsroom runs a WEEK on ONE frozen cycle**, not a fresh cycle per day. M–F the four desks wake against the *same* `desk_signal_c{N}` and produce a spread of articles — different journalists, different storylines/angles on that one cycle. No paying to re-generate the frozen world; the spend buys *coverage breadth + journalist growth*, and no same-byline/same-storyline repeat across the 5 days (dedup on what's already written, not just on the cycle).
- **NOTHING IS WASTE (Mike-direct S332 — supersedes the "95% thrown away" framing).** Every article that **clears Rhea becomes canon** — not only the edition-selected ones. On clearance each article: (a) **ingests to canon** (builds the world), (b) **saves to the journalist's own local file** (their portfolio), (c) **updates the journalist's wiki page**. The **edition is the curated best-of on top** — the highlight reel, not the gate. So **Rhea-clearance IS the canon gate**, not edition-selection. *(This refines Step 5's probation-staging wall: staging/`flagged/` is only for articles that FAIL Rhea; cleared M–F articles are canon. The old contamination worry — a reporter building on a draft that gets cut — dissolves because a Rhea-cleared article is real canon, safe to build on; the edition just curates the highlights of canon. Whether week-1 still stages-then-graduates or goes canon-on-clear from the start is Mike's timing call; the steady-state design is canon-on-clear.)*
- **Media fame + usage is UNDESIGNED — new build (Mike-direct S332, corrects the earlier "existing-ingest, nothing-to-build" note).** The article-content ingest exists; the **journalist progression ledger does NOT**. Design needed: a journalist gains a **usage count for article usage** (each cleared-to-canon article counts; edition-selection likely weights higher), accumulated usage **ups their citizen Tier**, and tier ascension **is their fame**. The journalist is a citizen whose *career advances through their work* (universal protagonism applied to the newsroom itself). `byline_shadow_log` tracks candidacy (who's a byline candidate); this new ledger tracks *landed usage → tier → fame*. Where the usage/tier column lives + the tier-up curve are the open design items.
- **Self-evolving system (the north star of this whole cadence).** Every cleared article simultaneously **builds the world** (canon) AND **builds the journalist** (usage → tier → fame, portfolio file, wiki page). The two feed each other: more coverage → richer world + more-advanced journalists → better coverage. The process is the growth engine, not just a content mill.
- **Cost = subscription-token RECOVERY, not new spend (Mike-direct S332).** This pipeline used to run interactively on Mike's Claude Code subscription; moving it to headless raw-API writers (DeepSeek pennies) + a Haiku gate **recovers those subscription tokens** — the API bill replaces a bigger subscription burn. **Target: $20–40/month, and none of it waste** (every dollar buys canon + journalist growth, per above). Measured units (S332 civic c102 runs): Sonnet desk write **$0.92** (223k-token explore phase — a trim target), Haiku gate **$0.22** (the per-article floor, since canon requires clearance), DeepSeek desk write **$0.003**, quotes+record ~$0.03. So a DeepSeek-desk article ≈ **$0.25** (gate-dominated), a Sonnet-desk article ≈ **$1.17**. $20–40/mo ⇒ roughly **~20–28 cleared articles/week** (DeepSeek-heavy with a few Sonnet), ~1/desk/day — all canon, all building journalists, edition curates the best ~8.
- **Related citizen-side change (distinct from the newsroom):** citizen wakes drop **5 → 2 (morning + night)** — a frozen 7-day world doesn't need 5 dayparts; citizens cycle on their own internal lives across the week, and 2 wakes cut redundant spend. `scripts/citizen-wake.js` daypart change, separate from the journalist cadence.
- **"voice-packets" = what runs city hall (Mike-direct S332).** The civic analog of `desk_signal` — the packet feeding the city-hall voices/agents (mayor, council, factions, project directors) their M–F material. The next design frontier is **what city hall / civic becomes M–F** (Phase 3): the civic voices wake across the static-cycle week, work their storylines (agenda → positions → votes), and their output is the civic record the desks report on. Not yet designed; the friction loop ("make things answer") is where newsroom and city-hall meet (a reporter's M–F accusation becomes a voice-packet input the office must answer on its next wake).

This **refines "those four desks wake daily" above**: they wake M–F on a *static* cycle to build the week's canon + submission pool — not to write a fresh cycle each day.

**Per-wake chain (per active desk, extend `cron-desk-run.js`):**
1. **Assign (layers 1+2).** Read the desk's lane from `output/desk_signal_c{N}.json` (its pointers for the cycle). Byline per the live WHO-assist (`SuggestedJournalist` on the deck / roster) picks WHO writes each pointer. No angle assigned.
2. **Quote pre-pass (layer 4).** Port `/write-edition` Step 0.7: for the lane pointer's affected citizens, `node scripts/citizenVoice.js --batch=<asks>.json --record` (built + live-verified S312) → real POPID-linked citizens speak from their own dials/bonds/tensions/page memory (~pennies), each recording a `daypart='PRESS'` page doc + gated intake row per [[2026-07-11-citizen-voice-quote-supply]]. Inject the returned verbatim lines; in-scene invention demotes to fallback (no-DialState / scene extras).
3. **Write on-lane (layer 3).** `cron-desk-writer.js`, injecting the **desk lane** (`desk_signal`) + supplied citizen lines — NOT the whole 40k `world_summary` blob (that firehose is why C101 desks self-filtered). Reporter finds its own angle; C101 proved it does.
4. **Gate (existing).** `cron-rhea-gate.js` (Haiku, ~$0.145). Pass → staged; flag → `flagged/` (disposition per the Rhea-flag open question below).
5. **Stage to canon — THE WALL (decided S332; NO freeze — this is week-1 probation, Mike-direct S332).** A gated M–F article is **STAGED / unpublished**: retrievable by the Saturday compile only, tagged `status=staged`/`draft`. It does **NOT** get full canon ingest, and reporters/`sift` must **not** retrieve staged drafts as fact — else Wednesday's reporter builds on Monday's draft that Saturday cuts, a story that never published becomes a premise (the documented DeepSeek-contamination death mode). This holds **independent of any freeze** (the S313 freeze is retired) — it's contamination safety during the trust-building week. **Graduation (Mike-direct S332):** run the week, spot-check accuracy; **once accurate, drop staging → publish-to-canon-on-write** (articles hit canon right after the gate; the Saturday compile then curates already-published canon into the edition rather than acting as the publish gate). Same wall the quote layer draws: staging records the *writing*, publication records the *fact*.
   - **Build caveat (name for the executor, don't let a weak model paper over it):** `scripts/ingestEdition.js` / `ingestEditionWiki.js` are **edition-shaped** — read their actual input contract before assuming a `--per-article` flag exists; per-article ingest may be a real adaptation, not a flag. And **verify bay-tribune can carry a published/draft distinction** before staging there; if it can't, stage to a separate tag/store the Saturday compile reads.
6. **Reporter records their own writing (layer 5 — universal protagonism, Mike-direct S332).** The reporter is a POPID-linked ledger citizen (e.g. Anthony = POP-00017), so filing a story is an event in *their* life — the author-side mirror of the layer-4 citizen-quote record. On write: (a) save the article to the reporter's own file; (b) **acknowledge it to their own wiki as a page doc** (`daypart='PRESS'`-class, "filed: <headline>") + one gated intake row — the same `citizenVoice.js --record` write-block, author-side. Fallback for a reporter with no DialState/page (same exit-2 path as the quote layer). **NO LifeHistory line** — per the S312 code-confirmed rejection ([[2026-07-11-citizen-voice-quote-supply]] §Parked): page + intake is the complete set; a LifeHistory line double-hits dials (intake already accretes at the cycle drain, LifeHistory would fold a second time when it ages out). The byline still carries into the reporter's memory + dials via the page doc + intake — everything a LifeHistory write would give, without the double-count.

**Acceptance:** over a week, the four daily desks yield N staged, gated, quote-grounded articles across multiple bylines, no human prompt; zero staged drafts retrieved as fact by any M–F reporter or `sift` call; flagged drafts isolated.

**BUILD STATUS — chain wired + machinery proven, prompt-adoption is probation tuning (S332, engine-sheet).** `cron-desk-run.js --wake` assembles all six layers over the proven pieces (3 additive, flag-gated touches: `cron-desk-writer.js --state-file` lane injection [fail-loud, no silent blob fallback] + lane-aware prompt; `citizenVoice.js --record-text` author-side record; `cron-desk-run.js --wake` orchestrator). Proven live on civic c102 (2 complete runs): byline resolves from **Bay_Tribune_Oakland** via `buildBylineRoster` (lane→beatDomain map, least-used rotation over `byline_shadow_log`); quote pre-pass generates+injects 4/4 real voices (Lucia Polito/Calvin Turner/Tomas Renteria/Gregory Mims); lane state injected (~17KB, 40k blob bypassed); Haiku gate ($0.20) caught a **real** canon violation both runs; staging wall routes flagged→`flagged/`, staged path is the same code; self-record correctly skips on non-pass.
- **Open (probation-week prompt tuning, not wiring):** (1) the Sonnet writer did **not** adopt the injected quotes — it invented a resident source instead (the exact thing layer 4 exists to prevent); the state-file quote instruction was strengthened to "these are your only citizen sources, never fabricate" but not yet live-validated. (2) **Byline collision:** the desk SKILL picks its own byline (Carmen Delaine) which competes with the injected layer-1 byline (Angela Reyes); the injected `Name (POP-…)` token made the writer treat the byline as a citizen to quote → the canon violation. Fixed by injecting the byline as author-only (no POPID, "never name/quote them in the body"); not yet live-validated (the validation run hung on an intermittent Anthropic API stall). (3) **Robustness:** added a per-call `--call-timeout` (default 180s, maxRetries 2) to the writer — an untimed API call froze a wake mid-explore with no recovery; a headless cron must fail loud, not hang.
- **NOT built this session (correctly deferred):** the M–F × 5-daypart × 4-desk cron schedule (mechanical fan-out, and turning on continuous autonomous operation is Mike's go, not engine-sheet's), and Phase 2b (Saturday compile). No canon ingest happens in Phase 2 — staged articles are contamination-walled.

**Test finding — friction must be engineered, it is not free (S332).** Clean run of `cron-desk-writer.js --desk civic` (DeepSeek compose-only, no Antigravity, exit 0) confirmed the writer already injects the desk_signal lane + byline WHO-assist (Angela Reyes fired) + pointers-not-data charge — good. BUT the output is competent **long-view roundup, not street-level friction**: handed the Jack London (`RetailVitality -1.90, CrimeIndex +2.99`) and Downtown decay anomalies *in its own input pointers*, it still wrote "Downtown retail surging / households forming in Jack London" — the boomtown press release, missing the exact contradiction Jax ripped open. So the raw compose call defaults to safe summary and writes *around* the friction it holds. The Friction Doctrine must be **encoded into the writer prompt** (find the contradiction, write into the gap, demand answers, never recite the rising ripple when the audit says decay) + an adversarial stance — Jax-caliber output is a prompt/stance property, not a free property of the cron. This is the real Phase 2 build: not just wire the cron, make it write with teeth.

#### Task 2.2 — Firebrand lane: load the accountability persona for friction pieces  *(research-build design → engine-sheet build; Mike-direct S332)*
**Root cause of the toothless output, now confirmed:** `cron-desk-writer.js` loads the **desk SKILL** (`civic-desk`, `sports-desk` — "cover the section" roundup voice). The Jax gold came from the **`freelance-firebrand` agent** (its whole purpose: "deploy on a verified gap, contradiction, or suspicious silence — sharp voice, verifiable claims" — exactly the Baylight bond-gap story). Same signal in, opposite teeth out; the difference is the **persona/stance**, not the model, cron, or (as Antigravity falsely implied) any tool magic. Friction is reproducible on cheap models once the writer runs the right persona.
- **Build:** give the writer a **lane selector** — for accountability/contradiction/silence beats, load the `freelance-firebrand` agent's IDENTITY + RULES (adversarial stance) as the system prompt instead of the standard desk SKILL; standard beats keep the desk voice. The lane can key off the desk_signal anomaly class (a `math-imbalance`/contradiction pointer → firebrand-eligible) or an explicit per-byline map (Jax/Farrah → firebrand).
- **Acceptance:** a firebrand-lane run on a cycle with a real contradiction (e.g. C102 Jack London decay vs a rising ripple) writes *into* the contradiction and demands answers — not the roundup the generic `civic-desk` produced in the S332 test.
- **Status (2026-07-24, Codex):** BUILT + first verification. `--persona freelance-firebrand` in `cron-desk-writer.js` (loads IDENTITY+LENS+RULES as the stance) plumbed through `cron-desk-run.js`; persona-keyed output filenames so persona/desk samples accumulate instead of overwriting (Mike-direct: samples exist to be compared). Writer-only run on c102 ($0.0039) wrote "Who's Sitting on the Checks?" — street-level, demands answers, **acceptance met**. Full wake-chain run (byline + 4/4 real quotes + lane state) also clean, BUT two tuning items surfaced: (1) **stance dilution** — with the full lane-state prompt the firebrand piece reads closer to a standard delayed-project story than the writer-only run's accusation; the injected desk framing competes with the persona stance; (2) **byline mismatch** — the wake chain resolved the desk-roster byline (Angela Reyes) over the firebrand persona (Jax Caldera); when `--persona` is set the byline should come from the persona, not the desk roster. Both are prompt/orchestration tuning, not mechanism failures.

### Phase 2.3 — three-wake article cadence (2026-07-24, Codex; BUILT + verified live)

**Origin (Mike, 2026-07-24):** the Jax gold wasn't one prompt — Antigravity first *asked Jax a question in Jax's own lingo* ("You're sitting in a bar in Oakland right now. What's smelling off…") and the friction leads came back in his voice. Prompting voice feeds personality. So split the single wake into three task-specific wakes, gate, and release to Mike the next morning.

**Key asset confirmed:** Jax Caldera is **POP-00799**, a Tier-2 ledger citizen (Temescal/Longfellow, Tribune-employed, blacklisted alt-weekly accountability writer). The Antigravity pattern literally interviewed *Jax-the-citizen* via `citizenVoice.js` — his own voice model is the angle-finder. Byline + self-record can therefore be fully POPID-correct for personas.

**The cadence (per desk-day):**
1. **Wake 1 — ANGLE (stance-led).** Ask the persona's citizen voice, in its own lingo, what smells off (`citizenVoice.js --pop=<persona-pop> --ask=<voiced question>`) + scan the desk_signal lane. Output: `angle.json` — the contradiction, why it matters, candidate real sources (POPIDs), questions to demand answers to. Pennies.
2. **Wake 2 — REPORT.** Persona-voiced asks to the *affected* citizens (`citizenVoice.js --batch`, questions written in the reporter's register — the question's voice shapes the answer's friction) + `search_world`/file reads on the angle's refs. Output: `packet.json` — real quotes + sourced evidence trail.
3. **Wake 3 — WRITE + GATE.** Compose from angle + packet (persona system prompt, stance anchor) → Rhea gate → stage/sample. Output: draft + verdict.
4. **Next morning — DIGEST for Mike:** one file listing yesterday's angles, what cleared/flagged the gate, and links to drafts. Review over coffee; nothing publishes without the Saturday compile.

**Cron mapping (offsets avoid the :30 citizen wakes):** 06:00 angle → 13:00 report → 18:00 write+gate → 06:00 next-day digest. Cost ≈ $0.30/article (3 small DeepSeek calls + citizen voices + Haiku gate) — inside the $20–40/mo target. Spreading across the day also leaves room for the future arc loop (accusation filed AM, entity's own wake can answer PM).

**Fixes folded in (the 2026-07-24 tuning items):**
- **Byline mismatch:** `scripts/persona-map.json` — persona slug → `{name, popid, beatDomain}` (freelance-firebrand → Jax Caldera, POP-00799). When `--persona` is set, skip the desk-roster `resolveByline`; self-record files to the persona's own page (a real Tier-2 citizen — his "filed: X" events accrete to his dials, a live subject for the journalist-progression ledger).
- **Stance dilution:** (a) when a persona is set, `buildLaneState` prepends a **stance anchor** ("You are Jax Caldera. This lane is evidence, not assignments — find the contradiction, write into it, never file the roundup"); (b) quote asks are written **in the persona's lingo** (the Antigravity lesson); (c) quotes stay optional-to-use, already supported.

**Why three wakes beats one:** each wake is a small cheap artifact you can inspect (angle picks vs. final drafts — the compile-test review Mike asked for); failure isolation (no quotes → no write on stale data); and it mirrors how the Jax gold was actually produced rather than hoping one compose call does all three jobs.

**Build surface (small):** `--stage=angle|report|write` on `cron-desk-run.js` (shared artifacts in `output/cron-compare/`), `persona-map.json`, stance-anchor + voiced-ask support in `buildLaneState`/`collectQuoteAsks`, digest emitter. No changes to the gate, the wall, or canon ingest.

**Verification (2026-07-24/25, all three stages live on civic c102 freelance-firebrand):**
- Angle: Jax's own voice found the real Jack London decay contradiction from the lane digest → `output/cron-compare/civic_c102_freelance-firebrand_angle.json`.
- Report: 4/4 persona-voiced quote asks landed (Polito, Turner, Renteria, Mims) → `..._packet.json`.
- Write: composed with stance anchor + angle read, byline Jax Caldera POP-00799, ungated sample → `samples/civic_c102_freelance-firebrand_deepseek-deepseek-chat.sample.md`. Article grade: teeth present, real quotes woven, no invented ages/bios for the quoted citizens. Total verification cost ≈ $0.05.
- Digest: `scripts/newsroom-digest.js` → `output/cron-compare/digest-YYYY-MM-DD.md` groups the last 36h by desk+cycle+persona (angle text, quote hit-rate, gate verdicts, sample links).
- **Bug found & fixed during verification:** `arg()` in all three scripts only matched exact `--flag value` tokens; `--stage=angle` (`=` form) silently fell through to the full runWake path and burned one Sonnet gate ($0.74). Fixed: `arg()` now accepts both forms. Silver lining — the accidental gated run was FLAGGED with 7 real flags (invented citizen ages/occupations, contradicted hardship canon, wrong cycle arithmetic, engine decimal leak), which is the gate's value demonstrated on live output.
- **Sample-overwrite fix:** runWrite routing now uses `uniqueDest()` (suffixes `-HHMM` when the same-persona+model+cycle sample already exists) so a cadence re-run no longer clobbers an earlier sample. `runWake` routing was left as-is (non-cadence path).
- **Caveats:** (a) one verification run of `--stage=report` omitted `--no-gate`, so a `record:true` self-record row + tension-state write fired (intake applied=no; minor, noted for honesty); (b) Jax's angle named "Marisol Garcia" as the official who should answer for Jack London — **unverified** whether she is a real canon official (Mayor is Avery Santana). This is a gate-class item: persona voices can hallucinate officials; Rhea's misrepresentation class or a name-check should catch it before compile.

**Fan-out + gate backstop (2026-07-25, Mike-direct; BUILT + cron installed):**
- **Marisol Garcia RESOLVED — hallucination confirmed by Mike** (not in the sim, not real-world Oakland). The Rhea cron was *instructed* to catch invented names, but instructions drift, so a deterministic backstop now feeds her: `scripts/canon-name-check.js` extracts person-name candidates from a draft and checks them against the ledger snapshot (930 citizens; whitespace-normalized — ledger has "Jax  Caldera" double-space rows) with neighborhood/place/prose stoplists. Verified on the firebrand sample: all 5 quoted citizens verified, **Marisol Garcia flagged not-in-ledger**; on the two flagged c102 drafts: real citizens verified, initiatives/orgs surface as must-verify. Wired into `cron-rhea-gate.js` — the gate prompt now opens with the NOT-FOUND list ("if used as a PERSON and unverifiable → HIGH-severity invented name; dismiss places/businesses/phrases") and the verdict JSON carries `nameCheck`.
- **Rotation (`scripts/newsroom-fanout.js`):** Mike's spec — 5–7 articles/day (~25–35/wk), nearly every byline journalist ~1/wk, sports + civic weighted 2–3. Quotas `{civic:2, sports:2, culture:1, business:1}` (sum 6); least-recently-used within each desk's beat pool (history from prior `fanout-*.json` files); personas attached by popid reverse-lookup. Verified: day 1 = Reyes/Delaine (civic), Reeve/Richmond (sports), Tran (culture), Velez (business); day 2 rotates all-fresh except GENERAL-pool reuse (sports has no dedicated bylines — Paulson excluded — so sports+business share the 4 GENERAL bylines; that's roster reality, not a bug).
- **`--fanout` on cron-desk-run.js:** one stage × today's whole rota; angle wake builds today's file if missing; per-assignment artifact stems (`civic_c102_angela-reyes_angle.json`) so two same-desk reporters never clobber each other; one failure never kills the rota (`fanout-<date>.<stage>.results.json`). Roster reporters (no persona) get the angle ask in their own voice via their POPID + reporter-voiced quote asks + their angle read injected at write. Live-verified: Angela Reyes angle wake, 1/1 ok (~$0.01).
- **Cron installed (2026-07-25; backup `output/codex/crontab-backup-2026-07-25.txt`):** 06:00 digest → 06:15 angle → 13:15 report → 18:15 write+gate. Write runs gated with **`--gate-backend api`** (see below). The 06:00 Phase-1 sampler line is retired (commented, kept for reference). Gated writes route to staged/ (probation wall) — nothing to canon until the Saturday compile.
- **API gate backend (2026-07-25, Mike: "does Rhea need to be Haiku?"):** NO — and DeepSeek is banned for a different reason than weakness: the *writer* is DeepSeek, and S325 proved self-grading fails (DeepSeek scored its own draft "0 hallucinations" with a 78 OVR leak in it). Haiku was only ever the choice because the gate ran on the `claude -p` tool harness — a premise made stale by the deterministic pre-checks. New `--backend=api` on `cron-rhea-gate.js`: one raw OpenRouter call (**google/gemini-3.5-flash**, independent family from the writer, enforced fail-loud by parsing the writer's model slug from the draft filename) with everything injected — Rhea's IDENTITY+RULES, the world summary, and THREE deterministic pre-checks: canon name-check, a new engine-verbiage body scan (ENGINE_TOKENS + POPID literals + raw decimals), and **ledger profiles of the verified citizens** (RoleType/neighborhood/birth-year/wealth/career — kills the invented-bio class). Verified on three drafts: the flagged Sonnet civic (2 engine-leak flags ✓), the firebrand sample (Marisol Garcia HIGH + construction-planning med ✓), and a fresh end-to-end `--gate-backend api` write (4 flags: Fruitvale sentiment inversion vs the injected summary, Gregory Mims identity contradiction vs his ledger profile, invented citizen "Isaac", engine verbiage ✓ — all four classes fired). Cost **~$0.06/gate, ~17s** (vs Haiku ~$0.15–0.25/100s+, Sonnet $0.74/147s) → ~$11/mo at 6/day, inside the $20–40 target with room. Claude backend remains the default for CLI use; cron uses api.
- **runWake uniqueDest:** patched (Mike-direct: "we shouldn't leave broken systems in case they are used") — same rerun-never-clobbers semantics as runWrite.

### Phase 2b — Saturday edition compile = the publish gate  *(research-build; sub-plan)*
**Probation week:** the only place a headless story becomes citable fact. A Saturday cron where **Mags compiles**: `/sift`-style curation over the week's **staged** articles → pick the top stories → assemble edition → `/post-publish` (existing **full** canon ingest: `ingestEditionWiki.js` + `ingestEdition.js` + world-data entity records + citizen cards). During probation this is the publish gate: M–F stages, Saturday publishes. **Post-graduation** (articles publish-on-write): the Saturday compile shifts to curating already-published canon into the edition — the same `/sift` → assemble → `/post-publish` shape, but over canon rather than staged drafts. Acceptance: one Saturday run produces a published, fully-ingested edition; during probation, staged-but-uncompiled drafts never entered canon.

**Cadence (S332, Mike):** the street-level crons write **short** pieces (shorter than the CLI long-view), so the shape is **~5 days of daily articles → 1 compiled for the edition** — the compile curates *down* from many short street-level drafts, not up from a few long ones. Tune the compile ratio against how these actually land during the probation week.

**Compile shape (Mike-direct 2026-07-25):** the fan-out produces ~25–35 staged/flagged articles per week; **Mags compiles a template edition of ~9** from the staged pool. A **rating system ranks candidates by "moves the sim"** (storyline advancement, initiative pressure, citizen impact — to be designed with the compile, not before). This compile is **the official edition and the only canon door at first**; with enough training/proof the daily gated articles graduate to direct-to-canon-on-write and the Saturday compile becomes curation of already-canon material (Phase 2 Step 5 graduation).

**Future — the "day of work" cadence (Mike-direct 2026-07-25, capture before design):** the newsroom fan-out is the journalists' "day of work" locked. The same shape extends outward:
- **Civic "day of work":** how city hall runs on crons — offices/project directors wake on their voice-packets, work the live agenda, answer outstanding reporter demands (Phase 3).
- **Citizen wakes cadence:** AM = work reflection (M–F?); midday = a conversation with a neighbor or a ledger bond; night = reflection on the city. (Extends today's citizen-wake/citizen-exchange crons into a full daily rhythm.)
- **Mags:** a Discord wake system + nightly journal — open question whether she needs her own wakes or is folded into the "day of work" (she compiles Saturday; does she reflect daily?).

### Phase 2.4 — NotebookLM daily listening consumer

`scripts/notebooklmDailyNews.js` is a read-side consumer of the probation output, not a publication path. It packages the latest `world_summary` with recent `staged/` and `samples/` Articles, excludes flagged Article bodies, and combines that pack with a cited continuity brief queried from the permanent published-Edition notebook. A separate working notebook receives one hashed bounded source per distinct input set and produces a written brief and source-scoped audio overview for Mike.

This does not weaken the probation wall: staged and ungated Articles remain explicitly unverified, the permanent `GodWorld` notebook receives published material only, and every daily artifact is `NOT_CANON`. See [[2026-07-10-notebooklm-bridge-deploy]] Phase 5 for the source hierarchy, failure contract, and schedule gate.

#### Prior-arc writer injection evaluation — not adopted (2026-07-26)

Task 7 in [[2026-07-25-notebooklm-source-search-wiring]] compared the same
Cycle 102 civic state with and without a bounded NotebookLM prior-arc packet.
The treatment received 18 verified excerpts (15.9k characters) from Editions
98–101 on Baylight, local hiring, apprenticeship, and Jack London warning
signs. It used none of that prior arc. Baseline failed Rhea with 3 flags
(2 high); treatment failed with 2 flags (1 high), for $0.1162 total API cost.
The lower treatment flag count therefore does not establish a retrieval
benefit.

Do not add this raw-excerpt shape to the scheduled newsroom. Both drafts stayed
`NOT_CANON` and unstaged. The writer's opt-in `--artifact-tag` exists only to
prevent evaluation files from clobbering one another; normal cron naming and
behavior are unchanged. Any retry must follow the protected Task 6
source-search contract and reduce verified prior coverage to a compact
claims-and-citations digest before composition.

The compact follow-up also failed the adoption test. `source-search` returned a
valid 1,602-character, 3-claim digest from the four selected Editions, but the
treatment used none of those claims. Baseline failed Rhea with 2 flags
(2 high); treatment failed with 3 flags (2 high). The completed comparison cost
$0.2098 including the agent's reported retrieval cost. Therefore digest size
was not the remaining blocker: append-only context does not make prior coverage
an Article requirement. Do not schedule compact injection. A future experiment
must separately design a Brief/PREWRITE field that binds one selected,
verified prior-arc claim into composition and evidence.

That binding evaluation is now complete. The treatment reused the existing
verified digest and received one mandatory Brief fact: prior Tribune reporting
placed Jack London's decline inside a fourteen-corridor contraction. It used
the fact in the body, emitted the required `PRIOR_PUBLISHED` Evidence entry,
kept the source UUID out of copy, and passed the fact through Rhea's opt-in
historical evidence context. Baseline failed with 5 flags (3 high); treatment
failed with 2 flags (2 high), at $0.1254 writer/gate cost. The remaining
treatment failures—an invented official already present in the lane and an
invented anonymous-source profile—are independent name/canon hygiene defects.

Conclusion: a structured prior-arc Brief field is the viable composition
shape; passive context is not. This is a design proof, not permission to add it
to cron. Production adoption requires the canonical Brief/PREWRITE schema,
deterministic provenance into Rhea, and clearance of the existing lane/name
hygiene blockers.

The controlled hygiene follow-up cleared only the first, obvious lane defect.
Both drafts received the same digest and required prior-arc fact; the treatment
alone replaced the two reporter-angle candidates that failed the ledger check
and received a strict no-invention prompt. It removed Marisol Garcia and the
anonymous bartender, but still failed Rhea with 4 flags (3 high), versus the
baseline's 5 flags (4 high): it relocated Gregory Mims and Crisis Coffee to
Fruitvale and misspelled Mims in Evidence. The lane supplied quote text and
POPIDs but not enough spatial provenance to prevent the relocation. Both drafts
used the required prior-published fact. Cost was $0.1191, with retrieval reused
at zero additional retrieval cost.

Therefore source hygiene is a data-contract problem, not another prompt-tuning
step. Before this seam can enter the scheduled writer, the Packet/Brief must
provide a deterministic allowed-source roster with person identity, location,
verbatim quote or explicit no-quote state, and attribution constraints; the
writer output must be checked against that roster before Rhea. Do not schedule
the evaluation-only redactor or strict prompt.

### Phase 2.1 — Rhea gate scope (Mike-direct S332)
Rhea's job is two flag classes, everything else the context supports **passes** — she polices the canon boundary, not the editorial voice:
- **Engine verbiage** — system language, raw metric names, status enums, dial decimals leaking into prose (e.g. `construction-planning`, `active internal state`, `Ripple Ledger`, `impactScore 51`). Flag → rewrite to citizen-facing language.
- **Misrepresentation of data output** — a claim that distorts or contradicts the actual ledger/audit value (a metric stated as falling when the audit shows it rising; a count off from canon; a prior-cycle stat presented as current). Flag → correct to the real value.

What **passes**: anything the world-summary/context genuinely supports — allegations, cross-signal connections, a reporter's inference from real data, editorial voice. The gate does not fact-check opinion or flatten voice; it strips verbiage and fixes data misrepresentation.

Reference run (one calibration sample, not the design's organizing case): `cron-rhea-gate.js` on the C102 Dirt Carnival, `output/cron-compare/baylight_dirt_carnival.rhea.json` (`pass:false`, Sonnet $0.96/147s). **Open verify — RESOLVED S332:** Rhea *passed* "Jack London retail down / crime spiking" and was **right** — the labeled anomaly audit (`engine_audit_c102` patterns[8]) shows `Jack London: decay [RetailVitality -1.90, CrimeIndex +2.99]`. Jax was accurate; the earlier "+0.16 up, real decline is KONO" call was a misread of a composite `world_summary` column (no headers). Both Jack London and KONO are in decay; Jax named the sharper one. Build: `rhea-morgan` RULES + the `cron-rhea-gate.js` prompt encode these two flag classes + the context-passes default.

### Phase 3 — city-hall headless (daily)  *(civic content, research-build infra; sub-plan)*
Same continuous model on the civic side: city-hall voices/agents wake M–F, work the active civic storylines (agenda → positions → votes as they occur), articles ingest to canon and feed Mags' Saturday compile. Mirrors the writer-worker shape on civic agents.

**Early notes — voice-packets = what runs city hall (Mike-direct S332, capture before design):**
- **voice-packets are the civic analog of `desk_signal`** — the packet that feeds each city-hall voice/agent (mayor, council, factions, project directors) its M–F wake material on the static cycle. Where `desk_signal` partitions the cycle by newsroom lane, a voice-packet partitions it by *office/agent*: which of this office's initiatives/votes/portfolio items are live, which reporter demands are outstanding against it (the friction loop), what its prior positions were.
- **Source = Mara voice directives (Mike-direct).** What a voice-packet *carries* should be sourced from Mara's voice-directive structure — the civic governance rules Mara already encodes (`docs/mara-vance/*` — CIVIC_GOVERNANCE_MASTER_REFERENCE, INITIATIVE_TRACKER_VOTER_LOGIC, IN_WORLD_CHARACTER, etc.). Mara's directives define how a civic voice is supposed to speak/decide; the packet hands each office exactly the slice of that its live agenda needs.
- **Precedent to build on: `scripts/buildMaraPacket.js` already exists** — it bundles the edition draft + Mara's AUDIT_HISTORY for her canon review (reader-not-engine framing). The voice-packet builder is the same *shape* (deterministic bundle of the right context for one agent), pointed at the civic agents instead of Mara-the-auditor.
- **"Making Mara an Anthropic API call" (Mike-direct):** the civic voices should run as **raw Anthropic API calls** (same off-subscription surface as the desk writers), not `claude -p`, so city-hall M–F is cost-recoverable like the newsroom. Mara-as-API is the model for the whole civic voice layer.
- **The friction loop is where this meets the newsroom** (north-star, already in the plan): a reporter's M–F accusation against an office becomes a voice-packet input that office must *answer* on its next wake — accusation → response → follow-up as a multi-wake arc. The sim pushes it (real unexecuted bond, real crisis), the newsroom pressures it, the office answers from its own real state.
- **Open design (research-build):** voice-packet schema (per-office partition of the cycle); civic cost unit (Sonnet vs DeepSeek per voice); how the reporter-demand → office-answer handshake is recorded; whether city-hall output is "articles" (desks report on it) or "statements" (raw civic record). Deferred until the newsroom side proves.

### Phase 4 — scorecard eval + cost tuning  *(sub-plan)*
Aggregate scorecards across the accrued articles to answer Feedback1.txt's per-desk question (is DeepSeek "90% for 20%?"). ~~Haiku-vs-Sonnet Rhea-gate cost test~~ — SUPERSEDED 2026-07-25: the gate moved to `--backend=api` (gemini-3.5-flash, ~$0.06/run vs Sonnet $0.76); see the API-gate-backend note under Phase 2.3. ~~Remaining cost question: flash-lite ($0.007/gate) vs flash verdict parity~~ — RESOLVED 2026-07-26 (S335 parity batch, 5 drafts, `output/cron-compare/parity/`): flash-lite fails parity. 3/5 verdicts matched, but both mismatches were flash-lite FALSE-PASSES — it passed drafts where flash caught high-severity canon contradictions catchable from the injected ground truth (business c102: unsupported retail/nightlife decimals; civic-sonnet c102: POPID literal leak + age/sentiment errors). A gate that fails open at 9× cheaper is not a gate. **Keep gemini-3.5-flash**; at ~28 gates/week the delta is ~$1.50/mo.

---

## Open questions

- [ ] **Rhea-flag disposition** (blocks Task 4 final behavior): a flagged draft → auto-reject + regenerate, or route to a human-edit queue? Default proposed: `flagged/` staging for human review first, no auto-regenerate until trust is established.
- [x] **Publish target** — RESOLVED (Mike-direct S332): **no freeze** (S313 retired). Week 1 = **probation-staging** (M–F stage, spot-check accuracy) purely for contamination safety, not a freeze. **On accuracy → graduate to publish-to-canon-on-write** (staging drops; Saturday compile becomes curation of already-published canon, not the publish gate). See Phase 2 Step 5.
- [ ] **Which desks are "voice-critical" vs "routine"** (blocks Task 3): Feedback1.txt names Hal Richmond/Mags/investigative/editorial as Sonnet; confirm the full split with Mike.
- [x] **Canon-ingest mechanism** — RESOLVED (S332): machinery already exists (`ingestEditionWiki.js` + `ingestEdition.js`, run today by `/post-publish`). Decision: M–F gated articles **stage** (retrievable by the Saturday compile only, `status=staged`, NOT ingested as fact); only the Saturday-**published** set gets full canon ingest — the subjective/citable wall (Phase 2 Step 5). Build caveat: ingest scripts are edition-shaped (read input contract before assuming per-article) + verify bay-tribune carries a draft/published tag. See Phase 2.
- [x] **Angle assignment** — RE-RESOLVED (Mike-direct S330, supersedes the S325 answer): there is **no angle-assignment stage**. The C101 cron test proved the reporter finds its own angle from injected state, and the locked charge rule (ADR-0012, engine.76/W5) fixes "engine assists WHO + WHAT-happened, never WHAT-to-say." The engine's structure is layers 1 (byline WHO — Phase 2.0) + 2 (per-desk signal partition WHAT — W5 half 1); the angle stays desk-side (layer 3). The S325 "PoolKey policy" dependency is **dropped** (content-ledger concept, not in W5). See the Design note above Phase 2.0.
- [x] **Citizen-quote hallucination fix** — RESOLVED (Mike-direct S330): reporters interview real citizen crons (`citizenVoice.js --batch`, pipeline.43 — built) instead of inventing sources. Gap is headless wiring only — see Phase 2 layer-4 wiring.

---

## What's left — go-live checklist (S332 session-end, engine-sheet)

**Newsroom machinery (Phase 2):** BUILT + proven wired (commit 705f656b). The six-layer `cron-desk-run.js --wake` runs civic c102 end-to-end. Remaining before live M–F operation:
1. **Quote adoption + byline-not-source** — the writer ignored injected quotes and used the byline as a source (canon violation). Prompt fixes applied (byline author-only, quotes as sole sources), NOT yet live-validated. **Prove on a cheap DeepSeek desk**, not civic-Sonnet, to keep iteration cost down. *(Ungated c102 samples generating in `output/cron-compare/samples/` for exactly this review — culture/business/civic, `--no-gate`.)*
2. **Submission-budget mechanism** — BUILT (S339). Hard weekly cap: `budgetReached()` in `cron-desk-run.js` counts `staged/*.staged.json` for the current cycle (default 28, `--budget-cap`/`NEWSROOM_WEEKLY_CAP` override) and exits the write wake before any writer spend; `--no-gate` samples exempt (never stage). Byline no-repeat is **SOFT by design** (Mike-direct S339 — civic gets 12 weekly slots vs 9 civic bylines, so hard no-repeat is impossible): `bylinePreference()` in `newsroom-fanout.js` sorts fresh-this-week bylines first, degrading to least-staged → LRU rather than dropping an article on a heavy cycle. Applied in both the fanout rotation builder and `resolveByline`. Same-STORYLINE repeat has no deterministic key pre-write (lane entries carry no storyline id; the angle is desk-side per ADR-0012) — storyline dedup stays with Saturday curation. Tests: `scripts/submissionBudget.test.js` (offline, PASS).
3. **Journalist usage→tier→fame ledger** — BUILT (engine.88, S339). No new ledger: the existing SL UsageCount→Tier ladder (bars 3/6/9, engine.69 decay) is the progression; the build was making an author's OWN work count. `cron-desk-run.js` appends a `byline-landed` Citizen_Media_Usage row at gate-pass; `ingestPublishedEntities.js` appends `byline-published` at edition publish (published article = weight 2 total); both new types added to EMERGENCE_USAGE_TYPES in `processAdvancementIntake.js`. Both writers idempotent + header-mapped. Column readiness audited S339: 1 corrupt cell fixed (POP-00017 `married`→0), blanks safe (all readers coerce `Number(x)||0`).
4. **THE GATE IS SUBSCRIPTION-LOCKED (critical finding S332).** `cron-rhea-gate.js` runs `claude -p` (Claude Code / Mike's subscription), NOT a raw API key — while the writer (Anthropic API) and quotes (OpenRouter) are off-subscription. So the "runs on recovered API tokens, not subscription" thesis holds for WRITING but **not for the GATE**. Since "cleared = canon" makes the gate mandatory, unattended off-subscription operation needs a **raw-API Rhea path** (the plan's deferred "bigger canon-lookup port"). Until then, downtime runs must use `--no-gate` (ungated samples, never canon) or wait for Mike's subscription. **This is the #1 blocker for true autonomous M–F.**
5. **Schedule** — no `at` on the box; `crontab` available. The M–F daypart cron (reuse citizen-wake's 2-wake morning/night per the 5→2 change) fires `cron-desk-run.js --wake` per active desk. Turning on continuous autonomous operation is **Mike's go** (outward-facing/hard-to-reverse), gated on #4.

**Cadence config (the numbers to bind):** budget **$20–40/mo** (subscription-token recovery, not new spend). Per-article measured: Sonnet-desk ≈ $1.17 (write $0.92 — the 223k-token explore phase is a trim target — + Haiku gate $0.22), DeepSeek-desk ≈ $0.25 (gate-dominated). ⇒ ~20–28 cleared articles/week, ~1/desk/day, all canon, all building journalists; edition curates the best ~8. Citizen wakes 5→2 (morning/night). Sample-generation surface: `cron-desk-run.js --wake --desk <d> --no-gate --cycle <N>` → `output/cron-compare/samples/`.

**Civic side (Phase 3):** early notes captured above (voice-packets = Mara-directive-sourced per-office packets; Mara-as-Anthropic-API; friction loop). Undesigned; research-build lane.

## Status log

### research.25 — status (drained from ROLLOUT, 2026-07-26 / S334)

Phase 1 DONE (writer/gate/route+scorecard); Phase 2.0 DONE incl. build (S331 engine.79a-d: 5 dark staffers + POPID join + eligibility gate + in-cycle hint cap; bench C110-C113 proven, live-deployed; NOTE stale-seam finding — live WHO-assist is buildContractSeeds/suggestStoryAngle_, Engine B v3 path never reaches the v4 deck) → next: Phase 2 daily writer-wakes (needs W5 half 1 signal partition).

### 2026-07-27 — fan-out filename handoff defect — fixed

The 2026-07-26 write wake produced six desk-only raw drafts, but
`cron-desk-run.js` expected reporter-specific draft paths. It therefore
recorded `0/6` and promoted no Article through Rhea into `staged/` or
`flagged/`. The downstream NotebookLM Daily News collector correctly ignores
those raw drafts.

Fixed under builder approval: non-persona fan-out assignments now pass the
reporter name slug through the writer's existing `--artifact-tag` namespace.
Persona and single-desk paths remain unchanged. Offline contract tests prove
the orchestrator's expected path equals the writer's emitted path and preserve
the firebrand filename. The next scheduled 18:15 write wake is the live proof;
no paid/manual wake or crontab change was used for validation.

## Changelog

- 2026-07-20 — Initial draft (S325). Research basis [[../research/2026-07-19-headless-cron-newsroom-agentic-rag]]; ignited by Mike's full-pipeline direction + Feedback1.txt validation. Phase 1 concrete (scorecard building this session); Phases 2–4 outlined to split into sub-plans when picked up.
- 2026-07-22 — Phase 2.0 designed + triaged (S330). Angle-assigner reframed → four-layer model; Phase 2.0 = byline WHO-assist spec; PoolKey dropped as stale; Phase 2 gained layer-4 citizen-quote pre-pass. No new files.
- 2026-07-22 — Phase 2.0 BUILT, bench-proven C110–C113, live-deployed (S331 engine.79a–d, engine-sheet). Seam corrections + results recorded in the Phase 2.0 section.
- 2026-07-22 — Phase 2 daily writer-wake wiring specced (S332). Assembly chain over live pieces; Step 5 staging wall (M–F stage, Sat publishes) resolves canon-ingest + contamination risk.
- 2026-07-22 — Freeze retired + reporter-record added (S332). Staging reframed freeze→probation; graduate to publish-on-write on accuracy. Step 6 (layer 5): reporter acknowledges own article to wiki (page doc + intake); NO LifeHistory per S312 double-hit.
- 2026-07-23 — Voice doctrine + Phase 2.1 Rhea gate scope (S332). Rhea flags 2 classes only: engine verbiage + data-output misrepresentation; context-supported content passes. Journalist-agnostic. Cadence ~5 short daily → 1 compiled.
- 2026-07-25 — Added the bounded NotebookLM daily-listening consumer pointer (Phase 2.4). It reads probation output without publishing or ingesting it; the separate bridge plan owns source scoping, delivery, and scheduling.
- 2026-07-26 — Recorded the Task 7 paired headless-consumption result. Raw
  verified-excerpt injection was not adopted because the treatment ignored its
  prior-arc packet; both samples failed Rhea and remained `NOT_CANON`.
- 2026-07-26 — Recorded the compact Task 7 follow-up. The treatment ignored a
  valid 1,602-character source-search digest and again failed Rhea, so no
  headless prior-arc injection was scheduled.
- 2026-07-27 — Recorded the structured Brief-binding proof. Required
  prior-published evidence reached both Article body and Rhea successfully,
  but scheduling remains blocked by unrelated lane/name hygiene failures.
- 2026-07-27 — Recorded the controlled source-hygiene follow-up. Redaction and
  a strict prompt reduced but did not eliminate canon failures; production now
  requires a deterministic source roster rather than another prompt-only retry.
- 2026-07-27 — Recorded the live fan-out filename handoff defect that left the
  July 26 write wake at `0/6` and supplied no promoted Article to Daily News.
- 2026-07-27 — Built go-live item #2 (S339 engine-sheet): submission budget —
  hard 28/week staged cap gating write wakes pre-spend + soft byline no-repeat
  (fresh-first, degrades to least-staged on heavy cycles) in the fanout
  rotation and resolveByline. Offline tests pass; next-day rotation dry-build
  verified against the live roster.
- 2026-07-27 — Built go-live item #3 (engine.88, S339 engine-sheet): journalist
  usage→tier→fame wired through the existing UsageCount ladder via
  `byline-landed` (gate-pass, cron-desk-run) + `byline-published` (edition
  publish, ingestPublishedEntities) Citizen_Media_Usage rows. Dry-run on the
  latest edition resolved 12/12 bylines (Margaret→Mags alias added).
- 2026-07-27 — Fixed that filename handoff by forwarding the roster reporter
  slug through the writer output namespace; deterministic roster/persona tests
  pass, with the next 18:15 wake retained as the live proof.
