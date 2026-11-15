'use strict';
/**
 * scripts/workerWake.js — the worker template (pipeline.110 Task 10; docs/reference/AGENT_BOOT_TEMPLATES.md §3).
 *
 * One agent type for every city worker (builder 2026-11-14: "all workers are the same agent type but may have
 * different data and tools but how they operate should be built from a template"). The police chief is the spec.
 *
 * What a worker wakes with, the same for every worker:
 *   1 who they are        the sheet line off the ledger, the office sheet and the dials; no written persona file
 *   2 their data          the whole of the records of their trade — THE FILL, one entry per worker in FILLS
 *   3 their tools         a city sheet, a citizen, what the paper printed, their own memory (+ a fill's levers)
 *   4 their memory        gathered for them from their whole page by what is in front of them, plus their newest own words
 *   5 their decisions     their own moves by POPID, each answer with the question it answered
 *   6 the task            a question from a named seat or reporter; on their own wake, one line: they are on the record
 * Nothing here says what to say, how to open or close, or when to use a tool. To build another worker out, add its
 * FILLS entry; the other five parts are shared.
 *
 * Callers: cron-civic-run.js runDatawake (an office that has a fill). Every read is injected through `deps` for tests.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function defaults(deps) {
  const d = deps || {};
  return {
    root: d.root || ROOT,
    sheets: d.sheets || require('../lib/sheets'),
    page: d.page || require('../lib/citizenPage'),
    wp: d.wp || require('../lib/wakePerception'),
    dials: d.dials || require('../lib/citizenDials'),
    maraDirective: d.maraDirective || require('./maraDirective'),
    readPrev: d.readPrev || ((tab) => readJsonl(path.join(d.root || ROOT, 'output', 'beats', 'prev', tab + '.jsonl'))),
  };
}
function readJsonl(file) {
  let text; try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return []; }
  const out = [];
  for (const l of text.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch (e) { /* a torn line is skipped */ } }
  return out;
}
const table = (rows, cols) => [cols.join(' | ')].concat(rows.map((r) => cols.map((c) => String(r[c] == null ? '' : r[c])).join(' | '))).join('\n');
const num = (v) => (String(v == null ? '' : v).trim() === '' ? NaN : Number(v));
const round = (x, p) => (isFinite(x) ? Number(x.toFixed(p)) : '');

// The high and low of each numeric column, with who holds them (builder 2026-11-14: "Agree on the idea for #1") —
// nobody ranks 22 rows by eye. Ties are all named.
function highLow(rows, cols, nameCol) {
  return cols.filter((c) => rows.length && rows.every((r) => isFinite(num(r[c])))).map((c) => {
    const v = rows.map((r) => num(r[c])), hi = Math.max(...v), lo = Math.min(...v);
    const at = (x) => rows.filter((r) => num(r[c]) === x).map((r) => r[nameCol]).join(', ');
    return { Column: c, Highest: hi + ' — ' + at(hi), Lowest: lo + ' — ' + at(lo) };
  });
}

// ---- part 5: every move one person filed, whichever key the wake filed it under ----
function loadMoves(root) {
  const dir = path.join(root, 'output', 'cron-civic', 'moves');
  let files = []; try { files = fs.readdirSync(dir).filter((x) => /^moves_c\d+\.jsonl$/.test(x)); } catch (e) { return []; }
  files.sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const rows = [];
  for (const f of files) rows.push(...readJsonl(path.join(dir, f)));
  // status changes are new lines for the same moveId: the first line is the move as filed
  const seen = new Set();
  return rows.filter((m) => m && m.moveId && m.status !== 'rejected' && !seen.has(m.moveId) && seen.add(m.moveId));   // a rejected move is not a decision
}
// Her ask and her reason only: no folder path, no form fields.
function askAndWhy(blockText) {
  return String(blockText || '').split('\n').map((x) => (x.match(/^- \*\*(Address|Why):\*\*\s*(.+)$/) || [])[2]).filter(Boolean).join(' ');
}
function pastDecisions(popid, agentDir, deps) {
  const { root, maraDirective } = defaults(deps);
  const out = [];
  for (const m of loadMoves(root)) {
    if (String(m.popid || '').toUpperCase() !== String(popid).toUpperCase()) continue;
    const p = m.payload || {};
    const d = { cycle: Number(m.cycle), type: m.type };
    if (m.type === 'answer') {
      d.said = String(p.text || '');
      try {
        const text = fs.readFileSync(path.join(root, 'output', 'mara-directives', 'mara_directive_c' + p.directiveCycle + '_AUTO.txt'), 'utf8');
        d.question = askAndWhy(maraDirective.blocksFor(text, p.confrontationSeat || agentDir).join('\n'));
        if (d.question) d.askedBy = 'Mara Vance, City Planning Director (Cycle ' + p.directiveCycle + ')';
      } catch (e) { /* the question file is gone: the answer stands alone */ }
    } else d.said = Object.entries(p).filter(([, v]) => v != null && String(v).trim() !== '').map(([k, v]) => k + ': ' + v).join('; ');
    out.push(d);
  }
  return out;
}
// The patrol strategy in force at a Cycle: the latest patrol move filed in a week before it (the week's close carries
// it to World_Config, the engine reads it at the next fire). None filed: the engine's default.
function patrolInForce(moves, cycle) {
  const filed = moves.filter((m) => m.type === 'patrol' && Number(m.cycle) < Number(cycle) && m.payload && m.payload.strategy)
    .sort((a, b) => Number(a.cycle) - Number(b.cycle) || String(a.at || '').localeCompare(String(b.at || '')));
  return filed.length ? String(filed[filed.length - 1].payload.strategy) : 'balanced (default)';
}

// ---- part 1: who they are — the live daily wake's own functions ----
async function whoTheyAre(popid, deps) {
  const { wp, dials } = defaults(deps);
  const pool = await wp.buildPool({ shapedMin: 0, lifeMinChars: 0 });
  const offices = await wp.loadOfficeHolders();
  const id = String(popid).toUpperCase();
  const c = pool.find((x) => x.popId === id);
  if (!c) throw new Error('worker ' + id + ' is not on the citizen ledger');
  let disp = ''; try { disp = dials.disposition(c.cur) || ''; } catch (e) { /* no dials: the line stands without temperament */ }
  const nameOf = (pid) => { const x = pool.find((y) => y.popId === String(pid).toUpperCase()); return x ? ([x.first, x.last].filter(Boolean).join(' ') || x.name || '') : ''; };
  return { line: wp.identityLine({ ...c, office: offices.byPop[c.popId] }) + (disp ? ' Your temperament: ' + disp + '.' : ''), nameOf };
}

// ---- part 4: memory, gathered — a search of the whole page on what is in front of them, plus their two newest own
// entries (the search lags fresh ones). Open-question lines are not memories; an office statement is labelled as one.
// Each line carries the Cycle it was said in, never a calendar date. A failed read is no memory this wake, not an error.
async function gatherMemory(popid, key, deps) {
  const { page } = defaults(deps);
  const tidy = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const entry = (r) => ({ when: (r.metadata || {}).cycle != null ? 'Cycle ' + r.metadata.cycle : 'earlier', type: String((r.metadata || {}).type || ''),
    text: tidy(r.content).replace(/^(datawake|stated):\s*/i, 'Your public statement: ') });
  let hits = [], recent = [];
  try { hits = ((await page.searchPage_(popid, key, 6)).results || []).filter((r) => String((r.metadata || {}).type || '') !== 'tension').map(entry); } catch (e) { hits = []; }
  try {
    recent = ((await page.recentPage_(popid, 12)).results || []).filter((r) => !['office-position', 'tension', 'show'].includes(String((r.metadata || {}).type || '')))
      .slice(0, 2).map(entry);
  } catch (e) { recent = []; }
  const seen = new Set(), entries = [];
  for (const m of recent.concat(hits)) { const k = m.text.slice(0, 80); if (m.text && !seen.has(k)) { seen.add(k); entries.push(m); } }
  return { key, entries, fromSearch: hits.length, newest: recent.length };
}

// ---- part 2, THE FILL: one entry per worker. build(cycle, ctx) -> { blocks: [{title, text}], key }.
//   key = the words the memory gatherer searches on when nobody has asked a question.
//   levers = what this worker alone can set (a tool is offered for each).
const FILLS = {
  'CHIEF-POLICE': {
    levers: ['patrol'],
    build: async (cycle, ctx) => {
      const { sheets, readPrev, root } = defaults(ctx.deps);
      const out = [];
      const crime = await sheets.getSheetAsObjects('Crime_Metrics');
      if (!crime.length) throw new Error('Crime_Metrics returned no rows');
      const all = Object.keys(crime[0]);
      const cols = all.filter((c) => crime.some((r) => String(r[c] == null ? '' : r[c]).trim()));   // a column blank in every row is named, not printed
      const blank = all.filter((c) => !cols.includes(c));
      out.push({ title: 'Crime by neighborhood, Cycle ' + cycle + ' (the department\'s sheet; it keeps this Cycle only)' + (blank.length ? '. No reading this Cycle: ' + blank.join(', ') : ''), text: table(crime, cols) });
      out.push({ title: 'The high and low of each column on that sheet, Cycle ' + cycle, text: table(highLow(crime, cols.filter((c) => c !== 'LastUpdated' && c !== 'Neighborhood'), 'Neighborhood'), ['Column', 'Highest', 'Lowest']) });

      const moves = loadMoves(root);
      const census = (await sheets.getSheetAsObjects('Care_Justice_Census')).filter((r) => r.System === 'judicial' && r.IntakeType === 'arrest');
      const cyc = [...new Set(census.map((r) => Number(r.Cycle)))].filter(isFinite).sort((a, b) => a - b);
      const first = cyc.length ? cyc[0] : Number(cycle);
      // The setting he made and the numbers that followed it, side by side (builder 2026-11-14: "what he sets these at effect the sim").
      const totals = (rows) => ({ incidents: rows.reduce((a, r) => a + (num(r.IncidentCount) || 0), 0),
        response: round(rows.reduce((a, r) => a + (num(r.ResponseTimeAvg) || 0), 0) / rows.length, 2), clearance: round(rows.reduce((a, r) => a + (num(r.ClearanceRate) || 0), 0) / rows.length, 3) });
      const sheetOf = {}; sheetOf[Number(cycle)] = totals(crime);
      const prev = readPrev('Crime_Metrics');
      const prevCycle = prev.length ? Number(prev[0].LastUpdated) : NaN;
      if (prev.length && prevCycle === Number(cycle) - 1) sheetOf[prevCycle] = totals(prev);
      const city = cyc.map((c) => {
        const r = census.find((x) => x.GeographicScope === 'city' && Number(x.Cycle) === c) || {};
        const t = sheetOf[c] || {};
        return { Cycle: c, 'Patrol strategy in force': patrolInForce(moves, c), Arrests: r.TotalIntakes, 'In custody, start': r.OpeningOccupancy, 'In custody, end': r.ClosingOccupancy, Released: r.Exits,
          'Incidents, all neighborhoods': t.incidents == null ? '' : t.incidents, 'Average response time': t.response == null ? '' : t.response, 'Average clearance rate': t.clearance == null ? '' : t.clearance };
      });
      if (city.length) out.push({ title: 'Citywide by Cycle: the patrol strategy in force and what was recorded under it (the crime sheet\'s own figures exist only for the Cycles shown)', text: table(city, Object.keys(city[0])) });
      const hoods = [...new Set(census.filter((r) => r.GeographicScope === 'neighborhood').map((r) => r.Neighborhood))];
      const cell = (h, c, f) => { const r = census.find((x) => x.Neighborhood === h && Number(x.Cycle) === c && x.GeographicScope === 'neighborhood'); return r ? r[f] : ''; };
      const grid = (f) => table(hoods.map((h) => Object.assign({ Neighborhood: h }, ...cyc.map((c) => ({ ['C' + c]: cell(h, c, f) })))), ['Neighborhood'].concat(cyc.map((c) => 'C' + c)));
      if (hoods.length) {
        out.push({ title: 'Arrests by neighborhood, each Cycle', text: grid('TotalIntakes') });
        out.push({ title: 'In custody at the end of each Cycle, by neighborhood', text: grid('ClosingOccupancy') });
      }
      const cars = (await sheets.getSheetAsObjects('Chaos_Cars')).filter((r) => r.VehicleType === 'cop_car' && Number(r.CycleId) >= first && Number(r.CycleId) <= Number(cycle))
        .map((r) => ({ Cycle: r.CycleId, Where: r.TargetScope === 'citizen' ? 'citizen ' + (ctx.nameOf(r.TargetId) || r.TargetId) : r.TargetScope + ' ' + r.TargetId, Outcome: r.DiceOutcome, Moved: r.PrimaryMetric + ' ' + r.MetricMagnitude }));
      out.push({ title: 'Patrol car events, Cycles ' + first + '–' + cycle + (cars.some((c) => Number(c.Cycle) === Number(cycle)) ? '' : ' (none this Cycle)'), text: cars.length ? table(cars, Object.keys(cars[0])) : 'none' });
      const money = (await sheets.getSheetAsObjects('City_Treasury')).filter((r) => /^(COURT|TICKETS)/.test(r.Counterparty || '') && Number(r.Cycle) >= first)
        .map((r) => ({ Cycle: r.Cycle, Source: r.Counterparty, Amount: r.Amount, Note: r.Note }));
      if (money.length) out.push({ title: 'Fines and tickets paid to the city', text: table(money, ['Cycle', 'Source', 'Amount', 'Note']) });
      const top = crime.slice().sort((a, b) => num(b.PressureRatio) - num(a.PressureRatio)).slice(0, 3).map((r) => r.Neighborhood);
      return { blocks: out, key: 'crime ' + top.join(' ') + ' clearance response time arrests custody patrol' };
    },
  },
};
const hasFill = (officeId) => Object.prototype.hasOwnProperty.call(FILLS, String(officeId || ''));

// The whole wake for one worker. opts: { officeId, cycle, officeMap, question?, askerLine?, deps? }
// -> { office, system, user, memory, decisions }
async function buildWake(opts) {
  const o = opts || {};
  const office = ((o.officeMap || {}).offices || []).find((x) => x.officeId === o.officeId);
  if (!office || !hasFill(o.officeId)) throw new Error('no worker fill for ' + o.officeId);
  const who = await whoTheyAre(office.popid, o.deps);
  const fill = await FILLS[o.officeId].build(Number(o.cycle), { deps: o.deps, nameOf: who.nameOf });
  const memory = await gatherMemory(office.popid, o.question || fill.key, o.deps);
  const decisions = pastDecisions(office.popid, office.agentDir, o.deps);
  const system = [who.line].concat(memory.entries.length ? ['', 'From your own memory:', ...memory.entries.map((m) => '- (' + m.when + ') ' + m.text)] : []).join('\n');
  const user = [
    ...fill.blocks.map((b) => b.title + ':\n' + b.text),
    'What you have decided and said on the record:\n' + (decisions.length
      ? decisions.map((d) => '- Cycle ' + d.cycle + ', ' + d.type + (d.askedBy ? ' — asked by ' + d.askedBy + ': ' + d.question + '\n  You answered: ' + d.said : ': ' + d.said)).join('\n')
      : '- nothing on record'),
    o.question ? (o.askerLine || 'A council member') + ' asks you:\n\n' + o.question : 'It is the close of Cycle ' + o.cycle + '. You are speaking on the record as ' + office.title + '.',
  ].join('\n\n');
  return { office, system, user, memory, decisions };
}

// ---- part 3: the tools. Described to the worker; nothing says when to use one. ----
// The reporters' twelve sheets plus the three no reporter reads: the chaos-car sheet, the city's money, the case ledger.
const SHEETS = ['Initiative_Tracker', 'Neighborhood_Map', 'Oakland_Sports_Feed', 'Civic_Office_Ledger', 'Faith_Organizations', 'Faith_Ledger', 'Business_Ledger',
  'Transit_Metrics', 'Neighborhood_Demographics', 'Care_Justice_Census', 'Community_Programs', 'Crime_Metrics', 'Chaos_Cars', 'City_Treasury', 'Judicial_Ledger'];
const fn = (name, description, properties, required) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });
const TOOLS = [
  fn('sheet_read', 'Read one of the city\'s sheets: ' + SHEETS.join(', ') + '.', { tab: { type: 'string' }, match: { type: 'string', description: 'optional: only the rows naming this word (a neighborhood, a name, an id)' } }, ['tab']),
  fn('citizen_lookup', 'Look up one person on the city\'s ledger by full name: role, neighborhood, birth year.', { name: { type: 'string' }, thread: { type: 'boolean', description: 'optional: also their recent life history' } }, ['name']),
  fn('canon_recall', 'What the Bay Tribune has published on a person, place or topic, each piece labelled with its Cycle.', { query: { type: 'string' } }, ['query']),
  fn('memory_recall', 'Read your own memory: your newest entries and, with a query, what you have said or noted on that topic.', { query: { type: 'string', description: 'optional topic' } }, []),
];
// engine.238: the patrol strategy is the Police Chief's alone; the wording of what each does is the seat contract's own.
const LEVER_TOOLS = {
  patrol: (strategies) => fn('patrol_set', 'Set the city\'s patrol strategy from the next Cycle on. Yours alone. suppress_hotspots clears more cases but pushes activity into the next neighborhood over; ' +
    'community_presence displaces far less and lifts quality of life, clearing fewer cases; balanced sits between. Your latest setting of the week is the one that stands.',
  { strategy: { type: 'string', enum: strategies }, note: { type: 'string', description: 'your reason, in your own words' } }, ['strategy']),
};
function toolsFor(officeId, opts) {
  const levers = (FILLS[officeId] || {}).levers || [];
  return TOOLS.concat(levers.map((l) => LEVER_TOOLS[l]((opts && opts.patrolStrategies) || ['balanced', 'suppress_hotspots', 'community_presence'])));
}
const capTo = (s, n) => (s.length > n ? s.slice(0, n) + '\n(cut at ' + n + ' characters)' : s);
async function sheetRead(input, deps) {   // the reporters' reader (cron-desk-writer.js toolSheetRead), same shape, on the worker's list
  const { sheets } = defaults(deps);
  const tab = String((input || {}).tab || '').trim();
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
async function memoryRecall(popid, input, deps) {   // newest by date, and the page search on a query; unavailable is said as unavailable, never as empty
  const { page } = defaults(deps);
  const line = (d) => '- (' + ((d.metadata || {}).cycle != null ? 'Cycle ' + d.metadata.cycle : 'earlier') + ') ' + String(d.content || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  const rec = await page.recentPage_(popid, 5);
  if (!rec || rec.error) return 'Your memory is unavailable right now — this is not an empty record.';
  const parts = [];
  if ((rec.results || []).length) parts.push('Your newest entries:\n' + rec.results.map(line).join('\n'));
  const q = String((input || {}).query || '').trim();
  if (q) {
    const hit = await page.searchPage_(popid, q, 5);
    if (!hit || hit.error) parts.push('The search of your memory is unavailable right now.');
    else parts.push((hit.results || []).length ? 'On "' + q + '":\n' + hit.results.map(line).join('\n') : 'Nothing on "' + q + '".');
  }
  return parts.join('\n\n') || 'Your memory holds nothing yet.';
}
// ctx: { popid, cycle, stage: { patrol: [] }, normalizePatrol(v) -> strategy|null, deps?, dw? }
// A lever is STAGED, never executed here: the caller files it through the move gate once the wake has a statement.
function toolExecutor(ctx) {
  return async function (name, input) {
    input = input || {};
    if (name === 'sheet_read') return sheetRead(input, ctx.deps);
    if (name === 'memory_recall') return memoryRecall(ctx.popid, input, ctx.deps);
    if (name === 'citizen_lookup') return (ctx.dw || require('./cron-desk-writer')).toolCitizenLookup(input);
    if (name === 'canon_recall') return (ctx.dw || require('./cron-desk-writer')).toolCanonRecall(input, Number(ctx.cycle) + 1);
    if (name === 'patrol_set') {
      const strategy = ctx.normalizePatrol ? ctx.normalizePatrol(input.strategy) : null;
      if (!strategy) return 'not set: the strategy is one of balanced, suppress_hotspots, community_presence';
      ctx.stage.patrol.push({ strategy, note: String(input.note || '').trim() });
      return 'set: ' + strategy + ', from the next Cycle on';
    }
    return 'unknown tool ' + name;
  };
}

module.exports = { FILLS, hasFill, buildWake, toolsFor, toolExecutor, TOOLS, SHEETS,
  highLow, patrolInForce, askAndWhy, loadMoves, pastDecisions, gatherMemory, whoTheyAre, sheetRead, memoryRecall, table };
