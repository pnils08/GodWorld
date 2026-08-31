'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { lintText } = require('./lintCivicPackets');
const { districtPackRef, weekCarryBlock, spliceWeekCarry, modelChainFor, FALLBACK_MODELS } = require('./cron-civic-run');

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
// civic.26 (Mike-direct): sentiment is a metric every city tracks, so a seat
// carrying its own hood-vs-city sentiment reading is NOT an engine leak and is
// no longer stripped. Previously this asserted the line was dropped.
check('public-metric wall line kept', block.includes('0.27'));
// The drop mechanism itself still has to work — proven on vocabulary that only
// exists inside the engine.
check('engine-internal metric wall line dropped', !weekCarryBlock({
  posts: [{ content: 'KONO momentum 0.27 against the citywide dial' }],
  packPath: 'output/cron-civic/packs/COUNCIL-D7_c103.json',
}).includes('0.27'));
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

// --- civic.26: seat model fallback chain -----------------------------------
// The Sunday chain HALTed twice on 2026-08-30 because mayor-open made two calls
// 0.4s apart against one model and hit a shared-pool 429 on Mistral. The chain
// below is what lets a seat borrow another provider instead of taking the whole
// hearing down with it.
console.log('\ncivic.26 — model fallback chain');

var mayorChain = modelChainFor('mistralai/mistral-large');
check('primary model leads the chain', mayorChain[0] === 'mistralai/mistral-large', JSON.stringify(mayorChain));
check('chain offers fallbacks', mayorChain.length > 1, JSON.stringify(mayorChain));
check('no same-family fallback (a provider 429 takes every slug it serves)',
  mayorChain.slice(1).every(function (m) { return m.split('/')[0] !== 'mistralai'; }), JSON.stringify(mayorChain));
check('fallbacks ordered least-used-first, so a borrowed voice stays distinct',
  mayorChain[1] === 'moonshotai/kimi-k2', JSON.stringify(mayorChain));

// A seat already ON a fallback model must not list itself twice.
var deepseekChain = modelChainFor('deepseek/deepseek-chat');
check('primary is not duplicated in its own chain',
  deepseekChain.filter(function (m) { return m === 'deepseek/deepseek-chat'; }).length === 1, JSON.stringify(deepseekChain));
check('same-family fallback dropped for a fallback-model seat',
  deepseekChain.every(function (m, i) { return i === 0 || m.split('/')[0] !== 'deepseek'; }), JSON.stringify(deepseekChain));

// Every fallback must be a distinct provider — otherwise the chain has fewer
// real escape hatches than it appears to.
var fams = FALLBACK_MODELS.map(function (m) { return m.split('/')[0]; });
check('every fallback is a distinct provider family', new Set(fams).size === fams.length, JSON.stringify(fams));
