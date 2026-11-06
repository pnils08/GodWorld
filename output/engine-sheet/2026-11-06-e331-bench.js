// engine.331 bench helpers on SANDBOX 1004 (no token echoed). Bench-only rows, marker E331-BENCH in Notes.
//   node 2026-11-06-e331-bench.js plant <N> <1|2>     append the fire-1 or fire-2 feed rows for Cycle N, read back
//   node 2026-11-06-e331-bench.js read <label> <N>    the fire-N readback, one JSON line, appended to e331-reads.jsonl
// Fire 1 (plan Task 6): A's off-season award, award, blank; Oaks (a) game-result H:W W2 typed hot-streak, mood hungry,
// two named players; (b) roster-move re-signed; (c) rumor trade-rumor. Fire 2: every trigger cell blank; A's season-state;
// Oaks two game rows (H:W W4, A:W W5) mood locked-in → a 2-0 week ending W5 at the World_Config bar (5).
require('/root/GodWorld/lib/env');
const fs = require('fs');
const vm = require('vm');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-06-e331-reads.jsonl';
const MARK = 'E331-BENCH NON-CANON';
const PLAYERS = 'AJ Dybantsa (SF), Austin Reaves (SG)';
const PLAYER_POPS = ['POP-01024', 'POP-01027'];
const sh = require('/root/GodWorld/lib/sheets');
const num = v => { const n = Number(String(v).replace(/^C/, '').trim()); return isFinite(n) ? n : null; };
const obj = d => { const h = (d[0] || []).map(x => String(x).trim()); return { h, rows: d.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))) }; };

function rowsFor(N, fire) {
  const A = o => Object.assign({ Cycle: N, TeamsUsed: "A's", SeasonType: 'off-season', Notes: MARK }, o);
  const O = o => Object.assign({ Cycle: N, TeamsUsed: 'Oaks', SeasonType: 'early-season', Notes: MARK }, o);
  if (fire === '1') return [
    A({ EventType: 'player-feature', EventTrigger: 'award' }),
    A({ EventType: 'front-office', EventTrigger: 'award' }),
    A({ EventType: 'season-state', WeekRecord: 'none', EventTrigger: '' }),
    O({ EventType: 'game-result', WeekRecord: 'H:W', Streak: 'W2', EventTrigger: 'hot-streak', PlayerMood: 'hungry', NamesUsed: PLAYERS }),
    O({ EventType: 'roster-move', EventTrigger: 're-signed' }),
    O({ EventType: 'rumor', EventTrigger: 'trade-rumor' })
  ];
  if (fire === '2') return [
    A({ EventType: 'season-state', WeekRecord: 'none' }),
    O({ EventType: 'game-result', WeekRecord: 'H:W', Streak: 'W4', PlayerMood: 'locked-in', NamesUsed: PLAYERS }),
    O({ EventType: 'game-result', WeekRecord: 'A:W', Streak: 'W5', PlayerMood: 'locked-in', NamesUsed: PLAYERS })
  ];
  throw new Error('fire must be 1 or 2');
}

function pools() {
  const box = {};
  vm.createContext(box);
  vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/applyGameNightMoments.js', 'utf8'), box);
  return { night: vm.runInContext('GAME_NIGHT_POOLS', box), clauses: vm.runInContext('GAME_NIGHT_MOOD_CLAUSES_', box) };
}

(async () => {
  const [cmd, a1, a2] = process.argv.slice(2);
  process.env.GODWORLD_SHEET_ID = BENCH;
  if (BENCH === LIVE) throw new Error('bench = live');
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE) throw new Error('title check failed: ' + title);

  if (cmd === 'plant') {
    const N = Number(a1), fire = a2;
    const feed = obj(await sh.getSheetData('Oakland_Sports_Feed'));
    if (feed.rows.some(r => num(r.Cycle) === N)) throw new Error('bench already has C' + N + ' feed rows — stop');
    const rows = rowsFor(N, fire);
    for (const r of rows) for (const k of Object.keys(r)) if (!feed.h.includes(k)) throw new Error('no header ' + k);
    await sh.appendRows('Oakland_Sports_Feed', rows.map(r => feed.h.map(h => r[h] === undefined ? '' : r[h])));
    const back = obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => num(r.Cycle) === N);
    console.log(JSON.stringify({ planted: rows.length, readBack: back.length, marked: back.filter(r => r.Notes === MARK).length,
      triggers: back.map(r => r.TeamsUsed + ':' + (r.EventTrigger || '-')) }));
    process.exit(back.length === rows.length && back.every(r => r.Notes === MARK) ? 0 : 1);
  }
  if (cmd !== 'read') throw new Error('usage: plant <N> <1|2> | read <label> <N>');

  const label = a1, N = Number(a2);
  const P = pools();
  const hooks = obj(await sh.getSheetData('Story_Hook_Deck')).rows.filter(r => num(r.Cycle) === N && String(r.Domain).toUpperCase() === 'SPORTS')
    .map(r => ({ p: r.Priority, type: r.HookType, hood: r.Neighborhood, text: String(r.HookText) }));
  const rip = obj(await sh.getSheetData('Ripple_Ledger'));
  const ck = k => rip.h.find(h => h.toLowerCase() === k);
  const ripples = rip.rows.filter(r => num(r[ck('cycle')]) === N && String(r[ck('causetype')]).toLowerCase() === 'sports')
    .map(r => ({ effect: r[ck('effecttype')], detail: String(r[ck('causedetail')]), mag: r[ck('magnitude')] }));
  const ee = obj(await sh.getSheetData('Engine_Errors'));
  const eeN = ee.rows.filter(r => num(r.Cycle) === N).map(r => Object.values(r).join(' | ').slice(0, 220));
  const eeScoped = eeN.filter(t => /SportsSeason|SportsFeed|storyHook|story hook|GameNight|Household/i.test(t));
  const lh = obj(await sh.getSheetData('LifeHistory_Log')).rows.filter(r => num(r.Cycle) === N);
  const players = lh.filter(r => PLAYER_POPS.includes(r.POPID)).map(r => ({ pop: r.POPID, tag: String(r.EventTag).split('|')[0], text: String(r.EventText) }));
  // a pool line may carry its own ' — ' (winStreak[2]): match the mood clause off the end, then the line
  const playerNight = players.filter(p => /^Sports-Played/.test(p.tag)).map(p => {
    let mood = null, line = p.text;
    for (const m of Object.keys(P.clauses)) for (const c of P.clauses[m]) if (p.text.endsWith(' — ' + c)) { mood = m; line = p.text.slice(0, -(c.length + 3)); }
    const bucket = Object.keys(P.night).find(b => P.night[b].includes(line)) || null;
    return { pop: p.pop, bucket, mood };
  });
  const household = lh.filter(r => /^Household-GameNight/.test(String(r.EventTag))).map(r => String(r.EventText));
  // the city's game-night lines (generateCitizensEvents gnTexts) by bucket, with the written dial tag
  const FAN = { winStreak: /streak numbers like family business|three nods before the first coffee|re-enact the play twice/,
    coldStreak: /who to blame for the skid|cap at home for the first time|patience wearing thin/,
    win: /packed bar and walked home|block erupt through an open window|caught the recap at the counter/,
    loss: /bar go quiet by the eighth|turned the game off before the end|avoided the score all morning/ };
  const fans = {};
  for (const k of Object.keys(FAN)) {
    const hit = lh.filter(r => FAN[k].test(String(r.EventText)));
    fans[k] = { n: hit.length, tags: [...new Set(hit.map(r => String(r.EventTag).split('|')[0]))] };
  }
  const fanStreak = fans.winStreak.n, fanSkid = fans.coldStreak.n;
  const wk = obj([['Key', 'Value'], ...(await sh.getSheetData('World_Config')).slice(1)]).rows;
  const out = {
    label, N, at: new Date().toISOString(),
    cycleCount: (wk.find(r => r.Key === 'cycleCount') || {}).Value,
    sportsStreakHeadline: (wk.find(r => r.Key === 'sportsStreakHeadline') || {}).Value,
    feedRowsAtN: obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => num(r.Cycle) === N).length,
    sportsHooks: hooks, sportsRipples: ripples,
    engineErrorsAtN: eeN.length, engineErrorsScoped: eeScoped,
    playerNight, playerOtherTags: players.filter(p => !/^Sports-Played/.test(p.tag)).map(p => p.pop + ' ' + p.tag),
    householdGameNight: household.length, householdStreak: household.filter(t => /streak|lineup/.test(t)).length,
    householdSkid: household.filter(t => /peace|skid|subject/.test(t)).length,
    fanStreakLines: fanStreak, fanSkidLines: fanSkid, fans
  };
  fs.appendFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
