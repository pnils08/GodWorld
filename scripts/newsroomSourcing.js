'use strict';

// Mode joins are fixed before W1. Every returned row has a source kind and an
// addressable evidence record; no story POPID, hood, or why string can fill it.
// 'firm-record' is reserved for a later business-desk journal sourcing cut.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STREET_TAGS = new Set(['Sports', 'PrevEvening', 'Media', 'Lifestyle', 'Cultural',
  'Casino', 'Holiday', 'Neighborhood', 'Weather']);
// City employers by Business_Ledger id, with the names a story uses for them.
// Never a name regex: the ledger says "Oakland Unified School District" and
// "Oakland Police Department", a story says OUSD and OPD. OARI has no business
// row yet, so an OARI story draws no city worker until one exists. The story
// must name the employer: "taken to the hospital" in a police story does not
// seat a hospital worker.
const CIVIC_EMPLOYERS = Object.freeze({
  'BIZ-00013': ['AC Transit'],
  'BIZ-00014': ['BART'],
  'BIZ-00015': ['Oakland Hospital'],
  'BIZ-00016': ['OUSD', 'Oakland Unified'],
  'BIZ-00024': ['OPD', 'Oakland Police'],
});
const DUMP_TABS = Object.freeze({
  workplace: ['Business_Ledger', 'Employment_Roster'],
  offices: ['Business_Ledger', 'Employment_Roster', 'Civic_Office_Ledger', 'Initiative_Tracker'],
});

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}
function rows(root, tab) {
  try {
    return fs.readFileSync(path.join(root, 'output', 'beats', tab + '.jsonl'), 'utf8')
      .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  } catch (_) { return []; }
}
// A pool is built from this Cycle's dump or not at all: a stale dump or a missing
// tab throws naming the fix, so an unreadable source never reads as "nobody".
function dumpRows(root, cycle, tabs) {
  const dir = path.join(root, 'output', 'beats');
  const meta = readJson(path.join(dir, 'meta.json'));
  if (!meta || Number(meta.cycle) !== Number(cycle)) {
    throw new Error('beat dump missing or stale for C' + cycle + ' (dump is ' +
      (meta ? 'C' + meta.cycle : 'unreadable') + '): run scripts/dumpBeatTabs.js ' + cycle);
  }
  return Object.fromEntries(tabs.map(tab => {
    const file = path.join(dir, tab + '.jsonl');
    if (!fs.existsSync(file)) throw new Error('beat dump tab missing: ' + tab + ': run scripts/dumpBeatTabs.js ' + cycle);
    return [tab, fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)];
  }));
}
function ledgerRows(root) {
  const file = path.join(root, 'output', 'simulation_ledger_snapshot.jsonl');
  if (!fs.existsSync(file)) throw new Error('ledger snapshot missing: run scripts/dumpLedger.js');
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
}
function clean(s) { return String(s || '').trim(); }
function frozen(mode, sourceKind, person, evidence, extra) {
  return Object.freeze({
    pop: clean(person.pop || person.popid || person.POP_ID || person.POPID || person.PopId),
    name: clean(person.name || person.CitizenName || person.Holder || person.Name) || null,
    role: clean(person.role || person.RoleType || person.Title) || null,
    hood: clean(person.hood || person.neighborhood || person.Neighborhood) || null,
    profile: clean(person.profile) || [person.name || person.CitizenName || person.Holder || person.Name,
      person.role || person.RoleType || person.Title].filter(Boolean).join(' — '),
    mode, sourceKind, evidence: Object.freeze(evidence),
    ...(extra || {}),
  });
}
function unique(candidates) {
  const seen = new Set();
  return Object.freeze(candidates.filter(c => /^POP-\d{5}$/.test(c.pop) && !seen.has(c.pop) && seen.add(c.pop)));
}
function named(story, slice, cycle, root) {
  const ref = clean(story && story.ref);
  if (/^undocked(?::|-week:)/.test(ref)) {
    const feed = readJson(path.join(root, 'output', 'spacemolt-show', 'feed', 'c' + cycle + '.json'));
    const events = feed && Array.isArray(feed.events) ? feed.events : [];
    const episode = ref.startsWith('undocked:') ? ref.slice('undocked:'.length) : null;
    const allowed = new Set((story && story.popids || []).map(clean));
    return unique(events.filter(e => e && /^POP-\d{5}$/.test(clean(e.POPID)) &&
      allowed.has(clean(e.POPID)) && (!episode || e.EpisodeId === episode))
      .map(e => frozen('named', 'undocked-feed-row', {
        pop: e.POPID, name: e.Holder || null, role: 'UNDOCKED pilot' },
      { source: 'output/spacemolt-show/feed/c' + cycle + '.json',
        episodeId: e.EpisodeId, pop: e.POPID })));
  }
  if (!slice || slice.empty) return Object.freeze([]);
  const pools = [slice.packetSeat && slice.packetSeat.citizens, slice.citizens,
    slice.players, slice.candidates].filter(Array.isArray);
  const source = clean(slice.story && slice.story.ref || story && story.ref);
  if (!source || source === 'assignment') return Object.freeze([]);
  const out = [];
  for (const pool of pools) for (const row of pool) {
    const pop = clean(row && (row.popid || row.pop));
    // The typed slice row itself must name the person. A story-level POPID or
    // candidate rationale cannot create an interview target.
    if (!/^POP-\d{5}$/.test(pop) || !row.name ||
        /^(?:same-hood|ledger-resident|city-resident|bond-hop)/i.test(clean(row.why))) continue;
    out.push(frozen('named', 'slice-row', row,
      { source, pop, rowName: row.name, kind: 'slice-row' }));
  }
  return unique(out);
}
function leadBizId(story, slice, beats) {
  const businesses = beats.Business_Ledger || [];
  const direct = slice && slice.businesses && slice.businesses[0] && slice.businesses[0].bizId;
  if (direct && businesses.some(b => b.BIZ_ID === direct)) return direct;
  const text = [story && story.ref, slice && slice.prewrite && slice.prewrite.evidence &&
    slice.prewrite.evidence.map(e => e.src).join(' ')].filter(Boolean).join(' ');
  const explicit = (text.match(/\bBIZ-\d{5}\b/) || [])[0];
  if (explicit && businesses.some(b => b.BIZ_ID === explicit)) return explicit;
  const worker = slice && slice.citizens && slice.citizens[0];
  const name = clean(worker && worker.business);
  const matched = name && businesses.find(b => clean(b.Name) === name);
  return matched && matched.BIZ_ID || null;
}
function workplace(story, slice, beats) {
  const bizId = leadBizId(story, slice, beats);
  if (!bizId) return Object.freeze([]);
  const out = (beats.Employment_Roster || [])
    .filter(r => r.BIZ_ID === bizId && clean(r.Status).toUpperCase() === 'ACTIVE')
    .map(r => frozen('workplace', 'active-roster', r,
      { source: 'output/beats/Employment_Roster.jsonl', bizId, pop: r.POP_ID, status: 'Active' }));
  return unique(out);
}
function storyTopic(story, beats) {
  const text = [story && story.angle, story && story.label, story && story.hookLine,
    story && story.ref].map(clean).join(' ');
  const id = (text.match(/\bINIT-\d{3}\b/) || [])[0];
  const initiative = (beats.Initiative_Tracker || []).find(r =>
    (id && r.InitiativeID === id) || (r.Name && text.includes(clean(r.Name))));
  return initiative
    ? { id: initiative.InitiativeID, topic: clean(initiative.Name) }
    : { id: id || null, topic: clean(story && story.topic) || null };
}
function officeSources(story, cycle, root, beats) {
  const topic = storyTopic(story, beats);
  if (!topic.id && !topic.topic) return [];
  const officeRows = beats.Civic_Office_Ledger || [];
  const dir = path.join(root, 'output', 'civic-voice');
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('_c' + cycle + '.json')); }
  catch (_) { return []; }
  const out = [];
  for (const file of files) {
    const doc = readJson(path.join(dir, file));
    if (!doc || Number(doc.cycle) !== Number(cycle) || !Array.isArray(doc.statements)) continue;
    const holder = officeRows.find(r => clean(r.Holder) === clean(doc.speaker) &&
      clean(r.Status).toLowerCase() === 'active' && /^POP-\d{5}$/.test(clean(r.PopId)));
    if (!holder) continue;
    for (const s of doc.statements) {
      const joined = (topic.id && clean(s.initiative) === topic.id) ||
        (topic.topic && clean(s.topic) === topic.topic);
      if (!joined || !s.statementId || !clean(s.quote)) continue;
      out.push(Object.freeze({
        sourceKind: 'office-record', cycle: Number(cycle), officeSlug: doc.office,
        statementId: s.statementId, quote: String(s.quote), topic: clean(s.topic),
        initiativeId: clean(s.initiative) || null,
        filePath: path.join('output', 'civic-voice', file),
        holderPopid: holder.PopId, speakerName: doc.speaker,
      }));
    }
  }
  return Object.freeze(out);
}
function verifyOfficeRecord(source, cycle, root = ROOT) {
  if (!source || source.sourceKind !== 'office-record' || Number(source.cycle) !== Number(cycle) ||
      !/^output\/civic-voice\/[a-z0-9_]+_c\d+\.json$/.test(clean(source.filePath))) return false;
  const doc = readJson(path.join(root, source.filePath));
  if (!doc || Number(doc.cycle) !== Number(cycle) || doc.office !== source.officeSlug ||
      doc.speaker !== source.speakerName) return false;
  const statement = (doc.statements || []).find(s => s.statementId === source.statementId);
  if (!statement || statement.quote !== source.quote || clean(statement.topic) !== source.topic ||
      (clean(statement.initiative) || null) !== source.initiativeId) return false;
  const holder = rows(root, 'Civic_Office_Ledger').find(r =>
    clean(r.Holder) === doc.speaker && clean(r.PopId) === source.holderPopid &&
    clean(r.Status).toLowerCase() === 'active');
  return Boolean(holder);
}
function offices(story, slice, beats, cycle, root) {
  const topic = storyTopic(story, beats);
  if (!topic.id && !topic.topic) return { candidates: Object.freeze([]), records: Object.freeze([]) };
  const businessById = new Map((beats.Business_Ledger || []).map(b => [b.BIZ_ID, b]));
  const storyText = [story && story.angle, story && story.label, story && story.hookLine].map(clean).join(' ');
  const joinedBusiness = new Set((beats.Business_Ledger || []).filter(b =>
    CIVIC_EMPLOYERS[b.BIZ_ID] &&
    [clean(b.Name)].concat(CIVIC_EMPLOYERS[b.BIZ_ID]).some(alias => phrase(storyText, alias)))
    .map(b => b.BIZ_ID));
  const workers = (beats.Employment_Roster || []).filter(r =>
    joinedBusiness.has(r.BIZ_ID) && clean(r.Status).toUpperCase() === 'ACTIVE')
    .map(r => frozen('offices', 'civic-worker', r,
      { source: 'output/beats/Employment_Roster.jsonl', bizId: r.BIZ_ID,
        employer: businessById.get(r.BIZ_ID).Name, topicId: topic.id, topic: topic.topic }));
  const records = officeSources(story, cycle, root, beats);
  const holders = records.map(record => frozen('offices', 'office-record', {
    pop: record.holderPopid, name: record.speakerName, role: 'civic office holder' },
  { source: record.filePath, statementId: record.statementId,
    initiativeId: record.initiativeId, topic: record.topic }));
  return { candidates: unique(holders.concat(workers)), records };
}
function parseLife(line) {
  const m = String(line || '').match(/^(?:Y(\d+))?C(\d+)\s*[—-]\s*\[([^\]]+)\]\s*(.+)$/);
  if (!m) return null;
  const cycle = m[1] ? (Number(m[1]) - 1) * 52 + Number(m[2]) : Number(m[2]);
  return { cycle, tag: m[3], text: m[4], line };
}
function phrase(text, entity) {
  const escaped = clean(entity).replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  return new RegExp('(^|[^A-Za-z0-9])' + escaped + '(?=$|[^A-Za-z0-9])', 'i').test(text);
}
function typedHighlights(story, slice, seat) {
  const out = [];
  const add = (kind, entity, predicate) => {
    if (clean(entity)) out.push({ kind, entity: clean(entity), predicate });
  };
  const pulse = slice && slice.pulse || {};
  const klass = clean(pulse.className || story && story.pulseClass);
  const named = clean(pulse.named || story && story.named);
  const venue = clean(pulse.venue || story && story.venue);
  if (venue && /venue|restaurant|nightlife|food|sighting/.test(klass)) add('venue', venue, 'attendance');
  if (named && /tv|movie|streaming|show/.test(klass)) add('show', named, 'watch');
  if (named && /event|festival/.test(klass)) add('event', named, 'attendance');
  const team = clean(pulse.team);
  if (team) add(seat === 'p-slayer' ? 'team' : 'game', team,
    seat === 'p-slayer' ? 'fan' : 'watch');
  if (['maria-keen', 'noah-tan'].includes(seat) && clean(slice && slice.hood)) {
    add('hood', slice.hood, 'observe');
  }
  return out;
}
function verbSupports(text, predicate) {
  if (predicate === 'attendance') return /\b(?:visited|went to|was at|attended|stopped at)\b/i.test(text);
  if (predicate === 'watch') return /\b(?:watched|saw|viewed)\b/i.test(text);
  if (predicate === 'fan') return /\b(?:bought|wore|watched|saw|attended)\b/i.test(text);
  return /\b(?:heard|noticed|saw|watched|visited|attended|bought|browsed)\b/i.test(text);
}
function street(story, slice, cycle, root, seat, opts = {}) {
  const meta = opts.meta || readJson(path.join(root, 'output', 'simulation_ledger_snapshot.meta.json'));
  if (!meta) throw new Error('ledger snapshot meta missing or unreadable: run scripts/dumpLedger.js');
  // A snapshot from another Cycle holds no life line from this one.
  if (Number(meta.cycle) !== Number(cycle)) return Object.freeze([]);
  const highlights = opts.highlights || typedHighlights(story, slice, seat);
  if (!opts.highlights && seat === 'talia-finch' &&
      clean(story && story.ref).includes('Oakland_Sports_Feed')) {
    for (const team of new Set(rows(root, 'Oakland_Sports_Feed')
      .filter(r => Number(r.Cycle) === Number(cycle) && /oaks/i.test(clean(r.TeamsUsed)))
      .map(r => clean(r.TeamsUsed)).filter(Boolean))) {
      highlights.push({ kind: 'game', entity: team, predicate: 'watch' });
    }
  }
  if (!opts.highlights && seat === 'noah-tan' &&
      clean(story && story.ref).includes('Cycle_Weather')) {
    for (const condition of new Set(rows(root, 'Cycle_Weather')
      .filter(r => Number(r.CycleID || r.Cycle) === Number(cycle))
      .map(r => clean(r.Type)).filter(Boolean))) {
      highlights.push({ kind: 'weather', entity: condition, predicate: 'observe' });
    }
  }
  if (!highlights.length) return Object.freeze([]);
  const out = [];
  for (const row of opts.ledgerRows || ledgerRows(root)) {
    if (clean(row.Status).toLowerCase() !== 'active') continue;
    for (const raw of String(row.LifeHistory || '').split(/\r?\n/)) {
      const life = parseLife(raw);
      if (!life || life.cycle !== Number(cycle) || !STREET_TAGS.has(life.tag)) continue;
      const hit = highlights.find(h => phrase(life.text, h.entity) &&
        verbSupports(life.text, h.predicate) &&
        (h.kind !== 'venue' || !(/\b(?:heard|noticed|recap)\b/i.test(life.text) &&
          !/\b(?:visited|went to|was at|attended|stopped at)\b/i.test(life.text))));
      if (!hit) continue;
      out.push(frozen('street', 'life-line', row,
        { source: 'output/simulation_ledger_snapshot.jsonl', cycle: life.cycle,
          tag: life.tag, line: life.line, highlightKind: hit.kind,
          entity: hit.entity, predicate: hit.predicate }, { matchedLifeLine: life.line }));
      break;
    }
  }
  return unique(out);
}
function buildPool({ mode, story, slice, cycle, seat, root = ROOT, beats, streetOptions }) {
  if (mode === 'records') return Object.freeze({ mode, candidates: Object.freeze([]), officeRecords: Object.freeze([]) });
  const beatData = beats || (DUMP_TABS[mode] ? dumpRows(root, cycle, DUMP_TABS[mode]) : {});
  let candidates = Object.freeze([]);
  let officeRecords = Object.freeze([]);
  if (mode === 'named') candidates = named(story, slice, cycle, root);
  else if (mode === 'workplace') candidates = workplace(story, slice, beatData);
  else if (mode === 'offices') {
    const result = offices(story, slice, beatData, cycle, root);
    candidates = result.candidates; officeRecords = result.records;
  } else if (mode === 'street') candidates = street(story, slice, cycle, root, seat, streetOptions);
  else throw new Error('unknown sourcing mode: ' + mode);
  return Object.freeze({ mode, candidates, officeRecords });
}

module.exports = { buildPool, named, workplace, offices, street, parseLife,
  typedHighlights, officeSources, verifyOfficeRecord, storyTopic, leadBizId };
