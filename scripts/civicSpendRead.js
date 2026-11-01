#!/usr/bin/env node
// civic.47 watch (builder 2026-11-01, "we can watch for it"): what each seat spent per call now that the answer caps
// are off. Reads the saved records only — weekday datawake records (output/cron-civic/datawakes/<dir>_<date>.json)
// and the Sunday stage files (mayor_open_c<N>, hearing_c<N>, mayor_gavel_c<N>, directive_c<N>). No model calls.
//   node scripts/civicSpendRead.js --cycle=114          Sunday stages of one Cycle
//   node scripts/civicSpendRead.js --date=2026-11-02    one weekday run
// Columns: seat | model | tokens in / out | statement words | moves. A seat near 4,000 out, or statement words far
// above the others, is the "spent the whole turn writing" signal.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), CIVIC = path.join(ROOT, 'output', 'cron-civic');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const words = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const row = (seat, model, usage, text, moves) => console.log(
  String(seat).padEnd(26), String(model || '').padEnd(34), String((usage || {}).prompt_tokens ?? '-').padStart(6), '/', String((usage || {}).completion_tokens ?? '-').padEnd(6), String(words(text)).padStart(5), 'w', moves === undefined ? '' : String(moves));
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const date = arg('date'), cycle = arg('cycle');
if (date) {
  const dir = path.join(CIVIC, 'datawakes');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('_' + date + '.json')) : [];
  if (!files.length) { console.log('no weekday records for ' + date); process.exit(0); }
  console.log('weekday ' + date); console.log('seat'.padEnd(26), 'model'.padEnd(34), '    in /  out  ', ' words moves');
  for (const f of files.sort()) { const r = readJson(path.join(dir, f)); if (!r) continue; row(r.agentDir, r.model, r.usage, r.statement, (r.moves || []).map(m => m.type).join(',') || '-'); }
} else if (cycle) {
  console.log('Sunday C' + cycle); console.log('seat'.padEnd(26), 'model'.padEnd(34), '    in /  out  ', ' words');
  for (const st of ['mayor_open', 'mayor_gavel', 'directive']) {
    const r = readJson(path.join(CIVIC, st + '_c' + cycle + '.json')); if (!r) continue;
    const text = JSON.stringify(r.statements || r.blocks || r.json || r).slice(0, 200000);
    row(st, r.model, r.usage, text);
  }
  const h = readJson(path.join(CIVIC, 'hearing_c' + cycle + '.json'));
  const seats = h && (h.seats || h.results || h.records || []);
  for (const s of Array.isArray(seats) ? seats : Object.values(seats || {})) if (s && typeof s === 'object') row(s.slug || s.dir || s.office || '?', s.model, s.usage, JSON.stringify(s.statements || s.json || ''));
} else { console.error('give --cycle=<N> or --date=<YYYY-MM-DD>'); process.exit(2); }
