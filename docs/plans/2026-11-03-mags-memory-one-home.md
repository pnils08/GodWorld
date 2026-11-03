---
title: Mags Memory One Home Plan
created: 2026-11-03
updated: 2026-11-03
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

**Builder's words (2026-11-03):** "this raises a seperate issue if mags has a wiki page save with her popid and this older EIC save container called mags ?" · on opening it: "Yes , and I'm assuming the citizen page is likely the more clean container , mags Persona should load similar to how the CLI did, she seems to do a really good job with her Saturday cycle pulse."

**Goal:** Mags has one memory home, her citizen page (POP-00005), and every seat that runs her loads her persona the way the media CLI did.

**Rows:** pipeline.100 · **Owner:** engine-sheet

## Current state (read 2026-11-03)

| Seat | Persona loaded | Memory read | Memory written |
|---|---|---|---|
| Discord bot | CHARACTER.md (to `## The Journal`) + world state | page: 2 recent reflections; `mags` container: one whole-container profile (`fetchUserProfile` ignores the user id) injected as "About This Person", plus a query search injected as "Archive Knowledge (from Tribune files)" | `mags` container: every exchange |
| Reflection cron (3×/day) | CHARACTER.md | page tail | page **and** `mags` container (same reflection twice) + claude-mem |
| Saturday Pulse narrator | none — 9-line inline charge (`NARRATOR_CHARGE`) | none | the Pulse |
| Old media CLI (retired 2026-08-20) | CHARACTER.md | page via `magsPageRecall.js`; NEWSROOM_MEMORY.md for editorial work | page via `magsPageAppend.js` |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | One persona loader in `lib/mags.js` matching the CLI load (CHARACTER.md + page recall + NEWSROOM_MEMORY for editorial seats); every Mags seat calls it | es | not started |
| 2 | Discord bot: the "About This Person" profile and the mislabelled "Archive Knowledge" search both read the whole `mags` container; repoint to her page; exchanges write to the page. One Discord speaker is allowlisted (the builder) | es | not started |
| 2a | Read the `mags` container for builder/build content (past `/save-to-mags` session saves) reaching her prompt via the profile — Rule 3 check, before Task 2 | es | not started |
| 3 | Reflection cron: drop the duplicate `mags` container write; page stays the one write | es | not started |
| 4 | `mags` container frozen as history, not deleted (CLAUDE.md Rule 2); `/save-to-mags` repointed or retired per builder | es · builder | not started |

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

- Does "load similar to how the CLI did" include the Saturday narrator (today a 9-line charge, no persona file) or only Discord and the reflection cron? — blocks Task 1 scope; for the builder.

## Changelog

- 2026-11-03 (engine-sheet) — Created on the builder's word; current state read from the bot, reflection cron, Saturday run and legacy CLI boot.
- 2026-11-03 (engine-sheet) — Correction: the bot keeps no per-speaker memory; its profile is the whole `mags` container. Speaker-memory question dropped; Task 2a (Rule 3 read of the container) added.
