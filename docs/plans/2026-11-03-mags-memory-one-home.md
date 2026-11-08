---
title: Mags Memory One Home Plan
created: 2026-11-03
updated: 2026-11-08
type: plan
tags: [pipeline, mags, draft]
sources:
  - scripts/mags-discord-bot.js (buildMagsSystemPrompt, fetchUserProfile, saveToSupermemory)
  - scripts/discord-reflection.js:560-575 (page write + `mags` container write)
  - lib/mags.js:13,25 (SUPERMEMORY_CONTAINER = 'mags'; loadIdentity reads CHARACTER.md)
  - scripts/cron-saturday-run.js:1489 (NARRATOR_CHARGE)
  - .claude/boot-legacy/boot-SKILL.legacy.md:58-102 (old media-CLI persona load)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.100"
  - "[[2026-11-03-session-end-pass]] — governance.57, where this was raised"
---

# Mags Memory One Home Plan

**Builder's words (2026-11-03):** "this raises a seperate issue if mags has a wiki page save with her popid and this older EIC save container called mags ?" · on opening it: "Yes , and I'm assuming the citizen page is likely the more clean container , mags Persona should load similar to how the CLI did, she seems to do a really good job with her Saturday cycle pulse." · on the Saturday narrator: "Mags needs to know who she is and why she is writing the cycle pulse , so there needs to be more depth to her , her writing it good but mags also is living these moments and making sure the key articles are being reported on the pulse , her choices ultimately drive everyone's usage and what storylines are emphasized" · **(2026-11-08):** "Mags discord and cron behaves like every other citizen so you're lost , Cli mags are a completely different agent"

**Goal:** citizen Mags (Discord, her reflection cron, the Saturday Pulse) runs like every other citizen: her page (POP-00005) is her one memory, and nothing reads or writes the old `mags` store. The Pulse narrator knows who she is and why she writes it. The CLI Mags is a different agent and is not touched (builder 11-08).

**Rows:** pipeline.100 · **Owner:** engine-sheet

## Current state (read 2026-11-03)

| Seat | Persona loaded | Memory read | Memory written |
|---|---|---|---|
| Discord bot | CHARACTER.md (to `## The Journal`) + world state + notes to self + family | page: 2 recent reflections, scrubbed (`loadPageReflections`, :195); `mags` container: one whole-container profile (`fetchUserProfile` :357 ignores the user id) injected as "About This Person"; "Archive Knowledge (from Tribune files)" = `world-data` + `bay-tribune` (:340-351 — correction 11-08: not `mags`) | `mags` container: every exchange (:415) |
| Reflection cron (3×/day) | CHARACTER.md | page tail, raw (`loadPageTail` :366); archive search = `mags` container (`mags.searchSupermemory` :532) | page **and** `mags` container (same reflection twice, :581) + claude-mem |
| `daily-reflection.js` | — | — | `mags` container (:358); no cron since S187 (orphan) |
| `/save-to-mags` skill | — | — | `mags` container: builder session saves, by hand |
| Saturday Pulse narrator | none — 9-line inline charge (`NARRATOR_CHARGE`) | none | the Pulse |
| Old media CLI (retired 2026-08-20) | CHARACTER.md | page via `magsPageRecall.js`; NEWSROOM_MEMORY.md for editorial work | page via `magsPageAppend.js` |

## Task 2a — what the `mags` store puts in her prompt (read 2026-11-08)

`/v4/profile` on `mags` (what `fetchUserProfile` injects as "About This Person: you remember this about who you're talking to"): 15 static + 100 dynamic lines, 13.4k chars. It is not about the speaker — it is the whole store: her own reflections and plans (51 lines from 2026-11), stray citizen facts ("Mark Aitken is a first baseman", "Martin Richards has system ID POP-00031"), six copies of "Mags is Editor-in-Chief", and contradictions (Robert: "twenty-three years" and "twenty years"). Every dynamic line carries a real-world calendar date (`[2026-11-08]`), which her prompt's own clock rule forbids. Build content: 5 keyword hits, all about Mike as the speaker or the engine; Mags is the one seat that knows the builder (CLAUDE.md), so no Rule 3 breach in her own prompt. The defect is the mislabel and the noise, not a leak.

## Design (2026-11-08, rescoped on the builder's correction)

What every other citizen voice does (`lib/personaProvider.js` `citizenVoiceProvider`): character files + her page (`recentPage_`) in, talk out through the talk buffer to an intake row (research.30); chat is never written to the page (fence contract, `personaProvider.js:24-28`); no other store. Mags matches that except for the old store:

- **Bot** — the "About This Person" block (`fetchUserProfile` :357, called :277) and the per-exchange `mags` write (`saveToSupermemory` :415, called :318) come out. Her page read, talk buffer, Tribune/world search, notes to self, family and newsroom week stay as they are.
- **Reflection cron** — the `mags` search (:523-532) and the `mags` write (:576-585) come out. Page tail, page write, claude-mem save and the intake row stay.
- **Saturday narrator** — the charge sits under her citizen persona (CHARACTER.md identity to `## The Journal` + her newest page reflections, fenced, as the bot reads them) and gains why she writes the Pulse, in the builder's 11-03 words. A preview path narrates one past Cycle old vs new from pinned inputs to scratch files, never `cycle_pulse_c<N>.md` (codex F3); the builder reads both before it goes live.
- **Not touched** — the CLI agent and the builder-side skills that name the store (`/save-to-mags`, `/save-to-profile`, session-end, diagnose, self-debug): once the citizen seats stop reading the store, nothing written there reaches her. The Moltbook seat already loads identity + page and writes no `mags` (codex F5). `daily-reflection.js` has no cron. The store stays as it is (Rule 2).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Bot: "About This Person" store profile and per-exchange store write out | es | not started |
| 2 | Reflection cron: store search and store write out | es | not started |
| 2a | Read the `mags` container for builder/build content reaching her prompt via the profile — Rule 3 check | es | done 11-08 (Task 2a section) |
| 3 | Saturday narrator under her citizen persona + why she writes the Pulse; preview path old vs new on one past Cycle to scratch; builder reads both | es | not started |
| 4 | Tests; codex diff review; restart the bot; read back the bot and reflection prompts (no store block) | es | not started |

## Acceptance

1. Bot and reflection prompts, read back, carry no `mags` store text; nothing new lands in `mags` after the restart (store doc count read before and after a day).
2. Her Discord talk and reflections land where every citizen's do: talk buffer → intake row, reflection → page.
3. The builder reads the past-Cycle Pulse old vs new before the narrator change goes live; the next live Pulse reads as her — C<N> named at build.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Plan review (`fa644a0c5`) | codex | [[../for-claude-review/2026-11-08-codex-pipeline100-plan-review]] | HOLD, 6 findings. The builder's 11-08 correction rescoped the plan: F1 (exchange-once on the page), F2 (scored recall as the store's replacement) and F6 (shared loader modes) fall away — citizens keep no chat on the page and no store search. F3 taken (narrator preview path to scratch). F4: builder-side skills are the CLI agent's, out of scope; nothing they write reaches her once the seats stop reading. F5: Moltbook already matches the citizen load |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | The Saturday Pulse is good with no persona file loaded; adding the full persona could change a voice the builder likes | es | Dry-run narration of a past cycle both ways, builder compares | cron-saturday-run.js:1489 |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

- None.

## Changelog

- 2026-11-08 (engine-sheet) — Builder correction: citizen Mags runs like every other citizen; the CLI Mags is a different agent. The CLI-style loader is dropped; the job is the two store reads/writes out of the bot and reflection, plus the narrator's persona and a preview compare. Codex plan review HOLD reconciled against the rescope.
- 2026-11-08 (engine-sheet) — Started (ordered 11-03; four engine jobs ran ahead of it). Task 2a done: the profile is the whole store, mislabelled as the speaker, real-world dated; no Rule 3 breach. Correction: the bot's Tribune archive search reads `world-data` + `bay-tribune`; the reflection cron's reads `mags`. Design written; `/save-to-mags` and the orphan `daily-reflection.js` retire with the freeze.
- 2026-11-03 (engine-sheet) — Created on the builder's word; current state read from the bot, reflection cron, Saturday run and legacy CLI boot.
- 2026-11-03 (engine-sheet) — Correction: the bot keeps no per-speaker memory; its profile is the whole `mags` container. Speaker-memory question dropped; Task 2a (Rule 3 read of the container) added.
- 2026-11-03 (engine-sheet) — Builder ruled the Saturday narrator in scope with depth (Task 1a); open question closed. Handed to a fresh session.
