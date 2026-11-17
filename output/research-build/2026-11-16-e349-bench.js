// engine.349 bench tool (SANDBOX 1004 only — refuses any other sheet).
//   pre                 save Engine_Errors row count
//   read <leg> <cycle>  save every citizen's DialState, the five speed keys, Dial_Moves, Dial_Pulse, new Engine_Errors
//   cmp <legA> <legB>   DialState cell for cell between two saved legs
//   moves <leg>         each citizen's Dial_Moves rows against that citizen's DialState difference (open copy = leg's `open`)
//   open <leg>          save DialState before a fire (the "open" side for `moves`)
//   mark107             set the 13 stuck watermarks (folded > cycleCount) to 107 — bench only, backup written first
require('/root/GodWorld/lib/env');
const fs = require('fs');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const LIVE = process.env.GODWORLD_SHEET_ID; if (LIVE === B) throw new Error('env already points at the bench?');
process.env.GODWORLD_SHEET_ID = B;
const s = require('/root/GodWorld/lib/sheets');
const DIR = '/root/GodWorld/output/research-build/';
const F = (leg, kind) => DIR + '2026-11-16-e349-bench-' + leg + (kind ? '.' + kind : '') + '.json';
const KEYS = ['dialLineScale', 'dialDirectShare', 'dialMoodFade', 'dialHardenShare', 'dialReflectionShare'];
const DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout', 'fandom'];
const tab = async (n) => { try { return await s.getSheetData(n); } catch (e) { return null; } };
async function dialCells() {
  const led = await s.getSheetData('Simulation_Ledger'); const h = led[0], iP = h.indexOf('POPID'), iD = h.indexOf('DialState');
  const o = {}; led.slice(1).forEach((r) => { if (r[iP]) o[String(r[iP]).trim().toUpperCase()] = r[iD] ? String(r[iD]) : ''; }); return { o, led, iP, iD };
}
(async () => {
  const mode = process.argv[2], leg = process.argv[3];
  if (mode === 'pre') { const ee = await s.getSheetData('Engine_Errors'); fs.writeFileSync(F('pre'), JSON.stringify({ ee: ee.length })); console.log('pre: Engine_Errors rows', ee.length - 1); return; }
  if (mode === 'open') { const { o } = await dialCells(); fs.writeFileSync(F(leg, 'open'), JSON.stringify(o)); console.log('open ' + leg + ': ' + Object.keys(o).length + ' citizens'); return; }
  if (mode === 'read') {
    const { o } = await dialCells(); const cfg = await s.getSheetData('World_Config'); const ee = await s.getSheetData('Engine_Errors');
    const pre = JSON.parse(fs.readFileSync(F('pre'), 'utf8')); const keys = {}; KEYS.concat(['cycleCount']).forEach((k) => { const r = cfg.find((x) => x[0] === k); keys[k] = r ? r[1] : null; });
    const moves = await tab('Dial_Moves'), pulse = await tab('Dial_Pulse');
    const out = { leg, cycle: Number(process.argv[4]), keys, dial: o, moves, pulse, newErrors: ee.slice(pre.ee) };
    fs.writeFileSync(F(leg), JSON.stringify(out));
    console.log(`read ${leg}: cycleCount ${keys.cycleCount}, ${Object.keys(o).length} citizens, keys ${KEYS.map((k) => k + '=' + keys[k]).join(' ')}`);
    console.log(`  Dial_Moves ${moves ? moves.length - 1 + ' rows' : 'no tab'} · Dial_Pulse ${pulse ? pulse.length - 1 + ' rows' : 'no tab'} · new Engine_Errors ${out.newErrors.length}`);
    out.newErrors.slice(0, 5).forEach((r) => console.log('    ERR', r.slice(0, 5).join(' | ').slice(0, 200)));
    if (pulse && pulse.length > 1) console.log('  pulse:', pulse[0].slice(0, 7).map((k, i) => k + ' ' + pulse[pulse.length - 1][i]).join(' · '));
    return;
  }
  if (mode === 'cmp') {
    const a = JSON.parse(fs.readFileSync(F(leg), 'utf8')), b = JSON.parse(fs.readFileSync(F(process.argv[4]), 'utf8'));
    const pops = Object.keys(a.dial); let same = 0, diff = 0, missing = 0; const ex = [];
    pops.forEach((p) => { if (!(p in b.dial)) { missing++; return; } if (a.dial[p] === b.dial[p]) same++; else { diff++; if (ex.length < 5) ex.push(p); } });
    const extra = Object.keys(b.dial).filter((p) => !(p in a.dial)).length;
    console.log(`cmp ${leg} vs ${process.argv[4]}: ${pops.length} citizens · identical DialState ${same} · different ${diff} · only in ${leg} ${missing} · only in ${process.argv[4]} ${extra}`);
    ex.forEach((p) => console.log('   ', p, '\n      A', a.dial[p].slice(0, 260), '\n      B', b.dial[p].slice(0, 260)));
    process.exit(diff || missing || extra ? 1 : 0);
  }
  if (mode === 'moves') {
    const r = JSON.parse(fs.readFileSync(F(leg), 'utf8')), open = JSON.parse(fs.readFileSync(F(leg, 'open'), 'utf8'));
    if (!r.moves) { console.log('no Dial_Moves tab'); process.exit(1); }
    const h = r.moves[0], ix = (n) => h.indexOf(n); const rows = {};
    r.moves.slice(1).forEach((m) => { rows[m[ix('POPID')] + '|' + m[ix('Dial')]] = Number(m[ix('Change')]); });
    const base = (str) => { try { return (JSON.parse(str) || {}).base || {}; } catch (e) { return {}; } };
    let expect = 0, matched = 0, wrong = 0, extra = Object.keys(rows).length; const ex = [];
    Object.keys(r.dial).forEach((p) => { const a = base(open[p] || ''), b = base(r.dial[p]); if (!r.dial[p]) return;
      DIALS.forEach((d) => { const dl = (b[d] == null ? 50 : b[d]) - (a[d] == null ? 50 : a[d]); if (Math.abs(dl) < 0.05) return; expect++;
        const got = rows[p + '|' + d]; if (got != null && Math.abs(got - dl) < 0.006) { matched++; extra--; } else { wrong++; if (ex.length < 5) ex.push(`${p} ${d} diff ${dl.toFixed(3)} row ${got}`); } }); });
    console.log(`moves ${leg}: citizen-dial moves in the DialState difference ${expect} · matching Dial_Moves rows ${matched} · missing or wrong ${wrong} · rows with no difference behind them ${extra}`);
    ex.forEach((x) => console.log('   ', x)); const why = {}; r.moves.slice(1).forEach((m) => String(m[ix('Why')]).split('; ').forEach((w) => { const k = w.replace(/ [+-]?[\d.]+.*$/, ''); why[k] = (why[k] || 0) + 1; }));
    console.log('  why:', Object.entries(why).sort((x, y) => y[1] - x[1]).map((e) => e[0] + ' ' + e[1]).join(' · '));
    process.exit(wrong || extra ? 1 : 0);
  }
  if (mode === 'mark107') {
    const { led, iP, iD } = await dialCells(); const cfg = await s.getSheetData('World_Config'); const cc = Number((cfg.find((x) => x[0] === 'cycleCount') || [])[1]);
    const col = s.columnIndexToLetter ? s.columnIndexToLetter(iD) : null; const ups = [], back = [];
    led.forEach((r, i) => { if (!i || !r[iD]) return; let d; try { d = JSON.parse(r[iD]); } catch (e) { return; } if (!(d.folded > cc)) return;
      back.push({ row: i + 1, pop: r[iP], was: r[iD] }); d.folded = 107; ups.push({ row: i + 1, pop: r[iP], value: JSON.stringify(d) }); });
    fs.writeFileSync(F('mark107', 'backup'), JSON.stringify(back, null, 1));
    console.log(`mark107: ${ups.length} rows past cycleCount ${cc}: ${ups.map((u) => u.pop).join(' ')}`);
    if (ups.length !== 13) { console.log('expected 13 — nothing written'); process.exit(1); }
    await s.batchUpdate(ups.map((u) => ({ range: `Simulation_Ledger!${col}${u.row}`, values: [[u.value]] })));
    const after = await dialCells(); const bad = ups.filter((u) => JSON.parse(after.o[String(u.pop).trim().toUpperCase()]).folded !== 107);
    console.log(bad.length ? 'READ-BACK MISMATCH ' + bad.length : 'read back: 13 at 107'); process.exit(bad.length ? 1 : 0);
  }
  throw new Error('mode?');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
