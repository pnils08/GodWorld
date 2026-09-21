#!/usr/bin/env node
'use strict';

/**
 * civic.38 Task 6 — deterministic, disk-only petition condition counter.
 * No env loader, model calls, Sheet reads/writes, or output-file writes.
 *
 * countPetition({ policyDomain, hoods }, data, { hardshipBand, supportBand, sinceCycle })
 * data: cycle + tab-named row arrays; Neighborhood_Map is sheet-sourced.
 * support.cleared is an observation for the Sunday gate, NEVER a vote/write.
 * Housing/safety cannot clear; health requires an explicit population-share band.
 * No extrapolation from tracked households/citizens to untracked signatures.
 *
 * node scripts/civicPetitions.js --dry-run
 * node scripts/civicPetitions.js --domain health --hood Temescal --support-band 0.01 --json
 * Optional: --root PATH --cycle N --hardship-band 0.30 --since-cycle N
 * Default CLI: all mapped hoods, housing/health/safety, current beats Cycle.
 */
const fs = require('node:fs');
const path = require('node:path');
const { CANONICAL_HOODS } = require('../lib/canonNeighborhoods');
const { POLICY_DOMAINS } = require('./createInitiative');
const { DIAL_MAP } = require('../utilities/citizenDialMap');

const ROOT = path.resolve(__dirname, '..');
// Mirrors the hospital writer's open-state contract (buildCyclePacket.js:836).
// A nonblank DischargeCycle or Outcome always excludes a historical admission.
const OPEN_CARE = new Set(['hospitalized', 'critical', 'serious-condition', 'injured', 'recovering']);
const key = value => String(value == null ? '' : value).trim().toLowerCase();
const blank = value => value == null || String(value).trim() === '';
function numeric(value) {
  if (blank(value) || !['string', 'number'].includes(typeof value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function positiveCycle(value, name = 'cycle') {
  const n = numeric(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(name + ' must be a positive integer');
  return n;
}
function fraction(value, name, fallback) {
  if (value == null) return fallback;
  const n = numeric(value);
  if (n == null || n <= 0 || n > 1) throw new Error(name + ' must be greater than 0 and at most 1');
  return n;
}
function table(data, name) {
  if (!Array.isArray(data[name])) throw new Error('Missing local table: ' + name);
  return data[name];
}

function buildHoodResolver(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Neighborhood_Map snapshot is required');
  const parents = new Map(), children = new Map(), cacheMissing = new Set();
  for (const row of rows) {
    const hood = String(row.Neighborhood || '').trim();
    if (!hood) continue;
    if (!Object.hasOwn(row, 'ChildAreas')) throw new Error('Neighborhood_Map missing ChildAreas for ' + hood);
    if (parents.has(key(hood))) throw new Error('Duplicate Neighborhood_Map parent: ' + hood);
    parents.set(key(hood), hood);
    if (!CANONICAL_HOODS.has(key(hood))) cacheMissing.add(hood);
  }
  if (!parents.size) throw new Error('Neighborhood_Map has no named parents');
  for (const row of rows) {
    const parent = parents.get(key(row.Neighborhood));
    if (!parent) continue;
    for (const raw of String(row.ChildAreas || '').split(',')) {
      const child = raw.trim(), ck = key(child);
      if (!ck || parents.has(ck)) continue; // tracked hoods are never children
      if (children.has(ck) && children.get(ck) !== parent) throw new Error('Child area has multiple parents: ' + child);
      children.set(ck, parent);
      if (!CANONICAL_HOODS.has(ck)) cacheMissing.add(child);
    }
  }
  return {
    resolve: name => parents.get(key(name)) || children.get(key(name)) || null,
    hoods: [...parents.values()].sort(),
    cacheMissing: [...cacheMissing].sort(),
  };
}

function uniqueRows(rows, field) {
  const byId = new Map();
  for (const row of rows) {
    const id = String(row[field] || '').trim();
    if (!id) throw new Error('Missing ' + field + ' on a condition row');
    const canonical = JSON.stringify(Object.keys(row).sort().map(k => [k, row[k]]));
    if (byId.has(id) && byId.get(id).canonical !== canonical) throw new Error('Conflicting ' + field + ': ' + id);
    byId.set(id, { row, canonical });
  }
  return [...byId.values()].map(v => v.row);
}

function hoodRows(rows, resolver, label) {
  const byHood = new Map();
  for (const row of rows) {
    if (!row.Neighborhood) continue;
    const hood = resolver.resolve(row.Neighborhood);
    if (!hood) throw new Error(label + ': unknown neighborhood ' + row.Neighborhood);
    if (byHood.has(hood)) throw new Error(label + ': duplicate folded neighborhood ' + hood);
    byHood.set(hood, row);
  }
  return byHood;
}

function visibility(data, resolver, target, sinceCycle) {
  const out = { available: Array.isArray(data.Reflection_Intake), sinceCycle, throughCycle: data.cycle,
    civicRows: 0, complaintRows: 0, uniqueCitizens: 0, unlocatedRows: 0, invalidCycleRows: 0, rows: [] };
  if (!out.available) return out;
  const people = new Map();
  for (const row of data.Simulation_Ledger || []) {
    const id = key(row.POPID);
    if (!id) continue;
    const hood = resolver.resolve(row.Neighborhood);
    if (people.has(id) && people.get(id) !== hood) throw new Error('Conflicting citizen neighborhood: ' + row.POPID);
    people.set(id, hood);
  }
  const negative = new Set(Object.keys(DIAL_MAP).filter(tag => DIAL_MAP[tag].composure < 0).map(key));
  const seen = new Set(), citizens = new Set();
  for (const row of data.Reflection_Intake) {
    if (key(row.Tag) !== 'civic') continue;
    const cycle = numeric(row.Cycle);
    if (!Number.isInteger(cycle) || cycle < 1) { out.invalidCycleRows++; continue; }
    if (cycle < sinceCycle || cycle > data.cycle) continue;
    const fingerprint = JSON.stringify([row.Timestamp, row.POPID, row.Cycle, row.Daypart, row.Tag, row.Affect, row.ReflectionExcerpt]);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    const hood = people.get(key(row.POPID));
    if (!hood) { out.unlocatedRows++; continue; }
    if (!target.has(hood)) continue;
    citizens.add(key(row.POPID)); out.civicRows++;
    const complaint = negative.has(key(row.Affect));
    if (complaint) out.complaintRows++;
    out.rows.push({ popid: row.POPID, hood, cycle, affect: row.Affect || '', applied: row.Applied || '',
      complaint, excerpt: row.ReflectionExcerpt || '' });
  }
  out.uniqueCitizens = citizens.size;
  return out;
}

function countPetition(proposal, data, options = {}) {
  const cycle = positiveCycle(data.cycle);
  const domain = key(proposal.policyDomain);
  if (!POLICY_DOMAINS.includes(domain)) throw new Error('Unknown policyDomain: ' + domain);
  const hardshipBand = fraction(options.hardshipBand, 'hardshipBand', 0.30);
  const supportBand = fraction(options.supportBand, 'supportBand', null);
  const sinceCycle = positiveCycle(options.sinceCycle == null ? cycle : options.sinceCycle, 'sinceCycle');
  if (sinceCycle > cycle) throw new Error('sinceCycle exceeds snapshot cycle');
  const resolver = buildHoodResolver(data.Neighborhood_Map);
  if (!Array.isArray(proposal.hoods) || !proposal.hoods.length) throw new Error('Proposal hoods[] is required');
  const hoods = [...new Set(proposal.hoods.map(name => {
    const hood = resolver.resolve(name);
    if (!hood) throw new Error('Unknown neighborhood: ' + name);
    return hood;
  }))].sort();
  const target = new Set(hoods);
  const demo = hoodRows(table(data, 'Neighborhood_Demographics'), resolver, 'Neighborhood_Demographics');
  const missingPopulationHoods = [];
  let totalPopulation = 0, sickResidents = 0, sickComplete = true;
  for (const hood of hoods) {
    const row = demo.get(hood) || {};
    const parts = ['Students', 'Adults', 'Seniors'].map(k => numeric(row[k]));
    if (parts.some(n => n == null || n < 0)) missingPopulationHoods.push(hood);
    else totalPopulation += parts.reduce((a, b) => a + b, 0);
    const sick = numeric(row.Sick);
    if (sick == null || sick < 0) sickComplete = false;
    else sickResidents += sick;
  }
  const population = { value: missingPopulationHoods.length ? null : totalPopulation,
    source: 'Neighborhood_Demographics.Students + Adults + Seniors', missingHoods: missingPopulationHoods };
  const counts = {};
  let numerator = null, unit = null;
  const quality = { unlocatedConditionRows: 0, invalidConditionRows: 0, canonCacheMissing: resolver.cacheMissing };
  const inTarget = row => {
    const hood = resolver.resolve(row.Neighborhood);
    if (!hood) { quality.unlocatedConditionRows++; return false; }
    return target.has(hood);
  };
  if (domain === 'housing') {
    Object.assign(counts, { activeRentedHouseholds: 0, evaluableHouseholds: 0, hardshipHouseholds: 0,
      zeroIncomeHouseholds: 0, missingIncomeHouseholds: 0, invalidIncomeHouseholds: 0, missingOrInvalidRentHouseholds: 0 });
    const active = table(data, 'Household_Ledger').filter(r => key(r.Status) === 'active' && key(r.HousingType) === 'rented');
    for (const row of uniqueRows(active, 'HouseholdId')) {
      if (!inTarget(row)) continue;
      counts.activeRentedHouseholds++;
      const income = numeric(row.HouseholdIncome), rent = numeric(row.MonthlyRent);
      if (blank(row.HouseholdIncome)) counts.missingIncomeHouseholds++;
      else if (income === 0) counts.zeroIncomeHouseholds++;
      else if (income == null || income < 0) counts.invalidIncomeHouseholds++;
      if (rent == null || rent < 0) counts.missingOrInvalidRentHouseholds++;
      if (income == null || income <= 0 || rent == null || rent < 0) continue;
      counts.evaluableHouseholds++;
      if (rent * 12 / income > hardshipBand) counts.hardshipHouseholds++;
    }
    numerator = counts.hardshipHouseholds; unit = 'tracked-households';
  } else if (domain === 'health') {
    Object.assign(counts, { openAdmissions: 0, inCareCitizens: 0, sickResidents: sickComplete ? sickResidents : null });
    const people = new Set();
    for (const row of table(data, 'Hospital_Ledger')) {
      if (!row.POPID && !row.AdmissionId && !row.Neighborhood) continue;
      if (!Object.hasOwn(row, 'DischargeCycle') || !Object.hasOwn(row, 'StatusNow')) { quality.invalidConditionRows++; continue; }
      if (!blank(row.DischargeCycle) || !blank(row.Outcome) || !OPEN_CARE.has(key(row.StatusNow))) continue;
      if (!inTarget(row)) continue;
      if (blank(row.POPID)) { quality.invalidConditionRows++; continue; }
      counts.openAdmissions++;
      people.add(key(row.POPID));
    }
    counts.inCareCitizens = people.size;
    numerator = people.size; unit = 'tracked-citizens-in-care';
  } else if (domain === 'safety') {
    const city = hoodRows(table(data, 'Crime_Metrics'), resolver, 'Crime_Metrics');
    const levels = resolver.hoods.map(hood => {
      const n = numeric((city.get(hood) || {}).ViolentLevel);
      if (n == null || n < 0) throw new Error('Crime_Metrics missing/invalid ViolentLevel for ' + hood);
      return n;
    }).sort((a, b) => a - b);
    const mid = Math.floor(levels.length / 2);
    const median = levels.length % 2 ? levels[mid] : (levels[mid - 1] + levels[mid]) / 2;
    Object.assign(counts, { cityMedianViolentLevel: median, cityHoods: levels.length,
      hoodConditions: hoods.map(hood => ({ hood, violentLevel: numeric(city.get(hood).ViolentLevel), aboveCityMedian: numeric(city.get(hood).ViolentLevel) > median })) });
    counts.aboveMedianHoods = counts.hoodConditions.filter(r => r.aboveCityMedian).length;
    unit = 'hood-condition-not-signatures';
  }
  const requiredCount = supportBand != null && population.value > 0 ? Math.ceil(population.value * supportBand) : null;
  let reason = 'eligible';
  if (['housing', 'safety'].includes(domain)) reason = 'domain-not-playable';
  else if (domain !== 'health') reason = 'domain-rules-deferred';
  else if (supportBand == null) reason = 'support-band-unset';
  else if (!(population.value > 0)) reason = 'population-incomplete';
  else if (quality.invalidConditionRows || quality.unlocatedConditionRows) reason = 'condition-data-incomplete';
  else if (numerator < requiredCount) reason = 'below-support-band';
  return { cycle, policyDomain: domain, hoods, hardshipBand, counts, population,
    support: { band: supportBand, numerator, unit, requiredCount, cleared: reason === 'eligible', reason,
      basis: 'Observed condition counts only; no sample extrapolation. Housing households are not population signatures.' },
    visibility: visibility(data, resolver, target, sinceCycle), quality };
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw new Error(file + ': ' + e.message); }
}
function readRows(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line, i) => {
    if (!line.trim()) return [];
    try {
      const row = JSON.parse(line);
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('expected a row object');
      return [row];
    } catch (e) { throw new Error(file + ':' + (i + 1) + ': ' + e.message); }
  });
}
function loadLocalData({ root = ROOT, cycle = null } = {}) {
  const out = path.join(root, 'output'), beats = path.join(out, 'beats');
  const meta = readJson(path.join(beats, 'meta.json'));
  const stamp = positiveCycle(meta.cycle);
  if (cycle != null && positiveCycle(cycle) !== stamp) throw new Error('Requested cycle does not match beats cycle ' + stamp);
  const auditPath = path.join(out, 'engine_audit_c' + stamp + '.json');
  const audit = readJson(auditPath);
  if (Number(audit.cycle) !== stamp) throw new Error('Neighborhood audit cycle does not match beats');
  const data = { cycle: stamp, Neighborhood_Map: (audit.snapshots || {}).Neighborhood_Map,
    sources: { beats: path.join(beats, 'meta.json'), neighborhoodMap: auditPath }, warnings: [] };
  buildHoodResolver(data.Neighborhood_Map); // never substitute the cached child-name list for parent links
  for (const tab of ['Household_Ledger', 'Hospital_Ledger', 'Neighborhood_Demographics', 'Crime_Metrics', 'Reflection_Intake']) {
    data[tab] = readRows(path.join(beats, tab + '.jsonl'));
    if (!data[tab]) data.warnings.push('Missing local ' + tab + ' dump');
  }
  const citizensPath = path.join(out, 'simulation_ledger_snapshot.jsonl');
  const citizensMeta = path.join(out, 'simulation_ledger_snapshot.meta.json');
  data.Simulation_Ledger = null;
  if (fs.existsSync(citizensPath) && fs.existsSync(citizensMeta) && Number(readJson(citizensMeta).cycle) === stamp) {
    data.Simulation_Ledger = readRows(citizensPath);
    data.sources.citizens = citizensPath;
  } else data.warnings.push('Missing or stale citizen snapshot; reflections cannot be located');
  return data;
}

function main(argv = process.argv.slice(2)) {
  const args = {}, allowed = new Set(['root', 'cycle', 'domain', 'hood', 'hardship-band', 'support-band', 'since-cycle']);
  for (let i = 0; i < argv.length; i++) {
    if (['--dry-run', '--json'].includes(argv[i])) { args[argv[i].slice(2)] = true; continue; }
    const flag = argv[i].slice(2);
    if (!argv[i].startsWith('--') || !allowed.has(flag) || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Unknown or missing option: ' + argv[i]);
    if (flag === 'hood') (args.hood ||= []).push(argv[++i]);
    else args[flag] = argv[++i];
  }
  const data = loadLocalData({ root: args.root || ROOT, cycle: args.cycle });
  const hoods = args.hood || buildHoodResolver(data.Neighborhood_Map).hoods;
  const domains = args.domain ? [args.domain] : ['housing', 'health', 'safety'];
  const results = domains.map(policyDomain => countPetition({ policyDomain, hoods }, data, {
    hardshipBand: args['hardship-band'], supportBand: args['support-band'], sinceCycle: args['since-cycle'],
  }));
  if (args.json) console.log(JSON.stringify({ cycle: data.cycle, sources: data.sources, warnings: data.warnings, results }, null, 2));
  else {
    console.log('Civic petitions — C' + data.cycle + ' — local observations only');
    for (const warning of data.warnings) console.log('WARNING: ' + warning);
    console.log('Domain\tCondition count\tUnit\tPopulation\tHardship band\tSupport band\tRequired count\tGate result');
    for (const r of results) {
      console.log([r.policyDomain, r.support.numerator ?? r.counts.aboveMedianHoods ?? 'deferred', r.support.unit || 'deferred',
        r.population.value ?? 'unavailable', r.hardshipBand, r.support.band ?? 'unset', r.support.requiredCount ?? 'unset', r.support.reason].join('\t'));
      console.log('  counts: ' + JSON.stringify(r.counts));
      console.log('  visibility: ' + JSON.stringify({ ...r.visibility, rows: undefined }));
      console.log('  data quality: ' + JSON.stringify(r.quality));
    }
    console.log('No rows written. Reflections never count as signatures; health Sick is separate from in-care citizens.');
  }
  return results;
}

module.exports = { countPetition, loadLocalData, buildHoodResolver, main };
if (require.main === module) {
  try { main(); } catch (e) { console.error('civicPetitions: ' + e.message); process.exitCode = 1; }
}
