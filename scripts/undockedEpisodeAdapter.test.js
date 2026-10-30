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
const mission = [
  { id: 7, category: 'mission', event_type: 'mission.accepted', created_at: '2026-08-16T07:27:00Z',
    summary: 'accepted iron supply run', data: { mission_id: 'iron_supply_run', credits: 1500 } },
  { id: 8, category: 'mission', event_type: 'mission.completed', created_at: '2026-08-16T07:34:00Z',
    summary: 'completed iron supply run', data: { mission_id: 'iron_supply_run', credits: 1500 } },
  { id: 9, category: 'mission', event_type: 'mission.completed', created_at: '2026-08-16T06:10:00Z',
    summary: 'old contract', data: { mission_id: 'old', credits: 9999 } },
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
  mission: A.filterWindow(mission, start, end),
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
check('credits from trading + closed contract, accept not counted, old contract windowed out',
  staged.facts.credits_delta.value === 206 + 1500);
check('mission category fetched', A.CATEGORIES.indexOf('mission') >= 0 && staged.source.categories.indexOf('mission') >= 0);
check('mission accept alone is a measured zero (entries, no payout), never null', A.deriveCredits([mission[0]]).value === 0 && /measured zero/.test(A.deriveCredits([mission[0]]).note));
check('mission completion scores its credits', A.deriveCredits([mission[1]]).value === 1500);
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

const empty = A.assemble(ep962, { mining: [], trading: [], mission: [], combat: [], navigation: [], session: [] }, []);
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

// research.29 Move 2 (builder 2026-10-16: "give the citizens their awarded
// points"). Station sales score; a night with entries but no credit event is a
// measured zero; a window with no entries at all stays unknown.
const fuel = { category: 'trading', event_type: 'trading.fuel_sold', data: { credits: 14, quantity: 14 } };
check('trading.fuel_sold scores its credits (Clarissa 2026-09-07: 14)', A.creditDeltaForEntry(fuel) === 14);
check('a station buy with plain credits is spent', A.creditDeltaForEntry({ category: 'trading', event_type: 'trading.fuel_bought', data: { credits: 20 } }) === -20);
check('credits_delta still wins over plain credits', A.creditDeltaForEntry({ category: 'trading', event_type: 'trading.fuel_sold', data: { credits: 14, credits_delta: 9 } }) === 9);
check('an unrecognised trading shape stays unscored', A.creditDeltaForEntry({ category: 'trading', event_type: 'trading.price_check', data: { credits: 5 } }) === null);
const mined = [{ category: 'mining', event_type: 'mining.ore_mined', data: { quantity: 6 } }, { category: 'session', event_type: 'session.login', data: {} }];
const zero = A.deriveCredits(mined);
check('entries without a credit event -> measured zero', zero.value === 0 && zero.type === 'FACT' && /measured zero/.test(zero.note));
const unknown = A.deriveCredits([]);
check('no entries in window -> null (unknown), never zero', unknown.value === null && /unknown/.test(unknown.note));
const sessionOnly = A.deriveCredits([{ category: 'session', event_type: 'session.login', data: {} }, { category: 'session', event_type: 'session.login', data: {} }]);
check('session-only window (runner never flew) -> null with the reason, never zero', sessionOnly.value === null && /never flew|stalled/.test(sessionOnly.note));
check('loadEpisode carries the runner stall verdict', (function () {
  const fs2 = require('fs'), os2 = require('os'), p = require('path').join(os2.tmpdir(), 'ep-stall-' + process.pid + '.json');
  fs2.writeFileSync(p, JSON.stringify({ session: 'undocked-pop00287', startedAt: '2026-10-10T01:30:04Z', endedAt: '2026-10-10T01:40:04Z', stall: { idleTurns: 8, toolCalls: 2, limit: 8 } }));
  const ep = A.loadEpisode(p); fs2.unlinkSync(p);
  return ep.stall && ep.stall.idleTurns === 8;
})());
check('a pilot-stopped runner (stopReason, 10-30 on) still carries the stop verdict', (function () {
  const fs2 = require('fs'), os2 = require('os'), p = require('path').join(os2.tmpdir(), 'ep-stop-' + process.pid + '.json');
  fs2.writeFileSync(p, JSON.stringify({ session: 'undocked-pop00287', startedAt: '2026-10-30T01:30:04Z', endedAt: '2026-10-30T01:42:04Z', stopReason: 'pilot-stopped', toolCalls: 3 }));
  const ep = A.loadEpisode(p); fs2.unlinkSync(p);
  const w = JSON.stringify({ session: 'undocked-pop00287', startedAt: '2026-10-30T01:30:04Z', endedAt: '2026-10-30T01:50:04Z', stopReason: 'window', toolCalls: 30 });
  const p2 = p + '.w'; fs2.writeFileSync(p2, w); const ep2 = A.loadEpisode(p2); fs2.unlinkSync(p2);
  return ep.stall && ep.stall.stopReason === 'pilot-stopped' && ep.stall.toolCalls === 3 && ep2.stall === null;
})());
const scored = A.deriveCredits(mined.concat([fuel]));
check('fuel sale on a mining night -> 14', scored.value === 14 && scored.hits === 1);
check('entriesOf flattens the staged category map with category restored',
  A.entriesOf({ facts: { entries: { value: { mining: [{ event_type: 'mining.ore_mined' }], trading: [{ event_type: 'trading.fuel_sold', data: { credits: 1 } }] } } } })
    .map(e => e.category + ':' + e.event_type).join(',') === 'mining:mining.ore_mined,trading:trading.fuel_sold');
// the archive re-score must be a pure read without --apply
const plan = A.planRescore();
check('planRescore: every approved change maps to a feed EpisodeId and a cycle (the tab key)',
  Array.isArray(plan.changes) && plan.changes.every(c => c.file && (c.applied !== 'yes' || (c.episodeId && c.cycle != null))));
check('planRescore never turns a real payout into a blank (a 0 may revert to unknown when no gameplay was recorded)',
  plan.changes.every(c => !(c.before != null && Number(c.before) !== 0 && c.after == null)));

// research.31 (builder ruling C, 2026-10-30) — points from the pilot's
// account, attributed to the latest night that started at or before the
// unlock. Synthetic accounts and nights only; the shapes are the live
// get_achievements / staged-archive shapes read 2026-10-30.
const acct = { total: 20, earned: [
  { id: 'first_steps', name: 'First Steps', points: 5, at: '2026-10-13T01:34:00Z' },
  { id: 'maiden_jump', name: 'Maiden Jump', points: 5, at: '2026-10-16T01:41:00Z' },
  // jump logged 01:40:04, window closed 01:40:14, arrival unlock 01:43:10
  { id: 'wanderer', name: 'Wanderer', points: 10, at: '2026-10-19T01:43:10Z' },
] };
const play = [{ category: 'navigation', event_type: 'navigation.jumped', data: {} }];
const p1 = A.derivePoints(acct, '2026-10-19T01:30:04Z', null, play);
check('an arrival unlock after the window still belongs to the night (Wanderer 10)', p1.value === 10 && p1.earned[0].name === 'Wanderer');
const p2 = A.derivePoints(acct, '2026-10-16T01:30:04Z', '2026-10-19T01:30:04Z', play);
check('`until` stops at the next night: 10-16 keeps Maiden Jump only', p2.value === 5 && p2.earned.length === 1);
check('no unlock in a read window -> measured zero (the account is the game\'s own record)',
  A.derivePoints(acct, '2026-10-20T00:00:00Z', null).value === 0);
check('account not read -> unknown', A.derivePoints(null, '2026-10-19T01:30:04Z', null).value === null);
check('night window unreadable -> unknown, never zero', A.derivePoints(acct, 'not-a-time', null).value === null);

// codex research.31 F2: an account the game's own total does not reconcile with
// is unusable — its nights stay unknown and the back-score leaves them alone.
const ach = (id, pts, at) => ({ id: id, name: id, points: pts, earned: true, earned_at: at });
const good = A.accountFrom({ summary: { points: 10 }, achievements: [
  ach('first_steps', 5, '2026-10-13T01:34:00Z'), ach('maiden_jump', 5, '2026-10-16T01:41:00Z'),
  { id: 'locked', points: 50, earned: false, earned_at: null }] });
check('accountFrom: a reconciled record is usable', good.invalid === null && good.earned.length === 2 && good.total === 10);
const badAt = A.accountFrom({ summary: { points: 5 }, achievements: [ach('first_steps', 5, null)] });
check('accountFrom: an earned unlock with no earned_at is unusable', !!badAt.invalid);
check('...and its nights are unknown, not zero', A.derivePoints(badAt, '2026-10-13T01:30:00Z', null).value === null);
check('accountFrom: an earned unlock with no points is unusable',
  !!A.accountFrom({ summary: { points: 0 }, achievements: [ach('x', undefined, '2026-10-13T01:34:00Z')] }).invalid);
check('accountFrom: unlocks that miss the summary total are unusable',
  /add to 5, summary says 10/.test((A.accountFrom({ summary: { points: 10 }, achievements: [ach('x', 5, '2026-10-13T01:34:00Z')] }).invalid || []).join()));
check('accountFrom: no summary total is unusable', !!A.accountFrom({ achievements: [] }).invalid);
check('accountFrom: a blank summary total is unusable, not 0 (re-review F2)',
  !!A.accountFrom({ summary: { points: '' }, achievements: [] }).invalid && !!A.accountFrom({ summary: { points: null }, achievements: [] }).invalid);

const night = (start, value) => ({ file: 'TEST-ONLY-' + start + '.json', stagedPath: '/dev/null', staged: {
  session: 'undocked-pop99991', popid: 'POP-99991', holder: 'TEST-ONLY Pilot',
  window: { startedAt: start, endedAt: start },
  facts: { entries: { value: { navigation: play } }, points_delta: value === undefined ? undefined : { value: value } },
} });
const pp = A.planPointsRescore({ 'undocked-pop99991': acct },
  [night('2026-10-19T01:30:04Z', 10), night('2026-10-13T01:30:05Z'), night('2026-10-16T01:30:04Z', 0)]);
const byStart = Object.fromEntries(pp.nights.map(n => [n.file, n]));
check('rescore: every unlock placed, sums to the game total',
  pp.unplaced.length === 0 && pp.nights.reduce((s, n) => s + (n.fact.value || 0), 0) === acct.total);
check('rescore: an unchanged night is not rewritten', byStart['TEST-ONLY-2026-10-19T01:30:04Z.json'].changed === false);
check('rescore: a night never scored is written', byStart['TEST-ONLY-2026-10-13T01:30:05Z.json'].changed === true);
check('rescore: a wrong old value is corrected', byStart['TEST-ONLY-2026-10-16T01:30:04Z.json'].changed === true
  && byStart['TEST-ONLY-2026-10-16T01:30:04Z.json'].fact.value === 5);
const early = A.planPointsRescore({ 'undocked-pop99991': { total: 5, earned: [{ id: 'x', name: 'Early', points: 5, at: '2026-01-01T00:00:00Z' }] } },
  [night('2026-10-13T01:30:05Z')]);
check('rescore: an unlock before the first night is reported, never placed', early.unplaced.length === 1 && early.nights[0].fact.value === 0);
// re-review F5: a night's points window closes 15 min after its flight ends —
// an unlock the account earned outside every flight is reported, never placed.
const late = A.planPointsRescore({ 'undocked-pop99991': { total: 15, invalid: null, earned: [
  { id: 'a', name: 'In Flight', points: 5, at: '2026-10-13T01:38:00Z' },
  { id: 'b', name: 'Arrival', points: 5, at: '2026-10-13T01:52:00Z' },
  { id: 'c', name: 'Off Show', points: 5, at: '2026-10-14T12:00:00Z' }] } },
  [{ file: 'TEST-ONLY-late.json', stagedPath: '/dev/null', staged: { session: 'undocked-pop99991', popid: 'POP-99991',
    window: { startedAt: '2026-10-13T01:30:00Z', endedAt: '2026-10-13T01:40:00Z' }, facts: {} } }]);
check('an arrival unlock inside the grace counts; one earned off the show is unplaced',
  late.nights[0].fact.value === 10 && late.unplaced.length === 1 && late.unplaced[0].name === 'Off Show');
const skip = A.planPointsRescore({ 'undocked-pop99991': badAt }, [night('2026-10-13T01:30:05Z', 5)]);
check('rescore: an unusable account is skipped, its nights untouched', skip.nights.length === 0 && skip.skipped.length === 1);
check('rescore: a sheet-string value equal to the derived one is not rewritten',
  A.planPointsRescore({ 'undocked-pop99991': acct }, [night('2026-10-13T01:30:05Z', '5')]).nights[0].changed === false);
check('rescore: a night lists which copies are stale', byStart['TEST-ONLY-2026-10-13T01:30:05Z.json'].stale.join() === 'archive');

const sys = A.deriveSystems([
  { created_at: '2026-10-16T01:35:00Z', category: 'trading', data: { base_id: 'x' } },
  { created_at: '2026-10-16T01:39:33Z', category: 'navigation', data: { from_system: 'sol', to_system: 'sirius', to_system_name: 'Sirius' } },
]);
check('a jump records both ends, departure first (Taveras 10-16: sol, sirius)', sys.value.join(',') === 'sol,sirius');
check('an unlock is never a mishap', A.deriveMishaps([{ category: 'achievement', event_type: 'achievement.unlocked',
  summary: 'Unlocked achievement: Yo Ho Ho and a Hold Full of Hulls' }]).value.length === 0);

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('undockedEpisodeAdapter: ok');
