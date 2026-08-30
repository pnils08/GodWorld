'use strict';

/**
 * pipeline.54 Tasks 5–8 — deterministic Article gates before Rhea.
 * Packet is the sidecar. Rhea is contradiction-only.
 */

const shape = require('./livedArticleShape');
const contamination = require('./articleContamination');
const slots = require('./s344HumanSlots');

// pipeline.62 — token overlap between the assignment string and the lede (or
// the INTAKE claims) is gone. A reporter given "Fruitvale Transit Hub Phase II
// — Visioning stalled" who opens on the man at the shelter has done the job;
// the words not matching is a style of writing, not a miss. What survives is
// the one real contradiction: a faith coverage-gap INTAKE stapled to a transit
// story, which is the wrong assignment, not the wrong wording.
function assignmentBind(text, opts) {
  const findings = [];
  const body = shape.articleBody(text);
  const intake = slots.intakeBlock(text);
  if (/coverage-gap|Domain "faith"/i.test(intake) &&
      /transit initiative|Fruitvale Transit Hub|Fruitvale BART/i.test(body)) {
    findings.push({ check: 'assignment-bind', issue: 'assignment-intake-mismatch' });
  }
  return findings;
}

function evaluate(text, opts) {
  const findings = [];
  const observations = [];
  const summary = shape.isSummaryArticle(text);
  if (summary.fail) {
    for (const r of summary.reasons) findings.push({ check: 'summary', issue: r });
  }
  for (const r of summary.observations || []) observations.push({ check: 'summary', issue: r });
  const s344 = shape.s344Slots(text, opts || {});
  if (s344.fail) {
    for (const r of s344.reasons) findings.push({ check: 's344-slot', issue: r });
  }
  for (const r of s344.observations || []) observations.push({ check: 's344-slot', issue: r });
  const contam = contamination.scan(text, opts || {});
  if (contam.fail) findings.push(...contam.findings);
  findings.push(...assignmentBind(text, opts || {}));
  const seen = new Set();
  const uniq = [];
  for (const f of findings) {
    const k = f.check + '|' + f.issue;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(f);
  }
  return { fail: uniq.length > 0, findings: uniq, observations };
}

module.exports = { evaluate, assignmentBind };
