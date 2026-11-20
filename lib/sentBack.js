/* sentBack — what the desk hands a journalist when the gate flags his piece (pipeline.114).
 *
 * Builder 2026-11-19/20: "All crons get failed articles returned to them already" · "Why do you think they get
 * graded ? Why do you think they get stages fk flag ? … didn't finish the build". A flagged piece goes back to the
 * journalist who wrote it with every finding the gate returned and its grade; he fixes that piece and it is gated
 * again. cron-desk-run.js runWrite builds the note from one gate result and decides whether the piece goes back
 * again; cron-desk-writer.js --sent-back turns the note into the writer's instructions. Pure — no I/O.
 */
'use strict';

// Every finding the gate returned, none cut: the deterministic checks, the contamination wall, an assignment that
// does not match its INTAKE, and Rhea's flags.
function findingsOf(g) {
  const out = [];
  for (const f of (g && g.checkFlags) || []) out.push({ severity: 'high', on: '', issue: String(f) });
  if (g && g.contamination && g.contamination.fail) {
    for (const r of g.contamination.findings || []) out.push({ severity: 'high', on: '', issue: String(r.check || 'contamination') + ': ' + String(r.issue || '') });
  }
  if (g && g.assignmentSwap) out.push({ severity: 'high', on: '', issue: 'the INTAKE at the foot of the piece does not belong to this assignment' });
  for (const f of (g && g.rhea && g.rhea.flags) || []) {
    out.push({ severity: String((f && f.severity) || ''), on: String((f && f.claim) || ''), issue: String((f && f.issue) || '') });
  }
  return out;
}

function gradeOf(g) {
  const cs = (g && g.rhea && g.rhea.contractScore) || (g && g.blockedContractScore) || null;
  return cs && Number.isInteger(cs.score) ? { score: cs.score, max: cs.max || 4, short: String(cs.short || '') } : null;
}

// The note the writer gets: his piece as filed, what the desk found, the desk's summary, the grade.
function noteOf(draft, g) {
  return {
    draft: String(draft == null ? '' : draft),
    findings: findingsOf(g),
    summary: String((g && g.rhea && g.rhea.summary) || ''),
    grade: gradeOf(g),
  };
}

// A flagged piece goes back while each fix clears findings: a fix with as many findings as the piece before it ends
// the return (the count only falls, so the return always ends). A fail with nothing named — no verdict came back —
// does not go back: there is nothing to fix against.
function goesBack(g, findingsBefore) {
  if (!g || g.pass) return false;
  const n = findingsOf(g).length;
  if (!n) return false;
  return findingsBefore == null || n < findingsBefore;
}

// The block the writer reads after his assignment.
function writerBlock(note) {
  const n = note || {};
  const lines = ['=== THE DESK SENT YOUR PIECE BACK ===',
    'This is your piece, filed on this run. The desk will not run it as it stands. What the desk found:'];
  for (const f of n.findings || []) lines.push('- ' + (f.severity ? '[' + f.severity + '] ' : '') + (f.on ? '"' + f.on + '" — ' : '') + f.issue);
  if (n.summary) lines.push('The desk, in one line: ' + n.summary);
  if (n.grade) lines.push('The desk\'s grade: ' + n.grade.score + '/' + n.grade.max + (n.grade.short ? ' — ' + n.grade.short : ''));
  lines.push('Fix what the desk named. Keep your assignment, your voice and what was right; file the whole piece again, in the same form.',
    '', 'YOUR PIECE AS FILED:', n.draft || '', '=== END ===');
  return lines.join('\n');
}

module.exports = { findingsOf, gradeOf, noteOf, goesBack, writerBlock };
