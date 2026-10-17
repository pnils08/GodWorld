'use strict';
// pipeline.73 step 2 — the beat dump's derived files: the LifeHistory_Log window and Lived_Events.
// Pure helpers only (the sheet reads and the staged publish run in main()).
// Run: node scripts/dumpBeatTabs.test.js
const { lifeWindowRows, livedEventRows, rosterFromLedger, resolveStamp, requireCols, publishGeneration } = require('./dumpBeatTabs');
const fs = require('fs'), os = require('os'), path = require('path');
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

console.log('stamp resolution');
const thr = (f) => { try { f(); return null; } catch (x) { return x.message; } };
ok('the request stamps; a backward request keeps the prior', resolveStamp({ cycle: 111 }, '112') === 112 && resolveStamp({ cycle: 111 }, '110') === 111);
ok('no request → the prior meta Cycle', resolveStamp({ cycle: 111 }, null) === 111);
ok('a null, blank or zero prior is no stamp — never Cycle 0', [{ cycle: null }, { cycle: '' }, { cycle: 0 }, null].every(m => /no positive Cycle/.test(thr(() => resolveStamp(m, null)) || '')));
ok('a zero, negative or non-integer request is refused', ['0', '-3', '11.5', 'abc'].every(a => /not a positive integer/.test(thr(() => resolveStamp({ cycle: 111 }, a)) || '')));

console.log('required columns');
ok('a missing column names itself', /missing column\(s\): Cycle/.test(thr(() => requireCols('LifeHistory_Log', [['POPID', 'EventTag']], ['POPID', 'Cycle'], false))));
ok('an empty read fails when rows are required, passes when the tab may be empty', /no data rows/.test(thr(() => requireCols('Simulation_Ledger', [['POPID']], ['POPID'], true))) && thr(() => requireCols('Hospital_Ledger', [['POPID']], ['POPID'], false)) === null);
ok('a non-array read fails', /did not return rows/.test(thr(() => requireCols('X', null, [], false))));

console.log('generation publish (directory swap)');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'beats-'));
const out = path.join(tmp, 'beats');
const read = (f) => fs.readFileSync(path.join(out, f), 'utf8');
publishGeneration(out, { A: ['{"c":111}'] }, { cycle: 111 }, false);
ok('first publish: files + meta, empty prev/', read('A.jsonl') === '{"c":111}\n' && JSON.parse(read('meta.json')).cycle === 111 && fs.readdirSync(path.join(out, 'prev')).length === 0);
publishGeneration(out, { A: ['{"c":112}'], B: [] }, { cycle: 112 }, true);
ok('advancing: the old generation becomes prev/, the new one is live', read('A.jsonl') === '{"c":112}\n' && read('B.jsonl') === '' && fs.readFileSync(path.join(out, 'prev', 'A.jsonl'), 'utf8') === '{"c":111}\n' && JSON.parse(fs.readFileSync(path.join(out, 'prev', 'meta.json'), 'utf8')).cycle === 111);
publishGeneration(out, { A: ['{"c":112,"again":1}'], B: [] }, { cycle: 112 }, false);
ok('same-Cycle rerun: live replaced, prev/ kept as it was', read('A.jsonl') === '{"c":112,"again":1}\n' && fs.readFileSync(path.join(out, 'prev', 'A.jsonl'), 'utf8') === '{"c":111}\n');
const boom = Object.assign({}, fs, { writeFileSync: (f, d) => { if (/meta\.json$/.test(f)) throw new Error('disk full'); return fs.writeFileSync(f, d); } });
const err = thr(() => publishGeneration(out, { A: ['{"c":113}'] }, { cycle: 113 }, true, boom));
ok('a failure before the swap leaves the live dump and prev/ untouched', /disk full/.test(err || '') && read('A.jsonl') === '{"c":112,"again":1}\n' && JSON.parse(read('meta.json')).cycle === 112 && fs.readFileSync(path.join(out, 'prev', 'A.jsonl'), 'utf8') === '{"c":111}\n');
publishGeneration(out, { A: ['{"c":113}'] }, { cycle: 113 }, true);
ok('the retry after a failure publishes cleanly (no leftover .next)', read('A.jsonl') === '{"c":113}\n' && !fs.existsSync(out + '.next') && !fs.existsSync(out + '.old') && fs.readFileSync(path.join(out, 'prev', 'A.jsonl'), 'utf8') === '{"c":112,"again":1}\n');
fs.rmSync(tmp, { recursive: true, force: true });

// Employment_Roster derived from Simulation_Ledger (builder 2026-10-17) — the only truth for who works where.
const LH = ['POPID', 'First', 'Last', 'Status', 'RoleType', 'EmployerBizId', 'Neighborhood'];
const roster = rosterFromLedger([LH,
  ['POP-00023', 'Gregory', 'Mims', 'Active', 'Organized Crime', 'BIZ-00100', 'Downtown'],
  ['POP-00040', 'Aaron', 'Whitfield', 'active ', 'City Manager', ' BIZ-00017 ', 'Rockridge'],
  ['POP-00500', 'Idle', 'Pool', 'Active', 'Barista', '', 'Temescal'],
  ['POP-00594', 'Robert', 'Corliss', 'Retired', 'Retired PG&E Engineer', 'BIZ-00030', 'Lake Merritt'],
  ['', 'No', 'Popid', 'Active', 'Clerk', 'BIZ-00017', 'Downtown'],
  ['POP-00700', '', '', 'Active', 'Clerk', 'BIZ-00017', 'Downtown']]);
ok('roster: Active + EmployerBizId rows only, ledger order kept', roster.map(r => r.POP_ID).join(',') === 'POP-00023,POP-00040');
ok('roster: exact row shape the slices and sourcing read', JSON.stringify(roster[0]) === JSON.stringify({ BIZ_ID: 'BIZ-00100', POP_ID: 'POP-00023', CitizenName: 'Gregory Mims', RoleType: 'Organized Crime', Status: 'Active', MappingLayer: 'ledger' }));
ok('roster: status and employer are trimmed/case-folded, Status written as Active', roster[1].BIZ_ID === 'BIZ-00017' && roster[1].Status === 'Active' && roster[1].CitizenName === 'Aaron Whitfield');
ok('roster: blank employer (the hiring pool) is not SELF_EMPLOYED or UNTRACKED — it is absent', !roster.some(r => r.POP_ID === 'POP-00500'));
ok('roster: a retired citizen is off the roster even with an employer id', !roster.some(r => r.POP_ID === 'POP-00594'));
ok('roster: no POPID or no name → no row', roster.length === 2);
ok('roster: empty ledger → empty roster, no throw', rosterFromLedger([]).length === 0 && rosterFromLedger(null).length === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
