'use strict';
// pipeline.110 Task 9 — the council / Mayor template (scripts/seatWake.js). Synthetic fixtures only; no sheet, page or model is called.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sw = require('./seatWake');

const OFFICE = { officeId: 'COUNCIL-D9', popid: 'POP-00506', holder: 'Terrence Mobley', title: 'City Council District 9', agentDir: 'civic-office-council-d9', district: 'D9' };
const MAYOR = { officeId: 'MAYOR-01', popid: 'POP-00034', holder: 'Avery Santana', title: 'Mayor', agentDir: 'civic-office-mayor', district: 'citywide' };
const SOURCE = '## Terrence Mobley — City Council District 9\n\n- **Agent:** `.claude/agents/civic-office-council-d9/`\n- **Address:** Report what has moved on the Laurel patch.\n- **Why:** You promised to report back.\n- **Acceptance:** Separate proposal, filing and work.\n- **Promise:** P-1';
function pack(over) {
  return Object.assign({
    v: 'OFFICE/1', team: 'civic-office',
    actor: { id: 'POP-00506', name: 'Terrence Mobley', dials: { approval: 63 } },
    task: { a: 'district-week', goal: 'advance or hold this initiative' },
    pulse: { label: 'Laurel patch', lever: 'advance or hold this initiative' },
    prewrite: { claim: 'advance or hold this initiative', lineFacts: ['approval 63'] },
    signal: { kind: 'district-heat', hoods: ['Laurel', 'Uptown'], src: 'lib/districtMap.js' },
    exposure: { subjects: [{ pop: 'POP-00900', name: 'Ada Lane', neighborhood: 'Laurel', role: 'Baker', tier: 4, src: 'output/simulation_ledger_snapshot.jsonl', why: 'lives in Laurel — Laurel patch' }], businesses: [], churches: [] },
    known: [{ id: 'F-office-COUNCIL-D9', t: 'FACT', text: 'Terrence Mobley holds COUNCIL-D9 at approval 63', src: 'engine_audit' },
      { id: 'F-crime-Laurel', t: 'FACT', text: 'Laurel crime: property 43, violent 30', src: 'engine_audit' }],
    role: { officeRows: [], civicPeers: [{ OfficeId: 'COUNCIL-D8', Holder: 'Nina Chen', District: 'D8', Approval: 62 }] },
    limits: { assert: ['only named subjects in exposure.subjects'], invent: ['no new citizens'] },
    output: { contract: 'statement + moves + numberMoved', dest: 'office wiki' },
    game: {
      board: [{ id: 'INIT-015', name: 'Laurel Neighborhood Patch', domain: 'environment', status: 'proposed', stage: 'Proposed', hoods: ['Laurel'], budget: 'budget: $6M', voteCycle: null, nextActionCycle: 115, needsNext: 'Proposed — a passed council vote funds it', sponsored: true }],
      boardIds: ['INIT-015'],
      categories: { available: true, list: [{ key: 'health', label: 'clinics, care', band: '$5M-$100M', canDeliver: true }] },
      petitionPool: { available: true, complaints: [{ cycle: '114', hood: 'Laurel', snippet: 'Nobody picked up the trash.', affect: 'Frustrated' }] },
      problemContinuity: { available: true, problems: [{ hood: 'Laurel', label: 'sick residents', count: 107 }] },
      workingCity: { available: true, text: 'The working city:\n- Marcus Webb: The queue is clean tonight. (C114)' },
      patrol: { available: true, text: 'City patrol strategy: balanced.' },
      confrontations: { available: true, open: [{ id: 'CONF-115-civic-office-council-d9', cycle: 115, demand: 'Terrence Mobley — City Council District 9 — Report.', sourceText: SOURCE }], answeredIds: [] },
    },
    brief: { sections: {
      events: { available: true, items: [], retrievalKeys: [] },
      measuredState: { districts: [{ district: 'D9', available: true, retrievalKey: 'district/D9', neighborhoods: [{ hood: 'Laurel', available: true, measured: { Sentiment: { value: '-0.15', previous: '-0.03', change: -0.12 }, CrimeIndex: { value: '0.68', previous: '0.68' } } }] }] },
      opportunities: { board: [] }, authorizedActions: { note: 'Move validation and later execution decide authority.' },
    } },
  }, over || {});
}
const UNAVAILABLE = 'unavailable this wake — not an empty record';
const LEDGER = [{ OfficeId: 'COUNCIL-D9', Approval: '63' }, { OfficeId: 'COUNCIL-D8', Approval: '59' }, { OfficeId: 'MAYOR-01', Approval: '72' }];
const TABS = {
  Civic_Office_Ledger: LEDGER,
  Neighborhood_Map: [{ Neighborhood: 'Laurel', Cycle: '115', Sentiment: '-0.15', CrimeIndex: '0.69', Spare: '' }, { Neighborhood: 'Uptown', Cycle: '115', Sentiment: '0.08', CrimeIndex: '0.62', Spare: '' },
    { Neighborhood: 'Piedmont', Cycle: '115', Sentiment: '0.31', CrimeIndex: '0.2', Spare: '' }],
  Crime_Metrics: [{ Neighborhood: 'Laurel', LastUpdated: '115', Incidents: '7' }, { Neighborhood: 'Uptown', LastUpdated: '115', Incidents: '3' }, { Neighborhood: 'Piedmont', LastUpdated: '115', Incidents: '1' }],
};
const doc = (cycle, type, content) => ({ content, createdAt: '2026-11-13T00:00:00Z', metadata: { cycle, type } });

function workspace(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seat-wake-'));
  const clean = () => fs.rmSync(root, { recursive: true, force: true });
  let out;
  try {
    for (const d of [['cron-civic', 'moves'], ['mara-directives'], ['beats', 'prev']]) fs.mkdirSync(path.join(root, 'output', ...d), { recursive: true });
    out = fn(root);
  } catch (e) { clean(); throw e; }
  if (out && typeof out.then === 'function') return out.finally(clean);
  clean();
  return out;
}
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
function dumps(root, nowCycle, prevCycle) {
  fs.writeFileSync(path.join(root, 'output', 'beats', 'meta.json'), JSON.stringify({ cycle: nowCycle }));
  fs.writeFileSync(path.join(root, 'output', 'beats', 'prev', 'meta.json'), JSON.stringify({ cycle: prevCycle }));
  writeJsonl(path.join(root, 'output', 'beats', 'Civic_Office_Ledger.jsonl'), [{ OfficeId: 'COUNCIL-D9', Approval: '63' }]);
  writeJsonl(path.join(root, 'output', 'beats', 'prev', 'Civic_Office_Ledger.jsonl'), [{ OfficeId: 'COUNCIL-D9', Approval: '64' }]);
}
function deps(root, over) {
  return Object.assign({
    root,
    sheets: { getSheetAsObjects: async (tab) => TABS[tab] || [] },
    page: { searchPage_: async () => ({ results: [doc(114, 'reflection', 'Laurel is why I am on this dais.')] }), recentPage_: async () => ({ results: [] }) },
    wp: { buildPool: async () => [{ popId: 'POP-00506', first: 'Terrence', last: 'Mobley', cur: {} }, { popId: 'POP-00034', first: 'Avery', last: 'Santana', cur: {} }],
      loadOfficeHolders: async () => ({ byPop: { 'POP-00506': { title: 'City Council District 9' }, 'POP-00034': { title: 'Mayor' } } }),
      identityLine: (c) => 'You are ' + c.first + ' ' + c.last + '. You hold the office of ' + c.office.title + '.' },
    dials: { disposition: () => 'steady' },
    maraDirective: { blocksFor: () => [SOURCE] },
  }, over || {});
}

test('the thresholds printed to a seat are the engine\'s own', () => {
  const engine = fs.readFileSync(path.join(__dirname, '..', 'phase05-citizens', 'updateCivicApprovalRatings.js'), 'utf8');
  assert.equal(Number(engine.match(/var CHALLENGER_NAMED_BELOW_ = (\d+);/)[1]), sw.CHALLENGER_NAMED_BELOW);
  assert.equal(Number(engine.match(/var SEAT_LOST_BELOW_ = (\d+);/)[1]), sw.SEAT_LOST_BELOW);
});

test('approval: now, last Cycle from the dump one Cycle back, and what puts them out — no explanation', () => workspace(async (root) => {
  dumps(root, 115, 114);
  const b = await sw.approvalBlock(OFFICE, 115, deps(root));
  assert.equal(b.text, 'Approval 63; last Cycle 64. A challenger is named below 40; below 30 the challenger takes the seat.');
  assert.equal(sw.lastCycleApproval('COUNCIL-D9', 116, root), 63, 'the sheet has moved on to C116: the C115 dump is last Cycle');
  dumps(root, 115, 113);   // no dump one Cycle back: last Cycle is left out, never a number from another week
  assert.equal((await sw.approvalBlock(OFFICE, 115, deps(root))).text, 'Approval 63. A challenger is named below 40; below 30 the challenger takes the seat.');
}));

test('the data keeps what only the pack holds and drops what tells them what to do, its rules and form, every build note, and what it picked or worded for them', () => {
  const text = sw.dataBlocks(pack(), OFFICE, 115, LEDGER).map((b) => b.title + ':\n' + b.text).join('\n\n');
  for (const gone of ['advance or hold', 'district-week', 'only named subjects', 'no new citizens', 'statement + moves', 'office wiki', 'src', '.js', '.jsonl', 'lives in Laurel', 'retrievalKey', 'district/D9',
    'Move validation', 'holds COUNCIL-D9 at approval', 'Laurel crime: property 43', 'On the record', 'Ada Lane', 'People in your district', 'Your district, Cycle 115']) assert.ok(!text.includes(gone), 'still in the wake: ' + gone);
  for (const kept of ['INIT-015', '$6M', '$5M-$100M', 'Nobody picked up the trash.', 'sick residents', 'Marcus Webb: The queue is clean tonight.', 'balanced', 'Nina Chen', 'Events in your district:\nnone']) assert.ok(text.includes(kept), 'missing: ' + kept);
});

test('their district whole: his neighborhoods\' rows off the city\'s sheets, every column, a blank one included; last Cycle on a value that moved; the city\'s high and low beneath', () => workspace(async (root) => {
  dumps(root, 115, 114);
  const d = deps(root, { sheets: { getSheetAsObjects: async (tab) => TABS[tab] || [] },
    readPrev: (tab) => (tab === 'Neighborhood_Map' ? [{ Neighborhood: 'Laurel', Cycle: '114', Sentiment: '-0.03', CrimeIndex: '0.69', Spare: '' }] : []) });
  const blocks = Object.fromEntries((await sw.districtRecords(['Laurel', 'Uptown'], 115, d)).map((b) => [b.title, b.text]));
  assert.equal(blocks['Neighborhood readings, your district, Cycle 115'],
    'Neighborhood | Cycle | Sentiment | CrimeIndex | Spare\nLaurel | 115 | -0.15 (last Cycle -0.03) | 0.69 | \nUptown | 115 | 0.08 | 0.62 | ');
  assert.ok(!blocks['Neighborhood readings, your district, Cycle 115'].includes('Piedmont'), 'only his neighborhoods');
  assert.equal(blocks['Neighborhood readings, the high and low of each column across the city, Cycle 115'],
    'Column | Highest | Lowest\nSentiment | 0.31 — Piedmont | -0.15 — Laurel\nCrimeIndex | 0.69 — Laurel | 0.2 — Piedmont');
  assert.equal(blocks['Crime, your district, Cycle 115'], 'Neighborhood | LastUpdated | Incidents\nLaurel | 115 | 7\nUptown | 115 | 3');
  assert.equal(blocks['Demographics, your district, Cycle 115'], UNAVAILABLE, 'a sheet with no rows for him is unreadable, not a quiet district');
  dumps(root, 115, 113);   // no dump one Cycle back: nothing is noted against another week
  const b2 = await sw.districtRecords(['Laurel'], 115, d);
  assert.ok(!b2[0].text.includes('last Cycle'));
  const down = await sw.districtRecords(['Laurel'], 115, deps(root, { sheets: { getSheetAsObjects: async () => { throw new Error('quota'); } } }));
  for (const b of down.filter((x) => !/high and low/.test(x.title))) assert.equal(b.text, UNAVAILABLE);
}));

test('the faction table reads the live approvals, not the office map\'s stale copy', () => {
  const text = sw.dataBlocks(pack(), OFFICE, 115, LEDGER).find((b) => b.title === 'Seats in your faction').text;
  assert.equal(text, 'Seat | Holder | District | Approval\nCOUNCIL-D8 | Nina Chen | D8 | 59');
  assert.ok(!text.includes('62'), 'the map\'s copy');
  assert.equal(sw.dataBlocks(pack(), OFFICE, 115).find((b) => b.title === 'Seats in your faction').text.split('\n')[1], 'COUNCIL-D8 | Nina Chen | D8 | ', 'no live row: blank, never the map\'s number');
});

test('a reporter\'s filing record is not a resident\'s complaint', () => {
  const p = pack();
  p.game.petitionPool.complaints = [{ cycle: '114', hood: 'Laurel', snippet: 'filed: Coliseum Lost 799 Riders on a Weekend With No Event on Its Row', affect: 'Frustrated' }, { cycle: '114', hood: 'Laurel', snippet: 'Nobody picked up the trash.', affect: 'Frustrated' }];
  const t = sw.dataBlocks(p, OFFICE, 115, LEDGER).find((b) => b.title === 'Complaints from your district').text;
  assert.equal(t, 'Cycle | Neighborhood | Said | Mood\n114 | Laurel | Nobody picked up the trash. | Frustrated');
  p.game.petitionPool.complaints = [p.game.petitionPool.complaints[0]];
  assert.equal(sw.dataBlocks(p, OFFICE, 115, LEDGER).find((b) => b.title === 'Complaints from your district').text, 'none');
});

test('an old wake\'s form fields come off the tail of a remembered statement; the statement stays', () => {
  const said = 'Laurel is not a district in crisis. I\'ll defend our momentum.';
  assert.equal(sw.withoutOldForm(said + ' | action: defend the district | signal: crime index (0.45), sentiment (0.49)'), said);
  assert.equal(sw.withoutOldForm(said), said);
  assert.equal(sw.withoutOldForm('A | B pipes stay | in the middle'), 'A | B pipes stay | in the middle');
});

test('buildWake: who and memory as the system turn; Mara\'s question then a caller\'s question last, each with who asks', () => workspace(async (root) => {
  dumps(root, 115, 114);
  const w = await sw.buildWake({ office: OFFICE, cycle: 115, pack: pack(), question: 'What do you tell Laurel about the trash?', askerLine: 'Carmen Delaine, Civic Ledger, Bay Tribune', deps: deps(root) });
  assert.match(w.system, /^You are Terrence Mobley\. You hold the office of City Council District 9\. Your temperament: steady\./);
  assert.match(w.system, /From your own memory:\n- \(Cycle 114\) Laurel is why I am on this dais\./);
  assert.ok(w.user.startsWith('Your approval:\nApproval 63; last Cycle 64.'));
  assert.ok(w.user.endsWith('Mara Vance, City Planning Director asks your office:\n\nReport what has moved on the Laurel patch. You promised to report back.\n\n' +
    'Carmen Delaine, Civic Ledger, Bay Tribune asks you:\n\nWhat do you tell Laurel about the trash?'));
  assert.ok(!w.user.includes('Acceptance') && !w.user.includes('P-1') && !w.user.includes('.claude/'));
  await assert.rejects(sw.buildWake({ office: OFFICE, cycle: 115, pack: pack(), question: 'x', deps: deps(root) }), /missing askerLine/);
  await assert.rejects(sw.buildWake({ office: { officeId: 'CHIEF-POLICE' }, cycle: 115, pack: pack(), deps: deps(root) }), /not a seat on the council template/);
}));

test('nothing put to them: nothing is added after their own record; no Mara question, no answer tool', () => workspace(async (root) => {
  dumps(root, 115, 114);
  const p = pack({ game: Object.assign({}, pack().game, { confrontations: { available: true, open: [], answeredIds: [] } }) });
  const w = await sw.buildWake({ office: OFFICE, cycle: 115, pack: p, deps: deps(root) });
  assert.ok(w.user.endsWith('What you have decided and said on the record:\n- nothing on record'));
  const names = sw.toolsFor(OFFICE, p).map((t) => t.function.name);
  assert.deepEqual(names, ['sheet_read', 'citizen_lookup', 'canon_recall', 'memory_recall', 'resident_call', 'initiative_propose', 'vote_call', 'program_renew', 'initiative_work']);
  assert.ok(sw.toolsFor(OFFICE, pack()).some((t) => t.function.name === 'directive_answer'), 'an open question brings the answer tool');
  for (const t of sw.toolsFor(OFFICE, pack())) assert.ok(!/\byou should\b|\bmust\b|\bwhen to\b/i.test(t.function.description), t.function.name + ' says when or what');
}));

test('the template is built on one seat: Mobley (District 9); the Mayor is her own template', () => workspace(async (root) => {
  assert.deepEqual([...sw.BUILT], ['COUNCIL-D9']);
  assert.equal(sw.isSeat('COUNCIL-D9'), true);
  for (const id of ['MAYOR-01', 'COUNCIL-D3', 'CHIEF-POLICE']) assert.equal(sw.isSeat(id), false, id);
  await assert.rejects(sw.buildWake({ office: MAYOR, cycle: 115, pack: pack(), deps: deps(root) }), /not a seat on the council template/);
  const reach = sw.toolsFor(OFFICE, pack()).find((t) => t.function.name === 'initiative_propose').function.parameters.properties.reach.enum;
  assert.deepEqual(reach, ['hood', 'district']);
}));

test('their decisions carry what came of each; a rejected move is not a decision; an answer carries the question', () => workspace((root) => {
  const base = 'MV-114-civic-office-council-d9-2026-11-05';
  writeJsonl(path.join(root, 'output', 'cron-civic', 'moves', 'moves_c114.jsonl'), [
    { moveId: base, cycle: 114, popid: 'POP-00506', type: 'propose', payload: { title: 'Laurel Patch', category: 'environment', reach: 'hood', hoods: ['Laurel'], budget: '$6M', problem: 'missed pickups' }, status: 'pending' },
    { moveId: base + ':rej0', cycle: 114, popid: 'POP-00506', type: 'work', payload: {}, status: 'rejected', detail: 'initiative-not-on-board' },
    { moveId: base, status: 'applied', detail: 'minted INIT-015' },
  ]);
  writeJsonl(path.join(root, 'output', 'cron-civic', 'moves', 'moves_c115.jsonl'), [
    { moveId: 'MV-115-civic-office-council-d9-2026-11-12:answer:CONF-115-civic-office-council-d9', cycle: 115, popid: 'POP-00506', type: 'answer', payload: { text: 'It sits at Proposed.', directiveCycle: 115, confrontationSeat: 'civic-office-council-d9' }, status: 'pending' },
  ]);
  fs.writeFileSync(path.join(root, 'output', 'mara-directives', 'mara_directive_c115_AUTO.txt'), SOURCE);
  const d = sw.pastDecisions('POP-00506', 'civic-office-council-d9', deps(root));
  assert.equal(d.length, 2);
  assert.equal(d[0].outcome, 'went through');
  assert.match(d[0].said, /^title: Laurel Patch; category: environment; reach: hood; hoods: Laurel; budget: \$6M; purpose: missed pickups$/);
  assert.equal(d[1].outcome, 'waiting on the week\'s close');
  assert.equal(d[1].question, 'Report what has moved on the Laurel patch. You promised to report back.');
}));

test('resident_call: by name or by a door in a neighborhood, inside the district, in the resident\'s own words', () => workspace(async (root) => {
  writeJsonl(path.join(root, 'output', 'simulation_ledger_snapshot.jsonl'), [
    { POPID: 'POP-00900', Name: 'Ada Lane', Status: 'Active', Neighborhood: 'Laurel' },
    { POPID: 'POP-00901', Name: 'Ben Ruiz', Status: 'Active', Neighborhood: 'Laurel' },
    { POPID: 'POP-00902', Name: 'Cy Moss', Status: 'Active', Neighborhood: 'Rockridge' },
    { POPID: 'POP-00903', Name: 'Dee Vann', Status: 'Retired', Neighborhood: 'Laurel' },
    { POPID: 'POP-00506', Name: 'Terrence Mobley', Status: 'Active', Neighborhood: 'Laurel' },
  ]);
  const asked = [];
  const voice = (pop, ask) => { asked.push({ pop, ask }); return { name: pop === 'POP-00900' ? 'Ada Lane' : 'Ben Ruiz', occ: 'Baker', text: 'The trash sat for a week.' }; };
  const mk = (date) => { const stage = { moves: [], calls: [] }; return { stage, exec: sw.toolExecutor({ office: OFFICE, cycle: 115, date, stage, validate: () => ({ accepted: [], rejected: [] }), inDistrict: (h) => h === 'Laurel', deps: deps(root, { voice }) }) }; };
  const a = mk('2026-11-16');
  assert.equal(await a.exec('resident_call', { name: 'Ada Lane', question: 'How is the block?' }), 'Ada Lane, Baker, Laurel:\nThe trash sat for a week.');
  assert.equal(asked[0].ask, 'Terrence Mobley, who holds the office of City Council District 9, calls on you and asks: "How is the block?"');
  assert.equal(await a.exec('resident_call', { name: 'Cy Moss', question: 'x' }), 'Cy Moss lives in Rockridge, outside your district');
  assert.match(await a.exec('resident_call', { name: 'Nobody Here', question: 'x' }), /no one by the name/);
  assert.equal(await a.exec('resident_call', { name: 'Ada Lane' }), 'no call: a question is needed');
  await a.exec('resident_call', { neighborhood: 'Laurel', question: 'What is good here?' });
  const door = asked[asked.length - 1].pop;
  assert.ok(['POP-00900', 'POP-00901'].includes(door), 'a door is an active resident of the neighborhood, never the seat or a retired row');
  const b = mk('2026-11-16'); await b.exec('resident_call', { name: 'Ada Lane', question: 'How is the block?' }); await b.exec('resident_call', { neighborhood: 'Laurel', question: 'again' });
  assert.equal(asked[asked.length - 1].pop, door, 'the same call reaches the same door');
  assert.equal(a.stage.calls.length, 2);
  const c = mk('2026-11-16');
  const down = sw.toolExecutor({ office: OFFICE, cycle: 115, date: 'd', stage: c.stage, validate: () => ({ accepted: [], rejected: [] }), inDistrict: () => true, deps: deps(root, { voice: () => { throw new Error('exit 2'); } }) });
  assert.equal(await down('resident_call', { name: 'Ada Lane', question: 'x' }), 'Ada Lane could not be reached');
}));

test('a move is staged through the gate: filed, refused with the gate\'s reason, or already filed this wake', () => workspace(async (root) => {
  const stage = { moves: [], calls: [] };
  const validate = (moves) => ({ accepted: moves.filter((m) => m.initiativeId !== 'INIT-999'), rejected: moves.filter((m) => m.initiativeId === 'INIT-999').map((m) => ({ move: m, reason: 'initiative-not-on-board(INIT-999)' })) });
  const exec = sw.toolExecutor({ office: OFFICE, cycle: 115, date: 'd', stage, validate, inDistrict: () => true, confrontationId: 'CONF-115-civic-office-council-d9', deps: deps(root) });
  assert.match(await exec('initiative_work', { initiativeId: 'INIT-015' }), /^filed: work on INIT-015/);
  assert.equal(await exec('initiative_work', { initiativeId: 'INIT-015' }), 'not filed: already filed this wake');
  assert.equal(await exec('vote_call', { initiativeId: 'INIT-999' }), 'not filed: initiative-not-on-board(INIT-999)');
  assert.match(await exec('initiative_propose', { title: 'Laurel Tool Library', purpose: 'tools to borrow', category: 'environment', reach: 'hood', hoods: ['Laurel'], budget: '$2M' }), /^filed: "Laurel Tool Library"/);
  assert.match(await exec('directive_answer', { text: 'It sits at Proposed.' }), /^filed: your reply/);
  assert.deepEqual(stage.moves.map((m) => m.type), ['work', 'propose', 'answer']);
  assert.equal(stage.moves[2].confrontationId, 'CONF-115-civic-office-council-d9');
  const noQ = sw.toolExecutor({ office: OFFICE, cycle: 115, date: 'd', stage: { moves: [], calls: [] }, validate, inDistrict: () => true, deps: deps(root) });
  assert.match(await noQ('directive_answer', { text: 'x' }), /no question from the City Planning Director is open/);
}));

test('the door pick is a hash, not a draw', () => {
  const list = ['a', 'b', 'c', 'd'];
  assert.equal(sw.hashPick(list, 'k1'), sw.hashPick(list, 'k1'));
  assert.equal(sw.hashPick([], 'k'), null);
  assert.ok(!/Math\.random/.test(fs.readFileSync(path.join(__dirname, 'seatWake.js'), 'utf8')));
});

test('the resident\'s words are read from the JSON printed last, past the env banner and log lines', () => {
  const out = '◇ injected env (33) from ../.config/godworld/.env\nsome log line\n' + JSON.stringify({ popId: 'POP-00900', name: 'Ada Lane', text: 'The trash sat {a week}.' }, null, 2) + '\n';
  assert.equal(sw.parseVoiceOutput(out).text, 'The trash sat {a week}.');
  assert.throws(() => sw.parseVoiceOutput('◇ injected env\n'), /no JSON object/);
});

test('a record that could not be read says so instead of printing none or vanishing', () => {
  const p = pack();
  p.brief.sections.events = { available: false, items: [] };
  p.game = Object.assign({}, p.game, { petitionPool: { available: false }, patrol: { available: false }, board: [], boardAvailable: false });
  const blocks = Object.fromEntries(sw.dataBlocks(p, OFFICE, 115).map((b) => [b.title, b.text]));
  for (const t of ['Events in your district', 'Complaints from your district', 'The patrol setting', 'Your board']) assert.equal(blocks[t], 'unavailable this wake — not an empty record', t);
});

test('an event prints its fact, when and where — never its id, source path or retrieval key (codex F1)', () => {
  const p = pack();
  p.brief.sections.events = { available: true, items: [{ eventId: 'EV-sports-1', occurredCycle: 111, category: 'sports-parade', significance: 'major', hoods: ['Downtown'], citywideRelevance: true,
    sourceRef: 'output/beats/Oakland_Sports_Feed.jsonl:238', fact: 'The parade rolls through Downtown.', retrievalKey: 'event/EV-sports-1' }, { eventId: 'EV-2', sourceRef: 'x.jsonl:1' }] };
  const text = sw.dataBlocks(p, OFFICE, 115).find((b) => b.title === 'Events in your district').text;
  assert.equal(text, 'Cycle | Where | What | Size\n111 | Downtown | The parade rolls through Downtown. | major');
});

test('an unreadable resident ledger is unavailable, not an empty city (codex F2); one proposal of a title a wake (codex F3)', () => workspace(async (root) => {
  const stage = { moves: [], calls: [] };
  const exec = sw.toolExecutor({ office: OFFICE, cycle: 115, date: 'd', stage, validate: (moves) => ({ accepted: moves, rejected: [] }), inDistrict: () => true, deps: deps(root, { voice: () => ({ text: 'x' }) }) });
  assert.equal(await exec('resident_call', { name: 'Ada Lane', question: 'How is the block?' }), 'the city\'s ledger is unavailable right now — this is not an empty record');
  const prop = { title: 'Laurel Tool Library', purpose: 'tools', category: 'environment', reach: 'hood', hoods: ['Laurel'], budget: '$2M' };
  assert.match(await exec('initiative_propose', prop), /^filed/);
  assert.equal(await exec('initiative_propose', Object.assign({}, prop, { title: ' laurel tool library ' })), 'not filed: already filed this wake');
  assert.match(await exec('initiative_propose', Object.assign({}, prop, { title: 'Uptown Bench Fund' })), /^filed/);
  assert.equal(stage.moves.length, 2);
}));
