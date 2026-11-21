// engine.354 bench plants on SANDBOX 1004 — four bench-only unemployed citizens, marker E354-BENCH NON-CANON. Bench only (title check).
//   node plant.js plant          append the four rows (cloned from POP-00199's row), read back
//   node plant.js pre            save every row's job and key before the fire (pre.json)
//   node plant.js read <cycle>   the rule check on every row with a Career-FieldChange line at <cycle> (see the comment at 'read')
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const MARK = 'E354-BENCH NON-CANON';
const sh = require('/root/GodWorld/lib/sheets'), fs = require('fs');
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
  if (cmd === 'pre') { // every row's job and key before the fire, for the rule check
    const pre = {}; led.slice(1).forEach(r => { pre[String(r[col('POPID')])] = { role: String(r[col('RoleType')] || ''), key: String(r[col('EconomicProfileKey')] || '') }; });
    fs.writeFileSync(__dirname + '/pre.json', JSON.stringify(pre)); console.log('pre.json: ' + Object.keys(pre).length + ' rows'); process.exit(0);
  }
  if (cmd === 'read') {
    // Run 1 (bench.log) named the employer and job each plant would get and was wrong: employers earlier in the sheet with no
    // same-field candidate took the plants as willing climbers. The check is the rule, on EVERY row with a Career-FieldChange
    // line at <cycle>, plants and live citizens alike: job changed and the row had a key -> key = catalogRoleKey_(new job) || new job;
    // job changed and no key -> still no key; a planted row whose job did not change -> key unchanged.
    const vm = require('vm'), E = require('/root/GodWorld/data/economic_parameters.json');
    const eng = { economicParameters_: () => E, Logger: { log() {} }, console }; vm.createContext(eng);
    vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/educationCareerEngine.js', 'utf8'), eng);
    const cyc = String(a1 || ''), log = await sh.getSheetData('LifeHistory_Log'), pre = JSON.parse(fs.readFileSync(__dirname + '/pre.json', 'utf8'));
    const fc = new Set(log.filter(x => String(x[6]) === cyc && String(x[3]) === 'Career-FieldChange').map(x => String(x[1])));
    const pops = Array.from(new Set(Object.keys(P).concat(Array.from(fc))));
    let ok = 0, keyedChanged = 0, unkeyedChanged = 0;
    for (const pop of pops) { const r = led.find(x => String(x[col('POPID')]) === pop), b = pre[pop];
      if (!r || !b) { console.log('FAIL ' + pop + ' missing (row ' + !!r + ', pre ' + !!b + ')'); continue; }
      const role = String(r[col('RoleType')] || ''), key = String(r[col('EconomicProfileKey')] || ''), changed = role !== b.role;
      const want = !changed ? b.key : (b.key.trim() === '' ? '' : (eng.catalogRoleKey_(role) || role));
      const pass = key === want; if (pass) ok++; if (changed && b.key.trim() !== '') keyedChanged++; if (changed && b.key.trim() === '') unkeyedChanged++;
      const lines = log.filter(x => String(x[1]) === pop && String(x[6]) === cyc && /^Career-/.test(String(x[3]))).map(x => x[3] + ': ' + x[4]);
      console.log((pass ? 'PASS ' : 'FAIL ') + pop + (P[pop] ? ' (plant ' + P[pop].Last + ')' : ' (live citizen)') + ' | was ' + b.role + ' / key ' + JSON.stringify(b.key) + ' | now ' + role + ' / key ' + JSON.stringify(key) + ' | employer ' + (r[col('EmployerBizId')] || '-') + ' | pay ' + r[col('Income')] + ' | ' + (lines.join(' ; ') || 'no career line') + (pass ? '' : ' | WANT key ' + JSON.stringify(want)));
    }
    console.log('C' + cyc + ' rows checked ' + pops.length + ' | keyed and changed ' + keyedChanged + ' | unkeyed and changed ' + unkeyedChanged);
    const good = ok === pops.length && keyedChanged >= 1 && unkeyedChanged >= 1;
    console.log(good ? 'CHECK PASS' : 'CHECK FAIL ' + ok + '/' + pops.length); process.exit(good ? 0 : 1);
  }
  throw new Error('plant | pre | read <cycle>');
})().catch(e => { console.error('ERR', e.message); process.exit(2); });
