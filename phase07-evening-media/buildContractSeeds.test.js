/**
 * buildContractSeeds.test.js — Node unit test for the seed contract v2 builder.
 * Same harness style as rippleLedger.test.js. claspignored.
 *
 * Run: node phase07-evening-media/buildContractSeeds.test.js
 */

global.Logger = { log: function () {} };

var b = require('./buildContractSeeds.js');
var failures = 0;
function assert(name, cond) {
  if (cond) { console.log('  PASS ' + name); }
  else { console.error('  FAIL ' + name); failures++; }
}

// Fake LifeHistory_Log sheet: header + this-cycle + other-cycle rows.
function fakeSS(rows) {
  return {
    getSheetByName: function (name) {
      if (name !== 'LifeHistory_Log') return null;
      return {
        getLastRow: function () { return rows.length; },
        getDataRange: function () { return { getValues: function () { return rows; } }; }
      };
    }
  };
}

var LH_HEADER = ['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle'];

// §1 Ripple with exact citizen targets → those citizens + their event lines on the seed
(function () {
  var rows = [
    LH_HEADER,
    ['t', 'POP-00612', 'Rosa Delgado', 'Crime|Local', 'Reported a break-in at her shop', 'West Oakland', 114],
    ['t', 'POP-00891', 'Patrick Hill', 'Career', 'Late shift rerouted after incident', 'West Oakland', 114],
    ['t', 'POP-00001', 'Vinnie Keane', 'Sports', 'Farewell tour stop', 'Downtown', 113]
  ];
  var ctx = {
    ss: fakeSS(rows),
    summary: {
      cycleId: 114,
      rippleEvents: [{
        cycle: 114, causeType: 'crime', causeId: 'WEST_OAKLAND', causeDetail: 'Property crime +7 carried from C113',
        effectType: 'crime-cluster', targetScope: 'citizen', targetIds: ['POP-00612', 'POP-00891'],
        neighborhood: 'West Oakland', magnitude: 7, duration: 2, remainingStrength: 4.2, sourceEngine: 'applyCityDynamics'
      }]
    }
  };
  b.buildContractSeeds_(ctx);
  var seeds = ctx.summary.contractSeeds;
  assert('1a one seed built', seeds.length === 1);
  assert('1b exact citizens joined', seeds[0].citizens.indexOf('POP-00612 Rosa Delgado') >= 0 && seeds[0].citizens.indexOf('POP-00891 Patrick Hill') >= 0);
  assert('1c event lines carried', seeds[0].citizenEvents.indexOf('break-in') >= 0 && seeds[0].citizenEvents.indexOf('rerouted') >= 0);
  assert('1d other-cycle citizen excluded', seeds[0].citizens.indexOf('Vinnie') < 0);
  assert('1e why carries cause', seeds[0].why.indexOf('carried from C113') >= 0);
  assert('1f domain mapped', seeds[0].domain === 'SAFETY');
  assert('1g magnitude signed', seeds[0].magnitude === 7);
  assert('1h major by magnitude', seeds[0].seedClass === 'major');
  assert('1i trend carries strength', seeds[0].trend.indexOf('4.20 strength left') >= 0);
})();

// §2 No exact targets → this-cycle citizens from the same neighborhood (engine-generated, never invented)
(function () {
  var rows = [
    LH_HEADER,
    ['t', 'POP-00100', 'Amina Pilgrim', 'Community', 'Organized a stoop sale', 'Fruitvale', 90],
    ['t', 'POP-00101', 'Tunde Silk', 'Family', 'Walked his kid to school', 'Fruitvale', 90]
  ];
  var ctx = {
    ss: fakeSS(rows),
    summary: {
      cycleId: 90,
      rippleEvents: [{
        cycle: 90, causeType: 'initiative', causeId: 'INIT-002', causeDetail: 'OARI expansion passed 6-3',
        effectType: 'safety-boost', targetScope: 'neighborhood', targetIds: ['Fruitvale'],
        neighborhood: 'Fruitvale', magnitude: 0.02, duration: 8, remainingStrength: 8, sourceEngine: 'civicInitiativeEngine'
      }]
    }
  };
  b.buildContractSeeds_(ctx);
  var s = ctx.summary.contractSeeds[0];
  assert('2a hood citizens attached', s.citizens.indexOf('POP-00100') >= 0 && s.citizens.indexOf('POP-00101') >= 0);
  assert('2b texture below thresholds', s.seedClass === 'texture');
  assert('2c domain civic', s.domain === 'CIVIC');
})();

// §3 Cluster promotion: 3 same-family causes in one hood merge into ONE major seed
(function () {
  var ctx = {
    ss: fakeSS([LH_HEADER]),
    summary: {
      cycleId: 91,
      rippleEvents: [
        { cycle: 91, causeType: 'economic-event', causeId: 'E1', causeDetail: 'Vendor surge', effectType: 'econ', targetScope: 'neighborhood', targetIds: [], neighborhood: 'Downtown', magnitude: 0.5, duration: 1 },
        { cycle: 91, causeType: 'economic-event', causeId: 'E2', causeDetail: 'Night market extension', effectType: 'econ', targetScope: 'neighborhood', targetIds: [], neighborhood: 'Downtown', magnitude: 0.4, duration: 1 },
        { cycle: 91, causeType: 'economic-event', causeId: 'E3', causeDetail: 'Hotel bookings up', effectType: 'econ', targetScope: 'neighborhood', targetIds: [], neighborhood: 'Downtown', magnitude: 0.3, duration: 1 }
      ]
    }
  };
  b.buildContractSeeds_(ctx);
  var seeds = ctx.summary.contractSeeds;
  assert('3a merged to one seed', seeds.length === 1);
  assert('3b cluster promoted major', seeds[0].seedClass === 'major');
  assert('3c what counts related effects', seeds[0].what.indexOf('3 related effects') >= 0);
  assert('3d why concatenates causes', seeds[0].why.indexOf('Vendor surge') >= 0 && seeds[0].why.indexOf('Hotel bookings up') >= 0);
})();

// §4 Sign-aware: negative cluster promotes on absolute magnitude (G-RC5 class)
(function () {
  var ctx = {
    ss: fakeSS([LH_HEADER]),
    summary: {
      cycleId: 92,
      rippleEvents: [{
        cycle: 92, causeType: 'crime', causeId: 'DOWNTOWN', causeDetail: 'Violent crime -5 after OARI teams',
        effectType: 'crime-drop', targetScope: 'neighborhood', targetIds: [], neighborhood: 'Downtown', magnitude: -5, duration: 1
      }]
    }
  };
  b.buildContractSeeds_(ctx);
  var s = ctx.summary.contractSeeds[0];
  assert('4a negative magnitude preserved', s.magnitude === -5);
  assert('4b promoted on |mag|', s.seedClass === 'major');
})();

// §5 Business scope lands in Businesses column
(function () {
  var ctx = {
    ss: fakeSS([LH_HEADER]),
    summary: {
      cycleId: 93,
      rippleEvents: [{
        cycle: 93, causeType: 'economic-event', causeId: 'MERC', causeDetail: 'Fruitvale Mercado expansion',
        effectType: 'business-boost', targetScope: 'business', targetIds: ['Fruitvale Mercado'],
        neighborhood: 'Fruitvale', magnitude: 1, duration: 3, remainingStrength: 2
      }]
    }
  };
  b.buildContractSeeds_(ctx);
  assert('5a business attached', ctx.summary.contractSeeds[0].businesses === 'Fruitvale Mercado');
})();

// §6 Fail-soft: no sheet access → seeds still built from causes alone
(function () {
  var ctx = {
    summary: {
      cycleId: 94,
      rippleEvents: [{ cycle: 94, causeType: 'sports', causeId: 'PLAYOFFS', causeDetail: 'Playoff mood +0.11', effectType: 'sentiment', targetScope: 'citywide', targetIds: [], neighborhood: '', magnitude: 0.11, duration: 1 }]
    }
  };
  b.buildContractSeeds_(ctx);
  var s = ctx.summary.contractSeeds[0];
  assert('6a seed built without sheet', s.why.indexOf('Playoff mood') >= 0);
  assert('6b citywide labeled', s.neighborhood === 'Citywide');
  assert('6c fractional major threshold', s.seedClass === 'major');
})();

// §7 Zero ripples → zero seeds, no throw
(function () {
  var ctx = { ss: fakeSS([LH_HEADER]), summary: { cycleId: 95 } };
  b.buildContractSeeds_(ctx);
  assert('7a empty is clean', ctx.summary.contractSeeds.length === 0);
})();

console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
