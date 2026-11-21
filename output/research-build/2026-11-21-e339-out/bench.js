// engine.351 bench (SANDBOX 1004 only). node bench.js plant | pre | <firedCycle>
//   plant: bench-only rows, marker E351-BENCH NON-CANON — Intake: a household of two, the spouse with no Age (waits);
//          Advancement_Intake1: Petra Vantongeren with no BirthYear (waits), Ansel Brightwater complete (mints).
//   pre: high POPID + Engine_Errors count -> pre.json.   <N>: what each plant did, every 'arrival start' on Dial_Moves
//        checked against arrivalStartDials_ on the minted row, new 2003 birth years, Engine_Errors delta.
require('/root/GodWorld/lib/env');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA'; process.env.GODWORLD_SHEET_ID = B;
const s = require('/root/GodWorld/lib/sheets'), fs = require('fs'), path = require('path'), vm = require('vm');
if (process.env.GODWORLD_SHEET_ID !== B) { console.log('HALT not the bench'); process.exit(5); } // lib/sheets reads the env at each call
const PRE = path.join(__dirname, 'pre.json'), MARK = 'E351-BENCH NON-CANON';
const SIMYEAR = c => 2040 + Math.ceil(c / 52) - 1;
const src = fs.readFileSync('/root/GodWorld/utilities/compressLifeHistory.js', 'utf8');
const sb = {}; vm.createContext(sb);
vm.runInContext(src.slice(src.indexOf('var ARRIVAL_CLINICIAN_RE_'), src.indexOf('// engine.208 C8 — a no-fandom')), sb);
const D8 = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout'];
const rowOf = (h, o) => h.map(k => (o[k] !== undefined ? o[k] : ''));
(async () => {
  const arg = process.argv[2];
  const sl = await s.getSheetData('Simulation_Ledger'), lh = sl[0], l = n => lh.indexOf(n);
  const popNum = p => Number(String(p || '').replace(/\D/g, '')) || 0;
  if (arg === 'plant') {
    const names = new Set(sl.slice(1).map(r => (r[l('First')] + ' ' + r[l('Last')]).toLowerCase()));
    const gc = await s.getSheetData('Generic_Citizens'); gc.slice(1).forEach(r => names.add((r[0] + ' ' + r[1]).toLowerCase()));
    for (const n of ['odessa quill', 'calder quill', 'petra vantongeren', 'ansel brightwater']) if (names.has(n)) { console.log('HALT name taken: ' + n); process.exit(5); }
    const ih = (await s.getSheetData('Intake'))[0], ah = (await s.getSheetData('Advancement_Intake1'))[0];
    await s.appendRows('Intake', [
      rowOf(ih, { First: 'Odessa', Last: 'Quill', Age: 44, Neighborhood: 'Temescal', RoleType: 'Pharmacist', Family: 'E351BENCH', Relation: 'head', Notes: MARK }),
      rowOf(ih, { First: 'Calder', Last: 'Quill', Age: '', Neighborhood: '', RoleType: 'Teacher', Family: 'E351BENCH', Relation: 'spouse', Notes: MARK })]);
    // values.append guessed the table at column J on this tab (the media-usage rows fill A..J) and shifted the rows nine
    // columns right (2026-11-21, the first run) — write at an explicit A1 row instead
    const advN = (await s.getSheetData('Advancement_Intake1')).length + 1;
    await s.updateRange('Advancement_Intake1!A' + advN, [
      rowOf(ah, { First: 'Petra', Last: 'Vantongeren', RoleType: 'Line Cook', Tier: 4, ClockMode: 'ENGINE', Notes: MARK, BirthYear: '', Neighborhood: 'Fruitvale' }),
      rowOf(ah, { First: 'Ansel', Last: 'Brightwater', RoleType: 'Registered Nurse', Tier: 4, ClockMode: 'ENGINE', Notes: MARK, BirthYear: 1990, Neighborhood: 'Temescal' })]);
    const back = (await s.getSheetData('Advancement_Intake1')).filter(r => r[ah.indexOf('Notes')] === MARK);
    if (back.length !== 2 || back[0][ah.indexOf('First')] !== 'Petra' || back[1][ah.indexOf('Last')] !== 'Brightwater') { console.log('HALT plant read-back: ' + JSON.stringify(back)); process.exit(6); }
    console.log('planted: Intake household E351BENCH (Calder no Age); Advancement Petra (no BirthYear), Ansel (complete) — read back in place');
    return;
  }
  const ee = await s.getSheetData('Engine_Errors');
  const maxPop = Math.max(...sl.slice(1).map(r => popNum(r[l('POPID')])));
  if (arg === 'pre') { fs.writeFileSync(PRE, JSON.stringify({ maxPop, errors: ee.length - 1 })); console.log('pre: maxPop ' + maxPop + ', Engine_Errors ' + (ee.length - 1)); return; }
  const N = Number(arg), Y = SIMYEAR(N), pre = JSON.parse(fs.readFileSync(PRE, 'utf8')), bad = [];
  const it = await s.getSheetData('Intake'), ih = it[0];
  it.slice(1).filter(r => r[ih.indexOf('Family')] === 'E351BENCH').forEach(r => {
    const st = String(r[ih.indexOf('IntakeStatus')] || '');
    console.log('  Intake ' + r[0] + ' ' + r[1] + ': ' + st);
    if (!/^waiting — household "E351BENCH" needs Calder Quill: Age$/.test(st)) bad.push(r[0] + ' status not the wait');
  });
  const ad = await s.getSheetData('Advancement_Intake1'), ah = ad[0];
  const plants = ad.slice(1).filter(r => r[ah.indexOf('Notes')] === MARK);
  plants.forEach(r => console.log('  Advancement ' + r[0] + ' ' + r[2] + ': ' + (r[ah.indexOf('IntakeStatus')] || '(no status)')));
  const petra = plants.find(r => r[0] === 'Petra');
  if (!petra || !/^waiting — needs BirthYear \(C\d+\)$/.test(String(petra[ah.indexOf('IntakeStatus')] || ''))) bad.push('Petra is not waiting on BirthYear');
  if (plants.find(r => r[0] === 'Ansel')) bad.push('Ansel still on the queue');
  const minted = sl.slice(1).filter(r => popNum(r[l('POPID')]) > pre.maxPop);
  const by = n => sl.slice(1).find(r => r[l('First')] + ' ' + r[l('Last')] === n);
  ['Odessa Quill', 'Calder Quill', 'Petra Vantongeren'].forEach(n => { if (by(n)) bad.push(n + ' was minted'); });
  const ansel = by('Ansel Brightwater');
  if (!ansel) bad.push('Ansel not minted');
  console.log('  new ledger rows ' + minted.length + ' | BirthYear 2003 among them ' + minted.filter(r => String(r[l('BirthYear')]) === '2003').length);
  const dm = await s.getSheetData('Dial_Moves'), dh = dm[0], dc = n => dh.indexOf(n);
  const starts = {};
  dm.slice(1).filter(r => String(r[dc('Cycle')]) === String(N)).forEach(r => {
    const m = String(r[dc('Why')] || '').match(/arrival start ([+-]?[\d.]+)/);
    if (m) (starts[r[dc('POPID')]] = starts[r[dc('POPID')]] || {})[r[dc('Dial')]] = Number(m[1]);
  });
  const idxs = { iSpouse: l('SpouseId'), iParents: l('ParentIds'), iChildren: l('ChildrenIds'), iHousehold: l('HouseholdId'), iClock: l('ClockMode'), iRole: l('RoleType'), iBirthYear: l('BirthYear') };
  minted.forEach(r => {
    const pop = r[l('POPID')], exp = sb.arrivalStartDials_(r, idxs, Y, String(pop).toUpperCase()), got = starts[pop] || {};
    const ds = JSON.parse(String(r[l('DialState')] || '{}')), base = ds.base || {};
    const line = pop + ' ' + r[l('First')] + ' ' + r[l('Last')] + ', ' + (Y - Number(r[l('BirthYear')])) + ', ' + r[l('RoleType')] + ' [' + r[l('ClockMode')] + ']';
    if (!exp) { console.log('  ' + line + ': no start (child or no year)' + (Object.keys(got).length ? ' — BUT moved' : '')); if (Object.keys(got).length) bad.push(pop + ' moved without a start'); return; }
    const miss = D8.filter(d => Math.abs((got[d] || 0) - (exp[d] - 50)) > 0.01);
    console.log('  ' + line + ': start ' + D8.map(d => d + ' ' + exp[d]).join(', ') + ' | base now ' + D8.map(d => Math.round((base[d] || 0) * 10) / 10).join('/') + (miss.length ? ' | MISMATCH ' + miss.join(',') : ' | Dial_Moves = start'));
    if (miss.length) bad.push(pop + ' Dial_Moves start mismatch ' + miss.join(','));
  });
  Object.keys(starts).filter(p => !minted.find(r => r[l('POPID')] === p)).forEach(p => bad.push(p + ' (an existing citizen) got an arrival start'));
  const eNew = ee.length - 1 - pre.errors; console.log('  Engine_Errors +' + eNew); if (eNew) bad.push('Engine_Errors +' + eNew);
  fs.writeFileSync(PRE, JSON.stringify({ maxPop: Math.max(pre.maxPop, maxPop), errors: ee.length - 1 }));
  console.log(bad.length ? 'C' + N + ' CHECK FAIL: ' + bad.join(' | ') : 'C' + N + ' CHECK PASS'); process.exit(bad.length ? 4 : 0);
})().catch(e => { console.log('HALT ' + e.message); process.exit(3); });
