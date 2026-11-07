/**
 * applyEditionCoverageEffects.test.js — engine.332: every |rating| >= 3 row
 * records one coverage-reaction ripple (the path Story_Seed_Deck and the desk
 * signal read). The real file and the real utilities/rippleLedger.js in a vm;
 * the write-intent queues are stubs. claspignored.
 *
 * Run: node phase02-world-state/applyEditionCoverageEffects.test.js
 */

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var ROOT = path.resolve(__dirname, '..');

var failures = 0;
function assert(name, cond) {
  if (cond) { console.log('  PASS ' + name); }
  else { console.error('  FAIL ' + name); failures++; }
}

var HEADER = ['Cycle', 'Domain', 'Rating', 'ArticleCount', 'Reporter', 'Tone', 'Processed'];

function run(rows, cycle) {
  var appended = [];
  var cells = [];
  var sb = vm.createContext({
    Logger: { log: function () {} },
    queueAppendIntent_: function (ctx, tab, row) { appended.push({ tab: tab, row: row }); },
    queueEnsureTabIntent_: function () {},
    queueCellIntent_: function (ctx, tab, r, c, v) { cells.push({ tab: tab, r: r, c: c, v: v }); }
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'utilities/rippleLedger.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase02-world-state/applyEditionCoverageEffects.js'), 'utf8'), sb);
  var data = [HEADER].concat(rows);
  var ctx = {
    summary: { cycleId: cycle },
    ss: {
      getSheetByName: function (name) {
        if (name !== 'Edition_Coverage_Ratings') return null;
        return { getDataRange: function () { return { getValues: function () { return data; } }; } };
      }
    }
  };
  sb.ctx = ctx;
  vm.runInContext('applyEditionCoverageEffects_(ctx)', sb);
  var reactions = (ctx.summary.rippleEvents || []).filter(function (r) { return r.causeType === 'coverage-reaction'; });
  return { S: ctx.summary, reactions: reactions, appended: appended, cells: cells };
}

// §1 strong rows record one ripple each; ±2 and processed rows record none
(function () {
  var out = run([
    ['114', 'HEALTH', '-4', '1', 'Dr. Lila Mezran', 'negative', ''],
    ['114', 'ENVIRONMENT', '5', '2', 'Noah Tan', 'positive', ''],
    ['115', 'SPORTS', '3', '1', '', 'mixed', ''],
    ['114', 'CIVIC', '2', '1', 'Carmen Delaine', 'positive', ''],
    ['114', 'CULTURE', '5', '1', 'Maria Keen', 'positive', 'TRUE'],
    ['112', 'ECONOMIC', '5', '1', 'Jordan Velez', 'positive', '']
  ], 115);
  var r = out.reactions;
  function one(beat) { return r.filter(function (x) { return x.causeId.indexOf(beat + ':') === 0; })[0]; }
  assert('1a three strong unprocessed rows in the window → three ripples', r.length === 3);
  assert('1b ±2, processed and out-of-window rows record none', !one('CIVIC') && !one('CULTURE') && !one('ECONOMIC'));
  assert('1c the triggers list is unchanged in kind', out.S.editionCoverageTriggers.length === 3);
  var h = one('HEALTH');
  assert('1d causeId = beat + rating Cycle', h.causeId === 'HEALTH:C114' && one('SPORTS').causeId === 'SPORTS:C115');
  assert('1e magnitude = the rating, citywide, one Cycle', h.magnitude === -4 && h.targetScope === 'citywide' && h.duration === 1);
  assert('1f effectType names the beat', h.effectType === 'HEALTH coverage reaction');
  assert('1g Why: last week, tone, rating, article, reporter, mood down',
    h.causeDetail === 'Citywide reaction: last week\'s Tribune HEALTH coverage ran negative (rating -4, 1 article, Dr. Lila Mezran) and pulled the city\'s mood down.');
  assert('1h plural articles, mood up', one('ENVIRONMENT').causeDetail.indexOf('(rating +5, 2 articles, Noah Tan) and pulled the city\'s mood up.') >= 0);
  assert('1i this Cycle\'s rating says this week; a blank reporter drops out',
    one('SPORTS').causeDetail === 'Citywide reaction: this week\'s Tribune SPORTS coverage ran mixed (rating +3, 1 article) and pulled the city\'s mood up.');
  var ledgerRows = out.appended.filter(function (a) { return a.tab === 'Ripple_Ledger' && a.row[1] === 'coverage-reaction'; });
  assert('1j one Ripple_Ledger append per reaction', ledgerRows.length === 3);
  assert('1k processed marks queued for the four rows read', out.cells.length === 4);
})();

// §2 no strong rating → no reaction ripple; no sheet → no throw
(function () {
  var out = run([['114', 'CIVIC', '-2', '1', 'Carmen Delaine', 'negative', '']], 115);
  assert('2a a ±2 Cycle records no reaction', out.reactions.length === 0);
  var sb = vm.createContext({ Logger: { log: function () {} } });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase02-world-state/applyEditionCoverageEffects.js'), 'utf8'), sb);
  sb.ctx = { summary: { cycleId: 115 }, ss: { getSheetByName: function () { return null; } } };
  vm.runInContext('applyEditionCoverageEffects_(ctx)', sb);
  assert('2b missing tab is clean', sb.ctx.summary.editionCoverageTriggers.length === 0 && !sb.ctx.summary.rippleEvents);
})();

console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
