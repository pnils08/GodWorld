#!/usr/bin/env node
/* citizen-wake — the rotating-citizen wake loop (citizen-loop Phase 2, engine-sheet S262).
 *
 * Mags keeps her nightly reflection (scripts/discord-reflection.js, the fixed anchor). THIS wakes a
 * DIFFERENT citizen each run — the variety engine. Each wake: pick a citizen living a big live delta,
 * assemble THEIR scoped perception (dials -> disposition, their real LifeHistory tail, real
 * co-residents), have them reflect in their own voice (DeepSeek), accrete the prose to their private
 * Supermemory page, and persist the classified tag to Reflection_Intake for the (gated) cycle read.
 *
 * World-perception-triggered, NOT conversation-gated — fixes Mags' "silent on no-conversation days".
 *
 * ── PHASE-1 GATE (hard) ──────────────────────────────────────────────────────────────────────────
 * Perception + reflection + narrative-store + tag-persist ONLY. This script NEVER calls
 * applyTaggedEvent_ and NEVER writes dials/LifeHistory — the dial write-back is the deterministic
 * cycle's job and stays gated behind the Phase-1 daily audit. We only WRITE the tag to the intake;
 * the cycle READING it + applying is the gated half (not built here). Determinism holds: classify +
 * page are wake-side; the cycle later reads a frozen persisted tag, never the LLM.
 *
 * Run: node scripts/citizen-wake.js [--dry-run] [--wake=morning|midday|evening] [--cycle=N] [--pop=POP-XXXXX]
 *   --dry-run : assemble perception + generate the reflection, print it, write NOTHING.
 *   --pop     : force a specific citizen (testing/override) instead of rotation.
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
const dials = require('/root/GodWorld/lib/citizenDials');
const dialMap = require('/root/GodWorld/utilities/citizenDialMap');
const page = require('/root/GodWorld/lib/citizenPage');
const memoryFence = require('/root/GodWorld/lib/memoryFence');
const classifier = require('/root/GodWorld/lib/reflectionClassifier');
const { createSlicer } = require('/root/GodWorld/lib/neighborhoodSlice');
const getCurrentCycle = require('/root/GodWorld/lib/getCurrentCycle');

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const arg = (k, d) => { const m = ARGV.find((a) => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const WAKE = (arg('wake', 'evening') || 'evening').toLowerCase();
const FORCE_POP = arg('pop', null);

const SHAPED_MIN = 60;          // deviation floor — only strongly-shaped citizens have a distinct voice
const LIFE_MIN_CHARS = 25;      // must have real lived events to ground on (anti-confabulation)
const ROTATION_MEMORY = 25;     // don't re-wake the last N citizens (force variety)
const RESIDENT_CAP = 3;         // real co-residents fed for grounding (names only, no metrics)
const STATE_FILE = path.join(__dirname, '..', 'logs', 'citizen-wake-state.json');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'citizen-wake.log');

const WAKE_FRAME = {
  morning: 'It is early morning. You are waking into the day, the day still ahead of you',
  midday: 'It is the middle of the day, a pause in the neighborhood or at work',
  evening: 'It is evening. You are winding down after an ordinary day',
};

function logLine(s) {
  const line = `[${new Date().toISOString()}] ${s}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (e) {}
  console.log(s);
}
function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return { recent: [] }; } }
function saveState(st) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2)); } catch (e) {} }

// most-recent LifeHistory tag -> magnitude of its dial nudge = "how big a delta is this citizen living".
function recentEventMagnitude(lifeTail) {
  const lines = String(lifeTail || '').split('\n').filter(Boolean);
  const last = lines[lines.length - 1] || '';
  const m = last.match(/\[([^\]]+)\]/);
  if (!m) return 0;
  const fx = dialMap.nudgesForEvent_(m[1].trim(), 1, last);
  return Object.values(fx).reduce((s, v) => s + Math.abs(v), 0);
}

// T1a' (research.19, S273 production finding) — canon-anchored self-state read-back, the
// amnesia fix: a citizen perceives a genuine life MILESTONE, not just the recent tail. Sourced
// from LifeHistory_Log (canonical append-only per-citizen history), NOT generated reflection prose
// — no fabrication to re-inject (the AP-reframe: "shady Greg"-class invention lives in the prose
// page, deliberately never read back).
//
// WHY a named milestone and NOT a count (S273): the original loadLifeArc emitted an aggregate
// ("6 advancement events") that never surfaced in 15 post-upgrade reflections — no person thinks
// in counts (self-axis twin of T2's "retail -4%" problem). And 94% of ARC rows are Advancement/
// Promotion whose EventText is engine BOOKKEEPING ("Updated to Tier 3. 29 West Oakland Server...")
// — rendering it leaks engine vocab, worse than the count. So: render the latest PERSON-READABLE
// life-event milestone's own description; if none, OMIT (no count fallback — the count IS the bug).
// Live reach is thin (~1.9% of the wake pool have a clean milestone — weddings/retirements are rare,
// and the engine doesn't yet write person-readable Advancement text); the honest line beats a leaky
// one. Closing the amnesia hole at scale is the UPSTREAM lane (cleaner ARC descriptions at the
// engine-write site + engine.38 B3 milestone supply), tracked separately — not this wake-side task.
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
// currentDials reads base+mood and live DialState carries no mood/streak until the reflection
// write-back drain deploys, so current==base and this returns ''. Forward-compatible: it surfaces a
// shift line ONLY when real movement exists; it never fabricates one (canon-anchored).
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
// (Paulson's domain), narrative NOT metrics (no FanSentiment aggregate in voice — lived-particulars
// guardrail). Spot-checked canon-clean S270 (NamesUsed = GodWorld A's roster, fictionalized opponents).
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

// T2 (research.19) — immediate world: the lived texture of the citizen's own neighborhood
// this cycle, what a resident would NOTICE walking around. Reads the shared frozen artifact
// (output/neighborhood_texture_c{XX}.md, built by scripts/buildNeighborhoodTexture.js after
// the world-summary, before the wake) and returns THIS hood's block. Lived-particulars, never
// aggregates (the digest already stripped metrics + ran a canon sweep). Graceful: '' if the
// artifact or the hood block is absent — exactly like loadSportsSlice. Frozen artifact => every
// wake in the cycle reads the identical block (determinism holds; perception is input-side).
function loadNeighborhoodTexture(nh, cycle) {
  try {
    if (!nh || !cycle) return '';
    const p = path.join(__dirname, '..', 'output', `neighborhood_texture_c${cycle}.md`);
    const md = fs.readFileSync(p, 'utf8');
    const parts = md.split(/^###\s+/m);
    for (const part of parts.slice(1)) {
      const nl = part.indexOf('\n');
      if (nl < 0) continue;
      if (part.slice(0, nl).trim().toLowerCase() !== String(nh).trim().toLowerCase()) continue;
      const body = part.slice(nl + 1).split(/\n###\s/)[0].trim().replace(/\s+/g, ' ').trim();
      if (/^a quiet week/i.test(body)) return ''; // no engine signal -> nothing to perceive, omit the line
      return body;
    }
    return '';
  } catch (e) { return ''; }
}

// research.19 relationships-with-texture (immersion ingredient 3 — task # TBD by research-build;
// NOT "T1c", which is the prose-page read-back) — the people a citizen
// has HISTORY with, not just 3 names off the block. Reads Relationship_Bonds (live active bonds,
// canon engine state) for the woken citizen, resolves the other party's name from the ledger, and
// renders bond-type + warmth as plain relationship texture ("a close friend", "someone you know
// through work"). Canon-anchored — names from the ledger, bond types from the bond engine; no
// invention. Cross-neighborhood by design (relationships reach beyond the block, unlike co-residents).
const BOND_PHRASE = {
  family: (close) => (close ? 'close family' : 'family'),
  friendship: (close) => (close ? 'a close friend' : 'a friend'),
  professional: () => 'someone you know through work',
  alliance: (close) => (close ? 'someone you count on' : 'an ally'),
  rivalry: () => 'someone you butt heads with',
};
async function loadBonds(popId) {
  try {
    const [bonds, led] = await Promise.all([
      sheets.getRawSheetData('Relationship_Bonds'),
      sheets.getRawSheetData('Simulation_Ledger'),
    ]);
    if (!bonds || bonds.length < 2 || !led || led.length < 2) return '';
    const bh = bonds[0];
    const iA = bh.indexOf('CitizenA'), iB = bh.indexOf('CitizenB'), iT = bh.indexOf('BondType'), iI = bh.indexOf('Intensity'), iS = bh.indexOf('Status');
    if (iA < 0 || iB < 0) return '';
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
      mine.push({ name, phrase, intensity });
    }
    if (!mine.length) return '';
    mine.sort((x, y) => y.intensity - x.intensity); // closest first
    return mine.slice(0, 3).map((m) => `${m.name}, ${m.phrase}`).join('; ');
  } catch (e) { return ''; }
}

// T1c (research.19) — bounded own-page prose READ-BACK. The amnesia fix's other half: the wake has
// always APPENDED each reflection to the citizen's private page (page.appendReflection_) and NEVER
// read it back (CV-1) — a citizen accreted a remembered self and woke amnesiac of it. Read the few
// most-relevant recent reflections back so they continue from their own inner life. UNGATED by design
// (Mike S273, overturns the AP-2 gate): the page is SUBJECTIVE memory; self-read-back never crosses
// the subjective->canon publication wall, so "shady Greg"-class invention is continuity, not
// contamination. **MANDATORY fence** — recalled prose is wrapped by lib/memoryFence (citizenPage
// §Fence contract) so the model treats it as background data, never instructions. Bounded (last-N +
// per-reflection truncation) for tokens only. Non-deterministic recall is fine: wake-side/input-only,
// frozen into the persisted tag; the cycle never re-runs the wake. Fails open (no page / API down -> '').
const PAGE_READBACK_N = 3;        // most RECENT reflections (most pages hold 1-2 today)
const PAGE_REFLECTION_CAP = 320;  // per-reflection char cap (token bound)
async function loadOwnPageReadback(popId) {
  try {
    // recentPage_ (recency via documents-list+get), NOT readPage_ (v4 search silently misses docs — S272).
    const res = await page.recentPage_(popId, PAGE_READBACK_N);
    if (!res || !res.results || !res.results.length) return '';
    const prose = res.results
      .map((r) => String((r && r.content) || '').trim().slice(0, PAGE_REFLECTION_CAP))
      .filter(Boolean).join('\n\n');
    if (!prose.trim()) return '';
    return memoryFence.wrap(prose, 'citizen-page:' + popId); // fenced — recalled prose never enters raw
  } catch (e) { return ''; }
}

async function buildPool() {
  const rows = await sheets.getRawSheetData('Simulation_Ledger');
  const h = rows[0];
  const find = (n) => h.findIndex((x) => String(x).toLowerCase() === n.toLowerCase());
  const iPop = find('POPID'), iName = find('Name'), iFirst = find('First'), iLast = find('Last');
  const iNh = find('Neighborhood'), iDial = find('DialState'), iOcc = find('Occupation'), iBirth = find('BirthYear'), iLife = find('LifeHistory');
  const pool = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const dj = r[iDial];
    if (!dj || String(dj).trim().length < 5) continue;
    const cur = dials.currentDials(dj);
    if (!cur || dials.deviation(cur) < SHAPED_MIN) continue;
    let baseDials = null; try { const dp = JSON.parse(dj); baseDials = (dp && dp.base) || null; } catch (e) {} // T1a trajectory anchor
    const life = iLife >= 0 ? String(r[iLife] || '').trim() : '';
    if (life.length < LIFE_MIN_CHARS) continue;
    const name = (iName >= 0 && r[iName]) ? r[iName] : [r[iFirst], r[iLast]].filter(Boolean).join(' ');
    const nh = iNh >= 0 ? r[iNh] : '';
    if (!name || !nh) continue;
    if (/corliss/i.test(`${name} ${r[iFirst] || ''} ${r[iLast] || ''}`)) continue; // Mags is the anchor, not in rotation
    const lifeTail = life.split('\n').filter(Boolean).slice(-5).join('\n');
    pool.push({
      popId: String(r[iPop]).toUpperCase(), name, occ: iOcc >= 0 ? r[iOcc] : '', nh,
      age: (iBirth >= 0 && r[iBirth]) ? (2041 - Number(r[iBirth])) : '',
      cur, baseDials, life: lifeTail, eventMag: recentEventMagnitude(lifeTail),
    });
  }
  return pool;
}

// event-magnitude-weighted, deterministic: highest live delta first, excluding the recently-woken.
function selectCitizen(pool, state) {
  if (FORCE_POP) {
    const forced = pool.find((p) => p.popId === FORCE_POP.toUpperCase());
    if (forced) return forced;
    logLine(`--pop ${FORCE_POP} not in shaped pool; falling back to rotation`);
  }
  const recent = new Set(state.recent || []);
  let candidates = pool.filter((p) => !recent.has(p.popId));
  if (!candidates.length) candidates = pool; // everyone woken recently -> reset the cycle
  candidates.sort((a, b) => (b.eventMag - a.eventMag) || dials.deviation(b.cur) - dials.deviation(a.cur));
  return candidates[0];
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

function buildVoicePrompts(c, neighbors, sportsLine, lifeArc, textureLine, bondsLine, pageMemory) {
  const disp = dials.disposition(c.cur);
  const who = neighbors.length
    ? `\n\nPeople around you in ${c.nh}: ${neighbors.map((n) => `${n.name}${n.occupation ? ' (' + n.occupation + ')' : ''}`).join(', ')}.`
    : '';
  const bonds = bondsLine ? `\n\nPeople you have history with: ${bondsLine}.` : ''; // relationships-with-texture (ingredient 3)
  const traj = dialTrajectory(c.baseDials, c.cur);                    // T1a trajectory (dormant until drain)
  const arcLine = lifeArc ? `\n\nYour life so far: ${lifeArc}.` : ''; // T1a self-state read-back (Log-sourced)
  const trajLine = traj ? ` Lately you've been ${traj}.` : '';
  const sports = sportsLine ? `\n\nAround Oakland: ${sportsLine}` : ''; // T1b world-larger-than-self
  const texture = textureLine ? `\n\nAround your neighborhood: ${textureLine}` : ''; // T2 immediate world
  // T1c own-page memory — already fenced (memoryFence) by loadOwnPageReadback; appended as a distinct
  // tail so the fence block stays intact (mirrors lib/personaProvider.augment).
  const memory = pageMemory ? `\n\n---\n\nWhat's been on your mind lately, from your own private reflections:\n${pageMemory}` : '';
  // immersion-ingredient order: continuity (T1a state + T1c own-memory) -> people (around you + history-with) -> world/A's (T1b) -> surroundings (T2)
  const system = `You are ${c.name}, ${c.age ? c.age + ', ' : ''}a ${c.occ || 'resident'} living in ${c.nh}, Oakland. You are an ordinary person, not a writer. Your temperament: ${disp}.${trajLine}${arcLine}\n\nReal things from your life recently:\n${c.life}${who}${bonds}${sports}${texture}${memory}`;
  const user = `${WAKE_FRAME[WAKE] || WAKE_FRAME.evening}. In 4-5 sentences write a private, honest reflection — the small things on your mind, drawing on what's actually been happening in your life. Don't narrate events like a story; just think on the page the way you actually would. First person.`;
  return { system, user, disp };
}

async function generateVoice(system, user) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: 'deepseek/deepseek-chat', max_tokens: 260, temperature: 0.85, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error('voice: ' + (j.error.message || JSON.stringify(j.error)));
  return String(j.choices?.[0]?.message?.content || '').trim();
}

(async () => {
  const cycle = Number(arg('cycle', null)) || (() => { try { return getCurrentCycle(); } catch (e) { return null; } })();
  const pool = await buildPool();
  logLine(`pool: ${pool.length} shaped citizens with lived history (wake=${WAKE}, cycle=${cycle}, dry=${DRY})`);
  if (!pool.length) { logLine('empty pool — nothing to wake'); process.exit(0); }

  const state = loadState();
  const c = selectCitizen(pool, state);
  const neighbors = await coResidents(c.nh, c.popId);
  const sportsLine = await loadSportsSlice();                 // T1b — one feed read, shared across the wake
  const lifeArc = await loadLifeArc(c.popId);                 // T1a — canonical milestone arc from LifeHistory_Log
  const textureLine = loadNeighborhoodTexture(c.nh, cycle);   // T2 — this hood's frozen lived-particulars block
  const bondsLine = await loadBonds(c.popId);                 // relationships-with-texture — people the citizen has history with (canon bonds)
  const pageMemory = await loadOwnPageReadback(c.popId);      // T1c — fenced own-page prose read-back (most recent reflections)
  const { system, user, disp } = buildVoicePrompts(c, neighbors, sportsLine, lifeArc, textureLine, bondsLine, pageMemory);

  logLine(`woke ${c.popId} ${c.name} — ${c.occ || 'resident'}, ${c.nh}${c.age ? ', ' + c.age : ''} | eventMag=${c.eventMag} | ${disp}`);
  if (DRY) console.log('\n--- perception (system prompt) ---\n' + system + '\n----------------------------------');
  const reflection = await generateVoice(system, user);
  console.log('\n--- reflection ---\n' + reflection + '\n------------------');

  if (DRY) {
    const tags = await classifier.classifyDualReflection_(reflection);
    logLine(`[dry-run] would classify -> ${JSON.stringify(tags)}; no writes`);
    process.exit(0);
  }

  // 1) narrative store: ensure the page pointer (AW), append the reflection (ungated).
  const ptr = await page.ensurePagePointer_(c.popId);
  if (ptr.error) { logLine('ensurePagePointer_ ERROR: ' + ptr.error); process.exit(1); }
  const appended = await page.appendReflection_(c.popId, reflection, { cycle, daypart: WAKE });
  if (appended.error) { logLine('appendReflection_ ERROR: ' + appended.error); process.exit(1); }
  logLine(`page ${ptr.tag} (${ptr.created ? 'created' : 'existing'}) <- reflection doc ${appended.id || '?'}`);

  // 2) persist the dual classified tags to Reflection_Intake (the cycle reads this when the gate opens).
  //    Row: [ts, popId, cycle, WAKE, EVENT(col E), snippet, applied='no', AFFECT(col H)] — A-G stay
  //    positional (back-compat); affect is appended at H. composure-as-affect-only lives in the
  //    cycle's gated write-back (nudgesForReflection_), not here.
  const cls = await classifier.classifyDualReflection_(reflection);
  if (cls.event || cls.affect) {
    await sheets.appendRows('Reflection_Intake', [[
      new Date().toISOString(), c.popId, cycle, WAKE, cls.event || '', reflection.slice(0, 180).replace(/\n/g, ' '), 'no', cls.affect || '',
    ]]);
    logLine(`Reflection_Intake <- event=[${cls.event || '-'}] affect=[${cls.affect || '-'}]${cls.affectFallback ? ' (affect fallback)' : ''} (applied=no, gated)`);
  } else {
    logLine(`classifier off-vocab/err, intake skipped: ${cls.raw}`);
  }

  // GATE: NO applyTaggedEvent_ here. Dial write-back is the gated cycle's job (Phase-1 audit).

  // 3) record rotation
  state.recent = [c.popId, ...(state.recent || [])].slice(0, ROTATION_MEMORY);
  saveState(state);
})().catch((e) => { logLine('FATAL ' + e.message); process.exit(1); });
