#!/usr/bin/env node
/**
 * cron-civic-eval.js — civic.15 Task 1.1: OpenRouter voice bake-off for civic offices.
 *
 * Runs ONE real prior-cycle pending_decisions packet through N candidate models
 * (same persona system prompt for all — the office's IDENTITY+LENS+RULES, loaded
 * exactly as cron-desk-writer.js loads personas) and scores each output:
 *
 *   deterministic: JSON parse / decision-schema fields / ImplementationPhase
 *                  vocabulary (INITIATIVE_TRACKER_CONTRACT 20-value list) /
 *                  canon names (canon-name-check.js) / engine-verbiage leaks
 *   judged:        voice-match 0-10 by a DIFFERENT model family (independence
 *                  rule — same reason cron-rhea-gate.js forbids self-grading)
 *
 * Usage:
 *   node scripts/cron-civic-eval.js --office mayor --cycle 101
 *   node scripts/cron-civic-eval.js --office opp-faction --cycle 101 --dry
 *   --models a,b,c   override writer candidates
 *   --judge <slug>   override judge (default google/gemini-3.7-flash; must not
 *                    share a family with any writer — fail-loud if it does)
 *
 * Output: output/cron-civic/eval/<office>_c<cycle>_scorecard.json
 * Read-only outside output/ — this script never touches Sheets.
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { checkText } = require('./canon-name-check.js');

const ROOT = '/root/GodWorld';
const EVAL_DIR = path.join(ROOT, 'output/cron-civic/eval');

// Canonical 20-value vocabulary — phase02-world-state/applyInitiativeImplementationEffects.js PHASE_INTENSITY
const PHASES = new Set([
  'announced', 'legislation-filed', 'vote-scheduled', 'vote-ready',
  'visioning', 'visioning-complete', 'design-phase', 'construction-planning',
  'construction-active', 'implementation-active', 'disbursement-active',
  'dispatch-live', 'pilot-active', 'pilot_evaluation', 'operational',
  'complete', 'stalled', 'blocked', 'suspended', 'defunded'
]);

const ENGINE_TOKENS = /DialState|Ripple Ledger|impactScore|POP-\d{5}|Engine:|σ|desk_signal|world_summary/;

const DEFAULT_MODELS = [
  'deepseek/deepseek-chat',
  'moonshotai/kimi-k2',
  'qwen/qwen3-235b-a22b',
  'mistralai/mistral-large',
  'z-ai/glm-4.7'
];
const DEFAULT_JUDGE = 'google/gemini-3.7-flash';

function arg(flag, dflt) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return dflt;
}
const OFFICE = arg('--office', null);
const CYCLE = arg('--cycle', null);
const MODELS = arg('--models', null) ? arg('--models', null).split(',') : DEFAULT_MODELS;
const JUDGE = arg('--judge', DEFAULT_JUDGE);
const DRY = process.argv.includes('--dry');

if (!OFFICE || !CYCLE) {
  console.error('usage: cron-civic-eval.js --office <mayor|opp-faction|...> --cycle <N> [--dry]');
  process.exit(1);
}

// Independence rule: judge family must differ from every writer family.
const family = slug => slug.split('/')[0];
if (MODELS.some(m => family(m) === family(JUDGE))) {
  console.error('INDEPENDENCE VIOLATION: judge family "' + family(JUDGE) + '" is also a writer family. Pick a different --judge.');
  process.exit(1);
}

const agentDir = fs.existsSync(path.join(ROOT, '.claude/agents', OFFICE))
  ? path.join(ROOT, '.claude/agents', OFFICE)
  : path.join(ROOT, '.claude/agents', 'civic-office-' + OFFICE);
const packetPath = path.join(ROOT, 'output/civic-voice-workspace', path.basename(agentDir), 'current/pending_decisions.md');

function readPersona() {
  // persona mode, same concat as cron-desk-writer.js
  return ['IDENTITY.md', 'LENS.md', 'RULES.md']
    .map(f => path.join(agentDir, f))
    .filter(fs.existsSync)
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n\n---\n\n');
}

const OUTPUT_CONTRACT = `
Respond with ONLY a JSON object (no markdown fences, no prose before or after):
{
  "office": "<office slug>",
  "cycle": ${CYCLE},
  "speaker": "<the office-holder's full name>",
  "cascadeSummary": "<2-4 sentences: what you decided and why>",
  "statements": [
    {
      "statementId": "STMT-${CYCLE}-<office>-001",
      "type": "<statement type>",
      "topic": "<topic>",
      "initiative": "<initiative name or null>",
      "decision": "<the concrete decision>",
      "quote": "<one strong pull-quote in your voice>",
      "fullStatement": "<the full public statement in your voice>",
      "trackerUpdates": {}
    }
  ]
}
If a statement moves an initiative's ImplementationPhase, put it in trackerUpdates as
{"<InitiativeName>": {"ImplementationPhase": "<value>", "MilestoneNotes": "C${CYCLE}: <one sentence, max 200 chars>"}}.
ImplementationPhase MUST be one of: ${[...PHASES].join(', ')}.
Never invent citizens, businesses, statistics, or votes not present in your packet.`;

function callOpenRouter(model, system, user, maxTokens) {
  const body = JSON.stringify({
    model, max_tokens: maxTokens || 3000,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }, timeout: 180000
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          if (j.error) return reject(new Error(model + ': ' + (j.error.message || JSON.stringify(j.error))));
          resolve({ text: j.choices[0].message.content, usage: j.usage || {} });
        } catch (e) { reject(new Error(model + ': bad response — ' + b.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(model + ': timeout')); });
    req.write(body); req.end();
  });
}

function stripFences(t) {
  const s = t.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  // some models (observed: glm-4.7) emit prose before/after the JSON — take the outermost object
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  return (a !== -1 && b > a) ? s.slice(a, b + 1) : s;
}

function scoreDeterministic(raw) {
  const s = { parse: false, schema: false, phaseVocab: true, badPhases: [], canonUnverified: [], engineLeaks: [] };
  let j;
  try { j = JSON.parse(stripFences(raw)); s.parse = true; } catch (e) { return s; }
  s.schema = !!(j.office && j.speaker && Array.isArray(j.statements) && j.statements.length &&
    j.statements.every(st => st.decision && st.quote && st.fullStatement && 'trackerUpdates' in st));
  for (const st of j.statements || []) {
    for (const init of Object.values(st.trackerUpdates || {})) {
      const p = init && init.ImplementationPhase;
      if (p && !PHASES.has(p)) { s.phaseVocab = false; s.badPhases.push(p); }
    }
  }
  const prose = (j.statements || []).map(st => [st.fullStatement, st.quote].join(' ')).join(' ');
  try { s.canonUnverified = (checkText(prose).unverified || []).slice(0, 10); } catch (e) { s.canonUnverified = ['CHECK-FAILED: ' + e.message]; }
  const leak = prose.match(ENGINE_TOKENS);
  if (leak) s.engineLeaks.push(leak[0]);
  return s;
}

async function judgeVoices(persona, outputs) {
  const anon = outputs.map((o, i) => ({ key: String.fromCharCode(65 + i), model: o.model, text: o.raw.slice(0, 4000) }));
  const sys = 'You are an editorial judge. Score each candidate statement set for VOICE MATCH against the persona brief (0-10: does it sound like this specific official, concrete and in-character, not generic press-release filler?). Also note in one line what distinguishes each. Respond ONLY with JSON: {"scores": {"A": {"voiceMatch": n, "note": "..."}, ...}}';
  const user = 'PERSONA BRIEF:\n' + persona.slice(0, 6000) + '\n\nCANDIDATES:\n' +
    anon.map(a => '=== CANDIDATE ' + a.key + ' ===\n' + a.text).join('\n\n');
  const r = await callOpenRouter(JUDGE, sys, user, 3000);
  const t = stripFences(r.text);
  const verdict = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  anon.forEach(a => { const v = verdict.scores[a.key] || {}; outputs.find(o => o.model === a.model).judge = v; });
}

(async () => {
  if (!fs.existsSync(packetPath)) { console.error('no packet: ' + packetPath); process.exit(1); }
  if (!fs.existsSync(agentDir)) { console.error('no agent dir: ' + agentDir); process.exit(1); }
  const persona = readPersona();
  const packet = fs.readFileSync(packetPath, 'utf8');
  const user = 'YOUR PENDING DECISIONS PACKET (cycle ' + CYCLE + '):\n\n' + packet + '\n\n' + OUTPUT_CONTRACT;

  console.log('office=' + path.basename(agentDir) + ' cycle=' + CYCLE + ' packet=' + packet.length + 'ch persona=' + persona.length + 'ch');
  console.log('writers=' + MODELS.join(', ') + ' judge=' + JUDGE + (DRY ? ' (DRY — no calls)' : ''));
  if (DRY) process.exit(0);

  const outputs = [];
  for (const model of MODELS) {
    process.stdout.write('  ' + model + ' ... ');
    try {
      const r = await callOpenRouter(model, persona, user);
      const det = scoreDeterministic(r.text);
      outputs.push({ model, raw: r.text, usage: r.usage, det });
      console.log(det.parse ? (det.schema ? 'ok' : 'parse-ok schema-FAIL') : 'parse-FAIL');
    } catch (e) { outputs.push({ model, error: e.message }); console.log('ERROR ' + e.message); }
  }

  const scoreable = outputs.filter(o => !o.error && o.det.parse);
  if (scoreable.length >= 2) {
    process.stdout.write('  judge ' + JUDGE + ' ... ');
    try { await judgeVoices(persona, scoreable); console.log('ok'); }
    catch (e) { console.log('ERROR ' + e.message); }
  }

  fs.mkdirSync(EVAL_DIR, { recursive: true });
  const out = path.join(EVAL_DIR, path.basename(agentDir).replace(/^civic-office-/, '') + '_c' + CYCLE + '_scorecard.json');
  fs.writeFileSync(out, JSON.stringify({ office: path.basename(agentDir), cycle: Number(CYCLE), judge: JUDGE, ranAt: 'S343', results: outputs }, null, 2));

  console.log('\nmodel                          parse schema vocab canon-unverified leaks voice');
  for (const o of outputs) {
    if (o.error) { console.log(o.model.padEnd(30) + ' ERROR'); continue; }
    console.log(o.model.padEnd(30) +
      (o.det.parse ? ' yes ' : ' NO  ') + (o.det.schema ? '  yes  ' : '  NO   ') +
      (o.det.phaseVocab ? ' yes ' : ' NO(' + o.det.badPhases.join(',') + ')') +
      String(o.det.canonUnverified.length).padStart(8) + '         ' +
      String(o.det.engineLeaks.length).padStart(2) + '   ' +
      (o.judge ? o.judge.voiceMatch : '-'));
  }
  console.log('\nscorecard: ' + out);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
