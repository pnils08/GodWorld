#!/usr/bin/env node
'use strict';
/**
 * scripts/gridironFeedQuestions.js — a feed question to Gridiron Analytics, answered by the analyst whose record it is
 * and sent to the builder's Discord (pipeline.111; builder 2026-11-24: "The feed questions should only route to the
 * 'names Used' column so if a question were posed to Gridiron … it probably would know who respond. It would be mainly
 * a user type of element to put the data team behind me").
 *
 * A row on Oakland_Sports_Feed with EventTrigger `question` whose NamesUsed is Gridiron Analytics (or one of its five
 * analysts by name) is the general manager's question to his data house. The Notes cell is the question, word for
 * word. It is private like every question row (engine.338, lib/feedPrivacy.js): the answer goes to the Discord webhook
 * the gate and the interview requests use (DISCORD_WEBHOOK_URL) and to output/gridiron/feed-answers.json — never to a
 * reporter, a desk or canon. Each row is answered once; an answer that did not finish is tried again next run, three
 * times at most. The engine reads the same row and finds no citizen by that name, so no life line is written.
 *
 *   node scripts/gridironFeedQuestions.js           # answer new rows, send them, record them
 *   node scripts/gridironFeedQuestions.js --dry     # show which rows are new and what would be asked; no model call, no send
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const STATE = path.join(ROOT, 'output', 'gridiron', 'feed-answers.json');
const ASKER = { name: 'Mike Paulson', outlet: 'General Manager, Oakland A\'s and the Oaks' };
const MAX_TRIES = 3;
const DISCORD_LIMIT = 1900;

const DRY = process.argv.includes('--dry');
const log = (m) => console.log('[' + new Date().toISOString() + '] [gridiron-feed] ' + m);

function loadState() { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; } }
function saveState(s) { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s, null, 1)); }
const keyOf = (r) => 'C' + String(r.Cycle).trim() + ':' + crypto.createHash('sha1').update(String(r.Notes || '').trim()).digest('hex').slice(0, 12);

// Whom the row names: the house (any analyst may answer — the router picks), or one analyst by name.
function addressee(row, G, names) {
  const n = String(row.NamesUsed || '').trim();
  if (/gridiron/i.test(n)) return { officeId: null };
  const hit = G.ANALYSTS.find((a) => names[a.popid] && new RegExp('\\b' + names[a.popid].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(n));
  return hit ? { officeId: hit.officeId } : null;
}

function send(text) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return Promise.reject(new Error('DISCORD_WEBHOOK_URL not set'));
  const parts = [];
  let rest = String(text);
  while (rest.length > DISCORD_LIMIT) { const cut = rest.lastIndexOf('\n', DISCORD_LIMIT) > 500 ? rest.lastIndexOf('\n', DISCORD_LIMIT) : DISCORD_LIMIT; parts.push(rest.slice(0, cut)); rest = rest.slice(cut); }
  parts.push(rest);
  return parts.reduce((p, content) => p.then(async () => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    if (r.status !== 204 && r.status !== 200) throw new Error('Discord webhook HTTP ' + r.status);
  }), Promise.resolve());
}

async function main() {
  const sheets = require('../lib/sheets');
  const G = require('./gridiron');
  const { isAnswer } = require('./workerAsk');
  const fp = require('../lib/feedPrivacy');
  const ledger = (() => { try { return fs.readFileSync(path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)); } catch (e) { return []; } })();
  const names = {};
  for (const r of ledger) if (r && r.POPID) names[r.POPID] = [r.First, r.Last].filter(Boolean).join(' ').trim();

  const feed = await sheets.getSheetAsObjects('Oakland_Sports_Feed');
  const rows = feed.filter((r) => fp.isPrivateFeedRow(r) && String(r.Notes || '').trim()).map((r) => ({ r, to: addressee(r, G, names) })).filter((x) => x.to);
  const state = loadState();
  const due = rows.filter(({ r }) => { const s = state[keyOf(r)]; return !s || (!s.sent && (s.tries || 0) < MAX_TRIES); });
  log(rows.length + ' question row(s) to Gridiron on the feed, ' + due.length + ' to answer');
  for (const { r, to } of due) {
    const key = keyOf(r), question = String(r.Notes).trim(), cycle = Number(r.Cycle);
    if (DRY) { log('would ask (C' + cycle + (to.officeId ? ', ' + to.officeId : ', routed') + '): ' + question); continue; }
    const rec = state[key] || { cycle, question, tries: 0 };
    if (rec.text && !rec.sent) {   // answered before, the send failed: send the same answer, no second ask
      try { await send(rec.head + rec.text); rec.sent = true; log('C' + cycle + ' sent (answered earlier)'); } catch (e) { log('C' + cycle + ' send failed again: ' + e.message); }
      state[key] = rec; saveState(state); continue;
    }
    rec.tries = (rec.tries || 0) + 1;
    let a;
    try { a = await G.ask({ question, cycle, asker: ASKER, officeId: to.officeId || undefined }); }
    catch (e) { a = { text: '', finish: 'error: ' + String(e && e.message || e).slice(0, 160) }; }
    rec.officeId = a.officeId || null; rec.name = a.name || null; rec.title = a.title || null; rec.finish = a.finish || null;
    if (a.finish === 'no-record') { rec.text = a.text; }   // the house could not place it: said back to him as it is
    else if (!isAnswer(a)) { state[key] = rec; saveState(state); log('C' + cycle + ' not answered (' + rec.finish + '), try ' + rec.tries + ' of ' + MAX_TRIES); continue; }
    else rec.text = a.text;
    const head = rec.head = '**Gridiron Analytics' + (a.name ? ' — ' + a.name + ', ' + a.title : '') + '** (C' + cycle + ')\n> ' + question.replace(/\n/g, '\n> ') + '\n\n';
    try { await send(head + rec.text); rec.sent = true; log('C' + cycle + ' answered by ' + (a.name || 'the house') + ', sent'); }
    catch (e) { log('C' + cycle + ' answered, send failed: ' + e.message + ' — sent again next run'); }
    state[key] = rec; saveState(state);
  }
}

main().catch((e) => { console.error('[gridiron-feed] ' + (e && e.stack || e)); process.exit(1); });
