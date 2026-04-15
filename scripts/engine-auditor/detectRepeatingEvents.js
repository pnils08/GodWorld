/**
 * detectRepeatingEvents — same crisis recurring in Riley_Digest across 3+ recent
 * cycles, where a corresponding initiative exists but ImplementationPhase hasn't
 * advanced. Uses Riley_Digest.Issues + PatternFlag as the recurrence signal,
 * cross-referenced to Initiative_Tracker.PolicyDomain.
 */

const VERSION = '1.0.0';
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
    .filter(r => {
      const c = parseInt(r.Cycle, 10);
      return !Number.isNaN(c) && c >= cycle - RECUR_WINDOW && c <= cycle;
    });

  const issuesByCycle = new Map();
  for (const r of recent) {
    const c = parseInt(r.Cycle, 10);
    const issues = tokenize(r.Issues).concat(tokenize(r.PatternFlag));
    if (!issuesByCycle.has(c)) issuesByCycle.set(c, new Set());
    issues.forEach(t => issuesByCycle.get(c).add(t));
  }

  const counts = new Map();
  for (const set of issuesByCycle.values()) {
    for (const t of set) counts.set(t, (counts.get(t) || 0) + 1);
  }

  const recurring = [...counts.entries()]
    .filter(([, n]) => n >= RECUR_WINDOW)
    .map(([t]) => t);

  if (recurring.length === 0) return [];

  const out = [];
  const initByDomain = new Map();
  for (const init of initiatives) {
    const d = (init.PolicyDomain || '').toLowerCase();
    if (!d) continue;
    if (!initByDomain.has(d)) initByDomain.set(d, []);
    initByDomain.get(d).push(init);
  }

  const grouped = new Set();
  for (const token of recurring) {
    if (grouped.has(token)) continue;
    const match = [...initByDomain.keys()].find(d => d.includes(token) || token.includes(d));
    const inits = match ? initByDomain.get(match) : [];
    const stuck = inits.filter(i => {
      const phase = (i.ImplementationPhase || '').toLowerCase();
      return !phase || /plan|propos|stall|pending/.test(phase);
    });

    if (stuck.length === 0 && inits.length > 0) continue;

    const severity = stuck.length > 0 ? 'high' : 'medium';
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
          recurringIssue: token,
          cyclesRecurring: counts.get(token),
          matchedPolicyDomain: match || null,
          stuckInitiativeCount: stuck.length,
        },
      },
      description: `Issue "${token}" recurred ${counts.get(token)} cycles${stuck.length ? ` while ${stuck.length} initiative(s) in domain "${match}" remain unadvanced` : ''}`,
      detectorVersion: VERSION,
    });
    grouped.add(token);
  }

  return out;
}

module.exports = { detect, version: VERSION };
