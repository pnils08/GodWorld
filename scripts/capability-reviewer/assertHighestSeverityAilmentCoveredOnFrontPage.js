/**
 * Assertion: front page leads with the highest-severity engine ailment.
 *
 * The Varek anti-example: E91 led with NBA expansion while Temescal
 * (highest severity, 88 cyclesInState) wasn't covered. This is the
 * structural test that prevents that pattern.
 *
 * Pass if the front-page article body mentions at least one of:
 *   - Affected initiative ID from the highest-severity ailment
 *   - Affected initiative name (from evidence.fields.Name)
 *   - Affected neighborhood name
 *   - Key terms from the description (e.g., "Temescal", "Health Center")
 */

const { getFrontPageArticle } = require('./parseEdition');

const VERSION = '1.0.0';

function check(ctx) {
  const { audit, edition } = ctx;
  const result = {
    id: 'front-page-leads-with-highest-severity-ailment',
    category: 'coverage',
    tier: 'blocking',
    question: 'Does the front-page article cover the highest-severity engine ailment?',
    confidence: 'high',
    detectorVersion: VERSION,
  };

  const highSeverity = (audit.patterns || [])
    .filter((p) => p.severity === 'high' && p.type !== 'improvement' && p.type !== 'anomaly')
    .sort((a, b) => (b.cyclesInState || 0) - (a.cyclesInState || 0));

  if (!highSeverity.length) {
    result.pass = true;
    result.reason = 'No high-severity ailments this cycle — assertion vacuously satisfied.';
    result.evidence = { auditPatternId: null };
    return result;
  }

  const top = highSeverity[0];
  const fp = getFrontPageArticle(edition);
  if (!fp) {
    result.pass = false;
    result.reason = 'No front-page article found in compiled edition.';
    result.evidence = { auditPatternId: top.evidence?.fields?.InitiativeID || null, editionSection: 'FRONT PAGE' };
    return result;
  }

  const haystack = `${fp.headline}\n${fp.body}`.toLowerCase();
  const checks = [];

  // Initiative ID
  for (const id of top.affectedEntities?.initiatives || []) {
    if (haystack.includes(id.toLowerCase())) checks.push(`initiative ID ${id}`);
  }
  // Initiative name
  const initName = top.evidence?.fields?.Name;
  if (initName) {
    const nameTokens = initName.toLowerCase().split(/[\s—-]+/).filter((t) => t.length > 4);
    const hits = nameTokens.filter((t) => haystack.includes(t));
    if (hits.length >= 2) checks.push(`initiative name tokens (${hits.join(', ')})`);
  }
  // Neighborhood
  for (const n of top.affectedEntities?.neighborhoods || []) {
    if (haystack.includes(n.toLowerCase())) checks.push(`neighborhood ${n}`);
  }

  result.pass = checks.length > 0;
  result.evidence = {
    auditPatternId: top.evidence?.fields?.InitiativeID || top.description,
    editionSection: 'FRONT PAGE',
    quote: fp.headline,
  };
  if (result.pass) {
    result.reason = `Front page covers highest-severity ailment (${initName || top.description}). Matches: ${checks.join('; ')}.`;
  } else {
    result.reason = `Front page does not cover highest-severity ailment (${initName || top.description}, cyclesInState=${top.cyclesInState}). No mention of initiative ID, name tokens, or affected neighborhoods.`;
  }
  return result;
}

module.exports = { check, version: VERSION };
