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
 *        [--active no] [--sheet-id <id>] [--confirm-sheet-id <id>]
 *   Default: dry-run (prints, writes nothing), --active yes (T4 auto-active —
 *   fail-closed loader + caps + dedup + prune are the standing guards; pass
 *   --active no for a supervised T3-style run), sheet from GODWORLD_SHEET_ID.
 *   Interactive sandbox use should pass both IDs. The legacy post-cycle job
 *   still uses GODWORLD_SHEET_ID, so confirmation is optional for backward
 *   compatibility; when supplied it must match exactly.
 *
 * Caps (logged, never silent): 10 rows/cycle, 3/PoolKey, 2 fragments/slot.
 * Dedup: normalized text vs existing tab rows + within batch.
 * Provenance: every written row carries auth:auto in Tags (sweepable).
 *
 * engine.78b: pool-key universe extended to evening.* (evening.nightlife,
 * evening.food, evening.cityEvent) — the ledger previously had zero evening
 * pools, so evening variety was frozen in generateCitizensEvents.js hardcoded
 * lists. Trigger: Neighborhood_Map NightlifeProfile (stub backend; same
 * per-cycle field the displacement trigger already reads). Tags mirror the
 * existing evening:* vocabulary and use source:prevEvening, already
 * whitelisted in loadEventContentLedger.js — no loader change needed.
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
const ENTITY_SLOTS = new Set(['VENUE', 'INSTITUTION', 'CONTACT']);
const FLAT_SUMMARY_PATTERNS = [
  /\bbuzz(?:es|ing)? with energy\b/i,
  /\bbringing new life\b/i,
  /\bmaking waves\b/i,
  /\bsparking excitement\b/i,
  /\bbrighter future\b/i,
  /\bsense of pride and anticipation\b/i,
  /\bfeels alive\b/i,
  /\bis thriving\b/i,
  /\bon the rise\b/i,
  /\bmore connected than ever\b/i,
  /\bvibrant mix\b/i
];

function parseArgs(argv) {
  const a = {
    apply: false,
    backend: 'openrouter',
    active: 'yes',
    cycle: null,
    sheetId: process.env.GODWORLD_SHEET_ID,
    sheetIdExplicit: false,
    confirmSheetId: null
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') a.apply = true;
    else if (argv[i] === '--cycle') a.cycle = Number(argv[++i]);
    else if (argv[i] === '--backend') a.backend = argv[++i];
    else if (argv[i] === '--active') a.active = argv[++i];
    else if (argv[i] === '--sheet-id') {
      a.sheetId = argv[++i];
      a.sheetIdExplicit = true;
    } else if (argv[i] === '--confirm-sheet-id') a.confirmSheetId = argv[++i];
  }
  if (!a.cycle) throw new Error('--cycle N required');
  if (!a.sheetId) throw new Error('--sheet-id or GODWORLD_SHEET_ID required');
  if (a.confirmSheetId && a.confirmSheetId !== a.sheetId) {
    throw new Error('--confirm-sheet-id must match the resolved sheet id');
  }
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

async function getOptionalRange(api, sheetId, range) {
  try {
    return await getRange(api, sheetId, range);
  } catch (err) {
    const message = String((err && err.message) || '');
    if (err && Number(err.code) === 400 &&
        /unable to parse range|not found/i.test(message)) return [];
    throw err;
  }
}

function contentSlots(text) {
  return [...String(text || '').matchAll(/\$([A-Z_]+)/g)].map(m => m[1]);
}

function qualityIssue(candidate) {
  if (!candidate || candidate.kind !== 'line') return '';
  const text = String(candidate.text || '').trim();
  if (/[.!?]$/.test(text)) {
    return 'ledger lines are clauses and must not end in punctuation';
  }
  if (FLAT_SUMMARY_PATTERNS.some(re => re.test(text))) {
    return 'editorial-summary language instead of a lived citizen action';
  }
  return '';
}

function slotDependencyIssue(candidate, existingSlots, acceptedFragments) {
  if (!candidate || candidate.kind !== 'line') return '';
  const missing = contentSlots(candidate.text).filter(slot =>
    !ENTITY_SLOTS.has(slot) &&
    !existingSlots.has(slot) &&
    !acceptedFragments.has(slot)
  );
  const unique = [...new Set(missing)];
  return unique.length ? `unfillable slot(s): ${unique.join(',')}` : '';
}

function buildLedgerProfile(existing, telemetry) {
  const hdr = existing[0] || [];
  const iKind = hdr.indexOf('Kind');
  const iPool = hdr.indexOf('PoolKey');
  const iSlot = hdr.indexOf('Slot');
  const iActive = hdr.indexOf('Active');
  const poolCounts = {};
  const slotCounts = {};

  for (const row of existing.slice(1)) {
    if (iActive >= 0 && String(row[iActive] || '').toLowerCase() === 'no') continue;
    const kind = String(row[iKind] || '').toLowerCase();
    if (kind === 'line') {
      const pool = String(row[iPool] || '').trim();
      if (pool) poolCounts[pool] = (poolCounts[pool] || 0) + 1;
    } else if (kind === 'fragment') {
      const slot = String(row[iSlot] || '').trim();
      if (slot) slotCounts[slot] = (slotCounts[slot] || 0) + 1;
    }
  }

  const eligibleByPool = {};
  const drawsByPool = {};
  const telemetryRows = telemetry.slice(1).filter(row => row && row[0] !== undefined && row[0] !== '');
  for (const row of telemetryRows) {
    let eligible = {}, draws = {};
    try { eligible = JSON.parse(String(row[5] || '{}')); } catch (_) {}
    try { draws = JSON.parse(String(row[6] || '{}')); } catch (_) {}
    for (const [key, value] of Object.entries(eligible)) {
      const pool = key.split('#')[0];
      eligibleByPool[pool] = (eligibleByPool[pool] || 0) + Number(value || 0);
    }
    for (const [key, value] of Object.entries(draws)) {
      const pool = key.split('#')[0];
      drawsByPool[pool] = (drawsByPool[pool] || 0) + Number(value || 0);
    }
  }

  return {
    telemetryCycles: telemetryRows.map(row => row[0]),
    thinPools: Object.keys(poolCounts).filter(pool => poolCounts[pool] <= 2).sort(),
    fragmentSlots: slotCounts,
    persistentNoDrawPools: Object.keys(eligibleByPool)
      .filter(pool => eligibleByPool[pool] > 0 && !drawsByPool[pool])
      .sort()
  };
}

// ── Facts: what this cycle actually produced ────────────────────────────────
async function gatherFacts(api, sheetId, cycle) {
  const facts = { cycle, seeds: [], hoods: [], weather: '', holiday: '' };

  // Unbounded row range: the deck is append-only (291+ rows by C132) — a fixed
  // A1:O200 window silently dropped every seed past row 200 (S317 defect).
  const deck = await getRange(api, sheetId, 'Story_Seed_Deck!A1:O');
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
        displacement: Number(r[idx('HousingPressure')]) || 0,
        gentriPhase: r[idx('NeighborhoodTrajectory')] || '',
        // engine.78b: per-hood evening signal, same tab/row as displacement —
        // 0-1 scale, already computed every cycle (not derived from text).
        nightlife: Number(r[idx('NightlifeProfile')]) || 0
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
    // engine.78b: evening pools — Event_Content_Ledger has zero evening.*
    // rows; evening variety is otherwise frozen in generateCitizensEvents.js
    // hardcoded lists. Trigger: Neighborhood_Map NightlifeProfile, the same
    // measured per-cycle field this loop already reads displacement from —
    // no new fetch, no text-keyword guessing. Tag mirrors the EXISTING
    // evening:* vocabulary already live in generateCitizensEvents.js
    // (evening:crowd/nightlife/vibe/food/cityEvent, etc.) rather than
    // inventing new tag words; source:prevEvening is already whitelisted
    // and already routes to the PrevEvening/dm.outabout dial.
    if (h.nightlife >= 0.7) {
      // NightlifeProfile decides WHICH hood gets drafted for, same role
      // displacement plays above — it is not a DSL field, so the row's
      // Conditions gate on hood alone (the loader has no nightlife term).
      out.push({
        kind: 'line', poolKey: 'evening.nightlife', slot: '',
        text: 'let the ' + h.name + ' night crowd carry them a block further than they meant to go',
        weight: 1.05, conditions: 'hood=' + h.name,
        tags: 'source:prevEvening,evening:nightlife', grain: ''
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

async function draftOpenRouter(facts, ledgerProfile) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing (lib/env)');
  const sources = Object.keys(CONTENT_LEDGER_SOURCE_WHITELIST).join(', ');
  const prompt = [
    'You write ambient life-texture lines for citizens of a simulated prosperity-era Oakland.',
    'Output STRICT JSON array only. Each element:',
    '{"kind":"line"|"fragment","poolKey":"<domain.topic>","slot":"<SLOT if fragment>","text":"...","weight":1,"conditions":"...","tags":"source:<x>[,extra]","grain":""}',
    'Rules:',
    '- kind=line REQUIRES poolKey and tags whose FIRST tag is one of: ' + sources,
    '- kind=fragment REQUIRES slot (e.g. MOOD, VENUE) and fills one $SLOT token.',
    '- conditions grammar: ";"-joined AND terms (ALL must hold for one citizen). Numeric fields: wealth, children, displacement, tier, fame (ops <=,>=,<,>,=,!=). Bare flags: married, retired. Enums: ageband=youth|youngAdult|adult|senior; band=child|teen|youth|youngAdult|adult|senior; lifestate=student|working|retired|none; heritage=none|founding|established|prominent|dynasty. Strings: hood, season, occupation, culdomain (only = or !=). Empty string = ungated. A citizen has exactly ONE hood — never AND multiple "hood=X" terms together; if a line fits several neighborhoods, draft it ungated or pick the single best-fit hood.',
    '- text: one concrete action or observation experienced by one citizen; lowercase clause, no terminal punctuation, no citizen names, no numbers from the facts. Show physical detail, choice, inconvenience, labor, overheard speech, or consequence. Do not summarize how a neighborhood or the city feels. Never use booster language such as thriving, vibrant, hopeful, making waves, on the rise, or more connected than ever. Lines may use $VENUE/$MOOD tokens.',
    '- Ledger profile: prefer a thin PoolKey only when the cycle facts support it. Do not add rows to persistentNoDrawPools; those need routing work, not more content. Existing fragment slots may be reused. ' + JSON.stringify(ledgerProfile || {}),
    '- Evening/night-out texture (engine.78b): PoolKey may use the "evening.*" domain — evening.nightlife (bars/DJ/live music), evening.food (late food spots), evening.cityEvent (night markets, gallery walks, festivals). These use tags starting with "source:prevEvening" (the whitelisted evening source — do NOT use "source:evening", it is not whitelisted); optionally add a second tag evening:nightlife / evening:food / evening:cityEvent to match the vocabulary generateCitizensEvents.js already uses. Draft these ONLY for hoods where facts.hoods[].nightlife (0-1 scale) is high (roughly >=0.7) or facts show real evening/nightlife activity — gate with hood=<name>, do not invent a nightlife condition field (none exists).',
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
// Reject unless the value is a real Neighborhood_Map name. S329 (engine.78b
// residual closed): also reject MULTIPLE ANDed hood= terms — each parses as a
// valid term but a citizen has exactly one hood, so the conjunction can never
// be true for anyone (first live OpenRouter run produced exactly this).
function hoodGateValid(conditions, hoodNames) {
  const all = String(conditions || '').match(/hood\s*(?:=|!=)\s*[^;]+/g);
  if (!all) return true;
  if (all.length > 1) return false;
  const m = all[0].match(/hood\s*(?:=|!=)\s*([^;]+)/);
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

  const existing = await getRange(api, args.sheetId, 'Event_Content_Ledger!A1:I');
  const telemetry = await getOptionalRange(api, args.sheetId, 'Content_Telemetry!A1:H');
  const ledgerProfile = buildLedgerProfile(existing, telemetry);
  console.log(`ledger profile: ${ledgerProfile.thinPools.length} thin pools, ${Object.keys(ledgerProfile.fragmentSlots).length} fragment slots, ${ledgerProfile.persistentNoDrawPools.length} persistent no-draw pools, ${ledgerProfile.telemetryCycles.length} telemetry cycles`);
  const existingHdr = existing[0] || [];
  const iText = existingHdr.indexOf('Text');
  const iKind = existingHdr.indexOf('Kind');
  const iSlot = existingHdr.indexOf('Slot');
  const iActive = existingHdr.indexOf('Active');
  const seenText = new Set(existing.slice(1).map(r => norm(r[iText])).filter(Boolean));
  const existingSlots = new Set(existing.slice(1)
    .filter(r => String(r[iKind] || '').toLowerCase() === 'fragment' &&
      String(r[iActive] || '').toLowerCase() !== 'no')
    .map(r => String(r[iSlot] || '').trim())
    .filter(Boolean));

  const candidates = args.backend === 'stub' ? draftStub(facts) : await draftOpenRouter(facts, ledgerProfile);
  console.log(`drafted: ${candidates.length} candidates`);

  const report = { written: [], invalid: [], dup: [], capped: [] };
  const hoodNames = new Set(facts.hoods.map(h => h.name));
  const perPool = {}, perSlot = {};
  for (const c of candidates) {
    if (report.written.length >= MAX_ROWS) { report.capped.push(c.text); continue; }
    if (c.kind === 'line' && (perPool[c.poolKey] || 0) >= MAX_PER_POOL) { report.capped.push(c.text); continue; }
    if (c.kind === 'fragment' && (perSlot[c.slot] || 0) >= MAX_PER_SLOT) { report.capped.push(c.text); continue; }
    if (seenText.has(norm(c.text))) { report.dup.push(c.text); continue; }
    const quality = qualityIssue(c);
    if (quality) { report.invalid.push(c.text + ' [' + quality + ']'); continue; }
    c.tags = ensureAutoTag(c.tags);
    if (!hoodGateValid(c.conditions, hoodNames)) { report.invalid.push(c.text + ' [dead hood gate: ' + c.conditions + ']'); continue; }
    if (!loaderAccepts(c, args.active)) { report.invalid.push(c.text + ' [' + c.tags + ' | ' + c.conditions + ']'); continue; }
    seenText.add(norm(c.text));
    if (c.kind === 'line') perPool[c.poolKey] = (perPool[c.poolKey] || 0) + 1;
    else perSlot[c.slot] = (perSlot[c.slot] || 0) + 1;
    report.written.push(c);
  }

  const acceptedFragments = new Set(report.written
    .filter(c => c.kind === 'fragment')
    .map(c => c.slot)
    .filter(Boolean));
  const slotSafe = [];
  for (const c of report.written) {
    const issue = slotDependencyIssue(c, existingSlots, acceptedFragments);
    if (issue) report.invalid.push(c.text + ' [' + issue + ']');
    else slotSafe.push(c);
  }
  report.written = slotSafe;

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
  const after = await getRange(api, args.sheetId, 'Event_Content_Ledger!A1:I');
  const afterTexts = new Set(after.slice(1).map(r => norm(r[3])));
  const missing = report.written.filter(c => !afterTexts.has(norm(c.text)));
  if (missing.length) { console.error(`VERIFY FAILED — ${missing.length} rows not found after write`); process.exit(1); }
  console.log(`\nwrote + verified ${report.written.length} rows (Active=${args.active}).`);
}

if (require.main === module) main().catch(e => { console.error('ERR', e.message); process.exit(1); });
module.exports = {
  draftStub,
  loaderAccepts,
  ensureAutoTag,
  hoodGateValid,
  parseArgs,
  qualityIssue,
  slotDependencyIssue,
  buildLedgerProfile,
  contentSlots,
  HDR,
  MAX_ROWS,
  MAX_PER_POOL,
  MAX_PER_SLOT
};
