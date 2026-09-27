/**
 * citizenDerivation.js — intake-side citizen derivation library (Apps Script)
 *
 * Plan: docs/archive/plans/2026-04-28-intake-side-citizen-derivation.md
 * Sister: lib/citizenDerivation.js (Node — same per-field algorithms)
 *
 * Purpose: when a new citizen is created at intake, derive realistic values for
 * 8 demographic + lifecycle fields (RoleType, EducationLevel, Gender,
 * YearsInCareer, DebtLevel, NetWorth, MaritalStatus, NumChildren) instead of
 * leaving them blank or seeding hardcoded sentinels.
 *
 * Determinism: djb2 hash on (first|last|popId) seed. Same seed always gets
 * same values across runs. Apps Script-safe (no Math.random / crypto / Buffer).
 *
 * Brackets used by ageBracket_(): 18-29 | 30-44 | 45-59 | 60-74 | 75+
 *
 * The job catalog (ECONOMIC_PARAMETERS) is read from the Economic_Parameters
 * sheet tab by economicParameters_() — see engine.199 below.
 */

// engine.199: the job catalog has one runtime source — the Economic_Parameters
// sheet tab, read once per execution and held in ECONOMIC_PARAMETERS. The edit
// point is data/economic_parameters.json; `node scripts/syncEconomicParameters.js`
// pushes it to the tab. Declared without an initializer so a harness that seeds
// the catalog before loading this file keeps it.
var ECONOMIC_PARAMETERS;

function economicParameters_() {
  if (ECONOMIC_PARAMETERS && ECONOMIC_PARAMETERS.length) return ECONOMIC_PARAMETERS;
  var sheet = openSimSpreadsheet_().getSheetByName('Economic_Parameters');
  if (!sheet) throw new Error('economicParameters_: Economic_Parameters tab missing — the job catalog has no other source (engine.199).');
  var data = sheet.getDataRange().getValues();
  var h = (data[0] || []).map(function (x) { return String(x).trim(); });
  var col = function (n) { return h.indexOf(n); };
  var iRole = col('Role'), iCat = col('Category'), iMin = col('IncomeMin'), iMax = col('IncomeMax'), iMed = col('MedianIncome');
  if (iRole < 0 || iCat < 0 || iMin < 0 || iMax < 0 || iMed < 0) {
    throw new Error('economicParameters_: Economic_Parameters header is [' + h.join(', ') + '] — needs Role, Category, IncomeMin, IncomeMax, MedianIncome.');
  }
  var iTax = col('EffectiveTaxRate'), iOut = col('EconomicOutputCategory'), iBurden = col('HousingBurdenPct'), iCons = col('ConsumerProfile'), iNotes = col('Notes');
  // A hand-typed "56,000" or "$56K" is a number the tab can't vouch for — fail loud
  // naming the cell, never strip-and-guess. Optional columns: blank reads null.
  var num = function (r, c, name, optional) {
    var v = data[r][c];
    if (optional && (v === '' || v == null)) return null;
    var n = typeof v === 'number' ? v : Number(v);
    if (v === '' || v == null || !isFinite(n)) {
      throw new Error('economicParameters_: Economic_Parameters row ' + (r + 1) + ' ' + name + ' is ' + JSON.stringify(v) + ', not a number.');
    }
    return n;
  };
  var out = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r], role = String(row[iRole] || '').trim();
    if (!role) continue;
    out.push({
      role: role,
      category: String(row[iCat] || '').trim(),
      incomeRange: [num(r, iMin, 'IncomeMin'), num(r, iMax, 'IncomeMax')],
      medianIncome: num(r, iMed, 'MedianIncome'),
      effectiveTaxRate: iTax >= 0 ? num(r, iTax, 'EffectiveTaxRate', true) : null,
      economicOutputCategory: iOut >= 0 ? String(row[iOut] || '') : '',
      housingBurdenPct: iBurden >= 0 ? num(r, iBurden, 'HousingBurdenPct', true) : null,
      consumerProfile: iCons >= 0 ? String(row[iCons] || '') : '',
      notes: iNotes >= 0 ? String(row[iNotes] || '') : ''
    });
  }
  if (!out.length) throw new Error('economicParameters_: Economic_Parameters tab has no roles.');
  ECONOMIC_PARAMETERS = out;
  Logger.log('Economic_Parameters: loaded ' + out.length + ' roles');
  return out;
}

var BASE_FEMALE_PCT_ = 0.51;

// engine.148 P2: the per-neighborhood gender table is gone (20 keys, 3 stale, 5
// tracked hoods missing — a ±0.03 texture nobody could author for 22 hoods).
// Every hood draws at BASE_FEMALE_PCT_; the signature keeps `neighborhood`.

var FALLBACK_INCOME_ = 60000;
var EDUCATION_LEVELS_ = ['hs-diploma', 'bachelors', 'masters', 'associates', 'trade-cert', 'doctorate'];

// Demographic-voice fallback pool — mirrors processAdvancementIntake.js Path B.
// Kept in sync manually; if Path B pool changes, update here too.
var DEMOGRAPHIC_VOICE_FALLBACK_ = [
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

// Build canonical-roles index lazily on first use.
var CANONICAL_ROLES_CACHE_ = null;
function canonicalRolesSet_() {
  if (CANONICAL_ROLES_CACHE_) return CANONICAL_ROLES_CACHE_;
  var s = {}, E = economicParameters_();
  for (var i = 0; i < E.length; i++) {
    s[E[i].role] = true;
  }
  CANONICAL_ROLES_CACHE_ = s;
  return s;
}

// ───────────────────────────────────────────────────────────────────────────
// Internal helpers
// ───────────────────────────────────────────────────────────────────────────

function hashSeed_(s) {
  var h = 5381;
  s = String(s || '');
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function rand01_(seed, salt) {
  return (hashSeed_(seed + '|' + salt) % 1000000) / 1000000;
}

function pickFromCDF_(r, cdf) {
  for (var i = 0; i < cdf.length; i++) {
    if (r < cdf[i][1]) return cdf[i][0];
  }
  return cdf[cdf.length - 1][0];
}

function ageBracket_(age) {
  if (age < 30) return '18-29';
  if (age < 45) return '30-44';
  if (age < 60) return '45-59';
  if (age < 75) return '60-74';
  return '75+';
}

function lookupIncome_(roleType) {
  if (!roleType) return FALLBACK_INCOME_;
  var E = economicParameters_();
  for (var i = 0; i < E.length; i++) {
    if (E[i].role === roleType) return E[i].medianIncome;
  }
  return FALLBACK_INCOME_;
}

function computeCareerStage_(seed, age, roleType) {
  if (age >= 65) return 'retired';
  if (age < 25) return 'early';
  if (age < 40) return 'mid';
  if (age < 55) return rand01_(seed, 'career') < 0.3 ? 'senior' : 'mid';
  return 'senior';
}

// ───────────────────────────────────────────────────────────────────────────
// Ledger frequency snapshot — built once per intake batch
// ───────────────────────────────────────────────────────────────────────────

function buildLedgerFreqSnapshot_(headers, data, options) {
  options = options || {};
  var includesHeader = options.includesHeader === true;
  var simYear = Number(options.simYear); // the calendar's year for the age brackets (2026-09-07: was a 2041 literal)
  if (!(simYear > 0)) throw new Error('buildLedgerFreqSnapshot_: options.simYear required');
  var startRow = includesHeader ? 1 : 0;

  var iNbhd = headers.indexOf('Neighborhood');
  var iRole = headers.indexOf('RoleType');
  var iEdu = headers.indexOf('EducationLevel');
  var iBirth = headers.indexOf('BirthYear');

  var byNeighborhood = {};
  var citywide = { roleTypes: {}, educationByAge: {} };

  for (var r = startRow; r < data.length; r++) {
    var row = data[r];
    if (!row) continue;
    var nbhd = iNbhd >= 0 ? String(row[iNbhd] || '').trim() : '';
    var role = iRole >= 0 ? String(row[iRole] || '').trim() : '';
    var edu = iEdu >= 0 ? String(row[iEdu] || '').trim() : '';
    var birthYear = iBirth >= 0 ? Number(row[iBirth]) : null;

    if (role) citywide.roleTypes[role] = (citywide.roleTypes[role] || 0) + 1;
    if (edu && birthYear) {
      var bracket = ageBracket_(simYear - birthYear);
      if (!citywide.educationByAge[bracket]) citywide.educationByAge[bracket] = {};
      citywide.educationByAge[bracket][edu] = (citywide.educationByAge[bracket][edu] || 0) + 1;
    }

    if (nbhd) {
      if (!byNeighborhood[nbhd]) byNeighborhood[nbhd] = { roleTypes: {}, educationByAge: {} };
      var bucket = byNeighborhood[nbhd];
      if (role) bucket.roleTypes[role] = (bucket.roleTypes[role] || 0) + 1;
      if (edu && birthYear) {
        var bracket2 = ageBracket_(simYear - birthYear);
        if (!bucket.educationByAge[bracket2]) bucket.educationByAge[bracket2] = {};
        bucket.educationByAge[bracket2][edu] = (bucket.educationByAge[bracket2][edu] || 0) + 1;
      }
    }
  }

  return { byNeighborhood: byNeighborhood, citywide: citywide };
}

function freqWeightedDraw_(r, counts) {
  var total = 0;
  var keys = Object.keys(counts);
  for (var i = 0; i < keys.length; i++) total += counts[keys[i]];
  if (total === 0) return null;
  var target = r * total;
  var acc = 0;
  for (var j = 0; j < keys.length; j++) {
    acc += counts[keys[j]];
    if (target < acc) return keys[j];
  }
  return keys[keys.length - 1];
}

function freqWeightedDrawCanonical_(r, counts) {
  var canonical = canonicalRolesSet_();
  var filtered = {};
  var keys = Object.keys(counts);
  for (var i = 0; i < keys.length; i++) {
    if (canonical[keys[i]]) filtered[keys[i]] = counts[keys[i]];
  }
  return freqWeightedDraw_(r, filtered);
}

// ───────────────────────────────────────────────────────────────────────────
// Per-field derivations
// ───────────────────────────────────────────────────────────────────────────

function deriveRoleType_(seed, neighborhood, ledgerFreq) {
  var r = rand01_(seed, 'role');
  var minEntriesNeighborhood = 10;

  var nbhdBucket = ledgerFreq && ledgerFreq.byNeighborhood && ledgerFreq.byNeighborhood[neighborhood];
  if (nbhdBucket && Object.keys(nbhdBucket.roleTypes).length >= minEntriesNeighborhood) {
    var drawn = freqWeightedDrawCanonical_(r, nbhdBucket.roleTypes);
    if (drawn) return drawn;
  }

  var citywide = ledgerFreq && ledgerFreq.citywide && ledgerFreq.citywide.roleTypes;
  if (citywide) {
    var drawn2 = freqWeightedDrawCanonical_(r, citywide);
    if (drawn2) return drawn2;
  }

  return DEMOGRAPHIC_VOICE_FALLBACK_[hashSeed_(seed + '|fallback') % DEMOGRAPHIC_VOICE_FALLBACK_.length];
}

function sanitizeEduCounts_(counts) {
  var out = {};
  var keys = Object.keys(counts);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (!k || k === '-') continue;
    var found = false;
    for (var j = 0; j < EDUCATION_LEVELS_.length; j++) {
      if (EDUCATION_LEVELS_[j] === k) { found = true; break; }
    }
    if (found) out[k] = counts[k];
  }
  return out;
}

function deriveEducationLevel_(seed, neighborhood, age, ledgerFreq) {
  var r = rand01_(seed, 'edu');
  var bracket = ageBracket_(age);
  var minEntries = 5;

  var nbhdBucket = ledgerFreq && ledgerFreq.byNeighborhood && ledgerFreq.byNeighborhood[neighborhood];
  var nbhdAgeBucket = nbhdBucket && nbhdBucket.educationByAge && nbhdBucket.educationByAge[bracket];
  if (nbhdAgeBucket && Object.keys(nbhdAgeBucket).length >= minEntries) {
    var drawn = freqWeightedDraw_(r, sanitizeEduCounts_(nbhdAgeBucket));
    if (drawn) return drawn;
  }

  var citywideAge = ledgerFreq && ledgerFreq.citywide && ledgerFreq.citywide.educationByAge && ledgerFreq.citywide.educationByAge[bracket];
  if (citywideAge) {
    var drawn2 = freqWeightedDraw_(r, sanitizeEduCounts_(citywideAge));
    if (drawn2) return drawn2;
  }

  return 'hs-diploma';
}

function deriveGender_(seed, neighborhood) {
  var p = BASE_FEMALE_PCT_; // engine.148 P2 — neighborhood no longer tilts the draw
  return rand01_(seed, 'gender') < p ? 'female' : 'male';
}

function deriveYearsInCareer_(seed, age, careerStage) {
  var r = rand01_(seed, 'YearsInCareer');
  var stage = String(careerStage || '').toLowerCase();

  if (stage === 'retired') {
    return Math.round((35 + r * 10) * 10) / 10;
  }
  var minStart = 18;
  var maxYears = Math.max(0, age - minStart);
  if (maxYears <= 0) return 0;

  var center = maxYears * 0.55;
  var span = maxYears * 0.35;
  var draw = center + span * (r - 0.5) * 2;
  return Math.round(Math.max(0.5, Math.min(maxYears, draw)) * 10) / 10;
}

function deriveDebtLevel_(seed, age, income) {
  var r = rand01_(seed, 'DebtLevel');
  var inc = Number(income) || 0;

  var base;
  if (inc < 40000) base = 5;
  else if (inc < 100000) base = 3;
  else if (inc < 250000) base = 2;
  else base = 1;

  if (age >= 18 && age < 30) base += 1.5;
  else if (age >= 65) base -= 1.5;

  var wobble = (r - 0.5) * 4;
  return Math.round(Math.max(0, Math.min(10, base + wobble)));
}

function deriveNetWorth_(seed, age, income, careerStage) {
  var r = rand01_(seed, 'NetWorth');
  var inc = Number(income) || 0;
  var stage = String(careerStage || '').toLowerCase();

  var ageBase;
  if (age < 25) ageBase = 8000;
  else if (age < 35) ageBase = 60000;
  else if (age < 50) ageBase = 200000;
  else if (age < 65) ageBase = 450000;
  else ageBase = 600000;

  var incMult = 1.0;
  if (inc > 100000) incMult = 1.5;
  if (inc > 250000) incMult = 3.0;
  if (inc > 500000) incMult = 7.0;
  if (inc > 1000000) incMult = 15.0;

  if (stage === 'retired') incMult *= 1.4;

  var wobble = 0.4 + r * 2.1;
  var raw = ageBase * incMult * wobble;
  return Math.round(raw / 1000) * 1000;
}

function deriveMaritalStatus_(seed, age) {
  var r = rand01_(seed, 'MaritalStatus');
  var bracket = ageBracket_(age);

  var CDF = {
    '18-29': [['single', 0.60], ['partnered', 0.78], ['married', 0.98], ['divorced', 1.00]],
    '30-44': [['single', 0.24], ['partnered', 0.35], ['married', 0.91], ['divorced', 1.00]],
    '45-59': [['single', 0.12], ['partnered', 0.17], ['married', 0.73], ['divorced', 0.96], ['widowed', 1.00]],
    '60-74': [['single', 0.09], ['partnered', 0.12], ['married', 0.61], ['divorced', 0.86], ['widowed', 1.00]],
    '75+':   [['single', 0.06], ['partnered', 0.08], ['married', 0.44], ['divorced', 0.64], ['widowed', 1.00]]
  };
  return pickFromCDF_(r, CDF[bracket]);
}

function deriveNumChildren_(seed, age, maritalStatus) {
  var r = rand01_(seed, 'NumChildren');
  var ms = String(maritalStatus || '').toLowerCase();
  var partnered = ms === 'married' || ms === 'partnered';
  var bracket = ageBracket_(age);

  var CDF = {
    '18-29-single':    [[0, 0.85], [1, 0.96], [2, 1.00]],
    '18-29-partnered': [[0, 0.62], [1, 0.85], [2, 0.95], [3, 1.00]],
    '30-44-single':    [[0, 0.65], [1, 0.84], [2, 0.94], [3, 1.00]],
    '30-44-partnered': [[0, 0.32], [1, 0.58], [2, 0.82], [3, 0.95], [4, 1.00]],
    '45-59-single':    [[0, 0.45], [1, 0.70], [2, 0.88], [3, 0.97], [4, 1.00]],
    '45-59-partnered': [[0, 0.16], [1, 0.40], [2, 0.72], [3, 0.90], [4, 0.98], [5, 1.00]],
    '60-74-single':    [[0, 0.35], [1, 0.60], [2, 0.82], [3, 0.94], [4, 1.00]],
    '60-74-partnered': [[0, 0.14], [1, 0.36], [2, 0.66], [3, 0.86], [4, 0.96], [5, 1.00]],
    '75+-single':      [[0, 0.32], [1, 0.56], [2, 0.78], [3, 0.92], [4, 1.00]],
    '75+-partnered':   [[0, 0.13], [1, 0.34], [2, 0.64], [3, 0.85], [4, 0.96], [5, 1.00]]
  };
  var key = bracket + '-' + (partnered ? 'partnered' : 'single');
  return pickFromCDF_(r, CDF[key]);
}

function lookupNeighborhood_(provided, seed, ledgerFreq) {
  var trimmed = provided ? String(provided).trim() : '';
  if (trimmed && trimmed !== 'Engine' && trimmed !== 'Generational') {
    return trimmed;
  }
  var freq = {};
  if (ledgerFreq && ledgerFreq.byNeighborhood) {
    var keys = Object.keys(ledgerFreq.byNeighborhood);
    for (var i = 0; i < keys.length; i++) {
      var bucket = ledgerFreq.byNeighborhood[keys[i]];
      var total = 0;
      var roleKeys = Object.keys(bucket.roleTypes || {});
      for (var j = 0; j < roleKeys.length; j++) total += bucket.roleTypes[roleKeys[j]];
      if (total > 0) freq[keys[i]] = total;
    }
  }
  var r = rand01_(seed, 'neighborhood');
  var drawn = freqWeightedDraw_(r, freq);
  if (drawn) return drawn;

  // engine.99 Cohort 2 — fail loud, no embedded list (ADR-0016). This library is
  // deliberately ctx-free (deterministic from seed), so it cannot read the
  // canonical set; reaching here means no hood was provided AND the ledger
  // frequency snapshot was empty — there is no truth to draw from. In practice
  // unreachable: the sole caller (processAdvancementIntake_) builds ledgerFreq
  // from the live Simulation_Ledger.
  throw new Error('lookupNeighborhood_: no provided neighborhood and empty ledger frequency snapshot — refusing embedded-list fallback (ADR-0016).');
}

// ───────────────────────────────────────────────────────────────────────────
// Orchestrator — Apps Script intake-side entry point
// ───────────────────────────────────────────────────────────────────────────

function deriveCitizenProfile_(seed, age, neighborhood, ledgerFreq, options) {
  options = options || {};
  var safeNbhd = lookupNeighborhood_(neighborhood, seed, ledgerFreq);
  var roleType = options.roleTypeOverride || deriveRoleType_(seed, safeNbhd, ledgerFreq);
  var income = lookupIncome_(roleType);
  var careerStage = computeCareerStage_(seed, age, roleType);
  var maritalStatus = deriveMaritalStatus_(seed, age);

  return {
    RoleType: roleType,
    EducationLevel: deriveEducationLevel_(seed, safeNbhd, age, ledgerFreq),
    Gender: options.genderOverride || deriveGender_(seed, safeNbhd),
    YearsInCareer: deriveYearsInCareer_(seed, age, careerStage),
    DebtLevel: deriveDebtLevel_(seed, age, income),
    NetWorth: deriveNetWorth_(seed, age, income, careerStage),
    MaritalStatus: maritalStatus,
    NumChildren: deriveNumChildren_(seed, age, maritalStatus),
    _careerStage: careerStage,
    _income: income,
    _neighborhood: safeNbhd
  };
}
