/**
 * engine.38 B2+B3 — population-relative analysis thresholds.
 * Proves the OLD absolute thresholds (~52-event world) mislabeled the ~600-event
 * world (perma micro-wave + guaranteed first-cycle false shock), and the relative
 * versions: (a) don't false-fire at steady high volume, (b) suppress the deploy
 * regime-shift cycle, (c) still catch genuine deviations.
 * Run: node scripts/patternShockRelative.test.js
 */
const fs = require('fs');
const path = require('path');
global.Logger = { log() {} };

const loadFn = (rel, name) => {
  const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  return new Function(src + '\nreturn ' + name + ';')();
};
const applyPatternDetection_ = loadFn('../phase06-analysis/applyPatternDetection.js', 'applyPatternDetection_');
const applyShockMonitor_ = loadFn('../phase06-analysis/applyShockMonitor.js', 'applyShockMonitor_');

let pass = 0, fail = 0;
const ok = (l, c, d) => c ? (console.log('  ok   ' + l), pass++) : (console.error('  FAIL ' + l + (d ? ': ' + d : '')), fail++);

// ── Riley_Digest stub: rows are 28-col arrays, EventsGenerated at idx 4 ──
function digestSheet(eventsPerCycle) {
  const rows = eventsPerCycle.map(ev => {
    const r = new Array(28).fill('');
    r[4] = ev;        // E EventsGenerated
    r[5] = '';        // F issues
    r[8] = 'stable';  // I civic
    r[9] = 0;         // J drift
    r[10] = '';       // K pattern
    r[11] = '';       // L shock
    r[12] = 0;        // M seeds
    r[27] = 0;        // AB sentiment
    return r;
  });
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => 28,
    getRange: (r) => ({ getValues: () => [rows[r - 1]] }),
  };
}
function runPattern(eventsPerCycle, sOverrides) {
  const ctx = {
    mode: {}, ss: { getSheetByName: (n) => (n === 'Riley_Digest' ? digestSheet(eventsPerCycle) : null) },
    summary: Object.assign({ worldEvents: [] }, sOverrides || {}),
  };
  applyPatternDetection_(ctx);
  return ctx.summary.patternFlag;
}

// ── PATTERN DETECTION ──
console.log('═══ B2 applyPatternDetection — population-relative');

// Steady high-volume world (~600 flat). OLD code: events>=55 for 3 -> micro-event-wave
// every cycle. NEW: 600 ≈ baseline, not >1.2x -> NOT micro-wave, NOT strain.
{
  const flatHigh = [600, 600, 600, 600, 600, 600, 600];
  const p = runPattern(flatHigh);
  ok('steady ~600 world is NOT perma micro-event-wave (was the bug)', p !== 'micro-event-wave', 'got ' + p);
  ok('steady ~600 world is NOT strain-trend', p !== 'strain-trend', 'got ' + p);
}

// Genuine busy WAVE above the local norm. Digest loop reads newest-first, so the
// RECENT cycles are at the END of the chronological input. Norm ~600, recent 3 -> 900.
{
  const wave = [600, 600, 600, 600, 900, 900, 900]; // recent 3 (read first) = 900 = 1.5x baseline
  const p = runPattern(wave);
  ok('genuine 1.5x wave above norm IS detected (micro-event-wave or elevated)',
    p === 'micro-event-wave' || p === 'elevated-activity', 'got ' + p);
}

// Legacy low-volume quiet world still reads stability (baseline floored at 50, so
// old absolute behavior preserved). [20x7]: 20 < 0.88*50=44 for 5 -> stability-streak.
{
  const lowFlat = [20, 20, 20, 20, 20, 20, 20];
  const p = runPattern(lowFlat, { worldEvents: [] });
  ok('legacy low-volume quiet world still reads stability-streak (floor preserves it)',
    p === 'stability-streak', 'got ' + p);
}

// High-volume world that is uniformly quiet relative to itself reads "none", NOT a
// false pattern — a sustained level is the norm, not an anomaly (correct behavior).
{
  const flatMid = [500, 500, 500, 500, 500, 500, 500];
  const p = runPattern(flatMid);
  ok('uniform high-volume world is "none", not strain/micro-wave',
    p !== 'strain-trend' && p !== 'micro-event-wave', 'got ' + p);
}

// ── SHOCK MONITOR ──
console.log('═══ B3 applyShockMonitor — population-relative + regime guard');

function runShock(curEvents, prevEvents, sOverrides) {
  const ctx = {
    config: { cycleCount: 100, employmentFallbackRate: 0.91 },
    summary: Object.assign({
      eventsGenerated: curEvents,
      worldEvents: [],
      cityDynamics: { sentiment: 0, culturalActivity: 1, communityEngagement: 1 },
      economicMood: 50, civicLoad: 'stable', civicLoadScore: 0, patternFlag: 'none',
      weather: { type: 'clear', impact: 1 }, weatherMood: {}, mediaEffects: {},
      eventArcs: [], demographicDrift: { migration: 0, employmentRate: 0.91 },
      holiday: 'none', holidayPriority: 'none', simMonth: 6,
      previousCycleState: Object.assign({ events: prevEvents, chaosCount: 0, sentiment: 0, econMood: 50, pattern: 'none', shockFlag: 'none', shockStartCycle: 0 }, (sOverrides && sOverrides.prev) || {}),
      currentCycle: 100,
    }, (sOverrides && sOverrides.cur) || {}),
  };
  applyShockMonitor_(ctx);
  // S.shockScore = shockReasons.length. The S setup is neutral (no sentiment/econ/
  // civic/weather/chaos triggers), so shockScore counts ONLY the event-logic reason.
  return ctx.summary.shockScore || 0;
}

// First deployed cycle: prev~52, cur~600. OLD: cur-prev=548 >= 10 -> false "event
// spike"; also stability-break (prev pattern stable, cur>=10). NEW: regime-shift
// guard (cur/prev >= 2.5x) suppresses both -> shockScore 0.
{
  const score = runShock(600, 52, { prev: { pattern: 'stability-streak' } });
  ok('first deploy cycle (52->600) fires NO false shock (spike+break suppressed)', score === 0, 'score=' + score);
}

// Steady state (prev 600, cur 610) — normal noise, below 30% of baseline, no spike.
{
  const score = runShock(610, 600);
  ok('steady ~600 noise does NOT fire event spike (was <10 absolute)', score === 0, 'score=' + score);
}

// Genuine in-world spike at high volume (prev 600, cur 800 = +200 >= 0.30*600=180).
{
  const score = runShock(800, 600);
  ok('genuine +33% spike at high volume IS detected', score >= 1, 'score=' + score);
}

// Legacy low-volume real spike still works (prev 40, cur 55: +15 >= max(10, 0.30*40=12)).
{
  const score = runShock(55, 40);
  ok('legacy low-volume real spike (40->55) still detected', score >= 1, 'score=' + score);
}

// 2026-09-19: a holiday lift unwinding is not a collapse; a real fall below neutral is.
{
  const unwind = runShock(600, 600, { cur: { cityDynamics: { sentiment: 0.15, culturalActivity: 1, communityEngagement: 1 } }, prev: { sentiment: 0.55 } });
  ok('holiday unwind 0.55 → 0.15 is not a sentiment collapse', unwind === 0, 'score=' + unwind);
  const fall = runShock(600, 600, { cur: { cityDynamics: { sentiment: -0.2, culturalActivity: 1, communityEngagement: 1 } }, prev: { sentiment: 0.2 } });
  ok('a fall 0.2 → −0.2 is a sentiment collapse', fall >= 1, 'score=' + fall);
}

// engine.187 (2026-09-19): civic load cannot pin itself — severity alone tops out below load-strain,
// and its own downstream flags (strain-trend, shock) no longer feed its score.
{
  const vm2 = require('vm'), fs2 = require('fs'), path2 = require('path');
  const cl = { Logger: { log() {} }, Math, JSON, Object, Array, String, Number };
  vm2.createContext(cl);
  vm2.runInContext(fs2.readFileSync(path2.join(__dirname, '..', 'phase06-analysis/applyShockMonitor.js'), 'utf8'), cl);
  vm2.runInContext(fs2.readFileSync(path2.join(__dirname, '..', 'phase06-analysis/applyCivicLoadIndicator.js'), 'utf8'), cl);
  const load = over => {
    const ctx = { config: { cycleCount: 100 }, summary: Object.assign({ cycleId: 100, worldEvents: [], eventArcs: [], cityDynamics: { sentiment: 0, culturalActivity: 1, communityEngagement: 1 },
      weather: { type: 'clear', impact: 1 }, weatherMood: {}, economicMood: 50, demographicDrift: { migration: 0 }, patternFlag: 'none', shockFlag: 'none',
      holiday: 'none', holidayPriority: 'none', sportsSeason: 'off-season', previousCycleState: { chaosCount: 9 } }, over || {}) };
    cl.applyCivicLoadIndicator_(ctx);
    return ctx.summary;
  };
  const med = n => Array.from({ length: n }, () => ({ severity: 'medium', cycle: 100 }));
  const texture = load({ worldEvents: med(8) });
  ok('8 medium texture events alone read minor-variance, not load-strain', texture.civicLoad === 'minor-variance', texture.civicLoad + ' ' + texture.civicLoadScore);
  const latch = load({ worldEvents: med(8), patternFlag: 'strain-trend', shockFlag: 'shock-flag' });
  ok('its own strain-trend / shock flags add nothing (no latch)', latch.civicLoadScore === texture.civicLoadScore, latch.civicLoadScore + ' vs ' + texture.civicLoadScore);
  const real = load({ worldEvents: med(8), eventArcs: [{ phase: 'peak', tension: 8 }, { phase: 'peak', tension: 8 }], weather: { type: 'rain', impact: 1.4 } });
  ok('severity + two peak arcs + severe weather still reach load-strain', real.civicLoad === 'load-strain', real.civicLoad + ' ' + real.civicLoadScore);
  const surge = load({ worldEvents: med(14) });
  ok('a surge over last cycle (9 → 14 events) adds the volume points; an ordinary 8 does not', surge.civicLoadScore === texture.civicLoadScore + 4, surge.civicLoadScore + ' vs ' + texture.civicLoadScore);
}

// engine.187 (2026-09-19): strain-trend is a RUN of strained cycles (or a clear majority), not two
// scattered ones — alternating load-strain / minor-variance no longer pins the flag (and through it
// the shock flag).
{
  const vm3 = require('vm'), fs3 = require('fs'), path3 = require('path');
  const pd = { Logger: { log() {} }, Math, JSON, Object, Array, String, Number };
  vm3.createContext(pd);
  vm3.runInContext(fs3.readFileSync(path3.join(__dirname, '..', 'phase06-analysis/applyPatternDetection.js'), 'utf8'), pd, { filename: 'applyPatternDetection.js' });
  // Riley_Digest rows: E(4) events, F(5) issues, I(8) CivicLoad, J(9) drift, K(10) pattern, L(11) shock, M(12) seeds, AB(27) sentiment
  const row = (civic, events) => { const r = new Array(28).fill(''); r[4] = events; r[5] = ''; r[8] = civic; r[9] = 0; r[10] = ''; r[11] = 'none'; r[12] = 0; r[27] = 0.2; return r; };
  const runPattern = civicNewestFirst => {
    const rows = civicNewestFirst.map(c => row(c, 600));
    const sheet = { getLastRow: () => rows.length + 1, getLastColumn: () => 28,
      getRange: (r) => ({ getValues: () => [rows[rows.length + 1 - r] || row('stable', 600)] }) };
    const ctx = { mode: {}, ss: { getSheetByName: () => sheet }, config: { cycleCount: 120 },
      summary: { cycleId: 120, worldEvents: new Array(9).fill({ severity: 'low' }), cityDynamics: { sentiment: 0.2, culturalActivity: 1, communityEngagement: 1 },
        holiday: 'none', holidayPriority: 'none', isFirstFriday: false, isCreationDay: false, sportsSeason: 'off-season', worldPopulation: { totalPopulation: 391000 } } };
    pd.applyPatternDetection_(ctx);
    return ctx.summary.patternFlag;
  };
  const alternating = runPattern(['minor-variance', 'load-strain', 'minor-variance', 'load-strain', 'minor-variance', 'load-strain', 'stable']);
  ok('alternating load-strain / minor-variance is not a strain trend', alternating !== 'strain-trend', String(alternating));
  const run2 = runPattern(['load-strain', 'load-strain', 'minor-variance', 'stable', 'stable', 'stable', 'stable']);
  ok('two consecutive strained cycles IS a strain trend', run2 === 'strain-trend', String(run2));
  const majority = runPattern(['minor-variance', 'load-strain', 'load-strain', 'load-strain', 'load-strain', 'load-strain', 'stable']);
  ok('a clear majority of the window is a strain trend even without a run', majority === 'strain-trend', String(majority));
}

// engine.187 part 3 (2026-09-19): the shock monitor detects a BREAK. It no longer restates the
// civic-load class or the strain pattern — those two lines made every strained cycle a shock
// cycle by definition (shock-flag 4 of 4 on bench C108-C111 after parts 1 and 2), which is what
// kept Downtown labelled 'Shock event zone' permanently.
{
  const runFlag = (cur, prev) => {
    const ctx = {
      config: { cycleCount: 100, employmentFallbackRate: 0.91 },
      summary: Object.assign({
        eventsGenerated: 600, worldEvents: [],
        cityDynamics: { sentiment: 0, culturalActivity: 1, communityEngagement: 1 },
        economicMood: 50, civicLoad: 'stable', civicLoadScore: 0, patternFlag: 'none',
        weather: { type: 'clear', impact: 1 }, weatherMood: {}, mediaEffects: {},
        eventArcs: [], demographicDrift: { migration: 0, employmentRate: 0.91 },
        holiday: 'none', holidayPriority: 'none', simMonth: 6,
        previousCycleState: Object.assign({ events: 600, chaosCount: 0, sentiment: 0, econMood: 50, pattern: 'none', shockFlag: 'none', shockStartCycle: 0 }, prev || {}),
        currentCycle: 100,
      }, cur || {}),
    };
    applyShockMonitor_(ctx);
    return { flag: ctx.summary.shockFlag, reasons: ctx.summary.shockReasons || [] };
  };

  const strained = runFlag({ civicLoad: 'load-strain', civicLoadScore: 13 });
  ok('a strained cycle alone is NOT a shock (the class is not the break)',
    strained.flag === 'none', strained.flag + ' ' + JSON.stringify(strained.reasons));

  const trend = runFlag({ patternFlag: 'strain-trend' });
  ok('a strain trend alone is NOT a shock (a trend is not a break)',
    trend.flag === 'none', trend.flag + ' ' + JSON.stringify(trend.reasons));

  const extreme = runFlag({ civicLoad: 'load-strain', civicLoadScore: 15 });
  ok('civic load BEYOND the class boundary (score 15) still shocks',
    extreme.flag === 'shock-flag', extreme.flag + ' ' + JSON.stringify(extreme.reasons));

  const collapse = runFlag({ cityDynamics: { sentiment: -0.2, culturalActivity: 1, communityEngagement: 1 }, civicLoad: 'load-strain' }, { sentiment: 0.2 });
  ok('a real break (sentiment 0.2 -> -0.2) still shocks',
    collapse.flag === 'shock-flag' && collapse.reasons.join(',').indexOf('collapse') !== -1,
    collapse.flag + ' ' + JSON.stringify(collapse.reasons));

  // The two cut lines used to push 1-2 reasons EVERY cycle, and shockReasons.length is what
  // decides fading (>=2) / chronic (>=3). With them gone a lone lingering cause can decay.
  const fading = runFlag({ civicLoad: 'load-strain', civicLoadScore: 15 }, { shockFlag: 'shock-flag', shockStartCycle: 96 });
  ok('a single lingering cause after 4 cycles reads shock-fading, not shock-flag',
    fading.flag === 'shock-fading', fading.flag + ' ' + JSON.stringify(fading.reasons));
}

// engine.187 part 4 (2026-09-19): four gates were absolute numbers from a ~52-event, small-
// population world. Bench C104-C111 measured what the city actually runs: 8-13 chaos events every
// cycle (saturation bar 8), 0-9 medium-severity (wave bar 4), ~1,295 net migration head count
// (surge bar 150), coverageIntensity 'saturated' 8 of 8. All four fired on ordinary life, which is
// why the shock flag survived part 3.
{
  const ev = (n, sev) => new Array(n).fill(0).map(() => ({ severity: sev }));
  const runGate = cur => {
    const ctx = {
      config: { cycleCount: 100, employmentFallbackRate: 0.91 },
      summary: Object.assign({
        eventsGenerated: 600, worldEvents: ev(10, 'low'),
        cityDynamics: { sentiment: 0.3, culturalActivity: 1, communityEngagement: 1 },
        economicMood: 56, civicLoad: 'minor-variance', civicLoadScore: 8, patternFlag: 'none',
        weather: { type: 'clear', impact: 1 }, weatherMood: {}, mediaEffects: {},
        eventArcs: [], demographicDrift: { migration: 1295, employmentRate: 0.95 },
        worldPopulation: { totalPopulation: 391000 },
        holiday: 'none', holidayPriority: 'none', simMonth: 6,
        previousCycleState: { events: 600, chaosCount: 11, sentiment: 0.3, econMood: 56, pattern: 'none', shockFlag: 'none', shockStartCycle: 0 },
        currentCycle: 100,
      }, cur || {}),
    };
    applyShockMonitor_(ctx);
    return (ctx.summary.shockReasons || []).join(',');
  };

  ok('an ordinary cycle (10 chaos, 1295 migrants, busy newsroom) is NOT a shock',
    runGate({ mediaEffects: { coverageIntensity: 'saturated' } }) === '', runGate({ mediaEffects: { coverageIntensity: 'saturated' } }));

  ok('chaos saturation needs volume above the city\'s own norm, not 8',
    runGate({ worldEvents: ev(13, 'low') }).indexOf('saturation') === -1, runGate({ worldEvents: ev(13, 'low') }));
  ok('a real chaos surge (11 -> 20) IS saturation',
    runGate({ worldEvents: ev(20, 'low') }).indexOf('chaos saturation') !== -1, runGate({ worldEvents: ev(20, 'low') }));

  ok('4 medium of 10 is ordinary texture, not a severity wave',
    runGate({ worldEvents: ev(4, 'medium').concat(ev(6, 'low')) }).indexOf('medium severity wave') === -1,
    runGate({ worldEvents: ev(4, 'medium').concat(ev(6, 'low')) }));
  ok('8 medium of 10 IS a severity wave (the mix tilted)',
    runGate({ worldEvents: ev(8, 'medium').concat(ev(2, 'low')) }).indexOf('medium severity wave') !== -1,
    runGate({ worldEvents: ev(8, 'medium').concat(ev(2, 'low')) }));
  ok('two high-severity events are still a cluster (genuinely rare)',
    runGate({ worldEvents: ev(2, 'high').concat(ev(8, 'low')) }).indexOf('high severity cluster') !== -1,
    runGate({ worldEvents: ev(2, 'high').concat(ev(8, 'low')) }));

  ok('ordinary migration for a 391k city is not a surge',
    runGate({}).indexOf('migration surge') === -1, runGate({}));
  ok('migration above 0.5% of the population IS a surge',
    runGate({ demographicDrift: { migration: 2400, employmentRate: 0.95 } }).indexOf('migration surge') !== -1,
    runGate({ demographicDrift: { migration: 2400, employmentRate: 0.95 } }));
  ok('a small city keeps the legacy 150 floor',
    runGate({ worldPopulation: { totalPopulation: 9000 }, demographicDrift: { migration: 200, employmentRate: 0.95 } }).indexOf('migration surge') !== -1,
    runGate({ worldPopulation: { totalPopulation: 9000 }, demographicDrift: { migration: 200, employmentRate: 0.95 } }));

  ok('a busy newsroom alone is not a shock (and cannot re-arm itself through intensity)',
    runGate({ mediaEffects: { coverageIntensity: 'saturated' } }).indexOf('media') === -1,
    runGate({ mediaEffects: { coverageIntensity: 'saturated' } }));
  ok('crisis coverage crowding out the rest IS a shock',
    runGate({ mediaEffects: { crisisSaturation: 0.85 } }).indexOf('media crisis saturation') !== -1,
    runGate({ mediaEffects: { crisisSaturation: 0.85 } }));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
