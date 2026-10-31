'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadMajorSportsEvents } = require('./civicMajorEvents');
const { gamePromptView } = require('./buildCivicOfficeSlice');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic-major-events-'));
const dir = path.join(root, 'output', 'beats');
fs.mkdirSync(dir, { recursive: true });
const tab = 'Oakland_Sports_Feed';
const rows = [
  { Cycle: '110', SeasonType: 'championship', EventType: 'game-result',
    TeamsUsed: 'Synthetic Club', EventTrigger: 'championship', HomeNeighborhood: 'Downtown',
    StoryAngle: 'Synthetic Club wins its championship.' },
  { Cycle: '111', SeasonType: 'off-season', EventType: 'editorial-note',
    TeamsUsed: 'Synthetic Club', EventTrigger: 'championship', HomeNeighborhood: 'Downtown',
    StoryAngle: 'Synthetic Club parade rolls through Downtown.',
    Notes: 'The Synthetic Club celebrated with a parade and rally in Downtown.' },
  { Cycle: '111', SeasonType: 'off-season', EventType: 'editorial-note',
    TeamsUsed: 'Synthetic Club', EventTrigger: 'championship', HomeNeighborhood: 'Fruitvale',
    StoryAngle: 'The team considers its next season.', Notes: 'No event was held.' },
];
const write = () => {
  fs.writeFileSync(path.join(dir, tab + '.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
    cycle: 113, generatedAt: '2026-10-31T00:00:00.000Z', rows: { [tab]: rows.length },
  }));
};
write();

let failed = 0;
function check(name, ok) {
  if (ok) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name); }
}
const read = (office, hoods, cycle = 113) => loadMajorSportsEvents({
  root, cycle, office, hoods, canonicalHoods: ['Downtown', 'Fruitvale'],
});
const mayor = read({ officeId: 'MAYOR-01' }, []);
const d2 = read({ officeId: 'COUNCIL-D2' }, ['Downtown']);
const d3 = read({ officeId: 'COUNCIL-D3' }, ['Fruitvale']);
check('mayor sees championship and parade with their distinct source Cycles',
  mayor.available && mayor.items.length === 2 &&
  mayor.items.some(e => e.category === 'sports-championship' && e.occurredCycle === 110) &&
  mayor.items.some(e => e.category === 'sports-parade' && e.occurredCycle === 111));
check('D2 sees typed Downtown events', d2.items.length === 2 && d2.items.every(e => e.hoods[0] === 'Downtown'));
check('D3 does not get a Fruitvale event from the championship trigger alone', d3.items.length === 0);
check('brief states its source coverage limit', /later updates are not verified/.test(mayor.coverageNote));
check('source identities and revisions survive the prompt view',
  gamePromptView({ majorEvents: mayor }).majorEvents.items.every(e => e.eventId && e.sourceRef && e.sourceRevision));
check('requested Cycle beyond snapshot is unavailable, not no event',
  read({ officeId: 'MAYOR-01' }, [], 114).available === false);
const before = mayor.items.find(e => e.category === 'sports-parade');
rows[1].Notes += ' Corrected detail.';
write();
const after = read({ officeId: 'MAYOR-01' }, []).items.find(e => e.category === 'sports-parade');
check('source correction retains identity and changes revision',
  before.eventId === after.eventId && before.sourceRevision !== after.sourceRevision);
rows[1].HomeNeighborhood = 'Unresolved Place';
write();
const unresolved = read({ officeId: 'MAYOR-01' }, []).items.find(e => e.category === 'sports-parade');
check('unknown source place is not promoted to a canonical hood',
  unresolved && unresolved.hoods.length === 0 && unresolved.unresolvedPlace === 'Unresolved Place' &&
  read({ officeId: 'COUNCIL-D2' }, ['Downtown']).items.length === 1);
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
  cycle: 113, generatedAt: '2026-10-31T00:00:00.000Z', rows: { [tab]: rows.length + 1 },
}));
check('generation row mismatch is unavailable', read({ officeId: 'MAYOR-01' }, []).available === false);

fs.rmSync(root, { recursive: true, force: true });
if (failed) process.exit(1);
console.log('civicMajorEvents: all checks pass');
