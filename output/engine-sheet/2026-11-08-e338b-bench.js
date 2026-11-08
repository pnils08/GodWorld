// engine.338 Tasks 2b–2d bench helpers on SANDBOX 1004 (no token echoed). Bench-only citizens, feed rows and intake rows,
// marker E338-BENCH NON-CANON.
//   node 2026-11-08-e338b-bench.js plant <N> 1   four bench citizens cloned from live rows (Tier 1 / 2 / 3 GAME players + a
//                                                Former-MUBA legend on no club) + feed rows at N: three `retirement` rows, a
//                                                `question` to Tierone (A's row), a `question` to Legend (blank team), a blank
//                                                `question` to Tiertwo (asks nothing)
//   node 2026-11-08-e338b-bench.js plant <N> 2   four Advancement_Intake1 rows, one per employer rule (club / club-other /
//                                                untracked / media), each naming RoleType + EmployerBizId + ClockMode
//   node 2026-11-08-e338b-bench.js plant <N> 3   the same four rows again (idempotent)
//   node 2026-11-08-e338b-bench.js read <label> <N>  readback + checks; one JSON line appended to 2026-11-08-e338b-reads.jsonl
// Copied from 2026-11-07-e338a-bench.js.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-08-e338b-reads.jsonl';
const MARK = 'E338-BENCH NON-CANON';
const sh = require('/root/GodWorld/lib/sheets');
const num = v => { const n = Number(String(v).replace(/^C/, '').trim()); return isFinite(n) ? n : null; };
const obj = d => { const h = (d[0] || []).map(x => String(x).trim()); return { h, rows: d.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))) }; };

const Q1 = "Would you take the hitting-coach job at the A's next spring, or is the booth more your speed?";
const Q2 = "Would you call games on the radio side this season?";
const BENCH_POPS = {
  'POP-99338': { from: 'POP-00001', First: 'Bench', Last: 'Tierone', RoleType: "Designated Hitter, Oakland A's", tier: 1, clock: 'GAME', econ: 'SPORTS_OVERRIDE', employer: 'BIZ-00005', question: Q1,
    intake: { RoleType: 'Club Coach / Instructor', EmployerBizId: 'BIZ-00005', ClockMode: 'GAME' }, expect: { econ: '', band: [95000, 185000], field: 'Education', employer: 'BIZ-00005' } },
  'POP-99339': { from: 'POP-00033', First: 'Bench', Last: 'Tiertwo', RoleType: "Starting Pitcher, Oakland A's", tier: 2, clock: 'GAME', econ: 'SPORTS_OVERRIDE', employer: 'BIZ-00005', question: '',
    intake: { RoleType: 'Scout', EmployerBizId: 'BIZ-00074', ClockMode: 'ENGINE' }, expect: { econ: 'Scout', band: [70000, 120000], field: 'Professional', employer: 'BIZ-00074' } },
  'POP-99340': { from: 'POP-00053', First: 'Bench', Last: 'Tierthree', RoleType: "Third Baseman, Oakland A's", tier: 3, clock: 'GAME', econ: 'SPORTS_OVERRIDE', employer: 'BIZ-00005', question: null,
    intake: { RoleType: 'College Coach', EmployerBizId: 'UNTRACKED', ClockMode: 'ENGINE' }, expect: { econ: 'College Coach', band: [88000, 165000], field: 'Education', employer: 'UNTRACKED' } },
  'POP-99341': { from: 'POP-00508', First: 'Bench', Last: 'Legend', RoleType: 'Former MUBA player, Hall of Famer', tier: 2, clock: 'ENGINE', econ: '', employer: '', question: Q2,
    intake: { RoleType: 'Sports Broadcaster / Color Analyst', EmployerBizId: 'BIZ-00018', ClockMode: 'MEDIA' }, expect: { econ: 'Sports Broadcaster / Color Analyst', band: [120000, 350000], field: 'Creative & Arts', employer: 'BIZ-00018' } }
};
const BLANK = ['SpouseId', 'HouseholdId', 'ParentIds', 'ChildrenIds', 'SMPageId', 'Famous', 'MemoryRegisters', 'StatusStartCycle', 'HealthCause', 'LineageId'];
const COUNTS = ['BIZ-00005', 'BIZ-00074', 'BIZ-00018'];

function feedRows(N) {
  const A = o => Object.assign({ Cycle: N, TeamsUsed: "A's", SeasonType: 'off-season', Notes: MARK, EventType: 'player-feature', EventTrigger: 'retirement', StoryAngle: MARK }, o);
  return [
    A({ NamesUsed: 'Bench Tierone (DH)' }), A({ NamesUsed: 'Bench Tiertwo (SP)' }), A({ NamesUsed: 'Bench Tierthree (3B)' }),
    A({ NamesUsed: 'Bench Tierone (DH)', EventType: 'press-conference', EventTrigger: 'question', Notes: Q1 }),
    A({ NamesUsed: 'Bench Legend', TeamsUsed: '', EventTrigger: 'question', Notes: Q2 }),
    A({ NamesUsed: 'Bench Tiertwo (SP)', EventTrigger: 'question', Notes: '' })
  ];
}
const isBenchFeed = r => String(r.StoryAngle) === MARK || String(r.Notes).indexOf(MARK) === 0;

(async () => {
  const [cmd, a1, a2] = process.argv.slice(2);
  process.env.GODWORLD_SHEET_ID = BENCH;
  if (BENCH === LIVE) throw new Error('bench = live');
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE) throw new Error('title check failed: ' + title);

  if (cmd === 'plant') {
    const N = Number(a1), fire = a2;
    const led = await sh.getSheetData('Simulation_Ledger');
    const H = led[0].map(x => String(x).trim());
    const col = n => H.indexOf(n);
    const have = new Set(led.slice(1).map(r => String(r[col('POPID')])));
    if (fire === '1') {
      const feed = obj(await sh.getSheetData('Oakland_Sports_Feed'));
      if (feed.rows.some(r => num(r.Cycle) === N && isBenchFeed(r))) throw new Error('bench already has E338 C' + N + ' feed rows — stop');
      for (const pop of Object.keys(BENCH_POPS)) if (have.has(pop)) throw new Error(pop + ' already on the bench — stop');
      const planted = [];
      for (const pop of Object.keys(BENCH_POPS)) {
        const spec = BENCH_POPS[pop];
        const src = led.slice(1).find(r => String(r[col('POPID')]) === spec.from);
        if (!src) throw new Error('template ' + spec.from + ' not on the bench');
        if (Number(src[col('Tier')]) !== spec.tier) throw new Error('template ' + spec.from + ' is Tier ' + src[col('Tier')] + ', not ' + spec.tier);
        const row = src.slice();
        row[col('POPID')] = pop; row[col('First')] = spec.First; row[col('Last')] = spec.Last;
        row[col('RoleType')] = spec.RoleType; row[col('Status')] = 'Active'; row[col('ClockMode')] = spec.clock; row[col('EconomicProfileKey')] = spec.econ;
        row[col('EmployerBizId')] = spec.employer;
        row[col('LifeHistory')] = 'Y3C10 — [Sports] bench-only fixture (' + MARK + ')\nY3C11 — [Daily] an ordinary bench day (' + MARK + ')';
        row[col('CitizenBio')] = MARK + ' bench-only row cloned from ' + spec.from + '. ' + spec.RoleType + '.';
        row[col('UsageCount')] = 0; row[col('MaritalStatus')] = 'single'; row[col('NumChildren')] = 0;
        for (const b of BLANK) if (col(b) >= 0) row[col(b)] = '';
        planted.push(row);
      }
      await sh.appendRows('Simulation_Ledger', planted);
      const rows = feedRows(N);
      for (const r of rows) for (const k of Object.keys(r)) if (!feed.h.includes(k)) throw new Error('no header ' + k);
      await sh.appendRows('Oakland_Sports_Feed', rows.map(r => feed.h.map(h => r[h] === undefined ? '' : r[h])));
      const back = obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => num(r.Cycle) === N && isBenchFeed(r));
      const led2 = obj(await sh.getSheetData('Simulation_Ledger')).rows.filter(r => BENCH_POPS[r.POPID]);
      console.log(JSON.stringify({ fire, N, planted: rows.length, readBack: back.length,
        triggers: back.map(r => r.EventTrigger + ':' + (r.TeamsUsed || '-') + ':' + r.NamesUsed + ':' + (r.Notes === MARK ? 'mark' : r.Notes ? 'Q' : 'blank')),
        benchCitizens: led2.map(r => r.POPID + ' ' + r.First + ' ' + r.Last + ' T' + r.Tier + ' ' + r.ClockMode + '/' + r.Status + ' ' + (r.EmployerBizId || '-') + ' inc ' + r.Income) }));
      process.exit(back.length === rows.length && led2.length === 4 ? 0 : 1);
    }
    // fire 2 / 3: the intake rows
    for (const pop of Object.keys(BENCH_POPS)) if (!have.has(pop)) throw new Error(pop + ' not on the bench — fire 1 did not plant it');
    const adv = await sh.getSheetData('Advancement_Intake1');
    const AH = adv[0].map(x => String(x).trim());
    for (const k of ['First', 'Last', 'RoleType', 'ClockMode', 'EmployerBizId', 'Notes']) if (!AH.includes(k)) throw new Error('Advancement_Intake1 lacks ' + k);
    const left = adv.slice(1).filter(r => String(r[AH.indexOf('First')]) === 'Bench');
    if (left.length) throw new Error('Advancement_Intake1 still carries ' + left.length + ' Bench row(s) — the last fire did not clear them');
    const rows = Object.keys(BENCH_POPS).map(pop => {
      const s = BENCH_POPS[pop]; const r = AH.map(() => '');
      r[AH.indexOf('First')] = s.First; r[AH.indexOf('Last')] = s.Last; r[AH.indexOf('RoleType')] = s.intake.RoleType;
      r[AH.indexOf('EmployerBizId')] = s.intake.EmployerBizId; r[AH.indexOf('ClockMode')] = s.intake.ClockMode; r[AH.indexOf('Notes')] = MARK + ' fire ' + fire;
      return r;
    });
    await sh.appendRows('Advancement_Intake1', rows);
    const back = (await sh.getSheetData('Advancement_Intake1')).slice(1).filter(r => String(r[AH.indexOf('First')]) === 'Bench');
    console.log(JSON.stringify({ fire, N, planted: rows.length, readBack: back.length, rows: back.map(r => r[AH.indexOf('Last')] + ' -> ' + r[AH.indexOf('RoleType')] + ' / ' + r[AH.indexOf('ClockMode')] + ' / ' + r[AH.indexOf('EmployerBizId')]) }));
    process.exit(back.length === rows.length ? 0 : 1);
  }
  if (cmd !== 'read') throw new Error('usage: plant <N> <1|2|3> | read <label> <N>');

  const label = a1, N = Number(a2);
  const checks = [];
  const ck = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : detail });
  const led = obj(await sh.getSheetData('Simulation_Ledger')).rows.filter(r => BENCH_POPS[r.POPID]);
  const lh = obj(await sh.getSheetData('LifeHistory_Log')).rows.filter(r => num(r.Cycle) === N && BENCH_POPS[r.POPID]);
  const biz = obj(await sh.getSheetData('Business_Ledger')).rows.filter(r => COUNTS.includes(String(r.BIZ_ID)));
  const counts = Object.fromEntries(biz.map(r => [r.BIZ_ID, Number(r.Employee_Count)]));
  const adv = await sh.getSheetData('Advancement_Intake1');
  const advLeft = adv.slice(1).filter(r => String(r[0]) === 'Bench').length;
  const hooks = obj(await sh.getSheetData('Story_Hook_Deck')).rows.filter(r => num(r.Cycle) === N || num(r.CycleId) === N);
  // the leak test: the question's own words or the asked citizens' names in a hook (the word "question" alone is in two
  // ruled hook pitches — "rhythm question", "the patience question")
  const hookLeak = hooks.filter(r => /Bench Legend|Bench Tierone|radio side|hitting-coach|more your speed/i.test(Object.values(r).join(' '))).length;
  const wc = await sh.getSheetData('World_Config');
  const key = k => { const r = wc.find(x => String(x[0]).trim() === k); return r ? r[1] : undefined; };
  const ee = obj(await sh.getSheetData('Engine_Errors'));
  const eeN = ee.rows.filter(r => num(r.Cycle) === N).map(r => Object.values(r).join(' | ').slice(0, 220));
  const econRows = (await sh.getSheetData('Economic_Parameters')).length - 1;
  const citizens = led.map(r => ({ pop: r.POPID, name: r.First + ' ' + r.Last, clock: r.ClockMode, econ: r.EconomicProfileKey, role: r.RoleType, status: r.Status, employer: r.EmployerBizId,
    tier: r.Tier, income: r.Income, tags: r.SkillTags,
    lines: String(r.LifeHistory).split('\n').filter(l => /\[(Retirement|Question)\]/.test(l)) }));
  const logRows = lh.map(r => ({ pop: r.POPID, tag: String(r.EventTag), text: String(r.EventText).slice(0, 200) }));
  const byPop = p => citizens.find(c => c.pop === p) || {};
  const phase = label.replace(/.*-f/, '');
  // the game-night phase's rows only: the feed-named type line, the bare milestones, the staff / fan week lines — other
  // phases (micro-events, media, UNDOCKED audience, maneuver) write their own rows at N and are not under test
  const sportsRow = l => /\|(feedNamed|staffWeek|fanWeek)\|/.test(l.tag) || /^(Retirement|Question)$/.test(l.tag);
  const logsOf = p => logRows.filter(l => l.pop === p && (phase === '1' ? sportsRow(l) : l.tag === 'Advancement'));
  if (phase === '1') {
    const t1 = byPop('POP-99338'), t2 = byPop('POP-99339'), lg = byPop('POP-99341');
    ck('Tierone retired: ENGINE, Income 250000, one [Retirement] line', t1.clock === 'ENGINE' && Number(t1.income) === 250000 && t1.lines.filter(l => /\[Retirement\]/.test(l)).length === 1, t1);
    ck('Tierone asked: one [Question] life line carrying the text', t1.lines.filter(l => l.indexOf('[Question] ' + Q1) > 0).length === 1, t1.lines);
    ck('Tierone sports log rows at N: type line + Retirement + Question = 3, Question bare, no second type line from the question row', logsOf('POP-99338').length === 3 && logsOf('POP-99338').some(l => l.tag === 'Question' && l.text === Q1) && logsOf('POP-99338').filter(l => /feedNamed/.test(l.tag)).length === 1, logsOf('POP-99338'));
    ck('Legend (no club, ENGINE): exactly one sports log row, the bare Question, no game-night texture', logsOf('POP-99341').length === 1 && logsOf('POP-99341')[0].tag === 'Question' && logsOf('POP-99341')[0].text === Q2, logsOf('POP-99341'));
    ck('Legend row untouched: ENGINE / Active / key blank / income 70000', lg.clock === 'ENGINE' && lg.status === 'Active' && lg.econ === '' && Number(lg.income) === 70000, lg);
    ck('Tiertwo blank-Notes question asks nothing: type line + Retirement only', logsOf('POP-99339').length === 2 && !logsOf('POP-99339').some(l => l.tag === 'Question'), logsOf('POP-99339'));
    ck('no story hook names the question', hookLeak === 0, hooks.length + ' hooks at N, leak ' + hookLeak);
    ck('Economic_Parameters tab carries the six pool rows (315)', econRows === 315, econRows);
  } else {
    for (const pop of Object.keys(BENCH_POPS)) {
      const s = BENCH_POPS[pop], c = byPop(pop), e = s.expect;
      ck(s.Last + ' role / clock / employer / key', c.role === s.intake.RoleType && c.clock === s.intake.ClockMode && c.employer === e.employer && c.econ === e.econ, [c.role, c.clock, c.employer, c.econ]);
      ck(s.Last + ' Income in the catalog band ' + e.band.join('–'), Number(c.income) >= e.band[0] && Number(c.income) <= e.band[1], c.income);
      ck(s.Last + ' SkillTags led by ' + e.field, String(c.tags).split('|')[0] === e.field, c.tags);
      ck(s.Last + ' Tier unchanged', Number(c.tier) === s.tier, c.tier);
      const adv1 = logsOf(pop);
      if (phase === '2') ck(s.Last + ' Advancement line names the moved cells', adv1.length === 1 && /RoleType -> /.test(adv1[0].text) && /ClockMode|EmployerBizId|EconomicProfileKey|Income/.test(adv1[0].text), adv1);
      else ck(s.Last + ' re-run line names no moved cell', adv1.length === 1 && !/->/.test(adv1[0].text), adv1);
    }
    ck('Oaks grew by one on Tiertwo\'s re-home (250 -> 251), and only once', counts['BIZ-00074'] === 251, counts);
    ck('Bay Tribune grew by one on Legend\'s re-home (62 -> 63), and only once', counts['BIZ-00018'] === 63, counts);
    ck('A\'s count unchanged (Tierone / Tierthree were already of record)', counts['BIZ-00005'] === 520, counts);
    ck('Advancement_Intake1 bench rows cleared', advLeft === 0, advLeft);
  }
  ck('0 Engine_Errors at N', eeN.length === 0, eeN);
  const out = { label, N, at: new Date().toISOString(), cycleCount: key('cycleCount'), checks, citizens, logRows, counts, advLeft, econRows, engineErrorsAtN: eeN };
  fs.appendFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(JSON.stringify(out, null, 1));
  const bad = checks.filter(c => !c.ok);
  console.log(bad.length ? 'READ FAIL: ' + bad.map(c => c.name).join(' | ') : 'READ OK: ' + checks.length + ' checks');
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
