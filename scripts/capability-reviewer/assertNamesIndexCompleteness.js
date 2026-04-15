/**
 * Assertion: names-index-completeness — every article with a "Names Index:"
 * footer lists names that appear in the article body (no orphans), and every
 * proper-noun person reference in the body appears in the index (no missing).
 *
 * Moved to capability reviewer from cycle-review Pass 1.2 (Phase 39.4, S147).
 */

const { extractNameCandidates } = require('./parseEdition');

const VERSION = '1.0.0';

function splitTopLevel(text) {
  // Split on commas/semicolons, but only at paren/bracket depth 0.
  // Names Index entries often contain internal commas: "Denise Carter (D1, OPP)".
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function extractNamesIndex(articleBody) {
  // Names Index typically appears as a footer line: "Names Index: Ramon Vega, Clarissa Dane (D3, OPP), …"
  const m = (articleBody || '').match(/Names Index:\s*([^\n]+)/i);
  if (!m) return null;
  // Strip the parenthetical role descriptors before matching against body text —
  // the body rarely spells out "Clarissa Dane (D3, OPP)"; it just says "Dane" or
  // "Clarissa Dane". Keep only the lead name token sequence.
  return splitTopLevel(m[1]).map((entry) => entry.replace(/\s*[\(\[].*?[\)\]]\s*/g, '').trim()).filter(Boolean);
}

function removeNamesIndexLine(body) {
  return (body || '').replace(/Names Index:[^\n]*\n?/i, '');
}

function check(ctx) {
  const { edition } = ctx;
  const result = {
    id: 'names-index-completeness',
    category: 'structural',
    tier: 'advisory',
    question: 'Does every article have a complete Names Index — no orphans, no missing names?',
    confidence: 'high',
    detectorVersion: VERSION,
  };

  const issues = [];
  let articlesChecked = 0;

  for (const section of edition.sections) {
    // Skip sections where a names index is not a convention.
    if (['PODCAST', 'OBITUARIES', 'CLASSIFIEDS', 'WEATHER'].includes(section.title)) continue;
    for (const article of section.articles) {
      const index = extractNamesIndex(article.body);
      if (!index) {
        if (section.title !== 'LETTERS' && section.title !== 'LETTERS TO THE EDITOR' && article.body && article.body.length > 300) {
          issues.push({ section: section.title, headline: article.headline, issue: 'missing names index' });
        }
        continue;
      }
      articlesChecked++;
      const bodyMinusIndex = removeNamesIndexLine(article.body);
      const bodyNames = new Set(extractNameCandidates(bodyMinusIndex));
      const orphans = index.filter((name) => !bodyNames.has(name));
      // "Missing" is harder to detect cleanly because bodyNames has false positives
      // from the extractor. We only flag orphans here — the inverse check is left
      // to the grader-only assertions.
      if (orphans.length > 0) {
        issues.push({ section: section.title, headline: article.headline, orphans });
      }
    }
  }

  const pass = issues.length === 0;
  result.pass = pass;
  result.evidence = { articlesChecked, issues };
  result.reason = pass
    ? `All ${articlesChecked} article(s) with a Names Index have no orphans.`
    : `${issues.length} article(s) have Names Index issues.`;
  return result;
}

module.exports = { check, version: VERSION };
