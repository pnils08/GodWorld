// engine.306 gate-3 FIX steps 2-3 (codex plan review 2026-10-21 items 2-3): judge the tapped pair against the clean pair, then
// decompose the A→B EventAttractiveness change. Reads files only.
// Acceptance per leg (tapped vs clean): LifeHistory sha = the known leg sha; the extended readers and the spots receipt deep-equal
// (label aside); the bench fire record agrees (verdict, ok/state, persistErrors, newEE, carryForward, post counters); exactly one
// EA_Diag C113 row; tap recount residual 0; per hood the stage arithmetic reproduces the saved value with no residual
// (v0 = max(0, round(base × mod)); v1 = round2(max(0, v0 + pulseDelta)) when a pulse; saved = round2(max(0, v1 + chaosEA)) when a
// fold) and saved = the readers' EventAttractiveness. Any miss → ACCEPT false, and the decomposition is not used.
// Decomposition: base totals and hit kinds; contributors only in A / only in B by identity; the per-phase rng-draw marks (first
// phase whose draws-before differ; phases whose own draw count differs; worldEvents length per phase); the Phase-5 event snapshot;
// per hood Δsaved = Δ(v0) + Δ(v1 − v0) + Δ(saved − v1).
// usage: node 2026-10-21-e306-eacheck.js A2 A2t B2 B2t  → 2026-10-21-e306-eacheck.json
const fs = require('fs');
const O = '/root/GodWorld/output/engine-sheet/2026-10-21-e306-';
const [cA, tA, cB, tB] = process.argv.slice(2);
const SHA = { [cA]: '130462736b782fbe', [cB]: 'bb0ac98b0284f1cd' };
const rd = (k, l) => JSON.parse(fs.readFileSync(O + k + '-' + l + '-c113.json', 'utf8'));
const fires = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-10-19-benchfires.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const fire = l => fires.filter(f => f.label === 'e306' + l).pop();
const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.label; return c; };
const r2 = n => Math.round(n * 100) / 100;
const out = { accept: {}, legs: {} };

function judge(clean, tapped) {
  const fails = [];
  const rc = rd('readers', clean), rt = rd('readers', tapped);
  if (rt.lifeHistory.linesSha256.slice(0, 16) !== SHA[clean]) fails.push('LifeHistory sha ' + rt.lifeHistory.linesSha256.slice(0, 16) + ' != ' + SHA[clean]);
  if (JSON.stringify(strip(rc)) !== JSON.stringify(strip(rt))) {
    Object.keys(rc).forEach(k => { if (k !== 'label' && JSON.stringify(rc[k]) !== JSON.stringify(rt[k])) fails.push('readers.' + k + ' differs'); });
  }
  const sc = rd('spots', clean), st = rd('spots', tapped);
  if (JSON.stringify(strip(sc)) !== JSON.stringify(strip(st))) {
    Object.keys(sc).forEach(k => { if (k !== 'label' && JSON.stringify(sc[k]) !== JSON.stringify(st[k])) fails.push('spots.' + k + ' differs'); });
  }
  const fc = fire(clean), ft = fire(tapped);
  if (!fc || !ft) fails.push('fire record missing');
  else {
    const pick = f => JSON.stringify([f.verdict, f.resp && f.resp.ok, f.resp && f.resp.state, f.resp && f.resp.persistErrors, f.newEE, f.resp && f.resp.carryForward, f.post]);
    if (pick(fc) !== pick(ft)) fails.push('fire record differs: ' + pick(ft));
  }
  const dg = rd('eadiag', tapped);
  if (dg.rows.length !== 1) fails.push('EA_Diag C113 rows ' + dg.rows.length);
  const row = dg.rows[0] || [];
  const P = s => { try { return JSON.parse(s); } catch (e) { fails.push('EA_Diag cell not JSON (truncated?)'); return null; } };
  const d = { totals: P(row[1]), contrib: P(row[2]), hoods: P(row[3]), marks: P(row[4]), pre5: P(row[5]) };
  if (d.totals && d.totals.residual !== 0) fails.push('tap recount residual ' + d.totals.residual);
  const hoodNames = Object.keys(rt.hoods);
  if (d.hoods) hoodNames.forEach(h => {
    const x = d.hoods[h];
    if (!x || x.tapError) { fails.push(h + ': no tap row ' + (x && x.tapError || '')); return; }
    const v0 = Math.max(0, Math.round(d.totals.base * x.mod));
    const v1 = x.pulseDelta !== null ? r2(Math.max(0, x.v0 + x.pulseDelta)) : x.v0;
    const sv = x.chaosEA !== null ? r2(Math.max(0, x.v1 + x.chaosEA)) : x.v1;
    if (v0 !== x.v0 || v1 !== x.v1 || sv !== x.saved) fails.push(h + ': stage arithmetic ' + JSON.stringify([v0, x.v0, v1, x.v1, sv, x.saved]));
    if (x.saved !== rt.hoods[h].event) fails.push(h + ': tap saved ' + x.saved + ' != sheet ' + rt.hoods[h].event);
  });
  out.accept[tapped] = { pass: fails.length === 0, fails };
  out.legs[tapped] = d;
  console.log(tapped + ' vs ' + clean + ': ' + (fails.length ? 'FAIL\n  ' + fails.join('\n  ') : 'ACCEPT'));
  return fails.length === 0;
}

const okA = judge(cA, tA), okB = judge(cB, tB);
const A = out.legs[tA], B = out.legs[tB];
if (A && B && A.totals && B.totals) {
  out.totals = { [tA]: A.totals, [tB]: B.totals };
  const key = c => c[0] + '|' + c[2] + '|' + c[3] + '|' + c[4];
  const ka = (A.contrib || []).map(key), kb = (B.contrib || []).map(key);
  out.contribOnlyA = ka.filter(k => kb.indexOf(k) < 0); out.contribOnlyB = kb.filter(k => ka.indexOf(k) < 0);
  const ma = A.marks || [], mb = B.marks || [];
  out.marks = { lenA: ma.length, lenB: mb.length, sameSequence: JSON.stringify(ma.map(m => m[0])) === JSON.stringify(mb.map(m => m[0])) };
  const firstDiff = ma.findIndex((m, i) => !mb[i] || m[0] !== mb[i][0] || m[1] !== mb[i][1]);
  out.marks.firstDrawsBeforeDiffer = firstDiff >= 0 ? { i: firstDiff, a: ma[firstDiff], b: mb[firstDiff], prev: ma[firstDiff - 1] } : null;
  out.marks.ownDrawsDiffer = ma.map((m, i) => [m, mb[i]]).filter(p => p[1] && p[0][0] === p[1][0] && (p[0][3] - p[0][1]) !== (p[1][3] - p[1][1]))
    .map(p => [p[0][0], p[0][3] - p[0][1], p[1][3] - p[1][1]]);
  out.marks.worldEventsDiffer = ma.map((m, i) => [m, mb[i]]).filter(p => p[1] && p[0][0] === p[1][0] && (p[0][2] !== p[1][2] || p[0][4] !== p[1][4]))
    .map(p => [p[0][0], p[0][2] + '→' + p[0][4], p[1][2] + '→' + p[1][4]]);
  out.pre5 = { a: (A.pre5 || []).length, b: (B.pre5 || []).length, onlyA: (A.pre5 || []).filter(x => (B.pre5 || []).indexOf(x) < 0), onlyB: (B.pre5 || []).filter(x => (A.pre5 || []).indexOf(x) < 0) };
  out.hoods = {};
  Object.keys(B.hoods || {}).sort().forEach(h => {
    const a = A.hoods[h] || {}, b = B.hoods[h] || {};
    const dv0 = r2(b.v0 - a.v0), dp = r2((b.v1 - b.v0) - (a.v1 - a.v0)), dc = r2((b.saved - b.v1) - (a.saved - a.v1)), ds = r2(b.saved - a.saved);
    out.hoods[h] = { saved: [a.saved, b.saved, ds], baseStage: dv0, pulseStage: dp, chaosStage: dc, residual: r2(ds - dv0 - dp - dc), mod: [a.mod, b.mod] };
  });
  console.log('base ' + A.totals.base + ' → ' + B.totals.base + ' | n ' + JSON.stringify(A.totals.n) + ' → ' + JSON.stringify(B.totals.n) + ' | hits ' + JSON.stringify(A.totals.hits) + ' → ' + JSON.stringify(B.totals.hits));
  console.log('contributors only A ' + out.contribOnlyA.length + ', only B ' + out.contribOnlyB.length);
  console.log('marks same sequence ' + out.marks.sameSequence + '; first draws-before differ: ' + JSON.stringify(out.marks.firstDrawsBeforeDiffer));
  console.log('phases with own draw count differing: ' + out.marks.ownDrawsDiffer.length + ' ' + JSON.stringify(out.marks.ownDrawsDiffer.slice(0, 12)));
  console.log('phases with worldEvents length differing: ' + JSON.stringify(out.marks.worldEventsDiffer));
  console.log('Phase-5 snapshot ' + out.pre5.a + ' vs ' + out.pre5.b + ', only A ' + out.pre5.onlyA.length + ', only B ' + out.pre5.onlyB.length);
  console.log(['hood', 'saved A→B', 'Δ', 'base-stage', 'pulse-stage', 'chaos-stage', 'residual'].join('\t'));
  Object.keys(out.hoods).forEach(h => { const v = out.hoods[h]; console.log([h, v.saved[0] + '→' + v.saved[1], v.saved[2], v.baseStage, v.pulseStage, v.chaosStage, v.residual].join('\t')); });
}
out.acceptBoth = okA && okB;
fs.writeFileSync(O + 'eacheck.json', JSON.stringify(out, null, 1));
console.log('ACCEPT both legs: ' + out.acceptBoth + ' → ' + O + 'eacheck.json');
