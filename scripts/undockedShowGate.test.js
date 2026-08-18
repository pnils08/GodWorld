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

// The gate is disk-only EXCEPT the documented --push transport (pushFeed),
// which legitimately lazy-requires lib/sheets to reach Undocked_Feed
// (research.27 2.3 item 4, d01e0486). The real invariant is "no sheet touch
// outside push", not "the string never appears anywhere" -- a whole-file scan
// also caught its own explaining comment. Strip comments and exclude the
// pushFeed function body before checking the rest stays sheet-pure.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}
const pushFeedStart = srcG.indexOf('async function pushFeed(');
const pushFeedEnd = srcG.indexOf('function enqueueStagedDir(');
const srcGDiskOnly = stripComments(srcG.slice(0, pushFeedStart) + srcG.slice(pushFeedEnd));
check('no sheet client outside push transport',
  pushFeedStart > -1 && pushFeedEnd > pushFeedStart &&
  !/lib\/sheets|googleapis|batchUpdate/.test(srcGDiskOnly));
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
check('reject archives staged', !fs.existsSync(path.join(tmp, stagedRel))
  && fs.existsSync(path.join(tmp, 'output', 'spacemolt-show', 'staged', 'archive', 'undocked-pop00962-test.json')));
check('reject sweep empty', G.listSweepEligible(tmp).length === 0);

// restore staged + pending intake so the approve path can run
fs.renameSync(
  path.join(tmp, 'output', 'spacemolt-show', 'staged', 'archive', 'undocked-pop00962-test.json'),
  path.join(tmp, stagedRel)
);
enq.row.Applied = 'no';
enq.row.StagedPath = stagedRel;
fs.writeFileSync(enq.path, JSON.stringify(enq.row, null, 2));
const approved = G.decide('undocked-pop00962-test', 'yes', 'rb', 'windowed escrow noted', tmp);
check('approve Applied=yes', approved.Applied === 'yes');
check('approve has feed event', approved.FeedEvent && approved.FeedEvent.EventType === 'undocked-episode');
const pack = JSON.parse(fs.readFileSync(G.feedPath(103, tmp), 'utf8'));
check('feed pack one event', pack.events.length === 1 && pack.events[0].POPID === 'POP-00962');
check('feed has no captains prose', JSON.stringify(pack).indexOf('belt paid') === -1);

try { G.decide('undocked-pop00962-test', 'yes', 'rb', '', tmp); check('no double apply', false); }
catch (e) { check('no double apply', /already decided/.test(e.message)); }

check('approve archives staged', !fs.existsSync(path.join(tmp, stagedRel)));
check('approve staged lives under archive', fs.existsSync(path.join(
  tmp, 'output', 'spacemolt-show', 'staged', 'archive', 'undocked-pop00962-test.json'
)));
check('decided episode gone from sweep set', G.listSweepEligible(tmp).indexOf('undocked-pop00962-test.json') < 0);
check('enqueueStagedDir skips archived', G.enqueueStagedDir(104, tmp).length === 0);

// §2.5 daily cadence: same pilot, same cycle, two flights -> distinct EpisodeIds
// (bare id for flight 1, -e2 for flight 2), and autoDecide approves valid rows
// unattended while parking anything decide() throws on.
const stagedDir = path.join(tmp, 'output', 'spacemolt-show', 'staged');
function cloneStaged(id) {
  const s = JSON.parse(JSON.stringify(staged));
  s.episode_id = id;
  const p = path.join(stagedDir, id + '.json');
  fs.writeFileSync(p, JSON.stringify(s, null, 2));
  return p;
}
cloneStaged('undocked-pop00962-flight-a');
cloneStaged('undocked-pop00962-flight-b');
const enqA = G.enqueue(path.join(stagedDir, 'undocked-pop00962-flight-a.json'), 104, tmp);
const enqB = G.enqueue(path.join(stagedDir, 'undocked-pop00962-flight-b.json'), 104, tmp);
check('first flight of cycle is Seq 1', enqA.row.Seq === 1);
check('second flight same pilot+cycle is Seq 2', enqB.row.Seq === 2);
const reEnqA = G.enqueue(path.join(stagedDir, 'undocked-pop00962-flight-a.json'), 104, tmp);
check('re-enqueue keeps its Seq', reEnqA.row.Seq === 1);

// parked path: flight-b's staged file vanishes before decide -> autoDecide
// must park it (Applied stays no) and still approve flight-a.
fs.renameSync(path.join(stagedDir, 'undocked-pop00962-flight-b.json'),
  path.join(stagedDir, 'undocked-pop00962-flight-b.json.hidden'));
const auto1 = G.autoDecide(104, tmp);
check('autoDecide approves the valid flight',
  auto1.approved.length === 1 && auto1.approved[0] === 'undocked-pop00962-flight-a');
check('autoDecide parks the broken flight',
  auto1.parked.length === 1 && auto1.parked[0].episodeId === 'undocked-pop00962-flight-b');
const parkedRow = JSON.parse(fs.readFileSync(G.intakePath('undocked-pop00962-flight-b', tmp), 'utf8'));
check('parked row stays Applied=no', parkedRow.Applied === 'no');

// restore the hidden staged file: autoDecide now approves the parked row too
fs.renameSync(path.join(stagedDir, 'undocked-pop00962-flight-b.json.hidden'),
  path.join(stagedDir, 'undocked-pop00962-flight-b.json'));
const auto2 = G.autoDecide(104, tmp);
check('autoDecide picks up the recovered row', auto2.approved.length === 1 && auto2.parked.length === 0);
const pack104 = JSON.parse(fs.readFileSync(G.feedPath(104, tmp), 'utf8'));
const ids104 = pack104.events.map(function (e) { return e.EpisodeId; }).sort();
check('two same-pilot episodes carry distinct world ids',
  ids104.length === 2 && ids104[0] === 'undocked-pop00962-Y2C52' && ids104[1] === 'undocked-pop00962-Y2C52-e2');
check('auto-gate stamped as decider',
  JSON.parse(fs.readFileSync(G.intakePath('undocked-pop00962-flight-a', tmp), 'utf8')).DecidedBy === 'auto-gate');
check('sequenced id passes real-world-date wall',
  !/\d{4}-\d{2}-\d{2}/.test(ids104[1]));

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('undockedShowGate: ok');
