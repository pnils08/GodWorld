'use strict';
/**
 * scripts/cityFeedWriter.js — the city feed's entry writer (pipeline.118; builder 2026-11-26: "I'd like the other media
 * to get the same level of connective depth"; "treating this as a workflow is likely the best way").
 *
 * For each beat: the seat's own record rows (its slice facts, as its builder scrubs them) are the candidates. One model
 * loop picks the events worth an entry and reads their history with tools; it answers in parts — the event, history
 * sentences each naming the one unit it came from, the people, the open questions. Code then checks every part
 * (checkSentence) and composes the entry from what passed. A sentence that fails is dropped and logged; nothing
 * unchecked is written.
 *
 *   node scripts/cityFeedWriter.js --cycle 117 --beats faith,health,economy --dry-run [--max 1] [--out <dir>]
 *
 * --dry-run prints the entries and the dropped sentences and writes nothing to the sheet. Without it: the readiness
 * check, the tab must exist, rows appended and read back, one write per Cycle (output/city-feed-state.json).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TAB = 'City_Feed';
const HEADER = ['Cycle', 'Beat', 'EventType', 'NamesUsed', 'Notes', 'StoryAngle', 'Storyline', 'Refs', 'Seats', 'WrittenBy', 'EntryId'];
const MODEL = 'anthropic/claude-sonnet-5.5';
const FREE_SEATS = ['farrah-del-rio', 'freelance-firebrand', 'p-slayer', 'ines-sorensen'];   // builder: "keep them as the pressure"

// beat -> the seat it goes to and the builder whose rows are its candidates. Phase 1: the three test beats.
const BEATS = {
  faith: { seat: 'elliot-graye', builder: 'buildFaithSlice' },
  health: { seat: 'lila-mezran', builder: 'buildHealthSlice' },
  economy: { seat: 'business-desk', builder: 'buildEconomySlice' }
};

// Dumped tabs the loop may read rows of. Not here on purpose: Story_Seed_Deck / Story_Hook_Deck (code-written angles,
// hooks, voice text), per-citizen finance and dial tabs.
const RECORD_TABS = ['Business_Ledger', 'Business_Archive', 'Casino_Ledger', 'Transit_Metrics', 'Crime_Metrics', 'Neighborhood_Demographics',
  'Hospital_Ledger', 'Health_Cause_Queue', 'Community_Programs', 'Faith_Organizations', 'Faith_Ledger', 'Cycle_Weather', 'Neighborhood_Map',
  'Cultural_Ledger', 'Initiative_Tracker', 'Civic_Office_Ledger', 'City_Treasury', 'Judicial_Ledger', 'Care_Justice_Census',
  'WorldEvents_V3_Ledger', 'LifeHistory_Log', 'Lived_Events'];

// ---------- the check ----------


const CAUSAL = /\b(because|cause[sd]?|causing|due to|led to|leading to|leads to|triggered|as a result|result(?:ed|ing|s)? (?:in|from)|thanks to|in response to|responding to|prompted|driven by|therefore|which is why|in the wake of|following the|stem(?:s|med|ming) from|forced)\b/gi;
// A capitalised word that opens a sentence and is no name.
const OPENERS = new Set(['the', 'a', 'an', 'in', 'at', 'on', 'by', 'its', 'it', 'that', 'this', 'these', 'those', 'two', 'three', 'four', 'five', 'six',
  'since', 'from', 'over', 'after', 'before', 'when', 'both', 'each', 'one', 'no', 'last', 'he', 'she', 'they', 'there', 'then', 'for', 'of', 'with',
  'what', 'who', 'why', 'how', 'where', 'which', 'will', 'is', 'are', 'was', 'were', 'did', 'does', 'do', 'has', 'have', 'had', 'can', 'could', 'would',
  'should', 'if', 'as', 'but', 'and', 'or', 'not', 'none', 'all', 'some', 'most', 'neither', 'nor', 'so', 'yet', 'across', 'between', 'behind', 'under',
  'more', 'fewer', 'less', 'about', 'during', 'while', 'only', 'now', 'here', 'her', 'his', 'their', 'our', 'every', 'any', 'another', 'other', 'attendance']);
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

function norm(s) { return String(s == null ? '' : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim(); }
function numbersOf(s) {
  return (norm(s).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => n.replace(/,/g, '').replace(/\.$/, '')).filter(Boolean);
}
// C114, Cycle 114 -> '114'
function cyclesOf(s) { const out = []; norm(s).replace(/\b(?:C|Cycle\s+)(\d{1,3})\b/g, (m, n) => { out.push(n); return m; }); return out; }
function unitHasCycle(unit, n) { return new RegExp('(?:\\bC|\\bCycle"?\\s*:?\\s*"?|\\bCycle\\s+)0*' + n + '\\b').test(unit); }
// Capitalised words that are names: every capitalised word, less a sentence opener that is a common word.
function nameWordsOf(s) {
  const out = [];
  for (const sent of norm(s).split(/(?<=[.?!])\s+/)) {
    const words = sent.split(/\s+/);
    words.forEach((raw, i) => {
      const w = raw.replace(/^[^A-Za-z]+|[^A-Za-z']+$/g, '').replace(/'s$/i, '');
      if (!/^[A-Z][A-Za-z'-]+$/.test(w) && !/^[A-Z]{2,}$/.test(w)) return;
      if (/^C$|^Cycle$/.test(w)) return;
      if (i === 0 && OPENERS.has(w.toLowerCase())) return;
      out.push(w);
    });
  }
  return out;
}
// Words a sentence may add to what its unit says: the grammar of reporting a row, nothing that is itself a fact.
const PLAIN = new Set(('about above across after again against already also although among another around because before behind being below between both ' +
  'cycle cycles could during each earlier either every first second third fourth later latest least there their these those through under until where ' +
  'which while within without would since still other others often never always record records recorded ledger listed lists shows showed shown showing ' +
  'given gives stands stood reads reading counted count counts number numbers total totals figure figures entry entries event events happened occurred ' +
  'people person residents resident neighbors attending attended attendance drew drawing draws held holds holding hosted hosts hosting served serves ' +
  'serving opened opens opening began begins started starts ended ends named names called marked marks made makes took takes came comes went goes ' +
  'were was been have having that this with from into over than then them they what when whom whose city oakland week weeks year years time times ' +
  'same more most less fewer many much some none only just even last next prior previous earlier before following followed same along line lines ' +
  'place places there here itself himself herself themselves whether nothing anything something ' +
  'filed files filing logged logs logging quoted quotes quoting wrote written writes reported reports reporting published publishes printed carried carries ' +
  'daily piece pieces paper edition story stories article coverage covered described describes according noted notes stated states ' +
  'reason reasons neighborhood neighborhoods updated profile profiles business businesses congregation congregations resident').split(/\s+/));
// Names a sentence may use without the unit holding them: the paper and the city themselves.
const FREE_NAMES = new Set(['tribune', 'bay', 'oakland', 'cycle', 'cycles']);
// ...and the records' own names ("the Faith Ledger").
for (const t of RECORD_TABS) for (const w of t.toLowerCase().split('_')) if (w.length > 2) FREE_NAMES.add(w);
function stem(w) { return w.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4); }
// Lowercase content words of the sentence whose stem the unit does not hold.
function novelWordsOf(sentence, unit) {
  const toks = norm(unit).toLowerCase().match(/[a-z]{3,}/g) || [];
  const have = new Set(toks.filter((t) => t.length >= 4).map(stem));
  const short = Array.from(new Set(toks.filter((t) => t.length === 3)));   // a row's own short form: mag -> magnitude
  const out = [];
  for (const w of (norm(sentence).match(/\b[a-z][a-z'-]{4,}\b/g) || [])) {
    const bare = w.replace(/'s$/, '');
    if (PLAIN.has(bare) || have.has(stem(bare)) || short.some((t) => bare.startsWith(t) && !['the', 'and', 'for', 'was', 'are', 'not', 'its', 'has', 'had', 'but', 'all', 'one', 'two', 'out', 'per', 'who', 'how', 'why', 'can', 'did'].includes(t))) continue;
    out.push(bare);
  }
  return Array.from(new Set(out));
}
function causalOf(s) { return (norm(s).toLowerCase().match(CAUSAL) || []); }

/**
 * A sentence passes against ONE unit of source text when every number, every cycle and every name word in it is inside
 * that unit, it adds no content word the unit does not hold (PLAIN lists the reporting words it may add), and it carries
 * no causal word the unit does not carry. A question (opts.question) is not held to the content-word rule: it asserts
 * nothing. Returns { ok, why[] }.
 */
function checkSentence(sentence, unit, opts) {
  const s = norm(sentence), u = norm(unit), ul = u.toLowerCase();
  const why = [];
  if (!s) return { ok: false, why: ['empty'] };
  if (!u) return { ok: false, why: ['no unit'] };
  const unitNums = new Set(numbersOf(u));
  const sentCycles = new Set(cyclesOf(s));
  for (const c of sentCycles) if (!unitHasCycle(u, c)) why.push('cycle C' + c + ' not in the unit');
  for (const n of numbersOf(s)) { if (sentCycles.has(n)) continue; if (!unitNums.has(n)) why.push('number ' + n + ' not in the unit'); }
  for (const [word, n] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp('\\b' + word + '\\b', 'i').test(s) && !new RegExp('\\b' + word + '\\b', 'i').test(u) && !unitNums.has(String(n))) {
      if (word !== 'one') why.push('count "' + word + '" not in the unit');
    }
  }
  for (const w of nameWordsOf(s)) if (!FREE_NAMES.has(w.toLowerCase()) && !ul.includes(w.toLowerCase())) why.push('name "' + w + '" not in the unit');
  if (!(opts && opts.question)) for (const w of novelWordsOf(s, u)) why.push('word "' + w + '" not in the unit');
  const uc = new Set(causalOf(u));
  // a question asserts nothing: "what was it responding to?" is the question a causeless row leaves
  if (!(opts && opts.question)) for (const c of causalOf(s)) if (!uc.has(c)) why.push('causal "' + c + '" not in the unit');
  return { ok: !why.length, why: Array.from(new Set(why)) };
}

// ---------- seats ----------

/** One seat by beat; a second only when its write model differs and neither is a free seat. Slugs only. */
function seatsFor(first, second, packages) {
  const pk = (packages && packages.packages) || packages || {};
  const model = (slug) => { const p = pk[slug]; return p && p.models && p.models.write || null; };
  if (!first || FREE_SEATS.includes(first)) return [];
  if (!second || second === first || FREE_SEATS.includes(second)) return [first];
  const a = model(first), b = model(second);
  return a && b && a !== b ? [first, second] : [first];
}

// ---------- the record tool ----------

function loadTab(tab, root) {
  const f = path.join(root || ROOT, 'output', 'beats', tab + '.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l, i) => { try { return { row: i + 2, o: JSON.parse(l) }; } catch (e) { return null; } }).filter(Boolean);
}
function rowLine(tab, r) {
  const bits = Object.entries(r.o).filter(([k, v]) => String(v == null ? '' : v).trim() !== '').map(([k, v]) => k + ': ' + String(v).replace(/\s+/g, ' ').slice(0, 300));
  return tab + ' row ' + r.row + ' | ' + bits.join(' | ');
}
function recordRead(input, root) {
  const tab = String(input && input.tab || '');
  if (!RECORD_TABS.includes(tab)) return 'No such record. Records: ' + RECORD_TABS.join(', ');
  const terms = String(input && input.match || '').toLowerCase().split(/\s*,\s*|\s+and\s+/).map((t) => t.trim()).filter(Boolean);
  const rows = loadTab(tab, root).map((r) => rowLine(tab, r)).filter((l) => terms.every((t) => l.toLowerCase().includes(t)));
  if (!rows.length) return 'No row of ' + tab + ' matches "' + (input.match || '') + '".';
  const cut = rows.slice(-30);
  return (rows.length > cut.length ? '(' + rows.length + ' rows match; the newest ' + cut.length + ')\n' : '') + cut.join('\n');
}
const RECORD_TOOL = { type: 'function', function: { name: 'record_read', description: 'Rows of one city record across every Cycle on file, oldest to newest. tab: one of ' + RECORD_TABS.join(', ') + '. match: words every returned row must contain (a name, a place, an event type); several words separated by commas.',
  parameters: { type: 'object', properties: { tab: { type: 'string' }, match: { type: 'string' } }, required: ['tab', 'match'] } } };

// ---------- one beat ----------

const SYSTEM = [
  'You work the city desk of the Bay Tribune, Oakland. You do not write stories. You write the desk\'s feed: entries a reporter wakes to.',
  'An entry is one event from this Cycle\'s record, the history behind it that the record and the paper already hold, the people in it, and the questions it leaves open.',
  'You are handed the beat\'s rows for this Cycle. Pick the event most worth a reporter\'s day: something happened to someone, something changed, or something is unexplained. One entry is ONE event at one place or to one person — never a round-up of several places. It names at most three handed rows, all about that same place or person.',
  'Then read. Use your tools to find what came before: the same place or person in earlier Cycles (record_read), what the paper has published (canon_recall), who a person is (citizen_lookup). Read before you answer; an entry with no history is thin.',
  'Every tool result comes back as lines, each opening with a unit id like [u12]. A history sentence must come from ONE line, and names that line.',
  'Rules for every sentence you return:',
  '- Every number, every Cycle (write it C114) and every name in a history sentence must be in the one line it cites. Put two lines\' facts in two sentences.',
  '- Say what the line says in the line\'s own words. A sentence that adds a detail the line does not hold is thrown out by a checker after you.',
  '- Never say why something happened unless the line itself says why. Where the record gives no reason, that is an open question, and you write it as one.',
  '- The event sentence uses only what the handed rows it names say, in their words. What you learned from your reads goes in history, not in the event.',
  '- You have a fixed number of reads. When told they are spent, answer with the JSON at once; never call a tool to answer.',
  '- A question ends with a question mark and names nothing that is not in the event or your history.',
  '- No advice to the reporter, no angle, no conclusion. Plain sentences.',
  'Answer with ONLY this JSON:',
  '{"entries":[{"rows":[<numbers of the handed rows this entry is about>],"event":"<one or two sentences>","names":["<Name (role)>"],"history":[{"s":"<sentence>","unit":"<unit id>"}],"questions":["<question?>"]}]}'
].join('\n');

function parseJson(text) {
  const t = String(text || '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
}

/** Check one model entry against the handed rows and the units read; returns the composed entry or null, with a log. */
function buildEntry(raw, facts, units, citizens, cycle) {
  const dropped = [];
  const rows = (Array.isArray(raw.rows) ? raw.rows : []).map(Number).filter((n) => Number.isInteger(n) && facts[n - 1]).slice(0, 3);
  if (!rows.length) return { entry: null, dropped: [{ part: 'entry', text: norm(raw.event), why: ['names no handed row'] }] };
  const rowText = rows.map((n) => facts[n - 1].text).join(' \n ');
  // The rows are this Cycle's: the event may name the Cycle though a row does not. An event sentence that says more than
  // its rows is not written; the rows' own text stands in for it.
  const ev = checkSentence(raw.event, rowText + (cycle ? ' \n C' + cycle : ''));
  let event = norm(raw.event);
  if (!ev.ok) { dropped.push({ part: 'event', text: event, why: ev.why.concat(['the rows\' own text used instead']) }); event = rows.map((n) => norm(facts[n - 1].text).replace(/[.;]?$/, '.')).join(' '); }
  const history = [];
  for (const h of Array.isArray(raw.history) ? raw.history : []) {
    const id = String(h && h.unit || '').replace(/[\[\]]/g, '');
    const unit = units.get(id);
    const c = unit ? checkSentence(h.s, unit.text) : { ok: false, why: ['unit ' + (id || '(none)') + ' was never read'] };
    if (c.ok) history.push({ s: norm(h.s), unit: id, ref: unit.ref }); else dropped.push({ part: 'history', text: norm(h && h.s), unit: id, why: c.why });
  }
  // a question may reach across the beat's handed rows (that is the connection it asks about) and name the Cycle
  const known = [event, facts.map((f) => f.text).join(' \n '), cycle ? 'C' + cycle : ''].concat(history.map((h) => h.s)).join(' \n ');
  const questions = [];
  for (const q of Array.isArray(raw.questions) ? raw.questions : []) {
    const t = norm(q);
    const c = /\?$/.test(t) ? checkSentence(t, known, { question: true }) : { ok: false, why: ['not a question'] };
    if (c.ok) questions.push(t); else dropped.push({ part: 'question', text: t, why: c.why });
  }
  if (!questions.length) return { entry: null, dropped: dropped.concat([{ part: 'entry', text: event, why: ['no open question survived'] }]) };
  const pool = known + ' \n ' + history.map((h) => units.get(h.unit).text).join(' \n ') + ' \n ' + (citizens || []).map((c) => c.name).join(' \n ');
  const names = [];
  for (const n of Array.isArray(raw.names) ? raw.names : []) {
    const bare = norm(n).replace(/\s*\([^)]*\)\s*$/, '');
    if (bare && pool.toLowerCase().includes(bare.toLowerCase())) names.push(norm(n)); else dropped.push({ part: 'name', text: norm(n), why: ['not in the rows or the units read'] });
  }
  return { entry: { rows, event, history, questions, names }, dropped };
}

function storylineOf(beat, cycle, entry, facts) {
  const src = entry.rows.map((n) => facts[n - 1].src + ' ' + facts[n - 1].text).join(' ');
  const id = (src.match(/\b(?:CRISIS-\d+-[A-Z-]+|INIT-\d{3}(?::[a-z-]+)?)\b/) || [])[0];
  if (id) return id;
  const head = (entry.names[0] || entry.event).replace(/\s*\([^)]*\)/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 4).join('-');
  return beat + ':' + head + ':c' + cycle;
}

function toRow(beat, cycle, n, entry, facts, seats) {
  const notes = [entry.event].concat(entry.history.map((h) => h.s)).concat(entry.questions).join(' ');
  const refs = entry.rows.map((r) => facts[r - 1].src).concat(entry.history.map((h) => h.ref));
  return { Cycle: String(cycle), Beat: beat, EventType: 'event', NamesUsed: entry.names.join(', '), Notes: notes, StoryAngle: entry.questions[0],
    Storyline: storylineOf(beat, cycle, entry, facts), Refs: Array.from(new Set(refs)).join(' ; '), Seats: seats.join(', '), WrittenBy: 'city-desk',
    EntryId: 'CF-' + cycle + '-' + beat + '-' + n };
}

async function writeBeat(beat, cycle, opts) {
  const W = require('./cron-desk-writer');
  const cfg = BEATS[beat];
  const slice = require('./' + cfg.builder).loadSlice(Number(cycle));
  if (!slice || !Array.isArray(slice.facts) || !slice.facts.length) return { beat, rows: [], dropped: [], note: 'no record rows for the beat this Cycle' };
  const facts = slice.facts.filter((f) => f && f.text);
  const units = new Map();
  let u = 0;
  const tag = (text, refOf) => String(text).split('\n').filter((l) => l.trim()).map((l) => { const id = 'u' + (++u); units.set(id, { text: l, ref: refOf(l) }); return '[' + id + '] ' + l; }).join('\n');
  const exec = async (name, input) => {
    if (name === 'record_read') return tag(recordRead(input), (l) => (l.match(/^(\w+ row \d+)/) || [])[1] ? (l.match(/^(\w+ row \d+)/))[1] + ' (beats dump C' + cycle + ')' : 'record_read ' + JSON.stringify(input));
    if (name === 'canon_recall') return tag(await W.toolCanonRecall(input, Number(cycle)), (l) => 'canon_recall "' + String(input.query || '').slice(0, 60) + '" ' + ((l.match(/^\[[^\]]+\]/) || [''])[0]) + ' "' + l.replace(/^\[[^\]]+\]\s*/, '').slice(0, 60) + '…"');
    if (name === 'citizen_lookup') return tag(W.toolCitizenLookup({ name: input && input.name }), () => 'citizen_lookup ' + String(input && input.name || ''));
    return 'There is no tool named ' + name + '. Your tools are record_read, canon_recall and citizen_lookup. The answer is not a tool call: write the JSON as your message.';
  };
  const toolset = [RECORD_TOOL, W.CANON_RECALL_TOOL, W.OPENROUTER_TOOLS.find((t) => t.function.name === 'citizen_lookup')];
  const user = 'Beat: ' + beat + '. Cycle C' + cycle + '.\n\nThe beat\'s rows this Cycle:\n' + facts.map((f, i) => (i + 1) + '. ' + f.text).join('\n') +
    '\n\nWrite ' + (opts.max === 1 ? 'one entry' : 'up to ' + opts.max + ' entries') + '. You have ' + (opts.calls || 12) + ' reads.';
  const r = await W.openRouterToolLoop({ model: opts.model || MODEL, system: SYSTEM, user, maxToolCalls: opts.calls || 12, maxTokens: 3000, timeoutMs: 180000, toolset, exec, answerLateToolCalls: 'Your reads are spent. Answer now with ONLY the JSON.' });
  let parsed = parseJson(r.text);
  let usd = r.billedUsd;
  if (!parsed || !Array.isArray(parsed.entries)) {
    // the reads ran out with no answer: one more turn, no tools, on the lines already read
    const lines = Array.from(units.entries()).map(([id, x]) => '[' + id + '] ' + x.text).join('\n');
    const r2 = await W.openRouterToolLoop({ model: opts.model || MODEL, system: SYSTEM, user: user + '\n\nYour reads are spent. The lines you read:\n' + lines.slice(0, 60000) + '\n\nAnswer now with ONLY the JSON.', maxToolCalls: 0, maxTokens: 3000, timeoutMs: 180000 });
    parsed = parseJson(r2.text);
    if (usd != null && r2.billedUsd != null) usd = +(usd + r2.billedUsd).toFixed(4);
    if (!parsed) r.text = r2.text;
  }
  const out = { beat, seat: cfg.seat, rows: [], dropped: [], kept: [], trace: r.trace.map((t) => t.tool + '(' + JSON.stringify(t.input).slice(0, 90) + ')'), usd, unitsRead: units.size };
  if (!parsed || !Array.isArray(parsed.entries)) { out.note = 'the model returned no entries JSON'; out.rawHead = String(r.text || '').slice(0, 400); return out; }
  const packages = JSON.parse(fs.readFileSync(path.join(__dirname, 'newsroom-wake-packages.json'), 'utf8'));
  let n = 0;
  for (const raw of parsed.entries.slice(0, opts.max)) {
    const b = buildEntry(raw, facts, units, slice.citizens, cycle);
    out.dropped.push(...b.dropped);
    if (!b.entry) continue;
    n++;
    out.kept.push(b.entry);
    out.rows.push(toRow(beat, cycle, n, b.entry, facts, seatsFor(cfg.seat, null, packages)));
  }
  return out;
}

// ---------- readiness + the sheet ----------

function ready(cycle, root) {
  root = root || ROOT;
  const j = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
  const why = [];
  const meta = j(path.join(root, 'output', 'beats', 'meta.json'));
  if (!meta || Number(meta.cycle) !== Number(cycle)) why.push('beats dump is at C' + (meta && meta.cycle) + ', not C' + cycle);
  if (!fs.existsSync(path.join(root, 'output', 'desk_signal_c' + cycle + '.json'))) why.push('no desk signal for C' + cycle);
  const ws = j(path.join(root, 'output', 'cron-civic', 'week_state_c' + cycle + '.json'));
  const st = (ws && ws.stages) || {};
  if (!ws || !ws.engineFiredAt) why.push('the civic week state for C' + cycle + ' has no fire');
  else {
    if (!(st.apply && st.apply.status === 'done')) why.push('the civic chain has not applied');
    if (st.directive && st.directive.status !== 'done') why.push('the chain\'s directive stage is ' + st.directive.status);
  }
  return { ok: !why.length, why };
}

function formatMd(cycle, results) {
  const L = ['# City feed — C' + cycle + ' (dry run, nothing written)', ''];
  for (const r of results) {
    L.push('## ' + r.beat + ' → ' + (r.seat || ''), '');
    if (r.note) L.push('_' + r.note + '_', '');
    for (const row of r.rows) {
      L.push('**' + row.EntryId + '** · ' + row.NamesUsed, '', row.Notes, '', '- StoryAngle: ' + row.StoryAngle, '- Storyline: ' + row.Storyline, '- Seats: ' + row.Seats, '- Refs:');
      for (const ref of row.Refs.split(' ; ')) L.push('  - ' + ref);
      L.push('- ' + row.Notes.length + ' chars', '');
    }
    L.push('Reads (' + (r.trace || []).length + ', ' + (r.unitsRead || 0) + ' lines): ' + (r.trace || []).join('; '), '');
    if (r.dropped && r.dropped.length) { L.push('Dropped by the check (' + r.dropped.length + '):'); for (const d of r.dropped) L.push('- [' + d.part + (d.unit ? ' ' + d.unit : '') + '] ' + d.text + ' — ' + d.why.join('; ')); L.push(''); }
    if (r.usd != null) L.push('Cost: $' + r.usd, '');
  }
  return L.join('\n');
}

async function main() {
  require('../lib/env');
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
  const cycle = arg('--cycle', null);
  if (!cycle) throw new Error('--cycle <N> is required');
  const dry = process.argv.includes('--dry-run');
  const beats = arg('--beats', Object.keys(BEATS).join(',')).split(',').map((b) => b.trim()).filter(Boolean);
  for (const b of beats) if (!BEATS[b]) throw new Error('no such beat: ' + b + ' (have ' + Object.keys(BEATS).join(', ') + ')');
  const opts = { max: Number(arg('--max', '2')), model: arg('--model', MODEL), calls: Number(arg('--calls', '12')) };
  const rd = ready(cycle);
  console.log('readiness C' + cycle + ': ' + (rd.ok ? 'ready' : rd.why.join('; ')));
  const statePath = path.join(ROOT, 'output', 'city-feed-state.json');
  let state = {}; try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (e) { state = {}; }
  if (!dry) {
    if (!rd.ok) { console.log('not ready — nothing written'); return; }
    if (state['c' + cycle]) { console.log('C' + cycle + ' already written (' + state['c' + cycle].rows + ' rows) — nothing written'); return; }
  }
  const results = [];
  for (const b of beats) {
    console.log('[' + b + '] reading…');
    let r;
    try { r = await writeBeat(b, cycle, opts); } catch (e) { r = { beat: b, rows: [], dropped: [], note: 'failed: ' + e.message }; }
    console.log('[' + b + '] ' + r.rows.length + ' entr' + (r.rows.length === 1 ? 'y' : 'ies') + ', ' + (r.dropped || []).length + ' dropped' + (r.note ? ' — ' + r.note : ''));
    results.push(r);
  }
  const rows = results.flatMap((r) => r.rows);
  if (dry) {
    const out = arg('--out', null);
    const md = formatMd(cycle, results);
    if (out) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'city-feed-c' + cycle + '.md'), md); fs.writeFileSync(path.join(out, 'city-feed-c' + cycle + '.json'), JSON.stringify(results, null, 2)); console.log('printed to ' + out); }
    else console.log('\n' + md);
    return;
  }
  if (!rows.length) { console.log('no entry passed the check — nothing written'); return; }
  const sheets = require('../lib/sheets');
  if (!(await sheets.listSheets()).some((s) => s.title === TAB)) throw new Error('the ' + TAB + ' tab does not exist');
  await sheets.appendRows(TAB, rows.map((r) => HEADER.map((h) => r[h] || '')));
  const back = await sheets.getSheetAsObjects(TAB);
  const landed = rows.filter((r) => back.some((b) => b.EntryId === r.EntryId)).length;
  if (landed !== rows.length) throw new Error('read-back: ' + landed + ' of ' + rows.length + ' rows on the tab');
  state['c' + cycle] = { rows: rows.length, at: new Date().toISOString(), ids: rows.map((r) => r.EntryId) };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(rows.length + ' rows written to ' + TAB + ' and read back');
}

if (require.main === module) main().catch((e) => { console.error('cityFeedWriter: ' + e.message); process.exit(1); });

module.exports = { TAB, HEADER, BEATS, FREE_SEATS, RECORD_TABS, checkSentence, seatsFor, buildEntry, recordRead, storylineOf, toRow, ready, numbersOf, cyclesOf, nameWordsOf, parseJson, novelWordsOf };
