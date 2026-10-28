'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'newsroom-wake-packages.json');
const WAKE_STAGES = Object.freeze(['angle', 'report', 'write']);
// One positive evidence join per sourcing mode; absent legacy entries use named.
const SOURCING = Object.freeze(['records', 'offices', 'named', 'street', 'workplace']);

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const WRITER_TOOLS_SEATS = ['elliot-marbury', 'hal-richmond', 'anthony-raines', 'freelance-firebrand', 'carmen-delaine',
  'luis-navarro', 'elliot-graye', 'business-desk', 'trevor-shimizu', 'lila-mezran', 'angela-reyes', 'rachel-torres', 'tamsin-pruitt'];
// pipeline.76, builder 2026-10-14; Hal + Anthony 2026-10-19; Jax + Carmen 2026-10-26; the rest builder 2026-10-27 ("Luis and all the right question small change we can and set up Tamsin")

function validatePackage(key, value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) errors.push('must be an object');
  if (value && value.persona !== key) errors.push('persona must equal registry key');
  if (value && value.active !== true && value.active !== false) errors.push('active must be boolean');
  if (value && value.requiredDaily !== true && value.requiredDaily !== false) {
    errors.push('requiredDaily must be boolean');
  }
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
  // pipeline.75 — a seat whose form is short by design (a Lives notice, a Voices pair) sets its own
  // thin floor; absent, cron-desk-run's 150-word default applies.
  if (value && value.thinFloor !== undefined && !(Number.isInteger(value.thinFloor) && value.thinFloor > 0)) {
    errors.push('thinFloor must be a positive integer');
  }
  // pipeline.77 — the watched reward-loop group (builder 2026-10-14): rubric shown at W3, contract
  // score from the gate, the grade carried on the reporter's page into the next W1.
  if (value && value.rewardLoop !== undefined && typeof value.rewardLoop !== 'boolean') {
    errors.push('rewardLoop must be boolean');
  }
  // pipeline.89 — gate 'off': Rhea's verdict is off this seat's path (builder 2026-10-25); the
  // contamination wall and the thin floor stay.
  if (value && value.gate !== undefined && value.gate !== 'off') errors.push("gate must be 'off' when present");
  // pipeline.76 — writer tools are a per-package exception to ADR-0017 (builder 2026-10-14).
  if (value && value.writerTools !== undefined) {
    const n = value.writerTools && value.writerTools.maxToolCalls;
    if (!(Number.isInteger(n) && n >= 1 && n <= 8)) errors.push('writerTools.maxToolCalls must be an integer 1-8');
    // codex pipeline.76 #1: the builder granted tools to one journalist; another seat needs his word.
    if (!WRITER_TOOLS_SEATS.includes(key)) errors.push('writerTools is granted only to ' + WRITER_TOOLS_SEATS.join(', '));
  }
  if (value && value.sourcing !== undefined && !SOURCING.includes(value.sourcing)) {
    errors.push('sourcing must be one of ' + SOURCING.join(', '));
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

function sourcingFor(value) {
  const mode = value && value.sourcing === undefined ? 'named' : value && value.sourcing;
  if (!SOURCING.includes(mode)) throw new Error('unknown sourcing mode: ' + mode);
  return mode;
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
  SOURCING,
  slug,
  validatePackage,
  loadPackages,
  packageKeyForAssignment,
  packageForAssignment,
  activePackages,
  routeFor,
  sourcingFor,
  gateAssignments,
};
