// Run 5 (pipeline.110 Task 9): one project director run as the police chief ran (Runs 3 and 4).
// Part A, one ask: a council seat puts one question to the director; the director wakes on the sheet line, the
//   page memory and the whole of the project record, and answers. The answer is drawn N times.
// Part B, the ask inside the seat's real weekday wake: the Run 4 offer (the chief and the five directors), N chains.
// Run under scripts/guard/nowrite.js. Nothing is written anywhere but this folder.
require('/root/GodWorld/lib/env');
const fs = require('fs'), path = require('path'), https = require('https');
const ROOT = '/root/GodWorld';
const civic = require(ROOT + '/scripts/cron-civic-run.js');
const { buildPack, gamePromptView } = require(ROOT + '/scripts/buildCivicOfficeSlice');
const { promptBrief } = require(ROOT + '/scripts/civicBrief');
const civicSeat = require(ROOT + '/scripts/civicSeat');
const officeWall = require(ROOT + '/scripts/officeWall');
const dials = require(ROOT + '/lib/citizenDials');
const wp = require(ROOT + '/lib/wakePerception');
const sheets = require(ROOT + '/lib/sheets');
const [askerDir, workerKey, cycle, runsArg] = process.argv.slice(2);
const RUNS = Number(runsArg || 3);
const officeMap = JSON.parse(fs.readFileSync(ROOT + '/scripts/civic-office-map.json', 'utf8'));
const TASK_KEYS = ['task', 'prewrite', 'output', 'limits'];   // the weekday wake's own task wording, not data

function call(model, system, user) {
  const body = JSON.stringify({ model, ...(/^deepseek\/deepseek-v4/.test(model) ? { reasoning: { enabled: false } } : {}), messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Length': Buffer.byteLength(body) }, timeout: 180000 }, (res) => {
      let b = ''; res.on('data', (d) => b += d); res.on('end', () => { try { const o = JSON.parse(b); if (o.error) return reject(new Error(JSON.stringify(o.error).slice(0, 300))); resolve({ text: o.choices[0].message.content || '', cost: (o.usage || {}).cost || 0 }); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('timeout'))); req.write(body); req.end();
  });
}
const parse = (t) => { try { const s = String(t).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''); return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); } catch (e) { return null; } };
const ungrounded = (hay, text, ctx) => { try { return [...civic.ungroundedNumbers(hay, [text], ctx)]; } catch (e) { return ['check failed: ' + e.message]; } };

(async () => {
  // the sheet line, from the live daily wake's own functions: ledger row, office sheet, dials
  const pool = await wp.buildPool({ shapedMin: 0, lifeMinChars: 0 });
  const offices = await wp.loadOfficeHolders();
  const sheetLine = (popid) => {
    const c = pool.find((x) => x.popId === String(popid).toUpperCase());
    if (!c) return null;
    const cc = { ...c, office: offices.byPop[c.popId] };
    let disp = ''; try { disp = dials.disposition(c.cur) || ''; } catch (e) {}
    return wp.identityLine(cc) + (disp ? ' Your temperament: ' + disp + '.' : '');
  };
  const tracker = await sheets.getSheetAsObjects('Initiative_Tracker');   // live, read only
  const crime = await sheets.getSheetAsObjects('Crime_Metrics');
  const memoryOf = async (row) => { try { const wall = await officeWall.loadPositionWall(row.popid, 6); return officeWall.formatPositionWall(wall, { name: row.holder, holder: row.holder, title: row.title }) || ''; } catch (e) { return ''; } };
  const packData = (agentDir) => { const v = { ...promptBrief(buildPack({ cycle, agentDir, root: ROOT })) }; for (const k of TASK_KEYS) delete v[k]; if (v.game) v.game = gamePromptView(v.game); return JSON.stringify(v); };
  const recordOf = (row) => {
    if (row.officeId === 'CHIEF-POLICE') return { name: 'the city\'s crime sheet', text: packData(row.agentDir) + '\n\nThe city\'s crime sheet, every neighborhood, this Cycle:\n' + crime.map((c) => JSON.stringify(c)).join('\n') };
    const t = tracker.find((x) => x.InitiativeID === row.initiative) || {};
    return { name: t.Name || row.initiative, text: 'Your project\'s record:\n' + JSON.stringify(t, null, 1), row: t };
  };
  const WORKERS = [officeMap.offices.find((o) => o.officeId === 'CHIEF-POLICE')].concat(officeMap.projects || [], officeMap.offices.filter((o) => o.officeId === 'STAFF-BAYLIGHT'));
  const asker = civicSeat.resolveOfficeRow(officeMap, askerDir);
  const worker = civicSeat.resolveOfficeRow(officeMap, workerKey);
  const hoods = civicSeat.districtHoods(asker.district);
  const askerLine = sheetLine(asker.popid), askerMem = await memoryOf(asker);
  const out = { cycle, asker: asker.holder, askerModel: asker.model, askerLine, worker: worker.holder, workerModel: worker.model, cost: 0, partA: null, partB: [] };

  // ---- Part A: one ask (Run 3's shape) ----
  const wRec = recordOf(worker), wMem = await memoryOf(worker), wLine = sheetLine(worker.popid);
  const askerData = packData(askerDir);
  const askerUser = civicSeat.districtBlock(asker.district, officeMap) + '\n\n' + askerData +
    '\n\nYou can put one question to ' + worker.holder + ', ' + worker.title + ', who holds the record of ' + wRec.name + '.';
  const q = await call(asker.model, askerLine + (askerMem ? '\n\n' + askerMem : ''), askerUser); out.cost += q.cost;
  const wUser = wRec.text + '\n\n' + asker.holder + ', ' + asker.title + (hoods.length ? ' (' + hoods.join(', ') + ')' : '') + ', asks you:\n\n' + q.text;
  out.partA = { question: q.text, askerDataChars: askerData.length, askerMemoryChars: askerMem.length, workerLine: wLine, workerRecordChars: wRec.text.length, workerRecordFields: Object.keys(wRec.row || {}).filter((k) => String(wRec.row[k]).trim()).length, workerMemoryChars: wMem.length, workerMemory: wMem, answers: [] };
  for (let i = 0; i < RUNS; i++) {
    const a = await call(worker.model, wLine + (wMem ? '\n\n' + wMem : ''), wUser); out.cost += a.cost;
    out.partA.answers.push({ text: a.text, cost: a.cost,
      figuresNotHanded: ungrounded(wRec.text + '\n' + q.text + '\n' + wMem, a.text, { cycle }),          // outside record + question + memory
      figuresNotOnRecord: ungrounded(wRec.text + '\n' + q.text, a.text, { cycle }) });                       // outside record + question (memory-only figures show here)
  }

  // ---- Part B: the ask inside the seat's real weekday wake (Run 4's shape) ----
  const pack = buildPack({ cycle, agentDir: askerDir, root: ROOT });
  const base = civic.datawakeUserPrompt(pack, askerMem ? '\n\n' + askerMem + '\n' : '', asker, { civic47Pilot: false, officeMap });
  const holds = (w) => (w.officeId === 'CHIEF-POLICE' ? 'the city\'s crime sheet: every neighborhood\'s property and violent levels, response time, clearance rate, incidents and trend' : 'the record of ' + recordOf(w).name);
  const offer = 'Asking a colleague: before you decide you may put ONE question to one of these people. They answer from their own records, and their answer comes back to you before your final reply.\n' +
    WORKERS.map((w) => '- ' + w.holder + ', ' + w.title + ' — ' + holds(w)).join('\n') +
    '\nTo ask, return only {"ask":{"to":"<their name>","question":"<your question>"}}. Asking is your choice.';
  for (let i = 0; i < RUNS; i++) {
    const run = { run: i + 1, steps: [], cost: 0 };
    let r = await call(asker.model, askerLine, base + '\n' + offer); run.cost += r.cost;
    let j = parse(r.text), hay = base;
    if (j && j.ask && j.ask.question) {
      const to = String(j.ask.to || '').toLowerCase();
      const w = WORKERS.find((x) => x.holder.toLowerCase() === to) || WORKERS.find((x) => to.includes(x.holder.split(' ').pop().toLowerCase()));
      run.steps.push({ step: 'seat asks', to: j.ask.to, matched: w ? w.holder : null, question: j.ask.question });
      if (w) {
        const mem = await memoryOf(w), rec = recordOf(w), line = sheetLine(w.popid);
        const user = rec.text + '\n\n' + asker.holder + ', ' + asker.title + (hoods.length ? ' (' + hoods.join(', ') + ')' : '') + ', asks you:\n\n' + j.ask.question;
        const a = await call(w.model || asker.model, line + (mem ? '\n\n' + mem : ''), user); run.cost += a.cost;
        run.steps.push({ step: 'worker answers', worker: w.holder, boot: line, recordChars: rec.text.length, memoryChars: mem.length, answer: a.text,
          figuresNotHanded: ungrounded(rec.text + '\n' + j.ask.question + '\n' + mem, a.text, { cycle }), figuresNotOnRecord: ungrounded(rec.text + '\n' + j.ask.question, a.text, { cycle }) });
        const back = '\n\nANSWER FROM ' + w.holder + ', ' + w.title + ' (their words, from their own records):\n' + a.text + '\n\nNow return your final JSON.';
        hay = base + back;
        r = await call(asker.model, askerLine, base + back); run.cost += r.cost; j = parse(r.text);
      }
    } else run.steps.push({ step: 'seat did not ask' });
    run.steps.push({ step: 'seat decides', validJson: !!j, statement: j && j.statement, moves: j && j.moves, figuresNotHanded: ungrounded(hay, String((j && j.statement) || r.text), { district: asker.district, cycle }), raw: j ? undefined : r.text.slice(0, 800) });
    out.cost += run.cost; out.partB.push(run);
  }
  fs.writeFileSync(path.join(__dirname, 'run5.' + (worker.projectId || worker.officeId) + '.json'), JSON.stringify(out, null, 1));
  console.log('done; cost $' + out.cost.toFixed(4));
})().catch((e) => { console.log('FAILED ' + e.stack); process.exit(1); });
