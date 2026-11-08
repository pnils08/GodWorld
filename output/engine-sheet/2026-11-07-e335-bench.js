// engine.335 bench helpers on SANDBOX 1004 (no token echoed). Bench-only Oakland_Sports_Feed row, Notes marker
// E335-BENCH NON-CANON; the final sync from live removes it.
//   node 2026-11-07-e335-bench.js plantwin <N>        an Oaks game-result row at N with Streak W2 (a win night; the seeder
//                                                     then skips the Oaks, its own row is L1 = a loss night)
//   node 2026-11-07-e335-bench.js snap <label>        every ledger row's family / fandom from TraitProfile, to the scratchpad
//   node 2026-11-07-e335-bench.js read <label> <N>    readback, one JSON line appended to 2026-11-07-e335-reads.jsonl
require('/root/GodWorld/lib/env');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-07-e335-reads.jsonl';
const SP = '/tmp/claude-0/-root-GodWorld/626ff346-a58a-456a-b6f0-cb953889570a/scratchpad';
const MARK = 'E335-BENCH NON-CANON';
const sh = require('/root/GodWorld/lib/sheets');
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
const num = v => { const n = Number(String(v).replace(/^C/, '').trim()); return isFinite(n) ? n : null; };
const obj = d => { const h = (d[0] || []).map(x => String(x).trim()); return { h, rows: d.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))) }; };
// run 2: the fold's truth is DialState (base / mood / streak per dial, the watermark); TraitProfile is re-rendered on a cadence
const ds = v => { try { const j = JSON.parse(v); const pick = o => o ? { family: o.family, fandom: o.fandom } : null;
  return { base: pick(j.base), mood: pick(j.mood), streak: pick(j.streak), folded: j.folded }; } catch (_) { return null; } };
const dial = (tp, d) => { const m = new RegExp('(?:^|\\|)' + d + ':(-?[0-9.]+)').exec(String(tp || '')); return m ? Number(m[1]) : null; };

(async () => {
  const [cmd, a1, a2] = process.argv.slice(2);
  process.env.GODWORLD_SHEET_ID = BENCH;
  if (BENCH === LIVE) throw new Error('bench = live');
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE) throw new Error('title check failed: ' + title);

  if (cmd === 'plantwin') {
    const N = Number(a1);
    const feed = obj(await sh.getSheetData('Oakland_Sports_Feed'));
    if (feed.rows.some(r => num(r.Cycle) === N && /Oaks/.test(r.TeamsUsed))) throw new Error('bench already has an Oaks row at C' + N + ' — stop');
    const games = feed.rows.filter(r => /Oaks/.test(r.TeamsUsed) && r.EventType === 'game-result');
    const last = games[games.length - 1];
    if (!last) throw new Error('no Oaks game-result row to copy');
    const m = /^(\d+)-(\d+)$/.exec(String(last['Team Record']).trim());
    const row = Object.assign({}, last, { Cycle: N, EventType: 'game-result', WeekRecord: 'H:W', Streak: 'W2', PlayerMood: '', EventTrigger: '',
      StoryAngle: '', Stats: '', 'Team Record': m ? (Number(m[1]) + 1) + '-' + m[2] : '', Notes: MARK });
    await sh.appendRows('Oakland_Sports_Feed', [feed.h.map(k => (row[k] === undefined ? '' : row[k]))]);
    const back = obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => r.Notes === MARK && num(r.Cycle) === N);
    console.log('planted ' + back.length + ' Oaks row(s) at C' + N + ': ' + back.map(r => r.EventType + ' streak ' + r.Streak + ' rec ' + r['Team Record'] + ' names ' + r.NamesUsed).join(' | '));
    process.exit(back.length === 1 ? 0 : 1);
  }

  if (cmd === 'snap') {
    const L = obj(await sh.getSheetData('Simulation_Ledger')).rows;
    const snap = {};
    for (const r of L) if (r.POPID) snap[r.POPID] = { family: dial(r.TraitProfile, 'family'), fandom: dial(r.TraitProfile, 'fandom'), upd: (/Updated:(c\d+)/.exec(r.TraitProfile) || [])[1] || '', ds: ds(r.DialState) };
    fs.writeFileSync(SP + '/e335-snap-' + a1 + '.json', JSON.stringify(snap));
    console.log('snap ' + a1 + ': ' + Object.keys(snap).length + ' rows');
    return;
  }

  if (cmd === 'read') {
    const label = a1, N = Number(a2);
    let before = {};
    try { before = JSON.parse(fs.readFileSync(SP + '/e335-snap-' + label + '.json', 'utf8')); } catch (_) {}
    const feedN = obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => num(r.Cycle) === N)
      .map(r => ({ team: r.TeamsUsed, type: r.EventType, streak: r.Streak, week: r.WeekRecord, rec: r['Team Record'], bench: r.Notes === MARK || /NON-CANON/.test(r.Notes) }));
    const lh = obj(await sh.getSheetData('LifeHistory_Log')).rows.filter(r => num(r.Cycle) === N);
    const base = t => String(t || '').split('|')[0];
    const gn = lh.filter(r => /^Household-GameNight/.test(base(r.EventTag)));
    const byTag = {}; for (const r of gn) byTag[base(r.EventTag)] = (byTag[base(r.EventTag)] || 0) + 1;
    const L = obj(await sh.getSheetData('Simulation_Ledger')).rows;
    const byPop = Object.fromEntries(L.map(r => [r.POPID, r]));
    const lines = gn.map(r => {
      const tag = base(r.EventTag), pop = r.POPID, now = byPop[pop] || {};
      const own = lh.filter(x => x.POPID === pop).map(x => ({ tag: base(x.EventTag), fx: M.nudgesForEvent_(base(x.EventTag), 1, x.EventText) }));
      const net = {}; for (const o of own) for (const k in o.fx) net[k] = (net[k] || 0) + o.fx[k];
      return { pop, tag, text: r.EventText, fx: M.nudgesForEvent_(tag, 1, r.EventText), cycleNetFromAllLines: net, ownLines: own.length,
        fandom: [before[pop] ? before[pop].fandom : null, dial(now.TraitProfile, 'fandom')], family: [before[pop] ? before[pop].family : null, dial(now.TraitProfile, 'family')],
        tpUpdated: [before[pop] ? before[pop].upd : null, (/Updated:(c\d+)/.exec(now.TraitProfile) || [])[1] || ''],
        dialState: [before[pop] ? before[pop].ds : null, ds(now.DialState)] };
    });
    const rip = obj(await sh.getSheetData('Ripple_Ledger')).rows.filter(r => num(r.Cycle) === N && r.EffectType === 'game-night-household')
      .map(r => ({ detail: r.CauseDetail, n: String(r.TargetIds || '').split(/[,|]/).filter(Boolean).length }));
    const fanLines = {}; for (const r of lh) { const t = base(r.EventTag); if (/Fandom-(Up|Down)-S$/.test(t)) fanLines[t] = (fanLines[t] || 0) + 1; }
    const ee = obj(await sh.getSheetData('Engine_Errors')).rows.filter(r => num(r.Cycle) === N).map(r => [r.Phase, r.Error].join(' | ').slice(0, 220));
    const wk = obj([['Key', 'Value'], ...(await sh.getSheetData('World_Config')).slice(1)]).rows;
    const out = { label, N, at: new Date().toISOString(), cycleCount: (wk.find(r => r.Key === 'cycleCount') || {}).Value,
      feedAtN: feedN, householdGameNightByTag: byTag, householdLines: lines, gameNightRipples: rip, cityFanLines: fanLines, engineErrorsAtN: ee };
    fs.appendFileSync(OUT, JSON.stringify(out) + '\n');
    console.log(JSON.stringify(out, null, 1));
    return;
  }
  throw new Error('usage: plantwin <N> | snap <label> | read <label> <N>');
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
