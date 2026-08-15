/**
 * districtMap.test.js — coverage for district↔neighborhood lookups.
 *
 * Run: node lib/districtMap.test.js
 * Exits 0 on pass, 1 on failure.
 */

const dm = require('./districtMap');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: DISTRICT_NEIGHBORHOODS map shape');
{
  assert('9 districts D1-D9', Object.keys(dm.DISTRICT_NEIGHBORHOODS).length === 9);
  assert('D1 includes West Oakland', dm.DISTRICT_NEIGHBORHOODS.D1.includes('West Oakland'));
  // S256 moved KONO D2→D7 to conform to locked canon; assertions follow.
  assert('D2 includes Downtown + Chinatown', dm.DISTRICT_NEIGHBORHOODS.D2.includes('Downtown') && dm.DISTRICT_NEIGHBORHOODS.D2.includes('Chinatown'));
  assert('D7 includes Temescal + Rockridge + KONO', ['Temescal', 'Rockridge', 'KONO'].every(h => dm.DISTRICT_NEIGHBORHOODS.D7.includes(h)));
}

console.log('\nTest 2: DISTRICT_FACTIONS canon');
{
  assert('OPP includes D1, D3, D5, D9', dm.DISTRICT_FACTIONS.OPP.length === 4);
  assert('CRC includes D6, D7, D8', dm.DISTRICT_FACTIONS.CRC.length === 3);
  assert('IND includes D2, D4', dm.DISTRICT_FACTIONS.IND.length === 2);
  // Total should be 9 (all districts assigned to a faction)
  const total = dm.DISTRICT_FACTIONS.OPP.length + dm.DISTRICT_FACTIONS.CRC.length + dm.DISTRICT_FACTIONS.IND.length;
  assert('all 9 districts faction-assigned', total === 9);
}

console.log('\nTest 3: DISTRICT_HOLDERS canon');
{
  assert('D7 = Warren Ashford (CRC)', dm.DISTRICT_HOLDERS.D7 === 'Warren Ashford');
  assert('D2 = Leonard Tran (IND)', dm.DISTRICT_HOLDERS.D2 === 'Leonard Tran');
  assert('D5 = Janae Rivers (OPP)', dm.DISTRICT_HOLDERS.D5 === 'Janae Rivers');
  assert('all 9 holders present', Object.keys(dm.DISTRICT_HOLDERS).length === 9);
}

console.log('\nTest 4: getDistrictForNeighborhood');
{
  assert("Temescal → 'D7'", dm.getDistrictForNeighborhood('Temescal') === 'D7');
  assert("KONO → 'D7' (S256 canon)", dm.getDistrictForNeighborhood('KONO') === 'D7');
  assert("Adams Point → 'D8'", dm.getDistrictForNeighborhood('Adams Point') === 'D8');
  assert('case-insensitive (temescal → D7)', dm.getDistrictForNeighborhood('temescal') === 'D7');
  assert("'Unknown Place' → null", dm.getDistrictForNeighborhood('Unknown Place') === null);
  assert("'' → null", dm.getDistrictForNeighborhood('') === null);
  assert('null input → null', dm.getDistrictForNeighborhood(null) === null);
}

console.log('\nTest 5: getNeighborhoodsForDistricts');
{
  const d7 = dm.getNeighborhoodsForDistricts('D7');
  assert("'D7' returns Temescal + Rockridge + KONO", d7.length === 3 && d7.includes('Temescal'));
  const d1d3 = dm.getNeighborhoodsForDistricts('D1,D3');
  assert("'D1,D3' returns West Oakland + Brooklyn + Fruitvale + San Antonio", d1d3.length === 4);
  const empty = dm.getNeighborhoodsForDistricts('');
  assert('empty input → []', Array.isArray(empty) && empty.length === 0);
  const lowercase = dm.getNeighborhoodsForDistricts('d2');
  assert('case-insensitive (d2 → cap-D2 hoods)', lowercase.includes('Downtown'));
  const unknown = dm.getNeighborhoodsForDistricts('D99');
  assert('unknown district → []', unknown.length === 0);
}

console.log('\nTest 6: getAllNeighborhoods');
{
  const all = dm.getAllNeighborhoods();
  assert('returns array', Array.isArray(all));
  assert('count matches sum of district sizes', all.length === Object.values(dm.DISTRICT_NEIGHBORHOODS).reduce((s, ns) => s + ns.length, 0));
  assert('includes Temescal', all.includes('Temescal'));
  assert('includes KONO', all.includes('KONO'));
}

console.log('\nTest 7: civic.18 reconciliation invariants');
{
  const all = dm.getAllNeighborhoods();
  // 23 = the 22 live Neighborhood_Map rows + Montclair (ruled aboard for D6,
  // row not yet seeded). If this trips, either the ledger gained/lost a hood or
  // someone re-added a district entry with no live row — the drift class civic.18
  // closed. Reconcile against the sheet with scripts/auditHoodDrift.js.
  assert('23 hoods total (22 live rows + Montclair pending seed)', all.length === 23);
  assert('no duplicate hood across districts', new Set(all.map(h => h.toLowerCase())).size === all.length);

  // Coliseum + Elmhurst: removed as DISTRICTS (Baylight is the canon successor on
  // the same land, INSTITUTIONS §336) but still legitimate CHILDREN of East Oakland.
  assert('Coliseum has no district', dm.getDistrictForNeighborhood('Coliseum') === null);
  assert('Elmhurst has no district', dm.getDistrictForNeighborhood('Elmhurst') === null);
  assert('D5 is East Oakland + Baylight District only', dm.DISTRICT_NEIGHBORHOODS.D5.length === 2);

  // The bug civic.18 closed: INIT-006 carries neighborhoods ["Baylight District"],
  // so D5 must intersect it or Rivers' approval never moves on the $2.1B build.
  assert('Baylight District resolves to D5 (Rivers)', dm.getDistrictForNeighborhood('Baylight District') === 'D5');
  assert('D5 intersects INIT-006 neighborhoods', dm.getNeighborhoodsForDistricts('D5').includes('Baylight District'));

  // KONO: canon S256 anchors it D7 (Ashford). The approval engine sat stale at D2.
  assert('KONO resolves to D7 (Ashford), not D2', dm.getDistrictForNeighborhood('KONO') === 'D7');

  // Montclair restores Crane (D6, the recovering seat) to two neighborhoods.
  assert('Montclair resolves to D6 (Crane)', dm.getDistrictForNeighborhood('Montclair') === 'D6');
  assert('D6 has two hoods', dm.DISTRICT_NEIGHBORHOODS.D6.length === 2);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
