#!/usr/bin/env node
'use strict';

/**
 * Shared civic-domain heat slice for the solo civic journalists.
 *
 * This is disk-first by design: it reads the current cycle's desk signal and
 * any locally rendered civic decisions/datawakes. It never reads Sheets.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CIVIC_SEATS = Object.freeze({
  'carmen-delaine': {
    name: 'Carmen Delaine',
    popid: 'POP-00011',
    domain: 'civic-ledger',
    approach: 'Civic-ledger approach: follow the supplied initiative, vote, or decision through money, clocks, and responsible offices. One record-backed civic claim; not a press release or multi-voice roundup.',
    hook: 'The civic record identifies a decision, initiative, or clock that needs a clear accounting.'
  },
  'luis-navarro': {
    name: 'Luis Navarro',
    popid: 'POP-00636',
    domain: 'accountability-anomaly',
    approach: 'Investigation approach: distinguish what the supplied record establishes from what it does not. Follow the unresolved gap fairly; no invented response, silence, or accusation.',
    hook: 'The supplied civic record leaves an accountability question open.'
  },
  'trevor-shimizu': {
    name: 'Trevor Shimizu',
    popid: 'POP-00155',
    domain: 'infrastructure-transit',
    approach: 'Systems approach: trace the supplied infrastructure or transit fact through timeline, place, and implementation state. Dry, technical, and record-backed.',
    hook: 'The supplied systems record shows an infrastructure or transit question with a visible clock.'
  },
  'lila-mezran': {
    name: 'Lila Mezran',
    popid: 'POP-00154',
    domain: 'health',
    approach: 'Health approach: use only packet-backed health facts and name the human consequence without diagnosis. Clinical calm, one record-backed claim.',
    hook: 'The supplied civic record identifies a health-service question that needs careful accounting.'
  },
  'noah-tan': {
    name: 'Noah Tan',
    popid: null,
    domain: 'environment',
    approach: 'Environment approach: translate the supplied environmental or weather signal into grounded civic terms. Do not invent measurements, forecasts, or scientific conclusions.',
    hook: 'The supplied civic record identifies an environmental condition or decision that needs grounded explanation.'
  },
  'angela-reyes': {
    name: 'Angela Reyes',
    popid: null,
    domain: 'education-youth',
    approach: 'Education approach: use only the supplied youth, school, education, or apprenticeship record. Warm, precise, and never invent scores, students, teachers, or outcomes.',
    hook: 'The supplied civic record identifies an education or youth question that needs a clear, humane account.'
  }
});

const MATCHERS = Object.freeze({
  'luis-navarro': /stuck|incoherence|coverage-gap|repeating-event|production-imbalance|audit|accountab|unresolved|missing|contradic|gap/i,
  'trevor-shimizu': /transit|infrastructure|construction|traffic|mobility|road|bridge|rail|station|hub/i,
  'lila-mezran': /health|clinic|medical|care\b|hospital|wellness/i,
  'noah-tan': /environment|weather|climate|air quality|water|heat|flood|park|ecolog/i,
  'angela-reyes': /education|school|student|youth|apprentice|teacher|learning/i
});

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function loadCitizenProfiles(root = ROOT) {
  const file = path.join(root, 'output', 'simulation_ledger_snapshot.jsonl');
  const out = new Map();
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
      const row = JSON.parse(line);
      const popid = String(row.POPID || '').trim().toUpperCase();
      if (popid) out.set(popid, row);
    }
  } catch (_) { /* absence means no civic interview candidate is verified */ }
  return out;
}

function luisCandidateScope(entry, profiles) {
  const allowed = [];
  const excluded = [];
  for (const popid of entry.popids || []) {
    const row = profiles.get(popid);
    const sportsRole = row && (String(row['EconomicProfileKey'] || '') === 'SPORTS_OVERRIDE' ||
      /\b(?:athlete|player|pitcher|catcher|fielder|shortstop|baseman|designated hitter|coach)\b/i
        .test(String(row.RoleType || '')));
    if (!row) excluded.push({ popid, reason: 'NO_LEDGER_PROFILE' });
    else if (sportsRole) excluded.push({ popid, reason: 'PRO_ATHLETE_CIVIC_INELIGIBLE' });
    else {
      const name = String(row.Name || '').trim();
      const role = String(row.RoleType || '').trim() || null;
      const neighborhood = String(row.Neighborhood || '').trim() || null;
      allowed.push({
        popid,
        name,
        role,
        neighborhood,
        profile: [name, role, neighborhood ? neighborhood + ' resident' : null]
          .filter(Boolean).join(' — ')
      });
    }
  }
  return { allowed, excluded };
}

function unique(values) {
  const list = Array.isArray(values) ? values : (values == null ? [] : [values]);
  return [...new Set(list.filter(Boolean))];
}

function entryText(entry) {
  return [
    entry.kind,
    entry.label,
    entry.ref,
    entry.hood,
    entry.handle && entry.handle.angle,
    entry.handle && entry.handle.hookLine
  ].filter(Boolean).join(' ');
}

function normalizeEntry(row, source, index) {
  if (!row || typeof row !== 'object') return null;
  const handle = row.handle && typeof row.handle === 'object' ? row.handle : {};
  const label = String(row.label || handle.angle || '').trim();
  const ref = String(row.ref || '').trim();
  if (!label || !ref) return null;
  return {
    kind: String(row.kind || source || 'civic-signal'),
    label,
    ref,
    hood: row.hood ? String(row.hood) : null,
    popids: unique(row.popids),
    handle: {
      angle: handle.angle ? String(handle.angle) : null,
      hookLine: handle.hookLine ? String(handle.hookLine) : null,
      citizens: Array.isArray(handle.citizens) ? handle.citizens.map(String) : []
    },
    source,
    sourceIndex: index
  };
}

function loadCycleCivicEntries(cycle, root = ROOT) {
  const entries = [];
  const signalPath = path.join(root, 'output', 'desk_signal_c' + cycle + '.json');
  const signal = loadJson(signalPath);
  const civicLane = signal && signal.lanes && Array.isArray(signal.lanes.civic)
    ? signal.lanes.civic
    : [];
  civicLane.forEach((row, index) => {
    const entry = normalizeEntry(row, 'desk-signal', index);
    if (entry) entries.push(entry);
  });

  const decisionsPath = path.join(root, 'output', 'cron-civic', 'decisions_lane_c' + cycle + '.json');
  const decisions = loadJson(decisionsPath);
  for (const [index, row] of ((decisions && decisions.entries) || []).entries()) {
    const entry = normalizeEntry(row, 'civic-decision', civicLane.length + index);
    if (entry) entries.push(entry);
  }

  const datawakeDir = path.join(root, 'output', 'cron-civic', 'datawake');
  try {
    for (const file of fs.readdirSync(datawakeDir).filter(f => f.endsWith('.json')).sort()) {
      const wake = loadJson(path.join(datawakeDir, file));
      if (!wake || Number(wake.cycle) !== Number(cycle) || !wake.statement) continue;
      const entry = normalizeEntry({
        kind: 'civic-datawake',
        ref: 'output/cron-civic/datawake/' + file,
        label: (wake.holder || 'Civic office') + ': ' + (wake.numberMoved || String(wake.statement).slice(0, 180)),
        popids: wake.popid ? [wake.popid] : [],
        handle: { angle: String(wake.statement).slice(0, 240) }
      }, 'civic-datawake', entries.length);
      if (entry) entries.push(entry);
    }
  } catch (_) { /* datawakes are optional local input */ }

  const seen = new Set();
  return entries.filter(entry => {
    const key = entry.ref + '\u0000' + entry.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreEntryForSeat(entry, slug) {
  const text = entryText(entry);
  if (slug === 'carmen-delaine') {
    let score = 10;
    if (/initiative|vote|decision|civic-datawake/i.test(entry.kind)) score += 30;
    if (/initiative|vote|decision|council|approval|disbursement|review|phase/i.test(text)) score += 15;
    return score;
  }
  if (slug === 'luis-navarro') {
    let score = 0;
    if (/anomaly/i.test(entry.kind)) score += 45;
    if (MATCHERS[slug].test(text)) score += 35;
    return score;
  }
  const matcher = MATCHERS[slug];
  return matcher && matcher.test(text) ? 45 : 0;
}

function candidateFor(entry, score) {
  return {
    score,
    kind: entry.kind,
    label: entry.label,
    ref: entry.ref,
    hood: entry.hood,
    popids: entry.popids,
    angle: entry.handle.angle,
    hookLine: entry.handle.hookLine,
    citizens: entry.handle.citizens,
    source: entry.source,
    sourceIndex: entry.sourceIndex
  };
}

function publicInfrastructureFact(top) {
  const hook = String(top && top.hookLine || '').trim();
  if (hook && !/\b(?:stuck-initiative|construction-planning|severity)\b/i.test(hook)) return hook;
  const label = String(top && top.label || '').trim();
  const tracker = label.match(/^(.+?)\s*\|\s*Status\s+([^|]+?)(?:\s*\|\s*phase\s+(.+))?$/i);
  if (tracker) {
    return tracker[1] + ' is listed as ' + tracker[2].trim().replace(/-/g, ' ') +
      (tracker[3] ? ', with the next phase still unestablished in public terms.' : '.');
  }
  const stalled = label.match(/(?:\|\s*)?(.+?)\s+stalled\s+for\s+(\d+)\s+cycles?/i);
  if (stalled) return stalled[1].replace(/^stuck-initiative\s*/i, '').trim() +
    ' has not advanced in ' + stalled[2] + ' cycles.';
  return label.replace(/^stuck-initiative(?:\s*\([^)]*\))?\s*\|\s*/i, '')
    .replace(/construction-planning/gi, 'its supplied planning phase');
}

function prewriteForSeat(slug, top, candidateScope) {
  if (slug === 'trevor-shimizu') {
    return {
      anchorFacts: [publicInfrastructureFact(top)],
      forbidden: ['Do not add outages, closures, delays, routes, timestamps, load scores, causes, repairs, agencies, or outcomes absent from the supplied entries.'],
      schema: 'SYSTEMS-BRIEF-1',
      method: 'INCIDENT_LINK_WARNING',
      missing: [
        'timestamp and duration unless supplied by the source',
        'second system fact and evidence linking it to the assigned condition',
        'responsible agency, maintenance action, capacity, load, or service effect unless named by the source'
      ],
      cascade: { state: 'UNESTABLISHED', facts: [], link: null, src: null }
    };
  }
  if (slug !== 'luis-navarro') {
    return {
      anchorFacts: [top.label, top.ref],
      forbidden: ['Do not add officials, votes, budgets, outcomes, measurements, quotes, or affected people absent from the supplied entries.']
    };
  }
  return {
    anchorFacts: [top.label],
    forbidden: ['Do not add officials, votes, budgets, outcomes, measurements, quotes, responses, or affected people absent from the supplied entries.'],
    schema: 'INVESTIGATION-BRIEF-1',
    method: 'KNOWN_UNKNOWN',
    missing: [
      'documented response or documented non-response',
      'request timestamp and elapsed silence duration',
      'responsible person, office, or duty unless named by the source'
    ],
    reportingEvidence: {
      recordChecks: { state: 'NOT_SUPPLIED', events: [] },
      requestEvents: { state: 'NOT_SUPPLIED', events: [] },
      responseEvents: { state: 'NOT_SUPPLIED', events: [] },
      responsibleEntities: { state: 'NOT_SUPPLIED', entities: [] }
    },
    silenceClock: { state: 'UNESTABLISHED', value: null, src: null },
    excludedCandidates: (candidateScope && candidateScope.excluded) || []
  };
}

function packetForEntries(entries, slug, profiles) {
  const seat = CIVIC_SEATS[slug];
  if (!seat) return null;
  const candidates = entries
    .map(entry => ({ entry, score: scoreEntryForSeat(entry, slug) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.sourceIndex - b.entry.sourceIndex)
    .slice(0, 6)
    .map(row => candidateFor(row.entry, row.score));
  const top = candidates[0];
  if (!top) {
    return {
      seat: { slug, name: seat.name, popid: seat.popid, domain: seat.domain },
      empty: true,
      approach: seat.approach,
      candidates: [],
      pointers: []
    };
  }
  const candidateScope = slug === 'luis-navarro'
    ? luisCandidateScope(top, profiles || new Map())
    : null;
  const storyPopids = candidateScope ? candidateScope.allowed.map(row => row.popid) : top.popids;
  const storyCitizens = candidateScope
    ? candidateScope.allowed.map(row => row.name + ' (' + row.popid + ')')
    : top.citizens;
  const publicTopLabel = slug === 'trevor-shimizu' ? publicInfrastructureFact(top) : top.label;
  return {
    seat: { slug, name: seat.name, popid: seat.popid, domain: seat.domain },
    empty: false,
    approach: seat.approach,
    story: {
      ref: top.ref,
      label: publicTopLabel,
      kind: top.kind,
      angle: slug === 'trevor-shimizu' ? publicTopLabel : (top.angle || top.label),
      hookLine: slug === 'trevor-shimizu' ? publicTopLabel : (top.hookLine || seat.hook),
      hood: top.hood,
      popids: storyPopids,
      citizens: storyCitizens
    },
    pulse: {
      className: seat.domain,
      score: top.score,
      label: publicTopLabel,
      hood: top.hood,
      source: top.ref
    },
    prewrite: prewriteForSeat(slug, top, candidateScope),
    citizens: candidateScope ? candidateScope.allowed : [],
    candidates,
    pointers: unique(candidates.map(candidate => candidate.ref))
  };
}

function buildCivicDomainSlice(cycle, { root = ROOT } = {}) {
  const entries = loadCycleCivicEntries(cycle, root);
  const profiles = loadCitizenProfiles(root);
  const packets = Object.fromEntries(Object.keys(CIVIC_SEATS).map(slug =>
    [slug, packetForEntries(entries, slug, profiles)]));
  const nonempty = Object.values(packets).filter(packet => packet && !packet.empty);
  return {
    version: 'CIVIC-DOMAIN-SLICE-4',
    cycle: Number(cycle),
    kind: 'civic-domain',
    empty: nonempty.length === 0,
    source: {
      deskSignal: 'output/desk_signal_c' + cycle + '.json',
      decisions: 'output/cron-civic/decisions_lane_c' + cycle + '.json',
      datawakes: 'output/cron-civic/datawake/* (cycle-matched only)'
    },
    entries,
    packets
  };
}

function formatCivicDomainSliceMarkdown(slice) {
  const lines = [
    '# Civic Domain Slice — C' + slice.cycle,
    '',
    '- Shared source entries: ' + slice.entries.length,
    '- Empty: ' + (slice.empty ? 'yes' : 'no'),
    ''
  ];
  for (const [slug, packet] of Object.entries(slice.packets || {})) {
    lines.push('## ' + packet.seat.name + ' (`' + slug + '`)');
    if (packet.empty) {
      lines.push('No matching civic candidate this Cycle.', '');
      continue;
    }
    lines.push('- Domain: ' + packet.seat.domain);
    lines.push('- Pulse: ' + packet.pulse.label);
    lines.push('- Ref: ' + packet.pulse.source);
    lines.push('- Candidates:');
    for (const candidate of packet.candidates) {
      lines.push('  - [' + candidate.score + '] ' + candidate.label + ' — ' + candidate.ref);
    }
    lines.push('');
  }
  lines.push('_Generated by scripts/buildCivicDomainSlice.js — local records only._', '');
  return lines.join('\n');
}

function slicePaths(cycle, root = ROOT) {
  return {
    json: path.join(root, 'output', 'cron-compare', 'civic_domain_slice_c' + cycle + '.json'),
    md: path.join(root, 'output', 'slices', 'c' + cycle, 'civic-domain.md')
  };
}

function writeCivicDomainSlice(cycle, slice, root = ROOT) {
  const paths = slicePaths(cycle, root);
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  fs.mkdirSync(path.dirname(paths.md), { recursive: true });
  fs.writeFileSync(paths.json, JSON.stringify(slice, null, 2));
  fs.writeFileSync(paths.md, formatCivicDomainSliceMarkdown(slice));
  return paths;
}

function loadCivicDomainSlice(cycle, root = ROOT) {
  const existing = loadJson(slicePaths(cycle, root).json);
  if (existing && existing.version === 'CIVIC-DOMAIN-SLICE-4') return existing;
  const slice = buildCivicDomainSlice(cycle, { root });
  if (!slice.empty) writeCivicDomainSlice(cycle, slice, root);
  return slice.empty ? null : slice;
}

function packetForPersona(slice, slug) {
  const packet = slice && slice.packets && slice.packets[slug];
  return packet && !packet.empty ? packet : null;
}

function isCivicDomainPersona(assignOrSlug) {
  const slug = typeof assignOrSlug === 'string'
    ? assignOrSlug
    : assignOrSlug && assignOrSlug.persona;
  return Boolean(slug && CIVIC_SEATS[slug]);
}

function assignmentFromPacket(packet, assign) {
  if (!packet || packet.empty) return null;
  return Object.assign({}, assign || {}, {
    desk: 'civic',
    name: (assign && assign.name) || packet.seat.name,
    popid: (assign && assign.popid) || packet.seat.popid,
    beatDomain: (assign && assign.beatDomain) || 'CIVIC',
    persona: (assign && assign.persona) || packet.seat.slug,
    approach: packet.approach,
    story: packet.story,
    civicDomainSlice: true,
    civicDomainSeat: packet.seat.slug,
    pulse: packet.pulse,
    prewrite: packet.prewrite
  });
}

function enrichAssignment(assign, cycle, root = ROOT) {
  if (!isCivicDomainPersona(assign)) return assign;
  try {
    const packet = packetForPersona(loadCivicDomainSlice(cycle, root), assign.persona);
    return packet ? assignmentFromPacket(packet, assign) : assign;
  } catch (_) {
    return assign;
  }
}

if (require.main === module) {
  const cycle = arg('--cycle', null);
  if (cycle == null) {
    console.error('buildCivicDomainSlice: pass --cycle N');
    process.exit(1);
  }
  const slice = buildCivicDomainSlice(cycle);
  const paths = writeCivicDomainSlice(cycle, slice);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(slice, null, 2));
  } else {
    const seats = Object.values(slice.packets).filter(packet => !packet.empty).map(packet => packet.seat.slug);
    console.log('civic domain slice c' + cycle + (slice.empty ? ' EMPTY' : ' seats=' + seats.join(',')));
    console.log('→ ' + path.relative(ROOT, paths.md));
    console.log('→ ' + path.relative(ROOT, paths.json));
  }
}

module.exports = {
  CIVIC_SEATS,
  loadCycleCivicEntries,
  scoreEntryForSeat,
  packetForEntries,
  publicInfrastructureFact,
  buildCivicDomainSlice,
  formatCivicDomainSliceMarkdown,
  slicePaths,
  writeCivicDomainSlice,
  loadCivicDomainSlice,
  packetForPersona,
  isCivicDomainPersona,
  assignmentFromPacket,
  enrichAssignment
};
