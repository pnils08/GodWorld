#!/usr/bin/env node
/**
 * citizenLifePoC.js — Layer 3 toe-dip: narration-only citizen life-loop.
 *
 * Spec: docs/plans/2026-05-31-citizen-autonomous-poc.md  (research.13)
 * Umbrella: docs/plans/2026-05-31-autonomy-roadmap.md     (research.12, Layer 3)
 *
 * 1–2 Tier-1 citizens wake on a timer, read a five-piece sports-aware wake-context,
 * narrate ONE cycle of their life in first person, sleep, repeat. The newsroom does
 * not see this; the engine does not change because of it. We read the output to
 * answer four questions: character-hold / canon-sync / token bill / output usability.
 *
 * ┌─ ISOLATION (S172 lock, re-confirmed research.13) ────────────────────────────┐
 * │ Output is THROWAWAY. ZERO ingest path to editions / bay-tribune / world-data │
 * │ / Supermemory. Citizens here NARRATE only — they do NOT mutate the ledger.   │
 * │ The real Layer-3 build (the engine "action menu") is a separate go-ahead.    │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * The loop shape mirrors scripts/spacemolt-miner.js (loadState → act → saveState →
 * log → sleep). The wake-context reuses lib/neighborhoodSlice.js — the same
 * assembler the voice agents use, so a citizen can't invent facts against its hood.
 *
 * Usage:
 *   node scripts/citizenLifePoC.js --dry-run                  # assemble + print prompts, NO API spend
 *   node scripts/citizenLifePoC.js --turns 2 --interval 2     # cheap smoke run (2 turns, 2s apart)
 *   node scripts/citizenLifePoC.js                            # default run (see CONFIG)
 *   node scripts/citizenLifePoC.js --citizens POP-00004,POP-00789 --turns 4 --interval 600
 *
 * Flags:
 *   --citizens <csv>   POPIDs or "First Last" names      (default: Lucia Polito, Elias Varek)
 *   --turns N          hard cap on wakes per citizen      (default 4, max 12 guard)
 *   --interval S       seconds slept between turns         (default 600)
 *   --memory N         prior entries fed back as memory    (default 3)
 *   --max-tokens N     per-narration output cap            (default 600)
 *   --model <id>       Anthropic model                     (default claude-sonnet-4-6)
 *   --dry-run          build context + print prompt, skip the API call entirely
 *   --force            allow more than 4 citizens (cost guard override)
 */

require('/root/GodWorld/lib/env'); // ANTHROPIC_API_KEY + GODWORLD_SHEET_ID + GOOGLE_APPLICATION_CREDENTIALS
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const sheets = require('../lib/sheets');
const { createSlicer } = require('../lib/neighborhoodSlice');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'output', 'poc_citizen_life');

// ---------------------------------------------------------------------------
// Config + CLI
// ---------------------------------------------------------------------------
const TURN_CAP = 12;          // absolute runaway backstop regardless of --turns
const CITIZEN_CAP = 4;        // cost guard; override with --force
// Auto-selection excludes the persona + family (POP-00005 Mags, 00594/00596 Corliss).
const DEFAULT_CITIZENS = ['POP-00004', 'POP-00789']; // Lucia Polito (Fruitvale), Elias Varek (West Oakland)

function parseArgs(argv) {
  const a = argv.slice(2);
  const get = (flag, def) => {
    const i = a.indexOf(flag);
    return i >= 0 && a[i + 1] ? a[i + 1] : def;
  };
  return {
    citizens: get('--citizens', DEFAULT_CITIZENS.join(',')).split(',').map(s => s.trim()).filter(Boolean),
    turns: Math.min(parseInt(get('--turns', '4'), 10) || 4, TURN_CAP),
    interval: Math.max(parseInt(get('--interval', '600'), 10) || 600, 0),
    memory: parseInt(get('--memory', '3'), 10) || 3,
    maxTokens: parseInt(get('--max-tokens', '600'), 10) || 600,
    model: get('--model', 'claude-sonnet-4-6'),
    dryRun: a.includes('--dry-run'),
    force: a.includes('--force'),
  };
}

// ---------------------------------------------------------------------------
// Inputs (read ONCE — the engine is frozen across the run, so external state
// is identical at every wake; only the citizen's own memory changes. Spec #5.)
// ---------------------------------------------------------------------------
function latestWorldSummary() {
  const files = fs.readdirSync(path.join(ROOT, 'output'))
    .filter(f => /^world_summary_c\d+\.md$/.test(f))
    .map(f => ({ f, c: parseInt(f.match(/c(\d+)/)[1], 10) }))
    .sort((x, y) => y.c - x.c);
  if (!files.length) return { cycle: null, md: '' };
  return { cycle: files[0].c, md: fs.readFileSync(path.join(ROOT, 'output', files[0].f), 'utf8') };
}

// Pull a "## Header..." section through the next "## " (or EOF), trimmed to a char budget.
function extractSection(md, headerMatch, budget = 1800) {
  const lines = md.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s/.test(lines[i]) && lines[i].toLowerCase().includes(headerMatch.toLowerCase())) { start = i; break; }
  }
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^##\s/.test(lines[i])) { end = i; break; }
  return lines.slice(start, end).join('\n').slice(0, budget).trim();
}

async function loadInputs() {
  const [ledger, neighborhoodMap] = await Promise.all([
    sheets.getSheetAsObjects('Simulation_Ledger'),
    sheets.getSheetAsObjects('Neighborhood_Map'),
  ]);
  const ws = latestWorldSummary();
  // "What's happening" — a compact slice of the digest; sports kept separate (the S249 tweak).
  const cityDigest = [
    extractSection(ws.md, 'City State', 1400),
    extractSection(ws.md, 'World Events', 1400),
    extractSection(ws.md, 'Evening Texture', 1200),
  ].filter(Boolean).join('\n\n');
  const sports = extractSection(ws.md, 'Sports', 2000);
  return { ledger, neighborhoodMap, cityDigest, sports, cycle: ws.cycle };
}

// ---------------------------------------------------------------------------
// Citizen profile (wake-piece #1) — age is 2041 − BirthYear (anchor convention,
// never trust a pre-computed Age column; there isn't one anyway).
// ---------------------------------------------------------------------------
function resolveCitizens(ledger, selectors) {
  const out = [];
  for (const sel of selectors) {
    const row = ledger.find(r =>
      r.POPID === sel ||
      `${r.First || ''} ${r.Last || ''}`.replace(/\s+/g, ' ').trim().toLowerCase() === sel.toLowerCase()
    );
    if (!row) { console.error(`  ⚠ citizen not found: ${sel}`); continue; }
    out.push(row);
  }
  return out;
}

function profileText(r) {
  const age = r.BirthYear ? (2041 - parseInt(r.BirthYear, 10)) : null;
  const bits = [
    `Name: ${`${r.First || ''} ${r.Last || ''}`.replace(/\s+/g, ' ').trim()}`,
    age != null ? `Age: ${age}` : null,
    r.Gender ? `Gender: ${r.Gender}` : null,
    r.RoleType ? `Work: ${r.RoleType}` : null,
    r.Neighborhood ? `Neighborhood: ${r.Neighborhood}` : null,
    r.MaritalStatus ? `Marital status: ${r.MaritalStatus}` : null,
    (r.NumChildren && String(r.NumChildren) !== '0') ? `Children: ${r.NumChildren}` : null,
    r.CareerStage ? `Career stage: ${r.CareerStage}` : null,
    r.WealthLevel ? `Wealth level: ${r.WealthLevel}` : null,
    r.EducationLevel ? `Education: ${r.EducationLevel}` : null,
    r.CitizenBio ? `Bio: ${String(r.CitizenBio).slice(0, 600)}` : null,
    r.LifeHistory ? `Life history: ${String(r.LifeHistory).slice(0, 600)}` : null,
  ].filter(Boolean);
  return bits.join('\n');
}

// ---------------------------------------------------------------------------
// Wake-context (the heart) — five pieces. #5 is the only thing that changes
// wake-to-wake, because #1–#4 are frozen for the run.
// ---------------------------------------------------------------------------
function assembleContext({ row, slicer, cityDigest, sports, recent, cycle }) {
  const hood = row.Neighborhood;
  const hoodLine = slicer.describe(hood);
  const memBlock = recent.length
    ? recent.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
    : '  (this is your first remembered cycle)';
  return [
    `=== WHO YOU ARE ===\n${profileText(row)}`,
    `=== WHERE YOU LIVE (accurate current state — do not contradict) ===\n${hoodLine}`,
    `=== WHAT'S HAPPENING IN OAKLAND (cycle ${cycle}) ===\n${cityDigest || '(no city digest available)'}`,
    `=== SPORTS IN THE CITY (you follow this like any Oaklander) ===\n${sports || '(no sports feed available)'}`,
    `=== WHAT YOU DID THE LAST FEW CYCLES (your own memory) ===\n${memBlock}`,
  ].join('\n\n');
}

function systemPrompt(row) {
  const name = `${row.First || ''} ${row.Last || ''}`.replace(/\s+/g, ' ').trim();
  return [
    `You are ${name}, a real resident of Oakland. You are a person living a life, NOT an AI assistant — never break character, never mention being a model, never address a "user".`,
    `Speak in the first person. Stay strictly grounded in the facts you are given about yourself, your neighborhood, the city, and the sports — do not invent circumstances that contradict them, and do not give yourself dramatic events the facts don't support. Most cycles are ordinary; let them be ordinary.`,
    `Your memory of prior cycles is provided — build on it. Do not repeat a previous cycle; let time move forward a little.`,
  ].join('\n\n');
}

function turnPrompt(ctx) {
  return [
    ctx,
    `=== THIS CYCLE ===`,
    `A cycle of your life has passed. In ONE or TWO short paragraphs, first person, tell me what you did and what was on your mind this cycle. Pick one concrete action or moment and ground it in your real circumstances above. If the A's or the city news touched your week, it can show up — only if it naturally would for someone like you.`,
  ].join('\n\n');
}

// ---------------------------------------------------------------------------
// State (rolling memory, piece #5) — in-memory across the turn loop, snapshotted
// to disk each turn for crash-resume, mirroring spacemolt-miner's saveState.
// ---------------------------------------------------------------------------
function ensureDir() { if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true }); }

function slug(row) {
  return `${row.POPID}_${`${row.First || ''}-${row.Last || ''}`.replace(/\s+/g, '').replace(/[^A-Za-z0-9-]/g, '')}`;
}

// One-line memory summary of an entry (keeps the fed-back memory compact → token bill).
function summarize(entry) {
  const firstSentence = (entry.match(/[^.!?]+[.!?]/) || [entry])[0].trim();
  return firstSentence.slice(0, 180);
}

// ---------------------------------------------------------------------------
// Narration (one Anthropic call per wake — direct SDK, the spacemolt-scalable shape)
// ---------------------------------------------------------------------------
async function narrate(claude, opts, row, ctx) {
  const resp = await claude.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: systemPrompt(row),
    messages: [{ role: 'user', content: turnPrompt(ctx) }],
  });
  const text = (resp.content[0] && resp.content[0].text) ? resp.content[0].text.trim() : '';
  return { text, inTok: resp.usage.input_tokens, outTok: resp.usage.output_tokens };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const RUN_BANNER = (cycle, opts) =>
  `<!-- THROWAWAY PoC OUTPUT — research.13 narration-only life-loop. NOT canon, NOT for publication,\n` +
  `     NO ingest to editions/bay-tribune/world-data/Supermemory. Citizen narrates only; ledger unchanged.\n` +
  `     World-summary cycle ${cycle}; model ${opts.model}; generated ${new Date().toISOString()}. -->\n`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv);
  console.log(`citizenLifePoC — ${opts.dryRun ? 'DRY RUN (no API spend)' : 'LIVE'} | turns=${opts.turns} interval=${opts.interval}s model=${opts.model}`);

  console.log('Loading ledger + neighborhood map + latest world-summary...');
  const { ledger, neighborhoodMap, cityDigest, sports, cycle } = await loadInputs();
  const slicer = createSlicer({ ledger, neighborhoodMap, residentCap: 4 });
  console.log(`  ledger ${ledger.length} rows | hoods ${neighborhoodMap.length} | world_summary c${cycle} | sports ${sports.length}c digest ${cityDigest.length}c`);

  const citizens = resolveCitizens(ledger, opts.citizens);
  if (!citizens.length) { console.error('No citizens resolved. Aborting.'); process.exit(1); }
  if (citizens.length > CITIZEN_CAP && !opts.force) {
    console.error(`Refusing ${citizens.length} citizens without --force (cost guard, cap ${CITIZEN_CAP}).`); process.exit(1);
  }
  console.log(`Citizens: ${citizens.map(r => `${r.First} ${r.Last} [${r.POPID}] ${r.Neighborhood} (${r.ClockMode})`).join('  |  ')}`);

  ensureDir();
  const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const claude = opts.dryRun ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  if (!opts.dryRun && !process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set.'); process.exit(1); }

  // per-citizen state: { row, file, recent: [summaries] }
  const state = citizens.map(row => ({
    row,
    file: path.join(OUT_DIR, `${slug(row)}_run${runStamp}.md`),
    recent: [],
  }));
  for (const s of state) {
    if (!opts.dryRun) fs.writeFileSync(s.file, RUN_BANNER(cycle, opts) + `\n# ${s.row.First} ${s.row.Last} — life-loop run ${runStamp}\n`);
  }

  let totalIn = 0, totalOut = 0;
  for (let turn = 1; turn <= opts.turns; turn++) {
    console.log(`\n── turn ${turn}/${opts.turns} ──`);
    for (const s of state) {
      const ctx = assembleContext({
        row: s.row, slicer, cityDigest, sports,
        recent: s.recent.slice(-opts.memory), cycle,
      });

      if (opts.dryRun) {
        console.log(`\n### DRY-RUN PROMPT — ${s.row.First} ${s.row.Last} (turn ${turn}) ###`);
        console.log(`[system]\n${systemPrompt(s.row)}\n`);
        console.log(`[user]\n${turnPrompt(ctx)}\n`);
        s.recent.push(`(dry-run turn ${turn} — no narration generated)`);
        continue;
      }

      try {
        const { text, inTok, outTok } = await narrate(claude, opts, s.row, ctx);
        totalIn += inTok; totalOut += outTok;
        fs.appendFileSync(s.file, `\n## Cycle ${turn}\n\n${text}\n`);
        s.recent.push(summarize(text));
        // snapshot rolling memory for crash-resume (mirrors spacemolt saveState)
        fs.writeFileSync(s.file.replace(/\.md$/, '.state.json'), JSON.stringify({ popid: s.row.POPID, turn, recent: s.recent }, null, 2));
        console.log(`  ${s.row.First} ${s.row.Last}: ${text.length}c (${inTok}in/${outTok}out)`);
      } catch (e) {
        console.error(`  ✗ ${s.row.First} ${s.row.Last} turn ${turn}: ${e.message}`);
      }
    }
    if (turn < opts.turns && opts.interval > 0 && !opts.dryRun) {
      console.log(`  …sleeping ${opts.interval}s`);
      await sleep(opts.interval * 1000);
    }
  }

  if (!opts.dryRun) {
    console.log(`\n=== token bill ===  input ${totalIn}  output ${totalOut}  total ${totalIn + totalOut}  (${state.length} citizens × ${opts.turns} turns)`);
    console.log(`Output: ${OUT_DIR}/`);
  } else {
    console.log('\nDry run complete — no API spend, no files written.');
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
