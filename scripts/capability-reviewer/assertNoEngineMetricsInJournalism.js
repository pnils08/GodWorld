/**
 * Assertion: no engine metrics, simulation language, or system tokens leak
 * into journalism. Per .claude/rules/newsroom.md.
 *
 * Forbidden tokens: "tension score", "severity level", "civic load", raw
 * system labels ("ailment", "writeback", "ctx field"), and the word "cycle"
 * in any article body (cycles are forbidden per newsroom.md).
 */

const VERSION = '1.0.0';

const FORBIDDEN_PHRASES = [
  /\btension score\b/i,
  /\bseverity level\b/i,
  /\bcivic load\b/i,
  /\bailment\b/i,
  /\bwriteback\b/i,
  /\bctx\.\w+/i,
  /\bcycles?\b(?!\s*(of|to|since|prior))/i, // "cycle" forbidden as a unit; allow "cycles of" / "cycles to" idioms
  /\bimpact\s*score\s*[:=]\s*[\d.]+/i,
  /\bImplementationPhase\b/,
];

function check(ctx) {
  const { edition } = ctx;
  const result = {
    id: 'no-engine-metrics-in-journalism',
    category: 'rubric-fidelity',
    tier: 'blocking',
    question: 'Is journalism free of engine metrics, system labels, and the word "cycle"?',
    confidence: 'high',
    detectorVersion: VERSION,
  };

  const offenders = [];
  for (const section of edition.sections) {
    if (section.title === "EDITOR'S DESK") continue; // Mags can use the term
    for (const article of section.articles) {
      const hits = [];
      for (const pat of FORBIDDEN_PHRASES) {
        const m = article.body.match(pat);
        if (m) hits.push(m[0]);
      }
      if (hits.length) {
        offenders.push({
          section: section.title,
          headline: article.headline,
          terms: hits.slice(0, 3),
        });
      }
    }
  }

  result.pass = offenders.length === 0;
  result.evidence = {
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 5),
  };
  result.reason = result.pass
    ? 'No engine metrics, system labels, or forbidden tokens in article bodies.'
    : `${offenders.length} article(s) leak engine/system language into journalism.`;
  return result;
}

module.exports = { check, version: VERSION };
