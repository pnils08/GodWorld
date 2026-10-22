// engine.310 bench judge (plan TASK step 4 + codex fold). Reads files only.
//   B3  vs B2  (pair 3 clean, stage 18): readers deep-equal except each hood's EventAttractiveness; spots deep-equal; LifeHistory
//               sha = B2's; fire record agrees (verdict, ok/state, persistErrors, newEE, carryForward, post).
//   B3t vs B3 : readers (EA included) + spots + fire record equal — the tap does not perturb the run.
//   B3t tap   : one EA_Diag C113 row; base 5 = city 3 + seed 2 + hook 0 + ev 0, residual 0; the city contributors are B2's col Q
//               names; per-phase draw marks deep-equal B2t's (no draw moved anywhere); per hood mod / pulseDelta / chaosEA (and the
//               inputs behind them) equal B2t's; stage arithmetic v0 = max(0, round(base × mod)) → v1 → saved reproduces the sheet.
//   Prediction: B2t's mod / pulseDelta / chaosEA with base 5 give B3's saved EA per hood exactly.
// usage: node 2026-10-21-e310-check.js  → 2026-10-21-e310-check.json; exit 1 on any miss
const fs = require('fs');
const D = '/root/GodWorld/output/engine-sheet/';
const rd = (f) => JSON.parse(fs.readFileSync(D + f, 'utf8'));
const readers = l => rd(`2026-10-21-e306-readers-${l}-c113.json`);
const spots = l => rd(`2026-10-21-e306-spots-${l}-c113.json`);
const fires = fs.readFileSync(D + '2026-10-19-benchfires.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const fire = label => fires.filter(f => f.label === label).pop();
const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.label; return c; };
const noEA = o => { const c = strip(o); Object.keys(c.hoods).forEach(h => delete c.hoods[h].event); return c; };
const r2 = n => Math.round(n * 100) / 100;
const J = JSON.stringify;
const fails = [];
const out = {};

const diffKeys = (a, b, what) => Object.keys(a).forEach(k => { if (J(a[k]) !== J(b[k])) fails.push(`${what}.${k} differs`); });
const pick = f => J([f.verdict, f.resp && f.resp.ok, f.resp && f.resp.state, f.resp && f.resp.persistErrors, f.newEE,
  f.resp && f.resp.carryForward, f.post]);

const rB2 = readers('B2'), rB3 = readers('B3'), rB3t = readers('B3t');
const sB2 = spots('B2'), sB3 = spots('B3'), sB3t = spots('B3t');
const fB2 = fire('e306B2'), fB3 = fire('e310B3'), fB3t = fire('e310B3t');

// B3 vs B2
if (rB3.lifeHistory.linesSha256.slice(0, 16) !== 'bb0ac98b0284f1cd') fails.push('B3 LifeHistory sha ' + rB3.lifeHistory.linesSha256.slice(0, 16));
diffKeys(noEA(rB2), noEA(rB3), 'B3 readers (EA aside)');
diffKeys(strip(sB2), strip(sB3), 'B3 spots');
if (!fB2 || !fB3) fails.push('fire record missing B2/B3'); else if (pick(fB2) !== pick(fB3)) fails.push('B3 fire record differs: ' + pick(fB3));

// B3t vs B3
diffKeys(strip(rB3), strip(rB3t), 'B3t readers');
diffKeys(strip(sB3), strip(sB3t), 'B3t spots');
if (!fB3t) fails.push('fire record missing B3t'); else if (fB3 && pick(fB3) !== pick(fB3t)) fails.push('B3t fire record differs: ' + pick(fB3t));

// B3t tap
const P = (s, w) => { try { return JSON.parse(s); } catch (e) { fails.push(w + ' cell not JSON (truncated?)'); return null; } };
const diag = (f) => { const d = rd(f); if (d.rows.length !== 1) fails.push(f + ' C113 rows ' + d.rows.length); const r = d.rows[0] || [];
  return { totals: P(r[1], 'Totals'), contrib: P(r[2], 'Contrib'), hoods: P(r[3], 'Hoods'), marks: P(r[4], 'Marks'), pre5: P(r[5], 'Pre5') }; };
const t2 = diag('2026-10-21-e306-eadiag-B2t-c113.json'), t3 = diag('2026-10-21-e310-eadiag-B3t-c113.json');
const WANT_HITS = { city: 3, evDomain: 0, evText: 0, seed: 2, hook: 0 };
if (t3.totals.base !== 5) fails.push('B3t base ' + t3.totals.base);
if (J(t3.totals.hits) !== J(WANT_HITS)) fails.push('B3t hits ' + J(t3.totals.hits));
if (t3.totals.residual !== 0) fails.push('B3t residual ' + t3.totals.residual);
const B2_CITY = ['Jack London Neighborhood Stabilization Panel', 'Jack London Cozy Nights Film Series', 'The Dillon Family Block Party'];
const city = t3.contrib.filter(c => c[0] === 'city').map(c => c[4]);
if (J(city) !== J(B2_CITY)) fails.push('B3t city contributors ' + J(city));
const seeds = t3.contrib.filter(c => c[0] === 'seed').map(c => c[3] + ':' + c[4]);
if (seeds.length !== 2 || !seeds.every(s => s.indexOf('community:') === 0)) fails.push('B3t seed contributors ' + J(seeds));
if (J(t3.marks) !== J(t2.marks)) {
  const i = t3.marks.findIndex((m, k) => J(m) !== J(t2.marks[k]));
  fails.push('B3t draw marks differ from B2t at ' + J(t3.marks[i]) + ' vs ' + J(t2.marks[i]));
}
const SAME = ['label', 'sportsZone', 'holiday', 'profileMod', 'holidayMod', 'mod', 'pulseAttr', 'pulseEvents', 'pulseDelta', 'chaosEA'];
const stages = (base, x) => {
  const v0 = Math.max(0, Math.round(base * x.mod));
  const v1 = x.pulseDelta !== null ? r2(Math.max(0, v0 + x.pulseDelta)) : v0;
  const sv = x.chaosEA !== null ? r2(Math.max(0, v1 + x.chaosEA)) : v1;
  return [v0, v1, sv];
};
out.hoods = {};
Object.keys(rB3.hoods).forEach(h => {
  const a = t2.hoods[h], b = t3.hoods[h];
  if (!a || !b || a.tapError || b.tapError) { fails.push(h + ': no tap row'); return; }
  SAME.forEach(k => { if (J(a[k]) !== J(b[k])) fails.push(`${h}: ${k} B2t ${J(a[k])} vs B3t ${J(b[k])}`); });
  const [v0, v1, sv] = stages(t3.totals.base, b);
  if (v0 !== b.v0 || v1 !== b.v1 || sv !== b.saved) fails.push(`${h}: stage arithmetic ${J([v0, b.v0, v1, b.v1, sv, b.saved])}`);
  if (b.saved !== rB3t.hoods[h].event) fails.push(`${h}: tap saved ${b.saved} != B3t sheet ${rB3t.hoods[h].event}`);
  const pred = stages(5, a)[2];
  if (pred !== rB3.hoods[h].event) fails.push(`${h}: predicted ${pred} != B3 sheet ${rB3.hoods[h].event}`);
  out.hoods[h] = { mod: b.mod, B2: rB2.hoods[h].event, B3: rB3.hoods[h].event, predicted: pred };
});

out.totals = { B2t: t2.totals, B3t: t3.totals };
out.contrib = { B2t: t2.contrib, B3t: t3.contrib };
out.fails = fails;
out.accept = fails.length === 0;
fs.writeFileSync(D + '2026-10-21-e310-check.json', JSON.stringify(out, null, 1));
console.log((out.accept ? 'ACCEPT' : 'FAIL') + ` | base B2t ${t2.totals.base} → B3t ${t3.totals.base} ${J(t3.totals.hits)}`);
Object.keys(out.hoods).forEach(h => console.log(`  ${h}: ${out.hoods[h].B2} → ${out.hoods[h].B3} (mod ${out.hoods[h].mod})`));
fails.forEach(f => console.log('  MISS ' + f));
process.exit(out.accept ? 0 : 1);
