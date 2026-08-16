'use strict';

const { councilDir, resolveOfficeRow, councilSeats, councilAgentDirs, personaDirFor } = require('./civicSeat');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const map = {
  offices: [
    { officeId: 'COUNCIL-D6', holder: 'Test Crane', popid: 'POP-TEST06', district: 'D6', faction: 'CRC', agentDir: 'civic-office-council-d6', model: 'deepseek/deepseek-chat' },
    { officeId: 'COUNCIL-D7', holder: 'Test Ashford', popid: 'POP-TEST07', district: 'D7', faction: 'CRC', agentDir: 'civic-office-council-d7', model: 'deepseek/deepseek-chat' },
    { officeId: 'MAYOR-01', holder: 'Test Mayor', popid: 'POP-TEST00', district: 'citywide', faction: 'OPP', agentDir: 'civic-office-mayor' },
  ],
};

check('councilDir D7', councilDir('D7') === 'civic-office-council-d7');
check('resolve by officeId', resolveOfficeRow(map, 'COUNCIL-D7').holder === 'Test Ashford');
check('resolve by new agentDir', resolveOfficeRow(map, 'civic-office-council-d7').district === 'D7');
check('D6 is not D7', resolveOfficeRow(map, 'COUNCIL-D6').officeId === 'COUNCIL-D6');
check('nine-shape seats are only council', councilSeats(map).length === 2);
check('council dirs unique', councilAgentDirs(map).join(',') === 'civic-office-council-d6,civic-office-council-d7');

const d7 = resolveOfficeRow(map, 'COUNCIL-D7');
const persona = personaDirFor(d7, require('path').join(__dirname, '..'));
check('persona fallback is CRC faction until IDENTITY lands', persona === 'civic-office-crc-faction' || persona === 'civic-office-council-d7');

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('civicSeat: ok');
