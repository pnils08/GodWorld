#!/usr/bin/env node
/**
 * extractBondsFromWakes.js — who are citizens actually talking about?
 *
 * The wakes are the bond instrument. Three times a day a citizen says what is on
 * their mind, and sometimes they name somebody.
 *
 * THE TRAP, and the whole reason this file is careful: a citizen only knows a name
 * the wake handed them. The prompt injects coResidents (cap 3, same hood), the
 * sports slice, the edition slice, family, existing bonds, the ripple line, the
 * card block and page memory — all by name. So a name in a reflection is normally
 * an ECHO of an injection, not a discovered relationship. Measured on the C97-C104
 * corpus: 10 candidate pairs, 7 of them same-neighbourhood (three separate citizens
 * "circling" Lucia Polito turned out to be coResidents rotating her name through
 * Fruitvale), and the 3 cross-hood survivors all named A's figures the sports slice
 * carries. Real yield: zero.
 *
 * The honest test is subtraction against what the wake actually offered — and that
 * set is not recoverable after the fact, because nothing used to store it. So
 * citizen-wake.js now appends it to logs/citizen-wake-offered.jsonl at wake time,
 * and this script scores against that. Rows older than that log can only be marked
 * `unknown`; they are reported separately and are NOT candidates.
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

/**
 * logs/citizen-wake-offered.jsonl -> Map<"pop|cycle|daypart", {pops:Set, prose:string}>
 * Written by citizen-wake.js at wake time. Absent for anything before that landed.
 */
function loadOffered(lines) {
  const map = new Map();
  for (const line of lines) {
    const t = String(line || '').trim();
    if (!t) continue;
    let o; try { o = JSON.parse(t); } catch (e) { continue; }
    if (!o || !o.pop) continue;
    map.set(`${String(o.pop).toUpperCase()}|${o.cycle}|${o.daypart}`, {
      pops: new Set((o.offeredPops || []).map((x) => String(x).toUpperCase())),
      feed: String(o.feed || o.prose || ''),   // city news — a name here is an echo
      own: String(o.own || ''),                // their own page/family/bonds/ripple — a name here is the SIGNAL
    });
  }
  return map;
}

/**
 * Where did this name come from?
 *
 * 'echo'       — the CITY FEED handed it over: the sports slice, the edition slice,
 *                hood texture, the card. A stranger's name the citizen read. Noise.
 * 'continuity' — it was in the citizen's OWN life read back to them: their wiki page,
 *                family, bonds, or a ripple from someone who crossed their path. This
 *                is NOT contamination. A page that keeps returning a person is what a
 *                bond looks like from the inside — it is the strongest signal here.
 * 'unprompted' — nothing offered it and they said it anyway.
 * 'unknown'    — no record for that wake (predates the log). Not scorable.
 *
 * Order matters: the feed is checked first, so a name that is BOTH city news and in
 * their page (a famous neighbour) is treated as the weaker read.
 */
function provenanceOf(ref, namedPop, namedName, offered) {
  const rec = offered.get(`${String(ref.pop).toUpperCase()}|${ref.cycle}|${ref.daypart}`);
  if (!rec) return 'unknown';
  const full = String(namedName || '');
  const parts = full.split(/\s+/).filter((x) => x.length > 3);
  const inText = (hay) => {
    if (!hay) return false;
    for (const part of [full, ...parts]) {
      if (part && new RegExp(`\\b${escapeRe(part)}\\b`, 'i').test(hay)) return true;
    }
    return false;
  };
  if (inText(rec.feed)) return 'echo';
  if (rec.pops.has(String(namedPop).toUpperCase()) || inText(rec.own)) return 'continuity';
  return 'unprompted';
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
  const offered = (opts && opts.offered) || new Map();
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
        cand.set(key, { key, speaker, named: a.pop, namedName: a.name, mentions: 0, kinds: {}, cycles: new Set(), lines: [], prov: { unprompted: 0, continuity: 0, echo: 0, unknown: 0 } });
      }
      const c = cand.get(key);
      c.mentions++;
      c.prov[provenanceOf(ref, a.pop, a.name, offered)]++;
      c.kinds[a.kind] = (c.kinds[a.kind] || 0) + 1;
      c.cycles.add(String(ref.cycle));
      if (c.lines.length < 3) c.lines.push({ cycle: ref.cycle, daypart: ref.daypart, by: speaker, text: text.slice(0, 160) });
    }
  }

  return [...cand.values()]
    .filter((c) => c.mentions >= min)
    .map((c) => ({
      ...c,
      cycles: [...c.cycles].sort(),
      // A pair is only a candidate on the strength of its UNPROMPTED mentions. Echoes
      // are the engine hearing itself; unknowns predate the offered-names log.
      // Continuity counts. A citizen whose own page keeps returning someone is the
      // clearest bond evidence the wakes produce; requiring an unprompted mention
      // would throw exactly that away.
      verdict: (c.prov.unprompted + c.prov.continuity) > 0 ? 'candidate'
        : (c.prov.echo > 0 ? 'echo' : 'unknown'),
    }))
    .sort((a, b) => (b.prov.unprompted + b.prov.continuity) - (a.prov.unprompted + a.prov.continuity) || b.mentions - a.mentions);
}

module.exports = { buildMatcher, buildPairSet, detect, loadOffered, provenanceOf, COMMON_WORDS, escapeRe, normWord, WAKE_DAYPARTS };

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
  const offeredPath = '/root/GodWorld/logs/citizen-wake-offered.jsonl';
  let offered = new Map();
  try { offered = loadOffered(fs.readFileSync(offeredPath, 'utf8').split('\n')); } catch (e) { /* not written yet */ }
  const found = detect(reflections, matcher, existing, { min, offered });

  const nameOf = {};
  for (const p of matcher.people) nameOf[p.pop] = p.full;

  console.log(`\nreflections scanned: ${reflections.length}${allDayparts ? ' (all dayparts)' : ' (wake dayparts only)'}`);
  console.log(`name anchors: ${matcher.anchors.length} across ${matcher.people.length} citizens`);
  console.log(`existing bond pairs excluded: ${existing.size}`);
  console.log(`wakes with a recorded offered-name set: ${offered.size}`);
  if (!offered.size) {
    console.log('\n!! logs/citizen-wake-offered.jsonl is empty or missing.');
    console.log('!! Without it there is no way to tell a discovered name from a name the wake');
    console.log('!! handed the citizen, so nothing below can be treated as a real candidate.');
  }

  const byVerdict = { candidate: [], echo: [], unknown: [] };
  for (const c of found) byVerdict[c.verdict].push(c);

  const show = (label, list, note) => {
    console.log(`\n=== ${label}: ${list.length} ===`);
    if (note) console.log(`    ${note}`);
    for (const c of list) {
      console.log(`  x${c.mentions} (unprompted ${c.prov.unprompted} / continuity ${c.prov.continuity} / echo ${c.prov.echo} / unknown ${c.prov.unknown})`);
      console.log(`        ${c.speaker} ${nameOf[c.speaker] || ''} -> ${c.named} ${c.namedName}`);
      console.log(`        cycles ${c.cycles.join(',')} | match ${Object.entries(c.kinds).map(([k, v]) => k + ':' + v).join(' ')}`);
      for (const l of c.lines) console.log(`        c${l.cycle} ${l.daypart}: "${l.text}"`);
    }
  };
  show('CANDIDATES — unprompted, or carried in the citizen\'s own page/family/ripple', byVerdict.candidate);
  show('ECHO — the name came off the city feed (sports/edition/texture); noise', byVerdict.echo);
  show('UNKNOWN — wake predates the offered-name log; cannot be scored', byVerdict.unknown,
    'These are NOT candidates. They become scorable once these citizens wake again.');
  console.log(`\n${byVerdict.candidate.length} real candidate(s) of ${found.length} name-pairs seen.`);

  if (outPath) {
    const claims = byVerdict.candidate.map((c) => ({
      a: nameOf[c.speaker], b: c.namedName,
      bondType: null, intensity: null, domainTag: null,
      nature: null,
      evidence: `wake mentions x${c.mentions} — unprompted ${c.prov.unprompted}, own-page continuity ${c.prov.continuity} across cycles ${c.cycles.join(',')} — ${c.lines.map((l) => `c${l.cycle} ${l.daypart}`).join('; ')}`,
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
