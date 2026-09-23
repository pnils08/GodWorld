// C108 bug-move canon repair — Mike-direct 2026-09-23 (kimi, full lead).
// The C108 fire predated the G-EC70 owned-row guard (live @117, 2026-09-22).
// Two restores, both canon-anchored, neither move ever published:
//   HH-0101-B030 — Gregory Mims (POP-00023) + Elena Patel (POP-01030), OWNED,
//     West Oakland -> Rockridge with the $382,800 mortgage rebased to a
//     4,032 Rockridge rent stamp. INSTITUTIONS.md:369 — Mims "lives,
//     pointedly, in West Oakland." Restore hood + the C106 mortgage (1786).
//   HH-0103-F005 — Idris Karim (POP-00761), rented, Temescal -> Rockridge.
//     Canon imam of the Temescal Islamic Center (INSTITUTIONS.md:237).
//     Restore hood + his C106 lease (1703).
// SL rows: Neighborhood restored; the C108 move fields cleared so the
// settled-in check cannot stamp a verdict on a move that never should have
// happened. MigrationIntent left as the mover set it (staying) — consistent
// with no move. The other 19 C108 moves were code-legal and stand (doctrine
// §8). Dry-run default; --apply writes; readback after.
// Usage: node 2026-09-23-c108-move-repair.js --sheet-id=<id> [--apply]
require('/root/GodWorld/lib/env');
const argv = process.argv.slice(2);
const arg = (k, d) => { const m = argv.find(a => a.startsWith('--' + k + '=')); return m ? m.split('=')[1] : d; };
const SHEET = arg('sheet-id', null); const APPLY = argv.includes('--apply');
if (!SHEET) { console.error('need --sheet-id='); process.exit(2); }
process.env.GODWORLD_SHEET_ID = SHEET; // AFTER lib/env (DEPLOY trap 1/2b)
const s = require('/root/GodWorld/lib/sheets');

const TODAY = '9/23/2026';
// Household_Ledger has no LastUpdated column (13-col live schema) — the
// engine's own move writer touches Neighborhood/MonthlyRent only.
const HOUSEHOLD_FIXES = {
  'HH-0101-B030': { Neighborhood: 'West Oakland', MonthlyRent: 1786 },
  'HH-0103-F005': { Neighborhood: 'Temescal', MonthlyRent: 1703 },
};
const CITIZEN_FIXES = {
  'POP-00023': 'West Oakland',  // Gregory Mims
  'POP-01030': 'West Oakland',  // Elena Patel
  'POP-00761': 'Temescal',      // Idris Karim
};

(async () => {
  console.log('target sheet:', process.env.GODWORLD_SHEET_ID, '| apply', APPLY);

  const hhRows = await s.getSheetAsObjects('Household_Ledger');
  for (const [hhId, fix] of Object.entries(HOUSEHOLD_FIXES)) {
    const i = hhRows.findIndex(r => String(r.HouseholdId || '').trim() === hhId);
    if (i < 0) throw new Error(hhId + ' not found on Household_Ledger');
    const r = hhRows[i];
    console.log(hhId, '| now:', r.Neighborhood, 'rent', r.MonthlyRent, 'type', r.HousingType, 'status', r.Status,
      '-> ', fix.Neighborhood, 'rent', fix.MonthlyRent);
    if (String(r.Status).trim() !== 'active') throw new Error(hhId + ' not active — refuse');
    const already = Object.entries(fix).every(([k, v]) => String(r[k]).trim() === String(v));
    if (already) { console.log('  already restored — skip'); continue; }
    if (APPLY) {
      const res = await s.updateRowFields('Household_Ledger', i + 2, fix);
      console.log('  wrote', res.map(x => x.range).join(' '));
    }
  }

  const slRows = await s.getSheetAsObjects('Simulation_Ledger');
  for (const [popid, hood] of Object.entries(CITIZEN_FIXES)) {
    const i = slRows.findIndex(r => String(r.POPID || '').trim() === popid);
    if (i < 0) throw new Error(popid + ' not found on Simulation_Ledger');
    const r = slRows[i];
    console.log(popid, r.Name, '| now:', r.Neighborhood, 'migrated', JSON.stringify(r.MigratedCycle),
      '->', hood, '(move fields cleared)');
    if (String(r.Neighborhood).trim() === hood && !String(r.MigratedCycle || '').trim()) {
      console.log('  already restored — skip'); continue;
    }
    if (String(r.MigratedCycle || '').trim() !== '108') {
      throw new Error(popid + ' MigratedCycle is ' + JSON.stringify(r.MigratedCycle) + ' — expected 108, refuse to touch');
    }
    const fix = { Neighborhood: hood, MigrationDestination: '', MigrationReason: '', MigratedCycle: '', LastUpdated: TODAY };
    if (APPLY) {
      const res = await s.updateRowFields('Simulation_Ledger', i + 2, fix);
      console.log('  wrote', res.map(x => x.range).join(' '));
    }
  }

  if (APPLY) {
    const hhBack = await s.getSheetAsObjects('Household_Ledger');
    for (const hhId of Object.keys(HOUSEHOLD_FIXES)) {
      const r = hhBack.find(x => String(x.HouseholdId || '').trim() === hhId);
      console.log('readback', hhId, '|', r.Neighborhood, 'rent', r.MonthlyRent, 'cost', r.HousingCost, 'type', r.HousingType);
    }
    const slBack = await s.getSheetAsObjects('Simulation_Ledger');
    for (const popid of Object.keys(CITIZEN_FIXES)) {
      const r = slBack.find(x => String(x.POPID || '').trim() === popid);
      console.log('readback', popid, r.Name, '|', r.Neighborhood, '| migrated', JSON.stringify(r.MigratedCycle),
        'dest', JSON.stringify(r.MigrationDestination), '| HH', r.HouseholdId);
    }
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
