---
title: Codex last-round rereview of pipeline.99 world-facing fold
created: 2026-10-31
updated: 2026-10-31
type: reference
tags: [media, review, active]
sources:
  - output/codex/TASK-2026-10-31-pipeline99-world-facing-rereview.md
  - commit f9947738
  - docs/for-claude-review/2026-10-31-codex-pipeline99-world-facing-review.md
pointers:
  - "[[2026-10-31-codex-pipeline99-world-facing-review]] — original F1–F5"
  - "[[../plans/2026-10-11-media-extension]] — pipeline.99 fold and repair claims"
---

# pipeline.99 — last-round rereview

**Verdict: HOLD.** The fold closes the C112 `-HHMM` collision in source and removes the two named pointer producers, but model-only stems for distinct staged articles still share a credit key, and the loaders still serve C113 cached pointers into planning packets. This is the one requested rereview of `f9947738`; the seat decides the remaining gate.

## Remaining findings

### R1 — a model-only difference still collapses two real filings (HOLD)

`lib/mags.js:634-639` strips the entire `_packet-v2_<model>` tail when no trailing numeric filing suffix is present. Two C113 Tamsin sidecars are both `status: staged`, name the same author, and point to different articles: `output/cron-compare/staged/culture_c113_tamsin-pruitt_packet-v2_x-ai-grok-4-3.staged.json:1-18,42-46` and `...anthropic-claude-sonnet-5-5.staged.json:1-18,70-82`. Their article SHA-256 prefixes are `d69f3ed68b03` and `ab3ab833e5cc` (local file read); the sidecars name different source citizens. Both normalize to `culture_c113_tamsin-pruitt`. The local migration backup records two already distinct Tamsin usage rows, R1070 and R1075, with those exact raw contexts both changed to that same key (`output/research-build/2026-10-31-pipeline99-usage-context-backup.json:27-30,57-60`). This is an identity collision, not evidence that those already written rows lost their past credit; neither article is established here as printed.

Input: one of these model-only filings has an existing byline or printed-usage row and the other arrives in a later pass → `recordBylineUsage` treats it as a duplicate (`scripts/cron-desk-run.js:316-329`); Saturday's `existing` set skips the second author credit if printed (`scripts/cron-saturday-run.js:516-526,580-592`); the article-table writer's `existingKeys` / `plannedKeys` does the same (`scripts/ingestPublishedEntities.js:1021-1043`). Output: a distinct filing receives no new `byline-landed` or `byline-published` row on those paths. A filing identity independent of model name and optional clock suffix is needed to distinguish these pieces.

### R2 — unchanged slice caches still put build paths in planning packets (HOLD)

The fold removes Tanya's `scripts/sportsSubstrate.js` producer pointer (`scripts/buildTanyaSlice.js:159-165`) and the shared beat kit's plan pointer (`scripts/beatSliceKit.js:231-233`). It does not invalidate existing slice JSON. `scripts/buildTanyaSlice.js:214-223` returns any nonempty cached JSON before rebuilding, and the current C113 cache still carries `scripts/sportsSubstrate.js` (`output/cron-compare/tanya_slice_c113.json:157-160`). Input: a C113 Tanya planning wake after this fold → `scripts/cron-desk-run.js:1691-1699,1824-1827,2098-2105` loads that cached slice; `scripts/livedExperiencePacket.js:173-187,423-431,1002-1004` copies its pointer to the model prompt. Output: the script path still reaches Tanya despite the source edit.

The C113 evening cache similarly retains `docs/plans/2026-08-08-journalist-heat-slice-packs.md Task 1` (`output/cron-compare/evening_slice_c113.json:802-806`). Its loader also returns any nonempty cache (`scripts/buildEveningSlice.js:1019-1025`); an evening seat loads it (`scripts/cron-desk-run.js:1745-1764`), and `scripts/livedExperiencePacket.js:242-260,423-431,1002-1004` puts the cached plan pointer in W1. Generic beat caches retain the removed plan pointer too (`output/cron-compare/data_desk_slice_c113.json:168-170`), because `scripts/beatSliceKit.js:317-322` serves a same-version cache without rewriting it; the generic typed brief omits pointers (`scripts/livedExperiencePacket.js:202-219`), so that last case is an artifact leak, not a demonstrated prompt leak. Invalidate or sanitize existing caches at the reader boundary before claiming the C113 wake path is clean. These are current local cache contents, not proof that a later wake actually ran.

## Disposition and read boundary

- **F1 numeric suffix: SHIP in source.** The two selected C112 Ines stems end `-1615` and `-1814` (`output/edition_published_c112.json:3-8`); `modelFreeStem` now produces different keys ending in those suffixes (`lib/mags.js:634-639`; asserted in `lib/mags.searchDisk.test.js:133-140`). A model-only `deepseek-v4-flash-0731` loses its model tail, as intended by the added test (`:137`). On a valid single `_packet-v2_` stem, the output has no marker, so applying the function again leaves it unchanged. The three writers normalize both stored and incoming Context (`cron-desk-run.js:316-329`, `cron-saturday-run.js:580-592`, `ingestPublishedEntities.js:1021-1043`); repaired model-free C112 keys with `-HHMM` therefore meet a raw incoming stem with the same suffix. `entryByline` uses the raw stem to find the original sidecar (`cron-saturday-run.js:603-610`, `lib/articleIntake.js:249-262`); `describeUsageContext_` reads the desk/cycle prefix and accepts a suffixed model-free key (`phase07-evening-media/mediaRoomIntake.js:577-584`). The plan reports 11 repaired Ines rows and a Sheet readback (`docs/plans/2026-10-11-media-extension.md:709`); this review did not independently read the Sheet.
- **F2 fresh producers: SHIP in source, HOLD on cached consumers.** The two named literals are removed at `buildTanyaSlice.js:161-165` and `beatSliceKit.js:232-233`; R2 covers the still readable cache. Other `scripts/` or `docs/plans` hits in inspected builders are comments, error text, or source paths, not newly built pointer fields; this does not erase the cached W1 paths above.
- **F4 and F5: SHIP on the inspected fold.** `lib/mags.js:739-746` now matches spaced and last-field `OriginGame` excerpts. `scripts/buildWorldSummary.test.js:1019-1022` no longer requires the deleted footer sentence. No tests or live search were run here.
- **F3 and engine.329: decided in the TASK.** The Phase 5 `typeof` fallback remains, and wrong-piece hard-light attribution is filed separately. Neither is reopened in this verdict. The two `-almanzar-debut` rows and staged filenames are also outside this rereview.

**Method and gate:** Read the updated TASK, `f9947738` diff, prior review, local staged sidecars, migration backup, cached slice JSON, and producer/reader source. Used a local read-only normalization/collision calculation; no code edits, test suites, model/network calls, Sheet reads, cron/live runs, or deployments. HOLD on R1 and R2 for the seat's final disposition; the saved repair claim, runtime wake behavior, and live credit readback remain unverified here.
