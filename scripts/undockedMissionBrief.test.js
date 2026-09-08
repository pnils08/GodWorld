'use strict';

const B = require('./undockedMissionBrief');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const pilot = { popid: 'POP-01076', name: 'Nia Rook', birthYear: '1995',
  neighborhood: 'Fruitvale', role: 'Radio Host', employerName: 'KXCF' };
const brief = B.briefForPilot(pilot, { currentYear: 2042 });

check('age = year - BirthYear (never stored)', brief.includes('47 years old'));
check('name + role + hood in persona', brief.includes('Nia Rook') && brief.includes('Radio Host') && brief.includes('Fruitvale'));
check('employer name clause', brief.includes('working at KXCF'));
check('an-article for vowel role', B.articleFor('Engineer') === 'an' && B.articleFor('Dishwasher') === 'a');
check('an article used in brief', B.briefForPilot({ ...pilot, role: 'Engineer' }).includes('an Engineer'));

// The two preflight gates in scripts/undockedEpisode.js must pass.
check('preflight: register/login prohibition', /never.*(register|login)/i.test(brief));
check('preflight: refuel authority', /refuel/i.test(brief));

check('cheatsheet present', brief.includes('spacemolt_market/view_market') && brief.includes('spacemolt_social/captains_log_add'));
check('hard stop present', brief.includes('Hard stop'));
check('captains_log step present', brief.includes('captains_log entry'));

// Employer omitted cleanly when unresolvable; age omitted when BirthYear absent.
const bare = B.briefForPilot({ popid: 'POP-00001', name: 'Ada Lovelace', neighborhood: 'Downtown', role: 'Clerk' });
check('no employer clause when absent', !bare.includes('working at'));
check('no age when BirthYear absent', /a working adult/i.test(bare));

// Determinism.
check('deterministic', B.briefForPilot(pilot, { currentYear: 2042 }) === brief);

// Missing required fields fail loud.
let threw = false;
try { B.briefForPilot({ popid: 'POP-1', name: 'X' }); } catch (_) { threw = true; }
check('missing role/neighborhood throws', threw);

check('brief path convention', B.briefPathFor('POP-01076').endsWith('missions/undocked-pop01076.txt'));

if (failed) { console.error('undockedMissionBrief: ' + failed + ' FAIL'); process.exit(1); }
console.log('undockedMissionBrief: ok');
