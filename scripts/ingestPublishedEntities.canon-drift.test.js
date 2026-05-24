/**
 * ingestPublishedEntities.canon-drift.test.js — T7 canon.3 / ADR-0007 contract
 *
 * Two surfaces under test:
 *
 *   1. ingestPublishedEntities.partitionCandidatesByBayTribuneIndex —
 *      pure function. Splits a candidate list into canonNew + canonDrift
 *      against a synthetic bay-tribune index. No sheets, no filesystem.
 *
 *   2. auditCanonDrift.buildBayTribuneNameIndex — sync helper that walks
 *      a directory of edition .txt files and aggregates proper-noun
 *      candidates not matched by any supplied canonical set. Driven here
 *      with synthetic edition files in a tmp directory.
 *
 * No live sheet reads. Both surfaces are I/O-decoupled by design.
 */

'use strict';

var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var ingest = require('./ingestPublishedEntities.js');
var audit = require('./auditCanonDrift.js');

function passing(name, fn) {
  try { fn(); console.log('  PASS  ' + name); return 1; }
  catch (e) { console.error('  FAIL  ' + name); console.error('        ' + (e.message || e)); return 0; }
}

var passed = 0;
var total = 0;

console.log('\n[T7] ingestPublishedEntities canon-drift partition + bay-tribune index\n');

// ---------------------------------------------------------------------------
console.log('Group 1 — partitionCandidatesByBayTribuneIndex (pure)');

total++; passed += passing('candidate present in index → routed to canonDrift', function () {
  var bayIndex = new Map();
  bayIndex.set('carmen solis', {
    name: 'Carmen Solis',
    editions: new Set(['cycle_pulse_edition_93.txt']),
    snippets: ['Mam-language community advocate Carmen Solis'],
    count: 4,
    firstEdition: 'cycle_pulse_edition_93.txt',
  });
  var candidates = [{ first: 'Carmen', last: 'Solis', middle: '', description: 'Mam-language community advocate' }];
  var out = ingest.partitionCandidatesByBayTribuneIndex(candidates, bayIndex, 94);
  assert.strictEqual(out.canonNew.length, 0, 'should not classify as NEW');
  assert.strictEqual(out.canonDrift.length, 1, 'should route to canonDrift');
  var entry = out.canonDrift[0];
  assert.strictEqual(entry.name, 'Carmen Solis');
  assert.strictEqual(entry.popid, null);
  assert.strictEqual(entry.cycle, 94);
  assert.strictEqual(entry.surfacedBy, 'post-publish-step-5');
  assert.deepStrictEqual(entry.bay_tribune_doc_ids, ['cycle_pulse_edition_93.txt']);
  assert.strictEqual(entry.first_edition_seen, 'cycle_pulse_edition_93.txt');
  assert.strictEqual(entry.count, 4);
});

total++; passed += passing('candidate absent from index → routed to canonNew', function () {
  var bayIndex = new Map();
  var candidates = [{ first: 'Brand', last: 'New', middle: '', description: 'first appearance' }];
  var out = ingest.partitionCandidatesByBayTribuneIndex(candidates, bayIndex, 94);
  assert.strictEqual(out.canonDrift.length, 0);
  assert.strictEqual(out.canonNew.length, 1);
  assert.strictEqual(out.canonNew[0].first, 'Brand');
});

total++; passed += passing('mixed input partitions correctly + preserves order', function () {
  var bayIndex = new Map();
  bayIndex.set('roberto iglesias', {
    name: 'Roberto Iglesias',
    editions: new Set(['cycle_pulse_edition_93.txt', 'cycle_pulse_edition_94.txt']),
    snippets: ['Fruitvale taquería owner Roberto Iglesias'],
    count: 7,
    firstEdition: 'cycle_pulse_edition_93.txt',
  });
  var candidates = [
    { first: 'Brand', last: 'New', middle: '', description: '' },
    { first: 'Roberto', last: 'Iglesias', middle: '', description: 'Fruitvale taquería owner' },
    { first: 'Also', last: 'New', middle: '', description: '' },
  ];
  var out = ingest.partitionCandidatesByBayTribuneIndex(candidates, bayIndex, 94);
  assert.strictEqual(out.canonNew.length, 2);
  assert.strictEqual(out.canonDrift.length, 1);
  assert.strictEqual(out.canonDrift[0].name, 'Roberto Iglesias');
  assert.strictEqual(out.canonDrift[0].suggested_action, 'backfill', '2+ editions → backfill');
  assert.strictEqual(out.canonNew[0].first, 'Brand');
  assert.strictEqual(out.canonNew[1].first, 'Also');
});

total++; passed += passing('single-edition hit → suggested_action=investigate', function () {
  var bayIndex = new Map();
  bayIndex.set('mara test', {
    name: 'Mara Test',
    editions: new Set(['cycle_pulse_edition_94.txt']),
    snippets: ['Mara Test, walk-on mention'],
    count: 1,
    firstEdition: 'cycle_pulse_edition_94.txt',
  });
  var candidates = [{ first: 'Mara', last: 'Test', middle: '', description: '' }];
  var out = ingest.partitionCandidatesByBayTribuneIndex(candidates, bayIndex, 94);
  assert.strictEqual(out.canonDrift[0].suggested_action, 'investigate');
});

total++; passed += passing('3-token name uses middle in first+middle+last form for lookup', function () {
  var bayIndex = new Map();
  // Index entry under the 3-word form (matches audit's aggregation key when
  // the surface appearance is 3-token).
  bayIndex.set('elena soria dominguez', {
    name: 'Elena Soria Dominguez',
    editions: new Set(['cycle_pulse_edition_93.txt']),
    snippets: ['Elena Soria Dominguez at the panel'],
    count: 13,
    firstEdition: 'cycle_pulse_edition_93.txt',
  });
  // ingest resolveCitizens splits "Elena Soria Dominguez" into first=Elena,
  // middle=Soria, last=Dominguez. Partition should reconstruct the 3-word
  // form and find the index hit.
  var candidates = [{ first: 'Elena', last: 'Dominguez', middle: 'Soria', description: '' }];
  var out = ingest.partitionCandidatesByBayTribuneIndex(candidates, bayIndex, 94);
  assert.strictEqual(out.canonDrift.length, 1, 'should match via 3-word reconstruction');
  assert.strictEqual(out.canonDrift[0].name, 'Elena Soria Dominguez');
});

total++; passed += passing('empty index → all candidates route to canonNew (defensive)', function () {
  var candidates = [
    { first: 'A', last: 'One', middle: '', description: '' },
    { first: 'B', last: 'Two', middle: '', description: '' },
  ];
  var out = ingest.partitionCandidatesByBayTribuneIndex(candidates, new Map(), 94);
  assert.strictEqual(out.canonNew.length, 2);
  assert.strictEqual(out.canonDrift.length, 0);
});

total++; passed += passing('null index → falls back to all-NEW (fail-open semantics)', function () {
  var candidates = [{ first: 'A', last: 'One', middle: '', description: '' }];
  var out = ingest.partitionCandidatesByBayTribuneIndex(candidates, null, 94);
  assert.strictEqual(out.canonNew.length, 1);
  assert.strictEqual(out.canonDrift.length, 0);
});

total++; passed += passing('candidateOrigin captured for engine-sheet backfill traceability', function () {
  var bayIndex = new Map();
  bayIndex.set('carmen solis', {
    name: 'Carmen Solis',
    editions: new Set(['cycle_pulse_edition_93.txt']),
    snippets: [],
    count: 2,
    firstEdition: 'cycle_pulse_edition_93.txt',
  });
  var candidates = [{ first: 'Carmen', last: 'Solis', middle: '', description: 'Mam-language advocate' }];
  var out = ingest.partitionCandidatesByBayTribuneIndex(candidates, bayIndex, 94);
  assert.deepStrictEqual(out.canonDrift[0].candidateOrigin, {
    first: 'Carmen',
    last: 'Solis',
    middle: '',
    description: 'Mam-language advocate',
  });
});

// ---------------------------------------------------------------------------
console.log('\nGroup 2 — buildBayTribuneNameIndex (sync, file-driven)');

// Synthetic edition fixture writer. Two minimal edition files in a tmpdir;
// the helper walks them and applies the same filter logic the audit uses.
function withTmpEditions(files, fn) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribune-idx-'));
  try {
    Object.keys(files).forEach(function (name) {
      fs.writeFileSync(path.join(dir, name), files[name]);
    });
    return fn(dir);
  } finally {
    fs.readdirSync(dir).forEach(function (f) { fs.unlinkSync(path.join(dir, f)); });
    fs.rmdirSync(dir);
  }
}

total++; passed += passing('extracts drift name from a single edition', function () {
  withTmpEditions({
    'cycle_pulse_edition_93.txt':
      'Article body.\n\n' +
      'Roberto Iglesias opened the Fruitvale taquería at sunrise.\n' +
      'Carmen Solis interpreted at the council session.\n',
  }, function (dir) {
    var idx = audit.buildBayTribuneNameIndex({
      editionsDir: dir,
      simSet: new Set(),
      culturalSet: new Set(),
      chicagoSet: new Set(),
      faithSet: new Set(),
    });
    assert.ok(idx.size >= 2, 'should find at least Roberto + Carmen, got ' + idx.size);
    assert.ok(idx.has('roberto iglesias'));
    assert.ok(idx.has('carmen solis'));
    assert.deepStrictEqual(Array.from(idx.get('roberto iglesias').editions),
      ['cycle_pulse_edition_93.txt']);
  });
});

total++; passed += passing('excludes names in simSet (already canonical)', function () {
  withTmpEditions({
    'cycle_pulse_edition_93.txt':
      'Avery Santana spoke at the rally. Roberto Iglesias served horchata.\n',
  }, function (dir) {
    var idx = audit.buildBayTribuneNameIndex({
      editionsDir: dir,
      simSet: new Set(['avery santana']),  // already in Sim_Ledger
      culturalSet: new Set(),
      chicagoSet: new Set(),
      faithSet: new Set(),
    });
    assert.ok(!idx.has('avery santana'), 'Sim_Ledger names excluded');
    assert.ok(idx.has('roberto iglesias'), 'drift name still surfaces');
  });
});

total++; passed += passing('aggregates appearances across multiple editions', function () {
  withTmpEditions({
    'cycle_pulse_edition_92.txt': 'Roberto Iglesias appeared early.\n',
    'cycle_pulse_edition_93.txt': 'Roberto Iglesias returned to the hearing.\n',
    'cycle_pulse_edition_94.txt': 'Roberto Iglesias spoke on transit.\n',
  }, function (dir) {
    var idx = audit.buildBayTribuneNameIndex({
      editionsDir: dir,
      simSet: new Set(), culturalSet: new Set(), chicagoSet: new Set(), faithSet: new Set(),
    });
    var entry = idx.get('roberto iglesias');
    assert.ok(entry, 'should aggregate');
    assert.strictEqual(entry.editions.size, 3, 'three editions');
    assert.strictEqual(entry.count, 3, 'three occurrences');
    assert.strictEqual(entry.firstEdition, 'cycle_pulse_edition_92.txt');
  });
});

total++; passed += passing('denylist 2-word phrases never surface as candidates', function () {
  // Note: denylist catches the canonical 2-word phrases (e.g. "west oakland",
  // "lake merritt"). 3+ word phrases that the audit's normalizing variants
  // don't decompose into a denylisted 2-word form (e.g. "The Stabilization
  // Fund" — no TITLE_PREFIX strip of "the") legitimately surface as candidates
  // by current audit design; tightening the denylist is audit-side scope.
  withTmpEditions({
    'cycle_pulse_edition_94.txt':
      'West Oakland reported gains today. Lake Merritt drew crowds. ' +
      'Roberto Iglesias spoke briefly.\n',
  }, function (dir) {
    var idx = audit.buildBayTribuneNameIndex({
      editionsDir: dir,
      simSet: new Set(), culturalSet: new Set(), chicagoSet: new Set(), faithSet: new Set(),
    });
    assert.ok(!idx.has('west oakland'), 'denylist hit excluded');
    assert.ok(!idx.has('lake merritt'), 'denylist hit excluded');
    assert.ok(idx.has('roberto iglesias'), 'genuine drift surfaces');
  });
});

total++; passed += passing('NAMES INDEX block is stripped before scan (no POPID-pair leak)', function () {
  withTmpEditions({
    'cycle_pulse_edition_94.txt':
      'Lead article. Roberto Iglesias spoke.\n\n' +
      'NAMES INDEX\n' +
      '----------\n' +
      'POP-00789 | Phantom Inside Index | role\n' +
      '\n' +
      'BUSINESSES NAMED\n' +
      '----------\n' +
      '- BIZ-00001 | Some Shop | retail | hood\n',
  }, function (dir) {
    var idx = audit.buildBayTribuneNameIndex({
      editionsDir: dir,
      simSet: new Set(), culturalSet: new Set(), chicagoSet: new Set(), faithSet: new Set(),
    });
    assert.ok(idx.has('roberto iglesias'));
    assert.ok(!idx.has('phantom inside index'), 'NAMES INDEX content stripped');
  });
});

// ---------------------------------------------------------------------------
console.log('\n[T7] ' + passed + '/' + total + ' assertions passed');
if (passed !== total) process.exit(1);
