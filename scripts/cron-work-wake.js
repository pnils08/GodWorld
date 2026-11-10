#!/usr/bin/env node
/* cron-work-wake — work-day wakes for WORKING citizens (civic.34, plan:
 * docs/plans/2026-09-16-work-wake-packs.md).
 *
 * citizen-wake.js wakes a rotating citizen on their neighborhood life; cron-civic-run
 * --stage=datawake wakes agented officeholders into official acts. THIS wakes the
 * citizens in between on their work: the medical examiner sits with the day's dead,
 * the EMS director with the day's admissions, a player with his own line in the
 * sports feed. Registry: scripts/work-wake-packages.json (package-only fan-out).
 *
 * Perception is assembled from LOCAL beats dumps only (output/beats/*.jsonl, kept
 * current by dumpBeatTabs.js) — no fresh sheet reads on the perception path.
 *
 * Phase-1 gate discipline carried over from citizen-wake verbatim: perception +
 * reflection + page accretion + Reflection_Intake tag (applied=no) ONLY. Never
 * applyTaggedEvent_, never dials/LifeHistory writes. The gated cycle read
 * (utilities/compressLifeHistory.js) consumes the intake row downstream.
 *
 * Run: node scripts/cron-work-wake.js [--dry-run] [--pack=<persona>] [--cycle=N] [--limit=N]
 *   --dry-run : assemble pack + generate the reflection, print it, write NOTHING.
 *   --pack    : force a specific registry persona (testing/override) instead of due-selection.
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
const page = require('/root/GodWorld/lib/citizenPage');
const classifier = require('/root/GodWorld/lib/reflectionClassifier');
const getCurrentCycle = require('/root/GodWorld/lib/getCurrentCycle');
const { loadOwnPageReadback, loadOwnFeedLines, feedNamedKeys, feedNameKey, loadVoiceTexture } = require('/root/GodWorld/lib/wakePerception');
const dials = require('/root/GodWorld/lib/citizenDials');
const registry = require('./workWakePackages');
const { centralDate } = require('./centralDate');   // the Central day the crontab runs on; the UTC date is the next day at the 20:18 run

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const arg = (k, d) => { const m = ARGV.find((a) => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const FORCE_PACK = arg('pack', null);
// Builder ruling 2026-09-22: workers wake as their jobs need — every due pack
// wakes each run unless --limit=N caps it. The old default of 1 left the
// Tuesday-only directors on a ~7-cycle rotation, past the 6-cycle upkeep grace
// (civic.38 ruling (c)), so a tended service decayed between shifts.
const LIMIT = arg('limit', null) == null ? Infinity : Math.max(1, Number(arg('limit', null)) || 1);

const BEATS_DIR = path.join(__dirname, '..', 'output', 'beats');
const NAMES_TSV = path.join(__dirname, '..', 'output', 'citizen-names.tsv');
const STATE_FILE = path.join(__dirname, '..', 'logs', 'work-wake-state.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'cron-work-wake.log');
const DAYPART = 'work'; // Reflection_Intake col D token — the gated reader filters on `applied`, not daypart
// pipeline.96 — the shift's page doc is keyed by its weekday (citizenPage `day`): the shift fires Tue and Thu, and the
// store appends a second write under a taken key into the first doc, so one Cycle's two shifts merged into one.
// On 2026-10-30 after codex review.
const PAGE_DAY_KEY = true;
const RECENT_MEMORY = 50;

function logLine(s) {
  const line = `[${new Date().toISOString()}] ${s}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (e) {}
  console.log(s);
}
function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return { recent: [], wokenCycle: {} }; } }
function saveState(st) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2)); } catch (e) {} }

// ---- local beats reads (fs only) ------------------------------------------------------------
function readBeats(name, beatsDir) {
  try {
    const p = path.join(beatsDir || BEATS_DIR, name + '.jsonl');
    return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  } catch (e) { return null; }
}

function lookupNameTsv(popId, namesPath) {
  try {
    for (const line of fs.readFileSync(namesPath || NAMES_TSV, 'utf8').split('\n')) {
      const [id, name, nh] = line.split('\t');
      if (id && id.toUpperCase() === popId) return { name, neighborhood: nh || '' };
    }
  } catch (e) {}
  return null;
}

const cap = (s, n) => { s = String(s || '').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// ---- node builders — each returns a text block or null (skip, never fatal) -------------------
const NODE_BUILDERS = {
  'hospital-deaths': (pkg, cycle, beatsDir) => {
    const rows = readBeats('Hospital_Ledger', beatsDir);
    if (!rows) return null;
    const dead = rows.filter((r) => /dea|died|deceased/i.test(String(r.Outcome || '') + ' ' + String(r.StatusNow || '')));
    const moved = rows.filter((r) => cycle != null && Number(r.LastTransitionCycle) === Number(cycle));
    const seen = new Set();
    const lines = [];
    for (const r of dead.concat(moved)) {
      const k = r.AdmissionId || r.POPID;
      if (!k || seen.has(k)) continue;
      seen.add(k);
      lines.push(`${r.Name} (${r.Neighborhood}) — ${r.Cause}; ${r.Outcome || r.StatusNow || 'in care'}.`);
    }
    if (!lines.length) return 'No deaths or transitions on the books this cycle.';
    return 'On the table and the ledger this cycle:\n' + lines.slice(0, 8).join('\n');
  },
  'hospital-admissions': (pkg, cycle, beatsDir) => {
    const rows = readBeats('Hospital_Ledger', beatsDir);
    if (!rows) return null;
    const adm = rows.filter((r) => cycle != null && Number(r.AdmitCycle) === Number(cycle));
    const pool = adm.length ? adm : rows.filter((r) => String(r.StatusNow || '').match(/active|hospitalized/i));
    if (!pool.length) return 'No new admissions this cycle; the board is quiet.';
    return 'Admissions on the board:\n' + pool.slice(0, 8).map((r) => `${r.Name} (${r.Neighborhood}) — ${r.Cause}.`).join('\n');
  },
  'health-cause-queue': (pkg, cycle, beatsDir) => {
    const rows = readBeats('Health_Cause_Queue', beatsDir);
    if (!rows || !rows.length) return null;
    return 'Health queue:\n' + rows.slice(0, 6).map((r) => `${r.Name} (${r.Neighborhood}) — ${r.Status}, ${r.AssignedCause}.`).join('\n');
  },
  'civic-office': (pkg, cycle, beatsDir) => {
    const rows = readBeats('Civic_Office_Ledger', beatsDir);
    if (!rows) return null;
    const mine = rows.find((r) => String(r.PopId || '').toUpperCase() === pkg.popid);
    if (!mine) return null;
    const bits = [`Your office: ${mine.Title} (${mine.OfficeId})`];
    if (mine.Approval !== '' && mine.Approval != null) bits.push(`standing with the city around ${mine.Approval}`);
    if (mine.Notes) bits.push(cap(mine.Notes, 120));
    return bits.join('; ') + '.';
  },
  'cycle-weather': (pkg, cycle, beatsDir) => {
    const rows = readBeats('Cycle_Weather', beatsDir);
    if (!rows) return null;
    const mine = cycle != null ? rows.filter((r) => Number(r.Cycle) === Number(cycle)) : rows.slice(-3);
    if (!mine.length) return null;
    return 'Weather this cycle:\n' + mine.slice(0, 4).map((r) => Object.entries(r).filter(([k]) => k !== 'Cycle').map(([k, v]) => `${k} ${v}`).join(', ')).join('\n');
  },
  'crime-metrics': (pkg, cycle, beatsDir) => {
    const rows = readBeats('Crime_Metrics', beatsDir);
    if (!rows) return null;
    const mine = cycle != null ? rows.filter((r) => Number(r.LastUpdated) === Number(cycle)) : rows;
    if (!mine.length) return null;
    const hot = mine.slice().sort((a, b) => (Number(b.ViolentCrimeIndex) || 0) - (Number(a.ViolentCrimeIndex) || 0)).slice(0, 5);
    return 'Crime picture this cycle:\n' + hot.map((r) => `${r.Neighborhood} — violent index ${r.ViolentCrimeIndex}, ${r.IncidentCount} incidents, clearance ${r.ClearanceRate}.`).join('\n');
  },
  // pipeline.110 — every public feed row of the Cycle that names him, its note whole, his own stat segment
  // (lib/wakePerception loadOwnFeedLines). It used to hand him ONE row cut to 220 characters, and when the Cycle
  // did not name him it handed him the newest old row as if it were this week's. Not named this Cycle = no block.
  'sports-player': (pkg, cycle, beatsDir) => {
    const own = loadOwnFeedLines(pkg.playerName || pkg.name, cycle, { beatsDir });
    return own.block || null;
  },
  // pipeline.110 — the officeholder's own record of the Cycle. Read off their page before the pack is built
  // (wakeOne: loadOfficeWeek) because the builders are synchronous and local; a pack with nothing prefetched skips.
  'office-week': (pkg) => {
    const lines = Array.isArray(pkg._officeWeek) ? pkg._officeWeek : [];
    if (!lines.length) return null;
    return 'What your office put on the record this cycle — your own words and acts, in order:\n' + lines.map((l) => '- ' + l).join('\n');
  },
  // pipeline.110 — the companies the Business_Ledger names him founder or owner of, read the way he would read them.
  'own-company': (pkg, cycle, beatsDir) => {
    const rows = readBeats('Business_Ledger', beatsDir);
    if (!rows) return null;
    const mine = rows.filter((r) => String(r.Key_Personnel || '').toUpperCase().indexOf(pkg.popid) !== -1);
    if (!mine.length) return null;
    const money = (v) => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return isFinite(n) && n ? '$' + (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n).toLocaleString('en-US')) : null; };
    const prev = readBeats('Business_Ledger', path.join(beatsDir || BEATS_DIR, 'prev')) || [];
    return 'Your companies, off the city\'s business ledger this cycle:\n' + mine.map((r) => {
      const was = prev.find((p) => p.BIZ_ID === r.BIZ_ID);
      const bits = [`${r.Name} (${r.Sector}, ${r.Neighborhood})`, `${r.Employee_Count} people`];
      if (money(r.Annual_Revenue)) bits.push('revenue ' + money(r.Annual_Revenue));
      if (r.Growth_Rate !== '' && r.Growth_Rate != null) bits.push('growth ' + String(r.Growth_Rate).replace(/%$/, '') + '%');
      if (was && String(was.Employee_Count) !== String(r.Employee_Count)) bits.push('headcount was ' + was.Employee_Count + ' last cycle');
      if (was && money(was.Annual_Revenue) && money(was.Annual_Revenue) !== money(r.Annual_Revenue)) bits.push('revenue was ' + money(was.Annual_Revenue) + ' last cycle');
      return '- ' + bits.join('; ') + '.';
    }).join('\n');
  },
  'initiative-project': (pkg, cycle, beatsDir) => {
    // civic.38 Task 9 step 2 — a project director's operational read: their
    // initiative's row off the beats dump (phase, stage when the Task 4
    // column exists, latest milestone, next scheduled action). ~600 chars.
    const rows = readBeats('Initiative_Tracker', beatsDir);
    if (!rows) return null;
    const row = rows.find((r) => String(r.InitiativeID || '') === String(pkg.initiative || ''));
    if (!row) return null;
    const lines = [
      `Your project: ${row.Name} (${row.InitiativeID}).`,
      `It is in ${row.ImplementationPhase || '—'}${row.Stage ? ', stage ' + row.Stage : ''} (status ${row.Status || '—'}).`,
    ];
    // Job 3 — the same state line the seat board shows (lib stageRequirement):
    // a site says when it opens, an open service says what it has to move. The
    // director's own schedule notes below are theirs; this line is the city's.
    const state = require('./initiativeTrackerSnapshot').stageState(row);
    if (state) lines.push('Where it stands: ' + state + '.');
    // MilestoneNotes appends — the newest line is the LAST one (agy 2026-09-25).
    const latest = String(row.MilestoneNotes || '').split('\n').map(l => l.trim()).filter(Boolean).pop();
    if (latest) lines.push('Latest milestone: ' + cap(latest, 180));
    if (row.NextScheduledAction) lines.push('Next on the books: ' + cap(row.NextScheduledAction, 120) + (row.NextActionCycle ? ' (cycle ' + row.NextActionCycle + ').' : '.'));
    return cap(lines.join('\n'), 600);
  },
};

function buildWorkPack(pkg, cycle, beatsDir, namesPath) {
  const blocks = [];
  const nodes = [];
  for (const node of pkg.dataNodes) {
    const builder = NODE_BUILDERS[node];
    if (!builder) continue;
    let block = null;
    try { block = builder(pkg, cycle, beatsDir); } catch (e) { block = null; }
    if (block) { blocks.push(block); nodes.push(node); }
  }
  // pipeline.110 — whoever the feed names this Cycle knows it at work, player or not (a chief at a club's
  // community event, an owner in a franchise story). The player node above already carries it.
  if (pkg.dataNodes.indexOf('sports-player') === -1) {
    let own = null;
    try { own = loadOwnFeedLines(pkg.name, cycle, { beatsDir }); } catch (e) { own = null; }
    if (own && own.block) { blocks.push(own.block); nodes.push('own-feed'); }
  }
  if (!blocks.length) return null;
  const idBits = [`You are ${pkg.name}`];
  const known = lookupNameTsv(pkg.popid, namesPath);
  if (known && known.neighborhood) idBits.push(`you live in ${known.neighborhood}`);
  return { identity: idBits.join(', ') + '.', blocks, nodes };
}

// ---- the director's shift is a work move (civic.38 ruling (d), 2026-09-21) -------------------
// A project director's work-wake shift counts as tending their initiative. The
// engine reads `LastWorkCycle` (Standing clears on it, the untended clock runs
// from it, upkeep decays without it) and only the Sunday fold writes that
// column — from `work` moves in the week's move ledger. Datawake seats file
// theirs through validateDatawakeMoves; a director has no datawake seat, so
// the shift itself files the move: one line, same ledger, same shape the fold
// groups on (type 'work', payload.initiativeId, status 'pending'). moveId
// carries the date, so a same-day rerun dedups under the fold's last-line-wins
// read. Returns null when the pack has no initiative or the initiative-project
// node produced nothing (the row was not on the beats dump — no row, no work).
function workMoveLine(pkg, pack, cycle, date) {
  const initiativeId = String((pkg && pkg.initiative) || '').trim();
  if (!initiativeId) return null;
  if (!pack || !Array.isArray(pack.nodes) || pack.nodes.indexOf('initiative-project') === -1) return null;
  const c = Number(cycle);
  if (!Number.isInteger(c) || c < 1) return null;
  const d = String(date || centralDate());
  return {
    moveId: 'MV-' + c + '-' + pkg.persona + '-' + d,
    cycle: c, date: d, agentDir: pkg.persona, popid: pkg.popid || null,
    type: 'work', payload: { initiativeId, source: 'work-wake' }, status: 'pending',
    at: new Date().toISOString(),
  };
}

// ---- packs nobody hand-registered (pipeline.110, builder 2026-11-10) ---------------------------
// The registry is ten people. The citizens this city turns on — the Mayor, the council, the players the feed
// names — had no work wake, so their pages held what was said ABOUT them and nothing of their own week. Two
// rules make a pack without a registry entry; a registry entry for the same citizen always wins:
//   player  — a GAME-clock ledger citizen the sports feed names this Cycle wakes on his own feed lines, once.
//   office  — every agented office and project in civic-office-map.json wakes on its own record of the Cycle, once.
// Identity is read, never written here: the role off the ledger / the office map, the voice off the citizen's
// own authored file where one exists, otherwise the temperament off his dials.
const LEDGER_SNAPSHOT = path.join(__dirname, '..', 'output', 'simulation_ledger_snapshot.jsonl');
const OFFICE_MAP = path.join(__dirname, 'civic-office-map.json');
const AGENTS_DIR = path.join(__dirname, '..', '.claude', 'agents');
const AUTO_MODEL = { provider: 'openrouter', model: 'deepseek/deepseek-v4-flash-0731' };   // the registry's own model
// Mike Paulson speaks for himself: no cron writes his inner life.
const SELF_SPEAKING = { 'POP-00527': true };
const PRIVATE_FRAME = 'This is private — nobody reads it, and you are not performing the job here. You are not a writer.';

function ledgerRows(file) {
  try {
    return fs.readFileSync(file || LEDGER_SNAPSHOT, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  } catch (e) { return []; }
}
function dispositionOf(row) {
  try { const cur = dials.currentDials(row && row.DialState); return cur ? dials.disposition(cur) : ''; } catch (e) { return ''; }
}
// The authored identity an office agent already carries: who they are, how they decide, how they sound.
function agentIdentityNotes(agentDir, agentsDir) {
  let md;
  try { md = fs.readFileSync(path.join(agentsDir || AGENTS_DIR, agentDir, 'IDENTITY.md'), 'utf8'); } catch (e) { return ''; }
  const section = (re) => { const m = md.split(re)[1]; return m ? m.split(/^## /m)[0] : ''; };
  const plain = (t) => String(t || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  const out = [];
  const who = section(/^## Who You Are\s*$/m).split(/\n\s*\n/).map(plain).filter((x) => x && !/^(Faction|POP ID|Name|Role|Home|Age|Standing):/i.test(x) && !/POP-\d{5}/.test(x))[0];
  if (who) out.push(who);
  const sig = (md.match(/\*\*Decision signature:\*\*\s*([^\n]+)/) || [])[1];
  if (sig) out.push('How you decide: ' + plain(sig));
  const voice = section(/^## Voice\s*$/m).split(/\n\s*\n/).map(plain).filter(Boolean)[0];
  if (voice && !/^Past commitment/i.test(voice)) out.push(voice);
  return out.join(' ').slice(0, 700);
}
function voiceNotesFor(popid, agentDir, row, agentsDir) {
  const bits = [];
  const authored = agentDir ? agentIdentityNotes(agentDir, agentsDir) : '';
  if (authored) bits.push(authored);
  let texture = '';
  try { texture = loadVoiceTexture(popid); } catch (e) { texture = ''; }
  if (texture) bits.push('How you talk: ' + texture);
  const disp = dispositionOf(row);
  if (disp) bits.push('Your temperament: ' + disp + '.');
  return bits.join(' ') || 'Plain, in your own words.';
}

function autoPackages(cycle, packages, opts) {
  const o = opts || {};
  const out = {};
  const taken = new Set(Object.values(packages || {}).filter((v) => v && v.active).map((v) => String(v.popid).toUpperCase()));
  const rows = o.ledger || ledgerRows(o.ledgerFile);
  const byPop = {}; rows.forEach((r) => { byPop[String(r.POPID).toUpperCase()] = r; });
  const add = (key, pkg) => { try { out[key] = registry.validatePackage(key, pkg); } catch (e) { logLine('auto pack refused: ' + e.message); } };
  // offices and projects with an agent of their own
  let map = o.officeMap;
  if (!map) { try { map = JSON.parse(fs.readFileSync(OFFICE_MAP, 'utf8')); } catch (e) { map = { offices: [], projects: [] }; } }
  const officePops = new Set();
  (map.offices || []).concat(map.projects || []).forEach((of) => {
    const popid = String(of.popid || '').toUpperCase();
    if (!of.agentDir || !/^POP-\d{5}$/.test(popid)) return;
    officePops.add(popid);
    if (taken.has(popid) || SELF_SPEAKING[popid]) return;
    const row = byPop[popid] || null;
    const where = of.district && !/citywide/i.test(of.district) ? ', ' + of.district : '';
    add('auto-office-' + of.agentDir, {
      persona: 'auto-office-' + of.agentDir, active: true, auto: 'office', popid, name: of.holder,
      office: of.officeId || of.projectId || of.title, agentDir: of.agentDir,
      dataNodes: ['office-week', 'civic-office'], models: { reflect: AUTO_MODEL }, dutyDays: ['thu'],
      promptContract: {
        roleLine: `You are ${of.holder}, ${of.title}${where}.`,
        voiceNotes: voiceNotesFor(popid, of.agentDir, row, o.agentsDir),
        frame: PRIVATE_FRAME,
        userFrame: 'The week\'s work is on the record now and the building has gone quiet',
        targetSentences: '4-6',
      },
    });
  });
  // players and staff the feed names this Cycle
  const named = o.named || feedNamedKeys(cycle, { beatsDir: o.beatsDir });
  rows.forEach((r) => {
    const popid = String(r.POPID || '').toUpperCase();
    if (!/^POP-\d{5}$/.test(popid) || taken.has(popid) || officePops.has(popid) || SELF_SPEAKING[popid]) return;
    // a club's own: on the GAME clock, or carrying a club in his role (a retired legend keeps his, off the clock)
    if (String(r.ClockMode || '').toUpperCase() !== 'GAME' && !/\b(A's|Oaks|Aviators)\b/.test(String(r.RoleType || ''))) return;
    if (!named.has(feedNameKey(r.Name))) return;
    add('auto-player-' + popid, {
      persona: 'auto-player-' + popid, active: true, auto: 'player', popid, name: r.Name, office: 'ATHLETE',
      dataNodes: ['sports-player'], playerName: r.Name, models: { reflect: AUTO_MODEL }, dutyDays: ['tue', 'thu'],
      promptContract: {
        roleLine: `You are ${r.Name} — ${String(r.RoleType || 'a ballplayer').trim()}.`,
        voiceNotes: voiceNotesFor(popid, null, r, o.agentsDir),
        frame: PRIVATE_FRAME,
        userFrame: 'The week is in the books and you are alone with it',
        targetSentences: '4-6',
      },
    });
  });
  return out;
}
// auto packs due today: on a duty day, once a Cycle (the registry's packs wake every duty day)
function selectAutoDue(auto, cycle, state, day) {
  const woken = (state && state.wokenCycle) || {};
  return Object.entries(auto || {}).filter(([, v]) => v.dutyDays.includes(day) && Number(woken[v.popid + ':cycle']) !== Number(cycle))
    .map(([key, value]) => ({ key, value }));
}

// The officeholder's own record of the Cycle, off their page: every office-position doc stamped with this Cycle,
// oldest first, each one clipped. [] when the page has none (the pack then has no office-week block).
async function loadOfficeWeek(popid, cycle, opts) {
  const o = opts || {};
  const API = 'https://api.supermemory.ai';
  const auth = { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const call = async (url, init) => {
    for (let t = 0; t < 5; t++) { const r = await fetch(url, init); if (r.status === 429) { await sleep(11000); continue; } return r; }
    throw new Error('store rate-limited');
  };
  let docs = [];
  for (let pageN = 1; pageN <= 6; pageN++) {
    const lr = await call(API + '/v3/documents/list', { method: 'POST', headers: auth, body: JSON.stringify({ containerTags: [page.pageTagFor(popid)], limit: 100, page: pageN }) });
    const lj = await lr.json();
    if (!lr.ok || lj.error) throw new Error('page list failed');
    const m = lj.memories || lj.documents || [];
    docs = docs.concat(m);
    if (m.length < 100) break;
  }
  const mine = docs.filter((d) => d.metadata && d.metadata.type === 'office-position' && Number(d.metadata.cycle) === Number(cycle))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).slice(-(o.max || 24));
  const lines = [];
  for (const d of mine) {
    try {
      const g = await (await call(API + '/v3/documents/' + d.id, { method: 'GET', headers: auth })).json();
      const t = String((g && g.content) || '').replace(/\s+/g, ' ').trim();
      if (t) lines.push(cap(t, 340));
    } catch (e) { /* one unread statement drops, the week still reads */ }
    await sleep(80);
  }
  return lines;
}

// ---- selection -------------------------------------------------------------------------------
function dayAbbrev(d) { return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][(d || new Date()).getDay()]; }

function selectDue(packages, cycle, state, opts) {
  opts = opts || {};
  const day = opts.day || dayAbbrev();
  if (opts.forceKey) {
    const v = packages[opts.forceKey];
    if (!v) return { picks: [], note: '--pack ' + opts.forceKey + ' not in registry', day };
    return { picks: [{ key: opts.forceKey, value: v }], note: 'forced', day };
  }
  const woken = (state && state.wokenCycle) || {};
  // Keyed by popid:day, not bare popid — a multi-day dutyDays pack (e.g. ["tue","thu"])
  // shares one cycle number across both days, so a bare-popid key would wrongly
  // suppress the second day's wake (found in adversarial review, 2026-09-22).
  const due = registry.duePackages(packages, day, (state && state.recent) || [])
    .filter(({ value }) => Number(woken[value.popid + ':' + day]) !== Number(cycle));
  const cap = Number.isFinite(opts.limit) && opts.limit > 0 ? opts.limit : due.length; // no limit → every due pack
  return { picks: due.slice(0, cap), note: due.length ? 'rota' : 'nothing due', day };
}

// ---- voice -----------------------------------------------------------------------------------
function buildWorkPrompts(pkg, pack, pageMemory) {
  const pc = pkg.promptContract;
  const memory = pageMemory ? `\n\n---\n\nWhat's been on your mind lately, from your own private reflections:\n${pageMemory}` : '';
  // pipeline.110 — "an ordinary person at work" is right for a clerk and wrong for a mayor: a pack may carry its own frame
  const frame = pc.frame || 'You are an ordinary person at work, not a writer.';
  const system = `${pc.roleLine} ${pack.identity} ${frame} ${pc.voiceNotes}${memory}\n\nReal things from your work recently:\n${pack.blocks.join('\n\n')}`;
  // pipeline.110 — the thought stays on what is in front of him: a wake that invents a game, a number or a name is
  // the faked life the builder ruled out (2026-11-10: "If they are written to fake through it then it won't be interesting").
  const user = `${pc.userFrame || 'The workday is done; you\'re sitting with it'} before the evening takes over. In ${pc.targetSentences || '4-5'} sentences, think on the page the way you actually would — private, honest, first person. Stay with what actually happened above: no game, number, name or event that is not in front of you. Don't narrate events like a story; just sit with it.`;
  return { system, user };
}

async function generateVoice(model, system, user) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    // builder 2026-10-12: newer DeepSeek runs with its hidden reasoning off (it ate the 260-token budget)
    body: JSON.stringify({ model, ...(/^deepseek\/deepseek-v4/.test(model) ? { reasoning: { enabled: false } } : {}), max_tokens: 340, temperature: 0.85, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error('voice: ' + (j.error.message || JSON.stringify(j.error)));
  return String(j.choices?.[0]?.message?.content || '').trim();
}

async function wakeOne(pkg, cycle, state) {
  // pipeline.110 — an office pack's own record is read off the page first (the pack builders are local and sync)
  if (pkg.dataNodes.indexOf('office-week') !== -1 && !Array.isArray(pkg._officeWeek)) {
    try { pkg._officeWeek = await loadOfficeWeek(pkg.popid, cycle); }
    catch (e) { pkg._officeWeek = []; logLine(`${pkg.persona}: office record unread (${e.message}) — the wake runs without it`); }
    // an office that put nothing on the record this Cycle has no week to sit with: its standing line alone is not a wake
    if (pkg.auto === 'office' && !pkg._officeWeek.length) { logLine(`${pkg.persona}: nothing on the record this cycle — skipped`); return false; }
  }
  const pack = buildWorkPack(pkg, cycle);
  if (!pack) { logLine(`${pkg.persona}: no pack data this cycle — skipped`); return false; }

  const pageRead = await loadOwnPageReadback(pkg.popid, {
    cycle, wake: DAYPART,
    contextText: [pkg.name, pkg.office, pack.identity, pack.blocks.join(' ')].join(' '),
  }).catch(() => ({ block: '', keys: [] }));

  const { system, user } = buildWorkPrompts(pkg, pack, pageRead.block);
  logLine(`woke ${pkg.popid} ${pkg.name} — ${pkg.office} | nodes=${pkg.dataNodes.join('+')} cycle=${cycle} dry=${DRY}`);
  if (DRY) console.log('\n--- work pack (system prompt) ---\n' + system + '\n---------------------------------');
  if (DRY) console.log('\n--- user prompt ---\n' + user + '\n-------------------');
  const reflection = await generateVoice(pkg.models.reflect.model, system, user);
  console.log('\n--- reflection ---\n' + reflection + '\n------------------');
  if (DRY) { logLine('[dry-run] no writes'); return true; }

  let cls = {};
  try { cls = await classifier.classifyTripleReflection_(reflection, []); } catch (e) { cls = { raw: 'classify threw: ' + e.message }; }

  const ptr = await page.ensurePagePointer_(pkg.popid);
  if (ptr.error) { logLine('ensurePagePointer_ ERROR: ' + ptr.error); return false; }
  const appended = await page.appendReflection_(pkg.popid, reflection, {
    cycle, daypart: DAYPART, day: PAGE_DAY_KEY ? page.pageDayOf(new Date()) : null,
    extra: { affect: cls.affect || null, event: cls.event || null, workWake: pkg.persona },
  });
  if (appended.error) { logLine('appendReflection_ ERROR: ' + appended.error); return false; }
  logLine(`page ${ptr.tag} (${ptr.created ? 'created' : 'existing'}) <- reflection doc ${appended.id || '?'}`);

  const mv = workMoveLine(pkg, pack, cycle, centralDate());
  if (mv) {
    try {
      // Lazy: cron-civic-run.js is guarded (require.main) but is 3k lines; only a director's shift pays for it.
      const { appendMoveLedger } = require('./cron-civic-run');
      const ledgerFile = appendMoveLedger(path.join(__dirname, '..'), cycle, [mv]);
      logLine(`move ledger <- work ${mv.payload.initiativeId} by ${mv.agentDir} (${ledgerFile ? path.relative(path.join(__dirname, '..'), ledgerFile) : 'no file'})`);
    } catch (e) { logLine('move ledger append ERROR: ' + e.message); }
  }

  if (cls.event || cls.affect) {
    await sheets.appendRows('Reflection_Intake', [[
      new Date().toISOString(), pkg.popid, cycle, DAYPART, cls.event || '', reflection.replace(/\n/g, ' '), 'no', cls.affect || '',
      '', cls.tension || '', '',
    ]]);
    logLine(`Reflection_Intake <- event=[${cls.event || '-'}] affect=[${cls.affect || '-'}] (applied=no, gated)`);
  } else {
    logLine(`classifier off-vocab/err, intake skipped: ${cls.raw}`);
  }
  return true;
}

async function main() {
  const cycle = Number(arg('cycle', null)) || (() => { try { return getCurrentCycle(); } catch (e) { return null; } })();
  const packages = registry.loadPackages();
  const state = loadState();
  // pipeline.110 — the packs nobody registered: offices off the office map, players off this Cycle's feed
  const auto = autoPackages(cycle, packages);
  const forcedAuto = FORCE_PACK && !packages[FORCE_PACK] && auto[FORCE_PACK];
  const sel = forcedAuto ? { picks: [{ key: FORCE_PACK, value: auto[FORCE_PACK] }], note: 'forced', day: dayAbbrev() }
    : selectDue(packages, cycle, state, { forceKey: FORCE_PACK, limit: LIMIT });
  const day = sel.day;
  const autoDue = FORCE_PACK ? [] : selectAutoDue(auto, cycle, state, day);
  const picks = sel.picks.concat(Number.isFinite(LIMIT) ? autoDue.slice(0, Math.max(0, LIMIT - sel.picks.length)) : autoDue);
  if (!picks.length) { logLine(`nothing to wake (${sel.note}, cycle=${cycle}, dry=${DRY})`); return; }
  logLine(`work-wake: ${picks.length} pack(s) due (${sel.picks.length} registered, ${picks.length - sel.picks.length} from the ledger and office map; cycle=${cycle}, dry=${DRY})`);
  let woke = 0;
  for (const { value: pkg } of picks) {
    let okWake = false;
    // one citizen's failed wake never takes the rest of the run down
    try { okWake = await wakeOne(pkg, cycle, state); } catch (e) { logLine(`${pkg.persona}: wake FAILED — ${e.message}`); }
    if (okWake) woke++;
    if (okWake && !DRY) {
      state.recent = [pkg.popid, ...(state.recent || []).filter((p) => p !== pkg.popid)].slice(0, RECENT_MEMORY);
      state.wokenCycle = Object.assign({}, state.wokenCycle, { [pkg.popid + ':' + day]: cycle }, pkg.auto ? { [pkg.popid + ':cycle']: cycle } : {});
      saveState(state);
    }
  }
  logLine(`work-wake: ${woke} of ${picks.length} woke (cycle=${cycle}, dry=${DRY})`);
}

if (require.main === module) {
  main().catch((e) => { logLine('FATAL ' + e.message); process.exit(1); });
}

module.exports = {
  readBeats, lookupNameTsv, NODE_BUILDERS, buildWorkPack, buildWorkPrompts, workMoveLine,
  selectDue, dayAbbrev, DAYPART,
  autoPackages, selectAutoDue, agentIdentityNotes, voiceNotesFor, loadOfficeWeek,
};
