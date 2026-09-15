#!/usr/bin/env node
'use strict';

/**
 * engine.231 — the raw-carried hook reaches a desk and a journalist.
 *
 * storyHookEngine_ (Phase8-V3Integration) merges the hooks Phases 4–7 pushed
 * raw into S.storyHooks. Before 231 the carry loop set text/priority only and,
 * when the producer carried no domain, wrote the hookType INTO Domain — 52 deck
 * rows at live C106–C107 with no desk and no journalist. Offline proof: the real
 * storyHookEngine_ + the real rosterLookup in a vm, fed the producers' own shapes.
 * Run: node scripts/storyHookCarryEnrichment.test.js
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

const logs = [];
let uuid = 0;
const sb = { Logger: { log: m => logs.push(String(m)) }, Utilities: { getUuid: () => 'uuid-' + (++uuid) + '-xxxxxxxx' },
  Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat, parseInt, console };
vm.createContext(sb);
load(sb, 'utilities/rosterLookup.js');
load(sb, 'phase07-evening-media/storyHook.js');

// The producers' own shapes (post-231: domain at the source), plus one that still lacks a domain.
const raw = [
  { hookType: 'CITIZEN_RELOCATED', domain: 'COMMUNITY', severity: 5, description: 'Ana Ruiz moved from Fruitvale to Temescal — closer to work', neighborhood: 'Temescal', fromNeighborhood: 'Fruitvale' },
  { hookType: 'NEIGHBORHOOD_BOOM', domain: 'COMMUNITY', severity: 7, description: 'Temescal boom sustained — momentum 9/10', neighborhood: 'Temescal' },
  { hookType: 'RENT_BURDEN_CRISIS', domain: 'COMMUNITY', severity: 6, description: 'Household in Fruitvale spending 58% of income on housing', neighborhood: 'Fruitvale' },
  { hookType: 'FAME_WATCH', domain: 'CULTURE', severity: 3, priority: 3, description: 'Kesha Long — rising', text: 'rising', neighborhood: 'Uptown' },
  { hookType: 'DROPOUT_WAVE', domain: 'EDUCATION', severity: 6, description: 'East Oakland graduation rate at 61% (below crisis threshold)', neighborhood: 'East Oakland' },
  { hookType: 'CAREER_STAGNATION', domain: 'BUSINESS', severity: 3, description: 'Ravi Shah has not advanced in 4 years' },
  { hookType: 'CIVIC_APPROVAL_SCANDAL', domain: 'CIVIC', severity: 7, description: 'Holder entered scandal status', popid: 'POP-00300' },
  { hookType: 'MAYORAL_VETO', theme: 'CIVIC', domain: 'CIVIC', severity: 7, description: 'Mayor Santana vetoed X — fiscal', suggestedAngle: 'Mayor breaks with council majority - political fallout?' },
  { hookType: 'CITIZEN_HOSPITALIZED', domain: 'HEALTH', severity: 6, priority: 5, description: 'Lou Perez — admitted', text: 'admitted', neighborhood: 'Downtown' },
  { hookType: 'SOME_NEW_THING', severity: 4, description: 'a producer that forgot its domain' }
];

const ctx = { config: { cycleCount: 110 }, summary: {
  absoluteCycle: 110, cycleOfYear: 6, storyHooks: raw.map(h => Object.assign({}, h)),
  eventArcs: [{ arcId: 'ARC-1', type: 'faith', domainTag: 'FAITH', phase: 'rising', neighborhood: 'Chinatown', summary: 'A congregation splits over its building' }]
} };
sb.storyHookEngine_(ctx);
const out = ctx.summary.storyHooks;
const by = t => out.find(h => h.hookType === t);

console.log('engine.231 — carried hooks reach a desk and a journalist');
check('every carried hook survives the merge', raw.every(r => by(r.hookType)), out.map(h => h.hookType).join(','));
check('no carried hook carries its hookType as Domain', out.every(h => h.domain !== h.hookType));
check('the domain-less producer lands on GENERAL and is logged', by('SOME_NEW_THING').domain === 'GENERAL' && logs.some(l => /SOME_NEW_THING.*no domain/.test(l)), logs.join(' | '));
check('every carried hook has a hookId', raw.every(r => /^uuid-\d+/.test(by(r.hookType).hookId)));
check('every carried hook has suggestedDesks', raw.every(r => by(r.hookType).suggestedDesks), raw.map(r => r.hookType + '=' + by(r.hookType).suggestedDesks).join(','));
check('every carried hook has cycle/cycleOfYear', raw.every(r => by(r.hookType).cycle === 110 && by(r.hookType).cycleOfYear === 6));
check('text/priority normalization kept', by('CITIZEN_RELOCATED').text === raw[0].description && by('CITIZEN_RELOCATED').priority === 5);
check('hookType untouched (kimi slices regex on HookType)', raw.every(r => by(r.hookType).hookType === r.hookType));

const j = t => by(t).suggestedJournalist;
console.log('  journalists: ' + raw.map(r => r.hookType + '→' + j(r.hookType) + '/' + by(r.hookType).matchConfidence).join('; '));
check('COMMUNITY (move/boom/rent) → Maria Keen via the community themes', ['CITIZEN_RELOCATED', 'NEIGHBORHOOD_BOOM', 'RENT_BURDEN_CRISIS'].every(t => j(t) === 'Maria Keen'));
check('CULTURE fame → Kai Marston via the culture themes', j('FAME_WATCH') === 'Kai Marston');
check('EDUCATION → Angela Reyes via the education signal', j('DROPOUT_WAVE') === 'Angela Reyes');
check('BUSINESS → Jordan Velez via the business signal', j('CAREER_STAGNATION') === 'Jordan Velez');
check('HEALTH → Dr. Lila Mezran', j('CITIZEN_HOSPITALIZED') === 'Dr. Lila Mezran');
check('CIVIC hooks name a journalist', !!j('CIVIC_APPROVAL_SCANDAL') && !!j('MAYORAL_VETO'));
check('a producer-supplied suggestedAngle is kept', by('MAYORAL_VETO').suggestedAngle === raw[7].suggestedAngle);
check('desk strings come from the deskMap', by('CITIZEN_RELOCATED').suggestedDesks === 'Community Desk' && by('DROPOUT_WAVE').suggestedDesks === 'Education Desk' && by('FAME_WATCH').suggestedDesks === 'Culture Desk');

const faithArc = out.find(h => h.hookType === 'arc' && h.domain === 'FAITH');
check('makeHook FAITH arc still built (shared matcher)', !!faithArc && faithArc.suggestedDesks === 'Culture Desk', faithArc && JSON.stringify([faithArc.suggestedDesks, faithArc.suggestedJournalist]));
console.log('  faith arc → ' + (faithArc && faithArc.suggestedJournalist) + ' (arc hookType signal = crisis fires before the FAITH domain fallback — next cut)');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
