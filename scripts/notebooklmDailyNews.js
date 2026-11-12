#!/usr/bin/env node
/**
 * notebooklmDailyNews.js — grounded daily listening brief for GodWorld.
 *
 * Puts the day's newsroom in front of the builder as sources the hosts can
 * read one at a time (pipeline.108): every article its own source by
 * reporter, each with its published history from the canon notebook beside
 * it, every citizen reflection of the last day by name, and the world record
 * by section on a Cycle's first morning. The working notebook holds only
 * today. The written brief and audio overview are listening artifacts, never
 * canon and never an ingestion input.
 *
 * Runtime failures are non-blocking by contract. This job may notify the
 * configured Discord webhook, but it never writes Sheets, canon, or editions.
 *
 * Usage:
 *   node scripts/notebooklmDailyNews.js [--cycle 102] [--hours 36]
 *     [--dry-run] [--no-audio] [--no-deliver]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  ROOT,
  NLM,
  nlm,
  sleep,
  deliver,
  sendDiscordText,
  sendDiscordFile,
} = require('./notebooklmPush');
const dailyRouter = require('./notebooklmDailyRouter');
const articleContamination = require('./articleContamination');
const { readerCopy } = require('../lib/articleIntake');   // daily brief is a listening surface: prose only, no INTAKE register
const s344Slots = require('./s344HumanSlots');

const CONFIG_PATH = path.join(ROOT, 'config', 'notebooklm.json');
const COMPARE_DIR = path.join(ROOT, 'output', 'cron-compare');
const OUTPUT_DIR = path.join(ROOT, 'output', 'notebooklm', 'daily');
const AUDIO_RETRY_INTERVAL_MS = 30 * 1000;
const AUDIO_RETRY_MAX = 30;
const AUDIO_CREATE_ATTEMPTS = 2;
const UNAIRED_CARRY_HOURS = 72;
const SOURCE_VERSION = '2.0';
const DEFAULT_AUDIO_LENGTH = 'default';
const DEFAULT_AUDIO_FORMAT = 'deep_dive';

function resolveAudioPresentation(routing, config, dailyConfig) {
  const cfg = dailyConfig || {};
  const conf = config || {};
  const fallbackFormat = cfg.audioFormat || conf.audioFormat || DEFAULT_AUDIO_FORMAT;
  const fallbackLength = cfg.audioLength || DEFAULT_AUDIO_LENGTH;
  if (cfg.honorRouter === false) {
    return { format: fallbackFormat, length: fallbackLength, source: 'config' };
  }
  if (routing && routing.format && routing.length) {
    return {
      format: routing.format,
      length: routing.length,
      source: 'router',
      profile: routing.profile || null,
    };
  }
  return { format: fallbackFormat, length: fallbackLength, source: 'config-fallback' };
}

function routingDiscordLine(routing, presentation) {
  if (!routing || !routing.profile) return '';
  const pres = presentation || {};
  return 'Program: **' + routing.profile + '** · `' +
    (pres.format || routing.format) + '/' + (pres.length || routing.length) + '`' +
    (routing.reasonCodes && routing.reasonCodes.length
      ? '\nReasons: ' + routing.reasonCodes.join(', ')
      : '');
}

function parseArgs(argv) {
  const args = {
    hours: null,
    audio: true,
    deliver: true,
    dryRun: false,
    routingShadow: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--cycle') args.cycle = Number(argv[++i]);
    else if (token.startsWith('--cycle=')) args.cycle = Number(token.slice(8));
    else if (token === '--hours') args.hours = Number(argv[++i]);
    else if (token.startsWith('--hours=')) args.hours = Number(token.slice(8));
    else if (token === '--no-audio') args.audio = false;
    else if (token === '--no-deliver') args.deliver = false;
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--routing-shadow') args.routingShadow = true;
    else if (token === '--resume-latest-audio') args.resumeLatestAudio = true;
    else if (token === '--force') args.force = true;
    else throw new Error('unknown argument: ' + token);
  }
  if (args.cycle != null && (!Number.isInteger(args.cycle) || args.cycle < 1)) {
    throw new Error('--cycle must be a positive integer');
  }
  if (args.hours != null && (!Number.isFinite(args.hours) || args.hours <= 0)) {
    throw new Error('--hours must be a positive number');
  }
  if (args.routingShadow && !args.dryRun) {
    throw new Error('--routing-shadow is local-only and requires --dry-run');
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function latestWorldSummary() {
  const found = fs.readdirSync(path.join(ROOT, 'output'))
    .map((name) => {
      const match = name.match(/^world_summary_c(\d+)\.md$/);
      return match ? { cycle: Number(match[1]), file: path.join(ROOT, 'output', name) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.cycle - a.cycle);
  if (!found.length) throw new Error('no output/world_summary_c<N>.md found');
  return found[0];
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else files.push(full);
  }
  return files;
}

function cycleFromName(file) {
  const match = path.basename(file).match(/_c(\d+)(?:_|\.|-)/i);
  return match ? Number(match[1]) : null;
}

function artifactStem(file) {
  // The optional -HHMM is uniqueDest's collision suffix; it must be stripped
  // here too, or a re-run article never matches its own .flags.json and the
  // flagged-exclusion check silently stops covering it.
  return path.basename(file)
    .replace(/\.(?:staged|sample)(?:-\d{3,4})?\.md$/, '')
    .replace(/\.flags\.json$/, '');
}

function artifactRecord(file, classification, cycle, root) {
  // The staged sidecar (<article>.json) carries the reporter's byline; the
  // article body opens on its headline and never names its writer.
  const sidecar = file.replace(/\.md$/, '.json');
  let byline = '';
  if (sidecar !== file && fs.existsSync(sidecar)) {
    try {
      byline = String(readJson(sidecar).byline || '').trim();
    } catch (_) { /* unreadable sidecar; the file name still names the reporter */ }
  }
  return {
    classification,
    cycle,
    file,
    relativePath: path.relative(root, file),
    mtimeMs: fs.statSync(file).mtimeMs,
    body: fs.readFileSync(file, 'utf8'),
    byline,
  };
}

// pipeline.108 — airs once. Every report a delivered show already carried, by
// path, with the time of the latest such show. Only shows from before today's
// run count (12 h back), so a same-day re-run still carries today's reports.
function airedReportTimes(outputDir, nowMs) {
  const aired = new Map();
  for (const file of walkFiles(outputDir)) {
    if (path.basename(file) !== 'manifest.json') continue;
    let manifest;
    try {
      manifest = readJson(file);
    } catch (_) {
      continue;
    }
    if (!manifest || !manifest.driveLink) continue;
    const at = Date.parse(manifest.lastAttemptAt || manifest.generatedAt || '');
    if (!Number.isFinite(at) || at > nowMs - 12 * 3600e3) continue;
    // v2.0 on: only an article whose own source landed in the notebook aired
    // (a skipped upload, or a resumed show with no source record, airs it
    // later). Older manifests carried every collected report in one file.
    const carried = Array.isArray(manifest.sources) || parseFloat(manifest.sourceVersion) >= 2
      ? (manifest.audioSources || manifest.sources || []).filter((entry) => entry && entry.id && (entry.kind === 'article' || entry.kind === 'exchange'))
      : (manifest.reports || []);
    for (const report of carried) {
      if (!report || !report.path) continue;
      if (!aired.has(report.path) || aired.get(report.path) < at) aired.set(report.path, at);
    }
  }
  return aired;
}

// Builder 2026-11-10: "No day should duplicate the same source". A piece the
// Saturday run printed in The Cycle Pulse has its show, the weekly one, made
// from the edition in the permanent notebook; the daily show does not carry
// the edition or any piece printed in it. Stems come from the Saturday run's
// own record (output/edition_published_c<N>.json `selected`).
function printedStem(file) {
  return path.basename(file).replace(/\.(?:staged|sample)(?:-(\d{3,4}))?\.md$/, (_, n) => (n ? '-' + n : ''));
}

function printedStems(root, cycle) {
  const stems = new Set();
  for (const n of [cycle, cycle - 1]) {
    const file = path.join(root, 'output', 'edition_published_c' + n + '.json');
    if (!fs.existsSync(file)) continue;
    try {
      for (const stem of readJson(file).selected || []) stems.add(String(stem));
    } catch (_) { /* unreadable record: nothing is treated as printed */ }
  }
  return stems;
}

// The newest manifest that recorded an audio render and never delivered it.
function latestUndeliveredRender(outputDir) {
  let best = null;
  for (const file of walkFiles(outputDir)) {
    if (path.basename(file) !== 'manifest.json') continue;
    let manifest;
    try {
      manifest = readJson(file);
    } catch (_) {
      continue;
    }
    if (!manifest || !manifest.audioArtifactId || manifest.driveLink || manifest.recoveredInto) continue;
    const at = Date.parse(manifest.lastAttemptAt || manifest.generatedAt || '');
    if (!Number.isFinite(at) || (best && best.at >= at)) continue;
    best = {
      at,
      audioArtifactId: manifest.audioArtifactId,
      cycle: manifest.cycle,
      sources: manifest.audioSources || manifest.sources,
      manifestFile: file,
      manifestPath: path.relative(ROOT, file),
    };
  }
  return best;
}

function collectNewsroomArtifacts(cycle, hours, nowMs, root = ROOT, options = {}) {
  const cutoff = nowMs - hours * 3600e3;
  // pipeline.108: with the aired map a report is carried once, so the previous
  // Cycle's filings still inside the window (a Sunday-afternoon piece, filed
  // after Sunday's show and before the fire) air on the first morning instead of
  // being dropped by the Cycle filter. Without the map the filter stays strict.
  // A piece that never aired stays eligible past the window (carryHours), so a
  // morning the show failed does not lose that day's articles.
  const aired = options.aired || null;
  const carryCutoff = aired && options.carryHours > hours ? nowMs - options.carryHours * 3600e3 : cutoff;
  const compareDir = path.join(root, 'output', 'cron-compare');
  const printed = printedStems(root, cycle);
  const records = [];
  // cron-desk-run routes a passing article through uniqueDest(), which appends
  // an HHMM suffix when the destination name is already taken — so a re-run of
  // the same desk lands as `.staged-2324.md`, not `.staged.md`. An endsWith()
  // match dropped every one of those: the 2026-08-18 write wake staged four
  // real articles and the daily news collected two, losing P Slayer and Jordan
  // Velez purely on filename. Match the suffixed form too.
  const specs = [
    { dir: path.join(compareDir, 'staged'), re: /\.staged(?:-\d{3,4})?\.md$/, classification: 'STAGED' },
    { dir: path.join(compareDir, 'samples'), re: /\.sample(?:-\d{3,4})?\.md$/, classification: 'UNGATED_SAMPLE' },
    // Flagged drafts ride along in full (Mike-direct 2026-08-23: "let it
    // report on it all — I'll never know the issues if you keep hiding
    // them"). The brief is a listening surface, never a canon write, so a
    // gated draft is safe to report on as long as it is labeled as gated.
    { dir: path.join(compareDir, 'flagged'), re: /(?:^|\/)(?!.*\.flags\.json$).*\.md$/, classification: 'FLAGGED' },
  ];

  for (const spec of specs) {
    for (const file of walkFiles(spec.dir)) {
      if (!spec.re.test(file)) continue;
      const stat = fs.statSync(file);
      const fileCycle = cycleFromName(file);
      const cycleOk = fileCycle === cycle ||
        (aired && spec.classification !== 'FLAGGED' && fileCycle === cycle - 1);
      if (stat.mtimeMs < (spec.classification === 'FLAGGED' ? cutoff : carryCutoff) || !cycleOk) continue;
      const rel = path.relative(root, file);
      if (aired && aired.has(rel) && stat.mtimeMs <= aired.get(rel)) continue;
      if (spec.classification !== 'FLAGGED' && printed.has(printedStem(file))) continue;
      records.push(artifactRecord(file, spec.classification, fileCycle, root));
    }
  }

  const flagged = [];
  const flagDir = path.join(compareDir, 'flagged');
  for (const file of walkFiles(flagDir)) {
    if (!file.endsWith('.flags.json')) continue;
    const stat = fs.statSync(file);
    const fileCycle = cycleFromName(file);
    if (stat.mtimeMs < cutoff || fileCycle !== cycle) continue;
    let data;
    try {
      data = readJson(file);
    } catch (_) {
      data = { parseError: true };
    }
    flagged.push({
      classification: 'FLAGGED_EXCLUSION',
      cycle: fileCycle,
      relativePath: path.relative(root, file),
      reasonCount: Array.isArray(data.flags) ? data.flags.length
        : Array.isArray(data.issues) ? data.issues.length
          : Array.isArray(data.findings) ? data.findings.length
            : 1,
    });
  }

  flagged.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  // Attach each flagged draft's gate findings so the brief can report the
  // decision, not just the absence (2026-08-23: flagged used to be a silent
  // exclusion list — a heavy gate week just read as a slow news day).
  for (const record of records) {
    if (record.classification !== 'FLAGGED') continue;
    const stem = path.basename(record.file).replace(/(?:-\d{3,4})?\.md$/, '');
    const flagFile = path.join(path.dirname(record.file), stem + '.flags.json');
    if (!fs.existsSync(flagFile)) continue;
    try {
      const data = readJson(flagFile);
      record.flags = Array.isArray(data.flags) ? data.flags : [];
      record.flagSummary = data.summary || null;
    } catch (_) { /* unreadable sidecar; report the draft without findings */ }
  }
  // Edition day: the edition file landed inside the window (Saturday's print
  // sits inside Sunday 08:00's 36 h and outside Monday's). Through 2026-11-09
  // this run also carried the edition and the UNDOCKED digest; the weekly show
  // carries those (printedStems above), so what rides here is the Civis Systems
  // journal, which is not in the edition and has no other show.
  const editionFile = path.join(root, 'editions', 'cycle_pulse_c' + cycle + '.txt');
  const editionDay = fs.existsSync(editionFile) && fs.statSync(editionFile).mtimeMs >= cutoff;
  const extras = [];
  if (editionDay) {
    // Written at the Cycle fire, days before the edition prints: cycle-match only.
    const journalFile = path.join(root, 'output', 'civis-journal', 'civis_journal_c' + cycle + '.md');
    if (fs.existsSync(journalFile)) extras.push(artifactRecord(journalFile, 'CIVIS_JOURNAL', cycle, root));
  }
  // First morning (builder 2026-10-19: "if sunday is the week that was, monday is the
  // week that will be"): the run after the Cycle fire. The world summary is written
  // at the fire; when it landed inside the last 24 h this is the cold read on the
  // new Cycle before the desks have reported it (Sunday ~22:30 fire → Monday 08:00
  // is 9.5 h; Tuesday 08:00 is 33.5 h, so Tuesday is not). Edition day wins when
  // both would hold. The first morning counts toward the router's bar like the
  // edition does, so the program is long by construction; the pack body is
  // already the world summary — what changes is what the hosts are told it is.
  const summaryFile = path.join(root, 'output', 'world_summary_c' + cycle + '.md');
  const firstMorning = !editionDay && fs.existsSync(summaryFile) &&
    fs.statSync(summaryFile).mtimeMs >= nowMs - 24 * 3600 * 1000;
  const eligible = extras.concat(records.sort((a, b) => a.relativePath.localeCompare(b.relativePath)));
  return {
    reports: eligible,
    flagged,
    editionDay,
    firstMorning,
    publishedExtras: extras.filter((r) => r.classification !== 'STAGED').length,
  };
}

function reportsFromPulse(pulse, root = ROOT) {
  const groups = [
    { rows: pulse && pulse.filings && pulse.filings.current || [], classification: 'STAGED' },
    { rows: pulse && pulse.filings && pulse.filings.previous || [], classification: 'PREVIOUS_FILING' },
  ];
  const reports = [];
  for (const group of groups) {
    for (const filing of group.rows) {
      const file = path.resolve(root, String(filing.articlePath || ''));
      const rel = path.relative(root, file);
      if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel) ||
          !fs.existsSync(file) || path.extname(file) !== '.md') continue;
      const body = fs.readFileSync(file, 'utf8');
      if (sha256Text(body) !== filing.draftSha256) continue;
      const assignment = (pulse.assignments || []).find((row) => row.articlePath === filing.articlePath) || null;
      if (!safeToQuoteArticle(body, assignment)) continue;
      reports.push({
        classification: group.classification,
        cycle: filing.cycle,
        file,
        relativePath: rel,
        body,
      });
    }
  }
  return reports.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function safeToQuoteArticle(body, assignment) {
  const prose = articleContamination.proseOnly(body);
  if (!prose.trim()) return false;
  if (s344Slots.tribuneAsActorHits(prose).length) return false;
  if (/\b(?:BEGIN_PACKET|END_PACKET|SYSTEM_PROMPT)\b|Return only the output format|```(?:json)?/i.test(prose)) {
    return false;
  }
  if (/\bcorrected article\b|\bunapproved quotes removed\b|\bno fabricated speech\b/i.test(prose)) return false;
  if (/^\s*[\[{]|"(?:packetContract|schema|goal|known|limits)"\s*:/i.test(prose)) return false;
  try {
    const scan = articleContamination.scan(body, {
      desk: assignment && assignment.desk,
      packet: assignment ? { quotes: assignment.quotes } : null,
    });
    return !scan.fail;
  } catch (_) {
    return false;
  }
}

function flaggedFromPulse(pulse) {
  return (pulse && pulse.dispositions || []).filter((row) =>
    row.flagPath && (row.disposition === dailyRouter.RHEA_DISPOSITIONS.RHEA_FLAGGED ||
      row.disposition === dailyRouter.RHEA_DISPOSITIONS.NEVER_GATED)
  ).map((row) => ({
    classification: row.disposition === dailyRouter.RHEA_DISPOSITIONS.RHEA_FLAGGED
      ? 'RHEA_FLAGGED_EXCLUSION'
      : 'NEVER_GATED_EXCLUSION',
    disposition: row.disposition,
    cycle: pulse.cycle,
    relativePath: row.flagPath,
    reasonCount: Math.max(1, Number(row.rheaFlagCount || 0), Number(row.flagFindingCount || 0)),
  })).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function mergeManifest(previous, current) {
  return Object.assign({}, previous || {}, current);
}

function isCompletedManifest(manifest) {
  return Boolean(
    manifest &&
    manifest.sourceVersion === SOURCE_VERSION &&
    Array.isArray(manifest.sourceIds) &&
    manifest.sourceIds.length > 0 &&
    manifest.audioPath &&
    manifest.driveLink
  );
}

function buildSourcePack(input) {
  const hashInput = {
    sourceVersion: SOURCE_VERSION,
    cycle: input.cycle,
    worldSummary: input.worldSummary,
    citizenDigest: input.citizenDigest ? input.citizenDigest.text : null,
    reports: input.reports.map((r) => ({
      classification: r.classification,
      relativePath: r.relativePath,
      body: r.body,
    })),
    flagged: input.flagged.map((r) => ({
      classification: r.classification,
      disposition: r.disposition || null,
      relativePath: r.relativePath,
      reasonCount: r.reasonCount,
    })),
    routing: input.routing || null,
    pulse: input.pulse ? {
      fingerprint: input.pulse.fingerprint,
      counts: input.pulse.counts,
      assignments: input.pulse.assignments.map((assignment) => ({
        key: assignment.key,
        headline: assignment.headline,
        chase: assignment.chase,
        disposition: assignment.disposition,
        quoteCount: assignment.quotes.length,
      })),
      filings: input.pulse.filings,
      materialSignals: input.pulse.materialSignals || [],
    } : null,
  };
  const hash = stableHash(hashInput);
  const lines = [
    '# GodWorld Daily Newsroom Source Pack — Cycle ' + input.cycle,
    '',
    'Artifact class: NLM_DAILY_SOURCE_PACK',
    'Canon status: NOT CANON. This is a bounded listening/research input.',
    'Authority order: current world summary first; published Edition archive second; staged and ungated newsroom reports are leads/interpretation only.',
    'Conflict rule: never let a staged or sample report override the world summary or published archive.',
    'Flagged reports are excluded from the report body and listed only as exclusions.',
    'Pack SHA-256: ' + hash,
    '',
    '## Current world state — derived engine summary',
    '',
    'Source: ' + input.worldSummaryPath,
    'Cycle: ' + input.cycle,
    '',
    input.worldSummary.trim(),
    '',
  ];

  if (input.citizenDigest) {
    lines.push(
      '## The people, in their own words — daily citizen digest',
      '',
      'Source: ' + input.citizenDigest.path,
      'Canon status: NOT CANON. Verbatim citizen reflections and life events from the world ledger — a listening slice, not published reporting.',
      '',
      input.citizenDigest.text.trim(),
      ''
    );
  }

  if (input.pulse && input.routing) {
    lines.push(
      '## Daily program',
      '',
      '- proposed profile: ' + input.routing.profile,
      '- proposed presentation: ' + input.routing.format + '/' + input.routing.length,
      '- activation eligible: ' + input.routing.activationEligible,
      '- reason codes: ' + input.routing.reasonCodes.join(', '),
      '- Rhea dispositions: passed=' + input.routing.dispositionCounts.passed +
        ', rhea-flagged=' + input.routing.dispositionCounts.rheaFlagged +
        ', never-gated=' + input.routing.dispositionCounts.neverGated,
      ''
    );
    const chases = input.pulse.assignments.filter((assignment) => assignment.chase);
    lines.push('### W1 reporter chases', '');
    if (!chases.length) lines.push('_No `plan.chase` fields were available._', '');
    for (const assignment of chases) {
      lines.push('- ' + (assignment.reporter && assignment.reporter.name || assignment.desk || 'Reporter') +
        ' — ' + (assignment.headline || 'assigned filing') + ': ' + assignment.chase);
    }
    if (chases.length) lines.push('');
    lines.push('### W2 Packet-backed quote coverage', '');
    const quoteAssignments = input.pulse.assignments.filter((assignment) => assignment.quotes.length);
    if (!quoteAssignments.length) lines.push('_No Packet-backed quotes were available._', '');
    for (const assignment of quoteAssignments) {
      lines.push('- ' + (assignment.headline || assignment.key) + ': ' + assignment.quotes.length + ' quote(s).');
    }
    if (quoteAssignments.length) lines.push('');
  }

  lines.push(
    '## Recent newsroom reports — not established fact',
    '',
  );

  if (!input.reports.length) {
    lines.push('_No staged or ungated reports for this Cycle were found in the time window._', '');
  }
  for (const report of input.reports) {
    lines.push(
      '### ' + report.classification + ' — ' + report.relativePath,
      '',
      'This report is ' + (report.classification === 'PUBLISHED_EDITION'
        ? 'The Cycle Pulse, the Tribune\'s published edition for this Cycle — canon, the week\'s reported record. Lead with its stories, by reporter.'
        : report.classification === 'CIVIS_JOURNAL'
        ? 'the Civis Systems journal — the in-world data publisher\'s own reading of the week, under its own name; not Tribune reporting.'
        : report.classification === 'STAGED'
        ? 'behind the publication gate and is not yet canon.'
        : report.classification === 'PREVIOUS_FILING'
          ? 'an exact Rhea-passed filing from the previous completed Cycle and is labeled as continuity, not current reporting.'
          : report.classification === 'FLAGGED'
            ? 'a gate-flagged draft that did NOT publish. Report on it and on the gate decision; never present it as published fact.'
            : 'an ungated sample and must not be presented as verified or published fact.'),
      ''
    );
    if (report.classification === 'FLAGGED') {
      if (report.flagSummary) lines.push('Gate summary: ' + report.flagSummary, '');
      for (const f of (report.flags || [])) {
        lines.push('- gate finding [' + (f.severity || 'unrated') + ']: ' + (f.issue || f.claim || JSON.stringify(f)));
      }
      if ((report.flags || []).length || report.flagSummary) lines.push('');
    }
    lines.push(
      readerCopy(report.body),
      ''
    );
  }

  lines.push('## Gate decisions this window', '');
  if (!input.flagged.length) {
    lines.push('_No gate-flagged drafts in the time window._', '');
  } else {
    for (const item of input.flagged) {
      lines.push(
        '- `' + item.relativePath + '` — ' +
          item.reasonCount + ' gate finding(s); disposition=' + (item.disposition || 'legacy-flagged') +
          '. Draft included above under FLAGGED.'
      );
    }
    lines.push('');
  }

  return { hash, text: lines.join('\n') };
}

function reportHeading(report) {
  const match = report.body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : path.basename(report.file || report.relativePath);
}

function dailyWorldRecord(worldSummary) {
  return String(worldSummary || '')
    .split('\n')
    .filter((line) => !line.startsWith('_Generated by `scripts/buildWorldSummary.js`'))
    .join('\n')
    .trim();
}

// ── pipeline.108: the daily sources ─────────────────────────────────────────
// Builder 2026-11-09: "sources don't need to be on one document, no LLM reads
// that long of a document". Through v1.9 everything rode one glued file of
// 12–29k words (world report, canon dossier, digest, articles) against a
// ~4,900-word show, and no article was ever its own source. Each article, each
// neighborhood's reflections and (first morning only) each world-record
// section is now a small source of its own.
const TITLE_LABEL_MAX = 110;

function dailySourceTitle(cycle, label) {
  const clean = String(label || '').replace(/\s+/g, ' ').trim();
  return 'The Bay Tribune Daily C' + cycle + ' — ' +
    (clean.length > TITLE_LABEL_MAX ? clean.slice(0, TITLE_LABEL_MAX).replace(/\s+\S*$/, '') + '…' : clean);
}

function reporterName(report) {
  if (report.byline) return report.byline;
  const match = path.basename(report.file || report.relativePath || '').match(/^[a-z-]+_c\d+_([a-z0-9-]+)_/i);
  if (!match) return '';
  return match[1].split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function articleSource(report) {
  const copy = readerCopy(report.body).trim();
  const headline = reportHeading(report);
  const byline = reporterName(report);
  const bylineLine = byline ? 'By ' + byline + ', The Bay Tribune' : 'The Bay Tribune';
  const lines = copy.split('\n');
  const text = /^#\s+/.test(lines[0] || '')
    ? [lines[0], '', bylineLine].concat(lines.slice(1)).join('\n')
    : ['# ' + headline, '', bylineLine, '', copy].join('\n');
  return {
    kind: 'article',
    label: (byline ? byline + ': ' : '') + headline,
    text,
    path: report.relativePath,
  };
}

// ── Deep canon, per story (builder 2026-11-09: "Yes") ───────────────────────
// A show is made inside one notebook, and the working notebook holds only
// today, so the hosts cannot reach the canon notebook. Each article gets one
// question to it — what was published before about these people and places —
// through the read-only wrapper (whole live notebook, 30–65 s a question in its
// log), and the answer rides as a small source beside the article. A lore
// piece is already canon and gets none. Non-blocking: a failed or empty answer
// means that article airs without background.
const BACKGROUND_QUESTION_MAX = 3900; // the wrapper refuses a question over 4000
const BACKGROUND_BUDGET_MS = 15 * 60 * 1000;
const BACKGROUND_TRIES = 3;
const CANON_SEARCH = path.join(__dirname, 'notebooklmCanonSearch.js');

function wantsBackground(report) {
  return (report.classification === 'STAGED' || report.classification === 'UNGATED_SAMPLE') &&
    !/^lore_/.test(path.basename(report.file || report.relativePath || ''));
}

function backgroundQuestion(report) {
  const body = String(report.body || '');
  const register = (key) => Array.from(new Set(
    (body.match(new RegExp('^' + key + ':\\s*(.+)$', 'gm')) || [])
      .map((line) => line.replace(/^[A-Z]+:\s*/, '').split('|')[0].trim()).filter(Boolean)));
  const names = register('NAMES');
  const hoods = register('HOOD');
  const now = Number(report.cycle) || cycleFromName(report.file || report.relativePath || '') || null;
  const head = [
    'A Bay Tribune reporter has filed the article below' + (now ? ' in Cycle ' + now : '') + '. From what was published before it, give the history a listener needs to follow it:' +
      ' what earlier coverage said about the people and places this article names, what was promised or left unresolved, and how it led here.',
    // 2026-11-10: the first show presented the Cycle-110 title as news and
    // hung it on stories it had nothing to do with. The history is dated
    // against the article's own Cycle and kept to the article's own subjects.
    'Only history that bears directly on the people and places named in this article. Leave out citywide events (a championship, an election, a season) unless this article is about them.' +
      (now ? ' Write in the past tense and say how long ago each thing was, counted in Cycles back from Cycle ' + now + ' ("five Cycles ago, in Cycle ' + (now - 5) + '"), so nothing old can be heard as new.' : ''),
    'Published fact only, earliest first, in plain paragraphs under 400 words: no headings, no lists. Do not restate the new article.' +
      ' Do not invent history, quotes or figures. Cite the source for every statement. Stop when the history ends: no closing offer, no question.',
    'Headline: ' + reportHeading(report),
    names.length ? 'People named: ' + names.join(', ') : '',
    hoods.length ? 'Neighborhoods: ' + hoods.join(', ') : '',
    'Article:',
  ].filter(Boolean).join('\n');
  const room = BACKGROUND_QUESTION_MAX - head.length - 1;
  return head + '\n' + readerCopy(body).replace(/\s+/g, ' ').trim().slice(0, Math.max(0, room));
}

function backgroundSource(report, background) {
  const headline = reportHeading(report);
  const lines = [
    '# Earlier in the Tribune: ' + headline,
    '',
    // citation markers and the notebook's closing "Would you like…" offer are not for listening
    String(background.answer).replace(/\s*\[\d+(?:\s*[-,–]\s*\d+)*\]/g, '')
      .replace(/\s*\((?:\*[^*]+\*[\s;,]*)+\)/g, '')
      .replace(/\n+(?:[*_-]{3,}\s*\n+)?(?:Would you like|Let me know|If you(?:'d| would) like)[^\n]*\s*$/i, '').trim(),
  ];
  return {
    kind: 'background',
    label: 'From the archive — ' + headline,
    text: lines.join('\n'),
    path: report.relativePath,
  };
}

function askCanon(question) {
  const out = execFileSync('node', [CANON_SEARCH, '--question', question, '--timeout', '180', '--allow-uncited'],
    { cwd: ROOT, encoding: 'utf-8', timeout: 240 * 1000, maxBuffer: 10 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const result = JSON.parse(out.slice(out.indexOf('{')));
  const answer = String(result.answer || '').trim();
  if (!answer) throw new Error('empty answer');
  const titles = Array.from(new Set((result.sourceExcerpts || []).map((e) => e && e.sourceTitle).filter(Boolean))).slice(0, 8);
  return { answer, titles };
}

// Map of article path → { answer, titles }. NotebookLM returned most answers
// with no citation list (2026-11-09: 2 of 6 cited on each of two live runs),
// so the daily show takes the uncited answer too (builder 2026-11-09: "citing
// sources is not necessary for this, these don't write back into canon"); answers are kept in the run dir so a re-run asks nothing twice.
function fetchArticleBackgrounds(reports, cacheDir, ask = askCanon, nowFn = Date.now) {
  const backgrounds = new Map();
  const startedAt = nowFn();
  fs.mkdirSync(cacheDir, { recursive: true });
  for (const report of (reports || []).filter(wantsBackground)) {
    const question = backgroundQuestion(report);
    const cacheFile = path.join(cacheDir, sha256Text(question).slice(0, 16) + '.json');
    if (fs.existsSync(cacheFile)) {
      try {
        backgrounds.set(report.relativePath, readJson(cacheFile));
        continue;
      } catch (_) { /* unreadable cache: ask again */ }
    }
    for (let attempt = 1; attempt <= BACKGROUND_TRIES; attempt++) {
      if (nowFn() - startedAt > BACKGROUND_BUDGET_MS) {
        console.log('DAILY BACKGROUND STOPPED (non-blocking): 15-minute budget spent; remaining articles air without it');
        return backgrounds;
      }
      try {
        const background = ask(question);
        fs.writeFileSync(cacheFile, JSON.stringify(background, null, 2) + '\n');
        backgrounds.set(report.relativePath, background);
        break;
      } catch (e) {
        const why = String((e.stderr && String(e.stderr).trim()) || e.message).split('\n').pop().slice(0, 200);
        console.log('DAILY BACKGROUND ' + (attempt < BACKGROUND_TRIES ? 'RETRY' : 'SKIPPED (non-blocking)') + ': ' +
          reportHeading(report).slice(0, 80) + ' — ' + why);
      }
    }
  }
  return backgrounds;
}

// The daily citizen exchange (citizen-exchange.js, 17:00): two citizens talking,
// in full, written to output/exchanges/. Only each speaker's excerpt reached the
// sheet and so the show; the conversation itself is carried once, as its own
// source (builder 2026-11-10: citizen coverage fills the voice).
function exchangeSources(root, cutoff, aired) {
  const dir = path.join(root, 'output', 'exchanges');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir).filter((n) => /^exchange_c\d+_.*\.md$/.test(n)).sort()) {
    const file = path.join(dir, name);
    const rel = path.relative(root, file);
    if (fs.statSync(file).mtimeMs < cutoff || (aired && aired.has(rel))) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const participants = (raw.match(/^- participants:\s*(.+)$/m) || [])[1] || '';
    const who = participants.split('|').map((part) => part.replace(/\bPOP-\d+\b/g, '').trim()).filter(Boolean);
    const talk = raw.slice(raw.indexOf('\n---') >= 0 ? raw.indexOf('\n---') + 4 : 0)
      .replace(/\bPOP-\d+\b\s*/g, '').trim();
    if (who.length < 2 || talk.split(/\s+/).length < 30) continue;
    out.push({
      kind: 'exchange',
      label: 'Overheard — ' + who.join(' and '),
      text: '# ' + who.join(' and ') + ', talking\n\n' + talk,
      path: rel,
      pops: (participants.match(/\bPOP-\d+\b/g) || []).map((pop) => pop.toUpperCase()),
    });
  }
  return out;
}

// An interview answer or a line of the day's conversation reaches Reflection_Intake
// as its first 180 characters (citizenVoice.js, citizen-exchange.js); everything the
// citizen said is on their page, mirrored to output/citizen_pages/index.jsonl by the
// 06:15 angle wake. Read of the Tue 2026-11-10 show: 15 of the 19 lines under
// "Citizens in their own words" were that 180. The page's entry replaces the tab's
// line when it opens with it word for word and says more; with no such entry the
// tab's line stays and is counted. A speaker in a conversation this run carries as
// its own source is not repeated here (no day carries the same source twice). The
// operator's page (lib/citizenPage OPERATOR_POPIDS) is never opened here.
const PAGE_MATCH_MIN = 60;
const OPERATOR_PAGES = new Set(['POP-00005']);
const TAB_CUT_KINDS = new Set(['PRESS', 'CONVO', 'DEBATE']);
function oneLine(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}
function wholeReflections(citizens, pageRows, exchanges) {
  const talking = new Set();
  for (const exchange of exchanges || []) for (const pop of exchange.pops || []) talking.add(pop);
  const pages = new Map();
  for (const row of pageRows || []) {
    if (!row || row.type !== 'reflection' || !row.popId || !row.content) continue;
    const pop = String(row.popId).toUpperCase();
    if (!pages.has(pop)) pages.set(pop, []);
    // Two wakes under one page key share a doc, joined by a rule (pipeline.94).
    for (const entry of String(row.content).split(/\n\n---\n\n/)) pages.get(pop).push(oneLine(entry));
  }
  const stats = { whole: 0, notOnIndex: 0, inConversation: 0 };
  const out = [];
  for (const citizen of citizens || []) {
    const pop = String((citizen && citizen.popid) || '').toUpperCase();
    const reflections = [];
    for (const reflection of (citizen && citizen.reflections) || []) {
      const spoken = reflection.kind === 'CONVO' || reflection.kind === 'DEBATE';
      if (spoken && talking.has(pop)) { stats.inConversation++; continue; }
      const line = oneLine(reflection.text);
      // An answer under 180 characters is already whole on the tab: its page entry is the same line.
      const looked = line.length >= PAGE_MATCH_MIN && !OPERATOR_PAGES.has(pop);
      const entries = looked ? (pages.get(pop) || []).filter((text) => text.startsWith(line)) : [];
      const entry = entries.find((text) => text.length > line.length) || null;
      if (entry) stats.whole++;
      else if (looked && !entries.length && TAB_CUT_KINDS.has(reflection.kind)) stats.notOnIndex++;
      reflections.push(Object.assign({}, reflection, { text: entry || reflection.text }));
    }
    out.push(Object.assign({}, citizen, { reflections }));
  }
  return { citizens: out, stats };
}

// Every citizen who wrote in the last day, every reflection, one source per
// neighborhood (buildCitizenWeekDigest `citizens`; the 5×2 vignette digest is
// no longer what the hosts get).
function reflectionSources(citizens) {
  const byHood = new Map();
  for (const citizen of citizens || []) {
    if (!citizen || !citizen.name || !(citizen.reflections || []).length) continue;
    const hood = citizen.hood || '';
    if (!byHood.has(hood)) byHood.set(hood, []);
    byHood.get(hood).push(citizen);
  }
  return Array.from(byHood.keys()).sort().map((hood) => {
    const where = hood || 'Oakland';
    const lines = [
      '# ' + where + ', in their own words',
      '',
    ];
    for (const citizen of byHood.get(hood)) {
      lines.push('## ' + citizen.name + (citizen.occ ? ' — ' + citizen.occ : ''), '');
      for (const reflection of citizen.reflections) {
        lines.push('> ' + reflection.text + (reflection.with ? ' *(talking with ' + reflection.with + ')*' : ''), '');
      }
    }
    return {
      kind: 'reflections',
      label: 'Citizens in their own words — ' + where,
      text: lines.join('\n'),
      path: null,
    };
  });
}

// First morning only: the world summary is new once, at the Cycle fire. One
// source per section; the sports feed section carries the current Cycle and two
// prior, and only the current block is new.
function worldRecordSources(worldSummary, cycle) {
  const out = [];
  for (const section of dailyWorldRecord(worldSummary).split(/^(?=## )/m)) {
    if (!section.startsWith('## ')) continue;
    const name = section.split('\n')[0].slice(3).replace(/\s*\(.*$/, '').trim();
    let body = section.slice(section.indexOf('\n') + 1);
    if (name === 'Sports') {
      const current = body.split(/^(?=### )/m).filter((block) => new RegExp('^### C' + cycle + '\\b').test(block));
      if (current.length) body = current.join('\n');
    }
    body = body.trim();
    if (body.split(/\s+/).filter(Boolean).length < 15) continue;
    out.push({
      kind: 'world',
      label: 'Cycle ' + cycle + ' opens — ' + name,
      text: '# ' + name + ' — Cycle ' + cycle + '\n\n' + body,
      path: null,
    });
  }
  return out;
}

function buildDailySources(input) {
  const drafts = [];
  for (const report of input.reports || []) {
    // Drafts the gate held back are not news (builder 2026-10-17); they ride
    // the ops report's gate desk file, added after the audio is created.
    if (report.classification === 'FLAGGED') continue;
    if (report.classification === 'CIVIS_JOURNAL') {
      drafts.push({
        kind: 'journal',
        label: 'Civis Systems journal',
        text: String(report.body).trim(),
        path: report.relativePath,
      });
      continue;
    }
    drafts.push(articleSource(report));
    const background = input.backgrounds && input.backgrounds.get(report.relativePath);
    if (background) drafts.push(backgroundSource(report, background));
  }
  drafts.push(...(input.exchanges || []));
  drafts.push(...reflectionSources(input.citizenDigest && input.citizenDigest.citizens));
  if (input.firstMorning) drafts.push(...worldRecordSources(input.worldSummary, input.cycle));

  const seen = new Map();
  return drafts.filter((draft) => draft.text.trim()).map((draft, index) => {
    let title = dailySourceTitle(input.cycle, draft.label);
    const count = (seen.get(title) || 0) + 1;
    seen.set(title, count);
    if (count > 1) title += ' (' + count + ')';
    const text = draft.text.trim() + '\n';
    return {
      kind: draft.kind,
      title,
      path: draft.path,
      name: String(index + 1).padStart(2, '0') + '-' + draft.kind + '.md',
      hash: sha256Text(text),
      words: text.split(/\s+/).filter(Boolean).length,
      text,
    };
  });
}

// The ops report's own source: flagged drafts with what the gate found. Never
// in the notebook while the audio is created (--source-ids is a hint).
function buildGateDeskFile(cycle, reports) {
  const flagged = (reports || []).filter((report) => report.classification === 'FLAGGED');
  if (!flagged.length) return null;
  const lines = [
    '# Gate desk file — Cycle ' + cycle,
    '',
    'FLAGGED drafts: held back by the editorial gate. Not published, not news.',
    '',
  ];
  for (const report of flagged) {
    lines.push('## FLAGGED — ' + reportHeading(report), '', 'File: ' + report.relativePath, '');
    if (report.flagSummary) {
      lines.push('Gate summary: ' + (typeof report.flagSummary === 'string'
        ? report.flagSummary : JSON.stringify(report.flagSummary)), '');
    }
    for (const flag of report.flags || []) {
      lines.push('- ' + (typeof flag === 'string' ? flag : JSON.stringify(flag)));
    }
    lines.push('', readerCopy(report.body).trim(), '');
  }
  return lines.join('\n');
}

function parseJsonOutput(out, label) {
  try {
    return JSON.parse(out);
  } catch (e) {
    throw new Error(label + ' returned invalid JSON: ' + e.message);
  }
}

function queryAnswer(queryJson) {
  if (!queryJson || typeof queryJson !== 'object') return '';
  return String(queryJson.answer || queryJson.response || queryJson.text || '').trim();
}

function sourceRecords(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: item && (item.id || item.source_id),
    title: item && (item.title || item.name),
  })).filter((item) => item.id && item.title);
}

function findSourceId(listJson, title) {
  const found = sourceRecords(listJson).find((source) => source.title === title);
  return found ? found.id : null;
}

function parseAddedSourceId(output) {
  const match = output.match(/Source ID:\s*(\S+)/);
  if (!match) throw new Error('source add succeeded without a Source ID');
  return match[1];
}

function parseCreatedArtifactId(output) {
  const match = output.match(/Artifact ID:\s*(\S+)/);
  if (!match) throw new Error('audio create succeeded without an Artifact ID');
  return match[1];
}

// `nlm studio status <notebook> --json` lists every Studio artifact with a
// status (completed | in_progress | failed). A render NotebookLM has marked
// `failed` never downloads — polling it for 15 minutes is a dead wait.
function findArtifactStatus(statusList, artifactId) {
  if (!Array.isArray(statusList)) return null;
  const hit = statusList.find((a) => a && a.id === artifactId);
  return hit && typeof hit.status === 'string' ? hit.status : null;
}

function artifactStatus(notebookId, artifactId) {
  const res = nlm(['studio', 'status', notebookId, '--json'], { timeoutMs: 120 * 1000 });
  if (!res.ok) return null;
  try {
    return findArtifactStatus(parseJsonOutput(res.out, 'studio status'), artifactId);
  } catch (e) {
    return null;
  }
}

// Matches every title the daily run has ever written into the working notebook:
// the v2.0 per-source titles, the v1.x glued pack, and the retired direction
// guide. Hand-added sources never match. Never run on the permanent notebook.
const DAILY_SOURCE_TITLE = /^(The Bay Tribune Daily C\d+ — |00_AUDIO_DIRECTION_GUIDE — daily — )/;

function staleDailySourceIds(listJson, keepIds) {
  const keep = new Set(keepIds);
  return sourceRecords(listJson)
    .filter((source) => DAILY_SOURCE_TITLE.test(source.title || '') && !keep.has(source.id))
    .map((source) => source.id);
}

function heldDraftSourceIds(listJson) {
  return sourceRecords(listJson)
    .filter((source) => /^The Bay Tribune Daily C\d+ — gate desk file/.test(source.title || ''))
    .map((source) => source.id);
}

function pruneStaleDailySources(notebookId, listJson, keepIds) {
  const stale = staleDailySourceIds(listJson, keepIds);
  for (let i = 0; i < stale.length; i += 20) {
    const del = nlm(['source', 'delete'].concat(stale.slice(i, i + 20), ['--confirm']), { timeoutMs: 300 * 1000 });
    if (!del.ok) throw new Error('stale source delete failed: ' + del.out.slice(0, 300));
  }
  return stale.length;
}

function addSource(notebookId, file, title) {
  const add = nlm([
    'source', 'add', notebookId,
    '--file', file,
    '--title', title,
    '--wait',
  ], { timeoutMs: 300 * 1000 });
  if (!add.ok) throw new Error('source add failed for "' + title + '": ' + add.out.slice(0, 300));
  return parseAddedSourceId(add.out);
}

// A source this run dir already uploaded (same title, same text) and that is
// still in the notebook is reused; anything else is added.
function reusableSourceId(source, previousSources, existingSources) {
  const present = new Set(sourceRecords(existingSources).map((record) => record.id));
  const prior = (previousSources || []).find((entry) =>
    entry && entry.title === source.title && entry.hash === source.hash && present.has(entry.id));
  return prior ? prior.id : null;
}

// Uploads each daily source on its own. One failed upload is logged and
// skipped — the show goes out on what landed; run() fails only on zero.
function writeDailySources(sourceDir, sources) {
  fs.rmSync(sourceDir, { recursive: true, force: true });
  fs.mkdirSync(sourceDir, { recursive: true });
  for (const source of sources) fs.writeFileSync(path.join(sourceDir, source.name), source.text);
}

function ensureDailySources(notebookId, sources, sourceDir, existingSources, previousSources, add = addSource) {
  const landed = [];
  for (const source of sources) {
    const file = path.join(sourceDir, source.name);
    const entry = {
      kind: source.kind,
      title: source.title,
      hash: source.hash,
      words: source.words,
      file: path.relative(ROOT, file),
      path: source.path,
    };
    const reused = reusableSourceId(source, previousSources, existingSources);
    if (reused) {
      landed.push(Object.assign(entry, { id: reused, reused: true }));
      continue;
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        landed.push(Object.assign(entry, { id: add(notebookId, file, source.title), reused: false }));
        break;
      } catch (e) {
        console.log('DAILY SOURCE ' + (attempt < 2 ? 'RETRY' : 'SKIPPED (non-blocking)') + ': ' + e.message);
      }
    }
  }
  return landed;
}

// Builder 2026-10-17: the listening brief is citizens and the newsroom's reports,
// not initiative plumbing. Drops the world-summary sections that are engine
// diagnostics or civic mechanism (approval ledger, initiative/approval ripples,
// audit findings, the city-hall placeholder) before the text reaches the pack.
const DAILY_NOISE_H2 = /^## (Approval Ratings|Engine Review Findings|Civic Decisions)\b/;
const DAILY_NOISE_H3 = /^### (initiative-implementation|approval-shift)\b/;
const DAILY_NOISE_LINE = /^- fold-applied\/(initiative-implementation|approval-shift)\b/;

function stripDailyNoise(markdown) {
  const out = [];
  let skipping = null;
  for (const line of String(markdown).split('\n')) {
    if (/^## /.test(line)) skipping = DAILY_NOISE_H2.test(line) ? 'h2' : null;
    else if (/^### /.test(line) && skipping !== 'h2') skipping = DAILY_NOISE_H3.test(line) ? 'h3' : null;
    if (!skipping && !DAILY_NOISE_LINE.test(line)) out.push(line);
  }
  return out.join('\n');
}

const EDITION_DAY_CLAUSE = ' This is the run after The Cycle Pulse published; the edition has its own weekly show.' +
  ' Carry the Civis Systems journal\'s reading of the week and what has been written since the edition went to print.';

const FIRST_MORNING_CLAUSE = ' This is the first morning of the Cycle — the cold read on the week that will be,' +
  ' before the desks have reported it; Sunday carried the week that was. Name the Cycle. Lead with who this Cycle' +
  ' happens to, by name, from the engine\'s record of what moved and who lived it; then what citizens said in their' +
  ' own words — the Voices page if it filed, and the daily digest; then the sports feed and the evening texture;' +
  ' civic only as far as its stories trend. Close with what the week ahead holds for the people named.';

function dailyPrompt(cycle, hasFlagged, editionDay, firstMorning) {
  // Gate decisions are no longer part of the news (builder 2026-10-17): they live in
  // the editor's ops report (opsReportPrompt). hasFlagged stays for caller compatibility.
  return 'Prepare The Bay Tribune daily news for Oakland for Cycle ' + cycle +
    ', led by the newsroom\'s own reports, told by reporter, and by what citizens said and lived.' +
    ' Leave out city initiatives, approval ratings, and any engine or audit diagnostics.' +
    ' Drafts the editorial gate held back are not news; do not report on them.' +
    (editionDay ? EDITION_DAY_CLAUSE : '') +
    (firstMorning ? FIRST_MORNING_CLAUSE : '') +
    ' Close with what the newsroom should watch next.';
}

// The editor's daily "report on the data" (Mike-direct 2026-08-23): a
// NotebookLM report artifact over the same bounded source, covering what
// filed, what published, and every newsroom gate decision with a
// holds-up-or-not verdict against the other sources. NOT CANON, same as
// the brief.
function opsReportPrompt(cycle) {
  return 'Bay Tribune ops report for the editor, Cycle ' + cycle + ': what the newsroom filed,' +
    ' what published, and every gate decision. For each FLAGGED draft in the sources, say what' +
    ' it reported, what the gate found, and whether the finding holds up against the other' +
    ' sources. Cover every flagged draft — never skip one. Structured sections, plain prose.';
}

async function createOpsReport(config, cycle, sourceIds, runDir, manifest, manifestPath) {
  const create = nlm([
    'report', 'create', config.newsroomNotebookId,
    '-f', 'Create Your Own',
    '--prompt', opsReportPrompt(cycle),
    '--source-ids', sourceIds.join(','),
    '--confirm',
  ], { timeoutMs: 240 * 1000 });
  if (!create.ok) throw new Error('ops report create failed: ' + create.out.slice(0, 300));
  const artifactId = parseCreatedArtifactId(create.out);
  manifest.opsReportArtifactId = artifactId;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const reportPath = path.join(runDir, 'ops-report-c' + cycle + '.md');
  // `nlm download report` takes no --no-progress (0.15.5): with it every poll
  // exited 2 on usage, so a report that had rendered in a minute was logged as
  // "did not render within 15 minutes" on every run and never reached anyone.
  let lastError = '';
  for (let i = 0; i < AUDIO_RETRY_MAX; i++) {
    await sleep(AUDIO_RETRY_INTERVAL_MS);
    if (artifactStatus(config.newsroomNotebookId, artifactId) === 'failed') {
      throw new Error('ops report render failed on NotebookLM');
    }
    const downloaded = nlm(
      ['download', 'report', config.newsroomNotebookId, '--id', artifactId, '--output', reportPath],
      { timeoutMs: 120 * 1000 }
    );
    if (downloaded.ok && fs.existsSync(reportPath) && fs.statSync(reportPath).size > 0) {
      manifest.opsReportPath = path.relative(ROOT, reportPath);
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      return reportPath;
    }
    lastError = String(downloaded.out || '').replace(/\s+/g, ' ').slice(-200);
  }
  throw new Error('ops report did not download within ' +
    (AUDIO_RETRY_MAX * AUDIO_RETRY_INTERVAL_MS / 60000) + ' minutes; last download said: ' + lastError);
}

// Nothing is said to the hosts: they are given the day's sources and no focus
// (builder 2026-11-11: "Give it sources not direction").

// Returns true (downloaded), 'failed' (NotebookLM marked the render failed —
// stop polling, the caller re-creates), or false (still not ready after the
// poll window).
async function downloadAudio(notebookId, artifactId, audioPath) {
  for (let i = 0; i < AUDIO_RETRY_MAX; i++) {
    await sleep(AUDIO_RETRY_INTERVAL_MS);
    const downloaded = nlm(
      ['download', 'audio', notebookId, '--id', artifactId, '--output', audioPath, '--no-progress'],
      { timeoutMs: 300 * 1000 }
    );
    if (downloaded.ok && fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
      return true;
    }
    if (artifactStatus(notebookId, artifactId) === 'failed') return 'failed';
  }
  return false;
}

// Drive + the NotebookLM notebook are the durable copies of daily audio;
// once a Drive link confirms the upload landed, the local .m4a is scratch.
function deleteLocalAudioIfDelivered(audioPath, driveLink) {
  if (!driveLink || !fs.existsSync(audioPath)) return;
  fs.unlinkSync(audioPath);
  console.log('Local audio deleted (Drive-delivered): ' + path.relative(ROOT, audioPath));
}

async function run(argv) {
  const args = parseArgs(argv);
  if (!fs.existsSync(CONFIG_PATH)) throw new Error('config/notebooklm.json missing');
  if (!fs.existsSync(NLM) && !args.dryRun) throw new Error('nlm CLI not installed at ' + NLM);

  const config = readJson(CONFIG_PATH);
  const latest = latestWorldSummary();
  const cycle = args.cycle || latest.cycle;
  const worldPath = path.join(ROOT, 'output', 'world_summary_c' + cycle + '.md');
  if (!fs.existsSync(worldPath)) throw new Error('world summary missing for Cycle ' + cycle);

  const dailyConfig = config.dailyNews || {};
  const hours = args.hours || dailyConfig.hours || 36;
  const worldSummary = stripDailyNoise(fs.readFileSync(worldPath, 'utf8'));
  let newsroom = args.routingShadow ? null
    : collectNewsroomArtifacts(cycle, hours, Date.now(), ROOT, {
      aired: airedReportTimes(OUTPUT_DIR, Date.now()),
      carryHours: UNAIRED_CARRY_HOURS,
    });

  // pipeline.53: the daily citizen digest is the people-spine of the drop.
  // Build failure must never block the run (same contract as the audio
  // direction guide below) — log and continue without it.
  let citizenDigest = null;
  if (args.routingShadow) {
    const digestPath = path.join(ROOT, 'output', 'citizen-day-digest.md');
    if (fs.existsSync(digestPath)) {
      citizenDigest = { path: path.relative(ROOT, digestPath), text: fs.readFileSync(digestPath, 'utf8') };
      console.log('Citizen day digest: ' + citizenDigest.path + ' (existing local artifact)');
    }
  } else {
    try {
      const { buildDigest } = require('./buildCitizenWeekDigest.js');
      const digest = await buildDigest({ daily: true });
      citizenDigest = { path: path.relative(ROOT, digest.out), text: digest.text, citizens: digest.citizens || [] };
      console.log(
        'Citizen day digest: ' + citizenDigest.path +
        ' (' + citizenDigest.citizens.length + ' citizens, ' + digest.reflections + ' reflections in 24h)'
      );
    } catch (e) {
      console.log('CITIZEN DAY DIGEST SKIPPED (non-blocking): ' + e.message);
    }
  }

  let pulse;
  let routing;
  try {
    pulse = dailyRouter.collectNewsroomPulse({ root: ROOT, cycle, hours, nowMs: Date.now() });
    pulse.materialSignals = dailyRouter.detectMaterialSignals(worldSummary);
    pulse.hasCitizenDigest = Boolean(citizenDigest);
    routing = dailyRouter.routeDailyNews(pulse, {
      reportedDayThreshold: dailyConfig.reportedDayThreshold,
      publishedExtras: newsroom ? newsroom.publishedExtras : 0,
      firstMorning: newsroom ? newsroom.firstMorning === true : false,
    });
    console.log('Daily routing shadow: ' + routing.profile + ' (' + routing.reasonCodes.join(', ') + ')');
  } catch (e) {
    if (args.routingShadow) throw e;
    console.log('DAILY ROUTING SHADOW SKIPPED (non-blocking): ' + e.message);
    pulse = { fingerprint: null, counts: {}, priorCompletedCycle: null };
    routing = {
      version: dailyRouter.ROUTER_VERSION,
      mode: 'shadow',
      profile: null,
      format: null,
      length: null,
      activationEligible: false,
      reportedDayThreshold: null,
      sourceClasses: [],
      reasonCodes: ['PULSE_COLLECTION_FAILED'],
      dispositionCounts: { passed: 0, rheaFlagged: 0, neverGated: 0 },
    };
  }

  if (args.routingShadow) {
    newsroom = {
      reports: reportsFromPulse(pulse),
      flagged: flaggedFromPulse(pulse),
    };
  }

  const pack = buildSourcePack({
    cycle,
    worldSummaryPath: path.relative(ROOT, worldPath),
    worldSummary,
    citizenDigest,
    reports: newsroom.reports,
    flagged: newsroom.flagged,
    pulse: pulse,
    routing: routing,
  });
  const runDir = path.join(OUTPUT_DIR, 'c' + cycle, pack.hash.slice(0, 12));
  const manifestPath = path.join(runDir, 'manifest.json');
  let previousManifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      previousManifest = readJson(manifestPath);
    } catch (_) {
      previousManifest = null;
    }
  }

  if (!args.force && !args.dryRun && !args.resumeLatestAudio &&
      isCompletedManifest(previousManifest)) {
    // Delivered is done: the local audio is deleted after the Drive drop, so
    // its absence is not a reason to render and send the same show again.
    const priorAudioPath = path.join(ROOT, previousManifest.audioPath);
    {
      console.log(
        'NotebookLM daily news unchanged and already complete for C' + cycle +
        ' (' + pack.hash.slice(0, 12) + '); no-op'
      );
      return {
        cycle,
        runDir,
        packHash: pack.hash,
        sourceIds: previousManifest.sourceIds,
        audioPath: priorAudioPath,
        unchanged: true,
      };
    }
  }

  fs.mkdirSync(runDir, { recursive: true });
  const packPath = path.join(runDir, 'source-pack.md');
  fs.writeFileSync(packPath, pack.text);

  const attemptAt = new Date().toISOString();
  const manifest = mergeManifest(previousManifest, {
    artifactClass: 'NLM_DAILY_RUN',
    sourceVersion: SOURCE_VERSION,
    canonStatus: 'NOT_CANON',
    cycle,
    generatedAt: previousManifest && previousManifest.generatedAt
      ? previousManifest.generatedAt
      : attemptAt,
    lastAttemptAt: attemptAt,
    hours,
    packHash: pack.hash,
    worldSummary: path.relative(ROOT, worldPath),
    citizenDigest: citizenDigest ? citizenDigest.path : null,
    reports: newsroom.reports.map((r) => ({
      classification: r.classification,
      path: r.relativePath,
    })),
    flaggedReports: newsroom.flagged.map((r) => r.relativePath),
    editionDay: newsroom.editionDay === true,
    firstMorning: newsroom.firstMorning === true,
    routingShadow: routing,
    newsroomPulse: {
      fingerprint: pulse.fingerprint,
      counts: pulse.counts,
      priorCompletedCycle: pulse.priorCompletedCycle,
    },
    archiveNotebookId: config.notebookId || null,
    newsroomNotebookId: config.newsroomNotebookId || null,
    dryRun: args.dryRun,
  });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Daily source pack: ' + path.relative(ROOT, packPath));

  // pipeline.108: what the hosts get — one small source per article, per
  // neighborhood of reflections, and (first morning) per world-record section.
  const exchanges = exchangeSources(ROOT, Date.now() - hours * 3600e3, airedReportTimes(OUTPUT_DIR, Date.now()));
  if (citizenDigest && citizenDigest.citizens) {
    let pageRows = [];
    try { pageRows = require('./scanCitizenPages').loadIndex(ROOT); }
    catch (e) { console.log('CITIZEN PAGE INDEX UNREAD (the tab\'s lines stand): ' + e.message); }
    const whole = wholeReflections(citizenDigest.citizens, pageRows, exchanges);
    citizenDigest.citizens = whole.citizens;
    console.log(
      'Citizens\' own words: ' + whole.stats.whole + ' taken whole from their pages, ' +
      whole.stats.notOnIndex + ' interview or conversation line(s) not on the page index (the tab\'s line stands), ' +
      whole.stats.inConversation + ' left to the conversation\'s own source'
    );
  }
  const dailyInput = {
    cycle,
    exchanges,
    reports: newsroom.reports,
    citizenDigest,
    worldSummary,
    firstMorning: newsroom.firstMorning === true,
  };
  let dailySources = buildDailySources(dailyInput);
  const sourceDir = path.join(runDir, 'sources');
  writeDailySources(sourceDir, dailySources);
  const kindCounts = {};
  for (const source of dailySources) kindCounts[source.kind] = (kindCounts[source.kind] || 0) + 1;
  console.log('Daily sources: ' + dailySources.length + ' (' +
    Object.keys(kindCounts).map((kind) => kindCounts[kind] + ' ' + kind).join(', ') + '; ' +
    dailySources.reduce((sum, source) => sum + source.words, 0) + ' words) → ' + path.relative(ROOT, sourceDir));

  if (args.dryRun) {
    const presentation = resolveAudioPresentation(routing, config, dailyConfig);
    console.log('Daily program (would deliver): ' +
      ((routing && routing.profile) || 'none') + ' · ' +
      presentation.format + '/' + presentation.length + ' (' + presentation.source + ')');
    if (routing && routing.reasonCodes) {
      console.log('Daily program reasons: ' + routing.reasonCodes.join(', '));
    }
    console.log('NotebookLM daily news dry run complete for C' + cycle);
    return { cycle, runDir, packHash: pack.hash, dryRun: true, routingShadow: routing, audioPresentation: presentation };
  }
  if (!config.notebookId) throw new Error('config has no permanent archive notebookId');
  if (!config.newsroomNotebookId) {
    throw new Error('config has no newsroomNotebookId — create the working daily-news notebook first');
  }

  if (args.resumeLatestAudio) {
    const audioPath = path.join(runDir, 'godworld_daily_c' + cycle + '.m4a');
    // Recovery delivers a render this pipeline recorded, never "whatever the
    // notebook made last": this run dir's own, else the newest undelivered one
    // on disk, whose sources (what that audio was made from) become this
    // manifest's, so airs-once marks what was actually heard.
    // A recovered show is labeled with the Cycle it was made for, and its
    // delivery is written back to the run that made it, so no later recovery
    // sends it again.
    if (manifest.driveLink && !args.force) {
      console.log('NotebookLM daily news: this run\'s audio is already delivered; nothing to recover');
      return { cycle, runDir, packHash: pack.hash, unchanged: true };
    }
    let origin = null;
    if (!manifest.audioArtifactId) {
      origin = latestUndeliveredRender(OUTPUT_DIR);
      if (!origin) throw new Error('no undelivered audio render on record; run without --resume-latest-audio');
      manifest.audioArtifactId = origin.audioArtifactId;
      manifest.audioSources = origin.sources || [];
      manifest.resumedFrom = origin.manifestPath;
      manifest.resumedCycle = origin.cycle;
    }
    const showCycle = (origin && origin.cycle) || cycle;
    const downloaded = nlm(['download', 'audio', config.newsroomNotebookId, '--id', manifest.audioArtifactId,
      '--output', audioPath, '--no-progress'], { timeoutMs: 300 * 1000 });
    if (!downloaded.ok || !fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) {
      throw new Error('latest completed audio could not be downloaded: ' + downloaded.out.slice(0, 400));
    }
    manifest.resumedLatestAudio = true;
    manifest.audioPath = path.relative(ROOT, audioPath);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log('Daily audio resumed: ' + path.relative(ROOT, audioPath));
    if (args.deliver) {
      const delivery = await deliver(audioPath, cycle, config, {
        driveDest: dailyConfig.driveDest || config.driveDest || 'edition',
        label: 'GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + showCycle,
        content: '🎧 **GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + showCycle + '**\n' +
          routingDiscordLine(routing, manifest.audioPresentation),
      });
      manifest.driveLink = delivery && delivery.driveLink ? delivery.driveLink : null;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      if (origin && manifest.driveLink) {
        const made = readJson(origin.manifestFile);
        made.recoveredInto = path.relative(ROOT, manifestPath);
        fs.writeFileSync(origin.manifestFile, JSON.stringify(made, null, 2) + '\n');
      }
      deleteLocalAudioIfDelivered(audioPath, manifest.driveLink);
    }
    console.log('NotebookLM daily news audio recovery complete for C' + cycle);
    return { cycle, runDir, packHash: pack.hash, audioPath, resumedLatestAudio: true };
  }

  if (!dailySources.length) {
    throw new Error('nothing to air for Cycle ' + cycle +
      ': no article, no reflection and no first-morning record in the window');
  }
  // Canon behind each story (builder 2026-11-09 "Yes"; 2026-11-12 "So no canon ???"): the archive answer
  // rides beside its article. It is still written to a question, not a source in its own right; the
  // past pieces themselves as sources is the build that replaces it.
  const backgrounds = fetchArticleBackgrounds(newsroom.reports, path.join(runDir, 'background'));
  if (backgrounds.size) {
    dailySources = buildDailySources(Object.assign({}, dailyInput, { backgrounds }));
    writeDailySources(sourceDir, dailySources);
  }
  console.log('Daily background from the canon notebook: ' + backgrounds.size + ' of ' +
    newsroom.reports.filter(wantsBackground).length + ' article(s)');
  const list = nlm(['source', 'list', config.newsroomNotebookId, '--json']);
  if (!list.ok) throw new Error('working-notebook source list failed: ' + list.out.slice(0, 400));
  const existingSources = parseJsonOutput(list.out, 'working-notebook source list');
  const landed = ensureDailySources(
    config.newsroomNotebookId,
    dailySources,
    sourceDir,
    existingSources,
    previousManifest && previousManifest.sources
  );
  if (!landed.length) {
    throw new Error('no daily source could be added to the working notebook (' + dailySources.length + ' tried)');
  }
  const sourceIds = landed.map((entry) => entry.id);
  manifest.sources = landed;
  manifest.sourceIds = sourceIds;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Working notebook: ' + landed.length + '/' + dailySources.length + ' daily source(s) in (' +
    landed.filter((entry) => entry.reused).length + ' reused)');
  // --source-ids is a hint, not a wall (builder 2026-10-17): the notebook holds
  // only this run's sources before the brief and the audio read it.
  try {
    const pruned = pruneStaleDailySources(config.newsroomNotebookId, existingSources, sourceIds);
    console.log('Working notebook: pruned ' + pruned + ' stale daily source(s)');
  } catch (e) {
    console.log('STALE SOURCE PRUNE SKIPPED (non-blocking): ' + e.message);
  }
  // A leftover day-old article is noise; a leftover gate desk file is held
  // drafts in reach of the hosts (builder 2026-10-17: not news). The show is
  // not made while one is in the notebook.
  const afterPrune = nlm(['source', 'list', config.newsroomNotebookId, '--json']);
  if (!afterPrune.ok) throw new Error('working-notebook source list failed after prune: ' + afterPrune.out.slice(0, 300));
  const heldLeft = heldDraftSourceIds(parseJsonOutput(afterPrune.out, 'working-notebook source list'));
  if (heldLeft.length) {
    const del = nlm(['source', 'delete'].concat(heldLeft, ['--confirm']), { timeoutMs: 300 * 1000 });
    if (!del.ok) throw new Error('a gate desk file (held drafts) is still in the news notebook and could not be removed; no show is made with it there');
  }

  const hasFlagged = newsroom.reports.some((r) => r.classification === 'FLAGGED');
  const prompt = dailyPrompt(cycle, hasFlagged, newsroom.editionDay === true, newsroom.firstMorning === true);
  const briefQuery = nlm([
    'notebook', 'query', config.newsroomNotebookId, prompt,
    '--json', '--source-ids', sourceIds.join(','), '--timeout', '280',
  ], { timeoutMs: 300 * 1000 });
  if (!briefQuery.ok) throw new Error('daily brief query failed: ' + briefQuery.out.slice(0, 400));
  const briefJson = parseJsonOutput(briefQuery.out, 'daily brief query');
  fs.writeFileSync(path.join(runDir, 'daily-brief.json'), JSON.stringify(briefJson, null, 2) + '\n');
  const briefPath = path.join(runDir, 'daily-brief.md');
  fs.writeFileSync(briefPath, [
    '# GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + cycle,
    '',
    'Artifact class: NLM_DAILY_BRIEF',
    'Canon status: NOT CANON. This is a source-grounded newsroom/listening artifact.',
    'Notebook source IDs: ' + sourceIds.join(', '),
    '',
    queryAnswer(briefJson) || '_NotebookLM returned no answer text._',
    '',
  ].join('\n'));
  console.log('Daily written brief: ' + path.relative(ROOT, briefPath));

  let audioPath = null;
  if (args.audio) {
    const presentation = resolveAudioPresentation(routing, config, dailyConfig);
    manifest.audioPresentation = presentation;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log('Daily audio program: ' + (presentation.profile || routing && routing.profile || 'none') +
      ' · ' + presentation.format + '/' + presentation.length + ' (' + presentation.source + ')');
    audioPath = path.join(runDir, 'godworld_daily_c' + cycle + '.m4a');
    // NotebookLM can mark a render `failed` on its side (2026-09-07 08:00: the
    // artifact failed, the download poll ran the full 15 minutes, no audio
    // reached Discord). One re-create on a failed render; a second failure or
    // a timeout still throws.
    let rendered = false;
    for (let attempt = 1; attempt <= AUDIO_CREATE_ATTEMPTS && !rendered; attempt++) {
      const create = nlm([
        'audio', 'create', config.newsroomNotebookId,
        '--format', presentation.format,
        '--length', presentation.length,
        '--source-ids', sourceIds.join(','),
        '--confirm',
      ]);
      if (!create.ok) throw new Error('daily audio create failed: ' + create.out.slice(0, 400));
      const artifactId = parseCreatedArtifactId(create.out);
      // The render's own receipt: what this audio was made from. A later
      // attempt in the same run dir may land a different set in `sources`;
      // airs-once and recovery read this, which only a new render replaces.
      manifest.audioArtifactId = artifactId;
      manifest.audioSources = landed;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      const outcome = await downloadAudio(config.newsroomNotebookId, artifactId, audioPath);
      if (outcome === true) {
        rendered = true;
      } else if (outcome === 'failed') {
        console.log('Daily audio render FAILED on NotebookLM (artifact ' + artifactId +
          ', attempt ' + attempt + '/' + AUDIO_CREATE_ATTEMPTS + ')' +
          (attempt < AUDIO_CREATE_ATTEMPTS ? ' — re-creating' : ''));
        if (attempt === AUDIO_CREATE_ATTEMPTS) {
          throw new Error('daily audio render failed on NotebookLM ' + AUDIO_CREATE_ATTEMPTS +
            ' time(s) (last artifact ' + artifactId + ')');
        }
      } else {
        throw new Error('daily audio did not render within ' +
          (AUDIO_RETRY_MAX * AUDIO_RETRY_INTERVAL_MS / 60000) + ' minutes');
      }
    }
    manifest.audioPath = path.relative(ROOT, audioPath);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log('Daily audio: ' + path.relative(ROOT, audioPath));
  }

  if (args.deliver) {
    if (audioPath) {
      const delivery = await deliver(audioPath, cycle, config, {
        driveDest: dailyConfig.driveDest || config.driveDest || 'edition',
        label: 'GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + cycle,
        content: '🎧 **GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + cycle + '**\n' +
          routingDiscordLine(routing, manifest.audioPresentation),
      });
      manifest.driveLink = delivery && delivery.driveLink ? delivery.driveLink : null;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      deleteLocalAudioIfDelivered(audioPath, manifest.driveLink);
    } else {
      await sendDiscordText(
        '🗞️ **GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + cycle + '**\n' +
        routingDiscordLine(routing, manifest.audioPresentation) +
        '\nWritten brief generated; audio disabled.\n`' +
        path.relative(ROOT, briefPath) + '`'
      );
    }
  }

  // Ops report after the listening drop. Studio `report create` + 30×30s
  // download poll is the 15-minute skip — it must not delay audio.
  let opsReportPath = null;
  let gateDeskId = null;
  try {
    const opsSourceIds = sourceIds.slice();
    const gateDesk = buildGateDeskFile(cycle, newsroom.reports);
    if (gateDesk) {
      const gateDeskPath = path.join(runDir, 'gate-desk-file.md');
      fs.writeFileSync(gateDeskPath, gateDesk);
      gateDeskId = addSource(config.newsroomNotebookId, gateDeskPath, dailySourceTitle(cycle, 'gate desk file'));
      opsSourceIds.push(gateDeskId);
    }
    opsReportPath = await createOpsReport(config, cycle, opsSourceIds, runDir, manifest, manifestPath);
    console.log('Daily ops report: ' + path.relative(ROOT, opsReportPath));
    if (args.deliver) {
      manifest.opsReportDelivered = (await sendDiscordFile(opsReportPath,
        '📋 **Bay Tribune ops report — Cycle ' + cycle + '** (gate desk: every filing and every gate decision)')) === true;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      if (!manifest.opsReportDelivered) console.log('DAILY OPS REPORT NOT SENT: Discord did not take the file');
    }
  } catch (e) {
    console.log('DAILY OPS REPORT SKIPPED (non-blocking): ' + e.message);
  } finally {
    // Held drafts never stay in the news notebook overnight: tomorrow's prune
    // is non-blocking, and a source left here is in reach of tomorrow's hosts.
    if (gateDeskId) {
      const del = nlm(['source', 'delete', gateDeskId, '--confirm'], { timeoutMs: 300 * 1000 });
      if (!del.ok) console.log('GATE DESK FILE NOT REMOVED: ' + del.out.slice(0, 200));
    }
  }

  console.log('NotebookLM daily news complete for C' + cycle);
  return { cycle, runDir, packHash: pack.hash, sourceIds, audioPath };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
    await run(process.argv);
  } catch (e) {
    console.log('NOTEBOOKLM DAILY NEWS FAILED (non-blocking): ' + e.message);
    if (args && args.deliver && !args.dryRun) {
      const authFix = /authentication/i.test(e.message)
        ? '\nFix: `ssh -Y` in from the Chromebook, run `/root/GodWorld/.venv/nlm/bin/nlm login`, finish the Google sign-in, then tell Mags to rerun today (docs/reference/notebookLM-CLI.md)'
        : '';
      await sendDiscordText('⚠️ **GodWorld Daily News did not run**\n' + e.message.slice(0, 500) + authFix);
    }
    process.exitCode = 0;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  cycleFromName,
  artifactStem,
  collectNewsroomArtifacts,
  reportsFromPulse,
  flaggedFromPulse,
  safeToQuoteArticle,
  stableHash,
  mergeManifest,
  isCompletedManifest,
  buildSourcePack,
  stripDailyNoise,
  staleDailySourceIds,
  heldDraftSourceIds,
  buildDailySources,
  buildGateDeskFile,
  reflectionSources,
  wholeReflections,
  worldRecordSources,
  exchangeSources,
  printedStems,
  airedReportTimes,
  latestUndeliveredRender,
  reusableSourceId,
  ensureDailySources,
  wantsBackground,
  backgroundQuestion,
  backgroundSource,
  fetchArticleBackgrounds,
  parseJsonOutput,
  queryAnswer,
  findSourceId,
  parseAddedSourceId,
  parseCreatedArtifactId,
  findArtifactStatus,
  dailySourceTitle,
  dailyPrompt,
  SOURCE_VERSION,
  DEFAULT_AUDIO_LENGTH,
  DEFAULT_AUDIO_FORMAT,
  resolveAudioPresentation,
  routingDiscordLine,
  run,
};
