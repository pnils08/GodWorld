'use strict';

/* workWakePackages — registry loader/validator for cron-work-wake.js (civic.34).
 *
 * Same contract shape as scripts/newsroomWakePackages.js, but for WORKING citizens:
 * non-district officeholders waking on their day's civic data nodes, and players
 * waking on the sports feed. A citizen must have one active package before any
 * work wake runs. Prompt contracts are inline (no .claude/agents/ persona dirs).
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'work-wake-packages.json');

const DATA_NODES = Object.freeze([
  'hospital-deaths',
  'hospital-admissions',
  'health-cause-queue',
  'crime-metrics',
  'civic-office',
  'cycle-weather',
  'sports-player',
]);

const DUTY_DAYS = Object.freeze(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);

function validatePackage(key, value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) errors.push('must be an object');
  if (value && value.persona !== key) errors.push('persona must equal registry key');
  if (value && value.active !== true && value.active !== false) errors.push('active must be boolean');
  if (value && !/^POP-\d{5}$/.test(String(value.popid || ''))) errors.push('popid must be POP-XXXXX form');
  if (value && !value.name) errors.push('name is required');
  if (value && !value.office) errors.push('office is required');
  if (value && (!Array.isArray(value.dataNodes) || !value.dataNodes.length)) {
    errors.push('dataNodes must be a non-empty array');
  } else if (value) {
    for (const n of value.dataNodes) {
      if (!DATA_NODES.includes(n)) errors.push('unknown dataNode: ' + n);
    }
  }
  if (value && value.dataNodes && value.dataNodes.includes('sports-player') && !value.playerName) {
    errors.push('sports-player dataNode requires playerName');
  }
  const route = value && value.models && value.models.reflect;
  if (!route || route.provider !== 'openrouter' || !String(route.model || '').includes('/')) {
    errors.push('models.reflect requires an explicit OpenRouter model');
  }
  if (value && (!Array.isArray(value.dutyDays) || !value.dutyDays.length ||
      value.dutyDays.some((d) => !DUTY_DAYS.includes(d)))) {
    errors.push('dutyDays must be a non-empty array of ' + DUTY_DAYS.join('/'));
  }
  const pc = value && value.promptContract;
  if (!pc || !pc.roleLine || !pc.voiceNotes) {
    errors.push('promptContract requires roleLine and voiceNotes');
  }
  if (errors.length) throw new Error('invalid work-wake package ' + key + ': ' + errors.join('; '));
  return value;
}

function loadPackages(filePath) {
  const source = filePath || CONFIG_PATH;
  const raw = JSON.parse(fs.readFileSync(source, 'utf8'));
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('_')) continue;
    out[key] = validatePackage(key, value);
  }
  return out;
}

function activePackages(packages) {
  const all = packages || loadPackages();
  return Object.entries(all).filter(([, value]) => value.active).map(([key, value]) => ({ key, value }));
}

// Packages due today (duty-day filter) in LRU order against the state file's
// recent list (most-recent-first). A popid already woken this cycle is excluded
// by the caller's once-per-cycle guard, not here.
function duePackages(packages, dayAbbrev, recent) {
  const seenOrder = Array.isArray(recent) ? recent : [];
  return activePackages(packages)
    .filter(({ value }) => value.dutyDays.includes(dayAbbrev))
    .sort((a, b) => {
      const ia = seenOrder.indexOf(a.value.popid);
      const ib = seenOrder.indexOf(b.value.popid);
      return (ib < 0 ? Number.MAX_SAFE_INTEGER : ib) - (ia < 0 ? Number.MAX_SAFE_INTEGER : ia);
    });
}

module.exports = {
  CONFIG_PATH,
  DATA_NODES,
  DUTY_DAYS,
  validatePackage,
  loadPackages,
  activePackages,
  duePackages,
};
