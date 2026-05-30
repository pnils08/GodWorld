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
 *   CANON_12  — the core sim neighborhoods (pre-mortem SKILL §5 layer)
 *   MAP_17    — the Neighborhood_Map / Neighborhood_Demographics 17-row roster
 *   CHILDREN  — sub-neighborhood / child-area names that legitimately appear in data
 * CANONICAL_HOODS = lowercased Set union of all three (membership test helper).
 *
 * NOTE the deliberate exclusions baked into CANON_12/MAP_17/CHILDREN: 'East Oakland'
 * and 'Jingletown' are NOT canonical here (broad-region / off-roster tokens). Callers
 * that have historically treated 'East Oakland' as canon (auditSimulationLedger's own
 * CANON12) should union their local set, not mutate this one.
 */

'use strict';

const CANON_12 = ['Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt', 'West Oakland', 'Laurel',
  'Rockridge', 'Jack London', 'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'];

const MAP_17 = ['Adams Point', 'Brooklyn', 'Chinatown', 'Dimond', 'Downtown', 'Eastlake', 'Fruitvale',
  'Glenview', 'Grand Lake', 'Ivy Hill', 'Jack London', 'Laurel', 'Piedmont Ave', 'Rockridge',
  'San Antonio', 'Temescal', 'West Oakland'];

const CHILDREN = ['Adams Point', 'Grand Lake', 'Lakeshore', 'Eastlake', 'Ivy Hill', 'San Antonio',
  'Dimond', 'Glenview', 'Maxwell Park', 'Old Oakland', 'City Center', 'Jack London Square',
  'Koreatown-Northgate', 'Koreatown', 'Northgate', 'Montclair', 'Claremont', 'Longfellow',
  'Shafter', 'Brooklyn'];

const CANONICAL_HOODS = new Set([...CANON_12, ...MAP_17, ...CHILDREN].map(s => s.toLowerCase()));

module.exports = { CANON_12, MAP_17, CHILDREN, CANONICAL_HOODS };
