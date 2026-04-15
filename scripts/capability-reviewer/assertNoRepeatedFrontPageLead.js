/**
 * Assertion: front page lead substantively differs from the previous edition.
 *
 * Compares the front-page headline + first paragraph to the previous cycle's.
 * "Substantively differs" = headline tokens overlap < 60%.
 */

const fs = require('fs');
const path = require('path');
const { parse, getFrontPageArticle } = require('./parseEdition');

const VERSION = '1.0.0';

function tokenize(s) {
  return new Set(
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );
}

function jaccard(a, b) {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function check(ctx) {
  const { edition, cycle, editionsDir } = ctx;
  const result = {
    id: 'no-repeated-front-page-lead',
    category: 'freshness',
    tier: 'advisory',
    question: 'Does the front-page lead substantively differ from the previous edition?',
    confidence: 'high',
    detectorVersion: VERSION,
  };

  const prevPath = path.join(editionsDir, `cycle_pulse_edition_${cycle - 1}.txt`);
  if (!fs.existsSync(prevPath)) {
    result.pass = true;
    result.reason = `No previous edition (c${cycle - 1}) on disk — assertion vacuously satisfied.`;
    result.evidence = {};
    return result;
  }

  const prev = parse(prevPath);
  const prevFp = getFrontPageArticle(prev);
  const fp = getFrontPageArticle(edition);
  if (!fp || !prevFp) {
    result.pass = true;
    result.reason = 'Could not locate front-page article in one of the editions — assertion skipped.';
    result.evidence = {};
    return result;
  }

  const prevTokens = tokenize(`${prevFp.headline} ${prevFp.body.slice(0, 500)}`);
  const curTokens = tokenize(`${fp.headline} ${fp.body.slice(0, 500)}`);
  const overlap = jaccard(prevTokens, curTokens);

  result.pass = overlap < 0.6;
  result.evidence = {
    editionSection: 'FRONT PAGE',
    quote: `current: ${fp.headline} | prev: ${prevFp.headline}`,
  };
  result.reason = result.pass
    ? `Lead differs from c${cycle - 1} (token overlap ${(overlap * 100).toFixed(0)}%, threshold 60%).`
    : `Lead too similar to c${cycle - 1} (token overlap ${(overlap * 100).toFixed(0)}%, threshold 60%).`;
  return result;
}

module.exports = { check, version: VERSION };
