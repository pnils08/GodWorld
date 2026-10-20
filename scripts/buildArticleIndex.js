#!/usr/bin/env node
/**
 * buildArticleIndex.js — Bay Tribune master index (pipeline.84 Task 3): one row per piece.
 *
 * Rewritten in place (S583). The old builder read output/drive-files/, which is gone; this one reads what is on
 * disk: editions/ (split per article), archive/articles, archive/non-articles/profiles, archive/editions (bundles),
 * and the staged sidecars in output/cron-compare/staged (flagged unpublished unless their stem is in the cycle's
 * published set). archive/drive-manifest.json (syncDriveArticles.js) supplies the Drive id of each copy.
 *
 * A row: title, byline (+ POPID resolved BY NAME against output/citizen-names.tsv, never an agent-supplied id),
 * desk, cycle or null (+ era note; a cycle is never invented), type, published, citizens named (name scan,
 * resolved by name), copies folded by body fingerprint (repo path, kind, Drive ids), variant Drive ids.
 * Section headings and table rows are not pieces: a piece needs a byline line or a named file of its own.
 *
 * Usage:
 *   node scripts/buildArticleIndex.js           # dry run: counts + acceptance probes, nothing written
 *   node scripts/buildArticleIndex.js --write   # write archive/ARTICLE_INDEX.jsonl
 * Library: loadIndex(), searchIndex(rows, {author, citizen, q, cycle}).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'archive/ARTICLE_INDEX.jsonl');
const MANIFEST = path.join(ROOT, 'archive/drive-manifest.json');
const STAGED = path.join(ROOT, 'output/cron-compare/staged');

const norm = t => t.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
const sha = t => crypto.createHash('sha1').update(norm(t)).digest('hex');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
function titleCase(s) { return s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()); }
const strip = s => s.replace(/^\s*#{1,6}\s*/, '').replace(/\*\*|__/g, '').replace(/^["“'‘]+|["”'’]+$/g, '').replace(/\s+/g, ' ').trim();

// Reporter name -> desk (the old builder's map, kept) and name aliases for POPID lookup
const REPORTER_DESK = {
  'carmen delaine': 'Civic', 'jordan velez': 'Business', 'maria keen': 'Culture', 'p slayer': 'Sports', 'hal richmond': 'Sports',
  'anthony': 'Sports', 'anthony raines': 'Sports', 'selena grant': 'Chicago', 'talia finch': 'Chicago', 'mags corliss': 'Editorial',
  'margaret corliss': 'Editorial', 'farrah del rio': 'Opinion', 'reed thompson': 'Wire', 'celeste tran': 'Internet', 'tanya cruz': 'Sports',
  'simon leary': 'Sports', 'noah tan': 'Weather', 'mason ortega': 'Food', 'angela reyes': 'Education', 'kai marston': 'Arts',
  'elliot graye': 'Faith', 'sharon okafor': 'Lifestyle', 'dr. lila mezran': 'Health', 'lila mezran': 'Health', 'trevor shimizu': 'Transit',
  'dana reeve': 'National', 'rachel torres': 'Public Safety', 'sgt. rachel torres': 'Public Safety', 'dj hartley': 'Photo',
  'elliot marbury': 'Data', 'luis navarro': 'Managing', 'jax caldera': 'Opinion',
};
const ALIAS = { anthony: 'Anthony Raines', 'margaret corliss': 'Mags Corliss', 'sgt. rachel torres': 'Rachel Torres', 'dr. lila mezran': 'Lila Mezran' };

// Tribune staff beyond the old map, then one resolver: a header or filename string counts as a byline only when it
// names a known reporter (exact, prefix, or suffix) or reads as a desk byline. Everything else is not a byline.
for (const n of ['nia rook', 'tamsin pruitt', 'ines sorensen', 'ariana reyes', 'dj hartley', 'jax caldera']) REPORTER_DESK[n] = REPORTER_DESK[n] || null;
const KNOWN_NAMES = Object.keys(REPORTER_DESK).sort((a, b) => b.length - a.length);
const DESK_BYLINE = /^(?:the )?(?:bay|oakland|skyline) tribune(?: [a-z&' -]{2,40})?$/i;
function resolveByline(raw) {
  if (!raw) return null;
  const v = raw.replace(/\s+/g, ' ').replace(/[*_]+/g, '').trim();
  const k = v.toLowerCase();
  if (DESK_BYLINE.test(v)) return v;
  for (const n of KNOWN_NAMES) if (k === n) return titleCase(n).replace(/^Dr\. /, 'Dr. ').replace(/^Sgt\. /, 'Sgt. ').replace(/^P Slayer$/, 'P Slayer').replace(/^Dj /, 'DJ ');
  for (const n of KNOWN_NAMES) {
    if (k.startsWith(n) && !/[a-z]/.test(v[n.length] || ' ')) return resolveByline(v.slice(0, n.length));
    if (k.endsWith(n) && /[\s]/.test(v[v.length - n.length - 1] || ' ')) return resolveByline(v.slice(v.length - n.length));
  }
  return null;
}

// ---- citizens (output/citizen-names.tsv) ----
function loadCitizens() {
  const byName = new Map();
  const rows = read('output/citizen-names.tsv').split('\n').slice(1).filter(Boolean).map(l => l.split('\t'));
  for (const [popid, name] of rows) if (name) { if (!byName.has(name)) byName.set(name, []); byName.get(name).push(popid); }
  return byName;
}
function nameIn(text, name) {
  let i = text.indexOf(name);
  while (i >= 0) {
    const a = text[i - 1], b = text[i + name.length];
    if (!(a && /[A-Za-z]/.test(a)) && !(b && /[A-Za-z]/.test(b))) return true;
    i = text.indexOf(name, i + 1);
  }
  return false;
}
function scanCitizens(text, byName) {
  const out = [];
  for (const [name, ids] of byName) if (nameIn(text, name)) out.push(ids.length === 1 ? { name, popid: ids[0] } : { name, popids: ids });
  return out;
}
const popidFor = (name, byName) => {
  if (!name) return null;
  const n = ALIAS[name.toLowerCase()] || name;
  const ids = byName.get(n);
  return ids && ids.length === 1 ? ids[0] : null;
};

// ---- drive manifest: disk path -> {driveIds, variantIds} ----
function loadManifest() {
  const byPath = new Map();
  if (!fs.existsSync(MANIFEST)) return byPath;
  const files = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).files;
  byPath.shelfPieces = [...new Set(Object.values(files).filter(r => r.status === 'shelf-only' && r.class === 'piece').map(r => r.disk))].sort();
  const add = (p, k, id) => { if (!byPath.has(p)) byPath.set(p, { driveIds: [], variantIds: [] }); byPath.get(p)[k].push(id); };
  for (const [id, r] of Object.entries(files)) {
    if (r.disk && r.status !== 'variant') { add(r.disk, 'driveIds', id); for (const p of r.alsoOn || []) add(p, 'driveIds', id); }
    if (r.status === 'variant' && files[r.variantOf] && files[r.variantOf].disk) add(files[r.variantOf].disk, 'variantIds', id);
  }
  return byPath;
}

// ---- splitting an edition-shaped file into pieces ----
const RULE = /^\s*([-=#*_~])\1{9,}\s*$/;
const BY_PIPE = /^\*{0,2}By ([A-Z][^|*\n]{1,60}?) \| ([^*\n]{2,60}?)\*{0,2}\s*(?:\[[A-Z]+\])?\s*$/;
const BY_LOOSE = /^\*{0,2}By ([A-Z][A-Za-z.' &-]{2,40}?)(?:, ([^*\n]{2,60}?))?\*{0,2}\s*$/;
function matchBy(line) {
  const t = line.trim();
  let m = BY_PIPE.exec(t);
  if (m) return { author: m[1].trim(), desk: m[2].replace(/\s*\[[A-Z]+\]$/, '').trim() };
  m = BY_LOOSE.exec(t);
  if (m && resolveByline(m[1]) && !DESK_BYLINE.test(m[1])) return { author: m[1].trim(), desk: (m[2] || '').trim() || null };
  return null;
}
const HEADING = /^\s*#{1,4}\s+\S/;

function splitPieces(text, defaultCycle) {
  const lines = text.split('\n');
  const marks = [];
  let cycle = defaultCycle, section = null;
  const at = new Array(lines.length);
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const ed = L.length < 90 && /^(?:THE CYCLE PULSE\s*[—–-]\s*)?(?:SUPPLEMENTAL\s+)?EDITION\s+(\d{1,3})\b/i.exec(L.trim());
    if (ed && !matchBy(L)) cycle = parseInt(ed[1], 10);
    if (/^[A-Z][A-Z &\/'’,.-]{3,60}$/.test(L.trim()) && i > 0 && RULE.test(lines[i - 1])) section = L.trim();
    at[i] = { cycle, section };
    const m = matchBy(L);
    if (m) marks.push({ i, author: m.author, desk: m.desk });
  }
  const isLabel = k => {
    let a = k - 1; while (a >= 0 && !lines[a].trim()) a--;
    let b = k + 1; while (b < lines.length && !lines[b].trim()) b++;
    return a >= 0 && b < lines.length && RULE.test(lines[a]) && RULE.test(lines[b]);
  };
  // title: a "# Title" right after the byline (C103+); else above it: heading, then a bold line, then the first non-italic line
  for (const m of marks) {
    let j = m.i + 1; while (j < lines.length && !lines[j].trim()) j++;
    if (j < lines.length && /^#{1,2}\s+\S/.test(lines[j]) && !/^#{1,2}\s+INTAKE\b/.test(lines[j]) && lines[j].length < 170) { m.title = strip(lines[j]); m.titleLine = j; m.after = true; continue; }
    const above = [];
    for (let k = m.i - 1, n = 0; k >= 0 && n < 8; k--) {
      const t = lines[k].trim();
      if (!t) continue;
      if (isLabel(k)) continue; // a section label between two rules is not a headline
      n++;
      if (RULE.test(lines[k]) || /^---+$/.test(t)) { if (!above.length) continue; break; }
      if (/^(Names Index:|NAMES:|HOOD:|CLAIM:|<!--)/.test(t)) break;
      above.push(k);
    }
    const pick = above.find(k => HEADING.test(lines[k])) ?? above.find(k => /^\*\*[^*].*\*\*$/.test(lines[k].trim())) ?? above.find(k => !/^\*[^*]/.test(lines[k].trim())) ?? above[0];
    if (pick != null) { m.title = strip(lines[pick]); m.titleLine = pick; }
  }
  const pieces = [];
  for (let n = 0; n < marks.length; n++) {
    const m = marks[n], next = marks[n + 1];
    let end = lines.length;
    if (next) end = next.after ? next.i : (next.titleLine != null && next.titleLine > m.i ? next.titleLine : next.i);
    const body = [], names = [];
    let inIntake = false;
    const startAt = m.after ? m.titleLine + 1 : m.i + 1;
    for (let i = startAt; i < end; i++) {
      const L = lines[i], t = L.trim();
      if (RULE.test(L)) { if (!body.some(x => x.trim()) && !inIntake) continue; break; } // a rule right under the byline opens the body
      if (/^##\s+INTAKE\b/.test(t)) { inIntake = true; continue; }
      if (inIntake) { const nm = /^NAMES:\s*(.+?)\s*\|/.exec(t); if (nm) names.push(nm[1]); continue; }
      if (/^\*{0,2}Names Index:\*{0,2}/.test(t)) { names.push(...t.replace(/^\*{0,2}Names Index:\*{0,2}/, '').split(',').map(s => s.replace(/\(.*?\)/g, '').replace(/\*/g, '').trim()).filter(Boolean)); break; }
      body.push(L);
    }
    const b = body.join('\n').replace(/^\s*---+\s*$/m, '').trim();
    if (b.length < 80) continue;
    pieces.push({ title: m.title && m.title.length >= 4 ? m.title : null, lede: m.title && m.title.length >= 4 ? undefined : b.replace(/\s+/g, ' ').slice(0, 110), byline: m.author, bylineDesk: m.desk, section: at[m.i].section, cycle: at[m.i].cycle, body: b, names });
  }
  return pieces;
}

// ---- single-piece (archive) header parsing ----
const BYL = [
  /^\*{0,2}By\s+([A-Z][^|*\n]{2,40}?)\s*(?:\||\*|$|,)/,
  /^\*{0,2}Byline:?\*{0,2}\s*(.+)/i,
  /^\*([A-Z][a-z]+ [A-Z][a-z]+)[,*]/,
  /^([A-Z][A-Za-z.' ]{3,30}?) [—–-] (?:Civic|Sports|Culture|Business|Investigations|Public|Health|Education|Arts|Food|Faith|Transit|Weather|Human|Lifestyle|Opinion|Voices|International|Data|Statcast|Cultural|Senior|Editor|Beat|Managing|Chief)/,
];
function headerByline(text) {
  for (const l of text.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 14)) {
    for (const rx of BYL) { const m = rx.exec(l); if (m) { const v = m[1].replace(/\*/g, '').trim(); return /^[A-Z]{3,}/.test(v) && v === v.toUpperCase() ? titleCase(v) : v; } }
  }
  return null;
}
function headerTitle(text, fallback) {
  const lines = text.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12);
  for (const l of lines) {
    const hl = /^\*{0,2}Headline:\*{0,2}\s*(.+)/i.exec(l);
    if (hl) return strip(hl[1]);
  }
  for (const l of lines) {
    if (RULE.test(l) || /^---+$/.test(l) || /^=+$/.test(l)) continue;
    if (/^\[TYPE:/i.test(l) || /^THE CYCLE PULSE\b/i.test(l) || /^(By |Byline|Desk:|Date:|\*\*Desk|\*\*By|\*\*Date)/i.test(l)) continue;
    if (BYL.slice(3).some(rx => rx.test(l))) continue;
    if (l.length < 40 && resolveByline(l) && !DESK_BYLINE.test(l)) continue; // a lone reporter name is a byline, not a headline
    const ban = l.split(/\s[—–-]\s/); // a "DESK — Reporter" banner is not a headline
    if (ban.length === 2 && (resolveByline(ban[0]) || resolveByline(ban[1])) && ban[1].length < 40) continue;
    if (/^#\s*BAY TRIBUNE SUPPLEMENTAL/i.test(l)) continue;
    if (l.length > 4) return strip(l).slice(0, 200);
  }
  return fallback;
}
// the dashboard's own skip list for non-article files mixed into archive/articles (server.js Source 4)
const NOT_ARTICLE = /jfif|\.pdf|archived-|autogen-|es5-|realism-audit|story-narrative-enhancement|integration-plan|conversion-anchor|give-each-journalist|mirror-package|begin-mirror/i;
const wordsOf = t => (t.match(/\S+/g) || []).length;
const cycleFromName = n => { const m = /(?:^|[_\s-])c(\d{2,3})(?=[_.\s-])|edition[_\s]*(\d{2,3})|(?:dispatch|supplemental|interview)[_\s]*(\d{2,3})/i.exec(n); return m ? parseInt(m[1] || m[2] || m[3], 10) : null; };

function build() {
  const byName = loadCitizens();
  const man = loadManifest();
  const rows = [], skipped = [];
  const copyInfo = p => man.get(p) || { driveIds: [], variantIds: [] };
  const push = (r, srcPath, kind, cycleHint) => {
    r.cycle = r.cycle != null ? r.cycle : (cycleHint != null ? cycleHint : null);
    const ci = copyInfo(srcPath);
    r.copies = [{ path: srcPath, kind, driveIds: ci.driveIds }];
    if (ci.variantIds.length) r.variantDriveIds = ci.variantIds;
    r.fp = sha(r.body).slice(0, 12) + sha(r.body.slice(0, 3000)).slice(0, 4);
    r.words = wordsOf(r.body);
    rows.push(r);
  };

  // editions/
  for (const f of fs.readdirSync(path.join(ROOT, 'editions')).filter(n => n.endsWith('.txt')).sort()) {
    const p = 'editions/' + f, text = read(p), cyc = cycleFromName(f);
    const full = /^cycle_pulse_(edition_\d+|c\d+)\.txt$/.test(f);
    const type = full ? 'edition-article' : /interview/.test(f) ? 'interview' : /dispatch/.test(f) ? 'dispatch' : 'supplemental';
    let pcs = splitPieces(text, cyc);
    if (!pcs.length) { // single-piece file with no byline line: the file is the piece
      pcs = [{ title: headerTitle(text, f), byline: headerByline(text), cycle: cyc, body: text.trim(), names: [] }];
    }
    for (const x of pcs) push({ ...x, type, published: true, source: 'edition' }, p, 'edition', cyc);
  }
  // archive/articles
  for (const f of fs.readdirSync(path.join(ROOT, 'archive/articles')).filter(n => n.endsWith('.txt')).sort()) {
    const p = 'archive/articles/' + f, text = read(p);
    if (text.trim().length < 100) continue;
    const m = /^c(\d+|XX)_([^_]+)_([^_]+)_(.+)\.txt$/.exec(f);
    const cyc = m && m[1] !== 'XX' ? parseInt(m[1], 10) : cycleFromName(f);
    const distinct = new Set((text.match(/^\*{0,2}By [A-Z][^|*\n]{1,60}? \| [^\n]{2,60}$/gm) || []).map(l => l.split('|')[0]));
    if (distinct.size >= 2) {
      for (const x of splitPieces(text, cyc)) push({ ...x, type: 'bundle-article', published: true, source: 'archive' }, p, 'archive', cyc);
      continue;
    }
    if (NOT_ARTICLE.test(f)) { skipped.push(p); continue; } // working docs that were filed with the articles
    const hb = resolveByline(headerByline(text));
    const fb = m ? resolveByline(titleCase(m[4].replace(/-\d+$/, '').replace(/-/g, ' ')) ) || resolveByline(titleCase(m[3].replace(/-/g, ' '))) : null;
    const desk = m ? titleCase(m[2].replace(/-/g, ' ')) : null;
    const entry = man.get(p);
    const r = {
      title: headerTitle(text, f.replace(/\.txt$/, '')), byline: hb || fb, bylineSource: hb ? 'header' : fb ? 'filename' : null,
      bylineDesk: null, desk, cycle: cyc, body: text.trim(), names: [], source: 'archive', published: true,
      type: m && /^podcast$/.test(m[2]) ? 'podcast' : 'article',
    };
    if (cyc == null) r.era = 'pre-cycle';
    push(r, p, 'archive', cyc);
  }
  // profiles and records
  for (const f of fs.readdirSync(path.join(ROOT, 'archive/non-articles/profiles')).filter(n => n.endsWith('.txt')).sort()) {
    const p = 'archive/non-articles/profiles/' + f, text = read(p);
    if (text.trim().length < 100) continue;
    push({ title: headerTitle(text, f.replace(/\.txt$/, '').replace(/_/g, ' ')), byline: resolveByline(headerByline(text)), cycle: cycleFromName(f), body: text.trim(), names: [], source: 'profile', type: 'profile', published: true, era: cycleFromName(f) == null ? 'pre-cycle' : undefined }, p, 'profile');
  }
  // archive/editions bundles (supplemental and old editions); PDFs and mirrors of already-split editions are skipped by type
  for (const f of fs.readdirSync(path.join(ROOT, 'archive/editions')).filter(n => n.endsWith('.txt')).sort()) {
    const p = 'archive/editions/' + f, text = read(p);
    const cyc = (/CYCLE\s+(\d{1,3})\b/i.exec(f) || /EDITION\s+(\d{1,3})\b/i.exec(f) || [])[1];
    let pcs = splitPieces(text, cyc ? parseInt(cyc, 10) : null);
    if (!pcs.length && text.trim().length >= 100) pcs = [{ title: headerTitle(text, f.replace(/\.txt$/, '')), byline: resolveByline(headerByline(text)), cycle: cyc ? parseInt(cyc, 10) : null, body: text.trim(), names: [] }];
    for (const x of pcs) push({ ...x, type: 'bundle-article', published: true, source: 'archive-edition' }, p, 'archive-edition');
  }
  // shelf-only pieces: Drive articles and profiles that sit on the data / unknown shelves (classified in the manifest)
  for (const p of man.shelfPieces || []) {
    const text = read(p);
    if (text.trim().length < 100) continue;
    push({ title: headerTitle(text, path.basename(p, '.txt').replace(/_/g, ' ')), byline: resolveByline(headerByline(text)), cycle: cycleFromName(path.basename(p)), body: text.trim(), names: [], source: 'shelf-only', type: 'article', published: true }, p, 'shelf-only');
  }

  // staged sidecars: unpublished unless their stem is in the cycle's published set
  const published = {};
  const pubSet = c => published[c] || (published[c] = (() => {
    for (const n of ['edition_published_c' + c + '.json', 'edition_curation_c' + c + '.json']) {
      const p = path.join(ROOT, 'output', n);
      if (fs.existsSync(p)) { const j = JSON.parse(fs.readFileSync(p, 'utf8')); return new Set(j.selected || []); }
    }
    return null;
  })());
  const staged = [];
  if (fs.existsSync(STAGED)) for (const f of fs.readdirSync(STAGED).filter(n => n.endsWith('.staged.json')).sort()) {
    const s = JSON.parse(fs.readFileSync(path.join(STAGED, f), 'utf8'));
    const stem = f.replace(/\.staged\.json$/, '');
    const mdRel = 'output/cron-compare/staged/' + stem + '.staged.md';
    if (!fs.existsSync(path.join(ROOT, mdRel))) continue;
    const md = read(mdRel);
    let names = [];
    try { names = (JSON.parse(s.intake).names || []).map(x => x.name).filter(Boolean); } catch (e) { /* intake absent or not JSON */ }
    const ps = pubSet(s.cycle);
    staged.push({ stem, mdRel, s, md, names, isPublished: !!(ps && ps.has(stem)), known: !!ps });
  }

  // fold copies by fingerprint (editions first, then archive, profile, archive-edition)
  const rank = { edition: 0, archive: 1, profile: 2, 'archive-edition': 3, 'shelf-only': 4 };
  rows.sort((a, b) => rank[a.source] - rank[b.source]);
  const byFp = new Map(), out = [];
  for (const r of rows) {
    const hit = byFp.get(r.fp);
    if (hit) { hit.copies.push(...r.copies); if (r.variantDriveIds) hit.variantDriveIds = [...(hit.variantDriveIds || []), ...r.variantDriveIds]; if (hit.byline == null && r.byline) { hit.byline = r.byline; hit.bylineSource = r.bylineSource || 'copy'; } if (hit.cycle == null && r.cycle != null) hit.cycle = r.cycle; continue; }
    byFp.set(r.fp, r); out.push(r);
  }
  // staged: attach a selected draft to its printed row; everything else is its own row, flagged
  const keyOf = r => (r.byline || '').toLowerCase() + '|' + r.cycle;
  const byKey = new Map();
  for (const r of out) { const k = keyOf(r); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(r); }
  let attached = 0;
  for (const st of staged) {
    const t0 = headerTitle(st.md, st.stem), cycle = parseInt(st.s.cycle, 10);
    const title = /\bDesk\b.*\bCycle \d+\s*$/i.test(t0) ? null : t0; // a desk banner is not a headline
    const cand = (byKey.get((st.s.byline || '').toLowerCase() + '|' + cycle) || []).find(r => (r.title && norm(r.title) === norm(title)) || norm(r.body).startsWith(norm(st.md.split('\n').filter(l => l.trim() && !/^#/.test(l))[0] || '~').slice(0, 80)));
    if (st.isPublished && cand) { cand.copies.push({ path: st.mdRel, kind: 'staged-draft', driveIds: [] }); attached++; continue; }
    const body = st.md.replace(/^\s*#.*\n/, '').trim();
    out.push({
      title, lede: title ? undefined : body.replace(/\s+/g, ' ').slice(0, 110), byline: st.s.byline || null, bylineSource: 'sidecar', bylineDesk: null, desk: titleCase(st.s.desk || ''), cycle, body, names: st.names,
      type: 'article', published: st.isPublished, source: 'staged', stage: st.isPublished ? 'selected-not-matched-to-edition' : (st.known ? 'staged-not-selected' : 'staged-cycle-open'),
      copies: [{ path: st.mdRel, kind: 'staged', driveIds: [] }], fp: sha(body).slice(0, 16), words: wordsOf(body),
    });
  }

  // finish: desk, POPID by name, citizens by name scan
  for (const r of out) {
    r.desk = r.bylineDesk ? r.bylineDesk.replace(/^Bay Tribune\s*/i, '').trim() || r.bylineDesk : (r.desk || (r.byline && REPORTER_DESK[r.byline.toLowerCase()]) || null);
    r.bylineName = r.byline ? (ALIAS[r.byline.toLowerCase()] || r.byline) : null;
    r.bylinePopid = popidFor(r.byline, byName);
    const seen = new Map();
    for (const c of scanCitizens(r.body + '\n' + (r.names || []).join('\n'), byName)) seen.set(c.name, c);
    r.citizens = [...seen.values()];
    r.id = r.fp;
    delete r.body; delete r.names; delete r.bylineDesk; delete r.fp;
    if (r.lede === undefined) delete r.lede;
    if (r.era === undefined) delete r.era;
    if (r.cycle == null && !r.era) r.era = 'pre-cycle';
  }
  out.sort((a, b) => ((a.cycle == null ? -1 : a.cycle) - (b.cycle == null ? -1 : b.cycle)) || a.copies[0].path.localeCompare(b.copies[0].path) || String(a.title || a.lede).localeCompare(String(b.title || b.lede)));
  return { rows: out, attached, staged: staged.length, skipped };
}

function loadIndex() { return fs.readFileSync(INDEX, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); }
function searchIndex(rows, { author, citizen, q, cycle, desk } = {}) {
  const lc = s => String(s || '').toLowerCase();
  return rows.filter(r =>
    (!author || lc(r.byline).includes(lc(author)) || lc(r.bylineName).includes(lc(author))) &&
    (!citizen || r.citizens.some(c => lc(c.name).includes(lc(citizen)))) &&
    (!q || lc(r.title || r.lede).includes(lc(q))) &&
    (cycle == null || r.cycle === Number(cycle)) &&
    (!desk || lc(r.desk).includes(lc(desk))));
}

if (require.main === module) {
  const { rows, attached, staged, skipped } = build();
  const count = (f) => rows.filter(f).length;
  console.log('rows: ' + rows.length + ' | non-article working docs skipped: ' + skipped.length + ' | staged sidecars read: ' + staged + ', drafts attached to a printed row: ' + attached);
  const bySrc = {}; for (const r of rows) bySrc[r.source] = (bySrc[r.source] || 0) + 1;
  console.log('by source: ' + JSON.stringify(bySrc));
  console.log('byline ' + count(r => r.byline) + ' | popid ' + count(r => r.bylinePopid) + ' | cycle ' + count(r => r.cycle != null) + ' | citizens>0 ' + count(r => r.citizens.length) + ' | published ' + count(r => r.published) + ' | multi-copy ' + count(r => r.copies.length > 1));
  const jax = searchIndex(rows, { author: 'Jax Caldera' }), varek = searchIndex(rows, { citizen: 'Elias Varek' }), hs = searchIndex(rows, { q: 'Heat Shield' });
  console.log('untitled ' + count(r => !r.title) + ' | Jax Caldera: ' + jax.length + ' (' + jax.map(r => 'C' + r.cycle).join(' ') + ') | Elias Varek: ' + varek.length + ' | Heat Shield title: ' + hs.length + (hs[0] ? ' C' + hs[0].cycle + ' ' + hs[0].copies[0].path : ''));
  if (process.argv.includes('--write')) {
    fs.writeFileSync(INDEX, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
    console.log('wrote ' + path.relative(ROOT, INDEX));
  } else console.log('dry run — nothing written');
}

module.exports = { build, loadIndex, searchIndex, splitPieces };
