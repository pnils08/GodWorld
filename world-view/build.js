// Read-only: turns last week's beat dump into one self-contained page. Writes nothing to the project.
// node world-view/build.js [dest]      WX=rain|fog|overcast overrides the week's weather for a look-test.
//                                      SCALE=-5..5 puts every street at that notch of the direction scale for a look-test.
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
const life = lifeAll.filter(r => r.Neighborhood);
const biz = rd('Business_Ledger');
const demo = rd('Neighborhood_Demographics');
const weather = rd('Cycle_Weather').filter(r => String(r.CycleID) === CYCLE)[0] || {};

const byHood = {};
life.forEach(r => {
  const h = (byHood[r.Neighborhood] = byHood[r.Neighborhood] || { lines: 0, people: {} });
  h.lines++;
  const [k, pr] = kindOf(r.EventTag);
  const p = (h.people[r.POPID] = h.people[r.POPID] || { id: r.POPID, n: r.Name || '', c: 0, pr: 99 });
  if (!p.n && r.Name) p.n = r.Name;
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

const notShownEarly = [];
const loose = new Map();
lifeAll.filter(r => !r.Neighborhood).forEach(r => { const [k, pr] = kindOf(r.EventTag); if (!loose.has(r.POPID)) loose.set(r.POPID, []); loose.get(r.POPID).push([pr, k, r.EventText]); });
const placed = new Set();
// a person whose rows carry no Name takes the ledger's; with no name anywhere they cannot be shown
Object.keys(byHood).forEach(name => { const h = byHood[name]; Object.keys(h.people).forEach(id => { const p = h.people[id]; if (!p.n) p.n = nameOf(id); if (!p.n) { delete h.people[id]; notShownEarly.push(id); } }); });
Object.keys(byHood).forEach(name => Object.values(byHood[name].people).forEach(p => {
  placed.add(p.id); p.all = p.all.concat(loose.get(p.id) || []).sort((a, b) => a[0] - b[0]);
  p.pr = p.all[0][0]; p.k = p.all[0][1]; p.x = p.all[0][2]; p.c = p.all.length;
}));
// Someone whose lines this week carry no neighborhood stands on their home street (the ledger's), flagged as such.
// If the ledger's home is not one of the streets, they are listed as recorded but not shown.
const notShown = [];
notShownEarly.forEach(id => notShown.push({ n: id, role: '', why: 'no name on the ledger or on their lines' }));
loose.forEach((rows, id) => {
  if (placed.has(id)) return;
  const L = ledger.get(id), home = L && String(L.Neighborhood || '').trim(), name = nameOf(id);
  if (!name) return;
  rows.sort((a, b) => a[0] - b[0]);
  if (home && byHood[home]) byHood[home].people[id] = { id, n: name, c: rows.length, pr: rows[0][0], k: rows[0][1], x: rows[0][2], all: rows, noPlace: 1 };
  else notShown.push({ n: name, role: L && L.RoleType ? String(L.RoleType).trim() : '', why: 'no neighborhood on this week\'s lines' });
});

// A business's own ledger figures, and the tracked citizens the ledger says work there (EmployerBizId).
const staffOf = new Map();
ledger.forEach((L, id) => { const e = L.EmployerBizId; if (!e || !bizById.has(e)) return; if (!staffOf.has(e)) staffOf.set(e, []); staffOf.get(e).push({ id, n: nameOf(id), role: String(L.RoleType || '').trim(), st: String(L.Status || '').trim() }); });
function bizDetail(b) {
  const o = {}, num = v => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
  if (num(b.Avg_Salary) != null) o.pay = num(b.Avg_Salary);
  if (num(b.Annual_Revenue) != null) o.rev = num(b.Annual_Revenue);
  if (num(b.Growth_Rate) != null) o.gr = num(b.Growth_Rate);
  const kp = String(b.Key_Personnel || ''); const keyP = []; kp.replace(/(POP-\d+)\s+([^,;]+)/g, (m, id, label) => { keyP.push({ id, n: label.trim() }); return m; });
  if (keyP.length) o.keyP = keyP; else { const key = kp.replace(/POP-\d+\s*/g, '').trim(); if (key) o.key = key; }
  const st = (staffOf.get(b.BIZ_ID) || []).filter(x => x.n).sort((x, y) => (x.n < y.n ? -1 : 1));
  if (st.length) o.staff = st.map(x => ({ id: x.id, n: x.n, role: x.role, st: x.st === 'Active' ? '' : x.st }));
  return o;
}

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
    biz: biz.filter(b => b.Neighborhood === name).map(b => Object.assign({ id: b.BIZ_ID, n: b.Name, s: b.Sector, e: Number(b.Employee_Count) || 1 }, bizDetail(b))),
    pop: d ? { a: +d.Adults, st: +d.Students, se: +d.Seniors } : null
  };
}).sort((a, b) => (b.name === 'Grand Lake') - (a.name === 'Grand Lake') || b.lines - a.lines);

// ---------- neighborhood state: the engine's own row for each street this cycle (Neighborhood_Map) ----------
// The direction scale is the engine's. TrajectoryMomentum runs 0..10 with 5 neutral: up a notch on a growth cycle,
// down a notch on a decay cycle, a notch back toward 5 on a steady one (phase05-citizens/neighborhoodTrajectoryEngine.js;
// a blank cell is 5 there too). The page shows it as -5..+5 (builder 2026-11-14: "The scale slides 5 to -5", "A decline
// on a decline is a Notch"). Nothing here moves the scale: the cycle does.
let nmap = [];
try { nmap = rd('Neighborhood_Map').filter(r => String(r.Cycle) === CYCLE); } catch (e) { console.warn('world-view: no Neighborhood_Map in the dump; streets are drawn without their state'); }
const scaleTest = process.env.SCALE != null && process.env.SCALE !== '' ? Math.max(-5, Math.min(5, Math.round(Number(process.env.SCALE)) || 0)) : null;
if (scaleTest != null) console.warn('world-view: SCALE — every street is drawn at ' + scaleTest + ' on the direction scale. Do not publish this build.');
hoods.forEach(h => {
  const row = nmap.find(x => x.Neighborhood === h.name);
  if (row) {
    const m = row.TrajectoryMomentum === '' || row.TrajectoryMomentum == null ? 5 : Number(row.TrajectoryMomentum);
    if (isFinite(m)) h.state = { dir: String(row.NeighborhoodTrajectory || '').trim().toLowerCase(), scale: Math.max(-5, Math.min(5, Math.round(m) - 5)) };
    if (h.state && /^\d+$/.test(String(row.TrajectoryStartCycle))) h.state.since = Number(row.TrajectoryStartCycle);
  }
  if (scaleTest != null) h.state = { dir: scaleTest > 0 ? 'growth' : scaleTest < 0 ? 'decay' : 'steady', scale: scaleTest, test: 1 };
});
if (nmap.length) console.log('direction scale: ' + [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5].map(n => { const at = hoods.filter(h => h.state && h.state.scale === n).map(h => h.name); return at.length ? (n > 0 ? '+' : '') + n + ' ' + at.join(', ') : ''; }).filter(Boolean).join(' | '));

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
// ---------- the rail line: which streets have a station, by the engine's own list ----------
// utilities/ensureTransitMetrics.js OAKLAND_BART_STATIONS gives each station's neighborhood (the list the chaos
// train's 'transit-served' filter reads). A street on it gets the line across it. Where the ledger has the station
// as a business (a Transit Hub), that place is the line and trains call there; elsewhere layout() holds ground for
// a bare crossing and trains run through. A waterside street gets none: the line would have to bridge the water.
const RAIL = {};
try { new Function(fs.readFileSync(path.join(__dirname, '..', 'utilities', 'ensureTransitMetrics.js'), 'utf8') + '\nreturn OAKLAND_BART_STATIONS;')().forEach(s => { (RAIL[s.neighborhood] = RAIL[s.neighborhood] || []).push(s.station); }); }
catch (e) { console.warn('world-view: station list not loaded (' + e.message + '); no rail lines drawn'); }
// ---------- homes: the active households of each neighborhood (Household_Ledger) ----------
// A home is a parcel of the street, or a unit of one, with one household on it, chosen in layout() the way a
// business's parcel is. Renters take units over the shops and in the plain buildings of the main street, dearer
// rent higher up; owners take houses: the ones a house street already has between its businesses, and otherwise
// the lots of a residential stretch the street runs on into past its last business, where a few houses are
// nobody's on record (the ledger is the tracked share of the city). Whoever a street has no unit or house for
// goes on the stretch too. Ids are not addresses and are not shown; ROLLOUT engine.345 is the ledger's side.
// When the ledger carries a parcel per household, read it in layout() and drop the choosing.
const hhByHood = {}, isOwned = h => /^own/i.test(String(h.HousingType || ''));
households.forEach(h => { if (String(h.Status || '').trim().toLowerCase() === 'active' && h.Neighborhood) (hhByHood[h.Neighborhood] = hhByHood[h.Neighborhood] || []).push(h); });
function homeRec(h) {
  let mem = []; try { mem = JSON.parse(h.Members || '[]'); } catch (e) { console.warn('household ' + h.HouseholdId + ': Members is not a list; the home is shown with nobody named'); }
  const o = { hh: h.HouseholdId, own: isOwned(h) ? 1 : 0, type: String(h.HouseholdType || ''), mem: (Array.isArray(mem) ? mem : []).map(id => [id, nameOf(id)]).filter(m => m[1]) };
  if (h.HeadOfHousehold) o.head = String(h.HeadOfHousehold);
  if (!o.own && Number(h.MonthlyRent) > 0) o.rent = Number(h.MonthlyRent);
  if (/^\d+$/.test(String(h.FormedCycle))) o.since = Number(h.FormedCycle);
  return o;
}
const r2 = x => Math.round(x * 100) / 100;
function layout(H) {
  const ST = Object.assign({}, DEF, STYLE[H.name]);
  const r = rng(hash(H.name + '|parcels')), rr = a => a[0] + r() * (a[1] - a[0]);
  const water = ST.water ? ST.water.side : 0, sides = water ? [-water] : [-1, 1];
  const sideStyle = s => (s < 0 && ST.left ? Object.assign({}, ST, ST.left) : ST);
  const places = [], ordinary = [];
  H.biz.forEach((b, i) => { const t = placeType(b); if (t) places.push({ i, type: t[0], half: t[1], end: !!t[2] }); else ordinary.push(i); });
  if (RAIL[H.name] && !water && !places.some(p => p.type === 'station')) places.push({ type: 'rail', half: 7, end: false }); // a crossing with no business of its own
  const onStreet = places.filter(p => p.half > 0);
  const need = onStreet.reduce((a, p) => a + p.half * 2 + 6, 0);
  const L = Math.max(110, H.people.length * 2.2 + 30, (ordinary.length * 15 + need) / sides.length + 40);
  // places take their ground first, spread down the street, alternating sides
  onStreet.forEach((p, k) => {
    p.z = r2(-L * (k + 1) / (onStreet.length + 1));
    p.s = p.type === 'station' || p.type === 'rail' ? 0 : p.type === 'coliseum' && !water ? -1 : sides[k % sides.length];
  });
  const held = (s, a, b) => onStreet.some(p => (p.s === 0 || p.s === s) && a < p.z + p.half && b > p.z - p.half);
  const parcels = [], ends = {}, counts = {};
  sides.forEach(s => {
    const st = sideStyle(s); let z = 42, k = 0;
    while (z > -L - 30) { const w = rr(st.w), g = rr(st.gap); if (!held(s, z - w, z)) parcels.push({ id: slug(H.name) + '-' + (s < 0 ? 'w' : 'e') + String(++k).padStart(2, '0'), s, z: z - w / 2, w, st }); z -= w + g; }
    ends[s] = z; counts[s] = k;
  });
  const cand = parcels.filter(p => p.z < 4 && p.z > -L + 6);
  const K = Math.min(ordinary.length, cand.length);
  if (K < ordinary.length) console.warn(H.name + ': ' + (ordinary.length - K) + ' businesses without a parcel');
  const chosen = []; for (let k = 0; k < K; k++) chosen.push(cand[Math.floor((k + 0.5) * cand.length / K)]);
  chosen.sort((a, b) => b.w - a.w);
  ordinary.slice().sort((a, b) => H.biz[b].e - H.biz[a].e || (H.biz[a].id < H.biz[b].id ? -1 : 1)).slice(0, K).forEach((bi, k) => { chosen[k].b = bi; });
  const station = onStreet.find(p => p.type === 'station');
  // lit windows follow the direction scale: 14% of the street's own share for each notch (0.3 of it at -5, 1.7 at +5), kept to steps of 0.05 so streets share wall tiles
  const sc = H.state ? H.state.scale : 0, lit = v => sc ? Math.round(Math.max(0.05, Math.min(0.95, v * (1 + 0.14 * sc))) * 20) / 20 : v;
  const out = parcels.map(p => {
    const st = p.st, b = p.b != null ? H.biz[p.b] : null, near = station && Math.abs(p.z - station.z) < 38;
    const o = { id: p.id, s: p.s, z: r2(p.z), w: r2(p.w) };
    if (st.fill === 'house' && !b) { o.k = 'h'; o.h = r2(rr(st.h)); o.d = r2(7 + r() * 2); o.tone = st.tone; o.lit = lit(st.lit); o.tr = st.trees; return o; }
    o.k = 'b'; o.d = r2(8 + r() * 5); o.wall = near ? 'glass' : st.wall; o.tone = near ? [200, 0.2, 0.6] : st.tone;
    o.h = r2(near ? 15 + r() * 8 : b ? (st.fill === 'house' ? 4.6 + r() * 1.4 : st.h[0] + Math.min(st.h[1] - st.h[0], Math.sqrt(b.e) * 1.3)) : rr(st.h));
    o.lit = lit(near ? 0.45 : b ? Math.max(st.lit, 0.45) : st.lit); o.tr = st.trees; o.neon = st.neon;
    if (b) o.b = p.b;
    return o;
  });
  // ---------- homes ----------
  // Its own seeded numbers, so the main street's parcels, businesses and landmark places are laid out exactly as
  // they were before homes. (Scenery that stands at a share of the street's length moves with a longer street.)
  const rH = rng(hash(H.name + '|homes')), rrH = a => a[0] + rH() * (a[1] - a[0]);
  const byId = (a, b) => (a.HouseholdId < b.HouseholdId ? -1 : 1), rentOf = h => Number(h.MonthlyRent) || 0;
  const hhs = (hhByHood[H.name] || []).slice().sort(byId), homes = [];
  const put = (h, lot, unit) => { const rec = homeRec(h); rec.lot = lot.id; if (unit) rec.unit = unit; homes.push(rec); (lot.hm = lot.hm || []).push(homes.length - 1); };
  const even = (list, n) => { const pick = []; for (let k = 0; k < n; k++) pick.push(list[Math.floor((k + 0.5) * list.length / n)]); return pick; };
  const inMain = p => p.z < 4 && p.z > -L + 6;
  const renters = hhs.filter(h => !isOwned(h)).sort((a, b) => rentOf(b) - rentOf(a) || byId(a, b)), owners = hhs.filter(isOwned);
  // units: floors by the building's height (the ground floor too where no business has it), units a floor by its width
  const blds = out.filter(o => o.k === 'b' && inMain(o)).sort((a, b) => b.z - a.z || a.s - b.s).map(o => { const fl = Math.max(1, Math.round(o.h / 3.3)), per = Math.max(1, Math.round(o.w / 6.5)), g = o.b != null ? 1 : 0; return { o, per, g, cap: (fl - g) * per }; });
  const slots = [], maxCap = blds.reduce((m, x) => Math.max(m, x.cap), 0);
  for (let round = 0; slots.length < renters.length && round < maxCap; round++) {
    const avail = blds.filter(x => x.cap > round), need = renters.length - slots.length;
    (need >= avail.length ? avail : even(avail, need)).forEach(x => slots.push({ o: x.o, fl: x.g + 1 + Math.floor(round / x.per), unit: (x.g + 1 + Math.floor(round / x.per)) + String.fromCharCode(97 + round % x.per) }));
  }
  slots.map((x, k) => [x, k]).sort((a, b) => b[0].fl - a[0].fl || a[1] - b[1]).forEach((x, k) => put(renters[k], x[0].o, x[0].unit));
  let left = renters.slice(slots.length);
  // houses the street already has: owners first, then any renter with no unit
  const houses = out.filter(o => o.k === 'h' && inMain(o)).sort((a, b) => b.z - a.z || a.s - b.s);
  const own1 = Math.min(owners.length, houses.length); even(houses, own1).forEach((o, k) => put(owners[k], o));
  const spare = houses.filter(o => !o.hm), rent1 = Math.min(left.length, spare.length); even(spare, rent1).forEach((o, k) => put(left[k], o));
  left = owners.slice(own1).concat(left.slice(rent1));
  // the residential stretch: the street runs on past its last business into house lots, one household each, and a
  // few houses nobody on record lives in; then the gate, and houses beyond it
  let LT = L;
  if (left.length) {
    // lots are kept narrow so the stretch stays walkable: terraced where the street is dense, brick, glass or along
    // water (one side only), a house street's own lots a little narrower, detached houses elsewhere
    const hs = sideStyle(sides[0]), row = hs.fill !== 'house' && (!!water || hs.gap[1] <= 1 || hs.wall === 'glass' || hs.wall === 'brick');
    const dim = hs.fill === 'house' ? { w: [hs.w[0] * 0.8, hs.w[1] * 0.8], g: hs.gap, h: hs.h } : row ? { w: [6, 7.5], g: [0.1, 0.4], h: [6, 8.5] } : { w: [8, 10], g: [0.5, 1.2], h: [4, 5.6] };
    const n = left.length + Math.max(2, Math.round(left.length * 0.15)), cur = {}, kk = Object.assign({}, counts), lots = [];
    // (the main street's last buildings used to run on 30 m behind the gate as a backdrop; the houses start there instead)
    for (let i = out.length - 1; i >= 0; i--) if (out[i].z - out[i].w / 2 < -L - 3) out.splice(i, 1);
    const z0 = Math.min.apply(null, sides.map(s => Math.min.apply(null, out.filter(o => o.s === s).map(o => o.z - o.w / 2).concat([ends[s] + 60])))) - 1; sides.forEach(s => { cur[s] = z0; });
    const lot = s => { const w = rrH(dim.w), g = rrH(dim.g), o = { id: slug(H.name) + '-' + (s < 0 ? 'w' : 'e') + String(++kk[s]).padStart(2, '0'), s, z: r2(cur[s] - w / 2), w: r2(w), k: 'h', h: r2(rrH(dim.h)), d: r2(7 + rH() * 2), tone: hs.tone, lit: lit(Math.max(hs.lit, 0.45)), tr: Math.max(hs.trees || 0, 0.35), res: 1 }; cur[s] -= w + g; out.push(o); return o; };
    for (let i = 0; i < n; i++) lots.push(lot(sides[i % sides.length]));
    even(lots, left.length).forEach((o, k) => put(left[k], o));
    LT = -Math.min.apply(null, sides.map(s => cur[s])) + 2;
    sides.forEach(s => { while (cur[s] > -LT - 30) lot(s); });
  }
  return { L: r2(LT), Lm: r2(L), water, slope: water ? 0 : ST.slope, parcels: out, places: places.map(p => ({ b: p.i, type: p.type, half: p.half, s: p.s, z: p.z, end: p.end })), homes };
}
hoods.forEach(h => { const lay = layout(h); h.homes = lay.homes; delete lay.homes; h.lay = lay; if (RAIL[h.name]) h.rail = RAIL[h.name]; });
const homesElsewhere = []; Object.keys(hhByHood).forEach(n => { if (!hoods.some(h => h.name === n)) hhByHood[n].forEach(h => homesElsewhere.push({ hh: h.HouseholdId, hood: n })); });
hoods.forEach(h => h.people.forEach(p => { if (p.runs) { const i = h.biz.findIndex(x => p.runs.some(rn => rn.id === x.id)); if (i >= 0) p.at = i; p.runs = p.runs.map(rn => ({ n: rn.n, hood: rn.hood })); } }));

// ---------- chaos cars: the week's Chaos_Cars rows, as the world summary printed them ----------
// Chaos_Cars is not a beats tab. buildWorldSummary.js prints the cycle's rows as a table under "## Chaos Events",
// with the narrative seeds below it; that file is read here, never the sheet. Each row goes on the street it
// hit: a neighborhood's own street, the street its business stands on, the street its citizen is shown on (or
// lives on, by the ledger). A row that lands on none of the 22 streets is listed in data.chaos.elsewhere, not drawn.
// Vehicle names are the engine's own (utilities/chaosCarsConfig.js displayName).
const CHAOS_NAMES = {};
try { require('../utilities/chaosCarsConfig.js').VEHICLE_CONFIGS.forEach(v => { CHAOS_NAMES[v.name] = v.displayName; }); } catch (e) { console.warn('world-view: chaos car names not loaded (' + e.message + '); the row\'s own key is shown'); }
function chaosRows(cycle) {
  const f = path.join(__dirname, '..', 'output', 'world_summary_c' + cycle + '.md');
  if (!fs.existsSync(f)) return null;
  const m = /^## Chaos Events[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(fs.readFileSync(f, 'utf8'));
  if (!m) return null;
  const rows = [], seeds = {};
  m[1].split('\n').forEach(l => {
    const c = l.split('|').map(x => x.trim());
    if (l.startsWith('|') && c.length >= 7 && /^[a-z_]+$/.test(c[1])) rows.push({ v: c[1], o: c[2], target: c[3], metric: c[4] === '—' ? '' : c[4], mag: c[5] === '—' ? '' : c[5] });
    const sd = /^- ([a-z_]+) → (.+?): (.+)$/.exec(l); if (sd) seeds[sd[1] + '|' + sd[2]] = sd[3].trim();
  });
  rows.forEach(r => { const tm = /^(\w+)\s+(.+?)(?:\s+\(T(\d)\))?$/.exec(r.target) || []; r.scope = tm[1] || ''; r.id = tm[2] || ''; r.seed = seeds[r.v + '|' + r.id] || ''; });
  return rows;
}
const chaosRead = chaosRows(CYCLE), chaosElsewhere = [];
hoods.forEach(h => { h.chaos = []; });
(chaosRead || []).forEach(r => {
  const ev = { v: r.v, n: CHAOS_NAMES[r.v] || r.v.replace(/_/g, ' '), o: r.o, scope: r.scope, id: r.id };
  if (r.metric) ev.metric = r.metric; if (r.mag) ev.mag = r.mag; if (r.seed) ev.seed = r.seed;
  let h = null;
  if (r.scope === 'neighborhood') { ev.to = r.id; h = hoods.find(x => x.name === r.id); }
  else if (r.scope === 'business') { const row = bizById.get(r.id); if (row) { ev.to = row.Name; h = hoods.find(x => x.name === row.Neighborhood); const bi = h ? h.biz.findIndex(x => x.id === r.id) : -1; if (bi >= 0) ev.b = bi; } }
  else if (r.scope === 'citizen') { ev.to = nameOf(r.id) || r.id; h = hoods.find(x => x.people.some(p => p.id === r.id)); if (h) ev.p = r.id; else { const L = ledger.get(r.id); h = L && hoods.find(x => x.name === String(L.Neighborhood || '').trim()); } }
  else if (r.scope === 'port') { ev.to = r.id; h = hoods.find(x => x.biz.some(b => b.n === r.id)); const pi = h ? h.biz.findIndex(b => b.n === r.id) : -1; if (pi >= 0) ev.b = pi; }
  else ev.to = r.id;
  if (r.v === 'bart_train') {
    // a train is on a line: the citizen's home street if the line crosses it (the engine draws them from the served hoods), else nowhere
    const lined = x => x && x.lay.places.some(p => p.type === 'station' || p.type === 'rail');
    if (r.scope === 'citizen') { const L = ledger.get(r.id), home = L && hoods.find(x => x.name === String(L.Neighborhood || '').trim()); if (lined(home)) { h = home; if (!home.people.some(p => p.id === r.id)) delete ev.p; else ev.p = r.id; } }
    if (!lined(h)) h = null;
  }
  if (h) h.chaos.push(ev); else chaosElsewhere.push(ev);
});
// CHAOS_TEST=<street> puts one of every road vehicle on that street to look at the shapes. Never for a published build.
if (process.env.CHAOS_TEST) {
  const th = hoods.find(x => x.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === process.env.CHAOS_TEST);
  if (th) { th.chaos = Object.keys(CHAOS_NAMES).map(v => ({ v, n: CHAOS_NAMES[v], o: 'look_test', scope: 'neighborhood', id: th.name, to: th.name, test: 1 })); console.warn('world-view: CHAOS_TEST — ' + th.name + ' carries made-up chaos cars. Do not publish this build.'); }
}

// ---------- who knows whom: Relationship_Bonds, the bond engine's master state ----------
// One row a pair: BondType, Intensity 0..10, Status. The page carries every active bond between two citizen ids
// where at least one of them is on a street this week (the wake tells a citizen about active bonds only:
// lib/wakePerception.js loadBonds). A row whose second party is not a citizen id (a bare name, an off-camera
// partner) cannot be shown and is counted in the log. The engine records the tie, not a meeting: two people
// stopping to talk on a street is drawn from the tie (life-people.js), never stated as something that happened.
// What did happen is a saved conversation (scripts/citizen-exchange.js writes output/exchanges/, one bonded pair a
// day): the pair's latest one, at or before the dumped cycle, rides on their tie with its week, word for word.
let bondRows = null;
try { bondRows = rd('Relationship_Bonds'); } catch (e) { console.warn('world-view: no Relationship_Bonds in the dump; nobody is shown knowing anybody'); }
const shownAt = new Map(); hoods.forEach(h => h.people.forEach(p => shownAt.set(p.id, h.name)));
const isPop = v => /^POP-\d+$/.test(String(v || ''));
const pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
const EXCHANGES = path.join(__dirname, '..', 'output', 'exchanges');
function talksRead(cycle) {
  const latest = new Map();
  let files = []; try { files = fs.readdirSync(EXCHANGES).sort(); } catch (e) { return latest; }
  files.forEach(f => {
    const m = /^exchange_c(\d+)_(\d{4}-\d{2}-\d{2})_conversation\.md$/.exec(f); if (!m || !(Number(m[1]) <= Number(cycle))) return;
    const text = fs.readFileSync(path.join(EXCHANGES, f), 'utf8'), pm = /^- participants: (.+)$/m.exec(text);
    const ps = pm ? pm[1].split(' | ').map(x => /^(POP-\d+) (.+)$/.exec(x.trim())) : [];
    if (ps.length !== 2 || ps.some(x => !x)) { console.warn('world-view: ' + f + ' does not name two citizens; left off the page'); return; }
    const lines = []; let stray = 0;
    text.split('\n').forEach(l => { const lm = /^\*\*(.+?):\*\* (.*)$/.exec(l); if (!lm) return; const i = lm[1] === ps[0][2] ? 0 : lm[1] === ps[1][2] ? 1 : -1; if (i < 0) stray++; else lines.push([i, lm[2].trim()]); });
    if (stray || !lines.length) { console.warn('world-view: ' + f + ' has lines from someone other than its two citizens, or none; left off the page'); return; }
    const key = pairKey(ps[0][1], ps[1][1]), prev = latest.get(key), at = [Number(m[1]), m[2]];
    if (!prev || prev.at[0] < at[0] || (prev.at[0] === at[0] && prev.at[1] < at[1])) latest.set(key, { at, ids: [ps[0][1], ps[1][1]], lines, f });
  });
  return latest;
}
const talks = bondRows ? talksRead(CYCLE) : new Map();
const ties = [], offStreet = {}, tieSkips = { notCitizen: 0, noName: 0, talksNoTie: 0 };
(bondRows || []).forEach(r => {
  if (String(r.Status || '').trim().toLowerCase() !== 'active') return;
  if (!isPop(r.CitizenA) || !isPop(r.CitizenB)) { tieSkips.notCitizen++; return; }
  const a = r.CitizenA, b = r.CitizenB;
  if (a === b || (!shownAt.has(a) && !shownAt.has(b))) return;
  const other = shownAt.has(a) ? (shownAt.has(b) ? null : b) : a;
  if (other) { const nm = nameOf(other); if (!nm) { tieSkips.noName++; return; } offStreet[other] = nm; }
  const t = { a, b, t: String(r.BondType || '').trim().toLowerCase(), i: Number(r.Intensity) || 0 };
  const note = String(r.Notes || '').replace(/^seeded\s*/, '').trim(); if (note) t.note = note;
  if (/^\d+$/.test(String(r.CycleCreated))) t.since = Number(r.CycleCreated);
  if (/^\d+$/.test(String(r.LastUpdate))) t.up = Number(r.LastUpdate);
  const tk = talks.get(pairKey(a, b));
  if (tk) { t.talk = { c: tk.at[0], lines: tk.lines.map(l => [tk.ids[l[0]] === a ? 0 : 1, l[1]]) }; tk.used = true; }
  ties.push(t);
});
talks.forEach(tk => { if (!tk.used && tk.ids.some(id => shownAt.has(id))) tieSkips.talksNoTie++; });

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
  unplacedBiz,
  chaos: { read: chaosRead != null, total: (chaosRead || []).length, elsewhere: chaosElsewhere },
  ties,
  offStreet,
  homesElsewhere
};
hoods.forEach(h => { data.style[h.name] = STYLE[h.name]; });

// Required as a module (a check script, a test): the data and the pieces that made it, nothing written.
module.exports = { data, hoods, canonProblems: missing, layout, placeType, kindOf, band, SIM_YEAR, CYCLE, STYLE, chaosRows, RAIL, talksRead };
if (require.main === module) {
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const places = fs.readFileSync(path.join(__dirname, 'places.js'), 'utf8');
if (!tpl.includes('/*__PLACES__*/')) { console.error('template has no places marker'); process.exit(1); }
const LIFE_FILES = ['life-traffic.js', 'life-rail.js', 'life-nature.js', 'life-water.js', 'life-street.js', 'life-people.js', 'sound.js'];
// NOLIFE=1 builds without the ambient modules; LIFE=life-water.js,sound.js builds with only those (to publish while another is mid-edit)
// COMMITTED=life-water.js takes those files as last committed, not as they sit on disk (one may be mid-edit by a helper).
const committed = (process.env.COMMITTED || '').split(',').filter(Boolean);
const readLife = f => (committed.includes(f) ? require('child_process').execSync('git show HEAD:world-view/' + f, { cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 1 << 26 }) : fs.readFileSync(path.join(__dirname, f), 'utf8'));
const lifeSrc = process.env.NOLIFE ? '' : LIFE_FILES.filter(f => !process.env.LIFE || process.env.LIFE.split(',').includes(f)).map(f => '// ---- ' + f + ' ----\n' + readLife(f)).join('\n');
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
console.log('rail line on:', hoods.filter(h => h.lay.places.some(p => p.type === 'station' || p.type === 'rail')).map(h => h.name).join(', '), '| stations by the engine with no line drawn:', Object.keys(RAIL).filter(n => { const h = hoods.find(x => x.name === n); return !h || !h.lay.places.some(p => p.type === 'station' || p.type === 'rail'); }).join(', ') || 'none');
{
  const onOne = ties.filter(t => shownAt.get(t.a) && shownAt.get(t.a) === shownAt.get(t.b)), byType = {};
  onOne.forEach(t => { byType[t.t] = (byType[t.t] || 0) + 1; });
  console.log('ties:', bondRows == null ? 'no Relationship_Bonds in the dump (none shown)' : ties.length + ' active bonds with someone on a street; ' + onOne.length + ' with both on one street (' + Object.keys(byType).sort((x, y) => byType[y] - byType[x]).map(k => byType[k] + ' ' + k).join(', ') + '); '
    + ties.filter(t => t.talk).length + ' carry a saved conversation (' + onOne.filter(t => t.talk).length + ' of them on one street)'
    + (tieSkips.notCitizen ? '; ' + tieSkips.notCitizen + ' active row(s) name someone who is not a citizen id, not shown' : '') + (tieSkips.noName ? '; ' + tieSkips.noName + ' with no name on the ledger, not shown' : '')
    + (tieSkips.talksNoTie ? '; ' + tieSkips.talksNoTie + ' saved conversation(s) between people whose bond is no longer active, not shown' : ''));
}
console.log('homes: ' + hoods.reduce((a, h) => a + h.homes.length, 0) + ' active households on parcels (' + hoods.reduce((a, h) => a + h.homes.filter(x => x.own).length, 0) + ' owned); '
  + hoods.filter(h => h.homes.length).map(h => { const res = new Set(h.lay.parcels.filter(p => p.res).map(p => p.id)), onRes = h.homes.filter(x => res.has(x.lot)).length; return h.name + ' ' + h.homes.length + (h.lay.L > h.lay.Lm ? ' (' + onRes + ' on a ' + Math.round(h.lay.L - h.lay.Lm) + ' m stretch)' : ''); }).join(', ')
  + (homesElsewhere.length ? '; ' + homesElsewhere.length + ' household(s) in a neighborhood with no street this week, not shown' : ''));
console.log('chaos cars:', chaosRead == null ? 'no world summary for C' + CYCLE + ' (none drawn)' : chaosRead.length + ' this week — ' + hoods.filter(h => h.chaos.length).map(h => h.name + ': ' + h.chaos.map(c => c.n + ' (' + c.o + (c.to && c.to !== h.name ? ' → ' + c.to : '') + ')').join(', ')).join('; ') + (chaosElsewhere.length ? '; not on a street: ' + chaosElsewhere.map(c => c.n + ' → ' + c.to).join(', ') : ''));
}
