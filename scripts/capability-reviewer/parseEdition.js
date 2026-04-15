/**
 * Parse a Cycle Pulse edition .txt file into structured sections.
 * Editions use ASCII section dividers ("------------" lines) and section headers
 * in ALL CAPS on the line immediately after a divider.
 *
 * Example:
 *   ------------------------------------------------------------
 *   FRONT PAGE
 *   ------------------------------------------------------------
 *   {section body}
 *
 * Returns:
 *   {
 *     header: { cycle, date, weather, mood, fullText },
 *     sections: [{ title, body, articles: [{ headline, byline, body }] }]
 *   }
 */

const fs = require('fs');

const DIVIDER_RE = /^-{10,}$/;
const SECTION_HEADERS = new Set([
  'FRONT PAGE',
  "EDITOR'S DESK",
  'SPORTS',
  'CIVIC',
  'BUSINESS',
  'CULTURE',
  'PODCAST',
  'LETTERS',
  'LETTERS TO THE EDITOR',
  'CHICAGO',
  'OPINION',
  'OBITUARIES',
  'WEATHER',
  'CLASSIFIEDS',
]);

function parse(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  // Strip the END EDITION trailer block — it isn't editorial content
  const endMarker = raw.match(/={5,}\s*END EDITION/i);
  if (endMarker) raw = raw.slice(0, endMarker.index);
  const lines = raw.split('\n');
  const sections = [];
  let currentSection = null;
  let i = 0;

  // Header block (everything before the first section divider)
  const headerLines = [];
  while (i < lines.length) {
    if (DIVIDER_RE.test(lines[i].trim())) break;
    headerLines.push(lines[i]);
    i++;
  }
  const headerText = headerLines.join('\n');
  const header = {
    cycle: extractCycle(headerText),
    date: extractDate(headerText),
    weather: extractField(headerText, /Weather:\s*([^|]+)/i),
    mood: extractField(headerText, /City Mood:\s*([^|\n]+)/i),
    fullText: headerText,
  };

  // Walk sections
  while (i < lines.length) {
    const line = lines[i].trim();
    if (DIVIDER_RE.test(line)) {
      // Look ahead one line for the section header
      const next = (lines[i + 1] || '').trim();
      if (SECTION_HEADERS.has(next.toUpperCase())) {
        // Close the previous section
        if (currentSection) {
          finalizeSection(currentSection);
          sections.push(currentSection);
        }
        currentSection = {
          title: next.toUpperCase(),
          body: '',
          articles: [],
        };
        // Skip divider, header, divider after
        i += 2;
        if ((lines[i] || '').trim() && DIVIDER_RE.test(lines[i].trim())) {
          i++;
        }
        continue;
      }
    }
    if (currentSection) {
      currentSection.body += lines[i] + '\n';
    }
    i++;
  }
  if (currentSection) {
    finalizeSection(currentSection);
    sections.push(currentSection);
  }

  return { header, sections, raw };
}

/**
 * Split a section body into individual articles.
 * Heuristic: an article starts with a non-blank line that isn't all-caps and is
 * followed within ~3 lines by "By {Name}" byline. Articles are separated by 1+
 * blank lines preceding the next headline.
 */
function finalizeSection(section) {
  const text = section.body;
  const blocks = text.split(/\n{2,}/);
  const articles = [];
  let pending = null;

  for (let k = 0; k < blocks.length; k++) {
    const block = blocks[k].trim();
    if (!block) continue;
    const blockLines = block.split('\n');
    const firstLine = blockLines[0].trim();
    const isShort = firstLine.length < 120;
    const looksLikeHeadline =
      isShort &&
      !firstLine.startsWith('By ') &&
      !firstLine.startsWith('—') &&
      !firstLine.startsWith('-') &&
      firstLine !== firstLine.toLowerCase();
    const next = (blockLines[1] || '').trim();
    const nextIsByline = /^By\s+/i.test(next);
    if (looksLikeHeadline && nextIsByline) {
      // New article
      if (pending) articles.push(pending);
      pending = {
        headline: firstLine,
        byline: next.replace(/^By\s+/i, '').trim(),
        body: blockLines.slice(2).join('\n').trim(),
      };
    } else if (pending) {
      // Continuation of current article
      pending.body += '\n\n' + block;
    } else {
      // Section preamble before any byline
      pending = {
        headline: '',
        byline: '',
        body: block,
      };
    }
  }
  if (pending) articles.push(pending);
  section.articles = articles;
}

function extractCycle(text) {
  const m = text.match(/Cycle\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractDate(text) {
  // Looks for a Month Year token like "October 2041"
  const m = text.match(/\|\s*([A-Z][a-z]+\s+\d{4})/);
  return m ? m[1] : null;
}

function extractField(text, re) {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Extract the front-page article. Returns { headline, byline, body } or null.
 */
function getFrontPageArticle(parsed) {
  const fp = parsed.sections.find((s) => s.title === 'FRONT PAGE');
  if (!fp || !fp.articles.length) return null;
  // The first non-empty article in FRONT PAGE is the lead.
  return fp.articles.find((a) => a.body && a.body.trim().length > 100) || fp.articles[0];
}

/**
 * Extract every named person reference from any text. Looks for proper-noun
 * sequences (2+ capitalized words). Returns deduped list of candidate names.
 * False positives expected — assertions cross-check against canon.
 */
// Words that strongly indicate a candidate is NOT a person name.
// Used as a first-word filter to suppress headline fragments and possessives.
const NON_NAME_FIRST_WORDS = new Set([
  'The', 'A', 'An', 'And', 'But', 'Or', 'So', 'For', 'Yet', 'Because',
  'When', 'While', 'If', 'Unless', 'Although', 'After', 'Before',
  'NBA', 'MLB', 'NFL', 'NHL', 'AP', 'AC', 'GM', 'CEO', 'CFO', 'COO',
  'Oakland', "Oakland's", 'Bay', "Bay's", 'Chicago', "Chicago's",
  'San', 'New', 'East', 'West', 'North', 'South', 'Lake',
  'Jack', 'Jack London', 'Adams', 'Civic', 'Civis', 'Phase',
  'Bulls', 'Athletics', "Athletics'", 'Warriors', 'Giants',
  'American', 'National', 'Federal', 'State', 'County',
  'Bay Tribune', 'Cycle', 'Edition', 'Mayor', 'Council', 'Councilmember',
  'Director', 'Captain', 'Chief', 'President', 'Senator', 'Secretary',
  'Finals', 'Series', 'Game', 'Inning', 'League', 'Conference',
  'Names', 'Final', 'Score', 'Sports', 'Letters', 'Editor',
  'Freight', 'Transit', 'Police', 'Fire', 'Health',
]);

function extractNameCandidates(text) {
  if (!text) return [];
  // Process line by line so we never produce candidates spanning newlines.
  // Drop section dividers, byline prefixes, and any line that starts with "By ".
  const out = new Set();
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('By ')) continue;
    if (/^={4,}|^-{4,}/.test(line)) continue;
    const matches = line.match(/\b([A-Z][a-zA-Zé'\-]+(?:\s+[A-Z][a-zA-Zé'\-]+){1,3})\b/g) || [];
    for (const m of matches) {
      if (m.length > 60) continue;
      if (m.includes('\n')) continue;
      const firstWord = m.split(/\s+/)[0];
      if (NON_NAME_FIRST_WORDS.has(firstWord)) continue;
      // Reject if any word is an organization marker
      if (/\b(Authority|Department|Agency|Bureau|Coalition|Party|Inc|LLC|Co\.|Corporation|System|Systems|Pulse|Tribune|Times|Network)\b/.test(m)) continue;
      out.add(m);
    }
  }
  return [...out];
}

/**
 * Extract all POP-IDs referenced in text.
 */
function extractPopIds(text) {
  if (!text) return [];
  const matches = text.match(/POP-\d{5}/g) || [];
  return [...new Set(matches)];
}

/**
 * Extract initiative IDs (INIT-XXX format).
 */
function extractInitiativeIds(text) {
  if (!text) return [];
  const matches = text.match(/INIT-\d{3}/g) || [];
  return [...new Set(matches)];
}

module.exports = {
  parse,
  getFrontPageArticle,
  extractNameCandidates,
  extractPopIds,
  extractInitiativeIds,
};
