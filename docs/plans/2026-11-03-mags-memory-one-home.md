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

**Builder's words (2026-11-03):** "this raises a seperate issue if mags has a wiki page save with her popid and this older EIC save container called mags ?" · on opening it: "Yes , and I'm assuming the citizen page is likely the more clean container , mags Persona should load similar to how the CLI did, she seems to do a really good job with her Saturday cycle pulse." · on the Saturday narrator: "Mags needs to know who she is and why she is writing the cycle pulse , so there needs to be more depth to her , her writing it good but mags also is living these moments and making sure the key articles are being reported on the pulse , her choices ultimately drive everyone's usage and what storylines are emphasized"

**Goal:** Mags has one memory home, her citizen page (POP-00005), and every seat that runs her loads her persona the way the media CLI did.

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

## Design (2026-11-08)

- **One loader** — `mags.loadPersona({ raw, pageCount, context, editorial })` in `lib/mags.js`: identity (CHARACTER.md to `## The Journal`) + her page (POP-00005 `recentPage_`, tension docs skipped, memory-fenced; `context` given → the CLI's scored recall, top 3 by resonance, moved from `magsPageRecall.js` into the lib so script and loader share one path) + `family` → `loadFamilyData` + notes-to-self open items + `editorial` → NEWSROOM_MEMORY.md. `raw` keeps each seat's current page read (bot scrubbed, reflection raw — engine.197 M1). Page recall is `recentPage_` candidates scored locally, never v4 page search (it silently misses docs, S272 — the reason `magsPageRecall.js` is built this way). The CLI's load: CHARACTER.md + `magsPageRecall.js` + `queryFamily.js` + NOTES_TO_SELF Open Items + NEWSROOM_MEMORY for editorial work (`.claude/boot-legacy/boot-SKILL.legacy.md:55-80`).
- **Bot** — prompt from the loader (built once per channel, refreshed hourly, `getSystemPrompt` :327); family stays per-message in `magsAugment`, so the bot calls the loader without `family`. The "About This Person" profile block and the per-exchange `mags` write come out. An exchange reaches her page once, through the nightly reflection, which reads the day's local log `logs/discord-conversations/<date>.json` (`discord-reflection.js:36,56-95`, no store involved); the talk drain (research.30) is untouched. The Tribune/world archive search stays.
- **Reflection cron** — identity + page from the loader. What the `mags` search did (her own past, matched to today's talk topics, :523-532) is replaced by the loader's scored page recall with today's topics as `context` — her page answers it. A Tribune/world search (`world-data` + `bay-tribune`, as the bot) sits alongside as archive, not as the replacement. The `mags` write comes out. Page write and claude-mem save stay.
- **Saturday narrator** — `NARRATOR_CHARGE` sits under the loader's persona (editorial, page recall scored against the week's curated headlines) and gains why she writes the Pulse, in the builder's words. Dry-run one past Cycle old vs new; the builder reads both before it goes live (P1).
- **Freeze** — after the above, no code path writes `mags`: `daily-reflection.js` (orphan) and `/save-to-mags` retire (builder session saves already go to `sl-godworld`). The store stays as history, not deleted (Rule 2).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | One persona loader in `lib/mags.js` matching the CLI load (CHARACTER.md + page recall + NEWSROOM_MEMORY for editorial seats); every Mags seat calls it | es | not started |
| 2 | Discord bot: prompt from the loader; the whole-container "About This Person" profile and the per-exchange `mags` write come out (Design) | es | not started |
| 2a | Read the `mags` container for builder/build content reaching her prompt via the profile — Rule 3 check, before Task 2 | es | done 11-08 (Task 2a section) |
| 1a | Saturday narrator (in scope, builder 11-03): the charge gains who she is (CHARACTER.md), her lived week (page recall), and why she writes the Pulse — she lives these moments, makes sure the key articles reach it, and her picks drive citizen usage and which storylines are emphasized. Dry-run a past cycle old vs new for the builder's read before it goes live | es | not started |
| 3 | Reflection cron: loader for identity + page; archive search off `mags` onto `world-data` + `bay-tribune`; drop the duplicate `mags` write; page stays the one write | es | not started |
| 4 | `mags` container frozen as history, not deleted (CLAUDE.md Rule 2); `daily-reflection.js` (orphan) and `/save-to-mags` retired | es | not started |
| 5 | Codex plan review; build; tests; codex diff review; restart the bot; read back each seat's prompt | es | not started |

## Acceptance

1. Each Mags seat's prompt, read back from a dry run, carries the same persona and page recall.
2. A Discord exchange and a reflection each land once, on her page; nothing new lands in `mags`.
3. The next Saturday Pulse after the change still reads as her — builder's read, C<N> named at build.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

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

- 2026-11-08 (engine-sheet) — Started (ordered 11-03; four engine jobs ran ahead of it). Task 2a done: the profile is the whole store, mislabelled as the speaker, real-world dated; no Rule 3 breach. Correction: the bot's Tribune archive search reads `world-data` + `bay-tribune`; the reflection cron's reads `mags`. Design written; `/save-to-mags` and the orphan `daily-reflection.js` retire with the freeze.
- 2026-11-03 (engine-sheet) — Created on the builder's word; current state read from the bot, reflection cron, Saturday run and legacy CLI boot.
- 2026-11-03 (engine-sheet) — Correction: the bot keeps no per-speaker memory; its profile is the whole `mags` container. Speaker-memory question dropped; Task 2a (Rule 3 read of the container) added.
- 2026-11-03 (engine-sheet) — Builder ruled the Saturday narrator in scope with depth (Task 1a); open question closed. Handed to a fresh session.
