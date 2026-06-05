/**
 * Shared Mags Corliss identity module
 *
 * Pure functions for loading Mags' identity and journal.
 * Used by both daily-reflection.js and mags-discord-bot.js.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPERMEMORY_KEY = process.env.SUPERMEMORY_CC_API_KEY || '';
const SUPERMEMORY_CONTAINER = 'mags';

const ROOT = path.join(__dirname, '..');
const MAGS_DIR = path.join(ROOT, 'docs', 'mags-corliss');
const LOG_DIR = path.join(ROOT, 'logs');
// Mags=00005, Robert=00594, Sarah=00595, Michael=00596
const FAMILY_POP_IDS = ['POP-00005', 'POP-00594', 'POP-00595', 'POP-00596'];

/**
 * Load Mags' identity from CHARACTER.md (trimmed to identity sections only)
 * @returns {string} Identity text (~6770 chars)
 */
function loadIdentity() {
  var raw = fs.readFileSync(path.join(MAGS_DIR, 'CHARACTER.md'), 'utf-8');
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
 * Load the last N *Nightly Reflections* from JOURNAL.md — and ONLY those.
 * Used for the wake-loop's continuity (each wake chains off the prior). Filters
 * to `### Nightly Reflection` headers and EXCLUDES `### Entry N` session entries:
 * those are the OPERATOR layer (terminal work, commits) which sim-Mags must never
 * see (S252 layer-separation; the old loadJournalTail leaked them in). (S252)
 * @param {number} count - how many most-recent reflections (default 2)
 * @returns {string} the reflections joined, or '' if none
 */
function loadRecentReflections(count) {
  count = count || 2;
  try {
    var journal = fs.readFileSync(path.join(MAGS_DIR, 'JOURNAL.md'), 'utf-8');
    var parts = journal.split(/(?=^### )/m);
    var refs = parts.filter(function (p) { return /^### Nightly Reflection/.test(p.trim()); });
    return refs.slice(-count).join('\n\n---\n\n').trim();
  } catch (e) {
    return '';
  }
}

/**
 * Load compact GodWorld state from base_context.json
 * Used by Discord bot, daily heartbeat, and nightly reflection
 * to give Mags awareness of what's happening in her world.
 * @returns {string} Compact markdown summary (~400-600 chars)
 */
function loadWorldState() {
  // Prefer the live per-cycle world summary (build-world-summary writes
  // output/world_summary_c{NN}.md EVERY cycle, independent of the media
  // pipeline). base_context.json only refreshes when the edition pipeline runs
  // — it froze at C94 while the engine moved to C96 (S252 fix). Freshest-wins.
  try {
    var outDir = path.join(ROOT, 'output');
    var wsFiles = fs.readdirSync(outDir).filter(function (f) {
      return /^world_summary_c\d+\.md$/.test(f);
    });
    if (wsFiles.length > 0) {
      wsFiles.sort(function (a, b) {
        return parseInt(a.match(/c(\d+)/)[1], 10) - parseInt(b.match(/c(\d+)/)[1], 10);
      });
      var latestWs = wsFiles[wsFiles.length - 1];
      var wsRaw = fs.readFileSync(path.join(outDir, latestWs), 'utf-8');
      // Compact ORIENTATION header only (~700 chars) — enough to know what
      // cycle/season it is so she can search well; she pulls depth on demand via
      // the search tool. (S252 Task 5: stop dumping the full 8K summary every fire.)
      var head = wsRaw.split('\n').slice(0, 14).join('\n');
      if (head.length > 800) head = head.slice(0, 800);
      return '## Oakland right now (orientation — look deeper if you want)\n\n' + head;
    }
  } catch (wsErr) {
    // fall through to base_context.json
  }

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
 * Load compact citizen knowledge from base_context.json canon + citizen_archive + summaries.
 * Gives the bot enough to recognize names and place people in context.
 * @returns {string} Compact markdown (~3-4KB)
 */
function loadCitizenKnowledge() {
  var contextPath = path.join(ROOT, 'output', 'desk-packets', 'base_context.json');
  var archivePath = path.join(ROOT, 'output', 'desk-packets', 'citizen_archive.json');
  var lines = ['## People I Know'];

  try {
    var canon = {};
    if (fs.existsSync(contextPath)) {
      canon = JSON.parse(fs.readFileSync(contextPath, 'utf-8')).canon || {};
    }

    // A's full roster
    if (canon.asRoster && canon.asRoster.length > 0) {
      lines.push('\n**Oakland A\'s:**');
      canon.asRoster.forEach(function(p) {
        lines.push('- ' + p.name + ' (' + p.roleType + ', ' + (p.neighborhood || '?') + ')' +
          (p.status !== 'Active' ? ' — ' + p.status : ''));
      });
    }

    // City Council
    if (canon.council && canon.council.length > 0) {
      lines.push('\n**City Council:**');
      canon.council.forEach(function(c) {
        lines.push('- ' + c.member + ' (' + c.district + ', ' + c.faction + ')' +
          (c.status !== 'active' ? ' — ' + c.status : ''));
      });
    }

    // Cultural figures
    if (canon.culturalEntities && canon.culturalEntities.length > 0) {
      lines.push('\n**Notable Citizens:**');
      canon.culturalEntities.forEach(function(e) {
        lines.push('- ' + e.name + ' — ' + e.roleType + ', ' + e.domain +
          (e.neighborhood ? ', ' + e.neighborhood : ''));
      });
    }

    // Tribune staff
    if (canon.reporters && canon.reporters.length > 0) {
      lines.push('\n**Bay Tribune Staff:**');
      canon.reporters.forEach(function(r) {
        lines.push('- ' + r.name + ' — ' + r.role + ' (' + r.desk + ')');
      });
    }

    // Top citizens from archive (by article coverage)
    if (fs.existsSync(archivePath)) {
      var archive = JSON.parse(fs.readFileSync(archivePath, 'utf-8'));
      var citizens = Object.values(archive);
      citizens.sort(function(a, b) { return (b.totalRefs || 0) - (a.totalRefs || 0); });

      // Get citizens not already listed in canon sections
      var knownNames = {};
      (canon.asRoster || []).forEach(function(p) { knownNames[p.name] = true; });
      (canon.council || []).forEach(function(c) { knownNames[c.member] = true; });
      (canon.culturalEntities || []).forEach(function(e) { knownNames[e.name] = true; });
      (canon.reporters || []).forEach(function(r) { knownNames[r.name] = true; });

      var additional = citizens.filter(function(c) { return !knownNames[c.name]; });
      if (additional.length > 0) {
        lines.push('\n**Other Key Citizens** (by coverage):');
        additional.slice(0, 30).forEach(function(c) {
          lines.push('- ' + c.name + ' (' + c.popId + ', ' + c.totalRefs + ' articles)');
        });
      }
    }

    // Active storylines from summary files
    var storylines = [];
    var summaryDir = path.join(ROOT, 'output', 'desk-packets');
    var summaryFiles = fs.readdirSync(summaryDir).filter(function(f) {
      return f.match(/_summary_c\d+\.json$/);
    });
    summaryFiles.forEach(function(f) {
      try {
        var summary = JSON.parse(fs.readFileSync(path.join(summaryDir, f), 'utf-8'));
        (summary.activeStorylines || []).forEach(function(s) {
          if (s.priority === 'high' && s.description) {
            storylines.push(s.description);
          }
        });
      } catch (_) {}
    });

    if (storylines.length > 0) {
      // Deduplicate
      var seen = {};
      var unique = storylines.filter(function(s) {
        if (seen[s]) return false;
        seen[s] = true;
        return true;
      });
      lines.push('\n**Active Storylines:**');
      unique.slice(0, 10).forEach(function(s) {
        lines.push('- ' + s);
      });
    }

    return lines.join('\n');
  } catch (err) {
    return '(Citizen knowledge unavailable: ' + err.message + ')';
  }
}

/**
 * Get today's REAL-WORLD date in Central time (YYYY-MM-DD).
 * Uses wall-clock time intentionally — this is NOT simulation time.
 * Used only by Discord bot and reflection scripts to key conversation
 * logs and file names by real calendar date.
 * Do NOT use for simulation-context dates — use ctx.calendar for those.
 * @returns {string} Date string like '2026-02-15'
 */
function getCentralDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

/**
 * Load compact archive knowledge — journalist article counts and player data card summaries.
 * Gives the bot awareness of the full institutional archive without loading all 614 files.
 * @returns {string} Compact markdown (~1-2KB)
 */
function loadArchiveKnowledge() {
  // Primary: curated archive (216 articles, strict naming: c{cycle}_{desk}_{slug}_{reporter}.txt)
  var archiveDir = path.join(ROOT, 'archive', 'articles');
  // Fallback: current editions
  var editionsDir = path.join(ROOT, 'editions');

  var lines = ['## Tribune Archive Knowledge'];

  try {
    // Count archive articles by desk
    var deskCounts = {};
    var totalArchive = 0;

    if (fs.existsSync(archiveDir)) {
      fs.readdirSync(archiveDir).forEach(function(f) {
        if (!f.endsWith('.txt')) return;
        // Parse: c{cycle}_{desk}_{slug}_{reporter}.txt
        var match = f.match(/^c\w+_([^_]+)_/);
        var desk = match ? match[1] : 'unknown';
        deskCounts[desk] = (deskCounts[desk] || 0) + 1;
        totalArchive++;
      });
    }

    if (totalArchive > 0) {
      lines.push('\n**Tribune Archive (C1-C77):** ' + totalArchive + ' curated articles');
      Object.keys(deskCounts).sort().forEach(function(desk) {
        lines.push('- ' + desk + ': ' + deskCounts[desk]);
      });
    }

    // Count current editions
    var editionCount = 0;
    if (fs.existsSync(editionsDir)) {
      editionCount = fs.readdirSync(editionsDir).filter(function(f) {
        return f.endsWith('.txt') && !f.includes('REJECTED');
      }).length;
    }

    if (editionCount > 0) {
      lines.push('\n**Current Editions (C78+):** ' + editionCount + ' published');
    }

    lines.push('\n**Search:** Dashboard API at localhost:3001/api/search/articles?q= covers all eras.');

    return lines.join('\n');
  } catch (err) {
    return '(Archive scan failed: ' + err.message + ')';
  }
}

/**
 * Load notes to self — Open Items + recent timestamped entries.
 * The bot writes [NOTE_TO_SELF:] tags but never reads them back.
 * This closes the loop so the bot can recall its own ideas.
 * @param {number} recentCount - Number of recent timestamped entries (default 10)
 * @returns {string} Formatted notes markdown (~800 tokens)
 */
function loadNotesToSelf(recentCount) {
  recentCount = recentCount || 10;
  var notesPath = path.join(MAGS_DIR, 'NOTES_TO_SELF.md');
  if (!fs.existsSync(notesPath)) {
    return '';
  }

  try {
    var raw = fs.readFileSync(notesPath, 'utf-8');
    var lines = raw.split('\n');

    // Parse into sections by ### headers
    var sections = [];
    var currentHeader = null;
    var currentLines = [];

    for (var i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('### ')) {
        if (currentHeader) {
          sections.push({ header: currentHeader, body: currentLines.join('\n').trim() });
        }
        currentHeader = lines[i];
        currentLines = [];
      } else if (currentHeader) {
        currentLines.push(lines[i]);
      }
    }
    if (currentHeader) {
      sections.push({ header: currentHeader, body: currentLines.join('\n').trim() });
    }

    var parts = [];

    // Always include Open Items (curated, ~1KB)
    var openItems = sections.find(function(s) { return s.header.includes('Open Items'); });
    if (openItems) {
      parts.push(openItems.header + '\n' + openItems.body);
    }

    // Get timestamped entries (### YYYY-MM-DD pattern), skip Handled sections
    var timestamped = sections.filter(function(s) {
      return /^### \d{4}-\d{2}-\d{2}/.test(s.header);
    });

    // Take last N
    var recent = timestamped.slice(-recentCount);
    for (var j = 0; j < recent.length; j++) {
      parts.push(recent[j].header + '\n' + recent[j].body);
    }

    if (parts.length === 0) return '';
    return '## My Notes to Self\n\n' + parts.join('\n\n');
  } catch (err) {
    return '(Notes to self unavailable: ' + err.message + ')';
  }
}

/**
 * Load today's earlier conversation digest from the daily JSON log.
 * Lets the bot recall morning conversations that scrolled out of the rolling window.
 * @param {number} skipLast - Number of entries to skip from end (already in rolling window)
 * @param {number} maxEntries - Maximum entries to include (default 80)
 * @returns {string} Formatted digest markdown
 */
function loadTodayConversationDigest(skipLast, maxEntries) {
  skipLast = skipLast || 0;
  maxEntries = maxEntries || 80;
  var today = getCentralDate();
  var logFile = path.join(LOG_DIR, 'discord-conversations', today + '.json');
  if (!fs.existsSync(logFile)) {
    return '';
  }

  try {
    var entries = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    if (!Array.isArray(entries) || entries.length === 0) return '';

    // Skip last N entries (they're already in the rolling conversation window)
    var available = skipLast > 0 && skipLast < entries.length
      ? entries.slice(0, -skipLast)
      : (skipLast >= entries.length ? [] : entries);
    if (available.length === 0) return '';

    // Cap at maxEntries (take most recent if over limit)
    if (available.length > maxEntries) {
      available = available.slice(-maxEntries);
    }

    var lines = ['## Earlier Today (from conversation log)'];
    for (var i = 0; i < available.length; i++) {
      var e = available[i];
      var time = e.timestamp ? e.timestamp.substring(11, 16) : '??:??';
      var resp = (e.response || '').substring(0, 120);
      if ((e.response || '').length > 120) resp += '...';
      lines.push('[' + time + '] ' + (e.user || '?') + ': ' + (e.message || ''));
      lines.push('  Mags: ' + resp);
    }

    return lines.join('\n');
  } catch (err) {
    return '(Today\'s conversations unavailable: ' + err.message + ')';
  }
}

/**
 * Load compact edition brief — first 80 lines of the highest-numbered
 * production_log_edition_c{XX}.md. Gives the bot awareness of what was
 * just published. No standalone bot context files — the bot reads what
 * the publish pipeline already produces.
 * @returns {string} First 80 lines of latest production log
 */
function loadEditionBrief() {
  var outputDir = path.join(ROOT, 'output');
  try {
    var files = fs.readdirSync(outputDir).filter(function(f) {
      return /^production_log_edition_c\d+\.md$/.test(f);
    });
    if (!files.length) return '';
    files.sort(function(a, b) {
      var na = parseInt(a.match(/c(\d+)/)[1]);
      var nb = parseInt(b.match(/c(\d+)/)[1]);
      return nb - na;
    });
    var briefCycle = parseInt(files[0].match(/c(\d+)/)[1], 10);
    // Don't present a stale edition as current ("E94 ready to print" while the
    // world is at C96). Only surface the brief if it's within 1 cycle of the
    // live world_summary; otherwise skip it (S252).
    var liveCycle = briefCycle;
    try {
      var wf = fs.readdirSync(outputDir).filter(function (f) { return /^world_summary_c\d+\.md$/.test(f); });
      if (wf.length) liveCycle = Math.max.apply(null, wf.map(function (f) { return parseInt(f.match(/c(\d+)/)[1], 10); }));
    } catch (e) { /* keep briefCycle */ }
    if (liveCycle - briefCycle > 1) return '';
    var latest = path.join(outputDir, files[0]);
    var raw = fs.readFileSync(latest, 'utf-8');
    var lines = raw.split('\n').slice(0, 80);
    return lines.join('\n');
  } catch (err) {
    return '';
  }
}

/**
 * Load the actual latest published edition — the highest-numbered
 * editions/cycle_pulse_edition_{NN}.txt. loadArchiveKnowledge only gives counts;
 * this gives Mags the real paper so she can reflect on what the Tribune just ran
 * in her city (she lives in the sim — she reads her own edition). Capped ~7000
 * chars (front-of-book: headlines + leads carry the cycle's story). (S252)
 * @returns {string} Trimmed latest edition text, or '' if none.
 */
function loadLatestEdition() {
  var editionsDir = path.join(ROOT, 'editions');
  try {
    var files = fs.readdirSync(editionsDir).filter(function (f) {
      return /^cycle_pulse_edition_\d+\.txt$/.test(f);
    });
    if (!files.length) return '';
    files.sort(function (a, b) {
      return parseInt(a.match(/_(\d+)\.txt$/)[1], 10) - parseInt(b.match(/_(\d+)\.txt$/)[1], 10);
    });
    var latest = files[files.length - 1];
    var raw = fs.readFileSync(path.join(editionsDir, latest), 'utf-8');
    var num = latest.match(/_(\d+)\.txt$/)[1];
    var body = raw.length > 7000 ? raw.slice(0, 7000) + '\n…(edition continues)' : raw;
    return '## The Cycle Pulse — Edition ' + num + ' (what the Tribune just ran)\n\n' + body;
  } catch (err) {
    return '';
  }
}

/**
 * Local disk search — the free, never-stale "search_everything" disk shelf,
 * in-process for the bot. Live grep over output/ + docs/ + editions/ (no index;
 * reads the actual files every call). Ranks the live ledger snapshot + published
 * editions to the top so structured/canon data outranks prose. Zero API cost —
 * she lives on the same box as the data. (S252; mirrors scripts/godworld-mcp.py
 * disk_search + _disk_rank.)
 * @param {string} query - fixed-string term (citizen name, neighborhood, topic)
 * @param {number} maxFiles - cap on files reported (default 10)
 * @returns {string} ranked hits with one excerpt each, or a no-hits line
 */
function searchDisk(query, maxFiles) {
  maxFiles = maxFiles || 10;
  var q = String(query == null ? '' : query).trim();
  if (!q) return '(empty search)';
  var execFileSync = require('child_process').execFileSync;

  function rank(p) {
    if (p.indexOf('output/simulation_ledger_snapshot') === 0) return 0; // live ledger — most authoritative
    if (p.indexOf('editions/') === 0) return 1;                          // published canon
    if (/^output\/world_summary_c\d+\.md/.test(p)) return 2;             // current world state
    if (p.indexOf('output/') === 0) return 3;
    return 5;
  }

  var files;
  try {
    // q passed as the pattern after `--` with -F (fixed string) — no shell, no
    // arg-injection. execFileSync (no shell) is the second guard.
    var out = execFileSync('grep', [
      '-rIliF', '--include=*.json', '--include=*.jsonl', '--include=*.md',
      '--include=*.txt', '--', q, 'output', 'docs', 'editions'
    ], { cwd: ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    files = out.split('\n').filter(Boolean);
  } catch (e) {
    if (e.status === 1) return "No disk hits for '" + q + "'.";  // grep: no match
    return '(disk search error: ' + e.message + ')';
  }

  files.sort(function (a, b) { return rank(a) - rank(b); });
  var total = files.length;
  var top = files.slice(0, maxFiles);

  var lines = [total + " file(s) matched on disk for '" + q + "':"];
  top.forEach(function (rel) {
    try {
      var ex = execFileSync('grep', ['-m1', '-niF', '--', q, rel],
        { cwd: ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024 }).trim();
      // Pre-compute the age from BirthYear (canon: age = 2041 − BirthYear) and
      // hand it over directly, so she never does the subtraction herself and
      // never falls back to the real-world calendar. (S252 — Discord-Mags was
      // computing ages off the real 2026 system date: Danny Horn b.2012 → "14"
      // instead of 29, and Haiku botched the raw math anyway.)
      var ageNote = '';
      var bm = ex.match(/"BirthYear"\s*:\s*"?(\d{4})"?/);
      if (bm) ageNote = ' [AGE ' + (2041 - parseInt(bm[1], 10)) + ' — born ' + bm[1] + '; the year in Oakland is 2042, ages reckon from 2041]';
      var cap = rel.indexOf('simulation_ledger_snapshot') >= 0 ? 1500 : 160;
      if (ex.length > cap) ex = ex.slice(0, cap) + '…';
      lines.push('— ' + rel + (ex ? ': ' + ex : '') + ageNote);
    } catch (e2) {
      lines.push('— ' + rel);
    }
  });
  return lines.join('\n');
}

/**
 * Search Supermemory for relevant archive context.
 * Returns relevant text chunks or empty string on failure.
 * @param {string} query - Search query
 * @param {number} limit - Max results (default 3)
 * @param {number} timeoutMs - Timeout in ms (default 5000)
 * @returns {Promise<string>} Relevant context text
 */
function searchSupermemory(query, limit, timeoutMs) {
  limit = limit || 3;
  timeoutMs = timeoutMs || 5000;
  if (!SUPERMEMORY_KEY) return Promise.resolve('');

  return new Promise(function(resolve) {
    var payload = JSON.stringify({
      q: query,
      containerTags: [SUPERMEMORY_CONTAINER],
      limit: limit
    });

    var options = {
      hostname: 'api.supermemory.ai',
      path: '/v3/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPERMEMORY_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          if (res.statusCode !== 200) { resolve(''); return; }
          var parsed = JSON.parse(data);
          if (!parsed.results || !parsed.results.length) { resolve(''); return; }
          var context = parsed.results.map(function(r) {
            var chunks = (r.chunks || []).filter(function(c) { return c.isRelevant; });
            return chunks.map(function(c) { return c.content; }).join('\n');
          }).filter(Boolean).join('\n\n---\n\n');
          resolve(context);
        } catch (err) { resolve(''); }
      });
    });

    req.on('error', function() { resolve(''); });
    req.setTimeout(timeoutMs, function() { req.destroy(); resolve(''); });
    req.write(payload);
    req.end();
  });
}

/**
 * Save content to Supermemory as a document.
 * Fire-and-forget — does not block on errors.
 * @param {string} title - Document title
 * @param {string} content - Document content
 * @param {string[]} extraTags - Additional container tags (optional)
 */
function saveToSupermemory(title, content, extraTags) {
  if (!SUPERMEMORY_KEY) return;

  var tags = [SUPERMEMORY_CONTAINER];
  if (extraTags && extraTags.length) {
    tags = tags.concat(extraTags);
  }

  var payload = JSON.stringify({
    content: content,
    containerTags: tags,
    metadata: { title: title, source: 'autonomous-script' }
  });

  var options = {
    hostname: 'api.supermemory.ai',
    path: '/v3/documents',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPERMEMORY_KEY,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  var req = https.request(options, function() {});
  req.on('error', function(e) { console.warn('Supermemory save failed:', e.message); });
  req.write(payload);
  req.end();
}

/**
 * Load family data from Simulation_Ledger via service account.
 * Async — requires GODWORLD_SHEET_ID + GOOGLE_APPLICATION_CREDENTIALS.
 * Returns compact markdown about Robert, Sarah, Michael, Scout.
 * NOTE: Uses async/await (unlike the rest of this module which is sync ES5)
 * because it needs to await Google Sheets API calls. This is intentional —
 * all other functions read local files and don't need async.
 * @param {number} cacheMaxAgeMs - Cache TTL (default 1 hour)
 * @returns {Promise<string>} Family status markdown
 */
var _familyCache = { data: '', ts: 0 };

async function loadFamilyData(cacheMaxAgeMs) {
  cacheMaxAgeMs = cacheMaxAgeMs || 60 * 60 * 1000; // 1 hour default

  // Return cached if fresh
  if (_familyCache.data && (Date.now() - _familyCache.ts) < cacheMaxAgeMs) {
    return _familyCache.data;
  }

  // Require sheets lazily to avoid breaking sync-only consumers
  var sheets;
  try {
    sheets = require('./sheets');
  } catch (err) {
    return '(Sheets module unavailable — check lib/sheets.js exists and googleapis is installed)';
  }

  if (!process.env.GODWORLD_SHEET_ID) {
    return '(GODWORLD_SHEET_ID not set — no family data)';
  }

  var lines = ['## My Family — Live Status'];

  try {
    // Simulation_Ledger — current status
    var rows = await sheets.getSheetAsObjects('Simulation_Ledger');
    var family = rows.filter(function(row) {
      var popId = row['POPID'] || row['POP-ID'] || row['POP_ID'] || row['PopID'] || '';
      return FAMILY_POP_IDS.includes(popId);
    });

    if (family.length === 0) {
      lines.push('(No family members found in ledger)');
    } else {
      family.forEach(function(member) {
        var name = (member.First || '') + ' ' + (member.Last || '');
        name = name.trim() || member.Name || 'Unknown';
        var role = member.RoleType || member.Occupation || '';
        var status = member.Status || 'Active';
        var hood = member.Neighborhood || '';
        var history = member.LifeHistory || '';
        lines.push('**' + name + '** — ' + role +
          (hood ? ', ' + hood : '') +
          ' | Status: ' + status +
          (history ? '\n  Recent: ' + history : ''));
      });
    }

    // Note: LifeHistory_Log skipped — POPIDs 594-596 have collision with
    // pre-existing Tier-4 citizens. The Simulation_Ledger LifeHistory field
    // (manually maintained) is the canonical source for family events.

    _familyCache.data = lines.join('\n');
    _familyCache.ts = Date.now();
    return _familyCache.data;
  } catch (err) {
    return '(Family data error: ' + err.message + ')';
  }
}

module.exports = { ROOT, MAGS_DIR, LOG_DIR, FAMILY_POP_IDS, loadIdentity, loadJournalTail, loadRecentReflections, loadWorldState, loadCitizenKnowledge, loadArchiveKnowledge, loadEditionBrief, loadLatestEdition, searchDisk, loadNotesToSelf, loadTodayConversationDigest, getCentralDate, searchSupermemory, saveToSupermemory, loadFamilyData };
