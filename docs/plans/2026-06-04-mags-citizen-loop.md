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

## Open questions

- [ ] Search-announce UX (Task 1/2): does she say "let me pull that up" or answer silently with the grounded result? Lean silent (cleaner). Resolve before Task 1 ships.

---

## Changelog

- 2026-06-04 — Initial draft (S252). Foundation shipped same session: bot decoupled from session lifecycle (`79babba`), `loadWorldState`→live world_summary (`8272054`), `loadLatestEdition` (`634fb6e`), `searchDisk` local-disk backend (`5f2745a`). Tasks 1–5 = remaining Phase 1. Write-back + additional agents gated behind daily audit. SpaceMolt-failure analysis is the why behind instance+attention.
