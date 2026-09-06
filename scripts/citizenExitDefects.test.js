#!/usr/bin/env node
'use strict';
// engine.90 Commit 8 — one defect rule for the mover's ArchiveNote and the dry-run inventory.
const A = require('../utilities/archiveCitizenExits');
let passed = 0, failed = 0;
const assert = (l, c, d) => { if (c) { passed++; console.log('  ✓ ' + l); } else { failed++; console.log('  ✗ ' + l + (d ? '\n      ' + String(d).slice(0, 300) : '')); } };
const H = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'RoleType', 'EmployerBizId', 'NetWorth', 'Income', 'SchoolQuality', 'CareerStage', 'MigrationIntent'];
const row = (o) => H.map((k) => (o[k] === undefined ? '' : o[k]));
const clean = { POPID: 'POP-1', First: 'A', Last: 'B', Status: 'Traded', BirthYear: 1990, RoleType: 'SS / A\'s', EmployerBizId: 'BIZ-1', NetWorth: 100, Income: 50000, SchoolQuality: 7, CareerStage: 'mid-career', MigrationIntent: '' };
console.log('citizenExitDefects_');
assert('a clean row has no defects', A.citizenExitDefects_(H, row(clean)).length === 0, JSON.stringify(A.citizenExitDefects_(H, row(clean))));
assert('the live classes: SchoolQuality 5 / blank, CareerStage spelling, MigrationIntent set, employer blank with a role',
  JSON.stringify(A.citizenExitDefects_(H, row(Object.assign({}, clean, { SchoolQuality: '5', CareerStage: 'early-career', MigrationIntent: 'staying', EmployerBizId: '' })))) === JSON.stringify(['schoolQualityUnusable', 'careerStageSpelling', 'employerBlankWithRole', 'migrationIntentSet']));
assert('blank CareerStage is its own class; NetWorth / Income blank; BirthYear out of range', JSON.stringify(A.citizenExitDefects_(H, row(Object.assign({}, clean, { CareerStage: '', NetWorth: '', Income: '', BirthYear: 1889 })))) === JSON.stringify(['careerStageBlank', 'netWorthBlank', 'birthYearOOB', 'incomeBlank']));
assert('a role-less row with no employer is not an employer defect', A.citizenExitDefects_(H, row(Object.assign({}, clean, { RoleType: '', EmployerBizId: '' }))).length === 0);
console.log('citizenArchiveRow_ ArchiveNote');
const meta = A.CITIZEN_ARCHIVE_META_HEADERS;
const ar = A.citizenArchiveRow_(H, row(Object.assign({}, clean, { SchoolQuality: '', MigrationIntent: 'staying' })), 'traded-away', 110);
assert('the exit row carries the note in the ArchiveNote slot', ar.length === H.length + meta.length && ar[H.length + meta.indexOf('ArchiveNote')] === 'defects-at-exit: schoolQualityUnusable,migrationIntentSet', JSON.stringify(ar.slice(H.length)));
assert('a clean exit leaves ArchiveNote blank', A.citizenArchiveRow_(H, row(clean), 'deceased', 110)[H.length + meta.indexOf('ArchiveNote')] === '');
assert('the ledger cells in the snapshot are untouched (no repair at exit)', ar[H.indexOf('SchoolQuality')] === '' && ar[H.indexOf('MigrationIntent')] === 'staying');
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
