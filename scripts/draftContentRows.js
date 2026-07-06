/**
 * draftContentRows.js — engine.49 T1: content-ledger auto-authoring drafter.
 *
 * Post-cycle job. Reads what the cycle actually produced (Story_Seed_Deck
 * contract rows w/ citizens, Neighborhood_Map pressures, Cycle_Seeds
 * weather/holiday), drafts condition-gated Event_Content_Ledger rows, and
 * appends only rows the live loader would accept.
 *
 * Parity by execution (T2 contract): every candidate is run through the real
 * loadEventContentLedger_ (eval-loaded from phase02-world-state) one row at a
 * time — a row is written ONLY if the loader loads it with skipped=0. The
 * validator can never drift from the loader because it IS the loader.
 *
 * Backends:
 *   --backend openrouter  cheap-helper LLM (lib/env OPENROUTER_API_KEY,
 *                         DRAFTER_MODEL env, deepseek/deepseek-chat default —
 *                         same pattern as lib/reflectionClassifier.js)
 *   --backend stub        deterministic templates from cycle facts (tests,
 *                         offline, and the no-key fallback NEVER silently
 *                         swaps in — explicit flag only)
 *
 * Usage:
 *   node scripts/draftContentRows.js --cycle 117 [--apply] [--backend stub]
 *        [--active no] [--sheet-id <id>]
 *   Default: dry-run (prints, writes nothing), --active no (T3 supervised —
 *   rows land dark until flipped), sheet from GODWORLD_SHEET_ID.
 *
 * Caps (logged, never silent): 10 rows/cycle, 3/PoolKey, 2 fragments/slot.
 * Dedup: normalized text vs existing tab rows + within batch.
 * Provenance: every written row carries auth:auto in Tags (sweepable).
 *
 * Plan: docs/plans/2026-07-06-content-ledger-auto-authoring.md (engine.49).
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('/root/GodWorld/lib/env'); // OPENROUTER_API_KEY et al.

global.Logger = global.Logger || { log() {} };
// Pull the REAL loader into scope: CONTENT_LEDGER_SOURCE_WHITELIST,
// parseContentConditions_, loadEventContentLedger_.
eval(fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'loadEventContentLedger.js'), 'utf8'));

const MAX_ROWS = 10, MAX_PER_POOL = 3, MAX_PER_SLOT = 2;
const HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];
const MODEL = process.env.DRAFTER_MODEL || 'deepseek/deepseek-chat';

function parseArgs(argv) {
  const a = { apply: false, backend: 'openrouter', active: 'no', cycle: null, sheetId: process.env.GODWORLD_SHEET_ID };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') a.apply = true;
    else if (argv[i] === '--cycle') a.cycle = Number(argv[++i]);
    else if (argv[i] === '--backend') a.backend = argv[++i];
    else if (argv[i] === '--active') a.active = argv[++i];
    else if (argv[i] === '--sheet-id') a.sheetId = argv[++i];
  }
  if (!a.cycle) { console.error('--cycle N required'); process.exit(1); }
  if (!a.sheetId) { console.error('--sheet-id or GODWORLD_SHEET_ID required'); process.exit(1); }
  return a;
}

async function sheetsApi() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || '/root/.config/godworld/credentials/service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

async function getRange(api, sheetId, range) {
  const r = await api.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  return r.data.values || [];
}

// ── Facts: what this cycle actually produced ────────────────────────────────
async function gatherFacts(api, sheetId, cycle) {
  const facts = { cycle, seeds: [], hoods: [], weather: '', holiday: '' };

  const deck = await getRange(api, sheetId, 'Story_Seed_Deck!A1:O200');
  if (deck.length > 1) {
    const h = deck[0], idx = n => h.indexOf(n);
    facts.seeds = deck.slice(1)
      .filter(r => String(r[idx('Cycle')]) === String(cycle))
      .map(r => ({
        desk: r[idx('Desk')] || '', cls: r[idx('Class')] || '', domain: r[idx('Domain')] || '',
        hood: r[idx('Neighborhood')] || '', what: r[idx('What')] || '', why: r[idx('Why')] || '',
        citizens: r[idx('Citizens')] || '', magnitude: Number(r[idx('Magnitude')]) || 0
      }));
  }

  const nm = await getRange(api, sheetId, 'Neighborhood_Map!A1:Z40');
  if (nm.length > 1) {
    const h = nm[0], idx = n => h.indexOf(n);
    facts.hoods = nm.slice(1)
      .filter(r => r[idx('Neighborhood')])
      .map(r => ({
        name: r[idx('Neighborhood')],
        displacement: Number(r[idx('DisplacementPressure')]) || 0,
        gentriPhase: r[idx('GentrificationPhase')] || ''
      }));
  }

  const cs = await getRange(api, sheetId, 'Cycle_Seeds!A1:E600');
  if (cs.length > 1) {
    const h = cs[0], idx = n => h.indexOf(n);
    const row = cs.slice(1).find(r => String(r[idx('CycleID')]) === String(cycle));
    if (row) { facts.weather = row[idx('Weather')] || ''; facts.holiday = row[idx('Holiday')] || ''; }
  }
  return facts;
}

// ── Backends ────────────────────────────────────────────────────────────────
// Candidate shape: {kind, poolKey, slot, text, weight, conditions, tags, grain}

function draftStub(facts) {
  // Deterministic templates keyed off cycle facts. No RNG, no LLM — same
  // facts in, same rows out. Used by tests and offline runs.
  const out = [];
  for (const h of facts.hoods) {
    if (h.displacement >= 6) {
      out.push({
        kind: 'line', poolKey: 'nbhdState.pressure', slot: '',
        text: 'overheard another neighbor pricing a move off the block and changed the subject',
        weight: 1.1, conditions: 'hood=' + h.name + '; displacement>=6',
        tags: 'source:nbhdState,state:community', grain: ''
      });
    }
  }
  for (const s of facts.seeds.filter(x => x.cls === 'major').slice(0, 3)) {
    if (s.domain === 'SPORTS' && s.hood && s.hood !== 'Citywide') {
      out.push({
        kind: 'line', poolKey: 'neighborhood.gameNight', slot: '',
        text: 'noticed the ' + s.hood + ' spots still buzzing from the game crowd',
        weight: 1, conditions: 'hood=' + s.hood, tags: 'source:neighborhood', grain: ''
      });
    }
    if (s.domain === 'COMMUNITY') {
      out.push({
        kind: 'line', poolKey: 'nbhdState.turnover', slot: '',
        text: 'counted the moving trucks on the block this month without meaning to',
        weight: 1, conditions: 'hood=' + s.hood + '; displacement>=4',
        tags: 'source:nbhdState,state:community', grain: ''
      });
    }
  }
  if (facts.weather) {
    out.push({
      kind: 'fragment', poolKey: '', slot: 'MOOD',
      text: 'let the ' + String(facts.weather).toLowerCase() + ' sky set the pace',
      weight: 1, conditions: '', tags: '', grain: ''
    });
  }
  return out;
}

async function draftOpenRouter(facts) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing (lib/env)');
  const sources = Object.keys(CONTENT_LEDGER_SOURCE_WHITELIST).join(', ');
  const prompt = [
    'You write ambient life-texture lines for citizens of a simulated prosperity-era Oakland.',
    'Output STRICT JSON array only. Each element:',
    '{"kind":"line"|"fragment","poolKey":"<domain.topic>","slot":"<SLOT if fragment>","text":"...","weight":1,"conditions":"...","tags":"source:<x>[,extra]","grain":""}',
    'Rules:',
    '- kind=line REQUIRES poolKey and tags whose FIRST tag is one of: ' + sources,
    '- kind=fragment REQUIRES slot (e.g. MOOD, VENUE) and fills one $SLOT token.',
    '- conditions grammar: ";"-joined AND terms. Fields: wealth,children,displacement (num, ops <=,>=,<,>,=,!=); married,retired (bare flag); ageband=youth|youngAdult|adult|senior; hood=<exact name>; season=<name>. Empty string = ungated.',
    '- text: one lived-in sentence, lowercase start, no citizen names, no numbers from the facts, may use $VENUE/$MOOD tokens in lines.',
    '- Draft 6-10 rows grounded in THESE cycle facts (gate lines to the hoods/conditions the facts justify):',
    JSON.stringify(facts, null, 1),
    'Return ONLY the JSON array.'
  ].join('\n');

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
  });
  if (!r.ok) throw new Error('openrouter ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const body = await r.json();
  const raw = ((body.choices || [])[0] || {}).message?.content || '[]';
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('no JSON array in model output: ' + raw.slice(0, 120));
  const arr = JSON.parse(m[0]);
  if (!Array.isArray(arr)) throw new Error('model output not an array');
  return arr.map(c => ({
    kind: String(c.kind || ''), poolKey: String(c.poolKey || ''), slot: String(c.slot || ''),
    text: String(c.text || ''), weight: Number(c.weight) || 1,
    conditions: String(c.conditions || ''), tags: String(c.tags || ''), grain: String(c.grain || '')
  }));
}

// ── Validation: run each candidate through the REAL loader ─────────────────
function loaderAccepts(candidate, activeFlag) {
  const row = [candidate.kind, candidate.poolKey, candidate.slot, candidate.text,
    candidate.weight, candidate.conditions, candidate.tags, candidate.grain, activeFlag];
  const ctx = {
    summary: {},
    ss: { getSheetByName: n => n !== 'Event_Content_Ledger' ? null : ({
      getLastRow: () => 2,
      getDataRange: () => ({ getValues: () => [HDR, row] })
    }) }
  };
  // Validate with Active forced 'yes' — an Active=no row is invisible to the
  // loader, which would vacuously "pass" garbage destined to be flipped live.
  row[8] = 'yes';
  loadEventContentLedger_(ctx);
  const L = ctx.summary.contentLedger;
  return L.skipped === 0 && (L.lineCount + L.fragmentCount) === 1;
}

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// A hood= gate naming a non-neighborhood (council district, typo) parses fine
// but can never match a citizen row — dead gating the loader can't catch.
// Reject unless the value is a real Neighborhood_Map name.
function hoodGateValid(conditions, hoodNames) {
  const m = String(conditions || '').match(/hood\s*(?:=|!=)\s*([^;]+)/);
  if (!m) return true;
  return hoodNames.has(m[1].trim());
}

function ensureAutoTag(tags) {
  const list = String(tags || '').split(',').map(t => t.trim()).filter(Boolean);
  if (!list.includes('auth:auto')) list.push('auth:auto');
  return list.join(',');
}

async function main() {
  const args = parseArgs(process.argv);
  const api = await sheetsApi();
  console.log(`draftContentRows — cycle ${args.cycle} | backend ${args.backend} | ${args.apply ? 'APPLY' : 'dry-run'} | Active=${args.active} | sheet ${args.sheetId.slice(0, 8)}…`);

  const facts = await gatherFacts(api, args.sheetId, args.cycle);
  console.log(`facts: ${facts.seeds.length} seeds, ${facts.hoods.length} hoods, weather=${facts.weather || '-'}, holiday=${facts.holiday || '-'}`);

  const existing = await getRange(api, args.sheetId, 'Event_Content_Ledger!A1:I500');
  const existingHdr = existing[0] || [];
  const iText = existingHdr.indexOf('Text');
  const seenText = new Set(existing.slice(1).map(r => norm(r[iText])).filter(Boolean));

  const candidates = args.backend === 'stub' ? draftStub(facts) : await draftOpenRouter(facts);
  console.log(`drafted: ${candidates.length} candidates`);

  const report = { written: [], invalid: [], dup: [], capped: [] };
  const hoodNames = new Set(facts.hoods.map(h => h.name));
  const perPool = {}, perSlot = {};
  for (const c of candidates) {
    if (report.written.length >= MAX_ROWS) { report.capped.push(c.text); continue; }
    if (c.kind === 'line' && (perPool[c.poolKey] || 0) >= MAX_PER_POOL) { report.capped.push(c.text); continue; }
    if (c.kind === 'fragment' && (perSlot[c.slot] || 0) >= MAX_PER_SLOT) { report.capped.push(c.text); continue; }
    if (seenText.has(norm(c.text))) { report.dup.push(c.text); continue; }
    c.tags = ensureAutoTag(c.tags);
    if (!hoodGateValid(c.conditions, hoodNames)) { report.invalid.push(c.text + ' [dead hood gate: ' + c.conditions + ']'); continue; }
    if (!loaderAccepts(c, args.active)) { report.invalid.push(c.text + ' [' + c.tags + ' | ' + c.conditions + ']'); continue; }
    seenText.add(norm(c.text));
    if (c.kind === 'line') perPool[c.poolKey] = (perPool[c.poolKey] || 0) + 1;
    else perSlot[c.slot] = (perSlot[c.slot] || 0) + 1;
    report.written.push(c);
  }

  console.log(`\nvalid: ${report.written.length} | invalid: ${report.invalid.length} | dup: ${report.dup.length} | capped: ${report.capped.length}`);
  report.invalid.forEach(t => console.log('  INVALID ' + t));
  report.dup.forEach(t => console.log('  DUP     ' + t));
  report.capped.forEach(t => console.log('  CAPPED  ' + t));
  report.written.forEach(c => console.log(`  ROW [${c.kind}] ${c.poolKey || c.slot} | ${c.text} | ${c.conditions || '(ungated)'} | ${c.tags}`));

  if (!args.apply) { console.log('\ndry-run — nothing written.'); return; }

  // Ensure Active header exists (live tab shipped 8 cols; loader supports 9).
  if (existingHdr.indexOf('Active') < 0) {
    await api.spreadsheets.values.update({
      spreadsheetId: args.sheetId, range: 'Event_Content_Ledger!I1',
      valueInputOption: 'RAW', requestBody: { values: [['Active']] }
    });
    console.log('added Active header (I1)');
  }

  if (report.written.length) {
    await api.spreadsheets.values.append({
      spreadsheetId: args.sheetId, range: 'Event_Content_Ledger!A1',
      valueInputOption: 'RAW',
      requestBody: { values: report.written.map(c => [c.kind, c.poolKey, c.slot, c.text, c.weight, c.conditions, c.tags, c.grain, args.active]) }
    });
  }

  // Verify after write (engine rule): read back and confirm the rows landed.
  const after = await getRange(api, args.sheetId, 'Event_Content_Ledger!A1:I500');
  const afterTexts = new Set(after.slice(1).map(r => norm(r[3])));
  const missing = report.written.filter(c => !afterTexts.has(norm(c.text)));
  if (missing.length) { console.error(`VERIFY FAILED — ${missing.length} rows not found after write`); process.exit(1); }
  console.log(`\nwrote + verified ${report.written.length} rows (Active=${args.active}).`);
}

if (require.main === module) main().catch(e => { console.error('ERR', e.message); process.exit(1); });
module.exports = { draftStub, loaderAccepts, ensureAutoTag, hoodGateValid, parseArgs, HDR, MAX_ROWS, MAX_PER_POOL, MAX_PER_SLOT };
