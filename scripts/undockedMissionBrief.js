#!/usr/bin/env node
'use strict';

/**
 * undockedMissionBrief.js — UNDOCKED mission-brief generator (plan (a′) piece
 * 2, docs/plans/2026-08-07-spacemolt-game-show.md; builder go 2026-09-08 S438).
 *
 * Deterministic brief text from Undocked_Draw row fields (Name, BirthYear,
 * Neighborhood, Role, + Employer NAME when the caller can resolve the tab's
 * EmployerBizId — a raw BIZ-ID is never read to the pilot). Replaces the three
 * hand-written statics for newly drawn pilots; the statics stay for draw-1's
 * cast until a reseed retires them.
 *
 * The template carries the three things the runner's preflight and the
 * 2026-09-08 episode post-mortem proved load-bearing: the NEVER register/login
 * prohibition, refuel authority, and the exact-command cheatsheet + hard stop.
 *
 * Usage:
 *   node scripts/undockedMissionBrief.js --popid POP-01076 --name "Nia Rook" \
 *     --birth-year 1995 --neighborhood Fruitvale --role "Radio Host" \
 *     [--employer-name "KXCF"] [--year 2042] [--write] [--force]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MISSIONS_DIR = path.join(ROOT, 'output', 'spacemolt-show', 'missions');

function articleFor(role) {
  return /^[aeiou]/i.test(String(role || '').trim()) ? 'an' : 'a';
}

// The shared tail — identical to the block appended to the three statics
// (2026-09-08, 3c481586). Keep these in lockstep.
const CONSOLE_REFERENCE = `
Ship console reference — use these EXACT command names; guessing variants wastes the flight:
- spacemolt/get_status, spacemolt/get_poi, spacemolt/get_cargo, spacemolt/get_nearby, spacemolt/get_system — read state
- spacemolt/find_route target_system=<system> — route planning
- spacemolt/undock, spacemolt/dock — station in/out
- spacemolt/travel target_poi=<poi_id> — in-system travel (never destination=)
- spacemolt/jump target_system=<system> — between systems
- spacemolt/mine — at a belt/ring POI
- spacemolt/sell item=<ore name> quantity=<n> — sell cargo while docked
- spacemolt/refuel quantity=all, spacemolt/repair — while docked
- spacemolt_market/view_market — market browsing (this namespace, NOT spacemolt/view_market)
- spacemolt_social/captains_log_add entry=<text> — your flight log (this namespace, NOT spacemolt/captains_log_add)

Hard stop: the moment your captains_log entry is written and you are docked, the flight is OVER. Make no further tool calls — no new errands, no exploring, no side trips. Done means done.
`;

// pilot: {popid, name, birthYear?, age?, neighborhood, role, employerName?}
// age = currentYear − BirthYear (never a stored age — the (a′) contract rule).
function briefForPilot(pilot, opts) {
  const year = (opts && opts.currentYear) || 2042;
  const age = pilot.age != null ? Number(pilot.age)
    : (pilot.birthYear ? year - Number(pilot.birthYear) : null);
  if (!pilot.name || !pilot.role || !pilot.neighborhood) {
    throw new Error('brief needs name, role, and neighborhood (got: ' +
      [pilot.name, pilot.role, pilot.neighborhood].join(' / ') + ')');
  }
  const agePhrase = age != null && Number.isFinite(age) ? age + ' years old' : 'a working adult';
  const employer = pilot.employerName ? ', working at ' + pilot.employerName : '';
  const hood = pilot.neighborhood ? ' in ' + pilot.neighborhood : '';

  return `You are ${pilot.name}. ${agePhrase.charAt(0).toUpperCase() + agePhrase.slice(1)}, ${articleFor(pilot.role)} ${pilot.role}${employer}${hood}. Tonight you're flying a starship on the city feed. You show up, you do the job right, you bring the ship home.

Your account is already set up — NEVER call register or login. Your ship is fueled and docked. Tonight's flight:

1. Undock and travel to the nearest asteroid belt.
2. Mine ore until your cargo hold is nearly full. Steady work, no rushing.
3. Travel to a station, dock, and sell all your ore.
4. Refuel completely — a ship that runs dry strands its pilot. Refuel any time you're low. Repair if anything's damaged.
5. Before you finish: write one captains_log entry about the flight, in your own plain words — what you did, what it felt like. Then dock and stop.

Keep chat to a minimum. If someone talks to you, be polite and brief — you're working.
${CONSOLE_REFERENCE}`;
}

function briefPathFor(popid) {
  return path.join(MISSIONS_DIR, 'undocked-' + String(popid).toLowerCase().replace(/-/g, '') + '.txt');
}

function parseArgs(argv) {
  const a = { write: false, force: false, year: 2042 };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--popid') { a.popid = v; i++; }
    else if (k === '--name') { a.name = v; i++; }
    else if (k === '--birth-year') { a.birthYear = v; i++; }
    else if (k === '--age') { a.age = v; i++; }
    else if (k === '--neighborhood') { a.neighborhood = v; i++; }
    else if (k === '--role') { a.role = v; i++; }
    else if (k === '--employer-name') { a.employerName = v; i++; }
    else if (k === '--year') { a.year = parseInt(v, 10); i++; }
    else if (k === '--write') { a.write = true; }
    else if (k === '--force') { a.force = true; }
    else { console.error('unknown arg: ' + k); process.exit(2); }
  }
  return a;
}

function main() {
  const a = parseArgs(process.argv);
  if (!a.popid) { console.error('--popid required'); process.exit(2); }
  const brief = briefForPilot(a, { currentYear: a.year });
  if (!a.write) { process.stdout.write(brief); return; }
  const p = briefPathFor(a.popid);
  if (fs.existsSync(p) && !a.force) {
    console.log('[brief] exists, keeping: ' + path.relative(ROOT, p) + ' (--force to overwrite)');
    return;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, brief);
  console.log('[brief] wrote ' + path.relative(ROOT, p));
}

module.exports = { briefForPilot, briefPathFor, articleFor, CONSOLE_REFERENCE };

if (require.main === module) {
  try { main(); } catch (e) { console.error('[brief] FATAL: ' + (e && e.message || e)); process.exit(1); }
}
