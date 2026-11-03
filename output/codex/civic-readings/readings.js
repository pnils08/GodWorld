const tree = process.argv[2];
const slice = require(tree + '/scripts/buildCivicOfficeSlice.js');
const map = require('/root/GodWorld/scripts/civic-office-map.json');
const seats = map.offices.filter(o => o.agentDir && (/^COUNCIL-D\d$/.test(o.officeId) || ['MAYOR-01','CHIEF-POLICE'].includes(o.officeId)));
for (const o of seats) {
  try {
    const pack = slice.buildPack({ cycle: '114', agentDir: o.agentDir, root: '/root/GodWorld' });
    const pc = (pack.game || {}).problemContinuity || {};
    console.log('### ' + o.officeId + ' (passedOver kept internally: ' + ((pc.passedOver || []).length) + ')\n' + pc.text + '\n');
  } catch (e) { console.log(o.officeId, 'ERR', e.message.slice(0, 160)); }
}
