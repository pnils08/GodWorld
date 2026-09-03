'use strict';
// engine.150 (S412) — the ladder as a state: Tier follows the EARNED count
// (min(cell, citations on record)), upward only, seeded cells held.
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const findDef = (fn) => { for (const d of ['utilities', 'phase01-config', 'phase05-citizens', 'phase10-persistence']) for (const f of fs.readdirSync(path.resolve(__dirname, '..', d))) { if (/\.js$/.test(f) && new RegExp('^function ' + fn + '\\(', 'm').test(R(d + '/' + f))) return d + '/' + f; } return null; };
const helperFile = findDef('findColByName_');
const intents = [], ripples = [], registered = [], cellsG = [];
const sandbox = {
  registerCulturalEntity_: (ctx, name, role, j, hood) => registered.push({ name, role, j, hood }),
  Logger: { log() {} },
  queueAppendIntent_: (ctx, tab, row) => intents.push({ tab, row }),
  queueCellIntent_: () => {},
  recordRipple_: (ctx, r) => ripples.push(r),
  inWorldStamp_: (ctx) => 'Y3C4',
};
const src = (helperFile ? R(helperFile) + '\n' : '') + R('phase01-config/advanceSimulationCalendar.js') + '\n' + R('phase05-citizens/processAdvancementIntake.js');
const E = new Function(...Object.keys(sandbox), src + '\nreturn { applyTierLadderState_, tierForEarnedUsage_, earnedCitationsByKey_, intakeTierForExisting_, decayMediaAttention_, processMediaUsage_, dimCulturalFame_, TIER_BAR, FAME_USAGE_BAR };')(...Object.values(sandbox));

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); } }

const H = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UsageCount', 'Status', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'Famous'];
const row = (pop, first, last, tier, use, extra) => Object.assign([pop, first, last, tier, 'ENGINE', use, 'Active', '', '', 'Temescal', ''], extra || {});
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

console.log('\n6. intake never lowers an existing citizen (pure):');
{
  const f = E.intakeTierForExisting_;
  check('blank intake Tier keeps the row (1 stays 1, 4 stays 4)', f(1, '') === 1 && f(4, '') === 4 && f(1, null) === 1);
  check('a stated lower rank never drops the row (1 vs 3 → 1)', f(1, 3) === 1 && f(2, '4') === 2);
  check('a stated higher rank lifts (4 vs 2 → 2)', f(4, 2) === 2 && f(3, '1') === 1);
  check('garbage keeps the row', f(2, 'x') === 2 && f(2, 9) === 2 && f('', '') === 4);
  const a = R('phase05-citizens/processAdvancementIntake.js');
  check('the existing-row branch goes through the guard and only logs the marker on a real move', /tier = intakeTierForExisting_\(tierBefore/.test(a) && /tier !== tierBefore \? 'Updated to Tier '/.test(a));
}

console.log('\n7. the citation event no longer decides Tier (grep-as-test):');
{
  const a = R('phase05-citizens/processAdvancementIntake.js');
  const fn = (name) => { const i = a.indexOf('function ' + name); const j = a.indexOf('\nfunction ', i + 1); return a.slice(i, j < 0 ? undefined : j); };
  check('processMediaUsage_ carries no bar comparison', !/newUsage >= [369]/.test(fn('processMediaUsage_')));
  check('the state pass runs before decay in the main sequence', a.indexOf('applyTierLadderState_(ctx, cycle)') < a.indexOf('decayMediaAttention_(ctx, cycle);'));
  check('decay recognises the old climb line as an earned rung (canon on record)', /Advanced from Tier \\d to Tier \(\\d\)/.test(fn('decayMediaAttention_')));
  // functional: which log lines make a rung EARNED
  const decayCtx = (logRows) => ({ summary: { cycleRef: 'Y3C4' }, ledger: { headers: H.slice(), rows: [row('POP-D', 'Quiet', 'Person', 3, 2)], dirty: false },
    ss: { getSheetByName: (n) => n === 'Citizen_Media_Usage' ? { getLastRow: () => 2, getDataRange: () => ({ getValues: () => [['Timestamp', 'Cycle', 'CitizenName', 'UsageType'], ['', 'C90', 'Quiet Person', 'quoted']] }) }
      : n === 'LifeHistory_Log' ? { getLastRow: () => logRows.length + 1, getDataRange: () => ({ getValues: () => [['Timestamp', 'POPID', 'Name', 'Type', 'Text', '', 'Cycle']].concat(logRows) }) } : null } });
  const runDecay = (logRows) => { const c = decayCtx(logRows); E.decayMediaAttention_(c, 111); return c.ledger.rows[0][3]; };
  check('intake stamp "Updated to Tier 3" on an Advancement row is AUTHORED — quiet row holds Tier 3', runDecay([['', 'POP-D', 'Quiet Person', 'Advancement', 'Updated to Tier 3. media usage', '', 100]]) === 3);
  check('old climb "Advanced from Tier 4 to Tier 3" (Promotion) is EARNED — quiet row falls to 4', runDecay([['', 'POP-D', 'Quiet Person', 'Promotion', 'Advanced from Tier 4 to Tier 3', '', 100]]) === 4);
  check('state-pass line (Media|tier-climb) is EARNED — quiet row falls to 4', runDecay([['C100', 'POP-D', 'Quiet Person', 'Media|tier-climb', 'Updated to Tier 3 — earned on 3 citations (was Tier 4)', '', 100]]) === 4);
  check('no marker at all — held', runDecay([]) === 3);
  check('decay covers ENGINE + GAME; MEDIA and CIVIC held', /mode9 !== 'ENGINE' && mode9 !== 'GAME'\)\) continue/.test(fn('decayMediaAttention_')) && !/mode9 !== 'MEDIA'/.test(fn('decayMediaAttention_')));
}

console.log('\n8. engine.152 — coverage runs both ways:');
{
  const usage2 = (entries) => [['Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter', 'Processed', 'Sentiment']].concat(entries.map(([n, t, s, p]) => ['', 'C111', n, t || 'quoted', 'ctx-' + n, '', p || '', s || '']));
  const mkSs = (usageRows, gcRows) => { const set = []; return { set, getSheetByName: (n) => n === 'Citizen_Media_Usage' ? { getLastRow: () => usageRows.length, getDataRange: () => ({ getValues: () => usageRows }), getRange: (r, c) => ({ setValue: (v) => set.push([r, c, v]) }) } : n === 'Generic_Citizens' && gcRows ? { getDataRange: () => ({ getValues: () => gcRows }), getRange: (r, c) => ({ setValue: (v) => set.push(['gc', r, c, v]) }) } : null }; };
  const cited = E.earnedCitationsByKey_({ ss: mkSs(usage2([['Ada Lin', 'quoted', 'positive'], ['Ada Lin', 'quoted', 'negative'], ['Ada Lin', 'mentioned', ''], ['Ada Lin', 'byline-published', 'negative']])) });
  check('earned splits cited vs hard; blank = neutral; a hard byline is still a byline', cited['ada lin'].cited === 3 && cited['ada lin'].hard === 1 && cited['ada lin'].published === 1, JSON.stringify(cited));
  const c1 = ctxOf([row('POP-H', 'Ada', 'Lin', 4, 4)], usage2([['Ada Lin', 'quoted', 'positive'], ['Ada Lin', 'quoted', 'negative'], ['Ada Lin', 'quoted', 'negative']]));
  check('state pass reads cited − hard: cell 4, 1 good − 2 hard → earned 0 → stays Tier 4', E.applyTierLadderState_(c1, 111).promoted === 0 && c1.ledger.rows[0][3] === 4);
  // processMediaUsage_: a negative citation counts against, writes the life line, and gives a GC no ticket
  intents.length = 0;
  const gc = [['First', 'Last', 'EmergenceCount', 'Status'], ['Bo', 'Field', 1, 'Active']];
  const ss2 = mkSs(usage2([['Ada Lin', 'quoted', 'negative'], ['Ida Park', 'quoted', 'positive'], ['Bo Field', 'mentioned', 'negative']]), gc);
  const c2 = { summary: { cycleRef: 'Y3C4' }, ss: ss2, ledger: { headers: H.slice(), rows: [row('POP-H', 'Ada', 'Lin', 4, 3), row('POP-I', 'Ida', 'Park', 4, 1)], dirty: false } };
  const r2 = E.processMediaUsage_(c2, 'now', 111);
  check('negative citation: UsageCount 3 → 2, life line + log row written', c2.ledger.rows[0][5] === 2 && /Named in a hard light/.test(c2.ledger.rows[0][7]) && intents.some(i => i.tab === 'LifeHistory_Log' && /hard-light/.test(i.row[3])) && r2.hardLight === 1);
  check('positive citation still +1; Tier untouched by the event itself', c2.ledger.rows[1][5] === 2 && c2.ledger.rows[1][3] === 4);
  check('a hard mention gives a Generic citizen no EmergenceCount', !ss2.set.some(s => s[0] === 'gc'));
  const c3 = { summary: {}, ss: mkSs([['Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter', 'Processed'], ['', 'C111', 'Ada Lin', 'quoted', '', '', '']]), ledger: { headers: H.slice(), rows: [row('POP-H', 'Ada', 'Lin', 4, 0)], dirty: false } };
  E.processMediaUsage_(c3, 'now', 111);
  check('Sentiment header self-arms when absent (like Processed)', c3.ss.set.some(s => s[2] === 'Sentiment') && c3.ledger.rows[0][5] === 1);
  const floor = { summary: {}, ss: mkSs(usage2([['Ada Lin', 'quoted', 'negative']])), ledger: { headers: H.slice(), rows: [row('POP-H', 'Ada', 'Lin', 4, 0)], dirty: false } };
  E.processMediaUsage_(floor, 'now', 111);
  check('floor 0 — a hard light on a count of 0 stays 0', floor.ledger.rows[0][5] === 0);
}

console.log('\n9. engine.118 — fame is permanent:');
{
  check('the bar is 25 on the cell', E.FAME_USAGE_BAR === 25);
  intents.length = 0; ripples.length = 0;
  const c = ctxOf([row('POP-V', 'Vin', 'Keane', 3, 60, { 4: 'GAME' }), row('POP-W', 'Ann', 'Low', 4, 24)], usage([]));
  const r = E.applyTierLadderState_(c, 111);
  check('cell 60 (seeded, GAME) → Famous = C111, Tier floored to 1, [Fame] line + log row + ripple', r.famed === 1 && c.ledger.rows[0][10] === 'C111' && c.ledger.rows[0][3] === 1 && /\[Fame\] Assumed fame/.test(c.ledger.rows[0][7]) && intents.some(i => /Media\|fame/.test(i.row[3])) && ripples.some(x => x.effectType === 'fame-permanent'));
  check('cell 24 stays unfamous', c.ledger.rows[1][10] === '' && c.ledger.rows[1][3] === 4);
  const again = E.applyTierLadderState_(c, 112);
  check('second cycle: not re-famed; the floor holds', again.famed === 0 && c.ledger.rows[0][10] === 'C111' && c.ledger.rows[0][3] === 1);
  const dropped = ctxOf([row('POP-V', 'Vin', 'Keane', 3, 60, { 4: 'GAME', 10: 'C90' })], usage([]));
  const rf = E.applyTierLadderState_(dropped, 111);
  check('a famous row found below Tier 1 is floored back (permanent)', rf.fameFloored === 1 && dropped.ledger.rows[0][3] === 1);
  // decay: a famous row is frozen (count and Tier)
  const dc = { summary: { cycleRef: 'Y3C4' }, ledger: { headers: H.slice(), rows: [row('POP-V', 'Vin', 'Keane', 2, 30, { 10: 'C90' })], dirty: false },
    ss: { getSheetByName: (n) => n === 'Citizen_Media_Usage' ? { getLastRow: () => 2, getDataRange: () => ({ getValues: () => [['Timestamp', 'Cycle', 'CitizenName', 'UsageType'], ['', 'C90', 'Vin Keane', 'quoted']] }) } : n === 'LifeHistory_Log' ? { getLastRow: () => 2, getDataRange: () => ({ getValues: () => [['Timestamp', 'POPID', 'Name', 'Type', 'Text', '', 'Cycle'], ['', 'POP-V', 'Vin Keane', 'Promotion', 'Advanced from Tier 3 to Tier 2', '', 90]] }) } : null } };
  E.decayMediaAttention_(dc, 111);
  check('decay skips a famous row entirely — count 30 and Tier 2 untouched after 21 quiet cycles', dc.ledger.rows[0][5] === 30 && dc.ledger.rows[0][3] === 2);
  // hard light on a famous name dims Cultural_Ledger FameScore, never the count
  const cells = [];
  const cul = [['EntityName', 'UniverseLinks', 'FameScore'], ['Vin Keane', 'POP-V', 40], ['Vin Keane (dup)', 'POP-V', 12]];
  const ssF = { getSheetByName: (n) => n === 'Citizen_Media_Usage' ? { getLastRow: () => 2, getDataRange: () => ({ getValues: () => [['Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter', 'Processed', 'Sentiment'], ['', 'C111', 'Vin Keane', 'quoted', 'ctx', '', '', 'negative']] }), getRange: () => ({ setValue: () => {} }) } : n === 'Cultural_Ledger' ? { getLastRow: () => 3, getDataRange: () => ({ getValues: () => cul }) } : null };
  const fc = { summary: { cycleRef: 'Y3C4' }, ss: ssF, ledger: { headers: H.slice(), rows: [row('POP-V', 'Vin', 'Keane', 1, 60, { 10: 'C90' })], dirty: false } };
  const saveCell = sandbox.queueCellIntent_; 
  global.__cells = cells;
  const E2 = new Function(...Object.keys(sandbox), src + '\nreturn { processMediaUsage_ };')(...Object.values(Object.assign({}, sandbox, { queueCellIntent_: (ctx, tab, r, c, v) => cells.push([tab, r, c, v]) })));
  E2.processMediaUsage_(fc, 'now', 111);
  check('famous + hard light: UsageCount 60 unchanged; FameScore 40 → 39 queued on the highest-fame cultural row', fc.ledger.rows[0][5] === 60 && cells.some(x => x[0] === 'Cultural_Ledger' && x[1] === 2 && x[2] === 3 && x[3] === 39) && /shine dims/.test(fc.ledger.rows[0][7]));
  check('dimCulturalFame_ floors at 0 and returns null with no linked row', E.dimCulturalFame_({ ss: ssF }, 'POP-NOBODY', -1) === null);
  // cut 3b: the famous sub-roster follows the marker
  const culRows = [['Name', 'UniverseLinks', 'FameScore'], ['Vin Keane', 'POP-V', 26], ['Ann Low', 'POP-A', 15]];
  const cellsB = [];
  const E3 = new Function(...Object.keys(sandbox), src + '\nreturn { applyTierLadderState_ };')(...Object.values(Object.assign({}, sandbox, { queueCellIntent_: (ctx, tab, r, c, v) => cellsB.push([tab, r, c, v]) })));
  registered.length = 0;
  const mk = (rowsIn) => ({ summary: { cycleRef: 'Y3C4' }, ledger: { headers: H.slice(), rows: rowsIn, dirty: false },
    ss: { getSheetByName: (n) => n === 'Citizen_Media_Usage' ? { getLastRow: () => 1, getDataRange: () => ({ getValues: () => [['Timestamp', 'Cycle', 'CitizenName', 'UsageType']] }) } : n === 'Cultural_Ledger' ? { getLastRow: () => culRows.length, getDataRange: () => ({ getValues: () => culRows }) } : null } });
  const c3 = mk([row('POP-V', 'Vin', 'Keane', 1, 60, { 4: 'GAME', 10: 'C90' }), row('POP-A', 'Ann', 'Low', 1, 30, { 10: 'C90' }), row('POP-P', 'Mike', 'Paulson', 1, 38, { 4: 'GAME', 10: 'C90', 9: 'Uptown' })]);
  const r3 = E3.applyTierLadderState_(c3, 111);
  check('famous + linked at 26: nothing to do', !registered.some(x => x.name === 'Vin Keane') && !cellsB.some(x => x[1] === 2));
  check('famous + linked at 15: brightened to the bar (25) on the cultural row', cellsB.some(x => x[0] === 'Cultural_Ledger' && x[1] === 3 && x[3] === 25));
  check('famous + no cultural row: registered once with role + hood by engine.118', registered.length === 1 && registered[0].name === 'Mike Paulson' && registered[0].j === 'engine.118' && registered[0].hood === 'Uptown' && r3.cultural === 2);
  E3.applyTierLadderState_(c3, 112);
  check('same ctx, second pass: no double registration', registered.length === 1);
}

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
