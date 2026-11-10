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
assert(/Your ledger row[^:]*: .*Designated Hitter/.test(brief), 'brief carries the ledger row (role)');
assert(/status \w+/.test(brief) && /lives in /.test(brief), 'brief carries status and hood from the ledger');
assert(/The club, from the sports feed, newest first/.test(brief), 'brief carries sports feed lines');
// research.32 — newest first, and the two-records sentence instead of "the feed is newer"
{
  const feedCycles = (brief.match(/^- C(\d+) /gm) || []).map(function (l) { return parseInt(l.slice(3), 10); });
  assert(feedCycles.length >= 2 && feedCycles[0] >= feedCycles[feedCycles.length - 1], 'feed lines run newest first: ' + feedCycles.join(','));
  assert(/both are on the record, each with its own Cycle/.test(brief), 'brief names both records, each with its own Cycle');
}
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
// pipeline.100 — the buffer carries the whole exchange in order; the conversation is one doc in the voice's own store
assert(buf.turns.length === 4 && buf.turns[0].who !== buf.turns[1].who && buf.firstTs > 0, 'buffer keeps every turn, both speakers, in order');
const cdoc = pp.conversationDoc_('POP-90001', 'Vinnie Keane', pp.talkStoreTag_('POP-90001'),
  [{ who: 'Mike', text: 'How is the academy?' }, { who: 'Vinnie Keane', text: 'Full gym tonight.' }, { who: 'Dana', text: 'And the knee?' }, { who: 'Vinnie Keane', text: 'Holding.' }], 1700000000000, 114);
assert(cdoc.containerTags.join() === 'talk-POP-90001' && cdoc.customId === 'talk-POP-90001-conv-1700000000000', 'conversation: one doc, the voice\'s own talk store, never the page tag');
assert(cdoc.metadata.title === 'Talk with Mike and Dana — Y3C10' && !/20\d\d-\d\d/.test(cdoc.content + cdoc.metadata.title), 'conversation: titled by who and the sim clock, no calendar date');
assert(cdoc.content.indexOf('Mike: How is the academy?\n\nVinnie Keane: Full gym tonight.\n\nDana: And the knee?') !== -1, 'conversation: every turn, in order, with its speaker');
assert(pp.talkStoreTag_('pop-00001') === 'talk-POP-00001' && pp.talkStoreTag_('POP-00001').indexOf('cp-') !== 0, 'talk store tag is not a page tag');

async function storeCases() {
  const realFetch = global.fetch, realKey = process.env.SUPERMEMORY_CC_API_KEY;
  process.env.SUPERMEMORY_CC_API_KEY = 'test';
  try {
    const calls = [];
    const turns = [{ who: 'Mike', text: 'hi' }, { who: 'Vinnie Keane', text: 'hey' }];
    global.fetch = async (url, o) => { calls.push((o && o.method) + ' ' + url); return { ok: false, status: 404, json: async () => ({}), text: async () => '' }; };
    // GET says not there, POST fails -> reported, nothing claimed
    assert((await pp.saveConversation_('POP-90001', 'Vinnie Keane', 'talk-POP-90001', turns, 1)).indexOf('failed') === 0 && calls.length === 2, 'a failed save says so');
    calls.length = 0;
    global.fetch = async (url, o) => { calls.push(o.method); return { ok: true, status: 200, json: async () => ({}), text: async () => '' }; };
    assert((await pp.saveConversation_('POP-90001', 'Vinnie Keane', 'talk-POP-90001', turns, 1)) === 'already saved' && calls.join() === 'GET', 'a conversation already in the store is not written again (the store appends)');
    global.fetch = async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => '' });
    assert(/could not read the store/.test(await pp.saveConversation_('POP-90001', 'Vinnie Keane', 'talk-POP-90001', turns, 1)), 'an unreadable store is not written blind');
    assert((await pp.storeHasDoc_('x')) === null, 'storeHasDoc_: a failed read is unknown, never absent');
  } finally { global.fetch = realFetch; process.env.SUPERMEMORY_CC_API_KEY = realKey; }
}

tb.flush(false).then(async function (r) {
  assert(r.flushed === false && r.reason === 'active', 'a fresh session does not flush before the idle boundary');
  try { fs.unlinkSync(tfile); } catch (e) {}
  await storeCases();
  if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
  console.log('all passed');
});
