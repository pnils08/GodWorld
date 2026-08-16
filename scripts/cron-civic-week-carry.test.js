'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { lintText } = require('./lintCivicPackets');
const { districtPackRef, weekCarryBlock, spliceWeekCarry } = require('./cron-civic-run');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const block = weekCarryBlock({
  posts: [
    { content: 'datawake: KONO needs investment, not abandonment' },
    { content: 'KONO sentiment 0.27 vs city 0.489' },
  ],
  packPath: 'output/cron-civic/packs/COUNCIL-D7_c103.json',
  lever: 'stand with KONO or leave it',
});

check('heading is This week on the wall', block.includes('## This week on the wall'));
check('pointer names the pack file', block.includes('Latest district pack on disk: output/cron-civic/packs/COUNCIL-D7_c103.json'));
check('lever from pack', block.includes('This week\'s lever from that pack: stand with KONO or leave it'));
check('clean wall line kept', block.includes('KONO needs investment, not abandonment'));
check('metric-decimal wall line dropped', !block.includes('0.27'));
check('object-object wall line dropped', !weekCarryBlock({
  posts: [{ content: 'datawake: [object Object] | action: audit' }],
  packPath: 'output/cron-civic/packs/COUNCIL-D7_c103.json',
}).includes('[object Object]'));
check('week block lints clean', lintText(block).length === 0, JSON.stringify(lintText(block)));

const empty = weekCarryBlock({ posts: [], packPath: null });
check('empty wall named', empty.includes('No CIVIC wall lines this week yet'));
check('missing pack named', empty.includes('No district pack on disk for this office this cycle'));

const packet = [
  '# Pending Decisions — CRC — Cycle 103',
  '',
  '## City This Cycle',
  '- KONO — mood soured',
  '',
  '## DECISION 1 — Temescal Community Health Center',
  '',
  'Your call.',
].join('\n');
const once = spliceWeekCarry(packet, block);
const twice = spliceWeekCarry(once, block);
check('splice sits before DECISION', once.indexOf('## This week on the wall') < once.indexOf('## DECISION 1'));
check('splice keeps the decision', once.includes('## DECISION 1 — Temescal Community Health Center'));
check('splice is idempotent', (twice.match(/## This week on the wall/g) || []).length === 1);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'civic-week-carry-'));
fs.mkdirSync(path.join(tmp, 'output', 'cron-civic', 'packs'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'output', 'cron-civic', 'packs', 'COUNCIL-D7_c103.json'), JSON.stringify({
  actor: { officeId: 'COUNCIL-D7', agentDir: 'civic-office-crc-faction' },
  task: { goal: 'stand with KONO or leave it' },
}) + '\n');
const map = {
  offices: [{
    officeId: 'COUNCIL-D7',
    holder: 'Test Holder',
    popid: 'POP-TEST01',
    district: 'D7',
    agentDir: 'civic-office-crc-faction',
  }],
};
const ref = districtPackRef('civic-office-crc-faction', 103, map, tmp);
check('pack ref path', ref.path === 'output/cron-civic/packs/COUNCIL-D7_c103.json');
check('pack ref lever', ref.lever === 'stand with KONO or leave it');
check('missing office has no pack', districtPackRef('civic-office-mayor', 103, { offices: [] }, tmp).path === null);

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('cron-civic-week-carry: ok');
