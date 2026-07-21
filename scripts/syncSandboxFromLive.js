/**
 * syncSandboxFromLive.js — reset the sandbox bench to live-equivalent state.
 *
 * engine.73 follow-on (S328, Mike-approved): replaces the manual version-history
 * revert in the groundhog loop. Live is always the complete truth (every direct
 * sheet write is replayed on live per DEPLOY.md doctrine), so the bench resets
 * FROM live — version-history reverts lost any direct writes that postdated the
 * sandbox's copy snapshot.
 *
 * Values-only (engine reads values; formatting irrelevant). Tabs present on
 * live are synced (created on the sandbox if missing); sandbox-only tabs are
 * left untouched and reported. PropertiesService carry-state is NOT touched —
 * the first post-sync fire is the documented groundhog cold-start.
 *
 * Direction is hard-guarded: source = GODWORLD_SHEET_ID (live, read-only),
 * dest = explicit sandbox ID argument. Refuses dest === live.
 *
 * Usage:
 *   node scripts/syncSandboxFromLive.js <sandboxSheetId>          # dry-run report
 *   node scripts/syncSandboxFromLive.js <sandboxSheetId> --apply  # execute
 */
require('/root/GodWorld/lib/env');
const { google } = require('googleapis');

const LIVE = process.env.GODWORLD_SHEET_ID;
const DEST = process.argv[2];
const APPLY = process.argv.includes('--apply');

async function main() {
  if (!LIVE) throw new Error('GODWORLD_SHEET_ID not set');
  if (!DEST) throw new Error('usage: node scripts/syncSandboxFromLive.js <sandboxSheetId> [--apply]');
  if (DEST === LIVE) throw new Error('REFUSED: destination is the LIVE sheet');

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const api = google.sheets({ version: 'v4', auth });

  const [liveMeta, destMeta] = await Promise.all([
    api.spreadsheets.get({ spreadsheetId: LIVE }),
    api.spreadsheets.get({ spreadsheetId: DEST }),
  ]);
  console.log(`source (LIVE): ${liveMeta.data.properties.title} — ${liveMeta.data.sheets.length} tabs`);
  console.log(`dest (BENCH):  ${destMeta.data.properties.title} — ${destMeta.data.sheets.length} tabs`);

  const liveTabs = liveMeta.data.sheets.map(s => s.properties.title);
  const destTabs = new Set(destMeta.data.sheets.map(s => s.properties.title));
  const benchOnly = [...destTabs].filter(t => !liveTabs.includes(t));
  const missing = liveTabs.filter(t => !destTabs.has(t));

  console.log(`tabs to sync: ${liveTabs.length} | missing on bench (will create): ${missing.length}${missing.length ? ' — ' + missing.join(', ') : ''}`);
  if (benchOnly.length) console.log(`bench-only tabs (untouched): ${benchOnly.join(', ')}`);

  // Read all live tab values in chunks of 15 ranges per batchGet.
  const values = {};
  for (let i = 0; i < liveTabs.length; i += 15) {
    const chunk = liveTabs.slice(i, i + 15);
    const res = await api.spreadsheets.values.batchGet({
      spreadsheetId: LIVE,
      ranges: chunk.map(t => `'${t.replace(/'/g, "''")}'`),
    });
    res.data.valueRanges.forEach((vr, j) => { values[chunk[j]] = vr.values || []; });
  }

  let totalRows = 0;
  liveTabs.forEach(t => { totalRows += values[t].length; });
  console.log(`read ${totalRows} rows across ${liveTabs.length} tabs from live`);

  // Sanitize: the values API caps writes at 50k chars/cell, but Apps Script
  // setValue can exceed it (live Media_Briefing history rows run 50-60k).
  // Oversized cells are truncated — they're regenerated display artifacts
  // (per-cycle briefings), never engine inputs.
  const CELL_CAP = 49900; // marker suffix must keep total under the 50k API limit
  let truncated = 0;
  liveTabs.forEach(t => {
    values[t].forEach(row => {
      for (let c = 0; c < row.length; c++) {
        if (typeof row[c] === 'string' && row[c].length > CELL_CAP) {
          row[c] = row[c].slice(0, CELL_CAP) + '…[SYNC-TRUNCATED]';
          truncated++;
        }
      }
    });
  });
  if (truncated) console.log(`sanitized ${truncated} oversized cell(s) (>${CELL_CAP} chars, values-API cap)`);

  if (!APPLY) {
    console.log('DRY RUN — no writes. Re-run with --apply to sync.');
    return;
  }

  // Create any missing tabs first.
  if (missing.length) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: DEST,
      requestBody: { requests: missing.map(t => ({ addSheet: { properties: { title: t } } })) },
    });
    console.log(`created ${missing.length} missing tab(s) on bench`);
  }

  // Batched writes — quota is 60 write-requests/min/user; per-tab clear+update
  // (142 calls) blows it. One batchClear + chunked batchUpdates ≈ 9 calls.
  const quoted = t => `'${t.replace(/'/g, "''")}'`;
  await api.spreadsheets.values.batchClear({
    spreadsheetId: DEST,
    requestBody: { ranges: liveTabs.map(quoted) },
  });
  console.log('bench tabs cleared (1 batch call)');

  const CHUNK = 10;
  for (let i = 0; i < liveTabs.length; i += CHUNK) {
    const chunk = liveTabs.slice(i, i + CHUNK).filter(t => values[t].length);
    if (!chunk.length) continue;
    await api.spreadsheets.values.batchUpdate({
      spreadsheetId: DEST,
      requestBody: {
        valueInputOption: 'RAW',
        data: chunk.map(t => ({ range: `${quoted(t)}!A1`, values: values[t] })),
      },
    });
    console.log(`  ...${Math.min(i + CHUNK, liveTabs.length)}/${liveTabs.length} tabs written`);
  }
  console.log(`SYNCED ${liveTabs.length} tabs. Bench is live-equivalent.`);

  // Read-back spot check: row counts on 5 highest-volume tabs.
  const top = liveTabs.map(t => [t, values[t].length]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const check = await api.spreadsheets.values.batchGet({
    spreadsheetId: DEST,
    ranges: top.map(([t]) => `'${t.replace(/'/g, "''")}'`),
  });
  let pass = true;
  check.data.valueRanges.forEach((vr, i) => {
    const got = (vr.values || []).length;
    const want = top[i][1];
    const ok = got === want;
    if (!ok) pass = false;
    console.log(`  verify ${top[i][0]}: bench ${got} rows vs live ${want} — ${ok ? 'OK' : 'MISMATCH'}`);
  });
  if (!pass) { console.error('READ-BACK MISMATCH — investigate before firing the bench.'); process.exit(1); }
  console.log('Read-back verified. PropertiesService note: first post-sync fire is a groundhog cold-start.');
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); });
