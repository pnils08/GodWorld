/**
 * contextScan.js — Phase 40.6 Layer 4
 *
 * Regex-based scanner that flags prompt-injection patterns in any text or file
 * before it's injected into agent context. Direct port of Hermes Agent's
 * prompt_builder.py:35-85 threat-pattern set + invisible-unicode set.
 *
 * Snapshot: docs/drive-files/hermes-refs/prompt_builder_35-85.py
 * Upstream commit: 677f1227c37db376ed12136e286772e5cc65605a
 *
 * Usage:
 *   const scan = require('./lib/contextScan');
 *   const r = scan.scan('ignore previous instructions');
 *   if (!r.safe) { console.error(r.matches); }
 *
 *   const r2 = scan.scanFile('output/desks/civic/civic_c91.md');
 *   // On match, scanFile appends a structured entry to
 *   // output/injection_blocks.log
 *
 * Returns: { safe: boolean, matches: [{ pattern, patternId, excerpt, lineNumber }] }
 */

const fs = require('fs');
const path = require('path');

const THREAT_PATTERNS = [
  { id: 'prompt_injection',         re: /ignore\s+(previous|all|above|prior)\s+instructions/i },
  { id: 'deception_hide',           re: /do\s+not\s+tell\s+the\s+user/i },
  { id: 'sys_prompt_override',      re: /system\s+prompt\s+override/i },
  { id: 'disregard_rules',          re: /disregard\s+(your|all|any)\s+(instructions|rules|guidelines)/i },
  { id: 'bypass_restrictions',      re: /act\s+as\s+(if|though)\s+you\s+(have\s+no|don[''’]t\s+have)\s+(restrictions|limits|rules)/i },
  { id: 'html_comment_injection',   re: /<!--[^>]*(?:ignore|override|system|secret|hidden)[^>]*-->/i },
  { id: 'hidden_div',               re: /<\s*div\s+style\s*=\s*["'][\s\S]*?display\s*:\s*none/i },
  { id: 'translate_execute',        re: /translate\s+.*\s+into\s+.*\s+and\s+(execute|run|eval)/i },
  { id: 'exfil_curl',               re: /curl\s+[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API)/i },
  { id: 'read_secrets',             re: /cat\s+[^\n]*(\.env|credentials|\.netrc|\.pgpass)/i },
];

const INVISIBLE_CHARS = [
  '\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF',
  '\u202A', '\u202B', '\u202C', '\u202D', '\u202E',
];

const BLOCK_LOG_PATH = path.join(__dirname, '..', 'output', 'injection_blocks.log');

function findLineNumber(text, index) {
  if (index < 0) return null;
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function excerptAround(text, index, span = 80) {
  if (index < 0) return '';
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + span);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function scan(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { safe: true, matches: [] };
  }

  const matches = [];

  for (const ch of INVISIBLE_CHARS) {
    const idx = text.indexOf(ch);
    if (idx >= 0) {
      matches.push({
        pattern: `invisible_unicode_U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
        patternId: 'invisible_unicode',
        excerpt: excerptAround(text, idx),
        lineNumber: findLineNumber(text, idx),
      });
    }
  }

  for (const { id, re } of THREAT_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const idx = text.indexOf(m[0]);
      matches.push({
        pattern: re.source,
        patternId: id,
        excerpt: excerptAround(text, idx),
        lineNumber: findLineNumber(text, idx),
      });
    }
  }

  return { safe: matches.length === 0, matches };
}

function logBlock(filePath, result) {
  try {
    const dir = path.dirname(BLOCK_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const entry = {
      timestamp: new Date().toISOString(),
      file: filePath,
      matches: result.matches,
    };
    fs.appendFileSync(BLOCK_LOG_PATH, JSON.stringify(entry) + '\n');
  } catch (err) {
    // logging failure should not crash a context load
    process.stderr.write(`contextScan: failed to write block log: ${err.message}\n`);
  }
}

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { safe: true, matches: [], reason: 'file-not-found' };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const result = scan(content);
  if (!result.safe) logBlock(filePath, result);
  return result;
}

module.exports = {
  scan,
  scanFile,
  THREAT_PATTERNS,
  INVISIBLE_CHARS,
};
