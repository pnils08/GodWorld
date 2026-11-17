#!/usr/bin/env node
/* engine.347 Task 4 — replay. The live Reflection_Intake rows for C115–C116 (read 2026-11-17,
 * 2026-11-17-classifier-replay-rows.json: positional A–K) re-classified with the candidate prompt,
 * against the tags the old prompt stored. Read-only: writes nothing to a sheet or a page.
 * Run: node output/research-build/2026-11-17-classifier-replay.js   (live classifier calls, cents)
 */
const fs = require('fs');
const path = require('path');
const rc = require('/root/GodWorld/lib/reflectionClassifier');
const dm = require('/root/GodWorld/utilities/citizenDialMap');
const { DIALS } = require('/root/GodWorld/utilities/citizenMemory.js');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, '2026-11-17-classifier-replay-rows.json'), 'utf8'));
const SHARE = 0.225;
const kind = (r) => /^graded: /.test(r[5]) ? 'PRESS graded' : /^filed: /.test(r[5]) ? 'PRESS filed' : r[3] === 'PRESS' ? 'PRESS answer' : r[3] === 'work' ? 'work' : ['CONVO', 'DEBATE', 'INTERVIEW'].includes(r[3]) ? 'exchange' : r[3] === 'nightly' ? 'nightly' : 'wake';

(async () => {
  const out = new Array(rows.length);
  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const i = next++;
      const r = rows[i];
      let cls = await rc.classifyTripleReflection_(String(r[5]), []);
      if (/^\[err\]/.test(cls.raw || '')) { await new Promise((ok) => setTimeout(ok, 4000)); cls = await rc.classifyTripleReflection_(String(r[5]), []); }
      out[i] = { pop: r[1], cycle: r[2], daypart: r[3], kind: kind(r), oldEvent: r[4] || '', oldAffect: r[7] || '',
        newEvent: cls.event || '', newAffect: cls.affect || '', flat: cls.affect === 'Flat', err: /^\[err\]/.test(cls.raw || '') ? cls.raw : '', text: String(r[5]).slice(0, 200) };
    }
  }
  await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
  fs.writeFileSync(path.join(__dirname, '2026-11-17-classifier-replay-out.json'), JSON.stringify(out, null, 1));

  const ok = out.filter((o) => !o.err);
  console.log(`rows ${out.length}  classified ${ok.length}  errors ${out.length - ok.length}`);
  const count = (f) => { const m = {}; ok.forEach((o) => { const k = f(o); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const fmt = (e) => e.map(([k, v]) => `${k} ${v}`).join(', ');
  console.log('\nAFFECT old :', fmt(count((o) => o.oldAffect || '(blank)')));
  console.log('AFFECT new :', fmt(count((o) => o.flat ? 'Flat' : (o.newAffect || '(miss)'))));
  console.log('\nAFFECT moves (old -> new), top:', fmt(count((o) => `${o.oldAffect || '-'}>${o.flat ? 'Flat' : (o.newAffect || 'miss')}`).slice(0, 16)));
  console.log('\nEVENT old  :', fmt(count((o) => o.oldEvent || '(blank)')));
  console.log('EVENT new  :', fmt(count((o) => o.newEvent || '(miss)')));
  console.log('\nEVENT moves (changed only), top:', fmt(count((o) => o.oldEvent === o.newEvent ? '=' : `${o.oldEvent || '-'}>${o.newEvent || 'miss'}`).slice(0, 24)));
  console.log('\nFLAT by kind:', fmt(count((o) => `${o.kind}:${o.flat ? 'flat' : 'mood'}`)));
  const noRow = ok.filter((o) => !o.newEvent && !o.newAffect).length;
  console.log(`\nrows that would write nothing (no event and no mood): ${noRow}`);

  // per-dial: rows pushing up / down and the net permanent points, old tags vs new
  function tally(ev, af) {
    const t = {}; DIALS.forEach((d) => { t[d] = { up: 0, down: 0, net: 0 }; });
    ok.forEach((o) => {
      const fx = dm.nudgesForReflection_(ev(o), af(o), 1, '');
      for (const d of Object.keys(fx)) { if (!t[d] || !fx[d]) continue; t[d][fx[d] > 0 ? 'up' : 'down']++; t[d].net += fx[d] * SHARE; }
    });
    return t;
  }
  const oldT = tally((o) => o.oldEvent, (o) => o.oldAffect), newT = tally((o) => o.newEvent, (o) => o.newAffect);
  console.log('\nDIAL          old up/down  net pts   |  new up/down  net pts');
  DIALS.forEach((d) => console.log(`  ${d.padEnd(12)} ${String(oldT[d].up).padStart(4)}/${String(oldT[d].down).padEnd(4)} ${oldT[d].net.toFixed(1).padStart(7)}   |  ${String(newT[d].up).padStart(4)}/${String(newT[d].down).padEnd(4)} ${newT[d].net.toFixed(1).padStart(7)}`));
  // composure among rows with real feeling only
  const felt = ok.filter((o) => o.kind === 'wake' || o.kind === 'work' || o.kind === 'exchange' || o.kind === 'nightly');
  const c = (list, af) => { let up = 0, down = 0; list.forEach((o) => { const v = (dm.nudgesForReflection_('', af(o), 1, '').composure || 0); if (v > 0) up++; else if (v < 0) down++; }); return `${up} up / ${down} down of ${list.length}`; };
  console.log(`\ncomposure, wakes + work + exchanges only:  old ${c(felt, (o) => o.oldAffect)}   new ${c(felt, (o) => o.newAffect)}`);
  console.log(`composure, PRESS only:                      old ${c(ok.filter((o) => /^PRESS/.test(o.kind)), (o) => o.oldAffect)}   new ${c(ok.filter((o) => /^PRESS/.test(o.kind)), (o) => o.newAffect)}`);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
