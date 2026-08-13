#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/citizen-wake-coverage.test.js
 *
 * Wake-pool coverage + wiki recall. No Sheets, no Supermemory, no model.
 * Pins: shapedMin:0 on the cron pool; morning return vs first-timer lanes;
 * voiced slot cannot re-pick someone already in recent; local page cache
 * fills the prompt when Supermemory readback is empty.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const dials = require('/root/GodWorld/lib/citizenDials');
const { _hash53 } = require('/root/GodWorld/lib/provocationBank');
const wake = require('./citizen-wake');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { passed++; console.log('ok   ' + label); }
  else { failed++; console.log('FAIL ' + label + (detail ? ': ' + detail : '')); }
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wake-cov-'));

function flatCur() {
  const o = {};
  for (const d of dials.DIALS) o[d] = 50;
  return o;
}

function person(id, extra) {
  return Object.assign({
    popId: id,
    name: id,
    occ: 'baker',
    nh: 'Temescal',
    age: 40,
    cur: flatCur(),
    eventMag: 1,
    life: 'Y2C51 — [Daily] opened the shop',
    memReg: '',
  }, extra || {});
}

function voicedCycle(wakeName) {
  for (let c = 1; c < 400; c++) {
    if (_hash53('voiced:' + c + ':' + wakeName, 0x5eed) % 5 === 0) return c;
  }
  throw new Error('no voiced cycle for ' + wakeName);
}

function silentCycle(wakeName) {
  for (let c = 1; c < 400; c++) {
    if (_hash53('voiced:' + c + ':' + wakeName, 0x5eed) % 5 !== 0) return c;
  }
  throw new Error('no silent cycle for ' + wakeName);
}

// ── source contract ────────────────────────────────────────────────────────
const src = fs.readFileSync(path.join(__dirname, 'citizen-wake.js'), 'utf8');
assert('cron pool drops SHAPED_MIN (shapedMin: 0)', /buildPool\(\{\s*shapedMin:\s*0\s*\}\)/.test(src));
assert('LIFE_MIN_CHARS stays the default confab floor', !/buildPool\(\{\s*shapedMin:\s*0,\s*lifeMinChars:\s*0/.test(src));
assert('page-recall is logged', /page-recall: sm=/.test(src));
assert('local page cache writes on live append', /appendLocalPage\(c\.popId/.test(src));
assert('wake drains Reflection_Intake into DialState', /drainIntake\.drain\(/.test(src));

// ── seedEver from snapshot SMPageId ────────────────────────────────────────
{
  const snap = path.join(TMP, 'snap.jsonl');
  fs.writeFileSync(snap, [
    JSON.stringify({ POPID: 'POP-00001', SMPageId: 'cp-POP-00001' }),
    JSON.stringify({ POPID: 'POP-00999', SMPageId: '' }),
    JSON.stringify({ POPID: 'POP-00170', SMPageId: 'cp-POP-00170' }),
    '{bad',
  ].join('\n'));
  const st = wake.seedEver({ recent: [], ever: [] }, snap);
  assert('seedEver marks everSeeded', st.everSeeded === true);
  assert('seedEver keeps citizens with a page', st.ever.includes('POP-00001') && st.ever.includes('POP-00170'));
  assert('seedEver skips blank SMPageId', !st.ever.includes('POP-00999'));
  const again = wake.seedEver(st, snap);
  assert('seedEver is idempotent', again.ever.length === st.ever.length);
}

// ── lanes ──────────────────────────────────────────────────────────────────
const VINNIE = person('POP-00001', { name: 'Vinnie Keane', occ: 'Designated Hitter', nh: 'Rockridge' });
const BAKER = person('POP-00170', { name: 'Melton Neilon', occ: 'baker', nh: 'Temescal' });
const NEWB = person('POP-00940', { name: 'New Citizen', occ: 'clerk', nh: 'Fruitvale' });
const pool = [VINNIE, BAKER, NEWB];
const everState = { recent: [], ever: ['POP-00001', 'POP-00170'] };
const morningQuiet = silentCycle('morning');
const middayQuiet = silentCycle('midday');
const morningVoice = voicedCycle('morning');

{
  const picked = wake.selectCitizen(pool, everState, morningQuiet, {
    wake: 'morning', forcePop: null, voicedIds: ['POP-00001'],
  });
  assert('morning prefers a return visit', picked.slot === 'return' && picked.c.popId !== 'POP-00940',
    JSON.stringify({ slot: picked.slot, id: picked.c.popId }));
}

{
  const picked = wake.selectCitizen(pool, everState, middayQuiet, {
    wake: 'midday', forcePop: null, voicedIds: ['POP-00001'],
  });
  assert('midday prefers a first-timer', picked.slot === 'first' && picked.c.popId === 'POP-00940',
    JSON.stringify({ slot: picked.slot, id: picked.c.popId }));
}

{
  const st = { recent: ['POP-00001'], ever: ['POP-00001', 'POP-00170'] };
  const picked = wake.selectCitizen(pool, st, morningVoice, {
    wake: 'morning', forcePop: null, voicedIds: ['POP-00001'],
  });
  assert('voiced slot will not re-pick someone already in recent', picked.c.popId !== 'POP-00001',
    JSON.stringify({ slot: picked.slot, id: picked.c.popId }));
}

{
  const picked = wake.selectCitizen(pool, everState, 1, {
    wake: 'morning', forcePop: 'POP-00940', voicedIds: ['POP-00001'],
  });
  assert('--pop still forces a first-timer', picked.slot === 'forced' && picked.c.popId === 'POP-00940');
}

// ── local wiki cache ───────────────────────────────────────────────────────
{
  const dir = path.join(TMP, 'pages');
  assert('appendLocalPage writes', wake.appendLocalPage('POP-00170', { cycle: 103, wake: 'morning', text: 'I opened the shop before the oven caught.' }, dir) === true);
  wake.appendLocalPage('POP-00170', { cycle: 103, wake: 'midday', text: 'The sourdough cracked the way it does on a cold morning.' }, dir);
  const rec = wake.loadLocalPage('POP-00170', 3, dir);
  assert('loadLocalPage newest first', rec[0] === 'The sourdough cracked the way it does on a cold morning.');
  assert('loadLocalPage keeps prior visit', rec[1] === 'I opened the shop before the oven caught.');
  assert('missing page is empty', wake.loadLocalPage('POP-00000', 3, dir).length === 0);
}

{
  const sm = wake.resolvePageMemory('POP-00170', '<memory-context>from supermemory</memory-context>', ['local leftover']);
  assert('supermemory wins when present', sm.source === 'supermemory' && /from supermemory/.test(sm.block));
  const loc = wake.resolvePageMemory('POP-00170', '', ['I opened the shop before the oven caught.']);
  assert('local fills an empty supermemory read', loc.source === 'local' && /opened the shop/.test(loc.block));
  const empty = wake.resolvePageMemory('POP-00170', '', []);
  assert('empty stays empty', empty.source === 'empty' && empty.block === '');
}

// ── prompt actually sees the page ──────────────────────────────────────────
{
  const { system } = wake.buildVoicePrompts(
    BAKER, [], '', '', '', '', '', '',
    '<memory-context source="citizen-page:POP-00170">I opened the shop before the oven caught.</memory-context>',
    103, '', '', '', '', '',
  );
  assert('return-visit prompt carries the last page entry',
    /What's been on your mind lately/.test(system) && /opened the shop/.test(system));
}

{
  const { system, user } = wake.buildVoicePrompts(
    person('POP-00170', { life: 'Y2C51 — [Daily] spent time unwinding in the evening' }),
    [], '', '', '', '', '', '', '',
    103, '', '', '', '', '',
    'opened the oven on a cold-morning crack in the sourdough, glad the regulars still came',
  );
  assert('ECL grain sits in the prompt as the event',
    /sit inside this event/.test(system) && /cold-morning crack/.test(system));
  assert('vague Daily stamp yields to the composed line',
    /dial mark/.test(system) && /This is what happened/.test(user));
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}

console.log(failed === 0 ? `\nPASS — ${passed} passed` : `\nFAIL — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
