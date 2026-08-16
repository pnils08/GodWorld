'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const C = require('./undockedShowContract');
const G = require('./undockedShowGate');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const srcG = fs.readFileSync(path.join(__dirname, 'undockedShowGate.js'), 'utf8');
const srcC = fs.readFileSync(path.join(__dirname, 'undockedShowContract.js'), 'utf8');
check('no sheet client in gate', !/lib\/sheets|googleapis|batchUpdate/.test(srcG));
check('no LLM client', !/openai|anthropic|chat\.completions/.test(srcG + srcC));
check('Applied default no', /Applied: 'no'/.test(srcG));
check('one event type', C.EVENT_TYPE === 'undocked-episode');
check('fourth-wall blocks VideoGame', C.FOURTH_WALL.test('video game'));

const staged = {
  v: 'UNDOCKED-ADAPTER/1',
  episode_id: 'undocked-pop00962-test',
  popid: 'POP-00962',
  holder: 'Marcus Walker',
  facts: {
    credits_delta: {
      type: 'FACT', source: 'get_action_log', value: -68,
      basis: [
        { id: 1, event_type: 'trading.exchange_fill', n: 134 },
        { id: 2, event_type: 'trading.buy_order_created', n: -202 },
        { id: 3, event_type: 'trading.order_cancelled', n: 202 },
        { id: 4, event_type: 'trading.buy_order_created', n: -202 },
      ],
    },
    systems_visited: { type: 'FACT', source: 'get_action_log', value: ['Sol'] },
    combat_results: { type: 'FACT', source: 'get_action_log', value: { events: 0, kills: 0, deaths: 0, other: 0 } },
    mishaps: { type: 'FACT', source: 'get_action_log', value: [] },
    cargo: { type: 'FACT', source: 'get_action_log', value: { mined: { iron_ore: 16, nickel_ore: 12, copper_ore: 9 }, sold: {} } },
    event_counts: { type: 'FACT', source: 'get_action_log', value: { mining: 6, trading: 8, combat: 0, navigation: 0, session: 1 } },
    entries: { type: 'FACT', source: 'get_action_log', value: { mining: [], trading: [], combat: [], navigation: [], session: [] } },
  },
  captains_log: {
    kind: 'QUOTED_SUBJECTIVE_COLOR',
    type: 'INTERPRETATION',
    windowed: 3,
    entries: [{ text: 'The belt paid in iron.' }],
  },
};

check('open escrow flagged', C.openEscrow(staged) === true);
check('magnitude 3+', C.magnitude(staged) >= 3);

const feed = C.projectFeed(staged, 103, 'output/spacemolt-show/staged/x.json');
const ok = C.validateFeed(feed);
check('feed valid', ok.valid, ok.errors && ok.errors.join('; '));
check('credits on feed', feed.CreditsDelta === -68);
check('escrow flag', feed.Flags.indexOf('open_escrow') >= 0);
check('windowed flag', feed.Flags.indexOf('credits_delta_windowed') >= 0);
check('no quote on feed', !feed.captains_log && JSON.stringify(feed).indexOf('belt paid') === -1);

const leaked = C.validateFeed(Object.assign({}, feed, { VideoGame: 'SpaceMolt' }));
check('VideoGame rejected', !leaked.valid && leaked.errors.some(function (e) { return /VideoGame|fourth-wall/.test(e); }));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'undocked-gate-'));
const stagedRel = path.join('output', 'spacemolt-show', 'staged', 'undocked-pop00962-test.json');
fs.mkdirSync(path.join(tmp, path.dirname(stagedRel)), { recursive: true });
fs.writeFileSync(path.join(tmp, stagedRel), JSON.stringify(staged, null, 2));

const enq = G.enqueue(stagedRel, 103, tmp);
check('enqueue Applied=no', enq.row.Applied === 'no');
check('enqueue no FeedEvent', enq.row.FeedEvent === null);
check('Daypart SHOW', enq.row.Daypart === 'SHOW');

try { G.decide(enq.row.EpisodeId, 'yes', '', '', tmp); check('approve requires by', false); }
catch (e) { check('approve requires by', /--by/.test(e.message)); }

const rejected = G.decide('undocked-pop00962-test', 'rejected', 'rb', 'not this one', tmp);
check('reject flips Applied', rejected.Applied === 'rejected');
check('reject writes no feed file', !fs.existsSync(G.feedPath(103, tmp)));

// re-enqueue after resetting applied by rewriting
enq.row.Applied = 'no';
fs.writeFileSync(enq.path, JSON.stringify(enq.row, null, 2));
const approved = G.decide('undocked-pop00962-test', 'yes', 'rb', 'windowed escrow noted', tmp);
check('approve Applied=yes', approved.Applied === 'yes');
check('approve has feed event', approved.FeedEvent && approved.FeedEvent.EventType === 'undocked-episode');
const pack = JSON.parse(fs.readFileSync(G.feedPath(103, tmp), 'utf8'));
check('feed pack one event', pack.events.length === 1 && pack.events[0].POPID === 'POP-00962');
check('feed has no captains prose', JSON.stringify(pack).indexOf('belt paid') === -1);

try { G.decide('undocked-pop00962-test', 'yes', 'rb', '', tmp); check('no double apply', false); }
catch (e) { check('no double apply', /already decided/.test(e.message)); }

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('undockedShowGate: ok');
