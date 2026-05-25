/**
 * ============================================================================
 * Edition Parser v1.0
 * ============================================================================
 *
 * Shared parser for Cycle Pulse edition .txt files.
 * Used by generate-edition-photos.js and generate-edition-pdf.js.
 *
 * Usage:
 *   var parser = require('./lib/editionParser');
 *   var edition = parser.parseEdition('editions/cycle_pulse_edition_83.txt');
 *   // edition = { edition, date, weather, sentiment, sections[] }
 *
 * ============================================================================
 */

var fs = require('fs');

// ---------------------------------------------------------------------------
// Section Identifier Normalization (S234 G-PR6 + S235 G-PR7 single source)
// ---------------------------------------------------------------------------

// Normalize a section identifier so underscore-vs-space variants compare equal.
// Used across parser <-> PDF generator <-> photo manifest lookup. Single source
// lives here so generate-edition-pdf.js + editionParser stay in lockstep.
function normalizeSectionId(s) {
  return String(s || '').toUpperCase().replace(/[_\s]+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Section Beat Detection
// ---------------------------------------------------------------------------

/**
 * Guess the beat from a section name.
 * @param {string} sectionName - The raw section header text
 * @returns {string} Beat identifier
 */
function guessBeat(sectionName) {
  var name = sectionName.toLowerCase();
  // Meta (tracking metadata — never rendered) checked first so structural
  // matches take precedence over editorial beat matches. Without this order,
  // BUSINESSES NAMED would match the broader 'business' editorial check first.
  if (name.includes('article table')) return 'meta';
  if (name.includes('storyline')) return 'meta';
  if (name.includes('citizen usage')) return 'meta';
  if (name.includes('continuity')) return 'meta';
  if (name.includes('coming next')) return 'meta';
  if (name.includes('names index')) return 'meta';      // S189 E5
  if (name.includes('businesses named')) return 'meta'; // S189 E5
  if (name.includes('front page')) return 'front-page';
  if (name.includes('civic')) return 'civic';
  if (name.includes('sport')) return 'sports';
  if (name.includes('business')) return 'business';
  if (name.includes('culture') || name.includes('community') || name.includes('seasonal')) return 'culture';
  if (name.includes('chicago')) return 'chicago';
  if (name.includes('letter')) return 'letters';
  if (name.includes('editor')) return 'editorial';
  if (name.includes('opinion')) return 'opinion';
  if (name.includes('lifestyle')) return 'lifestyle';
  if (name.includes('neighborhood')) return 'neighborhood';
  if (name.includes('profile')) return 'profile';
  if (name.includes('food') || name.includes('dining')) return 'food';
  if (name.includes('arts')) return 'arts';
  if (name.includes('health')) return 'health';
  if (name.includes('weather')) return 'weather';
  if (name.includes('education')) return 'education';
  if (name.includes('wire')) return 'wire';
  if (name.includes('quick take')) return 'quick-takes';
  return 'general';
}

// ---------------------------------------------------------------------------
// ARTICLE TABLE Block (S235 G-PR7 — canonical headline source)
// ---------------------------------------------------------------------------

// Canonical slot pattern: FP1/FP2, ED, C1..Cn, N1..Nn, S1..Sn, L1..Ln,
// O1..On (opinion), B1..Bn (business), CH1..CHn (Chicago), Q1..Qn (quick takes).
// Numeric-only slots ("1", "2", ...) are NOT canonical — they denote the
// pre-S234 article-table shape, where Section is named but Slot is just an
// ordinal. Contract enforcement is gated on every row's Slot matching this
// pattern, so legacy editions take the silent-skip path.
var CANONICAL_SLOT_RE = /^(FP\d+|ED|C\d+|N\d+|S\d+|L\d+|O\d+|B\d+|CH\d+|Q\d+)$/i;

// Required columns for canonical-shape contract enforcement. All four must
// appear in the table header. Extra columns (e.g. Words) are tolerated.
var REQUIRED_TABLE_COLUMNS = ['slot', 'section', 'reporter', 'headline'];

// Parse the ARTICLE TABLE block out of raw edition text. The block is bounded
// by a label line `ARTICLE TABLE` (any divider variant above/below) and the
// pipe-delimited table within. Column-name-driven so column order may vary
// across edition vintages (E94 canonical shape, E93 numbered-slot shape,
// E85 no-Section shape, template shape — see docs/media/EDITION_FORMAT_TEMPLATE.txt).
//
// Returns:
//   {
//     present: bool,           // true if an ARTICLE TABLE block was located
//     columns: [string],       // lowercased column headers as found
//     rows: [{slot, section, reporter, headline, ...}], // row dicts (keys = lowercased columns)
//     canonicalShape: bool     // true iff all required columns present AND every Slot matches canonical pattern
//   }
function parseArticleTable(raw) {
  var result = { present: false, columns: [], rows: [], canonicalShape: false };

  // Locate the ARTICLE TABLE label line. Must be a standalone line.
  var labelRe = /^ARTICLE TABLE\s*$/m;
  var labelMatch = raw.match(labelRe);
  if (!labelMatch) return result;
  result.present = true;

  // Capture lines after the label up to the next non-table boundary.
  // The block contains: optional separator line, header row `| col | col |`,
  // separator row `|---|---|`, then data rows. Stop at first blank-line
  // immediately after a non-pipe line, or at the next section divider.
  var labelIdx = labelMatch.index + labelMatch[0].length;
  var tail = raw.slice(labelIdx);
  var lines = tail.split('\n');

  var tableLines = [];
  var sawTable = false;
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    var trimmed = ln.trim();
    if (trimmed.startsWith('|')) {
      sawTable = true;
      tableLines.push(trimmed);
      continue;
    }
    // Once we've seen pipe rows and then hit a non-pipe non-empty line, stop.
    if (sawTable && trimmed && !trimmed.startsWith('|')) break;
    // Stop at the next major section divider regardless.
    if (sawTable && /^[#=-]{10,}$/.test(trimmed)) break;
  }

  if (tableLines.length < 2) return result; // need header + at least one row

  // Split pipe rows into cells. Cells = inner content between leading/trailing |.
  function splitRow(line) {
    var inner = line.replace(/^\|/, '').replace(/\|\s*$/, '');
    return inner.split('|').map(function (c) { return c.trim(); });
  }

  var headerCells = splitRow(tableLines[0]);
  var headerLower = headerCells.map(function (c) { return c.toLowerCase(); });
  result.columns = headerLower;

  // Detect separator row (cells all match /^-+$/). Skip it if present.
  var dataStart = 1;
  if (tableLines.length > 1) {
    var sepCells = splitRow(tableLines[1]);
    var allSep = sepCells.length > 0 && sepCells.every(function (c) { return /^:?-+:?$/.test(c); });
    if (allSep) dataStart = 2;
  }

  // The header may use `#` for a numeric ordinal column (E93 style). Map it
  // to `slot` so downstream consumers see a uniform key — value will then be
  // a bare digit which fails CANONICAL_SLOT_RE, taking the legacy path.
  var normalizedHeaders = headerLower.map(function (h) { return h === '#' ? 'slot' : h; });

  for (var r = dataStart; r < tableLines.length; r++) {
    var cells = splitRow(tableLines[r]);
    if (cells.every(function (c) { return c === ''; })) continue;
    var row = {};
    for (var k = 0; k < normalizedHeaders.length && k < cells.length; k++) {
      row[normalizedHeaders[k]] = cells[k];
    }
    result.rows.push(row);
  }

  // Canonical-shape gate: all required columns present AND every row's Slot
  // matches the canonical pattern (named slot, not numeric ordinal).
  var hasAllRequired = REQUIRED_TABLE_COLUMNS.every(function (col) {
    return normalizedHeaders.indexOf(col) !== -1;
  });
  var allRowsCanonical = result.rows.length > 0 && result.rows.every(function (row) {
    return row.slot && CANONICAL_SLOT_RE.test(row.slot);
  });
  result.canonicalShape = hasAllRequired && allRowsCanonical;

  return result;
}

// Bind canonical article-table headlines onto parsed sections. Fires only when
// articleTable.canonicalShape is true — legacy editions take a silent-skip
// path so existing fixtures keep parsing unchanged.
//
// Per ADR-0006 Contract B: fail loud on mismatch rather than silent-drop.
// Throws (parser callsite converts to non-zero exit) on:
//   - Headline cell empty for any canonical row
//   - Section column value not matching any parsed section
//   - Byline-article count in a section doesn't equal table-row count for that section
//
// LETTERS section is skipped — letter blocks render via buildLettersHtml,
// don't use article.headline, and table entries like "(Stab Fund stuck)"
// aren't real titles.
function bindCanonicalHeadlines(sections, articleTable) {
  if (!articleTable || !articleTable.canonicalShape) return;

  // Group canonical rows by normalized section name, preserving table order.
  var rowsBySection = {};
  for (var i = 0; i < articleTable.rows.length; i++) {
    var row = articleTable.rows[i];
    if (!row.headline) {
      throw new Error('ARTICLE TABLE row ' + (i + 1) + ' (slot=' + row.slot + ') has empty Headline cell — fail-loud per ADR-0006 Contract B');
    }
    var key = normalizeSectionId(row.section);
    if (!rowsBySection[key]) rowsBySection[key] = [];
    rowsBySection[key].push(row);
  }

  // Walk each grouped section and bind to matching parsed section.
  var keys = Object.keys(rowsBySection);
  for (var s = 0; s < keys.length; s++) {
    var sectionKey = keys[s];
    var rows = rowsBySection[sectionKey];

    // Letters skip: buildLettersHtml doesn't use article.headline; table
    // entries are summary tags, not titles. Still validate the section exists
    // so a typo in the table surfaces.
    if (sectionKey === 'LETTERS' || sectionKey === 'LETTERS TO THE EDITOR') {
      var lettersHit = sections.some(function (sec) {
        return normalizeSectionId(sec.name) === 'LETTERS' || normalizeSectionId(sec.name) === 'LETTERS TO THE EDITOR';
      });
      if (!lettersHit) {
        throw new Error('ARTICLE TABLE references LETTERS section but parsed edition has none — fail-loud per ADR-0006 Contract B');
      }
      continue;
    }

    var parsedSection = null;
    for (var p = 0; p < sections.length; p++) {
      if (normalizeSectionId(sections[p].name) === sectionKey) {
        parsedSection = sections[p];
        break;
      }
    }
    if (!parsedSection) {
      throw new Error('ARTICLE TABLE references section "' + rows[0].section + '" but parsed edition has no matching section — fail-loud per ADR-0006 Contract B');
    }

    // "Real" articles within a parsed section are those with bylines.
    // Intra-article scene breaks (split on bare `---`) lack bylines and are
    // skipped during binding so headlines land on article starts, not on
    // mid-article fragments.
    //
    // The parser's article.byline assignment uses a loose `^By\s+` regex
    // which over-matches body-prose lines like "By noon, the tables were set."
    // Apply a tighter check here (capitalized name parts, optional `| outlet`)
    // for bind-detection only — parser-wide tightening is a separate concern.
    var bylineArticles = parsedSection.articles.filter(function (a) {
      var b = a.byline && a.byline.trim();
      if (!b) return false;
      return /^By\s+(Dr\.\s+)?[A-Z][\w'.\-]*(\s+[A-Z][\w'.\-]*)+(\s+\|\s*.+)?\s*$/.test(b)
          || /^By\s+(Dr\.\s+)?[A-Z]\.\s+[A-Z][\w'.\-]*(\s+\|\s*.+)?\s*$/.test(b);
    });

    if (bylineArticles.length !== rows.length) {
      throw new Error(
        'ARTICLE TABLE claims ' + rows.length + ' article(s) for section "' + rows[0].section + '" but parser found ' + bylineArticles.length +
        ' byline-bearing article(s) — fail-loud per ADR-0006 Contract B'
      );
    }

    for (var b = 0; b < bylineArticles.length; b++) {
      bylineArticles[b].headline = rows[b].headline;
    }
    parsedSection.headline = rows[0].headline;
  }
}

// ---------------------------------------------------------------------------
// Edition Parser
// ---------------------------------------------------------------------------

/**
 * Parse a Cycle Pulse edition file into structured sections with metadata.
 *
 * @param {string} filePath - Path to the edition .txt file
 * @returns {Object} { edition, date, weather, sentiment, sections[] }
 */
function parseEdition(filePath) {
  var raw = fs.readFileSync(filePath, 'utf-8');

  // ARTICLE TABLE extraction runs against the raw text BEFORE section
  // splitting, because the table block is classified as `meta` and dropped
  // during section building. (S235 G-PR7)
  var articleTable = parseArticleTable(raw);

  // Split on ####, ====, or ---- divider lines (10+ characters)
  var chunks = raw.split(/^[#=-]{10,}$/m);

  var edition = '';
  var date = '';
  var weather = '';
  var sentiment = '';
  var sections = [];
  var isSupplemental = false;
  var slug = '';

  // Derive slug from filename as fallback identifier
  // e.g. "supplemental_housing_market_c86.txt" -> "supplemental_c86_housing_market"
  var basename = require('path').basename(filePath, '.txt');
  if (basename.match(/^supplemental_/)) {
    isSupplemental = true;
    var cycleMatch = basename.match(/c(\d+)/i);
    if (cycleMatch) {
      edition = cycleMatch[1];
      var topic = basename.replace(/^supplemental_/, '').replace(/_c\d+$/, '').replace(/^c\d+_/, '');
      slug = 'supplemental_c' + edition + '_' + topic;
    }
  } else if (basename.match(/^cycle_pulse_edition_(\d+)/)) {
    edition = basename.match(/^cycle_pulse_edition_(\d+)/)[1];
    slug = 'e' + edition;
  }

  // Check chunks[0] and chunks[1] for header metadata.
  // Old format: chunks[0] is empty, header is in chunks[1] (between first two #### dividers).
  // New format: header is in chunks[0] (inside ===== block before first #### divider).
  var headerChunks = chunks.length > 2 ? [chunks[0], chunks[1]] : chunks.length > 1 ? [chunks[0], chunks[1]] : [chunks[0]];
  for (var hc = 0; hc < headerChunks.length; hc++) {
    var headerLines = headerChunks[hc].trim().split('\n');
    for (var h = 0; h < headerLines.length; h++) {
      var hl = headerLines[h].trim();

      // Main edition: "EDITION 83" or "Edition 85 | Cycle 85 | ..."
      var edMatch = hl.match(/EDITION\s+(\d+)/i);
      if (edMatch) edition = edMatch[1];

      // Supplemental: "C84 Supplemental | August 2041 | Deep Dive"
      var suppMatch = hl.match(/^C(\d+)\s+Supplemental\s*\|\s*(\w+\s+\d{4})\s*\|\s*(.+)$/i);
      if (suppMatch) {
        if (!edition) edition = suppMatch[1];
        date = suppMatch[2];
        sentiment = suppMatch[3].trim();
      }

      // Supplemental alt: "Cycle 86 | City Life" or "Cycle 87 | Neighborhood Life"
      var cycleMatch = hl.match(/^Cycle\s+(\d+)\s*\|\s*(.+)$/i);
      if (cycleMatch) {
        if (!edition) edition = cycleMatch[1];
        if (!sentiment) sentiment = cycleMatch[2].trim();
      }

      // Date line: "August 2041 | Mid-Season" or "Edition 85 | Cycle 85 | September 2041"
      var dateMatch = hl.match(/^(\w+\s+\d{4})\s*\|/);
      if (dateMatch && !date) {
        date = dateMatch[1];
        var sentMatch = hl.match(/\|\s*(.+)$/);
        if (sentMatch) sentiment = sentMatch[1].trim();
      }
      // Also check for date anywhere in a pipe-separated line
      if (!date) {
        var dateAnywhere = hl.match(/(\w+\s+\d{4})/);
        if (dateAnywhere && dateAnywhere[1].match(/^(January|February|March|April|May|June|July|August|September|October|November|December)/)) {
          date = dateAnywhere[1];
        }
      }
      if (hl.startsWith('Weather:')) weather = hl.replace(/^Weather:\s*/, '').trim();

      // Weather might also be embedded: "Back to School | Clear, 63°F"
      if (!weather) {
        var weatherInline = hl.match(/\|\s*(Clear|Cloudy|Rain|Fog|Overcast|Sunny|Warm|Cool|Hot|Cold|Storm)[^|]*/i);
        if (weatherInline) weather = weatherInline[0].replace(/^\|\s*/, '').trim();
      }
    }
  }

  // After the header, collect non-empty body chunks
  var bodyChunks = [];
  for (var c = 2; c < chunks.length; c++) {
    if (chunks[c].trim()) bodyChunks.push(chunks[c].trim());
  }

  // Classify chunks as section names (short labels) vs content (articles).
  // This handles all delimiter formats: #### NAME ####, ==== NAME ====,
  // ---- NAME ----, and article separators (---- without a name).
  function isSectionNameChunk(chunk) {
    if (chunk.length > 120) return false;
    var cLines = chunk.split('\n').filter(function(l) { return l.trim(); });
    if (cLines.length > 3) return false;
    if (chunk.match(/^\*\*/)) return false;
    if (chunk.match(/^By\s+/)) return false;
    if (chunk.match(/^\|/)) return false;
    if (chunk.match(/^--\s/)) return false;
    if (chunk.match(/^\[OPINION\]/i)) return false;
    if (chunk.match(/^Dear\s/i)) return false;
    // S189 E5: tracking-section data rows (POP-00537 | Marin Tao | Musician,
    // BIZ-00042 | ..., article-table rows) all carry `|`. Pre-fix only excluded
    // lines STARTING with `|` (markdown-table form), missing the dispatch
    // shape where rows start with the ID. Result: data rows misclassified as
    // section names → rendered as section labels with newlines collapsed
    // (E5a row collapse) AND subsequent real headers absorbed (E5b/E5c).
    if (chunk.indexOf('|') >= 0) return false;
    return true;
  }

  // Group chunks: section-name chunks start a new group,
  // content chunks append to the current group.
  var sectionGroups = [];
  for (var g = 0; g < bodyChunks.length; g++) {
    var chunk = bodyChunks[g];
    if (isSectionNameChunk(chunk)) {
      sectionGroups.push({ name: chunk, contentChunks: [] });
    } else if (sectionGroups.length > 0) {
      sectionGroups[sectionGroups.length - 1].contentChunks.push(chunk);
    } else {
      // Content before first named section (e.g. FRONT PAGE inline).
      // If first line is a recognized beat label, split it off as the name.
      var cLines = chunk.split('\n');
      var firstNonEmpty = '';
      var firstIdx = -1;
      for (var fl = 0; fl < cLines.length; fl++) {
        if (cLines[fl].trim()) { firstNonEmpty = cLines[fl].trim(); firstIdx = fl; break; }
      }
      if (firstNonEmpty && guessBeat(firstNonEmpty) !== 'general') {
        var rest = cLines.slice(firstIdx + 1).join('\n').trim();
        sectionGroups.push({ name: firstNonEmpty, contentChunks: rest ? [rest] : [] });
      } else {
        sectionGroups.push({ name: firstNonEmpty || 'UNNAMED', contentChunks: [chunk] });
      }
    }
  }

  // Build sections from groups
  for (var sg = 0; sg < sectionGroups.length; sg++) {
    var group = sectionGroups[sg];
    var sectionName = group.name;

    // Join multiple content chunks with --- so article splitter picks them up
    var content = group.contentChunks.join('\n\n---\n\n');

    if (!sectionName) continue;

    var beat = guessBeat(sectionName);

    var section = {
      name: sectionName,
      text: content,
      beat: beat,
      headline: '',
      byline: '',
      photographer: '',
      articles: []
    };

    // Split content into sub-articles on --- dividers
    var articleTexts = content.split(/^---$/m);

    for (var a = 0; a < articleTexts.length; a++) {
      var articleText = articleTexts[a].trim();
      if (!articleText) continue;

      var article = {
        headline: '',
        subhead: '',
        byline: '',
        photographer: '',
        text: articleText,
        namesIndex: ''
      };

      var lines = articleText.split('\n');
      for (var j = 0; j < lines.length; j++) {
        var cl = lines[j];

        // Headline: first bold line (### or **)
        if (!article.headline) {
          var h3Match = cl.match(/^###\s+(.+)/);
          if (h3Match) {
            article.headline = h3Match[1].trim();
            continue;
          }
          if (cl.match(/^\*\*.+\*\*$/)) {
            article.headline = cl.replace(/\*\*/g, '').trim();
            continue;
          }
        }

        // Subhead: italic line after headline (before byline)
        if (article.headline && !article.subhead) {
          if (cl.match(/^\*.+\*$/) && !cl.match(/^\*\*/)) {
            article.subhead = cl.replace(/\*/g, '').trim();
            continue;
          }
        }

        // Byline
        if (!article.byline && cl.match(/^By\s+/)) {
          article.byline = cl.trim();
        }

        // Photographer credit
        var photoMatch = cl.match(/\[Photo(?:\s+credit)?:\s*(.+?)]/);
        if (photoMatch) {
          article.photographer = photoMatch[1].replace(/\s*\/\s*Bay Tribune\s*/, '').trim();
        }

        // Names Index
        if (cl.match(/^Names Index:/)) {
          article.namesIndex = cl.replace('Names Index:', '').trim();
        }
      }

      section.articles.push(article);

      // First article's metadata becomes the section-level metadata
      if (a === 0) {
        section.headline = article.headline;
        section.byline = article.byline;
        section.photographer = article.photographer;
      }
    }

    sections.push(section);
  }

  // Build slug if not already derived from filename
  if (!slug) {
    slug = edition ? 'e' + edition : 'unknown';
  }

  // S235 G-PR7 — bind canonical headlines from the ARTICLE TABLE. Fires only
  // when articleTable.canonicalShape is true; legacy editions take a silent-
  // skip path so existing fixtures (E85/E90/E93) keep parsing unchanged.
  bindCanonicalHeadlines(sections, articleTable);

  return {
    edition: edition,
    slug: slug,
    isSupplemental: isSupplemental,
    date: date,
    weather: weather,
    sentiment: sentiment,
    sections: sections,
    articleTable: articleTable
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  parseEdition: parseEdition,
  guessBeat: guessBeat,
  parseArticleTable: parseArticleTable,
  bindCanonicalHeadlines: bindCanonicalHeadlines,
  normalizeSectionId: normalizeSectionId
};
