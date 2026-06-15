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

function loadJson(file) {
  const p = path.join(OUTPUT_DIR, file);
  if (!fs.existsSync(p)) throw new Error('missing ' + p + ' (run /engine-review first)');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ── core ─────────────────────────────────────────────────────────────────────

async function routePatternSeeds(cycle, opts) {
  opts = opts || {};
  const audit = loadJson('engine_audit_c' + cycle + '.json');
  const briefsDoc = loadJson('baseline_briefs_c' + cycle + '.json');
  const briefs = Array.isArray(briefsDoc) ? briefsDoc : (briefsDoc.briefs || []);
  const patterns = audit.patterns || [];

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

  // process highest-severity first so they get first byline pick (cadence spreads the rest)
  const sevRank = { HIGH: 3, MED: 2, LOW: 1 };
  included.sort((a, b) => sevRank[normSeverity(b.p.severity)] - sevRank[normSeverity(a.p.severity)]);

  const bylineState = { roster, cadence: {}, totalSeeds: 0, arcBinding: null };
  const seeds = [];

  included.forEach(({ p, idx }) => {
    const domain = resolveDomain(p);
    const neighborhood = (((p.affectedEntities || {}).neighborhoods) || [])[0] || '';
    // SeedText = the FACT (pattern.description carries the specifics/numbers, e.g.
    // "Brooklyn sentiment rose 0.11 (0.55 → 0.66)"). The framing hookLine is the
    // narrative opening — kept as the angle, not the fact.
    const text = (p.description && p.description.trim()) ? p.description.trim() : resolveText(p, domain);
    const angle = resolveText(p, domain) || resolveAngle(p, domain);
    const priority = severityToPriority(p.severity);
    const coveringCitizens = parsePopids((p.affectedEntities || {}).citizens);

    const seedForScore = { domain, linkedStorylineId: null, seedType: PATTERN_SEED_TYPE, priority };
    const auditForScore = { severity: normSeverity(p.severity) };

    const pr = priorityEngine.computePriorityScore_(seedForScore, auditForScore, null, null);
    const floor = priorityEngine.isConsequenceFloor_(seedForScore, auditForScore, null, null);

    let ranked = null;
    try { ranked = bylineEngine.scoreAllBylines_(seedForScore, bylineState); }
    catch (e) { ranked = null; }
    // beat-affinity: prefer the canonical Bay_Tribune_Oakland beat for this domain.
    // Additive bonus on the cadence-adjusted score → breaks 4.0 ties toward the
    // beat journalist; a strong thematic fit can still win; cadence still spreads.
    let picked = null;
    if (ranked && ranked.length) {
      const adj = ranked.map((r) => ({
        r, adj: r.score + ((roster[r.name] && roster[r.name].beatDomain === domain) ? BEAT_BONUS : 0)
      }));
      adj.sort((a, b) => b.adj - a.adj);
      picked = adj[0].r;
      bylineState.cadence[picked.name] = (bylineState.cadence[picked.name] || 0) + 1;
    }
    bylineState.totalSeeds += 1;
    // rebuild ranked with picked at head so rationale/confidence reflect the choice
    if (picked && ranked) {
      ranked = [picked].concat(ranked.filter((r) => r.name !== picked.name));
    }

    const byName = (ranked && ranked.length) ? ranked[0].name : '';
    const byPopid = (byName && roster[byName]) ? roster[byName].popid : '';
    const packet = joinPacket(p, briefs);

    seeds.push({
      seedId: 'pat-c' + cycle + '-' + idx,
      patternType: p.type,
      severity: p.severity,
      domain, neighborhood, priority, text, angle,
      coveringCitizens,
      priorityScore: pr ? Math.round(pr.priorityScore * 100) / 100 : '',
      consequenceFloor: floor === true,
      priorityComponents: pr ? pr.components : null,
      bylineCandidate: byName,
      bylineConfidence: (ranked && ranked.length) ? (ranked[0].confidence || 'low') : '',
      bylineRationale: (ranked && ranked.length) ? {
        components: ranked[0].components,
        alternates: ranked.slice(1, 3).map((r) => ({ name: r.name, score: r.score, components: r.components }))
      } : null,
      packetRef: packet ? packet.id : '',
      coveringJournalistPopid: byPopid
    });
  });

  // sort final output by priorityScore desc for deck legibility
  seeds.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  return { cycle, seeds, included: included.length, excluded, totalPatterns: patterns.length, briefCount: briefs.length };
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
  const { cycle, seeds, included, excluded, totalPatterns, briefCount } = result;
  console.log('\n═══ engine.35 Phase 2 — pattern→seed routing (DRY RUN) — cycle ' + cycle + ' ═══');
  console.log(totalPatterns + ' patterns | ' + included + ' anchored → seeds | ' + excluded.length + ' excluded | ' + briefCount + ' briefs available\n');
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

module.exports = { routePatternSeeds, resolveDomain, joinPacket, seedToRow, DECK_HEADERS };
