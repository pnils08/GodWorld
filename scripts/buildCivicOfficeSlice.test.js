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
fs.mkdirSync(path.join(tmp, 'output', 'city-civic-database', 'initiatives', 'baylight'), { recursive: true });

fs.writeFileSync(path.join(tmp, 'scripts', 'civic-office-map.json'), JSON.stringify({
  offices: [
    {
      officeId: 'COUNCIL-D7',
      title: 'City Council District 7',
      holder: 'Test Holder',
      popid: 'POP-TEST01',
      district: 'D7',
      faction: 'CRC',
      agentDir: 'civic-office-crc-faction',
    },
    {
      officeId: 'STAFF-BAYLIGHT',
      title: 'Baylight Authority Director',
      holder: 'Keisha Test',
      popid: 'POP-TEST41',
      district: 'citywide',
      faction: 'STAFF',
      agentDir: 'civic-office-baylight-authority',
      initiative: 'INIT-006',
      neighborhoods: ['Baylight District'],
      dataSources: ['output/city-civic-database/initiatives/baylight/'],
    },
    {
      officeId: 'STAFF-COMMS',
      title: 'Communications Director',
      holder: 'Comms Test',
      popid: 'POP-TEST38',
      district: 'citywide',
      faction: 'STAFF',
      agentDir: 'civic-office-none',
    },
    {
      officeId: 'MAYOR-01',
      title: 'Mayor',
      holder: 'Mayor Test',
      popid: 'POP-TEST34',
      district: 'citywide',
      faction: 'OPP',
      agentDir: 'civic-office-mayor',
    },
  ],
  projects: [],
}));

fs.writeFileSync(path.join(tmp, 'output', 'simulation_ledger_snapshot.jsonl'),
  [
    JSON.stringify({ POPID: 'POP-00901', Name: 'Alpha Local', Neighborhood: 'Temescal', Status: 'active', RoleType: 'baker', Tier: 4 }),
    JSON.stringify({ POPID: 'POP-00021', Name: 'Star Player', Neighborhood: 'Temescal', Status: 'active', RoleType: 'Shortstop', Tier: 1 }),
    JSON.stringify({ POPID: 'POP-00902', Name: 'Beta Local', Neighborhood: 'Temescal', Status: 'inactive', RoleType: 'cook', Tier: 4 }),
    JSON.stringify({ POPID: 'POP-00903', Name: 'Gamma Far', Neighborhood: 'Fruitvale', Status: 'active', RoleType: 'nurse', Tier: 4 }),
    JSON.stringify({ POPID: 'POP-00910', Name: 'Site Neighbor', Neighborhood: 'Baylight District', Status: 'active', RoleType: 'vendor', Tier: 4 }),
  ].join('\n') + '\n'
);

fs.writeFileSync(path.join(tmp, 'output', 'initiative_tracker.json'), JSON.stringify({
  initiatives: [
    {
      id: 'INIT-TEST',
      name: 'Test Hub',
      neighborhoods: ['Temescal'],
      implementation: { phase: 'construction-planning', summary: 'waiting on a stamp' },
    },
    {
      id: 'INIT-006',
      name: 'Baylight District — Final Council Vote',
      neighborhoods: ['Jack London', 'Downtown'],
      implementation: { phase: 'construction-planning', summary: 'shortlist next' },
    },
  ],
}));

fs.writeFileSync(path.join(tmp, 'output', 'world_summary_c103.md'), `
## City State

### faith-event (1)
- holy_day | Christmas service | Temescal | mag 0.01 | targets Test Chapel

### lifestyle-sighting (1)
- sighting | someone spotted at Test Cafe | Temescal | mag 0.01 | targets BIZ-00999

### city-event (1)
- city-event | Temescal Night Market (Temescal) | Temescal | mag 0.02

### faith-event (extra)
- holy_day | far church | Fruitvale | mag 0.01 | targets Far Parish
`);

fs.writeFileSync(
  path.join(tmp, 'output', 'city-civic-database', 'initiatives', 'baylight', 'decisions_c103.json'),
  JSON.stringify({
    initiativeId: 'INIT-006',
    trackerUpdates: {
      ImplementationPhase: 'construction-planning',
      MilestoneNotes: 'C103: shortlist published',
    },
  })
);
fs.writeFileSync(
  path.join(tmp, 'output', 'city-civic-database', 'initiatives', 'baylight', 'BAYL-C000-ProjectCharter.md'),
  '# Baylight District Project Charter\n\nScope line.\n'
);

const map = JSON.parse(fs.readFileSync(path.join(tmp, 'scripts', 'civic-office-map.json'), 'utf8'));
map.offices.push(
  {
    officeId: 'COUNCIL-D6', title: 'D6', holder: 'Crane Test', popid: 'POP-TEST06',
    district: 'D6', faction: 'CRC', agentDir: 'civic-office-crc-faction',
  },
  {
    officeId: 'COUNCIL-D8', title: 'D8', holder: 'Chen Test', popid: 'POP-TEST08',
    district: 'D8', faction: 'CRC', agentDir: 'civic-office-crc-faction',
  }
);
fs.appendFileSync(path.join(tmp, 'output', 'simulation_ledger_snapshot.jsonl'),
  JSON.stringify({ POPID: 'POP-00802', Name: 'Kono Local', Neighborhood: 'KONO', Status: 'active', RoleType: 'glazier', Tier: 4 }) + '\n'
);
const audit = {
  snapshots: {
    Neighborhood_Map: [
      { Neighborhood: 'KONO', Sentiment: '0.27', CrimeIndex: '0.68', NeighborhoodTrajectory: 'growth', TrajectoryMomentum: '7' },
      { Neighborhood: 'Temescal', Sentiment: '0.55', CrimeIndex: '0.76', NeighborhoodTrajectory: 'growth', TrajectoryMomentum: '7' },
      { Neighborhood: 'Rockridge', Sentiment: '0.53', CrimeIndex: '0.37', NeighborhoodTrajectory: 'growth', TrajectoryMomentum: '7' },
      { Neighborhood: 'West Oakland', Sentiment: '0.50', CrimeIndex: '1.19', NeighborhoodTrajectory: 'decay', TrajectoryMomentum: '3' },
      { Neighborhood: 'Downtown', Sentiment: '0.41', CrimeIndex: '1.02', NeighborhoodTrajectory: 'growth', TrajectoryMomentum: '7' },
    ],
    Civic_Office_Ledger: [
      { OfficeId: 'COUNCIL-D7', PopId: 'POP-TEST01', Holder: 'Test Holder', District: 'D7', Approval: '48' },
    ],
    Crime_Metrics: [],
  },
};
const pack = buildPack({
  root: tmp, cycle: '103', agentDir: 'COUNCIL-D7', officeMap: map, audit,
});

check('actor is the office holder not a reporter', pack.actor.name === 'Test Holder' && pack.team === 'civic-office');
check('task is district-week', pack.task.a === 'district-week');
check('lede is KONO not Temescal roster', pack.pulse && pack.pulse.hood === 'KONO' && /KONO/.test(pack.pulse.label));
check('subjects are KONO only', pack.exposure.subjects.length === 1 && pack.exposure.subjects[0].name === 'Kono Local');
check('Temescal names stay off the KONO lede', !pack.exposure.subjects.some(s => s.name === 'Alpha Local' || s.name === 'Star Player'));
check('inactive and other-hood excluded', !pack.exposure.subjects.some(s => s.name === 'Beta Local' || s.name === 'Gamma Far'));
check('CRC peers are the other CRC seats not self', pack.role.civicPeers.some(p => p.Holder === 'Crane Test') && pack.role.civicPeers.some(p => p.Holder === 'Chen Test') && !pack.role.civicPeers.some(p => p.OfficeId === 'COUNCIL-D7'));
check('subject is attached to the KONO fact', pack.exposure.subjects[0].why && /KONO/.test(pack.exposure.subjects[0].why));
check('Temescal church not on KONO lede', !pack.exposure.churches.some(c => c.name === 'Test Chapel'));
check('other-hood church excluded', !pack.exposure.churches.some(c => c.name === 'Far Parish'));
check('empty people if no snapshot', loadConstituents(path.join(tmp, 'missing'), ['Temescal'], 8).length === 0);

const bay = buildPack({
  root: tmp, cycle: '103', agentDir: 'STAFF-BAYLIGHT', officeMap: map,
});
check('baylight is initiative-week', bay.task.a === 'initiative-week');
check('baylight owns INIT-006', bay.known.some(k => /INIT-006|Baylight District/.test(k.text + k.id)));
check('baylight does not eat Test Hub', !bay.known.some(k => /Test Hub/.test(k.text)));
check('baylight reads this-cycle cabinet only', bay.known.some(k => /shortlist published/.test(k.text)) && !bay.known.some(k => /Project Charter/.test(k.text)));
check('baylight turn is INIT-006', bay.pulse && bay.pulse.initiative === 'INIT-006');
check('baylight turf is the neighborhood', bay.signal.hoods.includes('Baylight District') && !bay.signal.hoods.includes('Temescal'));
check('baylight people are site neighbors only', bay.exposure.subjects.length === 1 && bay.exposure.subjects[0].name === 'Site Neighbor');

const comms = buildPack({
  root: tmp, cycle: '103', agentDir: 'STAFF-COMMS', officeMap: map,
});
check('comms is role-week', comms.task.a === 'role-week');
check('comms has no neighbor dump', comms.exposure.subjects.length === 0 && comms.signal.hoods.length === 0);
check('comms does not eat city initiatives', !comms.known.some(k => /Test Hub|Baylight/.test(k.text)));
check('comms with nothing to move is empty', comms.empty === true && comms.pulse == null);

const mayor = buildPack({
  root: tmp, cycle: '103', agentDir: 'MAYOR-01', officeMap: map,
});
check('mayor picks one initiative', mayor.pulse && mayor.pulse.initiative && mayor.known.filter(k => /^F-INIT-/.test(k.id)).length === 1);
check('mayor has no neighbor dump', mayor.exposure.subjects.length === 0);

console.log((failed ? failed + ' failed' : 'ok') + ' civic office pack');
process.exit(failed ? 1 : 0);
