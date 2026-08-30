'use strict';

/**
 * A summary of the Packet is not an Article.
 * The engine line is the weather. The Article is someone living under it.
 */

function articleBody(text) {
  return String(text || '').split(/^##\s+INTAKE\s*$/im)[0];
}

function paragraphs(body) {
  return String(body || '')
    .split(/\n\s*\n/)
    .map(p => p.replace(/^#+\s+/, '').trim())
    .filter(Boolean);
}

function ledeParagraph(paras) {
  if (paras.length >= 2 && paras[0].length < 80 && !/[.?!]/.test(paras[0])) return paras[1];
  return paras[0] || '';
}

function assignmentTokens(assignment) {
  return String(assignment || '').toLowerCase().split(/[^a-z0-9-]+/)
    .filter(w => w.replace(/-/g, '').length >= 5);
}

function normalizeQuote(text) {
  return String(text || '').toLowerCase().replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim();
}

function quoteSpans(text) {
  const n = normalizeQuote(text);
  if (n.length < 12) return [];
  const spans = [n];
  n.split(/[.?!]+/).map(s => s.trim()).filter(s => s.length >= 12).forEach(s => spans.push(s));
  return spans;
}

function packetQuoteLanded(body, quotes) {
  const bodyNorm = normalizeQuote(body);
  for (const q of quotes || []) {
    const raw = typeof q === 'string' ? q : (q && q.quote);
    for (const span of quoteSpans(raw)) {
      if (bodyNorm.indexOf(span) >= 0) return true;
    }
  }
  return false;
}

// pipeline.62 — `reasons` are structural fails (the article has no lede, no
// scene, no Packet quote at all). `observations` are craft notes for the log
// and for Rhea's context: a reporter who used a Packet quote in her own split
// attribution, or closed on a statement instead of a question, has written a
// newspaper story, not a violation. Assignment-token overlap in the lede is
// gone entirely — a headline is not a keyword match.
function s344Slots(text, opts) {
  const reasons = [];
  const observations = [];
  const body = articleBody(text);
  const paras = paragraphs(body);
  const quotes = (opts && opts.quotes) || [];
  if (!paras.length) reasons.push('missing-lede');
  const quoteTexts = quotes.map(q => typeof q === 'string' ? q : (q && q.quote)).filter(Boolean);
  if (quoteTexts.length) {
    if (!packetQuoteLanded(body, quoteTexts)) observations.push('missing-packet-quote');
  } else if (opts && opts.requireQuote) {
    reasons.push('missing-packet-quote');
  }
  const tail = paras.slice(-2).join(' ');
  if (!/\?/.test(tail)) observations.push('missing-unanswered-question');
  if (paras.length < 3) reasons.push('missing-scene');
  return { fail: reasons.length > 0, reasons, observations };
}

function isSummaryArticle(text) {
  const body = articleBody(text);
  const reasons = [];
  const observations = [];
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
  // pipeline.62 — a phase name in the lede is tracker vocabulary, not a
  // summary article. A civic desk has to be able to say a project is in
  // construction planning. Observation only.
  const lede = lines.filter(l => !/^#/.test(l)).slice(0, 6).join(' ');
  if (/\b(?:disbursement-active|construction-planning|implementation-active|pilot-active|dispatch-live)\b/i.test(lede)) {
    observations.push('phase-lede');
  }
  if (/\bStoryAngle\s*\(feed\)|\bStats\s*\(feed\)|\bTeam record\s*\(feed\)/i.test(body)) {
    reasons.push('feed-dump');
  }
  return { fail: reasons.length > 0, reasons, observations };
}

module.exports = {
  isSummaryArticle, articleBody, s344Slots, assignmentTokens, paragraphs, ledeParagraph,
  normalizeQuote, packetQuoteLanded,
};
