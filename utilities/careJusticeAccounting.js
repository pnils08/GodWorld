/**
 * careJusticeAccounting.js — engine.254 Tasks 3 and 8
 *
 * Pure census arithmetic for the care and justice system. No sheet access, no
 * ctx, no rng: ledger images and counts in, Care_Justice_Census rows out. The
 * sheet I/O is persistCareJusticeCensus_ (phase10-persistence/buildCyclePacket.js).
 *
 * Specification: docs/plans/2026-09-21-care-and-justice-system.md §Schema and
 * §Task 8 cut, Revision 2 — the ledgers are the book, the census is derived
 * from them by Cycle stamp.
 */

var CARE_JUSTICE_METHOD_VERSION = 'cj-2';

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

// The five states a Hospital_Ledger row is open in (in care).
var CARE_JUSTICE_HOSPITAL_OPEN = ['hospitalized', 'critical', 'serious-condition', 'injured', 'recovering'];

// In custody = arrested and not yet resolved. An investigation is not custody.
var CARE_JUSTICE_CUSTODY_STATES = ['pending', 'held'];

// R2-4: the census covers what is counted. `unallocated` is the tracked
// citizens living outside the table hoods; `city` is the sum of what is covered.
var CARE_JUSTICE_BASIS = {
  neighborhood: 'hood-table', unallocated: 'tracked-outside-table', city: 'covered-sum'
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
 *   incomplete: { hospital: Boolean, judicial: Boolean },                           // a write in the set failed
 *   trackedCorrections: { <cellKey>: Number }                                       // signed: derived opening − written closing
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

  var signed = input.trackedCorrections || {};
  for (var sk in signed) {
    if (!signed.hasOwnProperty(sk)) continue;
    var sn = Number(signed[sk]);
    if (!isFinite(sn) || Math.floor(sn) !== sn) {
      throw new Error('careJusticeAccounting: tracked correction for ' + sk + ' must be a whole number');
    }
    if (!cells[sk]) cells[sk] = careJusticeBlankCell_();
    cells[sk].corrections += sn;
  }

  var open = input.trackedOpen || [];
  for (var o = 0; o < open.length; o++) {
    var op = open[o];
    var opState = String(op.statusNow || '').toLowerCase();
    if (op.system === 'judicial' && CARE_JUSTICE_CUSTODY_STATES.indexOf(opState) < 0) continue;
    var oat = placeOf(op.neighborhood);
    var oc = cell(op.system, oat.scope, oat.neighborhood, careJusticeIntakeType_(op.system, op.intakeType));
    oc.trackedOpen++;
    if (op.system === 'hospital' &&
        CARE_JUSTICE_BED_STATES.indexOf(opState) >= 0) oc.trackedBeds++;
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

// ════════════════════════════════════════════════════════════════════════════
// Task 8 Revision 2 — the census derived from the ledgers
// ════════════════════════════════════════════════════════════════════════════

var CARE_JUSTICE_GAP_LIMIT = 8;      // more missing Cycles than this is a broken tab, not a gap
var CARE_JUSTICE_STAY_MAX = 8;       // the tail read holds ten blocks
var CARE_JUSTICE_TAIL_BLOCKS = 10;

// Cells the demand model feeds with other residents: every one is a bed
// admission (hospital) or an arrest into custody (judicial).
var CARE_JUSTICE_MODELLED = { hospital: 'illness', judicial: 'arrest' };

var CARE_JUSTICE_LEDGER_FIELDS = {
  hospital: ['AdmissionId', 'POPID', 'Neighborhood', 'AdmitCycle', 'StatusNow', 'DischargeCycle',
    'IntakeType', 'SourceSystem', 'SourceEventId', 'TransferFromId'],
  judicial: ['CaseId', 'POPID', 'Neighborhood', 'ArrestCycle', 'StatusNow', 'ResolveCycle',
    'Outcome', 'SourceSystem', 'SourceEventId', 'TransferToId']
};

function careJusticeIsBlank_(v) {
  return v === '' || v === null || v === undefined;
}

function careJusticeStay_(raw, key) {
  var n = Number(raw);
  if (careJusticeIsBlank_(raw) || !isFinite(n) || Math.floor(n) !== n || n < 1 || n > CARE_JUSTICE_STAY_MAX) {
    throw new Error('careJusticeCensus: World_Config key "' + key + '" must be a whole number 1–' +
      CARE_JUSTICE_STAY_MAX + ' (got "' + raw + '")');
  }
  return n;
}

function careJusticeLedgerCols_(system, header) {
  var names = CARE_JUSTICE_LEDGER_FIELDS[system], cols = {};
  for (var i = 0; i < names.length; i++) {
    cols[names[i]] = header.indexOf(names[i]);
    if (cols[names[i]] < 0) throw new Error('careJusticeCensus: ' + system + ' ledger header "' + names[i] + '" missing');
  }
  return cols;
}

/**
 * Tracked movements of one Cycle, read from the ledger rows' own Cycle stamps
 * (R2-1). `ledgers[system]` is the tab's values with its header row, or null
 * when the tab could not be read.
 *
 * @return {{receipts, trackedOpen, derivedOpening, duplicates, rowsByEvent, openByPop}}
 */
function deriveCareJusticeMovements_(cycle, ledgers, hoodNames) {
  var out = { receipts: [], trackedOpen: [], derivedOpening: {},
    duplicates: { hospital: 0, judicial: 0 },
    rowsByEvent: { hospital: {}, judicial: {} }, openByPop: { hospital: {}, judicial: {} } };
  var seen = {}, rowSeen = {};

  function cellOf(system, neighborhood, type) {
    return hoodNames[neighborhood]
      ? careJusticeCellKey_(system, 'neighborhood', neighborhood, type)
      : careJusticeCellKey_(system, 'unallocated', '', type);
  }
  function push(system, kind, id, popId, neighborhood, type) {
    var key = system + '|' + kind + '|' + id;
    if (seen[key]) { out.duplicates[system]++; return; }
    seen[key] = true;
    out.receipts.push({ system: system, kind: kind, sourceEventId: id, popId: popId,
      neighborhood: neighborhood, intakeType: type });
  }

  var systems = ['hospital', 'judicial'];
  for (var s = 0; s < systems.length; s++) {
    var system = systems[s];
    var data = ledgers[system];
    if (!data || !data.length) continue;
    var c = careJusticeLedgerCols_(system, data[0]);
    var hospital = system === 'hospital';
    var idCol = hospital ? c.AdmissionId : c.CaseId;
    var inCol = hospital ? c.AdmitCycle : c.ArrestCycle;
    var outCol = hospital ? c.DischargeCycle : c.ResolveCycle;

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      if (careJusticeIsBlank_(row[idCol]) || String(row[idCol]).trim() === '') continue;
      if (careJusticeIsBlank_(row[inCol])) continue; // an investigation: not an intake, not custody
      var entered = Number(row[inCol]);
      if (!isFinite(entered)) throw new Error('careJusticeCensus: ' + system + ' row ' + row[idCol] + ' has an unreadable entry Cycle');
      if (entered > cycle) continue;
      var left = careJusticeIsBlank_(row[outCol]) ? null : Number(row[outCol]);
      if (left !== null && !isFinite(left)) throw new Error('careJusticeCensus: ' + system + ' row ' + row[idCol] + ' has an unreadable exit Cycle');

      var popId = String(row[c.POPID]);
      var hood = String(careJusticeIsBlank_(row[c.Neighborhood]) ? '' : row[c.Neighborhood]);
      var type = hospital ? careJusticeIntakeType_('hospital', row[c.IntakeType]) : 'arrest';
      var eventId = careJusticeIsBlank_(row[c.SourceEventId]) ? '' : String(row[c.SourceEventId]);
      var id = eventId || String(row[idCol]); // rows written before the stamps key on the row id
      var reconcile = String(row[c.SourceSystem] || '') === 'reconcile';
      // Invariant D: a second row carrying an event already seen is the same
      // movement of the same person — counted once, and the system says so.
      if (rowSeen[system + '|' + id]) { out.duplicates[system]++; continue; }
      rowSeen[system + '|' + id] = true;
      if (eventId) out.rowsByEvent[system][eventId] = true;

      if (entered === cycle) {
        var transferIn = hospital && !careJusticeIsBlank_(row[c.TransferFromId]);
        push(system, reconcile ? 'correction' : (transferIn ? 'transfer-in' : 'intake'), id, popId, hood, type);
      } else if (left === null || left >= cycle) {
        var ok = cellOf(system, hood, type);
        out.derivedOpening[ok] = (out.derivedOpening[ok] || 0) + 1;
      }
      if (left === cycle) {
        var transferOut = !hospital && String(row[c.Outcome] || '') === 'diverted' &&
          !careJusticeIsBlank_(row[c.TransferToId]);
        push(system, transferOut ? 'transfer-out' : 'exit', id, popId, hood, type);
      }
      if (left === null || left > cycle) {
        out.trackedOpen.push({ system: system, popId: popId, neighborhood: hood, intakeType: type,
          statusNow: row[c.StatusNow] });
        out.openByPop[system][popId] = true;
      }
    }
  }
  return out;
}

// Census tab rows (arrays) → objects grouped by Cycle. Blank rows are not rows.
function careJusticeTailBlocks_(tailValues) {
  var blocks = {}, cycles = [];
  for (var i = 0; i < (tailValues || []).length; i++) {
    var v = tailValues[i], blank = true;
    for (var b = 0; b < v.length; b++) if (String(careJusticeIsBlank_(v[b]) ? '' : v[b]).trim() !== '') { blank = false; break; }
    if (blank) continue;
    var cyc = Number(v[0]);
    if (!isFinite(cyc) || careJusticeIsBlank_(v[0])) throw new Error('careJusticeCensus: a census row carries no Cycle');
    if (!blocks[cyc]) { blocks[cyc] = []; cycles.push(cyc); }
    var row = {};
    for (var h = 0; h < CARE_JUSTICE_CENSUS_HEADERS.length; h++) row[CARE_JUSTICE_CENSUS_HEADERS[h]] = v[h];
    blocks[cyc].push(row);
  }
  cycles.sort(function (a, b) { return a - b; });
  return { blocks: blocks, cycles: cycles };
}

// Typed, non-city rows of one system that carry numbers, keyed by cell.
function careJusticeNumberedCells_(rows, system) {
  var cells = null;
  for (var i = 0; i < (rows || []).length; i++) {
    var r = rows[i];
    if (r.System !== system || r.GeographicScope === 'city' || r.IntakeType === 'all') continue;
    if (r.Completeness === 'unavailable' || careJusticeIsBlank_(r.TrackedOccupancy)) continue;
    if (!cells) cells = {};
    cells[careJusticeCellKey_(system, r.GeographicScope, r.Neighborhood, r.IntakeType)] = r;
  }
  return cells;
}

/**
 * Other-resident stock as a cohort window (R2-6): every other resident stays
 * exactly `stay` Cycles. `history[i]` is the cell's OtherResidentIntakes at
 * Cycle C − stay + 1 + i, or null when that Cycle carries no numbers; a null
 * is estimated at the first known Cycle after it — this Cycle's at the latest.
 */
function careJusticeOtherWindow_(opening, intakes, history) {
  var window = (history || []).concat([intakes]);
  for (var i = window.length - 2; i >= 0; i--) if (window[i] === null) window[i] = window[i + 1];
  var closing = 0;
  for (var w = 0; w < window.length; w++) closing += window[w];
  var d = opening + intakes - closing;
  return { closing: closing, exits: d > 0 ? d : 0, corrections: d < 0 ? -d : 0 };
}

/**
 * One Cycle's census, planned from the ledger images, the census tab's tail and
 * the demand — no sheet access (R2-1 … R2-7).
 *
 * args = {
 *   cycle, demand (S.careJusticeDemand), ledgers: {hospital, judicial},
 *   tail: census tab tail values (arrays, no header), stays: {hospital, judicial},
 *   outsideTracked: Number,            // living tracked citizens outside the table hoods
 *   writeStatus: {hospital, judicial}, // S.careJusticeWriteStatus
 *   events: {hospital: [], judicial: []},          // this Cycle's receipts — a cross-check only
 *   otherResidentOf: function (trackedIntakesByHood) → careJusticeOtherResident_ result
 * }
 * @return {{rows, gapBlocks, completeness, restart, firstCensus, existing}}
 */
function planCareJusticeCensus_(args) {
  var cycle = Number(args.cycle);
  if (!(cycle > 0)) throw new Error('careJusticeCensus: no Cycle');
  var demand = args.demand;
  if (!demand || !demand.hoods) throw new Error('careJusticeCensus: S.careJusticeDemand missing — no scopes, no census');
  var systems = ['hospital', 'judicial'];

  var hoodNames = {}, hoods = [], scopes = [];
  for (var hood in demand.hoods) {
    if (!demand.hoods.hasOwnProperty(hood)) continue;
    hoodNames[hood] = true; hoods.push(hood);
    scopes.push({ scope: 'neighborhood', neighborhood: hood, coveredPopulation: demand.hoods[hood].tablePopulation });
  }
  scopes.push({ scope: 'unallocated', coveredPopulation: Number(args.outsideTracked) || 0 });

  var tail = careJusticeTailBlocks_(args.tail);
  var latest = tail.cycles.length ? tail.cycles[tail.cycles.length - 1] : null;
  if (latest !== null && latest > cycle) {
    throw new Error('careJusticeCensus: the tab holds Cycle ' + latest + ', later than Cycle ' + cycle + ' — refusing to write behind it');
  }
  var priorCycles = [];
  for (var pc = 0; pc < tail.cycles.length; pc++) if (tail.cycles[pc] < cycle) priorCycles.push(tail.cycles[pc]);
  var lastPrior = priorCycles.length ? priorCycles[priorCycles.length - 1] : null;

  // Gap Cycles: no rows at all between the last written Cycle and this one.
  var gapCycles = [];
  if (lastPrior !== null) for (var g = lastPrior + 1; g < cycle; g++) gapCycles.push(g);
  if (gapCycles.length > CARE_JUSTICE_GAP_LIMIT) {
    throw new Error('careJusticeCensus: ' + gapCycles.length + ' Cycles missing since Cycle ' + lastPrior + ' — not written');
  }

  var sources = {}, incomplete = {}, restart = {}, opening = {}, numbered = {};
  for (var s = 0; s < systems.length; s++) {
    var sys = systems[s];
    sources[sys] = args.ledgers[sys] && args.ledgers[sys].length ? 'ok' : 'missing';
    incomplete[sys] = !!(args.writeStatus && args.writeStatus[sys] === 'failed');
    numbered[sys] = {};
    var K = null;
    for (var k = priorCycles.length - 1; k >= 0; k--) {
      var cells = careJusticeNumberedCells_(tail.blocks[priorCycles[k]], sys);
      if (cells) {
        numbered[sys][priorCycles[k]] = cells;
        if (K === null) K = priorCycles[k];
      }
    }
    restart[sys] = K !== null && K < cycle - 1;
    if (restart[sys]) incomplete[sys] = true; // the opening is carried across a hole, not counted
    if (K !== null) {
      var kc = numbered[sys][K];
      for (var ck in kc) {
        if (!kc.hasOwnProperty(ck)) continue;
        var kr = kc[ck];
        opening[ck] = { tracked: Number(kr.TrackedOccupancy) || 0, other: Number(kr.OtherResidentOccupancy) || 0 };
        // A cell whose scope left the table would drop its stock without a trace.
        if (kr.GeographicScope === 'neighborhood' && !hoodNames[kr.Neighborhood] &&
            (opening[ck].tracked || opening[ck].other)) incomplete[sys] = true;
      }
    }
  }

  var derived = deriveCareJusticeMovements_(cycle, {
    hospital: sources.hospital === 'ok' ? args.ledgers.hospital : null,
    judicial: sources.judicial === 'ok' ? args.ledgers.judicial : null
  }, hoodNames);

  // R2-3: this Cycle's in-memory receipts must be visible in the ledgers.
  var events = args.events || {};
  for (var e = 0; e < systems.length; e++) {
    var es = systems[e];
    if (derived.duplicates[es]) incomplete[es] = true;
    var list = events[es] || [];
    for (var i = 0; i < list.length; i++) {
      var ev = list[i];
      if (!ev) continue;
      var pop = String(ev.popId);
      var landed = true;
      if (es === 'hospital') {
        var inCare = CARE_JUSTICE_HOSPITAL_OPEN.indexOf(ev.to) >= 0;
        if (ev.kind === 'intake' && inCare) landed = !!derived.rowsByEvent.hospital[String(ev.sourceEventId)];
        else if (!inCare && !careJusticeIsBlank_(ev.to)) landed = !derived.openByPop.hospital[pop];
      } else if (ev.kind === 'intake') {
        landed = !!derived.rowsByEvent.judicial[String(ev.sourceEventId)] || !!derived.openByPop.judicial[pop];
      } else if (ev.kind === 'exit') {
        landed = !derived.openByPop.judicial[pop];
      }
      if (!landed) incomplete[es] = true;
    }
  }

  // Signed tracked corrections: what the ledgers say was open before this
  // Cycle, against what the census last wrote (R2-2).
  var trackedCorrections = {};
  var keys = {};
  for (var dk in derived.derivedOpening) if (derived.derivedOpening.hasOwnProperty(dk)) keys[dk] = true;
  for (var ok in opening) if (opening.hasOwnProperty(ok)) keys[ok] = true;
  for (var key in keys) {
    if (!keys.hasOwnProperty(key)) continue;
    var system = key.split('|')[0];
    if (sources[system] !== 'ok') continue;
    var diff = (derived.derivedOpening[key] || 0) - (opening[key] ? opening[key].tracked : 0);
    if (diff) trackedCorrections[key] = diff;
  }

  // Other residents: this Cycle's intakes from the demand, the stock from the window.
  var trackedByHood = {};
  for (var h = 0; h < hoods.length; h++) trackedByHood[hoods[h]] = { hospital: { illness: 0 }, judicial: { arrest: 0 } };
  for (var r = 0; r < derived.receipts.length; r++) {
    var rc = derived.receipts[r];
    if (rc.kind !== 'intake' || !hoodNames[rc.neighborhood]) continue;
    if (rc.intakeType === CARE_JUSTICE_MODELLED[rc.system]) trackedByHood[rc.neighborhood][rc.system][rc.intakeType]++;
  }
  var modelled = args.otherResidentOf(trackedByHood);
  var otherResident = [], handled = {};
  for (var o = 0; o < systems.length; o++) {
    var os = systems[o];
    if (sources[os] !== 'ok') continue;
    var type = CARE_JUSTICE_MODELLED[os];
    var stay = args.stays[os];
    for (var hh = 0; hh < hoods.length; hh++) {
      var name = hoods[hh];
      var cellData = modelled && modelled.hoods && modelled.hoods[name] && modelled.hoods[name][os] && modelled.hoods[name][os][type];
      if (!cellData) throw new Error('careJusticeCensus: other-resident demand for ' + name + ' ' + os + '/' + type + ' missing');
      var cellKey = careJusticeCellKey_(os, 'neighborhood', name, type);
      var history = [];
      for (var back = stay - 1; back >= 1; back--) {
        var past = numbered[os][cycle - back];
        var pastRow = past && past[cellKey];
        history.push(pastRow && !careJusticeIsBlank_(pastRow.OtherResidentIntakes) ? Number(pastRow.OtherResidentIntakes) : null);
      }
      var win = careJusticeOtherWindow_(opening[cellKey] ? opening[cellKey].other : 0, cellData.other, history);
      handled[cellKey] = true;
      otherResident.push({ system: os, scope: 'neighborhood', neighborhood: name, intakeType: type,
        intakes: cellData.other, exits: win.exits, corrections: win.corrections,
        beds: os === 'hospital' ? win.closing : 0 });
    }
  }
  // Stock in a cell the model no longer feeds leaves this Cycle.
  for (var lk in opening) {
    if (!opening.hasOwnProperty(lk) || handled[lk] || !opening[lk].other) continue;
    var parts = lk.split('|');
    if (sources[parts[0]] !== 'ok') continue;
    if (parts[1] === 'neighborhood' && !hoodNames[parts[2]]) continue;
    otherResident.push({ system: parts[0], scope: parts[1], neighborhood: parts[2], intakeType: parts[3],
      intakes: 0, exits: opening[lk].other, corrections: 0, beds: 0 });
  }

  var built = buildCareJusticeCensus_({
    cycle: cycle, scopes: scopes, sources: sources, receipts: derived.receipts, seenKeys: {},
    trackedOpen: derived.trackedOpen, opening: opening, otherResident: otherResident,
    incomplete: incomplete, trackedCorrections: trackedCorrections
  });
  var bad = validateCareJusticeCensus_(built.rows);
  if (bad.length) throw new Error('careJusticeCensus: Cycle ' + cycle + ' does not balance — ' + bad.join('; '));

  var gapBlocks = [];
  for (var gb = 0; gb < gapCycles.length; gb++) {
    var gapRows = buildCareJusticeCensus_({ cycle: gapCycles[gb], scopes: scopes,
      sources: { hospital: 'missing', judicial: 'missing' } }).rows;
    for (var gr = 0; gr < gapRows.length; gr++) gapRows[gr].CoveredPopulation = ''; // that week's table is on no sheet
    gapBlocks.push({ cycle: gapCycles[gb], rows: gapRows });
  }

  var completeness = {};
  for (var cs = 0; cs < systems.length; cs++) {
    completeness[systems[cs]] = sources[systems[cs]] !== 'ok' ? 'unavailable' :
      (incomplete[systems[cs]] ? 'incomplete' : 'complete');
  }
  return { rows: built.rows, gapBlocks: gapBlocks, completeness: completeness, restart: restart,
    firstCensus: lastPrior === null, trackedCorrections: trackedCorrections };
}

function careJusticeRowKey_(row) {
  return [row.Cycle, row.System, row.GeographicScope, row.Neighborhood || '', row.IntakeType].join('|');
}

function careJusticeCellText_(v) {
  return careJusticeIsBlank_(v) ? '' : String(v);
}

/**
 * Locate-compare-write (R2-8), decided from a fresh tail read. `tail` is
 * [{row: sheetRow, values: []}] in sheet order, blank rows included.
 *
 * @return {{action: 'skip'}|{action: 'write', startRow: Number, values: Array}}
 */
function careJusticeWritePlan_(tail, firstTailRow, plan) {
  var cycle = plan.rows[0].Cycle;
  var beds = CARE_JUSTICE_CENSUS_HEADERS.indexOf('BedsOccupied');
  var expected = {}, expectedValues = [];
  for (var i = 0; i < plan.rows.length; i++) {
    expected[careJusticeRowKey_(plan.rows[i])] = i;
    expectedValues.push(careJusticeCensusRowValues_(plan.rows[i]));
  }

  var lastData = firstTailRow - 1, mine = [], present = {};
  for (var t = 0; t < tail.length; t++) {
    var v = tail[t].values, blank = true;
    for (var b = 0; b < v.length; b++) if (careJusticeCellText_(v[b]).trim() !== '') { blank = false; break; }
    if (blank) continue;
    lastData = tail[t].row;
    var cyc = Number(v[0]);
    if (cyc > cycle) throw new Error('careJusticeCensus: the tab holds Cycle ' + cyc + ', later than Cycle ' + cycle);
    present[cyc] = true;
    if (cyc === cycle) mine.push(tail[t]);
  }

  if (!mine.length) {
    var values = [];
    for (var g = 0; g < plan.gapBlocks.length; g++) {
      if (present[plan.gapBlocks[g].cycle]) continue;
      for (var gr = 0; gr < plan.gapBlocks[g].rows.length; gr++) values.push(careJusticeCensusRowValues_(plan.gapBlocks[g].rows[gr]));
    }
    return { action: 'write', startRow: lastData + 1, values: values.concat(expectedValues) };
  }

  var seen = {}, equal = mine.length === plan.rows.length, allComplete = true;
  for (var m = 0; m < mine.length; m++) {
    if (m > 0 && mine[m].row !== mine[m - 1].row + 1) throw new Error('careJusticeCensus: Cycle ' + cycle + ' rows are not one run');
    var mv = mine[m].values, row = {};
    for (var h = 0; h < CARE_JUSTICE_CENSUS_HEADERS.length; h++) row[CARE_JUSTICE_CENSUS_HEADERS[h]] = mv[h];
    row.Cycle = Number(row.Cycle);
    var key = careJusticeRowKey_(row);
    if (!expected.hasOwnProperty(key)) throw new Error('careJusticeCensus: Cycle ' + cycle + ' holds a row this census does not write (' + key + ')');
    if (seen[key]) throw new Error('careJusticeCensus: Cycle ' + cycle + ' holds a duplicate row (' + key + ')');
    seen[key] = true;
    if (row.Completeness !== 'complete') allComplete = false;
    var ev = expectedValues[expected[key]];
    for (var c = 0; c < ev.length && equal; c++) {
      if (c === beds) continue; // not derivable after the Cycle's own run (R2-1)
      if (careJusticeCellText_(mv[c]) !== careJusticeCellText_(ev[c])) equal = false;
    }
  }
  if (mine[mine.length - 1].row !== lastData) throw new Error('careJusticeCensus: rows of another Cycle follow Cycle ' + cycle);
  if (equal) return { action: 'skip' };
  if (mine.length === plan.rows.length && allComplete) {
    throw new Error('careJusticeCensus: Cycle ' + cycle + ' is already written complete and the recomputation differs — the stored rows stand');
  }
  return { action: 'write', startRow: mine[0].row, values: expectedValues };
}

// After the write: the block reads back whole, each key once, every cell equal.
function careJusticeVerifyBlock_(tail, plan) {
  var cycle = plan.rows[0].Cycle, found = {}, count = 0;
  var expected = {};
  for (var i = 0; i < plan.rows.length; i++) expected[careJusticeRowKey_(plan.rows[i])] = careJusticeCensusRowValues_(plan.rows[i]);
  for (var t = 0; t < tail.length; t++) {
    var v = tail[t].values;
    if (careJusticeIsBlank_(v[0]) || Number(v[0]) !== cycle) continue;
    var row = {};
    for (var h = 0; h < CARE_JUSTICE_CENSUS_HEADERS.length; h++) row[CARE_JUSTICE_CENSUS_HEADERS[h]] = v[h];
    row.Cycle = Number(row.Cycle);
    var key = careJusticeRowKey_(row);
    if (!expected[key] || found[key]) return 'unexpected or duplicate row ' + key;
    found[key] = true; count++;
    for (var c = 0; c < expected[key].length; c++) {
      if (careJusticeCellText_(v[c]) !== careJusticeCellText_(expected[key][c])) {
        return key + ' ' + CARE_JUSTICE_CENSUS_HEADERS[c] + ' reads "' + v[c] + '", wrote "' + expected[key][c] + '"';
      }
    }
  }
  return count === plan.rows.length ? '' : count + ' rows read back, ' + plan.rows.length + ' written';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CARE_JUSTICE_METHOD_VERSION: CARE_JUSTICE_METHOD_VERSION,
    CARE_JUSTICE_CENSUS_HEADERS: CARE_JUSTICE_CENSUS_HEADERS,
    CARE_JUSTICE_TYPES: CARE_JUSTICE_TYPES,
    CARE_JUSTICE_BED_STATES: CARE_JUSTICE_BED_STATES,
    CARE_JUSTICE_CUSTODY_STATES: CARE_JUSTICE_CUSTODY_STATES,
    careJusticeCellKey_: careJusticeCellKey_,
    foldCareJusticeReceipts_: foldCareJusticeReceipts_,
    buildCareJusticeCensus_: buildCareJusticeCensus_,
    validateCareJusticeCensus_: validateCareJusticeCensus_,
    careJusticeCensusRowValues_: careJusticeCensusRowValues_,
    careJusticeStay_: careJusticeStay_,
    deriveCareJusticeMovements_: deriveCareJusticeMovements_,
    careJusticeOtherWindow_: careJusticeOtherWindow_,
    planCareJusticeCensus_: planCareJusticeCensus_,
    careJusticeWritePlan_: careJusticeWritePlan_,
    careJusticeVerifyBlock_: careJusticeVerifyBlock_,
    CARE_JUSTICE_TAIL_BLOCKS: CARE_JUSTICE_TAIL_BLOCKS
  };
}
