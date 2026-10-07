---
title: Supermemory API v5 Migration
created: 2026-10-06
updated: 2026-10-06
type: plan
tags: [infrastructure, supermemory, ready]
sources:
  - docs/engine/ROLLOUT_PLAN.md infrastructure.10
  - https://supermemory.ai/docs/migration/api-v5 (vendor guide; fetched 2026-10-06)
  - vendor email 2026-10-06 — "If you're using the v3 or v4 API, please migrate your integration within 3 months"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (infrastructure.10)"
  - "[[../scripts/brainSearch.js]] — already on CLI 5.x (`d44fe8ee`); the only Supermemory caller NOT in scope"
---

# Supermemory API v5 Migration

**Deadline:** vendor email 2026-10-06 gives 3 months → cut over before **2027-01-06**. The guide itself names no sunset. Probed 2026-10-06 with the lib's key: `/v3/search`, `/v4/search`, `/ns/sl-godworld/search`, `/v3/documents/list` all **200**. Nothing is broken today.

**Shape of the job:** a design pass, not a rename. v5 puts a document in exactly one namespace; the card layer writes every doc under two container tags and two readers search across containers. The guide's agent prompt ("rename everything, no aliases") is the wrong tool on a live bot — cut one domain at a time with rollback.

## Field map (guide)

| legacy | v5 |
|---|---|
| `POST /v3/documents` `{containerTag(s), customId}` | `POST /ns/{namespace}/document` `{id}` |
| `GET /v3/documents/{id}` | `GET /ns/{ns}/document/{id}?include=chunks,memories` |
| `DELETE /v3/documents/{id}` | `DELETE /ns/{ns}/document` body `{ids:[…]}` |
| `POST /v3/documents/list` `{page,limit}` | `POST /ns/{ns}/list/documents?page=&limit=&sort=&order=` |
| `POST /v3/search` / `/v4/search` `{q, containerTag(s), searchMode, filters}` | `POST /ns/{ns}/search` `{query, filter}`; default mode `hybrid`; `searchMode:"documents"` → `"chunks"` |
| `POST /v4/profile` `{containerTag, q…}` | `POST /ns/{ns}/profile` (no query params) → `{profile:{static,dynamic,buckets}}` |
| `/v4/memories` list | `POST /ns/{ns}/list/memories?page=&limit=` |
| `/v3/container-tags/merge` | no v5 equivalent in one call; `DELETE /ns/{ns}?moveTo=` |
| timestamps `createdAt/updatedAt` top-level | under `system.{createdAt,updatedAt,status}` |
| search result `chunks[].{content,isRelevant}` | `results[].{memory, chunk, id, system}` — single `chunk`, no `isRelevant` |

## Call-site inventory (grep 2026-10-06, `node_modules` excluded)

**Choke point** — `lib/supermemory.js` (`search`, `searchContext`; `searchContext` filters on `chunks[].isRelevant`, which v5 drops). Nine callers ride it: `scripts/mags-discord-bot.js`, `ingestEditionWiki.js`, `buildArchiveContext.js`, `buildBusinessCards.js`, `buildCitizenCards.js`, `buildCulturalCards.js`, `buildFaithCards.js`, `buildInitiativeCards.js`, `buildNeighborhoodCards.js`.

**Direct `https.request` / `fetch` callers** — `lib/mags.js:728`, `lib/citizenPage.js:32`, `lib/wakePerception.js:313`, `.agents/skills/godworld_batch_ingest/scripts/batchIngestDriveFolder.js:28`, `scripts/cron-saturday-run.js:65`, `scripts/mags-discord-bot.js:341,400`, `scripts/ingestCivicWiki.js`, `ingestEdition.js`, `ingestPlayerTrueSource.js`, `sweepCanonIngest.js`, `supermemory-ingest.js`, `sessionSummaryToSupermemory.js`, `moltbook-heartbeat.js`, `scanCitizenPages.js`, `queryFamily.js`, `saveCivicNarratives.js`, `dedupWdCitizens.js`, `wipeWorldDataSnapshots.js`, `auditBayTribune.js`, `auditBayTribueUnknowns.js`, `auditWorldData.js`, `auditCardLayerCensus.js`, `migrateSupermemory.js` (one-off org move, S109 — stale, do not reuse), the seven card builders above, `scripts/godworld-mcp.py`.

**Live surfaces** — cron: `cron-saturday-run.js` (Sat), `moltbook-heartbeat.js` (daily 14:00), `sweepCanonIngest.js`. pm2: `mags-bot` = `mags-discord-bot.js` (restart on cut). Hook `.claude/hooks/session-eval.js`.

**Skills with inline curl** — `.claude/skills/save-to-mags/SKILL.md:39`, `save-to-bay-tribune/SKILL.md:44`, `post-publish/SKILL.md:212,225`, `run-cycle/SKILL.md:82` — all `POST /v3/documents`.

**Tests** — `scripts/auditBayTribune.contract.test.js`, `auditWorldData.contract.test.js` assert `/v3/` paths. `cronSaturdayRun.test.js`, `auditBayTribuneUnknowns.contract.test.js` reference the lib.

**Guard** — `.claude/hooks/pre-tool-check.sh:286` keys on `curl.*api\.supermemory\.ai` + a mutating verb, not on `/v3/`; moving skills to `/ns/` stays guarded. `.claude/settings.json:102` allowlist is host-only; unchanged.

**Already done** — `scripts/brainSearch.js` on CLI 5.x (`--namespace`, `.results[].chunk`, `system.updatedAt`). `CLAUDE.md` save row on `add --namespace sl-godworld` (builder-direct 2026-10-07).

## The design decision (one namespace per document)

Writers today: every card builder and the post-publish/run-cycle curls write `containerTags: ['world-data', 'wd-<domain>']`; `ingestPlayerTrueSource.js` same shape; `lib/citizenPage.js:69` writes `[PARENT_TAG, tag]`; `lib/mags.js:723`, `cron-saturday-run.js:244`, `ingestEdition.js:364` pass a `tags` array.

Readers across containers: `mags-discord-bot.js:322` searches `['world-data','bay-tribune']`; `lib/mags.js:723` searches a `tags` array.

Existing double-tagged documents already list under **both** namespaces in v5 (probed: `/ns/wd-business/list/documents` and `/ns/world-data/list/documents` both return them). Only new writes have to pick one.

**Recommendation (engineering lane):** the domain namespace (`wd-business`, `bay-tribune`, `cp-POP-xxxxx`…) is the one namespace on every write; the two cross-container readers fan out to one `/ns/{ns}/search` per namespace and merge by `similarity`. The parent `world-data` namespace stops receiving new cards; its remaining read use is the snapshot/summary writes from `post-publish`, which get their own `wd-summary`/`wd-snapshot` namespace. No merge or delete of existing data.

## Search quality (probed 2026-10-06, same key, same namespaces)

Three queries against `world-data` and `sl-godworld`, v3 `/search` vs v5 `/ns/{ns}/search`:

| query | v3 chunks | v5 `searchMode:"chunks"` | v5 default (hybrid) |
|---|---|---|---|
| who owns Dillon Clinic | Dillon Clinic card, 6.3 s | same cards, 4.3 s | run 1: 0 hits; run 2: same cards |
| Baylight District location | 3 Baylight cards, 3.5 s | same 3 cards, 4.8 s | 3 Cycle-106 metric memories, no cards |
| why was engine.277 reverted (`sl-godworld`) | — | unrelated chunks | run 1: the correction memory, top hit; run 2: HTTP 500 |

**Verdict: no search-quality gain.** v5 chunk mode returns the same documents at the same latency. The v5 default is `hybrid`, which for the card readers swaps documents for distilled metric memories and was non-deterministic across runs. **Every v3-lineage reader (`searchContext`, bot, `mags.js`, `wakePerception`, `citizenPage`) pins `searchMode:"chunks"` on cutover** to keep today's behaviour. `brainSearch` keeps memories for `sl-godworld` and hybrid for `sl-rules` as already wired. The body key is `searchMode`, not `mode` (`mode` → 400 `unrecognized_keys`).

## Cut order (one domain at a time, rollback = revert the path-specific commit)

1. `lib/supermemory.js` — add v5 path, `searchContext` reads `chunk` instead of `chunks[].isRelevant`; nine callers unchanged in signature. Prove on `brainSearch`-style search against `sl-godworld`.
2. `mags-discord-bot.js` direct calls (profile at :341, documents at :400) + `lib/mags.js`, `lib/wakePerception.js`, `lib/citizenPage.js` — then `pm2 restart mags-bot`, watch one Discord exchange.
3. Cron writers — `cron-saturday-run.js` before the next Saturday run after step 2; `sweepCanonIngest.js`; `moltbook-heartbeat.js`.
4. Card builders + ingest scripts (write path, `id` replaces `customId`, one namespace).
5. SKILL.md curl blocks, contract tests, `godworld-mcp.py`, `session-eval.js`.
6. Delete `scripts/migrateSupermemory.js` (one-off, references ignored `containerTag` filter behaviour that v5 removes) — builder's word first per rails.

## Acceptance

- Every live surface above makes at least one successful v5 call in an unattended run (cron log line or bot reply), not a hand demo.
- `grep -rn "/v3/\|/v4/" lib scripts .claude .agents` returns only the vendor-guide URL in this doc and the historical note in `migrateSupermemory.js` (or nothing, after step 6).
