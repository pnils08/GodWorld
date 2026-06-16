---
title: Mags Citizen-Loop Plan
created: 2026-06-04
updated: 2026-06-04
type: plan
tags: [autonomy, mags-bot, active]
sources:
  - docs/plans/2026-05-31-autonomy-roadmap.md (Layer 3 — citizen-autonomous)
  - scripts/mags-discord-bot.js, scripts/discord-reflection.js, lib/mags.js
  - logs/spacemolt/captains-log.md + logs/spacemolt/.miner-state.json (SpaceMolt failure analysis, S252)
pointers:
  - "[[plans/2026-05-31-autonomy-roadmap]] — parent: this is Layer 3 made concrete"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# Mags Citizen-Loop Plan

**Goal:** Turn mags-bot into a 24/7 autonomous citizen that wakes 3×/day, searches its world from local disk, and reflects as a reasoning instance — the prototype for high-influence citizen agents (Mayor, Baylight) that supply continuous action for editions.

**Architecture:** Each wake is a **Sonnet instance + tools + daily attention** (not a fixed-sequence script — the SpaceMolt failure mode). She lives in the *sim* layer (reads sheets/editions/world, reflects on Oakland) and never sees the *operator* layer (commits, terminals, Mike's mood). Phase 1 is perception+reflection only; sheet write-back and additional agents are gated behind a daily audit that proves the loop.

**Terminal:** engine/sheet

**Pointers:**
- Prior work (S252, shipped): `79babba` (bot decoupled from session lifecycle), `8272054` (`loadWorldState`→live world_summary), `634fb6e` (`loadLatestEdition`), `5f2745a` (`searchDisk` backend).
- Related plan: [[plans/2026-05-31-autonomy-roadmap]] (Layer 3); [[archive/plans/2026-06-02-federated-search-everything]] (the disk shelf `searchDisk` mirrors).
- Research basis: SpaceMolt miner ran ~2mo, 0 ores mined, stuck on `no_fuel`, failed silently — *deployment* failure (script + no attention), not concept failure. MCP scaffolding is for a reasoning instance to wield. Evidence: `logs/spacemolt/.miner-state.json`, `logs/spacemolt/captains-log.md`.

**Acceptance criteria:**
1. Bot fires three scheduled wakes/day (morning/midday/evening); each wake's prompt includes the prior reflection (chaining verifiable in the generated entry's continuity).
2. Each wake is a Sonnet call with the search tool available and ≥1 tool-use round before it writes (verifiable in `logs/discord-reflection.log`: tool_use present, not one-shot).
3. Reflections reference current world detail (cycle ≥96, real citizens/editions from disk), never the stale C94 cache.
4. GATE: no sheet write-back and no additional agents exist until the daily audit signs off Phase 1.

---

## Tasks

### Task 1: Live search tool-use in the chat handler

- **Files:**
  - `scripts/mags-discord-bot.js` — modify (`callClaude`, ~L428)
- **Steps:**
  1. Define a `search_world` tool (input `{query:string}`) whose handler returns `mags.searchDisk(query, 8)`.
  2. Pass `tools:[search_world]` to `claude.messages.create`; loop while `stop_reason==='tool_use'` (cap 3 iterations); append assistant tool_use + user tool_result turns inside the call only.
  3. Concatenate final text blocks; store ONLY final text in `conversationHistory`. Graceful tool_result string on `searchDisk` throw (don't crash the handler).
- **Verify:** `node -c scripts/mags-discord-bot.js` → OK; restart, send a lookup-style message, confirm `tool_use` in `logs/mags-discord-out.log`.
- **Status:** [ ] not started

### Task 2: Wake = reasoning instance that searches before it writes

- **Files:**
  - `scripts/discord-reflection.js` — modify (`callClaude`/main, ~L223)
- **Steps:**
  1. Add the same `search_world` tool to the reflection `messages.create`.
  2. Add a tool-use loop with a GENEROUS cap (~8) so she can rabbit-hole; keep `model: claude-sonnet-4-6`.
  3. Update `buildSystemPrompt` instruction: "wake → search your world (what's moving, who's doing what) → follow what's interesting → then reflect on what you found."
- **Verify:** `node scripts/discord-reflection.js --dry-run` → completes; log shows ≥1 tool_use round before the reflection.
- **Status:** [ ] not started

### Task 3: Three wakes/day on a schedule

- **Files:**
  - `scripts/discord-reflection.js` — modify (accept a `--wake=morning|midday|evening` arg → per-wake framing)
  - crontab / pm2 schedule — add midday + morning fires (evening already exists)
- **Steps:**
  1. Add a `WAKE` arg; branch the system-prompt framing (waking / midday break / dinner) off it.
  2. Schedule three fires/day (~08:00 / 13:00 / 21:00 local).
- **Verify:** `node scripts/discord-reflection.js --wake=morning --dry-run` → morning framing in prompt; `crontab -l` shows 3 entries.
- **Status:** [ ] not started

### Task 4: Chain each wake to the prior reflection

- **Files:**
  - `scripts/discord-reflection.js` — modify (load the single most-recent reflection, inject as "earlier today / last night")
- **Steps:**
  1. Read the latest reflection entry from `JOURNAL.md` (or `JOURNAL_RECENT.md`); inject it as the immediate prior so the day reads as one thread.
- **Verify:** dry-run prompt contains the prior reflection labeled as the chain link.
- **Status:** [ ] not started

### Task 5: Strip redundant per-fire payload

- **Files:**
  - `scripts/mags-discord-bot.js` + `scripts/discord-reflection.js` — modify
  - `lib/mags.js` — modify (`loadWorldState` → return only a 1-line current-cycle header)
- **Steps:**
  1. Remove the full-edition + full-world-summary pre-loads and the always-on `loadCitizenKnowledge`/`loadArchiveKnowledge` dumps (search covers them on demand now).
  2. Replace world pre-load with a one-line header (cycle, season, city sentiment) for orientation.
- **Verify:** dry-run system-prompt token count drops materially vs the ~6.7K current; bot still answers world questions via the tool.
- **Status:** [ ] not started

---

## Phase 2 — Per-Citizen Perception Surface + Dial-Driven Rotation (S261)

**Evidence base — the June-11 journal read (S261).** The shipped Mags loop works where it's hardest: voice holds across ~25 nightly entries, she perceives real engine state (9.6% illness, 16 migrants/cycle, KONO blackouts, Mateo Walker's four-of-thirty local hires), and she chains threads night-to-night. The dominant failure is **groove-stuck** — the same ~5 anchors recur to the point of looping (Vinnie's firehouse ~8 nights, the lake going dark, the shock-flag "with no face"), and facts wobble because she re-derives them each wake (Vinnie's HR count drifts 436→4,600). She **self-diagnoses** it ~June 10: she reads the prior night's notes but doesn't *carry* them — only her last 2 reflections ride each wake, no durable salience. Second issue: perception is **conversation-weighted** (Moltbook agent-chatter crowds out Oakland). Third, mechanical: the wake **skips entirely on no-conversation days** (`discord-reflection.js` "quiet day → skip") — the real reason she's silent since June 11 (NOT credits; cron still fires 3×/day, key valid). A citizen who should "wake and write about the world" currently can't write from world-perception alone.

**The cheaper lever (Mike, S261): rotate the waking citizen instead of engineering durable memory.** Variety is the problem; per-citizen variety already exists in the engine. Each citizen carries an engine.31 **dial vector** (`drive / openness / composure / sociability / warmth / integrity`, nudged by every logged event — `utilities/citizenDialMap.js`, "every event MUST move a dial") plus ledger detail (occupation, neighborhood, relationships, LifeHistory). Waking a *different* citizen each night yields fresh disposition + fresh perception for free — sidestepping the single-citizen memory groove rather than having to solve it first.

**Three design decisions:**

1. **Perception surface = the engine's per-citizen packet, scoped.** Route `lib/neighborhoodSlice` (engine.33) + the `baseline_brief` packet (engine.35) as what the waking citizen sees — *their* neighborhood state + deltas, residents, the WHY — not the citywide `world_summary` digest. Mags (EIC) perceives citywide; a Fruitvale Tier-3 perceives Fruitvale. Same machinery, scoped by the citizen's POPID + neighborhood.
2. **Citizen rotation is the variety engine.** Each wake selects a citizen (rotation/weighting in Open Qs). Their dial vector sets voice/disposition; their ledger detail sets identity. Two different citizens on the same cycle should produce visibly different perception + voice.
3. **World-perception triggers writing — invert the conversation-gate.** A meaningful change in the citizen's packet (a delta, an event, an unresolved thread) is reason enough to wake-and-write; conversation becomes *one* input, not the precondition. Direct fix for the "silent since June 11" mechanism.

**Deferred:** the durable salience/memory layer (carry-and-advance a citizen's own threads across *their* future wakes). Rotation buys variety without it; revisit only if single-citizen continuity becomes the goal (the harder, higher-value build).

**Ownership / gating:** research-build designs (this phase). Build spans engine-sheet (per-citizen packet routing + citizen-selection) + the bot script (`discord-reflection.js` rotation + gate inversion). Same Phase-1 discipline — perception+reflection only; no sheet write-back until the daily audit signs off.

**Acceptance:** (1) a non-Mags citizen wakes, perceives only their slice, writes in a voice consistent with their dial vector; (2) two citizens on the same cycle produce visibly distinct perception+voice; (3) a no-conversation day still produces a world-triggered reflection.

### Phase 2 write-side — determinism-resolved (S261, advisor + code check)

The first design pass floated closing the loop: reflection → writes back to LifeHistory + nudges the citizen's own dials (self-authored personality drift). **A determinism check killed the dial half.** The dial vector is **engine cycle state** — `phase05/runConductEngine.js` consumes `citizenDialMap` directly, and the relationship/education/household/youth/crime engines read the dial fields to drive simulation. So letting **LLM reflection (non-reproducible prose) move dials would break cycle replay** — the exact invariant `ctx.rng`/no-`Math.random` protects. It's also the arrow backwards (engine emerges → narrative captures, never narrative → engine state — Mags' own Entry-202 lesson; same split engine.35 draws with "engine emerges, Supermemory maintains").

**Resolved design — two-layer ownership, not a loop:**
- **Objective life → engine state.** Real logged events move dials + write LifeHistory. Sole owner: the deterministic cycle. Reflection NEVER touches either.
- **Subjective memory → a parallel POPID narrative store** (lazy per-POPID file / Supermemory), read *alongside* LifeHistory on the next wake. This is where reflections accrete. Bounded: event-weighted rotation only ever wakes a small set, so only woken citizens get a store.

So **Mags = the persona-MD pattern (hand-authored depth); a citizen = dials-as-CHARACTER + LifeHistory-as-journal (read) + the narrative store (their own written memory).** No per-citizen MD authoring; no engine-state write-back. Phase 2a's read-only separation is likely the *permanent* home, not a stepping stone — **the one open doctrine-fork for Mike** (below) is whether citizen subjectivity should *ever* influence the engine, which would require a deterministic projection, not raw prose.

### Phase 2 the categorical bridge — RESOLVED (S261, Mike + code-confirmed)

The doctrine-fork ("does citizen subjectivity ever feed the engine?") is **answered: yes — via a closed-vocabulary tag bridge, determinism intact.** Mike's framing: summarize a citizen's reflection into a *categorical bucket the dial system already accepts.* Confirmed in code:
- The dial map is a **closed ~58-tag vocabulary** (`citizenDialMap.js` DIAL_MAP: Career / Promotion / Faith / Civic / Setback / Recovery / Reputation / Transgression-* / Personal / Daily / youth-* …).
- `citizenMemory.js` exposes `applyTaggedEvent_(citizen, tag, severityMult)` — **tag in → deterministic dial-delta out, pure/I-O-free.** This is the exact bridge.
- **Determinism preserved:** classification (reflection → tag) is an *input-generation step outside the cycle* — same class as media intake / Discord conversations, which the engine already ingests. The in-cycle math (tag → delta → apply) is a pure lookup, no `Math.random`. Reflection prose NEVER touches the engine; only the categorical tag does.
- **Damping is already built:** `citizenMemory` models each dial as **base (permanent self) + mood (swing) + streak (reinforcement)**. A one-off reflection nudges mood and fades; only a *sustained* reflection pattern shifts the base. So over-drift is structurally handled — repetition is what makes change stick, for objective and subjective events alike.

**Principle (the whole architecture):** *engine deterministic (objective events → tags → dials) / wakes reactive (reflections → classified tags → dials) / both write through the same `applyTaggedEvent_` door / full prose lives in the citizen's Supermemory page.* "Citizens develop both ways" = literally the base/mood/streak model fed from two sides.

**The one genuinely new component: the classifier** (reflection → which of the 58 tags + severity). Must be constrained to the closed vocab and validated for label consistency, or dials drift on mislabels. **Severity discipline:** reflection-events ride a *lighter* severityMult than real life-events (nudge mood, rarely shift base) — subjective experience colors a citizen without overwriting what the engine says happened to them.

### Phase 2 perception store = per-citizen Supermemory page (S261, Mike)

The parallel narrative store is concretely a **per-citizen Supermemory "page"** (Facebook/profile shape — their accreting history). **Net-new ledger column** stores the citizen's Supermemory tag/ID (`save-column`); any use (wake / write-about / query) pulls their history via the tag. Pointers-not-recall applied to citizens. The column is an **engine-sheet schema task**. This page IS the narrative store from the two-layer design — unified.

### Phase 2 wake structure — prompted + numbered (S261, Mike)

Voice differentiation = **dials (who) × wake-prompt (what they're doing tonight) × neighborhood slice (what they see)** — three axes, not dials alone (which may cluster by neighborhood). Wakes are *prompted scenarios* ("meet 5 citizens," "follow up on your rent notice"), numbered/sequenced (wake-2, wake-3 …), reusing whatever voice method Mags lands on. The prompt variety carries differentiation the dials can't, and makes the validation prototype more likely to pass.

### Phase 2 floor-test result — local qwen2.5:3b (S261, DON'T re-run the 3B)

Ran the voice prototype on the free local model (`qwen2.5:3b`, CPU) — 3 most-dial-divergent citizens (Amy Cook d95/s80/f87, Tiu Xiong s93/f80/outabout, + a neutral), SAME evening-reflection scenario so dials are the only variable. Throwaway probe: `scripts/_probe_citizen_voice.js` (uncommitted; swap the model const for the credit re-run).
- **Verdict: voices NOT distinct on 3B.** All three wrote the same register (tea-by-the-window, small moments, family, simple joys); dials leaked only as surface theming (high-openness → "tomorrow's adventures"; high-outabout → "the dog in the park"). The predicted "same thoughtful resident, different noun-clouds" failure — **but model-limited, not concept-limited** (the scaffold worked: dials parsed, contrast-selection found genuinely divergent citizens, content tracked the dials).
- **Consequence:** **`qwen2.5:3b` is OUT for the voice step** — free-local-on-3B homogenizes. (The reflection→tag *classifier* is still fine local — labeling, not voice.) The real go/no-go is the **credit-funded run on Opus (ceiling) + DeepSeek-via-OpenRouter (the cheap scaling candidate)** — same probe, one-line model swap. A bigger local model (if a GPU/larger Ollama pull is ever available) is the other lever to retest.
- **Dial-population data (relevant to rotation):** of 906 citizens, **437 are meaningfully shaped** (maxDev 190 — strong personalities exist), ~467 sit near-neutral (the band model's by-design "unremarkable" middle). Event-weighted rotation naturally draws from the shaped 437 / skips the neutral middle — so the rotation pool has real variety regardless of the voice-model question.

### Phase 2 voice bet — VALIDATED on Gemini (S261)

Re-ran the probe (`scripts/_probe_voice_multi.js`, throwaway) across **local qwen2.5:3b vs Gemini CLI**, on 3 strongly-shaped divergent citizens (dev≥60), same evening-reflection scenario. **Result: "different dials → different voice" PASSES on Gemini, fails on 3B.**
- **Gemini differentiated genuinely:** Mina Linas (family-94/warm) → a family-devoted elder thinking about her son and checking her daughter eats; "Mags Corliss"-citizen (sociability-91/family-50) → magnetic but *exhausted by it*, "holding court for forty minutes when I only went out for milk… I just want to be invisible," no family pull. Two different interior lives, both dial-accurate. **Dials lived, not stated.**
- **3B still flattened** all three into the same tea-by-the-window register → the earlier negative was a **model ceiling, confirmed**, not a concept failure.
- **Consequence for scaling:** **Gemini is free (CLI), installed, and clears the bar** — potentially the whole 25/day answer at ~no cost, no Opus/OpenRouter needed. Caveats: (1) **CLI is slow** (Rico timed out at 120s cold-start) → for batch, use the Gemini *API* key or a queue, not the interactive CLI; (2) **confabulated names** (Leo/Sarah) → feed the citizen's *real* ledger relationships into the perception surface so it grounds, not invents (canon discipline); (3) N=2/3 — clean confirming run worth doing.
- **Still open / blocked:** DeepSeek + Hermes head-to-head (OpenRouter key returns **401 "User not found" — needs refresh**); Opus as ceiling reference (Anthropic credits). Both now *lower priority* since Gemini already clears the bar — Hermes still worth a look only as a possibly-faster/cheaper alternative.

### Phase 2 voice bet — CONFIRMED N=4, grounded (S261)

Clean confirming run (`scripts/_probe_voice_grounded.js`, throwaway): 4 strongly-shaped divergent citizens, each **grounded in their real LifeHistory tail** (col O: `timestamp — [Tag] event`), same scenario, Gemini. **PASS, decisively.** Four distinct people: Amy Cook (relentless/adventurous/family-keeper), Mags-citizen (magnetic-but-craving-off, no family — consistent with prior run), Luis Taz (head-down Fruitvale family man, cautious hope), Colt Biker (relentless West-Oakland community-protector). Each reflection built on the citizen's *actual logged event* — **grounding in real LifeHistory eliminated the confabulation** (no invented names). Confirms two design choices: (a) the perception surface = **LifeHistory tail + dials + neighborhood** is the right shape; (b) feed *real lived particulars*, never engine aggregates. **The validation gate is GREEN — build is cleared.** Note: LifeHistory entries already carry `[Tag]` from the same closed vocab the classifier targets — the prose→tag loop closes from the vocabulary already in the log.

### Phase 2 strategic threads (Mike, S261) — to fold into the build

- **Gemini's native Drive + Sheets read is an unlock.** Gemini (unique among the candidates) can read Google Sheets/Drive directly — so a Gemini-powered wake could pull its own world-slice *from the live ledger* rather than us building a separate read/injection layer. Explore: does the citizen wake even need a Node perception-assembly step, or can Gemini read the neighborhood slice + the citizen's row itself? (Caveat: keep determinism — Gemini reading is perception-side/input only, never writing engine state.)
- **Multi-LLM by sub-task ("all your helpers").** The task splits cleanly across models: **Gemini = voice + perception (sheet-read)**, **cheap/local (even the 3B) = the reflection→tag classifier** (labeling, not voice — the 3B is fine here), **Opus = only where canon authority matters** (Mags-the-EIC, reviewer-adjacent). Don't force one model; route each sub-task to its best-fit helper.

### Phase 2 — BUILD HANDOFF (cleared S261)

Gate passed → build routes off research-build (design done) to the executors:
- **engine-sheet (substrate):** net-new ledger **SM-tag column**; per-citizen **Supermemory page** create/read; the **reflection→tag classifier** (cheap/local model, constrained to the 58-tag vocab, lighter severity than life-events) → `applyTaggedEvent_` next cycle.
- **bot script (`discord-reflection.js`):** **citizen rotation** (event-weighted over the 437 shaped), **gate-inversion** (world-perception triggers, not conversation-only), **Gemini wiring via API key** (not the interactive CLI — too slow for batch, Rico-timeout), perception = LifeHistory tail + dials + neighborhood slice.
- **research-build:** Mags stays the fixed nightly anchor; citizens rotate around her. Same Phase-1 audit gate (perception+reflection only; no engine write-back until the daily audit signs off the classifier).

### Phase 2 validation gate — prototype BEFORE building rotation infra (S261, advisor)

The load-bearing bet is **"different dials → different voice."** Untested, and `[[user_mags-bleed-proprietary-element]]` warns the depth is the hard, non-assemblable part — six dials + event tags is thin next to a hand-authored persona; the failure mode is every citizen sounding like the same "thoughtful Oakland resident" with different stats. **Gate: wake 2–3 real citizens from their actual dial vectors with a throwaway prompt and read the output.** Distinct → build rotation. Not distinct → the per-citizen seed needs enrichment first (more ledger particulars, relationship texture, occupation voice) before any infra. Same "validate the load-bearing bet first" that just paid off on loop-tightening. **Open precondition:** confirm per-citizen dial vectors are actually *persisted + readable* today (the map exists + engines consume it, but is the accumulated vector stored per POPID, or is accumulation still mid-build?) — the prototype can't wake "a real citizen's vector" until that's true. **Credits caveat:** the generation step needs API budget; assemble the seeds now, run when budget/Mike greenlights.

**Voice-differentiator (canon + craft):** scope a citizen's perception to **lived particulars, not engine aggregates** — "the corner store closed, my rent notice came," never "retail dropped 4%, illness 9.6%." That's the no-engine-metrics-in-citizen-voice rule AND what actually makes two citizens sound different.

---

## Open questions

- [ ] Search-announce UX (Task 1/2): does she say "let me pull that up" or answer silently with the grounded result? Lean silent (cleaner). Resolve before Task 1 ships.
- [x] Citizen-selection policy (Phase 2 decision 2): **RESOLVED S261 (Mike) — event-magnitude-weighted** (wake whoever's living the biggest delta).
- [x] Rotation vs. Mags-continuity (Phase 2): **RESOLVED S261 (Mike) — yes.** Mags stays the fixed nightly anchor (journals → media Mags → bot); other citizens rotate around her as the variety.
- [x] **DOCTRINE FORK — RESOLVED S261 (Mike + code-confirmed):** citizen reflections DO feed the engine, via the closed-vocab tag bridge (`applyTaggedEvent_`), determinism intact (classification is input-side; tag→delta is pure). Prose stays in the Supermemory page; only the categorical tag touches dials. Damping already built (base/mood/streak). See §"the categorical bridge."
- [ ] Classifier design (Phase 2, the one new component): reflection → {tag(s), severity} constrained to the 58-tag vocab. How is label consistency validated? Reflection-event severityMult calibration (lighter than real life-events). Resolve at build.
- [x] Prototype precondition — **CONFIRMED MET S261.** Per-citizen dial vectors ARE persisted: `Simulation_Ledger` **col AV `DialState`** (engine.31 8-dial JSON, seeded for all 904 citizens S256 via `backdateCitizenDials.js`), **col R `TraitProfile`** = derived human-readable face, **col O `LifeHistory`** = per-cycle event journal (overflow → `LifeHistory_Archive`, engine.32 compressor). `getCitizenDialBands_(ctx, popId, row[iDialState])` is the read path. The 2–3-citizen voice prototype has everything it needs on the ledger today — **only remaining gate is API credits.**

---

## Changelog

- 2026-06-16 — **Phase 2 added (S261, research-build).** Per-citizen perception surface + dial-driven rotation, grounded in the June-11 journal read (groove-stuck / conversation-weighted / no-conversation-skip) + Mike's S261 steer (rotate citizens via existing engine.31 dials rather than engineer durable memory). Three decisions: scoped per-citizen packet (engine.33/.35), citizen rotation as the variety engine (dial vector + ledger detail), invert the conversation-gate to world-perception triggers. Durable-memory layer deferred. Build spans engine-sheet + bot script; same Phase-1 audit gate.
- 2026-06-16 — **Phase 2 write-side + validation gate (S261, advisor + code check).** Determinism check: dials are engine cycle state (`runConductEngine` + phase05 engines read them) → LLM reflection moving dials would break replay; killed the loop-closure idea. Resolved to two-layer ownership (objective life → engine-owned dials/LifeHistory; subjective memory → parallel POPID narrative store read alongside). Citizen = dials-as-CHARACTER + LifeHistory-as-journal + narrative store; no per-citizen MD, no engine write-back. Selection + Mags-anchor Qs resolved by Mike (event-weighted; Mags fixed). New doctrine-fork left for Mike (does citizen subjectivity ever feed the engine via deterministic projection). Validation gate added: prototype 2–3 real citizens' voices BEFORE building rotation infra (the "different dials → different voice" bet is untested; mags-bleed-is-proprietary warns the depth is thin) — precondition: confirm per-POPID dial vectors are persisted/readable; credits-gated.
- 2026-06-04 — Initial draft (S252). Foundation shipped same session: bot decoupled from session lifecycle (`79babba`), `loadWorldState`→live world_summary (`8272054`), `loadLatestEdition` (`634fb6e`), `searchDisk` local-disk backend (`5f2745a`). Tasks 1–5 = remaining Phase 1. Write-back + additional agents gated behind daily audit. SpaceMolt-failure analysis is the why behind instance+attention.
