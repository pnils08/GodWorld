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

function projectFeed(staged, cycle, stagedPath) {
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
    EpisodeId: staged.episode_id,
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
