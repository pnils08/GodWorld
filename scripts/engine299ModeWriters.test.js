// Synthetic in-memory writer tests. No env loader, Sheets, model or network calls.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('../utilities/citizenDialMap');
const essence = require('../utilities/tier1EssenceEvents').TIER1_ESSENCE;
const root = path.resolve(__dirname, '..');
const specs = [
  ['GAME', 'phase04-events/generateGameModeMicroEvents.js', 'generateGameModeMicroEvents_', ['SP', 'editor', 'reporter', 'columnist', 'photographer', 'mayor', 'council', 'staff', 'public figure']],
  ['MEDIA', 'phase05-citizens/generateMediaModeEvents.js', 'generateMediaModeEvents_', ['editor-in-chief', 'senior columnist', 'podcast host', 'photographer', 'analyst', 'opinion writer', 'wire reporter', 'trend reporter', 'business reporter', 'reporter', 'staff']],
  ['CIVIC', 'phase05-citizens/generateCivicModeEvents.js', 'generateCivicModeEvents_', ['mayor', 'council', 'district attorney', 'police chief', 'director', 'staff']]
];
const headers = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'Status', 'LifeHistory', 'LastUpdated', 'RoleType', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'TraitProfile', 'Neighborhood'];
const moves = (tag, text) => Object.keys(M.nudgesForEvent_(tag, 1, text)).length > 0;
let emitted = 0, skipped = 0;
for (const [mode, file, fn, roles] of specs) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const sandbox = { Logger: { log() {} }, inWorldStamp_: () => 'C101', getCitizenDialBands_: () => null,
    nudgesForEvent_: M.nudgesForEvent_, gradedTag_: M.gradedTag_,
    queueBatchAppendIntent_: (ctx, sheet, rows) => ctx.logs.push(...rows), __select: 0, __fixture: null };
  vm.createContext(sandbox);
  // Select every actual pool entry deterministically; only the random selection seam is replaced.
  vm.runInContext(src.replace('var picked = uniquePick_(pool, popId);',
    '__pool = pool; var picked = __fixture || pool[__select % pool.length];'), sandbox);
  function run(role, context = {}, trait = '', fixture = null, select = 0) {
    const row = ['SYNTHETIC', 'Synthetic', 'Citizen', 1, mode, 'active', '', 'unchanged', role,
      role === 'SP' ? 'y' : '', /editor|reporter|columnist|photographer/.test(role) ? 'y' : '', /mayor|council|staff/.test(role) ? 'y' : '', trait, 'SYNTHETIC-HOOD'];
    const ctx = { ledger: { headers, rows: [row], dirty: false }, summary: { cycleId: 101, ...context },
      config: {}, rng: () => 0, now: new Date(0), ss: { getSheetByName: name => name === 'LifeHistory_Log' ? {} :
        name === 'Civic_Office_Ledger' && role === 'council' && context.testFaction ? {
          getDataRange: () => ({ getValues: () => [['PopId', 'Title', 'Faction'], ['SYNTHETIC', 'Council Member', context.testFaction]] })
        } : null }, logs: [] };
    sandbox.__fixture = fixture; sandbox.__select = select; sandbox[fn](ctx);
    const written = row[6];
    if (written) {
      const [, tag, text] = /^C101 — \[([^\]]+)\] (.*)$/.exec(written);
      assert(moves(tag, text), `${mode} inert output: ${tag}`);
      assert.strictEqual(ctx.logs.length, 1); assert.strictEqual(ctx.logs[0][3], tag);
      assert.strictEqual(ctx.logs[0][4], text); assert(ctx.ledger.dirty);
      emitted++;
    } else {
      assert.strictEqual(ctx.logs.length, 0); assert.strictEqual(row[7], 'unchanged');
      assert.strictEqual(ctx.ledger.dirty, false); assert(!ctx.summary.eventsGenerated);
      assert.strictEqual(ctx.summary.engine299.noDial, 1); skipped++;
    }
    return ctx;
  }
  const contexts = [{}, { holiday: 'Thanksgiving', sportsAtmosphereEnabled: true, sportsSeason: 'championship' },
    { sportsAtmosphereEnabled: true, sportsSeason: 'playoffs', cityDynamics: { sentiment: -.7 }, civicLoad: 'load-strain',
      votesThisCycle: [{ name: 'SYNTHETIC PASS', outcome: 'PASSED' }, { name: 'SYNTHETIC FAIL', outcome: 'FAILED' }],
      grantsThisCycle: [{ name: 'SYNTHETIC GRANT' }], initiativeEvents: [{ name: 'SYNTHETIC OARI', outcome: 'pending' }],
      eventArcs: [{ neighborhood: 'SYNTHETIC-HOOD', phase: 'rising' }], testFaction: 'OPP',
      crimeMetrics: { context: { city: { qualityOfLifeIndex: .2, patrolStrategy: 'suppress_hotspots', hotspotHoods: ['SYNTHETIC-HOOD'] } } } },
    { testFaction: 'CRC', crimeMetrics: { context: { city: { patrolStrategy: 'community_presence' } } } },
    { sportsAtmosphereEnabled: true, sportsSeason: 'off-season', cityDynamics: { sentiment: .7 } }];
  const seen = new Map();
  for (const role of roles) for (const context of contexts) for (const trait of (role === 'SP' ? ['Catalyst', 'Anchor', 'Watcher', 'Grounded', 'Striver', 'Connector', 'Drifter'] : [''])) {
    run(role, context, trait);
    const pool = sandbox.__pool;
    for (let i = 0; i < pool.length; i++) {
      const ctx = run(role, context, trait, null, i);
      seen.set(pool[i].text, ctx.ledger.rows[0][6]);
    }
  }
  const down = mode === 'GAME' ? 'sensed the heightened expectations' : mode === 'MEDIA' ? "skipped lunch and didn't notice until 4 PM" : 'sensed growing public discontent with city leadership';
  assert(seen.has(down), `${mode} down fixture not reached`);
  assert(seen.get(down).includes('-Down-S]'), `${mode} wrong sign: ${down}`);
  // codex 2026-10-18: "handled sensitive communications" names a task, not an ethical outcome — no integrity sign;
  // it is unsigned, so the writer skips it and writes nothing.
  if (seen.has('handled sensitive communications')) assert.strictEqual(seen.get('handled sensitive communications'), '', `${mode} sensitive communications must not be signed`);
  if (mode === 'CIVIC') {
    assert(seen.has('pushed back on administration priorities in caucus'));
    assert(seen.has('raised fiscal accountability concerns in committee'));
    assert.strictEqual(seen.get('voted on the SYNTHETIC PASS — measure passed '), '');
    assert.strictEqual(seen.get('received word on the SYNTHETIC GRANT federal decision'), '');
  }
  for (const tags of [[], ['dial:bogus:up'], ['dial:drive:sideways'], ['dial:drive:up', 'dial:drive:down']]) {
    const ctx = run(roles[0], {}, '', { text: 'SYNTHETIC unsigned', primary: 'Personal', tags });
    assert.strictEqual(ctx.summary.engine299.noDialBySource['kind:Personal'], 1);
  }
  const bare = run(roles[0], {}, '', { text: 'SYNTHETIC community participation', primary: 'Community', tags: [] });
  assert(bare.ledger.rows[0][6].includes('[Community]'));
  sandbox.gradedTag_ = undefined;
  run(roles[0], {}, '', { text: 'SYNTHETIC signed without helper', primary: 'Personal', tags: ['dial:drive:up'] });
  sandbox.gradedTag_ = M.gradedTag_; sandbox.nudgesForEvent_ = undefined;
  run(roles[0], {}, '', { text: 'SYNTHETIC no resolver', primary: 'Community', tags: [] });
  // Unmodified selection path also reaches real writes with seeded RNG.
  sandbox.nudgesForEvent_ = M.nudgesForEvent_;
  vm.runInContext(src, sandbox);
  for (let i = 0; i < 20; i++) run(roles[i % roles.length]);
  console.log(`${mode}: ${seen.size} distinct pool lines checked`);
}

async function seedRun(events, old = []) {
  const archive = [['POPID', 'EventTag', 'EventText', 'Cycle'], ...old.map(e => ['SYNTHETIC', e.tag, e.text, 0])];
  const grid = [['POPID', 'LifeHistory', 'TraitProfile', 'DialState', 'First', 'Last', 'Neighborhood'],
    ['SYNTHETIC', '', '', '', 'Synthetic', 'Citizen', 'SYNTHETIC-HOOD']];
  const appended = [], logs = [];
  const sheets = { getSheetData: async tab => tab === 'Simulation_Ledger' ? grid : archive,
    appendRows: async (tab, rows) => { assert.strictEqual(tab, 'LifeHistory_Archive'); appended.push(...rows); rows.forEach(r => archive.push([r[1], r[3], r[4], r[6]])); },
    batchUpdate: async updates => { for (const u of updates) grid[1][u.range.includes('D2') ? 3 : 2] = u.values[0][0]; } };
  const dials = ['composure', 'outabout', 'sociability', 'family', 'warmth', 'openness', 'fandom', 'drive', 'integrity'];
  const modules = {
    'lib/env': {}, 'utilities/citizenMemory.js': { DIALS: dials, newCitizen_: () => ({ base: Object.fromEntries(dials.map(d => [d, 50])) }) },
    'utilities/citizenDialMap.js': M,
    'utilities/compressLifeHistory.js': { parseDialState_: () => null, parseLifeHistoryEntries_: () => ({ entries: [] }), serializeDialState_: JSON.stringify, formatDialFace_: () => 'Archetype: Synthetic' },
    'lib/citizenDials.js': { deviation: () => 0, bandIdx: () => 2 },
    'utilities/tier1EssenceEvents.js': { TIER1_ESSENCE: { SYNTHETIC: { name: 'Synthetic', events } } }, 'lib/sheets.js': sheets
  };
  const sandbox = { global: {}, process: { argv: ['node', 'test', '--apply'], exit: code => { throw Error('exit '+code); } },
    console: { log: (...v) => logs.push(v.join(' ')), error: (...v) => { throw Error(v.join(' ')); } },
    require: p => { const key = p.replace('/root/GodWorld/', ''); assert(Object.hasOwn(modules, key), key); return modules[key]; } };
  vm.createContext(sandbox);
  await vm.runInContext(fs.readFileSync(path.join(root, 'scripts/seedTier1EssenceLive.js'), 'utf8'), sandbox);
  return { appended, archive, logs };
}
(async () => {
  const events = Object.values(essence).flatMap(e => e.events);
  const result = await seedRun(events);
  assert(result.appended.length > 100);
  for (const r of result.appended) assert(moves(r[3], r[4]), `inert seed ${r[3]}: ${r[4]}`);
  const pressure = result.appended.find(r => r[4] === 'Carries the weight of the contract every at-bat.');
  assert.strictEqual(pressure[3], 'Background-Composure-Down-S');
  const preserved = { tag: 'Personal', text: 'SYNTHETIC historical line', tags: ['dial:drive:up'] };
  const fixtures = [preserved, { tag: 'Personal', text: 'SYNTHETIC unsigned' }, { tag: 'Community', text: 'SYNTHETIC community' },
    { tag: 'Personal', text: 'SYNTHETIC down', tags: ['dial:composure:down'] }];
  const first = await seedRun(fixtures, [preserved]);
  assert.strictEqual(first.appended.length, 2);
  assert.strictEqual(first.archive[1][1], 'Personal');
  assert(first.appended.some(r => r[3] === 'Community'));
  assert(first.appended.some(r => r[3] === 'Personal-Composure-Down-S'));
  assert(first.logs.some(l => l.includes('"noDial":1') && l.includes('"kind:Personal":1')));
  const rerun = await seedRun(fixtures, first.archive.slice(1).map(r => ({ tag: r[1], text: r[2] })));
  assert.strictEqual(rerun.appended.length, 0);
  console.log(`Seed: ${result.appended.length} future appends, historical dedupe and rerun verified`);
  console.log(`PASS: ${emitted} mode outputs, ${skipped} rejected selections; seed writer exercised with fake Sheets only`);
})().catch(e => { console.error(e); process.exitCode = 1; });
