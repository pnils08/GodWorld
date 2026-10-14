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
// engine.102 W3 (wake-perception health read, kimi amendment 2): Health joined the
// milestone set — a hospitalization IS the citizen's current life state, and excluding
// it meant a hospitalized citizen woke on their last wedding instead of their ward bed.
const MILESTONE_TAGS = /^(Wedding|Birth|Retirement|Graduation|Stabilized|Health)$/i; // Death omitted: incoherent for a living reflector
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

// Loop doctrine (builder-direct 2026-08-04, kimi capture) — sheet→cron must be lossless: the
// ledger's STRUCTURAL family columns reach the wake (SpouseId, MaritalStatus, NumChildren,
// ChildrenIds, HouseholdId). loadBonds carries warmth for people with bond rows; before this,
// a citizen only "knew" they had family if a bond row happened to exist. Canon-anchored; never
// invents a name — an unresolved POPID renders status-only ("You're married.") or drops.
async function loadFamily(popId) {
  try {
    const led = await sheets.getRawSheetData('Simulation_Ledger');
    if (!led || led.length < 2) return '';
    const h = led[0];
    const col = (n) => h.findIndex((x) => String(x).toLowerCase() === n.toLowerCase());
    const iPop = col('POPID'), iName = col('Name'), iFirst = col('First'), iLast = col('Last');
    const iSpouse = col('SpouseId'), iMar = col('MaritalStatus'), iKids = col('ChildrenIds');
    const iNum = col('NumChildren'), iHh = col('HouseholdId');
    if (iPop < 0) return '';
    const nameOf = {};
    let me = null;
    for (let i = 1; i < led.length; i++) {
      const r = led[i];
      const k = String(r[iPop]).toUpperCase();
      nameOf[k] = (iName >= 0 && r[iName]) ? r[iName]
        : [iFirst >= 0 ? r[iFirst] : '', iLast >= 0 ? r[iLast] : ''].filter(Boolean).join(' ');
      if (k === popId) me = r;
    }
    if (!me) return '';
    const parts = [];
    const named = new Set([popId]);
    // spouse — SpouseId carries 'POP-NNNNN First Last'; resolve the ID against the live ledger
    // (the embedded name is write-time and can drift). Married-but-unresolved keeps the status.
    const mar = iMar >= 0 ? String(me[iMar] || '').trim().toLowerCase() : '';
    const spouseId = iSpouse >= 0 ? ((String(me[iSpouse] || '').match(/POP-\d{5}/) || [])[0] || '').toUpperCase() : '';
    const spouseName = spouseId ? nameOf[spouseId] : '';
    if (spouseName) { parts.push(`You're married to ${spouseName}`); named.add(spouseId); }
    else if (mar === 'married') parts.push(`You're married`);
    else if (mar === 'widowed') parts.push(`You're widowed`);
    else if (mar === 'divorced') parts.push(`You're divorced`);
    let kidNames = [];
    if (iKids >= 0 && me[iKids]) {
      try {
        kidNames = JSON.parse(me[iKids])
          .map((k) => { const id = String(k).toUpperCase(); if (nameOf[id]) named.add(id); return nameOf[id]; })
          .filter(Boolean);
      } catch (e) { /* malformed JSON -> count fallback */ }
    }
    const numKids = iNum >= 0 ? (Number(me[iNum]) || 0) : 0;
    if (kidNames.length) parts.push(`your ${kidNames.length > 1 ? 'children are' : 'child is'} ${kidNames.join(' and ')}`);
    else if (numKids > 0) parts.push(`you have ${numKids} ${numKids > 1 ? 'children' : 'child'}`);
    // who actually shares the roof — same HouseholdId, minus anyone already named above
    const hh = iHh >= 0 ? String(me[iHh] || '').trim() : '';
    if (hh) {
      const mates = [];
      for (let i = 1; i < led.length; i++) {
        const r = led[i];
        if (String(r[iHh] || '').trim() !== hh) continue;
        const k = String(r[iPop]).toUpperCase();
        if (named.has(k) || !nameOf[k]) continue;
        mates.push(nameOf[k]);
        if (mates.length >= 2) break;
      }
      if (mates.length) parts.push(`you share your home with ${mates.join(' and ')}`);
    }
    return parts.length ? parts.join('; ') + '.' : '';
  } catch (e) { return ''; }
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
const SALIENT_TAG = /^(Wedding|Birth|Death|Divorce|Retirement|Graduation|Promotion|Health|Critical|Recovering|Hospitalized|Stabilized|Setback|Recovery|Career-Transition|Career-Layoff|CivicRole-(Up|Down)-L|LifeEvent-(Promotion|Home)-(Up|Down)-(M|L)|Transgression-(Petty|Serious|Grave)|Resisted|E\d+)$/i;

async function buildPool(opts) {
  const o = opts || {};
  const shapedMin = o.shapedMin != null ? o.shapedMin : SHAPED_MIN;
  const lifeMinChars = o.lifeMinChars != null ? o.lifeMinChars : LIFE_MIN_CHARS;
  // pipeline.73 step 1: a citizen with a lived event this Cycle joins under the shaped floor (builder
  // 2026-10-14: the floor lifts for news-grade events only) and is marked livedOnly, so no other slot
  // draws them. Absent option = today's pool, byte for byte.
  const include = o.include instanceof Set ? o.include : null;
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
  // engine.147 wake-pack seam — the family line + the posture reach the pool entry, so every
  // voice (wake / exchange / edition voice) renders them without a per-citizen sheet read.
  const iLin = find('LineageId'), iHh = find('HouseholdId');
  // engine.286 R2-6 (builder 2026-10-12): the citizen's own record reaches the voice.
  const iTier = find('Tier'), iInc = find('Income'), iNW = find('NetWorth'), iDebt = find('DebtLevel');
  const lines = await loadHeritageLines();
  const homes = await loadHouseholdHomes();
  const pool = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const dj = r[iDial];
    if (!dj || String(dj).trim().length < 5) continue;
    const cur = dials.currentDials(dj);
    if (!cur) continue;
    let livedOnly = false;
    if (dials.deviation(cur) < shapedMin) {
      if (!include || !include.has(String(r[iPop]).toUpperCase())) continue;
      livedOnly = true;
    }
    let baseDials = null, maneuver = null;
    try { const dp = JSON.parse(dj); baseDials = (dp && dp.base) || null; maneuver = (dp && dp.maneuver) || null; } catch (e) {} // T1a trajectory anchor; engine.157 posture memory
    const life = iLife >= 0 ? String(r[iLife] || '').trim() : '';
    if (life.length < lifeMinChars && !livedOnly && !(include && include.has(String(r[iPop]).toUpperCase()))) continue; // pipeline.73: the lived event itself grounds the wake
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
      age: (iBirth >= 0 && r[iBirth]) ? (require('./citizenDerivation').currentSimYear() - Number(r[iBirth])) : '',
      cur, baseDials, life: lifeTail, eventMag: recentEventMagnitude(lifeTail),
      memReg: iMem >= 0 ? String(r[iMem] || '') : '',
      archetype: iTrait >= 0 ? ((String(r[iTrait] || '').match(/Archetype:(\w+)/) || [])[1] || '') : '',
      // engine.147 seam
      lineageId: iLin >= 0 ? String(r[iLin] || '').trim() : '',
      householdId: iHh >= 0 ? String(r[iHh] || '').trim() : '',
      line: (iLin >= 0 && r[iLin]) ? (lines[String(r[iLin]).trim()] || null) : null,
      maneuver,
      // engine.286 R2-6 — what the engine holds on this citizen (renderOwnRecord reads it)
      record: {
        tier: iTier >= 0 ? r[iTier] : '', income: iInc >= 0 ? r[iInc] : '',
        netWorth: iNW >= 0 ? r[iNW] : '', debtLevel: iDebt >= 0 ? r[iDebt] : '',
        home: (iHh >= 0 && r[iHh]) ? (homes[String(r[iHh]).trim()] || null) : null,
      },
      // engine.180: the cycle the posture last moved (a [Maneuver-*] line in the tail) — the wake slot reads it
      postureChangedCycle: dials.postureChangedCycle(lifeTail),
      ...(include ? { livedOnly, birthYear: iBirth >= 0 ? r[iBirth] : '', householdIdRaw: iHh >= 0 ? String(r[iHh] || '').trim() : '' } : {}),
    });
  }
  return pool;
}

// engine.147 wake-pack seam (bloodline-ascent plan §engine.156 "Pipeline seam") — the family
// line reaches the voice. One Heritage_Ledger read per pool build, header-resolved so the
// 16-column pre-engine.156 tab and the 23-column one both work (missing columns read as '').
// Fail-open {} — a missing tab never blocks a wake.
async function loadHeritageLines() {
  try {
    const rows = await sheets.getRawSheetData('Heritage_Ledger');
    if (!rows || rows.length < 2) return {};
    const h = rows[0].map((x) => String(x).trim());
    const out = {};
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const o = {};
      for (let k = 0; k < h.length; k++) if (h[k]) o[h[k]] = r[k] == null ? '' : r[k];
      const id = String(o.LineageId || '').trim();
      if (id) out[id] = o;
    }
    return out;
  } catch (e) { return {}; }
}

// engine.286 R2-6 — one Household_Ledger read per pool build: each active household's home.
// Fail-open {} — a missing tab never blocks a wake.
async function loadHouseholdHomes() {
  try {
    const rows = await sheets.getRawSheetData('Household_Ledger');
    if (!rows || rows.length < 2) return {};
    const h = rows[0].map((x) => String(x).trim());
    const at = (n) => h.indexOf(n);
    const iId = at('HouseholdId'), iType = at('HousingType'), iPay = at('MonthlyRent'), iInc = at('HouseholdIncome'),
      iHood = at('Neighborhood'), iStat = at('Status');
    const out = {};
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const id = String(r[iId] || '').trim();
      if (!id || (iStat >= 0 && String(r[iStat] || '').toLowerCase() !== 'active')) continue;
      out[id] = { type: String(r[iType] || '').toLowerCase(), monthly: r[iPay], householdIncome: r[iInc], hood: r[iHood] };
    }
    return out;
  } catch (e) { return {}; }
}

// engine.286 R2-6 (builder 2026-10-12, verbatim: "The citizen can absolutely know their data
// the engine holds on them. LLMs only see things on your side as numbers so it's just telling
// them who they are."). The citizen's OWN record, with its numbers, as who they are. Only this
// citizen's own fields — never another citizen's numbers. Blank or non-numeric fields are left
// out, never guessed. Pure: a function of the pool entry.
const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
const num = (v) => (v === '' || v == null || !isFinite(Number(String(v).replace(/[$,\s]/g, '')))) ? null : Number(String(v).replace(/[$,\s]/g, ''));
function renderOwnRecord(entry) {
  const rec = entry && entry.record;
  if (!rec) return '';
  const parts = [];
  const tier = num(rec.tier);
  if (tier >= 1 && tier <= 4) parts.push(`Tier ${tier} of 4 (Tier 1 is the top).`);
  const inc = num(rec.income);
  if (inc !== null) parts.push(inc > 0 ? `Income ${money(inc)} a year.` : 'No income right now.');
  const nw = num(rec.netWorth);
  if (nw !== null) parts.push(`Savings ${money(nw)}.`);
  const debt = num(rec.debtLevel);
  if (debt !== null) parts.push(debt > 0 ? `Debt level ${debt} of 6.` : 'No debt.');
  const h = rec.home;
  if (h && (h.type === 'owned' || h.type === 'rented')) {
    const pay = num(h.monthly), hhInc = num(h.householdIncome);
    const where = h.hood ? ` in ${h.hood}` : '';
    let line = h.type === 'owned' ? `You own your home${where}` : `You rent${where}`;
    if (pay !== null && pay > 0) {
      line += `: ${money(pay)} a month ${h.type === 'owned' ? 'on the mortgage' : 'in rent'}`;
      if (hhInc !== null && hhInc > 0) {
        const share = (pay * 12) / hhInc;
        line += `, ${Math.round(share * 100)}% of your household's ${money(hhInc)} a year${share > 0.5 ? ' — over half' : ''}`;
      }
    }
    parts.push(line + '.');
  }
  return parts.length ? 'Your record — what the city holds on you: ' + parts.join(' ') : '';
}

// Plain-language standing — what the family holds and how the citizen is playing, as a person
// would say it. No engine number HERE: no score, no LIN- id, no tier token — the family line
// stays words. (engine.286 R2-6: the citizen's own numbers now ride renderOwnRecord, above.)
// The engine is the cause; the voice gets the feeling (feedback_canon-is-color-not-data-echo).
// Hold renders nothing (engine.157 — hold is silence). Pure: a function of the pool entry.
const TIER_PHRASE = {
  founding: 'a founding name — on the books, not yet a standing',
  established: 'established — roots deep enough to notice',
  prominent: 'prominent — a name people in this city know',
  dynasty: 'a dynasty — one of the names this city is built around',
};
const GOAL_PHRASE = { // mirrors maneuverGoalPhrase_ (phase05-citizens/maneuverEngine.js), second person
  establish: 'a place of your own first',
  home: 'the house first',
  wealth: 'the money next',
  tenure: 'the name to keep',
  revive: 'the name to bring back',
};
function simTag(cycle) {
  const c = Number(cycle);
  if (!c || c < 1) return '';
  return 'Y' + (Math.floor((c - 1) / 52) + 1) + 'C' + (((c - 1) % 52) + 1);
}
function renderStanding(entry) {
  const parts = [];
  const line = entry && entry.line;
  if (line && String(line.FamilyName || '').trim()) {
    const fam = String(line.FamilyName).trim();
    const status = String(line.Status || '').trim().toLowerCase();
    const tier = String(line.HeritageTier || '').trim().toLowerCase();
    const founded = simTag(line.FoundedCycle);
    let s = `Your family, the ${fam} line, is on the city's ledger`;
    if (founded) s += ` (since ${founded})`;
    if (status === 'dormant') {
      s += ' — but the name has gone quiet; nobody is carrying it right now';
    } else if (TIER_PHRASE[tier]) {
      s += `: ${TIER_PHRASE[tier]}`;
      const tt = Number(line.TierTenure);
      if (tt >= 8) s += `, and it has held that ${tt >= 52 ? 'for years' : 'a good while'}`;
      const peak = String(line.PeakTier || '').trim().toLowerCase();
      if (peak && peak !== tier && TIER_PHRASE[peak]) s += `; it once stood ${peak}`;
    }
    const holds = [];
    const homes = Number(line.HomesOwned) || 0;
    let biz = 0; try { const b = JSON.parse(line.BusinessesOwned || '[]'); biz = Array.isArray(b) ? b.length : 0; } catch (e) {}
    if (homes) holds.push(homes > 1 ? `${homes} homes` : 'a home');
    if (biz) holds.push(biz > 1 ? `${biz} businesses` : 'a business');
    const gens = Number(line.Generations) || 0;
    if (gens >= 2) holds.push(`${gens} generations under one name`);
    if (holds.length) s += `. The family holds ${holds.join(', ')}`;
    parts.push(s + '.');
  }
  const m = entry && entry.maneuver;
  if (m && typeof m === 'object') {
    const p = String(m.p || '').toLowerCase();
    const g = GOAL_PHRASE[String(m.g || '').toLowerCase()] || '';
    if (p === 'climb') parts.push(`Lately you've been playing to climb${g ? ' — ' + g : ''}.`);
    else if (p === 'retreat') parts.push(`Lately you've been pulling in, protecting what you hold${g ? ' — ' + g + ' can wait' : ''}.`);
    else if (p === 'hold' && g) parts.push(`What you're playing for, when the moment comes: ${g}.`); // engine.180: the goal reaches a hold too
  }
  // engine.180 (S438): what the last stretch threw at you — pressure and the named
  // events as words (never a number); ambient tints stay out.
  const thrownWords = dials.thrown(entry && entry.life);
  if (thrownWords) parts.push(`What the last stretch threw at you: ${thrownWords}.`);
  return parts.join(' ');
}

// engine.102 W3 (wake-perception health read, kimi amendment 2) — the citizen's CURRENT
// health state straight from the ledger row: Status (only when it is a tracked health
// state), HealthCause, StatusStartCycle. The wake crons read bonds and LifeHistory
// milestones; this is the direct "you are in a hospital bed NOW" read the loop doctrine
// requires — a hospitalized citizen wakes changed, not just row-changed. Fail-open ''.
const HEALTH_STATES = /^(hospitalized|injured|serious-condition|recovering|critical)$/i;
async function loadHealthState(popId) {
  try {
    const rows = await sheets.getRawSheetData('Simulation_Ledger');
    if (!rows || rows.length < 2) return '';
    const h = rows[0];
    const col = (n) => h.findIndex((x) => String(x).toLowerCase() === n.toLowerCase());
    const iPop = col('POPID'), iStatus = col('Status'), iCause = col('HealthCause'), iStart = col('StatusStartCycle');
    if (iPop < 0 || iStatus < 0) return '';
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][iPop]).toUpperCase() !== String(popId).toUpperCase()) continue;
      const status = String(rows[i][iStatus] || '').trim();
      if (!HEALTH_STATES.test(status)) return '';
      const cause = iCause >= 0 ? String(rows[i][iCause] || '').trim() : '';
      const since = iStart >= 0 ? String(rows[i][iStart] || '').trim() : '';
      const phrase = status.toLowerCase() === 'recovering' ? 'recovering' :
                     status.toLowerCase() === 'hospitalized' ? 'in the hospital' :
                     status.toLowerCase() === 'critical' ? 'in critical condition' :
                     status.toLowerCase() === 'injured' ? 'recovering from an injury' :
                     'living with a serious medical condition';
      return `You are currently ${phrase}${cause ? ` (${cause})` : ''}${since ? `, since cycle ${since}` : ''}.`;
    }
    return '';
  } catch (e) { return ''; }
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

// ---------------------------------------------------------------------------
// pipeline.73 step 1 — THE LIVED WAKE (builder 2026-10-14: news-grade life events only — birth,
// death, retirement, hospital stay or recovery, promotion; about 5–7 a Cycle inside the 21 wakes).
// Each kind is read from the record that proves it, not from a tag alone (codex 2026-10-14):
//   birth       LifeHistory_Log [Birth] "welcomed a new child" — the parent; the newborn's "born to" line is not a wake
//   retirement  LifeHistory_Log [Retirement]
//   promotion   LifeHistory_Log [Promotion] — the career writer's completed raise (a held LifeEvent break is not one)
//   hospital    Hospital_Ledger AdmitCycle / DischargeCycle — the stay itself; Health / Recovering tags also carry colds
//   death       LifeHistory_Log [Death] → the survivor (builder: "the household (or bond) row that carries the loss"):
//               spouse, then household, then child, then parent, then the strongest active bond
// An event's id is kind:subject:cycle. Window = this Cycle and the one before, so an event pending at the
// Sunday rollover still wakes. A lived wake spends its event only after the page write lands.
// ---------------------------------------------------------------------------
const LIVED_WINDOW = 1;            // Cycles back from the current one an unspent event still waits
const LIVED_CAP_PER_CYCLE = 7;     // the builder's "about 5–7"; the rest of the 21 stay voiced / posture / rotation
const LIVED_MIN_AGE = 16;
const LIVED_KIND_ORDER = { death: 0, hospital: 1, birth: 2, retirement: 3, promotion: 4 };

const hdr = (rows) => { const h = (rows && rows[0]) || []; return (n) => h.findIndex((x) => String(x).toLowerCase() === n.toLowerCase()); };
const ids = (v) => String(v || '').split(/[,;\s]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^POP-\d{5}$/.test(x));

// Pure: the Cycle's lived events, one recipient each. Inputs are raw sheet arrays (header row first).
function livedEventsFrom(src, cycle) {
  const out = [];
  const cyc = Number(cycle);
  if (!cyc) return out;
  const seenId = {};
  const uid = (base) => { const n = seenId[base] = (seenId[base] || 0) + 1; return n === 1 ? base : base + '#' + n; }; // two same-kind events in one Cycle keep two receipts
  const inWindow = (c) => { const n = Number(c); return n >= cyc - LIVED_WINDOW && n <= cyc; };
  const log = src.log || [];
  const L = hdr(log), lPop = L('POPID'), lTag = L('EventTag'), lText = L('EventText'), lCyc = L('Cycle');
  const deaths = [];
  for (let i = 1; i < log.length; i++) {
    const r = log[i];
    if (!inWindow(r[lCyc])) continue;
    const tag = String(r[lTag] || '').trim(), text = String(r[lText] || '').trim(), pop = String(r[lPop] || '').toUpperCase(), c = Number(r[lCyc]);
    if (!/^POP-\d{5}$/.test(pop)) continue;
    if (BOOKKEEPING_PREFIX.test(text)) continue; // "Emerged into Tier-4 in …" rides the Promotion tag; it is the ledger's bookkeeping, not a raise
    let kind = null;
    if (/^Birth$/i.test(tag) && /welcomed a new child/i.test(text)) kind = 'birth';
    else if (/^Retirement$/i.test(tag)) kind = 'retirement';
    else if (/^Promotion$/i.test(tag)) kind = 'promotion';
    else if (/^Death$/i.test(tag)) { deaths.push({ pop, c }); continue; }
    if (kind) out.push({ id: uid(`${kind}:${pop}:${c}`), kind, cycle: c, subject: pop, recipients: [{ pop, rel: 'self' }], text });
  }
  const hosp = src.hospital || [];
  const H = hdr(hosp), hPop = H('POPID'), hAdm = H('AdmitCycle'), hDis = H('DischargeCycle'), hCause = H('Cause'), hId = H('AdmissionId');
  for (let i = 1; i < hosp.length; i++) {
    const r = hosp[i], pop = String(r[hPop] || '').toUpperCase();
    if (!/^POP-\d{5}$/.test(pop) || String(r[hId] || '') === 'AdmissionId') continue; // a repeated header row is not a stay
    const cause = String(r[hCause] || '').trim();
    const aid = String(r[hId] || '').trim() || pop;
    if (inWindow(r[hAdm])) out.push({ id: uid(`hospital:${aid}:${Number(r[hAdm])}:in`), kind: 'hospital', cycle: Number(r[hAdm]), subject: pop, recipients: [{ pop, rel: 'self' }], phase: 'admitted', cause });
    if (String(r[hDis] || '').trim() && inWindow(r[hDis])) out.push({ id: uid(`hospital:${aid}:${Number(r[hDis])}:out`), kind: 'hospital', cycle: Number(r[hDis]), subject: pop, recipients: [{ pop, rel: 'self' }], phase: 'discharged', cause });
  }
  if (deaths.length) {
    const ar = src.archive || [], A = hdr(ar);
    const aPop = A('POPID'), aFirst = A('First'), aLast = A('Last'), aHh = A('HouseholdId'), aSp = A('SpouseId'), aKids = A('ChildrenIds'), aPar = A('ParentIds');
    const led = src.ledger || [], G = hdr(led), gPop = G('POPID'), gHh = G('HouseholdId'), gSt = G('Status');
    const living = new Map();
    for (let i = 1; i < led.length; i++) {
      const st = String(led[i][gSt] || '').toLowerCase();
      if (st === 'deceased' || st === 'archived') continue;
      living.set(String(led[i][gPop] || '').toUpperCase(), led[i]);
    }
    const bonds = src.bonds || [], B = hdr(bonds), bA = B('CitizenA'), bB = B('CitizenB'), bI = B('Intensity'), bS = B('Status');
    for (const d of deaths) {
      const row = ar.slice(1).find((x) => String(x[aPop] || '').toUpperCase() === d.pop);
      const name = row ? [row[aFirst], row[aLast]].filter(Boolean).join(' ').trim() : '';
      const cand = [];
      const add = (p, rel) => { if (p && p !== d.pop && living.has(p) && !cand.some((c) => c.pop === p)) cand.push({ pop: p, rel }); };
      if (row) {
        ids(row[aSp]).forEach((x) => add(x, 'spouse'));
        const hh = String(row[aHh] || '').trim();
        if (hh) [...living.entries()].filter(([p, r]) => String(r[gHh] || '').trim() === hh).map(([p]) => p).sort().forEach((x) => add(x, 'household'));
        ids(row[aKids]).sort().forEach((x) => add(x, 'parent'));
        ids(row[aPar]).sort().forEach((x) => add(x, 'child'));
      }
      if (bA >= 0) {
        const bl = [];
        for (let i = 1; i < bonds.length; i++) {
          const b = bonds[i]; if (String(b[bS] || '').toLowerCase() !== 'active') continue;
          const a = String(b[bA] || '').toUpperCase(), z = String(b[bB] || '').toUpperCase();
          const other = a === d.pop ? z : z === d.pop ? a : null;
          if (other) bl.push({ p: other, n: Number(b[bI]) || 0 });
        }
        bl.sort((x, y) => (y.n - x.n) || (x.p < y.p ? -1 : 1)).forEach((x) => add(x.p, 'bond'));
      }
      if (cand.length && name) out.push({ id: uid(`death:${d.pop}:${d.c}`), kind: 'death', cycle: d.c, subject: d.pop, recipients: cand, deceasedName: name });
    }
  }
  return out;
}

// Pure: the line the lived wake hands the voice. Plain words, no ids, no numbers.
const SAFE_CAUSE = /^[a-z][a-z ,'-]{2,60}$/i; // Hospital_Ledger Cause also takes raw HealthCause from reconciliation — prose only reaches the voice
function renderLivedLine(ev, cycle, rel) {
  if (!ev) return '';
  const when = Number(ev.cycle) === Number(cycle) ? 'This week' : 'Last week';
  const cause = SAFE_CAUSE.test(String(ev.cause || '').trim()) ? String(ev.cause).trim() : '';
  const name = /^[A-Za-z][A-Za-z .'-]{1,60}$/.test(String(ev.deceasedName || '')) ? ev.deceasedName : '';
  switch (ev.kind) {
    case 'death': {
      const who = { spouse: 'your spouse', household: 'who shared your home', parent: 'your parent', child: 'your child', bond: 'someone close to you' }[rel || (ev.recipients && ev.recipients[0] && ev.recipients[0].rel)] || 'someone close to you';
      return name ? `${when}, ${name}, ${who}, died` : `${when}, someone close to you died`;
    }
    case 'hospital': return ev.phase === 'admitted'
      ? `${when} you were admitted to the hospital${cause ? ' after ' + cause : ''}`
      : `${when} you came home from the hospital${cause ? ' after ' + cause : ''}`;
    case 'birth': return `${when} you welcomed a new child into your family`;
    case 'retirement': return `${when} you retired`;
    case 'promotion': return `${when} you were promoted at work`;
    default: return '';
  }
}

// Pure: the next lived event to wake for, or null. Unspent, under the Cycle cap, recipient in the pool and
// 16 or older by a valid BirthYear, one birth per non-blank household. Death first, then hospital, birth,
// retirement, promotion; older Cycle first inside a kind.
function pickLived(events, pool, state, cycle, simYear) {
  const st = state || {};
  const spent = st.livedSpent || {};
  const used = (st.livedCount || {})[cycle] || 0;
  if (used >= LIVED_CAP_PER_CYCLE) return null;
  const byPop = new Map(pool.map((p) => [p.popId, p]));
  const ok = (p) => { if (!p) return false; const by = Number(p.birthYear); return by > 1900 && simYear - by >= LIVED_MIN_AGE; };
  // a birth already woken in a household this Cycle covers the household (spent ids carry across wakes)
  const hhOf = (ev) => { const r = ev.recipients && ev.recipients[0]; const p = r && byPop.get(r.pop); return p && p.householdIdRaw ? p.householdIdRaw + ':' + ev.cycle : ''; };
  const spentHh = new Set(events.filter((e) => e.kind === 'birth' && spent[e.id]).map(hhOf).filter(Boolean));
  const sorted = events.slice().sort((a, b) => (LIVED_KIND_ORDER[a.kind] - LIVED_KIND_ORDER[b.kind]) || (a.cycle - b.cycle) || (a.id < b.id ? -1 : 1));
  for (const ev of sorted) {
    if (spent[ev.id]) continue;
    if (ev.kind === 'birth') { const k = hhOf(ev); if (k && spentHh.has(k)) continue; }
    const r = (ev.recipients || []).find((x) => ok(byPop.get(x.pop))); // the first eligible survivor, not only the first named
    if (!r) continue;
    return { c: byPop.get(r.pop), event: ev, rel: r.rel };
  }
  return null;
}

async function loadLivedEvents(cycle) {
  try {
    const [log, hospital, ledger] = await Promise.all(['LifeHistory_Log', 'Hospital_Ledger', 'Simulation_Ledger'].map((t) => sheets.getRawSheetData(t)));
    const cyc = Number(cycle);
    const L = hdr(log), lTag = L('EventTag'), lCyc = L('Cycle');
    const anyDeath = log.slice(1).some((r) => /^Death$/i.test(String(r[lTag] || '').trim()) && Number(r[lCyc]) >= cyc - LIVED_WINDOW && Number(r[lCyc]) <= cyc);
    const [archive, bonds] = anyDeath ? await Promise.all([sheets.getRawSheetData('Citizen_Archive'), sheets.getRawSheetData('Relationship_Bond_Ledger')]) : [[], []];
    return livedEventsFrom({ log, hospital, ledger, archive, bonds }, cycle);
  } catch (e) { return { error: e.message }; }
}

module.exports = {
  SHAPED_MIN, LIFE_MIN_CHARS, RESIDENT_CAP,
  PAGE_READBACK_N, PAGE_CANDIDATE_N, PAGE_REFLECTION_CAP,
  BOND_PHRASE, MILESTONE_TAGS, BOOKKEEPING_PREFIX,
  recentEventMagnitude, loadLifeArc, dialTrajectory, loadSportsSlice,
  loadNeighborhoodTexture, loadBonds, loadFamily, loadOwnPageReadback, buildPool, coResidents,
  loadCardAnchor, loadVoiceTexture, // engine.48 T10 + T11
  loadHealthState, HEALTH_STATES, // engine.102 W3 — wake-perception health read
  loadHeritageLines, renderStanding, simTag, TIER_PHRASE, GOAL_PHRASE, // engine.147 wake-pack seam
  loadHouseholdHomes, renderOwnRecord, // engine.286 R2-6 — the citizen's own record
  livedEventsFrom, renderLivedLine, pickLived, loadLivedEvents, LIVED_CAP_PER_CYCLE, LIVED_WINDOW, LIVED_MIN_AGE, // pipeline.73 step 1
};
