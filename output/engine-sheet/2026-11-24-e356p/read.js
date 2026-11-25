// engine.356 cut A3 bench read for Cycle <C> on SANDBOX 1004 — with whom.
//   node read.js <C>
// LifeHistory_Log rows of the Cycle that carry contactPopId:. Two classes:
//   bond engine — TrustGuarded / ConnectionMaintained / ConnectionWithdrawn (bondEngine's own lines, older than A3)
//   line        — a $CONTACT line of the citizen-event writer. Checked, each one:
//     the person is a Simulation_Ledger row, not the citizen, Status not deceased / traded / pending / inactive;
//     the person's name is in the text; exactly one with:<kind>, and it is one the line asked for (bench-lines.json);
//     the kind is true on the bench tabs — coworker: same BIZ- EmployerBizId; housemate: same HouseholdId;
//     a bond kind: a Relationship_Bonds row between the two of a type that maps to it (read after the fire —
//     a bond the same fire created or ended is reported, not failed);
//     place:their-home became place:<the other's HouseholdId>; the shift line sits at the citizen's own employer.
// No raw $CONTACT, no "someone familiar", no place:their-home left; the with:stranger line never lands.
// A kind that drew 0 lines is NOT PROVEN, never a pass.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
const sheets = require('/root/GodWorld/lib/sheets');
const C = String(process.argv[2]);
const bench = JSON.parse(fs.readFileSync(__dirname + '/bench-lines.json', 'utf8'));
const KIND = { friendship: 'friend', alliance: 'friend', family: 'family', romantic: 'partner', neighbor: 'neighbor', mentorship: 'mentor', rivalry: 'rival', sports_rival: 'rival', tension: 'rival', professional: 'colleague', festival: 'acquaintance' };
const DEAD = { deceased: 1, traded: 1, pending: 1, inactive: 1 };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// each bench line as a matcher: its text with the slots open, and the kinds it asks for
const lines = bench.map(b => ({
  text: b[3],
  re: new RegExp('^' + esc(b[3]).replace(/\\\$CONTACT/g, '(.+?)').replace(/\\\$VENUE/g, '.+?') + '$'),
  asks: b[6].split(',').filter(t => t.indexOf('with:') === 0).map(t => t.slice(5)),
  theirHome: b[6].split(',').indexOf('place:their-home') >= 0,
  shift: b[6].split(',').indexOf('place:employer') >= 0
}));
(async () => {
  const log = (await sheets.getSheetAsObjects('LifeHistory_Log')).filter(r => String(r.Cycle) === C);
  const led = await sheets.getSheetAsObjects('Simulation_Ledger');
  const bonds = await sheets.getSheetAsObjects('Relationship_Bonds');
  const P = {};
  for (const r of led) P[String(r.POPID).trim().toUpperCase()] = { name: ((r.First || '') + ' ' + (r.Last || '')).trim(), st: String(r.Status || '').trim().toLowerCase(), biz: String(r.EmployerBizId || '').trim(), hh: String(r.HouseholdId || '').trim() };
  const bondKinds = {}; // "A|B" -> { kind: status }
  for (const b of bonds) {
    const a = String(b.CitizenA || '').trim().toUpperCase(), c = String(b.CitizenB || '').trim().toUpperCase();
    const k = KIND[String(b.BondType || '').trim().toLowerCase()];
    if (!k) continue;
    const st = String(b.Status || '').toLowerCase();
    for (const key of [a + '|' + c, c + '|' + a]) { const m = (bondKinds[key] = bondKinds[key] || {}); if (m[k] !== 'active') m[k] = st; } // an active row wins
  }
  const problems = [], notes = [], byKind = {}, byLine = {}, ex = {};
  let homesNoHousehold = 0, engineLines = 0, lineCount = 0, raw = 0, vague = 0, homes = 0, shifts = 0, twoSlot = 0;
  for (const r of log) {
    const t = r.EventText || '', parts = String(r.EventTag || '').split('|'), self = String(r.POPID).trim().toUpperCase();
    if (/\$CONTACT/.test(t)) { raw++; problems.push('unfilled $CONTACT on the log: ' + t.slice(0, 80)); }
    if (/someone familiar/.test(t)) vague++;
    if (parts.indexOf('place:their-home') >= 0) problems.push('raw place:their-home on the log: ' + t.slice(0, 70));
    const ln = lines.find(l => l.re.test(t));
    const cp = parts.filter(p => p.indexOf('contactPopId:') === 0).map(p => p.slice(13));
    const withs = parts.filter(p => p.indexOf('with:') === 0).map(p => p.slice(5));
    if (ln && ln.asks.indexOf('stranger') >= 0) { problems.push('the with:stranger line landed: ' + t); continue; }
    if (!cp.length) {
      if (ln) problems.push('a bench with-whom line carries no contactPopId: ' + t.slice(0, 80));
      if (withs.length) problems.push('with: tag and no contactPopId: ' + t.slice(0, 80));
      continue;
    }
    if (/^(TrustGuarded|ConnectionMaintained|ConnectionWithdrawn)$/.test(parts[0])) { engineLines++; continue; }
    lineCount++;
    if (cp.length > 1) problems.push('two contactPopId tags: ' + t.slice(0, 80));
    const o = cp[0], op = P[o];
    if (!op) { problems.push(o + ' is not a ledger row: ' + t.slice(0, 70)); continue; }
    if (o === self) problems.push(self + ' is with themselves: ' + t.slice(0, 70));
    if (DEAD[op.st]) problems.push(o + ' is ' + op.st + ': ' + t.slice(0, 70));
    if (!op.name || t.indexOf(op.name) < 0) problems.push(o + ' (' + op.name + ') is not named in the text: ' + t.slice(0, 80));
    if (withs.length !== 1) { problems.push(withs.length + ' with: tags on a line: ' + parts.join('|').slice(0, 120)); continue; }
    const k = withs[0];
    byKind[k] = (byKind[k] || 0) + 1;
    if (ln) {
      byLine[ln.text] = (byLine[ln.text] || 0) + 1;
      if (ln.asks.length && ln.asks.indexOf(k) < 0) problems.push('kind ' + k + ' is not one the line asks for (' + ln.asks.join(',') + '): ' + t.slice(0, 70));
      if (!ln.asks.length && (k === 'coworker' || k === 'housemate' || k === 'rival')) problems.push('a line with no ask drew a ' + k + ': ' + t.slice(0, 70));
    } else notes.push('contact line that is no bench line: ' + t.slice(0, 80) + ' [' + parts[0] + ']');
    const me = P[self] || {};
    if (k === 'coworker') { if (!/^BIZ-/.test(me.biz) || me.biz !== op.biz) problems.push(self + ' / ' + o + ' are not at one employer (' + me.biz + ' / ' + op.biz + ')'); }
    else if (k === 'housemate') { if (!me.hh || me.hh !== op.hh) problems.push(self + ' / ' + o + ' are not one household (' + me.hh + ' / ' + op.hh + ')'); }
    else {
      const bk = bondKinds[self + '|' + o];
      if (!bk || !(k in bk)) problems.push(self + ' / ' + o + ' have no ' + k + ' bond row: ' + t.slice(0, 60));
      else if (bk[k] !== 'active') notes.push(self + ' / ' + o + ' ' + k + ' bond is ' + bk[k] + ' after the fire');
    }
    const pls = parts.filter(p => p.indexOf('place:') === 0).map(p => p.slice(6));
    if (pls.length > 1) problems.push('two places on one line: ' + parts.join('|').slice(0, 120));
    if (Object.values(KIND).concat(['coworker', 'housemate']).indexOf(k) < 0) problems.push('a kind that is no kind: with:' + k);
    if (ln && ln.theirHome) {
      homes++; if (!op.hh) homesNoHousehold++;
      if (op.hh ? (pls.length !== 1 || pls[0] !== op.hh) : pls.length) problems.push('their-home line place ' + pls.join(',') + ' is not ' + o + '\'s household ' + (op.hh || '(none)'));
    }
    if (ln && ln.shift) { shifts++; if (pls.length !== 1 || pls[0] !== me.biz) problems.push('shift line place ' + pls.join(',') + ' is not the citizen\'s employer ' + me.biz); }
    if (ln && /\$VENUE/.test(ln.text)) { twoSlot++; if (pls.length !== 1 || !/^BIZ-\d+$/.test(pls[0])) problems.push('person + place line carries no business place: ' + t.slice(0, 70)); }
    (ex[k] = ex[k] || []).length < 3 && ex[k].push(r.Name + ' (' + r.Neighborhood + '): ' + t.slice(0, 110) + '  [' + parts.filter(p => /^(with|place|contactPopId|act):/.test(p)).join(' ') + ']');
  }
  if (!log.length) problems.push('no log rows for C' + C);
  if (!lineCount) problems.push('0 with-whom lines landed');
  const want = ['friend', 'family', 'neighbor', 'coworker', 'housemate', 'rival', 'colleague', 'partner'];
  const notProven = want.filter(k => !byKind[k]).map(k => 'kind ' + k).concat(homes ? [] : ['their-home']).concat(shifts ? [] : ['shift with a coworker']).concat(twoSlot ? [] : ['person + place']);
  const out = { cycle: +C, lines: log.length, people: new Set(log.map(r => r.POPID)).size, bondEngineContactLines: engineLines,
    withLines: lineCount, byKind, byLine, theirHomeLines: homes, theirHomeWithNoHouseholdOnTheirRow: homesNoHousehold, shiftLines: shifts, personAndPlaceLines: twoSlot, someoneFamiliar: vague,
    notProven, examples: ex, notes: notes.slice(0, 12), problems, verdict: problems.length ? 'FAIL' : (lineCount ? (notProven.length ? 'PASS, not proven: ' + notProven.join(', ') : 'PASS') : 'FAIL') };
  console.log(JSON.stringify(out, null, 1));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
