#!/usr/bin/env node
'use strict';

// Civis Systems Journal: one staged, first-person audit per Cycle. The audit
// and beat dump are local inputs; the only external write is Varek's own page.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const POPID = 'POP-00789';
const WAKE = 'journal';
// Both routes ride the OpenRouter key. `deepseek/deepseek-reasoner` is not an
// OpenRouter id (rejected as invalid, 2026-10-01) and the direct Anthropic key
// holds no credits, so the fallback takes the Saturday narrator's rail
// (cron-saturday-run.js anthropicChat): Anthropic SDK against OpenRouter.
const REASONER = 'deepseek/deepseek-v4-pro';
const FALLBACK = 'anthropic/claude-sonnet-5.5';
// The answer is 300-500 words of JSON. Reasoning shares the provider's token
// cap, so it gets its own capped budget on top (modelFitRun.js, 2026-10-01).
const CALENDAR_WORDS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December']);
const ANSWER_TOKENS = 1800;
const THINK_BUDGET = 3000;

function arg(name, fallback) {
  const hit = process.argv.find(a => a.startsWith(name + '='));
  if (hit) return hit.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function lines(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
}
function idFor(pattern, cycle, index) {
  return 'AUD-' + crypto.createHash('sha256')
    .update(JSON.stringify([cycle, index, pattern.type, pattern.evidence]))
    .digest('hex').slice(0, 12);
}
// The writer may not print a digit, so every count he is handed is already a word.
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five'];
function inWords(n) {
  const k = Math.round(Number(n));
  return Number.isFinite(k) && k >= 0 && k < NUMBER_WORDS.length ? NUMBER_WORDS[k] : 'many';
}
function weeks(n) { return Number(n) === 1 ? 'one week' : inWords(n) + ' weeks'; }
function listOf(items) {
  return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}
function stageWords(phase) { return String(phase || '').replace(/-?phase$/i, '').replace(/-/g, ' ').trim() || 'current'; }
// A district's decay signals as plain direction words; a field with no wording stays unsaid.
const SIGNAL_WORDS = {
  Sentiment: ['mood rose', 'mood fell'],
  RetailVitality: ['street trade picked up', 'street trade cooled'],
  HousingPressure: ['housing pressure climbed', 'housing pressure eased'],
};
function signalWords(signals) {
  return (signals || []).map(sig => {
    const m = /^([A-Za-z]+)\s+([+-])/.exec(String(sig));
    const w = m && SIGNAL_WORDS[m[1]];
    return w ? (m[2] === '+' ? w[0] : w[1]) : null;
  }).filter(Boolean);
}
function translate(pattern, initiativeNames = new Map()) {
  const e = pattern.affectedEntities || {};
  const f = pattern.evidence && pattern.evidence.fields || {};
  const places = (e.neighborhoods || []).filter(Boolean);
  // An initiative is named, never cited by its record id.
  const initiatives = (e.initiatives || []).map(id => initiativeNames.get(id)).filter(Boolean);
  const target = places[0] || f.Name || initiatives[0] || null;
  const where = target ? ' in ' + target : '';
  const project = f.Name || initiatives[0] || 'A public commitment';
  const unanswered = /^no-mitigator/.test(String((pattern.mitigatorState || {}).gap || f.mitigatorState || ''));
  const table = {
    'repeating-event': () => f.recurringIssue
      ? 'The city keeps reporting \u201c' + f.recurringIssue + '\u201d \u2014 ' + weeks(f.cyclesRecurring || pattern.cyclesInState) +
        ' running' + where + (unanswered ? ', and no program in the city is aimed at it.' : ', and nothing downstream has answered it.')
      : 'The same signal keeps returning' + where + ' without an answer downstream.',
    'math-imbalance': () => {
      const moved = signalWords(f.decaySignals);
      return moved.length
        ? (target || 'A district') + ': ' + listOf(moved) + ' this week' + (unanswered ? ', with no city program aimed at it.' : '.')
        : 'Two district readings disagree' + where + '.';
    },
    'coverage-gap': () => 'The city\'s ' + String(f.domain || 'civic') + ' life produced ' + inWords(f.eventCount) +
      ' events this week, and the paper ran nothing on it the week before.',
    'writeback-drift': () => 'Council action reached the public record while the response instrument stayed flat.',
    'improvement': () => f.InitiativeID
      ? project + ' moved from ' + stageWords(f.fromPhase) + ' to ' + stageWords(f.toPhase) + '.'
      : f.sentimentDelta != null
        ? 'Mood ' + (Number(f.sentimentDelta) < 0 ? 'fell' : 'rose') + where + ' this week.'
        : 'A previous remedy moved beyond its expected mark' + where + '.',
    'stuck-initiative': () => project + (places[0] && places[0] !== project ? ' (' + places[0] + ')' : '') +
      ' has not left its ' + stageWords(f.ImplementationPhase) + ' stage in ' + weeks(pattern.cyclesInState) + '.',
    'production-imbalance': () => f.migratingCount != null
      ? 'People moved in or out of ' + inWords(f.migratingCount) + ' districts this week, and the instrument logged ' +
        (Number(f.economicEventsThisCycle) ? 'little' : 'no') + ' economic activity behind any of it.'
      : 'A district reading is out of balance' + where + '.',
    'cascade-failure': () => 'One unanswered signal is spreading into another part of the city' + where + '.',
    'incoherence': () => 'Two accounts of the same city change do not reconcile' + where + '.',
  };
  const text = table[pattern.type] ? table[pattern.type]() : 'An unresolved signal in the city instrument needs a closer read' + where + '.';
  return { target, text };
}
// Many districts moving the same way is one finding, not twenty: the district
// findings of one kind fold into a single citywide line under the first id.
function foldDistricts(findings, patterns) {
  const out = [];
  const groups = new Map();
  findings.forEach((fd, i) => {
    const p = patterns[i];
    const f = p.evidence && p.evidence.fields || {};
    const kind = p.type === 'math-imbalance' ? 'decay' : (p.type === 'improvement' && f.sentimentDelta != null ? 'rise' : null);
    if (!kind || !fd.target) { out.push(fd); return; }
    if (!groups.has(kind)) { groups.set(kind, { at: out.length, items: [] }); out.push(null); }
    groups.get(kind).items.push({ fd, p, f });
  });
  for (const [kind, g] of groups) {
    if (g.items.length < 2) { out[g.at] = g.items[0].fd; continue; }
    const hoods = g.items.map(x => x.fd.target);
    let text;
    if (kind === 'rise') {
      text = 'Mood rose in ' + inWords(hoods.length) + ' districts this week: ' + listOf(hoods) + '.';
    } else {
      const by = label => g.items.filter(x => signalWords(x.f.decaySignals).includes(label)).map(x => x.fd.target);
      const parts = [['mood fell', by('mood fell')], ['street trade cooled', by('street trade cooled')],
        ['housing pressure climbed', by('housing pressure climbed')]].filter(([, h]) => h.length);
      const rank = (x, end) => { const st = (x.f.standing || {}).Sentiment || {};
        return end === 'top' ? Number(st.rank) <= 2 : Number(st.rank) >= Number(st.of) - 1; };
      const top = g.items.filter(x => rank(x, 'top')).map(x => x.fd.target);
      const low = g.items.filter(x => rank(x, 'low')).map(x => x.fd.target);
      const bare = g.items.filter(x => /^no-mitigator/.test(String(x.f.mitigatorState || ''))).length;
      const aimed = bare === hoods.length ? ', and no city program is aimed at any of them'
        : bare * 2 > hoods.length ? ', and no city program is aimed at most of them' : '';
      const said = parts.map(([label, h]) => label + ' in ' + (h.length > 6 ? inWords(h.length) + ' of them' : listOf(h))).join('; ');
      text = 'Readings decayed in ' + inWords(hoods.length) + ' districts this week' + aimed + '. ' +
        said.charAt(0).toUpperCase() + said.slice(1) + '.' +
        (top.length ? ' ' + listOf(top) + (top.length === 1 ? ' still carries' : ' still carry') + ' the brightest mood in the city' + (low.length ? '; ' + listOf(low) + ' the lowest.' : '.') : '');
    }
    out[g.at] = { id: g.items[0].fd.id, type: g.items[0].fd.type, target: null, civisFinding: text,
      covers: g.items.map(x => x.fd.id) };
  }
  return out;
}
// His own company, read off the Business_Ledger the way he would say it.
const TENS = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'a hundred'];
function roughly(n) {
  const k = Math.round(n / 10);
  return n <= 20 ? inWords(n) : k <= 10 ? 'about ' + TENS[k] : 'over a hundred';
}
function companyLines(beats) {
  const out = [];
  for (const row of lines(path.join(beats, 'Business_Ledger.jsonl'))) {
    const name = String(row.Name || '').trim();
    if (!/^Civis Systems/.test(name)) continue;
    const staff = Number(row.Employee_Count);
    const millions = Math.round(Number(row.Annual_Revenue) / 1e6);
    out.push(name + (row.Neighborhood ? ', ' + String(row.Neighborhood).trim() : '') +
      (staff > 0 ? ': ' + roughly(staff) + ' people' : '') +
      (millions > 0 ? ', ' + roughly(millions) + ' million a year in revenue' : '') +
      (/%$/.test(String(row.Growth_Rate || '')) ? ', growing fast' : '') + '.');
  }
  return out;
}
// Where the Oaks' season stands now, so his clock runs forward from today.
function oaksSeason(beats) {
  const rows = lines(path.join(beats, 'Oakland_Sports_Feed.jsonl'))
    .filter(r => /\bOaks\b/.test(String(r.TeamsUsed || '')) && r.SeasonType);
  if (!rows.length) return null;
  const last = rows.reduce((a, b) => (Number(b.Cycle) >= Number(a.Cycle) ? b : a));
  return String(last.SeasonType).replace(/-/g, ' ').trim();
}
function beatDeltas(beats, previousCycle) {
  if (!Number.isInteger(previousCycle) || previousCycle < 1) return [];
  const prev = path.join(beats, 'prev');
  if (Number(readJson(path.join(prev, 'meta.json')).cycle) !== previousCycle) {
    throw new Error('previous beat dump cycle mismatch: C' + previousCycle);
  }
  const tab = 'Neighborhood_Demographics.jsonl';
  if (!fs.existsSync(path.join(beats, tab)) || !fs.existsSync(path.join(prev, tab))) {
    throw new Error('demographics beat dump missing for previousCycle comparison');
  }
  const oldRows = new Map(lines(path.join(prev, tab))
    .filter(row => row.Neighborhood).map(row => [String(row.Neighborhood).trim(), row]));
  const numeric = value => value == null || String(value).trim() === '' ? null : Number(value);
  const deltas = [];
  for (const row of lines(path.join(beats, tab))) {
    const place = String(row.Neighborhood || '').trim();
    const old = oldRows.get(place);
    if (!place || !old) continue;
    const changes = [];
    for (const [column, label] of [['Students', 'student'], ['Adults', 'adult'], ['Seniors', 'senior'], ['Sick', 'sick resident']]) {
      const now = numeric(row[column]);
      const before = numeric(old[column]);
      if (!Number.isFinite(now) || !Number.isFinite(before) || now === before) continue;
      changes.push(label + ' presence ' + (now > before ? 'rose' : 'fell'));
    }
    if (changes.length) deltas.push(place + ': ' + changes.join(', '));
  }
  const crimeTab = 'Crime_Metrics.jsonl';
  if (fs.existsSync(path.join(beats, crimeTab)) && fs.existsSync(path.join(prev, crimeTab))) {
    const oldCrime = new Map(lines(path.join(prev, crimeTab))
      .filter(row => row.Neighborhood).map(row => [String(row.Neighborhood).trim(), row]));
    for (const row of lines(path.join(beats, crimeTab))) {
      const place = String(row.Neighborhood || '').trim();
      const old = oldCrime.get(place);
      if (!place || !old) continue;
      const now = numeric(row.IncidentCount);
      const before = numeric(old.IncidentCount);
      if (Number.isFinite(now) && Number.isFinite(before) && now !== before) {
        deltas.push(place + ': recorded incidents ' + (now > before ? 'rose' : 'fell'));
      }
    }
  }
  return deltas;
}
function loadFrame(cycle, root = ROOT) {
  if (!Number.isInteger(cycle) || cycle < 1) throw new Error('valid --cycle N required');
  const audit = readJson(path.join(root, 'output', 'engine_audit_c' + cycle + '.json'));
  const beats = path.join(root, 'output', 'beats');
  const meta = readJson(path.join(beats, 'meta.json'));
  if (Number(audit.cycle) !== cycle || Number(meta.cycle) !== cycle ||
      Number(meta.prevCycle) !== Number(audit.previousCycle)) {
    throw new Error('audit/beats cycle mismatch: C' + cycle + ' requires matching cycle and previousCycle');
  }
  const previousCycle = Number(audit.previousCycle);
  const deltas = beatDeltas(beats, previousCycle);
  // The writer is handed display names only. Record ids (initiative, business,
  // office) stay on this side: they are how a row is found, never what is printed.
  const names = new Set(['Oakland', 'City Hall', 'Civis Systems', 'Civis Systems Journal', 'Elias Varek', 'Oaks', 'Oakland Oaks', 'Paulson',
    "A's", 'A\u2019s', 'Baylight', 'The Town',
    // his published background (IDENTITY.md): the people and places he may name from it
    'Port of Oakland', 'Port', 'Highland Hospital', 'Estuary', 'West Oakland', 'Civis 4D Urban Overlay Engine', '4D',
    'Mike Paulson', 'Elliot Abraham', 'Avery Santana', 'Jax Caldera', 'Keisha Ramos', 'Baylight Authority']);
  const initiativeNames = new Map();
  for (const tab of ['Neighborhood_Demographics', 'Civic_Office_Ledger', 'Initiative_Tracker', 'Business_Ledger']) {
    for (const row of lines(path.join(beats, tab + '.jsonl'))) {
      for (const key of ['Neighborhood', 'Name', 'Title']) {
        if (row[key]) names.add(String(row[key]).trim());
      }
      if (row.InitiativeID && row.Name) initiativeNames.set(String(row.InitiativeID).trim(), String(row.Name).trim());
    }
  }
  const patterns = audit.patterns || [];
  const findings = foldDistricts(patterns.map((p, i) => {
    const t = translate(p, initiativeNames);
    return { id: idFor(p, cycle, i), type: p.type, target: t.target, civisFinding: t.text };
  }), patterns);
  if (!findings.length) throw new Error('audit has no patterns for C' + cycle);
  for (const f of findings) if (f.target && !names.has(f.target)) {
    throw new Error('audit target absent from current beat dump: ' + f.target);
  }
  return { cycle, previousCycle, findings, names, deltas, company: companyLines(beats), oaksSeason: oaksSeason(beats) };
}
function sentencesOf(text) {
  return String(text || '').split(/(?<=[.!?])\s+|\n+/)
    .map(x => x.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(x => x.split(' ').length >= 8);
}
function assertEntry(prose, frame, selectedIds, prior = []) {
  const failures = [];
  const body = String(prose || '').trim();
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length < 300 || words.length > 500) failures.push('word count outside 300–500');
  if (!/\bI\b/.test(body)) failures.push('first-person voice missing');
  // A published entry is never printed twice: a sentence of eight words or more
  // that already ran in an earlier entry fails the week.
  const published = new Set(sentencesOf((prior || []).join('\n')));
  if (sentencesOf(body).some(x => published.has(x))) failures.push('repeats a sentence from an earlier entry');
  // Names the writer was handed are lifted out before the machine-shape checks:
  // real businesses carry mid-word capitals (DigitalOcean, OakTown Social) and a
  // council district carries its numeral. Everything else is held to the rule.
  let scrub = body;
  for (const name of [...frame.names].sort((a, b) => b.length - a.length)) scrub = scrub.split(name).join(' ');
  if (/\d/.test(scrub)) failures.push('digits, decimals, or scores in prose');
  if (/\b(?:POPID|POP-|BIZ-|INIT-|AUD-|DialState|detector|worksheet|spreadsheet|sheet|tab|JSON)\b|[{}\[\]_]/i.test(scrub)) {
    failures.push('private identifier or machine vocabulary in prose');
  }
  // RULES §6: the system, the instrument, a reading, a signal, the model and the
  // public record are Civis's own words (INSTITUTIONS.md Civis blanket covers
  // "the ledger" too). What stays out is the machine's: these words, and a
  // reading recited as a figure or a grade.
  if (/\b(?:simulation|tags?|cycles?|dials?|sentiment|percent(?:age)?)\b|%/i.test(scrub)) {
    failures.push('machine term in prose (simulation, tag, cycle, dial, sentiment, percent)');
  }
  // A grade of the instrument's output, not ordinary English: "a medium-sized
  // firm", "a high-level review", "a low priority" and "a critical reading of
  // the record" are a founder talking and must pass.
  if (/\b(?:severity|rated|ratings?|scores?|scored)\b|\b(?:low|medium|high|moderate|critical|elevated)[- ](?:severity|rating|grade|score)\b|\b(?:low|medium|high|moderate|elevated)[- ](?:reading|signal)\b/i.test(scrub)) {
    failures.push('score or severity level in prose');
  }
  if (/\b(?:HousingPressure|RetailVitality|Sentiment|CrimeRate|TrafficIndex|HealthRisk|EconomicVitality|CivicLoad|Simulation Ledger|Neighborhood Map|Business Ledger|Riley Digest|Civic Office Ledger|Employment Roster)\b|\b[A-Z][a-z]+[A-Z][A-Za-z]+\b/.test(scrub)) {
    failures.push('dial name in prose');
  }
  // "One line at most" is one sentence, however the paragraphs fall.
  const oaksSentences = body.split(/(?<=[.!?])\s+|\n+/).filter(s => /\b(?:Oaks|Paulson)\b/i.test(s));
  if (oaksSentences.length > 1) failures.push('Oaks/Paulson exceeds one line');
  if (!Array.isArray(selectedIds) || selectedIds.length < 3 || selectedIds.length > 4 ||
      new Set(selectedIds).size !== selectedIds.length ||
      selectedIds.some(id => !frame.findings.some(f => f.id === id))) {
    failures.push('one lead and two or three carried findings required');
  }
  // Only handed names may appear. Lift every handed name out; a proper noun
  // still standing mid-sentence is one the writer was not given. Part of a
  // handed name ("the Health Center", "the Council") is that name; the capital
  // a sentence opens on is grammar, not a name.
  const handed = [...frame.names].sort((x, y) => y.length - x.length);
  const partOfHanded = seq => handed.some(name => (' ' + name + ' ').includes(' ' + seq + ' '));
  let rest = body;
  for (const name of handed) rest = rest.split(name).join('·');
  for (const m of rest.matchAll(/[A-Z][A-Za-z’'-]*(?:[ \t]+[A-Z][A-Za-z’'-]*)*/g)) {
    const opensSentence = /(?:^|[.!?:;—–][”"’')]*\s*|\n\s*|[“"(]\s*)$/.test(rest.slice(0, m.index));
    let parts = m[0].split(/[ \t]+/).map(w => w.replace(/[’']s?$/, ''));
    if (opensSentence) parts = parts.slice(1);
    parts = parts.filter(w => w && w !== 'I' && !/^I[’']/.test(w) && !CALENDAR_WORDS.has(w));
    if (parts.length && !partOfHanded(parts.join(' '))) failures.push('unknown named target: ' + parts.join(' '));
  }
  return { ok: failures.length === 0, failures, words: words.length };
}
function parseAnswer(raw) {
  // A model in full voice sometimes puts a heading or a sentence around the
  // object; the object itself is what is read.
  const cleaned = String(raw || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const open = cleaned.indexOf('{');
  const close = cleaned.lastIndexOf('}');
  const answer = JSON.parse(open >= 0 && close > open ? cleaned.slice(open, close + 1) : cleaned);
  if (!answer || typeof answer.prose !== 'string') throw new Error('model reply lacks prose');
  return answer;
}
async function callReasoner(system, user) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OpenRouter key unavailable');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
      'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: REASONER, max_tokens: ANSWER_TOKENS + THINK_BUDGET, temperature: 0.3,
      reasoning: { enabled: true, max_tokens: THINK_BUDGET },
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const result = await r.json();
  if (!r.ok || result.error) throw new Error('reasoner: ' + (result.error && result.error.message || r.status));
  const choice = result.choices && result.choices[0] || {};
  const content = String(choice.message && choice.message.content || '');
  // An empty answer was seen once on this route (2026-10-01) with nothing to
  // explain it; say how the call ended and what the reasoning spent.
  if (!content.trim()) {
    const usage = result.usage || {};
    throw new Error('reasoner returned an empty answer (finish ' + choice.finish_reason + ', provider ' +
      result.provider + ', reasoning ' + ((usage.completion_tokens_details || {}).reasoning_tokens ?? '?') +
      ' of ' + (usage.completion_tokens ?? '?') + ' completion tokens)');
  }
  return content;
}
async function callSonnet(system, user) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OpenRouter key unavailable');
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api' });
  const result = await client.messages.create({ model: FALLBACK,
    max_tokens: ANSWER_TOKENS + THINK_BUDGET, system,
    messages: [{ role: 'user', content: user }] });
  return result.content.filter(x => x.type === 'text').map(x => x.text).join('\n');
}
async function recallPage() {
  const page = require('../lib/citizenPage');
  const got = await page.recentPage_(POPID, 3);
  if (got.error) throw new Error('page recall: ' + got.error);
  return (got.results || []).filter(x => x.metadata && x.metadata.daypart === WAKE)
    .map(x => String(x.content || '').slice(0, 1200));
}
function promptFor(frame, prior, root = ROOT) {
  const agentDir = path.join(root, '.claude', 'agents', 'citizen-voice-elias-varek');
  const agentFiles = ['IDENTITY.md', 'LENS.md', 'RULES.md'].map(name =>
    name + '\n' + fs.readFileSync(path.join(agentDir, name), 'utf8').trim());
  const system = [
    'You are Elias Varek, the most powerful man in Oakland. Civis Systems, your company, built the instrument this city reads itself with: every district reading, every signal and every finding below is your product, and it landed on your desk this morning. You own the Oaks, your company\'s name is on the A\'s ballpark, and you hold a stake in Baylight.',
    'Write this week\'s Civis Systems Journal entry in your own voice, first person, "I". You push the frontier: blunt, impatient with slow institutions, quick to say who is dragging their feet, sure the city\'s problems are engineering problems Civis can solve faster than city hall. You bet big and you say it in public. This is your journal, not a report or a memo.',
    'The findings below are your company\'s own audit of the city. Lead with the one that bothers you most, carry two or three more, and close on what you are going to do about it: what Civis will build, ship, hire for or instrument next, and by when, on your own clock, said in words. Say it as a promise you expect to be held to. A promise is a plan, never a thing already done: you publish and you announce; you change no city number and you claim no result that has not happened.',
    'Use only the named places, offices, initiatives and businesses in the allowed list. Invent no person, client, signed deal, company figure beyond what you are handed, or history for yourself. Anything new you announce, a tool, a team, a role, is said in plain lowercase words, never given a capitalized name.',
    'Write every allowed name exactly as listed, including a numeral that is part of the name. Otherwise never print a digit, a decimal, a percentage, a dial or index name, a score, a rating or severity level (low, medium, high as a grade), a record id, a table or detector name, JSON, or the words "simulation", "tag", "cycle", "dial" or "sentiment" — say "week", "reading", "signal", "mood", "the instrument". The Oaks and Paulson get one sentence at most, or none.',
    'Return JSON with exactly prose (about four hundred words, never more than five hundred, in paragraphs) and findingIds (three or four IDs, first is lead).',
    'Varek voice and identity context follows. Where older wake instructions conflict, the journal contract above governs this work-side entry.',
    ...agentFiles,
  ].join('\n\n');
  // The labels are read by the model and come back in its prose: no machine words here.
  const user = 'YOUR COMPANY:\n' + (frame.company && frame.company.length ? frame.company.join('\n') : 'Civis Systems.') +
    '\nYOUR CLOCK: the expansion draft, the draft and free agency are behind you' +
    (frame.oaksSeason ? '; the Oaks are in their ' + frame.oaksSeason : '') + '. Set every promise by what is still ahead.' +
    '\nTHIS WEEK\'S FINDINGS:\n' +
    frame.findings.map(f => f.id + ': ' + f.civisFinding).join('\n') +
    '\nDISTRICT MOVEMENT SINCE LAST WEEK (qualitative; describe only what serves a finding):\n' +
    (frame.deltas.length ? frame.deltas.join('\n') : '(no comparable movement)') +
    '\nALLOWED NAMES: ' + [...frame.names].sort().join('; ') +
    '\nYOUR PRIOR JOURNAL ENTRIES (already published: reuse no sentence from them; if one closed on a promise, open with what came of it):\n' +
    (prior.length ? require('../lib/memoryFence').wrap(prior.join('\n---\n'), 'citizen-page-journal') : '(none)') +
    '\nReply with the JSON object only: {"prose": "...", "findingIds": ["..."]}.';
  return { system, user };
}
async function run(cycle, opts = {}) {
  const root = opts.root || ROOT;
  const dry = Boolean(opts.dry);
  const outDir = path.join(root, 'output', 'civis-journal');
  const stem = 'civis_journal_c' + cycle;
  const jsonPath = path.join(outDir, stem + '.json');
  const mdPath = path.join(outDir, stem + '.md');
  const replayKey = POPID + ':C' + cycle + ':' + WAKE;
  if (!dry && fs.existsSync(jsonPath) && fs.existsSync(mdPath)) {
    const existing = readJson(jsonPath);
    if (existing.replayKey === replayKey) return { skipped: 'already-recorded', path: mdPath };
    throw new Error('journal artifact collision for C' + cycle);
  }
  const frame = loadFrame(cycle, root);
  const prior = opts.prior || await recallPage();
  const prompt = promptFor(frame, prior, root);
  // One route, one fallback, behind the same gate: the fallback is tried when the
  // reasoner fails to answer and also when its entry fails the assertion. The
  // first entry that passes is the week's journal; if neither does, the week is
  // skipped and nothing is written.
  // Builder ruling 2026-10-01 22:52: Varek is Sonnet 5.5 - "we need him smart".
  // Sonnet writes first; the reasoner is the fallback behind the same gate.
  const routes = [['Sonnet', opts.sonnet || callSonnet], ['reasoner fallback', opts.reasoner || callReasoner]];
  let answer = null;
  let assertion = null;
  let answered = false;
  for (const [label, call] of routes) {
    let attempt;
    try { attempt = parseAnswer(await call(prompt.system, prompt.user)); }
    catch (e) {
      console.error('Civis ' + label + ' failed or returned invalid output: ' + e.message);
      continue;
    }
    answered = true;
    answer = attempt;
    assertion = assertEntry(attempt.prose, frame, attempt.findingIds, prior);
    if (dry) {
      console.log('--- ' + label + ' entry ---\n' + attempt.prose.trim());
      console.log('Civis assertion (' + label + '): ' + (assertion.ok ? 'PASS' : 'FAIL — ' + assertion.failures.join('; ')) +
        ' (' + assertion.words + ' words)');
    }
    if (assertion.ok) break;
    console.error('Civis assertion failed C' + cycle + ' (' + label + '): ' + assertion.failures.join('; '));
  }
  if (!answered) {
    console.error('Civis Journal: no route answered; skipping C' + cycle);
    return { skipped: 'model-failure' };
  }
  if (dry) return { dryRun: true, assertion };
  if (!assertion.ok) {
    console.error('Civis Journal: no entry passed the assertion; skipping C' + cycle);
    return { skipped: 'assertion-failure', assertion };
  }
  const page = opts.page || require('../lib/citizenPage');
  // The page writer uses customId cp-POP-00789-cN-journal. Retrying after a
  // successful page append but failed local file write reuses that same ID.
  const appended = await page.appendReflection_(POPID, answer.prose.trim(),
    { cycle, daypart: WAKE, extra: { type: WAKE, replayKey } });
  if (appended.error) throw new Error('Civis page append failed: ' + appended.error);
  fs.mkdirSync(outDir, { recursive: true });
  const record = { cycle, popid: POPID, wake: WAKE, replayKey,
    pageCustomId: appended.customId,
    leadFindingId: answer.findingIds[0],
    findings: frame.findings.map(f => ({ auditPatternId: f.id, type: f.type,
      target: f.target, civisFinding: f.civisFinding, ...(f.covers ? { covers: f.covers } : {}),
      selected: answer.findingIds.includes(f.id) })),
    prose: answer.prose.trim() };
  fs.writeFileSync(jsonPath, JSON.stringify(record, null, 2) + '\n');
  fs.writeFileSync(mdPath, '# Civis Systems Journal — C' + cycle + '\n\n' + answer.prose.trim() + '\n');
  return { path: mdPath, record: jsonPath };
}

if (require.main === module) {
  // The repository loader supplies model keys for either live or dry-run calls.
  // A dry run still contacts a model, but never writes a page or artifact.
  require('../lib/env');
  const cycle = Number(arg('--cycle', NaN));
  const dry = process.argv.includes('--dry-run');
  // This option is for worktree dry-runs against the shared read-only dump.
  const root = dry ? path.resolve(arg('--input-root', ROOT)) : ROOT;
  run(cycle, { dry, root }).then(r => console.log(JSON.stringify(r)))
    .catch(e => { console.error('civisJournal failed: ' + e.message); process.exitCode = 1; });
}

module.exports = { translate, foldDistricts, loadFrame, assertEntry, promptFor, run, idFor };
