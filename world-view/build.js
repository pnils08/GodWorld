// Read-only: turns last week's beat dump into one self-contained page. Writes nothing to the project.
// node world-view/build.js [dest]      WX=rain|fog|overcast overrides the week's weather for a look-test.
const fs = require('fs');
const path = require('path');
const BEATS = path.join(__dirname, '..', 'output', 'beats') + path.sep;
const rd = f => fs.readFileSync(BEATS + f + '.jsonl', 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

const meta = JSON.parse(fs.readFileSync(BEATS + 'meta.json', 'utf8'));
const CYCLE = String(meta.cycle);

function kindOf(tag) {
  const t = tag.split('|')[0];
  if (/^(Retirement|Promotion|Graduation|PostCareer)/.test(t)) return ['m', 0];
  if (/^(Relocation|Sports-Moved)/.test(t)) return ['v', 1];
  if (/^(Household|Relationship|Alliance)/.test(t)) return ['t', 2];
  if (/^(Strain|Friction|Rivalry|BoundaryCompromised|Recovering)/.test(t)) return ['h', 3];
  if (/^(Work|Faith|Education|Cultural|Community|BoundaryKept|Maneuver)/.test(t)) return ['p', 4];
  if (/^(Advancement|Media|Undocked-Audience|Reputation|Business-Gain|QoL)/.test(t)) return ['p', 9];
  if (/^Sports/.test(t)) return ['s', 5];
  if (/-Down-/.test(t)) return ['h', 6];
  return ['p', 6];
}

const life = rd('LifeHistory_Log').filter(r => String(r.Cycle) === CYCLE && r.Neighborhood && r.Name && r.EventText);
const biz = rd('Business_Ledger');
const demo = rd('Neighborhood_Demographics');
const weather = rd('Cycle_Weather').filter(r => String(r.CycleID) === CYCLE)[0] || {};

const byHood = {};
life.forEach(r => {
  const h = (byHood[r.Neighborhood] = byHood[r.Neighborhood] || { lines: 0, people: {} });
  h.lines++;
  const [k, pr] = kindOf(r.EventTag);
  const p = (h.people[r.POPID] = h.people[r.POPID] || { n: r.Name, c: 0, pr: 99 });
  p.c++;
  if (pr < p.pr) { p.pr = pr; p.k = k; p.x = r.EventText; }
});

const CAP = 110;
const hoods = Object.keys(byHood).map(name => {
  const h = byHood[name];
  const all = Object.values(h.people);
  const shown = all.slice().sort((a, b) => a.pr - b.pr || b.c - a.c).slice(0, CAP);
  const d = demo.find(x => x.Neighborhood === name);
  return {
    name,
    lines: h.lines,
    total: all.length,
    people: shown.map(p => ({ n: p.n, k: p.k, x: p.x, c: p.c, pr: p.pr })),
    biz: biz.filter(b => b.Neighborhood === name).map(b => ({ id: b.BIZ_ID, n: b.Name, s: b.Sector, e: Number(b.Employee_Count) || 1 })),
    pop: d ? { a: +d.Adults, st: +d.Students, se: +d.Seniors } : null
  };
}).sort((a, b) => (b.name === 'Grand Lake') - (a.name === 'Grand Lake') || b.lines - a.lines);

// ---------- neighborhood character: every drawing choice hangs off a phrase in the canon file ----------
const STYLE = require('./hoods.js');
const canon = fs.readFileSync(path.join(__dirname, '..', 'docs', 'canon', 'INSTITUTIONS.md'), 'utf8');
const missing = [];
hoods.forEach(h => {
  const st = STYLE[h.name];
  if (!st) { missing.push('no drawing entry for neighborhood: ' + h.name); return; }
  if (!canon.includes(st.q)) missing.push(h.name + ': phrase not in INSTITUTIONS.md: ' + st.q);
  (st.set || []).forEach(k => { const n = STYLE.LANDMARKS[k]; if (n && !canon.includes(n)) missing.push(h.name + ': landmark not in INSTITUTIONS.md: ' + n); });
});
if (missing.length) { console.error(missing.join('\n')); process.exit(1); }

// ---------- parcels ----------
// A street is a row of parcels with stable ids. A business sits on one parcel, chosen here, not at random in the
// page: a ledger row that is a place in its own right (a stadium, a theater, city hall, a house of worship) gets
// its own kind of parcel; the rest take the street's ordinary parcels, biggest employer on the widest lot.
// When the ledger carries a parcel per business, read it here and skip the choosing.
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const DEF = { wall: 'stucco', tone: [30, 0.15, 0.5], h: [4, 9], w: [6, 11], gap: [0.6, 2.1], lit: 0.45, fill: 'box', trees: 0, slope: 0, neon: 0, set: [] };
// [type, half-length of street it needs, sits at the far end instead of on a side]
function placeType(b) {
  if (/As Stadium/i.test(b.s)) return ['stadium', 0, true];
  if (b.n === 'Oakland Oaks') return ['arena', 27];
  if (/^Stadium/i.test(b.s)) return ['coliseum', 30];
  if (/Municipal Government/i.test(b.s)) return ['cityhall', 11];
  if (/Theater \/|Movie Theater/i.test(b.s)) return ['theater', 10];
  if (/Cultural Center/i.test(b.s)) return ['cultural', 10];
  if (/Saloon/i.test(b.s)) return ['saloon', 6];
  if (/Faith|Church|Synagogue/i.test(b.s)) return ['faith', 8];
  if (/Farmers Market/i.test(b.s)) return ['market', 0];
  if (/Transit Hub/i.test(b.n)) return ['station', 7];
  if (b.n === 'Port of Oakland') return ['port', 0];
  return null;
}
const r2 = x => Math.round(x * 100) / 100;
function layout(H) {
  const ST = Object.assign({}, DEF, STYLE[H.name]);
  const r = rng(hash(H.name + '|parcels')), rr = a => a[0] + r() * (a[1] - a[0]);
  const water = ST.water ? ST.water.side : 0, sides = water ? [-water] : [-1, 1];
  const sideStyle = s => (s < 0 && ST.left ? Object.assign({}, ST, ST.left) : ST);
  const places = [], ordinary = [];
  H.biz.forEach((b, i) => { const t = placeType(b); if (t) places.push({ i, type: t[0], half: t[1], end: !!t[2] }); else ordinary.push(i); });
  const onStreet = places.filter(p => p.half > 0);
  const need = onStreet.reduce((a, p) => a + p.half * 2 + 6, 0);
  const L = Math.max(110, H.people.length * 2.2 + 30, (ordinary.length * 15 + need) / sides.length + 40);
  // places take their ground first, spread down the street, alternating sides
  onStreet.forEach((p, k) => {
    p.z = r2(-L * (k + 1) / (onStreet.length + 1));
    p.s = p.type === 'station' ? 0 : p.type === 'coliseum' && !water ? -1 : sides[k % sides.length];
  });
  const held = (s, a, b) => onStreet.some(p => (p.s === 0 || p.s === s) && a < p.z + p.half && b > p.z - p.half);
  const parcels = [];
  sides.forEach(s => {
    const st = sideStyle(s); let z = 42, k = 0;
    while (z > -L - 30) { const w = rr(st.w), g = rr(st.gap); if (!held(s, z - w, z)) parcels.push({ id: slug(H.name) + '-' + (s < 0 ? 'w' : 'e') + String(++k).padStart(2, '0'), s, z: z - w / 2, w, st }); z -= w + g; }
  });
  const cand = parcels.filter(p => p.z < 4 && p.z > -L + 6);
  const K = Math.min(ordinary.length, cand.length);
  if (K < ordinary.length) console.warn(H.name + ': ' + (ordinary.length - K) + ' businesses without a parcel');
  const chosen = []; for (let k = 0; k < K; k++) chosen.push(cand[Math.floor((k + 0.5) * cand.length / K)]);
  chosen.sort((a, b) => b.w - a.w);
  ordinary.slice().sort((a, b) => H.biz[b].e - H.biz[a].e || (H.biz[a].id < H.biz[b].id ? -1 : 1)).slice(0, K).forEach((bi, k) => { chosen[k].b = bi; });
  const station = onStreet.find(p => p.type === 'station');
  const out = parcels.map(p => {
    const st = p.st, b = p.b != null ? H.biz[p.b] : null, near = station && Math.abs(p.z - station.z) < 38;
    const o = { id: p.id, s: p.s, z: r2(p.z), w: r2(p.w) };
    if (st.fill === 'house' && !b) { o.k = 'h'; o.h = r2(rr(st.h)); o.d = r2(7 + r() * 2); o.tone = st.tone; o.lit = st.lit; o.tr = st.trees; return o; }
    o.k = 'b'; o.d = r2(8 + r() * 5); o.wall = near ? 'glass' : st.wall; o.tone = near ? [200, 0.2, 0.6] : st.tone;
    o.h = r2(near ? 15 + r() * 8 : b ? (st.fill === 'house' ? 4.6 + r() * 1.4 : st.h[0] + Math.min(st.h[1] - st.h[0], Math.sqrt(b.e) * 1.3)) : rr(st.h));
    o.lit = near ? 0.45 : b ? Math.max(st.lit, 0.45) : st.lit; o.tr = st.trees; o.neon = st.neon;
    if (b) o.b = p.b;
    return o;
  });
  return { L: r2(L), water, slope: water ? 0 : ST.slope, parcels: out, places: places.map(p => ({ b: p.i, type: p.type, half: p.half, s: p.s, z: p.z, end: p.end })) };
}
hoods.forEach(h => { h.lay = layout(h); });

const wx = process.env.WX || '';
const data = {
  cycle: +CYCLE,
  weather: { type: wx || weather.Type || '', temp: weather.Temp || '', streak: weather.Streak || '', streakType: wx || weather.StreakType || '' },
  hoods,
  style: {},
  landmarks: STYLE.LANDMARKS
};
hoods.forEach(h => { data.style[h.name] = STYLE[h.name]; });

const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const places = fs.readFileSync(path.join(__dirname, 'places.js'), 'utf8');
if (!tpl.includes('/*__PLACES__*/')) { console.error('template has no places marker'); process.exit(1); }
const out = tpl.replace('/*__PLACES__*/', () => places).replace('/*__DATA__*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'));
const dest = process.argv[2] || path.join(__dirname, 'oakland-week.html');
fs.writeFileSync(dest, out);
console.log('hoods', hoods.length, 'people shown', hoods.reduce((s, h) => s + h.people.length, 0), 'of', hoods.reduce((s, h) => s + h.total, 0),
  'lines', hoods.reduce((s, h) => s + h.lines, 0), 'parcels', hoods.reduce((s, h) => s + h.lay.parcels.length, 0), 'bytes', out.length);
console.log(hoods.map(h => h.name + ': ' + h.lay.places.map(p => p.type).join(',')).filter(s => !/: $/.test(s)).join('\n'));
