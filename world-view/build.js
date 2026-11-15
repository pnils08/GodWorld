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

// ---------- the street's numbers: its own Neighborhood_Map row for the cycle, and its Crime_Metrics row ----------
// Shown as the engine holds them, behind the top line (add-list 1 and 10). Nothing is drawn from them except the
// direction scale above: how a street should look for its nightlife, retail, noise, mood or crime is the builder's.
const NUM_MAP = ['Sentiment', 'NightlifeProfile', 'NoiseIndex', 'RetailVitality', 'EventAttractiveness', 'CrimeIndex', 'HousingPressure', 'MigrationFlow', 'MedianIncome', 'MedianRent', 'DemographicMarker', 'IncomeTier', 'EmployerCharacter', 'District'];
const NUM_CRIME = ['IncidentCount', 'PropertyCrimeIndex', 'ViolentCrimeIndex', 'ResponseTimeAvg', 'ClearanceRate', 'Trend', 'Hotspot', 'PressureRatio'];
let crimeRows = []; try { crimeRows = rd('Crime_Metrics'); } catch (e) { console.warn('world-view: no Crime_Metrics in the dump; the street\'s numbers are shown without it'); }
hoods.forEach(h => {
  const pick = (row, cols) => { const o = {}; if (row) cols.forEach(c => { const v = String(row[c] == null ? '' : row[c]).trim(); if (v) o[c] = v; }); return o; };
  const m = pick(nmap.find(x => x.Neighborhood === h.name), NUM_MAP), c = pick(crimeRows.find(x => x.Neighborhood === h.name), NUM_CRIME);
  if (Object.keys(m).length || Object.keys(c).length) h.nums = { map: m, crime: c };
});

// ---------- the city's shape: which neighborhoods border which (Neighborhood_Map.Adjacent, District) ----------
// The sim holds no coordinates, only adjacency (the engine reads the same column into S.neighborhoodAdjacency). The
// overview map is a picture of that graph: neighborhoods that border each other are drawn near each other, by a
// spring layout with fixed starting places, so it is the same every build. It is not a street map of anywhere.
const cityMap = { xy: [], edges: [], d: [] };
{
  const idx = new Map(hoods.map((h, i) => [h.name, i])), seen = new Set(), n = hoods.length;
  hoods.forEach((h, i) => {
    const row = nmap.find(x => x.Neighborhood === h.name) || {};
    cityMap.d.push(String(row.District || '').trim());
    String(row.Adjacent || '').split(/\s*[,;|]\s*/).filter(Boolean).forEach(a => { const j = idx.get(a); if (j == null || j === i) return; const k = i < j ? i + '|' + j : j + '|' + i; if (!seen.has(k)) { seen.add(k); cityMap.edges.push(i < j ? [i, j] : [j, i]); } });
  });
  cityMap.edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const order = hoods.map((h, i) => i).sort((a, b) => (hoods[a].name < hoods[b].name ? -1 : 1)), P = [];
  order.forEach((i, k) => { const a = 2 * Math.PI * k / n; P[i] = [Math.cos(a), Math.sin(a)]; });
  const K = 0.55;
  for (let it = 0; it < 900; it++) {
    const F = P.map(() => [0, 0]), t = 0.12 * (1 - it / 900);
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { let dx = P[a][0] - P[b][0], dy = P[a][1] - P[b][1], d = Math.max(0.02, Math.hypot(dx, dy)), f = K * K / d; F[a][0] += dx / d * f; F[a][1] += dy / d * f; F[b][0] -= dx / d * f; F[b][1] -= dy / d * f; }
    cityMap.edges.forEach(e => { const dx = P[e[0]][0] - P[e[1]][0], dy = P[e[0]][1] - P[e[1]][1], d = Math.max(0.02, Math.hypot(dx, dy)), f = d * d / K; F[e[0]][0] -= dx / d * f; F[e[0]][1] -= dy / d * f; F[e[1]][0] += dx / d * f; F[e[1]][1] += dy / d * f; });
    for (let a = 0; a < n; a++) { const m = Math.hypot(F[a][0], F[a][1]); if (m > 0) { P[a][0] += F[a][0] / m * Math.min(m, t); P[a][1] += F[a][1] / m * Math.min(m, t); } }
  }
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  let Q = P.map(p => [(p[0] - x0) / (x1 - x0 || 1), (p[1] - y0) / (y1 - y0 || 1)]);
  // room for the names: nudge apart any two that sit closer than a label needs (more across than down), then fit again
  for (let it = 0; it < 300; it++) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const dx = Q[a][0] - Q[b][0], dy = Q[a][1] - Q[b][1], ox = 0.2 - Math.abs(dx), oy = 0.12 - Math.abs(dy);
    if (ox > 0 && oy > 0) { if (ox / 0.2 < oy / 0.12) { const s = (dx < 0 ? -1 : 1) * ox / 2 * 0.5; Q[a][0] += s; Q[b][0] -= s; } else { const s = (dy < 0 ? -1 : 1) * oy / 2 * 0.5; Q[a][1] += s; Q[b][1] -= s; } }
  }
  const qx = Q.map(p => p[0]), qy = Q.map(p => p[1]), a0 = Math.min.apply(null, qx), a1 = Math.max.apply(null, qx), b0 = Math.min.apply(null, qy), b1 = Math.max.apply(null, qy);
  cityMap.xy = Q.map(p => [Math.round((p[0] - a0) / (a1 - a0 || 1) * 1000) / 1000, Math.round((p[1] - b0) / (b1 - b0 || 1) * 1000) / 1000]);
}

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
const BLOCK_MIN = 60; // a residential block is at least this long, however few tracked households stand on it
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
  // The residential block (builder 2026-11-15: "I thought it was a new block not on the Main Street"): a street of
  // its own beside the main one, reached from it, never part of it. House lots, one household each (the owners the
  // main street had no house for, and any renter it had no unit for), with houses nobody on record lives in among
  // them: the ledger is the tracked share of the city. The main street is left exactly as it was before homes.
  let block = null;
  if (left.length) {
    // lots are kept narrow so the block stays walkable: terraced where the main street is dense, brick or glass,
    // a house street's own lots a little narrower, detached houses elsewhere. No water: the block is inland of it.
    const hs = sideStyle(sides[0]), row = hs.fill !== 'house' && (hs.gap[1] <= 1 || hs.wall === 'glass' || hs.wall === 'brick');
    const dim = hs.fill === 'house' ? { w: [hs.w[0] * 0.8, hs.w[1] * 0.8], g: hs.gap, h: hs.h } : row ? { w: [6, 7.5], g: [0.1, 0.4], h: [6, 8.5] } : { w: [8, 10], g: [0.5, 1.2], h: [4, 5.6] };
    const bs = [-1, 1], cur = { '-1': 42, 1: 42 }, kk = { '-1': 0, 1: 0 }, bout = [], lots = [];
    const lot = s => { const w = rrH(dim.w), g = rrH(dim.g), o = { id: slug(H.name) + '-r' + (s < 0 ? 'w' : 'e') + String(++kk[s]).padStart(2, '0'), s, z: r2(cur[s] - w / 2), w: r2(w), k: 'h', h: r2(rrH(dim.h)), d: r2(7 + rH() * 2), tone: hs.tone, lit: lit(Math.max(hs.lit, 0.45)), tr: Math.max(hs.trees || 0, 0.35), res: 1 }; cur[s] -= w + g; bout.push(o); return o; };
    bs.forEach(s => { while (cur[s] > 4) lot(s); });                       // houses behind where the block is entered
    const n = left.length + Math.max(2, Math.round(left.length * 0.15));   // a sixth more lots than households, at least two
    for (let i = 0; lots.length < n || Math.max(cur[-1], cur[1]) > -BLOCK_MIN + 6; i++) lots.push(lot(bs[i % 2])); // and never a block shorter than BLOCK_MIN
    even(lots, left.length).forEach((o, k) => put(left[k], o));
    const LB = -Math.min(cur[-1], cur[1]) + 2;
    bs.forEach(s => { while (cur[s] > -LB - 30) lot(s); });                // houses beyond its far end
    block = { L: r2(LB), Lm: r2(LB), water: 0, slope: ST.slope || 0, parcels: bout, places: [] };
  }
  return { L: r2(L), Lm: r2(L), water, slope: water ? 0 : ST.slope, parcels: out, places: places.map(p => ({ b: p.i, type: p.type, half: p.half, s: p.s, z: p.z, end: p.end })), homes, block };
}
hoods.forEach(h => { const lay = layout(h); h.homes = lay.homes; delete lay.homes; if (lay.block) h.block = lay.block; delete lay.block; h.lay = lay; if (RAIL[h.name]) h.rail = RAIL[h.name]; });
const homesElsewhere = []; Object.keys(hhByHood).forEach(n => { if (!hoods.some(h => h.name === n)) hhByHood[n].forEach(h => homesElsewhere.push({ hh: h.HouseholdId, hood: n })); });
hoods.forEach(h => h.people.forEach(p => { if (p.runs) { const i = h.biz.findIndex(x => p.runs.some(rn => rn.id === x.id)); if (i >= 0) p.at = i; p.runs = p.runs.map(rn => ({ n: rn.n, hood: rn.hood })); } }));

// ---------- staff: who the roster has working at a business on the street they are shown on ----------
// Employment_Roster Active rows (BIZ_ID, POP_ID). A person shown on the same street as the business they work at
// carries wk (its index in the street's businesses) and now and then goes and stands outside it (life-people.js).
// Someone who runs the place (Key_Personnel) already stands outside it and carries at, not wk.
const rosterBy = new Map();
try { rd('Employment_Roster').forEach(r => { if (String(r.Status || '').trim().toLowerCase() !== 'active' || !r.POP_ID || !r.BIZ_ID) return; if (!rosterBy.has(r.POP_ID)) rosterBy.set(r.POP_ID, []); rosterBy.get(r.POP_ID).push(r.BIZ_ID); }); } catch (e) { console.warn('world-view: no Employment_Roster in the dump; nobody is shown going to work'); }
hoods.forEach(h => h.people.forEach(p => { const ids = rosterBy.get(p.id) || [], i = h.biz.findIndex(b => ids.includes(b.id)); if (i >= 0 && p.at !== i) p.wk = i; }));

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

// ---------- the week's notices: faith events and the sports feed ----------
// Faith_Ledger holds each faith event of the cycle (organization, what happened, where, how many came);
// Oakland_Sports_Feed holds the week's sports rows, each with the neighborhood it lands on (HomeNeighborhood).
// A row of this cycle goes on its neighborhood's street as a notice: at the organization's own building when the
// ledger has it as a business there, else on the pavement. Every word shown is the row's. A row whose neighborhood
// is not one of the streets is listed in data.notesElsewhere, not drawn.
hoods.forEach(h => { h.notes = []; });
const notesElsewhere = [], ws = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim(), dash = v => { v = ws(v); return v === '-' ? '' : v; };
const faithOrg = new Map(); try { rd('Faith_Organizations').forEach(o => faithOrg.set(o.Organization, o)); } catch (e) { console.warn('world-view: no Faith_Organizations in the dump; faith events are shown without their organization\'s details'); }
// the feed's team names and their franchise businesses: phase05-citizens/applyGameNightMoments.js SPORTS_FRANCHISE_EMPLOYER_
const TEAM_BIZ = { "A's": 'BIZ-00005', Oaks: 'BIZ-00074' };
let faithRows = [], sportRows = [];
try { faithRows = rd('Faith_Ledger').filter(r => String(r.Cycle) === CYCLE); } catch (e) { console.warn('world-view: no Faith_Ledger in the dump; no faith events shown'); }
try { sportRows = rd('Oakland_Sports_Feed').filter(r => String(r.Cycle) === CYCLE); } catch (e) { console.warn('world-view: no Oakland_Sports_Feed in the dump; no sports rows shown'); }
const noteTo = (nt, hood) => { const h = hoods.find(x => x.name === hood); if (!h || !nt.n || !nt.x) { notesElsewhere.push(Object.assign({ hood: hood || '' }, nt)); return null; } h.notes.push(nt); return h; };
faithRows.forEach(r => {
  const nt = { k: 'f', n: ws(r.Organization), x: ws(r.EventDescription), type: ws(r.EventType) };
  if (ws(r.FaithTradition)) nt.trad = ws(r.FaithTradition); if (Number(r.Attendance) > 0) nt.att = Number(r.Attendance);
  const o = faithOrg.get(r.Organization);
  if (o) { if (ws(o.Leader)) nt.leader = ws(o.Leader); if (isPop(ws(o.LeaderPOPID))) nt.lid = ws(o.LeaderPOPID); if (Number(o.Congregation) > 0) nt.cong = Number(o.Congregation); if (ws(o.Character)) nt.ch = ws(o.Character); }
  const h = noteTo(nt, ws(r.Neighborhood));
  if (h) { const bi = h.biz.findIndex(b => b.n === nt.n); if (bi >= 0 && (h.lay.places.some(p => p.b === bi && p.half > 0) || h.lay.parcels.some(p => p.b === bi))) nt.b = bi; }
});
sportRows.forEach(r => {
  const notes = ws(r.Notes), angle = ws(r.StoryAngle), nt = { k: 's', n: dash(r.TeamsUsed), x: angle || trimSaid(notes), type: dash(r.EventType) };
  if (angle && notes) nt.notes = notes;
  [['SeasonType', 'season'], ['Team Record', 'rec'], ['Streak', 'streak'], ['FanSentiment', 'fan'], ['WeekRecord', 'week'], ['NamesUsed', 'names']].forEach(f => { const v = dash(r[f[0]]); if (v) nt[f[1]] = v; });
  // Where it stands (builder 2026-11-15: "Isn't the As it's own location ?"): at the team's own place, the franchise's
  // business on the ledger, on whichever street that is. The row's own neighborhood (HomeNeighborhood, where the
  // engine lands its effects) rides along as `lands`, and a home game still hangs that neighborhood's pennants.
  // A team with no business on a street stays a notice of the row's neighborhood.
  const lands = dash(r.HomeNeighborhood), tb = TEAM_BIZ[nt.n]; let th = null, tbi = -1;
  if (tb) hoods.forEach(h => { const bi = h.biz.findIndex(b => b.id === tb); if (bi >= 0 && (h.lay.places.some(p => p.b === bi && p.half > 0) || h.lay.parcels.some(p => p.b === bi))) { th = h; tbi = bi; } });
  if (th) { nt.b = tbi; if (lands) nt.lands = lands; noteTo(nt, th.name); } else noteTo(nt, lands);
  if (/^H:/.test(nt.week || '')) { const gh = hoods.find(x => x.name === lands); if (gh) gh.gameNight = 1; }
});
// Lived_Events (derived by the dump from LifeHistory_Log, the hospital and the archive: deaths, retirements,
// promotions in the last two cycles, each with the people it reached). The label is put together from the row's
// own fields (kind, cycle, roleType), not written. It stands at the person's home when their household has one on
// the street, else at a business they are key personnel of there, else on the pavement.
let livedRows = []; try { livedRows = rd('Lived_Events'); } catch (e) { console.warn('world-view: no Lived_Events in the dump; no deaths, retirements or promotions marked'); }
const LIVED_WORD = { death: 'Died', retirement: 'Retired', promotion: 'Promoted' };
livedRows.forEach(r => {
  const c = Number(r.cycle), kind = ws(r.kind), when = c === Number(CYCLE) ? 'this week' : c === Number(CYCLE) - 1 ? 'last week' : 'in week ' + c;
  const nt = { k: 'l', id: ws(r.id), n: ws(r.subjectName), kind, c, x: (LIVED_WORD[kind] || kind.charAt(0).toUpperCase() + kind.slice(1)) + ' ' + when + (ws(r.roleType) ? ' \u00B7 ' + ws(r.roleType) : '') };
  if (ws(r.roleType)) nt.role = ws(r.roleType); if (isPop(r.subject)) nt.sub = r.subject;
  const rec = (Array.isArray(r.recipients) ? r.recipients : []).filter(x => x && x.rel !== 'self' && isPop(x.pop) && ws(x.name)).map(x => [x.pop, ws(x.name), ws(x.rel)]); if (rec.length) nt.rec = rec;
  const h = !(c > 0) || c > Number(CYCLE) ? (notesElsewhere.push(Object.assign({ hood: ws(r.neighborhood) }, nt)), null) : noteTo(nt, ws(r.neighborhood));
  if (h) {
    const L = nt.sub && ledger.get(nt.sub), hh = L && L.HouseholdId;
    if (hh && h.homes.some(x => x.hh === hh)) nt.hh = hh;
    else { const bi = h.biz.findIndex(b => (runs.get(nt.sub) || []).some(x => x.BIZ_ID === b.id)); if (bi >= 0 && (h.lay.places.some(p => p.b === bi && p.half > 0) || h.lay.parcels.some(p => p.b === bi))) nt.b = bi; }
  }
});
// Initiative_Tracker: an initiative that passed, or is proposed or waiting on its vote, stands on each street its
// AffectedNeighborhoods names: at its own office when the row's BizID is a business there, else on the pavement.
// Only the row's status fields are shown (Status, ImplementationPhase, Stage, PolicyDomain, Budget, VoteCycle);
// its free-text notes are not, since they carry build notes (gap log G-EC62). A failed one stands nowhere.
let initRows = []; try { initRows = rd('Initiative_Tracker'); } catch (e) { console.warn('world-view: no Initiative_Tracker in the dump; no initiatives shown'); }
initRows.forEach(r => {
  const st = ws(r.Status).toLowerCase(); if (!ws(r.Name) || !st || st === 'failed') return;
  const base = { k: 'i', id: ws(r.InitiativeID), n: ws(r.Name), st, x: [st, ws(r.ImplementationPhase), ws(r.Stage) && ws(r.Stage) !== 'FAILED' ? 'stage: ' + ws(r.Stage).toLowerCase() : ''].filter(Boolean).join(' \u00B7 ') };
  if (ws(r.ImplementationPhase)) base.ph = ws(r.ImplementationPhase); if (ws(r.Stage)) base.stage = ws(r.Stage); if (ws(r.PolicyDomain)) base.dom = ws(r.PolicyDomain);
  if (Number(r.Budget) > 0) base.bud = Number(r.Budget); if (/^\d+$/.test(ws(r.VoteCycle))) base.vote = Number(ws(r.VoteCycle));
  const where = ws(r.AffectedNeighborhoods).split(/\s*[,;]\s*/).filter(Boolean); if (where.length) base.hoods = where.join(', ');
  const on = where.filter(n => hoods.some(h => h.name === n));
  if (!on.length) { notesElsewhere.push(Object.assign({ hood: where.join(', ') }, base)); return; }
  on.forEach(n => { const nt = Object.assign({}, base), h = noteTo(nt, n); if (h && ws(r.BizID)) { const bi = h.biz.findIndex(b => b.id === ws(r.BizID)); if (bi >= 0 && (h.lay.places.some(p => p.b === bi && p.half > 0) || h.lay.parcels.some(p => p.b === bi))) nt.b = bi; } });
});
// Community_Programs and Cultural_Ledger: what runs on a street and who of note belongs to it. There can be nine
// of them on one street, so each street gets one notice for its programs and one for its cultural figures, with
// the rows listed behind it. Active rows only; a row with no street (a City-wide program) is listed elsewhere.
const listNote = (k, title, rows, hoodOf, item) => {
  const by = {}; rows.forEach(r => { const n = ws(hoodOf(r)); (by[n] = by[n] || []).push(item(r)); });
  Object.keys(by).forEach(n => { const names = by[n].map(x => x.n); noteTo({ k, n: title, x: names.slice(0, 2).join(', ') + (names.length > 2 ? ' and ' + (names.length - 2) + ' more' : ''), list: by[n] }, n); });
};
let progRows = [], cultRows = [];
try { progRows = rd('Community_Programs').filter(r => ws(r.Status).toLowerCase() === 'active' && ws(r.Name)); } catch (e) { console.warn('world-view: no Community_Programs in the dump; no programs shown'); }
try { cultRows = rd('Cultural_Ledger').filter(r => ws(r.Status).toLowerCase() === 'active' && ws(r.Name)); } catch (e) { console.warn('world-view: no Cultural_Ledger in the dump; no cultural figures shown'); }
listNote('p', 'Community programs', progRows, r => r.Neighborhood, r => { const o = { n: ws(r.Name) }; if (ws(r.Type)) o.type = ws(r.Type); if (isPop(ws(r.Founder_POPID))) { o.f = ws(r.Founder_POPID); if (nameOf(o.f)) o.fn = nameOf(o.f); } if (/^\d+$/.test(ws(r.Founded_Cycle))) o.since = Number(ws(r.Founded_Cycle)); return o; });
listNote('c', 'Cultural figures', cultRows, r => r.Neighborhood, r => { const o = { n: ws(r.Name) }; [['RoleType', 'role'], ['FameCategory', 'cat'], ['CulturalDomain', 'dom'], ['CityTier', 'tier'], ['TrendTrajectory', 'trend']].forEach(f => { if (ws(r[f[0]])) o[f[1]] = ws(r[f[0]]); }); if (isPop(ws(r.UniverseLinks))) o.pop = ws(r.UniverseLinks); return o; });
// Transit_Metrics: this cycle's row for each station the engine's own list puts in a neighborhood (RAIL). It
// stands at the line where the street has one. The engine's usual ridership for the station (baseRidership)
// rides along, and life-rail.js runs trains closer together on a busier week than usual.
let transitRows = []; try { transitRows = rd('Transit_Metrics').filter(r => String(r.Cycle) === CYCLE && ws(r.Station)); } catch (e) { console.warn('world-view: no Transit_Metrics in the dump; no station ridership shown'); }
const stationBase = {}; try { new Function(fs.readFileSync(path.join(__dirname, '..', 'utilities', 'ensureTransitMetrics.js'), 'utf8') + '\nreturn OAKLAND_BART_STATIONS;')().forEach(s => { stationBase[s.station] = { hood: s.neighborhood, base: Number(s.baseRidership) || 0 }; }); } catch (e) { /* the station list is already warned about above */ }
transitRows.forEach(r => {
  const sb = stationBase[ws(r.Station)]; if (!sb) return; // a corridor row, or a station the engine's list does not have
  const riders = Number(r.RidershipVolume), ot = Number(r.OnTimePerformance);
  const nt = { k: 't', n: ws(r.Station) + ' station', x: [riders > 0 ? riders.toLocaleString('en-US') + ' riders' : '', ot > 0 ? Math.round(ot * 100) + '% on time' : '', ws(r.Notes)].filter(Boolean).join(' \u00B7 '), st: ws(r.Station) };
  if (riders > 0) nt.riders = riders; if (ot > 0) nt.ot = ot; if (sb.base > 0) nt.base = sb.base; if (ws(r.Notes)) nt.notes = ws(r.Notes); if (ws(r.Factors)) nt.why = ws(r.Factors);
  const h = noteTo(nt, sb.hood); if (h && h.lay.places.some(p => p.type === 'station' || p.type === 'rail')) nt.line = 1;
});
// WorldEvents_V3_Ledger and Texture_Trigger_Log: what the engine put on a street this cycle (an incident, a
// grievance, a busy pavement). A FAITH world event is the same event Faith_Ledger holds, already on the street, so
// it is left out here. A texture trigger with no neighborhood is citywide and is not put on any street.
const cap = v => { v = ws(v).toLowerCase().replace(/[_-]/g, ' '); return v.charAt(0).toUpperCase() + v.slice(1); };
let worldRows = [], textureRows = [];
try { worldRows = rd('WorldEvents_V3_Ledger').filter(r => String(r.Cycle) === CYCLE && ws(r.Domain).toUpperCase() !== 'FAITH' && ws(r.EventDescription)); } catch (e) { console.warn('world-view: no WorldEvents_V3_Ledger in the dump; no world events shown'); }
try { textureRows = rd('Texture_Trigger_Log').filter(r => String(r.Cycle) === CYCLE && ws(r.Neighborhood) && ws(r.Reason)); } catch (e) { console.warn('world-view: no Texture_Trigger_Log in the dump; no street textures shown'); }
worldRows.forEach(r => { const nt = { k: 'w', n: cap(r.Domain) || 'This week', x: ws(r.EventDescription) }; if (ws(r.EventType)) nt.type = ws(r.EventType); if (ws(r.Severity)) nt.sev = ws(r.Severity); noteTo(nt, ws(r.Neighborhood)); });
textureRows.forEach(r => { const nt = { k: 'x', n: cap(r.Domain) || 'This week', x: ws(r.Reason) }; if (ws(r.TextureKey)) nt.key = ws(r.TextureKey); if (ws(r.Intensity)) nt.sev = ws(r.Intensity); noteTo(nt, ws(r.Neighborhood)); });

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
  homesElsewhere,
  notesElsewhere,
  map: cityMap
};
hoods.forEach(h => { data.style[h.name] = STYLE[h.name]; });

// Required as a module (a check script, a test): the data and the pieces that made it, nothing written.
module.exports = { NUM_MAP, NUM_CRIME, data, hoods, canonProblems: missing, layout, placeType, kindOf, band, SIM_YEAR, CYCLE, STYLE, chaosRows, RAIL, talksRead };
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
  + hoods.filter(h => h.homes.length).map(h => { const res = new Set(((h.block || {}).parcels || []).map(p => p.id)), onRes = h.homes.filter(x => res.has(x.lot)).length; return h.name + ' ' + h.homes.length + (h.block ? ' (' + onRes + ' on its ' + Math.round(h.block.L) + ' m residential block)' : ''); }).join(', ')
  + (homesElsewhere.length ? '; ' + homesElsewhere.length + ' household(s) in a neighborhood with no street this week, not shown' : ''));
console.log('staff: ' + hoods.reduce((a, h) => a + h.people.filter(p => p.wk != null).length, 0) + ' people are shown on the street of the business the roster has them working at');
console.log('notices: ' + faithRows.length + ' faith event(s), ' + sportRows.length + ' sports row(s), ' + livedRows.length + ' lived event(s), ' + initRows.filter(r => ws(r.Status).toLowerCase() !== 'failed').length + ' initiative(s) not failed, ' + progRows.length + ' program(s), ' + cultRows.length + ' cultural figure(s), ' + transitRows.filter(r => stationBase[ws(r.Station)]).length + ' station row(s), ' + worldRows.length + ' world event(s), ' + textureRows.length + ' street texture(s) — ' + hoods.filter(h => h.notes.length).map(h => h.name + ': ' + h.notes.map(nt => nt.n + (nt.k === 's' ? ' ' + nt.type + (nt.week ? ' ' + nt.week : '') : nt.list ? ' (' + nt.list.length + ')' : nt.k === 't' ? (nt.line ? ' (at the line)' : ' (no line drawn)') : nt.hh ? ' (at their home)' : nt.b != null ? ' (at its building)' : ' (on the pavement)')).join(', ')).join('; ') + (notesElsewhere.length ? '; not on a street: ' + notesElsewhere.map(nt => nt.n + ' → ' + (nt.hood || 'no neighborhood')).join(', ') : ''));
console.log('chaos cars:', chaosRead == null ? 'no world summary for C' + CYCLE + ' (none drawn)' : chaosRead.length + ' this week — ' + hoods.filter(h => h.chaos.length).map(h => h.name + ': ' + h.chaos.map(c => c.n + ' (' + c.o + (c.to && c.to !== h.name ? ' → ' + c.to : '') + ')').join(', ')).join('; ') + (chaosElsewhere.length ? '; not on a street: ' + chaosElsewhere.map(c => c.n + ' → ' + c.to).join(', ') : ''));
}
