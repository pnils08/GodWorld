// Regression test for S265 ES-4 (C98 G-RC5).
//
// routePatternSeeds collapsed only the improvement pole, so 14+ per-hood
// citywide-decay seeds (math-imbalance) passed through individually, each
// carrying a POSITIVE causal anchor ("the A's winning stretch") on a DECLINING
// neighborhood — a sign mis-attribution. The fix: decayMetric() extracts the
// signed decay metric; collapseSeeds() folds the whole same-metric decay group
// (≥MIN_CLUSTER) into one citywide-decay synth with a sign-coherent WHY anchor.

var {
  decayMetric, improvementMetric, collapseSeeds,
} = require('./routePatternSeeds');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

console.log('=== S265 ES-4 decay-pole collapse + sign-aware WHY (C98 G-RC5) ===');

// decayMetric: parses decaySignals, prefers Sentiment, keeps sign.
var decPattern = {
  type: 'math-imbalance',
  evidence: { fields: { Neighborhood: 'Downtown', decaySignals: ['Sentiment -0.450', 'RetailVitality -3.96'] } },
};
var dm = decayMetric(decPattern);
ok(dm && dm.metric === 'sentiment', 'decayMetric picks the Sentiment signal');
ok(dm && dm.delta === -0.45, 'decayMetric preserves the negative sign (got ' + (dm && dm.delta) + ')');
ok(improvementMetric(decPattern) === null, 'improvementMetric ignores a decay pattern');
ok(decayMetric({ type: 'improvement', evidence: { fields: { sentimentDelta: '0.11' } } }) === null,
   'decayMetric ignores an improvement pattern');

// Build 5 per-hood decay intents (varying magnitude — mean-reversion is non-uniform).
function decIntent(hood, delta) {
  return { seedId: 'pat-c98-' + hood, neighborhood: hood, domain: 'CIVIC', severity: 'medium',
    metric: 'sentiment', delta: delta, pole: 'decay', coveringCitizens: ['POP-00001'],
    causalAnchor: { kind: 'global', driver: "the A's winning stretch (W4)", confidence: 'low' } };
}
var intents = [
  decIntent('Downtown', -0.45), decIntent('Temescal', -0.59), decIntent('Laurel', -0.41),
  decIntent('Fruitvale', -0.47), decIntent('Rockridge', -0.46),
];

var { collapsed, collapseLog } = collapseSeeds(intents, 98, null);

ok(collapsed.length === 1, '5 spread-magnitude decay hoods collapse to 1 seed (got ' + collapsed.length + ')');
var synth = collapsed[0];
ok(synth && synth.pole === 'decay' && synth.patternType === 'decay-citywide', 'collapsed seed is a citywide-decay synth');
ok(synth && /eased/.test(synth.text) && /-0\.5|-0\.4/.test(synth.text), 'synth text uses "eased" with a negative range: ' + (synth && synth.text));
ok(synth && synth.causalAnchor && !/winning stretch|First Friday/i.test(synth.causalAnchor.driver),
   'synth WHY is NOT a positive global driver');
ok(synth && /mean-reversion|cooldown/i.test(synth.causalAnchor.driver),
   'synth WHY is the sign-coherent mean-reversion anchor');
ok(collapseLog.length === 1 && collapseLog[0].pole === 'decay' && collapseLog[0].collapsed === 5,
   'collapseLog records the decay fold (5 hoods)');

// Sub-threshold decay (2 hoods) must NOT collapse — passes through as individual seeds.
var small = collapseSeeds([decIntent('Glenview', -0.47), decIntent('Dimond', -0.46)], 98, null);
ok(small.collapsed.length === 2 && small.collapseLog.length === 0,
   'sub-MIN_CLUSTER decay (2 hoods) passes through, not collapsed');

console.log((fail === 0 ? 'ALL ' + pass + ' ASSERTIONS PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
