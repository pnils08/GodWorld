#!/usr/bin/env node
/**
 * extractBondsFromWakes.js — who are citizens actually talking about?
 *
 * The wakes are the bond instrument. Three times a day a citizen says what is on
 * their mind, and sometimes they name somebody. If they name a person the engine
 * has no bond row for, that is a relationship the world has and the engine does
 * not. This finds those, deterministically, and emits candidates in the claim
 * shape scripts/mintCanonBonds.js already validates.
 *
 * Deterministic only. No model call, no inference about what the relationship IS
 * — that framing is the cron/agent layer's job (detector-framer split). This
 * answers one question: X said Y's name, N times, here are the lines.
 *
 * NAME MATCHING IS THE WHOLE PROBLEM. 41 citizens carry an ordinary English word
 * as a first or last name — Patrick When, Derwin Train, Theo Park, Lena Cross,
 * Celeste Moon. A naive last-name matcher fires on every reflection containing
 * "when" and buries the real signal (measured: it produced 14 false hits for
 * Patrick When alone before the stoplist). So:
 *   - full name always counts
 *   - a bare surname counts only if it is unique in the ledger AND not an
 *     ordinary word AND not also somebody's first name
 *   - a bare first name counts only if it is unique across all 964 citizens
 *     AND not an ordinary word
 * Anything that cannot clear those bars is dropped rather than guessed. A wrong
 * pair here becomes a real edge between real strangers, same failure class as a
 * wrong POPID (see mintCanonBonds.js).
 *
 * Usage:
 *   node scripts/extractBondsFromWakes.js
 *   node scripts/extractBondsFromWakes.js --min=2 --out=intake/bond-claims/wakes-c104.json
 *
 * Flags:
 *   --min=N        minimum mentions to report a pair (default 2)
 *   --since=N      only reflections from cycle >= N
 *   --all-dayparts include PRESS/CONVO/INTERVIEW/DISCORD (default: wake dayparts only)
 *   --out=<path>   write candidates as a mintCanonBonds claim file skeleton
 *   --json         full JSON to stdout
 */

'use strict';

const WAKE_DAYPARTS = new Set(['morning', 'midday', 'afternoon', 'evening', 'night']);

// Ordinary English words that must never anchor a name match on their own.
// Every entry here is a word that appears in normal speech; the list exists
// because the ledger genuinely contains citizens surnamed When, Train, Park,
// Cross, Green, Hill, King, West, Young, Brown, Reed, Moon, Court and Finch.
const COMMON_WORDS = new Set(`
when where what which while who why how that this these those there here
train station park bank light dark good best first last long short still even
just also more most some many much back down over under after before again
about into from with without between around through never always often
young old new real true free open close hard easy fast slow high low big small
great little sun moon star river lake hill wood stone field green white black
brown gray grey rose day night week year time hope faith grace joy peace love
life dream king queen west east north south bay port cross church market money
price rich poor work rest play song music art book page word line side room
house home door floor wall roof gate road street lane court cliff bell drum
horn reed fox wolf bear hawk crane dove finch swan lion tiger low chase ace
dame rich art grace reed rose
`.trim().split(/\s+/));

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function normWord(s) { return String(s || '').trim().toLowerCase(); }

/**
 * Build the matcher from raw Simulation_Ledger rows.
 * Returns { anchors: [{re, pop, name, kind}], people: Map<pop,{name}> }
 */
function buildMatcher(ledgerRows) {
  const h = (ledgerRows[0] || []).map((x) => String(x).trim().toLowerCase());
  const iPop = h.indexOf('popid'), iFirst = h.indexOf('first'), iLast = h.indexOf('last');
  const iName = h.indexOf('name'), iStatus = h.indexOf('status');
  if (iPop < 0) throw new Error('Simulation_Ledger has no POPID column');

  const people = [];
  for (let r = 1; r < ledgerRows.length; r++) {
    const row = ledgerRows[r];
    const pop = String(row[iPop] || '').trim().toUpperCase();
    if (!pop) continue;
    const first = String(row[iFirst] || '').trim();
    const last = String(row[iLast] || '').trim();
    const full = (iName >= 0 && row[iName]) ? String(row[iName]).trim() : `${first} ${last}`.trim();
    people.push({ pop, first, last, full, status: iStatus >= 0 ? String(row[iStatus] || '') : '' });
  }

  // uniqueness tallies — a name shared by two citizens can never anchor alone
  const firstCount = {}, lastCount = {};
  for (const p of people) {
    if (p.first) firstCount[normWord(p.first)] = (firstCount[normWord(p.first)] || 0) + 1;
    if (p.last) lastCount[normWord(p.last)] = (lastCount[normWord(p.last)] || 0) + 1;
  }

  const anchors = [];
  for (const p of people) {
    if (p.full && p.full.length > 4) {
      anchors.push({ re: new RegExp(`\\b${escapeRe(p.full)}\\b`, 'i'), pop: p.pop, name: p.full, kind: 'full' });
    }
    const last = normWord(p.last);
    if (last && last.length > 3 && lastCount[last] === 1 && !COMMON_WORDS.has(last) && !firstCount[last]) {
      anchors.push({ re: new RegExp(`\\b${escapeRe(p.last)}\\b`, 'i'), pop: p.pop, name: p.full, kind: 'surname' });
    }
    const first = normWord(p.first);
    if (first && first.length > 3 && firstCount[first] === 1 && !COMMON_WORDS.has(first) && !lastCount[first]) {
      anchors.push({ re: new RegExp(`\\b${escapeRe(p.first)}\\b`, 'i'), pop: p.pop, name: p.full, kind: 'forename' });
    }
  }
  return { anchors, people };
}

/** Existing bond pairs, unordered. */
function buildPairSet(bondRows) {
  const h = (bondRows[0] || []).map(String);
  const iA = h.indexOf('CitizenA'), iB = h.indexOf('CitizenB');
  const set = new Set();
  for (let r = 1; r < bondRows.length; r++) {
    set.add([String(bondRows[r][iA] || '').toUpperCase(), String(bondRows[r][iB] || '').toUpperCase()].sort().join('|'));
  }
  return set;
}

/**
 * Core detection. Pure — takes rows, returns ranked candidates.
 * reflections: [{ pop, cycle, daypart, text }]
 */
function detect(reflections, matcher, existingPairs, opts) {
  const min = (opts && opts.min) || 2;
  const cand = new Map();

  for (const ref of reflections) {
    const speaker = String(ref.pop || '').toUpperCase();
    const text = String(ref.text || '');
    if (!speaker || !text) continue;
    const hitPops = new Set();
    for (const a of matcher.anchors) {
      if (a.pop === speaker) continue;
      if (hitPops.has(a.pop)) continue;
      if (!a.re.test(text)) continue;
      hitPops.add(a.pop);
      const key = [speaker, a.pop].sort().join('|');
      if (existingPairs.has(key)) continue;   // engine already knows
      if (!cand.has(key)) {
        cand.set(key, { key, speaker, named: a.pop, namedName: a.name, mentions: 0, kinds: {}, cycles: new Set(), lines: [] });
      }
      const c = cand.get(key);
      c.mentions++;
      c.kinds[a.kind] = (c.kinds[a.kind] || 0) + 1;
      c.cycles.add(String(ref.cycle));
      if (c.lines.length < 3) c.lines.push({ cycle: ref.cycle, daypart: ref.daypart, by: speaker, text: text.slice(0, 160) });
    }
  }

  return [...cand.values()]
    .filter((c) => c.mentions >= min)
    .map((c) => ({ ...c, cycles: [...c.cycles].sort() }))
    .sort((a, b) => b.mentions - a.mentions || b.cycles.length - a.cycles.length);
}

module.exports = { buildMatcher, buildPairSet, detect, COMMON_WORDS, escapeRe, normWord, WAKE_DAYPARTS };

// ---------------------------------------------------------------------------

async function main() {
  require('/root/GodWorld/lib/env');
  const fs = require('fs');
  const sheets = require('/root/GodWorld/lib/sheets.js');

  const flag = (n, d) => {
    const a = process.argv.find((x) => x.startsWith('--' + n + '='));
    return a ? a.slice(n.length + 3) : d;
  };
  const min = Number(flag('min', 2));
  const since = flag('since', null) ? Number(flag('since')) : null;
  const allDayparts = process.argv.includes('--all-dayparts');
  const outPath = flag('out', null);

  const [ri, led, bonds] = await Promise.all([
    sheets.getRawSheetData('Reflection_Intake'),
    sheets.getRawSheetData('Simulation_Ledger'),
    sheets.getRawSheetData('Relationship_Bonds'),
  ]);

  const h = ri[0].map(String);
  const iPop = h.indexOf('POPID'), iCyc = h.indexOf('Cycle'), iDp = h.indexOf('Daypart'), iTx = h.indexOf('ReflectionExcerpt');
  const reflections = [];
  for (let r = 1; r < ri.length; r++) {
    const dp = String(ri[r][iDp] || '');
    if (!allDayparts && !WAKE_DAYPARTS.has(dp)) continue;
    const cy = Number(ri[r][iCyc]);
    if (since && cy < since) continue;
    reflections.push({ pop: ri[r][iPop], cycle: ri[r][iCyc], daypart: dp, text: ri[r][iTx] });
  }

  const matcher = buildMatcher(led);
  const existing = buildPairSet(bonds);
  const found = detect(reflections, matcher, existing, { min });

  const nameOf = {};
  for (const p of matcher.people) nameOf[p.pop] = p.full;

  console.log(`\nreflections scanned: ${reflections.length}${allDayparts ? ' (all dayparts)' : ' (wake dayparts only)'}`);
  console.log(`name anchors: ${matcher.anchors.length} across ${matcher.people.length} citizens`);
  console.log(`existing bond pairs excluded: ${existing.size}`);
  console.log(`\ncandidate bonds (>= ${min} mentions), strongest first:\n`);
  for (const c of found) {
    console.log(`  x${c.mentions}  ${c.speaker} ${nameOf[c.speaker] || ''} -> ${c.named} ${c.namedName}`);
    console.log(`        cycles ${c.cycles.join(',')} | match ${Object.entries(c.kinds).map(([k, v]) => k + ':' + v).join(' ')}`);
    for (const l of c.lines) console.log(`        c${l.cycle} ${l.daypart}: "${l.text}"`);
    console.log('');
  }
  console.log(`${found.length} candidate pair(s).`);

  if (outPath) {
    const claims = found.map((c) => ({
      a: nameOf[c.speaker], b: c.namedName,
      bondType: null, intensity: null, domainTag: null,
      nature: null,
      evidence: `wake mentions x${c.mentions} across cycles ${c.cycles.join(',')} — ${c.lines.map((l) => `c${l.cycle} ${l.daypart}`).join('; ')}`,
      _detector: { mentions: c.mentions, kinds: c.kinds, cycles: c.cycles, lines: c.lines },
    }));
    fs.writeFileSync(outPath, JSON.stringify({
      claimSet: 'wake-detected',
      cycle: null,
      producedBy: 'scripts/extractBondsFromWakes.js (detector only — bondType/intensity/nature need a framing pass before this can be minted)',
      sources: ['Reflection_Intake wake reflections'],
      claims,
    }, null, 2));
    console.log(`\nclaim skeleton -> ${outPath}`);
    console.log('NOT mintable as-is: bondType, intensity and nature are null and need the framing pass.');
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(found, null, 2));
}

if (require.main === module) main().catch((e) => { console.error('[FATAL]', e); process.exit(1); });
