/**
 * canonBlocklist.js — runtime Tier-3 contamination check
 *
 * Parses `docs/media/REAL_NAMES_BLOCKLIST.md` §Faith Organizations & Clergy
 * into in-memory Sets of forbidden Organization names and Leader names. Callers
 * pass a faith row through `checkFaithRow` to assert no substring of either
 * value matches a blocklisted real-world name.
 *
 * Canon.2 P4 Task 4.1 — `docs/plans/2026-05-12-canon-2-faith-scrub.md`.
 */

const fs = require('fs');
const path = require('path');

const BLOCKLIST_PATH = path.resolve(__dirname, '..', 'docs', 'media', 'REAL_NAMES_BLOCKLIST.md');

const HONORIFIC_RE = /^(bishop|rev\.?|fr\.?|dr\.?|rabbi|imam|pandit|bhai|father|sister|brother|pastor)\s/i;

let _cache = null;

function loadFaithBlocklist() {
  if (_cache) return _cache;

  const md = fs.readFileSync(BLOCKLIST_PATH, 'utf8');
  const lines = md.split('\n');

  const orgs = new Set();
  const leaders = new Set();

  let inFaithSection = false;
  let currentSub = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^### Faith Organizations & Clergy/.test(line)) { inFaithSection = true; continue; }
    if (inFaithSection && /^## (?!##)/.test(line)) break;
    if (!inFaithSection) continue;

    if (/^#### Organizations/i.test(line)) { currentSub = 'orgs'; continue; }
    if (/^#### Clergy/i.test(line)) { currentSub = 'leaders'; continue; }
    if (/^#### Retired/i.test(line)) { currentSub = 'retired'; continue; }
    if (/^#### Historical/i.test(line)) { currentSub = null; continue; }
    if (/^####/.test(line)) { currentSub = null; continue; }

    if (!currentSub) continue;

    const m = line.match(/^-\s+(.+?)\s+→\s+\*\*/);
    if (!m) continue;
    const lhs = m[1].trim();

    if (currentSub === 'orgs') {
      orgs.add(lhs);
    } else if (currentSub === 'leaders') {
      leaders.add(lhs);
    } else if (currentSub === 'retired') {
      if (HONORIFIC_RE.test(lhs)) leaders.add(lhs);
      else orgs.add(lhs);
    }
  }

  _cache = { orgs, leaders };
  return _cache;
}

function _hit(haystack, needle) {
  if (!haystack) return false;
  return haystack.toLowerCase().indexOf(needle.toLowerCase()) >= 0;
}

function checkFaithRow(faith) {
  const { orgs, leaders } = loadFaithBlocklist();
  const org = faith && faith.organization;
  const leader = faith && faith.leader;

  for (const bad of orgs) {
    if (_hit(org, bad)) {
      throw new Error('Canon blocklist violation: Organization "' + org + '" matches Tier-3 real name "' + bad + '"');
    }
  }
  for (const bad of leaders) {
    if (_hit(leader, bad)) {
      throw new Error('Canon blocklist violation: Leader "' + leader + '" matches Tier-3 real name "' + bad + '"');
    }
  }
}

function _resetCache() { _cache = null; }

module.exports = { loadFaithBlocklist, checkFaithRow, _resetCache };
