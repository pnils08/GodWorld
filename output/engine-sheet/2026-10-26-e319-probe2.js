// engine.319 bench probe, round 2 (codex diff gate §5) — BENCH ONLY, title-guarded, after reset_leg and the bench Status step.
//   lay <leg> [--badclock | --neutral | --dup] — (--dup: the civic probe's name again, 'Gaem', right after it)
//                   (--neutral: blank the two rookie rows, add no probe — nothing reaches an engine.319 branch)
//                   assert the baseline's two Oaks rookie rows are pending ('Game'); add the three synthetic probes
//                   (+ with --badclock a fourth, 'Benchprobe Badclock-E319', ClockMode 'Gaem', LAST in queue order).
//                   Snapshot → output/engine-sheet/2026-10-26-e319-r2-lay-<leg>.json: ledger max POPID, Engine_Errors and
//                   Ripple_Ledger row counts, Generic_Citizens Status by row, pending intake names.
//   check <leg> [--expect | --expect-badclock] — after the fire: every minted row (POPID past the snapshot), every column but
//                   the timestamps; Business_Ledger Employee_Count for every row; Ripple_Ledger rows added; Generic_Citizens
//                   Status flips; Engine_Errors added; intake names still pending → …-e319-r2-<leg>.json.
//       --expect          the five land exactly as Task 10 says, no seeking-work line, Engine_Errors +0.
//       --expect-badclock Engine_Errors exactly +1 naming Phase5-Advancement and the bad row; no queued name minted; every
//                         name pending at lay still pending; the owner-door row queued and left; no queued name
//                         flipped to Emerged (the migration wave's own arrivals flip by their own door).
//   compare <A> <B> — same minted POPIDs and names; every column equal outside the five; Employee_Count, Ripple_Ledger rows
//                   added (timestamps aside), Generic_Citizens flips and the pending names identical.
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const fs = require('fs');
const ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const O = '/root/GodWorld/output/engine-sheet/';
const PROBES = [
  { First: 'Benchprobe', Last: 'Civic-E319', RoleType: 'Redevelopment Board', ClockMode: 'Civic', Neighborhood: 'Temescal' },
  { First: 'Benchprobe', Last: 'Media-E319', RoleType: 'Photo Assistant', ClockMode: 'media', Neighborhood: 'Downtown' },
  { First: 'Benchprobe', Last: 'Farm-E319', RoleType: 'Catcher, Midland RockHounds (AA)', ClockMode: 'game', Neighborhood: 'Fruitvale' },
];
const BAD = { First: 'Benchprobe', Last: 'Badclock-E319', RoleType: 'Plumber', ClockMode: 'Gaem', Neighborhood: 'Temescal' };
const ROOKIES = ['Harry Hayward', 'Trevor Henderson'];
const EXPECT = {
  'Harry Hayward': { ClockMode: 'GAME', EmployerBizId: 'BIZ-00074' },
  'Trevor Henderson': { ClockMode: 'GAME', EmployerBizId: 'BIZ-00074' },
  'Benchprobe Civic-E319': { ClockMode: 'CIVIC', EmployerBizId: 'BIZ-00017' },
  'Benchprobe Media-E319': { ClockMode: 'MEDIA', EmployerBizId: 'BIZ-00018' },
  'Benchprobe Farm-E319': { ClockMode: 'GAME', EmployerBizId: 'BIZ-00005' },
};
const TS = /^(createdat|last ?updated|timestamp|loggedat|recordedat|at)$/i;
const popNum = p => Number(String(p || '').replace(/^POP-/, '')) || 0;
const nameOf = (r, iF, iL) => (String(r[iF] || '').trim() + ' ' + String(r[iL] || '').trim()).trim();
const [mode, leg, flag] = process.argv.slice(2);
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  const t = (await api.spreadsheets.get({ spreadsheetId: ID, fields: 'properties.title' })).data.properties.title;
  if (t !== TITLE) throw new Error('not the bench: ' + t);
  const get = async (range) => ((await api.spreadsheets.values.get({ spreadsheetId: ID, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || []);

  if (mode === 'compare') {
    const A = JSON.parse(fs.readFileSync(O + '2026-10-26-e319-r2-' + leg + '.json', 'utf8'));
    const B = JSON.parse(fs.readFileSync(O + '2026-10-26-e319-r2-' + flag + '.json', 'utf8'));
    const fails = [], moved = [];
    const ids = x => x.minted.map(m => m.POPID + ' ' + m.name).join(',');
    if (ids(A) !== ids(B)) fails.push('minted POPIDs / names differ: ' + ids(A) + ' vs ' + ids(B));
    A.minted.forEach((m, k) => {
      const n = B.minted[k]; if (!n) return;
      const diff = Object.keys(m).filter(c => JSON.stringify(m[c]) !== JSON.stringify(n[c]));
      if (!diff.length) return;
      if (EXPECT[m.name]) moved.push(m.name + ': ' + diff.map(c => c + ' ' + JSON.stringify(m[c]) + ' → ' + JSON.stringify(n[c])).join('; '));
      else fails.push(m.name + ' differs outside the five: ' + diff.join(','));
    });
    const ec = Object.keys(Object.assign({}, A.employeeCount, B.employeeCount)).filter(b => A.employeeCount[b] !== B.employeeCount[b]);
    if (ec.length) fails.push('Employee_Count differs: ' + ec.map(b => b + ' ' + A.employeeCount[b] + '/' + B.employeeCount[b]).join(', '));
    if (JSON.stringify(A.ripples) !== JSON.stringify(B.ripples)) fails.push('Ripple_Ledger rows differ: ' + JSON.stringify(A.ripples) + ' vs ' + JSON.stringify(B.ripples));
    if (JSON.stringify(A.gcFlips) !== JSON.stringify(B.gcFlips)) fails.push('Generic_Citizens flips differ');
    if (JSON.stringify(A.pending) !== JSON.stringify(B.pending)) fails.push('intake pending differs');
    moved.forEach(x => console.log('  moved  ' + x));
    console.log('minted ' + A.minted.length + ' / ' + B.minted.length + '; Employee_Count rows ' + Object.keys(A.employeeCount).length + '; ripples ' + A.ripples.length + '; GC flips ' + A.gcFlips.length);
    console.log(fails.length ? 'FAIL ' + fails.join(' | ') : 'PASS — ' + leg + ' vs ' + flag + ': every minted column, every Employee_Count, every Ripple_Ledger row, every Generic_Citizens flip and the queue equal outside the five');
    process.exit(fails.length ? 1 : 0);
  }
  if (!/^[A-Z][0-9]?[a-z]?$/.test(String(leg || ''))) throw new Error('usage: lay <leg> [--badclock] | check <leg> [--expect|--expect-badclock] | compare <A> <B>');
  const SNAP = O + '2026-10-26-e319-r2-lay-' + leg + '.json';
  const adv = await get('Advancement_Intake1'), h = adv[0];
  const ac = n => { const i = h.indexOf(n); if (i < 0) throw new Error('intake: no ' + n + ' column'); return i; };
  const pendingNames = (rows) => rows.slice(1).map(r => nameOf(r, ac('First'), ac('Last'))).filter(Boolean);
  const led = await get('Simulation_Ledger'), lh = led[0];
  const lc = n => { const i = lh.indexOf(n); if (i < 0) throw new Error('ledger: no ' + n + ' column'); return i; };
  const ee = await get('Engine_Errors'), rip = await get('Ripple_Ledger'), gc = await get('Generic_Citizens'), biz = await get('Business_Ledger');
  const gS = gc[0].indexOf('Status'), gF = gc[0].indexOf('First'), gL = gc[0].indexOf('Last');
  if (gS < 0) throw new Error('Generic_Citizens: no Status column');

  if (mode === 'lay') {
    const pend = pendingNames(adv);
    const rk = ROOKIES.map(n => adv.slice(1).filter(r => nameOf(r, ac('First'), ac('Last')) === n));
    if (rk.some(x => x.length !== 1)) throw new Error('baseline intake does not carry each rookie once: ' + rk.map(x => x.length));
    const taken = new Set(led.slice(1).map(r => nameOf(r, lc('First'), lc('Last'))));
    if (flag === '--neutral') {
      // the neutral pair: no row in the queue reaches an engine.319 branch — the two rookie rows are blanked, no probe is added
      for (const n of ROOKIES) {
        const k = adv.findIndex((r, j) => j > 0 && nameOf(r, ac('First'), ac('Last')) === n);
        await api.spreadsheets.values.update({ spreadsheetId: ID, range: 'Advancement_Intake1!A' + (k + 1), valueInputOption: 'RAW', requestBody: { values: [new Array(h.length).fill('')] } });
      }
      const after = await get('Advancement_Intake1');
      const left = pendingNames(after);
      if (ROOKIES.some(n => left.indexOf(n) >= 0)) throw new Error('rookie rows still pending after the blank');
      const odd = after.slice(1).filter(r => nameOf(r, ac('First'), ac('Last')) && String(r[ac('ClockMode')] || '').trim() && String(r[ac('ClockMode')]).trim() !== 'ENGINE');
      if (odd.length) throw new Error('neutral queue still carries a non-ENGINE clock: ' + odd.map(r => nameOf(r, ac('First'), ac('Last'))).join(', '));
      const snap = { leg, neutral: true, maxPop: Math.max(...led.slice(1).map(r => popNum(r[lc('POPID')]))), ee: ee.length, rip: rip.length,
        gcStatus: gc.slice(1).map(r => [nameOf(r, gF, gL), String(r[gS] || '')]), pending: left, rookieClock: rk.map(x => x[0][ac('ClockMode')]) };
      fs.writeFileSync(SNAP, JSON.stringify(snap));
      console.log('leg ' + leg + ' (neutral): rookie rows blanked; pending ' + left.length + ', every clock blank or ENGINE; ledger max POP-' + snap.maxPop + '; EE ' + (ee.length - 1) + '; ripples ' + (rip.length - 1));
      return;
    }
    // --dup (codex recheck §1): a later row repeating the civic probe's name with 'Gaem' — the new citizen's update, never refused
    const DUP = { First: 'Benchprobe', Last: 'Civic-E319', RoleType: '', ClockMode: 'Gaem', Neighborhood: '', Tier: 3 };
    const add = flag === '--dup' ? [PROBES[0], DUP, PROBES[1], PROBES[2]] : PROBES.concat(flag === '--badclock' ? [BAD] : []);
    add.forEach(p => { if (taken.has(p.First + ' ' + p.Last)) throw new Error('probe name on the ledger: ' + p.Last); });
    const rows = add.map(p => { const r = new Array(h.length).fill(''); r[ac('First')] = p.First; r[ac('Last')] = p.Last; r[ac('RoleType')] = p.RoleType; r[ac('Tier')] = p.Tier || 4; r[ac('ClockMode')] = p.ClockMode; r[ac('Notes')] = 'engine.319 bench probe'; r[ac('BirthYear')] = 1994; r[ac('Neighborhood')] = p.Neighborhood; return r; });
    const at = adv.length + 1;
    await api.spreadsheets.values.update({ spreadsheetId: ID, range: 'Advancement_Intake1!A' + at, valueInputOption: 'RAW', requestBody: { values: rows } });
    const after = await get('Advancement_Intake1');
    const tail = pendingNames(after).slice(-add.length);
    if (JSON.stringify(tail) !== JSON.stringify(add.map(p => p.First + ' ' + p.Last))) throw new Error('probes are not last in queue order: ' + JSON.stringify(tail));
    const snap = { leg, badclock: flag === '--badclock', dup: flag === '--dup', queued: add.map(p => ({ name: p.First + ' ' + p.Last, RoleType: p.RoleType, Neighborhood: p.Neighborhood })), maxPop: Math.max(...led.slice(1).map(r => popNum(r[lc('POPID')]))), ee: ee.length, rip: rip.length,
      gcStatus: gc.slice(1).map(r => [nameOf(r, gF, gL), String(r[gS] || '')]), pending: pendingNames(after), rookieClock: rk.map(x => x[0][ac('ClockMode')]) };
    fs.writeFileSync(SNAP, JSON.stringify(snap));
    console.log('leg ' + leg + ': rookies pending ' + JSON.stringify(snap.rookieClock) + '; ' + add.length + ' probes last at row ' + at + '; pending ' + snap.pending.length + '; ledger max POP-' + snap.maxPop + '; EE ' + (ee.length - 1) + '; ripples ' + (rip.length - 1));
    return;
  }
  if (mode !== 'check') throw new Error('usage');
  const S = JSON.parse(fs.readFileSync(SNAP, 'utf8')), fails = [];
  const keep = lh.map((c, k) => (TS.test(String(c).trim()) ? -1 : k)).filter(k => k >= 0);
  const minted = led.slice(1).filter(r => popNum(r[lc('POPID')]) > S.maxPop).map(r => {
    const o = { name: nameOf(r, lc('First'), lc('Last')) }; keep.forEach(k => { o[lh[k]] = r[k] === undefined ? '' : r[k]; }); return o; });
  const employeeCount = {}; const bI = biz[0].indexOf('BIZ_ID'), bC = biz[0].indexOf('Employee_Count');
  biz.slice(1).forEach(r => { const id = String(r[bI] || '').trim(); if (id) employeeCount[id] = r[bC] === undefined ? '' : r[bC]; });
  const rKeep = rip[0].map((c, k) => (TS.test(String(c).trim()) ? -1 : k)).filter(k => k >= 0);
  const ripples = rip.slice(S.rip).map(r => rKeep.map(k => (r[k] === undefined ? '' : r[k])));
  const gcFlips = [];
  gc.slice(1).forEach((r, k) => { const was = S.gcStatus[k]; const now = String(r[gS] || ''); if (!was || was[1] !== now) gcFlips.push([k + 2, nameOf(r, gF, gL), was ? was[1] : '(new row)', now]); });
  const eeNew = ee.slice(S.ee).map(r => r.slice(0, 5).map(v => String(v).slice(0, 240)).join(' | '));
  const pending = pendingNames(adv);
  if (flag === '--expect') {
    Object.keys(EXPECT).forEach(n => {
      const got = minted.filter(m => m.name === n);
      if (got.length !== 1) { fails.push(n + ' minted ' + got.length + 'x'); return; }
      Object.keys(EXPECT[n]).forEach(c => { if (got[0][c] !== EXPECT[n][c]) fails.push(n + ' ' + c + ' ' + JSON.stringify(got[0][c]) + ' (want ' + EXPECT[n][c] + ')'); });
      if (/Seeking work/.test(String(got[0].LifeHistory))) fails.push(n + ' carries a seeking-work line');
    });
    if (eeNew.length) fails.push(eeNew.length + ' new Engine_Errors rows');
    // codex recheck §3: the five beyond clock and employer — one row each, Active, Tier 4, the queued role and hood
    (S.queued || []).filter(q => q.RoleType).forEach(q => {
      const got = minted.filter(m => m.name === q.name);
      if (got.length !== 1) return;
      if (got[0].RoleType !== q.RoleType) fails.push(q.name + ' RoleType ' + JSON.stringify(got[0].RoleType));
      if (q.Neighborhood && got[0].Neighborhood !== q.Neighborhood) fails.push(q.name + ' Neighborhood ' + JSON.stringify(got[0].Neighborhood));
      // with --dup the repeat row (Tier 3) is the civic citizen's update: intake lifts a Tier, never lowers it (engine.150)
      const wantTier = (S.dup && q.name === 'Benchprobe Civic-E319') ? 3 : 4;
      if (got[0].Status !== 'Active' || Number(got[0].Tier) !== wantTier) fails.push(q.name + ' Status/Tier ' + got[0].Status + '/' + got[0].Tier + ' (want Active/' + wantTier + ')');
    });
    if (minted.length !== 13) fails.push('minted ' + minted.length + ' (the C113 start mints 13 with the five)');
    if (S.dup && pending.indexOf('Benchprobe Civic-E319') >= 0) fails.push('the repeat row was not processed');
  }
  if (flag === '--expect-badclock') {
    if (eeNew.length !== 1) fails.push('Engine_Errors +' + eeNew.length + ' (want exactly 1)');
    else if (!/Phase5-Advancement/.test(eeNew[0]) || !/Benchprobe Badclock-E319/.test(eeNew[0]) || !/Gaem/.test(eeNew[0])) fails.push('the error does not name the phase / row / cell: ' + eeNew[0]);
    const queued = new Set(S.pending);
    const leaked = minted.filter(m => queued.has(m.name)).map(m => m.name);
    if (leaked.length) fails.push('queued names minted: ' + leaked.join(', '));
    const lost = S.pending.filter(n => pending.indexOf(n) < 0);
    if (lost.length) fails.push('queue rows cleared: ' + lost.join(', '));
    // the owner door queues its row during the pass itself (after lay): it must be queued and still unprocessed
    if (minted.some(m => m.name === 'Chidi Mehta')) fails.push('the owner-door row (Chidi Mehta) minted');
    if (pending.indexOf('Chidi Mehta') < 0) fails.push('the owner-door row (Chidi Mehta) is not left in the queue');
    // an Emerged flip is the intake's own write only for a queued name; the migration wave (checkForPromotions.js) mints from
    // Generic_Citizens by its own door and flips its arrivals — each such flip must be a citizen that wave minted this fire
    const mintedNames = new Set(minted.map(m => m.name));
    const emerged = gcFlips.filter(f => /emerged/i.test(f[3]));
    const fromQueue = emerged.filter(f => queued.has(f[1]));
    if (fromQueue.length) fails.push('a queued name flipped to Emerged: ' + fromQueue.map(f => f[1]).join(', '));
    const unexplained = emerged.filter(f => !queued.has(f[1]) && !mintedNames.has(f[1]));
    if (unexplained.length) fails.push('Emerged flip with no mint behind it: ' + unexplained.map(f => f[1]).join(', '));
  }
  const rec = { leg, at: new Date().toISOString(), badclock: S.badclock, minted, employeeCount, ripples, gcFlips, eeNew, pending,
    verdict: flag ? (fails.length ? 'FAIL' : 'PASS') : 'RECORD', fails };
  fs.writeFileSync(O + '2026-10-26-e319-r2-' + leg + '.json', JSON.stringify(rec, null, 1));
  minted.forEach(m => console.log('  ' + m.POPID + ' ' + m.name + ' | ' + m.ClockMode + ' | ' + m.EmployerBizId + ' | ' + m.RoleType + ' | ' + m.Income));
  eeNew.forEach(e => console.log('  EE+ ' + e));
  console.log('leg ' + leg + ': minted ' + minted.length + ', Engine_Errors +' + eeNew.length + ', ripples +' + ripples.length + ', GC flips ' + gcFlips.length + ', intake pending ' + pending.length + ' — ' + rec.verdict + (fails.length ? ': ' + fails.join('; ') : ''));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
