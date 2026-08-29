'use strict';

const civicSeat = require('./civicSeat');
const { prepTargetDirForHood } = require('./cron-civic-run');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const map = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'civic-office-map.json'), 'utf8'));
const d7 = prepTargetDirForHood('KONO', map);
const d6 = prepTargetDirForHood('Montclair', map);
check('KONO routes to D7 agentDir', d7 === 'civic-office-council-d7');
check('Montclair routes to D6 agentDir', d6 === 'civic-office-council-d6');
check('D7 HIGH does not open D6', d7 !== d6);
check('live map has 9 council dirs', civicSeat.councilAgentDirs(map).length === 9);

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('cron-civic-prep-route: ok');
