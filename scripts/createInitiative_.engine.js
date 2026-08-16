/**
 * civic.22 — DROP-IN for phase05-citizens/civicInitiativeEngine.js
 *
 * Engine-sheet lands this. Grok does not edit phase05-citizens/ (substrate).
 * Do not clasp this file alone. Do not add an ensure* that inserts columns on
 * cycle fire — column add is scripts/addInitiativeAuthorshipColumns.js
 * --apply --i-am-engine-sheet (dry-run → apply → read-back).
 *
 * createInitiative_ fail-loud if Proposer/ProposingOffice/ProposedCycle are
 * missing. Any seated MAYOR-01 / COUNCIL-D1..D9 may call it. LeadFaction is
 * the seat's faction. civic.24 still: only the gavel stamps existing rows;
 * this mints a new INIT, it does not write ImplementationPhase on an old one.
 *
 * Cycle path (Phase 5): queueAppendIntent_ — Phase 10 commits.
 */

function createInitiative_(ctx, spec) {
  spec = spec || {};
  if (!ctx || !ctx.ss) throw new Error('createInitiative_: ctx.ss required');

  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Initiative_Tracker');
  if (!sheet) throw new Error('createInitiative_: Initiative_Tracker not found');

  var data = sheet.getDataRange().getValues();
  if (!data.length) throw new Error('createInitiative_: tracker has no header row');
  var header = data[0];
  var rows = data.slice(1);
  var idx = function (n) { return header.indexOf(n); };

  var need = ['InitiativeID', 'Name', 'Type', 'Status', 'LeadFaction',
    'AffectedNeighborhoods', 'PolicyDomain', 'ImplementationPhase',
    'Proposer', 'ProposingOffice', 'ProposedCycle'];
  var missing = [];
  for (var h = 0; h < need.length; h++) {
    if (idx(need[h]) < 0) missing.push(need[h]);
  }
  if (missing.length) {
    throw new Error('createInitiative_: missing headers ' + missing.join(', ')
      + ' — run addInitiativeAuthorshipColumns.js first');
  }

  var office = String(spec.proposingOffice || '').trim();
  if (!/^(MAYOR-01|COUNCIL-D[1-9])$/.test(office)) {
    throw new Error('createInitiative_: proposingOffice must be MAYOR-01 or COUNCIL-D1..D9');
  }

  var seat = lookupAuthoringSeat_(ctx, office);
  if (!seat) throw new Error('createInitiative_: no Civic_Office_Ledger row for ' + office);
  if (seat.status === 'vacant') {
    throw new Error('createInitiative_: vacant seat cannot author (' + office + ')');
  }
  if (spec.proposer && String(spec.proposer).trim() !== seat.holder) {
    throw new Error('createInitiative_: proposer does not match holder ' + seat.holder);
  }

  var type = String(spec.type || '').toLowerCase();
  var opening = type === 'visioning' ? 'visioning'
    : (type === 'vote' || type === 'program') ? 'announced'
    : '';
  if (!opening) throw new Error('createInitiative_: type must be vote|visioning|program');

  var cycle = Number(spec.proposedCycle || (ctx.summary && ctx.summary.cycleId) || 0);
  if (!cycle) throw new Error('createInitiative_: proposedCycle required');

  var max = 0;
  for (var r = 0; r < rows.length; r++) {
    var m = String(rows[r][idx('InitiativeID')] || '').match(/^INIT-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  var newId = 'INIT-' + ('000' + (max + 1)).slice(-3);

  var row = [];
  for (var c = 0; c < header.length; c++) row[c] = '';
  row[idx('InitiativeID')] = newId;
  row[idx('Name')] = String(spec.name || '').trim();
  row[idx('Type')] = type;
  row[idx('Status')] = 'proposed';
  if (idx('Budget') >= 0 && spec.budget != null) row[idx('Budget')] = String(spec.budget);
  row[idx('LeadFaction')] = seat.faction;
  row[idx('AffectedNeighborhoods')] = String(spec.affectedNeighborhoods || '').trim();
  row[idx('PolicyDomain')] = String(spec.policyDomain || '').trim().toLowerCase();
  if (idx('MayoralAction') >= 0) row[idx('MayoralAction')] = 'none';
  row[idx('ImplementationPhase')] = opening;
  if (idx('NextScheduledAction') >= 0) {
    row[idx('NextScheduledAction')] = spec.nextScheduledAction || 'legislation-filed';
  }
  if (idx('NextActionCycle') >= 0) row[idx('NextActionCycle')] = cycle;
  row[idx('Proposer')] = seat.holder;
  row[idx('ProposingOffice')] = office;
  row[idx('ProposedCycle')] = cycle;
  if (!row[idx('Name')]) throw new Error('createInitiative_: name required');

  if (typeof queueAppendIntent_ !== 'function') {
    throw new Error('createInitiative_: queueAppendIntent_ missing — do not appendRow from Phase 5');
  }
  queueAppendIntent_(ctx, 'Initiative_Tracker', row, 'createInitiative_ ' + newId, 'civic');
  return { ok: true, initiativeId: newId, leadFaction: seat.faction, proposingOffice: office };
}

function lookupAuthoringSeat_(ctx, officeId) {
  var sheet = ctx.ss.getSheetByName('Civic_Office_Ledger');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var header = data[0];
  var iOffice = header.indexOf('OfficeId');
  var iHolder = header.indexOf('Holder');
  var iFaction = header.indexOf('Faction');
  var iStatus = header.indexOf('Status');
  if (iOffice < 0 || iHolder < 0 || iFaction < 0) return null;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iOffice] || '') === officeId) {
      return {
        officeId: officeId,
        holder: String(data[r][iHolder] || '').trim(),
        faction: String(data[r][iFaction] || '').trim().toUpperCase(),
        status: String(iStatus >= 0 ? data[r][iStatus] : 'active').toLowerCase(),
      };
    }
  }
  return null;
}
