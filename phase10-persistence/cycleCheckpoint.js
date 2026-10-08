/**
 * ============================================================================
 * CYCLE CHECKPOINT — engine.95 (plan: docs/plans/2026-07-31-platform-ceiling-resilience.md
 * §Build notes Revision 2)
 * ============================================================================
 *
 * A Cycle that would cross the Apps Script wall saves its commit tail here —
 * the queued intents, the cache's queued cells, and the handful of summary
 * fields the four Phase-11 phases read — and a one-shot trigger finishes the
 * tail in a fresh execution. One automatic resume, no automatic retry: a
 * resume that dies leaves a named state that refuses admission until a hand
 * reconciles.
 *
 * This file holds the pure parts (codec, chunking, payload shape) and the tab
 * writer/reader. The gate, the resume core and the admission branch live in
 * the runner (godWorldEngine2.js); the doors in webTrigger.js.
 *
 * Direct writes here are the `checkpoint` class in SHEETS_MANIFEST §9: the
 * save runs BEFORE Phase10-ExecuteIntents by necessity — an intent cannot
 * carry the intent queue.
 * ============================================================================
 */

var CHECKPOINT_SCHEMA = 1;                 // bump when the payload shape changes; a resume refuses another schema
var CHECKPOINT_TAB = '_CycleCheckpoint';   // hidden; four columns gen | i | n | data; manifest in row 1 (col A = JSON), chunks from row 2
var CHECKPOINT_CHUNK_CHARS = 40000;        // cap on the ENCODED chunk string (a cell holds 50,000 chars; the row carries three more cells)
var CHECKPOINT_SUMMARY_FIELDS = [          // what the tail reads (codex Review 2 F1 inventory); businessClosures and auditIssues are structures
  'cycle', 'cycleRef', 'absoluteCycle', 'cycleId',
  'season', 'holiday', 'holidayPriority', 'isFirstFriday', 'isCreationDay', 'sportsSeason',
  'simMonth', 'month', 'simYear',
  'businessClosures', 'auditIssues', 'engineErrorCount', 'phaseTimings'
];
var CHECKPOINT_STATES = { staging: true, ready: true, resuming: true, committed: true, 'commit-failed': true, 'save-failed': true, 'resume-failed': true };

// ───────────────────────────────────────────────────────────────────────────
// Codec. Dates → {"$d": iso}; undefined array elements → {"$u": 1}; a literal
// object with any key starting with "$" is wrapped as {"$obj": …} so the tags
// cannot collide with data. Object members that are undefined are dropped (a
// read of the restored object gives undefined either way). Everything else
// must be a string, finite number, boolean, null, array or plain object — a
// function, symbol, non-finite number, invalid Date, host or class object
// fails the save loudly. No fallback: a payload that cannot be carried is a
// Cycle that stops, not a Cycle that resumes wrong.
// ───────────────────────────────────────────────────────────────────────────

function ckIsDate_(v) { return Object.prototype.toString.call(v) === '[object Date]'; }

function ckEncodeValue_(v, path) {
  if (v === null) return null;
  var t = typeof v;
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'number') {
    if (!isFinite(v)) throw new Error('checkpoint codec: non-finite number at ' + path);
    return v;
  }
  if (t !== 'object') throw new Error('checkpoint codec: unsupported ' + t + ' at ' + path);
  if (ckIsDate_(v)) {
    if (isNaN(v.getTime())) throw new Error('checkpoint codec: invalid Date at ' + path);
    return { $d: v.toISOString() };
  }
  if (Array.isArray(v)) {
    var arr = [];
    for (var i = 0; i < v.length; i++) {
      arr.push(v[i] === undefined ? { $u: 1 } : ckEncodeValue_(v[i], path + '[' + i + ']'));
    }
    return arr;
  }
  // Plain object test that holds across realms (the test harness builds objects outside the vm):
  // a plain object's prototype is Object.prototype, whose own prototype is null.
  var proto = Object.getPrototypeOf(v);
  if (proto !== null && Object.getPrototypeOf(proto) !== null) throw new Error('checkpoint codec: host or class object at ' + path);
  var out = {}, wrap = false;
  for (var k in v) {
    if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
    if (v[k] === undefined) continue;
    if (k.charAt(0) === '$') wrap = true;
    out[k] = ckEncodeValue_(v[k], path + '.' + k);
  }
  return wrap ? { $obj: out } : out;
}

function ckDecodeValue_(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) {
    var arr = new Array(v.length);
    for (var i = 0; i < v.length; i++) {
      var e = v[i];
      arr[i] = (e && typeof e === 'object' && !Array.isArray(e) && e.$u === 1 && ckKeyCount_(e) === 1) ? undefined : ckDecodeValue_(e);
    }
    return arr;
  }
  var n = ckKeyCount_(v);
  if (n === 1 && typeof v.$d === 'string') {
    var d = new Date(v.$d);
    if (isNaN(d.getTime())) throw new Error('checkpoint codec: bad date tag ' + v.$d);
    return d;
  }
  if (n === 1 && v.$obj && typeof v.$obj === 'object' && !Array.isArray(v.$obj)) {
    var inner = {};
    for (var k in v.$obj) if (Object.prototype.hasOwnProperty.call(v.$obj, k)) inner[k] = ckDecodeValue_(v.$obj[k]);
    return inner;
  }
  var out = {};
  for (var k2 in v) if (Object.prototype.hasOwnProperty.call(v, k2)) out[k2] = ckDecodeValue_(v[k2]);
  return out;
}

function ckKeyCount_(o) { var n = 0; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) n++; return n; }

/** Object → encoded string. Throws on anything the codec cannot carry. */
function encodeCheckpointPayload_(payload) {
  return JSON.stringify(ckEncodeValue_(payload, 'payload'));
}

/** Encoded string → object. Throws on malformed JSON or a bad tag. */
function decodeCheckpointPayload_(encoded) {
  if (typeof encoded !== 'string' || !encoded.length) throw new Error('checkpoint codec: empty payload');
  return ckDecodeValue_(JSON.parse(encoded));
}

// ───────────────────────────────────────────────────────────────────────────
// Chunking. The cap applies to the encoded string (JSON escaping has already
// happened). A chunk never ends on a high surrogate, so a split cannot leave
// half a code point in a cell. Rows are [gen, i, n, data] with i = 1..n.
// ───────────────────────────────────────────────────────────────────────────

function chunkEncoded_(encoded, maxChars) {
  var cap = maxChars || CHECKPOINT_CHUNK_CHARS;
  if (typeof encoded !== 'string' || !encoded.length) throw new Error('checkpoint chunk: empty payload');
  var chunks = [], pos = 0;
  while (pos < encoded.length) {
    var end = Math.min(pos + cap, encoded.length);
    if (end < encoded.length) {
      var last = encoded.charCodeAt(end - 1);
      if (last >= 0xD800 && last <= 0xDBFF) end -= 1;   // do not split a surrogate pair
    }
    chunks.push(encoded.substring(pos, end));
    pos = end;
  }
  return chunks;
}

function chunkRows_(gen, chunks) {
  var rows = [];
  for (var i = 0; i < chunks.length; i++) rows.push([gen, i + 1, chunks.length, chunks[i]]);
  return rows;
}

/**
 * Rows read back from the tab (rows 2..) → the encoded string. Every row must
 * carry the expected gen, the indexes must be exactly 1..n in order, the count
 * must be n, and the digest must match. Anything else is a refusal with a
 * reason — never "no checkpoint".
 */
function joinChunks_(rows, expected) {
  if (!expected || typeof expected.n !== 'number' || !expected.sha) throw new Error('checkpoint join: manifest lacks n/sha');
  if (!Array.isArray(rows) || rows.length !== expected.n) throw new Error('checkpoint join: ' + (rows ? rows.length : 0) + ' chunk rows, manifest says ' + expected.n);
  var out = '';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[0]) !== String(expected.gen)) throw new Error('checkpoint join: row ' + (i + 2) + ' carries gen ' + r[0] + ', manifest ' + expected.gen);
    if (Number(r[1]) !== i + 1) throw new Error('checkpoint join: row ' + (i + 2) + ' is chunk ' + r[1] + ', expected ' + (i + 1));
    if (Number(r[2]) !== expected.n) throw new Error('checkpoint join: row ' + (i + 2) + ' says n=' + r[2] + ', manifest ' + expected.n);
    if (typeof r[3] !== 'string' || !r[3].length) throw new Error('checkpoint join: row ' + (i + 2) + ' has no data');
    out += r[3];
  }
  var sha = checkpointDigest_(out);
  if (sha !== expected.sha) throw new Error('checkpoint join: digest ' + sha + ' does not match manifest ' + expected.sha);
  return out;
}

/** SHA-1 prefix over the encoded string (computeShortHash_, Engine_Errors precedent). An empty digest fails the save. */
function checkpointDigest_(encoded) {
  var sha = computeShortHash_(encoded);
  if (!sha) throw new Error('checkpoint digest: computeShortHash_ returned nothing');
  return sha;
}

// ───────────────────────────────────────────────────────────────────────────
// Payload shape (part 4 of the design). Pure: reads ctx, writes nothing.
// ───────────────────────────────────────────────────────────────────────────

function buildCheckpointPayload_(ctx, fire, diags, gen) {
  if (!ctx || !ctx.summary || !ctx.config || !ctx.persist || !ctx.cache) throw new Error('checkpoint payload: ctx incomplete');
  if (!fire || !fire.admission || typeof fire.admission.cycle !== 'number') throw new Error('checkpoint payload: no admission');
  var S = ctx.summary, summary = {};
  for (var i = 0; i < CHECKPOINT_SUMMARY_FIELDS.length; i++) {
    var f = CHECKPOINT_SUMMARY_FIELDS[i];
    if (S[f] !== undefined) summary[f] = S[f];
  }
  return {
    schema: CHECKPOINT_SCHEMA,
    gen: gen,
    cycle: fire.admission.cycle,
    admission: { cycle: fire.admission.cycle, startedMs: fire.admission.startedMs },
    config: ctx.config,
    summary: summary,
    persist: { replaceOps: ctx.persist.replaceOps || [], updates: ctx.persist.updates || [], logs: ctx.persist.logs || [] },
    cache: ctx.cache.exportQueues(),
    draws: ctx.rng && typeof ctx.rng.draws === 'number' ? ctx.rng.draws : null,
    diags: diags || {}
  };
}

/** A payload read back must be this schema and this Cycle. */
function validateCheckpointPayload_(payload, manifest) {
  if (!payload || payload.schema !== CHECKPOINT_SCHEMA) throw new Error('checkpoint payload: schema ' + (payload && payload.schema) + ', this build is ' + CHECKPOINT_SCHEMA);
  if (!manifest || payload.gen !== manifest.gen || payload.cycle !== manifest.cycle) throw new Error('checkpoint payload: gen/cycle do not match the manifest');
  if (!payload.persist || !payload.cache || !payload.summary || !payload.config) throw new Error('checkpoint payload: missing section');
  return true;
}
