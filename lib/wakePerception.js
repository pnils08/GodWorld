/* wakePerception — shared citizen perception assembly (citizen-loop-deepening Task 5, S300).
 *
 * EXTRACTION ONLY from scripts/citizen-wake.js — zero behavior change; the wake requires and
 * destructures. Every consumer that voices a citizen (the wake crons, scripts/citizenVoice.js
 * edition-run voicing, the Task-6 conversation engine) assembles the SAME perception from the
 * SAME canon sources: dials → disposition, LifeHistory tail, co-residents, bonds, sports slice,
 * neighborhood texture, fenced own-page read-back. One mechanism, many mouths.
 *
 * Read-only canon access + Supermemory page reads. NOTHING here writes — dials, LifeHistory,
 * ledger, page, and local state stay with the callers (and the wake's PHASE-1 GATE still binds
 * them). All functions fail open ('' / []) — a missing slice never blocks a voice.
 *
 * Comments on individual functions carry their original research.19/seams provenance.
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
const dials = require('/root/GodWorld/lib/citizenDials');
const dialMap = require('/root/GodWorld/utilities/citizenDialMap');
const page = require('/root/GodWorld/lib/citizenPage');
const memoryFence = require('/root/GodWorld/lib/memoryFence');
const resonance = require('/root/GodWorld/lib/resonanceRecall');
const { createSlicer } = require('/root/GodWorld/lib/neighborhoodSlice');

const SHAPED_MIN = 60;          // deviation floor — only strongly-shaped citizens have a distinct voice
const LIFE_MIN_CHARS = 25;      // must have real lived events to ground on (anti-confabulation)
const RESIDENT_CAP = 3;         // real co-residents fed for grounding (names only, no metrics)

// LifeHistory tail -> magnitude of the biggest dial nudge = "how big a delta is this citizen living".
// Scores every tail line, age-damped (mag × 0.8^age, last line = age 0), takes the max — a real
// event 2-3 lines back must outrank the ambient filler that usually holds the last slot now that
// atmospheric depth raised filler volume (S281 seams plan, Findings #3 / Task 1).
function recentEventMagnitude(lifeTail) {
  const lines = String(lifeTail || '').split('\n').filter(Boolean);
  let best = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\[([^\]]+)\]/);
    if (!m) continue;
    const fx = dialMap.nudgesForEvent_(m[1].trim(), 1, lines[i]);
    const mag = Object.values(fx).reduce((s, v) => s + Math.abs(v), 0);
    const age = lines.length - 1 - i;
    best = Math.max(best, mag * Math.pow(0.8, age));
  }
  return best;
}

// T1a' (research.19, S273 production finding) — canon-anchored self-state read-back: the latest
// PERSON-READABLE life-event milestone's own description; if none, OMIT (no count fallback — the
// count IS the bug; full rationale in the original citizen-wake comment block, git history).
const MILESTONE_TAGS = /^(Wedding|Birth|Retirement|Graduation|Stabilized)$/i; // Death omitted: incoherent for a living reflector
const BOOKKEEPING_PREFIX = /^(Updated to Tier|Added to Simulation_Ledger|Emerged into Tier|Neighborhood council|Local civic|Development civic)/i;
async function loadLifeArc(popId) {
  try {
    const rows = await sheets.getRawSheetData('LifeHistory_Log');
    if (!rows || rows.length < 2) return '';
    const h = rows[0];
    const iPop = h.findIndex((x) => String(x).toLowerCase() === 'popid');
    const iTag = h.findIndex((x) => String(x).toLowerCase() === 'eventtag');
    const iText = h.findIndex((x) => String(x).toLowerCase() === 'eventtext');
    const iCyc = h.findIndex((x) => String(x).toLowerCase() === 'cycle');
    if (iPop < 0 || iTag < 0 || iText < 0) return '';
    let best = null; // latest (highest cycle) clean milestone
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][iPop]).toUpperCase() !== popId) continue;
      if (!MILESTONE_TAGS.test(String(rows[i][iTag] || '').trim())) continue;
      const text = String(rows[i][iText] || '').trim();
      if (text.length < 8 || BOOKKEEPING_PREFIX.test(text)) continue; // sanitize: drop engine-bookkeeping text
      const cyc = iCyc >= 0 ? (Number(rows[i][iCyc]) || 0) : i;
      if (!best || cyc >= best.cyc) best = { text, cyc };
    }
    return best ? best.text : '';
  } catch (e) { return ''; }
}

// T1a — dial TRAJECTORY: how their temperament has moved (current vs back-dated base). DORMANT today —
// surfaces a shift line ONLY when real movement exists; never fabricates one (canon-anchored).
function dialTrajectory(baseDials, cur) {
  if (!baseDials || !cur) return '';
  const shifts = [];
  for (const d of dials.DIALS) {
    const b = baseDials[d], c = cur[d];
    if (b == null || c == null || Math.abs(c - b) < 8) continue; // below noticeable
    const band = dials.bandIdx(c);
    if (band >= 0) shifts.push(dials.POLES[d][band]);
  }
  return shifts.slice(0, 2).join('; ');
}

// T1b (research.19) — world-larger-than-self: the A's as any Oaklander would know them. Canonical feed
// (Paulson's domain), narrative NOT metrics. Spot-checked canon-clean S270.
async function loadSportsSlice() {
  try {
    const rows = await sheets.getRawSheetData('Oakland_Sports_Feed');
    if (!rows || rows.length < 2) return '';
    const h = rows[0];
    const col = (n) => h.findIndex((x) => String(x).toLowerCase() === n.toLowerCase());
    const iCycle = col('Cycle'), iNotes = col('Notes'), iRec = col('Team Record'), iStreak = col('Streak'), iTeam = col('TeamsUsed');
    let maxC = -1; for (let i = 1; i < rows.length; i++) { const cN = Number(rows[i][iCycle]) || 0; if (cN > maxC) maxC = cN; }
    // A's only — the team every Oaklander follows; the Oaks-expansion rows carry no record ('-') and
    // would conflate two franchises under one "The A's are…" framing. Real game record lives on A's rows.
    const latest = rows.slice(1).filter((r) => Number(r[iCycle]) === maxC
      && /a's/i.test(String(r[iTeam] || '')) && String(r[iNotes] || '').trim());
    if (!latest.length) return '';
    latest.sort((a, b) => String(b[iNotes]).length - String(a[iNotes]).length); // richest note
    const r = latest[0];
    const validRec = iRec >= 0 && /\d+-\d+/.test(String(r[iRec] || ''));
    const rec = validRec ? `The A's are ${String(r[iRec]).trim()}` : "The A's";
    const streak = validRec && iStreak >= 0 && r[iStreak] ? ` (${String(r[iStreak]).trim()})` : '';
    return `${rec}${streak}. ${String(r[iNotes]).trim().slice(0, 220)}`;
  } catch (e) { return ''; }
}

// T2 (research.19) — immediate world: this hood's frozen lived-particulars block.
// engine.76 W3: world_state.json hoods section first (single cron artifact, cycle-matched);
// falls back to the per-cycle neighborhood_texture_c{XX}.md. Graceful '' if absent.
function loadNeighborhoodTexture(nh, cycle) {
  try {
    if (!nh || !cycle) return '';
    let body = '';
    try {
      const ws = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'output', 'world_state.json'), 'utf8'));
      if (ws.meta && String(ws.meta.cycle) === String(cycle) && ws.hoods) {
        const key = Object.keys(ws.hoods).find((k) => k.trim().toLowerCase() === String(nh).trim().toLowerCase());
        if (key) body = String(ws.hoods[key]).replace(/\s+/g, ' ').trim();
      }
    } catch (e) { /* fall through to texture md */ }
    if (!body) {
      const p = path.join(__dirname, '..', 'output', `neighborhood_texture_c${cycle}.md`);
      const md = fs.readFileSync(p, 'utf8');
      const parts = md.split(/^###\s+/m);
      for (const part of parts.slice(1)) {
        const nl = part.indexOf('\n');
        if (nl < 0) continue;
        if (part.slice(0, nl).trim().toLowerCase() !== String(nh).trim().toLowerCase()) continue;
        body = part.slice(nl + 1).split(/\n###\s/)[0].trim().replace(/\s+/g, ' ').trim();
        break;
      }
    }
    if (!body) return '';
    if (/^a quiet week/i.test(body)) return ''; // no engine signal -> nothing to perceive, omit the line
    return body;
  } catch (e) { return ''; }
}

// research.19 relationships-with-texture — the people a citizen has HISTORY with. Reads
// Relationship_Bonds + ledger names; renders bond-type + warmth as plain relationship texture.
// Canon-anchored; never invents a name.
const BOND_PHRASE = {
  family: (close) => (close ? 'close family' : 'family'),
  friendship: (close) => (close ? 'a close friend' : 'a friend'),
  professional: () => 'someone you know through work',
  alliance: (close) => (close ? 'someone you count on' : 'an ally'),
  rivalry: () => 'someone you butt heads with',
  // engine.48 T13 — the wedding path (createGenerationalBond_) emits 'romantic';
  // it rendered as the generic fallback until now. 'marriage' kept as alias.
  romantic: (close) => (close ? 'your partner in life' : 'someone you love'),
  marriage: () => 'your partner in life',
};
async function loadBonds(popId, opts) {
  const withPairs = !!(opts && opts.pairs);
  const empty = withPairs ? { line: '', pairs: [] } : '';
  try {
    const [bonds, led] = await Promise.all([
      sheets.getRawSheetData('Relationship_Bonds'),
      sheets.getRawSheetData('Simulation_Ledger'),
    ]);
    if (!bonds || bonds.length < 2 || !led || led.length < 2) return empty;
    const bh = bonds[0];
    const iA = bh.indexOf('CitizenA'), iB = bh.indexOf('CitizenB'), iT = bh.indexOf('BondType'), iI = bh.indexOf('Intensity'), iS = bh.indexOf('Status');
    if (iA < 0 || iB < 0) return empty;
    const lh = led[0];
    const lp = lh.findIndex((x) => String(x).toLowerCase() === 'popid');
    const ln = lh.findIndex((x) => String(x).toLowerCase() === 'name');
    const lf = lh.findIndex((x) => String(x).toLowerCase() === 'first');
    const ll = lh.findIndex((x) => String(x).toLowerCase() === 'last');
    const nameOf = {};
    for (let i = 1; i < led.length; i++) {
      const k = String(led[i][lp]).toUpperCase();
      nameOf[k] = (ln >= 0 && led[i][ln]) ? led[i][ln] : [led[i][lf], led[i][ll]].filter(Boolean).join(' ');
    }
    const mine = [];
    for (let i = 1; i < bonds.length; i++) {
      const r = bonds[i];
      if (String(r[iS] || '').toLowerCase() !== 'active') continue;
      const a = String(r[iA]).toUpperCase(), b = String(r[iB]).toUpperCase();
      if (a !== popId && b !== popId) continue;
      const other = a === popId ? b : a;
      const name = nameOf[other];
      if (!name) continue; // unresolved POPID -> skip (anti-confabulation: never invent a name)
      const intensity = Number(r[iI]) || 0;
      const fn = BOND_PHRASE[String(r[iT] || '').toLowerCase()];
      const phrase = fn ? fn(intensity >= 5) : (intensity >= 5 ? 'someone close to you' : 'someone you know');
      mine.push({ pop: other, name, phrase, intensity });
    }
    if (!mine.length) return empty;
    mine.sort((x, y) => y.intensity - x.intensity); // closest first
    const line = mine.slice(0, 3).map((m) => `${m.name}, ${m.phrase}`).join('; ');
    // engine.48 T4 — opt-in {pairs} keeps name+POPID for the ripple write side
    // (default return stays the plain string for every existing caller).
    if (withPairs) return { line, pairs: mine.slice(0, 3).map((m) => ({ pop: m.pop, name: m.name })) };
    return line;
  } catch (e) { return empty; }
}

// T1c (research.19) — bounded own-page prose READ-BACK, resonance-scored. MANDATORY fence
// (lib/memoryFence). Fails open (no page / API down -> { block: '', keys: [] }).
const PAGE_READBACK_N = 3;        // memories fed to the prompt (cap unchanged from blind-recency era)
const PAGE_CANDIDATE_N = 15;      // reflections pulled as recall CANDIDATES (B4 v1 — scored, not blind)
const PAGE_REFLECTION_CAP = 320;  // per-reflection char cap (token bound)
async function loadOwnPageReadback(popId, recall) {
  try {
    // recentPage_ (recency via documents-list+get), NOT readPage_ (v4 search silently misses docs — S272).
    const res = await page.recentPage_(popId, PAGE_CANDIDATE_N);
    const candidates = ((res && res.results) || [])
      .filter((r) => String((r && r.metadata && r.metadata.type) || '') !== 'tension') // typed TENSION lines are not memories
      .map((r) => ({ text: String((r && r.content) || '').trim().slice(0, PAGE_REFLECTION_CAP), meta: (r && r.metadata) || null, kind: 'reflection' }))
      .filter((c) => c.text);
    // latest milestone joins the candidate set (Design B4) — flat-mid affect, competes on context/staleness.
    if (recall && recall.milestone) candidates.push({ text: String(recall.milestone).trim().slice(0, PAGE_REFLECTION_CAP), meta: null, kind: 'milestone' });
    // Task 4 — resolved tensions + unlived entries (pre-composed upstream), same flat-mid footing.
    if (recall && recall.extraCandidates) candidates.push(...recall.extraCandidates);
    if (!candidates.length) return { block: '', keys: [] };
    // B4 v1 (seams Task 2): score context-match + staleness + affect, seeded tiebreak — not blind most-recent-3.
    const pick = resonance.selectMemories({
      popId, cycle: recall && recall.cycle, wake: recall && recall.wake,
      candidates, contextText: (recall && recall.contextText) || '', cap: PAGE_READBACK_N,
    });
    const prose = pick.selected.map((c) => c.text).join('\n\n');
    if (!prose.trim()) return { block: '', keys: [] };
    return { block: memoryFence.wrap(prose, 'citizen-page:' + popId), keys: pick.keys }; // fenced — recalled prose never enters raw
  } catch (e) { return { block: '', keys: [] }; }
}

// The shaped-citizen pool from the ledger. opts (default = wake behavior, byte-identical):
//   shapedMin     deviation floor (0 lets any dialed citizen through — edition voicing)
//   lifeMinChars  lived-history floor
// engine.48 T10 — card-anchor slice: the wake reads the citizen's wd-citizen card (compiled by
// buildCitizenCards.js, derived-never-authored per ADR-0007) so reflections carry the FACTS of
// the life, not just temperament. Deterministic template-distill, NO LLM. list->GET route (v4
// search silently misses docs — citizenPage.recentPage_ S272 finding). Graceful '' always.
async function loadCardAnchor(popId) {
  try {
    const auth = { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' };
    const API = 'https://api.supermemory.ai';
    let docId = null;
    for (let pageN = 1; pageN <= 8 && !docId; pageN++) {
      const lr = await fetch(API + '/v3/documents/list', {
        method: 'POST', headers: auth,
        body: JSON.stringify({ containerTags: ['wd-citizens'], limit: 200, page: pageN }),
      });
      const lj = await lr.json();
      if (!lr.ok || lj.error) return '';
      const mems = lj.memories || lj.documents || [];
      for (const m of mems) {
        if (m && m.metadata && String(m.metadata.popid || '').toUpperCase() === popId) { docId = m.id; break; }
      }
      if (mems.length < 200) break;
    }
    if (!docId) return '';
    const gr = await fetch(API + '/v3/documents/' + docId, { method: 'GET', headers: auth });
    const gj = await gr.json();
    const content = (gj && typeof gj.content === 'string') ? gj.content : '';
    if (!content.trim()) return '';
    // Distill: bio + life (carries marital) + fame + up to 3 newest appearance lines, cap ~600.
    const lines = content.split('\n');
    const grab = (prefix) => { const l = lines.find((x) => x.startsWith(prefix)); return l ? l.trim() : ''; };
    const out = [grab('Bio:'), grab('Life:'), grab('Fame:')].filter(Boolean);
    const ai = lines.findIndex((x) => x.trim() === 'APPEARANCES:');
    if (ai >= 0) {
      const apps = lines.slice(ai + 1).filter((x) => x.trim().startsWith('- ')).slice(0, 3).map((x) => x.trim());
      if (apps.length) out.push('Recently in the record: ' + apps.join(' '));
    }
    return out.join(' ').slice(0, 600);
  } catch (e) { return ''; }
}

// engine.48 T11 — voiced speech-texture: authored voice agents' "## Your Voice" section (cadence,
// verbal habits, motifs ONLY — biography and dial claims flow via card + dials so the authored
// file can't fight live drift, ADR-0014). Non-voiced citizens: ''.
function loadVoiceTexture(popId) {
  try {
    const dir = path.join(__dirname, '..', '.claude', 'agents');
    for (const d of fs.readdirSync(dir).filter((x) => x.startsWith('citizen-voice-'))) {
      let md;
      try { md = fs.readFileSync(path.join(dir, d, 'IDENTITY.md'), 'utf8'); } catch (e) { continue; }
      const m = md.match(/POP ID:\*{0,2}\s*(POP-\d{5})/);
      if (!m || m[1].toUpperCase() !== popId) continue;
      const sec = md.split(/^## Your Voice\s*$/m)[1];
      if (!sec) return '';
      const body = sec.split(/^## /m)[0];
      // headline phrases (the bolded leads) + the tone range line — habits, not biography
      const heads = [...body.matchAll(/\*\*([^*]+)\*\*/g)].map((x) => x[1].trim().replace(/\.$/, ''));
      const tone = heads.length ? heads.filter((h) => !/^Tone range$/i.test(h)) : [];
      const toneLine = (body.match(/\*\*Tone range:\*\*\s*([^\n]+)/) || [])[1] || '';
      const parts = tone.slice(0, 5).join('; ') + (toneLine ? '. Tone: ' + toneLine.trim() : '');
      return parts.slice(0, 300);
    }
    return '';
  } catch (e) { return ''; }
}

// engine.48 T12 — salience classes for the life tail (TAG_REGISTRY slot-eligible vs texture).
// Milestone/high-salience: life-stage + health lifecycle + conduct + advancement + edition
// citations. Everything else (Daily/PrevEvening/Weather/Holiday/Sports/Personal...) is texture.
const SALIENT_TAG = /^(Wedding|Birth|Death|Divorce|Retirement|Graduation|Promotion|Health|Critical|Recovering|Hospitalized|Stabilized|Setback|Recovery|Career-Transition|Transgression-(Petty|Serious|Grave)|Resisted|E\d+)$/i;

async function buildPool(opts) {
  const o = opts || {};
  const shapedMin = o.shapedMin != null ? o.shapedMin : SHAPED_MIN;
  const lifeMinChars = o.lifeMinChars != null ? o.lifeMinChars : LIFE_MIN_CHARS;
  const rows = await sheets.getRawSheetData('Simulation_Ledger');
  const h = rows[0];
  const find = (n) => h.findIndex((x) => String(x).toLowerCase() === n.toLowerCase());
  const iPop = find('POPID'), iName = find('Name'), iFirst = find('First'), iLast = find('Last');
  const iNh = find('Neighborhood'), iDial = find('DialState'), iBirth = find('BirthYear'), iLife = find('LifeHistory');
  // The live ledger has NO Occupation column — the role lives in RoleType ("Center Fielder,
  // Oakland A's"). The Occupation lookup missed silently since S262 and every woken citizen
  // voiced as "a resident" (flattening caught by Mike on the Danny Horn Tier-1 test, S300).
  let iOcc = find('Occupation'); if (iOcc < 0) iOcc = find('RoleType');
  const iMem = find('MemoryRegisters'); // AX, S282 — B3 unlived register feeds recall candidates
  const iTrait = find('TraitProfile'); // engine.53 — archetype for journalist matching (additive)
  const pool = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const dj = r[iDial];
    if (!dj || String(dj).trim().length < 5) continue;
    const cur = dials.currentDials(dj);
    if (!cur || dials.deviation(cur) < shapedMin) continue;
    let baseDials = null; try { const dp = JSON.parse(dj); baseDials = (dp && dp.base) || null; } catch (e) {} // T1a trajectory anchor
    const life = iLife >= 0 ? String(r[iLife] || '').trim() : '';
    if (life.length < lifeMinChars) continue;
    const name = (iName >= 0 && r[iName]) ? r[iName] : [r[iFirst], r[iLast]].filter(Boolean).join(' ');
    const nh = iNh >= 0 ? r[iNh] : '';
    if (!name || !nh) continue;
    if (/corliss/i.test(`${name} ${r[iFirst] || ''} ${r[iLast] || ''}`)) continue; // Mags is the anchor, not in rotation
    // engine.48 T12 — salience-weighted tail: up to 3 newest milestone-class lines (any age in
    // the raw window) + 2 newest texture lines, chronological order preserved. A wedding never
    // loses its slot to a mask-count (the flattening loop, S312 finding / S281 sibling).
    const allLines = life.split('\n').filter(Boolean);
    const tagOf = (l) => ((l.match(/\[([^\]]+)\]/) || [])[1] || '').trim();
    const salient = allLines.filter((l) => SALIENT_TAG.test(tagOf(l))).slice(-3);
    const texture = allLines.filter((l) => !SALIENT_TAG.test(tagOf(l))).slice(-(5 - salient.length));
    const keep = new Set([...salient, ...texture]);
    const lifeTail = allLines.filter((l) => keep.has(l)).slice(-5).join('\n');
    pool.push({
      popId: String(r[iPop]).toUpperCase(), name, occ: iOcc >= 0 ? r[iOcc] : '', nh,
      age: (iBirth >= 0 && r[iBirth]) ? (2041 - Number(r[iBirth])) : '',
      cur, baseDials, life: lifeTail, eventMag: recentEventMagnitude(lifeTail),
      memReg: iMem >= 0 ? String(r[iMem] || '') : '',
      archetype: iTrait >= 0 ? ((String(r[iTrait] || '').match(/Archetype:(\w+)/) || [])[1] || '') : '',
    });
  }
  return pool;
}

async function coResidents(nh, selfPop) {
  const ledgerObjs = await sheets.getSheetAsObjects('Simulation_Ledger');
  const mapObjs = await sheets.getSheetAsObjects('Neighborhood_Map').catch(() => []);
  const slicer = createSlicer({ ledger: ledgerObjs, neighborhoodMap: mapObjs, residentCap: RESIDENT_CAP + 4 });
  const sl = slicer.slice(nh);
  if (!sl || !sl.residents) return [];
  // names ONLY (grounding / anti-confabulation) — NO metrics (no-engine-aggregates-in-voice rule)
  return sl.residents.filter((rr) => String(rr.popId).toUpperCase() !== selfPop).slice(0, RESIDENT_CAP);
}

module.exports = {
  SHAPED_MIN, LIFE_MIN_CHARS, RESIDENT_CAP,
  PAGE_READBACK_N, PAGE_CANDIDATE_N, PAGE_REFLECTION_CAP,
  BOND_PHRASE, MILESTONE_TAGS, BOOKKEEPING_PREFIX,
  recentEventMagnitude, loadLifeArc, dialTrajectory, loadSportsSlice,
  loadNeighborhoodTexture, loadBonds, loadOwnPageReadback, buildPool, coResidents,
  loadCardAnchor, loadVoiceTexture, // engine.48 T10 + T11
};
