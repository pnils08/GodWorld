#!/usr/bin/env node
/**
 * buildPulseSlice.js — the city pulse off the citizens' own pages (pipeline.70 seam 3).
 *
 * Reads output/citizen_pages/index.jsonl (scripts/scanCitizenPages.js --dump — the admitted page
 * docs, offline) and counts what the pages are talking about over a rolling 8-Cycle window with
 * this Cycle's docs weighted highest. A standing theme list (rent, debt, work, the A's, the Oaks,
 * the clinic, transit, safety, faith, the council) plus the Cycle's ad-hoc themes (the names the
 * culture record says the city is talking about, output/beats/Cultural_Ledger.jsonl). For each
 * theme: docs, citizens, this Cycle vs last, a trend word, and the three citizens who said the
 * most (POPID, name, hood, the Cycle they said it, one excerpt — the citizen's text as written).
 *
 * The aggregate is a SOURCING SIGNAL and colour, never a published statistic (canon is colour,
 * not a data echo): Celeste writes "the block is talking about rent again", not "41% of pages".
 * Consumers: buildTrendsSlice.js (THE PAGES SAY section + the top voices as people on the record).
 *
 * Counted: ENGINE-clock citizens on the ledger. Not counted: GAME-clock / athletes (the sports
 * desks' subjects, never a street voice — K.sportsSubject), MEDIA-clock seats (a reporter's page
 * feeding the pulse that feeds their next story is a loop), pages with no ledger row.
 * Theme tallies count reflection AND tension docs; a quoted voice comes from a reflection only.
 * Office holders (director, chief, council…) are not counted: an office speaks through the civic
 * record. A citizen is quoted on one theme only, their strongest; the writer-facing lines carry
 * words ("dozens of citizens"), never counts — the counts live in the JSON and pulse.md.
 * Excerpt guard: a real-world date or a tooling name in a page drops that doc from the voices.
 *
 * No LLM, no network. Artifacts: output/cron-compare/pulse_c{N}.json · output/slices/c{N}/pulse.md
 * Usage: node scripts/buildPulseSlice.js --cycle N [--json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./beatSliceKit');
const pages = require('./scanCitizenPages');

const ROOT = '/root/GodWorld';
const VERSION = 'PULSE-1';
const WINDOW = 8;
const TOP_THEMES = 5;
const VOICES = 3;

// Short phrase lists, not bare words ("work", "safety" alone are noise). Curly apostrophes are
// how the pages are written ("Danny’s"), so every apostrophe is ['’].
const THEMES = [
  { key: 'rent', label: 'rent', re: /\b(?:rent|landlord|lease|evict\w*|the deposit|move out|priced out)\b/i },
  { key: 'debt', label: 'debt and money', re: /\b(?:debt|loans?|owe|in the red|collections|overdrawn|savings|paycheck to paycheck|can['’]t afford)\b/i },
  { key: 'work', label: 'work', re: /\b(?:my (?:boss|shift|manager|job|hours)|overtime|laid off|layoffs?|promotion|double shift|the shop floor|clock(?:ed|ing) (?:in|out)|at work)\b/i },
  { key: 'as', label: "the A's", re: /\b(?:A['’]s|Athletics|Coliseum|ballpark|the dugout|box score)\b/ },
  { key: 'oaks', label: 'the Oaks', re: /\b(?:Oaks|Varek|expansion (?:team|franchise|club)|the arena|tip-?off)\b/ },
  { key: 'clinic', label: 'the clinic', re: /\b(?:clinic|hospital|the ER|urgent care|the nurse|my doctor|health center|waiting room)\b/i },
  { key: 'transit', label: 'transit', re: /\b(?:BART|the bus|AC Transit|commute|the train|transit|the platform|the station)\b/i },
  { key: 'safety', label: 'safety', re: /\b(?:police|OPD|cops?|cruiser|sirens?|break-in|robbed|stolen|OARI|crime|the shooting|patrol)\b/i },
  { key: 'faith', label: 'faith', re: /\b(?:church|mosque|temple|synagogue|pastor|imam|rabbi|prayer|congregation|the service|scripture|faith)\b/i },
  { key: 'council', label: 'the council', re: /\b(?:council|the mayor|Santana|city hall|district \d|the vote|ordinance|Okoro|the hearing|the budget)\b/i }
];
// A page that names a real-world date or the tooling is not a citizen's voice for the paper.
const LEAK_RE = /\b20\d\d-\d\d-\d\d\b|\b(?:Claude|Codex|Anthropic|Supermemory|OpenRouter|Gemini)\b/i;
// An office speaks through the civic record (sourcing mode `offices`), not through the pulse —
// a director's page line is the office talking, not the block. Same shape as the packet's isOfficial.
const OFFICIAL_RE = /\b(?:council|mayor|director|chief|commissioner|superintendent|district attorney|city clerk|program lead|planning lead)\b/i;

function arg(flag, def) { const i = process.argv.indexOf(flag); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Ad-hoc themes: the names the culture record says the city is talking about this Cycle. */
function adHocThemes(root, cycle) {
  const out = [];
  try {
    const p = path.join(root, 'output', 'beats', 'Cultural_Ledger.jsonl');
    const meta = JSON.parse(fs.readFileSync(path.join(root, 'output', 'beats', 'meta.json'), 'utf8'));
    if (Number(meta.cycle) !== Number(cycle)) return out; // another Cycle's record is not this week's talk
    const rows = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
      .filter(r => r.Name && !/inactive|retired|closed/i.test(String(r.Status || '')))
      .map(r => ({ name: String(r.Name).trim(), n: K.num(r.MediaCount) || 0 }))
      .sort((a, b) => b.n - a.n).slice(0, 5);
    for (const r of rows) {
      // Full name only, case-sensitive: a surname alone ("Cross", "Monroe") is a word in someone
      // else's sentence (agy recount 2026-10-03 caught it on Lena Cross).
      out.push({ key: 'adhoc:' + r.name, label: r.name, adHoc: true, re: new RegExp('\\b' + esc(r.name) + '\\b') });
    }
  } catch (_) { /* no culture record on disk — standing list only */ }
  return out;
}

function excerptFor(text, re) {
  const clean = pages.citizenText(text).replace(/\s+/g, ' ').trim();
  const m = re.exec(clean);
  if (!m) return null;
  // The sentence that holds the match.
  const start = Math.max(clean.lastIndexOf('. ', m.index), clean.lastIndexOf('! ', m.index), clean.lastIndexOf('? ', m.index));
  let s = clean.slice(start >= 0 ? start + 2 : 0);
  const end = s.search(/[.!?](?:\s|$)/);
  if (end > 0) s = s.slice(0, end + 1);
  if (s.length > 220) s = s.slice(0, 217).replace(/\s+\S*$/, '') + '…';
  return s;
}

function build(cycle, { root = ROOT } = {}) {
  cycle = Number(cycle);
  const rows = pages.loadIndex(root);
  const meta = pages.loadMeta(root);
  const profiles = K.loadProfiles(root);
  const lo = cycle - (WINDOW - 1);
  const excluded = { game: 0, media: 0, officials: 0, noLedger: 0, outOfWindow: 0, leak: 0 };
  const counted = [];
  for (const r of rows) {
    if (r.cycle < lo || r.cycle > cycle) { excluded.outOfWindow++; continue; }
    const p = profiles.get(String(r.popId).toUpperCase());
    if (!p) { excluded.noLedger++; continue; }
    if (K.sportsSubject(profiles, r.popId)) { excluded.game++; continue; }
    if (String(p.ClockMode || '').toUpperCase() === 'MEDIA') { excluded.media++; continue; }
    if (OFFICIAL_RE.test(String(p.RoleType || ''))) { excluded.officials++; continue; }
    counted.push({ r, p, w: 1 - 0.1 * (cycle - r.cycle) });
  }
  const themes = THEMES.concat(adHocThemes(root, cycle));
  const table = [];
  const used = new Set(); // a citizen is a quoted voice on ONE theme — their strongest, in table order
  for (const t of themes) {
    const hits = counted.filter(x => t.re.test(x.r.content));
    if (!hits.length) { table.push({ key: t.key, label: t.label, adHoc: !!t.adHoc, pattern: t.re.source, docs: 0, citizens: 0, thisCycle: 0, prevCycle: 0, score: 0, trend: 'quiet', voices: [] }); continue; }
    const byPop = new Map();
    for (const x of hits) {
      const e = byPop.get(x.r.popId) || { popid: x.r.popId, p: x.p, docs: 0, score: 0, latest: null };
      e.docs++; e.score += x.w;
      if (!e.latest || x.r.cycle > e.latest.cycle || (x.r.cycle === e.latest.cycle && String(x.r.createdAt) > String(e.latest.createdAt))) e.latest = x.r;
      byPop.set(x.r.popId, e);
    }
    const thisCycle = hits.filter(x => x.r.cycle === cycle).length;
    const prevCycle = hits.filter(x => x.r.cycle === cycle - 1).length;
    const trend = thisCycle === 0 && prevCycle === 0 ? 'standing'
      : prevCycle === 0 && thisCycle >= 2 ? 'new this week'
        : thisCycle >= prevCycle * 1.25 && thisCycle >= 2 ? 'rising'
          : thisCycle <= prevCycle * 0.75 ? 'fading' : 'steady';
    table.push({ key: t.key, label: t.label, adHoc: !!t.adHoc, pattern: t.re.source, docs: hits.length, citizens: byPop.size,
      thisCycle, prevCycle, score: Math.round(hits.reduce((s, x) => s + x.w, 0) * 100) / 100, trend, voices: [], _hits: hits, _byPop: byPop });
  }
  table.sort((a, b) => b.score - a.score || b.citizens - a.citizens);
  // Voices: strongest theme picks first; a citizen is quoted on one theme only.
  for (const row of table) {
    if (!row.docs) continue;
    const t = themes.find(x => x.key === row.key);
    const hits = row._hits; const byPop = row._byPop;
    const voices = row.voices;
    for (const e of [...byPop.values()].sort((a, b) => b.score - a.score || b.docs - a.docs)) {
      if (used.has(e.popid)) continue;
      // Most recent doc on the theme that passes the leak guard; else the next doc back.
      // Quote only a reflection — a `tension` doc is the open question the citizen is carrying
      // ("TENSION[c108]: Will the Oaks improve…"), counted toward the theme, never read as their words.
      const docs = hits.filter(x => x.r.popId === e.popid && x.r.type === 'reflection').map(x => x.r)
        .sort((a, b) => b.cycle - a.cycle || String(b.createdAt).localeCompare(String(a.createdAt)));
      // The first doc that passes the leak guard AND yields an excerpt in the cleaned text (kimi F8:
      // a theme can match raw content that the cleaner strips — never print “null”).
      let doc = null, excerpt = null;
      for (const d of docs) {
        if (LEAK_RE.test(d.content)) continue;
        const ex = excerptFor(d.content, t.re);
        if (ex) { doc = d; excerpt = ex; break; }
      }
      if (!doc) { excluded.leak++; continue; }
      voices.push({ popid: e.popid, name: String(e.p.Name || '').trim(), hood: String(e.p.Neighborhood || '').trim() || null,
        role: String(e.p.RoleType || '').trim() || null, docs: e.docs, cycle: doc.cycle, customId: doc.customId, docId: doc.docId,
        excerpt });
      used.add(e.popid);
      if (voices.length >= VOICES) break;
    }
    delete row._hits; delete row._byPop;
  }
  const hoods = {};
  for (const x of counted) { const h = String(x.p.Neighborhood || '').trim() || 'unknown'; const e = hoods[h] || (hoods[h] = { hood: h, docs: 0, pops: new Set() }); e.docs++; e.pops.add(x.r.popId); }
  return {
    version: VERSION, cycle, window: { from: lo, to: cycle, cycles: WINDOW },
    generatedAt: new Date().toISOString(),
    index: meta ? { generatedAt: meta.generatedAt, rows: meta.rows, liveCycle: meta.liveCycle } : null,
    counted: { docs: counted.length, citizens: new Set(counted.map(x => x.r.popId)).size, thisCycleDocs: counted.filter(x => x.r.cycle === cycle).length, excluded },
    themes: table,
    hoods: Object.values(hoods).map(h => ({ hood: h.hood, docs: h.docs, citizens: h.pops.size })).sort((a, b) => b.docs - a.docs)
  };
}

/** The lines a reporter sees: colour and sourcing, never a number for print. */
function voiceLines(pulse, max = TOP_THEMES) {
  const out = [];
  for (const t of pulse.themes.filter(t => t.docs > 0).slice(0, max)) {
    const v = t.voices[0];
    // Words, not counts: her stance line asks for "a window and a number from the slice", and the
    // pulse is the one thing on it that must never print as a number. The counts stay in the JSON.
    const scale = t.citizens >= 40 ? 'most of the city' : t.citizens >= 16 ? 'dozens of citizens' : t.citizens >= 6 ? 'a dozen or so citizens' : 'a handful of citizens';
    // The guardrail rides inside the string so it survives into the packet JSON (kimi F2): a page
    // line is the citizen's own page, not an interview — never printed as a quote.
    out.push(t.label + ' — ' + t.trend + (t.adHoc ? ' (a name on the culture record)' : '') + '; ' + scale + ' over the last two months' +
      (t.thisCycle ? ', still talking this week' : ', quiet this week') +
      (v ? '. Loudest: ' + v.name + (v.hood ? ' (' + v.hood + ')' : '') + ', on their own page at C' + v.cycle + ' (not an interview — colour only, never a quote): “' + v.excerpt + '”' : ''));
  }
  return out;
}

function formatMarkdown(pulse) {
  const L = [];
  L.push('# The pulse — what the pages say, C' + pulse.cycle);
  L.push('');
  L.push('Window C' + pulse.window.from + '–C' + pulse.window.to + ' · ' + pulse.counted.docs + ' pages from ' + pulse.counted.citizens + ' citizens (' + pulse.counted.thisCycleDocs + ' this Cycle) · index ' + (pulse.index ? pulse.index.generatedAt : 'none'));
  L.push('');
  L.push('_A sourcing signal and colour — never a published statistic. Write “the block is talking about rent again”, not a share._');
  L.push('');
  L.push('## THEMES (strongest first)');
  L.push('| theme | trend | citizens | pages | this Cycle | last Cycle |');
  L.push('|---|---|---|---|---|---|');
  for (const t of pulse.themes) L.push('| ' + t.label + (t.adHoc ? ' *' : '') + ' | ' + t.trend + ' | ' + t.citizens + ' | ' + t.docs + ' | ' + t.thisCycle + ' | ' + t.prevCycle + ' |');
  L.push('');
  L.push('_* a name on this Cycle\'s culture record_');
  L.push('');
  L.push('## WHO IS SAYING IT (the citizen\'s text as written; the Cycle they said it)');
  for (const t of pulse.themes.filter(t => t.voices.length)) {
    L.push('### ' + t.label);
    for (const v of t.voices) L.push('- ' + v.name + (v.role ? ', ' + v.role : '') + (v.hood ? ' — ' + v.hood : '') + ' — C' + v.cycle + ' (' + v.docs + ' page' + (v.docs === 1 ? '' : 's') + '): “' + v.excerpt + '”  _[' + v.customId + ']_');
    L.push('');
  }
  L.push('## WHERE THE PAGES COME FROM');
  L.push(pulse.hoods.slice(0, 10).map(h => h.hood + ' ' + h.citizens).join(' · '));
  L.push('');
  L.push('Not counted: GAME-clock ' + pulse.counted.excluded.game + ' · MEDIA-clock ' + pulse.counted.excluded.media + ' · office holders ' + pulse.counted.excluded.officials + ' · no ledger row ' + pulse.counted.excluded.noLedger + ' · leak-guarded ' + pulse.counted.excluded.leak);
  L.push('');
  L.push('_Generated by scripts/buildPulseSlice.js — no LLM, no network. Source: output/citizen_pages/index.jsonl._');
  return L.join('\n') + '\n';
}

function paths(cycle, root = ROOT) {
  return { json: path.join(root, 'output', 'cron-compare', 'pulse_c' + cycle + '.json'), md: path.join(root, 'output', 'slices', 'c' + cycle, 'pulse.md') };
}
function write(cycle, pulse, root = ROOT) {
  const p = paths(cycle, root);
  fs.mkdirSync(path.dirname(p.json), { recursive: true });
  fs.mkdirSync(path.dirname(p.md), { recursive: true });
  fs.writeFileSync(p.json, JSON.stringify(pulse, null, 2));
  fs.writeFileSync(p.md, formatMarkdown(pulse));
  return p;
}
/** load(cycle) -> the pulse on disk for that Cycle, or null. Never builds (the index is a network step's output). */
function load(cycle, root = ROOT) {
  try { const j = JSON.parse(fs.readFileSync(paths(cycle, root).json, 'utf8')); return j && j.version === VERSION && Number(j.cycle) === Number(cycle) ? j : null; } catch (_) { return null; }
}

module.exports = { VERSION, THEMES, build, write, load, paths, voiceLines, formatMarkdown, excerptFor };

if (require.main === module) {
  const cycle = arg('--cycle', null) || (() => { try { return require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true }); } catch (_) { return null; } })();
  if (cycle == null) { console.error('buildPulseSlice: pass --cycle N'); process.exit(1); }
  const pulse = build(cycle);
  const p = write(cycle, pulse);
  if (process.argv.includes('--json')) console.log(JSON.stringify(pulse, null, 2));
  else {
    console.log('pulse c' + cycle + ' — ' + pulse.counted.docs + ' pages / ' + pulse.counted.citizens + ' citizens in C' + pulse.window.from + '–C' + pulse.window.to);
    for (const l of voiceLines(pulse)) console.log('  - ' + l);
    console.log('→ ' + path.relative(ROOT, p.md));
    console.log('→ ' + path.relative(ROOT, p.json));
  }
}
