/**
 * draftContentRows.test.js — engine.49 T2: validator parity with the live loader.
 *
 * The contract: a candidate row is written ONLY if loadEventContentLedger_
 * would load it. Parity is asserted by feeding the SAME fixture rows to the
 * real loader (mock ctx) and to loaderAccepts, and diffing verdicts. Also
 * covers stub determinism and the auth:auto provenance tag.
 *
 * Run: node scripts/draftContentRows.test.js   (offline — no sheets, no LLM)
 */

const fs = require('fs');
const path = require('path');
global.Logger = { log() {} };

const d = require('./draftContentRows.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'loadEventContentLedger.js'), 'utf8');
eval(src);

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.error('  FAIL ' + name); }
}

// ── Parity fixtures: [candidate, shouldLoad] ────────────────────────────────
const FIXTURES = [
  [{ kind: 'line', poolKey: 'econ.pool', slot: '', text: 'ran the numbers again', weight: 1, conditions: 'wealth<=3', tags: 'source:economy,auth:auto', grain: '' }, true],
  [{ kind: 'line', poolKey: 'x.pool', slot: '', text: 'typo source line', weight: 1, conditions: '', tags: 'source:econmy', grain: '' }, false],
  [{ kind: 'line', poolKey: '', slot: '', text: 'line without pool', weight: 1, conditions: '', tags: 'source:qol', grain: '' }, false],
  [{ kind: 'fragment', poolKey: '', slot: 'MOOD', text: 'let the fog set the pace', weight: 1, conditions: '', tags: 'auth:auto', grain: '' }, true],
  [{ kind: 'fragment', poolKey: '', slot: '', text: 'fragment without slot', weight: 1, conditions: '', tags: '', grain: '' }, false],
  [{ kind: 'line', poolKey: 'y.pool', slot: '', text: 'bad DSL field', weight: 1, conditions: 'vibes>=3', tags: 'source:qol', grain: '' }, false],
  [{ kind: 'line', poolKey: 'y.pool', slot: '', text: 'flag with operator', weight: 1, conditions: 'married>=1', tags: 'source:qol', grain: '' }, false],
  [{ kind: 'line', poolKey: 'y.pool', slot: '', text: 'displacement gate', weight: 1, conditions: 'hood=West Oakland; displacement>=6', tags: 'source:nbhdState,state:community,auth:auto', grain: '' }, true],
  [{ kind: 'banner', poolKey: 'y.pool', slot: '', text: 'unknown kind', weight: 1, conditions: '', tags: 'source:qol', grain: '' }, false],
  [{ kind: 'line', poolKey: 'y.pool', slot: '', text: '', weight: 1, conditions: '', tags: 'source:qol', grain: '' }, false]
];

// 1. loaderAccepts verdict matches expectation on every fixture
for (const [c, expected] of FIXTURES) {
  check(`loaderAccepts ${expected ? 'accepts' : 'rejects'}: ${(c.text || '(empty text)').slice(0, 30)}`,
    d.loaderAccepts(c, 'no') === expected);
}

// 2. Parity by execution — the accepted set, fed to the REAL loader in one
// batch, loads exactly the accepted count with zero skips.
{
  const accepted = FIXTURES.filter(([c]) => d.loaderAccepts(c, 'no')).map(([c]) => c);
  const rows = [d.HDR].concat(accepted.map(c =>
    [c.kind, c.poolKey, c.slot, c.text, c.weight, c.conditions, c.tags, c.grain, 'yes']));
  const ctx = {
    summary: {},
    ss: { getSheetByName: n => n !== 'Event_Content_Ledger' ? null : ({
      getLastRow: () => rows.length,
      getDataRange: () => ({ getValues: () => rows } )
    }) }
  };
  loadEventContentLedger_(ctx);
  const L = ctx.summary.contentLedger;
  check('batch parity: loader loads all accepted rows', (L.lineCount + L.fragmentCount) === accepted.length);
  check('batch parity: loader skips none of the accepted rows', L.skipped === 0);
}

// 3. Stub determinism — same facts, same rows, twice
{
  const facts = {
    cycle: 117, weather: 'Overcast', holiday: '',
    seeds: [
      { desk: 'sports', cls: 'major', domain: 'SPORTS', hood: 'Fruitvale', what: 'x', why: 'y', citizens: 'POP-1', magnitude: 0.28 },
      { desk: 'culture', cls: 'major', domain: 'COMMUNITY', hood: 'West Oakland', what: 'x', why: 'y', citizens: 'POP-2', magnitude: 8 }
    ],
    hoods: [{ name: 'West Oakland', displacement: 8, gentriPhase: 'accelerating' }, { name: 'Rockridge', displacement: 0, gentriPhase: '' }]
  };
  const a = d.draftStub(facts), b = d.draftStub(facts);
  check('stub deterministic', JSON.stringify(a) === JSON.stringify(b));
  check('stub drafts from pressure + seeds + weather', a.length >= 3);
  check('stub gates the pressure line to the pressured hood',
    a.some(c => c.conditions.indexOf('hood=West Oakland') === 0 && c.conditions.indexOf('displacement>=6') > 0));
  check('every stub row passes the loader', a.every(c => d.loaderAccepts({ ...c, tags: d.ensureAutoTag(c.tags) }, 'no') || c.kind === 'fragment' ? d.loaderAccepts({ ...c, tags: d.ensureAutoTag(c.tags) }, 'no') : false));
}

// 4. auth:auto provenance
{
  check('auth:auto appended', d.ensureAutoTag('source:qol') === 'source:qol,auth:auto');
  check('auth:auto not duplicated', d.ensureAutoTag('source:qol,auth:auto') === 'source:qol,auth:auto');
  check('auth:auto on empty tags', d.ensureAutoTag('') === 'auth:auto');
}


// 5. Dead hood gate rejected, real hood passes
{
  const hoods = new Set(['West Oakland', 'Fruitvale']);
  check('dead hood gate (district) rejected', d.hoodGateValid('hood=D7', hoods) === false);
  check('real hood gate passes', d.hoodGateValid('hood=West Oakland; displacement>=6', hoods) === true);
  check('no hood gate passes', d.hoodGateValid('wealth<=3', hoods) === true);
}

// 6. T4 auto-active: default Active=yes, --active no still overrides
{
  const base = ['node', 'draftContentRows.js', '--cycle', '118', '--sheet-id', 'test-sheet'];
  check('default active=yes (T4)', d.parseArgs(base).active === 'yes');
  check('--active no override holds', d.parseArgs(base.concat(['--active', 'no'])).active === 'no');
  check('default is still dry-run', d.parseArgs(base).apply === false);
}

// 7. Optional target confirmation preserves the legacy post-cycle invocation
{
  const prior = process.env.GODWORLD_SHEET_ID;
  process.env.GODWORLD_SHEET_ID = 'env-production-like-id';
  const inherited = ['node', 'draftContentRows.js', '--cycle', '118', '--apply'];
  const explicit = ['node', 'draftContentRows.js', '--cycle', '118', '--apply',
    '--sheet-id', 'sandbox-id'];
  const legacy = d.parseArgs(inherited);
  const unconfirmed = d.parseArgs(explicit);
  let mismatchRejected = false;
  try {
    d.parseArgs(explicit.concat(['--confirm-sheet-id', 'other-id']));
  } catch (_) { mismatchRejected = true; }
  const confirmed = d.parseArgs(explicit.concat(['--confirm-sheet-id', 'sandbox-id']));
  check('legacy environment-target apply remains compatible',
    legacy.apply && legacy.sheetId === 'env-production-like-id');
  check('explicit unconfirmed apply remains compatible',
    unconfirmed.apply && unconfirmed.sheetId === 'sandbox-id');
  check('mismatched optional confirmation is rejected', mismatchRejected);
  check('apply accepts matching explicit + confirmed sheet id',
    confirmed.apply && confirmed.sheetIdExplicit && confirmed.confirmSheetId === confirmed.sheetId);
  if (prior === undefined) delete process.env.GODWORLD_SHEET_ID;
  else process.env.GODWORLD_SHEET_ID = prior;
}

// 8. Auto-author quality gate rejects summary prose, not lived action
{
  const flat = [
    'the city buzzes with energy after the game',
    'the project is bringing new life to the neighborhood',
    'the initiative is making waves across town',
    'the plan is sparking excitement on the block',
    'residents talked about a brighter future',
    'the opening brought a sense of pride and anticipation',
    'Laurel feels alive after the win',
    'Downtown is thriving',
    'Fruitvale is on the rise',
    'neighbors feel more connected than ever',
    'new faces joined the vibrant mix'
  ];
  for (const text of flat) {
    check(`quality rejects flat summary: ${text.slice(0, 28)}`,
      !!d.qualityIssue({ kind: 'line', text }));
  }
  check('quality rejects terminal punctuation',
    !!d.qualityIssue({ kind: 'line', text: 'waited for the late bus.' }));
  check('quality accepts concrete lived-action clause',
    d.qualityIssue({ kind: 'line', text: 'waited through two late buses before walking home' }) === '');
  check('quality leaves fragments to slot validation',
    d.qualityIssue({ kind: 'fragment', text: 'with rain caught in their sleeves.' }) === '');
}

// 9. Batch slot integrity: entity slots are code-side; content slots need data
{
  const existing = new Set(['MOOD']);
  const batch = new Set(['SENSORY']);
  check('existing content slot passes',
    d.slotDependencyIssue({ kind: 'line', text: 'paused at $VENUE and $MOOD' }, existing, batch) === '');
  check('same-batch fragment slot passes',
    d.slotDependencyIssue({ kind: 'line', text: 'noticed $SENSORY on the walk' }, existing, batch) === '');
  check('entity slots pass without ledger fragments',
    d.slotDependencyIssue({ kind: 'line', text: 'met $CONTACT outside $INSTITUTION' }, existing, batch) === '');
  check('unfillable content slot is rejected',
    d.slotDependencyIssue({ kind: 'line', text: 'stared into $VOID' }, existing, batch).includes('VOID'));
}

// 10. Telemetry profile is deterministic and separates authoring from routing
{
  const existing = [
    d.HDR,
    ['line', 'thin.pool', '', 'one', 1, '', 'source:qol', '', 'yes'],
    ['line', 'dead.pool', '', 'two', 1, '', 'source:qol', '', 'yes'],
    ['fragment', '', 'MOOD', 'steady', 1, '', '', '', 'yes']
  ];
  const telemetry = [
    ['Cycle', 'LineCount', 'FragmentCount', 'Skipped', 'ContentHash', 'EligibleJSON', 'DrawsJSON', 'ComposeNullJSON'],
    [108, 2, 1, 0, 'abc', JSON.stringify({ 'dead.pool#two': 10, 'thin.pool#one': 10 }),
      JSON.stringify({ 'thin.pool#one': 2 }), '{}']
  ];
  const a = d.buildLedgerProfile(existing, telemetry);
  const b = d.buildLedgerProfile(existing, telemetry);
  check('ledger profile deterministic', JSON.stringify(a) === JSON.stringify(b));
  check('ledger profile finds thin pools', a.thinPools.includes('thin.pool'));
  check('ledger profile finds fragment slots', a.fragmentSlots.MOOD === 1);
  check('ledger profile marks eligible zero-draw pool', a.persistentNoDrawPools.includes('dead.pool'));
  check('ledger profile records telemetry cycles', a.telemetryCycles[0] === 108);
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
