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

## Open questions

- [ ] Search-announce UX (Task 1/2): does she say "let me pull that up" or answer silently with the grounded result? Lean silent (cleaner). Resolve before Task 1 ships.
- [ ] Citizen-selection policy (Phase 2 decision 2): round-robin vs. event-magnitude-weighted vs. unresolved-thread-driven. Lean event-weighted (wake whoever's living the biggest delta) — resolve before the rotation build.
- [ ] Rotation vs. Mags-continuity (Phase 2): does Mags stay the fixed nightly anchor (EIC who sees the whole city) while *other* citizens rotate around her? Likely yes — Mags is the through-line, rotated citizens are the variety. Confirm with Mike.

---

## Changelog

- 2026-06-16 — **Phase 2 added (S261, research-build).** Per-citizen perception surface + dial-driven rotation, grounded in the June-11 journal read (groove-stuck / conversation-weighted / no-conversation-skip) + Mike's S261 steer (rotate citizens via existing engine.31 dials rather than engineer durable memory). Three decisions: scoped per-citizen packet (engine.33/.35), citizen rotation as the variety engine (dial vector + ledger detail), invert the conversation-gate to world-perception triggers. Durable-memory layer deferred. Build spans engine-sheet + bot script; same Phase-1 audit gate.
- 2026-06-04 — Initial draft (S252). Foundation shipped same session: bot decoupled from session lifecycle (`79babba`), `loadWorldState`→live world_summary (`8272054`), `loadLatestEdition` (`634fb6e`), `searchDisk` local-disk backend (`5f2745a`). Tasks 1–5 = remaining Phase 1. Write-back + additional agents gated behind daily audit. SpaceMolt-failure analysis is the why behind instance+attention.
