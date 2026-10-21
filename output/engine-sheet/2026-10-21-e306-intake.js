// engine.306 landing (es wiring card + codex plan review 2026-10-21 items 1/5/7 + codex diff gate 2026-10-21 item 2): the 103 roster
// rows reach Business_Ledger through Business_Intake → scripts/processBusinessIntake.js (row provenance, normalized-dup check,
// engine.96 high-water), then the one realign cell (BIZ-00039 Pulse District Downtown → Uptown, compare-and-set), then a typed receipt.
// Target identity is pinned: bench = the 1004 id, live = LIVE_ID below and the env id must equal it; both titles checked.
// The sheet's state picks the mode (the preimage is saved first, every mode):
//   fresh    — Business_Intake absent, ledger = the 180, mark 186: create + stage the 103 (`staged`, Description "engine.306
//              builder-approved hood character at C112: <Reason>", Source blank), read every staged cell back, run the processor.
//   restage  — Business_Intake holds exactly the 103 roster rows, all `staged`, and none of them is on the ledger (the processor
//              never appended): the fresh run's original preimage must be on disk and the 180 A:I must still equal it cell for
//              cell; the fresh gates (mark, max active, dups, D40) apply; run the processor again.
//   recover  — all 103 on the ledger as rows 181..283, IDs consecutive in roster order (the processor appended, then died): needs
//              --recover; raises the mark to the last ID if behind, writes the Status column `promoted` in one call, adds the missing
//              data/employer_mapping.json entries (live), then the realign + receipt. Never re-runs the processor.
//   anything else (some rows on the ledger, a different intake) — stop, nothing written.
// fresh / restage on live also gate data/employer_mapping.json: none of the 103 IDs is in it yet.
// Receipt: per intake row i — A:F = the staged row, Status `promoted`, and the ledger row with ID start+i carries its Name / Sector /
// Neighborhood and the seed E–H, blank I, at sheet row 182+i; the original 180 rows A:I equal the fresh run's preimage (the
// -original file for restage / recover) except D of BIZ-00039 = Uptown; mark = last ID; 283 rows; mapping: live holds exactly one
// entry per new bizId and it is the roster row, bench is byte-identical to before the run.
// usage: node output/engine-sheet/2026-10-21-e306-intake.js --target bench|live [--apply] [--go] [--recover]   (live --apply needs --go)
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const fs = require('fs'), crypto = require('crypto'), cp = require('child_process');
const { economicSeedForSector } = require('/root/GodWorld/scripts/ingestPublishedEntities');
const APPLY = process.argv.includes('--apply'), GO = process.argv.includes('--go'), RECOVER = process.argv.includes('--recover');
const target = process.argv[process.argv.indexOf('--target') + 1] || '';
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const LIVE_ID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk', LIVE_TITLE = 'Simulation_Narrative';   // = scripts/backdateCitizenDials.js:40
const ROSTER = '/root/GodWorld/output/engine306-mint-roster.tsv', MAPPING = '/root/GodWorld/data/employer_mapping.json';
const OUT = '/root/GodWorld/output/engine-sheet/2026-10-21-e306-';
const EXPECT = { rows: 180, mark: 186, roster: 103, realignId: 'BIZ-00039', realignFrom: 'Downtown', realignTo: 'Uptown' };
const INTAKE_H = ['Name', 'Sector', 'Neighborhood', 'Description', 'SourceEdition', 'SourceCycle', 'Status'];
const norm = n => String(n || '').toLowerCase().trim().replace(/['']/g, "'").replace(/\s+(llc|inc|corp|ltd|co)\.?$/i, '').replace(/^the\s+/i, ''); // processBusinessIntake.js:26-32
const pad = n => 'BIZ-' + String(n).padStart(5, '0');
const cell = v => (v === undefined || v === null ? '' : v);
(async () => {
  if (target !== 'bench' && target !== 'live') throw new Error('--target bench|live required');
  if (target === 'live' && APPLY && !GO) throw new Error('live --apply needs --go (the builder\'s go)');
  const id = target === 'bench' ? BENCH : LIVE_ID;
  if (target === 'live' && process.env.GODWORLD_SHEET_ID !== LIVE_ID) throw new Error('REFUSED: env GODWORLD_SHEET_ID is not the pinned live id');
  const wantTitle = target === 'bench' ? BENCH_TITLE : LIVE_TITLE;
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const m0 = (await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets.properties.title' })).data;
  if (m0.properties.title !== wantTitle) throw new Error('REFUSED: ' + target + ' title is "' + m0.properties.title + '", want "' + wantTitle + '"');
  const get = async range => (await api.spreadsheets.values.get({ spreadsheetId: id, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [];
  const put = (range, values) => api.spreadsheets.values.update({ spreadsheetId: id, range, valueInputOption: 'RAW', requestBody: { values } });

  // ── preimage ──
  const rosterTxt = fs.readFileSync(ROSTER, 'utf8');
  const roster = rosterTxt.trim().split('\n').slice(1).map(l => { const [name, sector, hood, reason] = l.split('\t'); return { name, sector, hood, reason }; });
  const stagedRow = r => [r.name, r.sector, r.hood, 'engine.306 builder-approved hood character at C112: ' + r.reason, '', '', 'staged'];
  const bl = await get('Business_Ledger!A:I');
  const wc = await get('World_Config!A:B');
  const hwRow = wc.findIndex(r => String(r[0]).trim() === 'bizIdHighWater');
  const mark = hwRow >= 0 ? Number(wc[hwRow][1]) : null;
  const nm = await get('Neighborhood_Map');
  const hoods = new Set(nm.slice(1).map(r => String(r[nm[0].indexOf('Neighborhood')]).trim()));
  const realignIdx = bl.findIndex(r => String(r[0]).trim() === EXPECT.realignId);
  const arch = await get('Business_Archive!A:A');
  const intakeExists = m0.sheets.some(s => s.properties.title === 'Business_Intake');
  const intake = intakeExists ? await get('Business_Intake!A:G') : null;
  const onLedger = roster.map(r => bl.findIndex(x => x[1] === r.name));
  const preFile = OUT + 'preimage-' + target + '.json';
  const pre = { target, title: m0.properties.title, at: new Date().toISOString(), rows: bl.length - 1, mark, markRow: hwRow + 1,
    rosterSha256: crypto.createHash('sha256').update(rosterTxt).digest('hex'), rosterRows: roster.length,
    realign: { row: realignIdx + 1, neighborhood: realignIdx > 0 ? bl[realignIdx][3] : null },
    archiveHasRealignId: arch.some(r => String(r[0]).trim() === EXPECT.realignId), intakeTabExists: intakeExists,
    rosterOnLedger: onLedger.filter(i => i >= 0).length, ledgerAtoI: bl, intake };
  fs.writeFileSync(preFile, JSON.stringify(pre));

  // ── mode ──
  const common = [['roster rows = ' + EXPECT.roster, roster.length === EXPECT.roster],
    ['0 non-canon hoods', roster.every(r => hoods.has(r.hood))], ['0 blank roster fields', roster.every(r => r.name && r.sector && r.hood && r.reason)],
    ['Business_Archive holds no ' + EXPECT.realignId, !pre.archiveHasRealignId], [EXPECT.realignId + ' at row 40', realignIdx === 39]];
  let mode = null, gates = [];
  const ORIGINAL = OUT + 'preimage-' + target + '-original.json';
  const start = EXPECT.mark + 1, last = start + roster.length - 1;
  const intakeIsRoster = !!intake && intake.length === roster.length + 1 && INTAKE_H.every((h, c) => intake[0][c] === h) &&
    roster.every((r, i) => stagedRow(r).slice(0, 6).every((v, c) => cell(intake[i + 1][c]) === v));
  const freshGates = () => {
    const live = new Map(bl.slice(1).map(r => [norm(r[1]), r[0]])), seen = new Set();
    const dups = roster.filter(r => { const k = norm(r.name), d = live.has(k) || seen.has(k); seen.add(k); return d; }).map(r => r.name);
    const newIds = new Set(roster.map((r, i) => pad(start + i)));
    const inMap = (JSON.parse(fs.readFileSync(MAPPING, 'utf8')).newBusinesses || []).filter(b => newIds.has(b.bizId)).map(b => b.bizId);
    return [['ledger rows = ' + EXPECT.rows, pre.rows === EXPECT.rows], ['bizIdHighWater = ' + EXPECT.mark, mark === EXPECT.mark],
      ['max active = mark', Math.max(...bl.slice(1).map(r => Number((String(r[0]).match(/^BIZ-(\d+)$/) || [0, 0])[1]))) === EXPECT.mark],
      ['0 dup names (' + dups.join(', ') + ')', dups.length === 0], [EXPECT.realignId + ' D = ' + EXPECT.realignFrom, pre.realign.neighborhood === EXPECT.realignFrom],
      // live only: the bench run restores the file byte for byte, and once live holds the 103 every bench leg would fail here
      ...(target === 'live' ? [['data/employer_mapping.json holds none of ' + pad(start) + '..' + pad(last) + ' (' + inMap.join(', ') + ')', inMap.length === 0]] : [])];
  };
  if (!intakeExists) {
    mode = 'fresh';
    gates = freshGates();
  } else if (intakeIsRoster && pre.rosterOnLedger === 0 && intake.slice(1).every(r => r[6] === 'staged')) {
    mode = 'restage';
    const orig = fs.existsSync(ORIGINAL) ? JSON.parse(fs.readFileSync(ORIGINAL, 'utf8')).ledgerAtoI : null;
    const same = !!orig && orig.length === bl.length && bl.every((r, rI) => { for (let c = 0; c < 9; c++) if (cell(r[c]) !== cell((orig[rI] || [])[c])) return false; return true; });
    gates = [['the fresh run\'s original preimage is on disk', !!orig], ['the 180 A:I = that preimage, cell for cell', same]].concat(freshGates());
  } else if (intakeIsRoster && pre.rosterOnLedger === roster.length) {
    mode = 'recover';
    const first = Number(String(bl[onLedger[0]][0]).replace('BIZ-', ''));
    gates = [['--recover given', RECOVER], ['ledger rows = ' + (EXPECT.rows + roster.length), pre.rows === EXPECT.rows + roster.length],
      ['the 103 are rows 182..284 in roster order, IDs consecutive from ' + pad(first), onLedger.every((ix, i) => ix === EXPECT.rows + 1 + i && bl[ix][0] === pad(first + i))],
      ['first ID = ' + pad(EXPECT.mark + 1), first === EXPECT.mark + 1],
      ['the fresh run\'s original preimage is on disk', fs.existsSync(ORIGINAL)]];
  } else {
    mode = 'stop';
    gates = [['a known state (intake ' + (intake ? intake.length - 1 : 'absent') + ' rows, ' + pre.rosterOnLedger + ' of 103 on the ledger)', false]];
  }
  gates = common.concat(gates);
  gates.forEach(([n, ok]) => console.log((ok ? 'ok   ' : 'FAIL ') + n));
  console.log('mode ' + mode + ' | preimage ' + preFile + ' | roster sha ' + pre.rosterSha256.slice(0, 16) + ' | IDs ' + pad(start) + '..' + pad(last));
  if (gates.some(g => !g[1])) { console.log('STOP: a gate is off — nothing written'); process.exit(2); }
  if (!APPLY) { console.log('dry run — nothing written'); return; }

  const mapBefore = fs.readFileSync(MAPPING);
  if (mode === 'fresh') {
    fs.writeFileSync(ORIGINAL, JSON.stringify(pre));   // the 180 as they stood, for a later restage / recover gate and receipt
    await api.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: [{ addSheet: { properties: { title: 'Business_Intake' } } }] } });
    await put('Business_Intake!A1', [INTAKE_H].concat(roster.map(stagedRow)));
    const st = await get('Business_Intake!A:G');
    const ok = st.length === roster.length + 1 && INTAKE_H.every((h, c) => st[0][c] === h) && roster.every((r, i) => stagedRow(r).every((v, c) => cell(st[i + 1][c]) === v));
    if (!ok) throw new Error('STOP: Business_Intake staging did not read back cell for cell — nothing promoted');
    console.log('Business_Intake staged ' + roster.length + ' rows, every cell read back');
  }
  if (mode === 'fresh' || mode === 'restage') {
    const run = cp.spawnSync('node', ['-r', '/root/GodWorld/output/engine-sheet/2026-10-21-e306-target-preload.js', 'scripts/processBusinessIntake.js'],
      { cwd: '/root/GodWorld', env: Object.assign({}, process.env, { E306_TARGET_ID: id }), encoding: 'utf8' });
    fs.writeFileSync(OUT + 'intake-' + target + '.log', (run.stdout || '') + (run.stderr || ''));
    console.log('processBusinessIntake rc=' + run.status + ' (log ' + OUT + 'intake-' + target + '.log)');
    if (run.status !== 0) {
      if (target === 'bench') fs.writeFileSync(MAPPING, mapBefore);
      console.log('STOP: the processor failed — re-run this driver (dry first): it reads the state and names restage or recover');
      process.exit(4);
    }
  }
  if (mode === 'recover') {
    if (mark < last) { await put('World_Config!B' + (hwRow + 1), [[last]]); console.log('mark ' + mark + ' → ' + last); }
    await put('Business_Intake!G2', roster.map(() => ['promoted']));
    console.log('Business_Intake Status → promoted x' + roster.length + ' (one write)');
    if (target === 'live') {
      const mp = JSON.parse(mapBefore), have = new Set((mp.newBusinesses || []).map(b => b.bizId));
      let added = 0;
      roster.forEach((r, i) => { if (!have.has(pad(start + i))) { mp.newBusinesses.push({ bizId: pad(start + i), name: r.name, sector: r.sector, neighborhood: r.hood }); added++; } });
      fs.writeFileSync(MAPPING, JSON.stringify(mp, null, 2) + '\n', 'utf8');
      console.log('data/employer_mapping.json: ' + added + ' entries added');
    }
  }
  if (target === 'bench') { fs.writeFileSync(MAPPING, mapBefore); console.log('bench: data/employer_mapping.json restored'); }
  const rr = await get('Business_Ledger!A40:D40');
  if (rr[0] && rr[0][0] === EXPECT.realignId && rr[0][3] === EXPECT.realignFrom) {
    await put('Business_Ledger!D40', [[EXPECT.realignTo]]);
    console.log('realign ' + EXPECT.realignId + ' row 40 D ' + EXPECT.realignFrom + ' → ' + EXPECT.realignTo);
  } else console.log('realign: row 40 reads ' + JSON.stringify(rr[0]) + ' — not written');

  // ── receipt ──
  const bl2 = await get('Business_Ledger!A:I'), in2 = await get('Business_Intake!A:G'), wc2 = await get('World_Config!A:B');
  const mark2 = Number((wc2.find(r => String(r[0]).trim() === 'bizIdHighWater') || [])[1]);
  const fails = [];
  roster.forEach((r, i) => {
    const ir = in2[i + 1] || [], x = bl2[EXPECT.rows + 1 + i] || [], e = economicSeedForSector(r.sector);
    if (!stagedRow(r).slice(0, 6).every((v, c) => cell(ir[c]) === v) || ir[6] !== 'promoted') fails.push('intake row ' + (i + 2) + ' ' + JSON.stringify(ir));
    [pad(start + i), r.name, r.sector, r.hood, e.emp, e.sal, e.rev, e.growth, ''].forEach((w, c) => {
      if (cell(x[c]) !== w) fails.push('ledger row ' + (EXPECT.rows + 2 + i) + ' col ' + 'ABCDEFGHI'[c] + ': ' + JSON.stringify(x[c]) + ' want ' + JSON.stringify(w));
    });
    if (bl2.filter(y => y[1] === r.name).length !== 1) fails.push(r.name + ' is not on exactly one ledger row');
  });
  const base = mode === 'fresh' ? bl : JSON.parse(fs.readFileSync(ORIGINAL, 'utf8')).ledgerAtoI;
  const drift = [];
  for (let rI = 0; rI <= EXPECT.rows; rI++) for (let c = 0; c < 9; c++) {
    const want = rI === 39 && c === 3 ? EXPECT.realignTo : cell((base[rI] || [])[c]);
    if (cell((bl2[rI] || [])[c]) !== want) drift.push('R' + (rI + 1) + 'C' + (c + 1) + ' ' + JSON.stringify((bl2[rI] || [])[c]) + ' want ' + JSON.stringify(want));
  }
  let mapOk;
  if (target === 'bench') mapOk = fs.readFileSync(MAPPING).equals(mapBefore);
  else {
    const mp = JSON.parse(fs.readFileSync(MAPPING, 'utf8'));
    mapOk = roster.every((r, i) => { const hit = (mp.newBusinesses || []).filter(b => b.bizId === pad(start + i));
      return hit.length === 1 && hit[0].name === r.name && hit[0].sector === r.sector && hit[0].neighborhood === r.hood; });
  }
  const checks = [
    ['intake row i ↔ ledger row 182+i: A:F staged as written, promoted, ID ' + pad(start) + '+i, nine typed cells = the seed, one ledger row per name', fails.length === 0],
    ['the original 180 rows A:I = the ' + (mode === 'fresh' ? 'preimage' : 'fresh run\'s original preimage') + ' except D40 = ' + EXPECT.realignTo, drift.length === 0],
    ['bizIdHighWater = ' + last, mark2 === last], ['ledger rows = ' + (EXPECT.rows + roster.length), bl2.length - 1 === EXPECT.rows + roster.length],
    [target === 'bench' ? 'data/employer_mapping.json byte-identical to before' : 'data/employer_mapping.json holds exactly one entry per new bizId = its roster row', mapOk]
  ];
  checks.forEach(([n, ok]) => console.log((ok ? 'ok   ' : 'FAIL ') + n));
  fs.writeFileSync(OUT + 'receipt-' + target + '.json', JSON.stringify({ target, mode, at: new Date().toISOString(), start: pad(start), end: pad(last),
    mark: mark2, rows: bl2.length - 1, fails, drift, checks, newRows: bl2.slice(EXPECT.rows + 1) }, null, 1));
  console.log(checks.every(c => c[1]) ? 'RECEIPT PASS' : 'RECEIPT FAIL — read ' + OUT + 'receipt-' + target + '.json');
  if (!checks.every(c => c[1])) process.exit(3);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
