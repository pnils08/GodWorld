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
- **Every crossing to the builder side out (builder 11-08)** — the bot's notes-to-self sink (`[NOTE_TO_SELF:]` → `docs/mags-corliss/NOTES_TO_SELF.md`, read by the CLI `mags-corliss` agent) and the reflection's claude-mem save (`project: 'claude-mem'`, builder memory) come out with the store. Tags are still stripped from any reply.
- **Not touched** — the CLI agent and the builder-side skills that name the store (`/save-to-mags`, `/save-to-profile`, session-end, diagnose, self-debug): once the citizen seats stop reading the store, nothing written there reaches her. The Moltbook seat already loads identity + page and writes no `mags` (codex F5). `daily-reflection.js` has no cron. The store stays as it is (Rule 2).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Bot: "About This Person" store profile and per-exchange store write out; the notes-to-self channel (a citizen filing gaps and build requests to an "editorial session self") out (builder 11-08: "what does that serve the CLIs ?") | es | built 11-08 |
| 2 | Reflection cron: store search, store write and the claude-mem (builder memory tool) save out; `lib/mags` store helpers and notes reader removed; orphan `daily-reflection.js` retired | es | built 11-08 |
| 2a | Read the `mags` container for builder/build content reaching her prompt via the profile — Rule 3 check | es | done 11-08 (Task 2a section) |
| 3 | Saturday narrator under her citizen persona + why she writes the Pulse; preview path old vs new on one past Cycle to scratch; builder reads both | es | not started |
| 4 | Tests; codex diff review; restart the bot; read back the bot and reflection prompts (no store block) | es | diff review SHIP; bot restarted 11-08 17:11 CST (base prompt 11833 → 8417 chars, notes block gone); store at 897 docs — recount after the 11-09 reflection runs (07/12/19:00) |

## Acceptance

1. Bot and reflection prompts, read back, carry no `mags` store text; nothing new lands in `mags` after the restart (store doc count read before and after a day).
2. Her Discord talk and reflections land where every citizen's do: talk buffer → intake row, reflection → page.
3. The builder reads the past-Cycle Pulse old vs new before the narrator change goes live; the next live Pulse reads as her — C<N> named at build.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Diff review (`abb82f458`) | codex | [[../for-claude-review/2026-11-08-codex-pipeline100-diff-review]] | SHIP, no finding; stale test comment fixed (`5aabf0535`) |
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

- 2026-11-09 (engine-sheet) — Builder: "give her and vinnie their pages to query they should be able to search canon, articles, citizen cards." Read first: every voice already had canon + article index + disk through `search_world`, and cards + ledger rows through the four lookups; what no voice had was its own page searched on the message (Vinnie: newest six by date only; Mags: newest two + the store-wide summary). Built: `citizenPage.searchPage_` (v3 search on the own page tag — returns 4–5 hits where the v4 `readPage_` returns 0–1); every citizen voice's `augment` adds the page hits for the message beside the recency tail, deduped; Mags' `magsAugment` adds her store (`mags`: talks, reflections, Pulses) and her page searched on the message, summary kept; new tool `search_my_memory` for every voice (page; Mags: store + page). Tests: citizenPage 68 PASS (5 new), personaProviderBrief, discordLookups 68, Saturday 163 PASS. Live reads: Vinnie's page on the academy, Mags' store on the Coliseum platforms (her Y3C10 Pulse first hit).
- 2026-11-09 (engine-sheet) — Regression found and closed. `17e5405fb` carried a staged undo of this row's code: the five live files were byte-identical to before `abb82f458`, and the bot restarted onto them 11-09 20:54 (base prompt 11494 chars, About This Person + notes-to-self back; the 11-09 reflections ran the claude-mem save). Restored from `7b51a9f5f` at `5caa1cb0e`; bot restarted 23:25 CST, base prompt 8078 chars. `scripts/daily-reflection.js` is out of the index but still on disk (rm-guard refused the delete; no cron calls it). Read of the per-message path: her `mags` store reaches a Discord reply only as the store-wide profile summary (`fetchUserProfile`, `/v4/profile`), never a search on the message; the message search reads `world-data` + `bay-tribune`. OPEN, builder's call: search her own store on the message.
- 2026-11-09 (engine-sheet) — Builder: "give her all her saturday runs shes ran thus far." All twelve narrated Pulses (C103–C114; the narrator seat starts at C103) are in her store as `mags-pulse-c<N>`, read back 12 of 12, store 849 docs. C111–C113 through `--step remember --apply`. C103–C110 predate `edition_published_c<N>.json`, so the step refuses them; posted by a one-off with the same `magsPulseMemoryDoc` shape after proving each published (seven found in `bay-tribune`, C104 by its entry in `scripts/notebooklmCanonSources.json`) and each narration present in its edition file. Titles carry the sim clock (Y2C51 … Y3C10); the C103–C110 edition files print the old wrong `Y2C<n>` header, untouched.
- 2026-11-09 (engine-sheet) — Builder: "retire the identity skill too, add the saturday run to her brain." `/save-to-profile` retired (moved to `docs/archive/skills/save-to-profile/`, settings entry and STACK mention out). Saturday run step 4c `remember`: after the canon door publishes, the Pulse she narrated is upserted to `mags` as `mags-pulse-c<N>`, sim-clock titled; refuses an unpublished Cycle or a narration that is not the one inside the published edition; a failure is loud with a recover line and fails the run at the end without holding the steps below. Tests 163 PASS (5 new). Real entry point: `--step remember --cycle 114 --apply` landed `Cycle Pulse — Y3C10` in her store, read back by list and search. Earlier Pulses not backfilled. First cron pass: Sat 2026-11-14 16:00. Open: Task 3 narrator persona + old-vs-new preview.
- 2026-11-09 (engine-sheet) — Builder ruled the layout: `sl-godworld` is the CLI's save brain; the `mags` store is citizen Mags' brain (Discord talks, Moltbook, Saturday runs; reflections go to page and store both); her page stays her wakes. Store sorted, 893 docs: ~560 her talks, 271 reflections, 61 builder-session saves (59 from March–May, sessions 101–276). Builder: "go on the removal of the 61" — full text archived to `docs/archive/mags-store-build-saves_2026-11-09.jsonl`, the 61 deleted, each read back not-found; store 899 → 838. `/save-to-mags` retired (skill moved to `docs/archive/skills/save-to-mags/`; session-end, STACK, SUPERMEMORY repointed). Junk drawer (`super-memory`, 292 docs, 283 Moltbook, zero readers) — builder left the call here: no value to her memory. Its entry is three feed titles plus clipped reply snippets; the reflection already reads her full replies, posts and upvotes from `logs/moltbook` and writes them to her page and store. The Moltbook job's second write is cut (`node --check` + dry run PASS); the 292 docs stay. Open on this row: Saturday run → her store (new, with Task 3), Task 3 narrator.
- 2026-11-08 (engine-sheet) — Builder: "You just removed 600 memories I paid for and call it a fix." Cutting the store read took her past talks and reflections away from her (nothing deleted; 897 docs). Restored the same evening: the bot reads the store again, labelled as her own memory ("Your own memory (your past talks and reflections)", no longer "About This Person"), and saves every talk; the reflection searches and saves to the store again. Notes-to-self and the claude-mem save stay cut. The goal line above (no store reads/writes) is withdrawn.
- 2026-11-08 (engine-sheet) — Codex diff review SHIP. mags-bot restarted 17:11 CST on the cut: connected, base prompt 8417 chars (was 11833). Old store holds 897 docs (≈680 from her own bot chats and reflections, a smaller share from builder sessions); recount after the next reflection runs proves no new writes.
- 2026-11-08 (engine-sheet) — Tasks 1–2 built: bot and reflection no longer read or write `mags`; notes-to-self and the claude-mem save cut (builder: citizen Mags serves no CLI); `lib/mags` store helpers and notes reader removed; `daily-reflection.js` retired. Tests PASS. Codex diff review next, then the bot restart.
- 2026-11-08 (engine-sheet) — Builder correction: citizen Mags runs like every other citizen; the CLI Mags is a different agent. The CLI-style loader is dropped; the job is the two store reads/writes out of the bot and reflection, plus the narrator's persona and a preview compare. Codex plan review HOLD reconciled against the rescope.
- 2026-11-08 (engine-sheet) — Started (ordered 11-03; four engine jobs ran ahead of it). Task 2a done: the profile is the whole store, mislabelled as the speaker, real-world dated; no Rule 3 breach. Correction: the bot's Tribune archive search reads `world-data` + `bay-tribune`; the reflection cron's reads `mags`. Design written; `/save-to-mags` and the orphan `daily-reflection.js` retire with the freeze.
- 2026-11-03 (engine-sheet) — Created on the builder's word; current state read from the bot, reflection cron, Saturday run and legacy CLI boot.
- 2026-11-03 (engine-sheet) — Correction: the bot keeps no per-speaker memory; its profile is the whole `mags` container. Speaker-memory question dropped; Task 2a (Rule 3 read of the container) added.
- 2026-11-03 (engine-sheet) — Builder ruled the Saturday narrator in scope with depth (Task 1a); open question closed. Handed to a fresh session.
