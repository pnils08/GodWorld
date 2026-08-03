'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildGraph, renderHtml, parseTsv, slugify } = require('./buildCitizenBondGraph');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'citizen-bond-graph-'));

try {
  // --- Basic slugify ---
  assert.strictEqual(slugify('Mags Corliss'), 'mags-corliss');
  assert.strictEqual(slugify("O'Brien-Jones"), 'o-brien-jones');

  // --- Variant A: Relationship_Bond_Ledger with Timestamp + Cycle ---
  const ledgerWithTimestamp = path.join(tmpRoot, 'bonds_with_timestamp.tsv');
  fs.writeFileSync(ledgerWithTimestamp,
    '====\n' +
    'Relationship_Bond_Ledger\n' +
    'Exported: 2026-07-20T12:00:00.000Z\n' +
    '====\n' +
    'Timestamp\tCycle\tBondId\tCitizenA\tCitizenB\tBondType\tIntensity\tStatus\tOrigin\tDomainTag\tNeighborhood\n' +
    '2026-07-01T10:00:00Z\t101\tB1\tMags Corliss\tElio Vance\tfriendship\t5\tactive\tcollege\tcivic\tDowntown\n' +
    '2026-07-02T10:00:00Z\t101\tB2\tElio Vance\tMags Corliss\tcolleague\t3\tactive\tnewsroom\tcivic\tDowntown\n' +
    '2026-07-03T10:00:00Z\t101\tB3\tMara Vance\t\trivalry\t7\tactive\tchildhood\tpersonal\tUptown\n' +
    '2026-07-04T10:00:00Z\t101\tB4\tKai Marston\tDanny Horn\tmentor\t4\tinactive\tteam\tsports\tFruitvale\n' +
    '2026-07-05T10:00:00Z\t101\tB5\tNia Okonkwo\tSofia Reyes\tneighbor\t2\tpending\tblock\tcivic\tTemescal\n',
    'utf8'
  );

  const g1 = buildGraph(ledgerWithTimestamp, { minIntensity: 0 }).graph;
  assert.strictEqual(g1.directed, false);
  assert.strictEqual(g1.multigraph, false);
  assert.strictEqual(g1.graph.source, ledgerWithTimestamp);
  assert.strictEqual(g1.graph.stats.rowsRead, 5);
  assert.strictEqual(g1.graph.stats.skippedBlank, 1);
  assert.strictEqual(g1.graph.stats.skippedInactive, 1);
  assert.strictEqual(g1.graph.stats.keptUnrecognized, 1);
  // Duplicate pair Mags-Elio deduped to highest intensity (5)
  assert.strictEqual(g1.links.length, 2);
  const magsElio = g1.links.find((l) => l.source === 'mags-corliss' && l.target === 'elio-vance');
  assert.ok(magsElio, 'deduped Mags-Elio link exists');
  assert.strictEqual(magsElio.weight, 5);
  assert.strictEqual(magsElio.relation, 'friendship');
  // Nodes sorted by id
  assert.deepStrictEqual(g1.nodes.map((n) => n.id), g1.nodes.map((n) => n.id).sort());
  const magsNode = g1.nodes.find((n) => n.id === 'mags-corliss');
  assert.strictEqual(magsNode.label, 'Mags Corliss');
  assert.strictEqual(magsNode.group, 'Downtown');
  assert.strictEqual(magsNode.degree, 1);

  // --- Variant B: Relationship_Bonds without Timestamp/Cycle ---
  const ledgerBare = path.join(tmpRoot, 'bonds_bare.tsv');
  fs.writeFileSync(ledgerBare,
    '====\n' +
    'Relationship_Bonds\n' +
    'Exported: 2026-07-20T12:00:00.000Z\n' +
    '====\n' +
    'BondId\tCitizenA\tCitizenB\tBondType\tIntensity\tStatus\tOrigin\tDomainTag\tNeighborhood\n' +
    'B10\tSam Rivera\tJordan Lee\tcolleague\t3\tActive\toffice\tbusiness\tDowntown\n' +
    'B11\tJordan Lee\tSam Rivera\tcolleague\t6\tactive\toffice\tbusiness\tDowntown\n' +
    'B12\tRhea Morgan\tAvery Chen\trival\t8\tterminated\tbeat\tmedia\tWest Oakland\n',
    'utf8'
  );

  const g2 = buildGraph(ledgerBare, { minIntensity: 0 }).graph;
  assert.strictEqual(g2.graph.stats.rowsRead, 3);
  assert.strictEqual(g2.graph.stats.skippedInactive, 1);
  assert.strictEqual(g2.links.length, 1);
  const samJordan = g2.links[0];
  assert.strictEqual(samJordan.weight, 6);
  assert.strictEqual(samJordan.source, 'jordan-lee'); // alphabetical canonical pair
  assert.strictEqual(samJordan.target, 'sam-rivera');

  // --- min-intensity filter ---
  const g3 = buildGraph(ledgerWithTimestamp, { minIntensity: 4 }).graph;
  assert.strictEqual(g3.links.length, 1);
  assert.strictEqual(g3.links[0].weight, 5);
  assert.strictEqual(g3.graph.stats.minIntensity, 4);

  // --- Determinism ---
  const out1 = path.join(tmpRoot, 'graph1.json');
  const out2 = path.join(tmpRoot, 'graph2.json');
  fs.writeFileSync(out1, JSON.stringify(buildGraph(ledgerBare, { minIntensity: 0 }).graph, null, 2));
  fs.writeFileSync(out2, JSON.stringify(buildGraph(ledgerBare, { minIntensity: 0 }).graph, null, 2));
  assert.strictEqual(fs.readFileSync(out1, 'utf8'), fs.readFileSync(out2, 'utf8'), 'deterministic JSON output');

  // --- HTML generation ---
  const html = renderHtml(g1, ledgerWithTimestamp);
  assert.ok(html.includes('<title>Citizen bond graph — bonds_with_timestamp.tsv</title>'));
  assert.ok(html.includes('RAW_NODES'));
  assert.ok(html.includes('RAW_EDGES'));
  assert.ok(html.includes('Generated world graph from bonds_with_timestamp.tsv'));
  assert.ok(html.includes('vis-network'));

  // --- End-to-end synthetic graph (40 citizens, 80 bonds) ---
  const syntheticTsv = path.join(tmpRoot, 'synthetic_40_80.tsv');
  const neighborhoods = ['Downtown', 'Temescal', 'Fruitvale', 'West Oakland', 'Uptown'];
  const firstNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const citizens = [];
  for (let i = 0; i < 40; i++) {
    citizens.push(`${firstNames[i % firstNames.length]} Citizen-${i}`);
  }
  const bondTypes = ['friend', 'colleague', 'rival', 'kin', 'neighbor'];
  let tsv = '====\nRelationship_Bonds\nExported: 2026-07-20T12:00:00.000Z\n====\n';
  tsv += 'BondId\tCitizenA\tCitizenB\tBondType\tIntensity\tStatus\tOrigin\tDomainTag\tNeighborhood\n';
  for (let i = 0; i < 80; i++) {
    const a = citizens[i % citizens.length];
    const b = citizens[(i * 7 + 3) % citizens.length];
    const bond = bondTypes[i % bondTypes.length];
    const intensity = (i % 10) + 1;
    const status = i % 7 === 0 ? 'inactive' : 'active';
    const hood = neighborhoods[i % neighborhoods.length];
    tsv += `B${i + 1}\t${a}\t${b}\t${bond}\t${intensity}\t${status}\torigin${i}\ttag${i}\t${hood}\n`;
  }
  fs.writeFileSync(syntheticTsv, tsv, 'utf8');

  const synthetic = buildGraph(syntheticTsv, { minIntensity: 0 }).graph;
  assert.ok(synthetic.nodes.length > 0, 'synthetic graph has nodes');
  assert.ok(synthetic.links.length > 0, 'synthetic graph has links');
  const syntheticHtml = renderHtml(synthetic, syntheticTsv);
  assert.ok(syntheticHtml.includes('RAW_NODES'));
  assert.ok(syntheticHtml.includes('RAW_EDGES'));

  console.log('buildCitizenBondGraph.test.js: all assertions passed');
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
