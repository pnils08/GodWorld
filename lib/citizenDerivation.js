/**
 * citizenDerivation.js — intake-side citizen derivation library (Node)
 *
 * Plan: docs/plans/2026-04-28-intake-side-citizen-derivation.md
 * Sister: utilities/citizenDerivation.js (Apps Script — same per-field algorithms)
 *
 * Purpose: when a new citizen is created at intake, derive realistic values for
 * 8 demographic + lifecycle fields (RoleType, EducationLevel, Gender,
 * YearsInCareer, DebtLevel, NetWorth, MaritalStatus, NumChildren) instead of
 * leaving them blank or seeding hardcoded sentinels.
 *
 * Determinism: djb2 hash on (first|last|popId) seed. Same seed always gets
 * same values across runs. Apps Script-safe (no Math.random / crypto / Buffer).
 *
 * Brackets used by ageBracket(): 18-29 | 30-44 | 45-59 | 60-74 | 75+
 * (The backfill script scripts/backfillLifecycleDefaults.js used 18-24/25-34/...;
 *  this library is forward-only so no parity needed with that script.)
 */

const ECONOMIC_PARAMETERS = require('../data/economic_parameters.json');

const BASE_FEMALE_PCT = 0.51;

// Per-neighborhood gender variance — calibrated against real Oakland census +
// prosperity-era assumptions. Values are p(female). See plan §3.3.
const NEIGHBORHOOD_GENDER_VARIANCE = {
  // Canon-12 (Simulation_Ledger neighborhoods)
  'Temescal': 0.51,
  'Downtown': 0.51,
  'Fruitvale': 0.50,
  'Lake Merritt': 0.52,
  'West Oakland': 0.50,
  'Laurel': 0.51,
  'Rockridge': 0.51,
  'Jack London': 0.49,
  'Uptown': 0.50,
  'KONO': 0.50,
  'Chinatown': 0.51,
  'Piedmont Ave': 0.52,
  // Fine-grained extras (Neighborhood_Map)
  'Adams Point': 0.53,
  'Coliseum': 0.49,
  'Coliseum District': 0.49,
  'Eastlake': 0.50,
  'Montclair': 0.51,
  'San Antonio': 0.50,
  'Glenview': 0.51,
  'Ivy Hill': 0.51,
  'Elmhurst': 0.50,
  'Jingletown': 0.50,
};

const ANCHOR_YEAR = 2041;
const FALLBACK_INCOME = 60000;

const EDUCATION_LEVELS = ['hs-diploma', 'bachelors', 'masters', 'associates', 'trade-cert', 'doctorate'];

// Build a Set of canonical roles for fast filtering. Names compared case-sensitively
// since live SL RoleTypes already match economic_parameters.json conventions.
const CANONICAL_ROLES = new Set(ECONOMIC_PARAMETERS.map(p => p.role));

// ───────────────────────────────────────────────────────────────────────────
// Internal helpers
// ───────────────────────────────────────────────────────────────────────────

// djb2 string hash → 32-bit unsigned int. Apps Script-safe.
function hashSeed(s) {
  let h = 5381;
  s = String(s || '');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Deterministic [0, 1) draw seeded by (popId, salt) — different stream per field.
function rand01(seed, salt) {
  return (hashSeed(seed + '|' + salt) % 1000000) / 1000000;
}

// Pick a value from a CDF: array of [value, cumulativeProbability] pairs.
function pickFromCDF(r, cdf) {
  for (const [value, threshold] of cdf) {
    if (r < threshold) return value;
  }
  return cdf[cdf.length - 1][0];
}

// 5-bracket age structure used throughout the library.
function ageBracket(age) {
  if (age < 30) return '18-29';
  if (age < 45) return '30-44';
  if (age < 60) return '45-59';
  if (age < 75) return '60-74';
  return '75+';
}

// Income lookup from economic_parameters.json. Fallback when role not canonical.
function lookupIncome(roleType) {
  if (!roleType) return FALLBACK_INCOME;
  for (const p of ECONOMIC_PARAMETERS) {
    if (p.role === roleType) return p.medianIncome;
  }
  return FALLBACK_INCOME;
}

// CareerStage computed inline (no SL column). Used by lifecycle derivations.
function computeCareerStage(seed, age, roleType) {
  if (age >= 65) return 'retired';
  if (age < 25) return 'early';
  if (age < 40) return 'mid';
  if (age < 55) return rand01(seed, 'career') < 0.3 ? 'senior' : 'mid';
  return 'senior';
}

// ───────────────────────────────────────────────────────────────────────────
// Ledger frequency snapshot — built once per intake batch
// ───────────────────────────────────────────────────────────────────────────

// Build a frequency snapshot of the live ledger for neighborhood-aware draws.
// Headers must include Neighborhood, RoleType, EducationLevel, BirthYear.
// Data is the 2D array (rows × cols) AFTER the header row (or includes header
// at row 0 — caller indicates via `includesHeader`).
function buildLedgerFreqSnapshot(headers, data, options) {
  options = options || {};
  const includesHeader = options.includesHeader === true;
  const startRow = includesHeader ? 1 : 0;

  const idx = (n) => headers.indexOf(n);
  const iNbhd = idx('Neighborhood');
  const iRole = idx('RoleType');
  const iEdu = idx('EducationLevel');
  const iBirth = idx('BirthYear');

  const byNeighborhood = {};
  const citywide = { roleTypes: {}, educationByAge: {} };

  for (let r = startRow; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    const nbhd = iNbhd >= 0 ? String(row[iNbhd] || '').trim() : '';
    const role = iRole >= 0 ? String(row[iRole] || '').trim() : '';
    const edu = iEdu >= 0 ? String(row[iEdu] || '').trim() : '';
    const birthYear = iBirth >= 0 ? Number(row[iBirth]) : null;

    // Citywide tallies
    if (role) citywide.roleTypes[role] = (citywide.roleTypes[role] || 0) + 1;
    if (edu && birthYear) {
      const bracket = ageBracket(ANCHOR_YEAR - birthYear);
      if (!citywide.educationByAge[bracket]) citywide.educationByAge[bracket] = {};
      citywide.educationByAge[bracket][edu] = (citywide.educationByAge[bracket][edu] || 0) + 1;
    }

    // Per-neighborhood tallies
    if (nbhd) {
      if (!byNeighborhood[nbhd]) byNeighborhood[nbhd] = { roleTypes: {}, educationByAge: {} };
      const bucket = byNeighborhood[nbhd];
      if (role) bucket.roleTypes[role] = (bucket.roleTypes[role] || 0) + 1;
      if (edu && birthYear) {
        const bracket = ageBracket(ANCHOR_YEAR - birthYear);
        if (!bucket.educationByAge[bracket]) bucket.educationByAge[bracket] = {};
        bucket.educationByAge[bracket][edu] = (bucket.educationByAge[bracket][edu] || 0) + 1;
      }
    }
  }

  return { byNeighborhood, citywide };
}

// Frequency-weighted draw from a counts map.
function freqWeightedDraw(r, counts) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  if (total === 0) return null;
  const target = r * total;
  let acc = 0;
  for (const [k, v] of Object.entries(counts)) {
    acc += v;
    if (target < acc) return k;
  }
  return Object.keys(counts).pop();
}

// Frequency-weighted draw FILTERED to canonical roles only.
function freqWeightedDrawCanonical(r, counts) {
  const filtered = {};
  for (const [k, v] of Object.entries(counts)) {
    if (CANONICAL_ROLES.has(k)) filtered[k] = v;
  }
  return freqWeightedDraw(r, filtered);
}

// ───────────────────────────────────────────────────────────────────────────
// Per-field derivations
// ───────────────────────────────────────────────────────────────────────────

// RoleType: live-SL frequency by neighborhood, filtered to canonical 198-pool.
// Falls through to citywide frequency, then to a Path B style demographic-voice
// pool draw (the same 65-role pool used in processAdvancementIntake.js).
function deriveRoleType(seed, neighborhood, ledgerFreq) {
  const r = rand01(seed, 'role');
  const minEntriesNeighborhood = 10;

  const nbhdBucket = ledgerFreq && ledgerFreq.byNeighborhood && ledgerFreq.byNeighborhood[neighborhood];
  if (nbhdBucket && Object.keys(nbhdBucket.roleTypes).length >= minEntriesNeighborhood) {
    const drawn = freqWeightedDrawCanonical(r, nbhdBucket.roleTypes);
    if (drawn) return drawn;
  }

  const citywide = ledgerFreq && ledgerFreq.citywide && ledgerFreq.citywide.roleTypes;
  if (citywide) {
    const drawn = freqWeightedDrawCanonical(r, citywide);
    if (drawn) return drawn;
  }

  // Fallback: same 65-role demographic-voice pool used by Path B in
  // processAdvancementIntake.js. Shared by definition — keep them in sync.
  return DEMOGRAPHIC_VOICE_FALLBACK[hashSeed(seed + '|fallback') % DEMOGRAPHIC_VOICE_FALLBACK.length];
}

// Demographic-voice fallback pool — mirrors processAdvancementIntake.js Path B.
// Kept in sync manually; if Path B pool changes, update here too.
const DEMOGRAPHIC_VOICE_FALLBACK = [
  'Longshoreman', 'Crane Operator', 'Trade Union Representative', 'Harbor Tugboat Captain', 'Container Yard Supervisor',
  'Site Foreman', 'Ironworker', 'Construction Engineer', 'Construction Safety Inspector', 'Construction Laborer',
  'BART Station Manager', 'Bus Driver', 'Smart Grid Technician', 'Sea Level Monitoring Technician',
  'ER Nurse', 'Trauma Surgeon', 'Mental Health Counselor', 'Nurse Aide', 'Home Health Aide',
  'Public School Teacher', 'ESL Instructor', 'Youth Literacy Coordinator',
  'Autonomous Systems Engineer', 'Biotech Lab Director', 'AI Safety Researcher',
  'Taqueria Owner', 'Independent Bookstore Owner', 'Craft Brewery Owner', 'Tea House Owner', 'Sourdough Baker', 'Vintage Clothing Store Owner', 'Food Truck Operator',
  'Muralist', 'Theater Director', 'Fashion Designer', 'Hip-Hop Producer',
  'Immigrant Legal Aid Worker', 'Public Defender', 'Corporate Accountant',
  'City Building Inspector', 'Social Worker', 'Firefighter', 'Emergency Management Coordinator',
  'Community Organizer', 'Mutual Aid Network Organizer', 'Refugee Resettlement Case Worker', 'Tenant Advocate',
  'Climate Adaptation Engineer', 'Vertical Farm Technician', 'Drone Fleet Coordinator',
  'Electrician', 'Plumber', 'Solar Installer', 'Mechanic', 'Carpenter', 'Welder',
  'Barista', 'Line Cook', 'Server', 'Bartender', 'Hair Stylist', 'Taxi Driver',
  'Homeless Outreach Worker', 'Ex-Offender Reentry Counselor', 'Domestic Violence Shelter Coordinator'
];

// EducationLevel: age-bracket-aware live frequency draw, neighborhood-conditioned.
function deriveEducationLevel(seed, neighborhood, age, ledgerFreq) {
  const r = rand01(seed, 'edu');
  const bracket = ageBracket(age);
  const minEntries = 5;

  const nbhdBucket = ledgerFreq && ledgerFreq.byNeighborhood && ledgerFreq.byNeighborhood[neighborhood];
  const nbhdAgeBucket = nbhdBucket && nbhdBucket.educationByAge && nbhdBucket.educationByAge[bracket];
  if (nbhdAgeBucket && Object.keys(nbhdAgeBucket).length >= minEntries) {
    const drawn = freqWeightedDraw(r, sanitizeEduCounts(nbhdAgeBucket));
    if (drawn) return drawn;
  }

  const citywideAge = ledgerFreq && ledgerFreq.citywide && ledgerFreq.citywide.educationByAge && ledgerFreq.citywide.educationByAge[bracket];
  if (citywideAge) {
    const drawn = freqWeightedDraw(r, sanitizeEduCounts(citywideAge));
    if (drawn) return drawn;
  }

  // Fallback canonical default — most adults have hs-diploma per LEDGER baseline.
  return 'hs-diploma';
}

// Drop sentinel/non-canonical education values (the `-` row found in Phase 1).
function sanitizeEduCounts(counts) {
  const out = {};
  for (const [k, v] of Object.entries(counts)) {
    if (!k || k === '-') continue;
    if (EDUCATION_LEVELS.indexOf(k) < 0) continue;
    out[k] = v;
  }
  return out;
}

// Gender: canonical 51% female with neighborhood variance.
// Go-forward only — existing 760 SL rows untouched.
function deriveGender(seed, neighborhood) {
  const p = NEIGHBORHOOD_GENDER_VARIANCE[neighborhood] != null ? NEIGHBORHOOD_GENDER_VARIANCE[neighborhood] : BASE_FEMALE_PCT;
  return rand01(seed, 'gender') < p ? 'female' : 'male';
}

// YearsInCareer: age-bracket bell, retiree-aware.
function deriveYearsInCareer(seed, age, careerStage) {
  const r = rand01(seed, 'YearsInCareer');
  const stage = String(careerStage || '').toLowerCase();

  if (stage === 'retired') {
    return Math.round((35 + r * 10) * 10) / 10;
  }
  const minStart = 18;
  const maxYears = Math.max(0, age - minStart);
  if (maxYears <= 0) return 0;

  const center = maxYears * 0.55;
  const span = maxYears * 0.35;
  const draw = center + span * (r - 0.5) * 2;
  return Math.round(Math.max(0.5, Math.min(maxYears, draw)) * 10) / 10;
}

// DebtLevel (0-10): income-inverse + age curve.
function deriveDebtLevel(seed, age, income) {
  const r = rand01(seed, 'DebtLevel');
  const inc = Number(income) || 0;

  let base;
  if (inc < 40000) base = 5;
  else if (inc < 100000) base = 3;
  else if (inc < 250000) base = 2;
  else base = 1;

  if (age >= 18 && age < 30) base += 1.5;
  else if (age >= 65) base -= 1.5;

  const wobble = (r - 0.5) * 4;
  return Math.round(Math.max(0, Math.min(10, base + wobble)));
}

// NetWorth: age-conditioned + income-multiplied + retiree bonus.
function deriveNetWorth(seed, age, income, careerStage) {
  const r = rand01(seed, 'NetWorth');
  const inc = Number(income) || 0;
  const stage = String(careerStage || '').toLowerCase();

  let ageBase;
  if (age < 25) ageBase = 8000;
  else if (age < 35) ageBase = 60000;
  else if (age < 50) ageBase = 200000;
  else if (age < 65) ageBase = 450000;
  else ageBase = 600000;

  let incMult = 1.0;
  if (inc > 100000) incMult = 1.5;
  if (inc > 250000) incMult = 3.0;
  if (inc > 500000) incMult = 7.0;
  if (inc > 1000000) incMult = 15.0;

  if (stage === 'retired') incMult *= 1.4;

  const wobble = 0.4 + r * 2.1;
  const raw = ageBase * incMult * wobble;
  return Math.round(raw / 1000) * 1000;
}

// MaritalStatus: 5-bracket CDF (per plan §3.4).
function deriveMaritalStatus(seed, age) {
  const r = rand01(seed, 'MaritalStatus');
  const bracket = ageBracket(age);

  const CDF = {
    '18-29': [['single', 0.60], ['partnered', 0.78], ['married', 0.98], ['divorced', 1.00]],
    '30-44': [['single', 0.24], ['partnered', 0.35], ['married', 0.91], ['divorced', 1.00]],
    '45-59': [['single', 0.12], ['partnered', 0.17], ['married', 0.73], ['divorced', 0.96], ['widowed', 1.00]],
    '60-74': [['single', 0.09], ['partnered', 0.12], ['married', 0.61], ['divorced', 0.86], ['widowed', 1.00]],
    '75+':   [['single', 0.06], ['partnered', 0.08], ['married', 0.44], ['divorced', 0.64], ['widowed', 1.00]],
  };
  return pickFromCDF(r, CDF[bracket]);
}

// NumChildren: age + marriage-conditioned fertility CDF (5-bracket).
function deriveNumChildren(seed, age, maritalStatus) {
  const r = rand01(seed, 'NumChildren');
  const ms = String(maritalStatus || '').toLowerCase();
  const partnered = ms === 'married' || ms === 'partnered';
  const bracket = ageBracket(age);

  const CDF = {
    '18-29-single':    [[0, 0.85], [1, 0.96], [2, 1.00]],
    '18-29-partnered': [[0, 0.62], [1, 0.85], [2, 0.95], [3, 1.00]],
    '30-44-single':    [[0, 0.65], [1, 0.84], [2, 0.94], [3, 1.00]],
    '30-44-partnered': [[0, 0.32], [1, 0.58], [2, 0.82], [3, 0.95], [4, 1.00]],
    '45-59-single':    [[0, 0.45], [1, 0.70], [2, 0.88], [3, 0.97], [4, 1.00]],
    '45-59-partnered': [[0, 0.16], [1, 0.40], [2, 0.72], [3, 0.90], [4, 0.98], [5, 1.00]],
    '60-74-single':    [[0, 0.35], [1, 0.60], [2, 0.82], [3, 0.94], [4, 1.00]],
    '60-74-partnered': [[0, 0.14], [1, 0.36], [2, 0.66], [3, 0.86], [4, 0.96], [5, 1.00]],
    '75+-single':      [[0, 0.32], [1, 0.56], [2, 0.78], [3, 0.92], [4, 1.00]],
    '75+-partnered':   [[0, 0.13], [1, 0.34], [2, 0.64], [3, 0.85], [4, 0.96], [5, 1.00]],
  };
  const key = bracket + '-' + (partnered ? 'partnered' : 'single');
  return pickFromCDF(r, CDF[key]);
}

// Neighborhood lookup helper (Phase 4.4): returns a real neighborhood string,
// never empty. If `provided` is non-empty, returns it; otherwise draws by
// citywide neighborhood frequency, with canon-12 baseline as final fallback.
function lookupNeighborhood(provided, seed, ledgerFreq) {
  if (provided && String(provided).trim() && String(provided).trim() !== 'Engine' && String(provided).trim() !== 'Generational') {
    return String(provided).trim();
  }
  // Build neighborhood frequency from ledgerFreq.byNeighborhood keys + their RoleType totals.
  const freq = {};
  if (ledgerFreq && ledgerFreq.byNeighborhood) {
    for (const [nbhd, bucket] of Object.entries(ledgerFreq.byNeighborhood)) {
      const total = Object.values(bucket.roleTypes || {}).reduce((s, v) => s + v, 0);
      if (total > 0) freq[nbhd] = total;
    }
  }
  const r = rand01(seed, 'neighborhood');
  const drawn = freqWeightedDraw(r, freq);
  if (drawn) return drawn;

  // Final fallback — canon-12 uniform.
  const canon12 = ['Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt', 'West Oakland', 'Laurel',
                   'Rockridge', 'Jack London', 'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'];
  return canon12[hashSeed(seed + '|nbhd-fallback') % canon12.length];
}

// ───────────────────────────────────────────────────────────────────────────
// Orchestrator
// ───────────────────────────────────────────────────────────────────────────

function deriveCitizenProfile(seed, age, neighborhood, ledgerFreq, options) {
  options = options || {};
  const safeNbhd = lookupNeighborhood(neighborhood, seed, ledgerFreq);
  const roleType = options.roleTypeOverride || deriveRoleType(seed, safeNbhd, ledgerFreq);
  const income = lookupIncome(roleType);
  const careerStage = computeCareerStage(seed, age, roleType);
  const maritalStatus = deriveMaritalStatus(seed, age);

  return {
    RoleType: roleType,
    EducationLevel: deriveEducationLevel(seed, safeNbhd, age, ledgerFreq),
    Gender: options.genderOverride || deriveGender(seed, safeNbhd),
    YearsInCareer: deriveYearsInCareer(seed, age, careerStage),
    DebtLevel: deriveDebtLevel(seed, age, income),
    NetWorth: deriveNetWorth(seed, age, income, careerStage),
    MaritalStatus: maritalStatus,
    NumChildren: deriveNumChildren(seed, age, maritalStatus),
    // Computed inline, not written to ledger but useful for downstream:
    _careerStage: careerStage,
    _income: income,
    _neighborhood: safeNbhd,
  };
}

module.exports = {
  // Per-field
  deriveRoleType,
  deriveEducationLevel,
  deriveGender,
  deriveYearsInCareer,
  deriveDebtLevel,
  deriveNetWorth,
  deriveMaritalStatus,
  deriveNumChildren,
  // Helpers
  hashSeed,
  rand01,
  pickFromCDF,
  ageBracket,
  lookupIncome,
  computeCareerStage,
  lookupNeighborhood,
  buildLedgerFreqSnapshot,
  // Orchestrator
  deriveCitizenProfile,
  // Constants (for testing / inspection)
  ECONOMIC_PARAMETERS,
  CANONICAL_ROLES,
  DEMOGRAPHIC_VOICE_FALLBACK,
  EDUCATION_LEVELS,
  ANCHOR_YEAR,
};
