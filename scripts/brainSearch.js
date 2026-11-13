#!/usr/bin/env node
/**
 * brainSearch.js — one query, both memories (governance.51 T7).
 *
 *   node scripts/brainSearch.js "<query>" [--limit 8] [--days 0] [--json] [--no-brain] [--no-mem] [--no-rules] [--no-world] [--no-open]
 *   node scripts/brainSearch.js --sync      # mirror rule files into sl-rules
 *
 * Sources, each labelled on every hit:
 *   mem   — claude-mem observations (FTS5 over title/subtitle/narrative/text/facts/concepts,
 *           project=GodWorld, bm25 rank). Read direct from ~/.claude-mem/claude-mem.db with the
 *           sqlite3 CLI — no worker, no MCP. Details: get_observations([ids]).
 *   brain — the shared all-lane Supermemory container `sl-godworld` via `npx supermemory search`.
 *   rule  — Supermemory `sl-rules`: a MIRROR of the current rules (memory/*.md, SIM_DOCTRINE
 *           sections, docs/adr/*.md), one doc per file/section keyed by path. Kept current by
 *           `brainSearch.js --sync` (nightly cron): changed files upsert in place, deleted files
 *           are removed. sl-godworld is the append-only log; sl-rules is always the live text.
 *
 *   world — the live sheet, for a query that names someone or something (a capitalised word):
 *           Oakland_Sports_Feed rows (newest Cycle first), As_Roster and Simulation_Ledger
 *           identity cells. Current world truth, printed above the memory hits. `--no-world` skips.
 *   open  — docs/engine/ROLLOUT_PLAN.md rows carrying most of the query's words.
 *
 * Output: world rows first, then one merged list, newest first, with source, date, and a pointer per hit.
 * Rule this serves: search the brain before asserting what a prior session decided.
 */
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const DB = path.join(os.homedir(), '.claude-mem', 'claude-mem.db');
const PROJECT = 'GodWorld';
const BRAIN_TAG = 'sl-godworld';
const RULES_TAG = 'sl-rules';

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i > -1; };
const opt = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] ? argv[i + 1] : d; };

if (flag('--sync')) { syncRules(); process.exit(process.exitCode || 0); }

// --sync: mirror the rule files into sl-rules. A manifest of content hashes keeps it
// incremental — unchanged docs are skipped, changed ones upsert on the same customId,
// docs whose source is gone are deleted.
function syncRules() {
  const fs = require('fs');
  const crypto = require('crypto');
  const ROOT = path.resolve(__dirname, '..');
  const MEMORY_DIR = path.join(os.homedir(), '.claude', 'projects', '-root-GodWorld', 'memory');
  const MANIFEST = path.join(os.homedir(), '.cache', 'godworld', 'sl-rules-manifest.json');
  const sha = (t) => crypto.createHash('sha1').update(t).digest('hex');
  const docs = [];
  for (const f of fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && f !== 'MEMORY.md').sort()) {
    docs.push({ key: `memory/${f}`, title: f.replace(/\.md$/, ''), body: fs.readFileSync(path.join(MEMORY_DIR, f), 'utf8') });
  }
  const doctrine = fs.readFileSync(path.join(ROOT, 'docs', 'SIM_DOCTRINE.md'), 'utf8');
  for (const sec of doctrine.split(/^(?=## )/m).filter(x => x.startsWith('## '))) {
    const head = sec.split('\n')[0].replace(/^## /, '').trim();
    docs.push({ key: `docs/SIM_DOCTRINE.md#${head}`, title: `SIM_DOCTRINE — ${head}`, body: sec });
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'docs', 'adr')).filter(f => f.endsWith('.md')).sort()) {
    docs.push({ key: `docs/adr/${f}`, title: `ADR ${f.replace(/\.md$/, '')}`, body: fs.readFileSync(path.join(ROOT, 'docs', 'adr', f), 'utf8') });
  }
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) { /* first run */ }
  const next = {};
  let added = 0, skipped = 0, removed = 0, failed = 0;
  for (const d of docs) {
    const content = `[rule · ${d.key}] ${d.title}\n\n${d.body.trim()}\n`;
    const hash = sha(content);
    const prev = manifest[d.key];
    if (prev && prev.hash === hash) { next[d.key] = prev; skipped++; continue; }
    const customId = 'rules-' + sha(d.key).slice(0, 24);
    try {
      // supermemory CLI 5.x: `--namespace` (was `--tag`); `--title` is gone — the title is the content's first line.
      const out = execSync(`npx supermemory add --stdin --namespace ${RULES_TAG} --id ${customId} --metadata ${JSON.stringify(JSON.stringify({ source: d.key, title: d.title }))} --json`,
        { input: content, stdio: ['pipe', 'pipe', 'pipe'], timeout: 90000 }).toString();
      const res = JSON.parse(out.slice(out.indexOf('{')));
      next[d.key] = { hash, customId, id: res.id };
      added++;
    } catch (e) {
      if (prev) next[d.key] = prev;  // keep the old entry so the next run retries
      console.error(`sync failed ${d.key}: ${e.message.split('\n')[0]}`);
      failed++;
    }
  }
  for (const [key, entry] of Object.entries(manifest)) {
    if (next[key]) continue;
    try {
      execSync(`npx supermemory docs delete ${entry.id} --namespace ${RULES_TAG} --yes`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
      removed++;
    } catch (e) {
      next[key] = entry;  // retry the delete next run
      console.error(`delete failed ${key}: ${e.message.split('\n')[0]}`);
      failed++;
    }
  }
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(next, null, 2));
  console.log(`sl-rules sync: ${docs.length} docs — ${added} upserted, ${skipped} unchanged, ${removed} removed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
const query = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--limit', '--days'].includes(argv[i - 1]))).join(' ').trim();
if (!query) { console.error('usage: brainSearch.js "<query>" [--limit N] [--days D] [--json] [--no-brain] [--no-mem] [--no-rules] | --sync'); process.exit(2); }
const LIMIT = parseInt(opt('--limit', '8'), 10);
const DAYS = parseInt(opt('--days', '0'), 10);
const asJson = flag('--json');

function ftsQuery(q) {
  // Quote each term so punctuation/operators in free text can't break FTS5 syntax; implicit AND.
  return q.split(/\s+/).filter(Boolean).map(t => '"' + t.replace(/"/g, '') + '"').join(' ');
}

function searchMem() {
  const since = DAYS > 0 ? `AND o.created_at_epoch >= ${Math.floor(Date.now() / 1000) - DAYS * 86400}` : '';
  const run = (fts) => {
  const match = "'" + fts.replace(/'/g, "''") + "'";
  const sql = `SELECT o.id, o.type, o.title, o.subtitle, o.created_at, o.agent_type
               FROM observations_fts f JOIN observations o ON o.id = f.rowid
               WHERE observations_fts MATCH ${match}
                 AND o.project = '${PROJECT}' ${since}
               ORDER BY rank LIMIT ${LIMIT};`;
    const out = execSync(`sqlite3 -json ${JSON.stringify(DB)}`, { input: sql, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    return out ? JSON.parse(out).map(r => ({
      source: 'mem', date: (r.created_at || '').slice(0, 10), id: r.id, kind: r.type,
      text: r.title + (r.subtitle ? ' — ' + r.subtitle : ''),
      pointer: `get_observations([${r.id}])`,
    })) : [];
  };
  try {
    // Every word first; a whole question rarely matches that way, so fall back to its key words, any of them.
    const all = run(ftsQuery(query));
    if (all.length || keyTerms(query).length < 2) return all;
    return run(keyTerms(query).map(w => '"' + w + '"').join(' OR '));
  } catch (e) {
    return [{ source: 'mem', date: '', text: `claude-mem query failed: ${e.message.split('\n')[0]}`, pointer: '' }];
  }
}

function searchBrain(tag = BRAIN_TAG, source = 'brain') {
  try {
    // sl-rules runs hybrid: its value is the rule TEXT (document chunks), which memory-only
    // extraction drops; sl-godworld saves are already atomic memories.
    const mode = tag === RULES_TAG ? ' --mode hybrid' : '';
    // supermemory CLI 5.x: `--namespace` (was `--tag`), results under `.results[]` with the
    // text in `chunk` and the dates under `system.{updatedAt,createdAt}`.
    const out = execSync(`npx supermemory search ${JSON.stringify(query)} --namespace ${tag}${mode} --json`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }).toString();
    const start = out.indexOf('{');
    const data = JSON.parse(out.slice(start));
    const results = Array.isArray(data) ? data : (data.results || []);
    const cutoff = DAYS > 0 ? Date.now() - DAYS * 86400000 : 0;
    const when = r => (r.system && (r.system.updatedAt || r.system.createdAt)) || r.updatedAt || r.createdAt || '';
    return results
      .filter(r => !cutoff || Date.parse(when(r) || 0) >= cutoff)
      .slice(0, LIMIT)
      .map(r => ({
        source, date: when(r).slice(0, 10), id: r.id,
        kind: `sim=${(r.similarity || 0).toFixed(2)}`,
        text: (r.memory || r.chunk || '').replace(/\s+/g, ' ').slice(0, 240),
        pointer: `supermemory ${tag} ${r.id}`,
      }));
  } catch (e) {
    return [{ source, date: '', text: `supermemory search failed: ${e.message.split('\n')[0]}`, pointer: '' }];
  }
}

const STOP = new Set(('the a an and or of to in on for with was were is are did does do has have had what who when where why how ' +
  'that this it its be been by from at as about into not no any all get got was his her their our your my').split(' '));
function keyTerms(q) {
  return [...new Set(q.toLowerCase().replace(/[^a-z0-9'. -]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w)))];
}
// Names in the query: capitalised words that are not question words ("Was Mesa traded" → Mesa).
function nameTerms(q) {
  return [...new Set(q.split(/\s+/).map(w => w.replace(/[^A-Za-z0-9'-]/g, ''))
    .filter(w => /^[A-Z]/.test(w) && w.length >= 3 && !STOP.has(w.toLowerCase())))];
}

async function searchWorld() {
  const names = nameTerms(query);
  if (!names.length) return [];
  try {
    require(path.join(__dirname, '..', 'lib', 'env'));
    const sheets = require(path.join(__dirname, '..', 'lib', 'sheets'));
    const res = names.map(n => new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'));
    const has = (s) => res.every(re => re.test(s));
    const cells = (row, n) => row.map(c => String(c == null ? '' : c).replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, n).join(' | ');
    const [feed, roster, ledger] = await Promise.all(['Oakland_Sports_Feed', 'As_Roster', 'Simulation_Ledger'].map(tab => sheets.getSheetData(tab)));
    const out = [];
    // A renamed column would read as undefined and the tab would go quiet; say so instead.
    const hasCols = (tab, head, cols) => {
      const gone = cols.filter(c => head.indexOf(c) < 0);
      if (gone.length) out.push({ source: 'world', date: '', text: `${tab} has no column ${gone.join(', ')} — its rows were not searched`, pointer: '' });
      return !gone.length;
    };
    const fh = feed[0] || [];
    const ci = (h) => fh.indexOf(h);
    if (hasCols('Oakland_Sports_Feed', fh, ['Cycle', 'EventType', 'NamesUsed', 'Notes', 'StoryAngle'])) feed.slice(1).map((r, i) => ({ r, row: i + 2 }))
      .filter(x => has([x.r[ci('NamesUsed')], x.r[ci('Notes')], x.r[ci('StoryAngle')]].join(' ')))
      // A row that names them in NamesUsed is about them; a row that only mentions them comes after.
      .sort((a, b) => (has(String(b.r[ci('NamesUsed')])) - has(String(a.r[ci('NamesUsed')]))) ||
        (Number(b.r[ci('Cycle')]) || 0) - (Number(a.r[ci('Cycle')]) || 0) || b.row - a.row)
      .slice(0, LIMIT)
      .forEach(x => out.push({ source: 'world', date: 'C' + x.r[ci('Cycle')], kind: x.r[ci('EventType')] || '',
        text: String(x.r[ci('Notes')] || x.r[ci('StoryAngle')] || '').replace(/\s+/g, ' ').slice(0, 420),
        pointer: `Oakland_Sports_Feed row ${x.row}` }));
    roster.slice(1).forEach((r, i) => { if (has(r.slice(0, 4).join(' '))) out.push({ source: 'world', date: 'now', kind: 'roster', text: cells(r, 9), pointer: `As_Roster row ${i + 2}` }); });
    const lh = ledger[0] || [];
    const li = (h) => lh.indexOf(h);
    if (hasCols('Simulation_Ledger', lh, ['POPID', 'First', 'Last', 'RoleType', 'Status', 'Tier'])) ledger.slice(1).forEach((r, i) => {
      if (!has([r[li('First')], r[li('Last')]].join(' '))) return;
      out.push({ source: 'world', date: 'now', kind: 'ledger',
        text: [r[li('POPID')], [r[li('First')], r[li('Last')]].join(' '), r[li('RoleType')], r[li('Status')], 'Tier ' + r[li('Tier')]].join(' | '),
        pointer: `Simulation_Ledger row ${i + 2}` });
    });
    return out;
  } catch (e) {
    return [{ source: 'world', date: '', text: `live sheet read failed: ${e.message.split('\n')[0]}`, pointer: '' }];
  }
}

function searchOpen() {
  const fs = require('fs');
  const terms = keyTerms(query);
  if (!terms.length) return [];
  try {
    const lines = fs.readFileSync(path.join(__dirname, '..', 'docs', 'engine', 'ROLLOUT_PLAN.md'), 'utf8').split('\n');
    const need = Math.max(1, Math.ceil(terms.length / 2));
    return lines.map((l, i) => ({ l, n: i + 1, score: terms.filter(w => l.toLowerCase().includes(w)).length }))
      .filter(x => x.score >= need && /^\s*\|/.test(x.l))
      .sort((a, b) => b.score - a.score).slice(0, Math.min(LIMIT, 5))
      .map(x => ({ source: 'open', date: '', kind: '', text: x.l.replace(/\s+/g, ' ').slice(0, 260), pointer: `docs/engine/ROLLOUT_PLAN.md:${x.n}` }));
  } catch (e) { return []; }
}

(async () => {
  const world = flag('--no-world') ? [] : await searchWorld();
  const open = flag('--no-open') ? [] : searchOpen();
  const hits = []
    .concat(flag('--no-mem') ? [] : searchMem())
    .concat(flag('--no-brain') ? [] : searchBrain())
    .concat(flag('--no-rules') ? [] : searchBrain(RULES_TAG, 'rule'))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const all = world.concat(hits, open);

  if (asJson) { console.log(JSON.stringify(all, null, 2)); return; }
  const n = (s) => all.filter(h => h.source === s).length;
  console.log(`brainSearch "${query}" — ${n('world')} world, ${n('mem')} mem, ${n('brain')} brain, ${n('rule')} rule, ${n('open')} open${DAYS ? `, last ${DAYS}d` : ''}`);
  for (const h of all) {
    console.log(`[${h.source.padEnd(5)} ${h.date || '----------'} ${h.kind || ''}] ${h.text}`);
    if (h.pointer) console.log(`        ↳ ${h.pointer}`);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
