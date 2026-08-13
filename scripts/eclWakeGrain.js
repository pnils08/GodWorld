#!/usr/bin/env node
'use strict';

/**
 * Event_Content_Ledger → citizen-wake grain.
 *
 * The engine already composes line + $SLOT fragments into LifeHistory. The
 * wake was still sitting on the leftover hardcoded Daily templates
 * ("spent time unwinding"). This module is the loop-side consumer: load the
 * ledger (cached JSON, or the live tab), pick one eligible line for THIS
 * citizen, fill interchangeable fragments, and hand the composed sentence
 * to the wake as the event they are inside.
 *
 * Fail-closed, same as the Phase-2 loader: unknown conditions skip the row;
 * an unfillable $SLOT drops the line; raw $TOKEN never returns.
 * Entity slots ($VENUE / $CONTACT / $INSTITUTION) fill only from caller-
 * supplied canon (neighborhood, a real neighbor). Empty entity → skip line.
 *
 *   const grain = composeEclGrain(citizen, { cycle, wake, ledger, venue, contact });
 *   Not called from citizen-wake.js.
 */

const fs = require('fs');
const path = require('path');
const { _hash53 } = require('/root/GodWorld/lib/provocationBank');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, 'output', 'event_content_ledger.json');
const LOADER = path.join(ROOT, 'phase02-world-state', 'loadEventContentLedger.js');
const CACHE_MS = 6 * 60 * 60 * 1000;
const ENTITY_SLOTS = { VENUE: 1, CONTACT: 1, INSTITUTION: 1 };

const VAGUE_LIFE = /\[(Daily|PrevEvening|Personal|Background|Neighborhood|Life|Micro-Event)\]\s+(spent time|felt the|heard (folks|about|the)|caught themselves|adjusted today's|noticed more masks|spent an hour moving money|had a quiet moment|enjoyed the district|found a quiet minute|drove the whole way|overheard coworkers)/i;

function isVagueLifeTail(life) {
  const lines = String(life || '').split('\n').filter(Boolean);
  if (!lines.length) return true;
  return lines.every((l) => VAGUE_LIFE.test(l) || l.replace(/^.*—\s*/, '').length < 55);
}

function slotTokens(text) {
  const out = [];
  const re = /\$([A-Z_]+)/g;
  let m;
  while ((m = re.exec(String(text))) !== null) {
    if (out.indexOf(m[1]) < 0) out.push(m[1]);
  }
  return out;
}

function evalTerms(terms, scopes) {
  if (!terms || !terms.length) return true;
  for (const t of terms) {
    if (t.op === 'flag') {
      if (!scopes[t.f]) return false;
      continue;
    }
    const actual = scopes[t.f];
    if (actual === null || actual === undefined || actual === '') return false;
    if (typeof t.v === 'number') {
      const av = Number(actual);
      if (isNaN(av)) return false;
      if (t.op === '<=' && !(av <= t.v)) return false;
      else if (t.op === '>=' && !(av >= t.v)) return false;
      else if (t.op === '<' && !(av < t.v)) return false;
      else if (t.op === '>' && !(av > t.v)) return false;
      else if (t.op === '=' && av !== t.v) return false;
      else if (t.op === '!=' && av === t.v) return false;
    } else {
      const as = String(actual).toLowerCase();
      const vs = String(t.v).toLowerCase();
      if (t.op === '=' && as !== vs) return false;
      else if (t.op === '!=' && as === vs) return false;
    }
  }
  return true;
}

function loadEventContentLedger_() {
  const src = fs.readFileSync(LOADER, 'utf8');
  return new Function(src + '\nreturn loadEventContentLedger_;')();
}

function compileFromValues(values) {
  const load = loadEventContentLedger_();
  const ctx = {
    summary: {},
    ss: {
      getSheetByName: (n) => (n === 'Event_Content_Ledger'
        ? { getDataRange: () => ({ getValues: () => values }) }
        : null)
    }
  };
  load(ctx);
  return ctx.summary.contentLedger || { lines: {}, fragments: {}, skipped: 0 };
}

function loadCachedLedger() {
  try {
    const j = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
    if (!j || !Array.isArray(j.rows) || j.rows.length < 2) return null;
    const age = Date.now() - Date.parse(j.fetchedAt || 0);
    if (isFinite(age) && age > CACHE_MS) return null;
    return compileFromValues(j.rows);
  } catch (e) { return null; }
}

function writeCache(values) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    rows: values
  }) + '\n');
}

async function fetchLedger() {
  const cached = loadCachedLedger();
  if (cached) return cached;
  try {
    const sheets = require('/root/GodWorld/lib/sheets');
    const values = await sheets.getRawSheetData('Event_Content_Ledger');
    if (!values || values.length < 2) return { lines: {}, fragments: {}, skipped: 0 };
    writeCache(values);
    return compileFromValues(values);
  } catch (e) {
    return { lines: {}, fragments: {}, skipped: 0 };
  }
}

function citizenScopes(c) {
  return {
    wealth: c.wealth,
    children: c.children,
    displacement: c.displacement,
    married: /married/i.test(String(c.marital || '')),
    retired: /retired/i.test(String(c.status || '')),
    hood: c.nh || c.hood || '',
    occupation: c.occ || '',
    age: c.age,
    season: c.season || '',
    lifestate: c.lifestate || '',
    band: c.band || '',
    tier: c.tier,
    fame: c.fame
  };
}

function pickHashed(arr, seed) {
  if (!arr.length) return null;
  const i = _hash53(seed, 0xec17) % arr.length;
  return arr[i];
}

function composeLine(entry, ledger, entityValues, scopes, seed) {
  let text = String(entry.text || '');
  const slots = entry.slots || slotTokens(text);
  for (const slot of slots) {
    let value = '';
    if (ENTITY_SLOTS[slot]) {
      value = entityValues[slot] || '';
    } else {
      const frags = (ledger.fragments[slot] || []).filter((f) => evalTerms(f.conditions, scopes));
      const pick = pickHashed(frags, seed + '|' + slot);
      value = pick ? pick.text : '';
    }
    if (!value) return null;
    text = text.split('$' + slot).join(value);
  }
  if (/\$[A-Z_]+/.test(text)) return null;
  return text.replace(/\s+/g, ' ').trim();
}

function eligibleLines(ledger, scopes, entityValues) {
  const out = [];
  for (const [poolKey, entries] of Object.entries(ledger.lines || {})) {
    for (const entry of entries) {
      if (!evalTerms(entry.conditions, scopes)) continue;
      const slots = entry.slots || slotTokens(entry.text);
      let fillable = true;
      for (const slot of slots) {
        if (ENTITY_SLOTS[slot]) {
          if (!entityValues[slot]) { fillable = false; break; }
          continue;
        }
        const frags = (ledger.fragments[slot] || []).filter((f) => evalTerms(f.conditions, scopes));
        if (!frags.length) { fillable = false; break; }
      }
      if (!fillable) continue;
      out.push({ poolKey, entry });
    }
  }
  return out;
}

function composeEclGrain(citizen, opts) {
  const o = opts || {};
  const ledger = o.ledger;
  if (!ledger || !ledger.lines) return { line: '', poolKey: '', source: 'empty' };
  const scopes = citizenScopes(citizen || {});
  if (o.season) scopes.season = o.season;
  const entityValues = {
    VENUE: o.venue || '',
    CONTACT: o.contact || '',
    INSTITUTION: o.institution || ''
  };
  const pool = eligibleLines(ledger, scopes, entityValues);
  if (!pool.length) return { line: '', poolKey: '', source: 'no-eligible' };
  const scoreOf = (item) => {
    const slots = item.entry.slots || slotTokens(item.entry.text);
    let s = 0;
    if (slots.includes('CONTACT') && entityValues.CONTACT) s += 3;
    if (slots.includes('VENUE') && entityValues.VENUE) s += 2;
    if (slots.includes('INSTITUTION') && entityValues.INSTITUTION) s += 2;
    return s;
  };
  let best = -1;
  for (const item of pool) best = Math.max(best, scoreOf(item));
  const ranked = pool.filter((item) => scoreOf(item) === best);
  const seed = [citizen && citizen.popId, o.cycle, o.wake].join(':');
  const pick = pickHashed(ranked, seed);
  const line = composeLine(pick.entry, ledger, entityValues, scopes, seed);
  if (!line) return { line: '', poolKey: pick.poolKey, source: 'compose-null' };
  return { line, poolKey: pick.poolKey, source: 'ecl' };
}

async function grainForCitizen(citizen, opts) {
  const ledger = (opts && opts.ledger) || await fetchLedger();
  return composeEclGrain(citizen, Object.assign({}, opts, { ledger }));
}

module.exports = {
  CACHE, CACHE_MS, VAGUE_LIFE,
  isVagueLifeTail, slotTokens, compileFromValues, loadCachedLedger,
  writeCache, fetchLedger, composeEclGrain, grainForCitizen, citizenScopes
};
