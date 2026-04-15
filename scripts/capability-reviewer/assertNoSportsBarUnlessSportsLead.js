/**
 * Assertion: no "watching the game at a sports bar" framing in non-sports
 * articles, unless sports is the top story for the cycle.
 *
 * Sports = top story when: the audit JSON has no high-severity ailments,
 * OR the front-page section's lead headline contains a sports keyword.
 */

const { getFrontPageArticle } = require('./parseEdition');

const VERSION = '1.0.0';

const SPORTS_KEYWORDS = /\b(A's|Athletics|Bulls|baseball|basketball|playoff|series|game|swing|home run|inning)\b/i;
const SPORTS_BAR_PATTERNS = [
  /\bsports bar\b/i,
  /\bwatching the game\b/i,
  /\bwatching the (A's|Athletics|Bulls)\b/i,
  /\bbar\s+(crowd|patrons|television|tv)\b/i,
];

function check(ctx) {
  const { edition } = ctx;
  const result = {
    id: 'no-sports-bar-unless-sports-lead',
    category: 'rubric-fidelity',
    tier: 'advisory',
    question: 'Are sports-bar scenes confined to articles when sports is the cycle lead?',
    confidence: 'high',
    detectorVersion: VERSION,
  };

  const fp = getFrontPageArticle(edition);
  const sportsIsLead = fp && SPORTS_KEYWORDS.test(fp.headline);

  const offenders = [];
  for (const section of edition.sections) {
    if (section.title === 'SPORTS') continue;
    if (sportsIsLead && section.title === 'FRONT PAGE') continue;
    for (const article of section.articles) {
      for (const pat of SPORTS_BAR_PATTERNS) {
        const m = article.body.match(pat);
        if (m) {
          offenders.push({
            section: section.title,
            headline: article.headline,
            match: m[0],
          });
          break;
        }
      }
    }
  }

  result.pass = offenders.length === 0;
  result.evidence = {
    sportsIsLead,
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 5),
  };
  result.reason = result.pass
    ? sportsIsLead
      ? 'Sports is the cycle lead — sports-bar framing is acceptable; none flagged.'
      : 'No sports-bar framing in non-sports sections.'
    : `${offenders.length} non-sports article(s) use sports-bar framing while sports isn't the lead.`;
  return result;
}

module.exports = { check, version: VERSION };
