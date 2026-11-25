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
  shift: b[6].split(',').indexOf('place:employer') >= 0,
  both: b[6].split(',').indexOf('shared:both') >= 0,
  sized: /dial:[a-z]+:(up|down):[SML]/i.test(b[6])
}));
// Bond-called moments (on top of the with-whom checks):
//   the seven bondMoment* keys are on the bench World_Config; a line with bond:called is a bond-kind line;
//   nobody carries more bond-called lines than bondMomentMaxPerWeek; a shared:both line has its twin on the
//   other person's record (names changed places, contactPopId back), a line without it has none;
//   a line that names its person leads with a -M tag (bondMomentDialSize 2);
//   each bond's Intensity change against bonds-before.json (written before the fire), bonds with a moment
//   beside bonds without, by type — reported, and a moment bond that fell is listed.
(async () => {
  const log = (await sheets.getSheetAsObjects('LifeHistory_Log')).filter(r => String(r.Cycle) === C);
  const led = await sheets.getSheetAsObjects('Simulation_Ledger');
  const bonds = await sheets.getSheetAsObjects('Relationship_Bonds');
  const cfg = Object.fromEntries((await sheets.getSheetData('World_Config')).map(r => [String(r[0] || '').trim(), r[1]]));
  const CFG_KEYS = ['bondMomentMaxPerWeek', 'bondMomentChanceScale', 'bondMomentDialSize', 'bondMomentStepPartner', 'bondMomentStepFriend', 'bondMomentStepFamily', 'bondMomentStepRival'];
  const bmMax = Number(cfg.bondMomentMaxPerWeek);
  const sizeBand = Number(cfg.bondMomentDialSize) >= 4 ? 'L' : (Number(cfg.bondMomentDialSize) >= 2 ? 'M' : 'S');
  const minorOrGone = p => { const r = led.find(x => String(x.POPID).trim().toUpperCase() === p) || {}; const by = Number(r.BirthYear) || 0; return by > 1900 && (2040 + Math.ceil(+C / 52) - 1) - by < 18; };
  let before = []; try { before = JSON.parse(fs.readFileSync(__dirname + '/bonds-before.json', 'utf8')); } catch (e) {}
  const calledBy = {}, momentPairs = {}, twinKey = {}; let called = 0, twins = 0, sizedM = 0, reciprocal = 0;
  for (const r of log) twinKey[String(r.POPID).trim().toUpperCase() + '|' + (r.EventText || '')] = String(r.EventTag || '');
  const P = {};
  for (const r of led) P[String(r.POPID).trim().toUpperCase()] = { name: ((r.First || '') + ' ' + (r.Last || '')).trim(), st: String(r.Status || '').trim().toLowerCase(), biz: String(r.EmployerBizId || '').trim(), hh: String(r.HouseholdId || '').trim() };
  let beforeBonds = []; try { beforeBonds = JSON.parse(fs.readFileSync(__dirname + '/bonds-before.json', 'utf8')); } catch (e) {}
  // a line's kind is judged on the bonds as they stood BEFORE the fire: the same fire can deepen a
  // professional bond into a friendship or turn a friendship romantic (run 1: 7 such lines read as failures)
  const bondKinds = {}; // "A|B" -> { kind: status }
  for (const b of (beforeBonds.length ? beforeBonds : bonds)) {
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
    if (parts.indexOf('bond:called') >= 0) {
      called++; calledBy[self] = (calledBy[self] || 0) + 1;
      if (k === 'coworker' || k === 'housemate') problems.push('a bond-called line with no bond kind (' + k + '): ' + t.slice(0, 60));
    }
    if (k !== 'coworker' && k !== 'housemate') momentPairs[[self, o].sort().join('|') + '|' + k] = 1;
    if (ln && !ln.sized) { if (new RegExp('-' + sizeBand + '$').test(parts[0])) sizedM++; else problems.push('a line that names its person does not lead with a -' + sizeBand + ' tag: ' + parts[0] + ' — ' + t.slice(0, 60)); }
    if (ln && op.name && (P[self] || {}).name) {
      const tw = twinKey[o + '|' + t.split(op.name).join(P[self].name)];
      const twParts = tw === undefined ? [] : tw.split('|');
      const isBack = twParts.indexOf('contactPopId:' + self) >= 0;
      const isTwin = isBack && !twParts.some(x => x.indexOf('ageGroup:') === 0);   // a written twin carries no ageGroup: of its own
      const selfIsTwin = !parts.some(x => x.indexOf('ageGroup:') === 0);
      if (isBack && !isTwin && !selfIsTwin && !ln.both) reciprocal++;
      if (selfIsTwin) { }
      else if (ln.both && !isTwin && !isBack && minorOrGone(o)) { notes.push('no twin on a minor\'s record (by rule): ' + t.slice(0, 60)); }
      else if (ln.both && !isTwin && !isBack) problems.push('a shared:both line has no twin on ' + o + ': ' + t.slice(0, 70));
      if (selfIsTwin) { /* this row is itself the written twin — its original is checked from the other side */ }
      else if (!ln.both && isTwin) problems.push('a one-sided line was written on ' + o + ' too: ' + t.slice(0, 70));
      if (!selfIsTwin && ln.both && isTwin) twins++;
    }
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
      else if (bk[k] !== 'active') problems.push(self + ' / ' + o + ' ' + k + ' bond was ' + bk[k] + ' before the fire');
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
  for (const k of CFG_KEYS) if (cfg[k] === undefined || cfg[k] === '') problems.push('World_Config has no ' + k);
  for (const p in calledBy) if (calledBy[p] > bmMax) problems.push(p + ' carries ' + calledBy[p] + ' bond-called lines, over the ' + bmMax + ' a week');
  if (!called) problems.push('0 bond-called lines landed');
  // bonds: change over the fire, with a moment and without
  const bKey = b => [String(b.CitizenA || '').trim().toUpperCase(), String(b.CitizenB || '').trim().toUpperCase()].sort().join('|') + '|' + (KIND[String(b.BondType || '').trim().toLowerCase()] || '?');
  const was = {}; for (const b of before) was[String(b.BondId) + '|' + bKey(b)] = Number(b.Intensity);
  // Run 3: among rivalries with room, the moment group gained 0.9 and the rest 1.625 — the clip was not the
  // cause. A rivalry gains 1.5 only in a week BOTH people were written, and a one-sided rival line is written
  // on one record. So the step is compared like with like: bonds whose two people both have a line this
  // Cycle, and bonds where one or neither does, separately.
  const wrote = new Set(log.map(r => String(r.POPID).trim().toUpperCase()));
  const strata = {};
  const rivalRows = [];   // every rival bond with room, one by one — the run is resynced away, so the detail is kept here
  const moved = {}; let fell = 0;
  for (const b of bonds) {
    const w = was[String(b.BondId) + '|' + bKey(b)]; if (w === undefined || isNaN(w)) continue;
    // a bond near the cap of 10 cannot show a step: a rivalry gains 1.5 a week before any moment, and a strong
    // bond calls more moments, so the moment group is the one clipped (run 1: rivalries average 8.8; run 2: at
    // 9 and under the moment group still read lower, 1.249 vs 1.625). Measured where the full step fits.
    if (w > 7.5) continue;
    const d = Number(b.Intensity) - w, ty = String(b.BondType || '').toLowerCase(), has = momentPairs[bKey(b)] ? 'moment' : 'none';
    const m = (moved[ty] = moved[ty] || { moment: [0, 0], none: [0, 0] }); m[has][0]++; m[has][1] += d;
    const bothW = wrote.has(String(b.CitizenA || '').trim().toUpperCase()) && wrote.has(String(b.CitizenB || '').trim().toUpperCase()) ? 'bothWritten' : 'notBoth';
    if (ty === 'rivalry' || ty === 'tension' || ty === 'sports_rival') rivalRows.push({ id: b.BondId, a: b.CitizenA, b: b.CitizenB, type: ty, before: w, after: Number(b.Intensity), moment: has === 'moment', both: bothW === 'bothWritten', status: b.Status });
    const sx = (strata[ty] = strata[ty] || { bothWritten: { moment: [0, 0], none: [0, 0] }, notBoth: { moment: [0, 0], none: [0, 0] } }); sx[bothW][has][0]++; sx[bothW][has][1] += d;
    if (has === 'moment' && d < 0 && w < 10) { fell++; notes.push('a bond with a moment fell: ' + b.BondId + ' ' + ty + ' ' + w + ' -> ' + b.Intensity); }
  }
  const bondChange = {}; for (const ty in moved) bondChange[ty] = { withMoment: moved[ty].moment[0], meanChange: moved[ty].moment[0] ? +(moved[ty].moment[1] / moved[ty].moment[0]).toFixed(3) : null, without: moved[ty].none[0], meanChangeWithout: moved[ty].none[0] ? +(moved[ty].none[1] / moved[ty].none[0]).toFixed(3) : null };
  if (!before.length) problems.push('no bonds-before.json — the bond change is not measured');
  if (!Object.keys(momentPairs).length) problems.push('0 bonds had a moment');
  // the step must show: where a type has 5+ bonds on each side, the bonds with a moment gained more than the rest
  const stepByStratum = {}; let measured = 0;
  for (const ty in strata) for (const st of ['bothWritten', 'notBoth']) {
    const g = strata[ty][st]; if (!g.moment[0] && !g.none[0]) continue;
    const mm = g.moment[0] ? +(g.moment[1] / g.moment[0]).toFixed(3) : null, mn = g.none[0] ? +(g.none[1] / g.none[0]).toFixed(3) : null;
    stepByStratum[ty + ' / ' + st] = { withMoment: g.moment[0], meanChange: mm, without: g.none[0], meanChangeWithout: mn };
    if (g.moment[0] >= 5 && g.none[0] >= 5) { measured++; if (!(mm > mn)) problems.push(ty + ' bonds (' + st + ') with a moment did not gain more than those without (' + mm + ' vs ' + mn + ')'); }
  }
  if (!measured) problems.push('no bond type has 5 bonds with a moment and 5 without in one group — the step is not measured');
  const want = ['friend', 'family', 'neighbor', 'coworker', 'housemate', 'rival', 'colleague', 'partner'];
  const notProven = want.filter(k => !byKind[k]).map(k => 'kind ' + k).concat(homes ? [] : ['their-home']).concat(shifts ? [] : ['shift with a coworker']).concat(twoSlot ? [] : ['person + place']);
  const out = { cycle: +C, lines: log.length, people: new Set(log.map(r => r.POPID)).size, bondEngineContactLines: engineLines,
    withLines: lineCount, bondCalledLines: called, mostBondCalledOnOnePerson: Math.max(0, ...Object.values(calledBy)), twinLines: twins, sameLineDrawnBothWaysByChance: reciprocal, leadTagsSizedM: sizedM,
    bondsWithAMoment: Object.keys(momentPairs).length, bondChange, stepLikeWithLike: stepByStratum, rivalBonds: rivalRows, momentBondsThatFell: fell, config: Object.fromEntries(CFG_KEYS.map(k => [k, cfg[k]])), byKind, byLine, theirHomeLines: homes, theirHomeWithNoHouseholdOnTheirRow: homesNoHousehold, shiftLines: shifts, personAndPlaceLines: twoSlot, someoneFamiliar: vague,
    notProven, examples: ex, notes: notes.slice(0, 12), problems, verdict: problems.length ? 'FAIL' : (lineCount ? (notProven.length ? 'PASS, not proven: ' + notProven.join(', ') : 'PASS') : 'FAIL') };
  console.log(JSON.stringify(out, null, 1));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
