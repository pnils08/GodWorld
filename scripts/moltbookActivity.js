#!/usr/bin/env node
/**
 * Moltbook activity handoff helpers.
 *
 * The heartbeat owns browsing and action logs. The Mags reflection wake owns
 * turning those actions into personal continuity. This module provides the
 * cursor between them so one Moltbook action batch can influence Mags once,
 * without constraining what she chooses to read, upvote, reply to, or post.
 */

const fs = require('fs');
const path = require('path');

const REFLECTION_TYPES = new Set(['reply', 'upvote', 'post']);
const CENTRAL_TZ = 'America/Chicago';

function centralDate_(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CENTRAL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date || new Date());
}

function centralHour_(date) {
  return Number(new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TZ,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date || new Date()));
}

function isScheduledVisitWindow(date, visitHour) {
  return centralHour_(date) === Number(visitHour == null ? 14 : visitHour);
}

function hasVisitedToday(lastRun, now) {
  const time = Date.parse(lastRun || '');
  if (!Number.isFinite(time)) return false;
  return centralDate_(new Date(time)) === centralDate_(now || new Date());
}

function loadCursor_(cursorFile) {
  try {
    if (!fs.existsSync(cursorFile)) return null;
    const parsed = JSON.parse(fs.readFileSync(cursorFile, 'utf8'));
    const time = Date.parse(parsed.lastConsumedAt || '');
    return Number.isFinite(time) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function entryKey_(entry) {
  return [
    entry.timestamp || '',
    entry.type || '',
    entry.targetId || entry.postId || '',
    entry.targetTitle || entry.title || '',
  ].join('|');
}

function readLogFile_(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function loadUnconsumed(logDir, cursorFile, opts) {
  const options = opts || {};
  const now = options.now || new Date();
  const cursor = loadCursor_(cursorFile);
  const cursorMs = cursor ? Date.parse(cursor.lastConsumedAt) : null;
  const initialDate = centralDate_(now);

  let names = [];
  try {
    names = fs.readdirSync(logDir)
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort();
  } catch (_) {
    return [];
  }

  // First deployment starts with today's activity, not the entire historical
  // archive. Once a cursor exists, scan forward from its date so a failed
  // reflection can safely catch up on the next wake.
  if (!cursor) {
    names = names.filter((name) => name === initialDate + '.json');
  } else {
    const cursorDate = centralDate_(new Date(cursorMs));
    names = names.filter((name) => name.slice(0, 10) >= cursorDate);
  }

  const seen = new Set();
  const entries = [];
  names.forEach((name) => {
    readLogFile_(path.join(logDir, name)).forEach((entry) => {
      if (!entry || !REFLECTION_TYPES.has(entry.type)) return;
      const timestampMs = Date.parse(entry.timestamp || '');
      if (!Number.isFinite(timestampMs)) return;
      if (cursorMs != null && timestampMs <= cursorMs) return;
      const key = entryKey_(entry);
      if (seen.has(key)) return;
      seen.add(key);
      entries.push(entry);
    });
  });

  entries.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return entries;
}

function markConsumed(cursorFile, entries, opts) {
  const valid = (entries || [])
    .map((entry) => ({ entry, time: Date.parse((entry && entry.timestamp) || '') }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => a.time - b.time);
  if (!valid.length) return null;

  const options = opts || {};
  const state = {
    lastConsumedAt: new Date(valid[valid.length - 1].time).toISOString(),
    updatedAt: (options.now || new Date()).toISOString(),
    lastBatchSize: valid.length,
  };
  fs.mkdirSync(path.dirname(cursorFile), { recursive: true });
  const tempFile = cursorFile + '.tmp-' + process.pid;
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(tempFile, cursorFile);
  return state;
}

module.exports = {
  REFLECTION_TYPES,
  centralDate_,
  centralHour_,
  isScheduledVisitWindow,
  hasVisitedToday,
  loadCursor_,
  loadUnconsumed,
  markConsumed,
};
