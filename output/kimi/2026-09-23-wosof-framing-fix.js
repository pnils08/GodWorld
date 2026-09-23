// engine.255 framing fix — Mike ruling 2026-09-23: the Fund's framing is
// rewritten, hood canon stands. INIT-001 keeps its published name, hood, vote
// history and $28M authorization; the MilestoneNotes line records the
// chartered scope (long-tenure remnant, not hood-wide relief) and the
// published C84–C90 disbursement (47 checks, ~$4.2M, Okoro) so Sunday's arm
// does not read the row as never-disbursed. One row, one field. Dry-run
// default; --apply writes. Readback after apply.
// Usage: node 2026-09-23-wosof-framing-fix.js --sheet-id=<id> [--apply]
require('/root/GodWorld/lib/env');
const argv = process.argv.slice(2);
const arg = (k, d) => { const m = argv.find(a => a.startsWith('--' + k + '=')); return m ? m.split('=')[1] : d; };
const SHEET = arg('sheet-id', null); const APPLY = argv.includes('--apply');
if (!SHEET) { console.error('need --sheet-id='); process.exit(2); }
process.env.GODWORLD_SHEET_ID = SHEET; // AFTER lib/env (DEPLOY trap 1/2b)
const s = require('/root/GodWorld/lib/sheets');

const LINE = 'C108: scope recorded as chartered — stabilization grants for ' +
  'long-tenure West Oakland residents priced out as the flats built out (the ' +
  'remnant the charter named), not hood-wide relief; 47 checks (~$4.2M) ' +
  'disbursed under Deputy Mayor Okoro\u2019s authority C84–C90; authorization ' +
  '$28M, ~$23.8M remaining.';

(async () => {
  console.log('target sheet:', process.env.GODWORLD_SHEET_ID, '| apply', APPLY);
  const rows = await s.getSheetAsObjects('Initiative_Tracker');
  const i = rows.findIndex(r => String(r.InitiativeID || '').trim() === 'INIT-001');
  if (i < 0) throw new Error('INIT-001 not found on Initiative_Tracker');
  const r = rows[i];
  console.log('INIT-001 | Name:', JSON.stringify(r.Name), '| Domain:', r.PolicyDomain,
    '| Hoods:', JSON.stringify(r.AffectedNeighborhoods), '| Stage:', JSON.stringify(r.Stage));
  if (String(r.AffectedNeighborhoods || '').trim() !== 'West Oakland') {
    throw new Error('AffectedNeighborhoods drifted — expected "West Oakland", got ' + JSON.stringify(r.AffectedNeighborhoods));
  }
  const notes = String(r.MilestoneNotes || '');
  if (notes.indexOf('scope recorded as chartered') >= 0) {
    console.log('framing line already present — idempotent no-op');
    return;
  }
  const update = { MilestoneNotes: (notes ? notes + '\n' : '') + LINE };
  console.log((APPLY ? 'appending' : '[dry] would append') + ' MilestoneNotes line:\n' + LINE);
  if (APPLY) {
    const res = await s.updateRowFields('Initiative_Tracker', i + 2, update);
    console.log('wrote', res.map(x => x.range).join(' '));
    const back = await s.getSheetAsObjects('Initiative_Tracker');
    const b = back.find(x => String(x.InitiativeID || '').trim() === 'INIT-001');
    const ok = String(b.MilestoneNotes || '').indexOf('scope recorded as chartered') >= 0;
    console.log('readback:', ok ? 'framing line PRESENT' : 'FRAMING LINE MISSING');
    console.log('readback MilestoneNotes tail:', JSON.stringify(String(b.MilestoneNotes || '').slice(-320)));
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
