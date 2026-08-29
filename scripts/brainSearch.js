#!/usr/bin/env node
/**
 * brainSearch.js — one query, both memories (governance.51 T7).
 *
 *   node scripts/brainSearch.js "<query>" [--limit 8] [--days 0] [--json] [--no-brain] [--no-mem]
 *
 * Sources, each labelled on every hit:
 *   mem   — claude-mem observations (FTS5 over title/subtitle/narrative/text/facts/concepts,
 *           project=GodWorld, bm25 rank). Read direct from ~/.claude-mem/claude-mem.db with the
 *           sqlite3 CLI — no worker, no MCP. Details: get_observations([ids]).
 *   brain — the shared all-lane Supermemory container `sl-godworld` via `npx supermemory search`.
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

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i > -1; };
const opt = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] ? argv[i + 1] : d; };
const query = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--limit', '--days'].includes(argv[i - 1]))).join(' ').trim();
if (!query) { console.error('usage: brainSearch.js "<query>" [--limit N] [--days D] [--json] [--no-brain] [--no-mem]'); process.exit(2); }
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

function searchBrain() {
  try {
    const out = execSync(`npx supermemory search ${JSON.stringify(query)} --tag ${BRAIN_TAG}`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }).toString();
    const start = out.indexOf('{');
    const data = JSON.parse(out.slice(start));
    const results = Array.isArray(data) ? data : (data.results || []);
    const cutoff = DAYS > 0 ? Date.now() - DAYS * 86400000 : 0;
    return results
      .filter(r => !cutoff || Date.parse(r.updatedAt || r.createdAt || 0) >= cutoff)
      .slice(0, LIMIT)
      .map(r => ({
        source: 'brain', date: (r.updatedAt || r.createdAt || '').slice(0, 10), id: r.id,
        kind: `sim=${(r.similarity || 0).toFixed(2)}`,
        text: (r.memory || '').replace(/\s+/g, ' ').slice(0, 240),
        pointer: `supermemory ${BRAIN_TAG} ${r.id}`,
      }));
  } catch (e) {
    return [{ source: 'brain', date: '', text: `supermemory search failed: ${e.message.split('\n')[0]}`, pointer: '' }];
  }
}

const hits = []
  .concat(flag('--no-mem') ? [] : searchMem())
  .concat(flag('--no-brain') ? [] : searchBrain())
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

if (asJson) { console.log(JSON.stringify(hits, null, 2)); process.exit(0); }
console.log(`brainSearch "${query}" — ${hits.filter(h => h.source === 'mem').length} mem, ${hits.filter(h => h.source === 'brain').length} brain${DAYS ? `, last ${DAYS}d` : ''}`);
for (const h of hits) {
  console.log(`[${h.source.padEnd(5)} ${h.date || '----------'} ${h.kind || ''}] ${h.text}`);
  if (h.pointer) console.log(`        ↳ ${h.pointer}`);
}
