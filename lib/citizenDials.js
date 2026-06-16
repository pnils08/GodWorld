/* citizenDials — read a citizen's engine.31 DialState into a current vector + a plain-language
 * disposition phrase (citizen-loop perception, engine-sheet S262).
 *
 * Extracted from the validated S261 voice probes (_probe_voice_grounded / _probe_voice_openrouter)
 * where "different dials -> different voice" passed N=4 grounded. Read-only: parses the col-AV
 * DialState JSON ({base, mood, streak} per dial) into the current 0-100 value (base+mood, clamped).
 *
 * This is PERCEPTION input (wake-side). It does not write or mutate dial state — that is the
 * deterministic cycle's job (engine.31/.32). No engine import; pure function over the JSON.
 */

const DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout'];

// band index for a 0-100 dial value: 0=low pole .. 3=high pole, -1 = neutral middle (unremarkable).
// Mirrors the probe + citizenMemory bands (the neutral 40-60 middle reads as "no trait stated").
function bandIdx(v) {
  return v < 20 ? 0 : v < 40 ? 1 : v < 60 ? -1 : v < 80 ? 2 : 3;
}

// plain-language pole phrase per band — the lived descriptor a voice model reads (never the number).
const POLES = {
  drive: ['drifting, no urgency', 'easygoing, unhurried', 'driven, hard to sit still', "relentless, can't stop working"],
  sociability: ['a loner, keeps to themselves', 'private, few close ties', 'draws people in, deep with them', 'magnetic, center of every room'],
  warmth: ['cold, hard to reach', 'reserved, guarded', 'warm, tender with people', 'openly affectionate, big-hearted'],
  openness: ['rigid, set in their ways', 'prefers the familiar', 'curious, open to new things', 'restless for the new, adventurous'],
  composure: ['volatile, feels everything hard', 'quick to rattle', 'steady, hard to shake', 'unshakable, calm under anything'],
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

module.exports = { DIALS, POLES, bandIdx, currentDials, disposition, deviation, l1 };
