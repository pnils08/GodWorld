#!/usr/bin/env node
'use strict';
const { ownPieces, formatPieces } = require('./reporterOwnPieces');

let pass = 0, fail = 0;
function assert(name, ok, info) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (info ? ' — ' + info : '')); }
}

const row = (o) => Object.assign({ bylinePopid: 'POP-1', bylineName: 'Reporter One', published: true, canon: true,
  copies: [{ path: 'p/' + o.title }], citizens: [{ name: 'Reporter One' }] }, o);
const rows = [
  row({ title: 'Old essay', cycle: null, era: 'pre-cycle' }),
  row({ title: 'Keane farewell', cycle: 80, citizens: [{ name: 'Reporter One' }, { name: 'Vinnie Keane' }] }),
  row({ title: 'Newest', cycle: 101 }),
  row({ title: 'Middle', cycle: '92' }),
  row({ title: 'Draft', cycle: 110, published: false }),
  row({ title: 'Not canon', cycle: 111, canon: false }),
  row({ title: 'Someone else', cycle: 115, bylinePopid: 'POP-2' })
];

const all = ownPieces('POP-1', { rows });
assert('only this byline, published canon', all.length === 4, all.map(p => p.title).join(','));
assert('newest Cycle first, pre-cycle last', all.map(p => p.title).join(',') === 'Newest,Middle,Keane farewell,Old essay', all.map(p => p.title).join(','));
assert('string Cycle read as a number', all[1].cycle === 92);
assert('the reporter is not listed among the named', all[2].citizens.join() === 'Vinnie Keane');
const named = ownPieces('POP-1', { rows, names: ['keane'] });
assert('names keep pieces naming them (case-blind)', named.length === 1 && named[0].title === 'Keane farewell');
assert('limit', ownPieces('POP-1', { rows, limit: 2 }).length === 2);
assert('format line carries the Cycle or era', /^C101 — Newest/.test(formatPieces(all)) && /pre-cycle — Old essay/.test(formatPieces(all)));

const hal = ownPieces('POP-00007');
assert('live index: Hal has printed pieces', hal.length > 0, String(hal.length));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
