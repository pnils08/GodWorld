// engine.312 bench receipt (plan §engine.312 R5; codex plan recheck). Reads the bench only; writes no sheet.
//   snap  <C> <label> — before firing Cycle C: save the bench's Cultural_Ledger, Citizen_Media_Usage and the Simulation_Ledger
//                       identity columns to output/engine-sheet/2026-10-25-e312-snap-<label>-c<C>.json.
//   check <C> <label> — after the fire: recompute every Cultural_Ledger row's expected FameScore from the snapshot + the post
//                       state, compare with the sheet, save the receipt (…-e312-receipt-<label>-c<C>.json) and the post state as
//                       the snapshot for C+1. Exit 1 on any HOLD.
// Expected, per existing row (matched by CUL-ID): base = pre FameScore; paper = Σ paperFameDelta_ of the pre-pending usage rows
// whose name resolves to one ledger citizen whose engine.313 target row this is; fade = −1 when pre FameScore > 0 and the pre
// LastSeenCycle is more than 10 Cycles back; sightings = post MediaCount − pre MediaCount; floor 25 when the row is the target of
// a citizen post-Famous and Active. Touched → clamp(0,100, max(floor, base + paper + fade + sightings)); untouched → base.
// A new row (CUL-ID absent before; dynasty / institution rows skipped): clamp(max(floor, paper record of its POPID over the whole
// pre tab + MediaCount)). The rule table (paperFameDelta_) and the target rule are imported from culturalLedger.js — unit-tested
// there; the sums, selection inputs, fade, floor and clamp are this script's own.
// Pre-stated as correct, not defects: a touched row over 100 drops to 100 (the ruled ceiling, before the re-base); the Source
// header appears on the usage tab at the first fire (Phase 5 self-arm).
require('/root/GodWorld/lib/env');
const fs = require('fs'), vm = require('vm'), path = require('path');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (LIVE === BENCH) throw new Error('env already points at the bench');
const O = '/root/GodWorld/output/engine-sheet/';
const [mode, Cs, label] = process.argv.slice(2);
const C = Number(Cs);
if (!['snap', 'check'].includes(mode) || !(C >= 113) || !label) throw new Error('usage: snap|check <cycle> <label>');
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
(async () => {
  if (mode === 'snap') { fs.writeFileSync(snapFile(C), JSON.stringify(await state())); console.log('snap C' + C + ' ' + label + ' saved'); return; }
  const pre = JSON.parse(fs.readFileSync(snapFile(C), 'utf8'));
  const post = await state();
  const out = { cycle: C, label, hold: [], counts: {} };
  const HOLD = (m) => out.hold.push(m);
  const uh = pre.use[0], iN = col(uh, 'CitizenName'), iT = col(uh, 'UsageType'), iP = col(uh, 'Processed'), iS = col(uh, 'Sentiment');
  const iSrcPre = uh.indexOf('Source');
  const lh = pre.led[0];
  const index = {};
  pre.led.slice(1).forEach(r => { const k = sb.normalizeCitizenName_(r[1]) + ' ' + sb.normalizeCitizenName_(r[2]); if (k !== ' ') (index[k] = index[k] || []).push(String(r[0] || '').trim().toUpperCase()); });
  const popOf = (name) => { const sp = sb.splitUsageName_(String(name || '').trim()); if (!sp) return null;
    const hits = index[sb.normalizeCitizenName_(sp.first) + ' ' + sb.normalizeCitizenName_(sp.last)] || []; return hits.length === 1 ? hits[0] : null; };
  const delta = (r) => (sb.isFamilyUsage_(r[iT]) ? 0 : CL.paperFameDelta_(r[iT], r[iS], iSrcPre >= 0 ? r[iSrcPre] : ''));
  // paper: the pre-pending rows (what Phase 5 accepts this Cycle)
  const paper = {}, record = {};
  let credited = 0, noRow = 0, unresolved = 0, pendingRows = [];
  pre.use.slice(1).forEach((r, k) => {
    const d = delta(r);
    const pop = d ? popOf(r[iN]) : null;
    if (d && pop) record[pop] = (record[pop] || 0) + d;
    if (String(r[iP] || '') === 'Y' || !String(r[iN] || '').trim()) return;
    pendingRows.push(k + 1);
    if (!d) return;
    if (!pop) { unresolved++; return; }
    const t = CL.culturalTargetIdxByPop_(pre.cul, pop);
    if (t < 0) { noRow++; return; }
    paper[t] = (paper[t] || 0) + d; credited++;
  });
  out.counts.paperCredited = credited; out.counts.paperNoRow = noRow; out.counts.paperUnresolved = unresolved; out.counts.pending = pendingRows.length;
  // floor: every citizen post-Famous and Active
  const famous = post.led.slice(1).filter(r => String(r[3] || '').trim() && String(r[4] || '').trim().toLowerCase() === 'active').map(r => String(r[0]).trim().toUpperCase());
  const floorIdx = new Set(famous.map(p => CL.culturalTargetIdxByPop_(pre.cul, p)).filter(i => i > 0));
  const ch = pre.cul[0], cId = col(ch, 'CUL-ID'), cF = col(ch, 'FameScore'), cL = col(ch, 'LastSeenCycle'), cM = col(ch, 'MediaCount'),
    cU = col(ch, 'UniverseLinks'), cCat = col(ch, 'FameCategory'), cRole = col(ch, 'RoleType'), cName = col(ch, 'Name');
  const postById = {}; post.cul.slice(1).forEach(r => { postById[String(r[cId])] = r; });
  const preIds = new Set(pre.cul.slice(1).map(r => String(r[cId])));
  out.rows = []; let touched = 0, written = 0, capped = 0; const up = [], down = [];
  for (let i = 1; i < pre.cul.length; i++) {
    const r = pre.cul[i], p = postById[String(r[cId])];
    if (!p) { HOLD('row ' + r[cId] + ' missing after the fire'); continue; }
    const base = Number(r[cF]) || 0;
    const last = Number(String(r[cL] || '').replace(/[^0-9]/g, '')) || 0;
    const fade = (base > 0 && last && (C - last) > 10) ? -1 : 0;
    const sight = (Number(p[cM]) || 0) - (Number(r[cM]) || 0);
    if (sight < 0) HOLD(r[cId] + ' MediaCount fell ' + r[cM] + ' → ' + p[cM]);
    const pp = paper[i] || 0, fl = floorIdx.has(i), isTouched = (i in paper) || fade || sight > 0 || fl;
    let exp = base;
    if (isTouched) { let s = base + pp + fade + sight; if (fl) s = Math.max(25, s); exp = clamp(s); touched++; if (base > 100) capped++; }
    const act = Number(p[cF]) || 0;
    if (act !== base) written++;
    if (act !== exp) HOLD(r[cId] + ' "' + r[cName] + '": expected ' + exp + ' (base ' + base + ', paper ' + pp + ', fade ' + fade + ', sightings ' + sight + (fl ? ', floor' : '') + '), sheet ' + act);
    if (base < 25 && act >= 25) up.push(r[cName] + ' ' + base + '→' + act);
    if (base >= 25 && act < 25) down.push(r[cName] + ' ' + base + '→' + act);
    if (isTouched) out.rows.push({ id: r[cId], name: r[cName], base, paper: pp, fade, sightings: sight, floor: fl, expected: exp, sheet: act });
  }
  out.created = [];
  post.cul.slice(1).forEach(p => {
    if (preIds.has(String(p[cId]))) return;
    if (String(p[cCat] || '').toLowerCase() === 'dynasty' || String(p[cRole] || '').toLowerCase() === 'institution') { out.created.push({ id: p[cId], name: p[cName], skipped: 'dynasty/institution' }); return; }
    const pop = String(p[cU] || '').trim().toUpperCase();
    const mc = Number(p[cM]) || 0;
    let s = (pop ? (record[pop] || 0) : 0) + mc;
    if (pop && famous.includes(pop)) s = Math.max(25, s);
    const exp = clamp(s), act = Number(p[cF]) || 0;
    out.created.push({ id: p[cId], name: p[cName], pop, record: pop ? (record[pop] || 0) : 0, mediaCount: mc, lastSeen: p[cL], expected: exp, sheet: act });
    if (act !== exp) HOLD('new ' + p[cId] + ' "' + p[cName] + '": expected ' + exp + ' (record ' + (record[pop] || 0) + ', MediaCount ' + mc + (famous.includes(pop) ? ', floor' : '') + '), sheet ' + act);
    if (mc === 0 && String(p[cL] || '') !== '') HOLD('new ' + p[cId] + ' has MediaCount 0 (roster) but LastSeenCycle ' + p[cL]);
  });
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
  Object.assign(out.counts, { touched, written, capped, created: out.created.length, crossedUp: up, crossedDown: down });
  out.verdict = out.hold.length ? 'HOLD' : 'PASS';
  fs.writeFileSync(O + '2026-10-25-e312-receipt-' + label + '-c' + C + '.json', JSON.stringify(out, null, 1));
  fs.writeFileSync(snapFile(C + 1), JSON.stringify(post));
  console.log('C' + C + ' ' + label + ' ' + out.verdict + ' ' + JSON.stringify(out.counts) + (out.hold.length ? '\n  ' + out.hold.slice(0, 15).join('\n  ') : ''));
  process.exit(out.hold.length ? 1 : 0);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
