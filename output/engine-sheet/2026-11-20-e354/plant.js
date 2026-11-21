// engine.354 bench plants on SANDBOX 1004 — four bench-only unemployed citizens, marker E354-BENCH NON-CANON. Bench only (title check).
//   node plant.js plant          append the four rows (cloned from POP-00199's row), read back
//   node plant.js read <cycle>   read job, key, employer, pay and the Career-* log rows at <cycle>; exit 0 when all four match
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const MARK = 'E354-BENCH NON-CANON';
const sh = require('/root/GodWorld/lib/sheets');
// expect: the job, key and log tag after one fire. Healthcare/Education/Transit each have an employer that hires every Cycle
// (Oakland Hospital / Piedmont Avenue Medical Center, Oakland City Schools, AC Transit) and no live unemployed candidate.
const P = {
  'POP-99354': { Last: 'Keyed',     RoleType: 'Server',              key: 'Solar Installer',     tags: 'Healthcare',               edu: 'hs-diploma', expect: { role: 'Nurse Aide',                key: 'Home Health Aide',    tag: 'Career-FieldChange' } },
  'POP-99355': { Last: 'Unkeyed',   RoleType: 'Janitor',             key: '',                    tags: 'Education',                edu: 'hs-diploma', expect: { role: 'After-School Program Aide', key: '',                    tag: 'Career-FieldChange' } },
  'POP-99356': { Last: 'Titlekey',  RoleType: 'Bakery Worker',       key: 'Community Organizer', tags: 'Transit & Infrastructure', edu: 'hs-dropout', expect: { role: 'Station Attendant',         key: 'Station Attendant',   tag: 'Career-FieldChange' } },
  'POP-99357': { Last: 'Samefield', RoleType: 'High School Teacher', key: 'High School Teacher', tags: 'Education',                edu: 'bachelors',  expect: { role: 'High School Teacher',       key: 'High School Teacher', tag: 'Career-Hired' } }
};
const BLANK = ['SpouseId', 'HouseholdId', 'ParentIds', 'ChildrenIds', 'SMPageId', 'Famous', 'MemoryRegisters', 'StatusStartCycle', 'HealthCause', 'LineageId', 'EmployerBizId', 'MaidenName', 'OwnerOfBizId'];
(async () => {
  const [cmd, a1] = process.argv.slice(2);
  process.env.GODWORLD_SHEET_ID = BENCH;
  if (BENCH === LIVE) throw new Error('bench = live');
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE) throw new Error('title check failed: ' + title);
  const led = await sh.getSheetData('Simulation_Ledger');
  const H = led[0].map(x => String(x).trim()), col = n => H.indexOf(n);
  for (const n of ['POPID', 'RoleType', 'EconomicProfileKey', 'SkillTags', 'EducationLevel', 'EmployerBizId', 'Income', 'Status', 'ClockMode', 'BirthYear', 'Tier', 'LifeHistory']) if (col(n) < 0) throw new Error('no column ' + n);
  if (cmd === 'plant') {
    for (const pop of Object.keys(P)) if (led.some(r => String(r[col('POPID')]) === pop)) throw new Error(pop + ' already on the bench — stop');
    const src = led.slice(1).find(r => String(r[col('POPID')]) === 'POP-00199');
    if (!src || String(src[col('ClockMode')]).trim() !== 'ENGINE') throw new Error('template POP-00199 missing or not ENGINE');
    const rows = Object.keys(P).map(pop => { const s = P[pop], row = src.slice(); while (row.length < H.length) row.push('');
      row[col('POPID')] = pop; row[col('First')] = 'Bench'; row[col('Last')] = s.Last; row[col('RoleType')] = s.RoleType; row[col('Status')] = 'Active';
      row[col('ClockMode')] = 'ENGINE'; row[col('Tier')] = 4; row[col('BirthYear')] = 2010; row[col('EconomicProfileKey')] = s.key; row[col('SkillTags')] = s.tags;
      row[col('EducationLevel')] = s.edu; row[col('Income')] = 30000; row[col('LifeHistory')] = 'Y3C11 — [Daily] an ordinary bench day (' + MARK + ')';
      if (col('CitizenBio') >= 0) row[col('CitizenBio')] = MARK + ' bench-only row.'; if (col('UsageCount') >= 0) row[col('UsageCount')] = 0;
      if (col('MaritalStatus') >= 0) row[col('MaritalStatus')] = 'single'; if (col('NumChildren') >= 0) row[col('NumChildren')] = 0;
      for (const b of BLANK) if (col(b) >= 0) row[col(b)] = ''; return row; });
    await sh.appendRows('Simulation_Ledger', rows);
    const back = (await sh.getSheetData('Simulation_Ledger')).filter(r => P[String(r[col('POPID')])]);
    back.forEach(r => console.log('planted', r[col('POPID')], r[col('Last')], '|', r[col('RoleType')], '| key', JSON.stringify(r[col('EconomicProfileKey')] || ''), '| tags', r[col('SkillTags')], '| edu', r[col('EducationLevel')], '| employer', JSON.stringify(r[col('EmployerBizId')] || ''), '| pay', r[col('Income')]));
    process.exit(back.length === 4 ? 0 : 1);
  }
  if (cmd === 'read') {
    const cyc = String(a1 || ''), log = await sh.getSheetData('LifeHistory_Log');
    let ok = 0;
    for (const pop of Object.keys(P)) { const r = led.find(x => String(x[col('POPID')]) === pop), e = P[pop].expect;
      if (!r) { console.log(pop, 'NOT ON THE BENCH'); continue; }
      const lines = log.filter(x => String(x[1]) === pop && String(x[6]) === cyc && /^Career-/.test(String(x[3]))).map(x => x[3] + ': ' + x[4]);
      const got = { role: String(r[col('RoleType')] || ''), key: String(r[col('EconomicProfileKey')] || ''), tag: (lines[0] || '').split(':')[0] };
      const pass = got.role === e.role && got.key === e.key && got.tag === e.tag; if (pass) ok++;
      console.log((pass ? 'PASS ' : 'FAIL ') + pop + ' ' + P[pop].Last + ' | was ' + P[pop].RoleType + ' / key ' + JSON.stringify(P[pop].key) + ' | now ' + got.role + ' / key ' + JSON.stringify(got.key) + ' | employer ' + (r[col('EmployerBizId')] || '-') + ' | pay ' + r[col('Income')] + ' | tags ' + r[col('SkillTags')] + ' | ' + (lines.join(' ; ') || 'no career line') + (pass ? '' : ' | EXPECTED ' + JSON.stringify(e)));
    }
    const all = log.filter(x => String(x[6]) === cyc && /^Career-(FieldChange|Hired)$/.test(String(x[3])));
    console.log('C' + cyc + ' hires on the bench: ' + all.length + ' (field changes ' + all.filter(x => x[3] === 'Career-FieldChange').length + ')');
    console.log(ok === 4 ? 'CHECK PASS' : 'CHECK FAIL ' + ok + '/4'); process.exit(ok === 4 ? 0 : 1);
  }
  throw new Error('plant | read <cycle>');
})().catch(e => { console.error('ERR', e.message); process.exit(2); });
