---
title: Codex adversarial review of pipeline.99 world-facing cut
created: 2026-10-31
updated: 2026-10-31
type: reference
tags: [media, engine, review, active]
sources:
  - output/codex/TASK-2026-10-31-pipeline99-world-facing.md
  - commits 2d4348c1 and 94e024b6
  - docs/plans/2026-10-11-media-extension.md
pointers:
  - "[[../plans/2026-10-11-media-extension]] — pipeline.99 claims and changelog"
---

# pipeline.99 — world-facing diff review

**Verdict: HOLD.** The source cut removes the named generator footers, but it does not preserve per-filing credit identity and it still sends a script path into a reporter's planning packet. The Phase 5 seam and the search excerpt filter also have conditional failure paths. This is a source review of `2d4348c1` and `94e024b6`; it is not a Sheet readback, a cron replay, or stage 35 deployment proof.

## Findings

### F1 — distinct printed pieces collapse to one credit key (HOLD)

`lib/mags.js:630-634` removes `_packet-v2_` **and everything after it**, including the filing suffix that `lib/articleIntake.js:243-253` explicitly preserves to give two articles distinct stems and custom IDs. The actual C112 published selection contains both `culture_c112_ines-sorensen_packet-v2_x-ai-grok-4-3-1615` and `...-1814` (`output/edition_published_c112.json:3-8`). Their staged sidecars name the same author, Ines Sorensen, but different source citizens (`output/cron-compare/staged/culture_c112_ines-sorensen_packet-v2_x-ai-grok-4-3.staged-1615.json:6-38`; `...staged-1814.json:6-33`); the two article files have different SHA-256 values, `a4034759bce9…` and `6a6fb83526d2…` (local file hashes). Both normalize to `culture_c112_ines-sorensen`.

Input: the first printed article has already landed a `byline-published` row, then the second is ingested by a later Saturday pass. Output: `scripts/cron-saturday-run.js:516-526,580-592` sees the first author's normalized Context and skips the second author's earned `byline-published` row. If both arrive in one first pass, its `existing` set is never augmented inside the loop (`:581-599`), so it appends two rows with the *same* Context; a later pass cannot distinguish which piece they represent. The separate article-table route dedupes `plannedKeys` within the batch and likewise drops the second distinct credit (`scripts/ingestPublishedEntities.js:1021-1043`). `scripts/cron-desk-run.js:308-329` uses the same normalized key for `byline-landed`; that path receives the unsuffixed `base` before sidecar naming (`:3256-3265`), so its repeated-filing loss predates this diff and is not claimed as a new regression. Preserve a stable, model-free *filing* discriminator, including `-HHMM` or a content-derived collision suffix, in the credit key.

### F2 — the removed `scripts/` and `docs/plans` pointers still reach slice outputs (HOLD)

`scripts/buildTanyaSlice.js:159-165` still adds `scripts/sportsSubstrate.js` to `slice.pointers`; its formatter still emits `## POINTERS` and every pointer (`:202-203`). More directly, `scripts/livedExperiencePacket.js:173-187,423-431` copies those pointers into the Tanya creative brief and W1 task, `scripts/cron-desk-run.js:1824-1827,2098-2105` builds the planning packet from that slice, and `scripts/livedExperiencePacket.js:1002-1004` serializes the packet into the model prompt. Input: a Tanya planning wake with a nonempty Tanya slice → output: the reporter receives `scripts/sportsSubstrate.js` despite the pipeline.99 claim that script pointers were removed.

The shared beat-slice builder still appends `docs/plans/2026-09-07-beat-slices-from-sheets-plan.md Task 4` (`scripts/beatSliceKit.js:232-234`) and renders it under `## POINTERS` (`:284-288`); `write` persists that Markdown (`:310-316`). A newly built generic beat slice therefore still contains a plan pointer. The typed generic beat brief does not copy `slice.pointers` (`scripts/livedExperiencePacket.js:202-219`), so this latter path is an artifact leak, not a demonstrated prompt leak. Remove build paths at their producer/packet boundary while retaining source and reporter guidance that belongs in the brief.

### F3 — Phase 5 silently reverts to the raw key if the helper is absent (FIX)

`phase05-citizens/processAdvancementIntake.js:624-635` calls `describeUsageContext_` only when it is a function; otherwise it uses `update.context` verbatim. The helper is defined in the separate Apps Script file `phase07-evening-media/mediaRoomIntake.js:577-584`, and Phase 5 is called by `phase01-config/godWorldEngine2.js:668`. In a complete Apps Script project the helper is a global function at call time, regardless of file order; the source itself gives no reason to expect a load-order failure. Input: a partial/misassembled stage without that file and a hard-light row whose Context is `sports_c113_p-slayer` → output: the raw ops key is appended to both `Simulation_Ledger.LifeHistory` and `LifeHistory_Log.EventText` instead of world words. The `typeof` branch makes that failure silent. A primitive Sheet string will not make the helper's `String(...).trim().match(...)` path throw; an exotic object with a throwing conversion would throw before either hard-light line is written. When present, `said152` is reused for both ledger and queued log text, so their rendered context stays in step; the log's queued write and ledger persistence remain separate commit paths (`:632-635`).

There is also a pre-existing attribution defect at this seam: each usage row overwrites `ledgerUpdates[lr].context`, while `hard` is the OR of all rows for that citizen (`processAdvancementIntake.js:470-475,528-533`). Input a negative sports row followed by a neutral civic row for one citizen in the same pass → the final hard-light line and log both describe the *civic* piece even though only the sports piece was negative (`:615-635`). The new formatter makes both outputs consistently world-facing but does not repair that wrong attribution. Keep the triggering hard row's context with its hard flag; make helper absence fail visibly; test the Phase 5 branch rather than only the helper.

### F4 — `OriginGame` remains in last-field or spaced excerpts (FIX)

`lib/mags.js:734-742` filters only the exact substring `"OriginGame":"<no quote>",`. Input a matched, minified JSON line ending `,"OriginGame":"Game"}` → the trailing comma required by the regex is absent, so the `searchDisk` excerpt still includes `OriginGame` (subject to its length cap). Input `"OriginGame": "Game",` also survives because the regex does not allow space. The new assertion at `lib/mags.searchDisk.test.js:130-134` checks one current ledger query, not these shapes. This is an excerpt boundary finding; it does not propose changing the ledger field, which the TASK excludes.

### F5 — the live integration assertion still requires the deleted footer (FIX)

`scripts/buildWorldSummary.js:1470-1475,1614-1617` now emits only a rule and blank line as its footer. `scripts/buildWorldSummary.test.js:1020-1021` rejects `Generated by` and then still requires `No LLM in the writer loop`, text that the removed footer supplied. Input: enable the guarded integration path (`:991-1003`) and build a summary with the new writer → the test fails on the old footer assertion after the new one passes. `scripts/notebooklmDailyNews.js:524-529` merely filters a legacy generator line; it tolerates the line's absence and remains compatible. Update the stale assertion so a live integration run tests the intended output.

## Inspected paths and proof boundary

For the double-credit hunt, `scripts/reconcileRheaDisposition.js:202-253` stages a distinct filing but records `bylineUsage.recorded: false`; `scripts/preSaturdayCoverageSweep.js:119-160` invokes that local reconciliation and does not directly append `Citizen_Media_Usage`. The three new writers normalize old and new Context at their read/append comparison (`cron-desk-run.js:316-329`, `cron-saturday-run.js:580-592`, `ingestPublishedEntities.js:1021-1043`), so a serial rerun of the *same* filing is not newly double-credited by a raw-vs-stripped comparison. This does not certify concurrent read/append races or live Sheet contents. The plan's 524-row cleanup and life-record readbacks (`docs/plans/2026-10-11-media-extension.md:709-711`) were read as claims, not independently verified.

**Wiring card (source-derived):** `godWorldEngine2.js:668` calls `processAdvancementIntake_`, which calls `processMediaUsage_` (`phase05-citizens/processAdvancementIntake.js:126-147,368`). The media usage row supplies `Context`; a hard-light update sends it through `describeUsageContext_` (`:624-627`, defined in `phase07-evening-media/mediaRoomIntake.js:577-584`), then one rendered value enters ledger `LifeHistory` and a `LifeHistory_Log` append intent (`processAdvancementIntake.js:629-635`). This is a static card: the TASK's no-network rule precluded the otherwise pre-approved model-generated wiring card.

**Method and gate:** Read both commit diffs, the named TASK, plan changelog, writer and reader implementations, local C112 sidecars and published selection. Calculated only local file hashes. No tests, model calls, Sheet reads, live runs, bench fires, deploys, or code edits. HOLD until a filing-preserving credit key and the Tanya prompt path are fixed and reviewed; F3–F5 are bounded follow-up fixes. The engine change remains a candidate, not established PROD behavior.
