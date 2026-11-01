// civic.47 B2 F7 bench probe, bench sheet only — never replay.
//   plant  <C0>  : stage INIT-003 (the Fruitvale transit hub) as a Standing, signed, operational row at bench Cycle C0 with no
//                  baseline, no hold; the original cells are saved to 2026-11-01-c47b2-orig.json for the revert.
//   boost  <C1>  : after fire 1, lift the Fruitvale station's C1 RidershipVolume to 4x the frozen baseline reading (a planted
//                  lift for the next fire to read); Notes carries the bench-only marker.
//   revert       : put INIT-003's cells back from the saved copy.
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === LIVE) process.exit(9);
const fs = require('fs');
const sheets = require('/root/GodWorld/lib/sheets');
const ORIG = '/root/GodWorld/output/engine-sheet/2026-11-01-c47b2-orig.json';
const FIELDS = ['Stage', 'StageBaseline', 'StageHold', 'MayoralAction', 'ImplementationPhase', 'LastStageChangeCycle', 'LastWorkCycle'];
const [mode, arg] = process.argv.slice(2);
(async () => {
  const data = await sheets.getSheetData('Initiative_Tracker');
  const H = data[0];
  for (const f of FIELDS.concat(['InitiativeID', 'PolicyDomain', 'AffectedNeighborhoods'])) if (H.indexOf(f) < 0) { console.error('tracker has no column ' + f); process.exit(4); }
  const ri = data.findIndex((r, i) => i > 0 && r[H.indexOf('InitiativeID')] === 'INIT-003');
  if (ri < 0) { console.error('no INIT-003 on the bench'); process.exit(4); }
  const row = ri + 1;
  const cell = f => data[ri][H.indexOf(f)];
  if (cell('PolicyDomain') !== 'transit' || cell('AffectedNeighborhoods') !== 'Fruitvale') { console.error('INIT-003 is not the Fruitvale transit row'); process.exit(4); }
  if (mode === 'plant') {
    const c0 = Number(arg);
    if (!Number.isInteger(c0)) { console.error('C0 required'); process.exit(2); }
    if (cell('Stage') !== '' && cell('Stage') != null) { console.error('INIT-003 is already staged on the bench — revert first'); process.exit(5); }
    if (!fs.existsSync(ORIG)) fs.writeFileSync(ORIG, JSON.stringify(Object.fromEntries(FIELDS.map(f => [f, cell(f) == null ? '' : cell(f)])), null, 1));
    await sheets.updateRowFields('Initiative_Tracker', row, { Stage: 'Standing', StageBaseline: '', StageHold: '', MayoralAction: 'signed', ImplementationPhase: 'operational', LastStageChangeCycle: c0, LastWorkCycle: c0 });
    console.log('planted INIT-003 at bench C' + c0 + ': Standing / signed / operational, no baseline, no hold (originals saved)');
  } else if (mode === 'boost') {
    const c1 = Number(arg);
    const b = JSON.parse(cell('StageBaseline'));
    const base = Number(b.keys.Fruitvale.RidershipVolume);
    const tm = await sheets.getSheetData('Transit_Metrics'); const T = tm[0];
    const ic = T.indexOf('Cycle'), is = T.indexOf('Station'), ir = T.indexOf('RidershipVolume'), inn = T.indexOf('Notes');
    const hit = tm.map((r, i) => [r, i]).filter(([r, i]) => i > 0 && Number(r[ic]) === c1 && String(r[is]).trim() === 'Fruitvale');
    if (hit.length !== 1) { console.error('expected one Fruitvale row at C' + c1 + ', found ' + hit.length); process.exit(5); }
    const rowNo = hit[0][1] + 1, was = hit[0][0][ir];
    await sheets.updateCell('Transit_Metrics', rowNo, 'RidershipVolume', base * 4);
    await sheets.updateCell('Transit_Metrics', rowNo, 'Notes', 'BENCH-ONLY civic.47 B2 F7 probe - never replay (was ' + was + ')');
    console.log('boosted Fruitvale C' + c1 + ' ridership ' + was + ' -> ' + base * 4 + ' (4x the frozen baseline reading ' + base + ')');
  } else if (mode === 'revert') {
    if (!fs.existsSync(ORIG)) { console.error('no saved originals'); process.exit(5); }
    const o = JSON.parse(fs.readFileSync(ORIG, 'utf8'));
    await sheets.updateRowFields('Initiative_Tracker', row, o);
    console.log('INIT-003 reverted to', JSON.stringify(o));
  } else { console.error('mode plant|boost|revert'); process.exit(2); }
})().catch(e => { console.error(e.message); process.exit(1); });
