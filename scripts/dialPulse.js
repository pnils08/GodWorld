#!/usr/bin/env node
/**
 * dialPulse.js — engine.349: print how the dials moved in the last Cycle, in plain words.
 * Reads Dial_Pulse (one row a Cycle) and Dial_Moves (the last Cycle's movers) from the sheet.
 * Read-only. Usage: node scripts/dialPulse.js [--top=10]
 */
require('/root/GodWorld/lib/env');
const sheets = require('../lib/sheets');

const top = Number((process.argv.find((a) => a.startsWith('--top=')) || '').split('=')[1]) || 10;
const DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout', 'fandom'];

async function tab(name) {
  try { return await sheets.getSheetAsObjects(name); } catch (e) { return null; }
}

(async () => {
  const pulse = await tab('Dial_Pulse');
  if (!pulse || !pulse.length) { console.log('Dial_Pulse has no rows yet — it fills at the first Cycle fired on engine.349.'); return; }
  const last = pulse[pulse.length - 1], prev = pulse.length > 1 ? pulse[pulse.length - 2] : null;
  const n = (row, k) => Number(row[k]) || 0;
  const was = (k) => (prev ? ` (C${prev.Cycle}: ${n(prev, k)})` : '');
  console.log(`Dials, Cycle ${last.Cycle} — ${n(last, 'Citizens')} citizens`);
  console.log(`  moved for good: ${n(last, 'Moved')}${was('Moved')}`);
  console.log(`  crossed a band: ${n(last, 'CrossedBand')}${was('CrossedBand')}`);
  console.log(`  in the middle on all eight: ${n(last, 'AllMiddle')}${was('AllMiddle')}`);
  console.log(`  low on something: ${n(last, 'AnyLow')}${was('AnyLow')} · high on something: ${n(last, 'AnyHigh')}${was('AnyHigh')}`);
  console.log('  up / down by dial: ' + DIALS.map((d) => `${d} ${n(last, d + 'Up')}/${n(last, d + 'Down')}`).join(' · '));
  console.log(`  lines folded ${n(last, 'LinesFolded')} · reflections ${n(last, 'Reflections')} · worn ${n(last, 'Worn')} · regained ${n(last, 'Regained')}`);
  const moves = await tab('Dial_Moves');
  if (!moves || !moves.length) { console.log('\nNo one moved for good this Cycle.'); return; }
  const big = moves.slice().sort((a, b) => Math.abs(Number(b.Change)) - Math.abs(Number(a.Change))).slice(0, top);
  console.log(`\nBiggest ${big.length} moves:`);
  big.forEach((m) => console.log(`  ${m.Name || m.POPID} — ${m.Dial} ${m.From} → ${m.To}${Number(m.BandFrom) !== Number(m.BandTo) ? ' (crossed a band)' : ''} — ${m.Why}`));
})().catch((e) => { console.error('dialPulse: ' + e.message); process.exit(1); });
