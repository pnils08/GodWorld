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
const { _hash53 } = require('/root/GodWorld/lib/provocationBank'); // engine.197 — the wake draw's seeded hash

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
    return `${rec}${streak}. ${String(r[iNotes]).trim()}`;
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
    const iNum = col('NumChildren'), iHh = col('HouseholdId'), iPar = col('ParentIds');
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
    // engine.304 D11 (builder 2026-10-19, statement 13: "the parent should always be able to be found"): a spouse,
    // child or parent who died is named from Citizen_Archive — read only when a family POPID is not on the ledger
    const famIds = [iSpouse, iKids, iPar].filter((c) => c >= 0).map((c) => String(me[c] || '')).join(' ').match(/POP-\d{5}/g) || [];
    const lateOf = {};
    if (famIds.some((x) => !nameOf[x.toUpperCase()])) {
      try {
        const ar = await sheets.getRawSheetData('Citizen_Archive');
        const ah = (ar && ar[0]) || [];
        const aP = ah.indexOf('POPID'), aF = ah.indexOf('First'), aL = ah.indexOf('Last'), aR = ah.indexOf('ArchiveReason');
        for (let i = 1; ar && aP >= 0 && aR >= 0 && i < ar.length; i++) { // no reason column → nobody is called the late (codex cut-4 §4)
          if (String(ar[i][aR] || '') !== 'deceased') continue;
          const k = String(ar[i][aP] || '').toUpperCase();
          if (k && !nameOf[k]) lateOf[k] = [ar[i][aF], ar[i][aL]].map((x) => String(x || '').trim()).filter(Boolean).join(' ');
        }
      } catch (e) { /* the archive is unreadable — the living family still speaks */ }
    }
    const late = (id) => (lateOf[id] ? `the late ${lateOf[id]}` : '');
    // engine.304 (builder 2026-10-19, R18): family the lottery linked from the background pool — Generic_Citizens
    // Status Family, FamilyOf = this citizen. The wake tells them their names ("once a name goes into that data he
    // will know his wife and/or kids"); their own words naming them are what brings them to the ledger.
    const linked = { spouse: [], child: [], parent: [] };
    try {
      const gc = await sheets.getRawSheetData('Generic_Citizens');
      const gh = gc[0] || [];
      const gF = gh.indexOf('First'), gL = gh.indexOf('Last'), gS = gh.indexOf('Status'), gOf = gh.indexOf('FamilyOf'), gR = gh.indexOf('FamilyRole');
      if (gF >= 0 && gL >= 0 && gS >= 0 && gOf >= 0 && gR >= 0) {
        for (let i = 1; i < gc.length; i++) {
          const r = gc[i];
          if (String(r[gS] || '').trim().toLowerCase() !== 'family' || String(r[gOf] || '').trim().toUpperCase() !== popId) continue;
          const role = String(r[gR] || '').trim().toLowerCase(), nm = [r[gF], r[gL]].map((x) => String(x || '').trim()).filter(Boolean).join(' ');
          if (linked[role] && nm.indexOf(' ') > 0) linked[role].push(nm);
        }
      }
    } catch (e) { /* the pool is unreadable — the ledger family still speaks */ }
    const parts = [];
    const named = new Set([popId]);
    // spouse — SpouseId carries 'POP-NNNNN First Last'; resolve the ID against the live ledger
    // (the embedded name is write-time and can drift). Married-but-unresolved keeps the status.
    const mar = iMar >= 0 ? String(me[iMar] || '').trim().toLowerCase() : '';
    const spouseId = iSpouse >= 0 ? ((String(me[iSpouse] || '').match(/POP-\d{5}/) || [])[0] || '').toUpperCase() : '';
    const spouseName = spouseId ? nameOf[spouseId] : '';
    // engine.302: the status speaks first — a widow keeps the late spouse's SpouseId (heritage reads it), and
    // the deceased row stays on the live ledger until Phase 11 archives it
    if (mar === 'married' && spouseName) { parts.push(`You're married to ${spouseName}`); named.add(spouseId); }
    else if (mar === 'married' && linked.spouse.length) parts.push(`You're married to ${linked.spouse[0]}`);
    else if (mar === 'married') parts.push(`You're married`);
    else if (mar === 'widowed') parts.push(spouseId && (nameOf[spouseId] || lateOf[spouseId]) ? `You're widowed — your late spouse was ${nameOf[spouseId] || lateOf[spouseId]}` : `You're widowed`);
    else if (mar === 'divorced') parts.push(`You're divorced`);
    let kidNames = [];
    if (iKids >= 0 && me[iKids]) {
      try {
        kidNames = JSON.parse(me[iKids])
          .map((k) => { const id = String(k).toUpperCase(); if (nameOf[id]) named.add(id); return nameOf[id] || late(id); })
          .filter(Boolean);
      } catch (e) { /* malformed JSON -> count fallback */ }
    }
    const numKids = iNum >= 0 ? (Number(me[iNum]) || 0) : 0;
    kidNames = kidNames.concat(linked.child);
    if (kidNames.length) {
      parts.push(`your ${kidNames.length > 1 ? 'children are' : 'child is'} ${kidNames.join(' and ')}`);
      if (numKids > kidNames.length) parts.push(`you have ${numKids - kidNames.length} more`); // the rest are off-camera
    }
    else if (numKids > 0) parts.push(`you have ${numKids} ${numKids > 1 ? 'children' : 'child'}`);
    // agy review §6: parents on the ledger are named beside the linked ones, never left to read as housemates
    const ledgerParents = iPar >= 0 ? ((String(me[iPar] || '').match(/POP-\d{5}/g) || []).map((x) => x.toUpperCase()).filter((x) => nameOf[x] || lateOf[x])) : [];
    ledgerParents.forEach((x) => named.add(x));
    const parentNames = ledgerParents.map((x) => nameOf[x] || late(x)).concat(linked.parent);
    if (parentNames.length) parts.push(`your ${parentNames.length > 1 ? 'parents are' : 'parent is'} ${parentNames.join(' and ')}`);
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
    const res = await page.recentPage_(popId, PAGE_CANDIDATE_N, { skipTypes: ['show'] }); // pipeline.95 — show docs never use up the candidates
    const candidates = ((res && res.results) || [])
      // typed TENSION lines are not memories; a show record (pipeline.95) reaches the pilot as its own block, not a reflection
      .filter((r) => !['tension', 'show'].includes(String((r && r.metadata && r.metadata.type) || '')))
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

// The wake's five-line life block: up to 3 newest salient lines + newest texture, chronological.
// pipeline.93: a pinned line (an owed event's own line) always holds a slot. No pins = the old tail.
function pinMatches(pin, line) {
  const head = pin.stamp + ' — ';
  if (!line.startsWith(head)) return false;
  const body = line.slice(head.length);
  return pin.body != null ? body === pin.body : pin.re.test(body);
}
const lineTag = (l) => ((l.match(/\[([^\]]+)\]/) || [])[1] || '').trim();
function lifeTailPlain(allLines) {
  const salient = allLines.filter((l) => SALIENT_TAG.test(lineTag(l))).slice(-3);
  const texture = allLines.filter((l) => !SALIENT_TAG.test(lineTag(l))).slice(-(5 - salient.length));
  const keep = new Set([...salient, ...texture]);
  return allLines.filter((l) => keep.has(l)).slice(-5).join('\n');
}
// Pins hold line occurrences (indices), so two identical lines are two events' evidence (codex round 3 F1).
function lifeTailOf(allLines, pins) {
  const pinned = new Set();
  for (const p of pins || []) {
    for (let i = allLines.length - 1; i >= 0; i--) if (!pinned.has(i) && pinMatches(p, allLines[i])) { pinned.add(i); break; }
  }
  if (!pinned.size) return lifeTailPlain(allLines);
  const free = allLines.map((l, i) => i).filter((i) => !pinned.has(i));
  const isSal = (i) => SALIENT_TAG.test(lineTag(allLines[i]));
  const nSal = Math.min(3, 5 - pinned.size);
  const salient = nSal > 0 ? free.filter(isSal).slice(-nSal) : [];
  const nTex = 5 - pinned.size - salient.length;
  const texture = nTex > 0 ? free.filter((i) => !isSal(i)).slice(-nTex) : [];
  const keep = new Set([...pinned, ...salient, ...texture]);
  return allLines.filter((l, i) => keep.has(i)).slice(-5).join('\n');
}

async function buildPool(opts) {
  const o = opts || {};
  const shapedMin = o.shapedMin != null ? o.shapedMin : SHAPED_MIN;
  const lifeMinChars = o.lifeMinChars != null ? o.lifeMinChars : LIFE_MIN_CHARS;
  // pipeline.73 step 1: a citizen with a lived event this Cycle joins under the shaped floor (builder
  // 2026-10-14: the floor lifts for news-grade events only) and is marked livedOnly, so no other slot
  // draws them. Absent option = today's pool, byte for byte.
  const include = o.include instanceof Set ? o.include : null;
  // engine.197 D1 — optional out-param: why rows did not reach the pool, so a skip is never silent.
  const stats = (o.stats && typeof o.stats === 'object') ? o.stats : null;
  const rows = await sheets.getRawSheetData('Simulation_Ledger');
  if (stats) Object.assign(stats, { rows: rows.length - 1, dial: 0, nameHood: 0, rule: 0 });
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
    if (!dj || String(dj).trim().length < 5) { if (stats) stats.dial++; continue; }
    const cur = dials.currentDials(dj);
    if (!cur) { if (stats) stats.dial++; continue; }
    let livedOnly = false;
    if (dials.deviation(cur) < shapedMin) {
      if (!include || !include.has(String(r[iPop]).toUpperCase())) { if (stats) stats.rule++; continue; }
      livedOnly = true;
    }
    let baseDials = null, maneuver = null;
    try { const dp = JSON.parse(dj); baseDials = (dp && dp.base) || null; maneuver = (dp && dp.maneuver) || null; } catch (e) {} // T1a trajectory anchor; engine.157 posture memory
    const life = iLife >= 0 ? String(r[iLife] || '').trim() : '';
    if (life.length < lifeMinChars && !livedOnly && !(include && include.has(String(r[iPop]).toUpperCase()))) { if (stats) stats.rule++; continue; } // pipeline.73: the lived event itself grounds the wake
    const name = (iName >= 0 && r[iName]) ? r[iName] : [r[iFirst], r[iLast]].filter(Boolean).join(' ');
    const nh = iNh >= 0 ? r[iNh] : '';
    if (!name || !nh) { if (stats) stats.nameHood++; continue; }
    // engine.48 T12 — salience-weighted tail: up to 3 newest milestone-class lines (any age in
    // the raw window) + 2 newest texture lines, chronological order preserved. A wedding never
    // loses its slot to a mask-count (the flattening loop, S312 finding / S281 sibling).
    const allLines = life.split('\n').filter(Boolean);
    const lifeTail = lifeTailOf(allLines);
    pool.push({
      popId: String(r[iPop]).toUpperCase(), name, occ: iOcc >= 0 ? r[iOcc] : '', nh,
      age: (iBirth >= 0 && r[iBirth]) ? (require('./citizenDerivation').currentSimYear() - Number(r[iBirth])) : '',
      cur, baseDials, life: lifeTail, lifeLines: allLines, eventMag: recentEventMagnitude(lifeTail),
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
// pipeline.73 step 1 — THE LIVED EVENTS (builder 2026-10-14: news-grade life events only — birth,
// death, retirement, hospital stay or recovery, promotion). Since engine.197 (builder 2026-10-17) they
// no longer buy a wake slot: the lottery draws, and livedFor hands the drawn citizen their own event.
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

// engine.197 (builder 2026-10-17: "we have enough purpose behind a cron wake to avoid giving
// preferential treatment") — a lived event is perception, not priority. Pure: the drawn citizen's
// own unspent event, or null. Spent per recipient ("eventId:POPID"), so each survivor of a death and
// each parent of a birth perceives it once; a bare "eventId" receipt left by the retired lived slot
// counts as spent for every recipient. Newest Cycle first, ties by id.
function livedSpentKey(eventId, popId) { return eventId + ':' + popId; }
function livedFor(popId, events, state, prefer) {
  const spent = (state && state.livedSpent) || {};
  const pop = String(popId || '').toUpperCase();
  const first = (ev) => (prefer && prefer(ev) ? 1 : 0); // pipeline.93: an owed admission outranks a newer lived event
  const mine = (events || [])
    .map((ev) => ({ ev, r: (ev.recipients || []).find((x) => x.pop === pop) }))
    .filter((m) => m.r && !spent[m.ev.id] && !spent[livedSpentKey(m.ev.id, pop)])
    .sort((a, b) => (first(b.ev) - first(a.ev)) || (b.ev.cycle - a.ev.cycle) || (a.ev.id < b.ev.id ? -1 : 1));
  return mine.length ? { event: mine[0].ev, rel: mine[0].r.rel } : null;
}

// engine.197 — the wake's state after a landed page write. Pure on the state object it is handed:
// spends the drawn citizen's event under eventId:POPID (value = Cycle, for the existing 3-Cycle expiry),
// ages old receipts out, and drops the retired rotation state (100-recent list, lived Cycle cap).
// Returns the key spent, or null.
function recordLivedSpend(state, lived, popId, cycle) {
  delete state.recent; delete state.livedCount;
  if (!lived || !lived.event) return null;
  const key = livedSpentKey(lived.event.id, String(popId).toUpperCase());
  state.livedSpent = state.livedSpent || {};
  state.livedSpent[key] = cycle;
  for (const k of Object.keys(state.livedSpent)) if (Number(state.livedSpent[k]) < cycle - 3) delete state.livedSpent[k];
  return key;
}

// engine.197 — the wake's whole selection. Pure. A forced POPID present in the pool wins; otherwise
// one seeded draw over the whole pool, weight 1 + 2·eventMag (builder 2026-10-17: the dial-distance
// weight, the 100-recent lockout and the voiced / lived / posture slots are gone). The seed carries
// the Central date: a Cycle spans ~7 days, and a cycle+wake seed alone drew one citizen all week.
function wakeSeedKey(cycle, wake, centralDate) { return 'select:' + cycle + ':' + wake + ':' + centralDate; }
function selectWakeCitizen(pool, opts) {
  const o = opts || {};
  if (!pool || !pool.length) return null;
  if (o.forcePop) {
    const forced = pool.find((p) => p.popId === String(o.forcePop).toUpperCase());
    if (forced) return { c: forced, slot: 'forced' };
  }
  // pipeline.95 — a pilot's reserved wake comes first: its own reserve, on top of the owed one (builder 2026-10-30).
  const showRes = Number(o.showReserve) || 0;
  if (showRes > 0 && (Number(o.showUsed) || 0) < showRes && o.showReady && o.showReady.length) {
    const top = pool.find((p) => p.popId === o.showReady[0].pop);
    if (top) return { c: top, slot: 'show' };
  }
  const reserve = Number(o.owedReserve) || 0;
  if (reserve > 0 && (Number(o.owedUsed) || 0) < reserve && o.owedReady && o.owedReady.length) {
    const top = pool.find((p) => p.popId === o.owedReady[0].pop);
    if (top) return { c: top, slot: 'owed' };
  }
  const weights = pool.map((p) => 1 + (Number(p.eventMag) || 0) * 2);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let x = (_hash53(String(o.seedKey), 0x5eed) % Math.max(1, Math.floor(total * 1000))) / 1000;
  for (let i = 0; i < pool.length; i++) {
    if (x < weights[i]) return { c: pool[i], slot: 'rotation' };
    x -= weights[i];
  }
  return { c: pool[0], slot: 'rotation' };
}

// ---------------------------------------------------------------------------
// pipeline.93 — owed responses (builder 2026-10-29, plan docs/plans/2026-10-29-owed-responses.md).
// A listed event hitting a named citizen holds them one of R reserved wakes a Cycle. Owed picks
// WHO wakes, never what they are told: the event reaches the voice as their own life line (pinned
// in the life block), and nothing asks for a response. Derived each wake from the record that
// proves the event; the state file holds only receipts.
// ---------------------------------------------------------------------------
const OWED_RESERVE = 6;     // ruled 6 a Cycle (the crons run this tree)
const OWED_WINDOW = 2;      // the event's own Cycle and the next; then the mark lapses
const OWED_STAKE_BAR = 1000; // a wager over this owes, won or lost
const OWED_WIN_BAR = 500;    // net winnings over this owe

// Chaos severity is the config's own: vehicle|outcome → { severity, tag, display }.
function chaosOutcomeIndex(configs) {
  const idx = {};
  for (const v of configs || []) {
    for (const oc of v.textureOutcomes || []) {
      idx[v.name + '|' + oc.outcome] = { severity: oc.severity, tag: oc.lifeHistoryTag || '', display: v.displayName || v.name };
    }
  }
  return idx;
}

// Columns each record must carry; a missing one is a loud skip, never a quiet empty (codex F5).
const OWED_TABS = { chaos: 'Chaos_Cars', casino: 'Casino_Ledger', hospital: 'Hospital_Ledger', judicial: 'Judicial_Ledger' };
const OWED_COLS = {
  chaos: ['CycleId', 'VehicleType', 'TargetScope', 'TargetId', 'DiceOutcome'],
  casino: ['WagerId', 'POPID', 'CycleSettled', 'Status', 'Stake', 'Payout'],
  hospital: ['POPID', 'AdmitCycle'],
  judicial: ['POPID', 'ArrestCycle', 'SourceSystem'],
};
// The casino writer's lines by settled status (casinoLedgerEngine casinoLine_ + its two Setback variants), so a
// win never pins a loss's line or the reverse (codex F2). Two same-status slips in one Cycle write one identical line.
const CASINO_PIN = {
  'settled-win': /^\[Casino\] the window paid/,
  'settled-loss': /^\[(Casino|Setback)\] the (slip came back empty|window took the last of it)/,
};

// Pure. Records (raw sheet rows with headers) → { owed: [{ id, pop, kind, tier, cycle, pin }], skipped: [reason], unknownTabs }.
// tier 1 = the ruled classes; tier 2 = a low-severity chaos hit on a citizen (absorbs only when no tier 1 fired).
// unknownTabs = a tab not read, or read without its columns: what it holds is unknown, not empty (codex re-review F2).
function owedFrom(rec, cycle, chaosIdx) {
  const cyc = Number(cycle);
  const inWin = (c) => Number.isFinite(c) && c > 0 && c <= cyc && c > cyc - OWED_WINDOW;
  const owed = [], skipped = [], unknownTabs = [];
  const pop = (v) => String(v || '').trim().toUpperCase();
  const table = (k) => {
    const t = rec && rec[k];
    if (!Array.isArray(t) || !t.length) { unknownTabs.push(OWED_TABS[k]); return null; }
    const H = hdr(t);
    const missing = OWED_COLS[k].filter((c) => H(c) < 0);
    if (missing.length) { skipped.push(`${OWED_TABS[k]}: no ${missing.join(', ')} column — nothing read from it`); unknownTabs.push(OWED_TABS[k]); return null; }
    return t.length > 1 ? { rows: t.slice(1), H } : null;
  };

  const ch = table('chaos');
  if (ch) {
    const H = ch.H, iC = H('CycleId'), iE = H('EventId'), iV = H('VehicleType'), iS = H('TargetScope'), iT = H('TargetId'), iO = H('DiceOutcome');
    for (const r of ch.rows) {
      if (String(r[iS] || '').trim().toLowerCase() !== 'citizen') continue;
      const c = Number(r[iC]);
      if (!inWin(c)) continue;
      const info = chaosIdx[String(r[iV] || '').trim() + '|' + String(r[iO] || '').trim()];
      if (!info) { skipped.push(`chaos ${(iE >= 0 && r[iE]) || '?'}: ${r[iV]}|${r[iO]} not in the chaos config`); continue; }
      const readable = String(r[iO]).trim().replace(/_/g, ' ');
      owed.push({ id: 'chaos:' + ((iE >= 0 && r[iE]) || c + ':' + pop(r[iT]) + ':' + r[iO]), pop: pop(r[iT]), kind: 'chaos', tier: info.severity === 'high' ? 1 : 2, cycle: c,
        pin: { stamp: simTag(c), body: `[${info.tag}] ${info.display}: ${readable}.` } });
    }
  }

  const ca = table('casino');
  if (ca) {
    const H = ca.H, iW = H('WagerId'), iP = H('POPID'), iC = H('CycleSettled'), iSt = H('Status'), iK = H('Stake'), iY = H('Payout');
    for (const r of ca.rows) {
      const st = String(r[iSt] || '').trim().toLowerCase();
      if (!CASINO_PIN[st]) continue;
      const c = Number(r[iC]);
      if (!inWin(c) || !pop(r[iP])) continue;
      const stake = Number(r[iK]) || 0, net = (Number(r[iY]) || 0) - stake;
      if (!(stake > OWED_STAKE_BAR || (st === 'settled-win' && net > OWED_WIN_BAR))) continue;
      owed.push({ id: 'casino:' + r[iW], pop: pop(r[iP]), kind: 'casino', tier: 1, cycle: c, pin: { stamp: simTag(c), re: CASINO_PIN[st] } });
    }
  }

  const ho = table('hospital');
  if (ho) {
    const H = ho.H, iA = H('AdmissionId'), iP = H('POPID'), iC = H('AdmitCycle');
    for (const r of ho.rows) {
      const c = Number(r[iC]);
      if (!inWin(c) || !pop(r[iP])) continue;
      owed.push({ id: 'hospital:' + ((iA >= 0 && r[iA]) || c + ':' + pop(r[iP])), pop: pop(r[iP]), kind: 'hospital', tier: 1, cycle: c, pin: null }); // shown by the lived admission line
    }
  }

  const ju = table('judicial');
  if (ju) {
    const H = ju.H, iK = H('CaseId'), iP = H('POPID'), iC = H('ArrestCycle'), iSrc = H('SourceSystem');
    for (const r of ju.rows) {
      const c = Number(r[iC]);
      if (!inWin(c) || !pop(r[iP])) continue;
      const id = 'judicial:' + ((iK >= 0 && r[iK]) || c + ':' + pop(r[iP]));
      // judicialLifecycle's reconcile opens a case for a detention whose row was lost — bookkeeping, not a new arrest (codex F3)
      if (iSrc >= 0 && String(r[iSrc] || '').trim().toLowerCase() === 'reconcile') { skipped.push(`${id}: a reconcile row, not a new arrest`); continue; }
      owed.push({ id, pop: pop(r[iP]), kind: 'judicial', tier: 1, cycle: c, pin: { stamp: simTag(c), re: /^\[Transgression-/ } });
    }
  }
  return { owed, skipped, unknownTabs };
}

function isOwedSpent(state, id) { return !!((state && state.owedSpent) || {})[id]; }

// A hospital mark reaches the voice through the lived line, and only when the lived pick is that admission (codex F1).
function owedLivedPrefer(e) {
  return (ev) => !!ev && ev.kind === 'hospital' && ev.phase === 'admitted' && Number(ev.cycle) === e.cycle && String(ev.subject || '').toUpperCase() === e.pop;
}

// Pure. Which owed events are in front of the citizen. Each pinned event claims its own line occurrence in the
// block (exact chaos text first, then the casino / arrest patterns), so one line never stands for two events
// (codex re-review F1); a hospital event is shown only when the lived pick is its admission. Ceiling: the casino
// writer's line carries no WagerId, so two same-status slips in one Cycle are told apart by count, not identity.
function owedShownSet(events, lifeBlock, lived) {
  const lines = String(lifeBlock || '').split('\n');
  const used = new Set();
  const exactFirst = (e) => (e.pin && e.pin.body != null ? 0 : 1);
  const shown = [];
  for (const e of [...(events || [])].sort((a, b) => exactFirst(a) - exactFirst(b))) {
    if (e.kind === 'hospital') { if (lived && owedLivedPrefer(e)(lived.event)) shown.push(e); continue; }
    if (!e.pin) continue;
    const i = lines.findIndex((l, k) => !used.has(k) && pinMatches(e.pin, l));
    if (i >= 0) { used.add(i); shown.push(e); }
  }
  return (events || []).filter((e) => shown.includes(e));
}
function owedShown(e, lifeBlock, lived) { return owedShownSet([e], lifeBlock, lived).length === 1; }

// Pure. Which owed citizens can take a reserved wake: tier 1, then a tier-2 hit from a Cycle in
// which no tier 1 fired (absorption, builder 2026-10-29); within a tier most severe first (the
// citizen's own eventMag), then newest, then id. One entry per citizen. An event with nothing to
// show the citizen (no line in their history, no lived admission) is reported, never reserved.
function owedCandidates(pool, owed, state, lived, opts) {
  const list = owed || [];
  const absorb = !(opts && opts.absorb === false); // a listed tab unread → unknown severe → low hits wait
  const severeCycles = new Set(list.filter((e) => e.tier === 1).map((e) => e.cycle));
  const byPop = new Map((pool || []).map((p) => [p.popId, p]));
  const ready = [], notInPool = [], unshowable = [], seen = new Set();
  const open = list.filter((e) => (e.tier === 1 || (absorb && !severeCycles.has(e.cycle))) && !isOwedSpent(state, e.id));
  for (const e of open) {
    const p = byPop.get(e.pop);
    if (!p) { notInPool.push(e); continue; }
    const can = e.kind === 'hospital'
      ? owedShown(e, '', livedFor(e.pop, lived, state, owedLivedPrefer(e)))
      : !!e.pin && (p.lifeLines || []).some((l) => pinMatches(e.pin, l));
    if (!can) { unshowable.push(e); continue; }
    ready.push({ ...e, mag: Number(p.eventMag) || 0 });
  }
  ready.sort((a, b) => (a.tier - b.tier) || (b.mag - a.mag) || (b.cycle - a.cycle) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const one = ready.filter((e) => (seen.has(e.pop) ? false : seen.add(e.pop)));
  return { severeCycles: [...severeCycles].sort(), absorb, ready: one, notInPool, unshowable };
}

// The woken citizen's unspent owed events (any tier): their lines are pinned; only the ones shown are spent.
function owedFor(popId, owed, state) {
  const p = String(popId || '').toUpperCase();
  return (owed || []).filter((e) => e.pop === p && !isOwedSpent(state, e.id));
}

function owedWakesUsed(state, cycle) { return Number(((state && state.owedWakes) || {})[cycle]) || 0; }

// pipeline.95 — UNDOCKED pilots (builder 2026-10-30: "Being on undocked should also guarantee a wake"; reserve on top of
// the 6). A pilot with an applied night in the window owes one wake per flown Cycle; the night itself reaches the voice as
// the show block (scripts/undockedShowRecord.js), so nothing is pinned. Same window, journal and spend as owed.
const SHOW_RESERVE = 3; // ruled 3 a Cycle — three pilots fly each Cycle
// Pure. nights = [{ pop, cycle }] (undockedShowRecord.loadNights) -> owed entries, one per pilot per Cycle.
function owedFromShow(nights, cycle) {
  const cyc = Number(cycle);
  const out = [], seen = new Set();
  for (const n of nights || []) {
    const c = Number(n && n.cycle), pop = String((n && n.pop) || '').trim().toUpperCase();
    if (!pop || !(Number.isFinite(c) && c > 0 && c <= cyc && c > cyc - OWED_WINDOW)) continue;
    const id = 'undocked:' + pop + ':c' + c;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, pop, kind: 'undocked', tier: 1, cycle: c, pin: null });
  }
  return out;
}
// Pure. Which pilots can take a show wake: unspent, in the pool; the newest Cycle first, then id. One entry per pilot.
// Newest first: three pilots fly a Cycle against a reserve of three, so serving last week's leftovers first would push
// every later pilot a week late; a leftover takes a reserved wake only when this Cycle's pilots are served.
function showCandidates(pool, owed, state) {
  const inPool = new Set((pool || []).map((p) => p.popId));
  const open = (owed || []).filter((e) => !isOwedSpent(state, e.id));
  const notInPool = open.filter((e) => !inPool.has(e.pop));
  const seen = new Set();
  const ready = open.filter((e) => inPool.has(e.pop))
    .sort((a, b) => (b.cycle - a.cycle) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .filter((e) => (seen.has(e.pop) ? false : seen.add(e.pop)));
  return { ready, notInPool };
}
function showWakesUsed(state, cycle) { return Number(((state && state.showWakes) || {})[cycle]) || 0; }
// Pure. The one show mark a wake with the block in front of the pilot spends: their newest unspent flown Cycle. One wake
// is one flown Cycle's wake; an older open mark stays for its own (codex F1).
function showMarkSpent(popId, owed, state) {
  return owedFor(popId, owed, state).sort((a, b) => (b.cycle - a.cycle) || (a.id < b.id ? -1 : 1)).slice(0, 1);
}

// Owed receipts live in their own append-only journal, never the shared wake state (codex re-review F4). Two phases
// per wake: `pending` before the page append (a failed pending write stops the wake: no page), then `shown` once it
// lands. A page error writes nothing more — the error may hide a page that landed, so pending stands and the event
// counts as reached (codex round 3 F2: a possible missed wake, never a doubled one). Only the window's Cycles are read,
// so nothing ages. Pure; an unreadable line throws (the wake holds owed, loudly).
function owedStateFrom(text, cycle) {
  const byKey = new Map();
  for (const raw of String(text || '').split('\n')) {
    if (!raw.trim()) continue;
    let j;
    try { j = JSON.parse(raw); } catch (e) { throw new Error('owed journal has an unreadable line: ' + raw.slice(0, 80)); }
    const c = Number(j.cycle);
    if (!(c > Number(cycle) - OWED_WINDOW && c <= Number(cycle))) continue;
    const k = byKey.get(j.key) || { cycle: c, slot: j.slot, ids: j.ids || [], page: j.page, status: new Set() };
    k.status.add(j.status);
    byKey.set(j.key, k);
  }
  const st = { owedSpent: {}, owedWakes: {}, showWakes: {}, unconfirmed: [], pageKeys: new Set() };
  for (const [key, k] of byKey) {
    if (k.page) st.pageKeys.add(k.page);
    if (!k.status.has('shown')) st.unconfirmed.push(key);
    for (const id of k.ids) st.owedSpent[id] = k.cycle;
    if (k.slot === 'owed') st.owedWakes[k.cycle] = (st.owedWakes[k.cycle] || 0) + 1;
    if (k.slot === 'show') st.showWakes[k.cycle] = (st.showWakes[k.cycle] || 0) + 1; // pipeline.95 — its own reserve
  }
  return st;
}
// The citizen's page key — the same parts citizenPage.appendReflection_ builds its customId from: Cycle, daypart and,
// once the wake keys by it, the weekday (pipeline.94). Two wakes on one key share one page doc (the store appends the
// second into the first), so a key already journaled receipts nothing (codex round 5).
function owedPageKey(popId, cycle, daypart, day) { return String(popId || '').toUpperCase() + '|c' + Number(cycle) + '|' + String(daypart || '') + (day ? '|' + day : ''); }
// Pure. Whether a live wake runs: owed off → plain; owed on and the lock taken → owed; owed on and another live wake
// holds the lock → skip — the loser could take the owed citizen's page key first (codex round 4).
function wakeAdmission(o) {
  if (!(o.owedRes > 0) || o.dry) return 'plain';
  return o.lockTaken ? 'owed' : 'skip';
}
function owedJournalLine(o) {
  return JSON.stringify({ key: o.key, page: o.page, cycle: o.cycle, pop: o.pop, slot: o.slot, ids: (o.ids || []).map((e) => (typeof e === 'string' ? e : e.id)), status: o.status }) + '\n';
}

// The page write under an owed receipt, over injected I/O: pending is durable before the page or no page is written;
// shown follows a landed page; a page error adds nothing (pending stands). Off = the plain page write.
async function owedPageStep(o) {
  if (o.on && !o.journal(o.line('pending'))) return { page: null, outcome: 'pending-not-saved' };
  const appended = await o.page();
  if (appended && appended.error) return { page: appended, outcome: o.on ? 'page-error-pending-stands' : 'page-error' };
  if (!o.on) return { page: appended, outcome: 'off' };
  return { page: appended, outcome: o.journal(o.line('shown')) ? 'shown' : 'shown-not-saved' };
}

// One read per tab; a failed tab is reported and the others still owe (codex F5). `read` is injectable for tests.
async function loadOwedRecords(read) {
  const get = read || ((t) => sheets.getRawSheetData(t));
  const keys = Object.keys(OWED_TABS);
  const res = await Promise.allSettled(keys.map((k) => get(OWED_TABS[k])));
  const out = { errors: [] };
  res.forEach((r, i) => {
    if (r.status === 'fulfilled') out[keys[i]] = r.value;
    else out.errors.push(`${OWED_TABS[keys[i]]}: ${(r.reason && r.reason.message) || r.reason}`);
  });
  return out;
}

// ---------------------------------------------------------------------------
// engine.197 M2 — Mags's journal (scripts/discord-reflection.js) reaches Reflection_Intake: one row
// a night, write-once (builder 2026-10-17: "1 a night"). Only the evening run composes a row; a row
// is never updated (an in-place update races the Cycle drain). Identity = the run's Central date,
// carried in column A as the run's own instant. A composed row is spooled to its own file
// (<spool>/<date>.json, atomic write) and leaves the spool only when a re-read of the sheet finds a
// valid row for that night; every run flushes the spool under one exclusive lock.
// ---------------------------------------------------------------------------
const NIGHTLY_INTAKE_HOUR = 18; // Central. Live crontab runs the journal 07:00 / 12:00 / 19:00
const NIGHTLY_DAYPART = 'nightly';
const INTAKE_HEADER = ['Timestamp', 'POPID', 'Cycle', 'Daypart', 'Tag', 'ReflectionExcerpt', 'Applied', 'Affect']; // live A–H; I–K unheaded

function centralClock(instant) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const g = (t) => (parts.find((x) => x.type === t) || {}).value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')) };
}

// Reflection_Intake rows → 'append' | 'present' | 'ambiguous'. Present only on exactly one VALID row
// for that night (Applied yes/no, an event or an affect — what the drain consumes). A wrong header,
// a matching row that is truncated or whose timestamp will not parse, or two matches → ambiguous:
// nothing appends and the spooled row stays.
function planNightlyIntake(rows, popId, sourceDate) {
  if (!Array.isArray(rows) || !rows.length || !Array.isArray(rows[0])) return 'ambiguous';
  if (INTAKE_HEADER.some((h, i) => String(rows[0][i] || '').trim() !== h)) return 'ambiguous';
  const pop = String(popId).toUpperCase();
  let hits = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    if (String(r[1] || '').toUpperCase() !== pop || String(r[3] || '').toLowerCase() !== NIGHTLY_DAYPART) continue;
    const t = new Date(r[0]);
    if (isNaN(t.getTime())) return 'ambiguous';
    if (centralClock(t).date !== sourceDate) continue;
    if (!/^(yes|no)$/i.test(String(r[6] || '').trim()) || !(String(r[4] || '').trim() || String(r[7] || '').trim())) return 'ambiguous';
    hits++;
  }
  return hits === 0 ? 'append' : hits === 1 ? 'present' : 'ambiguous';
}

// The row, A–K in the wake's shape (citizen-wake.js). Resolves (K) stays empty: the classifier's
// `resolves` indexes the wake's tension register, which the journal does not open.
function nightlyIntakeRow(o) {
  const cls = o.cls || {};
  return [o.instantIso, String(o.popId).toUpperCase(), o.cycle, NIGHTLY_DAYPART, cls.event || '',
    String(o.body || '').replace(/\n/g, ' '), 'no', cls.affect || '', o.bondTarget || '', cls.tension || '', ''];
}

// A spooled row is submitted only if it is the night its file names, for this citizen, in the shape.
function validNightlyRow(row, popId, sourceDate) {
  if (!Array.isArray(row) || row.length !== 11) return false;
  const t = new Date(row[0]);
  return !isNaN(t.getTime()) && centralClock(t).date === sourceDate && String(row[1]) === String(popId).toUpperCase()
    && row[3] === NIGHTLY_DAYPART && row[6] === 'no' && !!(row[4] || row[7]) && row[2] != null && row[2] !== '';
}

// Atomic: write a temp file beside it, then rename over. A crash leaves the old file or the new one, never half.
function spoolNightlyRow(dir, sourceDate, row) {
  fs.mkdirSync(dir, { recursive: true });
  const final = path.join(dir, sourceDate + '.json');
  const tmp = final + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(row));
  fs.renameSync(tmp, final);
  return final;
}

// Exclusive, non-blocking: runs fn only if this process owns the lock; otherwise resolves null.
// The lock file holds "pid token" and is published atomically (temp file + link: it appears whole or
// not at all — never empty). A held lock is broken only when its owner pid is provably dead, and only
// by the holder of a second, also-atomic "<lock>.break" mutex, which re-reads the lock and unlinks it
// only if it is still the same dead one. Nothing else ever removes the lock path, so a live owner's
// lock cannot be removed. Unknown or unparseable ownership, a live owner, or a held break mutex →
// fail closed (null). Release unlinks only a lock that still holds this run's token.
// The lock itself: a release function, or null when a live run holds it (a dead run's lock is broken).
function acquireFileLock(lockPath, onEvent) {
  const say = typeof onEvent === 'function' ? onEvent : () => {};
  const token = process.pid + ' ' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  const publish = (target) => {
    const tmp = target + '.' + token.replace(/\s/g, '-') + '.tmp';
    try { fs.writeFileSync(tmp, token); fs.linkSync(tmp, target); return true; } catch (e) { return false; } finally { try { fs.unlinkSync(tmp); } catch (e) {} }
  };
  const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };
  const releaseIfMine = (f) => { if (read(f) === token) { try { fs.unlinkSync(f); } catch (e) {} } };
  if (!publish(lockPath)) {
    const seen = read(lockPath);
    const m = /^(\d+) \S+$/.exec(String(seen || ''));
    if (!m || alive(Number(m[1]))) return null;
    const brk = lockPath + '.break';
    if (!publish(brk)) return null;
    try {
      if (read(lockPath) === seen) { fs.unlinkSync(lockPath); say('broke a dead run\'s lock (' + seen + ')'); }
    } catch (e) { return null; } finally { releaseIfMine(brk); }
    if (!publish(lockPath)) return null;
  }
  return () => releaseIfMine(lockPath);
}
async function withFileLock(lockPath, fn, onEvent) {
  const release = acquireFileLock(lockPath, onEvent);
  if (!release) return null;
  try { return await fn(); } finally { release(); }
}

// Under the lock: every spooled night, oldest first. Unreadable / malformed / wrong-night files stay
// and are reported. A night appends only on a valid 'append' scan, and its file is removed only when
// a re-read finds it 'present'. I/O is injected: readRows() → the tab, appendRow(row).
async function flushNightlySpool(o) {
  const say = typeof o.log === 'function' ? o.log : () => {};
  let names = [];
  try { names = fs.readdirSync(o.dir).filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort(); } catch (e) { return { ran: true, nights: 0 }; }
  if (!names.length) return { ran: true, nights: 0 };
  const done = [];
  const ran = await withFileLock(o.lockPath, async () => {
    for (const n of names) {
      const night = n.slice(0, 10), file = path.join(o.dir, n);
      let row;
      try { row = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { say(`spool ${n} unreadable — kept: ${e.message}`); continue; }
      if (!validNightlyRow(row, o.popId, night)) { say(`spool ${n} malformed — kept`); continue; }
      let plan = planNightlyIntake(await o.readRows(), o.popId, night);
      if (plan === 'append') {
        await o.appendRow(row);
        plan = planNightlyIntake(await o.readRows(), o.popId, night);
      }
      if (plan === 'present') { fs.unlinkSync(file); done.push(night); say(`${night} in, read back`); }
      else say(`${night} kept in the spool (${plan})`);
    }
    return true;
  }, (m) => say(m));
  if (ran === null) say('intake lock held by a live run — spool kept');
  return { ran: ran !== null, nights: names.length, done };
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
  livedEventsFrom, renderLivedLine, loadLivedEvents, LIVED_WINDOW, // pipeline.73 step 1
  centralClock, planNightlyIntake, nightlyIntakeRow, validNightlyRow, spoolNightlyRow, withFileLock, flushNightlySpool, NIGHTLY_INTAKE_HOUR, // engine.197 M2
  livedFor, livedSpentKey, recordLivedSpend, selectWakeCitizen, wakeSeedKey, // engine.197 — one lottery, lived as perception
  lifeTailOf, OWED_RESERVE, OWED_WINDOW, OWED_STAKE_BAR, OWED_WIN_BAR, chaosOutcomeIndex, owedFrom, owedCandidates, owedFor,
  owedLivedPrefer, owedShown, owedShownSet, owedWakesUsed, owedStateFrom, owedJournalLine, owedPageKey, wakeAdmission, owedPageStep,
  loadOwedRecords, acquireFileLock, // pipeline.93 — owed responses
  SHOW_RESERVE, owedFromShow, showCandidates, showWakesUsed, showMarkSpent, // pipeline.95 — UNDOCKED pilots' sure wake
};
