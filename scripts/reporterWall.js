#!/usr/bin/env node
/**
 * reporterWall.js — social wiki wall for journalist POPIDs (grok 2026-08-07)
 *
 * Standard: each reporter is a ledger citizen with Supermemory page
 *   container citizen-pages, tag cp-POP-XXXXX (lib/citizenPage).
 * That page is their social wiki wall / first-person feed — not bay-tribune
 * canon, not wd-citizens dossier.
 *
 * FIRST WAKE HOOK: past wall entries are HARD-INJECTED into the writer state
 * and angle ask (not an optional memory_recall tool call). Tools remain for
 * deeper digs mid-compose.
 *
 * Writes (existing):
 *   - gate PASS → citizenVoice --record-text=filed: <headline>
 *   - memory_note tool → working notes (daypart deskwork)
 *   - citizen-loop wakes → reflections/tensions (Jax lives in the city too)
 *
 * Usage:
 *   node scripts/reporterWall.js --pop POP-00799
 *   const { loadReporterWall, formatWallBlock, ensureReporterWall } = require('./reporterWall');
 */

'use strict';

require('/root/GodWorld/lib/env');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

/**
 * Load newest wall posts for a reporter POPID.
 * @returns {Promise<{ tag, posts: {content, createdAt, customId, metadata}[], error? }>}
 */
async function loadReporterWall(popId, limit) {
  const n = limit == null ? 6 : limit;
  if (!popId) return { tag: null, posts: [], error: 'no-popid' };
  try {
    const { pageTagFor, recentPage_ } = require(path.join(ROOT, 'lib', 'citizenPage'));
    const tag = pageTagFor(popId);
    const r = await recentPage_(popId, n);
    if (r.error) return { tag, posts: [], error: r.error };
    return {
      tag,
      posts: (r.results || []).map(d => ({
        content: String(d.content || '').replace(/\s+/g, ' ').trim(),
        createdAt: d.createdAt || null,
        customId: d.customId || null,
        metadata: d.metadata || null
      })).filter(p => p.content)
    };
  } catch (e) {
    return { tag: null, posts: [], error: e.message };
  }
}

/**
 * Markdown block for lane state / angle ask — HARD inject, not a tool suggestion.
 */
function formatWallBlock(wall, opts) {
  const o = opts || {};
  const name = o.name || 'you';
  const tag = (wall && wall.tag) || 'cp-?';
  const L = [];
  L.push('### YOUR SOCIAL WIKI WALL (Supermemory ' + tag + ' — first-person feed, not city canon)');
  L.push('This is YOUR page — like a social wall: past filings, notes, life reflections.');
  L.push('HOOK these before you write. Continuity is mandatory; do not amnesia past posts.');
  L.push('Do NOT treat wall prose as engine fact. Do NOT quote yourself as a source in the article.');
  if (!wall || wall.error) {
    L.push('_Wall read failed' + (wall && wall.error ? ' (' + wall.error + ')' : '') +
      ' — write cold; tools may still memory_note._');
    return L.join('\n');
  }
  if (!wall.posts.length) {
    L.push('_No posts yet on this wall — first professional wake for ' + name +
      '. After a Rhea PASS, a "filed: <headline>" post lands here._');
    return L.join('\n');
  }
  L.push('RECENT POSTS (newest first):');
  wall.posts.forEach((p, i) => {
    const meta = p.metadata || {};
    const when = [meta.cycle != null ? 'c' + meta.cycle : null, meta.daypart, meta.type]
      .filter(Boolean).join(' · ');
    L.push((i + 1) + '. ' + (when ? '[' + when + '] ' : '') + p.content.slice(0, 400));
  });
  return L.join('\n');
}

/**
 * Ensure ledger SMPageId pointer exists for this reporter (idempotent).
 */
async function ensureReporterWall(popId) {
  if (!popId) return { error: 'no-popid' };
  try {
    const { ensurePagePointer_, pageTagFor } = require(path.join(ROOT, 'lib', 'citizenPage'));
    const tag = pageTagFor(popId);
    const ptr = await ensurePagePointer_(popId);
    const wall = await loadReporterWall(popId, 3);
    return { tag, pointer: ptr, postCount: wall.posts.length, error: ptr.error || wall.error || null };
  } catch (e) {
    return { error: e.message };
  }
}

/** Compact lines for angle-ask injection */
function wallAskSnippet(wall, maxPosts) {
  const n = maxPosts == null ? 3 : maxPosts;
  if (!wall || !wall.posts || !wall.posts.length) {
    return 'YOUR WALL: empty or unread — no prior posts hooked.';
  }
  return 'YOUR WALL (hook these):\n' +
    wall.posts.slice(0, n).map((p, i) =>
      (i + 1) + '. ' + p.content.slice(0, 220)).join('\n');
}

if (require.main === module) {
  const pop = arg('--pop', 'POP-00799');
  const limit = parseInt(arg('--limit', '6'), 10);
  Promise.resolve()
    .then(async () => {
      if (process.argv.includes('--ensure')) {
        const e = await ensureReporterWall(pop);
        console.log('ensure', JSON.stringify(e, null, 2));
      }
      const wall = await loadReporterWall(pop, limit);
      console.log(formatWallBlock(wall, { name: pop }));
      if (wall.error) process.exitCode = 1;
    })
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = {
  loadReporterWall,
  formatWallBlock,
  ensureReporterWall,
  wallAskSnippet
};
