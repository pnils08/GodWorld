/**
 * downLinesEclPool.test.js — engine.350 Task 7: the down lines for Event_Content_Ledger.
 * Proves, against the engine's own code: every row passes the tab loader (none skipped), the
 * generator's sign rule writes it as <Kind>-<Dial>-Down-S, that tag folds to exactly -1 on the
 * row's dial, and the row's source still routes to a kind whose bare key moves nothing.
 *
 * Run: node scripts/downLinesEclPool.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const P = require('./downLinesEclPool');
const M = require('../utilities/citizenDialMap.js');

let n = 0;
function ok(cond, msg) { assert.ok(cond, msg); n++; }

// 1. the module's own rules
const v = P.validateRows(P.ROWS);
ok(v.valid, 'validateRows: ' + v.errors.join('; '));
ok(P.DOWN_POOL_ROWS === 148 && P.ROWS.length === 148 + P.PLACED.length && P.PLACED.length === 9, 'row count ' + P.ROWS.length);
Object.keys(P.ROUTE).forEach(function (d) { ok((P.counts()['down.' + d] || 0) >= 20, 'at least 20 lines for ' + d); });
ok(!P.validateRows([Object.assign({}, P.ROWS[0], { Text: 'Went home.' })]).valid, 'a capitalised sentence is refused');
ok(!P.validateRows([Object.assign({}, P.ROWS[0], { Tags: 'source:communityLife,dial:sociability:up' })]).valid, 'an up tag is refused');
ok(!P.validateRows([Object.assign({}, P.ROWS[0], { Conditions: 'band=grownup' })]).valid, 'an unknown Conditions cell is refused');
// the placed rows (2026-11-18): a row in the pool of the up row it answers
const placed = P.ROWS.filter(function (r) { return r.answers != null; });
ok(placed.length === 9 && placed.every(function (r) { return r.Weight === '1' && !/^down\./.test(r.PoolKey); }), 'nine placed rows at Weight 1, none in a down.* pool');
ok(!P.validateRows([Object.assign({}, placed[0], { Text: 'walked past the sign-up sheet again and again and again' })]).valid, 'a placed row not in PLACED is refused');
ok(!P.validateRows([Object.assign({}, placed[0], { Conditions: '' })]).valid, 'a placed row with another Conditions cell is refused');
ok(!P.validateRows([Object.assign({}, placed[0], { PoolKey: 'down.sociability' })]).valid, 'a placed row in a down.* pool is refused');
ok(!P.validateRows([Object.assign({}, placed[0], { dial: 'warmth', Tags: placed[0].Tags.replace('sociability', 'warmth') })]).valid, 'a placed row on another dial is refused');
ok(!P.validateRows([Object.assign({}, placed[0], { Weight: '3' })]).valid, 'a placed row at another Weight is refused');
// what the sheet gets is what the row says: the tags alone give its source, its one sign, and (through the generator's own routing) its kind
placed.forEach(function (r) {
  const tags = r.Tags.split(',');
  ok(tags[0] === r.source && tags.filter(function (t) { return /^dial:/.test(t); }).join() === 'dial:' + r.dial + ':down', 'tags of ' + r.Text);
});
const O = require('./occupationDialTags');
placed.filter(function (r) { return r.source === 'source:media'; }).forEach(function (r) {
  ok(O.MEDIA_SIGNS.some(function (s) { return s[0] === r.PoolKey && s[1] === r.Text && s[2] === r.dial + ':down'; }), 'paper-reader row listed in MEDIA_SIGNS under the same sign: ' + r.Text);
});

// 2. the tab loader takes every row
global.Logger = { log() {} };
eval(fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'loadEventContentLedger.js'), 'utf8'));
const ctx = { summary: {}, ss: { getSheetByName(name) {
  return name === 'Event_Content_Ledger' ? { getDataRange: () => ({ getValues: () => [P.HDR].concat(P.toSheetValues()) }) } : null;
} } };
loadEventContentLedger_(ctx);
const CL = ctx.summary.contentLedger;
ok(CL && CL.skipped === 0, 'loader skipped ' + (CL && CL.skipped));
ok(CL.lineCount === P.ROWS.length, 'loader line count ' + CL.lineCount);
Object.keys(P.counts()).forEach(function (k) { ok((CL.lines[k] || []).length === P.counts()[k], 'pool ' + k + ' loaded whole'); });

// 3. the generator's own sign rule (cut out by text: if the block moves, this fails loudly)
const gce = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'generateCitizensEvents.js'), 'utf8');
const a = gce.indexOf('  var DIAL_BY_FACT_TAG = {'), b = gce.indexOf('  function normText_(s) {');
ok(a > 0 && b > a, 'sign block found in generateCitizensEvents.js');
const gradedTag_ = M.gradedTag_, nudgesForEvent_ = M.nudgesForEvent_; // read by the block below
const gradedTagFor_ = eval('(function(){' + gce.slice(a, b) + '; return gradedTagFor_; })()');
P.ROWS.forEach(function (r) {
  const dial = r.dial, route = { kind: r.kind, source: r.source };
  const tag = gradedTagFor_(route.kind, r.Tags.split(','));
  const want = route.kind + '-' + dial.charAt(0).toUpperCase() + dial.slice(1) + '-Down-S';
  ok(tag === want, r.Text + ' -> ' + tag);
  const fx = M.nudgesForEvent_(tag, 1, r.Text);
  ok(Object.keys(fx).length === 1 && fx[dial] === -1, r.Text + ' folds ' + JSON.stringify(fx));
});

// 4. each source still routes to its kind, and the kind's bare key moves nothing (so the line is graded, not bare)
Object.keys(P.ROUTE).forEach(function (d) {
  const route = P.ROUTE[d];
  if (route.source !== 'source:familyLife') ok(gce.indexOf('has("' + route.source + '")) return "' + route.kind + '"') > 0, route.source + ' -> ' + route.kind);
  ok(Object.keys(M.nudgesForEvent_(route.kind, 1, '')).length === 0, 'bare ' + route.kind + ' moves nothing');
});
// the placed rows' sources route to the kinds they claim, in the generator's own primaryFromTags
ok(gce.indexOf('if (has("source:civicNews")) return "Civic Perception";') > 0, 'source:civicNews -> Civic Perception');
ok(gce.indexOf('if (has("source:media")) return "Media";') > 0, 'source:media -> Media');
placed.forEach(function (r) {
  ok({ 'source:civicNews': 'Civic Perception', 'source:media': 'Media', 'source:familyLife': 'Daily' }[r.source] === r.kind, 'kind of ' + r.Text);
});
ok(/var GRADED_ONLY_KIND_ = \{[^}]*"Media": true/.test(gce) && Object.keys(M.nudgesForEvent_('Civic Perception', 1, '')).length === 0, 'Media is written graded only; bare Civic Perception moves nothing');
// familyLife has no branch of its own: it falls through to Daily (the S280 comment in primaryFromTags)
ok(!/has\("source:familyLife"\)\) return/.test(gce), 'source:familyLife still falls through to Daily');

console.log('downLinesEclPool.test.js: ' + n + ' assertions passed');
