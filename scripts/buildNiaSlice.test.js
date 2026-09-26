'use strict';

const fs = require('fs');
const N = require('./buildNiaSlice');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const st = { computedAt: 'x', rows: [
  { Rank: 2, POPID: 'POP-00962', Holder: 'Marcus Walker', CyclesLed: 2, CurrentStreak: 0 },
  { Rank: 1, POPID: 'POP-00143', Holder: 'Clarissa Dane', CyclesLed: 4, CurrentStreak: 3 },
] };

check('leader is rank 1 regardless of row order', N.standingsLeader(st).POPID === 'POP-00143');
check('null standings -> null leader', N.standingsLeader(null) === null);
check('empty rows -> null leader', N.standingsLeader({ rows: [] }) === null);

const note = N.standingsNote(st.rows[1]);
check('note names leader + rank + cycles + streak',
  note.includes('Clarissa Dane') && note.includes('rank #1') &&
  note.includes('4 cycle(s) led') && note.includes('streak 3'));
check('no leader -> empty note', N.standingsNote(null) === '');

// Integration against the real c106 feed pack: builds without a standings
// sidecar present (sidecar starts with tonight's recompute) and carries the
// standings key either way.
const hasSidecar = fs.existsSync(require('path').join(__dirname, '..', 'output', 'spacemolt-show', 'standings.json'));
const slice = N.buildNiaSlice(106);
check('slice builds', slice && slice.v === 'NIA-SLICE/1' && Array.isArray(slice.laneEntries));
check('standings key present', 'standings' in slice);
if (!hasSidecar) check('no sidecar -> standings null', slice.standings === null);
if (hasSidecar && slice.standings) {
  check('sidecar -> leader named in angle', slice.laneEntries.every(e => e.handle.angle.includes('leads the board')));
}

// Regression (2026-09-18, Nia Rook C107): a feed event with no `Holder`
// resolved to the raw POPID as the pilot's printed "name" — the ledger name
// lookup existed for hood but never for name. citizenInfoFor now resolves
// both in the same pass.
const POPID_RE = /\bPOP-\d{5}\b/;
check('no raw POPID leaks into a lane label when the ledger has a name',
  slice.laneEntries.every(e => !POPID_RE.test(e.label)),
  slice.laneEntries.map(e => e.label).join(' | '));
check('no raw POPID leaks into a lane angle', slice.laneEntries.every(e => !POPID_RE.test(e.handle.angle)));
check('no raw POPID leaks into lane citizens', slice.laneEntries.every(e => e.handle.citizens.every(c => !POPID_RE.test(c))));

// --- Weekly digest (2026-09-25, plan §(e) NEXT BUILD) ---
const path = require('path');
const os = require('os');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nia-weekly-'));
const showDir = path.join(tmpRoot, 'output', 'spacemolt-show');
fs.mkdirSync(path.join(showDir, 'feed'), { recursive: true });
fs.writeFileSync(path.join(showDir, 'feed', 'c999.json'), JSON.stringify({ events: [
  { EpisodeId: 'undocked-pop00962-a', POPID: 'POP-00962', CreditsDelta: 40, CombatEvents: 0, MishapCount: 1 },
  { EpisodeId: 'undocked-pop00962-b', POPID: 'POP-00962', CreditsDelta: -100, CombatEvents: 1, MishapCount: 0 },
  { EpisodeId: 'undocked-pop00143-a', POPID: 'POP-00143', CreditsDelta: null, CombatEvents: 0, MishapCount: 0 },
] }));
fs.writeFileSync(path.join(tmpRoot, 'output', 'simulation_ledger_snapshot.jsonl'),
  [{ POPID: 'POP-00962', Name: 'Marcus Walker', Neighborhood: 'Jack London' },
   { POPID: 'POP-00143', Name: 'Clarissa Dane', Neighborhood: 'Fruitvale' }]
    .map(r => JSON.stringify(r)).join('\n') + '\n');

// buildNiaSlice.js resolves ROOT from __dirname, not cwd — so a tmp-root test
// needs its own copy of the module loaded FROM the tmp tree. Simplest: copy
// the module source in and require it from there.
const tmpScriptsDir = path.join(tmpRoot, 'scripts');
fs.mkdirSync(tmpScriptsDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'buildNiaSlice.js'), path.join(tmpScriptsDir, 'buildNiaSlice.js'));
delete require.cache[require.resolve(path.join(tmpScriptsDir, 'buildNiaSlice.js'))];
const NW = require(path.join(tmpScriptsDir, 'buildNiaSlice.js'));

const weekly = NW.buildNiaWeeklySlice(999);
check('weekly slice not empty when feed has events', weekly.empty === false, JSON.stringify(weekly));
check('weekly slice rosters both pilots', weekly.pilots.length === 2, JSON.stringify(weekly.pilots));
const walker = weekly.pilots.find(p => p.POPID === 'POP-00962');
check('weekly slice resolves pilot name from ledger', walker && walker.name === 'Marcus Walker');
check('weekly slice aggregates credits across episodes (40 + -100 = -60)', walker && walker.creditsDelta === -60);
check('weekly slice counts episodes per pilot', walker && walker.episodes === 2);
const dane = weekly.pilots.find(p => p.POPID === 'POP-00143');
check('weekly slice marks a null-credits episode as windowed, not zero', dane && dane.hasWindowed === true && dane.creditsDelta === 0);
check('weekly story carries every pilot popid', weekly.story && weekly.story.popids.sort().join(',') === 'POP-00143,POP-00962');
check('weekly story ref is namespaced away from real EpisodeIds', weekly.story.ref === 'undocked-week:weekly-c999');

const emptySlice = NW.buildNiaWeeklySlice(998);
check('no feed pack -> empty weekly slice', emptySlice.empty === true);

// Idempotency: marking the week filed makes a second build return empty.
NW.markRecapped([NW.weeklyKey(999)], { note: 'test' });
const refetch = NW.buildNiaWeeklySlice(999);
check('a filed weekly digest does not rebuild for the same cycle', refetch.empty === true);

fs.rmSync(tmpRoot, { recursive: true, force: true });

// injectWeeklyPilotCredit lives in cron-desk-run.js — exercised via its own
// small fixture here since that file has no dedicated unit test file; a
// require of the whole module is safe (no top-level side effects on require).
const { injectWeeklyPilotCredit } = require('./cron-desk-run');
const intake = { names: [{ name: 'Marcus Walker', role: 'quoted-source', popid: 'POP-00962' }] };
const pilots = [
  { name: 'Marcus Walker', POPID: 'POP-00962' },
  { name: 'Clarissa Dane', POPID: 'POP-00143' },
];
const draft = 'Marcus Walker had a rough week out there. The rest of the cast sat it out this cycle.';
const injected = injectWeeklyPilotCredit(intake, draft, pilots);
check('existing quoted-source role upgraded to subject for a printed pilot',
  injected.names.find(n => n.popid === 'POP-00962').role === 'subject');
check('a pilot never named in the article body is NOT added (index only what prints)',
  !injected.names.some(n => n.popid === 'POP-00143'));

const intake2 = { names: [] };
const draft2 = 'Clarissa Dane sat quiet this week while the leaderboard shuffled under her.';
const injected2 = injectWeeklyPilotCredit(intake2, draft2, pilots);
check('a printed pilot absent from the model INTAKE is still added as subject',
  injected2.names.length === 1 && injected2.names[0].popid === 'POP-00143' && injected2.names[0].role === 'subject');

if (failed) { console.error('buildNiaSlice: ' + failed + ' FAIL'); process.exit(1); }
console.log('buildNiaSlice: ok');
