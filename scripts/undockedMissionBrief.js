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
 * The template carries what the runner's preflight and the 2026-09-08
 * post-mortem proved load-bearing: the NEVER register/login prohibition, refuel
 * authority (the console's refuel line), and the exact-command cheatsheet. The
 * hard stop left in /4 (research.31): the runner ends a night when the pilot
 * stops calling the console, or at the window.
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

// Brief template version. ensureBrief (cron-undocked-run.js) regenerates a
// brief on disk that does not carry this marker, so a rules change reaches the
// next flight without a hand --force per pilot. Bump when SHOW_RULES or the
// invitation changes meaning. (/3 was the reverted 2026-10-29 "leave Sol" cut —
// never reuse it.)
//
// /4 (research.31, builder 2026-10-30 — rulings C and "approved" on codex's
// agency proposal, docs/for-claude-review/2026-10-29-codex-undocked-agency-and-reporting.md
// §Proposed work 1–2): the pilot gets who they are, the show, how the board
// scores, the window, and the console — then plays. Gone: the scripted
// contract/mine/sell route, the static payout claims, the stay-in-home-space
// wall, the required captain's log, the chat limit, the hard stop. SpaceMolt
// is already a game with its own rules; the brief does not coach it.
const BRIEF_VERSION = 'UNDOCKED-BRIEF/5';

// One night in the chair, in minutes. cron-undocked-run.js defaults its
// --minutes to this, so the brief and the runner cap cannot drift (builder
// approved 20, 2026-10-30; 16 of 29 October flights hit the old 10).
const WINDOW_MINUTES = 20;

// The show, in the pilot's own terms. In-world register only: the chair, the
// board, the night, the city. Board rule = scripts/undockedStandings.js
// (achievement points, then credits). The game's achievements are its own
// (get_achievements: id, points, earned_at; 62 public + hidden, 5–75 pts).
const SHOW_RULES = `
THE SHOW. UNDOCKED is Oakland's show. You were drawn by lottery — any grown resident can be — and you hold the chair for about two nights. The city watches. Nobody coaches you. What you do out there is the episode.

THE BOARD. The galaxy keeps its own record of what a captain has done — its achievements, each worth points. Every step toward an achievement scores its share of those points, not only finishing it: an achievement worth 10 for ten systems explored pays 1 for each new system. The board ranks every pilot who has ever sat the chair by those points, added up across their nights. Credits earned sit beside the points and break a tie. spacemolt/get_achievements shows every achievement, what each is worth, and your progress toward it.

THE NIGHT. About ${WINDOW_MINUTES} minutes. Fly it however you choose. When you are done, stop. Your captain's log is yours to write or skip — it is the only words of yours the city hears. The city bets on your night. You do not bet. You fly.
`;

// Console names only — what each command is called and how its arguments are
// spelled, from the 2026-09-08 / 09-30 post-mortems (guessed names and arg
// forms burned whole flights). No strategy, no stop rule.
const CONSOLE_REFERENCE = `
Ship console reference — EXACT command names; guessing variants wastes the night:
- spacemolt/get_status, spacemolt/get_poi, spacemolt/get_cargo, spacemolt/get_nearby, spacemolt/get_system — read state
- spacemolt/get_achievements — the board's score: every achievement, its points, which you hold
- spacemolt/find_route target_system=<system> — route planning
- spacemolt/get_missions (docked), spacemolt/accept_mission mission_id=<mission id>, spacemolt/get_active_missions, spacemolt/complete_mission mission_id=<mission id> (docked) — contracts (mission_id= is the proven form; id= is the fallback if the console rejects it)
- spacemolt/undock, spacemolt/dock — station in/out
- spacemolt/travel target_poi=<poi_id> — in-system travel (never destination=)
- spacemolt/jump target_system=<system> — between systems
- spacemolt/mine — at a belt/ring POI
- spacemolt/sell item_id=<item name lowercased, spaces to underscores: Iron Ore = iron_ore> quantity=<whole number> — sell cargo while docked (item= fails)
- spacemolt/refuel (no arguments; if fuel is still low, refuel quantity=<whole number>; quantity=all fails), spacemolt/repair — while docked
- spacemolt_market/view_market — market browsing (this namespace, NOT spacemolt/view_market)
- spacemolt_social/captains_log_add entry=<text> — your log (this namespace, NOT spacemolt/captains_log_add)
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

  return `${BRIEF_VERSION}
You are ${pilot.name}. ${agePhrase.charAt(0).toUpperCase() + agePhrase.slice(1)}, ${articleFor(pilot.role)} ${pilot.role}${employer}${hood}. Tonight you're flying a starship on the city feed, on UNDOCKED.
${SHOW_RULES}
Your account is already set up — NEVER call register or login. Your ship is fueled and docked.
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

module.exports = { briefForPilot, briefPathFor, articleFor, CONSOLE_REFERENCE, SHOW_RULES, BRIEF_VERSION, WINDOW_MINUTES };

if (require.main === module) {
  try { main(); } catch (e) { console.error('[brief] FATAL: ' + (e && e.message || e)); process.exit(1); }
}
