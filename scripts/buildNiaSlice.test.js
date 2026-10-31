'use strict';

const fs = require('fs');
const N = require('./buildNiaSlice');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

const st = { computedAt: 'x', rows: [
  { Rank: 2, POPID: 'POP-00962', Holder: 'Marcus Walker', CyclesLed: 2, CurrentStreak: 0 },
  { Rank: 1, POPID: 'POP-00143', Holder: 'Clarissa Dane', CyclesLed: 4, CurrentStreak: 3 },
] };

check('leader is rank 1 regardless of row order', N.standingsLeader(st).POPID === 'POP-00143');
check('null standings -> null leader', N.standingsLeader(null) === null);
check('empty rows -> null leader', N.standingsLeader({ rows: [] }) === null);

const note = N.standingsNote(st.rows[1]);
check('note names leader + rank + cycles + streak',
  note.includes('Clarissa Dane') && note.includes('rank #1') &&
  note.includes('4 cycle(s) led') && note.includes('streak 3'));
check('no leader -> empty note', N.standingsNote(null) === '');

// Integration against the real c106 feed pack: builds without a standings
// sidecar present (sidecar starts with tonight's recompute) and carries the
// standings key either way.
const hasSidecar = fs.existsSync(require('path').join(__dirname, '..', 'output', 'spacemolt-show', 'standings.json'));
const slice = N.buildNiaSlice(106);
check('slice builds', slice && slice.v === 'NIA-SLICE/1' && Array.isArray(slice.laneEntries));
check('standings key present', 'standings' in slice);
if (!hasSidecar) check('no sidecar -> standings null', slice.standings === null);
if (hasSidecar && slice.standings) {
  check('sidecar -> leader named in angle', slice.laneEntries.every(e => e.handle.angle.includes('leads the board')));
}

// Regression (2026-09-18, Nia Rook C107): a feed event with no `Holder`
// resolved to the raw POPID as the pilot's printed "name" — the ledger name
// lookup existed for hood but never for name. citizenInfoFor now resolves
// both in the same pass.
const POPID_RE = /\bPOP-\d{5}\b/;
check('no raw POPID leaks into a lane label when the ledger has a name',
  slice.laneEntries.every(e => !POPID_RE.test(e.label)),
  slice.laneEntries.map(e => e.label).join(' | '));
check('no raw POPID leaks into a lane angle', slice.laneEntries.every(e => !POPID_RE.test(e.handle.angle)));
check('no raw POPID leaks into lane citizens', slice.laneEntries.every(e => e.handle.citizens.every(c => !POPID_RE.test(c))));

// --- Weekly digest (2026-09-25, plan §(e) NEXT BUILD) ---
const path = require('path');
const os = require('os');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nia-weekly-'));
const showDir = path.join(tmpRoot, 'output', 'spacemolt-show');
fs.mkdirSync(path.join(showDir, 'feed'), { recursive: true });
fs.writeFileSync(path.join(showDir, 'feed', 'c999.json'), JSON.stringify({ events: [
  { EpisodeId: 'undocked-pop00962-a', POPID: 'POP-00962', CreditsDelta: 40, CombatEvents: 0, MishapCount: 1 },
  { EpisodeId: 'undocked-pop00962-b', POPID: 'POP-00962', CreditsDelta: -100, CombatEvents: 1, MishapCount: 0 },
  { EpisodeId: 'undocked-pop00143-a', POPID: 'POP-00143', CreditsDelta: null, CombatEvents: 0, MishapCount: 0 },
] }));
fs.writeFileSync(path.join(tmpRoot, 'output', 'simulation_ledger_snapshot.jsonl'),
  [{ POPID: 'POP-00962', Name: 'Marcus Walker', Neighborhood: 'Jack London' },
   { POPID: 'POP-00143', Name: 'Clarissa Dane', Neighborhood: 'Fruitvale' }]
    .map(r => JSON.stringify(r)).join('\n') + '\n');

// buildNiaSlice.js resolves ROOT from __dirname, not cwd — so a tmp-root test
// needs its own copy of the module loaded FROM the tmp tree. Simplest: copy
// the module source in and require it from there.
const tmpScriptsDir = path.join(tmpRoot, 'scripts');
fs.mkdirSync(tmpScriptsDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'buildNiaSlice.js'), path.join(tmpScriptsDir, 'buildNiaSlice.js'));
// pipeline.95: the slice reads each night through undockedShowRecord (which reads the fence's leak patterns)
fs.copyFileSync(path.join(__dirname, 'undockedShowRecord.js'), path.join(tmpScriptsDir, 'undockedShowRecord.js'));
fs.mkdirSync(path.join(tmpRoot, 'lib'), { recursive: true });
fs.copyFileSync(path.join(__dirname, '..', 'lib', 'memoryFence.js'), path.join(tmpRoot, 'lib', 'memoryFence.js'));
// Marcus Walker's two nights are on disk; Clarissa Dane's is not (her totals stay the feed's)
fs.mkdirSync(path.join(showDir, 'intake'), { recursive: true });
fs.mkdirSync(path.join(showDir, 'staged', 'archive'), { recursive: true });
for (const [ep, fid, at, facts, log] of [
  ['ep-a', 'undocked-pop00962-a', '2026-10-27T01:30:00Z', { systems_visited: { value: ['sol', 'sirius'] }, credits_delta: { value: 40 }, points_delta: { value: 5, earned: [{ name: 'Test Jump', points: 5 }] } }, 'Quiet night, sold the iron.'],
  ['ep-b', 'undocked-pop00962-b', '2026-10-28T01:30:00Z', { systems_visited: { value: [] }, credits_delta: { value: -100 }, event_counts: { value: { session: 2 } } }, ''],
]) {
  fs.writeFileSync(path.join(showDir, 'intake', ep + '.json'), JSON.stringify({ POPID: 'POP-00962', Cycle: 999, EpisodeId: ep, Applied: 'yes', FeedEvent: { EpisodeId: fid } }));
  fs.writeFileSync(path.join(showDir, 'staged', 'archive', ep + '.json'), JSON.stringify({ window: { startedAt: at }, runner: { capped: true }, facts, captains_log: { entries: log ? [{ text: log }] : [] } }));
}
delete require.cache[require.resolve(path.join(tmpScriptsDir, 'buildNiaSlice.js'))];
const NW = require(path.join(tmpScriptsDir, 'buildNiaSlice.js'));

const weekly = NW.buildNiaWeeklySlice(999);

console.log('pipeline.95: the night as flown in her assignment');
{
  const walkerP = weekly.pilots.find(p => p.POPID === 'POP-00962'), daneP = weekly.pilots.find(p => p.POPID === 'POP-00143');
  check('weekly: a pilot whose nights are on disk gets them in plain words', walkerP.nightSource === 'record' &&
    weekly.story.facts.includes("Marcus Walker's Monday night on UNDOCKED: went through Sol and Sirius; earned Test Jump (5 points); came out 40 credits up; flew until the show's time ran out.") &&
    weekly.story.facts.includes("Marcus Walker's Tuesday night on UNDOCKED: never got the ship moving."), JSON.stringify(weekly.story.facts));
  check('weekly: a pilot with no night on disk keeps the feed totals, said', daneP.nightSource === 'feed' && weekly.story.facts.some(f => f.startsWith('Clarissa Dane — 1 episode(s)')));
  check('weekly: no captain\'s log reaches her facts', !weekly.story.facts.some(f => /sold the iron/.test(f)));
  const NS = require(path.join(tmpScriptsDir, 'undockedShowRecord.js'));
  const tmpNights = NS.loadNights({ root: showDir });
  const ev = { EpisodeId: 'undocked-pop00962-a', POPID: 'POP-00962', Holder: 'Marcus Walker', CreditsDelta: 40, Systems: ['Sol'], CombatEvents: 0, MishapCount: 0, Magnitude: 3, Flags: ['open_escrow'] };
  const rec = NW.laneEntryFor(ev, { name: 'Marcus Walker' }, null, 999, NS.nightForFeedEvent(tmpNights, ev.EpisodeId));
  check('daily: the night rides as the first fact', rec.nightSource === 'record' && rec.handle.facts[0].startsWith("Marcus Walker's Monday night on UNDOCKED: went through Sol and Sirius"));
  check('daily: the angle names the night, not the feed numbers or the magnitude', rec.handle.angle.startsWith('UNDOCKED episode: Marcus Walker, Monday night, open escrow position.') &&
    !/magnitude|Credits 40|systems/i.test(rec.handle.angle) && rec.handle.angle.length <= 500, rec.handle.angle);
  check('daily: the label is the night', rec.label === 'UNDOCKED: Marcus Walker, Monday night');
  const feedOnly = NW.laneEntryFor(ev, { name: 'Marcus Walker' }, null, 999, null);
  check('daily: no night on disk -> the feed fields, said', feedOnly.nightSource === 'feed' && /Credits 40, systems Sol, combat 0, mishaps 0, magnitude 3\/5, open escrow position\./.test(feedOnly.handle.angle));
}
check('weekly slice not empty when feed has events', weekly.empty === false, JSON.stringify(weekly));
check('weekly slice rosters both pilots', weekly.pilots.length === 2, JSON.stringify(weekly.pilots));
const walker = weekly.pilots.find(p => p.POPID === 'POP-00962');
check('weekly slice resolves pilot name from ledger', walker && walker.name === 'Marcus Walker');
check('weekly slice aggregates credits across episodes (40 + -100 = -60)', walker && walker.creditsDelta === -60);
check('weekly slice counts episodes per pilot', walker && walker.episodes === 2);
const dane = weekly.pilots.find(p => p.POPID === 'POP-00143');
check('weekly slice marks a null-credits episode as windowed, not zero', dane && dane.hasWindowed === true && dane.creditsDelta === 0);
check('weekly story carries every pilot popid', weekly.story && weekly.story.popids.sort().join(',') === 'POP-00143,POP-00962');
check('weekly story ref is namespaced away from real EpisodeIds', weekly.story.ref === 'undocked-week:weekly-c999');

const emptySlice = NW.buildNiaWeeklySlice(998);
check('no feed pack -> empty weekly slice', emptySlice.empty === true);

// Idempotency: marking the week filed makes a second build return empty.
NW.markRecapped([NW.weeklyKey(999)], { note: 'test' });
const refetch = NW.buildNiaWeeklySlice(999);
check('a filed weekly digest does not rebuild for the same cycle', refetch.empty === true);

fs.rmSync(tmpRoot, { recursive: true, force: true });

// injectWeeklyPilotCredit lives in cron-desk-run.js — exercised via its own
// small fixture here since that file has no dedicated unit test file; a
// require of the whole module is safe (no top-level side effects on require).
const { injectWeeklyPilotCredit } = require('./cron-desk-run');
const intake = { names: [{ name: 'Marcus Walker', role: 'quoted-source', popid: 'POP-00962' }] };
const pilots = [
  { name: 'Marcus Walker', POPID: 'POP-00962' },
  { name: 'Clarissa Dane', POPID: 'POP-00143' },
];
const draft = 'Marcus Walker had a rough week out there. The rest of the cast sat it out this cycle.';
const injected = injectWeeklyPilotCredit(intake, draft, pilots);
check('existing quoted-source role upgraded to subject for a printed pilot',
  injected.names.find(n => n.popid === 'POP-00962').role === 'subject');
check('a pilot never named in the article body is NOT added (index only what prints)',
  !injected.names.some(n => n.popid === 'POP-00143'));

const intake2 = { names: [] };
const draft2 = 'Clarissa Dane sat quiet this week while the leaderboard shuffled under her.';
const injected2 = injectWeeklyPilotCredit(intake2, draft2, pilots);
check('a printed pilot absent from the model INTAKE is still added as subject',
  injected2.names.length === 1 && injected2.names[0].popid === 'POP-00143' && injected2.names[0].role === 'subject');

// research.29 (builder 2026-10-16): Nia knows who is in the chair — the ledger
// RoleType and the sports feed's own sentences about the pilot ride the slice.

const tmpFeed = require('path').join(os.tmpdir(), 'nia-career-feed-' + process.pid + '.jsonl');
fs.writeFileSync(tmpFeed, [
  { Cycle: '109', SeasonType: 'playoffs', EventType: 'game-result', NamesUsed: 'Eric Taveras (2B), Vinnie Keane (DH)', Notes: 'Vinnie Keane sat. Eric Taveras continues his amazing playoff campaign with 2 homeruns.' },
  { Cycle: '110', SeasonType: 'championship', EventType: 'game-result', NamesUsed: 'Eric Taveras, Pablo Almanzar', Notes: 'Eric Taveras win World Series MVP to go along with his post-season MVP. Parade for Eric Taveras set for Downtown in c111. Eric Taveras is rated at 82 in TrueSource.' },
  { Cycle: '101', SeasonType: 'regular', EventType: 'game-result', NamesUsed: 'Eric Taveras (2B)', Notes: 'Eric Taveras went 0-for-4 in April.' },
  { Cycle: '110', SeasonType: 'championship', EventType: 'game-result', NamesUsed: 'Vinnie Keane', Notes: 'Vinnie Keane waved from the float.' },
].map(r => JSON.stringify(r)).join('\n') + '\n');
const career = N.careerLinesFor('Eric Taveras', 111, tmpFeed);
check('career lines: only rows naming the pilot, inside the 6-cycle window', career.length === 2 && career.every(l => l.line.includes('Eric Taveras')));
check('career lines: newest first', career[0].cycle === 110 && career[1].cycle === 109);
check('career lines: only the sentences that name the pilot', !career[1].line.includes('Vinnie Keane sat'));
check('career lines: C101 is outside the window', !career.some(l => l.cycle === 101));
check('career lines: unknown pilot -> []', N.careerLinesFor('Nobody Here', 111, tmpFeed).length === 0);
check('career lines: no name -> []', N.careerLinesFor(null, 111, tmpFeed).length === 0);
check('career lines: season label, never a cycle number prefix', career[0].line.startsWith('Championship: ') && !/\bC\d{3}\b/.test(career[0].line));
check('career lines: "in c111" shorthand stripped, cycle talk otherwise untouched', !/c111/.test(career[0].line) && /Parade for Eric Taveras set for Downtown\./.test(career[0].line));
check('career lines: rating / TrueSource sentences dropped', !/rated at|TrueSource/.test(career[0].line));
const who = N.whoLine('Eric Taveras', { roleType: "Second Baseman, Oakland A's" }, career);
check('who line: name — RoleType. career sentences', who.startsWith("Eric Taveras — Second Baseman, Oakland A's. Championship:") && !who.endsWith('.'));
const wf = N.whoFacts('Eric Taveras', { roleType: "Second Baseman, Oakland A's" }, career);
check('who facts: one ledger role fact + one fact per career line, each naming the pilot', wf.length === 3 && wf[0].includes('(ledger)') && wf.every(f => f.startsWith('Eric Taveras')));
check('who line: no role, no career -> just the name', N.whoLine('Briar Soto', {}, []) === 'Briar Soto');
try { fs.unlinkSync(tmpFeed); } catch (_) {}

const snap = require('path').join(__dirname, '..', 'output', 'simulation_ledger_snapshot.jsonl');
if (fs.existsSync(snap)) {
  const info = N.citizenInfoFor(['POP-00597']);
  check('citizenInfoFor carries roleType from the snapshot', info['POP-00597'] && typeof info['POP-00597'].roleType === 'string' && info['POP-00597'].roleType.length > 0);
}
const c111 = N.buildNiaWeeklySlice(111);
if (c111 && !c111.empty) {
  check('weekly c111: every pilot carries who + career', c111.pilots.every(p => typeof p.who === 'string' && Array.isArray(p.career)));
  check('weekly c111: the angle says who is in the chair and stays under the Packet 500-char cap', c111.story.angle.includes('In the chair:') && c111.story.angle.length <= 500);
  check('weekly c111: per-pilot numbers and careers ride as story.facts', Array.isArray(c111.story.facts) && c111.story.facts.length >= c111.pilots.length);
  const eric = c111.pilots.find(p => p.POPID === 'POP-00597');
  if (eric) check('weekly c111: Eric Taveras reads as the A\'s second baseman with his MVP', eric.who.includes("Oakland A's") && eric.who.includes('MVP'));
}

if (failed) { console.error('buildNiaSlice: ' + failed + ' FAIL'); process.exit(1); }
console.log('buildNiaSlice: ok');
