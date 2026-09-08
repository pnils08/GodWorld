'use strict';

const O = require('./cron-undocked-run');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

// Fixture rows in the (a′) contract shape:
// TargetCycle | DrawCycle | Seed | Slot | POPID | Name | BirthYear | Neighborhood | Role | Employer
function row(target, slot, popid, name) {
  return { TargetCycle: String(target), DrawCycle: String(target - 1), Seed: 's',
    Slot: slot, POPID: popid, Name: name, BirthYear: '1990',
    Neighborhood: 'Fruitvale', Role: 'Clerk', Employer: '' };
}
const rows = [
  row(121, 'cast-1', 'POP-01101', 'Cast One'),
  row(121, 'cast-3', 'POP-01103', 'Cast Three'),
  row(121, 'cast-2', 'POP-01102', 'Cast Two'),
  row(121, 'alt-2', 'POP-01202', 'Alt Two'),
  row(121, 'alt-1', 'POP-01201', 'Alt One'),
  row(120, 'cast-1', 'POP-01001', 'Last Cycle Pilot'),
];

const roster = O.drawRowsToRoster(rows, 121);
check('filters to the target cycle', roster.cast.length === 3 && roster.alternates.length === 2);
check('cast in Slot order', roster.cast.map(p => p.popid).join(',') === 'POP-01101,POP-01102,POP-01103');
check('alts in Slot order', roster.alternates.map(p => p.popid).join(',') === 'POP-01201,POP-01202');
check('fields carried', roster.cast[0].name === 'Cast One' && roster.cast[0].birthYear === '1990' &&
  roster.cast[0].neighborhood === 'Fruitvale' && roster.cast[0].role === 'Clerk');
check('slot recorded', roster.cast[0].slot === 'cast-1');

check('wrong cycle -> empty (caller falls back)', O.drawRowsToRoster(rows, 122).cast.length === 0);
check('no rows -> empty', O.drawRowsToRoster([], 121).cast.length === 0);
check('null rows -> empty', O.drawRowsToRoster(null, 121).cast.length === 0);

check('session name convention', O.sessionName('POP-01101') === 'undocked-pop01101');

if (failed) { console.error('cron-undocked-run: ' + failed + ' FAIL'); process.exit(1); }
console.log('cron-undocked-run: ok');
