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
 *     — outside: SELF_EMPLOYED / UNTRACKED / blank employers,
 *       GAME/CIVIC/MEDIA rows, Tier 1–2, SPORTS_OVERRIDE, non-Active, blank
 *       Growth_Rate. A sports org's ENGINE staff are inside (engine.307); its
 *       athletes stay out by their own row (GAME clock / SPORTS_OVERRIDE).
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
// engine.145 (S411): both E3 tag∩category sites go through the alias-aware helper
assert('E3 same-field + isCross both use tagsInCategory_', (src.match(/tagsInCategory_\(pool\[/g) || []).length === 2 && !/\.tags\.indexOf\(cat\)/.test(src));
assert('tagsInCategory_ resolves aliases via the shared helper (loaded here with educationCareerEngine)', sandbox.tagsInCategory_(['Trades'], 'Construction & Baylight') === true && sandbox.tagsInCategory_(['Trades'], 'Trades') === false && sandbox.tagsInCategory_(['Healthcare'], 'Healthcare') === true);
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
    row({ POPID: 'S4', EmployerBizId: 'BIZ-SPORT', ClockMode: 'GAME' }),
    row({ POPID: 'S4b', EmployerBizId: 'BIZ-SPORT', EconomicProfileKey: 'SPORTS_OVERRIDE' }), // the live ENGINE|SPORTS_OVERRIDE edge
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

// ── engine.307: a sports org's staff are inside, its athletes are not ───────
{
  const rows = [
    row({ POPID: 'A1', EmployerBizId: 'BIZ-SPORT', ClockMode: 'GAME', LastPromotionCycle: 0 }),
    row({ POPID: 'A2', EmployerBizId: 'BIZ-SPORT', EconomicProfileKey: 'SPORTS_OVERRIDE', LastPromotionCycle: 0 }),
    row({ POPID: 'A3', EmployerBizId: 'BIZ-SPORT', Tier: 1, LastPromotionCycle: 0 }),
    row({ POPID: 'A4', EmployerBizId: 'BIZ-SPORT', RoleType: 'basketball player', SkillTags: 'athlete', Tier: 3, LastPromotionCycle: 0 }), // codex gate item 2: the live ENGINE-clock shape
    row({ POPID: 'A5', EmployerBizId: 'BIZ-SPORT', RoleType: 'Youth Basketball Coach', SkillTags: 'Education', LastPromotionCycle: 0 }),
    row({ POPID: 'T1', EmployerBizId: 'BIZ-SPORT', RoleType: 'Retail Clerk', EconomicProfileKey: 'Retail Clerk', LastPromotionCycle: 100 }),
  ];
  const BL = bl([['BIZ-SPORT', 'Oakland Athletics', 'Sports Franchise', 'Baylight District', 520, 3342924, 0, 50]]);
  const book = sandbox.careerEmployerBook_({ ledger: { headers: H.slice(), rows: rows.map(r => r.slice()) },
    ss: { getSheetByName: n => n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => BL.map(r => r.slice()) }) } : null } });
  const staff = book && book.biz['BIZ-SPORT'] ? book.biz['BIZ-SPORT'].staff.map(i => rows[i][I('POPID')]) : null;
  assert('engine.307 the sports org is in the employer book; only its ENGINE Tier 3–4 staff are on the list', JSON.stringify(staff) === '["T1"]', JSON.stringify(staff));
  const { ctx, roll } = ctxWith(rows, BL, [0, 0.5]);
  const S = makeS(); const log = []; intents.length = 0;
  const out = applyEmployerSuccess_(ctx, CYCLE, roll, log, S, 1);
  const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
  assert('engine.307 the team-store clerk can be promoted; the athletes never move', out.promotions === 1 && Number(g('T1')[I('Income')]) > 60000 &&
    ['A1', 'A2', 'A3', 'A4', 'A5'].every(p => Number(g(p)[I('Income')]) === 60000 && g(p)[I('EmployerBizId')] === 'BIZ-SPORT'), JSON.stringify(out));
  const B = sandbox.sportsHireBars_;
  assert('engine.307 sportsHireBars_: a player or coach row is barred at a sports org, by tag or by role',
    B('Sports Franchise', 'Waterfront Resident', ['athlete']) && B('Sports', 'basketball player', '') && B('As Stadium', 'Youth Basketball Coach', 'Education') && B('Sports Bar & Grill', 'Scout', '') &&
    B('Sports', 'General Manager, Oakland Oaks', '') && B('Sports Franchise', "Manager, Oakland A's", '') && !B('As Stadium', 'Stadium Operations Manager', ''));
  assert('engine.307 sportsHireBars_: staff pass, and nothing is barred outside sports', !B('Sports Franchise', 'Retail Clerk', 'Small Business') &&
    !B('Sports Analytics', 'Sports Analytics Engineer (Gridiron)', 'Tech & Innovation') && !B('Bakery', 'basketball player', ['athlete']) && !B('Sports', '', ''));
  assert('engine.307 the rehire matcher bars at all three candidate lists (same-field, willing, civic movers)',
    /if \(barred\(pool\[pi\]\.r, pool\[pi\]\.tags\)\) continue;/.test(src) && /if \(barred\(pool\[wi\]\.r, pool\[wi\]\.tags\)\) continue;/.test(src) &&
    /if \(barred\(civicMovers\[cm\]\.r, civicMovers\[cm\]\.tags\)\) continue;/.test(src));
}

// ── engine.144: the credential is ONE cause among others (never a gate) ────
{
  const CR = sandbox.credentialRank_;
  assert('1.0 credentialRank_ ordinal over the live vocab',
    CR('') === 0 && CR('hs-dropout') === 0 && CR('High School') === 0 && CR('hs-diploma') === 1 && CR('trade-cert') === 3 /* engine.149: peer of associates (builder ruling S412) */ &&
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

// ── engine.151 (S413): Tier pays on the promotion wait and the hire band ────
{
  // without the helper in scope (processAdvancementIntake.js not loaded here) every door reads ×1 — the suites above ran that way
  assert('3.0 no helper → ×1 (the fallback the suites above ran under)', sandbox.tierPayOf_(row({ Tier: 1 }), I('Tier')) === 1 && sandbox.hireIncomeBand_(50000, 1) === 5);
  sandbox.tierPayFactor_ = t => ({ 1: 1.5, 2: 1.3, 3: 1.15, 4: 1 })[Math.round(Number(t)) || 4] || 1; // the live table (tierLadderState.test.js proves it)
  assert('3.0b helper in scope → the rung pays', sandbox.tierPayOf_(row({ Tier: 3 }), I('Tier')) === 1.15 && sandbox.tierPayOf_(row({ Tier: '' }), I('Tier')) === 1);
  // 3a a Tier 3 who waited 40 cycles outranks a Tier 4 who waited 45 (46 vs 45), and the line says so
  {
    const rows = [
      row({ POPID: 'P4', Tier: 4, LastPromotionCycle: 155, Income: 60000 }),
      row({ POPID: 'P3', Tier: 3, LastPromotionCycle: 160, Income: 70000 }),
    ];
    const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 480000, 10]]), [0.0001, 0.5]);
    const out = applyEmployerSuccess_(ctx, CYCLE, roll, [], makeS(), 1);
    const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
    assert('3a Tier 3 (40 × 1.15 = 46) beats Tier 4 (45)', out.promotions === 1 && Number(g('P3')[I('LastPromotionCycle')]) === CYCLE && Number(g('P4')[I('Income')]) === 60000);
    assert('3a the line names the rung', /\[Promotion\] Promoted at Da Dough \(Tier 3 counted\) after 8 years/.test(g('P3')[I('LifeHistory')]), g('P3')[I('LifeHistory')]);
  }
  // 3b a much longer raw wait still beats the rung; no suffix
  {
    const rows = [
      row({ POPID: 'P4', Tier: 4, LastPromotionCycle: 140, Income: 60000 }),
      row({ POPID: 'P3', Tier: 3, LastPromotionCycle: 160, Income: 70000 }),
    ];
    const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 480000, 10]]), [0.0001, 0.5]);
    const out = applyEmployerSuccess_(ctx, CYCLE, roll, [], makeS(), 1);
    const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
    assert('3b Tier 4 at 60 waited beats Tier 3 at 46', out.promotions === 1 && Number(g('P4')[I('LastPromotionCycle')]) === CYCLE);
    assert('3b no suffix when the rung did not decide', !/counted/.test(g('P4')[I('LifeHistory')]), g('P4')[I('LifeHistory')]);
  }
  // 3c equal raw wait, the rung breaks the tie before the credential
  {
    const rows = [
      row({ POPID: 'P4', Tier: 4, LastPromotionCycle: 0, Income: 60000, EducationLevel: 'doctorate' }),
      row({ POPID: 'P3', Tier: 3, LastPromotionCycle: 0, Income: 70000, EducationLevel: 'hs-diploma' }),
    ];
    const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 480000, 10]]), [0.0001, 0.5]);
    applyEmployerSuccess_(ctx, CYCLE, roll, [], makeS(), 1);
    const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
    assert('3c never-promoted tie: Tier 3 hs-diploma over Tier 4 doctorate, rung named', Number(g('P3')[I('LastPromotionCycle')]) === CYCLE && /\(Tier 3 counted\)/.test(g('P3')[I('LifeHistory')]));
  }
  // 3d Tier 1–2 stay outside the employer loop (engine.135 rule) — the pay never reaches them here
  {
    const rows = [row({ POPID: 'P2', Tier: 2, LastPromotionCycle: 0 }), row({ POPID: 'P4', Tier: 4, LastPromotionCycle: 100 })];
    const { ctx, roll } = ctxWith(rows, bl([['BIZ-1', 'Da Dough', 'Bakery', 'Temescal', 6, 40000, 480000, 10]]), [0.0001, 0.5]);
    applyEmployerSuccess_(ctx, CYCLE, roll, [], makeS(), 1);
    const g = p => ctx.ledger.rows.find(r => r[I('POPID')] === p);
    assert('3d Tier 2 outside: the Tier 4 is promoted', Number(g('P4')[I('LastPromotionCycle')]) === CYCLE && Number(g('P2')[I('LastPromotionCycle')]) === 0);
  }
  // 3e E3 hire band on income ÷ pay
  {
    const O = sandbox.hireSlotOrder_;
    const e = (pop, income, edu, tier) => ({ pop, income, edu, tier });
    assert('3e band: 50k T1 → 3, 50k T3 → 4, 50k T4 → 5', sandbox.hireIncomeBand_(50000, 1) === 3 && sandbox.hireIncomeBand_(50000, 3) === 4 && sandbox.hireIncomeBand_(50000, 4) === 5);
    assert('3e a Tier 3 at 55k queues ahead of a Tier 4 at 50k', [e('T4', 50000, 0, 4), e('T3', 55000, 0, 3)].sort(O)[0].pop === 'T3');
    assert('3e need still leads: a Tier 4 at 30k beats a Tier 1 at 50k', [e('T1', 50000, 0, 1), e('T4', 30000, 0, 4)].sort(O)[0].pop === 'T4');
    assert('3e blank tier reads as 4', [e('B', 50000, 0, ''), e('A', 50000, 0, 4)].sort(O)[0].pop === 'A');
    assert('3e pool entries carry the rung + the hire line names it', /tier: Math\.round\(Number\(uRow\[iTier\]\)\) \|\| 4 \}\);/.test(src) && /' \(Tier ' \+ pool\[hIdx\]\.tier \+ ' counted\)'/.test(src));
  }
  delete sandbox.tierPayFactor_;
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

// engine.286 Task 2: the promotion die's keys with the gate shut — a zero gate draws no rng,
// so these fixtures' roll sequences reach the business budget exactly as before.
const LIFE_EVENT_OFF = { lifeEventFireChance: 0, lifeEventUpChance: 0.6, lifeEventPremiseLean: 0.2, lifeEventMediumOdds: 0.08,
  lifeEventLargeOdds: 0.01, lifeEventLiftCycles: 2, lifeEventPromotionLift: 1.5, lifeEventPromotionDrop: 0.5,
  lifeEventPromotionOwnChance: 0.05, lifeEventHomeRollBoost: 3, lifeEventHomeCarryBar: 0.5, homeLossChance: 0.00625 };

const DIE_WAKE = {};

// engine.201 W1a/W1b: full career producer -> stored LifeHistory -> Phase 9.
// All citizens/businesses below are explicitly synthetic and exist only in this VM.
{
  const errors = [], writes = [];
  const w = {
    console, Math, JSON, Object, Array, String, Number, Date, RegExp, isNaN, isFinite, parseInt, parseFloat,
    Logger: { log: message => { if (/failed|error/i.test(String(message))) errors.push(String(message)); } },
    safeRand_: ctx => ctx.rng,
    inWorldStamp_: ctx => 'C' + ctx.summary.absoluteCycle,
    queueAppendIntent_: (ctx, tab, row) => writes.push({ tab, row: row.slice() }),
    queueBatchAppendIntent_: (ctx, tab, rows) => rows.forEach(row => writes.push({ tab, row: row.slice() })),
    queueCellIntent_: () => {}, // capture boundary only; never open a Sheet
    ECONOMIC_PARAMETERS: JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'economic_parameters.json'), 'utf8')) // engine.199: live reads the Economic_Parameters tab
  };
  vm.createContext(w);
  for (const rel of [
    'utilities/citizenMemory.js', 'utilities/citizenDialMap.js', 'utilities/compressLifeHistory.js',
    'utilities/citizenDerivation.js', 'phase01-config/advanceSimulationCalendar.js',
    'phase05-citizens/educationCareerEngine.js', 'phase05-citizens/maneuverEngine.js',
    'utilities/cycleModes.js', 'phase05-citizens/judicialLifecycle.js', // engine.254 Task 6b: the custody dismissal pass
    'phase05-citizens/runCivicRoleEngine.js', // engine.286 Task 2: the promotion die's shared roll
    'phase05-citizens/runCareerEngine.js'
  ]) {
    const filename = path.join(__dirname, '..', rel);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), w, { filename });
  }
  const headers = H.concat(['TraitProfile', 'DialState']);
  const ix = name => headers.indexOf(name);
  const careerState = 'C199 — [CareerState] industry=service|employer=small|level=1|tenure=4|skill=general:0.2';
  function fixture(overrides) {
    const c = w.newCitizen_(); c.folded = 199;
    const r = row(Object.assign({ POPID: 'SYNTHETIC-W1-CAREER', First: 'Synthetic', Last: 'Fixture',
      EmployerBizId: 'BIZ-SYNTHETIC-W1', LifeHistory: careerState }, overrides));
    return r.concat(['Updated:c199', w.serializeDialState_(c)]);
  }
  function run(r, growth, stated, sequence, maneuver, cfgOver, bizOver) {
    errors.length = 0; writes.length = 0;
    let draw = 0;
    const business = [BLH.slice(), (bizOver || ['BIZ-SYNTHETIC-W1', 'Synthetic W1 Business', 'Bakery', 'Temescal']).concat([stated, 50000, 100000, growth])];
    const ctx = { mode: {}, config: Object.assign({ cycleCount: 200, judicialDismissAfterCycles: 3 }, LIFE_EVENT_OFF, cfgOver || {}), now: 'C200',
      cache: { getData: tab => tab === 'Judicial_Ledger' ? { exists: true, values: [w.JUDICIAL_CASE_FIELDS_.slice()] } : { exists: false, values: [] } },
      summary: { absoluteCycle: 200, maneuver: { byPop: maneuver || {} } },
      rng: () => draw < sequence.length ? sequence[draw++] : 0.999,
      ledger: { headers, rows: [r], dirty: false },
      ss: { getSheetByName: tab => tab === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => business.map(row => row.slice()) }) } : null }
    };
    w.runCareerEngine_(ctx);
    if (errors.length) throw new Error('W1 career fixture failed inside real engine: ' + errors.join('; '));
    return { ctx, logs: writes.filter(x => x.tab === 'LifeHistory_Log').map(x => x.row) };
  }
  function proveFold(label, result, tag, effects, branchReady) {
    const { ctx, logs } = result;
    const r = ctx.ledger.rows[0];
    const log = logs.filter(x => x[1] === r[0] && x[3] === tag);
    if (!branchReady(ctx) || log.length !== 1) {
      throw new Error('W1 fixture did not reach ' + label + ': ' + JSON.stringify({ signals: ctx.summary.careerSignals, logs }));
    }
    const lines = w.parseLifeHistoryEntries_(r[ix('LifeHistory')]).entries.filter(e => e.tag === tag && e.cycle === 200);
    w.compressLifeHistory_(ctx);
    const once = JSON.parse(r[ix('DialState')]);
    // The next normal compress settles mood. Compare with that decay, not byte
    // identity: a settledThrough/idempotent same-Cycle envelope is deferred.
    const expectedNext = w.deserialize_(once); w.settleCycle_(expectedNext);
    ctx.summary = { absoluteCycle: 201 }; ctx.config.cycleCount = 201;
    w.compressLifeHistory_(ctx);
    const twice = JSON.parse(r[ix('DialState')]);
    const deltasMatch = w.DIALS.every(d => Math.abs(once.mood[d] - (effects[d] || 0)) < 1e-9 && once.base[d] === 50);
    const noReplay = w.DIALS.every(d => twice.base[d] === once.base[d] && Math.abs(twice.mood[d] - expectedNext.mood[d]) < 1e-9);
    assert(label, lines.length === 1 && deltasMatch && noReplay && once.folded === 200 && twice.folded === 200,
      JSON.stringify({ stampedCellLines: lines.length, logRows: log.length, firstMood: once.mood, secondMood: twice.mood, folded: [once.folded, twice.folded] }));
  }
  // Two ordinary texture draws (XP, chance) miss; employer contraction draw hits.
  proveFold('W1a employer-success layoff reaches the cell and folds once',
    run(fixture({ SkillTags: '' }), -20, 1, [0.999, 0.999, 0, 0.5]),
    'Career-Layoff', { drive: -2, composure: -5 },
    ctx => ctx.summary.careerSignals.employerSuccess.layoffs === 1 && ctx.summary.careerSignals.headcountWriteBack.fired === 0);
  proveFold('W1a headcount-reconciliation layoff reaches the cell and folds once',
    run(fixture({ SkillTags: '' }), 0, 0, [0.999, 0.999, 0.999, 0.5]),
    'Career-Layoff', { drive: -2, composure: -5 },
    ctx => ctx.summary.careerSignals.employerSuccess.layoffs === 0 && ctx.summary.careerSignals.headcountWriteBack.fired === 1);
  proveFold('W1a same-field hire reaches the cell and folds once with drive4 composure2',
    run(fixture({ EmployerBizId: '', SkillTags: 'Food & Culture', RoleType: 'Baker' }), 100, 52, [0.999, 0.999, 0.5]),
    'Career-Hired', { drive: 4, composure: 2 },
    ctx => ctx.summary.careerSignals.rehires.hired === 1 && ctx.summary.careerSignals.rehires.crossField === 0);
  proveFold('W1a willing field change reaches the cell and folds once with drive3 openness3',
    run(fixture({ EmployerBizId: '', SkillTags: 'Healthcare', RoleType: 'Nurse' }), 100, 52, [0.999, 0.999, 0.5],
      { 'SYNTHETIC-W1-CAREER': { posture: 'climb', openness: 80 } }),
    'Career-FieldChange', { drive: 3, openness: 3 },
    ctx => ctx.summary.careerSignals.rehires.hired === 1 && ctx.summary.careerSignals.rehires.crossField === 1);

  // engine.290 move 7 — a field-change hire into BART takes the train job, not the bus job.
  {
    const bart = run(fixture({ EmployerBizId: '', SkillTags: 'Healthcare', RoleType: 'Nurse' }), 100, 52, [0.999, 0.999, 0.5],
      { 'SYNTHETIC-W1-CAREER': { posture: 'climb', openness: 80 } }, null, ['BIZ-00014', 'BART Oakland Division', 'Public Transit', 'Downtown']);
    const r0 = bart.ctx.ledger.rows[0];
    const role = r0[ix('RoleType')];
    assert('engine.290 a solid-band field change into BIZ-00014 is hired as a Train Operator, not a Transit Operator Trainee',
      r0[ix('EmployerBizId')] === 'BIZ-00014' && role === 'Train Operator',
      JSON.stringify({ role, emp: r0[ix('EmployerBizId')] }));
  }

  // engine.286 Task 2 — the promotion die through the real career engine (synthetic rows).
  // Sequence: two texture draws miss, then the die (fire, sign, band, text, the writer's income
  // roll), then the business budget's draw. LIFE_ON is the ruled seeds.
  const LIFE_ON = { lifeEventFireChance: 0.05 };
  const dieLayoff = run(fixture({ SkillTags: '' }), 0, 1, [0.999, 0.999, 0, 0.99, 0, 0, 0.5], null, LIFE_ON);
  proveFold('engine.286 die L down = the layoff through careerApplyLayoff_, one line, folds once',
    dieLayoff,
    'Career-Layoff', { drive: -2, composure: -5 },
    ctx => ctx.summary.lifeEventDice.promotion.laidOff === 1 && ctx.ledger.rows[0][ix('EmployerBizId')] === '' &&
      /\[Career-Layoff\] Let go from Synthetic W1 Business$/m.test(ctx.ledger.rows[0][ix('LifeHistory')]) &&
      ctx.summary.jobLosses['SYNTHETIC-W1-CAREER'] === 200);
  proveFold('engine.286 die L up = the promotion through careerApplyPromotion_, one line, folds once',
    run(fixture({ SkillTags: '' }), 0, 1, [0.999, 0.999, 0, 0, 0, 0, 0.5], null, LIFE_ON),
    'Promotion', { drive: 8, composure: 2 },
    ctx => ctx.summary.lifeEventDice.promotion.promoted === 1 && ctx.ledger.rows[0][ix('LastPromotionCycle')] === 200 &&
      /\[Promotion\] Promoted at Synthetic W1 Business after 8 years as a Baker\.$/m.test(ctx.ledger.rows[0][ix('LifeHistory')]));
  DIE_WAKE.row = dieLayoff.ctx.ledger.rows[0].slice(); DIE_WAKE.headers = headers.slice(); // the wake chain below reads this row
  {
    const m = run(fixture({ SkillTags: '' }), 0, 1, [0.999, 0.999, 0, 0, 0.05, 0], null, LIFE_ON);
    const ds = JSON.parse(m.ctx.ledger.rows[0][ix('DialState')]);
    assert('engine.286 die M up: the line, the held mark, this Cycle\'s order lift',
      /\[LifeEvent-Promotion-Up-M\]/.test(m.ctx.ledger.rows[0][ix('LifeHistory')]) && ds.lifeEvent && ds.lifeEvent.k === 'promotion' &&
      ds.lifeEvent.d === 1 && ds.lifeEvent.c === 200 && m.ctx.summary.lifeEventLift['SYNTHETIC-W1-CAREER'] === 1.5, JSON.stringify(ds.lifeEvent));
    // the mark survives the Phase-9 fold, and next Cycle the own shot lands through the writer
    w.compressLifeHistory_(m.ctx);
    const kept = JSON.parse(m.ctx.ledger.rows[0][ix('DialState')]);
    assert('engine.286 die M mark survives the dial fold', kept.lifeEvent && kept.lifeEvent.c === 200, JSON.stringify(kept));
    let d2 = 0; const seq2 = [0.999, 0.999, 0.0, 0.5];
    m.ctx.rng = () => d2 < seq2.length ? seq2[d2++] : 0.999;
    m.ctx.summary = { absoluteCycle: 201, maneuver: { byPop: {} } }; m.ctx.config.cycleCount = 201;
    w.runCareerEngine_(m.ctx);
    const r2 = m.ctx.ledger.rows[0];
    assert('engine.286 die M up: next Cycle the own shot lands — promoted through the writer, mark cleared',
      m.ctx.summary.lifeEventDice.promotion.ownRaises === 1 && r2[ix('LastPromotionCycle')] === 201 &&
      /\[Promotion\] Promoted at Synthetic W1 Business \(the break paid off\)/.test(r2[ix('LifeHistory')]) &&
      !JSON.parse(r2[ix('DialState')]).lifeEvent, JSON.stringify(m.ctx.summary.lifeEventDice.promotion));
  }
  {
    // Acceptance 1: identical forced rolls, the rung decides the band — Tier 4 medium, Tier 3 large
    const t4 = run(fixture({ SkillTags: '', Tier: 4 }), 0, 1, [0.999, 0.999, 0, 0, 0.011, 0, 0.5], null, LIFE_ON);
    const t3 = run(fixture({ SkillTags: '', Tier: 3 }), 0, 1, [0.999, 0.999, 0, 0, 0.011, 0, 0.5], null, LIFE_ON);
    assert('engine.286 paired: same rolls, Tier 4 draws a medium break, Tier 3 the promotion itself',
      t4.ctx.summary.lifeEventDice.promotion.M === 1 && t4.ctx.summary.lifeEventDice.promotion.promoted === 0 &&
      t3.ctx.summary.lifeEventDice.promotion.promoted === 1, JSON.stringify([t4.ctx.summary.lifeEventDice.promotion, t3.ctx.summary.lifeEventDice.promotion]));
    const t1 = run(fixture({ SkillTags: '', Tier: 1 }), 0, 1, [0.999, 0.999, 0, 0, 0, 0, 0.5], null, LIFE_ON);
    assert('engine.286 boundary: a Tier-1 citizen is outside the die (the writer\'s boundary)',
      t1.ctx.summary.lifeEventDice.promotion.eligible === 0 && t1.ctx.summary.lifeEventDice.promotion.fired === 0);
  }

  {
    // codex F2: a medium draw on a row with no usable DialState cannot hold two Cycles — it draws S
    for (const [label, ds] of [['blank', ''], ['invalid JSON', '{not json'], ['an array', '[]']]) {
      const r = fixture({ SkillTags: '' }); r[ix('DialState')] = ds;
      const m = run(r, 0, 1, [0.999, 0.999, 0, 0, 0.05, 0], null, LIFE_ON);
      const p = m.ctx.summary.lifeEventDice.promotion;
      assert('engine.286 F2 M on ' + label + ' DialState is demoted to S: S line, no lift, no mark',
        p.demoted === 1 && p.S === 1 && p.M === 0 && /\[LifeEvent-Promotion-Up-S\]/.test(m.ctx.ledger.rows[0][ix('LifeHistory')]) &&
        !m.ctx.summary.lifeEventLift['SYNTHETIC-W1-CAREER'], JSON.stringify(p));
    }
    // codex F7: malformed marks expire visibly; valid future / expired marks clear; a zero drop is refused
    const withMark = mk => { const r = fixture({ SkillTags: '' }); const d = JSON.parse(r[ix('DialState')]); d.lifeEvent = mk; r[ix('DialState')] = JSON.stringify(d); return r; };
    const bad = run(withMark({ k: 'promotion', d: 1, c: 'bad' }), 0, 1, [0.999, 0.999, 0.999], null, LIFE_ON);
    const badP = bad.ctx.summary.lifeEventDice.promotion;
    assert('engine.286 F7 a malformed mark is cleared and counted, never held',
      badP.invalid === 1 && badP.held === 0 && !JSON.parse(bad.ctx.ledger.rows[0][ix('DialState')]).lifeEvent && !bad.ctx.summary.lifeEventLift['SYNTHETIC-W1-CAREER'], JSON.stringify(badP));
    const future = run(withMark({ k: 'promotion', d: 1, c: 205 }), 0, 1, [0.999, 0.999, 0.999], null, LIFE_ON);
    const old = run(withMark({ k: 'promotion', d: -1, c: 198 }), 0, 1, [0.999, 0.999, 0.999], null, LIFE_ON);
    const live = run(withMark({ k: 'promotion', d: -1, c: 199 }), 0, 1, [0.999, 0.999, 0.999, 0.999], null, LIFE_ON);
    assert('engine.286 F7 a future and an expired mark clear; a mark inside the window holds the drop',
      future.ctx.summary.lifeEventDice.promotion.unmarked === 1 && old.ctx.summary.lifeEventDice.promotion.unmarked === 1 &&
      live.ctx.summary.lifeEventDice.promotion.held === 1 && live.ctx.summary.lifeEventLift['SYNTHETIC-W1-CAREER'] === 0.5);
    let zeroDropThrew = false;
    try { w.lifeEventConfig_({ config: Object.assign({}, LIFE_EVENT_OFF, { lifeEventPromotionDrop: 0 }) }); } catch (e) { zeroDropThrew = /lifeEventPromotionDrop/.test(e.message); }
    assert('engine.286 F7 a zero promotion drop is refused by the config contract (it would read as no drop)', zeroDropThrew);
    // codex hunt 1: the die's L promotion and the business budget never both land on one citizen in one Cycle
    const both = run(fixture({ SkillTags: '' }), 400, 1, [0.999, 0.999, 0, 0, 0, 0, 0.5, 0], null, LIFE_ON);
    assert('engine.286 one writer event per citizen per Cycle: the budget skips a citizen the die just promoted',
      both.ctx.summary.lifeEventDice.promotion.promoted === 1 && both.ctx.summary.careerSignals.employerSuccess.promotions === 0 &&
      (both.ctx.ledger.rows[0][ix('LifeHistory')].match(/\[Promotion\]/g) || []).length === 1, JSON.stringify(both.ctx.summary.careerSignals.employerSuccess));
  }

  const latestLayoff = careerState + '\nC199 — [Career-Layoff] Synthetic prior job loss';
  const laidOff = run(fixture({ EmployerBizId: '', SkillTags: 'Food & Culture', Income: 40000, LifeHistory: latestLayoff }), 0, 1, [0.999, 0.999]);
  const selfEmployed = run(fixture({ EmployerBizId: '', SkillTags: 'Food & Culture', Income: 60000 }), 0, 1, [0.999, 0.999]);
  const rehired = run(fixture({ EmployerBizId: '', SkillTags: 'Food & Culture', Income: 60000,
    LifeHistory: latestLayoff + '\nC199 — [Career-Hired] Synthetic subsequent independent work' }), 0, 1, [0.999, 0.999]);
  const pressureCount = result => result.ctx.summary.careerSignals.rehires.pressureTagged;
  const pressureLine = result => /C200 — \[Stumble\]/.test(result.ctx.ledger.rows[0][ix('LifeHistory')]);
  assert('W1b positive-income latest-layoff gets unemployed pressure; independent earner and later hire do not',
    pressureCount(laidOff) === 1 && pressureLine(laidOff) &&
    pressureCount(selfEmployed) === 0 && !pressureLine(selfEmployed) && pressureCount(rehired) === 0 && !pressureLine(rehired),
    JSON.stringify({ laidOff: pressureCount(laidOff), independent: pressureCount(selfEmployed), laterHire: pressureCount(rehired) }));

  // engine.201 W2 regression: reuse the full W1 career VM, never call the new helper directly.
  for (const site of ['employer-success', 'headcount-reconciliation']) {
    function w2Layoff(tag, age) {
      const life = `C${200 - age} — [${tag}] Synthetic earlier move\n` + careerState;
      const result = run(fixture({ SkillTags: '', LifeHistory: life }),
        site === 'employer-success' ? -20 : 0, site === 'employer-success' ? 1 : 0,
        site === 'employer-success' ? [0.999, 0.999, 0, 0.5] : [0.999, 0.999, 0.999, 0.5]);
      if (result.logs.filter(x => x[3] === 'Career-Layoff').length !== 1) throw new Error('W2 layoff fixture missed ' + site);
      return w.parseLifeHistoryEntries_(result.ctx.ledger.rows[0][ix('LifeHistory')]).entries
        .filter(e => e.tag === 'RoutineRetrenched' && e.cycle === 200).length;
    }
    const recent = w2Layoff('Career-FieldChange', 1), edge = w2Layoff('Career-FieldChange', 13);
    const expired = w2Layoff('Career-FieldChange', 14), hire = w2Layoff('Career-Hired', 1);
    assert(`W2 ${site} layoff retrenches a field change through Cycle 13, excluding old changes and hires`,
      recent === 1 && edge === 1 && expired === 0 && hire === 0, JSON.stringify({ recent, edge, expired, hire }));
  }
}

// engine.286 Task 2 — SCOPE (codex F8): salience, not admission. The die's real layoff line, in a
// citizen whose base dials this fixture sets to an already-shaped profile, stays in the real
// buildPool's five-line tail after five routine lines (Career-Layoff is salient); the same life
// with the event-produced (unshaped) dials stays outside. This does NOT prove event -> fold ->
// admission, reflection or the drain — that is the bench's Acceptance 3 read. Synthetic rows only.
(async () => {
  const Module = require('module');
  const stub = (rel, exp) => { const f = require.resolve(path.join(__dirname, '..', rel)); require.cache[f] = new Module(f); require.cache[f].exports = exp; require.cache[f].loaded = true; };
  const r = DIE_WAKE.row, h = DIE_WAKE.headers, at = n => h.indexOf(n);
  const routine = [1, 2, 3, 4, 5].map(k => 'C' + (200 + k) + ' — [Daily] Synthetic routine day ' + k).join('\n');
  const life = String(r[at('LifeHistory')]) + '\n' + routine;
  const shaped = JSON.parse(r[at('DialState')]); shaped.base.drive = 85; shaped.base.warmth = 80; shaped.base.composure = 25;
  const flat = JSON.parse(r[at('DialState')]);
  const ledger = [['POPID', 'First', 'Last', 'Neighborhood', 'RoleType', 'DialState', 'BirthYear', 'LifeHistory'],
    ['SYNTHETIC-W1-CAREER', 'Synthetic', 'Fixture', 'Temescal', 'Baker', JSON.stringify(shaped), 2003, life],
    ['SYNTHETIC-OUTSIDE', 'Synthetic', 'Outside', 'Temescal', 'Baker', JSON.stringify(flat), 2003, life]];
  stub('lib/env.js', {});
  stub('lib/sheets.js', { getRawSheetData: async tab => tab === 'Simulation_Ledger' ? ledger.map(x => x.slice()) : [], getSheetAsObjects: async () => [] });
  const wp = require(path.join(__dirname, '..', 'lib', 'wakePerception.js'));
  const pool = await wp.buildPool();
  const me = pool.find(p => p.popId === 'SYNTHETIC-W1-CAREER');
  assert('engine.286 wake (salience scope): a shaped citizen with the die\'s layoff is in the pool', !!me, JSON.stringify(pool.map(p => p.popId)));
  assert('engine.286 wake: the layoff survives five routine lines in the five-line tail',
    !!me && /\[Career-Layoff\] Let go from Synthetic W1 Business/.test(me.life) && me.life.split('\n').length === 5, me && me.life);
  assert('engine.286 wake (salience scope): the same life with the event-produced unshaped dials is outside the pool',
    !pool.find(p => p.popId === 'SYNTHETIC-OUTSIDE'));
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
