'use strict';

// civic.47 M1 item 4 — Mara's promise record. What an office said it would
// do, quoted from its own public statement, kept in front of her until
// evidence tied to that promise closes it. Append-only JSONL; nothing is
// edited. Pure validation here; runDirective stages and commits the rows.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const maraDirective = require('./maraDirective');

const REL = path.join('output', 'mara-directives', 'promises.jsonl');
const SUNDAY_FIELDS = new Set(['quote', 'fullStatement', 'decision']);
const TRACKER_FIELDS = ['ImplementationPhase', 'Status', 'NextScheduledAction', 'NextActionCycle'];
const TERMINAL_STATUS_RE = /^(failed|withdrawn|rejected|expired|cancell?ed|closed|completed)$/i;
// Which tracker change supports which status (code M1 review finding 2): the
// row must have moved since the promise, in the way the status claims.
//   kept    — ImplementationPhase or Status moved (Status not terminal)
//   dropped — Status became terminal
//   changed — the next step was rescheduled (NextActionCycle / NextScheduledAction moved)
// kept: the work stage moved. Status is the legislative arc and advances on
// its own from the vote (code re-review finding 1), so it never shows a kept promise.
const STATUS_FIELDS = { kept: ['ImplementationPhase'], dropped: ['Status'], changed: ['NextActionCycle', 'NextScheduledAction'] };
const STATUSES = new Set(['kept', 'dropped', 'changed']);
const MIN_WORDS = 4;

const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
function norm(text) {
  return String(text == null ? '' : text)
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ').trim();
}
const slugOf = agentDir => String(agentDir).replace(/^civic-(office|project)-/, '').replace(/-/g, '_');
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}
function readJsonl(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  return text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}

// ctx: { root, cycle (the directive Cycle), roster: Set<agentDir>, trackerRows }
// Sources Mara may cite this run: the Cycle's Sunday statements, and the
// weekday statements of the week before it (datawake records carry the
// previous Cycle number).
function resolveSource(src, ctx) {
  if (!src || typeof src !== 'object') return { error: 'source missing' };
  const agentDir = String(src.office || '');
  if (!ctx.roster.has(agentDir)) return { error: 'office not on the roster: ' + agentDir };
  if (src.kind === 'sunday') {
    if (Number(src.cycle) !== Number(ctx.cycle)) return { error: 'Sunday source must be C' + ctx.cycle };
    const slug = slugOf(agentDir);
    let file = slug;
    if (slug === 'mayor') {
      if (src.statement !== 'open' && src.statement !== 'gavel') return { error: 'the mayor has two Sunday statements — statement must be "open" or "gavel"' };
      file = 'mayor_' + src.statement;
    } else if (src.statement) return { error: 'statement applies to the mayor only' };
    const j = readJson(path.join(ctx.root, 'output', 'civic-voice', file + '_c' + ctx.cycle + '.json'));
    if (!j) return { error: 'no Sunday statement on file for ' + agentDir + (src.statement ? ' (' + src.statement + ')' : '') };
    if (j.office !== file) return { error: 'Sunday file office "' + j.office + '" does not match ' + file };
    const i = Number(src.index);
    const st = Number.isInteger(i) && Array.isArray(j.statements) ? j.statements[i] : null;
    if (!st) return { error: 'no statement at index ' + src.index };
    if (!SUNDAY_FIELDS.has(src.field)) return { error: 'field must be quote, fullStatement or decision' };
    return { agentDir, text: st[src.field], initiative: st.initiative || null,
      key: ['sunday', ctx.cycle, file, i, src.field].join('|'), label: file + '_c' + ctx.cycle + ' statements[' + i + '].' + src.field };
  }
  if (src.kind === 'weekday') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(src.date || ''))) return { error: 'weekday source needs a date YYYY-MM-DD' };
    const j = readJson(path.join(ctx.root, 'output', 'cron-civic', 'datawake', agentDir + '_' + src.date + '.json'));
    if (!j) return { error: 'no weekday statement on file for ' + agentDir + ' ' + src.date };
    if (j.agentDir !== agentDir) return { error: 'weekday file agentDir does not match' };
    if (Number(j.cycle) !== Number(ctx.cycle) - 1) return { error: 'weekday source must be from the week before C' + ctx.cycle };
    if (src.field && src.field !== 'statement') return { error: 'weekday field must be statement' };
    return { agentDir, text: j.statement, initiative: null,
      key: ['weekday', src.date, agentDir, 'statement'].join('|'), label: agentDir + '_' + src.date + ' statement' };
  }
  return { error: 'source kind must be sunday or weekday' };
}

function resolveInitiative(value, trackerRows) {
  const v = norm(value).toLowerCase();
  if (!v) return null;
  const row = (trackerRows || []).find(r => String(r.InitiativeID || '').toLowerCase() === v || norm(r.Name).toLowerCase() === v);
  return row ? row.InitiativeID : null;
}

function quoteIn(said, text) {
  const q = norm(said);
  if (q.split(' ').filter(Boolean).length < MIN_WORDS) return 'quote must be at least ' + MIN_WORDS + ' words';
  if (typeof text !== 'string' || !norm(text).includes(q)) return 'quote is not in that statement';
  return null;
}

function validatePromise(input, ctx) {
  const src = resolveSource(input && input.source, ctx);
  if (src.error) return { ok: false, why: src.error };
  const bad = quoteIn(input.said, src.text);
  if (bad) return { ok: false, why: bad };
  const said = norm(input.said);
  const promiseId = 'P-' + hash([src.agentDir, src.key, said].join('|'));
  const initiativeId = resolveInitiative(src.initiative, ctx.trackerRows);
  const row = initiativeId ? (ctx.trackerRows || []).find(r => r.InitiativeID === initiativeId) : null;
  const trackerAtPromise = row ? Object.fromEntries(TRACKER_FIELDS.map(f => [f, norm(row[f])])) : null;
  return { ok: true, row: { kind: 'promise', eventId: promiseId, promiseId, office: src.agentDir, cycle: Number(ctx.cycle),
    said, source: src.label, initiativeId, trackerAtPromise, note: norm(input.note) || null } };
}

// Status evidence must be tied to the promise (re-review finding 3):
//  tracker   — the promise's initiative, a tracker field quoted exactly
//  statement — a later statement of the same office on the same initiative
//  answer    — the office's answer to the directive block that carried it
// Statement and answer closes are Mara's reading of the office's own words:
// she quotes the words she relies on, and the row is marked basis
// 'office-word' (code re-review finding 1).
function validateStatus(input, ctx, record) {
  const p = record.promises.get(input && input.promiseId);
  if (!p) return { ok: false, why: 'unknown promiseId' };
  if (!record.openIds.has(p.promiseId)) return { ok: false, why: 'promise already closed' };
  if (!STATUSES.has(input.status)) return { ok: false, why: 'status must be kept, dropped or changed' };
  const ev = input.evidence || {};
  let evidence;
  if (ev.type === 'tracker') {
    if (!p.initiativeId) return { ok: false, why: 'promise has no initiative — tracker evidence cannot speak to it' };
    if (ev.initiativeId !== p.initiativeId) return { ok: false, why: 'tracker evidence is for another initiative' };
    if (!STATUS_FIELDS[input.status].includes(ev.field)) return { ok: false, why: input.status + ' needs ' + STATUS_FIELDS[input.status].join(' or ') + ' evidence' };
    const row = (ctx.trackerRows || []).find(r => r.InitiativeID === ev.initiativeId);
    if (!row || norm(row[ev.field]) !== norm(ev.value) || !norm(ev.value)) return { ok: false, why: 'tracker value does not match the live row' };
    const before = p.trackerAtPromise ? p.trackerAtPromise[ev.field] : undefined;
    if (before === undefined) return { ok: false, why: 'no tracker reading from when the promise was made' };
    if (norm(ev.value) === before) return { ok: false, why: 'the tracker has not moved since the promise' };
    const terminal = TERMINAL_STATUS_RE.test(norm(row.Status));
    if (input.status === 'dropped' && !terminal) return { ok: false, why: 'dropped needs a terminal Status' };
    if (input.status === 'kept' && terminal) return { ok: false, why: 'a terminal Status is not a kept promise' };
    evidence = { type: 'tracker', initiativeId: ev.initiativeId, field: ev.field, before, value: norm(ev.value), basis: 'tracker' };
  } else if (ev.type === 'statement') {
    if (!p.initiativeId) return { ok: false, why: 'promise has no initiative — close it through her question to the office' };
    const src = resolveSource(ev.source, ctx);
    if (src.error) return { ok: false, why: src.error };
    if (src.agentDir !== p.office) return { ok: false, why: 'evidence statement is from another office' };
    if (src.key.startsWith('sunday') && Number(ctx.cycle) <= p.cycle) return { ok: false, why: 'evidence must be later than the promise' };
    if (resolveInitiative(src.initiative, ctx.trackerRows) !== p.initiativeId) return { ok: false, why: 'evidence statement is about another initiative' };
    const bad = quoteIn(ev.quote, src.text);
    if (bad) return { ok: false, why: bad };
    evidence = { type: 'statement', source: src.label, quote: norm(ev.quote), basis: 'office-word' };
  } else if (ev.type === 'answer') {
    const m = String(ev.confrontationId || '').match(/^CONF-(\d+)-(.+)$/);
    if (!m || m[2] !== p.office) return { ok: false, why: 'answer must be bound to a question to this office' };
    const auto = path.join(ctx.root, 'output', 'mara-directives', 'mara_directive_c' + m[1] + '_AUTO.txt');
    let text = '';
    try { text = fs.readFileSync(auto, 'utf8'); } catch (e) { return { ok: false, why: 'no directive C' + m[1] }; }
    if (!maraDirective.blocksFor(text, p.office).some(b => maraDirective.promiseIdsIn(b).includes(p.promiseId))) {
      return { ok: false, why: 'that question did not carry this promise' };
    }
    const reply = (ctx.answers || []).find(a => a.confrontationId === ev.confrontationId && a.agentDir === p.office);
    if (!reply) return { ok: false, why: 'the office has not answered that question' };
    // A deferral ("not known yet") closes nothing — the promise stays open.
    if (reply.kind === 'deferral') return { ok: false, why: 'the office deferred — the promise stays open' };
    const badQuote = quoteIn(ev.quote, reply.text);
    if (badQuote) return { ok: false, why: 'quote the words of the reply you rely on — ' + badQuote };
    evidence = { type: 'answer', confrontationId: ev.confrontationId, quote: norm(ev.quote), text: norm(reply.text), basis: 'office-word' };
  } else return { ok: false, why: 'evidence type must be tracker, statement or answer' };
  const eventId = 'S-' + hash([p.promiseId, ctx.cycle, input.status, JSON.stringify(evidence)].join('|'));
  return { ok: true, row: { kind: 'status', eventId, promiseId: p.promiseId, cycle: Number(ctx.cycle), status: input.status, evidence, note: norm(input.note) || null } };
}

function loadRecord(root) {
  const rows = readJsonl(path.join(root, REL));
  const promises = new Map(), closed = new Set(), eventIds = new Set();
  for (const r of rows) {
    eventIds.add(r.eventId);
    if (r.kind === 'promise' && !promises.has(r.promiseId)) promises.set(r.promiseId, r);
    if (r.kind === 'status') closed.add(r.promiseId);
  }
  const openIds = new Set([...promises.keys()].filter(id => !closed.has(id)));
  return { rows, promises, openIds, eventIds, open: [...openIds].map(id => promises.get(id)) };
}

// Append rows whose eventId is not already in the file. Returns what landed.
function appendRows(root, rows) {
  const file = path.join(root, REL);
  const have = loadRecord(root).eventIds;
  const fresh = rows.filter(r => r && r.eventId && !have.has(r.eventId));
  if (fresh.length) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, fresh.map(r => JSON.stringify(r)).join('\n') + '\n');
  }
  return { written: fresh.map(r => r.eventId), skipped: rows.filter(r => !fresh.includes(r)).map(r => r && r.eventId) };
}

module.exports = { REL, norm, resolveSource, resolveInitiative, validatePromise, validateStatus, loadRecord, appendRows, slugOf };
