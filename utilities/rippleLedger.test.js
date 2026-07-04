/**
 * rippleLedger.test.js — Node unit test for recordRipple_ (engine.45 T1).
 * Mirrors saveChaosCars.test.js harness style: mock the intent queue globals,
 * assert row shape / ensure-tab-once / fail-soft behavior. claspignored (**\/*.test.js).
 *
 * Run: node utilities/rippleLedger.test.js
 */

var appends = [];
var ensures = [];
global.queueAppendIntent_ = function (ctx, tab, row, reason, domain) {
  appends.push({ tab: tab, row: row, reason: reason, domain: domain });
};
global.queueEnsureTabIntent_ = function (ctx, tab, headers, reason, domain) {
  ensures.push({ tab: tab, headers: headers, reason: reason, domain: domain });
};
global.Logger = { log: function () {} };

var rl = require('./rippleLedger.js');
var failures = 0;
function assert(name, cond) {
  if (cond) { console.log('  PASS ' + name); }
  else { console.error('  FAIL ' + name); failures++; }
}

// 1. Basic row shape + lazy ensure fires once
(function () {
  appends.length = 0; ensures.length = 0;
  var ctx = { summary: { cycleId: 103, cycleRef: 'Y3C103' } };
  var ok1 = rl.recordRipple_(ctx, {
    causeType: 'initiative', causeId: 'Transit Hub Phase II', causeDetail: 'transit ripple (positive)',
    effectType: 'sentiment/traffic', targetScope: 'neighborhood',
    targetIds: ['Fruitvale', 'San Antonio'], neighborhood: 'Fruitvale',
    magnitude: 0.6, duration: 12, remainingStrength: 0.6, sourceEngine: 'civicInitiativeEngine'
  });
  var ok2 = rl.recordRipple_(ctx, {
    causeType: 'sports', causeId: 'OAK-AS', effectType: 'sentiment',
    targetScope: 'citywide', magnitude: 0.04, sourceEngine: 'applySportsSeason'
  });
  assert('both queued', ok1 && ok2);
  assert('ensure-tab fired exactly once', ensures.length === 1 && ensures[0].tab === 'Ripple_Ledger');
  assert('two appends queued', appends.length === 2);
  var r = appends[0].row;
  assert('13 columns', r.length === rl.RIPPLE_LEDGER_HEADERS.length);
  assert('cycle from ctx.summary.cycleId', r[0] === 103);
  assert('targetIds pipe-joined', r[6] === 'Fruitvale|San Antonio');
  assert('cycle stamp from cycleRef', r[12] === 'Y3C103');
  assert('default duration 1 when omitted', appends[1].row[9] === 1);
  assert('empty remainingStrength when omitted', appends[1].row[10] === '');
})();

// 2. TargetIds cap
(function () {
  appends.length = 0;
  var ctx = { summary: { cycleId: 103 }, _rippleTabEnsured: true };
  var ids = [];
  for (var i = 0; i < 25; i++) ids.push('POP-' + i);
  rl.recordRipple_(ctx, { causeType: 'x', targetIds: ids });
  var cell = appends[0].row[6];
  assert('cap at 20 + overflow marker', cell.indexOf('POP-19') >= 0 && cell.indexOf('POP-20') === -1 && cell.indexOf('+5 more') >= 0);
})();

// 3. Fail-soft: bad input + missing queue functions never throw
(function () {
  var ctx = { summary: {} };
  var okNull = rl.recordRipple_(ctx, null);
  assert('null entry returns false, no throw', okNull === false);
  var savedQ = global.queueAppendIntent_;
  delete global.queueAppendIntent_;
  var threw = false, okNoQ;
  try { okNoQ = rl.recordRipple_({ summary: {} }, { causeType: 'x' }); } catch (e) { threw = true; }
  global.queueAppendIntent_ = savedQ;
  assert('missing queue fn returns false, no throw', !threw && okNoQ === false);
})();

// 4. Detail truncation + non-array targetIds
(function () {
  appends.length = 0;
  var ctx = { summary: { cycleId: 5 }, _rippleTabEnsured: true };
  var long = new Array(400).join('a');
  rl.recordRipple_(ctx, { causeType: 'x', causeDetail: long, targetIds: 'West Oakland' });
  assert('detail capped at 300', appends[0].row[3].length <= 300);
  assert('scalar targetIds coerced', appends[0].row[6] === 'West Oakland');
})();

console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
