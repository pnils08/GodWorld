---
title: World-Data Unified Ingest Rebuild
created: 2026-04-27
updated: 2026-04-28
type: plan
tags: [architecture, infrastructure, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §Data & Pipeline ("PROJECT: world-data unified ingest rebuild" — line 89)
  - Supermemory mags doc tteVpQCh95zr2ZWofpe5cY (S181 narrative + decision rationale)
  - docs/SUPERMEMORY.md §How to search + §Aggregate Memories + §API Quick Reference
  - scripts/buildCitizenCards.js (post-S181 — canonical writer pattern)
  - scripts/godworld-mcp.py (current MCP query surfaces)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout, §Data & Pipeline"
  - "[[SCHEMA]] — doc conventions"
  - "[[SUPERMEMORY]] — container model + API quirks (singular vs plural tag fields, async indexing)"
  - "[[engine/ENGINE_REPAIR]] — Row 2 (closed S181) is the citizen-layer prequel"
  - "[[index]] — register in same commit"
---

# World-Data Unified Ingest Rebuild

**Goal:** Spec per-domain card shapes, container-tag scheme, ingest triggers, wipe policies, and MCP query surfaces so engine-sheet builds writers and lookup tools without inventing structure.

**Architecture:** Each domain writer writes to world-data with `containerTags: ['world-data', 'wd-<domain>']`. The domain tag is both the per-domain query primitive (filtered MCP retrieval — `lookup_business` queries `wd-business`, returns only business cards) and the wipe primitive (enumerate-by-tag → DELETE-by-doc-id). Card shapes follow `buildCitizenCards.js` post-S181: human-name header (the search hook — IDs do not retrieve semantically), neighborhood as primary filter dimension, conditional render so empty fields stay clean, bay-tribune appearances embedded inline so `aggregate: true` synthesizes a coherent record at retrieval. Existing `world-data` queries continue to work because every card retains the `world-data` tag; new domain-filtered queries become possible because the second tag exists.

**Terminal:** research-build (this plan + spec + verifications); engine-sheet (writers + retrofits + MCP tool additions).

**Pointers:**
- Prior work: `scripts/buildCitizenCards.js` post-S181 — canonical writer pattern (full-name post-filter, conditional render, 300ms rate limit, hybrid search of bay-tribune for appearances).
- S181 reasoning + dry-run classification: Supermemory mags doc `tteVpQCh95zr2ZWofpe5cY`. Retrieve via `curl -s "https://api.supermemory.ai/v3/documents/tteVpQCh95zr2ZWofpe5cY" -H "Authorization: Bearer $SUPERMEMORY_CC_API_KEY"`.
- Tag-and-search verification: probe doc `XQseCdoQpsb6SZCUM6i12o` (S182 plan-prep, since deleted). POST `/v3/documents` with `containerTags: ['world-data', 'wd-test-probe-s182']` → `/v4/search containerTag: 'wd-test-probe-s182'` returned the doc (similarity 0.79). Same write also retrievable via `containerTag: 'world-data'`. DELETE returned 204 after indexing settled (~15-30s). Initial DELETE returned 409 because POST returned `status: queued`.
- API surface: writes use `/v3/documents` (`containerTags` plural array). Search uses `/v4/search` (`containerTag` singular). Reference: SUPERMEMORY.md §API Quick Reference.

**Acceptance criteria:**
1. Six domain card shape specs locked in this file (one per: business, faith, cultural, neighborhood, initiative; citizens already proven post-S181, retrofit spec only).
2. Container-tag taxonomy locked: `wd-citizens`, `wd-business`, `wd-faith`, `wd-cultural`, `wd-neighborhood`, `wd-initiative`, `wd-player-truesource`. Every card writes `['world-data', 'wd-<domain>']`.
3. Wipe policy decided per domain (citizens: write-new-and-DELETE-old, per Mike S182 call; player_truesource: re-run + DELETE old; five new domains: green-field).
4. Trigger cadence per domain (post-cycle / post-publish / on-demand) with explicit hook identified.
5. MCP query-surface map: which tool queries which tag.
6. Engine-sheet has executable task specs for 5 new writers + 2 retrofits + 4 MCP tool additions.

---

## Tag scheme (canonical)

| Domain | Tag pair on every memory | Source data |
|---|---|---|
| Citizens | `['world-data', 'wd-citizens']` | Simulation_Ledger |
| Businesses | `['world-data', 'wd-business']` | Business_Ledger |
| Faith orgs | `['world-data', 'wd-faith']` | Faith_Organizations + recent Faith_Ledger entries |
| Cultural figures | `['world-data', 'wd-cultural']` | Cultural_Ledger |
| Neighborhoods | `['world-data', 'wd-neighborhood']` | Neighborhood_Map + Neighborhood_Demographics |
| Initiatives | `['world-data', 'wd-initiative']` | Initiative_Tracker (current state only — see Open Questions) |
| Player truesource | `['world-data', 'wd-player-truesource']` | Drive `MLB_Roster_Data_Cards/` |

**Why `wd-` prefix:** prevents collision with future top-level container names (e.g., a future `business` container that's not the same as the world-data business sub-tag). Bare-name tags would create implicit containers indistinguishable from intentional ones.

---

## Card shape specs

### wd-citizens (existing — proven post-S181, retrofit only)

```
Beverly Hayes (POP-00583)
Neighborhood: West Oakland | Role: Stylist | Tier: 2 | Birth: 1985 | Gender: F
Employer: BIZ-00021
Usage: 3 mentions
Traits: bold, articulate
Bio: ...

APPEARANCES:
- <bay-tribune hits, full-name post-filtered>
```

Source: `scripts/buildCitizenCards.js`. Conditional render for Employer / Usage / Traits / Bio / Appearances. Header always present.

**Retrofit deltas (Task R1):**
- Switch write call from `/v4/memories` (current) to `/v3/documents` (verified multi-tag-capable).
- `containerTag: 'world-data'` → `containerTags: ['world-data', 'wd-citizens']`.
- DELETE-old pass before write (per Mike S182 — "rather than tie old cards I believe the plan is to add new delete old").

### wd-business

```
Joaquin's Bakery (BIZ-00035)
Neighborhood: Temescal | Sector: Food & Bev | Founded: 2018 | Employees: 12
Owner: Joaquin Diaz (POP-00xxx)
Notable workers: Darius Clark (POP-00xxx), Maria Vega (POP-00xxx)

APPEARANCES:
- <bay-tribune hits, full-name post-filtered on business name>
```

Source: Business_Ledger (cols A–I). Conditional render: hide Owner if blank, hide Notable workers if zero, hide APPEARANCES if zero hits. Full-name post-filter on bay-tribune hybrid search results (same pattern as buildCitizenCards.js post-S181 — generic words like "Bakery" pollute hybrid hits).

### wd-faith

```
Masjid Al-Islam (FAITH-00X)
Neighborhood: West Oakland | Tradition: Islamic | Leader: Imam Khaled Hassan | Congregation: ~250

RECENT ACTIVITY (last 2 cycles):
- C91: Friday community iftar, ~180 attendees
- C90: Open house for neighborhood interfaith council

APPEARANCES:
- <bay-tribune hits>
```

Source: Faith_Organizations (current state) + Faith_Ledger (recent activity, last 2 cycles, matches S180 buildFaithDigest filter pattern). Full-name post-filter on appearances.

### wd-cultural

```
Beverly Hayes (POP-00583)
Neighborhood: West Oakland | Domain: Music | Fame tier: 2 | Active since: 2032
Notable works: ...

APPEARANCES:
- <bay-tribune hits>
```

Source: Cultural_Ledger (40 rows). **Note:** cultural figures often also have Simulation_Ledger rows (Beverly Hayes is both citizen AND cultural figure). The wd-cultural tag is additive — the same POPID can appear in BOTH `wd-citizens` and `wd-cultural` cards. `lookup_citizen` finds the citizen card via `wd-citizens`; `lookup_cultural` finds the fame/domain card via `wd-cultural`. Two cards, two retrieval surfaces, same person.

### wd-neighborhood

```
Temescal
District: D3 | Phase: gentrifying | Population: ~14k | Median income: $87k | Median rent: $2,800
Sentiment: 0.62 | Crime index: 22 | Displacement pressure: high

NOTABLE BUSINESSES:
- Joaquin's Bakery (BIZ-00035), Telegraph Beans (BIZ-00xxx), ...

NOTABLE CITIZENS:
- Beverly Hayes (POP-00583, stylist), ...

APPEARANCES:
- <bay-tribune neighborhood mentions>
```

Source: Neighborhood_Map (17 rows) + Neighborhood_Demographics. NOTABLE BUSINESSES + NOTABLE CITIZENS computed at write time: top-N by usage count or fame tier (cap at 5 each so the card stays under content limit).

### wd-initiative

```
Stabilization Fund (INIT-001)
Phase: pilot_evaluation | In phase: 14 cycles | Lead: OEWD/Marcus Webb
Neighborhoods: Fruitvale, West Oakland | Vote target: C95

RECENT MILESTONES:
- C91: Pilot site #2 launched, Fruitvale (MilestoneNotes line)
- C90: Cohort 1 evaluation complete

APPEARANCES:
- <bay-tribune hits>
```

Source: Initiative_Tracker. **Current state only** — phase, lead, neighborhoods, vote target, last 2-3 MilestoneNotes lines. Per-cycle phase progression history stays in the sheet, not in the card. Default decision; revisit if Mara audits show the card needs deeper historical context.

### wd-player-truesource (retrofit only)

Existing 27 docs from `ingestPlayerTrueSource.js` (S180). Retrofit: re-run with `containerTags: ['world-data', 'wd-player-truesource']`, then DELETE old un-tagged docs. Card content unchanged — whatever the truesource Drive doc contains.

---

## MCP query-surface map

| MCP tool | Container tag (singular `containerTag`) | Status |
|---|---|---|
| `lookup_citizen(name)` | `world-data` | existing — keeps working (every citizen card still carries `world-data` tag) |
| `lookup_initiative(name)` | `world-data` | existing — keeps working |
| `search_world(query)` | `world-data` | existing — keeps working |
| `get_neighborhood(name)` | `world-data` | existing — keeps working |
| `get_council_member(d)` | `world-data` | existing — keeps working |
| `lookup_business(name)` | `wd-business` | NEW (Task M1) |
| `lookup_faith_org(name)` | `wd-faith` | NEW (Task M2) |
| `lookup_cultural(name)` | `wd-cultural` | NEW (Task M3) |
| `get_neighborhood_state(name)` | `wd-neighborhood` | NEW (Task M4) — narrower than existing `get_neighborhood`, returns only neighborhood card |

**Why both layers:** existing tools query `world-data` and keep working with no change because every card still carries that tag. New domain-filtered tools query the bare `wd-<domain>` tag and return only that domain. Reporters preparing a business-focused article use `lookup_business` and don't wade through citizen/faith/cultural noise. Mike's S182 instruction codified.

---

## Trigger cadence + wipe policy

**Revised post-Phase-1 (2026-04-27).** See [§Phase 1 findings](#phase-1-findings) below for inventory-driven changes (business is not green-field; engine-state cleanup added).

| Domain | Trigger | First-run wipe | Subsequent runs |
|---|---|---|---|
| **engine-state cleanup (one-time)** | sequenced before R1 | DELETE 8 stale engine-state aggregate dumps (World Summary / Neighborhood Demographics / Map / Employment Roster per-cycle dumps from pre-S131 era) | n/a — no recurring writer |
| citizens | post-publish (canon adds appearances) | DELETE all 1,573 old un-tagged citizen cards (per Mike S182: write-new-and-delete-old) | DELETE-by-tag `wd-citizens` before write |
| business | post-cycle (state evolves) | DELETE 1 pre-existing card (Civis Systems BIZ-00052, doc id `9ztiB31aPUrv4zPfRCUAoQ`, dated 2026-04-09) before fresh ingest | DELETE-by-tag `wd-business` before write |
| faith | post-cycle (Faith_Ledger events appear per cycle) | green-field (confirmed 0 docs in Phase 1 inventory) | DELETE-by-tag `wd-faith` before write |
| cultural | post-publish (fame shifts via media) | green-field (confirmed 0 docs) | DELETE-by-tag `wd-cultural` before write |
| neighborhood | post-cycle (demographics shift, gentrification phase changes) | green-field (confirmed 0 domain-cards; 2 stale aggregate dumps fall under engine-state cleanup row above) | DELETE-by-tag `wd-neighborhood` before write |
| initiative | post-cycle (phase/milestone changes) + post-publish (canon adds detail) | green-field (confirmed 0 docs) | DELETE-by-tag `wd-initiative` before write |
| player_truesource | on-demand (when Drive content updates) | retrofit re-run + DELETE old un-tagged | DELETE-by-tag `wd-player-truesource` before re-run |

**Clean-slate-by-tag (canonical wipe primitive for all writers):**
1. Enumerate via `/v3/documents/list` (paginated). The `containerTag` filter is **server-side IGNORED** — filter client-side by `containerTags` array membership.
2. DELETE each old doc via `/v3/documents/{id}`.
3. Wait for queue settling (poll for 0 hits with the tag, or sleep 30s).
4. Write fresh cards with `containerTags: ['world-data', 'wd-<domain>']`.

**Async-indexing gotcha (verified S182):** writes return `status: queued`; search and DELETE may return 409 for ~15-30s after a write. Writers built on `buildCitizenCards.js` post-S181 already rate-limit at 300ms between writes; the wipe pass needs an explicit settling period before re-write.

**Scope guarantee:** DELETE-by-tag is filtered to `wd-<domain>` membership client-side, so a wipe of `wd-business` cannot accidentally DELETE citizens, faith, or any other domain. Player_truesource and other multi-tag domains are isolated by their own tag.

---

## Phase 1 findings

**Source:** `output/world_data_inventory.json` (engine-sheet Task 1.1, commit `3b844a5`, audited 2026-04-28T02:07Z). Two-pass enumeration (list-walk + GET-classify), classSum verified, 0 fetch failures.

**Scope correction:** S181 mags doc estimated ~2,412 records; that figure was the org-wide total across all containers (orgTotalItems = 2,415). Actual `world-data` container holds **1,609 docs**. Plan body wipe figures updated.

| Class | Count | Disposition |
|---|---|---|
| citizen-card | 1,573 | DELETE all in Task R1 (write-new + DELETE-old per Mike S182). Of these, ~398 are post-S181 clean writes; rest are pre-S181 contaminated. Cheaper to wipe all and re-run from current sheet state than to age-discriminate. |
| player_truesource | 27 | wipe in Task R2 retrofit. Matches S180 ingestion exactly. |
| business-card | 1 | **CORRECTION:** business is NOT green-field. 1 pre-existing card (Civis Systems BIZ-00052, doc id `9ztiB31aPUrv4zPfRCUAoQ`, 2026-04-09) must be DELETEd in Task W1 wipe phase. Wipe-policy table updated above. |
| faith-card | 0 | confirmed green-field |
| cultural-card | 0 | confirmed green-field |
| neighborhood-card | 0 | confirmed green-field |
| initiative-card | 0 | confirmed green-field |
| registry-one-liner | 0 | not present in current container |
| unknown | 8 | **engine-state aggregate dumps** — see disposition below |

**Engine-state aggregate dumps (8 docs, "unknown" class):**

Pre-S131-era manual `buildWorldStatePacket`-style ingests. Content includes explicit engine vocabulary ("Cycle Weight: HIGH-SIGNAL," "Events Generated: 72," "Migration Drift: 6") that breaks the simulation-as-real-world frame per [[POST_MORTEM_C92_CONTAMINATION]] (S172). Composition:

| Title pattern | Approx count |
|---|---|
| `# World Summary — Cycle <N>` | ~3 (cycles 90, 92, plus 1 other) |
| `OAKLAND NEIGHBORHOOD DEMOGRAPHICS — Cycle 89` | 1 |
| `OAKLAND NEIGHBORHOOD MAP — Cycle 89` | 1 |
| `OAKLAND EMPLOYMENT ROSTER — Cycle 89` | 1 |
| Other engine-state shape | ~2 |

**Disposition: DELETE all 8.** world-data is the city-facing surface (citizens, businesses, faith orgs, neighborhoods as they exist in-world); engine telemetry lives in sheets and engine code, not here. The new per-domain card layer (W1–W5) replaces what these dumps were trying to do, with proper canon-fidelity and tag scheme. Sequenced as new **Task R0**, before R1, so the citizen retrofit operates on a clean substrate.

**Multi-class anomalies (10):** MLB-player citizen cards whose bios contain truesource-flavored phrases. Primary class `citizen-card` correctly holds — the truesource match is content artifact, not misclassification. No action.

---

## Tasks

### Phase 1 — Inventory (engine-sheet)

#### Task 1.1: Inventory script — enumerate world-data
- **Files:** `scripts/auditWorldData.js` (NEW)
- **Steps:**
  1. Page through `/v3/documents/list` (containerTag filter is server-side IGNORED — list everything, filter client-side for entries containing `'world-data'` in `containerTags` array).
  2. For each doc: read content first 200 chars + containerTags + metadata.title + createdAt.
  3. Classify by content shape: `citizen-card` (matches "(POP-XXXXX)" header line), `business-card` ("BIZ-XXXXX"), `faith-card` ("FAITH-XXX"), `player_truesource` (via metadata.source or recognizable shape from `ingestPlayerTrueSource.js`), `registry-one-liner` (single short line, pre-S131 ingest), `unknown`.
  4. Output `output/world_data_inventory.json` with per-classification counts + sample doc IDs (5 per class) + total count.
- **Verify:** total doc count matches `npx supermemory tags list` for world-data; counts sum to total.
- **Status:** **DONE S182** (engine-sheet, commit `3b844a5`). Two-pass design (list-walk + GET-classify) shipped — list endpoint titles unreliable (boilerplate `Direct memories (1)` hides real titles), so Pass 2 fetches each doc to read content head + metadata.title. Output written to `output/world_data_inventory.json`.

#### Task 1.3: Verify `/v3/documents` POST works for buildCitizenCards.js retrofit
- **Files:** ad-hoc test, no new file
- **Steps:** POST a test card via `/v3/documents` with `containerTags: ['world-data', 'wd-citizens-test']` and the existing buildCitizenCards card text. Confirm searchable by `wd-citizens-test`. DELETE after. (`/v4/memories` was the existing endpoint; verify `/v3/documents` is the right swap.)
- **Verify:** test card retrievable, DELETE returns 204.
- **Status:** **DONE S182** (verified inline by R1 retrofit commit `6ec7a61` — `/v3/documents` POST shipped with `containerTags: ['world-data', 'wd-citizens']` payload shape; tag-and-search behavior already verified in research-build plan-prep with probe doc `XQseCdoQpsb6SZCUM6i12o`).

#### Task 1.2: Decision pass on inventory
- **Files:** this plan file (update — append a "Phase 1 findings" subsection)
- **Steps:** Read `output/world_data_inventory.json`. Confirm wipe-policy table per domain. Record any surprise classifications (player_truesource older versions, gender-drift cards, prompt-injection-shaped content, content from undocumented writers) and their disposition.
- **Verify:** plan changelog entry added with classification counts.
- **Status:** **DONE S182** (research-build, this section + Phase 1 findings above).

### Phase 1.5 — Engine-state aggregate dump cleanup (engine-sheet)

#### Task R0: DELETE 8 stale engine-state aggregate dumps
- **Files:** `scripts/wipeWorldDataSnapshots.js` (NEW, shipped S182).
- **Steps:**
  1. Two-pass design (list endpoint titles unreliable — list response shows boilerplate `Direct memories (1)`; metadata.title in GET response holds the real value). Pass 1 lists `/v3/documents/list` and collects world-data IDs. Pass 2 GETs each, matches metadata.title and content head against engine-state dump signatures.
  2. Snapshot patterns matched: World Summary, Oakland City and Sports Summary, Neighborhood Map, Neighborhood Demographics, Employment Roster, Faith Organizations, Business Registry, Cultural Ledger.
  3. Hardened against rate-limit during apply: per-page retry on non-200 (3 attempts, 5s sleep), abort-on-error after retries (one earlier attempt silently skipped pages 21-25 on 401s and only deleted 1 of 8 — abort-on-error closes that hole). GET retries on empty content for transient API behavior.
  4. Dry-run by default; `--apply` DELETEs each, sleeps 30s, recounts.
- **Verify:** post-delete inventory shows zero engine-state aggregate dumps; world-data total = 1,601.
- **Status:** **DONE S182** (engine-sheet, commit `265c503`). 8/8 deleted. world-data 1,609 → 1,601. Org total 2,415 → 2,407.
- **Why now:** sequenced before R1 so the citizen retrofit operates on a clean substrate. These docs predate the canon-fidelity work and contain explicit engine vocabulary that breaks the simulation-as-real-world frame per S172 POST_MORTEM. The new per-domain card layer (W1–W5) replaces what these dumps tried to do, with proper tagging.

### Phase 2 — Citizen retrofit (engine-sheet)

#### Task R1: `buildCitizenCards.js` retrofit + DELETE-old pass
- **Files:** `scripts/buildCitizenCards.js` (modify)
- **Steps:**
  1. Switch `writeMemory()` from `/v4/memories` POST → `/v3/documents` POST. New payload shape: `{content: <card>, containerTags: ['world-data', 'wd-citizens'], metadata: {title: '<First Last>', popid: '<POP-XXXXX>', source: 'buildCitizenCards.js'}}`.
  2. Add `--wipe-old` flag with **POPID-content-scoped filter** (the canonical wipe pattern engine-sheet established at R1 — every domain writer follows this shape): enumerate via `/v3/documents/list`, keep docs with `'world-data'` AND no `'wd-citizens'` tag, GET each, extract `(POP-XXXXX)` header from content, DELETE only if POPID is in the citizen set being written. Truesource (27 docs) and the Civis business card stay untouched because their content shape doesn't carry citizen POPIDs that match. Sleep 30s after wipe before write phase.
  3. Default `--wipe-old` OFF (opt-in for the retrofit migration). `--apply --wipe-old` for the production run; `--apply --name "Beverly Hayes" --wipe-old` auto-scopes the wipe to that single citizen's POPID.
  4. Output report: pre-wipe count, deleted count, post-wipe count, written count.
- **Verify:** dry-run on 5 citizens shows the new payload shape; apply on `--name "Beverly Hayes" --wipe-old` writes one card with the new tag pair, wipe phase removes only the prior Beverly Hayes citizen-card docs (truesource and business cards untouched).
- **Status:** **DONE S183** (engine-sheet, commits `6ec7a61` retrofit + `b24f3ed` rate-limit hardening + S183 DELETE-401/429 retry patch + S183 `--wipe-only` flag). **Single-citizen verification (S182):** Beverly Hayes (POP-00772) `--apply --name --wipe-old` succeeded — wipe matched 2 dupes, 1 dual-tagged write, GET-by-ID confirmed. **Bulk apply (S183):** background run ingested 686 ledger-matched citizens; 404 written + 4 targeted retries (Jango Lango / Tyrie Groin / Maya Torres-Dillon / Tomas Renteria, all rate-limited) = **408 wd-citizens** total. Quality gate (line 515) silently skipped 278 bare-ledger-only citizens (no appearances + no traits + no bio — intentional S181 design to keep Supermemory clean). Wipe pass deleted 1,563/1,571 prior un-tagged citizen docs in bulk run; `--wipe-only` recovery pass cleared the 8 stragglers (DELETE 401/429 retry-patch credit). Final substrate: 565 world-data docs, **100% domain-tagged, 0 orphans**.

### Phase 3 — Five new writers (engine-sheet)

Modeled on `buildCitizenCards.js` post-S181 + R1 retrofit (commit `6ec7a61`) + W1's rate-limit hardening (commit `b24f3ed`). Each writer:
- Reads source sheet (Phase 0 already manifest in SHEETS_MANIFEST.md).
- Builds card per shape spec (above).
- Optionally hybrid-searches bay-tribune for appearances + full-name post-filters.
- **Implements ID-content-scoped wipe matching R1's pattern** (the canonical writer wipe primitive): enumerate `/v3/documents/list`, keep docs with `'world-data'` AND no `'wd-<domain>'` tag, GET each, extract the domain ID from content header (`(BIZ-XXXXX)` for business / `(FAITH-XXX)` for faith / etc.), DELETE only if the ID is in the entity set being written. Cross-domain content stays untouched. Tighter than tag-membership filtering — preserves graceful degradation if a writer fails partway and naturally catches partial-run residue on retry (W1 proved this: a 36-write failure left 16 partial dual-tagged cards, which the next `--apply --wipe-old` correctly caught and re-wrote alongside the rest).
- Writes with `containerTags: ['world-data', 'wd-<domain>']`.
- Rate limits at **500ms** between writes (bumped from 300ms post-W1; see "Writer hardening pattern" below).
- Outputs report: enumerated, written, errors, with-appearances.

### Writer hardening pattern (post-W1, canonical for W2–W5 + R2)

Bulk applies of 50+ writes back-to-back trip Supermemory's rolling-window rate cap. The cap surfaces as **HTTP 401 "Either userId or orgId not found"** — NOT 429 — which initially looked like an auth failure. Observed during W1 bulk run: wipe pass + 16 writes succeeded, then 36 consecutive 401s ate the rest of the run.

**Mandatory writer skeleton** (from `scripts/buildBusinessCards.js` commit `b24f3ed`):

1. **`smRequest(method, apiPath, body)`** — promise-wrapped https.request returning `{status, body}` (does NOT throw on non-2xx). Reusable across write/list/GET/DELETE.
2. **`writeMemory(content, entity)`** — wraps `smRequest('POST', '/v3/documents', ...)` with retry-on-401-OR-429: up to 3 retries (4 attempts total per write), 8s sleep between attempts. The retry rationale: the cap is rolling, so backoff naturally lets the next write through. Constants: `WRITE_MAX_RETRIES = 3`, `WRITE_RETRY_SLEEP_MS = 8000`.
3. **`listPageWithRetry(page, retries)`** — same retry primitive for `/v3/documents/list` pages. List 401s less often than writes but it happens. Constants: 3 retries, 5s sleep.
4. **`getDocWithRetry(id, retries)`** — retries on **empty content** (different failure mode — transient API behavior under heavy load returns 200 with `content: ""`). 2 retries, 500ms sleep. Used by the wipe-old GET pass.
5. **Inter-write sleep: `await smSleep(500)`** between writes. Lower values (300ms) failed in W1's bulk run; 500ms held.
6. **Abort-on-incomplete-enumeration**: if any list page returns non-200 after retries, throw rather than silently skip. Partial enumeration with `--apply` is unsafe (an earlier wipeWorldDataSnapshots apply silently skipped 5 pages on 401s and only deleted 1 of 8 dumps).
7. **Settling sleep**: 30s between wipe pass and write pass to let async indexing catch up. Constant: `WIPE_INDEXING_SLEEP_MS = 30000`.

**Recovery from partial bulk run:** simply re-run `--apply --wipe-old`. The ID-content-scoped wipe catches partial dual-tagged docs (their content header still matches the domain ID pattern) and DELETEs them before the fresh write pass. Idempotent by design.

**Targeted retry without wipe:** if only a handful of entities failed in a bulk run (W1 had 2: BART + Highland), re-run with `--apply --biz BIZ-NNNNN` (or `--name "X"`) and **omit `--wipe-old`** — single-entity writes don't burn the rate-window. W1 closed cleanly this way.

#### Task W1: `scripts/buildBusinessCards.js` (NEW)
- **Source:** Business_Ledger (52 rows verified).
- **Card shape:** wd-business spec above.
- **Tag pair:** `['world-data', 'wd-business']`.
- **Wipe:** BIZ-content-scoped DELETE (canonical R1 pattern). Plan-original "DELETE-by-tag wd-business" wouldn't catch the un-tagged Civis seed.
- **Verify:** **CORRECTION** — plan-original fixture `BIZ-00035 Joaquin's Bakery` is wrong; actual ledger row 35 is **Peralta Community College District** (City-wide, 1 employee, 0 appearances). Use **BIZ-00052 Civis Systems** as the rich verification fixture (West Oakland, Urban Systems Intelligence, 40 employees, full financials, founder Elias Varek, 5 bay-tribune appearances from Baylight/NBA-bid storyline).
- **Status:** **DONE S182** (engine-sheet, commits `f32a5d8` writer + `b24f3ed` hardening). 52/52 cards written with dual `['world-data','wd-business']` tags. Civis seed deduplicated in wipe pass. Bulk apply hit rate-limit on first run (16/52 written, 36 401s); re-run after hardening completed 50/52; targeted retries closed the last 2 (BART BIZ-00014, Highland BIZ-00015). Verified via list-walk: `wd-business` count = 52.

#### Task W2: `scripts/buildFaithCards.js` (NEW)
- **Source:** Faith_Organizations (16 rows) + Faith_Ledger (last 2 cycles).
- **Card shape:** wd-faith spec above. **Header deviation:** Faith_Organizations has no FAITH-XXX ID column (plan spec assumed one). Card header = Organization name only, matches W4 neighborhood pattern for ID-less domains.
- **Tag pair:** `['world-data', 'wd-faith']`.
- **Wipe:** Org-name-content-scoped DELETE (extract first non-blank line of content, match against org-name set being written). Inventory confirmed green-field for `wd-faith`; live wipe pass enumerated 1,651 world-data candidates and matched 0 (clean). Pattern remains for re-run idempotency.
- **Apply hardening:** copied `smRequest`/`writeMemory`/`listPageWithRetry`/`getDocWithRetry`/`smSleep` from `scripts/buildBusinessCards.js`. Inter-write sleep 500ms.
- **Verify:** Masjid Al-Islam renders (East Oakland, Imam Faheem Shuaibe, congregation 400 — plan validation table fixture text was off; sheet is canon). St. Columba renders with full RECENT ACTIVITY + APPEARANCES blocks.
- **Status:** **DONE S182** (engine-sheet, commit pending). Bulk apply hit rate-limit on first run after the 30s wipe-settling sleep (14/16 written, 2 401s — St. Columba + Lake Merritt UMC). Targeted retries without `--wipe-old` (W1's recovery pattern) closed both. Final verified state: 16 docs `wd-faith`. With recent events: 9. With bay-tribune appearances: 5 (raw 42 → filtered 12 kept after full-name post-filter — generic words like "church"/"temple" pollute hybrid hits as expected).

#### Task W3: `scripts/buildCulturalCards.js` (NEW)
- **Source:** Cultural_Ledger (39 rows verified).
- **Card shape:** wd-cultural spec above. **Header:** `Name (CUL-XXXXXXXX)` — CUL-ID confirmed as primary key (`CUL-` prefix + 8-char hex). POP cross-ref written as `Universe link: POP-XXXXX` **without parens** so it stays outside R1's `\(POP-\d+\)` wipe regex (coexistence guarantee for citizens-and-cultural dual entities like Beverly Hayes).
- **Tag pair:** `['world-data', 'wd-cultural']`.
- **Wipe:** CUL-ID-content-scoped DELETE (regex `\(CUL-[A-F0-9]{6,}\)`). Cannot collide with R1 (POP-) or W1 (BIZ-) by construction. Green-field confirmed (1,667 candidates, 0 matches).
- **Apply hardening:** copied from `scripts/buildBusinessCards.js`. Inter-write sleep 500ms.
- **Verify:** Dax Monroe (CUL-3913E3E5), Marin Tao (CUL-0FBABAC4), Rico Valez (CUL-D508319E) render with domain/category/fame/tier/trend; POP cross-ref present where UniverseLinks populated.
- **Status:** **DONE S183** (engine-sheet, commit pending). 37/39 in bulk apply (2 rate-limited: Nila James CUL-A99D7E2E + Tara Ellison CUL-0F9D85B2); targeted retries via `--cul` flag closed both. Final verified state: 39 docs `wd-cultural`. With bay-tribune appearances: 8 (raw 69 → filtered 24 kept).

#### Task W4: `scripts/buildNeighborhoodCards.js` (NEW)
- **Source:** Neighborhood_Map (17 rows) + Neighborhood_Demographics + Business_Ledger + Simulation_Ledger + `lib/districtMap.js`.
- **Card shape:** wd-neighborhood spec above. **Wipe-collision avoidance:** NOTABLE BUSINESSES + NOTABLE CITIZENS write IDs WITHOUT parens: `- POP-00583 — Beverly Hayes [stylist, tier 2]` and `- BIZ-00035 — Joaquin's Bakery [Food & Bev, 12 emp]`. Square brackets stay outside R1's `\(POP-\d+\)` and W1's `\(BIZ-\d+\)` wipe regexes — guarantees the citizen + business rebuilds can't collateral-delete neighborhood cards.
- **Tag pair:** `['world-data', 'wd-neighborhood']`.
- **Wipe:** Neighborhood-name-content-scoped DELETE (first non-blank line match against the 17 NM names being written — same shape as W2 org-name pattern). Green-field confirmed (1,706 candidates, 0 matches).
- **District:** sourced via `districtMap.getDistrictForNeighborhood(name)` — written into both content body AND metadata.
- **Apply hardening:** copied from `scripts/buildBusinessCards.js`. Inter-write sleep 500ms.
- **Verify:** Temescal renders with `District: D7` (lib canon — plan example said D3, that was wrong), Population ~1.3k, Median income $75k, Median rent $3k, Sentiment 0.06, top-2 businesses (only 2 in Temescal), top-5 citizens, 5 bay-tribune appearances.
- **Status:** **DONE S183** (engine-sheet, commit pending). 15/17 in bulk apply; targeted retries via `--name` closed Fruitvale + Jack London (rate-limit ceiling). Final verified state: 17 docs `wd-neighborhood`. **Data divergence surfaced:** 7 of 17 NM neighborhoods have notable businesses, 11 of 17 have notable citizens — not all rich because (a) Business_Ledger only covers 7 NM neighborhoods, (b) Simulation_Ledger uses different naming conventions in 8 cases ("Downtown Oakland" / "Coliseum District" / "Lake Merritt" / "Uptown" / "KONO" / "Montclair" / "East Oakland" / "Jingletown" present in SL but absent or differently-named in NM). Worth a separate cleanup task — not a W4 blocker. Cards rendered correctly via conditional-render of empty NOTABLE blocks.

#### Task W5: `scripts/buildInitiativeCards.js` (NEW)
- **Source:** Initiative_Tracker (6 valid rows — row 4 empty/INIT-004 gap, no card written there).
- **Card shape:** wd-initiative spec above. Header `Name (INIT-XXX)`. Plan-original "Lead: OEWD/Marcus Webb" was example text; actual sheet has LeadFaction (OPP/CRC/IND) — card uses faction. Card body adds NEXT (scheduled action + cycle), RECENT MILESTONES (truncated 600-char blob from MilestoneNotes), CONSEQUENCES.
- **Tag pair:** `['world-data', 'wd-initiative']`.
- **Wipe:** INIT-ID-content-scoped DELETE (regex `\(INIT-(\d{3,})\)`). Cannot collide with R1 (POP), W1 (BIZ), or W3 (CUL) by construction. Green-field confirmed (1,723 candidates, 0 matches).
- **Apply hardening:** copied from `scripts/buildBusinessCards.js`. Inter-write sleep 500ms.
- **Verify:** INIT-001 (West Oakland Stabilization Fund) renders with passed status, disbursement-active phase, $28M budget, OPP-vs-CRC + Vega swing, NEXT C93 action, MilestoneNotes blob, 5 bay-tribune appearances.
- **Status:** **DONE S183** (engine-sheet, commit pending). 5/6 in bulk apply (INIT-007 rate-limited); targeted `--init` retry closed it. Final verified state: 6 docs `wd-initiative`. With milestones: 6 (all). With bay-tribune appearances: 3.

### Phase 4 — Player truesource retrofit (engine-sheet)

#### Task R2: `ingestPlayerTrueSource.js` retrofit + DELETE-old pass
- **Files:** `scripts/ingestPlayerTrueSource.js` (modify)
- **Steps:**
  1. Switch write call to `/v3/documents` if not already (verified by R1).
  2. Add `'wd-player-truesource'` to containerTags array.
  3. Add `--wipe-old` flag matching R1's pattern. **Spec deviation (locked S183):** wipe filter is content-signature-scoped (`=== PLAYER TRUESOURCE —` header) rather than POPID-content-scoped — POPIDs are discovered DURING the 3 ingest passes (Drive walk + DataPage parse + ledger fallback) and aren't knowable ahead of time without a full duplicate pre-discovery pass. Content-signature-scope is functionally equivalent when re-ingesting the same roster, and safer when the roster changes (cleanly removes orphans rather than leaving stale truesource for departed players). Citizen cards untouched because their content signature differs.
  4. Re-run end-to-end on 27 known docs.
- **Apply hardening:** addDocument wrapped in W1 retry-on-401/429 (8s backoff, 3 retries). DELETE pass also wrapped in retry-on-401/429 (8s) + retry-on-409 (20s, indexing settle). New `--wipe-only` flag for recovery passes. Wipe filter skips docs already carrying DOMAIN_TAG (idempotency — re-runs don't target the dual-tagged writes we just made).
- **Verify:** 27 docs `wd-player-truesource` tagged; 0 un-tagged truesource-signature docs in world-data; 6 domain tags total clean.
- **Status:** **DONE S183** (engine-sheet, commit pending). Three-pass ingest (subfolder/flat-MLB/prospects) shipped 27/27 dual-tagged writes with no rate-limit hits on writes (under W1's 52-write threshold). First wipe pass got 8/27 deletes (19 stuck on 401 — DELETE retry was 409-only; recovery patch added 401/429 retry + idempotency filter). Two follow-up `--wipe-only` runs cleared the 19 leftovers (17 first attempt, 2 second attempt). Final substrate: 1,729 world-data docs, all 6 domain tags clean (52 biz + 39 cultural + 27 truesource + 17 neighborhood + 16 faith + 6 initiative + 1 citizen).

### Phase 5 — MCP tool additions (engine-sheet)

**S183 retrieval gap surfaced + closed:** existing `supermemory_search` helper used CLI defaults (mode='memories', threshold=0.6), which is too strict for the short structured cards W1–W5 + R2 produce. Empirical: searching `wd-faith` for "Masjid Al-Islam" with defaults returned 0 results; with `--mode hybrid --threshold 0.3` returned the card at similarity 0.72. Helper extended with optional `mode` and `threshold` kwargs (defaults preserved → existing tools unchanged); M1–M4 opt-in with `mode='hybrid', threshold=0.3`. Spot-checked Civis Systems via M1 (sim 0.86) and Temescal via M4 (sim 0.86) — both clean.

#### Task M1: `lookup_business(name)` in `scripts/godworld-mcp.py`
- **Steps:** Added `@mcp.tool()` function. Query `supermemory_search(name, 'wd-business', 3, mode='hybrid', threshold=0.3)`.
- **Verify:** `lookup_business("Civis Systems")` returns the BIZ-00052 card (note: plan-original BIZ-00035 / Joaquin's Bakery fixture is wrong — actual ledger row 35 is Peralta Community College District; Civis Systems is the rich verification fixture per W1 status).
- **Status:** **DONE S183**.

#### Task M2: `lookup_faith_org(name)` in `scripts/godworld-mcp.py`
- **Steps:** Added tool. Query `supermemory_search(name, 'wd-faith', 3, mode='hybrid', threshold=0.3)`.
- **Verify:** `lookup_faith_org("Masjid Al-Islam")` returns the East Oakland card with Imam Faheem Shuaibe + 400 congregation (sim 0.72).
- **Status:** **DONE S183**.

#### Task M3: `lookup_cultural(name)` in `scripts/godworld-mcp.py`
- **Steps:** Added tool. Query `supermemory_search(name, 'wd-cultural', 3, mode='hybrid', threshold=0.3)`. Docstring notes coexistence with `lookup_citizen` (same person can have both wd-citizens and wd-cultural cards).
- **Status:** **DONE S183**.

#### Task M4: `get_neighborhood_state(name)` in `scripts/godworld-mcp.py`
- **Steps:** Added tool. Query `supermemory_search(name, 'wd-neighborhood', 3, mode='hybrid', threshold=0.3)`. Distinct from existing `get_neighborhood` which still queries the broad `world-data` tag and returns mixed neighborhood mentions; this returns only the neighborhood card.
- **Verify:** `get_neighborhood_state("Temescal")` returns the D7 card with phase/sentiment/notable businesses + citizens (sim 0.86).
- **Status:** **DONE S183**.

---

## Open questions

- [ ] **Initiative card history:** current-state-only is the default. Promote to per-cycle-snapshots only if Mara audit on a C93+ edition flags missing initiative history. (Blocks Task W5 only if revisited.)
- [ ] **Faith card granularity:** one card per org with embedded recent events is the default. Promote to per-org-per-event-batch only if Mara audit flags retrieval gaps. (Blocks Task W2 only if revisited.)
- [x] **`/v4/memories` vs `/v3/documents` for writes:** RESOLVED S182. `/v3/documents` is the writer endpoint for all retrofits. R1 + W1 ship on it. `/v4/memories` is no longer used by any active writer in this project.

---

## Validation fixture

C92 dry-run for each writer:

| Writer | Fixture entity | Expected card content |
|---|---|---|
| buildCitizenCards (R1) | **Beverly Hayes (POP-00772)** | Header + neighborhood (West Oakland) + role (Community Director, Tenant Rights Advocate) + tier 3 + birth 1983 + gender female + 5 bay-tribune appearances; old un-tagged Beverly card(s) deleted (verified S182 — found 2 duplicates, both wiped). |
| buildBusinessCards (W1) | **Civis Systems (BIZ-00052)** *(plan-original BIZ-00035 fixture is wrong — actual ledger row 35 is Peralta CCD)* | Header + West Oakland + Urban Systems Intelligence + 40 employees + financials ($142K avg salary, $60M revenue, 15% growth) + Key Personnel (Elias Varek, founder) + 5 bay-tribune appearances. |
| buildFaithCards (W2) | Masjid Al-Islam | Header + tradition + leader + congregation + recent Faith_Ledger events |
| buildCulturalCards (W3) | Beverly Hayes (POP-00772) cultural card | Music domain + fame tier; coexists with her wd-citizens card |
| buildNeighborhoodCards (W4) | Temescal | Phase + sentiment + top-5 businesses + top-5 citizens |
| buildInitiativeCards (W5) | INIT-001 (Stabilization Fund) | pilot_evaluation phase + neighborhoods + recent MilestoneNotes |
| ingestPlayerTrueSource (R2) | Vinnie Keane (POP-00001) | Existing truesource content, now retrievable via `wd-player-truesource` |

Per writer: dry-run prints card; apply writes one record; MCP lookup retrieves; old un-tagged docs (where applicable) gone.

---

## Substrate snapshot at S182 close

| Container | Count | Notes |
|---|---|---|
| Org-wide total | **~varies** | All Supermemory containers combined (post-S183) |
| world-data total | **565** | After full R1 bulk + recovery: substrate is 100% domain-tagged, zero orphans. (Was 1,729 pre-S183 R1; net -1,164 = 1,571 deleted prior un-tagged citizen dupes minus 408 fresh dual-tagged writes.) |
| `wd-citizens` tagged | **408** | Full bulk apply S183. 686 ledger citizens matched; 278 silent-skip by quality gate (bare-ledger-only, no appearances/traits/bio); 404 written in bulk + 4 retry-recovered = 408. |
| `wd-business` tagged | **52** | Full Business_Ledger ingested W1. Includes the deduplicated Civis Systems re-write. |
| `wd-faith` tagged | **16** | Full Faith_Organizations ingested W2. Org-name-scoped wipe found 0 pre-existing (green-field confirmed). |
| `wd-cultural` tagged | **39** | Full Cultural_Ledger ingested W3. CUL-ID-scoped wipe found 0 pre-existing (green-field confirmed). |
| `wd-neighborhood` tagged | **17** | Full Neighborhood_Map ingested W4. Name-scoped wipe found 0 pre-existing (green-field confirmed). District enrichment via `lib/districtMap.js`. |
| `wd-initiative` tagged | **6** | Full Initiative_Tracker ingested W5 (row 4 / INIT-004 is empty in sheet — no card). INIT-ID-scoped wipe found 0 pre-existing (green-field confirmed). |
| `wd-player-truesource` tagged | **27** | Three-pass re-ingest R2 with content-signature wipe (header `=== PLAYER TRUESOURCE —`). 19-doc wipe straggle resolved via two `--wipe-only` recovery passes after DELETE retry-on-401/429 patch. |
| Un-tagged citizen-cards | **0** | All 1,571 prior un-tagged dupes wiped in R1 bulk + recovery (S183). |
| Un-tagged player_truesource | **0** | Wiped in R2 (S183). |
| Other un-tagged in world-data | **0** | Substrate is 100% domain-tagged — zero orphans across all 7 domain tags. |

Fresh-terminal pickup state: **all S183 plan tasks complete.** Substrate is structurally clean — every world-data doc carries exactly one domain tag (wd-citizens / wd-business / wd-faith / wd-cultural / wd-neighborhood / wd-initiative / wd-player-truesource). Five new writers + R1 + R2 retrofits + M1-M4 MCP tools + DELETE-401/429 retry patch + `--wipe-only` recovery flag all shipped. Open follow-ups: NM↔SL neighborhood-name reconciliation (W4 surfaced), citizen-card quality gate review (S181 design — keeps thin cards out, but 278 bare-ledger citizens are now invisible to the wd-citizens lookup; revisit if media coverage misses someone).

---

## Phase order + handoff

Engine-sheet executes in this order (each phase produces an artifact research-build can verify):
1. Task 1.3 (verify /v3/documents path). **DONE S182** (verified inline by R1 retrofit).
2. Task 1.1 (inventory script + run). **DONE S182** (commit `3b844a5`).
3. Task 1.2 (decision pass — research-build appends findings to this plan). **DONE S182** (this section).
4. Task R0 (engine-state aggregate dump cleanup). **DONE S182** (commit `265c503`, world-data 1,609 → 1,601).
5. Task R1 (citizen retrofit) — proves the retrofit + POPID-content-scoped wipe pattern on the largest, most-used domain. **DONE S183** (Beverly verified S182 commits `6ec7a61` + `b24f3ed`; bulk apply S183 with S183 DELETE-401/429 retry patch + `--wipe-only` flag). 408 wd-citizens written (686 matched, 278 silent-skip by quality gate). Wipe deleted 1,571/1,571 prior un-tagged citizen docs (1,563 in bulk + 8 in recovery). Final state: 565 world-data docs, 100% domain-tagged.
6. Tasks W1–W5 (five new writers, in any order — independent). Each follows R1's ID-content-scoped wipe pattern + W1's hardening (see "Writer hardening pattern" above). **W1 DONE S182** (commits `f32a5d8` + `b24f3ed`); **W2 DONE S182** (16/16 wd-faith via org-name-scoped wipe); **W3 DONE S183** (39/39 wd-cultural via CUL-ID-scoped wipe); **W4 DONE S183** (17/17 wd-neighborhood via name-scoped wipe + lib/districtMap district enrichment); **W5 DONE S183** (6/6 wd-initiative via INIT-ID-scoped wipe — row 4 INIT-004 gap, no card). **All five W tasks complete.**
7. Task R2 (player_truesource retrofit). **DONE S183** (engine-sheet). Content-signature-scoped wipe (deviation from POPID-scope plan — POPIDs discovered during passes, not knowable upfront). 27/27 dual-tagged. Recovery patches added: DELETE retry-on-401/429, idempotency filter (skip already-tagged on re-run), `--wipe-only` flag.
8. Tasks M1–M4 (MCP tools). **DONE S183** (engine-sheet). Helper extended with optional `mode='hybrid'` + `threshold=0.3` kwargs to retrieve short structured cards (CLI defaults too strict). 4 tools added: `lookup_business`, `lookup_faith_org`, `lookup_cultural`, `get_neighborhood_state`. Backward-compatible — existing tools unchanged.

Research-build re-engages between steps if specs need revision (esp. after Phase 1 inventory may surface unanticipated content shapes).

---

## Changelog

- 2026-04-27 — Initial draft (S182, research-build). Tag-and-search behavior verified empirically (probe doc `XQseCdoQpsb6SZCUM6i12o`, since deleted). Card shapes approved by Mike with three explicit calls: (a) MCP query-surface design drives card shape; (b) citizen wipe is write-new-and-delete-old, not retrofit; (c) `wd-` prefix locked.
- 2026-04-27 — Phase 1 findings appended (S182, research-build, post-engine-sheet Task 1.1 commit `3b844a5`). Inventory: 1,609 world-data docs (correction: S181 estimated 2,412; that was org-wide, not container scope). Surprises: 1 pre-existing business card (Civis Systems BIZ-00052 — business is NOT green-field; wipe table revised), 8 engine-state aggregate dumps (World Summary / Neighborhood Demographics / Map / Employment Roster per-cycle dumps from pre-S131 era — fourth-wall contamination per S172 POST_MORTEM, slated for DELETE). New Phase 1.5 / Task R0 added: engine-state aggregate dump cleanup, sequenced before citizen retrofit R1. Phase order + handoff updated. Wipe-policy table revised inline.
- 2026-04-27 — Engine-sheet shipped Tasks 1.1 / R0 / R1-code in rapid succession (commits `3b844a5` / `265c503` / `6ec7a61`). Status updates layered onto plan: 1.1/1.2/1.3/R0 marked DONE; R1 marked CODE DONE with apply pending. R1's POPID-content-scoped wipe filter (deletes only docs whose POPID is in the citizen set being written) is **tighter than the original "tag-membership" filter described in the plan** — it preserves player_truesource (27 docs) and the Civis business card (BIZ-00052) during the citizen rebuild. **Plan revision:** R1's wipe pattern (POPID-content-scoped) becomes the canonical writer wipe primitive for W1–W5 + R2 — each domain writer scopes by its own ID extraction (BIZ-XXXXX / FAITH-XXX / etc.). Replaces an aborted global-wipe revision attempt that would have downgraded the safety property engine-sheet shipped. Phase 3 writer pattern + R2 spec updated to reflect.
- 2026-04-28 — S183 R1 bulk close. Engine-sheet ran the deferred R1 bulk (background, ~30 min). Two patches applied to `scripts/buildCitizenCards.js` first: (a) DELETE pass got the same 4-attempt retry-on-401/429 + 409 we ported into R2 (original was 409-only — would have lost ~70% of the 1,571 deletes); (b) new `--wipe-only` flag for safe recovery passes (mirrors R2). Bulk results: 686 ledger citizens matched (760 rows minus 73 blank/incomplete + filter), 404 written in bulk run + 4 targeted retries (Jango Lango, Tyrie Groin, Maya Torres-Dillon, Tomas Renteria — all rate-limited 401s) = **408 wd-citizens** total. **Quality gate at line 515 silently skipped 278** bare-ledger-only citizens (no appearances + no traits + no bio — intentional S181 design). Wipe pass deleted 1,563/1,571 in bulk + 8 in `--wipe-only` recovery = 1,571/1,571. Final substrate: **565 world-data docs, 100% domain-tagged, 0 orphans**. All S183 plan tasks complete. Plan updated: R1 status DONE with quality-gate rationale + retry-patch credit, Substrate snapshot rewritten (was pre-S183 forecast, now actuals), Fresh-terminal pickup state declares plan-complete.
- 2026-04-28 — S183 M1-M4. Engine-sheet extended `scripts/godworld-mcp.py` with 4 domain-filtered MCP tools: `lookup_business` (wd-business), `lookup_faith_org` (wd-faith), `lookup_cultural` (wd-cultural), `get_neighborhood_state` (wd-neighborhood). Surfaced and closed retrieval gap: `supermemory_search` helper used CLI default mode='memories' + threshold=0.6, which is too strict for the short structured cards the writers produce — empirical zero-result on Masjid Al-Islam wd-faith query with defaults vs. similarity 0.72 with `--mode hybrid --threshold 0.3`. Helper extended with optional `mode` / `threshold` / `limit` kwargs (defaults preserved → existing tools unchanged); M1-M4 opt-in with hybrid + 0.3. Spot-checked: Civis Systems wd-business sim 0.86, Temescal wd-neighborhood sim 0.86. Plan updated: M1-M4 marked DONE with verify-fixtures, retrieval-gap rationale documented, fixture corrections (BIZ-00052 not 00035) carried through.
- 2026-04-28 — S183 R2. Engine-sheet shipped `scripts/ingestPlayerTrueSource.js` retrofit (modify, not new). Three changes: dual-tag write payload (`['world-data', 'wd-player-truesource']`), W1 hardening on addDocument (retry-on-401/429), and `--wipe-old` flag with content-signature scope (`=== PLAYER TRUESOURCE —` header). 27/27 dual-tagged via 3-pass ingest (subfolder + flat-MLB + prospects). First wipe attempt only deleted 8/27 because original DELETE retry was 409-only — added retry-on-401/429 and idempotency filter (skip docs already carrying DOMAIN_TAG, so re-runs don't target the dual-tagged writes we just made). Two follow-up `--wipe-only` runs cleared the 19 stragglers (17 + 2). **Spec deviation locked**: wipe scope is content-signature, not POPID — POPIDs are discovered DURING the Drive walk + DataPage parse + ledger fallback, not knowable upfront. Functionally equivalent to POPID-scope when re-ingesting same roster, safer when roster changes (cleanly removes orphans). Final state: 6 domain tags clean, 1,729 world-data docs total, 158 domain-tagged. Plan updated: R2 spec rewritten with deviation rationale, Substrate snapshot adds wd-player-truesource=27 row, Phase order marks R2 DONE.
- 2026-04-28 — S183 W5. Engine-sheet shipped `scripts/buildInitiativeCards.js` (NEW). 6/6 wd-initiative tagged (Initiative_Tracker has row 4 / INIT-004 gap — empty row, no card). INIT-ID extracted via `\(INIT-(\d{3,})\)`; cannot collide with R1/W1/W3 wipes by construction. Card body adds NEXT (scheduled action), RECENT MILESTONES (truncated 600 chars), CONSEQUENCES — richer than plan-original spec since the Initiative_Tracker sheet carries more state than the plan example assumed (LeadFaction, MayoralAction, NextScheduledAction, etc.). Bulk apply hit rate-limit on 1 (INIT-007); targeted retry closed it. **All five W tasks (W1-W5) complete this session arc** (W1 S182, W2-W5 S183). Plan updated: W5 spec confirmed, Substrate snapshot adds wd-initiative=6 row, Phase order marks W5 DONE + flags all-W complete.
- 2026-04-28 — S183 W4. Engine-sheet shipped `scripts/buildNeighborhoodCards.js` (NEW). 17/17 wd-neighborhood tagged. Card uses bare-neighborhood-name header (W2 wipe pattern). Critical wipe-collision avoidance: NOTABLE BUSINESSES + NOTABLE CITIZENS write IDs OUTSIDE parens (`- POP-00583 — Beverly Hayes [stylist, tier 2]`) so R1 (POP) and W1 (BIZ) wipes can't collateral-delete. District enrichment via `lib/districtMap.getDistrictForNeighborhood`. Bulk apply hit rate-limit on 2 (Fruitvale + Jack London); targeted retries closed both. **Data divergence surfaced**: 8 SL neighborhood names diverge from NM ("Downtown Oakland" vs "Downtown", "Coliseum District" vs "Coliseum", "Lake Merritt" / "Uptown" / "KONO" / "Montclair" / "East Oakland" / "Jingletown" missing/renamed in NM) — leaves some W4 cards with empty NOTABLE CITIZENS blocks (handled gracefully via conditional render). Cleanup of name-key reconciliation between NM ↔ SL ↔ BL is a separate task, not a W4 blocker. Plan updated: W4 spec confirmed (district from lib, IDs without parens), Substrate snapshot adds wd-neighborhood=17 row, Phase order marks W4 DONE.
- 2026-04-28 — S183 W3. Engine-sheet shipped `scripts/buildCulturalCards.js` (NEW, this session). 39/39 wd-cultural tagged. CUL-ID is the wipe-extractable primary key (regex `\(CUL-[A-F0-9]{6,}\)`); POP cross-ref written without parens to stay outside R1's wipe regex — guarantees coexistence for dual-listed entities (Beverly Hayes can carry both wd-citizens POP-header card AND wd-cultural CUL-header card without R1's wipe collateral-deleting the cultural card). Bulk apply hit rate-limit on 2 writes (Nila James + Tara Ellison); targeted `--cul` retries closed both. Plan updated: W3 spec confirmed (CUL-ID schema verified), Substrate snapshot adds wd-cultural=39 row, Phase order marks W3 DONE.
- 2026-04-28 — S183 W2. Engine-sheet shipped `scripts/buildFaithCards.js` (NEW, this session). 16/16 wd-faith tagged via org-name-scoped wipe (no FAITH-XXX ID column on Faith_Organizations — header = org name only, mirrors W4 neighborhood pattern for ID-less domains). First bulk apply hit rate-limit on 2 writes (St. Columba + Lake Merritt UMC); targeted retries without `--wipe-old` closed both per W1 recovery pattern. Plan updated: W2 spec corrected (header deviation, fixture text), Substrate snapshot adds wd-faith=16 row, Phase order marks W2 DONE.
- 2026-04-28 — S182 close. Engine-sheet shipped R1 single-citizen verification (Beverly POP-00772, 2 dupes wiped + 1 dual-tagged write, dual tags confirmed via GET) and full W1 (commits `f32a5d8` writer + `b24f3ed` rate-limit hardening). W1 first-attempt bulk apply hit Supermemory's rolling-window cap (surfaces as 401 "userId or orgId not found", NOT 429) — 16/52 succeeded, then 36 consecutive 401s. Hardening shipped: retry-on-401-OR-429 in `writeMemory` with 8s backoff (3 retries), inter-write sleep 300ms→500ms, abort-on-incomplete-list-enumeration kept. Re-run completed 50/52, targeted retries closed the last 2. Final verified state: 52 docs `wd-business`, 1 doc `wd-citizens`. **Plan amendments this entry:** (a) R1 status updated with verification details + corrected POPID; (b) W1 status DONE with commit refs + fixture correction (BIZ-00035 is Peralta CCD, not Joaquin's Bakery — use Civis BIZ-00052); (c) new "Writer hardening pattern (post-W1)" subsection codifies the rate-limit playbook for W2–W5 + R2; (d) Validation fixture table corrected; (e) Open Question 3 (`/v4/memories` vs `/v3/documents`) marked resolved; (f) new "Substrate snapshot at S182 close" subsection captures current world-data composition for fresh-terminal pickup.
