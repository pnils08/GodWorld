// engine.334 bench readback on SANDBOX 1004 (no token echoed, read-only).
//   node 2026-11-08-e334-bench.js read <label> <N> <commit>
// Reads Cycle N's Story_Seed_Deck rows and Ripple_Ledger rows off the bench, rebuilds the seeds from those ripples with the
// stage-44 builder (86174e9db) and the candidate (<commit>), and checks: every deck row = the candidate's seed (What,
// Magnitude, Class); which rows the old builder would have written differently; no What adds across units. One JSON line
// appended to 2026-11-08-e334-reads.jsonl.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-08-e334-reads.jsonl';
const REL = 'phase07-evening-media/buildContractSeeds.js';
const OLD = '86174e9db';
const sh = require('/root/GodWorld/lib/sheets');
const num = v => { const n = Number(String(v).replace(/^C/, '').trim()); return isFinite(n) ? n : null; };
const obj = d => { const h = (d[0] || []).map(x => String(x).trim()); return { h, rows: d.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))) }; };

function builderAt(ref) {
  const tmp = path.join(os.tmpdir(), 'e334-' + ref + '-' + process.pid + '.js');
  fs.writeFileSync(tmp, execSync('git show ' + ref + ':' + REL, { cwd: '/root/GodWorld', encoding: 'utf8' }));
  const m = require(tmp); fs.unlinkSync(tmp); return m;
}
function toRipple(r) {
  const mag = r.Magnitude === '' ? 0 : Number(r.Magnitude);
  return { cycle: num(r.Cycle), causeType: r.CauseType || '', causeId: r.CauseId || '', causeDetail: r.CauseDetail || '', effectType: r.EffectType || '',
    targetScope: r.TargetScope || '', targetIds: String(r.TargetIds || '').split('|').filter(Boolean), neighborhood: r.Neighborhood || '',
    magnitude: isNaN(mag) ? 0 : mag, duration: Number(r.Duration) || 1, remainingStrength: r.RemainingStrength, sourceEngine: r.SourceEngine || '' };
}
function seedsOf(mod, N, ripples) {
  const ctx = { summary: { cycleId: N, rippleEvents: ripples.map(x => Object.assign({}, x)) } };
  mod.buildContractSeeds_(ctx);
  return ctx.summary.contractSeeds;
}
const key = s => s.domain + '|' + s.neighborhood + '|' + s.what;

(async () => {
  const [cmd, label, nArg, commit] = process.argv.slice(2);
  if (cmd !== 'read' || !label || !nArg || !commit) throw new Error('usage: read <label> <N> <commit>');
  process.env.GODWORLD_SHEET_ID = BENCH;
  if (BENCH === LIVE) throw new Error('bench = live');
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE) throw new Error('title check failed: ' + title);
  const N = Number(nArg);

  const deck = obj(await sh.getSheetData('Story_Seed_Deck')).rows.filter(r => num(r.Cycle) === N)
    .map(r => ({ seedId: String(r.SeedID), desk: r.Desk, cls: r.Class, domain: r.Domain, neighborhood: r.Neighborhood, what: String(r.What), mag: r.Magnitude }));
  const ripples = obj(await sh.getSheetData('Ripple_Ledger')).rows.filter(r => num(r.Cycle) === N).map(toRipple);
  const neu = seedsOf(builderAt(commit), N, ripples);
  const old = seedsOf(builderAt(OLD), N, ripples);
  const newBy = {}; neu.forEach(s => { newBy[s.seedId] = s; });
  const oldBy = {}; old.forEach(s => { oldBy[s.seedId] = s; });
  const newByKey = {}; neu.forEach(s => { newByKey[key(s)] = s; });

  const mismatches = [], oldDiffers = [];
  let matched = 0, matchedByText = 0;
  for (const d of deck) {
    let s = newBy[d.seedId];
    if (!s) { s = newByKey[d.domain + '|' + d.neighborhood + '|' + d.what]; if (s) matchedByText++; } // a SeedID the sheet stored as a number (G-ES14)
    if (!s) { mismatches.push({ seedId: d.seedId, what: d.what, why: 'no candidate seed' }); continue; }
    const ok = s.what === d.what && Number(s.magnitude) === Number(d.mag) && s.seedClass === d.cls;
    if (ok) matched++; else mismatches.push({ seedId: d.seedId, deck: [d.what, d.mag, d.cls], candidate: [s.what, s.magnitude, s.seedClass] });
    const o = oldBy[s.seedId];
    if (o && (o.what !== s.what || o.magnitude !== s.magnitude || o.seedClass !== s.seedClass)) {
      oldDiffers.push({ domain: s.domain, hood: s.neighborhood, old: o.what + ' | ' + o.magnitude + ' | ' + o.seedClass, deck: d.what + ' | ' + d.mag + ' | ' + d.cls });
    }
  }
  // no deck What adds across units: a multi-group row lists each unit apart, so its Magnitude equals the lead unit, never the cross-unit total
  const sports = deck.filter(d => d.domain === 'SPORTS' && /related effects/.test(d.what));
  const ee = obj(await sh.getSheetData('Engine_Errors')).rows.filter(r => num(r.Cycle) === N).map(r => [r.Phase, r.Error].join(' | ').slice(0, 220));
  const wk = (await sh.getSheetData('World_Config')).find(r => r[0] === 'cycleCount') || [];
  const out = { label, N, commit, at: new Date().toISOString(), cycleCount: wk[1], deckRows: deck.length, ripples: ripples.length,
    candidateSeeds: neu.length, deckEqualsCandidate: matched + '/' + deck.length + (matchedByText ? ' (' + matchedByText + ' by text: SeedID stored as a number)' : ''),
    mismatches, oldBuilderWouldDiffer: oldDiffers.length, oldDiffers, sportsRows: sports.map(d => d.what + ' | ' + d.mag + ' | ' + d.cls), engineErrorsAtN: ee };
  fs.appendFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(JSON.stringify(out, null, 1));
  process.exit(mismatches.length ? 2 : 0);
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
