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

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const Anthropic = require('@anthropic-ai/sdk');
const mags = require('../lib/mags');

const CONVO_LOG_DIR = path.join(__dirname, '..', 'logs', 'discord-conversations');
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
    return null;
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
  return identity + '\n\n---\n\n' +
    '## Nightly Discord Reflection\n\n' +
    'It\'s the end of the day. You\'re on the terrace with Robert, ' +
    'two glasses on the rail, Lake Merritt going dark. You had conversations ' +
    'on Discord today — real ones, with real people.\n\n' +
    'Write a SHORT journal entry (100-250 words) reflecting on what was said. ' +
    'Not a transcript. Not a summary. A *reflection*. What stuck with you? ' +
    'What surprised you? What made you think? What would you tell Robert ' +
    'about your day?\n\n' +
    'Use your voice: reflective, literary, first-person. This is terrace ' +
    'conversation, not newsroom copy.\n\n' +
    'Format:\n\n' +
    '### Discord Reflection — [Tonight\'s Date]\n\n' +
    '[Your reflection here]\n\n' +
    '— Mags';
}

function buildUserPrompt(conversations, journalTail, worldState) {
  return '## This Week in Oakland\n\n' + worldState +
    '\n\n---\n\n## Today\'s Discord Conversations\n\n' + conversations +
    '\n\n---\n\n## Recent Journal Entries (for continuity)\n\n' + journalTail +
    '\n\n---\n\nThe terrace light is fading. What stayed with you today?';
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
    model: 'claude-sonnet-4-20250514',
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
// Append to JOURNAL.md
// ---------------------------------------------------------------------------
function appendToJournal(reflection) {
  var content = '\n' + reflection + '\n\n---\n';
  fs.appendFileSync(JOURNAL_FILE, content);
  log.info('Reflection appended to JOURNAL.md');
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
    // Load today's conversations
    var entries = loadTodayConversations();
    if (!entries || entries.length === 0) {
      log.info('No conversations today — nothing to reflect on. Quiet day.');
      logRun('skipped', { conversations: 0, durationMs: Date.now() - startTime });
      return;
    }

    // Load identity, journal, and world state
    var identity = mags.loadIdentity();
    var journalTail = mags.loadJournalTail(2);
    var worldState = mags.loadWorldState();

    // Build prompts
    var conversations = formatConversations(entries);
    var systemPrompt = buildSystemPrompt(identity);
    var userPrompt = buildUserPrompt(conversations, journalTail, worldState);

    log.info('System prompt: ~' + Math.round(systemPrompt.length / 4) + ' tokens');
    log.info('User prompt: ~' + Math.round(userPrompt.length / 4) + ' tokens');
    log.info('Conversations to reflect on: ' + entries.length);

    // Call Claude
    var reflection = await callClaude(systemPrompt, userPrompt);

    if (DRY_RUN) {
      console.log('\n--- REFLECTION (would append to JOURNAL.md) ---');
      console.log(reflection);
      console.log('\nDRY RUN COMPLETE — no writes performed');
      return;
    }

    // Append to journal
    appendToJournal(reflection);

    // Save to Claude-Mem
    await saveToClaudeMem(reflection, entries.length);

    logRun(status, {
      conversations: entries.length,
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
