// engine.356 cut B bench read for Cycle <C> on the sandbox — a bond from a shared moment.
//   node read.js <C> full
// Against bonds-before.json (before.js, after the sync, before the fire) and the Cycle's LifeHistory_Log rows:
//   1. World_Config holds bondFromMomentCoworker / bondFromMomentHousemate.
//   2. Each bond row new this fire with Origin shared-moment: professional or friendship, active, Intensity =
//      the config number of its kind, between two people who shared a with:coworker / with:housemate line this
//      Cycle and held no bond row of any status before; both active adults; a friendship's two are not spouses,
//      parent and child, or children of one parent.
//   3. Complete: every such pair that qualifies got one.
//   4. Counted only (not ruled): pairs with such a moment who already held an active bond, and how many of
//      those bonds rose by a moment step anyway.
//   No base-vs-full comparison: making a bond draws its id from the Cycle's dice, so every later roll of the
//   week moves. This read is the proof.
//   5. No pair holds more bond rows than it did (one row a pair).
// A check with 0 cases is NOT PROVEN.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
const sheets = require('/root/GodWorld/lib/sheets');
const C = String(process.argv[2]), LABEL = String(process.argv[3] || 'full');
const U = s => String(s || '').trim().toUpperCase(), pk = (a, b) => [U(a), U(b)].sort().join('|');
(async () => {
  const log = (await sheets.getSheetAsObjects('LifeHistory_Log')).filter(r => String(r.Cycle) === C);
  const led = await sheets.getSheetAsObjects('Simulation_Ledger');
  const after = await sheets.getSheetAsObjects('Relationship_Bonds');
  const before = JSON.parse(fs.readFileSync(__dirname + '/bonds-before.json', 'utf8'));
  const cfg = Object.fromEntries((await sheets.getSheetData('World_Config')).map(r => [String(r[0] || '').trim(), r[1]]));
  fs.writeFileSync(__dirname + '/after-' + LABEL + '.json', JSON.stringify({ bonds: after.map(b => [b.BondId, b.CitizenA, b.CitizenB, b.BondType, b.Intensity, b.Status, b.Origin]), log: log.map(r => [r.POPID, r.EventTag, r.EventText]) }));
  const problems = [], notProven = [];
  const start = { coworker: Number(cfg.bondFromMomentCoworker), housemate: Number(cfg.bondFromMomentHousemate) };
  for (const k of ['bondFromMomentCoworker', 'bondFromMomentHousemate']) if (cfg[k] === undefined || cfg[k] === '' || !isFinite(Number(cfg[k]))) problems.push('World_Config ' + k + ' missing: ' + JSON.stringify(cfg[k]));
  const step = { romantic: Number(cfg.bondMomentStepPartner), family: Number(cfg.bondMomentStepFamily) }, stepFriend = Number(cfg.bondMomentStepFriend);
  const L = {}; for (const r of led) L[U(r.POPID)] = r;
  const simYear = 2040 + Math.ceil(Number(C) / 52) - 1;
  const adultActive = p => { const r = L[p]; if (!r) return false; const st = String(r.Status || 'active').toLowerCase(); const by = Number(r.BirthYear) || 0; return st === 'active' && !(by > 1900 && simYear - by < 18); };
  const idsOf = (r, c) => (String((r || {})[c] || '').match(/POP-\d+/g) || []);
  const family = (a, b) => { const A = L[a], B = L[b]; if (!A || !B) return false; const ap = idsOf(A, 'ParentIds'), bp = idsOf(B, 'ParentIds');
    return idsOf(A, 'SpouseId').includes(b) || idsOf(B, 'SpouseId').includes(a) || ap.includes(b) || bp.includes(a) || idsOf(A, 'ChildrenIds').includes(b) || idsOf(B, 'ChildrenIds').includes(a) || ap.some(x => bp.includes(x)); };
  const hhType = {}; for (const h of await sheets.getSheetAsObjects('Household_Ledger')) if (String(h.Status || '').toLowerCase() !== 'dissolved') hhType[String(h.HouseholdId || '').trim()] = String(h.HouseholdType || '').trim().toLowerCase();
  // a friendship needs a shared household whose type is known and is neither couple nor family
  const famHousehold = (a, b) => { const ha = String((L[a] || {}).HouseholdId || '').trim(), hb = String((L[b] || {}).HouseholdId || '').trim(), ty = ha && ha === hb ? hhType[ha] : ''; return !ty || ty === 'couple' || ty === 'family'; };
  // the Cycle's coworker / housemate moments, by pair
  const moments = {};
  for (const r of log) { const t = String(r.EventTag || '').split('|'); const w = (t.find(x => x.indexOf('with:') === 0) || '').slice(5), c = U((t.find(x => x.indexOf('contactPopId:') === 0) || '').slice(13));
    if ((w === 'coworker' || w === 'housemate') && c) { const k = pk(r.POPID, c); (moments[k] = moments[k] || new Set()).add(w); } }
  const beforeBy = {}; for (const b of before) (beforeBy[pk(b.CitizenA, b.CitizenB)] = beforeBy[pk(b.CitizenA, b.CitizenB)] || []).push(b);
  const afterBy = {}; for (const b of after) (afterBy[pk(b.CitizenA, b.CitizenB)] = afterBy[pk(b.CitizenA, b.CitizenB)] || []).push(b);
  const beforeIds = new Set(before.map(b => b.BondId));
  const t = { momentPairs: Object.keys(moments).length, made: { professional: 0, friendship: 0 }, expected: 0, skippedMinorOrInactive: 0, skippedFamily: 0, hadBond: 0, stepped: 0, steppedChecked: 0, newBondsAllOrigins: 0 };
  for (const b of after) {
    if (beforeIds.has(b.BondId)) continue; t.newBondsAllOrigins++;
    if (String(b.Origin) !== 'shared-moment') continue;
    const k = pk(b.CitizenA, b.CitizenB), kinds = moments[k], ty = String(b.BondType);
    const kind = ty === 'professional' ? 'coworker' : ty === 'friendship' ? 'housemate' : '';
    if (!kind) { problems.push('shared-moment bond of type ' + ty + ': ' + k); continue; }
    t.made[ty]++;
    if (!kinds || !kinds.has(kind)) problems.push('no ' + kind + ' moment this Cycle for ' + k);
    if (Number(b.Intensity) !== start[kind]) problems.push(k + ' Intensity ' + b.Intensity + ', config ' + start[kind]);
    if (String(b.Status) !== 'active') problems.push(k + ' status ' + b.Status);
    if (String(b.CycleCreated) !== C) problems.push(k + ' CycleCreated ' + b.CycleCreated);
    if (beforeBy[k]) problems.push(k + ' held a bond row before: ' + beforeBy[k].map(x => x.BondType + '/' + x.Status).join(','));
    const [a, c2] = k.split('|'); if (!adultActive(a) || !adultActive(c2)) problems.push(k + ' has a minor or a non-active row');
    if (kind === 'housemate' && (family(a, c2) || famHousehold(a, c2))) problems.push(k + ' are family (ledger cells or the household type) and got a friendship');
  }
  for (const k of Object.keys(moments)) {
    const [a, b] = k.split('|'), kinds = moments[k];
    if (beforeBy[k]) {
      t.hadBond++;
      for (const ob of beforeBy[k]) { if (String(ob.Status) !== 'active') continue; const ty = String(ob.BondType); if (/^(rivalry|tension|sports_rival)$/.test(ty)) continue;
        const nb = (afterBy[k] || []).find(x => x.BondId === ob.BondId); if (!nb) { problems.push('bond gone: ' + ob.BondId); continue; }
        // builder 2026-11-25 ("1. Yes"): with room (7.5 and under) the bond gains at least its moment step
        const was = Number(ob.Intensity), now = Number(nb.Intensity), st = step[ty] !== undefined ? step[ty] : stepFriend;
        if (was <= 7.5 && String(nb.BondType) === ty) { t.steppedChecked++; if (now - was >= st - 1e-9) t.stepped++; else problems.push(k + ' ' + ty + ' ' + was + ' → ' + now + ', step ' + st); } }
      continue;
    }
    if (!adultActive(a) || !adultActive(b)) { t.skippedMinorOrInactive++; continue; }
    const kind = kinds.has('coworker') ? 'coworker' : 'housemate';
    if (!kinds.has('coworker') && (family(a, b) || famHousehold(a, b))) { t.skippedFamily++; continue; }
    if (!(start[kind] > 0)) continue;
    t.expected++;
    if (!(afterBy[k] || []).some(x => String(x.Origin) === 'shared-moment')) problems.push('qualifying pair got no bond: ' + k + ' (' + [...kinds].join(',') + '); after: ' + JSON.stringify((afterBy[k] || []).map(x => x.BondType + '/' + x.Origin)));
  }
  for (const k of Object.keys(afterBy)) if (afterBy[k].length > Math.max(1, (beforeBy[k] || []).length)) problems.push('pair holds ' + afterBy[k].length + ' rows: ' + k);
  if (!t.made.professional) notProven.push('no coworker bond made');
  if (!t.steppedChecked) notProven.push('no existing bond with room had a coworker / housemate moment');
  // no household of two is typed other than couple / family today: a week with no friendship is the rule working
  if (!t.made.friendship && !t.skippedFamily) notProven.push('no housemate pair met the gate either way');
  console.log(JSON.stringify({ label: LABEL, cycle: C, bondsBefore: before.length, bondsAfter: after.length, start, tally: t, problems: problems.length, first: problems.slice(0, 15), notProven, verdict: problems.length ? 'FAIL' : (notProven.length ? 'PASS, NOT PROVEN: ' + notProven.join('; ') : 'PASS') }, null, 1));
  process.exit(problems.length ? 1 : (notProven.length ? 3 : 0));
})().catch(e => { console.error(e); process.exit(2); });
