'use strict';

const civicSeat = require('./civicSeat');
const { prepTargetDirForHood, ailmentPerception, isOneWeekDecay, constituentTopic } = require('./cron-civic-run');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const map = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'civic-office-map.json'), 'utf8'));
const d7 = prepTargetDirForHood('KONO', map);
const d6 = prepTargetDirForHood('Piedmont Ave', map);
const ghost = prepTargetDirForHood('Montclair', map);
check('KONO routes to D7 agentDir', d7 === 'civic-office-council-d7');
check('Piedmont Ave routes to D6 agentDir', d6 === 'civic-office-council-d6');
check('Montclair (not a tracked hood) routes nowhere', ghost === null);
check('D7 HIGH does not open D6', d7 !== d6);
check('live map has 9 council dirs', civicSeat.councilAgentDirs(map).length === 9);

// Builder 2026-11-01: the packet reports hoods; it does not assign a crisis.
const hoods = {
  Fruitvale: { sentiment: 0.4, retail: 12, crime: 1 },
  Laurel: { sentiment: -0.03, retail: 4.34, crime: 1 },
};
const seatTopic = constituentTopic(['Fruitvale', 'Laurel'], hoods, false);
const cityTopic = constituentTopic(['Fruitvale', 'Laurel'], hoods, true);
check('constituent topic names no crisis or credit', !/crisis|success|credit|who answers/i.test(seatTopic.title + seatTopic.body + cityTopic.title + cityTopic.body));
check('S344 line stays', /you fight for your constituents/.test(seatTopic.body));
check('district seat body lists no hood', !/Fruitvale|Laurel/.test(seatTopic.body));
check('citywide body lists every hood plainly', /\*\*Fruitvale\*\*/.test(cityTopic.body) && /\*\*Laurel\*\*/.test(cityTopic.body));
check('no hoods, no topic', constituentTopic(['Nowhere'], hoods, false) === null);

const decay = { type: 'math-imbalance', severity: 'high', affectedEntities: { neighborhoods: ['Rockridge'] }, evidence: { fields: { priorCycle: 113, decaySignals: ['Sentiment -0.030', 'RetailVitality -2.16', 'HousingPressure +1.000'] } } };
const allPositive = { type: 'math-imbalance', severity: 'low', affectedEntities: { neighborhoods: [] }, evidence: { fields: {} } };
check('decay flag against the last week is one-week', isOneWeekDecay(decay, 114));
check('decay flag against an older audit is not', !isOneWeekDecay(decay, 115));
check('other math-imbalance is not', !isOneWeekDecay(allPositive, 114));
check('stuck initiative is not', !isOneWeekDecay({ type: 'stuck-initiative', evidence: { fields: {} } }, 114));
check('decay reading makes no demand', !/declining|no city program/i.test(ailmentPerception(decay)) && /^Rockridge since the last reading:/.test(ailmentPerception(decay)));
const moodHeld = { type: 'math-imbalance', affectedEntities: { neighborhoods: ['Rockridge'] }, evidence: { fields: { priorCycle: 113, decaySignals: ['RetailVitality -0.60', 'CrimeIndex +2', 'HousingPressure +0.100'], standing: { Sentiment: { current: 0.4 } } } } };
check('a standing entry alone does not read as a mood fall', !/mood/.test(ailmentPerception(moodHeld)));

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('cron-civic-prep-route: ok');
