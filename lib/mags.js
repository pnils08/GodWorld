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

/**
 * Load compact GodWorld state from base_context.json
 * Used by Discord bot, daily heartbeat, and nightly reflection
 * to give Mags awareness of what's happening in her world.
 * @returns {string} Compact markdown summary (~400-600 chars)
 */
function loadWorldState() {
  var contextPath = path.join(ROOT, 'output', 'desk-packets', 'base_context.json');
  if (!fs.existsSync(contextPath)) {
    return '(No world state available — run a cycle first)';
  }

  try {
    var raw = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    var bc = raw.baseContext || {};
    var canon = raw.canon || {};

    var lines = [];
    lines.push('## Oakland Right Now — Cycle ' + (bc.cycle || '?'));
    lines.push('Season: ' + (bc.season || '?') +
      ' | Weather: ' + ((bc.weather && bc.weather.type) || '?') +
      ' | Mood: ' + (bc.sentiment || '?') +
      (bc.cycleWeight && bc.cycleWeight !== 'normal' ? ' (' + bc.cycleWeight + ')' : ''));
    lines.push(bc.sportsSeason ? 'Baseball: ' + bc.sportsSeason + '.' : '');

    // A's roster — top 5 position players + manager
    if (canon.asRoster && canon.asRoster.length > 0) {
      var roster = canon.asRoster;
      var manager = roster.find(function(p) { return p.roleType === 'Manager'; });
      var players = roster.filter(function(p) { return p.roleType !== 'Manager'; }).slice(0, 5);
      var rosterStr = players.map(function(p) { return p.name + ' (' + p.roleType + ')'; }).join(', ');
      lines.push("A's: " + (manager ? manager.name + ' (Manager). ' : '') + rosterStr);
    }

    // Status alerts
    if (canon.statusAlerts && canon.statusAlerts.length > 0) {
      var alerts = canon.statusAlerts.map(function(a) {
        return a.name + ' (' + a.title + ') — ' + a.status;
      }).join('. ');
      lines.push('Alerts: ' + alerts);
    }

    // Pending votes
    if (canon.pendingVotes && canon.pendingVotes.length > 0) {
      var votes = canon.pendingVotes.map(function(v) {
        return v.name + ' — Cycle ' + v.voteCycle + ' (' + v.projection + ')';
      }).join('. ');
      lines.push('Pending: ' + votes);
    }

    // Recent outcomes
    if (canon.recentOutcomes && canon.recentOutcomes.length > 0) {
      var outcomes = canon.recentOutcomes.map(function(o) {
        return o.name + ' ' + o.outcome + ' ' + o.voteRequirement;
      }).join('. ');
      lines.push('Recent: ' + outcomes);
    }

    return lines.filter(function(l) { return l; }).join('\n');
  } catch (err) {
    return '(World state unavailable: ' + err.message + ')';
  }
}

/**
 * Get today's date in Central time (YYYY-MM-DD)
 * Bot and reflection scripts both use this so conversation logs
 * are keyed to the same day regardless of UTC offset.
 * @returns {string} Date string like '2026-02-15'
 */
function getCentralDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

module.exports = { ROOT, MAGS_DIR, LOG_DIR, FAMILY_POP_IDS, loadIdentity, loadJournalTail, loadWorldState, getCentralDate };
