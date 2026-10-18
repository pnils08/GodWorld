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
assert.equal(report.inert.total, 1); // engine.299: a declared structural marker is reported apart, never hidden
assert.equal(report.structural.total, 1); assert.deepEqual(report.structural.byTag, { Compressed: 1 });
assert.equal(report.inert.share, 1/3); // engine.299: the structural marker is reported apart
assert.deepEqual(report.inert.byTag, { Daily: 1 });
assert.deepEqual(report.inert.byEngine, { syntheticEngine: 1 }); // engine.299: the structural line is counted apart
assert(report.inert.codeSites.some(s => s.tag === 'Daily' && s.line === 1));
assert(report.premise.some(h => h.kind === 'string' && h.text === 'SYNTHETIC priced out'));
assert(report.premise.some(h => h.allowed && h.kind === 'comment' && h.reason.includes('ordering')));
assert(report.premise.some(h => h.allowed && h.reason.includes('Elena')));
assert(report.premise.some(h => h.allowed && h.text === 'displacementmove' && /read alias/.test(h.reason))); // engine.299: read aliases are allowed with a reason, shown not hidden
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
const allowedOnly = buildOffenders({ log: [header, log[3]], ecl: [ecl[0]], sources: { 'phase07-evening-media/buildContractSeeds.js': '// never displaced' }, resolver });
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

// engine.299: owner-engine ledger pools are excluded from life-verbs; premise acceptance counts prose only.
{
  const ecl2 = [['Kind', 'PoolKey', 'Text', 'Active'], ['line', 'lifeEvent.promotion.up.L', 'Promoted at {employer}', 'yes'], ['line', 'civicRole.everyday.up.M', 'A couple said they named them in their wedding speech', 'yes'], ['line', 'neighborhood.texture', 'SYNTHETIC got married on the block', 'yes']];
  const r2 = buildOffenders({ log, ecl: ecl2, sources: {}, resolver, sheet: 'bench', generatedAt: 'synthetic' });
  assert(r2.lifeVerbs.filter(h => h.where === 'live:Event_Content_Ledger' && h.allowed).length === 2, 'owner pools allowed');
  assert(r2.lifeVerbs.some(h => h.where === 'live:Event_Content_Ledger' && !h.allowed && /married/.test(h.text)), 'a color pool life verb still flags');
  const r3 = buildOffenders({ log, ecl: [['Kind', 'PoolKey', 'Text', 'Active']], sources: { 'lib/synthetic.js': 'var col = "DisplacementRisk"; /* gentrification note */' }, resolver, sheet: 'bench', generatedAt: 'synthetic' });
  assert(r3.premise.length >= 2 && r3.premise.every(h => h.prose === false), 'identifier + comment reported, not prose');
}
console.log('engine.299 owner-pool + prose acceptance: PASS');
// codex 2026-10-18: a graded variant of a marker is NOT exempt; marker rows carry provenance.
{
  const log3 = [['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle'],
    ['t', 'POP-1', '', 'Death', 'SYNTHETIC death line', '', 111], ['t', 'POP-2', '', 'Death-Bogus|x', 'SYNTHETIC graded death', '', 111]];
  const r4 = buildOffenders({ log: log3, ecl: [['Kind', 'PoolKey', 'Text', 'Active']], sources: {}, resolver, sheet: 'bench', generatedAt: 'synthetic' });
  assert(r4.structural.total === 1 && r4.structural.rows[0].popId === 'POP-1', 'bare marker reported with provenance');
  assert(r4.inert.total === 1 && r4.inert.byTag['Death-Bogus'] === 1, 'a non-marker variant stays inert and visible');
}
console.log('engine.299 marker provenance: PASS');
// codex 2026-10-18: one-word LEDGER text is prose and blocks; a clean report is acceptanceEmpty=true.
{
  const cleanLog = [['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle'], ['t', 'POP-1', '', 'Neighborhood-Outabout-Up-S', 'SYNTHETIC livelier', '', 111]];
  const eclHdr = ['Kind', 'PoolKey', 'Text', 'Active'];
  const clean = buildOffenders({ log: cleanLog, ecl: [eclHdr], sources: {}, resolver, sheet: 'bench', generatedAt: 'synthetic' });
  assert.strictEqual(clean.acceptanceEmpty, true);
  for (const word of ['blight', 'displaced']) {
    const r = buildOffenders({ log: cleanLog, ecl: [eclHdr, ['line', 'neighborhood.texture', word, 'yes']], sources: {}, resolver, sheet: 'bench', generatedAt: 'synthetic' });
    assert(r.premise.some(h => h.text === word && h.prose === true), word + ' is prose');
    assert.strictEqual(r.acceptanceEmpty, false, 'one-word ledger text blocks: ' + word);
  }
  // code: a one-word string in an identifier position is not prose; the same word as a bare value is.
  const codeIdent = buildOffenders({ log: cleanLog, ecl: [eclHdr], sources: { 'lib/synthetic.js': 'if (reason === "displaced") x(); var col = idx("DisplacementRisk");' }, resolver, sheet: 'bench', generatedAt: 'synthetic' });
  assert(codeIdent.premise.length >= 2 && codeIdent.premise.every(h => h.prose === false) && codeIdent.acceptanceEmpty === true, 'identifier positions do not block');
  const codeProse = buildOffenders({ log: cleanLog, ecl: [eclHdr], sources: { 'lib/synthetic.js': 'var line = "displaced";' }, resolver, sheet: 'bench', generatedAt: 'synthetic' });
  assert(codeProse.premise.some(h => h.prose === true) && codeProse.acceptanceEmpty === false, 'a bare one-word value blocks');
}
console.log('engine.299 prose boundary: PASS');
// codex re-review 2: array entries, object values, call arguments and a terminal period are prose; lookups/comparisons/keys are not.
{
  const cleanLog = [['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle'], ['t', 'POP-1', '', 'Neighborhood-Outabout-Up-S', 'SYNTHETIC livelier', '', 111]];
  const eclHdr = ['Kind', 'PoolKey', 'Text', 'Active'];
  const one = (src) => buildOffenders({ log: cleanLog, ecl: [eclHdr], sources: { 'lib/synthetic.js': src }, resolver, sheet: 'bench', generatedAt: 'synthetic' });
  for (const src of ['var pool = ["blight"];', 'var event = { text: "displaced" };', 'writeLine("blight");', 'var line = "blight.";', 'var line = "displaced";'])
    assert.strictEqual(one(src).acceptanceEmpty, false, 'prose blocks: ' + src);
  for (const src of ['var col = idx("DisplacementRisk");', 'if (reason === "displaced") go();', 'var m = { displaced: 1 }; var k = { "displaced": 1 };', 'switch (x) { case "displaced": break; }'])
    assert.strictEqual(one(src).acceptanceEmpty, true, 'identifier use does not block: ' + src);
}
console.log('engine.299 known-identifier boundary: PASS');
