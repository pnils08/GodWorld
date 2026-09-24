#!/usr/bin/env node
/**
 * brainSearch.js — one query, both memories (governance.51 T7).
 *
 *   node scripts/brainSearch.js "<query>" [--limit 8] [--days 0] [--json] [--no-brain] [--no-mem] [--no-rules]
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
 * Output is one merged list, newest first, with source, date, and a pointer per hit.
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
      const out = execSync(`npx supermemory add --stdin --tag ${RULES_TAG} --id ${customId} --title ${JSON.stringify(d.title)} --metadata ${JSON.stringify(JSON.stringify({ source: d.key }))} --json`,
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
      execSync(`npx supermemory docs delete ${entry.id} --yes`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
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
  const match = "'" + ftsQuery(query).replace(/'/g, "''") + "'";
  const sql = `SELECT o.id, o.type, o.title, o.subtitle, o.created_at, o.agent_type
               FROM observations_fts f JOIN observations o ON o.id = f.rowid
               WHERE observations_fts MATCH ${match}
                 AND o.project = '${PROJECT}' ${since}
               ORDER BY rank LIMIT ${LIMIT};`;
  try {
    const out = execSync(`sqlite3 -json ${JSON.stringify(DB)}`, { input: sql, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    return out ? JSON.parse(out).map(r => ({
      source: 'mem', date: (r.created_at || '').slice(0, 10), id: r.id, kind: r.type,
      text: r.title + (r.subtitle ? ' — ' + r.subtitle : ''),
      pointer: `get_observations([${r.id}])`,
    })) : [];
  } catch (e) {
    return [{ source: 'mem', date: '', text: `claude-mem query failed: ${e.message.split('\n')[0]}`, pointer: '' }];
  }
}

function searchBrain(tag = BRAIN_TAG, source = 'brain') {
  try {
    // sl-rules runs hybrid: its value is the rule TEXT (document chunks), which memory-only
    // extraction drops; sl-godworld saves are already atomic memories.
    const mode = tag === RULES_TAG ? ' --mode hybrid' : '';
    const out = execSync(`npx supermemory search ${JSON.stringify(query)} --tag ${tag}${mode}`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }).toString();
    const start = out.indexOf('{');
    const data = JSON.parse(out.slice(start));
    const results = Array.isArray(data) ? data : (data.results || []);
    const cutoff = DAYS > 0 ? Date.now() - DAYS * 86400000 : 0;
    return results
      .filter(r => !cutoff || Date.parse(r.updatedAt || r.createdAt || 0) >= cutoff)
      .slice(0, LIMIT)
      .map(r => ({
        source, date: (r.updatedAt || r.createdAt || '').slice(0, 10), id: r.id,
        kind: `sim=${(r.similarity || 0).toFixed(2)}`,
        text: (r.memory || r.chunk || '').replace(/\s+/g, ' ').slice(0, 240),
        pointer: `supermemory ${tag} ${r.id}`,
      }));
  } catch (e) {
    return [{ source, date: '', text: `supermemory search failed: ${e.message.split('\n')[0]}`, pointer: '' }];
  }
}

const hits = []
  .concat(flag('--no-mem') ? [] : searchMem())
  .concat(flag('--no-brain') ? [] : searchBrain())
  .concat(flag('--no-rules') ? [] : searchBrain(RULES_TAG, 'rule'))
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

if (asJson) { console.log(JSON.stringify(hits, null, 2)); process.exit(0); }
console.log(`brainSearch "${query}" — ${hits.filter(h => h.source === 'mem').length} mem, ${hits.filter(h => h.source === 'brain').length} brain, ${hits.filter(h => h.source === 'rule').length} rule${DAYS ? `, last ${DAYS}d` : ''}`);
for (const h of hits) {
  console.log(`[${h.source.padEnd(5)} ${h.date || '----------'} ${h.kind || ''}] ${h.text}`);
  if (h.pointer) console.log(`        ↳ ${h.pointer}`);
}
