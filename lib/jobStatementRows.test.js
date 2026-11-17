/**
 * jobStatementRows.test.js — where a statement made in a job lands, and how it reaches the ledger
 * (engine.347 Task 5). Run: node lib/jobStatementRows.test.js   (exits 0 pass / 1 fail). No API, no sheet.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const js = require('./jobStatementRows');
const dm = require('../utilities/citizenDialMap');
const rc = require('./reflectionClassifier');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jobrows-'));
const noLock = async (lockPath, fn) => fn();
const HEADER = ['Timestamp', 'POPID', 'Cycle', 'Daypart', 'Tag', 'ReflectionExcerpt', 'Applied', 'Affect'];
// the fold's own composer, on a snippet full of words the text router acts on
const fold = (event, affect) => dm.nudgesForReflection_(event, affect, 1, 'hospital community promoted award');

(async () => {
  console.log('Test 1: the landing rule — only what shows');
  {
    const every = rc.EVENT_VOCAB.map((v) => v[0]);
    const placed = new Set([...js.BAD_EVENTS, ...js.LANDS_NOTHING]);
    assert('every classifier event tag is placed in exactly one list', every.every((t) => placed.has(t)) && js.BAD_EVENTS.every((t) => !js.LANDS_NOTHING.includes(t)) && placed.size === every.length,
      every.filter((t) => !placed.has(t)).join(',') + ' / ' + [...placed].filter((t) => !every.includes(t)).join(','));
    assert('the no-move event is a dial-map key that moves nothing', dm.DIAL_MAP.hasOwnProperty(js.NO_MOVE_EVENT) && Object.keys(dm.DIAL_MAP[js.NO_MOVE_EVENT]).length === 0);
    assert('each kept event is a dial-map key and moves a dial down, none up', js.BAD_EVENTS.every((t) => dm.DIAL_MAP.hasOwnProperty(t) && Object.keys(fold(t, 'Flat')).length > 0 && Object.values(fold(t, 'Flat')).every((v) => v < 0)));
    assert('Setback is not kept: on this path it moves nothing (composure comes from the mood alone)', js.LANDS_NOTHING.includes('Setback') && same(fold('Setback', 'Flat'), {}));
    for (const t of js.LANDS_NOTHING) {
      const l = js.landRead({ event: t, affect: 'Flat' });
      if (l.event !== js.NO_MOVE_EVENT || Object.keys(fold(l.event, l.affect)).length) assert('a ' + t + ' statement with no feeling moves nothing', false, JSON.stringify(fold(l.event, l.affect)));
    }
    assert('all ' + js.LANDS_NOTHING.length + ' doing-the-job tags land at nothing with no feeling', true);
    assert('Career | Flat: drive untouched (it was +4)', same(fold(js.landRead({ event: 'Career', affect: 'Flat' }).event, 'Flat'), {}) && dm.DIAL_MAP.Career.drive === 4);
    assert('Career | Anxious: the mood alone moves', same(fold(js.landRead({ event: 'Career', affect: 'Anxious' }).event, 'Anxious'), fold('', 'Anxious')) && fold('', 'Anxious').composure < 0);
    assert('Civic | Energized: the mood alone moves, up', same(fold(js.landRead({ event: 'Civic', affect: 'Energized' }).event, 'Energized'), fold('', 'Energized')) && fold('', 'Energized').composure > 0);
    assert('Stumble | Flat keeps its event: drive down', same(js.landRead({ event: 'Stumble', affect: 'Flat' }), { event: 'Stumble', affect: 'Flat', read: 'Stumble' }) && fold('Stumble', 'Flat').drive < 0);
    assert('the read tag is carried for the log', js.landRead({ event: 'Career', affect: 'Flat' }).read === 'Career');
    assert('a mood with no event writes a blank event', same(js.landRead({ event: null, affect: 'Angry' }), { event: '', affect: 'Angry', read: '' }));
    assert('an event with no mood writes a blank mood', same(js.landRead({ event: 'Media', affect: null }), { event: 'Civic', affect: '', read: 'Media' }));
    assert('neither: no row', js.landRead({ event: null, affect: null }) === null && js.landRead(null) === null);
  }

  console.log('\nTest 2: sittings — one a speaker a Central day for CIVIC, one a Cycle for directive and journal');
  {
    assert('Sunday 14:30 and the 21:00 retry are one Central day', js.sittingKey('pop-00034', 116, 'CIVIC', '2026-11-15T20:30:00Z') === js.sittingKey('POP-00034', '116', 'CIVIC', '2026-11-16T03:00:00Z'));
    assert('Monday 05:45 is another sitting', js.sittingKey('POP-00034', 116, 'CIVIC', '2026-11-16T03:00:00Z') !== js.sittingKey('POP-00034', 116, 'CIVIC', '2026-11-16T11:45:00Z'));
    assert('a journal is keyed by Cycle, not day', js.sittingKey('POP-00789', 116, 'journal', '2026-11-15T20:30:00Z') === js.sittingKey('POP-00789', 116, 'journal', '2026-11-19T20:30:00Z'));
    assert('job dayparts, any case', js.isJobDaypart('CIVIC') && js.isJobDaypart('civic') && js.isJobDaypart('Directive') && js.isJobDaypart('JOURNAL') && !js.isJobDaypart('work') && !js.isJobDaypart('PRESS') && !js.isJobDaypart(''));
    assert('excerpt: whitespace folded, cut at the cap', js.excerptOf('a\n\n b') === 'a b' && js.excerptOf('x'.repeat(5000)).length === js.EXCERPT_MAX && /…$/.test(js.excerptOf('x'.repeat(5000))));
  }

  console.log('\nTest 3: queue refuses what is not a statement and never throws');
  {
    const dir = tmp();
    assert('no POPID', js.queue({ pop: '', cycle: 116, daypart: 'CIVIC', text: 'x' }, { dir }).queued === false);
    assert('no Cycle', js.queue({ pop: 'POP-00034', cycle: 'current', daypart: 'CIVIC', text: 'x' }, { dir }).queued === false);
    assert('unknown daypart', js.queue({ pop: 'POP-00034', cycle: 116, daypart: 'work', text: 'x' }, { dir }).queued === false);
    assert('no words', js.queue({ pop: 'POP-00034', cycle: 116, daypart: 'CIVIC', text: '  ' }, { dir }).queued === false);
    assert('nothing was written', !fs.existsSync(path.join(dir, 'spool_c116.jsonl')));
    const blocker = path.join(dir, 'a-file'); fs.writeFileSync(blocker, 'x');
    assert('an unwritable folder is a refusal, not a throw', js.queue({ pop: 'POP-00034', cycle: 116, daypart: 'CIVIC', text: 'x' }, { dir: path.join(blocker, 'under') }).queued === false);
    assert('a good line queues', js.queue({ pop: 'pop-00034', cycle: '116', daypart: 'CIVIC', text: 'x' }, { dir }).queued === true && fs.readFileSync(path.join(dir, 'spool_c116.jsonl'), 'utf8').includes('"pop":"POP-00034"'));
  }

  console.log('\nTest 4: a sitting is read line by line; its row carries the feeling shown most');
  {
    const F = { event: 'Civic', affect: 'Flat' };
    const c = (reads) => js.composeSitting(reads);
    assert('one angry line among flat ones is not drowned (replay: Rivers, Mobley)', c([{ event: 'Civic', affect: 'Angry' }, F, F]).affect === 'Angry');
    assert('two flat lines stay Flat (replay: a joined read invented Energized)', same([c([F, { event: 'Career', affect: 'Flat' }]).event, c([F, { event: 'Career', affect: 'Flat' }]).affect], ['Civic', 'Flat']));
    assert('the mood in the most lines wins', c([{ event: 'Civic', affect: 'Frustrated' }, { event: 'Civic', affect: 'Frustrated' }, { event: 'Civic', affect: 'Energized' }, F]).affect === 'Frustrated');
    assert('a tie goes to the larger move', c([{ event: 'Civic', affect: 'Energized' }, { event: 'Civic', affect: 'Angry' }]).affect === 'Angry');
    assert('an equal tie goes to the earlier line', c([{ event: 'Civic', affect: 'Anxious' }, { event: 'Civic', affect: 'Frustrated' }]).affect === 'Anxious' && c([{ event: 'Civic', affect: 'Frustrated' }, { event: 'Civic', affect: 'Anxious' }]).affect === 'Frustrated');
    assert('a bad event in one line is kept; Career in another is not', c([{ event: 'Career', affect: 'Flat' }, { event: 'Stumble', affect: 'Flat' }]).event === 'Stumble');
    assert('the row names the lines that carry it', same(c([F, { event: 'Civic', affect: 'Angry' }, F, { event: 'Spat', affect: 'Flat' }]).lines, [1, 3]) && same(c([F, F]).lines, [0, 1]));
    assert('a line with no read is left out; all lines with no read: no row', same(c([null, { event: 'Civic', affect: 'Calm' }]).lines, [1]) && c([null, { event: null, affect: null }]) === null);
    assert('the log line counts what was read', c([{ event: 'Career', affect: 'Flat' }, { event: 'Civic', affect: 'Angry' }]).read === 'Career 1, Civic 1 / Flat 1, Angry 1');
    assert('a mood with no event anywhere: blank event', same([c([{ event: null, affect: 'Angry' }]).event, c([{ event: null, affect: 'Angry' }]).affect], ['', 'Angry']));
  }

  console.log('\nTest 5: flush — a Sunday of lines is one row a speaker, by what shows');
  {
    const dir = tmp();
    const q = (pop, daypart, text, now) => js.queue({ pop, cycle: 116, daypart, text }, { dir, now });
    for (let i = 0; i < 21; i++) q('POP-00034', 'CIVIC', 'Mayor line ' + i + (i === 7 || i === 9 ? ' and I am fed up' : ''), '2026-11-15T20:3' + (i % 10) + ':00Z');
    q('POP-00042', 'CIVIC', 'I am furious with the department.', '2026-11-15T20:40:00Z');
    q('POP-00042', 'CIVIC', 'The schedule is attached.', '2026-11-15T20:41:00Z');
    q('POP-00789', 'journal', 'Nothing has shipped from me.', '2026-11-15T21:00:00Z');
    q('POP-00507', 'directive', 'Provide the reconciliation.', '2026-11-15T21:05:00Z');
    assert('the same words from the same speaker queue once (a stage that re-runs)', q('POP-00042', 'CIVIC', 'The schedule is attached.', '2026-11-16T03:00:00Z').why === 'already queued');
    const sheet = [HEADER];
    const seen = [];
    let readCalls = 0;
    const classify = async (text) => {
      seen.push(text);
      if (/fed up/.test(text)) return { event: 'Career', affect: 'Frustrated' };
      if (/Mayor/.test(text)) return { event: 'Career', affect: 'Flat' };
      if (/furious/.test(text)) return { event: 'Civic', affect: 'Angry' };
      if (/shipped/.test(text)) return { event: 'Stumble', affect: 'Anxious' };
      if (/Monday/.test(text)) return { event: 'Civic', affect: 'Content' };
      return { event: 'Civic', affect: 'Flat' };
    };
    const io = { dir, lock: noLock, readRows: async () => { readCalls++; return sheet; }, appendRows: async (rows) => { sheet.push(...rows); }, classify };
    const r = await js.flush(io);
    const rows = sheet.slice(1);
    assert('four speakers, four rows', r.ran && r.landed === 4 && rows.length === 4, JSON.stringify(r));
    const mayor = rows.find((x) => x[1] === 'POP-00034');
    assert('the mayor: one row for 21 lines, each line read once on its own', mayor && seen.filter((t) => /Mayor/.test(t)).length === 21 && seen.every((t) => !/\n/.test(t)));
    assert('his Career reads are stored Civic; the feeling two lines showed is the row\'s mood', mayor[4] === 'Civic' && mayor[7] === 'Frustrated' && same(fold(mayor[4], mayor[7]), fold('', 'Frustrated')));
    assert('the row\'s text is the lines that carried it', mayor[5] === 'Mayor line 7 and I am fed up Mayor line 9 and I am fed up');
    assert('column A is the first line\'s time, not the flush\'s', mayor[0] === '2026-11-15T20:30:00.000Z');
    assert('row shape A–K, applied no, no bond, tension or resolve', rows.every((x) => x.length === 11 && x[6] === 'no' && x[8] === '' && x[9] === '' && x[10] === '' && x[2] === 116));
    const vega = rows.find((x) => x[1] === 'POP-00042');
    assert('an angry line beside a flat one: composure and warmth down', vega[3] === 'CIVIC' && vega[4] === 'Civic' && vega[7] === 'Angry' && vega[5] === 'I am furious with the department.' && fold(vega[4], vega[7]).composure < 0 && fold(vega[4], vega[7]).warmth < 0);
    const varek = rows.find((x) => x[1] === 'POP-00789');
    assert('Varek: journal daypart, the bad event kept', varek[3] === 'journal' && varek[4] === 'Stumble' && varek[7] === 'Anxious');
    const mara = rows.find((x) => x[1] === 'POP-00507');
    assert('Mara: directive daypart, plain business lands at nothing', mara[3] === 'directive' && same(fold(mara[4], mara[7]), {}));
    assert('the sheet was read once', readCalls === 1);

    const again = await js.flush(io);
    assert('a second flush writes nothing and does not read the sheet', again.landed === 0 && sheet.length === 5 && readCalls === 1);

    q('POP-00034', 'CIVIC', 'One more thing, flatly.', '2026-11-16T03:00:00Z');   // the 21:00 retry, same Central day
    const later = await js.flush(io);
    assert('a later run the same day is its own sitting: read, landed, nothing dropped', later.landed === 1 && later.late === 0 && sheet.length === 6 && sheet[5][0] === '2026-11-16T03:00:00.000Z' && sheet[5][5] === 'One more thing, flatly.' && sheet[5][7] === 'Flat');

    q('POP-00034', 'CIVIC', 'Monday morning statement.', '2026-11-16T11:45:00Z');
    const monday = await js.flush(io);
    assert('his Monday wake is its own row', monday.landed === 1 && sheet.length === 7 && sheet[6][0] === '2026-11-16T11:45:00.000Z' && sheet[6][7] === 'Content');

    q('POP-00789', 'journal', 'The journal, written again on a retry.', '2026-11-16T12:00:00Z');
    const redo = await js.flush(io);
    assert('a journal rewritten on a retry is logged, not read, no second row', redo.late === 1 && redo.landed === 0 && sheet.length === 7 && !seen.some((t) => /written again/.test(t)));
    assert('and is reported once', (await js.flush(io)).late === 0);
  }

  console.log('\nTest 6: flush — the sheet check, classifier errors, off-vocabulary reads, a failed append, an old Cycle');
  {
    const dir = tmp();
    js.queue({ pop: 'POP-00501', cycle: 116, daypart: 'CIVIC', text: 'Brooklyn is moving.' }, { dir, now: '2026-11-17T11:45:00.000Z' });
    const sheet = [HEADER, ['2026-11-17T11:45:00.000Z', 'POP-00501', '116', 'CIVIC', 'Civic', 'Brooklyn is moving.', 'no', 'Flat', '', '', '']];
    let classified = 0;
    const io = { dir, lock: noLock, readRows: async () => sheet, appendRows: async (rows) => { sheet.push(...rows); }, classify: async () => { classified++; return { event: 'Civic', affect: 'Flat' }; } };
    const r = await js.flush(io);
    assert('a sitting already on the sheet (a crash before the mark) is not written again or re-read', r.present === 1 && r.landed === 0 && sheet.length === 2 && classified === 0);
    const s0 = { pop: 'POP-00501', cycle: 116, daypart: 'CIVIC', at: '2026-11-17T11:45:00.000Z' };
    assert('a work row, another speaker, another Cycle or another instant is not this sitting', !js.onSheet([HEADER, [s0.at, 'POP-00501', '116', 'work', 'Career', 'x', 'no', 'Calm']], s0)
      && !js.onSheet([HEADER, [s0.at, 'POP-00502', '116', 'CIVIC', 'Civic', 'x', 'no', 'Calm']], s0) && !js.onSheet([HEADER, [s0.at, 'POP-00501', '115', 'CIVIC', 'Civic', 'x', 'no', 'Calm']], s0)
      && !js.onSheet([HEADER, ['2026-11-17T11:46:00.000Z', 'POP-00501', '116', 'CIVIC', 'Civic', 'x', 'no', 'Calm']], s0));
    assert('a journal is on the sheet at any instant of its Cycle', js.onSheet([HEADER, ['2026-11-19T00:00:00.000Z', 'POP-00789', 116, 'journal', 'Civic', 'x', 'no', 'Calm']], { pop: 'POP-00789', cycle: 116, daypart: 'journal', at: '2026-11-15T21:00:00.000Z' }));

    const dir2 = tmp();
    js.queue({ pop: 'POP-00502', cycle: 116, daypart: 'CIVIC', text: 'A statement.' }, { dir: dir2, now: '2026-11-17T11:45:00Z' });
    js.queue({ pop: 'POP-00502', cycle: 116, daypart: 'CIVIC', text: 'A second line.' }, { dir: dir2, now: '2026-11-17T11:45:01Z' });
    const sheet2 = [HEADER];
    const io2 = { dir: dir2, lock: noLock, readRows: async () => sheet2, appendRows: async (rows) => { sheet2.push(...rows); }, classify: async (t) => (/second/.test(t) ? { event: null, affect: null, raw: '[err] 429' } : { event: 'Civic', affect: 'Angry' }) };
    let last;
    for (let i = 0; i < js.MAX_TRIES - 1; i++) last = await js.flush(io2);
    assert('a classifier error on one line keeps the whole sitting queued (no half-read row)', last.retry === 1 && last.dropped === 0 && sheet2.length === 1);
    io2.classify = async () => { throw new Error('socket hang up'); };
    last = await js.flush(io2);
    assert('after ' + js.MAX_TRIES + ' flushes it is dropped, said so, and no row', last.dropped === 1 && sheet2.length === 1);
    io2.classify = async () => ({ event: 'Civic', affect: 'Flat' });
    assert('a dropped sitting is not revived', (await js.flush(io2)).landed === 0);

    const dir3 = tmp();
    js.queue({ pop: 'POP-00503', cycle: 116, daypart: 'CIVIC', text: 'A statement.' }, { dir: dir3, now: '2026-11-17T11:45:00Z' });
    const sheet3 = [HEADER];
    const io3 = { dir: dir3, lock: noLock, readRows: async () => sheet3, appendRows: async (rows) => { sheet3.push(...rows); }, classify: async () => ({ event: null, affect: null, raw: 'Banana | Splat' }) };
    const off = await js.flush(io3);
    assert('an off-vocabulary read is dropped at once: no row, no Flat stand-in', off.dropped === 1 && off.retry === 0 && sheet3.length === 1);

    const dir4 = tmp();
    js.queue({ pop: 'POP-00504', cycle: 116, daypart: 'CIVIC', text: 'A statement.' }, { dir: dir4, now: '2026-11-17T11:45:00Z' });
    const sheet4 = [HEADER];
    let fail = true;
    const io4 = { dir: dir4, lock: noLock, readRows: async () => sheet4, appendRows: async (rows) => { if (fail) throw new Error('quota'); sheet4.push(...rows); }, classify: async () => ({ event: 'Civic', affect: 'Calm' }) };
    const bad = await js.flush(io4);
    assert('a failed append does not throw and marks nothing', bad.error === 'quota' && bad.landed === 0 && !fs.existsSync(path.join(dir4, 'landed_c116.jsonl')));
    fail = false;
    assert('the next flush lands it', (await js.flush(io4)).landed === 1 && sheet4.length === 2);

    js.queue({ pop: 'POP-00505', cycle: 115, daypart: 'CIVIC', text: 'Queued by the tick last Cycle, never flushed.' }, { dir: dir4, now: '2026-11-12T23:00:00Z' });
    js.queue({ pop: 'POP-00505', cycle: 117, daypart: 'CIVIC', text: 'This Cycle.' }, { dir: dir4, now: '2026-11-23T11:45:00Z' });
    const old = await js.flush(io4);
    assert('a line left in an earlier Cycle\'s spool lands at the next flush, under its own Cycle', old.landed === 2 && sheet4.some((x) => x[1] === 'POP-00505' && x[2] === 115) && sheet4.some((x) => x[1] === 'POP-00505' && x[2] === 117));

    const held = await js.flush({ dir: dir4, lock: async () => null, readRows: async () => sheet4, appendRows: async () => {}, classify: async () => ({}) });
    assert('a held lock: nothing runs, nothing throws', held.ran === false);
    assert('no spool folder: nothing to do', (await js.flush({ dir: path.join(dir4, 'none'), lock: noLock })).ran === true);
    let longest = 0;
    const dir5 = tmp();
    js.queue({ pop: 'POP-00140', cycle: 116, daypart: 'CIVIC', text: 'y'.repeat(20000) }, { dir: dir5 });
    const sheet5 = [HEADER];
    await js.flush({ dir: dir5, lock: noLock, readRows: async () => sheet5, appendRows: async (rows) => { sheet5.push(...rows); }, classify: async (t) => { longest = Math.max(longest, t.length); return { event: 'Civic', affect: 'Flat' }; } });
    assert('a long statement: the classifier gets the read cap, the cell the excerpt cap', longest === js.READ_MAX && sheet5[1][5].length === js.EXCERPT_MAX);
  }

  console.log('\nTest 7: the writers queue after their page write; the stages flush; the other readers leave the rows out');
  {
    const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const civic = src('scripts/cron-civic-run.js');
    const fnBody = (text, name) => { const a = text.indexOf('function ' + name + '('); const b = text.indexOf('\n}\n', a); return a < 0 ? '' : text.slice(a, b); };
    const cascade = fnBody(civic, 'positionWallRecordCascade');
    assert('Sunday statements: queued per recorded line, only when the page write is recorded', /r\.recorded === true && r\.holder\) for \(const said of r\.said \|\| \[\]\) queueJobStatement\(r\.holder\.popid, cycle, 'CIVIC', said,/.test(cascade));
    const dw = fnBody(civic, 'positionWallRecordDatawake');
    assert('weekday seats: the statement itself, after a recorded page write', /if \(r\.recorded === true\) queueJobStatement\(rec\.popid, rec\.cycle, 'CIVIC', officeWall\.statementOf\(rec\),/.test(dw) && dw.indexOf('recordPosition(') < dw.indexOf('queueJobStatement('));
    const worker = fnBody(civic, 'runWorkerDatawake');
    assert('workers: the whole statement, after a recorded page write, never on the no-write path', /if \(rec\.positionWall\.recorded === true\) queueJobStatement\(rec\.popid, rec\.cycle, 'CIVIC', statement,/.test(worker) && worker.indexOf('if (o.noWrite)') < worker.indexOf('queueJobStatement('));
    const commit = fnBody(civic, 'commitDirectiveWrites');
    assert('Mara: her directive and notes, once her entry is on her page, into the run\'s own root', /if \(done\(entryId\)\) \{/.test(commit) && /queueJobStatement\(MARA_POP, Number\(cycle\), 'directive', said, 'directive', path\.join\(opts\.root,/.test(commit) && !/runEntry\]/.test(commit.slice(commit.indexOf('const said'))));
    assert('her words are staged beside the run entry (the resume reads them)', /staged\.said = winner\.result\.blocks\.concat\(/.test(civic));
    const dwRun = fnBody(civic, 'runDatawake');
    assert('the weekday stage flushes before its exit code', dwRun.indexOf('await flushJobStatements();') > 0 && dwRun.indexOf('await flushJobStatements();') < dwRun.lastIndexOf('process.exit(1)'));
    const chain = fnBody(civic, 'runChain');
    assert('the Sunday chain flushes before the close', chain.indexOf('await flushJobStatements();') > 0 && chain.indexOf('await flushJobStatements();') < chain.indexOf('await runClose();'));
    assert('any stage that ends normally flushes; the tick and status do not', /\.then\(\(\) => \(STAGE === 'tick' \|\| STAGE === 'status' \? null : flushJobStatements\(\)\)\)/.test(civic));
    assert('the flush reads the sheet and the live triple classifier', /getRawSheetData\('Reflection_Intake'\)/.test(fnBody(civic, 'flushJobStatements')) && /classifyTripleReflection_\(text, open\)/.test(fnBody(civic, 'flushJobStatements')));
    const wall = require('../scripts/officeWall');
    const L = wall.linesFromCascadeStatements([{ topic: 'Budget', quote: 'I will not sign it.', fullStatement: 'A longer statement.', statementId: 's1' }, { topic: 'Only a topic' }], 'Avery Santana');
    assert('a Sunday line carries the holder\'s own words without the frame', L[0].said === 'I will not sign it.' && /^stated: \[Budget\] Avery Santana — I will not sign it\.$/.test(L[0].text) && L[1].said === '');
    assert('a weekday statement is read whole; an object where a sentence belongs gives its text', wall.statementOf({ statement: 'x'.repeat(900) }).length === 900 && wall.statementOf({ statement: { text: 'said' } }) === 'said' && wall.statementOf({}) === '');
    const civis = src('scripts/civisJournal.js');
    assert('Varek: queued after the page append, from the command line\'s live wiring only', civis.indexOf('page.appendReflection_(POPID') < civis.indexOf('opts.jobRows.queue({ pop: POPID, cycle, daypart: WAKE') && /const jobRows = dry \? null : \{/.test(civis));
    assert('the petition count leaves job statements out', /if \(key\(row\.Tag\) !== 'civic'\) continue;\n\s+if \(isJobDaypart\(row\.Daypart\)\) continue;/.test(src('scripts/civicPetitions.js')));
    assert('the office slice\'s petition pool leaves them out', /if \(tag !== 'Civic'\) continue;\n\s+if \(isJobDaypart\(reflectionField\(r, \['Daypart', 'daypart'\]\)\)\) continue;/.test(src('scripts/buildCivicOfficeSlice.js')));
    assert('the week digest leaves them out', /if \(isJobDaypart\(r\[ri\.kind\]\)\) continue;/.test(src('scripts/buildCitizenWeekDigest.js')));
    assert('the week view leaves them out of said', /r\.Daypart === 'PRINT' \|\| isJobDaypart\(r\.Daypart\)\) return;/.test(src('world-view/build.js')));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
