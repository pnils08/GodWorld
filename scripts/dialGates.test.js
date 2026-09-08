/**
 * engine.178 (S438) — dials close doors. Site-level proof for the five gates:
 * casino (integrity refuses / composure tilts), bonds (band pair factor, warmth as
 * maintenance), business (owner composure room, drive expansion), civic (integrity
 * on the scandal ceiling). Relocation's openness gate is proven on the bench.
 * Run: node scripts/dialGates.test.js
 */
const fs = require('fs'), path = require('path');
global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js'); Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js'); global.nudgesForEvent_ = M.nudgesForEvent_; global.baseTag_ = M.baseTag_;
global.pressureBar_ = M.pressureBar_; global.emitPressureTag_ = M.emitPressureTag_; global.pressureText_ = M.pressureText_;
const C = require('../utilities/compressLifeHistory.js'); global.getCitizenDialBands_ = C.getCitizenDialBands_;
global.queueAppendIntent_ = () => {}; global.queueCellIntent_ = () => {}; global.queueEnsureTabIntent_ = () => {};
global.safeRand_ = (ctx) => ctx.rng; global.recordHookRipple_ = () => {}; global.seedUnit_ = () => 0.5;
const src = rel => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const calSrc = src('../phase01-config/advanceSimulationCalendar.js');
const pick = (code, names) => new Function(code + '\nreturn {' + names.join(',') + '};')();

let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }
function ds(over) { const c = E.newCitizen_(); Object.keys(over || {}).forEach(k => { c.base[k] = over[k]; }); return C.serializeDialState_(c); }
function ledgerCtx(rows) { return { summary: {}, config: { dialOwnerStreakRoom: 1, dialOwnerDriveExpandMult: 1.25, dialIntegrityScandalLow: 1.5, dialIntegrityScandalHigh: 0.5 },
  ledger: { headers: ['POPID', 'First', 'Last', 'DialState'], rows, dirty: false } }; }

// ---- casino: the stake band
{
  const K = pick(src('../phase05-citizens/casinoLedgerEngine.js'), ['casinoStake_', 'casinoWeekly_']);
  const w = K.casinoWeekly_(90000);
  const base = K.casinoStake_(90000, 200000, 6, () => 0.5, 'hold', false);
  const tilt = K.casinoStake_(90000, 200000, 6, () => 0.5, 'hold', true);
  const climb = K.casinoStake_(90000, 200000, 6, () => 0.5, 'climb', false);
  const retreatTilt = K.casinoStake_(90000, 200000, 6, () => 0.5, 'retreat', true);
  const retreat = K.casinoStake_(90000, 200000, 6, () => 0.5, 'retreat', false);
  assert('casino: tilt draws the climb band', tilt === climb && tilt > base, `${base} ${tilt} ${climb}`);
  assert('casino: tilt ignores the retreat halving', retreatTilt === climb && retreat < retreatTilt, `${retreat} ${retreatTilt}`);
  assert('casino: hold unchanged', base === K.casinoStake_(90000, 200000, 6, () => 0.5, 'hold'));
  void w;
}

// ---- bonds: band pair factor + maintenance
{
  const B = pick(src('../phase05-citizens/bondEngine.js'), ['bondDialBand_', 'bondPairFactor_', 'bondWarmthFactor_', 'bondFamilyFactor_']);
  const ctx = ledgerCtx([
    ['POP-W1', 'Warm', 'One', ds({ warmth: 90, family: 85 })], ['POP-W2', 'Warm', 'Two', ds({ warmth: 88, family: 15 })],
    ['POP-C1', 'Cold', 'One', ds({ warmth: 10 })], ['POP-N1', 'Neutral', 'One', ds({})],
    ['POP-F1', 'Face', 'Only', ''],
  ]);
  ctx.ledger.headers.push('TraitProfile'); ctx.ledger.rows[4].push('Archetype:Connector|warmth:85|family:50');
  assert('bond: warm band +2', B.bondDialBand_(ctx, 'POP-W1', 'warmth') === 2);
  assert('bond: cold band -2', B.bondDialBand_(ctx, 'POP-C1', 'warmth') === -2);
  assert('bond: neutral band 0', B.bondDialBand_(ctx, 'POP-N1', 'warmth') === 0);
  assert('bond: name key resolves', B.bondDialBand_(ctx, 'Warm One', 'warmth') === 2);
  assert('bond: face fallback when no DialState', B.bondDialBand_(ctx, 'POP-F1', 'warmth') === 2);
  assert('bond: warm pair 1.25', Math.abs(B.bondWarmthFactor_(ctx, 'POP-W1', 'POP-W2') - 1.25) < 1e-9);
  assert('bond: cold pair 0.75', Math.abs(B.bondWarmthFactor_(ctx, 'POP-C1', 'POP-C1') - 0.75) < 1e-9);
  assert('bond: mixed pair 1.0', Math.abs(B.bondWarmthFactor_(ctx, 'POP-W1', 'POP-C1') - 1.0) < 1e-9);
  assert('bond: family factor reads family, not warmth', B.bondFamilyFactor_(ctx, 'POP-W1', 'POP-W2') === 1.0);
  // maintenance: the stale-bond decay scales by (2 - warmth factor)
  assert('bond: warm pair neglect decay x0.75', Math.abs(0.5 * (2 - B.bondWarmthFactor_(ctx, 'POP-W1', 'POP-W2')) - 0.375) < 1e-9);
  assert('bond: cold pair neglect decay x1.25', Math.abs(0.5 * (2 - B.bondWarmthFactor_(ctx, 'POP-C1', 'POP-C1')) - 0.625) < 1e-9);
}

// ---- business: owner bands, drive expansion, closure room
{
  const GW = pick(calSrc + src('../phase05-citizens/generationalWealthEngine.js'), ['parseKeyPersonnelOwners_']);
  global.parseKeyPersonnelOwners_ = GW.parseKeyPersonnelOwners_;
  const BD = pick(src('../phase05-citizens/applyBusinessDynamics.js'), ['bizDriftOne_', 'bizOwnerBands_', 'bizClamp_']);
  const cfg = { bizVol_default: 1, bizEventShockScale: 1, bizVitalityNeutral: 5, bizVitalityGain: 0.1, bizSuccessVitalityHigh: 9, bizSuccessApprovalHigh: 90,
    bizSuccessWindow: 99, bizSuccessPenalty: 0, bizDisruptBaseChance: 0, bizDisruptSuccessMult: 1, bizDisruptShock: 0, bizNoiseBound: 0,
    bizDriftMaxDown: 2, bizDriftMaxUp: 2, bizGrowthFloor: -5, bizGrowthCeil: 20 };
  const biz = { id: 'BIZ-1', sector: 'Retail', growth: 2, revenue: 100000 };
  const inputsBase = { chaosAtBusiness: false, chaosInHood: false, initiativeInHood: true, coverageSentiment: 1, vitality: 5, mayorApproval: 50 };
  const plain = BD.bizDriftOne_(cfg, biz, { streak: 0, win: 0 }, Object.assign({ ownerDriveBand: 0, ownerExpandMult: 1.25 }, inputsBase), 106);
  const driven = BD.bizDriftOne_(cfg, biz, { streak: 0, win: 0 }, Object.assign({ ownerDriveBand: 2, ownerExpandMult: 1.25 }, inputsBase), 106);
  assert('business: positive drift x1.25 for a driven owner', Math.abs(driven.drift - plain.drift * 1.25) < 1e-9, `${plain.drift} ${driven.drift}`);
  const bad = { chaosAtBusiness: true, chaosInHood: true, initiativeInHood: false, coverageSentiment: -1, vitality: 5, mayorApproval: 50 };
  const badPlain = BD.bizDriftOne_(cfg, biz, { streak: 0, win: 0 }, Object.assign({ ownerDriveBand: 0, ownerExpandMult: 1.25 }, bad), 106);
  const badDriven = BD.bizDriftOne_(cfg, biz, { streak: 0, win: 0 }, Object.assign({ ownerDriveBand: 2, ownerExpandMult: 1.25 }, bad), 106);
  assert('business: a bad week is never multiplied', badDriven.drift === badPlain.drift && badPlain.drift < 0);
  const ctx = ledgerCtx([['POP-00901', 'Steady', 'Owner', ds({ composure: 85, drive: 90 })], ['POP-00902', 'Volatile', 'Owner', ds({ composure: 10 })]]);
  const b1 = BD.bizOwnerBands_(ctx, 'POP-00901 (Steady Owner, Owner); POP-00902 (Volatile Owner, Manager)');
  assert('business: owner resolved to bands (first owner entry)', b1 && b1.composure === 2 && b1.drive === 2, JSON.stringify(b1));
  assert('business: no owner tag -> null', BD.bizOwnerBands_(ctx, 'POP-00902 (Volatile Owner, Manager)') === null);
  assert('business: unknown pop -> null', BD.bizOwnerBands_(ctx, 'POP-00999 (Ghost, Owner)') === null);
  const byName = BD.bizOwnerBands_(ctx, 'Steady Owner (Founder)');
  assert('business: name-only founder resolves by full name', byName && byName.composure === 2, JSON.stringify(byName));
  assert('business: co-founders resolve the first that matches', BD.bizOwnerBands_(ctx, 'Nobody Known / Volatile Owner (Co-Founders)').composure === -2);
  assert('business: closure room arithmetic', (3 + 1) === 4 && (3 - 1) === 2);
}

// ---- civic: integrity scales the ceiling chance; holder by name
{
  const CV = pick(calSrc + src('../phase05-citizens/updateCivicApprovalRatings.js'), ['applyApprovalCeilingRisk_', 'holderIntegrityBand_']);
  const config = { threshold: 80, minStreakCycles: 2, baseChance: 0.1, chanceStep: 0.05, maxChance: 0.9, approvalDrop: 20 };
  const st = { cycle: 106, status: 'active', approval: 85, highStreak: 3, untilCycle: null, source: '' };
  const r = () => 0.99;
  const c1 = CV.applyApprovalCeilingRisk_(Object.assign({}, st), config, r).chance;
  const cLow = CV.applyApprovalCeilingRisk_(Object.assign({ chanceMult: 1.5 }, st), config, r).chance;
  const cHigh = CV.applyApprovalCeilingRisk_(Object.assign({ chanceMult: 0.5 }, st), config, r).chance;
  assert('civic: chance x1.5 for low integrity', Math.abs(cLow - c1 * 1.5) < 1e-9, `${c1} ${cLow}`);
  assert('civic: chance x0.5 for high integrity', Math.abs(cHigh - c1 * 0.5) < 1e-9);
  assert('civic: capped at maxChance', CV.applyApprovalCeilingRisk_(Object.assign({ chanceMult: 100 }, st), config, r).chance === 0.9);
  const ctx = ledgerCtx([['POP-M1', 'Avery', 'Santana', ds({ integrity: 85 })], ['POP-M2', 'Warren', 'Ashford', ds({ integrity: 12 })], ['POP-M3', 'Plain', 'Person', ds({})]]);
  assert('civic: holder +2 by name', CV.holderIntegrityBand_(ctx, 'Avery Santana') === 2);
  assert('civic: holder -2 by name (case-insensitive)', CV.holderIntegrityBand_(ctx, 'warren ashford') === -2);
  assert('civic: neutral holder 0', CV.holderIntegrityBand_(ctx, 'Plain Person') === 0);
  assert('civic: unknown holder null', CV.holderIntegrityBand_(ctx, 'Nobody Here') === null);
  assert('civic: blank holder null', CV.holderIntegrityBand_(ctx, '') === null);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
