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

function fromAuditRows(rows) {
  return {
    lastUpdated: new Date().toISOString().split('T')[0],
    updatedBy: 'initiativeTrackerSnapshot.js (engine_audit snapshot)',
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
    })),
  };
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

module.exports = { fromAuditRows, writeFromAudit };

if (require.main === module) {
  const cycle = arg('--cycle', null) || require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ noArgv: true });
  const r = writeFromAudit(cycle);
  console.log('initiative_tracker.json ← engine_audit_c' + r.cycle + '.json (' + r.count + ' initiatives)');
}
