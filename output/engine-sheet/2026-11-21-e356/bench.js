// engine.356 bench read — SANDBOX 1004 only. node bench.js <cycle>
// Reads the bench's LifeHistory_Log rows for <cycle>: last-night lines by kind, the new named kinds, and whether
// every biz: tag on them is a Business_Ledger row with that name and hood. Prints the carried evening snapshot
// the lines were drawn from (Carry_Forward_Store PREV_EVENING_JSON). Exit 1 when a named line fails to resolve,
// 2 when the cycle has no named line at all.
require('/root/GodWorld/lib/env');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
process.env.GODWORLD_SHEET_ID = B;
const sheets = require('/root/GodWorld/lib/sheets');
const cycle = String(process.argv[2] || '');
const NEW = ['evening:dinedOut', 'evening:nightOut', 'evening:sawFamous', 'evening:watched', 'evening:watchedSports'];
(async () => {
  if (!/^\d+$/.test(cycle)) { console.log('usage: bench.js <cycle>'); process.exit(3); }
  const lh = await sheets.getRawSheetData('LifeHistory_Log');
  const h = lh[0], iC = h.indexOf('Cycle'), iT = h.indexOf('EventTag'), iX = h.indexOf('EventText'), iP = h.indexOf('POPID'), iN = h.indexOf('Neighborhood');
  const rows = lh.slice(1).filter((r) => String(r[iC]) === cycle);
  const biz = await sheets.getRawSheetData('Business_Ledger');
  const bh = biz[0], bI = bh.indexOf('BIZ_ID'), bN = bh.indexOf('Name'), bH = bh.indexOf('Neighborhood');
  const byId = {}; biz.slice(1).forEach((r) => { byId[String(r[bI])] = { name: String(r[bN]), hood: String(r[bH]) }; });
  const kinds = {}; const named = []; let bad = 0;
  for (const r of rows) {
    const tag = String(r[iT] || ''); const m = tag.match(/evening:([A-Za-z]+)/);
    if (!m) continue;
    kinds[m[1]] = (kinds[m[1]] || 0) + 1;
    if (NEW.some((k) => tag.indexOf(k) >= 0)) named.push(r);
  }
  console.log('C' + cycle + ': ' + rows.length + ' lines, ' + new Set(rows.map((r) => r[iP])).size + ' people; last-night lines by kind: ' + JSON.stringify(kinds));
  const texts = {};
  for (const r of named) {
    const tag = String(r[iT]); const text = String(r[iX] || '');
    const kind = NEW.find((k) => tag.indexOf(k) >= 0);
    const b = (tag.match(/biz:([A-Za-z0-9-]+)/) || [])[1];
    let ok = '';
    if (b) {
      const row = byId[b];
      if (!row || text.indexOf(row.name) < 0) { bad++; ok = '  <-- biz ' + b + ' does not resolve to a ledger row named in the line'; }
    }
    const key = kind.replace('evening:', '') + ' | ' + text + ok;
    (texts[key] = texts[key] || new Set()).add(String(r[iP]));
  }
  console.log('named lines: ' + named.length + ', people: ' + new Set(named.map((r) => r[iP])).size + ', unresolved biz tags: ' + bad);
  Object.keys(texts).sort().forEach((k) => console.log('  ' + String(texts[k].size).padStart(3) + '  ' + k));
  const first = named[0];
  if (first) console.log('one row whole: ' + JSON.stringify({ POPID: first[iP], hood: first[iN], tag: first[iT], text: first[iX] }));
  try {
    const cf = await sheets.getRawSheetData('Carry_Forward_Store');
    const hit = cf.filter((r) => r.some((c) => String(c) === 'PREV_EVENING_JSON'));
    for (const r of hit) {
      const js = r.find((c) => typeof c === 'string' && c.charAt(0) === '{' && c.indexOf('crowdHotspots') >= 0);
      if (!js) continue;
      const s = JSON.parse(js);
      console.log('snapshot of C' + s.cycle + ': restaurants ' + JSON.stringify((s.restaurants || []).map((p) => p.name + ' (' + p.neighborhood + ', ' + (p.bizId || 'no id') + ')')) +
        ' fast ' + JSON.stringify((s.fastFood || []).map((p) => p.name)) + ' night ' + JSON.stringify((s.nightSpots || []).map((p) => p.name + ' (' + p.neighborhood + ')')) +
        ' tv ' + JSON.stringify(s.tv || []) + ' films ' + JSON.stringify(s.movies || []) + ' sports ' + JSON.stringify(s.sportsBroadcast || '') +
        ' seen ' + JSON.stringify((s.famousSeen || []).map((p) => p.name + ' @ ' + (p.venue || '-') + ' (' + p.neighborhood + ')')) + ' bytes ' + js.length);
    }
  } catch (e) { console.log('snapshot read failed: ' + e.message); }
  process.exit(bad ? 1 : (named.length ? 0 : 2));
})().catch((e) => { console.log('bench read failed: ' + e.message); process.exit(4); });
