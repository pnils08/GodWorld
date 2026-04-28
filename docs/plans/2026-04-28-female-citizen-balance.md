---
title: Female Citizen Balance Ingest Plan
created: 2026-04-28
updated: 2026-04-28
type: plan
tags: [engine, citizens, architecture, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md (S184 INGEST item — UNBLOCKED → this plan)
  - docs/plans/2026-04-28-intake-side-citizen-derivation.md (library this plan consumes)
  - lib/citizenDerivation.js (deriveCitizenProfile + genderOverride)
  - data/citizen_female_first_names.json (Phase 1 output, this session)
  - phase05-citizens/generateGenericCitizens.js v2.7 (lastNames pool + cluster-cap pattern)
  - scripts/backfillLifecycleDefaults.js (script-pattern template)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (INGEST item)"
  - "[[plans/2026-04-28-intake-side-citizen-derivation]] — library this plan consumes"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered in same commit"
---

# Female Citizen Balance Ingest Plan

**Goal:** Ingest 150 new female citizens into Simulation_Ledger to bring the live gender share from 33% F → 40.7% F. Go-forward correction only — existing canon untouched per Mike's S184 constraint. Uses the S184 derivation library (`lib/citizenDerivation.js`) with `genderOverride='female'` so all 8 demographic + lifecycle fields land populated and realistic at intake time.

**Why now:** Live SL is 462M / 220F across 760 rows (77 blank gender). Real Oakland baseline is closer to 50/50 with mild lean. The skew originated in pre-S184 generation logic; was UNBLOCKED at session-end S184 once the derivation library shipped + got clasp-deployed. Capability reviewer assertion #9 (≥3 female citizens in non-official roles per edition) has flagged thin coverage before — bringing the share above 40% gives sift + write-edition more headroom.

**Terminal:** cross-terminal — research-build owns Phases 1-2 (curation + CDFs, both DONE this session); engine-sheet owns Phases 3-5 (script + dry-run + apply).

**Acceptance criteria:**
1. 150 new SL rows land with sequential POPIDs, all `Gender='female'`, all `Notes='female-balance-c92 ingest'` marker
2. All 8 derived fields populated (no empty cells, no 'Citizen' literal in RoleType), BirthYear + Neighborhood + Tier=4 present
3. Determinism: re-run with same seed produces byte-identical JSON output (timestamp fields excluded)
4. Post-apply live SL female share ≥40%
5. Cluster check: no first name >3, no last name >4 within new 150 (combined with live SL existing counts)
6. Distribution healthy: ≥5 marital statuses, ≥6 child-count buckets, ≥30 distinct RoleTypes; neighborhood spread within ±5% of CDF; age-bracket spread within ±5%
7. Capability reviewer assertion #9 has more headroom on next /sift run

**Pointers:**
- Library: `lib/citizenDerivation.js` exports `deriveCitizenProfile(seed, age, neighborhood, ledgerFreq, options)` — accepts `options.genderOverride='female'`
- Library has `BASE_FEMALE_PCT = 0.51` + `NEIGHBORHOOD_GENDER_VARIANCE` map; the override bypasses the gender draw entirely (always returns 'female')
- Script-pattern template: `scripts/backfillLifecycleDefaults.js` (S184 — Node + service-account direct writes via `lib/sheets.js`, djb2 determinism, dry-run default + `--apply` flag)
- Cluster-cap pattern: `phase05-citizens/generateGenericCitizens.js` v2.7 (`getUniqueName` with `firstCounts`/`lastCounts` maps, FIRST=3 / LAST=4)
- Last-name pool source: v2.7's 144-name `lastNames` array (lines 264-292 of generateGenericCitizens.js); copy inline to script in Phase 3 starting commit. No new last-name file.

---

## Phase 1 — Female first-name pool (research-build) — DONE S184

**Output:** `data/citizen_female_first_names.json` (150 names, schema'd JSON with origin tags)

Distribution by origin:
- Latina: 30
- Black / African American: 30
- East / Southeast Asian: 20
- South Asian: 15
- Middle Eastern / North African: 15
- African (West/East — distinct from African American): 10
- Anglo: 30

Curation rules applied:
- Net-additive vs v2.7 pool: zero hard duplicates with v2.7's female-coded names
- Tier-3 (real public figure) screen: 9 swaps logged in changelog (Lupita→Margarita, Selena dropped, Whitney dropped, Tyra dropped, Indira→Ishani, Greta→Gwendolyn, Bhumi→Bhavna, Tinashe→Wanjiru, Saoirse→Sloane)
- Each entry tagged `{name, origin}` for distribution audit at runtime

---

## Phase 2 — Age + neighborhood CDFs (research-build) — DONE S184

### Age CDF (Oakland adult realistic)

| Bracket | Pct | Cumulative | Draw within bracket |
|---------|-----|-----------|---------------------|
| 18-29   | 22% | 0.22 | uniform[18, 29] |
| 30-44   | 28% | 0.50 | uniform[30, 44] |
| 45-59   | 22% | 0.72 | uniform[45, 59] |
| 60-74   | 20% | 0.92 | uniform[60, 74] |
| 75+     | 8%  | 1.00 | uniform[75, 92] |

`BirthYear = ANCHOR_YEAR (2041) - drawnAge`. Anchor matches `lib/citizenDerivation.js`.

### Neighborhood CDF (canon-12 only, ±2% female-density skew)

| Neighborhood   | Pct   | Cumulative |
|----------------|-------|-----------|
| Lake Merritt   | 10.5% | 0.105 |
| Rockridge      | 10.0% | 0.205 |
| Temescal       | 9.5%  | 0.300 |
| Piedmont Ave   | 9.0%  | 0.390 |
| Uptown         | 8.5%  | 0.475 |
| Downtown       | 8.5%  | 0.560 |
| Jack London    | 8.5%  | 0.645 |
| KONO           | 8.0%  | 0.725 |
| Laurel         | 8.0%  | 0.805 |
| Chinatown      | 7.5%  | 0.880 |
| Fruitvale      | 6.5%  | 0.945 |
| West Oakland   | 5.5%  | 1.000 |

Adams Point isn't canon-12 (it's fine-grained Neighborhood_Map); skipped per "draw from canon-12 only" constraint. Lake Merritt is its canon-12 parent and gets the largest weight as a stand-in. Skew calibrated against real Oakland female-density patterns (high-amenity walkable neighborhoods skew slightly female in 25-45 demographic; family-heavy + working-class neighborhoods skew slightly male).

---

## Phase 3 — Build ingest script (engine-sheet)

### File: `scripts/ingestFemaleCitizensBalance.js`

**Pattern:** mirror `scripts/backfillLifecycleDefaults.js` — Node + service-account direct writes via `lib/sheets.js`. Per `engine.md`: "No maintenance scripts for ledger work" applies to silent-skip migration tooling; this is a one-shot ingest with explicit idempotency guards, observable JSON output, and reversible POPID range.

### Imports

```javascript
require('../lib/env');
const sheets = require('../lib/sheets');
const library = require('../lib/citizenDerivation');
const NAME_POOL = require('../data/citizen_female_first_names.json');
const fs = require('fs');
const path = require('path');
```

### Constants

```javascript
const SHEET = 'Simulation_Ledger';
const TARGET_COUNT = 150;
const SEED = 'female-balance-c92';
const ANCHOR_YEAR = 2041;
const FIRST_NAME_CAP = 3;
const LAST_NAME_CAP = 4;
const MARKER = 'female-balance-c92 ingest';

// Copy from phase05-citizens/generateGenericCitizens.js lines 264-292.
// Inline (not require) since this is a one-shot script — coupling
// to the engine source via const-copy is acceptable for the ingest window.
const LAST_NAMES = [ /* 144 entries from v2.7 */ ];

const AGE_CDF = [
  { max: 0.22, lo: 18, hi: 29 },
  { max: 0.50, lo: 30, hi: 44 },
  { max: 0.72, lo: 45, hi: 59 },
  { max: 0.92, lo: 60, hi: 74 },
  { max: 1.00, lo: 75, hi: 92 },
];

const NEIGHBORHOOD_CDF = [
  { max: 0.105, nbhd: 'Lake Merritt' },
  { max: 0.205, nbhd: 'Rockridge' },
  { max: 0.300, nbhd: 'Temescal' },
  { max: 0.390, nbhd: 'Piedmont Ave' },
  { max: 0.475, nbhd: 'Uptown' },
  { max: 0.560, nbhd: 'Downtown' },
  { max: 0.645, nbhd: 'Jack London' },
  { max: 0.725, nbhd: 'KONO' },
  { max: 0.805, nbhd: 'Laurel' },
  { max: 0.880, nbhd: 'Chinatown' },
  { max: 0.945, nbhd: 'Fruitvale' },
  { max: 1.000, nbhd: 'West Oakland' },
];
```

### Determinism helpers

```javascript
function djb2(s) {
  let h = 5381;
  s = String(s || '');
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function rand01(seed, salt) {
  const h = djb2(String(seed) + ':' + String(salt));
  return (h >>> 0) / 0xffffffff;
}

function pickFromCDF(r, cdf) {
  for (const entry of cdf) if (r < entry.max) return entry;
  return cdf[cdf.length - 1];
}
```

### Algorithm

1. **Load live SL state.** Read full sheet, get headers, identify max POPID by parsing `POP-XXXXX` (numeric suffix).
2. **Idempotency guard.** Walk live rows: if any row has `Notes` containing `'female-balance-c92'` marker, abort with explicit error ("ingest already applied — see existing rows POPID-X..POPID-Y"). Or if `POP-${maxPopid+1}` is already populated (race condition / parallel writer), abort.
3. **Build firstCounts / lastCounts maps** from live SL (existing clusters). These start as the snapshot; new draws increment them locally so subsequent draws in the same run respect newly-assigned names.
4. **Build ledgerFreq snapshot** for derivation library. If `library.buildLedgerFreqSnapshot` is exported, call it; otherwise inline the snapshot construction (RoleType counts per neighborhood, EducationLevel counts per neighborhood). Phase 3 starting task confirms which path.
5. **Generate 150 candidates** (loop `i = 0..149`):
   ```
   candidateSeed = djb2(SEED + ':' + i)
   firstName    = drawWithCap(NAME_POOL.names, firstCounts, FIRST_NAME_CAP, candidateSeed, 'first')
   lastName     = drawWithCap(LAST_NAMES,       lastCounts,  LAST_NAME_CAP,  candidateSeed, 'last')
   firstCounts[firstName]++; lastCounts[lastName]++
   age          = drawAge(candidateSeed)         // CDF + uniform within bracket
   neighborhood = drawNeighborhood(candidateSeed)
   popId        = 'POP-' + String(maxPopid + 1 + i).padStart(5, '0')
   rowSeed      = djb2(firstName + '|' + lastName + '|' + popId)
   profile      = library.deriveCitizenProfile(rowSeed, age, neighborhood, ledgerFreq, { genderOverride: 'female' })
   row          = composeRow(popId, firstName, lastName, ANCHOR_YEAR - age, neighborhood, profile, MARKER)
   ```
6. **`drawWithCap`** does rejection-draw: pick `NAME_POOL.names[Math.floor(rand01(seed, salt + retry) * pool.length)]`, retry up to 50 times before fail-loud.
7. **Compose row.** Map to live SL header order. Required fields: POPID, FirstName, LastName, BirthYear, Tier=4, Status='active', ClockMode='ENGINE', RoleType, EducationLevel, Gender='female', YearsInCareer, DebtLevel, NetWorth, MaritalStatus, NumChildren, Neighborhood, CreatedAt=now, LastUpdated=now, Notes=MARKER, plus any other columns required by current SL schema (read live headers, populate sensibly or leave empty per existing-column conventions).
8. **Write `output/female_balance_ingest_c92.json`** always (dry-run AND apply). Format: `{ generated: ISO, seed, count, applied: bool, popIdRange: [start, end], rows: [...] }`.
9. **If `--apply`:** call `lib/sheets` to append all 150 rows in one batch. Read back to verify. Update JSON with `applied:true` + actual landed POPIDs + post-apply F-share number.

### CLI

```
node scripts/ingestFemaleCitizensBalance.js              # default: dry-run, JSON preview
node scripts/ingestFemaleCitizensBalance.js --apply      # live writes
node scripts/ingestFemaleCitizensBalance.js --seed name  # override seed (default 'female-balance-c92')
node scripts/ingestFemaleCitizensBalance.js --count 100  # override target count (default 150)
```

---

## Phase 4 — Dry-run validation gates (engine-sheet)

Run `node scripts/ingestFemaleCitizensBalance.js` (no `--apply`). All 5 gates must be green before Phase 5.

| Gate | Check | Pass criterion |
|------|-------|----------------|
| **1. Count + gender** | Generated 150 rows | All `Gender='female'`, all distinct sequential POPIDs starting at `maxPopid+1` |
| **2. Field completeness** | All 8 derived fields populated + BirthYear + Neighborhood + Tier | No empty cells; no 'Citizen' literal in RoleType; Tier=4 on all rows |
| **3. Determinism** | Re-run with same seed | Byte-identical JSON output (timestamp fields excluded from diff) |
| **4. Distribution** | Spread checks across the 150 | ≥5 marital statuses, ≥6 child-count buckets, ≥30 distinct RoleTypes; neighborhood spread within ±5% of CDF; age-bracket spread within ±5% of CDF |
| **5. Cluster cap** | First/last counts combined with live SL existing | No first name >3 in (existing + new), no last name >4 in (existing + new) |

If any gate fails: surface specific row-level evidence in the JSON output, fix in Phase 3, re-run Phase 4. Do not proceed to Phase 5 until all 5 green.

---

## Phase 5 — Apply + verify (engine-sheet)

1. **Apply:** `node scripts/ingestFemaleCitizensBalance.js --apply`
2. **Read back:**
   - Count rows where `POPID` in expected range (`maxPopid+1` to `maxPopid+150`) → assert == 150
   - All have `Gender='female'` → assert
   - All 8 derived fields populated → assert (no empty cells)
   - All have `Notes` containing marker `'female-balance-c92 ingest'` → assert
3. **Compute post-apply gender share:** count F / total → assert ≥40% (math: 220+150=370F; 760+150=910 total; 370/910 = 40.7%)
4. **Sample 5 random new rows** for sanity (Mike review):
   - Name plausibility (first + last reads as a real person)
   - Role plausibility (RoleType makes sense for age + neighborhood + education)
   - Neighborhood + age coherence (no 89-year-olds in club districts, etc.)
5. **Save audit JSON:** `output/female_balance_ingest_c92.json` with `applied:true` + actual landed POPIDs + post-apply F-share number
6. **Update ROLLOUT entry to DONE** with commit hash + final F-share number; mark plan changelog DONE

---

## Out of scope

- Modifying existing 220F citizens (S184 constraint — go-forward only)
- Generic_Citizens tab updates (one-shot SL ingest only; Generic_Citizens has its own generation pipeline via v2.7)
- Engine code changes (script is a one-time correction; library already does the derivation work)
- Real-figure scrub on existing-citizen names (separate cleanup if needed)
- Routing through `processAdvancementIntake.js` cycle path (direct-write is cleaner for one-shot per Mike's S184 call; library was integrated into that path in S184 for cycle-time intake, this script bypasses for batch correction)
- Re-balancing toward 50% female (40.7% is enough headroom for capability reviewer; 50% would need ~462 new rows and starts to dominate the ledger)

---

## Open questions

None — all four S184 calls locked (count=150, name pool=fresh curated list, write path=direct, age=Oakland CDF).

---

## Changelog

- 2026-04-28 — Initial draft (S184, research-build). All 4 Mike calls locked at draft time. Phase 1 + Phase 2 done in same session as plan write: `data/citizen_female_first_names.json` shipped (150 names, 7 origins, 9 tier-3 swaps logged), CDFs specced inline. Phase 3-5 handed to engine-sheet. Library + script-pattern template both proven S184; this plan composes them.
