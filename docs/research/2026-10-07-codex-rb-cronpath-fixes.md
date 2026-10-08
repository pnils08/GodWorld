---
title: Review of cron-path fixes in 8b923371
created: 2026-10-07
updated: 2026-10-07
type: reference
tags: [engine, media, review, draft]
sources:
  - git commit 8b923371
  - scripts/cron-rhea-gate.js
  - scripts/cron-saturday-run.js
  - scripts/deliver-articles.js
  - lib/citizenPage.js
pointers:
  - "[[../EDITION_PIPELINE_DEEP_DISPATCH]] — newsroom path states and gates"
---

# Cron-path fixes: read-only review

**Verdict: HOLD for the Rhea POPID exemption; SHIP-WITH-FIXES for the error string change.** Commit `8b923371` changed two lines of behavior. The new Rhea scan exempts everything from the first `## INTAKE` to EOF, but multiple reader-facing or canon-bound paths retain that text. The `appendReflection_` error remains a string, and no caller or test found requires its old exact bytes. Source inspection only; no scripts, Sheets, publishing, or network calls were run.

## Numbered findings

1. **Blocking — Saturday's published Edition retains the exempted block.** `scripts/cron-rhea-gate.js:672-677` removes `## INTAKE` to EOF before its POPID scan. `scripts/cron-saturday-run.js:888-895` removes it only for Mags's narration input; `:919-943` builds the actual `editions/cycle_pulse_c*.txt` from `e.text.trim()` and keeps the block. With `--apply`, that raw Edition is added to the permanent NotebookLM source at `:956-968`; `scripts/deliver-articles.js:135-145` later attaches the Edition file directly to Discord without `readerCopy`. `scripts/ingestEdition.js:514-525` extracts a frame for its own narrated-Edition Supermemory document, but that does not sanitize the Edition file or NotebookLM/Discord copies. Thus a POPID present only in INTAKE can pass this Rhea check and still appear in a reader-facing published artifact. Strip the block from each curated article when assembling the Edition, while retaining parsed INTAKE in its sidecar; assert the final Edition file and Discord attachment source contain no INTAKE-only POPID before publishing.

2. **Blocking — the Saturday per-article canon sweep publishes raw staged text.** `scripts/cron-saturday-run.js:171-199` loads each staged `.md` verbatim as `entry.text`; `:230-245` sets the Supermemory document's `content` to that entire text, and `:288-303` posts selected articles under `bay-tribune` with `status: canon`. `scripts/cronSaturdayRun.test.js:66-78` currently locks in `doc.content === ENTRY.text`, so a fix will need a test update. The sidecar already carries parsed INTAKE metadata at `scripts/cron-saturday-run.js:228-239`; the content can be reader prose only. Until then, canon search and downstream readers can retrieve the exact POPID the gate exempts. Assert a fixture with a POPID only under `## INTAKE` is absent from `articleDoc(...).content` but present in intended metadata.

3. **High — the daily news reader path also consumes raw staged drafts.** `scripts/notebooklmDailyNews.js:164-186` collects staged `.md` files and stores their full bodies; `:242-260` does the same for pulse-backed staged filings. `:421-445` inserts `report.body.trim()` into the bounded NotebookLM source, which is uploaded at `:1052-1066` and queried for the daily brief at `:1075-1094`; the optional delivery path sends brief/audio output at `:1158-1182`. No INTAKE strip or deterministic POPID scrub is present at that boundary. This does not prove the generated brief/audio will repeat an ID, but it disproves the gate comment's claim that no reader can see an INTAKE cite. Strip INTAKE from staged prose before building the bounded source, keeping structured provenance in the machine sidecar; add a bounded-source assertion for an INTAKE-only POPID.

4. **Confirmed safe in the two cited display helpers, but coverage is incomplete.** `scripts/deliver-articles.js:78-80,104-129` uses the same `/## INTAKE[\s\S]*$/` cut before attaching staged or flagged article copies. `scripts/cron-saturday-run.js:888-900` uses that cut for narration input. Those are at least as broad as `scripts/cron-rhea-gate.js:675`. The gate's current test (`scripts/cron-rhea-gate.test.js:1-24`) covers `scanEngineVerbiage`, not the changed deterministic `popid-leak` scan or final publish copies. Add a shared reader-copy fixture across gate, Discord article attachment, Saturday Edition, per-article Supermemory content, and daily news source; assert an INTAKE-only POPID is absent from every reader/canon text while a prose POPID still blocks.

5. **No old-string dependency found for `appendReflection_`; one format regression is untested.** `lib/citizenPage.js:87-91` still returns `{ error: string, tag, customId }` on a failed append, now prefixing HTTP status and JSON-stringifying non-string `j.error`. Direct callers use truthiness and pass the text to a log/error (`scripts/cron-work-wake.js:281-285`, `scripts/citizen-wake.js:374-378`, `scripts/citizen-exchange.js:169-172`, `scripts/citizenVoice.js:195-199`, `scripts/civisJournal.js:327-329`, `scripts/officeWall.js:148-155`, `scripts/magsPageAppend.js:44-45`, `scripts/discord-reflection.js:341-346`, `scripts/cron-desk-writer.js:628-631`); `lib/personaProvider.js:174-185` ignores these supplemental append results. Repository test/caller searches found no exact comparison with the former `[err] <message>` text. On an HTTP failure with no `j.error`, the new string has a trailing space (`'[err] ' + status + ' '`), and no focused test covers array/object errors, string errors, or missing errors. Add a mocked response test for those shapes and trim the empty suffix; no caller migration is indicated by current source.

## Disposition

Keep the POPID exemption on HOLD until the actual publication and canon boundaries strip INTAKE or the gate resumes scanning it. The error-message change can proceed with a small response-shape test. The requested review file is the only file created; no code or staged draft was edited.

## Changelog

- 2026-10-07 (codex) — Filed read-only review of commit `8b923371`.

## Disposition — research-build 2026-10-08

**Builder (2026-10-08, verbatim):** "popIDs are not contaimination in any sense, but also Id rather hear the names in my news over the popIDS, the popIDS are easier for a AI to be consistent with but i dont know who the popIDS are if I hear them. So not sure the answer to this"

Applied as an engineering call from that principle: a person reads or hears names; IDs are fine in machine registers and in canon.

1. **Edition retains INTAKE — by design, no change.** `scripts/ingestPublishedEntities.js` parses the per-article INTAKE blocks out of the Edition file (pipeline.45); stripping them there would break published-entity ingest. A POPID in INTAKE adds nothing a reader of the Edition does not already see.
2. **Canon sweep posts the staged text — accepted, no change.** POPIDs in canon are not contamination. Whether the INTAKE block and the self-score comment belong in canon content is a separate question, not decided here.
3. **Daily brief read the raw drafts — fixed.** `scripts/notebooklmDailyNews.js` now inserts `readerCopy(report.body)` at both source builders (the pack and the bounded source the audio is made from); the brief carries article prose only.
4. **Shared coverage — done.** One `readerCopy` in `lib/articleIntake.js` (delivery now imports it); the gate's own prose definition `articleProseForReview` backs the new `scanPopidLeak`. Tests: `lib/articleIntake.test.js` (readerCopy), `scripts/cron-rhea-gate.test.js` (prose POPID blocks, INTAKE-only does not, whole-doc fence cannot blank the scan), `scripts/notebooklmDailyNews.test.js` (an INTAKE-only POPID never reaches the pack or bounded source). Suite 284/284.
5. **`appendReflection_` error string — in `5ab1824a`.** The array/object error is stringified and the trailing space on a missing `j.error` is gone. A mocked-response test for array/object/missing error shapes was not checked.

Net effect on the gate (the exemption 8b923371 tried to make): an INTAKE-only POPID no longer fails an article; a raw POPID in prose still does.
