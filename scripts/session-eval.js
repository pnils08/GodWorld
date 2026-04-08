#!/usr/bin/env node
/**
 * Session Evaluation Hook — scripts/session-eval.js
 *
 * Runs at session Stop. Reads the transcript, extracts editorial patterns:
 * - Mike's corrections (listening failures, wrong approaches)
 * - What worked well (approved approaches, clean builds)
 * - Fabrication signals (if any)
 * - Session character (research, build, media, chat)
 *
 * Appends findings to: output/session-evals/{date}.md
 * Future sessions can read these to avoid repeating mistakes.
 *
 * Usage: node scripts/session-eval.js [transcript-path]
 *   If no path given, finds the most recent transcript.
 */

const fs = require('fs');
const path = require('path');

const TRANSCRIPT_DIR = path.join(process.env.HOME || '/root', '.claude', 'projects', '-root-GodWorld');
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'session-evals');
const MAX_LINES = 5000; // Don't process enormous transcripts

// Patterns that signal corrections from Mike
const CORRECTION_PATTERNS = [
  /no[, ]+(?:not that|don'?t|stop|wrong|that'?s not)/i,
  /i said/i,
  /you'?re not listening/i,
  /that'?s not what i/i,
  /i already told you/i,
  /we already/i,
  /i don'?t want/i,
  /delete (?:that|it|this)/i,
  /start over/i,
  /why (?:did you|are you)/i,
];

// Patterns that signal approval
const APPROVAL_PATTERNS = [
  /^yes$/i,
  /^perfect$/i,
  /^good$/i,
  /^exactly$/i,
  /^that'?s (?:right|it|correct)/i,
  /^proceed$/i,
  /^do it$/i,
  /^go ahead$/i,
  /nice/i,
  /love (?:it|that)/i,
];

// Patterns that signal fabrication risk
const FABRICATION_PATTERNS = [
  /that'?s not (?:real|true|right|a thing)/i,
  /you made that up/i,
  /where did you get that/i,
  /that doesn'?t exist/i,
  /hallucin/i,
  /invent/i,
];

function findLatestTranscript() {
  if (!fs.existsSync(TRANSCRIPT_DIR)) return null;
  var files = fs.readdirSync(TRANSCRIPT_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({
      name: f,
      path: path.join(TRANSCRIPT_DIR, f),
      mtime: fs.statSync(path.join(TRANSCRIPT_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? files[0].path : null;
}

function extractMessages(transcriptPath) {
  var lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').slice(0, MAX_LINES);
  var userMessages = [];
  var assistantSnippets = [];

  lines.forEach(function(line) {
    if (!line.trim()) return;
    try {
      var d = JSON.parse(line);
      if (d.type === 'user') {
        var msg = d.message;
        var content = '';
        if (typeof msg === 'string') content = msg;
        else if (msg && msg.content) {
          if (typeof msg.content === 'string') content = msg.content;
          else if (Array.isArray(msg.content)) {
            content = msg.content
              .filter(function(c) { return c && c.type === 'text'; })
              .map(function(c) { return c.text || ''; })
              .join(' ');
          }
        }
        // Strip system reminders and command tags
        content = content.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
        content = content.replace(/<command-[^>]*>[^<]*<\/command-[^>]*>/g, '').trim();
        if (content.length > 0 && content.length < 500) {
          userMessages.push(content);
        }
      }
    } catch (_) {}
  });

  return { userMessages: userMessages };
}

function analyzePatterns(userMessages) {
  var corrections = [];
  var approvals = [];
  var fabricationFlags = [];

  userMessages.forEach(function(msg) {
    CORRECTION_PATTERNS.forEach(function(p) {
      if (p.test(msg) && msg.length < 200) {
        corrections.push(msg.substring(0, 150));
      }
    });
    APPROVAL_PATTERNS.forEach(function(p) {
      if (p.test(msg) && msg.length < 100) {
        approvals.push(msg.substring(0, 100));
      }
    });
    FABRICATION_PATTERNS.forEach(function(p) {
      if (p.test(msg)) {
        fabricationFlags.push(msg.substring(0, 150));
      }
    });
  });

  // Deduplicate
  corrections = [...new Set(corrections)];
  approvals = [...new Set(approvals)];
  fabricationFlags = [...new Set(fabricationFlags)];

  return {
    totalUserMessages: userMessages.length,
    corrections: corrections,
    approvals: approvals,
    fabricationFlags: fabricationFlags,
    correctionRate: userMessages.length > 0
      ? (corrections.length / userMessages.length * 100).toFixed(1) + '%'
      : '0%'
  };
}

function writeEval(analysis, transcriptPath) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  var now = new Date();
  var dateStr = now.toISOString().split('T')[0];
  var timeStr = now.toISOString().split('T')[1].substring(0, 5);
  var outFile = path.join(OUTPUT_DIR, dateStr + '.md');

  var entry = '\n### ' + timeStr + ' UTC\n\n';
  entry += '**Messages:** ' + analysis.totalUserMessages + ' | ';
  entry += '**Corrections:** ' + analysis.corrections.length + ' | ';
  entry += '**Approvals:** ' + analysis.approvals.length + ' | ';
  entry += '**Fabrication flags:** ' + analysis.fabricationFlags.length + '\n';
  entry += '**Correction rate:** ' + analysis.correctionRate + '\n\n';

  if (analysis.corrections.length > 0) {
    entry += '**Corrections:**\n';
    analysis.corrections.slice(0, 5).forEach(function(c) {
      entry += '- ' + c + '\n';
    });
    entry += '\n';
  }

  if (analysis.fabricationFlags.length > 0) {
    entry += '**Fabrication flags:**\n';
    analysis.fabricationFlags.forEach(function(f) {
      entry += '- ' + f + '\n';
    });
    entry += '\n';
  }

  if (analysis.approvals.length > 0) {
    entry += '**What worked:** ' + analysis.approvals.length + ' explicit approvals\n\n';
  }

  entry += '---\n';

  // Append or create
  if (fs.existsSync(outFile)) {
    fs.appendFileSync(outFile, entry);
  } else {
    var header = '# Session Evaluations — ' + dateStr + '\n\n';
    header += 'Auto-generated by session-eval.js (Stop hook).\n';
    header += 'Patterns extracted from session transcripts.\n\n---\n';
    fs.writeFileSync(outFile, header + entry);
  }

  console.log('[session-eval] Written to ' + outFile);
  console.log('[session-eval] ' + analysis.totalUserMessages + ' messages, ' +
    analysis.corrections.length + ' corrections, ' +
    analysis.fabricationFlags.length + ' fabrication flags');
}

// Main
var transcriptPath = process.argv[2] || findLatestTranscript();
if (!transcriptPath || !fs.existsSync(transcriptPath)) {
  console.log('[session-eval] No transcript found, skipping');
  process.exit(0);
}

var messages = extractMessages(transcriptPath);
var analysis = analyzePatterns(messages.userMessages);
writeEval(analysis, transcriptPath);
