// engine.306 gate-3 FIX step 4 (codex plan review 2026-10-21 item 4): the stage-18 C113 watch on LIVE, read-only, keyed by ID.
//   snap <cycle>  — before the fire: Business_Ledger (every column, by BIZ_ID), Business_Archive, World_Config bizIdHighWater,
//                   Simulation_Ledger (POPID / Status / Neighborhood / EmployerBizId), Neighborhood_Map texture values, the Cycle's
//                   PREV_CYCLE_STATE_JSON businessDynamics ring entries, per hood spot eligibility + holders (spots.js:46-65 logic,
//                   generator's own spotRank_), Riley_Digest WorldEvents + StorySeeds count, Story_Hook_Deck HookText.
//                   → 2026-10-21-e306-livewatch-c<cycle>.json
//   diff <cycle>  — after the fire: the same read for <cycle>, compared to the c<cycle−1> snap by ID: BIZ_ID set added / removed,
//                   high water, Business_Archive new IDs, per-ID typed changes on the 103 rows (revenue / growth / every other
//                   column), employed citizens whose EmployerBizId changed (to a 103 row flagged), spot eligibility + holder shift
//                   per hood, EventAttractiveness per hood and its live components (event-domain / event-text hits exact from
//                   Riley; hook hits from HookText = h.text only, a lower bound when a hook carries h.hook; seed hits bounded
//                   0..StorySeeds count — seeds are on no sheet; pulse and the PropertiesService chaos fold are not observable) →
//                   2026-10-21-e306-livewatch-c<cycle>.json + -diff-c<cycle>.json. An all-hood EA decline beyond what the observable
//                   components explain prints HOLD (codex gate 3 item 4). Writes nothing to any sheet.
// usage: node 2026-10-21-e306-livewatch.js snap 112 | diff 113
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (!LIVE || LIVE === BENCH || LIVE === BASE) throw new Error('env does not point at live');
const fs = require('fs');
global.Logger = { log() {} };
const BD = require('/root/GodWorld/phase05-citizens/applyBusinessDynamics.js');
const genSrc = fs.readFileSync('/root/GodWorld/phase05-citizens/generateCitizensEvents.js', 'utf8');
const spotRank_ = new Function(genSrc.match(/function spotRank_[\s\S]*?\n}\n/)[0] + '\nreturn spotRank_;')();
const { getSheetData } = require('/root/GodWorld/lib/sheets');
const O = '/root/GodWorld/output/engine-sheet/2026-10-21-e306-livewatch-';
const [mode, cycArg] = process.argv.slice(2), cyc = Number(cycArg);
if (!/^(snap|diff)$/.test(mode || '') || !cyc) throw new Error('usage: snap <cycle> | diff <cycle>');
const num = (v) => Number(String(v).replace(/^C/, ''));
const NEW = id => /^BIZ-00(18[7-9]|19\d|2[0-8]\d)$/.test(id);   // the 103 engine.306 rows

async function read(c) {
  const s = { cycle: c, at: new Date().toISOString() };
  const bl = await getSheetData('Business_Ledger'), bh = bl[0];
  s.bizHeader = bh; s.biz = {};
  bl.slice(1).forEach(r => { const id = String(r[bh.indexOf('BIZ_ID')] || '').trim(); if (id) s.biz[id] = r; });
  let ar = []; try { ar = await getSheetData('Business_Archive'); } catch (e) { ar = []; }
  s.archiveHeader = ar[0] || []; s.archiveIds = ar.slice(1).map(r => String(r[0] || '').trim()).filter(Boolean);
  const wc = await getSheetData('World_Config');
  s.highWater = Number((wc.find(r => String(r[0]).trim() === 'bizIdHighWater') || [])[1]);
  const sl = await getSheetData('Simulation_Ledger'), sh = sl[0], ci = k => sh.indexOf(k);
  s.citizens = {};
  sl.slice(1).forEach(r => { const p = r[ci('POPID')]; if (p) s.citizens[p] = [r[ci('Status')], r[ci('Neighborhood')], String(r[ci('EmployerBizId')] || '').trim()]; });
  const nm = await getSheetData('Neighborhood_Map'), nh = nm[0];
  s.hoods = {};
  const canon = {}, child = {};
  nm.slice(1).forEach(r => {
    const hood = String(r[nh.indexOf('Neighborhood')]).trim(); canon[hood.toLowerCase()] = hood;
    String(r[nh.indexOf('ChildAreas')] || '').split(',').map(x => x.trim()).filter(Boolean).forEach(x => { if (!child[x.toLowerCase()]) child[x.toLowerCase()] = hood; });
    s.hoods[hood] = { cycle: r[nh.indexOf('Cycle')], event: Number(r[nh.indexOf('EventAttractiveness')]), retail: Number(r[nh.indexOf('RetailVitality')]), sentiment: Number(r[nh.indexOf('Sentiment')]) };
  });
  const fold = (h) => { const k = String(h || '').trim().toLowerCase(); return canon[k] || child[k] || null; };
  const cf = await getSheetData('Carry_Forward_Store');
  const blob = cc => { const r = cf.slice(1).find(x => x[0] === 'PREV_CYCLE_STATE_JSON' && num(x[1]) === cc); return r ? (JSON.parse(r[3]).businessDynamics || {}) : null; };
  const now = blob(c), prev = blob(c - 1);
  if (!now || !prev) throw new Error('PREV_CYCLE_STATE_JSON missing: C' + c + ' ' + !!now + ', C' + (c - 1) + ' ' + !!prev);
  s.dyn = {}; Object.keys(now).forEach(id => { if (/^BIZ-/.test(id)) s.dyn[id] = now[id]; });
  // spots: spots.js:46-65 eligibility (open food / retail, parent hood, not wound down / closed this Cycle or last) + holders
  const spots = {};
  Object.keys(s.biz).forEach(id => {
    const r = s.biz[id], name = String(r[bh.indexOf('Name')] || '').trim(), cls = BD.bizSectorClass_(r[bh.indexOf('Sector')]), hood = fold(r[bh.indexOf('Neighborhood')]);
    const st = now[id] || [0, 0, 0], ps = prev[id] || [0, 0, 0];
    if (!name || !hood || (cls !== 'food' && cls !== 'retail') || ps[2] || st[2]) return;
    (spots[hood] = spots[hood] || []).push({ id, holders: 0 });
  });
  s.citizenSpot = {};
  Object.keys(s.citizens).forEach(pop => {
    const [status, nb] = s.citizens[pop]; if (status !== 'Active') return;
    const hood = fold(nb) || String(nb || '');
    let best = null, br = -1;
    for (const sp of spots[hood] || []) { const rk = spotRank_(pop, sp.id); if (rk > br || (rk === br && sp.id < best.id)) { best = sp; br = rk; } }
    if (best) { best.holders++; s.citizenSpot[pop] = best.id; }
  });
  s.spots = {}; Object.keys(spots).forEach(h => { s.spots[h] = spots[h].map(x => [x.id, x.holders]); });
  s.fold = { canon, child };
  s.missing = [];   // codex gate 4 item 4: a missing input is a HOLD, never a silent zero
  const rdg = await getSheetData('Riley_Digest'), rh = rdg[0] || [];
  const riC = rh.indexOf('Cycle'), riW = rh.indexOf('WorldEvents'), riS = rh.indexOf('StorySeedCount');
  if (riC < 0 || riW < 0 || riS < 0) s.missing.push('Riley_Digest header ' + JSON.stringify([riC, riW, riS]));
  const rr = riC < 0 ? [] : rdg.slice(1).filter(r => num(r[riC]) === c);
  if (rr.length !== 1) s.missing.push('Riley_Digest C' + c + ' rows ' + rr.length);
  const last = rr[rr.length - 1] || [];
  let wev = null; try { wev = riW >= 0 && String(last[riW] || '') !== '' ? JSON.parse(last[riW]) : null; } catch (e) { wev = null; }
  if (!Array.isArray(wev)) s.missing.push('Riley_Digest C' + c + ' WorldEvents not a JSON list');
  const seedRaw = riS >= 0 ? last[riS] : '';
  if (String(seedRaw).trim() === '' || !isFinite(Number(seedRaw))) s.missing.push('Riley_Digest C' + c + ' StorySeedCount blank');
  s.riley = { rows: rr.length, worldEvents: wev, storySeeds: seedRaw };
  const hk = await getSheetData('Story_Hook_Deck'), hh = hk[0] || [];
  const hkC = hh.indexOf('Cycle'), hkT = hh.indexOf('HookText');
  if (hkC < 0 || hkT < 0) s.missing.push('Story_Hook_Deck header ' + JSON.stringify([hkC, hkT]));
  s.hookText = hkC < 0 ? [] : hk.slice(1).filter(r => num(r[hkC]) === c).map(r => String(r[hkT] || ''));
  return s;
}

function components(s) {   // v3NeighborhoodWriter.js:368-400 tests on what the sheets keep
  const EV = ['festival', 'concert', 'art', 'celebration', 'parade', 'market'], SH = ['community', 'culture', 'festival', 'art'];
  const evText = e => [e.subdomain, e.subtype, e.description, e.summary, e.title].filter(Boolean).join(' ').toLowerCase();   // eventText :353-361, no domain
  let evDomain = 0, evTextHits = 0;
  (s.riley.worldEvents || []).forEach(e => {
    const dm = String(e.domain || '').toLowerCase();
    if (dm === 'culture' || dm === 'community' || dm === 'holiday' || dm === 'festival') evDomain++;
    if (EV.some(t => evText(e).indexOf(t) >= 0)) evTextHits++;
  });
  const hookHits = s.hookText.filter(t => SH.some(x => t.toLowerCase().indexOf(x) >= 0)).length;
  const seeds = Number(s.riley.storySeeds) || 0;
  return { worldEvents: (s.riley.worldEvents || []).length, evDomain, evText: evTextHits, hookRows: s.hookText.length, hookHitsFromText: hookHits,
    seedCount: seeds, baseLow: evDomain + evTextHits + hookHits, baseHigh: evDomain + evTextHits + hookHits + seeds };
}

(async () => {
  const s = await read(cyc);
  s.components = components(s);
  fs.writeFileSync(O + 'c' + cyc + '.json', JSON.stringify(s));
  console.log('C' + cyc + ' live: ' + Object.keys(s.biz).length + ' business rows, high water ' + s.highWater + ', archive ' + s.archiveIds.length +
    ', citizens ' + Object.keys(s.citizens).length + ', spot hoods ' + Object.keys(s.spots).length + ', riley rows ' + s.riley.rows + ', hooks ' + s.hookText.length +
    ' | EA base bounds ' + s.components.baseLow + '..' + s.components.baseHigh + ' ' + JSON.stringify(s.components));
  if (mode === 'snap') return;
  const p = JSON.parse(fs.readFileSync(O + 'c' + (cyc - 1) + '.json', 'utf8'));
  const d = { cycle: cyc, vs: cyc - 1, hold: [] };
  s.missing.concat(p.missing || []).forEach(m => d.hold.push('missing input: ' + m));
  const ids = Object.keys(s.biz), pids = Object.keys(p.biz);
  const idNum = i => Number(String(i).replace(/^BIZ-0*/, ''));
  d.bizAdded = ids.filter(i => !p.biz[i]); d.bizRemoved = pids.filter(i => !s.biz[i]);
  d.highWater = [p.highWater, s.highWater];
  d.archiveAdded = s.archiveIds.filter(i => p.archiveIds.indexOf(i) < 0);
  // a removed ID must be archived THIS fire (codex gate 4 item 4: not merely present in the archive from before)
  d.removedNotArchived = d.bizRemoved.filter(i => d.archiveAdded.indexOf(i) < 0);
  const bh = s.bizHeader, iKP = bh.indexOf('Key_Personnel');
  // the engine's only add path is the heritage birth (generationalWealthEngine.js:3203-3241): ID above the old mark, a "(founder)" owner
  d.bizAddedUnexplained = d.bizAdded.filter(i => !(idNum(i) > p.highWater && iKP >= 0 && /\(founder\)/.test(String(s.biz[i][iKP] || ''))));
  const wantMark = Math.max(p.highWater, ...d.bizAdded.map(idNum));
  if (d.bizAddedUnexplained.length) d.hold.push('business rows added without a heritage birth: ' + JSON.stringify(d.bizAddedUnexplained));
  if (d.removedNotArchived.length) d.hold.push('business rows removed without an archive row this Cycle: ' + JSON.stringify(d.removedNotArchived));
  if (s.highWater !== wantMark) d.hold.push('high water ' + p.highWater + ' → ' + s.highWater + ', want ' + wantMark);
  d.newRowChanges = {};
  pids.filter(NEW).forEach(id => {
    if (!s.biz[id]) { d.newRowChanges[id] = 'gone' + (s.archiveIds.indexOf(id) >= 0 ? ' (archived)' : ' (NOT archived)'); return; }
    const ch = {}; bh.forEach((h, k) => { if (String(p.biz[id][k]) !== String(s.biz[id][k])) ch[h] = [p.biz[id][k], s.biz[id][k]]; });
    if (Object.keys(ch).length) d.newRowChanges[id] = ch;
  });
  d.newRowDyn = {}; pids.filter(NEW).forEach(id => { if (s.dyn[id]) d.newRowDyn[id] = s.dyn[id]; });
  // every EmployerBizId change, blank → job included (codex gate 4 item 4); one touching a 103 row is read before acceptance
  d.employerMoves = [];
  Object.keys(p.citizens).forEach(pop => {
    const a = p.citizens[pop], b = s.citizens[pop]; if (!b || a[2] === b[2]) return;
    d.employerMoves.push([pop, a[2] || '(none)', b[2] || '(none)', NEW(b[2]) ? 'TO-NEW-ROW' : NEW(a[2]) ? 'FROM-NEW-ROW' : '']);
  });
  d.employerMovesNewRows = d.employerMoves.filter(m => m[3]);
  d.citizensGone = Object.keys(p.citizens).filter(pop => !s.citizens[pop]);
  if (d.citizensGone.length) d.hold.push('ledger rows gone: ' + JSON.stringify(d.citizensGone.slice(0, 10)));
  if (d.employerMovesNewRows.length) d.hold.push('employment moves touching a 103 row (read each): ' + JSON.stringify(d.employerMovesNewRows));
  d.newCitizensAtNewRows = Object.keys(s.citizens).filter(pop => !p.citizens[pop] && NEW(s.citizens[pop][2])).map(pop => [pop, s.citizens[pop][2]]);
  d.spots = {};
  new Set(Object.keys(p.spots).concat(Object.keys(s.spots))).forEach(h => {
    const a = p.spots[h] || [], b = s.spots[h] || [];
    const ai = a.map(x => x[0]), bi = b.map(x => x[0]);
    d.spots[h] = { eligible: [ai.length, bi.length], lost: ai.filter(i => bi.indexOf(i) < 0), gained: bi.filter(i => ai.indexOf(i) < 0), holdersMoved: 0 };
  });
  const foldP = h => { const k = String(h || '').trim().toLowerCase(); return s.fold.canon[k] || s.fold.child[k] || String(h || ''); };
  const moved = Object.keys(p.citizenSpot).filter(pop => s.citizenSpot[pop] && s.citizenSpot[pop] !== p.citizenSpot[pop]);
  moved.forEach(pop => { const h = foldP(p.citizens[pop][1]); if (d.spots[h]) d.spots[h].holdersMoved++; });
  d.holderShift = { citizensWithSpotBoth: Object.keys(p.citizenSpot).filter(pop => s.citizenSpot[pop]).length, moved: moved.length };
  // spot lines (spots.js:81-88): the Cycle's spot-fact lines must name the citizen's own spot — pre-fire citizen + hood
  // (Phase5-CitizenEvents runs before migration) × this Cycle's eligible spots, the generator's own spotRank_
  const EVENTS = [['had a small fire this week', 'minor_fire'], ['had a fire this week — contained', 'major_blaze_contained'],
    ['went dark when a transformer blew', 'transformer_blowout'], ['was temporarily shut pending an inspection', 'forced_temporary_closure'],
    ['go quiet lately', 'quiet'], ['let some staff go', 'shed'], ['steadier again', 'recovery'], ['felt a lift at ', 'lift']];
  const iNm = bh.indexOf('Name'), spotAt = {};
  Object.keys(p.citizens).forEach(pop => {
    const [status, nb] = p.citizens[pop]; if (status !== 'Active') return;
    let best = null, br = -1;
    for (const [sid] of s.spots[foldP(nb)] || []) { const rk = spotRank_(pop, sid); if (rk > br || (rk === br && sid < best)) { best = sid; br = rk; } }
    if (best) spotAt[pop] = String(s.biz[best][iNm] || '').trim();
  });
  const lh = await getSheetData('LifeHistory_Log'), lhh = lh[0] || [];
  const lC = lhh.indexOf('Cycle'), lX = lhh.indexOf('EventText'), lP = lhh.indexOf('POPID');
  if (lC < 0 || lX < 0 || lP < 0) d.hold.push('missing input: LifeHistory_Log header');
  const lrows = lC < 0 ? [] : lh.slice(1).filter(r => num(r[lC]) === cyc);
  if (!lrows.length) d.hold.push('missing input: no LifeHistory_Log C' + cyc + ' rows');
  d.spotLines = { drawn: 0, byFact: {}, notTheirSpot: [], strays: [] };
  lrows.forEach(r => {
    const text = String(r[lX] || ''), hit = EVENTS.find(([n]) => text.indexOf(n) >= 0); if (!hit) return;
    d.spotLines.drawn++; d.spotLines.byFact[hit[1]] = (d.spotLines.byFact[hit[1]] || 0) + 1;
    const want = spotAt[r[lP]];
    if (!want) d.spotLines.strays.push(r[lP] + ' ' + text); else if (text.indexOf(want) < 0) d.spotLines.notTheirSpot.push(r[lP] + ' ' + text);
  });
  if (d.spotLines.notTheirSpot.length || d.spotLines.strays.length) d.hold.push('spot lines not on the citizen\'s own spot: ' + (d.spotLines.notTheirSpot.length + d.spotLines.strays.length));
  // EventAttractiveness on live is UNKNOWN, not explained: seeds are on no sheet, HookText is h.text only (the writer reads
  // h.hook || h.text), pulse and the PropertiesService chaos fold are not observable (codex gate 4 item 4). Components are
  // shown for reading; an all-hood decline holds acceptance until a tapped bench replay of the Cycle explains it.
  d.ea = {}; let down = 0, total = 0;
  Object.keys(s.hoods).forEach(h => { const a = p.hoods[h], b = s.hoods[h]; if (!a) return; total++; if (b.event < a.event) down++; d.ea[h] = [a.event, b.event, Math.round((b.event - a.event) * 100) / 100]; });
  d.eaComponents = { [cyc - 1]: p.components, [cyc]: s.components, note: 'live EA unknown: seeds bounded 0..StorySeedCount, hook hits a lower bound, pulse + chaos fold unobserved' };
  d.eaAllDown = down === total && total > 0;
  if (d.eaAllDown) d.hold.push('EventAttractiveness fell in all ' + total + ' hoods — replay C' + cyc + ' on the bench with the EA tap before accepting');
  d.verdict = d.hold.length ? 'HOLD' : 'ACCEPT-CANDIDATE';
  fs.writeFileSync(O + 'diff-c' + cyc + '.json', JSON.stringify(d, null, 1));
  console.log('BIZ added ' + JSON.stringify(d.bizAdded) + ' removed ' + JSON.stringify(d.bizRemoved) + ' (archived this Cycle ' + JSON.stringify(d.archiveAdded) + ') high water ' + d.highWater.join('→'));
  console.log('103 rows changed ' + Object.keys(d.newRowChanges).length + ', dynamics entries ' + Object.keys(d.newRowDyn).length + '; employer moves ' + d.employerMoves.length +
    ' (touching new rows ' + d.employerMovesNewRows.length + '); new citizens placed at new rows ' + d.newCitizensAtNewRows.length + '; ledger rows gone ' + d.citizensGone.length);
  console.log('spot holders moved ' + d.holderShift.moved + ' of ' + d.holderShift.citizensWithSpotBoth + '; spot lines ' + d.spotLines.drawn + ' ' + JSON.stringify(d.spotLines.byFact) +
    ', not their spot ' + d.spotLines.notTheirSpot.length + ', strays ' + d.spotLines.strays.length + '; EA hoods down ' + down + '/' + total);
  console.log('VERDICT ' + d.verdict + (d.hold.length ? '\n  ' + d.hold.join('\n  ') : ''));
  console.log('→ ' + O + 'diff-c' + cyc + '.json');
})().catch(e => { console.error(e.message); process.exit(1); });
