// Read-only: turns last week's beat dump into one self-contained page. Writes nothing to the project.
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
    biz: biz.filter(b => b.Neighborhood === name).map(b => ({ n: b.Name, s: b.Sector, e: Number(b.Employee_Count) || 1 })),
    pop: d ? { a: +d.Adults, st: +d.Students, se: +d.Seniors } : null
  };
}).sort((a, b) => (b.name === 'Grand Lake') - (a.name === 'Grand Lake') || b.lines - a.lines);

const data = {
  cycle: +CYCLE,
  weather: { type: weather.Type || '', temp: weather.Temp || '', streak: weather.Streak || '', streakType: weather.StreakType || '' },
  hoods
};

// Neighborhood character: every drawing choice hangs off a phrase in the canon file. Refuse to build if one has gone.
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
data.style = {}; hoods.forEach(h => { data.style[h.name] = STYLE[h.name]; });
data.landmarks = Object.assign({}, STYLE.LANDMARKS, { station: STYLE.STATION_SIGN });

const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const out = tpl.replace('/*__DATA__*/null', JSON.stringify(data).replace(/</g, '\\u003c'));
const dest = process.argv[2] || path.join(__dirname, 'oakland-week.html');
fs.writeFileSync(dest, out);
console.log('hoods', hoods.length, 'people shown', hoods.reduce((s, h) => s + h.people.length, 0), 'of', hoods.reduce((s, h) => s + h.total, 0),
  'lines', hoods.reduce((s, h) => s + h.lines, 0), 'bytes', out.length);
console.log(hoods.map(h => h.name + ':' + h.people.length + '/' + h.biz.length).join('  '));
