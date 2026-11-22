// engine.356 stack read — SANDBOX 1004 only, after one fire of PROD stage 72 on live-synced data.
//   node read.js <cycle>
// 1 World_Config carries the 31 engine.356 keys. 2 Business growth: bench vs live, per business — every move inside
// the weekly cap, hood-following moves toward the hood-set resting level, franchises / institutions / City-wide not
// pulled. 3 The evening snapshot saved this Cycle: every night spot and restaurant a ledger row, none both.
// 4 LifeHistory_Log this Cycle: weddings tagged so the readers see them. Exit 1 on any broken check.
require('/root/GodWorld/lib/env');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const LIVE = process.env.GODWORLD_SHEET_ID;
const fs = require('fs'), vm = require('vm');
const cycle = Number(process.argv[2] || 0);
const sheets = require('/root/GodWorld/lib/sheets');
const at = async (id, tab) => { process.env.GODWORLD_SHEET_ID = id; return sheets.getRawSheetData(tab); };
const w = { console, Logger: { log() {} }, Math, JSON, seedUnit_: () => 0.5 }; vm.createContext(w);
vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/applyBusinessDynamics.js', 'utf8'), w);
vm.runInContext('var MINT_GAME_TEAMS_ = ' + fs.readFileSync('/root/GodWorld/phase05-citizens/processAdvancementIntake.js', 'utf8').match(/var MINT_GAME_TEAMS_ = (\[[\s\S]*?\]);/)[1] + ';', w);
(async () => {
  if (!cycle) { console.log('usage: read.js <cycle>'); process.exit(3); }
  if (LIVE === B) throw new Error('env sheet id is the bench — cannot compare to live');
  let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); };
  // 1
  const wc = await at(B, 'World_Config'); const cfg = {}; wc.forEach(r => { cfg[String(r[0]).trim()] = r[1]; });
  const want = Object.keys(cfg).filter(k => /^biz(Hood(Weight|Unit)_|ClassMiddle_)|^biz(HoodSpan|HoodPull|HoodMaxPp|EventCap|WeatherPp)$/.test(k));
  console.log('1 World_Config engine.356 keys on the bench: ' + want.length + ' (want 31)'); if (want.length !== 31) fail('config keys ' + want.length);
  // 2
  const bl = await at(B, 'Business_Ledger'), ll = await at(LIVE, 'Business_Ledger');
  const h = bl[0].map(x => String(x).trim()), iI = h.indexOf('BIZ_ID'), iN = h.indexOf('Name'), iS = h.indexOf('Sector'), iH = h.indexOf('Neighborhood'), iG = h.indexOf('Growth_Rate'), iC = h.indexOf('Employee_Count');
  const lh = ll[0].map(x => String(x).trim()), lI = lh.indexOf('BIZ_ID'), lG = lh.indexOf('Growth_Rate');
  const liveG = {}; ll.slice(1).forEach(r => { liveG[String(r[lI]).trim()] = w.bizParseGrowth_(r[lG]); });
  const nm = await at(B, 'Neighborhood_Map'); const mh = nm[0].map(x => String(x).trim());
  const col = n => mh.indexOf(n); const ns = {};
  nm.slice(1).forEach(r => { const hood = String(r[col('Neighborhood')]).trim(); if (!hood) return; ns[hood] = { retailVitality: r[col('RetailVitality')], sentiment: r[col('Sentiment')], crimeIndex: r[col('CrimeIndex')], trajectoryMomentum: r[col('TrajectoryMomentum')], eventAttractiveness: r[col('EventAttractiveness')], migrationFlow: r[col('MigrationFlow')], medianIncome: r[col('MedianIncome')], boomIndex: r[col('BoomIndex')] }; });
  // Note: the bench map is AFTER the fire (Phase 8 rewrote it); the engine scored on the pre-fire map = live's.
  const lm = await at(LIVE, 'Neighborhood_Map'); const lmh = lm[0].map(x => String(x).trim()); const lc = n => lmh.indexOf(n); const nsLive = {};
  lm.slice(1).forEach(r => { const hood = String(r[lc('Neighborhood')]).trim(); if (!hood) return; nsLive[hood] = { retailVitality: r[lc('RetailVitality')], sentiment: r[lc('Sentiment')], crimeIndex: r[lc('CrimeIndex')], trajectoryMomentum: r[lc('TrajectoryMomentum')], eventAttractiveness: r[lc('EventAttractiveness')], migrationFlow: r[lc('MigrationFlow')], medianIncome: r[lc('MedianIncome')], boomIndex: r[lc('BoomIndex')] }; });
  const ncfg = {}; Object.keys(cfg).forEach(k => { if (/^biz/.test(k)) ncfg[k] = Number(cfg[k]); });
  const sc = w.bizHoodScores_(nsLive, ncfg);
  let follow = 0, toward = 0, away = 0, over = 0, notMoved = 0, other = 0, moved = 0; const big = [];
  for (const r of bl.slice(1)) {
    const id = String(r[iI]).trim(); if (!id || !(id in liveG)) continue;
    const g1 = w.bizParseGrowth_(r[iG]), g0 = liveG[id], d = Math.round((g1 - g0) * 100) / 100;
    if (Math.abs(d) > 1.0001 && g1 !== ncfg.bizGrowthFloor) { over++; big.push(id + ' ' + r[iN] + ' ' + g0 + '->' + g1); }
    if (d !== 0) moved++;
    const stated = Number(r[iC]) || 0, hood = String(r[iH]).trim();
    const fol = stated < ncfg.bizSettleMinStaff && !w.bizIsFranchise_(id, r[iS]) && sc[hood] !== undefined && sc[hood] !== null;
    if (!fol) { other++; continue; }
    follow++;
    const target = ncfg['bizClassMiddle_' + w.bizSectorClass_(r[iS])] + sc[hood] * ncfg.bizHoodSpan;
    if (Math.abs(target - g0) < 0.05) { if (Math.abs(d) < 0.6) notMoved++; continue; }
    if (Math.sign(d) === Math.sign(target - g0)) toward++; else away++;
  }
  console.log('2 Business growth C' + cycle + ': ' + moved + ' of ' + (bl.length - 1) + ' moved; hood-following ' + follow + ' — toward their resting level ' + toward + ', away ' + away + ' (events / noise / shock can push the other way), at rest ' + notMoved + '; not following ' + other);
  console.log('  moves over the 1.0 weekly cap (floor excepted): ' + over + (big.length ? ' — ' + big.slice(0, 5).join('; ') : ''));
  if (over) fail('moves over the weekly cap');
  if (toward <= away) fail('more hood-following businesses moved away from their resting level than toward it');
  // 3
  const cf = await at(B, 'Carry_Forward_Store'); const ch = cf[0].map(x => String(x).trim());
  const kI = ch.findIndex(x => /^key$/i.test(x)), vI = ch.findIndex(x => /^value$|json/i.test(x)), cI = ch.findIndex(x => /cycle/i.test(x));
  const rows = cf.slice(1).filter(r => String(r[kI]).trim() === 'PREV_EVENING_JSON');
  const latest = rows.sort((a, b) => Number(b[cI]) - Number(a[cI]))[0];
  if (!latest) fail('no PREV_EVENING_JSON on Carry_Forward_Store');
  else {
    const snap = JSON.parse(String(latest[vI]));
    const bizIds = new Set(bl.slice(1).map(r => String(r[iI]).trim()));
    const ns3 = snap.nightSpots || [], rs = snap.restaurants || [];
    console.log('3 Evening snapshot C' + latest[cI] + ': night spots ' + JSON.stringify(ns3.map(p => p.name + ' (' + p.neighborhood + ', ' + (p.bizId || '-') + ')')) + '; restaurants ' + JSON.stringify(rs.map(p => p.name + ' (' + p.neighborhood + ')')));
    ns3.forEach(p => { if (!p.bizId || !bizIds.has(p.bizId)) fail('night spot not a ledger row: ' + JSON.stringify(p)); });
    ns3.forEach(p => { if (rs.some(q => q.name === p.name)) fail('both night spot and dinner: ' + p.name); });
  }
  // 4
  const lg = await at(B, 'LifeHistory_Log'); const gh = lg[0].map(x => String(x).trim()), gC = gh.indexOf('Cycle'), gT = gh.indexOf('EventTag');
  const tags = lg.slice(1).filter(r => Number(r[gC]) === cycle).map(r => String(r[gT] || ''));
  const wed = tags.filter(t => /^Wedding/.test(t)), oldForm = tags.filter(t => t === 'Wedding|source:bond');
  const bizTagged = tags.filter(t => /biz:BIZ-/.test(t)).length;
  console.log('4 LifeHistory_Log C' + cycle + ': ' + tags.length + ' rows; weddings ' + wed.length + ' ' + JSON.stringify(wed.slice(0, 4)) + '; old unreadable form ' + oldForm.length + '; rows naming a business ' + bizTagged);
  if (oldForm.length) fail('a wedding still tagged Wedding|source:bond');
  console.log(bad ? 'RESULT ' + bad + ' failed' : 'RESULT all checks pass');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('STOP ' + e.message); process.exit(2); });
