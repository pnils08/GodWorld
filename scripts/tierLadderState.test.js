'use strict';
// engine.150 (S412) — the ladder as a state: Tier follows the EARNED count
// (min(cell, citations on record)), upward only, seeded cells held.
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const findDef = (fn) => { for (const d of ['utilities', 'phase01-config', 'phase05-citizens', 'phase10-persistence']) for (const f of fs.readdirSync(path.resolve(__dirname, '..', d))) { if (/\.js$/.test(f) && new RegExp('^function ' + fn + '\\(', 'm').test(R(d + '/' + f))) return d + '/' + f; } return null; };
const helperFile = findDef('findColByName_');
const intents = [], ripples = [];
const sandbox = {
  Logger: { log() {} },
  queueAppendIntent_: (ctx, tab, row) => intents.push({ tab, row }),
  recordRipple_: (ctx, r) => ripples.push(r),
  inWorldStamp_: (ctx) => 'Y3C4',
};
const src = (helperFile ? R(helperFile) + '\n' : '') + R('phase01-config/advanceSimulationCalendar.js') + '\n' + R('phase05-citizens/processAdvancementIntake.js');
const E = new Function(...Object.keys(sandbox), src + '\nreturn { applyTierLadderState_, tierForEarnedUsage_, earnedCitationsByKey_, TIER_BAR };')(...Object.values(sandbox));

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); } }

const H = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UsageCount', 'Status', 'LifeHistory', 'LastUpdated', 'Neighborhood'];
const row = (pop, first, last, tier, use, extra) => Object.assign([pop, first, last, tier, 'ENGINE', use, 'Active', '', '', 'Temescal'], extra || {});
const usage = (entries) => [['Timestamp', 'Cycle', 'CitizenName', 'UsageType']].concat(entries.map(([n, t, c]) => ['', 'C' + (c || 100), n, t || 'quoted']));
const ctxOf = (rows, usageRows) => ({
  summary: { cycleRef: 'Y3C4' }, ledger: { headers: H.slice(), rows: rows.map(r => r.slice()), dirty: false },
  ss: { getSheetByName: (n) => n === 'Citizen_Media_Usage' ? { getLastRow: () => usageRows.length, getDataRange: () => ({ getValues: () => usageRows }) } : null },
});

console.log('\n1. bars:');
check('9→1, 6→2, 3→3, 2→4, 0→4', E.tierForEarnedUsage_(9) === 1 && E.tierForEarnedUsage_(6) === 2 && E.tierForEarnedUsage_(3) === 3 && E.tierForEarnedUsage_(2) === 4 && E.tierForEarnedUsage_(0) === 4);

console.log('\n2. earned climb (state, not event):');
{
  const c = ctxOf([row('POP-1', 'Ada', 'Lin', 4, 3)], usage([['Ada Lin'], ['Ada Lin'], ['Ada Lin']]));
  const r = E.applyTierLadderState_(c, 111);
  check('cell 3 with 3 citations on record → Tier 3, no event needed', r.promoted === 1 && c.ledger.rows[0][3] === 3);
  check('LifeHistory carries the marker decay reads', /Updated to Tier 3/.test(c.ledger.rows[0][7]) && /Y3C4/.test(c.ledger.rows[0][7]));
  check('log intent carries the marker in column 4; ripple queued', intents.length === 1 && /Updated to Tier 3/.test(intents[0].row[4]) && ripples.length === 1 && ripples[0].effectType === 'tier-climb');
  check('LastUpdated stamped, ledger dirty', c.ledger.rows[0][8] === 'C111' && c.ledger.dirty === true);
}

console.log('\n3. the gifted era holds:');
{
  const c = ctxOf([row('POP-2', 'Lena', 'Okafor', 4, 14)], usage([]));
  const r = E.applyTierLadderState_(c, 111);
  check('seeded 14 with 0 citations → stays Tier 4, cell untouched, counted as held', r.promoted === 0 && r.seededHeld === 1 && c.ledger.rows[0][3] === 4 && c.ledger.rows[0][5] === 14);
  const c2 = ctxOf([row('POP-3', 'Reggie', 'Soto', 4, 12)], usage([['Reggie Soto'], ['Reggie Soto'], ['Reggie Soto']]));
  const r2 = E.applyTierLadderState_(c2, 111);
  check('seeded 12 with 3 real citations → Tier 3 (earned), not Tier 1 (cell)', r2.promoted === 1 && c2.ledger.rows[0][3] === 3);
}

console.log('\n4. never down, never a guess, never off-clock:');
{
  const c = ctxOf([row('POP-4', 'Ida', 'Park', 2, 3)], usage([['Ida Park'], ['Ida Park'], ['Ida Park']]));
  check('Tier 2 with earned 3 stays Tier 2 (decay owns the way down)', E.applyTierLadderState_(c, 111).promoted === 0 && c.ledger.rows[0][3] === 2);
  const amb = ctxOf([row('POP-5', 'Sam', 'Reyes', 4, 9), row('POP-6', 'Sam', 'Reyes', 4, 9)], usage(Array(9).fill(['Sam Reyes'])));
  const ra = E.applyTierLadderState_(amb, 111);
  check('two ledger rows on one name → both skipped as ambiguous', ra.promoted === 0 && ra.ambiguous === 2);
  const off = ctxOf([row('POP-7', 'Kai', 'Bell', 4, 9, { 4: 'GAME' }), row('POP-8', 'Ann', 'Bell', 4, 9, { 6: 'Retired' }), row('POP-8b', 'Cy', 'Bell', 4, 9, { 4: 'CIVIC' })], usage(Array(9).fill(['Kai Bell']).concat(Array(9).fill(['Ann Bell'])).concat(Array(3).fill(['Cy Bell']))));
  const ro = E.applyTierLadderState_(off, 111);
  check('GAME clock climbs on citations (builder 2026-09-02); non-active untouched; CIVIC on citations as before', ro.promoted === 2 && off.ledger.rows[0][3] === 1 && off.ledger.rows[1][3] === 4 && off.ledger.rows[2][3] === 3);
  const med = ctxOf([row('POP-M1', 'Ida', 'Quill', 4, 9, { 4: 'MEDIA' }), row('POP-M2', 'Bo', 'Quill', 4, 9, { 4: 'MEDIA' })], usage(Array(9).fill(['Ida Quill', 'mentioned']).concat([['Bo Quill', 'byline-published'], ['Bo Quill', 'byline-published'], ['Bo Quill', 'byline-landed'], ['Bo Quill', 'mentioned']])));
  const rm = E.applyTierLadderState_(med, 111);
  check('MEDIA clock: being mentioned earns nothing; two Saturday-published pieces (worth 2 each) → Tier 3', rm.promoted === 1 && med.ledger.rows[0][3] === 4 && med.ledger.rows[1][3] === 3 && /Saturday paper \(2 published\)/.test(med.ledger.rows[1][7]));
}

console.log('\n5. citations on record — emergence types only, normalized names, honorifics:');
{
  const c = ctxOf([row('POP-9', 'Rosa', 'Núñez', 4, 5)], usage([['Rosa Nunez'], ['Dr. Rosa Núñez', 'interviewed'], ['Rosa Núñez', 'byline'], ['rosa núñez', 'stats'], ['Rosa Núñez', 'featured']]));
  const cit = E.earnedCitationsByKey_(c);
  const key = Object.keys(cit)[0];
  check('accents/honorifics fold to one key; non-emergence types excluded from cited', Object.keys(cit).length === 1 && /rosa nunez|rosa n/.test(key) && cit[key].cited === 3 && cit[key].published === 0, JSON.stringify(cit));
  check('cell 5, on record ≥3 → Tier 3 (min of the two)', E.applyTierLadderState_(c, 111).promoted === 1 && c.ledger.rows[0][3] === 3);
  check('the read is cached on ctx for the cycle', c._earnedCitations150 === cit);
}

console.log('\n6. the citation event no longer decides Tier (grep-as-test):');
{
  const a = R('phase05-citizens/processAdvancementIntake.js');
  const fn = (name) => { const i = a.indexOf('function ' + name); const j = a.indexOf('\nfunction ', i + 1); return a.slice(i, j < 0 ? undefined : j); };
  check('processMediaUsage_ carries no bar comparison', !/newUsage >= [369]/.test(fn('processMediaUsage_')));
  check('the state pass runs before decay in the main sequence', a.indexOf('applyTierLadderState_(ctx, cycle)') < a.indexOf('decayMediaAttention_(ctx, cycle);'));
  check('decay recognises the old climb line as an earned rung (canon on record)', /Advanced from Tier \\d to Tier \(\\d\)/.test(fn('decayMediaAttention_')));
  check('decay covers ENGINE + GAME + MEDIA, holds CIVIC', /mode9 !== 'ENGINE' && mode9 !== 'GAME' && mode9 !== 'MEDIA'/.test(fn('decayMediaAttention_')));
}

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
