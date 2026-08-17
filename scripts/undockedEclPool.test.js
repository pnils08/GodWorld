'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const P = require('./undockedEclPool');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const v = P.validateRows(P.ROWS);
check('rows valid', v.valid, v.errors && v.errors.join('; '));
check('pilot rows first', P.PILOT_ROWS.length >= 6 && P.ROWS[0].PoolKey === P.POOL_PILOT);
check('show pool present', P.SHOW_ROWS.length >= 12);
check('has love split', P.ROWS.some(function (r) { return /warmth>=60/.test(r.Conditions); }));
check('has sting split', P.ROWS.some(function (r) { return /warmth<=39/.test(r.Conditions); }));
check('has lottery fame=0', P.ROWS.some(function (r) { return /fame=0/.test(r.Conditions); }));
check('no mechanism words', P.ROWS.every(function (r) { return !/\btier\b|FameScore|UsageCount/.test(r.Text); }));

P.ROWS.forEach(function (r, i) {
  check('row ' + i + ' source:undocked first', P.firstTag(r.Tags) === 'source:undocked');
  check('row ' + i + ' comma tags', r.Tags.indexOf(';') < 0);
  check('row ' + i + ' no $SLOT', r.Text.indexOf('$') === -1);
});

const loader = fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'loadEventContentLedger.js'), 'utf8');
check('live DSL has undocked flag', /undocked:\s*\{\s*kind:\s*'flag'/.test(loader));
check('live DSL has undockedpilot', /undockedpilot:\s*\{\s*kind:\s*'flag'/.test(loader));
check('live whitelist has source:undocked', /'source:undocked'/.test(loader));

const box = { Logger: { log: function () {} } };
vm.createContext(box);
vm.runInContext(loader, box);
check('bare undocked parses', Array.isArray(box.parseContentConditions_('undocked')) && box.parseContentConditions_('undocked').length === 1);
check('bare undockedpilot parses', Array.isArray(box.parseContentConditions_('undockedpilot')));
check('undocked=1 fail-closed (flag, no op)', box.parseContentConditions_('undocked=1') === null);
check('undocked;warmth>=60 parses', Array.isArray(box.parseContentConditions_('undocked;warmth>=60')));
check('first tag whitelisted', !!box.CONTENT_LEDGER_SOURCE_WHITELIST['source:undocked']);

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('undockedEclPool: ok');
