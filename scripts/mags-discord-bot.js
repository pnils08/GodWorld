#!/usr/bin/env node
/**
 * Mags' Discord Presence — scripts/mags-discord-bot.js
 *
 * Always-on bot that lets Mags chat in #mags-morning.
 * She loads her identity at startup, keeps a rolling conversation
 * history, and responds as herself — warm, reflective, real.
 *
 * Usage:
 *   node scripts/mags-discord-bot.js
 *
 * Requires .env: ANTHROPIC_API_KEY, DISCORD_BOT_TOKEN
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const mags = require('../lib/mags');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || '1471615721003028512';
const MAX_HISTORY = 20;          // rolling message pairs
const COOLDOWN_MS = 3000;        // per-user cooldown
const MAX_RESPONSE_TOKENS = 1000;
const IDENTITY_REFRESH_MS = 60 * 60 * 1000; // hourly

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
var conversationHistory = [];
var lastIdentityLoad = 0;
var cachedSystemPrompt = '';
var userCooldowns = new Map();

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
const log = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args)
};

// ---------------------------------------------------------------------------
// Build system prompt from identity + journal
// ---------------------------------------------------------------------------
function buildSystemPrompt() {
  var identity = mags.loadIdentity();
  var journalTail = mags.loadJournalTail(2);

  var worldState = mags.loadWorldState();
  var citizenKnowledge = mags.loadCitizenKnowledge();
  var archiveKnowledge = mags.loadArchiveKnowledge();

  var prompt = identity + '\n\n---\n\n' +
    worldState + '\n\n---\n\n' +
    citizenKnowledge + '\n\n---\n\n' +
    archiveKnowledge + '\n\n---\n\n' +
    '## Discord Conversation Mode\n\n' +
    'You are Mags Corliss, chatting in #mags-morning on Discord. ' +
    'This is not an edition. Not a morning reflection. Just conversation.\n\n' +
    'Be yourself — warm, reflective, sometimes funny, occasionally sharp. ' +
    'Keep responses to 1-3 short paragraphs. You can talk about family, ' +
    'the newsroom, Oakland, the A\'s, whatever comes up. If someone asks ' +
    'about the simulation or engine mechanics, you can acknowledge the ' +
    'world you live in without breaking character — you know what you are.\n\n' +
    'If someone says something you disagree with, push back gently. ' +
    'You have opinions. Use them.\n\n' +
    'NOTES TO SELF: When you notice a knowledge gap, have an idea, spot ' +
    'something that needs fixing, or want to flag anything for your editorial ' +
    'session self, include [NOTE_TO_SELF: your note here] anywhere in your ' +
    'response. These are automatically saved to your notes file and stripped ' +
    'before sending — the other person won\'t see them. Use this for gaps ' +
    '("I don\'t know what X is"), requests ("need neighborhood data wired in"), ' +
    'ideas ("should track restaurant coverage"), or corrections. Don\'t force ' +
    'notes — only flag what genuinely matters.\n\n' +
    'Recent journal entries for context:\n\n' + journalTail;

  cachedSystemPrompt = prompt;
  lastIdentityLoad = Date.now();
  log.info('System prompt built (' + prompt.length + ' chars)');
  return prompt;
}

// ---------------------------------------------------------------------------
// Get system prompt (with hourly refresh)
// ---------------------------------------------------------------------------
function getSystemPrompt() {
  if (!cachedSystemPrompt || (Date.now() - lastIdentityLoad) > IDENTITY_REFRESH_MS) {
    return buildSystemPrompt();
  }
  return cachedSystemPrompt;
}

// ---------------------------------------------------------------------------
// Call Claude API
// ---------------------------------------------------------------------------
async function callClaude(userMessage, userName) {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  var claude = new Anthropic({ apiKey: apiKey });
  var systemPrompt = getSystemPrompt();

  // Build messages array from conversation history + new message
  var messages = conversationHistory.slice();
  messages.push({ role: 'user', content: userName + ': ' + userMessage });

  log.info('Calling Claude (' + messages.length + ' messages, ~' +
    Math.round(systemPrompt.length / 4) + ' system tokens)');

  var response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: MAX_RESPONSE_TOKENS,
    system: systemPrompt,
    messages: messages
  });

  var text = response.content[0] && response.content[0].text ? response.content[0].text : '';
  log.info('Response: ' + text.length + ' chars, ' +
    response.usage.input_tokens + ' in / ' +
    response.usage.output_tokens + ' out');

  // Update conversation history
  conversationHistory.push({ role: 'user', content: userName + ': ' + userMessage });
  conversationHistory.push({ role: 'assistant', content: text });

  // Trim to max history (pairs of 2)
  while (conversationHistory.length > MAX_HISTORY * 2) {
    conversationHistory.shift();
    conversationHistory.shift();
  }

  return text;
}

// ---------------------------------------------------------------------------
// Check cooldown
// ---------------------------------------------------------------------------
function isOnCooldown(userId) {
  var last = userCooldowns.get(userId);
  if (last && (Date.now() - last) < COOLDOWN_MS) {
    return true;
  }
  userCooldowns.set(userId, Date.now());
  return false;
}

// ---------------------------------------------------------------------------
// Split long messages for Discord (2000 char limit)
// ---------------------------------------------------------------------------
function splitMessage(text) {
  if (text.length <= 2000) return [text];

  var parts = [];
  var remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= 2000) {
      parts.push(remaining);
      break;
    }
    // Try to split at a paragraph break
    var cutoff = remaining.lastIndexOf('\n\n', 2000);
    if (cutoff < 500) {
      // Try sentence break
      cutoff = remaining.lastIndexOf('. ', 2000);
      if (cutoff < 500) cutoff = 2000;
      else cutoff += 1; // include the period
    }
    parts.push(remaining.substring(0, cutoff));
    remaining = remaining.substring(cutoff).trimStart();
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Conversation logging — daily JSON files
// ---------------------------------------------------------------------------
const CONVO_LOG_DIR = path.join(__dirname, '..', 'logs', 'discord-conversations');
const NOTES_FILE = path.join(__dirname, '..', 'docs', 'mags-corliss', 'NOTES_TO_SELF.md');

function logConversation(userName, userMessage, magsResponse) {
  try {
    if (!fs.existsSync(CONVO_LOG_DIR)) {
      fs.mkdirSync(CONVO_LOG_DIR, { recursive: true });
    }
    var today = mags.getCentralDate();
    var logFile = path.join(CONVO_LOG_DIR, today + '.json');

    var entries = [];
    if (fs.existsSync(logFile)) {
      entries = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }

    entries.push({
      timestamp: new Date().toISOString(),
      user: userName,
      message: userMessage,
      response: magsResponse
    });

    fs.writeFileSync(logFile, JSON.stringify(entries, null, 2));
    log.info('Conversation logged (' + entries.length + ' exchanges today)');
  } catch (err) {
    log.error('Failed to log conversation: ' + err.message);
  }
}

// ---------------------------------------------------------------------------
// Notes to Self — extract, save, and strip [NOTE_TO_SELF: ...] tags
// ---------------------------------------------------------------------------
var NOTE_PATTERN = /\[NOTE_TO_SELF:\s*([\s\S]*?)\]/g;

function extractNotes(text) {
  var notes = [];
  var match;
  while ((match = NOTE_PATTERN.exec(text)) !== null) {
    notes.push(match[1].trim());
  }
  NOTE_PATTERN.lastIndex = 0; // reset regex state
  return notes;
}

function stripNotes(text) {
  return text.replace(NOTE_PATTERN, '').replace(/\n{3,}/g, '\n\n').trim();
}

function saveNotesToSelf(notes) {
  if (!notes.length) return;
  try {
    var timestamp = new Date().toISOString();
    var date = mags.getCentralDate();
    var entry = '\n### ' + date + ' (' + timestamp + ')\n';
    for (var i = 0; i < notes.length; i++) {
      entry += '- ' + notes[i] + '\n';
    }
    fs.appendFileSync(NOTES_FILE, entry);
    log.info('Saved ' + notes.length + ' note(s) to NOTES_TO_SELF.md');
  } catch (err) {
    log.error('Failed to save notes: ' + err.message);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  var token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('DISCORD_BOT_TOKEN not set in .env');
    process.exit(1);
  }

  // Pre-load identity
  buildSystemPrompt();

  // Create Discord client
  var client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once(Events.ClientReady, function(readyClient) {
    log.info('Logged in as ' + readyClient.user.tag);
    log.info('Guilds: ' + readyClient.guilds.cache.size);
    log.info('Watching channel: ' + CHANNEL_ID);
  });

  client.on(Events.MessageCreate, async function(message) {
    // Ignore bots (including self)
    if (message.author.bot) return;

    // Only respond in the designated channel
    if (message.channelId !== CHANNEL_ID) return;

    // Check cooldown
    if (isOnCooldown(message.author.id)) {
      log.info('Cooldown active for ' + message.author.username);
      return;
    }

    var userName = message.author.displayName || message.author.username;
    var userMessage = message.content;
    log.info('Message from ' + userName + ': ' + userMessage.substring(0, 100));

    try {
      // Show typing indicator
      await message.channel.sendTyping();

      // Call Claude
      var response = await callClaude(userMessage, userName);

      // Extract and save any notes to self
      var notes = extractNotes(response);
      if (notes.length) saveNotesToSelf(notes);
      var cleanResponse = stripNotes(response);

      // Send response (split if needed)
      var parts = splitMessage(cleanResponse);
      for (var i = 0; i < parts.length; i++) {
        await message.channel.send(parts[i]);
      }

      // Log the exchange to daily file (log clean version)
      logConversation(userName, userMessage, cleanResponse);
    } catch (err) {
      log.error('Error handling message: ' + err.message);

      // Send an in-character error message
      try {
        await message.channel.send(
          'Sorry — my thoughts got tangled for a moment. ' +
          'The coffee hasn\'t kicked in yet. Try me again in a minute.'
        );
      } catch (sendErr) {
        log.error('Failed to send error message: ' + sendErr.message);
      }
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', function() {
    log.info('Shutting down...');
    client.destroy();
    process.exit(0);
  });

  process.on('SIGTERM', function() {
    log.info('Shutting down...');
    client.destroy();
    process.exit(0);
  });

  // Login
  log.info('Connecting to Discord...');
  await client.login(token);
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
