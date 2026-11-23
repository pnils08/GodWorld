#!/usr/bin/env node
// pipeline.111 (builder 2026-11-22: "mason next"): Mason's record is every food and drink business, how it moved,
// the engine's business events on it, and its workers with their own lines. Fixture only; no sheet, no model.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const food = require('./buildFoodSlice');

const CYCLE = 117;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-food-slice-'));
const beats = path.join(root, 'output', 'beats');
fs.mkdirSync(path.join(beats, 'prev'), { recursive: true });
const jsonl = (f, rows) => fs.writeFileSync(f, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
let fails = 0;
const ok = (name, cond) => { console.log((cond ? '  ok   ' : '  FAIL ') + name); if (!cond) fails++; };

jsonl(path.join(beats, 'Business_Ledger.jsonl'), [
  { BIZ_ID: 'BIZ-1', Name: 'Test Grill', Sector: 'Restaurant & Dining', Neighborhood: 'Jack London', Employee_Count: '7', Annual_Revenue: '869000', Growth_Rate: '12.0' },
  { BIZ_ID: 'BIZ-2', Name: 'Test Bar', Sector: 'Bar / Lounge', Neighborhood: 'Uptown', Employee_Count: '5', Annual_Revenue: '400000', Growth_Rate: '3.5' },
  { BIZ_ID: 'BIZ-3', Name: 'Test Widgets', Sector: 'Manufacturing', Neighborhood: 'Downtown', Employee_Count: '20', Annual_Revenue: '2000000', Growth_Rate: '4' },
  { BIZ_ID: 'BIZ-4', Name: 'Test Salon', Sector: 'Hair Salon / Services', Neighborhood: 'Laurel', Employee_Count: '3', Annual_Revenue: '90000', Growth_Rate: '1' }
]);
jsonl(path.join(beats, 'prev', 'Business_Ledger.jsonl'), [
  { BIZ_ID: 'BIZ-1', Name: 'Test Grill', Sector: 'Restaurant & Dining', Neighborhood: 'Jack London', Employee_Count: '6', Annual_Revenue: '867000', Growth_Rate: '11.0' }
]);
fs.writeFileSync(path.join(beats, 'prev', 'meta.json'), JSON.stringify({ cycle: CYCLE - 1 }));
jsonl(path.join(beats, 'Employment_Roster.jsonl'), [
  { BIZ_ID: 'BIZ-1', POP_ID: 'POP-90001', CitizenName: 'Test Cook', RoleType: 'Line Cook', Status: 'Active' },
  { BIZ_ID: 'BIZ-2', POP_ID: 'POP-90002', CitizenName: 'Test Bartender', RoleType: 'Bartender', Status: 'Active' },
  { BIZ_ID: 'BIZ-3', POP_ID: 'POP-90003', CitizenName: 'Test Machinist', RoleType: 'Machinist', Status: 'Active' },
  { BIZ_ID: 'BIZ-1', POP_ID: 'POP-00160', CitizenName: 'Mason Ortega', RoleType: 'Journalist', Status: 'Active' }
]);
jsonl(path.join(beats, 'LifeHistory_Log.jsonl'), [
  { POPID: 'POP-90001', EventTag: 'Daily|source:familyLife', EventText: 'split the coffee', Cycle: String(CYCLE) },
  { POPID: 'POP-90002', EventTag: 'Work|source:occupation', EventText: 'cut someone off and handed over water', Cycle: String(CYCLE) },
  { POPID: 'POP-90001', EventTag: 'Work|source:occupation', EventText: 'an old shift', Cycle: String(CYCLE - 1) }
]);
fs.writeFileSync(path.join(beats, 'meta.json'), JSON.stringify({ cycle: CYCLE }));
const profiles = new Map([
  ['POP-90001', { Name: 'Test Cook', RoleType: 'Line Cook', Neighborhood: 'Fruitvale' }],
  ['POP-90002', { Name: 'Test Bartender', RoleType: 'Bartender', Neighborhood: 'Uptown', BirthYear: '2022' }],
  ['POP-90003', { Name: 'Test Machinist', RoleType: 'Machinist', Neighborhood: 'Downtown' }],
  ['POP-00160', { Name: 'Mason Ortega', RoleType: 'Journalist', Neighborhood: 'Uptown' }]
]);
fs.writeFileSync(path.join(root, 'output', 'world_summary_c' + CYCLE + '.md'), [
  '## What Moved', '', '### economic-event (2)',
  '- business-closure | closure: Test Grill (Restaurant & Dining) — 2 jobs | Jack London | mag -25 | targets BIZ-1',
  '- sector-impact | Test Widgets lost 3 employees | Downtown | mag -8 | targets BIZ-3', ''
].join('\n'));

console.log('buildFoodSlice:');
const s = food.buildFoodSlice(CYCLE, { root, profiles });
ok('food and drink businesses only — no factory, no salon', s.facts.some(f => /^Test Grill/.test(f.text)) && s.facts.some(f => /^Test Bar/.test(f.text)) && !JSON.stringify(s.facts).includes('Test Widgets (Manufacturing)') && !JSON.stringify(s.facts).includes('Test Salon'));
ok('a business carries what moved since last cycle', s.facts.some(f => f.text === 'Test Grill (Restaurant & Dining), Jack London — 7 employees, revenue $869k, growing 12.0% a year — since C116: yearly growth rate +1.0 pts, revenue +$2k, +1 employees'));
ok('the engine\'s business event on a food business rides; one on a factory does not', s.facts.some(f => /^business-closure \| closure: Test Grill/.test(f.text)) && !s.facts.some(f => /Test Widgets lost/.test(f.text)));
ok('workers at food businesses only, never himself', s.citizens.map(c => c.popid).sort().join(',') === 'POP-90001,POP-90002');
ok('a worker with a line from work comes first and carries it', s.citizens[0].popid === 'POP-90002' && /Bartender at Test Bar; C117: cut someone off/.test(s.citizens[0].profile));
ok('a worker carries the row\'s age (sim year − BirthYear), never a guess', /Test Bartender — Bartender — Uptown — age 20 — /.test(s.citizens[0].profile) && !/age/.test(s.citizens[1].profile));
ok('only this cycle\'s lines', !JSON.stringify(s.citizens).includes('an old shift'));
ok('no code-picked hood, no hook, no approach', s.hood === null && s.prewrite.hooks.length === 0);
ok('an empty record sits him out', food.sitsOutWhenEmpty === true);
fs.rmSync(root, { recursive: true, force: true });
console.log(fails ? 'buildFoodSlice tests: ' + fails + ' FAILURE(S)' : 'buildFoodSlice tests: PASS');
process.exit(fails ? 1 : 0);
