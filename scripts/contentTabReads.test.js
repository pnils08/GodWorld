/**
 * contentTabReads.test.js — engine.350 Task 7: the content tab's rows read by what they say.
 * The lists are well formed; the plan against a tab is exact (one Active or Tags cell a row, nothing else
 * touched, a second run finds nothing to do); the tab's own loader and the generator's own sign rule take
 * every signed row; a switched-off row is not loaded.
 * Run: node scripts/contentTabReads.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const P = require('./contentTabReads');
const M = require('../utilities/citizenDialMap.js');
let n = 0;
function ok(cond, msg) { assert.ok(cond, msg); n++; }

const v = P.validate();
ok(v.valid, v.errors.join('; '));
ok(P.RETIRE.length === 72 && P.RESIGN.length === 11 && P.SIGN.length === 27, 'list sizes ' + [P.RETIRE.length, P.RESIGN.length, P.SIGN.length].join(' / '));
ok(P.RETIRE.some(function (e) { return e[1] === 'a flyer for a seniors lunch program flutters on a community bulletin board'; }), 'the flyer row is switched off');
// a scene has no citizen in it: no line in RETIRE starts with a past-tense verb the way a life line does
ok(P.RETIRE.every(function (e) { return /^(a|an|the|someone|late-night|paper|workers|laurel|downtown|fruitvale|west oakland)\b/i.test(e[1]); }), 'every switched-off row opens on a thing or a place, not on what the citizen did: ' +
  JSON.stringify(P.RETIRE.filter(function (e) { return !/^(a|an|the|someone|late-night|paper|workers|laurel|downtown|fruitvale|west oakland)\b/i.test(e[1]); }).map(function (e) { return e[1]; })));
ok(P.SIGN.concat(P.RESIGN).every(function (e) { return !/^(a|an|the|someone)\b/i.test(e[1]); }), 'every signed row opens on what the citizen did');

// a synthetic tab: each listed row as it stands today, plus a bystander
const HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];
const SRC = { econ: 'source:economy', evening: 'source:prevEvening', retirement: 'source:retirement' };
const rows = [HDR];
P.RETIRE.forEach(function (e) { rows.push(['line', e[0], '', e[1], '1', '', 'source:civicNews,auth:auto', '', 'yes']); });
P.RESIGN.forEach(function (e) { rows.push(['line', e[0], '', e[1], '1', '', 'source:neighborhood,auth:x,dial:' + e[2], '', 'yes']); });
P.SIGN.forEach(function (e) { rows.push(['line', e[0], '', e[1], '1', '', (SRC[e[0].split('.')[0]] || 'source:familyLife') + ',auth:x', '', 'yes']); });
rows.push(['line', 'hood.x', '', 'a bystander row nobody listed', '1', '', 'source:neighborhood,dial:outabout:up', '', 'yes']);
const p = P.plan(rows);
ok(p.active.length === 72 && p.tags.length === 38 && p.done === 0 && !p.missing.length && !p.conflicts.length, 'plan ' + JSON.stringify({ a: p.active.length, t: p.tags.length, m: p.missing.length, c: p.conflicts.length }));
const touched = {}; p.active.concat(p.tags).forEach(function (t) { touched[t.row] = (touched[t.row] || 0) + 1; });
ok(Object.keys(touched).length === 110 && Object.keys(touched).every(function (r) { return touched[r] === 1; }) && !touched[rows.length], 'one cell a listed row, the bystander untouched');
ok(p.tags.every(function (t) { return t.to.split(',').filter(function (x) { return /^dial:/.test(x); }).length === 1 && t.to.split(',')[0] === t.from.split(',')[0]; }), 'each Tags cell keeps its source first and ends with exactly one dial tag');
// apply it to the synthetic tab and plan again
p.active.forEach(function (a) { rows[a.row - 1][8] = a.to; }); p.tags.forEach(function (t) { rows[t.row - 1][6] = t.to; });
const again = P.plan(rows);
ok(!again.active.length && !again.tags.length && again.done === 110, 'a second run finds nothing to do');
// a row that drifted is a conflict, never overwritten
const drift = rows.map(function (r) { return r.slice(); }); const iRes = 1 + P.RETIRE.length; drift[iRes][6] = 'source:neighborhood,auth:x,dial:fandom:up';
ok(P.plan(drift).conflicts.length === 1, 'a re-sign row carrying a third sign is a conflict');
const gone = rows.filter(function (r) { return r[3] !== P.SIGN[0][1]; });
ok(P.plan(gone).missing.length === 1, 'a listed row not on the tab is reported');

// the tab's own loader: switched-off rows are not loaded, every other row is
global.Logger = { log() {} };
eval(fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'loadEventContentLedger.js'), 'utf8'));
const ctx = { summary: {}, ss: { getSheetByName(name) { return name === 'Event_Content_Ledger' ? { getDataRange: () => ({ getValues: () => rows }) } : null; } } };
loadEventContentLedger_(ctx);
const CL = ctx.summary.contentLedger;
const loaded = []; Object.keys(CL.lines).forEach(function (k) { CL.lines[k].forEach(function (l) { loaded.push(l.text); }); });
ok(CL.skipped === 0 && loaded.length === 39 && P.RETIRE.every(function (e) { return loaded.indexOf(e[1]) < 0; }), 'the loader takes the 38 signed rows and the bystander, none of the 72: ' + loaded.length + ', skipped ' + CL.skipped);

// the generator's own sign rule and routing write each signed row one step on the listed dial
const gce = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'generateCitizensEvents.js'), 'utf8');
const a = gce.indexOf('  var DIAL_BY_FACT_TAG = {'), b = gce.indexOf('  function normText_(s) {');
const gradedTag_ = M.gradedTag_, nudgesForEvent_ = M.nudgesForEvent_; // read by the block below
const gradedTagFor_ = eval('(function(){' + gce.slice(a, b) + '; return gradedTagFor_; })()');
const KIND = { 'source:economy': 'Daily', 'source:prevEvening': 'PrevEvening', 'source:retirement': 'PostCareer', 'source:neighborhood': 'Neighborhood', 'source:familyLife': 'Daily' };
ok(gce.indexOf('if (has("source:retirement")) return "PostCareer";') > 0 && gce.indexOf('if (has("source:prevEvening")) return "PrevEvening";') > 0 &&
  gce.indexOf('if (has("source:neighborhood")) return "Neighborhood";') > 0 && !/has\("source:economy"\)\) return/.test(gce), 'the sources route as the test assumes (economy falls through to Daily)');
ok(/var GRADED_ONLY_KIND_ = \{[^}]*"PostCareer": true/.test(gce), 'a retiree\'s line is written graded only');
P.SIGN.concat(P.RESIGN.map(function (e) { return [e[0], e[1], e[3]]; })).forEach(function (e) {
  const row = rows.find(function (r) { return r[3] === e[1]; }), tags = row[6].split(','), kind = KIND[tags[0]];
  const m = /^([a-z]+):(up|down)$/.exec(e[2]);
  const tag = gradedTagFor_(kind, tags), fx = M.nudgesForEvent_(tag, 1, e[1]);
  ok(tag === M.gradedTag_(kind, m[1], m[2] === 'up', 'S') && Object.keys(fx).length === 1 && fx[m[1]] === (m[2] === 'up' ? 1 : -1), e[1] + ' -> ' + tag + ' ' + JSON.stringify(fx));
});
console.log('contentTabReads.test.js: ' + n + ' assertions passed');
