#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  FEED_HEADERS,
  STAT_FIELD_MAPS,
  projectNewRow,
  projectRosterEventMutation,
  validateSportsSubmission,
} = require('./sportsFeedContract.js');
const { ROSTER_SCHEMAS } = require('./sportsWorkspaceProjection.js');

const FEED_SHEET = 'Oakland_Sports_Feed';
const CITIZEN_SHEET = 'Simulation_Ledger';
const LIFE_HISTORY_LOG_SHEET = 'LifeHistory_Log';
const RIPPLE_LEDGER_SHEET = 'Ripple_Ledger';
const AUDIT_VERSION = 3;
const CITIZEN_REQUIRED_HEADERS = Object.freeze([
  'POPID',
  'First',
  'Last',
  'Tier',
  'RoleType',
  'Status',
  'LifeHistory',
  'Neighborhood',
  'StatusStartCycle',
  'HealthCause',
]);
const LIFE_HISTORY_LOG_HEADERS = Object.freeze([
  'Timestamp',
  'POPID',
  'Name',
  'EventTag',
  'EventText',
  'Neighborhood',
  'Cycle',
]);
const RIPPLE_LEDGER_HEADERS = Object.freeze([
  'Cycle',
  'CauseType',
  'CauseId',
  'CauseDetail',
  'EffectType',
  'TargetScope',
  'TargetIds',
  'Neighborhood',
  'Magnitude',
  'Duration',
  'RemainingStrength',
  'SourceEngine',
  'CycleStamp',
]);

class SportsFeedWriterError extends Error {
  constructor(code, message, status = 500, details = {}) {
    super(message);
    this.name = 'SportsFeedWriterError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = stableValue(value[key]);
        return result;
      }, {});
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function sportsRequestHash(
  row,
  provenance = null,
  mutationEnvelope = null,
  sourcePreconditions = null,
) {
  const payload = {
    contractVersion: 1,
    row,
    provenance: provenance || null,
  };
  if (mutationEnvelope) payload.mutation = mutationEnvelope;
  if (sourcePreconditions) payload.sourcePreconditions = sourcePreconditions;
  return sha256(stableStringify(payload));
}

function safeCell(value) {
  return value == null ? '' : String(value);
}

function normalizedRow(values) {
  const source = Array.isArray(values) ? values : [];
  return FEED_HEADERS.map((_, index) => safeCell(source[index]));
}

function rowsMatch(left, right) {
  const a = normalizedRow(left);
  const b = normalizedRow(right);
  return a.every((value, index) => value === b[index]);
}

function rosterTeamId(rosterSource) {
  if (rosterSource === 'As_Roster') return 'as';
  if (rosterSource === 'Oaks_Roster') return 'oaks';
  return null;
}

function normalizedRawSnapshot(snapshot, sheetName, options = {}) {
  if (!snapshot || !Array.isArray(snapshot.headers) || !Array.isArray(snapshot.rows)) {
    throw new Error(`${sheetName} raw snapshot is unavailable`);
  }
  const headers = snapshot.headers.map((header) => safeCell(header));
  if (options.exactHeaders) {
    if (headers.length !== options.exactHeaders.length ||
        headers.some((header, index) => header !== options.exactHeaders[index])) {
      throw new Error(`${sheetName} header layout changed`);
    }
  }
  const indexByHeader = {};
  for (const required of options.requiredHeaders || []) {
    const matches = headers.reduce((indexes, header, index) => (
      header === required ? indexes.concat(index) : indexes
    ), []);
    if (matches.length !== 1) {
      throw new Error(`${sheetName} requires exactly one ${required} header`);
    }
    indexByHeader[required] = matches[0];
  }
  const rows = snapshot.rows.map((row, index) => ({
    rowNumber: Number.isInteger(row && row.rowNumber) ? row.rowNumber : index + 2,
    values: headers.map((_, columnIndex) => safeCell(
      row && Array.isArray(row.values) ? row.values[columnIndex] : ''
    )),
  }));
  return { headers, indexByHeader, rows };
}

function normalizedFeedSnapshot(snapshot) {
  return normalizedRawSnapshot(snapshot, FEED_SHEET, {
    exactHeaders: FEED_HEADERS,
  });
}

function selectedRosterRow(snapshot, participant) {
  const teamId = rosterTeamId(participant && participant.rosterSource);
  const schema = teamId && ROSTER_SCHEMAS[teamId];
  if (!schema || !snapshot || !Array.isArray(snapshot.headers) ||
      !Array.isArray(snapshot.rows)) {
    throw new Error('Selected roster raw snapshot is unavailable');
  }
  const headers = snapshot.headers.map((header) => safeCell(header).trim());
  if (headers.length !== schema.headers.length ||
      headers.some((header, index) => header !== schema.headers[index])) {
    throw new Error(`${schema.sheetName} header layout changed`);
  }
  const row = snapshot.rows.find((candidate) => (
    candidate && candidate.rowNumber === participant.sourceRow
  ));
  if (!row || !Array.isArray(row.values)) {
    throw new Error('Selected roster physical row is unavailable');
  }
  const values = schema.headers.map((_, index) => safeCell(row.values[index]).trim());
  const name = [values[1], values[2], values[3]].filter(Boolean).join(' ');
  if (values[0] !== participant.popid || name !== participant.name) {
    throw new Error('Selected roster identity changed');
  }
  return {
    headers,
    rowNumber: row.rowNumber,
    values,
    identity: {
      first: values[1],
      middle: values[2],
      last: values[3],
    },
  };
}

function selectedCitizenRow(snapshot, participant, rosterIdentity) {
  const normalized = normalizedRawSnapshot(snapshot, CITIZEN_SHEET, {
    requiredHeaders: CITIZEN_REQUIRED_HEADERS,
  });
  const popIndex = normalized.indexByHeader.POPID;
  const matches = normalized.rows.filter((row) => (
    row.values[popIndex].trim() === participant.popid
  ));
  if (matches.length !== 1) {
    throw new Error('Selected citizen POPID is unavailable or ambiguous');
  }
  const selected = {
    headers: normalized.headers,
    indexByHeader: normalized.indexByHeader,
    rowNumber: matches[0].rowNumber,
    values: matches[0].values,
  };
  const citizenFirst = selected.values[selected.indexByHeader.First].trim();
  const citizenLast = selected.values[selected.indexByHeader.Last].trim();
  if (!rosterIdentity ||
      citizenFirst !== rosterIdentity.first ||
      citizenLast !== rosterIdentity.last) {
    throw new Error('Selected citizen identity changed');
  }
  return selected;
}

function selectedState(selected) {
  return Object.fromEntries(
    Object.entries(selected.indexByHeader).map(([header, index]) => [
      header,
      selected.values[index],
    ])
  );
}

function rosterState(selected) {
  return Object.fromEntries(selected.headers.map((header, index) => [
    header,
    selected.values[index],
  ]));
}

function appendTargetPrecondition(snapshot, sheetName, exactHeaders) {
  const normalized = normalizedRawSnapshot(snapshot, sheetName, { exactHeaders });
  return {
    headerHash: sha256(stableStringify(normalized.headers)),
    nextRow: normalized.rows.length + 2,
  };
}

function createSportsSourcePreconditions({
  feedRows,
  rosterSnapshot = null,
  citizenSnapshot = null,
  lifeHistoryLogSnapshot = null,
  rippleLedgerSnapshot = null,
  participant = null,
  action = null,
}) {
  const feed = normalizedFeedSnapshot(feedRows);
  const result = {
    feedHeaderHash: sha256(stableStringify(feed.headers)),
    feedHash: sha256(stableStringify(feed.rows)),
    feedRowCount: feed.rows.length,
    nextFeedRow: feed.rows.length + 2,
  };
  if (participant) {
    const roster = selectedRosterRow(rosterSnapshot, participant);
    const citizen = selectedCitizenRow(
      citizenSnapshot,
      participant,
      roster.identity,
    );
    result.rosterSource = participant.rosterSource;
    result.rosterRow = participant.sourceRow;
    result.rosterHeaderHash = sha256(stableStringify(roster.headers));
    result.rosterRowHash = sha256(stableStringify(roster.values));
    result.citizenRow = citizen.rowNumber;
    result.citizenHeaderHash = sha256(stableStringify(citizen.headers));
    result.citizenRowHash = sha256(stableStringify(citizen.values));
  }
  if (action && action !== 'stat-capture') {
    const lifeHistory = appendTargetPrecondition(
      lifeHistoryLogSnapshot,
      LIFE_HISTORY_LOG_SHEET,
      LIFE_HISTORY_LOG_HEADERS,
    );
    const ripple = appendTargetPrecondition(
      rippleLedgerSnapshot,
      RIPPLE_LEDGER_SHEET,
      RIPPLE_LEDGER_HEADERS,
    );
    result.lifeHistoryLogHeaderHash = lifeHistory.headerHash;
    result.rippleLedgerHeaderHash = ripple.headerHash;
  }
  return result;
}

function mutationEnvelope(validation) {
  if (!validation.mutation) return null;
  return {
    submissionId: validation.submissionId,
    participant: validation.participant,
    mutation: validation.mutation,
  };
}

function stringCell(value) {
  return { userEnteredValue: { stringValue: safeCell(value) } };
}

function statCell(value, spec) {
  if (!spec || spec.validator === 'record') return stringCell(value);
  let numberValue;
  if (spec.validator === 'percentage') {
    const raw = safeCell(value).trim().replace(/%$/, '');
    numberValue = Number(raw) / 100;
  } else {
    numberValue = Number(value);
  }
  if (!Number.isFinite(numberValue)) {
    throw new SportsFeedWriterError(
      'sports_validation_failed',
      `${spec.key} is not a finite numeric value`,
      422,
    );
  }
  return { userEnteredValue: { numberValue } };
}

function appendCellsRequest(sheetId, values) {
  return {
    appendCells: {
      sheetId,
      rows: [{ values: values.map(stringCell) }],
      fields: 'userEnteredValue',
    },
  };
}

function updateCellRequest(sheetId, rowNumber, columnIndex, value, spec = null) {
  return {
    updateCells: {
      start: {
        sheetId,
        rowIndex: rowNumber - 1,
        columnIndex,
      },
      rows: [{ values: [spec ? statCell(value, spec) : stringCell(value)] }],
      fields: 'userEnteredValue',
    },
  };
}

function enteredValue(request) {
  const cell = request && request.updateCells &&
    request.updateCells.rows[0].values[0].userEnteredValue;
  if (!cell) return '';
  if (Object.prototype.hasOwnProperty.call(cell, 'numberValue')) {
    return cell.numberValue;
  }
  if (Object.prototype.hasOwnProperty.call(cell, 'boolValue')) {
    return cell.boolValue;
  }
  return safeCell(cell.stringValue);
}

function columnLetter(columnIndex) {
  let value = columnIndex + 1;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function rowRange(sheetName, startColumn, endColumn, rowNumber) {
  return `${sheetName}!${startColumn}${rowNumber}:${endColumn}${rowNumber}`;
}

function rowsEqual(left, right) {
  return Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => safeCell(value) === safeCell(right[index]));
}

function comparableStatNumbers(value, spec) {
  const raw = safeCell(value).trim();
  if (!raw) return [];
  if (spec.validator === 'percentage') {
    const numeric = Number(raw.replace(/%$/, ''));
    if (!Number.isFinite(numeric)) return [];
    return raw.endsWith('%')
      ? [numeric / 100]
      : [numeric, numeric / 100];
  }
  if (spec.validator === 'record') return [];
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? [numeric] : [];
}

function statValuesEqual(left, right, spec) {
  if (spec.validator === 'record') return safeCell(left) === safeCell(right);
  const leftCandidates = comparableStatNumbers(left, spec);
  const rightCandidates = comparableStatNumbers(right, spec);
  return leftCandidates.some((leftValue) => (
    rightCandidates.some((rightValue) => Math.abs(leftValue - rightValue) < 1e-9)
  ));
}

function rosterRowsEqual(left, right, statChanges) {
  const specsByIndex = new Map(
    statChanges.map((change) => [change.spec.columnIndex, change.spec])
  );
  return Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => {
      const spec = specsByIndex.get(index);
      return spec
        ? statValuesEqual(value, right[index], spec)
        : safeCell(value) === safeCell(right[index]);
    });
}

function changedStatFields(validation) {
  if (!validation.mutation || validation.mutation.action !== 'stat-capture') return [];
  const fields = STAT_FIELD_MAPS[validation.participant.rosterSource];
  return validation.mutation.changes
    .filter((change) => change.before !== change.after)
    .map((change) => ({ ...change, spec: fields[change.field] }));
}

function assertStatCitizenEligible(citizen) {
  const status = safeCell(
    citizen.values[citizen.indexByHeader.Status]
  ).trim().toLowerCase();
  if (!['active', 'recovering'].includes(status)) {
    throw new SportsFeedWriterError(
      'sports_participant_state_invalid',
      'Stat capture requires an Active or recovering citizen',
      422,
    );
  }
}

function formulaRangeValue(item) {
  return item && Object.prototype.hasOwnProperty.call(item, 'value')
    ? item.value
    : '';
}

function isFormulaValue(value) {
  return typeof value === 'string' && value.startsWith('=');
}

function transitionRecord(range, before, after, valueKind) {
  return {
    range,
    beforeHash: sha256(stableStringify(before)),
    afterHash: sha256(stableStringify(after)),
    valueKind,
  };
}

function retargetAppendRange(range, sheetName, rowNumber) {
  const prefix = `${sheetName}!`;
  if (!String(range).startsWith(prefix)) return range;
  return `${prefix}${String(range).slice(prefix.length).replace(/\d+/g, String(rowNumber))}`;
}

async function preflightCellTransitions(writeCells, readFormulaRanges) {
  const formulaValues = await readFormulaRanges(
    writeCells.map((cell) => cell.range)
  );
  if (!Array.isArray(formulaValues) ||
      formulaValues.length !== writeCells.length) {
    throw new SportsFeedWriterError(
      'sports_formula_preflight_failed',
      'Formula-visible preflight did not return every target cell',
      503,
    );
  }
  return writeCells.map((cell, index) => {
    const current = formulaRangeValue(formulaValues[index]);
    if (isFormulaValue(current)) {
      throw new SportsFeedWriterError(
        'sports_formula_cell_blocked',
        `${cell.range} contains a formula and cannot be replaced`,
        409,
      );
    }
    const matches = cell.spec
      ? statValuesEqual(current, cell.before, cell.spec)
      : safeCell(current) === safeCell(cell.before);
    if (!matches) {
      throw new SportsFeedWriterError(
        'sports_source_changed',
        `${cell.range} changed before the sports batch`,
        409,
      );
    }
    return transitionRecord(
      cell.range,
      current,
      cell.after,
      cell.valueKind,
    );
  });
}

function structuredBatchNoOp(error) {
  const status = Number(error && error.response && error.response.status);
  return Number.isInteger(status) &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 499;
}

function findUniqueRawRow(snapshot, sheetName, exactHeaders, identityIndex, identity, expected) {
  const normalized = normalizedRawSnapshot(snapshot, sheetName, { exactHeaders });
  const matches = normalized.rows.filter((row) => (
    safeCell(row.values[identityIndex]) === safeCell(identity)
  ));
  if (matches.length !== 1 || !rowsEqual(expected, matches[0].values)) {
    throw new SportsFeedWriterError(
      'sports_readback_mismatch',
      `${sheetName} append did not match unique read-back`,
      502,
    );
  }
  return matches[0];
}

function assertAppendIdentityAvailable(
  snapshot,
  sheetName,
  exactHeaders,
  identityIndex,
  identity,
) {
  const normalized = normalizedRawSnapshot(snapshot, sheetName, { exactHeaders });
  if (normalized.rows.some((row) => (
    safeCell(row.values[identityIndex]) === safeCell(identity)
  ))) {
    throw new SportsFeedWriterError(
      'sports_source_changed',
      `${sheetName} already contains this submission identity`,
      409,
    );
  }
  return normalized.rows.length + 2;
}

function createFileAuditStore(filePath) {
  const resolved = path.resolve(filePath);
  return {
    async find(idempotencyKey) {
      let text;
      try {
        text = fs.readFileSync(resolved, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
      const lines = text.split('\n').filter(Boolean);
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        let record;
        try {
          record = JSON.parse(lines[index]);
        } catch {
          continue;
        }
        if (record && record.idempotencyKey === idempotencyKey) return record;
      }
      return null;
    },

    async append(record) {
      const directory = path.dirname(resolved);
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      fs.chmodSync(directory, 0o700);
      fs.appendFileSync(resolved, `${JSON.stringify(record)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      });
      fs.chmodSync(resolved, 0o600);
    },
  };
}

function createSportsFeedWriter(dependencies) {
  const batchUpdateSpreadsheet = dependencies && dependencies.batchUpdateSpreadsheet;
  const getSheetIds = dependencies && dependencies.getSheetIds;
  const readSportsSource = dependencies && dependencies.readSportsSource;
  const readRange = dependencies && dependencies.readRange;
  const readFormulaRanges = dependencies && dependencies.readFormulaRanges;
  const auditStore = dependencies && dependencies.auditStore;
  const now = dependencies && dependencies.now
    ? dependencies.now
    : () => new Date();
  if (typeof batchUpdateSpreadsheet !== 'function') {
    throw new Error('batchUpdateSpreadsheet is required');
  }
  if (typeof getSheetIds !== 'function') throw new Error('getSheetIds is required');
  if (typeof readSportsSource !== 'function') {
    throw new Error('readSportsSource is required');
  }
  if (typeof readRange !== 'function') throw new Error('readRange is required');
  if (typeof readFormulaRanges !== 'function') {
    throw new Error('readFormulaRanges is required');
  }
  if (!auditStore || typeof auditStore.find !== 'function' ||
      typeof auditStore.append !== 'function') {
    throw new Error('auditStore with find and append is required');
  }

  let globalTail = Promise.resolve();
  let uncertain = false;

  async function execute(input) {
    const submission = input && input.submission
      ? input.submission
      : input && input.draft;
    const validation = validateSportsSubmission(submission);
    if (!validation.valid) {
      throw new SportsFeedWriterError(
        'sports_validation_failed',
        validation.errors.join('; '),
        422
      );
    }

    const envelope = mutationEnvelope(validation);
    const idempotencyKey = String(input.idempotencyKey || '').trim();
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
      throw new SportsFeedWriterError(
        'sports_idempotency_invalid',
        'A valid idempotency key is required',
        400
      );
    }

    const row = projectNewRow(
      input.submission ? input.submission.draft : input.draft
    );
    if (!rowsMatch(row, input.expectedRow)) {
      throw new SportsFeedWriterError(
        'sports_preview_row_mismatch',
        'The confirmed row no longer matches its preview',
        409
      );
    }

    if (!input.sourcePreconditions ||
        !Number.isInteger(input.sourcePreconditions.nextFeedRow)) {
      throw new SportsFeedWriterError(
        'sports_source_preconditions_missing',
        'Signed sports source preconditions are required',
        409
      );
    }
    const requestHash = sportsRequestHash(
      row,
      input.provenance,
      envelope,
      input.sourcePreconditions,
    );
    if (requestHash !== input.requestHash) {
      throw new SportsFeedWriterError(
        'sports_request_hash_mismatch',
        'The confirmed request no longer matches its preview',
        409
      );
    }

    const prior = await auditStore.find(idempotencyKey);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        throw new SportsFeedWriterError(
          'sports_idempotency_conflict',
          'This idempotency key belongs to a different sports event',
          409
        );
      }
      if (prior.result !== 'success') {
        throw new SportsFeedWriterError(
          prior.errorCode || 'sports_prior_write_failed',
          'The prior append attempt requires builder review before retrying',
          409,
          {
            replayed: true,
            updatedRange: Array.isArray(prior.updatedRanges)
              ? prior.updatedRanges[0] || null
              : prior.updatedRange || null,
          }
        );
      }
      const priorRanges = Array.isArray(prior.updatedRanges)
        ? prior.updatedRanges
        : prior.updatedRange ? [prior.updatedRange] : [];
      return {
        writePerformed: true,
        replayed: true,
        updatedRange: priorRanges[0] || null,
        updatedRanges: priorRanges,
        changedFieldCount: prior.changedFieldCount || 0,
        mutationAction: prior.mutationAction || null,
        rowNumber: prior.rowNumber,
        cycle: prior.cycle,
        team: prior.team,
        eventType: prior.eventType,
        requestHash,
        idempotencyKey,
        writtenAt: prior.timestamp,
      };
    }

    if (uncertain) {
      throw new SportsFeedWriterError(
        'sports_writer_uncertain',
        'A prior sports write has ambiguous read-back and requires builder review',
        503
      );
    }

    const auditBase = {
      auditVersion: AUDIT_VERSION,
      actorHash: String(input.actorHash || ''),
      cycle: Number(validation.draft.Cycle),
      team: validation.draft.TeamsUsed,
      eventType: validation.draft.EventType,
      mutationAction: validation.mutation ? validation.mutation.action : null,
      changedFieldCount: validation.mutation
        ? validation.mutation.changes.filter(
          (change) => change.before !== change.after
        ).length
        : 0,
      requestHash,
      idempotencyKey,
    };
    await auditStore.append({
      ...auditBase,
      timestamp: now().toISOString(),
      targetHash: null,
      updatedRanges: [],
      cellTransitions: [],
      rowNumber: null,
      result: 'pending',
    });

    let batchAttempted = false;
    let targetHash = null;
    let updatedRanges = [];
    let cellTransitions = [];
    try {
      const action = validation.mutation ? validation.mutation.action : null;
      const rosterEvent = validation.mutation &&
        validation.mutation.kind === 'roster-event';
      const [
        feedRows,
        rosterSnapshot,
        citizenSnapshot,
        lifeHistoryLogSnapshot,
        rippleLedgerSnapshot,
      ] = await Promise.all([
        readSportsSource(FEED_SHEET),
        validation.participant
          ? readSportsSource(validation.participant.rosterSource)
          : Promise.resolve(null),
        validation.participant
          ? readSportsSource(CITIZEN_SHEET)
          : Promise.resolve(null),
        rosterEvent
          ? readSportsSource(LIFE_HISTORY_LOG_SHEET)
          : Promise.resolve(null),
        rosterEvent
          ? readSportsSource(RIPPLE_LEDGER_SHEET)
          : Promise.resolve(null),
      ]);
      let currentPreconditions;
      try {
        currentPreconditions = createSportsSourcePreconditions({
          feedRows,
          rosterSnapshot,
          citizenSnapshot,
          lifeHistoryLogSnapshot,
          rippleLedgerSnapshot,
          participant: validation.participant,
          action,
        });
      } catch {
        throw new SportsFeedWriterError(
          'sports_source_changed',
          'The feed or selected mutation source could not be revalidated',
          409
        );
      }
      if (stableStringify(currentPreconditions) !==
          stableStringify(input.sourcePreconditions)) {
        throw new SportsFeedWriterError(
          'sports_source_changed',
          'The feed or selected roster row changed after preview',
          409
        );
      }

      const statChanges = changedStatFields(validation);
      let selectedRoster = null;
      let selectedCitizen = null;
      let rosterEventProjection = null;
      if (validation.participant) {
        selectedRoster = selectedRosterRow(rosterSnapshot, validation.participant);
        selectedCitizen = selectedCitizenRow(
          citizenSnapshot,
          validation.participant,
          selectedRoster.identity,
        );
      }
      if (action === 'stat-capture') {
        assertStatCitizenEligible(selectedCitizen);
        for (const change of validation.mutation.changes) {
          if (selectedRoster.values[STAT_FIELD_MAPS[
            validation.participant.rosterSource
          ][change.field].columnIndex] !== change.before) {
            throw new SportsFeedWriterError(
              'sports_source_changed',
              `${change.field} no longer matches its reviewed before value`,
              409
            );
          }
        }
      }
      if (rosterEvent) {
        try {
          rosterEventProjection = projectRosterEventMutation(validation, {
            roster: rosterState(selectedRoster),
            citizen: {
              ...selectedState(selectedCitizen),
              sourceRow: selectedCitizen.rowNumber,
            },
          });
        } catch (error) {
          throw new SportsFeedWriterError(
            'sports_source_changed',
            error.message,
            409,
          );
        }
      }

      let nextLifeHistoryLogRow = null;
      let nextRippleLedgerRow = null;
      if (rosterEventProjection) {
        nextLifeHistoryLogRow = assertAppendIdentityAvailable(
          lifeHistoryLogSnapshot,
          LIFE_HISTORY_LOG_SHEET,
          LIFE_HISTORY_LOG_HEADERS,
          3,
          rosterEventProjection.lifeHistory.eventTag,
        );
        nextRippleLedgerRow = assertAppendIdentityAvailable(
          rippleLedgerSnapshot,
          RIPPLE_LEDGER_SHEET,
          RIPPLE_LEDGER_HEADERS,
          2,
          validation.submissionId,
        );
      }

      const sheetNames = [
        FEED_SHEET,
        ...(validation.participant ? [validation.participant.rosterSource] : []),
        ...(validation.participant ? [CITIZEN_SHEET] : []),
        ...(rosterEvent ? [LIFE_HISTORY_LOG_SHEET, RIPPLE_LEDGER_SHEET] : []),
      ];
      const sheetIds = await getSheetIds(sheetNames);
      const requests = [appendCellsRequest(sheetIds[FEED_SHEET], row)];
      const feedRange = rowRange(
        FEED_SHEET,
        'A',
        'T',
        currentPreconditions.nextFeedRow,
      );
      let mutationRanges = [];
      let writeCells = row.map((value, columnIndex) => ({
        range: rowRange(
          FEED_SHEET,
          columnLetter(columnIndex),
          columnLetter(columnIndex),
          currentPreconditions.nextFeedRow,
        ),
        before: '',
        after: safeCell(value),
        valueKind: 'string',
        spec: null,
      }));
      const expectedRosterValues = selectedRoster
        ? selectedRoster.values.slice()
        : null;
      const expectedCitizenValues = selectedCitizen
        ? selectedCitizen.values.slice()
        : null;

      for (const change of statChanges) {
        const request = updateCellRequest(
          sheetIds[validation.participant.rosterSource],
          validation.participant.sourceRow,
          change.spec.columnIndex,
          change.after,
          change.spec,
        );
        requests.push(request);
        expectedRosterValues[change.spec.columnIndex] = change.after;
        const range = rowRange(
          validation.participant.rosterSource,
          change.spec.column,
          change.spec.column,
          validation.participant.sourceRow,
        );
        mutationRanges.push(range);
        writeCells.push({
          range,
          before: change.before,
          after: enteredValue(request),
          valueKind: change.spec.validator === 'record' ? 'string' : 'number',
          spec: change.spec,
        });
      }

      if (rosterEventProjection) {
        for (const field of rosterEventProjection.stateDiff.fields) {
          if (!field.changed) continue;
          const selected = field.surface === 'roster'
            ? selectedRoster
            : selectedCitizen;
          const sheetName = field.surface === 'roster'
            ? validation.participant.rosterSource
            : CITIZEN_SHEET;
          const rowNumber = selected.rowNumber;
          const columnIndex = field.surface === 'roster'
            ? selected.headers.indexOf(field.header)
            : selected.indexByHeader[field.header];
          if (columnIndex < 0 || !Number.isInteger(columnIndex)) {
            throw new SportsFeedWriterError(
              'sports_source_changed',
              `${sheetName} no longer contains ${field.header}`,
              409,
            );
          }
          const request = updateCellRequest(
            sheetIds[sheetName],
            rowNumber,
            columnIndex,
            field.after,
          );
          requests.push(request);
          if (field.surface === 'roster') {
            expectedRosterValues[columnIndex] = field.after;
          } else {
            expectedCitizenValues[columnIndex] = field.after;
          }
          const column = columnLetter(columnIndex);
          const range = rowRange(sheetName, column, column, rowNumber);
          mutationRanges.push(range);
          writeCells.push({
            range,
            before: field.before,
            after: enteredValue(request),
            valueKind: 'string',
            spec: null,
          });
        }

        const lifeHistoryIndex = selectedCitizen.indexByHeader.LifeHistory;
        const lifeHistoryRequest = updateCellRequest(
          sheetIds[CITIZEN_SHEET],
          selectedCitizen.rowNumber,
          lifeHistoryIndex,
          rosterEventProjection.lifeHistory.after,
        );
        requests.push(lifeHistoryRequest);
        expectedCitizenValues[lifeHistoryIndex] =
          rosterEventProjection.lifeHistory.after;
        const lifeColumn = columnLetter(lifeHistoryIndex);
        const lifeHistoryRange = rowRange(
          CITIZEN_SHEET,
          lifeColumn,
          lifeColumn,
          selectedCitizen.rowNumber,
        );
        mutationRanges.push(lifeHistoryRange);
        writeCells.push({
          range: lifeHistoryRange,
          before: rosterEventProjection.lifeHistory.before,
          after: enteredValue(lifeHistoryRequest),
          valueKind: 'string',
          spec: null,
        });

        requests.push(
          appendCellsRequest(
            sheetIds[LIFE_HISTORY_LOG_SHEET],
            rosterEventProjection.lifeHistory.logRow,
          ),
          appendCellsRequest(
            sheetIds[RIPPLE_LEDGER_SHEET],
            rosterEventProjection.ripple.row,
          ),
        );
        mutationRanges.push(
          rowRange(
            LIFE_HISTORY_LOG_SHEET,
            'A',
            'G',
            nextLifeHistoryLogRow,
          ),
          rowRange(
            RIPPLE_LEDGER_SHEET,
            'A',
            'M',
            nextRippleLedgerRow,
          ),
        );
        rosterEventProjection.lifeHistory.logRow.forEach((value, columnIndex) => {
          writeCells.push({
            range: rowRange(
              LIFE_HISTORY_LOG_SHEET,
              columnLetter(columnIndex),
              columnLetter(columnIndex),
              nextLifeHistoryLogRow,
            ),
            before: '',
            after: safeCell(value),
            valueKind: 'string',
            spec: null,
          });
        });
        rosterEventProjection.ripple.row.forEach((value, columnIndex) => {
          writeCells.push({
            range: rowRange(
              RIPPLE_LEDGER_SHEET,
              columnLetter(columnIndex),
              columnLetter(columnIndex),
              nextRippleLedgerRow,
            ),
            before: '',
            after: safeCell(value),
            valueKind: 'string',
            spec: null,
          });
        });
      }

      updatedRanges = [feedRange, ...mutationRanges];
      cellTransitions = await preflightCellTransitions(
        writeCells,
        readFormulaRanges,
      );

      if (rosterEventProjection) {
        for (let appendTargetAttempt = 0; appendTargetAttempt < 2;
          appendTargetAttempt += 1) {
          const [latestLifeHistoryLog, latestRippleLedger] = await Promise.all([
            readSportsSource(LIFE_HISTORY_LOG_SHEET),
            readSportsSource(RIPPLE_LEDGER_SHEET),
          ]);
          const latestLifeHistoryLogRow = assertAppendIdentityAvailable(
            latestLifeHistoryLog,
            LIFE_HISTORY_LOG_SHEET,
            LIFE_HISTORY_LOG_HEADERS,
            3,
            rosterEventProjection.lifeHistory.eventTag,
          );
          const latestRippleLedgerRow = assertAppendIdentityAvailable(
            latestRippleLedger,
            RIPPLE_LEDGER_SHEET,
            RIPPLE_LEDGER_HEADERS,
            2,
            validation.submissionId,
          );
          const targetMoved =
            latestLifeHistoryLogRow !== nextLifeHistoryLogRow ||
            latestRippleLedgerRow !== nextRippleLedgerRow;
          if (!targetMoved) break;
          if (appendTargetAttempt === 1) {
            throw new SportsFeedWriterError(
              'sports_source_changed',
              'Sports append targets kept moving before the batch',
              409,
              { appendTargetRetryExhausted: true },
            );
          }

          nextLifeHistoryLogRow = latestLifeHistoryLogRow;
          nextRippleLedgerRow = latestRippleLedgerRow;
          mutationRanges = mutationRanges.map((range) => (
            retargetAppendRange(
              retargetAppendRange(
                range,
                LIFE_HISTORY_LOG_SHEET,
                nextLifeHistoryLogRow,
              ),
              RIPPLE_LEDGER_SHEET,
              nextRippleLedgerRow,
            )
          ));
          writeCells = writeCells.map((cell) => ({
            ...cell,
            range: retargetAppendRange(
              retargetAppendRange(
                cell.range,
                LIFE_HISTORY_LOG_SHEET,
                nextLifeHistoryLogRow,
              ),
              RIPPLE_LEDGER_SHEET,
              nextRippleLedgerRow,
            ),
          }));
          updatedRanges = [feedRange, ...mutationRanges];
          cellTransitions = await preflightCellTransitions(
            writeCells,
            readFormulaRanges,
          );
        }
      }
      targetHash = sha256(stableStringify(cellTransitions));

      batchAttempted = true;
      await batchUpdateSpreadsheet(requests);

      const feedReadBack = await readRange(feedRange);
      if (!Array.isArray(feedReadBack) || feedReadBack.length !== 1 ||
          !rowsMatch(row, feedReadBack[0])) {
        throw new SportsFeedWriterError(
          'sports_readback_mismatch',
          'The appended row did not match exact-range read-back',
          502
        );
      }
      if (validation.participant) {
        const [rosterAfter, citizenAfter] = await Promise.all([
          readSportsSource(validation.participant.rosterSource),
          readSportsSource(CITIZEN_SHEET),
        ]);
        const rosterReadBack = selectedRosterRow(
          rosterAfter,
          validation.participant,
        );
        const citizenReadBack = selectedCitizenRow(
          citizenAfter,
          validation.participant,
          rosterReadBack.identity,
        );
        if (!rosterRowsEqual(
          expectedRosterValues,
          rosterReadBack.values,
          statChanges,
        ) ||
            !rowsEqual(expectedCitizenValues, citizenReadBack.values)) {
          throw new SportsFeedWriterError(
            'sports_readback_mismatch',
            'The selected roster or citizen row did not match exact read-back',
            502
          );
        }
      }
      if (rosterEventProjection) {
        const [lifeLogAfter, rippleAfter] = await Promise.all([
          readSportsSource(LIFE_HISTORY_LOG_SHEET),
          readSportsSource(RIPPLE_LEDGER_SHEET),
        ]);
        const lifeRow = findUniqueRawRow(
          lifeLogAfter,
          LIFE_HISTORY_LOG_SHEET,
          LIFE_HISTORY_LOG_HEADERS,
          3,
          rosterEventProjection.lifeHistory.eventTag,
          rosterEventProjection.lifeHistory.logRow,
        );
        const rippleRow = findUniqueRawRow(
          rippleAfter,
          RIPPLE_LEDGER_SHEET,
          RIPPLE_LEDGER_HEADERS,
          2,
          validation.submissionId,
          rosterEventProjection.ripple.row,
        );
        updatedRanges = updatedRanges.map((range) => {
          if (range.startsWith(`${LIFE_HISTORY_LOG_SHEET}!`)) {
            return rowRange(LIFE_HISTORY_LOG_SHEET, 'A', 'G', lifeRow.rowNumber);
          }
          if (range.startsWith(`${RIPPLE_LEDGER_SHEET}!`)) {
            return rowRange(RIPPLE_LEDGER_SHEET, 'A', 'M', rippleRow.rowNumber);
          }
          return range;
        });
        cellTransitions = cellTransitions.map((transition) => ({
          ...transition,
          range: retargetAppendRange(
            retargetAppendRange(
              transition.range,
              LIFE_HISTORY_LOG_SHEET,
              lifeRow.rowNumber,
            ),
            RIPPLE_LEDGER_SHEET,
            rippleRow.rowNumber,
          ),
        }));
        targetHash = sha256(stableStringify(cellTransitions));
      }

      const timestamp = now().toISOString();
      const record = {
        ...auditBase,
        timestamp,
        targetHash,
        updatedRanges,
        cellTransitions,
        rowNumber: currentPreconditions.nextFeedRow,
        result: 'success',
      };
      await auditStore.append(record);
      return {
        writePerformed: true,
        replayed: false,
        updatedRange: feedRange,
        updatedRanges,
        changedFieldCount: auditBase.changedFieldCount,
        mutationAction: auditBase.mutationAction,
        rowNumber: currentPreconditions.nextFeedRow,
        cycle: record.cycle,
        team: record.team,
        eventType: record.eventType,
        requestHash,
        idempotencyKey,
        writtenAt: timestamp,
      };
    } catch (error) {
      const provedNoOp = batchAttempted && structuredBatchNoOp(error);
      let safeError;
      if (provedNoOp) {
        safeError = new SportsFeedWriterError(
          'sports_batch_rejected',
          'Google Sheets rejected the batch before applying any request',
          Number(error.response.status),
        );
      } else {
        safeError = error instanceof SportsFeedWriterError
          ? error
          : new SportsFeedWriterError(
            batchAttempted ? 'sports_write_uncertain' : 'sports_batch_failed',
            batchAttempted
              ? 'The sports batch result is ambiguous and requires builder review'
              : 'The sports batch could not be prepared safely',
            502
          );
      }
      const ambiguous = batchAttempted && !provedNoOp;
      const result = ambiguous ? 'uncertain' : 'error';
      if (ambiguous) {
        uncertain = true;
        if (safeError.code !== 'sports_readback_mismatch') {
          safeError = new SportsFeedWriterError(
            'sports_write_uncertain',
            'The sports batch result is ambiguous and requires builder review',
            502,
            { causeCode: safeError.code },
          );
        }
      }
      await auditStore.append({
        ...auditBase,
        timestamp: now().toISOString(),
        targetHash,
        updatedRanges,
        cellTransitions,
        rowNumber: input.sourcePreconditions.nextFeedRow,
        result,
        errorCode: safeError.code,
      });
      throw safeError;
    }
  }

  return async function writeSportsFeed(input) {
    const previous = globalTail;
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    globalTail = tail;
    await previous;
    try {
      return await execute(input || {});
    } finally {
      release();
      if (globalTail === tail) globalTail = Promise.resolve();
    }
  };
}

module.exports = {
  FEED_SHEET,
  CITIZEN_SHEET,
  LIFE_HISTORY_LOG_SHEET,
  RIPPLE_LEDGER_SHEET,
  CITIZEN_REQUIRED_HEADERS,
  LIFE_HISTORY_LOG_HEADERS,
  RIPPLE_LEDGER_HEADERS,
  SportsFeedWriterError,
  createFileAuditStore,
  createSportsSourcePreconditions,
  createSportsFeedWriter,
  sha256,
  sportsRequestHash,
  stableStringify,
};
