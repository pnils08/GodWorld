// engine.313 receipt fixtures (codex diff gate 2026-10-25 F3 / F4): runs 2026-10-22-e297-check.js on synthetic, non-canon tabs
// (E297_FIXTURES) into a temp dir (E297_OUT) — no sheet is read or written. usage: node output/engine-sheet/2026-10-25-e313-receipt.test.js
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const RECEIPT = path.join(__dirname, '2026-10-22-e297-check.js');
let passed = 0, failed = 0;
const check = (name, cond, detail) => { if (cond) { passed++; console.log('  ok  ' + name); } else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); } };

const CH = ['Timestamp', 'CUL-ID', 'Name', 'RoleType', 'FameCategory', 'CulturalDomain', 'Status', 'UniverseLinks', 'FirstSeenCycle', 'LastSeenCycle',
  'MediaCount', 'FameScore', 'TrendTrajectory', 'FirstRefSource', 'MediaSpread', 'CityTier', 'Neighborhood', 'Holiday', 'HolidayPriority', 'SportsSeason'];
const row = (id, name, role, cat, pop, last, mc = 3, src = 'SystemEngine') =>
  ['C100', id, name, role, cat, cat === 'dynasty' ? 'Community' : 'Arts', 'Active', pop, 100, last, mc, 40, 'stable', src, 1, 'Local', '', '', '', ''];
const SL = [['POPID', 'First', 'Last', 'Status'], ['POP-99101', 'Synthia', 'Arden', 'Active'], ['POP-99102', 'Synthor', 'Bell', 'Active'],
  ['POP-99103', 'Synthor', 'Cole', 'Active'], ['POP-99104', 'Synthia', 'Dane', 'Active']];
const MURAL = row('CUL-SYN1', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 112);   // named differently from its citizen
const BELL = row('CUL-SYN2', 'The Bell Family', 'Institution', 'dynasty', 'POP-99102', 112, 0, 'engine.65');
const COLE = row('CUL-SYN3', 'Synthor Cole', 'artist', 'artist', 'POP-99103', 112);
const BASE = [CH, MURAL, BELL, COLE];

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'e313-receipt-'));
// run(case, nowRows, digest {cycle: [names]}, cycle, flags) — each case its own fixture dir; receipts land in OUT/<case>
function run(name, nowRows, digest, cycle, flags, out, sl) {
  const fx = path.join(OUT, name + '-fx'), o = out || path.join(OUT, name);
  fs.mkdirSync(fx, { recursive: true }); fs.mkdirSync(o, { recursive: true });
  fs.writeFileSync(path.join(fx, 'base-Cultural_Ledger.json'), JSON.stringify(BASE));
  fs.writeFileSync(path.join(fx, 'now-Cultural_Ledger.json'), JSON.stringify([CH].concat(nowRows)));
  fs.writeFileSync(path.join(fx, 'now-Simulation_Ledger.json'), JSON.stringify(sl || SL));
  fs.writeFileSync(path.join(fx, 'now-Riley_Digest.json'), JSON.stringify([['Timestamp', 'Cycle', 'FamousPeople']]
    .concat(Object.keys(digest).map(c => ['C' + c, Number(c), digest[c].join(', ')]))));
  const r = spawnSync('node', [RECEIPT, String(cycle), 'F9'].concat(flags || []), { encoding: 'utf8', env: Object.assign({}, process.env, { E297_FIXTURES: fx, E297_OUT: o }) });
  const lines = (r.stdout + r.stderr).split('\n');
  return { code: r.status, holds: lines.filter(l => /^\s+HOLD /.test(l)), e313: lines.filter(l => /^\s+e313 /.test(l)), notes: lines.filter(l => /^\s+note /.test(l)), all: lines.join('\n') };
}
const dup = res => res.holds.filter(h => /engine\.313: new row/.test(h));

console.log('engine.313 receipt — F3 one citizen, two fame rows');
let r = run('dup', [MURAL, BELL, COLE, row('CUL-NEW1', 'Synthia Arden', 'artist', 'unknown', 'POP-99101', 113)], { 113: ['Synthor Cole'] }, 113);
check('a new personal row on a baseline personal POPID → HOLD naming both CUL-IDs', dup(r).length === 1 && /CUL-NEW1/.test(dup(r)[0]) && /CUL-SYN1/.test(dup(r)[0]), r.all);
r = run('dynbase', [MURAL, BELL, COLE, row('CUL-NEW2', 'Synthor Bell', 'dynasty', 'unknown', 'POP-99102', 113)], { 113: ['Synthor Cole'] }, 113);
check('a new person beside a dynasty-only baseline link passes', dup(r).length === 0, r.holds.join(' / '));
r = run('newdyn', [MURAL, BELL, COLE, row('CUL-NEW3', 'The Cole Family', 'Institution', 'dynasty', 'POP-99103', 113, 0, 'engine.65')], { 113: ['Synthor Cole'] }, 113);
check('a new dynasty beside a baseline personal link passes', dup(r).length === 0, r.holds.join(' / '));
r = run('blank', [MURAL, BELL, COLE, row('CUL-NEW4', 'Synthia Dane', 'artist', 'artist', '', 113), row('CUL-NEW5', 'Synthia Dane', 'artist', 'artist', '', 113)], { 113: ['Synthor Cole'] }, 113);
check('blank links never join', dup(r).length === 0, r.holds.join(' / '));
r = run('malformed', [MURAL, BELL, COLE, row('CUL-NEW6', 'Synthia Dane', 'artist', 'artist', 'POP-', 113), row('CUL-NEW7', 'Synthia Dane', 'artist', 'artist', 'POP-', 113),
  row('CUL-NEW8', 'Synthia Dane', 'artist', 'artist', 'POP-X', 113), row('CUL-NEW9', 'Synthia Dane', 'artist', 'artist', 'POP-X', 113),
  row('CUL-NEWA', 'Synthia Arden', 'artist', 'artist', 'POP-99101 extra', 113)], { 113: ['Synthor Cole'] }, 113);
check('malformed links ("POP-", "POP-X", "POP-99101 extra") never join each other or a valid POPID', dup(r).length === 0, r.holds.join(' / '));
r = run('newnew', [MURAL, BELL, COLE, row('CUL-NEWB', 'Synthia Dane', 'artist', 'artist', 'POP-99104', 113), row('CUL-NEWC', 'Dane Synthia', 'artist', 'artist', ' pop-99104 ', 113)], { 113: ['Synthor Cole'] }, 113);
check('two new personal rows on one POPID (case / space-insensitive) → HOLD on the second', dup(r).length === 1 && /CUL-NEWC/.test(dup(r)[0]) && /CUL-NEWB/.test(dup(r)[0]), r.holds.join(' / '));

console.log('engine.313 receipt — F4 a citizen-name sighting bound to the row it reached');
const reached = row('CUL-SYN1', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 113, 4);
r = run('bound', [reached, BELL, COLE], { 113: ['Synthia Arden'] }, 113, ['--e313', '--final']);
check('citizen name sighted, row LastSeen = the Cycle, MediaCount +1 over the baseline → bound, PASS', r.code === 0 && r.e313.length === 1 && / bound$/.test(r.e313[0]), r.all);
r = run('unmoved', [row('CUL-SYN1', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 113, 3), BELL, COLE], { 113: ['Synthia Arden'] }, 113, ['--e313']);
check('LastSeen moved but MediaCount did not → HOLD (not reached)', r.holds.some(h => /not reached \(MediaCount 3→3/.test(h)), r.holds.join(' / '));
r = run('stale', [MURAL, BELL, COLE], { 113: ['Synthia Arden'] }, 113, ['--e313']);
check('row last seen before the Cycle → HOLD', r.holds.some(h => /not reached \(LastSeenCycle 112\)/.test(h)), r.holds.join(' / '));
r = run('both', [reached, BELL, COLE], { 113: ['Synthia Arden', 'Muralist Synthia Arden'] }, 113, ['--e313', '--final']);
check('its own label sighted the same Cycle → not attributable (note), and alone it leaves the coverage HOLD',
  r.notes.some(n => /not bound/.test(n)) && r.holds.some(h => /coverage/.test(h)) && !r.holds.some(h => /not reached/.test(h)), r.all);
const chain = path.join(OUT, 'chain');
run('chain113', [reached, BELL, COLE], { 113: ['Synthia Arden'] }, 113, ['--e313'], chain);
r = run('chain114', [reached, BELL, COLE], { 113: ['Synthia Arden'], 114: ['Synthor Cole'] }, 114, ['--from', '113', '--e313', '--final'], chain);
check('--final reads the window\'s earlier receipts: a C113 binding covers a quiet C114', !r.holds.some(h => /coverage|engine\.313/.test(h)), r.holds.join(' / '));
r = run('nochain', [reached, BELL, COLE], { 113: ['Synthia Arden'], 114: ['Synthia Arden'] }, 114, ['--from', '113', '--e313']);
check('no previous receipt → HOLD (the binding needs the receipt after every fire)', r.holds.some(h => /no PASS C113 F9 receipt .*missing/.test(h)), r.holds.join(' / '));
const held = path.join(OUT, 'held');
run('held113', [row('CUL-SYN1', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 113, 3), BELL, COLE], { 113: ['Synthia Arden'] }, 113, ['--e313'], held);
r = run('held114', [reached, BELL, COLE], { 113: ['Synthia Arden'], 114: ['Synthor Cole'] }, 114, ['--from', '113', '--e313', '--final'], held);
check('a previous receipt that HOLDs is not prior state and its bindings do not count (codex gate 2)',
  r.holds.some(h => /no PASS C113 F9 receipt .*HOLD/.test(h)) && r.holds.some(h => /coverage/.test(h)), r.holds.join(' / '));
r = run('blankmc', [row('CUL-SYN1', 'Muralist Synthia Arden', 'Muralist', 'artist', 'POP-99101', 113, ''), BELL, COLE], { 113: ['Synthia Arden'] }, 113, ['--e313']);
check('a blank MediaCount is not zero → HOLD (not a number)', r.holds.some(h => /MediaCount not a number/.test(h)), r.holds.join(' / '));
r = run('deceased', [reached, BELL, COLE], { 113: ['Synthia Arden'] }, 113, ['--e313'], null,
  SL.map(x => x[0] === 'POP-99101' ? ['POP-99101', 'Synthia', 'Arden', 'Deceased'] : x));
check('a citizen who is not living is no binding candidate', r.e313.length === 0, r.all);
r = run('nodigest', [MURAL, BELL, COLE], {}, 113, ['--e313']);
check('no Riley_Digest row for the Cycle → HOLD', r.holds.some(h => /no Riley_Digest row for C113/.test(h)), r.holds.join(' / '));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
