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

// 2026-10-11 — the pilot knows what the show is for (builder-direct). In-world
// register, exact command names, version marker.
check('version marker leads the brief', brief.startsWith(B.BRIEF_VERSION + '\n') && /^UNDOCKED-BRIEF\/\d+$/.test(B.BRIEF_VERSION));
check('version is never the reverted /3', B.BRIEF_VERSION !== 'UNDOCKED-BRIEF/3');
check('rules block present', brief.includes(B.SHOW_RULES.trim()));
check('the show: lottery + the chair', /drawn by lottery/.test(brief) && /hold the chair/.test(brief));
check('two-night run rule', /about two nights/.test(brief));
check('pilot does not bet', /You do not bet\. You fly\./.test(brief));
check('fourth wall: no engine words', !/tier|UsageCount|FameScore|simulation|video game|MCP|openrouter|ledger|POPID/i.test(B.SHOW_RULES));
check('contract commands exact, proven arg form first', brief.includes('spacemolt/get_missions') && brief.includes('spacemolt/accept_mission mission_id=')
  && brief.includes('spacemolt/get_active_missions') && brief.includes('spacemolt/complete_mission mission_id='));

// research.31 (builder 2026-10-30, ruling C): the board's score is named — the
// game's achievement points first, credits beside — and where to read it.
check('board names achievement points as the score', /achievement points/i.test(B.SHOW_RULES) && /credits/i.test(B.SHOW_RULES));
check('the score is readable from the console', brief.includes('spacemolt/get_achievements'));
check('the window is the runner cap', B.WINDOW_MINUTES === 20 && brief.includes(String(B.WINDOW_MINUTES) + ' minutes'));

// research.31 (builder approved codex's agency proposal §1–2): no coaching.
// Each of these is text a pre-/4 brief carried; none may come back.
const coaching = [
  [/flight plan|Tonight's flight:/i, 'a scripted flight plan'],
  [/^\s*\d\.\s/m, 'numbered steps'],
  [/1,500|3,500|5 to 10 a unit|per unit/i, 'a payout or price claim'],
  [/home space/i, 'the stay-home wall'],
  [/Hard stop|Done means done|flight is OVER|dock and stop/i, 'a hard stop'],
  [/Keep the log|Write it before your last dock|write one captains_log/i, 'a required log'],
  [/Keep chat to a minimum|you're working/i, 'a chat limit'],
  [/Never leave the ship dry|Refuel every time/i, 'a refuel rule'],
  [/too sparse|move to another belt|nearest asteroid belt/i, 'a mining route'],
  [/THE OBJECTIVE\. Bring credits home|only credits move the board/i, 'the credits-only objective'],
];
coaching.forEach(function (c) { check('no ' + c[1], !c[0].test(brief), String(c[0])); });

if (failed) { console.error('undockedMissionBrief: ' + failed + ' FAIL'); process.exit(1); }
console.log('undockedMissionBrief: ok');
