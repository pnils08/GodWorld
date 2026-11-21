/**
 * engine.340 Task 2 — replay live Ripple_Ledger rows through the old (one bar) and the new (bar per kind) seed builder.
 *
 *   node output/engine-sheet/2026-11-21-engine340-replay.js --old <git-ref> [--from 110] [--to 116] [--json <ripples.json>]
 *
 * Old = phase07-evening-media/buildContractSeeds.js at --old (required; engine.340's pre-cut commit is 0f4b6ea16);
 * new = the working tree. Ledger rows → S.rippleEvents (utilities/rippleLedger.js shape), one Cycle at a time,
 * no spreadsheet (citizen / backdrop draws fail soft). Class only: every flip, with its kind and the reason on
 * both sides; per-Cycle major / texture totals and COMMUNITY+SPORTS majors (the drafter's first-three pool);
 * every ripple kind seen and its rule. Read-only: no sheet write.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const REL = 'phase07-evening-media/buildContractSeeds.js';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const FROM = Number(arg('--from', 110));
const TO = Number(arg('--to', 116));
const OLD_REF = arg('--old', null);
const JSON_IN = arg('--json', null);

function loadOld() {
  if (!OLD_REF) throw new Error('--old <git-ref> is required (engine.340 pre-cut: 0f4b6ea16)');
  const src = execSync('git show ' + OLD_REF + ':' + REL, { cwd: ROOT, encoding: 'utf8' });
  if (src === fs.readFileSync(path.join(ROOT, REL), 'utf8')) console.log('NOTE: --old is the working-tree builder — a same-source run proves execution only');
  const tmp = path.join(require('os').tmpdir(), 'engine340-old-' + process.pid + '.js');
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

const errors = [];
global.logEngineError_ = (ctx, phase, err) => errors.push(phase + ': ' + err.message);

function build(mod, cycle, ripples) {
  const ctx = { summary: { cycleId: cycle, rippleEvents: ripples.map(x => Object.assign({}, x)) } };
  mod.buildContractSeeds_(ctx);
  const out = {};
  ctx.summary.contractSeeds.forEach(s => { out[s.seedId] = s; });
  return out;
}

// The same clusters both builders made (cluster key unchanged until Task 3), rebuilt here to name the reason.
function clusters(ripples) {
  const by = {}, order = [];
  for (const r of ripples) {
    let key = (r.causeType || 'unknown') + '|' + String(r.neighborhood || 'citywide').toLowerCase().replace(/[^a-z]/g, '');
    if (r.causeType === 'coverage-reaction') key += '|' + (r.causeId || '');
    if (!by[key]) { by[key] = []; order.push(key); }
    by[key].push(r);
  }
  return order.map(k => by[k]);
}
function leadOf(group) { return group.find(r => r.effectType !== 'carryover') || group[0]; }

function oldReason(mod, group) {
  const ugs = mod.contractSeedUnitGroups_(group, leadOf(group));
  if (group.length >= 3) return 'count ' + group.length;
  for (const u of ugs) {
    const m = Math.abs(u.figure);
    if (m >= 3) return u.label + ' ' + round(u.figure) + ' ≥ 3';
    if (m > 0 && m < 1 && m >= 0.05) return u.label + ' ' + round(u.figure) + ' in [0.05,1)';
  }
  return 'no arm';
}
function newReason(mod, group) {
  const ugs = mod.contractSeedUnitGroups_(group, leadOf(group));
  const parts = [];
  for (const u of ugs) {
    const rule = mod.contractSeedClassRule_(u.causeType, u.effectType);
    const verdict = mod.contractSeedIsMajor_(u);
    const r = !rule ? 'NO RULE' : rule.rule + (rule.bar !== undefined ? ' ' + rule.bar : '') + (rule.surge ? ' / surge ' + rule.surge : '');
    parts.push((u.label) + ' ' + round(u.classFigure) + ' ×' + u.classN + ' [' + r + '] → ' + (verdict === null ? 'none' : verdict ? 'major' : 'texture'));
  }
  return parts.join('; ');
}
const round = x => Math.round(x * 1000) / 1000;

(async () => {
  let rows;
  if (JSON_IN) rows = JSON.parse(fs.readFileSync(JSON_IN, 'utf8'));
  else {
    require(path.join(ROOT, 'lib/env'));
    rows = await require(path.join(ROOT, 'lib/sheets')).getSheetAsObjects('Ripple_Ledger');
  }
  const oldMod = loadOld();
  const newMod = require(path.join(ROOT, REL));
  if (!oldMod.contractSeedUnitGroups_) throw new Error('old builder lacks contractSeedUnitGroups_ (pre-engine.334)');

  const kinds = {};
  const flipsByKind = {};
  let seeds = 0, flips = 0;
  const totals = [];
  for (let c = FROM; c <= TO; c++) {
    const ripples = rows.filter(r => Number(r.Cycle) === c).map(toRipple);
    for (const r of ripples) {
      const k = r.causeType + ' / ' + r.effectType;
      kinds[k] = (kinds[k] || 0) + 1;
    }
    const a = build(oldMod, c, ripples);
    const b = build(newMod, c, ripples);
    const ids = Object.keys(a);
    if (ids.length !== Object.keys(b).length || ids.some(id => !b[id])) throw new Error('C' + c + ': seed sets differ between builders');
    const groupById = {};
    for (const g of clusters(ripples)) {
      const lead = g[0];
      const key = (lead.causeType || 'unknown') + '|' + String(lead.neighborhood || 'citywide').toLowerCase().replace(/[^a-z]/g, '') +
        (lead.causeType === 'coverage-reaction' ? '|' + (lead.causeId || '') : '');
      groupById[newMod.contractSeedHash_(c + '|' + key + '|' + leadOf(g).causeId)] = g;
    }
    const t = { cycle: c, oldMajor: 0, newMajor: 0, oldTexture: 0, newTexture: 0, oldPool: 0, newPool: 0 };
    for (const id of ids) {
      seeds++;
      const o = a[id], n = b[id];
      const pool = s => s.seedClass === 'major' && (s.domain === 'COMMUNITY' || s.domain === 'SPORTS');
      t[o.seedClass === 'major' ? 'oldMajor' : 'oldTexture']++;
      t[n.seedClass === 'major' ? 'newMajor' : 'newTexture']++;
      if (pool(o)) t.oldPool++;
      if (pool(n)) t.newPool++;
      if (o.seedClass !== n.seedClass) {
        flips++;
        const g = groupById[id];
        const kind = (g ? g[0].causeType : '?') + ' ' + o.seedClass + '→' + n.seedClass;
        flipsByKind[kind] = (flipsByKind[kind] || 0) + 1;
        console.log('C' + c + ' ' + o.domain + ' ' + o.neighborhood + '  ' + o.seedClass + ' → ' + n.seedClass + '  | ' + n.what);
        if (g) {
          console.log('   old: ' + oldReason(oldMod, g));
          console.log('   new: ' + newReason(newMod, g));
        }
      }
    }
    totals.push(t);
  }
  console.log('\nC' + FROM + '–C' + TO + ': seeds ' + seeds + ', class flips ' + flips);
  console.log('\nFlips by kind:');
  Object.keys(flipsByKind).sort().forEach(k => console.log('  ' + k + '  ' + flipsByKind[k]));
  console.log('\nPer Cycle (major / texture; COMMUNITY+SPORTS majors = the drafter pool):');
  totals.forEach(t => console.log('  C' + t.cycle + '  old ' + t.oldMajor + ' / ' + t.oldTexture + ' (pool ' + t.oldPool + ')   new ' + t.newMajor + ' / ' + t.newTexture + ' (pool ' + t.newPool + ')'));
  console.log('\nRipple kinds in the window and their rule:');
  Object.keys(kinds).sort().forEach(k => {
    const [ct, et] = k.split(' / ');
    const rule = newMod.contractSeedClassRule_(ct, et);
    console.log('  ' + k + '  ×' + kinds[k] + '  ' + (rule ? rule.rule + (rule.bar !== undefined ? ' ' + rule.bar : '') + (rule.surge ? ' / surge ' + rule.surge : '') : 'NO RULE'));
  });
  console.log('\nKinds in the table with no rows in the window:');
  const seenCt = new Set(Object.keys(kinds).map(k => k.split(' / ')[0]));
  Object.keys(newMod.CONTRACT_SEED_CLASS).filter(k => !seenCt.has(k)).forEach(k => console.log('  ' + k));
  console.log('\nEngine_Errors rows the new builder would write: ' + errors.length);
  errors.forEach(e => console.log('  ' + e));
})().catch(e => { console.error(e); process.exit(1); });
