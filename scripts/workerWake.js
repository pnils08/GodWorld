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
 * Puppeting is putting words in their mouth, not telling them what to do (builder 2026-11-16: "puppeting means putting
 * words in their mouth and telling them what to say, it doesnt mean telling them what to do, theyre AI agents, they by
 * definition need a task"; this replaces the 11-14 reading that the harness carries no task). A worker is a data agent in
 * a workflow that also wakes on a cron: called on by the Mayor, the council or the press, it answers on its records; on
 * its scheduled wake it reports on what it sees. A worker with a job in JOBS wakes lean — its job, this Cycle of each
 * record, each record whole and the neighborhood a read away, the task last. No line hands it words or a conclusion, and
 * a title names its data and nothing else. A question is placed last in the asker's own words, with who asks.
 * To build another worker out, add its FILLS entry; the other four parts are shared.
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
    } else {
      // `source` is which wake filed the move (cron-work-wake.js: "work-wake"), bookkeeping, not what they decided; one
      // field left is shown as its value (2026-11-16: "Cycle 112, work: initiativeId: INIT-001; source: work-wake")
      const f = Object.entries(p).filter(([k, v]) => k !== 'source' && v != null && String(v).trim() !== '');
      d.said = f.length === 1 ? String(f[0][1]) : f.map(([k, v]) => k + ': ' + v).join('; ');
    }
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
// opts.newest: how many of their own newest entries ride beside the search (default 2, the chief's; the council template hands none in).
async function gatherMemory(popid, key, deps, opts) {
  const newest = opts && opts.newest != null ? Number(opts.newest) : 2;
  const { page } = defaults(deps);
  const tidy = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const entry = (r) => ({ when: (r.metadata || {}).cycle != null ? 'Cycle ' + r.metadata.cycle : 'earlier', type: String((r.metadata || {}).type || ''),
    text: tidy(r.content).replace(/^(datawake|stated):\s*/i, 'Your public statement: ') });
  let hits = [], recent = [];
  try { hits = ((await page.searchPage_(popid, key, 6)).results || []).filter((r) => String((r.metadata || {}).type || '') !== 'tension').map(entry); } catch (e) { hits = []; }
  if (newest > 0) try {
    recent = ((await page.recentPage_(popid, 12)).results || []).filter((r) => !['office-position', 'tension', 'show'].includes(String((r.metadata || {}).type || '')))
      .slice(0, newest).map(entry);
  } catch (e) { recent = []; }
  const seen = new Set(), entries = [];
  for (const m of recent.concat(hits)) { const k = m.text.slice(0, 80); if (m.text && !seen.has(k)) { seen.add(k); entries.push(m); } }
  return { key, entries, fromSearch: hits.length, newest: recent.length };
}

// ---- part 2, THE FILL: one entry per worker. build(cycle, ctx) -> { blocks: [{title, text}], key }.
//   key = the words the memory gatherer searches on when nobody has asked a question: the trade's own nouns. It
//         names nothing picked out of the data — which neighborhood or figure matters is not chosen here.
//   levers = what this worker alone can set (a tool is offered for each).
const FILLS = {
  'CHIEF-POLICE': {
    key: 'crime clearance response time arrests custody patrol',
    levers: ['patrol'],
    build: async (cycle, ctx) => {
      const { sheets, readPrev, root } = defaults(ctx.deps);
      const out = [];
      const crime = await sheets.getSheetAsObjects('Crime_Metrics');
      if (!crime.length) throw new Error('Crime_Metrics returned no rows');
      const cols = Object.keys(crime[0]);   // the sheet as it stands, a blank column included: what is missing is his to notice
      out.push({ title: 'Crime by neighborhood, Cycle ' + cycle, text: table(crime, cols) });
      out.push({ title: 'The high and low of each column, Cycle ' + cycle, text: table(highLow(crime, cols.filter((c) => c !== 'LastUpdated' && c !== 'Neighborhood'), 'Neighborhood'), ['Column', 'Highest', 'Lowest']) });

      const moves = loadMoves(root);
      const census = (await sheets.getSheetAsObjects('Care_Justice_Census')).filter((r) => r.System === 'judicial' && r.IntakeType === 'arrest');
      const cyc = [...new Set(census.map((r) => Number(r.Cycle)))].filter(isFinite).sort((a, b) => a - b);
      const first = cyc.length ? cyc[0] : Number(cycle);
      // The setting in force and each Cycle's figures in one table (builder 2026-11-14: "what he sets these at effect the sim"). The table states no link between them.
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
      if (city.length) out.push({ title: 'Citywide by Cycle', text: table(city, Object.keys(city[0])) });
      const hoods = [...new Set(census.filter((r) => r.GeographicScope === 'neighborhood').map((r) => r.Neighborhood))];
      const cell = (h, c, f) => { const r = census.find((x) => x.Neighborhood === h && Number(x.Cycle) === c && x.GeographicScope === 'neighborhood'); return r ? r[f] : ''; };
      const grid = (f) => table(hoods.map((h) => Object.assign({ Neighborhood: h }, ...cyc.map((c) => ({ ['C' + c]: cell(h, c, f) })))), ['Neighborhood'].concat(cyc.map((c) => 'C' + c)));
      if (hoods.length) {
        out.push({ title: 'Arrests by neighborhood, each Cycle', text: grid('TotalIntakes') });
        out.push({ title: 'In custody at the end of each Cycle, by neighborhood', text: grid('ClosingOccupancy') });
      }
      const cars = (await sheets.getSheetAsObjects('Chaos_Cars')).filter((r) => r.VehicleType === 'cop_car' && Number(r.CycleId) >= first && Number(r.CycleId) <= Number(cycle))
        .map((r) => ({ Cycle: r.CycleId, Where: r.TargetScope === 'citizen' ? 'citizen ' + (ctx.nameOf(r.TargetId) || r.TargetId) : r.TargetScope + ' ' + r.TargetId, Outcome: r.DiceOutcome, Moved: r.PrimaryMetric + ' ' + r.MetricMagnitude }));
      out.push({ title: 'Patrol car events, Cycles ' + first + '–' + cycle, text: cars.length ? table(cars, Object.keys(cars[0])) : 'none' });
      const money = (await sheets.getSheetAsObjects('City_Treasury')).filter((r) => /^(COURT|TICKETS)/.test(r.Counterparty || '') && Number(r.Cycle) >= first)
        .map((r) => ({ Cycle: r.Cycle, Source: r.Counterparty, Amount: r.Amount, Note: r.Note }));
      if (money.length) out.push({ title: 'Fines and tickets paid to the city', text: table(money, ['Cycle', 'Source', 'Amount', 'Note']) });
      // The rest of what the sheet holds for his trade (docs/research/2026-11-15-worker-records-all-tabs.md; builder
      // 2026-11-15: "you showed me 5 things when 1000s of data points are tracked"). Each block is the tab's own rows;
      // a tab that cannot be read says so. Domain is written in two cases on the event ledger, so the match folds case.
      const isSafety = (v) => /^safety$/i.test(String(v || '').trim());
      const more = async (title, read) => { try { const t = await read(); if (t) out.push({ title, text: t }); } catch (e) { out.push({ title, text: 'unavailable (' + ((e && e.message) || e) + ')' }); } };
      await more('Crime index and noise index on the neighborhood map, Cycle ' + cycle, async () => {
        const m = await sheets.getSheetAsObjects('Neighborhood_Map');
        return m.length ? table(m.map((r) => ({ Neighborhood: r.Neighborhood, CrimeIndex: r.CrimeIndex, NoiseIndex: r.NoiseIndex })), ['Neighborhood', 'CrimeIndex', 'NoiseIndex']) : '';
      });
      await more('Safety events on the city\'s event ledger, every Cycle on it', async () => {
        const w = (await sheets.getSheetAsObjects('WorldEvents_V3_Ledger')).filter((r) => isSafety(r.Domain))
          .map((r) => ({ Cycle: r.Cycle, Neighborhood: r.Neighborhood, Severity: r.Severity, Event: r.EventDescription }));
        return w.length ? table(w, ['Cycle', 'Neighborhood', 'Severity', 'Event']) : 'none';
      });
      await more('Safety arcs on the arc ledger', async () => {
        const arcs = (await sheets.getSheetAsObjects('Event_Arc_Ledger')).filter((r) => isSafety(r.DomainTag))
          .map((r) => ({ Cycle: r.Cycle, Neighborhood: r.Neighborhood, Type: r.Type, Phase: r.Phase, Tension: r.Tension, Summary: r.Summary }));
        return arcs.length ? table(arcs, ['Cycle', 'Neighborhood', 'Type', 'Phase', 'Tension', 'Summary']) : 'none';
      });
      await more('Safety notes on the street-texture log, every Cycle on it', async () => {
        const tx = (await sheets.getSheetAsObjects('Texture_Trigger_Log')).filter((r) => isSafety(r.Domain))
          .map((r) => ({ Cycle: r.Cycle, Neighborhood: r.Neighborhood, Note: r.Reason, Intensity: r.Intensity }));
        return tx.length ? table(tx, ['Cycle', 'Neighborhood', 'Note', 'Intensity']) : 'none';
      });
      await more('Crime and safety event counts on the domain tracker, by Cycle', async () => {
        const d = (await sheets.getSheetAsObjects('Domain_Tracker')).map((r) => ({ Cycle: r.Cycle, CRIME: r.CRIME, SAFETY: r.SAFETY, 'All events': r.TotalEvents }));
        return d.length ? table(d, ['Cycle', 'CRIME', 'SAFETY', 'All events']) : '';
      });
      return { blocks: out, key: 'crime clearance response time arrests custody patrol' };
    },
  },
};
// ---- the shared readers the other workers' fills are made of. Each returns blocks of the tab's own rows; a tab that
// cannot be read is a block that says so. Nothing is picked, ranked or worded: which row matters is the worker's.
// Source of which tab is whose: docs/research/2026-11-15-worker-records-all-tabs.md (all 85 tabs, read live).
// ctx.window: how many Cycles of a by-Cycle tab are handed (1 = this Cycle, 2 = this and the last); unset = every Cycle on
// the tab. Older Cycles are the worker's to read with sheet_read (builder 2026-11-16: "having a tool to search for history,
// AI wont read that much and will assume if the packet leaves room to assume"). A tab whose rows all carry one Cycle is the
// current state (the neighborhood map) and is never cut.
const CYCLE_COLS = ['Cycle', 'CycleId', 'CycleID', 'cycle'];
const cycleColOf = (cols) => CYCLE_COLS.find((c) => cols.includes(c));
function windowRows(rowsIn, cycle, window) {
  if (!window || !rowsIn.length) return { rows: rowsIn, cut: false };
  const col = cycleColOf(Object.keys(rowsIn[0]));
  if (!col) return { rows: rowsIn, cut: false };
  if (new Set(rowsIn.map((r) => String(r[col]).trim())).size <= 1) return { rows: rowsIn, cut: false };
  const lo = Number(cycle) - Number(window);
  return { rows: rowsIn.filter((r) => { const c = num(r[col]); return isFinite(c) && c <= Number(cycle) && c > lo; }), cut: true };
}
// The crisis arcs the engine is carrying now (generateCrisisBuckets_ -> previousCycleState.crisisArcs, the newest
// PREV_CYCLE_STATE_JSON row on Carry_Forward_Store at or before the Cycle; the same read as buildWorldSummary.liveCrisisArcs).
// Event_Arc_Ledger is an audit log written at onset, peak and resolve, with fossil rows from an older engine: it is not the
// arcs' state (2026-11-16: it held the Downtown Transit Snarl "early, tension 5" while the engine carried it in decline at 2.45).
async function liveArcsAt(sheets, cycle) {
  const hits = (await sheets.getSheetAsObjects('Carry_Forward_Store'))
    .filter((r) => r.Key === 'PREV_CYCLE_STATE_JSON' && Number(r.Cycle) <= Number(cycle)).sort((a, b) => Number(b.Cycle) - Number(a.Cycle));
  if (!hits.length) throw new Error('no carried city state at or before Cycle ' + cycle);
  let st; try { st = JSON.parse(hits[0].JSON); } catch (e) { throw new Error('the carried city state for Cycle ' + hits[0].Cycle + ' does not parse'); }
  return { asOf: Number(hits[0].Cycle), arcs: Array.isArray(st.crisisArcs) ? st.crisisArcs : [] };
}
function recordKit(cycle, ctx) {
  const { sheets } = defaults(ctx.deps);
  const cache = ctx.cache || {};   // shared when one wake builds its records twice (lean and in full): one read per tab
  const all = (tab) => (cache[tab] = cache[tab] || sheets.getSheetAsObjects(tab));
  let cutHere = false;   // set when the block being read was cut to the window; its title then says which Cycles it holds
  const rows = async (tab, opts) => {
    if (opts && opts.allCycles) return all(tab);
    const w = windowRows(await all(tab), cycle, ctx.window);
    if (w.cut) cutHere = true;
    return w.rows;
  };
  const fold = (v) => String(v || '').trim().toLowerCase();
  const inSet = (v, list) => list.map(fold).includes(fold(v));
  const out = [];
  const span = ctx.window ? (Number(ctx.window) === 1 ? 'Cycle ' + cycle : 'Cycles ' + (Number(cycle) - Number(ctx.window) + 1) + '–' + cycle) : '';
  const retitle = (t) => t.replace(/, every Cycle on (the sheet|it)$|, every entry$|, each Cycle$/, '').replace(/,? by Cycle$/, '') + ', ' + span;
  const add = async (title, read) => {
    cutHere = false;
    try { const t = await read(); if (t) out.push({ title: cutHere ? retitle(title) : title, text: t }); }
    catch (e) { out.push({ title, text: 'unavailable (' + ((e && e.message) || e) + ')' }); }
  };
  const kit = {
    blocks: out,
    // one initiative's row on the tracker, every column as the sheet holds it
    initiative: (id) => add('Your initiative on the city\'s tracker (' + id + ')', async () => {
      const r = (await rows('Initiative_Tracker')).find((x) => x.InitiativeID === id);
      return r ? Object.keys(r).filter((k) => k).map((k) => k + ': ' + r[k]).join('\n') : 'no row for ' + id;
    }),
    tracker: () => add('Every initiative on the city\'s tracker', async () => {
      const t = await rows('Initiative_Tracker');
      const cols = ['InitiativeID', 'Name', 'Status', 'Stage', 'ImplementationPhase', 'Budget', 'BudgetRemaining', 'AffectedNeighborhoods', 'PolicyDomain', 'VoteCycle', 'NextScheduledAction', 'NextActionCycle', 'LastWorkCycle'];
      return t.length ? table(t, cols.filter((c) => c in t[0])) : 'none';
    }),
    treasury: (title, pick) => add(title, async () => {
      const t = (await rows('City_Treasury')).filter((r) => !pick || pick(r));
      return t.length ? table(t, ['Cycle', 'Entry', 'Amount', 'Counterparty', 'BalanceAfter', 'Note']) : 'none';
    }),
    chaos: (title, vehicles) => add(title, async () => {
      const c = (await rows('Chaos_Cars')).filter((r) => inSet(r.VehicleType, vehicles))
        .map((r) => ({ Cycle: r.CycleId, Vehicle: r.VehicleType, Where: r.TargetScope === 'citizen' ? 'citizen ' + (ctx.nameOf(r.TargetId) || r.TargetId) : r.TargetScope + ' ' + r.TargetId, Outcome: r.DiceOutcome, Moved: r.PrimaryMetric + ' ' + r.MetricMagnitude, 'What the block saw': r.ChaosNarrativeSeed || '' }));
      return c.length ? table(c, ['Cycle', 'Vehicle', 'Where', 'Outcome', 'Moved', 'What the block saw']) : 'none';
    }),
    events: (title, domains) => add(title, async () => {
      const w = (await rows('WorldEvents_V3_Ledger')).filter((r) => inSet(r.Domain, domains))
        .map((r) => ({ Cycle: r.Cycle, Domain: String(r.Domain).toUpperCase(), Neighborhood: r.Neighborhood, Severity: r.Severity, Event: r.EventDescription }));
      return w.length ? table(w, ['Cycle', 'Domain', 'Neighborhood', 'Severity', 'Event']) : 'none';
    }),
    // the arcs the engine carries now, whatever the window: an open arc is current however long ago it began
    arcs: (title, pick) => add(title, async () => {
      const live = await liveArcsAt(sheets, cycle);
      const a = live.arcs.map((x) => ({ Arc: x.name || x.arcId, Neighborhood: x.neighborhood, Type: x.type, DomainTag: x.domainTag || x.domain || '', Phase: x.phase,
        Tension: x.tension, Began: x.cycleCreated, 'In this phase since': x.phaseStartCycle, Citizens: (x.citizens || []).length, Summary: x.summary })).filter(pick);
      return (a.length ? table(a, ['Arc', 'Neighborhood', 'Type', 'Phase', 'Tension', 'Began', 'In this phase since', 'Citizens', 'Summary']) : 'none') +
        (live.asOf !== Number(cycle) ? '\n(as the engine carried them after Cycle ' + live.asOf + ')' : '');
    }),
    texture: (title, domains) => add(title, async () => {
      const t = (await rows('Texture_Trigger_Log')).filter((r) => inSet(r.Domain, domains))
        .map((r) => ({ Cycle: r.Cycle, Domain: r.Domain, Neighborhood: r.Neighborhood, Note: r.Reason, Intensity: r.Intensity }));
      return t.length ? table(t, ['Cycle', 'Domain', 'Neighborhood', 'Note', 'Intensity']) : 'none';
    }),
    ripples: (title, causes) => add(title, async () => {
      const r = (await rows('Ripple_Ledger')).filter((x) => inSet(x.CauseType, causes))
        .map((x) => ({ Cycle: x.Cycle, Cause: x.CauseType, Detail: x.CauseDetail, Effect: x.EffectType, Neighborhood: x.Neighborhood, Size: x.Magnitude, Lasts: x.Duration, Left: x.RemainingStrength }));
      return r.length ? table(r, ['Cycle', 'Cause', 'Detail', 'Effect', 'Neighborhood', 'Size', 'Lasts', 'Left']) : 'none';
    }),
    domains: (title, cols) => add(title, async () => {
      const d = await rows('Domain_Tracker');
      return d.length ? table(d, ['Cycle'].concat(cols, ['TotalEvents'])) : '';
    }),
    hoodMap: (title, cols) => add(title + ', Cycle ' + cycle, async () => {
      const m = await rows('Neighborhood_Map');
      return m.length ? table(m, ['Neighborhood'].concat(cols)) : '';
    }),
    // the residents the archive holds as deceased: who they were, the archive's death fields, and the death line from their
    // own life history — the one place the sheet words how they died (HealthCause is blank on all nine C106–C114 deaths).
    // ArchiveNote is not handed: the engine's note on the row's bad data at exit, read as a fact about the person (2026-11-16:
    // the medical examiner refused all nine on "defects-at-exit: schoolQualityUnusable"; builder: "Leave it out").
    deaths: (title) => add(title, async () => {
      const line = (h) => { const m = String(h || '').match(/[^\n]*\[Death\][^\n]*/); return m ? m[0].replace(/\[Death\]\s*/, '').trim() : ''; };
      const d = (await rows('Citizen_Archive')).filter((r) => /deceased/i.test(String(r.Status) + ' ' + String(r.ArchiveReason)))
        .map((r) => ({ POPID: r.POPID, Name: [r.First, r.Last].filter(Boolean).join(' '), Born: r.BirthYear, Neighborhood: r.Neighborhood, Role: r.RoleType,
          Status: r.Status, Reason: r.ArchiveReason, 'Left the ledger': r.ExitCycle, 'Cause on file': r.HealthCause, 'Their record': line(r.LifeHistory) }));
      return d.length ? table(d, Object.keys(d[0])) : 'none';
    }),
    demographics: (title, cols) => add(title, async () => {
      const m = await rows('Neighborhood_Demographics');
      return m.length ? table(m, ['Neighborhood'].concat(cols)) : '';
    }),
    // opts.allCycles: the pick names its own Cycles (this one and the one before), so the window does not apply
    whole: (title, tab, cols, pick, opts) => add(title, async () => {
      const t = (await rows(tab, opts)).filter((r) => !pick || pick(r));
      return t.length ? table(t, (cols || Object.keys(t[0])).filter((c) => c in t[0])) : 'none';
    }),
    // the care-and-justice census: the city's line for each intake type by Cycle, then each neighborhood's intakes by Cycle
    // opts.care: each neighborhood's in care and beds at the end of the Cycle beside its intakes (builder 2026-11-16, on
    // the EMS director: "Add both"); one Cycle is a table of the three, several a grid of "intakes / in care / beds"
    census: async (label, system, types, opts) => {
      cutHere = false;
      let c = []; try { c = (await rows('Care_Justice_Census')).filter((r) => r.System === system); } catch (e) { out.push({ title: label + ', by Cycle', text: 'unavailable (' + e.message + ')' }); return; }
      const t = (x) => (cutHere ? retitle(x) : x);
      const cyc = [...new Set(c.map((r) => Number(r.Cycle)))].filter(isFinite).sort((x, y) => x - y);
      const city = c.filter((r) => r.GeographicScope === 'city' && (!types || types.includes(r.IntakeType)))
        .map((r) => ({ Cycle: r.Cycle, Kind: r.IntakeType, Intakes: r.TotalIntakes, 'Start of Cycle': r.OpeningOccupancy, 'End of Cycle': r.ClosingOccupancy, Beds: r.BedsOccupied, 'Transfers in': r.TransfersIn, 'Transfers out': r.TransfersOut, Exits: r.Exits }));
      out.push({ title: t(label + ', citywide by Cycle'), text: city.length ? table(city, Object.keys(city[0])) : 'none' });
      for (const k of [...new Set(c.filter((r) => r.GeographicScope === 'neighborhood' && (!types || types.includes(r.IntakeType))).map((r) => r.IntakeType))]) {
        const hoods = [...new Set(c.filter((r) => r.GeographicScope === 'neighborhood').map((r) => r.Neighborhood))];
        const at = (h, cy) => c.find((x) => x.Neighborhood === h && Number(x.Cycle) === cy && x.GeographicScope === 'neighborhood' && x.IntakeType === k);
        const cell = (h, cy) => { const r = at(h, cy); return r ? r.TotalIntakes : ''; };
        // custody is held, not bedded: the judicial rows carry no beds (BedsOccupied blank, OccupancyMeasure in-custody)
        const held = system === 'judicial' ? 'in custody' : 'in care', beds = system !== 'judicial';
        const cols = ['Intakes', held.charAt(0).toUpperCase() + held.slice(1) + ' at end of Cycle'].concat(beds ? ['Beds'] : []);
        const vals = (r) => [r.TotalIntakes, r.ClosingOccupancy].concat(beds ? [r.BedsOccupied] : []);
        if (opts && opts.care && cyc.length === 1) {
          const rowsK = hoods.map((h) => { const v = vals(at(h, cyc[0]) || {}); return Object.assign({ Neighborhood: h }, ...cols.map((col, i) => ({ [col]: v[i] }))); });
          out.push({ title: t(label + ' — ' + k + ' by neighborhood, each Cycle'), text: table(rowsK, ['Neighborhood'].concat(cols)) });
        } else if (opts && opts.care) {
          const three = (h, cy) => { const r = at(h, cy); return r ? vals(r).join(' / ') : ''; };
          out.push({ title: t(label + ' — ' + k + ' by neighborhood, each Cycle (' + cols.map((col) => col.toLowerCase()).join(' / ') + ')'), text: table(hoods.map((h) => Object.assign({ Neighborhood: h }, ...cyc.map((cy) => ({ ['C' + cy]: three(h, cy) })))), ['Neighborhood'].concat(cyc.map((cy) => 'C' + cy))) });
        } else
        out.push({ title: t(label + ' — ' + k + ' intakes by neighborhood, each Cycle'), text: table(hoods.map((h) => Object.assign({ Neighborhood: h }, ...cyc.map((cy) => ({ ['C' + cy]: cell(h, cy) })))), ['Neighborhood'].concat(cyc.map((cy) => 'C' + cy))) });
      }
    },
  };
  return kit;
}
const made = (key, build, levers) => ({ key, levers: levers || [], build: async (cycle, ctx) => { const k = recordKit(cycle, ctx); await build(k, cycle, ctx); return { blocks: k.blocks, key }; } });
const projectFill = (id, key, more) => made(key, async (k, cycle, ctx) => {
  await k.initiative(id);
  await k.treasury('The city\'s payments on ' + id, (r) => String(r.Counterparty || '').trim() === id);
  if (more) await more(k, cycle, ctx);
});

Object.assign(FILLS, {
  'PROJ-STABFUND': projectFill('INIT-001', 'stabilization fund households rent grants', async (k) => {
    await k.whole('Households the fund has paid a grant to', 'Household_Ledger', ['HouseholdId', 'Neighborhood', 'HousingType', 'MonthlyRent', 'HouseholdIncome', 'HouseholdSavings', 'LastGrantCycle', 'LastGrantInitiativeID', 'LastGrantAmount', 'Status'], (r) => String(r.LastGrantInitiativeID || '').trim() !== '');
    await k.hoodMap('Housing pressure, rent and income on the neighborhood map', ['HousingPressure', 'MedianRent', 'MedianIncome', 'MigrationFlow', 'NeighborhoodTrajectory']);
    await k.ripples('What initiatives set moving in the neighborhoods', ['initiative-implementation', 'initiative']);
  }),
  'PROJ-OARI': projectFill('INIT-002', 'crisis response mental health dispatch', async (k) => {
    await k.chaos('OARI van events, every Cycle on the sheet', ['oari_van']);
    await k.census('Hospital intakes', 'hospital', ['mental-health-crisis', 'substance-treatment'], { care: true });   // builder 2026-11-16: "Yes, same as EMS"
    // her events: the calls OARI answers sit between the two (builder 2026-11-16: "Safety + health events")
    await k.events('Safety and health events on the city\'s event ledger', ['SAFETY', 'HEALTH']);
  }),
  'PROJ-HEALTHCTR': projectFill('INIT-005', 'health center clinic patients', async (k) => {
    await k.census('Hospital intakes', 'hospital', ['all'], { care: true });   // builder 2026-11-16: in care and beds, "Yes"
    await k.demographics('Residents sick, by neighborhood', ['Sick', 'Students', 'Adults', 'Seniors']);
    await k.whole('Health programs in the community', 'Community_Programs', null, (r) => /health/i.test(r.Type));
    await k.events('Health events on the city\'s event ledger', ['HEALTH']);   // builder 2026-11-16: "Health events only"
  }),
  'PROJ-TRANSITHUB': projectFill('INIT-003', 'transit hub ridership stations', async (k, cycle) => {
    await k.whole('Transit by station and corridor, Cycle ' + cycle, 'Transit_Metrics', ['Station', 'Corridor', 'RidershipVolume', 'OnTimePerformance', 'TrafficIndex', 'Notes', 'Factors'], (r) => Number(r.Cycle) === Number(cycle), { allCycles: true });
    await k.whole('Transit by station and corridor, the Cycle before', 'Transit_Metrics', ['Station', 'Corridor', 'RidershipVolume', 'OnTimePerformance', 'TrafficIndex', 'Notes'], (r) => Number(r.Cycle) === Number(cycle) - 1, { allCycles: true });
    await k.chaos('BART train events, every Cycle on the sheet', ['bart_train']);
    await k.ripples('What transit events set moving', ['transit-event']);
    await k.events('Traffic events on the city\'s event ledger', ['TRAFFIC']);
  }),
  'STAFF-BAYLIGHT': projectFill('INIT-006', 'baylight harbor construction', async (k) => {
    await k.hoodMap('Boom exposure and income on the neighborhood map', ['BoomExposure', 'BoomIndex', 'MedianIncome', 'RetailVitality', 'NeighborhoodTrajectory']);
    await k.chaos('Container ship events, every Cycle on the sheet', ['cargo_ship']);
    await k.whole('Construction and architecture firms on the business ledger', 'Business_Ledger', null, (r) => /construction|architecture/i.test(r.Sector));
  }),
  'DA-01': made('charges custody arrests court', async (k) => {
    await k.census('Arrests and custody', 'judicial', null, { care: true });   // builder 2026-11-16: in custody per neighborhood, "Yes"
    await k.treasury('Fines the court paid to the city', (r) => /^COURT/.test(r.Counterparty || ''));
    await k.whole('Cases on the case ledger', 'Judicial_Ledger');
    await k.whole('Clearance and incidents by neighborhood', 'Crime_Metrics', ['Neighborhood', 'IncidentCount', 'ClearanceRate', 'PropertyLevel', 'ViolentLevel', 'Trend']);
    // the stop is the police chief's, the case hers (builder 2026-11-16: "Patrol car calls + safety events")
    await k.chaos('Patrol car events, every Cycle on the sheet', ['cop_car']);
    await k.events('Safety events on the city\'s event ledger', ['SAFETY']);
  }),
  'EMS-DIR': made('hospital intakes ambulance illness injury', async (k) => {
    await k.census('Hospital intakes', 'hospital', null, { care: true });
    await k.whole('Tracked residents in the hospital ledger', 'Hospital_Ledger');
    await k.whole('Residents waiting on a cause', 'Health_Cause_Queue');
    await k.chaos('Ambulance events, every Cycle on the sheet', ['ambulance']);
    await k.demographics('Residents sick, by neighborhood', ['Sick', 'Students', 'Adults', 'Seniors']);
    await k.arcs('Health arcs open now', (r) => /^health$/i.test(r.DomainTag) || /health/i.test(r.Type));
    await k.events('Health events on the city\'s event ledger', ['HEALTH']);
    await k.domains('Health event counts on the domain tracker, by Cycle', ['HEALTH']);
  }),
  'MED-EXAM': made('deaths cause of death', async (k) => {
    await k.deaths('Residents on the archive as deceased');
    // the two below as the sheet holds them, old rows included (builder 2026-11-16: "As the sheet holds them")
    await k.whole('Tracked residents in the hospital ledger', 'Hospital_Ledger');
    await k.whole('Residents waiting on a cause', 'Health_Cause_Queue');
    // the chaos cars and events in his scope are his records too (builder 2026-11-16: "as the data is the job the events
    // are also in their scope"; on him: "Ambulance calls + health events")
    await k.chaos('Ambulance events, every Cycle on the sheet', ['ambulance']);
    await k.events('Health events on the city\'s event ledger', ['HEALTH']);
  }),
  'STAFF-DM-COMM': made('community programs housing neighborhoods', async (k) => {
    await k.initiative('INIT-001');
    await k.whole('Community programs', 'Community_Programs');
    await k.hoodMap('Housing, migration and direction on the neighborhood map', ['HousingPressure', 'MedianRent', 'MedianIncome', 'MigrationFlow', 'NeighborhoodTrajectory', 'TrajectoryMomentum', 'Sentiment']);
    await k.ripples('What migration and neighborhood direction set moving', ['migration', 'trajectory', 'neighborhood-fold']);
    await k.whole('Faith organizations', 'Faith_Organizations', ['Organization', 'FaithTradition', 'Neighborhood', 'Congregation', 'Leader', 'ActiveStatus']);
  }),
  'STAFF-MANAGER': made('city budget treasury services', async (k) => {
    await k.treasury('The city\'s treasury, every entry', null);
    await k.tracker();
    await k.chaos('Garbage truck, street sweeper and power-and-gas truck events, every Cycle on the sheet', ['garbage_truck', 'street_sweeper', 'pge_truck']);
    await k.events('Infrastructure events on the city\'s event ledger', ['INFRASTRUCTURE']);
    await k.whole('The city\'s loads this Cycle', 'World_Population', ['cycle', 'totalPopulation', 'employmentRate', 'illnessRate', 'civicLoad', 'trafficLoad', 'retailLoad', 'tourismLoad', 'nightlifeLoad', 'publicSpacesLoad', 'sentiment', 'shockFlag', 'patternFlag']);
    await k.domains('Event counts on the domain tracker, by Cycle', ['CIVIC', 'INFRASTRUCTURE', 'TRANSIT', 'ECONOMIC', 'HEALTH', 'SAFETY']);
  }),
  'STAFF-DM-ECON': made('business jobs employment retail', async (k) => {
    await k.whole('Every business on the ledger', 'Business_Ledger', ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', 'Annual_Revenue', 'Growth_Rate']);
    await k.whole('Businesses that closed', 'Business_Archive');
    await k.hoodMap('Retail, income and employers on the neighborhood map', ['RetailVitality', 'MedianIncome', 'IncomeTier', 'EmployerCharacter', 'BoomIndex']);
    await k.demographics('Residents out of work, by neighborhood', ['Unemployed', 'Adults']);
    await k.chaos('Building inspector, mail truck and container ship events, every Cycle on the sheet', ['building_inspector', 'mail_truck', 'cargo_ship']);
    await k.ripples('What economic events set moving', ['economic-event']);
    await k.events('Business and economic events on the city\'s event ledger', ['BUSINESS', 'ECONOMIC']);
  }),
  'EMERG-DIR': made('crisis emergency weather alerts', async (k) => {
    await k.arcs('Crisis arcs open now', (r) => /crisis/i.test(r.Type));
    await k.whole('Weather by Cycle', 'Cycle_Weather', ['CycleID', 'Type', 'Temp', 'Impact', 'Advisory', 'Alerts', 'Streak', 'StreakType']);
    await k.ripples('What crisis events set moving', ['crisis-event']);
    await k.events('Weather and environment events on the city\'s event ledger', ['WEATHER', 'ENVIRONMENT']);
    await k.whole('The city\'s shock and pattern flags this Cycle', 'World_Population', ['cycle', 'shockFlag', 'patternFlag', 'civicLoad', 'weatherType', 'weatherImpact']);
  }),
  'CHIEF-FIRE': made('fire engine calls', async (k) => {
    await k.chaos('Fire engine events, every Cycle on the sheet', ['fire_engine']);
  }),
});

// What each worker's job is, in city words (builder 2026-11-16: "puppeting means putting words in their mouth and telling
// them what to say, it doesnt mean telling them what to do, theyre AI agents, they by definition need a task … these are
// data agents. if a council or media call on them they can answer the questions on the data as they have it … in their
// wakes is a scheduled wake on the same data to speak on what they see … think of these templates as agents in a workflow
// that also wake as a cron to report as the worker"). A worker with a job here wakes lean: this Cycle of each record,
// each record whole a read away (record_read), the neighborhood a read away (neighborhood_read), and the task last.
// A worker without one wakes as before until its job is written and read.
const JOBS = {
  'CHIEF-FIRE': 'You run the city\'s fire service. Your job is to answer for its record — each fire engine call, where it went and what came of it — when the Mayor, the council or the press ask, and in your weekly report on the record.',
  'EMERG-DIR': 'You run the city\'s emergency management office. Your job is to answer for the city\'s crises and its weather — what is open, how it is moving, what it set off — when the Mayor, the council or the press ask, and in your weekly report on the record.',
  'PROJ-STABFUND': 'You run the West Oakland Stabilization Fund. Your job is to answer for its record — the households it has paid and how much, the fund\'s money and progress, and the rent and housing pressure in the neighborhoods — when the Mayor, the council or the press ask, and in your weekly report on the record.',
  'DA-01': 'You are the city\'s district attorney. Your job is to answer for the city\'s arrests and the people in custody, the cases before the court, and the fines the court collects — when the Mayor, the council or the press ask, and in your weekly report on the record.',
  'PROJ-HEALTHCTR': 'You run the Temescal Community Health Center. Your job is to answer for its record — the center\'s money and progress, the hospital intakes it serves alongside, the illness in each neighborhood, and the city\'s health programs — when the Mayor, the council or the press ask, and in your weekly report on the record.',
  'PROJ-OARI': 'You run the Oakland Alternative Response Initiative. Your job is to answer for its record — each OARI van call, where it went and what came of it, the mental-health and substance intakes at the hospital, and the program\'s money and progress — when the Mayor, the council or the press ask, and in your weekly report on the record.',
  'EMS-DIR': 'You run the city\'s emergency medical services. Your job is to answer for the city\'s ambulance calls and hospital intakes — who came in, from where and for what, who is in care, and the illness in each neighborhood — when the Mayor, the council or the press ask, and in your weekly report on the record.',
  'MED-EXAM': 'You are the city\'s medical examiner. Your job is to answer for the city\'s deaths and their causes — who died, when, and the cause on file, the residents in hospital care, and those still waiting on a cause — when the Mayor, the council or the press ask, and in your weekly report on the record.',
};
const isLean = (officeId) => Object.prototype.hasOwnProperty.call(JOBS, String(officeId || ''));
// The weekly report is made against the last one (builder 2026-11-16, on a quiet week: "2" — report against the last
// report). With no last report on file, it is made on this Cycle alone.
// What they reply is what is saved, word for word (builder 2026-11-16: "3" — the task says so; nothing is cut after they
// speak). Seen before it: "Weather table in hand … Let me put the report on the record."; "Do you want me to prepare …?".
const ON_RECORD = (what) => 'Your reply goes on the record as your ' + what + ', exactly as you give it.';
const reportTask = (cycle, last) => (last
  ? 'Cycle ' + cycle + ', your weekly report: speak on the record on what has changed in your records since your last report.'
  : 'Cycle ' + cycle + ', your weekly report: speak on the record on what you see in your records this Cycle.') + ' ' + ON_RECORD('report');
// Their last weekly report: the newest weekday record of theirs before this wake's date that the worker template made and
// that finished (cron-civic-run.js runWorkerDatawake writes output/cron-civic/datawake/<agentDir>_<date>.json). A record
// that ended mid-lookup is not a report (2026-11-16: the emergency director's "Let me check transit metrics…").
function lastReport(agentDir, beforeDate, deps) {
  const root = (deps && deps.root) || ROOT;
  const dir = path.join(root, 'output', 'cron-civic', 'datawake');
  let files = []; try { files = fs.readdirSync(dir); } catch (e) { return null; }
  const pre = agentDir + '_';
  const dated = files.filter((f) => f.startsWith(pre) && /^\d{4}-\d{2}-\d{2}\.json$/.test(f.slice(pre.length)))
    .map((f) => f.slice(pre.length, pre.length + 10)).filter((d) => !beforeDate || d < beforeDate).sort().reverse();
  for (const d of dated) {
    let rec; try { rec = JSON.parse(fs.readFileSync(path.join(dir, pre + d + '.json'), 'utf8')); } catch (e) { continue; }
    if (rec && /^worker\//.test(String(rec.template || '')) && rec.finishReason === 'stop' && String(rec.statement || '').trim())
      return { date: d, cycle: Number(rec.cycle), statement: String(rec.statement).trim() };
  }
  return null;
}

// A fill that is built is not yet a wake that runs on it. LIVE names the workers whose scheduled wakes use the template
// (builder 2026-11-14, on the chief: "Turn it on"). Adding an office here is the switch; it is his word per worker.
// 2026-11-15: every built worker is on (builder 2026-11-14: "all workers will run on a schedule like police chief";
// 2026-11-15, on the thirteen built and held off: "why are tye swiched off"). To hold one off, take it out of this list.
const LIVE = new Set(Object.keys(FILLS));
// The name a worker's records are filed under: its folder name where it has one, else one made from its office id.
const slugFor = (office) => office.agentDir || ('worker-' + String(office.officeId || office.projectId || '').toLowerCase());
const isBuilt = (officeId) => Object.prototype.hasOwnProperty.call(FILLS, String(officeId || ''));
const hasFill = (officeId) => LIVE.has(String(officeId || '')) && isBuilt(officeId);

// The harness for one worker's wake. opts: { officeId, cycle, officeMap, question?, askerLine?, window?, date?, deps? }
//   date: the wake's date (YYYY-MM-DD); a lean worker's last report is its newest before this date.
//   window: Cycles of each by-Cycle record handed (recordKit); unset = every Cycle on the tab.
//   question + askerLine: someone's question to this worker, in their words, with who they are. Both or neither.
//   With no question: a lean worker (JOBS) is given its weekly report as the task; any other, nothing is added.
// -> { office, system, user, memory, decisions, records, lean }
async function buildWake(opts) {
  const o = opts || {};
  // a project director sits under `projects` with a projectId; everyone else under `offices`
  const om = o.officeMap || {};
  const found = (om.offices || []).concat(om.projects || []).find((x) => (x.officeId || x.projectId) === o.officeId);
  const office = found ? Object.assign({}, found, { officeId: found.officeId || found.projectId, agentDir: slugFor(found) }) : null;
  if (!office || !isBuilt(o.officeId)) throw new Error('no worker fill for ' + o.officeId);
  const question = String(o.question || '').trim(), askerLine = String(o.askerLine || '').trim();
  if (question && !askerLine) throw new Error('missing askerLine: a question is handed over with who asks it');
  const who = await whoTheyAre(office.popid, o.deps);
  const lean = isLean(o.officeId);
  const cache = {};
  const fill = await FILLS[o.officeId].build(Number(o.cycle), { deps: o.deps, nameOf: who.nameOf, window: lean ? 1 : o.window, cache });
  // lean: each record whole, every Cycle on it, read from the same tabs — what record_read hands back, untouched
  const records = {};
  if (lean) {
    const whole = await FILLS[o.officeId].build(Number(o.cycle), { deps: o.deps, nameOf: who.nameOf, cache });
    whole.blocks.forEach((b) => { records[b.title] = b.text; });
  }
  const memory = await gatherMemory(office.popid, question || fill.key, o.deps);
  const decisions = pastDecisions(office.popid, office.agentDir, o.deps);
  const last = lean && !question ? lastReport(office.agentDir, o.date || new Date().toISOString().slice(0, 10), o.deps) : null;
  const system = [who.line].concat(lean ? ['', JOBS[o.officeId]] : [], memory.entries.length ? ['', 'From your own memory:', ...memory.entries.map((m) => '- (' + m.when + ') ' + m.text)] : []).join('\n');
  const user = [
    ...fill.blocks.map((b) => b.title + ':\n' + b.text),
    'What you have decided and said on the record:\n' + (decisions.length
      ? decisions.map((d) => '- Cycle ' + d.cycle + ', ' + d.type + (d.askedBy ? ' — asked by ' + d.askedBy + ': ' + d.question + '\n  You answered: ' + d.said : ': ' + d.said)).join('\n')
      : '- nothing on record'),
    ...(last ? ['Your last report on the record (Cycle ' + last.cycle + '):\n' + last.statement] : []),
    ...(question ? [askerLine + ' asks you:\n\n' + question].concat(lean ? [ON_RECORD('answer')] : []) : lean ? [reportTask(o.cycle, last)] : []),
  ].join('\n\n');
  return { office, system, user, memory, decisions, records, lean, last };
}

// Who a worker is, alone: the sheet line and their gathered memory — the same system turn buildWake gives them, with
// no records. For a wake that hands the worker its own work (the Sunday hearing's packet): the worker opens as the
// same person on Sunday as on a weekday, off the sheet, never off a written file (builder 2026-11-15: "why are you
// loading old files whe we just rewrote them").
async function identity(officeId, officeMap, deps) {
  const om = officeMap || {};
  const found = (om.offices || []).concat(om.projects || []).find((x) => (x.officeId || x.projectId) === officeId);
  if (!found || !isBuilt(officeId)) throw new Error('no worker fill for ' + officeId);
  const who = await whoTheyAre(found.popid, deps);
  const memory = await gatherMemory(found.popid, FILLS[officeId].key || '', deps);
  return [who.line].concat(memory.entries.length ? ['', 'From your own memory:', ...memory.entries.map((m) => '- (' + m.when + ') ' + m.text)] : []).join('\n');
}

// ---- part 3: the tools. Described to the worker; nothing says when to use one. ----
// The reporters' twelve sheets plus the three no reporter reads: the chaos-car sheet, the city's money, the case ledger.
const SHEETS = ['Initiative_Tracker', 'Neighborhood_Map', 'Oakland_Sports_Feed', 'Civic_Office_Ledger', 'Faith_Organizations', 'Faith_Ledger', 'Business_Ledger',
  'Transit_Metrics', 'Neighborhood_Demographics', 'Care_Justice_Census', 'Community_Programs', 'Crime_Metrics', 'Chaos_Cars', 'City_Treasury', 'Judicial_Ledger',
  // the city's record tabs a worker could not reach before the full read (2026-11-15)
  'WorldEvents_V3_Ledger', 'Event_Arc_Ledger', 'Texture_Trigger_Log', 'Domain_Tracker', 'Cycle_Weather', 'Household_Ledger', 'Employment_Roster', 'Hospital_Ledger', 'Ripple_Ledger'];
const fn = (name, description, properties, required) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });
const TOOLS = [
  fn('sheet_read', 'Read one of the city\'s sheets: ' + SHEETS.join(', ') + '. A sheet kept by Cycle reads newest first; earlier Cycles are read by naming them.',
    { tab: { type: 'string' }, match: { type: 'string', description: 'optional: only the rows naming this word (a neighborhood, a name, an id)' },
      from_cycle: { type: 'integer', description: 'optional: only rows from this Cycle on' }, to_cycle: { type: 'integer', description: 'optional: only rows up to this Cycle' } }, ['tab']),
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
// A lean worker's two reads: a record in full, and a neighborhood — where something happened and who lives and works there.
const LEAN_TOOLS = (names) => [
  fn('record_read', 'Open one of your records in full, every Cycle on it: ' + names.join('; ') + '.', { record: { type: 'string', enum: names } }, ['record']),
  fn('neighborhood_read', 'Read one neighborhood: its row on the neighborhood map, its people by age, the businesses in it, and the residents on the city\'s ledger who live there.', { neighborhood: { type: 'string' } }, ['neighborhood']),
];
function toolsFor(officeId, opts) {
  const levers = (FILLS[officeId] || {}).levers || [];
  const records = Object.keys((opts && opts.records) || {});
  return TOOLS.concat(isLean(officeId) && records.length ? LEAN_TOOLS(records) : [],
    levers.map((l) => LEVER_TOOLS[l]((opts && opts.patrolStrategies) || ['balanced', 'suppress_hotspots', 'community_presence'])));
}
// The ledger snapshot the engine's dump writes each Cycle (output/simulation_ledger_snapshot.jsonl): who lives where.
function ledgerSnapshot(deps) {
  const d = deps || {};
  if (d.ledgerRows) return d.ledgerRows;
  return readJsonl(path.join(d.root || ROOT, 'output', 'simulation_ledger_snapshot.jsonl')).filter((r) => r && r.POPID);
}
async function neighborhoodRead(input, deps) {
  const { sheets } = defaults(deps);
  const want = String((input || {}).neighborhood || '').trim().toLowerCase();
  let map = [];
  try { map = await sheets.getSheetAsObjects('Neighborhood_Map'); } catch (e) { return '(the neighborhood map could not be read: ' + e.message + ')'; }
  const row = map.find((r) => String(r.Neighborhood || '').trim().toLowerCase() === want);
  if (!row) return 'no neighborhood "' + (input || {}).neighborhood + '" on the map. The neighborhoods: ' + map.map((r) => r.Neighborhood).filter(Boolean).join(', ');
  const hood = String(row.Neighborhood).trim();
  const same = (v) => String(v || '').trim().toLowerCase() === hood.toLowerCase();
  const parts = ['On the neighborhood map:\n' + Object.keys(row).filter((k) => k).map((k) => k + ': ' + row[k]).join('\n')];
  try {
    const demo = (await sheets.getSheetAsObjects('Neighborhood_Demographics')).find((r) => same(r.Neighborhood));
    if (demo) parts.push('Its people:\n' + Object.keys(demo).filter((k) => k && k !== 'Neighborhood').map((k) => k + ': ' + demo[k]).join('\n'));
  } catch (e) { parts.push('Its people: unavailable (' + e.message + ')'); }
  try {
    const biz = (await sheets.getSheetAsObjects('Business_Ledger')).filter((r) => same(r.Neighborhood));
    parts.push('Businesses in it (' + biz.length + '):\n' + (biz.length ? table(biz, ['BIZ_ID', 'Name', 'Sector', 'Employee_Count'].filter((c) => c in biz[0])) : 'none'));
  } catch (e) { parts.push('Businesses in it: unavailable (' + e.message + ')'); }
  const people = ledgerSnapshot(deps).filter((r) => same(r.Neighborhood) && !/deceased|archived/i.test(String(r.Status || '')));
  parts.push('Residents on the city\'s ledger who live there (' + people.length + '):\n' + (people.length
    ? table(people.map((r) => ({ Name: r.Name || [r.First, r.Last].filter(Boolean).join(' '), Role: r.RoleType, Born: r.BirthYear })), ['Name', 'Role', 'Born']) : 'none'));
  return capTo(parts.join('\n\n'), 8000);
}
const capTo = (s, n) => (s.length > n ? s.slice(0, n) + '\n(cut at ' + n + ' characters)' : s);
async function sheetRead(input, deps) {   // the reporters' reader (cron-desk-writer.js toolSheetRead), same shape, on the worker's list
  const { sheets } = defaults(deps);
  const tab = String((input || {}).tab || '').trim();
  if (!SHEETS.includes(tab)) return 'no such sheet. The sheets: ' + SHEETS.join(', ');
  try {
    const data = await sheets.getRawSheetData(tab); const match = String(input.match || '').trim().toLowerCase();
    const head = data[0] || [];
    const ci = head.indexOf(cycleColOf(head));
    // a Cycle bound that is not a number is no bound (a blank or "latest" never empties the read)
    const from = num(input.from_cycle), to = num(input.to_cycle);
    const wantsRange = isFinite(from) || isFinite(to);
    const ranged = ci >= 0 && wantsRange;
    let rows = data.slice(1).filter((r) => r.some((v) => String(v == null ? '' : v).trim() !== ''));   // a sheet's blank tail is not rows
    if (ranged) rows = rows.filter((r) => { const c = num(r[ci]); return isFinite(c) && (!isFinite(from) || c >= from) && (!isFinite(to) || c <= to); });
    if (match) rows = rows.filter((r) => r.join(' ').toLowerCase().includes(match));
    // a sheet kept by Cycle: newest Cycle first (a stable sort keeps the sheet's order inside one Cycle)
    if (ci >= 0) rows = rows.map((r, i) => [r, i]).sort((a, b) => (num(b[0][ci]) || 0) - (num(a[0][ci]) || 0) || a[1] - b[1]).map((x) => x[0]);
    const range = ranged ? 'in Cycles ' + (isFinite(from) ? from : 'first') + '–' + (isFinite(to) ? to : 'latest') : '';
    const noCycle = wantsRange && ci < 0 ? '\n(' + tab + ' is not kept by Cycle: every row is shown, the Cycles asked for do not apply)' : '';
    if (!rows.length) return 'no row in ' + tab + (match ? ' names "' + input.match + '"' : '') + (range ? ' ' + range : '') + ' (' + Math.max(0, data.length - 1) + ' rows read)' + noCycle;
    const limit = match ? 12 : 40;
    const shown = rows.slice(0, limit);
    const asked = [match ? 'naming "' + input.match + '"' : '', range].filter(Boolean).join(' ');
    const more = rows.length > shown.length ? '\n(' + shown.length + (ci >= 0 ? ' newest' : ' first') + ' of ' + rows.length + ' rows' + (asked ? ' ' + asked : '') +
      (ci >= 0 ? ' — name earlier Cycles to read them' : ' — pass match to pull rows by a word') + ')' : '';
    return capTo([head].concat(shown).map((r) => r.join(' | ')).join('\n'), 6000) + more + noCycle;
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
// ctx: { popid, cycle, stage: { patrol: [] }, normalizePatrol(v) -> strategy|null, records?, deps?, dw? }
// A lever is STAGED, never executed here: the caller files it through the move gate once the wake has a statement.
function toolExecutor(ctx) {
  return async function (name, input) {
    input = input || {};
    if (name === 'sheet_read') return sheetRead(input, ctx.deps);
    if (name === 'memory_recall') return memoryRecall(ctx.popid, input, ctx.deps);
    if (name === 'record_read') {
      const recs = ctx.records || {};
      const key = Object.keys(recs).find((k) => k === String(input.record || '').trim());
      return key ? capTo(key + ':\n' + recs[key], 8000) : 'no record "' + input.record + '". Your records: ' + Object.keys(recs).join('; ');
    }
    if (name === 'neighborhood_read') return neighborhoodRead(input, ctx.deps);
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

module.exports = { JOBS, isLean, reportTask, lastReport, neighborhoodRead, FILLS, hasFill, isBuilt, LIVE, slugFor, identity, buildWake, toolsFor, toolExecutor, TOOLS, SHEETS,
  highLow, patrolInForce, askAndWhy, loadMoves, pastDecisions, gatherMemory, whoTheyAre, sheetRead, memoryRecall, table };
