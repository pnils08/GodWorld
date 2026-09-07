#!/usr/bin/env node
/**
 * buildEconomicSlice.js — business / food beat slice built from the beat-tab dump
 * (pipeline.68 Task 2; supersedes the pipeline.52 world_summary parser build).
 *
 * The slice is ONE neighborhood's businesses from Business_Ledger joined to the
 * people on Employment_Roster who work there, plus the engine's own business
 * seeds for the cycle (Story_Seed_Deck). No engine summary, no crisis lane.
 *
 * Ruling (docs/SIM_DOCTRINE.md §13 — gate the facts, not the color): the facts
 * are the names, places, roles and numbers on this slice. Everything else about
 * the beat is the reporter's to paint.
 *
 * Sources (disk-first; the dump is written by scripts/dumpBeatTabs.js at cycle time):
 *   output/beats/meta.json                — must carry the requested cycle
 *   output/beats/Business_Ledger.jsonl    — BIZ_ID, Name, Sector, Neighborhood, Employee_Count, ...
 *   output/beats/Employment_Roster.jsonl  — BIZ_ID, POP_ID, CitizenName, RoleType, Status
 *   output/beats/Story_Seed_Deck.jsonl    — cumulative; filtered to Cycle === current, Desk business
 *   output/desk_signal_c{N}.json          — optional; lanes.business as pointers only
 *
 * A missing or stale dump throws. There is no fallback to the old signal-only slice.
 *
 * Artifacts:
 *   business variant: output/slices/c{N}/economic.md · output/cron-compare/economic_slice_c{N}.json
 *   food variant:     output/slices/c{N}/economic-food.md · output/cron-compare/economic_food_slice_c{N}.json
 *
 * Usage:
 *   node scripts/buildEconomicSlice.js --cycle 106 [--food] [--json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERSION = 'ECONOMIC-SLICE-2';

const FACTS_TAIL =
  'Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent ' +
  'people or places. Everything else about this beat — what it looks like, who is there, what they ' +
  'want and hate — is yours to paint.';

const ECONOMIC_APPROACH =
  'Business desk approach: this slice is one neighborhood\'s businesses from the ledger and the ' +
  'people on the roster who work there. Open from a named business or a named worker on it — the ' +
  'block, the counter, the hiring board, what the owner is worried about. One claim about how the ' +
  'block is moving. Not civic process roundup. Not multi-voice business-desk average. ' + FACTS_TAIL;

const FOOD_APPROACH =
  'Food & hospitality approach — kitchens as workplaces: this slice is one neighborhood\'s ' +
  'restaurants, cafes and bars from the ledger and the people on the roster who work in them. The ' +
  'people on this slice are real; the rest of the room is yours — the line on a Tuesday, the ' +
  'regulars, the walk-in, the tip jar. One kitchen, one shift, one true thing about the work. ' +
  'Not a review. Not multi-voice culture-desk average. ' + FACTS_TAIL;

// Live Business_Ledger.Sector values that are a kitchen, a counter or a bar
// (read from the C106 dump, 52 of 176 rows): Restaurant & Dining, Cafe / dining,
// Cafe / gallery, Food & Beverage, Fast Food & Quick Service, Sports Bar & Dining,
// Retail & Food, Nightlife & Entertainment, Bar / nightlife, Bar / lounge, Hospitality.
const FOOD_SECTOR_RE = /restaurant|dining|cafe|food|\bbar\b|lounge|nightlife|hospitality|brew/i;

// Business_Ledger uses this for citywide institutions (OUSD, the hospital,
// the library system). It is an org address, not a neighborhood a reporter walks.
const NON_HOODS = new Set(['city-wide', 'citywide', '']);

// The business desk covers private employers. Offices of the city, transit
// agencies, courts, faith bodies and the newsroom itself sit on the same
// ledger but belong to the civic, faith and media beats (civic gravity is
// drift — SIM_DOCTRINE §13). The teams belong to the sports desks. Live
// sector strings from the C106 dump.
const NON_BUSINESS_SECTOR_RE =
  /municipal|public (transit|services|safety)|legal|judicial|faith|synagogue|church|community development|transit & infrastructure|housing & social|media & journalism|crisis response|^sports( franchise)?$/i;

const BEAT_TABS = ['Business_Ledger', 'Employment_Roster', 'Story_Seed_Deck'];

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

function readJsonl(p) {
  const out = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    out.push(JSON.parse(t));
  }
  return out;
}

/**
 * Load the beat-tab dump for a cycle. Throws — never falls back — when the dump
 * is missing, stamped for another cycle, or missing a tab this builder reads.
 */
function loadBeatTabs(root, cycle, tabs) {
  const dir = path.join(root, 'output', 'beats');
  const metaPath = path.join(dir, 'meta.json');
  const meta = loadJson(metaPath);
  if (!meta) {
    throw new Error('beat dump missing (' + path.relative(root, metaPath) +
      '): run scripts/dumpBeatTabs.js ' + cycle);
  }
  if (Number(meta.cycle) !== Number(cycle)) {
    throw new Error('beat dump is C' + meta.cycle + ', slice wants C' + cycle +
      ': run scripts/dumpBeatTabs.js ' + cycle);
  }
  const out = { meta };
  for (const tab of tabs) {
    const p = path.join(dir, tab + '.jsonl');
    if (!fs.existsSync(p)) {
      throw new Error('beat dump missing tab ' + tab + ' (' + path.relative(root, p) +
        '): run scripts/dumpBeatTabs.js ' + cycle);
    }
    out[tab] = readJsonl(p);
  }
  return out;
}

function hoodKey(h) {
  return String(h || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Business_Ledger rows joined to their Active roster staff. */
function joinLedgerToRoster(ledgerRows, rosterRows) {
  const byBiz = new Map();
  for (const r of rosterRows || []) {
    if (String(r.Status || '').toUpperCase() !== 'ACTIVE') continue;
    if (!r.BIZ_ID || !/^BIZ-/i.test(r.BIZ_ID)) continue;
    if (!byBiz.has(r.BIZ_ID)) byBiz.set(r.BIZ_ID, []);
    byBiz.get(r.BIZ_ID).push({
      popid: r.POP_ID || null,
      name: String(r.CitizenName || '').trim(),
      role: String(r.RoleType || '').trim() || null
    });
  }
  return (ledgerRows || []).filter(b => b.BIZ_ID && b.Name).map(b => ({
    bizId: b.BIZ_ID,
    name: String(b.Name).trim(),
    sector: b.Sector || null,
    hood: b.Neighborhood || null,
    employeeCount: num(b.Employee_Count),
    avgSalary: num(b.Avg_Salary),
    annualRevenue: num(b.Annual_Revenue),
    growthRate: num(b.Growth_Rate),
    keyPersonnel: String(b.Key_Personnel || '').trim() || null,
    staff: (byBiz.get(b.BIZ_ID) || []).filter(s => s.name)
  }));
}

/** "POP-00835 Mei-Lin Kang; POP-00878 Quynh Le" → [{popid, name}] */
function parseSeedCitizens(s) {
  return String(s || '').split(';').map(t => t.trim()).filter(Boolean).map(t => {
    const m = t.match(/^(POP-\d+)\s+(.+)$/i);
    return m ? { popid: m[1].toUpperCase(), name: m[2].trim() } : { popid: null, name: t };
  });
}

/** "BIZ-00020 Baylight Construction Authority; BIZ-00057 Anchor Build" → [{bizId, name}] */
function parseSeedBusinesses(s) {
  return String(s || '').split(';').map(t => t.trim()).filter(Boolean).map(t => {
    const m = t.match(/^(BIZ-\d+)\s+(.+)$/i);
    return m ? { bizId: m[1].toUpperCase(), name: m[2].trim() } : { bizId: null, name: t };
  });
}

/** Story_Seed_Deck is cumulative — keep this cycle's business seeds only. */
function seedsForCycle(seedRows, cycle) {
  return (seedRows || [])
    .filter(r => Number(r.Cycle) === Number(cycle) && /^business$/i.test(String(r.Desk || '')))
    .map(r => ({
      seedId: r.SeedID || null,
      hood: r.Neighborhood || null,
      domain: r.Domain || null,
      citizens: parseSeedCitizens(r.Citizens),
      // engine-written colour lines, one per citizen — colour, not fact
      citizenEvents: String(r.CitizenEvents || '').split('|').map(t => t.trim()).filter(Boolean),
      businesses: parseSeedBusinesses(r.Businesses),
      otherEntities: String(r.OtherEntities || '').trim() || null,
      magnitude: num(r.Magnitude),
      trend: r.Trend || null,
      suggestedJournalist: String(r.SuggestedJournalist || '').trim() || null,
      suggestedAngle: String(r.SuggestedAngle || '').trim() || null
    }));
}

function variantOf(opts) {
  return opts && opts.foodFilter ? 'food' : 'business';
}

function slicePaths(cycle, root, opts) {
  const r = root || ROOT;
  const v = variantOf(opts);
  return v === 'food'
    ? {
      md: path.join(r, 'output', 'slices', 'c' + cycle, 'economic-food.md'),
      json: path.join(r, 'output', 'cron-compare', 'economic_food_slice_c' + cycle + '.json')
    }
    : {
      md: path.join(r, 'output', 'slices', 'c' + cycle, 'economic.md'),
      json: path.join(r, 'output', 'cron-compare', 'economic_slice_c' + cycle + '.json')
    };
}

/**
 * Which hoods this variant has covered before, from prior slice artifacts on
 * disk (both the v1 shape and this one carry pulse.hood). Returns hood → last cycle.
 */
function priorCoverage(root, cycle, opts) {
  const dir = path.join(root || ROOT, 'output', 'cron-compare');
  const stem = variantOf(opts) === 'food' ? 'economic_food_slice_c' : 'economic_slice_c';
  const last = new Map();
  let files = [];
  try { files = fs.readdirSync(dir); } catch (_) { return last; }
  for (const f of files) {
    const m = f.match(new RegExp('^' + stem + '(\\d+)\\.json$'));
    if (!m) continue;
    const c = Number(m[1]);
    if (!(c < Number(cycle))) continue;
    const j = loadJson(path.join(dir, f));
    const hood = j && ((j.pulse && j.pulse.hood) || (j.story && j.story.hood) || j.hood);
    if (!hood) continue;
    const k = hoodKey(hood);
    if (!last.has(k) || last.get(k) < c) last.set(k, c);
  }
  return last;
}

/**
 * Eligible hoods: at least one business (passing the sector filter) with at
 * least one Active roster worker. Acceptance needs a Business_Ledger.Name AND an
 * Employment_Roster.CitizenName in the article; a hood with no staffed business
 * cannot satisfy that, so it never gets picked.
 */
function eligibleHoods(businesses) {
  const byHood = new Map();
  for (const b of businesses) {
    const k = hoodKey(b.hood);
    if (NON_HOODS.has(k)) continue;
    if (!byHood.has(k)) byHood.set(k, { hood: b.hood, businesses: [], staffed: 0, workers: 0 });
    const h = byHood.get(k);
    h.businesses.push(b);
    if (b.staff.length) { h.staffed += 1; h.workers += b.staff.length; }
  }
  return [...byHood.values()].filter(h => h.staffed > 0);
}

/** Least-recently-covered hood; ties → most staffed businesses → most workers → name. */
function pickHood(pool, coverage) {
  const ranked = pool.slice().sort((a, b) => {
    const la = coverage.get(hoodKey(a.hood));
    const lb = coverage.get(hoodKey(b.hood));
    const ca = la == null ? -Infinity : la;
    const cb = lb == null ? -Infinity : lb;
    if (ca !== cb) return ca - cb;
    if (b.staffed !== a.staffed) return b.staffed - a.staffed;
    if (b.workers !== a.workers) return b.workers - a.workers;
    return String(a.hood).localeCompare(String(b.hood));
  });
  return ranked[0] || null;
}

function citizenTag(s) {
  return s.popid ? s.name + ' (' + s.popid + ')' : s.name;
}

function pct(n) {
  return n == null ? null : (Math.round(n * 10) / 10) + '%';
}

function businessFactLine(b, maxStaff) {
  const bits = [b.name];
  if (b.sector) bits.push(b.sector);
  if (b.employeeCount != null) bits.push(b.employeeCount + ' employees');
  if (b.growthRate != null) bits.push('growth ' + pct(b.growthRate));
  if (b.keyPersonnel) bits.push('key personnel: ' + b.keyPersonnel);
  const staff = b.staff.slice(0, maxStaff).map(s => s.name + (s.role ? ' (' + s.role + ')' : ''));
  if (staff.length) {
    bits.push('on the roster: ' + staff.join('; ') +
      (b.staff.length > maxStaff ? ' +' + (b.staff.length - maxStaff) + ' more' : ''));
  }
  return bits.join(' · ');
}

function parseBusinessSignals(signal) {
  const lane = (signal && signal.lanes && signal.lanes.business) || [];
  return lane.map(e => ({
    kind: e.kind || 'seed',
    label: String((e.handle && e.handle.angle) || e.label || '').slice(0, 160),
    hood: e.hood || null,
    ref: e.ref || null
  }));
}

function buildEconomicSlice(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const cyc = Number(cycle);
  const variant = variantOf(o);
  const food = variant === 'food';

  const beats = o.beats || loadBeatTabs(root, cyc, BEAT_TABS);
  const all = joinLedgerToRoster(beats.Business_Ledger, beats.Employment_Roster);
  const filtered = food
    ? all.filter(b => FOOD_SECTOR_RE.test(String(b.sector || '')))
    : all.filter(b => !NON_BUSINESS_SECTOR_RE.test(String(b.sector || '')));
  const pool = eligibleHoods(filtered);
  const coverage = o.coverage || priorCoverage(root, cyc, o);
  const seedsAll = seedsForCycle(beats.Story_Seed_Deck, cyc);
  const approach = food ? FOOD_APPROACH : ECONOMIC_APPROACH;
  const kind = food ? 'food-workplaces' : 'economic-storefront';

  const signalPath = path.join(root, 'output', 'desk_signal_c' + cyc + '.json');
  const signals = parseBusinessSignals(o.signal != null ? o.signal : loadJson(signalPath));

  if (!pool.length) {
    return {
      version: VERSION, empty: true, cycle: cyc, kind, variant,
      reason: food
        ? 'no food-sector business with an Active roster worker in the dump'
        : 'no business with an Active roster worker in the dump',
      approach
    };
  }

  const picked = pickHood(pool, coverage);
  const hood = picked.hood;
  const businesses = picked.businesses.slice().sort((a, b) =>
    (b.staff.length - a.staff.length) ||
    ((b.employeeCount || 0) - (a.employeeCount || 0)) ||
    String(a.name).localeCompare(String(b.name))
  ).slice(0, 5);
  const staffedOnSlice = businesses.filter(b => b.staff.length);
  const workers = [];
  for (const b of businesses) for (const s of b.staff.slice(0, 4)) workers.push(Object.assign({ business: b.name }, s));

  const seedsHere = seedsAll.filter(s => hoodKey(s.hood) === hoodKey(hood));
  const seeds = seedsHere.length ? seedsHere : seedsAll.slice(0, 2);

  const named = businesses.map(b => b.name);
  const lead = staffedOnSlice[0];
  const leadWorker = lead && lead.staff[0];
  const angle = food
    ? hood + ' kitchens: ' + named.slice(0, 3).join(', ') + ' — the people who work the shift'
    : hood + ' businesses: ' + named.slice(0, 3).join(', ') + ' — the people who work there';
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const hookLine = (leadWorker
    ? leadWorker.name + (leadWorker.role ? ', ' + leadWorker.role : '') + ' at ' + lead.name + '. '
    : '') +
    plural(workers.length, 'named worker', 'named workers') + ' at ' +
    plural(staffedOnSlice.length, food ? 'named kitchen' : 'named business', food ? 'named kitchens' : 'named businesses') +
    ' in ' + hood + ' on the ledger this cycle.';

  const anchorFacts = businesses.map(b => businessFactLine(b, 4));
  for (const s of seeds.slice(0, 2)) {
    const who = s.citizens.slice(0, 4).map(c => c.name).join('; ');
    const where = s.businesses.map(b => b.name).join('; ');
    anchorFacts.push('ENGINE SEED' + (s.hood ? ' (' + s.hood + ')' : '') + ': ' +
      (who ? 'citizens ' + who : 'no citizens attached') +
      (where ? ' · businesses ' + where : '') +
      (s.otherEntities ? ' · ' + s.otherEntities : ''));
  }

  const citizens = workers.map(citizenTag);
  for (const s of seedsHere) for (const c of s.citizens) {
    const tag = citizenTag(c);
    if (!citizens.includes(tag)) citizens.push(tag);
  }

  const pulse = {
    className: food ? 'hood-kitchens' : 'hood-businesses',
    score: 10 + staffedOnSlice.length * 4 + Math.min(workers.length, 8) + (seedsHere.length ? 3 : 0),
    label: hood + (food ? ' kitchens' : ' businesses') + ' · ' + named.slice(0, 2).join(', '),
    hood,
    namedBusinesses: named
  };

  const story = {
    angle, label: pulse.label, hookLine, hood,
    pulseClass: pulse.className,
    namedBusinesses: named,
    citizens,
    popids: citizens.map(t => (t.match(/\((POP-\d+)\)/) || [])[1]).filter(Boolean),
    ref: 'output/beats/Business_Ledger.jsonl + Employment_Roster.jsonl @C' + cyc,
    cycle: cyc
  };

  return {
    version: VERSION, empty: false, cycle: cyc, kind, variant,
    hood,
    pulse,
    story,
    approach,
    businesses,
    seeds,
    prewrite: {
      pulseClass: pulse.className,
      angle, hookLine,
      namedBusinesses: named,
      anchorFacts,
      forbidden: [
        'Do not invent a business, a worker, an owner or a place — every name comes from this slice',
        'Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose',
        'Do not contradict a role, employer or neighborhood listed here'
      ]
    },
    rotation: {
      pool: pool.map(h => ({ hood: h.hood, staffed: h.staffed, workers: h.workers,
        lastCovered: coverage.get(hoodKey(h.hood)) != null ? coverage.get(hoodKey(h.hood)) : null })),
      picked: hood
    },
    candidates: pool.filter(h => h.hood !== hood).map(h => ({
      className: pulse.className, hood: h.hood,
      label: h.hood + ' · ' + h.staffed + ' staffed / ' + h.businesses.length + ' listed',
      namedBusinesses: h.businesses.filter(b => b.staff.length).slice(0, 3).map(b => b.name)
    })),
    signals: { businessLaneCount: signals.length, sample: signals.slice(0, 5) },
    scene: { namedOnTop: named },
    pointers: [
      'output/beats/Business_Ledger.jsonl (' + beats.meta.rows.Business_Ledger + ' rows @C' + beats.meta.cycle + ')',
      'output/beats/Employment_Roster.jsonl (' + beats.meta.rows.Employment_Roster + ' rows)',
      'output/beats/Story_Seed_Deck.jsonl (business seeds this cycle: ' + seedsAll.length + ')',
      signals.length ? 'output/desk_signal_c' + cyc + '.json lanes.business (pointers only)' : null,
      'docs/plans/2026-09-07-beat-slices-from-sheets-plan.md Task 2'
    ].filter(Boolean)
  };
}

function formatEconomicSliceMarkdown(slice) {
  if (!slice || slice.empty) {
    return '# SLICE — ' + ((slice && slice.kind) || 'economic') + ' (EMPTY)\n\n_' +
      ((slice && slice.reason) || 'no slice') + '_\n';
  }
  const food = slice.variant === 'food';
  const L = [];
  L.push('# SLICE — ' + (food ? 'food & hospitality (kitchens as workplaces)' : 'business desk (one neighborhood, its businesses, its workers)'));
  L.push('');
  L.push('Cycle **C' + slice.cycle + '** · kind `' + slice.kind + '` · hood **' + slice.hood + '**');
  L.push('');
  L.push('## THE SLICE');
  L.push('- Angle: ' + slice.prewrite.angle);
  L.push('- Hook: ' + slice.prewrite.hookLine);
  L.push('');
  L.push('## BUSINESSES (ledger) AND WHO WORKS THERE (roster)');
  for (const b of slice.businesses) {
    L.push('- **' + b.name + '**' + (b.sector ? ' — ' + b.sector : '') +
      (b.employeeCount != null ? ' · ' + b.employeeCount + ' employees' : '') +
      (b.growthRate != null ? ' · growth ' + pct(b.growthRate) : '') +
      (b.keyPersonnel ? ' · key personnel: ' + b.keyPersonnel : ''));
    for (const s of b.staff.slice(0, 4)) L.push('  - ' + s.name + (s.role ? ' — ' + s.role : ''));
    if (b.staff.length > 4) L.push('  - +' + (b.staff.length - 4) + ' more on the roster');
    if (!b.staff.length) L.push('  - _no roster names — the staff here are yours to paint_');
  }
  L.push('');
  L.push('## ENGINE SEEDS (this cycle, business desk)');
  if (!slice.seeds.length) L.push('_none this cycle_');
  for (const s of slice.seeds) {
    L.push('- ' + (s.hood || 'city') + (s.trend ? ' · ' + s.trend : ''));
    if (s.citizens.length) L.push('  - citizens: ' + s.citizens.map(c => c.name).join('; '));
    if (s.businesses.length) L.push('  - businesses: ' + s.businesses.map(b => b.name).join('; '));
    for (const e of s.citizenEvents.slice(0, 4)) L.push('  - colour: ' + e);
  }
  L.push('');
  L.push('## APPROACH');
  L.push(slice.approach);
  L.push('');
  L.push('## FORBIDDEN');
  for (const f of slice.prewrite.forbidden) L.push('- ' + f);
  L.push('');
  L.push('## ROTATION');
  L.push('picked **' + slice.rotation.picked + '** (least recently covered). Pool: ' +
    slice.rotation.pool.map(h => h.hood + ' (' + h.staffed + ' staffed' +
      (h.lastCovered != null ? ', last C' + h.lastCovered : ', never') + ')').join('; '));
  L.push('');
  if (slice.signals.businessLaneCount) {
    L.push('## DESK SIGNAL (pointers only — not the source)');
    for (const s of slice.signals.sample) L.push('- ' + s.label + (s.hood ? ' [' + s.hood + ']' : ''));
    L.push('');
  }
  L.push('## POINTERS');
  for (const p of slice.pointers) L.push('- ' + p);
  L.push('');
  L.push('_Generated by scripts/buildEconomicSlice.js — no LLM. Facts are the names on this page; the room is the reporter\'s._');
  return L.join('\n') + '\n';
}

function writeEconomicSlice(cycle, slice, root, opts) {
  const paths = slicePaths(cycle, root, opts || { foodFilter: slice && slice.variant === 'food' });
  fs.mkdirSync(path.dirname(paths.md), { recursive: true });
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  fs.writeFileSync(paths.json, JSON.stringify(slice, null, 2));
  fs.writeFileSync(paths.md, formatEconomicSliceMarkdown(slice));
  return paths;
}

/**
 * loadEconomicSlice(cycle[, root][, opts]) — the second positional stays the
 * root (newsroom-fanout / cron-desk-run pass it); an object there is read as opts.
 * A cached artifact is served only when it carries this builder's VERSION and
 * the same variant; anything older is rebuilt from the dump.
 */
function loadEconomicSlice(cycle, rootOrOpts, maybeOpts) {
  let root = ROOT;
  let opts = maybeOpts || {};
  if (rootOrOpts && typeof rootOrOpts === 'object') opts = Object.assign({}, rootOrOpts, opts);
  else if (typeof rootOrOpts === 'string') root = rootOrOpts;
  if (opts.root) root = opts.root;
  const paths = slicePaths(cycle, root, opts);
  const j = loadJson(paths.json);
  if (j && j.version === VERSION && j.variant === variantOf(opts) && !j.empty) return j;
  const slice = buildEconomicSlice(cycle, Object.assign({}, opts, { root }));
  writeEconomicSlice(cycle, slice, root, opts);
  return slice.empty ? null : slice;
}

function isBusinessDesk(assign) {
  if (!assign) return false;
  return String(assign.desk || '').toLowerCase() === 'business';
}

/** Mason Ortega draws the food variant wherever he is seated (pipeline.68 Task 3). */
function isFoodSeat(assign) {
  if (!assign) return false;
  if (String(assign.persona || '') === 'mason-ortega') return true;
  return /mason\s*ortega/i.test(String(assign.name || ''));
}

function assignmentFromSlice(slice, assign) {
  if (!slice || slice.empty) return null;
  const food = slice.variant === 'food';
  return {
    desk: (assign && assign.desk) || (food ? 'culture' : 'business'),
    name: (assign && assign.name) || (food ? 'Mason Ortega' : 'Business desk'),
    popid: (assign && assign.popid) || null,
    beatDomain: (assign && assign.beatDomain) || (food ? 'FOOD' : 'ECONOMIC'),
    persona: (assign && assign.persona) || (food ? 'mason-ortega' : null),
    approach: slice.approach,
    story: slice.story,
    economicSlice: true,
    economicVariant: slice.variant,
    pulse: slice.pulse,
    prewrite: slice.prewrite
  };
}

/**
 * Attach the slice to a business-desk or Mason assignment. Throws when the dump
 * is missing or stale — the fanout must not stage a seat built on nothing.
 */
function enrichAssignment(assign, cycle, root) {
  const food = isFoodSeat(assign);
  if (!food && !isBusinessDesk(assign)) return assign;
  const slice = loadEconomicSlice(cycle, root || ROOT, { foodFilter: food });
  if (!slice || slice.empty) return assign;
  const from = assignmentFromSlice(slice, assign);
  return Object.assign({}, assign, {
    approach: from.approach,
    story: from.story || assign.story,
    economicSlice: true,
    economicVariant: from.economicVariant,
    pulse: from.pulse,
    prewrite: from.prewrite
  });
}

if (require.main === module) {
  const cycle = arg('--cycle', null) || (() => {
    try {
      return require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true });
    } catch (_) { return null; }
  })();
  if (cycle == null) {
    console.error('buildEconomicSlice: pass --cycle N');
    process.exit(1);
  }
  const opts = { foodFilter: process.argv.includes('--food') };
  let slice;
  try {
    slice = buildEconomicSlice(cycle, opts);
  } catch (e) {
    console.error('buildEconomicSlice: ' + e.message);
    process.exit(2);
  }
  const paths = writeEconomicSlice(cycle, slice, ROOT, opts);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(slice, null, 2));
  } else {
    console.log('economic slice c' + cycle + ' [' + slice.variant + ']' +
      (slice.empty ? ' EMPTY — ' + slice.reason :
        ' hood=' + slice.hood +
        ' businesses=' + slice.businesses.length +
        ' workers=' + slice.story.citizens.length +
        ' seeds=' + slice.seeds.length));
    if (!slice.empty) console.log('  ' + slice.story.hookLine);
    console.log('→ ' + path.relative(ROOT, paths.md));
    console.log('→ ' + path.relative(ROOT, paths.json));
  }
}

module.exports = {
  VERSION,
  buildEconomicSlice,
  writeEconomicSlice,
  loadEconomicSlice,
  formatEconomicSliceMarkdown,
  assignmentFromSlice,
  enrichAssignment,
  isBusinessDesk,
  isFoodSeat,
  slicePaths,
  loadBeatTabs,
  joinLedgerToRoster,
  seedsForCycle,
  eligibleHoods,
  pickHood,
  priorCoverage,
  FOOD_SECTOR_RE,
  NON_BUSINESS_SECTOR_RE,
  ECONOMIC_APPROACH,
  FOOD_APPROACH,
  FACTS_TAIL
};
