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
const REASONER = 'deepseek/deepseek-reasoner';
const FALLBACK = 'claude-sonnet-5-5';

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
function translate(pattern) {
  const e = pattern.affectedEntities || {};
  const f = pattern.evidence && pattern.evidence.fields || {};
  const places = (e.neighborhoods || []).filter(Boolean);
  const initiatives = (e.initiatives || []).filter(Boolean);
  const target = places[0] || f.Name || initiatives[0] || null;
  const where = target ? ' in ' + target : '';
  const table = {
    'repeating-event': 'The same signal keeps returning' + where + ' without an answer downstream.',
    'math-imbalance': 'Two district readings disagree' + where + '; a rising burden is not reflected in the city\'s stated mood.',
    'coverage-gap': 'The city moved in ' + String(f.domain || 'a civic domain') + ', but the public instrument did not carry that movement to the paper.',
    'writeback-drift': 'Council action reached the public record while the response instrument stayed flat.',
    'improvement': f.InitiativeID
      ? String(f.Name || f.InitiativeID) + ' has advanced; Civis should measure whether the promised service actually reaches people.'
      : 'A previous remedy moved beyond its expected mark; Civis should examine the calibration before claiming success.',
    'stuck-initiative': 'A public commitment has not moved through its next stage' + where + '.',
    'production-imbalance': 'A district reading is out of balance' + where + '.',
    'cascade-failure': 'One unanswered signal is spreading into another part of the city' + where + '.',
    'incoherence': 'Two accounts of the same city change do not reconcile' + where + '.',
  };
  return { target, text: table[pattern.type] || 'An unresolved signal in the city instrument needs a closer read' + where + '.' };
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
  const names = new Set(['Oakland', 'Civis Systems', 'Elias Varek', 'Oaks', 'Paulson']);
  for (const tab of ['Neighborhood_Demographics', 'Civic_Office_Ledger', 'Initiative_Tracker', 'Business_Ledger']) {
    for (const row of lines(path.join(beats, tab + '.jsonl'))) {
      for (const key of ['Neighborhood', 'Name', 'Title', 'InitiativeID', 'BIZ_ID', 'OfficeId']) {
        if (row[key]) names.add(String(row[key]).trim());
      }
    }
  }
  const findings = (audit.patterns || []).map((p, i) => {
    const t = translate(p);
    return { id: idFor(p, cycle, i), type: p.type, target: t.target, civisFinding: t.text };
  });
  if (!findings.length) throw new Error('audit has no patterns for C' + cycle);
  for (const f of findings) if (f.target && !names.has(f.target)) {
    throw new Error('audit target absent from current beat dump: ' + f.target);
  }
  return { cycle, previousCycle: Number(audit.previousCycle), findings, names };
}
function assertEntry(prose, frame, selectedIds) {
  const failures = [];
  const body = String(prose || '').trim();
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length < 300 || words.length > 500) failures.push('word count outside 300–500');
  if (!/\bI\b|\bmy\b|\bwe\b/i.test(body)) failures.push('first-person voice missing');
  if (/\d/.test(body)) failures.push('digits, decimals, or scores in prose');
  if (/\b(?:POPID|POP-|BIZ-|INIT-|AUD-|DialState|severity|detector|worksheet|spreadsheet|sheet|tab|JSON)\b|[{}\[\]_]/i.test(body)) {
    failures.push('private identifier or machine vocabulary in prose');
  }
  if (/\b(?:HousingPressure|RetailVitality|Sentiment|CrimeRate|TrafficIndex|HealthRisk|EconomicVitality|CivicLoad|Simulation Ledger|Neighborhood Map|Business Ledger|Riley Digest|Civic Office Ledger|Employment Roster)\b|\b[A-Z][a-z]+[A-Z][A-Za-z]+\b/.test(body)) {
    failures.push('dial name in prose');
  }
  const oaksLines = body.split(/\n/).filter(line => /\b(?:Oaks|Paulson)\b/i.test(line));
  if (oaksLines.length > 1) failures.push('Oaks/Paulson exceeds one line');
  if (!Array.isArray(selectedIds) || selectedIds.length < 3 || selectedIds.length > 4 ||
      new Set(selectedIds).size !== selectedIds.length ||
      selectedIds.some(id => !frame.findings.some(f => f.id === id))) {
    failures.push('one lead and two or three carried findings required');
  }
  // Only source-listed proper targets may appear. A target mentioned in prose
  // must exist in the current dump; the model may use no names beyond this set.
  const targetWords = [
    ...[...body.matchAll(/\b(?:in|at|for|from|about|through)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4})/g)]
      .map(m => m[1].trim()),
    ...[...body.matchAll(/\b[A-Z][A-Za-z’'-]+(?:\s+[A-Z][A-Za-z’'-]+)+/g)]
      .map(m => m[0].replace(/^(?:The|A|This|Our)\s+/, '').trim()),
  ];
  const allowed = [...frame.names];
  for (const name of targetWords) {
    if (['I', 'Civis', 'The', 'A', 'My', 'Oaks'].includes(name)) continue;
    if (!allowed.some(a => a === name || a.startsWith(name + ' '))) failures.push('unknown named target: ' + name);
  }
  return { ok: failures.length === 0, failures, words: words.length };
}
function parseAnswer(raw) {
  const cleaned = String(raw || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const answer = JSON.parse(cleaned);
  if (!answer || typeof answer.prose !== 'string') throw new Error('model reply lacks prose');
  return answer;
}
async function callReasoner(system, user) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OpenRouter key unavailable');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
      'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: REASONER, max_tokens: 3500, temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const result = await r.json();
  if (!r.ok || result.error) throw new Error('reasoner: ' + (result.error && result.error.message || r.status));
  return String(result.choices && result.choices[0] && result.choices[0].message &&
    result.choices[0].message.content || '');
}
async function callSonnet(system, user) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Sonnet key unavailable');
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const result = await client.messages.create({ model: FALLBACK, max_tokens: 2800, system,
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
function promptFor(frame, prior) {
  const system = [
    'You are Elias Varek, founder of Civis Systems. You own the instrument that helps Oakland read itself.',
    'Write a first-person Civis Systems Journal entry about how your system can serve the city better.',
    'The findings below are your company\'s internal audit translated into Civis terms. Lead with one, carry two or three, and end with one forward move: what Civis will examine or tune next. You publish; you change no city number.',
    'Use only the named places, offices, initiatives and businesses in the allowed list. Make no claims about a person\'s history or an unsupplied company act.',
    'Never print digits, decimals, dial names, scores, POPIDs, tab names, detector ids, JSON, engine or sheet vocabulary in the prose. The Oaks and Paulson get at most one line.',
    'Return JSON with exactly prose (300–500 words, paragraphs) and findingIds (three or four IDs, first is lead).'
  ].join(' ');
  const user = 'CURRENT CYCLE: C' + frame.cycle + '\nCIVIS FINDINGS:\n' +
    frame.findings.map(f => f.id + ': ' + f.civisFinding).join('\n') +
    '\nALLOWED NAMES: ' + [...frame.names].sort().join('; ') +
    '\nYOUR PRIOR JOURNAL ENTRIES (memory, not new facts):\n' +
    (prior.length ? require('../lib/memoryFence').wrap(prior.join('\n---\n'), 'citizen-page-journal') : '(none)');
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
  const prompt = promptFor(frame, prior);
  let answer;
  try { answer = parseAnswer(await (opts.reasoner || callReasoner)(prompt.system, prompt.user)); }
  catch (e) {
    console.error('Civis reasoner failed or returned invalid output: ' + e.message);
    try { answer = parseAnswer(await (opts.sonnet || callSonnet)(prompt.system, prompt.user)); }
    catch (fallback) {
      console.error('Civis Sonnet fallback failed: ' + fallback.message + '; skipping C' + cycle);
      return { skipped: 'model-failure' };
    }
  }
  const assertion = assertEntry(answer.prose, frame, answer.findingIds);
  if (dry) {
    console.log(answer.prose.trim());
    console.log('Civis assertion: ' + (assertion.ok ? 'PASS' : 'FAIL — ' + assertion.failures.join('; ')) +
      ' (' + assertion.words + ' words)');
    return { dryRun: true, assertion };
  }
  if (!assertion.ok) {
    console.error('Civis assertion failed C' + cycle + ': ' + assertion.failures.join('; '));
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
      target: f.target, civisFinding: f.civisFinding,
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

module.exports = { translate, loadFrame, assertEntry, promptFor, run, idFor };
