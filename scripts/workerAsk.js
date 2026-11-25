'use strict';
/**
 * scripts/workerAsk.js — a reporter asks one of the city's workers a question (pipeline.111; builder 2026-11-23: "media
 * crons can call on worker crons as well to answer questions on the data they are responsible for, if it applies";
 * builder 2026-11-17, pipeline.110 §Reporter rulings: "Every reporter can call any of the 14 workers").
 *
 * The worker wakes as itself on the worker template (scripts/workerWake.js buildWake with the question and who asks it):
 * its sheet line, its memory, this Cycle of its records, its own tools (record_read, neighborhood_read, sheet_read,
 * citizen_lookup, canon_recall, memory_recall). A lever (the Police Chief's patrol_set) is never offered to a press
 * question. Its reply comes back word for word; nothing is written to its record here.
 *
 *   askWorker({ officeId, question, asker: { name, beat }, cycle }) → { officeId, popid, name, title, text, finish }
 *   ASK_WORKER_TOOL — the tool the reporter is shown (the 14 workers by office, title, name and job)
 */
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASKS_PER_WAKE = 2;

let roster = null;
function workers() {
  if (roster) return roster;
  const W = require('./workerWake');
  const map = require('./officeWall').loadOfficeMap();
  const profiles = require('./beatSliceKit').loadProfiles(ROOT);
  roster = (map.offices || []).concat(map.projects || [])
    .map((o) => ({ officeId: o.officeId || o.projectId, title: o.title || o.name || '', popid: String(o.popid || '').toUpperCase(), model: o.model || null }))
    .filter((o) => o.officeId && W.hasFill(o.officeId) && W.JOBS[o.officeId])
    .map((o) => Object.assign(o, { name: String((profiles.get(o.popid) || {}).Name || '').trim(), job: W.JOBS[o.officeId] }));
  // pipeline.111: Gridiron Analytics, the sports data house (scripts/gridiron.js) — one door, five analysts behind it
  roster.push({ officeId: 'GRIDIRON', title: 'Gridiron Analytics, Oakland\'s sports data house', popid: '', model: null, name: '',
    job: 'You are Oakland\'s sports data house. Your job is to answer for the A\'s and the Oaks — the hitters and pitchers, the lineup and the rotation, every contract, the Oaks\' numbers and season, and what the Tribune has printed on them — when the press ask.' });
  return roster;
}

function askWorkerTool() {
  const ws = workers();
  return { type: 'function', function: { name: 'ask_worker',
    description: 'Ask one of the city\'s workers a question about the record they answer for. They answer from their own records, ' +
      'in their own words, and you may quote them. Up to ' + ASKS_PER_WAKE + ' asks. The workers: ' +
      ws.map((w) => w.officeId + ' — ' + w.title + (w.name ? ' (' + w.name + ')' : '') + ': ' + w.job.replace(/^You (are|run|lead) /, '').replace(/\. Your job is to answer for /, ', answers for ').split(' — when the Mayor')[0]).join(' | '),
    parameters: { type: 'object', properties: {
      office: { type: 'string', enum: ws.map((w) => w.officeId) },
      question: { type: 'string', description: 'your question, as you would put it to them' } }, required: ['office', 'question'] } } };
}

async function askWorker({ officeId, question, asker, cycle, date }) {
  if (officeId === 'GRIDIRON') {   // the house routes the question to the analyst who answers for its record
    const g = await require('./gridiron').ask({ question, asker, cycle, date });
    return { officeId, popid: g.popid || null, name: g.name || 'Gridiron Analytics', title: g.title || 'Gridiron Analytics', text: g.text, finish: g.finish };
  }
  const W = require('./workerWake');
  const dw = require('./cron-desk-writer');
  const who = workers().find((w) => w.officeId === officeId);
  if (!who) return { officeId, text: 'no worker answers for "' + officeId + '"', finish: 'unknown-office' };
  const q = String(question || '').trim();
  if (!q) return { officeId, text: 'ask a question', finish: 'no-question' };
  const askerLine = String(asker && asker.name || 'A reporter') + ', Bay Tribune' + (asker && asker.beat ? ' (' + asker.beat + ')' : '');
  const w = await W.buildWake({ officeId, cycle: Number(cycle), officeMap: require('./officeWall').loadOfficeMap(), question: q, askerLine,
    date: date || new Date().toISOString().slice(0, 10) });
  const toolset = W.toolsFor(officeId, { records: w.records }).filter((t) => !/_set$/.test(t.function.name));   // no lever on a press question
  const model = who.model || 'deepseek/deepseek-v4.1-flash-1017';
  const off = /^deepseek\/deepseek-v4/.test(model);   // cron-civic-run.js workerCallSettings
  const r = await dw.openRouterToolLoop({ model, system: w.system, user: w.user, toolset,
    exec: W.toolExecutor({ popid: who.popid, cycle: Number(cycle), stage: { patrol: [] }, records: w.records, dw }),
    maxToolCalls: 4, timeoutMs: 150000, answerLateToolCalls: 'No more reads for this question.',
    maxTokens: off ? 2400 : 6000, body: off ? { reasoning: { enabled: false } } : {} });
  return { officeId, popid: who.popid, name: who.name, title: who.title, text: String(r.text || '').trim(), finish: r.finishReason || null };
}

// One executor branch for any reporter tool loop: asks counted per wake, the answer handed back with who gave it.
// agy 2026-11-23 pass 2 #3: every ask counts against the cap, finished or not; a worker call that fails never fails the
// reporter's wake; only a finished answer comes back as speech (a cut-off one would be an unmanifested quote).
// A reply that is a tool call written out as text (the model out of reads, mid-lookup: 2026-11-24 Gridiron test,
// "<｜DSML｜ invoke name=\"record_read\">…" with finish "stop") is not an answer and never comes back as speech.
const TOOL_MARKUP = /DSML|<\s*\|?\s*\/?\s*(?:invoke|calls|function_calls|tool_call)\b|<\s*parameter\s+name=/i;
const isAnswer = (a) => !!(a && a.popid && a.text && ['stop', 'end_turn'].includes(a.finish) && !TOOL_MARKUP.test(a.text));

function askExecutor(asker, cycle, log, alreadyUsed) {
  const answers = [];
  let used = Number(alreadyUsed) || 0;
  const run = async (input) => {
    if (used >= ASKS_PER_WAKE) return 'no more asks this wake';
    used++;
    let a;
    try { a = await askWorker({ officeId: String(input.office || ''), question: input.question, asker, cycle }); }
    catch (e) { a = { officeId: String(input.office || ''), text: '', finish: 'error: ' + String(e && e.message || e).slice(0, 120) }; }
    const finished = isAnswer(a);
    if (finished) answers.push(Object.assign({ question: String(input.question || '').trim() }, a));
    if (log) log('ask_worker ' + a.officeId + ' (' + (a.name || '?') + '): ' + (a.finish || '?') + ', ' + String(a.text || '').length + ' chars');
    if (finished) return a.name + ', ' + a.title + ', answered:\n' + a.text;
    return a.name ? a.name + ' could not answer this time.' : (a.text || 'no answer');
  };
  return { run, answers, used: () => used };
}

module.exports = { askWorker, askWorkerTool, askExecutor, workers, ASKS_PER_WAKE, isAnswer, TOOL_MARKUP };
