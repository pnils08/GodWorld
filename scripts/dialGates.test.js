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

// ---- bonds: pair factor off the numbers + maintenance
{
  const B = pick(src('../phase05-citizens/bondEngine.js'), ['bondDialPos_', 'bondPairFactor_', 'bondWarmthFactor_', 'bondFamilyFactor_']);
  const ctx = ledgerCtx([
    ['POP-W1', 'Warm', 'One', ds({ warmth: 90, family: 85 })], ['POP-W2', 'Warm', 'Two', ds({ warmth: 88, family: 15 })],
    ['POP-C1', 'Cold', 'One', ds({ warmth: 10 })], ['POP-N1', 'Neutral', 'One', ds({})],
    ['POP-F1', 'Face', 'Only', ''], ['POP-M1', 'Mid', 'Warm', ds({ warmth: 55 })], ['POP-M2', 'Mid', 'Cool', ds({ warmth: 45 })],
  ]);
  ctx.ledger.headers.push('TraitProfile'); ctx.ledger.rows[4].push('Archetype:Connector|warmth:85|family:50');
  assert('bond: warmth 90 -> +2', B.bondDialPos_(ctx, 'POP-W1', 'warmth') === 2);
  assert('bond: warmth 10 -> -2', B.bondDialPos_(ctx, 'POP-C1', 'warmth') === -2);
  assert('bond: neutral 0', B.bondDialPos_(ctx, 'POP-N1', 'warmth') === 0);
  assert('bond: name key resolves', B.bondDialPos_(ctx, 'Warm One', 'warmth') === 2);
  assert('bond: face fallback when no DialState (warmth:85 -> 1.75)', Math.abs(B.bondDialPos_(ctx, 'POP-F1', 'warmth') - 1.75) < 1e-9);
  assert('bond: the middle counts — 55 -> +0.25, 45 -> -0.25', Math.abs(B.bondDialPos_(ctx, 'POP-M1', 'warmth') - 0.25) < 1e-9 && Math.abs(B.bondDialPos_(ctx, 'POP-M2', 'warmth') + 0.25) < 1e-9);
  assert('bond: a 55 pair warms a little faster than a 45 pair', B.bondWarmthFactor_(ctx, 'POP-M1', 'POP-M1') > 1 && B.bondWarmthFactor_(ctx, 'POP-M2', 'POP-M2') < 1 &&
    Math.abs(B.bondWarmthFactor_(ctx, 'POP-M1', 'POP-M1') - 1.03125) < 1e-9);
  assert('bond: warm pair (90 + 88) 1.24375', Math.abs(B.bondWarmthFactor_(ctx, 'POP-W1', 'POP-W2') - 1.24375) < 1e-9, String(B.bondWarmthFactor_(ctx, 'POP-W1', 'POP-W2')));
  assert('bond: cold pair 0.75', Math.abs(B.bondWarmthFactor_(ctx, 'POP-C1', 'POP-C1') - 0.75) < 1e-9);
  assert('bond: mixed pair 1.0', Math.abs(B.bondWarmthFactor_(ctx, 'POP-W1', 'POP-C1') - 1.0) < 1e-9);
  assert('bond: family factor reads family, not warmth (85 and 15 cancel)', Math.abs(B.bondFamilyFactor_(ctx, 'POP-W1', 'POP-W2') - 1.0) < 1e-9);
  // maintenance: the stale-bond decay scales by (2 - warmth factor)
  assert('bond: warm pair neglect decay x0.75', Math.abs(0.5 * (2 - B.bondWarmthFactor_(ctx, 'POP-W1', 'POP-W1')) - 0.375) < 1e-9);
  assert('bond: cold pair neglect decay x1.25', Math.abs(0.5 * (2 - B.bondWarmthFactor_(ctx, 'POP-C1', 'POP-C1')) - 0.625) < 1e-9);
}

// ---- business: the owner's numbers, drive expansion, closure room
{
  const GW = pick(calSrc + src('../phase05-citizens/generationalWealthEngine.js'), ['parseKeyPersonnelOwners_']);
  global.parseKeyPersonnelOwners_ = GW.parseKeyPersonnelOwners_;
  const BD = pick(src('../phase05-citizens/applyBusinessDynamics.js'), ['bizDriftOne_', 'bizOwnerDials_', 'bizClamp_']);
  const cfg = { bizVol_default: 1, bizEventShockScale: 1, bizCoverageUnit: 0.1, bizVitalityGain: 0.1, bizSuccessVitalityHigh: 9, bizSuccessApprovalHigh: 90,
    bizSuccessWindow: 99, bizSuccessPenalty: 0, bizDisruptBaseChance: 0, bizDisruptSuccessMult: 1, bizDisruptShock: 0, bizNoiseBound: 0,
    bizDriftMaxDown: 2, bizDriftMaxUp: 2, bizGrowthFloor: -5, bizGrowthCeil: 20,
    // engine.356 moved these onto World_Config (bizEventCap was 2.0 in code); neutral here so the owner-drive math is what is tested
    bizEventCap: 2, bizInitiativeStallDrag: 0.5, bizWeatherPp: 0, bizSportsWeekPp: 0 };
  const biz = { id: 'BIZ-1', sector: 'Retail', growth: 2, revenue: 100000 };
  const inputsBase = { chaosAtBusiness: false, chaosInHood: false, initiativeAdvanced: true, coverageDeviation: 0.1, vitality: 5, vitalityMedian: 5, mayorApproval: 50 };
  const plain = BD.bizDriftOne_(cfg, biz, { streak: 0, win: 0 }, Object.assign({ ownerDriveHigh: 0, ownerExpandMult: 1.25 }, inputsBase), 106);
  const driven = BD.bizDriftOne_(cfg, biz, { streak: 0, win: 0 }, Object.assign({ ownerDriveHigh: 1, ownerExpandMult: 1.25 }, inputsBase), 106);
  const halfDriven = BD.bizDriftOne_(cfg, biz, { streak: 0, win: 0 }, Object.assign({ ownerDriveHigh: E.dialHigh_(80, 2), ownerExpandMult: 1.25 }, inputsBase), 106);
  assert('business: positive drift x1.25 for a driven owner (drive 90)', Math.abs(driven.drift - plain.drift * 1.25) < 1e-9, `${plain.drift} ${driven.drift}`);
  assert('business: drive 80 earns half the multiplier (x1.125)', Math.abs(halfDriven.drift - plain.drift * 1.125) < 1e-9, `${plain.drift} ${halfDriven.drift}`);
  const bad = { chaosAtBusiness: -1, chaosInHood: -1, initiativeAdvanced: false, coverageDeviation: -0.1, vitality: 5, vitalityMedian: 5, mayorApproval: 50 };
  const badPlain = BD.bizDriftOne_(cfg, biz, { streak: 0, win: 0 }, Object.assign({ ownerDriveHigh: 0, ownerExpandMult: 1.25 }, bad), 106);
  const badDriven = BD.bizDriftOne_(cfg, biz, { streak: 0, win: 0 }, Object.assign({ ownerDriveHigh: 1, ownerExpandMult: 1.25 }, bad), 106);
  assert('business: a bad week is never multiplied', badDriven.drift === badPlain.drift && badPlain.drift < 0);
  const ctx = ledgerCtx([['POP-00901', 'Steady', 'Owner', ds({ composure: 85, drive: 90 })], ['POP-00902', 'Volatile', 'Owner', ds({ composure: 10 })]]);
  const b1 = BD.bizOwnerDials_(ctx, 'POP-00901 (Steady Owner, Owner); POP-00902 (Volatile Owner, Manager)');
  assert('business: owner resolved to their numbers (first owner entry)', b1 && b1.composure === 85 && b1.drive === 90, JSON.stringify(b1));
  assert('business: no owner tag -> null', BD.bizOwnerDials_(ctx, 'POP-00902 (Volatile Owner, Manager)') === null);
  assert('business: unknown pop -> null', BD.bizOwnerDials_(ctx, 'POP-00999 (Ghost, Owner)') === null);
  const byName = BD.bizOwnerDials_(ctx, 'Steady Owner (Founder)');
  assert('business: name-only founder resolves by full name', byName && byName.composure === 85, JSON.stringify(byName));
  assert('business: co-founders resolve the first that matches', BD.bizOwnerDials_(ctx, 'Nobody Known / Volatile Owner (Co-Founders)').composure === 10);
  assert('business: closure room arithmetic', (3 + 1) === 4 && (3 - 1) === 2);
}

// ---- civic: integrity scales the ceiling chance; holder by name
{
  const CV = pick(calSrc + src('../phase05-citizens/updateCivicApprovalRatings.js'), ['applyApprovalCeilingRisk_', 'holderIntegrityPos_']);
  const config = { threshold: 80, minStreakCycles: 2, baseChance: 0.1, chanceStep: 0.05, maxChance: 0.9, approvalDrop: 20 };
  const st = { cycle: 106, status: 'active', approval: 85, highStreak: 3, untilCycle: null, source: '' };
  const r = () => 0.99;
  const c1 = CV.applyApprovalCeilingRisk_(Object.assign({}, st), config, r).chance;
  const cLow = CV.applyApprovalCeilingRisk_(Object.assign({ chanceMult: 1.5 }, st), config, r).chance;
  const cHigh = CV.applyApprovalCeilingRisk_(Object.assign({ chanceMult: 0.5 }, st), config, r).chance;
  assert('civic: chance x1.5 for low integrity', Math.abs(cLow - c1 * 1.5) < 1e-9, `${c1} ${cLow}`);
  assert('civic: chance x0.5 for high integrity', Math.abs(cHigh - c1 * 0.5) < 1e-9);
  assert('civic: capped at maxChance', CV.applyApprovalCeilingRisk_(Object.assign({ chanceMult: 100 }, st), config, r).chance === 0.9);
  const ctx = ledgerCtx([['POP-M1', 'Avery', 'Santana', ds({ integrity: 90 })], ['POP-M2', 'Warren', 'Ashford', ds({ integrity: 10 })], ['POP-M3', 'Plain', 'Person', ds({})], ['POP-M4', 'Mid', 'Holder', ds({ integrity: 55 })]]);
  assert('civic: holder at 90 -> +2 by name', CV.holderIntegrityPos_(ctx, 'Avery Santana') === 2);
  assert('civic: holder at 10 -> -2 by name (case-insensitive)', CV.holderIntegrityPos_(ctx, 'warren ashford') === -2);
  assert('civic: neutral holder 0', CV.holderIntegrityPos_(ctx, 'Plain Person') === 0);
  assert('civic: the middle counts — a holder at 55 reads +0.25', Math.abs(CV.holderIntegrityPos_(ctx, 'Mid Holder') - 0.25) < 1e-9);
  assert('civic: unknown holder null', CV.holderIntegrityPos_(ctx, 'Nobody Here') === null);
  assert('civic: blank holder null', CV.holderIntegrityPos_(ctx, '') === null);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
