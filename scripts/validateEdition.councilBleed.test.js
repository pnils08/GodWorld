// Regression test for S265 ES-2 (C98 G-W validator fix).
//
// checkCouncilNames built its district/faction patterns with `[^.]*?` between
// the member name and a D#/OPP/CRC/IND token. `[^.]` includes newlines, so in a
// period-less footer list (NAMES INDEX / CITIZEN USAGE LOG) the gap bled from
// one member's name across many lines until it hit ANOTHER line's bare token —
// the C98 26-false-positive CRITICAL storm (every council name mis-bound to the
// bare D7/CRC tokens in Ashford's line). The fix bounds the gap to one line
// with `[^.\n]*?`. This fixture has the exact bleed-prone shape: each member on
// its own period-less line; one line (Ashford) carries bare D7 + CRC tokens
// that are CORRECT for that member but WRONG for every other member.

var { checkCouncilNames } = require('./validateEdition');

var canon = {
  council: [
    { member: 'Janae Rivers',   district: 'D5', faction: 'OPP', status: 'active' },
    { member: 'Warren Ashford', district: 'D7', faction: 'CRC', status: 'active' },
    { member: 'Ramon Vega',     district: 'D4', faction: 'IND', status: 'active' },
    { member: 'Nina Chen',      district: 'D8', faction: 'OPP', status: 'active' },
  ],
};

// Period-less footer list — the structure that triggered the bleed. Note the
// Ashford line carries bare "D7" and "CRC"; every other line is token-free.
var editionText = [
  'CITIZEN USAGE LOG',
  '',
  'CIVIC / GOVERNMENT',
  '- Janae Rivers — City Council, District 5; voted yes on the apprenticeship measure (FP1)',
  '- Ramon Vega — City Council President, District 4; chaired the session (FP1)',
  '- Nina Chen — City Council, District 8; voted yes (FP1)',
  '- Warren Ashford — City Council, D7, CRC; audit request deferred (C1)',
  '',
].join('\n');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

console.log('=== S265 ES-2 council-regex bleed regression (C98 G-W) ===');

var issues = checkCouncilNames(editionText, canon, new Set());
var councilIssues = issues.filter(function (i) {
  return i.check === 'Council District' || i.check === 'Council Faction';
});

councilIssues.forEach(function (i) { console.log('    issue: ' + i.detail); });

ok(councilIssues.length === 0,
   'zero false-positive Council District/Faction issues from the period-less footer (got ' + councilIssues.length + ')');

console.log((fail === 0 ? 'ALL ' + pass + ' ASSERTIONS PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);
