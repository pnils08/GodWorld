#!/usr/bin/env node
/**
 * Civic Apply Gate — scripts/cron-civic-gate.js
 *
 * civic.15 Task 2.4 (docs/plans/2026-07-28-civic-cron-city-hall.md). The
 * mechanical replacement for the human approval gate in front of
 * `applyTrackerUpdates.js --apply`. Sibling of cron-rhea-gate.js.
 *
 * Deterministic prechecks (fail-closed — any failure blocks the apply):
 *   1. validateTrackerUpdates (S265 validator) — zero HARD violations
 *   2. strict phase vocabulary — every ImplementationPhase literally in the
 *      20-value INITIATIVE_TRACKER_CONTRACT set (stricter than the validator's
 *      variant-mapping, which only warns)
 *   3. engine-verbiage scan on statement prose — POPIDs, engine tokens,
 *      lintCivicPackets rules (σ / signed deltas / metric decimals / code spans)
 *   4. diff-size sanity — a decision cycle touching more than --max-rows
 *      distinct initiatives blocks (default 5)
 *
 * Then ONE cheap model sanity-read (independence rule: family must differ from
 * every writer family recorded in the run manifests) for contradictions /
 * fabrications across the decision set.
 *
 * Any failure: decisions stay staged (copied to output/cron-civic/staged/c{XX}/),
 * Discord webhook alert (DISCORD_WEBHOOK_URL), gate record written, exit 2.
 * Pass: exit 0 — the caller (cron-civic-run.js --stage=close) may then --apply.
 *
 * UNDO PATH if a bad apply ever lands: utilities/cycleRollback.js restores the
 * Initiative_Tracker from the pre-cycle snapshot.
 *
 * Usage:
 *   node scripts/cron-civic-gate.js --cycle <XX> [--max-rows 5] [--model <slug>]
 * Exit codes: 0 = pass, 2 = blocked, 1 = fatal (missing inputs / config error)
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const CIVIC = path.join(ROOT, 'output', 'cron-civic');
const { lintText } = require('./lintCivicPackets');
const { validateCycle } = require('./validateTrackerUpdates');
// The pipeline's own initiative attribution (4-signal) — the gate must never
// count initiatives differently than assembleDecisions writes them.
const { attributeInitiative } = require('./assembleDecisions');

const PHASES = new Set([
  'announced', 'legislation-filed', 'vote-scheduled', 'vote-ready',
  'visioning', 'visioning-complete', 'design-phase', 'construction-planning',
  'construction-active', 'implementation-active', 'disbursement-active',
  'dispatch-live', 'pilot-active', 'pilot_evaluation', 'operational',
  'complete', 'stalled', 'blocked', 'suspended', 'defunded'
]);

// Hard engine tokens that must never appear in civic statement prose. Civic
// counterpart of cron-rhea-gate's media list — phase names excluded (statements
// legitimately narrate project stages), system/sheet tokens are never legitimate.
const ENGINE_TOKENS = [
  'DialState', 'Ripple Ledger', 'impactScore', 'MemoryRegisters', 'desk_signal',
  'world_summary', 'engine_audit', 'engine review HIGH', 'Neighborhood_Map',
  'Simulation_Ledger', 'ctx.summary', 'safePhaseCall', 'Supermemory', 'claude-mem'
];

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } };
const log = (...a) => console.log('[gate]', ...a);
const modelFamily = slug => String(slug).split('/')[0];

function loadVoiceJsons(cycle) {
  const dir = path.join(ROOT, 'output', 'civic-voice');
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(.+)_c(\d+)\.json$/);
    if (m && m[2] === String(cycle)) out[m[1]] = readJson(path.join(dir, f));
  }
  return out;
}

function callOpenRouter(model, system, user, maxTokens) {
  const body = JSON.stringify({
    model, max_tokens: maxTokens || 3000, temperature: 0,
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
          resolve(j.choices[0].message.content);
        } catch (e) { reject(new Error(model + ': bad response — ' + b.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(model + ': timeout')); });
    req.write(body); req.end();
  });
}

function notifyDiscord(cycle, failures) {
  return new Promise((resolve) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) { log('Discord ping skipped: DISCORD_WEBHOOK_URL not set'); return resolve(); }
    const lines = ['**CIVIC APPLY GATE BLOCKED — c' + cycle + '** (' + failures.length + ' failure(s))'];
    for (const f of failures.slice(0, 8)) lines.push('- [' + f.check + '] ' + String(f.detail).slice(0, 140));
    lines.push('Decisions staged at `output/cron-civic/staged/c' + cycle + '/` — no sheet write. Undo path (if ever mis-applied): `utilities/cycleRollback.js`.');
    const parsed = new URL(webhookUrl);
    const payload = JSON.stringify({ content: lines.join('\n') });
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => { res.resume(); res.on('end', () => { log('Discord ping sent (' + res.statusCode + ')'); resolve(); }); });
    req.on('error', (e) => { log('Discord ping failed (non-blocking): ' + e.message); resolve(); });
    req.write(payload); req.end();
  });
}

function stageDecisions(cycle) {
  const src = path.join(ROOT, 'output', 'city-civic-database', 'initiatives');
  const dst = path.join(CIVIC, 'staged', 'c' + cycle);
  if (!fs.existsSync(src)) return null;
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const slug of fs.readdirSync(src)) {
    const f = path.join(src, slug, 'decisions_c' + cycle + '.json');
    if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(dst, slug + '_decisions_c' + cycle + '.json')); n++; }
  }
  return n ? path.relative(ROOT, dst) : null;
}

(async () => {
  const cycle = arg('--cycle', null);
  if (!cycle) { console.error('usage: cron-civic-gate.js --cycle <XX> [--max-rows 5] [--model <slug>]'); process.exit(1); }
  // Default diff-size ceiling = the tracker's own initiative count (a cycle
  // can legitimately touch every initiative; the check catches runaway writes
  // beyond the known world, not busy-but-real cycles).
  const trackerSnap = readJson(path.join(ROOT, 'output', 'initiative_tracker.json'));
  const MAX_ROWS = parseInt(arg('--max-rows', String((trackerSnap && trackerSnap.initiatives || []).length || 6)), 10);
  const MODEL = arg('--model', 'google/gemini-3.7-flash');
  console.log('Civic Apply Gate — c' + cycle);
  console.log('===================================');

  const voiceJsons = loadVoiceJsons(cycle);
  if (!Object.keys(voiceJsons).length) { console.error('FATAL: no voice JSONs for c' + cycle); process.exit(1); }

  const failures = [];

  // 1. validator (importable, require.main-guarded)
  const v = validateCycle(Number(cycle));
  if (v.violations.length) {
    for (const x of v.violations) failures.push({ check: 'validator', detail: (x.file || '') + ' ' + (x.message || JSON.stringify(x)).slice(0, 160) });
  }
  log('validator: ' + v.violations.length + ' violation(s), ' + (v.warnings || []).length + ' warning(s)');

  // 2. strict phase vocabulary + 4. diff size. trackerUpdates comes in two
  // shapes: keyed {"<InitiativeName>": {ImplementationPhase...}} (cron contract)
  // and flat {ImplementationPhase...} (interactive-era voice JSONs) — check both.
  const touched = new Set();
  for (const [slug, j] of Object.entries(voiceJsons)) {
    for (const st of (j && j.statements) || []) {
      const tu = st.trackerUpdates || {};
      const updates = tu.ImplementationPhase || tu.MilestoneNotes
        ? [[null, tu]]
        : Object.entries(tu).filter(([, u]) => u && typeof u === 'object');
      for (const [keyName, u] of updates) {
        const initId = attributeInitiative(
          keyName ? { ...st, trackerUpdates: { initiative: st.initiative, ...u }, topic: st.topic || keyName } : st,
          slug   // PROJECT_FILE_TO_INIT keys are bare slugs, no _c{XX} suffix
        );
        touched.add(initId || keyName || st.initiative || slug);
        if (u.ImplementationPhase && !PHASES.has(u.ImplementationPhase)) {
          failures.push({ check: 'phase-vocab', detail: slug + ': "' + u.ImplementationPhase + '" not in the 20-value contract (' + (initId || keyName || '?') + ')' });
        }
      }
    }
  }
  log('phase vocab: strict check over ' + touched.size + ' touched initiative(s)');
  if (touched.size > MAX_ROWS) {
    failures.push({ check: 'diff-size', detail: touched.size + ' initiatives touched > max ' + MAX_ROWS + ' — implausibly large decision cycle' });
  }

  // 3. engine-verbiage scan over statement prose
  for (const [slug, j] of Object.entries(voiceJsons)) {
    const prose = ((j && j.statements) || []).map(st => [st.decision, st.quote, st.fullStatement].filter(Boolean).join(' ')).join(' ');
    const pops = prose.match(/\bPOP-\d{5}\b/g);
    if (pops) failures.push({ check: 'engine-verbiage', detail: slug + ': POPID literal(s) ' + [...new Set(pops)].join(', ') });
    for (const t of ENGINE_TOKENS) {
      if (prose.toLowerCase().includes(t.toLowerCase())) failures.push({ check: 'engine-verbiage', detail: slug + ': engine token "' + t + '"' });
    }
    for (const issue of lintText(prose).slice(0, 5)) {
      failures.push({ check: 'engine-verbiage', detail: slug + ': [' + issue.rule + '] "' + issue.match + '"' });
    }
  }
  log('engine-verbiage: scanned ' + Object.keys(voiceJsons).length + ' voice file(s)');

  // 5. model sanity-read — only when prechecks are clean (no spend on a doomed run).
  // Audits the ASSEMBLED write-set (decisions_c{XX}.json — what actually reaches
  // the tracker), NOT the raw statements: cross-voice disagreement is designed
  // political friction (Mike-direct S344); the gate protects the sheet.
  let sanity = null;
  if (!failures.length) {
    const manifests = ['decide_c' + cycle + '.json', 'voices_c' + cycle + '.json', 'projects_c' + cycle + '.json']
      .map(f => readJson(path.join(CIVIC, f))).filter(Boolean);
    const writerFamilies = new Set();
    for (const m of manifests) {
      if (m.model) writerFamilies.add(modelFamily(m.model));
      for (const r of m.results || []) if (r.model) writerFamilies.add(modelFamily(r.model));
    }
    if (writerFamilies.has(modelFamily(MODEL))) {
      console.error('FATAL: gate model family "' + modelFamily(MODEL) + '" is also a writer family this run (' + [...writerFamilies].join(', ') + ') — independence rule. Pick a different --model.');
      process.exit(1);
    }
    const decisionsDir = path.join(ROOT, 'output', 'city-civic-database', 'initiatives');
    const writeSet = [];
    if (fs.existsSync(decisionsDir)) {
      for (const slug of fs.readdirSync(decisionsDir)) {
        const d = readJson(path.join(decisionsDir, slug, 'decisions_c' + cycle + '.json'));
        if (d) writeSet.push({ slug, d });
      }
    }
    if (!writeSet.length) {
      failures.push({ check: 'sanity-read', detail: 'no assembled decisions_c' + cycle + '.json files — run assembleDecisions before the gate (fail-closed)' });
    } else {
      const digest = writeSet.map(({ slug, d }) =>
        '## ' + (d.initiativeId || slug) + ' (primary voice: ' + (d.primaryVoice || d.primary || '?') + ')\n' +
        'trackerUpdates: ' + JSON.stringify(d.trackerUpdates || {})
      ).join('\n\n');
      const sys = 'You are a neutral records auditor for a city government. You check the cycle\'s FINAL tracker write-set for internal contradictions and fabrications before it is committed to the record. Political disagreement between offices is out of scope — you audit only what is about to be written.';
      const user = 'Final write-set for cycle ' + cycle + ' (one entry per initiative, already resolved by voice priority):\n\n' + digest +
        '\n\nChecks: (a) does any single entry contradict itself (phase vs milestone notes telling different stories)? (b) do the milestone notes carry two irreconcilable figures for the same fact? (c) does any entry look fabricated — a vote result, dollar figure, or program that no city record could plausibly contain?\n\nRespond ONLY with JSON: {"pass": true|false, "issues": ["<one line each>"]}';
      try {
        // 8000: gemini-flash spends reasoning tokens from the same budget — at
        // 2000 the verdict JSON truncated mid-string (same trap cron-rhea-gate hit)
        const raw = await callOpenRouter(MODEL, sys, user, 8000);
        const s = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
        sanity = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
        log('sanity-read (' + MODEL + '): ' + (sanity.pass ? 'pass' : 'FAIL') + ((sanity.issues || []).length ? ' — ' + sanity.issues.join('; ').slice(0, 300) : ''));
        if (!sanity.pass) for (const i of sanity.issues || []) failures.push({ check: 'sanity-read', detail: i });
      } catch (e) {
        // fail-closed: an unreachable/unparseable sanity model blocks the apply
        failures.push({ check: 'sanity-read', detail: 'call/parse failed (fail-closed): ' + e.message });
      }
    }
  } else {
    log('sanity-read skipped — deterministic prechecks already failed');
  }

  const record = {
    cycle: Number(cycle), pass: failures.length === 0, failures,
    touchedInitiatives: [...touched], maxRows: MAX_ROWS,
    sanity, model: MODEL, ranAt: new Date().toISOString(),
  };
  fs.mkdirSync(CIVIC, { recursive: true });
  fs.writeFileSync(path.join(CIVIC, 'gate_c' + cycle + '.json'), JSON.stringify(record, null, 2));

  if (failures.length) {
    const staged = stageDecisions(cycle);
    console.error('\nGATE BLOCKED — ' + failures.length + ' failure(s):');
    for (const f of failures) console.error('  ✗ [' + f.check + '] ' + f.detail);
    if (staged) console.error('decisions staged at ' + staged + ' (no sheet write)');
    await notifyDiscord(cycle, failures);
    process.exit(2);
  }
  console.log('\nGATE PASS — ' + touched.size + ' initiative(s) cleared for apply.');
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
