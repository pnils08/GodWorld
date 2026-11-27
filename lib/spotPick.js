/**
 * lib/spotPick.js — engine.356 cut C: a citizen's own word moves their spot (the cron half).
 *
 * Builder 2026-11-25 ("You recommendations are approved") + 2026-11-26 ("Let's build it and see how it looks"):
 * asked only when the citizen's own words name a place — the next wake offers their hood's spots and they pick
 * one; the pick lives on their own record (Simulation_Ledger SpotBizId) and the engine uses it ahead of its
 * weekly pick until that place closes (phase05-citizens/generateCitizensEvents.js citizenSpotFor_).
 *
 * The offer is the engine's own list by the engine's own rules: an open Business_Ledger row whose sector the
 * engine classes food or retail (bizSectorClass_), keyed by the hood the engine folds its Neighborhood cell to
 * (resolveHoodOrChild_ over Neighborhood_Map). Both functions are run from the engine files, not copied.
 * Not known here: a business winding down this week (the engine's own carried state) — a pick of one is simply
 * not on the engine's list, and the engine's weekly pick stands in.
 *
 * Wake-side only; lib/ never deploys.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const LEDGER = 'Simulation_Ledger';
const PICK_HEADER = 'SpotBizId';
const ASK_FILE = path.join(ROOT, 'output', 'spot-ask-state.json');
const PICK_LINE = /^[ \t>*_-]*SPOT[ \t]*:[ \t]*(.+?)[ \t*_]*$/gim;

// The engine's own class rule and hood fold. mapRows = Neighborhood_Map as a grid (header row first).
function engineRules(mapRows) {
  const ctx = vm.createContext({ Logger: { log() {} } });
  for (const rel of ['phase05-citizens/applyBusinessDynamics.js', 'phase01-config/canonNeighborhoodLoader.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel, timeout: 2000 });
  }
  if (typeof ctx.bizSectorClass_ !== 'function' || typeof ctx.loadCanonNeighborhoods_ !== 'function' || typeof ctx.resolveHoodOrChild_ !== 'function') {
    throw new Error('spotPick: engine class / hood functions unavailable');
  }
  const ectx = { summary: {}, ss: { getSheetByName: (n) => (n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => mapRows }) } : null) } };
  ctx.__ectx = ectx;
  vm.runInContext('loadCanonNeighborhoods_(__ectx)', ctx);
  return {
    cls: (sector) => ctx.bizSectorClass_(sector),
    hood: (name) => { ctx.__n = name; return vm.runInContext('resolveHoodOrChild_(__ectx, __n)', ctx) || ''; },
  };
}

// { hoodKey: [{ id, name, sector, cls }] } — the same rows applyBusinessDynamics_ puts on S.hoodSpots.
function hoodSpots(bizRows, rules) {
  const out = {};
  for (const b of bizRows || []) {
    const id = String(b.BIZ_ID || '').trim(), name = String(b.Name || '').trim();
    const cls = rules.cls(b.Sector), hk = rules.hood(String(b.Neighborhood || '').trim());
    if (!id || !name || !hk || (cls !== 'food' && cls !== 'retail')) continue;
    (out[hk] = out[hk] || []).push({ id, name, sector: String(b.Sector || ''), cls });
  }
  return out;
}

function spotsFor(spotsByHood, rules, neighborhood) {
  const hk = rules.hood(String(neighborhood || '').trim());
  return (hk && spotsByHood[hk]) || [];
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s) => String(s || '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

// The spots whose exact name stands in the citizen's words (whole name, not a piece of a longer word).
function namedIn(text, spots) {
  const t = norm(text);
  return (spots || []).filter((sp) => new RegExp('(^|[^a-z0-9])' + esc(norm(sp.name)) + '($|[^a-z0-9])').test(t));
}

// What the next wake is shown. One block, the hood's places by name and what each is, and the one line to end on.
function askBlock(hoodName, spots) {
  if (!spots || !spots.length) return '';
  const list = spots.map((sp) => `${sp.name} (${sp.sector})`).join('; ');
  return `Places in ${hoodName}: ${list}.\n` +
    'If one of these is your regular place — where you actually go — say so in your own words, then end with one line: SPOT: <its name>. ' +
    'If none of them is, leave that line out.';
}

// -> { text: the reply without any SPOT line, pick: the spot named on the LAST one or null, raw: what that line said }
// The name must be a listed spot's whole name; quotes and end punctuation are let go on both sides.
function parsePick(reply, spots) {
  const src = String(reply || ''), all = Array.from(src.matchAll(PICK_LINE));
  if (!all.length) return { text: src, pick: null, raw: '' };
  const bare = (x) => norm(x).replace(/^["'“”<]+|["'“”>.!]+$/g, '');
  const raw = all[all.length - 1][1].trim(), want = bare(raw);
  const pick = (spots || []).find((sp) => bare(sp.name) === want) || null;
  return { text: src.replace(PICK_LINE, '').replace(/\n{3,}/g, '\n\n').trim(), pick, raw };
}

// The asks owed: { POPID: { cycle, named: [BIZ_ID], asked: cycle|0, picked: BIZ_ID|'' } }. One ask a naming.
// No file yet = no asks; a file that will not parse throws (the caller asks nothing rather than write over it).
function loadAsks(file) { let t; try { t = fs.readFileSync(file || ASK_FILE, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return {}; throw e; } return JSON.parse(t); }
function saveAsks(st, file) { fs.writeFileSync(file || ASK_FILE, JSON.stringify(st, null, 2)); }
function noteNamed(st, popId, cycle, named, currentPick) {
  const ids = named.map((sp) => sp.id).filter((id) => id !== currentPick);
  if (!ids.length) return false;
  const e = st[popId];
  if (e && !e.asked) { e.named = Array.from(new Set(e.named.concat(ids))); return false; } // already owed
  // asked before: only a place they had not named then owes a new ask (naming the same place again does not)
  const fresh = e ? ids.filter((id) => (e.named || []).indexOf(id) < 0) : ids;
  if (!fresh.length) return false;
  st[popId] = { cycle: Number(cycle) || 0, named: Array.from(new Set(((e && e.named) || []).concat(fresh))), asked: 0, picked: (e && e.picked) || '' };
  return true;
}
const askOwed = (st, popId) => { const e = st[popId]; return !!(e && !e.asked); };

// The pick onto the citizen's own row: one cell, explicit A1, read back (the ensurePagePointer_ shape).
// No SpotBizId column → { error } and nothing written.
async function writePick(sheets, popId, bizId) {
  const { colLetter_ } = require('./citizenPage');
  const rows = await sheets.getRawSheetData(LEDGER);
  const header = rows[0] || [];
  const iPop = header.findIndex((x) => String(x).toLowerCase() === 'popid');
  const iPick = header.findIndex((x) => String(x).trim() === PICK_HEADER);
  if (iPop < 0) return { error: 'POPID column not found' };
  if (iPick < 0) return { error: PICK_HEADER + ' column not found' };
  const want = String(popId).toUpperCase();
  const rowIdx = rows.findIndex((r, i) => i > 0 && String(r[iPop]).toUpperCase() === want);
  if (rowIdx < 0) return { error: 'POPID not in ledger: ' + want };
  const was = String(rows[rowIdx][iPick] || '');
  if (was === bizId) return { row: rowIdx + 1, was, wrote: false };
  const a1 = `${LEDGER}!${colLetter_(iPick)}${rowIdx + 1}`;
  await sheets.updateRange(a1, [[bizId]]);
  const back = await sheets.getRawSheetData(LEDGER);
  if (String((back[rowIdx] || [])[iPick] || '') !== bizId || String((back[rowIdx] || [])[iPop]).toUpperCase() !== want) return { error: 'write verify failed at ' + a1 };
  return { row: rowIdx + 1, was, wrote: true };
}

// ── the wake's two calls ────────────────────────────────────────────────────────────────────────────────────
// Lists come from the local beat dump (output/beats — no sheet read in a wake).
function dumpRows(name) {
  return fs.readFileSync(path.join(ROOT, 'output', 'beats', name + '.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
function gridOf(objs) { const h = Object.keys(objs[0] || {}); return [h].concat(objs.map((o) => h.map((k) => o[k]))); }

// Before the voice call. c = { popId, nh, spotPick } — spotPick null means the ledger has no SpotBizId column: off.
// -> null (off / no spots) | { spots, hood, ask, block, asks }
function prepare(c, opts) {
  const o = opts || {};
  if ((c.spotPick === null || c.spotPick === undefined) && !o.force) return null;
  const rules = engineRules(gridOf(dumpRows('Neighborhood_Map')));
  const spots = spotsFor(hoodSpots(dumpRows('Business_Ledger'), rules), rules, c.nh);
  if (!spots.length) return null;
  const asks = loadAsks(o.askFile), hood = rules.hood(c.nh) || c.nh;
  const ask = !!o.force || askOwed(asks, c.popId);
  return { spots, hood, ask, block: ask ? askBlock(hood, spots) : '', asks };
}

// After the page landed (dry: nothing written). text = the reply with any SPOT line already taken off (parsePick).
// An asked wake spends the ask, and a pick goes to the citizen's ledger cell; a failed cell write leaves the ask owed.
// A wake that was not asked and names a spot of their hood owes the next wake the ask.
async function settle(sp, c, cycle, parsed, text, opts) {
  const o = opts || {}, out = [];
  if (!sp) return out;
  if (sp.ask) {
    if (parsed.pick) {
      if (o.dry) out.push(`[dry-run] spot: ${c.popId} picked ${parsed.pick.name} (${parsed.pick.id}); nothing written`);
      else {
        const w = await writePick(o.sheets, c.popId, parsed.pick.id);
        if (w.error) { out.push(`spot: ${c.popId} picked ${parsed.pick.name} but the cell was not written (${w.error}) — the ask stays owed`); return out; }
        out.push(`spot: ${c.popId} picked ${parsed.pick.name} (${parsed.pick.id})${w.was ? ', was ' + w.was : ''}`);
      }
    } else out.push(`${o.dry ? '[dry-run] ' : ''}spot: ${c.popId} was asked and picked none${parsed.raw ? ' (said "' + parsed.raw.slice(0, 60) + '", not on the list)' : ''}`);
    if (!o.dry) { const e = sp.asks[c.popId] || (sp.asks[c.popId] = { cycle: Number(cycle) || 0, named: [] }); e.asked = Number(cycle) || 1; e.picked = parsed.pick ? parsed.pick.id : ''; saveAsks(sp.asks, o.askFile); }
    return out;
  }
  // A pick this file holds that the ledger cell lost (a fire writes the ledger back whole: a cell written while one
  // runs is overwritten) is written again.
  const held = (sp.asks[c.popId] || {}).picked;
  if (held && c.spotPick === '' && !o.dry) {
    const rw = await writePick(o.sheets, c.popId, held);
    out.push(rw.error ? `spot: ${c.popId}'s pick ${held} is off the ledger and could not be rewritten (${rw.error})` : `spot: ${c.popId}'s pick ${held} was off the ledger — written again`);
  }
  const named = namedIn(text, sp.spots);
  if (named.length && noteNamed(sp.asks, c.popId, cycle, named, c.spotPick || '')) {
    out.push(`${o.dry ? '[dry-run] ' : ''}spot: ${c.popId} named ${named.map((x) => x.name).join(', ')} — the ask is owed at their next wake`);
    if (!o.dry) saveAsks(sp.asks, o.askFile);
  }
  return out;
}

module.exports = { prepare, settle, PICK_HEADER, ASK_FILE, engineRules, hoodSpots, spotsFor, namedIn, askBlock, parsePick, loadAsks, saveAsks, noteNamed, askOwed, writePick };
