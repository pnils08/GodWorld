/* reporterDialEvents — where a reporter's own work lands on the dials (engine.347 Task 3).
 *
 * Builder 2026-11-16: "all media is 3/3 so its not the best method to grade them on … the better event
 * would be 'my article was selected to run in the cycle pulse'". Builder 2026-11-17, on the filed line:
 * "it would maybe not be sociability though so that would need a better place to land if kept" →
 * "keep it on drive small".
 *
 *   filed   a story filed is work done: drive, the small step. The writer names the tag; the classifier
 *           no longer guesses one from a headline (it read "press work" -> sociability +4).
 *   graded  the desk grade moves no dial. Its page line stays (the next wake reads it back); no ledger row.
 *   printed one Reflection_Intake row per reporter per Cycle Pulse: drive, the middle step.
 *
 * The tags are the graded form <Kind>-<Dial>-<Up|Down>-<S|M|L> (utilities/citizenDialMap.js gradedNudges_),
 * so they carry their own dial and need no map key. The affect is Flat: a build string shows no feeling.
 * Pure — no I/O (lib/pageLabels.js is pure too). citizenVoice.js and cron-saturday-run.js do the writes.
 */
const FILED_TAG = 'Media-Drive-Up-S';
const PRINTED_TAG = 'Media-Drive-Up-M';
const NO_MOOD = 'Flat';
const PRINT_DAYPART = 'PRINT';
const PRINTED_SENTENCE = 'My article was selected to run in the Cycle Pulse';

// The reporter self-record lines cron-desk-run.js sends through citizenVoice --record-text.
// pipeline.112: the desk run names the kind (--record-kind) and sends the line without a label; the page holds
// the headline or the score, and the kind rides the doc's metadata. The kind is the caller's name for it, never
// read off the line (every caller passes it: cron-desk-run.js). Readers show the line with its kind in front
// again: lib/pageLabels.js recordLine.
const { RECORD_KINDS } = require('./pageLabels');
function recordKind(preText, named) {
  if (preText == null) return null;
  return RECORD_KINDS.includes(named) ? named : null;
}


// First non-empty line of an article, heading marks and emphasis off (the desk run's own headline rule).
function headlineOf(text) {
  const first = String(text || '').split('\n').find((l) => l.trim());
  return String(first || '').replace(/^#+\s*/, '').replace(/[*_`]/g, '').slice(0, 100).trim();
}

// printed: [{ popid, headline }] — one entry per printed filing whose byline resolved to a ledger POPID.
// existing: Reflection_Intake rows (positional A–K, header row or not). One row per reporter per Cycle;
// a reporter who already has this Cycle's PRINT row is skipped (the Saturday step reruns).
function printedReporterRows(printed, cycle, existing, nowIso) {
  const have = new Set((existing || [])
    .filter((r) => String(r[3] || '') === PRINT_DAYPART && String(r[2]) === String(cycle))
    .map((r) => String(r[1] || '').trim().toUpperCase()));
  const byPop = new Map();
  for (const p of printed || []) {
    const pop = String((p && p.popid) || '').trim().toUpperCase();
    if (!pop) continue;
    if (!byPop.has(pop)) byPop.set(pop, []);
    byPop.get(pop).push(String(p.headline || '').trim());
  }
  const rows = [], skipped = [];
  for (const [pop, heads] of byPop) {
    if (have.has(pop)) { skipped.push(pop); continue; }
    const named = heads.filter(Boolean);
    let text = PRINTED_SENTENCE + (named.length ? ': ' + named[0] : '') + (heads.length > 1 ? ' (and ' + (heads.length - 1) + ' more)' : '');
    if (!/[.?!]$/.test(text)) text += '.';
    rows.push([nowIso, pop, cycle, PRINT_DAYPART, PRINTED_TAG, text, 'no', NO_MOOD, '', '', '']);
  }
  return { rows, skipped };
}

module.exports = { FILED_TAG, PRINTED_TAG, NO_MOOD, PRINT_DAYPART, PRINTED_SENTENCE, recordKind, headlineOf, printedReporterRows };
