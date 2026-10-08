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
var CHECKPOINT_CHUNK_PREFIX = '~';         // every data cell starts with this so Sheets can never read a chunk as a number, a formula or a quote-prefixed string
var CHECKPOINT_RESUME_HANDLER = 'resumeWorldCycle';
var CHECKPOINT_RESUME_DELAY_MS = 60 * 1000;
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
  for (var i = 0; i < chunks.length; i++) rows.push([gen, i + 1, chunks.length, CHECKPOINT_CHUNK_PREFIX + chunks[i]]);
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
    if (typeof r[3] !== 'string' || r[3].length < 2 || r[3].charAt(0) !== CHECKPOINT_CHUNK_PREFIX) throw new Error('checkpoint join: row ' + (i + 2) + ' has no data (or lost its prefix)');
    out += r[3].substring(1);
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

// ───────────────────────────────────────────────────────────────────────────
// The tab. Row 1 col A = manifest JSON; rows 2.. = [gen, i, n, data].
// ───────────────────────────────────────────────────────────────────────────

function getCheckpointSheet_(ss) { return ss ? ss.getSheetByName(CHECKPOINT_TAB) : null; }

/** null = no tab or empty manifest cell (no checkpoint). Unreadable → {state:'corrupt'}. */
function readCheckpointManifest_(ss) {
  var sh = getCheckpointSheet_(ss);
  if (!sh) return null;
  var raw = sh.getRange(1, 1).getValue();
  if (raw === '' || raw === null || raw === undefined) return null;
  var m = null;
  try { m = JSON.parse(String(raw)); } catch (e) { m = null; }
  if (!m || typeof m !== 'object' || !CHECKPOINT_STATES[m.state]) return { state: 'corrupt', raw: String(raw).substring(0, 200) };
  return m;
}

function writeCheckpointManifest_(ss, manifest) {
  var sh = getCheckpointSheet_(ss);
  if (!sh) throw new Error('checkpoint: tab ' + CHECKPOINT_TAB + ' is missing — it is created by hand before the push, never at runtime');
  sh.getRange(1, 1).setValue(JSON.stringify(manifest));
  SpreadsheetApp.flush();
}

function clearCheckpointTab_(ss) {
  var sh = getCheckpointSheet_(ss);
  if (!sh) return;
  sh.clearContents();
  SpreadsheetApp.flush();
}

function clearCheckpointChunks_(ss) {
  var sh = getCheckpointSheet_(ss);
  if (!sh) return;
  var last = sh.getLastRow();
  if (last >= 2) { sh.getRange(2, 1, last - 1, 4).clearContent(); SpreadsheetApp.flush(); }
}

function readCheckpointChunkRows_(ss, n) {
  var sh = getCheckpointSheet_(ss);
  if (!sh) throw new Error('checkpoint: tab ' + CHECKPOINT_TAB + ' is missing');
  if (!n || n < 1) throw new Error('checkpoint: manifest names no chunks');
  return sh.getRange(2, 1, n, 4).getValues();
}

/** The pre-gate diagnostic globals, read by name so a missing one is simply absent. */
function collectCheckpointDiags_() {
  var d = {};
  if (typeof ENGINE59_DIAG !== 'undefined' && ENGINE59_DIAG) d.diag59 = ENGINE59_DIAG;
  if (typeof ENGINE61_DIAG !== 'undefined' && ENGINE61_DIAG) d.diag61 = ENGINE61_DIAG;
  if (typeof ENGINE187_DIAG !== 'undefined' && ENGINE187_DIAG) d.diag187 = ENGINE187_DIAG;
  if (typeof CARRY_FORWARD_DIAG !== 'undefined' && CARRY_FORWARD_DIAG && CARRY_FORWARD_DIAG.length) d.carryForward = CARRY_FORWARD_DIAG;
  return d;
}

function restoreCheckpointDiags_(d) {
  d = d || {};
  if (typeof ENGINE59_DIAG !== 'undefined' && d.diag59) ENGINE59_DIAG = d.diag59;
  if (typeof ENGINE61_DIAG !== 'undefined' && d.diag61) ENGINE61_DIAG = d.diag61;
  if (typeof ENGINE187_DIAG !== 'undefined' && d.diag187) ENGINE187_DIAG = d.diag187;
  if (typeof CARRY_FORWARD_DIAG !== 'undefined' && d.carryForward) CARRY_FORWARD_DIAG = d.carryForward;
}

// ───────────────────────────────────────────────────────────────────────────
// The gate (design part 2). Pure decision, then the save with its ordering
// (part 5). `checkpointForce` 1 = take the checkpoint branch, 2 = the late
// branch; `checkpointFaultAt` 1..5 throws or skips at a named point — bench
// keys, seeded 0 on every target.
// ───────────────────────────────────────────────────────────────────────────

function checkpointGateDecision_(cfg, elapsedMs) {
  cfg = cfg || {};
  var wall = Number(cfg.wallBudgetMs) || 0, tail = Number(cfg.tailReserveMs) || 0, save = Number(cfg.checkpointSaveMs) || 0;
  var force = Number(cfg.checkpointForce) || 0;
  if (force === 1) return { branch: 'checkpoint', armed: true, forced: true };
  if (force === 2) return { branch: 'late', armed: true, forced: true };
  if (!(wall > 0 && tail > 0 && save > 0)) return { branch: 'tail', armed: false };
  if (elapsedMs + tail <= wall) return { branch: 'tail', armed: true };
  if (elapsedMs + save <= wall) return { branch: 'checkpoint', armed: true };
  return { branch: 'late', armed: true };
}

/**
 * Runs at the commit boundary. Returns null to run the tail as today, or the
 * lifecycle outcome ({lifecycle:'checkpointed'|'save-failed', …}) — in which
 * case the runner returns at once and both finalizers honour fire.lifecycle.
 * Unwrapped by design: every failure inside is the save-failed branch, never
 * a thrown phase.
 */
function checkpointGate_(ctx, fire) {
  if (!fire || !fire.admission) return null;
  if (ctx.mode && (ctx.mode.dryRun || ctx.mode.replay)) return null;
  var cfg = ctx.config || {};
  var nowMs = Date.now();
  var elapsedMs = nowMs - Number(fire.admission.startedMs);
  var entryMs = fire.entryMs ? Math.max(0, Number(fire.admission.startedMs) - Number(fire.entryMs)) : 0;
  var d = checkpointGateDecision_(cfg, elapsedMs + entryMs);
  if (d.branch === 'tail') return null;

  var cycle = fire.admission.cycle;
  var gen = 'c' + cycle + '-' + nowMs;
  var late = d.branch === 'late';
  var fault = Number(cfg.checkpointFaultAt) || 0;
  fire.lifecycle = 'checkpointing';
  var manifest = null;
  try {
    manifest = saveCycleCheckpoint_(ctx, fire, { gen: gen, late: late, forced: !!d.forced, elapsedMs: elapsedMs, entryMs: entryMs, fault: fault });
    if (fault === 4) throw new Error('bench fault 4: at-record');
    PropertiesService.getScriptProperties().setProperty(FIRE_ADMISSION_PROP,
      JSON.stringify({ cycle: cycle, startedMs: fire.admission.startedMs, state: 'checkpointed' }));
    fire.lifecycle = 'checkpointed';
    var triggerId = null, triggerErr = null;
    if (fault === 5) triggerErr = 'bench fault 5: at-trigger (creation skipped)';
    else { try { triggerId = armResumeTrigger_(); } catch (te) { triggerErr = String(te && te.message); } }
    manifest.triggerId = triggerId;
    manifest.triggerError = triggerErr;
    writeCheckpointManifest_(ctx.ss, manifest);
    var note = 'engine.95: Cycle ' + cycle + ' checkpointed at the commit boundary — gen ' + gen + ', ' + Math.round(elapsedMs / 1000) + ' s elapsed, save ' +
      Math.round(manifest.saveMs / 1000) + ' s, ' + manifest.n + ' chunk(s), ' + manifest.chars + ' chars' + (late ? ', LATE' : '') + (d.forced ? ', forced' : '') +
      (triggerId ? '; resume trigger ' + triggerId + ' armed' : '; NO RESUME TRIGGER (' + triggerErr + ') — fire again now to resume');
    logEngineError_(ctx, 'Phase10-Checkpoint', new Error(note));
    return { lifecycle: 'checkpointed', gen: gen, cycle: cycle, late: late, forced: !!d.forced, saveMs: manifest.saveMs, chars: manifest.chars, n: manifest.n,
      triggerId: triggerId, noTrigger: !triggerId, triggerError: triggerErr };
  } catch (e) {
    fire.lifecycle = 'save-failed';
    fire.commitProblem = 'the checkpoint save failed (' + (e && e.message) + ')';
    try {
      writeCheckpointManifest_(ctx.ss, { schema: CHECKPOINT_SCHEMA, gen: gen, cycle: cycle, state: 'save-failed', error: String(e && e.message),
        startedMs: fire.admission.startedMs, failedMs: Date.now(), late: late });
    } catch (we) { /* the tab itself may be the failure; the fire record still says failed */ }
    logEngineError_(ctx, 'FATAL-Checkpoint', e);
    return { lifecycle: 'save-failed', gen: gen, cycle: cycle, error: String(e && e.message) };
  }
}

/** Part 5's ordering: staging manifest → chunks → flush → read-back proof → ready manifest. Throws on anything short of proof. */
function saveCycleCheckpoint_(ctx, fire, o) {
  var t0 = Date.now();
  var ss = ctx.ss;
  var sh = getCheckpointSheet_(ss);
  if (!sh) throw new Error('tab ' + CHECKPOINT_TAB + ' is missing — created by hand before the push, never at runtime');
  clearCheckpointTab_(ss);
  writeCheckpointManifest_(ss, { schema: CHECKPOINT_SCHEMA, gen: o.gen, cycle: fire.admission.cycle, state: 'staging', startedMs: fire.admission.startedMs, build: CHECKPOINT_SCHEMA });
  if (o.fault === 1) throw new Error('bench fault 1: before-chunks');
  var payload = buildCheckpointPayload_(ctx, fire, collectCheckpointDiags_(), o.gen);
  var encoded = encodeCheckpointPayload_(payload);
  var sha = checkpointDigest_(encoded);
  var rows = chunkRows_(o.gen, chunkEncoded_(encoded, CHECKPOINT_CHUNK_CHARS));
  if (o.fault === 2) {
    var half = Math.max(1, Math.floor(rows.length / 2));
    sh.getRange(2, 1, half, 4).setValues(rows.slice(0, half));
    SpreadsheetApp.flush();
    throw new Error('bench fault 2: mid-chunks');
  }
  sh.getRange(2, 1, rows.length, 4).setValues(rows);
  SpreadsheetApp.flush();
  joinChunks_(sh.getRange(2, 1, rows.length, 4).getValues(), { gen: o.gen, n: rows.length, sha: sha });   // the read-back is the proof
  var ready = {
    schema: CHECKPOINT_SCHEMA, gen: o.gen, cycle: fire.admission.cycle, state: 'ready', n: rows.length, chars: encoded.length, sha: sha, build: CHECKPOINT_SCHEMA,
    startedMs: fire.admission.startedMs, elapsedMs: o.elapsedMs, entryMs: o.entryMs, saveMs: Date.now() - t0, late: !!o.late, forced: !!o.forced,
    phasesSaved: payload.summary.phaseTimings ? payload.summary.phaseTimings.length : 0, stage: null, triggerId: null, triggerError: null, result: null
  };
  writeCheckpointManifest_(ss, ready);
  if (o.fault === 3) throw new Error('bench fault 3: after-ready');
  return ready;
}

function armResumeTrigger_() {
  var t = ScriptApp.newTrigger(CHECKPOINT_RESUME_HANDLER).timeBased().after(CHECKPOINT_RESUME_DELAY_MS).create();
  return t.getUniqueId();
}

function deleteResumeTriggers_(onlyId) {
  var n = 0;
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    var t = all[i];
    if (t.getHandlerFunction() !== CHECKPOINT_RESUME_HANDLER) continue;
    if (onlyId && t.getUniqueId() !== onlyId) continue;
    ScriptApp.deleteTrigger(t);
    n++;
  }
  return n;
}

// ───────────────────────────────────────────────────────────────────────────
// Admission routing (design part 8). Called by admitCycleFire_ before every
// other test, under the fire lock. Returns a resume admission, or null to
// proceed with a normal admission, or refuses.
// ───────────────────────────────────────────────────────────────────────────

function routeCheckpointAtAdmission_(ss, manifest, cfg, webOpts, allOpts, nowMs) {
  var resumeOnly = !!(allOpts && allOpts.resumeOnly);
  var target = cfg.cycleCount + 1;
  var N = Number(manifest.cycle);
  var door = ' Door: POST action=clearcheckpoint&gen=' + manifest.gen + ' (bench, fireGuardMinutes 0; force=1 to discard a held payload), or by hand: clear ' + CHECKPOINT_TAB + ' and the resume trigger, then the fire record.';
  var state = manifest.state;

  if (state === 'ready') {
    if (cfg.cycleCount !== N - 1 && cfg.cycleCount !== N) {
      fireGuardRefuse_(ss, target, 'engine.95: a checkpoint for Cycle ' + N + ' is held but World_Config.cycleCount is ' + cfg.cycleCount + ' — refusing.' + door);
    }
    if (webOpts && webOpts.expect !== N - 1 && webOpts.expect !== N) {
      fireGuardRefuse_(ss, target, 'engine.95: a checkpoint for Cycle ' + N + ' is held; the caller expected ' + webOpts.expect + ' — refusing a stale or unrelated fire.');
    }
    return { cycle: N, startedMs: Number(manifest.startedMs), state: 'resuming', resume: true, manifest: manifest, guardMinutes: cfg.guardMinutes };
  }

  if (state === 'staging' || state === 'save-failed' || state === 'corrupt') {
    if (resumeOnly) fireGuardRefuse_(ss, target, 'engine.95: nothing resumable — the checkpoint tab holds a ' + state + ' manifest.' + door);
    try {
      logEngineError_({ ss: ss, summary: { cycleId: target } }, 'Phase1-FireGuard',
        new Error('engine.95: clearing a ' + state + ' checkpoint' + (manifest.gen ? ' (gen ' + manifest.gen + ', Cycle ' + manifest.cycle + ')' : '') + ' — nothing recoverable was held; proceeding'));
    } catch (e) { /* best effort */ }
    clearCheckpointTab_(ss);
    return null;
  }

  if (state === 'committed') {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty(FIRE_ADMISSION_PROP), rec = null;
    try { rec = raw ? JSON.parse(raw) : null; } catch (e) { rec = null; }
    if (rec && Number(rec.cycle) === N && rec.state === 'checkpointed') {
      // close-only recovery: the resume committed and died before the record closed. Nothing is replayed.
      var r = manifest.result || {};
      props.setProperty(FIRE_ADMISSION_PROP, JSON.stringify({ cycle: N, startedMs: Number(manifest.startedMs), state: r.problem ? 'failed' : 'done', finishedMs: nowMs }));
      try { logEngineError_({ ss: ss, summary: { cycleId: N } }, 'Phase11-FireGuardClose', new Error('engine.95: Cycle ' + N + ' had committed its resume (gen ' + manifest.gen + ') but the record never closed — closed now as ' + (r.problem ? 'failed: ' + r.problem : 'done'))); } catch (e) { /* best effort */ }
    }
    clearCheckpointTab_(ss);
    if (resumeOnly) fireGuardRefuse_(ss, target, 'engine.95: Cycle ' + N + ' is already committed — nothing to resume (record reconciled, tab cleared).');
    return null;
  }

  // resuming | commit-failed | resume-failed: a payload or a result is being preserved
  fireGuardRefuse_(ss, target, 'engine.95: the checkpoint tab holds Cycle ' + N + ' in state ' + state +
    (manifest.stage ? ' (stage ' + manifest.stage + ')' : '') + (manifest.error ? ' — ' + manifest.error : '') +
    ' — refusing every fire until a hand has read it.' + door);
}

// ───────────────────────────────────────────────────────────────────────────
// The resume (design part 7). Runs under the fire lock with a resume
// admission. One attempt: a throw propagates, the manifest stays `resuming`
// with its stage, closeCycleFire_ writes `failed`, and admission refuses.
// ───────────────────────────────────────────────────────────────────────────

function resumeCore_(ss, fire) {
  var manifest = fire.admission.manifest;
  var cycle = fire.admission.cycle;
  var t0 = Date.now();
  var faultAt = 0;
  function stage(name) { manifest.stage = name; writeCheckpointManifest_(ss, manifest); }
  function bail(state, err) {
    manifest.state = state; manifest.error = String(err && err.message || err); manifest.failedMs = Date.now();
    try { writeCheckpointManifest_(ss, manifest); } catch (we) { /* best effort */ }
  }

  manifest.state = 'resuming';
  manifest.resumeStartedMs = t0;
  stage('loading');
  var payload;
  try {
    payload = decodeCheckpointPayload_(joinChunks_(readCheckpointChunkRows_(ss, manifest.n), manifest));
    validateCheckpointPayload_(payload, manifest);
  } catch (e) {
    bail('resume-failed', e);
    throw new Error('engine.95: Cycle ' + cycle + ' resume could not load its checkpoint — ' + e.message);
  }

  var cache = createSheetCache_(ss);
  var ctx = {
    ss: ss, cache: cache, now: new Date(), config: payload.config,
    summary: { cycleId: cycle, intakeProcessed: 0, citizensUpdated: 0, eventsGenerated: 0, auditIssues: [] },
    persist: payload.persist, rng: null, resumed: { gen: manifest.gen, draws: payload.draws }
  };
  for (var k in payload.summary) if (Object.prototype.hasOwnProperty.call(payload.summary, k)) ctx.summary[k] = payload.summary[k];
  if (!ctx.summary.phaseTimings) ctx.summary.phaseTimings = [];
  initializeModeFlags_(ctx);
  cache.importQueues(payload.cache);
  restoreCheckpointDiags_(payload.diags);
  fire.ctx = ctx;
  faultAt = Number(ctx.config.checkpointResumeFaultAt) || 0;

  stage('executor-started');
  if (faultAt === 1) throw new Error('bench resume fault 1: before executor');
  safePhaseCall_(ctx, 'Phase10-ExecuteIntents', function() { executePersistIntents_(ctx); });
  var problem = checkExecutorStats_(ctx, fire);
  if (problem) {
    manifest.executorStats = ctx.persist && ctx.persist.executionStats ? { executed: ctx.persist.executionStats.executed, errors: ctx.persist.executionStats.errors } : null;
    bail('commit-failed', problem);
    logEngineError_(ctx, 'FATAL-CheckpointResume', new Error('engine.95: Cycle ' + cycle + ' resume stopped after the executor — ' + problem + '; Phase 11 not run, payload retained'));
    fire.lifecycle = 'resumed';
    return;
  }
  stage('executor-done');
  if (faultAt === 2) throw new Error('bench resume fault 2: after executor');

  initSimulationLedger_(ctx);   // the executor has landed the ledger range; Phase 11 reads it from the sheet
  stage('ledger-reloaded');

  safePhaseCall_(ctx, 'Phase11-MediaIntake', function() { processMediaIntake_(ctx); });
  safePhaseCall_(ctx, 'Phase11-BusinessArchive', function() { archiveClosedBusinesses_(ctx); });
  safePhaseCall_(ctx, 'Phase11-CitizenArchive', function() { archiveCitizenExits_(ctx); });
  safePhaseCall_(ctx, 'Phase11-MaintainLifeHistoryLog', function() { maintainLifeHistoryLog_(ctx); });
  stage('phase11-done');
  if (faultAt === 3) throw new Error('bench resume fault 3: after phase 11');

  if (faultAt === 4) throw new Error('bench resume fault 4: before flush');
  flushCacheAndVerify_(ctx, fire);
  stage('flushed');

  emitPhaseTimings_(ctx);
  manifest.result = {
    cycle: cycle, gen: manifest.gen, timings: ctx.summary.phaseTimings, phaseCount: ctx.summary.phaseTimings.length,
    engineErrorCount: ctx.summary.engineErrorCount || 0, auditIssueCount: ctx.summary.auditIssues.length,
    draws: payload.draws, diags: collectCheckpointDiags_(), persist: (typeof ENGINE95_PERSIST_DIAG !== 'undefined') ? ENGINE95_PERSIST_DIAG : null,
    citizenArchive: (typeof CITIZEN_ARCHIVE_DIAG !== 'undefined' && CITIZEN_ARCHIVE_DIAG && CITIZEN_ARCHIVE_DIAG.enabled) ? CITIZEN_ARCHIVE_DIAG : null,
    problem: fire.commitProblem || null, entryMs: manifest.entryMs, elapsedMs: manifest.elapsedMs, saveMs: manifest.saveMs, resumeMs: Date.now() - t0
  };
  manifest.state = 'committed';
  manifest.stage = 'committed';
  manifest.committedMs = Date.now();
  writeCheckpointManifest_(ss, manifest);
  clearCheckpointChunks_(ss);
  try { deleteResumeTriggers_(manifest.triggerId || null); } catch (te) { logEngineError_(ctx, 'Phase11-CheckpointResumed', new Error('engine.95: the resume trigger could not be deleted — ' + te.message)); }
  logEngineError_(ctx, 'Phase11-CheckpointResumed', new Error('engine.95: Cycle ' + cycle + ' resumed from gen ' + manifest.gen + ' — ' +
    ctx.summary.phaseTimings.length + ' logical phases, resume ' + Math.round((Date.now() - t0) / 1000) + ' s' + (fire.commitProblem ? '; PROBLEM: ' + fire.commitProblem : '')));
  fire.lifecycle = 'resumed';
}

/** The one-shot trigger's handler. The lock, the manifest routing and the close live in runWorldCycle. */
function resumeWorldCycle() {
  return runWorldCycle({ resumeOnly: true });
}
