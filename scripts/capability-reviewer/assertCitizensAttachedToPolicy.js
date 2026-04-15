/**
 * Assertion: every civic/policy article has at least one named citizen quote
 * or POP-ID reference. Story-evaluation §"What Makes a Story Weak" — no
 * citizens attached = report not journalism.
 *
 * Civic/policy articles = articles in the CIVIC section, plus front-page
 * articles whose body mentions an initiative ID. Sports recaps and culture
 * pieces are exempt.
 */

const { extractPopIds, extractNameCandidates, extractInitiativeIds } = require('./parseEdition');

const VERSION = '1.0.0';

function check(ctx) {
  const { edition } = ctx;
  const result = {
    id: 'citizens-attached-to-policy',
    category: 'three-layer',
    tier: 'advisory',
    question: 'Does every civic/policy article cite a named citizen or POP-ID?',
    confidence: 'high',
    detectorVersion: VERSION,
  };

  const targetSections = ['CIVIC', 'FRONT PAGE', 'BUSINESS'];
  const policyArticles = [];
  for (const section of edition.sections) {
    if (!targetSections.includes(section.title)) continue;
    for (const article of section.articles) {
      const isPolicy =
        section.title === 'CIVIC' ||
        extractInitiativeIds(article.body).length > 0 ||
        /\b(council|mayor|initiative|ordinance|hearing|vote|policy)\b/i.test(article.body);
      if (isPolicy) policyArticles.push({ section: section.title, article });
    }
  }

  if (!policyArticles.length) {
    result.pass = true;
    result.reason = 'No civic/policy articles in this edition — assertion vacuously satisfied.';
    result.evidence = { count: 0 };
    return result;
  }

  const failures = [];
  for (const { section, article } of policyArticles) {
    const popIds = extractPopIds(article.body);
    const names = extractNameCandidates(article.body);
    if (popIds.length === 0 && names.length < 2) {
      failures.push({ section, headline: article.headline });
    }
  }

  result.pass = failures.length === 0;
  result.evidence = {
    totalPolicy: policyArticles.length,
    failureCount: failures.length,
    failures: failures.slice(0, 5),
  };
  result.reason = result.pass
    ? `All ${policyArticles.length} civic/policy articles cite at least one named citizen or POP-ID.`
    : `${failures.length}/${policyArticles.length} civic/policy articles lack citizen attribution.`;
  return result;
}

module.exports = { check, version: VERSION };
