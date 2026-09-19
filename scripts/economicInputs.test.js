#!/usr/bin/env node
'use strict';

/**
 * engine.222 — the economy's inputs are keyed to what the calendar and the events actually write.
 *
 * Offline proof, no Sheet. The real Phase-1 calendar, the real Phase-6 economy and the real
 * Phase-7 media feedback run in a vm sandbox. Every event and number below is a synthetic fixture.
 * Run: node scripts/economicInputs.test.js
 *
 * Three dead inputs, measured 2026-09-14:
 *   month    — the calendar writes S.simMonth; economy, media feedback, generational events and the
 *              World_Events record read S.month, which nothing wrote. Every month-gated branch was dead.
 *   season   — the calendar writes 'Winter'; economy and media compare against 'winter'/'summer'.
 *              SUMMER_TOURISM, WINTER_DOLDRUMS, the +1 summer mood and all four media seasonal moods
 *              had never fired.
 *   closure  — detectNewRipples_ files ANY 'closure' as FACTORY_CLOSURE (−20 for 12 Cycles); the bench
 *              C108 ripple came from the CIVIC texture line "road closure decision".
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
  load(sb, 'phase06-analysis/applyShockMonitor.js');
  load(sb, 'phase07-evening-media/mediaFeedbackEngine.js');
  return sb;
}
function econCtx(summary) {
  return { config: { cycleCount: summary.cycleId, rngSeed: 3, econMoodInertia: 1 }, ss: { getSheetByName: () => null }, writeIntents: [],
    summary: Object.assign({ neighborhoodState: { SYNTHETIC_TEST_HOOD: { employerCharacter: 'retail', boomIndex: 0 } }, economicRipples: [], economicMood: 50 }, summary) };
}
function rippleTypes(S) { return (S.economicRipples || []).map(r => r.type); }

console.log('engine.222 — economy inputs');

// ── month: the calendar writes the name the readers use ──────────────────────
{
  const sb = sandbox();
  // The calendar's own cycle→month math is the engine's; assert the alias, not a month value.
  const ctx = { config: { cycleCount: 108 }, summary: { cycleId: 108 }, ss: { getSheetByName: name => name === 'Simulation_Calendar' ? {} : null } };
  sb.advanceSimulationCalendar_(ctx);
  const S = ctx.summary;
  check('month: calendar writes S.simMonth (' + S.simMonth + ')', typeof S.simMonth === 'number' && S.simMonth >= 1 && S.simMonth <= 12);
  check('month: S.month carries the same value', S.month === S.simMonth, 'S.month=' + S.month);
  check('month: season stays capitalized for the persisted record (' + S.season + ')', /^[A-Z][a-z]+$/.test(String(S.season)));
}

// ── season + month inside the economy (Phase 6) ──────────────────────────────
{
  // January, no holiday, Winter: WINTER_DOLDRUMS (−4 × 6) fires and the January −2 lands on the level.
  const sb = sandbox();
  const ctx = econCtx({ cycleId: 108, season: 'Winter', simMonth: 1, month: 1, holiday: 'none', sportsSeason: 'off-season' });
  sb.runEconomicRippleEngine_(ctx);
  const S = ctx.summary;
  check('economy: WINTER_DOLDRUMS fires in a January no-holiday Winter Cycle', rippleTypes(S).indexOf('WINTER_DOLDRUMS') >= 0, 'types=' + rippleTypes(S).join(','));
  // level = 50 + (−4 × 0.1) + 0.5 (drift toward 50 from below) − 2 (January) = 48.1
  check('economy: the January −2 lands on the level (48.1)', Math.abs(S.economicMoodLevel - 48.1) < 0.011, 'level=' + S.economicMoodLevel);
  check('economy: the persisted ripple keeps the calendar\'s capitalized season', S.economicRipples.every(r => r.season === 'Winter'), JSON.stringify(S.economicRipples.map(r => r.season)));

  // July, Summer: SUMMER_TOURISM (+7 × 8) and the +1 summer mood.
  const sb2 = sandbox();
  const ctx2 = econCtx({ cycleId: 130, season: 'Summer', simMonth: 7, month: 7, holiday: 'none', sportsSeason: 'off-season' });
  sb2.runEconomicRippleEngine_(ctx2);
  const S2 = ctx2.summary;
  check('economy: SUMMER_TOURISM fires in a July Summer Cycle', rippleTypes(S2).indexOf('SUMMER_TOURISM') >= 0, 'types=' + rippleTypes(S2).join(','));
  // level = 50 + 0.7 − 0.5 (drift from above) + 1 (summer) = 51.2
  check('economy: the summer +1 lands on the level (51.2)', Math.abs(S2.economicMoodLevel - 51.2) < 0.011, 'level=' + S2.economicMoodLevel);

  // Control: a Spring Cycle in April draws neither.
  const sb3 = sandbox();
  const ctx3 = econCtx({ cycleId: 115, season: 'Spring', simMonth: 4, month: 4, holiday: 'none', sportsSeason: 'off-season' });
  sb3.runEconomicRippleEngine_(ctx3);
  check('economy: control — April Spring draws no seasonal ripple', rippleTypes(ctx3.summary).length === 0, 'types=' + rippleTypes(ctx3.summary).join(','));
}

// ── closure classification (detectNewRipples_) ───────────────────────────────
{
  function detect(events) {
    const sb = sandbox();
    const ctx = econCtx({ cycleId: 108, season: 'Spring', simMonth: 4, month: 4, holiday: 'none', sportsSeason: 'off-season', worldEvents: events });
    sb.runEconomicRippleEngine_(ctx);
    return rippleTypes(ctx.summary);
  }
  const civicRoad = detect([{ cycle: 108, domain: 'CIVIC', subdomain: 'texture', description: 'road closure decision', severity: 'low', source: 'WORLD_EVENTS_ENGINE' }]);
  check('closure: a CIVIC "road closure decision" is not a factory closure', civicRoad.indexOf('FACTORY_CLOSURE') < 0, 'types=' + civicRoad.join(','));
  check('closure: …and files no economic ripple at all', civicRoad.length === 0, 'types=' + civicRoad.join(','));
  const civicShut = detect([{ domain: 'CIVIC', description: 'committee shut down the public-comment session early' }]);
  check('closure: a CIVIC "shut down" with no business in it is not a factory closure', civicShut.indexOf('FACTORY_CLOSURE') < 0, 'types=' + civicShut.join(','));
  const bizClosure = detect([{ domain: 'BUSINESS', description: 'factory closure announced on the waterfront' }]);
  check('closure: control — a BUSINESS factory closure still files FACTORY_CLOSURE', bizClosure.indexOf('FACTORY_CLOSURE') >= 0, 'types=' + bizClosure.join(','));
  const bizShut = detect([{ domain: 'BUSINESS', description: 'neighborhood restaurant shut down after thirty years' }]);
  check('closure: control — a BUSINESS shut-down still files FACTORY_CLOSURE', bizShut.indexOf('FACTORY_CLOSURE') >= 0, 'types=' + bizShut.join(','));
  const untypedPlant = detect([{ description: 'plant closure leaves 40 without work' }]);
  check('closure: control — an untyped event with a business noun still files FACTORY_CLOSURE', untypedPlant.indexOf('FACTORY_CLOSURE') >= 0, 'types=' + untypedPlant.join(','));
  const layoffs = detect([{ domain: 'BUSINESS', description: 'layoffs at a downtown firm' }]);
  check('closure: control — layoffs still file MAJOR_LAYOFFS', layoffs.indexOf('MAJOR_LAYOFFS') >= 0, 'types=' + layoffs.join(','));
}

// ── season + month inside media feedback (Phase 7) ───────────────────────────
{
  function media(summary) {
    const sb = sandbox();
    const ctx = { config: { cycleCount: summary.cycleId }, summary: Object.assign({ worldEvents: [], citizenEvents: [], eventArcs: [], neighborhoodState: {} }, summary), ss: { getSheetByName: () => null }, writeIntents: [] };
    let err = null;
    try { sb.runMediaFeedbackEngine_(ctx); } catch (e) { err = e.message; }
    return { effects: ctx.summary.mediaEffects || {}, cal: ctx.mediaCalendarContext || {}, err };
  }
  const jan = media({ cycleId: 108, season: 'Winter', simMonth: 1, month: 1, holiday: 'none' });
  check('media: runs on the fixture' + (jan.err ? ' (threw: ' + jan.err + ')' : ''), !jan.err);
  check('media: a January no-holiday Winter Cycle reads winter_doldrums', jan.effects.seasonalMood === 'winter_doldrums', 'seasonalMood=' + jan.effects.seasonalMood);
  check('media: the calendar context month is 1', jan.cal.month === 1, 'month=' + jan.cal.month);
  const dec = media({ cycleId: 100, season: 'Winter', simMonth: 12, month: 12, holiday: 'none' });
  check('media: December reads winter_cozy (year-end month lands)', dec.effects.seasonalMood === 'winter_cozy', 'seasonalMood=' + dec.effects.seasonalMood);
  const jul = media({ cycleId: 130, season: 'Summer', simMonth: 7, month: 7, holiday: 'none' });
  check('media: a Summer Cycle reads summer_optimism', jul.effects.seasonalMood === 'summer_optimism', 'seasonalMood=' + jul.effects.seasonalMood);
}

console.log(passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
