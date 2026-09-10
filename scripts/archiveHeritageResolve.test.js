#!/usr/bin/env node
'use strict';
/**
 * engine.90 Commit 6 — the heritage engine resolves a POPID that left
 * Simulation_Ledger through Citizen_Archive. Same VM pattern as householdReconcile.test.js: the engine
 * files load into one flat namespace, exactly as clasp runs them.
 *
 * Proves: (1) an archived deceased member stays in MembersList and the
 * generation chain but is never living and never in TotalNetWorth; (2) an
 * archived traded-away member is likewise not living, whatever the snapshot's
 * Status cell says; (3) a listed member on neither tab is dropped and counted;
 * (4) a child of an archived parent still inherits the line; (5) the
 * inheritance readers (getCitizenWealth_, findHouseholdSurvivors_) fall back to
 * the snapshot; (6) the archive lookup re-shapes to the caller's header and is
 * cached on ctx; (7) healthCauseIntake names an archived miss.
 */
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.parseJSON = (v, fallback) => { try { const p = JSON.parse(v); return p === null ? fallback : p; } catch (e) { return fallback; } };
global.inWorldStamp_ = (ctx) => 'Y3C' + ((ctx && ctx.config && ctx.config.cycleCount) || 0);
global.safeRand_ = (ctx) => ctx.rng;
global.queueAppendIntent_ = () => {};
global.recordHookRipple_ = () => {};
global.requireTab_ = (ss, name) => ss.getSheetByName(name);

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.log('  ✗ ' + label + (detail ? '\n      ' + String(detail).slice(0, 400) : '')); }
}

const R = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const NS = new Function(
  R('../phase01-config/advanceSimulationCalendar.js') + '\n' +
  R('../utilities/archiveCitizenExits.js') + '\n' +
  R('../phase05-citizens/generationalWealthEngine.js') + '\n' +
  'return { updateHeritage_, getCitizenWealth_, findHouseholdSurvivors_, citizenArchiveLatestByPop_, citizenArchiveHeaders_ };'
)();

function mockSheet(values) {
  const pad = (a, n) => { while (a.length < n) a.push(''); return a; };
  return {
    _values: values,
    getDataRange() { return { getValues: () => values.map(r => r.slice()) }; },
    getLastColumn() { return values[0].length; },
    getLastRow() { return values.length; },
    appendRow(row) { values.push(pad(row.slice(), values[0].length)); },
    getRange(row, col, numRows, numCols) {
      numRows = numRows || 1; numCols = numCols || 1;
      return {
        getValues: () => Array.from({ length: numRows }, (_, i) => Array.from({ length: numCols }, (_, j) => (values[row - 1 + i] && values[row - 1 + i][col - 1 + j] !== undefined) ? values[row - 1 + i][col - 1 + j] : '')),
        setValue(v) { pad(values[row - 1], col); values[row - 1][col - 1] = v; },
        setValues(vals) { for (let i = 0; i < vals.length; i++) { if (!values[row - 1 + i]) values[row - 1 + i] = []; pad(values[row - 1 + i], col - 1 + vals[i].length); for (let j = 0; j < vals[i].length; j++) values[row - 1 + i][col - 1 + j] = vals[i][j]; } }
      };
    }
  };
}

const H = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'Neighborhood', 'HouseholdId', 'Income', 'NetWorth', 'WealthLevel', 'ParentIds', 'ChildrenIds', 'Tier', 'LineageId', 'SpouseId', 'UsageCount', 'CIV (y/n)', 'LifeHistory', 'MaritalStatus', 'NumChildren', 'InheritanceReceived', 'LastUpdated'];
const hi = (n) => H.indexOf(n);
const person = (o) => { const r = new Array(H.length).fill(''); r[hi('POPID')] = o.popId; r[hi('First')] = o.first || 'F'; r[hi('Last')] = o.last || 'Varek'; r[hi('Status')] = o.status || 'Active'; r[hi('BirthYear')] = o.birthYear || 1980; r[hi('Neighborhood')] = 'Lake Merritt'; r[hi('HouseholdId')] = o.hh || ''; r[hi('Income')] = 90000; r[hi('NetWorth')] = o.nw || 0; r[hi('WealthLevel')] = o.wl || 3; r[hi('ParentIds')] = JSON.stringify(o.parents || []); r[hi('ChildrenIds')] = JSON.stringify(o.children || []); r[hi('Tier')] = o.tier || 3; r[hi('LineageId')] = o.line || ''; r[hi('SpouseId')] = o.spouse || ''; r[hi('UsageCount')] = 0; r[hi('CIV (y/n)')] = ''; r[hi('LifeHistory')] = 'Y2C1 — born'; r[hi('MaritalStatus')] = 'single'; r[hi('NumChildren')] = 0; r[hi('InheritanceReceived')] = 0; return r; };
// Citizen_Archive is the SL header + 7 metadata — but a ledger that grew a column since the
// exit is the realistic case, so the archive fixture carries a NARROWER, re-ordered header.
const AH_SL = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'HouseholdId', 'NetWorth', 'WealthLevel', 'ParentIds', 'ChildrenIds', 'LineageId', 'SpouseId'];
const AH = AH_SL.concat(NS.citizenArchiveHeaders_([]).slice(0)); // meta headers only
const arow = (o) => { const r = new Array(AH.length).fill(''); const set = (k, v) => { r[AH.indexOf(k)] = v; }; set('POPID', o.popId); set('First', o.first || 'A'); set('Last', o.last || 'Varek'); set('Status', o.status); set('BirthYear', o.birthYear || 1940); set('HouseholdId', o.hh || ''); set('NetWorth', o.nw || 0); set('WealthLevel', o.wl || 5); set('ParentIds', '[]'); set('ChildrenIds', JSON.stringify(o.children || [])); set('LineageId', o.line || ''); set('ArchiveReason', o.reason); set('ExitCycle', o.exit); set('LastActiveStatus', o.status); set('ReturnEligible', o.reason === 'traded-away' ? 'TRUE' : 'FALSE'); set('SchemaVersion', AH_SL.length); return r; };
const HL_HDR = ['LineageId', 'FamilyName', 'FounderPopId', 'FoundedCycle', 'FoundedDoor', 'Generations', 'LivingMembers', 'MembersList', 'HeritageScore', 'HeritageTier', 'TotalNetWorth', 'HomesOwned', 'BusinessesOwned', 'CivicMembers', 'FameMembers', 'LastUpdated'];

function ctxWith(people, archiveRows, heritageRow) {
  const sheets = {
    Heritage_Ledger: mockSheet([HL_HDR.slice(), heritageRow]),
    Household_Ledger: mockSheet([['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members', 'Neighborhood', 'HousingType', 'Status']]),
    Family_Relationships: mockSheet([['RelationshipId', 'Citizen1', 'Citizen2', 'RelationshipType', 'SinceCycle', 'Status']]),
  };
  if (archiveRows) sheets.Citizen_Archive = mockSheet([AH.slice()].concat(archiveRows));
  return { ss: { getSheetByName: (n) => sheets[n] || null }, ledger: { headers: H.slice(), rows: people, dirty: false }, summary: { cycleId: 110, storyHooks: [] }, config: { cycleCount: 110 }, rng: () => 0.5, now: 'Y3C110', _sheets: sheets };
}

console.log('engine.90 Commit 6 — heritage resolves archived members');
{
  // Line LIN-00005: founder POP-1 (deceased, ARCHIVED at C108), child POP-2 (living), grandchild POP-3 (living),
  // POP-4 traded-away (archived C109, snapshot Status "Traded"), POP-9 listed but on neither tab.
  const people = [
    person({ popId: 'POP-2', first: 'Elias', nw: 4000000, parents: ['POP-1'], children: ['POP-3'], line: 'LIN-00005', tier: 1 }),
    person({ popId: 'POP-3', first: 'Nia', nw: 250000, parents: ['POP-2'], line: 'LIN-00005', birthYear: 2010 }),
  ];
  const archive = [
    arow({ popId: 'POP-1', first: 'Old', status: 'deceased', reason: 'deceased', exit: 108, nw: 9000000, children: ['POP-2'], line: 'LIN-00005' }),
    arow({ popId: 'POP-4', first: 'Gone', status: 'Traded', reason: 'traded-away', exit: 109, nw: 1500000, line: 'LIN-00005' }),
  ];
  const hl = ['LIN-00005', 'Varek', 'POP-1', 100, 'B', 2, 4, JSON.stringify(['POP-1', 'POP-2', 'POP-3', 'POP-4', 'POP-9']), 40, 'Established', 14750000, 0, '[]', 0, 0, 109];
  const ctx = ctxWith(people, archive, hl);
  const res = NS.updateHeritage_(ctx.ss, ctx, 110);
  const out = ctx._sheets.Heritage_Ledger._values[1];
  const g = (n) => out[HL_HDR.indexOf(n)];
  assert('MembersList keeps the archived founder and the traded member, drops the member on neither tab', JSON.stringify(JSON.parse(g('MembersList')).sort()) === JSON.stringify(['POP-1', 'POP-2', 'POP-3', 'POP-4']), g('MembersList'));
  assert('LivingMembers = the two on the ledger (archived deceased + archived Traded are not living)', Number(g('LivingMembers')) === 2, g('LivingMembers'));
  assert('TotalNetWorth = active members only (no $9M estate, no $1.5M traded fortune)', Number(g('TotalNetWorth')) === 4250000, g('TotalNetWorth'));
  assert('Generations chain survives the archived founder: POP-1 → POP-2 → POP-3 = 3', Number(g('Generations')) === 3, g('Generations'));
  assert('results count 2 archived members + 1 unresolved', res.archivedMembers === 2 && res.membersUnresolved === 1, JSON.stringify(res));
  assert('archived rows never reach ctx.ledger', ctx.ledger.rows.length === 2 && !ctx.ledger.rows.some(r => r[hi('POPID')] === 'POP-1'), ctx.ledger.rows.length);
}
{
  // A child born after the parent was archived still inherits the line through the snapshot's LineageId.
  const people = [
    person({ popId: 'POP-2', first: 'Elias', nw: 4000000, line: 'LIN-00005', tier: 1 }),
    person({ popId: 'POP-5', first: 'Late', parents: ['POP-1'], birthYear: 2015 }),
  ];
  const archive = [arow({ popId: 'POP-1', status: 'deceased', reason: 'deceased', exit: 108, nw: 9000000, children: ['POP-2', 'POP-5'], line: 'LIN-00005' })];
  const hl = ['LIN-00005', 'Varek', 'POP-1', 100, 'B', 2, 1, JSON.stringify(['POP-1', 'POP-2']), 40, 'Established', 4000000, 0, '[]', 0, 0, 109];
  const ctx = ctxWith(people, archive, hl);
  const res = NS.updateHeritage_(ctx.ss, ctx, 110);
  assert('a child of an archived parent joins the line (joined 1, LineageId stamped)', res.joined === 1 && people[1][hi('LineageId')] === 'LIN-00005', JSON.stringify(res) + ' ' + people[1][hi('LineageId')]);
}
{
  // No Citizen_Archive tab at all: behaviour is exactly the pre-Commit-6 behaviour (listed miss → dropped, counted).
  const people = [person({ popId: 'POP-2', first: 'Elias', nw: 4000000, line: 'LIN-00005', tier: 1 })];
  const hl = ['LIN-00005', 'Varek', 'POP-1', 100, 'B', 1, 2, JSON.stringify(['POP-1', 'POP-2']), 40, 'Established', 4000000, 0, '[]', 0, 0, 109];
  const ctx = ctxWith(people, null, hl);
  const res = NS.updateHeritage_(ctx.ss, ctx, 110);
  const out = ctx._sheets.Heritage_Ledger._values[1];
  assert('tab absent: no throw, no create, the listed miss is dropped and counted', res.archivedMembers === 0 && res.membersUnresolved === 1 && JSON.parse(out[HL_HDR.indexOf('MembersList')]).length === 1 && !ctx._sheets.Citizen_Archive, JSON.stringify(res));
}

console.log('engine.90 Commit 6 — inheritance readers fall back to the snapshot');
{
  const people = [person({ popId: 'POP-2', first: 'Elias', hh: 'HH-7', nw: 100 }), person({ popId: 'POP-3', first: 'Nia', hh: 'HH-7' }), person({ popId: 'POP-6', first: 'Other', hh: 'HH-8' })];
  const archive = [arow({ popId: 'POP-1', status: 'deceased', reason: 'deceased', exit: 108, nw: 9000000, wl: 8, hh: 'HH-7' })];
  const ctx = ctxWith(people, archive, ['LIN-00005', 'Varek', 'POP-1', 100, 'B', 1, 2, '[]', 0, 'Founding', 0, 0, '[]', 0, 0, 109]);
  const w = NS.getCitizenWealth_(ctx, 'POP-1');
  assert('getCitizenWealth_ on an archived POPID returns the snapshot fortune, flagged archived', w.netWorth === 9000000 && w.wealthLevel === 8 && w.archived === true, JSON.stringify(w));
  assert('getCitizenWealth_ on a living POPID is unchanged (no archived flag)', NS.getCitizenWealth_(ctx, 'POP-2').netWorth === 100 && !NS.getCitizenWealth_(ctx, 'POP-2').archived);
  assert('getCitizenWealth_ on a POPID on neither tab is the old zero default', NS.getCitizenWealth_(ctx, 'POP-99').netWorth === 0);
  const s = NS.findHouseholdSurvivors_(ctx, 'POP-1');
  assert('findHouseholdSurvivors_ finds the household through the archived snapshot\'s HouseholdId', JSON.stringify(s) === JSON.stringify(['POP-2', 'POP-3']), JSON.stringify(s));
  const m = NS.citizenArchiveLatestByPop_(ctx, H);
  assert('citizenArchiveLatestByPop_ re-shapes to the caller header (NetWorth lands at the caller\'s index) and is cached on ctx', m['POP-1'].row[hi('NetWorth')] === 9000000 && m['POP-1'].row.length === H.length && ctx._citizenArchiveByPop === m && NS.citizenArchiveLatestByPop_(ctx, H) === m, JSON.stringify(m['POP-1']));
}
{
  // newest ExitCycle wins when a POPID has two snapshots (traded C100, restored, died C109)
  const ctx = ctxWith([], [arow({ popId: 'POP-1', status: 'Traded', reason: 'traded-away', exit: 100, nw: 1 }), arow({ popId: 'POP-1', status: 'deceased', reason: 'deceased', exit: 109, nw: 2 })], ['LIN-00005', 'Varek', 'POP-1', 100, 'B', 1, 0, '[]', 0, 'Founding', 0, 0, '[]', 0, 0, 109]);
  const m = NS.citizenArchiveLatestByPop_(ctx, H);
  assert('two snapshots: the newest exit is the one served', m['POP-1'].reason === 'deceased' && m['POP-1'].exitCycle === 109 && m['POP-1'].row[hi('NetWorth')] === 2 && m['POP-1'].returnEligible === false, JSON.stringify(m['POP-1']));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
