// Read-only projection: replay each citizen's own recent weeks forward under today's dial rules
// and under a few what-if speeds. Local ledger copies only. No sheet access, no writes.
const fs = require('fs');
const { execSync } = require('child_process');
global.Logger = { log() {} };
const E = require('/root/GodWorld/utilities/citizenMemory.js');
Object.keys(E).forEach((k) => { global[k] = E[k]; });
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_; global.nudgesForReflection_ = M.nudgesForReflection_; global.baseTag_ = M.baseTag_;
global.queueCellIntent_ = () => ({});
const C = require('/root/GodWorld/utilities/compressLifeHistory.js');
const ROOT = '/root/GodWorld';
const DIALS = E.DIALS, D8 = DIALS.filter((d) => d !== 'fandom');
const L = (t) => t.split('\n').filter(Boolean).map((l) => JSON.parse(l));
const NOW = 116;

// seeded rng (mulberry32) — a projection, repeatable
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const rows = L(fs.readFileSync(`${ROOT}/output/simulation_ledger_snapshot.jsonl`, 'utf8'));
const prev = {}; L(execSync(`git -C ${ROOT} show d722b6b3c:output/simulation_ledger_snapshot.jsonl`, { maxBuffer: 1 << 28 }).toString()).forEach((r) => { try { prev[r.POPID] = JSON.parse(r.DialState); } catch (e) {} });
const refl115 = {}; L(fs.readFileSync(`${ROOT}/output/beats/Reflection_Intake.jsonl`, 'utf8')).filter((r) => String(r.Cycle) === '115').forEach((r) => { refl115[r.POPID] = 1; });

// each citizen's own weeks, from the stamped lines in their LifeHistory cell
const weeksOf = {}; const pool = []; let sample = null;
for (const r of rows) {
  const ents = r.LifeHistory ? C.parseLifeHistoryEntries_(String(r.LifeHistory)).entries : [];
  const by = {}; let min = Infinity;
  for (const e of ents) {
    if (e.cycle == null || e.cycle <= 0 || e.cycle > NOW || e.tag === 'CareerState' || e.tag === 'HospitalIncomeState') continue;
    if (e.cycle < min) min = e.cycle;
    const fx = M.nudgesForEvent_(e.tag, 1, e.text);
    by[e.cycle] = by[e.cycle] || {};
    for (const d in fx) if (fx[d]) by[e.cycle][d] = (by[e.cycle][d] || 0) + fx[d];
  }
  if (!sample && ents.length > 5) sample = ents.slice(-3).map((e) => `${e.cycle} [${e.tag}] ${String(e.text).slice(0, 60)}`);
  const wk = [];
  if (min !== Infinity) for (let cy = Math.max(min + 1, NOW - 11); cy <= NOW; cy++) wk.push(by[cy] || {});
  weeksOf[r.POPID] = { wk, w116: by[NOW] || {} };
  wk.forEach((w) => pool.push(w));
}
console.log('sample cell lines:', sample);
const nW = Object.values(weeksOf).map((v) => v.wk.length);
console.log('citizens', rows.length, '| own weeks available per citizen: min', Math.min(...nW), 'median', nW.slice().sort((a, b) => a - b)[Math.floor(nW.length / 2)], 'max', Math.max(...nW), '| citizens with <3 weeks:', nW.filter((n) => n < 3).length, '| pooled weeks', pool.length);
const emptyShare = pool.filter((w) => !Object.keys(w).length).length / pool.length;
console.log('share of citizen-weeks with no dial-moving line:', (100 * emptyShare).toFixed(0) + '%');

// one-step check: C115 state + this citizen's C116 lines under the real fold functions vs the real C116 state
{
  let n = 0, exact = 0, close = 0; const worst = [];
  for (const r of rows) {
    const p = r.POPID; if (!prev[p] || !prev[p].base || refl115[p]) continue;
    const c = E.deserialize_(prev[p]);
    E.settleCycle_(c); E.applyCycleEffects_(c, weeksOf[p].w116);
    const act = JSON.parse(r.DialState); let maxd = 0;
    DIALS.forEach((d) => { maxd = Math.max(maxd, Math.abs(c.base[d] - (act.base[d] == null ? 50 : act.base[d]))); });
    n++; if (maxd < 0.01) exact++; if (maxd < 0.5) close++;
  }
  console.log(`\nharness check, C115 -> C116 on ${n} citizens with no reflection: permanent dials reproduced exactly ${exact} (${(100 * exact / n).toFixed(0)}%), within half a point ${close} (${(100 * close / n).toFixed(0)}%)`);
}

function step(c, fx, rule, rand) {
  E.settleCycle_(c);
  const net = {};
  for (const d in fx) {
    let v = fx[d] * rule.k;
    if (rule.flip && Math.abs(fx[d]) <= 2 && fx[d] > 0 && rand() < rule.flip) v = -v;   // what-if: routine up-lines sometimes read down
    net[d] = v;
  }
  if (rule.f > 0) {
    for (const d in net) { c.base[d] = Math.max(0, Math.min(100, c.base[d] + E.roomScaled_(E.current_(c, d), net[d] * rule.f))); }
    const rest = {}; for (const d in net) rest[d] = net[d] * (1 - rule.f);
    E.applyCycleEffects_(c, rest);
  } else E.applyCycleEffects_(c, net);
}
const band = (v) => E.bandIndex_(v) - 2;
function measure(cs) {
  const n = cs.length; let allMid = 0, anyNeg = 0, pinned = 0, crossed = 0; const vec = {}; let offSum = 0; const mean = {}; D8.forEach((d) => mean[d] = 0);
  cs.forEach(({ c, start }) => {
    const b = D8.map((d) => band(c.base[d]));
    if (b.every((x) => x === 0)) allMid++;
    if (b.some((x) => x < 0)) anyNeg++;
    if (D8.some((d) => c.base[d] >= 95 || c.base[d] <= 5)) pinned++;
    if (D8.some((d, i) => band(start[d]) !== b[i])) crossed++;
    offSum += b.filter((x) => x !== 0).length; vec[b.join(',')] = (vec[b.join(',')] || 0) + 1;
    D8.forEach((d) => mean[d] += c.base[d] / n);
  });
  return { allMid: (100 * allMid / n).toFixed(0) + '%', crossedABand: (100 * crossed / n).toFixed(0) + '%', anyLowBand: (100 * anyNeg / n).toFixed(0) + '%', pinned5or95: (100 * pinned / n).toFixed(0) + '%', distinctPeople: Object.keys(vec).length, soc: mean.sociability.toFixed(0), comp: mean.composure.toFixed(0), drive: mean.drive.toFixed(0) };
}
const RULES = [
  ['today', { k: 1, f: 0 }],
  ['lines x2', { k: 2, f: 0 }],
  ['lines x3', { k: 3, f: 0 }],
  ['a quarter of each week bakes in', { k: 1, f: 0.25 }],
  ['x2 and a quarter bakes in', { k: 2, f: 0.25 }],
  ['x3 and a quarter bakes in', { k: 3, f: 0.25 }],
  ['x2, quarter bakes in, 3 in 10 routine ups read down', { k: 2, f: 0.25, flip: 0.3 }],
  ['x3, quarter bakes in, 3 in 10 routine ups read down', { k: 3, f: 0.25, flip: 0.3 }],
];
console.log('\nstart (C116, permanent dials):', JSON.stringify(measure(rows.map((r) => { const ds = JSON.parse(r.DialState); const c = E.deserialize_(ds); return { c, start: Object.assign({}, c.base) }; }))));
for (const [name, rule] of RULES) {
  const rand = rng(116);
  const cs = rows.map((r) => { const c = E.deserialize_(JSON.parse(r.DialState)); return { c, start: Object.assign({}, c.base), wk: weeksOf[r.POPID].wk.length >= 3 ? weeksOf[r.POPID].wk : null }; });
  const out = {};
  for (let w = 1; w <= 52; w++) {
    cs.forEach((o) => { const src = o.wk || pool; step(o.c, src[Math.floor(rand() * src.length)], rule, rand); });
    if (w === 10 || w === 26 || w === 52) out[w] = measure(cs);
  }
  console.log(`\n${name}`); for (const w of [10, 26, 52]) console.log(`  after ${w} weeks:`, JSON.stringify(out[w]));
}
