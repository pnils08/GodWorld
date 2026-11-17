'use strict';
// pipeline.110 Task 10 — the worker template (scripts/workerWake.js). Synthetic fixtures only; no sheet, page or model is called.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ww = require('./workerWake');

const CRIME = [
  { Neighborhood: 'Alpha', ResponseTimeAvg: '11.7', ClearanceRate: '0.25', IncidentCount: '6', LastUpdated: '115', Trend: 'steady', Hotspot: '', PressureRatio: '1.12' },
  { Neighborhood: 'Beta', ResponseTimeAvg: '11.8', ClearanceRate: '0.18', IncidentCount: '6', LastUpdated: '115', Trend: 'steady', Hotspot: '', PressureRatio: '0.97' },
  { Neighborhood: 'Gamma', ResponseTimeAvg: '10.7', ClearanceRate: '0.18', IncidentCount: '8', LastUpdated: '115', Trend: 'falling', Hotspot: '', PressureRatio: '1.12' },
];
const PREV = CRIME.map((r) => ({ ...r, LastUpdated: '114', IncidentCount: '5' }));
const census = (cycle, scope, hood, arrests, open, close, exits) => ({ Cycle: String(cycle), System: 'judicial', GeographicScope: scope, Neighborhood: hood, IntakeType: 'arrest',
  TotalIntakes: String(arrests), OpeningOccupancy: String(open), ClosingOccupancy: String(close), Exits: String(exits) });
const SHEETS = {
  Crime_Metrics: CRIME,
  Care_Justice_Census: [census(114, 'city', '', 43, 56, 72, 27), census(115, 'city', '', 24, 72, 67, 29), census(114, 'neighborhood', 'Alpha', 3, 2, 4, 1), census(115, 'neighborhood', 'Alpha', 1, 4, 4, 1),
    { ...census(115, 'city', '', 34, 0, 69, 0), System: 'hospital' }, { ...census(115, 'city', '', 24, 72, 67, 29), IntakeType: 'all' }],
  Chaos_Cars: [{ CycleId: '114', VehicleType: 'cop_car', TargetScope: 'neighborhood', TargetId: 'Alpha', DiceOutcome: 'ticket', PrimaryMetric: 'CrimeIndex', MetricMagnitude: '-0.1' },
    { CycleId: '114', VehicleType: 'cop_car', TargetScope: 'citizen', TargetId: 'POP-00518', DiceOutcome: 'helped_by_police', PrimaryMetric: 'Recovering', MetricMagnitude: '0' },
    { CycleId: '115', VehicleType: 'mail_truck', TargetScope: 'business', TargetId: 'BIZ-1', DiceOutcome: 'x', PrimaryMetric: 'Growth_Rate', MetricMagnitude: '1' }],
  City_Treasury: [{ Cycle: '115', Entry: 'REVENUE', Amount: '107362', Counterparty: 'COURT', Note: '24 cleared charges' }, { Cycle: '115', Entry: 'REVENUE', Amount: '5000000', Counterparty: 'WEEKLY-ALLOCATION', Note: 'x' }],
};
const OFFICE_MAP = { offices: [{ officeId: 'CHIEF-POLICE', popid: 'POP-00136', holder: 'Rafael Montez', title: 'Police Chief', agentDir: 'civic-office-police-chief', model: 'm' },
  { officeId: 'COUNCIL-D1', popid: 'POP-00001', holder: 'A Seat', title: 'City Council District 1', agentDir: 'civic-office-council-d1' }] };
const doc = (cycle, type, content) => ({ content, createdAt: '2026-11-13T00:00:00Z', metadata: { cycle, type } });

function workspace(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-wake-'));
  const clean = () => fs.rmSync(root, { recursive: true, force: true });
  let out;
  try {
    fs.mkdirSync(path.join(root, 'output', 'cron-civic', 'moves'), { recursive: true });
    fs.mkdirSync(path.join(root, 'output', 'mara-directives'), { recursive: true });
    out = fn(root);
  } catch (e) { clean(); throw e; }
  if (out && typeof out.then === 'function') return out.finally(clean);   // an async test keeps its folder until it settles
  clean();
  return out;
}
function writeMoves(root, cycle, rows) { fs.writeFileSync(path.join(root, 'output', 'cron-civic', 'moves', 'moves_c' + cycle + '.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n'); }
function deps(root, over) {
  return Object.assign({
    root,
    sheets: { getSheetAsObjects: async (tab) => SHEETS[tab] || [], getRawSheetData: async (tab) => { const r = SHEETS[tab] || []; return r.length ? [Object.keys(r[0])].concat(r.map((x) => Object.values(x))) : [[]]; } },
    page: {
      searchPage_: async () => ({ results: [doc(102, 'office-position', 'datawake: Six additional patrol units redeployed.'), doc(102, 'tension', 'TENSION[c102]: why?'), doc(115, 'reflection', 'That clearance rate still sticks with me.')] }),
      recentPage_: async () => ({ results: [doc(115, 'tension', 'TENSION[c115]: how?'), doc(115, 'reflection', 'That clearance rate still sticks with me.'), doc(115, 'office-position', 'datawake: nothing to state'), doc(114, 'reflection', 'Look, I do not hide from the numbers.'), doc(112, 'reflection', 'an older one')] }),
    },
    wp: { buildPool: async () => [{ popId: 'POP-00136', first: 'Rafael', last: 'Montez', cur: {} }, { popId: 'POP-00518', first: 'Chase', last: 'West', cur: {} }],
      loadOfficeHolders: async () => ({ byPop: { 'POP-00136': { title: 'Police Chief' } } }), identityLine: (c) => 'You are ' + c.first + ' ' + c.last + '. You hold the office of ' + c.office.title + '.' },
    dials: { disposition: () => 'steady' },
    readPrev: () => PREV,
  }, over || {});
}

test('highLow names every neighborhood that ties and skips a column that is not numbers', () => {
  const hl = ww.highLow(CRIME, ['ResponseTimeAvg', 'ClearanceRate', 'Trend', 'PressureRatio'], 'Neighborhood');
  assert.deepEqual(hl.map((r) => r.Column), ['ResponseTimeAvg', 'ClearanceRate', 'PressureRatio']);
  assert.equal(hl[0].Highest, '11.8 — Beta');
  assert.equal(hl[0].Lowest, '10.7 — Gamma');
  assert.equal(hl[1].Lowest, '0.18 — Beta, Gamma');
  assert.equal(hl[2].Highest, '1.12 — Alpha, Gamma');
});

test('patrolInForce: a setting filed in a week stands from the next Cycle; the latest of a week wins; none is the default', () => {
  const moves = [{ type: 'patrol', cycle: 115, at: '2026-11-10T00:00:00Z', payload: { strategy: 'suppress_hotspots' } }, { type: 'patrol', cycle: 115, at: '2026-11-12T00:00:00Z', payload: { strategy: 'community_presence' } },
    { type: 'work', cycle: 114, payload: {} }];
  assert.equal(ww.patrolInForce(moves, 115), 'balanced (default)');
  assert.equal(ww.patrolInForce(moves, 116), 'community_presence');
  assert.equal(ww.patrolInForce([], 116), 'balanced (default)');
});

test('askAndWhy keeps her ask and her reason and drops the folder path and form fields', () => {
  const block = '## Rafael Montez — Police Chief\n\n- **Agent:** `.claude/agents/civic-office-police-chief/`\n- **Address:** Transmit the plan.\n- **Why:** Metrics are strained.\n- **Acceptance:** A memo.\n- **Silence consequence:** Confusion.';
  assert.equal(ww.askAndWhy(block), 'Transmit the plan. Metrics are strained.');
});

test('pastDecisions finds one person by POPID under any key, joins an answer to its question, and drops rejected moves', () => workspace((root) => {
  fs.writeFileSync(path.join(root, 'output', 'mara-directives', 'mara_directive_c105_AUTO.txt'),
    '# C105\n\n---\n## Rafael Montez — Police Chief\n\n- **Agent:** `.claude/agents/civic-office-police-chief/`\n- **Address:** Transmit the plan.\n- **Why:** Metrics are strained.\n- **Acceptance:** A memo.\n');
  writeMoves(root, 110, [{ moveId: 'MV-110-a', cycle: 110, popid: 'POP-00136', agentDir: 'civic-office-police-chief', type: 'answer', status: 'pending', payload: { confrontationId: 'CONF-105-x', text: 'Done.', directiveCycle: 105, confrontationSeat: 'civic-office-police-chief' } },
    { moveId: 'MV-110-b', cycle: 110, popid: 'POP-00999', agentDir: 'other', type: 'work', status: 'pending', payload: { initiativeId: 'INIT-001' } }]);
  writeMoves(root, 115, [{ moveId: 'MV-115-a', cycle: 115, popid: 'pop-00136', agentDir: 'STAFF-X', type: 'patrol', status: 'pending', payload: { strategy: 'balanced', note: 'flat' } },
    { moveId: 'MV-115-a', cycle: 115, popid: 'POP-00136', type: 'patrol', status: 'applied', payload: { strategy: 'balanced' } },
    { moveId: 'MV-115-a:rej0', cycle: 115, popid: 'POP-00136', type: 'propose', status: 'rejected', payload: { title: 'x' } }]);
  const d = ww.pastDecisions('POP-00136', 'civic-office-police-chief', { root });
  assert.equal(d.length, 2);
  assert.deepEqual([d[0].cycle, d[0].type, d[0].said], [110, 'answer', 'Done.']);
  assert.equal(d[0].question, 'Transmit the plan. Metrics are strained.');
  assert.match(d[0].askedBy, /Mara Vance, City Planning Director \(Cycle 105\)/);
  assert.deepEqual([d[1].cycle, d[1].type, d[1].said], [115, 'patrol', 'strategy: balanced; note: flat']);
}));

test('gatherMemory: his newest own words first, searched entries after, statements labelled, open-question lines out, the Cycle and never a date', async () => {
  const m = await ww.gatherMemory('POP-00136', 'crime', deps('/nowhere'));
  assert.deepEqual(m.entries.map((e) => e.text), ['That clearance rate still sticks with me.', 'Look, I do not hide from the numbers.', 'Your public statement: Six additional patrol units redeployed.']);
  assert.deepEqual(m.entries.map((e) => e.when), ['Cycle 115', 'Cycle 114', 'Cycle 102']);
  assert.equal(m.newest, 2);
  assert.ok(!JSON.stringify(m).includes('2026-'));
});

test('gatherMemory: a failed read is no memory this wake, not an error', async () => {
  const m = await ww.gatherMemory('POP-00136', 'crime', deps('/nowhere', { page: { searchPage_: async () => { throw new Error('store down'); }, recentPage_: async () => { throw new Error('store down'); } } }));
  assert.deepEqual(m.entries, []);
});

test('buildWake, the chief on his own wake: who he is and his memory, then his data and his decisions — and no line telling him what to do', async () => workspace(async (root) => {
  writeMoves(root, 114, [{ moveId: 'MV-114-a', cycle: 114, popid: 'POP-00136', type: 'patrol', status: 'pending', at: '2026-11-05T00:00:00Z', payload: { strategy: 'suppress_hotspots', note: 'x' } }]);
  const w = await ww.buildWake({ officeId: 'CHIEF-POLICE', cycle: 115, officeMap: OFFICE_MAP, deps: deps(root) });
  assert.match(w.system, /^You are Rafael Montez\. You hold the office of Police Chief\. Your temperament: steady\.\n\nFrom your own memory:\n- \(Cycle 115\)/);
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(w.system), 'no calendar date in the system turn');
  assert.ok(!w.user.includes('.claude/agents'), 'no folder path in the user turn');
  assert.ok(w.user.startsWith('Crime by neighborhood, Cycle 115:\nNeighborhood | ResponseTimeAvg | ClearanceRate | IncidentCount | LastUpdated | Trend | Hotspot | PressureRatio\n'), 'the sheet as it stands, the blank column included');
  // a title names its data and nothing else: no note on what the data lacks, means or shows
  assert.ok(!/keeps this Cycle only|No reading|recorded under it|none this Cycle/.test(w.user));
  assert.match(w.user, /\n\nCitywide by Cycle:\nCycle \| Patrol strategy in force \|/);
  assert.match(w.user, /ResponseTimeAvg \| 11\.8 — Beta \| 10\.7 — Gamma/);
  // the loop: the setting in force beside what was recorded under it; last Cycle's sheet joins when the previous dump is that Cycle
  assert.match(w.user, /114 \| balanced \(default\) \| 43 \| 56 \| 72 \| 27 \| 15 \| 11\.4 \| 0\.203/);
  assert.match(w.user, /115 \| suppress_hotspots \| 24 \| 72 \| 67 \| 29 \| 20 \| 11\.4 \| 0\.203/);
  assert.match(w.user, /114 \| citizen Chase West \| helped_by_police/);
  assert.ok(!w.user.includes('mail_truck') && !w.user.includes('WEEKLY-ALLOCATION'), 'only his trade');
  assert.match(w.user, /- Cycle 114, patrol: strategy: suppress_hotspots; note: x/);
  // the harness gives no work: with no question, his own record is the last thing he reads
  assert.ok(w.user.endsWith('- Cycle 114, patrol: strategy: suppress_hotspots; note: x'));
  assert.ok(!/speaking on the record|asks you|It is (the close of )?Cycle/.test(w.user));
  // the memory search names nothing picked out of his data
  assert.equal(w.memory.key, 'crime clearance response time arrests custody patrol');
  // a question never arrives without who asks it
  await assert.rejects(() => ww.buildWake({ officeId: 'CHIEF-POLICE', cycle: 115, officeMap: OFFICE_MAP, deps: deps(root), question: 'Why?' }), /missing askerLine/);
}));

test('buildWake, asked: the question is the task and the memory search runs on it', async () => workspace(async (root) => {
  let searched = null;
  const d = deps(root); const real = d.page.searchPage_; d.page.searchPage_ = async (pop, key) => { searched = key; return real(); };
  const w = await ww.buildWake({ officeId: 'CHIEF-POLICE', cycle: 115, officeMap: OFFICE_MAP, deps: d, question: 'What is the response time in Alpha?', askerLine: 'A Seat, City Council District 1 (Alpha),' });
  assert.equal(searched, 'What is the response time in Alpha?');
  assert.ok(w.user.endsWith('A Seat, City Council District 1 (Alpha), asks you:\n\nWhat is the response time in Alpha?'));
  assert.match(w.user, /What you have decided and said on the record:\n- nothing on record/);
}));

test('buildWake: last Cycle joins only when the previous dump is that Cycle; an empty crime sheet fails the wake; a seat has no fill', async () => workspace(async (root) => {
  const stale = await ww.buildWake({ officeId: 'CHIEF-POLICE', cycle: 115, officeMap: OFFICE_MAP, deps: deps(root, { readPrev: () => PREV.map((r) => ({ ...r, LastUpdated: '112' })) }) });
  assert.match(stale.user, /114 \| balanced \(default\) \| 43 \| 56 \| 72 \| 27 \|  \|  \| /);
  const empty = deps(root); empty.sheets = { getSheetAsObjects: async () => [], getRawSheetData: async () => [[]] };
  await assert.rejects(() => ww.buildWake({ officeId: 'CHIEF-POLICE', cycle: 115, officeMap: OFFICE_MAP, deps: empty }), /Crime_Metrics returned no rows/);
  await assert.rejects(() => ww.buildWake({ officeId: 'COUNCIL-D1', cycle: 115, officeMap: OFFICE_MAP, deps: deps(root) }), /no worker fill/);
  assert.equal(ww.hasFill('CHIEF-POLICE'), true);
  assert.equal(ww.hasFill('COUNCIL-D1'), false);
  assert.equal(ww.hasFill(undefined), false);
}));

test('tools: every worker gets the four; the chief also holds the patrol setting; a setting is staged, never executed', async () => {
  assert.deepEqual(ww.toolsFor('NOT-A-WORKER').map((t) => t.function.name), ['sheet_read', 'citizen_lookup', 'canon_recall', 'memory_recall']);
  const chief = ww.toolsFor('CHIEF-POLICE', { patrolStrategies: ['balanced', 'suppress_hotspots', 'community_presence'] });
  assert.equal(chief.length, 5);
  assert.deepEqual(chief[4].function.parameters.properties.strategy.enum, ['balanced', 'suppress_hotspots', 'community_presence']);
  const stage = { patrol: [] };
  const normalizePatrol = (v) => (['balanced', 'suppress_hotspots', 'community_presence'].includes(String(v)) ? String(v) : null);
  const exec = ww.toolExecutor({ popid: 'POP-00136', cycle: 115, stage, normalizePatrol, deps: deps('/nowhere'), dw: { toolCitizenLookup: (i) => 'profile of ' + i.name, toolCanonRecall: (i, c) => 'printed on ' + i.query + ' before C' + c } });
  assert.match(await exec('patrol_set', { strategy: 'flood_the_zone' }), /^not set/);
  assert.deepEqual(stage.patrol, []);
  assert.equal(await exec('patrol_set', { strategy: 'community_presence', note: ' my reason ' }), 'set: community_presence, from the next Cycle on');
  assert.deepEqual(stage.patrol, [{ strategy: 'community_presence', note: 'my reason' }]);
  assert.equal(await exec('citizen_lookup', { name: 'Chase West' }), 'profile of Chase West');
  assert.equal(await exec('canon_recall', { query: 'OPD' }), 'printed on OPD before C116');
  assert.match(await exec('sheet_read', { tab: 'Simulation_Ledger' }), /^no such sheet/);
  assert.match(await exec('sheet_read', { tab: 'Crime_Metrics', match: 'beta' }), /Neighborhood \| .*\nBeta \| 11\.8/);
  assert.match(await exec('sheet_read', { tab: 'Crime_Metrics', match: 'nowhere' }), /no row in Crime_Metrics names "nowhere" \(3 rows read\)/);
  assert.match(await exec('memory_recall', { query: 'clearance' }), /Your newest entries:\n- \(Cycle 115\)[\s\S]*On "clearance":/);
  assert.equal(await exec('nope', {}), 'unknown tool nope');
});

test('memory_recall says unavailable, never empty, when the page cannot be read', async () => {
  const out = await ww.memoryRecall('POP-00136', {}, deps('/nowhere', { page: { recentPage_: async () => ({ error: 'timeout' }), searchPage_: async () => ({ results: [] }) } }));
  assert.match(out, /unavailable right now — this is not an empty record/);
});

test('sheet_read: a sheet kept by Cycle reads newest first; from_cycle / to_cycle read earlier Cycles', async () => {
  const arcs = []; for (let c = 60; c <= 116; c++) arcs.push({ Cycle: String(c), ArcId: 'a' + c, Neighborhood: 'Downtown' });
  const d = deps('/nowhere', { sheets: { getSheetAsObjects: async () => arcs, getRawSheetData: async () => [Object.keys(arcs[0])].concat(arcs.map((x) => Object.values(x))) } });
  const newest = await ww.sheetRead({ tab: 'Event_Arc_Ledger' }, d);
  assert.match(newest, /^Cycle \| ArcId \| Neighborhood\n116 \| a116/);
  assert.match(newest, /\(40 newest of 57 rows — name earlier Cycles to read them\)$/);
  const old = await ww.sheetRead({ tab: 'Event_Arc_Ledger', from_cycle: 69, to_cycle: 71 }, d);
  assert.deepEqual(old.split('\n').slice(1).map((l) => l.split(' | ')[0]), ['71', '70', '69']);
  assert.match(await ww.sheetRead({ tab: 'Event_Arc_Ledger', from_cycle: 200 }, d), /^no row in Event_Arc_Ledger in Cycles 200–latest \(57 rows read\)/);
});

test('window: a by-Cycle record is handed for the Cycles named and its title says which; a one-Cycle tab is never cut; unset hands every Cycle', async () => workspace(async (root) => {
  const ev = (c, id) => ({ Cycle: String(c), Domain: 'WEATHER', Neighborhood: 'Downtown', Severity: 'low', EventDescription: id });
  const tabs = {
    WorldEvents_V3_Ledger: [ev(69, 'old'), ev(115, 'last'), ev(116, 'now')],
    World_Population: [{ cycle: '116', shockFlag: 'none', patternFlag: 'none', civicLoad: 'x', weatherType: 'mild', weatherImpact: '1' }],
    Chaos_Cars: [{ CycleId: '100', VehicleType: 'fire_engine', TargetScope: 'neighborhood', TargetId: 'KONO', DiceOutcome: 'false_alarm', PrimaryMetric: 'Sentiment', MetricMagnitude: '-0.05' },
      { CycleId: '108', VehicleType: 'fire_engine', TargetScope: 'neighborhood', TargetId: 'Uptown', DiceOutcome: 'false_alarm', PrimaryMetric: 'Sentiment', MetricMagnitude: '-0.07' }],
    Carry_Forward_Store: [{ Key: 'PREV_CYCLE_STATE_JSON', Cycle: '116', JSON: JSON.stringify({ crisisArcs: [{ arcId: 'CRISIS-114-DOWNTOWN', name: 'The Downtown Transit Snarl', type: 'crisis', phase: 'decline', tension: 2.45, neighborhood: 'Downtown', domainTag: 'INFRASTRUCTURE', cycleCreated: 114, phaseStartCycle: 115, citizens: [], summary: 'easing' }] }) },
      { Key: 'PREV_CYCLE_STATE_JSON', Cycle: '115', JSON: '{"crisisArcs":[]}' }],
    // the audit log says otherwise: it is not read for the arcs
    Event_Arc_Ledger: [{ Cycle: '114', ArcId: 'CRISIS-114-DOWNTOWN', Type: 'crisis', Phase: 'early', Tension: '5', Neighborhood: 'Downtown', Summary: 'fossil' }],
  };
  const d = deps(root); d.sheets = { getSheetAsObjects: async (tab) => tabs[tab] || [] };
  const fill = (w) => ww.FILLS['EMERG-DIR'].build(116, { deps: d, nameOf: () => '', window: w });
  const block = (b, re) => b.blocks.find((x) => re.test(x.title));
  const one = await fill(1), two = await fill(2), every = await fill();
  assert.equal(block(one, /^Weather and environment events/).title, 'Weather and environment events on the city\'s event ledger, Cycle 116');
  assert.ok(block(one, /^Weather and environment/).text.includes('| now') && !block(one, /^Weather and environment/).text.includes('| last'));
  assert.equal(block(two, /^Weather and environment events/).title, 'Weather and environment events on the city\'s event ledger, Cycles 115–116');
  assert.ok(block(every, /^Weather and environment/).text.includes('| old'));
  assert.equal(block(one, /^The city's shock/).title, 'The city\'s shock and pattern flags this Cycle', 'one Cycle on the tab: current state, not cut, title untouched');
  // the arcs are the engine's carried state at every window: the C114 arc is open, in decline
  for (const b of [one, two, every]) {
    const arcs = block(b, /^Crisis arcs/).text;
    assert.match(arcs, /The Downtown Transit Snarl \| Downtown \| crisis \| decline \| 2\.45 \| 114 \| 115/);
    assert.ok(!arcs.includes('fossil'));
  }
  const fire = await ww.FILLS['CHIEF-FIRE'].build(116, { deps: d, nameOf: () => '', window: 1 });
  assert.deepEqual(fire.blocks.map((b) => [b.title, b.text]), [['Fire engine events, Cycle 116', 'none']]);
}));

test('sheet_read: a blank tail is not rows; a Cycle bound that is not a number is no bound; a sheet not kept by Cycle says so', async () => {
  const raw = [['Office', 'Holder'], ['Mayor', 'Avery Santana'], ['', ''], ['', '']];
  const d = deps('/nowhere', { sheets: { getRawSheetData: async () => raw, getSheetAsObjects: async () => [] } });
  const out = await ww.sheetRead({ tab: 'Civic_Office_Ledger', from_cycle: 110 }, d);
  assert.match(out, /^Office \| Holder\nMayor \| Avery Santana\n\(Civic_Office_Ledger is not kept by Cycle/);
  const arcs = []; for (let c = 100; c <= 116; c++) arcs.push([String(c), 'a' + c]);
  const d2 = deps('/nowhere', { sheets: { getRawSheetData: async () => [['Cycle', 'ArcId']].concat(arcs), getSheetAsObjects: async () => [] } });
  assert.match(await ww.sheetRead({ tab: 'Event_Arc_Ledger', from_cycle: '', to_cycle: 'latest' }, d2), /^Cycle \| ArcId\n116 \| a116/);
});

test('a worker reply that ends mid-lookup is not a statement', () => {
  const { workerReplyVerdict } = require('./cron-civic-run');
  assert.equal(workerReplyVerdict({ text: 'Let me check transit metrics and the current cycle\'s ledger for the snarl itself.', finishReason: 'tool_calls' }), 'reply ended mid-lookup');
  assert.equal(workerReplyVerdict({ text: '', finishReason: 'tool-turns-exhausted' }), 'reply ended mid-lookup');
  assert.equal(workerReplyVerdict({ text: 'half', finishReason: 'length' }), 'reply cut off');
  assert.equal(workerReplyVerdict({ text: '  ', finishReason: 'stop' }), 'empty reply');
  assert.equal(workerReplyVerdict({ text: 'The snarl cleared by Thursday.', finishReason: 'stop' }), 'statement');
});

test('the tool loop, for a worker: a read asked for after the reads are spent is answered, and the reply after it comes back', async () => {
  const https = require('https');
  const real = https.request;
  const { EventEmitter } = require('events');
  const sent = [];
  let n = 0;
  const reply = (body) => JSON.stringify({ choices: [{ message: body.message, finish_reason: body.finish }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
  const call = (i) => ({ message: { role: 'assistant', content: 'Let me check.', tool_calls: [{ id: 't' + i, type: 'function', function: { name: 'sheet_read', arguments: '{"tab":"Cycle_Weather"}' } }] }, finish: 'tool_calls' });
  https.request = (opts, cb) => {
    const req = new EventEmitter();
    req.setTimeout = () => {}; req.destroy = () => {};
    req.write = (p) => sent.push(JSON.parse(p));
    req.end = () => {
      const i = n++;
      const body = i < 7 ? call(i) : { message: { role: 'assistant', content: 'The snarl is easing.' }, finish: 'stop' };
      const res = new EventEmitter(); res.statusCode = 200; res.setEncoding = () => {};
      cb(res); res.emit('data', reply(body)); res.emit('end');
    };
    return req;
  };
  try {
    delete require.cache[require.resolve('./cron-desk-writer')];
    const dw = require('./cron-desk-writer');
    const r = await dw.openRouterToolLoop({ model: 'm', system: 's', user: 'u', toolset: [], exec: async () => 'rows', maxToolCalls: 6, answerLateToolCalls: 'No more reads this wake.' });
    assert.equal(r.text, 'The snarl is easing.');
    assert.equal(r.finishReason, 'stop');
    assert.equal(r.trace.length, 6);
    assert.ok(!('tools' in sent[6]) && !('tools' in sent[7]), 'no tools offered once the reads are spent');
    assert.equal(sent[7].messages[sent[7].messages.length - 1].content, 'No more reads this wake.');
  } finally { https.request = real; delete require.cache[require.resolve('./cron-desk-writer')]; }
});

// builder 2026-11-16: "puppeting means putting words in their mouth and telling them what to say, it doesnt mean telling them
// what to do … they by definition need a task" — a lean worker is told its job and its task; it is never handed words.
test('a lean worker (the fire chief): sheet line then job; this Cycle of his record; the weekly report last; the whole record and the neighborhood a read away', async () => workspace(async (root) => {
  const om = { offices: [{ officeId: 'CHIEF-FIRE', popid: 'POP-00140', holder: 'Marcus Hollowell', title: 'Fire Chief', agentDir: 'worker-chief-fire' }] };
  const tabs = {
    Chaos_Cars: [{ CycleId: '100', VehicleType: 'fire_engine', TargetScope: 'neighborhood', TargetId: 'KONO', DiceOutcome: 'false_alarm', PrimaryMetric: 'Sentiment', MetricMagnitude: '-0.05', ChaosNarrativeSeed: 'old' },
      { CycleId: '116', VehicleType: 'fire_engine', TargetScope: 'neighborhood', TargetId: 'KONO', DiceOutcome: 'major_blaze_contained', PrimaryMetric: 'Sentiment', MetricMagnitude: '-0.06', ChaosNarrativeSeed: 'Smoke over the rooftops.' }],
    Neighborhood_Map: [{ Neighborhood: 'KONO', Cycle: '116', Sentiment: '0.4' }, { Neighborhood: 'Uptown', Cycle: '116', Sentiment: '0.5' }],
    Neighborhood_Demographics: [{ Neighborhood: 'KONO', Adults: '20', Seniors: '3' }],
    Business_Ledger: [{ BIZ_ID: 'BIZ-1', Name: 'Kono Press', Sector: 'Print', Neighborhood: 'KONO', Employee_Count: '9' }, { BIZ_ID: 'BIZ-2', Name: 'Elsewhere', Neighborhood: 'Uptown' }],
  };
  let reads = 0;
  const d = deps(root, { ledgerRows: [{ POPID: 'POP-1', Name: 'Ada Kono', RoleType: 'Baker', BirthYear: '1990', Neighborhood: 'KONO', Status: 'Active' }, { POPID: 'POP-2', Name: 'Gone', Neighborhood: 'KONO', Status: 'Deceased' }] });
  d.sheets = { getSheetAsObjects: async (tab) => { reads++; return tabs[tab] || []; } };
  d.wp = { ...d.wp, buildPool: async () => [{ popId: 'POP-00140', first: 'Marcus', last: 'Hollowell', cur: {} }], loadOfficeHolders: async () => ({ byPop: { 'POP-00140': { title: 'Fire Chief' } } }) };
  const w = await ww.buildWake({ officeId: 'CHIEF-FIRE', cycle: 116, officeMap: om, deps: d });
  assert.equal(w.lean, true);
  assert.match(w.system, /^You are Marcus Hollowell\. You hold the office of Fire Chief\. Your temperament: steady\.\n\nYou run the city's fire service\. Your job is to answer for its record/);
  assert.match(w.user, /^Fire engine events, Cycle 116:\nCycle \| Vehicle \| Where \| Outcome \| Moved \| What the block saw\n116 \| fire_engine \| neighborhood KONO \| major_blaze_contained \| Sentiment -0\.06 \| Smoke over the rooftops\./);
  assert.ok(!w.user.includes('| old'), 'the lean pack is this Cycle');
  assert.ok(w.user.endsWith('Cycle 116, your weekly report: speak on the record on what you see in your records this Cycle. Your reply goes on the record as your report, exactly as you give it.'));
  assert.equal(reads, 1, 'the lean pack and the whole record share one read of the tab');
  assert.deepEqual(Object.keys(w.records), ['Fire engine events, every Cycle on the sheet']);
  const tools = ww.toolsFor('CHIEF-FIRE', { records: w.records });
  assert.deepEqual(tools.map((t) => t.function.name), ['sheet_read', 'citizen_lookup', 'canon_recall', 'memory_recall', 'record_read', 'neighborhood_read']);
  const exec = ww.toolExecutor({ popid: 'POP-00140', cycle: 116, stage: { patrol: [] }, records: w.records, deps: d });
  const whole = await exec('record_read', { record: 'Fire engine events, every Cycle on the sheet' });
  assert.ok(whole.includes('| old') && whole.includes('Smoke over the rooftops.'), 'the whole record, untouched');
  assert.match(await exec('record_read', { record: 'nope' }), /^no record "nope"\. Your records: Fire engine events/);
  const kono = await exec('neighborhood_read', { neighborhood: 'kono' });
  assert.match(kono, /On the neighborhood map:\nNeighborhood: KONO/);
  assert.match(kono, /Businesses in it \(1\):\nBIZ_ID \| Name \| Sector \| Employee_Count\nBIZ-1 \| Kono Press/);
  assert.match(kono, /Residents on the city's ledger who live there \(1\):\nName \| Role \| Born\nAda Kono \| Baker \| 1990/);
  assert.match(await exec('neighborhood_read', { neighborhood: 'Atlantis' }), /^no neighborhood "Atlantis" on the map\. The neighborhoods: KONO, Uptown/);
  // asked: the question replaces the weekly report
  const asked = await ww.buildWake({ officeId: 'CHIEF-FIRE', cycle: 116, officeMap: om, deps: d, question: 'What happened in KONO?', askerLine: 'Avery Santana, Mayor,' });
  assert.ok(asked.user.endsWith('Avery Santana, Mayor, asks you:\n\nWhat happened in KONO?\n\nYour reply goes on the record as your answer, exactly as you give it.') && !asked.user.includes('weekly report'));
  // a worker with no job written wakes as before: no job line, no task, no lean reads
  assert.equal(ww.isLean('EMS-DIR'), false);
  assert.deepEqual(ww.toolsFor('EMS-DIR', { records: { a: 'b' } }).map((t) => t.function.name), ['sheet_read', 'citizen_lookup', 'canon_recall', 'memory_recall']);
}));

// builder 2026-11-16 on the medical examiner: the death facts and the death line; the archive's exit note left out; the
// hospital ledger and the cause queue as the sheet holds them
test('the medical examiner: each death with its own death line and no exit note; his other two records as the sheet holds them; lean', async () => workspace(async (root) => {
  const tabs = {
    Citizen_Archive: [
      { POPID: 'POP-00622', First: 'Marisela', Last: 'Rios', BirthYear: '1998', Neighborhood: 'Fruitvale', RoleType: 'Home Health Aide', Status: 'deceased', ArchiveReason: 'deceased', ExitCycle: '107', HealthCause: '',
        LifeHistory: 'Y2C49 — [Neighborhood] enjoyed the Fruitvale community vibe\nC107 — [Death] died after a sudden illness', ArchiveNote: 'defects-at-exit: schoolQualityUnusable,migrationIntentSet' },
      { POPID: 'POP-00331', First: 'Isabelle', Last: 'Louis', BirthYear: '1976', Neighborhood: 'Uptown', RoleType: 'Spoken Word Poet', Status: 'deceased', ArchiveReason: 'deceased', ExitCycle: '106', HealthCause: '', LifeHistory: 'Y2C48 — [Lifestyle] checked out a new shop', ArchiveNote: 'defects-at-exit: schoolQualityUnusable' },
      { POPID: 'POP-00900', First: 'Traded', Last: 'Away', Status: 'Traded', ArchiveReason: 'traded-away', ExitCycle: '110', LifeHistory: '' }],
    Hospital_Ledger: [{ AdmissionId: 'H-C105-POP-00194', POPID: 'POP-00194', Name: 'Yu Zen', StatusNow: 'active', DischargeCycle: '109', Outcome: 'recovered' }],
    Health_Cause_Queue: [{ POPID: 'POP-00036', Name: 'Marcus Osei', Status: 'recovering', StatusStartCycle: '0', AssignedCause: 'car accident' }],
  };
  const d = deps(root); d.sheets = { getSheetAsObjects: async (tab) => tabs[tab] || [] };
  const b = await ww.FILLS['MED-EXAM'].build(116, { deps: d, nameOf: () => '', window: 1 });
  const deaths = b.blocks.find((x) => x.title === 'Residents on the archive as deceased').text;
  assert.equal(deaths, 'POPID | Name | Born | Neighborhood | Role | Status | Reason | Left the ledger | Cause on file | Their record\n' +
    'POP-00622 | Marisela Rios | 1998 | Fruitvale | Home Health Aide | deceased | deceased | 107 |  | C107 — died after a sudden illness\n' +
    'POP-00331 | Isabelle Louis | 1976 | Uptown | Spoken Word Poet | deceased | deceased | 106 |  | ');
  assert.ok(!deaths.includes('defects-at-exit') && !deaths.includes('Traded'));
  assert.match(b.blocks.find((x) => /hospital ledger/.test(x.title)).text, /H-C105-POP-00194 \| POP-00194 \| Yu Zen \| active \| 109 \| recovered/);
  assert.match(b.blocks.find((x) => /waiting on a cause/.test(x.title)).text, /POP-00036 \| Marcus Osei \| recovering \| 0 \| car accident/);
  assert.equal(ww.isLean('MED-EXAM'), true);
  assert.match(ww.JOBS['MED-EXAM'], /^You are the city's medical examiner\. Your job is to answer for the city's deaths and their causes/);
}));

// builder 2026-11-16, on a quiet week: report against the last report
test('a lean worker reports against its last finished report; a record that ended mid-lookup or predates the template is not one', async () => workspace(async (root) => {
  const dir = path.join(root, 'output', 'cron-civic', 'datawake');
  fs.mkdirSync(dir, { recursive: true });
  const put = (date, rec) => fs.writeFileSync(path.join(dir, 'worker-chief-fire_' + date + '.json'), JSON.stringify(rec));
  put('2026-11-02', { template: 'worker/1', cycle: 114, finishReason: 'stop', statement: 'Two weeks ago.' });
  put('2026-11-09', { cycle: 115, statement: 'Before the template.' });
  put('2026-11-16', { template: 'worker/1', cycle: 116, finishReason: 'tool_calls', statement: 'Let me check.' });
  put('2026-11-23', { template: 'worker/1', cycle: 117, finishReason: 'stop', statement: 'Next week, not yet.' });
  assert.deepEqual(ww.lastReport('worker-chief-fire', '2026-11-23', { root }), { date: '2026-11-02', cycle: 114, statement: 'Two weeks ago.' });
  assert.equal(ww.lastReport('worker-chief-fire', '2026-11-01', { root }), null);
  assert.equal(ww.lastReport('worker-emerg-dir', '2026-11-23', { root }), null);
  const om = { offices: [{ officeId: 'CHIEF-FIRE', popid: 'POP-00140', holder: 'Marcus Hollowell', title: 'Fire Chief', agentDir: 'worker-chief-fire' }] };
  const d = deps(root); d.sheets = { getSheetAsObjects: async () => [] };
  d.wp = { ...d.wp, buildPool: async () => [{ popId: 'POP-00140', first: 'Marcus', last: 'Hollowell', cur: {} }], loadOfficeHolders: async () => ({ byPop: { 'POP-00140': { title: 'Fire Chief' } } }) };
  const w = await ww.buildWake({ officeId: 'CHIEF-FIRE', cycle: 117, officeMap: om, deps: d, date: '2026-11-23' });
  assert.ok(w.user.endsWith('Your last report on the record (Cycle 114):\nTwo weeks ago.\n\nCycle 117, your weekly report: speak on the record on what has changed in your records since your last report. Your reply goes on the record as your report, exactly as you give it.'));
  const first = await ww.buildWake({ officeId: 'CHIEF-FIRE', cycle: 117, officeMap: om, deps: d, date: '2026-11-01' });
  assert.ok(first.user.endsWith('Cycle 117, your weekly report: speak on the record on what you see in your records this Cycle. Your reply goes on the record as your report, exactly as you give it.') && !first.user.includes('last report'));
  // asked, the question is the task: no last report is handed
  const asked = await ww.buildWake({ officeId: 'CHIEF-FIRE', cycle: 117, officeMap: om, deps: d, date: '2026-11-23', question: 'Q?', askerLine: 'A,' });
  assert.ok(!asked.user.includes('last report'));
}));
