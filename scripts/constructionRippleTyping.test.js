#!/usr/bin/env node
'use strict';

/**
 * engine.226 — CONSTRUCTION_BOOM fires from a typed source, not a keyword.
 *
 * detectNewRipples_ filed CONSTRUCTION_BOOM (+12 for 10 Cycles) when any world-event text carried
 * `construction` or `development` — the untyped-keyword class engine.222 closed for FACTORY_CLOSURE.
 * Civic vocabulary carries both words ("Economic Development", a permit vote). Live C95–C107: 0 hits
 * in 136 world events, 0 fires on record — latent. Also: the detector concatenated S.citizenEvents,
 * whose lines live in `text` (never read) — texture is colour, not a cause; the concat is gone.
 * Run: node scripts/constructionRippleTyping.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const load = (sb, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
function sandbox() {
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat, parseInt,
    safeRand_: () => () => 0.5, recordRipple_: () => true, hoodNamesWithScene_: () => [], queueCellIntent_: () => {}, queueAppendIntent_: () => {}, PropertiesService: null };
  vm.createContext(sb);
  load(sb, 'phase01-config/advanceSimulationCalendar.js');
  load(sb, 'phase06-analysis/economicRippleEngine.js');
  return sb;
}
function detect(worldEvents, citizenEvents) {
  const sb = sandbox();
  const ctx = { config: { cycleCount: 108, rngSeed: 3, econMoodInertia: 1 }, ss: { getSheetByName: () => null }, writeIntents: [],
    summary: { cycleId: 108, season: 'Spring', simMonth: 4, month: 4, holiday: 'none', sportsSeason: 'off-season',
      neighborhoodState: { SYNTHETIC_TEST_HOOD: { employerCharacter: 'retail', boomIndex: 0 } }, economicRipples: [], economicMood: 50,
      worldEvents: worldEvents || [], citizenEvents: citizenEvents || [] } };
  sb.runEconomicRippleEngine_(ctx);
  return (ctx.summary.economicRipples || []).map(r => r.type);
}
const boom = types => types.indexOf('CONSTRUCTION_BOOM') >= 0;

console.log('engine.226 — construction ripple typing');

// civic vocabulary is not a build
check('CIVIC "Economic Development committee" files nothing', !boom(detect([{ domain: 'CIVIC', subdomain: 'texture', description: 'Economic Development committee adopts a construction permit schedule', severity: 'low', source: 'WORLD_EVENTS_ENGINE' }])));
check('CIVIC "zoning adjustment for a development" files nothing', !boom(detect([{ domain: 'CIVIC', description: 'zoning adjustment for a mixed-use development debated' }])));
check('TRAFFIC "construction detour" files nothing', !boom(detect([{ domain: 'TRAFFIC', description: 'construction detour on Broadway' }])));
check('SAFETY line naming a construction site files nothing', !boom(detect([{ domain: 'SAFETY', description: 'suspicious activity check at a construction site' }])));
// a typed build is
check('BUSINESS "breaks ground on 40 units" files CONSTRUCTION_BOOM', boom(detect([{ domain: 'BUSINESS', description: 'Anchor Build breaks ground on 40 units of new construction in Fruitvale', neighborhood: 'Fruitvale' }])));
check('an event carrying a business id files CONSTRUCTION_BOOM', boom(detect([{ domain: 'COMMUNITY', businessId: 'BIZ-00012', description: 'Coastline Construction expands its Rockridge development' }])));
check('COMMUNITY untyped line with a build noun files CONSTRUCTION_BOOM', boom(detect([{ domain: 'COMMUNITY', description: 'cranes over the Baylight site as construction resumes' }])));
check('COMMUNITY line without a build noun files nothing', !boom(detect([{ domain: 'COMMUNITY', description: 'neighborhood development meeting draws a crowd' }])));
check('untyped "new development downtown" files nothing', !boom(detect([{ description: 'new development downtown' }])));
check('untyped "contractor breaks ground on a downtown construction tower" files CONSTRUCTION_BOOM', boom(detect([{ description: 'contractor breaks ground on a downtown construction tower' }])));
// the ripple itself is unchanged
{
  const sb = sandbox();
  const ctx = { config: { cycleCount: 108, rngSeed: 3, econMoodInertia: 1 }, ss: { getSheetByName: () => null }, writeIntents: [],
    summary: { cycleId: 108, season: 'Spring', simMonth: 4, month: 4, holiday: 'none', sportsSeason: 'off-season', neighborhoodState: {}, economicRipples: [], economicMood: 50,
      worldEvents: [{ domain: 'BUSINESS', description: 'Anchor Build breaks ground on 40 units of new construction in Fruitvale', neighborhood: 'Fruitvale' }] } };
  sb.runEconomicRippleEngine_(ctx);
  const r = (ctx.summary.economicRipples || []).find(x => x.type === 'CONSTRUCTION_BOOM');
  check('CONSTRUCTION_BOOM keeps +12 × 10 Cycles', r && r.impact === 12 && r.endCycle - r.startCycle === 10, JSON.stringify(r));
}
// texture is not a cause
check('a citizen texture line ("noticed cranes over the block") files nothing', !boom(detect([], [{ popId: 'POP-00001', text: 'noticed cranes over the block as construction resumed', tag: 'texture', neighborhood: 'Downtown' }])));
check('a citizen line with `description` (never the citizen shape, but the old concat would have read it) files nothing', !boom(detect([], [{ description: 'construction crew broke ground', domain: 'BUSINESS' }])));
check('source: the detector no longer concatenates citizenEvents', !/worldEvents\.concat\(citizenEvents\)/.test(fs.readFileSync(path.join(ROOT, 'phase06-analysis/economicRippleEngine.js'), 'utf8')));
// the engine.222 closure typing still holds beside it
check('engine.222: CIVIC "road closure decision" still files no FACTORY_CLOSURE', detect([{ domain: 'CIVIC', description: 'road closure decision' }]).indexOf('FACTORY_CLOSURE') < 0);

// engine.240 (2026-09-19): a ripple lands where its event happened — its hood + that hood's canon
// neighbours — or citywide when the engine never said where; the per-trigger real-Oakland hood lists
// (FACTORY_CLOSURE → West Oakland …) are gone.
{
  const sb = sandbox();
  const S = { economicRipples: [], neighborhoodAdjacency: { Dimond: ['Laurel', 'Glenview'] } };
  const r = sb.createRipple_(S, 'FACTORY_CLOSURE', 108, { description: 'x' }, 'Dimond', {});
  check('engine.240: a Dimond closure lands on Dimond (primary) + its canon neighbours, not West Oakland',
    r && r.primaryNeighborhood === 'Dimond' && JSON.stringify(r.neighborhoods) === JSON.stringify(['Dimond', 'Laurel', 'Glenview']));
  const c = sb.createRipple_(S, 'CRIME_SPIKE', 108, { description: 'y' }, '', {});
  check('engine.240: a hoodless ripple is citywide with no invented primary', c && c.primaryNeighborhood === '' && c.neighborhoods[0] === 'all');
  const w = sb.createRipple_(S, 'NATURAL_DISASTER', 108, { description: 'z' }, 'all', {});
  check('engine.240: "all" is citywide, not a hood named all', w && w.primaryNeighborhood === '' && w.neighborhoods[0] === 'all');
  const src = fs.readFileSync(path.join(ROOT, 'phase06-analysis/economicRippleEngine.js'), 'utf8');
  const trig = src.slice(src.indexOf('var ECONOMIC_TRIGGERS = {'), src.indexOf('};', src.indexOf('var ECONOMIC_TRIGGERS = {')));
  check('engine.240: no trigger carries a hood list; HOLIDAY_ECONOMIC_ZONES is gone',
    !/neighborhoods:/.test(trig) && !/var HOLIDAY_ECONOMIC_ZONES/.test(src));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
