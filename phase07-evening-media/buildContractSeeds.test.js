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

// Fake spreadsheet. Original single-arg form serves LifeHistory_Log only;
// optional second arg maps extra sheet names → rows (S313 backdrop tests).
function fakeSS(rows, extraSheets) {
  var tabs = { LifeHistory_Log: rows };
  if (extraSheets) for (var k in extraSheets) tabs[k] = extraSheets[k];
  return {
    getSheetByName: function (name) {
      var data = tabs[name];
      if (!data) return null;
      return {
        getLastRow: function () { return data.length; },
        getDataRange: function () { return { getValues: function () { return data; } }; }
      };
    }
  };
}

var BIZ_HEADER = ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count'];
var FAITH_HEADER = ['Organization', 'FaithTradition', 'Neighborhood', 'Founded', 'Congregation', 'Leader', 'Character', 'ActiveStatus'];

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

// §2 No exact targets → Grade 1 neighborhood draw fills Citizens (Mike-direct
// 2026-07-06, supersedes exact-only: the citizen doesn't need the event to
// testify — the voice speaks from their own LifeHistory)
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
  assert('2a hood draw fills citizens when engine named none', s.citizens.indexOf('POP-00100 Amina Pilgrim') >= 0 && s.citizens.indexOf('POP-00101 Tunde Silk') >= 0);
  assert('2b drawn citizens carry their own event lines', s.citizenEvents.indexOf('stoop sale') >= 0 && s.citizenEvents.indexOf('kid to school') >= 0);
  assert('2c texture below thresholds', s.seedClass === 'texture');
  assert('2d domain civic', s.domain === 'CIVIC');
})();

// §2.1 Exact targets lead, hood draw fills behind (never displaces), capped at
// CONTRACT_SEED_FILL_N; citywide seed draws across hoods; ctx.rng → deterministic
(function () {
  var rows = [
    LH_HEADER,
    ['t', 'POP-00201', 'Ada Lin', 'Crime|Local', 'Reported a break-in', 'Temescal', 95],
    ['t', 'POP-00202', 'Bo Reyes', 'Community', 'Swept the stoop', 'Temescal', 95],
    ['t', 'POP-00203', 'Cy Okafor', 'Family', 'Sunday dinner', 'Temescal', 95],
    ['t', 'POP-00204', 'Dee Marsh', 'Career', 'Opened the shop late', 'Temescal', 95],
    ['t', 'POP-00205', 'Ely Tran', 'Community', 'Watered the median', 'Temescal', 95],
    ['t', 'POP-00206', 'Fay Osei', 'Community', 'Lake walk', 'Lake Merritt', 95]
  ];
  function lcg(seed) {
    var st = seed;
    return function () { st = (st * 1664525 + 1013904223) % 4294967296; return st / 4294967296; };
  }
  function build(rngSeed) {
    var ctx = {
      ss: fakeSS(rows),
      rng: lcg(rngSeed),
      summary: {
        cycleId: 95,
        rippleEvents: [
          { cycle: 95, causeType: 'crime', causeId: 'TEM', causeDetail: 'Property crime +4', effectType: 'crime-cluster', targetScope: 'citizen', targetIds: ['POP-00201'], neighborhood: 'Temescal', magnitude: 4, duration: 1 },
          { cycle: 95, causeType: 'sports', causeId: 'STREAK', causeDetail: 'A\'s W14', effectType: 'sentiment', targetScope: 'citywide', targetIds: [], neighborhood: '', magnitude: 0.11, duration: 1 }
        ]
      }
    };
    b.buildContractSeeds_(ctx);
    return ctx.summary.contractSeeds;
  }
  var seeds = build(7);
  var tem = seeds[0], city = seeds[1];
  assert('2.1a exact target leads', tem.citizens.indexOf('POP-00201 Ada Lin') === 0);
  assert('2.1b filled to CONTRACT_SEED_FILL_N', tem.citizens.split(';').length === 4);
  assert('2.1c fill stays in hood', tem.citizens.indexOf('Fay Osei') < 0);
  assert('2.1d citywide seed draws across hoods', city.citizens.split(';').length === 4 && city.citizens !== '');
  assert('2.1e same rng seed → identical picks', JSON.stringify(build(7)) === JSON.stringify(seeds));
  var again = build(9);
  assert('2.1f exact target survives any seed', again[0].citizens.indexOf('POP-00201 Ada Lin') === 0);
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

// §8 S313 backdrop fill: neighborhood businesses + faith orgs attach behind exacts
(function () {
  var BIZ_ROWS = [
    BIZ_HEADER,
    ['BIZ-00001', 'La Placita Market', 'Retail', 'Fruitvale', 8],
    ['BIZ-00002', 'Fruitvale Mercado', 'Retail', 'Fruitvale', 12],
    ['BIZ-00003', 'Dimond Bakehouse', 'Food', 'Fruitvale', 5],
    ['BIZ-00004', 'Temescal Alley Barbers', 'Service', 'Temescal', 3]
  ];
  var FAITH_ROWS = [
    FAITH_HEADER,
    ['St. Esperanza Parish', 'Catholic', 'Fruitvale', 1921, 400, 'Fr. Ruiz', 'steady', 'Active'],
    ['Gurdwara Singh Sabha Fruitvale', 'Sikh', 'Fruitvale', 1978, 250, 'Granthi Singh', 'steady', 'Inactive'],
    ['Telegraph Presbyterian Fellowship', 'Presbyterian', 'Downtown', 1902, 180, 'Rev. Cho', 'steady', 'Active']
  ];
  function lcg(seed) {
    var st = seed;
    return function () { st = (st * 1664525 + 1013904223) % 4294967296; return st / 4294967296; };
  }
  function build(rngSeed, ripples) {
    var ctx = {
      ss: fakeSS([LH_HEADER], { Business_Ledger: BIZ_ROWS, Faith_Organizations: FAITH_ROWS }),
      rng: lcg(rngSeed),
      summary: { cycleId: 96, rippleEvents: ripples }
    };
    b.buildContractSeeds_(ctx);
    return ctx.summary.contractSeeds;
  }
  var hoodRipple = [{ cycle: 96, causeType: 'gentrification', causeId: 'FV', causeDetail: 'Rent pressure +0.2', effectType: 'rent', targetScope: 'neighborhood', targetIds: [], neighborhood: 'Fruitvale', magnitude: 0.2, duration: 1 }];
  var s8 = build(7, hoodRipple)[0];
  assert('8a fills to CONTRACT_SEED_FILL_BIZ', s8.businesses.split(';').length === 2);
  assert('8b drawn businesses carry id + name', /BIZ-0000\d [A-Z]/.test(s8.businesses));
  assert('8c fill stays in hood', s8.businesses.indexOf('Temescal Alley Barbers') < 0);
  assert('8d faith org attached with suffix', s8.otherEntities.indexOf('(faith)') > 0);
  assert('8e active-only faith', s8.otherEntities.indexOf('Gurdwara') < 0 && s8.otherEntities.indexOf('St. Esperanza Parish') >= 0);
  assert('8f faith stays in hood', s8.otherEntities.indexOf('Telegraph') < 0);
  assert('8g same rng seed → identical picks', JSON.stringify(build(7, hoodRipple)) === JSON.stringify([s8]));

  // Exact business target leads, name-resolved, draw fills behind to the cap
  var exactRipple = [{ cycle: 96, causeType: 'economic-event', causeId: 'MERC', causeDetail: 'Mercado expansion', effectType: 'business-boost', targetScope: 'business', targetIds: ['BIZ-00002'], neighborhood: 'Fruitvale', magnitude: 1, duration: 1 }];
  var s8x = build(3, exactRipple)[0];
  assert('8h exact leads name-resolved', s8x.businesses.indexOf('BIZ-00002 Fruitvale Mercado') === 0);
  assert('8i exact not duplicated by draw', s8x.businesses.split('BIZ-00002').length === 2);

  // Citywide seed: no backdrop draw
  var cityRipple = [{ cycle: 96, causeType: 'sports', causeId: 'W14', causeDetail: 'A\'s streak', effectType: 'sentiment', targetScope: 'citywide', targetIds: [], neighborhood: '', magnitude: 0.11, duration: 1 }];
  var s8c = build(5, cityRipple)[0];
  assert('8j citywide gets no backdrop', s8c.businesses === '' && s8c.otherEntities === '');

  // Cross-seed rotation: two Fruitvale seeds of different cause families name
  // different businesses while the pool lasts (usedBiz spread, same as citizens)
  var twoRipples = [
    hoodRipple[0],
    { cycle: 96, causeType: 'crime', causeId: 'FV2', causeDetail: 'Petty theft +2', effectType: 'crime-cluster', targetScope: 'neighborhood', targetIds: [], neighborhood: 'Fruitvale', magnitude: 2, duration: 1 }
  ];
  var pair = build(11, twoRipples);
  var first = pair[0].businesses.split('; ');
  var second = pair[1].businesses.split('; ');
  var overlap = first.filter(function (x) { return second.indexOf(x) >= 0; });
  assert('8k cross-seed spread (3-biz pool, 2+2 draw → ≤1 reuse)', overlap.length <= 1);
})();

// §9 S313 journalist pre-match: rosterLookup globals present → hint fields ride
// the seed; absent (default Node state) → empty fields, no throw (fail-soft)
(function () {
  var ripple = [{ cycle: 97, causeType: 'crime', causeId: 'DT', causeDetail: 'Theft +3', effectType: 'crime-cluster', targetScope: 'neighborhood', targetIds: [], neighborhood: 'Downtown', magnitude: 3, duration: 1 }];
  function build() {
    var ctx = { ss: fakeSS([LH_HEADER]), summary: { cycleId: 97, rippleEvents: ripple } };
    b.buildContractSeeds_(ctx);
    return ctx.summary.contractSeeds[0];
  }
  // Absent globals (plain Node) → empty hint fields
  var bare = build();
  assert('9a no globals → empty journalist', bare.suggestedJournalist === '');
  assert('9b no globals → empty confidence', bare.matchConfidence === '');

  // Stubbed rosterLookup globals → fields populated from the match
  global.getThemeKeywordsForDomain_ = function (domain, hookType) { return ['crime', 'safety']; };
  global.suggestStoryAngle_ = function (themes, signal) {
    return { journalist: 'Dana Okafor', angle: 'street-level impact', voiceGuidance: 'x', confidence: signal === 'crime' ? 'high' : 'low' };
  };
  var matched = build();
  assert('9c journalist rides seed', matched.suggestedJournalist === 'Dana Okafor');
  assert('9d angle rides seed', matched.suggestedAngle === 'street-level impact');
  assert('9e SAFETY domain maps to crime signal', matched.matchConfidence === 'high');

  // Throwing matcher → fail-soft empty, seed still ships
  global.suggestStoryAngle_ = function () { throw new Error('roster unavailable'); };
  var soft = build();
  assert('9f matcher throw → fail-soft empty', soft.suggestedJournalist === '' && soft.why.indexOf('Theft') >= 0);

  delete global.getThemeKeywordsForDomain_;
  delete global.suggestStoryAngle_;
})();

// §10 T2 (research.24): Community_Programs join the OtherEntities backdrop pool
(function () {
  var PRG_HEADER = ['Program_ID', 'Name', 'Founder_POPID', 'Neighborhood', 'Type', 'Founded_Cycle', 'Status'];
  var PRG_ROWS = [
    PRG_HEADER,
    ['PRG-002', 'Vinnie Keane West Oakland Baseball Academy', 'POP-00001', 'West Oakland', 'youth-sports', 101, 'active'],
    ['PRG-009', 'Retired Program', 'POP-00003', 'West Oakland', 'youth-sports', 90, 'retired']
  ];
  function lcg(seed) {
    var st = seed;
    return function () { st = (st * 1664525 + 1013904223) % 4294967296; return st / 4294967296; };
  }
  function build(rngSeed, extra) {
    var ctx = {
      ss: fakeSS([LH_HEADER], Object.assign({ Community_Programs: PRG_ROWS }, extra || {})),
      rng: lcg(rngSeed),
      summary: {
        cycleId: 98,
        rippleEvents: [{ cycle: 98, causeType: 'crime', causeId: 'WO', causeDetail: 'Petty theft +2', effectType: 'crime-cluster', targetScope: 'neighborhood', targetIds: [], neighborhood: 'West Oakland', magnitude: 2, duration: 1 }]
      }
    };
    b.buildContractSeeds_(ctx);
    return ctx.summary.contractSeeds;
  }
  var s10 = build(7)[0];
  assert('10a program fills OtherEntities when no faith competes', s10.otherEntities === 'Vinnie Keane West Oakland Baseball Academy (program)');
  assert('10b inactive program excluded', s10.otherEntities.indexOf('Retired Program') < 0);
  assert('10c same rng seed → identical seeds', JSON.stringify(build(7)) === JSON.stringify([s10]));
  // faith + program share one pool + one fill slot
  var FAITH_ROWS = [FAITH_HEADER, ['West Oakland AME Chapel', 'AME', 'West Oakland', 1932, 210, 'Rev. Long', 'steady', 'Active']];
  var withFaith = build(7, { Faith_Organizations: FAITH_ROWS })[0];
  assert('10d one OtherEntities slot total (faith+program pool)', withFaith.otherEntities.split(';').length === 1 && /\((faith|program)\)/.test(withFaith.otherEntities));
})();

// §7 Zero ripples → zero seeds, no throw
(function () {
  var ctx = { ss: fakeSS([LH_HEADER]), summary: { cycleId: 95 } };
  b.buildContractSeeds_(ctx);
  assert('7a empty is clean', ctx.summary.contractSeeds.length === 0);
})();

console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
