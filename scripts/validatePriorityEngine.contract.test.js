/**
 * validatePriorityEngine.contract.test.js — contract test for the Engine A
 * shadow validation harness (T2.8). Pairs with `validatePriorityEngine.js`.
 *
 * S217 engine.17 Phase 5.2 — validator coverage.
 *
 * Section A: source-level — env + lib/sheets dep, argv parser, proposal
 *   loader, seed-index builder columns, table renderers, empty-state
 *   handling.
 * Section B: subprocess smoke when sheets creds + sift_proposals fixture
 *   available — runs `--cycle <latest>` against live Story_Seed_Deck +
 *   the most recent sift_proposals_cNN.json, asserts the markdown report
 *   writes to output/ + exit 0.
 *
 * Run: node scripts/validatePriorityEngine.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'validatePriorityEngine.js');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(SCRIPT_PATH, 'utf8');

const HAS_SHEETS_CREDS = fs.existsSync('/root/.config/godworld/credentials/service-account.json');
const PROPOSALS_DIR = path.join(ROOT, 'output');

function findLatestProposalCycle() {
  if (!fs.existsSync(PROPOSALS_DIR)) return null;
  const files = fs.readdirSync(PROPOSALS_DIR)
    .map(f => f.match(/^sift_proposals_c(\d+)\.json$/))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10))
    .sort((a, b) => b - a);
  return files[0] || null;
}
const LATEST_CYCLE = findLatestProposalCycle();
const HAS_PROPOSALS = LATEST_CYCLE !== null;

let passed = 0;
let failed = 0;
let skipped = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
function skip(label, reason) {
  console.log(`  skip ${label} — ${reason}`);
  skipped++;
}

console.log('═══ Section A — structural');

console.log('\nTest 1: source readable + non-trivial');
{
  assert('script exists', fs.existsSync(SCRIPT_PATH));
  assert('source > 5KB', source.length > 5000, `${source.length} bytes`);
}

console.log('\nTest 2: env + lib/sheets loaded');
{
  assert("require lib/env present",
    /require\(['"][^'"]*\/lib\/env['"]\)/.test(source));
  assert('getRawSheetData imported',
    /getRawSheetData/.test(source) && /require\(['"]\.\.\/lib\/sheets['"]\)/.test(source));
  assert("reads 'Story_Seed_Deck' sheet",
    /['"]Story_Seed_Deck['"]/.test(source));
}

console.log('\nTest 3: argv parser handles --cycle / -c flags');
{
  assert('parseArgs function declared',
    /function\s+parseArgs\s*\(/.test(source));
  assert("--cycle flag parsed",
    /['"]--cycle['"]/.test(source));
  assert("-c short flag parsed",
    /['"]-c['"]/.test(source));
  assert("cycle value parsed as int",
    /parseInt\(args\[\+\+i\],\s*10\)/.test(source));
}

console.log('\nTest 4: loadProposals reads output/sift_proposals_c{NN}.json');
{
  assert('loadProposals function declared',
    /function\s+loadProposals\s*\(/.test(source));
  assert("PROPOSALS_DIR points to output/",
    /PROPOSALS_DIR\s*=\s*path\.join\([^)]*['"]output['"]\s*\)/.test(source));
  assert("filename pattern sift_proposals_c${cycle}.json",
    /sift_proposals_c\$\{cycle\}\.json/.test(source));
}

console.log('\nTest 5: findLatestCycleWithProposals fallback');
{
  assert('findLatestCycleWithProposals function declared',
    /function\s+findLatestCycleWithProposals\s*\(/.test(source));
  // Regex extracts cycle number from filename
  assert("cycle-number extract regex",
    /sift_proposals_c\(\\d\+\)\\\.json/.test(source) ||
    /\^sift_proposals_c\(\\d\+\)\\\.json\$/.test(source));
}

console.log('\nTest 6: buildSeedIndex resolves all Engine A columns');
{
  assert('buildSeedIndex function declared',
    /function\s+buildSeedIndex\s*\(/.test(source));
  // T2.7-added Engine A columns
  for (const col of ['PriorityScore', 'ConsequenceFloor', 'PriorityComponents']) {
    assert(`Engine A column '${col}' resolved`, source.includes(`'${col}'`));
  }
  // Base seed columns
  for (const col of ['SeedID', 'SeedType', 'Domain', 'Neighborhood', 'SeedText',
                     'SuggestedJournalist']) {
    assert(`base seed column '${col}' resolved`, source.includes(`'${col}'`));
  }
  // hasPriorityCols gate
  assert("'hasPriorityCols' gate present",
    /hasPriorityCols/.test(source));
}

console.log('\nTest 7: topScoredSeeds filters by cycle + sorts desc by score');
{
  assert('topScoredSeeds function declared',
    /function\s+topScoredSeeds\s*\(/.test(source));
  assert('parseFloat priorityScore filter',
    /parseFloat\([^)]*priorityScore[^)]*\)/.test(source));
  assert('descending sort by score',
    /sort\(\(a,\s*b\)\s*=>\s*b\.score\s*-\s*a\.score\)/.test(source));
  // ConsequenceFloor === 'TRUE' uppercased
  assert("ConsequenceFloor 'TRUE' uppercase check",
    /toUpperCase\(\)\s*===\s*['"]TRUE['"]/.test(source));
}

console.log('\nTest 8: renderProposalsTable + renderTopSeedsTable markdown shape');
{
  assert('renderProposalsTable function declared',
    /function\s+renderProposalsTable\s*\(/.test(source));
  assert('renderTopSeedsTable function declared',
    /function\s+renderTopSeedsTable\s*\(/.test(source));
  // Both use markdown tables
  assert('proposals markdown table header',
    /\|\s*#\s*\|\s*Sift ID\s*\|/.test(source));
  assert('top-seeds markdown table header',
    /\|\s*Rank\s*\|\s*SeedID\s*\|/.test(source));
  // Floor lock emoji marker
  assert("floor 🔒 emoji marker", /🔒/.test(source));
}

console.log('\nTest 9: empty-state handling — awaiting Engine A data');
{
  // Empty-state messages signal first-cycle readiness
  assert("'awaiting' status text",
    /awaiting/.test(source));
  assert("'No live priority data yet' empty-table text",
    /No live priority data yet/.test(source));
  assert("'PriorityScore' column missing branch",
    /no\s*`PriorityScore`\s*column/i.test(source));
}

console.log('\nTest 10: idempotent overwrite + provenance footer');
{
  // output/priority_engine_validation_c${cycle}.md target
  assert("output path priority_engine_validation_c{cycle}.md",
    /priority_engine_validation_c\$\{cycle\}\.md/.test(source));
  // fs.writeFileSync overwrite (idempotent)
  assert('fs.writeFileSync overwrite',
    /fs\.writeFileSync\(outPath/.test(source));
  // Provenance footer mentions script + v1
  assert("'Provenance:' footer references validatePriorityEngine.js",
    source.includes('validatePriorityEngine.js'));
}

console.log('\nTest 11: exit-1 on caught error');
{
  assert('main().catch process.exit(1)',
    /main\(\)\.catch[\s\S]*process\.exit\(1\)/.test(source));
}

console.log('\n═══ Section B — subprocess smoke (requires sheets creds + sift_proposals fixture)');

console.log('\nTest 12: --cycle latest runs to completion');
if (HAS_SHEETS_CREDS && HAS_PROPOSALS) {
  const result = spawnSync('node', [SCRIPT_PATH, '--cycle', String(LATEST_CYCLE)], {
    cwd: ROOT, encoding: 'utf8', timeout: 60000,
  });
  assert(`script exits 0 on --cycle ${LATEST_CYCLE}`, result.status === 0,
    `status=${result.status} stderr=${(result.stderr || '').slice(0, 300)}`);
  const out = result.stdout || '';
  assert("output mentions 'Wrote' for report file",
    /Wrote/.test(out));
  assert(`output mentions C${LATEST_CYCLE}`,
    out.includes(`C${LATEST_CYCLE}`));
  // Confirm report file landed on disk
  const reportPath = path.join(ROOT, 'output', `priority_engine_validation_c${LATEST_CYCLE}.md`);
  assert(`report file ${path.basename(reportPath)} written`,
    fs.existsSync(reportPath));
  if (fs.existsSync(reportPath)) {
    const md = fs.readFileSync(reportPath, 'utf8');
    assert("report contains 'Priority Engine Validation' header",
      /# Priority Engine Validation/.test(md));
    assert("report contains 'Mags' editorial pick order' section",
      /Mags' editorial pick order/.test(md));
    assert("report contains 'Engine A top-15' or 'Status' section",
      /Engine A top-15|## Status/.test(md));
  }
} else {
  const reason = !HAS_SHEETS_CREDS ? 'service-account.json absent (CI)' :
                                     'no sift_proposals_c*.json fixture';
  skip('script exits 0 on --cycle latest', reason);
  skip("output mentions 'Wrote' for report file", reason);
  skip('output mentions cycle number', reason);
  skip('report file written', reason);
  skip("report contains 'Priority Engine Validation' header", reason);
  skip("report contains 'Mags' editorial pick order' section", reason);
  skip("report contains 'Engine A top-15' or 'Status' section", reason);
}

console.log('\n' + '═'.repeat(60));
const skipNote = skipped > 0 ? `, ${skipped} skipped` : '';
console.log(`${passed} passed, ${failed} failed${skipNote}`);
process.exit(failed === 0 ? 0 : 1);
