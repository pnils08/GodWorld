'use strict';

const { datawakeUserPrompt, datawakeStatementText } = require('./cron-civic-run');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const pack = {
  task: { a: 'district-week', goal: 'stand with KONO or leave it' },
  pulse: { lever: 'stand with KONO or leave it' },
};
const wall = '### YOUR OFFICIAL POSITION WALL\nstated: storefront audits';
const office = { agentDir: 'civic-office-crc-faction', holder: 'Warren Ashford' };
const prompt = datawakeUserPrompt(pack, wall, office);

const wallAt = prompt.indexOf(wall);
const leverAt = prompt.indexOf('THIS WEEK\'S LEVER (respond to this): stand with KONO or leave it');
const packAt = prompt.indexOf(JSON.stringify(pack));
const formatAt = prompt.indexOf('JSON only:');

check('wall before lever', wallAt !== -1 && wallAt < leverAt);
check('lever before pack json', leverAt !== -1 && leverAt < packAt);
check('pack json before output format', packAt !== -1 && packAt < formatAt);
check('format present', formatAt !== -1);

const noGoal = datawakeUserPrompt({ task: { a: 'district-week' } }, wall, office);
check('missing goal still puts wall before pack', noGoal.indexOf(wall) < noGoal.indexOf('{"task":'));
check('missing goal omits lever line', !noGoal.includes('THIS WEEK\'S LEVER (respond to this):'));
check('wall marked continuity-only before lever', prompt.indexOf('Prior wall is continuity only') < leverAt);
check('string statement kept', datawakeStatementText({ statement: 'stand with KONO' }) === 'stand with KONO');
check('object statement flattened', datawakeStatementText({
  statement: { quote: 'old wall', fullStatement: 'KONO at 0.27 vs city 0.489' },
}) === 'KONO at 0.27 vs city 0.489');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('cron-civic-datawake-prompt: ok');
