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
 *   output/beats/Story_Hook_Deck.jsonl    — BUSINESS hooks / hooks addressed to Jordan Velez
 *   output/beats/Business_Archive.jsonl   — closures with exit metadata (engine.96 Phase11)
 *   output/beats/Casino_Ledger.jsonl      — wagers + house float (business covers casino, S433)
 *   output/beats/prev/Business_Ledger.jsonl — prior cycle, for movement facts (typed NO_PRIOR_CYCLE until it exists)
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
const VERSION = 'ECONOMIC-SLICE-3';

const FACTS_TAIL =
  'Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent ' +
  'people or places. Everything else about this beat — what it looks like, who is there, what they ' +
  'want and hate — is yours to paint.';

const ECONOMIC_APPROACH =
  'Business desk approach: this slice is one neighborhood\'s businesses from the ledger and the ' +
  'people on the roster who work there — plus what moved since last cycle: revenue and headcount ' +
  'deltas, contractions, closures on the archive, and the week\'s casino action. When the record ' +
  'shows a business closing or shedding workers, that is the story. Open from a named business or ' +
  'a named worker on it — the block, the counter, the hiring board, what the owner is worried ' +
  'about. One claim about how the block is moving. Not civic process roundup. Not multi-voice ' +
  'business-desk average. ' + FACTS_TAIL;

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
  /municipal|public (transit|services|safety)|legal|judicial|faith|synagogue|church|community (development|services)|transit & infrastructure|housing & social|media & journalism|crisis response|^sports( franchise)?$/i;

const BEAT_TABS = ['Business_Ledger', 'Employment_Roster', 'Story_Seed_Deck', 'Story_Hook_Deck', 'Business_Archive', 'Casino_Ledger'];

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

/** Prior-cycle rows for a tab from output/beats/prev/ — a typed first-cycle state, never a throw. */
function loadPrevTab(root, tab) {
  const dir = path.join(root, 'output', 'beats', 'prev');
  const meta = loadJson(path.join(dir, 'meta.json'));
  if (!meta) return { state: 'NO_PRIOR_CYCLE', vs: null, rows: [] };
  const p = path.join(dir, tab + '.jsonl');
  if (!fs.existsSync(p)) return { state: 'NO_PRIOR_CYCLE', vs: null, rows: [] };
  return { state: 'PRIOR_CYCLE_ON_DISK', vs: Number(meta.cycle), rows: readJsonl(p) };
}

/** Simulation_Ledger snapshot rows keyed by POPID (absence = empty map, never a throw). */
function loadProfiles(root) {
  const out = new Map();
  try {
    for (const line of readJsonl(path.join(root, 'output', 'simulation_ledger_snapshot.jsonl'))) {
      const popid = String(line.POPID || '').trim().toUpperCase();
      if (popid) out.set(popid, line);
    }
  } catch (_) { /* no snapshot on disk */ }
  return out;
}

/** $1,800,000 → $1.8M · $41,000 → $41k · $900 → $900 */
function fmtMoney(n) {
  if (n == null) return null;
  const abs = Math.abs(n);
  const body = abs >= 1e6 ? (Math.round(abs / 1e5) / 10) + 'M' : abs >= 1e3 ? Math.round(abs / 1e3) + 'k' : String(Math.round(abs));
  return (n < 0 ? '-$' : '$') + body;
}

/** Signed movement clause: +$50k / -$50k → null when zero or unknown. */
function fmtDelta(n) {
  if (n == null || n === 0) return null;
  return (n > 0 ? '+$' : '-$') + fmtMoney(Math.abs(n)).slice(1);
}

/** This cycle's hooks for the business desk: named to Jordan Velez or Domain BUSINESS. */
function hooksForBusiness(hookRows, cycle) {
  const seen = new Set();
  return (hookRows || [])
    .filter(r => Number(r.Cycle) === Number(cycle) &&
      (/jordan\s*velez/i.test(String(r.SuggestedJournalist || '')) || String(r.Domain || '').toUpperCase() === 'BUSINESS'))
    .map(r => ({
      text: String(r.HookText || '').trim(), angle: String(r.SuggestedAngle || '').trim() || null,
      hood: r.Neighborhood || null
    }))
    .filter(h => h.text && !seen.has(h.text) && seen.add(h.text))
    .slice(0, 6);
}

/** Key_Personnel can carry a "POP-xxxxx Name (role)" tag — the name is the fact, the ID never prints. */
function cleanKeyPersonnel(s) {
  return String(s || '').replace(/POP-\d+\s*/g, '').replace(/\s{2,}/g, ' ').trim() || null;
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
    keyPersonnel: cleanKeyPersonnel(b.Key_Personnel),
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
  if (b.employeeCount != null) {
    bits.push(b.employeeCount + ' employees' +
      (b.delta && b.delta.employees ? ' (' + (b.delta.employees > 0 ? '+' : '') + b.delta.employees + ' vs C' + b.delta.vsCycle + ')' : ''));
  }
  if (b.growthRate != null) bits.push('growth ' + pct(b.growthRate));
  if (b.annualRevenue != null && b.delta && b.delta.revenue) {
    bits.push('revenue ' + fmtMoney(b.annualRevenue) + ' (' + fmtDelta(b.delta.revenue) + ' vs C' + b.delta.vsCycle + ')');
  }
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

  // Movement: the prior dump (output/beats/prev/) turns static values into what
  // moved. Typed NO_PRIOR_CYCLE until the first rotation exists.
  const prev = loadPrevTab(root, 'Business_Ledger');
  const prevById = new Map(prev.rows.map(r => [r.BIZ_ID, r]));
  for (const b of all) {
    const pr = prevById.get(b.bizId);
    if (!pr) continue;
    const dEmp = b.employeeCount != null && num(pr.Employee_Count) != null ? b.employeeCount - num(pr.Employee_Count) : null;
    const dRev = b.annualRevenue != null && num(pr.Annual_Revenue) != null ? b.annualRevenue - num(pr.Annual_Revenue) : null;
    const dGro = b.growthRate != null && num(pr.Growth_Rate) != null ? b.growthRate - num(pr.Growth_Rate) : null;
    if (dEmp || dRev || dGro) b.delta = { vsCycle: prev.vs, employees: dEmp, revenue: dRev, growth: dGro };
  }

  // Closures: this cycle's Business_Archive rows (engine.96 Phase 11), plus
  // anything on the prior dump that vanished with no archive row — the engine
  // archives same-cycle, so a bare disappearance is a question, not silence.
  const sectorOk = b => food ? FOOD_SECTOR_RE.test(String(b.sector || '')) : !NON_BUSINESS_SECTOR_RE.test(String(b.sector || ''));
  const archiveRows = beats.Business_Archive || [];
  const archivedIds = new Set(archiveRows.map(r => r.BIZ_ID));
  const currentIds = new Set(all.map(b => b.bizId));
  const archiveSrc = 'output/beats/Business_Archive.jsonl @C' + cyc;
  const diffSrc = 'output/beats/prev/Business_Ledger.jsonl vs Business_Ledger.jsonl @C' + cyc;
  const closures = archiveRows
    .filter(r => Number(r.ClosedCycle || r.ExitCycle) === cyc)
    .map(r => ({ name: String(r.Name || '').trim(), sector: r.Sector || null, hood: r.Neighborhood || null,
      reason: String(r.ArchiveReason || 'closed').trim(), keyPersonnel: cleanKeyPersonnel(r.Key_Personnel), src: archiveSrc }))
    .filter(cl => cl.name && sectorOk(cl))
    .concat(prev.state === 'PRIOR_CYCLE_ON_DISK'
      ? prev.rows.filter(r => r.BIZ_ID && !currentIds.has(r.BIZ_ID) && !archivedIds.has(r.BIZ_ID))
        .map(r => ({ name: String(r.Name || '').trim(), sector: r.Sector || null, hood: r.Neighborhood || null,
          reason: 'was on the ledger at C' + prev.vs + ' and is gone, with no archive row', keyPersonnel: cleanKeyPersonnel(r.Key_Personnel), src: diffSrc }))
        .filter(cl => cl.name && sectorOk(cl))
      : []);

  // Contraction watch: shedding roster workers while growth sits at or under
  // zero. Stated as fact; what it means is the reporter's.
  const contractionWatch = (!food && prev.state === 'PRIOR_CYCLE_ON_DISK')
    ? all.filter(b => !NON_BUSINESS_SECTOR_RE.test(String(b.sector || '')) && b.delta &&
        b.delta.employees != null && b.delta.employees < 0 && b.growthRate != null && b.growthRate <= 0)
      .sort((a, b) => a.delta.employees - b.delta.employees).slice(0, 5)
    : [];

  // Casino action (business desk covers it, S433): this cycle's wagers by
  // ledger-tracked patrons, plus the house float. Untracked patrons never print.
  const profiles = loadProfiles(root);
  const houseRow = (beats.Casino_Ledger || []).find(r => String(r.WagerId || '').toUpperCase() === 'HOUSE');
  const casino = { wagers: [], houseFloat: houseRow ? num(houseRow.HouseFloatAfter) : null, totalRows: 0 };
  if (!food) {
    const rows = (beats.Casino_Ledger || []).filter(r => String(r.WagerId || '').toUpperCase() !== 'HOUSE' &&
      (Number(r.CyclePlaced) === cyc || Number(r.CycleSettled) === cyc));
    casino.totalRows = rows.length;
    for (const w of rows) {
      const popid = String(w.POPID || '').toUpperCase();
      const prof = profiles.get(popid);
      if (!prof || !prof.Name) continue;
      casino.wagers.push({
        popid, name: String(prof.Name).trim(), market: w.MarketFamily || null,
        stake: num(w.Stake), payout: num(w.Payout), settled: Number(w.CycleSettled) === cyc,
        status: String(w.Status || '').trim() || null
      });
      if (casino.wagers.length >= 5) break;
    }
  }

  const hooks = hooksForBusiness(beats.Story_Hook_Deck, cyc);
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
  const closureLead = closures.length
    ? 'CLOSED: ' + closures.map(cl => cl.name).join('; ') + '. '
    : '';
  const hookLine = closureLead + (leadWorker
    ? leadWorker.name + (leadWorker.role ? ', ' + leadWorker.role : '') + ' at ' + lead.name + '. '
    : '') +
    plural(workers.length, 'named worker', 'named workers') + ' at ' +
    plural(staffedOnSlice.length, food ? 'named kitchen' : 'named business', food ? 'named kitchens' : 'named businesses') +
    ' in ' + hood + ' on the ledger this cycle.';

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

  // Typed-packet exposure (livedExperiencePacket.candidateRows reads slice.citizens
  // first): every worker on the slice is an interview target with a clean profile.
  const citizenRows = workers.map(w => ({
    popid: w.popid, name: w.name, role: w.role, neighborhood: hood, business: w.business,
    profile: [w.name, w.role, w.business + ', ' + hood].filter(Boolean).join(' — '),
    why: 'works at ' + w.business + ' (Employment_Roster)'
  }));
  for (const sd of seedsHere) for (const c of sd.citizens) {
    if (c.popid && !citizenRows.some(r => r.popid === c.popid)) {
      citizenRows.push({ popid: c.popid, name: c.name, role: null, neighborhood: hood, business: null,
        profile: c.name + ' — ' + hood, why: 'engine seed for ' + hood + ' this cycle (Story_Seed_Deck)' });
    }
  }
  const factSrc = 'output/beats/Business_Ledger.jsonl + Employment_Roster.jsonl @C' + cyc;
  const seedSrc = 'output/beats/Story_Seed_Deck.jsonl @C' + cyc;
  const casinoSrc = 'output/beats/Casino_Ledger.jsonl @C' + cyc;

  // Casino bettors are interview candidates too (business covers the casino, S433).
  for (const g of casino.wagers) {
    if (citizenRows.some(r => r.popid === g.popid)) continue;
    const prof = profiles.get(g.popid);
    citizenRows.push({
      popid: g.popid, name: g.name,
      role: prof ? String(prof.RoleType || '').trim() || null : null,
      neighborhood: (prof && String(prof.Neighborhood || '').trim()) || null, business: null,
      profile: [g.name, prof && String(prof.RoleType || '').trim(), prof && String(prof.Neighborhood || '').trim()].filter(Boolean).join(' — '),
      why: 'on the Casino_Ledger this cycle — ' + (g.settled ? 'settled' : 'placed') + ' a ' + (g.market || 'casino') + ' wager'
    });
  }

  const factEntries = businesses.map(b => ({ text: businessFactLine(b, 4), src: factSrc }));
  for (const s of seeds.slice(0, 2)) {
    const who = s.citizens.slice(0, 4).map(c => c.name).join('; ');
    const where = s.businesses.map(b => b.name).join('; ');
    factEntries.push({ text: 'ENGINE SEED' + (s.hood ? ' (' + s.hood + ')' : '') + ': ' +
      (who ? 'citizens ' + who : 'no citizens attached') +
      (where ? ' · businesses ' + where : '') +
      (s.otherEntities ? ' · ' + s.otherEntities : ''), src: seedSrc });
  }
  for (const cl of closures) {
    factEntries.push({ text: 'CLOSED: ' + cl.name + (cl.sector ? ' (' + cl.sector + ')' : '') + (cl.hood ? ', ' + cl.hood : '') +
      ' — ' + cl.reason + (cl.keyPersonnel ? ' · key personnel: ' + cl.keyPersonnel : ''), src: cl.src });
  }
  for (const w of contractionWatch) {
    factEntries.push({ text: 'CONTRACTING: ' + w.name + (w.hood ? ' (' + w.hood + ')' : '') + ' shed ' + Math.abs(w.delta.employees) +
      ' worker' + (w.delta.employees === -1 ? '' : 's') + ' vs C' + w.delta.vsCycle + ' and growth is ' + pct(w.growthRate), src: diffSrc });
  }
  for (const g of casino.wagers) {
    factEntries.push({ text: 'CASINO: ' + g.name + ' — ' + (g.market || 'casino') + ' wager, staked ' + fmtMoney(g.stake) +
      (g.settled ? ', settled for ' + fmtMoney(g.payout) : ', placed this cycle'), src: casinoSrc });
  }
  if (!food && casino.houseFloat != null) {
    factEntries.push({ text: 'CASINO: the house float stands at ' + fmtMoney(casino.houseFloat), src: casinoSrc });
  }
  const anchorFacts = factEntries.map(e => e.text);

  return {
    version: VERSION, empty: false, cycle: cyc, kind, variant,
    hood,
    pulse,
    story,
    approach,
    businesses,
    seeds,
    citizens: citizenRows,
    closures,
    contractionWatch,
    casino: food ? null : casino,
    deltas: { state: prev.state, vs: prev.vs },
    prewrite: {
      pulseClass: pulse.className,
      angle, hookLine,
      namedBusinesses: named,
      anchorFacts,
      evidence: factEntries,
      hooks,
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
      prev.state === 'PRIOR_CYCLE_ON_DISK' ? 'output/beats/prev/Business_Ledger.jsonl (movement vs C' + prev.vs + ')' : null,
      closures.length ? 'output/beats/Business_Archive.jsonl (closures this cycle: ' + closures.length + ')' : null,
      !food && casino.totalRows ? 'output/beats/Casino_Ledger.jsonl (' + casino.totalRows + ' wager rows this cycle)' : null,
      hooks.length ? 'output/beats/Story_Hook_Deck.jsonl (business hooks this cycle: ' + hooks.length + ')' : null,
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
      (b.employeeCount != null ? ' · ' + b.employeeCount + ' employees' +
        (b.delta && b.delta.employees ? ' (' + (b.delta.employees > 0 ? '+' : '') + b.delta.employees + ' vs C' + b.delta.vsCycle + ')' : '') : '') +
      (b.growthRate != null ? ' · growth ' + pct(b.growthRate) : '') +
      (b.annualRevenue != null && b.delta && b.delta.revenue ? ' · revenue ' + fmtMoney(b.annualRevenue) + ' (' + fmtDelta(b.delta.revenue) + ' vs C' + b.delta.vsCycle + ')' : '') +
      (b.keyPersonnel ? ' · key personnel: ' + b.keyPersonnel : ''));
    for (const s of b.staff.slice(0, 4)) L.push('  - ' + s.name + (s.role ? ' — ' + s.role : ''));
    if (b.staff.length > 4) L.push('  - +' + (b.staff.length - 4) + ' more on the roster');
    if (!b.staff.length) L.push('  - _no roster names — the staff here are yours to paint_');
  }
  L.push('');
  if (slice.deltas && slice.deltas.state === 'NO_PRIOR_CYCLE') {
    L.push('_Movement: NO_PRIOR_CYCLE — the prior dump rotation starts next cycle._');
    L.push('');
  }
  if (slice.closures && slice.closures.length) {
    L.push('## CLOSED / GONE THIS CYCLE');
    for (const cl of slice.closures) {
      L.push('- **' + cl.name + '**' + (cl.sector ? ' — ' + cl.sector : '') + (cl.hood ? ', ' + cl.hood : '') +
        ' · ' + cl.reason + (cl.keyPersonnel ? ' · key personnel: ' + cl.keyPersonnel : ''));
    }
    L.push('');
  }
  if (slice.contractionWatch && slice.contractionWatch.length) {
    L.push('## CONTRACTION WATCH (shedding workers, growth at or under zero)');
    for (const w of slice.contractionWatch) {
      L.push('- **' + w.name + '**' + (w.hood ? ' — ' + w.hood : '') + ' · ' + w.employeeCount + ' employees (' +
        w.delta.employees + ' vs C' + w.delta.vsCycle + ') · growth ' + pct(w.growthRate));
    }
    L.push('');
  }
  if (slice.casino && (slice.casino.wagers.length || slice.casino.houseFloat != null)) {
    L.push('## THE CASINO THIS CYCLE (the business desk covers it)');
    for (const g of slice.casino.wagers) {
      L.push('- ' + g.name + ' — ' + (g.market || 'casino') + ' wager, staked ' + fmtMoney(g.stake) +
        (g.settled ? ', settled for ' + fmtMoney(g.payout) : ', placed this cycle'));
    }
    if (slice.casino.houseFloat != null) L.push('- The house float stands at ' + fmtMoney(slice.casino.houseFloat) + '.');
    L.push('');
  }
  if (slice.prewrite.hooks && slice.prewrite.hooks.length) {
    L.push('## ENGINE HOOKS (colour, not fact)');
    for (const h of slice.prewrite.hooks) L.push('- ' + h.text + (h.angle ? ' (' + h.angle + ')' : ''));
    L.push('');
  }
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
