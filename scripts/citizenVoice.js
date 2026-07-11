#!/usr/bin/env node
/* citizenVoice — voice one citizen through the wake mechanism, on demand (Mike-direct S300).
 *
 * The first edition-run offload agent: when an edition needs a citizen's voice (a letter to
 * the editor, a street quote, a reaction), the desk calls THIS per citizen instead of one
 * premium LLM ventriloquizing them all. The citizen speaks from the same perception the wake
 * crons assemble — dials → disposition, real LifeHistory tail, co-residents, bonds, sports,
 * neighborhood texture, fenced own-page memory — via lib/wakePerception (Task 5 extraction),
 * generated on a cheap OpenRouter call (DeepSeek, same model/params family as the wake).
 * Same mechanism, many mouths; this is also the doorway to agent-to-agent conversation
 * (citizen-loop-deepening Task 6 reuses exactly this assembly).
 *
 * ── CANON GUARD (amended pipeline.43 T1, Mike-direct S312) ─────────────────────────────────
 * READ-ONLY by default — no page docs, no Reflection_Intake, no dials, no LifeHistory, no
 * local state, no markRecalled. `--record` is the sanctioned write mode: the same page +
 * gated-intake-only wall as the wake (classify → page doc daypart='PRESS' → tension register
 * → one Reflection_Intake row, applied='no'). Dials still move ONLY at the cycle drain.
 * A voiced line becomes canon only if the edition publishes it (subjective→canon wall).
 *
 * Usage:
 *   node scripts/citizenVoice.js --pop=POP-00123 --ask="The Tribune ran a story about rising
 *     rents on your block. Write a short letter to the editor reacting to it." [--cycle=N]
 *     [--dry-run] [--json] [--max-tokens=260] [--stdin] [--record]
 *   node scripts/citizenVoice.js --batch=asks.json [--cycle=N] [--dry-run]
 *   --dry-run : print the assembled prompts (+ would-be writes under --record), no API call.
 *   --json    : emit {popId,name,nh,occ,disposition,text} instead of plain text.
 *   --stdin   : read the ask from stdin (long briefs).
 *   --record  : after generating, run the wake write block (page + gated intake, PRESS).
 *   --batch   : JSON array of {pop, ask, record, maxTokens?} — sequential; one citizen's
 *               failure never kills the batch (lands as a fallback entry). Emits a JSON
 *               array {pop,name,quote,disp,recorded,fallback} to stdout; token usage to
 *               stderr. Exit 0 even with fallbacks.
 *   Exit 2 when the citizen can't be voiced (no dials / not in ledger) — caller falls back.
 *
 * Plan: docs/plans/2026-07-11-citizen-voice-quote-supply.md (pipeline.43 T1–T2; supersedes
 * the read-only-only guard in docs/plans/2026-07-06-citizen-loop-deepening.md Task 9).
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
const dials = require('/root/GodWorld/lib/citizenDials');
const page = require('/root/GodWorld/lib/citizenPage');
const memoryFence = require('/root/GodWorld/lib/memoryFence');
const classifier = require('/root/GodWorld/lib/reflectionClassifier');
const getCurrentCycle = require('/root/GodWorld/lib/getCurrentCycle');
const { buildPool, coResidents, loadLifeArc, loadSportsSlice, loadNeighborhoodTexture,
  loadBonds, loadOwnPageReadback, dialTrajectory } = require('/root/GodWorld/lib/wakePerception');

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const JSON_OUT = ARGV.includes('--json');
const RECORD = ARGV.includes('--record');
const arg = (k, d) => { const m = ARGV.find((a) => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };

// Tension register — same file, cap, and expiry as citizen-wake.js (B2 index; the page is
// the durable surface). PRESS quotes participate in the same open-question lifecycle.
const TENSION_FILE = path.join(__dirname, '..', 'logs', 'citizen-tension-state.json');
const TENSION_CAP = 3;
const TENSION_EXPIRY_CYCLES = 12;
function loadTensionState() { try { return JSON.parse(fs.readFileSync(TENSION_FILE, 'utf8')); } catch (e) { return {}; } }
function saveTensionState(st) { try { fs.writeFileSync(TENSION_FILE, JSON.stringify(st, null, 2)); } catch (e) {} }
function openTensionsFor(state, popId, cycle) {
  const list = state[popId] || [];
  if (cycle != null) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].status === 'open' && (cycle - (Number(list[i].cy) || 0)) >= TENSION_EXPIRY_CYCLES) list.splice(i, 1);
    }
  }
  return list.filter((t) => t.status === 'open').slice(-TENSION_CAP);
}

// Cross-call token accounting (acceptance 6) — per-call lines + batch total, stderr only.
const usageTotals = { calls: 0, prompt: 0, completion: 0 };

async function readStdin() {
  let buf = '';
  for await (const chunk of process.stdin) buf += chunk;
  return buf.trim();
}

async function generate(system, user, maxTokens) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: 'deepseek/deepseek-chat', max_tokens: maxTokens, temperature: 0.85, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error('voice: ' + (j.error.message || JSON.stringify(j.error)));
  const u = j.usage || {};
  usageTotals.calls += 1;
  usageTotals.prompt += Number(u.prompt_tokens) || 0;
  usageTotals.completion += Number(u.completion_tokens) || 0;
  console.error(`[tokens] call ${usageTotals.calls}: prompt=${u.prompt_tokens || '?'} completion=${u.completion_tokens || '?'}`);
  return String(j.choices?.[0]?.message?.content || '').trim();
}

/* Voice one citizen. Returns {popId,name,nh,occ,disposition,text,recorded}.
 * Throws {code:2} when unvoiceable (no dials / not in ledger) so single-call
 * mode keeps its exit-2 contract and batch mode maps it to a fallback. */
async function voiceOne(pool, popId, ask, { cycle, maxTokens, record, dry }) {
  const c = pool.find((p) => p.popId === popId);
  if (!c) { const e = new Error(`${popId} not voiceable (no DialState / not in ledger / no name+hood)`); e.code = 2; throw e; }

  const [neighbors, sportsLine, lifeArc, bondsLine] = await Promise.all([
    coResidents(c.nh, c.popId), loadSportsSlice(), loadLifeArc(c.popId), loadBonds(c.popId),
  ]);
  const textureLine = loadNeighborhoodTexture(c.nh, cycle);
  const pageRead = await loadOwnPageReadback(c.popId, {
    cycle, wake: 'VOICE',
    contextText: [ask, textureLine, sportsLine, bondsLine, c.nh, c.occ].filter(Boolean).join(' '),
  });

  // Citizen-self system prompt — same block structure and immersion-ingredient order as the
  // wake's buildVoicePrompts (continuity -> people -> world -> surroundings -> memory).
  const disp = dials.disposition(c.cur);
  const traj = dialTrajectory(c.baseDials, c.cur);
  const who = neighbors.length ? `\n\nPeople around you in ${c.nh}: ${neighbors.map((n) => `${n.name}${n.occupation ? ' (' + n.occupation + ')' : ''}`).join(', ')}.` : '';
  const bonds = bondsLine ? `\n\nPeople you have history with: ${bondsLine}.` : '';
  const arcLine = lifeArc ? `\n\nYour life so far: ${lifeArc}.` : '';
  const trajLine = traj ? ` Lately you've been ${traj}.` : '';
  const sports = sportsLine ? `\n\nAround Oakland: ${sportsLine}` : '';
  const texture = textureLine ? `\n\nAround your neighborhood: ${textureLine}` : '';
  const memory = pageRead.block ? `\n\n---\n\nWhat's been on your mind lately, from your own private reflections:\n${pageRead.block}` : '';
  const system = `You are ${c.name}, ${c.age ? c.age + ', ' : ''}a ${c.occ || 'resident'} living in ${c.nh}, Oakland. You are an ordinary person, not a writer. Your temperament: ${disp}.${trajLine}${arcLine}\n\nReal things from your life recently:\n${c.life}${who}${bonds}${sports}${texture}${memory}`;

  // The ask arrives from the caller (letters desk, interview brief). Fence it — desk-authored
  // context is instructions TO the citizen, but anything quoted inside it must not be able to
  // rewrite who they are. The speech guard rides outside the fence.
  const user = `${memoryFence.sanitize(ask)}\n\nSpeak as yourself, plainly, in first person — your temperament and your history shape what you say and what you leave out. Never mention data, records, or that you were asked by a system.`;

  if (dry) {
    console.log('--- system ---\n' + system + '\n--- user ---\n' + user);
    if (record) console.log(`--- [dry-run --record] would write: page doc (daypart=PRESS) + tension open/resolve + 1 Reflection_Intake row (applied=no) for ${c.popId} ---`);
    console.log('--- (dry-run: no API call, no writes) ---');
    return { popId: c.popId, name: c.name, nh: c.nh, occ: c.occ, disposition: disp, text: null, recorded: false };
  }

  const text = await generate(system, user, maxTokens);
  if (!text) { const e = new Error('empty generation'); e.code = 3; throw e; }

  let recorded = false;
  if (record) {
    // Wake write block (citizen-wake.js steps 1–4 pattern), daypart='PRESS'. Page + gated
    // intake ONLY — no dials, no LifeHistory, no markRecalled, no rotation state.
    const tensionState = loadTensionState();
    const openTensions = openTensionsFor(tensionState, c.popId, cycle);

    // 1) classify first so affect rides the page doc metadata (guarded — a classifier
    //    failure must never block the page append).
    let cls = {};
    try { cls = await classifier.classifyTripleReflection_(text, openTensions.map((t) => t.q)); } catch (e) { cls = { raw: 'classify threw: ' + e.message }; }

    // 2) narrative store: page pointer + reflection doc.
    const ptr = await page.ensurePagePointer_(c.popId);
    if (ptr.error) throw new Error('ensurePagePointer_: ' + ptr.error);
    const appended = await page.appendReflection_(c.popId, text, {
      cycle, daypart: 'PRESS',
      extra: { affect: cls.affect || null, event: cls.event || null, ask: String(ask).slice(0, 120) },
    });
    if (appended.error) throw new Error('appendReflection_: ' + appended.error);
    console.error(`[record] page ${ptr.tag} <- PRESS doc ${appended.id || '?'}`);

    // 3) tension register — resolution first, then new capture (wake semantics, shared file).
    const tlist = tensionState[c.popId] = tensionState[c.popId] || [];
    if (cls.resolves != null && openTensions[cls.resolves]) {
      const t = openTensions[cls.resolves];
      t.status = 'resolved'; t.resolvedCy = cycle;
      await page.appendReflection_(c.popId, `TENSION-RESOLVED[c${cycle}]: ${t.q}`, { cycle, daypart: 'PRESS', key: 'tension-resolved', extra: { type: 'tension' } });
      console.error(`[record] tension RESOLVED <- "${t.q.slice(0, 80)}"`);
    }
    if (cls.tension && !tlist.some((t) => t.status === 'open' && t.q.toLowerCase() === cls.tension.toLowerCase())) {
      const openNow = tlist.filter((t) => t.status === 'open');
      if (openNow.length >= TENSION_CAP) {
        const oldest = openNow.reduce((a, b) => ((Number(a.cy) || 0) <= (Number(b.cy) || 0) ? a : b));
        tlist.splice(tlist.indexOf(oldest), 1);
      }
      tlist.push({ q: cls.tension, cy: cycle, status: 'open' });
      await page.appendReflection_(c.popId, `TENSION[c${cycle}]: ${cls.tension}`, { cycle, daypart: 'PRESS', key: 'tension', extra: { type: 'tension' } });
      console.error(`[record] tension OPENED <- "${cls.tension.slice(0, 80)}"`);
    }
    saveTensionState(tensionState);

    // 4) gated intake row — the cycle drain reads this; dials move there, not here.
    if (cls.event || cls.affect) {
      await sheets.appendRows('Reflection_Intake', [[
        new Date().toISOString(), c.popId, cycle, 'PRESS', cls.event || '', text.slice(0, 180).replace(/\n/g, ' '), 'no', cls.affect || '',
      ]]);
      console.error(`[record] Reflection_Intake <- event=[${cls.event || '-'}] affect=[${cls.affect || '-'}] (applied=no, gated)`);
    } else {
      console.error(`[record] classifier off-vocab/err, intake skipped: ${cls.raw}`);
    }
    recorded = true;
  }

  return { popId: c.popId, name: c.name, nh: c.nh, occ: c.occ, disposition: disp, text, recorded };
}

async function runBatch(batchPath, cycle) {
  let entries;
  try { entries = JSON.parse(fs.readFileSync(batchPath, 'utf8')); } catch (e) {
    console.error('citizenVoice: cannot read batch file: ' + e.message); process.exit(1);
  }
  if (!Array.isArray(entries)) { console.error('citizenVoice: batch file must be a JSON array'); process.exit(1); }

  const pool = await buildPool({ shapedMin: 0, lifeMinChars: 0 });
  const out = [];
  for (const entry of entries) {
    const pop = String(entry.pop || '').toUpperCase();
    const base = { pop, name: null, quote: null, disp: null, recorded: false, fallback: null };
    if (!pop || !entry.ask) { out.push({ ...base, fallback: 'call-failed: missing pop/ask' }); continue; }
    try {
      const r = await voiceOne(pool, pop, entry.ask, {
        cycle,
        maxTokens: Number(entry.maxTokens) || 260,
        record: !!entry.record && !DRY,
        dry: DRY,
      });
      out.push({ ...base, name: r.name, quote: r.text, disp: r.disposition, recorded: r.recorded });
    } catch (e) {
      out.push({ ...base, fallback: e.code === 2 ? 'no-dials' : 'call-failed: ' + e.message });
      console.error(`[batch] ${pop} fallback: ${e.code === 2 ? 'no-dials' : e.message}`);
    }
  }
  console.error(`[tokens] batch total: ${usageTotals.calls} calls, prompt=${usageTotals.prompt}, completion=${usageTotals.completion}`);
  console.log(JSON.stringify(out, null, 2));
}

(async () => {
  const cycle = Number(arg('cycle', null)) || (() => { try { return getCurrentCycle(); } catch (e) { return null; } })();

  const batchPath = arg('batch', null);
  if (batchPath) { await runBatch(batchPath, cycle); return; }

  const popId = String(arg('pop', '') || '').toUpperCase();
  let ask = arg('ask', null);
  if (!ask && ARGV.includes('--stdin')) ask = await readStdin();
  if (!popId || !ask) { console.error('usage: citizenVoice.js --pop=POP-XXXXX (--ask="..." | --stdin) [--cycle=N] [--dry-run] [--json] [--record] | --batch=asks.json'); process.exit(1); }
  const maxTokens = Number(arg('max-tokens', 260)) || 260;

  // No shaped floor for edition voicing — a citizen the Tribune touched deserves a voice even at
  // mild dial deviation. Dials + a name + a neighborhood are still required (no dials = no
  // temperament = confabulation risk; exit 2 so the caller falls back).
  const pool = await buildPool({ shapedMin: 0, lifeMinChars: 0 });

  let r;
  try {
    r = await voiceOne(pool, popId, ask, { cycle, maxTokens, record: RECORD, dry: DRY });
  } catch (e) {
    console.error('citizenVoice: ' + e.message);
    process.exit(e.code || 1);
  }
  if (DRY) process.exit(0);
  if (JSON_OUT) console.log(JSON.stringify({ popId: r.popId, name: r.name, nh: r.nh, occ: r.occ, disposition: r.disposition, text: r.text }, null, 2));
  else console.log(r.text);
})().catch((e) => { console.error('citizenVoice ERR: ' + e.message); process.exit(1); });
