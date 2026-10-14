'use strict';
// pipeline.73 step 2 — the beat dump's derived files: the LifeHistory_Log window and Lived_Events.
// Pure helpers only (the sheet reads and the staged publish run in main()).
// Run: node scripts/dumpBeatTabs.test.js
const { lifeWindowRows, livedEventRows } = require('./dumpBeatTabs');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };

const LOGH = ['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle'];
const log = [LOGH,
  ['Y3C6', 'POP-00510', '', 'Retirement', 'stepped back', '', 110],
  ['Y3C7', 'POP-00470', '', 'Retirement', 'transitioned into retirement', '', 111],
  ['Y3C8', 'POP-00892', '', 'Birth', 'welcomed a new child into their family', '', 112],
  ['Y3C8', 'POP-00600', '', 'Death', 'passed away peacefully', '', 112],
  ['Y3C8', 'POP-00111', '', 'Daily', 'walked to the market', '', 112]];
const ledger = [['POPID', 'First', 'Last', 'Neighborhood', 'RoleType', 'HouseholdId', 'Status'],
  ['POP-00470', 'Maren', 'Johns', 'Temescal', 'Psychotherapist', '', 'Active'],
  ['POP-00892', 'Geneva', 'Zhou', 'West Oakland', 'Elevator Mechanic', 'HH-5', 'Active'],
  ['POP-00601', 'Luis', 'Ruiz', 'Fruitvale', 'Baker', 'HH-1', 'Active']];
const archive = [['POPID', 'First', 'Last', 'Neighborhood', 'RoleType', 'HouseholdId', 'SpouseId'], ['POP-00600', 'Ana', 'Ruiz', 'Fruitvale', 'Teacher', 'HH-1', 'POP-00601']];
const hospital = [['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause', 'AdmitCycle', 'StatusNow', 'LastTransitionCycle', 'DischargeCycle']];

console.log('LifeHistory_Log window');
const w = lifeWindowRows(log, 112);
ok('rows for the stamped Cycle and the one before, every tag, header keys verbatim', w.length === 4 && w.every(r => Object.keys(r).join() === LOGH.join()) && !w.some(r => r.POPID === 'POP-00510'), JSON.stringify(w.map(r => r.POPID)));
let e = null; try { lifeWindowRows([['Timestamp', 'POPID']], 112); } catch (x) { e = x; }
ok('a log with no Cycle column fails loud', !!e && /no Cycle column/.test(e.message));

console.log('Lived_Events');
const ev = livedEventRows({ log, hospital, ledger, archive, bonds: [] }, 112);
const by = (k) => ev.find(x => x.kind === k);
ok('the wake\'s set: retirement (C111), birth, death; texture lines out', ev.map(x => x.kind).sort().join() === 'birth,death,retirement', JSON.stringify(ev.map(x => x.id)));
ok('names, hood and role joined from the ledger read', by('birth').subjectName === 'Geneva Zhou' && by('birth').neighborhood === 'West Oakland' && by('birth').roleType === 'Elevator Mechanic');
ok('the deceased is named from the archive, the survivor from the ledger', by('death').subjectName === 'Ana Ruiz' && by('death').neighborhood === 'Fruitvale' && by('death').recipients[0].pop === 'POP-00601' && by('death').recipients[0].rel === 'spouse' && by('death').recipients[0].name === 'Luis Ruiz', JSON.stringify(by('death')));
ok('row shape: id, kind, cycle, subject, subjectName, neighborhood, roleType, recipients', ['id', 'kind', 'cycle', 'subject', 'subjectName', 'neighborhood', 'roleType', 'recipients'].every(k => k in by('retirement')));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
