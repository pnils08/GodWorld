#!/usr/bin/env node
'use strict';
/**
 * Run: node scripts/employerSuccess.test.js
 *
 * engine.135 — Employment System Cascade, Phase E2
 * (docs/plans/2026-08-29-employment-system-cascade.md). Builder point 15:
 * business success is the causation. Point 14: nothing free.
 *
 *   applyEmployerSuccess_(ctx, cycle, roll, logRows, S, gapFactor)
 *     — per tracked business, Growth_Rate sets a promotion budget (g > 0) or
 *       a layoff budget (g < 0): p = |g|/100/52 × staff × gapFactor (÷ for
 *       layoffs), one draw per business, at most one event each per cycle.
 *     — promotion: beneficiary = longest since LastPromotionCycle → lowest
 *       Income → POPID; Income +6–12%; LastPromotionCycle = cycle;
 *       stampPromotion_ writes the [Promotion] line + LifeHistory_Log intent.
 *     — layoff: victim = lowest [CareerState] level → lowest Income → POPID;
 *       Income −12–20%; employer cleared; Career-Layoff log row; businessDelta.
 *     — outside: SELF_EMPLOYED / UNTRACKED / blank employers, sports orgs,
 *       GAME/CIVIC/MEDIA rows, Tier 1–2, SPORTS_OVERRIDE, non-Active, blank
 *       Growth_Rate.
 *   maybeTransition_ / careerMoveText_ / resolveNewBizId_ — gone.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { passed++; console.log('ok ' + label); } else { failed++; console.log('FAIL ' + label + ': ' + (detail || 'condition false')); } }

const intents = [];
const sandbox = {
  Logger: { log: () => {} }, Math, JSON, Object, Array, String, Number, Date, isNaN, isFinite, parseInt, parseFloat, console, RegExp,
  safeRand_: ctx => (ctx && typeof ctx.rng === 'function') ? ctx.rng : (() => 0.6),
  inWorldStamp_: () => 'Y3C1',
  queueAppendIntent_: (ctx, tab, row) => intents.push({ tab, row }),
};
vm.createContext(sandbox);
for (const rel of [
  ['phase05-citizens', 'educationCareerEngine.js'],
  ['phase05-citizens', 'runCareerEngine.js'],
]) { const p = path.join(__dirname, '..', ...rel); vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p }); }
const { applyEmployerSuccess_ } = sandbox;
assert('applyEmployerSuccess_ loaded (file scope)', typeof applyEmployerSuccess_ === 'function');
const src = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'runCareerEngine.js'), 'utf8');
assert('maybeTransition_ gone', !/function maybeTransition_/.test(src));
assert('careerMoveText_ gone', !/function careerMoveText_/.test(src));
assert('resolveNewBizId_ gone', !/function resolveNewBizId_/.test(src));
assert('no sector_shift / lateral handlers', !/tEv\.type === "sector_shift"/.test(src) && !/tEv\.type === "lateral"/.test(src));
assert('hiring window is dial-steered', /\/ 52 \* gapFactor/.test(src));
// E3 (S401, builder points 5/14): hiring reaches only the jobless, in their own field
assert('matcher candidates = blank employer only (UNTRACKED keep their job)', /var uEmp = safeStr\(uRow\[iEmployerBizId\]\)\.trim\(\);\n\s*if \(uEmp !== ''\) continue;/.test(src) && !/uEmp !== 'UNTRACKED'/.test(src));
assert('cross-field fallback deleted', !/anyField/.test(src) && !/one career-changer at most/.test(src));
// Doctrine point 21: the lottery of chance is rare — ≈1 employer event per ten cycles city-wide
assert('RARE_EVENT_SCALE = 0.1 applied to both budgets', sandbox.RARE_EVENT_SCALE === 0.1 && /promoP = [^\n]*RARE_EVENT_SCALE\)/.test(src) && /layoffP = [^\n]*RARE_EVENT_SCALE\)/.test(src));
assert('reconciliation rate-limited', /Math\.min\(shortfall, 2\)/.test(src));

// ── fixtures ────────────────────────────────────────────────────────────────
const H = ['POPID', 'First', 'Last', 'Neighborhood', 'RoleType', 'Status', 'Tier', 'BirthYear', 'CareerStage', 'YearsInCareer',
  'EducationLevel', 'LastPromotionCycle', 'LifeHistory', 'LastUpdated', 'ClockMode', 'EconomicProfileKey', 'Income', 'NetWorth', 'WealthLevel', 'EmployerBizId', 'SkillTags'];
const I = n => H.indexOf(n);
const CYCLE = 200;
function row(o) {
  const r = new Array(H.length).fill('');
  const d = { POPID: 'POP-X', First: 'A', Last: 'B', Neighborhood: 'Temescal', RoleType: 'Baker', Status: 'Active', Tier: 4, BirthYear: 2003,
    CareerStage: 'mid', YearsInCareer: 8, EducationLevel: 'hs-diploma', LastPromotionCycle: 0, LifeHistory: 'Y1C1 — born',
    ClockMode: 'ENGINE', EconomicProfileKey: 'Bakery Owner', Income: 60000, NetWorth: 10000, WealthLevel: 2, EmployerBizId: 'BIZ-1', SkillTags: '' };
  Object.assign(d, o);
  for (const k of H) r[I(k)] = d[k];
  return r;
}
function makeS() { return { careerSignals: { promotions: 0, layoffs: 0, transitions: 0, businessDeltas: {} }, eventsGenerated: 0 }; }
function ctxWith(rows, bl, rollSeq) {
  let i = 0;
  const seq = rollSeq || [0.6];
  return {
    ctx: { ledger: { headers: H.slice(), rows: rows.map(r => r.slice()), dirty: false }, summary: {}, config: { cycleCount: CYCLE }, now: 'C' + CYCLE,
      ss: { getSheetByName: n => n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => bl.map(r => r.slice()) }) } : null } },
    roll: () => seq[Math.min(i++, seq.length - 1)],
  };
}
const BLH = ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', 'Annual_Revenue', 'Growth_Rate'];
const bl = rows => [BLH].concat(rows);

// ── growing business promotes exactly one, the longest-unpromoted ──────────
{
  const rows = [
    row({ POPID: 'P1', LastPromotionCycle: 150, Income: 60000 }),
    row({ POPID: 'P2', LastPromotionCycle: 0, Income: 70000 }),   // never promoted → beneficiary
    row({ POPID: 'P3', LastPromotionCycle: 0, Income: 80000 }),   // never promoted, higher income → second
    row({ POPID: 'P4', LastPromotionCycle: 190, Income: 50000 }),
  ];
  // BIZ-1 growth 10%/yr, 4 staff → promoP = 10/5200 × 4 × 0.1 (rare) = 0.000769; draw 0.0005 hits; second roll 0.5 → ×1.09
  const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 480000, 10]]), [0.0005, 0.5]);
  const S = makeS(); const log = []; intents.length = 0;
  const out = applyEmployerSuccess_(ctx, CYCLE, roll, log, S, 1);
  const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
  assert('one promotion', out.promotions === 1 && out.layoffs === 0, JSON.stringify(out));
  assert('P2 (never promoted, lowest income of those) is the beneficiary', Number(g('P2')[I('Income')]) === Math.round(70000 * 1.09), g('P2')[I('Income')]);
  assert('P2 LastPromotionCycle = cycle', Number(g('P2')[I('LastPromotionCycle')]) === CYCLE);
  assert('P2 LifeHistory carries [Promotion]', /\[Promotion\] Promoted at Da Dough after 8 years as a Baker\./.test(g('P2')[I('LifeHistory')]), g('P2')[I('LifeHistory')]);
  assert('Promotion log intent queued', intents.length === 1 && intents[0].tab === 'LifeHistory_Log' && intents[0].row[3] === 'Promotion', JSON.stringify(intents));
  assert('others untouched', Number(g('P1')[I('Income')]) === 60000 && Number(g('P3')[I('Income')]) === 80000 && Number(g('P4')[I('Income')]) === 50000);
  assert('signals', S.careerSignals.promotions === 1 && S.careerSignals.transitions === 1 && S.eventsGenerated === 1);
  assert('ledger dirty', ctx.ledger.dirty === true);
}

// ── shrinking business lays off exactly one, the lowest level / income ─────
{
  const rows = [
    row({ POPID: 'P1', Income: 60000, LifeHistory: 'Y2C9 — [CareerState] industry=service|employer=small|level=3|tenure=4' }),
    row({ POPID: 'P2', Income: 45000, LifeHistory: 'Y2C9 — [CareerState] industry=service|employer=small|level=1|tenure=1' }), // lowest level → victim
    row({ POPID: 'P3', Income: 40000, LifeHistory: 'Y2C9 — [CareerState] industry=service|employer=small|level=2|tenure=2' }),
  ];
  // growth −20%/yr, 3 staff → layoffP = 20/5200 × 3 × 0.1 (rare) = 0.00115; draw 0.001 hits; cut roll 0.5 → ×0.84
  const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 480000, -20]]), [0.001, 0.5]);
  const S = makeS(); const log = []; intents.length = 0;
  const out = applyEmployerSuccess_(ctx, CYCLE, roll, log, S, 1);
  const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
  assert('one layoff', out.layoffs === 1 && out.promotions === 0, JSON.stringify(out));
  assert('P2 (level 1) is the victim: income ×0.84, employer cleared', Number(g('P2')[I('Income')]) === Math.round(45000 * 0.84) && g('P2')[I('EmployerBizId')] === '', g('P2')[I('Income')] + '/' + g('P2')[I('EmployerBizId')]);
  assert('Career-Layoff log row', log.length === 1 && log[0][3] === 'Career-Layoff' && /Da Dough/.test(log[0][4]), JSON.stringify(log));
  assert('businessDelta lost', S.careerSignals.businessDeltas['BIZ-1'].lost === 1 && S.careerSignals.layoffs === 1);
  assert('others keep employer + income', g('P1')[I('EmployerBizId')] === 'BIZ-1' && Number(g('P1')[I('Income')]) === 60000 && g('P3')[I('EmployerBizId')] === 'BIZ-1');
  assert('no promotion intent', intents.length === 0);
}

// ── a missed draw moves nobody; zero / blank growth moves nobody ───────────
{
  const rows = [row({ POPID: 'P1' }), row({ POPID: 'P2', EmployerBizId: 'BIZ-2' }), row({ POPID: 'P3', EmployerBizId: 'BIZ-3' })];
  const { ctx, roll } = ctxWith(rows, bl([
    ['BIZ-1', 'Grower', 'Retail', 'Temescal', 6, 40000, 0, 10],
    ['BIZ-2', 'Flat', 'Retail', 'Temescal', 6, 40000, 0, 0],
    ['BIZ-3', 'Blank', 'Retail', 'Temescal', 6, 40000, 0, ''],
  ]), [0.9]);
  const S = makeS(); const log = [];
  const out = applyEmployerSuccess_(ctx, CYCLE, roll, log, S, 1);
  assert('missed draw / zero / blank growth → nothing', out.promotions === 0 && out.layoffs === 0 && log.length === 0, JSON.stringify(out));
  assert('ledger not dirty', ctx.ledger.dirty === false);
  assert('businesses counted only where growth is a number', out.businesses === 2, out.businesses);
}

// ── scope: who is outside ──────────────────────────────────────────────────
{
  const rows = [
    row({ POPID: 'S1', EmployerBizId: 'SELF_EMPLOYED' }),
    row({ POPID: 'S2', EmployerBizId: 'UNTRACKED' }),
    row({ POPID: 'S3', EmployerBizId: '' }),
    row({ POPID: 'S4', EmployerBizId: 'BIZ-SPORT' }),
    row({ POPID: 'S5', ClockMode: 'GAME' }),
    row({ POPID: 'S6', ClockMode: 'CIVIC' }),
    row({ POPID: 'S7', Tier: 2 }),
    row({ POPID: 'S8', EconomicProfileKey: 'SPORTS_OVERRIDE' }),
    row({ POPID: 'S9', Status: 'Retired' }),
    row({ POPID: 'S10', Income: 0 }),
  ];
  // every business "hits" at draw 0 — nobody eligible, nothing moves
  const { ctx, roll } = ctxWith(rows, bl([
    ['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 0, 50],
    ['BIZ-SPORT', 'Oakland Athletics', 'Sports Franchise', 'Downtown', 60, 3300000, 0, 50],
  ]), [0]);
  const S = makeS(); const log = []; intents.length = 0;
  const out = applyEmployerSuccess_(ctx, CYCLE, roll, log, S, 1);
  assert('nobody outside the scope is touched', out.promotions === 0 && out.layoffs === 0 && intents.length === 0 && log.length === 0, JSON.stringify(out));
  assert('rows unchanged', ctx.ledger.rows.every(r => Number(r[I('Income')]) === (r[I('POPID')] === 'S10' ? 0 : 60000)));
}

// ── engine.144: the credential is ONE cause among others (never a gate) ────
{
  const CR = sandbox.credentialRank_;
  assert('1.0 credentialRank_ ordinal over the live vocab',
    CR('') === 0 && CR('hs-dropout') === 0 && CR('High School') === 0 && CR('hs-diploma') === 1 && CR('trade-cert') === 2 &&
    CR('some-college') === 2 && CR('associates') === 3 && CR('bachelors') === 4 && CR('bachelor') === 4 && CR('masters') === 5 &&
    CR('graduate') === 5 && CR('doctorate') === 6);
  assert('1.0b eduRank_ untouched (0-2)', sandbox.eduRank_('bachelors') === 1 && sandbox.eduRank_('doctorate') === 2 && sandbox.eduRank_('associates') === 0);

  // 1a equal waiting → the higher credential is promoted, and the line says so
  {
    const rows = [
      row({ POPID: 'P1', LastPromotionCycle: 0, Income: 70000, EducationLevel: 'hs-diploma' }),
      row({ POPID: 'P2', LastPromotionCycle: 0, Income: 80000, EducationLevel: 'bachelors' }), // richer, but the degree breaks the tie
    ];
    const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 480000, 10]]), [0.0001, 0.5]);
    const S = makeS(); intents.length = 0;
    const out = applyEmployerSuccess_(ctx, CYCLE, roll, [], S, 1);
    const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
    assert('1a equal waiting: the bachelors is promoted over the poorer hs-diploma', out.promotions === 1 && Number(g('P2')[I('LastPromotionCycle')]) === CYCLE && Number(g('P1')[I('Income')]) === 70000);
    assert('1a the line names the cause', /\[Promotion\] Promoted at Da Dough \(the bachelors counted\) after 8 years as a Baker\./.test(g('P2')[I('LifeHistory')]), g('P2')[I('LifeHistory')]);
  }
  // 1b longer waiting still beats a better credential; no cause suffix
  {
    const rows = [
      row({ POPID: 'P1', LastPromotionCycle: 0, Income: 70000, EducationLevel: 'hs-diploma' }),
      row({ POPID: 'P2', LastPromotionCycle: 150, Income: 60000, EducationLevel: 'doctorate' }),
    ];
    const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 480000, 10]]), [0.0001, 0.5]);
    const out = applyEmployerSuccess_(ctx, CYCLE, roll, [], makeS(), 1);
    const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
    assert('1b longest-waiting still wins over the doctorate', out.promotions === 1 && Number(g('P1')[I('LastPromotionCycle')]) === CYCLE);
    assert('1b no cause suffix when the credential did not decide', /Promoted at Da Dough after 8 years/.test(g('P1')[I('LifeHistory')]) && !/counted/.test(g('P1')[I('LifeHistory')]));
  }
  // 1c an all-hs-diploma staff still promotes — no gate
  {
    const rows = [row({ POPID: 'P1', Income: 70000 }), row({ POPID: 'P2', Income: 60000 })];
    const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 480000, 10]]), [0.0001, 0.5]);
    const out = applyEmployerSuccess_(ctx, CYCLE, roll, [], makeS(), 1);
    const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
    assert('1c no gate: uncredentialed staff still promotes (poorer P2)', out.promotions === 1 && Number(g('P2')[I('LastPromotionCycle')]) === CYCLE && !/counted/.test(g('P2')[I('LifeHistory')]));
  }
  // 2 E3 slot order on pool entries
  {
    const O = sandbox.hireSlotOrder_;
    const e = (pop, income, edu) => ({ pop, income, edu });
    assert('2a same $10k band → the higher credential takes the slot', [e('B', 65000, 4), e('A', 60000, 1)].sort(O)[0].pop === 'B');
    assert('2b poorer band still wins across bands', [e('B', 65000, 4), e('A', 45000, 1)].sort(O)[0].pop === 'A');
    assert('2c uncredentialed pool still fills, poorest first', [e('B', 62000, 0), e('A', 60000, 0)].sort(O)[0].pop === 'A');
    assert('2d matcher wires the order + the cause line', /sameField\.sort\(function \(a, b4\) \{ return hireSlotOrder_\(pool\[a\], pool\[b4\]\); \}\);/.test(src) && /' \(the ' \+ pool\[hIdx\]\.eduLabel \+ ' counted\)'/.test(src));
  }
}

// ── gapFactor steers: below the attractor promotions are likelier, layoffs rarer ──
{
  const mk = gf => { const { ctx, roll } = ctxWith([row({ POPID: 'P1' })], bl([['BIZ-1', 'X', 'Retail', 'Temescal', 6, 40000, 0, 10]]), [0.00025, 0.5]); return applyEmployerSuccess_(ctx, CYCLE, roll, [], makeS(), gf); };
  // promoP = 10/5200 × 1 × 0.1 = 0.000192; ×1.5 = 0.000288 (hit at 0.00025); ×1.0 misses
  assert('gapFactor 1.5 turns a near-miss into a promotion', mk(1.5).promotions === 1 && mk(1.0).promotions === 0);
  const mkL = gf => { const { ctx, roll } = ctxWith([row({ POPID: 'P1' })], bl([['BIZ-1', 'X', 'Retail', 'Temescal', 6, 40000, 0, -10]]), [0.00015, 0.5]); return applyEmployerSuccess_(ctx, CYCLE, roll, [], makeS(), gf); };
  // layoffP = 10/5200 × 1 × 0.1 = 0.000192; ÷1.5 = 0.000128 (miss at 0.00015); ÷1.0 hits
  assert('gapFactor 1.5 spares a layoff that 1.0 fires', mkL(1.5).layoffs === 0 && mkL(1.0).layoffs === 1);
}

// ── determinism: same ledger, same rng → same outcome ──────────────────────
{
  const rows = [row({ POPID: 'P1', LastPromotionCycle: 0 }), row({ POPID: 'P2', LastPromotionCycle: 0 })];
  const run = () => { const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'X', 'Retail', 'Temescal', 6, 40000, 0, 30]]), [0.0001, 0.25]); applyEmployerSuccess_(ctx, CYCLE, roll, [], makeS(), 1); return ctx.ledger.rows.map(r => r[I('POPID')] + ':' + r[I('Income')]).join(','); };
  assert('deterministic', run() === run());
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
