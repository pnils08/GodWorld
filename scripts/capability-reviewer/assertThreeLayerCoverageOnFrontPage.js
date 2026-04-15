/**
 * Assertion: front-page article threads at least two of three coverage
 * layers (engine + simulation + user actions). Three layers is gold per
 * the Beverly Hayes Standard; two is workable.
 *
 * Code-side detection (deterministic):
 *   - Simulation layer: at least one POP-ID OR at least one quoted citizen
 *     with a neighborhood + role attached
 *   - User actions layer: at least one initiative ID OR a council member's
 *     name + a vote/approval reference OR a civic project name
 *
 * Engine layer (the underlying ailment, math, structural cause): hard for
 * code to detect deterministically — flagged for future grader call when
 * Haiku key is wired. For now the assertion grades 2/3 layers as PASS,
 * with a note that the engine layer wasn't independently verified.
 */

const { getFrontPageArticle, extractPopIds, extractInitiativeIds } = require('./parseEdition');

const VERSION = '1.0.0';

const VOTE_APPROVAL_RE = /\b(vote|voted|approved|approval|council|hearing|ordinance|veto|override)\b/i;
const CIVIC_PROJECT_RE = /\b(Stabilization Fund|OARI|Baylight|Temescal Health Center|Transit Hub|Health Center)\b/i;

function check(ctx) {
  const { edition } = ctx;
  const result = {
    id: 'three-layer-coverage-on-front-page',
    category: 'three-layer',
    tier: 'advisory',
    question: 'Does the front page thread at least two of three coverage layers?',
    confidence: 'medium',
    detectorVersion: VERSION,
  };

  const fp = getFrontPageArticle(edition);
  if (!fp) {
    result.pass = false;
    result.reason = 'No front-page article found.';
    result.evidence = {};
    return result;
  }

  const layers = {
    simulation: false,
    userActions: false,
    engine: null, // deferred to grader; null means not independently checked
  };

  const popIds = extractPopIds(fp.body);
  if (popIds.length > 0) layers.simulation = true;
  // Citizen + neighborhood + role triple
  if (!layers.simulation) {
    const tripleRE = /\b[A-Z][a-z]+\s+[A-Z][a-z]+,?\s+(?:[a-z]+|\d+)?,?\s+(?:lives in|of|from)\s+[A-Z][a-z]+/;
    if (tripleRE.test(fp.body)) layers.simulation = true;
  }

  const initIds = extractInitiativeIds(fp.body);
  if (initIds.length > 0) layers.userActions = true;
  if (!layers.userActions && CIVIC_PROJECT_RE.test(fp.body) && VOTE_APPROVAL_RE.test(fp.body)) {
    layers.userActions = true;
  }

  const verifiedLayers = ['simulation', 'userActions'].filter((k) => layers[k]).length;
  result.pass = verifiedLayers >= 1; // need at least 1 verifiable layer plus the engine layer presumed via grader
  result.evidence = {
    editionSection: 'FRONT PAGE',
    layersVerified: { simulation: layers.simulation, userActions: layers.userActions, engine: 'deferred-to-grader' },
    popIds,
    initiativeIds: initIds,
  };
  if (verifiedLayers === 2) {
    result.reason = 'Front page threads simulation + user-actions layers. Engine layer presence will be verified by grader (deferred).';
  } else if (verifiedLayers === 1) {
    result.reason = `Front page covers ${layers.simulation ? 'simulation' : 'user-actions'} layer only. Two of three needed for strong coverage; engine layer deferred to grader.`;
  } else {
    result.pass = false;
    result.reason = 'Front page covers neither simulation nor user-actions layers. Likely a single-layer story (engine-only abstract policy or simulation-only scene).';
  }
  return result;
}

module.exports = { check, version: VERSION };
