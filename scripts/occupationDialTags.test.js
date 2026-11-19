/**
 * occupationDialTags.test.js — engine.350 Task 7: Work lines read by what they say.
 * The tab's occupation rows (scripts/occupationDialTags.js), the generator's coded work flavours
 * (OCC_FLAVOR_SIGN_) and the game-mode writer's media work lines each carry one dial and a direction,
 * are written Work-<Dial>-<Up|Down>-S and fold exactly one step; a Work line is never written bare.
 *
 * Run: node scripts/occupationDialTags.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const P = require('./occupationDialTags');
const M = require('../utilities/citizenDialMap.js');

let n = 0;
function ok(cond, msg) { assert.ok(cond, msg); n++; }
const R = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];
const cap = (d) => d.charAt(0).toUpperCase() + d.slice(1);

// 1. the list's own rules
const v = P.validate();
ok(v.valid, 'validate: ' + v.errors.join('; '));
ok(P.SIGNS.length === 101, 'row count ' + P.SIGNS.length);
const c = P.counts();
ok(c.up + c.down + c.plain === 101 && c.down >= 10, 'counts ' + JSON.stringify(c));

// 2. tagsFor: appended once, the source stays first, a foreign dial tag is a conflict, a plain row is left alone
let t = P.tagsFor('source:occupation,auth:library-s325', 'composure:down');
ok(t.change && t.tags === 'source:occupation,auth:library-s325,dial:composure:down', 'appended: ' + t.tags);
t = P.tagsFor(t.tags, 'composure:down');
ok(!t.change && !t.conflict, 'a second run changes nothing');
t = P.tagsFor('source:occupation,dial:drive:up', 'composure:down');
ok(!t.change && t.conflict === 'dial:drive:up', 'a different dial tag is a conflict, not overwritten');
t = P.tagsFor('source:occupation,auth:auto', null);
ok(!t.change && !t.conflict && t.tags === 'source:occupation,auth:auto', 'a plain row is left as it is');

// 3. plan against a tab: every listed row found, an unlisted occupation row reported, an inactive one and other sources ignored
const tab = [HDR].concat(P.SIGNS.map(function (s) { return ['line', s[0], '', s[1], '1', '', 'source:occupation,auth:x', '', 'yes']; }));
const mediaTab = [HDR].concat(P.MEDIA_SIGNS.map(function (s) { return ['line', s[0], '', s[1], '1', '', 'source:media,auth:x', '', 'yes']; }));
mediaTab.push(['fragment', '', 'VENUE', 'a dimly lit bar with game highlights on mute', '1', '', 'source:media,auth:auto', '', 'yes']);
tab.push(['line', 'work.new', '', 'a row nobody signed', '1', '', 'source:occupation', '', 'yes']);
tab.push(['line', 'work.off', '', 'an inactive row', '1', '', 'source:occupation', '', 'no']);
tab.push(['line', 'down.drive', '', 'another source', '1', '', 'source:reflection,dial:drive:down', '', 'yes']);
let pl = P.plan(tab);
ok(pl.todo.length === c.up + c.down && pl.plain === c.plain && pl.tagged === 0, 'todo ' + pl.todo.length + ' plain ' + pl.plain);
ok(pl.unlisted.length === 1 && pl.unlisted[0].text === 'a row nobody signed' && pl.notOnTab.length === P.MEDIA_SIGNS.length && pl.conflicts.length === 0, 'unlisted / missing / conflicts');
// the paper-reader rows: every one found and tagged; a source:media fragment is not a line and is left alone
const mpl = P.plan(mediaTab);
ok(P.MEDIA_SIGNS.length === 7 && mpl.todo.length === 7 && mpl.unlisted.length === 0, 'paper-reader rows to tag ' + mpl.todo.length + ', unlisted ' + mpl.unlisted.length);
ok(mpl.todo.every(function (x) { return /^source:media,auth:x,dial:[a-z]+:(up|down)$/.test(x.to); }), 'the source stays first on a paper-reader row');
ok(pl.todo[0].row === 2 && pl.tagsCol === 6, 'sheet row and Tags column');
const tagged = tab.map(function (r, i) { const o = r.slice(); const td = pl.todo.filter(function (x) { return x.row === i + 1; })[0]; if (td) o[6] = td.to; return o; });
pl = P.plan(tagged);
ok(pl.todo.length === 0 && pl.tagged === c.up + c.down, 'after the write nothing is left to tag');
ok(P.plan([HDR, ['line', 'work.x', '', P.SIGNS[0][1], '1', '', 'source:occupation', '', 'yes']]).notOnTab.length === 100 + P.MEDIA_SIGNS.length, 'a listed row missing from the tab is reported');

// 4. the tab loader takes every tagged row
global.Logger = { log() {} };
eval(R('phase02-world-state/loadEventContentLedger.js'));
const ctx = { summary: {}, ss: { getSheetByName(name) {
  return name === 'Event_Content_Ledger' ? { getDataRange: () => ({ getValues: () => tagged.slice(0, 102) }) } : null;
} } };
loadEventContentLedger_(ctx);
const CL = ctx.summary.contentLedger;
ok(CL && CL.skipped === 0 && CL.lineCount === 101, 'loader: skipped ' + (CL && CL.skipped) + ', lines ' + (CL && CL.lineCount));

// 5. the generator's own sign rule writes each row Work-<Dial>-<Up|Down>-S, one step; an untagged row writes nothing
const gce = R('phase05-citizens/generateCitizensEvents.js');
const a = gce.indexOf('  var DIAL_BY_FACT_TAG = {'), b = gce.indexOf('  function normText_(s) {');
ok(a > 0 && b > a, 'sign block found in generateCitizensEvents.js');
const gradedTag_ = M.gradedTag_, nudgesForEvent_ = M.nudgesForEvent_; // read by the block below
const G = eval('(function(){' + gce.slice(a, b) + '; return { gradedTagFor_: gradedTagFor_, GRADED_ONLY_KIND_: GRADED_ONLY_KIND_ }; })()');
ok(G.GRADED_ONLY_KIND_.Work === true && G.GRADED_ONLY_KIND_.Media === true, 'Work and Media are graded-only');
ok(gce.indexOf('if (has("source:media")) return "Media";') > 0, 'a source:media row is still a Media line');
P.MEDIA_SIGNS.forEach(function (s) {
  const m = /^([a-z]+):(up|down)$/.exec(s[2]);
  const tag = G.gradedTagFor_('Media', P.tagsFor('source:media,auth:library-s357', s[2]).tags.split(','));
  ok(tag === 'Media-' + cap(m[1]) + '-' + (m[2] === 'up' ? 'Up' : 'Down') + '-S', s[1] + ' -> ' + tag);
  const fx = M.nudgesForEvent_(tag, 1, s[1]);
  ok(Object.keys(fx).length === 1 && fx[m[1]] === (m[2] === 'up' ? 1 : -1) && M.baseTag_(tag) === 'Media', s[1] + ' folds ' + JSON.stringify(fx));
});
ok(G.gradedTagFor_('Media', ['source:media', 'auth:library-s357']) === '', 'a paper-reader line with no sign is not written');
ok(M.nudgesForEvent_('Media', 1, '').sociability === 4, 'the bare Media key stays for lines already on the ledger and the real events that carry it');
// the coded news-climate lines take the sign of the pool they came from
const ms = gce.indexOf('  var MEDIA_POOL_SIGN_ = {'), me = gce.indexOf('  var GRADED_DIALS_ = [');
const POOLSIGN = eval('(function(){' + gce.slice(ms, me) + '; return MEDIA_POOL_SIGN_; })()');
const mfe = R('phase07-evening-media/mediaFeedbackEngine.js');
(mfe.slice(mfe.indexOf('function getMediaInfluencedEvent_(ctx) {'), mfe.indexOf('function getMediaEventModifier_(')).match(/tag: '([^']+)'/g) || []).forEach(function (t) {
  const name = t.slice(6, -1), tg = G.gradedTagFor_('Media', ['source:media', POOLSIGN[name] || '']);
  ok(/^Media-[A-Z][a-z]+-(Up|Down)-S$/.test(tg), 'news-climate pool with no sign: ' + name);
});
ok(gce.indexOf('var mediaSign = MEDIA_POOL_SIGN_[mediaEvent.tag];') > 0, 'the drawn line carries its pool\'s sign');
ok(gce.indexOf('if (GRADED_ONLY_KIND_[primaryTag] === true || kindMovesNothing_(primaryTag, pick)) {') > 0, 'the admission grades or drops a Work line');
ok(gce.indexOf('if (has("source:occupation")) return "Work";') > 0, 'an occupation row is still a Work line');
P.SIGNS.forEach(function (s) {
  const cur = 'source:occupation,auth:library-s325' + (s[0] === 'occupation.transit' ? ',transit:disruption' : '');
  const tags = P.tagsFor(cur, s[2]).tags.split(',');
  const tag = G.gradedTagFor_('Work', tags);
  if (s[2] === null) { ok(tag === '', 'a plain row writes nothing: ' + s[1] + ' -> ' + tag); return; }
  const m = /^([a-z]+):(up|down)$/.exec(s[2]);
  ok(tag === 'Work-' + cap(m[1]) + '-' + (m[2] === 'up' ? 'Up' : 'Down') + '-S', s[1] + ' -> ' + tag);
  const fx = M.nudgesForEvent_(tag, 1, s[1]), keys = Object.keys(fx);
  ok(keys.length === 1 && fx[m[1]] === (m[2] === 'up' ? 1 : -1), s[1] + ' folds ' + JSON.stringify(fx));
  ok(M.baseTag_(tag) === 'Work', 'kind stays Work');
});
ok(G.gradedTagFor_('Work', ['source:occupation', 'occupation:Barista']) === '', 'a Work line with no sign is not written');
ok(M.nudgesForEvent_('Work', 1, '').drive === 4, 'the bare Work key stays for lines already on the ledger');
// the two lines that were 121 of the 301 Work lines after C116
const tech = P.SIGNS.filter(function (s) { return s[0] === 'work.tech'; });
ok(tech.length === 2 && tech[0][2] === 'composure:down' && tech[1][2] === 'sociability:down', 'the Baylight office lines read down');

// 6. the coded flavours: every flavour has an entry, every entry a flavour; the entry carries the sign
const fa = gce.indexOf('  var defaultEntities = {'), fb = gce.indexOf('  // engine.291: a RoleType as it reads mid-clause.');
ok(fa > 0 && fb > fa, 'flavour block found');
const F = eval('(function(){' + gce.slice(fa, fb) + '; return { occ: defaultEntities.occupation, sign: OCC_FLAVOR_SIGN_ }; })()');
const flavours = [].concat.apply([], Object.keys(F.occ).map(function (k) { return F.occ[k]; }));
ok(flavours.length === 36, 'flavours ' + flavours.length);
let fUp = 0, fDown = 0, fPlain = 0;
flavours.forEach(function (f) {
  ok(Object.prototype.hasOwnProperty.call(F.sign, f), 'unsigned flavour: ' + f);
  const sg = F.sign[f];
  if (sg === null) { fPlain++; return; }
  const tag = G.gradedTagFor_('Work', ['source:occupation', 'occupation:X', sg]);
  const fx = M.nudgesForEvent_(tag, 1, f), keys = Object.keys(fx);
  ok(/^Work-[A-Z][a-z]+-(Up|Down)-S$/.test(tag) && keys.length === 1 && Math.abs(fx[keys[0]]) === 1, f + ' -> ' + tag);
  if (fx[keys[0]] > 0) fUp++; else fDown++;
});
Object.keys(F.sign).forEach(function (f) { ok(flavours.indexOf(f) >= 0, 'signed but no such flavour: ' + f); });
ok(gce.indexOf('if (OCC_FLAVOR_SIGN_[flavor]) occTags.push(OCC_FLAVOR_SIGN_[flavor]);') > 0, 'the flavour\'s sign rides the entry');

// 7. the game-mode writer: every media work line is listed with its sign; Work is never written bare there
const gm = R('phase04-events/generateGameModeMicroEvents.js');
const re = /var (\w+) = \[\n((?:\s*\["[^"\n]*", "[^"\n]*"\],?\n)+)\s*\]\.map\(function\(t\) \{ return entry\(t\[0\], \[[^\]]*\]\.concat\(t\[1\] \? \[t\[1\]\] : \[\]\), "Work"\); \}\);/g;
let mm, mediaLines = 0, mUp = 0, mDown = 0, mPlain = 0; const pools = [];
while ((mm = re.exec(gm)) !== null) {
  pools.push(mm[1]);
  eval('[' + mm[2] + ']').forEach(function (e) {
    mediaLines++;
    if (!e[1]) { mPlain++; return; }
    const m2 = /^dial:([a-z]+):(up|down)$/.exec(e[1]);
    ok(m2 && M.GRADED_DIALS.indexOf(m2[1]) >= 0, 'bad sign on ' + e[0]);
    if (m2[2] === 'up') mUp++; else mDown++;
  });
}
ok(pools.join(',') === 'mediaWork,editorPool,reporterPool,columnistPool,photographerPool' && mediaLines === 22, 'media work pools ' + pools.join(',') + ' lines ' + mediaLines);
ok(!/\]\.map\(function\(t\) \{ return entry\(t, \[[^\]]*\], "Work"\); \}\);/.test(gm), 'no unsigned Work pool left in the game-mode writer');
ok(gm.indexOf("if (primaryTag !== 'Work' && Object.keys(ownFx).length) writtenTag = primaryTag;") > 0, 'the game-mode admission never writes a bare Work');

// 8. the newsroom staff's own lines (media mode): every Media line carries one sign first or none; never bare
const mmd = R('phase05-citizens/generateMediaModeEvents.js');
const mmLines = mmd.split('\n').filter(function (l) { return /ev\("/.test(l) && /"Media"\)\)?[,;]?\s*$/.test(l); });
let nUp = 0, nDown = 0, nPlain = 0;
mmLines.forEach(function (l) {
  const dials = l.match(/"dial:[a-z]+:(?:up|down)"/g) || [];
  ok(dials.length <= 1, 'more than one sign: ' + l.trim());
  if (!dials.length) { nPlain++; return; }
  ok(/, \["dial:(drive|sociability|warmth|openness|composure|integrity|family|outabout|fandom):(up|down)", /.test(l), 'the sign is the entry\'s first tag: ' + l.trim());
  if (/:up"/.test(dials[0])) nUp++; else nDown++;
});
ok(mmLines.length === 46 && nDown >= 5 && nPlain === 5, 'newsroom lines ' + mmLines.length + ': ' + nUp + ' / ' + nDown + ' / ' + nPlain);
ok(mmd.indexOf("if (primaryTag !== 'Media' && Object.keys(ownFx).length) writtenTag = primaryTag;") > 0, 'the media-mode admission never writes a bare Media');

console.log('occupationDialTags.test.js: ' + n + ' assertions passed — tab rows ' + c.up + ' up / ' + c.down + ' down / ' + c.plain + ' plain; coded flavours ' + fUp + ' / ' + fDown + ' / ' + fPlain + '; media work ' + mUp + ' / ' + mDown + ' / ' + mPlain + '; paper-reader rows ' + P.MEDIA_SIGNS.length + '; newsroom lines ' + nUp + ' / ' + nDown + ' / ' + nPlain);
