/**
 * citizen-signal-detector.js — research.21 Phase 3 (build plan 2026-06-29, §3).
 *
 * Deterministic post-cycle Node tally that reads accumulated Reflection_Intake
 * rows over a trailing window, computes per-affect-tag distinct-citizen
 * share-lift over a PRIOR baseline, and on a fire appends a `citizen-signal`
 * Story_Seed_Deck row. A new SOURCE into the existing seed → /sift → edition
 * flow — NOT a parallel pipeline.
 *
 * Zero new LLM calls: the event + affect tags are already classified and
 * persisted at wake time (Reflection_Intake cols E + H). This is a pure tally.
 *
 * v1 = citywide affect-lift ONLY (the only convergence dimension with
 * statistical power at current wake throughput). Neighborhood resolution is
 * throughput-gated; event-tag convergence is research.19-T5-gated. Both unlocks
 * are explicit dials below, not assumed away.
 *
 * Determinism: issues no engine write, uses no Math.random(), runs entirely
 * post-cycle over persisted rows. Default is dry-run; writes only on --apply.
 *
 * Usage:
 *   node scripts/citizen-signal-detector.js --dry-run          # decision table, no write
 *   node scripts/citizen-signal-detector.js --cycle=100        # dry-run for a specific detection cycle
 *   node scripts/citizen-signal-detector.js --cycle=100 --apply        # live write
 *   node scripts/citizen-signal-detector.js --cycle=100 --apply --force # overwrite existing
 *
 * Pattern to copy: scripts/engine-auditor/routePatternSeeds.js (post-cycle Node
 * seed-writer precedent — same row shape, idempotency, append/overwrite).
 * Pattern: feedback_measure-twice-cascading-effects.
 */

require('../lib/env');
const { getRawSheetData, appendRows, updateRangeByPosition } = require('../lib/sheets');

const REFLECTION_SHEET = 'Reflection_Intake';
const DECK_SHEET = 'Story_Seed_Deck';
const SEED_TYPE = 'citizen-signal';

// ── Dials (§2 parameter table — calibrate against the live baseline) ──────────
const W_WINDOW_CYCLES = 3;        // trailing window the signal is measured over
const MIN_DISTINCT = 6;           // floor of distinct citizens sharing an affect before it can fire
const LIFT_THRESHOLD = 0.15;      // absolute share over baseline that counts as convergence
const MIN_CORPUS_DEPTH = 40;      // detector dormant below this distinct-in-window — prevents firing on noise
const DIMENSIONS = ['citywide-affect']; // v1. 'neighborhood-affect' throughput-gated; 'event-tag' T5-gated

// Reflection_Intake positional shape (scripts/citizen-wake.js L394-402):
// [Timestamp, POPID, Cycle, Daypart, EVENT(4), ReflectionExcerpt(5), Applied(6), AFFECT(7)]
// Affect is idx 7, positional — live header only labels A-G; affect appended at H back-compat.
const I_POPID = 1;
const I_CYCLE = 2;
const I_AFFECT = 7;

// Affect vocab = 9 tags (lib/reflectionClassifier.js AFFECT_TAGS), with sentiment pole.
const AFFECT_POLE = {
  frustrated: 'neg', irritable: 'neg', anxious: 'neg', angry: 'neg', resentful: 'neg',
  excited: 'pos', energized: 'pos', content: 'pos', calm: 'pos',
};
const AFFECT_TAGS = Object.keys(AFFECT_POLE);

// ── helpers ──────────────────────────────────────────────────────────────────
function normAffect(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  return AFFECT_POLE[s] ? s : null; // only recognized tags count
}

function distinctCitizens(rows, tag) {
  const set = new Set();
  for (const r of rows) {
    if (tag && normAffect(r[I_AFFECT]) !== tag) continue;
    if (!tag && !normAffect(r[I_AFFECT])) continue; // for '*', only count affect-bearing rows
    const pop = String(r[I_POPID] || '').trim();
    if (pop) set.add(pop);
  }
  return set;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let cycle = null;
  const eq = args.find((a) => a.startsWith('--cycle='));
  if (eq) cycle = parseInt(eq.split('=')[1], 10);
  const ci = args.indexOf('--cycle');
  if (ci >= 0 && args[ci + 1]) cycle = parseInt(args[ci + 1], 10);
  const apply = args.indexOf('--apply') >= 0;
  const force = args.indexOf('--force') >= 0;
  // dry-run is the default; --apply opts into writing; explicit --dry-run forces no-write.
  const dryRun = !apply || args.indexOf('--dry-run') >= 0;
  return { cycle, dryRun, force };
}

// Task 4b: classify an engine mood seed's sentiment direction from its real text.
// Grounded in the actual phase07-evening-media/applyStorySeeds.js seed strings
// (engagement / qol / pattern strain-trend) — not guessed vocabulary.
const NEG_KEYWORDS = ['withdrawal', 'pulling back', 'frustration', 'mounting', 'strain',
  'pressure', 'concern', 'tipping point', 'disorder', 'nuisance', 'decline', 'skid'];
const POS_KEYWORDS = ['surging', 'strong community', 'connecting', 'bonds', 'upward',
  'positive', 'small wins', 'clean streets', 'quiet nights', 'calm', 'winning'];
const MOOD_SEED_TYPES = new Set(['engagement', 'qol', 'pattern', 'pattern-emergent', 'sentiment']);

function engineSeedPole(seedType, seedText) {
  if (!MOOD_SEED_TYPES.has(String(seedType || '').toLowerCase())) return null;
  const t = String(seedText || '').toLowerCase();
  const neg = NEG_KEYWORDS.some((k) => t.includes(k));
  const pos = POS_KEYWORDS.some((k) => t.includes(k));
  if (neg && !pos) return 'neg';
  if (pos && !neg) return 'pos';
  return null; // ambiguous / non-mood — skip
}

// ── core compute ───────────────────────────────────────────────────────────
function compute(reflRows, detectionCycle) {
  const winLo = detectionCycle - W_WINDOW_CYCLES + 1;
  const winHi = detectionCycle;
  const cycleOf = (r) => parseInt(r[I_CYCLE], 10);

  const W = reflRows.filter((r) => { const c = cycleOf(r); return c >= winLo && c <= winHi; });
  // Baseline B = cycles strictly BEFORE the window (W ⊄ B) so the spike never
  // dilutes its own baseline. Do NOT set B to "all rows up to detectionCycle".
  const B = reflRows.filter((r) => { const c = cycleOf(r); return c < winLo; });

  const winTotal = distinctCitizens(W, null).size;
  const baseTotal = distinctCitizens(B, null).size;

  const tags = AFFECT_TAGS.map((tag) => {
    const dW = distinctCitizens(W, tag).size;
    const dB = distinctCitizens(B, tag).size;
    const observed = winTotal ? dW / winTotal : 0;
    const baseline = baseTotal ? dB / baseTotal : 0;
    const lift = observed - baseline;
    const fires = dW >= MIN_DISTINCT && lift >= LIFT_THRESHOLD;
    return { tag, pole: AFFECT_POLE[tag], dW, dB, observed, baseline, lift, fires };
  });

  return { detectionCycle, winLo, winHi, winTotal, baseTotal, tags };
}

// Contributing POPIDs (distinct) for a firing tag, for the seed evidence.
function contributors(reflRows, detectionCycle, tag, limit) {
  const winLo = detectionCycle - W_WINDOW_CYCLES + 1;
  const W = reflRows.filter((r) => { const c = parseInt(r[I_CYCLE], 10); return c >= winLo && c <= detectionCycle; });
  return [...distinctCitizens(W, tag)].slice(0, limit);
}

// ── seed shaping (§3 Task 4 + 4b) ──────────────────────────────────────────
function shapeSeed(fire, detectionCycle, reflRows, deckRows, deckHeader) {
  const pct = (x) => Math.round(x * 100) + '%';
  const popIds = contributors(reflRows, detectionCycle, fire.tag, 12);

  // Task 4b: same-cycle engine mood-seed corroboration / divergence.
  const iType = deckHeader.indexOf('SeedType');
  const iText = deckHeader.indexOf('SeedText');
  const iCyc = deckHeader.indexOf('Cycle');
  const iId = deckHeader.indexOf('SeedID');
  let corroboration = '';
  const matches = [];
  for (let r = 1; r < deckRows.length; r++) {
    const row = deckRows[r];
    if (String(row[iCyc]) !== String(detectionCycle)) continue;
    const pole = engineSeedPole(row[iType], row[iText]);
    if (!pole) continue;
    if (pole === fire.pole) matches.push({ rel: 'corroborates', id: row[iId] });
    else matches.push({ rel: 'diverges', id: row[iId] });
  }
  // Divergence is the high-value case (the story the metrics hide); prefer it.
  const diverge = matches.find((m) => m.rel === 'diverges');
  const corrob = matches.find((m) => m.rel === 'corroborates');
  if (diverge) corroboration = ` [diverges from engine seed ${diverge.id}: metrics report the opposite mood — the hidden story]`;
  else if (corrob) corroboration = ` [corroborates engine seed ${corrob.id}: engine + citizens agree → confirmed salience]`;

  const text =
    `Citizen-signal: a wave of ${fire.tag} across Oakland — ${fire.dW} residents independently ` +
    `reflect ${fire.tag} this window (baseline ${pct(fire.baseline)}, now ${pct(fire.observed)}, ` +
    `+${pct(fire.lift)} share-lift). Contributing: ${popIds.join(', ')}.${corroboration}`;

  // Priority scaled by lift magnitude; a divergence bumps it (cap 4).
  let priority = fire.lift >= 0.25 ? 3 : 2;
  if (diverge) priority = Math.min(priority + 1, 4);

  return {
    seedId: `cit-c${detectionCycle}-${fire.tag}`,
    domain: 'CIVIC',
    neighborhood: '', // citywide
    priority,
    text,
    angle: diverge ? 'bottom-up mood divergence from the metrics' : 'bottom-up citizen mood convergence',
  };
}

// 20-col deck row A-T (mirrors routePatternSeeds.seedToRow; M-T blank for citizen-signal).
function seedToRow(s, detectionCycle, now) {
  return [
    now,                 // A Timestamp
    detectionCycle,      // B Cycle  (detection cycle, NOT contributing reflections' cycles)
    s.seedId,            // C SeedID
    SEED_TYPE,           // D SeedType
    s.domain,            // E Domain
    s.neighborhood,      // F Neighborhood
    s.priority,          // G Priority
    s.text,              // H SeedText
    '',                  // I SuggestedJournalist
    s.angle,             // J SuggestedAngle
    '', '', '', '', '', '', '', '', '', '', // K-T (engine A/B decoration cols — blank)
  ];
}

// ── write (§3 Task 4) ──────────────────────────────────────────────────────
async function applyToDeck(seeds, detectionCycle, deckRows, deckHeader, force) {
  const now = new Date();
  const iCycle = deckHeader.indexOf('Cycle');
  const iType = deckHeader.indexOf('SeedType');
  if (iCycle < 0 || iType < 0) throw new Error('deck missing Cycle/SeedType columns: ' + deckHeader.join(','));

  const existing = [];
  for (let r = 1; r < deckRows.length; r++) {
    if (String(deckRows[r][iCycle]) === String(detectionCycle) && String(deckRows[r][iType]) === SEED_TYPE) {
      existing.push(r + 1); // 1-based sheet row
    }
  }

  const rows = seeds.map((s) => seedToRow(s, detectionCycle, now));

  if (existing.length > 0) {
    if (!force) {
      throw new Error(existing.length + ` ${SEED_TYPE} rows already exist for c` + detectionCycle +
        ' (rows ' + existing[0] + '-' + existing[existing.length - 1] + '). Re-run with --force to overwrite.');
    }
    const contiguous = existing[existing.length - 1] - existing[0] + 1 === existing.length;
    if (contiguous && existing.length === rows.length) {
      // startCol is 0-INDEXED (lib/sheets.columnIndexToLetter: 0→A). Pass 0 for col A.
      // Passing 1 shifts the block to col B — the S256 deck-corruption scar.
      await updateRangeByPosition(DECK_SHEET, existing[0], 0, rows);
      return { mode: 'overwrite-in-place', startRow: existing[0], count: rows.length };
    }
    throw new Error('existing rows not contiguous or count differs (' + existing.length + ' existing vs ' +
      rows.length + ' new) — manual clear of ' + SEED_TYPE + ' rows for c' + detectionCycle + ' needed.');
  }

  await appendRows(DECK_SHEET, rows);
  return { mode: 'append', count: rows.length };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
async function main() {
  const { cycle, dryRun, force } = parseArgs(process.argv);

  const reflRaw = await getRawSheetData(REFLECTION_SHEET);
  const reflRows = (reflRaw || []).slice(1).filter((r) => r && String(r[I_POPID] || '').trim() && r[I_CYCLE] != null && r[I_CYCLE] !== '');
  if (!reflRows.length) { console.log('No Reflection_Intake rows. Nothing to do.'); return; }

  const maxCycle = Math.max(...reflRows.map((r) => parseInt(r[I_CYCLE], 10)).filter((n) => !isNaN(n)));
  const detectionCycle = Number.isInteger(cycle) ? cycle : maxCycle;

  const res = compute(reflRows, detectionCycle);

  console.log(`\ncitizen-signal-detector — dimensions=[${DIMENSIONS.join(',')}]`);
  console.log(`detection cycle c${res.detectionCycle}  |  window c${res.winLo}-c${res.winHi} (${W_WINDOW_CYCLES}cyc)  |  baseline = cycles < c${res.winLo}`);
  console.log(`distinct citizens — window: ${res.winTotal}   baseline: ${res.baseTotal}`);

  // §3 Task 2 corpus-depth gate
  if (res.winTotal < MIN_CORPUS_DEPTH) {
    console.log(`\nbelow corpus floor (${res.winTotal}/${MIN_CORPUS_DEPTH} distinct in window), no fire.`);
    return;
  }

  // §3 Task 3 decision table
  console.log('\n  tag         dist(W) observed baseline   lift   FIRE');
  for (const t of res.tags) {
    console.log(
      '  ' + t.tag.padEnd(11) +
      String(t.dW).padStart(5) +
      (t.observed * 100).toFixed(0).padStart(8) + '%' +
      (t.baseline * 100).toFixed(0).padStart(7) + '%' +
      (t.lift >= 0 ? '+' : '') + (t.lift * 100).toFixed(0).padStart(5) + '%' +
      (t.fires ? '   ★ FIRE' : '   ·'));
  }

  const fires = res.tags.filter((t) => t.fires);
  if (!fires.length) { console.log('\nNo affect tag clears MIN_DISTINCT + LIFT_THRESHOLD. No seeds.'); return; }

  // §3 Task 4 / 4b — shape seeds (read deck once for idempotency + corroboration)
  const deckRows = await getRawSheetData(DECK_SHEET);
  const deckHeader = deckRows[0] || [];
  const seeds = fires.map((f) => shapeSeed(f, detectionCycle, reflRows, deckRows, deckHeader));

  console.log(`\n${seeds.length} citizen-signal seed(s):`);
  for (const s of seeds) console.log(`  [${s.priority}] ${s.seedId} — ${s.text}`);

  if (dryRun) { console.log('\n(dry run — pass --apply to write to live deck.)'); return; }

  const out = await applyToDeck(seeds, detectionCycle, deckRows, deckHeader, force);
  console.log(`\nwrote ${out.count} row(s) to ${DECK_SHEET} (${out.mode}).`);
}

main().catch((e) => { console.error('citizen-signal-detector failed:', e.message); process.exit(1); });
