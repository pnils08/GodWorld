#!/usr/bin/env node
'use strict';
/**
 * Run: node scripts/hoodIncome.test.js
 *
 * engine.135 — Employment System Cascade, Phases D2 / D4
 * (docs/plans/2026-08-29-employment-system-cascade.md).
 *
 * The concept (builder, 2026-08-30): a citizen's money is what THEIR LIFE IN
 * THEIR NEIGHBORHOOD pays — the canon-re-based businesses around them, in
 * their sector, at their stage, with their own variance. Never
 * Economic_Parameters (real-world Oakland leaking through the ledger).
 *
 *   hoodReferencePay_      — median Avg_Salary of the hood's businesses in the
 *                            citizen's sector (SkillTags → role text → whole
 *                            hood) × stage 0.75/1.0/1.3 × seeded ±8%; null
 *                            when the hood has no reference or the stage
 *                            earns nothing.
 *   D4 applyUntrackedHoodReference_ — SELF_EMPLOYED / UNTRACKED raise-only to
 *                            that reference; nobody lowered; blank employer
 *                            (unemployed), tracked, GAME/CIVIC/MEDIA, sports,
 *                            Tier 1–2, student/retired/deceased untouched;
 *                            second pass moves nobody.
 *   D2 calculateCitizenIncomes_ fallback — an unpriced citizen is priced by
 *                            the hood reference first, legacy band only
 *                            where the hood has no businesses.
 *   sectorCategory_ (lifted) — unchanged for businesses; strict mode returns
 *                            null instead of the 'Small Business' default.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { passed++; console.log('ok ' + label); } else { failed++; console.log('FAIL ' + label + ': ' + (detail || 'condition false')); } }

const sandbox = {
  Logger: { log: () => {} }, Math, JSON, Object, Array, String, Number, Date, isNaN, isFinite, parseInt, parseFloat, console, RegExp,
  safeRand_: ctx => (ctx && typeof ctx.rng === 'function') ? ctx.rng : (() => 0.6),
  queueAppendIntent_: (ctx, tab, row) => { (global.__intents = global.__intents || []).push({ tab, row }); },
};
vm.createContext(sandbox);
for (const rel of [
  ['phase01-config', 'advanceSimulationCalendar.js'],
  ['phase05-citizens', 'educationCareerEngine.js'],
  ['phase05-citizens', 'runCareerEngine.js'],
  ['phase05-citizens', 'generationalWealthEngine.js'],
]) { const p = path.join(__dirname, '..', ...rel); vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p }); }
const { hoodReferencePay_, applyUntrackedHoodReference_, calculateCitizenIncomes_, sectorCategory_, roleSectorCategory_, loadHoodBusinessPay_ } = sandbox;
assert('hoodReferencePay_ loaded', typeof hoodReferencePay_ === 'function');
assert('applyUntrackedHoodReference_ loaded', typeof applyUntrackedHoodReference_ === 'function');
assert('sectorCategory_ lifted to file scope', typeof sectorCategory_ === 'function');

// ── fixtures ────────────────────────────────────────────────────────────────
const BL = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary'],
  ['BIZ-1', 'Temescal Bakery', 'Cafe & Bakery', 'Temescal', 6, 36000],
  ['BIZ-2', 'Temescal Market', 'Retail', 'Temescal', 5, 38000],
  ['BIZ-3', 'Temescal CHC', 'Healthcare', 'Temescal', 40, 88000],
  ['BIZ-4', 'Downtown Law', 'Legal Services', 'Downtown', 12, 130000],
  ['BIZ-5', 'Downtown Kitchen', 'Restaurant & Dining', 'Downtown', 20, 62000],
  ['BIZ-6', 'Downtown Tower', 'Corporate Offices', 'Downtown', 200, 98000],
  ['BIZ-7', 'Oakland Athletics', 'Sports Franchise', 'Downtown', 60, 3300000],
  ['BIZ-8', 'Rockridge Clinic', 'Medical', 'Rockridge', 15, 154000],
];
const H = ['POPID', 'First', 'Last', 'Neighborhood', 'RoleType', 'Status', 'Tier', 'BirthYear', 'CareerStage', 'YearsInCareer',
  'EducationLevel', 'LastPromotionCycle', 'LifeHistory', 'LastUpdated', 'ClockMode', 'EconomicProfileKey', 'Income', 'NetWorth', 'WealthLevel', 'EmployerBizId', 'SkillTags'];
const I = n => H.indexOf(n);
const CYCLE = 200, SIM_YEAR = 2043;
function row(o) {
  const r = new Array(H.length).fill('');
  const d = { POPID: 'POP-X', First: 'A', Last: 'B', Neighborhood: 'Temescal', RoleType: 'Baker', Status: 'Active', Tier: 4,
    CareerStage: 'mid', YearsInCareer: 8, EducationLevel: 'hs-diploma', LastPromotionCycle: 0, LifeHistory: 'Y1C1 — born',
    ClockMode: 'ENGINE', EconomicProfileKey: 'Bakery Owner', Income: 100000, NetWorth: 10000, WealthLevel: 2, EmployerBizId: 'SELF_EMPLOYED', SkillTags: '', age: 40 };
  Object.assign(d, o);
  d.BirthYear = SIM_YEAR - d.age;
  for (const k of H) r[I(k)] = d[k];
  return r;
}
function ctxWith(rows, bl) {
  return {
    ledger: { headers: H.slice(), rows: rows.map(r => r.slice()), dirty: false },
    summary: { cycleId: CYCLE }, config: { cycleCount: CYCLE },
    ss: { getSheetByName: name => name === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => (bl || BL).map(r => r.slice()) }) } : null },
    rng: () => 0.6,
  };
}
const jit = seed => 0.92 + 0.16 * sandbox.seedUnit_(seed);
const ref = (med, factor, seed) => Math.round(med * factor * jit(seed) / 100) * 100;

// ── sectorCategory_ lifted ──────────────────────────────────────────────────
{
  assert('business default unchanged', sectorCategory_('Widgets') === 'Small Business');
  assert('strict default → null', sectorCategory_('Widgets', true) === null);
  assert('sports → null either way', sectorCategory_('Sports Franchise') === null && sectorCategory_('Sports Franchise', true) === null);
  assert('legal → Professional', sectorCategory_('Legal Services') === 'Professional');
  assert('role hint: attorney → Professional', roleSectorCategory_('Immigration Attorney') === 'Professional');
  assert('role hint: line cook → Food & Culture', roleSectorCategory_('Line cook') === 'Food & Culture');
  assert('role hint: unmatched → null (whole hood)', roleSectorCategory_('Mover of Furniture') === 'Transit & Infrastructure' && roleSectorCategory_('Xyzzy') === null);
}

// ── loadHoodBusinessPay_ ────────────────────────────────────────────────────
{
  const ctx = ctxWith([]);
  const pay = loadHoodBusinessPay_(ctx);
  assert('three hoods loaded', Object.keys(pay).sort().join() === 'Downtown,Rockridge,Temescal');
  assert('sports franchise excluded from Downtown', pay.Downtown.all.length === 3 && !pay.Downtown.all.includes(3300000));
  assert('Temescal by category', pay.Temescal.byCat['Food & Culture'][0] === 36000 && pay.Temescal.byCat['Small Business'][0] === 38000 && pay.Temescal.byCat['Healthcare'][0] === 88000);
  assert('cached on ctx', loadHoodBusinessPay_(ctx) === pay);
}

// ── hoodReferencePay_ ───────────────────────────────────────────────────────
{
  const ctx = ctxWith([]);
  // Temescal mid baker: role text → Food & Culture → 36000 × 1.0 × jitter
  assert('Temescal baker mid = bakery pay', hoodReferencePay_(ctx, 'Temescal', 'Baker', '', 'mid', 'P1') === ref(36000, 1.0, 'P1'));
  assert('senior × 1.3', hoodReferencePay_(ctx, 'Temescal', 'Baker', '', 'senior', 'P1') === ref(36000, 1.3, 'P1'));
  assert('entry-level × 0.75 (old spelling accepted)', hoodReferencePay_(ctx, 'Temescal', 'Baker', '', 'entry-level', 'P1') === ref(36000, 0.75, 'P1'));
  assert('SkillTags win over role text', hoodReferencePay_(ctx, 'Temescal', 'Baker', 'Healthcare', 'mid', 'P1') === ref(88000, 1.0, 'P1'));
  assert('unmatched role → whole-hood median', hoodReferencePay_(ctx, 'Temescal', 'Xyzzy', '', 'mid', 'P1') === ref(38000, 1.0, 'P1'));
  assert('sector absent in hood → whole-hood median', hoodReferencePay_(ctx, 'Temescal', 'Immigration Attorney', '', 'mid', 'P1') === ref(38000, 1.0, 'P1'));
  assert('Downtown attorney senior = law pay × 1.3', hoodReferencePay_(ctx, 'Downtown', 'Immigration Attorney', '', 'senior', 'P2') === ref(130000, 1.3, 'P2'));
  assert('two neighbours differ (seeded jitter)', hoodReferencePay_(ctx, 'Downtown', 'Line cook', '', 'mid', 'POP-00001') !== hoodReferencePay_(ctx, 'Downtown', 'Line cook', '', 'mid', 'POP-00002'));
  assert('deterministic per seed', hoodReferencePay_(ctx, 'Downtown', 'Line cook', '', 'mid', 'POP-00001') === hoodReferencePay_(ctx, 'Downtown', 'Line cook', '', 'mid', 'POP-00001'));
  assert('jitter inside ±8%', (() => { for (let i = 0; i < 200; i++) { const v = hoodReferencePay_(ctx, 'Downtown', 'Line cook', '', 'mid', 'S' + i); if (v < 62000 * 0.92 - 100 || v > 62000 * 1.08 + 100) return false; } return true; })());
  assert('student → null', hoodReferencePay_(ctx, 'Temescal', 'Baker', '', 'student', 'P1') === null);
  assert('retired → null', hoodReferencePay_(ctx, 'Temescal', 'Baker', '', 'retired', 'P1') === null);
  assert('unknown hood → null', hoodReferencePay_(ctx, 'Nowhere', 'Baker', '', 'mid', 'P1') === null);
  assert('rounded to $100', hoodReferencePay_(ctx, 'Temescal', 'Baker', '', 'mid', 'P1') % 100 === 0);
  const noBL = ctxWith([]); noBL.ss = { getSheetByName: () => null };
  assert('no Business_Ledger → null', hoodReferencePay_(noBL, 'Temescal', 'Baker', '', 'mid', 'P1') === null);
}

// ── D4: applyUntrackedHoodReference_ ────────────────────────────────────────
{
  const rows = [
    row({ POPID: 'P1', Income: 20000 }),                                                          // Temescal baker mid, self-employed → raised to bakery pay
    row({ POPID: 'P2', Neighborhood: 'Downtown', RoleType: 'Immigration Attorney', CareerStage: 'senior', Income: 30000 }), // → law pay × 1.3
    row({ POPID: 'P3', Income: 90000 }),                                                          // above reference → untouched (raise-only)
    row({ POPID: 'P4', Income: 20000, EmployerBizId: '' }),                                       // unemployed → out of scope
    row({ POPID: 'P5', Income: 20000, EmployerBizId: 'BIZ-1' }),                                  // tracked → D3's
    row({ POPID: 'P6', Income: 20000, ClockMode: 'GAME' }),
    row({ POPID: 'P7', Income: 20000, ClockMode: 'CIVIC' }),
    row({ POPID: 'P8', Income: 20000, Tier: 2 }),
    row({ POPID: 'P9', Income: 20000, age: 19, CareerStage: 'student' }),
    row({ POPID: 'P10', Income: 20000, Status: 'Retired' }),
    row({ POPID: 'P11', Income: 20000, Status: 'Deceased' }),
    row({ POPID: 'P12', Income: 20000, EconomicProfileKey: 'SPORTS_OVERRIDE' }),
    row({ POPID: 'P13', Income: 20000, Neighborhood: 'Nowhere' }),                                // no hood reference → untouched
    row({ POPID: 'P14', Income: 20000, EmployerBizId: 'UNTRACKED', RoleType: 'Xyzzy', SkillTags: 'Healthcare' }), // tags → clinic pay
  ];
  const ctx = ctxWith(rows);
  const out = applyUntrackedHoodReference_(ctx);
  const inc = p => Number(ctx.ledger.rows.find(r => r[I('POPID')] === p)[I('Income')]);
  assert('P1 raised to Temescal bakery pay', inc('P1') === ref(36000, 1.0, 'P1'), inc('P1'));
  assert('P2 raised to Downtown law × 1.3', inc('P2') === ref(130000, 1.3, 'P2'), inc('P2'));
  assert('P3 above reference untouched', inc('P3') === 90000);
  for (const [p, why] of [['P4', 'unemployed'], ['P5', 'tracked'], ['P6', 'GAME'], ['P7', 'CIVIC'], ['P8', 'Tier 2'], ['P9', 'student'], ['P10', 'retired'], ['P11', 'deceased'], ['P12', 'sports'], ['P13', 'no reference']])
    assert(p + ' ' + why + ' untouched', inc(p) === 20000, inc(p));
  assert('P14 SkillTags → clinic pay', inc('P14') === ref(88000, 1.0, 'P14'), inc('P14'));
  assert('raised = 3, nobody lowered', out.raised === 3 && out.lowered === undefined, JSON.stringify(out));
  assert('ledger dirty', ctx.ledger.dirty === true);
  assert('second pass moves nobody', applyUntrackedHoodReference_(ctx).raised === 0);
}

// ── D2: calculateCitizenIncomes_ fallback prices by the hood ───────────────
{
  const unpriced = o => row(Object.assign({ EconomicProfileKey: '', Income: 0, LifeHistory: 'Y1C1 — born', EmployerBizId: '' }, o));
  const ctx = ctxWith([
    unpriced({ POPID: 'U1', Neighborhood: 'Downtown', RoleType: 'Line cook', CareerStage: 'mid' }),
    unpriced({ POPID: 'U2', Neighborhood: 'Nowhere', RoleType: 'Line cook', CareerStage: 'mid' }),
    unpriced({ POPID: 'U3', Neighborhood: 'Downtown', RoleType: 'Line cook', CareerStage: 'mid', Income: 55000 }),
  ]);
  calculateCitizenIncomes_(ctx);
  const inc = p => Number(ctx.ledger.rows.find(r => r[I('POPID')] === p)[I('Income')]);
  assert('U1 priced by Downtown kitchen pay', inc('U1') === ref(62000, 1.0, 'U1'), inc('U1'));
  assert('U2 no hood reference → legacy band (35000 × 0.9 × 1.02)', inc('U2') === Math.round(35000 * 0.9 * 1.02), inc('U2'));
  assert('U3 already priced → untouched (fill, never re-roll)', inc('U3') === 55000);
}


// ── engine.96 Task 10 (S413): the owner's draw — Key_Personnel is the ownership link ──
{
  const P = sandbox.parseKeyPersonnelOwners_;
  const own = (cell) => P(cell).filter(e => e.owner).map(e => (e.pop ? e.pop + ' ' : '') + e.name);
  assert('T10 parse: "(founder)" tag → owner; "Dr." stripped', JSON.stringify(own('Elias Varek (founder)')) === '["Elias Varek"]' && JSON.stringify(own('Dr. Amara Osei (Founder)')) === '["Amara Osei"]');
  assert('T10 parse: "A / B (Co-Founders)" → two owners', JSON.stringify(own('Daniel Yoon / Christine Nakamura (Co-Founders)')) === '["Daniel Yoon","Christine Nakamura"]');
  assert('T10 parse: "POP-00789 (Elias Varek, Owner); POP-00527 (Mike Paulson, Basketball Ops)" → one owner, the ops man is personnel', JSON.stringify(own('POP-00789 (Elias Varek, Owner); POP-00527 (Mike Paulson, Basketball Ops)')) === '["POP-00789 Elias Varek"]');
  assert('T10 parse: bare "POP-00048 Carlos Presti" (the minted-owner convention) → owner; bare "Rev. Daniel Han" / "Marcus Webb; Program Director" → personnel, not owners', JSON.stringify(own('POP-00048 Carlos Presti')) === '["POP-00048 Carlos Presti"]' && own('Rev. Daniel Han').length === 0 && own('Marcus Webb; Program Director').length === 0);
  assert('T10 parse: the Bay Tribune staff list carries no owner tag → nobody owns the paper by this cell', own('Mags Corliss / P Slayer / Hal Richmond / Anthony / Carmen Delaine / Jordan Velez / Luis Navarro').length === 0);
  assert('T10 profit = revenue − headcount × pay; blank revenue = null', sandbox.businessProfit_(720000, 3, 120000) === 360000 && sandbox.businessProfit_('$60,000,000', 41, 230000) === 50570000 && sandbox.businessProfit_('', 5, 1) === null);
  // the pass
  const HO = H.concat(['LineageId']);
  const rowO = (o) => { const r = row(o); r.push(o.LineageId || ''); return r; };
  const BLO = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel'],
    ['BIZ-1', 'Presti Accounting', 'Accounting', 'Downtown', 3, 120000, 720000, 1, 'POP-00048 Carlos Presti'],
    ['BIZ-2', 'Civis Systems', 'Civic Tech', 'West Oakland', 41, 230000, 60000000, 15, 'Elias Varek (founder)'],
    ['BIZ-3', 'Firehouse 29', 'Education', 'West Oakland', 20, 76000, '', 1, 'POP-00001 Vinnie Keane'],
    ['BIZ-4', 'Bubic Burgers', 'Restaurant', 'West Oakland', 15, 73000, 2190000, 2, 'POP-00128 Kris Bubic'],
    ['BIZ-5', 'Ridgeline Ventures', 'VC', 'Downtown', 12, 210000, 4400000, 15, 'Priya Chandrasekaran (Founder)'],
    ['BIZ-6', 'Mismatch Co', 'Retail', 'Temescal', 2, 40000, 500000, 1, 'POP-00048 Somebody Else'],
    ['BIZ-7', 'Loss Leader', 'Retail', 'Temescal', 6, 90000, 100000, -3, 'POP-00777 Ana Loss'],
  ];
  const people = [
    rowO({ POPID: 'POP-00048', First: 'Carlos', Last: 'Presti', Tier: 4, Income: 350000, NetWorth: 482559, EmployerBizId: 'BIZ-1' }),
    rowO({ POPID: 'POP-00789', First: 'Elias', Last: 'Varek', Tier: 1, Income: 100000000, NetWorth: 10000000000, EmployerBizId: 'BIZ-2', LineageId: 'LIN-00005' }),
    rowO({ POPID: 'POP-00001', First: 'Vinnie', Last: 'Keane', Tier: 1, ClockMode: 'GAME', Income: 1500000, NetWorth: 450000000, EmployerBizId: 'BIZ-9', LineageId: 'LIN-00003' }),
    rowO({ POPID: 'POP-00128', First: 'Kris', Last: 'Bubic', Tier: 2, Income: 243121, NetWorth: 180000000, EmployerBizId: 'BIZ-4' }),
    rowO({ POPID: 'POP-00777', First: 'Ana', Last: 'Loss', Tier: 4, Income: 90000, NetWorth: 50000, EmployerBizId: 'SELF_EMPLOYED' }),
  ];
  const ctxO = { ledger: { headers: HO, rows: people.map(r => r.slice()), dirty: false }, summary: {}, config: { cycleCount: 106 }, now: 'C106',
    ss: { getSheetByName: n => n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => BLO.map(r => r.slice()) }) } : null } };
  global.__intents = [];
  const out = sandbox.applyOwnerDraw_(ctxO, 106);
  const g = p => ctxO.ledger.rows.find(r => r[HO.indexOf('POPID')] === p);
  const inc = p => Number(g(p)[HO.indexOf('Income')]), nw = p => Number(g(p)[HO.indexOf('NetWorth')]);
  assert('T10 off-heritage Tier 4 owner: Income := half the profit — Presti $350K → $180K, the books cut the draw, and the line says so', inc('POP-00048') === 180000 && /\[Business\] Presti Accounting paid its owner \$180000 this year — the books cut the draw/.test(g('POP-00048')[HO.indexOf('LifeHistory')]), g('POP-00048')[HO.indexOf('LifeHistory')]);
  assert('T10 heritage owner: Income untouched, NetWorth += profit × 0.5 ÷ 52 — Varek + $486,250 from Civis, one Business-Gain log row', inc('POP-00789') === 100000000 && nw('POP-00789') === 10000000000 + 486250 && global.__intents.some(i => i.tab === 'LifeHistory_Log' && i.row[1] === 'POP-00789' && /Civis Systems returned \$486250/.test(i.row[4])), JSON.stringify(global.__intents));
  assert('T10 blank revenue (Firehouse 29) = no signal: Keane untouched', inc('POP-00001') === 1500000 && nw('POP-00001') === 450000000);
  assert('T10 Tier 2 off-heritage owner is outside the re-pay rule (engine.135): Bubic untouched', inc('POP-00128') === 243121);
  assert('T10 a loss pays nothing: Ana Loss $90K → $0 (the world is allowed to hurt)', inc('POP-00777') === 0 && /the books cut the draw/.test(g('POP-00777')[HO.indexOf('LifeHistory')]));
  assert('T10 unresolved owners counted, never invented: Priya (no row) + the id/name mismatch', out.unresolved === 2 && out.businesses === 4 && out.owners === 4 && out.paid === 2 && out.gains === 1 /* Mismatch Co resolves nobody, so it is not an owned business */, JSON.stringify(out));
  const ctx2 = { ledger: { headers: HO, rows: ctxO.ledger.rows.map(r => r.slice()), dirty: false }, summary: {}, config: { cycleCount: 107 }, now: 'C107', ss: ctxO.ss };
  const out2 = sandbox.applyOwnerDraw_(ctx2, 107);
  assert('T10 idempotent draw: a second cycle at the same books pays nobody again (no change), heritage gains again', out2.paid === 0 && out2.gains === 1);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
