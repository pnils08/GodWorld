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
const { loadOwnPageReadback } = require('/root/GodWorld/lib/wakePerception');
const registry = require('./workWakePackages');

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
  'sports-player': (pkg, cycle, beatsDir) => {
    const rows = readBeats('Oakland_Sports_Feed', beatsDir);
    if (!rows) return null;
    const nameRe = new RegExp(String(pkg.playerName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const hits = rows.filter((r) => nameRe.test(String(r.NamesUsed || '')) || nameRe.test(String(r.Stats || '')));
    if (!hits.length) return null;
    let row = cycle != null ? hits.filter((r) => Number(r.Cycle) === Number(cycle)).pop() : null;
    if (!row) row = hits.sort((a, b) => (Number(b.Cycle) || 0) - (Number(a.Cycle) || 0))[0];
    const statSeg = String(row.Stats || '').split(/,\s*/).find((s) => nameRe.test(s));
    const lines = [`Your name is in the feed (cycle ${row.Cycle}, ${row.EventType || 'event'}).`];
    if (statSeg && statSeg !== '-') lines.push(`Your line: ${statSeg.replace('/', ' — ')}.`);
    if (row['Team Record'] && row['Team Record'] !== '-') lines.push(`The team is ${row['Team Record']}${row.Streak ? ' (' + row.Streak + ')' : ''}.`);
    if (row.PlayerMood) lines.push(`The mood around the club: ${row.PlayerMood}.`);
    if (row.Notes) lines.push(cap(row.Notes, 220));
    return lines.join('\n');
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
    if (row.MilestoneNotes) lines.push('Latest milestone: ' + cap(row.MilestoneNotes, 180));
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
  const d = String(date || new Date().toISOString().slice(0, 10));
  return {
    moveId: 'MV-' + c + '-' + pkg.persona + '-' + d,
    cycle: c, date: d, agentDir: pkg.persona, popid: pkg.popid || null,
    type: 'work', payload: { initiativeId, source: 'work-wake' }, status: 'pending',
    at: new Date().toISOString(),
  };
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
  const system = `${pc.roleLine} ${pack.identity} You are an ordinary person at work, not a writer. ${pc.voiceNotes}${memory}\n\nReal things from your work recently:\n${pack.blocks.join('\n\n')}`;
  const user = `The workday is done; you're sitting with it before the evening takes over. In ${pc.targetSentences || '4-5'} sentences, think on the page the way you actually would — private, honest, first person. Don't narrate events like a story; just sit with it.`;
  return { system, user };
}

async function generateVoice(model, system, user) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model, max_tokens: 260, temperature: 0.85, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error('voice: ' + (j.error.message || JSON.stringify(j.error)));
  return String(j.choices?.[0]?.message?.content || '').trim();
}

async function wakeOne(pkg, cycle, state) {
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
    cycle, daypart: DAYPART,
    extra: { affect: cls.affect || null, event: cls.event || null, workWake: pkg.persona },
  });
  if (appended.error) { logLine('appendReflection_ ERROR: ' + appended.error); return false; }
  logLine(`page ${ptr.tag} (${ptr.created ? 'created' : 'existing'}) <- reflection doc ${appended.id || '?'}`);

  const mv = workMoveLine(pkg, pack, cycle, new Date().toISOString().slice(0, 10));
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
      new Date().toISOString(), pkg.popid, cycle, DAYPART, cls.event || '', reflection.slice(0, 180).replace(/\n/g, ' '), 'no', cls.affect || '',
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
  const { picks, note, day } = selectDue(packages, cycle, state, { forceKey: FORCE_PACK, limit: LIMIT });
  if (!picks.length) { logLine(`nothing to wake (${note}, cycle=${cycle}, dry=${DRY})`); return; }
  logLine(`work-wake: ${picks.length} pack(s) due (${note}, cycle=${cycle}, dry=${DRY})`);
  for (const { value: pkg } of picks) {
    const okWake = await wakeOne(pkg, cycle, state);
    if (okWake && !DRY) {
      state.recent = [pkg.popid, ...(state.recent || []).filter((p) => p !== pkg.popid)].slice(0, RECENT_MEMORY);
      state.wokenCycle = Object.assign({}, state.wokenCycle, { [pkg.popid + ':' + day]: cycle });
      saveState(state);
    }
  }
}

if (require.main === module) {
  main().catch((e) => { logLine('FATAL ' + e.message); process.exit(1); });
}

module.exports = {
  readBeats, lookupNameTsv, NODE_BUILDERS, buildWorkPack, buildWorkPrompts, workMoveLine,
  selectDue, dayAbbrev, DAYPART,
};
