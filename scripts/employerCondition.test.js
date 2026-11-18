/**
 * employerCondition.test.js — engine.350: a content row can be aimed at the people who work at a named
 * business (`employer=BIZ-…`, alternatives joined with |), and a coming-of-age line is not a graduation.
 * Builder 2026-11-18 on both: "Which ever it logical to how life works".
 *
 * Run: node scripts/employerCondition.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// ── the loader takes the field ───────────────────────────────────────────────
global.Logger = { log() {} };
eval(R('phase02-world-state/loadEventContentLedger.js'));
ok(CONTENT_LEDGER_DSL_FIELDS.employer && CONTENT_LEDGER_DSL_FIELDS.employer.kind === 'str', 'employer is a condition field');
let terms = parseContentConditions_('lifestate=working; employer=BIZ-00001|BIZ-00002|BIZ-00003|BIZ-00004');
ok(terms && terms.length === 2 && terms[1].f === 'employer' && terms[1].op === '=' && terms[1].v === 'BIZ-00001|BIZ-00002|BIZ-00003|BIZ-00004', 'the cell parses: ' + JSON.stringify(terms));
ok(parseContentConditions_('employer>=BIZ-00001') === null, 'an employer term takes only = and !=');
ok(parseContentConditions_('employr=BIZ-00001') === null, 'an unknown field still fails the row');

// ── the generator's own evaluator (cut out by text: if the block moves, this fails loudly) ─────
const gce = R('phase05-citizens/generateCitizensEvents.js');
const a = gce.indexOf('  function evalContentConditions_(terms, scopes) {'), b = gce.indexOf('  // Injection-time guarantee:');
ok(a > 0 && b > a, 'evaluator found');
const evalC = eval('(function(){' + gce.slice(a, b) + '; return evalContentConditions_; })()');
const at = (biz, life) => ({ employer: biz, lifestate: life || 'working', wealth: 9, hood: 'Rockridge' });
ok(evalC(terms, at('BIZ-00001')) === true, 'works at the first office: draws');
ok(evalC(terms, at('BIZ-00004')) === true, 'works at the last office: draws');
ok(evalC(terms, at('biz-00003')) === true, 'the id is matched without regard to case');
ok(evalC(terms, at('BIZ-00005')) === false, 'works next door: does not draw');
ok(evalC(terms, at('BIZ-000010')) === false, 'an id is matched whole, never as a prefix');
ok(evalC(terms, at('')) === false, 'no employer on the row: does not draw, however wealthy');
ok(evalC(terms, at('BIZ-00001', 'retired')) === false, 'retired from there: does not draw');
ok(evalC(parseContentConditions_('employer!=BIZ-00001|BIZ-00002'), at('BIZ-00002')) === false && evalC(parseContentConditions_('employer!=BIZ-00001|BIZ-00002'), at('BIZ-00009')) === true, '!= means none of them');
// the | list is for every str field, and a plain value reads as before
ok(evalC(parseContentConditions_('hood=Temescal|Rockridge'), at('BIZ-00001')) === true && evalC(parseContentConditions_('hood=Temescal'), at('BIZ-00001')) === false, 'a str value may list alternatives');
ok(evalC(parseContentConditions_('wealth>=7'), at('')) === true, 'the old cell (wealth>=7) drew for anyone wealthy — the case this replaces');
// the scope carries the ledger's own column
ok(gce.indexOf('var iEmployerBizCond = idx("EmployerBizId");') > 0 && gce.indexOf('employer: (iEmployerBizCond >= 0 ? String(row[iEmployerBizCond] || "").trim() : ""),') > 0, 'the scope reads EmployerBizId off the citizen row');

// ── a coming-of-age line is not a graduation ─────────────────────────────────
const gen = R('phase04-events/generationalEventsEngine.js');
const ga = gen.indexOf('var COMING_OF_AGE_NOT_GRADUATION_ = ['), gb = gen.indexOf('function checkGraduation_(');
ok(ga > 0 && gb > ga, 'graduation guard found');
const G = eval('(function(){' + gen.slice(ga, gb) + '; return { list: COMING_OF_AGE_NOT_GRADUATION_, hasGraduated_: hasGraduated_ }; })()');
const Y = new Function(R('phase05-citizens/runYouthEngine.js') + '\nreturn { YOUTH_TEXTURE_POOLS, YOUTH_DIAL_TAG };')();
const coa = [].concat(Y.YOUTH_TEXTURE_POOLS.teen.coming_of_age, Y.YOUTH_TEXTURE_POOLS.college.coming_of_age);
ok(coa.length === 7 && G.list.length === 7 && coa.every((t) => G.list.indexOf(t) >= 0), 'the list is the youth engine\'s coming-of-age lines, all seven');
ok(Y.YOUTH_DIAL_TAG.coming_of_age === 'Personal', 'and the youth engine no longer writes them as [Graduation]');
ok(G.hasGraduated_('Y3C2 — [Graduation] picked up the first paycheck and stood in the bank line like an adult') === false, 'a first paycheck is not a commencement');
ok(G.hasGraduated_('Y2C40 — [Daily] x\nY3C2 — [Graduation] got the acceptance email at lunch and let the table read it first\nY3C5 — [Graduation] came home for the weekend and noticed the house felt smaller') === false, 'two such lines still leave the real one open');
ok(G.hasGraduated_('Y3C2 — [Graduation] walked across the stage at their commencement ceremony') === true, 'a commencement is');
ok(G.hasGraduated_('Y3C2 — [Graduation] sat for the senior portrait and did not recognize the adult in it\nY3C30 — [Graduation] completed their university studies') === true, 'the real one after a texture line counts');
ok(G.hasGraduated_('Y3C2 — [Graduation] some sentence nobody listed') === true, 'any other [Graduation] line counts, as before');
ok(G.hasGraduated_('') === false && G.hasGraduated_(null) === false && G.hasGraduated_('Y3C2 — [Personal-Drive-Up-S] picked up the first paycheck and stood in the bank line like an adult') === false, 'no line, no graduation');
ok(gen.indexOf('  if (hasGraduated_(lifeHistory)) return null;') > 0 && gen.indexOf('if (lifeHistory.indexOf("[Graduation]") >= 0) return null;') < 0, 'checkGraduation_ uses the guard');

console.log('employerCondition.test.js: ' + n + ' assertions passed');
