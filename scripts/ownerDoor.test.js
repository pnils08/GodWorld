'use strict';
// engine.96 Task 12 (S440) — THE OWNER DOOR. "The business is the reason."
// Reel 2 rewritten S440b: the door AUTHORS an owner for the seat instead of
// repurposing a live Generic_Citizens row (builder-direct — top-tier seats are
// authored, not pool-drawn; a pool delivery driver had ended up owning a $166M
// contractor). Proves: the pool (institutions, size, blank books, no room, a
// filled seat all excluded), the two reels (profit-weighted business, an owner
// authored from the shared GC name pools, no resident consumed, an ownerless
// hood no longer whiffs), the queue row shape, the mint through the populator
// (RoleType from the business, EmployerBizId set), the wiring (Key_Personnel by
// Phase-10 cell intent, life line, log, hook), a seat taken in the meantime, a
// name collision, the cap plumbing at the entry, and the four self-armed keys.
// Run: node scripts/ownerDoor.test.js
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

const cells = [], appends = [], logs = [];
const sandbox = {
  Logger: { log(m) { logs.push(String(m)); } },
  queueAppendIntent_: (ctx, tab, row) => appends.push({ tab, row }),
  queueCellIntent_: (ctx, tab, row, col, value, reason, domain, priority) => cells.push({ tab, row, col, value, reason, domain, priority }),
  recordRipple_: () => {},
  inWorldStamp_: () => 'Y3C2',
  jobReferencePay_: (role) => (role === 'student' ? null : 61000),
  estimateRent_: () => 1900,
  inferSexFromFirstName_: () => '',
  getCoreSimNeighborhoods_: () => ['Temescal'],
  resolveHoodOrChild_: (ctx, name) => ({ 'west oakland': 'West Oakland', fruitvale: 'Fruitvale', temescal: 'Temescal', coliseum: 'Coliseum' }[String(name).trim().toLowerCase()] || null),
  setCurrentField_: (a) => a, roleFieldOf_: () => null,
  requireTab_: (ss, name) => ss.getSheetByName(name),
  safeRand_: (ctx) => ctx.rng,
  // generationalWealthEngine.js:927 — the owner draw's own number, copied for the harness
  businessProfit_: (rev, empCount, avgSalary) => {
    var r = Number(String(rev === null || rev === undefined ? '' : rev).replace(/[$,\s]/g, ''));
    if (rev === '' || rev === null || rev === undefined || isNaN(r)) return null;
    return Math.round(r - (Number(empCount) || 0) * (Number(avgSalary) || 0));
  },
  nextPopIdLocked_: require('../utilities/popIdAllocator').nextPopIdLocked_,
};
// S440b: generateGenericCitizens.js joins the harness because reel 2 now AUTHORS a
// person from that file's shared name pools (GC_LAST_NAMES / gcInitNamePools_) —
// in Apps Script both files share one global scope, so the test must too.
const src = R('phase01-config/advanceSimulationCalendar.js') + '\n' + R('utilities/citizenDerivation.js') + '\n' + R('phase05-citizens/generateGenericCitizens.js') + '\n' + R('phase05-citizens/processAdvancementIntake.js');
const E = new Function(...Object.keys(sandbox), src + '\nreturn { checkBusinessOwnerPromotions_, buildOwnerDoorPool_, ownerDoorConfig_, processAdvancementRows_, wireBusinessOwners_, OWNER_QUEUE_COLS_, OWNER_DOOR_REQUIRED_KEYS, simYearOf_, namePools: function() { return { last: GC_LAST_NAMES, female: GC_FEMALE_FIRST_NAMES, male: GC_MALE_FIRST_NAMES }; } };')(...Object.values(sandbox));

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); } }

function mkSheet(rows) {
  const s = { rows, appended: [], cleared: [], setCells: [] };
  s.getDataRange = () => ({ getValues: () => s.rows.map(r => r.slice()) });
  s.getLastColumn = () => (s.rows[0] || []).length;
  s.getLastRow = () => s.rows.length;
  s.getMaxColumns = () => Math.max(...s.rows.map(r => r.length));
  s.insertColumnsAfter = () => {};
  s.appendRow = (r) => { s.rows.push(r.slice()); s.appended.push(r.slice()); };
  s.getRange = (r, c, nr, nc) => ({
    getValues: () => [s.rows[r - 1].slice(c - 1, c - 1 + (nc || 1))],
    setValue: (v) => { while (s.rows[r - 1].length < c) s.rows[r - 1].push(''); s.rows[r - 1][c - 1] = v; s.setCells.push([r, c, v]); },
    clearContent: () => { s.cleared.push(r); s.rows[r - 1] = s.rows[r - 1].map(() => ''); },
  });
  return s;
}
const SL = ['POPID','First','MaidenName','Last','OriginGame','UNI (y/n)','MED (y/n)','CIV (y/n)','ClockMode','Tier','RoleType','Status','BirthYear','OrginCity','LifeHistory','SpouseId','LastUpdated','TraitProfile','UsageCount','Neighborhood','HouseholdId','MaritalStatus','NumChildren','ParentIds','ChildrenIds','WealthLevel','Income','InheritanceReceived','NetWorth','SavingsRate','DebtLevel','EducationLevel','SchoolQuality','CareerStage','YearsInCareer','CareerMobility','LastPromotionCycle','DisplacementRisk','MigrationIntent','MigrationReason','MigrationDestination','MigratedCycle','ReturnedCycle','EconomicProfileKey','EmployerBizId','CitizenBio','Gender','DialState','SMPageId','MemoryRegisters','StatusStartCycle','HealthCause','LineageId','SkillTags','Famous'];
const col = (n) => SL.indexOf(n);
const slRow = (o) => { const r = SL.map(() => ''); Object.keys(o).forEach(k => { r[col(k)] = o[k]; }); return r; };
const ADV_H = ['First','Middle','Last','RoleType','Tier','ClockMode','CIV','MED','UNI','Notes','BirthYear','Neighborhood','MatchPopId','MatchType','MaidenName','','EmployerBizId']; // the live 17 (SCHEMA_HEADERS: P is an empty header)
const BIZ_H = ['BIZ_ID','Name','Sector','Neighborhood','Employee_Count','Avg_Salary','Annual_Revenue','Growth_Rate','Key_Personnel'];
const GC_H = ['First','Last','Age','BirthYear','Neighborhood','Occupation','EmergenceCount','EmergedCycle','EmergenceContext','Status','Sex','EmployerBizId'];
const CYCLE = 106;
const CFG = { bizOwnerMintP: 0.2, bizOwnerMaxStaff: 250, bizOwnerMinAge: 35, bizOwnerMinProfit: 0 };
const BIZ = [
  ['BIZ-00056','Coastline Construction','Construction','West Oakland',221,85000,185199231,'4%',''],          // eligible — profit 166,414,231
  ['BIZ-00025','Kaiser Permanente Oakland','Healthcare','Piedmont Ave',2601,102000,1302140000,'3%',''],     // size
  ['BIZ-00001','Anthropic','AI Research','Baylight District',86,185000,643736127,'8%',''],                 // sector
  ['BIZ-00017','City of Oakland','Municipal Government','Downtown',1202,88000,450778846,'2%',''],          // sector + name
  ['BIZ-00029','Coliseum District Development','Real Estate','Coliseum',31,105000,19317165,'4%',''],       // eligible — profit 16,062,165; nobody lives there
  ['BIZ-00099','OakTown Echo','Media & Journalism','West Oakland',20,90000,'','2%',''],                    // blank books
  ['BIZ-00052','Civis Systems','Urban Systems Intelligence Firm','West Oakland',41,230000,60000000,'15%','POP-00789 Elias Varek (founder)'], // seat filled
  ['BIZ-00068','Marigold Cafe','Cafe / dining','Fruitvale',30,43000,2822942,'3%',''],                      // eligible — profit 1,532,942
  ['BIZ-00200','Full House Diner','Restaurant & Dining','Temescal',2,40000,500000,'2%',''],                // no room: 2 stated, 2 tracked
  ['BIZ-00201','Loser Bar','Bar / lounge','Temescal',10,50000,100000,'-3%',''],                            // no profit
];
const GC = [
  ['Ray','Okada',57,1985,'West Oakland','Mechanic',0,'','','Active','male',''],
  ['Lena','Voss',32,2010,'West Oakland','Barista',0,'','','Active','female',''],   // too young
  ['Tomas','Reyes',63,1979,'Fruitvale','Server',1,'','','Active','male',''],
  ['Gone','Already',50,1992,'West Oakland','Mover',3,100,'','Emerged','male',''],  // not Active
  ['','Blank',50,1992,'West Oakland','Mover',0,'','','Active','male',''],          // no name
  ['Avery','Santana',56,1986,'West Oakland','Painter',0,'','','Active','female',''], // collides with the mayor
];
function world(opts) {
  opts = opts || {};
  const sheets = {
    Advancement_Intake1: mkSheet([ADV_H.slice()]),
    LifeHistory_Log: mkSheet([['Timestamp','POPID','Name','EventTag','EventText','Neighborhood','Cycle']]),
    Business_Ledger: mkSheet([BIZ_H.slice()].concat((opts.biz || BIZ).map(r => r.slice()))),
    Generic_Citizens: mkSheet([GC_H.slice()].concat((opts.gc || GC).map(r => r.slice()))),
    Household_Ledger: mkSheet([['HouseholdId','HeadOfHousehold','HouseholdType','Members','Neighborhood','HousingType','MonthlyRent','HousingCost','HouseholdIncome','FormedCycle','DissolvedCycle','Status','HouseholdSavings']]),
    Family_Relationships: mkSheet([['HouseholdId','Husband','Wife','RelationshipType','SinceCycle','Status','Child1','Child2','Child3','Child4','Child5']]),
  };
  let i = 0; const seq = opts.seq || [0.1, 0.5, 0.0, 0.1, 0.9, 0.0];
  const ledgerRows = [
    slRow({ POPID: 'POP-00034', First: 'Avery', Last: 'Santana', Tier: 1, ClockMode: 'CIVIC', Status: 'Active', BirthYear: 1986, Neighborhood: 'Downtown' }),
    slRow({ POPID: 'POP-00900', First: 'Rosa', Last: 'Nguyen', Tier: 4, ClockMode: 'ENGINE', Status: 'Active', BirthYear: 1990, Neighborhood: 'Temescal', EmployerBizId: 'BIZ-00200' }),
    slRow({ POPID: 'POP-00901', First: 'Kim', Last: 'Lee', Tier: 4, ClockMode: 'ENGINE', Status: 'Active', BirthYear: 1991, Neighborhood: 'Temescal', EmployerBizId: 'BIZ-00200' }),
    slRow({ POPID: 'POP-00902', First: 'Old', Last: 'Hand', Tier: 4, ClockMode: 'ENGINE', Status: 'Deceased', BirthYear: 1950, Neighborhood: 'West Oakland', EmployerBizId: 'BIZ-00056' }),
  ];
  const ctx = {
    ledger: { headers: SL.slice(), rows: ledgerRows, dirty: false },
    summary: { cycleId: CYCLE, neighborhoodState: {}, storyHooks: [] },
    config: Object.assign({ cycleCount: CYCLE }, opts.cfg === null ? {} : (opts.cfg || CFG)), now: 'C' + CYCLE,
    rng: () => seq[(i++) % seq.length],
    ss: { getSheetByName: (n) => sheets[n] || null },
  };
  return { ctx, sheets };
}
const qc = (w, n) => w.sheets.Advancement_Intake1.rows[0].indexOf(n);

console.log('\n1. the pool — who can draw:');
{
  const w = world();
  const pool = E.buildOwnerDoorPool_(w.ctx, CFG);
  check('three eligible, in sheet order, with the draw\'s own profit', pool.map(p => p.id).join() === 'BIZ-00056,BIZ-00029,BIZ-00068' && pool[0].profit === 166414231 && pool[2].profit === 1532942, JSON.stringify(pool));
  check('institution by size, by sector, by name, blank books, a filled seat, no room, no profit — all out', !pool.some(p => /00025|00001|00017|00099|00052|00200|00201/.test(p.id)));
  const w2 = world({ cfg: { bizOwnerMintP: 0.2, bizOwnerMaxStaff: 250, bizOwnerMinAge: 35, bizOwnerMinProfit: 5000000 } });
  check('the profit floor is the one knob that drops the shop tail', E.buildOwnerDoorPool_(w2.ctx, w2.ctx.config).map(p => p.id).join() === 'BIZ-00056,BIZ-00029');
  let err = null; try { E.ownerDoorConfig_({ config: { bizOwnerMintP: 0.2 } }); } catch (e) { err = e; }
  check('missing keys fail loud, naming them', !!err && /bizOwnerMaxStaff, bizOwnerMinAge, bizOwnerMinProfit/.test(err.message), err && err.message);
}

console.log('\n2. the two reels — the business by profit, an owner authored for the seat:');
{
  logs.length = 0;
  const w = world(); // slot 1: fires (0.1), roll 0.5 of 184M -> Coastline; slot 2: fires, roll -> Coliseum, a hood with no residents at all
  const res = E.checkBusinessOwnerPromotions_(w.ctx, CYCLE, 2);
  const q = w.sheets.Advancement_Intake1;
  const pools = E.namePools();
  check('both slots queue — three eligible, and the whiff is gone from the result', res.queued === 2 && res.eligible === 3 && res.whiffs === undefined, JSON.stringify(res));
  check('queue self-armed OwnerOfBizId + Gender after the live 17', E.OWNER_QUEUE_COLS_.every(c => qc(w, c) >= 0) && qc(w, 'OwnerOfBizId') === 17 && qc(w, 'Gender') === 18, q.rows[0].join('|'));
  const r = q.appended[0];
  const first = r[qc(w, 'First')], last = r[qc(w, 'Last')];
  check('the owner is authored from the shared GC name pools, not invented separately', pools.last.indexOf(last) >= 0 && (pools.female.concat(pools.male)).indexOf(first) >= 0, first + ' ' + last);
  check('nobody in Generic_Citizens was repurposed — the whole point of the S440b correction', !GC.some(g => g[0] === first && g[1] === last) && w.sheets.Generic_Citizens.rows.every((row, i) => i === 0 || row[9] === GC[i - 1][9]), first + ' ' + last);
  check('the business writes the role; Tier 4 ENGINE; the notes say authored, and carry no pool trade', r[qc(w, 'RoleType')] === 'Owner, Coastline Construction' && r[qc(w, 'Tier')] === 4 && r[qc(w, 'ClockMode')] === 'ENGINE' && /the business is the reason/.test(r[qc(w, 'Notes')]) && /authored, not a pool draw/.test(r[qc(w, 'Notes')]) && !/the pool listed them as/.test(r[qc(w, 'Notes')]), r[qc(w, 'Notes')]);
  const simYear = E.simYearOf_(w.ctx, CYCLE);
  check('old enough to own it, hood of the business, employer = owner-of = the business, sex set', (simYear - r[qc(w, 'BirthYear')]) >= CFG.bizOwnerMinAge && r[qc(w, 'Neighborhood')] === 'West Oakland' && r[qc(w, 'EmployerBizId')] === 'BIZ-00056' && r[qc(w, 'OwnerOfBizId')] === 'BIZ-00056' && /^(male|female)$/.test(r[qc(w, 'Gender')]), JSON.stringify([r[qc(w, 'BirthYear')], r[qc(w, 'Gender')]]));
  const r2 = q.appended[1];
  check('a hood with nobody living in it still gets an owner — no whiff, no log', r2 && r2[qc(w, 'OwnerOfBizId')] === 'BIZ-00029' && r2[qc(w, 'Neighborhood')] === 'Coliseum' && !logs.some(m => /drew, but no one in/.test(m)), r2 && r2[qc(w, 'Neighborhood')]);
  const w2 = world({ seq: [0.9, 0.9, 0.9] });
  check('the event not firing queues nothing', E.checkBusinessOwnerPromotions_(w2.ctx, CYCLE, 2).queued === 0 && w2.sheets.Advancement_Intake1.appended.length === 0);
  const w3 = world();
  check('no slots left → nothing, not even a read', E.checkBusinessOwnerPromotions_(w3.ctx, CYCLE, 0).eligible === 0 && w3.sheets.Advancement_Intake1.rows[0].length === ADV_H.length);
  const w4 = world({ seq: [0.1, 0.999, 0.0] }); // roll at the top of the range → the last in the pool: the shop tail
  E.checkBusinessOwnerPromotions_(w4.ctx, CYCLE, 1);
  const r4 = w4.sheets.Advancement_Intake1.appended[0];
  check('a high roll lands on the shop tail too — Marigold Cafe gets an owner in Fruitvale', r4 && r4[qc(w4, 'OwnerOfBizId')] === 'BIZ-00068' && r4[qc(w4, 'Neighborhood')] === 'Fruitvale' && r4[qc(w4, 'RoleType')] === 'Owner, Marigold Cafe', r4 && r4[qc(w4, 'RoleType')]);
}

console.log('\n3. the mint — through the populator, wired to the ledger:');
{
  cells.length = 0; logs.length = 0;
  const w = world();
  E.checkBusinessOwnerPromotions_(w.ctx, CYCLE, 1);
  const qr = w.sheets.Advancement_Intake1.appended[0];
  const who = qr[qc(w, 'First')] + ' ' + qr[qc(w, 'Last')];
  const before = w.ctx.ledger.rows.length;
  const res = E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE);
  const nu = w.ctx.ledger.rows.slice(before), owner = nu[0];
  check('one new row, one owner wired, queue cleared', nu.length === 1 && res.processed === 1 && res.ownersWired === 1 && w.sheets.Advancement_Intake1.cleared.length === 1, JSON.stringify(res));
  check('POPID continues the ledger; role from the business; employed there (221 stated, 0 Active tracked → room)', owner[col('POPID')] === 'POP-00903' && owner[col('RoleType')] === 'Owner, Coastline Construction' && owner[col('EmployerBizId')] === 'BIZ-00056' && owner[col('Neighborhood')] === 'West Oakland' && /^(male|female)$/.test(owner[col('Gender')]));
  check('the queued name is the minted name — the populator carried it through', owner[col('First')] + ' ' + owner[col('Last')] === who, who + ' vs ' + owner[col('First')] + ' ' + owner[col('Last')]);
  check('catalog pay at C — the books take over at C+1 through applyOwnerDraw_', owner[col('Income')] === 61000);
  check('Key_Personnel by ONE Phase-10 cell intent: Coastline\'s row, the Key_Personnel column, POPID Name (owner), economy/90', cells.length === 1 && cells[0].tab === 'Business_Ledger' && cells[0].row === 2 && cells[0].col === 9 && cells[0].value === 'POP-00903 ' + who + ' (owner)' && cells[0].domain === 'economy' && cells[0].priority === 90, JSON.stringify(cells));
  check('the sheet itself was not written', w.sheets.Business_Ledger.setCells.length === 0 && w.sheets.Business_Ledger.rows[1][8] === '');
  check('a [Business] life line, the log row, the hook', /\[Business\] Took over Coastline Construction in West Oakland — the business is the reason/.test(owner[col('LifeHistory')]) && w.sheets.LifeHistory_Log.appended.some(r => r[3] === 'Business-Owner' && /Became the owner of Coastline Construction/.test(r[4])) && w.ctx.summary.storyHooks.some(h => h.hookType === 'BUSINESS_OWNER_ARRIVED' && new RegExp(who + ' is the new owner of Coastline Construction').test(h.text)), JSON.stringify(w.ctx.summary.storyHooks));
  const gcNow = w.sheets.Generic_Citizens.rows.slice(1);
  check('no Generic_Citizens row was consumed or marked Emerged — the door authored its own person', gcNow.filter(r => r[9] === 'Emerged').length === 1 && gcNow[0][9] === 'Active' && w.sheets.Generic_Citizens.setCells.length === 0, JSON.stringify(gcNow.map(r => r[9])));
}

console.log('\n4. a seat taken in the meantime, and a name collision:');
{
  cells.length = 0; logs.length = 0;
  const w = world();
  E.checkBusinessOwnerPromotions_(w.ctx, CYCLE, 1);
  const who = w.sheets.Advancement_Intake1.appended[0][qc(w, 'First')] + ' ' + w.sheets.Advancement_Intake1.appended[0][qc(w, 'Last')];
  w.sheets.Business_Ledger.rows[1][8] = 'POP-00999 Someone Else (owner)'; // filled between the draw and the mint
  const before = w.ctx.ledger.rows.length;
  const res = E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE);
  check('minted, not wired, no intent, logged', w.ctx.ledger.rows.length === before + 1 && res.ownersWired === 0 && cells.length === 0 && logs.some(m => new RegExp('BIZ-00056 already names its people — ' + who).test(m)), logs.join(' | '));
  // The collision guard is exercised against a hand-built owner row: reel 2 now
  // authors from a 150-deep surname pool, so a draw can no longer be aimed at an
  // existing citizen the way the old Generic_Citizens fixture aimed it.
  logs.length = 0;
  const w2 = world();
  const adv2 = w2.sheets.Advancement_Intake1, qh2 = adv2.rows[0];
  if (qh2.indexOf('OwnerOfBizId') < 0) qh2.push('OwnerOfBizId');
  if (qh2.indexOf('Gender') < 0) qh2.push('Gender');
  const c2 = (n) => qh2.indexOf(n);
  const row2 = new Array(qh2.length).fill('');
  row2[c2('First')] = 'Avery'; row2[c2('Last')] = 'Santana'; row2[c2('RoleType')] = 'Owner, Coastline Construction';
  row2[c2('Tier')] = 4; row2[c2('ClockMode')] = 'ENGINE'; row2[c2('Notes')] = 'Owner door — Coastline Construction (BIZ-00056), C' + CYCLE;
  row2[c2('BirthYear')] = 1986; row2[c2('Neighborhood')] = 'West Oakland';
  row2[c2('EmployerBizId')] = 'BIZ-00056'; row2[c2('OwnerOfBizId')] = 'BIZ-00056'; row2[c2('Gender')] = 'female';
  adv2.appendRow(row2);
  const b2 = w2.ctx.ledger.rows.length;
  const r2 = E.processAdvancementRows_(w2.ctx, 'C' + CYCLE, CYCLE);
  check('an owner row naming an existing citizen is skipped, not bumped, seat untouched', w2.ctx.ledger.rows.length === b2 && r2.processed === 0 && w2.ctx.ledger.rows[0][col('Tier')] === 1 && logs.some(m => /owner-door row "Avery Santana" collides/.test(m)), logs.join(' | '));
}

console.log('\n4b. a business already waiting on the queue is spoken for:');
{
  const w = world();
  E.checkBusinessOwnerPromotions_(w.ctx, CYCLE, 1); // Coastline → Ray, queued (not yet minted)
  const w2 = { ctx: w.ctx, sheets: w.sheets };
  const res = E.checkBusinessOwnerPromotions_(w2.ctx, CYCLE, 2); // pool now Coliseum + Marigold; seq continues: fires, roll → Coliseum whiff, fires, roll → Marigold → Tomas
  const q = w.sheets.Advancement_Intake1.appended;
  check('Coastline is out of the pool while its row waits; nothing draws it twice', res.eligible === 2 && q.filter(r => r[qc(w, 'OwnerOfBizId')] === 'BIZ-00056').length === 1, JSON.stringify(res) + ' ' + q.map(r => r[qc(w, 'OwnerOfBizId')]).join());
}

console.log('\n4c. an authored row carries its bio onto the ledger (builder-direct):');
{
  const w = world();
  const adv = w.sheets.Advancement_Intake1; const qh = adv.rows[0];
  if (qh.indexOf('OwnerOfBizId') < 0) qh.push('OwnerOfBizId'); if (qh.indexOf('Gender') < 0) qh.push('Gender'); qh.push('CitizenBio');
  const c = (n) => qh.indexOf(n);
  const r = new Array(qh.length).fill(''); r[c('First')] = 'Desmond'; r[c('Last')] = 'Achebe'; r[c('RoleType')] = 'Founder, Coastline Construction'; r[c('Tier')] = 3; r[c('ClockMode')] = 'ENGINE'; r[c('Notes')] = 'Founder, Coastline Construction (BIZ-00056)'; r[c('BirthYear')] = 1984; r[c('Neighborhood')] = 'West Oakland'; r[c('EmployerBizId')] = 'BIZ-00056'; r[c('OwnerOfBizId')] = 'BIZ-00056'; r[c('Gender')] = 'male'; r[c('CitizenBio')] = 'Ironworker who started his own crew.';
  adv.appendRow(r);
  const before = w.ctx.ledger.rows.length;
  const res = E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE);
  const d = w.ctx.ledger.rows[before];
  check('Tier 3 founder minted with the bio on CitizenBio, the role from the row, wired as (founder)', w.ctx.ledger.rows.length === before + 1 && d[col('CitizenBio')] === 'Ironworker who started his own crew.' && d[col('Tier')] === 3 && d[col('RoleType')] === 'Founder, Coastline Construction' && res.ownersWired === 1 && cells[cells.length - 1].value === d[col('POPID')] + ' Desmond Achebe (founder)' && /\[Business\] Founder of Coastline Construction/.test(d[col('LifeHistory')]), d && JSON.stringify([d[col('CitizenBio')], d[col('Tier')], d[col('RoleType')]]));
}

console.log('\n5. the plumbing — cap, order, keys:');
{
  const src = R('phase05-citizens/processAdvancementIntake.js');
  check('the door takes only the slots emergence and the family door left', /checkBusinessOwnerPromotions_\(ctx, cycle,\s*DRIP_CAP_PER_CYCLE - emergenceResults\.queued - familyResults\.queued\)/.test(src) && src.indexOf('checkFamilyMatchPromotions_(ctx, cycle') < src.indexOf('checkBusinessOwnerPromotions_(ctx, cycle') && src.indexOf('checkBusinessOwnerPromotions_(ctx, cycle') < src.indexOf('var advResults = processAdvancementRows_'));
  const seeds = R('phase01-config/engine94SheetContract.js');
  check('the four keys are seeded in ENGINE96_CONFIG_SEEDS', E.OWNER_DOOR_REQUIRED_KEYS.every(k => new RegExp("\\['" + k + "', ").test(seeds)));
  check('no Math.random in the door', !/Math\.random/.test(src.slice(src.indexOf('THE OWNER DOOR'), src.indexOf('THE HOUSEHOLD DOOR'))));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
