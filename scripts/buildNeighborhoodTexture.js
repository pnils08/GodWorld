#!/usr/bin/env node
/**
 * scripts/buildNeighborhoodTexture.js — T2 (research.19, citizen-perception immersion).
 *
 * Builds output/neighborhood_texture_c{XX}.md — one block per neighborhood (~21),
 * 2-4 sentences of LIVED PARTICULARS a resident would *notice* this cycle. The
 * shared, generative, FROZEN per-cycle artifact the wake reads (citizen-wake.js
 * loadNeighborhoodTexture) so a citizen perceives their corner of the city as a
 * person does — "another storefront dark on the strip", never "retail -4%".
 *
 * WHY a build and not a wiring (plan §T2 Design): piping neighborhoodSlice.describe()
 * into the wake just feeds aggregates in costume — every Fruitvale citizen reads the
 * identical metric sentence. The metric->lived-particular rewrite is the whole point,
 * and only a generative step earns it. Differentiation between two same-hood residents
 * lives at the citizen-voice layer (dials->disposition), NOT here — they perceive the
 * SAME neighborhood facts and diverge when they react.
 *
 * Determinism: non-deterministic run-to-run (LLM), but runs ONCE per cycle -> its
 * output is the canonical frozen artifact, same class as world_summary_c{XX}.md. Every
 * wake in the cycle reads the identical block. Perception stays input-side; only the
 * classified reflection tag reaches the engine (Phase-1 gate untouched). NO clasp.
 *
 * Pipeline position: AFTER scripts/buildWorldSummary.js (same structured sources),
 * BEFORE the wake reads. Reads the STRUCTURED sources buildWorldSummary reads
 * (Riley_Digest parsed-JSON + Neighborhood_Map via lib/neighborhoodSlice), NOT the
 * world_summary markdown (a generated artifact whose format drifts — re-parsing it is
 * fragile; the structured field carries an exact .neighborhood so partition is
 * collision-safe).
 *
 * Guardrails (plan §Guardrails): lived particulars never aggregates (no-metrics-in-output
 * + source-grounding); scale honesty (hood-scoped, a citizen's corner not omniscience);
 * C92 containment (deterministic blocklist sweep, wake-input-only, never published);
 * source-grounding bounds fabrication (a block may only render particulars that trace to
 * a source line for that hood; no sources + flat metrics -> "a quiet week" line, NEVER
 * invent drama).
 *
 * Usage:
 *   node scripts/buildNeighborhoodTexture.js <cycle> [--output <path>] [--dry-run]
 */

'use strict';

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
const { createSlicer } = require('/root/GodWorld/lib/neighborhoodSlice');
const { parseJsonField } = require('/root/GodWorld/scripts/buildWorldSummary');
const { loadFaithBlocklist } = require('/root/GodWorld/lib/canonBlocklist');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_VERSION = '1.0.0';
const QUIET_LINE = 'A quiet week — nothing much out of the ordinary around the neighborhood.';

// ── source assembly (structured, per-hood, collision-safe) ────────────────────

// Split Riley_Digest.CityEvents (a comma-joined string of event names with embedded
// hood names, e.g. "Temescal Late Night Gallery Walk, KONO Arts District Celebration")
// and assign each to a hood by LONGEST-hood-name-first substring (so "West Oakland"
// wins over a bare "Oakland", "Lake Merritt" over "Merritt"). Assign-once.
function assignCityEvents(cityEventsStr, hoodsLongestFirst) {
  const out = {};
  const items = String(cityEventsStr || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const item of items) {
    const hood = hoodsLongestFirst.find((h) => item.toLowerCase().includes(h.toLowerCase()));
    if (hood) (out[hood] = out[hood] || []).push(item);
  }
  return out;
}

// Coarse income band — keeps the model truthful (no inventing hardship in a comfortable
// hood / vice-versa, the C95 West Oakland failure) WITHOUT leaking a dollar figure.
function incomeBand(medianIncome) {
  if (medianIncome == null) return null;
  if (medianIncome >= 90000) return 'comfortable';
  if (medianIncome >= 60000) return 'mixed-income';
  return 'working-class';
}

// Assemble the per-hood source bundle from the structured Riley_Digest + slicer state.
// Returns { hood, sources: [strings], grounding: [strings], hasSignal: bool }.
function assembleHoodSources(hood, slicer, worldEvents, venues, cityEventsByHood) {
  const sources = [];

  // World events tagged to THIS hood (exact .neighborhood match) — incl. FAITH holy-days.
  // Feed ONLY the real human description — NEVER the engine domain/subdomain words
  // ("CULTURE", "crisis-spike"): those are system taxonomy, and handing them to the model
  // leaks them into perception (the C100 Rockridge "crisis in bold letters" leak, advisor
  // S272). Suppress contentless events: a bare impactScore spike whose description falls
  // through to "<DOMAIN> event" boilerplate has no human content to translate — dropping it
  // is the source-grounding rule (never invent drama from an empty signal).
  for (const ev of worldEvents) {
    if (String(ev.neighborhood || '').trim() !== hood) continue;
    const domain = ev.domain || 'event';
    const desc = String(ev.description || '').trim();
    if (!desc || desc.toLowerCase() === `${domain} event`.toLowerCase()) continue;
    sources.push(`EVENT: ${desc}`);
  }
  // Venues (restaurants / fast food / nightlife) in this hood.
  for (const v of venues) {
    if (String(v.neighborhood || '').trim() !== hood) continue;
    sources.push(`VENUE (${v.kind}): ${v.name}`);
  }
  // City events assigned to this hood.
  for (const ce of (cityEventsByHood[hood] || [])) sources.push(`CITY EVENT: ${ce}`);

  // Grounding (truthfulness bounds — NEVER printed as numbers, guides the model only).
  const grounding = [];
  const s = slicer.slice(hood);
  if (s && s.state) {
    if (s.state.displacementPressure && s.state.displacementPressure !== 'none') {
      grounding.push(`displacement pressure: ${s.state.displacementPressure}`);
    }
    const band = incomeBand(s.state.medianIncome);
    if (band) grounding.push(`economic texture: ${band}`);
    if (s.state.gentrificationPhase && s.state.gentrificationPhase !== 'none') {
      grounding.push(`change underway: ${s.state.gentrificationPhase}`);
    }
  }
  return { hood, sources, grounding, hasSignal: sources.length > 0 };
}

// ── generation ────────────────────────────────────────────────────────────────

function buildPrompt(bundles) {
  const system = [
    'You write short, grounded notes on what an ordinary resident of an Oakland neighborhood would NOTICE walking around this week — the lived texture of their corner of the city.',
    '',
    'HARD RULES:',
    '- 2 to 4 sentences per neighborhood. Plain, observational, present-tense. The voice of someone who lives there, not a reporter or a booster.',
    '- Use ONLY that neighborhood\'s own SOURCE lines. NEVER pull a fact from another neighborhood\'s block.',
    '- NEVER state numbers, metrics, percentages, scores, or system words (sentiment, retail, crime index, displacement pressure). Translate every fact into what a person SEES or HEARS.',
    '- NEVER invent drama, hardship, or events. If the sources are thin, write something small and ordinary. The GROUNDING notes only keep you truthful (don\'t describe hardship in a comfortable area, or wealth in a working-class one) — never print them.',
    '- NEVER name real-world people, sports figures, or real churches/clergy. Use only what the source lines name.',
    '',
    'OUTPUT FORMAT: for each neighborhood, exactly one line "### <NeighborhoodName>" then the 2-4 sentences on the next line(s), then a blank line. Use the neighborhood names EXACTLY as given.',
  ].join('\n');

  const user = bundles.map((b) => {
    const src = b.sources.length ? b.sources.map((s) => '  - ' + s).join('\n') : '  - (no notable events this week)';
    const grd = b.grounding.length ? `\n  GROUNDING (do not print): ${b.grounding.join('; ')}` : '';
    return `### ${b.hood}\nSOURCES:\n${src}${grd}`;
  }).join('\n\n');

  return { system, user };
}

async function generateTexture(system, user) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://godworld.local',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat',
      max_tokens: 2200,
      temperature: 0.7,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error('texture-gen: ' + (j.error.message || JSON.stringify(j.error)));
  return String(j.choices?.[0]?.message?.content || '').trim();
}

// Parse the "### Hood\ntext" blocks back into a map keyed by exact hood name.
function parseBlocks(raw, hoods) {
  const map = {};
  const parts = raw.split(/^###\s+/m).map((p) => p.trim()).filter(Boolean);
  const hoodLower = new Map(hoods.map((h) => [h.toLowerCase(), h]));
  for (const part of parts) {
    const nl = part.indexOf('\n');
    if (nl < 0) continue;
    const name = part.slice(0, nl).trim();
    const body = part.slice(nl + 1).trim().replace(/\n{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    const canon = hoodLower.get(name.toLowerCase());
    if (canon && body) map[canon] = body;
  }
  return map;
}

// ── canon sweep (deterministic, fail-loud — wake-input-only) ──────────────────

function buildRealNameSweep() {
  // Faith real-world names (LHS of the substitution table) — reuse the runtime parser.
  const { orgs, leaders } = loadFaithBlocklist();
  const names = new Set([...orgs, ...leaders]);
  // Sports/coach real names — simple bullet lines under the player/coach headers.
  const md = fs.readFileSync(path.join(REPO_ROOT, 'docs/media/REAL_NAMES_BLOCKLIST.md'), 'utf8');
  let inPlayers = false;
  for (const line of md.split('\n')) {
    if (/^###\s+(NBA|MLB|NFL) Players|^###\s+Coaches/i.test(line)) { inPlayers = true; continue; }
    if (/^###\s+/.test(line)) { inPlayers = false; }
    if (/^##\s+Faith/i.test(line)) break; // faith handled by canonBlocklist
    if (inPlayers) {
      const m = line.match(/^-\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)+)/);
      if (m) names.add(m[1].trim());
    }
  }
  return [...names].filter((n) => n && n.length > 3);
}

function sweepBlocks(blocksMap, blocklist) {
  const hits = [];
  for (const [hood, text] of Object.entries(blocksMap)) {
    const lower = text.toLowerCase();
    for (const bad of blocklist) {
      if (lower.includes(bad.toLowerCase())) hits.push(`${hood}: "${bad}"`);
    }
  }
  return hits;
}

// Defense-in-depth: catch a leaked bare metric the prompt was told to avoid (e.g. a
// decimal next to a metric word, or a raw "+0.95"). Warn (not fail) — perception
// input, not an edition; surfaced so a drift gets fixed, not silently shipped.
function metricWarnings(blocksMap) {
  const warns = [];
  const RE = /([+-]?\d+\.\d+)|\b(sentiment|retail|crime index|displacement pressure|impactscore|eventattractiveness)\b/i;
  for (const [hood, text] of Object.entries(blocksMap)) {
    if (RE.test(text)) warns.push(`${hood}: possible metric/system-word leak`);
  }
  return warns;
}

// ── orchestration ─────────────────────────────────────────────────────────────

async function buildNeighborhoodTexture(cycle) {
  if (!Number.isInteger(cycle) || cycle < 1) {
    throw new Error(`buildNeighborhoodTexture: cycle must be a positive integer, got ${cycle}`);
  }

  const [rileyAll, neighborhoodsAll, ledgerObjs] = await Promise.all([
    sheets.getSheetAsObjects('Riley_Digest'),
    sheets.getSheetAsObjects('Neighborhood_Map'),
    sheets.getSheetAsObjects('Simulation_Ledger'),
  ]);

  const rileyCurr = rileyAll.find((r) => String(r.Cycle) === String(cycle));
  if (!rileyCurr) throw new Error(`buildNeighborhoodTexture: no Riley_Digest row for cycle ${cycle}`);

  const mapCurr = neighborhoodsAll.filter((r) => String(r.Cycle) === String(cycle));
  const mapPrev = neighborhoodsAll.filter((r) => String(r.Cycle) === String(cycle - 1));
  if (!mapCurr.length) throw new Error(`buildNeighborhoodTexture: no Neighborhood_Map rows for cycle ${cycle}`);

  const slicer = createSlicer({ ledger: ledgerObjs, neighborhoodMap: mapCurr, priorNeighborhoodMap: mapPrev });
  const hoods = mapCurr.map((r) => r.Neighborhood).filter(Boolean);
  const hoodsLongestFirst = hoods.slice().sort((a, b) => b.length - a.length);

  // Structured Riley sources.
  const worldEvents = parseJsonField(rileyCurr.WorldEvents, []);
  const nightlife = parseJsonField(rileyCurr.NightLife, {});
  const food = parseJsonField(rileyCurr.EveningFood, {});
  const venues = [
    ...(food.restaurantDetails || []).map((v) => ({ ...v, kind: 'restaurant' })),
    ...(food.fastDetails || []).map((v) => ({ ...v, kind: 'fast food' })),
    ...(nightlife.spotDetails || []).map((v) => ({ ...v, kind: 'nightlife' })),
  ];
  const cityEventsByHood = assignCityEvents(rileyCurr.CityEvents, hoodsLongestFirst);

  const bundles = hoods.map((h) => assembleHoodSources(h, slicer, worldEvents, venues, cityEventsByHood));

  // Hoods with NO source signal short-circuit to the quiet-week line — deterministic,
  // free, and structurally cannot invent drama (the grounding rule made code).
  const withSignal = bundles.filter((b) => b.hasSignal);
  const blocksMap = {};
  for (const b of bundles) if (!b.hasSignal) blocksMap[b.hood] = QUIET_LINE;

  if (withSignal.length) {
    const { system, user } = buildPrompt(withSignal);
    const raw = await generateTexture(system, user);
    const gen = parseBlocks(raw, hoods);
    for (const b of withSignal) {
      blocksMap[b.hood] = gen[b.hood] || QUIET_LINE; // unmatched hood -> safe quiet line
    }
  }

  // Canon sweep — fail loud, never write a contaminated artifact.
  const blocklist = buildRealNameSweep();
  const hits = sweepBlocks(blocksMap, blocklist);
  if (hits.length) {
    throw new Error('CANON SWEEP FAILED — real-world name(s) in texture, refusing to write:\n  ' + hits.join('\n  '));
  }
  const warns = metricWarnings(blocksMap);

  // Emit — hoods in the Neighborhood_Map order (stable).
  const out = [
    `# Neighborhood Texture — Cycle ${cycle}`,
    '',
    '_Lived-particulars digest (research.19 T2). What a resident would notice this week. Wake-input only — perception, never published. No metrics, no real names. Quiet-week line = no engine signal for that hood (not invented absence)._',
    '',
  ];
  for (const h of hoods) {
    out.push(`### ${h}`, '', blocksMap[h] || QUIET_LINE, '');
  }
  out.push('---', '', `_Generated by \`scripts/buildNeighborhoodTexture.js\` v${SCRIPT_VERSION} from Riley_Digest + Neighborhood_Map (cycle ${cycle}). One batched generation, frozen for the cycle. ${withSignal.length}/${hoods.length} hoods with engine signal; ${hoods.length - withSignal.length} quiet._`);

  return { body: out.join('\n') + '\n', warns, signalCount: withSignal.length, hoodCount: hoods.length };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cycle = parseInt(args.find((a) => /^\d+$/.test(a)), 10);
  if (!Number.isInteger(cycle)) {
    console.error('Usage: node scripts/buildNeighborhoodTexture.js <cycle> [--output <path>] [--dry-run]');
    process.exit(1);
  }
  const outIdx = args.indexOf('--output');
  const outputPath = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : path.join('output', `neighborhood_texture_c${cycle}.md`);
  const dryRun = args.includes('--dry-run');

  const { body, warns, signalCount, hoodCount } = await buildNeighborhoodTexture(cycle);
  if (warns.length) console.error('[warn] metric/system-word check:\n  ' + warns.join('\n  '));

  if (dryRun) {
    process.stdout.write(body);
    console.error(`\n[dry-run] ${signalCount}/${hoodCount} hoods with signal; would write ${outputPath}`);
  } else {
    const absOut = path.isAbsolute(outputPath) ? outputPath : path.join(REPO_ROOT, outputPath);
    fs.mkdirSync(path.dirname(absOut), { recursive: true });
    fs.writeFileSync(absOut, body);
    console.log(`Wrote ${body.length} bytes to ${outputPath} (${signalCount}/${hoodCount} hoods with signal)`);
  }
}

module.exports = {
  buildNeighborhoodTexture,
  assignCityEvents,
  incomeBand,
  assembleHoodSources,
  parseBlocks,
  buildRealNameSweep,
  sweepBlocks,
  metricWarnings,
  SCRIPT_VERSION,
};

if (require.main === module) {
  main().catch((err) => {
    console.error('buildNeighborhoodTexture FAILED:', err.message);
    process.exit(1);
  });
}
