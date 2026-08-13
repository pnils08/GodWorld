'use strict';

const assert = require('assert');
const packagesApi = require('./newsroomWakePackages');

const packages = packagesApi.loadPackages();
const active = packagesApi.activePackages(packages);
assert.deepStrictEqual(active.map(row => row.key),
  ['freelance-firebrand', 'carmen-delaine', 'luis-navarro', 'trevor-shimizu', 'p-slayer', 'anthony-raines', 'hal-richmond', 'tanya-cruz', 'simon-leary', 'maria-keen', 'business-desk', 'kai-marston', 'rachel-torres', 'lila-mezran', 'angela-reyes', 'noah-tan']);

const jax = packages['freelance-firebrand'];
assert.equal(jax.version, 'JAX-LEP2-1');
assert.equal(jax.requiredDaily, true);
assert.equal(jax.assignment.name, 'Jax Caldera');
assert.equal(jax.assignment.popid, 'POP-00799');
assert.equal(jax.packetContract, 'v2');
assert.equal(packagesApi.routeFor(jax, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(jax, 'report').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(jax, 'write').model, 'anthropic/claude-sonnet-5');
assert.equal(jax.reviewProfile.canonPolicy, 'load-bearing');
assert.equal(jax.reviewProfile.articleContract.renderMode, 'SOURCE_BRIEF');
assert.ok(jax.reviewProfile.authorizedTexture.some(v => v.includes('bartender')));
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
assert.ok(noah.reviewProfile.textureConditions.some(v => v.includes('ordinary weather')));
assert.ok(noah.reviewProfile.canonBlockers.some(v => v.includes('invented forecast')));

const gate = packagesApi.gateAssignments([
  { desk: 'civic', name: 'Jax Caldera', persona: 'freelance-firebrand' },
  { desk: 'civic', name: 'Carmen Delaine', persona: 'carmen-delaine' },
  { desk: 'sports', name: 'P Slayer', persona: 'p-slayer' },
  { desk: 'sports', name: 'Anthony Raines', persona: 'anthony-raines' },
  { desk: 'business', name: 'Jordan Velez', persona: 'business-desk' },
  { desk: 'culture', name: 'TEST-ONLY Unpackaged Reporter', persona: 'test-only' },
], packages);
assert.equal(gate.eligible.length, 5);
assert.equal(gate.eligible[0].wakePackage, 'JAX-LEP2-1');
assert.equal(gate.eligible[1].wakePackage, 'CARMEN-LEP2-1');
assert.equal(gate.eligible[2].wakePackage, 'PSLAYER-LEP2-1');
assert.equal(gate.eligible[3].wakePackage, 'ANTHONY-LEP2-1');
assert.equal(gate.eligible[4].wakePackage, 'JORDAN-LEP2-1');
assert.equal(gate.skipped.length, 1);
assert.equal(gate.skipped[0].name, 'TEST-ONLY Unpackaged Reporter');
assert.equal(gate.skipped[0].reason, 'no-active-wake-package');

assert.throws(() => packagesApi.routeFor(jax, 'publish'), /unknown wake stage/);
assert.throws(() => packagesApi.validatePackage('bad', { active: true }), /invalid wake package/);

const { applyWakePackageGate } = require('./newsroom-fanout');
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
assert.deepStrictEqual(packetAsks.map(row => row.pop), ['POP-90001', 'POP-90002'],
  'Packet quote pool must not fill from the generic desk lane');
assert.equal(packetAsks[0].inputPacket.actor.name, 'Test Civic One');
assert.equal(packetAsks[0].inputPacket.exposure.self, 'Test profile one');
runApi.activateWakeContext(null, 'p-slayer');
const fanAsks = runApi.collectQuoteAsks([], { name: 'P Slayer', popid: 'POP-00008' }, {
  ref: 'TEST-ONLY-SPORTS', label: 'TEST-ONLY no-hitter', popids: ['POP-90005']
}, {
  cycle: 999, desk: 'sports',
  inputPacket: {
    v: 'LEP/2', wake: 'W1', actor: {}, task: {}, signal: {},
    exposure: { candidates: [] }, known: [], limits: {}, output: {}
  },
  angleRead: { plan: { focus: 'TEST-ONLY fan focus', targets: [], closeQuestion: 'TEST-ONLY close' } }
});
assert.deepStrictEqual(fanAsks, [],
  'Packet story POPIDs outside the exact candidate set must not become interview targets');
const pinned = applyWakePackageGate([
  { desk: 'civic', name: 'TEST-ONLY Civic One', popid: 'POP-99997', story: { ref: 'TEST-CIVIC-ONE', label: 'Test signal one' } },
  { desk: 'civic', name: 'TEST-ONLY Civic Two', popid: 'POP-99998', story: { ref: 'TEST-CIVIC-TWO', label: 'Test signal two' } },
  { desk: 'sports', name: 'TEST-ONLY Sports One', popid: 'POP-99999', story: { ref: 'TEST-SPORTS-ONE', label: 'Test sports signal one' } },
  { desk: 'sports', name: 'TEST-ONLY Sports Two', popid: 'POP-99993', story: { ref: 'TEST-SPORTS-TWO', label: 'Test sports signal two' } },
  { desk: 'business', name: 'TEST-ONLY Business Reporter', popid: 'POP-99992' },
], {
  civic: 'generic civic',
  sports: 'generic sports',
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
  'business-desk': 'Jordan storefront ledger',
  'kai-marston': 'Kai arts pulse',
  'rachel-torres': 'Rachel public safety',
  'lila-mezran': 'Lila health service',
  'angela-reyes': 'Angela education stability',
  'noah-tan': 'Noah weather ground',
}, packages);
assert.equal(pinned.assignments.length, 16);
const pinnedByPersona = new Map(pinned.assignments.map(row => [row.persona, row]));
assert.equal(pinnedByPersona.get('freelance-firebrand').name, 'Jax Caldera');
assert.equal(pinnedByPersona.get('freelance-firebrand').approach, 'Jax accountability');
assert.equal(pinnedByPersona.get('freelance-firebrand').story.ref, 'TEST-CIVIC-ONE');
assert.equal(pinnedByPersona.get('carmen-delaine').name, 'Carmen Delaine');
assert.equal(pinnedByPersona.get('carmen-delaine').approach, 'Carmen civic ledger');
assert.equal(pinnedByPersona.get('carmen-delaine').story.ref, 'TEST-CIVIC-TWO');
assert.equal(pinnedByPersona.get('luis-navarro').name, 'Luis Navarro');
assert.equal(pinnedByPersona.get('luis-navarro').approach, 'Luis investigation record');
assert.equal(pinnedByPersona.get('luis-navarro').story, undefined);
assert.equal(pinnedByPersona.get('trevor-shimizu').name, 'Trevor Shimizu');
assert.equal(pinnedByPersona.get('trevor-shimizu').approach, 'Trevor systems warning');
assert.equal(pinnedByPersona.get('trevor-shimizu').story, undefined);
assert.equal(pinnedByPersona.get('p-slayer').name, 'P Slayer');
assert.equal(pinnedByPersona.get('p-slayer').approach, 'P Slayer fan heat');
assert.equal(pinnedByPersona.get('p-slayer').story.ref, 'TEST-SPORTS-ONE');
assert.equal(pinnedByPersona.get('anthony-raines').name, 'Anthony Raines');
assert.equal(pinnedByPersona.get('anthony-raines').approach, 'Anthony analytic board');
assert.equal(pinnedByPersona.get('anthony-raines').story.ref, 'TEST-SPORTS-TWO');
assert.equal(pinnedByPersona.get('hal-richmond').name, 'Hal Richmond');
assert.equal(pinnedByPersona.get('hal-richmond').approach, 'Hal historical continuity');
assert.equal(pinnedByPersona.get('hal-richmond').story, undefined);
assert.equal(pinnedByPersona.get('tanya-cruz').name, 'Tanya Cruz');
assert.equal(pinnedByPersona.get('tanya-cruz').approach, 'Tanya sideline record');
assert.equal(pinnedByPersona.get('tanya-cruz').story, undefined);
assert.equal(pinnedByPersona.get('simon-leary').name, 'Simon Leary');
assert.equal(pinnedByPersona.get('simon-leary').approach, 'Simon long-view structure');
assert.equal(pinnedByPersona.get('simon-leary').story, undefined);
assert.equal(pinnedByPersona.get('maria-keen').name, 'Maria Keen');
assert.equal(pinnedByPersona.get('maria-keen').approach, 'Maria neighborhood ground');
assert.equal(pinnedByPersona.get('maria-keen').story, undefined);
assert.equal(pinnedByPersona.get('business-desk').name, 'Jordan Velez');
assert.equal(pinnedByPersona.get('business-desk').approach, 'Jordan storefront ledger');
assert.equal(pinnedByPersona.get('kai-marston').name, 'Kai Marston');
assert.equal(pinnedByPersona.get('kai-marston').approach, 'Kai arts pulse');
assert.equal(pinnedByPersona.get('rachel-torres').name, 'Sgt. Rachel Torres');
assert.equal(pinnedByPersona.get('rachel-torres').approach, 'Rachel public safety');
assert.equal(pinnedByPersona.get('lila-mezran').name, 'Dr. Lila Mezran');
assert.equal(pinnedByPersona.get('lila-mezran').approach, 'Lila health service');
assert.equal(pinnedByPersona.get('angela-reyes').name, 'Angela Reyes');
assert.equal(pinnedByPersona.get('angela-reyes').approach, 'Angela education stability');
assert.equal(pinnedByPersona.get('noah-tan').name, 'Noah Tan');
assert.equal(pinnedByPersona.get('noah-tan').approach, 'Noah weather ground');
assert.deepStrictEqual(pinned.pinned.map(row => row.replaced),
  ['TEST-ONLY Civic One', 'TEST-ONLY Civic Two', null, null, 'TEST-ONLY Sports One',
    'TEST-ONLY Sports Two', null, null, null, null, 'TEST-ONLY Business Reporter', null, null, null, null, null]);
assert.deepStrictEqual(pinned.skipped.map(row => row.name), []);

// Registry order cannot let one required civic package overwrite the other.
const reversedPackages = {
  'carmen-delaine': carmen,
  'freelance-firebrand': jax,
};
const reversed = applyWakePackageGate([
  { desk: 'civic', name: 'Carmen Delaine', popid: 'POP-00011', persona: 'carmen-delaine', story: { ref: 'TEST-CARMEN' } },
  { desk: 'civic', name: 'TEST-ONLY Civic Open Seat', popid: 'POP-99996', story: { ref: 'TEST-JAX' } },
], { civic: 'generic civic', 'freelance-firebrand': 'Jax accountability' }, reversedPackages);
assert.deepStrictEqual(reversed.assignments.map(row => row.persona),
  ['carmen-delaine', 'freelance-firebrand']);
assert.equal(reversed.assignments[0].story.ref, 'TEST-CARMEN');
assert.equal(reversed.assignments[1].story.ref, 'TEST-JAX');

// Desk shortfalls add missing required seats without stealing another desk.
const shortDesk = applyWakePackageGate([
  { desk: 'civic', name: 'TEST-ONLY Civic Solo', popid: 'POP-99995', story: { ref: 'TEST-CIVIC' } },
  { desk: 'business', name: 'TEST-ONLY Business Seat', popid: 'POP-99994', story: { ref: 'TEST-BUSINESS' } },
  { desk: 'culture', name: 'TEST-ONLY Culture Preserved', popid: 'POP-99991', story: { ref: 'TEST-CULTURE' } },
], { civic: 'generic civic' }, packages);
assert.equal(shortDesk.assignments.length, 16);
assert.deepStrictEqual(new Set(shortDesk.assignments.map(row => row.persona)),
  new Set(['freelance-firebrand', 'carmen-delaine', 'luis-navarro', 'trevor-shimizu', 'p-slayer', 'anthony-raines', 'hal-richmond', 'tanya-cruz', 'simon-leary', 'maria-keen', 'business-desk', 'kai-marston', 'rachel-torres', 'lila-mezran', 'angela-reyes', 'noah-tan']));
assert.ok(shortDesk.pinned.some(row => row.replaced === 'TEST-ONLY Culture Preserved'));
assert.equal(shortDesk.pinned.filter(row => row.replaced === null).length, 13);

console.log('newsroomWakePackages.test.js: PASS');
