/**
 * detectRepeatingEvents — same crisis recurring in Riley_Digest across 3+ recent
 * cycles, where a corresponding initiative exists but ImplementationPhase hasn't
 * advanced. Uses Riley_Digest.Issues + PatternFlag as the recurrence signal,
 * cross-referenced to Initiative_Tracker.PolicyDomain.
 *
 * Version history:
 *   1.0.0  initial — per-word tokenization. Failure mode (G-RC8, engine.19):
 *          stable error template like "Phase2-CityDynamics persistent error
 *          handler" tokenized into 6 ≥4-char tokens, all recurring across
 *          cycles, emitted as 6 independent patterns from one root issue.
 *   1.1.0  S226 engine.19 — row-provenance dedup. Tokens that appear in
 *          identical (cycle, rowIdx) provenance across cycles are coalesced
 *          into one pattern; representative token = longest (most specific);
 *          full token group surfaced under `recurringTokens` evidence field.
 *          Preserves backward-compatible `recurringIssue` field for downstream.
 */

const VERSION = '1.1.0';
const RECUR_WINDOW = 3;

function tokenize(s) {
  if (!s) return [];
  return String(s)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 4);
}

function detect(ctx) {
  const { cycle, snapshot } = ctx;
  const digest = snapshot.Riley_Digest || [];
  const initiatives = snapshot.Initiative_Tracker || [];

  const recent = digest
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => {
      const c = parseInt(row.Cycle, 10);
      return !Number.isNaN(c) && c >= cycle - RECUR_WINDOW && c <= cycle;
    });

  // Per-token provenance: tokens → Set of "cycle:rowIdx" strings.
  // Per-token cycle coverage: tokens → Set<cycle>.
  // Per-token first-appearance order: tokens → [cycle, idx, tokenPos] for
  //   primary-selection tie-break.
  // PatternFlag-membership set: tokens that ever appeared in a row's
  //   PatternFlag field (engine's canonical classification → highest priority).
  const tokenProvenance = new Map();
  const tokenCycles = new Map();
  const tokenFirstSeen = new Map();
  const patternFlagTokens = new Set();
  let appearanceCounter = 0;
  for (const { row, idx } of recent) {
    const c = parseInt(row.Cycle, 10);
    const issueTokens = tokenize(row.Issues);
    const flagTokens = tokenize(row.PatternFlag);
    flagTokens.forEach(t => patternFlagTokens.add(t));
    const tokens = new Set(issueTokens.concat(flagTokens));
    for (const t of tokens) {
      if (!tokenProvenance.has(t)) tokenProvenance.set(t, new Set());
      tokenProvenance.get(t).add(c + ':' + idx);
      if (!tokenCycles.has(t)) tokenCycles.set(t, new Set());
      tokenCycles.get(t).add(c);
      if (!tokenFirstSeen.has(t)) tokenFirstSeen.set(t, appearanceCounter++);
    }
  }

  // Recurring tokens appear in >= RECUR_WINDOW distinct cycles.
  const recurringTokens = [...tokenCycles.entries()]
    .filter(([, cycles]) => cycles.size >= RECUR_WINDOW)
    .map(([t]) => t);

  if (recurringTokens.length === 0) return [];

  // Coalesce tokens with identical provenance. Tokens that always co-occur
  // (same cycle + same row, every time) describe ONE recurring issue rather
  // than N. Pre-v1.1 a stable error template "transformer outage uptown
  // infrastructure shortfall" emitted 5 patterns; post-v1.1 it emits 1
  // pattern with 5 tokens in the recurringTokens evidence field.
  const groups = new Map();
  for (const t of recurringTokens) {
    const provKey = [...tokenProvenance.get(t)].sort().join('|');
    if (!groups.has(provKey)) groups.set(provKey, []);
    groups.get(provKey).push(t);
  }

  // Initiative index by policy domain.
  const initByDomain = new Map();
  for (const init of initiatives) {
    const d = (init.PolicyDomain || '').toLowerCase();
    if (!d) continue;
    if (!initByDomain.has(d)) initByDomain.set(d, []);
    initByDomain.get(d).push(init);
  }

  const out = [];
  for (const tokens of groups.values()) {
    // Representative token tie-break:
    //   (1) PatternFlag membership wins (engine's canonical classification)
    //   (2) Else earliest first-appearance order (topic-leading word in
    //       reading order — typically the topic noun, not the action verb).
    const tokensSorted = tokens.slice().sort((a, b) => {
      const aFlag = patternFlagTokens.has(a) ? 0 : 1;
      const bFlag = patternFlagTokens.has(b) ? 0 : 1;
      if (aFlag !== bFlag) return aFlag - bFlag;
      return (tokenFirstSeen.get(a) || 0) - (tokenFirstSeen.get(b) || 0);
    });
    const primary = tokensSorted[0];

    // Find a matching policy domain — any token whose substring matches a domain.
    let match = null;
    for (const t of tokensSorted) {
      const m = [...initByDomain.keys()].find(d => d.includes(t) || t.includes(d));
      if (m) { match = m; break; }
    }
    const inits = match ? initByDomain.get(match) : [];
    const stuck = inits.filter(i => {
      const phase = (i.ImplementationPhase || '').toLowerCase();
      return !phase || /plan|propos|stall|pending/.test(phase);
    });

    if (stuck.length === 0 && inits.length > 0) continue;

    const severity = stuck.length > 0 ? 'high' : 'medium';
    const cyclesRecurring = tokenCycles.get(primary).size;
    out.push({
      type: 'repeating-event',
      severity,
      cyclesInState: RECUR_WINDOW,
      affectedEntities: {
        citizens: [],
        neighborhoods: [],
        initiatives: stuck.map(s => s.InitiativeID || s.Name).filter(Boolean),
        councilSeats: [],
      },
      evidence: {
        sheet: 'Riley_Digest',
        rows: [],
        fields: {
          recurringIssue: primary,
          recurringTokens: tokensSorted,
          cyclesRecurring,
          matchedPolicyDomain: match || null,
          stuckInitiativeCount: stuck.length,
        },
      },
      description: `Issue "${primary}"${tokensSorted.length > 1 ? ` (+ ${tokensSorted.length - 1} co-occurring tokens)` : ''} recurred ${cyclesRecurring} cycles${stuck.length ? ` while ${stuck.length} initiative(s) in domain "${match}" remain unadvanced` : ''}`,
      detectorVersion: VERSION,
    });
  }

  return out;
}

module.exports = { detect, version: VERSION };
