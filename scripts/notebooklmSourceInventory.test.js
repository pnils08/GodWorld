#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const {
  parseArgs,
  classifyTitle,
  normalizeSources,
  bucketCounts,
  renderMarkdown,
  buildInventory,
} = require('./notebooklmSourceInventory');

function testParseArgs() {
  const parsed = parseArgs(['node', 'script', '--output-dir', 'output/codex']);
  assert.strictEqual(parsed.outputDir, path.join('/root/GodWorld', 'output', 'codex'));
  assert.throws(
    () => parseArgs(['node', 'script', '--output-dir', '../outside']),
    /inside the repository/
  );
}

function testConservativeBuckets() {
  assert.strictEqual(
    classifyTitle('cycle_pulse_edition_900_NONCANON_TEST.txt').reviewBucket,
    'publication_candidate'
  );
  assert.strictEqual(
    classifyTitle('NONCANON_TEST — supplemental draft.md').reviewBucket,
    'exclude_candidate'
  );
  assert.strictEqual(
    classifyTitle('supplemental_oaks_expansion_draft.md').reviewBucket,
    'exclude_candidate'
  );
  assert.strictEqual(
    classifyTitle('bay_tribune_dispatch_c900_NONCANON_TEST.pdf').reviewBucket,
    'publication_candidate'
  );
  assert.strictEqual(
    classifyTitle('NONCANON_TEST — world_summary_c900.txt').reviewBucket,
    'nonpublication_candidate'
  );
  assert.strictEqual(
    classifyTitle('Oakland Neighborhoods_World Summary').reviewBucket,
    'nonpublication_candidate'
  );
  assert.strictEqual(
    classifyTitle('NONCANON_TEST — ambiguous reference').reviewBucket,
    'needs_review'
  );
}

function testInventoryContract() {
  const sources = normalizeSources([
    { id: 'TEST-SOURCE-1', title: 'cycle_pulse_edition_900_NONCANON_TEST.txt', type: 'generated_text' },
    { id: 'TEST-SOURCE-2', title: 'NONCANON_TEST — supplemental draft.md', type: 'word_doc' },
    { id: 'TEST-SOURCE-3', title: 'NONCANON_TEST — world_summary_c900.txt', type: 'generated_text' },
    { id: 'TEST-SOURCE-4', title: 'NONCANON_TEST — ambiguous reference', type: 'unknown' },
  ]);
  const counts = bucketCounts(sources);
  assert.deepStrictEqual(counts, {
    publication_candidate: 1,
    nonpublication_candidate: 1,
    exclude_candidate: 1,
    needs_review: 1,
  });

  const inventory = buildInventory(
    { notebookId: 'TEST-NOTEBOOK-NONCANON', notebookName: 'NONCANON_TEST Notebook' },
    sources,
    '2099-01-01T00:00:00.000Z'
  );
  assert.strictEqual(inventory.total, 4);
  assert.strictEqual(inventory.canonStatus, 'NOT_CANON');
  assert.match(inventory.warning, /no source is automatically allowed/i);

  const markdown = renderMarkdown(inventory);
  assert.match(markdown, /Review buckets are title-based suggestions only/);
  assert.match(markdown, /Every source requires explicit Task 2 review/);
}

function testInvalidInputFailsLoudly() {
  assert.throws(() => normalizeSources({}), /JSON array/);
  assert.throws(
    () => normalizeSources([{ id: 'TEST-SOURCE-MISSING-TITLE' }]),
    /missing id or title/
  );
  assert.throws(
    () => buildInventory({}, [], '2099-01-01T00:00:00.000Z'),
    /has no notebookId/
  );
}

testParseArgs();
testConservativeBuckets();
testInventoryContract();
testInvalidInputFailsLoudly();
console.log('notebooklmSourceInventory tests: PASS');
