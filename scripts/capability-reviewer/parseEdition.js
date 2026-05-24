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
// Major-boundary dividers (60+ equals) separate editorial sections from the
// footer block. Treated as divider-like for section-header look-ahead so the
// footer parses correctly. (G-W46 follow-on S231.)
const MAJOR_BOUNDARY_RE = /^={10,}$/;

// Editorial sections — these carry article body text that capability assertions
// (engine-language, edition-number, three-layer, etc.) should scan.
const EDITORIAL_SECTION_HEADERS = new Set([
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

// Footer sections — editorial metadata (canon tracking, indexes, coming-next
// teasers) emitted AFTER all article sections. Before S231 pipeline.28 G-W46
// fix, these were not recognized as sections, so their content got absorbed
// into the body of the last editorial section (typically LETTERS). That
// silently broke assertEditionNumbersNotInArticleText (footer routinely
// cites E91/E92/E93 for canon-tracking; assertion flagged this as
// blocking-tier rule violation in article body) and made
// assertAtLeastThreeFemaleCitizens fail (NAMES INDEX carries POPIDs that
// the body-only scanner never saw).
//
// Per-assertion behavior is documented inline at each assertion; the parser
// just labels these correctly so assertions can opt in or out via the
// `isFooter` flag on each section.
const FOOTER_SECTION_HEADERS = new Set([
  'NAMES INDEX',
  'BUSINESSES NAMED',
  'ARTICLE TABLE',
  'CITIZEN USAGE LOG',
  'STORYLINES UPDATED',
  'COMING NEXT EDITION',
]);

const SECTION_HEADERS = new Set([
  ...EDITORIAL_SECTION_HEADERS,
  ...FOOTER_SECTION_HEADERS,
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
    if (DIVIDER_RE.test(line) || MAJOR_BOUNDARY_RE.test(line)) {
      // Look ahead for the section header, skipping blank lines + any
      // adjacent major-boundary / divider lines (footer block opens with
      // `------ \n ====== \n blank \n NAMES INDEX \n ------` shape).
      let lookI = i + 1;
      while (lookI < lines.length) {
        const peek = (lines[lookI] || '').trim();
        if (peek === '' || DIVIDER_RE.test(peek) || MAJOR_BOUNDARY_RE.test(peek)) {
          lookI++;
          continue;
        }
        break;
      }
      const next = (lines[lookI] || '').trim();
      if (SECTION_HEADERS.has(next.toUpperCase())) {
        // Close the previous section
        if (currentSection) {
          finalizeSection(currentSection);
          sections.push(currentSection);
        }
        const titleUpper = next.toUpperCase();
        currentSection = {
          title: titleUpper,
          body: '',
          articles: [],
          isFooter: FOOTER_SECTION_HEADERS.has(titleUpper),
        };
        // Advance past the header + any trailing divider/boundary on the next
        // line. lookI points to the header line; resume one past it.
        i = lookI + 1;
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
 *
 * G-W20 fix (S215): anchor on `# Headline` markdown markers. The pre-fix
 * heuristic was "block first line short + capitalized AND block second line
 * is `By <Name>`" — that misses the consolidated E89+ format where headline,
 * subhead, and byline are paragraph-separated:
 *
 *     # OARI Rubric Locks; Eight Votes Now Visible
 *
 *     **The C95 OARI architecture is now visible on paper — ...**
 *
 *     *By Carmen Delaine | Bay Tribune Civic Ledger*
 *
 * Splitting on `\n{2,}` made `next` (the subhead) — not the byline — so the
 * heuristic failed and every section collapsed to 1 article. C93 returned 8
 * total articles for an 8-byline edition (1 per section) instead of per-byline.
 *
 * Post-fix: walk lines; every `# Headline` line opens a new article slice;
 * everything before the first `#` becomes section preamble (a single article
 * with no headline, preserving old-format behavior for editions that pre-date
 * the `#`-headlined consolidated format). Byline extracted from the body.
 */
function finalizeSection(section) {
  // Footer sections (NAMES INDEX, BUSINESSES NAMED, etc.) carry editorial
  // metadata, not articles. Don't split by `# Headline`; capability assertions
  // that need to read footer content read section.body directly + check
  // section.isFooter to scope appropriately. (G-W46 + G-W48 fix S231.)
  if (section.isFooter) {
    section.articles = [];
    return;
  }
  const text = section.body;
  const lines = text.split('\n');
  const slices = [];
  let currentHeadline = '';
  let currentLines = [];

  for (let k = 0; k < lines.length; k++) {
    const line = lines[k];
    // Only h1 markers `# Headline` count as article boundaries.
    // h2/h3 (`## Subhead`) appear inside article bodies for callouts;
    // splitting on those would break mid-article. h4+ same reasoning.
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) {
      if (currentLines.length > 0 || currentHeadline) {
        slices.push({ headline: currentHeadline, lines: currentLines });
      }
      currentHeadline = m[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0 || currentHeadline) {
    slices.push({ headline: currentHeadline, lines: currentLines });
  }

  const articles = [];
  for (let s = 0; s < slices.length; s++) {
    const slice = slices[s];
    const body = slice.lines.join('\n').trim();
    if (!slice.headline && !body) continue;
    // Byline: first `By <Name>` line in body. Allow up to 2 leading/trailing
    // markdown markers (italic `*By ...*` or bold `**By ...**` per Hal's
    // E93 wrap shape).
    const bm = body.match(/(?:^|\n)\s*[*_]{0,2}By\s+([^|*_\n]+?)(?:\s*[|]|\s*[*_]{0,2}\s*(?:\n|$))/i);
    articles.push({
      headline: slice.headline,
      byline: bm ? bm[1].trim() : '',
      body: body,
    });
  }
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
