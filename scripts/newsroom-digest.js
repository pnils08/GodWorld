#!/usr/bin/env node
/**
 * Newsroom Morning Digest — scripts/newsroom-digest.js
 *
 * Phase 2.3 (2026-07-24): the "release to Mike the next day" step of the
 * three-wake cadence. Scans output/cron-compare/ for the last --hours (default
 * 36) of newsroom artifacts — angle reads, quote packets, wake/run records —
 * and emits ONE markdown digest for morning review. Nothing here publishes;
 * it's a review surface over the probation wall (samples/staged/flagged).
 *
 * Usage:
 *   node scripts/newsroom-digest.js [--hours=36] [--out=output/cron-compare/digest-YYYY-MM-DD.md]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COMPARE = path.join(ROOT, 'output', 'cron-compare');

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}
const HOURS = parseInt(arg('--hours', '36'), 10);
const cutoff = Date.now() - HOURS * 3600e3;

function recentJson(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(suffix))
    .map(f => path.join(dir, f))
    .filter(p => fs.statSync(p).mtimeMs >= cutoff)
    .map(p => { try { return { file: p, json: JSON.parse(fs.readFileSync(p, 'utf8')) }; } catch (_) { return null; } })
    .filter(Boolean);
}

const angles = recentJson(COMPARE, 'angle.json');
const packets = recentJson(COMPARE, 'packet.json');
const wakes = recentJson(COMPARE, 'wake.json').concat(recentJson(COMPARE, 'run.json'));

// group by desk+cycle+reporter (persona slug, else fan-out reporter, else byline)
const desks = {};
for (const { json } of angles.concat(packets, wakes)) {
  const who = json.persona || (json.reporter && json.reporter.name) ||
    (json.byline && json.byline.name) || null;
  const key = (json.desk || '?') + ' c' + (json.cycle || '?') + (who ? ' [' + who + ']' : '');
  desks[key] = desks[key] || {};
  if (json.stage === 'angle') desks[key].angle = json;
  else if (json.stage === 'report') desks[key].packet = json;
  else if (json.disposition) desks[key].wake = json;
}

const L = [];
const datestamp = new Date().toISOString().slice(0, 10);
L.push('# Newsroom digest — ' + datestamp + ' (last ' + HOURS + 'h)');
L.push('');
L.push('Review surface only. Samples/staged are behind the probation wall — nothing here is canon until the Saturday compile.');
L.push('');

const keys = Object.keys(desks).sort();
if (!keys.length) {
  L.push('_No newsroom activity in the window._');
}
for (const k of keys) {
  const d = desks[k];
  L.push('## ' + k);
  if (d.angle && d.angle.angleRead) {
    L.push('- **Angle (' + d.angle.angleRead.name + '):** "' + String(d.angle.angleRead.text).replace(/\s+/g, ' ').slice(0, 220) + '..."');
  } else if (d.angle) {
    L.push('- **Angle:** (no persona read — ' + d.angle.laneEntries + ' lane entries)');
  }
  if (d.packet) L.push('- **Report:** ' + d.packet.quotesLanded + '/' + d.packet.quotesRequested + ' citizen quotes landed');
  if (d.wake) {
    const w = d.wake;
    const gate = w.disposition === 'ungated-sample' ? 'ungated (sample)' :
      (w.rheaPass === true ? 'RHEA PASS' : w.rheaPass === false ? 'RHEA FLAGGED (' + (w.rheaFlagCount != null ? w.rheaFlagCount : '?') + ' flags)' : 'no verdict');
    L.push('- **Write:** ' + (w.byline ? w.byline.name : '?') + ' → **' + String(w.disposition).toUpperCase() + '** · gate: ' + gate + (w.article ? ' · `' + w.article + '`' : ''));
    if (w.selfRecord) L.push('  - self-record: ' + (w.selfRecord.recorded ? 'filed to reporter page' : 'fallback (' + w.selfRecord.reason + ')'));
  }
  if (!d.wake && (d.angle || d.packet)) L.push('- **Write:** pending (stage artifacts only)');
  L.push('');
}

const outPath = path.resolve(ROOT, arg('--out', path.join('output', 'cron-compare', 'digest-' + datestamp + '.md')));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, L.join('\n'));
console.log('digest → ' + path.relative(ROOT, outPath) + ' (' + keys.length + ' desk-cycles, window ' + HOURS + 'h)');
