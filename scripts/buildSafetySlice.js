#!/usr/bin/env node
/** Disk-first Public Safety slice for Sgt. Rachel Torres (POP-00057). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const APPROACH = 'Measured public-safety approach: choose one packet-backed incident, classification gap, or OARI response question. Third-person only. Use supplied names, places, dates, and numbers; do not invent officers, cases, quotes, crime waves, or public fear.';
function loadJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }
function arg(flag, def) { const i = process.argv.indexOf(flag); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }
function paths(cycle, root = ROOT) { return { json: path.join(root, 'output', 'cron-compare', `safety_slice_c${cycle}.json`), md: path.join(root, 'output', 'slices', `c${cycle}`, 'rachel-torres.md') }; }
function candidatesFor(row, root) {
  const snap = path.join(root, 'output', 'simulation_ledger_snapshot.jsonl');
  const byPop = new Map();
  try { for (const line of fs.readFileSync(snap, 'utf8').split('\n')) { const x = JSON.parse(line); if (x.POPID) byPop.set(x.POPID, x); } } catch (_) {}
  return (row.popids || []).slice(0, 6).map(pop => { const x = byPop.get(pop) || {}; return { popid: pop, name: x.Name || null, role: x.RoleType || null, neighborhood: x.Neighborhood || row.hood || null, why: 'supplied by civic safety signal' }; });
}
function buildSafetySlice(cycle, { root = ROOT } = {}) {
  const signal = loadJson(path.join(root, 'output', `desk_signal_c${cycle}.json`));
  const lane = signal && (signal.lanes && signal.lanes.civic || signal.civic) || [];
  const rows = lane.filter(row => /crimeindex|crime|safety|police|oari|alternative response|incident|classification|response/i.test(JSON.stringify(row)));
  if (!rows.length) return { version: 'SAFETY-SLICE-1', cycle: Number(cycle), kind: 'public-safety', empty: true, approach: APPROACH, candidates: [] };
  const row = rows.slice().sort((a, b) => (b.kind === 'initiative') - (a.kind === 'initiative'))[0];
  const label = row.label || row.handle && row.handle.angle || 'Public-safety signal requires record review';
  const angle = row.handle && row.handle.angle || label;
  const hook = row.handle && row.handle.hookLine || 'The record leaves a public-safety response or classification question open.';
  const candidates = candidatesFor(row, root);
  const anchorFacts = [label, row.ref, row.hood && `Supplied area: ${row.hood}`].filter(Boolean);
  return {
    version: 'SAFETY-SLICE-1', cycle: Number(cycle), kind: 'public-safety', empty: false,
    approach: APPROACH, story: { kind: 'public-safety', angle, label, hookLine: hook, hood: row.hood || null, ref: row.ref || `desk_signal_c${cycle}` },
    pulse: { className: row.kind || 'safety-signal', label, hood: row.hood || null, source: row.ref || null },
    prewrite: { anchorFacts, classificationNote: /crimeindex|classification/i.test(label) ? label : null, practicalClose: 'State what the supplied record does and does not establish.', missing: ['officer names, case details, quotes, and response metrics unless supplied'] },
    candidates, pointers: [row.ref || `output/desk_signal_c${cycle}.json`],
    scene: { colorRoom: 'Use only restrained, unnamed scene texture; it carries no incident fact, quote, or public sentiment.' }
  };
}
function formatSafetySliceMarkdown(slice) { return `# Sgt. Rachel Torres Safety Slice — C${slice.cycle}\n\n- Kind: public-safety\n- Signal: ${slice.story ? slice.story.label : 'empty'}\n- Approach: ${slice.approach}\n- Candidates: ${(slice.candidates || []).map(x => `${x.name || 'unknown'} (${x.popid})`).join('; ') || 'none'}\n`; }
function writeSafetySlice(cycle, slice, root = ROOT) { const p = paths(cycle, root); fs.mkdirSync(path.dirname(p.json), { recursive: true }); fs.mkdirSync(path.dirname(p.md), { recursive: true }); fs.writeFileSync(p.json, JSON.stringify(slice, null, 2)); fs.writeFileSync(p.md, formatSafetySliceMarkdown(slice)); return p; }
function loadSafetySlice(cycle, root = ROOT) { const j = loadJson(paths(cycle, root).json); if (j) return j; const s = buildSafetySlice(cycle, { root }); if (!s.empty) writeSafetySlice(cycle, s, root); return s; }
function assignmentFromSlice(slice) { if (!slice || slice.empty) return null; return { desk: 'civic', name: 'Sgt. Rachel Torres', popid: 'POP-00057', beatDomain: 'SAFETY', persona: 'rachel-torres', approach: slice.approach, story: slice.story, safetySlice: true, pulse: slice.pulse, prewrite: slice.prewrite }; }
if (require.main === module) { const cycle = arg('--cycle'); if (!cycle) { console.error('buildSafetySlice: pass --cycle N'); process.exit(1); } const s = buildSafetySlice(cycle); const p = writeSafetySlice(cycle, s); console.log(`safety slice c${cycle}${s.empty ? ' EMPTY' : ' signal=' + s.pulse.className + ' candidates=' + s.candidates.length}`); console.log('→ ' + path.relative(ROOT, p.md)); }
module.exports = { buildSafetySlice, writeSafetySlice, loadSafetySlice, formatSafetySliceMarkdown, assignmentFromSlice, paths, APPROACH };
