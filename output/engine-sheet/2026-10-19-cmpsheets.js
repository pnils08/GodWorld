// usage: node cmpsheets.js <idA> <idB>  — typed (UNFORMATTED) compare of every grid tab
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const [A, B] = process.argv.slice(2);
(async () => {
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const api = google.sheets({ version: 'v4', auth });
  const [ma, mb] = await Promise.all([A, B].map(id => api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets.properties' })));
  const tabs = s => s.data.sheets.filter(x => !x.properties.sheetType || x.properties.sheetType === 'GRID').map(x => x.properties.title);
  const ta = tabs(ma), tb = tabs(mb);
  console.log('A', ma.data.properties.title, ta.length, 'tabs | B', mb.data.properties.title, tb.length, 'tabs');
  const onlyA = ta.filter(t => !tb.includes(t)), onlyB = tb.filter(t => !ta.includes(t));
  if (onlyA.length || onlyB.length) console.log('only A:', onlyA.join(','), '| only B:', onlyB.join(','));
  let diffTabs = 0, rowsTotal = 0;
  for (let i = 0; i < ta.length; i += 20) {
    const chunk = ta.slice(i, i + 20).filter(t => tb.includes(t));
    const q = id => api.spreadsheets.values.batchGet({ spreadsheetId: id, ranges: chunk.map(t => `'${t.replace(/'/g, "''")}'`), valueRenderOption: 'UNFORMATTED_VALUE' });
    const [ra, rb] = await Promise.all([q(A), q(B)]);
    chunk.forEach((t, k) => {
      const va = ra.data.valueRanges[k].values || [], vb = rb.data.valueRanges[k].values || [];
      rowsTotal += va.length;
      let cells = 0, first = null;
      const n = Math.max(va.length, vb.length);
      for (let r = 0; r < n; r++) { const x = va[r] || [], y = vb[r] || []; const m = Math.max(x.length, y.length);
        for (let c = 0; c < m; c++) { const p = x[c] === undefined ? '' : x[c], q2 = y[c] === undefined ? '' : y[c]; if (String(p) !== String(q2)) { cells++; if (!first) first = `R${r + 1}C${c + 1} A=${String(p).slice(0, 40)} B=${String(q2).slice(0, 40)}`; } } }
      if (cells) { diffTabs++; console.log('DIFF', t, cells, 'cells; first', first); }
    });
  }
  console.log('compared', ta.length, 'tabs,', rowsTotal, 'rows; tabs with diffs:', diffTabs);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
