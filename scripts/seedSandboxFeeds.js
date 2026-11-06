#!/usr/bin/env node
/**
 * seedSandboxFeeds.js — engine.330: generic rows for the feeds the engine reads but does not write,
 * on SANDBOX 1004 only, before a sandbox fire. Live fills these from the newsroom and the sports
 * desk; a sandbox fire otherwise runs them cold (plan docs/plans/2026-11-04-engine-330-sandbox-generic-feeds.md).
 *
 *   Edition_Coverage_Ratings — Cycle N-1, one row per domain live rates in >= 4 of its last 8 rated Cycles, the median
 *   Citizen_Media_Usage      — Cycle N-1, the byline rows of live's latest published week
 *   Oakland_Sports_Feed      — Cycle N, one even week per team in its last live season phase
 *   Advancement_Intake1      — nothing; the engine and the media route fill it
 *
 * N = the sandbox's cycleCount + 1 (the Cycle about to fire). Every row carries SANDBOX-GENERIC.
 * Each feed is skipped when the sandbox already has its rows, so a second run adds nothing.
 *
 * Usage:
 *   node scripts/seedSandboxFeeds.js --sheet-id <sandbox id>            dry run: prints the rows
 *   node scripts/seedSandboxFeeds.js --sheet-id <sandbox id> --apply    appends, reads back
 *   node scripts/seedSandboxFeeds.js --sheet-id <sandbox id> --check    exit 1 when any feed lacks rows for N
 *   [--cycle N] must match the sandbox's cycleCount + 1 or the run stops.
 */

const SANDBOX_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const SANDBOX_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const BASELINE_IDS = ['1orX0qlIQloaM5gqCRJa3LHdkwajIufmcbCTHUWHda4E', '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA'];
const MARKER = 'SANDBOX-GENERIC';
const TEAMS = ["A's", 'Oaks'];
const BYLINE_TYPES = ['byline-landed', 'byline-published'];

// ── pure helpers ────────────────────────────────────────────────────────────

function toObjects(data) {
  if (!data || !data.length) return { header: [], rows: [] };
  const header = data[0].map(h => String(h).trim());
  const rows = data.slice(1).map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i] === undefined ? '' : r[i]; });
    return o;
  });
  return { header, rows };
}

function toRow(header, obj) {
  return header.map(h => (obj[h] === undefined || obj[h] === null) ? '' : obj[h]);
}

function num(v) { const n = parseInt(String(v).trim(), 10); return isNaN(n) ? null : n; }

// median of integers; a half-point rounds toward zero
function median(values) {
  const s = values.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  const v = s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  return Math.trunc(v);
}

// mirrors normalizeCitizenName_ / splitUsageName_ (phase05-citizens/processAdvancementIntake.js)
const USAGE_HONORIFIC_RE = /^(?:dr|rev|revd|fr|prof|professor|mr|mrs|ms|mx|bishop|rabbi|imam|pastor|deacon|sister|father|mother|elder|hon|sen|rep|gov|mayor|councilmember|councilman|councilwoman|capt|lt|sgt|ofc|det|chief)\.?$/i;
function normalizeCitizenName(name) {
  return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
function splitUsageName(raw) {
  let parts = String(raw || '').trim().split(/\s+/);
  if (parts.length >= 3 && USAGE_HONORIFIC_RE.test(parts[0])) parts = parts.slice(1);
  if (parts.length < 2) return null;
  if (USAGE_HONORIFIC_RE.test(parts[0])) return null;
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

// mirrors parseNamesUsed_ / gameNightNameKey_ (phase05-citizens/applyGameNightMoments.js)
function parseNamesUsed(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];
  return s.replace(/\([^(),|;.]*\)/g, ',').replace(/\([^,|;.]+/g, '')
    .split(/[,|;\/]+|\.\s+(?=[A-Z])/).map(x => x.trim()).filter(Boolean);
}
function gameNightNameKey(s) { return String(s || '').trim().replace(/\.$/, '').trim().toLowerCase(); }

// mirrors normalizeOaklandFeedTeam_ for the two franchises
function feedTeam(v) {
  const t = String(v || '').trim().toLowerCase();
  if (!t) return '';
  if (t === 'as' || t.indexOf("a's") !== -1) return "A's";
  if (t.indexOf('oaks') !== -1) return 'Oaks';
  return '';
}

// mirrors canonicalSportsPhase_ (applySportsSeason.js): an unknown or blank phase is off-season, the only phase with no games
const SPORTS_PHASE_ALIASES = { 'world-series': 'championship', 'worldseries': 'championship', 'world series': 'championship',
  'finals': 'championship', 'postseason': 'post-season', 'summer league': 'preseason', 'summer-league': 'preseason',
  'regular': 'regular-season', 'wild-card': 'playoffs', 'division-series': 'playoffs', 'league-championship': 'playoffs',
  'play-in': 'playoffs', 'first-round': 'playoffs', 'conference-semis': 'playoffs', 'conference-finals': 'playoffs' };
const SPORTS_PHASES = ['off-season', 'spring-training', 'preseason', 'early-season', 'regular-season', 'mid-season',
  'late-season', 'post-season', 'playoffs', 'championship'];
function canonicalPhase(seasonType) {
  let s = String(seasonType || '').trim().toLowerCase();
  if (SPORTS_PHASE_ALIASES[s]) s = SPORTS_PHASE_ALIASES[s];
  return SPORTS_PHASES.indexOf(s) === -1 ? 'off-season' : s;
}
function isNoGamePhase(seasonType) { return canonicalPhase(seasonType) === 'off-season'; }

// "6-1" / "6-1-0", or a Sheets date the cell was coerced into ("6/1/2026" = 6-1)
function parseWinLoss(v) {
  const s = String(v || '').trim();
  const m = /^(\d+)-(\d+)(?:-\d+)?$/.exec(s) || /^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/.exec(s);
  if (!m) return null;
  const w = Number(m[1]), l = Number(m[2]);
  return w + l > 0 ? { w, l } : null;   // a filler 0-0 is not a played record (parseWinPercentage_)
}

// living as applyGameNightMoments.js:189 reads it
function isLiving(row) { return !/^(deceased|dead)$/i.test(String(row.Status || '').trim()); }

function ledgerIndexes(ledgerRows) {
  const byGameKey = new Set();
  const byNorm = {};
  // byNorm counts every ledger row, living or not, as processMediaUsage_ does: two rows with one name is ambiguous there
  ledgerRows.forEach(r => {
    const first = String(r.First || '').trim(), last = String(r.Last || '').trim();
    if (!first && !last) return;
    if (isLiving(r)) byGameKey.add(gameNightNameKey(first + ' ' + last));
    const k = normalizeCitizenName(first) + ' ' + normalizeCitizenName(last);
    (byNorm[k] = byNorm[k] || []).push({ name: first + ' ' + last, living: isLiving(r) });
  });
  return { byGameKey, byNorm };
}

// ── row builders ────────────────────────────────────────────────────────────

function buildRatingRows(liveRatings, sandboxRatings, N) {
  const prev = N - 1;
  const cycles = [...new Set(liveRatings.map(r => num(r.Cycle)).filter(c => c !== null && c < N))]
    .sort((a, b) => b - a).slice(0, 8);
  const window = new Set(cycles);
  const byDomain = {};
  liveRatings.forEach(r => {
    const c = num(r.Cycle), rating = num(r.Rating);
    const d = String(r.Domain || '').trim().toUpperCase();
    if (!window.has(c) || rating === null || !d) return;
    const slot = byDomain[d] || (byDomain[d] = { cycles: new Set(), ratings: [] });
    slot.cycles.add(c); slot.ratings.push(rating);
  });
  const have = new Set(sandboxRatings.filter(r => num(r.Cycle) === prev)
    .map(r => String(r.Domain || '').trim().toUpperCase()));
  const rows = [], skipped = [];
  Object.keys(byDomain).sort().forEach(d => {
    const slot = byDomain[d];
    if (slot.cycles.size < 4) return;
    if (have.has(d)) { skipped.push(d); return; }
    const rating = median(slot.ratings);
    rows.push({ Cycle: prev, Domain: d, Rating: rating, ArticleCount: 1, Reporter: MARKER,
      Tone: rating > 0 ? 'positive' : rating < 0 ? 'negative' : 'neutral', Processed: 'FALSE' });
  });
  return { rows, skipped, window: cycles };
}

function buildUsageRows(liveUsage, sandboxUsage, ledgerRows, N) {
  const prev = N - 1;
  const type = r => String(r.UsageType || '').trim().toLowerCase();
  // a whole week (published bylines) or an earlier seed at N-1 means the feed is warm; landed rows alone are a week in progress
  if (sandboxUsage.some(r => num(r.Cycle) === prev && (type(r) === 'byline-published' || String(r.Reporter).trim() === MARKER))) {
    return { rows: [], skipped: 'sandbox already has a published or seeded week at C' + prev, source: null, dropped: [] };
  }
  // the in-progress week's landed rows count against the seed, one for one, so no reporter's piece lands twice
  const already = {};
  sandboxUsage.filter(r => num(r.Cycle) === prev && BYLINE_TYPES.indexOf(type(r)) !== -1).forEach(r => {
    const k = normalizeCitizenName(r.CitizenName) + '|' + type(r); already[k] = (already[k] || 0) + 1;
  });
  const published = liveUsage.filter(r => type(r) === 'byline-published').map(r => num(r.Cycle)).filter(c => c !== null);
  if (!published.length) return { rows: [], skipped: 'live has no published week', source: null, dropped: [] };
  const source = Math.max(...published);
  const { byNorm } = ledgerIndexes(ledgerRows);
  const rows = [], dropped = [];
  liveUsage.filter(r => num(r.Cycle) === source && BYLINE_TYPES.indexOf(type(r)) !== -1).forEach(r => {
    const sp = splitUsageName(r.CitizenName);
    const hits = sp ? (byNorm[normalizeCitizenName(sp.first) + ' ' + normalizeCitizenName(sp.last)] || []) : [];
    if (hits.length !== 1 || !hits[0].living) { dropped.push(String(r.CitizenName)); return; }
    const name = hits[0].name;
    const k = normalizeCitizenName(name) + '|' + type(r);
    if (already[k]) { already[k]--; return; }
    const slug = normalizeCitizenName(name).replace(/\s+/g, '-');
    rows.push(Object.assign({}, r, {
      Timestamp: 'C' + prev, Cycle: prev, CitizenName: name,
      Context: 'sandbox-generic_c' + prev + '_' + slug + '-' + (rows.length + 1),
      Reporter: MARKER, Processed: '', Routed: '', FameProcessed: '', Sentiment: '', Source: ''
    }));
  });
  return { rows, skipped: null, source, dropped };
}

function buildSportsRows(liveSports, sandboxSports, ledgerRows, N) {
  const { byGameKey } = ledgerIndexes(ledgerRows);
  const rows = [], notes = [];
  TEAMS.forEach(team => {
    if (sandboxSports.some(r => num(r.Cycle) === N && feedTeam(r.TeamsUsed) === team)) {
      notes.push(team + ': sandbox has a C' + N + ' row, skipped'); return;
    }
    const teamRows = liveSports.filter(r => feedTeam(r.TeamsUsed) === team && num(r.Cycle) !== null)
      .map((r, i) => ({ r, i })).sort((a, b) => (num(a.r.Cycle) - num(b.r.Cycle)) || (a.i - b.i)).map(x => x.r);
    if (!teamRows.length) { notes.push(team + ': no live rows, skipped'); return; }
    // each carried column = its last non-blank, non-dash value, as reduceFeedTeamState_ carries them
    const lastOf = col => {
      for (let k = teamRows.length - 1; k >= 0; k--) {
        const v = String(teamRows[k][col] === undefined ? '' : teamRows[k][col]).trim();
        if (v && v !== '-') return v;
      }
      return '';
    };
    const seasonType = lastOf('SeasonType');
    // engine.331: EventTrigger and PlayerMood stay blank — a moment is this row's own word and nothing carries, so a
    // blank row is no moment; a blank mood adds no clause to the game-night line and the Streak buckets the night
    const out = {
      Cycle: N, SeasonType: seasonType, TeamsUsed: teamRows[teamRows.length - 1].TeamsUsed,
      HomeNeighborhood: lastOf('HomeNeighborhood'), FanSentiment: lastOf('FanSentiment'),
      FranchiseStability: lastOf('FranchiseStability'), EconomicFootprint: lastOf('EconomicFootprint'),
      CommunityInvestment: lastOf('CommunityInvestment'), MediaProfile: lastOf('MediaProfile'),
      EventTrigger: '', PlayerMood: '', StoryAngle: '', Stats: '',
      Notes: MARKER + ' NON-CANON'
    };
    if (isNoGamePhase(seasonType)) {
      Object.assign(out, { EventType: 'season-state', WeekRecord: 'none', 'Team Record': '', Streak: '', NamesUsed: '' });
    } else {
      let wl = null;
      for (let k = teamRows.length - 1; k >= 0 && !wl; k--) wl = parseWinLoss(teamRows[k]['Team Record']);
      let names = [];
      for (let k = teamRows.length - 1; k >= 0 && !names.length; k--) {
        names = parseNamesUsed(teamRows[k].NamesUsed).filter(n => byGameKey.has(gameNightNameKey(n)));
      }
      Object.assign(out, {
        EventType: 'game-result', WeekRecord: 'H:W A:L',
        'Team Record': wl ? (wl.w + 1) + '-' + (wl.l + 1) : '',
        Streak: 'L1', NamesUsed: names.join(', ')
      });
      if (!wl) notes.push(team + ': no valid W-L on live, Team Record blank');
    }
    rows.push(out);
  });
  return { rows, notes };
}

function checkTarget(sheetId, liveId) {
  if (!sheetId) return 'no --sheet-id';
  if (sheetId === liveId) return 'refused: that is the live sheet';
  if (BASELINE_IDS.indexOf(sheetId) !== -1) return 'refused: that is a frozen baseline';
  if (sheetId !== SANDBOX_ID) return 'refused: only SANDBOX 1004 is allowed';
  return null;
}

module.exports = { buildRatingRows, buildUsageRows, buildSportsRows, checkTarget, median, parseWinLoss,
  parseNamesUsed, isNoGamePhase, canonicalPhase, toObjects, toRow, SANDBOX_ID, BASELINE_IDS, MARKER };

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const arg = n => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
  const apply = args.includes('--apply'), check = args.includes('--check');

  require('../lib/env');
  const LIVE_ID = process.env.GODWORLD_SHEET_ID;
  const target = arg('--sheet-id');
  const refusal = checkTarget(target, LIVE_ID);
  if (refusal) { console.error(refusal); process.exit(2); }
  const sheets = require('../lib/sheets');

  // live reads first, while the env still points at live
  console.log('reading live ' + LIVE_ID);
  const live = {};
  for (const t of ['Edition_Coverage_Ratings', 'Citizen_Media_Usage', 'Oakland_Sports_Feed']) {
    live[t] = toObjects(await sheets.getSheetData(t));
  }

  // switch once, never back
  process.env.GODWORLD_SHEET_ID = target;
  const client = await sheets.getClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: target, fields: 'properties.title' });
  const title = meta.data.properties.title;
  console.log('target ' + target + ' "' + title + '"');
  if (title !== SANDBOX_TITLE) { console.error('refused: title is not ' + SANDBOX_TITLE); process.exit(2); }

  const sb = {};
  for (const t of ['World_Config', 'Edition_Coverage_Ratings', 'Citizen_Media_Usage', 'Oakland_Sports_Feed', 'Simulation_Ledger']) {
    sb[t] = await sheets.getSheetData(t);
  }
  const cc = sb.World_Config.slice(1).find(r => String(r[0]).trim() === 'cycleCount');
  const cycleCount = cc ? num(cc[1]) : null;
  if (cycleCount === null) { console.error('sandbox World_Config cycleCount unreadable'); process.exit(2); }
  const N = cycleCount + 1;
  const asked = arg('--cycle');
  if (asked !== null && Number(asked) !== N) { console.error('--cycle ' + asked + ' but the sandbox fires C' + N); process.exit(2); }
  console.log('sandbox cycleCount ' + cycleCount + ' → seeding for fire C' + N);

  const sbr = {};
  ['Edition_Coverage_Ratings', 'Citizen_Media_Usage', 'Oakland_Sports_Feed', 'Simulation_Ledger'].forEach(t => { sbr[t] = toObjects(sb[t]); });
  const ledger = sbr.Simulation_Ledger.rows;

  const ratings = buildRatingRows(live.Edition_Coverage_Ratings.rows, sbr.Edition_Coverage_Ratings.rows, N);
  const usage = buildUsageRows(live.Citizen_Media_Usage.rows, sbr.Citizen_Media_Usage.rows, ledger, N);
  const sports = buildSportsRows(live.Oakland_Sports_Feed.rows, sbr.Oakland_Sports_Feed.rows, ledger, N);

  console.log('\nEdition_Coverage_Ratings C' + (N - 1) + ': ' + ratings.rows.length + ' rows (window ' + ratings.window.join(',') + ')' +
    (ratings.skipped.length ? ', sandbox already has ' + ratings.skipped.join(',') : ''));
  ratings.rows.forEach(r => console.log('  ' + r.Domain + ' ' + r.Rating + ' ' + r.Tone));
  console.log('Citizen_Media_Usage C' + (N - 1) + ': ' + usage.rows.length + ' rows' +
    (usage.skipped ? ' (' + usage.skipped + ')' : ' from live C' + usage.source) +
    (usage.dropped.length ? ', dropped (not one ledger match): ' + usage.dropped.join(', ') : ''));
  usage.rows.forEach(r => console.log('  ' + r.CitizenName + ' ' + r.UsageType + ' ' + r.Context));
  console.log('Oakland_Sports_Feed C' + N + ': ' + sports.rows.length + ' rows');
  sports.rows.forEach(r => console.log('  ' + r.TeamsUsed + ' ' + r.SeasonType + ' ' + r.EventType + ' ' + r.WeekRecord +
    ' rec ' + (r['Team Record'] || '-') + ' streak ' + (r.Streak || '-') + ' names: ' + (r.NamesUsed || '-')));
  sports.notes.forEach(n => console.log('  ' + n));

  const plan = [
    ['Edition_Coverage_Ratings', sbr.Edition_Coverage_Ratings.header, ratings.rows],
    ['Citizen_Media_Usage', sbr.Citizen_Media_Usage.header, usage.rows],
    ['Oakland_Sports_Feed', sbr.Oakland_Sports_Feed.header, sports.rows]
  ];

  if (check) {
    // present on the sandbox for the Cycle, not "nothing left to write"
    const at = (rows, c) => rows.filter(r => num(r.Cycle) === c);
    const missing = [];
    if (!at(sbr.Edition_Coverage_Ratings.rows, N - 1).length) missing.push('Edition_Coverage_Ratings');
    if (!at(sbr.Citizen_Media_Usage.rows, N - 1).some(r => BYLINE_TYPES.indexOf(String(r.UsageType).trim().toLowerCase()) !== -1)) missing.push('Citizen_Media_Usage');
    TEAMS.forEach(t => { if (!at(sbr.Oakland_Sports_Feed.rows, N).some(r => feedTeam(r.TeamsUsed) === t)) missing.push('Oakland_Sports_Feed ' + t); });
    console.log(missing.length ? '\nCHECK: missing rows for C' + N + ' on ' + missing.join(', ') : '\nCHECK: seeded for C' + N);
    process.exit(missing.length ? 1 : 0);
  }
  if (!apply) { console.log('\ndry run — nothing written. Add --apply to append.'); return; }

  for (const [tab, header, rows] of plan) {
    if (!rows.length) continue;
    const n = await sheets.appendRows(tab, rows.map(o => toRow(header, o)));
    const back = toObjects(await sheets.getSheetData(tab)).rows
      .filter(r => /sandbox-generic/i.test(Object.values(r).join(' '))).length;
    console.log('appended ' + n + ' to ' + tab + '; marked rows on the tab now ' + back);
  }
}

if (require.main === module) {
  main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
}
