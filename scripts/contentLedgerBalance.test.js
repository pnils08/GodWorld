/**
 * contentLedgerBalance.test.js — Phase 5 PoolKey mass-balancing contract.
 *
 * Run: node scripts/contentLedgerBalance.test.js
 */

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'phase05-citizens', 'generateCitizensEvents.js'),
  'utf8'
);
const balance = new Function(
  source + '\nreturn balanceContentLedgerPoolWeights_;'
)();

let pass = 0, fail = 0;
function check(name, condition, detail) {
  if (condition) { pass++; console.log('  ok  ' + name); }
  else {
    fail++;
    console.error('  FAIL ' + name + (detail ? ': ' + detail : ''));
  }
}

function near(a, b) {
  return Math.abs(a - b) < 1e-9;
}

function sum(entries) {
  return entries.reduce((total, entry) => total + Number(entry.weight || 0), 0);
}

function poolMass(entries, key) {
  return sum(entries.filter(entry => entry.eclPoolKey === key));
}

// Two differently sized PoolKeys receive equal aggregate mass while the
// ledger's original total and within-pool ratios are preserved.
{
  const hardcoded = { text: 'hardcoded', weight: 7 };
  const rows = [
    hardcoded,
    { text: 'a-heavy', weight: 6, eclPoolKey: 'pool.a' },
    { text: 'a-light', weight: 3, eclPoolKey: 'pool.a' },
    { text: 'b-only', weight: 1, eclPoolKey: 'pool.b' }
  ];
  const ledgerBefore = sum(rows.filter(row => row.eclPoolKey));
  const returned = balance(rows);
  const aMass = poolMass(rows, 'pool.a');
  const bMass = poolMass(rows, 'pool.b');

  check('returns the original pool array', returned === rows);
  check('hardcoded entry weight is unchanged', hardcoded.weight === 7);
  check('total ledger mass is preserved',
    near(aMass + bMass, ledgerBefore), `${aMass + bMass} != ${ledgerBefore}`);
  check('eligible PoolKeys receive equal mass', near(aMass, bMass), `${aMass} != ${bMass}`);
  check('within-PoolKey row ratio is preserved',
    near(rows[1].weight / rows[2].weight, 2));
}

// Trait/dial-adjusted row ratios are treated as the effective within-bucket
// weights; balancing does not flatten rows inside a PoolKey.
{
  const rows = [
    { text: 'dial-up', weight: 1.5, eclPoolKey: 'pool.work' },
    { text: 'dial-down', weight: 0.5, eclPoolKey: 'pool.work' },
    { text: 'other', weight: 4, eclPoolKey: 'pool.hood' }
  ];
  balance(rows);
  check('effective dial ratio survives balancing',
    near(rows[0].weight / rows[1].weight, 3));
  check('adjusted buckets still have equal aggregate mass',
    near(poolMass(rows, 'pool.work'), poolMass(rows, 'pool.hood')));
}

// With fewer than two ledger PoolKeys there is nothing to balance.
{
  const one = [
    { text: 'only-a', weight: 9, eclPoolKey: 'pool.only' },
    { text: 'only-b', weight: 2, eclPoolKey: 'pool.only' },
    { text: 'hardcoded', weight: 5 }
  ];
  const before = one.map(row => row.weight);
  balance(one);
  check('single PoolKey is byte-for-byte weight stable',
    one.every((row, i) => row.weight === before[i]));

  const none = [{ text: 'hardcoded-a', weight: 2 }, { text: 'hardcoded-b', weight: 3 }];
  const noneBefore = none.map(row => row.weight);
  balance(none);
  check('hardcoded-only pool is weight stable',
    none.every((row, i) => row.weight === noneBefore[i]));
}

// Same inputs always produce identical weights and the function consumes no
// RNG because it accepts no RNG and contains no random call.
{
  const make = () => [
    { text: 'a', weight: 60, eclPoolKey: 'pool.a' },
    { text: 'b', weight: 1, eclPoolKey: 'pool.b' },
    { text: 'c', weight: 2, eclPoolKey: 'pool.b' }
  ];
  const a = make(), b = make();
  balance(a);
  balance(b);
  check('balancing is deterministic',
    JSON.stringify(a.map(row => row.weight)) === JSON.stringify(b.map(row => row.weight)));
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
