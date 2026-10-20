#!/usr/bin/env node
/**
 * syncDriveArticles.js — pipeline.84 Task 2: land the Drive-only pieces and keep the Drive → disk manifest.
 *
 * Drive is the front door for published pieces (builder, 2026-10-19). This walks the in-scope Drive folders
 * (read-only, drive.readonly, same walk as sweepCanonIngest.js), matches every text file against the pieces
 * already on disk by body text, and writes archive/drive-manifest.json: Drive id -> disk path -> fingerprint.
 * A piece with no home on disk is landed ONLY when OVERRIDES names it (shelf, filename, cycle, desk, byline);
 * an unnamed one is listed as `missing` and left alone, because a landed name is a deliberate call, not a guess.
 *
 * Cycle is never invented: a pre-cycle piece lands as cXX with its era in the manifest row. Files are written
 * as fetched (line endings normalised, nothing edited) and never overwrite an existing file.
 * Supermemory is not touched; the Saturday sweep ingests what it sweeps.
 *
 * Usage:
 *   node scripts/syncDriveArticles.js            # dry run: counts, would-land list, missing list
 *   node scripts/syncDriveArticles.js --apply    # write landed files + archive/drive-manifest.json
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { google } = require('googleapis');
const { listDriveFiles, fetchText } = require('./sweepCanonIngest');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'archive/drive-manifest.json');
const APPLY = process.argv.includes('--apply');

const DRIVE_ROOTS = [
  { id: '1NEIimxouKHwrVF0Wuhz7rjwX94_-FvNZ', label: '1_The_Bay_Trbune' },
  { id: '1WPzd_ggOxsV2mm1FTtdE0UozgKBvtR9E', label: 'God_World_Citizens' },
];
// Task 1 scope: published pieces only. Out: Mara's audits, exports, tool folders (Gemini, Kimi, NotebookLM, Crons_Media).
const IN_SCOPE = new Set(['1_The_Cycle_Pulse', '2_The_Supplementals', '3_The_Dispatch', '4_The_Interviews_Pressers',
  '4a_Mike_Paulson_Pressers', '5_The_Player_Profiles', '6_The_Citizen_Profiles', '7_The_Pod_Casts', '8_Chicago_Supplementals',
  'Sports_Desk', 'Oakland_Sports_Desk', 'Bay_Tribune_Oakland']);

const AR = 'archive/articles/', PR = 'archive/non-articles/profiles/', AE = 'archive/editions/', AS = 'archive/non-articles/assignments/';
const BTSD = 'bay-tribune-sports-desk';
// Named landings (rb, 2026-10-20). Keys are Drive file ids. action: land | variant | skip.
const OVERRIDES = {
  // Jax Caldera, The Heat Shield: standalone article, C100 (builder, 2026-10-20). Disk copy = the text the Edition 100 ingest carries (Opinion / NBA).
  '1aUIa7kfecj0pE_Cs4W43w7t3XHF0vAbG': { action: 'land', dest: AR + 'c100_opinion_heat-shield_jax-caldera.txt', cycle: 100, desk: 'Opinion', byline: 'Jax Caldera', published: 'Edition 100 ingest (search_canon, desk Opinion, "expansion NBA franchise")' },
  '1PKyP93Qbc11L8b35jiNduWvIaLPvJj80': { action: 'variant', variantOf: '1aUIa7kfecj0pE_Cs4W43w7t3XHF0vAbG', note: 'archive copy: desk Civic, "expansion WNBA franchise"; not the printed text' },
  '1qxXBX6-TAPWRHDtacjs3q2BkXbIgHZie': { action: 'land', dest: AR + 'c100_sports_end-of-an-anchor-richards-to-mets_' + BTSD + '.txt', cycle: 100, desk: 'Sports', byline: 'Bay Tribune Sports Desk', published: 'Edition 100 ingest (search_canon, headline "End of an Anchor")' },
  '1bUqZv5BYxJaowQn2o7CED8W-94hiE8hp': { action: 'variant', variantOf: '1qxXBX6-TAPWRHDtacjs3q2BkXbIgHZie', note: 'alternate headline "The Coldest Calculation"; not in the Edition 100 ingest' },
  '1hlUEgpep--2ynApyLRx3AE3c4Cao6Tsc': { action: 'variant', variantOf: '1qxXBX6-TAPWRHDtacjs3q2BkXbIgHZie', note: 'alternate headline "The Coldest Calculation"; not in the Edition 100 ingest' },
  '1FbPZE8XBa1GQIhWfNF1MpgqFdFhXlH1F': { action: 'land', dest: AR + 'c99_sports_oakland-sacrifices-culture-for-firepower-draymond-green-traded_' + BTSD + '.txt', cycle: 99, desk: 'Sports', byline: 'Bay Tribune Sports Desk', note: 'Drive name says Jerami Grant; the text is the Draymond Green trade' },
  '1BZ4S2lO1Pclx4O0sqqf4Rn0yXXJ_xA7M': { action: 'land', dest: AR + 'c99_sports_oaks-inaugural-offseason-the-villain-blueprint_' + BTSD + '.txt', cycle: 99, desk: 'Sports', byline: 'Bay Tribune Sports Desk' },
  '1mrx51y9l5DLUP13wixUAHJJ8SbsCOETE': { action: 'land', dest: AR + 'cXX_sports_the-geometry-of-grit-oaks-draft-board_anthony.txt', cycle: null, era: 'Post-Expansion Draft', desk: 'Sports Analytics', byline: 'Anthony' },
  '1ZHvRAH1iS8hylhv_V6lwPumwph_B_r3u': { action: 'land', dest: AR + 'cXX_culture_the-shift-the-docks-and-the-deep_mason-ortega.txt', cycle: null, era: 'post-holiday rush, no cycle in the text', desk: 'Culture', byline: 'Mason Ortega' },
  '1Vr4QXCcgfLT2fwG_fjkM4QMefQcCGghA': { action: 'land', dest: AR + 'cXX_sports_the-velocity-premium-why-paulson-traded-the-farm-for-coles_anthony.txt', cycle: null, era: 'Pre-Season 2041', desk: 'Sports Analytics', byline: 'Anthony' },
  '1XH3W6lg3VLaNiwbVYqiJOtW6lIDgZwur': { action: 'land', dest: AR + 'c89_culture_the-dockworkers-son-mayor-avery-santana_maria-keen.txt', cycle: 89, desk: 'Culture', byline: 'Maria Keen' },
  '13m3LcZ4LxDqFdewl9kD9_waebxW48Mp9': { action: 'land', dest: AR + 'c89_culture_the-rhythm-and-the-tide-benji-dillon_maria-keen.txt', cycle: 89, desk: 'Culture', byline: 'Maria Keen' },
  '1QkE29G7T2pPyy36_w_GciuRY6NuQdSmS': { action: 'land', dest: AR + 'c89_culture_the-seam-and-the-sermon-isley-kelley_maria-keen.txt', cycle: 89, desk: 'Culture', byline: 'Maria Keen' },
  '1mC_jc3VI0kr01lYz-69c_QGBZkJHqPkb': { action: 'land', dest: AR + 'c89_culture_the-outlaw-and-the-badge-darrin-davis_maria-keen.txt', cycle: 89, desk: 'Culture', byline: 'Maria Keen' },
  '1kH4HzFRblIfoiQJnCkOPB0BwMEKbDmt1': { action: 'land', dest: AR + 'c92_civic_mayor-names-cycle-95-as-oaris-decision-cycle_carmen-delaine.txt', cycle: 92, desk: 'Civic', byline: 'Carmen Delaine', note: 'Drive name c92_interview_santana; the text is a Civic Ledger piece. The newer of two same-name copies; not found in the canon ingest' },
  '1heIlDEWqmMtXd0vsuaVFIZn1ttMl2RHY': { action: 'variant', variantOf: '1kH4HzFRblIfoiQJnCkOPB0BwMEKbDmt1', note: 'same name, same folder, saved 11 hours earlier; differs in the Names Index line only (Laila Cortez annotated). Neither copy is in the canon ingest' },
  '1pZLe426Cl89277KQ9I8bVRN9RNJGdXu2': { action: 'land', dest: AR + 'c90_podcast_c90-transcript_unknown.txt', cycle: 90, desk: 'Podcast', byline: null },
  // multi-piece supplementals: bundles, kept whole on the old editions shelf
  '1iL6KI779sbMWyzINVY42vR3MXB5g23g8': { action: 'land', dest: AE + 'THE CYCLE PULSE _ SUPPLEMENTAL EDITION CYCLE 76 _ WEST OAKLAND STABILIZATION FUND THE VOTE APPROACHES.txt', cycle: 76, desk: 'Supplemental', byline: null, note: 'bundle: Carmen Delaine, Farrah Del Rio, Luis Navarro' },
  '1G0U4WJGHGFUG-91qG3zqFkRkAXoS2QPr': { action: 'land', dest: AE + 'THE CYCLE PULSE _ SUPPLEMENTAL EDITION 86 _ PAULSON MEDIA AVAILABILITY.txt', cycle: 86, desk: 'Supplemental', byline: null, note: 'bundle: Selena Grant, Talia Finch, Anthony' },
  // profiles and records
  '1cBzxA_9m8_gwPP2K85bwInu2AMk9qALo': { action: 'land', dest: PR + 'POP-00789_Elias_Varek_profile_c102.txt', cycle: 102, desk: 'Profile', byline: null },
  '17BmPnFc_5uxcT3nQ7T-2x_ewUVvrLv6O': { action: 'land', dest: PR + 'POPID_00004_Saint_Lucia_HumanForm_Record_2040.txt', cycle: null, era: 'Simulation Year 2040', desk: 'Profile', byline: null },
  '1DK5WXvkUVOk6tYJFK2vdZOj6u8bwfCBF': { action: 'land', dest: PR + 'POP_00002_AMARA_OLSEN_2040_PHOTO_RECORD.txt', cycle: null, era: 'Simulation Year 2040', desk: 'Profile', byline: null },
  '1c_5xET8Zk5ORYho8q9QuKlVaPkKutAr7': { action: 'land', dest: PR + 'Richmond_Companion_Image_Manifest_v1.0_AmaraOlsen.txt', cycle: null, desk: 'Profile', byline: null },
  '1aKWwyM6u_yJFn8hqXP6qU-XJRtibL-Ab': { action: 'land', dest: PR + 'Hal_Richmond_The_Quiet_Center_Where_Confidence_Begins_Danny_Horn.txt', cycle: null, desk: 'Profile', byline: 'Hal Richmond' },
  '1y8ClTzSkRiZaB9Z7p2_4ZIG6FEB55WkS': { action: 'land', dest: AS + 'Oakland_Chicago_Continuity_Briefing_C88.txt', cycle: 88, desk: 'Briefing', byline: null, note: 'status briefing in the podcast folder; not a printed piece' },
  // not landed
  '1BvnN4RD0Ck-C9m7SP5ensi8QRBWyGZUJ': { action: 'skip', status: 'draft', note: 'edition 87 v1: a draft of editions/cycle_pulse_edition_87.txt, which is on disk' },
  '1idzZgf6HkbaV-Ah22rqNOr75Kf9KS0DRQsSiHJ1hlXM': { action: 'skip', status: 'not-article', note: 'Sports_Desk manifest: an index of Drive files' },
  '176k7hRkL2gZFrcYjaFKMAD2g4EWZruZDhPkujD6_zQ8': { action: 'skip', status: 'not-article', note: 'Hal Richmond index README: an index of Drive files' },
};

const norm = t => t.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
const sha = t => crypto.createHash('sha1').update(norm(t)).digest('hex').slice(0, 16);
const clean = t => String(t).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

// shelf rank for choosing the primary disk home: lower is better
function shelfRank(p) {
  if (p.startsWith('archive/articles/')) return 0;
  if (p.startsWith('editions/')) return 1;
  if (p.startsWith('archive/non-articles/profiles/')) return 2;
  if (p.startsWith('archive/editions/')) return 3;
  return 4;
}
const PRIMARY = p => shelfRank(p) <= 3;

// what a shelf-only file is: piece (an article or profile that sits on the wrong shelf), data, mirror, index, template, assignment
function shelfClass(p) {
  if (p.startsWith('archive/non-articles/mirrors/')) return 'mirror';
  if (p.startsWith('archive/non-articles/indexes/')) return 'index';
  if (p.startsWith('archive/non-articles/templates/')) return 'template';
  if (p.startsWith('archive/non-articles/assignments/')) return 'assignment';
  if (p.startsWith('archive/non-articles/data/')) return /STATCAST PLAYER CARD|^Savant_/i.test(path.basename(p)) ? 'data' : 'piece';
  return 'piece';
}

function diskIndex() {
  const out = [];
  const walk = d => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = d + '/' + e.name;
      if (e.isDirectory()) walk(rel);
      else if (/\.(txt|md)$/i.test(e.name)) out.push({ rel, norm: norm(fs.readFileSync(path.join(ROOT, rel), 'utf8')) });
    }
  };
  for (const d of ['editions', 'archive/articles', 'archive/editions', 'archive/non-articles']) walk(d);
  return out;
}

function findHomes(text, disk) {
  const t = norm(text);
  const probes = t.length >= 400 ? [0.25, 0.5, 0.75].map(k => t.slice(Math.floor(t.length * k), Math.floor(t.length * k) + 160))
    : t.length >= 120 ? [t.slice(Math.floor(t.length / 3), Math.floor(t.length / 3) + 120)] : [];
  if (!probes.length) return { individual: [], bundle: [] };
  const need = Math.max(1, probes.length - 1);
  const individual = [], bundle = [];
  for (const f of disk) {
    if (probes.filter(p => f.norm.includes(p)).length >= need) (f.norm.length / Math.max(1, t.length) <= 2.5 ? individual : bundle).push(f.rel);
  }
  const rank = (a, b) => shelfRank(a) - shelfRank(b) || a.localeCompare(b);
  return { individual: individual.sort(rank), bundle: bundle.sort(rank) };
}

function lineDiff(a, b) {
  const la = clean(a).split('\n').map(l => l.trim()).filter(Boolean), lb = clean(b).split('\n').map(l => l.trim()).filter(Boolean);
  const sa = new Set(la), sb = new Set(lb);
  return { onlyHere: lb.filter(l => !sa.has(l)).slice(0, 6).map(l => l.slice(0, 160)), onlyLanded: la.filter(l => !sb.has(l)).slice(0, 6).map(l => l.slice(0, 160)) };
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

async function main() {
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
  const drive = google.drive({ version: 'v3', auth });
  let all = [];
  for (const r of DRIVE_ROOTS) all.push(...await listDriveFiles(drive, r.id, r.label));
  const files = all.filter(f => IN_SCOPE.has(f.path.split('/')[1]));
  console.log('drive text files: ' + all.length + ' | in scope: ' + files.length);

  const old = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).files : {};
  let disk = null;
  const getDisk = () => disk || (disk = diskIndex());
  const texts = {}; // id -> cleaned text, only for rows that needed work this run

  const rows = await pool(files, 6, async f => {
    const prev = old[f.id];
    const ov = OVERRIDES[f.id];
    const there = x => !x || fs.existsSync(path.join(ROOT, x));
    const fresh = prev && prev.modified === f.modifiedTime && there(prev.disk) && (prev.alsoOn || []).every(there) && (!ov || ov.action !== 'land' || there(ov.dest));
    const base = { name: f.name, drivePath: f.path, modified: f.modifiedTime };
    if (fresh) return { id: f.id, row: { ...prev, ...base } };
    const text = clean(await fetchText(drive, f));
    texts[f.id] = text;
    const row = { ...base, len: text.length, fp: sha(text) };
    if (ov && ov.action === 'skip') { row.status = ov.status; row.note = ov.note; return { id: f.id, row }; }
    if (ov && ov.action === 'variant') { row.status = 'variant'; row.variantOf = ov.variantOf; row.note = ov.note; return { id: f.id, row }; }
    const h = findHomes(text, getDisk());
    if (ov && ov.action === 'land' && !h.individual.length) {
      row.status = 'landed'; row.disk = ov.dest; row.landPending = true;
      Object.assign(row, { cycle: ov.cycle, desk: ov.desk, byline: ov.byline });
      if (ov.era) row.era = ov.era; if (ov.note) row.note = ov.note; if (ov.published) row.published = ov.published;
      return { id: f.id, row };
    }
    if (ov && ov.action === 'land') { // already on disk (re-run after landing): the named path must be the one found
      row.status = 'landed'; row.disk = h.individual.includes(ov.dest) ? ov.dest : h.individual[0];
      Object.assign(row, { cycle: ov.cycle, desk: ov.desk, byline: ov.byline });
      if (ov.era) row.era = ov.era; if (ov.note) row.note = ov.note; if (ov.published) row.published = ov.published;
      return { id: f.id, row };
    }
    if (h.individual.length) {
      row.disk = h.individual[0];
      if (h.individual.length > 1) row.alsoOn = h.individual.slice(1);
      row.status = PRIMARY(h.individual[0]) ? 'on-disk' : 'shelf-only';
    } else if (h.bundle.length) { row.status = 'in-bundle'; row.alsoOn = h.bundle; }
    else row.status = 'missing';
    return { id: f.id, row };
  });

  const manifest = {};
  for (const { id, row } of rows) manifest[id] = row;
  // folded copies: same body fingerprint
  const byFp = {};
  for (const [id, r] of Object.entries(manifest)) (byFp[r.fp] = byFp[r.fp] || []).push(id);
  for (const ids of Object.values(byFp)) if (ids.length > 1) for (const id of ids) manifest[id].sameAs = ids.filter(x => x !== id);
  // shelf-only rows: say what the file is, so the index reads the pieces and leaves the rest
  for (const r of Object.values(manifest)) if (r.status === 'shelf-only') r.class = shelfClass(r.disk);
  // a copy with no home of its own takes its twin's: same body, different Drive file
  for (const [id, r] of Object.entries(manifest)) {
    if (r.status !== 'missing' || !r.sameAs) continue;
    const twin = r.sameAs.map(x => manifest[x]).find(t => t.status !== 'missing');
    if (!twin) continue;
    const twinId = r.sameAs.find(x => manifest[x] === twin);
    if (twin.status === 'variant') { r.status = 'variant'; r.variantOf = twin.variantOf; r.note = 'copy of ' + twinId + ': ' + (twin.note || ''); }
    else if (twin.status === 'draft' || twin.status === 'not-article') { r.status = twin.status; r.note = 'copy of ' + twinId; }
    else { r.status = 'copy'; r.copyOf = twinId; r.disk = twin.disk; }
  }
  // variants: diff against the landed text
  for (const [id, r] of Object.entries(manifest)) {
    if (r.status !== 'variant' || r.diff) continue;
    const landedText = texts[r.variantOf] || (manifest[r.variantOf] && manifest[r.variantOf].disk && fs.existsSync(path.join(ROOT, manifest[r.variantOf].disk)) ? fs.readFileSync(path.join(ROOT, manifest[r.variantOf].disk), 'utf8') : null);
    if (landedText && texts[id]) r.diff = lineDiff(landedText, texts[id]);
  }

  const count = {};
  for (const r of Object.values(manifest)) count[r.status] = (count[r.status] || 0) + 1;
  console.log('status: ' + JSON.stringify(count));
  const pending = Object.entries(manifest).filter(([, r]) => r.landPending);
  for (const [id, r] of pending) console.log((APPLY ? '  land  ' : '  would land  ') + r.disk + '  (' + id + ')');
  const missing = Object.entries(manifest).filter(([, r]) => r.status === 'missing');
  for (const [id, r] of missing) console.log('  MISSING (no override, not landed)  ' + r.drivePath + ' / ' + r.name + '  (' + id + ')');

  if (!APPLY) { console.log('dry run — nothing written'); return; }
  for (const [id, r] of pending) {
    const dest = path.join(ROOT, r.disk);
    const body = texts[id].replace(/\s+$/, '') + '\n';
    if (fs.existsSync(dest)) {
      if (fs.readFileSync(dest, 'utf8') !== body) throw new Error('refusing to overwrite a different file: ' + r.disk);
    } else fs.writeFileSync(dest, body);
    delete r.landPending;
  }
  const sorted = Object.keys(manifest).sort((a, b) => (manifest[a].drivePath + manifest[a].name).localeCompare(manifest[b].drivePath + manifest[b].name));
  const head = { version: 1, builtBy: 'scripts/syncDriveArticles.js', note: 'Drive file id -> disk path -> fingerprint. status: on-disk | shelf-only (class: piece | data | mirror | index | template | assignment) | landed | copy | variant | draft | not-article | in-bundle | missing. Supermemory is not written by this file.', counts: count };
  const lines = sorted.map(id => '  ' + JSON.stringify(id) + ': ' + JSON.stringify(manifest[id]));
  fs.writeFileSync(MANIFEST, '{\n' + Object.entries(head).map(([k, v]) => ' ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',').join('\n') + '\n "files": {\n' + lines.join(',\n') + '\n }\n}\n');
  console.log('wrote ' + pending.length + ' file(s) and ' + path.relative(ROOT, MANIFEST));
}

if (require.main === module) main().catch(e => { console.error('syncDriveArticles: ' + e.message); process.exit(1); });
module.exports = { OVERRIDES, norm, sha, findHomes };
