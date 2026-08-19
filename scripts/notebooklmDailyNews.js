#!/usr/bin/env node
/**
 * notebooklmDailyNews.js — grounded daily listening brief for GodWorld.
 *
 * Builds one bounded source pack from the latest world summary plus recent
 * newsroom output plus the daily citizen digest (pipeline.53 — verbatim
 * citizen reflections/life texture from buildCitizenWeekDigest.js --daily),
 * asks the permanent published-edition notebook for cited
 * continuity, and gives ONLY that combined source to the working daily-news
 * notebook. The written brief and audio overview are research/listening
 * artifacts, never canon and never an ingestion input.
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
const {
  ROOT,
  NLM,
  nlm,
  sleep,
  deliver,
  sendDiscordText,
} = require('./notebooklmPush');

const CONFIG_PATH = path.join(ROOT, 'config', 'notebooklm.json');
const COMPARE_DIR = path.join(ROOT, 'output', 'cron-compare');
const OUTPUT_DIR = path.join(ROOT, 'output', 'notebooklm', 'daily');
const AUDIO_RETRY_INTERVAL_MS = 30 * 1000;
const AUDIO_RETRY_MAX = 30;
const SOURCE_VERSION = '1.6';
const DEFAULT_AUDIO_LENGTH = 'default';
const DAILY_NEWS_IDENTITY = 'The Bay Tribune daily news for Oakland.';
const DIRECTION_GUIDE_PATH = path.join(ROOT, 'config', 'audio_direction_daily.md');

function parseArgs(argv) {
  const args = {
    hours: null,
    audio: true,
    deliver: true,
    dryRun: false,
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
  return path.basename(file)
    .replace(/\.(?:staged|sample)\.md$/, '')
    .replace(/\.flags\.json$/, '');
}

function collectNewsroomArtifacts(cycle, hours, nowMs) {
  const cutoff = nowMs - hours * 3600e3;
  const records = [];
  const specs = [
    { dir: path.join(COMPARE_DIR, 'staged'), suffix: '.staged.md', classification: 'STAGED' },
    { dir: path.join(COMPARE_DIR, 'samples'), suffix: '.sample.md', classification: 'UNGATED_SAMPLE' },
  ];

  for (const spec of specs) {
    for (const file of walkFiles(spec.dir)) {
      if (!file.endsWith(spec.suffix)) continue;
      const stat = fs.statSync(file);
      const fileCycle = cycleFromName(file);
      if (stat.mtimeMs < cutoff || fileCycle !== cycle) continue;
      records.push({
        classification: spec.classification,
        cycle: fileCycle,
        file,
        relativePath: path.relative(ROOT, file),
        mtimeMs: stat.mtimeMs,
        body: fs.readFileSync(file, 'utf8'),
      });
    }
  }

  const flagged = [];
  const flagDir = path.join(COMPARE_DIR, 'flagged');
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
      relativePath: path.relative(ROOT, file),
      reasonCount: Array.isArray(data.flags) ? data.flags.length
        : Array.isArray(data.issues) ? data.issues.length
          : Array.isArray(data.findings) ? data.findings.length
            : 1,
    });
  }

  flagged.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const flaggedStems = new Set(flagged.map((item) => artifactStem(item.relativePath)));
  const eligible = records
    .filter((record) => !flaggedStems.has(artifactStem(record.relativePath)))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { reports: eligible, flagged };
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
      relativePath: r.relativePath,
      reasonCount: r.reasonCount,
    })),
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
      'This report is ' + (report.classification === 'STAGED'
        ? 'behind the publication gate and is not yet canon.'
        : 'an ungated sample and must not be presented as verified or published fact.'),
      '',
      report.body.trim(),
      ''
    );
  }

  lines.push('## Flagged exclusions', '');
  if (!input.flagged.length) {
    lines.push('_No flagged exclusions in the time window._', '');
  } else {
    for (const item of input.flagged) {
      lines.push(
        '- `' + item.relativePath + '` — excluded from the source pack body; ' +
          item.reasonCount + ' gate finding(s).'
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

function buildBoundedNewsSource(input) {
  const lines = [
    '# The Bay Tribune Daily News — Cycle ' + input.cycle,
    '',
    '## Today’s city record',
    '',
    dailyWorldRecord(input.worldSummary),
    '',
  ];

  if (input.citizenDigest) {
    lines.push(
      '## The people, in their own words',
      '',
      input.citizenDigest.text.trim(),
      ''
    );
  }

  lines.push(
    '## Bay Tribune newsroom reports',
    '',
  );

  if (!input.reports.length) {
    lines.push('_No new newsroom reports were filed for this Cycle._', '');
  }
  for (const report of input.reports) {
    const status = report.classification === 'STAGED'
      ? 'Developing report — edited but not yet published.'
      : 'Developing report — early newsroom sample.';
    lines.push(
      '### ' + reportHeading(report),
      '',
      status,
      '',
      report.body.trim(),
      ''
    );
  }

  lines.push(
    '## Background from the published record',
    '',
    input.archiveAnswer.trim() || '_No additional published background was returned._',
    ''
  );
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

function renderResearchBrief(cycle, queryJson, metadata) {
  const answer = queryAnswer(queryJson);
  const sources = queryJson.sources_used || queryJson.sources || [];
  return [
    '# Published-archive continuity — Cycle ' + cycle,
    '',
    'Artifact class: NLM_RESEARCH_BRIEF',
    'Canon status: NOT CANON. NotebookLM is a reader over published sources; this synthesis does not alter canon.',
    'Archive notebook: ' + metadata.archiveNotebookId,
    'Prompt: ' + metadata.prompt,
    '',
    '## NotebookLM synthesis',
    '',
    answer || '_NotebookLM returned no answer text._',
    '',
    '## Reported source citations',
    '',
    '```json',
    JSON.stringify(sources, null, 2),
    '```',
    '',
  ].join('\n');
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

function sourceTitle(kind, cycle, hash) {
  return 'The Bay Tribune Daily C' + cycle + ' — ' + kind + ' — ' + hash.slice(0, 12);
}

function directionGuideTitle(hash) {
  return '00_AUDIO_DIRECTION_GUIDE — daily — ' + hash.slice(0, 12);
}

function ensureSource(notebookId, file, title, existingSources) {
  const existing = findSourceId(existingSources, title);
  if (existing) return { id: existing, reused: true };
  const add = nlm([
    'source', 'add', notebookId,
    '--file', file,
    '--title', title,
    '--wait',
  ], { timeoutMs: 700 * 1000 });
  if (!add.ok) throw new Error('source add failed for "' + title + '": ' + add.out.slice(0, 400));
  return { id: parseAddedSourceId(add.out), reused: false };
}

function archivePrompt(cycle, reports) {
  const reportHeads = reports.map((report) => {
    const heading = report.body.match(/^#\s+(.+)$/m);
    return '- ' + (heading ? heading[1] : path.basename(report.file));
  }).join('\n');
  return [
    'Using only the published sources in this notebook, prepare a cited continuity brief for Cycle ' + cycle + '.',
    'Trace prior events, promises, named citizens, institutions, and unresolved storylines that bear on these current newsroom leads:',
    reportHeads || '- No current report headlines; identify the most consequential unresolved published storylines entering this Cycle.',
    'Separate direct published fact from inference. Do not invent missing history, quotes, figures, or current-cycle outcomes.',
  ].join('\n');
}

function dailyPrompt(cycle) {
  return 'Prepare The Bay Tribune daily news for Oakland for Cycle ' + cycle +
    ', including the connections that matter and what the newsroom should watch next.';
}

function dailyAudioFocus(hasDirectionGuide) {
  if (!hasDirectionGuide) return DAILY_NEWS_IDENTITY;
  return DAILY_NEWS_IDENTITY +
    ' Follow the 00_AUDIO_DIRECTION_GUIDE source for host persona, tone, and thematic allocation.';
}

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
  const newsroom = collectNewsroomArtifacts(cycle, hours, Date.now());

  // pipeline.53: the daily citizen digest is the people-spine of the drop.
  // Build failure must never block the run (same contract as the audio
  // direction guide below) — log and continue without it.
  let citizenDigest = null;
  try {
    const { buildDigest } = require('./buildCitizenWeekDigest.js');
    const digest = await buildDigest({ daily: true });
    citizenDigest = { path: path.relative(ROOT, digest.out), text: digest.text };
    console.log(
      'Citizen day digest: ' + citizenDigest.path +
      ' (' + digest.vignettes + ' vignettes, ' + digest.reflections + ' reflections in 24h)'
    );
  } catch (e) {
    console.log('CITIZEN DAY DIGEST SKIPPED (non-blocking): ' + e.message);
  }

  const pack = buildSourcePack({
    cycle,
    worldSummaryPath: path.relative(ROOT, worldPath),
    worldSummary: fs.readFileSync(worldPath, 'utf8'),
    citizenDigest,
    reports: newsroom.reports,
    flagged: newsroom.flagged,
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
    const priorAudioPath = path.join(ROOT, previousManifest.audioPath);
    if (fs.existsSync(priorAudioPath) && fs.statSync(priorAudioPath).size > 0) {
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
    flaggedExclusions: newsroom.flagged.map((r) => r.relativePath),
    archiveNotebookId: config.notebookId || null,
    newsroomNotebookId: config.newsroomNotebookId || null,
    dryRun: args.dryRun,
  });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Daily source pack: ' + path.relative(ROOT, packPath));

  if (args.dryRun) {
    console.log('NotebookLM daily news dry run complete for C' + cycle);
    return { cycle, runDir, packHash: pack.hash, dryRun: true };
  }
  if (!config.notebookId) throw new Error('config has no permanent archive notebookId');
  if (!config.newsroomNotebookId) {
    throw new Error('config has no newsroomNotebookId — create the working daily-news notebook first');
  }

  if (args.resumeLatestAudio) {
    const audioPath = path.join(runDir, 'godworld_daily_c' + cycle + '.m4a');
    const downloaded = nlm([
      'download', 'audio', config.newsroomNotebookId,
      '--output', audioPath,
      '--no-progress',
    ], { timeoutMs: 300 * 1000 });
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
        label: 'GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + cycle,
        content: '🎧 **GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + cycle + '**',
      });
      manifest.driveLink = delivery && delivery.driveLink ? delivery.driveLink : null;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      deleteLocalAudioIfDelivered(audioPath, manifest.driveLink);
    }
    console.log('NotebookLM daily news audio recovery complete for C' + cycle);
    return { cycle, runDir, packHash: pack.hash, audioPath, resumedLatestAudio: true };
  }

  const archiveQueryPath = path.join(runDir, 'archive-query.json');
  const archiveBriefPath = path.join(runDir, 'archive-continuity.md');
  const continuityPrompt = archivePrompt(cycle, newsroom.reports);
  let archiveQuery;
  if (fs.existsSync(archiveQueryPath)) {
    archiveQuery = readJson(archiveQueryPath);
  } else {
    // The archive notebook carries 64 sources; a one-line prompt against it
    // measured 69s live on 2026-08-19, so the continuity prompt (which carries
    // the whole newsroom report set) walks straight past a 180s cap. Both the
    // internal and wall budgets are sized off that measurement, not a guess.
    let queried = nlm([
      'notebook', 'query', config.notebookId, continuityPrompt,
      '--json', '--timeout', '420',
    ], { timeoutMs: 480 * 1000 });
    if (!queried.ok) {
      await sleep(30 * 1000);
      queried = nlm([
        'notebook', 'query', config.notebookId, continuityPrompt,
        '--json', '--timeout', '420',
      ], { timeoutMs: 480 * 1000 });
    }
    if (!queried.ok) {
      // Continuity is enrichment, not the story. Three consecutive days of
      // daily news died right here on ETIMEDOUT — the edition was fully built
      // and got thrown away because a background lookup was slow. Degrade to an
      // explicit no-continuity brief and publish. Deliberately NOT written to
      // archive-query.json, so the next run retries the archive instead of
      // inheriting a degraded answer.
      console.log('WARN: published-archive query unavailable — publishing without continuity. '
        + queried.out.slice(0, 200));
      archiveQuery = {
        answer: 'Published-archive continuity was unavailable for this run (archive query timed out). '
          + 'This edition was written from the current cycle pack alone.',
        unavailable: true,
        sources_used: [],
      };
    } else {
      archiveQuery = parseJsonOutput(queried.out, 'published-archive query');
      fs.writeFileSync(archiveQueryPath, JSON.stringify(archiveQuery, null, 2) + '\n');
    }
  }
  const archiveBrief = renderResearchBrief(cycle, archiveQuery, {
    archiveNotebookId: config.notebookId,
    prompt: continuityPrompt,
  });
  fs.writeFileSync(archiveBriefPath, archiveBrief);

  const boundedSourceHash = stableHash({
    sourceVersion: SOURCE_VERSION,
    currentPackHash: pack.hash,
    archiveQuery,
  });
  const boundedSourcePath = path.join(runDir, 'bounded-newsroom-source.md');
  fs.writeFileSync(boundedSourcePath, buildBoundedNewsSource({
    cycle,
    worldSummary: fs.readFileSync(worldPath, 'utf8'),
    citizenDigest,
    reports: newsroom.reports,
    archiveAnswer: queryAnswer(archiveQuery),
  }));

  const list = nlm(['source', 'list', config.newsroomNotebookId, '--json']);
  if (!list.ok) throw new Error('working-notebook source list failed: ' + list.out.slice(0, 400));
  const existingSources = parseJsonOutput(list.out, 'working-notebook source list');
  const boundedSource = ensureSource(
    config.newsroomNotebookId,
    boundedSourcePath,
    sourceTitle('v' + SOURCE_VERSION + ' daily news source', cycle, boundedSourceHash),
    existingSources
  );
  const sourceIds = [boundedSource.id];
  manifest.boundedSourceHash = boundedSourceHash;
  manifest.boundedSource = path.relative(ROOT, boundedSourcePath);
  manifest.sourceIds = sourceIds;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const prompt = dailyPrompt(cycle);
  const briefQuery = nlm([
    'notebook', 'query', config.newsroomNotebookId, prompt,
    '--json', '--source-ids', sourceIds.join(','), '--timeout', '180',
  ], { timeoutMs: 200 * 1000 });
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
    // Audio-direction guide rides ONLY the audio create — the written brief
    // query stays scoped to the bounded source so host direction never leaks
    // into written output (pipeline.51).
    let directionSourceId = null;
    if (fs.existsSync(DIRECTION_GUIDE_PATH)) {
      try {
        const guideHash = stableHash(fs.readFileSync(DIRECTION_GUIDE_PATH, 'utf8'));
        const guide = ensureSource(
          config.newsroomNotebookId,
          DIRECTION_GUIDE_PATH,
          directionGuideTitle(guideHash),
          existingSources
        );
        directionSourceId = guide.id;
        manifest.audioDirectionSourceId = directionSourceId;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      } catch (e) {
        console.log('AUDIO DIRECTION GUIDE SKIPPED (non-blocking): ' + e.message);
      }
    }
    const audioSourceIds = directionSourceId
      ? sourceIds.concat(directionSourceId)
      : sourceIds.slice();
    const audioLength = dailyConfig.audioLength || DEFAULT_AUDIO_LENGTH;
    const create = nlm([
      'audio', 'create', config.newsroomNotebookId,
      '--format', dailyConfig.audioFormat || config.audioFormat || 'deep_dive',
      '--length', audioLength,
      '--source-ids', audioSourceIds.join(','),
      '--focus', dailyAudioFocus(Boolean(directionSourceId)),
      '--confirm',
    ]);
    if (!create.ok) throw new Error('daily audio create failed: ' + create.out.slice(0, 400));
    const artifactId = parseCreatedArtifactId(create.out);
    manifest.audioArtifactId = artifactId;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    audioPath = path.join(runDir, 'godworld_daily_c' + cycle + '.m4a');
    if (!await downloadAudio(config.newsroomNotebookId, artifactId, audioPath)) {
      throw new Error('daily audio did not render within ' +
        (AUDIO_RETRY_MAX * AUDIO_RETRY_INTERVAL_MS / 60000) + ' minutes');
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
        content: '🎧 **GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + cycle + '**',
      });
      manifest.driveLink = delivery && delivery.driveLink ? delivery.driveLink : null;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      deleteLocalAudioIfDelivered(audioPath, manifest.driveLink);
    } else {
      await sendDiscordText(
        '🗞️ **GodWorld Daily News v' + SOURCE_VERSION + ' — Cycle ' + cycle + '**\nWritten brief generated; audio disabled.\n`' +
        path.relative(ROOT, briefPath) + '`'
      );
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
      await sendDiscordText('⚠️ **GodWorld Daily News did not run**\n' + e.message.slice(0, 500));
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
  stableHash,
  mergeManifest,
  isCompletedManifest,
  buildSourcePack,
  buildBoundedNewsSource,
  parseJsonOutput,
  queryAnswer,
  renderResearchBrief,
  findSourceId,
  parseAddedSourceId,
  parseCreatedArtifactId,
  sourceTitle,
  archivePrompt,
  dailyPrompt,
  dailyAudioFocus,
  SOURCE_VERSION,
  DEFAULT_AUDIO_LENGTH,
  DAILY_NEWS_IDENTITY,
  run,
};
