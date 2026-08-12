'use strict';

/**
 * Typed lived-experience Packet v2.
 *
 * LEP/1 proved that ordered JSON reduces context and exposes abstention, but a
 * model could still hide a concrete invention inside an INTERPRETATION. LEP/2
 * changes one variable: Wake 2 selects code-owned stance/question fragments,
 * and Wake 3 receives a code-owned Article claim manifest with stable local
 * IDs. The model may select and arrange claims; it may not author quote facts.
 */

const crypto = require('crypto');
const v1 = require('./livedExperiencePacket');

const VERSION = 'LEP/2';

const LATTICE = Object.freeze({
  stances: Object.freeze([
    { id: 'S_CONCERN', text: 'What this record shows concerns me.' },
    { id: 'S_MISMATCH', text: 'What the record shows does not line up with what I expected.' },
    { id: 'S_ATTENTION', text: 'This deserves a closer look.' },
    { id: 'S_ACCOUNTABILITY', text: 'Someone should answer for what the record shows.' },
  ]),
  questions: Object.freeze([
    { id: 'Q_ATTENTION', text: 'Why is this not getting more attention?' },
    { id: 'Q_OWNER', text: 'Who is responsible for answering this?' },
    { id: 'Q_NEXT', text: 'What happens next?' },
    { id: 'Q_GAP', text: 'What explains the gap in the record?' },
  ]),
  intentions: Object.freeze([
    { id: 'I_NONE', text: '' },
    { id: 'I_WATCH', text: 'I am going to keep watching this.' },
    { id: 'I_ANSWER', text: 'I want a clear answer.' },
    { id: 'I_PRESS', text: 'The Tribune should keep pressing for an answer.' },
  ]),
});

function clean(value, max) {
  const s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return max && s.length > max ? s.slice(0, max) : s;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function idMap(rows) {
  return new Map((rows || []).map(row => [row.id, row]));
}

function claimId(claim) {
  return 'F-' + crypto.createHash('sha256')
    .update(clean(claim && claim.t) + '\n' + clean(claim && claim.text) + '\n' + clean(claim && claim.src))
    .digest('hex').slice(0, 12);
}

function attachFactIds(packet) {
  packet.known = (packet.known || []).map(claim => Object.assign({}, claim, {
    id: claim.id || claimId(claim),
  }));
  return packet;
}

function assertBase(packet, wake) {
  const errs = [];
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) errs.push('packet must be an object');
  if (packet && packet.v !== VERSION) errs.push('v must equal ' + VERSION);
  if (wake && packet && packet.wake !== wake) errs.push('wake must equal ' + wake);
  for (const key of ['actor', 'task', 'signal', 'exposure', 'known', 'limits', 'output']) {
    if (packet && packet[key] == null) errs.push('missing ' + key);
  }
  const factIds = new Set();
  for (const claim of (packet && packet.known) || []) {
    if (!clean(claim && claim.id) || factIds.has(claim.id)) errs.push('known claim requires unique id');
    factIds.add(claim && claim.id);
    if (!v1.CLAIM_TYPES.includes(claim && claim.t)) errs.push('known claim has invalid type');
    if (!clean(claim && claim.text) || !clean(claim && claim.src)) errs.push('known claim requires text+src');
  }
  if (packet && packet.wake === 'W3') {
    const manifest = packet.manifest;
    if (!manifest || !Array.isArray(manifest.approvedFacts) || !Array.isArray(manifest.approvedQuotes) ||
        !Array.isArray(manifest.approvedSubjects) || !Array.isArray(manifest.permittedInterpretationSlots) ||
        !Array.isArray(manifest.unverifiedLeads) || !Array.isArray(manifest.forbiddenClaimClasses) ||
        !Array.isArray(manifest.authorizedTexture) || !Array.isArray(manifest.textureConditions) ||
        !['exhaustive', 'load-bearing'].includes(manifest.policy)) {
      errs.push('W3 requires a complete Article claim manifest');
    } else {
      if (manifest.policy === 'load-bearing' &&
          (!packet.reviewProfile || packet.reviewProfile.canonPolicy !== 'load-bearing')) {
        errs.push('load-bearing manifest requires a matching reviewProfile');
      }
      const approvedFactIds = new Set(manifest.approvedFacts.map(row => row && row.id));
      const subjectIds = new Set(manifest.approvedSubjects.map(row => row && row.id));
      if (approvedFactIds.size !== manifest.approvedFacts.length ||
          [...approvedFactIds].some(id => !factIds.has(id))) errs.push('manifest facts must uniquely reference packet.known');
      const quoteIds = new Set();
      for (const quote of manifest.approvedQuotes) {
        if (!quote || !clean(quote.id) || quoteIds.has(quote.id)) errs.push('manifest quote ids must be unique');
        quoteIds.add(quote && quote.id);
        if (!subjectIds.has(quote && quote.speakerId)) errs.push('manifest quote speaker must be an approved subject');
        if ((quote && quote.factIds || []).some(id => !approvedFactIds.has(id))) errs.push('manifest quote references unknown fact');
      }
    }
  }
  if (errs.length) throw new Error('invalid LEP/2 Packet: ' + errs.join('; '));
  return packet;
}

function buildAnglePacket(args) {
  const packet = clone(v1.buildAnglePacket(args));
  packet.v = VERSION;
  packet.known.unshift({
    t: 'FACT',
    text: 'Current cycle: C' + clean(args && args.cycle),
    src: 'cron-desk-run explicit cycle argument',
  });
  attachFactIds(packet);
  return assertBase(packet, 'W1');
}

function buildReportPacket(args) {
  const packet = clone(v1.buildReportPacket(args));
  packet.v = VERSION;
  attachFactIds(packet);
  packet.exposure = Object.assign({}, packet.exposure, {
    editorialTarget: Boolean(packet.exposure && packet.exposure.planTarget),
  });
  delete packet.exposure.planTarget;
  packet.lattice = clone(LATTICE);
  packet.limits.rule = (packet.limits.quoteEligible === false
    ? 'This generic citizen path cannot create an institutional statement; return abstain. '
    : '') +
    'Select supplied FACT ids and code-owned lattice ids only. Free text is allowed solely in unverifiedLead and never reaches Wake 3.';
  packet.output = {
    format: 'json-only',
    schema: {
      answer: 'quote|abstain',
      fact_ids: ['one or more ids from packet.known'],
      stance_id: 'one id from packet.lattice.stances; null on abstain',
      question_id: 'one id from packet.lattice.questions; null on abstain',
      intention_id: 'one id from packet.lattice.intentions; I_NONE allowed',
      unverifiedLead: ['free lead text; never publishable'],
      abstain_reason: 'institutional_path_required|insufficient_evidence|contract_conflict|other|null',
    },
    rule: 'The backend renders the quote from selected lattice ids. Do not write quote prose.',
  };
  return assertBase(packet, 'W2');
}

function selectedRow(rows, id, field, errs, required) {
  if (!id && !required) return null;
  const row = idMap(rows).get(id);
  if (!row) errs.push(field + ' must select a supplied lattice id');
  return row || null;
}

function validateReportOutput(value, input) {
  const out = typeof value === 'string' ? v1.parseJsonObject(value) : value;
  const errs = [];
  const answer = out && out.answer;
  if (!['quote', 'abstain'].includes(answer)) errs.push('answer must be quote|abstain');
  if (!Array.isArray(out && out.fact_ids)) errs.push('fact_ids must be an array');
  if (!Array.isArray(out && out.unverifiedLead)) errs.push('unverifiedLead must be an array');
  const known = idMap((input && input.known) || []);
  const facts = [];
  for (const id of (out && Array.isArray(out.fact_ids) ? out.fact_ids : [])) {
    if (!known.has(id)) errs.push('fact_ids contains an unknown id');
    else if (!facts.includes(id)) facts.push(id);
  }
  if (answer === 'quote' && !facts.length) errs.push('quote requires at least one supplied fact id');
  if (answer === 'quote' && input && input.limits && input.limits.quoteEligible === false) {
    errs.push('generic citizen path cannot publish an institutional quote');
  }
  const stance = selectedRow(LATTICE.stances, out && out.stance_id, 'stance_id', errs, answer === 'quote');
  const question = selectedRow(LATTICE.questions, out && out.question_id, 'question_id', errs, answer === 'quote');
  const intention = selectedRow(LATTICE.intentions, out && out.intention_id, 'intention_id', errs, answer === 'quote');
  if (answer === 'abstain' && (out.stance_id || out.question_id || (out.intention_id && out.intention_id !== 'I_NONE'))) {
    errs.push('abstain cannot select publishable lattice fragments');
  }
  const allowedReasons = new Set(['institutional_path_required', 'insufficient_evidence', 'contract_conflict', 'other', null, undefined]);
  if (!allowedReasons.has(out && out.abstain_reason)) errs.push('invalid abstain_reason');
  if (errs.length) throw new Error('invalid LEP/2 W2 output: ' + errs.join('; '));

  const fragments = answer === 'quote' ? [stance.text, question.text, intention.text].filter(Boolean) : [];
  const selection = {
    facts,
    stance: stance && stance.id || null,
    question: question && question.id || null,
    intention: intention && intention.id || null,
  };
  const quoteId = answer === 'quote'
    ? 'Q-' + clean(input.actor && input.actor.id || 'UNKNOWN') + '-' +
      crypto.createHash('sha256').update(JSON.stringify(selection)).digest('hex').slice(0, 10)
    : null;
  return {
    answer,
    factIds: facts,
    stanceId: selection.stance,
    questionId: selection.question,
    intentionId: selection.intention,
    unverifiedLead: [...new Set((out.unverifiedLead || []).map(v => clean(v, 500)).filter(Boolean))].slice(0, 6),
    abstainReason: out.abstain_reason || null,
    quoteId,
    publishableQuote: answer === 'quote' ? fragments.join(' ') : null,
  };
}

function manifestId(packet) {
  const basis = JSON.stringify({
    actor: packet.actor && packet.actor.id,
    facts: (packet.known || []).map(c => c.id),
    quotes: (packet.exposure && packet.exposure.sources || []).map(q => q.id),
  });
  return 'AM-' + crypto.createHash('sha256').update(basis).digest('hex').slice(0, 12);
}

function buildWritePacket(args) {
  const packet = clone(v1.buildWritePacket(args));
  packet.v = VERSION;
  const reviewProfile = args.reviewProfile ? clone(args.reviewProfile) : null;
  const loadBearingPolicy = reviewProfile && reviewProfile.canonPolicy === 'load-bearing';
  if (reviewProfile) packet.reviewProfile = reviewProfile;
  attachFactIds(packet);
  const interviews = args.interviews || [];
  const approvedQuotes = interviews
    .filter(row => row && row.claims && row.claims.publishableQuote && row.claims.quoteId)
    .map(row => ({
      id: row.claims.quoteId,
      speakerId: row.pop,
      speakerName: row.name,
      text: row.claims.publishableQuote,
      factIds: row.claims.factIds || [],
      src: 'packet.W2[' + row.pop + ']',
    }));
  const factMap = new Map(packet.known.map(claim => [claim.id, claim]));
  for (const row of interviews) {
    if (!row || !row.claims || !row.inputPacket) continue;
    const selected = new Set(row.claims.factIds || []);
    for (const claim of row.inputPacket.known || []) {
      if (selected.has(claim.id) && !factMap.has(claim.id)) factMap.set(claim.id, claim);
    }
  }
  packet.known = [...factMap.values()];
  packet.exposure.sources = approvedQuotes.map(q => ({
    id: q.id, pop: q.speakerId, name: q.speakerName, quote: q.text,
    factIds: q.factIds, src: q.src,
  }));
  const approvedFacts = packet.known.map(c => ({ id: c.id, t: c.t, text: c.text, src: c.src }));
  const approvedFactIds = new Set(approvedFacts.map(c => c.id));
  for (const quote of approvedQuotes) {
    for (const id of quote.factIds) {
      if (!approvedFactIds.has(id)) throw new Error('LEP/2 quote references fact absent from W3 manifest: ' + id);
    }
  }
  const approvedSubjects = (packet.exposure.subjects || []).map(s => ({
    id: s.pop, name: s.name, profile: s.profile, src: s.src,
    quotationEligible: approvedQuotes.some(q => q.speakerId === s.pop),
  }));
  packet.manifest = {
    id: null,
    policy: loadBearingPolicy ? 'load-bearing' : 'exhaustive',
    approvedFacts,
    approvedQuotes,
    approvedSubjects,
    permittedInterpretationSlots: [
      { id: 'P_EMPHASIS', rule: 'Choose which approved fact deserves emphasis; add no new factual premise.' },
      { id: 'P_ACCOUNTABILITY', rule: 'Ask who should answer; do not assert an unsupplied duty, action, or absence.' },
      { id: 'P_CLOSE', rule: 'Use the supplied closeQuestion as a question, never as proof.' },
    ],
    unverifiedLeads: (packet.exposure.excludedLeads || []).map(lead => ({
      from: lead.from, text: lead.text, publishable: false,
    })),
    authorizedTexture: loadBearingPolicy ? clone(reviewProfile.authorizedTexture || []) : [],
    textureConditions: loadBearingPolicy ? clone(reviewProfile.textureConditions || []) : [],
    forbiddenClaimClasses: loadBearingPolicy
      ? clone(reviewProfile.canonBlockers || [])
      : [
        'new person or institution',
        'new place or street',
        'new event or firsthand scene',
        'new date, cycle, count, metric, budget, or duration',
        'new direct quotation',
        'unsupported collective sentiment',
        'unsupported history, causality, duty, action, or absence',
      ],
  };
  packet.manifest.id = manifestId(packet);
  packet.limits.assert = ['manifest.approvedFacts exact claims'];
  packet.limits.attribute = ['manifest.approvedQuotes exact text'];
  packet.limits.rule = loadBearingPolicy
    ? 'The manifest is exhaustive for load-bearing canon claims. Persona-authorized texture may create lived street color only inside manifest.authorizedTexture and manifest.textureConditions; it never proves a canon fact.'
    : 'The Article claim manifest is exhaustive. Better prose may arrange and interpret it, but may not enlarge it.';
  if (packet.task && packet.task.creativeBrief &&
      packet.task.creativeBrief.kind === 'civic-investigation') {
    packet.limits.rule += ' For this investigation, do not convert a source intention to keep watching into past tracking; do not invent conversations, access, requests, responses, files, owners, duties, offices, expectations, or collective conclusions. Attribute each approved quote exactly and separately. Missing fields stay unknown, not implied.';
    packet.limits.rule += ' Use the exact epistemic form "the Packet does not establish X" for missing evidence. Never rewrite missing evidence as "X did not happen," "no one did X," "I looked/asked/requested," or "the absence proves X." First-person reporting acts require an approved fact that names that act.';
    packet.manifest.permittedInterpretationSlots.push({
      id: 'P_KNOWN_UNKNOWN',
      rule: 'Contrast approved facts with creativeBrief.missing only; do not narrate a missing item as an event that occurred.'
    });
  }
  packet.output.preflight = {
    facts: 'select manifest.approvedFacts ids',
    quotes: 'select manifest.approvedQuotes ids',
    subjects: 'select manifest.approvedSubjects ids',
  };
  return assertBase(packet, 'W3');
}

function numericTokens(text) {
  return String(text || '').match(/[+-]?\d+(?:\.\d+)?(?:st|nd|rd|th|%|\$)?/gi) || [];
}

function quotedSpans(text) {
  const spans = [];
  const re = /[“"]([^”"\n]{2,})[”"]/g;
  let match;
  while ((match = re.exec(String(text || '')))) spans.push(clean(match[1]));
  return spans;
}

function auditArticle(draftText, packet) {
  assertBase(packet, 'W3');
  const approvedText = [
    ...packet.manifest.approvedFacts.map(row => row.text),
    ...packet.manifest.approvedQuotes.map(row => row.text),
    ...packet.manifest.approvedSubjects.map(row => row.profile),
  ].join('\n');
  const allowedNumbers = new Set(numericTokens(approvedText).map(v => v.toLowerCase()));
  const newNumbers = [...new Set(numericTokens(draftText)
    .map(v => v.toLowerCase()).filter(v => !allowedNumbers.has(v)))];
  const approvedQuotes = new Set(packet.manifest.approvedQuotes.map(row => clean(row.text)));
  const unknownQuotes = quotedSpans(draftText).filter(quote => !approvedQuotes.has(quote));
  const errors = [];
  if (newNumbers.length) errors.push({ code: 'UNAPPROVED_NUMBER', values: newNumbers });
  if (unknownQuotes.length) errors.push({ code: 'UNAPPROVED_QUOTE', values: unknownQuotes });
  const investigation = packet.task && packet.task.creativeBrief &&
    packet.task.creativeBrief.kind === 'civic-investigation';
  if (investigation) {
    const overreach = [
      /\bI(?:'ve| have)?\s+(?:looked|asked|requested|heard|found|checked|reviewed|tracked)\b/i,
      /\b(?:flagged|told|said)\s+(?:it\s+)?to\s+me\b/i,
      /\b(?:independently|before I did)\b/i,
      /\bno (?:one|office|agency|person)\s+(?:has|had|was|is)\b/i,
      /\b(?:no|without an?)\s+(?:attached\s+)?record of (?:anyone|an office|a request|a response)\b/i,
      /\b(?:the )?absence (?:is|becomes|proves|shows)\b/i,
      /\b(?:whoever|somebody)\s+(?:owns|holds)\b/i,
      /\b(?:office|owner|file-holder|duty-holder)\s+(?:behind|holding|responsible for)\b/i,
    ].flatMap(re => String(draftText || '').match(re) || []).map(value => clean(value));
    if (overreach.length) errors.push({
      code: 'INVESTIGATION_EPISTEMIC_OVERREACH',
      values: [...new Set(overreach)],
    });
  }
  // A load-bearing profile deliberately routes lexical differences to Rhea for
  // semantic review. Street ordinals, sign phrasing, punctuation, and anonymous
  // color are not mechanically distinguishable from factual claims. The old
  // fatal lexical wall therefore becomes review evidence, while exhaustive
  // evaluation packets retain their original fail-closed behavior.
  if (packet.manifest.policy === 'load-bearing') {
    const hard = errors.filter(error => error.code === 'INVESTIGATION_EPISTEMIC_OVERREACH');
    if (hard.length) return { ok: false, manifestId: packet.manifest.id, errors: hard,
      observations: errors.filter(error => !hard.includes(error)) };
    return { ok: true, manifestId: packet.manifest.id, errors: [], observations: errors };
  }
  return { ok: errors.length === 0, manifestId: packet.manifest.id, errors, observations: [] };
}

function prompt(packet) {
  assertBase(packet);
  return 'PACKET_JSON\n' + JSON.stringify(packet) +
    '\nEND_PACKET\nReturn only the output format requested by packet.output.';
}

module.exports = {
  VERSION,
  LATTICE,
  assertBase,
  candidateRows: v1.candidateRows,
  validateAngleOutput: v1.validateAngleOutput,
  parseJsonObject: v1.parseJsonObject,
  buildAnglePacket,
  buildReportPacket,
  validateReportOutput,
  buildWritePacket,
  auditArticle,
  prompt,
};
