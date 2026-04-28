---
title: World-Data Unified Ingest Rebuild
created: 2026-04-27
updated: 2026-04-27
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
- **Status:** [ ] not started

#### Task 1.3: Verify `/v3/documents` POST works for buildCitizenCards.js retrofit
- **Files:** ad-hoc test, no new file
- **Steps:** POST a test card via `/v3/documents` with `containerTags: ['world-data', 'wd-citizens-test']` and the existing buildCitizenCards card text. Confirm searchable by `wd-citizens-test`. DELETE after. (`/v4/memories` was the existing endpoint; verify `/v3/documents` is the right swap.)
- **Verify:** test card retrievable, DELETE returns 204.
- **Status:** [ ] not started

#### Task 1.2: Decision pass on inventory
- **Files:** this plan file (update — append a "Phase 1 findings" subsection)
- **Steps:** Read `output/world_data_inventory.json`. Confirm wipe-policy table per domain. Record any surprise classifications (player_truesource older versions, gender-drift cards, prompt-injection-shaped content, content from undocumented writers) and their disposition.
- **Verify:** plan changelog entry added with classification counts.
- **Status:** [ ] not started

### Phase 1.5 — Engine-state aggregate dump cleanup (engine-sheet)

#### Task R0: DELETE 8 stale engine-state aggregate dumps
- **Files:** ad-hoc DELETE pass, no new script needed (consume `output/world_data_inventory.json` `classes.unknown.samples` for doc IDs, plus the full inventory for any unknown beyond the sample list)
- **Steps:**
  1. From `output/world_data_inventory.json` collect ALL doc IDs in `classes.unknown` (sample list shows 5; full count is 8 — pull the rest from the inventory's full data structure or re-run the audit script with `--list-class unknown` if such a flag is added).
  2. For each doc id: `DELETE /v3/documents/{id}` (rate-limited, 300ms between).
  3. Wait 30s for queue to settle.
  4. Re-run `scripts/auditWorldData.js`; verify `classes.unknown.count = 0` and `worldDataCount = 1601` (1,609 − 8).
- **Verify:** post-delete inventory shows zero engine-state aggregate dumps; world-data total = 1,601.
- **Status:** [ ] not started
- **Why now:** sequenced before R1 so the citizen retrofit operates on a clean substrate. These docs predate the canon-fidelity work and contain explicit engine vocabulary that breaks the simulation-as-real-world frame per S172 POST_MORTEM. The new per-domain card layer (W1–W5) replaces what these dumps tried to do, with proper tagging.

### Phase 2 — Citizen retrofit (engine-sheet)

#### Task R1: `buildCitizenCards.js` retrofit + DELETE-old pass
- **Files:** `scripts/buildCitizenCards.js` (modify)
- **Steps:**
  1. Switch `writeMemory()` from `/v4/memories` POST → `/v3/documents` POST. New payload shape: `{content: <card>, containerTags: ['world-data', 'wd-citizens'], metadata: {title: '<First Last>', popid: '<POP-XXXXX>', source: 'buildCitizenCards.js'}}`.
  2. Add `--wipe-old` flag: enumerate via `/v3/documents/list`, filter client-side for docs containing `'world-data'` but NOT `'wd-citizens'` (the un-tagged old cards), DELETE each one. Sleep 30s after wipe before write phase.
  3. Default `--wipe-old` ON for `--apply` runs (Mike S182: write-new + delete-old). `--no-wipe-old` for partial reruns (e.g., single-citizen --name updates).
  4. Output report: pre-wipe count, deleted count, post-wipe count, written count.
- **Verify:** dry-run on 5 citizens shows the new payload shape; apply on `--name "Beverly Hayes"` writes one card with the new tag pair, DELETE-old phase removes the prior un-tagged Beverly Hayes card.
- **Status:** [ ] not started

### Phase 3 — Five new writers (engine-sheet)

Modeled on `buildCitizenCards.js` post-S181 + Task R1. Each writer:
- Reads source sheet (Phase 0 already manifest in SHEETS_MANIFEST.md).
- Builds card per shape spec (above).
- Optionally hybrid-searches bay-tribune for appearances + full-name post-filters.
- Wipes by tag, then writes with `containerTags: ['world-data', 'wd-<domain>']`.
- Rate limits at 300ms between writes.
- Outputs report: enumerated, written, errors, with-appearances.

#### Task W1: `scripts/buildBusinessCards.js` (NEW)
- **Source:** Business_Ledger (~52 rows).
- **Card shape:** wd-business spec above.
- **Tag pair:** `['world-data', 'wd-business']`.
- **Wipe:** DELETE-by-tag `wd-business`.
- **Verify:** BIZ-00035 (Joaquin's Bakery) renders with employees, owner, recent canon if any.
- **Status:** [ ] not started

#### Task W2: `scripts/buildFaithCards.js` (NEW)
- **Source:** Faith_Organizations + Faith_Ledger (last 2 cycles).
- **Card shape:** wd-faith spec above.
- **Tag pair:** `['world-data', 'wd-faith']`.
- **Wipe:** DELETE-by-tag `wd-faith`.
- **Verify:** Masjid Al-Islam renders with leader, congregation, recent ledger events.
- **Status:** [ ] not started

#### Task W3: `scripts/buildCulturalCards.js` (NEW)
- **Source:** Cultural_Ledger (40 rows).
- **Card shape:** wd-cultural spec above.
- **Tag pair:** `['world-data', 'wd-cultural']`.
- **Wipe:** DELETE-by-tag `wd-cultural`.
- **Verify:** Beverly Hayes renders with Music domain + fame tier; coexists with her wd-citizens card.
- **Status:** [ ] not started

#### Task W4: `scripts/buildNeighborhoodCards.js` (NEW)
- **Source:** Neighborhood_Map + Neighborhood_Demographics.
- **Card shape:** wd-neighborhood spec above.
- **Tag pair:** `['world-data', 'wd-neighborhood']`.
- **Wipe:** DELETE-by-tag `wd-neighborhood`.
- **Verify:** Temescal renders with phase, sentiment, top-5 businesses + citizens.
- **Status:** [ ] not started

#### Task W5: `scripts/buildInitiativeCards.js` (NEW)
- **Source:** Initiative_Tracker (current state only — defer history per Open Question 1).
- **Card shape:** wd-initiative spec above.
- **Tag pair:** `['world-data', 'wd-initiative']`.
- **Wipe:** DELETE-by-tag `wd-initiative`.
- **Verify:** INIT-001 (Stabilization Fund) renders with phase, neighborhoods, recent milestones.
- **Status:** [ ] not started

### Phase 4 — Player truesource retrofit (engine-sheet)

#### Task R2: `ingestPlayerTrueSource.js` retrofit + DELETE-old pass
- **Files:** `scripts/ingestPlayerTrueSource.js` (modify)
- **Steps:**
  1. Switch write call to `/v3/documents` if not already (verify in Task 1.3).
  2. Add `'wd-player-truesource'` to containerTags array.
  3. Add `--wipe-old` flag matching R1 pattern. DELETE old un-tagged truesource docs (filter for content shape from prior 27 ingests).
  4. Re-run end-to-end on 27 known docs.
- **Verify:** all 27 truesource docs retrievable via `containerTag: 'wd-player-truesource'`; no old un-tagged truesource docs remain.
- **Status:** [ ] not started

### Phase 5 — MCP tool additions (engine-sheet)

#### Task M1: `lookup_business(name)` in `scripts/godworld-mcp.py`
- **Steps:** Add `@mcp.tool()` function. Query `supermemory_search(name, 'wd-business', 3)`. Return formatted card text.
- **Verify:** `lookup_business("Joaquin's Bakery")` returns the BIZ-00035 card.
- **Status:** [ ] not started

#### Task M2: `lookup_faith_org(name)` in `scripts/godworld-mcp.py`
- **Steps:** Add tool. Query `supermemory_search(name, 'wd-faith', 3)`.
- **Status:** [ ] not started

#### Task M3: `lookup_cultural(name)` in `scripts/godworld-mcp.py`
- **Steps:** Add tool. Query `supermemory_search(name, 'wd-cultural', 3)`.
- **Status:** [ ] not started

#### Task M4: `get_neighborhood_state(name)` in `scripts/godworld-mcp.py`
- **Steps:** Add tool. Query `supermemory_search(name, 'wd-neighborhood', 3)`. Distinct from existing `get_neighborhood` which still queries the broad `world-data` tag and returns mixed neighborhood mentions; this returns only the neighborhood card.
- **Status:** [ ] not started

---

## Open questions

- [ ] **Initiative card history:** current-state-only is the default. Promote to per-cycle-snapshots only if Mara audit on a C93+ edition flags missing initiative history. (Blocks Task W5 only if revisited.)
- [ ] **Faith card granularity:** one card per org with embedded recent events is the default. Promote to per-org-per-event-batch only if Mara audit flags retrieval gaps. (Blocks Task W2 only if revisited.)
- [ ] **`/v4/memories` vs `/v3/documents` for writes:** Task 1.3 verifies `/v3/documents` works. If it does, all writers use it. If `/v4/memories` proves to support multi-tag writes too, the choice is preference; default to `/v3/documents` for consistency with what was verified S182.

---

## Validation fixture

C92 dry-run for each writer:

| Writer | Fixture entity | Expected card content |
|---|---|---|
| buildCitizenCards (R1) | Beverly Hayes (POP-00583) | Header + neighborhood + role + tier + birth + gender + appearances; old un-tagged Beverly card deleted |
| buildBusinessCards (W1) | Joaquin's Bakery (BIZ-00035) | Header + Temescal + Food & Bev + employees + recent canon if any |
| buildFaithCards (W2) | Masjid Al-Islam | Header + tradition + leader + congregation + recent Faith_Ledger events |
| buildCulturalCards (W3) | Beverly Hayes cultural card | Music domain + fame tier; coexists with wd-citizens card |
| buildNeighborhoodCards (W4) | Temescal | Phase + sentiment + top-5 businesses + top-5 citizens |
| buildInitiativeCards (W5) | INIT-001 (Stabilization Fund) | pilot_evaluation phase + neighborhoods + recent MilestoneNotes |
| ingestPlayerTrueSource (R2) | Vinnie Keane (POP-00001) | Existing truesource content, now retrievable via `wd-player-truesource` |

Per writer: dry-run prints card; apply writes one record; MCP lookup retrieves; old un-tagged docs (where applicable) gone.

---

## Phase order + handoff

Engine-sheet executes in this order (each phase produces an artifact research-build can verify):
1. Task 1.3 first (verify /v3/documents path).
2. Task 1.1 (inventory script + run). **DONE S182** (commit `3b844a5`).
3. Task 1.2 (decision pass — research-build appends findings to this plan). **DONE S182** (this section).
4. Task R0 (engine-state aggregate dump cleanup) — DELETE 8 stale docs before retrofit substrate is touched.
5. Task R1 (citizen retrofit) — proves the retrofit + wipe pattern on the largest, most-used domain.
6. Tasks W1–W5 (five new writers, in any order — independent).
7. Task R2 (player_truesource retrofit).
8. Tasks M1–M4 (MCP tools — once writers populate the tags, the lookups work).

Research-build re-engages between steps if specs need revision (esp. after Phase 1 inventory may surface unanticipated content shapes).

---

## Changelog

- 2026-04-27 — Initial draft (S182, research-build). Tag-and-search behavior verified empirically (probe doc `XQseCdoQpsb6SZCUM6i12o`, since deleted). Card shapes approved by Mike with three explicit calls: (a) MCP query-surface design drives card shape; (b) citizen wipe is write-new-and-delete-old, not retrofit; (c) `wd-` prefix locked.
- 2026-04-27 — Phase 1 findings appended (S182, research-build, post-engine-sheet Task 1.1 commit `3b844a5`). Inventory: 1,609 world-data docs (correction: S181 estimated 2,412; that was org-wide, not container scope). Surprises: 1 pre-existing business card (Civis Systems BIZ-00052 — business is NOT green-field; wipe table revised), 8 engine-state aggregate dumps (World Summary / Neighborhood Demographics / Map / Employment Roster per-cycle dumps from pre-S131 era — fourth-wall contamination per S172 POST_MORTEM, slated for DELETE). New Phase 1.5 / Task R0 added: engine-state aggregate dump cleanup, sequenced before citizen retrofit R1. Phase order + handoff updated. Wipe-policy table revised inline.
