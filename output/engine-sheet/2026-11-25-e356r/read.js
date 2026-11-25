// engine.356 cut A4 bench read for Cycle <C> on the sandbox — the part of the day on a line.
//   node read.js <C> <base|full>
// base (stage 85 code): saves the week (after-base.json) for compare.js; no checks but "no line was given one part".
// full (the A4 commit), each LifeHistory_Log row of the Cycle, in the order written:
//   1. World_Config momentWhenByKind is on the bench, text, and parses to at least one kind.
//   2. A line carries at most one when:, and it is morning / afternoon / evening.
//   3. A line that carries one is allowed it: a line row with its own when: tags (the tab) → one of those;
//      one of the code's own timed lines → its set; otherwise its kind's parts on the config
//      (a game at a field / court / school / youth program is youth-game). Anything else is a FAIL.
//   4. A line that should carry one does: a kind the config names, or a line row with its own when:.
//   5. Spread — replayed: at the moment a line was written, its part was one the person (plus the other
//      person, for a shared:both line) held fewest of, among the parts allowed.
//   6. A twin (the same moment on the other person's record) carries the same part.
// A check with 0 cases is NOT PROVEN, never a pass.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
const sheets = require('/root/GodWorld/lib/sheets');
const C = String(process.argv[2]), LABEL = String(process.argv[3] || 'full');
const PARTS = ['morning', 'afternoon', 'evening'];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lineRe = text => new RegExp('^' + esc(text).replace(/\\\$[A-Z_]+/g, '.+?') + '( \\[[^\\]]*\\])*$');
// the code's own lines that carry a time (generateCitizensEvents.js, the A4 commit)
const CODE_LINES = [
  [/^braced against strong gusts on the walk home/, ['afternoon', 'evening']],
  [/^left work thinking about /, ['afternoon', 'evening']],
  [/^split the last of the coffee and the morning's plans with their partner/, ['morning']],
  [/^set two cups out by habit and let the second one stay/, ['morning']],
  [/^quietly covered the table's coffee and waved off the thanks/, ['morning', 'afternoon']],
  [/^compared notes with .+ over coffee that went long/, ['morning', 'afternoon']]
];
(async () => {
  const ecl = await sheets.getSheetData('Event_Content_Ledger');
  const log = (await sheets.getSheetAsObjects('LifeHistory_Log')).filter(r => String(r.Cycle) === C);
  const led = await sheets.getSheetAsObjects('Simulation_Ledger');
  const bonds = await sheets.getSheetAsObjects('Relationship_Bonds');
  const cfg = Object.fromEntries((await sheets.getSheetData('World_Config')).map(r => [String(r[0] || '').trim(), r[1]]));
  fs.writeFileSync(__dirname + '/after-' + LABEL + '.json', JSON.stringify({ bonds: bonds.map(b => [b.BondId, b.CitizenA, b.CitizenB, b.BondType, b.Intensity, b.Status]), log: log.map(r => [r.POPID, r.EventTag, r.EventText]) }));
  const problems = [], notProven = [];
  const tagsOf = r => String(r.EventTag || '').split('|');
  const whens = r => tagsOf(r).filter(t => t.indexOf('when:') === 0).map(t => t.slice(5));
  if (LABEL !== 'full') {
    // stage 85 passes a row's when: tags through as written (one, two or three of them) — never picks one
    console.log(JSON.stringify({ label: LABEL, cycle: C, lines: log.length, linesWithAWhenTag: log.filter(r => whens(r).length).length, saved: 'after-' + LABEL + '.json' }, null, 1));
    process.exit(0);
  }
  // 1. the table
  const byKind = {}; const raw = cfg.momentWhenByKind;
  if (typeof raw !== 'string' || !raw.trim()) problems.push('World_Config momentWhenByKind missing or not text: ' + JSON.stringify(raw));
  else for (const seg of raw.split(';')) { const kv = seg.split('='); if (kv.length !== 2) continue; const ps = kv[1].split(',').map(s => s.trim().toLowerCase()).filter(p => PARTS.includes(p)); if (kv[0].trim() && ps.length) byKind[kv[0].trim().toLowerCase()] = ps; }
  if (!Object.keys(byKind).length) problems.push('momentWhenByKind names no kind');
  // the line rows with their own when:
  const ownRows = ecl.slice(1).filter(r => r[0] === 'line' && /(^|,)when:/.test(String(r[6] || ''))).map(r => ({ text: r[3], re: lineRe(String(r[3])), parts: String(r[6]).split(',').filter(t => t.indexOf('when:') === 0).map(t => t.slice(5)) }));
  const expect = JSON.parse(fs.readFileSync(__dirname + '/when-rows.json', 'utf8')).length;
  if (ownRows.length !== expect) problems.push('line rows with their own when: on the bench tab ' + ownRows.length + ', expected ' + expect);
  const nameOf = {}; for (const r of led) nameOf[String(r.POPID).trim().toUpperCase()] = ((r.First || '') + ' ' + (r.Last || '')).trim();
  const kindOf = tags => {
    const act = (tags.find(t => t.indexOf('act:') === 0) || '').slice(4);
    if (act === 'game' && tags.some(t => t === 'at:field' || t === 'at:court' || t === 'at:school' || t === 'at:youth-program' || t.indexOf('prog:youth') === 0)) return 'youth-game';
    return act;
  };
  const allowedFor = r => {
    const text = String(r.EventText || ''), tags = tagsOf(r);
    const own = ownRows.find(o => o.re.test(text)); if (own) return { parts: own.parts, by: 'row' };
    const code = CODE_LINES.find(c => c[0].test(text)); if (code) return { parts: code[1], by: 'code' };
    const k = kindOf(tags); if (k && byKind[k]) return { parts: byKind[k], by: 'kind:' + k };
    return null;
  };
  // index for twins: POPID|text -> row
  const at = {}; for (const r of log) at[String(r.POPID).trim().toUpperCase() + '|' + (r.EventText || '')] = r;
  const count = {}, held = (p, part) => ((count[p] || {})[part] || 0), add = (p, part) => { (count[p] = count[p] || {})[part] = held(p, part) + 1; };
  const isTwin = new Set();
  const tally = { timed: 0, byPart: { morning: 0, afternoon: 0, evening: 0 }, by: {}, untimed: 0, twinsChecked: 0, spreadChecked: 0, choiceOfTwoOrMore: 0 };
  for (const r of log) {
    const p = String(r.POPID).trim().toUpperCase(), tags = tagsOf(r), w = whens(r), text = String(r.EventText || '');
    const al = allowedFor(r);
    if (w.length > 1) { problems.push('more than one when: ' + p + ' | ' + text.slice(0, 80)); continue; }
    if (w.length && !PARTS.includes(w[0])) { problems.push('not a part of the day: when:' + w[0] + ' ' + p); continue; }
    if (!w.length) { tally.untimed++; if (al) problems.push('should carry a time (' + al.by + ') and does not: ' + p + ' | ' + text.slice(0, 80)); continue; }
    tally.timed++; tally.byPart[w[0]]++;
    if (!al) { problems.push('carries when:' + w[0] + ' with no kind and no row of its own: ' + p + ' | ' + text.slice(0, 80)); continue; }
    tally.by[al.by] = (tally.by[al.by] || 0) + 1;
    if (!al.parts.includes(w[0])) { problems.push('when:' + w[0] + ' is not allowed (' + al.by + ' → ' + al.parts.join('/') + '): ' + p + ' | ' + text.slice(0, 80)); }
    if (isTwin.has(r)) { add(p, w[0]); continue; }   // a twin takes the drawer's part; it only counts
    // the drawer: the other person counts toward the pick only for a shared:both line
    const q = (tags.find(t => t.indexOf('contactPopId:') === 0) || '').slice(13).toUpperCase();
    const both = q && tags.includes('shared:both');
    const sum = part => held(p, part) + (both ? held(q, part) : 0);
    const least = Math.min(...al.parts.map(sum));
    tally.spreadChecked++; if (al.parts.length > 1) tally.choiceOfTwoOrMore++;
    if (al.parts.includes(w[0]) && sum(w[0]) !== least) problems.push('not the least-held part: when:' + w[0] + ' held ' + sum(w[0]) + ', least ' + least + ' of ' + al.parts.join('/') + ': ' + p + ' | ' + text.slice(0, 80));
    add(p, w[0]);
    if (both && nameOf[p] && nameOf[q]) {
      const tw = at[q + '|' + text.split(nameOf[q]).join(nameOf[p])];
      if (tw && tw !== r && tagsOf(tw).includes('contactPopId:' + p)) {
        isTwin.add(tw); tally.twinsChecked++;
        const tww = whens(tw);
        if (tww.length !== 1 || tww[0] !== w[0]) problems.push('twin part differs: ' + p + ' when:' + w[0] + ' vs ' + q + ' when:' + (tww.join(',') || 'none') + ' | ' + text.slice(0, 80));
      }
    }
  }
  // how a person's day reads
  const people = Object.keys(count), spreadOf = {};
  for (const p of people) { const c = count[p], n = PARTS.reduce((s, x) => s + (c[x] || 0), 0), used = PARTS.filter(x => c[x]).length; const k = n + ' moments in ' + used + ' part(s)'; spreadOf[k] = (spreadOf[k] || 0) + 1; }
  if (!tally.timed) notProven.push('no line carries a time');
  if (!tally.twinsChecked) notProven.push('no twin pair seen');
  if (!tally.choiceOfTwoOrMore) notProven.push('no line had a choice of parts');
  for (const k of ['row', 'code']) if (!tally.by[k]) notProven.push('no line timed by its ' + k);
  console.log(JSON.stringify({ label: LABEL, cycle: C, lines: log.length, table: byKind, ownRowsOnTab: ownRows.length, tally, peopleWithATimedMoment: people.length, spread: spreadOf,
    problems: problems.length, first: problems.slice(0, 15), notProven, verdict: problems.length ? 'FAIL' : (notProven.length ? 'PASS, NOT PROVEN: ' + notProven.join('; ') : 'PASS') }, null, 1));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
