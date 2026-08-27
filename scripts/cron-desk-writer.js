#!/usr/bin/env node
/**
 * Headless Desk Writer — scripts/cron-desk-writer.js
 *
 * A/B test harness (S325, research.25 Thread A). Runs a desk agent HEADLESS via
 * the raw Anthropic API + a tool-use loop, instead of as a Claude Code subagent,
 * so we can compare the two on the SAME cycle. This is the "cron writes the
 * article" experiment from "The Bay Awakening" (Drive 182GQ...G-Pa), built as a
 * fair test: only the harness (raw-node cron vs Claude Code subagent) varies.
 *
 * FAIRNESS CONTROLS (v1 — same model):
 *   - Same instructions : the desk's own SKILL.md is the system prompt; the model
 *     follows its boot sequence and reads IDENTITY/LENS/RULES/canon/workspace itself.
 *   - Same tools        : read_file / glob / grep / write_file — mirrors the desk
 *     frontmatter `tools: Read, Glob, Grep, Write`. Plus search_world (ranked disk
 *     search) which the subagent gets via the dashboard API.
 *   - Same model        : --model defaults to the current Sonnet (desk runs `model: sonnet`).
 *   - Same turn budget  : --max-turns defaults to 15 (desk SKILL maxTurns: 15).
 *
 * SANDBOX: every write is forced into output/cron-compare/ — the headless model
 * can never clobber the real output/desk-output/ the terminal pipeline writes.
 * Reads/glob/grep are read-only and repo-scoped (no path escape above repo root).
 *
 * Usage:
 *   node scripts/cron-desk-writer.js --desk sports
 *   node scripts/cron-desk-writer.js --desk sports --model claude-sonnet-5 --dry-run
 *   node scripts/cron-desk-writer.js --desk civic --artifact-tag task7-baseline
 *   node scripts/cron-desk-writer.js --desk civic --artifact-tag task7-bound \
 *     --state-file output/cron-compare/evaluations/task7-bound/treatment.state.md \
 *     --brief-requirement-file output/cron-compare/evaluations/task7-bound/prior-arc-requirement.json
 *
 * Requires .env: ANTHROPIC_API_KEY
 *
 * v2 (later, research.25 Thread B): add --provider openrouter to sweep cheaper
 * models for creative writing. The API call is isolated in callModel() for that.
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');
const mags = require('../lib/mags');
const { checkText: checkCanonNames } = require('./canon-name-check');
const {
  normalizePriorArcRequirement,
  formatWriterRequirement,
} = require('./priorArcRequirement');

const ROOT = path.join(__dirname, '..');
const COMPARE_DIR = path.join(ROOT, 'output', 'cron-compare');

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}
const DESK = arg('--desk', 'sports');
// Persona first — firebrand model routing must not inherit civic DeepSeek.
const PERSONA = arg('--persona', null);   // e.g. freelance-firebrand — adversarial stance (IDENTITY+LENS+RULES)
// Per-desk / per-persona routing: persona key in desk-model-map.json wins over desk.
/**
 * Hard-inject a sports solo-seat concept bag from docs/media/.
 * @param {string} fileName e.g. ANTHONY_ANALYSIS_BAG.md
 * @param {string} banner short label for the injected block
 * @param {string} missingHint fallback line if file absent
 */
function loadPersonaBag(fileName, banner, missingHint) {
  const bagPath = path.join(ROOT, 'docs', 'media', fileName);
  try {
    const raw = fs.readFileSync(bagPath, 'utf8');
    const body = raw.replace(/^---[\s\S]*?---\s*/, '').trim();
    return '\n\n=== ' + banner + ' ===\n' + body + '\n=== END ' + banner + ' ===\n';
  } catch (e) {
    return '\n\n' + banner + ' MISSING at docs/media/' + fileName + ' (' + e.message + '). ' +
      (missingHint || '') + '\n';
  }
}
function loadAnthonyAnalysisBag() {
  return loadPersonaBag(
    'ANTHONY_ANALYSIS_BAG.md',
    'ANTHONY ANALYSIS BAG (go-to tools — As_Roster + TrueSource + feed only)',
    'Still: use As_Roster line stats only; never invent x-stats.'
  );
}
function loadPSlayerChargeBag() {
  return loadPersonaBag(
    'P_SLAYER_CHARGE_BAG.md',
    'P SLAYER CHARGE BAG (column architectures — variety of heat)',
    'Still: first-person I/we, friction pivot, no FO PR voice.'
  );
}
function loadHalArchiveBag() {
  return loadPersonaBag(
    'HAL_ARCHIVE_BAG.md',
    'HAL ARCHIVE BAG (legacy architectures — variety of time)',
    'Still: present fact first, then era echo; never wire copy.'
  );
}
function loadCarmenAccretionBag() {
  return loadPersonaBag(
    'CARMEN_ACCRETION_BAG.md',
    'CARMEN ACCRETION BAG (civic ledger architectures)',
    'Still: third-person, vote math, follow money; no multi-voice desk average.'
  );
}
function loadLuisInvestigationBag() {
  return loadPersonaBag(
    'LUIS_INVESTIGATION_BAG.md',
    'LUIS INVESTIGATION BAG (pressure architectures)',
    'Still: know/don\'t-know, silence clocks; fair not theatrical.'
  );
}
function loadTrevorSystemsBag() {
  return loadPersonaBag(
    'TREVOR_SYSTEMS_BAG.md',
    'TREVOR SYSTEMS BAG (infrastructure architectures)',
    'Still: timestamp + pattern; dry systems voice.'
  );
}
function loadTorresSafetyBag() {
  return loadPersonaBag(
    'TORRES_SAFETY_BAG.md',
    'TORRES SAFETY BAG (public-safety architectures)',
    'Still: incident structure, classification gap; no sensationalism.'
  );
}
function loadMezranHealthBag() {
  return loadPersonaBag(
    'MEZRAN_HEALTH_BAG.md',
    'MEZRAN HEALTH BAG (clinical human-cost architectures)',
    'Still: packet case counts only; calm not alarmist.'
  );
}
function loadMariaGroundBag() {
  return loadPersonaBag('MARIA_GROUND_BAG.md', 'MARIA GROUND BAG (culture neighborhood architectures)', 'First-person witness; packet-named only.');
}
function loadGrayeFaithBag() {
  return loadPersonaBag('GRAYE_FAITH_BAG.md', 'GRAYE FAITH BAG (quiet work architectures)', 'Dignity; no invented clergy.');
}
function loadKaiArtsBag() {
  return loadPersonaBag('KAI_ARTS_BAG.md', 'KAI ARTS BAG (arts/neighborhood architectures)', 'Present-tense scene; packet venues only.');
}
function loadMasonKitchenBag() {
  return loadPersonaBag('MASON_KITCHEN_BAG.md', 'MASON KITCHEN BAG (workplace hospitality architectures)', 'Workplaces first; packet workers only.');
}
function loadAngelaEducationBag() {
  return loadPersonaBag('ANGELA_EDUCATION_BAG.md', 'ANGELA EDUCATION BAG (stability architectures)', 'Programs that stayed; no invented scores.');
}
function loadNoahEnvironmentBag() {
  return loadPersonaBag('NOAH_ENVIRONMENT_BAG.md', 'NOAH ENVIRONMENT BAG (weather/ground architectures)', 'Science-first; no invented AQI.');
}
function loadTanyaSidelineBag() {
  return loadPersonaBag('TANYA_SIDELINE_BAG.md', 'TANYA SIDELINE BAG (clubhouse dispatch architectures)', 'Packet quotes only; short dispatch.');
}
function loadSimonLongviewBag() {
  return loadPersonaBag('SIMON_LONGVIEW_BAG.md', 'SIMON LONG VIEW BAG (sports-civic architecture)', 'Keystone continuity; not heat or tables.');
}
function loadMarburyDataBag() {
  return loadPersonaBag('MARBURY_DATA_BAG.md', 'MARBURY DEEP ANALYSIS BAG (audit-grade board memos for canon)', 'As_Roster+TrueSource only; show sample floors; never invent x-stats.');
}
function loadSharonLifestyleBag() {
  return loadPersonaBag('SHARON_LIFESTYLE_BAG.md', 'SHARON LIFESTYLE BAG (behavior/pattern architectures)', 'Warm analytical; packet venues; no engine decimals.');
}
function loadArianaAnalyticsBag() {
  return loadPersonaBag('ARIANA_ANALYTICS_BAG.md', 'ARIANA SPORTS ANALYTICS BAG (sports-native deep analysis for canon)', 'As_Roster+TrueSource; sample floors; never invent x-stats.');
}
function loadHartleyVisualBag() {
  return loadPersonaBag('HARTLEY_VISUAL_BAG.md', 'HARTLEY VISUAL BAG (visual record / prompt architectures)', 'Prompts and visual assignments; not prose articles; no invented institutions.');
}



function loadDeskRoute(desk, persona) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'desk-model-map.json'), 'utf8'));
    if (persona && m[persona]) return m[persona];
    return m[desk] || m._default || null;
  } catch (_) { return null; }
}
const PROVIDER_FLAG = arg('--provider', null);
const MODEL_FLAG = arg('--model', null);
const DESK_ROUTE = (!PROVIDER_FLAG || !MODEL_FLAG) ? loadDeskRoute(DESK, PERSONA) : null;
// infrastructure.7 (2026-08-20): last-resort fallback flipped anthropic -> openrouter.
// Every seat in desk-model-map.json and newsroom-wake-packages.json already routes
// through OpenRouter, so this branch only fires if the map fails to load at all —
// and in that case the safe landing is the rail everything else is on, not a
// silent drop onto the Anthropic key. The --provider flag still overrides.
const PROVIDER = PROVIDER_FLAG || (DESK_ROUTE && DESK_ROUTE.provider) || 'openrouter';   // 'anthropic' | 'openrouter'
const MODEL = MODEL_FLAG || (DESK_ROUTE && DESK_ROUTE.model) || (PROVIDER === 'openrouter' ? 'deepseek/deepseek-chat' : 'claude-sonnet-5');
const MODEL_SLUG = MODEL.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const MAX_TURNS = parseInt(arg('--max-turns', '15'), 10);
const MAX_TOKENS = parseInt(arg('--max-tokens', '16000'), 10);   // a full multi-article section > 8k (S325: 8k truncated Sonnet mid-Article-2)
const DRY_RUN = process.argv.includes('--dry-run');
// Per-call ceiling (S332): a headless cron must never hang forever on a stalled
// API response. An Anthropic call with no timeout froze a wake run mid-explore
// (c102) with no recovery. Bounded + a couple retries → the run fails loud
// instead of blocking the M–F pipeline. Tunable via --call-timeout (ms).
const CALL_TIMEOUT_MS = parseInt(arg('--call-timeout', '180000'), 10);
// Phase 2 layer-3 lane injection: when set, the orchestrator hands the desk its
// desk_signal lane partition + supplied citizen quotes as the injected state,
// instead of the full 40k world_summary blob (the firehose that made C101 desks
// self-filter). Additive — absent = the proven full-summary path, unchanged.
const STATE_FILE = arg('--state-file', null);
// Evaluation-only composition binding. It is inert unless explicitly supplied
// alongside an artifact tag and an injected lane state.
const BRIEF_REQUIREMENT_FILE = arg('--brief-requirement-file', null);
const STRICT_SOURCE_HYGIENE =
  process.argv.includes('--strict-source-hygiene');
// ADR-0017 Packet mode: compose only from the injected typed Packet. No
// canon/sheet/memory tool is exposed, so a scheduled package cannot silently
// enlarge its evidence set mid-run.
const PACKET_ONLY = process.argv.includes('--packet-only');

// Approx USD per 1M tokens [input, output] — for the scorecard's apiCostUsd (estimate).
// Live OpenRouter check 2026-08-10 (prompt/completion per 1M).
const RATES = {
  'claude-sonnet-5': [3, 15],
  'anthropic/claude-sonnet-5': [2, 10],
  'claude-opus-4-8': [15, 75],
  'deepseek/deepseek-chat': [0.26, 1.03],
  'meta-llama/llama-3.3-70b-instruct': [0.10, 0.32],
  'nousresearch/hermes-4-70b': [0.13, 0.40],
  'deepseek/deepseek-v4-flash': [0.09, 0.18],
  _default: [0.5, 1.5]
};
function costUsd(model, tin, tout) {
  const r = RATES[model] || RATES._default;
  return +(((tin / 1e6) * r[0]) + ((tout / 1e6) * r[1])).toFixed(4);
}
// Task 2.5.5 memory tools: whose citizen page the loop may read/write. Passed
// by cron-desk-run (the byline it resolved); persona runs fall back to the
// persona map's own POPID. Absent -> memory tools stay out of the toolset.
const BYLINE_POPID = PACKET_ONLY ? null : (arg('--byline-popid', null) || (() => {
  if (!PERSONA) return null;
  try { return (JSON.parse(fs.readFileSync(path.join(__dirname, 'persona-map.json'), 'utf8'))[PERSONA] || {}).popid || null; }
  catch (_) { return null; }
})());
const AGENT_DIR = path.join(ROOT, '.claude', 'agents', PERSONA || (DESK + '-desk'));
const SKILL_PATH = path.join(AGENT_DIR, PERSONA ? 'IDENTITY.md' : 'SKILL.md');
// Optional filename namespace. Roster fan-out uses the reporter slug so two
// same-desk writers cannot overwrite each other; isolated evaluations use
// their artifact tag for the same reason. Keep the model slug LAST so the
// independent Rhea gate can still infer the writer family from the filename.
function normalizeArtifactTag(value) {
  if (value == null || value === '') return null;
  const tag = String(value).trim();
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(tag)) {
    throw new Error('--artifact-tag must match [a-z0-9][a-z0-9-]{0,47}');
  }
  return tag;
}
const ARTIFACT_TAG = normalizeArtifactTag(arg('--artifact-tag', null));
// Output tag (2026-07-24, Mike-direct: samples must accumulate, not overwrite) —
// persona runs get their own filenames so a desk's roundup sample and a firebrand
// sample on the same cycle coexist for comparison. Reporter/evaluation tags sit
// before the model slug to preserve the gate's writer-family parser.
function buildOutputSlug(persona, artifactTag, modelSlug) {
  return (
    (persona ? persona + '_' : '') +
    (artifactTag ? artifactTag + '_' : '') +
    modelSlug
  );
}
const OUT_SLUG = buildOutputSlug(PERSONA, ARTIFACT_TAG, MODEL_SLUG);

const log = {
  info: (...a) => console.log('[INFO]', new Date().toISOString(), ...a),
  warn: (...a) => console.warn('[WARN]', new Date().toISOString(), ...a),
  error: (...a) => console.error('[ERROR]', new Date().toISOString(), ...a)
};

// ---------------------------------------------------------------------------
// Cycle detection (best-effort, from the desk workspace)
// ---------------------------------------------------------------------------
// engine.81 (S336): delegates to lib/getCurrentCycle — ONE cycle source
// (freshest world_summary primary, base_context divergence guard). noArgv:
// this cron parses its own flags.
const getCurrentCycle = require('../lib/getCurrentCycle');
function detectCycle() {
  const c = getCurrentCycle({ soft: true, noArgv: true });
  return c === null ? 'current' : String(c);
}

// ---------------------------------------------------------------------------
// Safety: keep a resolved path inside the repo (read tools) or inside the
// compare sandbox (write tool).
// ---------------------------------------------------------------------------
function resolveInRepo(p) {
  const abs = path.resolve(ROOT, p);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
    throw new Error('path escapes repo root: ' + p);
  }
  return abs;
}
function validGlob(pattern) {
  return /^[A-Za-z0-9_./*{}\- ]+$/.test(pattern);
}
function cap(s, n) {
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n) + '\n…[truncated ' + (s.length - n) + ' chars]' : s;
}

function loadEvaluationPriorArcRequirement(filePath) {
  const abs = resolveInRepo(filePath);
  const evaluationRoot = path.join(COMPARE_DIR, 'evaluations');
  if (!abs.startsWith(evaluationRoot + path.sep)) {
    throw new Error(
      '--brief-requirement-file must be inside output/cron-compare/evaluations/'
    );
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw new Error('brief requirement not found: ' + filePath);
  }
  const raw = fs.readFileSync(abs, 'utf8');
  if (raw.length > 5000) throw new Error('brief requirement exceeds 5000 characters');
  try {
    return normalizePriorArcRequirement(JSON.parse(raw));
  } catch (error) {
    throw new Error('invalid brief requirement: ' + error.message);
  }
}

function formatStrictSourceHygiene(nameCheck, packet) {
  const verified = Array.isArray(nameCheck && nameCheck.verified)
    ? nameCheck.verified
    : [];
  const unverified = Array.isArray(nameCheck && nameCheck.unverified)
    ? nameCheck.unverified
    : [];
  const loadBearing = packet && packet.manifest && packet.manifest.policy === 'load-bearing';
  return [
    '=== STRICT SOURCE HYGIENE — PACKET BOUNDARY ===',
    loadBearing
      ? 'The Packet is exhaustive for load-bearing canon claims. The persona profile still authorizes bounded narrative texture.'
      : 'This stricter rule overrides persona text that permits invented or anonymous sources.',
    loadBearing
      ? 'Use only supplied, ledger-verified citizens for named people and canon quote sources. A role-only anonymous voice may appear solely as authorized texture; it is not a verified citizen or source.'
      : 'Use only supplied, ledger-verified citizens as people or quote sources.',
    'Verified people available in the injected state: ' +
      (verified.length ? verified.join('; ') : '(none)'),
    'These candidates are not ledger-verified as people: ' +
      (unverified.length ? unverified.join('; ') : '(none)'),
    'Do not use an unverified candidate as a person or official. It may appear ' +
      'only as a place/organization when the lane explicitly identifies it as one.',
    loadBearing
      ? 'Packet people, quotes, and numbers stay Packet-backed. In-world rooms and named spots that are not real Oakland are allotted hallucination; new businesses go on INTAKE BIZ. AuthorizedTexture in the Packet is additional SET, not a cap. Anonymous role-only color is not an official source or canon proof.'
      : 'Do not invent anonymous people, Packet quotes, fake counts, or real-world Oakland places. In-world named spots that fit the data are allotted hallucination and go on INTAKE BIZ.',
    loadBearing
      ? 'Do not put Anonymous/Unnamed descriptors in INTAKE. A role-only texture quote must remain anonymous color and must not be attributed to a named citizen, official, institution, or canon source.'
      : 'Do not put Anonymous/Unnamed descriptors in the Names Index. If no supplied canon quote fits, use no quote rather than fabricating one.',
    '=== END STRICT SOURCE HYGIENE ===',
  ].join('\n');
}

function stripRepairChrome(text) {
  return String(text || '')
    .replace(/^\s*here['’]?s the corrected article[^\n]*\n+/i, '')
    .replace(/^\s*here is the corrected article[^\n]*\n+/i, '')
    .replace(/^\s*corrected article with all unapproved quotes removed[^\n]*\n+/i, '');
}

function stripModelMetadataTail(text) {
  const markers = [
    /^##\s+INTAKE\s*$/im,
    /^Names Index:/im,
    /^EVIDENCE:/im,
    /^ARTICLE TABLE ENTRIES:/im,
    /^CITIZEN USAGE LOG:/im,
    /^CONTINUITY NOTES:/im,
    /^FACTUAL ASSERTIONS:/im,
    /^<!--\s*SELF-SCORE:/im,
  ];
  let cut = String(text).length;
  for (const re of markers) {
    const m = re.exec(String(text));
    if (m && m.index < cut) cut = m.index;
  }
  return String(text).slice(0, cut).trimEnd();
}

function intakeSlug(packet) {
  const hood = packet && packet.signal && packet.signal.hood || 'city';
  const kind = packet && packet.signal && packet.signal.kind || 'story';
  return (hood + '-' + kind).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

// ADR-0017: prose is model-authored; canon metadata is not. For a typed Packet
// pilot, discard any model footer and render INTAKE from the supplied evidence
// plus names the Article actually printed. This is deterministic formatting,
// not editorial rewriting.
function renderPacketIntake(draftText, packet) {
  const body = stripModelMetadataTail(draftText);
  const lines = [body, '', '## INTAKE'];
  const people = new Map();
  for (const s of (packet && packet.exposure && packet.exposure.subjects) || []) {
    if (s && s.name) people.set(s.name, { role: 'subject', quote: null });
  }
  for (const s of (packet && packet.exposure && packet.exposure.sources) || []) {
    if (s && s.name) people.set(s.name, { role: 'quoted-source', quote: s.quote || null });
  }
  for (const e of (packet && packet.signal && packet.signal.nearby) || []) {
    const m = String(e && e.text || '').match(/^([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,3})\s*(?:\(|:)/);
    if (m && !people.has(m[1])) people.set(m[1], { role: 'mentioned', quote: null });
  }
  for (const [name, meta] of people) {
    if (!body.includes(name)) continue;
    const role = meta.quote && body.includes(String(meta.quote).slice(0, Math.min(48, meta.quote.length)))
      ? 'quoted-source' : meta.role === 'quoted-source' ? 'mentioned' : meta.role;
    lines.push('NAMES: ' + name + ' | ' + role);
  }
  const hood = packet && packet.signal && packet.signal.hood;
  const quoted = ((packet && packet.exposure && packet.exposure.sources) || [])
    .find(s => s && s.quote && s.name && body.includes(s.name));
  if (quoted) {
    const slug = (String(hood || 'city') + '-' + String(quoted.name) + '-' +
      String((packet.signal && packet.signal.kind) || 'arc'))
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
    lines.push('STORYLINE: ' + slug + ' | opened');
  }
  if (hood && body.includes(hood)) lines.push('HOOD: ' + hood);
  if (quoted) {
    lines.push('CLAIM: ' + String(quoted.quote).replace(/\|/g, '—').replace(/\s+/g, ' ').trim() +
      ' | citizenVoice PRESS ' + String(quoted.name).replace(/\|/g, '—'));
  } else {
    const facts = (packet && packet.known || []).filter(c => c && c.t === 'FACT' && c.text && c.src &&
      c.src !== 'cron-desk-run explicit cycle argument');
    if (facts.length) {
      const f = facts[0];
      lines.push('CLAIM: ' + String(f.text).replace(/\|/g, '—').replace(/\s+/g, ' ').trim() +
        ' | ' + String(f.src).replace(/\|/g, '—').replace(/\s+/g, ' ').trim());
    }
  }
  lines.push('<!-- SELF-SCORE: question-answered=no; affected-citizen-shown=' +
    (((packet && packet.exposure && packet.exposure.sources) || []).length ? 'yes' : 'no') +
    '; sim-state-cited=' + (quoted ? 'yes' : 'no') + ' -->');
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Tool implementations (read-only except write_file → sandboxed)
// ---------------------------------------------------------------------------
const savedFiles = [];

function toolReadFile(input) {
  const abs = resolveInRepo(input.path);
  return cap(fs.readFileSync(abs, 'utf8'), 12000);
}
function toolGlob(input) {
  const pattern = input.pattern || '';
  if (!validGlob(pattern)) throw new Error('glob pattern rejected (illegal chars): ' + pattern);
  const out = execFileSync('bash', ['-c', `cd ${JSON.stringify(ROOT)} && ls -d ${pattern} 2>/dev/null || true`], { encoding: 'utf8' });
  return cap(out.trim() || '(no matches)', 2500);
}
function toolGrep(input) {
  const pattern = input.pattern || '';
  const target = resolveInRepo(input.path || '.');
  try {
    const out = execFileSync('grep', ['-rn', '--max-count=40', '-e', pattern, target], { encoding: 'utf8' });
    return cap(out.trim() || '(no matches)', 3000);
  } catch (e) {
    return '(no matches)';  // grep exits 1 on no match
  }
}
function toolSearchWorld(input) {
  try { return cap(mags.searchDisk(input.query || '', 6), 5000); }
  catch (e) { return '(search failed: ' + e.message + ')'; }
}
function toolWriteFile(input) {
  // FORCE into the compare sandbox regardless of the path the model asks for
  // (its SKILL boot step 9 tells it to write output/desk-output/... — we redirect).
  const base = path.basename(input.path || (DESK + '_section.md'));
  const stamped = base.replace(/\.md$/, '') + '_' + OUT_SLUG + '.md';
  const dest = path.join(COMPARE_DIR, stamped);
  if (DRY_RUN) {
    log.info('[dry-run] would write ' + (input.content || '').length + ' chars → ' + path.relative(ROOT, dest));
  } else {
    fs.mkdirSync(COMPARE_DIR, { recursive: true });
    fs.writeFileSync(dest, input.content || '');
  }
  savedFiles.push(dest);
  return 'Saved to ' + path.relative(ROOT, dest) + ' (' + (input.content || '').length + ' chars). ' +
    'NOTE: this is the headless-test compare folder, not the live desk-output path.';
}

const TOOLS = [
  { name: 'read_file', description: 'Read a repo file (relative path). Returns its text.',
    input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'glob', description: 'List files matching a shell glob relative to repo root (e.g. "editions/*.txt", "archive/articles/c*_sports_*.txt").',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] } },
  { name: 'grep', description: 'Search file contents (regex) under a repo path. Returns file:line matches.',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' } }, required: ['pattern'] } },
  { name: 'search_world', description: 'Ranked search across the city records on disk (citizens, businesses, neighborhoods, editions, canon). Use for deep history.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'write_file', description: 'Write your finished section. Provide the full markdown. (Saved to the headless compare folder.)',
    input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } }
];

function runTool(tu) {
  const impl = {
    read_file: toolReadFile, glob: toolGlob, grep: toolGrep,
    search_world: toolSearchWorld, write_file: toolWriteFile
  }[tu.name];
  if (!impl) return '(unknown tool: ' + tu.name + ')';
  try { return impl(tu.input || {}); }
  catch (e) { return '(tool error: ' + e.message + ')'; }
}

// ---------------------------------------------------------------------------
// Model call (isolated so v2 can swap provider)
// ---------------------------------------------------------------------------
function callModel(client, system, messages) {
  return client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system, messages, tools: TOOLS },
    { timeout: CALL_TIMEOUT_MS, maxRetries: 2 });
}

// OpenRouter (OpenAI-compatible) raw POST — shared by the compose call and the
// Task 2.5.5 tool loop. Returns the parsed response body.
function callOpenRouterRaw(payloadObj) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(payloadObj);
    const req = https.request({
      hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://godworld.local',
        'X-Title': 'GodWorld headless desk-writer test'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) return reject(new Error('OpenRouter: ' + (j.error.message || JSON.stringify(j.error))));
          resolve(j);
        } catch (e) { reject(new Error('OpenRouter parse: ' + e.message + ' | ' + data.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

// ---------------------------------------------------------------------------
// Task 2.5.5 — reporter tool-loop on the OpenRouter path: the script guarantees
// the research FLOOR (injected state — no wake starts empty); this loop is how
// the reporter digs PAST it. OpenAI-format function calling (DeepSeek supports
// it): model requests, script executes, model reads, repeats — bounded, read-
// only. Every call is traced (pressure-test #5: the scoreboard needs to know
// whether the writer actually digs or ignores the tools).
// The `memory` tool pair reads/writes the reporter's OWN citizen page — the
// per-citizen Supermemory container every citizen already has (lib/citizenPage,
// tag cp-POP-XXXXX under citizen-pages). Reporters are citizens; their page IS
// their container. The one WRITE tool in the loop, own-page only by
// construction (pageTagFor throws on anything but the byline's POPID).
// ---------------------------------------------------------------------------
const OPENROUTER_TOOLS = [
  { type: 'function', function: { name: 'canon_search', description: 'Ranked keyword search across the city records on disk — published editions, citizens, businesses, world summaries, staged past work. Use for canon depth and prior coverage.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'keywords, e.g. "Fruitvale transit"' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'citizen_lookup', description: 'Exact citizen lookup in the simulation ledger by name. Returns the canonical profile (role, neighborhood, birth year) — these facts are immutable.', parameters: { type: 'object', properties: { name: { type: 'string', description: 'full name, e.g. "Lucia Polito"' } }, required: ['name'] } } },
  { type: 'function', function: { name: 'sheet_read', description: 'Read a bounded slice of one allowlisted live city sheet: Initiative_Tracker, Neighborhood_Map, Oakland_Sports_Feed, Civic_Office_Ledger.', parameters: { type: 'object', properties: { tab: { type: 'string' } }, required: ['tab'] } } }
];
const SHEET_READ_ALLOWLIST = ['Initiative_Tracker', 'Neighborhood_Map', 'Oakland_Sports_Feed', 'Civic_Office_Ledger'];
// memory tools appear in the loop only when the run knows whose page it is
// (--byline-popid from cron-desk-run, or the persona's own POPID).
const MEMORY_TOOLS = [
  { type: 'function', function: { name: 'memory_recall', description: 'Read your OWN reporter memory (your citizen page): your recent reflections and working notes from past wakes. Optional query narrows by topic.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'optional topic keywords' } }, required: [] } } },
  { type: 'function', function: { name: 'memory_note', description: 'Write ONE short working note to your OWN reporter memory (your citizen page) — a thread you want to pick up next wake, a source to revisit. Not the article.', parameters: { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] } } }
];

function toolCitizenLookup(input) {
  try {
    const { profilesFor } = require('./canon-name-check');
    const rows = profilesFor([String(input.name || '')]);
    return rows.length ? rows.join('\n') : 'No ledger citizen named "' + input.name + '". Do not use this name as a person.';
  } catch (e) { return '(citizen lookup failed: ' + e.message + ')'; }
}

async function toolSheetRead(input) {
  const tab = String(input.tab || '').trim();
  if (!SHEET_READ_ALLOWLIST.includes(tab)) return 'tab not allowed. Allowed: ' + SHEET_READ_ALLOWLIST.join(', ');
  try {
    const sheets = require('../lib/sheets');
    const data = await sheets.getRawSheetData(tab);
    return cap(data.slice(0, 40).map(r => r.join(' | ')).join('\n'), 6000);
  } catch (e) { return '(sheet read failed: ' + e.message + ')'; }
}

let memoryNoteSeq = 0;   // same-wake note keys must not collide (idempotence key component)
async function toolMemoryRecall(popId, input) {
  try {
    const { recentPage_, readPage_ } = require('../lib/citizenPage');
    const parts = [];
    const recent = await recentPage_(popId, 5);
    if (recent.results && recent.results.length) {
      parts.push('YOUR RECENT MEMORY (newest first):');
      for (const d of recent.results) parts.push('- ' + String(d.content || '').replace(/\s+/g, ' ').slice(0, 400));
    }
    if (input.query) {
      const hits = await readPage_(popId, input.query, 5);
      if (hits.results && hits.results.length) {
        parts.push('ON "' + input.query + '":');
        for (const d of hits.results) parts.push('- ' + String(d.content || d.chunk || '').replace(/\s+/g, ' ').slice(0, 400));
      }
    }
    return parts.length ? cap(parts.join('\n'), 6000) : 'Your page has no notes yet — this is your first recorded wake on this thread.';
  } catch (e) { return '(memory recall failed: ' + e.message + ')'; }
}
async function toolMemoryNote(popId, input, cycle) {
  try {
    const { appendReflection_ } = require('../lib/citizenPage');
    const r = await appendReflection_(popId, String(input.note || '').slice(0, 800),
      { cycle, daypart: 'deskwork', key: 'note' + (++memoryNoteSeq), extra: { kind: 'reporter-working-note', desk: DESK } });
    return r.error ? '(note failed: ' + r.error + ')' : 'noted to your page (' + r.tag + ')';
  } catch (e) { return '(note failed: ' + e.message + ')'; }
}

async function execOpenRouterTool(name, input, memCtx) {
  if (name === 'canon_search') return toolSearchWorld({ query: input.query });
  if (name === 'citizen_lookup') return toolCitizenLookup(input);
  if (name === 'sheet_read') return toolSheetRead(input);
  if (name === 'memory_recall' && memCtx) return toolMemoryRecall(memCtx.popId, input);
  if (name === 'memory_note' && memCtx) return toolMemoryNote(memCtx.popId, input, memCtx.cycle);
  return 'unknown tool ' + name;
}

// Bounded explore-then-compose loop. Returns { text, usageIn, usageOut, trace }.
// trace: [{tool, input, resultChars}] — read-only tools only, cap enforced.
function resolveMaxToolCalls(value) {
  return Number.isInteger(value) && value >= 0 ? value : 6;
}

async function openRouterToolLoop(opts) {
  const model = opts.model || MODEL;
  // Zero is a deliberate fail-closed budget for typed Packet runs. Do not use
  // truthiness here: `0 || 6` silently re-enables the live research tools.
  const maxCalls = resolveMaxToolCalls(opts.maxToolCalls);
  // memCtx {popId, cycle}: enables the reporter's own-page memory tool pair.
  const toolset = opts.memCtx ? OPENROUTER_TOOLS.concat(MEMORY_TOOLS) : OPENROUTER_TOOLS;
  const messages = [{ role: 'system', content: opts.system }, { role: 'user', content: opts.user }];
  const trace = [];
  let usageIn = 0, usageOut = 0, calls = 0;
  for (let turn = 0; turn < maxCalls + 2; turn++) {
    const toolsOn = calls < maxCalls;
    const j = await callOpenRouterRaw({
      model, max_tokens: opts.maxTokens || MAX_TOKENS, messages,
      ...(toolsOn ? { tools: toolset } : {})
    });
    const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
    const u = j.usage || {};
    usageIn += u.prompt_tokens || 0; usageOut += u.completion_tokens || 0;
    if (toolsOn && Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        let input = {};
        try { input = JSON.parse(tc.function.arguments || '{}'); } catch (_) {}
        const result = calls < maxCalls
          ? String(await execOpenRouterTool(tc.function.name, input, opts.memCtx))
          : 'tool budget exhausted — compose from what you have.';
        calls++;
        trace.push({ tool: tc.function.name, input, resultChars: result.length });
        messages.push({ role: 'tool', tool_call_id: tc.id, content: cap(result, 8000) });
      }
      continue;
    }
    return { text: msg.content || '', usageIn, usageOut, trace };
  }
  return { text: '', usageIn, usageOut, trace };
}

// OpenRouter compose call (kept for the scorer + fact-selection callers).
function callOpenRouter(system, userContent) {
  return callOpenRouterRaw({
    model: MODEL, max_tokens: MAX_TOKENS,
    messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }]
  }).then(j => {
    const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    const u = j.usage || {};
    return { text, usageIn: u.prompt_tokens || 0, usageOut: u.completion_tokens || 0 };
  });
}


// Per-run scorecard scoring pass (Feedback1.txt, S325). A lightweight self-score
// (voice / facts / hallucinations / word-count) — NOT the authoritative canon
// gate (that's the separate headless-Rhea step). Uses the run's own provider.
async function scoreDraft(draftText, worldState) {
  const sys = 'You are a strict newsroom copy-desk scorer. Return ONLY JSON, no prose.';
  const user = 'World state (ground truth for this cycle):\n\n' + String(worldState).slice(0, 30000) +
    '\n\n---\n\nDraft to score:\n\n' + String(draftText).slice(0, 30000) +
    '\n\nReturn strict JSON only:\n' +
    '{"reporterVoice":true|false,"factsCorrect":true|false,' +
    '"hallucinations":[{"claim":"...","why":"..."}],"wordCount":<int>,"notes":"<short>"}\n' +
    'reporterVoice = stayed in a distinct reporter voice. factsCorrect = every stated fact traces to the world ' +
    'state above. hallucinations = names/numbers/events NOT present in the world state, plus ENGINE-metric leaks ' +
    '("tension score", "civic load", raw dial values, system language). Do NOT flag legitimate sports-game stats ' +
    '(OVR/overall ratings, avg/HR/RBI, records) — those are canon. Be strict.';
  let usageIn = 0, usageOut = 0, raw = '';
  if (PROVIDER === 'openrouter') {
    const r = await callOpenRouter(sys, user);
    raw = r.text; usageIn = r.usageIn; usageOut = r.usageOut;
  } else {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({ model: MODEL, max_tokens: 1500, system: sys, messages: [{ role: 'user', content: user }] },
      { timeout: CALL_TIMEOUT_MS, maxRetries: 2 });
    raw = (resp.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    if (resp.usage) { usageIn = resp.usage.input_tokens || 0; usageOut = resp.usage.output_tokens || 0; }
  }
  let json;
  try { const m = raw.match(/\{[\s\S]*\}/); json = JSON.parse(m ? m[0] : raw); }
  catch (_) { json = { parseError: true, raw: raw.slice(0, 400) }; }
  return { json, usageIn, usageOut };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const startTime = Date.now();
  console.log('Headless Desk Writer — ' + DESK + ' desk');
  console.log('===================================');
  console.log('model=' + MODEL + ' maxTurns=' + MAX_TURNS + (DRY_RUN ? ' (DRY RUN)' : ''));

  if (!fs.existsSync(SKILL_PATH)) throw new Error('no SKILL.md for desk "' + DESK + '" at ' + SKILL_PATH);
  if (BRIEF_REQUIREMENT_FILE && (!ARTIFACT_TAG || !STATE_FILE)) {
    throw new Error(
      '--brief-requirement-file requires --artifact-tag and --state-file'
    );
  }
  if (STRICT_SOURCE_HYGIENE && (!ARTIFACT_TAG || !STATE_FILE)) {
    throw new Error(
      '--strict-source-hygiene requires --artifact-tag and --state-file'
    );
  }
  const priorArcRequirement = BRIEF_REQUIREMENT_FILE
    ? loadEvaluationPriorArcRequirement(BRIEF_REQUIREMENT_FILE)
    : null;
  const priorArcBrief = priorArcRequirement
    ? formatWriterRequirement(priorArcRequirement)
    : '';
  const priorArcSystem = priorArcBrief
    ? priorArcBrief + '\n\n'
    : '';
  const priorArcKickoff = priorArcBrief
    ? priorArcBrief + '\n\n'
    : '';
  const priorArcFinal = priorArcBrief
    ? ' Before output, enforce the mandatory Brief: use its prior-published fact ' +
      'in the Article body and add the exact PRIOR_PUBLISHED Evidence entry.'
    : '';
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (PROVIDER === 'openrouter') {
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');
  } else if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const cycle = detectCycle();
  // Firebrand lane (S332): a persona loads the reporter's adversarial STANCE
  // (IDENTITY+LENS+RULES) — the teeth — instead of the desk's roundup skill.
  const skill = PERSONA
    ? ['IDENTITY.md', 'LENS.md', 'RULES.md'].map(f => { try { return fs.readFileSync(path.join(AGENT_DIR, f), 'utf8'); } catch (_) { return ''; } }).filter(Boolean).join('\n\n---\n\n')
    : fs.readFileSync(SKILL_PATH, 'utf8');

  // Feed the FULL current world summary (not loadWorldState's ~800-char orientation
  // head — that's built for the reflection cron, which searches for depth). A desk
  // reporter needs the actual cycle EVENTS, which sit deep in the summary. The first
  // c101 run confabulated a whole fake bullpen crisis because the real sports events
  // (~line 112) were never in its context (S325). Freshest-wins, direct-inject.
  let worldState;
  if (STATE_FILE) {
    // Layer-3 lane injection. FAIL LOUD if unreadable — a missing state-file must
    // NOT silently fall back to the 40k blob (that would mask a broken chain and
    // "prove" a dead lane; S332 advisor trap).
    worldState = fs.readFileSync(resolveInRepo(STATE_FILE), 'utf8');
    log.info('lane state-file injected: ' + STATE_FILE + ' (' + worldState.length + ' chars) — full-summary blob bypassed');
  } else {
    try {
      worldState = '## Oakland — current world state (cycle ' + cycle + ')\n\n' +
        cap(fs.readFileSync(path.join(ROOT, 'output', 'world_summary_c' + cycle + '.md'), 'utf8'), 40000);
    } catch (_) {
      worldState = mags.loadWorldState();
    }
  }
  let packetState = null;
  if (PACKET_ONLY) {
    try { packetState = JSON.parse(worldState); } catch (_) { /* fail-loud normalization below */ }
  }
  const strictSourceBlock = STRICT_SOURCE_HYGIENE
    ? formatStrictSourceHygiene(checkCanonNames(worldState), packetState)
    : '';
  const strictSourceKickoff = strictSourceBlock
    ? strictSourceBlock + '\n\n'
    : '';
  const strictSourceFinal = strictSourceBlock
    ? ' Enforce strict source hygiene: Packet people, quotes, and numbers stay Packet-backed. ' +
      'Invent no real-world Oakland place (Frank Ogawa, real landmark bars). BART is a train in this city. ' +
      'In-world rooms and named spots that fit the data are allotted hallucination — paint them, put new businesses on INTAKE BIZ so they mint. ' +
      'Invent no anonymous source, fake count, or fake Packet quote.'
    : '';

  // Phase 2: when a lane state-file is injected, the reporter works from its OWN
  // beat's signal (pointers + real quotes), not the full-summary firehose — and
  // must NOT be told to read the whole world_summary (that reintroduces the blob
  // the lane replaces). Pointers still let it read referenced files for depth.
  const depthInstr = STATE_FILE
    ? 'Your desk\'s LANE signal for this cycle is in the first message — the storylines in YOUR beat, with ' +
      'pointers to the raw material and real citizen quotes to use. Work from your lane; you MAY read the ' +
      'referenced files for depth, but do not pull in other desks\' material or invent events your lane does not name.'
    : 'The current cycle and its world state are in the first message; read output/world_summary_c' + cycle +
      '.md in full and use search_world for depth.';

  const firebrandHeat = PERSONA === 'freelance-firebrand'
    ? '\n\nFIREBRAND HEAT (hard): You are Jax Caldera — accountability of bullshit, not a tidy desk. ' +
      'Write SHORT and HOT (target 400–650 words). First-person. Open in a SPECIFIC in-world place and time (your bar, a laundromat, a BART stop) — not Frank Ogawa. If you name a new spot, it is now in this city: put it on INTAKE BIZ. ' +
      'Lead with the contradiction or the unowned crisis — not the official timeline. Do the raw count in prose (not a bullet inventory). ' +
      'Translate officialese into what it actually means. Name who owes an answer. End on ONE unanswered question, then ' +
      '`-- Jax Caldera | tipline: JAX-TIPS`. ' +
      'FORBIDDEN: process roundup voice, "stakeholders," "community leaders," "moving forward," engine/system jargon, ' +
      'bullet-led number dumps, sanding a metric fight into a calm initiative status piece. ' +
      'If two signals fight (decay vs recovery, money vs placements, illness with no lead), that FIGHT is the story. ' +
      'Heat without inventing citizens or criminal claims — question or attributed allegation only.\n'
    : PERSONA === 'p-slayer'
    ? '\n\nP SLAYER HEAT (hard): You are P Slayer — die-hard fan columnist, not the press box and not multi-voice sports-desk. ' +
      'First-person I/we only. Target 400–700 words. Open with gut or Oakland sensory (bar, lot, bleacher, BART). ' +
      'Most columns carry CHARGE — fury, dread, euphoria, defiance — boring if mostly content. ' +
      'Friction pivot required: name the counter-argument, kill it. Metrics are foils/weapons, not Anthony analysis. ' +
      'Signature arc: hate the move → live with it → "I was wrong" or double down. Hook your wall if a prior take is in play. ' +
      'FORBIDDEN: FO press-release voice, third-person "fans expressed," measured both-sides without a pick, Hal archive essay, Anthony contract architecture.\n' +
      loadPSlayerChargeBag()
    : PERSONA === 'anthony-raines'
    ? '\n\nANTHONY STANCE (hard): You are Anthony Raines — analytic beat, not the bleachers and not multi-voice sports-desk. ' +
      'Third-person only. One evaluative claim built on verifiable numbers. ' +
      'Open with a roster fact or quiet press-box/clubhouse beat. Spell weighty numbers in prose. ' +
      'Evaluate fit and process — polite bluntness, never volume. Target ~500–900 words one argument. ' +
      'FORBIDDEN: fan "we," hot-take all-caps, FO PR without math, Hal elegy as spine, inventing x-stats/barrel%/launch angle or contracts not on the record.\n' +
      loadAnthonyAnalysisBag()
    : PERSONA === 'hal-richmond'
    ? '\n\nHAL STANCE (hard): You are Hal Richmond — senior historian, not the fan column and not multi-voice sports-desk. ' +
      'First-person reflective. Literary. Present fact first (packet-true), then era echo. Spell years in words. ' +
      'Numbers are poetry of time, not scouting grades. End on continuity or its loss. Daily wake may be shorter but never wire copy. ' +
      'FORBIDDEN: bleacher rage, pure transaction card, multi-story desk section, invented current stats or seasons, real-world Oakland geography. Historical baseball echo (franchise figures, era comps, a legend against a Packet-present line) is the job — the Packet will not contain 1973.\n' +
      loadHalArchiveBag()
    : PERSONA === 'carmen-delaine'
    ? '\n\nCARMEN STANCE (hard): You are Carmen Delaine — civic ledger, not multi-voice civic-desk. ' +
      'Third-person. Precise. Accretion. Follow the money and the clock, not the press release. ' +
      'Vote coverage lists all 9 seats. One claim spine ~500–900 words. ' +
      'FORBIDDEN: vague "residents expressed," engine metrics, invented vote math, multi-reporter section.\n' +
      loadCarmenAccretionBag()
    : PERSONA === 'luis-navarro'
    ? '\n\nLUIS STANCE (hard): You are Luis Navarro — investigations, not multi-voice civic-desk and not Jax theater. ' +
      'First-person investigator OK. Short punchy paragraphs. Here\'s what we know / don\'t. Count the silence. ' +
      'Document contradictions; decline-to-comment is a fact. Fair pressure, not theatrical heat. ' +
      'FORBIDDEN: speculation without evidence, crime invention, multi-reporter section.\n' +
      loadLuisInvestigationBag()
    : PERSONA === 'trevor-shimizu'
    ? '\n\nTREVOR STANCE (hard): You are Trevor Shimizu — transit/infrastructure systems, not multi-voice civic-desk. ' +
      'Third-person. Timestamp + place + failure, then pattern. Dry, technical, quietly devastating. ' +
      'Connect systems without inventing outages or engine load scores. ' +
      'FORBIDDEN: chamber politics as spine, crime blotter, multi-reporter section.\n' +
      loadTrevorSystemsBag()
    : PERSONA === 'rachel-torres'
    ? '\n\nTORRES STANCE (hard): You are Sgt. Rachel Torres — public safety, not multi-voice civic-desk. ' +
      'Third-person. Procedural + human. Incident structure (location/outcome). Classification gaps matter. ' +
      'Officer names only from packet. Measured, never sensational. Stay in safety lane. ' +
      'FORBIDDEN: council politics spine, inventing officers, multi-reporter section.\n' +
      loadTorresSafetyBag()
    : PERSONA === 'lila-mezran'
    ? '\n\nMEZRAN STANCE (hard): You are Dr. Lila Mezran — health desk, not multi-voice civic-desk. ' +
      'Third-person. Clinical calm + human cost. Case counts exact from packet. Do not diagnose causes. ' +
      '"Interesting is doctor-speak for concerning." Practical guidance when on record. ' +
      'FORBIDDEN: alarmism, inventing patients/counts, crime sensationalism as spine, multi-reporter section.\n' +
      loadMezranHealthBag()
    : PERSONA === 'maria-keen'
    ? '\n\nMARIA STANCE (hard): You are Maria Keen — culture ground, not multi-voice culture-desk. ' +
      'First-person witness. One block, one moment, one truth. Sensory, intimate. Packet-named neighbors only. ' +
      'FORBIDDEN: generic "community feels," multi-reporter section.\n' +
      loadMariaGroundBag()
    : PERSONA === 'elliot-graye'
    ? '\n\nGRAYE STANCE (hard): You are Elliot Graye — faith/quiet work, not multi-voice culture-desk. ' +
      'Third-person. Dignity. Quiet institutions. No invented clergy. ' +
      'FORBIDDEN: doctrine wars, multi-reporter section.\n' +
      loadGrayeFaithBag()
    : PERSONA === 'kai-marston'
    ? '\n\nKAI STANCE (hard): You are Kai Marston — arts, not multi-voice culture-desk. ' +
      'Present-tense scene. Art as neighborhood act. Packet venues/artists only. ' +
      'FORBIDDEN: gallery PR fluff, multi-reporter section.\n' +
      loadKaiArtsBag()
    : PERSONA === 'mason-ortega'
    ? '\n\nMASON STANCE (hard): You are Mason Ortega — kitchen/hospitality, not multi-voice culture-desk. ' +
      'Workplaces first. Line cooks when named in packet. ' +
      'FORBIDDEN: pure foodie review without labor, multi-reporter section.\n' +
      loadMasonKitchenBag()
    : PERSONA === 'angela-reyes'
    ? '\n\nANGELA STANCE (hard): You are Angela Reyes — education, not multi-voice culture-desk. ' +
      'Warm, brief. Stability is the story. No invented test scores. ' +
      'FORBIDDEN: multi-reporter section.\n' +
      loadAngelaEducationBag()
    : PERSONA === 'noah-tan'
    ? '\n\nNOAH STANCE (hard): You are Noah Tan — weather/environment, not multi-voice culture-desk. ' +
      'Science-first. Translate to ground meaning. No invented metrics. ' +
      'FORBIDDEN: weather porn drama, multi-reporter section.\n' +
      loadNoahEnvironmentBag()
    : PERSONA === 'tanya-cruz'
    ? '\n\nTANYA STANCE (hard): You are Tanya Cruz — sideline dispatch, not multi-voice sports-desk. ' +
      'You file from the clubhouse — that SET is yours; the Packet will never list a clubhouse event. Paint what the supplied line predicts. Packet player quotes and numbers only. New in-world spots go on INTAKE BIZ. Short. ' +
      'FORBIDDEN: real-world stadiums/Ogawa, invented player quotes, invented stats, injury invention, P Slayer heat essay, or multi-reporter section.\n' +
      loadTanyaSidelineBag()
    : PERSONA === 'simon-leary'
    ? '\n\nSIMON STANCE (hard): You are Simon Leary — long view, not multi-voice sports-desk. ' +
      'Third-person essayist. Sports as civic architecture. Quiet continuity. ' +
      'FORBIDDEN: bleacher rage, pure box-score, multi-reporter section.\n' +
      loadSimonLongviewBag()
    : PERSONA === 'elliot-marbury'
    ? '\n\nMARBURY STANCE (hard): You are Elliot Marbury — data desk deep analysis, not multi-voice sports-desk support footnote. ' +
      'Third-person. Audit-grade. As_Roster + TrueSource only. Show AB/IP floors. Derived rates only from filled cells. ' +
      'One falsifiable claim. Name blank cells. Target memo-grade depth that can stage toward canon. ' +
      'FORBIDDEN: invented x-stats, fan heat, Hal elegy, hiding missing data.\n' +
      loadMarburyDataBag()
    : PERSONA === 'ariana-reyes'
    ? '\n\nARIANA STANCE (hard): You are Ariana Reyes — sports analytics deep analysis, sports-lane native. ' +
      'Third-person. Audit-grade. As_Roster + TrueSource + feed. Sample floors. Peer band when relevant. ' +
      'Memo-grade claims for canon path. Name blanks. ' +
      'FORBIDDEN: invented x-stats, fan heat, multi-reporter section.\n' +
      loadArianaAnalyticsBag()
    : PERSONA === 'sharon-okafor'
    ? '\n\nSHARON STANCE (hard): You are Sharon Okafor — lifestyle, not multi-voice culture-desk. ' +
      'First-person observer. Behavior patterns. Venue ground. Packet people only. Warm analytical. ' +
      'FORBIDDEN: raw engine nightlife metrics, inventing patrons, multi-reporter section.\n' +
      loadSharonLifestyleBag()
    : PERSONA === 'dj-hartley'
    ? '\n\nHARTLEY STANCE (hard): You are DJ Hartley — senior photographer, visual record. ' +
      'Not prose articles. Produce visual assignment / prompt work tied to lane storylines. ' +
      'One frame one moment. Canon institutions only. ' +
      'FORBIDDEN: inventing buildings, writing news copy as if a reporter, multi-story desk section.\n' +
      loadHartleyVisualBag()
    : '';

  // engine.102 W5 (Task 9 cron half): the WP city dial is a model face, not census.
  // Static scoped ban until cascade support lands and someone flips this rule off.
  const cascadeRateRule =
    '\n\nCASCADE RATE RULE (hard, engine.102 W5): never lead with a bare citywide illness/employment/crisis ' +
    'rate as if it were census fact — the citywide dial is a model face, not ground support. Rate figures ' +
    'appear only attributed to the layer that supports them (ledger counts, hospital census, neighborhood ' +
    'demographics). Migration flows may run with the label "city model estimate".\n';

  const system =
    'You are this journalist, alive in GodWorld this cycle — not a systems analyst, not a briefing desk, ' +
    'not a reciter of the world summary. Sheets and the edition header already hold the weather and the ' +
    'tracker. NotebookLM will summarize you later. Your job is street grain: a named regular, a named ' +
    'counter, dirt at a Packet-named place that is this place\'s dirt. Only Packet and ledger names. ' +
    'Your SKILL is voice. Read IDENTITY/LENS/RULES.\n\n' +
    'CURRENT-CYCLE OVERRIDE: the edition pipeline is paused, so your desk workspace ' +
    '(output/desks/' + DESK + '/current/) is STALE — do NOT take cycle facts from it. ' + depthInstr +
    ' When your section is finished, call write_file with the full markdown. Do not ' +
    'stop until you have written the section.\n' +
    firebrandHeat +
    priorArcSystem +
    cascadeRateRule +
    '=== YOUR SKILL (.claude/agents/' + (PERSONA || (DESK + '-desk')) + ') ===\n\n' + skill +
    (strictSourceBlock ? '\n\n' + strictSourceBlock : '') +
    (PACKET_ONLY
      ? '\n\n=== TYPED PACKET OUTPUT CONTRACT ===\n' +
        'Use the SKILL for voice only. Ignore its legacy section/footer format. Output ONE Article, then the exact Packet output.intake grammar, then the exact Packet output.footer. ' +
        'Never output Names Index, EVIDENCE, ARTICLE TABLE ENTRIES, CITIZEN USAGE LOG, CONTINUITY NOTES, or FACTUAL ASSERTIONS. ' +
        'When packet.manifest.policy is load-bearing, create only the street texture explicitly authorized by packet.manifest.authorizedTexture and packet.manifest.textureConditions. Texture creates lived experience; it never enlarges the canon facts. ' +
        'Repeat one NAMES/BIZ/HOOD/CLAIM record per line; omit empty record types; never combine records with commas.\n' +
        '=== END TYPED PACKET OUTPUT CONTRACT ==='
      : '');

  const kickoff = STATE_FILE
    ? 'Current cycle: ' + cycle + '. Write the ' + DESK + ' section for THIS cycle from YOUR LANE below — ' +
      'build only from the storylines it names and the citizen quotes it supplies; find your own angle. Do not ' +
      'invent events, players, or officials the lane does not name. Use your reporters\' voices per your SKILL. ' +
      (PERSONA === 'freelance-firebrand'
        ? 'You are Jax — write ONE column of heat into the stink, not a multi-story desk section. '
        : PERSONA === 'p-slayer'
        ? 'You are P Slayer — write ONE fan-heat column, not a multi-story desk section. '
        : PERSONA === 'anthony-raines'
        ? 'You are Anthony Raines — write ONE analytic beat piece, not a multi-story desk section. '
        : PERSONA === 'hal-richmond'
        ? 'You are Hal Richmond — write ONE legacy/reflection piece, not a multi-story desk section. '
        : PERSONA === 'carmen-delaine'
        ? 'You are Carmen Delaine — write ONE civic ledger piece, not a multi-story desk section. '
        : PERSONA === 'luis-navarro'
        ? 'You are Luis Navarro — write ONE investigation piece, not a multi-story desk section. '
        : PERSONA === 'trevor-shimizu'
        ? 'You are Trevor Shimizu — write ONE systems/infrastructure piece, not a multi-story desk section. '
        : PERSONA === 'rachel-torres'
        ? 'You are Sgt. Rachel Torres — write ONE public-safety piece, not a multi-story desk section. '
        : PERSONA === 'lila-mezran'
        ? 'You are Dr. Lila Mezran — write ONE health piece, not a multi-story desk section. '
        : PERSONA === 'maria-keen'
        ? 'You are Maria Keen — write ONE ground/culture piece, not a multi-story desk section. '
        : PERSONA === 'elliot-graye'
        ? 'You are Elliot Graye — write ONE faith/quiet-work piece, not a multi-story desk section. '
        : PERSONA === 'kai-marston'
        ? 'You are Kai Marston — write ONE arts piece, not a multi-story desk section. '
        : PERSONA === 'mason-ortega'
        ? 'You are Mason Ortega — write ONE kitchen/hospitality piece, not a multi-story desk section. '
        : PERSONA === 'angela-reyes'
        ? 'You are Angela Reyes — write ONE education piece, not a multi-story desk section. '
        : PERSONA === 'noah-tan'
        ? 'You are Noah Tan — write ONE environment piece, not a multi-story desk section. '
        : PERSONA === 'tanya-cruz'
        ? 'You are Tanya Cruz — write ONE sideline dispatch, not a multi-story desk section. '
        : PERSONA === 'simon-leary'
        ? 'You are Simon Leary — write ONE long-view piece, not a multi-story desk section. '
        : PERSONA === 'elliot-marbury'
        ? 'You are Elliot Marbury — write ONE deep analysis memo, not a multi-story desk section. '
        : PERSONA === 'ariana-reyes'
        ? 'You are Ariana Reyes — write ONE sports analytics memo, not a multi-story desk section. '
        : PERSONA === 'sharon-okafor'
        ? 'You are Sharon Okafor — write ONE lifestyle piece, not a multi-story desk section. '
        : PERSONA === 'dj-hartley'
        ? 'You are DJ Hartley — produce ONE visual assignment/prompt set, not a prose desk section. '
        : '') +
      'Ignore the stale desk workspace. Research EFFICIENTLY via the pointers — do not re-search the same source.\n\n' +
      priorArcKickoff +
      strictSourceKickoff +
      worldState
    : 'Current cycle: ' + cycle + '. Write the ' + DESK + ' section for THIS cycle. The current world state is ' +
      'below — build your section from the EVENTS in it (do not invent events, players, or officials the state ' +
      'does not name). Read your IDENTITY/LENS/RULES + canon files for voice and rules, and use search_world for ' +
      'depth on names/history that appear in the state. Ignore the stale desk workspace. Research EFFICIENTLY — you ' +
      'have a limited number of research turns before you must write, so do not re-search the same source.\n\n' +
      worldState;

  let usageIn = 0, usageOut = 0, turns = 0;

  if (PROVIDER === 'openrouter') {
    // Task 2.5.5 — explore-then-compose with the bounded read-only tool loop.
    // The injected state is the guaranteed FLOOR; the tools are how the
    // reporter digs past it (canon_search / citizen_lookup / sheet_read,
    // max 6 calls, every call traced). Supersedes the Thread-B compose-only
    // design — the comparison era is over, this is the production wake.
    log.info((PACKET_ONLY ? 'packet-only compose' : 'tool-loop write') + ' via OpenRouter (' + MODEL +
      (PACKET_ONLY ? ', 0 live tools' : ', max 6 calls') + ')...');
    const composeUser = kickoff +
      '\n\nWRITE the full ' + DESK + ' section for cycle ' + cycle + ' — the complete, publish-ready ' +
      'markdown, built ONLY from the events/names/records in the world state above plus what your tools ' +
      'return. ' + (PACKET_ONLY
        ? 'You are this journalist in GodWorld this cycle. The Packet facts are the physics — what the engine did. The Article is someone living under that physics. Open on a named interviewed person or a Packet-named place, in a body, doing something. Use every approved quote as spoken speech in a scene, not as a caption under a recap. Never announce the season or the temperature; if it is winter, show a Packet-backed thing that moved on a day like this. Never lead with a tracker phase, a feed label, a bullet list of approved facts, or the words supplied record / listed as / what remains to be learned. Do not import real-world Oakland winter tropes the Packet did not name. Do not invent names, numbers, quotes, or events. Texture may only dress Packet-named places and approved speakers. If you cannot write the life, stop. End with ## INTAKE using one record per line, then the exact SELF-SCORE comment. '
        : 'Use your tools FIRST where the state runs thin — verify a citizen before characterizing them, search prior coverage for depth — then compose. ') +
      priorArcFinal + strictSourceFinal + ' Output ONLY the section.';
    const r = await openRouterToolLoop({ model: MODEL, system, user: composeUser,
      maxToolCalls: PACKET_ONLY ? 0 : 6,
      memCtx: BYLINE_POPID ? { popId: BYLINE_POPID, cycle } : null });
    usageIn += r.usageIn; usageOut += r.usageOut; turns = 1 + r.trace.length;
    try {
      const traceName = (ARTIFACT_TAG ? DESK + '_c' + cycle + '_' + ARTIFACT_TAG : DESK + '_c' + cycle) + '.tooltrace.json';
      fs.writeFileSync(path.join(COMPARE_DIR, traceName), JSON.stringify({ model: MODEL, calls: r.trace, ranAt: new Date().toISOString() }, null, 2));
      log.info('tool trace: ' + r.trace.length + ' call(s) → ' + traceName);
    } catch (e) { log.warn('tool trace write failed: ' + e.message); }
    // DeepSeek habitually wraps the whole article in a ``` fence despite "Output
    // ONLY the section" — a deterministic gate flag (structural, HIGH) that sank
    // ~8 c102 drafts. Unwrap a single whole-draft fence; inner fences untouched.
    const unwrapped = (() => {
      const m = r.text.trim().match(/^```[a-z]*\s*\n([\s\S]*?)\n```\s*$/i);
      return m ? m[1] : r.text;
    })();
    if (unwrapped.trim()) toolWriteFile({ path: DESK + '_c' + cycle + '.md', content: unwrapped });
    else log.warn('OpenRouter returned empty.');
  } else {
    // ANTHROPIC two-phase (Claude Code parity): bounded explore → forced compose.
    const client = new Anthropic({ apiKey });
    const messages = [{ role: 'user', content: kickoff }];
    const findings = [];
    const EXPLORE_TURNS = Math.min(MAX_TURNS, 7);   // bounded research, then forced compose

    // PHASE 1 — EXPLORE (tools on, bounded). Mirrors discord-reflection.js: agency
    // to look around, but capped so it can't rabbit-hole (a single agentic loop
    // burned 617k tokens re-grepping player-index.json and never wrote — S325).
    for (turns = 1; turns <= EXPLORE_TURNS; turns++) {
      const resp = await callModel(client, system, messages);
      if (resp.usage) { usageIn += resp.usage.input_tokens || 0; usageOut += resp.usage.output_tokens || 0; }
      const toolUses = (resp.content || []).filter(b => b.type === 'tool_use');
      if (resp.stop_reason === 'tool_use' && toolUses.length) {
        messages.push({ role: 'assistant', content: resp.content });
        messages.push({ role: 'user', content: toolUses.map(tu => {
          const result = runTool(tu);
          log.info('explore turn ' + turns + ' · ' + tu.name + '(' + JSON.stringify(tu.input).slice(0, 100) + ')');
          findings.push('— ' + tu.name + ' ' + JSON.stringify(tu.input).slice(0, 80) + ' —\n' + cap(result, 2000));
          return { type: 'tool_result', tool_use_id: tu.id, content: result };
        }) });
        continue;
      }
      break;  // model stopped researching on its own
    }

    // PHASE 2 — COMPOSE (no tools) — GUARANTEES a section, composed from a capped
    // findings digest rather than the full accumulated history (the cost cap).
    log.info('compose after ' + findings.length + ' research call(s)...');
    const digest = findings.join('\n\n').slice(0, 12000) || '(little gathered — write from world state + your knowledge)';
    const fin = await client.messages.create({
      model: MODEL, max_tokens: MAX_TOKENS, system,
      messages: [{ role: 'user', content: kickoff +
        '\n\n## What you gathered while researching\n\n' + digest +
        '\n\nNow WRITE the full ' + DESK + ' section for cycle ' + cycle + ' as your reply — the complete, ' +
        'publish-ready markdown.' + priorArcFinal + strictSourceFinal +
        ' Output ONLY the section.' }]
    }, { timeout: CALL_TIMEOUT_MS, maxRetries: 2 });
    if (fin.usage) { usageIn += fin.usage.input_tokens || 0; usageOut += fin.usage.output_tokens || 0; }
    const finalText = (fin.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (finalText.trim()) toolWriteFile({ path: DESK + '_c' + cycle + '.md', content: finalText });
  }

  const wrote = savedFiles.length > 0;
  if (!wrote) log.warn('no section produced — compose returned empty.');
  if (PACKET_ONLY && wrote) {
    let packet;
    try { packet = JSON.parse(worldState); }
    catch (e) { throw new Error('typed Packet state is not JSON: ' + e.message); }
    let normalized = renderPacketIntake(fs.readFileSync(savedFiles[0], 'utf8'), packet);
    fs.writeFileSync(savedFiles[0], normalized);
    const parsed = require('../lib/articleIntake').parse(normalized);
    if (!parsed.found || parsed.errors.length) {
      throw new Error('typed Packet output contract failed: ' +
        (parsed.errors.length ? parsed.errors.map(e => e.code + ': ' + e.message).join('; ') : 'missing INTAKE'));
    }
    if (packet.v === 'LEP/2') {
      const lep = require('./livedExperiencePacketV2');
      let audit = lep.auditArticle(normalized, packet);
      if (!audit.ok) {
        // One corrective pass before failing the desk for the day. The model
        // gets the exact violations plus the approved record and rewrites its
        // own draft; the re-audit below stays fail-closed. Sunk 3 straight
        // fan-out days (08-13..08-17) before this existed.
        const errText = audit.errors.map(e => e.code + ': ' + e.values.map(v => '"' + v + '"').join(' | ')).join('\n');
        const approvedList = packet.manifest.approvedQuotes.length
          ? packet.manifest.approvedQuotes.map(q => '- ' + q.speakerName + ': ' + q.text).join('\n')
          : '(none — this article must contain NO quoted speech at all)';
        log.warn('LEP/2 audit failed (' + audit.manifestId + ') — one repair pass: ' + errText.replace(/\n/g, '; '));
        const repairUser = 'Your article draft below failed the canon audit. Violations:\n\n' + errText +
          '\n\nApproved quotes (the ONLY quotable speech, word-for-word — you may split one quote across ' +
          'attribution, but never change, trim, or add a word inside quote marks):\n' + approvedList +
          '\n\nApproved numbers are only those already present in the approved facts/quotes. ' +
          'Rewrite the article minimally: keep the scene, voice, and structure; replace every violating quoted ' +
          'span with an approved quote verbatim or remove the quote marks/speech entirely; drop unapproved ' +
          'numbers. Keep the ## INTAKE block and SELF-SCORE comment. Output ONLY the corrected article.\n\n' +
          '=== YOUR DRAFT ===\n\n' + normalized;
        let repairText;
        if (PROVIDER === 'openrouter') {
          const rr = await callOpenRouter(system, repairUser);
          usageIn += rr.usageIn; usageOut += rr.usageOut;
          repairText = rr.text;
        } else {
          const rClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const rr = await rClient.messages.create({
            model: MODEL, max_tokens: MAX_TOKENS, system,
            messages: [{ role: 'user', content: repairUser }]
          }, { timeout: CALL_TIMEOUT_MS, maxRetries: 2 });
          if (rr.usage) { usageIn += rr.usage.input_tokens || 0; usageOut += rr.usage.output_tokens || 0; }
          repairText = (rr.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
        }
        const unfenced = stripRepairChrome((() => {
          const m = String(repairText || '').trim().match(/^```[a-z]*\s*\n([\s\S]*?)\n```\s*$/i);
          return m ? m[1] : repairText;
        })());
        if (String(unfenced || '').trim()) {
          const renormalized = renderPacketIntake(unfenced, packet);
          const reparsed = require('../lib/articleIntake').parse(renormalized);
          if (reparsed.found && !reparsed.errors.length) {
            const reaudit = lep.auditArticle(renormalized, packet);
            if (reaudit.ok) {
              normalized = renormalized;
              fs.writeFileSync(savedFiles[0], normalized);
              audit = reaudit;
              log.info('LEP/2 repair pass clean (' + audit.manifestId + ') — repaired draft kept.');
            } else audit = reaudit;
          } else {
            log.warn('repair pass broke the intake contract — keeping original audit failure.');
          }
        } else log.warn('repair pass returned empty — keeping original audit failure.');
      }
      if (!audit.ok) {
        throw new Error('LEP/2 Article manifest audit failed (' + audit.manifestId + '): ' +
          audit.errors.map(e => e.code + '=' + e.values.join(',')).join('; '));
      }
      if (audit.observations && audit.observations.length) {
        log.info('LEP/2 lexical observations deferred to persona-aware Rhea (' + audit.manifestId + '): ' +
          audit.observations.map(e => e.code + '=' + e.values.join(',')).join('; '));
      }
    }
    const shape = require('./livedArticleShape').isSummaryArticle(normalized);
    if (shape.fail) {
      throw new Error('summary article refused: ' + shape.reasons.join(','));
    }
  }

  // Scorecard (Task 1, plan 2026-07-20-headless-newsroom-pipeline). Lightweight
  // self-score of the produced draft — the measurement instrument Feedback1.txt
  // recommends. NOT the authoritative canon gate (that's the headless-Rhea step).
  let scorecard = null;
  if (wrote && !DRY_RUN && !PACKET_ONLY) {
    try {
      const draftText = fs.readFileSync(savedFiles[0], 'utf8');
      log.info('scoring the draft...');
      const s = await scoreDraft(draftText, worldState);
      usageIn += s.usageIn; usageOut += s.usageOut;
      scorecard = {
        desk: DESK, cycle, provider: PROVIDER, model: MODEL,
        reporterVoice: s.json.reporterVoice ?? null,
        factsCorrect: s.json.factsCorrect ?? null,
        hallucinationCount: Array.isArray(s.json.hallucinations) ? s.json.hallucinations.length : null,
        hallucinations: s.json.hallucinations || [],
        wordCount: s.json.wordCount ?? null,
        humanEdits: null,               // Low|Medium|High — filled by a human reviewer
        runtimeSec: Math.round((Date.now() - startTime) / 1000),
        apiCostUsd: costUsd(MODEL, usageIn, usageOut),
        usageInputTokens: usageIn, usageOutputTokens: usageOut,
        notes: s.json.notes || (s.json.parseError ? 'score parse failed' : ''),
        ranAt: new Date().toISOString()
      };
      const scPath = path.join(COMPARE_DIR, DESK + '_c' + cycle + '_' + OUT_SLUG + '.scorecard.json');
      fs.writeFileSync(scPath, JSON.stringify(scorecard, null, 2));
      log.info('scorecard → ' + path.relative(ROOT, scPath));
    } catch (e) { log.warn('scoring failed: ' + e.message); }
  }

  const durationMs = Date.now() - startTime;

  // Run-meta for the A/B comparison (tokens = the v2 cost baseline)
  const meta = {
    desk: DESK, cycle, model: MODEL, turns, maxTurns: MAX_TURNS,
    usageInputTokens: usageIn, usageOutputTokens: usageOut,
    savedFiles: savedFiles.map(f => path.relative(ROOT, f)),
    compareAgainst: 'output/desk-output/' + DESK + '_c' + cycle + '.md',
    durationMs, dryRun: DRY_RUN, packetOnly: PACKET_ONLY, ranAt: new Date().toISOString()
  };
  if (!DRY_RUN && wrote) {
    fs.mkdirSync(COMPARE_DIR, { recursive: true });
    const metaName =
      DESK + '_c' + cycle +
      (ARTIFACT_TAG ? '_' + ARTIFACT_TAG : '') +
      '_cron.meta.json';
    fs.writeFileSync(path.join(COMPARE_DIR, metaName), JSON.stringify(meta, null, 2));
  }

  console.log('\n--- run summary ---');
  console.log(JSON.stringify(meta, null, 2));
  console.log('\ntokens: ' + usageIn + ' in / ' + usageOut + ' out · ' + turns + ' turn(s) · ' + durationMs + 'ms');
  if (scorecard) console.log('\nscorecard:\n' + JSON.stringify(scorecard, null, 2));
  if (wrote) {
    console.log('compare: diff ' + meta.compareAgainst + '  ↔  ' + meta.savedFiles[0]);
  }
}

if (require.main === module) {
  main().catch(err => { log.error('Fatal: ' + err.message); process.exit(1); });
}

module.exports = {
  normalizeArtifactTag,
  buildOutputSlug,
  formatStrictSourceHygiene,
  stripModelMetadataTail,
  stripRepairChrome,
  renderPacketIntake,
  resolveMaxToolCalls,
  openRouterToolLoop,      // Task 2.5.5 — shared by the wake-1 fact selection (cron-desk-run.js)
  callOpenRouterRaw,
};
