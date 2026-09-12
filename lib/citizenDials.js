/* citizenDials — read a citizen's engine.31 DialState into a current vector + a plain-language
 * disposition phrase (citizen-loop perception, engine-sheet S262).
 *
 * Extracted from the validated S261 voice probes (_probe_voice_grounded / _probe_voice_openrouter)
 * where "different dials -> different voice" passed N=4 grounded. Read-only: parses the col-AV
 * DialState JSON ({base, mood, streak} per dial) into the current 0-100 value (base+mood, clamped).
 *
 * This is PERCEPTION input (wake-side). It does not write or mutate dial state — that is the
 * deterministic cycle's job (engine.31/.32). Shares the pure citizenMemory dial list; no I/O.
 */

const { DIALS } = require('../utilities/citizenMemory.js');

// band index for a 0-100 dial value: 0=low pole .. 3=high pole, -1 = neutral middle (unremarkable).
// Mirrors the probe + citizenMemory bands (the neutral 40-60 middle reads as "no trait stated").
function bandIdx(v) {
  return v < 20 ? 0 : v < 40 ? 1 : v < 60 ? -1 : v < 80 ? 2 : 3;
}

// plain-language pole phrase per band — the lived descriptor a voice model reads (never the number).
const POLES = {
  drive: ['drifting, no urgency', 'easygoing, unhurried', 'driven, hard to sit still', "can't switch off, working themselves thin"], // engine.182: the top band reads as a cost
  sociability: ['a loner, keeps to themselves', 'private, few close ties', 'draws people in, deep with them', 'magnetic, center of every room'],
  warmth: ['cold, hard to reach', 'reserved, guarded', 'warm, tender with people', 'openly affectionate, big-hearted'],
  openness: ['rigid, set in their ways', 'prefers the familiar', 'curious, open to new things', 'restless for the new, adventurous'],
  composure: ['frayed, feels everything hard and sleeps badly', 'quick to rattle', 'steady, hard to shake', 'unshakable, calm under anything'], // engine.182
  integrity: ['willing to cut any corner', 'bends rules when it suits', 'principled, plays it straight', 'incorruptible, rigid about right'],
  family: ['unattached, family distant', "keeps family at arm's length", 'close to family', 'devoted, family is everything'],
  outabout: ['a homebody, rarely out', 'stays in mostly', 'often out in the neighborhood', 'always out, never home'],
};

// currentDials(dialStateJson) -> { dial: 0..100 } | null
//   base + mood, clamped. Missing dial -> 50 (neutral). null on unparseable JSON.
function currentDials(json) {
  let c;
  try { c = JSON.parse(json); } catch (e) { return null; }
  if (!c || typeof c !== 'object') return null;
  const cur = {};
  for (const d of DIALS) {
    const base = (c.base && c.base[d] != null) ? c.base[d] : 50;
    const mood = (c.mood && c.mood[d]) || 0;
    cur[d] = Math.max(0, Math.min(100, base + mood));
  }
  return cur;
}

// disposition(cur) -> "driven, hard to sit still; warm, tender with people; ..." (neutral dials omitted).
function disposition(cur) {
  if (!cur) return 'even-keeled, unremarkable';
  const phrases = [];
  for (const d of DIALS) {
    const b = bandIdx(cur[d]);
    if (b >= 0) phrases.push(POLES[d][b]);
  }
  return phrases.length ? phrases.join('; ') : 'even-keeled, unremarkable';
}

// deviation(cur) -> total distance from the neutral 50 across all dials. Higher = more strongly shaped.
function deviation(cur) {
  if (!cur) return 0;
  return DIALS.reduce((s, d) => s + Math.abs(cur[d] - 50), 0);
}

// l1(a, b) -> dial-space distance between two citizens (selection spread).
function l1(a, b) {
  return DIALS.reduce((s, d) => s + Math.abs((a[d] || 0) - (b[d] || 0)), 0);
}

// ---------------------------------------------------------------------------
// engine.180 (S438, research.28 Cut E) — the cron reads the GAME, never a number.
// stance(json)            -> { posture, goal, since } off DialState.maneuver, or null
// thrown(lifeHistory)     -> plain words for what the last stretch of cycles threw at the
//                            citizen (pressure tags, setbacks, the named good and bad
//                            events); ambient tints are omitted; '' when nothing notable.
// postureChangedCycle(lh) -> the sim cycle of the newest [Maneuver-*] line, or null.
// ---------------------------------------------------------------------------
const TAG_WORDS = {
  friction: 'a hard squeeze on the money', strain: 'the same strain again', stumble: 'a stretch without work',
  setback: 'a real setback', 'career-layoff': 'a layoff', divorce: 'a divorce', critical: 'a health scare',
  hospitalized: 'a hospital stay', health: 'a health worry', rivalry: 'a rival', transgression: 'a line you crossed',
  promotion: 'a promotion', wedding: 'a wedding', birth: 'a birth', graduation: 'a graduation',
  recovery: 'getting your feet back', resisted: 'a temptation you turned down', casino: 'a night at the window',
  'maneuver-climb': 'a decision to push', 'maneuver-retreat': 'a decision to pull in', money: 'a money week that mattered',
  'career-fieldchange': 'a change of field', relocation: 'a move', heritage: 'the family name in play',
};
const THROWN_LOOKBACK = 2; // cycles back from the newest stamped line in the tail

function absCycleOf(line) {
  const m = String(line || '').match(/^(?:Y(\d+))?C(\d+)\s*[—-]/);
  if (!m) return null;
  let c = parseInt(m[2], 10);
  if (m[1]) c = (parseInt(m[1], 10) - 1) * 52 + c;
  return c;
}

function stance(json) {
  let o; try { o = JSON.parse(json); } catch (e) { return null; }
  const m = o && o.maneuver;
  if (!m || typeof m !== 'object' || !m.p) return null;
  return { posture: String(m.p), goal: String(m.g || ''), since: Number(m.c) || null };
}

function thrown(lifeHistory, lookback) {
  const lines = String(lifeHistory || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let newest = 0;
  for (const l of lines) { const c = absCycleOf(l); if (c && c > newest) newest = c; }
  if (!newest) return '';
  const floor = newest - (lookback == null ? THROWN_LOOKBACK : lookback) + 1;
  const seen = new Set(); const words = [];
  for (const l of lines) {
    const c = absCycleOf(l); if (!c || c < floor) continue;
    const m = l.match(/\[([^\]]+)\]/); if (!m) continue;
    const tag = m[1].split(':')[0].trim().toLowerCase();
    const key = TAG_WORDS[tag] ? tag : (tag.startsWith('transgression') ? 'transgression' : null);
    if (!key || seen.has(key)) continue;
    seen.add(key); words.push(TAG_WORDS[key]);
    if (words.length >= 4) break;
  }
  return words.join(', ');
}

function postureChangedCycle(lifeHistory) {
  const lines = String(lifeHistory || '').split('\n');
  let best = null;
  for (const l of lines) {
    if (!/\[Maneuver-(Climb|Retreat|Hold)\]/.test(l)) continue;
    const c = absCycleOf(l); if (c && (best === null || c > best)) best = c;
  }
  return best;
}

module.exports = { DIALS, POLES, bandIdx, currentDials, disposition, deviation, l1, stance, thrown, postureChangedCycle, absCycleOf, TAG_WORDS };
