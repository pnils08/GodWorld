'use strict';

/**
 * civic.24 City Hall Ledger — the room, not the program.
 * Disk only: output/cron-civic/city-hall-ledger_c{N}.json
 * Does not write Initiative_Tracker.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const V = 'CITYHALL/1';

function ledgerPath(cycle, root) {
  return path.join(root || ROOT, 'output', 'cron-civic', 'city-hall-ledger_c' + cycle + '.json');
}

function emptyLedger(cycle) {
  return { cycle: Number(cycle), v: V, hearing: [], votes: [], gavel: null };
}

function loadOrCreate(cycle, root) {
  const p = ledgerPath(cycle, root);
  if (fs.existsSync(p)) {
    try {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (j && j.v === V) return j;
    } catch (_) { /* rewrite */ }
  }
  return emptyLedger(cycle);
}

function save(ledger, root) {
  const p = ledgerPath(ledger.cycle, root);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(ledger, null, 2) + '\n');
  return p;
}

function quoteFromVoice(voiceJson) {
  const sts = (voiceJson && voiceJson.statements) || [];
  const st = sts[0] || {};
  return String(st.quote || st.decision || voiceJson.cascadeSummary || '').trim();
}

function actionAskedFromVoice(voiceJson) {
  const sts = (voiceJson && voiceJson.statements) || [];
  const st = sts[0] || {};
  return String(st.actionAsked || st.decision || '').trim();
}

function hearingRow(seat, voiceJson, voiceFile, opts) {
  const o = opts || {};
  return {
    officeId: seat.officeId,
    popid: seat.popid || null,
    holder: seat.holder,
    district: seat.district || null,
    faction: seat.faction || null,
    seatStatus: o.seatStatus || 'active',
    disposition: o.disposition || (o.seatStatus === 'recovering' ? 'ABSENT' : 'statement'),
    initiativeId: o.initiativeId || null,
    lever: o.lever || '',
    quote: quoteFromVoice(voiceJson),
    actionAsked: actionAskedFromVoice(voiceJson),
    voiceFile: voiceFile || '',
  };
}

function appendHearing(ledger, row) {
  const next = Object.assign({}, ledger, { hearing: (ledger.hearing || []).slice() });
  next.hearing = next.hearing.filter(h => h.officeId !== row.officeId);
  next.hearing.push(row);
  return next;
}

function voteDispositions(councilRoster, spoken) {
  const byId = spoken || {};
  return (councilRoster || []).map(s => {
    const status = String(s.status || s.seatStatus || 'active').toLowerCase();
    const officeId = s.officeId || ('COUNCIL-' + s.district);
    if (status === 'recovering' || status === 'vacant') {
      return { officeId, holder: s.holder || s.name, disposition: 'ABSENT' };
    }
    const hit = byId[officeId];
    return {
      officeId,
      holder: s.holder || s.name,
      disposition: hit || 'no-action',
    };
  });
}

function setVote(ledger, initiativeId, councilRoster, spoken) {
  const seats = voteDispositions(councilRoster, spoken);
  if (seats.length !== 9) throw new Error('City Hall Ledger vote must list 9 seats, got ' + seats.length);
  const next = Object.assign({}, ledger, { votes: (ledger.votes || []).slice() });
  next.votes = next.votes.filter(v => v.initiativeId !== initiativeId);
  next.votes.push({ initiativeId, seats });
  return next;
}

function writeGavel(ledger, mayorSeat, voiceJson, voiceFile, dispositions) {
  return Object.assign({}, ledger, {
    gavel: {
      officeId: mayorSeat.officeId || 'MAYOR-01',
      popid: mayorSeat.popid || null,
      holder: mayorSeat.holder,
      dispositions: dispositions || [],
      quote: quoteFromVoice(voiceJson),
      voiceFile: voiceFile || '',
    },
  });
}

function gavelPhases(voiceJson) {
  const out = [];
  for (const st of (voiceJson && voiceJson.statements) || []) {
    const tu = st.trackerUpdates || {};
    const id = tu.initiative || tu.InitiativeID || st.initiative;
    if (!id) continue;
    out.push({
      initiativeId: id,
      mayoralAction: tu.MayoralAction || tu.mayoralAction || 'none',
      implementationPhase: tu.ImplementationPhase || null,
      note: tu.MilestoneNotes || st.decision || '',
    });
  }
  return out;
}

module.exports = {
  V,
  ledgerPath,
  emptyLedger,
  loadOrCreate,
  save,
  hearingRow,
  appendHearing,
  voteDispositions,
  setVote,
  writeGavel,
  gavelPhases,
};
