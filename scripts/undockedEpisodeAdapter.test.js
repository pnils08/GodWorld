'use strict';

const fs = require('fs');
const path = require('path');
const A = require('./undockedEpisodeAdapter');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const src = fs.readFileSync(path.join(__dirname, 'undockedEpisodeAdapter.js'), 'utf8');
check('no LLM client', !/openai|anthropic|openrouter|chat\.completions/i.test(src));
check('source is get_action_log', /spacemolt_social\/get_action_log/.test(src));
check('does not parse episode log for facts', !/tool_call/.test(src.split('loadEpisode')[0]));
check('never console.logs password', !/console\.log\([^)]*password/.test(src));

check('popid pad', A.popidFromSession('undocked-pop00962') === 'POP-00962');
check('popid 143', A.popidFromSession('undocked-pop00143') === 'POP-00143');

const ep962 = A.loadEpisode(path.join(
  __dirname, '..', 'output', 'spacemolt-show', 'episodes',
  'undocked-pop00962-2026-08-16T07-26-33.json'
));
check('sidecar has window', ep962.startedAt === '2026-08-16T07:26:33.044Z'
  && ep962.endedAt === '2026-08-16T07:36:44.052Z');
check('sidecar session', ep962.session === 'undocked-pop00962' && ep962.popid === 'POP-00962');
check('runner telemetry stays off facts', ep962.runner.turns === 78 && ep962.runner.toolErrors === 15);

const start = '2026-08-16T07:26:33.044Z';
const end = '2026-08-16T07:36:44.052Z';
check('in window', A.inWindow('2026-08-16T07:30:00Z', start, end));
check('naive space ts is UTC', A.inWindow('2026-08-16 07:30:00', start, end));
check('before window out', !A.inWindow('2026-08-16T07:20:00Z', start, end));
check('after window out', !A.inWindow('2026-08-16T07:40:00Z', start, end));

const mining = [
  { id: 1, category: 'mining', event_type: 'mining.yield', created_at: '2026-08-16T07:30:00Z',
    summary: 'mined iron', data: { resource_id: 'iron', quantity: 12, system_name: 'Haven' } },
  { id: 2, category: 'mining', event_type: 'mining.yield', created_at: '2026-08-16T06:00:00Z',
    summary: 'old', data: { resource_id: 'iron', quantity: 99, system_name: 'OldSys' } },
];
const trading = [
  { id: 3, category: 'trading', event_type: 'trading.exchange_fill', created_at: '2026-08-16T07:32:00Z',
    summary: 'sold ore', data: { total: 206, role: 'seller', item_id: 'iron_ore', quantity: 12, system_name: 'Haven Station' } },
];
const combat = [
  { id: 4, category: 'combat', event_type: 'combat.kill', created_at: '2026-08-16T07:33:00Z',
    summary: 'won', data: {} },
];
const navigation = [
  { id: 5, category: 'navigation', event_type: 'navigation.arrive', created_at: '2026-08-16T07:28:00Z',
    summary: 'arrived', data: { destination: 'Belt-4' } },
];
const session = [
  { id: 6, category: 'session', event_type: 'session.error', created_at: '2026-08-16T07:29:00Z',
    summary: 'no_fuel', data: {} },
];

const windowedMining = A.filterWindow(mining, start, end);
check('drops pre-window mine', windowedMining.length === 1 && windowedMining[0].id === 1);

const byCat = {
  mining: windowedMining,
  trading: trading,
  combat: combat,
  navigation: navigation,
  session: session,
};
const captains = [
  { index: 0, created_at: '2026-08-16T07:35:00Z', entry: 'The belt gave up iron and I sold it clean.' },
  { index: 1, created_at: '2026-08-15T00:00:00Z', entry: 'Yesterday I sat in dock.' },
];

const staged = A.assemble(ep962, byCat, captains);
A.assertSplit(staged);
check('v tag', staged.v === 'UNDOCKED-ADAPTER/1');
check('credits from trading', staged.facts.credits_delta.value === 206);
check('credits is FACT', staged.facts.credits_delta.type === 'FACT'
  && staged.facts.credits_delta.source === 'get_action_log');
check('systems from nav+mine', staged.facts.systems_visited.value.indexOf('Haven') >= 0
  && staged.facts.systems_visited.value.indexOf('Belt-4') >= 0);
check('old system excluded', staged.facts.systems_visited.value.indexOf('OldSys') < 0);
check('combat kill counted', staged.facts.combat_results.value.kills === 1);
check('cargo mined iron 12 not 99', staged.facts.cargo.value.mined.iron === 12);
check('cargo sold iron 12', staged.facts.cargo.value.sold.iron_ore === 12);
check('mishap no_fuel', staged.facts.mishaps.value.some(function (m) { return /no_fuel/.test(m.summary); }));
check('captains windowed 1', staged.captains_log.windowed === 1);
check('captains unwindowed 1', staged.captains_log.unwindowed.length === 1);
check('captains not FACT', staged.captains_log.kind === 'QUOTED_SUBJECTIVE_COLOR'
  && staged.captains_log.type === 'INTERPRETATION');
check('quote text present', staged.captains_log.entries[0].text.indexOf('belt gave up iron') >= 0);
check('quote not in facts JSON', JSON.stringify(staged.facts).indexOf('belt gave up iron') === -1);
check('runner toolErrors not a fact field', !staged.facts.toolErrors);

const empty = A.assemble(ep962, { mining: [], trading: [], combat: [], navigation: [], session: [] }, []);
check('empty credits null not zero-invented', empty.facts.credits_delta.value === null);
check('empty still FACT typed', empty.facts.credits_delta.type === 'FACT');

try {
  A.assertSplit({
    facts: { leaked: 'The belt gave up iron and I sold it clean.' },
    captains_log: { kind: 'QUOTED_SUBJECTIVE_COLOR', entries: [{ text: 'The belt gave up iron and I sold it clean.' }] },
  });
  check('leak detector', false);
} catch (e) {
  check('leak detector', /leaked/.test(e.message));
}

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('undockedEpisodeAdapter: ok');
