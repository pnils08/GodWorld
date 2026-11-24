// engine.356 (builder 2026-11-24: "go , use the canon details, go , yes"): live sheet edits, each checked
// against the old value first and read back.
//   node apply.js            (live)
// 1. Community_Programs: new column H Place_Kind; three City-wide rows get the hood canon gives.
// 2. Business_Ledger BIZ-00061 Name = the canon name of the congregation (docs/canon/INSTITUTIONS.md);
//    Event_Content_Ledger row 904 says the same name.
// 3. Business_Intake: the four congregations with no ledger row, staged — scripts/processBusinessIntake.js
//    mints them (the one birth table), run after this.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const KIND = { 'PRG-001': 'none', 'PRG-002': 'field', 'PRG-003': 'field', 'PRG-004': 'field', 'PRG-005': 'court', 'PRG-006': 'field', 'PRG-007': 'field',
  'PRG-008': 'none', 'PRG-009': 'market', 'PRG-011': 'studio', 'PRG-012': 'archive', 'PRG-013': 'none', 'PRG-017': 'lab', 'PRG-018': 'clinic', 'PRG-020': 'none',
  'PRG-021': 'none', 'PRG-022': 'pantry', 'PRG-023': 'lunch hall', 'PRG-024': 'lunch hall', 'PRG-025': 'none', 'PRG-026': 'pantry', 'PRG-027': 'none',
  'PRG-028': 'none', 'PRG-029': 'none', 'PRG-030': 'school', 'PRG-031': 'meeting hall', 'PRG-032': 'none' };  // blank: 010, 014, 015, 016, 019, 033 — the name does not say
const HOOD = { 'PRG-015': 'Chinatown', 'PRG-028': 'West Oakland', 'PRG-033': 'West Oakland' };
const STAGE = [['Bay Pure Land Buddhist Temple', 'Chinatown'], ['Bharat Mandir of the East Bay', 'Montclair'], ['Gurdwara Singh Sabha Fruitvale', 'Fruitvale'], ['Or Hashalom Renewal Community', 'Grand Lake']];
(async () => {
  const up = [];
  const cp = await sheets.getSheetData('Community_Programs');
  if (JSON.stringify(cp[0]) !== JSON.stringify(['Program_ID', 'Name', 'Founder_POPID', 'Neighborhood', 'Type', 'Founded_Cycle', 'Status']) && cp[0][7] !== 'Place_Kind') throw new Error('Community_Programs header moved');
  if (cp[0][7] !== 'Place_Kind') up.push({ range: 'Community_Programs!H1', values: [['Place_Kind']] });
  cp.slice(1).forEach((r, i) => {
    const id = r[0], row = i + 2;
    if (KIND[id] !== undefined && r[7] !== KIND[id]) up.push({ range: 'Community_Programs!H' + row, values: [[KIND[id]]] });
    if (HOOD[id]) { if (r[3] === 'City-wide') up.push({ range: 'Community_Programs!D' + row, values: [[HOOD[id]]] }); else if (r[3] !== HOOD[id]) throw new Error(id + ' hood is ' + r[3]); }
  });
  const bl = await sheets.getSheetData('Business_Ledger');
  const bi = bl.findIndex(r => r[0] === 'BIZ-00061');
  if (bl[bi][1] === 'Adams Point United Methodist Church') up.push({ range: 'Business_Ledger!B' + (bi + 1), values: [['Adams Point United Methodist']] });
  else if (bl[bi][1] !== 'Adams Point United Methodist') throw new Error('BIZ-00061 is ' + bl[bi][1]);
  const ecl = await sheets.getSheetData('Event_Content_Ledger');
  const OLD = 'heard the hymns through the open doors of Adams Point United Methodist Church', NEW = 'heard the hymns through the open doors of Adams Point United Methodist';
  if (ecl[903][3] === OLD) up.push({ range: 'Event_Content_Ledger!D904', values: [[NEW]] }); else if (ecl[903][3] !== NEW) throw new Error('ECL 904 is ' + ecl[903][3]);
  const it = await sheets.getSheetData('Business_Intake');
  if (JSON.stringify(it[0]) !== JSON.stringify(['Name', 'Sector', 'Neighborhood', 'Description', 'SourceEdition', 'SourceCycle', 'Status'])) throw new Error('Business_Intake header moved');
  let at = it.length + 1, staged = 0;
  for (const [n, h] of STAGE) {
    if (it.some(r => r[0] === n) || bl.some(r => r[1] === n)) continue;
    up.push({ range: 'Business_Intake!A' + at + ':G' + at, values: [[n, 'Faith Organization', h, 'congregation on Faith_Organizations with no ledger row (builder 2026-11-24)', 'Faith_Organizations', '117', 'staged']] }); at++; staged++;
  }
  if (up.length) await sheets.batchUpdate(up);
  const cp2 = await sheets.getSheetData('Community_Programs'), bl2 = await sheets.getSheetData('Business_Ledger'), ecl2 = await sheets.getSheetData('Event_Content_Ledger'), it2 = await sheets.getSheetData('Business_Intake');
  const miss = [];
  if (cp2[0][7] !== 'Place_Kind') miss.push('header');
  cp2.slice(1).forEach(r => { if (KIND[r[0]] !== undefined && r[7] !== KIND[r[0]]) miss.push(r[0] + ' kind'); if (HOOD[r[0]] && r[3] !== HOOD[r[0]]) miss.push(r[0] + ' hood'); });
  if (bl2[bi][1] !== 'Adams Point United Methodist') miss.push('BIZ-00061'); if (ecl2[903][3] !== NEW) miss.push('ECL 904');
  const st = it2.filter(r => STAGE.some(s => s[0] === r[0]) && r.length === 7).length;
  console.log(JSON.stringify({ cellsWritten: up.length, stagedNow: staged, intakeRowsForTheFour: st, kinds: cp2.slice(1).filter(r => r[7]).length, blank: cp2.slice(1).filter(r => !r[7]).map(r => r[0]), cityWideLeft: cp2.slice(1).filter(r => r[3] === 'City-wide').map(r => r[0]), miss }));
  process.exit(miss.length ? 1 : 0);
})().catch(e => { console.error(e.message || e); process.exit(2); });
