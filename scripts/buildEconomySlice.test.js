#!/usr/bin/env node
// pipeline.111 (builder 2026-11-22: "1 - agree 2 - ok , i think his casino feed in citizend winning or losing"): Jordan's
// record is the whole city's economy — every business and its move, the engine's events, the casino's winners and losers,
// each hood's income and rent, the treasury, and the people the numbers land on. Fixture only; no sheet, no model.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const econ = require('./buildEconomySlice');

const CYCLE = 117;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-economy-slice-'));
const beats = path.join(root, 'output', 'beats');
fs.mkdirSync(path.join(beats, 'prev'), { recursive: true });
const jsonl = (f, rows) => fs.writeFileSync(f, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
let fails = 0;
const ok = (name, cond) => { console.log((cond ? '  ok   ' : '  FAIL ') + name); if (!cond) fails++; };

jsonl(path.join(beats, 'Business_Ledger.jsonl'), [
  { BIZ_ID: 'BIZ-1', Name: 'Steady Co', Sector: 'Retail', Neighborhood: 'Downtown', Employee_Count: '10', Annual_Revenue: '1000000', Growth_Rate: '5.0' },
  { BIZ_ID: 'BIZ-2', Name: 'Shedding Co', Sector: 'Healthcare', Neighborhood: 'Glenview', Employee_Count: '7', Annual_Revenue: '500000', Growth_Rate: '2.0' },
  { BIZ_ID: 'BIZ-3', Name: 'Sinking Co', Sector: 'Services', Neighborhood: 'Ivy Hill', Employee_Count: '4', Annual_Revenue: '200000', Growth_Rate: '-1.5' }
]);
jsonl(path.join(beats, 'prev', 'Business_Ledger.jsonl'), [
  { BIZ_ID: 'BIZ-1', Employee_Count: '10', Annual_Revenue: '999000', Growth_Rate: '5.0' },
  { BIZ_ID: 'BIZ-2', Employee_Count: '10', Annual_Revenue: '500000', Growth_Rate: '2.5' },
  { BIZ_ID: 'BIZ-3', Employee_Count: '4', Annual_Revenue: '200100', Growth_Rate: '-1.0' }
]);
fs.writeFileSync(path.join(beats, 'prev', 'meta.json'), JSON.stringify({ cycle: CYCLE - 1 }));
jsonl(path.join(beats, 'Employment_Roster.jsonl'), [
  { BIZ_ID: 'BIZ-2', POP_ID: 'POP-90001', RoleType: 'Hygienist', Status: 'Active' },
  { BIZ_ID: 'BIZ-1', POP_ID: 'POP-90002', RoleType: 'Clerk', Status: 'Active' }
]);
jsonl(path.join(beats, 'Casino_Ledger.jsonl'), [
  { WagerId: 'HOUSE', HouseFloatAfter: '246000' },
  { WagerId: 'W1', CyclePlaced: '116', CycleSettled: String(CYCLE), POPID: 'POP-90003', MarketFamily: 'undocked', Side: 'no', Stake: '385', Payout: '705', Status: 'settled-win' },
  { WagerId: 'W2', CyclePlaced: '116', CycleSettled: String(CYCLE), POPID: 'POP-00005', MarketFamily: 'undocked', Side: 'neg', Stake: '428', Payout: '0', Status: 'settled-loss' },
  { WagerId: 'W3', CyclePlaced: String(CYCLE), CycleSettled: '', POPID: 'POP-90004', MarketFamily: 'sports', Side: 'win', Stake: '200', Payout: '0', Status: 'open' }
]);
jsonl(path.join(beats, 'Neighborhood_Map.jsonl'), [{ Neighborhood: 'Downtown', MedianIncome: '123000', MedianRent: '3100', HousingPressure: '10', Trajectory: 'growth' }]);
jsonl(path.join(beats, 'City_Treasury.jsonl'), [
  { Cycle: String(CYCLE), Entry: 'REVENUE', Amount: '5000000', Counterparty: 'WEEKLY-ALLOCATION', BalanceAfter: '136753831', Note: 'weekly budget allocation' },
  { Cycle: '116', Entry: 'REVENUE', Amount: '481', BalanceAfter: '1', Note: 'last week' }
]);
jsonl(path.join(beats, 'LifeHistory_Log.jsonl'), [
  { POPID: 'POP-90005', EventTag: 'Strain|source:economy', EventText: 'ran the numbers on staying put another year', Cycle: String(CYCLE) },
  { POPID: 'POP-90001', EventTag: 'Daily|source:familyLife', EventText: 'packed a lunch', Cycle: String(CYCLE) }
]);
fs.writeFileSync(path.join(beats, 'meta.json'), JSON.stringify({ cycle: CYCLE }));
const prof = (n, r, h, med) => ({ Name: n, RoleType: r, Neighborhood: h, 'MED (y/n)': med ? 'yes' : 'no' });
const profiles = new Map([
  ['POP-90001', prof('Test Hygienist', 'Hygienist', 'Glenview')], ['POP-90002', prof('Test Clerk', 'Clerk', 'Downtown')],
  ['POP-90003', prof('Test Winner', 'Teacher', 'Uptown')], ['POP-00005', prof('Test Editor', 'Editor-in-Chief', 'Lake Merritt', true)],
  ['POP-90004', prof('Test Bettor', 'Driver', 'KONO')], ['POP-90005', prof('Test Renter', 'Nurse', 'Laurel')]
]);
fs.writeFileSync(path.join(root, 'output', 'world_summary_c' + CYCLE + '.md'),
  '## What Moved\n\n### economic-event (1)\n- business-closure | closure: Test Dental (Healthcare) — 0 jobs | Ivy Hill | mag -25 | targets BIZ-9\n');

console.log('buildEconomySlice:');
const s = econ.buildEconomySlice(CYCLE, { root, profiles });
ok('the morning carries the movement: one line per sector, then headcount changes, then negative growth; a business that held is left to his sheet tool', /^All 3 businesses by sector, C117: /.test(s.facts[0].text) && /^Shedding Co/.test(s.facts[1].text) && /^Sinking Co/.test(s.facts[2].text) && !s.facts.some(f => /^Steady Co/.test(f.text)));
ok('a business carries its move since last cycle', s.facts[1].text === 'Shedding Co (Healthcare), Glenview — 7 employees, revenue $500k, growing 2.0% a year — since C116: yearly growth rate -0.5 pts, -3 employees');
ok('the engine\'s business event rides', s.facts.some(f => /^business-closure \| closure: Test Dental/.test(f.text)));
ok('the casino: a winner and a loser by name, the house float, the count', s.facts.some(f => f.text === 'Test Winner won on undocked (no) — staked $385, paid $705') &&
  s.facts.some(f => /^Test Editor lost on undocked/.test(f.text)) && s.facts.some(f => f.text === 'Casino house float: $246k') && s.facts.some(f => /^Casino C117: 1 sports wagers placed; 2 settled, 0 voided/.test(f.text)));
ok('each hood\'s income, rent and pressure', s.facts.some(f => f.text === 'Downtown: median income $123k, median rent $3k, housing pressure 10, trajectory growth'));
ok('this cycle\'s treasury only', s.facts.some(f => /^City treasury C117: revenue \$5\.0M \(weekly budget allocation\)/.test(f.text)) && !s.facts.some(f => /last week/.test(f.text)));
const pops = s.citizens.map(c => c.popid);
ok('people: the worker at the shedding business, the winner, the bettor, the citizen with a money line', ['POP-90001', 'POP-90003', 'POP-90004', 'POP-90005'].every(p => pops.includes(p)));
ok('never the paper\'s staff, never a worker at a steady business', !pops.includes('POP-00005') && !pops.includes('POP-90002'));
ok('no code-picked hood, no hook', s.hood === null && s.prewrite.hooks.length === 0);
ok('an empty record sits him out', econ.sitsOutWhenEmpty === true);
// agy 2026-11-23 #3: an empty ledger adds no sector line, so the record is empty and he sits out.
for (const f of ['Business_Ledger', 'Employment_Roster', 'Casino_Ledger', 'Neighborhood_Map', 'City_Treasury', 'LifeHistory_Log']) fs.writeFileSync(path.join(beats, f + '.jsonl'), '');
fs.unlinkSync(path.join(root, 'output', 'world_summary_c' + CYCLE + '.md'));
ok('an empty dump builds an empty record', econ.buildEconomySlice(CYCLE, { root, profiles }).empty === true);
fs.rmSync(root, { recursive: true, force: true });
console.log(fails ? 'buildEconomySlice tests: ' + fails + ' FAILURE(S)' : 'buildEconomySlice tests: PASS');
process.exit(fails ? 1 : 0);
