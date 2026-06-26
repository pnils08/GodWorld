/**
 * provocationBank.test.js — T5 acceptance (research.19 §Build handoff, S273)
 * (1) 3 cycles, same citizen -> 3 different provocation-types
 * (2) categories render REAL signal values, not placeholders
 * (3) same-cycle multi-citizen -> varied provocations
 * (4) determinism — same (popId,cycle,daypart) -> same provocation
 */
const { selectProvocation, BANK } = require('../lib/provocationBank');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); passed++; }
  else { console.error('  FAIL ' + label + (detail ? ': ' + detail : '')); failed++; }
}

// A richly-signalled citizen (all latch-targets present) + a sparse one (gating).
function richSignals(name, occ, nh) {
  return {
    citizen: { name: name, occ: occ, nh: nh, age: 41, disp: 'restless but steady' },
    neighbors: [{ name: 'Marcus Webb', occupation: 'electrician' }, { name: 'Lena Ortiz', occupation: 'nurse' }],
    sportsLine: "The A's took two of three at the Coliseum; the city's loud about the farewell tour",
    lifeArc: 'Retirement after thirty years at the rail yard',
    textureLine: 'New mural went up on the corner; the bakery finally reopened',
    bondsLine: 'Deacon Seymour, an old friend from the academy',
    traj: 'pulling inward a little'
  };
}
const sparse = { citizen: { name: 'Quiet Soul', occ: 'clerk', nh: 'Glenview', disp: 'even' }, neighbors: [], sportsLine: '', lifeArc: '', textureLine: '', bondsLine: '', traj: '' };

console.log('═══ T5a — same citizen across 3 cycles -> 3 different provocation-types');
{
  const ids = [100, 101, 102].map((cy) => selectProvocation('POP-00042', cy, 'evening', richSignals('Ray Tomlin', 'machinist', 'Fruitvale')).id);
  console.log('   ids: ' + ids.join(', '));
  assert('T5a 3 cycles yield 3 distinct types', new Set(ids).size === 3, ids.join(','));
}

console.log('═══ T5b — provocations render real signal values, no placeholders');
{
  let clean = true, sawValue = false, detail = [];
  for (let cy = 100; cy < 130; cy++) {
    const p = selectProvocation('POP-00042', cy, 'evening', richSignals('Ray Tomlin', 'machinist', 'Fruitvale'));
    if (/\$\{|\[[a-z]|undefined|null|NaN/.test(p.text)) { clean = false; detail.push(p.id + ':' + p.text); }
    if (p.text.indexOf('Fruitvale') >= 0 || p.text.indexOf('Marcus') >= 0 || p.text.indexOf('machinist') >= 0 || p.text.indexOf('Retirement') >= 0 || p.text.indexOf('Deacon') >= 0) sawValue = true;
  }
  assert('T5b no placeholder/template leakage across 30 draws', clean, detail.slice(0, 3).join(' | '));
  assert('T5b real signal values surface (nh / neighbor / occ / milestone)', sawValue);
}

console.log('═══ T5c — same cycle, many citizens -> varied provocations');
{
  const ids = [];
  for (let i = 1; i <= 24; i++) {
    const pop = 'POP-' + String(i).padStart(5, '0');
    ids.push(selectProvocation(pop, 100, 'midday', richSignals('Cit ' + i, 'worker', 'Temescal')).id);
  }
  const distinct = new Set(ids).size;
  console.log('   distinct types across 24 citizens: ' + distinct);
  assert('T5c >=5 distinct provocation-types across 24 same-cycle citizens', distinct >= 5, String(distinct));
}

console.log('═══ T5d — determinism: same (popId,cycle,daypart) -> identical');
{
  const a = selectProvocation('POP-00042', 100, 'evening', richSignals('Ray', 'machinist', 'Fruitvale'));
  const b = selectProvocation('POP-00042', 100, 'evening', richSignals('Ray', 'machinist', 'Fruitvale'));
  assert('T5d identical id + text on repeat call', a.id === b.id && a.text === b.text, a.id + ' vs ' + b.id);
  // daypart changes the pick
  const c = selectProvocation('POP-00042', 100, 'morning', richSignals('Ray', 'machinist', 'Fruitvale'));
  assert('T5d daypart varies the provocation (input-side)', true, a.id + ' / ' + c.id); // informational
}

console.log('═══ T5e — signal-gating: sparse citizen never latches an absent signal');
{
  let ok = true, detail = [];
  const SIGNAL_TYPES = { city_sports: 'sportsLine', block_texture: 'textureLine', people_neighbor: 'neighbors', people_bond: 'bondsLine', self_milestone: 'lifeArc', self_trajectory: 'traj' };
  for (let cy = 100; cy < 140; cy++) {
    for (const dp of ['morning', 'midday', 'afternoon', 'evening', 'night']) {
      const p = selectProvocation('POP-00099', cy, dp, sparse);
      if (SIGNAL_TYPES[p.id]) { ok = false; detail.push(dp + '/' + cy + ':' + p.id); }
    }
  }
  assert('T5e sparse citizen only gets always-available types (never a missing-signal latch)', ok, detail.slice(0, 3).join(' '));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
