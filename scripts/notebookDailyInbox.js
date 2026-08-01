#!/usr/bin/env node
/**
 * Local projection for completed NotebookLM daily-news artifacts.
 *
 * This module intentionally has no NotebookLM, Drive, Sheet, or network
 * dependency. It reads the daily job's final local artifacts only and projects
 * a small non-canon surface suitable for the dashboard.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DAILY_ROOT = path.join(ROOT, 'output', 'notebooklm', 'daily');
const MAX_ARTIFACT_BYTES = 1024 * 1024;
const MAX_LIMIT = 7;
const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);

function safeWarning(code) {
  return { code };
}

function isWithin(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(resolvedRoot + path.sep);
}

function readRegularUtf8(root, file) {
  if (!isWithin(root, file)) throw new Error('path escapes daily artifact root');
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('artifact is not a regular file');
  if (stat.size > MAX_ARTIFACT_BYTES) throw new Error('artifact exceeds size limit');
  return fs.readFileSync(file, 'utf8');
}

function readJson(root, file) {
  return JSON.parse(readRegularUtf8(root, file));
}

function validDriveLink(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && DRIVE_HOSTS.has(parsed.hostname) ? parsed.href : null;
  } catch (_) {
    return null;
  }
}

function validFreshness(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

function projectRun(dailyRoot, cycleName, hashName) {
  const cycleMatch = /^c([1-9]\d*)$/.exec(cycleName);
  if (!cycleMatch || !/^[a-f0-9]{12}$/i.test(hashName)) {
    throw new Error('unexpected daily artifact directory');
  }
  const cycle = Number(cycleMatch[1]);
  const runDir = path.join(dailyRoot, cycleName, hashName);
  if (!isWithin(dailyRoot, runDir)) throw new Error('run directory escapes daily root');
  const runStat = fs.lstatSync(runDir);
  if (!runStat.isDirectory() || runStat.isSymbolicLink()) throw new Error('run is not a real directory');

  const manifest = readJson(dailyRoot, path.join(runDir, 'manifest.json'));
  const brief = readJson(dailyRoot, path.join(runDir, 'daily-brief.json'));
  const briefMarkdown = readRegularUtf8(dailyRoot, path.join(runDir, 'daily-brief.md'));
  if (!manifest || manifest.artifactClass !== 'NLM_DAILY_RUN' ||
      manifest.canonStatus !== 'NOT_CANON' || manifest.cycle !== cycle ||
      !Array.isArray(manifest.sourceIds) || manifest.sourceIds.length === 0 ||
      typeof manifest.packHash !== 'string' || !manifest.packHash.toLowerCase().startsWith(hashName.toLowerCase())) {
    throw new Error('manifest is incomplete or has canon-status drift');
  }
  if (!briefMarkdown.includes('Canon status: NOT CANON.')) {
    throw new Error('brief has canon-status drift');
  }
  if (!brief || typeof brief.answer !== 'string' || !brief.answer.trim() || !Array.isArray(brief.sources_used)) {
    throw new Error('daily brief is incomplete');
  }
  const generatedAt = validFreshness(manifest.generatedAt);
  if (!generatedAt) throw new Error('manifest has no valid artifact freshness');

  const item = {
    cycle,
    generatedAt,
    answer: brief.answer.trim(),
    citationCount: brief.sources_used.length,
    canonStatus: 'NOT_CANON',
  };
  const driveLink = validDriveLink(manifest.driveLink);
  if (driveLink) item.driveLink = driveLink;
  return item;
}

function readDailyInbox(options = {}) {
  const dailyRoot = path.resolve(options.dailyRoot || DEFAULT_DAILY_ROOT);
  const limit = options.limit == null ? 1 : options.limit;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error('limit must be an integer from 1 to ' + MAX_LIMIT);
  }
  if (!fs.existsSync(dailyRoot)) return { items: [], warnings: [] };
  const rootStat = fs.lstatSync(dailyRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('daily artifact root is not a real directory');
  }

  const items = [];
  const warnings = [];
  for (const cycleEntry of fs.readdirSync(dailyRoot, { withFileTypes: true })) {
    if (!cycleEntry.isDirectory() || cycleEntry.isSymbolicLink() || !/^c[1-9]\d*$/.test(cycleEntry.name)) continue;
    const cycleDir = path.join(dailyRoot, cycleEntry.name);
    for (const runEntry of fs.readdirSync(cycleDir, { withFileTypes: true })) {
      if (!runEntry.isDirectory() || runEntry.isSymbolicLink()) continue;
      try {
        items.push(projectRun(dailyRoot, cycleEntry.name, runEntry.name));
      } catch (_) {
        warnings.push(safeWarning('notebook_daily_artifact_rejected'));
      }
    }
  }
  items.sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt) || b.cycle - a.cycle);
  return { items: items.slice(0, limit), warnings };
}

module.exports = {
  DEFAULT_DAILY_ROOT,
  MAX_LIMIT,
  validDriveLink,
  projectRun,
  readDailyInbox,
};
