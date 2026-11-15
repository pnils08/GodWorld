'use strict';
/**
 * scripts/seatWake.js — the council / Mayor template (pipeline.110 Task 9; docs/reference/AGENT_BOOT_TEMPLATES.md §2).
 *
 * A seat is a data agent for its district, built as the police chief is (builder 2026-11-14: "An iniative isn't the job
 * … Like a police chief this is a different form of a data agent … In their wakes they get to "walk" their districts ,
 * call on citizens in their districts … One of their abilities is to create an Iniative to serve their districts").
 *
 * What a seat wakes with, the same for the Mayor and the nine seats:
 *   1 who they are        the sheet line off the ledger, the office sheet and the dials (workerWake.whoTheyAre)
 *   2 their approval      now, last Cycle, and what puts them out of office — written here each wake, no explanation
 *                         (builder 2026-11-14: "a script edits each week so it show what their approval ratings is ,
 *                         what is was last cycle and what puts them out of office . Explanation isn't needed")
 *   3 their data          the seat's own pack (buildCivicOfficeSlice.buildPack) with what tells them what to do taken out
 *   4 their tools         the worker's four; calling on a resident; the council's business (propose, call a vote,
 *                         renew, work); answering Mara only when she has asked. Nothing says when to use one
 *   5 their memory        gathered from their page (workerWake.gatherMemory)
 *   6 their decisions     their own moves, each with what came of it
 *   7 what is put to them last, in the asker's words, with who asks. With nothing put to them nothing is added
 * The reply is the statement, whole. A move is a tool, staged here and filed by the caller through the move gate.
 * Weekday wake only; the Sunday hearing keeps its own path.
 *
 * Callers: cron-civic-run.js runSeatDatawake (with --seat-template). Every read is injected through `deps` for tests.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ww = require('./workerWake');
const ROOT = path.resolve(__dirname, '..');

// Mirrors CHALLENGER_NAMED_BELOW_ / SEAT_LOST_BELOW_ in phase05-citizens/updateCivicApprovalRatings.js (Apps Script,
// not requirable); seatWake.test.js reads the engine file and fails when they part.
const CHALLENGER_NAMED_BELOW = 40;
const SEAT_LOST_BELOW = 30;
// Reads, resident calls and moves together, one wake: the chief's budget. A resident call is a model call.
const MAX_TOOL_CALLS = 6;

const isSeat = (officeId) => /^(MAYOR-|COUNCIL-D\d)/.test(String(officeId || ''));

function defaults(deps) {
  const d = deps || {};
  return {
    root: d.root || ROOT,
    sheets: d.sheets || require('../lib/sheets'),
    buildPack: d.buildPack || ((a) => require('./buildCivicOfficeSlice').buildPack(a)),
    maraDirective: d.maraDirective || { blocksFor: (...a) => require('./maraDirective').blocksFor(...a) },
    voice: d.voice || voiceResident,
  };
}
function readJsonl(file) {
  let text; try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return []; }
  const out = [];
  for (const l of text.split('\n')) { if (!l.trim()) continue; try { out.push(JSON.parse(l)); } catch (e) { /* a torn line is skipped */ } }
  return out;
}
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; } };
const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

// ---- part 2: approval. Last Cycle is the beats dump stamped one Cycle back; with none, the line leaves it out. ----
function lastCycleApproval(officeId, cycle, root) {
  for (const dir of ['beats', path.join('beats', 'prev')]) {
    const meta = readJson(path.join(root, 'output', dir, 'meta.json'));
    if (!meta || Number(meta.cycle) !== Number(cycle) - 1) continue;
    const row = readJsonl(path.join(root, 'output', dir, 'Civic_Office_Ledger.jsonl')).find((r) => r.OfficeId === officeId);
    const v = row ? Number(row.Approval) : NaN;
    return isFinite(v) ? v : null;
  }
  return null;
}
async function approvalBlock(office, cycle, deps) {
  const { sheets, root } = defaults(deps);
  const row = (await sheets.getSheetAsObjects('Civic_Office_Ledger')).find((r) => r.OfficeId === office.officeId);
  const now = row ? Number(row.Approval) : NaN;
  if (!isFinite(now)) throw new Error('no approval on Civic_Office_Ledger for ' + office.officeId);
  const last = lastCycleApproval(office.officeId, cycle, root);
  return { title: 'Your approval', text: 'Approval ' + now + (last == null ? '' : '; last Cycle ' + last) + '. A challenger is named below ' +
    CHALLENGER_NAMED_BELOW + '; below ' + SEAT_LOST_BELOW + ' the challenger takes the seat.' };
}

// ---- part 3: their data — the pack as built, less what tells them what to do (task, pulse, prewrite), its rules and
// form (limits, output), and every build note (file paths, why-lines, retrieval keys). Titles name the data. ----
const table = ww.table;
function dataBlocks(pack, office, cycle) {
  const out = [];
  const g = pack.game || {};
  const s = ((pack.brief || {}).sections) || {};
  const where = /^D\d$/.test(String(office.district || '')) ? 'your district' : 'the city';   // the Mayor holds no district
  const fmt = (v) => (v == null ? '' : typeof v === 'number' ? Number(v.toFixed(3)) : String(v));
  for (const d of ((s.measuredState || {}).districts) || []) {
    const hoods = (d.neighborhoods || []).filter((h) => h.available !== false && h.measured);
    if (!hoods.length) continue;
    const cols = [...new Set(hoods.flatMap((h) => Object.keys(h.measured)))];
    const rows = hoods.map((h) => Object.assign({ Neighborhood: h.hood }, ...cols.map((c) => {
      const m = h.measured[c] || {};
      return { [c]: fmt(m.value) + (m.previous != null && String(m.previous) !== String(m.value) ? ' (last Cycle ' + fmt(m.previous) + ')' : '') };
    })));
    out.push({ title: (d.district === office.district ? 'Your district' : 'District ' + d.district) + ', Cycle ' + cycle, text: table(rows, ['Neighborhood'].concat(cols)) });
  }
  const events = ((s.events || {}).items) || [];
  out.push({ title: 'Events in ' + where + ', Cycle ' + cycle, text: events.length ? events.map((e) => '- ' + clip(e.text || e.summary || e.label || JSON.stringify(e), 400)).join('\n') : 'none' });
  const known = (pack.known || []).filter((k) => k && k.text && !/^F-office-/.test(String(k.id || '')));   // their approval is part 2
  if (known.length) out.push({ title: 'On the record, Cycle ' + cycle, text: known.map((k) => '- ' + k.text).join('\n') });
  const ex = pack.exposure || {};
  if ((ex.subjects || []).length) out.push({ title: 'People in ' + where + '', text: table(ex.subjects.map((p) => ({ Name: p.name, Neighborhood: p.neighborhood, Role: p.role })), ['Name', 'Neighborhood', 'Role']) });
  const named = (list, label) => { if ((list || []).length) out.push({ title: label, text: list.map((b) => '- ' + [b.name, b.neighborhood || b.hood, b.type || b.kind].filter(Boolean).join(', ')).join('\n') }); };
  named(ex.businesses, 'Businesses in ' + where);
  named(ex.churches, 'Congregations in ' + where);
  if ((g.board || []).length) {
    out.push({ title: 'Your board', text: table(g.board.map((b) => ({ Initiative: b.id, Name: b.name, Category: b.domain, Stage: b.stage || '', Status: b.status || '', Neighborhoods: (b.hoods || []).join(', '),
      Budget: String(b.budget || '').replace(/^budget:\s*/, ''), 'Vote Cycle': b.voteCycle == null ? '' : b.voteCycle, 'Next step due': b.nextActionCycle == null ? '' : 'C' + b.nextActionCycle,
      Next: b.needsNext || '', Yours: b.sponsored ? 'sponsor' : '' })), ['Initiative', 'Name', 'Category', 'Stage', 'Status', 'Neighborhoods', 'Budget', 'Vote Cycle', 'Next step due', 'Next', 'Yours']) });
  } else out.push({ title: 'Your board', text: 'none' });
  if (g.categories && g.categories.available) out.push({ title: 'Categories and budget bands', text: table(g.categories.list.map((c) => ({ Category: c.key, Covers: c.label, Band: c.band })), ['Category', 'Covers', 'Band']) });
  const pool = g.petitionPool || {};
  if (pool.available) out.push({ title: 'Complaints from ' + where + '', text: (pool.complaints || []).length ? table(pool.complaints.map((c) => ({ Cycle: c.cycle, Neighborhood: c.hood, Said: c.snippet, Mood: c.affect })), ['Cycle', 'Neighborhood', 'Said', 'Mood']) : 'none' });
  const probs = ((g.problemContinuity || {}).problems) || [];
  if (probs.length) out.push({ title: 'Conditions counted in ' + where + ', Cycle ' + cycle, text: table(probs.map((p) => ({ Neighborhood: p.hood, Condition: p.label, Count: p.count })), ['Neighborhood', 'Condition', 'Count']) });
  if (g.workingCity && g.workingCity.available) out.push({ title: 'What the city\'s workers last said', text: String(g.workingCity.text || '').replace(/^The working city:\n?/, '') });
  if (g.patrol && g.patrol.available) out.push({ title: 'The patrol setting', text: String(g.patrol.text || '') });
  const peers = ((pack.role || {}).civicPeers) || [];
  if (peers.length) out.push({ title: 'Seats in your faction', text: table(peers.map((p) => ({ Seat: p.OfficeId, Holder: p.Holder, District: p.District, Approval: p.Approval })), ['Seat', 'Holder', 'District', 'Approval']) });
  return out;
}

// ---- part 6: their decisions, each with what came of it (the last status line on the move ledger). A rejected
// move is not a decision. An answer carries Mara's question, as the chief's do. ----
function outcomes(root) {
  const dir = path.join(root, 'output', 'cron-civic', 'moves');
  let files = []; try { files = fs.readdirSync(dir).filter((x) => /^moves_c\d+\.jsonl$/.test(x)); } catch (e) { return {}; }
  const last = {};
  for (const f of files) for (const m of readJsonl(path.join(dir, f))) if (m && m.moveId && m.status) last[m.moveId] = { status: m.status, detail: m.detail || '' };
  return last;
}
const OUTCOME_WORDS = { pending: 'waiting on the week\'s close', applied: 'went through', failed: 'did not go through', superseded: 'replaced by a later one' };
function pastDecisions(popid, agentDir, deps) {
  const { root, maraDirective } = defaults(deps);
  const ends = outcomes(root);
  const out = [];
  for (const m of ww.loadMoves(root)) {
    if (String(m.popid || '').toUpperCase() !== String(popid).toUpperCase()) continue;
    const p = m.payload || {};
    const d = { cycle: Number(m.cycle), type: m.type };
    const end = ends[m.moveId] || {};
    d.outcome = (OUTCOME_WORDS[end.status] || end.status || '') + (end.detail && end.status !== 'applied' ? ' (' + clip(end.detail, 160) + ')' : '');
    if (m.type === 'answer') {
      d.said = String(p.text || '');
      try {
        const text = fs.readFileSync(path.join(root, 'output', 'mara-directives', 'mara_directive_c' + p.directiveCycle + '_AUTO.txt'), 'utf8');
        d.question = ww.askAndWhy(maraDirective.blocksFor(text, p.confrontationSeat || agentDir).join('\n'));
        if (d.question) d.askedBy = 'Mara Vance, City Planning Director (Cycle ' + p.directiveCycle + ')';
      } catch (e) { /* the question file is gone: the answer stands alone */ }
    } else d.said = Object.entries(p).filter(([k, v]) => v != null && String(v).trim() !== '' && k !== 'problem').map(([k, v]) => k + ': ' + (Array.isArray(v) ? v.join(', ') : v)).join('; ') +
      (p.problem ? '; purpose: ' + p.problem : '');
    out.push(d);
  }
  return out;
}

// The seat's open question from Mara, in her words: her ask and her reason, no form fields (workerWake.askAndWhy).
function maraQuestion(pack) {
  const open = ((((pack || {}).game || {}).confrontations || {}).open) || [];
  const c = open[0];
  if (!c) return null;
  const text = ww.askAndWhy(c.sourceText) || String(c.demand || '').replace(/^[^—]*—[^—]*—\s*/, '');
  return text ? { id: c.id, text, askerLine: 'Mara Vance, City Planning Director' } : null;
}

// The harness for one seat's wake. opts: { office, cycle, officeMap?, pack?, question?, askerLine?, deps? }
//   question + askerLine: someone's question to the seat (a reporter, a worker's answer, a resident), with who asks.
// -> { office, pack, system, user, memory, decisions, mara }
async function buildWake(opts) {
  const o = opts || {};
  const office = o.office;
  if (!office || !isSeat(office.officeId)) throw new Error('not a council seat or the Mayor: ' + (office && office.officeId));
  const question = String(o.question || '').trim(), askerLine = String(o.askerLine || '').trim();
  if (question && !askerLine) throw new Error('missing askerLine: a question is handed over with who asks it');
  const { buildPack, root } = defaults(o.deps);
  const pack = o.pack || buildPack({ cycle: Number(o.cycle), agentDir: office.agentDir, root });
  const who = await ww.whoTheyAre(office.popid, o.deps);
  const mara = maraQuestion(pack);
  const hoods = ((pack.signal || {}).hoods) || [];
  const memory = await ww.gatherMemory(office.popid, question || (mara && mara.text) || ['council district', ...hoods].join(' '), o.deps);
  const decisions = pastDecisions(office.popid, office.agentDir, o.deps);
  const system = [who.line].concat(memory.entries.length ? ['', 'From your own memory:', ...memory.entries.map((m) => '- (' + m.when + ') ' + m.text)] : []).join('\n');
  const blocks = [await approvalBlock(office, o.cycle, o.deps)].concat(dataBlocks(pack, office, Number(o.cycle)));
  const user = [
    ...blocks.map((b) => b.title + ':\n' + b.text),
    'What you have decided and said on the record:\n' + (decisions.length
      ? decisions.map((d) => '- Cycle ' + d.cycle + ', ' + d.type + (d.askedBy ? ' — asked by ' + d.askedBy + ': ' + d.question + '\n  You answered: ' + d.said : ': ' + d.said) +
        (d.outcome ? '\n  What came of it: ' + d.outcome : '')).join('\n')
      : '- nothing on record'),
    ...(mara ? [mara.askerLine + ' asks your office:\n\n' + mara.text] : []),
    ...(question ? [askerLine + ' asks you:\n\n' + question] : []),
  ].join('\n\n');
  return { office, pack, system, user, memory, decisions, mara };
}

// ---- part 4: the tools. What each is and what follows; nothing says when to use one. Records first, then people,
// then the council's business; an initiative is one ability among them. ----
const fn = (name, description, properties, required) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });
function toolsFor(office, pack) {
  const citywide = !/^D\d$/.test(String(office.district || ''));
  const t = ww.TOOLS.concat([
    fn('resident_call', 'Call on a resident of ' + (citywide ? 'the city' : 'your district') + ' and put a question to them: name them, or name a neighborhood and call on someone who lives there. They answer in their own words.',
      { name: { type: 'string', description: 'a full name' }, neighborhood: { type: 'string' }, question: { type: 'string' } }, ['question']),
    fn('initiative_propose', 'Put an initiative before the council to serve ' + (citywide ? 'the city' : 'your district') + ': its name, what it is for, the category of city life it touches, its reach and a budget inside the category\'s band (a figure like $12.5M). ' +
      'It is entered as Proposed at the week\'s close; the council votes on it at the city hall run once a vote is called.',
    { title: { type: 'string' }, purpose: { type: 'string' }, category: { type: 'string' },
      reach: { type: 'string', enum: citywide ? ['hood', 'district', 'all'] : ['hood', 'district'], description: citywide ? 'named neighborhoods, a district, or the whole city' : 'named neighborhoods of your district, or the whole district' },
      hoods: { type: 'array', items: { type: 'string' } }, budget: { type: 'string' } }, ['title', 'purpose', 'category', 'reach', 'budget']),
    fn('vote_call', 'Send a proposed initiative with no vote scheduled to the next city hall vote. ' + (citywide ? 'The Mayor may call any.' : 'A district seat may call one with a neighborhood in its district.') + ' One call per initiative a week.',
      { initiativeId: { type: 'string' } }, ['initiativeId']),
    fn('program_renew', 'Ask the council to re-fund a running program on your board that is running low or has run dry, with an amount inside its category\'s band. The council votes the next week; the money lands the week after. One renewal pending per program.',
      { initiativeId: { type: 'string' }, amount: { type: 'string' } }, ['initiativeId', 'amount']),
    fn('initiative_work', 'Put your office\'s work into an initiative on your board. A funded one stands up once work lands on it; a running one weakens when left untended.',
      { initiativeId: { type: 'string' } }, ['initiativeId']),
  ]);
  if (maraQuestion(pack)) t.push(fn('directive_answer', 'Reply on the record to the question the City Planning Director put to your office.', { text: { type: 'string' } }, ['text']));
  return t;
}

// The resident's own voice: citizenVoice.js, read-only (no --record), as the reporters' interviews call it.
function voiceResident(popId, ask, cycle) {
  const out = execFileSync('node', [path.join(ROOT, 'scripts', 'citizenVoice.js'), '--pop=' + popId, '--ask=' + ask, '--json', '--cycle=' + cycle],
    { cwd: ROOT, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out);
}
// A door knocked on in a neighborhood: the pick is a hash of the day, the seat, the neighborhood and the call's place
// in the wake — the same call again reaches the same door.
function hashPick(list, key) {
  let h = 2166136261;
  for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return list.length ? list[h % list.length] : null;
}
function ledgerResidents(root) {
  return readJsonl(path.join(root, 'output', 'simulation_ledger_snapshot.jsonl')).filter((r) => r.Status === 'Active' && r.POPID && r.Neighborhood);
}

// ctx: { office, cycle, date, stage: { moves: [], calls: [] }, validate(moves) -> {accepted, rejected}, inDistrict(hood) -> bool,
//        confrontationId?, deps?, dw? }
// A move is STAGED, never executed here: the caller files the staged moves through the move gate once the wake has a statement.
function toolExecutor(ctx) {
  const { root, voice } = defaults(ctx.deps);
  const base = ww.toolExecutor({ popid: ctx.office.popid, cycle: ctx.cycle, stage: { patrol: [] }, deps: ctx.deps, dw: ctx.dw });
  let residents = null;
  const stageMove = (raw, said) => {
    const dup = ctx.stage.moves.find((m) => m.type === raw.type && raw.initiativeId && m.initiativeId === raw.initiativeId);
    if (dup) return 'not filed: already filed this wake';
    const mv = ctx.validate(ctx.stage.moves.concat([raw]));
    const refused = mv.rejected.find((r) => r.move === raw);
    if (refused) return 'not filed: ' + refused.reason;
    ctx.stage.moves.push(raw);
    return 'filed: ' + said;
  };
  return async function (name, input) {
    input = input || {};
    if (['sheet_read', 'memory_recall', 'citizen_lookup', 'canon_recall'].includes(name)) return base(name, input);
    if (name === 'resident_call') {
      const question = String(input.question || '').trim();
      if (!question) return 'no call: a question is needed';
      residents = residents || ledgerResidents(root);
      let c = null;
      const nm = String(input.name || '').trim().toLowerCase();
      if (nm) {
        c = residents.find((r) => String(r.Name || [r.First, r.Last].filter(Boolean).join(' ')).trim().toLowerCase() === nm);
        if (!c) return 'no one by the name ' + input.name + ' is on the city\'s ledger';
      } else {
        const hood = String(input.neighborhood || '').trim();
        if (!hood) return 'no call: name a resident or a neighborhood';
        const there = residents.filter((r) => String(r.Neighborhood).toLowerCase() === hood.toLowerCase() && r.POPID !== String(ctx.office.popid).toUpperCase());
        if (!there.length) return 'no resident of ' + hood + ' is on the city\'s ledger';
        c = hashPick(there, [ctx.date, ctx.office.officeId, hood.toLowerCase(), ctx.stage.calls.length].join('|'));
      }
      if (!ctx.inDistrict(c.Neighborhood)) return (c.Name || c.POPID) + ' lives in ' + c.Neighborhood + ', outside your district';
      const ask = ctx.office.holder + ', who holds the office of ' + ctx.office.title + ', calls on you and asks: "' + question + '"';
      let r;
      try { r = voice(c.POPID, ask, ctx.cycle); } catch (e) { return (c.Name || c.POPID) + ' could not be reached'; }
      const text = String((r && r.text) || '').trim();
      if (!text) return (c.Name || c.POPID) + ' did not answer';
      ctx.stage.calls.push({ popid: c.POPID, name: r.name || c.Name, neighborhood: c.Neighborhood, question, said: text });
      return (r.name || c.Name) + (r.occ ? ', ' + r.occ : '') + ', ' + c.Neighborhood + ':\n' + text;
    }
    if (name === 'initiative_propose') {
      return stageMove({ type: 'propose', title: input.title, purpose: input.purpose, category: input.category, reach: input.reach,
        hoods: Array.isArray(input.hoods) ? input.hoods : [], budget: input.budget }, '"' + clip(input.title, 80) + '", entered as Proposed at the week\'s close');
    }
    if (name === 'vote_call') return stageMove({ type: 'call-vote', initiativeId: String(input.initiativeId || '').trim() }, 'a vote called on ' + input.initiativeId + ' for the next city hall vote');
    if (name === 'program_renew') return stageMove({ type: 'renew', initiativeId: String(input.initiativeId || '').trim(), amount: input.amount }, 'renewal of ' + input.initiativeId + ' for ' + input.amount + ', to the council next week');
    if (name === 'initiative_work') return stageMove({ type: 'work', initiativeId: String(input.initiativeId || '').trim() }, 'work on ' + input.initiativeId + ', at the week\'s close');
    if (name === 'directive_answer') {
      if (!ctx.confrontationId) return 'no question from the City Planning Director is open';
      return stageMove({ type: 'answer', confrontationId: ctx.confrontationId, text: input.text }, 'your reply to the City Planning Director');
    }
    return 'unknown tool ' + name;
  };
}

// Move ledger lines for a seat's wake: one id per move. The weekday wake's single id (MV-<cycle>-<seat>-<date>) is kept
// for the first decision; a second or later one gets ':2', ':3' — the ledger folds by id, and two moves under one id
// would merge into one.
function moveLedgerLines(office, cycle, date, mv) {
  const base = 'MV-' + cycle + '-' + office.agentDir + '-' + date;
  const at = new Date().toISOString();
  let n = 0;
  const lines = mv.accepted.map((m) => ({
    moveId: m.type === 'answer' ? base + ':answer:' + m.payload.confrontationId : (++n === 1 ? base : base + ':' + n),
    cycle: Number(cycle), date, agentDir: office.agentDir, popid: office.popid || null,
    type: m.type, payload: m.payload, status: 'pending', at,
  }));
  mv.rejected.forEach((r, i) => lines.push({
    moveId: base + ':rej' + i, cycle: Number(cycle), date, agentDir: office.agentDir,
    popid: office.popid || null, type: (r.move && r.move.type) || null,
    payload: (r.move && typeof r.move === 'object') ? r.move : { raw: String(r.move) },
    status: 'rejected', detail: r.reason, at,
  }));
  return lines;
}

module.exports = { isSeat, buildWake, toolsFor, toolExecutor, moveLedgerLines, approvalBlock, lastCycleApproval, dataBlocks, pastDecisions,
  maraQuestion, hashPick, MAX_TOOL_CALLS, CHALLENGER_NAMED_BELOW, SEAT_LOST_BELOW };
