'use strict';

const assert = require('assert');
const packagesApi = require('./newsroomWakePackages');

const packages = packagesApi.loadPackages();
const active = packagesApi.activePackages(packages);
assert.deepStrictEqual(active.map(row => row.key),
  ['carmen-delaine', 'luis-navarro', 'trevor-shimizu', 'p-slayer', 'anthony-raines', 'hal-richmond', 'tanya-cruz', 'simon-leary', 'maria-keen', 'elliot-graye', 'mason-ortega', 'sharon-okafor', 'business-desk', 'kai-marston', 'rachel-torres', 'lila-mezran', 'angela-reyes', 'noah-tan']);

const jax = packages['freelance-firebrand'];
assert.equal(jax.version, 'JAX-LEP2-1');
assert.equal(jax.active, false);
assert.equal(jax.requiredDaily, false);
assert.equal(jax.assignment.name, 'Jax Caldera');
assert.equal(jax.assignment.popid, 'POP-00799');
assert.equal(jax.packetContract, 'v2');
assert.equal(packagesApi.routeFor(jax, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(jax, 'report').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(jax, 'write').model, 'anthropic/claude-sonnet-5');
assert.equal(jax.reviewProfile.canonPolicy, 'exhaustive');
assert.equal(jax.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.deepStrictEqual(jax.reviewProfile.authorizedTexture, []);
assert.ok(jax.reviewProfile.textureConditions.some(v => v.includes('backend-composed')));
assert.ok(jax.reviewProfile.canonBlockers.some(v => v.includes('official inaction')));

const carmen = packages['carmen-delaine'];
assert.equal(carmen.version, 'CARMEN-LEP2-1');
assert.equal(carmen.requiredDaily, true);
assert.equal(carmen.assignment.desk, 'civic');
assert.equal(carmen.assignment.name, 'Carmen Delaine');
assert.equal(carmen.assignment.popid, 'POP-00011');
assert.equal(carmen.packetContract, 'v2');
assert.equal(packagesApi.routeFor(carmen, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(carmen, 'report').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(carmen, 'write').model, 'deepseek/deepseek-chat');
assert.equal(carmen.reviewProfile.canonPolicy, 'load-bearing');
assert.equal(carmen.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(carmen.reviewProfile.textureConditions.some(v => v.includes('all nine seats')));
assert.ok(carmen.reviewProfile.canonBlockers.some(v => v.includes('implementation clock')));

const luis = packages['luis-navarro'];
assert.equal(luis.version, 'LUIS-LEP2-1');
assert.equal(luis.requiredDaily, true);
assert.equal(luis.assignment.desk, 'civic');
assert.equal(luis.assignment.name, 'Luis Navarro');
assert.equal(luis.assignment.popid, 'POP-00636');
assert.equal(luis.assignment.beatDomain, 'CIVIC');
assert.equal(luis.packetContract, 'v2');
assert.equal(packagesApi.routeFor(luis, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(luis, 'report').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(luis, 'write').model, 'anthropic/claude-sonnet-5');
assert.equal(luis.reviewProfile.canonPolicy, 'load-bearing');
assert.ok(luis.reviewProfile.articleContract.targetWords.includes('180-280'));
assert.ok(luis.reviewProfile.textureConditions.some(v => v.includes('silence clock')));
assert.ok(luis.reviewProfile.canonBlockers.some(v => v.includes('records request')));

const trevor = packages['trevor-shimizu'];
assert.equal(trevor.version, 'TREVOR-LEP2-1');
assert.equal(trevor.requiredDaily, true);
assert.equal(trevor.assignment.desk, 'civic');
assert.equal(trevor.assignment.name, 'Trevor Shimizu');
assert.equal(trevor.assignment.popid, 'POP-00155');
assert.equal(trevor.assignment.beatDomain, 'INFRASTRUCTURE');
assert.equal(trevor.packetContract, 'v2');
assert.equal(packagesApi.routeFor(trevor, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(trevor, 'report').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(trevor, 'write').model, 'deepseek/deepseek-chat');
assert.equal(trevor.reviewProfile.canonPolicy, 'load-bearing');
assert.equal(trevor.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(trevor.reviewProfile.textureConditions.some(v => v.includes('cascade')));
assert.ok(trevor.reviewProfile.canonBlockers.some(v => v.includes('invented outage')));

const pSlayer = packages['p-slayer'];
assert.equal(pSlayer.version, 'PSLAYER-LEP2-1');
assert.equal(pSlayer.requiredDaily, true);
assert.equal(pSlayer.assignment.desk, 'sports');
assert.equal(pSlayer.assignment.name, 'P Slayer');
assert.equal(pSlayer.assignment.popid, 'POP-00008');
assert.equal(pSlayer.packetContract, 'v2');
assert.equal(packagesApi.routeFor(pSlayer, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(pSlayer, 'report').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(pSlayer, 'write').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(pSlayer.reviewProfile.canonPolicy, 'load-bearing');
assert.equal(pSlayer.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(pSlayer.reviewProfile.textureConditions.some(v => v.includes('prior-take')));
assert.ok(pSlayer.reviewProfile.canonBlockers.some(v => v.includes('collective fan sentiment')));

const anthony = packages['anthony-raines'];
assert.equal(anthony.version, 'ANTHONY-LEP2-1');
assert.equal(anthony.active, true);
assert.equal(anthony.requiredDaily, true);
assert.equal(anthony.assignment.desk, 'sports');
assert.equal(anthony.assignment.name, 'Anthony Raines');
assert.equal(anthony.assignment.popid, 'POP-00017');
assert.equal(anthony.assignment.beatDomain, 'SPORTS_ANALYTICS');
assert.equal(anthony.packetContract, 'v2');
assert.equal(packagesApi.routeFor(anthony, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(anthony, 'report').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(anthony, 'write').model, 'deepseek/deepseek-chat');
assert.equal(anthony.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(anthony.reviewProfile.textureConditions.some(v => v.includes('unresolved feed subject')));
assert.ok(anthony.reviewProfile.canonBlockers.some(v => v.includes('wrong player')));

const hal = packages['hal-richmond'];
assert.equal(hal.version, 'HAL-LEP2-1');
assert.equal(hal.active, true);
assert.equal(hal.requiredDaily, true);
assert.equal(hal.assignment.desk, 'sports');
assert.equal(hal.assignment.name, 'Hal Richmond');
assert.equal(hal.assignment.popid, 'POP-00007');
assert.equal(hal.assignment.beatDomain, 'SPORTS_HISTORY');
assert.equal(hal.packetContract, 'v2');
assert.equal(packagesApi.routeFor(hal, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(hal, 'report').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(hal, 'write').model, 'deepseek/deepseek-chat');
assert.equal(hal.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.match(hal.reviewProfile.purpose, /unsupplied one remains explicitly missing/);
assert.ok(hal.reviewProfile.textureConditions.some(v => v.includes('historical echo')));
assert.ok(hal.reviewProfile.canonBlockers.some(v => v.includes('historical person')));

const tanya = packages['tanya-cruz'];
assert.equal(tanya.version, 'TANYA-LEP2-1');
assert.equal(tanya.active, true);
assert.equal(tanya.assignment.popid, 'POP-00014');
assert.equal(tanya.assignment.beatDomain, 'SPORTS_SIDELINE');
assert.equal(packagesApi.routeFor(tanya, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(tanya.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(tanya.reviewProfile.canonBlockers.some(v => v.includes('clubhouse or sideline access')));

const simon = packages['simon-leary'];
assert.equal(simon.version, 'SIMON-LEP2-1');
assert.equal(simon.active, true);
assert.equal(simon.assignment.popid, 'POP-00016');
assert.equal(simon.assignment.beatDomain, 'SPORTS_LONG_VIEW');
assert.equal(packagesApi.routeFor(simon, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(simon.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(simon.reviewProfile.textureConditions.some(v => v.includes('continuity describes only')));
assert.ok(simon.reviewProfile.canonBlockers.some(v => v.includes('collective memory')));

const maria = packages['maria-keen'];
assert.equal(maria.version, 'MARIA-LEP2-1');
assert.equal(maria.active, true);
assert.equal(maria.assignment.popid, 'POP-00013');
assert.equal(maria.assignment.beatDomain, 'CULTURE_GROUND');
assert.equal(packagesApi.routeFor(maria, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(maria.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(maria.reviewProfile.textureConditions.some(v => v.includes('may not assert presence')));
assert.ok(maria.reviewProfile.canonBlockers.some(v => v.includes('invented attendance')));

const graye = packages['elliot-graye'];
assert.equal(graye.version, 'GRAYE-LEP2-1');
assert.equal(graye.active, true);
assert.equal(graye.assignment.popid, 'POP-00012');
assert.equal(graye.assignment.beatDomain, 'COMMUNITY');
assert.equal(packagesApi.routeFor(graye, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(graye.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(graye.reviewProfile.textureConditions.some(v => v.includes('sighting proves only')));
assert.ok(graye.reviewProfile.canonBlockers.some(v => v.includes('blocked real-world institution')));

const mason = packages['mason-ortega'];
assert.equal(mason.version, 'MASON-LEP2-1');
assert.equal(mason.active, true);
assert.equal(mason.assignment.popid, 'POP-00160');
assert.equal(mason.assignment.beatDomain, 'CULTURE');
assert.equal(packagesApi.routeFor(mason, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(mason.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(mason.reviewProfile.textureConditions.some(v => v.includes('proves only')));
assert.ok(mason.reviewProfile.canonBlockers.some(v => v.includes('invented attendance')));

const sharon = packages['sharon-okafor'];
assert.equal(sharon.version, 'SHARON-LEP2-1');
assert.equal(sharon.active, true);
assert.equal(sharon.requiredDaily, true);
assert.equal(sharon.assignment.popid, 'POP-00159');
assert.equal(sharon.assignment.beatDomain, 'CULTURE');
assert.equal(packagesApi.routeFor(sharon, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(sharon.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(sharon.reviewProfile.textureConditions.some(v => v.includes('proves only')));
assert.ok(sharon.reviewProfile.canonBlockers.some(v => v.includes('invented attendance')));

const jordan = packages['business-desk'];
assert.equal(jordan.version, 'JORDAN-LEP2-1');
assert.equal(jordan.requiredDaily, true);
assert.equal(jordan.assignment.desk, 'business');
assert.equal(jordan.assignment.name, 'Jordan Velez');
assert.equal(jordan.assignment.popid, 'POP-00153');
assert.equal(jordan.assignment.beatDomain, 'ECONOMIC');
assert.equal(jordan.packetContract, 'v2');
assert.equal(packagesApi.routeFor(jordan, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(jordan, 'report').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(jordan, 'write').model, 'deepseek/deepseek-chat');
assert.equal(jordan.reviewProfile.canonPolicy, 'load-bearing');
assert.equal(jordan.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(jordan.reviewProfile.textureConditions.some(v => v.includes('raw engine labels')));
assert.ok(jordan.reviewProfile.canonBlockers.some(v => v.includes('fabricated owner')));

const kai = packages['kai-marston'];
assert.equal(kai.version, 'KAI-LEP2-1');
assert.equal(kai.requiredDaily, true);
assert.equal(kai.assignment.desk, 'culture');
assert.equal(kai.assignment.name, 'Kai Marston');
assert.equal(kai.assignment.popid, 'POP-00158');
assert.equal(kai.assignment.beatDomain, 'CULTURE');
assert.equal(kai.packetContract, 'v2');
assert.equal(packagesApi.routeFor(kai, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(kai, 'report').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(kai, 'write').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(kai.reviewProfile.canonPolicy, 'load-bearing');
assert.equal(kai.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(kai.reviewProfile.textureConditions.some(v => v.includes('evening source')));
assert.ok(kai.reviewProfile.canonBlockers.some(v => v.includes('social-media reaction')));

const rachel = packages['rachel-torres'];
assert.equal(rachel.version, 'RACHEL-LEP2-1');
assert.equal(rachel.assignment.popid, 'POP-00057');
assert.equal(rachel.assignment.beatDomain, 'SAFETY');
assert.equal(packagesApi.routeFor(rachel, 'write').model, 'deepseek/deepseek-chat');
assert.equal(rachel.reviewProfile.canonPolicy, 'load-bearing');
assert.equal(rachel.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(rachel.reviewProfile.canonBlockers.some(v => v.includes('invented incident')));

const lila = packages['lila-mezran'];
assert.equal(lila.version, 'LILA-LEP2-1');
assert.equal(lila.requiredDaily, true);
assert.equal(lila.assignment.name, 'Dr. Lila Mezran');
assert.equal(lila.assignment.popid, 'POP-00154');
assert.equal(lila.assignment.beatDomain, 'HEALTH');
assert.equal(packagesApi.routeFor(lila, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(lila, 'report').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(lila, 'write').model, 'deepseek/deepseek-chat');
assert.equal(lila.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(lila.reviewProfile.textureConditions.some(v => v.includes('human consequence')));
assert.ok(lila.reviewProfile.canonBlockers.some(v => v.includes('invented diagnosis')));

const angela = packages['angela-reyes'];
assert.equal(angela.version, 'ANGELA-LEP2-1');
assert.equal(angela.requiredDaily, true);
assert.equal(angela.assignment.name, 'Angela Reyes');
assert.equal(angela.assignment.popid, 'POP-00156');
assert.equal(angela.assignment.beatDomain, 'EDUCATION');
assert.equal(packagesApi.routeFor(angela, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(angela, 'report').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(angela, 'write').model, 'deepseek/deepseek-chat');
assert.equal(angela.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(angela.reviewProfile.textureConditions.some(v => v.includes('stability evidence')));
assert.ok(angela.reviewProfile.canonBlockers.some(v => v.includes('invented student')));

const noah = packages['noah-tan'];
assert.equal(noah.version, 'NOAH-LEP2-1');
assert.equal(noah.assignment.popid, 'POP-00157');
assert.equal(noah.assignment.beatDomain, 'ENVIRONMENT');
assert.equal(packagesApi.routeFor(noah, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(noah.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(noah.reviewProfile.textureConditions.some(v => v.includes('do not announce season')));
assert.ok(noah.reviewProfile.canonBlockers.some(v => v.includes('invented forecast')));

const gate = packagesApi.gateAssignments([
  { desk: 'civic', name: 'Jax Caldera', persona: 'freelance-firebrand' },
  { desk: 'civic', name: 'Carmen Delaine', persona: 'carmen-delaine' },
  { desk: 'sports', name: 'P Slayer', persona: 'p-slayer' },
  { desk: 'sports', name: 'Anthony Raines', persona: 'anthony-raines' },
  { desk: 'business', name: 'Jordan Velez', persona: 'business-desk' },
  { desk: 'culture', name: 'TEST-ONLY Unpackaged Reporter', persona: 'test-only' },
], packages);
assert.equal(gate.eligible.length, 4);
assert.equal(gate.eligible[0].wakePackage, 'CARMEN-LEP2-1');
assert.equal(gate.eligible[1].wakePackage, 'PSLAYER-LEP2-1');
assert.equal(gate.eligible[2].wakePackage, 'ANTHONY-LEP2-1');
assert.equal(gate.eligible[3].wakePackage, 'JORDAN-LEP2-1');
assert.deepStrictEqual(gate.skipped.map(row => row.name),
  ['Jax Caldera', 'TEST-ONLY Unpackaged Reporter']);
assert.ok(gate.skipped.every(row => row.reason === 'no-active-wake-package'));

assert.throws(() => packagesApi.routeFor(jax, 'publish'), /unknown wake stage/);
assert.throws(() => packagesApi.validatePackage('bad', { active: true }), /invalid wake package/);

const { applyWakePackageGate, activeRotaCandidates, boundDailyAssignments,
  DAILY_QUOTAS } = require('./newsroom-fanout');
const runApi = require('./cron-desk-run');
runApi.activateWakeContext(null, 'luis-navarro');
const packetAsks = runApi.collectQuoteAsks([
  { label: 'TEST-ONLY generic civic fallback', popids: ['POP-90003', 'POP-90004'] }
], { name: 'Luis Navarro', popid: 'POP-00636' }, {
  ref: 'TEST-ONLY-ASSIGNMENT', label: 'TEST-ONLY assigned investigation',
  popids: ['POP-90001', 'POP-90002'],
  citizens: ['Test Civic One (POP-90001)', 'Test Civic Two (POP-90002)']
}, {
  cycle: 999, desk: 'civic',
  inputPacket: {
    v: 'LEP/2', wake: 'W1', actor: {}, task: {}, signal: {}, exposure: {
      candidates: [
        { pop: 'POP-90001', name: 'Test Civic One', profile: 'Test profile one', why: 'assignment' },
        { pop: 'POP-90002', name: 'Test Civic Two', profile: 'Test profile two', why: 'assignment' }
      ]
    }, known: [], limits: {}, output: {}
  },
  angleRead: { plan: { focus: 'TEST-ONLY focus', targets: [
    { pop: 'POP-90001', question: 'TEST-ONLY one?', basis: 'assignment' },
    { pop: 'POP-90002', question: 'TEST-ONLY two?', basis: 'assignment' }
  ], closeQuestion: 'TEST-ONLY close' } }
});
assert.deepStrictEqual(packetAsks.slice(0, 2).map(row => row.pop), ['POP-90001', 'POP-90002'],
  'assigned citizens must remain first in the completed quote pool');
assert.ok(!packetAsks.some(row => ['POP-90003', 'POP-90004'].includes(row.pop)),
  'Packet quote pool must not fill from the generic desk lane');
assert.equal(packetAsks[0].inputPacket.actor.name, 'Test Civic One');
assert.equal(packetAsks[0].inputPacket.exposure.self, 'Test profile one');
assert.equal(packetAsks[0].inputPacket.output.contract, 'CITIZEN_INTERVIEW/1');
assert.equal(packetAsks[0].interviewMode, true);
assert.equal(packetAsks[0].inputPacket.lattice, undefined,
  'Wake 2 must ask for citizen-authored speech, not backend lattice selection');
const cityBenchAsks = runApi.collectQuoteAsks([], {
  name: 'Luis Navarro', popid: 'POP-00636'
}, {
  ref: 'TEST-ONLY-ASSIGNMENT', label: 'TEST-ONLY city bench', hood: 'Downtown'
}, {
  cycle: 999, desk: 'civic',
  inputPacket: {
    v: 'LEP/2', wake: 'W1', actor: {}, task: {}, signal: {}, exposure: {
      candidates: [
        { pop: 'POP-91001', name: 'Test Affected', profile: 'Test affected profile', why: 'assignment' },
        { pop: 'POP-91002', name: 'Test Neighbor', profile: 'Test neighbor profile', why: 'same-hood-ledger' },
        { pop: 'POP-91003', name: 'Test Resident One', profile: 'Test city profile one', why: 'ledger-resident' },
        { pop: 'POP-91004', name: 'Test Resident Two', profile: 'Test city profile two', why: 'ledger-resident' }
      ]
    }, known: [], limits: {}, output: {}
  },
  angleRead: { plan: { focus: 'TEST-ONLY city focus', targets: [
    { pop: 'POP-91001', question: 'TEST-ONLY affected?', basis: 'assignment' }
  ], closeQuestion: 'TEST-ONLY close' } }
});
assert.deepStrictEqual(cityBenchAsks.map(row => row.pop),
  ['POP-91001', 'POP-91002', 'POP-91003', 'POP-91004'],
  'one reporter-selected target must not suppress the remaining supplied city bench');
runApi.activateWakeContext(null, 'p-slayer');
const fanAsks = runApi.collectQuoteAsks([], { name: 'P Slayer', popid: 'POP-00008' }, {
  ref: 'TEST-ONLY-SPORTS', label: 'TEST-ONLY no-hitter', popids: ['POP-90005'],
  hood: 'Downtown'
}, {
  cycle: 999, desk: 'sports',
  inputPacket: {
    v: 'LEP/2', wake: 'W1', actor: {}, task: {}, signal: { hood: 'Downtown' },
    exposure: { candidates: [] }, known: [], limits: {}, output: {}
  },
  angleRead: { plan: { focus: 'TEST-ONLY fan focus', targets: [], closeQuestion: 'TEST-ONLY close' } }
});
assert.ok(fanAsks.some(row => row.pop === 'POP-90005'),
  'empty packet candidates must not seal the city — story POPIDs become interviews');
assert.ok(fanAsks.length >= 1, 'W2 must ask at least one ledger/story citizen');
const approaches = {
  civic: 'generic civic',
  sports: 'generic sports',
  culture: 'generic culture',
  business: 'generic business',
  'freelance-firebrand': 'Jax accountability',
  'carmen-delaine': 'Carmen civic ledger',
  'luis-navarro': 'Luis investigation record',
  'trevor-shimizu': 'Trevor systems warning',
  'p-slayer': 'P Slayer fan heat',
  'anthony-raines': 'Anthony analytic board',
  'hal-richmond': 'Hal historical continuity',
  'tanya-cruz': 'Tanya sideline record',
  'simon-leary': 'Simon long-view structure',
  'maria-keen': 'Maria neighborhood ground',
  'elliot-graye': 'Graye faith ground',
  'mason-ortega': 'Mason kitchen ground',
  'sharon-okafor': 'Sharon behavior ground',
  'business-desk': 'Jordan storefront ledger',
  'kai-marston': 'Kai arts pulse',
  'rachel-torres': 'Rachel public safety',
  'lila-mezran': 'Lila health service',
  'angela-reyes': 'Angela education stability',
  'noah-tan': 'Noah weather ground',
};

const rotaPool = activeRotaCandidates(packages);
assert.equal(rotaPool.length, 18);
assert.deepStrictEqual(
  Object.fromEntries(Object.keys(DAILY_QUOTAS).map(desk => [desk,
    rotaPool.filter(row => row.desk === desk).length])),
  { civic: 7, sports: 5, culture: 5, business: 1 });

// The daily selector supplies at most the declared 2/2/1/1 seats. The package
// gate normalizes those selected identities but cannot insert the other active
// packages or consume another desk's capacity.
const selected = [
  Object.assign({ story: { ref: 'TEST-CIVIC-ONE' } }, carmen.assignment, { persona: 'carmen-delaine' }),
  Object.assign({ story: { ref: 'TEST-CIVIC-TWO' } }, luis.assignment, { persona: 'luis-navarro' }),
  Object.assign({ story: { ref: 'TEST-SPORTS-ONE' } }, pSlayer.assignment, { persona: 'p-slayer' }),
  Object.assign({ story: { ref: 'TEST-SPORTS-TWO' } }, anthony.assignment, { persona: 'anthony-raines' }),
  Object.assign({ story: { ref: 'TEST-CULTURE' } }, kai.assignment, { persona: 'kai-marston' }),
  Object.assign({ story: { ref: 'TEST-BUSINESS' } }, jordan.assignment, { persona: 'business-desk' }),
];
const bounded = applyWakePackageGate(selected, approaches, packages);
assert.equal(bounded.assignments.length, 6);
assert.deepStrictEqual(bounded.pinned, []);
assert.deepStrictEqual(bounded.skipped, []);
assert.deepStrictEqual(
  Object.fromEntries(Object.keys(DAILY_QUOTAS).map(desk => [desk,
    bounded.assignments.filter(row => row.desk === desk).length])),
  DAILY_QUOTAS);
assert.equal(bounded.assignments[0].approach, 'Carmen civic ledger');
assert.equal(bounded.assignments[0].story.ref, 'TEST-CIVIC-ONE');
assert.equal(bounded.assignments[5].wakePackage, 'JORDAN-LEP2-1');

const staleSeat = applyWakePackageGate(selected.concat({
  desk: 'culture', name: 'TEST-ONLY Unpackaged Reporter', persona: 'test-only', popid: 'POP-99999'
}), approaches, packages);
assert.equal(staleSeat.assignments.length, 6);
assert.deepStrictEqual(staleSeat.skipped.map(row => row.name),
  ['TEST-ONLY Unpackaged Reporter']);

const oversizedSavedRota = applyWakePackageGate([
  Object.assign({}, noah.assignment, { persona: 'noah-tan' }),
  Object.assign({}, angela.assignment, { persona: 'angela-reyes' }),
  Object.assign({}, lila.assignment, { persona: 'lila-mezran' }),
  Object.assign({}, rachel.assignment, { persona: 'rachel-torres' }),
  Object.assign({ story: { ref: 'TEST-JAX-SEED' } }, jax.assignment,
    { persona: 'freelance-firebrand' }),
  Object.assign({ story: { ref: 'TEST-LUIS-SEED' } }, luis.assignment,
    { persona: 'luis-navarro' }),
  Object.assign({ story: { ref: 'TEST-SPORTS-SEED' } }, pSlayer.assignment,
    { persona: 'p-slayer' }),
  Object.assign({ story: { ref: 'TEST-CULTURE-SEED' } }, kai.assignment,
    { persona: 'kai-marston' }),
  Object.assign({ story: { ref: 'TEST-BUSINESS-SEED' } }, jordan.assignment,
    { persona: 'business-desk' }),
], approaches, packages).assignments;
const runtimeBound = boundDailyAssignments(oversizedSavedRota);
assert.deepStrictEqual(runtimeBound.assignments.map(row => row.persona), [
  'luis-navarro', 'noah-tan', 'p-slayer', 'kai-marston', 'business-desk'
]);
assert.equal(runtimeBound.dropped.length, 3);
assert.ok(runtimeBound.assignments.length <=
  Object.values(DAILY_QUOTAS).reduce((sum, value) => sum + value, 0));

console.log('newsroomWakePackages.test.js: PASS');
