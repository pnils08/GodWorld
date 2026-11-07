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
  assert('1d causeId = beat + rating Cycle + sheet row', h.causeId === 'HEALTH:C114:R2' && one('SPORTS').causeId === 'SPORTS:C115:R4');
  assert('1e magnitude = the rating, citywide, one Cycle', h.magnitude === -4 && h.targetScope === 'citywide' && h.duration === 1);
  assert('1f effectType names the beat', h.effectType === 'HEALTH coverage reaction');
  assert('1g Why: last week, rating, tone, article, reporter — no mood claim',
    h.causeDetail === 'Citywide reaction: last week\'s Tribune HEALTH coverage rated -4 (negative, 1 article, Dr. Lila Mezran).');
  assert('1h plural articles', one('ENVIRONMENT').causeDetail === 'Citywide reaction: last week\'s Tribune ENVIRONMENT coverage rated +5 (positive, 2 articles, Noah Tan).');
  assert('1i this Cycle\'s rating says this week; a blank reporter drops out',
    one('SPORTS').causeDetail === 'Citywide reaction: this week\'s Tribune SPORTS coverage rated +3 (mixed, 1 article).');
  var ledgerRows = out.appended.filter(function (a) { return a.tab === 'Ripple_Ledger' && a.row[1] === 'coverage-reaction'; });
  assert('1j one Ripple_Ledger append per reaction', ledgerRows.length === 3);
  assert('1k processed marks queued for the four rows read', out.cells.length === 4);
})();

// §1b codex review F2/F3: two rows for one beat and Cycle stay two ripples; the rater's tone is reported, not reconciled
(function () {
  var out = run([
    ['114', 'HEALTH', '3', '1', 'Dr. Lila Mezran', 'positive', ''],
    ['114', 'HEALTH', '-3', '1', 'Dr. Lila Mezran', 'negative', ''],
    ['114', 'CIVIC', '3', '1', 'Jax Caldera', 'negative', ''],
    ['114', 'SPORTS', '5', '', '', '', '']
  ], 115);
  var r = out.reactions;
  var health = r.filter(function (x) { return x.causeId.indexOf('HEALTH:C114:') === 0; });
  assert('1b.a same beat, same Cycle → two ripples with distinct causeIds', health.length === 2 && health[0].causeId !== health[1].causeId && health[0].magnitude === 3 && health[1].magnitude === -3);
  var civ = r.filter(function (x) { return x.causeId.indexOf('CIVIC:') === 0; })[0];
  assert('1b.b a +3 the rater labelled negative reads as written, no direction claimed',
    civ.causeDetail === 'Citywide reaction: last week\'s Tribune CIVIC coverage rated +3 (negative, 1 article, Jax Caldera).' && !/mood|up\b|down\b/.test(civ.causeDetail));
  var sp = r.filter(function (x) { return x.causeId.indexOf('SPORTS:') === 0; })[0];
  assert('1b.c blank tone, count and reporter leave the bare rating', sp.causeDetail === 'Citywide reaction: last week\'s Tribune SPORTS coverage rated +5.');
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
