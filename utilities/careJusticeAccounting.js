/**
 * careJusticeAccounting.js — engine.254 Task 3
 *
 * Pure census arithmetic for the care and justice system. No sheet access, no
 * ctx, no rng: receipts and counts in, Care_Justice_Census rows out. Input
 * generation (Tasks 4–7) and persistence (Task 8) live elsewhere.
 *
 * Specification: docs/plans/2026-09-21-care-and-justice-system.md §Schema.
 */

var CARE_JUSTICE_METHOD_VERSION = 'cj-1';

var CARE_JUSTICE_CENSUS_HEADERS = [
  'Cycle', 'System', 'GeographicScope', 'Neighborhood', 'IntakeType',
  'PopulationBasis', 'CoveredPopulation', 'MethodVersion', 'Completeness',
  'TotalIntakes', 'TrackedIntakes', 'OtherResidentIntakes',
  'OccupancyMeasure', 'OpeningOccupancy', 'ClosingOccupancy',
  'TrackedOccupancy', 'OtherResidentOccupancy', 'BedsOccupied',
  'TransfersIn', 'TransfersOut', 'Exits', 'Corrections'
];

var CARE_JUSTICE_TYPES = {
  hospital: ['injury', 'illness', 'heat', 'mental-health-crisis', 'substance-treatment', 'unclassified'],
  judicial: ['arrest']
};

var CARE_JUSTICE_MEASURE = { hospital: 'in-care', judicial: 'in-custody' };

// Gate R2: only these two states occupy an inpatient bed.
var CARE_JUSTICE_BED_STATES = ['hospitalized', 'critical'];

var CARE_JUSTICE_BASIS = {
  neighborhood: 'hood-table', unallocated: 'city-remainder', city: 'city-total'
};

var CARE_JUSTICE_COUNT_FIELDS = [
  'TotalIntakes', 'TrackedIntakes', 'OtherResidentIntakes',
  'OpeningOccupancy', 'ClosingOccupancy', 'TrackedOccupancy',
  'OtherResidentOccupancy', 'BedsOccupied',
  'TransfersIn', 'TransfersOut', 'Exits', 'Corrections'
];

// Receipt kinds and the census column each one moves.
var CARE_JUSTICE_KIND_FIELD = {
  'intake': 'intakes',
  'transfer-in': 'transfersIn',
  'transfer-out': 'transfersOut',
  'exit': 'exits',
  'correction': 'corrections'
};

function careJusticeIntakeType_(system, raw) {
  var types = CARE_JUSTICE_TYPES[system];
  var t = String(raw === undefined || raw === null ? '' : raw).trim();
  if (system === 'hospital' && t === '') return 'unclassified'; // legacy rows, never inferred
  if (!types || types.indexOf(t) < 0) {
    throw new Error('careJusticeAccounting: unknown IntakeType "' + raw + '" for system "' + system + '"');
  }
  return t;
}

/**
 * Drop receipts already folded. A receipt is one movement of one person; its
 * identity is SourceEventId + kind, so a transfer-out and the transfer-in it
 * causes share a SourceEventId without colliding. `transition` receipts (a
 * change of state inside an open row) are dropped here: they move no count.
 *
 * @param {Array} receipts
 * @param {Object} seen  map of keys persisted by earlier Cycles/runs (not mutated)
 * @return {{receipts: Array, duplicates: number, transitions: number, keys: Object}}
 */
function foldCareJusticeReceipts_(receipts, seen) {
  var keys = {};
  var prior = seen || {};
  for (var p in prior) if (prior.hasOwnProperty(p)) keys[p] = true;

  var out = [], duplicates = 0, transitions = 0;
  for (var i = 0; i < (receipts || []).length; i++) {
    var r = receipts[i];
    if (r.kind === 'transition') { transitions++; continue; }
    if (!CARE_JUSTICE_KIND_FIELD.hasOwnProperty(r.kind)) {
      throw new Error('careJusticeAccounting: unknown receipt kind "' + r.kind + '"');
    }
    if (!r.sourceEventId) {
      throw new Error('careJusticeAccounting: receipt without SourceEventId (' + r.system + '/' + r.kind + ')');
    }
    var key = r.system + '|' + r.kind + '|' + r.sourceEventId;
    if (keys[key]) { duplicates++; continue; }
    keys[key] = true;
    out.push(r);
  }
  return { receipts: out, duplicates: duplicates, transitions: transitions, keys: keys };
}

function careJusticeCellKey_(system, scope, neighborhood, intakeType) {
  return system + '|' + scope + '|' + (neighborhood || '') + '|' + intakeType;
}

function careJusticeBlankCell_() {
  return {
    trackedIntakes: 0, otherIntakes: 0,
    openingTracked: 0, openingOther: 0,
    closingOther: 0, otherGiven: false,
    trackedOpen: 0, trackedBeds: 0, otherBeds: 0,
    intakes: 0, transfersIn: 0, transfersOut: 0, exits: 0, corrections: 0,
    otherMoves: { transfersIn: 0, transfersOut: 0, exits: 0, corrections: 0 }
  };
}

/**
 * Build one Cycle's census rows.
 *
 * input = {
 *   cycle: Number,
 *   scopes: [{ scope: 'neighborhood'|'unallocated', neighborhood: String, coveredPopulation: Number }],
 *   sources: { hospital: 'ok'|'missing', judicial: 'ok'|'missing' },
 *   receipts: [{ system, kind, sourceEventId, popId, neighborhood, intakeType }],   // tracked citizens
 *   seenKeys: Object,                                                               // from earlier Cycles
 *   trackedOpen: [{ system, popId, neighborhood, intakeType, statusNow }],          // ledger rows open at close
 *   opening: { <cellKey>: { tracked: Number, other: Number } },                     // last Cycle's closing
 *   otherResident: [{ system, scope, neighborhood, intakeType, intakes, exits,
 *                     transfersIn, transfersOut, corrections, beds }],              // numbers only, no people
 *   incomplete: { hospital: Boolean, judicial: Boolean }                            // a write in the set failed
 * }
 *
 * Tracked citizens whose neighborhood is not a scope in the table are counted
 * in `unallocated` — counted once, never dropped, never given a new hood.
 *
 * @return {{rows: Array, duplicates: number, transitions: number, keys: Object}}
 */
function buildCareJusticeCensus_(input) {
  var cycle = input.cycle;
  var sources = input.sources || {};
  var incomplete = input.incomplete || {};
  var opening = input.opening || {};

  var scopes = [], hoodNames = {}, hasUnallocated = false, cityPop = 0;
  for (var s = 0; s < (input.scopes || []).length; s++) {
    var sc = input.scopes[s];
    if (sc.scope !== 'neighborhood' && sc.scope !== 'unallocated') {
      throw new Error('careJusticeAccounting: scope "' + sc.scope + '" is not a disjoint scope (city is derived)');
    }
    if (!(Number(sc.coveredPopulation) >= 0)) {
      throw new Error('careJusticeAccounting: CoveredPopulation missing for ' + sc.scope + ' ' + (sc.neighborhood || ''));
    }
    if (sc.scope === 'neighborhood') hoodNames[sc.neighborhood] = true;
    else hasUnallocated = true;
    cityPop += Number(sc.coveredPopulation);
    scopes.push({ scope: sc.scope, neighborhood: sc.scope === 'neighborhood' ? sc.neighborhood : '',
                  coveredPopulation: Number(sc.coveredPopulation) });
  }
  if (!hasUnallocated) {
    throw new Error('careJusticeAccounting: the unallocated scope is required (city population minus the hood table)');
  }

  function placeOf(neighborhood) {
    return hoodNames[neighborhood]
      ? { scope: 'neighborhood', neighborhood: neighborhood }
      : { scope: 'unallocated', neighborhood: '' };
  }

  var cells = {};
  function cell(system, scope, neighborhood, type) {
    var k = careJusticeCellKey_(system, scope, neighborhood, type);
    if (!cells[k]) cells[k] = careJusticeBlankCell_();
    return cells[k];
  }

  var folded = foldCareJusticeReceipts_(input.receipts, input.seenKeys);

  for (var r = 0; r < folded.receipts.length; r++) {
    var rc = folded.receipts[r];
    var at = placeOf(rc.neighborhood);
    var c = cell(rc.system, at.scope, at.neighborhood, careJusticeIntakeType_(rc.system, rc.intakeType));
    if (rc.kind === 'intake') { c.trackedIntakes++; c.intakes++; }
    else c[CARE_JUSTICE_KIND_FIELD[rc.kind]]++;
  }

  var open = input.trackedOpen || [];
  for (var o = 0; o < open.length; o++) {
    var op = open[o];
    var oat = placeOf(op.neighborhood);
    var oc = cell(op.system, oat.scope, oat.neighborhood, careJusticeIntakeType_(op.system, op.intakeType));
    oc.trackedOpen++;
    if (op.system === 'hospital' &&
        CARE_JUSTICE_BED_STATES.indexOf(String(op.statusNow || '').toLowerCase()) >= 0) oc.trackedBeds++;
  }

  var other = input.otherResident || [];
  for (var x = 0; x < other.length; x++) {
    var ot = other[x];
    if (ot.scope !== 'neighborhood' && ot.scope !== 'unallocated') {
      throw new Error('careJusticeAccounting: other-resident demand must name a disjoint scope');
    }
    if (ot.scope === 'neighborhood' && !hoodNames[ot.neighborhood]) {
      throw new Error('careJusticeAccounting: other-resident demand for unknown neighborhood "' + ot.neighborhood + '"');
    }
    var xc = cell(ot.system, ot.scope, ot.scope === 'neighborhood' ? ot.neighborhood : '',
                  careJusticeIntakeType_(ot.system, ot.intakeType));
    var n = Number(ot.intakes) || 0;
    xc.otherIntakes += n; xc.intakes += n;
    var moves = ['transfersIn', 'transfersOut', 'exits', 'corrections'];
    for (var m = 0; m < moves.length; m++) {
      var mv = Number(ot[moves[m]]) || 0;
      xc[moves[m]] += mv; xc.otherMoves[moves[m]] += mv;
    }
    xc.otherBeds += Number(ot.beds) || 0;
  }

  var rows = [];
  var systems = ['hospital', 'judicial'];

  for (var sy = 0; sy < systems.length; sy++) {
    var system = systems[sy];
    var types = CARE_JUSTICE_TYPES[system];
    var unavailable = sources[system] !== 'ok';
    var cityByType = {};

    for (var d = 0; d < scopes.length; d++) {
      var scp = scopes[d];
      var allRow = careJusticeRow_(cycle, system, scp.scope, scp.neighborhood, 'all', scp.coveredPopulation);
      var scopeIncomplete = !!incomplete[system];
      var typed = [];

      for (var t = 0; t < types.length; t++) {
        var type = types[t];
        var row = careJusticeRow_(cycle, system, scp.scope, scp.neighborhood, type, scp.coveredPopulation);
        if (!unavailable) {
          var k = careJusticeCellKey_(system, scp.scope, scp.neighborhood, type);
          var ce = cells[k] || careJusticeBlankCell_();
          var op0 = opening[k] || { tracked: 0, other: 0 };
          var openTracked = Number(op0.tracked) || 0, openOther = Number(op0.other) || 0;

          var otherClosing = openOther + ce.otherIntakes + ce.otherMoves.transfersIn -
            ce.otherMoves.exits - ce.otherMoves.transfersOut + ce.otherMoves.corrections;
          var trackedClosing = openTracked + ce.trackedIntakes +
            (ce.transfersIn - ce.otherMoves.transfersIn) - (ce.exits - ce.otherMoves.exits) -
            (ce.transfersOut - ce.otherMoves.transfersOut) + (ce.corrections - ce.otherMoves.corrections);

          // The ledger's open rows are the authority for tracked citizens. A
          // movement sum that disagrees means a receipt or a write was lost.
          if (trackedClosing !== ce.trackedOpen || otherClosing < 0 || trackedClosing < 0) scopeIncomplete = true;

          row.TrackedIntakes = ce.trackedIntakes;
          row.OtherResidentIntakes = ce.otherIntakes;
          row.TotalIntakes = ce.trackedIntakes + ce.otherIntakes;
          row.OpeningOccupancy = openTracked + openOther;
          row.TrackedOccupancy = trackedClosing;
          row.OtherResidentOccupancy = otherClosing;
          row.ClosingOccupancy = trackedClosing + otherClosing;
          row.BedsOccupied = system === 'hospital' ? ce.trackedBeds + ce.otherBeds : '';
          row.TransfersIn = ce.transfersIn;
          row.TransfersOut = ce.transfersOut;
          row.Exits = ce.exits;
          row.Corrections = ce.corrections;
          careJusticeAdd_(allRow, row);
        }
        typed.push(row);
      }

      typed.push(allRow);
      for (var w = 0; w < typed.length; w++) {
        var tr = typed[w];
        tr.Completeness = unavailable ? 'unavailable' : (scopeIncomplete ? 'incomplete' : 'complete');
        if (unavailable) careJusticeBlank_(tr);
        rows.push(tr);
        if (!cityByType[tr.IntakeType]) {
          cityByType[tr.IntakeType] = careJusticeRow_(cycle, system, 'city', '', tr.IntakeType, cityPop);
          cityByType[tr.IntakeType].Completeness = 'complete';
        }
        var cr = cityByType[tr.IntakeType];
        if (unavailable) { cr.Completeness = 'unavailable'; careJusticeBlank_(cr); }
        else {
          careJusticeAdd_(cr, tr);
          if (tr.Completeness === 'incomplete') cr.Completeness = 'incomplete';
        }
      }
    }

    var order = types.concat(['all']);
    for (var ci = 0; ci < order.length; ci++) rows.push(cityByType[order[ci]]);
  }

  return { rows: rows, duplicates: folded.duplicates, transitions: folded.transitions, keys: folded.keys };
}

function careJusticeRow_(cycle, system, scope, neighborhood, type, coveredPopulation) {
  var row = {
    Cycle: cycle, System: system, GeographicScope: scope, Neighborhood: neighborhood || '',
    IntakeType: type, PopulationBasis: CARE_JUSTICE_BASIS[scope],
    CoveredPopulation: coveredPopulation, MethodVersion: CARE_JUSTICE_METHOD_VERSION,
    Completeness: '', OccupancyMeasure: CARE_JUSTICE_MEASURE[system]
  };
  for (var i = 0; i < CARE_JUSTICE_COUNT_FIELDS.length; i++) row[CARE_JUSTICE_COUNT_FIELDS[i]] = 0;
  if (system !== 'hospital') row.BedsOccupied = '';
  return row;
}

function careJusticeAdd_(into, from) {
  for (var i = 0; i < CARE_JUSTICE_COUNT_FIELDS.length; i++) {
    var f = CARE_JUSTICE_COUNT_FIELDS[i];
    if (from[f] === '' || into[f] === '') continue;
    into[f] += from[f];
  }
}

// Unavailable is not zero: counts are blank.
function careJusticeBlank_(row) {
  for (var i = 0; i < CARE_JUSTICE_COUNT_FIELDS.length; i++) row[CARE_JUSTICE_COUNT_FIELDS[i]] = '';
}

/**
 * Check invariants A, B and C on a set of census rows for one Cycle.
 * @return {Array<String>} violations; empty when the books balance
 */
function validateCareJusticeCensus_(rows) {
  var bad = [];
  var sums = {}, city = {};

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var id = r.System + '/' + r.GeographicScope + '/' + (r.Neighborhood || '-') + '/' + r.IntakeType;
    var key = r.System + '|' + r.IntakeType;

    if (r.Completeness === 'unavailable') {
      for (var b = 0; b < CARE_JUSTICE_COUNT_FIELDS.length; b++) {
        if (r[CARE_JUSTICE_COUNT_FIELDS[b]] !== '') {
          bad.push('G ' + id + ': unavailable row carries a count in ' + CARE_JUSTICE_COUNT_FIELDS[b]);
          break;
        }
      }
      if (r.GeographicScope !== 'city') sums[key] = 'unavailable';
      else city[key] = r;
      continue;
    }

    if (r.TotalIntakes !== r.TrackedIntakes + r.OtherResidentIntakes) bad.push('A ' + id);
    if (r.ClosingOccupancy !== r.OpeningOccupancy + r.TotalIntakes + r.TransfersIn -
        r.Exits - r.TransfersOut + r.Corrections) bad.push('B ' + id);
    if (r.ClosingOccupancy !== r.TrackedOccupancy + r.OtherResidentOccupancy) bad.push('B-split ' + id);
    if (r.BedsOccupied !== '' && r.BedsOccupied > r.ClosingOccupancy) bad.push('J ' + id + ': more beds than people in care');

    if (r.GeographicScope === 'city') { city[key] = r; continue; }
    if (sums[key] === 'unavailable') continue;
    if (!sums[key]) { sums[key] = {}; for (var z = 0; z < CARE_JUSTICE_COUNT_FIELDS.length; z++) sums[key][CARE_JUSTICE_COUNT_FIELDS[z]] = 0; }
    for (var f = 0; f < CARE_JUSTICE_COUNT_FIELDS.length; f++) {
      var fld = CARE_JUSTICE_COUNT_FIELDS[f];
      if (r[fld] !== '') sums[key][fld] += r[fld];
    }
  }

  for (var k in sums) {
    if (!sums.hasOwnProperty(k)) continue;
    var c = city[k];
    if (!c) { bad.push('C ' + k + ': no city row'); continue; }
    if (sums[k] === 'unavailable') {
      if (c.Completeness !== 'unavailable') bad.push('C ' + k + ': city total labelled available over a missing scope');
      continue;
    }
    for (var g = 0; g < CARE_JUSTICE_COUNT_FIELDS.length; g++) {
      var cf = CARE_JUSTICE_COUNT_FIELDS[g];
      if (c[cf] === '') continue;
      if (c[cf] !== sums[k][cf]) bad.push('C ' + k + ': city ' + cf + ' ' + c[cf] + ' != scopes ' + sums[k][cf]);
    }
  }
  return bad;
}

function careJusticeCensusRowValues_(row) {
  var out = [];
  for (var i = 0; i < CARE_JUSTICE_CENSUS_HEADERS.length; i++) out.push(row[CARE_JUSTICE_CENSUS_HEADERS[i]]);
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CARE_JUSTICE_METHOD_VERSION: CARE_JUSTICE_METHOD_VERSION,
    CARE_JUSTICE_CENSUS_HEADERS: CARE_JUSTICE_CENSUS_HEADERS,
    CARE_JUSTICE_TYPES: CARE_JUSTICE_TYPES,
    CARE_JUSTICE_BED_STATES: CARE_JUSTICE_BED_STATES,
    careJusticeCellKey_: careJusticeCellKey_,
    foldCareJusticeReceipts_: foldCareJusticeReceipts_,
    buildCareJusticeCensus_: buildCareJusticeCensus_,
    validateCareJusticeCensus_: validateCareJusticeCensus_,
    careJusticeCensusRowValues_: careJusticeCensusRowValues_
  };
}
