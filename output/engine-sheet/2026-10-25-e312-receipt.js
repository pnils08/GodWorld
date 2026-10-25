// engine.312 bench receipt v2 (plan §engine.312 R5; codex gate 2 §2). Reads the bench only; writes no sheet.
//   snap  <C> <label> — before firing Cycle C: save the bench's Cultural_Ledger, Citizen_Media_Usage and the Simulation_Ledger
//                       identity columns to output/engine-sheet/2026-10-25-e312-snap-<label>-c<C>.json.
//   check <C> <label> — after the fire: recompute every Cultural_Ledger row's expected FameScore and MediaCount from the snapshot,
//                       the post state and the Cycle's Riley_Digest sightings; save …-e312-receipt-<label>-c<C>.json and the post
//                       state as the snapshot for C+1. Exit 1 on any HOLD.
//   replay <C> <label> — the same check with the post state from the saved snapshot for C+1 (a finished run re-read offline;
//                       Riley_Digest / Engine_Errors still read from the bench); writes …-receipt-<label>replay-c<C>.json only.
// Typed reads (codex gate 3): a touched row's FameScore, a sighted row's MediaCount and every new row's numbers must be present,
// finite numbers; an untouched row's FameScore, an unsighted row's MediaCount and LastSeenCycle must read back unchanged.
// Independence (codex gate 2): the paper rule, the name parsing and the engine.313 target rule are this script's own copies
// (below); the candidate's paperFameDelta_ / culturalTargetIdxByPop_ are run on the same inputs and any disagreement is a HOLD.
// Sightings come from Riley_Digest.FamousPeople (written by writeDigest_, not the registrar), resolved the registrar's way —
// exact Name first, then the citizen's personal row by POPID, else a new row — and MediaCount must move by exactly that count.
// Expected, per existing row (by CUL-ID): base = pre FameScore; paper = Σ rule over the pre-pending usage rows whose name resolves
// to one ledger citizen whose personal row this is; fade = −1 when pre FameScore > 0 and the pre LastSeenCycle is more than 10
// Cycles back; sightings = the digest count; floor 25 when it is the personal row of a citizen post-Famous and Active. Touched →
// clamp(0,100, max(floor, base + paper + fade + sightings)); untouched → base. A new personal row: clamp(max(floor, the citizen's
// paper record over the whole pre tab + its digest sightings)); a new institution row must be the dynasty append (FirstRefSource
// engine.65). Every post-Famous Active citizen must hold a personal row after the fire. Headers equal; CUL-IDs unique; post rows =
// pre rows + new rows. Pre-stated as correct: a touched row over 100 drops to 100; the Source header appears at the first fire.
require('/root/GodWorld/lib/env');
const fs = require('fs'), vm = require('vm');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (LIVE === BENCH) throw new Error('env already points at the bench');
const O = process.env.E312_OUT || '/root/GodWorld/output/engine-sheet/';   // E312_OUT: a scratch dir for tamper / replay checks
const [mode, Cs, label] = process.argv.slice(2);
const C = Number(Cs);
if (!['snap', 'check', 'replay'].includes(mode) || !(C >= 113) || !label) throw new Error('usage: snap|check|replay <cycle> <label>');
// ── this script's own rule copies ──
const TYPES = ['mentioned', 'quoted', 'featured', 'referenced', 'new_citizen', 'existing_new_role'];
const LIGHT = { positive: 5, neutral: 1, negative: -2 };
const ruleOwn = (type, light, source, family) => {
  if (family) return 0;
  const src = String(source || '').trim().toLowerCase(); if (src && src !== 'print') return 0;
  if (!TYPES.includes(String(type || '').trim().toLowerCase())) return 0;
  const l = String(light || '').trim().toLowerCase(); return LIGHT[l] !== undefined ? LIGHT[l] : 1;
};
const HON = /^(?:dr|rev|revd|fr|prof|professor|mr|mrs|ms|mx|bishop|rabbi|imam|pastor|deacon|sister|father|mother|elder|hon|sen|rep|gov|mayor|councilmember|councilman|councilwoman|capt|lt|sgt|ofc|det|chief)\.?$/i;
const norm = (n) => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
const keyOf = (raw) => { let p = String(raw || '').trim().split(/\s+/); if (p.length >= 3 && HON.test(p[0])) p = p.slice(1);
  if (p.length < 2 || HON.test(p[0])) return null; return norm(p[0]) + ' ' + norm(p.slice(1).join(' ')); };
const personalIdxOwn = (cul, pop) => {   // engine.313: highest-fame linked row, not dynasty / institution, ties to the earlier
  const h = cul[0], iU = h.indexOf('UniverseLinks'), iCat = h.indexOf('FameCategory'), iR = h.indexOf('RoleType'), iF = h.indexOf('FameScore');
  let best = -1, bf = -Infinity;
  for (let r = 1; r < cul.length; r++) {
    if (String(cul[r][iU] || '').trim().toUpperCase() !== pop) continue;
    if (String(cul[r][iCat] || '').trim().toLowerCase() === 'dynasty' || String(cul[r][iR] || '').trim().toLowerCase() === 'institution') continue;
    const f = Number(cul[r][iF]) || 0; if (f > bf) { bf = f; best = r; }
  }
  return best;
};
// ── the candidate, for the cross-check only ──
const CL = require('/root/GodWorld/phase07-evening-media/culturalLedger.js');
const sb = vm.createContext({ Logger: { log() {} }, Math, String, Number, Array, Object, JSON, Date });
vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/processAdvancementIntake.js', 'utf8'), sb);
const snapFile = (c) => O + '2026-10-25-e312-snap-' + label + '-c' + c + '.json';
async function raw(name) {
  process.env.GODWORLD_SHEET_ID = BENCH; delete require.cache[require.resolve('/root/GodWorld/lib/sheets')];
  return require('/root/GodWorld/lib/sheets').getRawSheetData(name);
}
async function state() {
  const led = await raw('Simulation_Ledger'), h = led[0];
  const keep = ['POPID', 'First', 'Last', 'Famous', 'Status'].map(n => h.indexOf(n));
  if (keep.some(i => i < 0)) throw new Error('ledger columns missing');
  return { cul: await raw('Cultural_Ledger'), use: await raw('Citizen_Media_Usage'),
    led: [['POPID', 'First', 'Last', 'Famous', 'Status']].concat(led.slice(1).map(r => keep.map(i => r[i]))) };
}
const col = (h, n) => { const i = h.indexOf(n); if (i < 0) throw new Error('no column ' + n); return i; };
const clamp = (n) => Math.max(0, Math.min(100, n));
const typed = (v) => { if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const same = (a, b) => String(a === undefined || a === null ? '' : a) === String(b === undefined || b === null ? '' : b);
(async () => {
  if (mode === 'snap') { fs.writeFileSync(snapFile(C), JSON.stringify(await state())); console.log('snap C' + C + ' ' + label + ' saved'); return; }
  const pre = JSON.parse(fs.readFileSync(snapFile(C), 'utf8'));
  const post = mode === 'replay' ? JSON.parse(fs.readFileSync(snapFile(C + 1), 'utf8')) : await state();
  const out = { cycle: C, label, hold: [], counts: {} };
  const HOLD = (m) => out.hold.push(m);
  // identity of the two Cultural_Ledger reads
  const ch = pre.cul[0];
  if (post.cul[0].join('|') !== ch.join('|')) HOLD('Cultural_Ledger header changed across the fire');
  const cId = col(ch, 'CUL-ID'), cF = col(ch, 'FameScore'), cL = col(ch, 'LastSeenCycle'), cM = col(ch, 'MediaCount'),
    cU = col(ch, 'UniverseLinks'), cCat = col(ch, 'FameCategory'), cRole = col(ch, 'RoleType'), cName = col(ch, 'Name'), cSrc = col(ch, 'FirstRefSource');
  const dupes = (rows) => { const seen = {}, d = []; rows.slice(1).forEach(r => { const k = String(r[cId]); if (seen[k]) d.push(k); seen[k] = 1; }); return d; };
  if (dupes(pre.cul).length) HOLD('duplicate CUL-IDs before: ' + dupes(pre.cul).join(', '));
  if (dupes(post.cul).length) HOLD('duplicate CUL-IDs after: ' + dupes(post.cul).join(', '));
  const postById = {}; post.cul.slice(1).forEach(r => { postById[String(r[cId])] = r; });
  const preIds = new Set(pre.cul.slice(1).map(r => String(r[cId])));
  const newRows = post.cul.slice(1).filter(r => !preIds.has(String(r[cId])));
  if (post.cul.length !== pre.cul.length + newRows.length) HOLD('row count: ' + (post.cul.length - 1) + ' after ≠ ' + (pre.cul.length - 1) + ' before + ' + newRows.length + ' new');
  // the ledger, by name
  const byKey = {}, nameToPop = {};
  pre.led.slice(1).forEach(r => {
    const k = norm(r[1]) + ' ' + norm(r[2]); if (k !== ' ') (byKey[k] = byKey[k] || []).push(String(r[0] || '').trim().toUpperCase());
    const full = (String(r[1] || '') + ' ' + String(r[2] || '')).trim(); if (full) nameToPop[full] = nameToPop.hasOwnProperty(full) ? '' : String(r[0] || '').trim().toUpperCase();
  });
  const popOf = (name) => { const k = keyOf(name); if (!k) return null; const h = byKey[k] || []; return h.length === 1 ? h[0] : null; };
  // the paper: own rule, cross-checked
  const uh = pre.use[0], iN = col(uh, 'CitizenName'), iT = col(uh, 'UsageType'), iP = col(uh, 'Processed'), iS = col(uh, 'Sentiment'), iSrc0 = uh.indexOf('Source');
  const paper = {}, record = {}, pendingRows = [];
  let credited = 0, noRow = 0, unresolved = 0, ruleDiff = 0;
  pre.use.slice(1).forEach((r, k) => {
    const fam = sb.isFamilyUsage_(r[iT]);
    const src = iSrc0 >= 0 ? r[iSrc0] : '';
    const d = ruleOwn(r[iT], r[iS], src, fam);
    if (d !== (fam ? 0 : CL.paperFameDelta_(r[iT], r[iS], src))) ruleDiff++;
    const pop = d ? popOf(r[iN]) : null;
    if (d && pop) record[pop] = (record[pop] || 0) + d;
    if (String(r[iP] || '') === 'Y' || !String(r[iN] || '').trim()) return;
    pendingRows.push(k + 1);
    if (!d) return;
    if (!pop) { unresolved++; return; }
    const t = personalIdxOwn(pre.cul, pop);
    if (t !== CL.culturalTargetIdxByPop_(pre.cul, pop)) HOLD('target rule disagrees for ' + pop);
    if (t < 0) { noRow++; return; }
    paper[t] = (paper[t] || 0) + d; credited++;
  });
  if (ruleDiff) HOLD('the paper rule disagrees with the candidate on ' + ruleDiff + ' usage row(s)');
  // sightings: Riley_Digest.FamousPeople for Cycle C, resolved the registrar's way
  const rd = await raw('Riley_Digest'), rh = rd[0];
  const dig = rd.slice(1).filter(r => Number(r[col(rh, 'Cycle')]) === C);
  if (dig.length !== 1) HOLD('Riley_Digest rows for C' + C + ': ' + dig.length);
  const sighted = dig.length ? String(dig[0][col(rh, 'FamousPeople')] || '').split(',').map(x => x.trim()).filter(Boolean) : [];
  const sightRow = {}, sightNew = {};
  for (const n of sighted) {
    let idx = -1;
    for (let r = 1; r < pre.cul.length; r++) if (pre.cul[r][cName] === n) { idx = r; break; }
    const pop = String(nameToPop[n] || '');
    if (idx < 0 && pop) idx = personalIdxOwn(pre.cul, pop);
    if (idx > 0) sightRow[idx] = (sightRow[idx] || 0) + 1;
    else { const key = pop ? 'pop:' + pop : 'name:' + n; sightNew[key] = (sightNew[key] || 0) + 1; }
  }
  out.sightings = sighted;
  // the floor: every citizen post-Famous and Active — and each must hold a personal row after the fire
  const famous = post.led.slice(1).filter(r => String(r[3] || '').trim() && String(r[4] || '').trim().toLowerCase() === 'active').map(r => String(r[0]).trim().toUpperCase());
  const floorIdx = new Set(famous.map(p => personalIdxOwn(pre.cul, p)).filter(i => i > 0));
  for (const p of famous) if (personalIdxOwn(post.cul, p) < 0) HOLD('Famous ' + p + ' holds no personal Cultural_Ledger row after C' + C);
  // existing rows
  out.rows = []; let touched = 0, written = 0, capped = 0; const up = [], down = [];
  for (let i = 1; i < pre.cul.length; i++) {
    const r = pre.cul[i], p = postById[String(r[cId])];
    if (!p) { HOLD('row ' + r[cId] + ' missing after the fire'); continue; }
    const base = Number(r[cF]) || 0;
    const last = Number(String(r[cL] || '').replace(/[^0-9]/g, '')) || 0;
    const fade = (base > 0 && last && (C - last) > 10) ? -1 : 0;
    const sight = sightRow[i] || 0;
    if (sight) {
      const mcPost = typed(p[cM]), mcPre = r[cM] === '' ? 0 : typed(r[cM]);
      if (mcPost === null || mcPre === null) HOLD(r[cId] + ' "' + r[cName] + '": sighted but MediaCount is not a number (' + JSON.stringify([r[cM], p[cM]]) + ')');
      else if (mcPost - mcPre !== sight) HOLD(r[cId] + ' "' + r[cName] + '": MediaCount moved ' + (mcPost - mcPre) + ', the digest sighted it ' + sight + ' time(s)');
      if (typed(p[cL]) !== C) HOLD(r[cId] + ' sighted but LastSeenCycle reads ' + JSON.stringify(p[cL]) + ' (the registrar writes the Cycle number)');
    } else {
      if (!same(p[cM], r[cM])) HOLD(r[cId] + ' "' + r[cName] + '": not sighted, but MediaCount ' + r[cM] + ' → ' + p[cM]);
      if (!same(p[cL], r[cL])) HOLD(r[cId] + ' "' + r[cName] + '": not sighted, but LastSeenCycle ' + r[cL] + ' → ' + p[cL] + ' (a false sighting would stop the fade)');
    }
    const pp = paper[i] || 0, fl = floorIdx.has(i), isTouched = (i in paper) || fade || sight > 0 || fl;
    let exp = base;
    if (isTouched) { let s = base + pp + fade + sight; if (fl) s = Math.max(25, s); exp = clamp(s); touched++; if (base > 100) capped++; }
    const act = isTouched ? typed(p[cF]) : (same(p[cF], r[cF]) ? base : typed(p[cF]));
    if (isTouched && act === null) { HOLD(r[cId] + ' "' + r[cName] + '": touched but FameScore reads ' + JSON.stringify(p[cF]) + ' (not a number)'); continue; }
    if (!isTouched && !same(p[cF], r[cF])) HOLD(r[cId] + ' "' + r[cName] + '": untouched but FameScore ' + JSON.stringify(r[cF]) + ' → ' + JSON.stringify(p[cF]));
    if (act !== base) written++;
    if (act !== exp) HOLD(r[cId] + ' "' + r[cName] + '": expected ' + exp + ' (base ' + base + ', paper ' + pp + ', fade ' + fade + ', sightings ' + sight + (fl ? ', floor' : '') + '), sheet ' + act);
    if (base < 25 && act >= 25) up.push(r[cName] + ' ' + base + '→' + act);
    if (base >= 25 && act < 25) down.push(r[cName] + ' ' + base + '→' + act);
    if (isTouched) out.rows.push({ id: r[cId], name: r[cName], base, paper: pp, fade, sightings: sight, floor: fl, expected: exp, sheet: act });
  }
  // new rows
  out.created = [];
  const claimed = {};
  for (const p of newRows) {
    const inst = String(p[cCat] || '').toLowerCase() === 'dynasty' || String(p[cRole] || '').toLowerCase() === 'institution';
    if (inst) {
      out.created.push({ id: p[cId], name: p[cName], institution: true, source: p[cSrc] });
      // the engine.65 dynasty append's whole row (generationalWealthEngine.js updateHeritage_): every fixed cell, not one label
      const at = (n) => { const k = ch.indexOf(n); return k < 0 ? undefined : p[k]; };
      const bad = [];
      const want = { Timestamp: 'C' + C, RoleType: 'Institution', FameCategory: 'dynasty', CulturalDomain: 'Community', Status: 'Active',
        FirstSeenCycle: C, LastSeenCycle: C, MediaCount: 0, TrendTrajectory: 'rising', FirstRefSource: 'engine.65', MediaSpread: 0,
        CityTier: '', Neighborhood: '', Holiday: '', HolidayPriority: '', SportsSeason: '' };
      for (const k of Object.keys(want)) {
        if (ch.indexOf(k) < 0) { if (want[k] !== '') bad.push('no ' + k + ' column'); continue; }
        const v = at(k);
        if (v === undefined && want[k] === '') continue;   // a ragged read drops trailing blank cells; a required cell may not be absent
        const ok = typeof want[k] === 'number' ? typed(v) === want[k] : same(v, want[k]);
        if (!ok) bad.push(k + '=' + JSON.stringify(v));
      }
      if (!/^CUL-[0-9a-f]{8}$/i.test(String(p[cId]))) bad.push('CUL-ID=' + p[cId]);
      if (!/^The .+ Family$/.test(String(p[cName]))) bad.push('Name=' + p[cName]);
      if (!(p[cU] === '' || /^POP-\d+$/.test(String(p[cU])))) bad.push('UniverseLinks=' + p[cU]);
      const fs65 = typed(p[cF]); if (fs65 === null || !Number.isInteger(fs65)) bad.push('FameScore=' + JSON.stringify(p[cF]));
      if (bad.length) HOLD('new institution row ' + p[cId] + ' is not the engine.65 dynasty append: ' + bad.join(', '));
      continue;
    }
    const pop = String(p[cU] || '').trim().toUpperCase();
    const key = pop ? 'pop:' + pop : 'name:' + p[cName];
    const sight = sightNew[key] || 0; claimed[key] = (claimed[key] || 0) + 1;
    const mc = typed(p[cM]);
    if (mc === null || typed(p[cF]) === null) HOLD('new ' + p[cId] + ' "' + p[cName] + '": MediaCount / FameScore not numbers ' + JSON.stringify([p[cM], p[cF]]));
    // the registrar's CREATE row (culturalLedger.js): its fixed cells, and the sighting cells by this Cycle's digest
    // required, nonblank CREATE cells must be present (a missing column or a cut-off row is a HOLD, not a skip)
    const badN = [];
    const needN = { FirstSeenCycle: C, MediaSpread: 1, Status: 'Active', TrendTrajectory: 'rising', CityTier: 'Local' };
    for (const k of Object.keys(needN)) {
      const ki = ch.indexOf(k);
      if (ki < 0) { badN.push('no ' + k + ' column'); continue; }
      const v = p[ki];
      if (typeof needN[k] === 'number' ? typed(v) !== needN[k] : !same(v, needN[k])) badN.push(k + '=' + JSON.stringify(v));
    }
    if (sight > 0 && typed(p[cL]) !== C) badN.push('LastSeenCycle=' + JSON.stringify(p[cL]));
    if (badN.length) HOLD('new ' + p[cId] + ' "' + p[cName] + '" is not the registrar\'s CREATE row: ' + badN.join(', '));
    if (mc !== sight) HOLD('new ' + p[cId] + ' "' + p[cName] + '": MediaCount ' + mc + ', the digest sighted it ' + sight + ' time(s)');
    if (sight === 0 && String(p[cL] || '') !== '') HOLD('new ' + p[cId] + ' never sighted but LastSeenCycle ' + p[cL]);
    let s = (pop ? (record[pop] || 0) : 0) + sight;
    if (pop && famous.includes(pop)) s = Math.max(25, s);
    const exp = clamp(s), act = typed(p[cF]);
    out.created.push({ id: p[cId], name: p[cName], pop, record: pop ? (record[pop] || 0) : 0, sightings: sight, mediaCount: mc, lastSeen: p[cL], expected: exp, sheet: act });
    if (act !== exp) HOLD('new ' + p[cId] + ' "' + p[cName] + '": expected ' + exp + ' (record ' + (record[pop] || 0) + ', sightings ' + sight + (famous.includes(pop) ? ', floor' : '') + '), sheet ' + act);
  }
  for (const k of Object.keys(claimed)) if (claimed[k] > 1) HOLD('two new rows for one citizen / name: ' + k);
  for (const k of Object.keys(sightNew)) if (!claimed[k]) HOLD('the digest sighted ' + k + ' with no row to land on and no new row');
  // the usage tab: Source armed; every pre-pending row processed; the media-room probe
  const ph = post.use[0], iSrc = ph.indexOf('Source'), iP2 = ph.indexOf('Processed');
  if (iSrc < 0) HOLD('usage tab has no Source header after C' + C);
  out.sourceColumn = iSrc;
  const unmarked = pendingRows.filter(k => String((post.use[k] || [])[iP2] || '') !== 'Y');
  if (unmarked.length) HOLD(unmarked.length + ' pre-pending usage rows not Processed after C' + C);
  const probe = fs.existsSync(O + '2026-10-25-e312-probe.json') ? JSON.parse(fs.readFileSync(O + '2026-10-25-e312-probe.json', 'utf8')).probe : null;
  if (probe) {
    const rows = post.use.slice(1).filter(r => r[ph.indexOf('Context')] === probe.context);
    out.probe = { name: probe.name, rows: rows.length, source: rows.map(r => r[iSrc]), processed: rows.map(r => r[iP2]) };
    if (C === 113 && !(rows.length === 1 && rows[0][iSrc] === 'media-room')) HOLD('media-room probe: C113 should land one usage row with Source media-room, got ' + JSON.stringify(out.probe));
  }
  const ee = await raw('Engine_Errors'), eh = ee[0];
  out.engineErrors = ee.slice(1).filter(r => Number(r[col(eh, 'Cycle')]) === C).map(r => String(r[col(eh, 'Phase')]) + ': ' + String(r[col(eh, 'Error')]).slice(0, 140));
  for (const e of out.engineErrors) HOLD('Engine_Errors C' + C + ': ' + e);
  Object.assign(out.counts, { pending: pendingRows.length, paperCredited: credited, paperNoRow: noRow, paperUnresolved: unresolved,
    sightings: sighted.length, touched, written, capped, created: out.created.length, famous: famous.length, crossedUp: up, crossedDown: down });
  out.verdict = out.hold.length ? 'HOLD' : 'PASS';
  fs.writeFileSync(O + '2026-10-25-e312-receipt-' + label + (mode === 'replay' ? 'replay' : '') + '-c' + C + '.json', JSON.stringify(out, null, 1));
  if (mode === 'check') fs.writeFileSync(snapFile(C + 1), JSON.stringify(post));
  console.log('C' + C + ' ' + label + ' ' + out.verdict + ' ' + JSON.stringify(out.counts) + (out.hold.length ? '\n  ' + out.hold.slice(0, 15).join('\n  ') : ''));
  process.exit(out.hold.length ? 1 : 0);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
