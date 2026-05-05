#!/usr/bin/env node
/**
 * rateEditionCoverage.js v2.1 — Per-Domain Edition Coverage Ratings
 * [engine/sheet] — Phase 27.1 coverage ratings channel
 *
 * v2.1 (S202) — section-header detector handles bare-uppercase headers
 *   ("FRONT PAGE", "CIVIC", "BUSINESS", "SPORTS" on their own line — the
 *   consolidated format adopted ~S189). Pre-S202 detector required either
 *   "━━━ X ━━━" separators or "# X" markdown prefixes; neither were present
 *   in E92/E93 → "Articles found: 0" → letters-only signal silently filled
 *   the sheet for 4 cycles (closes S196 G-P6 + scopes S202 backfill). Added
 *   fail-loud gate at end of parse so a future format drift exits non-zero
 *   instead of writing zero-signal ratings.
 *
 * Reads a published edition, maps each article to an engine domain,
 * rates each on -5 to +5, averages per domain, and writes to
 * Edition_Coverage_Ratings sheet. The engine reads these ratings
 * via applyEditionCoverageEffects_ to ripple media influence into
 * domain dynamics.
 *
 * Usage:
 *   node scripts/rateEditionCoverage.js editions/cycle_pulse_edition_90.txt --dry-run
 *   node scripts/rateEditionCoverage.js editions/cycle_pulse_edition_90.txt --apply
 */

require('/root/GodWorld/lib/env');  // S197 BUNDLE-B (G-P7) — loads GODWORLD_SHEET_ID + GOOGLE_APPLICATION_CREDENTIALS from /root/.config/godworld/.env
var fs = require('fs');
var path = require('path');
var sheets = require('../lib/sheets');

var args = process.argv.slice(2);
var filePath = args.find(function(a) { return !a.startsWith('--'); });
var dryRun = !args.includes('--apply');

if (!filePath) {
  console.log('Usage: node scripts/rateEditionCoverage.js <edition-file> [--dry-run|--apply]');
  console.log('  --dry-run  (default) Show what would be written');
  console.log('  --apply    Write to Edition_Coverage_Ratings sheet');
  process.exit(1);
}

var text = fs.readFileSync(path.resolve(filePath), 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// DETECT CYCLE
// ═══════════════════════════════════════════════════════════════════════════

var cycle = 0;
var cycleMatch = text.match(/EDITION\s+(\d+)/i) || filePath.match(/(\d+)/);
if (cycleMatch) cycle = parseInt(cycleMatch[1], 10);

if (!cycle) {
  console.error('Could not detect cycle number from file');
  process.exit(1);
}

console.log('Edition: C' + cycle);
console.log('Mode: ' + (dryRun ? 'DRY-RUN' : 'APPLY'));
console.log('---');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION TAG → ENGINE DOMAIN MAPPING
// ═══════════════════════════════════════════════════════════════════════════

// Maps edition section tags to Domain_Tracker column names
var sectionToDomains = {
  'front page': ['CIVIC'],
  'civic affairs': ['CIVIC'],
  'civic': ['CIVIC'],
  'city life': ['CULTURE', 'COMMUNITY'],
  'culture': ['CULTURE'],
  'culture & community': ['CULTURE', 'COMMUNITY'],
  'business': ['ECONOMIC'],
  'business ticker': ['ECONOMIC'],
  'sports': ['SPORTS'],
  'health': ['HEALTH'],
  'accountability': ['CIVIC', 'CRIME'],
  'opinion': ['COMMUNITY'],
  'features': ['CULTURE', 'COMMUNITY'],
  'letters': ['COMMUNITY'],
  'chicago': ['SPORTS']
};

// ═══════════════════════════════════════════════════════════════════════════
// TONE KEYWORDS
// ═══════════════════════════════════════════════════════════════════════════

var POSITIVE_WORDS = [
  'celebrate', 'win', 'victory', 'success', 'approve', 'pass', 'triumph',
  'breakthrough', 'progress', 'growth', 'proud', 'hope', 'thrive',
  'booming', 'revival', 'rally', 'award', 'honor', 'milestone',
  'expansion', 'improve', 'strong', 'momentum', 'optimism', 'joy',
  'flourish', 'prosper', 'uplift', 'united', 'hero', 'champion'
];

var NEGATIVE_WORDS = [
  'fail', 'crisis', 'collapse', 'stall', 'block', 'reject', 'veto',
  'concern', 'fear', 'decline', 'loss', 'losing', 'struggle', 'threat',
  'danger', 'damage', 'victim', 'arrest', 'crime', 'violence', 'protest',
  'displacement', 'evict', 'closure', 'shortage', 'deficit', 'delay',
  'frustrat', 'anger', 'outrage', 'scandal', 'corruption', 'neglect',
  'abandon', 'deteriorat', 'emergency', 'alarm', 'tension'
];

// ═══════════════════════════════════════════════════════════════════════════
// PARSE ARTICLES — find section-tagged content blocks
// ═══════════════════════════════════════════════════════════════════════════

var lines = text.split('\n');

// Find article boundaries — look for section headers and bylines
var articles = [];
var currentArticle = null;

// Whitelist of valid section names (used by all three regex variants below).
// Order matters where one prefix is contained in another — longer patterns must
// match first so "BUSINESS TICKER" doesn't get truncated to "BUSINESS".
var SECTION_NAMES =
  'CULTURE & COMMUNITY|CIVIC AFFAIRS|CIVIC BRIEFS|BUSINESS TICKER|FRONT PAGE|CITY LIFE|' +
  'ACCOUNTABILITY|FEATURES|OPINION|CULTURE|BUSINESS|SPORTS|HEALTH|CHICAGO|CIVIC';

var SEP_HEADER_RE   = new RegExp('[━─═]+\\s*(' + SECTION_NAMES + ')\\s*[━─═]+', 'i');
var MD_HEADER_RE    = new RegExp('^#+\\s*(' + SECTION_NAMES + ')\\s*$', 'i');
var BARE_HEADER_RE  = new RegExp('^(' + SECTION_NAMES + ')\\s*$');

for (var i = 0; i < lines.length; i++) {
  var line = lines[i];

  // Three header formats, tried in order:
  //   1. "━━━ SPORTS ━━━"        (legacy separator block, pre-S189)
  //   2. "## SPORTS"              (markdown-prefixed)
  //   3. "SPORTS"                 (bare uppercase on its own line — current consolidated format S189+)
  var sectionMatch = line.match(SEP_HEADER_RE);
  if (!sectionMatch) sectionMatch = line.match(MD_HEADER_RE);
  if (!sectionMatch) sectionMatch = line.match(BARE_HEADER_RE);

  if (sectionMatch) {
    if (currentArticle && currentArticle.text.length > 50) {
      articles.push(currentArticle);
    }
    currentArticle = {
      section: sectionMatch[1].trim(),
      reporter: '',
      headline: '',
      text: '',
      startLine: i
    };
    continue;
  }

  // Byline detection: "By Carmen Delaine" or "By P Slayer"
  var bylineMatch = line.match(/^(?:By|BY)\s+(.+?)(?:\s*[|,]|$)/);
  if (bylineMatch && currentArticle) {
    currentArticle.reporter = bylineMatch[1].trim();
  }

  // Headline detection: first non-empty line after section header that isn't a separator
  if (currentArticle && !currentArticle.headline && line.trim() && !/^[━─═\-*#|]/.test(line.trim())) {
    currentArticle.headline = line.trim();
  }

  // Accumulate text
  if (currentArticle) {
    currentArticle.text += line + '\n';
  }

  // End marker — break only at LETTERS TO THE EDITOR. Letters parsing is its
  // own pass below; breaking here keeps letters out of the section parser AND
  // separates main content from the trailing structured block (ARTICLE TABLE,
  // CITIZEN USAGE LOG, STORYLINES UPDATED, COMING NEXT EDITION) which always
  // appears AFTER letters in every edition E78+. Earlier versions tried to
  // match those markers directly, but E92 embeds an inline "ARTICLE TABLE
  // ENTRIES:" + "CITIZEN USAGE LOG:" mid-body that would falsely terminate
  // the parser before reaching the BUSINESS section.
  if (/^LETTERS TO THE EDITOR/i.test(line.trim())) {
    if (currentArticle && currentArticle.text.length > 50) {
      articles.push(currentArticle);
    }
    currentArticle = null;
    break; // Stop parsing at structured sections
  }
}

// Catch last article
if (currentArticle && currentArticle.text.length > 50) {
  articles.push(currentArticle);
}

console.log('Articles found: ' + articles.length);

// Fail-loud gate: zero articles means the section-header detector broke.
// Without this, the LETTERS pass below silently produces letters-only ratings
// that get written to the sheet as if they reflected actual edition coverage.
// (Failure mode caught S196 G-P6 — sheet contained 4 cycles of letters-only
// signal because the bare-uppercase header format went undetected.)
if (articles.length === 0) {
  console.error('FAIL: parser found 0 articles in ' + filePath);
  console.error('  Section-header detection broke. Expected headers: ' + SECTION_NAMES.replace(/\|/g, ' / '));
  console.error('  Inspect the edition file vs SECTION_NAMES in scripts/rateEditionCoverage.js');
  process.exit(2);
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE EACH ARTICLE — tone analysis → -5 to +5
// ═══════════════════════════════════════════════════════════════════════════

function rateArticleTone(articleText) {
  var lower = articleText.toLowerCase();
  var posCount = 0;
  var negCount = 0;

  for (var p = 0; p < POSITIVE_WORDS.length; p++) {
    var pMatches = lower.split(POSITIVE_WORDS[p]).length - 1;
    posCount += pMatches;
  }
  for (var n = 0; n < NEGATIVE_WORDS.length; n++) {
    var nMatches = lower.split(NEGATIVE_WORDS[n]).length - 1;
    negCount += nMatches;
  }

  var total = posCount + negCount;
  if (total === 0) return { rating: 0, tone: 'neutral' };

  // Net sentiment ratio: -1 (all negative) to +1 (all positive)
  var ratio = (posCount - negCount) / total;

  // Map to -5 to +5 scale
  var rating = Math.round(ratio * 5);
  rating = Math.max(-5, Math.min(5, rating));

  var tone = 'neutral';
  if (rating >= 2) tone = 'positive';
  else if (rating <= -2) tone = 'negative';
  else if (rating !== 0) tone = 'mixed';

  return { rating: rating, tone: tone };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAP ARTICLES → DOMAINS, AGGREGATE
// ═══════════════════════════════════════════════════════════════════════════

// Per-domain accumulators: { domain: { ratings: [], reporters: [], tones: [] } }
var domainData = {};

for (var a = 0; a < articles.length; a++) {
  var art = articles[a];
  var sectionKey = art.section.toLowerCase();

  // Find matching domains
  var domains = null;
  for (var key in sectionToDomains) {
    if (sectionKey.includes(key) || key.includes(sectionKey)) {
      domains = sectionToDomains[key];
      break;
    }
  }

  if (!domains) {
    // Default to COMMUNITY for unmatched sections
    domains = ['COMMUNITY'];
  }

  var result = rateArticleTone(art.text);

  // Jax Caldera / accountability pieces lean negative by nature
  if (art.reporter.toLowerCase().includes('caldera') || art.reporter.toLowerCase().includes('jax')) {
    if (result.rating > -1) result.rating = Math.max(-3, result.rating - 2);
    if (result.tone !== 'negative') result.tone = 'negative';
  }

  console.log('  [' + art.section + '] ' + (art.headline || '(no headline)').substring(0, 60) +
    ' → ' + domains.join('+') + ' r' + result.rating + ' ' + result.tone +
    (art.reporter ? ' (' + art.reporter + ')' : ''));

  // Distribute to each domain
  for (var d = 0; d < domains.length; d++) {
    var dom = domains[d];
    if (!domainData[dom]) {
      domainData[dom] = { ratings: [], reporters: [], tones: [] };
    }
    domainData[dom].ratings.push(result.rating);
    domainData[dom].reporters.push(art.reporter || 'unknown');
    domainData[dom].tones.push(result.tone);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LETTERS SECTION — extract citizen reactions per domain
// ═══════════════════════════════════════════════════════════════════════════

// Parse letters for domain mentions and tone
var lettersStart = -1;
var lettersEnd = lines.length;
for (var li = 0; li < lines.length; li++) {
  if (/LETTERS TO THE EDITOR/i.test(lines[li])) {
    lettersStart = li + 1;
  } else if (lettersStart > 0 && /^ARTICLE TABLE|^CITIZEN USAGE|^STORYLINES UPDATED|^COMING NEXT|^END EDITION/i.test(lines[li].trim())) {
    lettersEnd = li;
    break;
  }
}

if (lettersStart > 0) {
  var lettersText = lines.slice(lettersStart, lettersEnd).join('\n');
  var letterBlocks = lettersText.split(/(?=Dear Editor|To the Editor|Editor,)/i);

  for (var lb = 0; lb < letterBlocks.length; lb++) {
    var letter = letterBlocks[lb];
    if (letter.length < 30) continue;

    var letterTone = rateArticleTone(letter);

    // Detect which domain the letter is reacting to
    var letterLower = letter.toLowerCase();
    var letterDomains = [];
    if (/council|mayor|vote|initiative|ordinance|city hall/i.test(letterLower)) letterDomains.push('CIVIC');
    if (/crime|police|safety|arrest|incident/i.test(letterLower)) letterDomains.push('CRIME');
    if (/a'?s\b|baseball|game|stadium|coliseum|player/i.test(letterLower)) letterDomains.push('SPORTS');
    if (/business|shop|store|economic|job|employ/i.test(letterLower)) letterDomains.push('ECONOMIC');
    if (/school|education|student/i.test(letterLower)) letterDomains.push('EDUCATION');
    if (/health|hospital|clinic|nurse|doctor/i.test(letterLower)) letterDomains.push('HEALTH');
    if (/art|music|culture|festival|food|restaurant/i.test(letterLower)) letterDomains.push('CULTURE');
    if (/transit|bus|bart|commute|traffic/i.test(letterLower)) letterDomains.push('TRANSIT');
    if (/housing|rent|evict|landlord|apartment/i.test(letterLower)) letterDomains.push('HOUSING');
    if (letterDomains.length === 0) letterDomains.push('COMMUNITY');

    for (var ld = 0; ld < letterDomains.length; ld++) {
      var ldom = letterDomains[ld];
      if (!domainData[ldom]) {
        domainData[ldom] = { ratings: [], reporters: [], tones: [] };
      }
      // Letters count at half weight (citizen reaction, not primary coverage)
      domainData[ldom].ratings.push(Math.round(letterTone.rating * 0.5));
      domainData[ldom].reporters.push('letters');
      domainData[ldom].tones.push(letterTone.tone);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AVERAGE PER DOMAIN → OUTPUT ROWS
// ═══════════════════════════════════════════════════════════════════════════

var outputRows = [];

console.log('\n--- DOMAIN RATINGS ---');

var domainKeys = Object.keys(domainData);
for (var dk = 0; dk < domainKeys.length; dk++) {
  var domain = domainKeys[dk];
  var dd = domainData[domain];

  // Average rating
  var sum = 0;
  for (var ri = 0; ri < dd.ratings.length; ri++) {
    sum += dd.ratings[ri];
  }
  var avgRating = Math.round(sum / dd.ratings.length);
  avgRating = Math.max(-5, Math.min(5, avgRating));

  // Dominant tone
  var toneCounts = { positive: 0, negative: 0, mixed: 0, neutral: 0 };
  for (var ti = 0; ti < dd.tones.length; ti++) {
    toneCounts[dd.tones[ti]] = (toneCounts[dd.tones[ti]] || 0) + 1;
  }
  var dominantTone = 'neutral';
  var maxToneCount = 0;
  for (var tk in toneCounts) {
    if (toneCounts[tk] > maxToneCount) {
      maxToneCount = toneCounts[tk];
      dominantTone = tk;
    }
  }

  // Primary reporter (most articles in this domain, excluding letters)
  var reporterCounts = {};
  for (var rpi = 0; rpi < dd.reporters.length; rpi++) {
    var rep = dd.reporters[rpi];
    if (rep !== 'letters') {
      reporterCounts[rep] = (reporterCounts[rep] || 0) + 1;
    }
  }
  var primaryReporter = '';
  var maxRepCount = 0;
  for (var rk in reporterCounts) {
    if (reporterCounts[rk] > maxRepCount) {
      maxRepCount = reporterCounts[rk];
      primaryReporter = rk;
    }
  }

  var articleCount = dd.ratings.length;

  console.log('  ' + domain + ': ' + avgRating + ' (' + articleCount + ' articles, ' +
    dominantTone + ', reporter: ' + (primaryReporter || 'n/a') + ')');

  outputRows.push([
    cycle,           // Cycle
    domain,          // Domain
    avgRating,       // Rating (-5 to +5)
    articleCount,    // ArticleCount
    primaryReporter, // Reporter
    dominantTone,    // Tone
    'FALSE'          // Processed
  ]);
}

console.log('\nTotal domain ratings: ' + outputRows.length);

// ═══════════════════════════════════════════════════════════════════════════
// WRITE TO SHEET
// ═══════════════════════════════════════════════════════════════════════════

if (dryRun) {
  console.log('\n--- DRY RUN — nothing written. Use --apply to write to sheet.');
  process.exit(0);
}

if (outputRows.length === 0) {
  console.log('\nNo ratings to write.');
  process.exit(0);
}

(async function() {
  try {
    var client = await sheets.getClient();
    var spreadsheetId = process.env.GODWORLD_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GODWORLD_SHEET_ID not set in environment');
    }

    await client.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: 'Edition_Coverage_Ratings!A2',
      valueInputOption: 'RAW',
      resource: { values: outputRows }
    });

    console.log('\nWritten ' + outputRows.length + ' domain ratings to Edition_Coverage_Ratings');
  } catch (e) {
    console.error('Failed to write:', e.message);
    process.exit(1);
  }
})();
