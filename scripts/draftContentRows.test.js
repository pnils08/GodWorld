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

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
