'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildPack, loadConstituents } = require('./buildCivicOfficeSlice');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'civic-office-pack-'));
fs.mkdirSync(path.join(tmp, 'output'));
fs.mkdirSync(path.join(tmp, 'scripts'));
fs.writeFileSync(path.join(tmp, 'scripts', 'civic-office-map.json'), JSON.stringify({
  offices: [{
    officeId: 'COUNCIL-D7',
    title: 'City Council District 7',
    holder: 'Test Holder',
    popid: 'POP-TEST01',
    district: 'D7',
    faction: 'CRC',
    agentDir: 'civic-office-crc-faction',
  }],
  projects: [],
}));
fs.writeFileSync(path.join(tmp, 'output', 'simulation_ledger_snapshot.jsonl'),
  [
    JSON.stringify({ POPID: 'POP-00901', Name: 'Alpha Local', Neighborhood: 'Temescal', Status: 'active', RoleType: 'baker', Tier: 4 }),
    JSON.stringify({ POPID: 'POP-00021', Name: 'Star Player', Neighborhood: 'Temescal', Status: 'active', RoleType: 'Shortstop', Tier: 1 }),
    JSON.stringify({ POPID: 'POP-00902', Name: 'Beta Local', Neighborhood: 'Temescal', Status: 'inactive', RoleType: 'cook', Tier: 4 }),
    JSON.stringify({ POPID: 'POP-00903', Name: 'Gamma Far', Neighborhood: 'Fruitvale', Status: 'active', RoleType: 'nurse', Tier: 4 }),
  ].join('\n') + '\n'
);
fs.writeFileSync(path.join(tmp, 'output', 'initiative_tracker.json'), JSON.stringify({
  initiatives: [{
    id: 'INIT-TEST',
    name: 'Test Hub',
    neighborhoods: ['Temescal'],
    implementation: { phase: 'construction-planning', summary: 'waiting on a stamp' },
  }],
}));

const pack = buildPack({
  root: tmp,
  cycle: '103',
  agentDir: 'civic-office-crc-faction',
  officeMap: JSON.parse(fs.readFileSync(path.join(tmp, 'scripts', 'civic-office-map.json'), 'utf8')),
});

check('actor is the office holder not a reporter', pack.actor.name === 'Test Holder' && pack.team === 'civic-office');
check('task is weekday district', pack.task.assignment === 'weekday-district');
check('Tier 4 before Tier 1', pack.exposure.subjects[0].name === 'Alpha Local' && pack.exposure.subjects.some(s => s.name === 'Star Player'));
check('inactive and other-hood excluded', !pack.exposure.subjects.some(s => s.name === 'Beta Local' || s.name === 'Gamma Far'));
check('project fact from tracker', pack.known.some(k => /Test Hub/.test(k.text)));
check('empty people if no snapshot', loadConstituents(path.join(tmp, 'missing'), ['Temescal'], 8).length === 0);

console.log((failed ? failed + ' failed' : 'ok') + ' civic office pack');
process.exit(failed ? 1 : 0);
