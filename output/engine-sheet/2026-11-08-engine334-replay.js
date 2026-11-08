/**
 * engine.334 Task 4 — replay live Ripple_Ledger rows through the old and the new seed builder.
 *
 *   node output/engine-sheet/2026-11-08-engine334-replay.js [--from 110] [--to 114] [--old <git-ref>] [--json <ripples.json>]
 *
 * Old builder = phase07-evening-media/buildContractSeeds.js at --old (default HEAD); new = the working tree.
 * Ledger rows are mapped back to the S.rippleEvents shape recordRipple_ builds (utilities/rippleLedger.js:79-92)
 * and fed per Cycle with no spreadsheet (citizen / backdrop draws fail soft — this compares What, Magnitude, Class only).
 * Prints every seed whose What, Magnitude or Class changed, then the counts. Read-only: no sheet write.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const REL = 'phase07-evening-media/buildContractSeeds.js';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const FROM = Number(arg('--from', 110));
const TO = Number(arg('--to', 114));
const OLD_REF = arg('--old', 'HEAD');
const JSON_IN = arg('--json', null);

function loadOld() {
  const src = execSync('git show ' + OLD_REF + ':' + REL, { cwd: ROOT, encoding: 'utf8' });
  const tmp = path.join(require('os').tmpdir(), 'engine334-old-' + process.pid + '.js');
  fs.writeFileSync(tmp, src);
  const mod = require(tmp);
  fs.unlinkSync(tmp);
  return mod;
}

function toRipple(r) {
  const ids = String(r.TargetIds || '').split('|').filter(Boolean);
  const mag = r.Magnitude === '' || r.Magnitude === null || r.Magnitude === undefined ? 0 : Number(r.Magnitude);
  return {
    cycle: Number(r.Cycle), causeType: r.CauseType || '', causeId: r.CauseId || '', causeDetail: r.CauseDetail || '',
    effectType: r.EffectType || '', targetScope: r.TargetScope || '', targetIds: ids, neighborhood: r.Neighborhood || '',
    magnitude: isNaN(mag) ? 0 : mag, duration: Number(r.Duration) || 1,
    remainingStrength: r.RemainingStrength === undefined ? '' : r.RemainingStrength, sourceEngine: r.SourceEngine || ''
  };
}

function build(mod, cycle, ripples) {
  const ctx = { summary: { cycleId: cycle, rippleEvents: ripples.map(x => Object.assign({}, x)) } };
  mod.buildContractSeeds_(ctx);
  const out = {};
  ctx.summary.contractSeeds.forEach(s => { out[s.seedId] = s; });
  return out;
}

(async () => {
  let rows;
  if (JSON_IN) rows = JSON.parse(fs.readFileSync(JSON_IN, 'utf8'));
  else {
    require(path.join(ROOT, 'lib/env'));
    rows = await require(path.join(ROOT, 'lib/sheets')).getSheetAsObjects('Ripple_Ledger');
  }
  const oldMod = loadOld();
  const newMod = require(path.join(ROOT, REL));
  let seeds = 0, whatChanged = 0, magChanged = 0;
  const flips = [];
  const transitMoves = [];
  // codex F2: buildTransitSlice.js:201-205 keeps civic seeds whose serialized row names transit words — What included
  const TRANSIT = /\btransit\b|\bBART\b|\btrain\b|\bstation\b|\brail\b/i;
  const transitHit = s => /civic/i.test(s.desk) && TRANSIT.test(JSON.stringify({ what: s.what, why: s.why, hood: s.neighborhood, domain: s.domain, desk: s.desk }));
  for (let c = FROM; c <= TO; c++) {
    const ripples = rows.filter(r => Number(r.Cycle) === c).map(toRipple);
    const a = build(oldMod, c, ripples);
    const b = build(newMod, c, ripples);
    const ids = Object.keys(a);
    if (ids.length !== Object.keys(b).length || ids.some(id => !b[id])) throw new Error('C' + c + ': seed sets differ between builders');
    for (const id of ids) {
      seeds++;
      const o = a[id], n = b[id];
      const w = o.what !== n.what, m = o.magnitude !== n.magnitude, k = o.seedClass !== n.seedClass;
      if (w) whatChanged++;
      if (m) magChanged++;
      if (k) flips.push('C' + c + ' ' + o.domain + ' ' + o.neighborhood + ' ' + o.seedClass + ' → ' + n.seedClass + ' | ' + n.what);
      if (transitHit(o) !== transitHit(n)) transitMoves.push('C' + c + ' ' + id + ' ' + (transitHit(n) ? 'now matches' : 'no longer matches') + ' | ' + n.what);
      if (w || m || k) {
        console.log('C' + c + ' ' + id + ' ' + o.domain + ' ' + o.neighborhood);
        console.log('   old: ' + o.what + ' | Magnitude ' + o.magnitude + ' | ' + o.seedClass);
        console.log('   new: ' + n.what + ' | Magnitude ' + n.magnitude + ' | ' + n.seedClass);
      }
    }
  }
  console.log('\nC' + FROM + '–C' + TO + ': seeds ' + seeds + ', What changed ' + whatChanged + ', Magnitude changed ' + magChanged + ', class flips ' + flips.length);
  flips.forEach(f => console.log('  flip: ' + f));
  console.log('civic seeds whose transit-word match changed: ' + transitMoves.length);
  transitMoves.forEach(t => console.log('  transit: ' + t));
})().catch(e => { console.error(e); process.exit(1); });
