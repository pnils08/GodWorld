#!/usr/bin/env node
/**
 * emitFormatContractSections.test.js — S229 engine.24 ADR-0006 Contract B
 * coverage for the rewrite that closes G-W43 + G-P37.
 *
 * Pairs with scripts/emitFormatContractSections.js. If you refactor the
 * helper, confirm the assertions below still match the new structure.
 *
 * Run: node scripts/emitFormatContractSections.test.js
 * Exits 0 on pass, 1 on failure.
 */

const fs = require('fs');
const path = require('path');
const helper = require('./emitFormatContractSections');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// ────────────────────────────────────────────────────────────────────────────
// Fixture: C94 published CUL (the gap-log G-P37 canonical input)
// ────────────────────────────────────────────────────────────────────────────
const C94_CUL = `CIVIC / GOVERNMENT
- Mayor Avery Santana — referenced in C2 (Stab Fund clearance comment from council podium)
- Council President Ramon Vega (D4, IND) — named procedural path on Transit Hub vote (C1)
- Leonard Tran (D2, IND) — voted YES on Transit Hub Phase II after Mam-language scope addition
- Soria Dominguez (POP-00791, Transit Hub Planning Lead) — produced 12-page scope addition
- Brenda Okoro (POP-00037, Deputy Mayor Community Affairs) — referenced in editorial portfolio context

CITIZENS QUOTED OR PROFILED
- Beverly Hayes (POP-00772) — profiled in C2, stoop interview, returning voice across recent cycles
- Roberto Iglesias — quoted in C1 post-vote, returning from previous cycle (bay-tribune-only canon)
- Carmen Solis — referenced in C1 + L2 (Mam-language thread, returning from previous cycle)
- Rev. Daniel Han — quoted in N1 scene piece

SPORTS
- Frank Reyna (POP-00079) — featured in S3 game piece (3h/2hr/2rbi), referenced in S2
- Travis Coles (POP-00533) — featured in S3 (7 IP, 9 K, 5W, 1.13 ERA), referenced in S2
- Vinnie Keane (POP-00001) — sidebar in S1 (8-game streak)

BUSINESS / OWNERSHIP
- Elias Varek (POP-00789) — center of FP1, founder Civis Systems + Oaks ownership lead
- Mike Paulson (POP-00527) — referenced in FP1 (A's GM, joke recruitment for Oaks)

LETTERS WRITERS
- Keisha Morris (NEW, 51, West Oakland, counselor) — L1 reacts to C2
- Miguel Santos (NEW, 54, Fruitvale, restaurant owner) — L2 reacts to C1
- David Okonkwo (NEW, 62, Lake Merritt, retired insurance adjuster) — L3 reacts to S3

(NEW CANON THIS CYCLE)
- Keisha Morris — citizen, West Oakland counselor (POP-pending)
- Miguel Santos — citizen, Fruitvale restaurant owner (POP-pending)
- David Okonkwo — citizen, Lake Merritt retired insurance adjuster (POP-pending)
- Dario's Bar — Telegraph corridor bar (BIZ-pending, established 1998 per L3 voice)
- Adams Point United Methodist Church — confirmed canon, Adams Point neighborhood, Methodist tradition, Rev. Daniel Han, congregation 300, founded 1892`;

// ────────────────────────────────────────────────────────────────────────────
// Fixture: C93-style CUL where the subsection HEADER is the org name
// (legacy pre-S229 shape — must still parse to validate backward compat)
// ────────────────────────────────────────────────────────────────────────────
const C93_LEGACY_CUL = `CIVIC / GOVERNMENT
- Mayor Avery Santana (POP-00100) — referenced in C1

CIVIS SYSTEMS (NEW CANON THIS CYCLE)
- Elias Varek (POP-00789) — founder, named in FP1

ATLAS BAY ARCHITECTS (NEW CANON THIS CYCLE)
- Some Person — referenced

GREATER HOPE PENTECOSTAL CHURCH (NEW CANON THIS CYCLE)
- Pastor Jane Doe — named in N1`;

// ────────────────────────────────────────────────────────────────────────────
// Test 1: exports stay stable
// ────────────────────────────────────────────────────────────────────────────
console.log('Test 1: module exports');
{
  const required = ['parseCitizenUsageLog', 'parseEntityRow', 'classifyOrgSubsection',
    'findSectionRange', 'emitNamesIndex', 'emitBusinessesNamed', 'FOOTER_HEADERS'];
  for (const k of required) {
    assert(`exports.${k} present`, helper[k] !== undefined);
  }
  // S229 additions
  assert('exports.parseNewCanonRow present (S229)', helper.parseNewCanonRow !== undefined);
  assert('exports.classifyNewCanonRow present (S229)', helper.classifyNewCanonRow !== undefined);
  assert('exports.preflightContractB present (S229)', helper.preflightContractB !== undefined);
  assert('exports.assertNoForbiddenSeparator present (S229)', helper.assertNoForbiddenSeparator !== undefined);
  assert('exports.SEPARATOR present (S229)', helper.SEPARATOR !== undefined);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 2: SEPARATOR is 60-hyphen, matching canonical template
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2: separator format');
{
  assert('SEPARATOR is 60 hyphens', helper.SEPARATOR === '------------------------------------------------------------');
  assert('SEPARATOR length 60', helper.SEPARATOR.length === 60);
  assert('SEPARATOR does NOT match `===` regex', !helper.FORBIDDEN_SEPARATOR_REGEX.test(helper.SEPARATOR));
  assert('FORBIDDEN_SEPARATOR_REGEX matches `=====`', helper.FORBIDDEN_SEPARATOR_REGEX.test('====='));
  assert('FORBIDDEN_SEPARATOR_REGEX does NOT match `-----`', !helper.FORBIDDEN_SEPARATOR_REGEX.test('-----'));
}

// ────────────────────────────────────────────────────────────────────────────
// Test 3: classifyNewCanonRow — per-line descriptor classification
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 3: classifyNewCanonRow per-line descriptor classification');
{
  // Citizen markers
  assert('citizen via "citizen," prefix',
    helper.classifyNewCanonRow('Keisha Morris', 'citizen, West Oakland counselor (POP-pending)') === 'citizen');
  assert('citizen via POP-pending',
    helper.classifyNewCanonRow('Some Person', 'Lake Merritt retired teacher POP-pending') === 'citizen');

  // Faith markers
  assert('faith via "tradition" descriptor keyword',
    helper.classifyNewCanonRow('Adams Point UMC',
      'confirmed canon, Adams Point neighborhood, Methodist tradition, Rev. Daniel Han, congregation 300, founded 1892') === 'faith');
  assert('faith via name keyword "church"',
    helper.classifyNewCanonRow('Greater Hope Church', 'confirmed canon, West Oakland') === 'faith');
  assert('faith via "congregation" descriptor',
    helper.classifyNewCanonRow('Some Org', 'confirmed canon, North Oakland, Pentecostal worship, congregation 150') === 'faith');

  // Biz markers
  assert('biz via BIZ-pending marker',
    helper.classifyNewCanonRow("Dario's Bar", 'Telegraph corridor bar (BIZ-pending, established 1998)') === 'biz');
  assert('biz via descriptor "bar"',
    helper.classifyNewCanonRow("Dario's Bar", 'Telegraph corridor bar, established 1998') === 'biz');
  assert('biz via descriptor "restaurant"',
    helper.classifyNewCanonRow('Some Place', 'Fruitvale restaurant') === 'biz');
  assert('biz via name keyword "architects"',
    helper.classifyNewCanonRow('Atlas Bay Architects', 'design firm, Adams Point') === 'biz');

  // Unknown — descriptor has no classifying signal
  assert('unknown when descriptor empty',
    helper.classifyNewCanonRow('Some Name', '') === 'unknown');
  assert('unknown when descriptor is bare prose',
    helper.classifyNewCanonRow('Some Name', 'just a vague descriptor') === 'unknown');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 4: parseNewCanonRow — full-row parse
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 4: parseNewCanonRow extracts citizen / biz / faith');
{
  // Citizen
  const c = helper.parseNewCanonRow('Keisha Morris — citizen, West Oakland counselor (POP-pending)');
  assert('citizen row parses', c && c.kind === 'citizen');
  assert('citizen fullName extracted', c && c.record.fullName === 'Keisha Morris');
  assert('citizen popId null (POP-pending)', c && c.record.popId === null);

  // Faith
  const f = helper.parseNewCanonRow(
    'Adams Point United Methodist Church — confirmed canon, Adams Point neighborhood, Methodist tradition, Rev. Daniel Han, congregation 300, founded 1892');
  assert('faith row parses', f && f.kind === 'faith');
  assert('faith name extracted', f && f.record.name === 'Adams Point United Methodist Church');
  assert('faith neighborhood extracted "Adams Point"', f && f.record.neighborhood === 'Adams Point',
    `got "${f && f.record.neighborhood}"`);

  // Biz
  const b = helper.parseNewCanonRow("Dario's Bar — Telegraph corridor bar (BIZ-pending, established 1998 per L3 voice)");
  assert('biz row parses', b && b.kind === 'biz');
  assert('biz name extracted', b && b.record.name === "Dario's Bar");
  assert('biz sector contains "bar"', b && b.record.sector && b.record.sector.toLowerCase().includes('bar'),
    `got "${b && b.record.sector}"`);
  assert('biz neighborhood "Telegraph corridor"', b && b.record.neighborhood === 'Telegraph corridor',
    `got "${b && b.record.neighborhood}"`);

  // Unparseable
  assert('null on missing em-dash', helper.parseNewCanonRow('Just a bare name with no separator') === null);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 5: parseCitizenUsageLog on C94 fixture — G-P37 root-cause test
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 5: parseCitizenUsageLog on C94 fixture (G-P37 root cause)');
{
  const lines = C94_CUL.split('\n');
  const parsed = helper.parseCitizenUsageLog(lines);

  // Citizens: expect popId-bearing rows (Beverly, Frank, Travis, Vinnie, Varek,
  // Paulson, Soria, Okoro) + bare-name rows from CIVIC + CITIZENS QUOTED +
  // letters writers (Keisha/Miguel/David — dedup-merged with their LETTERS
  // WRITERS entries).
  assert('parsed.citizens non-empty', parsed.citizens.length > 0);
  assert('parsed.citizens includes Beverly Hayes (POP-00772)',
    parsed.citizens.some(c => c.popId === 'POP-00772' && c.fullName === 'Beverly Hayes'));
  assert('parsed.citizens includes Keisha Morris (NEW)',
    parsed.citizens.some(c => c.fullName === 'Keisha Morris' && !c.popId));

  // S229 root-cause assertions — biz + faith extracted from (NEW CANON THIS CYCLE):
  assert('parsed.businesses extracts Dario\'s Bar (G-P37 silent-drop fix)',
    parsed.businesses.some(b => b.name === "Dario's Bar"),
    `got businesses: ${JSON.stringify(parsed.businesses.map(b => b.name))}`);
  assert('parsed.faithOrgs extracts Adams Point UMC (G-P37 silent-drop fix)',
    parsed.faithOrgs.some(f => f.name === 'Adams Point United Methodist Church'),
    `got faithOrgs: ${JSON.stringify(parsed.faithOrgs.map(f => f.name))}`);

  // Meta flags
  assert('meta.newCanonSubsectionSeen = true', parsed.meta.newCanonSubsectionSeen === true);
  assert('meta.bizMentionSeenInCul = true (BIZ-pending in Dario\'s row)',
    parsed.meta.bizMentionSeenInCul === true);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 6: parseCitizenUsageLog on C93 legacy fixture — backward compat
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 6: parseCitizenUsageLog on C93 legacy fixture (header-as-org-name)');
{
  const lines = C93_LEGACY_CUL.split('\n');
  const parsed = helper.parseCitizenUsageLog(lines);

  // Civis Systems classifies as biz via "systems" keyword
  assert('legacy: Civis Systems extracted as biz',
    parsed.businesses.some(b => b.name === 'Civis Systems'),
    `got: ${JSON.stringify(parsed.businesses.map(b => b.name))}`);
  // Atlas Bay Architects classifies as biz via "architects" keyword
  assert('legacy: Atlas Bay Architects extracted as biz',
    parsed.businesses.some(b => b.name === 'Atlas Bay Architects'));
  // Greater Hope Pentecostal Church classifies as faith via "church" keyword
  assert('legacy: Greater Hope Pentecostal Church extracted as faith',
    parsed.faithOrgs.some(f => f.name === 'Greater Hope Pentecostal Church'),
    `got: ${JSON.stringify(parsed.faithOrgs.map(f => f.name))}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 7: emitNamesIndex / emitBusinessesNamed produce flat strict pipe-format
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 7: emit functions produce flat strict pipe-format (no leading `- `)');
{
  const parsed = {
    citizens: [
      { fullName: 'Beverly Hayes', popId: 'POP-00772', role: 'Community Director' },
      { fullName: 'Roberto Iglesias', popId: null, role: 'Fruitvale taqueria owner' },
    ],
    businesses: [
      { name: "Dario's Bar", sector: 'bar', neighborhood: 'Telegraph corridor' },
    ],
    faithOrgs: [
      { name: 'Adams Point UMC', neighborhood: 'Adams Point' },
    ],
  };

  const namesBlock = helper.emitNamesIndex(parsed);
  const bizBlock = helper.emitBusinessesNamed(parsed);

  assert('namesBlock contains POPID pipe-format row',
    namesBlock.some(l => l === 'POP-00772 | Beverly Hayes | Community Director'),
    `got: ${JSON.stringify(namesBlock)}`);
  assert('namesBlock contains freeform em-dash row',
    namesBlock.some(l => l === 'Roberto Iglesias — Fruitvale taqueria owner'));
  assert('namesBlock contains FAITH-NEW pipe-format row',
    namesBlock.some(l => l === 'FAITH-NEW | Adams Point UMC | Faith Org | Adams Point'));

  // BUSINESSES NAMED uses NEW prefix + flat pipe
  assert('bizBlock contains "NEW | Dario\'s Bar | bar | Telegraph corridor"',
    bizBlock.some(l => l === "NEW | Dario's Bar | bar | Telegraph corridor"),
    `got: ${JSON.stringify(bizBlock)}`);

  // No `- ` bullets anywhere on the data rows
  const bulletRowsInNames = namesBlock.filter(l => /^- /.test(l));
  const bulletRowsInBiz = bizBlock.filter(l => /^- /.test(l));
  assert('namesBlock has no `- ` bullet data rows', bulletRowsInNames.length === 0,
    `found bulleted: ${JSON.stringify(bulletRowsInNames)}`);
  assert('bizBlock has no `- ` bullet data rows', bulletRowsInBiz.length === 0,
    `found bulleted: ${JSON.stringify(bulletRowsInBiz)}`);

  // Separators in both blocks are 60-hyphens, not `===`
  assert('namesBlock contains 60-hyphen separator', namesBlock.includes(helper.SEPARATOR));
  assert('namesBlock has NO `===` separators', !namesBlock.some(l => helper.FORBIDDEN_SEPARATOR_REGEX.test(l)));
  assert('bizBlock contains 60-hyphen separator', bizBlock.includes(helper.SEPARATOR));
  assert('bizBlock has NO `===` separators', !bizBlock.some(l => helper.FORBIDDEN_SEPARATOR_REGEX.test(l)));
}

// ────────────────────────────────────────────────────────────────────────────
// Test 8: assertNoForbiddenSeparator pre-write guard
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 8: assertNoForbiddenSeparator throws on `===`');
{
  // Clean blocks — should not throw
  let cleanThrew = false;
  try {
    helper.assertNoForbiddenSeparator([
      [helper.SEPARATOR, '', 'NAMES INDEX', helper.SEPARATOR, '', 'POP-00001 | Name | Role'],
    ]);
  } catch (e) { cleanThrew = true; }
  assert('does NOT throw on clean 60-hyphen output', !cleanThrew);

  // Contaminated block — should throw
  let contaminatedThrew = false;
  try {
    helper.assertNoForbiddenSeparator([
      ['============================================================', '', 'NAMES INDEX'],
    ]);
  } catch (e) { contaminatedThrew = true; }
  assert('throws on `===` separator', contaminatedThrew);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 9: preflightContractB fail-loud diagnostics
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 9: preflightContractB fail-loud diagnostics');
{
  // Case (i): CUL had BIZ- mention but biz extraction returned 0
  const bizMentionNoBiz = {
    citizens: [{ fullName: 'A', popId: 'POP-00001', role: 'x' }],
    businesses: [],
    faithOrgs: [],
    meta: { unclassifiedNewCanon: [], newCanonSubsectionSeen: false, bizMentionSeenInCul: true },
  };
  const d1 = helper.preflightContractB(bizMentionNoBiz);
  assert('BIZ-mention without biz extraction → violation',
    d1.some(s => s.startsWith('Contract B violation') && s.includes('BIZ-')),
    `got: ${JSON.stringify(d1)}`);

  // Case (ii): standalone (NEW CANON THIS CYCLE) but zero of any kind
  const subsectionEmpty = {
    citizens: [],
    businesses: [],
    faithOrgs: [],
    meta: { unclassifiedNewCanon: [], newCanonSubsectionSeen: true, bizMentionSeenInCul: false },
  };
  const d2 = helper.preflightContractB(subsectionEmpty);
  assert('standalone NEW-CANON with zero classification → violation',
    d2.some(s => s.startsWith('Contract B violation') && s.includes('(NEW CANON THIS CYCLE)')),
    `got: ${JSON.stringify(d2)}`);

  // Case (iii): unclassified row → warning (not fatal)
  const unclassified = {
    citizens: [{ fullName: 'A', popId: 'POP-00001', role: 'x' }],
    businesses: [],
    faithOrgs: [],
    meta: {
      unclassifiedNewCanon: [{ line: '- Mystery Thing — some bare description', name: 'Mystery Thing' }],
      newCanonSubsectionSeen: true, bizMentionSeenInCul: false,
    },
  };
  const d3 = helper.preflightContractB(unclassified);
  assert('unclassified NEW-CANON row → warning (not violation)',
    d3.some(s => s.startsWith('Contract B warning')),
    `got: ${JSON.stringify(d3)}`);

  // Case (iv): clean — no diagnostics
  const clean = {
    citizens: [{ fullName: 'A', popId: 'POP-00001', role: 'x' }],
    businesses: [{ name: 'B', sector: 'bar', neighborhood: 'X' }],
    faithOrgs: [],
    meta: { unclassifiedNewCanon: [], newCanonSubsectionSeen: true, bizMentionSeenInCul: true },
  };
  const d4 = helper.preflightContractB(clean);
  assert('clean parse → zero diagnostics', d4.length === 0,
    `got: ${JSON.stringify(d4)}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 10: end-to-end --print on C94 fixture — full pipeline verification
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 10: end-to-end on C94 published fixture (full pipeline)');
{
  const editionPath = path.resolve(__dirname, '..', 'editions', 'cycle_pulse_edition_94.txt');
  if (!fs.existsSync(editionPath)) {
    console.log('  skip — editions/cycle_pulse_edition_94.txt not present');
  } else {
    const text = fs.readFileSync(editionPath, 'utf8');
    const lines = text.split('\n');
    const culRange = helper.findSectionRange(lines, 'CITIZEN USAGE LOG',
      helper.FOOTER_HEADERS.filter(h => h !== 'CITIZEN USAGE LOG'));
    assert('C94 CUL section located', culRange !== null);
    if (culRange) {
      const culLines = lines.slice(culRange.startBody, culRange.end);
      const parsed = helper.parseCitizenUsageLog(culLines);

      // G-P37 root-cause assertions
      assert('C94 extracts Dario\'s Bar as biz (was 0 pre-S229)',
        parsed.businesses.some(b => b.name === "Dario's Bar"),
        `got businesses: ${JSON.stringify(parsed.businesses.map(b => b.name))}`);
      assert('C94 extracts Adams Point UMC as faith (was misclassified pre-S229)',
        parsed.faithOrgs.some(f => f.name === 'Adams Point United Methodist Church'),
        `got faithOrgs: ${JSON.stringify(parsed.faithOrgs.map(f => f.name))}`);

      // Preflight passes (no fatal diagnostics)
      const diagnostics = helper.preflightContractB(parsed);
      const fatal = diagnostics.filter(d => d.startsWith('Contract B violation'));
      assert('C94 preflight clean (no Contract B violations)', fatal.length === 0,
        `got: ${JSON.stringify(fatal)}`);

      // Emit blocks have correct shape
      const namesBlock = helper.emitNamesIndex(parsed);
      const bizBlock = helper.emitBusinessesNamed(parsed);
      let assertThrew = false;
      try {
        helper.assertNoForbiddenSeparator([namesBlock, bizBlock]);
      } catch (e) { assertThrew = true; }
      assert('C94 emit blocks pass forbidden-separator assertion', !assertThrew);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
if (failed === 0) {
  console.log(`✓ all ${passed} assertions passed`);
  process.exit(0);
} else {
  console.error(`✗ ${failed}/${passed + failed} assertion(s) failed`);
  process.exit(1);
}
