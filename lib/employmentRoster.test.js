'use strict';
// lib/employmentRoster.js — the roster is built off Simulation_Ledger. Run: node lib/employmentRoster.test.js
const { rosterFromLedger, rosterGridFromLedger, HEAD } = require('./employmentRoster');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const H = ['POPID', 'First', 'Last', 'RoleType', 'Status', 'EmployerBizId'];
const L = [H,
  ['POP-1', 'Ana', 'Ruiz', 'Baker', 'Active', 'BIZ-00007'],
  ['POP-2', 'Bo', 'Lee', 'Driver', 'Active', 'SELF_EMPLOYED'],
  ['POP-3', 'Cy', 'Wu', 'Clerk', 'Active', 'UNTRACKED'],
  ['POP-4', 'Di', 'Fox', 'Teacher', 'Retired', 'BIZ-00016'],
  ['POP-5', 'Ed', 'Kim', 'Nurse', 'Active', ''],
  ['POP-6', 'Flo', 'Ngo', 'Cook', 'active', ' BIZ-00009 '],
  ['', 'No', 'Pop', 'Cook', 'Active', 'BIZ-00009'],
  ['POP-8', '', '', 'Cook', 'Active', 'BIZ-00009']];
const r = rosterFromLedger(L);
ok('an Active citizen at a tracked business is a row, in the tab shape', r.length === 2 && r[0].BIZ_ID === 'BIZ-00007' && r[0].POP_ID === 'POP-1' && r[0].CitizenName === 'Ana Ruiz' && r[0].RoleType === 'Baker' && r[0].Status === 'Active' && Object.keys(r[0]).join() === HEAD.join());
ok('self-employed, untracked, blank-employer citizens are no row', !r.some(x => ['POP-2', 'POP-3', 'POP-5'].includes(x.POP_ID)));
ok('a Retired citizen is no row (not working there now)', !r.some(x => x.POP_ID === 'POP-4'));
ok('status case and employer padding do not drop a worker', r.some(x => x.POP_ID === 'POP-6' && x.BIZ_ID === 'BIZ-00009'));
ok('a row with no POPID or no name is no row', !r.some(x => x.POP_ID === '' || x.POP_ID === 'POP-8'));
const g = rosterGridFromLedger(L);
ok('the grid form is the header then the same rows', g[0].join() === HEAD.join() && g.length === 3 && g[1][1] === 'POP-1');
let e = null; try { rosterFromLedger([['POPID', 'First']]); } catch (x) { e = x; }
ok('a ledger with no EmployerBizId column fails loud, never reads as nobody employed', !!e && /EmployerBizId/.test(e.message));
let e2 = null; try { rosterFromLedger([]); } catch (x) { e2 = x; }
ok('an empty read fails loud too (no header is not "nobody works anywhere")', !!e2);
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
