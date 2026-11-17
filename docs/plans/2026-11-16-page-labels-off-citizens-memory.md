---
title: Page Labels Off Citizens' Memory Plan
created: 2026-11-16
updated: 2026-11-16
type: plan
tags: [pipeline, draft]
sources:
  - Supermemory `citizen-pages` container, all 4,114 entries read 2026-11-16 (scan script in the session scratchpad; counts below)
  - lib/citizenPage.js appendReflection_; scripts/officeWall.js; scripts/cron-desk-run.js; scripts/citizenVoice.js; scripts/reporterWall.js
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.112"
---

# Page Labels Off Citizens' Memory Plan

**Builder's words (2026-11-16):** "check the citizens memory save stores, make sure no code it sending build logic as an event" · on the labels: "yes strip the labels and clean the 60 entries, but the labels maybe for the dials so the strip needs review".

**Goal:** what a citizen's memory page holds is what they said or what happened to them — no code-written label (a cron's name, a bracketed cycle tag, a status word) in front of it — and every reader that finds entries by label finds them by the entry's key or metadata instead.

**Rows:** pipeline.112 · **Owner:** research-build

## Read (2026-11-16)

Entries by leading text, all 4,114: prose 1,649 · `TENSION[cN]:` 880 · `stated:` 740 · `filed:` 287 · `datawake:` 161 · `graded:` 131 · `### Nightly Reflection` 106 · `TENSION-RESOLVED[cN]:` 100 · fenced JSON 57 (cleaned 2026-11-16, `output/repairs/2026-11-16-page-machine-output-BEFORE.json`) · `TALK[cN]:` 2.

**Dials do not read these labels.** The dial path is `Reflection_Intake` → `compressLifeHistory.js readPendingReflections_` (:289), which composes Tag + Affect only; the page text never reaches it. The one indirect touch: `citizenVoice.js` classifies the recorded text (`classifyTripleReflection_(said.spoken …)`, :236), and for a reporter's self-record that text is `filed: …` / `graded: …`, so the label is part of what the classifier reads.

**Writers (label in the text):**

| Label | Writer |
|---|---|
| `TENSION[c<N>]:` / `TENSION-RESOLVED[c<N>]:` | citizen-wake.js:585,595 · citizen-exchange.js:199,208 · citizenVoice.js:263,273 · personaProvider.js:174,184 |
| `TALK[c<N>]:` | personaProvider.js:334 |
| `stated: [topic] Name —` | officeWall.js:179 (cascade statements) |
| `datawake:` (+ `action:` / `signal:`) | officeWall.js:195 · cron-civic-run.js:3764 |
| `filed:` / `graded:` | cron-desk-run.js:1527 (grade line) → citizenVoice.js `--record-text` (reporter self-record; reporterWall.js:15 documents it) |

**Readers that find entries BY the label (each must move to the key or metadata first):**

| Reader | What it keys on | Already available instead |
|---|---|---|
| officeWall.js:91 position wall | `^stated:` / `^datawake:` (or metadata.daypart `CIVIC`) | daypart `CIVIC` on every office write; customId `…-CIVIC-cascade-…` / `…-CIVIC-datawake-…` |
| cron-desk-run.js:1537 last grade | `^graded: \d/[34]` lines inside the doc, filtered to customIds ending `-graded[-persona]` | the customId filter; the score itself would need to ride metadata |
| citizenVoice.js:241 grade keying | `preText` matches `^graded: ` | the caller knows it is passing a grade (an option, not a prefix) |
| cron-desk-run.js:2179 / :2235 | `graded:` text in the ask / plan | follows from the :1537 change |
| cronFeedback.js:154 | a `graded` count (not page text) | not a label reader — no change |

No reader parses `TENSION[`, `TENSION-RESOLVED[`, `TALK[` or `filed:` out of a page: tension state lives in `logs/citizen-tension-state.json`. Those labels are read only by the models that recall the page.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Readers first: officeWall position wall keys on daypart / customId only; the last-grade reader reads the score from metadata (written by Task 2) and falls back to the old `graded:` text for entries written before | rb | not started |
| 2 | Writers: tension / talk / stated / datawake / filed / graded writes carry the plain text; what the label said moves to metadata (`kind`, `cycle`, `topic`, `score`) — `appendReflection_` already takes `extra` | rb | not started |
| 3 | The grade's classifier input — ruled 2026-11-16: the grade is not the dial event ("all media is 3/3"); being printed is. Carried by engine.347 Task 3 | builder | done (ruled) |
| 4 | Stored entries: rewrite the ~2,300 labelled entries to their plain text with the label in metadata, old content saved first; only after Tasks 1–2 are live | rb | not started |
| 5 | Tests on each reader and writer; one live run of each cron after Tasks 1–2 | rb | not started |

## Acceptance

1. A fresh scan of `citizen-pages` finds no entry starting with `TENSION[`, `TENSION-RESOLVED[`, `TALK[`, `stated:`, `datawake:`, `filed:` or `graded:`.
2. An official's position wall and a reporter's "your last piece came back from the desk" line read the same before and after (one office, one reporter, compared on the next live run).

## Out of this plan

City hall's wakes (the officials' morning wake, the seat wakes, the 14 workers from 2026-11-16) write no `Reflection_Intake` row, so their wakes move no dials; citizen wakes, conversations, work-wake packs, Discord, UNDOCKED and press interviews do. Whether office wakes should is the builder's call, asked separately (pipeline.110's area).

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| plan review | codex | `docs/for-claude-review/2026-11-16-codex-page-labels-review.md` | pending |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Item | Held by | Proof |
|---|---|---|---|

### New concepts

| # | Item | Held by | Sources |
|---|---|---|---|

## Changelog

- 2026-11-16 (research-build) — Plan written from the full page scan and the reader/writer trace; sent to codex-rb for one review before any build.
- 2026-11-16 (research-build) — Task 3 ruled by the builder (grade is not the dial event); the office wakes' dial question ruled yes and filed as engine.347.
