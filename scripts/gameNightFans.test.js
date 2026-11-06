#!/usr/bin/env node
/**
 * gameNightFans.test.js — engine.331: the city's game-night lines (generateCitizensEvents_) read the
 * week's hotCold for the game row's own team — a streak night only in a hot week, a skid night only in
 * a cold week (builder 2026-11-06). Bench fires draw these lines by chance, so the path is proven here.
 * Loader pattern from citizensEventsFame.t3.test.js; synthetic citizens, no sheet reads or writes.
 *
 * Run: node scripts/gameNightFans.test.js
 */
const fs = require('fs');
const path = require('path');

global.nudgesForEvent_ = require('../utilities/citizenDialMap.js').nudgesForEvent_;
global.baseTag_ = require('../utilities/citizenDialMap.js').baseTag_;
global.Logger = { log() {} };
const C = require('../utilities/compressLifeHistory.js');
global.getCitizenDialBands_ = () => null;
global.hoodTexturePool_ = (ctx, hood, byLabel, bespoke) => (bespoke && bespoke[hood] ? bespoke[hood].slice() : []);
global.getGriefConfig_ = C.getGriefConfig_;
global.activeGriefFromRegisters_ = C.activeGriefFromRegisters_;
global.Utilities = { formatDate: () => 'STAMP' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.inWorldStamp_ = (ctx) => 'C' + ((ctx && ctx.config && ctx.config.cycleCount) || 0);
// the real bucket and the real team normalizer, as Apps Script's one global scope has them
const read = (f) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
global.gameNightBucket_ = new Function(read('phase05-citizens/applyGameNightMoments.js') + '\nreturn gameNightBucket_;')();
global.normalizeOaklandFeedTeam_ = new Function(read('phase02-world-state/applySportsSeason.js') + '\nreturn normalizeOaklandFeedTeam_;')();

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const src = read('phase05-citizens/generateCitizensEvents.js');
const simYearSrc_ = () => { const s = read('phase01-config/advanceSimulationCalendar.js'); return s.match(/function simYearFromCycle_[\s\S]*?\n}\n/)[0] + s.match(/function simYearOf_[\s\S]*?\n}\n/)[0]; };
const generateCitizensEvents_ = new Function(read('utilities/sportsWeekRecord.js') + simYearSrc_() + src + '\nreturn generateCitizensEvents_;')();

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated',
  'Neighborhood', 'BirthYear', 'Occupation', 'TierRole', 'Type', 'TraitProfile', 'UsageCount'];
const makeRow = (popId) => [popId, 'Test', popId, 3, 'ENGINE', '', '', 'Temescal', 1990, 'teacher', '', '', '', 0];

// exact fan pool texts (generateCitizensEvents.js gnTexts)
const STREAK = ['heard strangers at the bus stop talking streak numbers like family business',
  'wore the cap to work and got three nods before the first coffee',
  'watched the kids on the corner re-enact the play twice, arguing the call both times'];
const SKID = ['heard the bus stop arguing over who to blame for the skid', 'left the cap at home for the first time in weeks',
  'watched another loss with the patience wearing thin'];
const WIN = ["watched the ninth from a packed bar and walked home in a crowd that didn't want to disperse",
  'heard the block erupt through an open window when the final out landed',
  'caught the recap at the counter this morning and stayed for the second retelling'];
const LOSS = ['watched the bar go quiet by the eighth and settle the tab early', 'turned the game off before the end and told nobody',
  'avoided the score all morning and got told anyway, twice'];

function night(n, entry, weeks) {
  const lines = [];
  for (let i = 0; i < n; i++) {
    const rows = [makeRow('POP-N' + i)];
    const ctx = { now: new Date(0), rng: mulberry32(i + 31), config: { griefDurationCycles: 3, griefHolidayDurationCycles: 5, griefParticipationMultiplier: 0.80,
        griefPublicActivityMultiplier: 0.75, griefSupportMultiplier: 1.25, griefResponseChance: 0.35, gcSurfaceChance: 0.06, hoodFloorSurfaceQuota: 0 },
      ss: { getSheetByName: () => null },
      summary: { cycleId: 120, season: 'Summer', economicMood: 50, sportsFeedEntries: [entry], sportsWeek: weeks,
        sportsSentimentBoost: 0.05, sportsAftermath: { total: 0 } },
      ledger: { headers: HEADERS.slice(), rows, dirty: false } };
    generateCitizensEvents_(ctx);
    for (const ln of String(rows[0][HEADERS.indexOf('LifeHistory')] || '').split('\n')) if (ln) lines.push(ln);
  }
  const has = (set) => lines.filter((ln) => set.some((t) => ln.indexOf(t) >= 0)).length;
  const night = lines.filter((ln) => [].concat(STREAK, SKID, WIN, LOSS).some((t) => ln.indexOf(t) >= 0));
  return { streak: has(STREAK), skid: has(SKID), win: has(WIN), loss: has(LOSS),
    up: night.filter((ln) => /\[Sports-Fandom-Up-S\]/.test(ln)).length, down: night.filter((ln) => /\[Sports-Fandom-Down-S\]/.test(ln)).length };
}

console.log('engine.331 — the city reads the week\'s hot/cold on game night');
const game = (team, streak) => ({ eventType: 'game-result', teamsUsed: team, streak });
const hot = night(1500, game('Oaks', 'W5'), { Oaks: { g: 2, hotCold: 'hot' } });
assert('1 a hot week draws the streak lines and no plain-win lines', hot.streak > 0 && hot.win === 0, JSON.stringify(hot));
const under = night(1500, game('Oaks', 'W4'), { Oaks: { g: 2, hotCold: '' } });
assert('2 W4 under the bar draws plain-win lines, no streak lines (the old W4 literal is gone)', under.win > 0 && under.streak === 0, JSON.stringify(under));
const cold = night(1500, game("A's", 'L5'), { "A's": { g: 2, hotCold: 'cold' } });
assert('3 a cold week draws the skid lines and no plain-loss lines', cold.skid > 0 && cold.loss === 0, JSON.stringify(cold));
const other = night(1500, game("A's", 'W5'), { "A's": { g: 2, hotCold: '' }, Oaks: { g: 2, hotCold: 'hot' } });
assert('4 the row\'s own team decides — the Oaks\' hot week does not make an A\'s W5 a streak night', other.streak === 0 && other.win > 0, JSON.stringify(other));

// engine.299's admission gate writes only a line that moves a dial: before engine.331 every one of these was dropped
assert('5 the written night moves fandom: up on a win night, down on a skid night', hot.up === hot.streak && under.up === under.win &&
  cold.down === cold.skid && hot.down === 0 && cold.up === 0, JSON.stringify({ hot, under, cold }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
