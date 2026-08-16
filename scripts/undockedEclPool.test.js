'use strict';

const fs = require('fs');
const path = require('path');
const P = require('./undockedEclPool');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const v = P.validateRows(P.ROWS);
check('rows valid', v.valid, v.errors && v.errors.join('; '));
check('enough rows', P.ROWS.length >= 20);
check('one pool key', P.POOL === 'culture.spacemolt-show');
check('has love split', P.ROWS.some(function (r) { return /warmth>=60/.test(r.Conditions); }));
check('has sting split', P.ROWS.some(function (r) { return /warmth<=39/.test(r.Conditions); }));
check('has lottery fame=0', P.ROWS.some(function (r) { return /fame=0/.test(r.Conditions); }));
check('no mechanism words', P.ROWS.every(function (r) { return !/\btier\b|FameScore|UsageCount/.test(r.Text); }));

const src = fs.readFileSync(path.join(__dirname, 'undockedEclPool.js'), 'utf8');
check('no sheet write', !/appendRows|batchUpdate|spreadsheets/.test(src));
check('no LLM', !/openai|anthropic|chat\.completions/.test(src));

P.ROWS.forEach(function (r, i) {
  check('row ' + i + ' media first', P.firstTag(r.Tags) === 'source:media');
  check('row ' + i + ' no $SLOT', r.Text.indexOf('$') === -1);
});

// Today's loader must reject undocked=1 (unknown field) — fail-closed until es.
const vm = require('vm');
const loaderPath = path.join(__dirname, '..', 'phase02-world-state', 'loadEventContentLedger.js');
const loader = fs.readFileSync(loaderPath, 'utf8');
check('live DSL has no undocked yet', !/undocked:\s*\{/.test(loader));
const box = { Logger: { log: function () {} } };
vm.createContext(box);
vm.runInContext(loader, box);
check('current parseContentConditions_ fail-closes undocked', box.parseContentConditions_('undocked=1') === null);
const working = box.parseContentConditions_('lifestate=working');
check('existing lifestate still parses', Array.isArray(working) && working.length === 1);

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('undockedEclPool: ok');
