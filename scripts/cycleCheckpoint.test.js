/**
 * engine.95 — checkpoint codec, chunking, payload shape, and the sheet cache's
 * queue export/import. Apps Script source, so vm-loaded with a stubbed
 * Utilities (SHA-1 via node crypto) and a fake spreadsheet.
 *
 * Covers codex Review 2 F6's validation list: nested Dates, booleans, numeric
 * zero, empty strings, literal ISO strings, literal tag-shaped objects,
 * Unicode, quotes/backslashes, padded mixed-width batches, exported cache
 * queues; corrupt/missing/reordered chunks refused with a reason; the chunk
 * cap on the ENCODED length.
 *
 * Run: node scripts/cycleCheckpoint.test.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');

const sandbox = {
  Logger: { log: () => {} },
  console,
  Utilities: {
    DigestAlgorithm: { SHA_1: 'SHA_1' },
    computeDigest: (_algo, input) => Array.from(crypto.createHash('sha1').update(String(input), 'utf8').digest()).map(b => (b > 127 ? b - 256 : b))
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const root = path.join(__dirname, '..');
// computeShortHash_ lives in the runner; load just that function.
const engineSrc = fs.readFileSync(path.join(root, 'phase01-config/godWorldEngine2.js'), 'utf8');
const m = engineSrc.match(/function computeShortHash_\(input\) \{[\s\S]*?\n\}/);
if (!m) throw new Error('computeShortHash_ not found');
vm.runInContext(m[0], sandbox, { filename: 'computeShortHash_' });
vm.runInContext(fs.readFileSync(path.join(root, 'utilities/sheetCache.js'), 'utf8'), sandbox, { filename: 'sheetCache.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'phase10-persistence/cycleCheckpoint.js'), 'utf8'), sandbox, { filename: 'cycleCheckpoint.js' });

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}
function throws(name, fn, re) {
  try { fn(); check(name + ' (did not throw)', false); }
  catch (e) { check(name + (re && !re.test(e.message) ? ' (wrong message: ' + e.message + ')' : ''), !re || re.test(e.message)); }
}
const V = sandbox; // vm globals
const vmDate = (iso) => vm.runInContext('new Date(' + JSON.stringify(iso) + ')', sandbox);

// ── codec round trips ────────────────────────────────────────────────────────
console.log('codec');
{
  const d = vmDate('2026-10-08T12:00:00.000Z');
  const obj = {
    s: 'plain', iso: '2026-10-08T12:00:00.000Z', empty: '', zero: 0, neg: -1.5, t: true, f: false, nul: null,
    date: d, nested: { deeper: { when: d, list: [d, 1, 'x', null, false, 0, ''] } },
    uni: 'Fruitvale — café ☕ 𝄞 \u0000 \t "quotes" \\ back\\slash',
    tagLike: { $d: 'not a date' }, tagLike2: { $obj: { a: 1 } }, dollar: { $x: 1, y: 2 },
    rows: [[1, 'a', d], ['b', 2], []], holes: ['a', undefined, 'c'],
  };
  const enc = V.encodeCheckpointPayload_(obj);
  check('encodes to a string', typeof enc === 'string' && enc.length > 50);
  const back = V.decodeCheckpointPayload_(enc);
  check('string/number/boolean/null preserved', back.s === 'plain' && back.zero === 0 && back.neg === -1.5 && back.t === true && back.f === false && back.nul === null && back.empty === '');
  check('literal ISO string stays a string', typeof back.iso === 'string' && back.iso === obj.iso);
  check('Date round-trips as a Date', Object.prototype.toString.call(back.date) === '[object Date]' && back.date.getTime() === d.getTime());
  check('nested Dates inside objects and arrays', back.nested.deeper.when.getTime() === d.getTime() && back.nested.deeper.list[0].getTime() === d.getTime() && back.nested.deeper.list[4] === false && back.nested.deeper.list[5] === 0 && back.nested.deeper.list[6] === '');
  check('Unicode, quotes, backslashes, NUL', back.uni === obj.uni);
  check('tag-shaped literal {$d} is data, not a Date', typeof back.tagLike === 'object' && back.tagLike.$d === 'not a date');
  check('tag-shaped literal {$obj} is data', back.tagLike2.$obj && back.tagLike2.$obj.a === 1);
  check('object with a $ key round-trips', back.dollar.$x === 1 && back.dollar.y === 2);
  check('mixed-width rows preserved exactly', JSON.stringify(back.rows.map(r => r.length)) === '[3,2,0]' && back.rows[0][2].getTime() === d.getTime());
  check('undefined array element restored as undefined, length kept', back.holes.length === 3 && back.holes[1] === undefined && back.holes[2] === 'c');
  const withUndef = V.decodeCheckpointPayload_(V.encodeCheckpointPayload_({ a: 1, b: undefined }));
  check('undefined object member dropped', withUndef.a === 1 && !('b' in withUndef));
  const sym = vm.runInContext('({ f: function(){} })', sandbox);
  throws('function rejected', () => V.encodeCheckpointPayload_(sym), /unsupported function/);
  throws('NaN rejected', () => V.encodeCheckpointPayload_({ n: NaN }), /non-finite/);
  throws('Infinity rejected', () => V.encodeCheckpointPayload_({ n: [Infinity] }), /non-finite/);
  throws('invalid Date rejected', () => V.encodeCheckpointPayload_({ d: vmDate('nope') }), /invalid Date/);
  const cls = vm.runInContext('(function(){ function K(){ this.a=1; } return new K(); })()', sandbox);
  throws('class instance rejected', () => V.encodeCheckpointPayload_({ k: cls }), /host or class/);
  throws('empty payload refused on decode', () => V.decodeCheckpointPayload_(''), /empty/);
  throws('malformed JSON refused', () => V.decodeCheckpointPayload_('{not json'), /./);
}

// ── chunking ─────────────────────────────────────────────────────────────────
console.log('chunking');
{
  const big = { pad: 'x'.repeat(95000), q: '"'.repeat(5000), emoji: '𝄞'.repeat(3) };
  const enc = V.encodeCheckpointPayload_(big);
  const chunks = V.chunkEncoded_(enc, 40000);
  check('every chunk within the ENCODED cap', chunks.every(c => c.length <= 40000));
  check('chunks rejoin to the encoded string', chunks.join('') === enc);
  check('escaped quotes counted in the cap (encoded > raw)', enc.length > 95000 + 5000 + 20);
  // surrogate safety: force a cap that lands inside the 𝄞 pair
  const e2 = V.encodeCheckpointPayload_({ s: 'ab𝄞cd' });
  const idx = e2.indexOf('\uD834');
  const c2 = V.chunkEncoded_(e2, idx + 1);
  check('a chunk never ends on a high surrogate', c2.every(c => { const l = c.charCodeAt(c.length - 1); return !(l >= 0xD800 && l <= 0xDBFF); }) && c2.join('') === e2);
  const gen = 'g1';
  const rows = V.chunkRows_(gen, chunks);
  check('rows are [gen, i, n, data] with i = 1..n', rows.length === chunks.length && rows.every((r, i) => r[0] === gen && r[1] === i + 1 && r[2] === chunks.length && typeof r[3] === 'string'));
  const sha = V.checkpointDigest_(enc);
  check('digest is a 12-char hex', /^[0-9a-f]{12}$/.test(sha));
  const man = { gen, n: rows.length, sha };
  check('join returns the encoded string', V.joinChunks_(rows, man) === enc);
  throws('missing chunk refused', () => V.joinChunks_(rows.slice(0, -1), man), /chunk rows, manifest says/);
  const reordered = rows.slice(); const t = reordered[0]; reordered[0] = reordered[1]; reordered[1] = t;
  throws('reordered chunks refused', () => V.joinChunks_(reordered, man), /is chunk 2, expected 1/);
  const wrongGen = rows.map(r => [r[0], r[1], r[2], r[3]]); wrongGen[1][0] = 'g2';
  throws('foreign gen refused', () => V.joinChunks_(wrongGen, man), /carries gen g2/);
  const corrupt = rows.map(r => r.slice()); corrupt[0][3] = corrupt[0][3].slice(0, -1) + 'y';
  throws('corrupt data refused by digest', () => V.joinChunks_(corrupt, man), /digest .* does not match/);
  throws('manifest without sha refused', () => V.joinChunks_(rows, { gen, n: rows.length }), /lacks n\/sha/);
}

// ── sheet cache export / import ──────────────────────────────────────────────
console.log('cache queues');
function mkSS(tabs) {
  const sheets = {};
  for (const name in tabs) {
    const rows = tabs[name];
    sheets[name] = {
      getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
      getLastRow: () => rows.length,
      getRange: () => ({ setValues: () => {}, setValue: () => {} })
    };
  }
  return { getSheetByName: (n) => sheets[n] || null };
}
{
  const ss = mkSS({ World_Config: [['Key', 'Value'], ['cycleCount', 110], ['lastRun', 'x']], Pop: [['a', 'b']] });
  const cache = V.createSheetCache_(ss);
  const d = vmDate('2026-10-08T01:02:03.000Z');
  cache.queueWrite('World_Config', 2, 2, 111);
  cache.queueWrite('World_Config', 3, 2, d);
  cache.queueRowWrite('Pop', 2, ['r', 'ow']);
  cache.queueAppend('Pop', ['ap', 1]);
  const q = cache.exportQueues();
  check('export carries cell, row and append queues in order', q.writeQueue.World_Config.length === 2 && q.writeQueue.World_Config[0].value === 111 && q.writeQueue.World_Config[1].value === d && q.writeQueue.Pop[0].rowValues[1] === 'ow' && q.appendQueue.Pop[0][0] === 'ap');
  q.writeQueue.World_Config[0].value = 999;
  check('export is a copy, not the live queue', cache.exportQueues().writeQueue.World_Config[0].value === 111);
  throws('import onto a non-empty cache refused', () => cache.importQueues(q), /already holds/);
  // codec round trip of the exported queues, then import onto a fresh cache
  const q2 = V.decodeCheckpointPayload_(V.encodeCheckpointPayload_(cache.exportQueues()));
  const cache2 = V.createSheetCache_(mkSS({ World_Config: [['Key', 'Value'], ['cycleCount', 110], ['lastRun', 'x']], Pop: [['a', 'b']] }));
  cache2.importQueues(q2);
  const st = cache2.getStats();
  check('import restores every queued write and append', st.pendingWrites === 3 && st.pendingAppends === 1);
  check('read-your-write holds after import', cache2.getValue('World_Config', 2, 2) === 111 && cache2.getValue('World_Config', 3, 2).getTime() === d.getTime());
  check('exported queues identical after import', JSON.stringify(V.encodeCheckpointPayload_(cache2.exportQueues())) === JSON.stringify(V.encodeCheckpointPayload_(cache.exportQueues())));
  throws('import without queues refused', () => V.createSheetCache_(mkSS({})).importQueues(null), /no queues/);
}

// ── payload shape ────────────────────────────────────────────────────────────
console.log('payload');
{
  const ss = mkSS({ World_Config: [['Key', 'Value'], ['cycleCount', 110]] });
  const cache = V.createSheetCache_(ss);
  cache.queueWrite('World_Config', 2, 2, 111);
  const ctx = {
    summary: { cycleId: 111, cycle: 111, cycleRef: 'Y3C111', absoluteCycle: 111, season: 'fall', holiday: undefined, businessClosures: [{ id: 'B1' }], auditIssues: ['a'], engineErrorCount: 0, phaseTimings: [{ phase: 'P1', ms: 1, ok: true }], notCarried: 'x' },
    config: { cycleCount: 111 }, persist: { replaceOps: [], updates: [{ tab: 'T', kind: 'cell', values: [[1]] }], logs: [] },
    cache, rng: { draws: 42 }
  };
  const fire = { admission: { cycle: 111, startedMs: 1000 } };
  const p = V.buildCheckpointPayload_(ctx, fire, { diag59: { a: 1 } }, 'g7');
  check('payload carries schema, gen, cycle, admission', p.schema === V.CHECKPOINT_SCHEMA && p.gen === 'g7' && p.cycle === 111 && p.admission.startedMs === 1000);
  check('only the tail fields of the summary, structures whole', p.summary.businessClosures[0].id === 'B1' && p.summary.auditIssues.length === 1 && p.summary.notCarried === undefined && !('holiday' in p.summary));
  check('persist queues, cache queues, draws, diags carried', p.persist.updates.length === 1 && p.cache.writeQueue.World_Config.length === 1 && p.draws === 42 && p.diags.diag59.a === 1);
  const rt = V.decodeCheckpointPayload_(V.encodeCheckpointPayload_(p));
  check('payload survives the codec', rt.persist.updates[0].values[0][0] === 1 && rt.summary.phaseTimings[0].ms === 1);
  check('validate accepts its own manifest', V.validateCheckpointPayload_(rt, { gen: 'g7', cycle: 111 }) === true);
  throws('validate refuses another schema', () => V.validateCheckpointPayload_(Object.assign({}, rt, { schema: 99 }), { gen: 'g7', cycle: 111 }), /schema 99/);
  throws('validate refuses a gen mismatch', () => V.validateCheckpointPayload_(rt, { gen: 'g8', cycle: 111 }), /gen\/cycle/);
  throws('payload without admission refused', () => V.buildCheckpointPayload_(ctx, {}, {}, 'g'), /no admission/);
  throws('payload with incomplete ctx refused', () => V.buildCheckpointPayload_({ summary: {} }, fire, {}, 'g'), /ctx incomplete/);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
