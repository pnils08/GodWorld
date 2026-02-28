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
// Section Beat Detection
// ---------------------------------------------------------------------------

/**
 * Guess the beat from a section name.
 * @param {string} sectionName - The raw section header text
 * @returns {string} Beat identifier
 */
function guessBeat(sectionName) {
  var name = sectionName.toLowerCase();
  if (name.includes('front page')) return 'front-page';
  if (name.includes('civic')) return 'civic';
  if (name.includes('sport')) return 'sports';
  if (name.includes('business')) return 'business';
  if (name.includes('culture') || name.includes('community') || name.includes('seasonal')) return 'culture';
  if (name.includes('chicago')) return 'chicago';
  if (name.includes('letter')) return 'letters';
  if (name.includes('editor')) return 'editorial';
  if (name.includes('opinion')) return 'opinion';
  if (name.includes('quick take')) return 'quick-takes';
  if (name.includes('article table')) return 'meta';
  if (name.includes('storyline')) return 'meta';
  if (name.includes('citizen usage')) return 'meta';
  if (name.includes('continuity')) return 'meta';
  if (name.includes('coming next')) return 'meta';
  return 'general';
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

  // Split on #### divider lines (10+ # characters)
  var chunks = raw.split(/^#{10,}$/m);

  var edition = '';
  var date = '';
  var weather = '';
  var sentiment = '';
  var sections = [];

  // chunk[0] is empty (before first ####)
  // chunk[1] is the main edition header (multi-line: title, date, weather)
  if (chunks.length > 1) {
    var headerLines = chunks[1].trim().split('\n');
    for (var h = 0; h < headerLines.length; h++) {
      var hl = headerLines[h].trim();

      // Main edition: "EDITION 83"
      var edMatch = hl.match(/EDITION\s+(\d+)/);
      if (edMatch) edition = edMatch[1];

      // Supplemental: "C84 Supplemental | August 2041 | Deep Dive"
      var suppMatch = hl.match(/^C(\d+)\s+Supplemental\s*\|\s*(\w+\s+\d{4})\s*\|\s*(.+)$/i);
      if (suppMatch) {
        if (!edition) edition = suppMatch[1];
        date = suppMatch[2];
        sentiment = suppMatch[3].trim();
      }

      // Date line: "August 2041 | Mid-Season"
      var dateMatch = hl.match(/^(\w+\s+\d{4})\s*\|/);
      if (dateMatch && !date) {
        date = dateMatch[1];
        // Sentiment is after the pipe
        var sentMatch = hl.match(/\|\s*(.+)$/);
        if (sentMatch) sentiment = sentMatch[1].trim();
      }
      if (hl.startsWith('Weather:')) weather = hl.replace(/^Weather:\s*/, '').trim();
    }
  }

  // After the header, collect non-empty chunks
  // They alternate: [name, content, name, content, ...]
  var bodyChunks = [];
  for (var c = 2; c < chunks.length; c++) {
    if (chunks[c].trim()) bodyChunks.push(chunks[c]);
  }

  for (var i = 0; i < bodyChunks.length - 1; i += 2) {
    var sectionName = bodyChunks[i].trim();
    var content = bodyChunks[i + 1] || '';

    if (!sectionName) continue;

    var beat = guessBeat(sectionName);

    var section = {
      name: sectionName,
      text: content,
      beat: beat,
      headline: '',
      byline: '',
      photographer: '',
      neighborhood: '',
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
        neighborhood: '',
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

        // Subhead: bold line after headline
        if (article.headline && !article.subhead && cl.match(/^\*\*.+\*\*$/)) {
          article.subhead = cl.replace(/\*\*/g, '').trim();
          continue;
        }

        // Byline
        if (!article.byline && cl.match(/^By\s+/)) {
          article.byline = cl.trim();
        }

        // Photographer credit
        var photoMatch = cl.match(/\[Photo:\s*(.+?)]/);
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

  return {
    edition: edition,
    date: date,
    weather: weather,
    sentiment: sentiment,
    sections: sections
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  parseEdition: parseEdition,
  guessBeat: guessBeat
};
