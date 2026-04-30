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

**Status (2026-04-30, S189):** ⚠️ **PHASE 2-7 ON HOLD** pending SMFS pilot outcome — see `[[../comparisons/2026-04-30-smfs-vs-bay-tribune-rebuild]]`. Supermemory released SMFS (Supermemory Filesystem) v0.0.1 on 2026-04-29. If the mags-first pilot succeeds, Phase 2-7 collapse to `cp` + directory structure (16-tag taxonomy maps 1:1 to paths; customId-as-slug becomes filename discipline). **Phase 1 inventory + Phase 1.5 disposition map carry forward unchanged regardless of pilot outcome** — the editorial decisions (15 legacy-edition / 2 archive-essay / 1 podcast-transcript / 1 canon-correction / 1 legacy-roster / 2 delete-no-replacement) are surface-agnostic. Engine-sheet does NOT pick up R1 next session unless explicitly directed; pilot precedence.

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
1. Tag taxonomy locked: 16 tags below (14 original + 2 added Task 1.2), each carrying the `bay-tribune` companion tag.
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
| **Archive essay** | `['bay-tribune', 'bt-archive-essay']` | manual ingest from `RICHMOND_ARCHIVE_INDEX` / `P_SLAYER_JOURNEY_INDEX` / `ANTHONY_RAINES_PORTFOLIO_INDEX` (no per-cycle anchor — these are timeless reference pieces) | `archive-<author-slug>-<piece-slug>` |
| **Podcast transcript** | `['bay-tribune', 'bt-podcast-transcript']` | `/podcast` skill output (Person1/Person2 dialogue distinct from `bt-interview-transcript` Q&A shape) | `podcast-c<XX>-<episode-slug>` |

**Why three wiki-citizen recordTypes share `bt-wiki-citizen`:** all three carry the same retrieval shape ("show me everything we know about Beverly Hayes from edition X"). Tag-level grouping lets a `search_canon --type bt-wiki-citizen` query pull all three subtypes; the `recordType` field in metadata still distinguishes them when needed. Storyline + continuity are functionally distinct retrieval surfaces — they get their own tags.

**Why the `bt-` prefix:** matches the wd-rebuild precedent (`wd-citizens`, `wd-business`, etc.). Future top-level container collisions are avoided (a hypothetical future `dispatch` container is unambiguously different from the `bt-dispatch` sub-tag).

**`bt-wiki-cultural` + `bt-wiki-business` are pre-allocated** even though no writer currently produces them. ingestEditionWiki currently only emits citizen / storyline / continuity records; cultural figures (Marin Tao, Brody Kale per S188 KONO dispatch) and businesses (named in body but engine-canon ingested separately) deserve their own wiki layer. Tag pre-allocation prevents future collision. Writer for those is a separate downstream task, not in this plan's scope.

**`bt-archive-essay` + `bt-podcast-transcript` added post-Phase-1** (S189, Task 1.2 finding). The Phase 1 inventory surfaced 20 "unknown" docs the classifier couldn't slot — content-head inspection identified Hal Richmond historical essays ("Letters from the Golden Era", "Danny Horn: The Architecture of Confidence") and Person1/Person2 podcast transcripts ("Cycle Pulse Edition 90 (Full)") as the dominant shapes. These are real canon (Richmond Archive Index, Anthony Raines Portfolio Index, P Slayer Journey Index reference them; reporters cite them in editions) but predate the format contract. Two tags added so they can be dual-tagged + customId'd in the migration without forcing them through a misleading body-type tag.

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
- **Status:** [x] DONE S189 (engine-sheet). Script shipped at `scripts/auditBayTribune.js`, modeled on the `auditWorldData.js` two-pass pattern (S183) — Pass 1 paginates `/v3/documents/list` filtering client-side for `containerTags` array containing `bay-tribune`, Pass 2 GETs each hit at concurrency=5 and classifies by content-shape signature. Run output: `output/bay_tribune_inventory.json`. **Baseline:** 175 bay-tribune docs total / 0 dual-tagged (clean canvas — nothing in the taxonomy yet) / 2 customId present (legacy scratch-start for the customId scheme) / 0 secondary tags observed. Class distribution after classifier refinement (legacy-wiki shapes without `[TYPE:]` prefix, CANON wrapper accepting non-YYYY-MM-DD date slots, metadata.type fallback for chunked editions): bt-wiki-appearance 109, bt-supplemental 10, bt-edition 7, bt-wiki-storyline 7, bt-wiki-returning 6, bt-wiki-continuity 5, bt-wiki-new 5, bt-published-other 2, bt-canon-interview 1, bt-canon-interview-transcript 1, bt-edition-chunk 1 (metadata-fallback caught a Part-2 chunk), bt-dispatch 1, **unknown 20** (real edge cases for Task 1.2 below). 1 multi-class anomaly (a CANON-wrapped interview-transcript matching both signatures — legitimate dual-signal, not a conflict). Smoke test: `node scripts/auditBayTribune.js --max-pages 2 --max-fetch 30` returns 5/5 classified clean before the full enumeration.

#### Task 1.2: Decision pass on inventory

- **Files:** this plan file (update — append a "Phase 1 findings" subsection)
- **Steps:**
  1. Read `output/bay_tribune_inventory.json`.
  2. Confirm wipe-policy table per type. Record any surprise classifications (orphan content shapes, prompt-injection-shaped content, content from undocumented writers).
  3. Decide: are existing dual-tagged docs (if any) compatible with the new customId scheme, or do they need re-ingest? If a write predates this plan, it has `containerTags: ['bay-tribune']` (single tag) and no customId — those need re-ingest from source for full hygiene.
- **Verify:** plan changelog entry added with classification counts.
- **Status:** [x] DONE S189 (research-build). §Phase 1 findings appended below. Tag scheme amended: 2 new tags added (`bt-archive-essay`, `bt-podcast-transcript`) — total 16 tags. Phase 1.5 inserted: engine-sheet enumerates the remaining 15 unknown docs + builds disposition map per doc before retrofit batch fires. customId-reach forecast: 99% of substrate (173/175) needs re-ingest from canonical source to pick up the customId scheme; 2 docs already carry customId from `/save-to-bay-tribune` archive saves.

### Phase 1.5 — Unknown disposition (engine-sheet)

#### Task 1.5: Enumerate the 20 unknown + 2 published-other docs, build disposition map

- **Files:**
  - `scripts/auditBayTribuneUnknowns.js` (NEW, optional — could also be a one-off bash + jq invocation)
  - this plan file (update — append a "Disposition map" subsection under §Phase 1 findings)
- **Steps:**
  1. The Phase 1 inventory sampled 5 of 20 unknown docs + 2 of 2 published-other docs. Engine-sheet enumerates the **remaining 15 unknown docs** by paginating `/v3/documents/list`, filtering for the unknown-class IDs from `output/bay_tribune_inventory.json`, GET each, capture title + content-head + customId.
  2. For each unknown doc, classify into one of **six disposition buckets** (apply per-doc judgment, not regex):
     - `archive-essay` — Hal Richmond / P Slayer / Anthony Raines historical pieces (byline + long-form prose). Tag: `bt-archive-essay`. customId: `archive-<author-slug>-<piece-slug>`.
     - `podcast-transcript` — Person1/Person2 dialogue shape. Tag: `bt-podcast-transcript`. customId: `podcast-c<XX>-<episode-slug>`.
     - `legacy-edition` — pre-format-contract editions (month-named masthead, no Y<n>C<m> anchor — like the 2 `bt-published-other` Edition 85 + Edition 89 docs). Tag: `bt-edition`. customId: `edition-c<XX>-part-<N>`. Migration path: re-ingest from canonical source if .txt exists; if no .txt exists (pre-format-contract), DELETE-and-re-write with the new tag + customId on the existing content.
     - `canon-correction` — out-of-band canon notes (like "Edition 91 Canon Notes"). Tag: `bt-canon-correction`. customId: `correction-c<XX>-<slug>`.
     - **`legacy-roster`** — A's roster doc + future Bulls roster docs. Existing canonical tag `bt-roster` already in §Tag scheme. Tag: `bt-roster`. customId: `roster-as-of-c<XX>-<team>` (cycle anchor derived from doc's "Generated:" date — engine-sheet annotates the disposition row with the resolved cycle). Migration path: **re-tag in place** (no canonical .txt source for rosters; the doc IS the source). Added Task 1.2 follow-up after engine-sheet flagged the A's roster as not fitting the original 4 buckets.
     - `delete-no-replacement` — junk / test / orphan content with no canonical source. DELETE in M1. **Includes fourth-wall contamination:** any doc revealing the simulation is a simulation per `/save-to-bay-tribune` SKILL.md "Do NOT use for: anything that reveals the simulation is a simulation. Those go to `mags` via `/save-to-mags`." Such docs are hard-DELETE in M1; the rule text itself stays in `MEMORY.md` (see `project_simulation-is-oakland-framing`) + `docs/canon/CANON_RULES.md` as canonical guidance, NOT in bay-tribune.
  3. Append the disposition map to §Phase 1 findings as a per-doc table: `id | current-class | disposition | new-tag | new-customId | source-path-or-DELETE`.
  4. Engine-sheet flags any doc that doesn't fit one of the 6 buckets back to research-build for tag-scheme amendment.
- **Verify:** disposition map has one row per doc for all 20 unknown + 2 published-other = 22 docs. Sum of buckets = 22.
- **Status:** [x] DONE S189 (engine-sheet — Task 1.5 disposition pass; research-build — Task 1.5 step 2 amended to 6 buckets per engine-sheet flag-back). Helper script shipped at `scripts/auditBayTribuneUnknowns.js` (read-only, full-content GET pass over the same 175-doc bay-tribune corpus, filters to `unknown` + `bt-published-other`, captures up to 8KB content head per doc). Output: `output/bay_tribune_unknowns.json` (gitignored). Per-doc disposition map appended to §Phase 1 findings as "Phase 1.5 per-doc disposition map" subsection — 22 rows, sum = 22 ✓. Final bucket totals: **15 legacy-edition + 2 archive-essay + 1 podcast-transcript + 1 canon-correction + 1 legacy-roster + 2 delete-no-replacement = 22**. Source existence verified for all 15 legacy-edition rows: `editions/cycle_pulse_edition_<83..91>.txt` all present locally — every M1 re-ingest path is live. **Research-build resolutions (this session):** (1) `legacy-roster` accepted as 6th canonical bucket — A's roster doc (`goTKuE7oj8mcWVZMEqBXaX`) re-tags in place to existing `bt-roster` taxonomy slot; no scheme expansion needed beyond Task 1.5 step 2 enumeration. (2) Contamination doc `3cVPsFy7BkzjPDhapyFYmf` ("Clarification: GodWorld Oakland is a Fictional Prosperous City") confirmed for hard-DELETE in M1 — explicit fourth-wall content prohibited by `/save-to-bay-tribune` SKILL.md; the rule text reference value already lives in `MEMORY.md` `project_simulation-is-oakland-framing` and `docs/canon/CANON_RULES.md`, not in bay-tribune. R1 unblocked.

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

**Source:** `output/bay_tribune_inventory.json` (engine-sheet Task 1.1, commit `f47d412`, audited 2026-04-30T21:06Z). Two-pass enumeration (list-walk + GET-classify, concurrency=5), 175/175 fetched, 0 fetch failures, classSum verified.

**Scope:** bay-tribune holds **175 docs** total — ~10% the size of world-data's 1,609 pre-S183. Substrate is small enough that the retrofit migration is a single bulk pass, not a per-cycle phased rollout.

| Property | Value | Notes |
|---|---|---|
| Total bay-tribune docs | **175** | Out of 1,844 org-wide |
| Dual-tagged today | **0** | Full 100% retrofit reach — no doc carries `bt-<type>` yet |
| customId present today | **2** | Only `/save-to-bay-tribune` archive saves carry it. Script-driven ingest = 0 customIds. **99% of docs need re-ingest from canonical source to receive customId.** |
| Oldest doc | 2026-03-22 | Earliest archive ingest |
| Newest doc | 2026-04-30 | Today's E1 commit's wiki record landing |

**Class distribution (engine-sheet classifier baseline):**

| Class (current shape) | Count | Maps to (post-rebuild canonical tag) |
|---|---|---|
| `bt-wiki-appearance` | 109 | `bt-wiki-citizen` (per-citizen-per-edition appearance — dominant 62%) |
| `unknown` | 20 | mixed — disposition map in Phase 1.5 |
| `bt-supplemental` | 10 | `bt-supplemental` ✓ |
| `bt-edition` | 7 | `bt-edition` ✓ |
| `bt-wiki-storyline` | 7 | `bt-wiki-storyline` ✓ |
| `bt-wiki-returning` | 6 | `bt-wiki-citizen` (recordType=citizen-returning subtype) |
| `bt-wiki-continuity` | 5 | `bt-wiki-continuity` ✓ |
| `bt-wiki-new` | 5 | `bt-wiki-citizen` (recordType=citizen-new subtype) |
| `bt-published-other` | 2 | `bt-edition` (legacy editions: "Cycle Pulse Edition 85 / 89 Part 1" — pre-format-contract, month-named masthead) |
| `bt-dispatch` | 1 | `bt-dispatch` ✓ — KONO Second Song |
| `bt-edition-chunk` | 1 | `bt-edition` (Part 2 chunk caught by metadata-fallback) |
| `bt-canon-interview-transcript` | 1 | `bt-interview-transcript` ✓ — Santana C92 |
| `bt-canon-interview` | 1 | `bt-interview-article` ✓ — Santana C92 |

**Three subtype consolidations under `bt-wiki-citizen`** (plan §Tag scheme already specifies this; no scheme change): the classifier-emitted `bt-wiki-appearance` (109) + `bt-wiki-returning` (6) + `bt-wiki-new` (5) = 120 docs all collapse to `bt-wiki-citizen` on retrofit, with the existing `recordType` metadata field discriminating subtypes when needed. Tag-level grouping enables single-query retrieval ("everything we know about Beverly Hayes from C92") without semantic loss.

**Surprise classifications** (engine-sheet introduced 4 buckets the plan didn't pre-spec):
- `bt-edition-chunk` — distinguishes Part 2 chunks from lead chunks via metadata-fallback. Re-ingest collapses to single `bt-edition` tag with `-part-N` customId.
- `bt-canon-interview` + `bt-canon-interview-transcript` — `[CANON:interview-article:...]` wrapper from `/save-to-bay-tribune` matched a different signature than `ingestEdition.js` output. Re-ingest to canonical `bt-interview-article` / `bt-interview-transcript` tags.
- `bt-published-other` — fallback bucket caught 2 pre-format-contract editions (Edition 85 + Edition 89 with month-named masthead). Migration path: re-ingest under `bt-edition` if canonical source `.txt` exists; otherwise re-tag in place.

**20 unknown docs — sample inspection (5 of 20):**

| ID | customId | Title | Content shape |
|---|---|---|---|
| `w2ELDNKn5DmF2qwQadfBZN` | `Q4gvw5j5AMJBM4YZF3cJ2Z` | Letters from the Golden Era... | Hal Richmond byline, long-form prose ("# Letters... By Hal Richmond \| Bay Tribune \| Spring 2040") — **archive essay** |
| `KiAC9PRSoQS6uLXJkNm8jf` | `7S56FvHs983fJeyBq338Zi` | Danny Horn: The Architecture of Confidence | Hal Richmond byline, profile prose — **archive essay** |
| `Fe5UBtnbJRVKRjeYqLo3v1` | null | Edition 91 Canon Notes: NBA Expansion... | "Edition 91 Canon Notes. NBA Expansion arc launched..." — **canon correction** (matches `bt-canon-correction` shape; classifier missed it) |
| `YyCEb8QoTtn3hYHbjEuWYj` | null | Cycle Pulse Edition 91 (Part 2) | Storyline table chunk — **legacy edition** (Part 2 of E91 missed by chunked-edition classifier) |
| `wBqjpuByrJddqYrricu1Rt` | null | Cycle Pulse Edition 90 (Full) | `<Person1>...<Person2>...` dialogue — **podcast transcript** |

**Tag scheme amendment (this Task 1.2 deliverable):**

Two new tags added to handle dominant unknown content shapes — see updated §Tag scheme table:

- **`bt-archive-essay`** — Hal Richmond / P Slayer / Anthony Raines historical pieces. Real canon, predates format contract, cited by reporters via Richmond Archive Index + P Slayer Journey Index + Anthony Raines Portfolio Index. customId pattern: `archive-<author-slug>-<piece-slug>` (no cycle anchor — these are timeless reference pieces).
- **`bt-podcast-transcript`** — Person1/Person2 podcast dialogue from `/podcast` skill output. Distinct from `bt-interview-transcript` (different conversational format, different production path). customId pattern: `podcast-c<XX>-<episode-slug>`.

**Disposition map** (final after Phase 1.5 — engine-sheet enumerated all 22 unknown + published-other docs; counts exact):

| Disposition bucket | Count | New tag | Migration path |
|---|---|---|---|
| legacy-edition | **15** | `bt-edition` | re-ingest from `editions/cycle_pulse_edition_<83..91>.txt` (engine-sheet verified all 15 sources exist locally) |
| archive-essay | **2** | `bt-archive-essay` | re-tag in place — these are `/save-to-bay-tribune` archive saves (Hal Richmond pieces) with no cycle-bound canonical source; customId derived from author + piece slug |
| podcast-transcript | **1** | `bt-podcast-transcript` | re-ingest from `output/podcasts/` if file exists; otherwise re-tag in place |
| canon-correction | **1** | `bt-canon-correction` | re-tag in place (canon notes are the source) |
| **legacy-roster** | **1** | `bt-roster` | A's roster doc — re-tag in place using existing canonical `bt-roster` slot (added Task 1.5 step 2 as 5th retain-bucket per engine-sheet flag-back) |
| delete-no-replacement | **2** | — | DELETE in M1 — includes 1 fourth-wall contamination doc (`3cVPsFy7BkzjPDhapyFYmf` — see contamination note below) |
| **Total** | **22** | | sum check ✓ |

**Migration scope** (final after Phase 1.5):
- **~168 docs → retrofit-by-re-ingest** from canonical sources (109 wiki-appearance + 6 wiki-returning + 5 wiki-new + 7 wiki-storyline + 5 wiki-continuity + 10 supplemental + 7 bt-edition + 1 dispatch + 1 canon-interview + 1 canon-interview-transcript + 1 edition-chunk + 15 legacy-edition + 1 podcast-transcript-if-file-exists)
- **~5 docs → re-tag in place** (2 archive-essay + 1 canon-correction + 1 legacy-roster + 1 podcast-transcript-if-no-file). No canonical .txt source; existing content stays, dual-tag + customId added via direct `/v3/documents/{id}` PATCH (or DELETE-and-re-write preserving content).
- **2 docs → DELETE-without-replacement** in M1: 1 confirmed fourth-wall contamination + 1 other delete-no-replacement candidate per engine-sheet's per-doc table.
- **Total: 175 ✓**

**Fourth-wall contamination note (S189 Task 1.2 follow-up):** doc `3cVPsFy7BkzjPDhapyFYmf` ("Clarification: GodWorld Oakland is a Fictional Prosperous City, Not Real-World Oakland") is meta-rule content explicitly prohibited by `/save-to-bay-tribune` SKILL.md ("Do NOT use for: anything that reveals the simulation is a simulation. Those go to `mags` via `/save-to-mags`."). Hard DELETE in M1; the rule text already lives in canonical homes (`MEMORY.md` `project_simulation-is-oakland-framing` + `docs/canon/CANON_RULES.md`) and does not need a bay-tribune presence. Future similar-shape saves route to `/save-to-mags`, not `/save-to-bay-tribune`.

**Acceptance-criteria #7 status:** Phase 1 inventory complete + Phase 1.5 disposition map complete. Total = 175. Type-shape distribution = 13 classes. Orphan count = 0 (all 20 unknown + 2 published-other resolved across 6 buckets).

**No re-ingest of dual-tagged docs needed** — there are zero dual-tagged docs today (acceptance-criteria #7 sub-point about pre-existing dual-tag compatibility resolves trivially). Every script-driven write goes from `['bay-tribune']` (single) to `['bay-tribune', 'bt-<type>']` (dual) on retrofit. The 2 customId-bearing docs are both `/save-to-bay-tribune` archive saves with random IDs, not the deterministic scheme — they get re-tagged in place but their existing customIds stay (or get migrated to the deterministic pattern if their content head provides enough info to derive — Phase 1.5 decides).

---

### Phase 1.5 per-doc disposition map (engine-sheet, Task 1.5 deliverable)

**Source:** `output/bay_tribune_unknowns.json` (engine-sheet, 2026-04-30, full-content GET pass via `scripts/auditBayTribuneUnknowns.js`). 22 docs captured: 20 unknown + 2 published-other.

**Disposition counts (final, locked):**

| Bucket | Count | Tag | Notes |
|---|---|---|---|
| `legacy-edition` | 15 | `bt-edition` | 13 unknowns + 2 published-other; all chunked-edition body content where Part 2/Part 3 lost the masthead. M1 re-ingest from canonical `editions/cycle_pulse_edition_<XX>.txt` collapses them under `edition-c<XX>-part-<N>` discriminators. |
| `archive-essay` | 2 | `bt-archive-essay` | Hal Richmond historical pieces — re-tag in place, no source-file cleanup needed. |
| `podcast-transcript` | 1 | `bt-podcast-transcript` | Mis-titled as "Cycle Pulse Edition 90 (Full)" but content is `<Person1>/<Person2>` dialogue. M1 re-ingest from `output/podcasts/` if file exists; otherwise re-tag + correct title in place. |
| `canon-correction` | 1 | `bt-canon-correction` | "Edition 91 Canon Notes: NBA Expansion..." — re-tag in place, no source. |
| `delete-no-replacement` | 2 | — | 1 fourth-wall contamination + 1 empty stub. **Both DELETE in M1** without replacement. |
| `legacy-roster` (FLAGGED) | 1 | `bt-roster` | A's roster doc — taxonomy already has `bt-roster` slot, but Task 1.5's bucket list didn't enumerate `legacy-roster` as a disposition. Engine-sheet flags back to research-build for explicit bucket addition; suggested customId `roster-as-of-c<XX>` per existing canonical scheme. **Sum still 22 with this row counted.** |

**22 = 15 + 2 + 1 + 1 + 2 + 1 ✓**

**Per-doc table:**

| ID | Current class | Disposition | New tag | New customId | Migration path |
|---|---|---|---|---|---|
| `Ssa8cuBKSkpexmcaqGrwTQ` | bt-published-other | legacy-edition | `bt-edition` | `edition-c89-part-1` | M1 re-ingest from `editions/cycle_pulse_edition_89.txt` |
| `8HWBJuMQG5pppe7UAPDi9r` | bt-published-other | legacy-edition | `bt-edition` | `edition-c85-part-1` | M1 re-ingest from `editions/cycle_pulse_edition_85.txt` |
| `MCngoaXpU6PhQheGL8dLYt` | unknown | legacy-edition | `bt-edition` | `edition-c89-part-2` | M1 re-ingest from `editions/cycle_pulse_edition_89.txt` |
| `KXFHtJiXoJYFCmxZGPBKKx` | unknown | legacy-edition | `bt-edition` | `edition-c88-part-2` | M1 re-ingest from `editions/cycle_pulse_edition_88.txt` |
| `mLj8Jkz35EhirScusSyJta` | unknown | legacy-edition | `bt-edition` | `edition-c90-part-2` | M1 re-ingest from `editions/cycle_pulse_edition_90.txt` |
| `ka951ZLmJiUcTJmozcNWSu` | unknown | legacy-edition | `bt-edition` | `edition-c83-part-2` | M1 re-ingest from `editions/cycle_pulse_edition_83.txt` |
| `UWk16J6Qrr8nuir7QVoSUz` | unknown | legacy-edition | `bt-edition` | `edition-c83-part-3` | M1 re-ingest from `editions/cycle_pulse_edition_83.txt` |
| `RarzMBLu7JyBtdMmnMTCHU` | unknown | legacy-edition | `bt-edition` | `edition-c84-part-2` | M1 re-ingest from `editions/cycle_pulse_edition_84.txt` |
| `FV31L88RMyGwXevHm9SJF1` | unknown | legacy-edition | `bt-edition` | `edition-c84-part-3` | M1 re-ingest from `editions/cycle_pulse_edition_84.txt` |
| `PsEKuvyxB3Tg9VAutU4Vk2` | unknown | legacy-edition | `bt-edition` | `edition-c85-part-2` | M1 re-ingest from `editions/cycle_pulse_edition_85.txt` |
| `5yhqUAXRQMHp1bMjYTpWyk` | unknown | legacy-edition | `bt-edition` | `edition-c85-part-3` | M1 re-ingest from `editions/cycle_pulse_edition_85.txt` |
| `hXJZniHkoggHmXXiZ1emue` | unknown | legacy-edition | `bt-edition` | `edition-c86-part-2` | M1 re-ingest from `editions/cycle_pulse_edition_86.txt` |
| `1gckAh1Bkb9Fw52D7cfqHU` | unknown | legacy-edition | `bt-edition` | `edition-c86-part-3` | M1 re-ingest from `editions/cycle_pulse_edition_86.txt` |
| `6P7tEvnJ34ZdFmnsGx4Eur` | unknown | legacy-edition | `bt-edition` | `edition-c87-part-2` | M1 re-ingest from `editions/cycle_pulse_edition_87.txt` |
| `YyCEb8QoTtn3hYHbjEuWYj` | unknown | legacy-edition | `bt-edition` | `edition-c91-part-2` | M1 re-ingest from `editions/cycle_pulse_edition_91.txt` |
| `wBqjpuByrJddqYrricu1Rt` | unknown | podcast-transcript | `bt-podcast-transcript` | `podcast-c90` | M1 re-source from `output/podcasts/` if file exists; else re-tag + correct title in place. **Note:** doc title says "Cycle Pulse Edition 90 (Full)" but body is `<Person1>/<Person2>` dialogue — title is wrong. |
| `w2ELDNKn5DmF2qwQadfBZN` | unknown | archive-essay | `bt-archive-essay` | `archive-hal-richmond-letters-from-the-golden-era-part-1` | re-tag in place; no source rewrite |
| `KiAC9PRSoQS6uLXJkNm8jf` | unknown | archive-essay | `bt-archive-essay` | `archive-hal-richmond-danny-horn-architecture-of-confidence` | re-tag in place; no source rewrite |
| `Fe5UBtnbJRVKRjeYqLo3v1` | unknown | canon-correction | `bt-canon-correction` | `correction-c91-nba-expansion-municipal-policy-updates` | re-tag in place; no source rewrite |
| `rejQse7n5QxDTxa7nbgNg7` | unknown | delete-no-replacement | — | — | **DELETE** in M1. 1-line stub: "Bay Tribune Archive — Oakland journalism canon." No actual content. |
| `3cVPsFy7BkzjPDhapyFYmf` | unknown | delete-no-replacement | — | — | **DELETE** in M1. Title "Clarification: GodWorld Oakland is a Fictional Prosperous City, Not Real-World Oakland". Content is a meta-rule about the simulation being fictional — explicit fourth-wall contamination per `/save-to-bay-tribune` SKILL.md "Do NOT use for: anything that reveals the simulation is a simulation." Should never have been written here. Hard remove. |
| `goTKuE7oj8mcWVZMEqBXaX` | unknown | **legacy-roster** ⚠️ | `bt-roster` | `roster-as-of-c<XX>` (XX TBD — content shows "Generated: 2026-03-20"; cycle anchor needs research-build call) | **FLAGGED:** doesn't fit Task 1.5's 4 enumerated buckets. Existing taxonomy at line ~70 has `bt-roster` slot already. Recommend research-build amend Task 1.5 with 5th bucket `legacy-roster` (or 6th counting `delete-no-replacement`). Re-tag in place; cycle anchor for customId pending. |

**Engine-sheet flag for research-build:**

The single A's roster doc (`goTKuE7oj8mcWVZMEqBXaX`) doesn't fit the 4 buckets enumerated in Task 1.5 step 2. The plan's §Tag scheme already includes `bt-roster` as a canonical tag with `roster-as-of-c<XX>` customId pattern, so no taxonomy expansion needed — only a Task 1.5 bucket-list amendment to recognize `legacy-roster` as the 5th valid disposition (workflow: re-tag in place + assign customId from "Generated: <date>" → cycle anchor). Engine-sheet held the doc's row above with disposition `legacy-roster` and the `bt-roster` tag from the canonical taxonomy, awaiting research-build sign-off.

**Source-existence verification:** Spot-check confirmed `editions/cycle_pulse_edition_83.txt` through `editions/cycle_pulse_edition_92.txt` all exist locally — every legacy-edition row has a re-ingest source available. No "if .txt exists" fallback path needed for the 15 legacy-edition docs.

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
1. Task 1.1 (inventory script + run) — establishes substrate. **DONE S189** (commit `f47d412`).
2. Task 1.2 (decision pass — research-build appends findings to this plan). Surprise classifications surface here, plan adjusts before writers ship. **DONE S189** (research-build, this section). 2 new tags added (`bt-archive-essay`, `bt-podcast-transcript`); Phase 1.5 inserted.
2.5. Task 1.5 (engine-sheet — disposition map for the remaining 15 unknown docs). Closes the 22-doc edge case set (20 unknown + 2 published-other) before retrofit batch fires. Output: per-doc disposition map appended to §Phase 1 findings.
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
- 2026-04-30 (S189, research-build, late) — Task 1.2 decision pass shipped. Phase 1 findings appended (175 docs / 0 dual-tagged / 2 customIds / 13 classifier buckets, 109 wiki-appearance dominant + 20 unknown edge cases). **Tag scheme amended: 14 → 16 tags** with 2 additions (`bt-archive-essay` for Hal Richmond / P Slayer / Anthony Raines historical pieces; `bt-podcast-transcript` for Person1/Person2 dialogue from `/podcast` skill output — distinct from `bt-interview-transcript` Q&A shape). Phase 1.5 inserted between Phase 1 and Phase 2: engine-sheet enumerates the remaining 15 unknown docs + 2 published-other (sample identified Hal Richmond essays, canon notes, legacy editions, podcast transcripts) and builds per-doc disposition map under 4 buckets (archive-essay / podcast-transcript / legacy-edition / canon-correction / delete-no-replacement) before retrofit batch fires. Acceptance-criteria #7 closes (Phase 1 inventory complete + orphan count = 20 unknown deferred to Phase 1.5). Migration scope revised: 155 retrofit-by-re-ingest + 20 manual disposition + 0 DELETE-without-replacement (target).
- 2026-04-30 (S189, research-build, end-of-session) — Task 1.5 amendments per engine-sheet flag-back (commit `4b0357f`). **Bucket list expanded 4 → 6 retain-buckets:** `legacy-roster` accepted as 5th canonical bucket (A's roster doc maps to existing `bt-roster` taxonomy slot — re-tag in place, no scheme expansion); `delete-no-replacement` already documented as 6th. Task 1.5 step 2 now enumerates all 6 explicitly. **Fourth-wall contamination disposition locked:** doc `3cVPsFy7BkzjPDhapyFYmf` ("Clarification: GodWorld Oakland is a Fictional Prosperous City") confirmed for hard-DELETE in M1 — explicit `/save-to-bay-tribune` SKILL.md rule violation; rule text already lives in canonical homes (MEMORY.md + CANON_RULES.md) and doesn't need bay-tribune presence. **Final disposition counts (sum 22):** 15 legacy-edition + 2 archive-essay + 1 podcast-transcript + 1 canon-correction + 1 legacy-roster + 2 delete-no-replacement. Migration scope updated: ~168 retrofit-by-re-ingest + ~5 re-tag-in-place + 2 DELETE-without-replacement = 175 ✓. **R1 unblocked** — taxonomy locked at 16 tags, disposition locked for all 175 docs, source paths verified live for all retrofit-by-re-ingest rows. Engine-sheet's `ingestEdition.js` retrofit can ship next session.
- 2026-04-30 (S189, research-build, post-end-of-session) — ⚠️ **Plan placed on HOLD same day.** Supermemory team emailed Mike announcing SMFS v0.0.1 (Supermemory Filesystem, released 2026-04-29) — POSIX-compliant filesystem layer over existing Supermemory containers via FUSE/NFSv3 + local SQLite cache + 30s sync. Marketing claims 83% fewer tokens / 64% fewer tool calls in Claude+Codex tests. If SMFS works at our scale, Phase 2-7 of this plan collapse to file ops: `cp file.txt /smfs/bay-tribune/dispatch/c92/kono.txt`, `rm` for wipe, semantic `grep` for type-filtered search. The 16-tag taxonomy maps 1:1 to directory structure; customId-as-slug becomes filename discipline. Phase 1 + 1.5 work carries forward — editorial decisions (taxonomy + disposition map) are surface-agnostic. Eval doc + mags-first pilot proposal at `[[../comparisons/2026-04-30-smfs-vs-bay-tribune-rebuild]]`. Pilot precedence over R1 next session.
