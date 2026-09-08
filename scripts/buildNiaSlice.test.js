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

if (failed) { console.error('buildNiaSlice: ' + failed + ' FAIL'); process.exit(1); }
console.log('buildNiaSlice: ok');
