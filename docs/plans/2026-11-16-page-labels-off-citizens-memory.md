---
title: Page Labels Off Citizens' Memory Plan
created: 2026-11-16
updated: 2026-11-19
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
| lib/reporterDialEvents.js:24 `recordKind` (called at citizenVoice.js:238) — added 2026-11-19 | `^filed: ` / `^graded: ` on the text handed to the recorder; decides the fixed dial tag (filed) and the no-row path (graded) | the caller passes the kind as an option; the prefix read stays as the fallback |
| buildCitizenWeekDigest.js:311 — added 2026-11-19 (codex F2) | `^(filed\|graded):` on the `Reflection_Intake` text cell (the tab, not the page), to keep a reporter's filing rows out of the daily news' citizen sources | the row's own cells: daypart `PRESS` + tag `Media-Drive-Up-S` (`reporterDialEvents.FILED_TAG`); `PRINT` rows are already left out by daypart |
| scanCitizenPages.js:137 `citizenText` (Lives, Voices, Pulse slices; polarity and quote match at :162 / :185 / :203) — added 2026-11-19 (codex F2) | strips `TENSION[cN]:` / `TENSION-RESOLVED[cN]:` out of page text | nothing to move — with the label gone the strip is a no-op; it stays until Task 4 has run, then goes |

Tension docs already carry `type: 'tension'` in metadata (read by buildPulseSlice.js:149 and lib/wakePerception.js:454); tension state lives in `logs/citizen-tension-state.json`. `TALK[` is parsed by no reader. The sentence that stood here until 2026-11-19 — "no reader parses `TENSION[`, `TENSION-RESOLVED[`, `TALK[` or `filed:`" — was wrong on `TENSION[` (the strip above) and on `filed:` (`recordKind`, the digest).

**One more writer, ruled out (codex F1, read 2026-11-19):** `scripts/maraMemory.js upsert` posts straight to the store (not through `appendReflection_`), to Mara's own page only (`cp-<her POPID>`), one caller (`cron-civic-run.js:1278`, type `desk-record`, kind `directive-run`), and refuses types `reflection` and `tension`. Its text opens "C<N> — Mara Vance's directive, written after the close." — her desk's own record, none of the seven labels. Not in this plan.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Readers first, and every reader reads BOTH shapes (key / metadata first, the old leading text as the fallback) until Task 4 has run and its scan is clean; the fallbacks come out in Task 4, not before. (a) officeWall position wall: daypart `CIVIC` / customId, `^stated:\|^datawake:` kept as the fallback for docs with no daypart. (b) last grade: the score from metadata, the old `graded:` line as the fallback. (c) the recorder: the caller passes the kind (`filed` / `graded`), `recordKind` on the prefix as the fallback. (d) the week digest: a reporter's filing row left out by daypart `PRESS` + the filed tag, the text test as the fallback. (e) `citizenText`'s tension strip stays as it is | rb | not started |
| 2 | Writers, after Task 1 is live: tension / talk / stated / datawake / filed / graded writes carry the plain text; what the label said moves to metadata through `appendReflection_`'s `extra` — `kind` and `cycle` on all; `score` (and its max) on a grade; on an office line `topic`, `speaker`, and for a data wake `action` and `signal` (today inside the text, officeWall.js:179 / :195 on). The page text of an office line is the holder's own words — the `said` / `statementOf` text that already exists (engine.347 Task 5). Keys do not change: `cascade-<statementId>` is one doc a statement, `datawake-<date>` one a day (codex F6's collision does not arise). The `Reflection_Intake` text cell of a filed row carries the headline without the prefix | rb | not started |
| 3 | The grade's classifier input — ruled 2026-11-16: the grade is not the dial event ("all media is 3/3"); being printed is. Carried by engine.347 Task 3 | builder | done (ruled) |
| 4 | Stored entries, only after Tasks 1–2 are live: the ~2,300 labelled entries to their plain text with the label in metadata. **By document id, never by key:** `PATCH /v3/documents/<id>` with the new content (the method of `output/repairs/2026-11-16-page-machine-output.js`, 57 docs, each read back) — a `POST` under the same customId APPENDS ("old --- new", lib/citizenPage.js:41, :77) and would leave both on the page (codex F5). First: on ONE doc, prove a PATCH can set metadata as well as content and read it back; if it cannot, the label's facts stay recoverable from the customId and the before-file, and the plan says so before the run. Whole before-file saved first; a doc already plain is skipped (a rerun changes nothing); a doc holding several appended lines is cleaned line by line; every doc read back. Then the reader fallbacks of Task 1 come out | rb | not started |
| 5 | Tests on each reader and writer; one live run of each cron after Tasks 1–2 | rb | not started |

## Acceptance

1. A fresh scan of `citizen-pages` finds no entry starting with `TENSION[`, `TENSION-RESOLVED[`, `TALK[`, `stated:`, `datawake:`, `filed:` or `graded:`.
2. An official's position wall and a reporter's "your last piece came back from the desk" line read the same before and after (one office, one reporter, compared on the next live run).

## Out of this plan

City hall's wakes (the officials' morning wake, the seat wakes, the 14 workers from 2026-11-16) write no `Reflection_Intake` row, so their wakes move no dials; citizen wakes, conversations, work-wake packs, Discord, UNDOCKED and press interviews do. Whether office wakes should is the builder's call, asked separately (pipeline.110's area).

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| plan review | codex | `docs/for-claude-review/2026-11-16-codex-page-labels-review.md` | HOLD, six findings; each checked against the code 2026-11-19 and folded below. No re-review asked: nothing is built, the fold is plan text |

| # | Finding | Checked against | Disposition |
|---|---|---|---|
| F1 | A writer outside `appendReflection_`: `maraMemory.js` posts to the store directly | `maraMemory.js:84-93`, its one caller `cron-civic-run.js:1278`, `runEntryText` :1249 | true, out of scope: her own page, own type, none of the seven labels — recorded under Writers |
| F2 | Readers missed: `citizenText` strips the tension labels; the week digest drops `filed:` / `graded:` rows; the office wall's text fallback | `scanCitizenPages.js:137`, `buildCitizenWeekDigest.js:311` (it reads the `Reflection_Intake` text cell, not the page — the break is the same: strip the prefix at the recorder and a reporter's filing row reads as a citizen's words in the daily news), `officeWall.js:91` (was already in the table) | taken — two readers added, the wrong sentence struck, Task 1 (d) and (e) |
| F3 | Labels reach the classifier on the reporter path; rule the grade before Task 2 | `citizenVoice.js:238-240, :288`; `lib/reporterDialEvents.js` | overtaken by engine.347 Task 3 (live 2026-11-17): a filed line lands by a fixed tag with no classifier call, a grade writes no `Reflection_Intake` row. What is left is `recordKind` reading the prefix — Task 1 (c) |
| F4 | Readers-first breaks in the mixed week: a metadata-only reader misses grades the old writer still writes | Task 1 as first written (it had the fallback for the grade reader only) | taken — every reader reads both shapes until Task 4's scan is clean; order is 1 live, then 2, then 4 |
| F5 | Rewriting stored entries by re-posting under the customId appends a second copy | `lib/citizenPage.js:41-42, :77-82`; the 2026-11-16 repair script (PATCH by id, read back) | taken — Task 4 rewrites by document id; metadata-on-PATCH proven on one doc first |
| F6 | Office lines: topic, speaker, action, signal are in the text and the key; metadata list too short; keys may collide | `officeWall.js:149-207` | half taken — the fields are named in Task 2; no collision (`cascade-<statementId>`, `datawake-<date>`) |

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
- 2026-11-19 (research-build) — codex's review (HOLD, 2026-11-16) checked finding by finding against the code and folded: two readers and `recordKind` added to the reader table, Mara's desk record ruled out, Tasks 1, 2 and 4 rewritten (both shapes read until the stored entries are clean; office-line fields named; stored entries rewritten by document id, never re-posted under the key). Nothing built.
