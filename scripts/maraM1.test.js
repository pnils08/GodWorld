'use strict';
// civic.47 M1 — Mara's directive: parser and readers, promise record, commit
// receipt, director answer route. Synthetic fixtures only.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const md = require('./maraDirective');
const promises = require('./maraPromises');
const run = require('./cron-civic-run');
const slice = require('./buildCivicOfficeSlice');
const { moveHoods } = require('./civicProblemContinuity');

function workspace(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mara-m1-'));
  const write = (rel, text) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
  try { return fn(root, write); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
async function aworkspace(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mara-m1-'));
  const write = (rel, text) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
  try { return await fn(root, write); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

// The C114 AUTO's shape: five fields per block, no Not directing section.
const OLD = '# C998 Voice Directives — Mara Vance (AUTO)\n\n**Cycle:** 998\n\n---\n' +
  '## Synthetic Two — Council D2\n\n- **Agent:** `.claude/agents/civic-office-council-d2/`\n- **Address:** Bring INIT-SYN to a vote.\n- **Why:** civic-office-council-d4 raised it in C997 for Coliseum.\n- **Acceptance:** a vote\n- **Silence consequence:** it stalls\n\n' +
  '## Synthetic Four — Council D4\n\n- **Agent:** `.claude/agents/civic-office-council-d4/`\n- **Address:** Docket the referral.\n- **Why:** C997 filing in Coliseum.\n- **Acceptance:** a schedule\n- **Silence consequence:** it freezes\n';
const NEW = '# C999 Voice Directives — Mara Vance (AUTO)\n\n---\n' +
  '## Synthetic OARI — Program Director\n\n- **Agent:** `.claude/agents/civic-project-oari/`\n- **Address:** Where does the East Oakland briefing stand?\n- **Why:** C998 tracker step.\n- **Acceptance:** a date\n- **Promise:** P-0123456789abcdef\n\n' +
  '## Not directing\n- Synthetic Four (Council D4): the referral is scheduled; nothing to ask.\n';
const ZERO = '# C1000 Voice Directives — Mara Vance (AUTO)\n\n---\n## Not directing\n- Synthetic Two (Council D2): a quiet week.\n';

test('the old five-field directive still parses for every reader', () => {
  const s = md.splitDirective(OLD);
  assert.equal(s.blocks.length, 2);
  assert.equal(s.notDirecting, null);
  assert.deepEqual(s.blocks.map(md.agentDirOf), ['civic-office-council-d2', 'civic-office-council-d4']);
});

test('prep gives a seat only blocks whose Agent line names it — a mention elsewhere is not a block', () => {
  const d4 = md.blocksFor(OLD, 'civic-office-council-d4');
  assert.equal(d4.length, 1);
  assert.match(d4[0], /Docket the referral/);
  assert.doesNotMatch(d4[0], /Bring INIT-SYN/);
  assert.equal(md.blocksFor(NEW, 'civic-office-council-d4').length, 0, 'a Not directing line is never a block');
});

test('the initiative-packet copy drops Not directing and carries nothing on a zero-block week', () => {
  const copy = md.withoutNotDirecting(NEW);
  assert.match(copy, /Synthetic OARI/);
  assert.doesNotMatch(copy, /Not directing/);
  assert.equal(md.withoutNotDirecting(ZERO), null);
  assert.deepEqual(md.promiseIdsIn(md.splitDirective(NEW).blocks[0]), ['P-0123456789abcdef']);
});

test('weekday: a zero-block latest directive leaves nothing open; history still binds an old answer to its hoods', () => workspace((root, write) => {
  const dir = 'civic-office-council-d4';
  write('output/mara-directives/mara_directive_c998_AUTO.txt', OLD);
  write('output/mara-directives/mara_directive_c999_AUTO.txt', NEW);
  let st = slice.loadConfrontations(root, 999, dir);
  assert.deepEqual(st.all.map(c => c.id), ['CONF-998-' + dir]);
  assert.deepEqual(st.open, [], 'the C999 directive left D4 alone');
  write('output/mara-directives/mara_directive_c1000_AUTO.txt', ZERO);
  st = slice.loadConfrontations(root, 1000, 'civic-project-oari');
  assert.equal(st.latestCycle, 1000);
  assert.deepEqual(st.open, [], 'a zero-block week clears C999');
  assert.equal(st.all.length, 1);
  const resolver = { resolve: n => (n === 'Coliseum' ? 'East Oakland' : null) };
  const hoods = moveHoods({ type: 'answer', agentDir: dir, cycle: 999, payload: { confrontationId: 'CONF-998-' + dir } }, resolver, [],
    slice.loadConfrontations(root, 1000, dir).all, [{ Neighborhood: 'East Oakland', ChildAreas: 'Coliseum' }]);
  assert.deepEqual([...hoods], ['East Oakland']);
}));

// ── promise record ─────────────────────────────────────────────────────────
function promiseWorld(write) {
  write('output/civic-voice/council_d4_c999.json', JSON.stringify({ office: 'council_d4', speaker: 'Synthetic Four', statements: [
    { initiative: 'Synthetic Referral Program', decision: 'refer it', quote: 'We will send the referral to committee by next week.', fullStatement: 'Full text. We will send the referral to committee by next week.', trackerUpdates: { MilestoneNotes: 'a secret promise in tracker text' } },
    { initiative: 'Other Program', decision: 'other', quote: 'Something about another program entirely here.', fullStatement: 'x', trackerUpdates: {} }] }));
  write('output/civic-voice/mayor_open_c999.json', JSON.stringify({ office: 'mayor_open', speaker: 'Synthetic Mayor', statements: [{ initiative: null, decision: 'open', quote: 'I will meet the fans downtown on Friday.', fullStatement: 'f', trackerUpdates: {} }] }));
  write('output/civic-voice/mayor_gavel_c999.json', JSON.stringify({ office: 'mayor_gavel', speaker: 'Synthetic Mayor', statements: [{ initiative: null, decision: 'gavel', quote: 'I will sign the parade permit tonight.', fullStatement: 'f', trackerUpdates: {} }] }));
  write('output/cron-civic/datawake/civic-office-council-d4_2026-01-05.json', JSON.stringify({ agentDir: 'civic-office-council-d4', cycle: 998, statement: 'I will hold a “listening   session” in Dimond this week.', moves: [] }));
}
const ROWS = [{ InitiativeID: 'INIT-SYN', Name: 'Synthetic Referral Program', ImplementationPhase: 'announced', Status: 'proposed', NextActionCycle: '1000' },
  { InitiativeID: 'INIT-OTH', Name: 'Other Program', ImplementationPhase: 'announced', Status: 'proposed' }];
const pctx = (root, extra) => Object.assign({ root, cycle: 999, roster: new Set(['civic-office-council-d4', 'civic-office-mayor']), trackerRows: ROWS, answers: [] }, extra || {});

test('promise sources: allowlisted, public fields only, the mayor names open or gavel, quotes normalized', () => workspace((root, write) => {
  promiseWorld(write);
  const c = pctx(root);
  const sun = { kind: 'sunday', office: 'civic-office-council-d4', cycle: 999, index: 0, field: 'quote' };
  const ok = promises.validatePromise({ source: sun, said: 'send the referral to committee by next week' }, c);
  assert.equal(ok.ok, true);
  assert.equal(ok.row.initiativeId, 'INIT-SYN');
  assert.equal(promises.validatePromise({ source: sun, said: 'send the referral to committee by next week' }, c).row.promiseId, ok.row.promiseId, 'identity is stable');
  assert.match(promises.validatePromise({ source: { ...sun, field: 'trackerUpdates' }, said: 'a secret promise in tracker' }, c).why, /field must be/);
  assert.match(promises.validatePromise({ source: { ...sun, office: 'civic-office-police-chief' }, said: 'a b c d' }, c).why, /roster/);
  assert.match(promises.validatePromise({ source: { kind: 'sunday', office: 'civic-office-mayor', cycle: 999, index: 0, field: 'quote' }, said: 'meet the fans downtown on' }, c).why, /open" or "gavel/);
  const gavel = promises.validatePromise({ source: { kind: 'sunday', office: 'civic-office-mayor', statement: 'gavel', cycle: 999, index: 0, field: 'quote' }, said: 'sign the parade permit tonight' }, c);
  assert.equal(gavel.ok, true);
  assert.match(gavel.row.source, /^mayor_gavel_c999/);
  assert.match(promises.validatePromise({ source: { kind: 'sunday', office: 'civic-office-mayor', statement: 'open', cycle: 999, index: 0, field: 'quote' }, said: 'sign the parade permit tonight' }, c).why, /not in that statement/);
  const wk = promises.validatePromise({ source: { kind: 'weekday', office: 'civic-office-council-d4', date: '2026-01-05' }, said: 'hold a "listening session" in Dimond' }, c);
  assert.equal(wk.ok, true, 'curly quotes and runs of spaces normalize');
  assert.match(promises.validatePromise({ source: { kind: 'weekday', office: 'civic-office-council-d4', date: '../../etc/passwd' }, said: 'a b c d' }, c).why, /date/);
}));

test('a status closes a promise only on evidence tied to it', () => workspace((root, write) => {
  promiseWorld(write);
  const c = pctx(root);
  const p = promises.validatePromise({ source: { kind: 'sunday', office: 'civic-office-council-d4', cycle: 999, index: 0, field: 'quote' }, said: 'send the referral to committee by next week' }, c).row;
  const w = promises.validatePromise({ source: { kind: 'weekday', office: 'civic-office-council-d4', date: '2026-01-05' }, said: 'hold a "listening session" in Dimond' }, c).row;
  promises.appendRows(root, [p, w]);
  const rec = promises.loadRecord(root);
  // tracker evidence: the promise's own initiative only
  assert.match(promises.validateStatus({ promiseId: p.promiseId, status: 'kept', evidence: { type: 'tracker', initiativeId: 'INIT-OTH', field: 'Status', value: 'proposed' } }, c, rec).why, /another initiative/);
  // the label must match how the row moved since the promise (code review finding 2)
  assert.match(promises.validateStatus({ promiseId: p.promiseId, status: 'kept', evidence: { type: 'tracker', initiativeId: 'INIT-SYN', field: 'NextActionCycle', value: '1000' } }, c, rec).why, /kept needs ImplementationPhase evidence/);
  // Status is the legislative arc — it advances from the vote alone and never shows a kept promise (code re-review finding 1)
  const voted = pctx(root, { trackerRows: [Object.assign({}, ROWS[0], { Status: 'active' }), ROWS[1]] });
  assert.match(promises.validateStatus({ promiseId: p.promiseId, status: 'kept', evidence: { type: 'tracker', initiativeId: 'INIT-SYN', field: 'Status', value: 'active' } }, voted, rec).why, /kept needs ImplementationPhase evidence/);
  assert.match(promises.validateStatus({ promiseId: p.promiseId, status: 'changed', evidence: { type: 'tracker', initiativeId: 'INIT-SYN', field: 'NextActionCycle', value: '1000' } }, c, rec).why, /has not moved/);
  const moved = pctx(root, { trackerRows: [Object.assign({}, ROWS[0], { ImplementationPhase: 'legislation-filed', NextActionCycle: '1002' }), ROWS[1]] });
  assert.equal(promises.validateStatus({ promiseId: p.promiseId, status: 'kept', evidence: { type: 'tracker', initiativeId: 'INIT-SYN', field: 'ImplementationPhase', value: 'legislation-filed' } }, moved, rec).ok, true);
  assert.equal(promises.validateStatus({ promiseId: p.promiseId, status: 'changed', evidence: { type: 'tracker', initiativeId: 'INIT-SYN', field: 'NextActionCycle', value: '1002' } }, moved, rec).ok, true);
  assert.match(promises.validateStatus({ promiseId: p.promiseId, status: 'dropped', evidence: { type: 'tracker', initiativeId: 'INIT-SYN', field: 'Status', value: 'proposed' } }, moved, rec).why, /has not moved|terminal/);
  const failedRow = pctx(root, { trackerRows: [Object.assign({}, ROWS[0], { Status: 'failed' }), ROWS[1]] });
  assert.equal(promises.validateStatus({ promiseId: p.promiseId, status: 'dropped', evidence: { type: 'tracker', initiativeId: 'INIT-SYN', field: 'Status', value: 'failed' } }, failedRow, rec).ok, true);
  assert.match(promises.validateStatus({ promiseId: p.promiseId, status: 'kept', evidence: { type: 'tracker', initiativeId: 'INIT-SYN', field: 'ImplementationPhase', value: 'legislation-filed' } }, pctx(root, { trackerRows: [Object.assign({}, ROWS[0], { Status: 'failed', ImplementationPhase: 'legislation-filed' }), ROWS[1]] }), rec).why, /terminal Status is not a kept/);
  // a same-office statement about another initiative does not close it
  const c2 = pctx(root, { cycle: 1000 });
  write('output/civic-voice/council_d4_c1000.json', JSON.stringify({ office: 'council_d4', speaker: 'S', statements: [{ initiative: 'Other Program', decision: 'd', quote: 'The other program opened its doors today.', fullStatement: 'f', trackerUpdates: {} }] }));
  assert.match(promises.validateStatus({ promiseId: p.promiseId, status: 'kept', evidence: { type: 'statement', source: { kind: 'sunday', office: 'civic-office-council-d4', cycle: 1000, index: 0, field: 'quote' }, quote: 'other program opened its doors today' } }, c2, rec).why, /another initiative/);
  // a weekday promise (no initiative) closes only through her question to the office
  assert.match(promises.validateStatus({ promiseId: w.promiseId, status: 'kept', evidence: { type: 'tracker', initiativeId: 'INIT-SYN', field: 'Status', value: 'proposed' } }, c, rec).why, /no initiative/);
  write('output/mara-directives/mara_directive_c999_AUTO.txt', '# h\n---\n## Synthetic Four — Council D4\n\n- **Agent:** `.claude/agents/civic-office-council-d4/`\n- **Address:** Did the listening session happen?\n- **Why:** C998\n- **Acceptance:** yes or no\n- **Promise:** ' + w.promiseId + '\n');
  assert.match(promises.validateStatus({ promiseId: w.promiseId, status: 'kept', evidence: { type: 'answer', confrontationId: 'CONF-999-civic-office-council-d4' } }, c, rec).why, /has not answered/);
  const deferred = pctx(root, { answers: [{ agentDir: 'civic-office-council-d4', confrontationId: 'CONF-999-civic-office-council-d4', kind: 'deferral', text: 'Not known yet.' }] });
  assert.match(promises.validateStatus({ promiseId: w.promiseId, status: 'kept', evidence: { type: 'answer', confrontationId: 'CONF-999-civic-office-council-d4' } }, deferred, rec).why, /deferred/);
  const withAnswer = pctx(root, { answers: [{ agentDir: 'civic-office-council-d4', confrontationId: 'CONF-999-civic-office-council-d4', kind: 'answer', text: 'We held the listening session Tuesday at the Dimond library.' }] });
  // a close on the office's word quotes the words Mara relies on, and says so (code re-review finding 1)
  assert.match(promises.validateStatus({ promiseId: w.promiseId, status: 'kept', evidence: { type: 'answer', confrontationId: 'CONF-999-civic-office-council-d4' } }, withAnswer, rec).why, /quote the words of the reply/);
  assert.match(promises.validateStatus({ promiseId: w.promiseId, status: 'kept', evidence: { type: 'answer', confrontationId: 'CONF-999-civic-office-council-d4', quote: 'we will hold it next month' } }, withAnswer, rec).why, /quote the words of the reply/);
  const kept = promises.validateStatus({ promiseId: w.promiseId, status: 'kept', evidence: { type: 'answer', confrontationId: 'CONF-999-civic-office-council-d4', quote: 'held the listening session Tuesday' } }, withAnswer, rec);
  assert.equal(kept.ok, true);
  assert.equal(kept.row.evidence.basis, 'office-word');
  assert.equal(kept.row.evidence.quote, 'held the listening session Tuesday');
  assert.match(promises.validateStatus({ promiseId: p.promiseId, status: 'kept', evidence: { type: 'answer', confrontationId: 'CONF-999-civic-office-council-d4' } }, withAnswer, rec).why, /did not carry this promise/);
  // append is idempotent by eventId
  assert.equal(promises.appendRows(root, [kept.row]).written.length, 1);
  assert.equal(promises.appendRows(root, [kept.row, p]).written.length, 0);
  assert.equal(promises.loadRecord(root).openIds.has(w.promiseId), false);
}));

test('a partial commit resumes from the receipt and writes nothing twice', () => aworkspace(async (root) => {
  const calls = { memory: 0, page: 0 };
  let failPage = true;
  const memory = { CONTAINER: 'cp-POP-00507', upsert: async (id, text, meta) => { calls.memory++; assert.equal(meta.type, 'desk-record'); return { ok: true, customId: id }; } };
  const page = {
    appendReflection_: async (pop, text, o) => { calls.page++; return failPage ? { error: 'down' } : { customId: 'cp-' + pop + '-c' + o.cycle + '-' + o.key }; },
    pageHasDoc_: async () => true,
  };
  const row = { kind: 'promise', eventId: 'P-aaaaaaaaaaaaaaaa', promiseId: 'P-aaaaaaaaaaaaaaaa', office: 'civic-office-mayor', cycle: 999, said: 'x' };
  const staged = { runEntry: 'C999 entry', notes: ['watch the parade permit'], promises: [row], statuses: [] };
  fs.mkdirSync(path.join(root, 'output', 'mara-directives'), { recursive: true });
  const r1 = await run.commitDirectiveWrites(999, staged, { root, memory, page });
  assert.equal(r1.complete, false);
  assert.equal(r1.writes['cp-POP-00507-c999-directive-run'].ok, true);
  assert.equal(r1.writes.promises.ok, true);
  failPage = false;
  const r2 = await run.commitDirectiveWrites(999, staged, { root, memory, page, resume: true });
  assert.equal(r2.complete, true);
  assert.equal(calls.memory, 1, 'the memory entry is not rewritten');
  assert.equal(promises.loadRecord(root).rows.length, 1, 'the promise row is not appended twice');
}));

test('a director Mara addressed gets her question and must answer in maraAnswer', () => {
  const ask = run.maraProjectAsk(NEW, 999, 'civic-project-oari');
  assert.equal(ask.confrontationId, 'CONF-999-civic-project-oari');
  assert.equal(run.maraProjectAsk(NEW, 999, 'civic-project-health-center'), null);
  const check = run.maraAnswerCheck(ask);
  assert.match(check({}), /maraAnswer missing/);
  assert.match(check({ maraAnswer: { confrontationId: 'CONF-1-x', kind: 'answer', text: 'y' } }), /must be exactly/);
  assert.match(check({ maraAnswer: { confrontationId: ask.confrontationId, kind: 'promise', text: 'y' } }), /kind/);
  assert.equal(check({ maraAnswer: { confrontationId: ask.confrontationId, kind: 'deferral', text: 'Not known until the C1000 briefing.' } }), null);
});

test('the run entry names what she directed and what she watches', () => {
  const blocks = md.splitDirective(NEW).blocks;
  const t = run.runEntryText(999, blocks, md.splitDirective(NEW).notDirecting, [{ office: 'civic-office-mayor', said: 'sign the parade permit tonight' }]);
  assert.match(t, /Directed Synthetic OARI — Program Director: Where does the East Oakland briefing stand\?/);
  assert.match(t, /Not directing:/);
  assert.match(t, /mayor "sign the parade permit tonight"/);
  assert.match(run.runEntryText(1000, [], null, []), /No directive this week/);
});

test('the brief carries no crisis or compulsion frame', () => {
  for (const re of [/confront/i, /\bowe/i, /crisis/i, /must fight/i, /Silence is also a position/i, /charter/i, /stall clock/i]) {
    assert.doesNotMatch(run.DIRECTIVE_BRIEF, re);
  }
  const src = fs.readFileSync(path.join(__dirname, 'cron-civic-run.js'), 'utf8');
  assert.doesNotMatch(src, /This is a decision demand, not a briefing/);
  assert.doesNotMatch(src, /An \{"type":"answer",\.\.\.\} move responding to it is expected/);
});

test('a block needs real field values, a cited Cycle and recorded promise ids; a bad Not directing section is dropped, not replaced', () => {
  const roster = new Set(['civic-office-mayor']);
  const B = (addr, why, extra) => '## A — Mayor\n\n- **Agent:** `.claude/agents/civic-office-mayor/`\n- **Address:** ' + addr + '\n- **Why:** ' + why + '\n- **Acceptance:** an answer\n' + (extra || '');
  assert.match(run.filterDirectiveBlocks(B('', 'C999 gavel'), roster, {}).rejected[0].why, /Address/);
  assert.match(run.filterDirectiveBlocks(B('ask', 'the gavel'), roster, {}).rejected[0].why, /cites no Cycle/);
  assert.match(run.filterDirectiveBlocks(B('ask', 'C999 gavel', '- **Promise:** P-0123456789abcdef\n'), roster, { knownPromiseIds: new Set() }).rejected[0].why, /no recorded promise/);
  assert.equal(run.filterDirectiveBlocks(B('ask', 'C999 gavel', '- **Promise:** P-0123456789abcdef\n'), roster, { knownPromiseIds: new Set(['P-0123456789abcdef']) }).blocks.length, 1);
  const bad = run.filterDirectiveBlocks(B('ask', 'C999 gavel') + '\n## Not directing\n- civic-office-mayor: fine\n', roster, {});
  assert.equal(bad.blocks.length, 1);
  assert.equal(bad.notDirecting, null);
  assert.match(bad.notDirectingProblem, /office id/);
});

test('a Mara-only director reply needs no decision and cannot move the tracker before its due step', () => {
  const contract = run.maraOnlyContract('oari', 999, false);
  const example = JSON.parse(contract.match(/\n(\{[\s\S]*\n\})\n/)[1]);
  example.speaker = 'Synthetic OARI';
  example.maraAnswer = { confrontationId: 'CONF-999-civic-project-oari', kind: 'deferral', text: 'Not known until the briefing.' };
  const v = run.validateVoiceJson(JSON.stringify(example));
  assert.equal(v.ok, true, v.why);
  assert.equal(run.noTrackerChangeCheck(v.json), null);
  example.statements[0].trackerUpdates = { initiative: 'INIT-002', NextActionCycle: 1001 };
  assert.match(run.noTrackerChangeCheck(example), /must be \{\}/);
  assert.match(run.maraOnlyContract('oari', 999, false), /MUST be \{\}/);
  assert.match(run.maraOnlyContract('oari', 999, true, 'INIT-002'), /due this Cycle[\s\S]*"INIT-002"/);
});

test('a Mara-only reply is only a reply, and a due step moves only the director\'s own initiative', () => {
  const contract = run.maraOnlyContract('oari', 999, true, 'INIT-002');
  const base = () => JSON.parse(contract.match(/\n(\{[\s\S]*\n\})\n/)[1]);
  const notDue = run.maraOnlyCheck('INIT-002', false);
  const due = run.maraOnlyCheck('INIT-002', true);
  assert.equal(notDue(base()), null);
  // code re-review finding 2: a decision slipped into the reply
  const decided = base(); decided.statements[0].decision = 'Advance OARI into a new phase';
  assert.match(notDue(decided), /decision must be exactly/);
  const typed = base(); typed.statements[0].type = 'decision';
  assert.match(notDue(typed), /type "reply"/);
  const tracked = base(); tracked.statements[0].trackerUpdates = { initiative: 'INIT-002', ImplementationPhase: 'dispatch-live' };
  assert.match(notDue(tracked), /must be \{\}/);
  // code re-review finding 3: a due step on OARI cannot move another initiative
  assert.equal(due(tracked), null);
  const other = base(); other.statements[0].trackerUpdates = { initiative: 'INIT-006', ImplementationPhase: 'construction-active' };
  assert.match(due(other), /must be INIT-002/);
  const otherInit = base(); otherInit.statements[0].initiative = 'INIT-006';
  assert.match(due(otherInit), /initiative must be null or INIT-002/);
});

test('her run entry says how a promise closed', () => {
  const text = run.runEntryText(999, [], null, [], [
    { status: { status: 'kept', evidence: { basis: 'office-word', quote: 'held the listening session Tuesday' } }, promise: { office: 'civic-office-council-d4', said: 'hold a listening session' } },
    { status: { status: 'kept', evidence: { basis: 'tracker', field: 'ImplementationPhase', before: 'pilot', value: 'dispatch-live' } }, promise: { office: 'civic-project-oari', said: 'go live in Fruitvale' } },
  ]);
  assert.match(text, /council-d4 "hold a listening session" as kept, on the office's word: "held the listening session Tuesday"/);
  assert.match(text, /ImplementationPhase moved from pilot to dispatch-live/);
});

test('Mara reads whole move payloads and tracker updates', () => {
  const wk = run.renderWeekday({ agentDir: 'civic-office-council-d4', date: '2026-01-05', j: { holder: 'S', statement: 'x', moves: [{ type: 'propose', payload: { title: 'Fair', purpose: 'a street fair for the hood', budget: '$1M' } }] } });
  assert.match(wk, /a street fair for the hood/);
  assert.match(wk, /\$1M/);
  const sun = run.renderSunday({ file: 'oari', j: { speaker: 'S', statements: [{ decision: 'd', quote: 'q', fullStatement: 'f', trackerUpdates: { initiative: 'INIT-002', NextActionCycle: 1001 } }] } });
  assert.match(sun, /trackerUpdates: \{"initiative":"INIT-002","NextActionCycle":1001\}/);
});

test('the seed screen stops out-of-world text', () => {
  const { screen } = require('./maraMemorySeed');
  assert.deepEqual(screen('COMPLETE VOTE RECORDS — Baylight C83: PASSED 6-3.'), []);
  assert.deepEqual(screen('ferry terminal expansion'), []);
  for (const t of ['the user asked for this', 'Session journal 2026-07-09', 'the owner confirmed', 'Canon from C84', 'the engine reads cleanly']) assert.ok(screen(t).length, t);
});

test('her memory is her own page, and a desk record never poses as her own words', async () => {
  const memory = require('./maraMemory');
  assert.equal(memory.CONTAINER, 'cp-POP-00507');
  const was = process.env.SUPERMEMORY_CC_API_KEY;
  try {
    delete process.env.SUPERMEMORY_CC_API_KEY;
    assert.equal((await memory.search('x')).status, 'unavailable');
    assert.equal((await memory.recent(3)).status, 'unavailable');
    process.env.SUPERMEMORY_CC_API_KEY = 'test-key';
    assert.match((await memory.upsert('cp-POP-00507-x', 'text', { type: 'reflection' })).why, /its own type/);
    assert.match((await memory.upsert('cp-POP-00507-x', 'text', {})).why, /its own type/);
  } finally { if (was === undefined) delete process.env.SUPERMEMORY_CC_API_KEY; else process.env.SUPERMEMORY_CC_API_KEY = was; }
});
