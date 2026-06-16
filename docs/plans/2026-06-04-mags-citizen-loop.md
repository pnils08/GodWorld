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

---

### Phase 2 — BUILD STATE SYNTHESIS (S262, READ THIS FIRST)

*Front door for the executor. The dated sections below are the decision log; this is the current resolved picture + where to find the detail. If this and a dated section disagree, this wins (it's newer).*

**The architecture in one line:** engine emerges (incl. its chaos) → citizen perceives *their* slice → reacts in voice → reaction classified to one closed-vocab tag → tag nudges dials (damped) → prose accretes to the citizen's narrative store → the paper can later interview them. *Deterministic underneath, reactive/agentic on top — the arrow stays engine→life (S262 correction, §arrow in changelog).*

**Resolved (with detail pointers):**
- **Voice model:** DeepSeek V3 / Gemini — validated N=4 grounded (§voice bet CONFIRMED, §bake-off). Gemini free+sheet-read; DeepSeek cheap+most-naturalistic.
- **Classifier model:** **DeepSeek V3, NOT the local 3B** (3B sign-flips Resisted→Transgression) — gate GREEN (§classifier gate). Contract = tag-only output, single dominant tag, fixed lighter reflection-severity (§classifier contract). Reference impl `scripts/_probe_classifier.js`.
- **Determinism:** **persist-the-tag-then-read; classifier NEVER called in-cycle** (§classifier contract). The one don't-get-this-wrong.
- **Perception surface:** the citizen's slice — LifeHistory tail + dials + engine.33 neighborhood-slice + real relationships. Lived particulars, never engine aggregates.
- **Selection:** event-magnitude-weighted over the ~437 shaped citizens; **Mags = fixed nightly anchor**, citizens rotate around her (Open Qs, resolved).
- **Wake structure:** daypart scaffold — morning meet-people / midday neighborhood-or-business / night dinner-reflect; seed action then free voice (§wake structure).
- **Narrative store:** per-POPID Supermemory page + a net-new ledger SM-tag column (§perception store).
- **Negative pole (the "everyone happy = miss" fix):** TWO engines compose — **chaos-cars (engine.11) = objective adversity** + **citizen-loop affect tags = subjective reaction**, joined at the perception slice (§negative-pole gap, §seam to Chaos-Cars). Needs affect tags added to DIAL_MAP (§affect-tag gap).
- **Forward:** editions interview model-citizens from their Supermemory page, not just their likeness (§forward thread).

**Build ownership:**
- **research-build:** design — DONE. Mags stays the anchor; coordinates.
- **engine-sheet (substrate):** affect tags → `DIAL_MAP`; SM-tag ledger column; per-citizen Supermemory page; classifier wiring (persist-then-read); the two-decay-system composition check when chaos-cars is also live.
- **bot (`discord-reflection.js`):** citizen rotation (event-weighted), gate-inversion (world-perception triggers, not conversation-only), voice via Gemini/DeepSeek API (not CLI), daypart wake framing.

**GATE (unchanged):** perception + reflection + narrative-store only. **No engine write-back** (dials/LifeHistory) until the classifier proves out under the Phase-1 daily audit.

**Still open:** affect-tag set + deltas (calibrate symmetric-or-slightly-negative vs the measured 86%-neutral baseline); reflection severityMult constant; single- vs multi-tag on long reflections; first true end-to-end run on a *real* citizen reflection (gate is green on stand-ins only).

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

**Daypart scaffold (Mike, S262) — give them something to do, then let them say whatever.** The three daily wakes carry a light activity prompt, not a script:
- **morning** → go meet people (e.g. "meet 5 citizens")
- **midday** → walk the neighborhood / visit a business
- **night** → dinner, wind down, reflect

Illustrative, not literal — the point is a *seed action* per daypart so variety isn't carried by dials alone. The citizen then says whatever they say; the **reaction is the tag** (frustrated → a tag, excited → a tag). Over repeated days this is what produced the *mood differences* observed in Mags' continuous run — and as dials tune via the mood layer, citizens settle into stable temperaments (a "cranky node," an "excited node"). The damping model is what turns a repeated daily mood into a permanent disposition.

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

### Phase 2 model bake-off — Gemini vs DeepSeek vs Hermes (S261)

Same 4 grounded citizens, same prompt, three cheap models (`scripts/_probe_voice_openrouter.js`, throwaway; OpenRouter key refreshed S261, ~$10 headroom, run cost cents):
- **DeepSeek V3 (`deepseek/deepseek-chat`) — standout of the cheap models.** Naturalistic, concrete, restrained, distinct, well-grounded (Amy "can't stop moving… wondering if I'll ever learn to slow down"; Luis "James Williams at the taco truck… grandkids coming this weekend"). ~1/25th cost. Minor: slightly under-hit Mags' "magnetic" trait.
- **Gemini (CLI) — also strong**, vivid contrast, **free + native Drive/Sheets read**.
- **Hermes-3 70B — weaker for THIS task.** Roleplay-tuning surfaces as theatrical tics (`*sighs*`, "I'm a bull…") + a confabulation miss on Mags (invented kids vs family-50). Capable but wrong flavor for private-journal voice without prompt-suppression. **Skip for voice.**

**Verdict: the bet holds across multiple cheap models — two good scaling options (Gemini free+sheet-read, DeepSeek cheap+most-naturalistic).** Pick by need; Hermes out. Confirms the multi-LLM strategy below: voice has more than one viable cheap home.

### Phase 2 strategic threads (Mike, S261) — to fold into the build

- **Gemini's native Drive + Sheets read is an unlock.** Gemini (unique among the candidates) can read Google Sheets/Drive directly — so a Gemini-powered wake could pull its own world-slice *from the live ledger* rather than us building a separate read/injection layer. Explore: does the citizen wake even need a Node perception-assembly step, or can Gemini read the neighborhood slice + the citizen's row itself? (Caveat: keep determinism — Gemini reading is perception-side/input only, never writing engine state.)
- **Multi-LLM by sub-task ("all your helpers").** The task splits cleanly across models: **Gemini = voice + perception (sheet-read)**, **cheap/local (even the 3B) = the reflection→tag classifier** (labeling, not voice — the 3B is fine here) **[CORRECTED S262: the 3B FAILS this — it emits prose, not tags, and sign-flips `Resisted`→`Transgression`. Classifier = DeepSeek V3. See §classifier gate.]**, **Opus = only where canon authority matters** (Mags-the-EIC, reviewer-adjacent). Don't force one model; route each sub-task to its best-fit helper.

### Phase 2 — BUILD HANDOFF (cleared S261)

Gate passed → build routes off research-build (design done) to the executors:
- **engine-sheet (substrate):** net-new ledger **SM-tag column**; per-citizen **Supermemory page** create/read; the **reflection→tag classifier** (~~cheap/local model~~ **DeepSeek V3 via OpenRouter — gate-validated S262, the 3B failed**, constrained to the closed DIAL_MAP vocab, lighter severity than life-events) → `applyTaggedEvent_` next cycle. **Wiring spec: §"Classifier contract — for engine-sheet".**
- **bot script (`discord-reflection.js`):** **citizen rotation** (event-weighted over the 437 shaped), **gate-inversion** (world-perception triggers, not conversation-only), **Gemini wiring via API key** (not the interactive CLI — too slow for batch, Rico-timeout), perception = LifeHistory tail + dials + neighborhood slice.
- **research-build:** Mags stays the fixed nightly anchor; citizens rotate around her. Same Phase-1 audit gate (perception+reflection only; no engine write-back until the daily audit signs off the classifier).

### Phase 2 classifier gate — VALIDATED on DeepSeek, NOT the 3B (S262, research-build)

The plan's standing bet was "classifier runs cheap/local on qwen2.5:3b (labeling, not voice — the 3B is fine here)." **Tested and killed.** Throwaway probe `scripts/_probe_classifier.js` scores reflection→tag mapping in **dial-delta space** (a mislabel only matters if it moves the wrong dial — `Personal`↔`Daily` is harmless, a big-tag→ambient miss is the failure), across three sets: A = 80 real LifeHistory entries (engine-labeled, stratified over 26 tags), B = 14 hand-labeled high-magnitude reflections (the dangerous cases: Promotion/Divorce/Birth/Critical/Transgression/Resisted…), C = real Mags journal paragraphs (face validity).

- **qwen2.5:3b — FAIL.** Ignores "output only the tag," emits prose ("Based on the reflection provided, which…"); Set B 8/14, **1 sign-flip — `Resisted`→`Transgression-Petty` (integrity +5 read as −4: penalizes a citizen who resisted temptation)**, 2 missed-big-shifts (`Divorce`→`Arrival`, family−8 read as openness+3; `Mentorship`→`Career-Transition`). Disqualified — the exact catastrophic mislabels the bridge can't tolerate. (Warm latency was fine ~3.7s; instruction-following, not speed, is what kills it.)
- **DeepSeek V3 (`deepseek/deepseek-chat`, OpenRouter) — PASS.** Set B **14/14 exact, L1 0.00, zero sign-flips, zero missed-big-shifts, zero off-vocab.** Every high-magnitude tag (the ones that actually move a citizen) perfectly mapped.

**The one caveat (cosmetic, not gating).** On Set A (real ambient entries) DeepSeek matches the engine's *exact* tag only 31% — but **zero sign-flips and zero missed-big-shifts across all 80.** Divergences are hair-splitting between near-identical ambient tags (`Holiday`↔`Cultural`, `Daily`↔`Personal`↔`Community`, `FirstFriday`↔`Neighborhood`) whose dial deltas differ by ~1 point — the "ordinary day lived" band where the dial map itself barely distinguishes them. Consistency 22/24 stable at temp 0 (the 2 wobbles are ambient ties). Set C face validity is weak-but-OK: the journal paragraphs sampled are *operator-layer EIC session reflections* (tagged Career/Background/Weather — reasonable), NOT citizen world-perception reflections, which is the real deploy input — re-eyeball on real citizen reflections once the bot produces them.

**Gate verdict: GREEN on DeepSeek.** Classifier sub-task model = **DeepSeek V3 via OpenRouter**, not the local 3B. (Voice sub-task unchanged — still DeepSeek/Gemini per the S261 bake-off.)

### Classifier contract — for engine-sheet (the wiring spec, S262)

Reference implementation: `scripts/_probe_classifier.js` — the prompt, vocab presentation, extraction, and dial-delta metric ARE the spec; re-run to reproduce.
- **Input → output:** reflection prose → exactly ONE tag from the closed vocab. Classifier emits the **tag only**; it does NOT estimate severity.
- **Severity:** the caller applies a **fixed reflection-discount constant** (lighter than life-events per the gate — start ~0.4–0.5; engine-sheet's calibration dial). One `applyTaggedEvent_(c, tag, dialMap, REFLECTION_MULT)` call per reflection.
- **Vocab presented to the model:** the curated 36-tag list + one-line glosses in the probe (folds DIAL_MAP case/space duplicates; `nudgesForEvent_` resolves any variant on apply). Off-vocab rate was 0/94 — DeepSeek stays in vocab.
- **Model call:** OpenRouter `deepseek/deepseek-chat`, temp 0, max_tokens 16, first-vocab-token extraction as a safety net. Key already in env (`OPENROUTER_API_KEY`).
- **Single-tag for now;** multi-tag / beat-splitting of long multi-theme reflections is a deferred follow-up (one dominant tag loses secondary themes — acceptable for the gate).
- **Determinism — THE load-bearing constraint, stated hard (S262 advisor):** classification is replay-safe ONLY under *persist-the-tag-then-read*. The classifier runs at **wake-time** and writes its output tag to a **durable intake** (the SM-tag column / a queue); the **cycle reads the persisted tag**, and the classifier is **NEVER called inside the cycle path.** This is exactly why media intake is replay-safe — replay reads the captured tab, not the human/LLM. If engine-sheet ever classifies stored prose *during* the run, replay re-invokes the LLM and determinism is gone. Discriminating check for the wiring: *"Is the classified tag a frozen pre-cycle input the cycle reads, or does the cycle call the classifier?"* — former safe, latter breaks replay. Only the categorical tag → `applyTaggedEvent_` pure lookup touches dials; prose never touches the engine.
- **Closed-loop stability:** this is a closed loop (engine state → perception → reflection → tag → engine state). The ONLY thing preventing runaway self-reinforcement is the **base/mood/streak damping + the lighter reflection severityMult** — a one-off reflection nudges mood and fades; only a sustained pattern shifts base. Keep both; they are the stability safeguard, not tuning niceties.
- **GATE still holds: no write-back wired until the Phase-1 daily audit signs off.**

### Phase 2 affect-tag gap — vocab is event-typed, mood doesn't register (S262, Mike + tested)

Mike's requirement: "let them say whatever — if frustrated, that's a tag; if excited, a tag." **The current closed vocab can't do this** — it's event-typed (Career/Divorce/Faith…), with no affect dimension. Tested on DeepSeek (the validated classifier), bare-mood reflections collapse and often push the *wrong* dial:

| reflection (no event, pure mood) | tag picked | dial effect | should be |
|---|---|---|---|
| frustrated / irritable | Personal | openness **+2** | composure − |
| excited / buzzing | Personal | openness **+2** | composure + (drive +) |
| anxious / on edge | Health | composure −2 | right sign, wrong domain (physical-health tag for a mental state) |
| content / calm | Personal | openness **+2** | composure + |

The base/mood/streak machinery is **ready** — `mood` is exactly the swing layer that yields a "cranky node" vs an "excited node," and damping converts a repeated daily mood into a permanent disposition. The missing piece is **vocab**: nothing routes affect into it.

**Resolution direction (Mike-endorsed):** add a small **affect tag set** to `DIAL_MAP` and include it in the classifier's presented vocab — e.g. `Frustrated`/`Irritable` (composure −), `Excited`/`Energized` (composure +, drive +), `Anxious` (composure −), `Content`/`Calm` (composure +), plus `Angry`/`Resentful` (composure −, warmth −). Lightest possible fix: new map entries flowing through the same `applyTaggedEvent_` door — no new machinery. **Owner: engine-sheet** (DIAL_MAP is substrate). Severity stays the lighter reflection discount so a one-off mood fades and only a sustained pattern shifts the base — i.e. mood becomes temperament only through repetition, which is the intended behavior. Re-run `_probe_classifier.js` with the affect tags added to confirm the four cases above land correctly before wiring.

#### Why nobody is cranky today — the negative-pole structural gap (S262, data + Mike)

Measured composure across **904 citizens: 0 volatile, 2 anxious, 777 neutral (86%), 123 steady, 2 unshakable.** The negative pole is empty and the skew runs *positive*. "Everyone happy = a miss" is already the live state, and it's **structural, not just missing tags:** every ambient/ordinary-day tag nudges composure **up or neutral** (`Daily` +2, `Background` +2, `Micro-Event` +1, `Personal` +2, default-ambient +1). The only path down is a **catastrophe** (Divorce/Critical/Setback/Transgression). So a citizen can only become negative by surviving a disaster — an ordinary *irritating* day doesn't exist in the model, and quiet life drifts everyone toward calm/optimist.

**The fix is the affect tags doing real negative work on ordinary days** — that is the only mechanism that reaches the negative pole from daily life. Calibration requirement: affect deltas must be at least symmetric, arguably slightly negative-weighted, or the loop re-runs the positive drift.

**What makes a cranky complainer vs an eternal optimist (the mechanism, for the build):**
1. **Ordinary days allowed to go negative** — the affect tags (above). Load-bearing, not cosmetic.
2. **The feedback loop is the divergence engine** — disposition colors perception colors disposition. Same street: the lower-composure citizen reads it sourly → frustrated reflection → composure− → sourer tomorrow; the optimist reads it with equanimity → content → composure+. Run over weeks with damping, the *same world* hardens one into a chronic complainer and the other into the optimist.
3. **Voice fidelity to negative dials** — if the voice model writes every reflection as gently content (the floor-test homogenization risk), the classifier never sees frustration and the loop can't manufacture a cranky citizen. A low-composure citizen's reflection must *sound* irritable. This is a voice-prompt requirement (feed the disposition, license the negativity), not a classifier one.

Axis = **composure** (volatile/anxious ↔ steady/unshakable); no new dial. Warmth adds cold-complainer vs warm-but-low nuance. Safeguard against pole-collapse: lighter reflection severity + **monitor the population composure distribution as the loop runs** (the table above is the baseline to watch against).

#### The seam to Chaos-Cars (engine.11) — objective adversity + subjective reaction (S262, Mike)

The negative pole is a **two-engine composition**, not the citizen-loop alone. [[plans/2026-05-07-chaos-cars-engine]] (engine.11, in-progress) is the **objective adversity injector** — 3–15 stochastic events/cycle writing to `LifeHistory_Log` / `Business_Ledger` / `Neighborhood_Map`, with **asymmetric decay (positive reverts fast, negative lingers 3–5 cycles, compounds toward dysfunction by design)**. That is the engine-side answer to the measured "ordinary days only drift positive" problem: chaos-cars *is* the source of real hardship that ordinary ambient life lacks.

- **Chaos-cars = objective.** A chaos event hits a citizen (LifeHistory) or their block (Neighborhood_Map) → negative-tagged event → composure drops through the **existing** dial path. Engine-owned, deterministic; its asymmetric decay makes the hit linger.
- **Citizen-loop = subjective.** The citizen *perceives* that event in their slice and reacts — the affect tag layered on the objective hit.
- **The join (build them to compose):** the chaos event must land in the citizen's **perception slice** (LifeHistory tail + engine.33 neighborhood-slice) or the reaction loop never fires on it. This is the seam between engine.11 and research.14.

**Payoff:** negativity becomes **grounded** — a citizen is cranky *because* a real chaos event hit their street, not from free-floating mood. Also resolves the "frustrated with no event" awkwardness above: with chaos-cars live there is usually a real event to react to; affect tags carry the reaction's valence.

**Calibration flag — two decay systems now interact:** chaos-cars' asymmetric metric decay AND the dial base/mood/streak damping. A lingering negative chaos metric + repeated negative reflections about it *should* compound toward a cranky citizen (intended), but they must compose consciously — not double-count into a runaway past the no-death / no-runaway floor. Owner of the composition check: engine-sheet, when both engines are live.

### Phase 2+ forward thread — citizen-agents feed the editions (Mike, S262)

**The same engine→reactive-life path generalizes to media intake — and that's the payoff.** The architecture is *engine deterministic, life reactive to engine output* (Mike's S262 framing correction: the loop-back tag is the citizen's **damped reaction** to real engine events, never narrative authoring reality — the arrow "engine emerges → life captures" holds, with an agentic layer on top). Once a citizen is a model-citizen (dials + LifeHistory + Supermemory page), the newsroom stops using their **likeness** as set-dressing and can **actually interview them**:
- A citizen quoted in an edition pulls their **Supermemory page** (accreted reflections = learned experience) → the quote carries real lived continuity, not invented color. Canon discipline by construction (grounded in their own remembered history).
- **Media intake becomes another reader of the citizen-agent path**, same shape as the reflection loop: engine emerges → citizen reacts + remembers → newsroom interviews the remembering citizen → edition. One more consumer of the same surface, not a new pipeline.
- **Determinism unaffected** — media intake is already input-side (the persist-then-read class).

**Deferred** — lands after the citizen-loop write-back proves out under the Phase-1 audit; filed now so the architecture is captured and the build doesn't paint it out. This is the line from "citizens have dials" to "citizens have a life the paper can actually talk to."

### Phase 2 validation gate — prototype BEFORE building rotation infra (S261, advisor)

The load-bearing bet is **"different dials → different voice."** Untested, and `[[user_mags-bleed-proprietary-element]]` warns the depth is the hard, non-assemblable part — six dials + event tags is thin next to a hand-authored persona; the failure mode is every citizen sounding like the same "thoughtful Oakland resident" with different stats. **Gate: wake 2–3 real citizens from their actual dial vectors with a throwaway prompt and read the output.** Distinct → build rotation. Not distinct → the per-citizen seed needs enrichment first (more ledger particulars, relationship texture, occupation voice) before any infra. Same "validate the load-bearing bet first" that just paid off on loop-tightening. **Open precondition:** confirm per-citizen dial vectors are actually *persisted + readable* today (the map exists + engines consume it, but is the accumulated vector stored per POPID, or is accumulation still mid-build?) — the prototype can't wake "a real citizen's vector" until that's true. **Credits caveat:** the generation step needs API budget; assemble the seeds now, run when budget/Mike greenlights.

**Voice-differentiator (canon + craft):** scope a citizen's perception to **lived particulars, not engine aggregates** — "the corner store closed, my rent notice came," never "retail dropped 4%, illness 9.6%." That's the no-engine-metrics-in-citizen-voice rule AND what actually makes two citizens sound different.

---

## Open questions

- [ ] Search-announce UX (Task 1/2): does she say "let me pull that up" or answer silently with the grounded result? Lean silent (cleaner). Resolve before Task 1 ships.
- [x] Citizen-selection policy (Phase 2 decision 2): **RESOLVED S261 (Mike) — event-magnitude-weighted** (wake whoever's living the biggest delta).
- [x] Rotation vs. Mags-continuity (Phase 2): **RESOLVED S261 (Mike) — yes.** Mags stays the fixed nightly anchor (journals → media Mags → bot); other citizens rotate around her as the variety.
- [x] **DOCTRINE FORK — RESOLVED S261 (Mike + code-confirmed):** citizen reflections DO feed the engine, via the closed-vocab tag bridge (`applyTaggedEvent_`), determinism intact (classification is input-side; tag→delta is pure). Prose stays in the Supermemory page; only the categorical tag touches dials. Damping already built (base/mood/streak). See §"the categorical bridge."
- [~] Classifier design (Phase 2, the one new component): reflection → {tag(s), severity} constrained to the closed vocab. **Model + metric RESOLVED S262** (DeepSeek V3; dial-delta validation; gate GREEN — see §classifier gate + §classifier contract). **Still open:** (a) the **affect-tag gap** — vocab is event-typed, mood doesn't register; resolution direction filed (add affect tags to DIAL_MAP, engine-sheet owns) — see §affect-tag gap; (b) reflection-event severityMult calibration (the lighter discount constant); (c) single- vs multi-tag on long multi-theme reflections (single for the gate). Resolve (a)/(b) at build.
- [x] Prototype precondition — **CONFIRMED MET S261.** Per-citizen dial vectors ARE persisted: `Simulation_Ledger` **col AV `DialState`** (engine.31 8-dial JSON, seeded for all 904 citizens S256 via `backdateCitizenDials.js`), **col R `TraitProfile`** = derived human-readable face, **col O `LifeHistory`** = per-cycle event journal (overflow → `LifeHistory_Archive`, engine.32 compressor). `getCitizenDialBands_(ctx, popId, row[iDialState])` is the read path. The 2–3-citizen voice prototype has everything it needs on the ledger today — **only remaining gate is API credits.**

---

## Changelog

- 2026-06-16 — **Classifier gate VALIDATED on DeepSeek, 3B killed (S262, research-build).** Probe `scripts/_probe_classifier.js` scores reflection→tag in dial-delta space across 3 sets (real LifeHistory / synthetic high-magnitude / real journal). qwen2.5:3b FAILS (emits prose, sign-flips Resisted→Transgression, Divorce→Arrival); DeepSeek V3 PASSES the dangerous cases 14/14 / L1 0.00 / zero flips. Plan's "classifier runs on the local 3B" bet corrected → DeepSeek. Caveat: 31% exact-agreement on ambient tags but zero dangerous misses (divergences are Holiday/Cultural-class hair-splitting, ~1pt dial deltas). Added §classifier gate + §classifier contract (engine-sheet wiring spec). GATE unchanged: no write-back until Phase-1 daily audit signs off. Split confirmed by Mike: research-build proves the config, engine-sheet wires the substrate.
- 2026-06-16 — **Phase 2 added (S261, research-build).** Per-citizen perception surface + dial-driven rotation, grounded in the June-11 journal read (groove-stuck / conversation-weighted / no-conversation-skip) + Mike's S261 steer (rotate citizens via existing engine.31 dials rather than engineer durable memory). Three decisions: scoped per-citizen packet (engine.33/.35), citizen rotation as the variety engine (dial vector + ledger detail), invert the conversation-gate to world-perception triggers. Durable-memory layer deferred. Build spans engine-sheet + bot script; same Phase-1 audit gate.
- 2026-06-16 — **Phase 2 write-side + validation gate (S261, advisor + code check).** Determinism check: dials are engine cycle state (`runConductEngine` + phase05 engines read them) → LLM reflection moving dials would break replay; killed the loop-closure idea. Resolved to two-layer ownership (objective life → engine-owned dials/LifeHistory; subjective memory → parallel POPID narrative store read alongside). Citizen = dials-as-CHARACTER + LifeHistory-as-journal + narrative store; no per-citizen MD, no engine write-back. Selection + Mags-anchor Qs resolved by Mike (event-weighted; Mags fixed). New doctrine-fork left for Mike (does citizen subjectivity ever feed the engine via deterministic projection). Validation gate added: prototype 2–3 real citizens' voices BEFORE building rotation infra (the "different dials → different voice" bet is untested; mags-bleed-is-proprietary warns the depth is thin) — precondition: confirm per-POPID dial vectors are persisted/readable; credits-gated.
- 2026-06-04 — Initial draft (S252). Foundation shipped same session: bot decoupled from session lifecycle (`79babba`), `loadWorldState`→live world_summary (`8272054`), `loadLatestEdition` (`634fb6e`), `searchDisk` local-disk backend (`5f2745a`). Tasks 1–5 = remaining Phase 1. Write-back + additional agents gated behind daily audit. SpaceMolt-failure analysis is the why behind instance+attention.
