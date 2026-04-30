---
title: Bay-Tribune Unified Ingest Rebuild
created: 2026-04-30
updated: 2026-04-30
type: plan
tags: [architecture, infrastructure, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §Edition Post-Publish ("NEW: Bay-tribune unified ingest rebuild")
  - docs/plans/2026-04-27-world-data-unified-ingest-rebuild.md (sibling — wd-rebuild, complete S183, the canonical pattern)
  - docs/SUPERMEMORY.md §How to search + §Scrub Procedure (S186) + §API Quick Reference
  - scripts/ingestEdition.js (current writer — chunked .txt, /v3/documents, single bay-tribune tag)
  - scripts/ingestEditionWiki.js (current writer — per-entity wiki records, /v4/memories legacy endpoint)
  - scripts/ingestPublishedEntities.js (current writer — engine-canon Sheets ingest, NOT Supermemory)
  - .claude/skills/save-to-bay-tribune/SKILL.md (current manual save path — /v3/documents curl)
  - editions/cycle_pulse_dispatch_92_kono_second_song.txt (canonical fixture for non-edition runs)
  - Mags doc reference S185 Perkins scrub: WL8kvoxQgmcvxSPW3Ph47n (motivation — current chunked storage has no targeted-replacement primitive)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout, §Edition Post-Publish entry"
  - "[[plans/2026-04-27-world-data-unified-ingest-rebuild]] — sibling plan, the canonical pattern this one mirrors"
  - "[[SUPERMEMORY]] — container model + API quirks + scrub procedure"
  - "[[SCHEMA]] — doc conventions"
  - "[[EDITION_PIPELINE]] §Slug discipline — slug = canonical retrieval token, immutable post-publish"
  - "[[index]] — register in same commit"
---

# Bay-Tribune Unified Ingest Rebuild

**Goal:** Spec per-type tag scheme + customId-as-slug rule + DELETE-by-tag wipe primitives + re-ingest mode for the bay-tribune Supermemory container, so future scrub workflows (Perkins-class contamination, version corrections, slug-targeted replacements) become atomic and replayable instead of grep-and-replace ad-hoc cleanup.

**Architecture:** Each ingest path writes with `containerTags: ['bay-tribune', 'bt-<type>']` where `<type>` is one of the 14 published artifact + wiki-record types enumerated below. Each doc carries a `customId` derived from the artifact slug + chunk-or-record discriminator, so DELETE-by-customId becomes the targeted-replacement primitive. The bare `bay-tribune` tag still works for broad search (existing Mags + Rhea + reader-agent queries unchanged); the new `bt-<type>` tags enable type-filtered retrieval (`search_canon` can scope to editions only, dispatches only, wiki-citizen records only) and per-type wipe (re-ingesting a specific cycle's edition wipes the prior version cleanly without touching anything else). Endpoint divergence closes: `ingestEditionWiki.js` migrates from legacy `/v4/memories` to `/v3/documents` to match `ingestEdition.js` + `/save-to-bay-tribune` and inherit the dual-tag payload shape.

**Terminal:** research-build (this plan + spec + verifications); engine-sheet (writers, retrofits, MCP tool extensions); media (validation fixture).

**Pointers:**
- Prior work — sibling pattern: `docs/plans/2026-04-27-world-data-unified-ingest-rebuild.md` (S182-S183, complete). The wd-rebuild's canonical writer skeleton (`smRequest` / `writeMemory` / `listPageWithRetry` / `getDocWithRetry` / `smSleep`, retry-on-401/429 with 8s backoff, 500ms inter-write sleep, 30s settling between wipe and write, abort-on-incomplete-enumeration) carries forward verbatim. See sibling §"Writer hardening pattern (post-W1, canonical for W2–W5 + R2)".
- Motivation — Perkins scrub friction (S185-S186): bay-tribune chunked text has no slug-as-doc-id mapping. Mags doc `WL8kvoxQgmcvxSPW3Ph47n` documents the manual cleanup path (enumerate → grep content → DELETE) that took most of S185-S186. After this rebuild, equivalent scrub = `DELETE-by-customId <slug>-part-1`, `DELETE-by-customId <slug>-part-2`, then re-ingest.
- API surface: writes use `/v3/documents` (`containerTags` plural array, `metadata` object, `customId` field). Search uses `/v4/search` (`containerTag` singular, server-side filter). DELETE uses `/v3/documents/{id}` OR `/v3/documents/customId/<value>`. Reference: `docs/SUPERMEMORY.md` §API Quick Reference.
- Existing call sites that route through here:
  - `scripts/ingestEdition.js` — chunked .txt body ingest (5 publish types: edition / supplemental / dispatch / interview / interview-transcript). Already on `/v3/documents`. Ready for dual-tag + customId retrofit.
  - `scripts/ingestEditionWiki.js` — per-entity wiki records (5 record types: citizen-appearance / citizen-returning / citizen-new / storyline-transition / continuity). Currently on legacy `/v4/memories`. Needs full endpoint migration + dual-tag + customId.
  - `.claude/skills/save-to-bay-tribune/SKILL.md` — manual canon saves via curl. Already on `/v3/documents`. Needs dual-tag examples updated.
  - `scripts/ingestPublishedEntities.js` — **NOT bay-tribune.** This writes engine canon to Sheets (Simulation_Ledger, Business_Ledger). Out of scope; mentioned for completeness so future readers don't conflate.

**Acceptance criteria:**
1. Tag taxonomy locked: 14 tags below, each carrying the `bay-tribune` companion tag.
2. customId scheme locked: every doc carries `customId = <slug>-<chunk-or-record-discriminator>`, deterministic and slug-derivable.
3. `ingestEdition.js` writes dual-tag + customId for all 5 publish types.
4. `ingestEditionWiki.js` migrated to `/v3/documents`, writes dual-tag + customId for all 5 wiki-record types.
5. Wipe primitive `scripts/wipeBayTribuneByCustomId.js` (NEW) deletes by customId prefix; targeted-replacement test passes (delete C92 KONO dispatch records, re-ingest, verify clean).
6. `/save-to-bay-tribune` skill body updated to specify dual-tag + customId pattern in the Step 3 curl example.
7. Phase-1 inventory of current bay-tribune container: doc count, type-shape distribution, orphan count (docs with no parseable type).
8. `search_canon` MCP tool optionally accepts a `--type bt-<...>` filter (default behavior unchanged — bare `bay-tribune` query still returns everything).

---

## Tag scheme (canonical)

| Type | Tag pair on every doc | Source artifact / writer | customId pattern |
|---|---|---|---|
| **Edition body** | `['bay-tribune', 'bt-edition']` | `editions/cycle_pulse_edition_<XX>.txt` via `ingestEdition.js` | `edition-c<XX>-part-<N>` |
| **Supplemental** | `['bay-tribune', 'bt-supplemental']` | `editions/cycle_pulse_supplemental_<XX>_<slug>.txt` via `ingestEdition.js` | `supplemental-c<XX>-<slug>-part-<N>` |
| **Dispatch** | `['bay-tribune', 'bt-dispatch']` | `editions/cycle_pulse_dispatch_<XX>_<slug>.txt` via `ingestEdition.js` | `dispatch-c<XX>-<slug>-part-<N>` |
| **Interview article** | `['bay-tribune', 'bt-interview-article']` | `editions/cycle_pulse_interview_<XX>_<slug>.txt` via `ingestEdition.js` | `interview-c<XX>-<slug>-part-<N>` |
| **Interview transcript** | `['bay-tribune', 'bt-interview-transcript']` | `editions/cycle_pulse_interview-transcript_<XX>_<slug>.txt` via `ingestEdition.js` | `interview-transcript-c<XX>-<slug>-part-<N>` |
| **Wiki citizen-appearance** | `['bay-tribune', 'bt-wiki-citizen']` | `ingestEditionWiki.js` recordType=`citizen-appearance` | `wiki-citizen-c<XX>-<POPID>` |
| **Wiki citizen-returning** | `['bay-tribune', 'bt-wiki-citizen']` | same script, recordType=`citizen-returning` | `wiki-returning-c<XX>-<POPID>` |
| **Wiki citizen-new** | `['bay-tribune', 'bt-wiki-citizen']` | same script, recordType=`citizen-new` | `wiki-new-c<XX>-<POPID>` |
| **Wiki storyline** | `['bay-tribune', 'bt-wiki-storyline']` | same script, recordType=`storyline-transition` | `wiki-storyline-c<XX>-<storyline-slug>` |
| **Wiki continuity** | `['bay-tribune', 'bt-wiki-continuity']` | same script, recordType=`continuity` | `wiki-continuity-c<XX>-<note-hash>` |
| **Wiki cultural** | `['bay-tribune', 'bt-wiki-cultural']` | future writer (engine-sheet, downstream task) | `wiki-cultural-c<XX>-<CUL-ID>` |
| **Wiki business** | `['bay-tribune', 'bt-wiki-business']` | future writer (engine-sheet, downstream task) | `wiki-business-c<XX>-<BIZ-ID>` |
| **Roster** | `['bay-tribune', 'bt-roster']` | `/save-to-bay-tribune` type=roster (existing) | `roster-c<XX>-<team>` |
| **Game result** | `['bay-tribune', 'bt-game-result']` | `/save-to-bay-tribune` type=game-result (existing) | `game-c<XX>-<gameid>` |
| **Canon correction** | `['bay-tribune', 'bt-canon-correction']` | `/save-to-bay-tribune` type=canon-correction (existing) | `correction-c<XX>-<slug>` |

**Why three wiki-citizen recordTypes share `bt-wiki-citizen`:** all three carry the same retrieval shape ("show me everything we know about Beverly Hayes from edition X"). Tag-level grouping lets a `search_canon --type bt-wiki-citizen` query pull all three subtypes; the `recordType` field in metadata still distinguishes them when needed. Storyline + continuity are functionally distinct retrieval surfaces — they get their own tags.

**Why the `bt-` prefix:** matches the wd-rebuild precedent (`wd-citizens`, `wd-business`, etc.). Future top-level container collisions are avoided (a hypothetical future `dispatch` container is unambiguously different from the `bt-dispatch` sub-tag).

**`bt-wiki-cultural` + `bt-wiki-business` are pre-allocated** even though no writer currently produces them. ingestEditionWiki currently only emits citizen / storyline / continuity records; cultural figures (Marin Tao, Brody Kale per S188 KONO dispatch) and businesses (named in body but engine-canon ingested separately) deserve their own wiki layer. Tag pre-allocation prevents future collision. Writer for those is a separate downstream task, not in this plan's scope.

---

## customId discipline

Every bay-tribune doc carries a `customId` field on the `/v3/documents` POST. The customId is **deterministic from the artifact slug + chunk/record discriminator** — same source artifact ingested twice produces identical customIds, which means DELETE-by-customId is the wipe primitive AND idempotency primitive AND scrub primitive.

**Rules:**
1. **Slug = canonical retrieval token** (per `[[EDITION_PIPELINE]] §Slug discipline`). Once published, immutable. customId derivation must use the same slug across filename, masthead, /sift queries, MCP search_canon, Mara audit, desk citations, production log, AND now the bay-tribune customId.
2. **customId is lowercase, underscore-OR-dash-separated, ASCII only.** Match the slug rule.
3. **Chunk discriminator format:** `-part-<N>` for 1-indexed text body chunks (Part 1, Part 2). Single-chunk artifacts still carry `-part-1` (uniformity across types).
4. **Wiki record discriminator format:** `-<recordType-prefix>-<entity-or-event-id>`. POPIDs / CULIDs / BIZIDs in caps as they appear on sheets; storyline slugs and continuity note hashes lowercased.
5. **No timestamps in customId.** A re-ingest of the same cycle's same edition lands on the same customId by design — that's how DELETE-by-customId-prefix gives you targeted replacement.
6. **Cycle is a first-class field.** Every customId carries `c<XX>` where XX is the cycle number, zero-padded to 2 digits if cycle < 10 (`c01`, not `c1`). Lets `search_canon --customId-prefix dispatch-c92-` enumerate every dispatch record from C92 across types.

**Deterministic derivation function** (engine-sheet builds, included in both `ingestEdition.js` + `ingestEditionWiki.js`):

```js
// example: deriveCustomId({ type: 'dispatch', cycle: 92, slug: 'kono_second_song', part: 1 })
// → 'dispatch-c92-kono_second_song-part-1'
function deriveCustomId({ type, cycle, slug, part, recordType, entityId, eventHash }) {
  const c = `c${String(cycle).padStart(2, '0')}`;
  if (recordType) {
    // wiki record path
    const prefix = recordType === 'citizen-appearance' ? 'wiki-citizen'
                 : recordType === 'citizen-returning' ? 'wiki-returning'
                 : recordType === 'citizen-new' ? 'wiki-new'
                 : recordType === 'storyline-transition' ? 'wiki-storyline'
                 : recordType === 'continuity' ? 'wiki-continuity'
                 : 'wiki-unknown';
    const tail = entityId || eventHash;
    return `${prefix}-${c}-${tail}`;
  }
  // body path
  const slugPart = slug ? `-${slug}` : '';
  return `${type}-${c}${slugPart}-part-${part}`;
}
```

**Edition body has no slug** (the artifact is `cycle_pulse_edition_<XX>.txt`, no slug component). customId = `edition-c<XX>-part-<N>`. Supplemental/dispatch/interview always carry slug.

---

## Wipe policy per type

The canonical wipe primitive: `scripts/wipeBayTribuneByCustomId.js <customId-prefix>`. Enumerates docs in `bay-tribune` whose `customId` starts with the prefix, DELETEs each, settles 30s. Built once, used everywhere.

| Trigger | customId prefix to wipe | Re-ingest path |
|---|---|---|
| Edition C92 re-ingest (correction) | `edition-c92-` | `node scripts/ingestEdition.js editions/cycle_pulse_edition_92.txt` |
| KONO dispatch re-ingest (correction) | `dispatch-c92-kono_second_song-` | `node scripts/ingestEdition.js editions/cycle_pulse_dispatch_92_kono_second_song.txt --type dispatch --cycle 92` |
| Mayor interview re-ingest | `interview-c92-santana_oari-` AND `interview-transcript-c92-santana_oari-` | both ingestEdition runs |
| All wiki for C92 | `wiki-citizen-c92-`, `wiki-returning-c92-`, `wiki-new-c92-`, `wiki-storyline-c92-`, `wiki-continuity-c92-` | `node scripts/ingestEditionWiki.js <source.txt> --cycle 92` |
| Perkins-class scrub (any literal-string contamination) | enumerate-by-type-tag, content-grep, derive customIds, wipe | re-ingest from corrected source |

**S189-style targeted replacement (the motivating use case):** Mike commits a corrected `editions/cycle_pulse_dispatch_92_kono_second_song.txt`. To replay into bay-tribune cleanly:

```bash
node scripts/wipeBayTribuneByCustomId.js dispatch-c92-kono_second_song-
node scripts/ingestEdition.js editions/cycle_pulse_dispatch_92_kono_second_song.txt --type dispatch --cycle 92
node scripts/ingestEditionWiki.js editions/cycle_pulse_dispatch_92_kono_second_song.txt --cycle 92  # if wiki records also need refresh
```

That replaces the manual S185-S186 grep-and-replace path completely.

**Async-indexing gotcha (carry-forward from wd-rebuild):** writes return `status: queued`; subsequent search/DELETE may return 409 for ~15-30s. Wipe pass needs an explicit settling period before re-write. Constants from sibling: `WIPE_INDEXING_SLEEP_MS = 30000`.

---

## Tasks

Each task is 2–5 minutes of focused work where possible. Larger items are broken into subtasks with explicit verification.

### Phase 1 — Inventory (engine-sheet)

#### Task 1.1: Inventory script — enumerate bay-tribune

- **Files:** `scripts/auditBayTribune.js` (NEW)
- **Steps:**
  1. Page through `/v3/documents/list` with paginated calls. Filter client-side to `containerTags` array containing `'bay-tribune'`.
  2. For each doc: GET full content, extract `metadata.title` + `metadata.type` (if present) + `containerTags` + `customId` (if present) + `createdAt` + content head (first 200 chars).
  3. Classify by content-shape signature:
     - `bt-edition` — content opens with `THE BAY TRIBUNE` masthead + `Cycle Pulse — Cycle <XX>` line
     - `bt-supplemental` / `bt-dispatch` / `bt-interview-article` / `bt-interview-transcript` — masthead + descriptor matches type
     - `bt-wiki-citizen-*` / `bt-wiki-storyline` / `bt-wiki-continuity` — short single-line records matching the templates in `ingestEditionWiki.js` lines 418–477
     - `bt-roster` / `bt-game-result` / `bt-canon-correction` — `[CANON:<type>:<date>]` wrapper from `/save-to-bay-tribune`
     - `unknown` — escapes all signatures (probably orphan from pre-S180 era, manual saves, or test docs)
  4. Output `output/bay_tribune_inventory.json` with per-classification counts + sample doc IDs (5 per class) + total count + `dual_tagged` count (docs already carrying `['bay-tribune', 'bt-<type>']`) + `customId_present` count.
- **Verify:** total doc count matches manual `npx supermemory tags list` for bay-tribune (or list-walk total); counts sum to total. Apply `--apply` not needed — read-only inventory.
- **Status:** [ ] not started

#### Task 1.2: Decision pass on inventory

- **Files:** this plan file (update — append a "Phase 1 findings" subsection)
- **Steps:**
  1. Read `output/bay_tribune_inventory.json`.
  2. Confirm wipe-policy table per type. Record any surprise classifications (orphan content shapes, prompt-injection-shaped content, content from undocumented writers).
  3. Decide: are existing dual-tagged docs (if any) compatible with the new customId scheme, or do they need re-ingest? If a write predates this plan, it has `containerTags: ['bay-tribune']` (single tag) and no customId — those need re-ingest from source for full hygiene.
- **Verify:** plan changelog entry added with classification counts.
- **Status:** [ ] not started

### Phase 2 — `ingestEdition.js` retrofit (engine-sheet)

#### Task R1: dual-tag + customId on `addDocument()`

- **Files:** `scripts/ingestEdition.js` (modify line 245-285 `addDocument`, line 195-235 chunk-emission loop)
- **Steps:**
  1. Adopt the canonical writer skeleton from `scripts/buildBusinessCards.js` (commit `b24f3ed`): `smRequest` / `writeMemory` (with retry-on-401/429, 8s backoff, 3 retries) / `smSleep`. Replaces current naked `addDocument`.
  2. Compute per-type tag in chunk loop: `bt-edition` / `bt-supplemental` / `bt-dispatch` / `bt-interview-article` / `bt-interview-transcript` based on `--type` flag. Tag pair: `['bay-tribune', 'bt-<type>']`.
  3. Compute per-chunk customId via `deriveCustomId({ type, cycle, slug, part })`. Slug extracted from filename via existing `cycle_pulse_<type>_<cycle>_<slug>.txt` regex (engine-sheet S188 E3 added filename-fallback for `--cycle` extraction; reuse).
  4. Add `customId` field to `/v3/documents` POST payload alongside content/containerTags/metadata.
  5. Inter-write sleep 500ms (W1 hardening pattern).
- **Verify:** `node scripts/ingestEdition.js editions/cycle_pulse_dispatch_92_kono_second_song.txt --type dispatch --cycle 92 --dry-run` prints customId `dispatch-c92-kono_second_song-part-1` + tags `['bay-tribune', 'bt-dispatch']` per chunk. Live apply on the dispatch fixture writes 1 chunk (small body), verify via `curl /v3/documents/customId/dispatch-c92-kono_second_song-part-1` returns the doc.
- **Status:** [ ] not started

#### Task R2: `--wipe-old` flag for replay

- **Files:** `scripts/ingestEdition.js` (modify)
- **Steps:**
  1. Add `--wipe-old` CLI flag. When set, before the write phase: enumerate `/v3/documents/list`, filter to docs whose `customId` starts with the customId-prefix this run will produce (e.g., `dispatch-c92-kono_second_song-`), DELETE each, sleep 30s before write.
  2. Default OFF (keep additive-only as the safe default; opt-in for retrofit / re-ingest passes).
  3. Output report: pre-wipe count, deleted count, post-wipe count, written count.
- **Verify:** `--apply --wipe-old` on the dispatch fixture deletes 0 (clean) on first run, then writes 1; subsequent re-runs delete 1 + write 1 (idempotent replacement). Citizen/business/faith/etc cards in world-data untouched (different container).
- **Status:** [ ] not started

### Phase 3 — `ingestEditionWiki.js` migration (engine-sheet)

#### Task R3: endpoint migration — `/v4/memories` → `/v3/documents`

- **Files:** `scripts/ingestEditionWiki.js` (modify line 550-584 `addMemory()`)
- **Steps:**
  1. Replace `addMemory(content, metadata)` with `writeMemory(content, recordMeta)` matching the wd-rebuild canonical skeleton. New payload shape: `{content, containerTags: ['bay-tribune', '<bt-tag>'], metadata, customId}`.
  2. Compute per-record tag from `metadata.recordType`: `citizen-appearance` / `citizen-returning` / `citizen-new` → `bt-wiki-citizen`; `storyline-transition` → `bt-wiki-storyline`; `continuity` → `bt-wiki-continuity`.
  3. Compute customId via `deriveCustomId({ recordType, cycle, entityId, eventHash })`. POPIDs from existing citizen extraction; storyline slug = lowercased + underscore-joined storyline title (truncated to 40 chars); continuity note hash = first 12 chars of `crypto.createHash('sha256').update(noteContent).digest('hex')`.
  4. `smSleep(500)` between writes; retry-on-401/429 wrap with 8s backoff.
- **Verify:** dry-run on the C92 KONO dispatch fixture prints all wiki records with customIds; live apply writes 2 citizen-appearance records (Marin Tao + Brody Kale) with `bt-wiki-citizen` tag, retrievable by `customId/wiki-citizen-c92-POP-00537` and `customId/wiki-citizen-c92-CUL-905CBDE8`.
- **Status:** [ ] not started — depends on E1+E2 from `[[plans/2026-04-30-dispatch-gap-followups]]` (the parser must extract entities first, then this writer can tag them properly)

#### Task R4: `--wipe-old` flag for wiki replay

- **Files:** `scripts/ingestEditionWiki.js` (modify)
- **Steps:**
  1. Add `--wipe-old` CLI flag. When set, before write phase: derive the customId prefixes this run will produce (per-recordType per-cycle), enumerate, DELETE matching, sleep 30s.
  2. Default OFF.
- **Verify:** Re-running the dispatch wiki ingest with `--wipe-old` deletes prior wiki records cleanly, re-writes fresh ones with same customIds.
- **Status:** [ ] not started

### Phase 4 — Wipe primitive (engine-sheet)

#### Task W1: `scripts/wipeBayTribuneByCustomId.js` (NEW)

- **Files:** `scripts/wipeBayTribuneByCustomId.js` (NEW)
- **Steps:**
  1. CLI: `node scripts/wipeBayTribuneByCustomId.js <prefix>` (dry-run) / `... --apply`. Optional `--container bay-tribune` flag (defaults to bay-tribune; lets the script be reusable for wd-rebuild-style wipes if needed in future).
  2. Enumerate `/v3/documents/list` paginated, filter client-side to `containerTags` containing `bay-tribune` AND `customId` starts with `<prefix>`.
  3. Print matching docs with id + customId + createdAt + content head 80 chars.
  4. On `--apply`: DELETE each, retry-on-401/429/409 with 8s/20s backoffs (carry-forward from R2 retry patches in wd-rebuild). Settle 30s after last delete.
  5. Recount, print summary.
- **Verify:** `node scripts/wipeBayTribuneByCustomId.js dispatch-c92-kono_second_song-` (dry-run) lists the 1 dispatch doc; `--apply` deletes it, recount shows 0; subsequent re-ingest writes 1 fresh.
- **Status:** [ ] not started

### Phase 5 — Skill alignment (research-build)

#### Task R5: `/save-to-bay-tribune` skill body update

- **Files:** `.claude/skills/save-to-bay-tribune/SKILL.md` (modify Step 3)
- **Steps:**
  1. Update Step 3 curl example to show dual-tag payload + customId field.
  2. Add note: "After this rebuild, bay-tribune writes carry both tags. The `bt-<type>` tag enables type-filtered search. The `customId` enables targeted replacement."
  3. Bump version 1.1 → 1.2, updated date 2026-04-30.
- **Verify:** `grep "containerTags" .claude/skills/save-to-bay-tribune/SKILL.md` returns 1+ match showing dual-tag.
- **Status:** [ ] not started — depends on R1 shipping (so the skill matches reality)

### Phase 6 — Migration (engine-sheet, last)

#### Task M1: re-ingest existing bay-tribune from canonical sources

- **Files:** none (run-only task)
- **Steps:**
  1. After R1+R2+R3+R4+W1 ship, run wipe + re-ingest cycle-by-cycle for the 9 most recent cycles (C84-C92) plus the 4 supplementals + 1 dispatch + 1 interview pair from C92.
  2. Per cycle: `node scripts/wipeBayTribuneByCustomId.js <prefix> --apply` for each artifact, then re-ingest.
  3. Verify post-migration: bay-tribune doc count is stable (or down — old un-tagged dupes wiped); 100% of docs carry `bt-<type>` tag and customId.
- **Verify:** spot-check via `curl /v3/documents/customId/edition-c92-part-1` returns the C92 edition Part 1 doc; `npx supermemory search "Marin Tao" --tag bt-dispatch` returns the KONO dispatch (filtered retrieval works).
- **Status:** [ ] not started

### Phase 7 — MCP tool optional filter (engine-sheet)

#### Task M2: `search_canon` accepts type filter

- **Files:** `scripts/godworld-mcp.py` (modify `search_canon` tool)
- **Steps:**
  1. Add optional `type` arg to the existing `search_canon(query, ...)` tool. When set, route the query through `containerTag = 'bt-<type>'` instead of `'bay-tribune'`.
  2. Backward-compatible: bare `search_canon("Marin Tao")` returns everything bay-tribune-tagged (existing behavior); `search_canon("Marin Tao", type="dispatch")` returns only `bt-dispatch` matches.
- **Verify:** MCP `search_canon("KONO First Friday", type="dispatch")` returns the C92 dispatch doc.
- **Status:** [ ] not started

---

## Phase 1 findings

_To be filled by engine-sheet after Task 1.1 + 1.2._

---

## Open questions

- [ ] **Edition body without slug** — current `cycle_pulse_edition_<XX>.txt` filename has no slug component. customId = `edition-c<XX>-part-<N>` is fine but means re-ingesting C92's edition wipes everything `edition-c92-`. That's the intended behavior, but worth noting: there's no per-article-slug granularity at the edition body level, only at supplemental / dispatch / interview level. **Resolution lean:** accept; per-article granularity lives in the wiki layer (`bt-wiki-*`), not the body layer.
- [ ] **Continuity note hash collision** — using `sha256(noteContent).slice(0, 12)` for entity-id when no other ID is available. 12 hex chars = 48 bits = ~280 trillion possibilities. Collision risk negligible at our scale (sub-100 continuity notes per cycle). If a collision ever occurs, the second write would overwrite the first by customId — acceptable.
- [ ] **`bt-wiki-cultural` + `bt-wiki-business` writers** — pre-allocated in tag scheme, no writer in this plan. Should the writers be a follow-up plan, or absorbed into a future ingestEditionWiki extension? **Resolution lean:** follow-up plan, sized similarly to W1-W5 in wd-rebuild. Keep this plan focused on the dual-tag + customId retrofit; cultural/business wiki extraction is a separate-scope build.
- [ ] **Dry-run printing** — should `--dry-run` on R1/R3 emit the proposed customId + tag pair per doc, or just the existing chunk-preview? **Resolution lean:** print both. Customers of this output (post-publish verifier, Mike eyeballing first runs) need both to confirm shape.

---

## Validation fixture

Per writer + per wipe primitive, validate against the C92 KONO dispatch fixture. The dispatch is the smallest end-to-end artifact in the corpus (1 chunk body + 2 citizen-appearance wiki records + 0 storyline-transitions + 0 continuity notes), making it the cheapest dry-run target.

| Writer/primitive | Fixture | Expected post-state |
|---|---|---|
| `ingestEdition.js` (R1) | `editions/cycle_pulse_dispatch_92_kono_second_song.txt --type dispatch --cycle 92` | 1 doc with customId `dispatch-c92-kono_second_song-part-1`, tags `['bay-tribune', 'bt-dispatch']`, content = full dispatch text |
| `ingestEditionWiki.js` (R3) | same source, `--cycle 92` | 2 docs with customIds `wiki-citizen-c92-POP-00537` + `wiki-citizen-c92-CUL-905CBDE8`, tags `['bay-tribune', 'bt-wiki-citizen']` |
| `wipeBayTribuneByCustomId.js` (W1) | `dispatch-c92-kono_second_song-` (dry-run, then `--apply`) | dry-run lists 1 doc; apply deletes it; recount shows 0 docs with that prefix |
| `/save-to-bay-tribune` (R5) | manual save with type=`canon-correction`, slug=`s189-test` | 1 doc with customId `correction-c92-s189-test`, tags `['bay-tribune', 'bt-canon-correction']` |
| Replay round-trip (M1) | wipe + re-ingest the C92 dispatch | bay-tribune doc count for `dispatch-c92-kono_second_song-` is exactly 1 after both steps |

Per writer: dry-run prints customId + tag pair; apply writes; targeted DELETE wipes; re-ingest re-writes with identical customId.

---

## Substrate snapshot (post-rebuild)

_To be filled by engine-sheet after Phase 6 completes. Mirrors the wd-rebuild §"Substrate snapshot at S182 close" pattern._

| Tag | Expected count | Notes |
|---|---|---|
| `bay-tribune` (total) | TBD | Unchanged from pre-rebuild minus orphan-cleanup |
| `bt-edition` | ~9 cycles × 2-3 chunks each | C84-C92 editions, chunked at 40K boundary |
| `bt-supplemental` | ~10-15 | Cumulative across cycles |
| `bt-dispatch` | 1 | C92 KONO Second Song so far |
| `bt-interview-article` | 1 | C92 Mayor Santana on OARI |
| `bt-interview-transcript` | 1 | C92 Mayor Santana transcript |
| `bt-wiki-citizen` | TBD (per-cycle citizen-appearance count) | Migration depends on which historical wiki records were ingested |
| `bt-wiki-storyline` | TBD | Storyline-transition records |
| `bt-wiki-continuity` | TBD | Continuity notes |
| `bt-roster` | TBD | A's roster + Bulls roster |
| Orphans (no `bt-` tag) | 0 (target) | All migrated or wiped in Task M1 |

---

## Phase order + handoff

Engine-sheet executes in this order (each phase produces an artifact research-build can verify):
1. Task 1.1 (inventory script + run) — establishes substrate.
2. Task 1.2 (decision pass — research-build appends findings to this plan). Surprise classifications surface here, plan adjusts before writers ship.
3. Task R1 (`ingestEdition.js` retrofit) — proves the customId + tag-pair pattern on the chunked-body writer.
4. Task R2 (`ingestEdition.js --wipe-old`) — same writer, replay capability.
5. Task R3 (`ingestEditionWiki.js` migration) — port the legacy `/v4/memories` writer to the modern shape.
6. Task R4 (`ingestEditionWiki.js --wipe-old`) — wiki replay capability.
7. Task W1 (`wipeBayTribuneByCustomId.js`) — standalone wipe primitive (decoupled from any specific writer for cross-cutting scrub workflows).
8. Task R5 (research-build — `/save-to-bay-tribune` skill update) — runs after R1 ships so the skill matches reality.
9. Task M1 (migration — bulk re-ingest of C84-C92). Depends on R1+R2+R3+R4+W1.
10. Task M2 (`search_canon` type filter) — final tooling addition once substrate is clean.

Research-build re-engages between steps if specs need revision (esp. after Phase 1 inventory may surface unanticipated content shapes — e.g., manual `/save-to-bay-tribune` saves from before the type catalog stabilized).

---

## Changelog

- 2026-04-30 (S189, research-build) — Initial draft. Mirrors `[[plans/2026-04-27-world-data-unified-ingest-rebuild]]` pattern from S182-S183 (now-complete sibling). Tag scheme covers 14 types across body / wiki / canon-save layers. customId derivation function specified. Wipe primitive scripted as standalone tool. Validation fixture grounded in S188 KONO dispatch (the smallest end-to-end artifact in the corpus). Engine-sheet phase order locked: inventory → ingestEdition retrofit → ingestEditionWiki migration → wipe primitive → migration → MCP filter. Plan motivated by S185-S186 Perkins scrub friction (mags doc `WL8kvoxQgmcvxSPW3Ph47n`) — current chunked storage has no targeted-replacement primitive. After this rebuild, equivalent scrub = `wipeBayTribuneByCustomId <slug-prefix>` + re-ingest.
