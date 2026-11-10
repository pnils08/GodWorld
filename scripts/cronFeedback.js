#!/usr/bin/env node
'use strict';

/**
 * cronFeedback.js — what the crons said they lacked, in front of the builder
 * session (pipeline.109, builder 2026-11-09).
 *
 * Every write wake records what its packet did not supply, a grade with what
 * fell short, and (when held) the gate's finding; Varek's journal records its
 * audit points; the daily news logs what it skipped. Until this script each of
 * those stopped at the writer's own page or a file nothing read. This reads
 * them off disk for the last N days and writes one list:
 *
 *   output/cron-feedback.md        the full list
 *   --boot                         a short digest on stdout (SessionStart hook)
 *
 * Read-only on everything but its own output file. No model call, no sheet.
 * It files no ROLLOUT row: rows stay on the builder's word.
 *
 * Usage: node scripts/cronFeedback.js [--days 7] [--boot]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GRADE_PARTS = [
  ['opened', 'the opening'],
  ['closed', 'the closing'],
  ['purposeMet', 'the piece\'s purpose'],
  ['inTarget', 'the length target'],
];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function recent(dir, pattern, cutoff) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => pattern.test(name))
    .map((name) => ({ name, file: path.join(dir, name), mtimeMs: fs.statSync(path.join(dir, name)).mtimeMs }))
    .filter((entry) => entry.mtimeMs >= cutoff)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function seatOf(name) {
  const match = String(name).match(/^[a-z-]+_c\d+_([a-z0-9-]+?)_packet/i);
  return match ? match[1] : String(name).replace(/\.(wake|packet)?\.?json$/, '');
}

// Every `missing` / `missingOrThin` list anywhere inside a record.
function missingIn(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  for (const key of Object.keys(node)) {
    const value = node[key];
    if ((key === 'missing' || key === 'missingOrThin') && Array.isArray(value)) {
      for (const item of value) {
        const text = typeof item === 'string' ? item
          : item && item.source ? item.source + (item.why ? ' — ' + item.why : '') : '';
        if (text.trim()) out.push(text.replace(/\s+/g, ' ').trim());
      }
    } else {
      missingIn(value, out);
    }
  }
  return out;
}

function collect(root, days, nowMs) {
  const cutoff = nowMs - days * 864e5;
  const compare = path.join(root, 'output', 'cron-compare');
  const wakes = recent(compare, /\.wake\.json$/, cutoff)
    .map((entry) => Object.assign(entry, { record: readJson(entry.file) }))
    .filter((entry) => entry.record);

  // 1. What reporters lacked: one line per distinct lack, with who hit it.
  const lacks = new Map();
  // The lists live in each seat's angle file (`<desk>_c<N>_<seat>_packet-v2_angle.json`):
  // the creative brief the reporter wrote before the piece, `missing` = what
  // the packet did not hold for the story they chose.
  const packets = recent(compare, /_angle\.json$/, cutoff);
  for (const packet of packets) {
    for (const text of new Set(missingIn(readJson(packet.file)))) {
      if (!lacks.has(text)) lacks.set(text, new Set());
      lacks.get(text).add(seatOf(packet.name));
    }
  }
  const lacked = Array.from(lacks.entries())
    .map(([text, seats]) => ({ text, seats: Array.from(seats).sort() }))
    .sort((a, b) => b.seats.length - a.seats.length || a.text.localeCompare(b.text));

  // 2. Grades: which part of the contract fails, how often, and for whom.
  const graded = wakes.filter((wake) => wake.record.contractScore);
  const parts = GRADE_PARTS.map(([key, label]) => {
    const failing = graded.filter((wake) => wake.record.contractScore[key] === false);
    return { key, label, failed: failing.length, of: graded.length, seats: Array.from(new Set(failing.map((w) => seatOf(w.name)))).sort() };
  });
  const shortfalls = graded
    .filter((wake) => wake.record.contractScore.short)
    .map((wake) => ({ seat: seatOf(wake.name), line: String(wake.record.gradeRecord && wake.record.gradeRecord.line || wake.record.contractScore.short) }));

  // 3. What the gate held.
  const held = recent(path.join(compare, 'flagged'), /\.flags\.json$/, cutoff).map((entry) => {
    const record = readJson(entry.file) || {};
    return { draft: String(record.draft || entry.name).replace(/\.md$/, ''), summary: String(record.summary || '').replace(/\s+/g, ' ').trim() };
  });

  // 4. Varek's journal: the newest entry's audit points, and weeks with none.
  const journalDir = path.join(root, 'output', 'civis-journal');
  const journals = recent(journalDir, /^civis_journal_c\d+\.json$/, 0)
    .map((entry) => readJson(entry.file)).filter(Boolean).sort((a, b) => b.cycle - a.cycle);
  const journal = journals[0] ? {
    cycle: journals[0].cycle,
    points: (journals[0].findings || []).filter((f) => f.selected).map((f) => String(f.civisFinding || f.target || '').replace(/\s+/g, ' ').trim()),
  } : null;
  const unwritten = recent(path.join(root, 'output', 'civis-journal-failed'), /\.failed\.json$/, cutoff)
    .map((entry) => readJson(entry.file))
    // a week a later run wrote is not an unwritten week, whatever its failed file says
    .filter((record) => record && !record.passed && !journals.some((written) => written.cycle === record.cycle))
    .map((record) => ({ cycle: record.cycle, failures: Array.from(new Set((record.attempts || []).flatMap((a) => a.failures || []))) }));

  // 5. The daily news: what the last run carried and what it skipped.
  const manifests = [];
  const dailyDir = path.join(root, 'output', 'notebooklm', 'daily');
  if (fs.existsSync(dailyDir)) {
    for (const cycleDir of fs.readdirSync(dailyDir)) {
      const full = path.join(dailyDir, cycleDir);
      if (!fs.statSync(full).isDirectory()) continue;
      for (const run of fs.readdirSync(full)) {
        const record = readJson(path.join(full, run, 'manifest.json'));
        if (record && record.driveLink) manifests.push(record);
      }
    }
  }
  manifests.sort((a, b) => Date.parse(b.lastAttemptAt || b.generatedAt || 0) - Date.parse(a.lastAttemptAt || a.generatedAt || 0));
  const last = manifests[0];
  const kinds = {};
  for (const source of (last && (last.audioSources || last.sources)) || []) kinds[source.kind] = (kinds[source.kind] || 0) + 1;
  const logFile = path.join(root, 'logs', 'notebooklm-daily-news.log');
  const skipped = fs.existsSync(logFile)
    ? fs.readFileSync(logFile, 'utf8').split('\n').slice(-80)
      .filter((line) => /SKIPPED|STOPPED|NOT REMOVED|NOT SENT|background from the canon notebook|failed:/i.test(line))
      .map((line) => line.replace(/\s+/g, ' ').trim().slice(0, 200))
    : [];
  const show = last ? { at: last.lastAttemptAt || last.generatedAt, cycle: last.cycle, kinds, opsReport: last.opsReportDelivered === true ? 'delivered' : last.opsReportPath ? 'made, not sent' : 'not produced' } : null;

  return { days, wakes: wakes.length, packets: packets.length, lacked, parts, graded: graded.length, shortfalls, held, journal, unwritten, show, skipped };
}

function render(feedback) {
  const lines = ['# Cron feedback — last ' + feedback.days + ' days', '',
    'What the crons recorded about their own work. Read from disk by `scripts/cronFeedback.js`; nothing here is a filed job.', ''];
  lines.push('## What reporters were not given (' + feedback.lacked.length + ' distinct, ' + feedback.packets + ' story angles)', '');
  for (const lack of feedback.lacked) lines.push('- ' + lack.text + ' — ' + lack.seats.join(', '));
  lines.push('', '## Where the grade falls (' + feedback.graded + ' graded pieces)', '');
  for (const part of feedback.parts) {
    lines.push('- ' + part.label + ': failed ' + part.failed + ' of ' + part.of + (part.seats.length ? ' — ' + part.seats.join(', ') : ''));
  }
  lines.push('');
  for (const shortfall of feedback.shortfalls) lines.push('- ' + shortfall.seat + ' — ' + shortfall.line);
  lines.push('', '## What the gate held (' + feedback.held.length + ')', '');
  for (const draft of feedback.held) lines.push('- ' + draft.draft + ' — ' + draft.summary);
  lines.push('', '## Varek\'s journal', '');
  if (feedback.journal) {
    lines.push('Newest entry: Cycle ' + feedback.journal.cycle + '. Its audit points:', '');
    for (const point of feedback.journal.points) lines.push('- ' + point);
  } else {
    lines.push('No entry on disk.');
  }
  for (const week of feedback.unwritten) lines.push('- Cycle ' + week.cycle + ': no entry passed — ' + week.failures.join('; '));
  lines.push('', '## The daily news', '');
  if (feedback.show) {
    lines.push('Last delivered show: ' + feedback.show.at + ' (Cycle ' + feedback.show.cycle + ') — ' +
      (Object.keys(feedback.show.kinds).map((kind) => feedback.show.kinds[kind] + ' ' + kind).join(', ') || 'no per-source record (before v2.0)') +
      '; ops report ' + feedback.show.opsReport + '.', '');
  }
  for (const line of feedback.skipped) lines.push('- ' + line);
  return lines.join('\n') + '\n';
}

function bootDigest(feedback) {
  const worst = feedback.parts.slice().sort((a, b) => b.failed - a.failed)[0];
  const lines = ['CRON FEEDBACK (' + feedback.days + 'd, ' + feedback.wakes + ' write wakes) — full list: output/cron-feedback.md'];
  lines.push('  not given to reporters: ' + feedback.lacked.length + ' distinct' +
    (feedback.lacked[0] ? '; most shared: "' + feedback.lacked[0].text.slice(0, 90) + '" (' + feedback.lacked[0].seats.length + ' seats)' : ''));
  if (worst && worst.of) lines.push('  grade: ' + worst.label + ' failed ' + worst.failed + ' of ' + worst.of + ' pieces');
  lines.push('  gate held: ' + feedback.held.length + ' draft(s)');
  lines.push('  Varek journal: ' + (feedback.journal ? 'newest C' + feedback.journal.cycle + ', ' + feedback.journal.points.length + ' audit points' : 'none') +
    (feedback.unwritten.length ? '; no entry passed for C' + feedback.unwritten.map((w) => w.cycle).join(', C') : ''));
  if (feedback.show) {
    lines.push('  daily news: last show ' + String(feedback.show.at).slice(0, 10) + ', ops report ' +
      feedback.show.opsReport + ', ' + feedback.skipped.length + ' skip line(s) in the log');
  }
  return lines.join('\n');
}

function main(argv) {
  const daysAt = argv.indexOf('--days');
  const days = daysAt >= 0 ? Number(argv[daysAt + 1]) : 7;
  if (!Number.isFinite(days) || days <= 0) throw new Error('--days must be a positive number');
  const feedback = collect(ROOT, days, Date.now());
  const out = path.join(ROOT, 'output', 'cron-feedback.md');
  fs.writeFileSync(out, render(feedback));
  console.log(argv.includes('--boot') ? bootDigest(feedback) : 'Cron feedback: ' + path.relative(ROOT, out) + '\n' + bootDigest(feedback));
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (error) {
    console.error('cronFeedback failed: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = { collect, render, bootDigest, missingIn, seatOf };
