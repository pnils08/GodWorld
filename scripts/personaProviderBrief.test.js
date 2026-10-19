/**
 * personaProviderBrief.test.js — research.30. Pins the voice brief (lib/personaProvider.js
 * buildVoiceBrief_), the speaker line in the citizen prompt, and the Saturday-newsroom block
 * (lib/mags.js loadNewsroomWeek). Reads the live local snapshot files, so assertions are
 * structural, not value-pinned.
 *
 * Run: node scripts/personaProviderBrief.test.js
 */

require('../lib/env');
const pp = require('../lib/personaProvider');
const mags = require('../lib/mags');

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log('ok  — ' + msg); return; }
  failures++; console.error('FAIL — ' + msg);
}

const brief = pp.buildVoiceBrief_('POP-00001', 'Vinnie Keane');
assert(brief.indexOf('## What the records say right now') === 0, 'brief opens with its header');
assert(/Your ledger row: .*Designated Hitter/.test(brief), 'brief carries the ledger row (role)');
assert(/status \w+/.test(brief) && /lives in /.test(brief), 'brief carries status and hood from the ledger');
assert(/The club, from the sports feed:/.test(brief), 'brief carries sports feed lines');
assert(brief.length < 4500, 'brief stays compact (' + brief.length + ' chars)');
assert(!/\bthe builder\b|\bbuilder\b/i.test(brief), 'brief never names a builder');
assert(!/\b20(2[0-9]|3[0-9])-\d\d-\d\d\b/.test(brief), 'brief carries no real-world date');
assert(pp.buildVoiceBrief_('POP-99999', 'Nobody Here') === '', 'unknown citizen with no records returns empty');

const prompt = pp.citizenVoiceProvider('POP-00001').buildSystemPrompt();
assert(prompt.indexOf('## What the records say right now') !== -1, 'citizen prompt includes the brief');
assert(/named Mike is Mike Paulson, the general manager/.test(prompt), 'citizen prompt names a speaker called Mike as the GM');
assert(!/builder/i.test(prompt.slice(prompt.indexOf('## Discord Conversation Mode'), prompt.indexOf('## Where and When You Are'))), 'conversation block does not mention a builder');

const week = mags.loadNewsroomWeek();
assert(/^## The newsroom, as it runs now/.test(week), 'newsroom block has its header');
assert(/Saturday afternoon/.test(week) && /no longer write the Pulse cycle by cycle/.test(week), 'newsroom block states the Saturday run');
assert(/Last Pulse: Cycle \d+/.test(week) && /This week \(Cycle \d+\)/.test(week), 'newsroom block names the last Pulse and this week');
assert(!/\b20(2[0-9]|3[0-9])-\d\d-\d\d\b/.test(week), 'newsroom block carries no real-world date');

// talk recorder — who counts as Paulson, and what the buffer keeps
const fs = require('fs'), path = require('path');
assert(pp.isPaulsonSpeaker_('Mike') && pp.isPaulsonSpeaker_('mike P') && !pp.isPaulsonSpeaker_('Michael') && !pp.isPaulsonSpeaker_('Dana'), 'only a speaker named Mike is read as Paulson');
const tid = 'POP-TEST-0000', tfile = path.join(__dirname, '..', 'logs', 'discord-voice-buffer-' + tid + '.json');
try { fs.unlinkSync(tfile); } catch (e) {}
const tb = pp.makeTalkBuffer_(tid, 'Test Voice', {});
tb.persist('Mike', 'first line from Mike', 'reply one');
tb.persist('Dana', 'a stranger speaking', 'reply two');
const buf = JSON.parse(fs.readFileSync(tfile, 'utf8'));
assert(buf.replies.length === 2 && buf.builderLines.length === 1 && buf.builderLines[0] === 'first line from Mike', 'buffer keeps every reply and only Mike\'s lines');
tb.flush(false).then(function (r) {
  assert(r.flushed === false && r.reason === 'active', 'a fresh session does not flush before the idle boundary');
  try { fs.unlinkSync(tfile); } catch (e) {}
  if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
  console.log('all passed');
});
