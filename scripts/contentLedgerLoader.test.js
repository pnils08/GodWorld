/**
 * contentLedgerLoader.test.js — engine.38 Design A loader (seams Task 10, S289).
 * Drives loadEventContentLedger_ with a mock ctx and proves the fail-closed
 * row rules from the plan's §Pool injection + S289 critique:
 *   - missing tab / empty tab -> S.contentLedger empty, no throw
 *   - valid line + fragment rows load into lines[poolKey] / fragments[slot]
 *   - unknown source: first tag on a line -> skipped + counted
 *   - unknown DSL field / bad enum / flag-with-operator -> skipped + counted
 *   - Active=no -> dropped silently (NOT counted — kill switch, not error)
 *   - blank spacer rows ignored silently
 *   - weight default 1 on blank/garbage
 *   - conditions compile ONCE at load into term objects
 *
 * Run: node scripts/contentLedgerLoader.test.js
 */

const fs = require('fs');
const path = require('path');

global.Logger = { log() {} }; // Apps Script Logger shim (loader logs skipped counts)

// Load the ES5 engine file into this scope.
const src = fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'loadEventContentLedger.js'), 'utf8');
eval(src);

function mockCtx(rows) {
  return {
    summary: {},
    ss: {
      getSheetByName(name) {
        if (rows === null) return null; // missing tab
        if (name !== 'Event_Content_Ledger') return null;
        return { getDataRange: () => ({ getValues: () => rows }) };
      }
    }
  };
}

const HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

// 1. missing tab -> empty, no throw
{
  const ctx = mockCtx(null);
  loadEventContentLedger_(ctx);
  const L = ctx.summary.contentLedger;
  check('missing tab: empty ledger, skipped=0', L && Object.keys(L.lines).length === 0 && Object.keys(L.fragments).length === 0 && L.skipped === 0);
}

// 2. header-only tab -> empty
{
  const ctx = mockCtx([HDR]);
  loadEventContentLedger_(ctx);
  check('header-only tab: empty ledger', Object.keys(ctx.summary.contentLedger.lines).length === 0);
}

// 3. valid line + fragment load
{
  const ctx = mockCtx([
    HDR,
    ['line', 'baseDaily.family', '', 'spent the evening at $PLACE with the kids', '1.2', 'children>0', 'source:homeLife,family:kids', '', ''],
    ['fragment', '', 'PLACE', 'the kitchen table', '', '', '', '', ''],
    ['fragment', '', 'PLACE', 'the corner park', '2', 'hood=Temescal', '', '', '']
  ]);
  loadEventContentLedger_(ctx);
  const L = ctx.summary.contentLedger;
  const line = (L.lines['baseDaily.family'] || [])[0];
  check('line loads under poolKey', !!line && line.text.indexOf('$PLACE') >= 0);
  check('line weight parsed', line && line.weight === 1.2);
  check('line conditions compiled once (term objects)', line && line.conditions.length === 1 && line.conditions[0].f === 'children' && line.conditions[0].op === '>' && line.conditions[0].v === 0);
  check('fragments load under slot', (L.fragments['PLACE'] || []).length === 2);
  check('fragment weight default 1', L.fragments['PLACE'][0].weight === 1);
  check('fragment str condition compiled', L.fragments['PLACE'][1].conditions[0].f === 'hood' && L.fragments['PLACE'][1].conditions[0].v === 'Temescal');
  check('counts: 1 line 2 fragments 0 skipped', L.lineCount === 1 && L.fragmentCount === 2 && L.skipped === 0);
}

// 4. fail-closed rows
{
  const ctx = mockCtx([
    HDR,
    ['line', 'x.pool', '', 'unknown source line', '', '', 'source:baylight', '', ''],       // unrecognized source -> skip
    ['line', 'x.pool', '', 'no tags at all', '', '', '', '', ''],                           // no source tag -> skip
    ['line', '', '', 'line without poolKey', '', '', 'source:qol', '', ''],                 // no poolKey -> skip
    ['fragment', '', '', 'fragment without slot', '', '', '', '', ''],                      // no slot -> skip
    ['banner', 'x.pool', '', 'bad kind', '', '', 'source:qol', '', ''],                     // bad kind -> skip
    ['line', 'x.pool', '', '', '', '', 'source:qol', '', ''],                               // empty text -> skip
    ['line', 'x.pool', '', 'bad field', '', 'karma>=2', 'source:qol', '', ''],              // unknown DSL field -> skip
    ['line', 'x.pool', '', 'bad enum', '', 'ageband=elder', 'source:qol', '', ''],          // elder not in enum -> skip
    ['line', 'x.pool', '', 'flag with op', '', 'married>=1', 'source:qol', '', ''],         // flag takes no operator -> skip
    ['line', 'x.pool', '', 'num garbage', '', 'wealth<=rich', 'source:qol', '', ''],        // non-numeric num -> skip
    ['line', 'x.pool', '', 'enum bad op', '', 'ageband>=senior', 'source:qol', '', '']      // enum takes only =/!= -> skip
  ]);
  loadEventContentLedger_(ctx);
  const L = ctx.summary.contentLedger;
  check('all 11 malformed rows skipped + counted', L.skipped === 11);
  check('nothing loaded from malformed rows', Object.keys(L.lines).length === 0 && Object.keys(L.fragments).length === 0);
}

// 5. kill switch + spacers
{
  const ctx = mockCtx([
    HDR,
    ['line', 'x.pool', '', 'killed row', '', '', 'source:qol', '', 'no'],
    ['', '', '', '', '', '', '', '', ''],                                                    // spacer
    ['line', 'x.pool', '', 'live row', '', '', 'source:qol', 'heard', 'yes']
  ]);
  loadEventContentLedger_(ctx);
  const L = ctx.summary.contentLedger;
  check('Active=no dropped, not counted as skipped', L.skipped === 0 && (L.lines['x.pool'] || []).length === 1);
  check('grain lowercased through', L.lines['x.pool'][0].grain === 'heard');
}

// 6. multi-term AND + flags
{
  const ctx = mockCtx([
    HDR,
    ['line', 'y.pool', '', 'complex gates', '', 'wealth<=3; married; season=summer', 'source:qol', '', '']
  ]);
  loadEventContentLedger_(ctx);
  const c = ctx.summary.contentLedger.lines['y.pool'][0].conditions;
  check('3 AND terms compiled', c.length === 3 && c[0].op === '<=' && c[1].op === 'flag' && c[2].f === 'season');
}


// 7. S298 whitelist extension — deliberate Daily-fold sources load; typo still rejected
{
  const ctx = mockCtx([
    HDR,
    ['line', 'econ.pool', '', 'ran the numbers again', '', 'wealth<=3', 'source:economy', '', ''],
    ['line', 'chaos.pool', '', 'checked the gutters at dawn', '', '', 'source:chaos', '', ''],
    ['line', 'x.pool', '', 'typo source', '', '', 'source:econmy', '', '']
  ]);
  loadEventContentLedger_(ctx);
  const L = ctx.summary.contentLedger;
  check('economy line loads (S298)', (L.lines['econ.pool'] || []).length === 1);
  check('chaos line loads (S298)', (L.lines['chaos.pool'] || []).length === 1);
  check('typo source still fails closed', L.skipped === 1 && !L.lines['x.pool']);
}


// 8. engine.67 step 5 (S325) — life-state vocabulary: lifestate/band/occupation/tier/heritage
{
  const ctx = mockCtx([
    HDR,
    ['line', 'work.pool', '', 'a shift moment for the working', '', 'lifestate=working; occupation=Line cook', 'source:occupation', '', ''],
    ['line', 'kid.pool', '', 'a recess victory', '', 'band=child', 'source:age', '', ''],
    ['line', 'her.pool', '', 'the family name opens a door', '', 'heritage!=none; tier<=2', 'source:familyLife', '', ''],
    ['line', 'bad1.pool', '', 'bad lifestate value', '', 'lifestate=goofing', 'source:age', '', ''],
    ['line', 'bad2.pool', '', 'bad band value', '', 'band=toddler', 'source:age', '', '']
  ]);
  loadEventContentLedger_(ctx);
  const L = ctx.summary.contentLedger;
  check('lifestate+occupation line loads', (L.lines['work.pool'] || []).length === 1);
  check('band=child line loads', (L.lines['kid.pool'] || []).length === 1);
  check('heritage+tier line loads', (L.lines['her.pool'] || []).length === 1);
  check('unknown lifestate value fails closed', !L.lines['bad1.pool']);
  check('unknown band value fails closed', !L.lines['bad2.pool']);
  check('bad rows counted as skipped', L.skipped === 2);
}

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
