#!/usr/bin/env node
/**
 * engineAuditor.js — Phase 38.1 + 38.7 + 38.8
 *
 * Reads world state via service account, runs deterministic detectors, and
 * writes three output files per cycle:
 *   - output/engine_audit_c{XX}.json      — ailments (38.1)
 *   - output/engine_anomalies_c{XX}.json  — anomalies (38.7)
 *   - output/baseline_briefs_c{XX}.json   — per-event baseline briefs (38.8)
 *
 * No LLM calls, no narrative framing. Mags's /engine-review skill consumes
 * the JSON and produces the seven-field briefs.
 *
 * Plan: docs/engine/PHASE_38_PLAN.md
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const DETECTOR_VERSION = '1.0.0';

const ailmentDetectors = {
  detectStuckInitiatives: require('./engine-auditor/detectStuckInitiatives'),
  detectRepeatingEvents: require('./engine-auditor/detectRepeatingEvents'),
  detectMathImbalances: require('./engine-auditor/detectMathImbalances'),
  detectCascadeFailures: require('./engine-auditor/detectCascadeFailures'),
  detectWritebackDrift: require('./engine-auditor/detectWritebackDrift'),
  detectProductionImbalance: require('./engine-auditor/detectProductionImbalance'),
  detectImprovements: require('./engine-auditor/detectImprovements'),
  detectIncoherence: require('./engine-auditor/detectIncoherence'),
};

const anomalyDetector = require('./engine-auditor/detectAnomalies');
const baselineBriefs = require('./engine-auditor/generateBaselineBriefs');

const enrichers = [
  { name: 'checkMitigators', module: require('./engine-auditor/checkMitigators') },
  { name: 'recommendRemedy', module: require('./engine-auditor/recommendRemedy') },
  { name: 'generateTribuneFraming', module: require('./engine-auditor/generateTribuneFraming') },
  { name: 'measureRemedies', module: require('./engine-auditor/measureRemedies') },
];

const SHEETS_TO_READ = [
  'Riley_Digest',
  'Initiative_Tracker',
  'Neighborhood_Map',
  'WorldEvents_V3_Ledger',
  'Civic_Office_Ledger',
  'Population_Stats',
  'World_Population',
  'Crime_Metrics',
  'Transit_Metrics',
  'Edition_Coverage_Ratings',
  'Event_Arc_Ledger',
  'Storyline_Tracker',
  'Simulation_Ledger',
  'LifeHistory_Log',  // S184 (Row 6): citizen life events for baseline-brief subject attribution
];

async function getCurrentCycle() {
  if (process.env.ENGINE_AUDITOR_CYCLE_OVERRIDE) {
    return parseInt(process.env.ENGINE_AUDITOR_CYCLE_OVERRIDE, 10);
  }
  const configData = await sheets.getSheetAsObjects('World_Config');
  const row = configData.find(r => r.Key === 'cycleCount');
  if (!row) throw new Error('cycleCount not found in World_Config');
  return parseInt(row.Value, 10);
}

async function loadSnapshot() {
  const results = await Promise.all(
    SHEETS_TO_READ.map(async (name) => {
      try {
        const data = await sheets.getSheetAsObjects(name);
        return [name, data];
      } catch (err) {
        console.warn(`  warn: ${name} read failed — ${err.message}`);
        return [name, []];
      }
    })
  );
  return Object.fromEntries(results);
}

function loadPreviousAudits(cycle, outputDir, count = 6) {
  const prior = [];
  for (let i = 1; i <= count; i++) {
    const p = path.join(outputDir, `engine_audit_c${cycle - i}.json`);
    if (fs.existsSync(p)) {
      try {
        prior.push(JSON.parse(fs.readFileSync(p, 'utf8')));
      } catch (err) {
        console.warn(`  warn: failed to parse ${p}`);
      }
    }
  }
  return prior;
}

function loadPriorFixture() {
  if (!process.env.ENGINE_AUDITOR_PRIOR_FIXTURE) return null;
  const p = process.env.ENGINE_AUDITOR_PRIOR_FIXTURE;
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function summarize(patterns) {
  const summary = {
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    byType: {},
    improvements: 0,
    incoherence: 0,
  };
  for (const p of patterns) {
    if (p.severity === 'high') summary.highSeverity++;
    else if (p.severity === 'medium') summary.mediumSeverity++;
    else if (p.severity === 'low') summary.lowSeverity++;
    summary.byType[p.type] = (summary.byType[p.type] || 0) + 1;
    if (p.type === 'improvement') summary.improvements++;
    if (p.type === 'incoherence') summary.incoherence++;
  }
  return summary;
}

function buildCitizenIncomes(ledger) {
  const out = {};
  for (const r of ledger) {
    const id = r.POPID;
    if (!id) continue;
    const inc = parseFloat(r.Income);
    if (!Number.isNaN(inc) && inc > 0) out[id] = inc;
  }
  return out;
}

async function main() {
  const t0 = Date.now();
  console.log('=== Engine Auditor (Phase 38.1 + 38.7 + 38.8) ===\n');

  const cycle = await getCurrentCycle();
  console.log(`Cycle: ${cycle}`);

  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('Reading sheets...');
  const snapshot = await loadSnapshot();
  const prior = loadPreviousAudits(cycle, outputDir);

  const fixturePrior = loadPriorFixture();
  if (fixturePrior) {
    console.log(`  fixture prior injected from ${process.env.ENGINE_AUDITOR_PRIOR_FIXTURE}`);
    prior.unshift(fixturePrior);
  }

  const ctx = { cycle, snapshot, prior };

  console.log('Running ailment detectors (38.1)...');
  const patterns = [];
  const detectorVersions = { engineAuditor: DETECTOR_VERSION };

  for (const [name, detector] of Object.entries(ailmentDetectors)) {
    try {
      const found = detector.detect(ctx) || [];
      for (const p of found) p.detectorVersion = p.detectorVersion || DETECTOR_VERSION;
      patterns.push(...found);
      detectorVersions[name] = detector.version || DETECTOR_VERSION;
      console.log(`  ${name}: ${found.length}`);
    } catch (err) {
      console.error(`  ${name} FAILED: ${err.message}`);
      detectorVersions[name] = 'ERROR';
    }
  }

  console.log('Running enrichers (38.2 + 38.3 + 38.4)...');
  for (const { name, module } of enrichers) {
    try {
      module.enrich(patterns, ctx);
      detectorVersions[name] = module.version || DETECTOR_VERSION;
      console.log(`  ${name}: enriched ${patterns.length} patterns`);
    } catch (err) {
      console.error(`  ${name} FAILED: ${err.message}`);
      detectorVersions[name] = 'ERROR';
    }
  }

  console.log('Running anomaly detector (38.7)...');
  let anomalies = [];
  try {
    anomalies = anomalyDetector.detect(ctx) || [];
    detectorVersions.detectAnomalies = anomalyDetector.version || DETECTOR_VERSION;
    console.log(`  detectAnomalies: ${anomalies.length}`);
  } catch (err) {
    console.error(`  detectAnomalies FAILED: ${err.message}`);
    detectorVersions.detectAnomalies = 'ERROR';
  }

  console.log('Generating baseline briefs (38.8)...');
  let briefs = [];
  try {
    briefs = baselineBriefs.generate(ctx, patterns) || [];
    detectorVersions.generateBaselineBriefs = baselineBriefs.version || DETECTOR_VERSION;
    console.log(`  generateBaselineBriefs: ${briefs.length}`);
  } catch (err) {
    console.error(`  generateBaselineBriefs FAILED: ${err.message}`);
    detectorVersions.generateBaselineBriefs = 'ERROR';
  }

  const persistedSnapshots = {
    Initiative_Tracker: snapshot.Initiative_Tracker || [],
    Neighborhood_Map: snapshot.Neighborhood_Map || [],
    Civic_Office_Ledger: (snapshot.Civic_Office_Ledger || []).map(r => ({
      OfficeId: r.OfficeId, PopId: r.PopId, Holder: r.Holder,
      District: r.District, Approval: r.Approval,
    })),
    Crime_Metrics: snapshot.Crime_Metrics || [],
  };
  const citizenIncomes = buildCitizenIncomes(snapshot.Simulation_Ledger || []);

  const auditOutput = {
    cycle,
    generatedAt: new Date().toISOString(),
    detectorVersions,
    previousCycle: cycle - 1,
    patterns,
    summary: summarize(patterns),
    measurementHistory: ctx.measurementHistory || [],
    snapshots: persistedSnapshots,
    citizenIncomes,
  };
  const auditPath = path.join(outputDir, `engine_audit_c${cycle}.json`);
  fs.writeFileSync(auditPath, JSON.stringify(auditOutput, null, 2));

  const anomaliesOutput = {
    cycle,
    generatedAt: new Date().toISOString(),
    detectorVersion: anomalyDetector.version || DETECTOR_VERSION,
    anomalies,
    summary: {
      total: anomalies.length,
      byTriage: anomalies.reduce((acc, a) => {
        acc[a.triagePath] = (acc[a.triagePath] || 0) + 1;
        return acc;
      }, {}),
    },
  };
  const anomaliesPath = path.join(outputDir, `engine_anomalies_c${cycle}.json`);
  fs.writeFileSync(anomaliesPath, JSON.stringify(anomaliesOutput, null, 2));

  const briefsOutput = {
    cycle,
    generatedAt: new Date().toISOString(),
    generatorVersion: baselineBriefs.version || DETECTOR_VERSION,
    briefs,
    summary: {
      total: briefs.length,
      byEventClass: briefs.reduce((acc, b) => {
        acc[b.eventClass] = (acc[b.eventClass] || 0) + 1;
        return acc;
      }, {}),
      withPromotionHints: briefs.filter(b => b.promotionHints && b.promotionHints.length > 0).length,
    },
  };
  const briefsPath = path.join(outputDir, `baseline_briefs_c${cycle}.json`);
  fs.writeFileSync(briefsPath, JSON.stringify(briefsOutput, null, 2));

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nWrote ${auditPath}`);
  console.log(`Wrote ${anomaliesPath}`);
  console.log(`Wrote ${briefsPath}`);
  console.log(`Ailments: ${patterns.length} | Anomalies: ${anomalies.length} | Briefs: ${briefs.length}`);
  console.log(`Elapsed: ${elapsed}s`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

module.exports = { main };
