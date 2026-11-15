'use strict';
/**
 * scripts/seatWake.js — the council seat template (pipeline.110 Task 9; docs/reference/AGENT_BOOT_TEMPLATES.md §2).
 *
 * A seat is a data agent for its district, built as the police chief is (builder 2026-11-14: "An iniative isn't the job
 * … Like a police chief this is a different form of a data agent … In their wakes they get to "walk" their districts ,
 * call on citizens in their districts … One of their abilities is to create an Iniative to serve their districts").
 *
 * Built on one seat until it works, as the worker template was on the chief (builder 2026-11-15: "you need to focus on
 * building one that works rather than doing them all at once , like the plan state build the templates then the work
 * flows , and agree the mayor is likely its own template"). The spec is Terrence Mobley, District 9: BUILT holds the seats
 * on the template; another seat is added once his works. The Mayor is her own template, not this one.
 *
 * What a seat wakes with:
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
 * The reply is the statement, whole. A move is a tool, staged here through the gate the caller hands in.
 *
 * This is the template only (plan Task 9). Wiring it into the weekday run, filing its moves and recording the wake is
 * the workflow, after the builder approves the template (plan Task 11), as the chief's was (Task 10).
 * Callers: the print harness output/engine-sheet/2026-11-15-seat-wake-print.js. Every read is injected through `deps` for tests.
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

const BUILT = new Set(['COUNCIL-D9']);
const isSeat = (officeId) => BUILT.has(String(officeId || ''));

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
  const fmt = (v) => (v == null ? '' : typeof v === 'number' ? Number(v.toFixed(3)) : String(v));
  // A record that could not be read says so — it is not an empty record (workerWake.memoryRecall's rule).
  const UNAVAILABLE = 'unavailable this wake — not an empty record';
  const avail = (x) => !(x && x.available === false);
  for (const d of ((s.measuredState || {}).districts) || []) {
    const title = (d.district === office.district ? 'Your district' : 'District ' + d.district) + ', Cycle ' + cycle;
    const hoods = (d.neighborhoods || []).filter((h) => h.available !== false && h.measured);
    if (!avail(d) || !hoods.length) { out.push({ title, text: UNAVAILABLE }); continue; }
    const cols = [...new Set(hoods.flatMap((h) => Object.keys(h.measured)))];
    const rows = hoods.map((h) => Object.assign({ Neighborhood: h.hood }, ...cols.map((c) => {
      const m = h.measured[c] || {};
      return { [c]: fmt(m.value) + (m.previous != null && String(m.previous) !== String(m.value) ? ' (last Cycle ' + fmt(m.previous) + ')' : '') };
    })));
    out.push({ title, text: table(rows, ['Neighborhood'].concat(cols)) });
  }
  const events = ((s.events || {}).items) || [];
  // An event is its fact, when and where: its id, source path and retrieval key are build notes (codex 2026-11-15 F1).
  const evRows = events.map((e) => ({ Cycle: e.occurredCycle == null ? '' : e.occurredCycle, Where: (e.hoods || []).join(', ') || (e.citywideRelevance ? 'citywide' : ''),
    What: clip(e.fact || e.text || e.summary || '', 400), Size: e.significance || '' })).filter((r) => r.What);
  out.push({ title: 'Events in your district', text: !avail(s.events) ? UNAVAILABLE : evRows.length ? table(evRows, ['Cycle', 'Where', 'What', 'Size']) : 'none' });
  const known = (pack.known || []).filter((k) => k && k.text && !/^F-office-/.test(String(k.id || '')));   // their approval is part 2
  if (known.length) out.push({ title: 'On the record, Cycle ' + cycle, text: known.map((k) => '- ' + k.text).join('\n') });
  const ex = pack.exposure || {};
  if ((ex.subjects || []).length) out.push({ title: 'People in your district', text: table(ex.subjects.map((p) => ({ Name: p.name, Neighborhood: p.neighborhood, Role: p.role })), ['Name', 'Neighborhood', 'Role']) });
  const named = (list, label) => { if ((list || []).length) out.push({ title: label, text: list.map((b) => '- ' + [b.name, b.neighborhood || b.hood, b.type || b.kind].filter(Boolean).join(', ')).join('\n') }); };
  named(ex.businesses, 'Businesses in your district');
  named(ex.churches, 'Congregations in your district');
  if ((g.board || []).length) {
    out.push({ title: 'Your board', text: table(g.board.map((b) => ({ Initiative: b.id, Name: b.name, Category: b.domain, Stage: b.stage || '', Status: b.status || '', Neighborhoods: (b.hoods || []).join(', '),
      Budget: String(b.budget || '').replace(/^budget:\s*/, ''), 'Vote Cycle': b.voteCycle == null ? '' : b.voteCycle, 'Next step due': b.nextActionCycle == null ? '' : 'C' + b.nextActionCycle,
      Next: b.needsNext || '', Yours: b.sponsored ? 'sponsor' : '' })), ['Initiative', 'Name', 'Category', 'Stage', 'Status', 'Neighborhoods', 'Budget', 'Vote Cycle', 'Next step due', 'Next', 'Yours']) });
  } else out.push({ title: 'Your board', text: g.boardAvailable === false ? UNAVAILABLE : 'none' });
  if (g.categories && !g.categories.available) out.push({ title: 'Categories and budget bands', text: UNAVAILABLE });
  if (g.categories && g.categories.available) out.push({ title: 'Categories and budget bands', text: table(g.categories.list.map((c) => ({ Category: c.key, Covers: c.label, Band: c.band })), ['Category', 'Covers', 'Band']) });
  const pool = g.petitionPool || {};
  if (g.petitionPool && !pool.available) out.push({ title: 'Complaints from your district', text: UNAVAILABLE });
  if (pool.available) out.push({ title: 'Complaints from your district', text: (pool.complaints || []).length ? table(pool.complaints.map((c) => ({ Cycle: c.cycle, Neighborhood: c.hood, Said: c.snippet, Mood: c.affect })), ['Cycle', 'Neighborhood', 'Said', 'Mood']) : 'none' });
  const probs = ((g.problemContinuity || {}).problems) || [];
  if (g.problemContinuity && !g.problemContinuity.available) out.push({ title: 'Conditions counted in your district, Cycle ' + cycle, text: UNAVAILABLE });
  if (probs.length) out.push({ title: 'Conditions counted in your district, Cycle ' + cycle, text: table(probs.map((p) => ({ Neighborhood: p.hood, Condition: p.label, Count: p.count })), ['Neighborhood', 'Condition', 'Count']) });
  if (g.workingCity && !g.workingCity.available) out.push({ title: 'What the city\'s workers last said', text: UNAVAILABLE });
  if (g.workingCity && g.workingCity.available) out.push({ title: 'What the city\'s workers last said', text: String(g.workingCity.text || '').replace(/^The working city:\n?/, '') });
  if (g.patrol && !g.patrol.available) out.push({ title: 'The patrol setting', text: UNAVAILABLE });
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
  if (!office || !isSeat(office.officeId)) throw new Error('not a seat on the council template: ' + (office && office.officeId));
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
  const t = ww.TOOLS.concat([
    fn('resident_call', 'Call on a resident of your district and put a question to them: name them, or name a neighborhood and call on someone who lives there. They answer in their own words.',
      { name: { type: 'string', description: 'a full name' }, neighborhood: { type: 'string' }, question: { type: 'string' } }, ['question']),
    fn('initiative_propose', 'Put an initiative before the council to serve your district: its name, what it is for, the category of city life it touches, its reach and a budget inside the category\'s band (a figure like $12.5M). ' +
      'It is entered as Proposed at the week\'s close; the council votes on it at the city hall run once a vote is called.',
    { title: { type: 'string' }, purpose: { type: 'string' }, category: { type: 'string' },
      reach: { type: 'string', enum: ['hood', 'district'], description: 'named neighborhoods of your district, or the whole district' },
      hoods: { type: 'array', items: { type: 'string' } }, budget: { type: 'string' } }, ['title', 'purpose', 'category', 'reach', 'budget']),
    fn('vote_call', 'Send a proposed initiative with no vote scheduled to the next city hall vote, one with a neighborhood in your district. One call per initiative a week.',
      { initiativeId: { type: 'string' } }, ['initiativeId']),
    fn('program_renew', 'Ask the council to re-fund a running program on your board that is running low or has run dry, with an amount inside its category\'s band. The council votes the next week; the money lands the week after. One renewal pending per program.',
      { initiativeId: { type: 'string' }, amount: { type: 'string' } }, ['initiativeId', 'amount']),
    fn('initiative_work', 'Put your office\'s work into an initiative on your board. A funded one stands up once work lands on it; a running one weakens when left untended.',
      { initiativeId: { type: 'string' } }, ['initiativeId']),
  ]);
  if (maraQuestion(pack)) t.push(fn('directive_answer', 'Reply on the record to the question the City Planning Director put to your office.', { text: { type: 'string' } }, ['text']));
  return t;
}

// The resident's own voice: citizenVoice.js, read-only (no --record), as the reporters' interviews call it. Its --json
// object is printed last; lib/env's banner and any log line reach stdout before it (cron-desk-run.js parseBatchResults
// reads the batch form the same way, from the last bracket pair).
function parseVoiceOutput(out) {
  const lines = String(out || '').split('\n');
  let end = -1, start = -1;
  for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].trim() === '}') { end = i; break; } }
  for (let i = end; i >= 0; i--) { if (lines[i] === '{') { start = i; break; } }
  if (start < 0 || end <= start) throw new Error('no JSON object in the citizen voice output');
  return JSON.parse(lines.slice(start, end + 1).join('\n'));
}
function voiceResident(popId, ask, cycle) {
  const out = execFileSync('node', [path.join(ROOT, 'scripts', 'citizenVoice.js'), '--pop=' + popId, '--ask=' + ask, '--json', '--cycle=' + cycle],
    { cwd: ROOT, encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'ignore'] });
  return parseVoiceOutput(out);
}
// A door knocked on in a neighborhood: the pick is a hash of the day, the seat, the neighborhood and the call's place
// in the wake — the same call again reaches the same door.
function hashPick(list, key) {
  let h = 2166136261;
  for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return list.length ? list[h % list.length] : null;
}
// null when the snapshot cannot be read: that is an unavailable ledger, not a city with nobody in it (codex 2026-11-15 F2).
function ledgerResidents(root) {
  const file = path.join(root, 'output', 'simulation_ledger_snapshot.jsonl');
  try { fs.accessSync(file, fs.constants.R_OK); } catch (e) { return null; }
  const rows = readJsonl(file);
  return rows.length ? rows.filter((r) => r.Status === 'Active' && r.POPID && r.Neighborhood) : null;
}

// ctx: { office, cycle, date, stage: { moves: [], calls: [] }, validate(moves) -> {accepted, rejected}, inDistrict(hood) -> bool,
//        confrontationId?, deps?, dw? }
// A move is STAGED, never executed here: the caller files the staged moves through the move gate once the wake has a statement.
function toolExecutor(ctx) {
  const { root, voice } = defaults(ctx.deps);
  const base = ww.toolExecutor({ popid: ctx.office.popid, cycle: ctx.cycle, stage: { patrol: [] }, deps: ctx.deps, dw: ctx.dw });
  let residents = null;
  const stageMove = (raw, said) => {
    const title = (m) => String(m.title || '').trim().toLowerCase();
    const dup = ctx.stage.moves.find((m) => m.type === raw.type &&
      (raw.initiativeId ? m.initiativeId === raw.initiativeId : raw.type === 'propose' && title(m) === title(raw)));   // a propose has no id: its title (codex 2026-11-15 F3)
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
      if (!residents) return 'the city\'s ledger is unavailable right now — this is not an empty record';
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

module.exports = { BUILT, isSeat, buildWake, toolsFor, toolExecutor, approvalBlock, lastCycleApproval, dataBlocks, pastDecisions,
  maraQuestion, hashPick, parseVoiceOutput, MAX_TOOL_CALLS, CHALLENGER_NAMED_BELOW, SEAT_LOST_BELOW };
