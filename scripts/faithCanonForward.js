'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOCKLIST = path.join(ROOT, 'docs', 'media', 'REAL_NAMES_BLOCKLIST.md');

let substitutions = null;

function loadFaithCanonSubstitutions() {
  if (substitutions) return substitutions;
  const md = fs.readFileSync(BLOCKLIST, 'utf8');
  const section = md.match(/^### Faith Organizations & Clergy[^]*?(?=^## (?!#)|(?![^]))/m);
  if (!section) throw new Error('faith corrections-forward section missing from REAL_NAMES_BLOCKLIST.md');
  substitutions = section[0].split('\n').flatMap(line => {
    const match = line.match(/^-\s+(.+?)\s+→\s+\*\*(.+?)\*\*/);
    return match ? [{ blocked: match[1].trim(), canon: match[2].trim() }] : [];
  }).sort((a, b) => b.blocked.length - a.blocked.length);
  if (!substitutions.length) {
    throw new Error('faith corrections-forward map is empty in REAL_NAMES_BLOCKLIST.md');
  }
  return substitutions;
}

function applyFaithCanonForward(value) {
  let text = String(value || '');
  for (const row of loadFaithCanonSubstitutions()) {
    const escaped = row.blocked.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escaped, 'gi'), row.canon);
  }
  return text;
}

function relevantFaithCanonCorrections(...values) {
  const text = values.flat().map(value => String(value || '')).join('\n').toLowerCase();
  return loadFaithCanonSubstitutions().filter(row =>
    text.includes(row.blocked.toLowerCase()) || text.includes(row.canon.toLowerCase()));
}

module.exports = {
  loadFaithCanonSubstitutions,
  applyFaithCanonForward,
  relevantFaithCanonCorrections,
};
