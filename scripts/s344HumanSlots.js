'use strict';

/**
 * S344 human-slot detectors (pipeline.54 Task 1).
 * Locally detectable format/provenance failures. Does not call Rhea.
 * Live W1/W2/W3 wiring is Tasks 2–8; this module scores locked fixtures.
 */

const REAL_WORLD = [
  { id: 'frank-ogawa', re: /1\s+Frank Ogawa Plaza|Frank Ogawa Plaza/i },
];

const TRIBUNE_AS_ACTOR = /the Tribune should ask|what should the Tribune ask|Tribune should demand|the paper should ask/i;

const UNSUPPLIED_ACCESS = [
  { id: 'room-sourced-speech', re: /\b(?:in|from|inside) the (?:clubhouse|dugout|locker room|press[ -]?box)\b[^.]{0,80}\b(?:said|told|whispered)\b/i },
];

function articleBody(text) {
  return String(text || '').split(/^##\s+INTAKE\s*$/im)[0];
}

function intakeBlock(text) {
  const parts = String(text || '').split(/^##\s+INTAKE\s*$/im);
  return parts.length > 1 ? parts[1] : '';
}

function storySection(storyMd, n) {
  const src = String(storyMd || '');
  const parts = src.split(/^## /m);
  for (const part of parts) {
    if (part.indexOf('§' + n + ' ') === 0 || part.indexOf('§' + n + '\n') === 0) {
      const nl = part.indexOf('\n');
      return (nl < 0 ? '' : part.slice(nl + 1)).trim();
    }
  }
  return '';
}

function assignmentAngle(storyMd) {
  const sec = storySection(storyMd, 1);
  const m = sec.match(/^- ANGLE \(assigned by the editor — fixed\):\s*(.+)$/m);
  return m ? m[1].trim() : '';
}

const { chaseIsJsonShaped } = require('./livedExperiencePacket');

function isJsonShaped(text) {
  return chaseIsJsonShaped(text);
}

function tribuneAsActorHits(text) {
  const src = String(text || '');
  const hits = [];
  const lines = src.split('\n');
  for (const line of lines) {
    if (TRIBUNE_AS_ACTOR.test(line)) hits.push(line.trim());
  }
  return hits;
}

function interviewLines(section3) {
  return String(section3 || '').split('\n')
    .map(l => l.trim())
    .filter(l => /^- .+\(POP-\d+\)/i.test(l) || /^- .+:\s*"/.test(l));
}

function realWorldHits(prose) {
  const hits = [];
  for (const p of REAL_WORLD) {
    if (p.re.test(prose)) hits.push(p.id);
  }
  return hits;
}

function unsuppliedAccessHits(prose) {
  const hits = [];
  for (const p of UNSUPPLIED_ACCESS) {
    if (p.re.test(prose)) hits.push(p.id);
  }
  return hits;
}

function intakeFaithGap(intake) {
  return /Domain "faith"|coverage-gap/i.test(intake);
}

function articleTransitSubject(body) {
  return /transit initiative|Fruitvale Transit Hub|Fruitvale BART/i.test(body);
}

function scanControl({ story, article }) {
  const chase = storySection(story, 2);
  const interviews = storySection(story, 3);
  const body = articleBody(article);
  const intake = intakeBlock(article);
  const quotes = tribuneAsActorHits(interviews);
  const lines = interviewLines(interviews);
  return {
    jsonChase: isJsonShaped(chase),
    tribuneAsActor: quotes,
    emptyInterviews: lines.length === 0,
    realWorld: realWorldHits(body),
    unsuppliedAccess: unsuppliedAccessHits(body),
    assignmentAngle: assignmentAngle(story),
    intakeFaithGap: intakeFaithGap(intake),
    articleTransit: articleTransitSubject(body),
    assignmentIntakeMismatch: intakeFaithGap(intake) && articleTransitSubject(body),
  };
}

module.exports = {
  articleBody,
  intakeBlock,
  storySection,
  assignmentAngle,
  isJsonShaped,
  tribuneAsActorHits,
  interviewLines,
  realWorldHits,
  unsuppliedAccessHits,
  scanControl,
};
