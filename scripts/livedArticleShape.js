'use strict';

/**
 * A summary of the Packet is not an Article.
 * The engine line is the weather. The Article is someone living under it.
 */

function articleBody(text) {
  return String(text || '').split(/^##\s+INTAKE\s*$/im)[0];
}

function isSummaryArticle(text) {
  const body = articleBody(text);
  const reasons = [];
  if (/the supplied record establishes/i.test(body)) reasons.push('auditor-lede');
  if (/those supplied claims define the current record/i.test(body)) reasons.push('auditor-frame');
  if (/what remains to be learned here/i.test(body)) reasons.push('auditor-close');
  if (/what additional record would explain/i.test(body)) reasons.push('auditor-close');
  if (/the next reporting question is/i.test(body)) reasons.push('auditor-close');
  if (/\bthe Packet does not establish\b/i.test(body)) reasons.push('packet-voice');
  if (/\bis listed as\b/i.test(body) && /\bphase\b/i.test(body)) reasons.push('tracker-recap');
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  const bullets = lines.filter(l => /^[-*]\s/.test(l));
  if (bullets.length >= 3 && bullets.length >= Math.max(3, lines.length * 0.35)) {
    reasons.push('fact-list');
  }
  const lede = lines.filter(l => !/^#/.test(l)).slice(0, 6).join(' ');
  if (/\b(?:disbursement-active|construction-planning|implementation-active|pilot-active|dispatch-live)\b/i.test(lede)) {
    reasons.push('phase-lede');
  }
  if (/\bStoryAngle\s*\(feed\)|\bStats\s*\(feed\)|\bTeam record\s*\(feed\)/i.test(body)) {
    reasons.push('feed-dump');
  }
  return { fail: reasons.length > 0, reasons };
}

module.exports = { isSummaryArticle, articleBody };
