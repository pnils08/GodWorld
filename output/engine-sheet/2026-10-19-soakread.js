// engine.300 soak readback, one Cycle at a time, on SANDBOX 1004 (engine.286 plan §Bench soak → Readback contract).
// usage: node soakread.js <cycle> [--init]   --init = capture the C112 baseline state (no series row)
// Reads the bench only (title asserted). Never calls engineAuditor main().
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const { buildCitizenScoreboard, buildCitizenStates, cycleStamp } = require('/root/GodWorld/scripts/engineAuditor.js');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const DIR = '/root/GodWorld/output/engine-sheet/engine300-soak';
const SERIES = '/root/GodWorld/output/engine-sheet/2026-10-19-engine300-soak-c113-c132.jsonl';
const cycle = Number(process.argv[2]), INIT = process.argv.includes('--init');
const FLIP = 5.5, WED = 8;
(async () => {
  if (!Number.isInteger(cycle)) throw new Error('usage: soakread.js <cycle> [--init]');
  fs.mkdirSync(DIR, { recursive: true });
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const api = google.sheets({ version: 'v4', auth });
  const title = (await api.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE || BENCH === process.env.GODWORLD_SHEET_ID) throw new Error('target check failed');
  const r = await api.spreadsheets.values.batchGet({ spreadsheetId: BENCH, ranges: ['Simulation_Ledger', 'Household_Ledger', 'Relationship_Bonds', 'World_Config!A1:B400'], valueRenderOption: 'UNFORMATTED_VALUE' });
  const objs = v => { const h = v[0]; return v.slice(1).map(row => Object.fromEntries(h.map((k, i) => [k, row[i] === undefined ? '' : row[i]]))); };
  const [sl, hh, rb, wc] = r.data.valueRanges.map(x => x.values || []);
  const counter = Number((wc.find(x => x[0] === 'cycleCount') || [])[1]);
  if (counter !== cycle) throw new Error(`bench cycleCount ${counter} != ${cycle}`);
  const need = ['BondId', 'CitizenA', 'CitizenB', 'BondType', 'Intensity', 'Status', 'CycleCreated', 'LastUpdate'];
  for (const k of need) if (!rb[0].includes(k)) throw new Error('Relationship_Bonds header missing ' + k);
  const ledger = objs(sl), households = objs(hh), bonds = objs(rb);
  const states = buildCitizenStates(ledger, households);
  const cit = {};
  for (const x of ledger) { const id = String(x.POPID || '').trim(); if (!id) continue;
    cit[id] = { nm: ((x.First || '') + ' ' + (x.Last || '')).trim(), m: String(x.MaritalStatus || '').toLowerCase(), sp: String(x.SpouseId || ''), hh: String(x.HouseholdId || ''),
      par: String(x.ParentIds || ''), ch: String(x.ChildrenIds || ''), lpc: Number(x.LastPromotionCycle) || 0, inc: Number(x.Income) || 0, by: Number(x.BirthYear) || 0, s: String(x.Status || '').toLowerCase() }; }
  const bmap = {};
  for (const b of bonds) if (b.BondId) bmap[b.BondId] = { t: String(b.BondType), i: Number(b.Intensity) || 0, s: String(b.Status), a: String(b.CitizenA), b: String(b.CitizenB), c: b.CycleCreated };
  const snap = { cycle, citizenStates: states, cit, bmap };
  const prevPath = path.join(DIR, `state-c${cycle - 1}.json`);
  fs.writeFileSync(path.join(DIR, `state-c${cycle}.json`), JSON.stringify(snap));
  if (INIT) { console.log(`baseline C${cycle}: ${Object.keys(cit).length} citizens, ${Object.keys(bmap).length} bonds`); return; }
  if (!fs.existsSync(prevPath)) throw new Error('no prior state ' + prevPath);
  const prev = JSON.parse(fs.readFileSync(prevPath, 'utf8'));
  const sb = buildCitizenScoreboard(cycle, ledger, states, [{ cycle: prev.cycle, citizenStates: prev.citizenStates }]);
  const stamp = cycleStamp(cycle);
  // tags this Cycle: LifeEvent-* by kind/dir/band, [Promotion] lines with route
  const tags = {}, promoLines = {};
  for (const x of ledger) for (const line of String(x.LifeHistory || '').split('\n')) {
    if (!line.startsWith(stamp + ' ')) continue;
    const m = line.match(/^\S+ — \[([^\]]+)\] ?(.*)$/); if (!m) continue;
    if (/^LifeEvent-/.test(m[1])) tags[m[1]] = (tags[m[1]] || 0) + 1;
    if (m[1] === 'Promotion') promoLines[String(x.POPID).trim()] = m[2];
  }
  // promotions, structural
  const promos = [];
  for (const [id, c] of Object.entries(cit)) { const p = prev.cit[id]; if (c.lpc === cycle && (!p || p.lpc !== cycle)) {
    const txt = promoLines[id] || ''; const route = !txt ? 'unstamped' : /the break paid off/.test(txt) ? 'markRaise' : /^Promoted at /.test(txt) ? 'employerBudget' : 'dieL';
    promos.push({ id, nm: c.nm, route, incFrom: p ? p.inc : null, incTo: c.inc }); } }
  // births and other mints
  const newIds = Object.keys(cit).filter(id => !prev.cit[id]);
  const kids = [], otherMints = [];
  for (const id of newIds) { const c = cit[id]; let par = []; try { par = JSON.parse(c.par || '[]'); } catch (e) { par = c.par ? [c.par] : []; }
    if (par.length) { const h = households.find(x => String(x.HouseholdId) === c.hh); let mem = []; try { mem = JSON.parse(h && h.Members || '[]'); } catch (e) {}
      kids.push({ id, nm: c.nm, parents: par, hh: c.hh, inHousehold: mem.includes(id), parentsList: par.map(pid => (cit[pid] && cit[pid].ch || '').includes(id)) }); }
    else otherMints.push({ id, nm: c.nm }); }
  // weddings, structural
  const weds = Object.entries(cit).filter(([id, c]) => c.m === 'married' && prev.cit[id] && prev.cit[id].m !== 'married').map(([id, c]) => ({ id, nm: c.nm, sp: c.sp }));
  // bonds
  const byTS = {}; let romantic = 0, courtship = 0, friendAtFlip = 0, romAtWed = 0;
  const crossings = { friendFlipBar: [], romanticWedBar: [], typeFlips: [], newBonds: 0, ended: 0 };
  for (const [id, b] of Object.entries(bmap)) { const k = b.t + '|' + b.s; byTS[k] = (byTS[k] || 0) + 1;
    if (b.t === 'romantic') { romantic++; if (/^GC:/.test(b.b)) courtship++; if (b.i >= WED) romAtWed++; }
    if (b.t === 'friendship' && b.i >= FLIP) friendAtFlip++;
    const p = prev.bmap[id];
    if (!p) { crossings.newBonds++; continue; }
    if (p.t !== b.t) crossings.typeFlips.push(`${id} ${p.t}->${b.t} @${b.i}`);
    if (b.t === 'friendship' && p.i < FLIP && b.i >= FLIP) crossings.friendFlipBar.push(`${id} ${p.i}->${b.i}`);
    if (b.t === 'romantic' && p.i < WED && b.i >= WED) crossings.romanticWedBar.push(`${id} ${p.i}->${b.i}`);
    if (p.s !== b.s && /ended/.test(b.s)) crossings.ended++; }
  const topFriend = Object.values(bmap).filter(b => b.t === 'friendship').map(b => b.i).sort((a, b) => b - a).slice(0, 5);
  let diag59 = null; try { const raw = JSON.parse(fs.readFileSync(fs.readdirSync('/root/GodWorld/output/engine-sheet/benchfire-raw').filter(f => f.endsWith(`-c${cycle}.json`)).map(f => '/root/GodWorld/output/engine-sheet/benchfire-raw/' + f).sort().pop(), 'utf8')); diag59 = raw.diag59 ? Object.fromEntries(Object.entries(raw.diag59).filter(([k, v]) => typeof v === 'number')) : null; } catch (e) {}
  const row = { cycle, stamp, scoreboard: sb.counts, changes: sb.changes && Object.fromEntries(Object.entries(sb.changes).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])),
    weddings: weds, births: kids, otherMints, promotions: promos, promotionRoutes: promos.reduce((a, p) => (a[p.route] = (a[p.route] || 0) + 1, a), {}),
    lifeEventTags: tags, bonds: { total: Object.keys(bmap).length, byTypeStatus: byTS, romantic, courtship, friendshipAtOrAboveFlip: friendAtFlip, romanticAtOrAboveWedding: romAtWed, topFriendshipIntensity: topFriend, crossings }, diag59 };
  fs.appendFileSync(SERIES, JSON.stringify(row) + '\n');
  console.log(JSON.stringify({ cycle, scoreboard: sb.counts, weddings: weds.length, births: kids.length, otherMints: otherMints.length, promotions: row.promotionRoutes,
    romantic, courtship, friendAtFlip, romAtWed, topFriend, flips: crossings.typeFlips.length, newBonds: crossings.newBonds, diag59 }));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
