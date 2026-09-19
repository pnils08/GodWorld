require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const APPLY = process.argv.includes('--apply');
const row = ['new',
  "Civis Systems recalibrated the city's neighborhood monitoring — the street-activity, safety and neighborhood-mood readings City Hall, the police and every newsroom work from. The revised readings move a lot: West Oakland, Downtown, Jack London, Lake Merritt and Baylight District now read far safer than the old instruments showed (West Oakland and Downtown violent-crime readings roughly halved), while Piedmont Ave, Rockridge, Glenview, Laurel, Grand Lake and Ivy Hill read higher than before. West Oakland's commercial activity now reads about double the old figure; Temescal's about half. Open for the desks: how long the old readings were off, which city decisions rested on them, and whether Civis earns credit for the fix or answers for the error.",
  '', 'Elias Varek', 'high', ''];
(async () => {
  console.log(JSON.stringify(row));
  if (!APPLY) { console.log('dry-run'); return; }
  await sheets.appendRows('Storyline_Intake', [row]);
  const si = await sheets.getSheetData('Storyline_Intake');
  const last = si[si.length - 1];
  console.log('read-back last row:', last[0], '|', last[3], '|', last[4], '|status=' + (last[5] || ''), '| rows', si.length - 1, '| match', last[1] === row[1]);
})().catch(e => console.log('ERR', e.message));
