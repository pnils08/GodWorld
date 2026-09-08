#!/usr/bin/env node
'use strict';
/**
 * Run: node scripts/hoodIncome.test.js
 *
 * engine.135 — Employment System Cascade, Phases D2 / D4
 * (docs/plans/2026-08-29-employment-system-cascade.md).
 *
 * Pay comes from the JOB (builder ruling 2026-09-07 — a neighborhood has nothing
 * to do with a person's income; income decides where they live). This supersedes
 * the S398/S399 hood-reference concept the earlier header described.
 *
 *   jobReferencePay_        — the economic catalog's median for the exact role,
 *                            else the median of the catalog's roles in the
 *                            role's field (roleFieldOf_ / sector hints; the
 *                            SkillTag only for an unplaceable role) × stage
 *                            0.75/1.0/1.3 × seeded ±8%; null when nothing
 *                            places the role or the stage earns nothing.
 *   D4 applyUntrackedJobReference_ — SELF_EMPLOYED / UNTRACKED raise-only to
 *                            that reference; nobody lowered; blank employer
 *                            (unemployed), tracked, GAME, sports, Tier 1–2,
 *                            student/retired/deceased untouched; second pass
 *                            moves nobody.
 *   D2 calculateCitizenIncomes_ fallback — an unpriced citizen is priced by
 *                            the job's band first, legacy band only where
 *                            the catalog cannot place the role.
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
  ['utilities', 'citizenDerivation.js'], // ECONOMIC_PARAMETERS — the job catalog
  ['phase05-citizens', 'educationCareerEngine.js'],
  ['phase05-citizens', 'runCareerEngine.js'],
  ['phase05-citizens', 'generationalWealthEngine.js'],
]) { const p = path.join(__dirname, '..', ...rel); vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p }); }
const { jobReferencePay_, applyUntrackedJobReference_, calculateCitizenIncomes_, sectorCategory_, roleSectorCategory_ } = sandbox;
assert('jobReferencePay_ loaded', typeof jobReferencePay_ === 'function');
assert('applyUntrackedJobReference_ loaded', typeof applyUntrackedJobReference_ === 'function');
const CATALOG = require('../data/economic_parameters.json');
const catMedian = (cat) => { const a = CATALOG.filter(e => e.category === cat).map(e => e.medianIncome).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
assert('Caterer stays unlisted (the unlisted-role fixture)', !CATALOG.some(e => e.role.toLowerCase() === 'caterer'));
const roleMedian = (role) => CATALOG.find(e => e.role.toLowerCase() === role.toLowerCase()).medianIncome;
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
  const d = { POPID: 'POP-X', First: 'A', Last: 'B', Neighborhood: 'Temescal', RoleType: 'Caterer', Status: 'Active', Tier: 4,
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
  // engine.167: order + precision
  assert('sports titles resolve to NULL, never priced here', roleSectorCategory_('Sports Analytics Lead (Gridiron Analytics)') === null && roleSectorCategory_('Youth Basketball Coach') === null && roleSectorCategory_('Athlete') === null);
  assert('a journalist on the data desk is a journalist', roleSectorCategory_('Journalist, Data Desk') === 'Creative & Arts' && roleSectorCategory_('Journalist, Civic Affairs Reporter') === 'Creative & Arts');
  assert('civic titles are civic (deputy mayor, reentry counselor, urban planner, case worker)', roleSectorCategory_('Deputy Mayor (Community Affairs)') === 'Government & Civic' && roleSectorCategory_('Ex-Offender Reentry Counselor') === 'Government & Civic' && roleSectorCategory_('Waterfront Urban Planner') === 'Government & Civic' && roleSectorCategory_('Refugee Resettlement Case Worker') === 'Government & Civic');
  assert('the port before the trades; tech before the arts', roleSectorCategory_('Ship Repair Foreman') === 'Port & Labor' && roleSectorCategory_('Biotech Lab Director (Portside Bio)') === 'Tech & Innovation' && roleSectorCategory_('Theater Director') === 'Creative & Arts');
  assert('a Community Director organizes, a Solar Panel Installation Lead builds', roleSectorCategory_('Community Director') === 'Faith & Community' && roleSectorCategory_('Solar Panel Installation Lead') === 'Construction & Baylight');
}

// ── jobReferencePay_ (engine.172: the life places the citizen in the job's band) ──
// Mirror of the engine formula, written independently so drift shows.
const posOf = (band, prof, cls) => {
  let years = Number(prof && prof.years); if (!(years >= 0)) years = cls === 'ENTRY' ? 2 : cls === 'SENIOR' ? 25 : 12;
  let p = 0.6 * (1 - Math.exp(-years / 12));
  const expected = sandbox.PAY_EXPECTED_CREDENTIAL_[band.cat] || 2;
  if (prof && prof.eduRank != null) p += (prof.eduRank - expected) * 0.05;
  if (prof && prof.drive != null) p += ((prof.drive - 50) / 100) * 0.2;
  if (Math.round(Number(prof && prof.tier)) === 3) p += 0.08;
  if (prof && prof.employerGrowth != null) { const g = Math.max(0, Math.min(1, (prof.employerGrowth - 1.5) / 7.3)); p += (g - 0.5) * 0.2; }
  return Math.max(0, Math.min(1, p));
};
const bandOf = (role) => { const t = sandbox.jobPayTable_(); return t.byRole[role.toLowerCase()] || t.byCat[sandbox.roleFieldOf_(role) || sandbox.roleSectorCategory_(role)]; };
const payBand = (band, stage, seed, prof) => { const cls = sandbox.careerStageClass_(stage); return Math.round((band.min + posOf(band, prof, cls) * (band.max - band.min)) * (0.95 + 0.10 * sandbox.seedUnit_(seed)) / 100) * 100; };
const pay = (role, stage, seed, prof) => payBand(bandOf(role), stage, seed, prof);
const P = (o) => Object.assign({ years: NaN, eduRank: null, drive: null, tier: 4, employerGrowth: null }, o);
{
  assert('exact catalog role, no profile = its band at the stage years', jobReferencePay_('Bakery Owner', '', 'mid', 'P1') === pay('Bakery Owner', 'mid', 'P1'));
  assert('exact match is case-insensitive', jobReferencePay_('line cook', '', 'mid', 'P1') === jobReferencePay_('Line Cook', '', 'mid', 'P1'));
  assert('unlisted role → its field band (Caterer → Food & Culture)', jobReferencePay_('Caterer', '', 'mid', 'P1') === pay('Caterer', 'mid', 'P1'));
  assert('no profile: senior > mid > entry (years read from the stage)', jobReferencePay_('Caterer', '', 'senior', 'P1') > jobReferencePay_('Caterer', '', 'mid', 'P1') && jobReferencePay_('Caterer', '', 'mid', 'P1') > jobReferencePay_('Caterer', '', 'entry-level', 'P1'));
  assert('a placed role ignores a stale tag (the C106 janitor priced as a tech worker)', jobReferencePay_('Caterer', '2041-Specific', 'mid', 'P1') === jobReferencePay_('Caterer', '', 'mid', 'P1'));
  assert('janitor = the janitor band, never the tech tag', jobReferencePay_('Janitor', '2041-Specific', 'senior', 'P1') === pay('Janitor', 'senior', 'P1'));
  assert('an unlisted counter-and-building job → Small Business via the hint', jobReferencePay_('Groundskeeper', '2041-Specific', 'senior', 'P1') === pay('Groundskeeper', 'senior', 'P1'));
  assert('an unplaceable role prices by its tag', jobReferencePay_('Xyzzy', 'Healthcare', 'mid', 'P1') === payBand(sandbox.jobPayTable_().byCat['Healthcare'], 'mid', 'P1'));
  assert('unplaceable, untagged → null (caller keeps its draw)', jobReferencePay_('Xyzzy', '', 'mid', 'P1') === null);
  assert('the hood is not an input: same job, same life, same number', jobReferencePay_('Plumber', '', 'mid', 'P1', P({ years: 10 })) === jobReferencePay_('Plumber', '', 'mid', 'P1', P({ years: 10 })));
  // what makes each differ
  const base = P({ years: 10, eduRank: 3, drive: 50, tier: 4, employerGrowth: 4 });
  const v = (o) => jobReferencePay_('Plumber', '', 'mid', 'P1', P(Object.assign({}, base, o)));
  assert('years in the career lift the pay (30 > 10 > 1)', v({ years: 30 }) > v({ years: 10 }) && v({ years: 10 }) > v({ years: 1 }));
  assert('a credential above the field expectation lifts it; below lowers it', v({ eduRank: 6 }) > v({ eduRank: 3 }) && v({ eduRank: 3 }) > v({ eduRank: 0 }));
  assert('drive moves it (90 > 50 > 20)', v({ drive: 90 }) > v({ drive: 50 }) && v({ drive: 50 }) > v({ drive: 20 }));
  assert('a Tier-3 sits higher than a Tier-4', v({ tier: 3 }) > v({ tier: 4 }));
  assert('a growing employer pays more than a flat one; unknown employer is neutral', v({ employerGrowth: 9 }) > v({ employerGrowth: 1.5 }) && v({ employerGrowth: null }) === v({ employerGrowth: 5.15 }));
  assert('the whole formula matches the mirror', v({ years: 22.6, eduRank: 3, drive: 81, tier: 4, employerGrowth: 6 }) === pay('Plumber', 'mid', 'P1', P({ years: 22.6, eduRank: 3, drive: 81, tier: 4, employerGrowth: 6 })));
  const pb = bandOf('Plumber');
  assert('never outside the band (±5% jitter)', (() => { for (let i = 0; i < 200; i++) { const x = jobReferencePay_('Plumber', '', 'mid', 'S' + i, P({ years: (i * 7) % 45, eduRank: i % 7, drive: (i * 13) % 100, tier: 3 + (i % 2), employerGrowth: (i % 10) })); if (x < pb.min * 0.95 - 100 || x > pb.max * 1.05 + 100) return false; } return true; })());
  assert('two neighbours differ (seeded jitter)', jobReferencePay_('Line cook', '', 'mid', 'POP-00001') !== jobReferencePay_('Line cook', '', 'mid', 'POP-00002'));
  assert('deterministic per seed', jobReferencePay_('Line cook', '', 'mid', 'POP-00001') === jobReferencePay_('Line cook', '', 'mid', 'POP-00001'));
  assert('student → null', jobReferencePay_('Caterer', '', 'student', 'P1') === null);
  assert('retired → null', jobReferencePay_('Caterer', '', 'retired', 'P1') === null);
  assert('rounded to $100', jobReferencePay_('Caterer', '', 'mid', 'P1') % 100 === 0);
  const prof = sandbox.payProfileFromRow_(['YearsInCareer', 'EducationLevel', 'DialState', 'Tier'], [12.5, 'bachelors', JSON.stringify({ base: { drive: 70 } }), 3], 7);
  assert('payProfileFromRow_ reads years / credential rank / drive / tier / employer growth off the row', prof.years === 12.5 && prof.eduRank === 4 && prof.drive === 70 && prof.tier === 3 && prof.employerGrowth === 7);
  const prof2 = sandbox.payProfileFromRow_(['YearsInCareer', 'EducationLevel', 'DialState', 'Tier'], ['', '', 'not json', ''], null);
  assert('payProfileFromRow_ is honest about blanks (unknown, never 0 years / no credential)', isNaN(prof2.years) && prof2.eduRank === null && prof2.drive === null && prof2.employerGrowth === null);
}

// ── D4: applyUntrackedJobReference_ ────────────────────────────────────────
{
  const rows = [
    row({ POPID: 'P1', Income: 20000 }),                                                          // baker mid, self-employed → raised to the baker's band
    row({ POPID: 'P2', Neighborhood: 'Downtown', RoleType: 'Immigration Attorney', CareerStage: 'senior', Income: 30000 }), // → law pay × 1.3
    row({ POPID: 'P3', Income: 90000 }),                                                          // above reference → untouched (raise-only)
    row({ POPID: 'P4', Income: 20000, EmployerBizId: '' }),                                       // unemployed → out of scope
    row({ POPID: 'P5', Income: 20000, EmployerBizId: 'BIZ-1' }),                                  // tracked → D3's
    row({ POPID: 'P6', Income: 20000, ClockMode: 'GAME' }),
    row({ POPID: 'P7', Income: 20000, ClockMode: 'CIVIC' }),   // engine.162: CIVIC rejoined the hood reference pay
    row({ POPID: 'P8', Income: 20000, Tier: 2 }),
    row({ POPID: 'P9', Income: 20000, age: 19, CareerStage: 'student' }),
    row({ POPID: 'P10', Income: 20000, Status: 'Retired' }),
    row({ POPID: 'P11', Income: 20000, Status: 'Deceased' }),
    row({ POPID: 'P12', Income: 20000, EconomicProfileKey: 'SPORTS_OVERRIDE' }),
    row({ POPID: 'P13', Income: 20000, Neighborhood: 'Nowhere' }),                                // the hood is not an input → raised like P1
    row({ POPID: 'P14', Income: 20000, EmployerBizId: 'UNTRACKED', RoleType: 'Xyzzy', SkillTags: 'Healthcare' }), // unplaceable role → its tag's band
    row({ POPID: 'P15', Income: 20000, EmployerBizId: 'UNTRACKED', RoleType: 'Xyzzy', SkillTags: '' }),           // nothing places it → untouched
  ];
  const ctx = ctxWith(rows);
  const out = applyUntrackedJobReference_(ctx);
  const inc = p => Number(ctx.ledger.rows.find(r => r[I('POPID')] === p)[I('Income')]);
  const rowOf = p => rows.find(r => r[I('POPID')] === p);
  const own = (p, role, stage) => pay(role, stage, p, sandbox.payProfileFromRow_(H, rowOf(p), null));
  assert('P1 raised to the caterer band at their own place in it', inc('P1') === own('P1', 'Caterer', 'mid'), inc('P1'));
  assert('P2 raised to the attorney band, senior', inc('P2') === own('P2', 'Immigration Attorney', 'senior'), inc('P2'));
  assert('P3 above reference untouched', inc('P3') === 90000);
  for (const [p, why] of [['P4', 'unemployed'], ['P5', 'tracked'], ['P6', 'GAME'], ['P8', 'Tier 2'], ['P9', 'student'], ['P10', 'retired'], ['P11', 'deceased'], ['P12', 'sports'], ['P15', 'unplaceable']])
    assert(p + ' ' + why + ' untouched', inc(p) === 20000, inc(p));
  assert('P13 raised regardless of hood', inc('P13') === own('P13', 'Caterer', 'mid'), inc('P13'));
  assert('P14 unplaceable role → its tag band', inc('P14') === jobReferencePay_('Xyzzy', 'Healthcare', 'mid', 'P14', sandbox.payProfileFromRow_(H, rowOf('P14'), null)), inc('P14'));
  // engine.162: CIVIC/MEDIA rejoin the hood reference pay; GAME (P6) and the
  // sports layer (P12) keep their own door.
  assert('CIVIC row now raised to the hood reference', inc('P7') > 20000, inc('P7'));
  assert('raised = 5, nobody lowered', out.raised === 5 && out.lowered === undefined, JSON.stringify(out));
  assert('ledger dirty', ctx.ledger.dirty === true);
  assert('second pass moves nobody', applyUntrackedJobReference_(ctx).raised === 0);
}

// ── D2: calculateCitizenIncomes_ fallback prices by the job ───────────────
{
  const unpriced = o => row(Object.assign({ EconomicProfileKey: '', Income: 0, LifeHistory: 'Y1C1 — born', EmployerBizId: '' }, o));
  const ctx = ctxWith([
    unpriced({ POPID: 'U1', Neighborhood: 'Downtown', RoleType: 'Line cook', CareerStage: 'mid' }),
    unpriced({ POPID: 'U2', Neighborhood: 'Nowhere', RoleType: 'Xyzzy', CareerStage: 'mid' }),
    unpriced({ POPID: 'U3', Neighborhood: 'Downtown', RoleType: 'Line cook', CareerStage: 'mid', Income: 55000 }),
  ]);
  calculateCitizenIncomes_(ctx);
  const inc = p => Number(ctx.ledger.rows.find(r => r[I('POPID')] === p)[I('Income')]);
  assert('U1 priced by the line cook band at their own place in it', inc('U1') === pay('Line cook', 'mid', 'U1', sandbox.payProfileFromRow_(H, ctx.ledger.rows.find(r => r[I('POPID')] === 'U1'), null)), inc('U1'));
  assert('U2 unplaceable role → legacy band (35000 × 0.9 × 1.02)', inc('U2') === Math.round(35000 * 0.9 * 1.02), inc('U2'));
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
