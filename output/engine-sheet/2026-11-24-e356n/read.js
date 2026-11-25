// engine.356 bench read for Cycle <C> on SANDBOX 1004 — programs and congregations as places, on top of A1+A2.
//   node read.js <C>
// LifeHistory_Log rows of the Cycle. Every place: tag is a Business_Ledger id or an active Community_Programs id.
// Each placed line is put in one class and checked:
//   venue        — $VENUE / template; the name is in the text; the place fits a meal / drink / errand
//   row          — a line whose row names a business or a program; the name is in the text
//   program      — the $PROGRAM slot; the program is in the text, of the citizen's hood; its Place_Kind is one of the
//                  line's at: tags (never blank / none); its Type = the line's prog: tag when there is one.
//                  The two bench lines with no at: / prog: tag, or at:none, must never land.
//   congregation — the $CONGREGATION slot, or a place:congregation line; the place is the citizen's OWN congregation
//   fanout       — source:faith — the week's faith event; the congregation is in the text
//   employer     — a shift at the citizen's EmployerBizId
// No raw place:employer / place:congregation, no " near " tail. A zero in program / congregation / fanout / a
// PRG row is reported as NOT PROVEN, never as a pass.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
const sheets = require('/root/GodWorld/lib/sheets');
const C = String(process.argv[2]);
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const rowPlace = {};
for (const o of J(__dirname + '/../2026-11-24-e356j/ecl-act-tags.json')) { const p = o.add.find(t => /^place:BIZ-/.test(t)); if (p) rowPlace[o.text] = p.slice(6); }
for (const o of J(__dirname + '/../2026-11-24-e356k/ecl-place-names.json')) rowPlace[o.newText] = o.place.slice(6);
const conLines = {};
for (const o of J(__dirname + '/../2026-11-24-e356l/ecl-places.json')) {
  const p = o.add.find(t => /^place:(BIZ|PRG)-/.test(t));
  if (p) rowPlace[o.newText || o.oldText] = p.slice(6);
  if (o.add.indexOf('place:congregation') >= 0) conLines[o.oldText] = 1;
}
(async () => {
  const log = (await sheets.getSheetAsObjects('LifeHistory_Log')).filter(r => String(r.Cycle) === C);
  const biz = await sheets.getSheetAsObjects('Business_Ledger');
  const led = await sheets.getSheetAsObjects('Simulation_Ledger');
  const progs = await sheets.getSheetAsObjects('Community_Programs');
  const orgs = await sheets.getSheetAsObjects('Faith_Organizations');
  const byId = Object.fromEntries(biz.map(b => [b.BIZ_ID, b]));
  const prg = Object.fromEntries(progs.filter(p => String(p.Status).toLowerCase() === 'active').map(p => [p.Program_ID, p]));
  const emp = Object.fromEntries(led.map(r => [r.POPID, String(r.EmployerBizId || '').trim()]));
  const bizByName = Object.fromEntries(biz.map(b => [String(b.Name).trim(), b.BIZ_ID]));
  const ownOrg = {}; let members = 0, membersOnLedgerOrg = 0;
  for (const o of orgs) {
    let ml = []; try { ml = JSON.parse(o.MembersList || '[]'); } catch (e) {}
    for (const m of ml) { ownOrg[String(m).trim().toUpperCase()] = o.Organization; members++; if (bizByName[o.Organization]) membersOnLedgerOrg++; }
  }
  const problems = [], acts = {}, how = { venue: 0, row: 0, rowProgram: 0, program: 0, congregation: 0, fanout: 0, employer: 0 }, ex = {};
  const byKind = {};
  let placed = 0, tails = 0, raw = 0, conLinesDrawn = 0, conLinesByMember = 0; const people = new Set(), places = new Set();
  for (const r of log) {
    const t = r.EventText || '', tag = r.EventTag || '', parts = tag.split('|');
    const act = (parts.find(p => p.indexOf('act:') === 0) || '').slice(4);
    if (act) acts[act] = (acts[act] || 0) + 1;
    if (parts.indexOf('place:employer') >= 0 || parts.indexOf('place:congregation') >= 0) raw++;
    if (conLines[t]) { conLinesDrawn++; if (ownOrg[String(r.POPID).toUpperCase()]) conLinesByMember++; }
    const pls = parts.filter(p => p.indexOf('place:') === 0 && p !== 'place:employer' && p !== 'place:congregation');
    for (const p of pls) if (!/^place:(BIZ|PRG)-\d+$/.test(p)) problems.push('malformed place tag: ' + p);
    if (pls.length > 1) problems.push('two places on one line: ' + tag.slice(0, 90));
    if (/ near /.test(t) && parts.indexOf('venue:local') >= 0) tails++;
    const pl = pls.length ? pls[0].slice(6) : '';
    if (!pl) continue;
    placed++; people.add(r.POPID); places.add(pl);
    const isPrg = pl.indexOf('PRG-') === 0, b = isPrg ? prg[pl] : byId[pl];
    if (!b) { problems.push('place id not on ' + (isPrg ? 'Community_Programs (active)' : 'Business_Ledger') + ': ' + pl); continue; }
    const nm = String(isPrg ? b.Name : b.Name).trim();
    const own = ownOrg[String(r.POPID).toUpperCase()];
    const progTag = (parts.find(p => p.indexOf('prog:') === 0) || '').slice(5);
    const ats = parts.filter(p => p.indexOf('at:') === 0).map(p => p.slice(3));
    let k;
    if (parts.indexOf('venue:local') >= 0) {
      k = 'venue';
      if (!t.includes(nm)) problems.push(pl + ' name not in the text: ' + t.slice(0, 80));
      const sec = String(b.Sector || ''), bar = /bar\b|pubs?\b|brewery|lounge|nightlife|tap\s?room|social club/i.test(sec);
      const food = /cafe|coffee|bakery|restaurant|dining|diner|food|bar\b|pubs?\b|brewery|lounge|nightlife|club|market|kitchen|ramen|grill/i.test(sec) && !/retail|shop|store|boutique|grocery/i.test(sec);
      if (act === 'drink' && !bar) problems.push('drink line at a place that is no bar: ' + nm + ' [' + sec + ']');
      if (act === 'meal' && !food) problems.push('meal line at a place that serves none: ' + nm + ' [' + sec + ']');
      if (act === 'errand' && food && !/bakery|patisserie|roaster|market|grocer/i.test(sec)) problems.push('errand line at a place that is no shop: ' + nm + ' [' + sec + ']');
    } else if (rowPlace[t] === pl) {
      k = isPrg ? 'rowProgram' : 'row';
      if (!t.includes(nm)) problems.push(pl + ' row place not named: ' + t.slice(0, 80));
    } else if (isPrg) {
      k = 'program';
      const kind = String(b.Place_Kind || '').trim().toLowerCase().replace(/\s+/g, '-');
      if (!progTag && !ats.length) problems.push('program slot line with no at: / prog: tag: ' + t.slice(0, 80));
      if (!kind || kind === 'none') problems.push(pl + ' has no place kind (' + kind + '): ' + t.slice(0, 60));
      if (ats.length && ats.indexOf(kind) < 0) problems.push(pl + ' kind ' + kind + ' is not one the line asks for (' + ats.join(',') + ')');
      byKind[kind] = (byKind[kind] || 0) + 1;
      if (progTag && b.Type !== progTag) problems.push(pl + ' Type ' + b.Type + ' is not the line\'s ' + progTag);
      if (!t.includes(nm)) problems.push(pl + ' program not in the text: ' + t.slice(0, 80));
      if (String(b.Neighborhood).trim() !== String(r.Neighborhood).trim()) problems.push(pl + ' (' + b.Neighborhood + ') is not in the citizen\'s hood ' + r.Neighborhood);
    } else if (parts[0] === 'source:faith' || parts.indexOf('source:faith') >= 0) {
      k = 'fanout';
      if (!t.includes(nm)) problems.push(pl + ' congregation not in the text: ' + t.slice(0, 80));
    } else if (conLines[t] || /\$?CONGREGATION/.test(t) || (own && bizByName[own] === pl && act === 'service')) {
      k = 'congregation';
      if (!own) problems.push(r.POPID + ' placed at a congregation but belongs to none: ' + t.slice(0, 70));
      else if (bizByName[own] !== pl) problems.push(r.POPID + ' placed at ' + nm + ', their own is ' + own);
      if (!conLines[t] && !t.includes(nm)) problems.push(pl + ' congregation not in the text: ' + t.slice(0, 80));
    } else if (act === 'shift') {
      k = 'employer';
      if (emp[r.POPID] !== pl) problems.push(r.POPID + ' shift place ' + pl + ' is not their employer ' + emp[r.POPID]);
    } else { k = 'other'; problems.push('place with no known path: ' + t.slice(0, 60) + ' [' + tag.slice(0, 80) + ']'); }
    how[k] = (how[k] || 0) + 1;
    (ex[k] = ex[k] || []).length < 4 && ex[k].push(r.Name + ' (' + r.Neighborhood + '): ' + t.slice(0, 110) + '  [' + nm + ']');
  }
  if (!log.length) problems.push('no log rows for C' + C);
  if (tails) problems.push(tails + ' " near " tails left');
  if (raw) problems.push(raw + ' raw place:employer / place:congregation tags on the log');
  if (!Object.keys(acts).length) problems.push('0 lines carry act:');
  for (const r of log) if (/walked past the sign for |wrote a small check to /.test(r.EventText || '')) problems.push('a line that asks for no kind landed: ' + r.EventText.slice(0, 80));
  for (const r of log) if (/\$(PROGRAM|CONGREGATION)/.test(r.EventText || '')) problems.push('unfilled slot on the log: ' + r.EventText.slice(0, 80));
  const notProven = ['program'].filter(k => !how[k]).concat(Object.keys(byKind).length < 3 ? ['fewer than 3 kinds drawn'] : []);
  const out = { cycle: +C, lines: log.length, people: new Set(log.map(r => r.POPID)).size, actLines: acts,
    linesWithPlace: placed, peopleWithPlace: people.size, distinctPlaces: places.size, placeBy: how,
    trackedMembers: members, membersOfALedgerCongregation: membersOnLedgerOrg, faithLinesDrawn: conLinesDrawn, faithLinesDrawnByMembers: conLinesByMember,
    programLinesByKind: byKind, notProven, nearTailsLeft: tails, examples: ex, problems, verdict: problems.length ? 'FAIL' : (notProven.length ? 'PASS, not proven: ' + notProven.join(', ') : 'PASS') };
  console.log(JSON.stringify(out, null, 1));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
