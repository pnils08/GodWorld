'use strict';

// pipeline.95 (builder 2026-10-30) — a pilot's UNDOCKED nights in plain words, from the show's own files.
// Two readers: cron-undocked-run writes each applied night to the pilot's page (the container holds it), and
// the wake and the interview read showBlock straight from disk, because page recall picks 3 of 15 recent docs
// and a flight there would usually lose. Plan: docs/plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots.md §6.
// In-world time only: a weekday and a Cycle, never a date. Night = intake row (Applied=yes) joined to its archive.
const fs = require('fs');
const path = require('path');

// One switch for the three readers — the page stage, the wake (block + reserve) and the interview block. On 2026-10-30
// 18:41 CDT after codex review (HOLD folded) + re-review (R1, R2 folded; R3 decided), flipped with no flight, wake or
// newsroom stage running. The first page run (20:30 flight) fills in every past night.
const ON = true;
const SHOW = path.join(path.resolve(__dirname, '..'), 'output', 'spacemolt-show');
const DAY_NAMES = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
const LOG_CAP = 300;
// A captain's log entry shaped as a working note (54 of 104 on 2026-10-30) is the runner's handoff, not the pilot talking;
// one that carries an id, a date or a model name is not quoted either (codex F6). Whole entries drop — nothing is scrubbed.
const { LEAK_DATE_PAT, LEAK_MODEL_PAT } = require('../lib/memoryFence');
const HANDOFF_RE = /session handoff|\bhandoff\b|next step|active goal/i;
const NOT_QUOTED = [HANDOFF_RE, /POP-\d|undocked-pop|\bepisode\b/i, new RegExp(LEAK_DATE_PAT), new RegExp(LEAK_MODEL_PAT, 'i'), /\b20\d\d-\d\d-\d\d/];
const DETAIL_NIGHTS = 3; // the latest nights told one by one, whatever their Cycle; the rest as one line

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

// The flight's weekday in Central, the same reading citizenPage.pageDayOf makes — the page key's day.
function nightDay(startedAt) {
  const d = new Date(startedAt);
  if (isNaN(d.getTime())) return null;
  const s = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Chicago' }).toLowerCase();
  return DAY_NAMES[s] ? s : null;
}

// Every applied night on disk, oldest first. A missing archive keeps the intake's own fields; an unreadable file
// throws — the caller decides (the wake logs it and shows nothing; the page stage stops loudly).
function loadNights(opts) {
  const root = (opts && opts.root) || SHOW;
  const dir = path.join(root, 'intake');
  let files;
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort(); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const out = [];
  for (const f of files) {
    const r = readJson(path.join(dir, f));
    if (String(r.Applied || '').trim().toLowerCase() !== 'yes') continue;
    const pop = String(r.POPID || '').trim().toUpperCase();
    const cycle = Number(r.Cycle);
    if (!/^POP-\d{5}$/.test(pop) || !Number.isFinite(cycle) || !r.EpisodeId) continue;
    let archive = null;
    try { archive = readJson(path.join(root, 'staged', 'archive', r.EpisodeId + '.json')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const startedAt = (archive && archive.window && archive.window.startedAt) || r.Timestamp;
    out.push({ episodeId: String(r.EpisodeId), pop, cycle, holder: String(r.Holder || ''), startedAt, day: nightDay(startedAt), intake: r, archive });
  }
  return out.sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
}

function nightsFor(nights, popId) {
  const p = String(popId || '').toUpperCase();
  return (nights || []).filter((n) => n.pop === p);
}

// The board row for a pilot, or null. standings.json is UNDOCKED-STANDINGS/2 (rows ranked points -> credits -> POPID).
function loadStanding(popId, opts) {
  const root = (opts && opts.root) || SHOW;
  let s;
  try { s = readJson(path.join(root, 'standings.json')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  const rows = Array.isArray(s && s.rows) ? s.rows : [];
  const row = rows.find((r) => String(r.POPID || '').toUpperCase() === String(popId || '').toUpperCase());
  return row ? { ...row, of: rows.length } : null;
}

// "lacaille_9352" -> "Lacaille 9352"; a name already cased stays as written.
function placeName(id) {
  const s = String(id || '').trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
  return s === s.toLowerCase() ? s.replace(/\b[a-z]/g, (ch) => ch.toUpperCase()) : s;
}
function itemName(id) { return String(id || '').trim().replace(/_/g, ' ').toLowerCase(); }
function listOf(xs) {
  const a = xs.filter(Boolean);
  return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
}
function num(n) { return Number(n).toLocaleString('en-US'); }
function qty(obj) { return listOf(Object.entries(obj || {}).filter(([, n]) => Number(n) > 0).map(([k, n]) => num(n) + ' ' + itemName(k))); }

// The night's facts as subjectless clauses ("went through Sirius and Sol", "earned Maiden Jump (5 points)") plus how
// it ended. Pure. The archive's own FACT values only; an unknown is said as unknown, never as zero.
function nightClauses(night) {
  const a = night.archive || {};
  const F = a.facts || {};
  const fe = (night.intake && night.intake.FeedEvent) || {};
  const val = (k) => (F[k] && F[k].value !== undefined ? F[k].value : undefined);
  const out = [];
  // No archive and no feed systems: nothing says what the night held, so nothing is claimed about it. An empty feed list
  // is no evidence either way (a night can mine without a jump), so it is unknown too (codex F5).
  if (!night.archive && !(Array.isArray(fe.Systems) && fe.Systems.length)) return { clauses: ['flew a night whose details never came back'], ended: '', moved: null };

  const seen = new Set();
  const systems = (Array.isArray(val('systems_visited')) ? val('systems_visited') : (Array.isArray(fe.Systems) ? fe.Systems : []))
    .map(placeName).filter((s) => { const k = s.toLowerCase().replace(/\s+/g, ' '); return s && !seen.has(k) && seen.add(k); });
  if (systems.length) out.push('went through ' + listOf(systems));

  const entries = val('entries') || {};
  const missions = Array.isArray(entries.mission) ? entries.mission : [];
  const titleOf = (e) => String((e.data && e.data.title) || '').trim();
  const took = [...new Set(missions.filter((e) => e.event_type === 'mission.accepted').map(titleOf).filter(Boolean))];
  const done = missions.filter((e) => e.event_type === 'mission.completed' && titleOf(e));
  if (took.length) out.push('took the ' + listOf(took) + (took.length > 1 ? ' contracts' : ' contract'));
  for (const e of done) out.push('finished ' + titleOf(e) + (Number(e.data.credits) > 0 ? ' for ' + num(e.data.credits) + ' credits' : ''));

  const cargo = val('cargo') || {};
  const mined = qty(cargo.mined), sold = qty(cargo.sold);
  if (mined) out.push('mined ' + mined);
  if (sold) out.push('sold ' + sold);

  const combat = val('combat_results') || {};
  if (Number(combat.events) > 0) out.push('got into ' + num(combat.events) + (Number(combat.events) === 1 ? ' fight' : ' fights') +
    (Number(combat.kills) || Number(combat.deaths) ? ' (' + num(combat.kills || 0) + ' won, ' + num(combat.deaths || 0) + ' lost)' : ''));
  const mishaps = Array.isArray(val('mishaps')) ? val('mishaps') : [];
  if (mishaps.length) out.push('had ' + (mishaps.length === 1 ? 'a mishap' : num(mishaps.length) + ' mishaps'));

  const pd = F.points_delta;
  const earned = pd && Array.isArray(pd.earned) ? pd.earned.filter((e) => e && e.name) : [];
  if (earned.length) out.push('earned ' + listOf(earned.map((e) => e.name + ' (' + num(e.points) + (Number(e.points) === 1 ? ' point' : ' points') + ')')));
  else if (pd && pd.value === 0) out.push('earned no new points');

  const cd = val('credits_delta') !== undefined ? val('credits_delta') : night.intake && night.intake.CreditsDelta;
  if (cd == null) out.push("the night's credits never settled");
  else if (Number(cd) > 0) out.push('came out ' + num(cd) + ' credits up');
  else if (Number(cd) < 0) out.push('came out ' + num(-cd) + ' credits down');
  else out.push('came out even on credits');

  const counts = val('event_counts') || {};
  const moved = systems.length > 0 || Object.entries(counts).some(([k, n]) => k !== 'session' && Number(n) > 0);
  // A night the ship never moved is said as that; only points the game still awarded ride with it.
  if (!moved) return { clauses: earned.length ? [out.find((c) => c.startsWith('earned '))] : [], ended: 'never got the ship moving', moved };
  const r = a.runner || {};
  const stop = String(r.stopReason || '');
  const ended = (stop === 'pilot-stopped' || a.stall) ? 'stopped flying before the time ran out'
    : (stop === 'window' || r.capped === true || r.capped === 'true') ? "flew until the show's time ran out" : '';
  return { clauses: out, ended, moved };
}

// The pilot's own sign-off for the night: the last windowed log entry that is not a working note, cleaned and capped.
function captainsLog(night) {
  const L = (night.archive && night.archive.captains_log) || {};
  const own = (Array.isArray(L.entries) ? L.entries : []).map((e) => String((e && e.text) || '')).filter((t) => t.trim() && !NOT_QUOTED.some((re) => re.test(t)));
  if (!own.length) return '';
  // a log written with escaped line breaks (backslash-n) reads as one; list dashes and markdown marks drop
  let t = own[own.length - 1].replace(/\\n/g, '\n').replace(/[*`#>]/g, '').replace(/^\s*[-•]\s*/gm, '').replace(/\s+/g, ' ').trim();
  if (t.length > LOG_CAP) t = t.slice(0, LOG_CAP).replace(/\s+\S*$/, '') + '…';
  return t;
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function dayName(night) { return DAY_NAMES[night.day] || 'One'; }

// The page doc for one night. A record of the night (type show), not the citizen's words. Pure.
function pageText(night) {
  const { clauses, ended } = nightClauses(night);
  const body = [clauses.length ? cap(clauses.join('; ')) + '.' : '', ended ? cap(ended) + '.' : ''].filter(Boolean).join(' ');
  const log = captainsLog(night);
  return `UNDOCKED, ${dayName(night)} night, Cycle ${night.cycle}. ${body}${log ? ` Captain's log: "${log}"` : ''}`.trim();
}

// One night for a reporter (pipeline.95, Nia's lane, builder 2026-10-30 "go on nia"): the night as flown, third person,
// the archive's FACT values only. No captain's log — the pilot's words reach a reporter through the interview (her bag).
function nightFact(night, name) {
  const { clauses, ended } = nightClauses(night);
  const all = clauses.concat(ended ? [ended] : []);
  return `${name || night.holder || 'The pilot'}'s ${dayName(night)} night on UNDOCKED: ${all.join('; ')}.`;
}
// The night behind a feed event: the intake row carries the feed's world id (FeedEvent.EpisodeId).
function nightForFeedEvent(nights, feedEpisodeId) {
  const id = String(feedEpisodeId || '');
  return (nights || []).find((n) => n.intake && n.intake.FeedEvent && String(n.intake.FeedEvent.EpisodeId) === id) || null;
}

// One night as the pilot would remember it. Pure.
function nightLine(night) {
  const { clauses, ended } = nightClauses(night);
  const all = clauses.concat(ended ? [ended] : []);
  const log = captainsLog(night);
  return `${dayName(night)} night, you ${all.join('; ')}.${log ? ` Your captain's log that night: "${log}"` : ''}`;
}

function weeksAgo(n) { return n === 0 ? 'This week' : n === 1 ? 'Last week' : n + ' weeks ago'; }
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

// The pilot's show record for a wake or an interview: the latest nights one by one, grouped by week, the rest as one
// line, then the board. '' when they never flew. Pure; the caller fences it (a captain's log is model-written text).
function showBlock(nights, standing, cycle) {
  const mine = (nights || []).filter((n) => Number(n.cycle) <= Number(cycle));
  if (!mine.length) return '';
  const lines = ['You have flown on UNDOCKED, the show the city watches.'];
  const recent = mine.slice(-DETAIL_NIGHTS);
  const older = mine.slice(0, -DETAIL_NIGHTS);
  for (const ago of [...new Set(recent.map((n) => Number(cycle) - n.cycle))].sort((x, y) => x - y)) {
    lines.push(weeksAgo(ago) + ':');
    for (const n of recent.filter((m) => Number(cycle) - m.cycle === ago)) lines.push('- ' + nightLine(n));
  }
  if (older.length) {
    const first = Math.max(...older.map((n) => Number(cycle) - n.cycle));
    lines.push(`Before that you flew ${older.length === 1 ? 'one more night' : num(older.length) + ' more nights'}, the first ` +
      (first === 0 ? 'this week.' : first === 1 ? 'last week.' : first + ' weeks ago.'));
  }
  if (standing && Number(standing.Rank) > 0) {
    const bits = [num(standing.PointsTotal || 0) + (Number(standing.PointsTotal) === 1 ? ' point' : ' points')];
    if (standing.CreditsTotal != null) bits.push(num(standing.CreditsTotal) + ' credits');
    let b = `On the show's board you stand ${ordinal(Number(standing.Rank))} of ${num(standing.of)}, with ${listOf(bits)}`;
    if (Number(standing.CyclesLed) > 0) b += `; you have led the board ${standing.CyclesLed === 1 ? 'one week' : num(standing.CyclesLed) + ' weeks'}` +
      (Number(standing.CurrentStreak) > 1 ? `, ${num(standing.CurrentStreak)} in a row now` : '');
    lines.push(b + '.');
  }
  return lines.join('\n');
}

// The block for one citizen, '' when they never flew. A board that cannot be read leaves the board line out, never the
// nights: the record still reaches them.
function showBlockFor(nights, popId, cycle, opts) {
  const mine = nightsFor(nights, popId);
  if (!mine.length) return '';
  let standing = null;
  try { standing = loadStanding(popId, opts); } catch (e) { if (opts && opts.log) opts.log('show board unreadable, board line left out: ' + e.message); }
  return showBlock(mine, standing, cycle);
}

module.exports = { ON, showBlockFor, nightFact, nightForFeedEvent, dayName, loadNights, nightsFor, loadStanding, nightDay, placeName, nightClauses, captainsLog, pageText, nightLine, showBlock, DETAIL_NIGHTS };
