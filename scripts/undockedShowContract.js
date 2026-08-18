'use strict';

/**
 * UNDOCKED played-event contract — second feed type (sports is instance 1).
 * Plan 2.2: docs/plans/2026-08-07-spacemolt-game-show.md
 * Research: docs/research/2026-08-03-game-environment-review.md — one new type, not a framework.
 * Fourth-wall: feed rows never name the client, MCP, or a video game.
 */

const V = 'UNDOCKED-FEED/1';
const EVENT_TYPE = 'undocked-episode';
const FEED_HEADERS = Object.freeze([
  'Cycle', 'EventType', 'POPID', 'Holder', 'EpisodeId',
  'CreditsDelta', 'Systems', 'CombatEvents', 'MishapCount',
  'Magnitude', 'Flags', 'StagedPath',
]);

const FOURTH_WALL = /videogame|video game|commander|get_action_log|mcp__|openrouter|tool_error|spacemolt-lib/i;
const REAL_WORLD_DATE = /\d{4}-\d{2}-\d{2}/;

// Y<n>C<m> conversion, matching docs/EDITION_PIPELINE.md: n = floor((cycle-1)/52)+1,
// m = ((cycle-1)%52)+1 -- e.g. cycle 92 = Y2C40, cycle 104 = Y2C52.
function yearCycle_(cycle) {
  const c = Number(cycle);
  const n = Math.floor((c - 1) / 52) + 1;
  const m = ((c - 1) % 52) + 1;
  return 'Y' + n + 'C' + m;
}

// The episode's on-disk id is minted from a real-world ISO timestamp
// (undockedEpisode.js) -- fine for a build-artifact filename, but the feed
// row this produces is world-facing (Undocked_Feed tab, citizen LifeHistory).
// Same FOURTH_WALL boundary as StagedPath below: reforge the id from
// POPID + the sim calendar right here, at the one place apparatus becomes
// canon. Every internal file-path lookup (intake/staged/archive) keeps using
// staged.episode_id untouched -- only the projected feed row gets this one.
// seq: per-pilot-per-cycle flight number (daily cadence, §2.5 — a pilot can
// fly the same cycle more than once). 1 or absent keeps the bare id so every
// already-pushed row and LifeHistory line stays stable; 2+ appends -e{k}.
function worldFacingEpisodeId_(staged, cycle, seq) {
  const pop = String(staged.popid || '').toLowerCase().replace(/-/g, '');
  const base = 'undocked-' + pop + '-' + yearCycle_(cycle);
  const k = Number(seq) || 1;
  return k > 1 ? base + '-e' + k : base;
}

function factValue(block, fallback) {
  if (block && Object.prototype.hasOwnProperty.call(block, 'value')) return block.value;
  return fallback;
}

function openEscrow(staged) {
  const basis = (staged.facts && staged.facts.credits_delta && staged.facts.credits_delta.basis) || [];
  let opened = 0;
  let cancelled = 0;
  basis.forEach(function (b) {
    if (b.event_type === 'trading.buy_order_created') opened++;
    if (b.event_type === 'trading.order_cancelled') cancelled++;
  });
  return opened > cancelled;
}

function magnitude(staged) {
  const credits = factValue(staged.facts.credits_delta, null);
  const combat = factValue(staged.facts.combat_results, { events: 0 }) || { events: 0 };
  const mishaps = factValue(staged.facts.mishaps, []) || [];
  const mined = (factValue(staged.facts.cargo, {}) || {}).mined || {};
  const quotes = (staged.captains_log && staged.captains_log.windowed) || 0;
  let m = 1;
  if (credits != null && Math.abs(Number(credits)) >= 50) m++;
  if (combat.events) m++;
  if (mishaps.length) m++;
  if (quotes) m++;
  if (Object.keys(mined).length >= 3) m++;
  return Math.min(5, m);
}

function projectFeed(staged, cycle, stagedPath, seq) {
  const flags = [];
  if (openEscrow(staged)) flags.push('open_escrow');
  flags.push('credits_delta_windowed');
  const combat = factValue(staged.facts.combat_results, { events: 0 }) || { events: 0 };
  const mishaps = factValue(staged.facts.mishaps, []) || [];
  const systems = factValue(staged.facts.systems_visited, []) || [];
  return {
    v: V,
    Cycle: Number(cycle),
    EventType: EVENT_TYPE,
    POPID: staged.popid,
    Holder: staged.holder || '',
    EpisodeId: worldFacingEpisodeId_(staged, cycle, seq),
    CreditsDelta: factValue(staged.facts.credits_delta, null),
    Systems: systems.slice(),
    CombatEvents: Number(combat.events) || 0,
    MishapCount: mishaps.length,
    Magnitude: magnitude(staged),
    Flags: flags,
    StagedPath: stagedPath || '',
  };
}

function validateFeed(row) {
  const errors = [];
  if (!row || row.v !== V) errors.push('v must be ' + V);
  if (row.EventType !== EVENT_TYPE) errors.push('EventType must be ' + EVENT_TYPE);
  if (!/^POP-\d{5}$/.test(row.POPID || '')) errors.push('POPID required');
  if (!row.EpisodeId) errors.push('EpisodeId required');
  if (REAL_WORLD_DATE.test(row.EpisodeId || '')) errors.push('EpisodeId carries a real-world date — sim canon must use Y<n>C<m>');
  if (!Number.isFinite(Number(row.Cycle)) || Number(row.Cycle) < 1) errors.push('Cycle required');
  if (row.VideoGameDate || row.VideoGame) errors.push('VideoGameDate and VideoGame must be blank');
  const blob = JSON.stringify(row);
  if (FOURTH_WALL.test(blob)) errors.push('fourth-wall leak in feed row');
  if (row.captains_log || row.quote) errors.push('captains_log must not ride the feed row');
  return { valid: errors.length === 0, errors: errors };
}

module.exports = {
  V, EVENT_TYPE, FEED_HEADERS, FOURTH_WALL,
  openEscrow, magnitude, projectFeed, validateFeed,
};
