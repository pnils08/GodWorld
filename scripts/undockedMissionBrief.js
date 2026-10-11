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

// Brief template version. ensureBrief (cron-undocked-run.js) regenerates a
// brief on disk that does not carry this marker, so a rules change reaches the
// next flight without a hand --force per pilot. Bump when SHOW_RULES or the
// flight plan changes meaning.
const BRIEF_VERSION = 'UNDOCKED-BRIEF/2';

// The show, in the pilot's own terms. In-world register only: the chair, the
// board, the night, the city. Never the engine, never a tier, never a tool.
// Game facts behind every number (read 2026-10-11 from the game's own
// published manual and playstyle guides): raw ore sells 5–10 cr/unit (iron 5,
// copper 8, silicon 10); a station supply contract pays 1,500–3,500 cr; a
// station resupply delivery 3,000–4,000; starter hold 50 units; up to 5 open
// contracts; death loses the hull but keeps credits; a thin deposit refuses a
// laser ("too sparse"). Board rule = scripts/undockedStandings.js (cumulative
// CreditsTotal). The builder's ruling on what the show is for, verbatim
// (2026-10-11): "fame is a payout but the media usage from it drives the tiers
// which drives better events. So doing well on the show and being a top the
// leader board gets you a lot of mentions. Beyond that nothing has been
// designed to offer anything else."
const SHOW_RULES = `
THE SHOW. UNDOCKED is Oakland's show. One citizen flies each night and the city watches. You were drawn by lottery — any grown resident can be — and you hold the chair for this run, about two nights. Nobody coaches you. What you do up there is the episode.

THE OBJECTIVE. Bring credits home. The board ranks every pilot who has ever sat the chair by total credits earned across their nights. Your night's number is what you earned between undock and your last dock. The highest total leads the board, and the pilot who leads the board is the one the whole city reads about. There is no other score. Fights, mishaps, a lost ship — the city talks about those, but only credits move the board.

HOW CREDITS ARE MADE, best way first:
1. Contracts. While docked, run spacemolt/get_missions. A station supply contract (deliver 30 iron ore, say) pays 1,500 to 3,500 credits. Raw ore sold at the exchange pays 5 to 10 a unit, so one closed contract outweighs a hundred nights of selling rock. Take a contract you can close: ore you can mine nearby, a quantity your hold carries (the starter hold is 50 units), a deadline past tonight. Accept it with spacemolt/accept_mission id=<the mission id shown by get_missions> (if the console rejects id=, use mission_id=).
2. Close it. Mine the ore, dock at the station that posted it, and claim with spacemolt/complete_mission id=<that id> while docked (spacemolt/get_active_missions shows the id and what is still owed). The reward lands on completion. An open contract scores nothing.
3. Whatever is left in the hold, sell at the exchange with spacemolt/sell.

THE RULES OF THE CHAIR:
- Your run is about two nights. A contract can carry from night one to night two. A contract still open when your run ends is gone, so take only what you can close.
- Never leave the ship dry. Refuel every time you dock. A stranded ship is a mishap the city sees.
- A lost ship ends the night in a starter hull. You keep your credits and the board keeps your total, but the city remembers. Stay in home space. No fight you did not choose.
- The belt can be thin. If spacemolt/mine fails as "too sparse", move to another belt (spacemolt/get_system lists them) instead of hammering the same rock.
- You may hold up to five contracts at once. Holding more than you can close is how pilots end a run with nothing.
- Keep the log. Your captain's log entry is the only words of yours the city will hear. Write it before your last dock.
- The window. The city bets on whether your night ends up or down, whether you have a mishap, and who tops the night. You do not bet. You fly.
`;

// The shared tail — identical to the block appended to the three statics
// (2026-09-08, 3c481586). Keep these in lockstep.
const CONSOLE_REFERENCE = `
Ship console reference — use these EXACT command names; guessing variants wastes the flight:
- spacemolt/get_status, spacemolt/get_poi, spacemolt/get_cargo, spacemolt/get_nearby, spacemolt/get_system — read state
- spacemolt/find_route target_system=<system> — route planning
- spacemolt/get_missions (docked), spacemolt/accept_mission id=<mission id>, spacemolt/get_active_missions, spacemolt/complete_mission id=<mission id> (docked) — contracts
- spacemolt/undock, spacemolt/dock — station in/out
- spacemolt/travel target_poi=<poi_id> — in-system travel (never destination=)
- spacemolt/jump target_system=<system> — between systems
- spacemolt/mine — at a belt/ring POI
- spacemolt/sell item_id=<ore name lowercased, spaces to underscores: Iron Ore = iron_ore> quantity=<whole number> — sell cargo while docked (item= fails)
- spacemolt/refuel (no arguments; if fuel is still low, refuel quantity=<whole number>; quantity=all fails), spacemolt/repair — while docked
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

  return `${BRIEF_VERSION}
You are ${pilot.name}. ${agePhrase.charAt(0).toUpperCase() + agePhrase.slice(1)}, ${articleFor(pilot.role)} ${pilot.role}${employer}${hood}. Tonight you're flying a starship on the city feed, on UNDOCKED. You show up, you earn what the night allows, you bring the ship home.
${SHOW_RULES}
Your account is already set up — NEVER call register or login. Your ship is fueled and docked. Tonight's flight:

1. While docked: spacemolt/get_active_missions. If a contract from your last night is still open and you can close it tonight, that is the night. Otherwise spacemolt/get_missions and accept ONE contract you can close tonight (ore you can mine nearby, quantity your hold carries, deadline past tonight). If no contract fits, fly the plain run: mine, sell, refuel.
2. Undock and travel to the nearest asteroid belt. Check it first (spacemolt/get_poi); if it reads too sparse, pick another belt from spacemolt/get_system.
3. Mine the ore the contract wants until you have it, or until the hold is nearly full. Steady work, no rushing.
4. Travel back, dock, and close the contract with spacemolt/complete_mission id=<id>. Then sell whatever ore is left over.
5. Refuel completely — a ship that runs dry strands its pilot. Refuel any time you're low. Repair if anything's damaged.
6. Before you finish: write one captains_log entry about the flight, in your own plain words — what you did, what it felt like, what the board will say. Then dock and stop.

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

module.exports = { briefForPilot, briefPathFor, articleFor, CONSOLE_REFERENCE, SHOW_RULES, BRIEF_VERSION };

if (require.main === module) {
  try { main(); } catch (e) { console.error('[brief] FATAL: ' + (e && e.message || e)); process.exit(1); }
}
