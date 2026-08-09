/**
 * griefPeriod.test.js — engine.94 Task 3 closed-loop local harness.
 *
 * Proves: required World_Config validation; death cascade provenance/duration;
 * Phase-9 MemoryRegisters persistence for a compress-ineligible survivor;
 * duplicate/source-cap rules; exact C+1..C+D activity and expiry; grief pool
 * weighting; participation suppression; reserved-response cap/routing; and no
 * direct DialState identity mutation.
 *
 * Run: node scripts/griefPeriod.test.js
 */

const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.Utilities = { formatDate: () => 'STAMP', getUuid: () => '00000000-test' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.inWorldStamp_ = (ctx) => 'C' + ((ctx.summary && ctx.summary.cycleId) || 0);

const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach((k) => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.baseTag_ = M.baseTag_;
const C = require('../utilities/compressLifeHistory.js');
global.getGriefConfig_ = C.getGriefConfig_;
global.activeGriefFromRegisters_ = C.activeGriefFromRegisters_;
global.getCitizenDialBands_ = () => null;

const genSrc = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generateCitizensEvents.js'), 'utf8');
const GEN = new Function(genSrc + '\nreturn { generateCitizensEvents_: generateCitizensEvents_, applyGriefPoolWeights_: applyGriefPoolWeights_ };')();
const generationSrc = fs.readFileSync(path.resolve(__dirname, '../phase04-events/generationalEventsEngine.js'), 'utf8');
const triggerDeathCascade_ = new Function(generationSrc + '\nreturn triggerDeathCascade_;')();

const APPROVED = {
  griefDurationCycles: 3,
  griefHolidayDurationCycles: 5,
  griefParticipationMultiplier: 0.80,
  griefPublicActivityMultiplier: 0.75,
  griefSupportMultiplier: 1.25,
  griefResponseChance: 0.35
};

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? `: ${detail}` : ''}`); failed++; }
}
function throws(fn, pattern) {
  try { fn(); } catch (err) { return pattern.test(String(err && err.message)); }
  return false;
}

console.log('═══ A. World_Config contract');
{
  const cfg = C.getGriefConfig_({ config: { ...APPROVED } });
  assert('A1 approved values parse exactly', cfg.durationCycles === 3 && cfg.responseChance === 0.35);
  const missing = { ...APPROVED };
  delete missing.griefSupportMultiplier;
  assert('A2 missing key fails loud', throws(() => C.getGriefConfig_({ config: missing }), /missing World_Config\.griefSupportMultiplier/));
  assert('A3 nonnumeric key fails loud', throws(() => C.getGriefConfig_({ config: { ...APPROVED, griefResponseChance: 'nope' } }), /invalid World_Config\.griefResponseChance/));
  assert('A4 out-of-range key fails loud', throws(() => C.getGriefConfig_({ config: { ...APPROVED, griefResponseChance: 1.1 } }), /invalid World_Config\.griefResponseChance/));
  assert('A5 duration must be an integer', throws(() => C.getGriefConfig_({ config: { ...APPROVED, griefDurationCycles: 2.5 } }), /invalid World_Config\.griefDurationCycles/));
}

function cascadeCtx(holiday, bonds) {
  return {
    config: { ...APPROVED },
    rng: () => 0.99,
    summary: { relationshipBonds: bonds, pendingCascades: [], eventArcs: [] }
  };
}

console.log('═══ B. Death cascade provenance + duration');
let ordinaryCascades;
{
  const bonds = [
    { citizenA: 'POP-00001', citizenB: 'POP-00002', bondType: 'alliance', status: 'active' },
    { citizenA: 'POP-00001', citizenB: 'POP-00002', bondType: 'mentorship', status: 'active' },
    { citizenA: 'POP-00001', citizenB: 'POP-00003', bondType: 'rivalry', status: 'active' }
  ];
  const ctx = cascadeCtx('none', bonds);
  triggerDeathCascade_(ctx, 'POP-00001', 'Synthetic Test Citizen', 3, '', 'Temescal', 100, { holiday: 'none', season: 'summer' });
  ordinaryCascades = ctx.summary.pendingCascades;
  assert('B1 alliance + mentorship emit; rivalry does not', ordinaryCascades.length === 2, ordinaryCascades.length);
  assert('B2 survivor and deceased provenance are machine fields', ordinaryCascades.every((c) => c.citizenId === 'POP-00002' && c.sourceCitizenId === 'POP-00001'));
  assert('B3 ordinary duration comes from config', ordinaryCascades.every((c) => c.duration === APPROVED.griefDurationCycles));

  const hctx = cascadeCtx('Thanksgiving', [{ citizenA: 'POP-00001', citizenB: 'POP-00002', bondType: 'alliance' }]);
  triggerDeathCascade_(hctx, 'POP-00001', 'Synthetic Test Citizen', 3, '', 'Temescal', 100, { holiday: 'Thanksgiving', season: 'fall' });
  assert('B4 stress-holiday duration comes from config', hctx.summary.pendingCascades[0].duration === APPROVED.griefHolidayDurationCycles);

  const badCtx = cascadeCtx('none', [{ citizenA: 'POP-00001', citizenB: 'POP-00002', bondType: 'alliance' }]);
  delete badCtx.config.griefHolidayDurationCycles;
  assert('B5 Phase-4 emitter fails loud on incomplete config', throws(() =>
    triggerDeathCascade_(badCtx, 'POP-00001', 'Synthetic Test Citizen', 3, '', 'Temescal', 100, { holiday: 'none', season: 'summer' }),
  /missing World_Config\.griefHolidayDurationCycles/));
}

function neutralDialState() {
  return C.serializeDialState_(E.newCitizen_());
}

const REG_HEADERS = ['POPID', 'LifeHistory', 'TraitProfile', 'DialState', 'MemoryRegisters'];
function registerCtx(cycle, memory, cascades) {
  const beforeDial = '{"future":{"keep":true},"base":{"drive":50}}';
  return {
    ctx: {
      mode: {},
      summary: { absoluteCycle: cycle, pendingCascades: cascades || [] },
      ledger: {
        headers: REG_HEADERS.slice(),
        rows: [['POP-00002', '', '', beforeDial, memory || '']],
        dirty: false
      }
    },
    beforeDial
  };
}

console.log('═══ C. Phase-9 persistence, dedupe, and expiry');
let persistedRegister;
{
  const seedRegister = JSON.stringify({ biases: [{ t: 'X', s: 1 }], unlived: [{ tag: 'Relocation' }], future: { keep: true } });
  const box = registerCtx(100, seedRegister, ordinaryCascades);
  C.compressLifeHistory_(box.ctx);
  persistedRegister = box.ctx.ledger.rows[0][4];
  const regs = JSON.parse(persistedRegister);
  assert('C1 compress-ineligible survivor still persists grief', regs.grief && regs.grief.startCycle === 101 && regs.grief.throughCycle === 103);
  assert('C2 duplicate bonds to same deceased dedupe source', regs.grief.sourceIds.length === 1 && regs.grief.sourceIds[0] === 'POP-00001');
  assert('C3 biases/unlived/unknown fields survive', regs.biases.length === 1 && regs.unlived.length === 1 && regs.future.keep === true);
  assert('C4 grief storage leaves DialState byte-identical', box.ctx.ledger.rows[0][3] === box.beforeDial);
  assert('C5 summary exposes one applied envelope change', box.ctx.summary.lifeHistoryCompression.griefApplied === 1 && box.ctx.summary.lifeHistoryCompression.griefCitizens === 1);

  assert('C6 created Cycle inactive', C.activeGriefFromRegisters_(persistedRegister, 100) === null);
  assert('C7 C+1 through C+D active', [101, 102, 103].every((cy) => !!C.activeGriefFromRegisters_(persistedRegister, cy)));
  assert('C8 C+D+1 inactive', C.activeGriefFromRegisters_(persistedRegister, 104) === null);

  const activeBox = registerCtx(102, persistedRegister, []);
  C.compressLifeHistory_(activeBox.ctx);
  assert('C8a active envelope needs no Phase-9 rewrite', activeBox.ctx.ledger.rows[0][4] === persistedRegister && activeBox.ctx.ledger.dirty === false);

  const expireBox = registerCtx(104, persistedRegister, []);
  C.compressLifeHistory_(expireBox.ctx);
  const expired = JSON.parse(expireBox.ctx.ledger.rows[0][4]);
  assert('C9 first Phase 9 after expiry removes only grief', !('grief' in expired) && expired.biases.length === 1 && expired.unlived.length === 1 && expired.future.keep === true);
  assert('C10 expiry leaves DialState byte-identical', expireBox.ctx.ledger.rows[0][3] === expireBox.beforeDial);
  assert('C11 malformed null-cycle state is inactive', C.activeGriefFromRegisters_(JSON.stringify({ grief: { startCycle: null, throughCycle: 3 } }), 1) === null);

  const missingTarget = registerCtx(100, seedRegister, ordinaryCascades.concat([{
    type: 'grief', effect: 'grief_period', citizenId: 'POP-00999', sourceCitizenId: 'POP-00004', cycleCreated: 100, duration: 3
  }]));
  const beforeMissingRegister = missingTarget.ctx.ledger.rows[0][4];
  assert('C12 survivor preflight fails before mutating another grief target',
    throws(() => C.compressLifeHistory_(missingTarget.ctx), /grief survivor missing\/duplicate/) &&
      missingTarget.ctx.ledger.rows[0][4] === beforeMissingRegister && missingTarget.ctx.ledger.dirty === false);
}

console.log('═══ D. Overlap and source cap');
{
  const regs = C.parseMemoryRegisters_('');
  const cascades = [];
  for (let i = 1; i <= 4; i++) {
    cascades.push({ type: 'grief', effect: 'grief_period', sourceCitizenId: `POP-0000${i}`, cycleCreated: 100 + i, duration: 3 });
  }
  C.foldGriefCascades_(regs, cascades);
  assert('D1 provenance cap is structural at 3', regs.grief.sourceIds.length === 3, JSON.stringify(regs.grief));
  assert('D2 distinct later loss extends window without strength field', regs.grief.throughCycle === 107 && !('intensity' in regs.grief), JSON.stringify(regs.grief));
  assert('D3 missing machine provenance fails loud', throws(() => C.foldGriefCascades_(C.parseMemoryRegisters_(''), [{ type: 'grief', effect: 'grief_period', cycleCreated: 1, duration: 3 }]), /missing sourceCitizenId/));
}

console.log('═══ E. Ordinary-pool bias applies once per family');
{
  const cfg = C.getGriefConfig_({ config: { ...APPROVED } });
  const pool = [
    { weight: 1, tags: ['source:fame', 'source:prevEvening'] },
    { weight: 1, tags: ['source:faith', 'relationship:alliance'] },
    { weight: 1, tags: ['source:sports', 'source:familyLife'] },
    { weight: 1, tags: ['source:weather'] }
  ];
  GEN.applyGriefPoolWeights_(pool, cfg);
  assert('E1 public family applies once despite two public tags', pool[0].weight === 0.75, pool[0].weight);
  assert('E2 support family applies once despite two support tags', pool[1].weight === 1.25, pool[1].weight);
  assert('E3 distinct public + support families may compose once each', pool[2].weight === 0.9375, pool[2].weight);
  assert('E4 unrelated entry stays byte-value neutral', pool[3].weight === 1, pool[3].weight);
}

const GEN_HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated',
  'Neighborhood', 'BirthYear', 'Occupation', 'TierRole', 'Type', 'TraitProfile', 'UsageCount',
  'MemoryRegisters', 'Status', 'DialState'];
function generatorCtx(seed, cfg, grief, guaranteed) {
  const dial = neutralDialState();
  const memory = grief ? JSON.stringify({ biases: [], unlived: [], grief: { startCycle: 101, throughCycle: 103, sourceIds: ['POP-00001'] } }) : '';
  const row = ['POP-00002', 'Synthetic', 'Citizen', 3, 'ENGINE', '', '', 'Temescal', 1990,
    'teacher', '', '', '', 0, memory, 'active', dial];
  return {
    ctx: {
      now: new Date(0),
      rng: mulberry32(seed),
      config: { ...cfg, cycleCount: 101 },
      ss: { getSheetByName: () => null },
      summary: {
        cycleId: 101,
        season: 'Summer',
        economicMood: 50,
        cycleActiveCitizens: guaranteed ? ['POP-00002'] : []
      },
      ledger: { headers: GEN_HEADERS.slice(), rows: [row], dirty: false }
    },
    dial
  };
}
const RESPONSE_TEXT = [
  'let a call go unanswered', 'kept the evening small', 'paused over a small reminder',
  'made room for a memory', 'answered a check-in', 'accepted quiet company'
];
function responseLines(life) {
  return String(life || '').split('\n').filter((line) => RESPONSE_TEXT.some((text) => line.indexOf(text) >= 0));
}

console.log('═══ F. Seeded next-Cycle consumer + dial safety');
{
  let normalParticipated = 0;
  let griefParticipated = 0;
  for (let seed = 1; seed <= 600; seed++) {
    const normal = generatorCtx(seed, { ...APPROVED, griefResponseChance: 0 }, false, false);
    const grieving = generatorCtx(seed, { ...APPROVED, griefResponseChance: 0 }, true, false);
    GEN.generateCitizensEvents_(normal.ctx);
    GEN.generateCitizensEvents_(grieving.ctx);
    if (normal.ctx.ledger.rows[0][5]) normalParticipated++;
    if (grieving.ctx.ledger.rows[0][5]) griefParticipated++;
  }
  assert('F1 0.80 config multiplier measurably lowers seeded participation', griefParticipated < normalParticipated, `${griefParticipated} vs ${normalParticipated}`);

  const certain = generatorCtx(77, { ...APPROVED, griefResponseChance: 1 }, true, true);
  GEN.generateCitizensEvents_(certain.ctx);
  const certainLife = certain.ctx.ledger.rows[0][5];
  const hits = responseLines(certainLife);
  assert('F2 responseChance=1 yields exactly one reserved response', hits.length === 1, JSON.stringify(hits));
  assert('F3 response routes to approved existing primary tag', /^C101 — \[(Strain|Personal|Community)\]/.test(hits[0] || ''), hits[0]);
  assert('F4 generator leaves DialState byte-identical', certain.ctx.ledger.rows[0][16] === certain.dial);

  const routed = { withdrawal: 0, memorial: 0, reconnection: 0 };
  let routeMismatch = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const sample = generatorCtx(seed * 17, { ...APPROVED, griefResponseChance: 1 }, true, true);
    GEN.generateCitizensEvents_(sample.ctx);
    const line = responseLines(sample.ctx.ledger.rows[0][5])[0] || '';
    if (line.indexOf('let a call') >= 0 || line.indexOf('kept the evening') >= 0) {
      routed.withdrawal++;
      if (line.indexOf('[Strain]') < 0) routeMismatch++;
    } else if (line.indexOf('paused over') >= 0 || line.indexOf('made room for') >= 0) {
      routed.memorial++;
      if (line.indexOf('[Personal]') < 0) routeMismatch++;
    } else if (line.indexOf('answered a check-in') >= 0 || line.indexOf('accepted quiet company') >= 0) {
      routed.reconnection++;
      if (line.indexOf('[Community]') < 0) routeMismatch++;
    }
  }
  assert('F4a all three response categories route to their exact approved tags',
    routeMismatch === 0 && routed.withdrawal > 0 && routed.memorial > 0 && routed.reconnection > 0,
    JSON.stringify(routed) + ' mismatches=' + routeMismatch);

  const none = generatorCtx(77, { ...APPROVED, griefResponseChance: 0 }, true, true);
  GEN.generateCitizensEvents_(none.ctx);
  assert('F5 changing only World_Config response chance changes result without code edit', responseLines(none.ctx.ledger.rows[0][5]).length === 0);

  const createdCycle = generatorCtx(77, { ...APPROVED, griefResponseChance: 1 }, true, true);
  createdCycle.ctx.summary.cycleId = 100;
  createdCycle.ctx.config.cycleCount = 100;
  GEN.generateCitizensEvents_(createdCycle.ctx);
  assert('F6 created Cycle is inactive even at responseChance=1', responseLines(createdCycle.ctx.ledger.rows[0][5]).length === 0);

  const bad = generatorCtx(1, { ...APPROVED }, true, true);
  delete bad.ctx.config.griefDurationCycles;
  assert('F7 full generator fails before draws when config is incomplete', throws(() => GEN.generateCitizensEvents_(bad.ctx), /missing World_Config\.griefDurationCycles/));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
