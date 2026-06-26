/**
 * provocationBank.js — T5 varied-provocation question bank (research.19, S273)
 *
 * The citizen-wake user-prompt stops being one fixed question and becomes a
 * deterministically-seeded pick from a bank of provocation-types, each latching
 * onto a REAL engine signal the citizen already perceives. The user-prompt twin
 * of T2/T1a/T1c's system-prompt enrichment: those vary the *answerer*, this
 * varies the *question*. Fixes vector-2 — the single shared task that channels
 * every citizen into the same MODE of thought even when their inputs differ.
 *
 * Discipline (same as all perception): input-side, deterministically seeded,
 * frozen per wake. Two citizens woken the same cycle get different provocations;
 * the same citizen gets a different one next cycle / daypart.
 *
 * Signal-gated: a type only enters the selection pool if its required signal is
 * actually present for this citizen (needs()). So provocations render real
 * values, never placeholders. A handful of always-available types (disposition,
 * leisure, likes) guarantee the pool is never empty.
 *
 * Honest gap (carry from S273 design): "likes/dislikes" + per-citizen media
 * attribution imply preferences/attribution the engine does NOT model (media +
 * events are city-wide, not tagged to a person). Those types infer LIGHT from
 * dials / occupation / neighborhood — they never fake "a show *they* watched".
 * A real preference signal is a future engine add, not built here.
 *
 * route = coverage-routing metadata (Mike, S273): the target /sift-category or
 * Story_Seed_Deck shape the classified response should land in, so the harvest
 * lands where coverage needs it. Metadata now; the active-targeting bias is a
 * research.21 follow-up.
 */

// Deterministic string hash (cyrb53). No Math.random — perception is seeded.
function hash53_(str, seed) {
  var h1 = 0xdeadbeef ^ (seed >>> 0), h2 = 0x41c6ce57 ^ (seed >>> 0);
  for (var i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0));
}

function trim_(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/[\s,.;:]+\S*$/, '') + '…';
}
function has_(s) { return !!String(s || '').trim(); }
function firstName_(s) { return String(s || '').trim().split(/\s+/)[0] || ''; }

// signals = { citizen:{name,occ,nh,age,disp}, neighbors:[{name,occupation}],
//             sportsLine, lifeArc, textureLine, bondsLine, traj }
// Each type: { id, route, dayparts?(restrict), needs(sig)->bool, fill(sig)->string }
// Provocations are SHORT latches, not essays — they point the citizen AT a signal
// that is already rendered in the system prompt; they don't re-paste it.
var BANK = [
  // ── Self: LifeHistory milestone / dial state ──────────────────────────────
  { id: 'self_milestone', route: 'self',
    needs: function (s) { return has_(s.lifeArc); },
    fill: function (s) { return 'Something from further back in your life — ' + trim_(s.lifeArc, 90) + ' — has been sitting with you. Why now?'; } },
  { id: 'self_disposition', route: 'self',
    needs: function () { return true; },
    fill: function (s) { return "You've been carrying a " + (s.citizen.disp || 'particular') + ' mood lately. What\'s underneath it, if you\'re honest with yourself?'; } },
  { id: 'self_trajectory', route: 'self',
    needs: function (s) { return has_(s.traj); },
    fill: function (s) { return 'Lately you\'ve been ' + s.traj + '. Sit with that — what\'s shifting in you?'; } },

  // ── Block / world: T2 neighborhood texture ────────────────────────────────
  { id: 'block_texture', route: 'community',
    needs: function (s) { return has_(s.textureLine); },
    fill: function (s) { return 'Think about your own block in ' + s.citizen.nh + ' this week — what you\'ve actually seen and heard. What did you make of it?'; } },
  { id: 'block_notice', route: 'community', dayparts: ['morning', 'midday', 'afternoon'],
    needs: function () { return true; },
    fill: function (s) { return 'What\'s the one small thing you noticed around ' + s.citizen.nh + ' today that no one else would think twice about?'; } },

  // ── City / sports: A's feed (T1b) ─────────────────────────────────────────
  { id: 'city_sports', route: 'sports',
    needs: function (s) { return has_(s.sportsLine); },
    fill: function (s) { return trim_(s.sportsLine, 110) + ' — what\'s your take on it, as someone who actually lives here?'; } },

  // ── Media / leisure: infer-light (no per-citizen attribution) ─────────────
  { id: 'leisure_spot', route: 'culture',
    needs: function () { return true; },
    fill: function (s) { return 'After a day as a ' + (s.citizen.occ || 'resident') + ', where in ' + s.citizen.nh + ' do you go to feel like yourself? Go there in your mind for a minute.'; } },
  { id: 'leisure_night', route: 'culture', dayparts: ['evening', 'night'],
    needs: function () { return true; },
    fill: function (s) { return s.citizen.nh + ' after dark — what does the city sound and feel like to you right now?'; } },

  // ── People: co-residents / relationship bonds ─────────────────────────────
  { id: 'people_neighbor', route: 'community',
    needs: function (s) { return s.neighbors && s.neighbors.length > 0; },
    fill: function (s) { return firstName_(s.neighbors[0].name) + ' crossed your mind today. What\'s the truth of how things are between you two?'; } },
  { id: 'people_bond', route: 'community',
    needs: function (s) { return has_(s.bondsLine); },
    fill: function (s) { return 'Someone you go back with — ' + trim_(s.bondsLine, 80) + '. Where do you two actually stand now?'; } },

  // ── Likes / dislikes: infer-light ─────────────────────────────────────────
  { id: 'likes_delight', route: 'culture',
    needs: function () { return true; },
    fill: function () { return 'Something small delighted or annoyed you today. Find the small thing and sit with it — what was it, really?'; } },
  { id: 'likes_irritation', route: 'self',
    needs: function () { return true; },
    fill: function () { return "Some small thing's been grating on you. Name it honestly — does it actually matter, or are you just worn down?"; } },

  // ── Daypart-specific framing ──────────────────────────────────────────────
  { id: 'morning_ahead', route: 'self', dayparts: ['morning'],
    needs: function () { return true; },
    fill: function () { return 'The day is still ahead of you. What\'s the one thing you\'re quietly hoping for — or quietly dreading?'; } },
  { id: 'night_behind', route: 'self', dayparts: ['night', 'evening'],
    needs: function () { return true; },
    fill: function () { return 'The day is behind you now. What stays with you from it, when the noise dies down?'; } }
];

/**
 * selectProvocation — deterministic per (popId, cycle, daypart).
 * Returns { id, route, text }. Pool = types valid for this daypart AND whose
 * required signal is present. Always non-empty (always-available types exist).
 */
function selectProvocation(popId, cycle, daypart, signals) {
  var dp = String(daypart || 'evening').toLowerCase();
  var sig = signals || {};
  sig.citizen = sig.citizen || {};
  var pool = BANK.filter(function (t) {
    if (t.dayparts && t.dayparts.indexOf(dp) < 0) return false;
    try { return t.needs(sig); } catch (e) { return false; }
  });
  if (!pool.length) pool = BANK.filter(function (t) { return t.id === 'likes_delight'; }); // guaranteed floor
  var key = String(popId || '') + '|' + String(cycle || 0) + '|' + dp;
  var idx = hash53_(key, 0x5eed) % pool.length;
  var t = pool[idx];
  var text;
  try { text = t.fill(sig); } catch (e) { text = 'Take a quiet minute. What\'s actually on your mind right now?'; }
  return { id: t.id, route: t.route, text: text };
}

module.exports = { selectProvocation: selectProvocation, BANK: BANK, _hash53: hash53_ };
