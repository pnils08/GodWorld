'use strict';

const crypto = require('crypto');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const VOTES = new Set(['YES', 'NO', 'ABSTAIN']);

function extractSeatBallots(seat, voice, cycle, voteSessions) {
  const officeId = String(seat && seat.officeId || '');
  const holder = String(seat && seat.popid || '');
  if (!/^COUNCIL-D\d$/.test(officeId) || !holder) throw new Error('ballot seat identity invalid');
  const out = [];
  const seen = new Set();
  for (const st of (voice && voice.ballots) || []) {
    const initiativeId = String(st.initiativeId || '').trim();
    const vote = String(st.vote || '').trim().toUpperCase();
    const session = voteSessions && voteSessions[initiativeId];
    if (!session || Number(session.cycle) !== Number(cycle)) throw new Error('vote statement has no current session: ' + initiativeId);
    if (session.body !== 'council') throw new Error('council ballot cannot enter ' + session.body + ' session');
    if (String(st.sessionId || '') !== session.sessionId) throw new Error('ballot session mismatch: ' + initiativeId);
    if (!VOTES.has(vote) || seen.has(initiativeId)) throw new Error('invalid or duplicate recorded ballot: ' + initiativeId);
    seen.add(initiativeId);
    const sourceRef = 'voice:' + officeId + ':C' + cycle + ':ballot:' + initiativeId;
    out.push({ schema: 'CIVIC-BALLOT/1', sessionId: session.sessionId,
      initiativeId, cycle: Number(cycle), officeId, holderPopid: holder,
      body: session.body || 'council', vote, sourceRef,
      sourceHash: hash(st), ballotId: 'BAL-' + hash([session.sessionId, officeId, holder]).slice(0, 20) });
  }
  return out;
}

function collectBallots(seats, voices, cycle, voteSessions) {
  const ballots = [];
  const delivery = [];
  for (const seat of seats) {
    const result = voices && voices[seat.officeId];
    const status = String(seat.status || 'active').toLowerCase();
    if (['vacant', 'hospitalized', 'serious-condition', 'critical', 'injured',
      'deceased', 'resigned', 'retired'].includes(status)) {
      delivery.push({ officeId: seat.officeId, status: 'absent' });
      continue;
    }
    if (!result || !result.ok || !result.voice) {
      delivery.push({ officeId: seat.officeId, status: 'technical-undelivered' });
      continue;
    }
    ballots.push(...extractSeatBallots(seat, result.voice, cycle, voteSessions));
    delivery.push({ officeId: seat.officeId, status: 'delivered' });
  }
  return { schema: 'CIVIC-BALLOT-BATCH/1', cycle: Number(cycle),
    ballots, delivery, sessions: voteSessions || {},
    sourceHash: hash({ cycle, ballots, delivery }) };
}

function previewTally(batch, initiativeId, quorum, votesNeeded) {
  const session = batch && batch.sessions && batch.sessions[initiativeId];
  if (!session || session.body !== 'council') return { status: 'unavailable', reason: 'council session missing' };
  if (!Number.isInteger(quorum) || quorum < 1 || !Number.isInteger(votesNeeded) || votesNeeded < 1)
    return { status: 'unavailable', reason: 'quorum/vote requirement missing' };
  const delivery = batch.delivery || [];
  if (delivery.some(d => d.status === 'technical-undelivered'))
    return { status: 'retry', reason: 'technical nondelivery has not exhausted its opportunity' };
  const relevant = (batch.ballots || []).filter(b => b.initiativeId === initiativeId && b.sessionId === session.sessionId);
  const eligible = delivery.filter(d => d.status === 'delivered');
  const eligibleIds = new Set(eligible.map(d => d.officeId));
  if (new Set(relevant.map(b => b.officeId)).size !== relevant.length ||
      relevant.some(b => !eligibleIds.has(b.officeId) || !VOTES.has(b.vote)))
    return { status: 'invalid', reason: 'duplicate, ineligible, or malformed ballot' };
  const votes = new Map(relevant.map(b => [b.officeId, b.vote]));
  if (eligible.length < quorum) return { status: 'deferred', reason: 'quorum unavailable' };
  const yes = [...votes.values()].filter(v => v === 'YES').length;
  const no = [...votes.values()].filter(v => v === 'NO').length;
  const abstain = eligible.length - yes - no;
  if (abstain < 0) return { status: 'invalid', reason: 'more ballots than delivered seats' };
  return { status: yes >= votesNeeded ? 'passed-preview' : 'failed-preview',
    yes, no, abstain, absent: delivery.filter(d => d.status === 'absent').length,
    sourceHash: batch.sourceHash, authoritative: false };
}

function extractMayorDecision(seat, voice, cycle, initiativeId) {
  if (!seat || seat.officeId !== 'MAYOR-01' || !seat.popid) throw new Error('mayor identity invalid');
  const relevant = ((voice || {}).executiveDecisions || []).filter(s => String(s.initiativeId || '') === initiativeId);
  const choices = relevant.map(s => ({ s, choice: String(s.decision || '').toLowerCase() }))
    .filter(x => ['sign', 'veto'].includes(x.choice));
  if (choices.length !== 1) return { available: false, reason: choices.length ? 'conflicting mayor decisions' : 'explicit mayor decision missing' };
  return { available: true, schema: 'CIVIC-MAYOR-DECISION/1', initiativeId,
    officeId: seat.officeId, holderPopid: seat.popid, cycle: Number(cycle),
    decision: choices[0].choice, sourceHash: hash(choices[0].s) };
}

module.exports = { extractSeatBallots, collectBallots, previewTally, extractMayorDecision, hash };
