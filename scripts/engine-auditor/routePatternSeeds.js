/**
 * routePatternSeeds.js — engine.35 Phase 2 (S259): route engine_audit patterns →
 * primary, attributed, desk-ready Story_Seed_Deck seeds.
 *
 * THE EMERGENCE BUILD. The deck stops re-deriving stories from recycled storylines
 * (Phase 1 gated that) and instead projects the engine_audit patterns — the real
 * engine-emergent what/why/who units — into the deck as PRIMARY seeds.
 *
 * Architectural seam (why this is Node, post-cycle, not in applyStorySeeds.js):
 *   the deck is built IN-CYCLE in Apps Script, which has NO access to
 *   engine_audit_c{N}.json (that's produced POST-cycle by /engine-review, Node).
 *   So pattern→seed routing is a post-cycle Node enrichment step (Phase 0 CONSUME
 *   decision: engine_audit → baseline_briefs → deck → sift). Confirmed via
 *   applyStorySeeds.js:69 ("auditPattern arg passed null — Apps Script doesn't
 *   have engine_audit").
 *
 * What each pattern-seed carries:
 *   - WHAT  : pattern description / tribuneFraming hookLine
 *   - WHO   : affectedEntities citizens (POPIDs) + covering journalist (POPID)
 *   - DOMAIN: resolved from evidence.fields (sentiment→COMMUNITY, initiative
 *             name→SAFETY/INFRASTRUCTURE/ECONOMIC, etc.) — real, diversified
 *   - PRIORITY (M-O): computePriorityScore_(seed, REAL pattern, …) — severity
 *             actually weights the score (in-cycle seeds pass null → flat MED)
 *   - BYLINE (P-R): scoreAllBylines_ over the canonical Bay_Tribune_Oakland pool
 *             (beat-matched, POPID-attributed, cadence-balanced)
 *   - PacketRef (S): baseline_brief id by subject-overlap join (initiative/POPID/nbhd)
 *   - CoveringJournalistPOPID (T): the covering citizen-journalist's POPID
 *
 * Seed inclusion rule: a seed needs a WORLD ANCHOR (≥1 citizen OR neighborhood OR
 *   initiative). Meta/engine-health patterns with no subject (coverage-gap,
 *   writeback-drift, anchorless repeating-event) are NOT desk stories — logged,
 *   excluded. No silent caps (auto-memory rule).
 *
 * Usage:
 *   node scripts/engine-auditor/routePatternSeeds.js --cycle 97            # dry-run
 *   node scripts/engine-auditor/routePatternSeeds.js --cycle 97 --apply    # live write
 *   node scripts/engine-auditor/routePatternSeeds.js --cycle 97 --apply --force  # overwrite existing
 *
 * Runtime: Node only (engine-auditor lane). Deploy/run gate: rides C98 (post
 * engine.33 smoke). Pattern: feedback_measure-twice-cascading-effects.
 */

require('../../lib/env');
const fs = require('fs');
const path = require('path');
const { getRawSheetData, appendRows, updateRangeByPosition } = require('../../lib/sheets');
const priorityEngine = require('../../utilities/priorityEngine.js');
const bylineEngine = require('../../utilities/bylineEngine.js');
const { buildBylineRoster } = require('./bayTribuneRoster.js');

const OUTPUT_DIR = path.join(__dirname, '../../output');
const DECK_SHEET = 'Story_Seed_Deck';
const PATTERN_SEED_TYPE = 'pattern-emergent';

// Deck columns A-T (18 canonical from saveV3Seeds + 2 new). Index = column position.
const DECK_HEADERS = [
  'Timestamp', 'Cycle', 'SeedID', 'SeedType', 'Domain', 'Neighborhood', 'Priority',
  'SeedText', 'SuggestedJournalist', 'SuggestedAngle', 'VoiceGuidance', 'MatchConfidence',
  'PriorityScore', 'ConsequenceFloor', 'PriorityComponents', 'BylineCandidate',
  'BylineConfidence', 'BylineRationale', 'PacketRef', 'CoveringJournalistPOPID'
];

// ── helpers ──────────────────────────────────────────────────────────────────

function parsePopids(citizenStrings) {
  const out = [];
  (citizenStrings || []).forEach((s) => {
    const m = String(s).match(/POP-\d{4,}/);
    if (m) out.push(m[0]);
  });
  return out;
}

function normSeverity(sev) {
  const s = String(sev || '').toUpperCase();
  if (s === 'HIGH') return 'HIGH';
  if (s === 'LOW') return 'LOW';
  return 'MED';
}
function severityToPriority(sev) {
  const s = normSeverity(sev);
  return s === 'HIGH' ? 3 : (s === 'LOW' ? 1 : 2);
}

// evidence.fields / ailment → deck domain (priorityEngine DOMAIN_WEIGHTS vocab)
function resolveDomain(pattern) {
  const f = ((pattern.evidence || {}).fields) || {};
  const keys = Object.keys(f).map((k) => k.toLowerCase());
  const has = (k) => keys.indexOf(k) >= 0;
  const ail = (pattern.mitigatorState || {}).ailmentCategory || '';

  // metric deltas (improvement neighborhood patterns)
  if (has('sentimentdelta') || has('sentiment')) return 'COMMUNITY';
  if (has('retailvitality') || has('retail')) return 'ECONOMIC';
  if (has('crimeindex') || has('crime')) return 'SAFETY';

  // initiative phase / name
  const name = String(f.Name || '');
  if (f.InitiativeID || name) {
    if (/response|crisis|safety|police|patrol/i.test(name)) return 'SAFETY';
    if (/transit|infrastructure|infastructure|hub|construction|road|bridge/i.test(name)) return 'INFRASTRUCTURE';
    if (/health|clinic|hospital|wellness/i.test(name)) return 'HEALTH';
    if (/apprentic|workforce|econom|labor|\bjob|business|stabiliz/i.test(name)) return 'ECONOMIC';
    if (/school|education|student/i.test(name)) return 'EDUCATION';
    if (f.InitiativeID) return 'CIVIC';
  }

  // ailment category
  const AIL = { economic: 'ECONOMIC', health: 'HEALTH', safety: 'SAFETY', civic: 'CIVIC', social: 'COMMUNITY', environmental: 'ENVIRONMENT' };
  if (ail && AIL[ail]) return AIL[ail];

  // tribuneFraming primary handle
  const sh = ((pattern.tribuneFraming || {}).storyHandles) || {};
  if (sh.business) return 'ECONOMIC';
  if (sh.culture) return 'CULTURE';
  if (sh.civic) return 'CIVIC';
  return 'GENERAL';
}

// which tribuneFraming handle to read the hookLine/angle from, given deck domain
function handleForDomain(domain) {
  if (domain === 'ECONOMIC' || domain === 'BUSINESS') return 'business';
  if (domain === 'CULTURE' || domain === 'ARTS') return 'culture';
  if (domain === 'SPORTS') return 'sports';
  return 'civic';
}

function resolveText(pattern, domain) {
  const sh = ((pattern.tribuneFraming || {}).storyHandles) || {};
  const order = [handleForDomain(domain), 'civic', 'business', 'culture', 'letters'];
  for (const h of order) {
    if (sh[h] && sh[h].hookLine) return sh[h].hookLine;
  }
  return pattern.description || '(no description)';
}
function resolveAngle(pattern, domain) {
  const sh = ((pattern.tribuneFraming || {}).storyHandles) || {};
  const order = [handleForDomain(domain), 'civic', 'business', 'culture', 'letters'];
  for (const h of order) {
    if (sh[h] && sh[h].angle) return sh[h].angle;
  }
  return '';
}

// subject-overlap join: pattern → best baseline_brief id
function joinPacket(pattern, briefs) {
  const inits = ((pattern.affectedEntities || {}).initiatives) || [];
  const pops = parsePopids((pattern.affectedEntities || {}).citizens);
  const nbhds = ((pattern.affectedEntities || {}).neighborhoods) || [];
  let best = null, bestScore = 0;
  for (const b of briefs) {
    let score = 0;
    const bid = String(b.id || '');
    for (const init of inits) { if (init && bid.indexOf(init) >= 0) score += 10; }
    const subj = b.subjectIds || [];
    score += subj.filter((p) => pops.indexOf(p) >= 0).length * 5;
    if (b.neighborhood && nbhds.indexOf(b.neighborhood) >= 0) score += 1;
    if (score > bestScore) { bestScore = score; best = b; }
  }
  // require a real subject link (initiative=10 / POPID-overlap=5). Neighborhood-only
  // (score 1) is too weak to be a reliable packet — drop it to '' (Phase 4/inline).
  return bestScore >= 5 ? { id: best.id, score: bestScore } : null;
}

const BEAT_BONUS = 3; // tie-break toward the canonical beat without overriding a
                      // strong thematic fit (e.g. Maria Keen 9.0 on COMMUNITY) or
                      // blocking cadence spread when a beat saturates.

// ── collapse: same-metric / same-magnitude improvements → citywide synthesis ──
// engine.35 Phase 2 refinement (S260). The engine emits ONE improvement pattern per
// neighborhood, so a single citywide mood-lift fragments into 8-10 near-identical
// "X sentiment rose 0.11" seeds — deck noise that also skews byline cadence. Collapse
// each cluster of ≥MIN_CLUSTER same-metric, same-magnitude-band improvements into one
// citywide seed (synthesis, not faithful routing). Genuine outliers (delta outside the
// band) pass through as individual seeds, keeping their packet. Initiative improvements
// carry no *Delta field → metric=null → never collapsed.
const MIN_CLUSTER = 3;     // a cluster this size or larger collapses
const MAG_BAND = 0.03;     // |delta − cluster anchor| ≤ this = "same magnitude"

// the metric an improvement pattern moved (sentimentDelta, retailVitalityDelta, …).
// null = not a collapsible metric-improvement (initiative improvements, non-improvements).
function improvementMetric(pattern) {
  if (pattern.type !== 'improvement') return null;
  const f = ((pattern.evidence || {}).fields) || {};
  const dk = Object.keys(f).find((k) => /Delta$/.test(k));
  if (!dk) return null;
  const delta = Math.abs(parseFloat(f[dk]));
  return isFinite(delta) ? { metric: dk, delta } : null;
}

// the metric a decay (math-imbalance) pattern moved, SIGN PRESERVED (negative).
// math-imbalance carries decaySignals like ["Sentiment -0.450","RetailVitality
// -3.96"]; cluster on the Sentiment signal — the citywide-mood metric present
// across hoods — falling back to the first parseable signal. null = not a
// collapsible decay. (S265 ES-4, C98 G-RC5: these never collapsed and each got
// a positive WHY anchor on a declining hood.)
function decayMetric(pattern) {
  if (pattern.type !== 'math-imbalance') return null;
  const sigs = (((pattern.evidence || {}).fields) || {}).decaySignals;
  if (!Array.isArray(sigs) || !sigs.length) return null;
  const parsed = sigs.map((s) => {
    const m = String(s).match(/^([A-Za-z]+)\s+(-?\d+(?:\.\d+)?)/);
    return m ? { metric: m[1], val: parseFloat(m[2]) } : null;
  }).filter(Boolean);
  if (!parsed.length) return null;
  const pick = parsed.find((x) => /sentiment/i.test(x.metric)) || parsed[0];
  return isFinite(pick.val) ? { metric: pick.metric.toLowerCase(), delta: pick.val } : null;
}

// Sign-aware delta formatter — "+0.11" for a lift, "-0.45" for a decay. Identical
// to the old '+' + toFixed for non-negative values, so improvement output is
// unchanged; correct for the decay pole (S265 ES-4). (Old form printed "+-0.45".)
const fmtDelta = (x) => (Number(x) < 0 ? '' : '+') + Number(x).toFixed(2);

// build a single citywide synthesis intent from a cluster of per-hood intents.
// pole = 'improvement' (lift) | 'decay' (cooldown) — drives verb, sign, and a
// sign-coherent WHY anchor (S265 ES-4).
function synthCitywide(members, metric, cycle, cycleCtx, pole) {
  const decay = pole === 'decay';
  // deterministic: improvement largest-lift-first, decay most-negative-first; then name
  const sorted = members.slice().sort((a, b) =>
    (decay ? (a.delta - b.delta) : (b.delta - a.delta)) || a.neighborhood.localeCompare(b.neighborhood));
  const hoods = sorted.map((m) => m.neighborhood);
  const deltas = sorted.map((m) => m.delta);
  const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const min = Math.min(...deltas), max = Math.max(...deltas);
  const metricLabel = metric.replace(/Delta$/, '').toLowerCase(); // "sentiment"
  const range = (min === max) ? fmtDelta(min) : (fmtDelta(min) + '–' + fmtDelta(max));
  // who: capped resident union across the cluster (engine.35 attribution thesis — a
  // citywide-mood story still needs named citizens for the desk).
  const seen = {}, who = [];
  sorted.forEach((m) => (m.coveringCitizens || []).forEach((p) => {
    if (!seen[p]) { seen[p] = 1; if (who.length < 6) who.push(p); }
  }));
  const verb = decay ? 'eased' : 'rose';
  const text = 'Citywide ' + metricLabel + ' ' + verb + ' across ' + hoods.length +
    ' neighborhoods (avg ' + fmtDelta(avg) + ', range ' + range + '): ' + hoods.join(', ');
  // WHY — sign-coherent. A lift is a global additive signal (sports + calendar); a
  // citywide decay is broad mean-reversion, NOT the positive driver (G-RC5).
  let causalAnchor;
  if (decay) {
    causalAnchor = { kind: 'global', driver: 'broad cooldown / mean-reversion after the prior cycle (no hood-specific cause)', confidence: 'low' };
  } else {
    const driver = citywideDriver(cycleCtx);
    causalAnchor = driver
      ? { kind: 'global', driver, confidence: 'med' }
      : { kind: 'global', driver: 'broad civic activity this cycle', confidence: 'low' };
  }
  return {
    seedId: 'pat-c' + cycle + '-' + metric + '-citywide' + (decay ? '-decay' : ''),
    idx: -1, patternType: decay ? 'decay-citywide' : 'improvement-citywide', severity: 'low',
    domain: sorted[0].domain, neighborhood: 'Citywide', priority: severityToPriority('low'),
    text,
    angle: decay ? 'broad civic-mood cooldown across the city' : 'broad civic-mood lift across the city',
    coveringCitizens: who, packet: null, metric, delta: avg, collapsedCount: hoods.length,
    pole: pole || 'improvement', causalAnchor
  };
}

// partition intents by pole into citywide synths; everything else (initiatives,
// sub-threshold clusters) passes through unchanged. (S265 ES-4: was
// collapseImprovements — improvement-only; now collapses both poles.)
//
// Improvement and decay collapse DIFFERENTLY because the engine produces them
// differently: a citywide mood LIFT is a uniform global additive (~identical
// per-hood deltas), so it magnitude-band-clusters to separate the true lift from
// outliers. A citywide DECAY is mean-reversion off a prior peak — singular cause,
// but per-hood magnitudes vary in proportion to how high each sat — so banding
// would fragment one phenomenon into many seeds (the C98 G-RC5 failure). Decay
// therefore collapses the WHOLE same-metric group at ≥MIN_CLUSTER, reporting the
// range; sub-threshold decay passes through as individual seeds (a genuine local
// decay keeps its packet).
function collapseSeeds(intents, cycle, cycleCtx) {
  const collapseLog = [];
  const out = intents.filter((it) => it.metric == null); // passthrough (initiatives, etc.)

  // ── improvement pole: magnitude-band clustering (unchanged behavior) ──
  const imp = {};
  intents.filter((it) => it.pole === 'improvement').forEach((it) => {
    (imp[it.metric] = imp[it.metric] || []).push(it);
  });
  Object.keys(imp).sort().forEach((metric) => {
    const group = imp[metric].slice()
      .sort((a, b) => (b.delta - a.delta) || a.neighborhood.localeCompare(b.neighborhood));
    const clusters = [];
    group.forEach((it) => {
      const c = clusters.find((cl) => Math.abs(it.delta - cl.anchor) <= MAG_BAND);
      if (c) c.members.push(it); else clusters.push({ anchor: it.delta, members: [it] });
    });
    clusters.forEach((cl) => {
      if (cl.members.length >= MIN_CLUSTER) {
        out.push(synthCitywide(cl.members, metric, cycle, cycleCtx, 'improvement'));
        collapseLog.push({ pole: 'improvement', metric, anchor: cl.anchor, collapsed: cl.members.length,
          neighborhoods: cl.members.map((m) => m.neighborhood).sort() });
      } else {
        cl.members.forEach((m) => out.push(m)); // outlier — individual seed, keeps packet
      }
    });
  });

  // ── decay pole: collapse the whole same-metric group (no magnitude band) ──
  const dec = {};
  intents.filter((it) => it.pole === 'decay').forEach((it) => {
    (dec[it.metric] = dec[it.metric] || []).push(it);
  });
  Object.keys(dec).sort().forEach((metric) => {
    const group = dec[metric];
    if (group.length >= MIN_CLUSTER) {
      out.push(synthCitywide(group, metric, cycle, cycleCtx, 'decay'));
      const avg = group.reduce((s, m) => s + m.delta, 0) / group.length;
      collapseLog.push({ pole: 'decay', metric, anchor: avg, collapsed: group.length,
        neighborhoods: group.map((m) => m.neighborhood).sort() });
    } else {
      group.forEach((m) => out.push(m)); // sub-threshold — individual seed, keeps packet
    }
  });

  return { collapsed: out, collapseLog };
}

// priority + byline for a finalized intent (run AFTER collapse so cadence isn't
// polluted by the pre-collapse fragments). Behavior-preserving for passthrough seeds.
function finalizeSeed(it, bylineState, roster) {
  const seedForScore = { domain: it.domain, linkedStorylineId: null, seedType: PATTERN_SEED_TYPE, priority: it.priority };
  const auditForScore = { severity: normSeverity(it.severity) };
  const pr = priorityEngine.computePriorityScore_(seedForScore, auditForScore, null, null);
  const floor = priorityEngine.isConsequenceFloor_(seedForScore, auditForScore, null, null);
  let ranked = null;
  try { ranked = bylineEngine.scoreAllBylines_(seedForScore, bylineState); }
  catch (e) { ranked = null; }
  let picked = null;
  if (ranked && ranked.length) {
    const adj = ranked.map((r) => ({
      r, adj: r.score + ((roster[r.name] && roster[r.name].beatDomain === it.domain) ? BEAT_BONUS : 0)
    }));
    adj.sort((a, b) => b.adj - a.adj);
    picked = adj[0].r;
    bylineState.cadence[picked.name] = (bylineState.cadence[picked.name] || 0) + 1;
  }
  bylineState.totalSeeds += 1;
  if (picked && ranked) ranked = [picked].concat(ranked.filter((r) => r.name !== picked.name));
  const byName = (ranked && ranked.length) ? ranked[0].name : '';
  const byPopid = (byName && roster[byName]) ? roster[byName].popid : '';
  // WHY (Phase 3): fold the faithful causal driver into the desk-facing angle
  const ca = it.causalAnchor;
  const angle = (ca && ca.driver) ? ((it.angle ? it.angle + ' — ' : '') + 'driver: ' + ca.driver) : it.angle;
  return {
    seedId: it.seedId, patternType: it.patternType, severity: it.severity,
    domain: it.domain, neighborhood: it.neighborhood, priority: it.priority,
    text: it.text, angle, causalAnchor: ca || null, coveringCitizens: it.coveringCitizens,
    priorityScore: pr ? Math.round(pr.priorityScore * 100) / 100 : '',
    consequenceFloor: floor === true,
    priorityComponents: pr ? pr.components : null,
    bylineCandidate: byName,
    bylineConfidence: (ranked && ranked.length) ? (ranked[0].confidence || 'low') : '',
    bylineRationale: (ranked && ranked.length) ? {
      components: ranked[0].components,
      alternates: ranked.slice(1, 3).map((r) => ({ name: r.name, score: r.score, components: r.components }))
    } : null,
    packetRef: it.packet ? it.packet.id : '',
    coveringJournalistPopid: byPopid
  };
}

function loadJson(file) {
  const p = path.join(OUTPUT_DIR, file);
  if (!fs.existsSync(p)) throw new Error('missing ' + p + ' (run /engine-review first)');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ── WHY layer (engine.35 Phase 3, S260): a FAITHFUL causal anchor per seed ────
// The driver is real engine mechanics, not fabrication:
//   - citywide sentiment lift → global additive signals: applySportsSeason does
//     `S.sentiment += totalSentiment` (a winning A's stretch nudges the whole city),
//     plus citywide calendar (First Friday / holiday). This is the uniform cross-hood
//     +0.11 — a global driver; per-hood citizen pulse only explains the deviations.
//   - per-hood outlier / event seed → the co-located cycle event in that hood (the
//     baseline_brief world-event), e.g. Fruitvale +0.25 ← its Transit-Hub milestone.
//   - initiative seed → the phase transition (fromPhase→toPhase) or the stuck blocker.
// Cycle-pinned: reads world_summary_c{N}.md (the cycle's global snapshot built from
// Riley_Digest + Oakland_Sports_Feed + Simulation_Calendar) so the WHY does not drift
// with live sheets. SOFT — if the summary is absent the anchor degrades, never throws.

function loadCycleContext(cycle) {
  const p = path.join(OUTPUT_DIR, 'world_summary_c' + cycle + '.md');
  if (!fs.existsSync(p)) return null;
  const t = fs.readFileSync(p, 'utf8');
  const m = (re) => { const x = t.match(re); return x ? x[1].trim() : null; };
  // A's streak: the modal value across sports rows. The summary lists current + 2 prior
  // cycles per player, so the W-L *record* can't be pulled robustly from markdown (a prior
  // row's record repeats and out-votes the current) — the streak is the reliable, faithful
  // "are they winning" signal, so we use the streak qualifier and skip the exact record.
  const streaks = (t.match(/Streak (W\d+|L\d+)/g) || []).map((s) => s.replace('Streak ', ''));
  const sfreq = {}; streaks.forEach((s) => { sfreq[s] = (sfreq[s] || 0) + 1; });
  const asStreak = streaks.length ? Object.keys(sfreq).sort((a, b) => (sfreq[b] - sfreq[a]) || a.localeCompare(b))[0] : null;
  return {
    holiday: m(/holiday=([^\s|]+)/),
    firstFriday: /First Friday:\s*true/i.test(t),
    season: m(/\*\*Season:\*\*\s*([A-Za-z]+)/),
    citySentiment: m(/CitySentiment\)?:\*\*\s*([+\-0-9.]+)/),
    eventCounts: m(/Domain event counts \(([^)]+)\)/),
    asStreak
  };
}

// the global, citywide mood driver (sports performance + citywide calendar)
function citywideDriver(cycleCtx) {
  if (!cycleCtx) return null;
  const bits = [];
  if (cycleCtx.asStreak) {
    const winning = /^W/.test(cycleCtx.asStreak);
    bits.push("the A's " + (winning ? 'winning stretch' : 'skid') + ' (' + cycleCtx.asStreak + ')');
  }
  if (cycleCtx.firstFriday) bits.push('First Friday');
  if (cycleCtx.holiday && cycleCtx.holiday.toLowerCase() !== 'none') bits.push(cycleCtx.holiday);
  return bits.length ? bits.join(' + ') : null;
}

// causal anchor for an individual pattern seed: initiative phase-change, else the
// co-located hood event, else the global signal as a weak fallback.
function patternDriver(p, neighborhood, briefs, cycleCtx) {
  const f = ((p.evidence || {}).fields) || {};
  if (f.fromPhase && f.toPhase) {
    return { kind: 'initiative', driver: 'advanced from "' + f.fromPhase + '" to "' + f.toPhase + '"', confidence: 'high' };
  }
  if (p.type === 'stuck-initiative') {
    return { kind: 'initiative', driver: 'stalled ' + (p.cyclesInState || 0) + ' cycle(s) in "' +
      (f.toPhase || f.ImplementationPhase || f.Phase || 'current phase') + '"', confidence: 'high' };
  }
  if (neighborhood) {
    const ev = briefs.find((b) => /^event-/.test(b.id || '') && b.neighborhood === neighborhood);
    if (ev) {
      const et = ((ev.facts || {}).eventType || 'local event').replace(/-/g, ' ');
      return { kind: 'event', driver: et + ' in ' + neighborhood + ' (' + ev.id + ')', confidence: 'med' };
    }
  }
  // Sign-coherence (S265 ES-4, G-RC5): a decaying hood must NOT cite the positive
  // global driver (the A's winning stretch). Use a neutral mean-reversion anchor.
  if (p.type === 'math-imbalance') {
    return { kind: 'global', driver: 'broad cooldown / mean-reversion this cycle (no hood-specific cause)', confidence: 'low' };
  }
  const g = citywideDriver(cycleCtx);
  return g ? { kind: 'global', driver: g, confidence: 'low' } : null;
}

// ── core ─────────────────────────────────────────────────────────────────────

async function routePatternSeeds(cycle, opts) {
  opts = opts || {};
  const audit = loadJson('engine_audit_c' + cycle + '.json');
  const briefsDoc = loadJson('baseline_briefs_c' + cycle + '.json');
  const briefs = Array.isArray(briefsDoc) ? briefsDoc : (briefsDoc.briefs || []);
  const patterns = audit.patterns || [];

  const cycleCtx = loadCycleContext(cycle); // global WHY signals (soft; null if absent)

  const { roster } = await buildBylineRoster();
  if (!roster || Object.keys(roster).length === 0) throw new Error('empty byline roster from Bay_Tribune_Oakland');

  // inclusion filter: a seed needs a world anchor
  const included = [];
  const excluded = [];
  patterns.forEach((p, idx) => {
    const ae = p.affectedEntities || {};
    const anchor = (ae.citizens || []).length + (ae.neighborhoods || []).length + (ae.initiatives || []).length;
    if (anchor > 0) included.push({ p, idx });
    else excluded.push({ type: p.type, severity: p.severity, reason: 'no world anchor (citizens/neighborhoods/initiatives all empty)' });
  });

  // (severity ordering for byline-pick priority happens in Phase C, post-collapse)

  // ── Phase A: build seed-intents (no byline yet — collapse must run first so the
  //    byline cadence isn't polluted by the pre-collapse per-hood fragments) ──
  const intents = included.map(({ p, idx }) => {
    const domain = resolveDomain(p);
    const neighborhood = (((p.affectedEntities || {}).neighborhoods) || [])[0] || '';
    // SeedText = the FACT (pattern.description carries the specifics/numbers, e.g.
    // "Brooklyn sentiment rose 0.11 (0.55 → 0.66)"). The framing hookLine is the
    // narrative opening — kept as the angle, not the fact.
    const text = (p.description && p.description.trim()) ? p.description.trim() : resolveText(p, domain);
    const angle = resolveText(p, domain) || resolveAngle(p, domain);
    const im = improvementMetric(p);
    const dm = im ? null : decayMetric(p);   // S265 ES-4 — decay pole
    const mv = im || dm;
    return {
      seedId: 'pat-c' + cycle + '-' + idx, idx, patternType: p.type, severity: p.severity,
      domain, neighborhood, priority: severityToPriority(p.severity), text, angle,
      coveringCitizens: parsePopids((p.affectedEntities || {}).citizens),
      packet: joinPacket(p, briefs),
      metric: mv ? mv.metric : null, delta: mv ? mv.delta : null,
      pole: im ? 'improvement' : (dm ? 'decay' : null),
      causalAnchor: patternDriver(p, neighborhood, briefs, cycleCtx) // WHY (Phase 3)
    };
  });

  // ── Phase B: collapse same-metric improvements (band) + same-metric decay (whole
  //    group) into citywide synths ──
  const { collapsed, collapseLog } = collapseSeeds(intents, cycle, cycleCtx);

  // ── Phase C: byline + priority over the collapsed set (highest-severity picks first) ──
  const sevRank = { HIGH: 3, MED: 2, LOW: 1 };
  collapsed.sort((a, b) => sevRank[normSeverity(b.severity)] - sevRank[normSeverity(a.severity)]);
  const bylineState = { roster, cadence: {}, totalSeeds: 0, arcBinding: null };
  const seeds = collapsed.map((it) => finalizeSeed(it, bylineState, roster));

  // sort final output by priorityScore desc for deck legibility
  seeds.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  return { cycle, seeds, included: included.length, excluded, collapseLog,
    totalPatterns: patterns.length, briefCount: briefs.length };
}

function seedToRow(s, cycle, now) {
  return [
    now,                                                   // A Timestamp
    cycle,                                                 // B Cycle
    s.seedId,                                              // C SeedID
    PATTERN_SEED_TYPE,                                     // D SeedType
    s.domain,                                              // E Domain
    s.neighborhood,                                        // F Neighborhood
    s.priority,                                            // G Priority
    s.text,                                                // H SeedText
    '',                                                    // I SuggestedJournalist (deprecated)
    s.angle,                                               // J SuggestedAngle
    '',                                                    // K VoiceGuidance
    '',                                                    // L MatchConfidence
    s.priorityScore,                                       // M PriorityScore
    s.consequenceFloor,                                    // N ConsequenceFloor
    s.priorityComponents ? JSON.stringify(s.priorityComponents) : '', // O PriorityComponents
    s.bylineCandidate,                                     // P BylineCandidate
    s.bylineConfidence,                                    // Q BylineConfidence
    s.bylineRationale ? JSON.stringify(s.bylineRationale) : '',       // R BylineRationale
    s.packetRef,                                           // S PacketRef
    s.coveringJournalistPopid                              // T CoveringJournalistPOPID
  ];
}

async function applyToDeck(result, opts) {
  const { cycle, seeds } = result;
  const now = new Date();
  const data = await getRawSheetData(DECK_SHEET);
  const header = data[0] || [];
  const iCycle = header.indexOf('Cycle');
  const iType = header.indexOf('SeedType');
  if (iCycle < 0 || iType < 0) throw new Error('deck missing Cycle/SeedType columns: ' + header.join(','));

  // existing pattern-emergent rows for this cycle (idempotency)
  const existing = [];
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][iCycle]) === String(cycle) && String(data[r][iType]) === PATTERN_SEED_TYPE) {
      existing.push(r + 1); // 1-based sheet row
    }
  }

  const rows = seeds.map((s) => seedToRow(s, cycle, now));

  if (existing.length > 0) {
    if (!opts.force) {
      throw new Error(existing.length + ' pattern-emergent rows already exist for c' + cycle +
        ' (rows ' + existing[0] + '-' + existing[existing.length - 1] + '). Re-run with --force to overwrite.');
    }
    // overwrite in place only if contiguous + same count (safe, no row-delete API)
    const contiguous = existing[existing.length - 1] - existing[0] + 1 === existing.length;
    if (contiguous && existing.length === rows.length) {
      // startCol is 0-INDEXED (lib/sheets.columnIndexToLetter: 0→A, 1→B). Pass 0
      // for column A. Passing 1 shifts the whole block to col B — the S256 deck-
      // corruption scar (updateRangeByPosition startCol off-by-one → wrote col U
      // not T). startRow is 1-based (matches sheet rows). Pattern: feedback_measure-twice.
      await updateRangeByPosition(DECK_SHEET, existing[0], 0, rows);
      return { mode: 'overwrite-in-place', startRow: existing[0], startColLetter: 'A', count: rows.length };
    }
    throw new Error('existing rows not contiguous or count differs (' + existing.length + ' existing vs ' +
      rows.length + ' new) — manual clear of pattern-emergent rows for c' + cycle + ' needed before --force.');
  }

  await appendRows(DECK_SHEET, rows);
  return { mode: 'append', count: rows.length };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function printDryRun(result) {
  const { cycle, seeds, included, excluded, collapseLog, totalPatterns, briefCount } = result;
  console.log('\n═══ engine.35 Phase 2 — pattern→seed routing (DRY RUN) — cycle ' + cycle + ' ═══');
  console.log(totalPatterns + ' patterns | ' + included + ' anchored → ' + seeds.length + ' seeds (post-collapse) | ' +
    excluded.length + ' excluded | ' + briefCount + ' briefs available\n');
  if (collapseLog && collapseLog.length) {
    console.log('COLLAPSED (same-metric improvements [band] + same-metric decay [group] → citywide synthesis):');
    collapseLog.forEach((c) => console.log('  [' + (c.pole || 'improvement') + '] ' + c.metric + ' ~' + fmtDelta(c.anchor) + ': ' +
      c.collapsed + ' hoods → 1 citywide seed [' + c.neighborhoods.join(', ') + ']'));
    console.log('');
  }
  console.log('SEEDS (sorted by PriorityScore):');
  console.log('  PRI   DOMAIN         NEIGHBORHOOD    BYLINE (POPID)              PACKET            TEXT');
  seeds.forEach((s) => {
    const by = (s.bylineCandidate || '(none)') + (s.coveringJournalistPopid ? ' (' + s.coveringJournalistPopid + ')' : '');
    console.log('  ' + String(s.priorityScore).padEnd(5) +
      ' ' + s.domain.padEnd(14) +
      ' ' + (s.neighborhood || '-').padEnd(15) +
      ' ' + by.padEnd(27) +
      ' ' + (s.packetRef || '-').padEnd(17) +
      ' ' + s.text.slice(0, 50));
  });
  // distributions
  const dom = {}, byl = {};
  let withPacket = 0;
  seeds.forEach((s) => {
    dom[s.domain] = (dom[s.domain] || 0) + 1;
    if (s.bylineCandidate) byl[s.bylineCandidate] = (byl[s.bylineCandidate] || 0) + 1;
    if (s.packetRef) withPacket++;
  });
  console.log('\nWHY (causal anchor per seed):');
  seeds.forEach((s) => {
    const ca = s.causalAnchor;
    console.log('  ' + (s.neighborhood || '-').padEnd(15) + ' ' +
      (ca ? ('[' + ca.kind + '/' + ca.confidence + '] ' + ca.driver) : '(no driver)'));
  });
  console.log('\nDOMAIN dist:', JSON.stringify(dom));
  console.log('BYLINE dist (cadence spread):', JSON.stringify(byl));
  console.log('PacketRef matched:', withPacket + '/' + seeds.length);
  console.log('\nEXCLUDED (' + excluded.length + ' — logged, not silent):');
  excluded.forEach((e) => console.log('  ' + e.type.padEnd(18) + e.severity.padEnd(8) + e.reason));
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const ci = args.indexOf('--cycle');
  if (ci < 0 || !args[ci + 1]) { console.error('usage: --cycle <N> [--apply] [--force]'); process.exit(1); }
  const cycle = parseInt(args[ci + 1], 10);
  const apply = args.indexOf('--apply') >= 0;
  const force = args.indexOf('--force') >= 0;

  const result = await routePatternSeeds(cycle, {});
  printDryRun(result);

  if (apply) {
    console.log('=== APPLYING to live ' + DECK_SHEET + ' ===');
    const res = await applyToDeck(result, { force });
    console.log('write:', JSON.stringify(res));
    // verify-after-write
    const data = await getRawSheetData(DECK_SHEET);
    const header = data[0];
    const iCycle = header.indexOf('Cycle');
    const iType = header.indexOf('SeedType');
    let n = 0;
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][iCycle]) === String(cycle) && String(data[r][iType]) === PATTERN_SEED_TYPE) n++;
    }
    console.log('VERIFY: ' + n + ' pattern-emergent rows now live for c' + cycle + ' (expected ' + result.seeds.length + ')');
    if (n !== result.seeds.length) { console.error('MISMATCH — investigate'); process.exit(1); }
  } else {
    console.log('(dry run — pass --apply to write to live deck. Live run gated to C98.)');
  }
}

if (require.main === module) {
  main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
}

module.exports = { routePatternSeeds, resolveDomain, joinPacket, seedToRow, DECK_HEADERS,
  // S265 ES-4 — exported for unit testing the decay-pole collapse + sign-aware WHY
  decayMetric, improvementMetric, collapseSeeds, synthCitywide };
