// engine.312 P4 / R4 — the fame re-base (plan §engine.312 R4).
//   freeze — read LIVE (read-only): Citizen_Media_Usage, Cultural_Ledger, the Simulation_Ledger identity columns and World_Config
//            cycleCount; save output/engine-sheet/2026-10-25-e312-rebase-freeze-c<cycle>.json. Writes no sheet.
//   dry <cycle> — from that freeze: (1) the Sentiment write-back plan — each of the 413 grades (…-e312-graded.jsonl, keyed by the
//            passage receipt's frozen cells) must match exactly one row on Cycle + CitizenName + UsageType + Context with Sentiment still
//            blank; every skip listed. (2) Every Cultural_Ledger row: FameScore = clamp(0, 100, Σ over its citizen's whole record) —
//            positive +5 / neutral or blank +1 / negative −2 (paperFameDelta_, culturalLedger.js), with the R1 manifest exceptions: the
//            75 own-byline `mentioned` rows 0; the 35 shifted rows (a POPID in the UsageType cell) by that POPID, +light where the
//            lookup located the passage (17), else 0 (18); the "None featured" placeholder 0; a grade's light where its write-back
//            matched. The famous floor (25) for a citizen the ledger holds Famous and Active — the flush would lift them at the next
//            fire anyway. One clamp on the sum. Institution / dynasty rows keep their score; a second personal row of one citizen and
//            an unresolved row are listed HOLD and unchanged. Saves …-e312-rebase-dry-c<cycle>.json and a readable .txt summary.
//   apply <cycle> — the builder's go (2026-10-26, "rebase seems right"): a FRESH freeze of live, the same plan over it, and the plan
//            must equal the saved dry run for that cycle (changed / write-back / bar counts, every row's next) — a live cell that moved
//            since the dry run stops the apply. Then two batched writes: the Sentiment cells (write-back rows) and the FameScore cells
//            (personal rows whose next ≠ old). Reads both tabs back and checks every written cell; saves …-e312-rebase-apply-c<cycle>.json
//            (old → new per cell — the rollback source). Institution / duplicate / orphan rows are never written.
require('/root/GodWorld/lib/env');
const fs = require('fs'), vm = require('vm');
const O = '/root/GodWorld/output/engine-sheet/';
const BENCHES = ['1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA'];
const PINNED_LIVE = (fs.readFileSync('/root/GodWorld/utilities/utilityFunctions.js', 'utf8').match(/DEFAULT_SIM_SSID = '([^']+)'/) || [])[1];
const [mode, Cs] = process.argv.slice(2);
const CL = require('/root/GodWorld/phase07-evening-media/culturalLedger.js');
const sb = vm.createContext({ Logger: { log() {} }, Math, String, Number, Array, Object, JSON, Date });
vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/processAdvancementIntake.js', 'utf8'), sb);
const freezeFile = (c) => O + '2026-10-25-e312-rebase-freeze-c' + c + '.json';
const dryFile = (c) => O + '2026-10-25-e312-rebase-dry-c' + c + '.json';
const col = (h, n) => { const i = h.indexOf(n); if (i < 0) throw new Error('no column ' + n); return i; };
const clamp = (n) => Math.max(0, Math.min(CL.CULTURAL_FAME_CEILING, n));
const colLetter = (i) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

function liveSheets() {
  const L = process.env.GODWORLD_SHEET_ID;
  if (!L || L !== PINNED_LIVE || BENCHES.includes(L)) throw new Error('env sheet is not the live sheet the engine code pins — stop');
  return require('/root/GodWorld/lib/sheets');
}

async function freeze(sh) {
  const wc = await sh.getRawSheetData('World_Config');
  const cyc = Number(String((wc.find(r => String(r[0]).trim() === 'cycleCount') || [])[1]).replace(/^C/, ''));
  const led = await sh.getRawSheetData('Simulation_Ledger'), h = led[0];
  const keep = ['POPID', 'First', 'Last', 'Famous', 'Status'].map(n => col(h, n));
  return { frozenAt: new Date().toISOString(), cycle: cyc, use: await sh.getRawSheetData('Citizen_Media_Usage'),
    cul: await sh.getRawSheetData('Cultural_Ledger'), led: [['POPID', 'First', 'Last', 'Famous', 'Status']].concat(led.slice(1).map(r => keep.map(i => r[i]))) };
}

function plan(F) {
  const uh = F.use[0], iN = col(uh, 'CitizenName'), iT = col(uh, 'UsageType'), iC = col(uh, 'Context'), iCy = col(uh, 'Cycle'), iS = col(uh, 'Sentiment');
  const iSrc = uh.indexOf('Source');
  // ── (1) the Sentiment write-back plan ──
  const passages = fs.readFileSync(O + '2026-10-25-e312-passages.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
  const graded = fs.readFileSync(O + '2026-10-25-e312-graded.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
  const passBy = {}; passages.forEach(p => { passBy[p.sheetRow] = p; });
  const lightAt = {}, writeBack = [], skips = [];
  for (const g of graded) {
    const p = passBy[g.sheetRow];
    if (!p) { skips.push({ sheetRow: g.sheetRow, why: 'no passage receipt row' }); continue; }
    const hits = [];
    F.use.forEach((r, k) => { if (k === 0) return;
      if (String(r[iCy]) === String(p.cycle) && String(r[iN]).trim() === String(p.citizenName).trim() &&
          String(r[iT]).trim() === String(p.usageType).trim() && String(r[iC]).trim() === String(p.context).trim()) hits.push(k); });
    if (hits.length !== 1) { skips.push({ sheetRow: g.sheetRow, name: p.citizenName, why: hits.length + ' rows match the frozen cells' }); continue; }
    const k = hits[0];
    if (String(F.use[k][iS] || '').trim()) { skips.push({ sheetRow: g.sheetRow, name: p.citizenName, why: 'Sentiment already "' + F.use[k][iS] + '"' }); continue; }
    if (!['positive', 'neutral', 'negative'].includes(g.light)) { skips.push({ sheetRow: g.sheetRow, name: p.citizenName, why: 'grade "' + g.light + '"' }); continue; }
    lightAt[k] = g.light;
    writeBack.push({ row: k + 1, name: p.citizenName, cycle: p.cycle, light: g.light, receiptRow: g.sheetRow });
  }
  // ── the manifest exceptions, by frozen row ──
  const manifest = {}, manifestMiss = [];   // usage row index → { zero | pop, why }
  for (const p of passages) {
    if (!p.byline && !p.shifted) continue;
    const hits = [];
    F.use.forEach((r, k) => { if (k === 0) return;
      // a shifted row keys on its POPID-in-the-type cell (4 carry a sheet spelling the receipt replaced with the ledger name)
      const nameOk = p.shifted || String(r[iN]).trim() === String(p.citizenName).trim();
      if (String(r[iCy]) === String(p.cycle) && nameOk &&
          String(r[iT]).trim() === String(p.usageType).trim() && String(r[iC]).trim() === String(p.context).trim()) hits.push(k); });
    if (hits.length !== 1) { manifestMiss.push({ receiptRow: p.sheetRow, name: p.citizenName, hits: hits.length }); continue; }
    const k = hits[0];
    if (p.byline) manifest[k] = { zero: true, why: 'own byline (passage is the citizen\'s own byline)' };
    else if (p.shifted) manifest[k] = p.snippet ? { pop: String(p.popid).toUpperCase(), why: 'shifted, located' } : { zero: true, why: 'shifted, not located' };
  }
  // ── identities ──
  const byKey = {}, byFull = {}, famous = new Set(), ledName = {};
  F.led.slice(1).forEach(r => {
    const pop = String(r[0] || '').trim().toUpperCase(); if (!pop) return;
    const k = sb.normalizeCitizenName_(r[1]) + ' ' + sb.normalizeCitizenName_(r[2]); if (k !== ' ') (byKey[k] = byKey[k] || []).push(pop);
    const full = (String(r[1] || '') + ' ' + String(r[2] || '')).trim(); byFull[full] = byFull.hasOwnProperty(full) ? '' : pop; ledName[pop] = full;
    if (String(r[3] || '').trim() && String(r[4] || '').trim().toLowerCase() === 'active') famous.add(pop);
  });
  const popOfName = (n) => { const sp = sb.splitUsageName_(String(n || '').trim()); if (!sp) return null;
    const h = byKey[sb.normalizeCitizenName_(sp.first) + ' ' + sb.normalizeCitizenName_(sp.last)] || []; return h.length === 1 ? h[0] : null; };
  // ── each citizen's record ──
  const rec = {};   // pop → { sum, pos, neu, neg, zero }
  F.use.forEach((r, k) => { if (k === 0) return;
    const m = manifest[k];
    if (m && m.zero) return;
    let pop, d;
    if (m && m.pop) { pop = m.pop; d = CL.paperFameDelta_('mentioned', lightAt[k] || r[iS], iSrc >= 0 ? r[iSrc] : ''); }   // type lost: a located printed naming
    else {
      if (sb.isFamilyUsage_(r[iT])) return;
      d = CL.paperFameDelta_(r[iT], lightAt[k] || r[iS], iSrc >= 0 ? r[iSrc] : '');
      if (!d) return;
      pop = popOfName(r[iN]);
    }
    if (!pop || !d) return;
    const e = rec[pop] || (rec[pop] = { sum: 0, pos: 0, neu: 0, neg: 0 });
    e.sum += d; if (d === 5) e.pos++; else if (d === 1) e.neu++; else if (d === -2) e.neg++;
  });
  // ── (2) every Cultural_Ledger row ──
  const ch = F.cul[0], cId = col(ch, 'CUL-ID'), cN = col(ch, 'Name'), cU = col(ch, 'UniverseLinks'), cF = col(ch, 'FameScore'),
    cCat = col(ch, 'FameCategory'), cR = col(ch, 'RoleType');
  const rows = [], seenPersonal = {};
  for (let i = 1; i < F.cul.length; i++) {
    const r = F.cul[i], old = Number(r[cF]) || 0;
    const inst = String(r[cCat] || '').toLowerCase() === 'dynasty' || String(r[cR] || '').toLowerCase() === 'institution';
    let pop = String(r[cU] || '').trim().toUpperCase(), by = 'UniverseLinks';
    if (!pop) { pop = byFull[String(r[cN]).trim()] || ''; by = 'own Name'; }
    const base = { row: i + 1, id: r[cId], name: r[cN], pop, by, old };
    if (inst) { rows.push(Object.assign(base, { kind: 'institution', next: old })); continue; }
    if (!pop || !ledName[pop]) { rows.push(Object.assign(base, { kind: 'orphan', next: old, hold: 'no ledger citizen resolves this row' })); continue; }
    const target = CL.culturalTargetIdxByPop_(F.cul, pop);
    if (target > 0 && target !== i && String(r[cU] || '').trim()) { rows.push(Object.assign(base, { kind: 'duplicate', next: old, hold: 'a second personal row of ' + pop + ' (its fame row is ' + F.cul[target][cId] + ')' })); continue; }
    if (seenPersonal[pop]) { rows.push(Object.assign(base, { kind: 'duplicate', next: old, hold: 'a second personal row of ' + pop })); continue; }
    seenPersonal[pop] = true;
    const e = rec[pop] || { sum: 0, pos: 0, neu: 0, neg: 0 };
    let s = e.sum; const fl = famous.has(pop); if (fl) s = Math.max(25, s);
    rows.push(Object.assign(base, { kind: 'personal', record: e, floor: fl, next: clamp(s) }));
  }
  const at25 = (k) => rows.filter(x => x[k] >= 25).length;
  const down = rows.filter(x => x.old >= 25 && x.next < 25), up = rows.filter(x => x.old < 25 && x.next >= 25);
  return { cycle: F.cycle, frozenAt: F.frozenAt,
    counts: { rows: rows.length, personal: rows.filter(x => x.kind === 'personal').length, institution: rows.filter(x => x.kind === 'institution').length,
      duplicate: rows.filter(x => x.kind === 'duplicate').length, orphan: rows.filter(x => x.kind === 'orphan').length,
      changed: rows.filter(x => x.next !== x.old).length, atBarBefore: at25('old'), atBarAfter: at25('next'), crossDown: down.length, crossUp: up.length,
      writeBack: writeBack.length, writeBackSkipped: skips.length, manifestRows: Object.keys(manifest).length, manifestMiss: manifestMiss.length },
    rows, writeBack, skips, manifestMiss, gradedCount: graded.length, down, up, cols: { sentiment: iS, fame: cF } };
}

function summary(out, head) {
  const L = [];
  L.push(head);
  L.push('Rows ' + out.counts.rows + ': personal ' + out.counts.personal + ', institution ' + out.counts.institution + ' (kept), duplicate ' + out.counts.duplicate + ' (held), orphan ' + out.counts.orphan + ' (held); ' + out.counts.changed + ' would change.');
  L.push('At the fame bar (25+): ' + out.counts.atBarBefore + ' now → ' + out.counts.atBarAfter + ' after. Falls below: ' + out.down.length + '. Rises to it: ' + out.up.length + '.');
  L.push('Sentiment write-back: ' + out.writeBack.length + ' of ' + out.gradedCount + ' grades land; ' + out.skips.length + ' skipped (each stays blank = neutral). Exception rows (75 own bylines, 35 shifted) matched: ' + out.counts.manifestRows + (out.manifestMiss.length ? ', unmatched ' + out.manifestMiss.length : '') + '.');
  L.push('');
  L.push('Falls below the bar: ' + (out.down.map(x => x.name + ' ' + x.old + '→' + x.next).join('; ') || 'none'));
  L.push('Rises to the bar: ' + (out.up.map(x => x.name + ' ' + x.old + '→' + x.next).join('; ') || 'none'));
  L.push('');
  L.push('CUL-ID | name | POPID | old → new | record (+5 / +1 / −2) | note');
  out.rows.slice().sort((a, b) => b.next - a.next).forEach(x => L.push([x.id, x.name, x.pop || '-', x.old + ' → ' + x.next,
    x.record ? x.record.pos + ' / ' + x.record.neu + ' / ' + x.record.neg : '-', x.kind + (x.floor ? ', famous floor' : '') + (x.hold ? ', HOLD: ' + x.hold : '')].join(' | ')));
  if (out.skips.length) { L.push(''); L.push('Write-back skips:'); out.skips.forEach(s => L.push('  receipt row ' + s.sheetRow + ' ' + (s.name || '') + ': ' + s.why)); }
  return L;
}

const stripDry = (o) => ({ counts: o.counts, next: o.rows.map(x => [x.id, x.kind, x.old, x.next]), wb: o.writeBack.map(w => [w.row, w.light]) });

(async () => {
  if (mode === 'freeze') {
    const out = await freeze(liveSheets());
    fs.writeFileSync(freezeFile(out.cycle), JSON.stringify(out));
    console.log('frozen live at C' + out.cycle + ': usage ' + (out.use.length - 1) + ', Cultural_Ledger ' + (out.cul.length - 1) + ', ledger ' + (out.led.length - 1) + ' → ' + freezeFile(out.cycle));
    return;
  }
  if (mode === 'dry') {
    if (!(Number(Cs) >= 112)) throw new Error('usage: freeze | dry <cycle> | apply <cycle>');
    const F = JSON.parse(fs.readFileSync(freezeFile(Number(Cs)), 'utf8'));
    const out = plan(F);
    const saved = { cycle: out.cycle, frozenAt: out.frozenAt, counts: out.counts, rows: out.rows, writeBack: out.writeBack, skips: out.skips, manifestMiss: out.manifestMiss };
    fs.writeFileSync(dryFile(F.cycle), JSON.stringify(saved, null, 1));
    const L = summary(out, 'engine.312 fame re-base — DRY RUN from live frozen at C' + F.cycle + ' (' + F.frozenAt + '). Nothing written.');
    fs.writeFileSync(O + '2026-10-25-e312-rebase-dry-c' + F.cycle + '.txt', L.join('\n') + '\n');
    console.log(L.slice(0, 7).join('\n'));
    return;
  }
  if (mode === 'apply') {
    if (!(Number(Cs) >= 113)) throw new Error('usage: freeze | dry <cycle> | apply <cycle>');
    const sh = liveSheets();
    const dry = JSON.parse(fs.readFileSync(dryFile(Number(Cs)), 'utf8'));
    const F = await freeze(sh);
    if (F.cycle !== Number(Cs)) throw new Error('live is at C' + F.cycle + ', the dry run is C' + Cs + ' — re-run the dry run first');
    const out = plan(F);
    const a = JSON.stringify(stripDry(out)), b = JSON.stringify(stripDry({ counts: dry.counts, rows: dry.rows, writeBack: dry.writeBack }));
    if (a !== b) {
      fs.writeFileSync(O + '2026-10-25-e312-rebase-apply-c' + Cs + '.DRIFT.json', JSON.stringify({ dry: JSON.parse(b), now: JSON.parse(a) }, null, 1));
      throw new Error('live moved since the dry run (counts, a row\'s next, or a write-back cell differ) — see …-apply-c' + Cs + '.DRIFT.json; re-run dry and read it before applying');
    }
    const cells = [];
    const sCol = colLetter(out.cols.sentiment), fCol = colLetter(out.cols.fame);
    for (const w of out.writeBack) cells.push({ tab: 'Citizen_Media_Usage', range: 'Citizen_Media_Usage!' + sCol + w.row, row: w.row, col: out.cols.sentiment, old: '', value: w.light, what: 'Sentiment ' + w.name + ' C' + w.cycle });
    for (const x of out.rows) if (x.kind === 'personal' && x.next !== x.old) cells.push({ tab: 'Cultural_Ledger', range: 'Cultural_Ledger!' + fCol + x.row, row: x.row, col: out.cols.fame, old: x.old, value: x.next, what: 'FameScore ' + x.id + ' ' + x.name });
    const receipt = { cycle: F.cycle, frozenAt: F.frozenAt, appliedAt: null, cells, counts: out.counts };
    console.log('apply C' + Cs + ': ' + out.writeBack.length + ' Sentiment cells + ' + cells.filter(c => c.tab === 'Cultural_Ledger').length + ' FameScore cells = ' + cells.length + ' writes');
    await sh.batchUpdate(cells.map(c => ({ range: c.range, values: [[c.value]] })));
    receipt.appliedAt = new Date().toISOString();
    // read back every written cell
    const use = await sh.getRawSheetData('Citizen_Media_Usage'), cul = await sh.getRawSheetData('Cultural_Ledger');
    const bad = [];
    for (const c of cells) {
      const got = (c.tab === 'Citizen_Media_Usage' ? use : cul)[c.row - 1][c.col];
      if (String(got) !== String(c.value)) bad.push({ range: c.range, expected: c.value, got });
    }
    // and every other FameScore cell is as frozen
    const fameIdx = out.cols.fame, touched = new Set(cells.filter(c => c.tab === 'Cultural_Ledger').map(c => c.row));
    for (let i = 1; i < cul.length; i++) if (!touched.has(i + 1) && String(cul[i][fameIdx]) !== String(F.cul[i][fameIdx])) bad.push({ range: 'Cultural_Ledger!' + fCol + (i + 1), expected: F.cul[i][fameIdx], got: cul[i][fameIdx], why: 'untouched row moved' });
    receipt.readback = { checked: cells.length, mismatched: bad };
    fs.writeFileSync(O + '2026-10-25-e312-rebase-apply-c' + Cs + '.json', JSON.stringify(receipt, null, 1));
    if (bad.length) throw new Error('readback mismatch on ' + bad.length + ' cell(s) — see the apply receipt');
    console.log('readback PASS: ' + cells.length + ' cells as written, every other FameScore cell as frozen → ' + O + '2026-10-25-e312-rebase-apply-c' + Cs + '.json');
    return;
  }
  throw new Error('usage: freeze | dry <cycle> | apply <cycle>');
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
