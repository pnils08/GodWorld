// engine.310 C114 live watch (codex diff gate 2026-10-21 item 4). Read-only on LIVE; writes only its own JSON.
// usage: node 2026-10-21-e310-c114watch.js snap 113   (after the C113 read, before the stage-19 push)
//        node 2026-10-21-e310-c114watch.js diff 114   (after C114 fires — engine.310's first live Cycle)
// snap / read: per hood saved EventAttractiveness, and the persisted EA inputs for the Cycle under the engine.310 rule (the PROD
//   writer's own regexes): Riley_Digest CityEvents count (col Q, each staged event once), WorldEvents domain + whole-word hits,
//   StorySeedCount (seed hits unobservable: seeds are on no sheet), Story_Hook_Deck HookText whole-word hits (a conditional bound
//   only: the writer reads h.hook || h.text, and an h.hook can override the saved text). Base estimate = staged + domain + word +
//   hook hits — an observed estimate, not a bound. The rule is the deployed one: regexes come from the writer at ffad3bf8 (git), not the working tree.
// diff: VERDICT
//   HOLD     — a missing input, or an Engine_Errors row for the Cycle naming Phase10 / NeighborhoodMap / persist.
//   DIAGNOSE — every hood moved the same way, or the EA sum left 0.5×..2× of the prior Cycle's. Read it against the staged count
//              and the hook / event hits before attributing anything to engine.310 (live sums ran 114–704 over C103–C112).
//   CLEAN    — otherwise.
// C115 follow-up (not automated): migration drift and trajectory read the C114 saved map — read their C115 moves against C114 EA.
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (!LIVE || LIVE === BENCH || LIVE === BASE) throw new Error('env does not point at live');
const fs = require('fs');
const { getSheetData } = require('/root/GodWorld/lib/sheets');
const W = new Function(require('child_process').execSync('git -C /root/GodWorld show ffad3bf8:phase08-v3-chicago/v3NeighborhoodWriter.js',
  { encoding: 'utf8' }) + '\nreturn { EVENT_ATTRACT_EVENT_WORDS, EVENT_ATTRACT_STORY_WORDS };')();   // codex diff gate 2 item 2: pinned
const O = '/root/GodWorld/output/engine-sheet/2026-10-21-e310-c114watch-';
const [mode, cycArg] = process.argv.slice(2), cyc = Number(cycArg);
if (!/^(snap|diff)$/.test(mode || '') || !cyc) throw new Error('usage: snap <cycle> | diff <cycle>');
const num = v => Number(String(v).replace(/^C/, ''));

async function read(c) {
  const s = { cycle: c, at: new Date().toISOString(), missing: [], ea: {}, inputs: {}, eaSum: null, eaRange: null };   // complete shape even on an early HOLD
  const nm = await getSheetData('Neighborhood_Map'), nh = nm[0];
  const iN = nh.indexOf('Neighborhood'), iE = nh.indexOf('EventAttractiveness'), iC = nh.indexOf('Cycle');
  if ([iN, iE, iC].some(i => i < 0)) { s.missing.push('Neighborhood_Map header ' + JSON.stringify([iN, iE, iC])); return s; }
  s.ea = {};
  nm.slice(1).forEach(r => {
    if (!r[iN]) return;
    const v = String(r[iE]).trim() === '' ? NaN : Number(r[iE]);
    if (!isFinite(v)) s.missing.push('Neighborhood_Map EA not a number for ' + r[iN] + ': ' + JSON.stringify(r[iE]));
    s.ea[String(r[iN]).trim()] = v;
  });
  const mapCycles = [...new Set(nm.slice(1).filter(r => r[iN]).map(r => num(r[iC])))];
  if (mapCycles.length !== 1 || mapCycles[0] !== c) s.missing.push('Neighborhood_Map Cycle ' + JSON.stringify(mapCycles) + ' != ' + c);
  if (Object.keys(s.ea).length !== 22) s.missing.push('Neighborhood_Map hoods ' + Object.keys(s.ea).length);

  const rd = await getSheetData('Riley_Digest'), rh = rd[0];
  const rC = rh.indexOf('Cycle'), rQ = rh.indexOf('CityEvents'), rW = rh.indexOf('WorldEvents'), rS = rh.indexOf('StorySeedCount');
  if ([rC, rQ, rW, rS].some(i => i < 0)) s.missing.push('Riley_Digest header ' + JSON.stringify([rC, rQ, rW, rS]));
  const rr = rd.slice(1).filter(r => num(r[rC]) === c);
  if (rr.length !== 1) s.missing.push('Riley_Digest C' + c + ' rows ' + rr.length);
  const row = rr[0] || [];
  const staged = String(row[rQ] || '').split(', ').filter(Boolean);
  let wev = []; try { wev = JSON.parse(row[rW]); } catch (e) { s.missing.push('Riley_Digest WorldEvents not JSON'); }
  if (!Array.isArray(wev)) { s.missing.push('Riley_Digest WorldEvents not a list'); wev = []; }
  const seedRaw = row[rS];   // codex diff gate 3 item 2: null / blank / negative are missing, never zero
  if (seedRaw === null || seedRaw === undefined || String(seedRaw).trim() === '' || !isFinite(Number(seedRaw)) || Number(seedRaw) < 0) s.missing.push('Riley_Digest StorySeedCount missing / not a count: ' + JSON.stringify(seedRaw));
  let evDomain = 0, evText = 0;
  (Array.isArray(wev) ? wev : []).forEach(e => {
    const d = String(e.domain || '').toLowerCase();
    if (d === 'culture' || d === 'community' || d === 'holiday' || d === 'festival') evDomain++;
    const t = [e.subdomain, e.subtype, e.description, e.summary, e.title].filter(Boolean).join(' ').toLowerCase();
    if (W.EVENT_ATTRACT_EVENT_WORDS.test(t)) evText++;
  });
  const hk = await getSheetData('Story_Hook_Deck'), hh = hk[0] || [];
  const hC = hh.indexOf('Cycle'), hT = hh.indexOf('HookText');
  if (hC < 0 || hT < 0) s.missing.push('Story_Hook_Deck header');
  const hooks = hk.slice(1).filter(r => num(r[hC]) === c).map(r => String(r[hT] || ''));
  const hookHits = hooks.filter(t => W.EVENT_ATTRACT_STORY_WORDS.test(t.toLowerCase())).length;
  s.inputs = { staged: staged.length, stagedNames: staged, worldEvents: wev.length, evDomain, evText, storySeedCount: row[rS],
    hookRows: hooks.length, hookHits, baseEstimate: staged.length + evDomain + evText + hookHits };
  const vals = Object.values(s.ea);
  if (!vals.length) return s;
  s.eaSum = Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
  s.eaRange = [Math.min(...vals), Math.max(...vals)];
  return s;
}

(async () => {
  const s = await read(cyc);
  if (mode === 'snap') {
    fs.writeFileSync(O + 'c' + cyc + '.json', JSON.stringify(s, null, 1));
    console.log(`snap C${cyc}: EA sum ${s.eaSum} range ${s.eaRange} | ${JSON.stringify(s.inputs)} | missing ${s.missing.length}`);
    if (s.missing.length) { console.log('  ' + s.missing.join('\n  ')); process.exit(2); }
    return;
  }
  const p = JSON.parse(fs.readFileSync(O + 'c' + (cyc - 1) + '.json', 'utf8'));
  const d = { cycle: cyc, vs: cyc - 1, hold: [], diagnose: [], prev: p, now: s, perHood: {} };
  p.missing.concat(s.missing).forEach(m => d.hold.push('missing: ' + m));
  if (p.cycle !== cyc - 1) d.hold.push('prior snapshot is C' + p.cycle + ', not C' + (cyc - 1));   // codex diff gate 2 item 2
  if (JSON.stringify(Object.keys(p.ea || {}).sort()) !== JSON.stringify(Object.keys(s.ea || {}).sort())) d.hold.push('hood set changed between snapshots');
  const ee = await getSheetData('Engine_Errors'), eh = ee[0] || [];
  const eC = eh.indexOf('Cycle');
  if (eC < 0) d.hold.push('missing: Engine_Errors Cycle column');
  const errRows = ee.slice(1).filter(r => num(r[eC]) === cyc).map(r => r.join(' | '));
  errRows.filter(t => /Phase10|NeighborhoodMap|persist/i.test(t)).forEach(t => d.hold.push('Engine_Errors: ' + t.slice(0, 300)));   // scan full text
  d.engineErrors = errRows.map(t => t.slice(0, 300));
  let up = 0, down = 0;
  Object.keys(s.ea).forEach(h => {
    const a = p.ea[h], b = s.ea[h];
    d.perHood[h] = [a, b];
    if (b > a) up++; else if (b < a) down++;
  });
  const n = Object.keys(s.ea).length;
  if (n && (up === n || down === n)) d.diagnose.push(`EA moved ${up === n ? 'up' : 'down'} in all ${n} hoods`);
  if (p.eaSum > 0 && (s.eaSum < p.eaSum * 0.5 || s.eaSum > p.eaSum * 2)) d.diagnose.push(`EA sum ${p.eaSum} → ${s.eaSum} (outside 0.5×..2×)`);
  d.verdict = d.hold.length ? 'HOLD' : (d.diagnose.length ? 'DIAGNOSE' : 'CLEAN');
  fs.writeFileSync(O + 'diff-c' + cyc + '.json', JSON.stringify(d, null, 1));
  console.log(`C${cyc - 1} → C${cyc}: EA sum ${p.eaSum} → ${s.eaSum}, range ${p.eaRange} → ${s.eaRange}, up ${up} / down ${down}`);
  console.log(`  inputs C${cyc - 1} ${JSON.stringify(p.inputs)}\n  inputs C${cyc} ${JSON.stringify(s.inputs)}`);
  console.log('VERDICT ' + d.verdict + (d.hold.concat(d.diagnose).length ? '\n  ' + d.hold.concat(d.diagnose).join('\n  ') : ''));
})().catch(e => { console.error(e.message); process.exit(1); });
