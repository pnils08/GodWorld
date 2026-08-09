#!/usr/bin/env node
/**
 * Headless Rhea Canon/Fact Gate — scripts/cron-rhea-gate.js
 *
 * Task 2 of docs/plans/2026-07-20-headless-newsroom-pipeline.md. The independent
 * canon gate for the headless newsroom: it verifies a writer-worker draft against
 * the current world state + canon and returns a pass/flags verdict.
 *
 * SURFACE (S325 decision): this runs at the CLAUDE CODE HEADLESS level (`claude -p`),
 * NOT as a raw-API loop like cron-desk-writer.js. Canon verification is tool-heavy
 * (Read/Grep + GodWorld MCP + dashboard) and Claude Code's harness does tools
 * reliably; raw-API loops rabbit-hole. The wrapper invokes the EXISTING
 * `.claude/agents/rhea-morgan` reviewer (she reads her own RULES at runtime), so
 * this file is glue, not a re-implementation of Rhea.
 *
 * WHY an independent gate: the writer's own scorecard self-score is lenient
 * (DeepSeek graded itself "0 hallucinations" despite a "78 OVR" leak — S325). The
 * fact/canon check must be a model that did NOT write the draft.
 *
 * Usage:
 *   node scripts/cron-rhea-gate.js --draft output/cron-compare/sports_c101_deepseek-deepseek-chat.md
 *   node scripts/cron-rhea-gate.js --draft <path> --cycle 101 --model sonnet
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const {
  normalizePriorArcRequirement,
  formatReviewerEvidence,
} = require('./priorArcRequirement');

const ROOT = path.join(__dirname, '..');
const COMPARE_DIR = path.join(ROOT, 'output', 'cron-compare');
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const DRAFT = arg('--draft', null);
const MODEL = arg('--model', 'sonnet');          // authoritative gate → Sonnet (Haiku tunable later, per source-search precedent)
const CYCLE_ARG = arg('--cycle', null);
const TIMEOUT_MS = parseInt(arg('--timeout', '420000'), 10);
// --backend=api (2026-07-25, Mike): run the gate as ONE raw OpenRouter call with
// all context injected, instead of the claude -p tool harness. Viable because
// the two heavy checks are now deterministic pre-checks (canon-name-check +
// engine-verbiage scan below); the model only judges over injected ground
// truth. S325 INDEPENDENCE RULE still applies: the gate model's family must
// differ from the WRITER's (DeepSeek) — default gemini, NEVER deepseek.
const BACKEND = arg('--backend', 'claude');      // 'claude' | 'api'
const API_MODEL = arg('--api-model', 'google/gemini-3.5-flash');
// Evaluation-only verified historical evidence. Default gate behavior is
// unchanged when absent.
const EVIDENCE_FILE = arg('--evidence-file', null);
// Task 2.5.3 (S347): wake-1 validated canon research — facts whose refs were
// deterministically resolved into published editions/current summary. Passed
// by cron-desk-run as the angle artifact path; injected as verified PRIOR
// coverage so the gate stops flagging cited history as a current-cycle
// contradiction (first live run: both flags on a tool-loop draft were
// prior-edition facts the draft correctly cited as history).
const CANON_FACTS_FILE = arg('--canon-facts', null);
// pipeline.45 Phase 1 Task 3: wake-2 packet artifact (real citizenVoice quotes).
// When present, every INTAKE quoted-source must name someone in packet.quotes —
// a quoted-source with no packet backing is the invented-source class. Passed
// by cron-desk-run; absent on manual gate runs → backing check is skipped.
const PACKET_FILE = arg('--packet', null);

const log = {
  info: (...a) => console.log('[INFO]', new Date().toISOString(), ...a),
  warn: (...a) => console.warn('[WARN]', new Date().toISOString(), ...a),
  error: (...a) => console.error('[ERROR]', new Date().toISOString(), ...a)
};

// engine.81 (S336): delegates to lib/getCurrentCycle — ONE cycle source with
// the base_context divergence guard. noArgv: this cron parses its own flags.
const getCurrentCycle = require('../lib/getCurrentCycle');
function detectCycle() {
  const c = getCurrentCycle({ soft: true, noArgv: true });
  return c === null ? 'current' : String(c);
}

function buildPrompt(cycle, draftRel, worldRel, nameCheck, evidenceRel) {
  const pre = nameCheck ? [
    'DETERMINISTIC NAME PRE-CHECK (canon-name-check.js vs the simulation ledger snapshot, ' + nameCheck.canonNames + ' canon citizens):',
    nameCheck.unverified.length
      ? 'NOT FOUND in the ledger: ' + nameCheck.unverified.join('; ') + '. For each: if the draft uses it as a PERSON (official, source, citizen) and you cannot verify it in canon via tools, flag it HIGH-severity invented name. If it is a place, business, or common phrase, dismiss it.'
      : 'Every person-name candidate in the draft resolved to a ledger citizen.',
    nameCheck.verified.length ? 'Confirmed ledger citizens in the draft: ' + nameCheck.verified.join('; ') + '.' : '',
    ''
  ].join('\n') : '';
  return [
    'You are Rhea Morgan, the Cycle Pulse verification agent, running headless as a publish gate.',
    'First read your role and rules: .claude/agents/rhea-morgan/RULES.md and .claude/agents/rhea-morgan/IDENTITY.md.',
    'Ground truth for this cycle is the world state: ' + worldRel + ' (cycle ' + cycle + ').',
    ...(evidenceRel
      ? ['Verified prior-published historical evidence is: ' + evidenceRel +
        '. Current Cycle world state wins every conflict.']
      : []),
    'The draft to verify is: ' + draftRel + '.',
    '',
    pre +
    'Cross-check EVERY named person, team, record, score, vote, trade, and roster fact in the draft against the ' +
    'world state and canon. Use Read/Grep, the dashboard API at http://localhost:3001, or the godworld MCP if available. ' +
    'Do NOT trust the draft\'s own EVIDENCE/sourcing blocks — verify independently.',
    '',
    'Flag: (a) any claim not grounded in the world state or canon; (b) invented names, numbers, or events; ' +
    '(c) ENGINE-metric leaks per newsroom.md — "tension score", "severity level", "civic load", ' +
    'engine phase/system language, raw table/column names. DO NOT flag city-level metric FIGURES: Civis Systems ' +
    'is the in-world publisher of Oakland city data, so a cited index value or rate is legitimate journalism — ' +
    'only the raw system VOCABULARY is a leak. DO NOT flag legitimate sports-game stats — OVR/overall ratings, potential ' +
    'grades, avg/HR/RBI/ERA, records, standings are canon (GodWorld sports is a game). (d) canon contradictions ' +
    '(wrong GM/manager/roster).',
    '',
    'Be EFFICIENT: verify the named people, records, trades, and votes against the world state and canon in a ' +
    'handful of tool calls — do not exhaustively read the whole archive. When you have checked the load-bearing ' +
    'facts, stop and return the verdict.',
    '',
    'Return ONLY a JSON object — no prose, no markdown fences:',
    '{"pass": <true only if there are ZERO high-severity flags>, "flags": [{"claim":"...","issue":"...","severity":"low|med|high"}], "summary":"<one line>"}'
  ].join('\n');
}

function loadEvaluationPriorArcEvidence(filePath) {
  if (!filePath) return null;
  const abs = path.resolve(ROOT, filePath);
  const evaluationRoot = path.join(COMPARE_DIR, 'evaluations');
  if (!abs.startsWith(evaluationRoot + path.sep)) {
    throw new Error(
      '--evidence-file must be inside output/cron-compare/evaluations/'
    );
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw new Error('evidence file not found: ' + filePath);
  }
  const raw = fs.readFileSync(abs, 'utf8');
  if (raw.length > 5000) throw new Error('evidence file exceeds 5000 characters');
  try {
    return {
      requirement: normalizePriorArcRequirement(JSON.parse(raw)),
      abs,
      rel: path.relative(ROOT, abs),
    };
  } catch (error) {
    throw new Error('invalid evidence file: ' + error.message);
  }
}

// ---------------------------------------------------------------------------
// API backend (--backend=api, 2026-07-25): one raw OpenRouter call, everything
// injected. Viable because the tool-heavy checks are deterministic pre-checks.
// ---------------------------------------------------------------------------

// Phase 2.1 flag class (a), deterministic half: engine/system language that must
// never reach prose. Scans the BODY only — PREWRITE/EVIDENCE are fenced metadata.
const ENGINE_TOKENS = [
  'construction-planning', 'active internal state', 'Ripple Ledger', 'impactScore',
  'tension score', 'severity level', 'civic load', 'DialState', 'MemoryRegisters',
  'DisplacementRisk', 'MigrationIntent', 'WealthLevel', 'CareerStage', 'EconomicProfileKey',
  'EmployerBizId', 'SMPageId', 'desk_signal', 'world_summary', 'Initiative_Tracker',
  'Neighborhood_Map', 'Reflection_Intake', 'Supermemory', 'claude-mem'
];
// Unwrap a whole-document code fence before any scan. S344: a DeepSeek business
// draft wrapped its ENTIRE article in ```markdown …```; scanEngineVerbiage strips
// fenced blocks (to skip code examples), so it stripped the whole article, scanned
// an empty string, reported "clean", and the gate passed a draft leaking two raw
// POPIDs. Fence-stripping must never be able to blank the document.
function unwrapWholeDocFence(text) {
  const t = String(text).trim();
  const m = t.match(/^```[a-z]*\s*\n([\s\S]*?)\n?```\s*$/i);
  if (m) return m[1];
  // Leading fence with no closing fence at EOF, or fenced head + trailing junk:
  // if stripping fences would remove most of the document, keep the raw text.
  const stripped = t.replace(/```[\s\S]*?```/g, '').trim();
  if (t.length > 400 && stripped.length < t.length * 0.35) return t.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
  return text;
}

// Structural junk a model emits when it thinks it's calling tools instead of
// filing copy — the S344 business draft carried a python write_file() block
// duplicating the whole article. Never publishable; deterministic hard fail.
function scanStructuralJunk(draftText) {
  const hits = [];
  const t = String(draftText);
  if (/```(?:python|js|javascript|bash|sh)\b/i.test(t)) hits.push('code block in an article draft');
  if (/\bwrite_file\s*\(|\bopen\s*\([^)]*['"]w['"]\)/.test(t)) hits.push('tool-call code (write_file/open) in draft body');
  if (/^\s*```/.test(t)) hits.push('draft wrapped in a code fence (not clean prose)');
  return hits;
}

function scanEngineVerbiage(draftText) {
  const body = unwrapWholeDocFence(draftText).replace(/```[\s\S]*?```/g, '');
  const hits = [];
  for (const t of ENGINE_TOKENS) {
    const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const m = body.match(re);
    if (m) hits.push({ token: t, count: m.length });
  }
  const pops = body.match(/\bPOP-\d{5}\b/g);
  if (pops) hits.push({ token: 'POPID literal (POP-XXXXX)', count: pops.length });
  // Mike-direct 2026-08-07: engine NUMBERS are not contamination — Civis Systems is the
  // in-world publisher of city-level metrics, so a cited figure is ordinary journalism.
  // The raw-decimal scan is retired; system LANGUAGE (metric names, status enums, table
  // names, POPID literals) is still policed by the token list above.
  return hits;
}

const API_RATES = { 'google/gemini-3.5-flash': [1.5, 9], 'google/gemini-3.5-flash-lite': [0.3, 2.5], _default: [1.5, 9] };

function callOpenRouter(model, system, user) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      // headroom for gemini-flash reasoning_tokens — at 2000 the model spent the
      // whole budget reasoning and the verdict JSON truncated mid-string
      model, max_tokens: 8000, temperature: 0,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
    });
    const req = https.request({
      hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://godworld.local',
        'X-Title': 'GodWorld headless rhea gate'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) return reject(new Error('OpenRouter: ' + (j.error.message || JSON.stringify(j.error))));
          const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
          const u = j.usage || {};
          resolve({ text, usageIn: u.prompt_tokens || 0, usageOut: u.completion_tokens || 0 });
        } catch (e) { reject(new Error('OpenRouter parse: ' + e.message + ' | ' + data.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

function readAgentFile(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (_) { return ''; }
}

function buildApiPrompt(cycle, draftText, worldText, nameCheck, verbiage, profiles) {
  const system = [
    'You are Rhea Morgan, the Cycle Pulse verification agent, running headless as a publish gate.',
    'Your role and rules follow — they govern your verdict.',
    '',
    '=== IDENTITY.md ===', readAgentFile('.claude/agents/rhea-morgan/IDENTITY.md'),
    '=== RULES.md ===', readAgentFile('.claude/agents/rhea-morgan/RULES.md'),
    '',
    'Return ONLY a JSON object — no prose, no markdown fences:',
    '{"pass": <true only if there are ZERO high-severity flags>, "flags": [{"claim":"...","issue":"...","severity":"low|med|high"}], "summary":"<one line>"}'
  ].join('\n');
  const user = [
    'GROUND TRUTH for cycle ' + cycle + ' (the world state — claims are checked against THIS):',
    worldText,
    '',
    '=== DETERMINISTIC PRE-CHECKS (already run against the ledger — trust these, they are not model output) ===',
    '1. Canon name check (' + (nameCheck ? nameCheck.canonNames : '?') + ' ledger citizens):',
    nameCheck && nameCheck.unverified.length
      ? '   NOT IN LEDGER: ' + nameCheck.unverified.join('; ') + ' — if the draft uses any of these as a PERSON (official, source, citizen), flag HIGH-severity invented name. Dismiss places, businesses, common phrases.'
      : '   every person-name candidate resolved to a ledger citizen' + (nameCheck && nameCheck.verified.length ? ' (' + nameCheck.verified.join('; ') + ')' : '') + '.',
    '2. Engine-verbiage scan (article body):',
    verbiage.length
      ? '   HITS: ' + verbiage.map(v => v.token + ' ×' + v.count).join('; ') + ' — engine/system language in prose is a flag (rewrite to citizen-facing language). Legitimate sports-game stats (OVR, avg/HR/RBI/ERA, records, standings) are canon — dismiss those.'
      : '   clean.',
    '3. Ledger profiles of verified citizens named in the draft (bio ground truth — any age, occupation,' +
    '   tenure, wealth, or neighborhood claim contradicting these is HIGH-severity misrepresentation):',
    profiles.length ? profiles.map(p => '   - ' + p).join('\n') : '   (none)',
    '',
    '=== DRAFT TO VERIFY ===',
    draftText,
    '',
    'Your job is TWO flag classes — you police the canon boundary, not the editorial voice:',
    '(a) ENGINE VERBIAGE — system language, status enums, raw table/column names leaking into prose. NOT numbers: ' +
    '    city metric figures are published by Civis Systems in-world and are legitimate to cite.',
    '(b) MISREPRESENTATION OF DATA OUTPUT — a claim that distorts or contradicts the ground truth above',
    '    (a metric stated as falling when it rose; a count off from canon; a prior-cycle stat presented as current).',
    'Plus the pre-check classes above (invented names used as people).',
    'WHAT PASSES: anything the ground truth genuinely supports — allegations, cross-signal connections, a',
    'reporter\'s inference from real data, anonymous scene texture the reporter observed, editorial voice.',
    'Do not fact-check opinion; do not flatten voice.',
    'Verify the load-bearing claims against the ground truth, then return the verdict JSON.'
  ].join('\n');
  return { system, user };
}

async function main() {
  if (!DRAFT) throw new Error('--draft <path> is required');
  const draftAbs = path.resolve(ROOT, DRAFT);
  if (!fs.existsSync(draftAbs)) throw new Error('draft not found: ' + draftAbs);

  // Cycle from the DRAFT filename first (e.g. sports_c101_...) — the draft's own
  // cycle, NOT the newest cycle (the sim may have advanced since the draft ran).
  const draftCycle = (path.basename(draftAbs).match(/_c(\d+)/) || [])[1];
  const cycle = CYCLE_ARG || draftCycle || detectCycle();
  const worldRel = 'output/world_summary_c' + cycle + '.md';
  const draftRel = path.relative(ROOT, draftAbs);
  const priorArcEvidence = loadEvaluationPriorArcEvidence(EVIDENCE_FILE);

  // S325 independence rule, enforced: the gate model's family must differ from
  // the WRITER's (writer model slug is the draft filename's last segment, e.g.
  // deepseek-deepseek-chat). DeepSeek graded its own draft "0 hallucinations"
  // with a 78 OVR leak in it — self-grading is banned, fail loud.
  const writerSlug = path.basename(draftAbs, '.md').split('_').pop();
  const writerFamily = (writerSlug || '').split('-')[0];
  const gateFamily = BACKEND === 'api' ? API_MODEL.split('/')[0].toLowerCase() : 'claude';
  if (writerFamily && writerFamily === gateFamily) {
    throw new Error('S325 independence rule: gate family "' + gateFamily + '" matches the writer ("' +
      writerSlug + '") — pick a different --api-model (or backend). Self-grading is banned.');
  }

  console.log('Headless Rhea Gate — ' + draftRel);
  console.log('===================================');
  console.log('backend=' + BACKEND + ' model=' + (BACKEND === 'api' ? API_MODEL : MODEL) + ' cycle=' + cycle);

  // Deterministic canon name pre-check (2026-07-25, the "Marisol Garcia" class):
  // invented officials/sources get handed to the gate as a must-verify list.
  const draftText = fs.readFileSync(draftAbs, 'utf8');
  let nameCheck = null;
  try {
    nameCheck = require('./canon-name-check').checkText(draftText);
    console.log('name pre-check: ' + nameCheck.verified.length + ' verified, ' +
      nameCheck.unverified.length + ' not-in-ledger' + (nameCheck.unverified.length ? ' [' + nameCheck.unverified.join('; ') + ']' : ''));
  } catch (e) { log.warn('name pre-check failed (non-fatal): ' + e.message); }

  // pipeline.45 Phase 1 Task 3 — deterministic INTAKE pre-check. Parse validity,
  // name resolution, and quoted-source backing are clearance criteria: everything
  // downstream (sheet ingest, Supermemory tags, EIC claim audit) reads INTAKE,
  // so a draft with a broken block is flagged regardless of the model verdict.
  // Blockers join detBlockers below (S344 class — override a model pass).
  const intakeBlockers = [];
  let intakeReport = null;
  {
    const parsed = require('../lib/articleIntake').parse(draftText);
    const resolveCitizens = require('./canon-name-check').resolveCitizens;
    const resolved = parsed.found ? resolveCitizens(parsed.names.map(n => n.name)) : [];
    const unresolvable = resolved.filter(r => r.popid === null && !r.ambiguous).map(r => r.name);
    let unbackedQuoted = [];
    if (parsed.found && PACKET_FILE) {
      try {
        const packet = JSON.parse(fs.readFileSync(path.resolve(ROOT, PACKET_FILE), 'utf8'));
        const quoted = new Set(((packet && packet.quotes) || []).map(q => String(q.name).toLowerCase()));
        unbackedQuoted = parsed.names.filter(n => n.role === 'quoted-source' && !quoted.has(String(n.name).toLowerCase())).map(n => n.name);
      } catch (e) { log.warn('intake packet load failed (backing check skipped): ' + e.message); }
    }
    if (!parsed.found) {
      intakeBlockers.push({ severity: 'high', check: 'intake-missing', issue: 'no ## INTAKE block in draft' });
    } else {
      if (parsed.errors.length) intakeBlockers.push({ severity: 'high', check: 'intake-grammar',
        issue: parsed.errors.slice(0, 6).map(e => e.code + (e.lineNumber ? '@L' + e.lineNumber : '')).join('; ') + (parsed.errors.length > 6 ? ' (+' + (parsed.errors.length - 6) + ' more)' : '') });
      if (unresolvable.length) intakeBlockers.push({ severity: 'high', check: 'intake-name',
        issue: 'INTAKE name(s) not in ledger: ' + unresolvable.join('; ') });
      if (unbackedQuoted.length) intakeBlockers.push({ severity: 'high', check: 'intake-quoted-source',
        issue: 'quoted-source with no wake-2 packet backing: ' + unbackedQuoted.join('; ') });
    }
    intakeReport = {
      found: parsed.found,
      counts: { names: parsed.names.length, businesses: parsed.businesses.length,
        storylines: parsed.storylines.length, hoods: parsed.hoods.length, claims: parsed.claims.length },
      grammarErrors: parsed.errors.length,
      unresolvable, unbackedQuoted,
      packetChecked: !!(parsed.found && PACKET_FILE)
    };
    console.log('intake pre-check: ' + (parsed.found
      ? parsed.names.length + ' names / ' + parsed.claims.length + ' claims, ' + parsed.errors.length + ' grammar error(s)' +
        (unresolvable.length ? ', unresolvable [' + unresolvable.join('; ') + ']' : '') +
        (unbackedQuoted.length ? ', unbacked quoted-source [' + unbackedQuoted.join('; ') + ']' : '')
      : 'MISSING'));
  }

  const started = Date.now();
  let verdict = null, apiCost = null, durationMs = 0;

  if (BACKEND === 'api') {
    // raw OpenRouter gate: deterministic pre-checks + injected ground truth, one call
    const verbiage = scanEngineVerbiage(draftText);
    console.log('verbiage scan: ' + (verbiage.length ? verbiage.map(v => v.token + ' ×' + v.count).join('; ') : 'clean'));
    let worldText = fs.existsSync(path.join(ROOT, worldRel)) ? fs.readFileSync(path.join(ROOT, worldRel), 'utf8') : '(world summary missing: ' + worldRel + ')';
    if (priorArcEvidence) {
      worldText += '\n\n' + formatReviewerEvidence(priorArcEvidence.requirement);
    }
    // Task 2.5.3 — wake-1 validated canon facts ride into the gate context.
    // These refs deterministically resolve into the published record; the draft
    // citing them AS HISTORY is correct journalism, not a contradiction. A past
    // state presented as CURRENT is still a flag — that rule stays.
    if (CANON_FACTS_FILE) {
      try {
        const angleArt = JSON.parse(fs.readFileSync(path.resolve(ROOT, CANON_FACTS_FILE), 'utf8'));
        const facts = (angleArt.canonResearch && angleArt.canonResearch.facts) || [];
        if (facts.length) {
          worldText += '\n\nVERIFIED PRIOR COVERAGE (wake-1 canon research; every ref resolves into the published record):\n' +
            facts.map(f => '- ' + f.fact + '  [' + f.ref + ']').join('\n') +
            '\nThe draft may cite these as prior reporting/history without penalty. Flag ONLY if the draft presents a past state as the CURRENT cycle state or distorts the fact itself.';
          console.log('canon-facts context: ' + facts.length + ' verified prior-coverage fact(s) injected');
        }
      } catch (e) { log.warn('canon-facts load failed (non-fatal): ' + e.message); }
    }
    const profiles = nameCheck ? require('./canon-name-check').profilesFor(nameCheck.verified) : [];
    const { system, user } = buildApiPrompt(cycle, draftText, worldText, nameCheck, verbiage, profiles);
    log.info('calling ' + API_MODEL + ' via OpenRouter (no tools, injected context)...');
    const r = await callOpenRouter(API_MODEL, system, user);
    durationMs = Date.now() - started;
    const rates = API_RATES[API_MODEL] || API_RATES._default;
    apiCost = +(((r.usageIn / 1e6) * rates[0]) + ((r.usageOut / 1e6) * rates[1])).toFixed(4);
    try { const m = r.text.match(/\{[\s\S]*\}/); verdict = JSON.parse(m ? m[0] : r.text); }
    catch (_) { verdict = { pass: null, flags: [], summary: 'verdict parse failed', parseError: true, raw: r.text.slice(0, 600) };
      log.warn('api verdict parse failed — raw head: ' + r.text.slice(0, 300).replace(/\s+/g, ' ')); }
  } else {
    const prompt = buildPrompt(
      cycle,
      draftRel,
      worldRel,
      nameCheck,
      priorArcEvidence ? priorArcEvidence.rel : null
    );
    // --allowedTools whitelists read-only work (no Write/Edit); last so the variadic
    // list doesn't swallow other flags.
    const args = ['-p', prompt, '--output-format', 'json', '--model', MODEL,
      '--allowedTools', 'Read', 'Glob', 'Grep', 'Bash'];

    log.info('invoking claude -p (headless rhea)...');
    let stdout;
    try {
      stdout = execFileSync(CLAUDE_BIN, args, { cwd: ROOT, encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 });
    } catch (e) {
      // execFileSync throws on non-zero exit / timeout; keep whatever stdout we got
      stdout = (e.stdout && e.stdout.toString()) || '';
      if (!stdout) throw new Error('claude -p failed: ' + (e.message || e));
      log.warn('claude -p exited non-zero but produced stdout — parsing anyway.');
    }
    durationMs = Date.now() - started;

    // Envelope from --output-format json: { result, is_error, total_cost_usd, usage, ... }
    let envelope;
    try { envelope = JSON.parse(stdout); }
    catch (e) { throw new Error('could not parse claude envelope JSON: ' + e.message + ' | ' + stdout.slice(0, 400)); }

    const resultText = typeof envelope.result === 'string' ? envelope.result : JSON.stringify(envelope.result || '');
    try { const m = resultText.match(/\{[\s\S]*\}/); verdict = JSON.parse(m ? m[0] : resultText); }
    catch (_) { verdict = { pass: null, flags: [], summary: 'verdict parse failed', parseError: true, raw: resultText.slice(0, 600) }; }
    apiCost = envelope.total_cost_usd ?? null;
  }

  // Fail-closed gate (S333 harden): never trust verdict.pass alone. An internally
  // inconsistent verdict (pass:true alongside a high-severity flag) must BLOCK, and
  // flags that didn't parse as an array count as unverified → block.
  const flagsArr = Array.isArray(verdict.flags) ? verdict.flags : [];
  const highSevCount = flagsArr.filter(f => (f.severity || '').toLowerCase() === 'high').length;

  // Deterministic blockers (S344) — these OVERRIDE a model pass. The judge model
  // approved a draft that leaked two POPIDs inside a whole-doc fence and carried a
  // python write_file() duplicate of itself; no model verdict should be able to
  // clear machine-detectable contamination.
  const detBlockers = [];
  detBlockers.push(...intakeBlockers);   // pipeline.45: INTAKE validity is part of clearance
  for (const j of scanStructuralJunk(draftText)) detBlockers.push({ severity: 'high', check: 'structural', issue: j });
  const bodyForScan = unwrapWholeDocFence(draftText).replace(/```[\s\S]*?```/g, '');
  const popHits = bodyForScan.match(/\bPOP-\d{5}\b/g);
  if (popHits) detBlockers.push({ severity: 'high', check: 'popid-leak', issue: 'raw POPID(s) in prose: ' + [...new Set(popHits)].join(', ') });
  if (detBlockers.length) {
    console.log('deterministic blockers: ' + detBlockers.map(d => d.check).join(', '));
    flagsArr.push(...detBlockers);
  }

  const gatePass = verdict.pass === true && Array.isArray(verdict.flags) && highSevCount === 0 && detBlockers.length === 0;

  const out = {
    draft: draftRel, cycle, backend: BACKEND, model: BACKEND === 'api' ? API_MODEL : MODEL,
    pass: gatePass,
    flags: flagsArr,
    flagCount: Array.isArray(verdict.flags) ? verdict.flags.length : null,
    highSeverityCount: Array.isArray(verdict.flags) ? highSevCount : null,
    summary: verdict.summary || '',
    nameCheck: nameCheck ? { verified: nameCheck.verified, unverified: nameCheck.unverified } : null,
    intake: intakeReport,
    apiCostUsd: apiCost,
    durationMs,
    parseError: verdict.parseError || false,
    ranAt: new Date().toISOString()
  };
  if (priorArcEvidence) {
    out.priorArcEvidence = {
      artifactClass: priorArcEvidence.requirement.artifactClass,
      sourceId: priorArcEvidence.requirement.sourceId,
      citationNumber: priorArcEvidence.requirement.citationNumber,
      currentAuthorityWins: true,
    };
  }

  fs.mkdirSync(COMPARE_DIR, { recursive: true });
  const base = path.basename(draftAbs).replace(/\.md$/, '');
  const outPath = path.join(COMPARE_DIR, base + '.rhea.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log('\n--- rhea verdict ---');
  console.log(JSON.stringify(out, null, 2));
  console.log('\nverdict → ' + path.relative(ROOT, outPath) + '  (' + durationMs + 'ms)');

  // Exit code: 0 = pass, 2 = flagged/fail, 3 = parse error (so an orchestrator can branch)
  process.exit(out.parseError ? 3 : (out.pass === true ? 0 : 2));
}

Promise.resolve().then(() => main())
  .catch(err => { log.error('Fatal: ' + err.message); process.exit(1); });
