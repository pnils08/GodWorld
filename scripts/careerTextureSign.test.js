/**
 * careerTextureSign.test.js — engine.350 Task 7: the career engine's texture lines read by what they say.
 * Every text the texture loop can draw has an entry in CAREER_SIGN_BY_TEXT_ (a dial and a direction, or
 * null = a plain day, not written); a signed line is written as Career-<Dial>-<Up|Down>-S and folds to
 * exactly one step on that dial; no texture line is a bare Career any more.
 *
 * Run: node scripts/careerTextureSign.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('../utilities/citizenDialMap.js');

const file = path.join(__dirname, '..', 'phase05-citizens', 'runCareerEngine.js');
const src = fs.readFileSync(file, 'utf8');
const box = {}; vm.createContext(box); vm.runInContext(src, box);
const SIGN = box.CAREER_SIGN_BY_TEXT_;
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

ok(SIGN && typeof box.careerTextureTag_ === 'function', 'table and tag function at file scope');

// 1. every text the loop can draw is listed
const pooled = [];
Object.keys(box.CAREER_TEXTURE_BY_CHARACTER_).forEach(k => box.CAREER_TEXTURE_BY_CHARACTER_[k].forEach(t => pooled.push(t)));
Object.keys(box.CAREER_TEXTURE_BESPOKE_).forEach(k => box.CAREER_TEXTURE_BESPOKE_[k].forEach(t => pooled.push(t)));
// the in-function pools: every string literal between the base pool and the final concat
const a = src.indexOf('  var baseCareer = ['), b = src.indexOf('  var basePool = [].concat(');
ok(a > 0 && b > a, 'in-function pools found');
const inFn = (src.slice(a, b).match(/"(?:[^"\\]|\\.)*"/g) || []).map(q => JSON.parse(q))
  .filter(t => !/^(Winter|Spring|Summer|Fall|rain|fog|hot|cold|Thanksgiving|Holiday|NewYear|NewYearsEve|Valentine|MothersDay|FathersDay|BackToSchool)$/.test(t));
ok(inFn.length >= 50, 'in-function pool texts read: ' + inFn.length);
inFn.concat(pooled).forEach(t => ok(Object.prototype.hasOwnProperty.call(SIGN, t), 'unlisted texture line: ' + t));
// and nothing listed that no pool holds (a stale entry would hide a renamed line)
const all = new Set(inFn.concat(pooled));
Object.keys(SIGN).forEach(t => ok(all.has(t), 'listed but in no pool: ' + t));

// 2. each entry is one dial one way, or plain; the tag folds to exactly one step
let up = 0, down = 0, plain = 0; const byDial = {};
Object.keys(SIGN).forEach(t => {
  const v = SIGN[t], r = box.careerTextureTag_(t);
  if (v === null) { plain++; ok(r.tag === '' && r.why === 'plain', 'plain line writes nothing: ' + t); return; }
  const m = /^dial:([a-z]+):(up|down)$/.exec(v);
  ok(m && M.GRADED_DIALS.indexOf(m[1]) >= 0, 'bad sign for: ' + t);
  const fx = M.nudgesForEvent_(r.tag, 1, t), keys = Object.keys(fx);
  ok(keys.length === 1 && keys[0] === m[1] && fx[m[1]] === (m[2] === 'up' ? 1 : -1), t + ' -> ' + r.tag + ' ' + JSON.stringify(fx));
  ok(M.baseTag_(r.tag) === 'Career', 'kind stays Career: ' + r.tag);
  byDial[m[1]] = byDial[m[1]] || [0, 0]; byDial[m[1]][m[2] === 'up' ? 0 : 1]++;
  if (m[2] === 'up') up++; else down++;
});
ok(box.careerTextureTag_('a line nobody wrote').why === 'unlisted', 'an unlisted text is not written');

// 3. the cases that started this: a bad line no longer lifts drive
ok(box.careerTextureTag_('felt uneasy workplace atmosphere').tag === 'Career-Composure-Down-S', 'uneasy reads down');
ok(box.careerTextureTag_('noticed colleagues discussing job market concerns').tag === 'Career-Composure-Down-S', 'job-market worry reads down');
ok(box.careerTextureTag_('had a routine period at work with no major changes').tag === '', 'a routine period is a plain day');
ok(box.careerTextureTag_('received small positive feedback on daily tasks').tag === 'Career-Drive-Up-S', 'good feedback is one step of drive');

// 4. the old bare tags are gone from the texture writer
['"Career-FirstFriday"', '"Career-CreationDay"', '"Career-Holiday"', '"Career-Training"', 'var eventTag = "Career";'].forEach(lit => ok(src.indexOf(lit) < 0, 'still in the writer: ' + lit));

console.log('careerTextureSign.test.js: ' + n + ' assertions passed — ' + Object.keys(SIGN).length + ' lines: ' + up + ' up, ' + down + ' down, ' + plain + ' plain; by dial ' + JSON.stringify(byDial));
