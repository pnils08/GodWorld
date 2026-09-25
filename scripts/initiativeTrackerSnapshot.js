#!/usr/bin/env node
'use strict';

/**
 * Rebuild output/initiative_tracker.json from engine_audit snapshots.Initiative_Tracker.
 * Same field map as scripts/buildInitiativePackets.js (sheet-backed refresh).
 * Civic cron mustJson this file; missing it has killed Mon–Thu datawakes.
 *
 *   node scripts/initiativeTrackerSnapshot.js [--cycle 103]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

// One field map for every tracker copy (engine_audit snapshot or the live tab).
// The stage fields ride along so a reader never sees a row that does not know
// stages exist; `state` is the same line the seat board shows (lib stageRequirement).
function stageState(init) {
  try {
    const { stageRequirement } = require('../lib/initiativePhaseContract');
    const r = stageRequirement({ stage: init.Stage, phase: init.ImplementationPhase, policyDomain: init.PolicyDomain,
      lastWorkCycle: init.LastWorkCycle, lastStageChangeCycle: init.LastStageChangeCycle, opensCycle: init.OpensCycle });
    return r ? r.text : null;
  } catch (_) { return null; }
}
const num = v => (v === '' || v === null || v === undefined || !isFinite(Number(v))) ? null : Number(v);

function fromAuditRows(rows, updatedBy) {
  return {
    lastUpdated: new Date().toISOString().split('T')[0],
    updatedBy: updatedBy || 'initiativeTrackerSnapshot.js (engine_audit snapshot)',
    initiatives: (rows || []).map(init => ({
      id: init.InitiativeID,
      name: init.Name || init.InitiativeName || '',
      keywords: String(init.Keywords || '').split(',').map(k => k.trim()).filter(Boolean),
      status: init.Status || 'UNKNOWN',
      voteCycle: init.VoteCycle ? parseInt(init.VoteCycle, 10) : null,
      vote: init.Outcome || null,
      budget: init.Budget || null,
      domain: init.PolicyDomain || null,
      neighborhoods: String(init.AffectedNeighborhoods || '').split(',').map(n => n.trim()).filter(Boolean),
      implementation: {
        status: String(init.ImplementationPhase || 'untracked').toLowerCase(),
        phase: String(init.ImplementationPhase || 'untracked').toLowerCase(),
        summary: init.MilestoneNotes || '',
        nextScheduledAction: init.NextScheduledAction || null,
        nextActionCycle: init.NextActionCycle ? parseInt(init.NextActionCycle, 10) : null,
      },
      stage: init.Stage || null,
      state: stageState(init),
      opensCycle: num(init.OpensCycle),
      lastStageChangeCycle: num(init.LastStageChangeCycle),
      lastWorkCycle: num(init.LastWorkCycle),
      budgetRemaining: num(init.BudgetRemaining),
    })),
  };
}

function loadOrRebuild(cycle) {
  const outPath = path.join(ROOT, 'output', 'initiative_tracker.json');
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    if (existing && Array.isArray(existing.initiatives) && existing.initiatives.length) {
      return existing;
    }
  } catch (_) { /* rebuild */ }
  writeFromAudit(cycle);
  return JSON.parse(fs.readFileSync(outPath, 'utf8'));
}

function writeFromAudit(cycle) {
  const auditPath = path.join(ROOT, 'output', 'engine_audit_c' + cycle + '.json');
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const rows = audit && audit.snapshots && audit.snapshots.Initiative_Tracker;
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('no snapshots.Initiative_Tracker in ' + path.relative(ROOT, auditPath));
  }
  const tracker = fromAuditRows(rows);
  const outPath = path.join(ROOT, 'output', 'initiative_tracker.json');
  fs.writeFileSync(outPath, JSON.stringify(tracker, null, 2) + '\n');
  return { outPath, count: tracker.initiatives.length, cycle };
}

// The daily/hourly refresh (called by the civic tick). The tracker moves between
// fires — the tick folds seat moves onto it, the engine fires Sunday, a hand edit
// lands any day — but the two disk copies were written only at cycle time, so a
// weekday pack read last Sunday's rows. This re-reads the live tab and rewrites
// both copies. Guard: only while the beats dump is stamped with the current
// cycle; right after a fire, before dumpBeatTabs runs, the other beat tabs still
// hold the prior cycle and this must not make the dump look newer than it is.
async function refreshFromLive(opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const beatsDir = path.join(root, 'output', 'beats');
  const meta = JSON.parse(fs.readFileSync(path.join(beatsDir, 'meta.json'), 'utf8'));
  if (Number(meta.cycle) !== Number(o.cycle)) {
    return { refreshed: false, reason: 'beats dump at c' + meta.cycle + ', current c' + o.cycle + ' — waiting for the cycle dump' };
  }
  const sheets = o.sheets || require('../lib/sheets');
  const rows = await sheets.getSheetAsObjects('Initiative_Tracker');
  if (!Array.isArray(rows) || !rows.length) throw new Error('Initiative_Tracker read returned no rows');
  const write = (p, text) => { const tmp = p + '.tmp'; fs.writeFileSync(tmp, text); fs.renameSync(tmp, p); };
  write(path.join(beatsDir, 'Initiative_Tracker.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  write(path.join(root, 'output', 'initiative_tracker.json'),
    JSON.stringify(fromAuditRows(rows, 'initiativeTrackerSnapshot.js (live tab, civic tick ' + new Date().toISOString() + ')'), null, 2) + '\n');
  return { refreshed: true, rows: rows.length };
}

module.exports = { fromAuditRows, writeFromAudit, loadOrRebuild, refreshFromLive, stageState };

if (require.main === module) {
  const cycle = arg('--cycle', null) || require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ noArgv: true });
  const r = writeFromAudit(cycle);
  console.log('initiative_tracker.json ← engine_audit_c' + r.cycle + '.json (' + r.count + ' initiatives)');
}
