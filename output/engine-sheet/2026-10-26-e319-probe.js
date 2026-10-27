// engine.319 bench probe (BENCH ONLY, title-guarded), after reset_leg and the bench Status step.
//   lay           — the baseline's own Advancement_Intake1 carries the two Oaks rookies queued by hand after live C112
//                   (Harry Hayward, Trevor Henderson, ClockMode 'Game'); assert both are pending, then add three
//                   visibly synthetic rows by header name (an unnamed civic title 'Civic', an unnamed media title
//                   'media', a farm-club catcher 'game'). Snapshot: max POPID on the ledger, Engine_Errors count.
//   check <label> — after the fire: every row minted this fire (POPID past the snapshot) with its clock, employer,
//                   role, income and tag → output/engine-sheet/2026-10-26-e319-receipt-<label>.json; Engine_Errors
//                   added. With --expect (the candidate leg) the five rows must land exactly as Task 10 says.
//   compare A B   — the two legs' mints side by side by name; anything differing outside the five is a FAIL.
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const fs = require('fs');
const ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const O = '/root/GodWorld/output/engine-sheet/';
const SNAP = O + '2026-10-26-e319-probe.json';
const PROBES = [
  { First: 'Benchprobe', Last: 'Civic-E319', RoleType: 'Redevelopment Board', ClockMode: 'Civic', Neighborhood: 'Temescal' },
  { First: 'Benchprobe', Last: 'Media-E319', RoleType: 'Photo Assistant', ClockMode: 'media', Neighborhood: 'Downtown' },
  { First: 'Benchprobe', Last: 'Farm-E319', RoleType: 'Catcher, Midland RockHounds (AA)', ClockMode: 'game', Neighborhood: 'Fruitvale' },
];
const ROOKIES = ['Harry Hayward', 'Trevor Henderson'];
const EXPECT = { // Task 10: the five rows on the candidate
  'Harry Hayward': { ClockMode: 'GAME', EmployerBizId: 'BIZ-00074' },
  'Trevor Henderson': { ClockMode: 'GAME', EmployerBizId: 'BIZ-00074' },
  'Benchprobe Civic-E319': { ClockMode: 'CIVIC', EmployerBizId: 'BIZ-00017' },
  'Benchprobe Media-E319': { ClockMode: 'MEDIA', EmployerBizId: 'BIZ-00018' },
  'Benchprobe Farm-E319': { ClockMode: 'GAME', EmployerBizId: 'BIZ-00005' },
};
const popNum = p => Number(String(p || '').replace(/^POP-/, '')) || 0;
const [mode, a1, a2] = process.argv.slice(2);
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const t = (await api.spreadsheets.get({ spreadsheetId: ID, fields: 'properties.title' })).data.properties.title;
  if (t !== TITLE) throw new Error('not the bench: ' + t);
  const get = async (range) => ((await api.spreadsheets.values.get({ spreadsheetId: ID, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || []);

  if (mode === 'compare') {
    const A = JSON.parse(fs.readFileSync(O + '2026-10-26-e319-receipt-' + a1 + '.json', 'utf8'));
    const B = JSON.parse(fs.readFileSync(O + '2026-10-26-e319-receipt-' + a2 + '.json', 'utf8'));
    const by = r => { const m = {}; r.minted.forEach(x => { m[x.name] = x; }); return m; };
    const mA = by(A), mB = by(B), names = [...new Set(Object.keys(mA).concat(Object.keys(mB)))].sort();
    const fails = [], lines = [];
    names.forEach(n => {
      const x = mA[n], y = mB[n];
      const k = (r) => r ? [r.ClockMode, r.EmployerBizId, r.RoleType, r.Income].join(' | ') : '(not minted)';
      const same = k(x) === k(y);
      lines.push((same ? '  = ' : '  ≠ ') + n + ' :: ' + a1 + ' ' + k(x) + (same ? '' : '  →  ' + a2 + ' ' + k(y)));
      if (!same && !EXPECT[n]) fails.push(n + ' differs outside the five');
    });
    console.log(lines.join('\n'));
    console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'PASS — legs differ only on the five engine.319 rows (' + names.length + ' minted in all)');
    process.exit(fails.length ? 1 : 0);
  }

  const adv = await get('Advancement_Intake1'), h = adv[0];
  const ac = n => { const i = h.indexOf(n); if (i < 0) throw new Error('intake: no ' + n + ' column'); return i; };
  const led = await get('Simulation_Ledger'), lh = led[0];
  const lc = n => { const i = lh.indexOf(n); if (i < 0) throw new Error('ledger: no ' + n + ' column'); return i; };
  const ee = await get('Engine_Errors');

  if (mode === 'lay') {
    const pend = adv.slice(1).filter(r => String(r[ac('First')] || '').trim() || String(r[ac('Last')] || '').trim());
    const rk = ROOKIES.map(n => pend.filter(r => (String(r[ac('First')]).trim() + ' ' + String(r[ac('Last')]).trim()) === n));
    if (rk.some(x => x.length !== 1)) throw new Error('baseline intake does not carry each rookie once: ' + rk.map(x => x.length));
    const rkClock = rk.map(x => x[0][ac('ClockMode')]);
    const taken = new Set(led.slice(1).map(r => String(r[lc('First')]).trim() + ' ' + String(r[lc('Last')]).trim()));
    PROBES.forEach(p => { if (taken.has(p.First + ' ' + p.Last)) throw new Error('probe name on the ledger: ' + p.Last); });
    const rows = PROBES.map(p => { const r = new Array(h.length).fill(''); Object.assign(r, {}); r[ac('First')] = p.First; r[ac('Last')] = p.Last; r[ac('RoleType')] = p.RoleType; r[ac('Tier')] = 4; r[ac('ClockMode')] = p.ClockMode; r[ac('Notes')] = 'engine.319 bench probe'; r[ac('BirthYear')] = 1994; r[ac('Neighborhood')] = p.Neighborhood; return r; });
    const at = adv.length + 1;
    await api.spreadsheets.values.update({ spreadsheetId: ID, range: 'Advancement_Intake1!A' + at, valueInputOption: 'RAW', requestBody: { values: rows } });
    const back = (await get('Advancement_Intake1!A' + at + ':Z' + (at + rows.length - 1)));
    PROBES.forEach((p, k) => { if (String(back[k][ac('Last')]) !== p.Last || String(back[k][ac('ClockMode')]) !== p.ClockMode) throw new Error('probe read back ' + JSON.stringify(back[k])); });
    const maxPop = Math.max(...led.slice(1).map(r => popNum(r[lc('POPID')])));
    fs.writeFileSync(SNAP, JSON.stringify({ maxPop, ee: ee.length, probeRow: at, pending: pend.length + rows.length, rookieClock: rkClock }));
    console.log('rookies pending with ClockMode ' + JSON.stringify(rkClock) + '; 3 probes laid at row ' + at + '; pending rows ' + (pend.length + rows.length) + '; ledger max POP-' + maxPop + '; Engine_Errors ' + (ee.length - 1));
    return;
  }
  if (mode !== 'check' || !a1) throw new Error('usage: lay | check <label> [--expect] | compare <A> <B>');
  const S = JSON.parse(fs.readFileSync(SNAP, 'utf8')), fails = [];
  const pick = r => ({ popId: r[lc('POPID')], name: (String(r[lc('First')]).trim() + ' ' + String(r[lc('Last')]).trim()), ClockMode: r[lc('ClockMode')], EmployerBizId: r[lc('EmployerBizId')],
    RoleType: r[lc('RoleType')], Income: r[lc('Income')], SkillTags: r[lc('SkillTags')], Neighborhood: r[lc('Neighborhood')], LifeHistory: String(r[lc('LifeHistory')] || '').slice(0, 160) });
  const minted = led.slice(1).filter(r => popNum(r[lc('POPID')]) > S.maxPop).map(pick);
  const eeNew = ee.slice(S.ee).map(r => r.slice(0, 4).map(v => String(v).slice(0, 200)));
  const stillPending = adv.slice(1).filter(r => String(r[ac('First')] || '').trim() || String(r[ac('Last')] || '').trim()).length;
  if (a2 === '--expect') {
    Object.keys(EXPECT).forEach(n => {
      const got = minted.filter(m => m.name === n);
      if (got.length !== 1) { fails.push(n + ' minted ' + got.length + 'x'); return; }
      Object.keys(EXPECT[n]).forEach(k => { if (got[0][k] !== EXPECT[n][k]) fails.push(n + ' ' + k + ' ' + JSON.stringify(got[0][k]) + ' (want ' + EXPECT[n][k] + ')'); });
      if (/Seeking work/.test(got[0].LifeHistory)) fails.push(n + ' carries a seeking-work line');
    });
    if (eeNew.length) fails.push(eeNew.length + ' new Engine_Errors rows');
    // stillPending is recorded, not asserted: Phase 11 media routing queues next week's usage rows after the mint
  }
  const rec = { label: a1, at: new Date().toISOString(), minted, eeNew, stillPending, verdict: a2 === '--expect' ? (fails.length ? 'FAIL' : 'PASS') : 'RECORD', fails };
  fs.writeFileSync(O + '2026-10-26-e319-receipt-' + a1 + '.json', JSON.stringify(rec, null, 1));
  minted.forEach(m => console.log('  ' + m.popId + ' ' + m.name + ' | ' + m.ClockMode + ' | ' + m.EmployerBizId + ' | ' + m.RoleType + ' | ' + m.Income));
  console.log('leg ' + a1 + ': minted ' + minted.length + ', Engine_Errors +' + eeNew.length + ', intake pending ' + stillPending + ' — ' + rec.verdict + (fails.length ? ': ' + fails.join('; ') : ''));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
