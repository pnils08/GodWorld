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
  if (/^(Retirement|Promotion|Graduation|PostCareer|Career-Hired)/.test(t)) return ['m', 0];
  if (/^QoL/.test(t)) return /-Down-/.test(t) ? ['h', 6] : ['p', 6];
  if (/^(Relocation|Sports-Moved)/.test(t)) return ['v', 1];
  if (/^(Household|Relationship|Alliance)/.test(t)) return ['t', 2];
  if (/^(Strain|Friction|Rivalry|BoundaryCompromised|Recovering)/.test(t)) return ['h', 3];
  if (/^(Work|Faith|Education|Cultural|Community|BoundaryKept|Maneuver)/.test(t)) return ['p', 4];
  if (/^(Advancement|Media|Undocked-Audience|Reputation|Business-Gain)/.test(t)) return ['p', 9];
  if (/^Sports/.test(t)) return ['s', 5];
  if (/-Down-/.test(t)) return ['h', 6];
  return ['p', 6];
}

if (!(Number(CYCLE) > 0)) { throw new Error('world-view: output/beats/meta.json has no valid cycle'); }
const isEvent = r => String(r.Cycle) === CYCLE && r.EventText && !/^CareerState/.test(r.EventTag || '');
const lifeAll = rd('LifeHistory_Log').filter(isEvent);
const life = lifeAll.filter(r => r.Neighborhood && r.Name);
const biz = rd('Business_Ledger');
const demo = rd('Neighborhood_Demographics');
const weather = rd('Cycle_Weather').filter(r => String(r.CycleID) === CYCLE)[0] || {};

const byHood = {};
life.forEach(r => {
  const h = (byHood[r.Neighborhood] = byHood[r.Neighborhood] || { lines: 0, people: {} });
  h.lines++;
  const [k, pr] = kindOf(r.EventTag);
  const p = (h.people[r.POPID] = h.people[r.POPID] || { id: r.POPID, n: r.Name, c: 0, pr: 99 });
  p.c++;
  if (pr < p.pr) { p.pr = pr; p.k = k; p.x = r.EventText; }
  (p.all = p.all || []).push([pr, k, r.EventText]);
});

// ---------- who each person is: sex, age band, role (ledger), and the last thing they said (reflections) ----------
const ledger = new Map(fs.readFileSync(path.join(__dirname, '..', 'output', 'simulation_ledger_snapshot.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(l => { const o = JSON.parse(l); return [o.POPID, o]; }));
// Same year and same bands the engine uses: simYearFromCycle_ (phase01-config/advanceSimulationCalendar.js)
// and deriveLifeState_ (phase05-citizens/citizenContextBuilder.js). If either changes there, change it here.
const SIM_YEAR = 2040 + (Math.ceil(Number(CYCLE) / 52) - 1);
function band(birthYear) {
  const by = Number(birthYear) || 0; if (!(by > 1900 && by < 2100)) return 'adult';
  const age = SIM_YEAR - by;
  return age <= 12 ? 'child' : age <= 17 ? 'teen' : age <= 22 ? 'youth' : age <= 35 ? 'youngAdult' : age <= 64 ? 'adult' : 'senior';
}
const SAID_HOW = { PRESS: 'to a reporter', CONVO: 'in conversation', DISCORD: 'in conversation', DEBATE: 'in debate', morning: 'in the morning', midday: 'at midday', afternoon: 'in the afternoon', evening: 'in the evening', night: 'at night', nightly: 'at night', work: 'at work' };
function trimSaid(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim(); if (s.length <= 300) return s;
  const cut = s.slice(0, 300), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return end > 120 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…';
}
const said = new Map();
rd('Reflection_Intake').forEach(r => {
  if (!r.ReflectionExcerpt || !(Number(r.Cycle) <= Number(CYCLE)) || /^(filed|graded):/i.test(r.ReflectionExcerpt)) return;
  const key = [Number(r.Cycle) || 0, /^20/.test(r.Timestamp) ? r.Timestamp : ''];
  if (!said.has(r.POPID)) said.set(r.POPID, []);
  said.get(r.POPID).push({ key, r });
});
said.forEach(list => list.sort((a, b) => b.key[0] - a.key[0] || (a.key[1] < b.key[1] ? 1 : a.key[1] > b.key[1] ? -1 : 0)));
const saidOne = s => ({ x: trimSaid(s.r.ReflectionExcerpt), c: Number(s.r.Cycle) || 0, how: SAID_HOW[s.r.Daypart] || '', mood: s.r.Affect || '' });
const households = new Map(rd('Household_Ledger').map(h => [h.HouseholdId, h]));
const nameOf = id => { const L = ledger.get(id); return L ? (L.Name || ((L.First || '') + ' ' + (L.Last || '')).trim()) : ''; };
const bizById = new Map(biz.map(x => [x.BIZ_ID, x]));
const runs = new Map(); // POPID -> businesses that name them as key personnel
biz.forEach(x => { (String(x.Key_Personnel || '').match(/POP-\d+/g) || []).forEach(id => { if (!runs.has(id)) runs.set(id, []); runs.get(id).push(x); }); });
function history(text) {
  return String(text || '').split('\n').map(l => /^(Y(\d+)C(\d+))\s+—\s+\[([^\]]+)\]\s+(.+)$/.exec(l.trim())).filter(m => m && (Number(m[2]) - 1) * 52 + Number(m[3]) < Number(CYCLE)).slice(-6).reverse().map(m => [m[1], m[5]]);
}
function who(id) {
  const L = ledger.get(id), o = {};
  if (L) {
    const g = String(L.Gender || '').trim().toLowerCase(); o.g = /^m/.test(g) ? 'm' : /^f/.test(g) ? 'f' : '';
    o.ab = band(L.BirthYear); if (L.RoleType) o.role = String(L.RoleType).trim();
  }
  if (L) {
    o.tier = Number(L.Tier) || 4; if (L.Famous) o.fame = 1;
    if (L.CitizenBio) o.bio = String(L.CitizenBio).trim();
    const tp = /Archetype:([^|]+)\|Mods:([^|]+)/.exec(L.TraitProfile || ''); if (tp) { o.arch = tp[1]; o.mods = tp[2].split(',').join(', '); }
    if (L.OrginCity) o.from = String(L.OrginCity).trim();
    if (L.Neighborhood) o.lives = String(L.Neighborhood).trim();
    const H = households.get(L.HouseholdId);
    if (H) { let mem = null; try { mem = JSON.parse(H.Members || '[]'); } catch (e) { console.warn('household ' + L.HouseholdId + ': Members is not a list, left off the page'); } o.hh = L.HouseholdId; o.home = { type: H.HouseholdType || '', housing: H.HousingType || '', with: (mem || []).filter(m => m !== id).map(nameOf).filter(Boolean) }; }
    const emp = bizById.get(L.EmployerBizId); if (emp) o.emp = emp.Name;
    const rn = runs.get(id); if (rn) o.runs = rn.map(x => ({ id: x.BIZ_ID, n: x.Name, hood: x.Neighborhood }));
    const hist = history(L.LifeHistory); if (hist.length) o.hist = hist;
  }
  const s = said.get(id);
  if (s) { o.said = saidOne(s[0]); if (s.length > 1) o.saidMore = s.slice(1, 4).map(saidOne); }
  return o;
}

const loose = new Map();
lifeAll.filter(r => !(r.Neighborhood && r.Name)).forEach(r => { const [k, pr] = kindOf(r.EventTag); if (!loose.has(r.POPID)) loose.set(r.POPID, []); loose.get(r.POPID).push([pr, k, r.EventText]); });
const placed = new Set();
Object.keys(byHood).forEach(name => Object.values(byHood[name].people).forEach(p => {
  placed.add(p.id); p.all = p.all.concat(loose.get(p.id) || []).sort((a, b) => a[0] - b[0]);
  p.pr = p.all[0][0]; p.k = p.all[0][1]; p.x = p.all[0][2]; p.c = p.all.length;
}));
// Someone whose lines this week carry no neighborhood stands on their home street (the ledger's), flagged as such.
// If the ledger's home is not one of the streets, they are listed as recorded but not shown.
const notShown = [];
loose.forEach((rows, id) => {
  if (placed.has(id)) return;
  const L = ledger.get(id), home = L && String(L.Neighborhood || '').trim(), name = nameOf(id);
  if (!name) return;
  rows.sort((a, b) => a[0] - b[0]);
  if (home && byHood[home]) byHood[home].people[id] = { id, n: name, c: rows.length, pr: rows[0][0], k: rows[0][1], x: rows[0][2], all: rows, noPlace: 1 };
  else notShown.push({ n: name, role: L && L.RoleType ? String(L.RoleType).trim() : '', why: 'no neighborhood on this week\'s lines' });
});

const CAP = 140;
const hoods = Object.keys(byHood).map(name => {
  const h = byHood[name];
  const all = Object.values(h.people);
  const shown = all.slice().sort((a, b) => a.pr - b.pr || b.c - a.c).slice(0, CAP);
  all.slice().sort((a, b) => a.pr - b.pr || b.c - a.c).slice(CAP).forEach(p => notShown.push({ n: p.n, role: '', why: 'more people on ' + name + ' than the street shows' }));
  const d = demo.find(x => x.Neighborhood === name);
  return {
    name,
    lines: h.lines,
    total: all.length,
    people: shown.map(p => Object.assign({ id: p.id, n: p.n, k: p.k, x: p.x, c: p.c, pr: p.pr, all: p.all.map(a => [a[1], a[2]]) }, p.noPlace ? { noPlace: 1 } : {}, who(p.id))),
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
if (missing.length && require.main === module) { console.error(missing.join('\n')); process.exit(1); }

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
  if (/Theater/i.test(b.s)) return ['theater', 10];
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
hoods.forEach(h => h.people.forEach(p => { if (p.runs) { const i = h.biz.findIndex(x => p.runs.some(rn => rn.id === x.id)); if (i >= 0) p.at = i; p.runs = p.runs.map(rn => ({ n: rn.n, hood: rn.hood })); } }));

const onStreets = new Set(hoods.map(h => h.name));
const unplacedBiz = biz.filter(x => !onStreets.has(x.Neighborhood)).map(x => ({ n: x.Name, hood: x.Neighborhood }));
const wx = process.env.WX || '';
const data = {
  cycle: +CYCLE,
  weather: { type: wx || weather.Type || '', temp: weather.Temp || '', streak: weather.Streak || '', streakType: wx || weather.StreakType || '' },
  hoods,
  style: {},
  landmarks: STYLE.LANDMARKS,
  notShown,
  unplacedBiz
};
hoods.forEach(h => { data.style[h.name] = STYLE[h.name]; });

// Required as a module (a check script, a test): the data and the pieces that made it, nothing written.
module.exports = { data, hoods, canonProblems: missing, layout, placeType, kindOf, band, SIM_YEAR, CYCLE, STYLE };
if (require.main === module) {
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const places = fs.readFileSync(path.join(__dirname, 'places.js'), 'utf8');
if (!tpl.includes('/*__PLACES__*/')) { console.error('template has no places marker'); process.exit(1); }
const LIFE_FILES = ['life-traffic.js', 'life-nature.js', 'life-water.js', 'life-street.js', 'sound.js'];
// NOLIFE=1 builds without the ambient modules; LIFE=life-water.js,sound.js builds with only those (to publish while another is mid-edit)
const lifeSrc = process.env.NOLIFE ? '' : LIFE_FILES.filter(f => !process.env.LIFE || process.env.LIFE.split(',').includes(f)).map(f => '// ---- ' + f + ' ----\n' + fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
if (!tpl.includes('/*__LIFE__*/')) { console.error('template has no life marker'); process.exit(1); }
const out = tpl.replace('/*__LIFE__*/', () => lifeSrc).replace('/*__PLACES__*/', () => places).replace('/*__DATA__*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'));
const dest = process.argv[2] || path.join(__dirname, 'oakland-week.html');
fs.writeFileSync(dest, out);
console.log('hoods', hoods.length, 'people shown', hoods.reduce((s, h) => s + h.people.length, 0), 'of', hoods.reduce((s, h) => s + h.total, 0),
  'lines', hoods.reduce((s, h) => s + h.lines, 0), 'parcels', hoods.reduce((s, h) => s + h.lay.parcels.length, 0), 'bytes', out.length);
const everyone = hoods.reduce((a, h) => a.concat(h.people), []);
console.log('sex known', everyone.filter(p => p.g).length, 'bands', JSON.stringify(everyone.reduce((a, p) => { a[p.ab] = (a[p.ab] || 0) + 1; return a; }, {})), 'with something said', everyone.filter(p => p.said).length, 'sim year', SIM_YEAR);
console.log('recorded but not shown:', notShown.length, '| businesses with no street:', unplacedBiz.length, unplacedBiz.map(x => x.n + ' (' + x.hood + ')').join('; '));
console.log(hoods.map(h => h.name + ': ' + h.lay.places.map(p => p.type).join(',')).filter(s => !/: $/.test(s)).join('\n'));
}
