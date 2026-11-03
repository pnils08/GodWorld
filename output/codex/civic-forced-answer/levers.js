const tree = process.argv[2];
const slice = require(tree + '/scripts/buildCivicOfficeSlice.js');
const run = require(tree + '/scripts/cron-civic-run.js');
const map = require('/root/GodWorld/scripts/civic-office-map.json');
const seats = map.offices.filter(o => o.agentDir && (/^COUNCIL-D\d$/.test(o.officeId) || o.officeId === 'MAYOR-01'));
for (const o of seats) {
  try {
    const pack = slice.buildPack({ cycle: '114', agentDir: o.agentDir, root: '/root/GodWorld' });
    const p = run.datawakeUserPrompt(pack, '', o);
    const line = p.split('\n').find(l => /LEVER|pulse from your pack/.test(l)) || '(no lever line)';
    console.log(o.officeId.padEnd(11), line.slice(0, 140));
  } catch (e) { console.log(o.officeId, 'ERR', e.message.slice(0, 120)); }
}
