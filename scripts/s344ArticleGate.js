'use strict';

/**
 * pipeline.54 Tasks 5–8 — deterministic Article gates before Rhea.
 * Packet is the sidecar. Rhea is contradiction-only.
 */

const shape = require('./livedArticleShape');
const contamination = require('./articleContamination');
const slots = require('./s344HumanSlots');

function assignmentBind(text, opts) {
  const findings = [];
  const assignment = (opts && opts.assignment) || '';
  const body = shape.articleBody(text);
  const intake = slots.intakeBlock(text);
  const tokens = shape.assignmentTokens(assignment);
  const lede = (shape.paragraphs(body)[0] || '').toLowerCase();
  if (tokens.length && lede && !tokens.some(t => lede.indexOf(t) >= 0)) {
    findings.push({ check: 'assignment-bind', issue: 'lede-misses-assignment' });
  }
  const claims = [];
  String(intake || '').split('\n').forEach(line => {
    const m = line.match(/^CLAIM:\s*(.+)$/i);
    if (m) claims.push(m[1]);
  });
  const claimBlob = claims.join(' ').toLowerCase();
  if (tokens.length && claims.length && !tokens.some(t => claimBlob.indexOf(t) >= 0)) {
    findings.push({ check: 'assignment-bind', issue: 'intake-misses-assignment' });
  }
  if (/coverage-gap|Domain "faith"/i.test(intake) &&
      /transit initiative|Fruitvale Transit Hub|Fruitvale BART/i.test(body)) {
    findings.push({ check: 'assignment-bind', issue: 'assignment-intake-mismatch' });
  }
  return findings;
}

function evaluate(text, opts) {
  const findings = [];
  const summary = shape.isSummaryArticle(text);
  if (summary.fail) {
    for (const r of summary.reasons) findings.push({ check: 'summary', issue: r });
  }
  const s344 = shape.s344Slots(text, opts || {});
  if (s344.fail) {
    for (const r of s344.reasons) findings.push({ check: 's344-slot', issue: r });
  }
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
  return { fail: uniq.length > 0, findings: uniq };
}

module.exports = { evaluate, assignmentBind };
