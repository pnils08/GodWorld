'use strict';

/**
 * CITIZEN_INTERVIEW/1 — Wake 2 is an interview, not a quote-template selector.
 *
 * The citizen authors `quote` from the simulated life context assembled by
 * citizenVoice.js. The backend validates and preserves that text exactly. An
 * attributed statement is evidence that the citizen said it; it is not
 * independent proof of every public claim inside the statement.
 */

const crypto = require('crypto');

const CONTRACT = 'CITIZEN_INTERVIEW/1';
const LEGACY_LATTICE = Object.freeze([
  'What this record shows concerns me.',
  'What the record shows does not line up with what I expected.',
  'This deserves a closer look.',
  'Someone should answer for what the record shows.',
  'Why is this not getting more attention?',
  'Who is responsible for answering this?',
  'What happens next?',
  'What explains the gap in the record?',
  'I am going to keep watching this.',
  'I want a clear answer.',
  'The Tribune should keep pressing for an answer.',
]);

function clean(value, max) {
  const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return max && text.length > max ? text.slice(0, max) : text;
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const text = String(value || '').trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('interview output must contain one JSON object');
  return JSON.parse(text.slice(start, end + 1));
}

function prepareInterviewPacket(packet) {
  if (!packet || packet.v !== 'LEP/2' || packet.wake !== 'W2') {
    throw new Error('CITIZEN_INTERVIEW/1 requires an LEP/2 W2 Packet');
  }
  const out = JSON.parse(JSON.stringify(packet));
  delete out.lattice;
  const livedEvidence = hasLivedEvidence(out);
  out.task.goal = 'Answer one reporter question in your own first-person voice from your simulated life';
  out.limits.rule = out.limits.quoteEligible === false
    ? 'Return abstain. This citizen is not eligible for this interview path.'
    : livedEvidence
      ? 'Speak as yourself — your job, your block, the named people you actually know. The Packet fact is this cycle\'s city news, not a report to grade. Do not invent a named person, place, number, or official act. If you have nothing true, abstain.'
      : 'Speak as yourself from your job and your block. One to three first-person sentences. The Packet fact is city news you heard about, not a spreadsheet. Name only people and places already in your life or the Packet. No invented bakery, bar, or official. Use basis direct-reaction.';
  out.output = {
    contract: CONTRACT,
    format: 'json-only',
    schema: {
      answer: 'quote|abstain',
      quote: 'your exact first-person response; null on abstain',
      fact_ids: ['one or more supplied fact ids that prompted the response'],
      basis: livedEvidence ? 'lived-context|direct-reaction|null' : 'direct-reaction|null',
      unverifiedLead: ['concrete follow-up lead that must not be printed as fact'],
      abstain_reason: 'no_lived_basis|ineligible|contract_conflict|other|null',
    },
    rule: 'Write the actual quote. The backend preserves quote exactly and never composes, paraphrases, or completes it.',
  };
  return out;
}

function isInterviewPacket(packet) {
  return Boolean(packet && packet.output && packet.output.contract === CONTRACT);
}

function hasLivedEvidence(packet) {
  return Boolean(packet && packet.exposure && Array.isArray(packet.exposure.evidence) &&
    packet.exposure.evidence.some(row => row && row.id && row.src));
}

function directReactionIssues(quote) {
  const issues = [];
  const text = clean(quote);
  if (text.split(/\s+/).length > 80) issues.push('direct reaction exceeds 80 words');
  const sentences = text.split(/(?<=[.!?])\s+/).map(value => value.trim()).filter(Boolean);
  if (sentences.length < 1 || sentences.length > 3) issues.push('direct reaction must be one to three sentences');
  if (!/^(?:I\b|I['’]m\b|My\b|To me\b|For me\b)/i.test(text)) {
    issues.push('direct reaction must be first person');
  }
  const unsupportedHistory = [
    /\b(?:no|without any) (?:real )?updates?\b/i,
    /\bpromises?\b/i,
    /\bdecades?\b/i,
    /\bcommunity meetings?\b/i,
    /\bslideshows?\b/i,
    /\brebrand(?:ed|ing|s)?\b/i,
    /\bcontractor bids?\b/i,
    /\beveryone (?:around here )?knows\b/i,
    /\bshovel/i,
    /\bredraw/i,
  ];
  if (unsupportedHistory.some(pattern => pattern.test(text))) {
    issues.push('direct reaction claims unsupplied history or experience');
  }
  return issues;
}

function validateInterviewOutput(value, input) {
  if (!isInterviewPacket(input)) throw new Error('missing ' + CONTRACT + ' Packet');
  const out = parseJsonObject(value);
  const errors = [];
  if (!['quote', 'abstain'].includes(out.answer)) errors.push('answer must be quote|abstain');
  if (!Array.isArray(out.fact_ids)) errors.push('fact_ids must be an array');
  if (out.unverifiedLead != null && !Array.isArray(out.unverifiedLead)) {
    errors.push('unverifiedLead must be an array or null');
  }
  const knownIds = new Set((input.known || []).map(row => row && row.id).filter(Boolean));
  const factIds = [];
  for (const id of Array.isArray(out.fact_ids) ? out.fact_ids : []) {
    if (!knownIds.has(id)) errors.push('fact_ids contains an unknown id');
    else if (!factIds.includes(id)) factIds.push(id);
  }
  const quote = clean(out.quote, 1400);
  if (out.answer === 'quote') {
    if (input.limits && input.limits.quoteEligible === false) errors.push('citizen is not quote eligible');
    if (!quote || quote.split(/\s+/).length < 4) errors.push('quote must contain an authored response');
    if (!factIds.length) errors.push('quote requires at least one supplied fact id');
    if (!['lived-context', 'direct-reaction'].includes(out.basis)) errors.push('quote requires a supported basis');
    if (out.basis === 'lived-context' && !hasLivedEvidence(input)) {
      errors.push('lived-context basis requires addressable story-linked evidence');
    }
    if (out.basis === 'direct-reaction') errors.push(...directReactionIssues(quote));
    const lower = quote.toLowerCase();
    if (LEGACY_LATTICE.some(line => lower.includes(line.toLowerCase()))) {
      errors.push('legacy backend lattice text is not citizen speech');
    }
    if ((input.known || []).some(row => clean(row && row.text).toLowerCase() === lower)) {
      errors.push('quote cannot be a copied Packet fact');
    }
  } else {
    if (quote) errors.push('abstain cannot include quote text');
  }
  if (errors.length) throw new Error('invalid ' + CONTRACT + ' output: ' + errors.join('; '));
  const quoteId = out.answer === 'quote'
    ? 'Q-' + clean(input.actor && input.actor.id || 'UNKNOWN') + '-' +
      crypto.createHash('sha256').update(quote).digest('hex').slice(0, 10)
    : null;
  return {
    answer: out.answer,
    factIds,
    basis: out.basis || null,
    unverifiedLead: [...new Set((out.unverifiedLead || []).map(value => clean(value, 500)).filter(Boolean))].slice(0, 6),
    abstainReason: out.abstain_reason || null,
    quoteId,
    authoredQuote: out.answer === 'quote',
    publishableQuote: out.answer === 'quote' ? quote : null,
  };
}

function citizenEvidenceGuard(livedContextAllowed) {
  const grounding = livedContextAllowed
    ? 'The Packet supplies addressable story-linked lived evidence, so you may use the matching simulated-life context above.'
    : 'The Packet does not supply story-linked lived evidence. Speak as yourself anyway — your job, your block, the named people already in your life. One to three first-person sentences. The Packet fact is city news, not a spreadsheet. Do not invent a person, bakery, bar, or official act. Set basis to direct-reaction.';
  return '\n\nINTERVIEW MODE: Return ONLY the JSON. This is a conversation on the street, not an analysis. ' + grounding + ' The quote field is what you actually say and will be preserved exactly. Never mention packets, data, records, prompts, or systems.';
}

module.exports = {
  CONTRACT,
  LEGACY_LATTICE,
  prepareInterviewPacket,
  isInterviewPacket,
  hasLivedEvidence,
  validateInterviewOutput,
  directReactionIssues,
  citizenEvidenceGuard,
};
