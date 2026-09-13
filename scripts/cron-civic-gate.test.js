/**
 * cron-civic-gate.test.js — independence rule: gate model selection.
 *
 * C106 (2026-09-13 14:30): the gate's fixed default (gemini) collided with the
 * D6/D7/D8 seats that ran on gemini → FATAL, no tracker write. The re-entry
 * path records '(reused)' as a seat's model, and the manifest list skipped
 * mayor_open/mayor_gavel, so two more families could hide from the rule.
 * These fail on the pre-fix file (no exports; fixed default; partial manifests).
 */
var fs = require('fs');
var os = require('os');
var path = require('path');
var gate = require('./cron-civic-gate');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

function fixtureDir(files) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'civic-gate-'));
  Object.keys(files).forEach(function (name) {
    fs.writeFileSync(path.join(dir, name), JSON.stringify(files[name]));
  });
  return dir;
}

// The C106 first-run manifests, as written by cron-civic-run.js on 2026-09-13.
var C106_FIRST_RUN = {
  'directive_c106.json': { stage: 'directive', model: 'google/gemini-3.7-flash', mayorModel: 'moonshotai/kimi-k2' },
  'mayor_open_c106.json': { stage: 'mayor-open', model: 'moonshotai/kimi-k2' },
  'hearing_c106.json': { stage: 'hearing', results: [
    { slug: 'council_d4', model: 'meta-llama/llama-3.3-70b-instruct' },
    { slug: 'council_d7', model: 'google/gemini-3.7-flash' },
    { slug: 'council_d1', model: 'deepseek/deepseek-chat' }
  ] },
  'mayor_gavel_c106.json': { stage: 'mayor-gavel', model: 'moonshotai/kimi-k2' },
  'projects_c106.json': { stage: 'projects', results: [{ slug: 'oari', model: 'deepseek/deepseek-chat' }] }
};

console.log('=== collectWriterFamilies ===');
var d1 = fixtureDir(C106_FIRST_RUN);
var fams = gate.collectWriterFamilies(106, { civicDir: d1, officeMap: null });
ok(fams.has('google') && fams.has('meta-llama') && fams.has('deepseek'), 'hearing + projects families collected');
ok(fams.has('moonshotai'), 'mayor_open / mayor_gavel manifests are read — the Mayor\'s family is a writer');

// The 21:00 re-entry: every seat reused, manifests record '(reused)'.
var reentry = fixtureDir({
  'hearing_c106.json': { stage: 'hearing', results: [{ slug: 'council_d7', model: '(reused)' }] },
  'projects_c106.json': { stage: 'projects', results: [{ slug: 'oari', model: '(reused)' }] },
  'mayor_gavel_c106.json': { stage: 'mayor-gavel', model: '(reused)' }
});
var seatMap = { offices: [{ officeId: 'COUNCIL-D7', model: 'google/gemini-3.7-flash' }, { officeId: 'MAYOR-01', model: 'moonshotai/kimi-k2' }],
                projects: [{ projectId: 'PROJ-OARI', model: 'deepseek/deepseek-chat' }] };
var famsRe = gate.collectWriterFamilies(106, { civicDir: reentry, officeMap: seatMap });
ok(!famsRe.has('(reused)'), '"(reused)" is a marker, not a family');
ok(famsRe.has('google') && famsRe.has('moonshotai') && famsRe.has('deepseek'), 'seat map union: a reused seat cannot hide its family');

console.log('=== pickGateModel ===');
var p = gate.pickGateModel(fams, null);
ok(p.model && gate.modelFamily(p.model) !== 'google', 'default pick steps off gemini when a seat wrote on it: ' + p.model);
ok(p.model === gate.GATE_MODEL_CANDIDATES.find(function (c) { return !fams.has(gate.modelFamily(c)); }), 'first non-writer candidate wins, in list order');
var clean = gate.pickGateModel(new Set(['deepseek', 'meta-llama']), null);
ok(clean.model === gate.GATE_MODEL_CANDIDATES[0], 'no collision → first candidate (' + gate.GATE_MODEL_CANDIDATES[0] + ')');
var explicitBad = gate.pickGateModel(fams, 'google/gemini-3.7-flash');
ok(explicitBad.error && /independence rule/.test(explicitBad.error), 'explicit --model that collides still fails loud');
var explicitOk = gate.pickGateModel(fams, 'mistralai/mistral-large');
ok(explicitOk.model === 'mistralai/mistral-large', 'explicit --model from a free family is respected');
var all = new Set(gate.GATE_MODEL_CANDIDATES.map(gate.modelFamily));
var none = gate.pickGateModel(all, null);
ok(none.error && /every gate candidate family/.test(none.error), 'every candidate a writer → error, never a blind pass');

// Live check (guarded): the real C106 run on disk must resolve to a non-writer family.
if (fs.existsSync(path.join(__dirname, '..', 'output', 'cron-civic', 'hearing_c106.json'))) {
  var live = gate.collectWriterFamilies(106);
  var livePick = gate.pickGateModel(live, null);
  ok(livePick.model && !live.has(gate.modelFamily(livePick.model)), 'live C106 manifests + seat map → ' + livePick.model + ' (writers: ' + Array.from(live).join(', ') + ')');
}

console.log((fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
