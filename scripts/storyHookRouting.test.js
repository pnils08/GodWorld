#!/usr/bin/env node
'use strict';

/**
 * engine.232 — hooks route to a desk that exists, and the journalist match stays on it.
 *
 * All-time deck: Hal Richmond named on 71 'arc' hooks (HEALTH/CIVIC — the arc theme 'legacy'),
 * P Slayer on 32 of 38 SPORTS, Sharon Okafor on 16 of 21 EDUCATION and 12 of 26 BUSINESS, and the
 * deskMap named five desks that exist nowhere. Offline proof: the real storyHookEngine_ + the real
 * rosterLookup in a vm. Run: node scripts/storyHookRouting.test.js
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
let uuid = 0;
const sb = { Logger: { log: () => {} }, Utilities: { getUuid: () => 'u' + (++uuid) + '-xxxxxxxx' },
  Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat, parseInt, console };
vm.createContext(sb);
load(sb, 'utilities/rosterLookup.js');
load(sb, 'phase07-evening-media/storyHook.js');
const roster = sb.getRoster_();
const deskOf = n => roster.journalists[n] && roster.journalists[n].desk;
const onDesk = (n, k) => deskOf(n) === k || (roster.desks[k] || []).indexOf(n) >= 0;

function run(rawHooks, arcs) {
  const ctx = { config: { cycleCount: 110 }, summary: { absoluteCycle: 110, cycleOfYear: 6,
    storyHooks: rawHooks.map(h => Object.assign({}, h)), eventArcs: arcs || [] } };
  sb.storyHookEngine_(ctx);
  return ctx.summary.storyHooks;
}
const mk = (type, domain, n, extra) => Array.from({ length: n }, (_, i) => Object.assign({ hookType: type, domain, severity: 5, description: type + ' ' + i, neighborhood: 'Temescal' }, extra || {}));

console.log('engine.232 — desk table');
const PACKET_DESKS = ['Civic Desk', 'Sports Desk', 'Culture Desk', 'Business Desk'];
const sample = run([].concat(mk('X', 'HEALTH', 1), mk('X', 'EDUCATION', 1), mk('X', 'COMMUNITY', 1), mk('X', 'ARTS', 1), mk('X', 'CELEBRITY', 1),
  mk('X', 'FESTIVAL', 1), mk('X', 'TRAFFIC', 1), mk('X', 'NIGHTLIFE', 1), mk('X', 'BUSINESS', 1), mk('X', 'FOO_UNKNOWN', 1), mk('X', 'GENERAL', 1)));
check('every SuggestedDesks names only packet desks', sample.every(h => String(h.suggestedDesks).split('; ').every(d => PACKET_DESKS.indexOf(d) >= 0)),
  sample.map(h => h.domain + '=' + h.suggestedDesks).join(', '));
check('HEALTH/TRAFFIC → Civic Desk; EDUCATION/COMMUNITY/ARTS/CELEBRITY/FESTIVAL → Culture Desk; BUSINESS → Business Desk',
  ['HEALTH', 'TRAFFIC'].every(d => sample.find(h => h.domain === d).suggestedDesks === 'Civic Desk') &&
  ['EDUCATION', 'COMMUNITY', 'ARTS', 'CELEBRITY', 'FESTIVAL'].every(d => sample.find(h => h.domain === d).suggestedDesks === 'Culture Desk') &&
  sample.find(h => h.domain === 'BUSINESS').suggestedDesks === 'Business Desk');
check('NIGHTLIFE → both desks; unknown/GENERAL → Civic Desk; Culture Desk',
  sample.find(h => h.domain === 'NIGHTLIFE').suggestedDesks === 'Culture Desk; Business Desk' &&
  sample.find(h => h.domain === 'FOO_UNKNOWN').suggestedDesks === 'Civic Desk; Culture Desk');

console.log('engine.232 — the match stays on the desk');
const arcs = [
  { arcId: 'A1', type: 'health', domainTag: 'HEALTH', phase: 'rising', neighborhood: 'Downtown', summary: 'A clinic fills' },
  { arcId: 'A2', type: 'civic', domainTag: 'CIVIC', phase: 'peak', neighborhood: 'Downtown', summary: 'A vote turns' },
  { arcId: 'A3', type: 'safety', domainTag: 'SAFETY', phase: 'early', neighborhood: 'Fruitvale', summary: 'A pattern of break-ins' }
];
const arcOut = run([], arcs).filter(h => h.hookType === 'arc');
check('arc hooks built (3)', arcOut.length === 3, String(arcOut.length));
check('no arc names a sports-desk journalist (Hal off HEALTH/CIVIC)', arcOut.every(h => !h.suggestedJournalist || onDesk(h.suggestedJournalist, 'metro')),
  arcOut.map(h => h.domain + '→' + h.suggestedJournalist).join(', '));
console.log('  arcs: ' + arcOut.map(h => h.domain + '→' + h.suggestedJournalist).join(', '));

const edu = run(mk('demographic', 'EDUCATION', 3));
check('demographic/EDUCATION → Angela Reyes (domain seat before the hookType signal)', edu.filter(h => h.suggestedJournalist === 'Angela Reyes').length >= 2,
  edu.map(h => h.suggestedJournalist).join(','));
const biz = run(mk('demographic', 'BUSINESS', 3));
check('demographic/BUSINESS stays on the business desk (Sharon off)', biz.every(h => !h.suggestedJournalist || onDesk(h.suggestedJournalist, 'business')), biz.map(h => h.suggestedJournalist).join(','));
const faith = run(mk('event', 'FAITH', 2).concat(mk('cluster', 'FAITH', 2)));
check('FAITH hooks stay on the culture desk (Luis off)', faith.every(h => !h.suggestedJournalist || onDesk(h.suggestedJournalist, 'culture')), faith.map(h => h.hookType + '→' + h.suggestedJournalist).join(','));
check('FAITH names Elliot Graye at least once', faith.some(h => h.suggestedJournalist === 'Elliot Graye'), faith.map(h => h.suggestedJournalist).join(','));

console.log('engine.232 — rotation within the desk');
const sports = run(mk('GAME_RESULT', 'SPORTS', 8));
const sportsNames = sports.map(h => h.suggestedJournalist);
const tally = {}; sportsNames.forEach(n => { tally[n] = (tally[n] || 0) + 1; });
console.log('  8 SPORTS hooks: ' + JSON.stringify(tally));
check('every SPORTS suggestion is on the sports desk', sportsNames.every(n => !n || onDesk(n, 'sports')), sportsNames.join(','));
check('SPORTS spreads over ≥3 names, P Slayer ≤ 3 of 8 (25% cap, min 2)', Object.keys(tally).filter(k => k !== 'null' && k !== 'undefined').length >= 3 && (tally['P Slayer'] || 0) <= 3, JSON.stringify(tally));
const civic = run(mk('pattern', 'CIVIC', 8));
const ct = {}; civic.forEach(h => { ct[h.suggestedJournalist] = (ct[h.suggestedJournalist] || 0) + 1; });
console.log('  8 CIVIC pattern hooks: ' + JSON.stringify(ct));
check('CIVIC stays on metro and spreads over ≥3 names', civic.every(h => !h.suggestedJournalist || onDesk(h.suggestedJournalist, 'metro')) && Object.keys(ct).filter(k => k !== 'null' && k !== 'undefined').length >= 3, JSON.stringify(ct));
const comm = run(mk('CITIZEN_RELOCATED', 'COMMUNITY', 8));
const cm = {}; comm.forEach(h => { cm[h.suggestedJournalist] = (cm[h.suggestedJournalist] || 0) + 1; });
console.log('  8 COMMUNITY moves: ' + JSON.stringify(cm));
check('COMMUNITY stays on culture, Maria Keen named first and capped at 25% (min 2)', comm.every(h => !h.suggestedJournalist || onDesk(h.suggestedJournalist, 'culture')) && comm[0].suggestedJournalist === 'Maria Keen' && (cm['Maria Keen'] || 0) >= 2 && (cm['Maria Keen'] || 0) <= 3, JSON.stringify(cm));

console.log('engine.190 — a high-severity world event hooks');
(function () {
  const ctx = { config: { cycleCount: 110 }, summary: { absoluteCycle: 110, cycleOfYear: 6, storyHooks: [], eventArcs: [],
    worldEvents: [
      { domain: 'BUSINESS', severity: 'high', neighborhood: 'Fruitvale', description: 'Ridgeline Tools is closing in Fruitvale — 6 weeks of decline; 14 jobs go with it' },
      { domain: 'BUSINESS', severity: 'medium', neighborhood: 'Temescal', description: 'Corner Loaf is closing in Temescal — 5 weeks of decline; 3 jobs go with it' },
      { domain: 'CIVIC', severity: 'low', neighborhood: '', description: 'a routine notice' }
    ] } };
  sb.storyHookEngine_(ctx);
  const ev = ctx.summary.storyHooks.filter(h => h.hookType === 'event' && h.domain === 'BUSINESS');
  // The domain-hookType dedupe keeps the highest-priority 'event' hook per domain (pre-existing), so the high closure survives and the medium one folds into it.
  check('high BUSINESS event hooks (dedupe keeps the top one per domain), low does not', ev.length === 1 && !ctx.summary.storyHooks.some(h => h.hookType === 'event' && h.domain === 'CIVIC'), String(ev.length));
  check('the high one carries priority 3, Business Desk, Jordan Velez', ev.some(h => h.priority === 3 && h.suggestedDesks === 'Business Desk' && h.suggestedJournalist === 'Jordan Velez'), JSON.stringify(ev.map(h => [h.priority, h.suggestedDesks, h.suggestedJournalist])));
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
