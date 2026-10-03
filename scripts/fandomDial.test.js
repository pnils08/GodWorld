#!/usr/bin/env node
'use strict';

// engine.208 Dial 9 fandom — substrate (research doc §2.9 C1/C2 + Revision 1). Pure, no sheet I/O.
// An old 8-dial DialState must read fandom 50 without a throw; the fan's team must survive both
// serializers; fandom fades at 0.9 while the other eight keep 0.8; every new tag carries exactly
// its ruled effect and nothing falls through CONTENT_RULES.

global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach((k) => { global[k] = E[k]; });
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.nudgesForReflection_ = M.nudgesForReflection_;
global.baseTag_ = M.baseTag_;
global.queueCellIntent_ = () => ({});
const C = require('../utilities/compressLifeHistory.js');
const D = require('../lib/citizenDials.js');

let passed = 0, failed = 0;
function ok(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); passed++; }
  else { console.error('  FAIL ' + label + (detail ? ': ' + detail : '')); failed++; }
}

// 1. the dial list and the old-row read
ok('fandom is dial 9', E.DIALS.length === 9 && E.DIALS[8] === 'fandom');
const old8 = '{"base":{"drive":60,"sociability":55,"warmth":50,"openness":50,"composure":48,"integrity":52,"family":50,"outabout":57},"mood":{"drive":1},"streak":{"drive":1}}';
let c;
try { c = E.deserialize_(C.parseDialState_(old8)); ok('an 8-dial DialState deserializes without a throw', true); }
catch (e) { ok('an 8-dial DialState deserializes without a throw', false, e.message); }
ok('a missing fandom reads 50 on the fold path', E.current_(c, 'fandom') === 50);
ok('a missing fandom reads 50 on the perception path', D.currentDials(old8).fandom === 50);
ok('describe_ does not crash on the ninth dial', typeof E.describe_(c) === 'string');

// 2. the fan's team rides both serializers; a 9-dial round trip is lossless
c.base.fandom = 65; c.fan = 'oaks';
const viaFold = C.parseDialState_(C.serializeDialState_(c));
ok('compressor serializer keeps base.fandom + fan', viaFold.base.fandom === 65 && viaFold.fan === 'oaks');
const viaMem = E.serialize_(E.deserialize_(E.serialize_(c)));
ok('citizenMemory serializer keeps base.fandom + fan', viaMem.base.fandom === 65 && viaMem.fan === 'oaks');
const back = E.deserialize_(viaFold);
ok('9-dial round trip keeps every base value', E.DIALS.every((d) => back.base[d] === c.base[d]));
ok('a row with no fan carries no fan key', !('fan' in C.parseDialState_(C.serializeDialState_(E.newCitizen_()))));

// 3. fandom fades slower than the other eight
const f = E.newCitizen_();
f.mood.fandom = 10; f.mood.drive = 10;
E.settleCycle_(f);
ok('fandom mood fades at 0.9', Math.abs(f.mood.fandom - 9) < 1e-9, String(f.mood.fandom));
ok('drive mood still fades at 0.8', Math.abs(f.mood.drive - 8) < 1e-9, String(f.mood.drive));

// 4. the readable face carries fandom; phrases exist at both poles
const face = C.formatDialFace_(back, [], 110);
ok('TraitProfile face renders fandom:65', /\bfandom:65\b/.test(face), face);
const hi = E.newCitizen_({ fandom: 90 }), lo = E.newCitizen_({ fandom: 10 });
ok('top band phrase', /lives and dies with them/.test(E.describe_(hi)), E.describe_(hi));
ok('bottom band phrase', /doesn't follow the teams/.test(E.describe_(lo)), E.describe_(lo));
ok('voice poles carry fandom', D.POLES.fandom && D.POLES.fandom.length === 4);

// 5. exact tag effects — none may fall through to a content rule
const EXPECT = {
  'Sports-Win': { fandom: 2 }, 'Sports-Loss': { fandom: -2 }, 'Sports-LosingWeek': { fandom: -1 },
  'Sports-Run': { fandom: 4, outabout: 1 }, 'Sports-Title': { fandom: 6, outabout: 1, sociability: 1 },
  'Sports-Played': { composure: 1 }, 'Sports-PlayedWin': { composure: 2 },
  'Sports-Injured': { composure: -2, outabout: -1 }, 'Sports-Moved': { openness: 2, family: -1 },
  'Undocked-Audience': { fandom: 1 }, 'Sports': {}
};
for (const t of Object.keys(EXPECT)) {
  // text that would trip CONTENT_RULES if the tag were unmapped ("engaged", "featured", "new role")
  const got = M.nudgesForEvent_(t, 1, 'engaged crowd, featured, new role');
  ok('exact effect ' + t, JSON.stringify(got) === JSON.stringify(EXPECT[t]), JSON.stringify(got));
  ok('baseTag_ keeps ' + t + ' intact', M.baseTag_(t) === t);
}
ok('the old name still falls through to the marriage rule (why it was renamed)',
  JSON.stringify(M.nudgesForEvent_('Undocked-Engaged', 1, '')) === JSON.stringify({ sociability: 4, warmth: 3, family: 2 }));

// 6. a fold of one Sports-Loss on a 60-seeded fan: current dips, base holds (membership reads base)
const fan = E.newCitizen_({ fandom: 60 });
E.applyCycleEffects_(fan, M.nudgesForEvent_('Sports-LosingWeek', 1, ''));
ok('a losing week dips current below 60', E.current_(fan, 'fandom') < 60, String(E.current_(fan, 'fandom')));
ok('base stays a fan (60)', fan.base.fandom === 60);

// 7. the fold reads the bracket tag the feed seam writes (applyGameNightMoments_ line shape)
const parsedLines = C.parseLifeHistoryEntries_('C110 — [Sports-Title] rode the parade route home\nC110 — [Undocked-Audience] watched the show\nY3C110 — [Sports-LosingWeek] said next week would be different');
const ptags = (parsedLines.entries || []).map((e) => e.tag + '@' + e.cycle);
ok('fold parses the new tags with their Cycle (Y3C110 = absolute 214)', ['Sports-Title@110', 'Undocked-Audience@110', 'Sports-LosingWeek@214'].every((t) => ptags.includes(t)), JSON.stringify(ptags));

// 8. C8 through the real fold: a blank DialState (mint / birth / arrival) inherits from the household
{
  const vm = require('vm'), fs = require('fs'), path = require('path');
  // sportsStaffTeams_ (applyGameNightMoments.js) is the one franchise-employer table; an Apps Script global
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../phase05-citizens/applyGameNightMoments.js'), 'utf8'));
  global.simYearOf_ = () => 2042;
  const H = ['POPID', 'LifeHistory', 'TraitProfile', 'DialState', 'Status', 'Tier', 'ClockMode', 'SpouseId', 'ParentIds', 'ChildrenIds', 'HouseholdId', 'EmployerBizId', 'RoleType'];
  const iDS = H.indexOf('DialState');
  const dial = (fandom, fan) => JSON.stringify({ base: { drive: 50, fandom }, mood: {}, streak: {}, folded: 109, ...(fan ? { fan } : {}) });
  const old8 = '{"base":{"drive":50,"sociability":50,"warmth":50,"openness":50,"composure":50,"integrity":50,"family":50,"outabout":50},"mood":{},"streak":{},"folded":109}';
  const r = (id, ds, o = {}) => [id, '', '', ds, 'Active', 4, o.clock || 'ENGINE', o.spouse || '', o.parents || '', o.children || '', o.hh || '', o.emp || '', o.role || ''];
  const rows = [
    r('POP-00900', dial(70, 'oaks'), { hh: 'HH-1' }),                         // 0 an Oaks fan, household HH-1
    r('POP-00901', '', { hh: 'HH-1', parents: '["POP-00900","POP-00950"]' }),  // 1 newborn in HH-1
    r('POP-00202', dial(85, 'as')),                                          // 2 an A's fan at 85
    r('POP-00903', '', { spouse: 'POP-00202 Marky Beal' }),                  // 3 a new spouse of the 85 fan
    r('POP-00904', ''),                                                      // 4 a stranger
    r('POP-00905', '', { clock: 'GAME', emp: 'BIZ-00074', role: 'SG / The Oaks' }), // 5 a new Oaks player
    r('POP-00906', old8, { hh: 'HH-1' }),                                    // 6 an existing 8-dial row in a fan house
    r('POP-00907', dial(59, 'as'), { hh: 'HH-2' }),                          // 7 not a fan (59)
    r('POP-00908', '', { hh: 'HH-2' })                                       // 8 new in a non-fan house
  ];
  const before6 = rows[6][iDS];
  const ctx = { mode: {}, summary: { absoluteCycle: 110, simYear: 2042 }, config: {}, ledger: { headers: H.slice(), rows, dirty: false } };
  C.compressLifeHistory_(ctx, {});
  const got = (i) => C.parseDialState_(ctx.ledger.rows[i][iDS]);
  ok('C8 newborn in a fan household starts a fan, capped at 65, the house team', got(1).base.fandom === 65 && got(1).fan === 'oaks', ctx.ledger.rows[1][iDS]);
  ok('C8 a new spouse of an 85 fan starts at 65, A\'s', got(3).base.fandom === 65 && got(3).fan === 'as');
  ok('C8 a stranger starts at 50 with no team', got(4).base.fandom === 50 && !got(4).fan);
  ok('C8 a new Oaks player starts a fan (athletes start as fans)', got(5).base.fandom === 65 && got(5).fan === 'oaks');
  ok('C8 an existing row is left byte-identical (the seed writes it, not the fold)', ctx.ledger.rows[6][iDS] === before6);
  ok('C8 a 59 is not a donor', got(8).base.fandom === 50 && !got(8).fan);
  ok('C8 counts reach the summary', ctx.summary.lifeHistoryCompression.fandomSeeded.rows === 5 && ctx.summary.lifeHistoryCompression.fandomSeeded.fans === 3,
    JSON.stringify(ctx.summary.lifeHistoryCompression.fandomSeeded));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
