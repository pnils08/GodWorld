/**
 * Assertion: edition numbers are not referenced in article body text.
 *
 * Per .claude/rules/newsroom.md — citizens and reporters don't know what
 * edition numbers are. Header allowed; article body forbidden.
 *
 * Forbidden patterns: "Edition 91", "E91", "Cycle Pulse 91", and "cycle 91"
 * inside an article body (the word "cycle" itself is also forbidden in copy
 * per the same rule, but that's a separate assertion in the engine-metrics
 * check).
 */

const VERSION = '1.0.0';

const PATTERNS = [
  /\bEdition\s+\d{2,3}\b/i,
  /\bE\d{2,3}\b/,
  /\bCycle\s+Pulse\s+\d{2,3}\b/i,
];

function check(ctx) {
  const { edition } = ctx;
  const result = {
    id: 'no-edition-numbers-in-article-text',
    category: 'rubric-fidelity',
    tier: 'blocking',
    question: 'Are all edition numbers absent from article body text?',
    confidence: 'high',
    detectorVersion: VERSION,
  };

  const offenders = [];
  for (const section of edition.sections) {
    if (section.title === 'PODCAST') continue; // podcasts may include credits
    for (const article of section.articles) {
      for (const pat of PATTERNS) {
        const m = article.body.match(pat);
        if (m) {
          offenders.push({
            section: section.title,
            headline: article.headline,
            match: m[0],
            context: contextAround(article.body, m.index, 60),
          });
          break;
        }
      }
    }
  }

  result.pass = offenders.length === 0;
  result.evidence = {
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 5),
  };
  result.reason = result.pass
    ? 'No edition numbers found in article body text.'
    : `${offenders.length} article(s) reference an edition number in body text.`;
  return result;
}

function contextAround(text, idx, span) {
  const start = Math.max(0, idx - span);
  const end = Math.min(text.length, idx + span);
  return text.slice(start, end).replace(/\s+/g, ' ');
}

module.exports = { check, version: VERSION };
