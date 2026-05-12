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
  assert('D2 includes Downtown + KONO', dm.DISTRICT_NEIGHBORHOODS.D2.includes('Downtown') && dm.DISTRICT_NEIGHBORHOODS.D2.includes('KONO'));
  assert('D7 includes Temescal + Rockridge', dm.DISTRICT_NEIGHBORHOODS.D7.includes('Temescal') && dm.DISTRICT_NEIGHBORHOODS.D7.includes('Rockridge'));
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
  assert("KONO → 'D2'", dm.getDistrictForNeighborhood('KONO') === 'D2');
  assert("Adams Point → 'D8'", dm.getDistrictForNeighborhood('Adams Point') === 'D8');
  assert('case-insensitive (temescal → D7)', dm.getDistrictForNeighborhood('temescal') === 'D7');
  assert("'Unknown Place' → null", dm.getDistrictForNeighborhood('Unknown Place') === null);
  assert("'' → null", dm.getDistrictForNeighborhood('') === null);
  assert('null input → null', dm.getDistrictForNeighborhood(null) === null);
}

console.log('\nTest 5: getNeighborhoodsForDistricts');
{
  const d7 = dm.getNeighborhoodsForDistricts('D7');
  assert("'D7' returns Temescal + Rockridge", d7.length === 2 && d7.includes('Temescal'));
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
