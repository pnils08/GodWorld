#!/usr/bin/env node
/**
 * C116 retirement-entry repair (2026-11-15).
 *
 * Cause: one Oakland_Sports_Feed C116 row carried EventTrigger `retirement` by entry error; the engine retired the
 * three GAME-clock names on it (POP-00018 / POP-00527 / POP-00528). POP-00598's Income was also an entry error.
 * This puts back every item that says they are retired. It leaves dial drift, UsageCount, NetWorth increments and
 * DisplacementRisk alone (DisplacementRisk moved hood-wide with HousingPressure, not with their income).
 *
 *   node output/repairs/2026-11-15-c116-retirement-entry-repair.js            # dry run — prints every change, writes nothing
 *   node output/repairs/2026-11-15-c116-retirement-entry-repair.js --apply    # saves the before-file, writes, reads back
 *
 * All-or-nothing: every assertion runs before the first write. Baseline = the C115 ledger snapshot in git.
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const { execSync } = require('child_process');
const sheets = require('/root/GodWorld/lib/sheets');

const APPLY = process.argv.includes('--apply');
const CYCLE = '116';
const IDS = ['POP-00018', 'POP-00527', 'POP-00528'];
const GONZALEZ = 'POP-00598';
const HOUSEHOLDS = { 'HH-0084-004': 13093027, 'HH-0084-371': 30048000, 'HH-0084-372': 7664565, 'HH-0104-F007': 2748000 };
const BEFORE_FILE = '/root/GodWorld/output/repairs/2026-11-15-c116-retirement-entry-BEFORE.json';

const fail = (m) => { console.error('ABORT — nothing written: ' + m); process.exit(1); };
const colL = (i) => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

// C115 baseline from git (the snapshot Step 5.56 later overwrote)
const base = {};
execSync('git -C /root/GodWorld show HEAD:output/simulation_ledger_snapshot.jsonl', { maxBuffer: 1 << 28 }).toString()
  .split('\n').filter(Boolean).forEach((l) => { const r = JSON.parse(l); base[r.POPID] = r; });

(async () => {
  const cellUpdates = [];   // { sheet, row, col, colName, before, after }
  const deletions = [];     // { sheet, row, content }
  const note = (s) => console.log(s);

  // ───────────── Simulation_Ledger ─────────────
  const led = await sheets.getSheetData('Simulation_Ledger');
  const lh = led[0]; const L = (n) => { const i = lh.indexOf(n); if (i < 0) fail('Simulation_Ledger header missing: ' + n); return i; };
  const iPop = L('POPID');
  for (const id of IDS.concat([GONZALEZ])) {
    const r = led.findIndex((row, i) => i > 0 && row[iPop] === id);
    if (r < 0) fail(id + ' not on Simulation_Ledger');
    const row = led[r], b = base[id]; if (!b) fail(id + ' missing from the C115 baseline');
    const set = (name, after) => {
      const i = L(name); const before = row[i];
      if (String(before) === String(after)) return;
      cellUpdates.push({ sheet: 'Simulation_Ledger', row: r + 1, col: i, colName: name, id, before, after });
    };
    if (id === GONZALEZ) {
      if (String(row[L('Income')]) !== '23800000') fail('POP-00598 Income is not the expected 23800000: ' + row[L('Income')]);
      set('Income', Number(b.Income));
      continue;
    }
    if (String(row[L('ClockMode')]) !== 'ENGINE') fail(id + ' ClockMode is not ENGINE (already repaired?)');
    set('ClockMode', 'GAME');
    const role = String(row[L('RoleType')]); if (!/^Former /.test(role)) fail(id + ' RoleType has no "Former " prefix');
    if (role.replace(/^Former /, '') !== b.RoleType) fail(id + ' RoleType restore does not equal C115: ' + role + ' vs ' + b.RoleType);
    set('RoleType', b.RoleType);
    set('Income', Number(b.Income));
    set('CareerStage', b.CareerStage);
    set('EconomicProfileKey', b.EconomicProfileKey);
    // CitizenBio: strip only the engine's `Now:` lead (the engine's own grammar)
    const bio = String(row[L('CitizenBio')]);
    const bioAfter = bio.replace(/^Now:\s[^\n]*?\sC\d+\.(?:\s+|$)/, '').replace(/^\s+/, '');
    if (bioAfter !== String(b.CitizenBio || '')) fail(id + ' CitizenBio after strip does not equal C115');
    set('CitizenBio', bioAfter);
    // MemoryRegisters: C115 value; live must equal C115 plus exactly the Retirement unlived entry
    const mrLive = String(row[L('MemoryRegisters')] || '');
    let mrOk = false;
    try {
      const o = JSON.parse(mrLive); const keep = (o.unlived || []).filter((e) => !(e.tag === 'Retirement' && e.cy === 116));
      if ((o.unlived || []).length - keep.length === 1) {
        const b0 = String(b.MemoryRegisters || '');
        const cmp = b0 ? JSON.stringify(Object.assign({}, o, { unlived: keep })) === JSON.stringify(JSON.parse(b0)) : keep.length === 0 && !(o.biases || []).length;
        mrOk = cmp;
      }
    } catch (e) { /* fall through */ }
    if (!mrOk) fail(id + ' MemoryRegisters is not C115 + one Retirement entry');
    set('MemoryRegisters', String(b.MemoryRegisters || ''));
    // LifeHistory: drop exactly one C116 [Retirement] and one C116 [Maneuver-Climb] line
    const hist = String(row[L('LifeHistory')]).split('\n');
    const keepLines = hist.filter((s) => !/^Y3C12 — \[(Retirement|Maneuver-Climb)\] /.test(s));
    if (hist.length - keepLines.length !== 2) fail(id + ' LifeHistory: expected to drop exactly 2 lines, would drop ' + (hist.length - keepLines.length));
    set('LifeHistory', keepLines.join('\n'));
    // DialState: remove the maneuver key written this cycle
    const ds = JSON.parse(String(row[L('DialState')]));
    if (!ds.maneuver || Number(ds.maneuver.c) !== 116) fail(id + ' DialState has no C116 maneuver key');
    delete ds.maneuver;
    set('DialState', JSON.stringify(ds));
  }

  // ───────────── Household_Ledger ─────────────
  const hl = await sheets.getSheetData('Household_Ledger');
  const hh = hl[0], iH = hh.indexOf('HouseholdId'), iI = hh.indexOf('HouseholdIncome');
  if (iH < 0 || iI < 0) fail('Household_Ledger headers missing');
  for (const [hid, inc] of Object.entries(HOUSEHOLDS)) {
    const r = hl.findIndex((row, i) => i > 0 && row[iH] === hid); if (r < 0) fail(hid + ' not on Household_Ledger');
    cellUpdates.push({ sheet: 'Household_Ledger', row: r + 1, col: iI, colName: 'HouseholdIncome', id: hid, before: hl[r][iI], after: inc });
  }

  // ───────────── LifeHistory_Log ─────────────
  const lg = await sheets.getSheetData('LifeHistory_Log');
  const gh = lg[0], gP = gh.indexOf('POPID'), gT = gh.indexOf('EventTag'), gC = gh.indexOf('Cycle');
  let tagEdits = 0;
  lg.forEach((row, i) => {
    if (i === 0 || String(row[gC]) !== CYCLE || !IDS.includes(row[gP])) return;
    const tag = String(row[gT]);
    if (tag === 'Retirement' || tag === 'Maneuver-Climb') deletions.push({ sheet: 'LifeHistory_Log', row: i + 1, content: row.slice() });
    else if (/occupation:Former /.test(tag)) { cellUpdates.push({ sheet: 'LifeHistory_Log', row: i + 1, col: gT, colName: 'EventTag', id: row[gP], before: tag, after: tag.replace(/occupation:Former /, 'occupation:') }); tagEdits++; }
  });
  const logDel = deletions.filter((d) => d.sheet === 'LifeHistory_Log').length;
  if (logDel !== 6) fail('LifeHistory_Log: expected 6 rows to delete (3 Retirement + 3 Maneuver-Climb), found ' + logDel);
  if (tagEdits !== 4) fail('LifeHistory_Log: expected 4 occupation:Former tags, found ' + tagEdits);

  // ───────────── Story_Seed_Deck / Ripple_Ledger / Story_Hook_Deck ─────────────
  const scrub = (s) => String(s).replace(/A's \[retirement\];\s*/g, '').replace(/;\s*A's \[retirement\]\s*$/g, '').replace(/;\s*retirement: [^;|]+/g, '');
  for (const [tab, keyFn] of [['Story_Seed_Deck', (row, h) => String(row[h.indexOf('Cycle')]) === CYCLE], ['Ripple_Ledger', (row, h) => String(row[h.indexOf('Cycle')]) === CYCLE]]) {
    const d = await sheets.getSheetData(tab); const h = d[0]; let n = 0;
    d.forEach((row, i) => {
      if (i === 0 || !keyFn(row, h)) return;
      row.forEach((cell, c) => {
        const s = String(cell);
        if (/A's \[retirement\]|retirement: (Benji Dillon|Mike Paulson|Deacon Seymour)/.test(s)) {
          cellUpdates.push({ sheet: tab, row: i + 1, col: c, colName: h[c], id: tab + '#' + (i + 1), before: s, after: scrub(s) }); n++;
        }
      });
    });
    note(`${tab}: ${n} cell(s) carry the retirement text`);
    if (tab === 'Story_Seed_Deck' && n < 1) fail('Story_Seed_Deck: expected at least 1 cell');
    if (tab === 'Ripple_Ledger' && n !== 2) fail('Ripple_Ledger: expected 2 cells (rows 909, 930), found ' + n);
  }
  const hd = await sheets.getSheetData('Story_Hook_Deck'); const hH = hd[0];
  const hr = hd.findIndex((row, i) => i > 0 && String(row[hH.indexOf('Cycle')]) === CYCLE && /^A's player retires/.test(String(row[hH.indexOf('HookText')])));
  if (hr < 0) fail('Story_Hook_Deck: the C116 "A\'s player retires" hook was not found');
  deletions.push({ sheet: 'Story_Hook_Deck', row: hr + 1, content: hd[hr].slice() });

  // ───────────── report ─────────────
  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${cellUpdates.length} cell update(s), ${deletions.length} row deletion(s)\n`);
  for (const u of cellUpdates) {
    const b = String(u.before).replace(/\n/g, '⏎'), a = String(u.after).replace(/\n/g, '⏎');
    const clip = (s) => (s.length > 150 ? s.slice(0, 70) + ' … ' + s.slice(-70) : s);
    console.log(`  ${u.sheet} r${u.row} ${u.colName} [${u.id}]\n      - ${clip(b)}\n      + ${clip(a)}`);
  }
  for (const d of deletions) console.log(`  DELETE ${d.sheet} r${d.row}: ${d.content.map((x) => String(x).slice(0, 40)).join(' | ').slice(0, 200)}`);
  if (!APPLY) { console.log('\nDry run only. Nothing written.'); return; }

  // ───────────── apply ─────────────
  fs.writeFileSync(BEFORE_FILE, JSON.stringify({ at: new Date().toISOString(), cellUpdates, deletions }, null, 1));
  console.log('\nbefore-file saved: ' + BEFORE_FILE);
  await sheets.batchUpdate(cellUpdates.map((u) => ({ range: `${u.sheet}!${colL(u.col)}${u.row}`, values: [[u.after]] })));
  console.log('cell updates written');
  const ids = await sheets.getSheetIds([...new Set(deletions.map((d) => d.sheet))]);
  const reqs = deletions.slice().sort((a, b) => (a.sheet === b.sheet ? b.row - a.row : a.sheet.localeCompare(b.sheet)))
    .map((d) => ({ deleteDimension: { range: { sheetId: ids[d.sheet], dimension: 'ROWS', startIndex: d.row - 1, endIndex: d.row } } }));
  await sheets.batchUpdateSpreadsheet(reqs);
  console.log('rows deleted (bottom-up per tab)');

  // ───────────── read-back ─────────────
  let bad = 0;
  const led2 = await sheets.getSheetData('Simulation_Ledger');
  for (const u of cellUpdates.filter((x) => x.sheet === 'Simulation_Ledger')) {
    const live = led2[u.row - 1][u.col];
    if (String(live) !== String(u.after)) { bad++; console.log('  READBACK MISMATCH ' + u.id + ' ' + u.colName); }
  }
  const lg2 = await sheets.getSheetData('LifeHistory_Log');
  const stillRet = lg2.filter((row, i) => i > 0 && String(row[gC]) === CYCLE && IDS.includes(row[gP]) && /^(Retirement|Maneuver-Climb)$/.test(String(row[gT]))).length;
  const stillTag = lg2.filter((row, i) => i > 0 && String(row[gC]) === CYCLE && IDS.includes(row[gP]) && /occupation:Former /.test(String(row[gT]))).length;
  console.log(`read-back: ledger mismatches ${bad}; LifeHistory_Log retirement/maneuver rows left ${stillRet}; Former tags left ${stillTag}`);
  if (bad || stillRet || stillTag) process.exit(2);
  console.log('REPAIR APPLIED AND VERIFIED');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
