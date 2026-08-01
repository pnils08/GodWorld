#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  FEED_HEADERS,
  projectNewRow,
  validateDraft,
} = require('./sportsFeedContract.js');

const FEED_SHEET = 'Oakland_Sports_Feed';
const AUDIT_VERSION = 1;

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

function sportsRequestHash(row, provenance = null) {
  return sha256(stableStringify({
    contractVersion: 1,
    row,
    provenance: provenance || null,
  }));
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

function parseUpdatedRange(value) {
  const match = String(value || '').match(
    /^'?Oakland_Sports_Feed'?!A(\d+):T(\d+)$/
  );
  if (!match || match[1] !== match[2]) {
    throw new SportsFeedWriterError(
      'sports_updated_range_invalid',
      'Sheets did not return one exact Oakland sports row range',
      502
    );
  }
  return { range: String(value), rowNumber: Number(match[1]) };
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
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.appendFileSync(resolved, `${JSON.stringify(record)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      });
    },
  };
}

function createSportsFeedWriter(dependencies) {
  const appendRowsDetailed = dependencies && dependencies.appendRowsDetailed;
  const readRange = dependencies && dependencies.readRange;
  const auditStore = dependencies && dependencies.auditStore;
  const now = dependencies && dependencies.now
    ? dependencies.now
    : () => new Date();
  if (typeof appendRowsDetailed !== 'function') {
    throw new Error('appendRowsDetailed is required');
  }
  if (typeof readRange !== 'function') throw new Error('readRange is required');
  if (!auditStore || typeof auditStore.find !== 'function' ||
      typeof auditStore.append !== 'function') {
    throw new Error('auditStore with find and append is required');
  }

  const locks = new Map();

  async function execute(input) {
    const validation = validateDraft(input && input.draft);
    if (!validation.valid) {
      throw new SportsFeedWriterError(
        'sports_validation_failed',
        validation.errors.join('; '),
        422
      );
    }

    const idempotencyKey = String(input.idempotencyKey || '').trim();
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
      throw new SportsFeedWriterError(
        'sports_idempotency_invalid',
        'A valid idempotency key is required',
        400
      );
    }

    const row = projectNewRow(input.draft);
    if (!rowsMatch(row, input.expectedRow)) {
      throw new SportsFeedWriterError(
        'sports_preview_row_mismatch',
        'The confirmed row no longer matches its preview',
        409
      );
    }

    const requestHash = sportsRequestHash(row, input.provenance);
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
          { replayed: true, updatedRange: prior.updatedRange || null }
        );
      }
      return {
        writePerformed: true,
        replayed: true,
        updatedRange: prior.updatedRange,
        rowNumber: prior.rowNumber,
        cycle: prior.cycle,
        team: prior.team,
        eventType: prior.eventType,
        requestHash,
        idempotencyKey,
        writtenAt: prior.timestamp,
      };
    }

    const auditBase = {
      auditVersion: AUDIT_VERSION,
      actorHash: String(input.actorHash || ''),
      cycle: Number(validation.value.Cycle),
      team: validation.value.TeamsUsed,
      eventType: validation.value.EventType,
      requestHash,
      idempotencyKey,
    };
    await auditStore.append({
      ...auditBase,
      timestamp: now().toISOString(),
      updatedRange: null,
      rowNumber: null,
      result: 'pending',
    });

    let updatedRange = null;
    try {
      const appendResult = await appendRowsDetailed(FEED_SHEET, [row]);
      if (appendResult.updatedRows !== 1) {
        throw new SportsFeedWriterError(
          'sports_append_count_mismatch',
          'Sheets did not report exactly one appended row',
          502
        );
      }
      const parsedRange = parseUpdatedRange(appendResult.updatedRange);
      updatedRange = parsedRange.range;

      const readBack = await readRange(updatedRange);
      if (!Array.isArray(readBack) || readBack.length !== 1 ||
          !rowsMatch(row, readBack[0])) {
        throw new SportsFeedWriterError(
          'sports_readback_mismatch',
          'The appended row did not match exact-range read-back',
          502
        );
      }

      const timestamp = now().toISOString();
      const record = {
        ...auditBase,
        timestamp,
        updatedRange,
        rowNumber: parsedRange.rowNumber,
        result: 'success',
      };
      await auditStore.append(record);
      return {
        writePerformed: true,
        replayed: false,
        updatedRange,
        rowNumber: parsedRange.rowNumber,
        cycle: record.cycle,
        team: record.team,
        eventType: record.eventType,
        requestHash,
        idempotencyKey,
        writtenAt: timestamp,
      };
    } catch (error) {
      const safeError = error instanceof SportsFeedWriterError
        ? error
        : new SportsFeedWriterError(
          'sports_append_failed',
          'The sports row could not be safely appended',
          502
        );
      await auditStore.append({
        ...auditBase,
        timestamp: now().toISOString(),
        updatedRange,
        rowNumber: updatedRange ? parseUpdatedRange(updatedRange).rowNumber : null,
        result: 'error',
        errorCode: safeError.code,
      });
      throw safeError;
    }
  }

  return async function writeSportsFeed(input) {
    const key = String(input && input.idempotencyKey || '').trim();
    const previous = locks.get(key) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    locks.set(key, tail);
    await previous;
    try {
      return await execute(input || {});
    } finally {
      release();
      if (locks.get(key) === tail) locks.delete(key);
    }
  };
}

module.exports = {
  FEED_SHEET,
  SportsFeedWriterError,
  createFileAuditStore,
  createSportsFeedWriter,
  sha256,
  sportsRequestHash,
  stableStringify,
};
