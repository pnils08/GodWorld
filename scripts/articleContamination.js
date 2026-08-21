'use strict';

/**
 * Article-level world contamination — the E102 Caldera / E103 vacuum class.
 *
 * Those pieces are not "a bad quote." They are a second Oakland (real-world
 * blight, lattice speech, never-woken athletes, reporters as street sources)
 * printed over the sheet. This scan is deterministic and overrides a Rhea pass.
 */

const fs = require('fs');
const path = require('path');
const { quoteIneligibility } = require('./livedExperiencePacket');

const LATTICE = [
  'What the record shows does not line up with what I expected',
  'What explains the gap in the record',
  'I am going to keep watching this',
  'This deserves a closer look',
  'The Tribune should keep pressing for an answer',
  'Someone should answer for what the record shows',
  'the record doesn\'t match what he sees',
  'the gap between the ledger and the street',
];

const REAL_OAKLAND = [
  { id: 'international-blvd', re: /International (?:Boulevard|Blvd)\b/i },
  { id: 'allen-temple-bus', re: /Allen Temple bus stop/i },
  { id: 'reagan-era', re: /since the Reagan administration/i },
  { id: 'ebmud', re: /\bEBMUD\b|\bEast Bay Municipal Utility\b/i },
  { id: 'bart', re: /\bBART\b/ },
  { id: 'frank-ogawa', re: /Frank Ogawa Plaza/i },
];

const REPAIR_CHROME = [
  { id: 'corrected-article', re: /here['’]?s the corrected article/i },
  { id: 'unapproved-quotes-removed', re: /unapproved quotes removed/i },
  { id: 'no-fabricated-speech', re: /no fabricated speech/i },
  { id: 'packet-narration', re: /\bthe Packet does not\b/i },
];

// Persona bags place sports reporters in a room (Tanya: clubhouse dispatch;
// Anthony: unnamed press-box/clubhouse transition; Hal: press-box beat).
// The word is the SET. Fail invented speech sourced from the room, not the set.
const ROOM_SOURCED_SPEECH = [
  { id: 'room-sourced-speech', re: /\b(?:in|from|inside) the (?:clubhouse|dugout|locker room|press[ -]?box)\b[^.]{0,80}\b(?:said|told|whispered)\b/i },
];

const BLIGHT = [
  { id: 'decay-narrative', re: /\bdecay(?:'s|s)?\b.{0,40}\b(?:eating|metrics|epicenter|neighborhood|chinatown|west oakland)\b|\b(?:eating away at|epicenter of the city's decay)\b/i },
  { id: 'real-life-struggles', re: /real-life struggles/i },
  { id: 'falling-apart', re: /falling apart/i },
  { id: 'isnt-safe', re: /isn['’]?t safe|city isn['’]?t safe/i },
  { id: 'zombie-set', re: /zombie movie/i },
  { id: 'shadow-leverage', re: /shadow leverage/i },
  { id: 'vacuum-crime', re: /fills? the vacuum|kind of vacuum in a neighborhood/i },
  { id: 'stadium-vs-kids', re: /new stadiums while our kids/i },
  { id: 'unnamed-bartender', re: /the bartender, a woman/i },
];

function proseOnly(text) {
  return String(text || '')
    .split(/^##\s+INTAKE\s*$/im)[0]
    .split(/^\*{3,}\s*$/m)[0]
    .split(/^#{12,}/m)[0]
    .replace(/```[\s\S]*?```/g, '')
    .trim();
}

function scanLattice(prose) {
  const hits = [];
  const lower = prose.toLowerCase();
  for (const phrase of LATTICE) {
    if (lower.includes(phrase.toLowerCase())) {
      hits.push({ check: 'lattice-quote', issue: 'packet lattice printed as a person: "' + phrase + '"' });
    }
  }
  return hits;
}

function scanPatterns(prose, list, check) {
  const hits = [];
  for (const p of list) {
    if (p.re.test(prose)) hits.push({ check, issue: p.id });
  }
  return hits;
}

function namedAttributions(prose) {
  const names = new Set();
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z.]+)+)\b(?:,[^\n.]{0,120})?(?:\s+said|\s+told me|landed in the same place)/g;
  let m;
  while ((m = re.exec(prose))) names.add(m[1]);
  const spoke = prose.matchAll(/I spoke to ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g);
  for (const s of spoke) names.add(s[1]);
  const bold = prose.matchAll(/\*\*([A-Z][^*]+?)\*\*[\s\S]{0,120}?[“"]/g);
  for (const b of bold) names.add(b[1].replace(/\s+[—-].*$/, '').trim());
  return [...names];
}

function scanVoices(prose, desk) {
  const hits = [];
  for (const name of namedAttributions(prose)) {
    if (/^The |^A |Bartender|Mayor|Tribune/i.test(name)) continue;
    // Resolve via snapshot through quoteIneligibility's ledger loader.
    const { ledgerRowForPop } = require('./livedExperiencePacket');
    // Name → POPID walk of the cached snapshot is not exported; reuse
    // quoteIneligibility with a synthetic candidate after a local name lookup.
    const row = rowByName(name);
    if (!row) continue;
    const block = quoteIneligibility(
      { pop: row.POPID, role: row.RoleType },
      desk || inferDesk(prose),
      { kind: desk === 'civic' ? 'anomaly' : 'article', angle: prose.slice(0, 120) }
    );
    if (block) {
      hits.push({
        check: 'invented-voice',
        issue: name + ' (' + row.POPID + ') cannot be quoted: ' + block,
      });
    }
    if (/journalist|reporter|editor-in-chief|historian/i.test(String(row.RoleType || '')) &&
        !/by\s+hal richmond|by\s+selena grant|by\s+anthony/i.test(prose.slice(0, 400))) {
      hits.push({
        check: 'reporter-as-source',
        issue: name + ' is a newsroom RoleType used as a street source',
      });
    }
  }
  return hits;
}

let _byName = null;
function rowByName(name) {
  const key = String(name || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!key) return null;
  if (_byName === null) {
    _byName = new Map();
    try {
      const file = path.join(__dirname, '..', 'output', 'simulation_ledger_snapshot.jsonl');
      for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
        const row = JSON.parse(line);
        const n = String(row.Name || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (n) _byName.set(n, row);
      }
    } catch (_) { /* isolated tests */ }
  }
  return _byName.get(key) || null;
}

function inferDesk(prose) {
  if (/transit hub|initiative|city hall|apprenticeship|council/i.test(prose)) return 'civic';
  return null;
}

function packetBlob(packet) {
  try { return JSON.stringify(packet || {}).toLowerCase(); } catch (_) { return ''; }
}

function scanUnsuppliedAccess(prose, packet) {
  const blob = packetBlob(packet);
  const hits = [];
  for (const p of ROOM_SOURCED_SPEECH) {
    if (p.re.test(prose) && !p.re.test(blob)) {
      hits.push({ check: 'unsupplied-access', issue: p.id });
    }
  }
  return hits;
}

function scan(text, opts) {
  const prose = proseOnly(text);
  const desk = opts && opts.desk;
  const packet = opts && opts.packet;
  const findings = [];
  findings.push(...scanLattice(prose));
  findings.push(...scanPatterns(prose, REAL_OAKLAND, 'real-oakland-leak'));
  findings.push(...scanPatterns(prose, BLIGHT, 'blight-import'));
  findings.push(...scanPatterns(prose, REPAIR_CHROME, 'repair-chrome'));
  findings.push(...scanUnsuppliedAccess(prose, packet));
  findings.push(...scanVoices(prose, desk));
  const seen = new Set();
  const uniq = [];
  for (const f of findings) {
    const k = f.check + '|' + f.issue;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(f);
  }
  return { fail: uniq.length > 0, findings: uniq };
}

function scanFile(file, opts) {
  return scan(fs.readFileSync(file, 'utf8'), opts);
}

module.exports = { scan, scanFile, proseOnly, LATTICE };
