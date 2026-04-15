/**
 * Assertion: article-length-balance — every article is 200–1200 words AND
 * no single desk's total output is >3× another desk's total output.
 *
 * Moved to capability reviewer from cycle-review Pass 1.1 (Phase 39.4, S147).
 */

const VERSION = '1.0.0';

const MIN_WORDS = 200;
const MAX_WORDS = 1200;
const IMBALANCE_RATIO = 3;

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function deskForSection(title) {
  // The edition uses top-level section titles which map 1:1 to desks for this check.
  // FRONT PAGE, LETTERS, PODCAST, OBITUARIES are excluded from the balance calculation —
  // front page is cross-desk, letters/podcast/obits have different length norms.
  const EXCLUDED = new Set(['FRONT PAGE', 'LETTERS', 'LETTERS TO THE EDITOR', 'PODCAST', 'OBITUARIES', "EDITOR'S DESK"]);
  if (EXCLUDED.has(title)) return null;
  return title;
}

function check(ctx) {
  const { edition } = ctx;
  const result = {
    id: 'article-length-balance',
    category: 'structural',
    tier: 'advisory',
    question: 'Are article lengths balanced — every article 200–1200 words, no single desk 3× another?',
    confidence: 'high',
    detectorVersion: VERSION,
  };

  const articleFlags = [];
  const deskWords = {};
  for (const section of edition.sections) {
    const desk = deskForSection(section.title);
    for (const article of section.articles) {
      const body = article.body || '';
      const count = wordCount(body);
      if (count === 0) continue;
      if (count < MIN_WORDS) {
        articleFlags.push({ section: section.title, headline: article.headline, wordCount: count, reason: 'too short' });
      } else if (count > MAX_WORDS) {
        articleFlags.push({ section: section.title, headline: article.headline, wordCount: count, reason: 'too long' });
      }
      if (desk) deskWords[desk] = (deskWords[desk] || 0) + count;
    }
  }

  const deskTotals = Object.entries(deskWords);
  let imbalance = null;
  if (deskTotals.length >= 2) {
    const sorted = [...deskTotals].sort((a, b) => b[1] - a[1]);
    const [topDesk, topWords] = sorted[0];
    const [botDesk, botWords] = sorted[sorted.length - 1];
    if (botWords > 0 && topWords / botWords > IMBALANCE_RATIO) {
      imbalance = { topDesk, topWords, botDesk, botWords, ratio: Number((topWords / botWords).toFixed(2)) };
    }
  }

  const pass = articleFlags.length === 0 && !imbalance;
  result.pass = pass;
  result.evidence = {
    flaggedArticles: articleFlags,
    deskTotals: Object.fromEntries(deskTotals),
    imbalance,
  };
  result.reason = pass
    ? `All articles within ${MIN_WORDS}–${MAX_WORDS} words; desk totals balanced.`
    : `${articleFlags.length} article(s) outside length bounds; ${imbalance ? `${imbalance.topDesk} ${imbalance.ratio}× larger than ${imbalance.botDesk}` : 'desk totals balanced'}.`;
  return result;
}

module.exports = { check, version: VERSION };
