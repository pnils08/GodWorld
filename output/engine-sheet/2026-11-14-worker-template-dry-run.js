// pipeline.110 Task 9 — the worker template run on its spec (the police chief), under scripts/guard/nowrite.js.
// The wake is 2026-11-14-worker-wake-print.js `buildWake` (who he is, his memory gathered, his data, his decisions, the task).
// This file adds part 3, the tools (builder 2026-11-14: a city sheet, a citizen, what the paper printed, his own memory),
// and calls his own model. Tools are named to the model and nothing says when to use one.
// Twice over: his own wake (no question) and an asked wake (the District 3 question saved from Run 3). Nothing is written
// but the .md beside this file.   node 2026-11-14-worker-template-dry-run.js CHIEF-POLICE <cycle> <runs>
require('/root/GodWorld/lib/env');
const fs = require('fs'), path = require('path');
const ROOT = '/root/GodWorld';
const { buildWake } = require('./2026-11-14-worker-wake-print.js');
const dw = require(ROOT + '/scripts/cron-desk-writer');
const civic = require(ROOT + '/scripts/cron-civic-run.js');
const sheets = require(ROOT + '/lib/sheets');
const page = require(ROOT + '/lib/citizenPage');
const [officeId, cycleArg, runsArg] = process.argv.slice(2);
const cycle = Number(cycleArg), RUNS = Number(runsArg || 3);

// the reporters' twelve sheets plus the three no reporter reads: the chaos-car sheet, the city's money, the case ledger
const SHEETS = ['Initiative_Tracker', 'Neighborhood_Map', 'Oakland_Sports_Feed', 'Civic_Office_Ledger', 'Faith_Organizations', 'Faith_Ledger', 'Business_Ledger',
  'Transit_Metrics', 'Neighborhood_Demographics', 'Care_Justice_Census', 'Community_Programs', 'Crime_Metrics', 'Chaos_Cars', 'City_Treasury', 'Judicial_Ledger'];
const fn = (name, description, properties, required) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });
const TOOLS = [
  fn('sheet_read', 'Read one of the city\'s sheets: ' + SHEETS.join(', ') + '.', { tab: { type: 'string' }, match: { type: 'string', description: 'optional: only the rows naming this word (a neighborhood, a name, an id)' } }, ['tab']),
  fn('citizen_lookup', 'Look up one person on the city\'s ledger by full name: role, neighborhood, birth year.', { name: { type: 'string' }, thread: { type: 'boolean', description: 'optional: also their recent life history' } }, ['name']),
  fn('canon_recall', 'What the Bay Tribune has published on a person, place or topic, each piece labelled with its Cycle.', { query: { type: 'string' } }, ['query']),
  fn('memory_recall', 'Read your own memory: your newest entries and, with a query, what you have said or noted on that topic.', { query: { type: 'string', description: 'optional topic' } }, []),
];
const capTo = (s, n) => (s.length > n ? s.slice(0, n) + '\n(cut at ' + n + ' characters)' : s);
async function sheetRead(input) {   // the reporters' reader (cron-desk-writer.js toolSheetRead), same shape, on the worker's list
  const tab = String(input.tab || '').trim();
  if (!SHEETS.includes(tab)) return 'no such sheet. The sheets: ' + SHEETS.join(', ');
  try {
    const data = await sheets.getRawSheetData(tab); const match = String(input.match || '').trim().toLowerCase();
    if (match) {
      const rows = data.slice(1).filter((r) => r.join(' ').toLowerCase().includes(match));
      if (!rows.length) return 'no row in ' + tab + ' names "' + input.match + '" (' + Math.max(0, data.length - 1) + ' rows read)';
      const shown = rows.slice(-12);
      return capTo([data[0]].concat(shown).map((r) => r.join(' | ')).join('\n'), 6000) + (rows.length > shown.length ? '\n(' + shown.length + ' newest of ' + rows.length + ' rows naming "' + input.match + '")' : '');
    }
    const shown = data.slice(0, 40);
    return capTo(shown.map((r) => r.join(' | ')).join('\n'), 6000) + (data.length > shown.length ? '\n(first ' + shown.length + ' of ' + data.length + ' rows — pass match to pull rows by a word)' : '');
  } catch (e) { return '(sheet read failed: ' + e.message + ')'; }
}
async function memoryRecall(popid, input) {   // newest by date, and the page search (v3) on a query
  const tidy = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  const parts = [];
  const rec = await page.recentPage_(popid, 5); if (rec.error) return 'Your memory is unavailable right now.';
  if ((rec.results || []).length) parts.push('Your newest entries:\n' + rec.results.map((d) => '- (' + String(d.createdAt || '').slice(0, 10) + ') ' + tidy(d.content)).join('\n'));
  const q = String(input.query || '').trim();
  if (q) { const hit = await page.searchPage_(popid, q, 5); parts.push((hit.results || []).length ? 'On "' + q + '":\n' + hit.results.map((d) => '- (' + String(d.createdAt || '').slice(0, 10) + ') ' + tidy(d.content)).join('\n') : 'Nothing on "' + q + '".'); }
  return parts.join('\n\n') || 'Your memory holds nothing yet.';
}

(async () => {
  const saved = fs.readFileSync(path.join(__dirname, '2026-11-13-ask-dry-run.md'), 'utf8');
  const question = saved.slice(saved.indexOf('## Her question') + 15, saved.indexOf('\n## ', saved.indexOf('## Her question') + 5)).replace(/\*\*My question for Chief Montez:\*\*/, '').trim();
  const askerLine = 'Rose Delgado, City Council District 3 (Fruitvale, San Antonio),';
  const out = ['# Worker template dry run — ' + officeId + ', Cycle ' + cycle, ''];
  let cost = 0, calls = 0;
  for (const mode of ['own', 'asked']) {
    const w = await buildWake(officeId, cycle, mode === 'asked' ? question : undefined, mode === 'asked' ? askerLine : undefined);
    const model = w.office.model;
    const exec = async (name, input) => {
      input = input || {};
      if (name === 'sheet_read') return sheetRead(input);
      if (name === 'citizen_lookup') return dw.toolCitizenLookup(input);
      if (name === 'canon_recall') return dw.toolCanonRecall(input, cycle + 1);
      if (name === 'memory_recall') return memoryRecall(w.office.popid, input);
      return 'unknown tool ' + name;
    };
    out.push('## ' + (mode === 'own' ? 'His own wake (no question)' : 'Asked by Rose Delgado, District 3'), '', w.office.holder + ', ' + model + '. System ' + w.system.length + ' characters, user ' + w.user.length + '.', '');
    if (mode === 'asked') out.push('Her question:', '', '> ' + question.replace(/\n/g, '\n> '), '');
    for (let i = 0; i < RUNS; i++) {
      const r = await dw.openRouterToolLoop({ model, system: w.system, user: w.user, toolset: TOOLS, exec, maxToolCalls: 6, maxTokens: 1800, timeoutMs: 180000, keepResults: true,
        body: /^deepseek\/deepseek-v4/.test(model) ? { reasoning: { enabled: false } } : {} });
      cost += r.billedUsd || 0; calls += r.trace.length;
      const hay = w.system + '\n' + w.user + '\n' + r.trace.map((t) => t.result).join('\n');
      let loose; try { loose = [...civic.ungroundedNumbers(hay, [r.text], { cycle })]; } catch (e) { loose = ['check failed: ' + e.message]; }
      out.push('### ' + mode + ' ' + (i + 1), '',
        'Tools called: ' + (r.trace.length ? r.trace.map((t) => t.tool + '(' + JSON.stringify(t.input) + ') → ' + t.resultChars + ' characters').join('; ') : 'none') + '.',
        'Figures not in what he was handed or read: ' + (loose.length ? loose.join(', ') : 'none') + '.' + (r.finishReason && r.finishReason !== 'stop' ? ' Finish: ' + r.finishReason + '.' : ''), '',
        r.text || '(empty reply)', '');
    }
  }
  out.splice(2, 0, RUNS + ' runs each way. Tool calls in all: ' + calls + '. Cost $' + cost.toFixed(4) + '. Write guard on.', '');
  const f = path.join(__dirname, '2026-11-14-worker-template-dry-run.' + officeId + '.md');
  fs.writeFileSync(f, out.join('\n'));
  console.log(f + '\ntool calls ' + calls + '; cost $' + cost.toFixed(4));
})().catch((e) => { console.log('FAILED ' + e.stack); process.exit(1); });
