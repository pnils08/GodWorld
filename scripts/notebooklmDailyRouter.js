#!/usr/bin/env node
'use strict';

/**
 * pipeline.51 Phase 6 — deterministic Daily News branch router.
 *
 * This module is local-only. It reads existing newsroom artifacts, never calls
 * a model, and never writes NotebookLM, Drive, Sheets, canon, or cron state.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const s344Slots = require('./s344HumanSlots');

const ROOT = path.resolve(__dirname, '..');
const ROUTER_VERSION = 'NLM-DAILY-ROUTER/1';
const PROFILES = Object.freeze({
  CYCLE_OPEN: 'CYCLE_OPEN',
  REPORTED_DAY: 'REPORTED_DAY',
  VERIFIED_OPPOSITION: 'VERIFIED_OPPOSITION',
  QUIET_DESK: 'QUIET_DESK',
});
const RHEA_DISPOSITIONS = Object.freeze({
  PASSED: 'passed',
  RHEA_FLAGGED: 'rhea-flagged',
  NEVER_GATED: 'never-gated',
});

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function cycleFromArtifact(file, data) {
  const direct = Number(data && data.cycle);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const match = path.basename(file).match(/_c(\d+)(?:_|\.|-)/i);
  return match ? Number(match[1]) : null;
}

function withinRoot(root, file) {
  const rel = path.relative(root, file);
  return rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = stableValue(value[key]);
    return out;
  }, {});
}

function fingerprint(value) {
  return sha256(JSON.stringify(stableValue(value)));
}

function latest(files) {
  return files.slice().sort((a, b) => b.mtimeMs - a.mtimeMs || a.file.localeCompare(b.file))[0] || null;
}

function fileRecord(file, root) {
  return {
    file,
    relativePath: path.relative(root, file),
    mtimeMs: fs.statSync(file).mtimeMs,
    data: readJsonSafe(file),
  };
}

function verifiedStagedRecord(sidecarFile, root = ROOT) {
  const sidecar = readJsonSafe(sidecarFile);
  if (!sidecar || sidecar.status !== 'staged' || !sidecar.rhea || sidecar.rhea.pass !== true) {
    return { ok: false, reason: 'missing-exact-rhea-pass', sidecar: path.relative(root, sidecarFile) };
  }
  const articlePath = path.resolve(root, String(sidecar.article || ''));
  if (!withinRoot(root, articlePath) || !fs.existsSync(articlePath) || path.extname(articlePath) !== '.md') {
    return { ok: false, reason: 'missing-staged-article', sidecar: path.relative(root, sidecarFile) };
  }
  const body = fs.readFileSync(articlePath, 'utf8');
  const actualHash = sha256(body);
  if (!sidecar.rhea.draftSha256 || sidecar.rhea.draftSha256 !== actualHash) {
    return { ok: false, reason: 'stale-or-missing-rhea-hash', sidecar: path.relative(root, sidecarFile) };
  }
  return {
    ok: true,
    cycle: cycleFromArtifact(sidecarFile, sidecar),
    desk: sidecar.desk || null,
    persona: sidecar.persona || null,
    byline: sidecar.byline || null,
    bylinePopid: sidecar.bylinePopid || null,
    articlePath: path.relative(root, articlePath),
    sidecarPath: path.relative(root, sidecarFile),
    rheaPath: sidecar.rhea.verdict || null,
    draftSha256: actualHash,
    stagedAt: sidecar.stagedAt || null,
  };
}

function packetQuotes(packet) {
  if (!packet || !packet.packetContract || !Array.isArray(packet.quotes)) return [];
  return packet.quotes.filter((quote) => {
    const factIds = quote && quote.claims && quote.claims.factIds;
    return quote && quote.name && quote.pop && quote.quote && Array.isArray(factIds) && factIds.length > 0 &&
      s344Slots.tribuneAsActorHits(String(quote.quote)).length === 0;
  }).map((quote) => ({
    name: String(quote.name),
    popid: String(quote.pop),
    quote: String(quote.quote),
    factIds: quote.claims.factIds.map(String),
    basis: quote.claims.basis || null,
  }));
}

function chaseFromAngle(angle) {
  const chase = angle && angle.angleRead && angle.angleRead.plan && angle.angleRead.plan.chase;
  return typeof chase === 'string' && chase.trim() ? chase.trim() : null;
}

function assignmentHeadline(angle) {
  const story = angle && angle.assignment && angle.assignment.story;
  return story ? String(story.angle || story.label || '').trim() || null : null;
}

function findingCount(data) {
  if (!data || typeof data !== 'object') return 0;
  return ['flags', 'issues', 'findings', 'contamination'].reduce((sum, key) =>
    sum + (Array.isArray(data[key]) ? data[key].length : 0), 0);
}

function wakeDisposition(wake, staged) {
  if (!wake || wake.disposition === 'ungated-sample') return null;
  if (wake.disposition === 'staged' && wake.rheaPass === true && staged && staged.ok &&
      String(wake.article || '') === staged.articlePath) {
    return RHEA_DISPOSITIONS.PASSED;
  }
  if (wake.disposition === 'flagged' && wake.rheaPass === false) {
    return RHEA_DISPOSITIONS.RHEA_FLAGGED;
  }
  if (wake.disposition === 'flagged' && wake.rheaPass == null) {
    return RHEA_DISPOSITIONS.NEVER_GATED;
  }
  return null;
}

function collectNewsroomPulse(options) {
  const root = path.resolve(options.root || ROOT);
  const compareDir = path.join(root, 'output', 'cron-compare');
  const cycle = Number(options.cycle);
  const hours = Number(options.hours || 36);
  const nowMs = Number(options.nowMs || Date.now());
  const cutoff = nowMs - hours * 3600e3;
  if (!Number.isInteger(cycle) || cycle < 1) throw new Error('pulse cycle must be a positive integer');

  const topFiles = fs.existsSync(compareDir)
    ? fs.readdirSync(compareDir).map((name) => path.join(compareDir, name))
      .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile())
      .filter((file) => fs.statSync(file).mtimeMs >= cutoff)
    : [];
  const records = topFiles.map((file) => fileRecord(file, root));
  const angles = records.filter((record) => /_angle\.json$/.test(record.file) &&
    cycleFromArtifact(record.file, record.data) === cycle);
  const packets = records.filter((record) => /_packet\.json$/.test(record.file) &&
    cycleFromArtifact(record.file, record.data) === cycle);
  const asks = records.filter((record) => /_asks\.json$/.test(record.file) &&
    cycleFromArtifact(record.file, record.data) === cycle);
  const wakes = records.filter((record) => /\.wake\.json$/.test(record.file) &&
    cycleFromArtifact(record.file, record.data) === cycle);
  const rheas = records.filter((record) => /\.rhea\.json$/.test(record.file) &&
    cycleFromArtifact(record.file, record.data) === cycle);

  const stagedRecords = walkFiles(path.join(compareDir, 'staged'))
    .filter((file) => file.endsWith('.staged.json') && fs.statSync(file).mtimeMs >= cutoff)
    .map((file) => ({ file, mtimeMs: fs.statSync(file).mtimeMs, proof: verifiedStagedRecord(file, root) }));
  const verified = stagedRecords.filter((record) => record.proof.ok);
  const currentFilings = verified.filter((record) => record.proof.cycle === cycle)
    .map((record) => record.proof).sort((a, b) => a.articlePath.localeCompare(b.articlePath));
  const priorCycles = verified.map((record) => record.proof.cycle)
    .filter((value) => Number.isInteger(value) && value < cycle);
  const priorCompletedCycle = priorCycles.length ? Math.max(...priorCycles) : null;
  const previousFilings = priorCompletedCycle == null ? [] : verified
    .filter((record) => record.proof.cycle === priorCompletedCycle)
    .map((record) => record.proof).sort((a, b) => a.articlePath.localeCompare(b.articlePath));

  const flaggedRecords = walkFiles(path.join(compareDir, 'flagged'))
    .filter((file) => file.endsWith('.flags.json') && fs.statSync(file).mtimeMs >= cutoff)
    .map((file) => fileRecord(file, root))
    .filter((record) => cycleFromArtifact(record.file, record.data) === cycle);

  const fanoutRotation = latest(records.filter((record) =>
    /^fanout-\d{4}-\d{2}-\d{2}\.json$/.test(path.basename(record.file)) &&
    cycleFromArtifact(record.file, record.data) === cycle));
  const fanoutDate = fanoutRotation && fanoutRotation.data && fanoutRotation.data.date;
  const fanoutResults = fanoutDate ? records.filter((record) =>
    path.basename(record.file).startsWith('fanout-' + fanoutDate + '.') &&
    path.basename(record.file).endsWith('.results.json')) : [];

  const assignments = angles.map((angleRecord) => {
    const base = path.basename(angleRecord.file).replace(/angle\.json$/, '');
    const packetRecord = latest(packets.filter((record) => path.basename(record.file) === base + 'packet.json'));
    const askRecord = latest(asks.filter((record) => path.basename(record.file) === base + 'asks.json'));
    const wakeRecord = latest(wakes.filter((record) => path.basename(record.file).startsWith(base)));
    const stagedRecord = latest(stagedRecords.filter((record) =>
      record.proof.cycle === cycle && path.basename(record.file).startsWith(base)));
    const flagRecord = latest(flaggedRecords.filter((record) => path.basename(record.file).startsWith(base)));
    const rheaRecord = latest(rheas.filter((record) => path.basename(record.file).startsWith(base)));
    const staged = stagedRecord ? stagedRecord.proof : null;
    const disposition = wakeDisposition(wakeRecord && wakeRecord.data, staged);
    const quotes = packetQuotes(packetRecord && packetRecord.data);
    return {
      key: base.replace(/_$/, ''),
      desk: angleRecord.data && angleRecord.data.desk || null,
      reporter: angleRecord.data && angleRecord.data.reporter || null,
      headline: assignmentHeadline(angleRecord.data),
      chase: chaseFromAngle(angleRecord.data),
      anglePath: angleRecord.relativePath,
      askPath: askRecord ? askRecord.relativePath : null,
      packetPath: packetRecord ? packetRecord.relativePath : null,
      wakePath: wakeRecord ? wakeRecord.relativePath : null,
      rheaPath: rheaRecord ? rheaRecord.relativePath : staged && staged.rheaPath || null,
      flagPath: flagRecord ? flagRecord.relativePath : null,
      articlePath: staged && staged.ok ? staged.articlePath : null,
      disposition,
      rheaFlagCount: wakeRecord && wakeRecord.data && Number(wakeRecord.data.rheaFlagCount || 0),
      flagFindingCount: flagRecord ? findingCount(flagRecord.data) : 0,
      quotes,
    };
  }).sort((a, b) => a.key.localeCompare(b.key));

  // Count dispositions from the wake set, not from flagged/ alone. S344 can
  // skip Rhea, and a stale verdict file may still exist for the same stem.
  const dispositionRows = wakes.map((wakeRecord) => {
    const base = path.basename(wakeRecord.file).replace(/\.wake\.json$/, '');
    const stagedRecord = latest(stagedRecords.filter((record) =>
      record.proof.cycle === cycle && path.basename(record.file).startsWith(base)));
    const flagRecord = latest(flaggedRecords.filter((record) => path.basename(record.file).startsWith(base)));
    const rheaRecord = latest(rheas.filter((record) => path.basename(record.file).startsWith(base)));
    return {
      wakePath: wakeRecord.relativePath,
      disposition: wakeDisposition(wakeRecord.data, stagedRecord && stagedRecord.proof),
      rheaFlagCount: wakeRecord.data && wakeRecord.data.rheaFlagCount || 0,
      flagFindingCount: flagRecord ? findingCount(flagRecord.data) : 0,
      flagPath: flagRecord ? flagRecord.relativePath : null,
      rheaPath: rheaRecord ? rheaRecord.relativePath : null,
    };
  }).filter((row) => row.disposition);

  const dispositionCounts = {
    passed: dispositionRows.filter((row) => row.disposition === RHEA_DISPOSITIONS.PASSED).length,
    rheaFlagged: dispositionRows.filter((row) => row.disposition === RHEA_DISPOSITIONS.RHEA_FLAGGED).length,
    neverGated: dispositionRows.filter((row) => row.disposition === RHEA_DISPOSITIONS.NEVER_GATED).length,
  };
  const pulse = {
    version: ROUTER_VERSION,
    cycle,
    priorCompletedCycle,
    cycleChanged: priorCompletedCycle != null && priorCompletedCycle < cycle,
    fanout: {
      rotationPath: fanoutRotation ? fanoutRotation.relativePath : null,
      resultPaths: fanoutResults.map((record) => record.relativePath).sort(),
    },
    assignments,
    filings: { current: currentFilings, previous: previousFilings },
    dispositions: dispositionRows,
    counts: {
      angles: assignments.length,
      asks: assignments.filter((assignment) => assignment.askPath).length,
      fanoutAssignments: fanoutRotation && Array.isArray(fanoutRotation.data.assignments)
        ? fanoutRotation.data.assignments.length
        : 0,
      w2Ready: assignments.filter((assignment) => assignment.quotes.length > 0).length,
      quotes: assignments.reduce((sum, assignment) => sum + assignment.quotes.length, 0),
      passed: dispositionCounts.passed,
      rheaFlagged: dispositionCounts.rheaFlagged,
      neverGated: dispositionCounts.neverGated,
      flagged: dispositionCounts.rheaFlagged + dispositionCounts.neverGated,
      pending: assignments.filter((assignment) => !assignment.wakePath).length,
    },
  };
  pulse.fingerprint = fingerprint({
    version: pulse.version,
    cycle: pulse.cycle,
    priorCompletedCycle: pulse.priorCompletedCycle,
    fanout: pulse.fanout,
    assignments: pulse.assignments,
    filings: pulse.filings,
    dispositions: pulse.dispositions,
    counts: pulse.counts,
  });
  return pulse;
}

function sectionHasContent(text, heading) {
  const lines = String(text || '').split('\n');
  const start = lines.findIndex((line) => line.trim() === '## ' + heading);
  if (start === -1) return false;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) { end = i; break; }
  }
  const body = lines.slice(start + 1, end).join('\n').trim();
  return Boolean(body && !/^_(?:No|None)\b/i.test(body));
}

function detectMaterialSignals(worldSummary) {
  const text = String(worldSummary || '');
  const signals = [];
  if (/\*\*Cycle Weight:\*\*\s*high-signal\b/i.test(text)) signals.push('WORLD_HIGH_SIGNAL');
  if (/\*\*Shock:\*\*\s*shock-flag\b/i.test(text)) signals.push('WORLD_SHOCK');
  if (sectionHasContent(text, 'Civic Decisions')) signals.push('CIVIC_DECISIONS');
  if (/^### High-Severity Patterns\s*$[\s\S]*?(?:^- |^\d+\.|^\|)/m.test(text)) {
    signals.push('ENGINE_HIGH_SEVERITY');
  }
  return signals;
}

function sourceClasses(inventory, materialSignals) {
  const classes = ['WORLD_STATE'];
  if (inventory.hasCitizenDigest) classes.push('CITIZEN_DIGEST');
  if ((inventory.counts && inventory.counts.angles) > 0) classes.push('W1_CHASE');
  if ((inventory.counts && inventory.counts.quotes) > 0) classes.push('W2_QUOTES');
  if ((inventory.counts && inventory.counts.passed) > 0) classes.push('W3_PASSED');
  if (inventory.filings && inventory.filings.previous && inventory.filings.previous.length) {
    classes.push('PREVIOUS_FILING');
  }
  if ((inventory.counts && (inventory.counts.rheaFlagged + inventory.counts.neverGated)) > 0) {
    classes.push('FLAGGED_DISPOSITION');
  }
  if (materialSignals.length) classes.push('ENGINE_CIVIC_SIGNAL');
  return classes;
}

function routeDailyNews(inventory, options = {}) {
  const counts = inventory.counts || {};
  const passed = Number(counts.passed || 0);
  const materialSignals = Array.isArray(inventory.materialSignals) ? inventory.materialSignals.slice().sort() : [];
  const threshold = Number(options.reportedDayThreshold);
  const thresholdConfigured = Number.isInteger(threshold) && threshold > 0;
  const opposition = inventory.provenOpposition === true;
  let profile;
  const reasonCodes = [];

  if (opposition) {
    profile = PROFILES.VERIFIED_OPPOSITION;
    reasonCodes.push('PACKET_OPPOSITION_PROVEN');
  } else if (thresholdConfigured && passed >= threshold) {
    profile = PROFILES.REPORTED_DAY;
    reasonCodes.push('RHEA_PASSED_' + passed);
    reasonCodes.push('REPORTED_THRESHOLD_MET_' + threshold);
  } else if (inventory.cycleChanged || Number(counts.angles || 0) > 0 ||
      passed > 0 ||
      Number(counts.rheaFlagged || 0) > 0 || Number(counts.neverGated || 0) > 0 ||
      materialSignals.length > 0) {
    profile = PROFILES.CYCLE_OPEN;
    if (inventory.cycleChanged) reasonCodes.push('NEW_CYCLE_WITHOUT_REPORTED_THRESHOLD');
    if (passed > 0 && thresholdConfigured) reasonCodes.push('REPORTED_THRESHOLD_NOT_MET_' + threshold);
    if (passed > 0 && !thresholdConfigured) reasonCodes.push('REPORTED_THRESHOLD_UNSET_OBSERVE_ONLY');
    if (Number(counts.angles || 0) > 0) reasonCodes.push('W1_ACTIVE_' + Number(counts.angles));
    if (Number(counts.rheaFlagged || 0) > 0) reasonCodes.push('RHEA_FLAGGED_' + Number(counts.rheaFlagged));
    if (Number(counts.neverGated || 0) > 0) reasonCodes.push('NEVER_GATED_' + Number(counts.neverGated));
    reasonCodes.push(...materialSignals);
  } else {
    profile = PROFILES.QUIET_DESK;
    reasonCodes.push('NO_MATERIAL_NEWSROOM_SIGNAL');
  }

  const presentation = {
    [PROFILES.CYCLE_OPEN]: { format: 'brief', length: 'short' },
    [PROFILES.REPORTED_DAY]: { format: 'deep_dive', length: 'default' },
    [PROFILES.VERIFIED_OPPOSITION]: { format: 'debate', length: 'default' },
    [PROFILES.QUIET_DESK]: { format: 'brief', length: 'short' },
  }[profile];
  const result = {
    version: ROUTER_VERSION,
    mode: 'shadow',
    profile,
    format: presentation.format,
    length: presentation.length,
    activationEligible: profile !== PROFILES.REPORTED_DAY || thresholdConfigured,
    reportedDayThreshold: thresholdConfigured ? threshold : null,
    sourceClasses: sourceClasses(inventory, materialSignals),
    reasonCodes: Array.from(new Set(reasonCodes)),
    dispositionCounts: {
      passed,
      rheaFlagged: Number(counts.rheaFlagged || 0),
      neverGated: Number(counts.neverGated || 0),
    },
  };
  result.fingerprint = fingerprint(result);
  return result;
}

module.exports = {
  ROUTER_VERSION,
  PROFILES,
  RHEA_DISPOSITIONS,
  fingerprint,
  verifiedStagedRecord,
  packetQuotes,
  chaseFromAngle,
  collectNewsroomPulse,
  detectMaterialSignals,
  routeDailyNews,
};
