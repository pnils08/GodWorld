'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'newsroom-wake-packages.json');
const WAKE_STAGES = Object.freeze(['angle', 'report', 'write']);

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function validatePackage(key, value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) errors.push('must be an object');
  if (value && value.persona !== key) errors.push('persona must equal registry key');
  if (value && value.active !== true && value.active !== false) errors.push('active must be boolean');
  if (value && !/^[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+$/.test(String(value.version || ''))) {
    errors.push('version must be a stable uppercase package version ending in an integer');
  }
  if (value && value.packetContract !== 'v2') errors.push('packetContract must equal v2');
  for (const stage of WAKE_STAGES) {
    const route = value && value.models && value.models[stage];
    if (!route || route.provider !== 'openrouter' || !String(route.model || '').includes('/')) {
      errors.push('models.' + stage + ' requires an explicit OpenRouter model');
    }
  }
  const a = value && value.assignment;
  if (!a || !a.desk || !a.name || !/^POP-\d{5}$/.test(String(a.popid || '')) || !a.beatDomain) {
    errors.push('assignment requires desk, name, POPID, and beatDomain');
  }
  const profile = value && value.reviewProfile;
  if (!profile || !profile.id || !['load-bearing', 'exhaustive'].includes(profile.canonPolicy) ||
      !Array.isArray(profile.authorizedTexture) || !Array.isArray(profile.textureConditions) ||
      !Array.isArray(profile.canonBlockers)) {
    errors.push('reviewProfile requires id, a supported canon policy, texture authority, conditions, and canon blockers');
  }
  if (errors.length) throw new Error('invalid wake package ' + key + ': ' + errors.join('; '));
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

function packageKeyForAssignment(assignment) {
  if (!assignment) return null;
  return assignment.persona || slug(assignment.name);
}

function packageForAssignment(assignment, packages) {
  const all = packages || loadPackages();
  const key = packageKeyForAssignment(assignment);
  const value = key && all[key];
  return value && value.active ? value : null;
}

function activePackages(packages) {
  const all = packages || loadPackages();
  return Object.entries(all).filter(([, value]) => value.active).map(([key, value]) => ({ key, value }));
}

function routeFor(value, stage) {
  if (!WAKE_STAGES.includes(stage)) throw new Error('unknown wake stage: ' + stage);
  if (!value || !value.models || !value.models[stage]) throw new Error('wake package has no ' + stage + ' model route');
  return value.models[stage];
}

function gateAssignments(assignments, packages) {
  const eligible = [];
  const skipped = [];
  for (const assignment of assignments || []) {
    const wakePackage = packageForAssignment(assignment, packages);
    if (!wakePackage) {
      skipped.push({ name: assignment.name, desk: assignment.desk, reason: 'no-active-wake-package' });
      continue;
    }
    eligible.push(Object.assign({}, assignment, {
      persona: wakePackage.persona,
      wakePackage: wakePackage.version,
      packetContract: wakePackage.packetContract,
    }));
  }
  return { eligible, skipped };
}

module.exports = {
  CONFIG_PATH,
  WAKE_STAGES,
  slug,
  validatePackage,
  loadPackages,
  packageKeyForAssignment,
  packageForAssignment,
  activePackages,
  routeFor,
  gateAssignments,
};
