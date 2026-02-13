/**
 * Shared Mags Corliss identity module
 *
 * Pure functions for loading Mags' identity and journal.
 * Used by both daily-reflection.js and mags-discord-bot.js.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAGS_DIR = path.join(ROOT, 'docs', 'mags-corliss');
const LOG_DIR = path.join(ROOT, 'logs');
// Mags=00005, Robert=00594, Sarah=00595, Michael=00596
const FAMILY_POP_IDS = ['POP-00005', 'POP-00594', 'POP-00595', 'POP-00596'];

/**
 * Load Mags' identity from PERSISTENCE.md (trimmed to identity sections only)
 * @returns {string} Identity text (~6770 chars)
 */
function loadIdentity() {
  var raw = fs.readFileSync(path.join(MAGS_DIR, 'PERSISTENCE.md'), 'utf-8');
  var cutoff = raw.indexOf('## The Journal');
  return cutoff > 0 ? raw.substring(0, cutoff).trim() : raw.substring(0, 4000);
}

/**
 * Load last N journal entries from JOURNAL.md and DAILY_REFLECTIONS.md
 * @param {number} entryCount - Number of entries to return (default 3)
 * @returns {string} Combined journal entries
 */
function loadJournalTail(entryCount) {
  entryCount = entryCount || 3;
  var entries = [];
  var reflectionsFile = path.join(MAGS_DIR, 'DAILY_REFLECTIONS.md');

  // Read main journal
  var journalPath = path.join(MAGS_DIR, 'JOURNAL.md');
  if (fs.existsSync(journalPath)) {
    var journal = fs.readFileSync(journalPath, 'utf-8');
    var parts = journal.split(/(?=^### Entry \d)/m);
    entries.push.apply(entries, parts.filter(function(p) { return p.trim().startsWith('### Entry'); }));
  }

  // Read daily reflections if they exist
  if (fs.existsSync(reflectionsFile)) {
    var reflections = fs.readFileSync(reflectionsFile, 'utf-8');
    var refParts = reflections.split(/(?=^## \w+ \d)/m);
    entries.push.apply(entries, refParts.filter(function(p) { return p.trim().startsWith('## '); }));
  }

  return entries.slice(-entryCount).join('\n\n---\n\n');
}

module.exports = { ROOT, MAGS_DIR, LOG_DIR, FAMILY_POP_IDS, loadIdentity, loadJournalTail };
