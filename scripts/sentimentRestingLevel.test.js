/**
 * engine.188 — the sentiment TOP end gets the engine.185 treatment.
 *
 * engine.185 gave the city a downward range by repricing adversity and making
 * the crime/shock gates relative. That exposed the mirror defect: the UPWARD
 * vocabulary was tuned against a -0.48/cycle tax that no longer exists, and
 * most of it fired on the city's ORDINARY day — absolute gates on activity
 * counts that never fall to their floor, plus a calendar that paid mood for
 * being a calendar. Resting mood climbed toward 1.0 and adversity could not
 * register against it.
 *
 * These tests pin the four properties the fix has to keep true.
 * Run: node scripts/sentimentRestingLevel.test.js
 */
const fs = require('fs');
const path = require('path');
global.Logger = { log() {} };

const SRC = fs.readFileSync(path.resolve(__dirname, '../phase02-world-state/applyCityDynamics.js'), 'utf8');

// applyCityDynamics_'s modifiers are inner closures — lift them out by brace match.
function grab(name) {
  const i = SRC.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('function not found: ' + name);
  let d = 0, started = false, j = i;
  for (; j < SRC.length; j++) {
    const c = SRC[j];
    if (c === '{') { d++; started = true; }
    else if (c === '}') { d--; if (started && d === 0) { j++; break; } }
  }
  return SRC.slice(i, j);
}
const NAMES = ['applySeasonModifiers_', 'applyWeatherModifiers_', 'applyHolidayModifiers_',
  'applySportsModifiers_', 'normalizeSportsPhase_', 'applyDemographicModifiers_',
  'applyEconomyLocal_', 'applyObservedFeedback_', 'applySeedLocalBoost_',
  'medianOf_', 'seedClusterMedian_', 'seedDomainMedian_', 'makeMetrics_',
  'getMomentumFactor', 'blend'];
const HELPERS = `
var clamp = function(n,min,max){ return Math.max(min, Math.min(max, n)); };
var clampSent = function(n){ return clamp(n,-1,1); };
function safeNum_(v,d){ if(d===undefined)d=0; var n=Number(v); return isFinite(n)?n:d; }
`;
const M = new Function(HELPERS + NAMES.map(grab).join('\n') + '\nreturn {' + NAMES.join(',') + '};')();

let pass = 0, fail = 0;
const ok = (l, c, d) => c ? (console.log('  ok   ' + l), pass++)
                          : (console.error('  FAIL ' + l + (d ? ': ' + d : '')), fail++);
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1e-9 : e);

// ── the city's ordinary cycle, from live C101-C106 ─────────────────────────
// events 8-13/cycle, seeds 28-44/cycle, unemployment median 4.45%, sickness
// median 4.86%, economic mood anchored at 50. "Now" equals baseline: nothing
// about this cycle is out of the ordinary in either direction.
function ordinary(over) {
  return Object.assign({
    season: 'Winter', weatherType: 'overcast', holiday: 'none', holidayPriority: '',
    isFF: false, isCD: false, sports: 'off-season', cluster: 'DOWNTOWN_CORE',
    unemp: 0.0445, sick: 0.0486, mood: 50,
    events: 10, eventsNow: 10, media: 8, mediaNow: 8, seeds: 35, seedsNow: 35,
    seedW: 8, seedMedian: 8, wComm: 6, commMedian: 6, wBiz: 6, bizMedian: 6
  }, over || {});
}

function sentimentOf(o) {
  const m = M.makeMetrics_();
  M.applySeasonModifiers_(m, o.season);
  M.applyWeatherModifiers_(m, { type: o.weatherType, impact: 1, front: o.weatherType.toUpperCase() },
    { precipIntensity: 0, precipType: 'none', windSpeed: 5, visibility: 10 }, o.cluster);
  M.applyHolidayModifiers_(m, o.holiday, o.holidayPriority,
    { isFirstFriday: o.isFF, isCreationDay: o.isCD }, o.season, o.cluster);
  M.applySportsModifiers_(m, o.sports, o.cluster);
  M.applyDemographicModifiers_(m, { unemploymentRate: o.unemp, sicknessRate: o.sick, studentRatio: 0.2, seniorRatio: 0.2 });
  M.applyEconomyLocal_(m, { mood: o.mood, descriptor: o.mood >= 70 ? 'thriving' : (o.mood <= 30 ? 'struggling' : 'stable') });
  M.applyObservedFeedback_(m, {
    events: o.events, eventsNow: o.eventsNow, media: o.media, mediaNow: o.mediaNow,
    storySeedCount: o.seeds, storySeedCountNow: o.seedsNow,
    crime: 5, crimeNow: 5, shockCount: 10, shockCountNow: 10
  });
  // two other clusters sit at the median so the relative gates have a middle
  const other = { weighted: o.seedMedian };
  M.applySeedLocalBoost_(m, {
    byCluster: { [o.cluster]: { weighted: o.seedW }, A: other, B: other },
    byDomainCluster: {
      [o.cluster]: { COMMUNITY: o.wComm, BUSINESS: o.wBiz, CIVIC: 2 },
      A: { COMMUNITY: o.commMedian, BUSINESS: o.bizMedian, CIVIC: 2 },
      B: { COMMUNITY: o.commMedian, BUSINESS: o.bizMedian, CIVIC: 2 }
    },
    byNeighborhood: {}
  }, o.cluster);
  return m.sentiment;
}

console.log('\nengine.188 — sentiment resting level\n');

// ── 1. the calendar pays nothing over a full year ──────────────────────────
// 52 cycles split exactly 13/13/13/13 across the four seasons, so an uncentred
// table is a standing per-cycle push. Before: -0.2/+0.2/+0.3/-0.1 = +0.20/yr.
console.log('1. season table is centred');
{
  const s = {};
  ['Winter', 'Spring', 'Summer', 'Fall'].forEach(n => {
    const m = M.makeMetrics_(); M.applySeasonModifiers_(m, n); s[n] = m.sentiment;
  });
  const sum = s.Winter + s.Spring + s.Summer + s.Fall;
  ok('four seasons sum to zero (was +0.20/yr)', near(sum, 0, 1e-9), 'sum=' + sum.toFixed(4));
  ok('Summer still the high season', s.Summer > s.Spring && s.Spring > 0, JSON.stringify(s));
  ok('Winter still the low season', s.Winter < s.Fall && s.Fall < 0, JSON.stringify(s));
}

// ── 2. an ordinary cycle collects nothing from the count-fed gates ─────────
console.log('2. ordinary activity is not good news');
{
  const base = M.makeMetrics_();
  M.applySeasonModifiers_(base, 'Winter');
  M.applyWeatherModifiers_(base, { type: 'overcast', impact: 1, front: 'OVERCAST' },
    { precipIntensity: 0, precipType: 'none', windSpeed: 5, visibility: 10 }, 'DOWNTOWN_CORE');
  const calendarOnly = base.sentiment;
  const full = sentimentOf(ordinary());
  ok('events/seeds/media/seed-cluster add 0.00 at baseline (was +0.15)',
    near(full, calendarOnly, 1e-9), 'calendar=' + calendarOnly.toFixed(3) + ' full=' + full.toFixed(3));
  ok('unemployment at the live median (4.45%) is not rewarded (was +0.05)',
    near(sentimentOf(ordinary({ unemp: 0.0445 })), calendarOnly, 1e-9));
  ok('a genuinely exceptional hood (2.5%) still is',
    sentimentOf(ordinary({ unemp: 0.025 })) > calendarOnly + 0.04);
}

// ── 3. a cycle genuinely busier than its own past still lifts ──────────────
console.log('3. the gates can still fire — both directions');
{
  const flat = sentimentOf(ordinary());
  ok('events 60% above baseline lifts',
    sentimentOf(ordinary({ eventsNow: 16 })) > flat + 0.04);
  ok('story attention 60% above baseline lifts',
    sentimentOf(ordinary({ seedsNow: 56 })) > flat + 0.02);
  ok('a cluster at 2x the cycle median lifts',
    sentimentOf(ordinary({ seedW: 16 })) > flat + 0.03);
  ok('a cluster BELOW the cycle median gets nothing',
    near(sentimentOf(ordinary({ seedW: 3 })), flat, 1e-9));
  ok('an epidemic still registers',
    sentimentOf(ordinary({ sick: 0.12 })) < flat - 0.25);
}

// ── 4. sports: the calendar stops paying, the events still do ─────────────
console.log('4. sports phase is a calendar fact, not a result');
{
  const off = sentimentOf(ordinary({ sports: 'off-season' }));
  const mid = sentimentOf(ordinary({ sports: 'mid-season' }));
  const fin = sentimentOf(ordinary({ sports: 'finals' }));
  ok('mid-season is no longer a +0.20 standing lift', (mid - off) <= 0.05,
    'delta=' + (mid - off).toFixed(3));
  ok('a finals run is still a city-wide event', (fin - off) >= 0.30,
    'delta=' + (fin - off).toFixed(3));
  const m2 = M.makeMetrics_(); M.applySportsModifiers_(m2, 'mid-season', 'DOWNTOWN_CORE');
  ok('the crowd effects are untouched (traffic 1.2, nightlife 1.1)',
    near(m2.traffic, 1.2) && near(m2.nightlife, 1.1));
}

// ── 5. the momentum carrier does not integrate a level ────────────────────
// The four boosts (media / sports record / initiative / edition) are levels
// recomputed each cycle. Persisting the boosted value as the carrier made the
// series settle at raw + b/(1-m) — 2x the documented cap at m=0.50.
console.log('5. boosts land at their stated size, not double');
{
  function settle(raw, b, m, carrierIncludesBoost) {
    let carrier = null, f = 0;
    for (let i = 0; i < 400; i++) {
      const blended = M.blend(carrier, raw, m);
      f = blended + b;
      carrier = carrierIncludesBoost ? f : blended;
    }
    return f;
  }
  const raw = 0.20, b = 0.1285;   // b = live C101-C106: initiative + sports + edition
  const mFactor = M.getMomentumFactor('sentiment', {});
  ok('sentiment momentum factor is 0.50', near(mFactor, 0.50));
  const oldWay = settle(raw, b, mFactor, true);
  const newWay = settle(raw, b, mFactor, false);
  ok('old carrier settled at raw + 2x boost', near(oldWay, raw + b / (1 - mFactor), 1e-6),
    oldWay.toFixed(4));
  ok('new carrier settles at raw + boost', near(newWay, raw + b, 1e-6), newWay.toFixed(4));
  ok('the echo removed is worth ' + (oldWay - newWay).toFixed(3), (oldWay - newWay) > 0.12);
  const inShock = M.getMomentumFactor('sentiment', { shockFlag: 'shock-flag' });
  ok('still correct at the in-shock factor engine.187 leaves on (0.40)',
    near(settle(raw, b, inShock, false), raw + b, 1e-6));
}

// ── 6. the resting level leaves room in both directions ───────────────────
console.log('6. resting level has headroom both ways');
{
  const b = 0.1285;
  const bands = {};
  ['Winter', 'Spring', 'Summer', 'Fall'].forEach(s => {
    bands[s] = sentimentOf(ordinary({ season: s, sports: 'mid-season', weatherType: 'clear' })) + b;
  });
  const vals = Object.keys(bands).map(k => bands[k]);
  const hi = Math.max.apply(null, vals), lo = Math.min.apply(null, vals);
  console.log('     resting (in-season, clear, + live boost): ' +
    Object.keys(bands).map(k => k + ' ' + bands[k].toFixed(2)).join('  '));
  ok('no season rests above 0.60 (was 0.94 in Spring)', hi <= 0.60, 'hi=' + hi.toFixed(3));
  ok('no season rests below -0.30', lo >= -0.30, 'lo=' + lo.toFixed(3));
  ok('a -0.32 city adversity reads clearly down from every season resting point',
    vals.every(v => (v - 0.32) < v - 0.30));
  ok('the year averages near neutral, not near the ceiling',
    Math.abs(vals.reduce((a, c) => a + c, 0) / 4) < 0.35);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
