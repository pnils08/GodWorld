---
title: Storylines Keyed To Engine Events Plan Review
created: 2026-09-28
updated: 2026-09-28
type: reference
tags: [engine, media, draft]
sources:
  - docs/plans/2026-09-28-storylines-keyed-to-engine-events.md
  - scripts/buildWorldSummary.js
  - scripts/cron-desk-run.js
  - scripts/cron-desk-writer.js
  - scripts/livedExperiencePacketV2.js
  - scripts/cron-saturday-run.js
pointers:
  - "[[plans/2026-09-28-storylines-keyed-to-engine-events]] — plan under review"
---

# Adversarial review — engine.270

Static review of commit `6c75ad53` against current code. Findings are ordered by impact. No code or plan was changed.

1. **Blocker — `storylineId` does not survive the live lane-to-writer path.** Task 2 adds the field to a `desk_signal` lane entry, but the fanout selects that entry and calls `storyFromSeed`, which copies only `ref`, `label`, `kind`, handle fields, `popids`, and `hood`; it drops `storylineId` (`scripts/newsroom-fanout.js:200-222`, `scripts/newsroom-fanout.js:505-509`). `loadLane` itself preserves the lane object (`scripts/cron-desk-run.js:1218-1231`), but wake 1 begins with `assign.story`, not a lane entry (`scripts/cron-desk-run.js:1403`), and writes that story unchanged to `angle.json` (`scripts/cron-desk-run.js:1951-1955`). Wake 2 copies the angle story into `packet.json` (`scripts/cron-desk-run.js:2438-2452`); wake 3 passes it to `buildWritePacket` (`scripts/cron-desk-run.js:2602-2635`). The current packet constructor also explicitly selects signal fields (`scripts/livedExperiencePacketV2.js:238-240`, `scripts/livedExperiencePacket.js:766-772`). Therefore Task 3.4 (`plan:91`) cannot tag normal fanout assignments by only changing the two Task 3 files. Add the fanout conversion to scope and prove the ID on the persisted angle, report, and write artifacts. Several seats replace the fanout story with a beat-slice story during the angle wake (`scripts/cron-desk-run.js:1441-1460`, `scripts/cron-desk-run.js:1573-1610`); those replacements need an explicit evidence-based mapping or must remain untagged.

2. **Blocker — initiative stage start and transition cycles cannot be recovered as specified.** Task 1.3 requires the new registry's `startCycle` to come from the `Storyline_Ledger` row (`plan:67`), while Task 5 first creates that engine-keyed row on Saturday (`plan:110-114`). On the first build there is no such row; the present builder has only the current `Initiative_Tracker` snapshot (`scripts/buildWorldSummary.js:1089-1093`) and the existing ledger read (`scripts/buildWorldSummary.js:1282-1302`). The current merge initializes `FirstCycle` to the Saturday cycle when appending (`scripts/cron-saturday-run.js:464-469`). A stage that changes before Saturday cannot meet acceptance criterion 8's exact closing cycle (`plan:46`) from the current tracker value plus a prior ledger key alone. Specify a persisted stage-transition source and first-observation behavior before asserting exact `startCycle`, `age`, or close cycle.

3. **High — the Saturday attach pass runs after canon publication and article indexing.** Task 7 locates attachment in `stepSignals` (`plan:130-135`), but the full run executes `stepPublish`, then `stepSweep`, then `stepSignals` (`scripts/cron-saturday-run.js:981-1015`). Publication assembles and ingests the staged article text (`scripts/cron-saturday-run.js:831-875`); the sweep derives each article's `metadata.storylines` from its sidecar and posts it before `stepSignals` (`scripts/cron-saturday-run.js:207-229`, `scripts/cron-saturday-run.js:267-289`). Attaching there can update the ledger aggregation, but cannot make the already published article or indexed article metadata carry the ID. Put the attach decision before those consumers, or explicitly limit Task 7 to a ledger-only association and revise its article-attachment claim.

4. **High — Task 4's verb cannot be determined from the described writer packet.** `storylineFor(packet)` is to emit `opened` when no ledger row exists, `closed` when the registry entry is closed, and otherwise `advanced` (`plan:99`). Task 3.4 supplies only `packet.signal.storylineId` (`plan:91`). Today `cron-desk-run.js` gives the packet a story and `openThreads`, but no ledger existence or registry status (`scripts/cron-desk-run.js:2623-2637`); `livedExperiencePacketV2.js` only copies thread entries into `packet.signal` (`scripts/livedExperiencePacketV2.js:283-299`). The current writer uses the thread list plus model marker to decide a verb (`scripts/cron-desk-writer.js:404-424`). Define how the new packet receives a registry status and an authoritative row-existence bit, or where `storylineFor` reads them, before relying on its three-way result.

5. **Medium — a registry-only upsert must preserve the meaning of `LastCycle`.** Task 5 upserts even uncovered entries and Task 6 retains derived dormancy (`plan:110-124`). The current merge sets `LastCycle` to the processing cycle on every updated signal and new row (`scripts/cron-saturday-run.js:447-468`), while the reader derives coverage age from that field (`scripts/buildWorldSummary.js:995-998`), and post-cycle review labels it the last cycle (`scripts/post-cycle-review.js:95-100`). If Task 5 applies the same assignment to every registry entry, an uncovered but open event will appear freshly covered forever. Distinguish engine observation from article coverage when setting `LastCycle`; keep `Articles 0` meaningful.

6. **Medium — Task 6 names a reader that no longer exists.** The plan lists `scripts/buildDeskPackets.js (normalizeStorylineLedger)` (`plan:121`), but that script's current v3 header says the per-desk packet generator was removed, lists its three remaining outputs, and does not list `Storyline_Ledger` among its inputs (`scripts/buildDeskPackets.js:3-33`). A full-file symbol search found no `normalizeStorylineLedger` in `scripts/`. The actual live reader named in this task is `scripts/post-cycle-review.js:91-100`; correct Task 6's file list and verification target. The manifest pointer to the deleted adapter is also stale (`docs/engine/SHEETS_MANIFEST.md:74`).

7. **Medium — removing `arc.json.storyline` is not behavior-neutral and leaves a test outside Task 4.** `loadArcSeeds` accepts a missing field, but converts it to an empty `intake.storylines` list (`scripts/cron-saturday-run.js:126-149`), which `aggregateStorylineSignals` ignores (`scripts/cron-saturday-run.js:394-405`). That may be the desired end of quote-only thread minting, but the existing `scripts/citizenArcSeed.test.js:18-24` asserts the old field and a Saturday signal. Task 4's listed verification only updates `cron-desk-writer.test.js` (`plan:95-103`); update or retire the arc-seed contract test and state explicitly that a quote pass alone no longer counts as storyline coverage.
