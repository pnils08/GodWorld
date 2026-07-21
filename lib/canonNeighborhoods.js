/**
 * lib/canonNeighborhoods.js — single source of truth for canonical Oakland
 * neighborhood names used by sim tooling (S247).
 *
 * WHY: the neighborhood-canon set was hardcoded independently in scripts/preMortemScan.js
 * (correct) and scripts/auditSimulationLedger.js (stale — only a 12-name CANON12 missing
 * Uptown/Laurel/KONO and using 'Piedmont Avenue' where the ledger stores 'Piedmont Ave').
 * The drift between the two copies made the boot-state ledger audit flag 226 VALID Map-17
 * citizens (89 Uptown + 65 Laurel + 59 Piedmont Ave + 12 KONO + 1 Ivy Hill) as
 * "non-canon drift" — a false alarm on every engine-sheet boot. Centralizing the lists
 * here kills the drift class.
 *
 * Three layers (kept distinct because callers need different granularity):
 *   CANON_12          — the core sim neighborhoods (pre-mortem SKILL §5 layer)
 *   MAP_NEIGHBORHOODS — the Neighborhood_Map / Neighborhood_Demographics roster (21 as of S256)
 *   CHILDREN          — sub-neighborhood / child-area names that legitimately appear in data
 * CANONICAL_HOODS = lowercased Set union of all three (membership test helper).
 *
 * NOTE the deliberate exclusions baked into CANON_12/MAP_NEIGHBORHOODS/CHILDREN:
 * 'Jingletown' is NOT canonical here (off-roster token). 'East Oakland' was excluded
 * until S328 — Mike-direct ruling: it is legit Oakland land mass and is represented
 * (Map roster row + v3NeighborhoodWriter profile added S328; crime profile, OARI +
 * Youth Apprenticeship affected-hood references, and a faith org already spoke it).
 */

'use strict';

const CANON_12 = ['Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt', 'West Oakland', 'Laurel',
  'Rockridge', 'Jack London', 'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'];

// S256 neighborhood-roster alignment — added KONO, Lake Merritt, Uptown (CANON_12 hoods
// where citizens already lived but the map had no row) + Baylight District (INIT-006
// Coliseum redevelopment, new canonical neighborhood). Renamed from MAP_17 — the count
// was baked into the name and it now holds 21. No external importer reads this export
// directly (only CANONICAL_HOODS is imported); caller-graph verified S256.
// S328 — East Oakland added (Mike-direct: legit Oakland land mass, represent it).
const MAP_NEIGHBORHOODS = ['Adams Point', 'Baylight District', 'Brooklyn', 'Chinatown', 'Dimond',
  'Downtown', 'East Oakland', 'Eastlake', 'Fruitvale', 'Glenview', 'Grand Lake', 'Ivy Hill',
  'Jack London', 'KONO', 'Lake Merritt', 'Laurel', 'Piedmont Ave', 'Rockridge', 'San Antonio',
  'Temescal', 'Uptown', 'West Oakland'];

const CHILDREN = ['Adams Point', 'Grand Lake', 'Lakeshore', 'Eastlake', 'Ivy Hill', 'San Antonio',
  'Dimond', 'Glenview', 'Maxwell Park', 'Old Oakland', 'City Center', 'Jack London Square',
  'Koreatown-Northgate', 'Koreatown', 'Northgate', 'Montclair', 'Claremont', 'Longfellow',
  'Shafter', 'Brooklyn'];

const CANONICAL_HOODS = new Set([...CANON_12, ...MAP_NEIGHBORHOODS, ...CHILDREN].map(s => s.toLowerCase()));

module.exports = { CANON_12, MAP_NEIGHBORHOODS, CHILDREN, CANONICAL_HOODS };
