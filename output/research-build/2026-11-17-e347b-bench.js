// engine.347 Tasks 12+13 bench tool (SANDBOX 1004 only — refuses any other sheet). Copied from 2026-11-17-e347-bench.js.
//   plant          append four reflection rows on the bench's Reflection_Intake for four citizens who have a
//                  DialState and no reflection row at all; each snippet carries words the fold's text router
//                  would act on (hospital, community, promoted) if the affect word were not a map key
//   check <cycle>  after the fire: the four rows read applied=yes; each citizen's Dial_Moves "voice" part is
//                  what the tags say and nothing else; new Engine_Errors
require('/root/GodWorld/lib/env');
const fs = require('fs');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === B) throw new Error('env already points at the bench?');
process.env.GODWORLD_SHEET_ID = B;
const s = require('/root/GodWorld/lib/sheets');
const F = '/root/GodWorld/output/research-build/2026-11-17-e347b-bench-plant.json';
const TRAP = 'The hospital and the clinic were both on the agenda, the community gathering was promoted, and the award went to a neighbor.';
// [event, affect, the voice moves expected: dial -> sign]
const PLANTS = [
  ['Retirement', 'Flat', {}],                                  // the echo: nothing (before: family +, drive -)
  ['Retirement', 'Content', { composure: 1 }],                 // the echo with a mood: the mood only
  ['Civic', 'Sad', { composure: -1, outabout: -1 }],           // the new mood, by its key, not by the snippet's words
  ['Community', 'Sad', { sociability: 1, warmth: 1, composure: -1, outabout: -1 }],
];
(async () => {
  const mode = process.argv[2];
  if (mode === 'plant') {
    const led = await s.getSheetData('Simulation_Ledger'); const h = led[0];
    const iP = h.indexOf('POPID'), iD = h.indexOf('DialState'), iS = h.indexOf('Status'), iT = h.indexOf('Tier');
    const ri = await s.getSheetData('Reflection_Intake'); const spoke = new Set(ri.slice(1).map((r) => String(r[1]).trim().toUpperCase()));
    const cfg = await s.getSheetData('World_Config'); const cc = Number((cfg.find((x) => x[0] === 'cycleCount') || [])[1]);
    const mid = (d, k) => { const v = d.base && d.base[k]; return v != null && v > 30 && v < 70; };
    const picks = [];
    for (const r of led.slice(1)) {
      if (picks.length === PLANTS.length) break;
      const pop = String(r[iP] || '').trim().toUpperCase(); if (!pop || spoke.has(pop) || !r[iD]) continue;
      if (iS >= 0 && !/^active$/i.test(String(r[iS] || '').trim())) continue;
      if (String(r[iT]) !== '4') continue;
      let d; try { d = JSON.parse(r[iD]); } catch (e) { continue; }
      if (!['drive', 'sociability', 'warmth', 'composure', 'family', 'outabout'].every((k) => mid(d, k))) continue;
      picks.push({ pop, open: d.base });
    }
    if (picks.length !== PLANTS.length) throw new Error('found only ' + picks.length + ' quiet citizens');
    const ts = new Date().toISOString();
    const rows = picks.map((p, i) => [ts, p.pop, cc, 'bench-e347b', PLANTS[i][0], TRAP, 'no', PLANTS[i][1], '', '', '']);
    await s.appendRows('Reflection_Intake', rows);
    const back = (await s.getSheetData('Reflection_Intake')).filter((r) => r[3] === 'bench-e347b');
    fs.writeFileSync(F, JSON.stringify({ cycleCount: cc, picks: picks.map((p, i) => ({ ...p, event: PLANTS[i][0], affect: PLANTS[i][1], expect: PLANTS[i][2] })) }, null, 1));
    console.log(`plant: ${rows.length} rows appended at bench cycleCount ${cc}; read back ${back.length}: ` + back.map((r) => `${r[1]} ${r[4]}|${r[7]} applied=${r[6]}`).join(' · '));
    process.exit(back.length === rows.length ? 0 : 1);
  }
  if (mode === 'check') {
    const plant = JSON.parse(fs.readFileSync(F, 'utf8')); let bad = 0;
    const ri = (await s.getSheetData('Reflection_Intake')).filter((r) => r[3] === 'bench-e347b');
    const notApplied = ri.filter((r) => String(r[6]).toLowerCase() !== 'yes');
    console.log(`planted rows ${ri.length}, applied=yes ${ri.length - notApplied.length}`); if (notApplied.length || ri.length !== plant.picks.length) bad++;
    const mv = await s.getSheetData('Dial_Moves'); const h = mv[0], ix = (n) => h.indexOf(n);
    for (const p of plant.picks) {
      const rows = mv.slice(1).filter((m) => String(m[ix('POPID')]).trim().toUpperCase() === p.pop);
      const voice = {}; // dial -> the voice part of the move
      rows.forEach((m) => { const w = String(m[ix('Why')]).split('; ').find((x) => /^voice /.test(x)); if (w) voice[m[ix('Dial')]] = Number(w.replace(/^voice /, '')); });
      const want = Object.keys(p.expect), got = Object.keys(voice);
      const okSet = want.length === got.length && want.every((d) => got.includes(d));
      const okSign = want.every((d) => Math.sign(voice[d]) === p.expect[d] && Math.abs(voice[d]) <= 1.01);
      if (!okSet || !okSign) bad++;
      console.log(`  ${okSet && okSign ? 'ok ' : 'BAD'} ${p.pop} ${p.event}|${p.affect}: voice moved ${JSON.stringify(voice)} — expected ${JSON.stringify(p.expect)} (signs); all rows: ` + (rows.map((m) => `${m[ix('Dial')]} ${m[ix('Change')]} [${m[ix('Why')]}]`).join(' · ') || 'none'));
    }
    const ee = await s.getSheetData('Engine_Errors'); const c = Number(process.argv[3]);
    const hE = ee[0] || []; const iC = hE.findIndex((x) => /cycle/i.test(String(x)));
    const mine = ee.slice(1).filter((r) => iC >= 0 && Number(r[iC]) === c);
    console.log(`Engine_Errors rows at Cycle ${c}: ${mine.length}`); mine.slice(0, 5).forEach((r) => console.log('    ERR', r.slice(0, 5).join(' | ').slice(0, 200)));
    if (mine.length) bad++;
    console.log(bad ? 'CHECK FAILED' : 'CHECK PASSED'); process.exit(bad ? 1 : 0);
  }
  throw new Error('mode?');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
