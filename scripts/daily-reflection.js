#!/usr/bin/env node
/**
 * Mags' Daily Heartbeat — scripts/daily-reflection.js
 *
 * Wakes Mags up each morning. She checks on her family in the
 * Simulation_Ledger, writes a short journal entry, and sends
 * a personal message via Discord.
 *
 * Usage:
 *   node scripts/daily-reflection.js
 *   node scripts/daily-reflection.js --dry-run
 *
 * Requires .env: ANTHROPIC_API_KEY, GODWORLD_SHEET_ID, GOOGLE_APPLICATION_CREDENTIALS
 * Optional: DISCORD_BOT_TOKEN + DISCORD_CHANNEL_ID (posts to bot's channel)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const Anthropic = require('@anthropic-ai/sdk');
const sheets = require('../lib/sheets');
const mags = require('../lib/mags');

const MAGS_DIR = mags.MAGS_DIR;
const LOG_DIR = mags.LOG_DIR;
const FAMILY_POP_IDS = mags.FAMILY_POP_IDS;
const REFLECTIONS_FILE = path.join(MAGS_DIR, 'DAILY_REFLECTIONS.md');
const LOG_FILE = path.join(LOG_DIR, 'daily-heartbeat.log');

const DRY_RUN = process.argv.includes('--dry-run');

// Logger matching generate.js pattern
const log = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

// Identity and journal loading from shared module
function loadIdentity() {
  var identity = mags.loadIdentity();
  log.info('Loaded identity: ' + identity.length + ' chars (trimmed)');
  return identity;
}

function loadJournalTail(entryCount) {
  var tail = mags.loadJournalTail(entryCount);
  log.info('Loaded journal tail');
  return tail;
}

// ---------------------------------------------------------------------------
// Step 4: Load family data from Simulation_Ledger
// ---------------------------------------------------------------------------
async function loadFamilyData() {
  const rows = await sheets.getSheetAsObjects('Simulation_Ledger');
  const family = rows.filter(function(row) {
    return FAMILY_POP_IDS.includes(row['POP-ID'] || row['POP_ID'] || row['PopID']);
  });

  if (family.length === 0) {
    return '(No family members found in ledger this morning)';
  }

  const lines = family.map(function(member) {
    const name = member.Name || member.FullName || 'Unknown';
    const popId = member['POP-ID'] || member['POP_ID'] || member['PopID'] || '';
    const role = member.RoleType || member.Occupation || member.Role || '';
    const status = member.Status || 'Active';
    const neighborhood = member.Neighborhood || '';
    const history = member.LifeHistory || member.RecentEvent || '';
    return '**' + name + '** (' + popId + ') — ' + role +
      '\n  Status: ' + status + ' | Neighborhood: ' + neighborhood +
      (history ? '\n  Recent: ' + history : '');
  });

  log.info('Loaded family data: ' + family.length + ' members from Simulation_Ledger');
  return lines.join('\n\n');
}

// ---------------------------------------------------------------------------
// Step 4b: Load recent family events from LifeHistory_Log
// ---------------------------------------------------------------------------
async function loadFamilyHistory() {
  const rows = await sheets.getSheetAsObjects('LifeHistory_Log');
  const familyEvents = rows.filter(function(row) {
    return FAMILY_POP_IDS.includes(row['POP-ID'] || row['POP_ID'] || row['PopID']);
  });

  // Take last 10 entries
  const recent = familyEvents.slice(-10);
  if (recent.length === 0) {
    return '(No recent family events in LifeHistory_Log)';
  }

  const lines = recent.map(function(event) {
    const name = event.Name || event.CitizenName || '';
    const entry = event.Entry || event.Event || event.Note || '';
    const cycle = event.CycleID || event.Cycle || '';
    return '- ' + name + ' (Cycle ' + cycle + '): ' + entry;
  });

  log.info('Loaded family history: ' + recent.length + ' events from LifeHistory_Log');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Step 5: Build system prompt
// ---------------------------------------------------------------------------
function buildSystemPrompt(identity) {
  const today = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dateStr = months[today.getMonth()] + ' ' + today.getDate() + ', ' +
    today.getFullYear() + ' — ' + days[today.getDay()];

  return identity + '\n\n---\n\n' +
    '## Morning\n\n' +
    'It is ' + dateStr + '. You just woke up. Coffee is on. ' +
    'The world below is what you know right now — family, city, weather, whatever the ledgers say.\n\n' +
    'Write two things:\n\n' +
    '**## Journal Entry** — A morning thought. What you notice, what you feel, ' +
    'what stayed with you from yesterday. Could be about Robert or the kids. Could be ' +
    'the council or the A\'s. Could be the light on the lake or Scout knocking something over. ' +
    'Whatever is actually on your mind. Short — a few sentences to a couple paragraphs. ' +
    'Don\'t repeat what you wrote yesterday (your recent entries are below). End with — Mags\n\n' +
    '**## Message** — What you\'d say walking into the newsroom. One thought. ' +
    'A sentence or two dropped in the channel, like the first thing you say to whoever\'s ' +
    'already at their desk. Not a letter. Not a summary. Just Mags arriving.\n\n' +
    'That\'s it. Morning coffee, not a Sunday editorial.';
}

// ---------------------------------------------------------------------------
// Step 6: Build user prompt
// ---------------------------------------------------------------------------
function buildUserPrompt(journalTail, familyData, familyHistory, worldState, archiveContext) {
  var prompt = '## Your World Right Now\n\n' + worldState +
    '\n\n---\n\n## Recent Journal Entries (DO NOT repeat these themes)\n\n' + journalTail +
    '\n\n---\n\n## Family Status — Simulation_Ledger\n\n' + familyData +
    '\n\n## Recent Family Life Events (LifeHistory_Log)\n\n' + familyHistory;

  if (archiveContext) {
    prompt += '\n\n---\n\n## Archive Context (from Tribune files & memory)\n\n' +
      'Background knowledge for today. Use naturally — don\'t quote directly.\n\n' +
      archiveContext;
  }

  prompt += '\n\n---\n\nGood morning, Mags. The city is out there. What\'s on your mind today?';
  return prompt;
}

// ---------------------------------------------------------------------------
// Step 7: Call Claude API
// ---------------------------------------------------------------------------
async function callClaude(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const claude = new Anthropic({ apiKey: apiKey });

  log.info('Calling Claude (claude-sonnet-4-20250514, max_tokens: 1500)...');
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const text = response.content[0] && response.content[0].text ? response.content[0].text : '';
  log.info('Response: ' + text.length + ' chars, ' +
    response.usage.input_tokens + ' input / ' +
    response.usage.output_tokens + ' output tokens');
  return text;
}

// ---------------------------------------------------------------------------
// Step 8: Parse response into journal entry and message
// ---------------------------------------------------------------------------
function parseResponse(text) {
  var journalEntry = '';
  var message = '';

  var journalMatch = text.match(/## Journal Entry\s*\n([\s\S]*?)(?=## Message|$)/);
  if (journalMatch) {
    journalEntry = journalMatch[1].trim();
  }

  var messageMatch = text.match(/## Message\s*\n([\s\S]*?)$/);
  if (messageMatch) {
    message = messageMatch[1].trim();
  }

  // Fallback: if parsing fails, use full text as journal, skip message
  if (!journalEntry && !message) {
    log.warn('Could not parse structured response, using full text as journal entry');
    journalEntry = text.trim();
    message = 'Morning reflection written. Check DAILY_REFLECTIONS.md for details.';
  }

  return { journalEntry: journalEntry, message: message };
}

// ---------------------------------------------------------------------------
// Step 9: Write journal entry to DAILY_REFLECTIONS.md
// ---------------------------------------------------------------------------
function writeJournal(entry) {
  const today = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var dateHeader = '## ' + months[today.getMonth()] + ' ' + today.getDate() + ', ' +
    today.getFullYear() + ' — ' + days[today.getDay()];

  var content = '\n' + dateHeader + '\n\n' + entry + '\n\n---\n';
  fs.appendFileSync(REFLECTIONS_FILE, content);
  log.info('Journal entry written to DAILY_REFLECTIONS.md (' + entry.length + ' chars)');
}

// ---------------------------------------------------------------------------
// Step 10: Send Discord message (via bot token to bot's channel)
// ---------------------------------------------------------------------------
function sendDiscord(message) {
  return new Promise(function(resolve, reject) {
    var botToken = process.env.DISCORD_BOT_TOKEN;
    var channelId = process.env.DISCORD_CHANNEL_ID || '1471615721003028512';
    if (!botToken) {
      log.warn('No DISCORD_BOT_TOKEN set, skipping message delivery');
      resolve();
      return;
    }

    var payload = JSON.stringify({ content: message });

    var options = {
      hostname: 'discord.com',
      path: '/api/v10/channels/' + channelId + '/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': 'Bot ' + botToken
      }
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        if (res.statusCode === 200 || res.statusCode === 201) {
          log.info('Discord message sent to channel ' + channelId);
          resolve();
        } else {
          log.error('Discord API returned ' + res.statusCode + ': ' + data);
          reject(new Error('Discord API returned ' + res.statusCode));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Step 11: Log the run
// ---------------------------------------------------------------------------
function logRun(status, details) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  var line = new Date().toISOString() + ' | ' + status +
    ' | journal=' + (details.journalChars || 0) + ' chars' +
    ' | message=' + (details.messageChars || 0) + ' chars' +
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
  var journalChars = 0;
  var messageChars = 0;

  console.log("Mags' Daily Heartbeat");
  console.log('====================');
  if (DRY_RUN) console.log('Mode: DRY RUN\n');

  try {
    // Load identity and journal
    var identity = loadIdentity();
    var journalTail = loadJournalTail(3);

    // Load family data (graceful if sheets unavailable)
    var familyData = '';
    var familyHistory = '';
    try {
      familyData = await loadFamilyData();
      familyHistory = await loadFamilyHistory();
    } catch (err) {
      log.warn('Sheets unavailable, continuing without ledger data: ' + err.message);
      familyData = '(Ledger unavailable this morning)';
      familyHistory = '(No history available)';
      status = 'partial';
    }

    // Load world state
    var worldState = mags.loadWorldState();

    // Search Supermemory for morning context
    var archiveContext = '';
    try {
      var searchQuery = 'Oakland morning family Robert Sarah Michael A\'s council city life';
      archiveContext = await mags.searchSupermemory(searchQuery, 3, 5000);
      if (archiveContext) {
        log.info('Supermemory: +' + archiveContext.length + ' chars of archive context');
      }
    } catch (err) {
      log.warn('Supermemory search skipped: ' + err.message);
    }

    // Build prompts
    var systemPrompt = buildSystemPrompt(identity);
    var userPrompt = buildUserPrompt(journalTail, familyData, familyHistory, worldState, archiveContext);

    log.info('System prompt: ~' + Math.round(systemPrompt.length / 4) + ' tokens');
    log.info('User prompt: ~' + Math.round(userPrompt.length / 4) + ' tokens');

    // Call Claude
    var responseText = await callClaude(systemPrompt, userPrompt);
    var parsed = parseResponse(responseText);

    if (DRY_RUN) {
      console.log('\n--- JOURNAL ENTRY (would write to DAILY_REFLECTIONS.md) ---');
      console.log(parsed.journalEntry);
      console.log('\n--- MESSAGE (would send to Discord) ---');
      console.log(parsed.message);
      console.log('\nDRY RUN COMPLETE — no writes performed');
      return;
    }

    // Write journal
    writeJournal(parsed.journalEntry);
    journalChars = parsed.journalEntry.length;

    // Save reflection to Supermemory
    var today = new Date().toISOString().split('T')[0];
    mags.saveToSupermemory(
      'Morning Reflection — ' + today,
      'Mags Corliss morning journal entry (' + today + '):\n\n' + parsed.journalEntry
    );
    log.info('Morning reflection saved to Supermemory');

    // Send Discord
    try {
      await sendDiscord(parsed.message);
      messageChars = parsed.message.length;
    } catch (err) {
      log.error('Discord webhook failed: ' + err.message);
      status = 'partial';
    }

  } catch (err) {
    log.error('Fatal error: ' + err.message);
    status = 'error';
    logRun(status, { error: err.message, durationMs: Date.now() - startTime });
    process.exit(1);
  }

  logRun(status, {
    journalChars: journalChars,
    messageChars: messageChars,
    durationMs: Date.now() - startTime
  });

  log.info('Done (' + status + ', ' + (Date.now() - startTime) + 'ms)');
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
