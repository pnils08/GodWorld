#!/usr/bin/env node
/**
 * buildCitizenWeekDigest.js — "The week in Oakland, told by its people."
 *
 * Assembles a weekly digest of citizen life straight from the sheets — the
 * citizens' own wake reflections and life events, minimal factual connective
 * text, nothing invented. Built for the NotebookLM audio path: this doc is
 * the source the audio overview reads from.
 *
 * Read-only. Usage:
 *   node scripts/buildCitizenWeekDigest.js [--days 7] [--vignettes 12] [--out output/citizen-week-digest.md]
 *   node scripts/buildCitizenWeekDigest.js --daily   # 24h people-slice for the 8am listening drop
 *
 * `--daily` is the pipeline.53 mode: days=1, vignettes=5, writes
 * output/citizen-day-digest.md, and frames the doc as "Today" instead of
 * "The Week". notebooklmDailyNews.js calls buildDigest({ daily: true })
 * in-process at run start and folds the result into its bounded source.
 */

'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(require('os').homedir(), '.config/godworld/.env') });
const sheets = require('../lib/sheets.js');

const REPO = path.join(__dirname, '..');

const LIFE_EVENT_PATTERNS = [
  { re: /\[Wedding\]|got married|married\b/i, kind: 'wedding' },
  { re: /\[Birth\]|was born|new child|baby/i, kind: 'birth' },
  { re: /\[Death\]|passed away|died\b/i, kind: 'death' },
  { re: /hospital|admitted/i, kind: 'hospital' },
  { re: /promot/i, kind: 'promotion' },
  { re: /laid off|lost (his|her|their) job|fired/i, kind: 'layoff' },
];

function parseArgs(argv) {
  const a = { days: 7, vignettes: 12, out: null, daily: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--days') a.days = Number(argv[++i]);
    else if (argv[i] === '--vignettes') a.vignettes = Number(argv[++i]);
    else if (argv[i] === '--out') a.out = path.resolve(argv[++i]);
    else if (argv[i] === '--daily') a.daily = true;
  }
  if (a.daily) {
    a.days = 1;
    a.vignettes = 5;
  }
  if (!a.out) {
    a.out = path.join(REPO, 'output', a.daily ? 'citizen-day-digest.md' : 'citizen-week-digest.md');
  }
  return a;
}

function idx(headers, ...names) {
  const lower = headers.map((h) => String(h || '').toLowerCase());
  for (const n of names) {
    const i = lower.indexOf(n.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

function clip(text, maxLen) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('." '));
  return (lastStop > 60 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, '') + '…');
}

async function buildDigest(options) {
  const args = Object.assign(
    { days: 7, vignettes: 12, out: null, daily: false },
    options || {}
  );
  if (args.daily) {
    args.days = 1;
    args.vignettes = 5;
  }
  if (!args.out) {
    args.out = path.join(REPO, 'output', args.daily ? 'citizen-day-digest.md' : 'citizen-week-digest.md');
  }
  const since = new Date(Date.now() - args.days * 864e5);

  const [slRows, reflRows, lifeRows, bondRows] = await Promise.all([
    sheets.getSheetData('Simulation_Ledger'),
    sheets.getSheetData('Reflection_Intake'),
    sheets.getSheetData('LifeHistory_Log'),
    sheets.getSheetData('Relationship_Bonds').catch(() => []),
  ]);

  // ── Citizens (name/hood per POPID) ──
  const slH = slRows[0];
  const si = {
    popid: idx(slH, 'POPID'), first: idx(slH, 'First'), last: idx(slH, 'Last'),
    hood: idx(slH, 'Neighborhood'), occ: idx(slH, 'Occupation', 'RoleType'), tier: idx(slH, 'Tier'),
  };
  const people = new Map();
  for (const r of slRows.slice(1)) {
    const p = String(r[si.popid] || '').trim();
    if (!p) continue;
    people.set(p, {
      name: `${r[si.first] || ''} ${r[si.last] || ''}`.trim(),
      hood: String(r[si.hood] || '').trim(),
      occ: String(r[si.occ] || '').trim(),
      tier: Number(r[si.tier]) || 9,
    });
  }
  const person = (popid) => people.get(popid) || { name: popid, hood: '', occ: '', tier: 9 };

  // ── Bond partner names (for conversation attribution) ──
  const partnerOf = new Map();
  if (bondRows.length > 1) {
    const bH = bondRows[0];
    const ba = idx(bH, 'CitizenA'), bb = idx(bH, 'CitizenB'), bt = idx(bH, 'BondType'), bst = idx(bH, 'Status');
    for (const r of bondRows.slice(1)) {
      if (bst >= 0 && String(r[bst]).toLowerCase() !== 'active') continue;
      const a = String(r[ba] || ''), b = String(r[bb] || '');
      if (!partnerOf.has(a)) partnerOf.set(a, []);
      if (!partnerOf.has(b)) partnerOf.set(b, []);
      partnerOf.get(a).push({ other: b, type: String(r[bt] || 'bond') });
      partnerOf.get(b).push({ other: a, type: String(r[bt] || 'bond') });
    }
  }

  // ── Reflections in window ──
  const rH = reflRows[0];
  const ri = {
    ts: idx(rH, 'Timestamp', 'ts'), popid: idx(rH, 'POPID', 'popid'),
    kind: idx(rH, 'Daypart', 'Type', 'Kind', 'Source'),
    event: idx(rH, 'Tag', 'Event', 'event'),
    text: idx(rH, 'ReflectionExcerpt', 'Snippet', 'Text', 'Reflection', 'Content'),
    affect: idx(rH, 'Affect', 'affect'),
    cycle: idx(rH, 'Cycle'),
  };
  const reflections = [];
  for (const r of reflRows.slice(1)) {
    const ts = new Date(r[ri.ts]);
    if (!Number.isFinite(+ts) || ts < since) continue;
    const popid = String(r[ri.popid] || '').trim();
    const text = clip(r[ri.text], 420);
    if (!popid || !text) continue;
    reflections.push({
      ts, popid,
      kind: String(r[ri.kind] || '').toUpperCase(),
      event: String(r[ri.event] || ''),
      affect: String(r[ri.affect] || ''),
      cycle: ri.cycle >= 0 ? Number(r[ri.cycle]) : null,
      text,
    });
  }

  // ── Life events + daily texture in window ──
  const lH = lifeRows[0];
  const li = {
    ts: idx(lH, 'Timestamp'), popid: idx(lH, 'POPID'), name: idx(lH, 'Name'),
    tag: idx(lH, 'EventTag', 'Tag', 'Tags'), text: idx(lH, 'EventText', 'Text'),
    hood: idx(lH, 'Neighborhood'),
  };
  const lifeEvents = [];
  const texture = new Map(); // popid -> [daily lines]
  for (const r of lifeRows.slice(1)) {
    const ts = new Date(r[li.ts]);
    if (!Number.isFinite(+ts) || ts < since) continue;
    const popid = String(r[li.popid] || '').trim();
    const text = clip(r[li.text], 220);
    if (!popid || !text) continue;
    const hay = `${r[li.tag]} ${text}`;
    const hit = LIFE_EVENT_PATTERNS.find((p) => p.re.test(hay));
    if (hit) {
      lifeEvents.push({ ts, popid, kind: hit.kind, text });
    } else if (/daily/i.test(String(r[li.tag]))) {
      if (!texture.has(popid)) texture.set(popid, []);
      texture.get(popid).push(text);
    }
  }

  // ── Pair CONVO reflections by time proximity ──
  // An exchange writes both participants' intake rows within the same run
  // (seconds apart). Pairing on nearest timestamp attributes the actual
  // conversation partner; the first-active-bond fallback can name the wrong
  // person (observed: Victor Alize attributed to Dimas Wong while talking
  // to Elliot Marbury).
  const convos = reflections.filter((r) => r.kind === 'CONVO');
  const convoPartner = new Map(); // reflection object -> partner popid
  for (const rf of convos) {
    let best = null;
    let bestDt = Infinity;
    for (const other of convos) {
      if (other === rf || other.popid === rf.popid) continue;
      const dt = Math.abs(other.ts - rf.ts);
      if (dt < bestDt) { bestDt = dt; best = other; }
    }
    if (best && bestDt <= 10 * 60e3) convoPartner.set(rf, best.popid);
  }

  // ── Rank citizens for vignettes ──
  const byCitizen = new Map();
  for (const rf of reflections) {
    if (!byCitizen.has(rf.popid)) byCitizen.set(rf.popid, []);
    byCitizen.get(rf.popid).push(rf);
  }
  const ranked = [...byCitizen.entries()].map(([popid, rfs]) => {
    let score = 0;
    if (rfs.some((r) => r.kind === 'CONVO' || r.kind === 'DISCORD' || r.kind === 'INTERVIEW' || r.kind === 'DEBATE')) score += 3;
    if (rfs.some((r) => r.affect)) score += 2;
    if (lifeEvents.some((e) => e.popid === popid)) score += 4;
    if (texture.has(popid)) score += 1;
    score += Math.max(0, 5 - person(popid).tier); // tier 1-2 favored
    score += Math.min(rfs.length, 3);
    return { popid, rfs: rfs.sort((a, b) => b.ts - a.ts), score };
  }).sort((a, b) => b.score - a.score);

  const picked = ranked.slice(0, args.vignettes);

  // ── Compose ──
  const latestCycle = Math.max(0, ...reflections.map((r) => Number(r.cycle || 0)).filter(Number.isFinite));
  const md = [];
  if (args.daily) {
    md.push('# Today in Oakland — told by its people');
    md.push('');
    md.push(`A daily digest of citizen life over the last 24 hours, assembled from the citizens' own reflections and life events on record${latestCycle ? ` (through Cycle ${latestCycle})` : ''}. Everything below is sourced from the world ledger — nothing is invented.`);
  } else {
    md.push('# The Week in Oakland — told by its people');
    md.push('');
    md.push(`A weekly digest of citizen life, assembled from the citizens' own reflections and life events on record${latestCycle ? ` (through Cycle ${latestCycle})` : ''}. Everything below is sourced from the world ledger — nothing is invented.`);
  }
  md.push('');

  if (lifeEvents.length) {
    md.push('## The big moments');
    md.push('');
    for (const e of lifeEvents.sort((a, b) => b.ts - a.ts).slice(0, 10)) {
      const p = person(e.popid);
      md.push(`- **${p.name}**${p.hood ? ` (${p.hood})` : ''} — ${e.text}`);
    }
    md.push('');
  }

  md.push('## The people, in their own words');
  md.push('');
  for (const { popid, rfs } of picked) {
    const p = person(popid);
    const header = [p.name];
    if (p.occ) header.push(p.occ);
    if (p.hood) header.push(p.hood);
    md.push(`### ${header.join(' — ')}`);
    md.push('');
    for (const rf of rfs.slice(0, 2)) {
      const convoWith = convoPartner.get(rf);
      const partnerLine = rf.kind === 'CONVO' && convoWith
        ? ` *(talking with ${person(convoWith).name})*`
        : rf.kind === 'CONVO' && partnerOf.get(popid)?.length
          ? ` *(talking with ${person(partnerOf.get(popid)[0].other).name})*`
          : '';
      md.push(`> ${rf.text}${partnerLine}`);
      md.push('');
    }
    const tex = (texture.get(popid) || []).slice(0, 1);
    if (tex.length) {
      md.push(`*Around the neighborhood: ${tex[0]}*`);
      md.push('');
    }
  }

  md.push('---');
  md.push(`*Assembled ${new Date().toISOString().slice(0, 10)} from Reflection_Intake (${reflections.length} reflections, ${byCitizen.size} citizens) and LifeHistory_Log (${lifeEvents.length} life events) over the last ${args.days} day${args.days === 1 ? '' : 's'} by scripts/buildCitizenWeekDigest.js${args.daily ? ' --daily' : ''}. Read-only; no content generated.*`);

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, md.join('\n'), 'utf8');
  return {
    out: args.out,
    text: md.join('\n'),
    vignettes: picked.length,
    lifeEvents: lifeEvents.length,
    reflections: reflections.length,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const result = await buildDigest(args);
  console.log(`Digest: ${result.vignettes} vignettes, ${result.lifeEvents} life events, ${result.reflections} reflections in window -> ${path.relative(REPO, result.out)}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { buildDigest, parseArgs };
