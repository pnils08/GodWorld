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
 * The template is the harness, not the work (builder 2026-11-14: "the template doesn't give the work , it's the harness
 * for the cron"; "You have to be careful you aren't puppeting these"). It carries NO task, no line on what the worker is
 * doing, and no note on what the data means, shows or lacks: a title names its data and nothing else. When someone has
 * put a question to the worker, the caller hands it over and it is placed last in the asker's own words, with who asks.
 * With no question, nothing is added.
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
function recordKit(cycle, ctx) {
  const { sheets } = defaults(ctx.deps);
  const cache = {};
  const rows = (tab) => (cache[tab] = cache[tab] || sheets.getSheetAsObjects(tab));
  const fold = (v) => String(v || '').trim().toLowerCase();
  const inSet = (v, list) => list.map(fold).includes(fold(v));
  const out = [];
  const add = async (title, read) => { try { const t = await read(); if (t) out.push({ title, text: t }); } catch (e) { out.push({ title, text: 'unavailable (' + ((e && e.message) || e) + ')' }); } };
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
        .map((r) => ({ Cycle: r.CycleId, Vehicle: r.VehicleType, Where: r.TargetScope === 'citizen' ? 'citizen ' + (ctx.nameOf(r.TargetId) || r.TargetId) : r.TargetScope + ' ' + r.TargetId, Outcome: r.DiceOutcome, Moved: r.PrimaryMetric + ' ' + r.MetricMagnitude }));
      return c.length ? table(c, ['Cycle', 'Vehicle', 'Where', 'Outcome', 'Moved']) : 'none';
    }),
    events: (title, domains) => add(title, async () => {
      const w = (await rows('WorldEvents_V3_Ledger')).filter((r) => inSet(r.Domain, domains))
        .map((r) => ({ Cycle: r.Cycle, Domain: String(r.Domain).toUpperCase(), Neighborhood: r.Neighborhood, Severity: r.Severity, Event: r.EventDescription }));
      return w.length ? table(w, ['Cycle', 'Domain', 'Neighborhood', 'Severity', 'Event']) : 'none';
    }),
    arcs: (title, pick) => add(title, async () => {
      const a = (await rows('Event_Arc_Ledger')).filter(pick)
        .map((r) => ({ Cycle: r.Cycle, Arc: r.ArcId, Neighborhood: r.Neighborhood, Type: r.Type, Phase: r.Phase, Tension: r.Tension, Summary: r.Summary }));
      return a.length ? table(a, ['Cycle', 'Arc', 'Neighborhood', 'Type', 'Phase', 'Tension', 'Summary']) : 'none';
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
    demographics: (title, cols) => add(title, async () => {
      const m = await rows('Neighborhood_Demographics');
      return m.length ? table(m, ['Neighborhood'].concat(cols)) : '';
    }),
    whole: (title, tab, cols, pick) => add(title, async () => {
      const t = (await rows(tab)).filter((r) => !pick || pick(r));
      return t.length ? table(t, (cols || Object.keys(t[0])).filter((c) => c in t[0])) : 'none';
    }),
    // the care-and-justice census: the city's line for each intake type by Cycle, then each neighborhood's intakes by Cycle
    census: async (label, system, types) => {
      let c = []; try { c = (await rows('Care_Justice_Census')).filter((r) => r.System === system); } catch (e) { out.push({ title: label + ', by Cycle', text: 'unavailable (' + e.message + ')' }); return; }
      const cyc = [...new Set(c.map((r) => Number(r.Cycle)))].filter(isFinite).sort((x, y) => x - y);
      const city = c.filter((r) => r.GeographicScope === 'city' && (!types || types.includes(r.IntakeType)))
        .map((r) => ({ Cycle: r.Cycle, Kind: r.IntakeType, Intakes: r.TotalIntakes, 'Start of Cycle': r.OpeningOccupancy, 'End of Cycle': r.ClosingOccupancy, Beds: r.BedsOccupied, 'Transfers in': r.TransfersIn, 'Transfers out': r.TransfersOut, Exits: r.Exits }));
      out.push({ title: label + ', citywide by Cycle', text: city.length ? table(city, Object.keys(city[0])) : 'none' });
      for (const k of [...new Set(c.filter((r) => r.GeographicScope === 'neighborhood' && (!types || types.includes(r.IntakeType))).map((r) => r.IntakeType))]) {
        const hoods = [...new Set(c.filter((r) => r.GeographicScope === 'neighborhood').map((r) => r.Neighborhood))];
        const cell = (h, cy) => { const r = c.find((x) => x.Neighborhood === h && Number(x.Cycle) === cy && x.GeographicScope === 'neighborhood' && x.IntakeType === k); return r ? r.TotalIntakes : ''; };
        out.push({ title: label + ' — ' + k + ' intakes by neighborhood, each Cycle', text: table(hoods.map((h) => Object.assign({ Neighborhood: h }, ...cyc.map((cy) => ({ ['C' + cy]: cell(h, cy) })))), ['Neighborhood'].concat(cyc.map((cy) => 'C' + cy))) });
      }
    },
  };
  return kit;
}
const made = (key, build, levers) => ({ levers: levers || [], build: async (cycle, ctx) => { const k = recordKit(cycle, ctx); await build(k, cycle, ctx); return { blocks: k.blocks, key }; } });
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
    await k.census('Hospital intakes', 'hospital', ['mental-health-crisis', 'substance-treatment']);
  }),
  'PROJ-HEALTHCTR': projectFill('INIT-005', 'health center clinic patients', async (k) => {
    await k.census('Hospital intakes', 'hospital', ['all']);
    await k.demographics('Residents sick, by neighborhood', ['Sick', 'Adults', 'Seniors']);
    await k.whole('Health programs in the community', 'Community_Programs', null, (r) => /health/i.test(r.Type));
  }),
  'PROJ-TRANSITHUB': projectFill('INIT-003', 'transit hub ridership stations', async (k, cycle) => {
    await k.whole('Transit by station and corridor, Cycle ' + cycle, 'Transit_Metrics', ['Station', 'Corridor', 'RidershipVolume', 'OnTimePerformance', 'TrafficIndex', 'Notes', 'Factors'], (r) => Number(r.Cycle) === Number(cycle));
    await k.whole('Transit by station and corridor, the Cycle before', 'Transit_Metrics', ['Station', 'Corridor', 'RidershipVolume', 'OnTimePerformance', 'TrafficIndex', 'Notes'], (r) => Number(r.Cycle) === Number(cycle) - 1);
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
    await k.census('Arrests and custody', 'judicial', null);
    await k.treasury('Fines the court paid to the city', (r) => /^COURT/.test(r.Counterparty || ''));
    await k.whole('Cases on the case ledger', 'Judicial_Ledger');
    await k.whole('Clearance and incidents by neighborhood', 'Crime_Metrics', ['Neighborhood', 'IncidentCount', 'ClearanceRate', 'PropertyLevel', 'ViolentLevel', 'Trend']);
  }),
  'EMS-DIR': made('hospital intakes ambulance illness injury', async (k) => {
    await k.census('Hospital intakes', 'hospital', null);
    await k.whole('Tracked residents in the hospital ledger', 'Hospital_Ledger');
    await k.whole('Residents waiting on a cause', 'Health_Cause_Queue');
    await k.chaos('Ambulance events, every Cycle on the sheet', ['ambulance']);
    await k.demographics('Residents sick, by neighborhood', ['Sick', 'Adults', 'Seniors']);
    await k.arcs('Health arcs on the arc ledger', (r) => /^health$/i.test(r.DomainTag) || /health/i.test(r.Type));
    await k.events('Health events on the city\'s event ledger', ['HEALTH']);
    await k.domains('Health event counts on the domain tracker, by Cycle', ['HEALTH']);
  }),
  'MED-EXAM': made('deaths cause of death', async (k) => {
    await k.whole('Residents on the archive as deceased', 'Citizen_Archive', ['POPID', 'First', 'Last', 'BirthYear', 'Neighborhood', 'RoleType', 'HealthCause', 'ExitCycle', 'ArchiveNote'], (r) => /deceased/i.test(String(r.Status) + ' ' + String(r.ArchiveReason)));
    await k.whole('Tracked residents in the hospital ledger', 'Hospital_Ledger');
    await k.whole('Residents waiting on a cause', 'Health_Cause_Queue');
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
    await k.arcs('Crisis arcs on the arc ledger', (r) => /crisis/i.test(r.Type));
    await k.whole('Weather by Cycle', 'Cycle_Weather', ['CycleID', 'Type', 'Temp', 'Impact', 'Advisory', 'Alerts', 'Streak', 'StreakType']);
    await k.ripples('What crisis events set moving', ['crisis-event']);
    await k.events('Weather and environment events on the city\'s event ledger', ['WEATHER', 'ENVIRONMENT']);
    await k.whole('The city\'s shock and pattern flags this Cycle', 'World_Population', ['cycle', 'shockFlag', 'patternFlag', 'civicLoad', 'weatherType', 'weatherImpact']);
  }),
  'CHIEF-FIRE': made('fire engine calls', async (k) => {
    await k.chaos('Fire engine events, every Cycle on the sheet', ['fire_engine']);
  }),
});

// A fill that is built is not yet a wake that runs on it. LIVE names the workers whose scheduled wakes use the template
// (builder 2026-11-14, on the chief: "Turn it on"). Adding an office here is the switch; it is his word per worker.
// 2026-11-15: every built worker is on (builder 2026-11-14: "all workers will run on a schedule like police chief";
// 2026-11-15, on the thirteen built and held off: "why are tye swiched off"). To hold one off, take it out of this list.
const LIVE = new Set(Object.keys(FILLS));
// The name a worker's records are filed under: its folder name where it has one, else one made from its office id.
const slugFor = (office) => office.agentDir || ('worker-' + String(office.officeId || office.projectId || '').toLowerCase());
const isBuilt = (officeId) => Object.prototype.hasOwnProperty.call(FILLS, String(officeId || ''));
const hasFill = (officeId) => LIVE.has(String(officeId || '')) && isBuilt(officeId);

// The harness for one worker's wake. opts: { officeId, cycle, officeMap, question?, askerLine?, deps? }
//   question + askerLine: someone's question to this worker, in their words, with who they are. Both or neither.
//   With no question nothing is added after the worker's own records: the harness gives no work.
// -> { office, system, user, memory, decisions }
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
  const fill = await FILLS[o.officeId].build(Number(o.cycle), { deps: o.deps, nameOf: who.nameOf });
  const memory = await gatherMemory(office.popid, question || fill.key, o.deps);
  const decisions = pastDecisions(office.popid, office.agentDir, o.deps);
  const system = [who.line].concat(memory.entries.length ? ['', 'From your own memory:', ...memory.entries.map((m) => '- (' + m.when + ') ' + m.text)] : []).join('\n');
  const user = [
    ...fill.blocks.map((b) => b.title + ':\n' + b.text),
    'What you have decided and said on the record:\n' + (decisions.length
      ? decisions.map((d) => '- Cycle ' + d.cycle + ', ' + d.type + (d.askedBy ? ' — asked by ' + d.askedBy + ': ' + d.question + '\n  You answered: ' + d.said : ': ' + d.said)).join('\n')
      : '- nothing on record'),
    ...(question ? [askerLine + ' asks you:\n\n' + question] : []),
  ].join('\n\n');
  return { office, system, user, memory, decisions };
}

// ---- part 3: the tools. Described to the worker; nothing says when to use one. ----
// The reporters' twelve sheets plus the three no reporter reads: the chaos-car sheet, the city's money, the case ledger.
const SHEETS = ['Initiative_Tracker', 'Neighborhood_Map', 'Oakland_Sports_Feed', 'Civic_Office_Ledger', 'Faith_Organizations', 'Faith_Ledger', 'Business_Ledger',
  'Transit_Metrics', 'Neighborhood_Demographics', 'Care_Justice_Census', 'Community_Programs', 'Crime_Metrics', 'Chaos_Cars', 'City_Treasury', 'Judicial_Ledger',
  // the city's record tabs a worker could not reach before the full read (2026-11-15)
  'WorldEvents_V3_Ledger', 'Event_Arc_Ledger', 'Texture_Trigger_Log', 'Domain_Tracker', 'Cycle_Weather', 'Household_Ledger', 'Employment_Roster', 'Hospital_Ledger', 'Ripple_Ledger'];
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

module.exports = { FILLS, hasFill, isBuilt, LIVE, slugFor, buildWake, toolsFor, toolExecutor, TOOLS, SHEETS,
  highLow, patrolInForce, askAndWhy, loadMoves, pastDecisions, gatherMemory, whoTheyAre, sheetRead, memoryRecall, table };
