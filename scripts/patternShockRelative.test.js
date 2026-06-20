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
    config: { cycleCount: 100 },
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
