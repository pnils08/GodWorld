'use strict';
// All fixtures below are synthetic, offline and never written to a Sheet.
const assert = require('assert');
const { buildOffenders, fragments } = require('./deadBranchScan');
const resolver = require('../utilities/citizenDialMap');
const header = ['Cycle', 'EventTag', 'EventText', 'SourceEngine'];
const log = [header,
  [110, 'Daily', 'SYNTHETIC old line', 'oldEngine'],
  [111, 'Daily', 'SYNTHETIC inert line', 'syntheticEngine'],
  [111, 'Daily-Composure-Down-S|source:qol', 'SYNTHETIC graded line', 'syntheticEngine'],
  [111, 'Compressed', 'SYNTHETIC structural line', 'syntheticEngine']];
const ecl = [['Text', 'Active'], ['SYNTHETIC blight line', 'yes'], ['SYNTHETIC encampment inactive', 'no'], ['SYNTHETIC measured decline', 'yes']];
const sources = {
  'phase05-citizens/generateCitizensEvents.js': 'var primaryTag = "Daily";\nvar pool = ["SYNTHETIC priced out", "SYNTHETIC married", "handled a logistics call with an ex"];',
  'phase07-evening-media/buildContractSeeds.js': '// leads are never displaced\nvar prose = "SYNTHETIC displaced";',
  'phase03-population/updateCrimeMetrics.js': '// enforcement displacement',
  'utilities/tier1EssenceEvents.js': 'var rows = [{tag: "Promotion", text: "Reads the anti-displacement and workforce mechanics end to end."}];',
  'utilities/compressLifeHistory.js': 'var old = "displacementmove";',
  'phase05-citizens/householdFormationEngine.js': 'var tab = "LifeHistory_Log"; var text = "SYNTHETIC married";',
  'lib/synthetic.js': 'var text = "SYNTHETIC decline"; /* SYNTHETIC gentrification */'
};
const report = buildOffenders({ log, ecl, sources, resolver, sheet: 'bench', generatedAt: 'synthetic' });
assert.equal(report.cycle, 111);
assert.equal(report.scannedLines, 3);
assert.equal(report.inert.total, 2); // structural is still inert, no hidden exemption
assert.equal(report.inert.share, 2/3);
assert.deepEqual(report.inert.byTag, { Daily: 1, Compressed: 1 });
assert.deepEqual(report.inert.byEngine, { syntheticEngine: 2 });
assert(report.inert.codeSites.some(s => s.tag === 'Daily' && s.line === 1));
assert(report.premise.some(h => h.kind === 'string' && h.text === 'SYNTHETIC priced out'));
assert(report.premise.some(h => h.allowed && h.kind === 'comment' && h.reason.includes('ordering')));
assert(report.premise.some(h => h.allowed && h.reason.includes('Elena')));
assert(report.premise.some(h => h.allowed && h.text === 'displacementmove'));
assert(report.premise.some(h => h.where === 'live:Event_Content_Ledger' && h.row === 2));
assert(!report.premise.some(h => /decline|inactive/.test(h.text)));
assert(report.lifeVerbs.some(h => h.text === 'SYNTHETIC married'));
assert(!report.lifeVerbs.some(h => h.file.includes('householdFormationEngine')));
assert(report.lifeVerbs.some(h => h.allowed && h.text === 'Promotion'));
assert(report.lifeVerbs.some(h => h.allowed && h.reason.includes('MaritalStatus')));
assert.equal(report.acceptanceEmpty, false);
const older = buildOffenders({ log, ecl, sources, resolver, cycle: 110 });
assert.equal(older.inert.total, 1);
assert.deepEqual(older.inert.byEngine, { oldEngine: 1 });
const clean = buildOffenders({ log: [header, log[3]], ecl: [ecl[0]], sources: {}, resolver });
assert.equal(clean.inert.total, 0);
assert.equal(clean.acceptanceEmpty, true);
const allowedOnly = buildOffenders({ log: [header, log[3]], ecl: [ecl[0]], sources: { 'utilities/compressLifeHistory.js': 'var x="displacementmove";' }, resolver });
assert.equal(allowedOnly.acceptanceEmpty, true);
assert.equal(allowedOnly.premise.length, 1);
const noSource = buildOffenders({ log: [['Cycle','EventTag','EventText'],[111,'Daily','SYNTHETIC long exact prose observation']],
  ecl: [ecl[0]], sources: { 'phase05-citizens/generateCitizensEvents.js': 'var pool=["SYNTHETIC long exact prose observation"];' }, resolver });
assert.equal(noSource.inert.byEngine['inferred:phase05-citizens/generateCitizensEvents.js'], 1);
const unknown = buildOffenders({ log: [['Cycle','EventTag','EventText'],[111,'Daily','SYNTHETIC unmatched']], ecl:[ecl[0]], sources:{}, resolver });
assert.equal(unknown.inert.byEngine['unknown:no unique source evidence'], 1);
assert.throws(() => buildOffenders({ log: [['Cycle']], ecl, sources, resolver }), /EventTag/);
assert.throws(() => buildOffenders({ log, ecl, sources, resolver, cycle: 999 }), /no log rows/);
assert.throws(() => buildOffenders({ log: [header, ['', 'Daily', 'bad']], ecl, sources, resolver }), /invalid Cycle/);
const parts = fragments('var s = "url // gentrification"; // blight\n/* displaced\nmore */\nvar t="encampment";');
assert.deepEqual(parts.map(t => [t.kind,t.line]), [['string',1], ['comment',1], ['comment',2], ['string',4]]);
assert.equal(fragments('var r=/["\']/; var t=`a ${"nested"} displaced`;').filter(t => t.kind === 'string').length, 3);
console.log('deadBranchScan offenders: PASS (Cycle filtering, resolver, strings/comments, allowlist, live ECL, missing-data rejection)');
