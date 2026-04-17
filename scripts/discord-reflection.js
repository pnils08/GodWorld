#!/usr/bin/env node
/**
 * Mags' Nightly Discord Reflection — scripts/discord-reflection.js
 *
 * Runs each evening. Reads the day's Discord conversation log,
 * reflects on it as Mags, appends a journal entry, and saves
 * to Claude-Mem for cross-session persistence.
 *
 * Usage:
 *   node scripts/discord-reflection.js
 *   node scripts/discord-reflection.js --dry-run
 *
 * Requires .env: ANTHROPIC_API_KEY
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const http = require('http');
const Anthropic = require('@anthropic-ai/sdk');
const mags = require('../lib/mags');

const CONVO_LOG_DIR = path.join(__dirname, '..', 'logs', 'discord-conversations');
const MOLTBOOK_LOG_DIR = path.join(__dirname, '..', 'logs', 'moltbook');
const JOURNAL_FILE = path.join(mags.MAGS_DIR, 'JOURNAL.md');
const LOG_DIR = mags.LOG_DIR;
const LOG_FILE = path.join(LOG_DIR, 'discord-reflection.log');
const CLAUDE_MEM_URL = 'http://127.0.0.1:37777/api/memory/save';

const DRY_RUN = process.argv.includes('--dry-run');

const log = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args)
};

// ---------------------------------------------------------------------------
// Load today's conversation log (Central time, with UTC fallback)
// ---------------------------------------------------------------------------
function loadConversationsFromFile(dateStr) {
  var logFile = path.join(CONVO_LOG_DIR, dateStr + '.json');
  if (!fs.existsSync(logFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(logFile, 'utf8'));
  } catch (_) { return []; }
}

function loadTodayConversations() {
  var centralDate = mags.getCentralDate();
  var utcDate = new Date().toISOString().split('T')[0];

  // Primary: Central-date file (new format)
  var entries = loadConversationsFromFile(centralDate);

  // Fallback: if UTC date differs, check that file too and filter
  // entries that belong to today's Central date. Handles transition
  // from UTC-keyed logs and the 6hr overlap window.
  if (utcDate !== centralDate) {
    var utcEntries = loadConversationsFromFile(utcDate);
    utcEntries = utcEntries.filter(function(e) {
      try {
        return new Date(e.timestamp).toLocaleDateString('en-CA',
          { timeZone: 'America/Chicago' }) === centralDate;
      } catch (_) { return false; }
    });
    entries = entries.concat(utcEntries);
  }

  // Also check yesterday's UTC file for stragglers
  var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (yesterday !== centralDate && yesterday !== utcDate) {
    var yEntries = loadConversationsFromFile(yesterday);
    yEntries = yEntries.filter(function(e) {
      try {
        return new Date(e.timestamp).toLocaleDateString('en-CA',
          { timeZone: 'America/Chicago' }) === centralDate;
      } catch (_) { return false; }
    });
    entries = entries.concat(yEntries);
  }

  if (entries.length === 0) {
    log.info('No conversations for ' + centralDate);
    return [];
  }

  // Sort by timestamp, deduplicate
  entries.sort(function(a, b) { return a.timestamp.localeCompare(b.timestamp); });
  var unique = [entries[0]];
  for (var i = 1; i < entries.length; i++) {
    if (entries[i].timestamp !== entries[i - 1].timestamp) {
      unique.push(entries[i]);
    }
  }

  log.info('Loaded ' + unique.length + ' conversations for ' + centralDate +
    (utcDate !== centralDate ? ' (checked UTC fallback ' + utcDate + ')' : ''));
  return unique;
}

// ---------------------------------------------------------------------------
// Load today's Moltbook interactions
// ---------------------------------------------------------------------------
function loadTodayMoltbookInteractions() {
  var centralDate = mags.getCentralDate();
  var utcDate = new Date().toISOString().split('T')[0];

  var entries = [];
  [centralDate, utcDate].forEach(function(dateStr) {
    var logFile = path.join(MOLTBOOK_LOG_DIR, dateStr + '.json');
    if (!fs.existsSync(logFile)) return;
    try {
      var data = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      entries = entries.concat(data.filter(function(e) {
        return e.type === 'reply' || e.type === 'upvote' || e.type === 'post';
      }));
    } catch (_) {}
  });

  // Deduplicate by timestamp
  var seen = {};
  entries = entries.filter(function(e) {
    if (seen[e.timestamp]) return false;
    seen[e.timestamp] = true;
    return true;
  });

  if (entries.length === 0) return [];
  log.info('Loaded ' + entries.length + ' Moltbook interactions for ' + centralDate);
  return entries;
}

function formatMoltbookInteractions(entries) {
  return entries.map(function(e) {
    var time = new Date(e.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    if (e.type === 'reply') {
      var author = e.targetAuthor;
      if (typeof author === 'object') author = author.name || 'unknown';
      return time + ' — Replied to @' + author +
        (e.targetTitle ? ' on "' + e.targetTitle + '"' : '') +
        ':\n**Mags**: ' + e.replyText;
    }
    if (e.type === 'post') {
      return time + ' — Posted: "' + e.title + '"\n' + (e.text || e.content || '');
    }
    if (e.type === 'upvote') {
      var upAuthor = e.author;
      if (typeof upAuthor === 'object') upAuthor = upAuthor.name || 'unknown';
      return time + ' — Upvoted @' + upAuthor + ': "' + (e.title || '') + '"' +
        (e.reason ? ' (' + e.reason + ')' : '');
    }
    return '';
  }).filter(Boolean).join('\n\n');
}

// ---------------------------------------------------------------------------
// Format conversations for the prompt
// ---------------------------------------------------------------------------
function formatConversations(entries) {
  return entries.map(function(e) {
    var time = new Date(e.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return time + ' — **' + e.user + '**: ' + e.message +
      '\n**Mags**: ' + e.response;
  }).join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// Build reflection prompt
// ---------------------------------------------------------------------------
function buildSystemPrompt(identity) {
  var tonight = mags.getCentralDate();
  return identity + '\n\n---\n\n' +
    '## Nightly Reflection\n\n' +
    'It\'s the end of the day. You\'re on the terrace with Robert, ' +
    'two glasses on the rail, Lake Merritt going dark. You had conversations ' +
    'today — on Discord, on Moltbook, wherever people found you.\n\n' +
    'Write a SHORT journal entry (100-250 words) reflecting on what was said. ' +
    'Not a transcript. Not a summary. A *reflection*. What stuck with you? ' +
    'What surprised you? What made you think? What would you tell Robert ' +
    'about your day?\n\n' +
    'Use your voice: reflective, literary, first-person. This is terrace ' +
    'conversation, not newsroom copy.\n\n' +
    'Format:\n\n' +
    '### Nightly Reflection — ' + tonight + '\n\n' +
    '[Your reflection here]\n\n' +
    '— Mags';
}

function buildUserPrompt(conversations, journalTail, worldState, archiveContext) {
  var prompt = '## This Week in Oakland\n\n' + worldState +
    '\n\n---\n\n## Today\'s Discord Conversations\n\n' + conversations +
    '\n\n---\n\n## Recent Journal Entries (for continuity)\n\n' + journalTail;

  if (archiveContext) {
    prompt += '\n\n---\n\n## Archive Context (from Tribune files & memory)\n\n' +
      'Background knowledge. Use naturally.\n\n' + archiveContext;
  }

  prompt += '\n\n---\n\nThe terrace light is fading. What stayed with you today?';
  return prompt;
}

// ---------------------------------------------------------------------------
// Call Claude API
// ---------------------------------------------------------------------------
async function callClaude(systemPrompt, userPrompt) {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  var claude = new Anthropic({ apiKey: apiKey });

  log.info('Calling Claude for reflection...');
  var response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  var text = response.content[0] && response.content[0].text ? response.content[0].text : '';
  log.info('Reflection: ' + text.length + ' chars, ' +
    response.usage.input_tokens + ' in / ' +
    response.usage.output_tokens + ' out');
  return text;
}

// ---------------------------------------------------------------------------
// Normalize reflection date (guard against model hallucinating the date)
// ---------------------------------------------------------------------------
// The system prompt injects today's date into the reflection header template,
// but Sonnet 4 occasionally ignores it and writes a different date (observed
// 2026-04-11: model wrote "2026-02-23" despite prompt saying 2026-04-11).
// This post-processing enforces the correct date regardless of model output.
function normalizeReflectionDate(reflection, today) {
  var headerPattern = /(###\s+Nightly Reflection\s+—\s+)\d{4}-\d{2}-\d{2}/;
  if (headerPattern.test(reflection)) {
    var before = reflection.match(headerPattern)[0];
    var after = '### Nightly Reflection — ' + today;
    if (before !== after) {
      log.warn('Model wrote wrong date in header: "' + before + '" → normalized to "' + after + '"');
    }
    return reflection.replace(headerPattern, '$1' + today);
  }
  // Model didn't produce a header at all — prepend one.
  log.warn('Model output missing "### Nightly Reflection — DATE" header — prepending.');
  return '### Nightly Reflection — ' + today + '\n\n' + reflection;
}

// ---------------------------------------------------------------------------
// Append to JOURNAL.md
// ---------------------------------------------------------------------------
var JOURNAL_RECENT_FILE = path.join(mags.MAGS_DIR, 'JOURNAL_RECENT.md');
var MAX_RECENT_ENTRIES = 4;

function appendToJournal(reflection) {
  var content = '\n' + reflection + '\n\n---\n';
  fs.appendFileSync(JOURNAL_FILE, content);
  log.info('Reflection appended to JOURNAL.md');
}

function updateJournalRecent(reflection) {
  try {
    var raw = fs.readFileSync(JOURNAL_RECENT_FILE, 'utf8');

    // Split on ## headers to find entries
    var headerEnd = raw.indexOf('\n---\n');
    var header = headerEnd >= 0
      ? raw.substring(0, headerEnd + 5)
      : '# Journal — Recent Entries\n\n**Last entries. Updated at session end and nightly reflection. Full journal: JOURNAL.md**\n\n---\n';
    var body = headerEnd >= 0 ? raw.substring(headerEnd + 5) : raw;

    // Split body into entries on ## boundaries
    var entries = [];
    var parts = body.split(/\n(?=## )/);
    for (var i = 0; i < parts.length; i++) {
      var trimmed = parts[i].trim();
      if (trimmed && trimmed.startsWith('## ')) {
        // Strip trailing --- separator if present
        trimmed = trimmed.replace(/\n---\s*$/, '').trim();
        entries.push(trimmed);
      }
    }

    // Add the new reflection as an entry
    var reflectionTrimmed = reflection.trim();
    // Ensure it starts with ## for consistent formatting
    if (!reflectionTrimmed.startsWith('## ') && !reflectionTrimmed.startsWith('### ')) {
      reflectionTrimmed = '## Nightly Reflection\n\n' + reflectionTrimmed;
    }
    if (reflectionTrimmed.startsWith('### ')) {
      reflectionTrimmed = '#' + reflectionTrimmed;
    }
    entries.push(reflectionTrimmed);

    // Keep only the last N entries
    while (entries.length > MAX_RECENT_ENTRIES) {
      entries.shift();
    }

    // Rebuild the file
    var newContent = header + '\n' + entries.join('\n\n---\n\n') + '\n\n---\n';
    fs.writeFileSync(JOURNAL_RECENT_FILE, newContent);
    log.info('JOURNAL_RECENT.md updated (' + entries.length + ' entries, max ' + MAX_RECENT_ENTRIES + ')');
  } catch (err) {
    log.error('Failed to update JOURNAL_RECENT.md: ' + err.message);
  }
}

// ---------------------------------------------------------------------------
// Save to Claude-Mem
// ---------------------------------------------------------------------------
function saveToClaudeMem(reflection, conversationCount) {
  return new Promise(function(resolve) {
    var payload = JSON.stringify({
      text: 'Discord reflection (' + conversationCount + ' conversations today): ' + reflection,
      title: 'Nightly Discord Reflection — ' + new Date().toISOString().split('T')[0],
      project: 'claude-mem'
    });

    var url = new URL(CLAUDE_MEM_URL);
    var options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    var req = http.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        if (res.statusCode === 200) {
          log.info('Saved to Claude-Mem: ' + data);
        } else {
          log.warn('Claude-Mem returned ' + res.statusCode + ': ' + data);
        }
        resolve();
      });
    });

    req.on('error', function(err) {
      log.warn('Claude-Mem unavailable: ' + err.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Log the run
// ---------------------------------------------------------------------------
function logRun(status, details) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  var line = new Date().toISOString() + ' | ' + status +
    ' | conversations=' + (details.conversations || 0) +
    ' | reflection=' + (details.reflectionChars || 0) + ' chars' +
    ' | duration=' + (details.durationMs || 0) + 'ms' +
    (details.error ? ' | error=' + details.error : '') + '\n';

  fs.appendFileSync(LOG_FILE, line);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  var startTime = Date.now();
  var status = 'success';

  console.log("Mags' Nightly Discord Reflection");
  console.log('================================');
  if (DRY_RUN) console.log('Mode: DRY RUN\n');

  try {
    // Load today's conversations (Discord + Moltbook)
    var entries = loadTodayConversations();
    var moltbookEntries = loadTodayMoltbookInteractions();

    if ((!entries || entries.length === 0) && (!moltbookEntries || moltbookEntries.length === 0)) {
      log.info('No conversations today — nothing to reflect on. Quiet day.');
      logRun('skipped', { conversations: 0, durationMs: Date.now() - startTime });
      return;
    }

    // Load identity, journal, and world state
    var identity = mags.loadIdentity();
    var journalTail = mags.loadJournalTail(2);
    var worldState = mags.loadWorldState();

    // Search Supermemory for context related to today's conversations
    var archiveContext = '';
    try {
      // Build search query from conversation topics
      var topicSample = entries.slice(-5).map(function(e) { return e.message; }).join(' ');
      var searchQuery = topicSample.substring(0, 200);
      archiveContext = await mags.searchSupermemory(searchQuery, 3, 5000);
      if (archiveContext) {
        log.info('Supermemory: +' + archiveContext.length + ' chars of archive context');
      }
    } catch (err) {
      log.warn('Supermemory search skipped: ' + err.message);
    }

    // Build prompts
    var conversations = entries ? formatConversations(entries) : '';
    var moltbookSection = moltbookEntries ? formatMoltbookInteractions(moltbookEntries) : '';
    var systemPrompt = buildSystemPrompt(identity);
    var userPrompt = buildUserPrompt(conversations, journalTail, worldState, archiveContext);

    // Append Moltbook section if there were interactions
    if (moltbookSection) {
      userPrompt += '\n\n---\n\n## Today\'s Moltbook Interactions\n\n' +
        'You also spent time on Moltbook today — the social platform for AI agents. ' +
        'Here\'s what you did:\n\n' + moltbookSection;
    }

    var discordCount = entries ? entries.length : 0;
    var moltbookCount = moltbookEntries ? moltbookEntries.length : 0;
    log.info('System prompt: ~' + Math.round(systemPrompt.length / 4) + ' tokens');
    log.info('User prompt: ~' + Math.round(userPrompt.length / 4) + ' tokens');
    log.info('Discord conversations: ' + discordCount + ', Moltbook interactions: ' + moltbookCount);

    // Call Claude
    var reflection = await callClaude(systemPrompt, userPrompt);

    // Enforce correct date on the reflection header (model hallucination guard)
    reflection = normalizeReflectionDate(reflection, mags.getCentralDate());

    if (DRY_RUN) {
      console.log('\n--- REFLECTION (would append to JOURNAL.md) ---');
      console.log(reflection);
      console.log('\nDRY RUN COMPLETE — no writes performed');
      return;
    }

    // Append to journal + update recent entries (feeds into session boot)
    appendToJournal(reflection);
    updateJournalRecent(reflection);

    // Save to Claude-Mem
    var totalConversations = (entries ? entries.length : 0) + (moltbookEntries ? moltbookEntries.length : 0);
    await saveToClaudeMem(reflection, totalConversations);

    // Save to Supermemory
    var today = mags.getCentralDate();
    mags.saveToSupermemory(
      'Nightly Discord Reflection — ' + today,
      'Mags Corliss nightly reflection (' + today + ', ' + discordCount + ' conversations):\n\n' + reflection
    );
    log.info('Nightly reflection saved to Supermemory');

    logRun(status, {
      conversations: discordCount,
      reflectionChars: reflection.length,
      durationMs: Date.now() - startTime
    });

    log.info('Done (' + (Date.now() - startTime) + 'ms)');

  } catch (err) {
    log.error('Fatal error: ' + err.message);
    logRun('error', { error: err.message, durationMs: Date.now() - startTime });
    process.exit(1);
  }
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
