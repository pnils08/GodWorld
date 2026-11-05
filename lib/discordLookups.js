/**
 * discordLookups.js — record lookups for the Discord personas (research.32).
 *
 * The personas had one tool, a 2-3 word keyword search over files. It cannot reach a number in a
 * table (KONO, Sick 17), it shows a file's first matching line (a C36 feed row for a C114 question),
 * and a file-level AND match listed strangers' ledger rows. These four lookups read the records the
 * crons already write on disk — the ledger snapshot, the beat tabs, the editions — and the world
 * cards and published canon in Supermemory, newest fact first, every number with its Cycle.
 *
 * Pure parts take rows and return a result object; `*FromDisk` wrappers load the files. The bot
 * (scripts/mags-discord-bot.js) formats with `formatResult` and also calls `detectEntities` on the
 * speaker's message so the right record is in the round-0 tool result before the voice chooses a
 * follow-up (codex F1/F2 on the plan: prompt wording alone cannot pick the source).
 *
 * Readers reused, never re-derived: the hood illness bar (scripts/buildHealthSlice.js sickShare /
 * SPIKE_WATCH / SPIKE_RISE), the census read (scripts/beatSliceKit.js censusTrail), the WeekRecord
 * grammar (utilities/sportsWeekRecord.js). Citizen pages are a first-person memory stream: they come
 * back labelled as that citizen's own recollections, fenced, show docs skipped — never as a fact row.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BEATS = path.join(ROOT, 'output', 'beats');
const LEDGER_SNAPSHOT = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
const LEDGER_META = path.join(ROOT, 'output', 'simulation_ledger_snapshot.meta.json');
const BEATS_META = path.join(BEATS, 'meta.json');
const EDITIONS_DIR = path.join(ROOT, 'editions');

const POPID_RE = /\bPOP-\d{4,}\b/i;
const BIZID_RE = /\bBIZ-\d{4,}\b/i;

// ---------------------------------------------------------------------------
// Loaders (disk; every one fail-soft to [] / null — a missing tab is "unavailable", never a throw
// into the bot's reply loop)
// ---------------------------------------------------------------------------
function readJsonl(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(function (l) {
      try { return JSON.parse(l); } catch (e) { return null; }
    }).filter(Boolean);
  } catch (e) { return []; }
}
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}
function beat(name) { return readJsonl(path.join(BEATS, name + '.jsonl')); }
function prevBeat(name) { return readJsonl(path.join(BEATS, 'prev', name + '.jsonl')); }

/** The Cycle the beat tabs were dumped at (output/beats/meta.json), or null when the stamp is missing. */
function beatsCycle() { const m = readJson(BEATS_META); return m && m.cycle != null ? Number(m.cycle) : null; }
function ledgerCycle() { const m = readJson(LEDGER_META); return m && m.cycle != null ? Number(m.cycle) : null; }

function clip(text, max) {
  const t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}
function num(v) { const n = Number(v); return v === '' || v == null || isNaN(n) ? null : n; }
function norm(s) { return String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim(); }

// ---------------------------------------------------------------------------
// Citizen
// ---------------------------------------------------------------------------
/**
 * Resolve a name or POPID against ledger rows. Exact POPID, else exact full name (case-insensitive).
 * Two Jacob Perez rows exist (POP-00203 / POP-01089): more than one match returns them all and the
 * caller stops there (codex F8) — a ledger row is never joined to another person's page or card.
 */
function resolveCitizen(query, rows) {
  const q = String(query || '').trim();
  if (!q) return [];
  const pm = q.match(POPID_RE);
  if (pm) {
    const id = pm[0].toUpperCase();
    return rows.filter(function (r) { return String(r.POPID || '').toUpperCase() === id; });
  }
  const nq = norm(q);
  return rows.filter(function (r) { return norm(r.Name) === nq; });
}

function feedRowsNaming(name, feed, n) {
  return feed.filter(function (r) { return String(r.NamesUsed || '').indexOf(name) !== -1; })
    .sort(function (a, b) { return (num(b.Cycle) || 0) - (num(a.Cycle) || 0); }).slice(0, n || 4);
}

function editionLinesNaming(name, n) {
  let files;
  try {
    files = fs.readdirSync(EDITIONS_DIR).map(function (f) {
      const m = f.match(/^cycle_pulse_c(\d+)\.txt$/); return m ? { f: f, c: parseInt(m[1], 10) } : null;
    }).filter(Boolean).sort(function (a, b) { return b.c - a.c; }).slice(0, 3);
  } catch (e) { return []; }
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + esc + '\\b');
  const out = [];
  files.forEach(function (e) {
    let lines = [];
    try { lines = fs.readFileSync(path.join(EDITIONS_DIR, e.f), 'utf8').split('\n'); } catch (err) { return; }
    lines.filter(function (l) { return re.test(l); }).slice(0, 2).forEach(function (l) {
      out.push({ cycle: e.c, text: clip(l, 280) });
    });
  });
  return out.slice(0, n || 4);
}

/**
 * lookupCitizen — pure over the loaded tables. `deps.canon(name)` and `deps.page(popId)` are async
 * fetchers the disk wrapper supplies (Supermemory card + bay-tribune hits; the citizen's page).
 */
async function lookupCitizen(query, tables, deps) {
  deps = deps || {};
  const matches = resolveCitizen(query, tables.ledger || []);
  if (!matches.length) return { kind: 'citizen', query: query, found: false, reason: 'no ledger row with that exact name or POPID (search_world for a partial name)' };
  if (matches.length > 1) {
    return { kind: 'citizen', query: query, found: false, ambiguous: matches.map(function (r) {
      return { popId: r.POPID, name: r.Name, role: r.RoleType, hood: r.Neighborhood };
    }), reason: 'more than one citizen carries that name — ask by POPID' };
  }
  const r = matches[0];
  const out = {
    kind: 'citizen', query: query, found: true,
    popId: r.POPID, name: r.Name, ledgerCycle: tables.ledgerCycle,
    row: { role: r.RoleType, status: r.Status, hood: r.Neighborhood, tier: r.Tier, marital: r.MaritalStatus, birthYear: r.BirthYear, clock: r.ClockMode },
    lastDays: String(r.LifeHistory || '').split('\n').filter(function (l) { return /^Y\d+C\d+ — /.test(l); }).slice(-4).map(function (l) { return clip(l, 180); }),
    feed: feedRowsNaming(r.Name, tables.feed || [], 4).map(function (f) {
      return { cycle: num(f.Cycle), season: f.SeasonType, event: f.EventType, team: f.TeamsUsed, text: clip(f.Notes || f.StoryAngle, 260) };
    }),
    tribune: editionLinesNaming(r.Name, 4),
    card: null, canon: [], page: null
  };
  if (deps.canon) { try { const c = await deps.canon(r.Name, r.POPID); out.card = c.card; out.canon = c.canon; } catch (e) { /* unavailable */ } }
  if (deps.page) { try { out.page = await deps.page(r.POPID); } catch (e) { out.page = { unavailable: true }; } }
  return out;
}

// ---------------------------------------------------------------------------
// Neighborhood
// ---------------------------------------------------------------------------
function hoodKey(h) { return String(h || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

/** Exact hood name (case-insensitive) against the Neighborhood_Demographics names. */
function resolveHood(query, demo) {
  const k = hoodKey(query);
  if (!k) return null;
  const row = demo.find(function (r) { return hoodKey(r.Neighborhood) === k; });
  return row ? row.Neighborhood : null;
}

/**
 * lookupNeighborhood — count, share, the engine's 6% watch bar and the prior-Cycle movement are
 * four facts, not one (codex F10: Chinatown is highest by count and over the bar, and it FELL).
 * Census is read through censusTrail: Cycle + System + IntakeType=all, scopes apart, incomplete
 * withheld; admissions and closing occupancy named separately (codex F11).
 */
function lookupNeighborhood(query, tables, deps) {
  deps = deps || {};
  const demo = tables.demo || [];
  const hood = resolveHood(query, demo);
  if (!hood) return { kind: 'neighborhood', query: query, found: false, reason: 'not a neighborhood on the hood table', hoods: demo.map(function (r) { return r.Neighborhood; }) };
  const H = deps.health;  // { sickShare, SPIKE_WATCH, SPIKE_RISE } from scripts/buildHealthSlice.js
  const row = demo.find(function (r) { return r.Neighborhood === hood; });
  const prevRow = (tables.prevDemo || []).find(function (r) { return hoodKey(r.Neighborhood) === hoodKey(hood); });
  const share = H ? H.sickShare(row) : null;
  const prevShare = H && prevRow ? H.sickShare(prevRow) : null;
  const pop = (num(row.Students) || 0) + (num(row.Adults) || 0) + (num(row.Seniors) || 0);
  const ranked = demo.map(function (r) { return { hood: r.Neighborhood, sick: num(r.Sick) }; }).filter(function (x) { return x.sick != null; })
    .sort(function (a, b) { return b.sick - a.sick; });
  const rank = ranked.findIndex(function (x) { return x.hood === hood; }) + 1;
  const top = ranked[0] || null;
  const out = {
    kind: 'neighborhood', query: query, found: true, hood: hood,
    asOfCycle: num(row.LastUpdated) != null ? num(row.LastUpdated) : tables.beatsCycle,
    people: { students: num(row.Students), adults: num(row.Adults), seniors: num(row.Seniors), total: pop, unemployed: num(row.Unemployed) },
    illness: {
      sick: num(row.Sick), share: share, overWatchBar: H && share != null ? share >= H.SPIKE_WATCH : null, watchBar: H ? H.SPIKE_WATCH : null,
      prevSick: prevRow ? num(prevRow.Sick) : null, prevCycle: tables.prevCycle,
      risen: H && share != null && prevShare != null && prevShare > 0 ? share >= prevShare * H.SPIKE_RISE : null,
      rankByCount: rank, hoodsCounted: ranked.length, highestByCount: top
    },
    school: { quality: num(row.SchoolQualityIndex), graduation: num(row.GraduationRate), collegeReady: num(row.CollegeReadinessRate) },
    census: null, card: null
  };
  if (deps.censusTrail && tables.census) {
    const cyc = tables.beatsCycle;
    const sys = {};
    ['hospital', 'judicial'].forEach(function (system) {
      const trail = deps.censusTrail(tables.census, cyc, system);
      const t = trail.hoods.find(function (h) { return hoodKey(h.hood) === hoodKey(hood); });
      sys[system] = { state: trail.state, cycle: cyc, hood: t || null, city: trail.city || null };
    });
    out.census = sys;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
const TEAMS = { "a's": "A's", 'as': "A's", 'athletics': "A's", 'oaks': 'Oaks' };
function resolveTeam(query) {
  const k = norm(query).replace(/^oakland\s+/, '').replace(/^the\s+/, '');
  return TEAMS[k] || null;
}
function usableRecord(r) { const v = String(r['Team Record'] || '').trim(); return v && v !== '-' ? v : null; }

/**
 * lookupTeam — the record comes from the newest row of that exact team that carries a usable
 * `Team Record` (the A's C114 tail is rumors with "-"; the Oaks C114 game-result has 6-1); the
 * feed rows follow newest first. WeekRecord is ordered game outcomes (H:W A:L), not a standings
 * field. No roster is claimed — TrueSource's list is every GAME-clock citizen, not a club (codex F12/F13).
 */
function lookupTeam(query, tables, deps) {
  deps = deps || {};
  const team = resolveTeam(query);
  if (!team) return { kind: 'team', query: query, found: false, reason: "teams on the feed: A's, Oaks" };
  const rows = (tables.feed || []).filter(function (r) { return String(r.TeamsUsed || '').trim() === team; })
    .sort(function (a, b) { return (num(b.Cycle) || 0) - (num(a.Cycle) || 0); });
  if (!rows.length) return { kind: 'team', query: query, found: false, team: team, reason: 'no rows for that team on the feed' };
  // Newest first within a Cycle = file order reversed: later rows in the file are later events.
  const byRecency = (tables.feed || []).slice().reverse().filter(function (r) { return String(r.TeamsUsed || '').trim() === team; });
  const recRow = byRecency.find(usableRecord) || null;
  let week = null;
  if (recRow && deps.parseWeekRecord) { try { week = deps.parseWeekRecord(recRow.WeekRecord); } catch (e) { week = null; } }
  return {
    kind: 'team', query: query, found: true, team: team, feedCycle: tables.beatsCycle,
    record: recRow ? { teamRecord: usableRecord(recRow), streak: String(recRow.Streak || '').trim() || null, cycle: num(recRow.Cycle), event: recRow.EventType, season: recRow.SeasonType,
      week: week && week.value ? week.value : null } : null,
    season: byRecency[0] ? byRecency[0].SeasonType : null,
    rows: byRecency.slice(0, 6).map(function (r) {
      return { cycle: num(r.Cycle), season: r.SeasonType, event: r.EventType, names: clip(r.NamesUsed, 140), text: clip(r.Notes || r.StoryAngle, 300) };
    })
  };
}

// ---------------------------------------------------------------------------
// Business
// ---------------------------------------------------------------------------
/** Exact name (case-insensitive) or BIZ_ID; active table first, then the archive (closed, with ExitCycle) — codex F14. */
function resolveBusiness(query, active, archive) {
  const q = String(query || '').trim();
  const bm = q.match(BIZID_RE);
  const match = function (r) {
    if (bm) return String(r.BIZ_ID || '').toUpperCase() === bm[0].toUpperCase();
    return norm(r.Name) === norm(q);
  };
  const a = (active || []).find(match);
  if (a) return { row: a, state: 'active' };
  const z = (archive || []).find(match);
  if (z) return { row: z, state: 'closed' };
  return null;
}

async function lookupBusiness(query, tables, deps) {
  deps = deps || {};
  const hit = resolveBusiness(query, tables.business, tables.businessArchive);
  if (!hit) return { kind: 'business', query: query, found: false, reason: 'no business with that exact name or BIZ_ID on the active table or the archive (search_world for a partial name)' };
  const r = hit.row;
  const out = {
    kind: 'business', query: query, found: true, state: hit.state, asOfCycle: tables.beatsCycle,
    row: { bizId: r.BIZ_ID, name: r.Name, sector: r.Sector, hood: r.Neighborhood, employees: num(r.Employee_Count), avgSalary: num(r.Avg_Salary), revenue: num(r.Annual_Revenue), growth: num(r.Growth_Rate), keyPeople: r.Key_Personnel || null },
    closed: hit.state === 'closed' ? { exitCycle: num(r.ExitCycle), closedCycle: num(r.ClosedCycle), reason: r.ArchiveReason || null } : null,
    card: null, canon: []
  };
  if (deps.canon) { try { const c = await deps.canon(r.Name, r.BIZ_ID); out.card = c.card; out.canon = c.canon; } catch (e) { /* unavailable */ } }
  return out;
}

// ---------------------------------------------------------------------------
// Entity detection — what a message names, for the bot-side round-0 lookups.
// One of each kind at most; exact full names / exact hood names / team tokens / exact business names.
// ---------------------------------------------------------------------------
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function detectEntities(message, tables) {
  const text = ' ' + norm(message) + ' ';
  const out = { citizen: null, hood: null, team: null, business: null };
  const pm = String(message || '').match(POPID_RE);
  if (pm) out.citizen = pm[0].toUpperCase();
  else {
    // longest full name first so "Vinnie Keane" beats a shorter name that is its prefix
    const names = (tables.ledger || []).map(function (r) { return String(r.Name || '').trim(); }).filter(function (n) { return n.indexOf(' ') > 0; })
      .sort(function (a, b) { return b.length - a.length; });
    for (let i = 0; i < names.length; i++) {
      if (new RegExp('\\b' + escapeRe(norm(names[i])) + '\\b').test(text)) { out.citizen = names[i]; break; }
    }
  }
  const hoods = (tables.demo || []).map(function (r) { return r.Neighborhood; }).sort(function (a, b) { return b.length - a.length; });
  for (let i = 0; i < hoods.length; i++) {
    if (new RegExp('\\b' + escapeRe(hoodKey(hoods[i])) + '\\b').test(text)) { out.hood = hoods[i]; break; }
  }
  if (/\boaks\b/.test(text)) out.team = 'Oaks';
  else if (/\ba's\b|\bathletics\b/.test(text)) out.team = "A's";
  const bizNames = (tables.business || []).map(function (r) { return String(r.Name || '').trim(); }).filter(function (n) { return n.length >= 5; })
    .sort(function (a, b) { return b.length - a.length; });
  for (let i = 0; i < bizNames.length; i++) {
    if (new RegExp('\\b' + escapeRe(norm(bizNames[i])) + '\\b').test(text)) { out.business = bizNames[i]; break; }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Formatting — one plain block per result, newest fact first, Cycles on every number.
// ---------------------------------------------------------------------------
function pct(x) { return x == null ? '—' : (x * 100).toFixed(1) + '%'; }

function formatResult(res) {
  if (!res) return '(no result)';
  const L = [];
  if (res.kind === 'citizen') {
    if (!res.found) {
      L.push('Citizen lookup "' + res.query + '": ' + res.reason + '.');
      if (res.ambiguous) res.ambiguous.forEach(function (a) { L.push('- ' + a.name + ' — ' + a.popId + ' — ' + (a.role || '') + ' — ' + (a.hood || '')); });
      return L.join('\n');
    }
    L.push('## ' + res.name + ' (' + res.popId + ') — the record');
    if (res.feed.length) {
      L.push('Newest from the sports feed (what the club has said; the Cycle is the entry\'s):');
      res.feed.forEach(function (f) { L.push('- C' + f.cycle + ' ' + (f.event || '') + ' (' + (f.team || '') + ', ' + (f.season || '') + '): ' + f.text); });
    }
    L.push('Ledger row' + (res.ledgerCycle != null ? ' (snapshot C' + res.ledgerCycle + ')' : '') + ': ' + [res.row.role, res.row.status && 'status ' + res.row.status, res.row.hood && 'lives in ' + res.row.hood, res.row.marital, res.row.birthYear && 'born ' + res.row.birthYear].filter(Boolean).join(' | '));
    if (res.feed.length) L.push('Where the feed and the ledger row differ, say what each says with its Cycle; an announced change is not a completed status change.');
    if (res.lastDays.length) { L.push('Last days, as the city recorded them:'); res.lastDays.forEach(function (d) { L.push('- ' + d); }); }
    if (res.tribune.length) { L.push('The Tribune, newest first:'); res.tribune.forEach(function (t) { L.push('- C' + t.cycle + ': ' + t.text); }); }
    if (res.card) L.push('World card: ' + clip(res.card, 600));
    if (res.canon && res.canon.length) { L.push('Published canon, newest Cycle first (undated cards last):'); res.canon.forEach(function (c) { L.push('- ' + (c.cycle != null ? 'C' + c.cycle : 'undated') + ' ' + (c.title ? '[' + clip(c.title, 60) + '] ' : '') + clip(c.text, 240)); }); }
    if (res.page && res.page.unavailable) L.push('Their page: unavailable right now.');
    else if (res.page && res.page.text) L.push('Their own recollections (their page — what they wrote, not a fact row):\n' + res.page.text);
    return L.join('\n');
  }
  if (res.kind === 'neighborhood') {
    if (!res.found) return 'Neighborhood lookup "' + res.query + '": ' + res.reason + '. Hoods: ' + res.hoods.join(', ') + '.';
    const i = res.illness;
    L.push('## ' + res.hood + ' — hood table as of C' + res.asOfCycle);
    L.push('People: ' + res.people.total + ' (' + res.people.students + ' students, ' + res.people.adults + ' adults, ' + res.people.seniors + ' seniors); unemployed ' + res.people.unemployed + '.');
    L.push('Illness: ' + i.sick + ' sick = ' + pct(i.share) + ' of residents' +
      (i.watchBar != null ? ' (watch bar ' + pct(i.watchBar) + ': ' + (i.overWatchBar ? 'OVER' : 'under') + ')' : '') +
      (i.prevSick != null ? '; C' + i.prevCycle + ' was ' + i.prevSick + (i.risen ? ' — RISEN a quarter or more' : i.sick > i.prevSick ? ' — up' : i.sick < i.prevSick ? ' — down' : ' — flat') : '') +
      '; rank ' + i.rankByCount + ' of ' + i.hoodsCounted + ' by count' + (i.highestByCount && i.highestByCount.hood !== res.hood ? ' (highest: ' + i.highestByCount.hood + ' ' + i.highestByCount.sick + ')' : ' (the highest)') + '.');
    if (res.census) {
      ['hospital', 'judicial'].forEach(function (s) {
        const c = res.census[s];
        if (!c || c.state !== 'ON_RECORD') { L.push((s === 'hospital' ? 'Hospital' : 'Custody') + ' census C' + (c ? c.cycle : '?') + ': no rows on record.'); return; }
        const t = c.hood;
        if (!t) { L.push((s === 'hospital' ? 'Hospital' : 'Custody') + ' census C' + c.cycle + ': no row for this hood.'); return; }
        if (!t.complete) { L.push((s === 'hospital' ? 'Hospital' : 'Custody') + ' census C' + c.cycle + ': ' + t.completeness + ' — numbers withheld.'); return; }
        L.push((s === 'hospital' ? 'Hospital' : 'Custody') + ' census C' + c.cycle + ': ' + t.intakes + (s === 'hospital' ? ' admissions' : ' arrests') + ' this Cycle; ' + t.closing + (s === 'hospital' ? ' in care' : ' in custody') + ' at the close' + (t.beds != null ? ', ' + t.beds + ' beds' : '') + (t.exits ? '; ' + t.exits + ' left' : '') + '.' +
          (c.city && c.city.complete ? ' Citywide: ' + c.city.intakes + (s === 'hospital' ? ' admissions, ' : ' arrests, ') + c.city.closing + ' at the close.' : ''));
      });
    }
    L.push('Schools: quality ' + res.school.quality + ', graduation ' + res.school.graduation + '%, college-ready ' + res.school.collegeReady + '%.');
    if (res.card) L.push('Hood card: ' + clip(res.card, 500));
    return L.join('\n');
  }
  if (res.kind === 'team') {
    if (!res.found) return 'Team lookup "' + res.query + '": ' + res.reason + '.';
    L.push('## ' + res.team + ' — the sports feed, as of C' + res.feedCycle + (res.season ? ' (' + res.season + ')' : ''));
    if (res.record) {
      const over = res.season && /off-season/i.test(res.season) && !/off-season/i.test(res.record.season || '');
      L.push((over ? 'Last recorded record (that season is over): ' : 'Record: ') + res.record.teamRecord + (res.record.streak ? ', streak ' + res.record.streak : '') + (res.record.week && !over ? ', this week\'s games ' + res.record.week + ' (home/away: win/loss)' : '') + ' — from the C' + res.record.cycle + ' ' + res.record.event + ' entry (' + (res.record.season || '') + ').');
    }
    else L.push('No current record on this feed for the ' + res.team + ' (the newest entries carry none).');
    L.push('Newest entries first:');
    res.rows.forEach(function (r) { L.push('- C' + r.cycle + ' ' + (r.event || '') + ' (' + (r.season || '') + ')' + (r.names ? ' [' + r.names + ']' : '') + ': ' + r.text); });
    L.push('The feed carries no roster; name only the people the entries name.');
    return L.join('\n');
  }
  if (res.kind === 'business') {
    if (!res.found) return 'Business lookup "' + res.query + '": ' + res.reason + '.';
    const r = res.row;
    L.push('## ' + r.name + ' (' + r.bizId + ') — ' + (res.state === 'closed' ? 'CLOSED' : 'active') + ', business table as of C' + res.asOfCycle);
    if (res.closed) L.push('Closed: exit C' + (res.closed.exitCycle != null ? res.closed.exitCycle : '?') + (res.closed.reason ? ' (' + res.closed.reason + ')' : '') + '.');
    L.push([r.sector, r.hood, r.employees != null ? r.employees + ' employees' : null, r.avgSalary != null ? 'avg salary $' + r.avgSalary.toLocaleString('en-US') : null, r.revenue != null ? 'revenue $' + r.revenue.toLocaleString('en-US') : null, r.growth != null ? 'growth ' + r.growth + '%' : null, r.keyPeople ? 'key people: ' + r.keyPeople : null].filter(Boolean).join(' | '));
    if (res.card) L.push('Business card: ' + clip(res.card, 500));
    if (res.canon && res.canon.length) { L.push('Published canon, newest Cycle first:'); res.canon.forEach(function (c) { L.push('- ' + (c.cycle != null ? 'C' + c.cycle : 'undated') + ' ' + clip(c.text, 240)); }); }
    return L.join('\n');
  }
  return '(unknown result kind)';
}

// ---------------------------------------------------------------------------
// Disk + Supermemory wrappers — what the bot calls.
// ---------------------------------------------------------------------------
function loadTables() {
  return {
    ledger: readJsonl(LEDGER_SNAPSHOT), ledgerCycle: ledgerCycle(),
    demo: beat('Neighborhood_Demographics'), prevDemo: prevBeat('Neighborhood_Demographics'),
    census: beat('Care_Justice_Census'), feed: beat('Oakland_Sports_Feed'),
    business: beat('Business_Ledger'), businessArchive: beat('Business_Archive'),
    beatsCycle: beatsCycle(), prevCycle: (function () { const m = readJson(BEATS_META); return m && m.prevCycle != null ? Number(m.prevCycle) : null; })()
  };
}

/** Raw Supermemory hits with their Cycle where the writer stamped one (editions do; cards do not — codex F15). */
function canonHits(query, tags, limit) {
  const sm = require('./supermemory');
  return sm.search(query, { containerTags: tags, limit: limit || 5, timeoutMs: 8000, apiVersion: 'v3' }).then(function (results) {
    return (results || []).map(function (r) {
      const chunks = (r.chunks || []).filter(function (c) { return c.isRelevant; }).map(function (c) { return c.content; });
      const cyc = r.metadata && r.metadata.cycle != null ? Number(r.metadata.cycle) : null;
      return { title: r.title || '', cycle: isNaN(cyc) ? null : cyc, text: chunks.join(' ') };
    }).filter(function (h) { return h.text; });
  });
}
function orderByCycle(hits) {
  const dated = hits.filter(function (h) { return h.cycle != null; }).sort(function (a, b) { return b.cycle - a.cycle; });
  return dated.concat(hits.filter(function (h) { return h.cycle == null; }));
}
/**
 * The card (wd-citizens / wd-business) plus bay-tribune hits by Cycle. A card search is semantic: the
 * top hit for "Vinnie Keane" came back as Fred Ciccone's card (read 2026-11-05), so a card counts only
 * when it carries the record's own ID (POPID / BIZ_ID) or exact name.
 */
function canonFor(cardTag) {
  return async function (name, id) {
    const parts = await Promise.all([
      canonHits(name, [cardTag], 3).catch(function () { return []; }),
      canonHits(name, ['bay-tribune'], 4).catch(function () { return []; })
    ]);
    const own = parts[0].find(function (h) {
      const t = (h.title + ' ' + h.text);
      return (id && t.toUpperCase().indexOf(String(id).toUpperCase()) !== -1) || norm(t).indexOf(norm(name)) !== -1;
    });
    return { card: own ? own.text : null, canon: orderByCycle(parts[1]) };
  };
}
/** The citizen's own page, newest entries, show docs skipped, fenced — their recollections, not facts (codex F9). */
async function pageFor(popId) {
  const citizenPage = require('./citizenPage');
  const memoryFence = require('./memoryFence');
  const res = await citizenPage.recentPage_(popId, 3, { skipTypes: ['show'] });
  if (!res || res.error) return { unavailable: true };
  const prose = (res.results || []).filter(function (r) { return !(r && r.metadata && r.metadata.type === 'show'); })
    .map(function (r) { return r && typeof r.content === 'string' ? clip(r.content, 500) : ''; }).filter(Boolean).join('\n');
  return prose ? { text: memoryFence.wrap(prose, 'citizen-page:' + popId) } : null;
}
function healthDeps() {
  const H = require('../scripts/buildHealthSlice');
  return { sickShare: H.sickShare, SPIKE_WATCH: H.SPIKE_WATCH, SPIKE_RISE: H.SPIKE_RISE };
}

async function lookupCitizenFromDisk(query, tables) {
  return lookupCitizen(query, tables || loadTables(), { canon: canonFor('wd-citizens'), page: pageFor });
}
function lookupNeighborhoodFromDisk(query, tables) {
  const K = require('../scripts/beatSliceKit');
  return lookupNeighborhood(query, tables || loadTables(), { health: healthDeps(), censusTrail: K.censusTrail });
}
function lookupTeamFromDisk(query, tables) {
  const W = require('../utilities/sportsWeekRecord');
  return lookupTeam(query, tables || loadTables(), { parseWeekRecord: W.parseSportsWeekRecord_ });
}
async function lookupBusinessFromDisk(query, tables) {
  return lookupBusiness(query, tables || loadTables(), { canon: canonFor('wd-business') });
}

/** Dispatch by tool name (codex F1): one result string per call; an unknown tool is an explicit error, never a search. */
async function runTool(name, input, tables) {
  const t = tables || loadTables();
  const arg = input && (input.name || input.query || input.team || input.popId) || '';
  switch (name) {
    case 'lookup_citizen': return formatResult(await lookupCitizenFromDisk(arg, t));
    case 'lookup_neighborhood': return formatResult(lookupNeighborhoodFromDisk(arg, t));
    case 'lookup_team': return formatResult(lookupTeamFromDisk(arg, t));
    case 'lookup_business': return formatResult(await lookupBusinessFromDisk(arg, t));
    default: return '(unknown tool ' + name + ')';
  }
}

/** Round-0 records for whatever the message names — appended to the forced search_world result. */
async function recordsForMessage(message, tables) {
  const t = tables || loadTables();
  const ents = detectEntities(message, t);
  const blocks = [];
  if (ents.team) blocks.push(formatResult(lookupTeamFromDisk(ents.team, t)));
  if (ents.hood) blocks.push(formatResult(lookupNeighborhoodFromDisk(ents.hood, t)));
  if (ents.citizen) blocks.push(formatResult(await lookupCitizenFromDisk(ents.citizen, t)));
  if (ents.business) blocks.push(formatResult(await lookupBusinessFromDisk(ents.business, t)));
  return { entities: ents, text: blocks.join('\n\n') };
}

const TOOLS = [
  { name: 'lookup_citizen', description: 'One citizen\'s record by exact full name or POPID: newest sports-feed entries naming them, their ledger row (role, status, neighborhood), their last recorded days, what the Tribune printed, their world card, published canon by Cycle, and their own page (their recollections). Two people with one name come back as a list — ask again by POPID.',
    input_schema: { type: 'object', properties: { name: { type: 'string', description: 'Exact full name (e.g. "Vinnie Keane") or POPID (e.g. "POP-00001")' } }, required: ['name'] } },
  { name: 'lookup_neighborhood', description: 'One neighborhood\'s current numbers from the hood table: residents, unemployed, sick count and share against the city\'s 6% watch bar, movement since last Cycle, rank by count and which hood is highest; hospital and custody census (admissions vs. in care); schools.',
    input_schema: { type: 'object', properties: { name: { type: 'string', description: 'Exact neighborhood name (e.g. "KONO", "Chinatown", "West Oakland")' } }, required: ['name'] } },
  { name: 'lookup_team', description: 'A team\'s current record and streak from the sports feed (A\'s or Oaks), the season it is in, and the newest feed entries first. No roster — only the people the entries name.',
    input_schema: { type: 'object', properties: { team: { type: 'string', description: '"A\'s" or "Oaks"' } }, required: ['team'] } },
  { name: 'lookup_business', description: 'One business by exact name or BIZ_ID: sector, neighborhood, employees, salary, revenue, growth; whether it is active or closed (with the exit Cycle); its card and published canon.',
    input_schema: { type: 'object', properties: { name: { type: 'string', description: 'Exact business name or BIZ_ID' } }, required: ['name'] } }
];

module.exports = {
  // pure
  resolveCitizen, lookupCitizen, resolveHood, lookupNeighborhood, resolveTeam, lookupTeam, resolveBusiness, lookupBusiness,
  detectEntities, formatResult, orderByCycle,
  // disk / live
  loadTables, runTool, recordsForMessage, TOOLS,
  lookupCitizenFromDisk, lookupNeighborhoodFromDisk, lookupTeamFromDisk, lookupBusinessFromDisk
};
