/* jobStatementRows — what an office holder, a council seat, a city worker, Mara and Varek say in the job
 * reaches Reflection_Intake (engine.347 Task 5).
 *
 * Builder 2026-11-16: "what the councils and workers are saying should move thier dials … anything a cron
 * says that is saved to a memory story should show on reflecyion ledger and have postive or negative
 * effects on the dials". Builder 2026-11-17, on where a job statement lands: "Proceed on option 1" —
 * only what shows: the mood the speaker shows, or a bad thing that happened to the speaker. Plain city
 * business moves nothing.
 *
 *   landing  each saved line is read on its own by the live classifier (a joined read drowned a feeling one
 *            line showed in 7 of 10 sittings, flipped one and invented one — replay 2026-11-17). The sitting's
 *            mood is the one shown in the most lines (a tie: the larger move, then the earlier line); no
 *            feeling in any line is Flat. Its event is kept only when a line reads one of BAD_EVENTS; every
 *            other event is stored NO_MOVE_EVENT, so `Career` (drive +4) and the other tags for what the
 *            speaker was doing never reach the fold from a statement made in the job.
 *   sitting  one row per speaker per sitting, not per saved line: the fold has no cap on rows a Cycle
 *            (a Sunday is about 21 lines on the mayor). CIVIC = the speaker's lines of one Central day not
 *            yet on the sheet (a later run the same day is its own sitting); directive and journal = one
 *            a Cycle, the first to land (a rerun rewrites the same entry, it is not said twice).
 *   spool    writers queue() the words after their page write; flush() groups, checks the sheet, classifies
 *            and appends. Column A is the time the sitting's first line was queued — the row's identity on
 *            the sheet. Every flush opens the newest KEEP_CYCLES spools, so a line queued by a stage that
 *            does not flush (the tick) lands at the next one that does. Nothing here throws into a page
 *            write or a civic stage.
 *
 * These rows are dial rows: the fold reads them. The petition count, the office slice, the week digest and the
 * week view leave JOB_DAYPARTS out (isJobDaypart).
 *
 * I/O is injected into flush (readRows, appendRows, classify, lock); queue touches one local file.
 */
const fs = require('fs');
const path = require('path');
const dialMap = require('../utilities/citizenDialMap');

const JOB_DAYPARTS = ['CIVIC', 'directive', 'journal'];   // the page's own daypart for each writer, carried to column D
const DAY_SITTING = 'CIVIC';                               // sittings by Central day, more than one if a later run speaks again; the others are one a Cycle
const BAD_EVENTS = ['Stumble', 'Spat', 'TrustGuarded', 'ConnectionWithdrawn'];   // each moves a dial down on the reflection path
const NO_MOVE_EVENT = 'Civic';                             // exact DIAL_MAP key, moves nothing
// Every other event tag the classifier offers: what the speaker was doing or talking about, or a life event
// the engine writes itself (`Setback` gives composure only, which an event tag never carries on this path).
// From a job statement each is stored NO_MOVE_EVENT. Listed so a tag added to the classifier fails the test
// until it is placed here or in BAD_EVENTS.
const LANDS_NOTHING = ['Career', 'Career-Transition', 'Promotion', 'Education', 'Graduation', 'Civic', 'Relationship',
  'Community', 'Neighborhood', 'Reputation', 'Media', 'Public', 'Cultural', 'Mentorship', 'Faith', 'Household',
  'Wedding', 'Birth', 'Divorce', 'Retirement', 'Health', 'Critical', 'Hospitalized', 'Setback', 'Recovery',
  'Transgression-Petty', 'Transgression-Serious', 'Transgression-Grave', 'Resisted', 'Personal', 'Daily',
  'Background', 'Sports', 'Weather', 'Arrival'];
const EXCERPT_MAX = 1200;   // column F; the page holds the whole statement
const READ_MAX = 8000;      // characters of one line handed to the classifier
const READ_AT_ONCE = 4;     // lines classified at a time
const MAX_TRIES = 6;        // flushes a sitting waits through classifier errors before it is dropped
const KEEP_CYCLES = 3;      // newest spool files a flush opens
const DEFAULT_DIR = path.join(__dirname, '..', 'output', 'cron-civic', 'job-statements');

const BAD_SET = new Set(BAD_EVENTS);
const isJobDaypart = (v) => JOB_DAYPARTS.some((d) => d.toLowerCase() === String(v == null ? '' : v).trim().toLowerCase());

function centralDay(instant) {
  const t = new Date(instant);
  if (isNaN(t.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(t);
  const g = (k) => (parts.find((x) => x.type === k) || {}).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

// One line's read ({ event, affect } from the classifier) -> { event, affect, read } as it would land alone,
// or null when the read carries neither.
function landRead(cls) {
  const ev = cls && cls.event ? String(cls.event) : '';
  const af = cls && cls.affect ? String(cls.affect) : '';
  if (!ev && !af) return null;
  return { event: ev ? (BAD_SET.has(ev) ? ev : NO_MOVE_EVENT) : '', affect: af, read: ev };
}

const moveSize = (mood) => {
  const fx = dialMap.nudgesForReflection_('', mood, 1, '');
  return Object.keys(fx).reduce((n, d) => n + Math.abs(fx[d]), 0);
};

// A sitting's lines, each read on its own -> the one row's tags. reads[i] = { event, affect } | null.
//   affect  the mood shown in the most lines; a tie goes to the larger move, then the earlier line. No mood
//           in any line: Flat when a line read Flat, else blank.
//   event   the bad event read in the most lines (tie: earlier); none: NO_MOVE_EVENT when any line had an event.
//   lines   indexes of the lines that carry the row's mood or bad event (every read line when none does).
// null when no line carries an event or a mood.
function composeSitting(reads) {
  const landed = (reads || []).map(landRead);
  const tally = (pick) => {
    const m = new Map();
    landed.forEach((l, i) => { const k = l && pick(l); if (k) { if (!m.has(k)) m.set(k, { k, n: 0, first: i }); m.get(k).n++; } });
    return [...m.values()];
  };
  const moods = tally((l) => (l.affect && l.affect !== 'Flat' ? l.affect : '')).sort((a, b) => b.n - a.n || moveSize(b.k) - moveSize(a.k) || a.first - b.first);
  const bads = tally((l) => (BAD_SET.has(l.event) ? l.event : '')).sort((a, b) => b.n - a.n || a.first - b.first);
  const affect = moods.length ? moods[0].k : (landed.some((l) => l && l.affect === 'Flat') ? 'Flat' : '');
  const event = bads.length ? bads[0].k : (landed.some((l) => l && l.event) ? NO_MOVE_EVENT : '');
  if (!event && !affect) return null;
  let lines = landed.map((l, i) => (l && ((moods.length && l.affect === affect) || (bads.length && l.event === event)) ? i : -1)).filter((i) => i >= 0);
  if (!lines.length) lines = landed.map((l, i) => (l ? i : -1)).filter((i) => i >= 0);
  const count = (pick) => { const c = {}; landed.forEach((l) => { if (l) { const k = pick(l) || '-'; c[k] = (c[k] || 0) + 1; } }); return Object.keys(c).map((k) => k + ' ' + c[k]).join(', '); };
  return { event, affect, lines, read: count((l) => l.read) + ' / ' + count((l) => l.affect) };
}

function sittingKey(pop, cycle, daypart, at) {
  const base = [String(pop).trim().toUpperCase(), Number(cycle), daypart];
  if (daypart === DAY_SITTING) base.push(centralDay(at));
  return base.join('|');
}

function excerptOf(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length <= EXCERPT_MAX ? s : s.slice(0, EXCERPT_MAX - 1) + '…';
}

const spoolFile = (dir, cycle) => path.join(dir, 'spool_c' + cycle + '.jsonl');
const landedFile = (dir, cycle) => path.join(dir, 'landed_c' + cycle + '.jsonl');

function readLines(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return []; }
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch (e) { /* a torn line is a line that was not queued */ }
  }
  return out;
}

// queue({ pop, cycle, daypart, text, src }, { dir, now }) -> { queued: true, file } | { queued: false, why }.
// Call it only after the page write is recorded. The same words from the same speaker are queued once a
// Cycle (a stage that re-runs records its statements again). Never throws.
function queue(entry, opts) {
  try {
    const e = entry || {}, o = opts || {};
    const pop = String(e.pop || '').trim().toUpperCase();
    const cycle = Number(e.cycle);
    const text = String(e.text == null ? '' : e.text).trim();
    if (!/^POP-\d+$/.test(pop)) return { queued: false, why: 'no POPID' };
    if (!Number.isInteger(cycle) || cycle < 1) return { queued: false, why: 'no Cycle' };
    if (!JOB_DAYPARTS.includes(e.daypart)) return { queued: false, why: 'unknown daypart ' + e.daypart };
    if (!text) return { queued: false, why: 'no words' };
    const dir = o.dir || DEFAULT_DIR;
    fs.mkdirSync(dir, { recursive: true });
    const file = spoolFile(dir, cycle);
    if (readLines(file).some((l) => l && l.pop === pop && l.daypart === e.daypart && l.text === text)) return { queued: false, why: 'already queued' };
    const at = (o.now ? new Date(o.now) : new Date()).toISOString();
    fs.appendFileSync(file, JSON.stringify({ at, pop, cycle, daypart: e.daypart, text, src: e.src || '' }) + '\n');
    return { queued: true, file };
  } catch (err) {
    return { queued: false, why: err.message };
  }
}

// The sittings still owed a row in one Cycle's spool. A settled mark carries how many of its key's lines
// (in queue order) it covers; the lines after them are the next sitting (CIVIC) or late (one-a-Cycle).
function pendingSittings(dir, cycle) {
  const settled = new Map(), tries = new Map();
  for (const m of readLines(landedFile(dir, cycle))) {
    if (!m || !m.key) continue;
    if (m.status === 'retry') tries.set(m.key + '@' + m.first, (tries.get(m.key + '@' + m.first) || 0) + 1);
    else settled.set(m.key, Math.max(settled.get(m.key) || 0, Number(m.lines) || 0));
  }
  const groups = new Map();
  for (const e of readLines(spoolFile(dir, cycle))) {
    if (!e || !e.pop || !e.text || !e.at || !JOB_DAYPARTS.includes(e.daypart)) continue;
    const key = sittingKey(e.pop, e.cycle, e.daypart, e.at);
    if (!groups.has(key)) groups.set(key, { key, pop: String(e.pop).toUpperCase(), cycle: Number(e.cycle), daypart: e.daypart, all: [] });
    groups.get(key).all.push(e);
  }
  const pending = [], late = [];
  for (const g of groups.values()) {
    const done = settled.get(g.key) || 0;
    const rest = g.all.slice(done);
    if (!rest.length) continue;
    if (done && g.daypart !== DAY_SITTING) { late.push({ key: g.key, lines: g.all.length, extra: rest.length }); continue; }
    pending.push({ key: g.key, pop: g.pop, cycle: g.cycle, daypart: g.daypart, at: rest[0].at, parts: rest.map((e) => String(e.text)),
      upTo: g.all.length, tries: tries.get(g.key + '@' + rest[0].at) || 0 });
  }
  return { pending, late };
}

// Is this sitting's row already on the sheet? rows = raw Reflection_Intake (A–K). CIVIC: same speaker, Cycle
// and daypart with column A at the sitting's first-line instant. directive / journal: any row of that
// speaker, Cycle and daypart.
function onSheet(rows, sitting) {
  const t = new Date(sitting.at).getTime();
  for (const r of rows || []) {
    if (!Array.isArray(r) || String(r[3] || '') !== sitting.daypart) continue;
    if (String(r[1] || '').trim().toUpperCase() !== sitting.pop || Number(r[2]) !== sitting.cycle) continue;
    if (sitting.daypart !== DAY_SITTING || new Date(r[0]).getTime() === t) return true;
  }
  return false;
}

function rowFor(sitting, composed) {
  const said = composed.lines.map((i) => sitting.parts[i]).join('\n');
  return [sitting.at, sitting.pop, sitting.cycle, sitting.daypart, composed.event, excerptOf(said), 'no', composed.affect, '', '', ''];
}

// Each line of a sitting through the classifier, READ_AT_ONCE at a time -> { reads, error }.
async function readSitting(sitting, classify) {
  const reads = new Array(sitting.parts.length).fill(null);
  let next = 0, error = '';
  async function worker() {
    while (next < sitting.parts.length) {
      const i = next++;
      let cls;
      try { cls = await classify(sitting.parts[i].slice(0, READ_MAX), []); } catch (e) { cls = { event: null, affect: null, raw: '[err] ' + e.message }; }
      if (/^\[err\]/.test(String((cls && cls.raw) || '')) && !(cls.event || cls.affect)) error = error || String(cls.raw).slice(0, 200);
      else reads[i] = cls || null;
    }
  }
  await Promise.all(Array.from({ length: Math.min(READ_AT_ONCE, sitting.parts.length) }, worker));
  return { reads, error };
}

// flush({ dir, readRows, appendRows, classify, lock, log }) -> { ran, landed, present, retry, dropped, late }.
//   readRows()            -> raw Reflection_Intake rows (called once, only when a sitting is owed)
//   appendRows(rows)      -> appends A–K rows
//   classify(text, [])    -> { event, affect, raw }   (lib/reflectionClassifier classifyTripleReflection_)
//   lock(lockPath, fn, onEvent) -> fn's result, or null when a live run holds the lock (lib/wakePerception withFileLock)
// Never throws: a failure is logged and the sittings stay queued.
async function flush(o) {
  const say = typeof (o && o.log) === 'function' ? o.log : () => {};
  const sum = { ran: false, landed: 0, present: 0, retry: 0, dropped: 0, late: 0 };
  try {
    const dir = (o && o.dir) || DEFAULT_DIR;
    let cycles = [];
    try { cycles = fs.readdirSync(dir).map((n) => (/^spool_c(\d+)\.jsonl$/.exec(n) || [])[1]).filter(Boolean).map(Number).sort((a, b) => b - a).slice(0, KEEP_CYCLES); } catch (e) { return Object.assign(sum, { ran: true }); }
    if (!cycles.length) return Object.assign(sum, { ran: true });
    const lock = o.lock || require('./wakePerception').withFileLock;
    const ran = await lock(path.join(dir, 'flush.lock'), async () => {
      const mark = (cycle, m) => {
        try { fs.appendFileSync(landedFile(dir, cycle), JSON.stringify(Object.assign({ at: new Date().toISOString() }, m)) + '\n'); }
        catch (e) { say('landed mark not written for ' + m.key + ' (' + e.message + ') — the sheet check stands in for it'); }
      };
      const owed = [];
      for (const cycle of cycles.slice().sort((a, b) => a - b)) {
        const p = pendingSittings(dir, cycle);
        for (const l of p.late) {
          say('job statement not read: ' + l.extra + ' line(s) queued for ' + l.key + ' after its one row a Cycle landed');
          mark(cycle, { key: l.key, status: 'late', lines: l.lines }); sum.late += l.extra;
        }
        owed.push(...p.pending);
      }
      if (!owed.length) return true;
      const sheet = await o.readRows();
      const rows = [], landing = [];
      for (const s of owed) {
        if (onSheet(sheet, s)) { mark(s.cycle, { key: s.key, status: 'present', lines: s.upTo }); sum.present++; say('job statement ' + s.key + ' already on the sheet'); continue; }
        const { reads, error } = await readSitting(s, o.classify);
        if (error) {
          if (s.tries + 1 < MAX_TRIES) { mark(s.cycle, { key: s.key, first: s.at, status: 'retry', why: error }); sum.retry++; say('job statement ' + s.key + ' kept for the next flush (classifier error, try ' + (s.tries + 1) + ' of ' + MAX_TRIES + ')'); }
          else { mark(s.cycle, { key: s.key, status: 'dropped', lines: s.upTo, why: 'classifier error, ' + MAX_TRIES + ' tries: ' + error }); sum.dropped++; say('job statement ' + s.key + ' DROPPED, no row: classifier error on ' + MAX_TRIES + ' flushes'); }
          continue;
        }
        const composed = composeSitting(reads);
        if (!composed) { mark(s.cycle, { key: s.key, status: 'dropped', lines: s.upTo, why: 'off-vocabulary read' }); sum.dropped++; say('job statement ' + s.key + ' DROPPED, no row: off-vocabulary read on every line'); continue; }
        rows.push(rowFor(s, composed)); landing.push({ s, composed });
      }
      if (rows.length) {
        await o.appendRows(rows);   // a throw here leaves every sitting queued; the sheet check catches an append that did land
        for (const { s, composed } of landing) {
          mark(s.cycle, { key: s.key, status: 'landed', lines: s.upTo, first: s.at, event: composed.event, affect: composed.affect, read: composed.read });
          say('Reflection_Intake <- ' + s.key + ' event=[' + (composed.event || '-') + '] affect=[' + (composed.affect || '-') + '] from ' + s.parts.length + ' line(s) read ' + composed.read + ' (applied=no)');
        }
        sum.landed = rows.length;
      }
      return true;
    }, say);
    if (ran === null) say('job statements: flush lock held by a live run — queue kept');
    sum.ran = ran !== null;
    return sum;
  } catch (e) {
    say('job statements: flush failed, queue kept: ' + e.message);
    return Object.assign(sum, { error: e.message });
  }
}

module.exports = { JOB_DAYPARTS, BAD_EVENTS, LANDS_NOTHING, NO_MOVE_EVENT, EXCERPT_MAX, READ_MAX, MAX_TRIES, DEFAULT_DIR,
  isJobDaypart, centralDay, landRead, composeSitting, sittingKey, excerptOf, queue, pendingSittings, onSheet, rowFor, flush };
