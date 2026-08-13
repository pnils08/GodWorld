'use strict';

/**
 * Typed lived-experience Packet v1.
 *
 * Dynamic world state crosses an LLM boundary in this order:
 * actor -> task -> signal -> exposure -> known claims -> limits -> output.
 * The compact keys are intentional: Packets are machine prompts first and
 * inspection artifacts second. Markdown remains the human audit view.
 */

const VERSION = 'LEP/1';
const CLAIM_TYPES = Object.freeze(['FACT', 'OBSERVATION', 'INTERPRETATION', 'INTENTION', 'LEAD']);
const WAKES = Object.freeze(['W1', 'W2', 'W3']);

function clean(value, max) {
  const s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return max && s.length > max ? s.slice(0, max) : s;
}

function uniq(values) {
  return [...new Set((values || []).map(v => clean(v)).filter(Boolean))];
}

function uniqueClaims(claims) {
  const seen = new Set();
  return (claims || []).filter(claim => {
    const key = [clean(claim && claim.t), clean(claim && claim.text), clean(claim && claim.src)].join('\n');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function refClaim(type, text, src, extra) {
  if (!CLAIM_TYPES.includes(type)) throw new Error('unknown claim type: ' + type);
  const claim = { t: type, text: clean(text, 500), src: clean(src, 300) };
  if (!claim.text || !claim.src) throw new Error(type + ' claim requires text+src');
  return Object.assign(claim, extra || {});
}

function assertBase(packet, wake) {
  const errs = [];
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) errs.push('packet must be an object');
  if (packet && packet.v !== VERSION) errs.push('v must equal ' + VERSION);
  if (packet && !WAKES.includes(packet.wake)) errs.push('wake must be W1, W2, or W3');
  if (wake && packet && packet.wake !== wake) errs.push('wake must equal ' + wake);
  for (const key of ['actor', 'task', 'signal', 'exposure', 'known', 'limits', 'output']) {
    if (packet && (packet[key] == null)) errs.push('missing ' + key);
  }
  for (const c of (packet && packet.known) || []) {
    if (!CLAIM_TYPES.includes(c && c.t)) errs.push('known claim has invalid type');
    if (!clean(c && c.text) || !clean(c && c.src)) errs.push('known claim requires text+src');
  }
  if (errs.length) throw new Error('invalid lived-experience Packet: ' + errs.join('; '));
  return packet;
}

function candidateRows(story, slice) {
  const packetCitizens = slice && slice.packetSeat && slice.packetSeat.citizens;
  const fromSlice = Array.isArray(packetCitizens) && packetCitizens.length
    ? packetCitizens
    : Array.isArray(slice && slice.citizens)
    ? slice.citizens
    : (Array.isArray(slice && slice.players) ? slice.players
      : (Array.isArray(slice && slice.candidates) ? slice.candidates : []));
  if (fromSlice.length) return fromSlice.map(c => ({
    pop: c.popid || null,
    name: c.name || null,
    profile: c.profile || [c.name, c.role, c.neighborhood].filter(Boolean).join(' — '),
    why: c.why || 'assignment',
    role: c.role || null,
    hood: c.neighborhood || story.hood || null,
  }));
  const pops = story.popids || [];
  return (story.citizens || []).map((line, i) => {
    const parts = String(line).split(/\s+[—-]\s+/);
    return { pop: pops[i] || null, name: parts[0] || null, profile: line,
      why: 'assignment', role: parts[1] || null, hood: story.hood || null };
  });
}

function creativeBriefFromSlice(slice) {
  if (!slice) return null;
  let brief = null;
  if (slice.charge) {
    brief = {
      kind: 'fan-heat',
      fanCharge: clean(slice.charge.fanCharge, 80) || null,
      bagModes: (slice.charge.bagModes || []).slice(0, 3).map(mode =>
        clean([mode && mode.id, mode && mode.name].filter(Boolean).join(' '), 120)).filter(Boolean),
      friction: clean(slice.friction && slice.friction.frame, 500) || null,
      centralFeeling: clean(slice.charge.centralFeeling, 500) || null,
      priorTake: clean(slice.prewrite && slice.prewrite.priorTake, 300) || null,
      sceneRule: clean(slice.scene && slice.scene.colorRoom, 500) || null,
    };
  } else if (slice.kind === 'anthony-analytic') {
    const prewrite = slice.prewrite || {};
    brief = {
      kind: 'sports-analytics',
      pulseClass: clean(slice.pulse && slice.pulse.className, 100) || null,
      bagTools: (prewrite.bagTools || []).slice(0, 2).map(tool =>
        clean([tool && tool.id, tool && tool.name].filter(Boolean).join(' '), 120)).filter(Boolean),
      claim: clean(prewrite.claim, 500) || null,
      lineFacts: uniq(prewrite.lineFacts).slice(0, 6),
      missing: uniq(prewrite.missing).slice(0, 8),
      sceneRule: clean(slice.scene && slice.scene.colorRoom, 500) || null,
      sourcePointers: uniq(slice.pointers || []).slice(0, 5),
    };
  } else if (slice.kind === 'hal-archive') {
    const prewrite = slice.prewrite || {};
    brief = {
      kind: 'sports-history',
      pulseClass: clean(slice.pulse && slice.pulse.className, 100) || null,
      bagModes: (prewrite.bagModes || []).slice(0, 2).map(mode =>
        clean([mode && mode.id, mode && mode.name].filter(Boolean).join(' '), 120)).filter(Boolean),
      historicalAnchor: clean(prewrite.historicalAnchor, 300) || null,
      presentFacts: uniq(prewrite.presentFacts).slice(0, 6),
      dossierFacts: uniq(prewrite.dossierFacts).slice(0, 4),
      missing: uniq(prewrite.missing).slice(0, 8),
      closingNote: clean(prewrite.closingNote, 100) || null,
      priorFiling: clean(prewrite.priorFiling, 300) || null,
      sceneRule: clean(slice.scene && slice.scene.colorRoom, 500) || null,
      sourcePointers: uniq(slice.pointers || []).slice(0, 5),
    };
  } else if (slice.kind === 'tanya-sideline') {
    const prewrite = slice.prewrite || {};
    brief = {
      kind: 'sideline-dispatch',
      pulseClass: clean(slice.pulse && slice.pulse.className, 100) || null,
      bagModes: (prewrite.bagModes || []).slice(0, 2).map(mode =>
        clean([mode && mode.id, mode && mode.name].filter(Boolean).join(' '), 120)).filter(Boolean),
      claim: clean(prewrite.claim, 500) || null,
      anchorFacts: uniq(prewrite.anchorFacts).slice(0, 8),
      accessEvidence: prewrite.accessEvidence || { state: 'NOT_SUPPLIED', facts: [] },
      quoteEvidence: prewrite.quoteEvidence || { state: 'NOT_SUPPLIED', quotes: [] },
      observationEvidence: prewrite.observationEvidence || { state: 'NOT_SUPPLIED', facts: [] },
      missing: uniq(prewrite.missing).slice(0, 8),
      sceneRule: clean(slice.scene && slice.scene.colorRoom, 500) || null,
      sourcePointers: uniq(slice.pointers || []).slice(0, 5),
    };
  } else if (slice.kind === 'economic-storefront') {
    const prewrite = slice.prewrite || {};
    brief = {
      kind: 'economic-storefront',
      pulseClass: clean(prewrite.pulseClass, 100) || null,
      economicFrame: clean(prewrite.angle, 500) || null,
      hook: clean(prewrite.hookLine, 500) || null,
      namedBusinesses: uniq(prewrite.namedBusinesses).slice(0, 8),
      forbidden: uniq(prewrite.forbidden).slice(0, 8),
      sceneRule: clean(slice.scene && slice.scene.colorRoom, 500) || null,
    };
  } else if (slice.kind === 'evening-life') {
    const prewrite = slice.prewrite || {};
    const seat = slice.packetSeat || {};
    const texture = slice.texture || {};
    const signals = slice.signals || {};
    const fame = (signals.fame || []).map(row => clean(
      [row && row.name, row && row.venue, row && row.label].filter(Boolean).join(' — '), 240));
    brief = {
      kind: 'evening-life',
      bag: clean(seat.bag || prewrite.bagRecommend, 80) || null,
      pulseClass: clean(seat.pulseClass || prewrite.pulseClass, 100) || null,
      pulseLabel: clean(seat.pulseLabel || '', 300) || null,
      namedEvents: uniq([...(texture.cityEvents || []), ...(texture.tv || []), ...(texture.movies || [])]).slice(0, 8),
      namedPlaces: uniq([...(texture.restaurants || []).map(v => v && v.name),
        ...(texture.nightlife || []).map(v => v && v.name)]).slice(0, 8),
      famousSightings: uniq([...(texture.famous || []), ...fame]).slice(0, 8),
      streamingTrend: clean(texture.streamingTrend, 240) || null,
      sceneRule: clean(slice.scene && slice.scene.colorRoom, 500) || null,
      sourcePointers: uniq([seat.bagDoc, ...(slice.pointers || [])]).slice(0, 5),
    };
  } else if (slice.kind === 'public-safety') {
    const prewrite = slice.prewrite || {};
    brief = {
      kind: 'public-safety',
      pulseClass: clean(slice.pulse && slice.pulse.className, 100) || null,
      safetyFrame: clean(slice.story && (slice.story.angle || slice.story.label), 500) || null,
      classificationNote: clean(prewrite.classificationNote, 500) || null,
      anchorFacts: uniq(prewrite.anchorFacts).slice(0, 8),
      missing: uniq(prewrite.missing).slice(0, 8),
      practicalClose: clean(prewrite.practicalClose, 300) || null,
      sceneRule: clean(slice.scene && slice.scene.colorRoom, 500) || null,
      sourcePointers: uniq(slice.pointers || []).slice(0, 5),
    };
  } else if (slice.kind === 'civic-domain' && slice.packetSeat &&
      slice.packetSeat.seat && slice.packetSeat.seat.domain === 'accountability-anomaly') {
    const prewrite = slice.packetSeat.prewrite || {};
    brief = {
      kind: 'civic-investigation',
      method: clean(prewrite.method, 40) || 'KNOWN_UNKNOWN',
      missing: uniq(prewrite.missing).slice(0, 6),
      reportingEvidence: prewrite.reportingEvidence || {
        recordChecks: { state: 'NOT_SUPPLIED', events: [] },
        requestEvents: { state: 'NOT_SUPPLIED', events: [] },
        responseEvents: { state: 'NOT_SUPPLIED', events: [] },
        responsibleEntities: { state: 'NOT_SUPPLIED', entities: [] },
      },
      silenceClock: prewrite.silenceClock && prewrite.silenceClock.state === 'UNESTABLISHED'
        ? { state: 'UNESTABLISHED', value: null, src: null }
        : null,
      forbidden: uniq(prewrite.forbidden).slice(0, 6),
    };
  } else if (slice.kind === 'civic-domain' && slice.packetSeat &&
      slice.packetSeat.seat && slice.packetSeat.seat.domain === 'infrastructure-transit') {
    const prewrite = slice.packetSeat.prewrite || {};
    brief = {
      kind: 'infrastructure-systems',
      method: clean(prewrite.method, 40) || 'INCIDENT_LINK_WARNING',
      missing: uniq(prewrite.missing).slice(0, 6),
      cascade: prewrite.cascade && prewrite.cascade.state === 'UNESTABLISHED'
        ? { state: 'UNESTABLISHED', facts: [], link: null, src: null }
        : null,
      forbidden: uniq(prewrite.forbidden).slice(0, 6),
    };
  } else if (slice.kind === 'civic-domain' && slice.packetSeat &&
      slice.packetSeat.seat && slice.packetSeat.seat.domain === 'health') {
    const prewrite = slice.packetSeat.prewrite || {};
    brief = {
      kind: 'health-service',
      method: clean(prewrite.method, 40) || 'ACCESS_TIMELINE_HUMAN_COST',
      missing: uniq(prewrite.missing).slice(0, 6),
      humanConsequence: prewrite.humanConsequence &&
        prewrite.humanConsequence.state === 'UNESTABLISHED'
        ? { state: 'UNESTABLISHED', subjects: [], facts: [], src: null }
        : null,
      forbidden: uniq(prewrite.forbidden).slice(0, 6),
    };
  } else if (slice.kind === 'civic-domain' && slice.packetSeat &&
      slice.packetSeat.seat && slice.packetSeat.seat.domain === 'education-youth') {
    const prewrite = slice.packetSeat.prewrite || {};
    brief = {
      kind: 'education-stability',
      method: clean(prewrite.method, 40) || 'PROGRAM_CONTINUITY_ACCESS',
      missing: uniq(prewrite.missing).slice(0, 6),
      stabilityEvidence: prewrite.stabilityEvidence &&
        prewrite.stabilityEvidence.state === 'UNESTABLISHED'
        ? { state: 'UNESTABLISHED', participants: [], facts: [], src: null }
        : null,
      forbidden: uniq(prewrite.forbidden).slice(0, 6),
    };
  } else if (slice.kind === 'civic-domain' && slice.packetSeat &&
      slice.packetSeat.seat && slice.packetSeat.seat.domain === 'environment') {
    const prewrite = slice.packetSeat.prewrite || {};
    brief = {
      kind: 'weather-ground',
      method: clean(prewrite.method, 40) || 'CONDITION_BASELINE',
      missing: uniq(prewrite.missing).slice(0, 6),
      impactEvidence: prewrite.impactEvidence &&
        prewrite.impactEvidence.state === 'UNESTABLISHED'
        ? { state: 'UNESTABLISHED', subjects: [], facts: [], src: null }
        : null,
      forbidden: uniq(prewrite.forbidden).slice(0, 6),
    };
  }
  if (!brief) return null;
  return Object.values(brief).some(value => Array.isArray(value) ? value.length : value)
    ? brief
    : null;
}

function buildAnglePacket({ cycle, desk, reporter, story, approach, slice, lane }) {
  if (!story) throw new Error('W1 Packet requires an assigned story');
  const src = story.ref || 'assignment';
  const known = [
    refClaim('FACT', story.label || story.angle, src),
  ];
  if (story.hookLine) known.push(refClaim('FACT', story.hookLine, src));
  if (slice && slice.contradiction) {
    if (slice.contradiction.a) known.push(refClaim('FACT', slice.contradiction.a, src));
    if (slice.contradiction.b) known.push(refClaim('FACT', slice.contradiction.b, src));
  }
  if (slice && slice.scene && slice.scene.weather) {
    known.push(refClaim('FACT', slice.scene.weather, 'World_Config/weather snapshot for C' + cycle));
  }
  if (slice && slice.scene && slice.scene.neighborhoodTexture) {
    known.push(refClaim('FACT', slice.scene.neighborhoodTexture, src));
  }
  for (const fact of (slice && slice.prewrite && slice.prewrite.anchorFacts) || []) {
    const text = clean(fact, 500);
    if (text && !/\b(?:do not|never)\s+(?:invent|lead|print|publish|assert|name|use)\b/i.test(text) &&
        !known.some(claim => claim.text === text && claim.src === clean(src, 300))) {
      known.push(refClaim('FACT', text, src));
    }
  }
  for (const fact of (slice && slice.prewrite && slice.prewrite.presentFacts) || []) {
    const text = clean(fact, 500);
    if (text && !known.some(claim => claim.text === text && claim.src === clean(src, 300))) {
      known.push(refClaim('FACT', text, src));
    }
  }
  // Interview exposure is identity-bearing: unresolved names may remain in the
  // assigned facts, but only ledger-resolved POPIDs can become W2 targets.
  const candidates = candidateRows(story, slice)
    .filter(candidate => clean(candidate.pop) && !(slice && slice.charge))
    .slice(0, 12);
  const hasTargetCandidates = candidates.length > 0;
  const creativeBrief = creativeBriefFromSlice(slice);
  const packet = {
    v: VERSION,
    wake: 'W1',
    actor: { id: reporter && reporter.popid || null, name: reporter && reporter.name || null,
      role: 'desk reporter', desk },
    task: { goal: 'Plan one Article chase without choosing a new assignment',
      assignment: clean(story.angle || story.label, 500), approach: clean(approach, 900) || null,
      ...(creativeBrief ? { creativeBrief } : {}) },
    signal: { kind: story.kind || 'story-signal', hood: story.hood || null,
      score: story.stinkScore == null ? null : story.stinkScore, src },
    exposure: { basis: ['editor-assignment', 'desk-signal'],
      candidates: candidates.map(c => ({ pop: c.pop, name: c.name, profile: clean(c.profile, 300),
        why: c.why, role: c.role, hood: c.hood })) },
    known: uniqueClaims(known),
    limits: {
      assert: ['FACT'],
      reason: ['INTERPRETATION', 'INTENTION', 'LEAD'],
      never: ['new named person', 'new institution', 'new event', 'new date', 'new number'],
      rule: 'A reporter plan may form a hunch, but a hunch is not a fact. Preserve angle autonomy inside the assigned signal.',
    },
    output: {
      format: 'json-only',
      schema: { focus: 'string', why: 'string', checks: ['string'],
        targets: hasTargetCandidates
          ? [{ pop: 'supplied non-empty candidate pop', question: 'string', basis: 'string' }]
          : [],
        interpretation: 'string', unverifiedLead: ['string'], closeQuestion: 'string' },
      rule: hasTargetCandidates
        ? 'Every target must use a supplied non-empty candidate pop. Do not invent people or identifiers.'
        : 'No target candidate was supplied. Return targets as an empty array; do not invent a person or identifier.',
    },
  };
  if (Array.isArray(lane) && lane.length) {
    packet.signal.nearby = lane.slice(0, 5).map(e => ({ text: clean(e.label, 240), src: clean(e.ref, 240) }));
  }
  return assertBase(packet, 'W1');
}

function parseJsonObject(text) {
  let raw = clean(text);
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) raw = fenced[1].trim();
  try { return JSON.parse(raw); } catch (_) {}
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('model returned no JSON object');
  return JSON.parse(raw.slice(start, end + 1));
}

function validateAngleOutput(value, input) {
  const out = typeof value === 'string' ? parseJsonObject(value) : value;
  const errs = [];
  for (const k of ['focus', 'why', 'interpretation', 'closeQuestion']) if (!clean(out && out[k])) errs.push('missing ' + k);
  if (!Array.isArray(out && out.checks)) errs.push('checks must be an array');
  if (!Array.isArray(out && out.targets)) errs.push('targets must be an array');
  const allowed = new Set(((input && input.exposure && input.exposure.candidates) || []).map(c => c.pop).filter(Boolean));
  if (allowed.size) {
    for (const t of (out && out.targets) || []) {
      if (!t || !allowed.has(t.pop) || !clean(t.question) || !clean(t.basis)) errs.push('target must use a supplied pop with question+basis');
    }
  }
  if (!Array.isArray(out && out.unverifiedLead)) errs.push('unverifiedLead must be an array');
  if (errs.length) throw new Error('invalid W1 output: ' + errs.join('; '));
  return {
    focus: clean(out.focus, 500), why: clean(out.why, 500),
    checks: uniq(out.checks).slice(0, 8),
    targets: allowed.size
      ? out.targets.slice(0, 8).map(t => ({ pop: t.pop, question: clean(t.question, 400), basis: clean(t.basis, 300) }))
      : [],
    interpretation: clean(out.interpretation, 500),
    unverifiedLead: uniq(out.unverifiedLead).slice(0, 8),
    closeQuestion: clean(out.closeQuestion, 400),
  };
}

function questionFor(candidate, anglePlan, story) {
  const role = clean(candidate && candidate.role).toLowerCase();
  const focus = clean(anglePlan && anglePlan.focus, 260) || clean(story.angle || story.label, 260);
  if (/council|mayor|official|director|chief/.test(role)) {
    return 'Using only the supplied facts, what about "' + focus + '" creates accountability, and what answer should the Tribune demand? Do not claim any past or future official action that is not in the Packet.';
  }
  if (candidate && candidate.hood && story.hood && candidate.hood === story.hood) {
    return 'As a resident of ' + story.hood + ', what about the supplied trend "' + focus + '" feels off, and what question should the Tribune ask? React to the data; do not add a concrete example, object, event, or rumor.';
  }
  return 'What does the supplied trend "' + focus + '" mean to you, and what should the Tribune ask next? Do not add a concrete example, object, event, or rumor.';
}

function buildReportPacket({ cycle, desk, reporter, angleInput, anglePlan, story, candidate }) {
  if (!story || !candidate) throw new Error('W2 Packet requires story+candidate');
  const src = story.ref || 'assignment';
  const known = (angleInput && angleInput.known || []).filter(c => c.t === 'FACT').slice(0, 8);
  if (candidate.profile) known.push(refClaim('FACT', candidate.profile, 'Simulation_Ledger profile for ' + candidate.pop));
  const isOfficial = /council|mayor|official|director|chief/i.test(candidate.role || '');
  const packet = {
    v: VERSION,
    wake: 'W2',
    actor: { id: candidate.pop, name: candidate.name, role: candidate.role || 'citizen', desk: null },
    task: { goal: 'Answer one reporter question from bounded lived experience',
      reporter: reporter && reporter.name || null,
      question: questionFor(candidate, anglePlan, story) },
    signal: { kind: story.kind || 'story-signal', hood: story.hood || null,
      focus: clean(anglePlan && anglePlan.focus || story.angle || story.label, 500), src },
    exposure: { basis: uniq([candidate.why || 'assignment', candidate.hood === story.hood ? 'same-neighborhood' : null]),
      self: clean(candidate.profile, 400) || null,
      planTarget: (anglePlan && anglePlan.targets || []).find(t => t.pop === candidate.pop) || null },
    known,
    limits: {
      quoteEligible: !isOfficial,
      assert: ['FACT already supplied', 'your own feeling', 'your own intention'],
      classify: CLAIM_TYPES,
      never: ['invent a named person', 'invent a public event', 'invent a date', 'invent a count', 'turn suspicion into observation'],
      rule: (isOfficial ? 'This generic citizen-voice path cannot create an institutional statement. Return abstain; an office statement must come from the civic voice record. ' : '') + 'Private memory may shape emotion, but it is not evidence of a public event. INTERPRETATION stays abstract: feeling, meaning, accountability, or a question about supplied facts only—no new illustrative objects or actions. INTENTION is a personal demand or attention stance only—no meeting, schedule, funding, program, institutional act, or promise. Put every concrete unsupplied detail in unverifiedLead or abstain.',
    },
    output: {
      format: 'json-only',
      schema: { answer: 'quote|abstain',
        observation: [{ text: 'string', src: 'exact src from packet.known; empty when none' }],
        interpretation: ['string'], intention: ['personal intention only; no new institutional action'],
        unverifiedLead: ['string'],
        quoteParts: [{ t: 'INTERPRETATION|INTENTION', i: 'zero-based index into that array' }],
        limits: ['string'] },
      rule: 'The backend assembles the publishable quote from quoteParts. New firsthand claims belong in unverifiedLead unless packet.known supplies their exact source.',
    },
  };
  return assertBase(packet, 'W2');
}

function validateReportOutput(value, input) {
  const out = typeof value === 'string' ? parseJsonObject(value) : value;
  const errs = [];
  if (!out || !['quote', 'abstain'].includes(out.answer)) errs.push('answer must be quote|abstain');
  for (const k of ['observation', 'interpretation', 'intention', 'unverifiedLead', 'quoteParts', 'limits']) {
    if (!Array.isArray(out && out[k])) errs.push(k + ' must be an array');
  }
  const sources = new Set(((input && input.known) || []).map(c => c.src));
  if (out && out.answer === 'quote' && input && input.limits && input.limits.quoteEligible === false) {
    errs.push('generic citizen-voice path cannot publish an institutional quote');
  }
  for (const obs of out && Array.isArray(out.observation) ? out.observation : []) {
    if (!obs || !clean(obs.text) || !sources.has(obs.src)) errs.push('observation requires text + exact packet.known src');
  }
  const parts = [];
  for (const part of out && Array.isArray(out.quoteParts) ? out.quoteParts : []) {
    if (!part || !['INTERPRETATION', 'INTENTION'].includes(part.t) || !Number.isInteger(part.i)) {
      errs.push('quotePart must use INTERPRETATION|INTENTION + integer i');
      continue;
    }
    const list = part.t === 'INTERPRETATION' ? out.interpretation : out.intention;
    if (!Array.isArray(list) || !clean(list[part.i])) errs.push('quotePart index is out of range');
    else parts.push(clean(list[part.i], 700));
  }
  if (out && out.answer === 'quote' && !parts.length) errs.push('quote answer requires at least one valid quotePart');
  if (out && out.answer === 'abstain' && parts.length) errs.push('abstain cannot carry quoteParts');
  if (errs.length) throw new Error('invalid W2 output: ' + errs.join('; '));
  return {
    answer: out.answer,
    observation: out.observation.slice(0, 6).map(o => ({ text: clean(o.text, 600), src: clean(o.src, 300) })),
    interpretation: uniq(out.interpretation).slice(0, 6),
    intention: uniq(out.intention).slice(0, 4),
    unverifiedLead: uniq(out.unverifiedLead).slice(0, 6),
    quoteParts: out.quoteParts.slice(0, 6),
    publishableQuote: out.answer === 'quote' ? clean(parts.join(' '), 1400) : null,
    limits: uniq(out.limits).slice(0, 6),
  };
}

function buildWritePacket({ cycle, desk, reporter, story, approach, angleInput, anglePlan, interviews, lane }) {
  const facts = ((angleInput && angleInput.known) || []).filter(c => c.t === 'FACT');
  const usable = [];
  const leads = [];
  for (const q of interviews || []) {
    if (!q || !q.claims) continue;
    if (q.claims.publishableQuote) usable.push({ name: q.name, pop: q.pop,
      quote: q.claims.publishableQuote });
    for (const lead of q.claims.unverifiedLead || []) leads.push({ from: q.name, text: lead, usable: false });
  }
  const packet = {
    v: VERSION,
    wake: 'W3',
    actor: { id: reporter && reporter.popid || null, name: reporter && reporter.name || null,
      role: 'desk reporter', desk },
    task: { goal: 'Write one Article and machine-parseable INTAKE from the supplied evidence',
      assignment: clean(story && (story.angle || story.label), 500),
      approach: clean(approach, 900).replace(/Scene color is yours\s*\([^)]*\)\s*so long as it contradicts nothing on this slice\.?/i, '').trim() || null,
      voice: /jax|caldera/i.test(reporter && reporter.name || '')
        ? 'Short, hot, first-person accountability column. Open on the sourced contradiction, press the supplied accountable subject, and end on the plan closeQuestion. No generic revitalization plea.'
        : null,
      ...(angleInput && angleInput.task && angleInput.task.creativeBrief
        ? { creativeBrief: angleInput.task.creativeBrief }
        : {}) },
    signal: { kind: story && story.kind || 'story-signal', hood: story && story.hood || null,
      src: story && story.ref || 'assignment',
      plan: anglePlan ? {
        // W1 is editorial reasoning, not evidence. Only its framing survives
        // into W3; checks, target rationales, and unverified leads do not.
        focus: anglePlan.focus, closeQuestion: anglePlan.closeQuestion,
      } : null },
    exposure: {
      subjects: (() => {
        const candidates = ((angleInput && angleInput.exposure && angleInput.exposure.candidates) || []);
        const officialTargets = new Set((anglePlan && anglePlan.targets || [])
          .map(t => t.pop)
          .filter(pop => {
            const candidate = candidates.find(c => c.pop === pop);
            return /council|mayor|official|director|chief/i.test(candidate && candidate.profile || '');
          }));
        const wanted = new Set([...officialTargets, ...usable.map(q => q.pop)]);
        const byPop = new Map(candidates.map(c => [c.pop, c]));
        for (const q of usable) {
          if (!byPop.has(q.pop)) byPop.set(q.pop, {
            pop: q.pop, name: q.name,
            profile: q.inputPacket && q.inputPacket.actor ? q.inputPacket.actor.name : q.name,
            src: 'packet.W2.interview'
          });
          wanted.add(q.pop);
        }
        return [...byPop.values()]
          .filter(c => wanted.has(c.pop))
          .map(c => ({ pop: c.pop, name: c.name, profile: c.profile,
            quotationEligible: usable.some(q => q.pop === c.pop), src: c.src || 'packet.W1.exposure' }));
      })(),
      sources: usable,
      excludedLeads: leads.concat((anglePlan && anglePlan.unverifiedLead || [])
        .map(text => ({ from: reporter && reporter.name || 'reporter-plan', text, usable: false }))),
    },
    known: facts,
    limits: {
      assert: ['known FACT claims'],
      attribute: ['supplied publishableQuote lines'],
      reason: ['INTERPRETATION clearly framed as analysis'],
      never: ['assert excludedLead', 'invent a source', 'invent a hard event', 'invent a date or number', 'import a real-world Oakland entity'],
      rule: 'Style is free; claims are typed. Only exposure.sources contain attributable spoken words. Never quote or attribute a known FACT to an exposure.subject, and never imply that a subject made a statement. Scene texture may be sensory only and may not create a new event, person, business, institution, quote, count, or causal fact.',
    },
    output: {
      format: 'markdown-article',
      intake: {
        heading: '## INTAKE', oneRecordPerLine: true, omitEmptyTypes: true,
        lines: ['NAMES: <one citizen name> | <quoted-source OR subject OR mentioned>',
          'BIZ: <one business/org name> | <quoted-source OR subject OR mentioned>',
          'STORYLINE: <short-kebab-case-slug> | <advanced OR opened OR closed OR referenced>',
          'HOOD: <one neighborhood>', 'CLAIM: <one fact> | <one supplied source ref>'],
        never: ['comma-combine records', 'BIZ: None', 'invent a role enum'],
      },
      footer: '<!-- SELF-SCORE: question-answered=yes|no; affected-citizen-shown=yes|no; sim-state-cited=yes|no -->',
      rule: 'Index only what the Article prints. Repeat NAMES/BIZ/HOOD/CLAIM lines for multiple records. Every CLAIM must point to one supplied src.',
    },
  };
  // Adjacent lane events are useful during W1 planning, but are deliberately
  // absent from W3 until the plan selects and validates them as Article facts.
  return assertBase(packet, 'W3');
}

function prompt(packet) {
  assertBase(packet);
  return 'PACKET_JSON\n' + JSON.stringify(packet) + '\nEND_PACKET\nReturn only the output format requested by packet.output.';
}

module.exports = {
  VERSION, CLAIM_TYPES, WAKES, refClaim, assertBase, buildAnglePacket,
  validateAngleOutput, candidateRows, buildReportPacket, validateReportOutput,
  buildWritePacket, parseJsonObject, prompt,
};
