#!/usr/bin/env node
/**
 * Deterministic canon name pre-check — scripts/canon-name-check.js
 *
 * Backstop for the Rhea gate (the "Marisol Garcia" class, 2026-07-25): a persona
 * or writer can invent a plausible official/source who exists nowhere in the
 * sim. The LLM gate is *instructed* to verify named people, but instructions
 * drift — this script extracts person-name candidates from a draft and checks
 * them against the simulation ledger snapshot, deterministically, before the
 * gate spends a single token.
 *
 * It does NOT decide. It hands the gate two lists: candidates confirmed as
 * ledger citizens, and candidates NOT found (which the gate must verify via
 * tools or flag high-severity if they are used as people). False positives
 * (businesses, places, headline phrases) land in the unverified list and cost
 * the gate one dismiss — acceptable.
 *
 * Usage:
 *   node scripts/canon-name-check.js --draft output/cron-compare/samples/<file>.md
 *   const { checkText } = require('./canon-name-check');  // library use (gate)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEDGER_SNAPSHOT = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');

// Places/orgs/phrases that look like person names to the extractor. Neighborhoods
// come from lib/canonNeighborhoods (canon source); the rest are recurring
// non-person capitalized phrases in Tribune copy.
function buildStoplist() {
  const stop = new Set([
    'Oakland', 'Bay Tribune', 'The Tribune', 'Tribune', 'Cycle Pulse', 'City Hall',
    'Bay Area', 'East Bay', 'San Francisco', 'Silicon Valley', 'Golden State',
    'Names Index', 'Central Question', 'Missing Data', 'Stink Signal', 'Anchor Facts',
    'Allowed Names', 'Story Type'
  ]);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  for (const d of days.concat(months)) stop.add(d);
  try {
    const hoods = require(path.join(ROOT, 'lib', 'canonNeighborhoods'));
    for (const key of ['CANON_12', 'MAP_NEIGHBORHOODS', 'CHILDREN']) {
      for (const h of (hoods[key] || [])) stop.add(h);
    }
  } catch (_) { /* stoplist degrades to the static set — still useful */ }
  return stop;
}

// Canon person names from the ledger snapshot: full "Name" + "First Last".
function loadRows() {
  if (loadRows._cache) return loadRows._cache;
  const rows = [];
  try {
    const lines = fs.readFileSync(LEDGER_SNAPSHOT, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try { rows.push(JSON.parse(line)); } catch (_) { /* skip bad line */ }
    }
  } catch (_) { /* missing snapshot -> empty (fail-loud to the gate) */ }
  loadRows._cache = rows;
  return rows;
}

function loadCanonNames() {
  const names = new Set();
  for (const row of loadRows()) {
    // ledger has stray double-spaces ("Jax  Caldera") — normalize or exact match misses
    if (row.Name) names.add(String(row.Name).replace(/\s+/g, ' ').trim());
    const fl = [row.First, row.Last].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (fl) names.add(fl);
  }
  return names;
}

// One-line ledger profiles for verified citizens (the "Calvin Turner, mechanic
// for thirty years" class): bio claims contradicting these are misrepresentation.
function profilesFor(names) {
  const want = new Set((names || []).map(n => String(n).toLowerCase()));
  const out = [];
  for (const row of loadRows()) {
    const full = String(row.Name || '').replace(/\s+/g, ' ').trim();
    const fl = [row.First, row.Last].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (!want.has(full.toLowerCase()) && !want.has(fl.toLowerCase())) continue;
    out.push(full + ' — ' + [
      row.RoleType && 'role: ' + row.RoleType,
      row.Neighborhood && 'neighborhood: ' + row.Neighborhood,
      row.BirthYear && 'born: ' + row.BirthYear,
      row.WealthLevel && 'wealth: ' + row.WealthLevel,
      row.CareerStage && 'career: ' + row.CareerStage
    ].filter(Boolean).join('; '));
  }
  return out;
}

const HONORIFIC = /^(?:Dr|Sgt|Det|Officer|Mayor|Chief|Councilmember|Councilwoman|Councilman|Ms|Mr|Mrs|Rev|Pastor|Coach|Sen|Rep|President)\.?\.?\s+/;
// 2-4 capitalized words ("Marisol Garcia", "Dr. Lila Mezran", "A's" excluded — apostrophe words excluded deliberately)
const CANDIDATE = /\b([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){1,3})\b/g;
// words that signal the phrase is prose, not a name
const PROSE_WORDS = new Set(['The', 'This', 'That', 'These', 'Those', 'When', 'What', 'Why', 'How', 'Who',
  'But', 'So', 'And', 'Or', 'If', 'In', 'On', 'At', 'It', 'He', 'She', 'They', 'We', 'You', 'His', 'Her',
  'Their', 'Our', 'Your', 'My', 'No', 'Yes', 'Not', 'All', 'One', 'Two', 'Three', 'Five', 'Ten', 'Last',
  'Next', 'New', 'Old', 'Big', 'Small', 'Long', 'Short', 'Good', 'Bad', 'First', 'Here', 'There', 'Then',
  'Now', 'Just', 'Like', 'Over', 'Under', 'After', 'Before', 'While', 'Phase', 'Cycle', 'Edition',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'Seen', 'Funny', 'Bright', 'Meanwhile', 'Bet', 'Sure', 'Again', 'Across', 'Half', 'Whole']);

function extractCandidates(text) {
  const found = new Map();   // normalized -> surface form
  for (const line of String(text).split('\n')) {
    if (/^\s*#/.test(line)) continue;   // headlines are wordplay, not names ("Who's Sitting…", "Plods Along")
    for (const m of line.matchAll(CANDIDATE)) {
      let c = m[1].trim().replace(/'s$/, '');   // possessive: "Jack London's" -> "Jack London"
      c = c.replace(HONORIFIC, '').trim();
      if (c.split(/\s+/).length < 2) continue;
      if (c.split(/\s+/).some(w => PROSE_WORDS.has(w))) continue;
      if (!found.has(c.toLowerCase())) found.set(c.toLowerCase(), c);
    }
  }
  return [...found.values()];
}

function checkText(text) {
  const canon = loadCanonNames();
  const canonLower = new Map([...canon].map(n => [n.toLowerCase(), n]));
  const stop = buildStoplist();
  const stopLower = new Set([...stop].map(s => s.toLowerCase()));

  const verified = [], unverified = [];
  for (const c of extractCandidates(text)) {
    const key = c.toLowerCase();
    if (stopLower.has(key)) continue;
    // exact or any 2-word window (handles "X Y Z" where "Y Z" or "X Y" is the citizen)
    const words = c.split(/\s+/);
    let hit = canonLower.get(key) || null;
    if (!hit) {
      for (let i = 0; i + 1 < words.length && !hit; i++) {
        hit = canonLower.get((words[i] + ' ' + words[i + 1]).toLowerCase()) || null;
      }
    }
    if (hit) { if (!verified.includes(hit)) verified.push(hit); continue; }
    // place-phrase rule: "Fruitvale Hub", "Temescal Rising" — a leading canon
    // neighborhood marks a place phrase, not a person (checked AFTER canon, so a
    // citizen who happens to share a hood's name still verifies)
    if (stopLower.has(words[0].toLowerCase())) continue;
    unverified.push(c);
  }
  verified.sort(); unverified.sort();
  return {
    canonNames: canon.size,
    snapshot: path.relative(ROOT, LEDGER_SNAPSHOT),
    candidates: verified.length + unverified.length,
    verified, unverified
  };
}

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

if (require.main === module) {
  const draft = arg('--draft', null);
  if (!draft) { console.error('usage: node scripts/canon-name-check.js --draft <path>'); process.exit(1); }
  const abs = path.resolve(ROOT, draft);
  if (!fs.existsSync(abs)) { console.error('draft not found: ' + draft); process.exit(1); }
  const out = checkText(fs.readFileSync(abs, 'utf8'));
  out.draft = path.relative(ROOT, abs);
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.unverified.length ? 2 : 0);
}

module.exports = { checkText, extractCandidates, loadCanonNames, buildStoplist, profilesFor };
