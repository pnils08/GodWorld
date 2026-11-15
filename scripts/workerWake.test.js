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

test('buildWake, the chief on his own wake: who he is and his memory, then his data, his decisions and one task line', async () => workspace(async (root) => {
  writeMoves(root, 114, [{ moveId: 'MV-114-a', cycle: 114, popid: 'POP-00136', type: 'patrol', status: 'pending', at: '2026-11-05T00:00:00Z', payload: { strategy: 'suppress_hotspots', note: 'x' } }]);
  const w = await ww.buildWake({ officeId: 'CHIEF-POLICE', cycle: 115, officeMap: OFFICE_MAP, deps: deps(root) });
  assert.match(w.system, /^You are Rafael Montez\. You hold the office of Police Chief\. Your temperament: steady\.\n\nFrom your own memory:\n- \(Cycle 115\)/);
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(w.system), 'no calendar date in the system turn');
  assert.ok(!w.user.includes('.claude/agents'), 'no folder path in the user turn');
  assert.match(w.user, /No reading this Cycle: Hotspot/);
  assert.ok(!/\| Hotspot/.test(w.user.split('\n')[1]), 'the blank column is not printed');
  assert.match(w.user, /ResponseTimeAvg \| 11\.8 — Beta \| 10\.7 — Gamma/);
  // the loop: the setting in force beside what was recorded under it; last Cycle's sheet joins when the previous dump is that Cycle
  assert.match(w.user, /114 \| balanced \(default\) \| 43 \| 56 \| 72 \| 27 \| 15 \| 11\.4 \| 0\.203/);
  assert.match(w.user, /115 \| suppress_hotspots \| 24 \| 72 \| 67 \| 29 \| 20 \| 11\.4 \| 0\.203/);
  assert.match(w.user, /114 \| citizen Chase West \| helped_by_police/);
  assert.ok(!w.user.includes('mail_truck') && !w.user.includes('WEEKLY-ALLOCATION'), 'only his trade');
  assert.match(w.user, /- Cycle 114, patrol: strategy: suppress_hotspots; note: x/);
  assert.ok(w.user.endsWith('It is the close of Cycle 115. You are speaking on the record as Police Chief.'));
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
