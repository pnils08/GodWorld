#!/usr/bin/env node
/* engine.347 Task 5 — replay. The job statements saved to pages since Mon 2026-11-09
 * (2026-11-17-job-statements-rows.json: CIVIC lines, Mara's directive entry, Varek's journal) put through
 * the live classifier two ways: one read per saved line, and one read per sitting (a speaker's lines
 * from one day joined, as citizen-exchange.js joins a participant's lines). Read-only: nothing is
 * written to a sheet or a page. Run: node output/research-build/2026-11-17-job-statements-replay.js
 * (live classifier calls, cents)
 */
const fs = require('fs');
const path = require('path');
const rc = require('/root/GodWorld/lib/reflectionClassifier');
const dm = require('/root/GodWorld/utilities/citizenDialMap');
const SHARE = 0.225;
const all = JSON.parse(fs.readFileSync(path.join(__dirname, '2026-11-17-job-statements-rows.json'), 'utf8'));
const strip = (t) => String(t).replace(/^datawake:\s*/i, '').replace(/^stated:\s*(\[[^\]]*\]\s*)?([^—]{1,60}—\s*)?/i, '').trim();
const lines = all.filter((r) => r.daypart === 'CIVIC' || r.daypart === 'journal' || r.kind === 'directive-run')
  .map((r) => ({ pop: r.pop, name: r.name, seat: r.seat, day: r.day, kind: r.daypart === 'CIVIC' ? r.kind : (r.daypart || r.kind), text: strip(r.text) }));
const sitMap = new Map();
for (const l of lines) {
  const k = l.pop + '|' + l.day + '|' + l.kind;
  if (!sitMap.has(k)) sitMap.set(k, { pop: l.pop, name: l.name, seat: l.seat, day: l.day, kind: l.kind, n: 0, parts: [] });
  const s = sitMap.get(k); s.n++; s.parts.push(l.text);
}
const sittings = [...sitMap.values()].map((s) => Object.assign(s, { text: s.parts.join('\n') }));

async function classifyAll(items) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const it = items[next++];
      let cls = await rc.classifyTripleReflection_(it.text.slice(0, 6000), []);
      if (/^\[err\]/.test(cls.raw || '')) { await new Promise((ok) => setTimeout(ok, 4000)); cls = await rc.classifyTripleReflection_(it.text.slice(0, 6000), []); }
      it.event = cls.event || ''; it.affect = cls.affect || ''; it.err = /^\[err\]/.test(cls.raw || '') ? cls.raw : '';
      it.fx = dm.nudgesForReflection_(it.event, it.affect, 1, '');
    }
  }
  await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
}
function report(label, items) {
  const ok = items.filter((o) => !o.err);
  const count = (f) => { const m = {}; ok.forEach((o) => { const k = f(o); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '); };
  console.log('\n== ' + label + ': ' + items.length + ' reads, ' + (items.length - ok.length) + ' errors');
  console.log('event :', count((o) => o.event || '(none)'));
  console.log('mood  :', count((o) => o.affect || '(none)'));
  console.log('pair  :', count((o) => (o.event || '-') + '|' + (o.affect || '-')));
  console.log('by kind, moves a dial / moves nothing:', count((o) => o.kind + ':' + (Object.keys(o.fx).some((d) => o.fx[d]) ? 'moves' : 'nothing')));
  const t = {};
  ok.forEach((o) => { for (const d of Object.keys(o.fx)) { if (!o.fx[d]) continue; t[d] = t[d] || { up: 0, down: 0, net: 0 }; t[d][o.fx[d] > 0 ? 'up' : 'down']++; t[d].net += o.fx[d] * SHARE; } });
  console.log('dial: reads up / down, net permanent points before room scaling');
  Object.keys(t).forEach((d) => console.log('  ' + d.padEnd(12) + t[d].up + ' / ' + t[d].down + '   ' + t[d].net.toFixed(1)));
  // per speaker, first full week (11-09..11-15)
  const per = {};
  ok.filter((o) => o.day <= '2026-11-15').forEach((o) => { const p = per[o.pop] = per[o.pop] || { name: o.name, seat: o.seat, n: 0, drive: 0, composure: 0, other: 0 };
    p.n++; for (const d of Object.keys(o.fx)) { const v = o.fx[d] * SHARE; if (d === 'drive') p.drive += v; else if (d === 'composure') p.composure += v; else p.other += v; } });
  console.log('per speaker, week of 11-09..11-15: reads, drive, composure, other dials (permanent points, before room scaling)');
  Object.keys(per).sort((a, b) => per[b].n - per[a].n).forEach((k) => { const p = per[k]; console.log('  ' + (p.name + ' [' + p.seat + ']').padEnd(52) + String(p.n).padStart(3) + '  drive ' + p.drive.toFixed(1).padStart(5) + '  composure ' + p.composure.toFixed(1).padStart(5) + '  other ' + p.other.toFixed(1).padStart(5)); });
}
(async () => {
  await classifyAll(lines);
  await classifyAll(sittings);
  fs.writeFileSync(path.join(__dirname, '2026-11-17-job-statements-replay-out.json'), JSON.stringify({ lines, sittings: sittings.map((s) => { const c = Object.assign({}, s); delete c.parts; return c; }) }, null, 1));
  report('one read per saved line', lines);
  report('one read per sitting', sittings);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
