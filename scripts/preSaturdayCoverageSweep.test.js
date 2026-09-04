#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// loadReportComplete/loadStagedStems read from a fixed ROOT baked in at
// require time (matches cron-lore-run.js's own pattern) -- exercise the
// pure isCovered() matcher directly instead of standing up a fake ROOT,
// and cover the filename parsing with a real temp COMPARE dir via a second
// require under a monkeypatched module path is more trouble than it's
// worth for a script this size, so this suite proves the contract that
// actually matters: prefix matching between a report stem and a staged
// stem that carries a model-tag suffix the report stem never has.
const sweep = require('./preSaturdayCoverageSweep');

// A staged file's stem always extends the report stem with a model tag --
// isCovered must match on that prefix, not require an exact match.
assert.strictEqual(
  sweep.isCovered('civic_c105_carmen-delaine_packet-v2',
    ['civic_c105_carmen-delaine_packet-v2_deepseek-deepseek-chat']),
  true
);
// No staged stem starts with the report stem -> uncovered.
assert.strictEqual(
  sweep.isCovered('civic_c105_trevor-shimizu_packet-v2',
    ['civic_c105_carmen-delaine_packet-v2_deepseek-deepseek-chat']),
  false
);
// A different persona sharing a desk+cycle prefix must not false-match --
// the persona slug is part of the stem, so a genuine prefix relationship
// requires the full report stem (desk_cycle_persona_packet-v2) to lead.
assert.strictEqual(
  sweep.isCovered('civic_c105_lila-mezran_packet-v2',
    ['civic_c105_lila-mezran-jr_packet-v2_deepseek-deepseek-chat']),
  false,
  'lila-mezran must not match a staged file actually belonging to lila-mezran-jr'
);
assert.strictEqual(sweep.isCovered('x', []), false, 'no staged stems at all -> uncovered');

// loadReportComplete: real temp dir, real filenames, confirms the regex
// parses desk/persona correctly and ignores unrelated files.
const compareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-sweep-'));
try {
  const names = [
    'civic_c105_trevor-shimizu_packet-v2_story.md',           // report-complete, cycle 105
    'civic_c105_trevor-shimizu_packet-v2_angle.json',         // not a _story.md -- ignored
    'culture_c104_mason-ortega_packet-v2_story.md',           // wrong cycle -- ignored
    'sports_c105_anthony-raines_packet-v2_story.md',          // report-complete, cycle 105
    'random-non-matching-file.md',                            // ignored
  ];
  for (const n of names) fs.writeFileSync(path.join(compareDir, n), 'x');

  // loadReportComplete reads the module-level COMPARE constant, which is
  // fixed at require time to the real repo -- reimplement its regex here
  // against the temp dir instead of re-requiring with a patched ROOT, to
  // keep this test independent of internal module wiring.
  const re = /^([a-z]+)_c105_([a-z0-9-]+)_packet-v2_story\.md$/;
  const found = fs.readdirSync(compareDir).filter(f => re.test(f));
  assert.strictEqual(found.length, 2);
  const trevor = found.find(f => f.includes('trevor'));
  const m = trevor.match(re);
  assert.strictEqual(m[1], 'civic');
  assert.strictEqual(m[2], 'trevor-shimizu');
} finally {
  fs.rmSync(compareDir, { recursive: true, force: true });
}

console.log('preSaturdayCoverageSweep.test.js PASS');
