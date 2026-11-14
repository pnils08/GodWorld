// pipeline.110 Task 9 — the worker template, printed on its spec (the police chief). NO model call, nothing written
// but the .md beside this file. Prints exactly what a worker would wake with under docs/reference/AGENT_BOOT_TEMPLATES.md §3:
//   1 who they are · 2 their data (the fill) · 4 their memory, gathered · 5 their past decisions · 6 the task.
// The template parts are the functions below; a worker differs only in FILLS[<officeId>].
// Run under scripts/guard/nowrite.js:  node 2026-11-14-worker-wake-print.js CHIEF-POLICE <cycle> ["<question>" "<asker line>"]
require('/root/GodWorld/lib/env');
const fs = require('fs'), path = require('path');
const ROOT = '/root/GodWorld';
const sheets = require(ROOT + '/lib/sheets');
const page = require(ROOT + '/lib/citizenPage');
const dials = require(ROOT + '/lib/citizenDials');
const wp = require(ROOT + '/lib/wakePerception');
const maraDirective = require(ROOT + '/scripts/maraDirective');
const [officeId, cycleArg, question, askerLine] = process.argv.slice(2);
const cycle = Number(cycleArg);
const officeMap = JSON.parse(fs.readFileSync(ROOT + '/scripts/civic-office-map.json', 'utf8'));
const table = (rows, cols) => [cols.join(' | ')].concat(rows.map((r) => cols.map((c) => String(r[c] == null ? '' : r[c])).join(' | '))).join('\n');

// ---- part 2, THE FILL: one entry per worker. Each block = { title, text, key } (key: words the memory gatherer uses on an own wake)
const FILLS = {
  'CHIEF-POLICE': async () => {
    const out = [];
    const crime = await sheets.getSheetAsObjects('Crime_Metrics');
    const ccols = Object.keys(crime[0]).filter((c) => crime.some((r) => String(r[c] || '').trim()));   // a column blank in every row is left out and named
    const blank = Object.keys(crime[0]).filter((c) => !ccols.includes(c));
    out.push({ title: 'Crime by neighborhood, Cycle ' + cycle + ' (the department\'s sheet; it keeps this Cycle only, no earlier Cycles)' + (blank.length ? '. No reading this Cycle: ' + blank.join(', ') : ''), text: table(crime, ccols) });
    const census = (await sheets.getSheetAsObjects('Care_Justice_Census')).filter((r) => r.System === 'judicial' && r.IntakeType === 'arrest');
    const cyc = [...new Set(census.map((r) => Number(r.Cycle)))].sort((a, b) => a - b);
    const city = census.filter((r) => r.GeographicScope === 'city').map((r) => ({ Cycle: r.Cycle, Arrests: r.TotalIntakes, 'In custody, start': r.OpeningOccupancy, 'In custody, end': r.ClosingOccupancy, Released: r.Exits, 'Residents covered': r.CoveredPopulation }));
    out.push({ title: 'Arrests and custody, citywide, Cycles ' + cyc[0] + '–' + cyc[cyc.length - 1], text: table(city, Object.keys(city[0])) });
    const hoods = [...new Set(census.filter((r) => r.GeographicScope === 'neighborhood').map((r) => r.Neighborhood))];
    const cell = (h, c, f) => { const r = census.find((x) => x.Neighborhood === h && Number(x.Cycle) === c && x.GeographicScope === 'neighborhood'); return r ? r[f] : ''; };
    out.push({ title: 'Arrests by neighborhood, each Cycle', text: table(hoods.map((h) => Object.assign({ Neighborhood: h }, ...cyc.map((c) => ({ ['C' + c]: cell(h, c, 'TotalIntakes') })))), ['Neighborhood'].concat(cyc.map((c) => 'C' + c))) });
    out.push({ title: 'In custody at the end of each Cycle, by neighborhood', text: table(hoods.map((h) => Object.assign({ Neighborhood: h }, ...cyc.map((c) => ({ ['C' + c]: cell(h, c, 'ClosingOccupancy') })))), ['Neighborhood'].concat(cyc.map((c) => 'C' + c))) });
    const cars = (await sheets.getSheetAsObjects('Chaos_Cars')).filter((r) => r.VehicleType === 'cop_car' && Number(r.CycleId) >= cyc[0] && Number(r.CycleId) <= cycle)
      .map((r) => ({ Cycle: r.CycleId, Where: r.TargetScope + ' ' + r.TargetId, Outcome: r.DiceOutcome, Moved: r.PrimaryMetric + ' ' + r.MetricMagnitude }));
    out.push({ title: 'Patrol car events, Cycles ' + cyc[0] + '–' + cycle + (cars.some((c) => Number(c.Cycle) === cycle) ? '' : ' (none this Cycle)'), text: cars.length ? table(cars, Object.keys(cars[0])) : 'none' });
    const wc = await sheets.getSheetAsObjects('World_Config'); const ps = wc.find((r) => r.Key === 'patrolStrategy');
    out.push({ title: 'Patrol strategy in force', text: ps && String(ps.Value).trim() ? String(ps.Value) : 'balanced (the default; no setting is recorded on the city\'s sheet)' });
    const money = (await sheets.getSheetAsObjects('City_Treasury')).filter((r) => /^(COURT|TICKETS)/.test(r.Counterparty || '') && Number(r.Cycle) >= cyc[0]).map((r) => ({ Cycle: r.Cycle, Source: r.Counterparty, Amount: r.Amount, Note: r.Note }));
    out.push({ title: 'Fines and tickets paid to the city', text: table(money, ['Cycle', 'Source', 'Amount', 'Note']) });
    const top = crime.slice().sort((a, b) => Number(b.PressureRatio) - Number(a.PressureRatio)).slice(0, 3).map((r) => r.Neighborhood);
    return { blocks: out, key: 'crime ' + top.join(' ') + ' clearance response time arrests custody patrol' };
  },
};

// ---- part 1: who they are — the live daily wake's own functions (ledger row, office sheet, dials)
async function whoTheyAre(popid) {
  const pool = await wp.buildPool({ shapedMin: 0, lifeMinChars: 0 });
  const offices = await wp.loadOfficeHolders();
  const c = pool.find((x) => x.popId === String(popid).toUpperCase());
  if (!c) return null;
  let disp = ''; try { disp = dials.disposition(c.cur) || ''; } catch (e) {}
  return wp.identityLine({ ...c, office: offices.byPop[c.popId] }) + (disp ? ' Your temperament: ' + disp + '.' : '');
}

// ---- part 4: memory, gathered — a search of the worker's whole page on what is in front of them, plus their newest own
// words (the search lags fresh entries). Office statements and open-question lines are not handed back as memory.
async function gatherMemory(popid, key) {
  const tidy = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const hits = ((await page.searchPage_(popid, key, 6)).results || []).filter((r) => String((r.metadata || {}).type || '') !== 'tension')
    .map((r) => ({ when: (r.createdAt || '').slice(0, 10), type: (r.metadata || {}).type || '', text: tidy(r.content).replace(/^(datawake|stated):\s*/i, 'Your public statement: ') }));
  const recent = ((await page.recentPage_(popid, 12)).results || []).filter((r) => !['office-position', 'tension', 'show'].includes(String((r.metadata || {}).type || '')))
    .slice(0, 2).map((r) => ({ when: (r.createdAt || '').slice(0, 10), type: (r.metadata || {}).type || '', text: tidy(r.content) }));
  const seen = new Set(); const all = [];
  for (const m of recent.concat(hits)) { const k = m.text.slice(0, 80); if (m.text && !seen.has(k)) { seen.add(k); all.push(m); } }
  return { key, entries: all, fromSearch: hits.length, newest: recent.length };
}

// ---- part 5: past decisions — the worker's own moves by POPID (one person's moves are keyed three ways), each answer with its question
function pastDecisions(popid, agentDir) {
  const dir = path.join(ROOT, 'output', 'cron-civic', 'moves'); const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => /^moves_c\d+\.jsonl$/.test(x)).sort()) {
    for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean)) {
      let m; try { m = JSON.parse(l); } catch (e) { continue; }
      if (String(m.popid || '').toUpperCase() !== String(popid).toUpperCase()) continue;
      const p = m.payload || {}; const d = { cycle: m.cycle, date: m.date, type: m.type };
      if (m.type === 'answer') {
        d.said = p.text || '';
        const qf = path.join(ROOT, 'output', 'mara-directives', 'mara_directive_c' + p.directiveCycle + '_AUTO.txt');
        try { const b = maraDirective.blocksFor(fs.readFileSync(qf, 'utf8'), p.confrontationSeat || agentDir); d.askedBy = 'Mara Vance, City Planning Director (Cycle ' + p.directiveCycle + ')'; d.question = b.join('\n').split('\n').map((x) => (x.match(/^- \*\*(Address|Why):\*\*\s*(.+)$/) || [])[2]).filter(Boolean).join(' '); } catch (e) { d.question = ''; }   // her ask and her reason only: no folder path, no form fields
      } else d.said = Object.entries(p).map(([k, v]) => k + ': ' + v).join('; ');
      out.push(d);
    }
  }
  return out;
}

(async () => {
  const office = officeMap.offices.find((o) => o.officeId === officeId);
  if (!office || !FILLS[officeId]) throw new Error('no fill for ' + officeId);
  const who = await whoTheyAre(office.popid);
  const fill = await FILLS[officeId]();
  const mem = await gatherMemory(office.popid, question || fill.key);
  const dec = pastDecisions(office.popid, office.agentDir);
  const system = [who, '', 'From your own memory:', ...mem.entries.map((m) => '- (' + m.when + ') ' + m.text)].join('\n');
  const user = [
    ...fill.blocks.map((b) => b.title + ':\n' + b.text), '',
    'What you have decided and said on the record:',
    ...(dec.length ? dec.map((d) => '- Cycle ' + d.cycle + ', ' + d.type + (d.askedBy ? ' — asked by ' + d.askedBy + ': ' + d.question + '\n  You answered: ' + d.said : ': ' + d.said)) : ['- nothing on record']), '',
    question ? (askerLine || 'A council member') + ' asks you:\n\n' + question : 'It is the close of Cycle ' + cycle + '. You are speaking on the record as ' + office.title + '.',
  ].join('\n\n').replace(/\n\n\n+/g, '\n\n');
  const md = ['# What ' + office.holder + ' (' + office.title + ') would wake with — worker template, Cycle ' + cycle, '',
    'No model was called. Sizes: system ' + system.length + ' characters, user ' + user.length + '. Memory: ' + mem.fromSearch + ' from a search on "' + mem.key + '", ' + mem.newest + ' newest of his own; ' + mem.entries.length + ' after duplicates. Decisions on record: ' + dec.length + '.', '',
    '## System turn (who he is, his memory)', '', '```', system, '```', '', '## User turn (his data, his decisions, the task)', '', '```', user, '```', ''].join('\n');
  const outFile = path.join(__dirname, '2026-11-14-worker-wake-print.' + officeId + (question ? '.asked' : '.own') + '.md');
  fs.writeFileSync(outFile, md);
  console.log(outFile + '\nsystem ' + system.length + ' / user ' + user.length + ' chars; memory ' + mem.entries.length + '; decisions ' + dec.length);
})().catch((e) => { console.log('FAILED ' + e.stack); process.exit(1); });
